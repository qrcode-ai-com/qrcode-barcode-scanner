// Loader and initialization phases of the INSTALLED JavaScript packages, kept
// apart from scan rejections ([QRS-xxx]) and from valid empty reports.
// packed-node-consumer.mjs runs them on every consumer row:
// - native: the load phase (a main package without its platform package throws
//   at require, and no WASI binding stands in) and the two cancellation phases
//   (spec/02-profiles.md § Cancellation: an AbortSignal rejects a QUEUED task;
//   a RUNNING scan is not interrupted and resolves with its report);
// - wasm: every ScannerInitError code a Node realm reaches through the installed
//   ./auto loader. loader_import_failed and wasm_compile_failed need a browser
//   (a failed chunk import, a CSP without wasm-unsafe-eval): a Node realm does
//   not reach them, so this module does not claim them.
// Each case runs in a fresh process, so no module cache or realm stub carries
// over between cases or into the caller.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The slowest-to-read fixtures of the shared truth set (consumer-truth.json):
// a full unbounded scan of each takes hundreds of milliseconds, long enough to
// hold the only pool thread or to be aborted while it runs.
const SLOW = [
  { file: "fixtures/symbology/mixed-code128-qr.png", texts: ["STOCK-4827", "https://qrc-ai.com/76xMa"] },
  { file: "fixtures/artistic/blob-style-monkey-logo.webp", texts: ["https://qrc-ai.com/Uo54C"] },
];
const NOT_FOUND = "Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.";
const fixture = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));
const run = (args, options) => JSON.parse(execFileSync(process.execPath, args,
  { encoding: "utf8", timeout: 120_000, ...options }).trim().split("\n").pop());

/** The load phase: the main package alone (its optional platform packages
 * omitted) must throw at require, before any scan, with no WASI fallback. */
export function nativeLoadPhase({ npmCli, mainTarball, name, platformName }) {
  const bare = mkdtempSync(join(tmpdir(), "qrscan-packed-bare-"));
  writeFileSync(join(bare, "package.json"), '{"name":"packed-bare","private":true}\n');
  execFileSync(process.execPath, [npmCli, "install", "--offline", "--ignore-scripts", "--omit=optional",
    "--no-audit", "--no-fund", "--cache", join(bare, "empty-npm-cache"), mainTarball],
  { cwd: bare, stdio: "inherit", timeout: 180_000 });
  const observed = run(["-e", `
    let bound = false;
    const chain = [];
    try { require(${JSON.stringify(name)}); bound = true; }
    catch (error) { for (let current = error; current; current = current.cause) chain.push(current.message); }
    const cached = Object.keys(require.cache);
    console.log(JSON.stringify({ bound, chain, wasi: cached.filter((file) => /wasi/i.test(file)),
      native: cached.filter((file) => file.endsWith(".node")) }));`], { cwd: bare });
  assert.equal(observed.bound, false, "a main package without its platform package must not load");
  assert.equal(observed.chain[0], NOT_FOUND);
  assert.ok(observed.chain.some((message) => message.startsWith(`Cannot find module '${platformName}'`)),
    `the load error names the missing ${platformName}: ${JSON.stringify(observed.chain)}`);
  assert.deepEqual(observed.wasi, [], "no WASI binding stands in for the native one");
  assert.deepEqual(observed.native, []);
  return { phase: "load", consumer: bare, error: observed.chain[0], missing: platformName, wasi_loaded: false };
}

/** Queued versus running cancellation, on one pool thread (UV_THREADPOOL_SIZE
 * is read once, at the pool's first use, so the case needs its own process). */
