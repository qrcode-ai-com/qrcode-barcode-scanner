// The store images, captured from the real build in Playwright's Chromium.
//
//   node scripts/store-images.mjs [--extension build/chrome] [--out listing/images] [--headed]
//
// Run `npm run build` first. The script loads the unpacked extension, reads the mixed fixture in
// it and writes, under OUT:
//   screenshot-1-scan-1280x800.png    the scanner tab after reading the fixture, both codes listed
//   screenshot-2-popup-1280x800.png   the toolbar popup with the same result, drawn over a page
//                                     that shows the image (the popup itself is a capture)
//   screenshot-3-menu-1280x800.png    the tab that "Scan this image" opens, naming the image's site
//   screenshot-4-report-1280x800.png  the full JSON report of that scan
//   promo-small-440x280.png           the small promotional tile
//   promo-marquee-1400x560.png        the marquee promotional tile
// The screenshots are full-bleed 1280 x 800 PNGs, a size the Chrome Web Store, Edge Add-ons and
// Firefox Add-ons all accept. Every address shown is on example.com: Chromium resolves those names
// to the local test server. Pixels depend on the machine's fonts; sizes and content do not. The
// committed images in listing/images were made with this script.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { drawIcon } from './icons.mjs';
import { NAME } from './manifest.mjs';
import {
  EXPECTED, HERE, check, finished, option, readState, ready, same, stageFixture,
} from '../test/page-contract.mjs';

const extensionDir = resolve(option('--extension', join(HERE, 'build', 'chrome')));
const out = resolve(option('--out', join(HERE, 'listing', 'images')));
const headed = process.argv.includes('--headed');
mkdirSync(out, { recursive: true });

const fixture = stageFixture(mkdtempSync(join(tmpdir(), 'qrscan-store-images-')));
const fixtureBytes = readFileSync(fixture);
const iconUrl = `data:image/png;base64,${drawIcon(256).toString('base64')}`;
const COLOURS = { night: '#070a16', panel: '#101629', violet: '#a98bff', teal: '#43dfd2',
  text: '#f5f5ff', muted: '#a2aec7' };

