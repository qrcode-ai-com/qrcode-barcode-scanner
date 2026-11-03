// Qualify the packed package in a fresh Vite host, never a workspace link.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync,
  writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { caseBytes, judge, load as loadTruth, wireContent } from './consumer-truth.mjs';
import { declarationProgram, optionCoverage, unusedImports, valueExports } from '../tests/wasm-browser/overlay-declarations.mjs';
import { PROFILES } from '../tests/wasm-browser/overlay-scenes.mjs';
import { overlaySuiteReport } from '../tests/wasm-browser/overlay-suite.mjs';
import { overlayWitnesses } from '../tests/wasm-browser/overlay-witnesses.mjs';

const [archiveArg, outputArg] = process.argv.slice(2);
assert.ok(archiveArg && outputArg, 'usage: packed-wasm-browser.mjs ARCHIVE.tgz RECEIPT.json');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archive = resolve(archiveArg), output = resolve(outputArg);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// The receipt grows as the checks pass. A failure, a child check that timed out included, writes
// it as it stands, with ok false and the failing step, before the process exits with that error:
// the phases, suites and runtimes that passed before it stay on record. Its keys keep the order
// of a complete receipt; a part the run never reached stays null.
const passed = [], runs = [], measurements = {};
const receipt = { ok: false, failure: null, checkedAt: null, platform: process.platform, arch: process.arch,
  node: process.version, consumer: null, artifact: { archive, sha256: null }, buildInfo: null, phases: [], passed, runs,
  fixtures: null,
  // Per runtime, one cold run on this runner: recorded for comparison, never asserted.
  measurements, cameraControl: null,
  // Per destination suite: for the core and Node suites, the label range their pass line declares
  // (they record no executed case) and the labels skipped and not run; for the browser suite, the
  // cases passed per runtime, the cases not run and the browsers that ran them.
  destination: null,
  // The shipped image example: its files and what the static server answered for one page.
  example: null,
  // examples/ssr.mjs run under Node from the installed folder: its printed lines and the sockets
  // and DNS lookups the run made.
  ssrExample: null,
  // The bundler forms of examples/README.md built by the consumer's Vite build: each package
  // name and the installed file it resolved to, and the files the build emitted for them.
  bundlerForms: null,
  // The Content-Security-Policy header the examples were served with: the starting policy, the
  // style hash computed from the installed image page and the policy each runtime's search found.
  csp: null,
  // ./camera-overlay: the engines its rendered suite ran in, its server import and declarations,
  // and per browser the profiles and outcome of every witness, the default-budget effects runs
  // (measured, never judged), what was not run and every failure.
  overlay: null,
  unverified: [...(!process.env.QRSCAN_NO_SIMD_BROWSER ? ['Actual SIMD-unavailable browser not supplied'] : []),
    'Exact reported Windows10/Chrome109 and Windows10/Firefox158', 'Real Safari and physical phones',
    'Physical camera devices and their video pipelines (the camera witnesses use canvas-captured video)',
    'Production app and customer exports',
    'Destination checks against real public destinations (the destination suites use loopback fixtures, fakes and refusals only)',
    'The image example behind static servers other than this loopback node:http one; Firefox does not report a worker\'s module imports as requests (the server log lists them)',
    'The image example on real images that reach a capacity or a time budget: stand-in worker replies drive those readings, and the core tests pin the engine side',
    'What a screen reader announces from the image example (its roles, live region and focus are checked, not speech)',
    'The camera example with a real camera, a permission prompt or a device change: its witness replaces getUserMedia and enumerateDevices with a canvas stream of the control code and two named stand-in cameras',
    'The camera example with a worker that hangs inside a scan, or a page that really unloads: its witness withholds one scan_frame request from a working worker, and dispatches pagehide events in a live page',
    ...(process.env.QRSCAN_NO_SIMD_BROWSER ? ['The camera example and the examples\' Content-Security-Policy in the SIMD-disabled Chromium, which runs the loader and examples/headless.html only'] : []),
    'A destination check the camera example sends to a real host: the witness presses Check destination only under a policy that blocks the request before it leaves the browser',
    'The examples\' Content-Security-Policy in WebKit, Safari or any browser other than the Playwright Chromium and Firefox builds run here, and the same policy delivered by a meta element alone',
    'The overlay over a live camera stream: its scenes give the shipped tracker and overlay frames composed from fixture images on a fake clock, and its effects witness reads a canvas standing in for the video',
    'The overlay in Safari or any browser on iOS or Android: Playwright WebKit (QRSCAN_TEST_WEBKIT=1) is not Safari',
    ...(process.env.QRSCAN_TEST_WEBKIT !== '1' ? ['The overlay suite and witnesses in Playwright WebKit (QRSCAN_TEST_WEBKIT=1 runs them)'] : [])] };
const writeReceipt = () => {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ ...receipt, checkedAt: new Date().toISOString() }, null, 2) + '\n');
};
// Progress on stderr: one line as each phase starts, with the seconds since launch, so a log cut
// short (a job past its time limit) names the phase it stopped in. The receipt keeps the
// duration of every phase that finished.
const launched = performance.now();
const secondsSince = start => Math.round(performance.now() - start) / 1000;
let currentPhase = null;
const phase = label => {
  if (currentPhase) receipt.phases.push({ label: currentPhase.label, seconds: secondsSince(currentPhase.started) });
  currentPhase = label === null ? null : { label, started: performance.now() };
  console.error(`packed-wasm-browser +${secondsSince(launched).toFixed(1)} s: ${label ?? 'every check passed'}`);
};
// Node emits this just before it reports an uncaught error, a rejected top-level await included,
// and exits with it: the run still fails, with its receipt written first.
process.on('uncaughtExceptionMonitor', error => {
  receipt.ok = false;
  receipt.failure = { step: currentPhase?.label ?? null, seconds: currentPhase ? secondsSince(currentPhase.started) : null,
    name: error?.name ?? null, message: error instanceof Error ? error.message : String(error) };
  console.error(`packed-wasm-browser +${secondsSince(launched).toFixed(1)} s: ${receipt.failure.step ?? 'setup'} failed`);
  try { writeReceipt(); } catch (writeError) { console.error(`the failure receipt was not written: ${writeError.message}`); }
});
receipt.artifact.sha256 = sha(readFileSync(archive));
const consumer = realpathSync(mkdtempSync(join(tmpdir(), 'qrscan-packed-browser-')));
receipt.consumer = consumer;
cpSync(join(root, 'tests/wasm-browser'), consumer, { recursive: true });
// A child check that fails or outlives its timeout reports its label and the tail of its own
// output, not a buffer dump. The timeout kills with SIGKILL: Playwright answers SIGTERM by closing
// its browsers without exiting, so a hung browser suite would keep execFileSync waiting.
const CHILD_TIMEOUT_MS = 300_000;
const runNode = (args, { label, timeout = CHILD_TIMEOUT_MS, ...options } = {}) => {
  try {
    return execFileSync(process.execPath, args, { cwd: consumer, stdio: 'pipe', encoding: 'utf8', timeout,
      killSignal: 'SIGKILL', ...options });
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    const outcome = error.code === 'ETIMEDOUT' ? `timed out after ${timeout / 1000} s (ETIMEDOUT, ${error.signal})`
      : `failed (${error.status ?? error.signal ?? error.code})`;
    throw new Error(`${label ?? args.map(arg => basename(arg)).join(' ')} ${outcome}:\n${output.slice(-12000)}`);
  }
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const command = (args) => execFileSync(npm, args, { cwd: consumer, stdio: 'pipe', timeout: 180_000,
  env: { ...process.env, npm_config_cache: join(consumer, '.npm-cache') }, shell: process.platform === 'win32' });
phase('npm ci of the consumer');
command(['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
phase('npm install of the archive');
command(['install', '--no-save', '--package-lock=false', '--ignore-scripts', '--no-audit', '--no-fund', archive]);
const require = createRequire(join(consumer, 'package.json'));
const { chromium, firefox, webkit } = require('playwright');
if (process.env.QRSCAN_INSTALL_BROWSERS === '1') {
  phase('browser install');
  runNode([join(dirname(require.resolve('playwright/package.json')), 'cli.js'), 'install',
    ...(process.platform === 'linux' ? ['--with-deps'] : []), 'chromium',
    ...(process.env.QRSCAN_TEST_FIREFOX === '1' ? ['firefox'] : []),
    ...(process.env.QRSCAN_TEST_WEBKIT === '1' ? ['webkit'] : [])], { label: 'browser install', timeout: 240_000 });
}
phase('installed files');
const vite = await import(pathToFileURL(require.resolve('vite')));
const installed = join(consumer, 'node_modules/@supernovae-st/qrcode-ai-scanner-wasm');
const manifest = JSON.parse(readFileSync(join(installed, 'package.json')));
Object.assign(receipt.artifact, { name: manifest.name, version: manifest.version });
// One physical WASM, and it is the recorded build: build-info.json names the
// bytes, compiled-input digest, recipe and tools of the module it shipped with.
const listFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? listFiles(join(dir, entry.name)).map(name => `${entry.name}/${name}`) : [entry.name]);
const wasmFiles = listFiles(installed).filter(name => name.endsWith('.wasm'));
assert.deepEqual(wasmFiles, ['qrcode-ai-scanner_bg.wasm'], 'the installed package holds exactly one WASM binary');
const buildInfo = JSON.parse(readFileSync(join(installed, 'build-info.json')));
receipt.buildInfo = { source_revision: buildInfo.source_revision, inputs: buildInfo.inputs.sha256, wasm: buildInfo.wasm,
  toolchain: buildInfo.toolchain };
const installedWasmSha256 = sha(readFileSync(join(installed, wasmFiles[0])));
assert.equal(buildInfo.wasm.sha256, installedWasmSha256, 'installed WASM bytes are the recorded build');
assert.equal(buildInfo.version, manifest.version);
assert.deepEqual(buildInfo.wasm.features.filter(feature => !['bulk-memory', 'mutable-globals', 'multivalue',
  'nontrapping-fptoint', 'reference-types', 'sign-ext'].includes(feature)), [], 'recorded features stay inside the floor');
passed.push(`Installed package holds one WASM (${installedWasmSha256}) matching build-info.json`);
// The 0.10.x compatible/ export paths resolve to that same module's own files.
for (const [legacy, file] of [['compatible/qrcode-ai-scanner_bg.wasm', 'qrcode-ai-scanner_bg.wasm'],
  ['compatible/qrcode-ai-scanner.js', 'qrcode-ai-scanner.js']]) {
  assert.equal(realpathSync(require.resolve(`@supernovae-st/qrcode-ai-scanner-wasm/${legacy}`)),
    realpathSync(join(installed, file)), `${legacy} resolves to the one portable ${file}`);
}
passed.push('Legacy compatible/ export paths resolve to the one portable module');
const fixtures = [
  ['clean', 'fixtures/clean/OK_68ms_100_4e875a2c.png', 'clean-url'],
  ['artistic', 'fixtures/artistic/blob-style-monkey-logo.webp', 'artistic-blob'],
  ['difficult', 'fixtures/degraded/logo-occluded-rescue.png', 'rescued-occluded'],
  ['unreadable', 'fixtures/degraded/FAIL_1491ms_0_584c998c.png', 'no-detection'],
  ['eci', 'fixtures/eci/eci4-a1.png', 'eci-iso-8859-2'],
  ['binary', 'fixtures/eci/eci899-binary.png', 'eci-undecodable'],
  ['barcode', 'fixtures/symbology/ean13.png', 'ean13-retail-gtin'],
].map(([name, file, golden]) => ({ name, file, bytes: [...readFileSync(join(root, file))],
  expected: JSON.parse(readFileSync(join(root, `spec/examples/${golden}.json`))).detections.map(d => d.content) }));
receipt.fixtures = fixtures.map(({ name, file, bytes }) => ({ name, file, sha256: sha(new Uint8Array(bytes)) }));
const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).filter(([key]) => !['ms', 'total_ms', 'elapsed_ms'].includes(key)).map(([key, child]) => [key, normalize(child)])) : value;
const mixedBytes = [...readFileSync(join(root, 'fixtures/symbology/mixed-code128-qr.png'))];
const linearCases = [
  ['symbology/code39-short-j.png', [['code39', 'J']]],
  ['artistic/github-orb-code39-regression.png', [['qr_code', 'https://qrc-ai.com/QVR9a']]],
  ['symbology/code93-bwipp-checked.png', [['code93', 'SCANNER-93']]],
  ['symbology/databar-small-regression.png', [['data_bar', '09506000134352']]],
  ['symbology/databar-expanded-bwipp-regression.png', [['data_bar_expanded', '(01)09506000134352(10)DEMO']]],
  ['invalid/code93-missing-checks.png', []],
  ['invalid/databar-expanded-acfd.png', []],
].map(([file, expected]) => ({ file, expected, bytes: [...readFileSync(join(root, 'fixtures', file))] }));
phase('SSR imports');
// SSR import must not compile WASM, fetch assets or depend on window/self. On a server, the fetch
// transport of ./destination refuses to run, with the global fetch or an injected one: there fetch
// has no CORS and follows redirects anywhere. The expected result is that transport's identity
// (kind fetch, label 'This browser', provenance network) and its runtime refusal, with no request.
const ssr = runNode(['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  globalThis.WebAssembly = undefined;
  let fetchCalls = 0;
  globalThis.fetch = () => { fetchCalls += 1; throw Error('unexpected SSR fetch'); };
  const mod = await import('@supernovae-st/qrcode-ai-scanner-wasm/auto');
  const camera = await import('@supernovae-st/qrcode-ai-scanner-wasm/camera');
  const overlay = await import('@supernovae-st/qrcode-ai-scanner-wasm/camera-overlay');
  const destination = await import('@supernovae-st/qrcode-ai-scanner-wasm/destination');
  assert.equal(typeof camera.createCameraScanner, 'function');
  assert.equal(typeof overlay.createCameraOverlay, 'function');
  assert.deepEqual(mod.scannerCapabilities(), {wasm:false,simd:false,baseline:false});
  await assert.rejects(mod.loadScanner(), e => e.code === 'wasm_unavailable');
  const url = 'https://example.com/';
  const refused = { outcome: 'unavailable', reason: 'transport_unsupported', url,
    transport: { kind: 'fetch', label: 'This browser' }, provenance: 'network', requestSent: false,
    finalUrl: null, status: null, redirected: null, changed: null, redirects: null, hopCount: null,
    detail: 'Runtime not supported' };
  for (const options of [{ scope: 'network' }, { scope: 'network', fetch: globalThis.fetch }]) {
    const label = options.fetch ? 'injected fetch' : 'global fetch';
    const { durationMs, ...rest } = await destination.resolveDestination(
      destination.createFetchTransport(options), { url });
    assert.deepEqual(rest, refused, label);
    assert.ok(Number.isInteger(durationMs) && durationMs >= 0, label + ': durationMs');
  }
  assert.equal(fetchCalls, 0, 'fetch is never called');
  console.log('SSR import safe');
`], { label: 'SSR import' }).trim();
assert.equal(ssr, 'SSR import safe'); passed.push('Packed SSR import does not require WebAssembly or fetch assets');
passed.push('SSR: ./destination imports without WebAssembly, and its fetch transport answers transport_unsupported with the global or an injected fetch, which is never called');
// The Node resolver loads node:http, which on Node 22 compiles undici's WASM HTTP parser in the
// background after the import returns: it is imported in a server child of its own with
// WebAssembly intact, where fetch still throws.
const resolverSsr = runNode(['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  let fetchCalls = 0;
  globalThis.fetch = () => { fetchCalls += 1; throw Error('unexpected SSR fetch'); };
  const resolver = await import('@supernovae-st/qrcode-ai-scanner-wasm/destination-node');
  assert.deepEqual(Object.entries(resolver).map(([name, value]) => [name, typeof value]),
    [['createDestinationEndpoint', 'function'], ['createNodeTransport', 'function']]);
  assert.equal(fetchCalls, 0, 'fetch is never called');
  console.log('SSR resolver import safe');
`], { label: 'SSR import of ./destination-node' }).trim();
assert.equal(resolverSsr, 'SSR resolver import safe');
passed.push('SSR: ./destination-node imports in a server child with exactly createDestinationEndpoint and createNodeTransport, and fetch is never called');
// ./camera-overlay alone on a server, without WebAssembly: its import fetches nothing, and its
// runtime exports are exactly the values camera-overlay.d.ts declares, each a function where the
// declarations make it one.
const overlaySsr = JSON.parse(runNode(['--input-type=module', '-e', `
  globalThis.WebAssembly = undefined;
  let fetchCalls = 0;
  globalThis.fetch = () => { fetchCalls += 1; throw Error('unexpected SSR fetch'); };
  const overlay = await import('@supernovae-st/qrcode-ai-scanner-wasm/camera-overlay');
  const exports = Object.keys(overlay).sort().map(name => [name, typeof overlay[name] === 'function' ? 'function' : 'value']);
  console.log(JSON.stringify({ exports, fetchCalls }));
`], { label: 'SSR import of ./camera-overlay' }));
const overlayDeclaredValues = valueExports(require('typescript'), join(installed, 'camera-overlay.d.ts'));
assert.deepEqual(overlaySsr, { exports: overlayDeclaredValues, fetchCalls: 0 },
  'the server import of ./camera-overlay exports exactly the values camera-overlay.d.ts declares and fetches nothing');
receipt.overlay = { suite: null, ssr: { exports: overlaySsr.exports.map(([name]) => name) }, declarations: null,
  runtimes: {}, notRun: [], failures: [] };
