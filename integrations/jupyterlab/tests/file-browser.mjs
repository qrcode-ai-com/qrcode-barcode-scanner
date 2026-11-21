// The file browser route, in a running JupyterLab: right-click the sample in the file browser,
// choose "Scan for QR codes and barcodes", and check that the panel reads that file (through the
// Jupyter server's contents API) and lists both codes, first with the default profile, then full.
//
//   node file-browser.mjs URL FILE_NAME OUT_JSON [--screenshot PNG] [--channel NAME]
//
// URL opens JupyterLab (http://127.0.0.1:PORT/lab), whose root folder holds FILE_NAME, the mixed
// fixture. Run it from a project that installed Playwright, as distribution/acceptance/drivers/
// web-page.mjs is. It writes what the panel showed to OUT_JSON and exits 1 unless both profiles
// listed exactly the QR code and the Code 128 barcode of the fixture.
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flags = { screenshot: undefined, channel: undefined };
const positional = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--screenshot') flags.screenshot = args[index += 1];
  else if (args[index] === '--channel') flags.channel = args[index += 1];
  else positional.push(args[index]);
}
const [url, fileName, out] = positional;
if (!url || !fileName || !out) {
  console.error('usage: node file-browser.mjs URL FILE_NAME OUT_JSON [--screenshot PNG] [--channel NAME]');
  process.exit(2);
}
const { chromium } = createRequire(join(process.cwd(), 'package.json'))('playwright');
const EXPECTED = ['code128 STOCK-4827', 'qr_code https://qrc-ai.com/76xMa'];
const FINAL = ['result', 'empty', 'inconclusive', 'error'];

const browser = await chromium.launch({ headless: true, channel: flags.channel });
const seen = [];
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 860 }, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const item = page.locator('.jp-DirListing-item', { hasText: fileName }).first();
  await item.waitFor({ timeout: 120000 });
  await item.click();
  await item.click({ button: 'right' });
  await page.locator('.lm-Menu-item', { hasText: 'Scan for QR codes and barcodes' }).first().click();

  const read = () => page.evaluate(() => {
    const result = document.getElementById('result');
    const report = document.getElementById('report-json');
    return { state: result?.dataset.state, scan: Number(result?.dataset.scan ?? 0),
      profile: report?.dataset.profile, summary: document.getElementById('summary')?.textContent ?? '',
      json: report?.textContent ?? '' };
  });
  const until = async (done, what) => {
    const deadline = Date.now() + 120000;
    for (;;) {
      const now = await read();
      if (done(now)) return now;
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
      await page.waitForTimeout(250);
    }
  };
  let now = await until((state) => state.scan >= 1 && FINAL.includes(state.state), 'the scan of the file');
  for (const profile of [now.profile, 'full']) {
    if (profile !== now.profile) {
      const before = now.scan;
      await page.selectOption('#profile', profile);
      now = await until((state) => state.scan > before && FINAL.includes(state.state), `the ${profile} scan`);
    }
    const codes = now.json ? JSON.parse(now.json).detections.map((row) => `${row.symbology} ${row.content.text}`).sort() : [];
    seen.push({ profile: now.profile, state: now.state, summary: now.summary, codes });
    if (now.state !== 'result' || JSON.stringify(codes) !== JSON.stringify(EXPECTED)) failed = true;
    console.log(`${now.profile}: ${now.state} · ${codes.join(' · ')} · ${now.summary}`);
  }
  if (flags.screenshot) await page.screenshot({ path: flags.screenshot });
} catch (error) {
  failed = true;
  console.error(`file-browser: ${error.message}`);
} finally {
  await browser.close();
}
await writeFile(out, `${JSON.stringify({ opened: url, file: fileName, scans: seen, passed: !failed }, null, 2)}\n`);
process.exit(failed ? 1 : 0);