// ------------------------------------------------------------------ scenes

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** A page as a site shows it: an article with the image of the two codes. */
const shopPage = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Shipping label</title><link rel="icon" href="data:,"><style>
body { margin: 0; font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #1b2235; background: #f6f7fb; }
header { padding: 18px 48px; background: #fff; border-bottom: 1px solid #e2e5ef;
  font-weight: 600; }
article { max-width: 760px; margin: 40px 48px; background: #fff; border: 1px solid #e2e5ef;
  border-radius: 12px; padding: 28px 32px; }
h1 { font-size: 26px; margin: 0 0 8px; } p { color: #4b5570; margin: 0 0 20px; }
img { display: block; width: 560px; border-radius: 8px; border: 1px solid #e2e5ef; }
</style></head><body><header>shop.example.com</header><article>
<h1>Shipping label, order 4827</h1>
<p>The label holds a QR code with the tracking link and a Code 128 barcode with the stock number.</p>
<img src="http://images.example.com/cors/label.png" alt="A QR code and a Code 128 barcode">
</article></body></html>`;

// The page area of the window below, where a captured page is drawn at its own size: the whole
// image less the 52 px toolbar and its 1 px line.
const PAGE = { width: 1280, height: 747 };

/**
 * A neutral window filling the image, as the Chrome Web Store asks (full bleed, square corners,
 * no padding): a toolbar with the address and the extension's button, then a page.
 */
function windowScene({ inner, popup, address = 'shop.example.com/orders/4827' }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon"
href="data:,"><style>
html, body { margin: 0; width: 1280px; height: 800px; overflow: hidden; }
body { background: ${COLOURS.night}; font: 15px system-ui, -apple-system, 'Segoe UI', Roboto,
  sans-serif; }
.window { position: absolute; inset: 0; overflow: hidden; background: #fff; }
.bar { height: 52px; display: flex; align-items: center; gap: 14px; padding: 0 18px;
  background: #eceef5; border-bottom: 1px solid #d5d9e8; }
.dots { display: flex; gap: 8px; } .dots i { width: 12px; height: 12px; border-radius: 50%;
  background: #c4c8d6; display: block; }
.address { flex: 1; height: 32px; border-radius: 16px; background: #fff; color: #4b5570;
  display: flex; align-items: center; padding: 0 16px; border: 1px solid #d5d9e8; }
.button { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center;
  background: ${popup ? '#d9d2fb' : 'transparent'}; }
.button img { width: 22px; height: 22px; }
iframe, .page { border: 0; width: ${PAGE.width}px; height: ${PAGE.height}px; display: block; }
.popup { position: absolute; top: 50px; right: 18px; width: 400px; border-radius: 12px;
  overflow: hidden; box-shadow: 0 18px 50px rgba(7, 10, 22, .35); border: 1px solid #d5d9e8; }
.popup img { display: block; width: 400px; }
</style></head><body><div class="window"><div class="bar"><div class="dots"><i></i><i></i><i>
</i></div><div class="address">${escape(address)}</div><div class="button"><img
src="${iconUrl}" alt=""></div></div>${inner}</div>
${popup ? `<div class="popup"><img src="${popup}" alt=""></div>` : ''}</body></html>`;
}

function tile(width, height) {
  const large = width > 1000;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
body { background: radial-gradient(circle at 18% 30%, #1d1f4a 0, ${COLOURS.night} 60%);
  color: ${COLOURS.text}; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  display: flex; align-items: center; gap: ${large ? 64 : 22}px;
  padding: 0 ${large ? 110 : 30}px; box-sizing: border-box; }
img { width: ${large ? 300 : 120}px; height: ${large ? 300 : 120}px; flex: none; }
h1 { margin: 0 0 ${large ? 18 : 8}px; font-size: ${large ? 64 : 27}px; line-height: 1.08;
  font-weight: 700; letter-spacing: -0.01em; }
p { margin: 0; font-size: ${large ? 28 : 14}px; line-height: 1.4; color: ${COLOURS.muted}; }
b { color: ${COLOURS.teal}; font-weight: 600; }
</style></head><body><img src="${iconUrl}" alt=""><div><h1>${escape(NAME)}</h1>
<p>${large ? 'Reads QR codes and barcodes in images.<br>' : 'QR codes and barcodes in images.<br>'}<b>Runs in your browser.</b> Open source.</p>
</div></body></html>`;
}

// ------------------------------------------------------------------ server

const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://x').pathname;
  if (path === '/orders/4827') {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(shopPage);
  } else if (path === '/cors/label.png') {
    response.writeHead(200, { 'content-type': 'image/png', 'access-control-allow-origin': '*' });
    response.end(fixtureBytes);
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((done) => { server.listen(0, '127.0.0.1', done); });
const port = server.address().port;
const shop = 'http://shop.example.com/orders/4827';

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: !headed,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`,
    `--host-resolver-rules=MAP shop.example.com 127.0.0.1:${port}, `
    + `MAP images.example.com 127.0.0.1:${port}`],
});
let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(worker.url()).host}`;

async function scanFile(page) {
  const before = (await readState(page)).scan;
  await page.setInputFiles('#file', fixture);
  const seen = await finished(page, before);
  check(seen.state === 'result' && same(seen.shown, EXPECTED), 'the fixture reads as expected',
    seen.shown);
}

async function shoot(page, name, size) {
  await page.screenshot({ path: join(out, name), clip: { x: 0, y: 0, ...size } });
  console.log(`wrote ${join(out, name)}`);
}

/** A capture of `page` at the window's page size, drawn in the window under `address`. */
async function framed(page, name, address) {
  await page.setViewportSize(PAGE);
  const png = await page.screenshot({ clip: { x: 0, y: 0, ...PAGE } });
  const scene = await context.newPage();
  await scene.setContent(windowScene({ address,
    inner: `<img class="page" src="data:image/png;base64,${png.toString('base64')}" alt="">` }));
  await scene.waitForTimeout(200);
  await shoot(scene, name, { width: 1280, height: 800 });
  await scene.close();
}
const EXTENSION_PAGE = `${NAME} · extension page`;

// 1 · the scanner tab after reading the fixture.
const tab = await context.newPage();
await tab.setViewportSize(PAGE);
await tab.goto(`${base}/scanner.html`);
await ready(tab);
await scanFile(tab);
await framed(tab, 'screenshot-1-scan-1280x800.png', EXTENSION_PAGE);

// 2 · the popup, captured alone, then drawn over the page that shows the image.
const popup = await context.newPage();
await popup.setViewportSize({ width: 400, height: 600 });
await popup.goto(`${base}/scanner.html?view=popup`);
await ready(popup);
await scanFile(popup);
const popupPng = await popup.screenshot({ fullPage: true });
const scene = await context.newPage();
await scene.setContent(windowScene({
  inner: `<iframe src="${shop}"></iframe>`,
  popup: `data:image/png;base64,${popupPng.toString('base64')}`,
}));
await scene.frameLocator('iframe').locator('img').waitFor();
await scene.waitForTimeout(500);
await shoot(scene, 'screenshot-2-popup-1280x800.png', { width: 1280, height: 800 });

// 3 · "Scan this image" on the page: the background handler, called as a click calls it.
const shopTab = await context.newPage();
await shopTab.goto(shop);
const clicked = await worker.evaluate(async () => (await chrome.tabs.query({}))
  .sort((a, b) => b.id - a.id)[0]);
const opened = context.waitForEvent('page');
await worker.evaluate(({ src, page, info }) => onMenuClicked(
  { menuItemId: 'scan-image', srcUrl: src, pageUrl: page }, info),
{ src: 'http://images.example.com/cors/label.png', page: shop, info: clicked });
const menuPage = await opened;
await menuPage.setViewportSize(PAGE);
await menuPage.waitForFunction(
  () => Number(document.getElementById('report-json').dataset.scan) > 0, undefined,
  { timeout: 120000 });
const menuState = await readState(menuPage);
check(menuState.state === 'result' && same(menuState.shown, EXPECTED)
  && await menuPage.textContent('#source-title') === 'Image from images.example.com',
'the menu tab reads the image and names its site', menuState.summary);
await framed(menuPage, 'screenshot-3-menu-1280x800.png', EXTENSION_PAGE);

// 4 · the full report of that scan, opened.
await menuPage.evaluate(() => {
  document.getElementById('report').open = true;
  document.getElementById('report').scrollIntoView({ block: 'start' });
});
await menuPage.waitForTimeout(300);
await framed(menuPage, 'screenshot-4-report-1280x800.png', EXTENSION_PAGE);

// 5 · the promotional tiles.
for (const [width, height, name] of [[440, 280, 'promo-small-440x280.png'],
  [1400, 560, 'promo-marquee-1400x560.png']]) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.setContent(tile(width, height));
  await shoot(page, name, { width, height });
}

await context.close();
server.close();