passed.push(`SSR: ./camera-overlay imports in a server child without WebAssembly or a fetch call, and exports exactly the ${overlayDeclaredValues.length} values camera-overlay.d.ts declares (${overlayDeclaredValues.filter(([, kind]) => kind === 'function').length} functions)`);
// examples/ssr.mjs as a user runs it, from the installed package folder, where it imports the
// package by its own name. Its expected lines follow from the declared contracts: a check
// requests a link without its fragment, plain text is not_http, a verifier with no transport
// is unavailable (no_transport), the overlay's default label for an unchecked destination, the
// QR family, and a tracker created without onChange is an empty peek. The example traps the DOM,
// camera and network globals its TRAPPED list names, and its last line covers those only: the
// README section states their number, which must be the list's. A module preloaded here also
// counts every socket and DNS lookup the run makes, which the example cannot see.
phase('SSR example');
// examples/README.md as installed, read by section: the level-2 heading that starts with
// HEADING, up to the next level-2 heading; readmeBlocks returns its fenced blocks of one language.
const exampleReadme = readFileSync(join(installed, 'examples', 'README.md'), 'utf8').replace(/\r\n?/g, '\n');
const readmeSection = heading => {
  const lines = exampleReadme.split('\n');
  const start = lines.findIndex(line => line.startsWith(`## ${heading}`));
  assert.ok(start >= 0, `examples/README.md has a section "## ${heading}"`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return `${lines.slice(start, end < 0 ? undefined : end).join('\n')}\n`;
};
const readmeBlocks = (heading, language) => [...readmeSection(heading)
  .matchAll(new RegExp(`^\`\`\`${language}\\n([\\s\\S]*?)^\`\`\`$`, 'gm'))].map(match => match[1]);
const SSR_EXAMPLE_LINES = ['Imported ./camera, ./camera-overlay and ./destination.',
  "destinationCandidate('https://example.com/menu#top'): eligible true, request URL https://example.com/menu",
  "destinationCandidate('call me'): eligible false, reason not_http",
  'Verifier without a transport: canResolve false, resolve() unavailable (no_transport)',
  'Default destination label: Destination not checked', "symbologyFamily('qr_code'): matrix",
  'Detection tracker: 0 tracks, status peek', 'Trapped globals read: none'];
const ssrSource = readFileSync(join(installed, 'examples', 'ssr.mjs'), 'utf8');
const trappedList = /^const TRAPPED = \[([\s\S]*?)^\];$/m.exec(ssrSource.replace(/\r\n?/g, '\n'))?.[1] ?? '';
const trappedNames = [...trappedList.matchAll(/'([A-Za-z]+)'/g)].map(match => match[1]);
assert.ok(trappedNames.length > 0 && new Set(trappedNames).size === trappedNames.length,
  'examples/ssr.mjs lists its trapped globals in TRAPPED, each once');
// The section's prose, its line breaks read as spaces, gives that number twice.
const ssrProse = readmeSection('Server rendering').replace(/\s+/g, ' ');
assert.deepEqual([`replaces the ${trappedNames.length} DOM, camera and network globals it lists`,
  `covers the ${trappedNames.length} trapped globals only`].filter(text => !ssrProse.includes(text)), [],
`examples/README.md gives the number of globals examples/ssr.mjs traps (${trappedNames.length})`);
const ssrNetworkFile = join(consumer, 'ssr-example-network.json');
const SSR_NETWORK_WITNESS = `import net from 'node:net'; import dns from 'node:dns'; import { writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const seen = { sockets: 0, lookups: 0 };
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) { seen.sockets += 1; return connect.apply(this, args); };
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6']) {
  const original = dns[name]; dns[name] = (...args) => { seen.lookups += 1; return original(...args); };
}
syncBuiltinESMExports();
process.on('exit', () => writeFileSync(process.env.QRSCAN_SSR_NETWORK, JSON.stringify(seen)));`;
const ssrExampleOutput = runNode(['--import', `data:text/javascript,${encodeURIComponent(SSR_NETWORK_WITNESS)}`,
  join(installed, 'examples', 'ssr.mjs')], { cwd: installed, label: 'examples/ssr.mjs',
  env: { ...process.env, QRSCAN_SSR_NETWORK: ssrNetworkFile } });
const ssrExampleLines = ssrExampleOutput.split(/\r?\n/).filter(line => line !== '');
const ssrNetwork = JSON.parse(readFileSync(ssrNetworkFile, 'utf8'));
receipt.ssrExample = { lines: ssrExampleLines, network: ssrNetwork, trapped: trappedNames.length };
assert.deepEqual(ssrExampleLines, SSR_EXAMPLE_LINES, 'examples/ssr.mjs prints exactly the expected lines');
assert.deepEqual(ssrNetwork, { sockets: 0, lookups: 0 }, 'examples/ssr.mjs opens no socket and looks up no name');
assert.deepEqual(readmeBlocks('Server rendering', 'text'), [`${SSR_EXAMPLE_LINES.join('\n')}\n`],
  'examples/README.md shows exactly the lines examples/ssr.mjs prints');
passed.push(`examples/ssr.mjs, run with Node from the installed package folder, imports ./camera, ./camera-overlay and ./destination by name, prints exactly the expected lines its README section shows (none of the ${trappedNames.length} DOM, camera and network globals it traps was read; other globals are not trapped), and opens no socket and looks up no name`);
const cameraPackage = join(consumer, 'node_modules/@supernovae-st/qrcode-ai-scanner-wasm');
const cameraModule = { ...process.env, QRSCAN_CAMERA_MODULE: pathToFileURL(join(cameraPackage, 'camera.js')).href };
phase('camera suite');
runNode([join(root, 'crates/qrcode-ai-scanner-wasm/camera.test.mjs')], { env: cameraModule });
// The replay cases generate their scenes in memory and load their helpers next to the test,
// so they run from the consumer's directory against the installed camera.js.
phase('camera replay suite');
runNode([join(root, 'crates/qrcode-ai-scanner-wasm/camera-replay.test.mjs')], { env: cameraModule });
passed.push('Installed camera.js passes the replay instrument, association, determinism, smoothing-identity and default-gate cases');
phase('camera overlay suite');
// The slowest child: it renders every overlay case in real browsers (about 70 s on a busy laptop).
// It runs Chromium, plus Firefox and Playwright WebKit when QRSCAN_TEST_FIREFOX=1 and
// QRSCAN_TEST_WEBKIT=1 pass through: each case in the enabled engines it declares, with a
// diagnostic line for each declared engine it leaves out and for each check it does not run.
// The spec reporter is named because Node 22 prints TAP to a pipe by default. overlay-suite.mjs
// reads that output with the suite's source: where each case ran, and every exception (an
// enabled engine a case does not declare, a check not run), which goes to unverified.
const overlaySuiteFile = join(root, 'crates/qrcode-ai-scanner-wasm/camera-overlay.test.mjs');
const overlaySuite = runNode(['--test-reporter=spec', overlaySuiteFile], { timeout: 600_000,
  env: { ...process.env, QRSCAN_CAMERA_PACKAGE: cameraPackage, QRSCAN_PLAYWRIGHT_MODULE: pathToFileURL(require.resolve('playwright')).href } });
const overlayEngines = ['chromium', ...(process.env.QRSCAN_TEST_FIREFOX === '1' ? ['firefox'] : []),
  ...(process.env.QRSCAN_TEST_WEBKIT === '1' ? ['webkit'] : [])];
const { problems: overlaySuiteProblems, ...overlaySuiteRecord } = overlaySuiteReport({ ts: require('typescript'),
  file: overlaySuiteFile, text: readFileSync(overlaySuiteFile, 'utf8'), output: overlaySuite, enabled: overlayEngines });
receipt.overlay.suite = { ...overlaySuiteRecord, problems: overlaySuiteProblems };
assert.deepEqual({ engines: overlaySuiteRecord.engines, fail: overlaySuiteRecord.fail, printed: overlaySuiteRecord.printed,
  all: overlaySuiteRecord.pass === overlaySuiteRecord.tests && overlaySuiteRecord.tests > 0, problems: overlaySuiteProblems },
{ engines: overlayEngines, fail: 0, printed: overlaySuiteRecord.tests, all: true, problems: [] },
'the overlay suite ran cases in exactly the engines enabled and passed every case, and where each case ran is read from its source and agrees with the engines it printed as not enabled');
for (const { case: name, engine, reason } of overlaySuiteRecord.partial) {
  receipt.unverified.push(`The overlay suite's case "${name}"${engine ? ` in ${engine}` : ''}: ${reason}`);
}
passed.push(`Installed camera capture/tracking lifecycle and real-browser visual selection, geometry, payload safety and cleanup: the overlay suite passed ${overlaySuiteRecord.pass} cases, each in the enabled engines it declares (${overlayEngines.join(', ')} enabled)${overlaySuiteRecord.partial.length ? `; ${overlaySuiteRecord.partial.length} per-engine exceptions (an enabled engine a case does not declare, or a check it reports as not run) are listed under unverified` : ''}`);
// The destination suites against the installed files. The core and Node suites import the package
// folder's destination.js and destination-node.js; the browser suite links that folder into its
// own Vite page and drives this consumer's Vite and Playwright. This process's variables pass
// through: QRSCAN_TEST_FIREFOX, QRSCAN_NO_SIMD_BROWSER, QRSCAN_BROWSER_CHANNEL, and CI (set to
// true by CI runners). Under CI, a missing openssl fails the Node suite's TLS cases and a required
// browser case that could not run fails the browser suite. A host without IPv6 loopback (::1)
// skips the IPv6 cases, under CI too: the Node pass line names each skip, the browser pass line
// counts its cases not run, and the receipt lists both.
const destinationSuite = name => join(root, 'crates/qrcode-ai-scanner-wasm', name);
const destinationEnv = { ...process.env, QRSCAN_DESTINATION_PACKAGE: installed };
const lineOf = (output, prefix) => output.split(/\r?\n/).find(line => line.startsWith(prefix)) ?? null;
// A suite's pass line names its cases as one label range, from 1 to n: this returns n.
const labelCount = (line, letter) => Number(new RegExp(`\\b${letter}1\\.\\.${letter}(\\d+)\\b`).exec(line)?.[1] ?? NaN);
phase('destination core suite');
const coreOutput = runNode([destinationSuite('destination.test.mjs')], { env: destinationEnv });
const coreLine = lineOf(coreOutput, 'PASS destination core: ');
assert.ok(coreLine && Number.isInteger(labelCount(coreLine, 'D')), `the core suite names its passed labels:\n${coreOutput}`);
passed.push('Installed destination.js passes the core suite: eligibility, policy tables, the result guard, the verifier store, the selection binder and the transports');
phase('destination Node suite');
const nodeOutput = runNode([destinationSuite('destination-node.test.mjs')], { env: destinationEnv });
const nodeLine = lineOf(nodeOutput, 'PASS destination-node: ');
assert.ok(nodeLine && Number.isInteger(labelCount(nodeLine, 'N')), `the Node suite names its passed labels:\n${nodeOutput}`);
// The labels with a skipped part: openssl missing outside CI, or no ::1 on the host.
const nodeSkipLine = lineOf(nodeOutput, 'SKIP ')?.slice('SKIP '.length) ?? null;
const nodeSkipped = [...new Set([...(nodeSkipLine ?? '').matchAll(/(?:^|, )(N\d+)\b/g)].map(match => match[1]))];
passed.push(`Installed destination-node.js passes the Node suite on loopback fixtures${nodeSkipped.length ? ` (skipped: ${nodeSkipLine})` : ''}`);
const browserReportPath = join(consumer, 'destination-browser-report.json');
phase('destination browser suite');
runNode([destinationSuite('destination.browser.test.mjs'), browserReportPath], { env: { ...destinationEnv,
  QRSCAN_PLAYWRIGHT_MODULE: pathToFileURL(require.resolve('playwright')).href,
  QRSCAN_VITE_MODULE: pathToFileURL(require.resolve('vite')).href } });
const { cases: browserCases, ...browserReport } = JSON.parse(readFileSync(browserReportPath, 'utf8'));
// It tested the installed folder through its exports map, with the Node resolver and the packed
// scanner present, in exactly the runtimes this process asked for.
assert.deepEqual({ package: realpathSync(browserReport.package), resolution: browserReport.resolution,
  nodeResolver: browserReport.nodeResolver, packedScanner: browserReport.packedScanner,
  runtimes: browserReport.runtimes.map(runtime => runtime.name), failures: browserReport.failures },
{ package: realpathSync(installed), resolution: 'package exports', nodeResolver: true, packedScanner: true,
  runtimes: ['chromium', ...(process.env.QRSCAN_NO_SIMD_BROWSER ? ['chromium-simd-disabled'] : []),
    ...(process.env.QRSCAN_TEST_FIREFOX === '1' ? ['firefox'] : [])], failures: [] }, 'the browser suite ran on the installed package');
const browserMisses = new Set([...browserReport.failures, ...browserReport.differences].map(({ id, runtime }) => `${id} ${runtime}`));
const browserPassedByRuntime = {};
for (const { id, runtime } of browserCases) {
  if (!browserMisses.has(`${id} ${runtime}`)) browserPassedByRuntime[runtime] = (browserPassedByRuntime[runtime] ?? 0) + 1;
}
// Per runtime: a case that runtime records as a difference, instead of failing it, did not pass.
const browserDifferences = name => browserReport.differences.filter(({ runtime }) => runtime === name).length;
passed.push(`Installed destination modules in the browser suite: ${browserReport.runtimes.map(({ name, version }) =>
  `${name} ${version}: ${browserPassedByRuntime[name] ?? 0} passed, ${browserDifferences(name)} recorded differences`).join('; ')}` +
  `; ${browserReport.notRun.length} not run`);
const playwrightBrowsers = JSON.parse(readFileSync(join(dirname(require.resolve('playwright-core/package.json')), 'browsers.json'), 'utf8'))
  .browsers.filter(browser => ['chromium', 'firefox'].includes(browser.name)).map(({ name, revision, browserVersion }) => ({ name, revision, browserVersion }));
// The core and Node suites print their pass line once every labelled case ran without a failed
// assertion, and record no executed case: declaredLabels is the size of the range that line names.
const destinationSuites = {
  core: { declaredLabels: labelCount(coreLine, 'D'), skipped: 0, notRun: 0, line: coreLine },
  node: { declaredLabels: labelCount(nodeLine, 'N'), skipped: nodeSkipped.length, notRun: 0, line: nodeLine,
    skipLine: nodeSkipLine,
    // The openssl build that made the TLS fixtures' certificates, as the suite printed it.
    openssl: lineOf(nodeOutput, 'openssl: ')?.slice('openssl: '.length) ?? null },
  browser: { passed: Object.values(browserPassedByRuntime).reduce((sum, count) => sum + count, 0), skipped: 0,
    notRun: browserReport.notRun.length, passedByRuntime: browserPassedByRuntime, notRunCases: browserReport.notRun,
    differences: browserReport.differences, runtimes: browserReport.runtimes, playwrightBrowsers,
    resolution: browserReport.resolution,
    // The browser suite's per-runtime redirect-route record: the routes whose page and Node results
    // it asserts equal, and both results for the routes it only records.
    routes: browserReport.b9, guards: browserReport.guards },
};
receipt.destination = { suites: destinationSuites, negativeBrowserBuild: null };
phase('declarations');
const tsc = require.resolve('typescript/bin/tsc');
runNode([tsc, '--noEmit', '--strict', '--lib', 'ES2022,DOM',
  '--moduleResolution', 'bundler', '--module', 'ESNext', '--target', 'ES2022', 'typecheck.ts']);
passed.push('Installed root, auto and camera declarations typecheck, with the camera frame fields camera.d.ts requires');
passed.push('Installed destination.d.ts typechecks with the DOM: fetch, AbortSignal and Response fit its shapes, results narrow on outcome or state, a transport needs a label and a fetch transport a scope');
// Node's own resolution with the ES2022 library alone: no DOM types and no @types/node. The
// program's file list shows it: a declaration that references another library (the DOM, a
// worker) or a types package would load that file here and still compile.
const nodeProgram = runNode([tsc, '-p', 'tsconfig.destination-node.json', '--listFiles'])
  .split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
const nodeProgramNames = nodeProgram.map(file => basename(file));
assert.deepEqual({
  otherLibraries: nodeProgramNames.filter(name => name.startsWith('lib.')
    && !/^lib\.(?:es5|es20(?:1[5-9]|2[0-2])(?:\.[\w-]+)*|decorators(?:\.legacy)?)\.d\.ts$/.test(name)),
  typePackages: nodeProgram.filter(file => /[\\/]@types[\\/]/.test(file)),
  missing: ['destination.d.ts', 'destination-node.d.ts'].filter(name => !nodeProgramNames.includes(name)),
}, { otherLibraries: [], typePackages: [], missing: [] },
'the Node-side program holds both destination declarations, no library beyond ES2022 and no @types file');
passed.push('Both destination subpaths typecheck by package name under nodenext, and the program holds only the ES2022 libraries (no DOM, no worker, no @types package); the resolver file path is no export');
// Each name the two declaration files export is imported by its typecheck file, so every one
// compiles through the installed exports map (tsc refuses a name that no longer exists).
const ts = require('typescript');
const exportedNames = file => {
  const program = ts.createProgram([file], { noEmit: true, noLib: true, noResolve: true, types: [] });
  const checker = program.getTypeChecker();
  return checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(file))).map(symbol => symbol.name).sort();
};
const importedNames = (file, specifier) => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest).statements
  .filter(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === specifier)
  .flatMap(node => node.importClause?.namedBindings?.elements?.map(element => (element.propertyName ?? element.name).text) ?? []).sort();
