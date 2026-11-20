// The unpacked Chrome build in Playwright's Chromium, driven as a user would drive it.
//
//   node test/chromium.mjs [--extension build/chrome] [--out build/acceptance] [--headed]
//
// It loads the extension, then checks:
//   install   the permissions it holds, no site granted, the "Scan this image" menu item
//   popup     the toolbar page: choose the mixed fixture, read it in fast, frame and full
//   links     a decoded link is shown as text with an explicit button, and is never opened
//   copy      the copy buttons copy the exact decoded texts
//   states    an image with no code empties the previous result; a file that is not an image is
//             an error and shows nothing
//   drop      the tab page: drop the image file, then paste it as a screenshot would be
//   menu      the background's "Scan this image" handler, called with the address of an image as
//             a click would: an image its site lets others read (then fast, frame and full), a
//             data: image, another site's image that needs that site's permission, a blob: image,
//             and an expired request
//   network   every request goes to the local test server or stays inside the extension
//   remove    the extension uninstalls itself and its pages are gone
// The popup and menu reports are written as fast.json, frame.json and full.json, with page.json,
// under OUT/popup and OUT/menu, for scripts/destination-acceptance.py and
// scripts/check-demo-page.py to judge. Exits 1 on the first failed check.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { encodePng } from '../scripts/bytes.mjs';
import {
  ENGINE, EXPECTED, HERE, check, checkCount, finished, judge, option, pageFacts, readState, ready,
  same, stageFixture, threeProfiles,
} from './page-contract.mjs';

const extensionDir = resolve(option('--extension', join(HERE, 'build', 'chrome')));
const out = resolve(option('--out', join(HERE, 'build', 'acceptance')));
const headed = process.argv.includes('--headed');

// ------------------------------------------------------------------ inputs

const stageDir = mkdtempSync(join(tmpdir(), 'qrscan-extension-'));
const fixture = stageFixture(stageDir);
const fixtureBytes = readFileSync(fixture);
const base64 = fixtureBytes.toString('base64');
const blankPath = join(stageDir, 'blank.png');
writeFileSync(blankPath, encodePng(64, 64, new Uint8Array(64 * 64 * 4).fill(255)));
const notImagePath = join(stageDir, 'notes.png');
writeFileSync(notImagePath, 'this is text, not an image\n');

// One server reached by two names: 127.0.0.1 is the page's site, localhost is another site.
const served = [];
const server = createServer((request, response) => {
  served.push(`${request.method} ${request.headers.host.replace(/:\d+$/, '')}${request.url}`);
  if (request.url === '/page.html') {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><title>Codes</title><img src="/mixed.png" alt="Two codes">');
  } else if (request.url === '/mixed.png' || request.url === '/cors/mixed.png') {
    const headers = { 'content-type': 'image/png', 'cache-control': 'no-store' };
    if (request.url.startsWith('/cors/')) headers['access-control-allow-origin'] = '*';
    response.writeHead(200, headers);
    response.end(fixtureBytes);
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((done) => { server.listen(0, '127.0.0.1', done); });
const port = server.address().port;
const site = `http://127.0.0.1:${port}`;
const otherSite = `http://localhost:${port}`;

// ------------------------------------------------------------------ install

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: !headed,
  args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
});
const outside = [];
await context.route(/.*/, (route) => {
  const url = new URL(route.request().url());
  const local = ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === String(port);
  if (local || ['chrome-extension:', 'data:', 'blob:'].includes(url.protocol)) {
    return route.continue();
  }
  outside.push(`${route.request().method()} ${route.request().url()}`);
  return route.abort();
});

let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker');
const extensionId = new URL(worker.url()).host;
const base = `chrome-extension://${extensionId}`;
const browserVersion = context.browser()?.version() ?? null;
check(/^[a-p]{32}$/.test(extensionId), 'the extension loads with its service worker', extensionId);

const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
check(same(manifest.permissions, ['contextMenus', 'activeTab']) && !manifest.host_permissions,
  'it holds contextMenus and activeTab, and no host permission at install', manifest.permissions);
const granted = await worker.evaluate(() => chrome.permissions.getAll());
check(granted.origins.length === 0, 'no site is granted after install', granted.origins);
const menu = await worker.evaluate(async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await chrome.contextMenus.update('scan-image', {});
      return true;
    } catch {
      await new Promise((done) => { setTimeout(done, 100); });
    }
  }
  return false;
});
check(menu, 'the "Scan this image" menu item exists');

