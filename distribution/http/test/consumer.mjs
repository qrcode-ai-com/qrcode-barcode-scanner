#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Judge a running QR Code & Barcode Scanner HTTP service from outside, as a client does:
//
//   node test/consumer.mjs <base URL> <mixed fixture> [--receipt FILE] [--revision SHA]
//
// The fixture is the mixed QR + Code 128 image of the engine's tests. The service must answer
// GET /healthz and GET /, and POST /scan must return exactly the two payloads in the fast, frame
// and full modes, both as a raw body and as a multipart form, with engine 0.11.0. Then each
// refusal is checked: an unknown mode, a body that is not an image, a text body, a GET on
// /scan, an unknown path and a body one byte over the advertised limit. Node.js 22 or later,
// no dependency. Exit 0 when every check passes, 1 when one fails, 2 for usage.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { request as secureRequest } from "node:https";

const EXPECTED = Object.freeze([["code128", "STOCK-4827"], ["qr_code", "https://qrc-ai.com/76xMa"]]);
const FIXTURE_SHA256 = "c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8";
const ENGINE = "0.11.0";
const MODES = ["fast", "frame", "full"];
const SOURCE = /^https:\/\/github\.com\/qrcode-ai-com\/qrcode-barcode-scanner-rust\/tree\/(?:[0-9a-f]{40}|main)\/distribution\/http$/;

function usage(message) {
  console.error(`consumer.mjs: ${message}\nusage: node test/consumer.mjs <base URL> <mixed fixture> [--receipt FILE] [--revision SHA]`);
  process.exit(2);
}