for (const [declarations, typecheck] of [['destination.d.ts', 'typecheck.ts'], ['destination-node.d.ts', 'typecheck-destination-node.ts'],
  ['camera-overlay.d.ts', 'typecheck.ts']]) {
  assert.deepEqual(importedNames(join(consumer, typecheck), `${manifest.name}/${declarations.replace(/\.d\.ts$/, '')}`),
    exportedNames(join(installed, declarations)), `${typecheck} imports every name ${declarations} exports`);
}
passed.push('The typecheck files import every name destination.d.ts and destination-node.d.ts export');
// typecheck.ts uses each overlay name it imports (a reference the type checker resolves to the
// import, not a property name, object key or shadowing local of the same name), and its
// everyOverlayOption literal, typed with the installed CameraOverlayOptions, names every option
// at every depth it spells as an object: an option added to camera-overlay.d.ts without a call
// site here fails. tsc already refused any name that does not exist and the update([]) call
// (@ts-expect-error: update takes a snapshot). One program serves both checks.
const overlayTypecheck = join(consumer, 'typecheck.ts');
const overlayProgram = declarationProgram(ts, overlayTypecheck, { strict: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
const overlayCoverage = optionCoverage(ts, overlayProgram, overlayTypecheck, 'everyOverlayOption');
receipt.overlay.declarations = { imported: importedNames(overlayTypecheck, `${manifest.name}/camera-overlay`).length,
  unusedImports: unusedImports(ts, overlayProgram, overlayTypecheck, `${manifest.name}/camera-overlay`),
  options: { type: overlayCoverage.type, named: overlayCoverage.named.length, unnamed: overlayCoverage.unnamed } };
// TypeScript names a file it reached through node_modules by its real path, which on Windows is
// the long form fs.realpathSync.native gives, while the consumer folder keeps the 8.3 short form
// fs.realpathSync left in it: both sides of the file comparison take the native form.
assert.deepEqual({ unusedImports: receipt.overlay.declarations.unusedImports, type: overlayCoverage.type,
  file: overlayCoverage.declaredIn && realpathSync.native(overlayCoverage.declaredIn), unnamed: overlayCoverage.unnamed,
  arrayRefused: /^ *\/\/ @ts-expect-error[^\n]*\n *configured\.update\(\[\]\);$/m
    .test(readFileSync(overlayTypecheck, 'utf8').replace(/\r\n?/g, '\n')) },
{ unusedImports: [], type: 'CameraOverlayOptions', file: realpathSync.native(join(installed, 'camera-overlay.d.ts')),
  unnamed: [], arrayRefused: true },
'typecheck.ts uses every overlay export and names every option of the installed CameraOverlayOptions');
passed.push(`typecheck.ts imports and uses all ${receipt.overlay.declarations.imported} names camera-overlay.d.ts exports, names all ${overlayCoverage.named.length} options and nested options of the installed CameraOverlayOptions, and an update([]) call fails to compile`);
phase('Vite build and preview of the consumer');
// The same build also compiles the bundler forms examples/README.md shows, as written in the
// installed README: its page module, and the worker that module names, which is the shipped
// examples/scanner.worker.js with its one import of '../auto.js' replaced by the README's import.
// A recorder in the page's and the worker's plugins notes where each package name of those two
// files resolves. Rollup reports an imported name that the module does not export as a warning
// (MISSING_EXPORT) and builds on, the binding left undefined: the build keeps each such warning,
// in the page or the worker bundle, and none may occur.
const bundlerBlocks = readmeBlocks('Use a bundler', 'js');
assert.equal(bundlerBlocks.length, 2, 'examples/README.md shows two bundler blocks: the page module and the worker import');
const formsDir = join(consumer, 'readme-forms');
mkdirSync(formsDir);
writeFileSync(join(formsDir, 'app.js'), bundlerBlocks[0]);
const shippedWorker = readFileSync(join(installed, 'examples', 'scanner.worker.js'), 'utf8').replace(/\r\n?/g, '\n');
const relativeAuto = /^import \{[^}]*\} from '\.\.\/auto\.js';\n/gm;
assert.equal(shippedWorker.match(relativeAuto)?.length, 1, 'examples/scanner.worker.js imports ../auto.js in one statement');
writeFileSync(join(formsDir, 'scanner.worker.js'), shippedWorker.replace(relativeAuto, bundlerBlocks[1]));
const FORM_TARGETS = { [manifest.name]: 'qrcode-ai-scanner.js', [`${manifest.name}/camera`]: 'camera.js',
  [`${manifest.name}/camera-overlay`]: 'camera-overlay.js', [`${manifest.name}/destination`]: 'destination.js',
  [`${manifest.name}/auto`]: 'auto.js' };
const formResolutions = new Map();
const recordForms = () => ({ name: 'record-readme-forms', enforce: 'pre',
  async resolveId(source, importer, options) {
    const [file, folder] = (importer ?? '').split('?')[0].split(/[\\/]/).reverse();
    if (folder !== 'readme-forms' || !Object.hasOwn(FORM_TARGETS, source)) return null;
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    const id = resolved?.id.split('?')[0] ?? null;
    const target = join(installed, FORM_TARGETS[source]);
    formResolutions.set(`${file} ${source}`,
      id !== null && existsSync(id) && realpathSync.native(id) === realpathSync.native(target) ? FORM_TARGETS[source] : id);
    return resolved;
  } });
// Vite passes the worker bundle's warnings to build.rollupOptions.onwarn too.
const missingExports = [];
const onwarn = (warning, warn) => (warning.code === 'MISSING_EXPORT' ? missingExports.push(warning.message) : warn(warning));
const built = await vite.build({ root: consumer, logLevel: 'warn', plugins: [recordForms()],
  build: { assetsInlineLimit: 0, target: 'es2020',
    rollupOptions: { input: { index: join(consumer, 'index.html'), readme: join(formsDir, 'app.js') }, onwarn } },
  worker: { format: 'es', plugins: () => [recordForms()] } });
assert.deepEqual(missingExports, [], 'every name the README forms import is exported by the package module it names');
const builtFiles = [built].flat().flatMap(result => result.output ?? []);
const builtText = file => (file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : '');
const readmeChunk = builtFiles.find(file => file.type === 'chunk' && file.isEntry && file.name === 'readme');
const readmeWorker = builtFiles.filter(file => /(?:^|\/)scanner\.worker-[\w-]+\.js$/.test(file.fileName));
const builtWasm = builtFiles.filter(file => file.fileName.endsWith('.wasm'));
receipt.bundlerForms = { resolved: Object.fromEntries([...formResolutions].sort()), entry: readmeChunk?.fileName ?? null,
  worker: readmeWorker.map(file => file.fileName), wasm: builtWasm.map(file => ({ file: file.fileName, sha256: sha(file.source) })) };
assert.deepEqual(receipt.bundlerForms.resolved, {
  [`app.js ${manifest.name}`]: 'qrcode-ai-scanner.js', [`app.js ${manifest.name}/camera`]: 'camera.js',
  [`app.js ${manifest.name}/camera-overlay`]: 'camera-overlay.js', [`app.js ${manifest.name}/destination`]: 'destination.js',
  [`scanner.worker.js ${manifest.name}/auto`]: 'auto.js' }, 'each package name of the README forms resolves to the installed file');
assert.equal(readmeWorker.length, 1, 'the build emits the README worker as a module of its own');
assert.ok(readmeChunk && builtText(readmeChunk).includes(basename(readmeWorker[0].fileName)),
  'the README page module starts the emitted worker');
const wasmNames = builtWasm.map(file => basename(file.fileName));
assert.deepEqual({ sha256: [...new Set(receipt.bundlerForms.wasm.map(file => file.sha256))],
  namedByWorker: wasmNames.some(name => builtText(readmeWorker[0]).includes(name)
    || builtFiles.some(file => builtText(readmeWorker[0]).includes(basename(file.fileName)) && builtText(file).includes(name))) },
{ sha256: [installedWasmSha256], namedByWorker: true }, 'the README worker reaches the emitted .wasm, the installed bytes');
passed.push('The consumer\'s Vite build compiles the README bundler forms as written: the package root, ./camera, ./camera-overlay and ./destination from the page module and ./auto from the worker resolve to the installed files, which export every name imported, the worker is emitted as a module of its own, and the .wasm it reaches is the installed one');
const server = await vite.preview({ root: consumer, logLevel: 'warn', preview: { host: '127.0.0.1', port: 0 } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
// A browser build cannot reach the Node resolver: ./destination-node has a node condition only, so
// Vite stops at export resolution, before it loads the resolver file or any node: module. It runs
// after the consumer's build, the first Vite build of this process. On Windows, Vite resolves
// paths with fs.realpathSync until a background probe returns, then with fs.realpathSync.native,
// which expands an 8.3 short temp folder name: a later build whose root keeps the short name while
// its HTML entry gets the long one emits that entry under a relative name, which Rollup refuses.
phase('browser build of ./destination-node');
const negativeRoot = realpathSync(mkdtempSync(join(consumer, 'destination-node-browser-')));
writeFileSync(join(negativeRoot, 'entry.js'), `import { createNodeTransport } from '${manifest.name}/destination-node';\nconsole.log(createNodeTransport);\n`);
const touched = [];
const negative = await vite.build({ root: negativeRoot, configFile: false, logLevel: 'silent', publicDir: false,
  plugins: [{ name: 'record-node-modules', enforce: 'pre',
    resolveId(source) { if (source.startsWith('node:')) touched.push(source); return null; },
    load(id) { if (/destination-node\.js$/.test(id)) touched.push(basename(id)); return null; } }],
  build: { write: false, target: 'es2020', rollupOptions: { input: join(negativeRoot, 'entry.js') } },
}).then(() => null, error => error);
rmSync(negativeRoot, { recursive: true, force: true });
const exportRefusal = `No known conditions for "./destination-node" specifier in "${manifest.name}" package`;
assert.deepEqual({ failed: negative !== null, refusal: negative?.message.includes(exportRefusal) ? exportRefusal : negative?.message ?? null, touched },
  { failed: true, refusal: exportRefusal, touched: [] }, 'a browser build of ./destination-node fails at export resolution');
receipt.destination.negativeBrowserBuild = negative.message.split('\n')[0];
passed.push('A browser build importing ./destination-node fails at export resolution, before the resolver file or any node: module loads');
const runtimes = [{ name: 'chromium', browserType: chromium, disabled: false,
  options: process.env.QRSCAN_BROWSER_CHANNEL ? { channel: process.env.QRSCAN_BROWSER_CHANNEL } : {} }];
if (process.env.QRSCAN_NO_SIMD_BROWSER) runtimes.push({ name: 'chromium-simd-disabled', options: {
  executablePath: process.env.QRSCAN_NO_SIMD_BROWSER, args: ['--js-flags=--noexperimental-wasm-simd'] }, browserType: chromium, disabled: true });
if (process.env.QRSCAN_TEST_FIREFOX === '1') {
  runtimes.push({name: 'firefox', browserType: firefox, disabled: false, options: {}});
}
// Camera witnesses run the installed camera.js, a module worker and the one portable module
// together. Their code is the clean version-5 control of the consumer truth set (hash checked):
// its content and quad come from the composition layout, never from a scan.
const control = loadTruth().cases.find(testCase => testCase.id === 'qr-v5q-control');
const controlBytes = [...caseBytes(control)];
const controlContent = wireContent(control.contents[0]);
const controlQuad = control.contents[0].occurrences[0].near.map(([x, y]) => ({ x, y }));
receipt.cameraControl = { id: control.id, file: control.file, sha256: control.sha256 };
const openCameraPage = async browser => {
  // A fresh context: an empty HTTP cache, so the first .wasm fetch of the page is cold.
  const context = await browser.newContext();
  const page = await context.newPage();
  const seen = { requests: [], served: [], errors: [] };
  page.on('request', request => { if (/\.wasm(?:\?|$)/.test(request.url())) seen.requests.push(request.url()); });
  page.on('response', response => { if (/\.wasm(?:\?|$)/.test(response.url()) && response.ok())
    seen.served.push(response.body().then(body => sha(body))); });
  page.on('pageerror', error => seen.errors.push(error.message));
  await page.goto(base); await page.waitForFunction(() => !!window.harness);
  return { context, page, seen };
};
// Every point within tolerance of its expected vertex, in vertex order.
const assertNear = (points, expected, tolerance, label) => {
  assert.equal(points.length, expected.length, `${label}: vertex count`);
  points.forEach((point, index) => assert.ok(Math.hypot(point.x - expected[index].x, point.y - expected[index].y) <= tolerance,
    `${label}: vertex ${index} at ${JSON.stringify(point)}, expected ${JSON.stringify(expected[index])} within ${tolerance} px`));
};
// A frame's times are on the page's performance.now() clock, as camera.d.ts states: observed
// after the camera started (with 100 ms of slack, as a frame callback's timestamp may precede
// its own request by a frame), completed after its observation and its decode start, and
// completed before onResult received it. A frame stamped on another clock or in another unit
// (media seconds, wall time) fails here whatever the tracker windows.
const assertFrameClock = (result, startedAt, label) => {
  const { observedAt, decodeStartedAt, completedAt } = result.frame;
  assert.ok(observedAt >= startedAt - 100 && observedAt <= completedAt && decodeStartedAt <= completedAt &&
    completedAt <= result.at, `${label}: frame times on the page clock (camera started at ${startedAt}, observed ` +
    `${observedAt}, decode started ${decodeStartedAt}, completed ${completedAt}, delivered ${result.at})`);
};
// A camera result the controller delivered: the worker's scan_frame answered it with the
// frame profile (which publishes no score), and the tracker holds one quad track of the
// control's exact content. A frame that completes long after its observation loses its
// geometry, so the message names that delay: a slow runner reads differently from a regression.
const assertControlFrame = (result, label) => {
  assert.deepEqual(result.origin && [result.origin.method, result.origin.profile], ['scan_frame', 'frame'],
    `${label}: the report comes from scan_frame with the frame profile`);
  assert.equal(result.score, null, `${label}: the frame profile publishes no score`);
  assert.equal(result.budgetExhausted, false, `${label}: the unbounded frame scan is final`);
  assert.deepEqual(result.detections.map(detection => detection.content), [controlContent], `${label}: exact content`);
  assert.equal(result.snapshot.tracks.length, 1, `${label}: one track`);
  const [track] = result.snapshot.tracks;
  assert.deepEqual([track.state, track.basis, track.geometry?.kind, track.content], ['tracked', 'spatial', 'quad', controlContent],
    `${label}: one tracked quad track of the exact content ` +
    `(${Math.round(result.frame.completedAt - result.frame.observedAt)} ms from observation to result)`);
};
// Recorded, never asserted: one cold run on this runner. With its default windows, the tracker
// keeps a frame's geometry when the frame completes within 1200 ms of its observation (staleMs)
// and one identity while observations come within 2000 ms (reacquireMs); the witnesses widen
// both past their 8000 ms decode timeout. The slowest frame and the largest gap show the margin
// this runner leaves an application that keeps the defaults.
const lifecycleMeasurements = shared => {
  const resource = shared.stats.resources[0] ?? null;
  const largest = values => (values.length ? Math.max(...values) : null);
  const frames = shared.results.map(result => result.frame);
  return {
    wasmTransfer: resource && { durationMs: resource.duration, transferSize: resource.transferSize,
      encodedBodySize: resource.encodedBodySize, decodedBodySize: resource.decodedBodySize },
    compileMs: shared.stats.wasm.compile[0]?.ms ?? null,
    instantiateMs: shared.stats.wasm.instantiate[0]?.ms ?? null,
    firstScanImage: { roundTripMsIncludingLoad: shared.image.roundTripMs, scanCallMs: shared.image.callMs },
    firstCameraFrame: { sinceStartMs: shared.firstResultMs, scanFrameCallMs: shared.results[0]?.origin?.callMs ?? null },
    cameraFrames: { frames: frames.length,
      slowestScanFrameCallMs: largest(shared.results.map(result => result.origin?.callMs).filter(Number.isFinite)),
      slowestObservationToResultMs: largest(frames.map(frame => frame.completedAt - frame.observedAt)),
      largestObservationGapMs: largest(frames.slice(1).map((frame, index) => frame.observedAt - frames[index].observedAt)),
      largestResultGapMs: largest(shared.results.slice(1).map((result, index) => result.at - shared.results[index].at)) },
  };
};
// One engine for many frames, and one module shared by image and camera, from a cold start.
// The worker counts every WebAssembly instantiation; the page counts them across workers.
const lifecycleWitness = async (browser, name) => {
  const { context, page, seen } = await openCameraPage(browser);
  try {
    const frames = 20;
    const shared = await page.evaluate(options => window.harness.camera.lifecycleStart(options),
      { imageBytes: controlBytes, sceneBytes: controlBytes, width: 640, height: 360, x: 140, y: 0, frames });
    // Before any check, so that a failed run keeps them.
    measurements[name] = lifecycleMeasurements(shared);
    assert.deepEqual([shared.image.method, shared.image.contents], ['scan_image', [controlContent]], `${name}: image scan`);
    assert.equal(seen.requests.length, 1, `${name}: one .wasm request serves the image scan and the camera`);
    const sharedRequests = seen.requests.length;
    // One worker and one decoder lifecycle, never recovered: the instance of the cold load
    // serves the image scan and every camera frame.
    const workers = [...new Set(shared.results.map(result => result.origin?.worker))];
    assert.deepEqual({ pageInstantiations: shared.instantiations, workerInstantiations: shared.stats.instantiations,
      timedInstantiations: shared.stats.wasm.instantiate.length, lifecycles: shared.lifecycles, frames: shared.results.length,
      workers: workers.length, generations: [...new Set(shared.results.map(result => result.frame.decoderGeneration))] },
    { pageInstantiations: 1, workerInstantiations: 1, timedInstantiations: 1, lifecycles: 1, frames, workers: 1, generations: [0] },
    `${name}: one worker and one instantiation for the image scan and ${frames} camera frames`);
    shared.results.forEach((result, index) => {
      assertFrameClock(result, shared.startedAt, `${name} frame ${index + 1}`);
      assertControlFrame(result, `${name} frame ${index + 1}`);
    });
    const [firstWorker] = workers;
    const trackIds = [...new Set(shared.results.map(result => result.snapshot.tracks[0].id))];
    const { largestObservationGapMs: gap, slowestObservationToResultMs: slowest } = measurements[name].cameraFrames;
    assert.equal(trackIds.length, 1, `${name}: one track id (ids ${trackIds.join(', ')}; largest gap between ` +
      `observations ${Math.round(gap)} ms, slowest frame ${Math.round(slowest)} ms from observation to result)`);
    assert.deepEqual(shared.errors, [], `${name}: camera errors`);
    // recover replaces the hung worker: that new decoder lifecycle instantiates once more, and
    // is counted only here, never by the shared-lifecycle check above.
    const recovered = await page.evaluate(options => window.harness.camera.lifecycleRecover(options), { frames: 3 });
    assert.deepEqual([recovered.instantiations, recovered.lifecycles], [2, 2], `${name}: one more instantiation after one recover`);
    recovered.results.forEach((result, index) => {
      assertFrameClock(result, shared.startedAt, `${name} recovered frame ${index + 1}`);
      assertControlFrame(result, `${name} recovered frame ${index + 1}`);
    });
    assert.ok(recovered.results.every(result => result.origin.worker !== firstWorker && result.frame.decoderGeneration === 1),
      `${name}: frames after recovery come from the replacement worker`);
    const recovering = recovered.states.findIndex(change => change.state === 'recovering');
    assert.deepEqual(recovered.states.slice(recovering, recovering + 2).map(({ state, reason, error }) => [state, reason, error]),
      [['recovering', 'recover', 'decode_timeout'], ['running', 'recovered', null]], `${name}: the hang went through recover`);
    assert.deepEqual(recovered.errors, [], `${name}: a recovered hang reports no session error`);
    assert.deepEqual(seen.errors, [], `${name}: page errors`);
    const servedSha256 = [...new Set(await Promise.all(seen.served))];
    assert.deepEqual(servedSha256, [installedWasmSha256], `${name}: every served WASM is the build-info module`);
    passed.push(`${name}: one .wasm request and one instantiation shared by scan_image and ${frames} camera frames from a cold context; the served module is the build-info one`);
    passed.push(`${name}: every camera report comes from scan_frame with the frame profile, the tracker holds one quad track of the exact control content, and only the recover after a hang instantiates again`);
    // The replacement worker of the recover fetches the module for its own lifecycle.
    return { source: shared.results[0].frame.source,
      wasmRequests: { sharedLifecycle: sharedRequests, includingRecoveredLifecycle: seen.requests.length }, servedSha256 };
  } finally { await context.close(); }
};
// RGBA from the capture canvas to the worker: bytes, orientation, coordinates, the length and
// dimension errors, and the life of the transferred buffer.
const rgbaWitness = async (browser, name) => {
  const { context, page, seen } = await openCameraPage(browser);
  try {
    // Channel order and orientation: a grey 640x360 frame with two marked corners. Row-major
    // RGBA puts pixel (x, y) at offset (y * 640 + x) * 4; a flip or a swapped channel moves them.
    const exact = await page.evaluate(options => window.harness.camera.exactBytes(options), { width: 640, height: 360,
      background: 'rgb(128, 128, 128)', probe: [0, (359 * 640 + 639) * 4],
      pixels: [{ x: 0, y: 0, rgba: [10, 20, 30, 255] }, { x: 639, y: 359, rgba: [200, 100, 50, 255] }] });
    assert.deepEqual([exact.frame.width, exact.frame.height, exact.received.byteLength], [640, 360, 640 * 360 * 4],
      `${name}: the canvas source arrives whole`);
    assert.deepEqual(exact.received.probes, [[10, 20, 30, 255], [200, 100, 50, 255]], `${name}: exact corner bytes in the worker`);
    // Coordinates: the control drawn 1:1 at (400, 200) in a 1280x720 video, scanned at 640x360.
    const offset = { x: 400, y: 200 };
    const expected = controlQuad.map(point => ({ x: point.x + offset.x, y: point.y + offset.y }));
    const mapped = await page.evaluate(options => window.harness.camera.mapping(options),
      { sceneBytes: controlBytes, width: 1280, height: 720, ...offset, maxDimension: 640, frames: 3 });
    for (const [index, result] of mapped.results.entries()) {
      const { frame, detections, snapshot } = result;
      const label = `${name} mapped frame ${index + 1}`;
      assertFrameClock(result, mapped.startedAt, label);
      assert.deepEqual([frame.width, frame.height, frame.videoWidth, frame.videoHeight], [640, 360, 1280, 720],
        `${label}: frame and video size`);
      assert.deepEqual(detections.map(detection => detection.content), [controlContent], `${label}: exact content`);
      const [occurrence] = detections[0].occurrences;
      assert.equal(occurrence.kind, 'quad', `${label}: quad occurrence`);
      assertNear(occurrence.points.map(point => ({ x: point.x / frame.width * frame.videoWidth,
        y: point.y / frame.height * frame.videoHeight })), expected, 2, `${label} occurrence`);
      assert.ok(snapshot.tracks[0]?.geometry, `${label}: the tracker publishes geometry ` +
        `(${Math.round(frame.completedAt - frame.observedAt)} ms from observation to result)`);
      assertNear(snapshot.tracks[0].geometry.measured.map(point => ({ x: point.x * frame.videoWidth,
        y: point.y * frame.videoHeight })), expected, 2, `${label} tracker`);
    }
    const errors = await page.evaluate(options => window.harness.camera.frameErrors(options), { width: 640, height: 360 });
    assert.deepEqual([errors.exact.ok, errors.exact.detections], [true, 0], `${name}: an exact-length blank frame scans`);
    assert.deepEqual([errors.short.ok, errors.short.phase], [false, 'scan'], `${name}: a buffer one byte short is refused`);
    assert.match(errors.short.message, /\[QRS-004\]/, `${name}: one byte short`);
    assert.deepEqual([errors.zeroWidth.ok, errors.zeroWidth.phase], [false, 'scan'], `${name}: a zero width is refused`);
    assert.match(errors.zeroWidth.message, /\[QRS-001\]/, `${name}: zero width`);
    const moved = await page.evaluate(options => window.harness.camera.transfer(options),
      { sceneBytes: controlBytes, width: 640, height: 360, x: 140, y: 0, frames: 5 });
    // On the frame-callback path every captured frame goes to the decoder: one copy each.
    assert.equal(moved.source, 'video-frame-callback', `${name}: the captured video drives the frame callback`);
    assert.equal(moved.canvases, 1, `${name}: one capture canvas`);
    assert.equal(moved.copies.length, moved.handed.length, `${name}: one getImageData per frame handed to scanFrame`);
    moved.handed.forEach((handed, index) => assert.deepEqual(handed, { identical: true, copiesBefore: index + 1,
      byteLengthBefore: 640 * 360 * 4, byteLengthAfter: 0, bufferByteLengthAfter: 0 }, `${name} handed frame ${index + 1}`));
    moved.copies.forEach((copy, index) => assert.deepEqual(copy, { byteLength: 640 * 360 * 4, transferred: true,
      readsBefore: 0, readsAfter: 0 }, `${name} copy ${index + 1}: handed over unread, never read after the transfer`));
    assert.deepEqual([exact.errors, mapped.errors, moved.errors, seen.errors], [[], [], [], []], `${name}: errors`);
    passed.push(`${name}: the worker receives the capture canvas's exact RGBA bytes in row-major order, and occurrences map back to a 1280x720 source within 2 px under maxDimension 640`);
    passed.push(`${name}: scan_frame refuses a buffer one byte short [QRS-004] and a zero width [QRS-001]; a blank exact-length frame scans`);
    passed.push(`${name}: one capture canvas and one getImageData copy per frame, handed to scanFrame uncopied, detached by the transfer and never read again`);
    return { exactBytesSource: exact.frame.source, mappingSource: mapped.results[0].frame.source, transferSource: moved.source };
  } finally { await context.close(); }
};
// The examples the package ships under examples/: the image and camera pages with their scripts
// and the module worker they share, which import the package's own files by relative path, the
// server-rendering script and the README. The installed folder holds the crate's files (line
// endings aside: a Windows checkout may convert them).
phase('example files');
const EXAMPLE_FILES = ['README.md', 'camera.html', 'camera.js', 'headless.html', 'headless.js', 'scanner.worker.js',
  'ssr.mjs'];
const exampleDir = join(installed, 'examples');
assert.deepEqual(existsSync(exampleDir) ? listFiles(exampleDir).sort() : [], EXAMPLE_FILES,
  'the installed package carries exactly the examples');
const withLf = bytes => bytes.toString('utf8').replace(/\r\n/g, '\n');
for (const file of EXAMPLE_FILES) {
  assert.equal(withLf(readFileSync(join(exampleDir, file))),
    withLf(readFileSync(join(root, 'crates/qrcode-ai-scanner-wasm/examples', file))), `examples/${file} is the crate's file`);
}
passed.push(`Installed package carries examples/ (${EXAMPLE_FILES.join(', ')}), each the crate's file`);
// A plain static server over the installed folder on loopback, as a user would start one: no
// bundler and no rewrite, the types a static server sends, nosniff so that a wrong type fails.
// It logs every request it answers. OVERRIDES maps a path to the text served in place of the
// file (the stand-in worker below), with the type of its extension, or to null, answered 404 as
// a missing file; it is read at each request, so a witness can change it while a page runs.
// With CSP (cspState below), it sends CSP.header as the Content-Security-Policy of every file,
// and takes the violation reports browsers post to /csp-report/N, which it does not log.
const STATIC_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm', '.md': 'text/markdown; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8' };
const serveStatic = (folder, overrides = {}, csp = null) => new Promise((resolveServer, rejectServer) => {
  const log = [];
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://127.0.0.1');
    if (csp !== null && request.method === 'POST' && /^\/csp-report\/\d+$/.test(pathname)) {
      const chunks = [];
      request.on('data', chunk => chunks.push(chunk));
      request.on('end', () => {
        csp.receive(Number(pathname.slice('/csp-report/'.length)), Buffer.concat(chunks).toString('utf8'));
        response.writeHead(204); response.end();
      });
      return;
    }
    let file = null;
    try { file = join(folder, ...decodeURIComponent(pathname).split('/').filter(Boolean)); } catch { file = null; }
    const inside = file !== null && !relative(folder, file).startsWith('..') && !isAbsolute(relative(folder, file));
    let status = 404, type = 'text/plain; charset=utf-8', body = 'Not found';
    if (request.method !== 'GET' && request.method !== 'HEAD') { status = 405; body = 'Method not allowed'; }
    else if (Object.hasOwn(overrides, pathname)) {
      if (overrides[pathname] !== null) {
        status = 200; type = STATIC_TYPES[extname(pathname)] ?? 'application/octet-stream'; body = overrides[pathname];
      }
    } else if (inside && existsSync(file) && statSync(file).isFile()) {
      status = 200; type = STATIC_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'; body = readFileSync(file);
    }
    log.push({ method: request.method, path: pathname, status, type });
    response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      ...(csp?.header ? { 'content-security-policy': csp.header } : {}) });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
  server.on('error', rejectServer);
  server.listen(0, '127.0.0.1', () => resolveServer({ server, log, csp, origin: `http://127.0.0.1:${server.address().port}` }));
});
// The policy a CSP site sends and the reports it received. Each policy put in use gets a report
// path of its own (report-uri /csp-report/N), so a report counts for the policy that caused it,
// however late it arrives. A report keeps its directive's name (effective-directive, or the
// first word of violated-directive), its blocked URI and its document.
const cspState = () => {
  const state = { header: null, serial: 0, reports: [], waiting: new Map() };
  state.use = policy => {
    state.serial += 1;
    state.header = `${policy}; report-uri /csp-report/${state.serial}`;
    return state.serial;
  };
  state.receive = (serial, body) => {
    let report = null;
    try { report = JSON.parse(body)['csp-report'] ?? null; } catch { report = null; }
    const directive = report?.['effective-directive'] || report?.['violated-directive']?.split(' ')[0] || null;
    const entry = { serial, directive, blocked: report?.['blocked-uri'] ?? null, document: report?.['document-uri'] ?? null };
    state.reports.push(entry);
    for (const notify of state.waiting.get(serial) ?? []) notify(entry);
    state.waiting.delete(serial);
  };
  state.of = serial => state.reports.filter(entry => entry.serial === serial);
  // Resolves with the first report of policy SERIAL, at once when one already arrived.
  state.first = serial => new Promise(resolveFirst => {
    const [entry] = state.of(serial);
    if (entry) resolveFirst(entry);
    else state.waiting.set(serial, [...(state.waiting.get(serial) ?? []), resolveFirst]);
  });
  return state;
};
const shownReport = entry => `${entry.directive} ${entry.blocked}`;
// Expected rows come from the shared truth set (fixture hashes checked): symbology, text,
// charset and occurrence count. An http(s) prefix makes a url payload and other plain text a
// text payload (spec/05-payloads.md); none of these contents matches another rule.
const payloadKind = text => /^https?:\/\//i.test(text) ? 'url' : 'text';
const truthCases = loadTruth().cases;
const exampleCases = Object.fromEntries(['qr-and-code128', 'code128', 'code93-without-checks', 'qr-v5q-control'].map(id => {
  const testCase = truthCases.find(entry => entry.id === id);
  return [id, { file: basename(testCase.file), bytes: caseBytes(testCase), rows: testCase.contents.map(content => ({
    symbology: content.symbology, kind: payloadKind(content.text), occurrences: String(content.occurrences.length),
    charset: content.charset, value: content.text })) }];
}));
// What the page shows, read from its DOM: the result region's state, its text and each row.
const exampleView = page => page.evaluate(() => {
  const result = document.getElementById('result');
  const text = (node, selector) => node.querySelector(selector)?.textContent ?? null;
  return { state: result.dataset.state, scan: Number(result.dataset.scan), error: result.dataset.error ?? null,
    code: result.dataset.code ?? null, complete: result.dataset.complete ?? null, summary: text(document, '#summary'),
    rows: [...document.querySelectorAll('#detections > li')].map(item => ({ symbology: text(item, '.symbology'),
      kind: text(item, '.payload-kind'), occurrences: text(item, '.occurrences'), charset: text(item, '.charset'),
      value: text(item, '.value') })),
    links: document.querySelectorAll('a, area').length, retry: !document.getElementById('retry').hidden,
    packageName: text(document, '#package-name'), packageVersion: text(document, '#package-version'),
    wasmSha256: text(document, '#wasm-sha256'), engineVersion: text(document, '#engine-version') };
});
// The live regions, by id, and whether the list of codes sits inside one: only the summary is
// announced, so a result never reads every row and its whole value out at once.
const exampleLiveRegions = page => page.evaluate(() => ({
  live: [...document.querySelectorAll('[role="status"], [role="alert"], [role="log"], [aria-live]')]
    .map(node => node.id || node.tagName),
  listAnnounced: document.getElementById('detections')
    .closest('[role="status"], [role="alert"], [role="log"], [aria-live]') !== null }));
// The view once scan SERIAL has settled: a result, a valid empty result or an error. A scan that
// never settles (a page that reloaded and lost it, a hung worker) fails with what the page shows.
const settledView = async (page, serial) => {
  await page.waitForFunction(serial => { const result = document.getElementById('result');
    return Number(result.dataset.scan) === serial && !['starting', 'loading', 'scanning'].includes(result.dataset.state); },
  serial, { timeout: 120_000 }).catch(async error => {
    const shown = await exampleView(page).then(({ state, scan, summary }) => ({ state, scan, summary }), () => null);
    assert.fail(`scan ${serial} never settled (${error.message.split('\n')[0]}); the page shows ${JSON.stringify(shown)}`);
  });
  return exampleView(page);
};
// The page script leaves the static starting message at once, and a script that never runs (a
// .js file sent with another type than JavaScript, an import that fails) never does: that fails
// here, before the wait for the scanner to load or fail. The caller then asserts the exact state.
const exampleSettledLoad = async (page, name) => {
  await page.waitForFunction(() => document.getElementById('result').dataset.state !== 'starting', null,
    { timeout: 30_000 }).catch(error => assert.fail(`${name}: the example's page script did not run (${error.message.split('\n')[0]})`));
  await page.waitForFunction(() => !['starting', 'loading'].includes(document.getElementById('result').dataset.state), null,
    { timeout: 120_000 }).catch(error => assert.fail(`${name}: the scanner neither loaded nor failed (${error.message.split('\n')[0]})`));
  // package.json and build-info.json are read beside the worker's load: wait for them too.
  await page.waitForFunction(() => ['package-name', 'package-version', 'wasm-sha256']
    .every(id => document.getElementById(id).textContent !== 'not read yet'), null, { timeout: 30_000 })
    .catch(error => assert.fail(`${name}: the example never read package.json and build-info.json (${error.message.split('\n')[0]})`));
};
const sortRows = rows => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
// Exactly the truth's codes, as text, from a complete scan with this profile, and no link anywhere.
const assertExampleRows = (view, sample, profile, label) => {
  const count = sample.rows.length === 1 ? '1 code' : `${sample.rows.length} codes`;
  assert.deepEqual({ state: view.state, error: view.error, complete: view.complete, links: view.links,
    rows: sortRows(view.rows), summary: view.summary },
  { state: 'result', error: null, complete: 'true', links: 0, rows: sortRows(sample.rows),
    summary: `${count} found in ${sample.file} with the ${profile} profile. The scan finished and lists every code it read.` },
  label);
};
const pickFile = async (page, sample, serial) => {
  await page.setInputFiles('#file', { name: sample.file, mimeType: 'image/png', buffer: sample.bytes });
  return settledView(page, serial);
};
const wasmPath = '/qrcode-ai-scanner_bg.wasm';
// Each file the page needs, served once with a static server's type, and nothing else.
const EXAMPLE_LOADS = ['/examples/headless.html', '/examples/headless.js', '/examples/scanner.worker.js', '/package.json',
  '/build-info.json', '/auto.js', '/qrcode-ai-scanner.js', wasmPath]
  .map(path => `${path} 200 ${STATIC_TYPES[extname(path)]}`).sort();
receipt.example = { files: EXAMPLE_FILES.map(file => `examples/${file}`), loads: EXAMPLE_LOADS,
  cases: Object.fromEntries(Object.entries(exampleCases).map(([id, { file, rows }]) => [id, { file, rows }])),
  // The stand-in worker's replies the page is read against (defined below).
  standInReplies: null };
// The page as a user drives it, in one document: it names the installed bytes, decodes the mixed
// image exactly, tells a valid empty result, an input error and a configuration error apart,
// decodes a dropped image after the error, and loads the one module once from loopback.
const exampleWitness = async (browser, name, site, runtimeSupport) => {
  const pageUrl = `${site.origin}/examples/headless.html`;
  const logStart = site.log.length;
  const context = await browser.newContext();
  const page = await context.newPage();
  const seen = { requests: [], served: [], errors: [], console: [], pages: 0, navigations: 0 };
  context.on('request', request => seen.requests.push(request.url()));
  context.on('page', () => { seen.pages += 1; });
  page.on('response', response => { if (response.url().endsWith(wasmPath) && response.ok()) seen.served.push(response.body().then(sha)); });
  page.on('pageerror', error => seen.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') seen.console.push(message.text()); });
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) seen.navigations += 1; });
  const mixed = exampleCases['qr-and-code128'], code128 = exampleCases.code128;
  try {
    await page.goto(pageUrl);
    await exampleSettledLoad(page, name);
    const ready = await exampleView(page);
    assert.deepEqual({ state: ready.state, scan: ready.scan, packageName: ready.packageName, packageVersion: ready.packageVersion,
      wasmSha256: ready.wasmSha256, engineVersion: ready.engineVersion },
    { state: 'ready', scan: 0, packageName: manifest.name, packageVersion: manifest.version, wasmSha256: installedWasmSha256,
      engineVersion: manifest.version }, `${name}: the example loads and names the installed package and WASM bytes`);
    // Labelled controls and a status region, found by accessible name and role. The summary is
    // the one live region: the list of codes sits outside it.
    assert.deepEqual([await page.getByLabel(/^Image file/).getAttribute('id'),
      await page.getByLabel('Profile', { exact: true }).getAttribute('id'), await page.getByRole('status').getAttribute('id')],
    ['file', 'profile', 'summary'], `${name}: labelled controls and a live status region`);
    assert.deepEqual(await exampleLiveRegions(page), { live: ['summary'], listAnnounced: false },
      `${name}: the summary is the only live region, and the list of codes is outside it`);
    await page.evaluate(() => { window.exampleWitnessDocument = 'unchanged'; });
    let serial = 0;
    assertExampleRows(await pickFile(page, mixed, ++serial), mixed, 'full', `${name}: the mixed image, full profile`);
    // The decoded URL is text: a click on it opens and loads nothing (checked below).
    await page.getByText(mixed.rows.find(row => row.kind === 'url').value, { exact: true }).click();
    const empty = exampleCases['code93-without-checks'];
    let view = await pickFile(page, empty, ++serial);
    assert.deepEqual([view.state, view.error, view.complete, view.rows,
      view.summary.startsWith(`No code found in ${empty.file} with the full profile.`)],
    ['empty', null, 'true', [], true], `${name}: an image without a valid code is a valid empty result`);
    view = await pickFile(page, { file: 'three-bytes.png', bytes: Buffer.from([1, 2, 3]) }, ++serial);
    assert.deepEqual([view.state, view.error, view.code, view.rows, view.summary.startsWith('Input error (QRS-001)')],
      ['error', 'input', 'QRS-001', [], true], `${name}: three bytes are an input error`);
    // A valid image picked right after the input error decodes in the same document, and so does
    // one dropped on the page after it.
    const clean = exampleCases['qr-v5q-control'];
    assertExampleRows(await pickFile(page, clean, ++serial), clean, 'full', `${name}: an image picked after the input error`);
    const dataTransfer = await page.evaluateHandle(({ bytes, file }) => { const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], file, { type: 'image/png' })); return transfer; },
    { bytes: [...code128.bytes], file: code128.file });
    await page.dispatchEvent('#drop-zone', 'drop', { dataTransfer });
    assertExampleRows(await settledView(page, ++serial), code128, 'full', `${name}: a dropped image`);
    // The profile control scans the chosen image again.
    for (const profile of ['fast', 'frame']) {
      await page.selectOption('#profile', profile);
      assertExampleRows(await settledView(page, ++serial), code128, profile, `${name}: the ${profile} profile`);
    }
    // A profile name the engine refuses: the request is wrong, not the image.
    await page.evaluate(() => { document.querySelector('#profile option[value="frame"]').value = 'no-such-profile'; });
    await page.selectOption('#profile', 'no-such-profile');
    view = await settledView(page, ++serial);
    assert.deepEqual([view.state, view.error, view.code, view.rows, view.summary.startsWith('Configuration error')],
      ['error', 'configuration', null, [], true], `${name}: an unknown profile is a configuration error`);
    await page.evaluate(() => { document.querySelector('#profile option[value="no-such-profile"]').value = 'frame'; });
    await page.selectOption('#profile', 'full');
    assertExampleRows(await settledView(page, ++serial), code128, 'full', `${name}: the full profile again`);
    assert.equal(await page.evaluate(() => window.exampleWitnessDocument), 'unchanged', `${name}: the page never reloaded`);
    // What the server answered, once each, and every request the browser reports (Chromium
    // includes the worker's module imports) on this loopback origin; previews are blob: URLs.
    const served = site.log.slice(logStart).map(({ path, status, type }) => `${path} ${status} ${type}`).sort();
    assert.deepEqual(served, EXAMPLE_LOADS, `${name}: the page loads only the package's own files, once each`);
    const elsewhere = seen.requests.filter(url => !url.startsWith(`${site.origin}/`) && !url.startsWith(`blob:${site.origin}/`));
    assert.deepEqual({ elsewhere, wasmRequests: seen.requests.filter(url => url === `${site.origin}${wasmPath}`).length,
      servedSha256: [...new Set(await Promise.all(seen.served))], navigations: seen.navigations, pages: seen.pages,
      errors: seen.errors, console: seen.console },
    { elsewhere: [], wasmRequests: 1, servedSha256: [installedWasmSha256], navigations: 1, pages: 0, errors: [], console: [] },
    `${name}: one .wasm request for every scan, the installed module, no request elsewhere, no error`);
    return { scans: serial, served, browserRequests: seen.requests.length,
      frame: await exampleFrameWitness(page, name, runtimeSupport) };
  } finally { await context.close(); }
};
// A published package is a default build: both engines and every symbology, each list in the
// order of the schema's EngineKind and Symbology (spec/01-report.md § Capabilities).
const reportSchema = JSON.parse(readFileSync(join(root, 'spec/scan-report.schema.json')));
const defaultBuild = { versions: { scanner: manifest.version, pipeline: 5, score_contract: 5 },
  engines: reportSchema.$defs.EngineKind.enum, symbologies: reportSchema.$defs.Symbology.enum };
