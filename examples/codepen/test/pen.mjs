// Checks of the CodePen demo beyond the page contract, in a real browser:
//
//   node pen.mjs URL FIXTURE NOT_AN_IMAGE OUT_DIR [--channel NAME]
//
// 1. The page loads the scanner in a module worker, from the pinned jsDelivr files only, and
//    scans the tagged sample in fast, frame and full: both codes, engine 0.11.0, no budget cut.
//    Every request it makes outside URL is one of the pinned addresses.
// 2. A file dropped on the drop zone is scanned.
// 3. A file that is not an image gives an input error with its QRS code.
// 4. A page that cannot start a worker scans on the page instead.
// 5. A module whose bytes are not the pinned ones is refused: nothing is scanned.
// It writes a screenshot of check 1 to OUT_DIR. Run it from a project that installed Playwright.
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
const channelAt = args.indexOf('--channel');
const channel = channelAt >= 0 ? args.splice(channelAt, 2)[1] : undefined;
const [url, fixture, notImage, out] = args;
if (!url || !fixture || !notImage || !out) {
  console.error('usage: node pen.mjs URL FIXTURE NOT_AN_IMAGE OUT_DIR [--channel NAME]');
  process.exit(2);
}
const { chromium } = createRequire(join(process.cwd(), 'package.json'))('playwright');

const CDN = 'https://cdn.jsdelivr.net/npm/@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0/';
const SAMPLE = 'https://cdn.jsdelivr.net/gh/qrcode-ai-com/qrcode-barcode-scanner-rust@v0.11.0/fixtures/symbology/mixed-code128-qr.png';
const WASM_SHA256 = 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68';
const CODES = ['code128:STOCK-4827', 'qr_code:https://qrc-ai.com/76xMa'];
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  if (!ok) failures.push(what);
};

async function opened(browser, { init, route } = {}) {
  const context = await browser.newContext();
  const requests = [];
  context.on('request', (request) => requests.push(request.url()));
  if (init) await context.addInitScript(init);
  if (route) await context.route(route.pattern, route.handler);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { context, page, requests, errors };
}

const sampleDone = (page) => page.waitForFunction(() => {
  const state = document.getElementById('sample-status').dataset.state;
  return state === 'pass' || state === 'fail' || state === 'error';
}, null, { timeout: 180000 });

async function judgeSample(page, runtime, label) {
  await sampleDone(page);
  const facts = await page.evaluate(() => ({
    status: document.getElementById('sample-status').dataset.state,
    said: document.getElementById('sample-status').textContent,
    rows: [...document.querySelectorAll('#sample-table tbody tr')].map((row) => ({
      profile: row.dataset.profile, state: row.dataset.state, codes: row.dataset.codes,
      budget: row.dataset.budgetExhausted, engine: row.dataset.engine })),
    engine: document.getElementById('engine-version').textContent,
    runtime: document.getElementById('runtime').textContent,
    wasm: document.getElementById('wasm-sha256').textContent,
  }));
  check(facts.status === 'pass', `${label}: the sample passes (${facts.status}: ${facts.said})`);
  for (const row of facts.rows) {
    check(row.state === 'pass' && row.codes === JSON.stringify(CODES) && row.budget === 'false' &&
      row.engine === '0.11.0', `${label}: ${row.profile} returns ${row.codes}, budget_exhausted ${row.budget}, engine ${row.engine}`);
  }
  check(facts.rows.map((row) => row.profile).join() === 'fast,frame,full', `${label}: the three profiles`);
  check(facts.engine === '0.11.0', `${label}: engine version ${facts.engine}`);
  check(facts.runtime === runtime, `${label}: runs in ${facts.runtime}`);
  check(facts.wasm === WASM_SHA256, `${label}: WASM SHA-256 ${facts.wasm}`);
}

async function lastScan(page, before) {
  await page.waitForFunction((count) => {
    const result = document.getElementById('result');
    return Number(result.dataset.scan) > count && !['scanning', 'loading', 'ready'].includes(result.dataset.state);
  }, before, { timeout: 120000 });
  return page.evaluate(() => {
    const result = document.getElementById('result');
    const json = document.getElementById('report-json').textContent;
    return { state: result.dataset.state, error: result.dataset.error ?? null, code: result.dataset.code ?? null,
      summary: document.getElementById('summary').textContent, report: json ? JSON.parse(json) : null };
  });
}

