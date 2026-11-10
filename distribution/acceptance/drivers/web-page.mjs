// Destination acceptance, web page: open a page that scans in the browser, give it one image
// through its own file input with the three profiles, and write one JSON report per profile for
// `scripts/destination-acceptance.py reports --kind page` to judge.
//
//   node web-page.mjs URL IMAGE OUT_DIR [--wait SECONDS] [--channel NAME] [--headed]
//
// The page must follow the page contract of distribution/acceptance/README.md: a file input
// `#file`, a profile list `#profile`, a result region `#result` with `data-state` and `data-scan`,
// and the last report as JSON text in `#report-json`. The page may sit in a frame of URL, as a
// preview does on a hosted editor: every frame is searched, for SECONDS at most (default 300).
//
// Run it from a project that installed Playwright: the module is resolved from the current
// directory, not from this file's. --channel runs an installed browser (chrome, msedge) in place
// of Playwright's Chromium. Besides fast.json, frame.json and full.json, it writes page.json:
// what the page says about itself and every link it shows. It judges nothing.
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const PROFILES = ['fast', 'frame', 'full'];
const FINAL = ['result', 'empty', 'inconclusive', 'error'];

const args = process.argv.slice(2);
const flags = { wait: 300, channel: undefined, headed: false };
const positional = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--wait') flags.wait = Number(args[index += 1]);
  else if (args[index] === '--channel') flags.channel = args[index += 1];
  else if (args[index] === '--headed') flags.headed = true;
  else positional.push(args[index]);
}
const [url, image, out] = positional;
if (!url || !image || !out || !Number.isFinite(flags.wait) || flags.wait <= 0) {
  console.error('usage: node web-page.mjs URL IMAGE OUT_DIR [--wait SECONDS] [--channel NAME] [--headed]');
  process.exit(2);
}
const { chromium } = createRequire(join(process.cwd(), 'package.json'))('playwright');

// The frame that holds the four parts of the page contract, or null. Every frame is asked at the
// same time and has five seconds to answer: a frame that is still loading may stay silent, and
// must not hold up the others.
async function scannerFrame(page) {
  const frames = page.frames();
  const answers = await Promise.all(frames.map((frame) => Promise.race([
    frame.evaluate(() => ['file', 'profile', 'result', 'report-json']
      .every((id) => document.getElementById(id) !== null)).catch(() => false),
    new Promise((resolve) => { setTimeout(() => resolve(false), 5000); }),
  ])));
  return frames[answers.indexOf(true)] ?? null;
}

const state = (frame) => frame.evaluate(() => {
  const result = document.getElementById('result');
  const report = document.getElementById('report-json');
  return { state: result.dataset.state, scan: Number(result.dataset.scan),
    reportScan: Number(report.dataset.scan), profile: report.dataset.profile,
    summary: document.getElementById('summary')?.textContent ?? '', json: report.textContent };
});

async function until(read, done, deadline, what) {
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((next) => { setTimeout(next, 500); });
  }
}

const browser = await chromium.launch({ headless: !flags.headed, channel: flags.channel });
let failed = false;
try {
  const page = await browser.newPage();
  const deadline = Date.now() + flags.wait * 1000;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: flags.wait * 1000 });
  const frame = await until(() => scannerFrame(page), (found) => found !== null, deadline,
    'a frame with #file, #profile, #result and #report-json');
  // The scanner has loaded once the page leaves its loading state.
  let seen = await until(() => state(frame), (now) => now.state !== 'loading', deadline,
    'the scanner to load');
  if (seen.state === 'error') throw new Error(`the page did not load its scanner: ${seen.summary}`);

  await mkdir(out, { recursive: true });
  for (const [index, profile] of PROFILES.entries()) {
    const before = seen.scan;
    await frame.selectOption('#profile', profile);
    // The first profile is chosen before any image, so it starts no scan: the image does.
    if (index === 0) await frame.setInputFiles('#file', resolve(image));
    seen = await until(() => state(frame),
      (now) => now.scan > before && now.reportScan === now.scan && FINAL.includes(now.state),
      Date.now() + 120000, `the ${profile} scan`);
    if (seen.state === 'error' || seen.profile !== profile) {
      failed = true;
      console.error(`${profile}: no report (${seen.state}, profile ${seen.profile}): ${seen.summary}`);
      continue;
    }
    const report = JSON.parse(seen.json);
    await writeFile(join(out, `${profile}.json`), JSON.stringify(report));
    console.log(profile, report.detections.map((row) => `${row.symbology}:${row.content.text}`).join(' '));
  }

  const facts = await frame.evaluate(() => {
    const text = (id) => document.getElementById(id)?.textContent ?? null;
    return {
      title: document.title,
      package: { name: text('package-name'), version: text('package-version'),
        wasm_sha256: text('wasm-sha256'), engine_version: text('engine-version') },
      links: [...document.querySelectorAll('a[href]')].map((link) => ({
        text: link.textContent.trim(), href: link.href, rel: link.getAttribute('rel') })),
    };
  });
  await writeFile(join(out, 'page.json'), `${JSON.stringify({
    opened: url, page: page.url(), frame: frame.url(), in_frame: frame !== page.mainFrame(),
    browser: { name: browser.browserType().name(), version: browser.version() },
    user_agent: await frame.evaluate(() => navigator.userAgent),
    read_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), ...facts,
  }, null, 2)}\n`);
} catch (error) {
  failed = true;
  console.error(`web-page: ${error.message}`);
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
