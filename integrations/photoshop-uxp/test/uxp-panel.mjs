// SPDX-License-Identifier: MIT
// The built plugin in Playwright's Chromium, in a test page that stands in for a Photoshop UXP
// panel.
//
//   node test/uxp-panel.mjs [--zip build/...zip] [--out build/acceptance]
//                           [--shots build/screenshots] [--headed]
//
// The files are served from the zip itself. Before the plugin loads, the page is made to look
// like UXP: TextDecoder, TextEncoder, performance, Worker, fetch and atob are removed, the
// asynchronous WebAssembly calls throw, and require('photoshop') and require('uxp') answer with
// stand-ins. The Photoshop stand-in holds test documents and gives their pixels through
// imaging.getPixels, only inside core.executeAsModal, cropped to sourceBounds and scaled to
// targetSize; the UXP stand-in records entrypoints.setup and answers the file picker. Photoshop
// itself is not part of this test; running the plugin there is the owner's step. It checks:
//   load       the engine starts synchronously from index.js, with the plugin's polyfills
//   document   the composite is read in fast, frame and full, as 8-bit sRGB with alpha matted
//   expected   the expected text marks each code as matching or not
//   themes     the panel takes Photoshop's theme colours (screenshots written to --shots)
//   selection  the selection's rectangle is read, and no selection says so
//   large      a document above 4096 x 4096 is asked for at a smaller size and still read
//   file       a picked image file is read, a file that is not an image is refused, and a closed
//              picker changes nothing
//   states     no document, a document with no code, and pixels Photoshop fails to give
//   network    every request is a file of the plugin, and the page reports no error
//   remove     the panel leaves no cookie or storage behind, and the page is closed
// The three reports are written to OUT/fast.json, OUT/frame.json and OUT/full.json for
// scripts/destination-acceptance.py to judge, with OUT/run.json for the facts above.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { decodePng, encodePng } from '../scripts/png.mjs';
import { readZip } from '../scripts/zip.mjs';

const HERE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(HERE, '..', '..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const version = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8')).version;
const zipPath = resolve(option('--zip', join(HERE, 'build', `qrcode-barcode-scanner-photoshop-${version}.zip`)));
const out = resolve(option('--out', join(HERE, 'build', 'acceptance')));
const shots = resolve(option('--shots', join(HERE, 'build', 'screenshots')));
const headed = process.argv.includes('--headed');

const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
const WASM_SHA256 = 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68';
const ORIGIN = 'https://plugin.example.com';
const PANEL = { width: 300, height: 720 };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png' };
// Photoshop's theme colours as the --uxp-host-* variables carry them, for the light and dark themes.
const THEMES = {
  light: { '--uxp-host-background-color': '#f0f0f0', '--uxp-host-text-color': '#323232',
    '--uxp-host-text-color-secondary': '#6e6e6e', '--uxp-host-border-color': '#c8c8c8',
    '--uxp-host-widget-hover-background-color': '#ffffff' },
  dark: { '--uxp-host-background-color': '#323232', '--uxp-host-text-color': '#e8e8e8',
    '--uxp-host-text-color-secondary': '#a8a8a8', '--uxp-host-border-color': '#5a5a5a',
    '--uxp-host-widget-hover-background-color': '#262626' },
};