// ------------------------------------------------------------------ popup

const popup = await context.newPage();
await popup.setViewportSize({ width: 400, height: 640 });
await popup.goto(`${base}/scanner.html?view=popup`);
let seen = await ready(popup);
check(seen.state === 'ready', 'the popup loads the scanner', seen.summary);
await threeProfiles(popup, 'popup', join(out, 'popup'),
  () => popup.setInputFiles('#file', fixture));
const facts = await pageFacts(popup, join(out, 'popup'),
  { name: 'chromium', version: browserVersion });
check(facts.package.engine_version === ENGINE && facts.package.version === ENGINE,
  'the page names the package and the engine it loaded', facts.package);
mkdirSync(join(out, 'screenshots'), { recursive: true });
await popup.screenshot({ path: join(out, 'screenshots', 'popup-400.png'), fullPage: true });

const pagesBefore = context.pages().length;
const open = await popup.$$eval('.detection .open', (links) => links.map((link) => ({
  href: link.href, target: link.target, rel: link.rel })));
const button = { href: 'https://qrc-ai.com/76xMa', target: '_blank', rel: 'noopener noreferrer' };
check(same(open, [button]), 'the decoded link has one explicit open button', open);
check(context.pages().length === pagesBefore, 'no tab was opened for the decoded link');

// The clipboard is replaced by a recorder: the check is what the buttons hand to it.
await popup.evaluate(() => {
  window.copied = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text) => { window.copied.push(text); } },
  });
});
const copyButtons = popup.locator('.detection .copy');
for (let index = 0; index < await copyButtons.count(); index += 1) {
  await copyButtons.nth(index).click();
}
const copied = (await popup.evaluate(() => window.copied)).sort();
check(same(copied, EXPECTED.map((row) => row[1]).sort()), 'copy gives the exact decoded texts',
  copied);

seen = await readState(popup);
await popup.setInputFiles('#file', blankPath);
seen = await finished(popup, seen.scan);
check(seen.state === 'empty' && seen.shown.length === 0,
  'an image without a code: empty, and the previous codes are gone', seen);
await popup.setInputFiles('#file', notImagePath);
seen = await finished(popup, seen.scan);
check(seen.state === 'error' && seen.shown.length === 0 && seen.json === '',
  'a file that is not an image: an error, nothing shown', seen.summary);

// ------------------------------------------------------------------ drop and paste

const tab = await context.newPage();
await tab.setViewportSize({ width: 1280, height: 800 });
await tab.goto(`${base}/scanner.html`);
await ready(tab);
for (const how of ['drop', 'paste']) {
  const before = (await readState(tab)).scan;
  await tab.evaluate(({ data, kind }) => {
    const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'mixed-code128-qr.png', { type: 'image/png' }));
    const init = { bubbles: true, cancelable: true };
    if (kind === 'drop') {
      document.getElementById('drop').dispatchEvent(new DragEvent('drop', { ...init,
        dataTransfer: transfer }));
    } else {
      document.dispatchEvent(new ClipboardEvent('paste', { ...init, clipboardData: transfer }));
    }
  }, { data: base64, kind: how });
  judge(await finished(tab, before), how, await tab.inputValue('#profile'));
}
await tab.screenshot({ path: join(out, 'screenshots', 'result-1280x800.png') });

// ------------------------------------------------------------------ the menu item

const pageTab = await context.newPage();
await pageTab.goto(`${site}/page.html`);
// Without the tabs permission a query cannot filter by address: the newest tab is this page.
const tabInfo = await worker.evaluate(async () => (await chrome.tabs.query({}))
  .sort((a, b) => b.id - a.id)[0]);
check(Number.isInteger(tabInfo?.id), 'the test page is a tab', tabInfo);