export function nativeCancellation({ consumer, name }) {
  const [held, aborted] = SLOW.map(({ file }, index) => {
    const path = join(consumer, `slow-${index}${file.slice(file.lastIndexOf("."))}`);
    copyFileSync(fixture(file), path);
    return path;
  });
  const observed = run(["-e", `
    const qr = require(${JSON.stringify(name)});
    const { readFileSync } = require("node:fs");
    const held = readFileSync(${JSON.stringify(held)}), aborted = readFileSync(${JSON.stringify(aborted)});
    const options = { profile: "full", budgetMs: 0 };
    const texts = (report) => report.detections.map((d) => d.content.text).sort();
    (async () => {
      // three scans hold the only thread; the fourth is aborted while it waits
      const t0 = performance.now();
      const blockers = [held, held, held].map((image) => qr.scan(image, options));
      const queuedController = new AbortController();
      const queued = qr.scan(aborted, { ...options, signal: queuedController.signal })
        .then(() => ({ resolved: true, at: performance.now() - t0 }),
          (error) => ({ resolved: false, name: error.name, at: performance.now() - t0 }));
      setTimeout(() => queuedController.abort(), 20);
      const outcome = await queued;
      const reports = await Promise.all(blockers);
      const blocked = { ms: performance.now() - t0, texts: reports.map(texts) };
      // alone on the pool: aborted while it runs, it still resolves
      const runningController = new AbortController();
      const t1 = performance.now();
      let abortedAt = null;
      setTimeout(() => { abortedAt = performance.now() - t1; runningController.abort(); }, 50);
      const running = await qr.scan(aborted, { ...options, signal: runningController.signal })
        .then((report) => ({ resolved: true, ms: performance.now() - t1, texts: texts(report) }),
          (error) => ({ resolved: false, name: error.name, ms: performance.now() - t1 }));
      console.log(JSON.stringify({ pool: process.env.UV_THREADPOOL_SIZE, queued: outcome, blocked,
        running: { ...running, abortedAt } }));
    })();`], { cwd: consumer, env: { ...process.env, UV_THREADPOOL_SIZE: "1" } });
  assert.equal(observed.pool, "1");
  assert.equal(observed.queued.resolved, false, `a queued task aborts: ${JSON.stringify(observed)}`);
  assert.equal(observed.queued.name, "AbortError");
  assert.ok(observed.queued.at < observed.blocked.ms,
    `the abort landed while the task was queued behind the blockers: ${JSON.stringify(observed)}`);
  for (const texts of observed.blocked.texts) assert.deepEqual(texts, [...SLOW[0].texts].sort());
  assert.equal(observed.running.resolved, true, `a running scan is not interrupted: ${JSON.stringify(observed)}`);
  assert.ok(observed.running.abortedAt !== null && observed.running.abortedAt < observed.running.ms,
    `the abort landed while the scan ran: ${JSON.stringify(observed)}`);
  assert.deepEqual(observed.running.texts, [...SLOW[1].texts].sort());
  return { pool_threads: 1, queued: { outcome: observed.queued.name, at_ms: +observed.queued.at.toFixed(1),
    queue_released_ms: +observed.blocked.ms.toFixed(1) },
  running: { outcome: "resolved", aborted_at_ms: +observed.running.abortedAt.toFixed(1), resolved_ms: +observed.running.ms.toFixed(1) } };
}

// A module that validates and compiles but cannot instantiate: it imports
// "x"."y", and the bindings' import object has no module "x" (V8 throws a
// TypeError for a missing import module, a LinkError for a missing field).
const LINK = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 2, 7, 1, 1, 120, 1, 121, 0, 0];
// A valid header followed by a truncated type section: invalid code.
const INVALID = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96];

/** Every initialization failure a Node realm can reach through the installed
 * ./auto loader, each with its stable code, plus one success from the same
 * installed bytes. A loader makes one attempt: a second call, concurrent or
 * after the failure, shares the first call's promise. */
