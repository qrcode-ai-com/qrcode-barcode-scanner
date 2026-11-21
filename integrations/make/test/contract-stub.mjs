// SPDX-License-Identifier: MIT
// A stand-in for the scan service (distribution/http) while that service is not on main: the same
// routes, the same JSON answers and refusal codes, and the real engine, the published WebAssembly
// package 0.11.0, behind them. It scans with no budget, so its reports do not depend on the speed
// of the machine. The tests run against the real service instead when QRSCAN_MAKE_SERVICE_URL is set.
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PACKAGE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
const PROFILES = ['fast', 'frame', 'full'];
const LIMITS = { inputBytes: 8 * 1024 * 1024, dimension: 4096, pixels: 16_000_000 };
export const SERVICE_VERSION = '0.1.0';
export const ENGINE_VERSION = '0.11.0';

class Refusal extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function loadEngine() {
  const engine = await import(PACKAGE);
  engine.initSync({ module: readFileSync(require.resolve(`${PACKAGE}/qrcode-barcode-scanner_bg.wasm`)) });
  if (engine.version() !== ENGINE_VERSION) throw new Error(`engine ${ENGINE_VERSION} is required`);
  return engine;
}

async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > LIMITS.inputBytes + 64 * 1024) throw new Refusal(413, 'QRSHTTP_INPUT_LIMIT', `The request body exceeds ${LIMITS.inputBytes + 64 * 1024} bytes`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readScan(request, url) {
  const modes = url.searchParams.getAll('mode');
  if (modes.length > 1) throw new Refusal(400, 'QRSHTTP_MODE', 'Give mode at most once');
  let mode = modes[0];
  const type = (request.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  const body = await readBody(request);
  let bytes;
  if (type === 'multipart/form-data') {
    let form;
    try {
      form = await new Response(body, { headers: { 'content-type': request.headers['content-type'] } }).formData();
    } catch {
      throw new Refusal(400, 'QRSHTTP_MULTIPART', 'The multipart body could not be read');
    }
    const fields = form.getAll('mode');
    if (fields.length > 1 || (fields.length === 1 && typeof fields[0] !== 'string')) throw new Refusal(400, 'QRSHTTP_MODE', 'Give mode at most once, as a text field');
    if (fields.length === 1) {
      if (mode !== undefined && mode !== fields[0]) throw new Refusal(400, 'QRSHTTP_MODE', 'The query and the form name different modes');
      mode = fields[0];
    }
    const images = form.getAll('image');
    if (images.length !== 1 || typeof images[0] === 'string') throw new Refusal(400, 'QRSHTTP_NO_IMAGE', 'Send one image file, in the form field named image');
    if (images[0].size > LIMITS.inputBytes) throw new Refusal(413, 'QRSHTTP_INPUT_LIMIT', `The image exceeds ${LIMITS.inputBytes} bytes`);
    bytes = new Uint8Array(await images[0].arrayBuffer());
  } else if (type.startsWith('image/') || type === 'application/octet-stream') {
    if (body.length > LIMITS.inputBytes) throw new Refusal(413, 'QRSHTTP_INPUT_LIMIT', `The image exceeds ${LIMITS.inputBytes} bytes`);
    bytes = new Uint8Array(body);
  } else {
    throw new Refusal(415, 'QRSHTTP_MEDIA_TYPE', 'Send the image as the raw body (image/* or application/octet-stream) or as multipart/form-data');
  }
  mode ??= 'frame';
  if (!PROFILES.includes(mode)) throw new Refusal(400, 'QRSHTTP_MODE', `mode must be one of ${PROFILES.join(', ')}`);
  if (bytes.length === 0) throw new Refusal(400, 'QRSHTTP_NO_IMAGE', 'The image is empty');
  return { bytes, mode };
}

/** Start the stub on a free loopback port; resolves with { url, close }. */
export async function startStub() {
  const engine = await loadEngine();
  const json = (response, status, value) => {
    const data = Buffer.from(JSON.stringify(value));
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': data.length });
    response.end(data);
  };
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://service.invalid');
    try {
      if (url.pathname === '/healthz') {
        if (request.method !== 'GET') throw new Refusal(405, 'QRSHTTP_METHOD', 'Use GET /healthz');
        return json(response, 200, { status: 'ok', service: SERVICE_VERSION, engine: ENGINE_VERSION });
      }
      if (url.pathname !== '/scan') throw new Refusal(404, 'QRSHTTP_NOT_FOUND', 'Use GET /, GET /healthz or POST /scan');
      if (request.method !== 'POST') throw new Refusal(405, 'QRSHTTP_METHOD', 'Use POST /scan');
      const { bytes, mode } = await readScan(request, url);
      try {
        return json(response, 200, engine.scan_image(bytes, mode, LIMITS.dimension, LIMITS.pixels, 0));
      } catch (error) {
        const tag = String(error?.message ?? error).match(/\[?(QRS-\d{3})\]?/)?.[1];
        if (tag) throw new Refusal(422, tag, String(error.message ?? error).replace(/\p{Cc}/gu, ' ').slice(0, 300));
        throw new Refusal(500, 'QRSHTTP_ENGINE', 'The scanner engine could not complete the scan');
      }
    } catch (error) {
      const refusal = error instanceof Refusal ? error : new Refusal(500, 'QRSHTTP_INTERNAL', 'The request could not be handled');
      if (!request.complete) request.resume();
      return json(response, refusal.status, { error: { code: refusal.code, message: refusal.message } });
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}
