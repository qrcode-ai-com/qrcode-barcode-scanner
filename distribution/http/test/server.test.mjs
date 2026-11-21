// SPDX-License-Identifier: MIT
// The service in this process, on the installed engine: the black-box consumer first, then the
// limits, the source record, the refusals a client cannot provoke from outside and the log.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import * as engine from "@qrcode-ai-com/qrcode-barcode-scanner";
import { ENGINE_SOURCE, HARD_LIMITS, createScanServer, limitsFromEnvironment, sourceFromRecord } from "../server.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = [process.env.QRSCAN_HTTP_FIXTURE, join(here, "fixtures/mixed-code128-qr.png"), join(here, "../../../fixtures/symbology/mixed-code128-qr.png")]
  .find((path) => path && existsSync(path));
const fixture = readFileSync(FIXTURE);
const source = Object.freeze({ revision: "0".repeat(40), service: `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/${"0".repeat(40)}/distribution/http`, engine: ENGINE_SOURCE });

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`)));
}

function exchange(base, method, path, { body, headers = {}, chunked = false } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = request(new URL(path, base), { method, headers: body === undefined || chunked ? headers : { ...headers, "content-length": body.length } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    outgoing.on("error", reject);
    if (chunked && body !== undefined) {
      for (let at = 0; at < body.length; at += 1000) outgoing.write(body.subarray(at, at + 1000));
      outgoing.end();
    } else outgoing.end(body);
  });
}

describe("the service on the installed engine", () => {
  let server;
  let base;
  const lines = [];
  before(async () => {
    server = createScanServer({ engine, limits: limitsFromEnvironment({}), source, log: (line) => lines.push(line) });
    base = await listen(server);
  });
  after(() => server.close());

  test("the black-box consumer passes every check", async () => {
    const consumer = fileURLToPath(new URL("consumer.mjs", import.meta.url));
    const { stdout } = await promisify(execFile)(process.execPath, [consumer, base, FIXTURE, "--revision", source.revision], { maxBuffer: 1 << 20 });
    assert.match(stdout, /consumer: all 16 checks passed/);
  });

  test("the report is the engine's own, field for field", async () => {
    const answer = await exchange(base, "POST", "/scan?mode=full", { body: fixture, headers: { "content-type": "image/png" } });
    assert.equal(answer.status, 200);
    const direct = await engine.scan(fixture, { profile: "full", maxDimension: HARD_LIMITS.dimension, maxPixels: HARD_LIMITS.pixels });
    // Only the measured durations differ from one scan to the next.
    const timeless = (value) => JSON.parse(JSON.stringify(value, (key, item) => (key === "ms" || key === "total_ms" ? 0 : item)));
    assert.deepEqual(timeless(JSON.parse(answer.body)), timeless(direct));
  });

  test("a chunked body over the limit is refused without a declared length", async () => {
    const small = createScanServer({ engine, limits: limitsFromEnvironment({ QRSCAN_HTTP_MAX_INPUT_BYTES: "4096" }), source });
    const smallBase = await listen(small);
    try {
      const answer = await exchange(smallBase, "POST", "/scan", { body: Buffer.alloc(10_000), headers: { "content-type": "image/png" }, chunked: true });
      assert.equal(answer.status, 413);
      assert.equal(JSON.parse(answer.body).error.code, "QRSHTTP_INPUT_LIMIT");
    } finally { small.close(); }
  });

  test("a multipart form is judged field by field", async () => {
    const boundary = "qrscan-test";
    const form = (parts) => Buffer.from(parts.map(([name, value, file]) => `--${boundary}\r\ncontent-disposition: form-data; name="${name}"${file ? `; filename="${file}"` : ""}\r\n\r\n${value}\r\n`).join("") + `--${boundary}--\r\n`);
    const headers = { "content-type": `multipart/form-data; boundary=${boundary}` };
    const noImage = await exchange(base, "POST", "/scan", { body: form([["mode", "fast"]]), headers });
    assert.equal(JSON.parse(noImage.body).error.code, "QRSHTTP_NO_IMAGE");
    const twoModes = await exchange(base, "POST", "/scan?mode=full", { body: form([["mode", "fast"], ["image", "x", "a.png"]]), headers });
    assert.equal(twoModes.status, 400);
    assert.equal(JSON.parse(twoModes.body).error.code, "QRSHTTP_MODE");
    const broken = await exchange(base, "POST", "/scan", { body: Buffer.from("not a multipart body"), headers });
    assert.equal(JSON.parse(broken.body).error.code, "QRSHTTP_MULTIPART");
    const empty = await exchange(base, "POST", "/scan", { body: Buffer.alloc(0), headers: { "content-type": "image/png" } });
    assert.equal(JSON.parse(empty.body).error.code, "QRSHTTP_NO_IMAGE");
  });

  test("HEAD answers without a body and every answer names its source", async () => {
    const answer = await exchange(base, "HEAD", "/healthz");
    assert.equal(answer.status, 200);
    assert.equal(answer.body, "");
    assert.equal(answer.headers["x-source-code"], source.service);
    assert.equal(answer.headers["cache-control"], "no-store");
    assert.equal(answer.headers["x-content-type-options"], "nosniff");
  });

  test("the log names the method, the path and the status, never a query", () => {
    assert.ok(lines.length > 10);
    for (const line of lines) assert.match(line, /^(GET|HEAD|POST) \/[a-z]* \d{3} \d+ms$/);
    assert.ok(!lines.some((line) => line.includes("mode=")));
  });
});

describe("what the service refuses before a scan", () => {
  test("operator limits only lower the published ones", () => {
    assert.deepEqual(limitsFromEnvironment({}), HARD_LIMITS);
    assert.equal(limitsFromEnvironment({ QRSCAN_HTTP_MAX_CONCURRENT: "1" }).concurrent, 1);
    assert.throws(() => limitsFromEnvironment({ QRSCAN_HTTP_MAX_INPUT_BYTES: String(HARD_LIMITS.inputBytes + 1) }), /exceeds the service limit/);
    assert.throws(() => limitsFromEnvironment({ QRSCAN_HTTP_MAX_PIXELS: "0" }), /positive integer/);
    assert.throws(() => limitsFromEnvironment({ QRSCAN_HTTP_MAX_DIMENSION: "12px" }), /positive integer/);
  });

  test("another engine version is refused at start", () => {
    assert.throws(() => createScanServer({ engine: { version: () => "0.10.0", scan: engine.scan }, source }), /0\.11\.0 is required/);
  });

  test("the source record names the exact commit, or main when there is none", () => {
    const folder = mkdtempSync(join(tmpdir(), "qrscan-http-"));
    try {
      const directory = pathToFileURL(`${folder}/`);
      assert.equal(sourceFromRecord(directory).revision, null);
      assert.match(sourceFromRecord(directory).service, /\/tree\/main\/distribution\/http$/);
      const revision = "a".repeat(40);
      writeFileSync(join(folder, "SOURCE.json"), JSON.stringify({ engine: { repository: "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust", revision } }));
      assert.equal(sourceFromRecord(directory).service, `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/${revision}/distribution/http`);
      writeFileSync(join(folder, "SOURCE.json"), JSON.stringify({ engine: { repository: "https://example.com/fork", revision } }));
      assert.equal(sourceFromRecord(directory).revision, null);
    } finally { rmSync(folder, { recursive: true }); }
  });

  test("scans past the concurrency limit are refused, and an engine failure is not a 200", async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const slow = { version: () => "0.11.0", scan: async () => { await gate; throw new Error("boom"); } };
    const server = createScanServer({ engine: slow, limits: limitsFromEnvironment({ QRSCAN_HTTP_MAX_CONCURRENT: "1" }), source });
    const base = await listen(server);
    try {
      const first = exchange(base, "POST", "/scan", { body: fixture, headers: { "content-type": "image/png" } });
      await new Promise((resolve) => setTimeout(resolve, 200));
      const second = await exchange(base, "POST", "/scan", { body: fixture, headers: { "content-type": "image/png" } });
      assert.equal(second.status, 503);
      assert.equal(second.headers["retry-after"], "1");
      release();
      const answer = await first;
      assert.equal(answer.status, 500);
      assert.equal(JSON.parse(answer.body).error.code, "QRSHTTP_ENGINE");
    } finally { server.close(); }
  });
});