export function wasmLoaderPhases({ consumer, packageName, wasmPath, fixturePath, text }) {
  const auto = JSON.stringify(`${packageName}/auto`);
  const outcome = `
    const outcome = async (options) => {
      const load = createScannerLoader(options);
      const first = load(), second = load();
      try {
        const scanner = await first;
        const report = scanner.scan_image(readFileSync(${JSON.stringify(fixturePath)}), "fast", undefined, undefined, 0);
        return { ok: true, shared: first === second, variant: scanner.variant, version: scanner.version(),
          texts: report.detections.map((d) => d.content.text) };
      } catch (error) {
        let again;
        try { await load(); } catch (retry) { again = retry; }
        return { ok: false, shared: first === second && again === error, name: error.name,
          init: error instanceof ScannerInitError, code: error.code, status: error.status ?? null,
          variant: error.variant, cause: error.cause === undefined ? null : (error.cause?.name ?? typeof error.cause) };
      }
    };`;
  const realm = run(["--input-type=module", "-e", `
    import http from "node:http";
    import { readFileSync } from "node:fs";
    const { createScannerLoader, ScannerInitError, scannerCapabilities } = await import(${auto});
    ${outcome}
    const server = http.createServer((request, response) => {
      if (request.url === "/missing.wasm") { response.writeHead(404); response.end("missing"); return; }
      // headers promise 4096 bytes, the connection drops after the header
      response.writeHead(200, { "content-type": "application/wasm", "content-length": "4096" });
      response.write(Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]));
      setTimeout(() => response.socket.destroy(), 20);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    const closed = await new Promise((resolve) => { const probe = http.createServer();
      probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); }); });
    const data = (bytes) => "data:application/wasm;base64," + Buffer.from(bytes).toString("base64");
    const results = {
      capabilities: scannerCapabilities(),
      invalid_options: await outcome({ variant: "simd" }),
      asset_network_failed: await outcome({ wasmUrl: "http://127.0.0.1:" + closed + "/scanner.wasm" }),
      asset_http_failed: await outcome({ wasmUrl: base + "/missing.wasm" }),
      asset_read_failed: await outcome({ wasmUrl: base + "/truncated.wasm" }),
      binary_invalid: await outcome({ wasmUrl: data([0, 0, 0, 0]) }),
      wasm_validation_failed: await outcome({ wasmUrl: data(${JSON.stringify(INVALID)}) }),
      wasm_instantiate_failed: await outcome({ wasmUrl: data(${JSON.stringify(LINK)}) }),
      loaded: await outcome({ wasmUrl: data(readFileSync(${JSON.stringify(wasmPath)})) }),
    };
    server.close();
    console.log(JSON.stringify(results));`], { cwd: consumer });
  // realm stubs, each in its own process: no WebAssembly; the baseline refused
  const stubbed = (stub) => run(["--input-type=module", "-e", `
    import { readFileSync } from "node:fs";
    ${stub}
    const { createScannerLoader, ScannerInitError } = await import(${auto});
    ${outcome}
    console.log(JSON.stringify(await outcome({})));`], { cwd: consumer });
  const unavailable = stubbed("globalThis.WebAssembly = undefined;");
  const unsupported = stubbed("WebAssembly.validate = () => false;");
  assert.deepEqual(realm.capabilities, { wasm: true, simd: realm.capabilities.simd, baseline: true });
  const expected = {
    invalid_options: { variant: null, cause: null }, asset_network_failed: { variant: "portable", cause: "TypeError" },
    asset_http_failed: { variant: "portable", cause: null, status: 404 }, asset_read_failed: { variant: "portable", cause: "TypeError" },
    binary_invalid: { variant: "portable", cause: "CompileError" }, wasm_validation_failed: { variant: "portable", cause: "CompileError" },
    wasm_instantiate_failed: { variant: "portable", cause: "TypeError" },
  };
  const failures = { ...Object.fromEntries(Object.keys(expected).map((code) => [code, realm[code]])),
    wasm_unavailable: unavailable, wasm_features_unsupported: unsupported };
  for (const [code, observed] of Object.entries(failures)) {
    const want = expected[code] ?? { variant: "portable", cause: null };
    assert.deepEqual({ ok: observed.ok, shared: observed.shared, name: observed.name, init: observed.init,
      code: observed.code, status: observed.status, variant: observed.variant, cause: observed.cause },
    { ok: false, shared: true, name: "ScannerInitError", init: true, code, status: want.status ?? null,
      variant: want.variant, cause: want.cause }, code);
  }
  assert.deepEqual(realm.loaded, { ok: true, shared: true, variant: "portable", version: realm.loaded.version, texts: [text] });
  return { realm: { node: process.version, capabilities: realm.capabilities },
    codes: Object.keys(failures), stubbed_realm: ["wasm_unavailable", "wasm_features_unsupported"],
    browser_only: ["loader_import_failed", "wasm_compile_failed"], loaded_version: realm.loaded.version };
}