// The worker knows nothing of the page, so a camera page can share it: from the page's origin,
// its load reply names what the browser supports (RUNTIME_SUPPORT) and the module's readers,
// scan_frame decodes the control's canvas RGBA (transferred, not copied) and refuses a buffer
// one byte short, and a malformed request (an option of the wrong type included) is a request
// error, not a scan fault.
const exampleFrameWitness = async (page, name, runtimeSupport) => {
  const clean = exampleCases['qr-v5q-control'];
  const replies = await page.evaluate(async ({ bytes }) => {
    const worker = new Worker(new URL('./scanner.worker.js', location.href), { type: 'module' });
    const ask = (message, transfer) => new Promise(resolve => {
      worker.onmessage = event => resolve(event.data); worker.postMessage(message, transfer ?? []); });
    try {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
      const canvas = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
      const context2d = canvas.getContext('2d');
      context2d.drawImage(bitmap, 0, 0);
      const { data } = context2d.getImageData(0, 0, canvas.width, canvas.height);
      const size = { width: canvas.width, height: canvas.height };
      const loaded = await ask({ id: 1, type: 'load' });
      const scanned = await ask({ id: 2, type: 'scan_frame', rgba: data, ...size, profile: 'frame', budgetMs: 0 }, [data.buffer]);
      const short = await ask({ id: 3, type: 'scan_frame', rgba: new Uint8ClampedArray(size.width * size.height * 4 - 1),
        ...size, profile: 'frame', budgetMs: 0 });
      const unknown = await ask({ id: 4, type: 'scan_video' });
      const noBytes = await ask({ id: 5, type: 'scan_image', profile: 'full' });
      const numberProfile = await ask({ id: 6, type: 'scan_image', bytes: new Uint8Array(bytes), profile: 5 });
      const textBudget = await ask({ id: 7, type: 'scan_image', bytes: new Uint8Array(bytes), profile: 'fast', budgetMs: '100' });
      const brief = reply => ({ id: reply.id, ok: reply.ok, phase: reply.phase ?? null, qrs: reply.error?.qrs ?? null });
      const { versions, engines, symbologies } = loaded.capabilities ?? {};
      return { loaded: { ...brief(loaded), version: loaded.version, variant: loaded.variant, runtime: loaded.runtime ?? null,
        capabilities: { versions, engines, symbologies } },
        scanned: { ...brief(scanned), contents: scanned.report?.detections.map(detection => [detection.symbology,
          detection.content.text]) ?? null, transferred: data.byteLength === 0 },
        short: brief(short), unknown: brief(unknown), noBytes: brief(noBytes), numberProfile: brief(numberProfile),
        textBudget: brief(textBudget) };
    } finally { worker.terminate(); }
  }, { bytes: [...clean.bytes] });
  assert.deepEqual(replies, {
    loaded: { id: 1, ok: true, phase: null, qrs: null, version: manifest.version, variant: 'portable', runtime: runtimeSupport,
      capabilities: defaultBuild },
    scanned: { id: 2, ok: true, phase: null, qrs: null, contents: clean.rows.map(row => [row.symbology, row.value]),
      transferred: true },
    short: { id: 3, ok: false, phase: 'scan', qrs: 'QRS-004' }, unknown: { id: 4, ok: false, phase: 'request', qrs: null },
    noBytes: { id: 5, ok: false, phase: 'request', qrs: null }, numberProfile: { id: 6, ok: false, phase: 'request', qrs: null },
    textBudget: { id: 7, ok: false, phase: 'request', qrs: null } },
  `${name}: the example worker's load reply, frame path and request errors`);
  return replies;
};
// A module the page cannot load is a loading error, never an empty result, and an image chosen
// then is not scanned; the retry button, pressed from the keyboard, loads again in a new worker,
// scans that image and leaves focus on the summary, not on the page body.
const exampleLoadingWitness = async (browser, name, site) => {
  const context = await browser.newContext();
  try {
    await context.route(`**${wasmPath}`, route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${site.origin}/examples/headless.html`);
    await exampleSettledLoad(page, name);
    const loading = view => [view.state, view.error, view.code, view.retry, view.rows, view.engineVersion,
      view.summary.startsWith('Loading error (asset_http_failed, HTTP 404)')];
    const expected = ['error', 'loading', 'asset_http_failed', true, [], 'not loaded', true];
    assert.deepEqual(loading(await exampleView(page)), expected, `${name}: a missing WASM is a loading error`);
    const code128 = exampleCases.code128;
    assert.deepEqual(loading(await pickFile(page, code128, 1)), expected, `${name}: an image chosen then is not scanned`);
    await context.unroute(`**${wasmPath}`);
    await page.focus('#retry');
    await page.keyboard.press('Enter');
    assertExampleRows(await settledView(page, 2), code128, 'full', `${name}: the retry loads and scans the chosen image`);
    const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || null);
    assert.equal(focused, 'summary', `${name}: after the retry hides its button, focus is on the summary`);
    assert.deepEqual(errors, [], `${name}: page errors after a loading error`);
    return { state: expected[0], code: expected[2], retried: true, focused };
  } finally { await context.close(); }
};
// A stand-in for examples/scanner.worker.js: it answers a load as the module does and each scan
// with the reply the chosen file holds as JSON. Through the installed page and its own file
// input, it drives replies no committed image produces on demand: a capacity reached, a budget
// cut, a report that leaves its flags out, invisible characters, an engine fault.
const STUB_WORKER = `self.onmessage = (event) => {
  const { id, type, bytes } = event.data;
  if (type === 'load') {
    self.postMessage({ id, type, ok: true, version: ${JSON.stringify(manifest.version)}, variant: 'portable' });
    return;
  }
  self.postMessage(Object.assign(JSON.parse(new TextDecoder().decode(bytes)), { id, type }));
};
`;
// Replies shaped by the report contract (spec/01-report.md § Occurrences and § PipelineTrace): a
// scan publishes at most 16 detections and 16 copies of each, trace.saturation names the
// capacity that left something out, a report the budget cut is partial, and a flag the report
// leaves out is unknown, never false.
const UNSATURATED = { reads: false, detections: false, occurrences: false };
const stubContent = (text, charset = 'utf8', raw = Buffer.from(text).toString('base64')) => ({ text, charset, raw });
// Copy INDEX of a code, on a grid of 60-pixel cells: a QR Code quad, or a linear code's segment.
const stubCopy = (symbology, index) => {
  const [x, y] = [(index % 6) * 60, Math.floor(index / 6) * 60];
  return { geometry: symbology === 'qr_code' ? { kind: 'quad', reader: 'rqrr',
    points: [[x, y], [x + 40, y], [x + 40, y + 40], [x, y + 40]].map(([px, py]) => ({ x: px, y: py })) }
    : { kind: 'segment', reader: 'rxing', points: [{ x, y: y + 20 }, { x: x + 40, y: y + 20 }] } };
};
const stubDetection = (symbology, text, copies, kind = 'text', content = stubContent(text)) => ({ symbology, content,
  payload: { kind }, occurrences: Array.from({ length: copies }, (_, index) => stubCopy(symbology, index)) });
const stubReport = (detections, trace) => ({ ok: true, ms: 1,
  report: { detections, trace: { stages: [], engine_panics: 0, total_ms: 1, ...trace } } });
const stubError = (phase, name, message, qrs = null) => ({ ok: false, phase,
  error: { name, message, code: null, qrs, status: null, cause: null } });
const HIDDEN = ['https://example.com/\u3164',
  'PAY\u{E0100}\u{E01EF}\u2800\u034F\u180B\uFE0F\u115F\u1160\uFFA0 A\u00A0B'];
const UNKNOWN_BYTES = Buffer.from([0x41, 0x42, 0xff]).toString('base64');
const shown = 'Characters that do not show (code point at character index): ';
const UNPROVEN_COUNTS = ' The report does not prove the copy counts complete: each is a lower bound.';
const fault = (file, name, message) => ({ state: 'error', error: 'fault',
  summary: `Scanner fault (${name}): the scanner stopped while scanning ${file}. Reload the page before scanning again. ${message}` });
const STUB_CASES = [
  ['contents-past-capacity', 'labels.png', stubReport(Array.from({ length: 16 }, (_, index) => stubDetection('qr_code',
    `C${String(index).padStart(2, '0')}`, 1)), { budget_exhausted: false, saturation: { ...UNSATURATED, detections: true } }),
  { state: 'result', complete: 'false', occurrences: Array(16).fill('1'), summary: '16 codes found in labels.png with the ' +
    'full profile. The scan reached a capacity: more codes may be present than listed.' }],
  ['copies-past-capacity', 'copies.png', stubReport([stubDetection('qr_code', 'Q', 16)],
    { budget_exhausted: false, saturation: { ...UNSATURATED, occurrences: true } }),
  { state: 'result', complete: 'true', occurrences: ['at least 16 (incomplete)'], summary: '1 code found in copies.png ' +
    'with the full profile. The scan finished and lists every code it read. Some copy counts are incomplete: a code ' +
    'may occur more times than its count shows.' }],
  ['reads-past-capacity', 'crowded.png', stubReport([], { budget_exhausted: false, saturation: { ...UNSATURATED, reads: true } }),
    { state: 'inconclusive', complete: 'false', summary: 'No code listed for crowded.png with the full profile, and that ' +
      'does not prove the image holds none. The scan reached a capacity: codes may be present.' }],
  ['flags-left-out', 'older.png', stubReport([], {}), { state: 'inconclusive', complete: 'false', summary: 'No code listed ' +
    'for older.png with the full profile, and that does not prove the image holds none. The report does not say whether ' +
    'the scan ran to its end or reached a capacity: codes may be present.' }],
  ['saturation-left-out', 'older-result.png', stubReport([stubDetection('code128', 'LOT-7', 1)], { budget_exhausted: false }),
    { state: 'result', complete: 'false', occurrences: ['at least 1 (not proven complete)'], summary: '1 code found ' +
      'in older-result.png with the full profile. The report does not say whether the scan reached a capacity: more codes ' +
      `may be present than listed.${UNPROVEN_COUNTS}` }],
  // A report the budget cut is partial, and unreconciled reads may be copies of a listed code: in
  // both, a copy count is a lower bound although no copy capacity was reached.
  ['budget-cut', 'cut.png', stubReport([stubDetection('code128', 'LOT-8', 2)],
    { budget_exhausted: true, saturation: UNSATURATED }),
  { state: 'result', complete: 'false', occurrences: ['at least 2 (not proven complete)'], summary: '1 code found in ' +
    `cut.png with the full profile. The time budget cut the scan short: more codes may be present than listed.${UNPROVEN_COUNTS}` }],
  ['reads-with-a-code', 'crowded-code.png', stubReport([stubDetection('qr_code', 'R-1', 1)],
    { budget_exhausted: false, saturation: { ...UNSATURATED, reads: true } }),
  { state: 'result', complete: 'false', occurrences: ['at least 1 (not proven complete)'], summary: '1 code found in ' +
    'crowded-code.png with the full profile. The scan reached a capacity: more codes may be present than listed.' +
    UNPROVEN_COUNTS }],
  ['hidden-characters', 'hidden.png', stubReport([stubDetection('qr_code', HIDDEN[0], 1, 'url'),
    stubDetection('qr_code', HIDDEN[1], 1), stubDetection('qr_code', 'AB\uFFFD', 1, 'text',
      stubContent('AB\uFFFD', 'unknown', UNKNOWN_BYTES))], { budget_exhausted: false, saturation: UNSATURATED }),
  { state: 'result', complete: 'true', occurrences: ['1', '1', '1'], values: [...HIDDEN, 'AB\uFFFD'],
    notes: [[`${shown}U+3164 at 20.`], [`${shown}U+E0100 at 3, U+E01EF at 4, U+2800 at 5, U+034F at 6, U+180B at 7, ` +
      'U+FE0F at 8, U+115F at 9, U+1160 at 10, U+FFA0 at 11, U+00A0 at 14.'], ['This text is not a complete decoding: ' +
      `each U+FFFD replaces bytes the scanner could not read. The bytes, in base64: ${UNKNOWN_BYTES}`]],
    summary: '3 codes found in hidden.png with the full profile. The scan finished and lists every code it read.' }],
  ['stack-overflow', 'deep.png', stubError('scan', 'RangeError', 'Maximum call stack size exceeded'),
    fault('deep.png', 'RangeError', 'Maximum call stack size exceeded')],
  ['recursion', 'nested.png', stubError('scan', 'InternalError', 'too much recursion'),
    fault('nested.png', 'InternalError', 'too much recursion')],
  ['report-not-handed-over', 'report.png', stubError('scan', 'Error', 'invalid value: the report could not be converted'),
    fault('report.png', 'Error', 'invalid value: the report could not be converted')],
  ['engine-trap', 'trap.png', stubError('scan', 'RuntimeError', 'unreachable'), fault('trap.png', 'RuntimeError', 'unreachable')],
  ['option-domain', 'budget.png', stubError('scan', 'Error', 'budget_ms is above 4294967295 [QRS-006]', 'QRS-006'),
    { state: 'error', error: 'configuration', code: 'QRS-006', summary: 'Configuration error (QRS-006): the request or ' +
      'one of its options is invalid, not the image. budget_ms is above 4294967295 [QRS-006]' }],
  ['unknown-profile', 'profile.png', stubError('scan', 'Error', 'unknown profile `fastest` \u2014 expected full | fast | frame'),
    { state: 'error', error: 'configuration', summary: 'Configuration error: the request or one of its options is ' +
      'invalid, not the image. unknown profile `fastest` \u2014 expected full | fast | frame' }],
  ['malformed-request', 'request.png', stubError('request', 'TypeError', 'scan_image bytes must be an ArrayBuffer or a typed array'),
    { state: 'error', error: 'configuration', summary: 'Configuration error: the request or one of its options is ' +
      'invalid, not the image. scan_image bytes must be an ArrayBuffer or a typed array' }],
].map(([id, file, reply, want]) => ({ id, file, reply,
  want: { error: null, code: null, complete: null, occurrences: [], links: 0, ...want } }));
receipt.example.standInReplies = STUB_CASES.map(({ id, file, want }) => ({ id, file, state: want.state }));
// Each stand-in reply, picked as a file in one document: what the page shows, with each row's
// notes (the invisible characters and an unknown charset's bytes).
const exampleReportWitness = async (browser, name, site) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${site.origin}/examples/headless.html`);
    await exampleSettledLoad(page, name);
    let serial = 0;
    for (const { id, file, reply, want } of STUB_CASES) {
      await page.setInputFiles('#file', { name: file, mimeType: 'image/png', buffer: Buffer.from(JSON.stringify(reply)) });
      const view = await settledView(page, ++serial);
      const notes = await page.evaluate(() => [...document.querySelectorAll('#detections > li')]
        .map(item => [...item.querySelectorAll('.note.invisible, .note.raw')].map(note => note.textContent)));
      const got = { ...view, occurrences: view.rows.map(row => row.occurrences), values: view.rows.map(row => row.value), notes };
      assert.deepEqual(Object.fromEntries(Object.keys(want).map(key => [key, got[key]])), want,
        `${name}: the page's reading of the ${id} reply`);
    }
    assert.deepEqual(errors, [], `${name}: page errors while reading stand-in replies`);
    return STUB_CASES.map(({ id }) => id);
  } finally { await context.close(); }
};
// The camera example. The camera it gets is a stand-in installed before any page script:
// getUserMedia returns a canvas.captureStream() of a white 640x360 frame that shows the control
// code at (140, 0) once the witness sets showCode, with a corner patch repainted every 30 ms so
// that frames keep coming, and enumerateDevices lists two cameras. It records each getUserMedia
// call and track, each ImageData the page constructs (its frame copies), each request the page
// posts to a worker and each reply, with the worker's number (1 for the first one the page
// creates), and each securitypolicyviolation event of the document. In order, in sequence: each
// worker created or terminated, and each AbortController abort, by its reason's code, from its
// start to its end, so that what the page does inside an abort sits between the two. hangNext
// withholds the next scan_frame request from its worker, which then never answers it. stateValues
// returns every value the status line's data-state took, in order, from the parsed document on.
const CAMERA_STUB = ({ png, width, height, x, y }) => {
  const record = { calls: [], tracks: [], copies: [], posted: [], replies: [], violations: [], denyNext: null,
    showCode: false, hangNext: false, workers: 0, sequence: [], terminated: [], stateValues: () => [] };
  Object.defineProperty(window, 'cameraStub', { value: record });
  document.addEventListener('securitypolicyviolation', event => record.violations.push(
    `${event.effectiveDirective} ${event.blockedURI}`));
  // Module scripts have run when DOMContentLoaded fires. Each mutation record keeps the value
  // before its change: those values, then the current one, are every value in order.
  document.addEventListener('DOMContentLoaded', () => {
    const status = document.getElementById('status');
    if (status === null) return;
    const values = [];
    const observer = new MutationObserver(changes => changes.forEach(change => values.push(change.oldValue)));
    observer.observe(status, { attributes: true, attributeFilter: ['data-state'], attributeOldValue: true });
    record.stateValues = () => {
      observer.takeRecords().forEach(change => values.push(change.oldValue));
      return [...values, status.getAttribute('data-state')];
    };
  });
  const abort = AbortController.prototype.abort;
  AbortController.prototype.abort = function (...args) {
    const code = args[0] && typeof args[0].code === 'string' ? args[0].code : 'other';
    record.sequence.push(`abort ${code}`);
    try { return abort.apply(this, args); } finally { record.sequence.push(`aborted ${code}`); }
  };
  const NativeImageData = window.ImageData;
  window.ImageData = new Proxy(NativeImageData, { construct(target, args, newTarget) {
    const image = Reflect.construct(target, args, newTarget === window.ImageData ? target : newTarget);
    record.copies.push({ width: image.width, height: image.height, at: performance.now() });
    return image;
  } });
  const NativeWorker = window.Worker;
  const numbers = new WeakMap();
  window.Worker = new Proxy(NativeWorker, { construct(target, args, newTarget) {
    const worker = Reflect.construct(target, args, newTarget === window.Worker ? target : newTarget);
    record.workers += 1;
    const number = record.workers;
    numbers.set(worker, number);
    record.sequence.push(`worker ${number}`);
    worker.addEventListener('message', event => {
      const data = event.data || {};
      const detections = data.report && Array.isArray(data.report.detections) ? data.report.detections.length : null;
      record.replies.push({ id: data.id, type: data.type, ok: data.ok, detections, worker: number, at: performance.now() });
    });
    return worker;
  } });
  const post = NativeWorker.prototype.postMessage, terminate = NativeWorker.prototype.terminate;
  NativeWorker.prototype.postMessage = function (message, ...rest) {
    if (message && message.type) {
      const entry = { id: message.id, type: message.type, worker: numbers.get(this) || null, at: performance.now() };
      record.posted.push(entry);
      if (record.hangNext && message.type === 'scan_frame') {
        record.hangNext = false;
        entry.withheld = true;
        record.sequence.push(`withheld ${entry.worker}`);
        return undefined;
      }
    }
    return post.call(this, message, ...rest);
  };
  NativeWorker.prototype.terminate = function () {
    const number = numbers.get(this) || null;
    record.sequence.push(`terminate ${number}`);
    record.terminated.push({ worker: number, at: performance.now() });
    return terminate.call(this);
  };
  const bytes = Uint8Array.from(atob(png), character => character.charCodeAt(0));
  let bitmap = null;
  const devices = [['camera-a', 'Stand-in camera A'], ['camera-b', 'Stand-in camera B']];
  navigator.mediaDevices.enumerateDevices = async () => devices.map(([deviceId, label]) =>
    ({ deviceId, groupId: 'stand-in', kind: 'videoinput', label }));
  navigator.mediaDevices.getUserMedia = async constraints => {
    record.calls.push(JSON.parse(JSON.stringify(constraints)));
    if (record.denyNext) {
      const name = record.denyNext;
      record.denyNext = null;
      throw new DOMException('Refused by the witness', name);
    }
    bitmap = bitmap || await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const exact = constraints.video && constraints.video.deviceId && constraints.video.deviceId.exact;
    const deviceId = exact || 'camera-a';
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    let tick = 0;
    const paint = () => {
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
      if (record.showCode) context.drawImage(bitmap, x, y);
      const level = 40 + (tick++ % 8) * 20;
      context.fillStyle = `rgb(${level}, ${level}, ${level})`; context.fillRect(0, 0, 48, 24);
    };
    paint();
    const timer = setInterval(paint, 30);
    const stream = canvas.captureStream();
    for (const track of stream.getTracks()) {
      const settings = track.getSettings.bind(track), stop = track.stop.bind(track);
      track.getSettings = () => Object.assign(settings(), { deviceId });
      track.stop = () => { clearInterval(timer); stop(); };
      record.tracks.push({ track, deviceId });
    }
    return stream;
  };
};
const cameraStubOptions = { png: Buffer.from(exampleCases['qr-v5q-control'].bytes).toString('base64'), width: 640, height: 360,
  x: 140, y: 0 };