let failures = 0;
const facts = { checks: [] };
function check(name, ok, detail = '') {
  facts.checks.push({ name, ok: Boolean(ok), detail: String(detail) });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures += 1;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ------------------------------------------------------------------ inputs

const stageDir = mkdtempSync(join(tmpdir(), 'qrscan-uxp-panel-'));
const fixturePath = execFileSync('python3', [join(ROOT, 'scripts', 'destination-acceptance.py'),
  'stage', stageDir], { encoding: 'utf8' }).trim();
const fixture = readFileSync(fixturePath);
const rgbOf = ({ width, height, rgba }) => {
  const rgb = Buffer.alloc(width * height * 3);
  for (let index = 0; index < width * height; index += 1) rgb.set(rgba.subarray(index * 4, index * 4 + 3), index * 3);
  return rgb;
};
const mixed = decodePng(fixture);
// The test documents: each one a raster of RGB pixels, shown at `scale` times its raster size.
const rasters = { mixed: rgbOf(mixed), blank: Buffer.alloc(64 * 64 * 3, 255) };
const documents = {
  mixed: { id: 1, title: 'Mixed.psd', raster: 'mixed', width: mixed.width, height: mixed.height, scale: 1 },
  blank: { id: 2, title: 'Blank.psd', raster: 'blank', width: 64, height: 64, scale: 1 },
  large: { id: 3, title: 'Large.psd', raster: 'mixed', width: mixed.width * 4, height: mixed.height * 4, scale: 4 },
};
const files = { 'codes.png': fixture, 'notes.png': Buffer.from('this is text, not an image\n') };
const entries = readZip(readFileSync(zipPath));

// Runs in the page before the plugin: the UXP shape and the two stand-in modules.
function uxpStandIn({ documents, rasterSizes }) {
  const realFetch = window.fetch.bind(window);
  const host = { setup: [], modal: [], getPixels: [], disposed: 0, inModal: false, active: 'mixed',
    selection: null, fail: null, pickers: [], reads: [], queue: [], asyncWasm: [] };
  window.__host = host;
  for (const name of ['TextDecoder', 'TextEncoder', 'Worker', 'fetch', 'atob']) delete window[name];
  Object.defineProperty(window, 'performance', { value: undefined, configurable: true, writable: true });
  for (const name of ['compile', 'instantiate', 'compileStreaming', 'instantiateStreaming']) {
    WebAssembly[name] = () => { host.asyncWasm.push(name); throw new Error(`WebAssembly.${name} is not used in UXP`); };
  }
  const rasters = {};
  const raster = async (name) => {
    if (!rasters[name]) rasters[name] = new Uint8Array(await (await realFetch(`/__host/raster/${name}`)).arrayBuffer());
    return rasters[name];
  };
  const photoshop = {
    app: {
      get activeDocument() {
        const doc = documents[host.active];
        if (!doc) return null;
        return { id: doc.id, title: doc.title, width: doc.width, height: doc.height, selection: { bounds: host.selection } };
      },
    },
    core: {
      async executeAsModal(fn, options) {
        host.modal.push(options);
        host.inModal = true;
        try { return await fn({ isCancelled: false }); } finally { host.inModal = false; }
      },
    },
    imaging: {
      async getPixels(options) {
        if (!host.inModal) throw new Error('getPixels outside a modal scope');
        host.getPixels.push(JSON.parse(JSON.stringify(options)));
        if (host.fail) { const message = host.fail; host.fail = null; throw new Error(message); }
        const doc = Object.values(documents).find((item) => item.id === options.documentID);
        const source = await raster(doc.raster);
        const [rw] = rasterSizes[doc.raster];
        const { left, top, right, bottom } = options.sourceBounds;
        const [w, h] = [right - left, bottom - top];
        const tw = options.targetSize?.width ?? w;
        const th = options.targetSize?.height ?? h;
        const data = new Uint8Array(tw * th * 3);
        for (let y = 0; y < th; y += 1) {
          const sy = Math.floor((top + ((y + 0.5) * h) / th) / doc.scale);
          for (let x = 0; x < tw; x += 1) {
            const sx = Math.floor((left + ((x + 0.5) * w) / tw) / doc.scale);
            const from = (sy * rw + sx) * 3;
            data[(y * tw + x) * 3] = source[from];
            data[(y * tw + x) * 3 + 1] = source[from + 1];
            data[(y * tw + x) * 3 + 2] = source[from + 2];
          }
        }
        return { imageData: { width: tw, height: th, components: 3, componentSize: 8, colorSpace: 'RGB',
          async getData() { return data; }, dispose() { host.disposed += 1; } } };
      },
    },
  };
  const uxp = {
    entrypoints: { setup(config) { host.setup.push(Object.keys(config.panels ?? {})); } },
    storage: {
      formats: { binary: 'binary', utf8: 'utf8' },
      localFileSystem: {
        async getFileForOpening(options) {
          host.pickers.push(options);
          const name = host.queue.shift();
          if (!name) return null;
          return { name, async read(readOptions) {
            host.reads.push(readOptions);
            return (await realFetch(`/__host/file/${name}`)).arrayBuffer();
          } };
        },
      },
    },
  };
  window.require = (name) => {
    if (name === 'photoshop') return photoshop;
    if (name === 'uxp') return uxp;
    throw new Error(`no module ${name} in UXP`);
  };
}

// ------------------------------------------------------------------ the page

const browser = await chromium.launch({ headless: !headed });
const context = await browser.newContext({ viewport: PANEL, deviceScaleFactor: 2 });
const requests = { files: [], host: [], outside: [] };
await context.route(/.*/, async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== ORIGIN) {
    requests.outside.push(url.href);
    return route.abort('blockedbyclient');
  }
  if (url.pathname.startsWith('/__host/')) {
    requests.host.push(url.pathname);
    const [, , kind, name] = url.pathname.split('/');
    const body = kind === 'raster' ? rasters[name] : files[name];
    return route.fulfill({ status: body ? 200 : 404, body: body ?? '', headers: { 'content-type': 'application/octet-stream' } });
  }
  const name = url.pathname.slice(1);
  requests.files.push(name);
  const body = entries.get(name);
  if (!body) return route.fulfill({ status: 404 });
  return route.fulfill({ status: 200, body, headers: { 'content-type': TYPES[extname(name)] ?? 'application/octet-stream' } });
});
await context.addInitScript(uxpStandIn, {
  documents,
  rasterSizes: Object.fromEntries(Object.entries({ mixed, blank: { width: 64, height: 64 } }).map(([name, image]) => [name, [image.width, image.height]])),
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function setTheme(name) {
  await page.evaluate((variables) => {
    for (const [key, value] of Object.entries(variables)) document.documentElement.style.setProperty(key, value);
  }, THEMES[name]);
}

await page.goto(`${ORIGIN}/index.html`);
await setTheme('light');

const host = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__host)));
const state = () => page.evaluate(() => {
  const result = document.querySelector('#result');
  return {
    state: result.getAttribute('data-state'),
    scan: Number(result.getAttribute('data-scan')),
    summary: document.querySelector('#summary').textContent,
    note: document.querySelector('#note').textContent,
    heading: document.querySelector('#items .item h2')?.textContent ?? '',
    rows: [...document.querySelectorAll('#items .detection')].map((row) => [row.getAttribute('data-symbology'),
      row.querySelector('.text').textContent]).sort(),
    links: document.querySelectorAll('#items a').length,
  };
});

