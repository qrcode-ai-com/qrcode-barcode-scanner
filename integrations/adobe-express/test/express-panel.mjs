// SPDX-License-Identifier: MIT
// The built add-on package in Playwright's Chromium, in a test page that stands in for Adobe
// Express's add-on panel.
//
//   node test/express-panel.mjs [--zip build/...zip] [--out build/acceptance]
//                               [--shots build/screenshots] [--headed]
//
// The files are served from the zip itself, at an https origin of their own, as Adobe Express
// serves an add-on from its own subdomain. The Add-on UI SDK address
// (https://express.adobe.com/static/add-on-sdk/sdk.js) answers with a fake module: it gives the
// panel PNG renditions of test pages, the light and dark themes, and records each call. Adobe
// Express itself is not part of this test; running the package there is the owner's step. It
// checks:
//   load      the scanner worker starts the engine from the package and the buttons come alive
//   page      the current page is read in fast, frame and full, through createRenditions with the
//             current-page range, the PNG format and the preview intent
//   document  Scan all pages reads every page, and a page with no code says so
//   expected  the expected text marks each code as matching or not
//   file      an image file chosen in the panel is read; a file that is not an image is refused
//   states    a document with no code, and a rendition that Adobe Express fails to make
//   themes    the panel follows the light and dark themes (screenshots written to --shots)
//   network   every request is a file of the package or the SDK address; no error in the page
//   remove    the panel leaves no cookie or storage behind, and the page is closed
// The three reports are written to OUT/fast.json, OUT/frame.json and OUT/full.json for
// scripts/destination-acceptance.py to judge, with OUT/run.json for the facts above.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { encodePng } from '../scripts/png.mjs';
import { readZip } from '../scripts/zip.mjs';

const HERE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(HERE, '..', '..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const version = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8')).version;
const zipPath = resolve(option('--zip', join(HERE, 'build', `qrcode-barcode-scanner-adobe-express-${version}.zip`)));
const out = resolve(option('--out', join(HERE, 'build', 'acceptance')));
const shots = resolve(option('--shots', join(HERE, 'build', 'screenshots')));
const headed = process.argv.includes('--headed');

const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
const WASM_SHA256 = 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68';
const SDK_URL = 'https://express.adobe.com/static/add-on-sdk/sdk.js';
const ORIGIN = 'https://addon.example.com';
const PANEL = { width: 320, height: 640 };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };

let failures = 0;
const facts = { checks: [] };
function check(name, ok, detail = '') {
  facts.checks.push({ name, ok: Boolean(ok), detail: String(detail) });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures += 1;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ------------------------------------------------------------------ inputs

const stageDir = mkdtempSync(join(tmpdir(), 'qrscan-express-panel-'));
const fixturePath = execFileSync('python3', [join(ROOT, 'scripts', 'destination-acceptance.py'),
  'stage', stageDir], { encoding: 'utf8' }).trim();
const pages = {
  'mixed.png': readFileSync(fixturePath),
  'blank.png': encodePng(64, 64, new Uint8Array(64 * 64 * 4).fill(255)),
};
const entries = readZip(readFileSync(zipPath));

// The fake Add-on UI SDK, as an ES module. Anything the panel calls that is not here throws.
function sdkModule() {
  const files = Object.fromEntries(Object.entries(pages).map(([name, bytes]) => [name, bytes.toString('base64')]));
  return `const files = ${JSON.stringify(files)};
const bytes = (name) => Uint8Array.from(atob(files[name]), (c) => c.charCodeAt(0));
const host = { renditions: [], events: [], theme: [], pages: ['mixed.png'], current: 0, fail: null };
window.__host = host;
const constants = {
  Range: { currentPage: 'currentPage', entireDocument: 'entireDocument', specificPages: 'specificPages' },
  RenditionFormat: { png: 'image/png', jpg: 'image/jpeg', mp4: 'video/mp4', pdf: 'application/pdf' },
  RenditionIntent: { export: 'export', preview: 'preview', print: 'print' },
};
const app = {
  ui: { theme: 'light', locale: 'en-US' },
  on(name, listener) { host.events.push(name); if (name === 'themechange') host.theme.push(listener); },
  document: {
    async createRenditions(options, intent) {
      host.renditions.push({ options: { ...options }, intent });
      if (host.fail) { const message = host.fail; host.fail = null; throw new Error(message); }
      const names = options.range === constants.Range.entireDocument ? host.pages : [host.pages[host.current]];
      return names.map((name, index) => ({ type: 'page', title: 'Page ' + (index + 1),
        blob: new Blob([bytes(name)], { type: 'image/png' }) }));
    },
  },
};
host.setTheme = (theme) => { app.ui.theme = theme; for (const listener of host.theme) listener({ theme }); };
export default { ready: Promise.resolve(), app, constants };
`;
}

// ------------------------------------------------------------------ the page

const browser = await chromium.launch({ headless: !headed });
const context = await browser.newContext({ viewport: PANEL, deviceScaleFactor: 2 });
const requests = { files: [], sdk: 0, outside: [] };
await context.route(/.*/, async (route) => {
  const url = route.request().url();
  if (url === SDK_URL) {
    requests.sdk += 1;
    return route.fulfill({ status: 200, body: sdkModule(), headers: {
      'content-type': 'text/javascript; charset=utf-8', 'access-control-allow-origin': '*' } });
  }
  if (url.startsWith(`${ORIGIN}/`)) {
    const name = new URL(url).pathname.slice(1);
    requests.files.push(name);
    const body = entries.get(name);
    if (!body) return route.fulfill({ status: 404 });
    return route.fulfill({ status: 200, body, headers: { 'content-type': TYPES[extname(name)] ?? 'application/octet-stream' } });
  }
  requests.outside.push(url);
  return route.abort('blockedbyclient');
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
await page.goto(`${ORIGIN}/index.html`);

const host = () => page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__host, theme: window.__host.theme.length })));
const state = () => page.evaluate(() => {
  const result = document.querySelector('#result');
  return {
    state: result.dataset.state,
    scan: Number(result.dataset.scan),
    summary: document.querySelector('#summary').textContent,
    items: [...document.querySelectorAll('#items .item')].map((item) => ({
      heading: item.querySelector('h2')?.textContent ?? '',
      rows: [...item.querySelectorAll('.detection')].map((row) => [row.dataset.symbology,
        row.querySelector('.text').textContent]).sort(),
      error: item.querySelector('.error')?.textContent ?? null,
    })),
    links: document.querySelectorAll('#items a').length,
  };
});

async function finished(before) {
  await page.waitForFunction((n) => {
    const result = document.querySelector('#result');
    return Number(result.dataset.scan) === n && result.dataset.state !== 'scanning';
  }, before + 1, { timeout: 60000 });
  return state();
}

async function choose(profile) {
  await page.locator(`input[name="profile"][value="${profile}"]`).check({ force: true });
  await page.waitForSelector(`#profile[data-value="${profile}"]`, { state: 'attached' });
}

async function click(selector) {
  const before = (await state()).scan;
  await page.click(selector);
  return finished(before);
}

async function chooseFile(name, buffer, mimeType) {
  const before = (await state()).scan;
  await page.setInputFiles('#file', { name, mimeType, buffer });
  return finished(before);
}

mkdirSync(out, { recursive: true });
mkdirSync(shots, { recursive: true });

// ------------------------------------------------------------------ load
await page.waitForSelector('#about[data-engine-version="0.11.0"]', { state: 'attached', timeout: 60000 });
await page.waitForSelector('#result[data-state="ready"]', { state: 'attached' });
const about = await page.evaluate(() => ({ ...document.querySelector('#about').dataset }));
check('load: the worker starts the engine from the package', about.engineVersion === '0.11.0'
  && about.wasmSha256 === WASM_SHA256, JSON.stringify(about));
check('load: the buttons are enabled once the engine is ready', !(await page.isDisabled('#scan-page'))
  && !(await page.isDisabled('#scan-document')) && !(await page.isDisabled('#file')));
check('load: the panel follows theme changes', (await host()).events.includes('themechange'));

// ------------------------------------------------------------------ page
for (const profile of ['fast', 'frame', 'full']) {
  await choose(profile);
  const result = await click('#scan-page');
  const [item] = result.items;
  check(`page: ${profile} finds the two codes`, result.state === 'result' && result.items.length === 1
    && same(item.rows, EXPECTED), JSON.stringify(result.items));
  const shown = await page.evaluate(() => ({ ...document.querySelector('#report-json').dataset,
    text: document.querySelector('#report-json').textContent }));
  const report = JSON.parse(shown.text);
  const decoded = report.detections.map((row) => [row.symbology, row.content.text]).sort();
  check(`page: ${profile} report`, shown.profile === profile && same(decoded, EXPECTED)
    && report.trace?.budget_exhausted === false, `${report.detections.length} detections`);
  writeFileSync(join(out, `${profile}.json`), `${JSON.stringify(report, null, 2)}\n`);
}
let seen = await host();
check('page: each scan asked for a PNG preview rendition of the current page', seen.renditions.length === 3
  && seen.renditions.every((call) => same(call, { options: { range: 'currentPage', format: 'image/png' }, intent: 'preview' })),
  JSON.stringify(seen.renditions.at(-1)));