const scanCount = (page) => page.evaluate(() => Number(document.getElementById('result').dataset.scan));
const codesOf = (report) => report.detections.map((row) => `${row.symbology}:${row.content.text}`).sort();

const browser = await chromium.launch({ channel });
try {
  await mkdir(out, { recursive: true });
  const origin = new URL(url).origin;

  // 1. The page as a visitor opens it.
  {
    const { context, page, requests, errors } = await opened(browser);
    await judgeSample(page, 'a module worker', 'worker');
    const outside = [...new Set(requests)].filter((address) => !address.startsWith(origin) &&
      !address.startsWith('blob:') && !address.startsWith('data:'));
    const unexpected = outside.filter((address) => !address.startsWith(CDN) && address !== SAMPLE);
    check(unexpected.length === 0, `requests outside the page: only the pinned CDN files and the sample (${unexpected.join(' ') || 'none other'})`);
    check(outside.includes(CDN + 'qrcode-barcode-scanner_bg.wasm') && outside.includes(CDN + 'auto.js'), 'the module and its loader come from the pinned CDN files');
    check(errors.length === 0, `no page error (${errors.join(' | ') || 'none'})`);
    await page.screenshot({ path: join(out, 'codepen-demo.png'), fullPage: true });

    // 2. A dropped file.
    const before = await scanCount(page);
    const bytes = [...await readFile(fixture)];
    const transfer = await page.evaluateHandle(([data, name]) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(data)], name, { type: 'image/png' }));
      return dt;
    }, [bytes, basename(fixture)]);
    await page.dispatchEvent('#drop-zone', 'drop', { dataTransfer: transfer });
    const dropped = await lastScan(page, before);
    check(dropped.state === 'result' && JSON.stringify(codesOf(dropped.report)) === JSON.stringify(CODES) &&
      dropped.report.trace.budget_exhausted === false, `a dropped image: ${dropped.state}, ${dropped.report ? codesOf(dropped.report).join(' ') : dropped.summary}`);

    // 3. A file that is not an image.
    const next = await scanCount(page);
    await page.setInputFiles('#file', notImage);
    const refused = await lastScan(page, next);
    check(refused.state === 'error' && refused.error === 'input' && /^QRS-\d{3}$/.test(refused.code ?? ''),
      `a file that is not an image: ${refused.state}, ${refused.error}, ${refused.code}: ${refused.summary}`);
    await context.close();
  }

  // 4. No worker: the same scans on the page.
  {
    const { context, page } = await opened(browser, {
      init: () => { window.Worker = function Worker() { throw new Error('workers are refused here'); }; },
    });
    await judgeSample(page, 'the page (no worker)', 'no worker');
    await context.close();
  }

  // 5. A module that is not the pinned one.
  {
    const { context, page } = await opened(browser, {
      // A module header followed by other bytes: served as the CDN serves the module.
      route: { pattern: `${CDN}qrcode-barcode-scanner_bg.wasm`, handler: (route) => route.fulfill({
        status: 200, contentType: 'application/wasm', headers: { 'access-control-allow-origin': '*' },
        body: Buffer.concat([Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]), Buffer.alloc(1024)]),
      }) },
    });
    await page.waitForFunction(() => document.getElementById('result').dataset.state !== 'loading', null, { timeout: 120000 });
    const facts = await page.evaluate(() => ({
      state: document.getElementById('result').dataset.state,
      error: document.getElementById('result').dataset.error,
      sample: document.getElementById('sample-status').dataset.state,
      engine: document.getElementById('engine-version').textContent,
    }));
    check(facts.state === 'error' && facts.error === 'loading' && facts.sample === 'error' && facts.engine === 'not loaded',
      `a changed module is refused before it runs: ${JSON.stringify(facts)}`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failures.length === 0 ? 'pen: every check passed' : `pen: ${failures.length} check(s) failed`);
process.exit(failures.length === 0 ? 0 : 1);