async function click(selector) {
  const before = (await state()).scan;
  await page.click(selector);
  await page.waitForFunction((n) => {
    const result = document.querySelector('#result');
    return Number(result.getAttribute('data-scan')) === n && result.getAttribute('data-state') !== 'scanning';
  }, before + 1, { timeout: 90000 });
  return state();
}

const set = (values) => page.evaluate((entries) => Object.assign(window.__host, entries), values);

mkdirSync(out, { recursive: true });
mkdirSync(shots, { recursive: true });

// ------------------------------------------------------------------ load
await page.waitForSelector('#about[data-engine-version="0.11.0"]', { state: 'attached', timeout: 60000 });
await page.waitForSelector('#result[data-state="ready"]', { state: 'attached' });
const about = await page.evaluate(() => Object.fromEntries(['data-package', 'data-version', 'data-wasm-sha256',
  'data-engine-version'].map((name) => [name, document.querySelector('#about').getAttribute(name)])));
check('load: the engine starts from index.js', about['data-engine-version'] === '0.11.0'
  && about['data-wasm-sha256'] === WASM_SHA256, JSON.stringify(about));
const globals = await page.evaluate(() => [TextDecoder.name, TextEncoder.name, typeof performance.now, typeof Worker, typeof fetch]);
check('load: the plugin brings its own TextDecoder, TextEncoder and performance; no worker, no fetch',
  same(globals, ['Utf8Decoder', 'Utf8Encoder', 'function', 'undefined', 'undefined']), globals.join(' '));