check('page: the decoded link is text, not a link', (await state()).links === 0);

// ------------------------------------------------------------------ expected and themes
await page.fill('#expected', 'STOCK-4827');
const badges = await page.evaluate(() => [...document.querySelectorAll('.detection')].map((row) => [row.dataset.symbology,
  row.querySelector('.badge')?.textContent ?? '']).sort());
check('expected: one code matches the expected text and the other differs', same(badges,
  [['code128', 'Matches'], ['qr_code', 'Differs']]), JSON.stringify(badges));
await page.screenshot({ path: join(shots, 'panel-light.png'), fullPage: true });
await page.evaluate(() => window.__host.setTheme('dark'));
const theme = await page.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor]);
await page.screenshot({ path: join(shots, 'panel-dark.png'), fullPage: true });
check('themes: the dark theme is applied', theme[0] === 'dark' && theme[1] === 'rgb(29, 29, 29)', theme.join(' '));
await page.evaluate(() => window.__host.setTheme('light'));
await page.fill('#expected', '');

// ------------------------------------------------------------------ document
await page.evaluate(() => { window.__host.pages = ['mixed.png', 'blank.png']; });
await choose('full');
let result = await click('#scan-document');
check('document: every page is read, and a page with no code says so', result.state === 'result'
  && same(result.items.map((item) => item.heading.split(':')[0]), ['Page 1', 'Page 2'])
  && same(result.items[0].rows, EXPECTED) && result.items[1].rows.length === 0, JSON.stringify(result.items));
seen = await host();
check('document: the rendition range is the entire document', seen.renditions.at(-1).options.range === 'entireDocument');

// ------------------------------------------------------------------ file
result = await chooseFile('codes.png', pages['mixed.png'], 'image/png');
check('file: a chosen image is read', result.state === 'result' && result.items[0].heading.startsWith('codes.png')
  && same(result.items[0].rows, EXPECTED), JSON.stringify(result.items));
result = await chooseFile('notes.png', Buffer.from('this is text, not an image\n'), 'image/png');
check('file: a file that is not an image is refused', result.state === 'error'
  && result.summary.includes('format the scanner does not read'), result.summary);
seen = await host();
check('file: a chosen file asks Adobe Express for no rendition', seen.renditions.length === 4);

// ------------------------------------------------------------------ states
await page.evaluate(() => { window.__host.pages = ['blank.png']; window.__host.current = 0; });
result = await click('#scan-page');
check('states: a page with no code', result.state === 'empty' && result.summary === 'No QR code or barcode found.', result.summary);
await page.evaluate(() => { window.__host.fail = 'rendition refused'; });
result = await click('#scan-page');
check('states: a rendition Adobe Express fails to make', result.state === 'error'
  && result.summary.includes('could not render the page: rendition refused'), result.summary);
check('states: the panel is usable again', !(await page.isDisabled('#scan-page')));

// ------------------------------------------------------------------ network and remove
check('network: every request is a file of the package or the SDK', requests.outside.length === 0
  && requests.sdk === 1 && requests.files.every((name) => entries.has(name))
  && requests.files.includes('scanner-worker.js'), JSON.stringify({ outside: requests.outside, files: requests.files }));
check('network: no error in the page', errors.length === 0, errors.join(' | '));
const storage = await context.storageState();
check('remove: no cookie and no storage left behind', storage.cookies.length === 0
  && storage.origins.every((origin) => origin.localStorage.length === 0), JSON.stringify(storage));
await context.close();
check('remove: the page is closed', page.isClosed());
await browser.close();

facts.zip = zipPath;
facts.files_served = [...new Set(requests.files)].sort();
writeFileSync(join(out, 'run.json'), `${JSON.stringify(facts, null, 2)}\n`);
rmSync(stageDir, { recursive: true, force: true });
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
