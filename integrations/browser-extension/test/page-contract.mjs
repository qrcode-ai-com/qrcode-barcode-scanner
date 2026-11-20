// What the browser tests share: reading the scanner page through its page contract
// (distribution/acceptance/README.md), judging the mixed fixture, and writing the reports and
// page.json in the shape of distribution/acceptance/drivers/web-page.mjs.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = resolve(HERE, '..', '..');

// The two codes of fixtures/symbology/mixed-code128-qr.png (case qr-and-code128 of
// fixtures/consumer-truth.json), each exactly once, sorted by symbology.
export const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
export const PROFILES = ['fast', 'frame', 'full'];
export const ENGINE = '0.11.0';

let checks = 0;
export function check(condition, what, detail) {
  if (!condition) {
    console.error(`FAIL ${what}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
    process.exit(1);
  }
  checks += 1;
  console.log(`ok   ${what}`);
}
export const checkCount = () => checks;

export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const contents = (report) => report.detections
  .map((row) => [row.symbology, row.content.text]).sort();

export function option(name, fallback) {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

/** The checked fixture, copied outside the checkout as a user's own file would be. */
export function stageFixture(directory) {
  return execFileSync('python3', [join(ROOT, 'scripts/destination-acceptance.py'), 'stage',
    directory], { encoding: 'utf8' }).trim();
}

export const readState = (page) => page.evaluate(() => {
  const result = document.getElementById('result');
  const report = document.getElementById('report-json');
  return {
    state: result.dataset.state,
    scan: Number(result.dataset.scan),
    reportScan: Number(report.dataset.scan),
    profile: report.dataset.profile,
    summary: document.getElementById('summary').textContent,
    json: report.textContent,
    shown: [...document.querySelectorAll('.detection')].map((item) => [item.dataset.symbology,
      item.querySelector('.text').textContent]).sort(),
  };
});

/** The state once the scanner has loaded (or failed to). */
export async function ready(page) {
  await page.waitForFunction(() => document.getElementById('result').dataset.state !== 'loading',
    undefined, { timeout: 60000 });
  return readState(page);
}

/** The state once a scan after scan number `before` has finished. */
export async function finished(page, before) {
  await page.waitForFunction((count) => {
    const result = document.getElementById('result');
    const report = document.getElementById('report-json');
    return Number(result.dataset.scan) > count && report.dataset.scan === result.dataset.scan
      && ['result', 'empty', 'inconclusive', 'error'].includes(result.dataset.state);
  }, before, { timeout: 120000 });
  return readState(page);
}

/** Hold one finished scan of the mixed fixture to the contract; its report. */
export function judge(seen, label, profile) {
  check(seen.state === 'result', `${label} ${profile}: a result`, seen.summary);
  const report = JSON.parse(seen.json);
  check(seen.profile === profile && same(contents(report), EXPECTED),
    `${label} ${profile}: QR https://qrc-ai.com/76xMa and Code 128 STOCK-4827, nothing else`,
    contents(report));
  check(report.trace.budget_exhausted === false && report.trace.engine_panics === 0
    && report.versions.scanner === ENGINE,
  `${label} ${profile}: a final report of engine ${ENGINE}`,
  { trace: report.trace.budget_exhausted, versions: report.versions });
  check(same(seen.shown, EXPECTED), `${label} ${profile}: the page shows both exact texts`,
    seen.shown);
  return report;
}

/**
 * Read the page's image in fast, frame and full, writing PROFILE.json under `directory`.
 * `first` gives the image, after the first profile is selected; without it the page already
 * holds one and selecting another profile scans it again.
 */
export async function threeProfiles(page, label, directory, first) {
  mkdirSync(directory, { recursive: true });
  if (!first && (await page.inputValue('#profile')) === PROFILES[0]) {
    const before = (await readState(page)).scan;
    await page.selectOption('#profile', 'full');
    await finished(page, before);
  }
  let seen = await readState(page);
  for (const [index, profile] of PROFILES.entries()) {
    const before = seen.scan;
    await page.selectOption('#profile', profile);
    if (index === 0 && first) await first();
    seen = await finished(page, before);
    writeFileSync(join(directory, `${profile}.json`), JSON.stringify(judge(seen, label, profile)));
  }
}

/** page.json, as distribution/acceptance/drivers/web-page.mjs writes it. */
export async function pageFacts(page, directory, browser) {
  const facts = await page.evaluate(() => {
    const text = (id) => document.getElementById(id)?.textContent ?? null;
    return {
      title: document.title,
      package: { name: text('package-name'), version: text('package-version'),
        wasm_sha256: text('wasm-sha256'), engine_version: text('engine-version') },
      links: [...document.querySelectorAll('a[href]')].map((link) => ({
        text: link.textContent.trim(), href: link.href, rel: link.getAttribute('rel') })),
    };
  });
  writeFileSync(join(directory, 'page.json'), `${JSON.stringify({
    opened: page.url(), page: page.url(), frame: page.url(), in_frame: false, browser,
    user_agent: await page.evaluate(() => navigator.userAgent),
    read_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), ...facts,
  }, null, 2)}\n`);
  return facts;
}