let seen = await host();
check('load: the panel entry point is set up once', same(seen.setup, [['scanner']]), JSON.stringify(seen.setup));
check('load: the buttons are enabled once the engine is ready', !(await page.isDisabled('#scan-document'))
  && !(await page.isDisabled('#scan-selection')) && !(await page.isDisabled('#scan-file')));

// ------------------------------------------------------------------ document
for (const profile of ['fast', 'frame', 'full']) {
  await page.selectOption('#profile', profile);
  const result = await click('#scan-document');
  check(`document: ${profile} finds the two codes`, result.state === 'result' && same(result.rows, EXPECTED)
    && result.heading === `The document: ${mixed.width} x ${mixed.height} pixels`, JSON.stringify(result));
  const shown = await page.evaluate(() => ({ profile: document.querySelector('#report-json').getAttribute('data-profile'),
    text: document.querySelector('#report-json').textContent }));
  const report = JSON.parse(shown.text);
  const decoded = report.detections.map((row) => [row.symbology, row.content.text]).sort();
  check(`document: ${profile} report`, shown.profile === profile && same(decoded, EXPECTED)
    && report.trace?.budget_exhausted === false, `${report.detections.length} detections`);
  writeFileSync(join(out, `${profile}.json`), `${JSON.stringify(report, null, 2)}\n`);
}
seen = await host();
check('document: each scan asked for the whole composite as 8-bit sRGB, alpha matted, in a modal scope',
  seen.getPixels.length === 3 && seen.getPixels.every((call) => same(call, { documentID: 1,
    sourceBounds: { left: 0, top: 0, right: mixed.width, bottom: mixed.height }, colorSpace: 'RGB',
    colorProfile: 'sRGB IEC61966-2.1', componentSize: 8, applyAlpha: true }))
  && seen.modal.every((options) => options.commandName === 'Read QR codes and barcodes'), JSON.stringify(seen.getPixels[0]));
check('document: every image data is disposed', seen.disposed === 3, String(seen.disposed));
check('document: the decoded link is text, not a link', (await state()).links === 0);
await page.click('#toggle-report');
check('document: the full report opens', await page.isVisible('#report-json'));
await page.click('#toggle-report');

// ------------------------------------------------------------------ expected and themes
await page.fill('#expected', 'STOCK-4827');
const badges = await page.evaluate(() => [...document.querySelectorAll('.detection')].map((row) => [row.getAttribute('data-symbology'),
  row.querySelector('.badge')?.textContent ?? '']).sort());
check('expected: one code matches the expected text and the other differs', same(badges,
  [['code128', 'Matches'], ['qr_code', 'Differs']]), JSON.stringify(badges));
await page.screenshot({ path: join(shots, 'panel-light.png'), fullPage: true });
const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await setTheme('dark');
const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.screenshot({ path: join(shots, 'panel-dark.png'), fullPage: true });
check('themes: the panel takes Photoshop\'s theme colours', lightBackground === 'rgb(240, 240, 240)'
  && darkBackground === 'rgb(50, 50, 50)', `${lightBackground} ${darkBackground}`);
await page.fill('#expected', '');

// ------------------------------------------------------------------ selection
await page.selectOption('#profile', 'full');
await set({ selection: { left: -20, top: 0, right: 800, bottom: mixed.height } });
let result = await click('#scan-selection');
seen = await host();
check('selection: the selection\'s rectangle inside the canvas is read', same(seen.getPixels.at(-1).sourceBounds,
  { left: 0, top: 0, right: 800, bottom: mixed.height }) && result.heading === `The selection: 800 x ${mixed.height} pixels`,
JSON.stringify(seen.getPixels.at(-1).sourceBounds));
check('selection: only the barcode inside it is found', result.state === 'result'
  && same(result.rows, [['code128', 'STOCK-4827']]), JSON.stringify(result.rows));