// What the camera page shows, read from its DOM, with what the stand-in camera recorded. Each
// drawn outline gives the points of its hit target and the box of its visible bracket path (the
// path's geometry, in the same user space); nodes lists the elements in the capture area and
// counts those in the two slots the overlay mounts in.
const cameraView = page => page.evaluate(() => {
  const status = document.getElementById('status'), toggle = document.getElementById('toggle');
  const video = document.getElementById('video'), text = selector => document.querySelector(selector)?.textContent ?? null;
  const outlines = [...document.querySelectorAll('#capture g[data-drawn="outline"]')];
  const rail = document.querySelector('#rail-slot .qr-camera-rail');
  const stub = window.cameraStub;
  const bracketBox = outline => {
    const path = outline.querySelector('path.qr-camera-outline');
    if (path === null) return null;
    try {
      const box = path.getBBox();
      return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
    } catch (error) { return { error: String(error) }; }
  };
  return { state: status.dataset.state ?? null, scanner: status.dataset.scanner ?? null, error: status.dataset.error ?? null,
    status: status.textContent, toggle: toggle.textContent, toggleDisabled: toggle.disabled,
    retry: !document.getElementById('retry').hidden, focused: document.activeElement?.id || null, outlines: outlines.length,
    points: outlines.map(outline => outline.querySelector('polygon.qr-camera-hit')?.getAttribute('points') ?? null),
    brackets: outlines.map(bracketBox),
    nodes: { capture: [...document.getElementById('capture').children].map(node => node.tagName.toLowerCase()),
      rail: document.getElementById('rail-slot').childElementCount,
      readout: document.getElementById('readout-slot').childElementCount },
    contents: [...document.querySelectorAll('#readout-slot .qr-camera-content')].map(node => node.textContent),
    destination: text('#readout-slot .qr-camera-destination'),
    checks: [...document.querySelectorAll('button.qr-camera-check')].map(node => node.textContent),
    opens: document.querySelectorAll('.qr-camera-open').length, links: document.querySelectorAll('a, area').length,
    video: { width: video.clientWidth, height: video.clientHeight, videoWidth: video.videoWidth,
      videoHeight: video.videoHeight, stream: video.srcObject !== null },
    focus: document.querySelector('#capture [data-focus]')?.getAttribute('data-focus') ?? null,
    rail: rail === null ? null : { shown: !rail.hidden, entries: rail.querySelectorAll('[data-target-id]').length },
    ranges: ['dim', 'blur', 'glow'].map(id => document.getElementById(id).disabled),
    devices: document.getElementById('device-field').hidden ? null
      : [...document.querySelectorAll('#device option')].map(option => [option.value, option.selected]),
    packageName: text('#package-name'), packageVersion: text('#package-version'), wasmSha256: text('#wasm-sha256'),
    engineVersion: text('#engine-version'),
    calls: stub.calls, tracks: stub.tracks.map(({ deviceId, track }) => [deviceId, track.readyState]),
    copies: stub.copies.map(({ width, height, at }) => ({ width, height, at })),
    frames: stub.posted.filter(post => post.type === 'scan_frame').map(({ id, worker, at, withheld }) =>
      ({ id, worker, at, withheld: withheld === true })),
    replies: stub.replies.filter(reply => reply.type === 'scan_frame'), violations: stub.violations,
    workers: stub.workers, sequence: [...stub.sequence], terminated: [...stub.terminated], states: stub.stateValues() };
});
// The examples under a Content-Security-Policy header, sent with every file of the installed
// folder. The search starts from STARTING_POLICY, which cannot style the image page: its
// style-src 'self' allows stylesheet files only, and the page declares its styles in one inline
// <style>, whose hash (computed here from the installed page, after the parser's newline
// normalization) is added to style-src. Both pages must scan under that policy with no violation
// reported. The search then removes each source in turn, in the order written, and keeps a
// removal when both pages still scan with no report; a directive left with no source is dropped
// and falls back to default-src. default-src 'self' stays: removing it would let every directive
// the policy does not name load from anywhere. Its 'self' is needed too: with default-src 'none'
// the pages fail. The policy found must be the one examples/README.md documents, and each of its
// sources was needed for the reason given below.
const STARTING_POLICY = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; " +
  "connect-src 'self'; img-src 'self' blob: data:; style-src 'self'; media-src 'self' blob:";
