// The prefill form, submitted in a real browser without reaching CodePen:
//
//   node prefill.mjs URL_OF_PREFILL_HTML FOLDER [--channel NAME]
//
// Every request to codepen.io is answered here and never sent. For each of the two forms, the
// POSTed `data` field must be JSON whose html, css and js equal FOLDER's index.html, style.css
// and script.js byte for byte, with the Pen's title, its description and private false.
// Run it from a project that installed Playwright.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const args = process.argv.slice(2);
const channelAt = args.indexOf('--channel');
const channel = channelAt >= 0 ? args.splice(channelAt, 2)[1] : undefined;
const [url, folder] = args;
if (!url || !folder) {
  console.error('usage: node prefill.mjs URL_OF_PREFILL_HTML FOLDER [--channel NAME]');
  process.exit(2);
}
const { chromium } = createRequire(join(process.cwd(), 'package.json'))('playwright');

const ENDPOINTS = ['https://codepen.io/cpe/pen/define/', 'https://codepen.io/pen/define'];
const TITLE = 'QR Code & Barcode Scanner: browser image demo';
const files = {
  html: await readFile(join(folder, 'index.html'), 'utf8'),
  css: await readFile(join(folder, 'style.css'), 'utf8'),
  js: await readFile(join(folder, 'script.js'), 'utf8'),
};
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  if (!ok) failures.push(what);
};

const browser = await chromium.launch({ channel });
try {
  const context = await browser.newContext();
  const posted = [];
  // Nothing leaves for CodePen: the request is read and answered with a stub page.
  await context.route(/^https:\/\/([a-z0-9-]+\.)*codepen\.io\//, async (route) => {
    const request = route.request();
    posted.push({ url: request.url(), method: request.method(), body: request.postData() ?? '' });
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' });
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  const buttons = page.locator('form button[type="submit"]');
  check(await buttons.count() === ENDPOINTS.length, `${ENDPOINTS.length} forms`);
  for (let index = 0; index < ENDPOINTS.length; index += 1) {
    const opened = context.waitForEvent('page');
    await buttons.nth(index).click();
    const tab = await opened;
    await tab.waitForLoadState('load');
    await tab.close();
  }
  check(posted.length === ENDPOINTS.length, `${posted.length} requests reached the stub, none CodePen`);
  for (const [index, endpoint] of ENDPOINTS.entries()) {
    const sent = posted[index] ?? { url: null, method: null, body: '' };
    check(sent.url === endpoint && sent.method === 'POST', `form ${index + 1} POSTs to ${sent.url}`);
    const fields = new URLSearchParams(sent.body);
    check([...fields.keys()].join() === 'data', `form ${index + 1} sends one field, data`);
    let data = {};
    try { data = JSON.parse(fields.get('data') ?? ''); } catch (error) { check(false, `form ${index + 1}: data is not JSON (${error.message})`); }
    check(data.title === TITLE, `form ${index + 1}: title ${JSON.stringify(data.title)}`);
    check(data.private === false, `form ${index + 1}: private ${data.private}`);
    check(typeof data.description === 'string' && data.description.includes('github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0'),
      `form ${index + 1}: the description links the engine source`);
    for (const key of ['html', 'css', 'js']) {
      check(data[key] === files[key], `form ${index + 1}: ${key} equals the file byte for byte (${Buffer.byteLength(data[key] ?? '')} bytes)`);
    }
  }
  await context.close();
} finally {
  await browser.close();
}
console.log(failures.length === 0 ? 'prefill: every check passed' : `prefill: ${failures.length} check(s) failed`);
process.exit(failures.length === 0 ? 0 : 1);