await set({ selection: null });
const calls = (await host()).getPixels.length;
result = await click('#scan-selection');
check('selection: no selection says so, and asks Photoshop for nothing', result.state === 'error'
  && result.summary.startsWith('Make a selection') && (await host()).getPixels.length === calls, result.summary);

// ------------------------------------------------------------------ large
await set({ active: 'large' });
result = await click('#scan-document');
seen = await host();
const asked = seen.getPixels.at(-1).targetSize;
check('large: a document above 4096 x 4096 is asked for at a smaller size',
  asked && asked.width * asked.height <= 16_777_216 && asked.width < documents.large.width, JSON.stringify(asked));
check('large: it is still read, and the panel says it was scaled', result.state === 'result'
  && same(result.rows, EXPECTED) && result.note.includes('larger than 4096 x 4096'), JSON.stringify(result));
await set({ active: 'mixed' });

// ------------------------------------------------------------------ file
await set({ queue: ['codes.png'] });
result = await click('#scan-file');
seen = await host();
check('file: a picked image is read', result.state === 'result' && result.heading.startsWith('codes.png: PNG')
  && same(result.rows, EXPECTED), JSON.stringify(result));
check('file: the picker asks for image types and the file is read as binary',
  same(seen.pickers.at(-1), { types: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }) && same(seen.reads.at(-1), { format: 'binary' }),
  JSON.stringify(seen.pickers.at(-1)));
const shown = await state();
await set({ queue: [] });
result = await click('#scan-file');
check('file: a closed picker changes nothing', result.state === shown.state && result.summary === shown.summary
  && same(result.rows, shown.rows), JSON.stringify(result));
await set({ queue: ['notes.png'] });
result = await click('#scan-file');
check('file: a file that is not an image is refused', result.state === 'error'
  && result.summary.includes('format the scanner does not read'), result.summary);

// ------------------------------------------------------------------ states
await set({ active: null });
result = await click('#scan-document');
check('states: no open document', result.state === 'error' && result.summary === 'Open a document first.', result.summary);
await set({ active: 'blank' });
result = await click('#scan-document');
check('states: a document with no code', result.state === 'empty' && result.summary === 'No QR code or barcode found.', result.summary);
await set({ active: 'mixed', fail: 'the document is busy' });
result = await click('#scan-document');
check('states: pixels Photoshop fails to give', result.state === 'error'
  && result.summary === 'Photoshop could not give the pixels: the document is busy', result.summary);
check('states: the panel is usable again', !(await page.isDisabled('#scan-document')));
seen = await host();
check('states: no asynchronous WebAssembly call was made', seen.asyncWasm.length === 0, seen.asyncWasm.join(' '));

// ------------------------------------------------------------------ network and remove
check('network: every request is a file of the plugin', requests.outside.length === 0
  && requests.files.every((name) => entries.has(name)) && requests.files.includes('index.js'),
JSON.stringify({ outside: requests.outside, files: requests.files }));
check('network: no error in the page', errors.length === 0, errors.join(' | '));
const storage = await context.storageState();
check('remove: no cookie and no storage left behind', storage.cookies.length === 0
  && storage.origins.every((origin) => origin.localStorage.length === 0), JSON.stringify(storage));
await context.close();
check('remove: the page is closed', page.isClosed());
await browser.close();

facts.zip = zipPath;
facts.files_served = [...new Set(requests.files)].sort();
facts.stand_in_requests = [...new Set(requests.host)].sort();
writeFileSync(join(out, 'run.json'), `${JSON.stringify(facts, null, 2)}\n`);
rmSync(stageDir, { recursive: true, force: true });
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