const imagePageStyles = [...readFileSync(join(installed, 'examples', 'headless.html'), 'utf8')
  .matchAll(/<style>([\s\S]*?)<\/style>/g)].map(match => match[1]);
assert.equal(imagePageStyles.length, 1, 'the image page declares its styles in one <style> element');
const cspStyleHash = `'sha256-${createHash('sha256').update(imagePageStyles[0].replace(/\r\n?/g, '\n')).digest('base64')}'`;
const parsePolicy = text => text.split(';').map(part => part.trim().split(/\s+/)).filter(([name]) => name)
  .map(([name, ...sources]) => ({ name, sources }));
const policyText = directives => directives.map(({ name, sources }) => [name, ...sources].join(' ')).join('; ');
// DIRECTIVES without SOURCE in directive NAME: a directive left empty is dropped, but default-src,
// which becomes 'none'.
const withoutSource = (directives, name, source) => directives.flatMap(directive => {
  if (directive.name !== name) return [directive];
  const sources = directive.sources.filter(item => item !== source);
  if (sources.length > 0) return [{ name, sources }];
  return name === 'default-src' ? [{ name, sources: ["'none'"] }] : [];
});
// Why each source of the policy found is needed: what a probe without it reported.
const cspReasons = origin => ({
  "default-src 'self'": entry => entry.directive === 'connect-src' && entry.blocked?.startsWith(`${origin}/`),
  "script-src 'self'": entry => entry.directive?.startsWith('script-src')
    && /\/examples\/(?:headless|camera)\.js$/.test(entry.blocked ?? ''),
  "script-src 'wasm-unsafe-eval'": entry => entry.directive?.startsWith('script-src') && entry.blocked === 'wasm-eval',
  'img-src blob:': entry => entry.directive === 'img-src' && entry.blocked === 'blob',
  'img-src data:': entry => entry.directive === 'img-src' && entry.blocked === 'data',
  [`style-src ${cspStyleHash}`]: entry => entry.directive?.startsWith('style-src') && entry.blocked === 'inline',
});
// One probe of POLICY in a fresh context: at once, the image page scans the control image and
// the camera page starts the stand-in camera until it reads the control code. The probe stops at
// the first violation report, then waits a moment for the reports still coming. A probe that
// neither scans nor reports fails the run: it would prove nothing about the policy.
const cspProbe = async (browser, site, policy) => {
  const serial = site.csp.use(policy);
  const started = performance.now();
  const reported = site.csp.first(serial).then(() => 'reported');
  const until = async (page, predicate) => {
    const waiting = page.waitForFunction(predicate, null, { timeout: 90_000 });
    waiting.catch(() => {});
    if (await Promise.race([waiting.then(() => 'done'), reported]) !== 'done') throw Object.assign(new Error('reported'), { reported: true });
  };
  const clean = exampleCases['qr-v5q-control'];
  const context = await browser.newContext();
  try {
    await context.route('**/*', route => (route.request().url().startsWith(`${site.origin}/`) ? route.continue() : route.abort()));
    const image = async () => {
      const page = await context.newPage();
      await page.goto(`${site.origin}/examples/headless.html`);
      await until(page, () => ['ready', 'error'].includes(document.getElementById('result').dataset.state));
      await page.setInputFiles('#file', { name: clean.file, mimeType: 'image/png', buffer: clean.bytes });
      await until(page, () => { const result = document.getElementById('result');
        return result.dataset.scan === '1' && !['starting', 'loading', 'scanning'].includes(result.dataset.state); });
      const view = await exampleView(page);
      return { state: view.state, values: view.rows.map(row => row.value) };
    };
    const camera = async () => {
      const page = await context.newPage();
      await page.addInitScript(CAMERA_STUB, cameraStubOptions);
      await page.goto(`${site.origin}/examples/camera.html`);
      await until(page, () => ['ready', 'failed'].includes(document.getElementById('status').dataset.scanner));
      if (await page.evaluate(() => document.getElementById('status').dataset.scanner) !== 'ready') return { state: 'failed' };
      await page.evaluate(() => { window.cameraStub.showCode = true; document.getElementById('toggle').click(); });
      await until(page, () => document.querySelector('#readout-slot .qr-camera-content') !== null
        || document.getElementById('status').dataset.state === 'failed');
      const view = await cameraView(page);
      return { state: view.state, contents: view.contents, violations: view.violations };
    };
    const [imageResult, cameraResult] = await Promise.allSettled([image(), camera()]);
    for (const result of [imageResult, cameraResult]) {
      if (result.status === 'rejected' && !result.reason?.reported) {
        throw new Error(`the probe of "${policy}" failed: ${result.reason?.message}`, { cause: result.reason });
      }
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
    const reports = site.csp.of(serial);
    const pages = { image: imageResult.value ?? null, camera: cameraResult.value ?? null };
    const scanned = pages.image?.state === 'result'
      && JSON.stringify(pages.image.values) === JSON.stringify(clean.rows.map(row => row.value))
      && JSON.stringify(pages.camera?.contents ?? null) === JSON.stringify([clean.rows[0].value]);
    const works = scanned && reports.length === 0 && (pages.camera.violations ?? []).length === 0;
    assert.ok(works || reports.length > 0, `the probe of "${policy}" neither scanned nor reported a violation: ${JSON.stringify(pages)}`);
    return { policy, works, reports: reports.map(shownReport), entries: reports, pages,
      ms: Math.round(performance.now() - started) };
  } finally { await context.close(); }
};
// The search in one runtime, from STARTING_POLICY with the style hash, as described above.
// It returns the policy found, the reports each kept source's removal caused, and every probe.
const cspSearch = async (browser, name, site) => {
  const trace = [];
  const probe = async (label, directives) => {
    const result = await cspProbe(browser, site, policyText(directives));
    trace.push({ label, policy: result.policy, works: result.works, reports: result.reports, ms: result.ms });
    return result;
  };
  const starting = await probe('the starting policy', parsePolicy(STARTING_POLICY));
  const inlineStyle = cspReasons(site.origin)[`style-src ${cspStyleHash}`];
  assert.ok(!starting.works && starting.entries.some(inlineStyle),
    `${name}: the starting policy blocks the image page's inline <style> (reports: ${starting.reports.join(', ')})`);
  let current = parsePolicy(STARTING_POLICY).map(directive => (directive.name === 'style-src'
    ? { name: directive.name, sources: [...directive.sources, cspStyleHash] } : directive));
  const widened = await probe('the starting policy with the style hash', current);
  assert.ok(widened.works, `${name}: both pages scan under "${widened.policy}" (reports: ${widened.reports.join(', ')})`);
  const needed = {};
  for (const directive of current.filter(item => item.name !== 'default-src')) {
    for (const source of directive.sources) {
      const smaller = withoutSource(current, directive.name, source);
      const result = await probe(`without ${directive.name} ${source}`, smaller);
      if (result.works) current = smaller;
      else needed[`${directive.name} ${source}`] = result.entries;
    }
  }
  const none = await probe("default-src 'none'", withoutSource(current, 'default-src', "'self'"));
  assert.ok(!none.works, `${name}: the pages need default-src 'self'`);
  needed["default-src 'self'"] = none.entries;
  return { policy: policyText(current), needed, trace };
};
// Each file the camera page needs, served once with a static server's type, and nothing else.
const CAMERA_LOADS = ['/examples/camera.html', '/examples/camera.js', '/camera.js', '/camera-overlay.js', '/destination.js',
  '/examples/scanner.worker.js', '/auto.js', '/qrcode-ai-scanner.js', wasmPath, '/package.json', '/build-info.json']
  .map(path => `${path} 200 ${STATIC_TYPES[extname(path)]}`).sort();
receipt.example.cameraLoads = CAMERA_LOADS;
// The control code's quad as the overlay should draw it: drawn at (140, 0) in the 640x360 frame,
// then fitted into the video element by object-fit: contain, in CSS px from its top-left corner.
const cameraOutline = video => {
  const scale = Math.min(video.width / video.videoWidth, video.height / video.videoHeight);
  const left = (video.width - video.videoWidth * scale) / 2, top = (video.height - video.videoHeight * scale) / 2;
  return { scale, points: controlQuad.map(point => ({ x: left + (point.x + cameraStubOptions.x) * scale,
    y: top + (point.y + cameraStubOptions.y) * scale })) };
};
const svgPoints = text => (text ?? '').trim().split(/\s+/).filter(Boolean).map(pair => {
  const [x, y] = pair.split(',').map(Number);
  return { x, y };
});
// Where camera-overlay.d.ts draws a quad's outline: OutlineOptions.offset (5.5 CSS px by
// default) out from each measured edge, each corner where its two offset edges meet, either
// winding. The visible bracket runs along those offset edges into each corner, so its box is
// the box of these corners.
const OUTLINE_OFFSET = 5.5;
const offsetCorners = (quad, offset) => {
  const area = quad.reduce((sum, p, i) => sum + p.x * quad[(i + 1) % 4].y - quad[(i + 1) % 4].x * p.y, 0);
  // Edge i, from vertex i to vertex i + 1: its outward unit normal n and its offset line n . p = c.
  const edges = quad.map((p, i) => {
    const q = quad[(i + 1) % 4], length = Math.hypot(q.x - p.x, q.y - p.y), sign = Math.sign(area);
    const n = { x: sign * (q.y - p.y) / length, y: -sign * (q.x - p.x) / length };
    return { n, c: n.x * p.x + n.y * p.y + offset };
  });
  return quad.map((_, i) => {
    const a = edges[(i + 3) % 4].n, ca = edges[(i + 3) % 4].c, b = edges[i].n, cb = edges[i].c;
    const det = a.x * b.y - a.y * b.x;
    return { x: (ca * b.y - a.y * cb) / det, y: (a.x * cb - ca * b.x) / det };
  });
};
const boxOf = points => ({ left: Math.min(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)),
  right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)) });
// A wait on the camera page that fails with what the page shows.
const cameraWaiter = (page, name) => (label, predicate, arg = null, timeout = 60_000) =>
  page.waitForFunction(predicate, arg, { timeout }).catch(async error => {
    const shown = await cameraView(page).then(({ state, scanner, error: code, status, outlines, contents, sequence }) =>
      ({ state, scanner, code, status, outlines, contents, sequence }), () => null);
    assert.fail(`${name}: ${label} (${error.message.split('\n')[0]}); the page shows ${JSON.stringify(shown)}`);
  });
