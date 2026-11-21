// A build's scanner page in Playwright's Firefox (Gecko) or WebKit, under the extension's own
// policy.
//
//   node test/engine-page.mjs [--browser firefox|webkit] [--extension DIR] [--out build/acceptance]
//                             [--headed]
//
// Playwright can install neither a Firefox add-on nor a Safari extension, so this test does not
// load the extension. It serves the unpacked build (build/firefox for Firefox, build/safari for
// WebKit) over HTTP with the manifest's extension_pages policy as the Content-Security-Policy of
// every response, opens scanner.html, and checks what the engine itself decides: the module
// worker starts, the WebAssembly module compiles under 'wasm-unsafe-eval',
// the mixed fixture reads in fast, frame and full, an image with no code empties the result and
// a file that is not an image is an error. A control run serves the same files with that policy
// minus 'wasm-unsafe-eval' and expects the scanner to refuse to load, which shows the policy is
// enforced. The menu item, the popup and the per-site permission are not covered here.
// Writes fast.json, frame.json, full.json and page.json under OUT/firefox-page or
// OUT/webkit-page.
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { firefox, webkit } from 'playwright';
import { encodePng } from '../scripts/bytes.mjs';
import {
  ENGINE, HERE, check, checkCount, finished, option, pageFacts, readState, ready, stageFixture,
  threeProfiles,
} from './page-contract.mjs';

const ENGINES = {
  firefox: { launcher: firefox, engine: 'Gecko', build: 'firefox', settings: 'gecko' },
  webkit: { launcher: webkit, engine: 'WebKit', build: 'safari', settings: 'safari' },
};
const browserName = option('--browser', 'firefox');
const chosen = ENGINES[browserName];
if (!chosen) throw new Error(`--browser is firefox or webkit, not ${browserName}`);
const extensionDir = resolve(option('--extension', join(HERE, 'build', chosen.build)));
const out = resolve(option('--out', join(HERE, 'build', 'acceptance')));
const headed = process.argv.includes('--headed');
const record = `${browserName}-page`;

const manifest = JSON.parse(readFileSync(join(extensionDir, 'manifest.json'), 'utf8'));
const policy = manifest.content_security_policy.extension_pages;
const settings = manifest.browser_specific_settings?.[chosen.settings];
check(settings && policy.includes("'wasm-unsafe-eval'"),
  `the ${chosen.build} manifest has its ${chosen.settings} settings and allows WebAssembly `
  + 'compilation only', policy);
const withoutWasm = policy.replace(" 'wasm-unsafe-eval'", '');

const stageDir = mkdtempSync(join(tmpdir(), `qrscan-${record}-`));
const fixture = stageFixture(stageDir);
const blankPath = join(stageDir, 'blank.png');
writeFileSync(blankPath, encodePng(64, 64, new Uint8Array(64 * 64 * 4).fill(255)));
const notImagePath = join(stageDir, 'notes.png');
writeFileSync(notImagePath, 'this is text, not an image\n');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.wasm': 'application/wasm', '.md': 'text/plain',
};

/** A static server of the unpacked build, every response under `csp`. */
async function serve(csp) {
  const server = createServer((request, response) => {
    const path = normalize(join(extensionDir, decodeURIComponent(new URL(request.url,
      'http://x').pathname)));
    const inside = path.startsWith(extensionDir + sep);
    const file = inside && statSync(path, { throwIfNoEntry: false })?.isFile();
    if (request.method !== 'GET' || !file) {
      response.writeHead(404, { 'content-security-policy': csp });
      response.end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
      'content-security-policy': csp, 'cache-control': 'no-store' });
    response.end(readFileSync(path));
  });
  await new Promise((done) => { server.listen(0, '127.0.0.1', done); });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

const browser = await chosen.launcher.launch({ headless: !headed });
const browserVersion = browser.version();

// ------------------------------------------------------------------ the extension's policy

const { server, base } = await serve(policy);
const page = await browser.newPage();
const messages = [];
page.on('console', (message) => { messages.push(`${message.type()}: ${message.text()}`); });
page.on('pageerror', (error) => { messages.push(`pageerror: ${error.message}`); });
await page.goto(`${base}/scanner.html`);
let seen = await ready(page);
check(seen.state === 'ready',
  `${chosen.engine} starts the worker and compiles the module under the policy`, seen.summary);
await threeProfiles(page, browserName, join(out, record),
  () => page.setInputFiles('#file', fixture));
const facts = await pageFacts(page, join(out, record),
  { name: browserName, version: browserVersion });
check(facts.package.engine_version === ENGINE && facts.package.version === ENGINE,
  'the page names the package and the engine it loaded', facts.package);

seen = await readState(page);
await page.setInputFiles('#file', blankPath);
seen = await finished(page, seen.scan);
check(seen.state === 'empty' && seen.shown.length === 0,
  'an image without a code: empty, and the previous codes are gone', seen.summary);
await page.setInputFiles('#file', notImagePath);
seen = await finished(page, seen.scan);
check(seen.state === 'error' && seen.shown.length === 0 && seen.json === '',
  'a file that is not an image: an error, nothing shown', seen.summary);
const refused = messages.filter((line) => /content[- ]security|CSP|blocked/i.test(line));
check(refused.length === 0, 'no policy refusal was reported', refused);
await page.close();
server.close();

// ------------------------------------------------------------------ control

const control = await serve(withoutWasm);
const controlPage = await browser.newPage();
await controlPage.goto(`${control.base}/scanner.html`);
seen = await ready(controlPage);
check(seen.state === 'error' && seen.summary.includes('could not load'),
  'control: without \'wasm-unsafe-eval\' the same page refuses to compile the module',
  seen.summary);
await controlPage.close();
control.server.close();

await browser.close();
writeFileSync(join(out, `${record}-run.json`), `${JSON.stringify({
  checks: checkCount(), extension: extensionDir, fixture,
  browser: `${browserName} ${browserVersion}`,
  policy, control_policy: withoutWasm,
}, null, 2)}\n`);
console.log(`${checkCount()} checks passed`);
