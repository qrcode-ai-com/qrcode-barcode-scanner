// SPDX-License-Identifier: MIT
// The service in this process, on the installed engine: the black-box consumer first, then the
// limits, the source record, the refusals a client cannot provoke from outside and the log.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import * as engine from "@qrcode-ai-com/qrcode-barcode-scanner";
import {
  ENGINE_SOURCE, HARD_LIMITS, MAX_BUDGET_SCALE, PROFILE_BUDGETS_MS, budgetScaleFromEnvironment, createScanServer, limitsFromEnvironment,
  sourceFromRecord,
} from "../server.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = [process.env.QRSCAN_HTTP_FIXTURE, join(here, "fixtures/mixed-code128-qr.png"), join(here, "../../../fixtures/symbology/mixed-code128-qr.png")]
  .find((path) => path && existsSync(path));
const fixture = readFileSync(FIXTURE);
const source = Object.freeze({ revision: "0".repeat(40), service: `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/${"0".repeat(40)}/distribution/http`, engine: ENGINE_SOURCE });

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`)));
}

/** Send RAW bytes over a new connection and read the status line of the answer, if any. */
function rawStatus(base, raw) {
  return new Promise((resolve, reject) => {
    const { port } = new URL(base);
    const socket = connect(Number(port), "127.0.0.1", () => socket.end(raw));
    let text = "";
    socket.on("data", (chunk) => { text += chunk; });
    socket.on("close", () => resolve(text.split("\r\n")[0]));
    socket.on("error", reject);
  });
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const SCALE = 4;
  let server;
  let base;
  const lines = [];
  before(async () => {
    // The speed of the test machine is not under test: on a CI runner a scan of the sample takes
    // 490 to 650 ms in the engine, close to fast's 800 ms, so these scans run with four times the
    // budgets. The image jobs judge the engine's own budgets.
    server = createScanServer({ engine, limits: limitsFromEnvironment({}), budgetScale: SCALE, source, log: (line) => lines.push(line) });
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
    const direct = await engine.scan(fixture, {
      profile: "full", maxDimension: HARD_LIMITS.dimension, maxPixels: HARD_LIMITS.pixels, budgetMs: PROFILE_BUDGETS_MS.full * SCALE,
    });
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

  test("a request target that is not a URL path is refused, and the service keeps serving", async () => {
    for (const target of ["//a:65536", "//%", "//[", "*", "//scan"]) {
      const line = await rawStatus(base, `GET ${target} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`);
      assert.match(line, /^HTTP\/1\.1 4\d\d /, `${target} is answered with a refusal`);
      assert.equal((await exchange(base, "GET", "/healthz")).status, 200, `the service still serves after ${target}`);
    }
  });

  test("a body over the limit announced with Expect: 100-continue is refused before it is sent", async () => {
    const answer = await rawStatus(base, `POST /scan HTTP/1.1\r\nHost: x\r\nContent-Type: image/png\r\nContent-Length: ${HARD_LIMITS.inputBytes + 1}\r\nExpect: 100-continue\r\n\r\n`);
    assert.equal(answer, "HTTP/1.1 413 Payload Too Large");
  });

  test("the log names the method, the path and the status, never a query", async () => {
    await pause(50);
    assert.ok(lines.length > 10);
    for (const line of lines) assert.match(line, /^(GET|HEAD|POST) \/\S{0,79} (\d{3}|aborted) \d+ms$/);
    assert.ok(!lines.some((line) => line.includes("mode=")));
    assert.ok(lines.some((line) => /^POST \/scan 413 /.test(line)), "the 100-continue refusal is logged");
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

  test("the budget scale is a whole number from 1 to 20", () => {
    assert.equal(budgetScaleFromEnvironment({}), 1);
    assert.equal(budgetScaleFromEnvironment({ QRSCAN_HTTP_BUDGET_SCALE: "" }), 1);
    assert.equal(budgetScaleFromEnvironment({ QRSCAN_HTTP_BUDGET_SCALE: "10" }), 10);
    assert.equal(budgetScaleFromEnvironment({ QRSCAN_HTTP_BUDGET_SCALE: String(MAX_BUDGET_SCALE) }), 20);
    for (const value of ["0", "21", "1.5", "-2", "ten"]) {
      assert.throws(() => budgetScaleFromEnvironment({ QRSCAN_HTTP_BUDGET_SCALE: value }), /whole number from 1 to 20/, value);
    }
  });

  test("the profile budgets are the ones the pinned package documents", () => {
    const types = readFileSync(join(here, "../node_modules/@qrcode-ai-com/qrcode-barcode-scanner/index.d.ts"), "utf8");
    const { full, fast, frame } = PROFILE_BUDGETS_MS;
    assert.ok(types.includes(`(full ${full} · fast ${fast} · frame ${frame} ms)`), "index.d.ts no longer lists these budgets");
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

  test("a slow upload holds no scan slot, and an aborted upload frees its own", async () => {
    const server = createScanServer({ engine, limits: limitsFromEnvironment({ QRSCAN_HTTP_MAX_CONCURRENT: "1" }), source });
    const base = await listen(server);
    try {
      const { port } = new URL(base);
      const slow = connect(Number(port), "127.0.0.1");
      await new Promise((resolve) => slow.on("connect", resolve));
      slow.write(`POST /scan HTTP/1.1\r\nHost: x\r\nContent-Type: image/png\r\nContent-Length: ${fixture.length}\r\n\r\n`);
      slow.write(fixture.subarray(0, 100));
      await pause(100);
      const scanned = await exchange(base, "POST", "/scan", { body: fixture, headers: { "content-type": "image/png" } });
      assert.equal(scanned.status, 200, "a scan runs while another client is still uploading");
      slow.destroy();
      await pause(100);
      for (let round = 0; round < 3; round += 1) {
        const answer = await exchange(base, "POST", "/scan", { body: fixture, headers: { "content-type": "image/png" } });
        assert.equal(answer.status, 200, "the aborted upload gave its slot back");
      }
    } finally { server.close(); }
  });

  test("uploads past their slots are refused, and an engine error about its options is the server's", async () => {
    const failing = { version: () => "0.11.0", scan: async () => { throw new Error("[QRS-006] budgetMs out of range"); } };
    const server = createScanServer({ engine: failing, limits: limitsFromEnvironment({ QRSCAN_HTTP_MAX_CONCURRENT: "1" }), source });
    const base = await listen(server);
    const held = [];
    try {
      const { port } = new URL(base);
      for (let slot = 0; slot < 2; slot += 1) {
        const socket = connect(Number(port), "127.0.0.1");
        await new Promise((resolve) => socket.on("connect", resolve));
        socket.write(`POST /scan HTTP/1.1\r\nHost: x\r\nContent-Type: image/png\r\nContent-Length: ${fixture.length}\r\n\r\n`);
        held.push(socket);
      }
      await pause(100);
      const third = await exchange(base, "POST", "/scan", { body: fixture, headers: { "content-type": "image/png" } });
      assert.equal(third.status, 503);
      assert.equal(JSON.parse(third.body).error.code, "QRSHTTP_BUSY");
      for (const socket of held) socket.destroy();
      await pause(100);
      const answer = await exchange(base, "POST", "/scan", { body: fixture, headers: { "content-type": "image/png" } });
      assert.equal(answer.status, 500);
      assert.equal(JSON.parse(answer.body).error.code, "QRSHTTP_ENGINE");
    } finally { server.close(); }
  });

  test("a budget scale above 1 scans with the scaled budget, and 1 leaves it to the engine", async () => {
    const calls = [];
    const recording = { version: () => "0.11.0", scan: async (bytes, options) => { calls.push(options); return engine.scan(bytes, options); } };
    for (const scale of [1, 10]) {
      const server = createScanServer({ engine: recording, limits: limitsFromEnvironment({}), budgetScale: scale, source });
      const base = await listen(server);
      try {
        calls.length = 0;
        for (const mode of ["fast", "frame", "full"]) {
          const answer = await exchange(base, "POST", `/scan?mode=${mode}`, { body: fixture, headers: { "content-type": "image/png" } });
          assert.equal(answer.status, 200, mode);
          // With the engine's own budgets, whether a scan is cut depends on the machine.
          if (scale > 1) assert.equal(JSON.parse(answer.body).trace.budget_exhausted, false, mode);
        }
        const wanted = scale === 1 ? [undefined, undefined, undefined] : [8_000, 800, 40_000];
        assert.deepEqual(calls.map((options) => options.budgetMs), wanted);
        assert.deepEqual(calls.map((options) => Object.hasOwn(options, "budgetMs")), wanted.map((ms) => ms !== undefined));
        const described = JSON.parse((await exchange(base, "GET", "/", { headers: { accept: "application/json" } })).body);
        assert.deepEqual(described.budgetsMs, { fast: 800 * scale, frame: 80 * scale, full: 4000 * scale });
      } finally { server.close(); }
    }
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