const setPageHidden = (page, hidden) => page.evaluate(value => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (value ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);
const UNCHECKED = 'Destination not checked';
const VERDICT_WORDS = /\b(?:safe|unsafe|trusted|untrusted|malicious|dangerous|harmless)\b/i;
// The camera page as a user drives it, under POLICY sent as a header (the policy found): it
// loads the scanner and opens no camera; Start, from the keyboard, opens the default camera
// without audio; frames without a code are scanned and never copied; the control code gets one
// outline at its place, its exact text in the readout and no link; a frame is copied for a
// thumbnail only after the code was reported, at most once per second, before the frame moves
// to the worker; the display controls reach the overlay; destination checks are off, and a check
// starts only from its button, here refused by the policy before it leaves the browser; a second
// camera is offered and replaces the first; Stop ends every track; a denied permission is shown
// and Start recovers; a hidden page stops the camera, which never restarts by itself. Nothing
// leaves loopback, each package file is served once, and no violation but the check's is reported.
const cameraExampleWitness = async (browser, name, site, policy) => {
  const serial = site.csp.use(policy);
  const logStart = site.log.length;
  const context = await browser.newContext();
  const outside = [], errors = [], consoleErrors = [];
  const controlText = exampleCases['qr-v5q-control'].rows[0].value;
  try {
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(`${site.origin}/`)) return route.continue();
      outside.push(url);
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.addInitScript(CAMERA_STUB, cameraStubOptions);
    const waitFor = cameraWaiter(page, name);
    const outlined = () => waitFor('the control code was never outlined and read', () =>
      document.querySelectorAll('#capture g[data-drawn="outline"]').length === 1
      && document.querySelector('#readout-slot .qr-camera-content') !== null);
    await page.goto(`${site.origin}/examples/camera.html`);
    await waitFor('the scanner neither loaded nor failed',
      () => ['ready', 'failed'].includes(document.getElementById('status').dataset.scanner));
    await waitFor('the page never read package.json and build-info.json', () => ['package-name', 'package-version',
      'wasm-sha256'].every(id => document.getElementById(id).textContent !== 'not read yet'));
    let view = await cameraView(page);
    assert.deepEqual({ scanner: view.scanner, state: view.state, toggle: view.toggle, disabled: view.toggleDisabled,
      calls: view.calls.length, name: view.packageName, version: view.packageVersion, sha256: view.wasmSha256,
      engine: view.engineVersion },
    { scanner: 'ready', state: 'idle', toggle: 'Start the camera', disabled: false, calls: 0, name: manifest.name,
      version: manifest.version, sha256: installedWasmSha256, engine: manifest.version },
    `${name}: the camera page loads the scanner, names the installed package and WASM, and opens no camera`);
    await page.focus('#toggle');
    await page.keyboard.press('Enter');
    await waitFor('the camera did not start', () => document.getElementById('status').dataset.state === 'running');
    await waitFor('fewer than six frames were scanned',
      () => window.cameraStub.posted.filter(post => post.type === 'scan_frame').length >= 6);
    view = await cameraView(page);
    assert.deepEqual({ calls: view.calls, copies: view.copies.length, outlines: view.outlines, contents: view.contents },
      { calls: [{ audio: false, video: { facingMode: { ideal: 'environment' } } }], copies: 0, outlines: 0, contents: [] },
      `${name}: Start opens the default camera without audio, and frames without a code are scanned, never copied`);
    const shownAt = await page.evaluate(() => { window.cameraStub.showCode = true; return performance.now(); });
    await outlined();
    await waitFor('no second frame copy', () => window.cameraStub.copies.length >= 2, null, 30_000);
    view = await cameraView(page);
    const outline = cameraOutline(view.video);
    assertNear(svgPoints(view.points[0]), outline.points, 2 * outline.scale, `${name}: the control code's outline target`);
    // The visible bracket, not only its transparent hit target: the box of its path is the box
    // of the offset corners, within the same tolerance plus the 0.1 px its numbers are rounded to.
    const bracket = view.brackets[0], drawnAt = boxOf(offsetCorners(outline.points, OUTLINE_OFFSET));
    const bracketTolerance = 2 * outline.scale + 0.1;
    assert.ok(bracket && !bracket.error && Object.keys(drawnAt).every(side => Math.abs(bracket[side] - drawnAt[side])
      <= bracketTolerance), `${name}: the control code's drawn outline at ${JSON.stringify(bracket)}, expected ` +
      `${JSON.stringify(drawnAt)} within ${bracketTolerance} px`);
    assert.deepEqual({ contents: view.contents, unchecked: view.destination?.includes(UNCHECKED) ?? false,
      checks: view.checks, opens: view.opens, links: view.links },
    { contents: [controlText], unchecked: true, checks: [], opens: 0, links: 0 },
    `${name}: the readout shows the exact text, "${UNCHECKED}", no Check or Open button and no link`);
    const firstRead = view.replies.find(reply => reply.detections > 0);
    const framesShown = view.frames.filter(frame => frame.at >= shownAt).length;
    // The overlay asks for a copy at most once a second by its own clock. Each copy is timed here
    // once its pixels are copied, which on a loaded runner can take longer for one copy than for
    // the next: 50 ms are allowed for that.
    const gaps = view.copies.slice(1).map((copy, index) => copy.at - view.copies[index].at);
    assert.deepEqual({ sizes: [...new Set(view.copies.map(copy => `${copy.width}x${copy.height}`))],
      afterFirstRead: firstRead !== undefined && view.copies[0].at > firstRead.at, paced: gaps.every(gap => gap >= 950),
      fewerThanFrames: view.copies.length < framesShown },
    { sizes: ['640x360'], afterFirstRead: true, paced: true, fewerThanFrames: true },
    `${name}: whole frames are copied only after the code was reported, at most once a second (gaps ${gaps.map(Math.round)} ms, ` +
    `${view.copies.length} copies of ${framesShown} frames)`);
    const rounded = box => Object.fromEntries(Object.entries(box).map(([side, value]) => [side, Math.round(value * 10) / 10]));
    const measured = { framesBeforeCode: view.frames.length - framesShown, framesWithCode: framesShown, copies: view.copies.length,
      outline: { drawn: rounded(bracket), expected: rounded(drawnAt), tolerance: bracketTolerance },
      firstReadMs: firstRead ? Math.round(firstRead.at - shownAt) : null,
      slowestFrameMs: Math.round(Math.max(...view.replies.map(reply => reply.at - (view.frames.find(frame => frame.id === reply.id)?.at ?? reply.at)))) };
    // The display controls set the overlay's options: effects around every code while the
    // selection is automatic, around the selected one, or off (the sliders then disabled). The
    // list of codes stays hidden in automatic mode for one code, which the readout already shows
    // as selected; set to always it shows that one code, and set to off it hides it.
    const display = async (selector, value, label, predicate, arg) => {
      await page.selectOption(selector, value);
      await waitFor(label, predicate, arg);
    };
    const focusIs = value => document.querySelector('#capture [data-focus]')?.getAttribute('data-focus') === value;
    const railShown = shown => { const rail = document.querySelector('#rail-slot .qr-camera-rail');
      return rail !== null && rail.hidden === !shown && (!shown || rail.querySelectorAll('[data-target-id]').length === 1); };
    view = await cameraView(page);
    assert.deepEqual([view.focus, view.rail?.shown, view.ranges], ['all', false, [false, false, false]],
      `${name}: automatic effects around every code, and no list of codes for one code in automatic mode`);
    await display('#focus', 'off', 'effects did not turn off', focusIs, 'off');
    assert.deepEqual((await cameraView(page)).ranges, [true, true, true], `${name}: the sliders are disabled with effects off`);
    await display('#focus', 'selected', 'effects did not move to the selected code', focusIs, 'selected');
    assert.deepEqual((await cameraView(page)).ranges, [false, false, false], `${name}: the sliders are enabled again`);
    await display('#focus', 'auto', 'effects did not return to automatic', focusIs, 'all');
    await display('#rail', 'always', 'the list of codes did not show', railShown, true);
    await display('#rail', 'never', 'the list of codes did not turn off', railShown, false);
    await display('#rail', 'auto', 'the list of codes did not return to automatic', railShown, false);
    // Destination checks are off when the page opens. Turned on, the readout offers Check
    // destination and nothing is requested; pressed, the check is one request from this browser,
    // which the policy (connect-src from default-src 'self') blocks before it is sent.
    assert.deepEqual(site.csp.of(serial).map(shownReport), [], `${name}: no violation reported before the check`);
    await page.check('#destinations');
    await waitFor('no Check destination button', () => document.querySelectorAll('button.qr-camera-check').length === 1);
    view = await cameraView(page);
    assert.deepEqual([view.checks, outside], [['Check destination'], []], `${name}: turned on, checks wait for the button`);
    await page.click('button.qr-camera-check');
    await Promise.race([site.csp.first(serial), new Promise(resolveWait => setTimeout(resolveWait, 15_000))]);
    await waitFor('the readout still shows the destination as not checked',
      text => !(document.querySelector('#readout-slot .qr-camera-destination')?.textContent ?? '').includes(text), UNCHECKED);
    await page.waitForTimeout(1000);
    view = await cameraView(page);
    const checkReadout = view.destination;
    const checkReports = site.csp.of(serial);
    // A fetch the policy refuses fails like any network error the browser hides: the check is
    // unavailable, and the page cannot tell whether a request was sent.
    const unavailable = ['Check unavailable', 'Network error hidden by the browser', 'A request may have been sent'];
    assert.deepEqual({ reports: checkReports.map(entry => [entry.directive,
      [controlText, new URL(controlText).origin].includes(entry.blocked)]), outside, links: view.links,
    readout: unavailable.filter(label => !(checkReadout ?? '').includes(label)), button: view.checks,
    verdict: VERDICT_WORDS.test(checkReadout ?? '') },
    { reports: [['connect-src', true]], outside: [], links: 0, readout: [], button: ['Check again'], verdict: false },
    `${name}: the check is refused by the policy before it leaves the browser and shown as text, no verdict ` +
    `(${JSON.stringify(checkReadout)})`);
    await page.uncheck('#destinations');
    await waitFor('Check destination stayed after checks were turned off',
      () => document.querySelectorAll('button.qr-camera-check').length === 0);
    // The second camera replaces the first.
    view = await cameraView(page);
    assert.deepEqual(view.devices, [['camera-a', true], ['camera-b', false]], `${name}: both cameras listed, the open one chosen`);
    await page.selectOption('#device', 'camera-b');
    await waitFor('the second camera did not open', () => window.cameraStub.calls.length === 2
      && document.getElementById('status').dataset.state === 'running');
    await outlined();
    view = await cameraView(page);
    assert.deepEqual({ call: view.calls[1], tracks: view.tracks },
      { call: { audio: false, video: { deviceId: { exact: 'camera-b' } } }, tracks: [['camera-a', 'ended'], ['camera-b', 'live']] },
      `${name}: choosing the second camera ends the first one's track and opens the second`);
    // Stop, from the keyboard, ends every track; a denied permission is shown, and Start recovers.
    await page.focus('#toggle');
    await page.keyboard.press('Enter');
    await waitFor('the camera did not stop', () => document.getElementById('status').dataset.state === 'stopped');
    view = await cameraView(page);
    assert.deepEqual({ tracks: view.tracks.map(([, state]) => state), stream: view.video.stream, status: view.status,
      toggle: view.toggle, focused: view.focused },
    { tracks: ['ended', 'ended'], stream: false, status: 'Camera stopped.', toggle: 'Start the camera', focused: 'toggle' },
    `${name}: Stop ends every track and keeps the focus on the button`);
    await page.evaluate(() => { window.cameraStub.denyNext = 'NotAllowedError'; });
    await page.keyboard.press('Enter');
    await waitFor('a denied camera was not shown as failed', () => document.getElementById('status').dataset.state === 'failed');
    view = await cameraView(page);
    assert.deepEqual({ error: view.error, cause: view.status.endsWith('(permission_denied, NotAllowedError)'),
      toggle: view.toggle, disabled: view.toggleDisabled },
    { error: 'permission_denied', cause: true, toggle: 'Start the camera', disabled: false },
    `${name}: a denied permission is shown with its code and cause (${view.status})`);
    await page.keyboard.press('Enter');
    await waitFor('Start did not recover after the denial', () => document.getElementById('status').dataset.state === 'running');
    await outlined();
    // A hidden page stops the camera, which stays stopped when the page shows again.
    const calls = (await cameraView(page)).calls.length;
    await setPageHidden(page, true);
    await waitFor('a hidden page did not stop the camera', () => document.getElementById('status').dataset.state === 'stopped');
    await page.waitForTimeout(1000);
    await setPageHidden(page, false);
    await page.waitForTimeout(1500);
    view = await cameraView(page);
    assert.deepEqual({ state: view.state, status: view.status.startsWith('Camera stopped because the page was hidden.'),
      calls: view.calls.length, live: view.tracks.filter(([, state]) => state !== 'ended').length },
    { state: 'stopped', status: true, calls, live: 0 }, `${name}: a hidden page stops the camera, which does not restart by itself`);
    // What left the page: each package file once, nothing beyond loopback, and no other violation.
    const served = site.log.slice(logStart).map(({ path, status, type }) => `${path} ${status} ${type}`).sort();
    assert.deepEqual({ served, outside, reports: site.csp.of(serial).length, violations: view.violations.length, errors,
      console: consoleErrors.filter(text => !text.includes(new URL(controlText).host)) },
    { served: CAMERA_LOADS, outside: [], reports: 1, violations: 1, errors: [], console: [] },
    `${name}: the camera page loads each package file once, requests nothing elsewhere and reports only the refused check`);
    return { served, policy, measured, check: { reports: checkReports.map(shownReport), readout: checkReadout } };
  } finally { await context.close(); }
};
// The camera example's recovery paths, from a loopback static server whose answers change while
// the page runs (FAILING, its overrides: a path set to null is a missing file), with no policy
// header: the page's own meta policy applies. Expected values come from what the page states
// and from the controller's contract in camera.d.ts.
// - A worker script that does not load, then a WASM that does not load (HTTP 404), are each a
//   loading error with the camera unavailable; Load the scanner again, pressed from the keyboard,
//   loads again in a new worker and leaves focus on the status line.
// - A frame the worker never answers (the stand-in withholds it) passes the controller's decode
//   timeout, 5000 ms by default. The page terminates that worker inside the controller's abort of
//   the frame, so before the controller moves on, and recover's new worker reads the code again:
//   the states go running, recovering, running, with no session error.
// - A pagehide kept in the back-forward cache (persisted) stops the camera through the controller
//   and keeps the worker and the overlay, which scan again on Start. One that is not ends every
//   track, terminates the worker and removes every overlay node, a bound verifier's Check button
//   included. The witness dispatches both events in a live page: a real unload ends the document
//   with its workers and tracks whatever the page does, so it would show nothing of the page's.
const DECODE_TIMEOUT_MS = 5000;
const cameraPathsWitness = async (browser, name, site, failing) => {
  const context = await browser.newContext();
  const outside = [], errors = [];
  const controlText = exampleCases['qr-v5q-control'].rows[0].value;
  const workerPath = '/examples/scanner.worker.js';
  // The workers created and terminated, the frame withheld and the decode-timeout abort, in order.
  const relevant = entry => /^(?:worker|terminate|withheld) \d+$/.test(entry) || /^abort(?:ed)? decode_timeout$/.test(entry);
  const collapse = values => values.filter((value, index) => index === 0 || value !== values[index - 1]);
  try {
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(`${site.origin}/`)) return route.continue();
      outside.push(url);
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(CAMERA_STUB, cameraStubOptions);
    const waitFor = cameraWaiter(page, name);
    const outlined = () => waitFor('the control code was never outlined and read', () =>
      document.querySelectorAll('#capture g[data-drawn="outline"]').length === 1
      && document.querySelector('#readout-slot .qr-camera-content') !== null);
    const press = async id => { await page.focus(`#${id}`); await page.keyboard.press('Enter'); };
    const loading = view => ({ scanner: view.scanner, error: view.error, retry: view.retry, start: !view.toggleDisabled,
      engine: view.engineVersion, calls: view.calls.length, focused: view.focused });
    failing[workerPath] = null;
    await page.goto(`${site.origin}/examples/camera.html`);
    await waitFor('a worker script that did not load was not shown as a loading error',
      () => document.getElementById('status').dataset.scanner === 'failed');
    let view = await cameraView(page);
    assert.deepEqual({ ...loading(view), shown: view.status.startsWith('Loading error (worker_failed)') },
      { scanner: 'failed', error: 'loading', retry: true, start: false, engine: 'not loaded', calls: 0, focused: null,
        shown: true }, `${name}: a worker script that does not load is a loading error, the camera unavailable (${view.status})`);
    delete failing[workerPath];
    failing[wasmPath] = null;
    await press('retry');
    await waitFor('a WASM that did not load was not shown as a loading error', () =>
      document.getElementById('status').textContent.startsWith('Loading error (asset_http_failed, HTTP 404)'));
    view = await cameraView(page);
    assert.deepEqual(loading(view), { scanner: 'failed', error: 'loading', retry: true, start: false, engine: 'not loaded',
      calls: 0, focused: 'status' }, `${name}: after a retry, a WASM that does not load is a loading error (${view.status})`);
    delete failing[wasmPath];
    await press('retry');
    await waitFor('the scanner did not load after the second retry',
      () => document.getElementById('status').dataset.scanner === 'ready');
    view = await cameraView(page);
    assert.deepEqual({ ...loading(view), status: view.status, sequence: view.sequence.filter(relevant) },
      { scanner: 'ready', error: null, retry: false, start: true, engine: manifest.version, calls: 0, focused: 'status',
        status: 'Ready. The camera starts only when you press Start the camera.',
        sequence: ['worker 1', 'terminate 1', 'worker 2', 'terminate 2', 'worker 3'] },
      `${name}: each retry ends the failed worker and loads in a new one, and the third loads the scanner`);
    // The hang: the next frame never gets an answer, and the controller times it out.
    await page.evaluate(() => { window.cameraStub.showCode = true; });
    await press('toggle');
    await outlined();
    await page.evaluate(() => { window.cameraStub.hangNext = true; });
    await waitFor('the worker that never answered was not replaced by one that reads the code', () => window.cameraStub
      .replies.some(reply => reply.worker === 4 && reply.type === 'scan_frame' && reply.detections > 0), null, 60_000);
    await outlined();
    view = await cameraView(page);
    const withheld = view.frames.filter(frame => frame.withheld);
    const hung = view.terminated.find(entry => entry.worker === 3);
    const hangMs = hung && withheld.length === 1 ? Math.round(hung.at - withheld[0].at) : null;
    assert.deepEqual({ sequence: view.sequence.filter(relevant), states: collapse(view.states), error: view.error,
      status: view.status, timedOut: hangMs !== null && hangMs >= DECODE_TIMEOUT_MS - 100, calls: view.calls.length,
      tracks: view.tracks, contents: view.contents, engine: view.engineVersion },
    { sequence: ['worker 1', 'terminate 1', 'worker 2', 'terminate 2', 'worker 3', 'withheld 3', 'abort decode_timeout',
      'terminate 3', 'aborted decode_timeout', 'worker 4'], states: ['idle', 'starting', 'running', 'recovering', 'running'],
    error: null, status: 'Scanning. Point the camera at a code.', timedOut: true, calls: 1, tracks: [['camera-a', 'live']],
    contents: [controlText], engine: manifest.version },
    `${name}: the frame the worker never answered times out (after ${hangMs} ms), the page terminates that worker inside ` +
    'the abort, and recover\'s new worker reads the code with no session error and no new camera request');
    // A pagehide kept in the back-forward cache, then Start again.
    const pagehide = persisted => page.evaluate(value =>
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: value })), persisted);
    await pagehide(true);
    await waitFor('a pagehide kept in the cache did not stop the camera',
      () => document.getElementById('status').dataset.state === 'stopped');
    view = await cameraView(page);
    assert.deepEqual({ last: view.sequence.filter(relevant).slice(-1), live: view.tracks.filter(([, state]) => state !== 'ended'),
      overlay: view.nodes.capture.length > 1 && view.nodes.rail > 0 && view.nodes.readout > 0,
      shown: view.status.startsWith('Camera stopped because the page was hidden.') },
    { last: ['worker 4'], live: [], overlay: true, shown: true },
    `${name}: a pagehide kept in the back-forward cache stops the camera and keeps the worker and the overlay`);
    const restartedAt = await page.evaluate(() => performance.now());
    await press('toggle');
    await waitFor('the kept worker did not read the code after Start', at => window.cameraStub.replies.some(reply =>
      reply.worker === 4 && reply.type === 'scan_frame' && reply.detections > 0 && reply.at > at), restartedAt);
    await outlined();
    // A pagehide that is not kept, with destination checks bound to the overlay.
    await page.check('#destinations');
    await waitFor('no Check destination button', () => document.querySelectorAll('button.qr-camera-check').length === 1);
    await pagehide(false);
    view = await cameraView(page);
    await page.waitForTimeout(500);
    const later = await cameraView(page);
    assert.deepEqual({ sequence: view.sequence.filter(relevant).slice(-2), tracks: view.tracks, state: view.state,
      nodes: view.nodes, checks: view.checks, framesAfter: later.frames.length - view.frames.length,
      states: collapse(view.states), outside, errors },
    { sequence: ['worker 4', 'terminate 4'], tracks: [['camera-a', 'ended'], ['camera-a', 'ended']], state: 'stopped',
      nodes: { capture: ['video'], rail: 0, readout: 0 }, checks: [], framesAfter: 0,
      states: ['idle', 'starting', 'running', 'recovering', 'running', 'stopped', 'starting', 'running', 'stopped'],
      outside: [], errors: [] },
    `${name}: a pagehide that is not kept ends every track, terminates the worker and removes every overlay node`);
    return { sequence: view.sequence.filter(relevant), states: collapse(view.states), hangMs, workers: view.workers };
  } finally {
    for (const path of Object.keys(failing)) delete failing[path];
    await context.close();
  }
};
// The policies examples/README.md shows in its Content Security Policy section: first the one
// each runtime's search must find, then the starting policy of that search.
const cspBlocks = readmeBlocks('Content Security Policy', 'text').map(block => block.trim());
assert.deepEqual(cspBlocks.length === 2 && cspBlocks[1], STARTING_POLICY,
  'the Content Security Policy section of examples/README.md shows the policy found, then the starting policy');
