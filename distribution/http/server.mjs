// SPDX-License-Identifier: MIT
// The QR Code & Barcode Scanner HTTP service: a small server around the published engine.
// It reads an image from the request, scans it in memory with the pinned native package and
// returns the engine's report. Nothing is stored, nothing is fetched and no decoded link is opened.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SERVICE_VERSION = "0.1.0";
export const ENGINE_VERSION = "0.11.0";
export const REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust";
export const ENGINE_SOURCE = `${REPOSITORY}/tree/v${ENGINE_VERSION}`;
export const PROFILES = Object.freeze(["fast", "frame", "full"]);
export const DEFAULT_PROFILE = "frame";
export const HARD_LIMITS = Object.freeze({ inputBytes: 8 * 1024 * 1024, dimension: 4096, pixels: 16_000_000, concurrent: 2 });
// A multipart body carries boundaries and part headers around the image bytes.
const MULTIPART_OVERHEAD = 64 * 1024;
// Time to receive a whole request, and its headers, checked every 2 seconds. A scan itself is
// bounded by its profile budget.
const REQUEST_TIMEOUT_MS = 30_000;
const HEADERS_TIMEOUT_MS = 15_000;
const TIMEOUT_CHECK_MS = 2_000;
// Engine refusals of the image itself; any other engine error is the server's.
const INPUT_ERRORS = new Set(["QRS-001", "QRS-002", "QRS-003"]);
const RAW_TYPES = /^(?:image\/[a-z0-9.+-]+|application\/octet-stream)$/;
const VARIABLES = Object.freeze({
  inputBytes: "QRSCAN_HTTP_MAX_INPUT_BYTES",
  dimension: "QRSCAN_HTTP_MAX_DIMENSION",
  pixels: "QRSCAN_HTTP_MAX_PIXELS",
  concurrent: "QRSCAN_HTTP_MAX_CONCURRENT",
});
// The time budget of each profile in ms, as the pinned package documents its budgetMs option. A
// host that gives the container a tenth of a CPU runs every stage about ten times slower, and the
// engine would cut the scan short: QRSCAN_HTTP_BUDGET_SCALE multiplies these budgets.
export const PROFILE_BUDGETS_MS = Object.freeze({ fast: 800, frame: 80, full: 4000 });
export const MAX_BUDGET_SCALE = 20;
const BUDGET_SCALE = "QRSCAN_HTTP_BUDGET_SCALE";

/** Operator settings can lower the limits, never raise them past the published boundary. */
export function limitsFromEnvironment(env = process.env) {
  const limits = { ...HARD_LIMITS };
  for (const [key, variable] of Object.entries(VARIABLES)) {
    const value = env[variable];
    if (value === undefined || value === "") continue;
    if (!/^[1-9]\d*$/.test(value)) throw new Error(`${variable} must be a positive integer`);
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > HARD_LIMITS[key]) {
      throw new Error(`${variable} exceeds the service limit ${HARD_LIMITS[key]}`);
    }
    limits[key] = number;
  }
  return Object.freeze(limits);
}

/** The factor of the profile budgets: a whole number from 1, the engine's own budgets, to 20. */
export function budgetScaleFromEnvironment(env = process.env) {
  const value = env[BUDGET_SCALE];
  if (value === undefined || value === "") return 1;
  if (!/^[1-9]\d*$/.test(value) || Number(value) > MAX_BUDGET_SCALE) {
    throw new Error(`${BUDGET_SCALE} must be a whole number from 1 to ${MAX_BUDGET_SCALE}`);
  }
  return Number(value);
}

/** The budget each profile scans with, in ms. */
export function profileBudgets(scale) {
  return Object.freeze(Object.fromEntries(PROFILES.map((profile) => [profile, PROFILE_BUDGETS_MS[profile] * scale])));
}

/**
 * Where the running code's source is: the satellite tree records the engine commit it was
 * generated from in SOURCE.json. AGPL section 13 asks a network service to offer that source.
 */
export function sourceFromRecord(directory = new URL(".", import.meta.url)) {
  let revision = null;
  try {
    const record = JSON.parse(readFileSync(new URL("SOURCE.json", directory), "utf8"));
    const candidate = record?.engine?.revision;
    if (record?.engine?.repository === REPOSITORY && /^[0-9a-f]{40}$/.test(candidate)) revision = candidate;
  } catch {
    revision = null;
  }
  return Object.freeze({
    revision,
    service: `${REPOSITORY}/tree/${revision ?? "main"}/distribution/http`,
    engine: ENGINE_SOURCE,
  });
}