async function fromMenu(srcUrl) {
  const opened = context.waitForEvent('page');
  const id = await worker.evaluate(({ src, page, clicked }) => onMenuClicked(
    { menuItemId: 'scan-image', srcUrl: src, pageUrl: page }, clicked),
  { src: srcUrl, page: `${site}/page.html`, clicked: tabInfo });
  const page = await opened;
  await page.waitForLoadState('domcontentloaded');
  check(page.url() === `${base}/scanner.html?request=${encodeURIComponent(id)}`,
    `the menu item opens the scanner page for ${srcUrl.slice(0, 32)}...`, page.url());
  return page;
}

const firstScan = (page) => page.waitForFunction(
  () => Number(document.getElementById('report-json').dataset.scan) > 0, undefined,
  { timeout: 120000 });

const corsPage = await fromMenu(`${otherSite}/cors/mixed.png`);
await firstScan(corsPage);
seen = await readState(corsPage);
check(seen.state === 'result' && same(seen.shown, EXPECTED),
  'menu: an image its site lets others read is scanned', seen.summary);
check(await corsPage.textContent('#source-title') === 'Image from localhost',
  'menu: the page names the site the image came from');
await threeProfiles(corsPage, 'menu', join(out, 'menu'));
await pageFacts(corsPage, join(out, 'menu'), { name: 'chromium', version: browserVersion });

const dataPage = await fromMenu(`data:image/png;base64,${base64}`);
await firstScan(dataPage);
seen = await readState(dataPage);
check(seen.state === 'result' && same(seen.shown, EXPECTED), 'menu: a data: image is scanned',
  seen.shown);

const closedPage = await fromMenu(`${otherSite}/mixed.png`);
await closedPage.waitForFunction(() => document.getElementById('source-message').textContent
  .length > 40, undefined, { timeout: 60000 });
const asked = await closedPage.evaluate(() => ({
  hidden: document.getElementById('allow-site').hidden,
  button: document.getElementById('allow-site').textContent,
  message: document.getElementById('source-message').textContent,
  scan: document.getElementById('result').dataset.scan,
}));
check(!asked.hidden && asked.button === 'Allow localhost'
  && asked.message.includes('does not let other sites read') && asked.scan === '0',
'menu: another site\'s closed image asks for that one site and scans nothing', asked);

const blobPage = await fromMenu(`blob:${site}/0d6c9a4e-0000-4000-8000-000000000000`);
await blobPage.waitForFunction(() => document.getElementById('source-message').textContent
  .includes('only inside the page'), undefined, { timeout: 60000 });
check(true, 'menu: a blob: image says it must be saved first');

const expired = await context.newPage();
await expired.goto(`${base}/scanner.html?request=unknown`);
await expired.waitForFunction(() => document.getElementById('source-message').textContent
  .includes('expired'), undefined, { timeout: 60000 });
check(true, 'an unknown or expired menu request says so');

// ------------------------------------------------------------------ network and removal

check(outside.length === 0, 'no request went beyond the local test server', outside);
const allowed = new Set(['GET 127.0.0.1/page.html', 'GET 127.0.0.1/mixed.png',
  'GET localhost/cors/mixed.png', 'GET localhost/mixed.png']);
check(served.every((line) => allowed.has(line)),
  'the only requests to a site are GETs of the page and of the clicked images', served);

const last = await context.newPage();
await last.goto(`${base}/scanner.html`);
// The uninstall closes the page that asked for it, sometimes before the call returns.
await last.evaluate(() => chrome.management.uninstallSelf({ showConfirmDialog: false }))
  .catch(() => {});
await new Promise((done) => { setTimeout(done, 1500); });
let gone;
const probe = await context.newPage();
try {
  const response = await probe.goto(`${base}/scanner.html`, { timeout: 10000 });
  gone = response === null || !response.ok();
} catch {
  gone = true;
}
check(gone && context.serviceWorkers().every((sw) => !sw.url().startsWith(base)),
  'after uninstallSelf the extension pages and worker are gone');

await context.close();
server.close();
writeFileSync(join(out, 'chromium-run.json'), `${JSON.stringify({
  checks: checkCount(), extension: extensionDir, fixture, browser: `chromium ${browserVersion}`,
  served,
}, null, 2)}\n`);
console.log(`${checkCount()} checks passed`);