const documentedPolicy = cspBlocks[0];
// notRun: each runtime that skips the search and the camera example, with its browser and why.
receipt.csp = { starting: STARTING_POLICY, styleHash: cspStyleHash, documented: documentedPolicy, found: {}, notRun: [] };
const exampleSite = await serveStatic(installed);
const exampleStubSite = await serveStatic(installed, { '/examples/scanner.worker.js': STUB_WORKER });
const cspSite = await serveStatic(installed, {}, cspState());
const cameraFailing = {};
const cameraPathsSite = await serveStatic(installed, cameraFailing);
try {
  for (const runtime of runtimes) {
    phase(`${runtime.name}: loader, fixtures and loading failures`);
    const browser = await runtime.browserType.launch({ headless: true, timeout: 30_000, ...runtime.options });
    try {
      const page = await browser.newPage(); const requests = [], errors = [];
      const served = [];
      page.on('request', request => { if (/\.wasm(?:\?|$)/.test(request.url())) requests.push(request.url()); });
      page.on('response', response => { if (/\.wasm(?:\?|$)/.test(response.url()) && response.ok())
        served.push(response.body().then(body => sha(body))); });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base); await page.waitForFunction(() => !!window.harness);
      const capabilities = await page.evaluate(() => window.harness.scannerCapabilities());
      assert.equal(capabilities.wasm, true); assert.equal(capabilities.baseline, true);
      const disabled = runtime.disabled;
      assert.equal(capabilities.simd, !disabled, 'The real runtime, not a mocked detector, must have the expected capability');
      const selected = 'portable';
      const initStarted = performance.now();
      const init = await page.evaluate(async () => { window.autoWorker = window.harness.startWorker(); return Promise.all(Array.from({length:4}, () => window.autoWorker.request())); });
      const initializationWallMs = performance.now() - initStarted;
      assert.equal(requests.length, 1, 'Concurrent worker init fetches exactly one binary');
      for (const result of init) { assert.equal(result.ok, true); assert.equal(result.variant, selected); assert.deepEqual(result.capabilities, capabilities); assert.equal(result.version, manifest.version); }
      const reports = [], latency = [];
      for (const fixture of fixtures) {
        const started = performance.now();
        const response = await page.evaluate(bytes => window.autoWorker.request({ bytes }), fixture.bytes);
        assert.equal(response.ok, true, `${fixture.name}: ${JSON.stringify(response)}`);
        assert.deepEqual(response.result.detections.map(d => d.content), fixture.expected, fixture.name);
        assert.equal(response.result.trace.budget_exhausted, false);
        assert.deepEqual(response.result.versions, { scanner: manifest.version, pipeline: 5, score_contract: 5 });
        reports.push(response.result); latency.push({ fixture: fixture.name, wallMs: performance.now() - started });
      }
      // The pre-0.11 'compatible' name loads the same portable module; a SIMD
      // module no longer exists, so asking for one is an option error.
      await page.evaluate(() => { window.compatibleWorker = window.harness.startWorker('compatible'); });
      const warm = await page.evaluate(() => window.compatibleWorker.request());
      assert.equal(warm.ok, true); assert.equal(warm.variant, 'portable');
      for (let index = 0; index < fixtures.length; index++) {
        const response = await page.evaluate(bytes => window.compatibleWorker.request({ bytes }), fixtures[index].bytes);
        assert.equal(response.ok, true); assert.equal(response.variant, 'portable');
        assert.deepEqual(normalize(response.result), normalize(reports[index]), `${fixtures[index].name}: one module, same reports`);
      }
      const forced = await page.evaluate(async () => window.harness.startWorker('simd').request());
      assert.equal(forced.ok, false); assert.equal(forced.code, 'invalid_options'); assert.equal(forced.phase, 'initialization');
      const main = await page.evaluate(() => window.harness.mainLoad());
      for (const worker of ['autoWorker', 'compatibleWorker']) {
        for (const profile of ['fast', 'frame', 'full']) {
          const mixed = await page.evaluate(({ worker, profile, bytes }) => window[worker].request({ bytes, profile }),
            { worker, profile, bytes: mixedBytes });
          assert.equal(mixed.ok, true);
          assert.deepEqual(mixed.result.detections.map(d => [d.symbology, d.content.text]).sort(),
            [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']]);
        }
        for (const test of linearCases) {
          const result = await page.evaluate(({ worker, bytes }) => window[worker].request({ bytes }), { worker, bytes: test.bytes });
          assert.equal(result.ok, true);
          assert.deepEqual(result.result.detections.map(d => [d.symbology, d.content.text]).sort(), test.expected, test.file);
        }
      }
      passed.push(`${runtime.name}: mixed QR and Code128 exact contents in fast/frame/full through the installed portable module`);
      passed.push(`${runtime.name}: Code93 and DataBar positives and invalid-checksum/finder negatives through the installed portable module`);
      assert.equal(main.samePromise, true); assert.equal(main.variant, selected);
      const scanError = await page.evaluate(() => window.autoWorker.request({ bytes: [1,2,3] }));
      assert.equal(scanError.ok, false); assert.equal(scanError.phase, 'scan'); assert.match(scanError.message, /QRS-001/);
      await page.context().route('**/missing.wasm', route => route.fulfill({status:404,body:'Missing test asset'}));
      const missing = await page.evaluate(async () => {
        const worker = window.harness.startWorker('auto', new URL('/missing.wasm', location.href).href);
        return Promise.all([worker.request(), worker.request(), worker.request()]);
      });
      for (const result of missing) { assert.equal(result.ok, false); assert.equal(result.code, 'asset_http_failed'); assert.equal(result.status, 404); assert.equal(result.phase, 'initialization'); }
      await page.context().route('**/network-failure.wasm', route => route.abort());
      const network = await page.evaluate(() => window.harness.startWorker('auto', new URL('/network-failure.wasm', location.href).href).request());
      assert.equal(network.ok, false); assert.equal(network.code, 'asset_network_failed');
      const invalid = await page.evaluate(() => window.harness.startWorker('auto', 'data:application/wasm;base64,AAAA').request());
      assert.equal(invalid.ok, false); assert.equal(invalid.code, 'binary_invalid'); assert.equal(invalid.nativeError.name, 'CompileError');
      assert.deepEqual(errors, []);
      await page.evaluate(() => window.harness.stop());
      const servedSha256 = [...new Set(await Promise.all(served))];
      assert.deepEqual(servedSha256, [installedWasmSha256], 'every served WASM response is the one recorded module');
      const run = { runtime: runtime.name, browser: await browser.version(), options: runtime.options, capabilities, selected, initializationWallMs, latency,
        reports: reports.map((report,index) => ({ fixture: fixtures[index].name, normalizedSha256: sha(JSON.stringify(normalize(report))) })), requests, servedSha256, errors };
      runs.push(run);
      passed.push(`${runtime.name}: one portable module served and loaded (${disabled ? 'SIMD disabled in the real runtime' : 'SIMD available but unused'}), exact seven-fixture decoding, one initial asset, concurrent init and distinct failures`);
      phase(`${runtime.name}: camera lifecycle`);
      run.camera = { lifecycle: await lifecycleWitness(browser, runtime.name) };
      phase(`${runtime.name}: camera RGBA`);
      run.camera.rgba = await rgbaWitness(browser, runtime.name);
      phase(`${runtime.name}: example page`);
      run.example = { page: await exampleWitness(browser, runtime.name, exampleSite,
        { wasm: true, simd: !disabled, baseline: true }) };
      phase(`${runtime.name}: example loading error`);
      run.example.loading = await exampleLoadingWitness(browser, runtime.name, exampleSite);
      phase(`${runtime.name}: example report reading`);
      run.example.reports = await exampleReportWitness(browser, runtime.name, exampleStubSite);
      const mixedRows = exampleCases['qr-and-code128'].rows.map(row => `${row.symbology} ${row.value}`).sort().join(' and ');
      passed.push(`${runtime.name}: examples/headless.html from a static loopback server names the installed package and WASM sha256, shows exactly ${mixedRows} as text with no link, and loads each package file once (one .wasm request) and nothing elsewhere`);
      passed.push(`${runtime.name}: the example tells a valid empty result, an input error (QRS-001) and a configuration error apart, decodes an image picked after the error and one dropped after it without a reload, and scans again for each profile; its summary is the only live region`);
      passed.push(`${runtime.name}: the example's module worker names the browser's support and the module's readers (versions, engines, symbologies), decodes transferred canvas RGBA through scan_frame, and refuses a short buffer (QRS-004) and malformed requests (an option of the wrong type included)`);
      passed.push(`${runtime.name}: a WASM the example cannot load is a loading error (asset_http_failed), never an empty result, and its retry, pressed from the keyboard, loads and scans the chosen image with focus on the summary`);
      passed.push(`${runtime.name}: the example never shows a report a capacity cut, or one that leaves its flags out, as a complete list or a proven absence, and shows a copy count past a capacity as "at least N"`);
      passed.push(`${runtime.name}: the example lists invisible code points (separators, default-ignorable characters, the blank Braille pattern) by index, shows an unknown charset's bytes, and tells a scanner fault (RangeError, InternalError, a codeless Error, RuntimeError) from a configuration error (QRS-006, an unknown profile, a malformed request)`);
      // The policy search and the camera example run in the Playwright builds only. The pinned
      // SIMD-disabled Chromium runs the loader and image example phases above: the documents
      // claim no more for it, and the search expects one browser's exact reports.
      if (runtime.disabled) {
        receipt.csp.notRun.push({ runtime: runtime.name, browser: await browser.version(),
          phases: ['examples under a Content-Security-Policy', 'camera example', 'camera example recovery and page hide'],
          reason: 'the SIMD-disabled Chromium qualifies the loader and examples/headless.html only' });
        continue;
      }
      phase(`${runtime.name}: examples under a Content-Security-Policy`);
      const search = await cspSearch(browser, runtime.name, cspSite);
      const needed = Object.fromEntries(Object.entries(search.needed).map(([source, entries]) => [source, entries.map(shownReport)]));
      receipt.csp.found[runtime.name] = search.policy;
      run.example.csp = { policy: search.policy, needed, probes: search.trace };
      assert.equal(search.policy, documentedPolicy, `${runtime.name}: the policy found is the one examples/README.md documents`);
      const reasons = cspReasons(cspSite.origin);
      assert.deepEqual(Object.keys(search.needed).sort(), Object.keys(reasons).sort(), `${runtime.name}: the sources found needed`);
      for (const [source, entries] of Object.entries(search.needed)) {
        assert.ok(entries.some(reasons[source]), `${runtime.name}: without ${source}, the expected violation (reports: ${needed[source].join(', ')})`);
      }
      passed.push(`${runtime.name}: from the starting policy, whose style-src blocks the image page's inline <style>, plus that element's hash, removing each source in turn finds "${search.policy}", the policy examples/README.md documents: under it both examples scan with no violation reported, and removing any of its sources reports the violation its README reason names (${search.trace.length} probes)`);
      phase(`${runtime.name}: camera example`);
      run.example.camera = await cameraExampleWitness(browser, runtime.name, cspSite, search.policy);
      passed.push(`${runtime.name}: examples/camera.html under that policy opens no camera before Start, from the keyboard; outlines the control code at its place (its hit target within 2 px of the frame, and its visible outline 5.5 px out from each edge, within the same 2 px plus the 0.1 px its numbers are rounded to), shows its exact text and no link; copies a frame only after the code was reported and at most once a second; and its display controls set the overlay's effects and list of codes`);
      passed.push(`${runtime.name}: the camera example keeps destination checks off until turned on, checks only from Check destination (refused by the policy before leaving the browser, shown as text), switches to the second camera, ends every track on Stop, shows a denied permission and recovers, stops on a hidden page without restarting, and requests each package file once and nothing beyond loopback`);
      phase(`${runtime.name}: camera example recovery and page hide`);
      run.example.cameraPaths = await cameraPathsWitness(browser, runtime.name, cameraPathsSite, cameraFailing);
      passed.push(`${runtime.name}: the camera example shows a worker script and then a WASM that do not load (worker_failed, then asset_http_failed with HTTP 404) as loading errors with the camera unavailable, and Load the scanner again, from the keyboard, loads again in a new worker each time with focus on the status line`);
      passed.push(`${runtime.name}: when its worker never answers a frame, the camera example terminates that worker inside the controller's abort at the decode timeout (${run.example.cameraPaths.hangMs} ms), before the controller moves on, and recover's new worker reads the control code: running, recovering, running, with no session error`);
      passed.push(`${runtime.name}: on a pagehide event kept in the back-forward cache the camera example stops the camera and keeps its worker and overlay, which scan again on Start; on one that is not, it ends every track, terminates the worker and removes every overlay node`);
    } finally { await browser.close(); }
  }
  // The overlay witnesses on the installed package, per browser: tests/wasm-browser holds their
  // page side (overlay-harness.js, overlay-worker.js), their scenes and judgments
  // (overlay-scenes.mjs) and their driver (overlay-witnesses.mjs). Every expected value comes from
  // fixtures/consumer-truth.json and the records it cites. Chromium and Playwright WebKit run every
  // witness in the fast, frame and full profiles. Firefox runs the exact symbol sets in all three
  // and the scenes and effects in frame, the profile a camera scans with: its WASM reads these
  // frames five to ten times slower than Chromium's (all three profiles took about 8.5 min on a
  // laptop, this split about 2 min), which the job's time limit cannot hold. The receipt lists
  // what each browser did not run.
  const overlayRuntimes = [{ name: 'chromium', browserType: chromium, options: runtimes[0].options, profiles: PROFILES },
    ...(process.env.QRSCAN_TEST_FIREFOX === '1'
      ? [{ name: 'firefox', browserType: firefox, options: {}, profiles: ['frame'], exactProfiles: PROFILES }] : []),
    ...(process.env.QRSCAN_TEST_WEBKIT === '1' ? [{ name: 'webkit', browserType: webkit, options: {}, profiles: PROFILES }] : [])];
  for (const [name, enable] of [['firefox', 'QRSCAN_TEST_FIREFOX=1'], ['webkit', 'QRSCAN_TEST_WEBKIT=1']]) {
    if (!overlayRuntimes.some(runtime => runtime.name === name)) receipt.overlay.notRun.push({ runtime: name, witnesses: 'all', profiles: PROFILES, reason: `${enable} runs them` });
  }
  const overlayTruth = loadTruth();
  for (const runtime of overlayRuntimes) {
    phase(`${runtime.name}: overlay witnesses`);
    const browser = await runtime.browserType.launch({ headless: true, timeout: 30_000, ...runtime.options });
    try {
      const { record, failures } = await overlayWitnesses({ browser, base, runtime: runtime.name, profiles: runtime.profiles,
        exactProfiles: runtime.exactProfiles ?? runtime.profiles, truth: overlayTruth, judge,
        versions: { scanner: manifest.version, pipeline: 5, score_contract: 5 }, bytesOf: testCase => [...caseBytes(testCase)],
        recordsFile: join(root, 'fixtures/symbology/CONTENT-FIXTURES.md'), normalize, phase });
      const { defaultBudget, ...judged } = record;
      receipt.overlay.runtimes[runtime.name] = { browser: browser.version(), ...judged };
      receipt.overlay.failures.push(...failures);
      // The default-budget effects runs: what the detector read with and without the overlay.
      (measurements[runtime.name] ??= {}).overlayEffectsDefaultBudget = defaultBudget;
      const skipped = PROFILES.filter(profile => !runtime.profiles.includes(profile));
      if (skipped.length) receipt.overlay.notRun.push({ runtime: runtime.name, witnesses: 'scenes A-H and the effects witness', profiles: skipped, reason: 'time: the frame profile runs instead' });
      const shown = list => list.join('/');
      if (record.camera.ok) passed.push(`${runtime.name}: importing ./camera-overlay at page load, then an overlay created, updated and destroyed, call no getUserMedia, enumerateDevices or getDisplayMedia`);
      if (record.exact.length && record.exact.every(item => item.ok)) {
        const sets = [...new Map(record.exact.map(item => [item.witness.replace(/^exact set: /, ''), item.contents])).entries()];
        passed.push(`${runtime.name}: exact symbol sets judged against fixtures/consumer-truth.json and the fixture records it cites (a missing or extra detection, or a position, score or flag off its truth, fails), installed module, no time budget, ${shown(runtime.exactProfiles ?? runtime.profiles)}: ${sets.map(([label, contents]) => `${label}: ${contents.map(([symbology, text]) => `${symbology} ${text}`).join(' + ')}`).join('; ')}`);
      }
      const scenesPassed = [...new Set(record.scenes.map(item => item.witness))].filter(witness => record.scenes.every(item => item.witness !== witness || item.ok));
      if (scenesPassed.length) passed.push(`${runtime.name}: through scan_frame, the shipped tracker and overlay on a fake clock, every frame judged against its truth and the scene's layout (${shown(runtime.profiles)}): ${scenesPassed.map(witness => witness.replace(/^scene /, '')).join(', ')}`);
      if (record.effects.length && record.effects.every(item => item.ok)) passed.push(`${runtime.name}: with the overlay's strongest effects (dim 0.85, blur 24, wash 0.25, glow 1) and thumbnails on, the detector read the same RGBA (SHA-256) and returned the same reports, timings removed, as with no overlay, frame by frame (${shown(runtime.profiles)}, no time budget); the default budgets are measured only`);
      if (record.closing.ok) passed.push(`${runtime.name}: no witness requested a camera and the page reported no error`);
    } finally { await browser.close(); }
  }
  // Every overlay witness ran in every browser above; any one that failed fails the run here.
  phase('overlay witness verdict');
  assert.deepEqual(receipt.overlay.failures.map(({ runtime, witness, profile }) => `${runtime}: ${witness}${profile ? ` (${profile})` : ''}`), [],
    `overlay witnesses failed:\n${receipt.overlay.failures.map(({ runtime, witness, profile, message }) =>
      `${runtime}: ${witness}${profile ? ` (${profile})` : ''}: ${message}`).join('\n')}`);
} finally {
  await new Promise(resolveClose => server.httpServer.close(resolveClose));
  await new Promise(resolveClose => exampleSite.server.close(resolveClose));
  await new Promise(resolveClose => exampleStubSite.server.close(resolveClose));
  await new Promise(resolveClose => cspSite.server.close(resolveClose));
  await new Promise(resolveClose => cameraPathsSite.server.close(resolveClose));
}
phase(null);
receipt.ok = true;
writeReceipt(); console.log(JSON.stringify({ output, consumer, passed: passed.length, runs: runs.map(({runtime,browser,selected}) => ({runtime,browser,selected})) }));