/** One HTTP exchange with Node's own client: the status, the headers and the body bytes. */
function exchange(base, method, path, { body, headers = {} } = {}) {
  const url = new URL(path, base);
  const send = url.protocol === "https:" ? secureRequest : request;
  return new Promise((resolve, reject) => {
    const outgoing = send(url, { method, headers: body === undefined ? headers : { ...headers, "content-length": body.length } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on("error", reject);
    });
    outgoing.setTimeout(120_000, () => outgoing.destroy(new Error(`${method} ${path} timed out`)));
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}

function parse(answer, what) {
  try {
    return JSON.parse(answer.body.toString("utf8"));
  } catch {
    throw new Error(`${what}: the body is not JSON (status ${answer.status})`);
  }
}

function multipart(fields, file) {
  const boundary = `qrscan-${createHash("sha256").update(file).digest("hex").slice(0, 24)}`;
  const parts = Object.entries(fields).map(([name, value]) =>
    Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="image"; filename="mixed-code128-qr.png"\r\ncontent-type: image/png\r\n\r\n`));
  parts.push(file, Buffer.from(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), type: `multipart/form-data; boundary=${boundary}` };
}

function payloads(report) {
  return (report.detections ?? []).map((detection) => [detection.symbology, detection.content?.text]).sort((a, b) => a[0].localeCompare(b[0]));
}

async function main() {
  const args = process.argv.slice(2);
  const options = { receipt: null, revision: null };
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--receipt" || args[i] === "--revision") {
      if (args[i + 1] === undefined) usage(`${args[i]} needs a value`);
      options[args[i].slice(2)] = args[i + 1];
      i += 1;
    } else positional.push(args[i]);
  }
  if (positional.length !== 2) usage("give the base URL and the fixture");
  const [base, fixturePath] = positional;
  if (!/^https?:\/\//.test(base)) usage("the base URL must start with http:// or https://");
  if (options.revision !== null && !/^[0-9a-f]{40}$/.test(options.revision)) usage("--revision must be a 40-hex commit");
  const fixture = readFileSync(fixturePath);
  const fixtureSha256 = createHash("sha256").update(fixture).digest("hex");
  if (fixtureSha256 !== FIXTURE_SHA256) usage(`${fixturePath} is not the mixed fixture (sha256 ${fixtureSha256})`);

  const checks = [];
  const failures = [];
  async function check(name, body) {
    try {
      const detail = await body();
      checks.push({ name, ok: true, ...(detail ? { detail } : {}) });
      console.log(`ok    ${name}${detail ? ` · ${detail}` : ""}`);
    } catch (error) {
      checks.push({ name, ok: false, detail: error.message });
      failures.push(name);
      console.log(`FAIL  ${name} · ${error.message}`);
    }
  }
  const expectStatus = (answer, status, what) => {
    if (answer.status !== status) throw new Error(`${what}: status ${answer.status}, want ${status}: ${answer.body.toString("utf8").slice(0, 200)}`);
  };
  const expectRefusal = async (what, status, code, method, path, init) => {
    const answer = await exchange(base, method, path, init);
    expectStatus(answer, status, what);
    const value = parse(answer, what);
    if (value?.error?.code !== code) throw new Error(`${what}: error code ${value?.error?.code}, want ${code}`);
    return `${status} ${code}`;
  };

  let limit = null;
  let source = null;
  await check("GET /healthz answers ok with engine 0.11.0", async () => {
    const answer = await exchange(base, "GET", "/healthz");
    expectStatus(answer, 200, "healthz");
    const value = parse(answer, "healthz");
    if (value.status !== "ok" || value.engine !== ENGINE) throw new Error(`healthz says ${JSON.stringify(value)}`);
    return `service ${value.service}`;
  });
  await check("GET / describes the service, its limits and its source (AGPL section 13)", async () => {
    const answer = await exchange(base, "GET", "/", { headers: { accept: "application/json" } });
    expectStatus(answer, 200, "/");
    const value = parse(answer, "/");
    if (value.engine !== ENGINE || !SOURCE.test(value.source?.service ?? "") ||
        value.source?.engine !== `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v${ENGINE}`) {
      throw new Error(`/ says ${JSON.stringify(value).slice(0, 300)}`);
    }
    if (answer.headers["x-source-code"] !== value.source.service) throw new Error("the X-Source-Code header is not the service source");
    if (options.revision !== null && value.source.revision !== options.revision) {
      throw new Error(`the service names revision ${value.source.revision}, want ${options.revision}`);
    }
    if (!Number.isSafeInteger(value.limits?.inputBytes) || value.limits.inputBytes < fixture.length) throw new Error("no usable input limit");
    limit = value.limits.inputBytes;
    source = value.source;
    return value.source.service;
  });
  await check("GET / in a browser is a page with an upload form and the source links", async () => {
    const answer = await exchange(base, "GET", "/", { headers: { accept: "text/html" } });
    expectStatus(answer, 200, "/ as HTML");
    const text = answer.body.toString("utf8");
    if (!/^text\/html/.test(answer.headers["content-type"] ?? "") || !text.includes('action="/scan"') ||
        !text.includes(`/tree/v${ENGINE}`)) throw new Error("not the upload page");
    if (!/default-src 'none'/.test(answer.headers["content-security-policy"] ?? "")) throw new Error("no restrictive Content-Security-Policy");
  });
  const reports = {};
  for (const mode of MODES) {
    for (const shape of ["raw", "multipart"]) {
      await check(`POST /scan ${shape} body, mode ${mode}: exactly the QR code and the Code 128`, async () => {
        const sent = shape === "raw"
          ? exchange(base, "POST", `/scan?mode=${mode}`, { body: fixture, headers: { "content-type": "image/png" } })
          : (() => { const form = multipart({ mode }, fixture); return exchange(base, "POST", "/scan", { body: form.body, headers: { "content-type": form.type } }); })();
        const answer = await sent;
        expectStatus(answer, 200, `${mode} ${shape}`);
        if (!/^application\/json/.test(answer.headers["content-type"] ?? "")) throw new Error(`content-type ${answer.headers["content-type"]}`);
        const report = parse(answer, `${mode} ${shape}`);
        const got = payloads(report);
        if (JSON.stringify(got) !== JSON.stringify(EXPECTED)) throw new Error(`payloads ${JSON.stringify(got)}, want ${JSON.stringify(EXPECTED)}`);
        if (report.versions?.scanner !== ENGINE) throw new Error(`engine ${report.versions?.scanner}, want ${ENGINE}`);
        if (report.trace?.budget_exhausted !== false) throw new Error(`trace.budget_exhausted is ${report.trace?.budget_exhausted}`);
        if (report.trace?.engine_panics !== 0) throw new Error(`trace.engine_panics is ${report.trace?.engine_panics}`);
        reports[`${mode}-${shape}`] = { detections: got, scanner: report.versions.scanner, total_ms: report.trace.total_ms };
        return `${report.trace.total_ms.toFixed(0)} ms in the engine`;
      });
    }
  }
  await check("an unknown mode is refused", () => expectRefusal("mode slow", 400, "QRSHTTP_MODE", "POST", "/scan?mode=slow", { body: fixture, headers: { "content-type": "image/png" } }));
  await check("bytes that are not an image are refused by the engine", () =>
    expectRefusal("not an image", 422, "QRS-001", "POST", "/scan?mode=fast", { body: Buffer.from("this is not an image\n"), headers: { "content-type": "application/octet-stream" } }));
  await check("a text body is refused", () => expectRefusal("text body", 415, "QRSHTTP_MEDIA_TYPE", "POST", "/scan", { body: Buffer.from("hello"), headers: { "content-type": "text/plain" } }));
  await check("GET /scan is refused", () => expectRefusal("GET /scan", 405, "QRSHTTP_METHOD", "GET", "/scan"));
  await check("an unknown path is refused", () => expectRefusal("unknown path", 404, "QRSHTTP_NOT_FOUND", "GET", "/upload"));
  await check("a body one byte over the advertised limit is refused", async () => {
    if (limit === null) throw new Error("the limit is unknown: GET / failed");
    return expectRefusal("oversized", 413, "QRSHTTP_INPUT_LIMIT", "POST", "/scan?mode=fast", { body: Buffer.alloc(limit + 1), headers: { "content-type": "image/png" } });
  });
  await check("the service still scans after the refusals", async () => {
    const answer = await exchange(base, "POST", "/scan?mode=fast", { body: fixture, headers: { "content-type": "image/png" } });
    expectStatus(answer, 200, "after refusals");
    if (JSON.stringify(payloads(parse(answer, "after refusals"))) !== JSON.stringify(EXPECTED)) throw new Error("other payloads");
  });

  const receipt = {
    schema: "qrscan-http-consumer/1",
    base,
    fixture: { path: fixturePath, sha256: fixtureSha256 },
    engine: ENGINE,
    source,
    passed: failures.length === 0,
    checks,
    reports,
  };
  if (options.receipt) writeFileSync(options.receipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(failures.length === 0 ? `consumer: all ${checks.length} checks passed against ${base}` : `consumer: ${failures.length} of ${checks.length} checks failed`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`consumer.mjs: ${error.message}`);
  process.exit(1);
});