class Refusal extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

function clean(text) {
  return String(text).replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 300);
}

/** The request body, at most MAX bytes; a longer body is refused without being kept. */
function readBody(request, max) {
  const declared = request.headers["content-length"];
  if (declared !== undefined && Number(declared) > max) {
    return Promise.reject(new Refusal(413, "QRSHTTP_INPUT_LIMIT", `The request body exceeds ${max} bytes`));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let refused = false;
    request.on("data", (chunk) => {
      if (refused) return;
      size += chunk.length;
      if (size > max) {
        refused = true;
        chunks.length = 0;
        reject(new Refusal(413, "QRSHTTP_INPUT_LIMIT", `The request body exceeds ${max} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => { if (!refused) resolve(Buffer.concat(chunks, size)); });
    request.on("error", (error) => { if (!refused) reject(error); });
  });
}

function mediaType(request) {
  const header = request.headers["content-type"];
  return header === undefined ? null : header.split(";")[0].trim().toLowerCase();
}

/** The image bytes and the profile of a POST /scan: a raw image body or a multipart form. */
async function readScanRequest(request, url, limits) {
  const fromQuery = url.searchParams.getAll("mode");
  if (fromQuery.length > 1) throw new Refusal(400, "QRSHTTP_MODE", "Give mode at most once");
  let mode = fromQuery[0];
  const type = mediaType(request);
  let bytes;
  if (type === "multipart/form-data") {
    const body = await readBody(request, limits.inputBytes + MULTIPART_OVERHEAD);
    let form;
    try {
      form = await new Response(body, { headers: { "content-type": request.headers["content-type"] } }).formData();
    } catch {
      throw new Refusal(400, "QRSHTTP_MULTIPART", "The multipart body could not be read");
    }
    const fields = form.getAll("mode");
    if (fields.length > 1 || fields.some((field) => typeof field !== "string")) {
      throw new Refusal(400, "QRSHTTP_MODE", "Give mode at most once, as a text field");
    }
    if (fields.length === 1) {
      if (mode !== undefined && mode !== fields[0]) throw new Refusal(400, "QRSHTTP_MODE", "The query and the form name different modes");
      mode = fields[0];
    }
    const files = [...form.values()].filter((value) => typeof value === "object");
    const named = form.getAll("image");
    const image = named.length === 1 ? named[0] : named.length === 0 && files.length === 1 ? files[0] : null;
    if (image === null || typeof image !== "object") {
      throw new Refusal(400, "QRSHTTP_NO_IMAGE", "Send one image file, in the form field named image");
    }
    if (image.size > limits.inputBytes) throw new Refusal(413, "QRSHTTP_INPUT_LIMIT", `The image exceeds ${limits.inputBytes} bytes`);
    bytes = Buffer.from(await image.arrayBuffer());
  } else if (type === null || RAW_TYPES.test(type)) {
    bytes = await readBody(request, limits.inputBytes);
  } else {
    throw new Refusal(415, "QRSHTTP_MEDIA_TYPE", "Send the image as the raw body (image/* or application/octet-stream) or as multipart/form-data");
  }
  mode ??= DEFAULT_PROFILE;
  if (!PROFILES.includes(mode)) throw new Refusal(400, "QRSHTTP_MODE", `mode must be one of ${PROFILES.join(", ")}`);
  if (bytes.length === 0) throw new Refusal(400, "QRSHTTP_NO_IMAGE", "The image is empty");
  return { bytes, mode };
}

function describe(limits, budgets, source) {
  return {
    name: "QR Code & Barcode Scanner HTTP service",
    service: SERVICE_VERSION,
    engine: ENGINE_VERSION,
    endpoints: {
      "GET /healthz": "200 once the engine is loaded",
      "POST /scan": "an image as the raw body or as the multipart field image; ?mode=fast|frame|full",
    },
    modes: PROFILES,
    defaultMode: DEFAULT_PROFILE,
    limits: { inputBytes: limits.inputBytes, dimension: limits.dimension, pixels: limits.pixels, concurrent: limits.concurrent },
    budgetsMs: budgets,
    privacy: "Images are scanned in memory and never stored. The service makes no outbound request and never opens a decoded link.",
    license: `AGPL-3.0-or-later: this service runs the scanner engine ${ENGINE_VERSION}. Its own source is MIT.`,
    source,
  };
}

function size(bytes) {
  return bytes % 1048576 === 0 ? `${bytes / 1048576} MiB` : `${bytes} bytes`;
}

function page(limits, source) {
  const link = (href, text) => `<a href="${href}">${text}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR Code &amp; Barcode Scanner HTTP service</title>
<style>
body { font: 16px/1.5 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; color: #e8edf7; background: #0b1020; }
a { color: #7cc4ff; } code { background: #1b2340; padding: 0 .25rem; border-radius: 4px; }
form { display: grid; gap: .75rem; padding: 1rem; border: 1px solid #2b355c; border-radius: 8px; }
button { justify-self: start; padding: .4rem 1rem; }
</style>
</head>
<body>
<h1>QR Code &amp; Barcode Scanner</h1>
<p>This server scans the QR codes and barcodes of an image with the open-source scanner engine ${ENGINE_VERSION} and answers with its JSON report. Images are scanned in memory and never stored.</p>
<form method="post" action="/scan" enctype="multipart/form-data">
<label>Image (at most ${size(limits.inputBytes)}) <input type="file" name="image" accept="image/*" required></label>
<label>Mode <select name="mode"><option>fast</option><option selected>frame</option><option>full</option></select></label>
<button type="submit">Scan</button>
</form>
<p>From a terminal, with this server's address in place of example.com: <code>curl --data-binary @image.png -H 'content-type: image/png' 'https://example.com/scan?mode=fast'</code></p>
<p>Source: ${link(source.service, "this service")} and ${link(source.engine, `the engine ${ENGINE_VERSION}`)}, licensed AGPL-3.0-or-later as a whole. Read ${link(`${REPOSITORY}#readme`, "the scanner repository")} for every other way to run it.</p>
</body>
</html>
`;
}

/** The path of a request target, never interpreted as an authority: `//scan` is the path `//scan`. */
function pathOf(target) {
  try {
    return new URL(`http://service.invalid${target.startsWith("/") ? "" : "/"}${target}`);
  } catch {
    return null;
  }
}

/**
 * The HTTP server. ENGINE is the loaded engine module ({ scan, version }); LOG receives one line
 * per request (method, path, status or `aborted`, milliseconds), never a query, an image or a
 * report.
 *
 * A scan slot (limits.concurrent) is held only while the engine scans. Reading a body holds an
 * upload slot, twice as many, so slow uploads cannot hold the scans, and the images held in
 * memory stay bounded.
 *
 * BUDGET_SCALE 1 leaves each profile's budget to the engine; a larger one passes the scaled
 * budget as budgetMs.
 */
export function createScanServer({ engine, limits = limitsFromEnvironment(), budgetScale = budgetScaleFromEnvironment(), source = sourceFromRecord(), log = () => {} }) {
  if (engine?.version?.() !== ENGINE_VERSION) throw new Error(`Scanner engine ${ENGINE_VERSION} is required`);
  const budgets = profileBudgets(budgetScale);
  const uploadSlots = 2 * limits.concurrent;
  let active = 0;
  let uploads = 0;
  const busy = (what, slots) => new Refusal(503, "QRSHTTP_BUSY", `At most ${slots} ${what} run at once; retry shortly`, { "retry-after": "1" });
  const common = {
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-source-code": source.service,
  };

  function send(response, status, body, type, headers = {}) {
    const data = Buffer.from(body);
    response.writeHead(status, { ...common, "content-type": type, "content-length": data.length, ...headers });
    response.end(response.req.method === "HEAD" ? undefined : data);
  }

  function json(response, status, value, headers) {
    send(response, status, JSON.stringify(value), "application/json; charset=utf-8", headers);
  }

  // An early refusal keeps reading and discarding the rest of the body (RFC 9112 section 9.6):
  // a client still sending would otherwise meet a reset before it reads the answer. CLOSE is for
  // a client that asked first (Expect: 100-continue) and was never told to send its body.
  function refuse(response, refusal, close = false) {
    const headers = { ...refusal.headers, ...(close ? { connection: "close" } : {}) };
    json(response, refusal.status, { error: { code: refusal.code, message: refusal.message } }, headers);
    if (!response.req.complete) response.req.resume();
  }

  async function scan(request, response, url) {
    let read;
    if (uploads >= uploadSlots) throw busy("uploads", uploadSlots);
    uploads += 1;
    try {
      read = await readScanRequest(request, url, limits);
    } finally {
      uploads -= 1;
    }
    if (active >= limits.concurrent) throw busy("scans", limits.concurrent);
    active += 1;
    let report;
    try {
      const options = { profile: read.mode, maxDimension: limits.dimension, maxPixels: limits.pixels };
      if (budgetScale > 1) options.budgetMs = budgets[read.mode];
      report = await engine.scan(read.bytes, options);
    } catch (error) {
      const tag = error?.message?.match(/\[?(QRS-\d{3})\]?/)?.[1];
      if (INPUT_ERRORS.has(tag)) throw new Refusal(422, tag, clean(error.message));
      throw new Refusal(500, "QRSHTTP_ENGINE", "The scanner engine could not complete the scan");
    } finally {
      active -= 1;
    }
    json(response, 200, report);
  }

  // One line per request, once: when the answer is sent, or when the connection closes first.
  function record(request, response, path) {
    const started = process.hrtime.bigint();
    let done = false;
    const line = (status) => {
      if (done) return;
      done = true;
      log(`${clean(request.method)} ${clean(path).slice(0, 80)} ${status} ${Number((process.hrtime.bigint() - started) / 1_000_000n)}ms`);
    };
    response.on("finish", () => line(response.statusCode));
    response.on("close", () => line(response.writableFinished ? response.statusCode : "aborted"));
  }

  async function handle(request, response) {
    const url = pathOf(request.url ?? "/");
    record(request, response, url?.pathname ?? "/");
    try {
      if (!url) throw new Refusal(400, "QRSHTTP_TARGET", "The request target is not a path");
      if (url.pathname === "/scan") {
        if (request.method !== "POST") throw new Refusal(405, "QRSHTTP_METHOD", "Use POST /scan", { allow: "POST" });
        await scan(request, response, url);
      } else if (url.pathname === "/healthz" || url.pathname === "/") {
        if (request.method !== "GET" && request.method !== "HEAD") throw new Refusal(405, "QRSHTTP_METHOD", `Use GET ${url.pathname}`, { allow: "GET, HEAD" });
        if (url.pathname === "/healthz") json(response, 200, { status: "ok", service: SERVICE_VERSION, engine: ENGINE_VERSION });
        else if (/\btext\/html\b/.test(request.headers.accept ?? "")) {
          send(response, 200, page(limits, source), "text/html; charset=utf-8", {
            "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
          });
        } else json(response, 200, describe(limits, budgets, source));
      } else {
        throw new Refusal(404, "QRSHTTP_NOT_FOUND", "Use GET /, GET /healthz or POST /scan");
      }
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      refuse(response, error instanceof Refusal ? error : new Refusal(500, "QRSHTTP_INTERNAL", "The request could not be handled"));
    }
  }

  // handle answers every error itself; this only keeps a defect from ending the process.
  const serve = (request, response) => {
    handle(request, response).catch(() => response.destroy());
  };
  const server = createServer({
    requestTimeout: REQUEST_TIMEOUT_MS,
    headersTimeout: HEADERS_TIMEOUT_MS,
    connectionsCheckingInterval: TIMEOUT_CHECK_MS,
  }, serve);
  // A client that asks before sending a body is told before it sends one that is too large, or
  // that every upload slot is taken.
  server.on("checkContinue", (request, response) => {
    const declared = Number(request.headers["content-length"]);
    const max = limits.inputBytes + (mediaType(request) === "multipart/form-data" ? MULTIPART_OVERHEAD : 0);
    let refusal = null;
    if (Number.isFinite(declared) && declared > max) {
      refusal = new Refusal(413, "QRSHTTP_INPUT_LIMIT", `The request body exceeds ${max} bytes`);
    } else if (pathOf(request.url ?? "/")?.pathname === "/scan" && uploads >= uploadSlots) {
      refusal = busy("uploads", uploadSlots);
    }
    if (refusal) {
      record(request, response, pathOf(request.url ?? "/")?.pathname ?? "/");
      refuse(response, refusal, true);
      return;
    }
    response.writeContinue();
    serve(request, response);
  });
  return server;
}

async function main() {
  const limits = limitsFromEnvironment();
  const budgetScale = budgetScaleFromEnvironment();
  const engine = await import("@qrcode-ai-com/qrcode-barcode-scanner");
  const source = sourceFromRecord();
  const port = process.env.PORT === undefined || process.env.PORT === "" ? 8080 : Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a TCP port number");
  const server = createScanServer({ engine, limits, budgetScale, source, log: (line) => console.log(line) });
  const host = process.env.HOST || undefined;
  server.listen(port, host, () => {
    console.log(`QR Code & Barcode Scanner HTTP service ${SERVICE_VERSION}, engine ${ENGINE_VERSION}, listening on ${host ?? "every address"} port ${port}; source ${source.service}`);
  });
  const stop = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`qrcode-barcode-scanner-http: ${error.message}`);
    process.exit(1);
  });
}
