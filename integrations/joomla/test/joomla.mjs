// The package on a new Joomla site, installed and removed the way a site administrator does it.
//
//   node test/joomla.mjs [--zip build/pkg_qrcodebarcodescanner-0.1.0.zip]
//       [--image joomla:6.2.0-php8.4-apache] [--db-image mariadb:11.8] [--port 8090]
//       [--out build/acceptance] [--screenshots DIR] [--headed] [--keep]
//
// It starts the official Joomla Docker image with a MariaDB container, both new, and lets the
// image install Joomla by itself (its JOOMLA_* variables). Then, in Playwright's Chromium:
//   install    System > Install > Extensions > Upload Package File, with the package zip
//   module     Content > Site Modules > New > QR Code & Barcode Scanner, published in main-top
//              on all pages, with its default settings
//   visitor    on the home page, as a visitor: the three mixed scans (fast, frame, full), no
//              request to another server, no link to another site, the worker running
//   refusals   a BMP image is refused as an unsupported type, a text file as unreadable
//   credit     the module's credit line turned on: the six QR Code AI links
//   remove     System > Manage > Extensions: Uninstall the package; the module's files are no
//              longer served and no row of the package, the module or its update site is left
// The reports are written as fast.json, frame.json and full.json, with page.json, under
// OUT/module, and the credit page facts under OUT/credit, in the shape of the engine's
// distribution/acceptance/drivers/web-page.mjs, for scripts/destination-acceptance.py and
// scripts/check-demo-page.py, which it runs: OUT/receipts/module.json is the acceptance receipt,
// closed by the removal while the site still answers. OUT/install.json records the site. The
// containers and their network are removed at the end, unless --keep. Exits 1 on the first
// failed check.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(HERE, '..', '..');
const OWN = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const VERSION = OWN.version;
const WASM_SHA256 = OWN.config.wasmSha256;
const MODULE = 'mod_qrcodebarcodescanner';
const SERVED = join(HERE, 'test', 'served.mjs');
// The two codes of fixtures/symbology/mixed-code128-qr.png (case qr-and-code128 of
// fixtures/consumer-truth.json), each exactly once, sorted by symbology.
const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
const PROFILES = ['fast', 'frame', 'full'];
const FINAL = ['result', 'empty', 'inconclusive', 'error'];

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const zip = resolve(option('--zip', join(HERE, 'build', `pkg_qrcodebarcodescanner-${VERSION}.zip`)));
const image = option('--image', 'joomla:6.2.0-php8.4-apache');
const dbImage = option('--db-image', 'mariadb:11.8');
const port = Number(option('--port', '8090'));
const out = resolve(option('--out', join(HERE, 'build', 'acceptance')));
const screenshots = option('--screenshots', null);
const headed = args.includes('--headed');
const keep = args.includes('--keep');

let checks = 0;
function check(condition, what, detail) {
  if (!condition) {
    throw new Error(`FAIL ${what}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
  }
  checks += 1;
  console.log(`ok   ${what}`);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const contents = (report) => report.detections.map((row) => [row.symbology, row.content.text]).sort();
const pause = (ms) => new Promise((done) => { setTimeout(done, ms); });

// ------------------------------------------------------------------ inputs

const stageDir = mkdtempSync(join(tmpdir(), 'qrbs-joomla-'));
const fixture = execFileSync('python3', [join(ROOT, 'scripts/destination-acceptance.py'), 'stage',
  stageDir], { encoding: 'utf8' }).trim();
// A valid 2 x 2 BMP: an image type the engine does not read, refused before any scan.
const bmpPath = join(stageDir, 'two-by-two.bmp');
const bmp = Buffer.alloc(70);
bmp.write('BM', 0, 'ascii');
bmp.writeUInt32LE(70, 2);
bmp.writeUInt32LE(54, 10);
bmp.writeUInt32LE(40, 14);
bmp.writeInt32LE(2, 18);
bmp.writeInt32LE(2, 22);
bmp.writeUInt16LE(1, 26);
bmp.writeUInt16LE(24, 28);
bmp.writeUInt32LE(16, 34);
bmp.fill(0xFF, 54);
writeFileSync(bmpPath, bmp);
const textPath = join(stageDir, 'notes.png');
writeFileSync(textPath, 'this is text, not an image\n');

// ------------------------------------------------------------------ the site, in Docker

const run = `qrbs-joomla-${process.pid}`;
const network = run;
const dbName = `${run}-db`;
const webName = `${run}-web`;
// Throwaway credentials of a throwaway site that listens on 127.0.0.1 only.
const DB_PASSWORD = 'qrbs-test-database-password';
const ADMIN = { username: 'qrbsadmin', password: 'qrbs-test-admin-password-2026', email: 'admin@example.com' };
const PREFIX = 'qrbs_';
const docker = (...rest) => execFileSync('docker', rest, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sql = (query) => docker('exec', dbName, 'mariadb', '-uroot', `-p${DB_PASSWORD}`, '-N', '-B',
  'joomla', '-e', query);

function startSite() {
  docker('network', 'create', network);
  docker('run', '--detach', '--name', dbName, '--network', network,
    '--env', `MARIADB_ROOT_PASSWORD=${DB_PASSWORD}`, '--env', 'MARIADB_DATABASE=joomla', dbImage);
  docker('run', '--detach', '--name', webName, '--network', network,
    '--publish', `127.0.0.1:${port}:80`,
    '--env', `JOOMLA_DB_HOST=${dbName}`, '--env', 'JOOMLA_DB_USER=root',
    '--env', `JOOMLA_DB_PASSWORD=${DB_PASSWORD}`, '--env', 'JOOMLA_DB_NAME=joomla',
    '--env', `JOOMLA_DB_PREFIX=${PREFIX}`,
    '--env', 'JOOMLA_SITE_NAME=Scanner test site', '--env', 'JOOMLA_ADMIN_USER=Site Administrator',
    '--env', `JOOMLA_ADMIN_USERNAME=${ADMIN.username}`, '--env', `JOOMLA_ADMIN_PASSWORD=${ADMIN.password}`,
    '--env', `JOOMLA_ADMIN_EMAIL=${ADMIN.email}`, image);
}

function stopSite() {
  for (const name of [webName, dbName]) {
    try { docker('rm', '--force', '--volumes', name); } catch { /* not started */ }
  }
  try { docker('network', 'rm', network); } catch { /* not created */ }
}

async function waitForSite(base) {
  const deadline = Date.now() + 300000;
  let last = 'no answer';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/administrator/index.php`, { redirect: 'manual' });
      const body = await response.text();
      if (response.status === 200 && /mod-login-username|name="username"/.test(body)) return;
      last = `${response.status}`;
    } catch (problem) {
      last = problem.message;
    }
    await pause(3000);
  }
  let logs = '';
  try { logs = execFileSync('docker', ['logs', '--tail', '60', webName], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch { logs = ''; }
  throw new Error(`the site did not answer within 5 minutes (${last})\n${logs}`);
}

// ------------------------------------------------------------------ the scanner on a page

const scannerState = (page) => page.evaluate(() => {
  const root = document.querySelector('[data-qrbs-root]');
  const part = (name) => root.querySelector(`[data-qrbs="${name}"]`);
  const result = part('result');
  const report = part('report');
  return {
    state: result.dataset.state,
    scan: Number(result.dataset.scan),
    reportScan: Number(report.dataset.scan),
    profile: report.dataset.profile,
    summary: part('summary').textContent,
    json: report.textContent,
    shown: [...root.querySelectorAll('.qrbs__detection')].map((item) => [item.dataset.symbology,
      item.querySelector('.qrbs__text').textContent]).sort(),
  };
});

async function waitFinished(page, before) {
  await page.waitForFunction((count) => {
    const root = document.querySelector('[data-qrbs-root]');
    const result = root.querySelector('[data-qrbs="result"]');
    const report = root.querySelector('[data-qrbs="report"]');
    return Number(result.dataset.scan) > count && report.dataset.scan === result.dataset.scan
      && ['result', 'empty', 'inconclusive', 'error'].includes(result.dataset.state);
  }, before, { timeout: 180000 });
  return scannerState(page);
}

/** The three mixed scans through the scanner's own controls; the reports, by profile. */
async function threeScans(page, label) {
  const reports = {};
  let seen = await scannerState(page);
  check(seen.state === 'idle' && seen.scan === 0, `${label}: the scanner waits for an image`, seen);
  for (const [index, profile] of PROFILES.entries()) {
    const before = seen.scan;
    const select = page.locator('[data-qrbs-root] [data-qrbs="profile"]').first();
    // The first profile is chosen before any image, so it starts no scan: the image does.
    await select.selectOption(profile);
    if (index === 0) {
      await page.locator('[data-qrbs-root] [data-qrbs="file"]').first().setInputFiles(fixture);
    }
    seen = await waitFinished(page, before);
    check(FINAL.includes(seen.state) && seen.profile === profile,
      `${label} ${profile}: a finished scan with this profile`, seen.summary);
    check(seen.state === 'result', `${label} ${profile}: codes found`, seen.summary);
    const report = JSON.parse(seen.json);
    check(same(contents(report), EXPECTED), `${label} ${profile}: the QR code and the Code 128, once each`,
      contents(report));
    check(same(seen.shown, EXPECTED), `${label} ${profile}: both shown as text`, seen.shown);
    check(report.trace.budget_exhausted === false && report.trace.engine_panics === 0,
      `${label} ${profile}: uncut, no engine panic`, report.trace);
    reports[profile] = report;
  }
  return reports;
}

async function pageFacts(page, opened) {
  return page.evaluate((openedUrl) => {
    const root = document.querySelector('[data-qrbs-root]');
    return {
      opened: openedUrl,
      page: location.href,
      frame: location.href,
      in_frame: false,
      title: document.title,
      package: {
        name: root.dataset.qrbsPackage,
        version: root.dataset.qrbsVersion,
        wasm_sha256: root.dataset.qrbsWasmSha256,
        engine_version: root.dataset.qrbsEngineVersion || 'not loaded yet',
      },
      links: [...root.querySelectorAll('a[href]')].map((link) => ({
        text: link.textContent.trim(), href: link.href, rel: link.getAttribute('rel') })),
    };
  }, opened);
}

async function writeReports(directory, reports, facts, browser, page) {
  mkdirSync(directory, { recursive: true });
  for (const [profile, report] of Object.entries(reports)) {
    writeFileSync(join(directory, `${profile}.json`), JSON.stringify(report));
  }
  writeFileSync(join(directory, 'page.json'), `${JSON.stringify({
    ...facts,
    browser: { name: browser.browserType().name(), version: browser.version() },
    user_agent: await page.evaluate(() => navigator.userAgent),
    read_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  }, null, 2)}\n`);
}

// ------------------------------------------------------------------ the run

mkdirSync(out, { recursive: true });
const base = `http://127.0.0.1:${port}`;
const origin = new URL(base).origin;
let browser = null;
let failed = false;
try {
  startSite();
  await waitForSite(base);
  // The site's own "Welcome to Joomla" guided tour starts by itself and takes the admin to the
  // dashboard from whatever page is open, and the statistics plugin asks on every admin page
  // whether to send usage data. The test site turns both plugins off, as an administrator may in
  // System > Plugins, so that each admin page stays where it was opened and nothing is sent.
  sql(`UPDATE ${PREFIX}extensions SET enabled = 0 WHERE type = 'plugin' AND folder = 'system' AND element IN ('guidedtours', 'stats')`);
  const joomla = docker('exec', webName, 'php', '-r',
    "define('_JEXEC', 1); require '/var/www/html/libraries/src/Version.php'; echo (new Joomla\\CMS\\Version())->getShortVersion();");
  const php = docker('exec', webName, 'php', '-r', 'echo PHP_VERSION;');
  console.log(`Joomla ${joomla} on PHP ${php} at ${base} (${image})`);
  // Paint holding keeps the previous page on screen until the next one paints; in headless
  // Chromium a tab that submitted a form can then stop drawing frames for good (no click, no
  // screenshot). Seen on this test's admin pages, so it is turned off.
  browser = await chromium.launch({ headless: !headed, args: ['--disable-features=PaintHolding'] });
  const shot = async (target, path) => {
    try {
      await target.screenshot({ path, animations: 'disabled', caret: 'hide', timeout: 60000 });
    } catch (problem) {
      console.error(`no screenshot ${path}: ${problem.message.split('\n')[0]}`);
    }
  };
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // Each admin step opens its page in a new tab of the same browser session, so that no step
  // depends on what an earlier page left running.
  let page = null;
  const adminTab = async (url) => {
    if (page) await page.close();
    page = await context.newPage();
    page.on('dialog', (dialog) => { void dialog.accept(); });
    await page.goto(url);
    return page;
  };
  const admin = (query) => `${base}/administrator/index.php${query}`;
  const messages = () => page.locator('#system-message-container').innerText().catch(() => '');

  // -------------------------------------------------------------- sign in
  await adminTab(admin(''));
  await page.locator('#mod-login-username').fill(ADMIN.username);
  await page.locator('#mod-login-password').fill(ADMIN.password);
  await page.locator('#btn-login-submit').click();
  await page.locator('#mod-login-username').waitFor({ state: 'detached', timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  check(await page.locator('body.admin').count() === 1 && await page.locator('#mod-login-username').count() === 0,
    'the administrator is signed in');

  // -------------------------------------------------------------- install
  await adminTab(admin('?option=com_installer&view=install'));
  await page.locator('#install_package').setInputFiles(zip);
  await page.waitForFunction(() => /successful|error|failed/i.test(
    document.querySelector('#system-message-container')?.innerText ?? ''), undefined, { timeout: 120000 });
  const installText = await messages();
  check(/Installation of the package (QR Code & Barcode Scanner )?was successful/i.test(installText), 'install: the package installs', installText);
  const rows = sql(`SELECT element, type, client_id, enabled, manifest_cache FROM ${PREFIX}extensions `
    + "WHERE element IN ('pkg_qrcodebarcodescanner', 'mod_qrcodebarcodescanner') ORDER BY type").split('\n')
    .filter(Boolean).map((line) => line.split('\t'));
  check(rows.length === 2 && rows[0][0] === MODULE && rows[1][0] === 'pkg_qrcodebarcodescanner',
    'install: the package and its site module are registered', rows.map((row) => row.slice(0, 4)));
  check(rows.every((row) => row[3] === '1' && JSON.parse(row[4]).version === VERSION),
    'install: both enabled, at the version of the manifests', rows.map((row) => [row[0], JSON.parse(row[4]).version]));
  const updateSites = sql(`SELECT location, enabled FROM ${PREFIX}update_sites WHERE location LIKE '%integrations/joomla/updates.xml'`);
  check(updateSites === 'https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/joomla/updates.xml\t1',
    'install: the update server is registered', updateSites);
  for (const file of ['media/mod_qrcodebarcodescanner/js/view.js', 'media/mod_qrcodebarcodescanner/vendor/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm']) {
    const response = await fetch(`${base}/${file}`);
    check(response.status === 200, `install: ${file} is served`, response.status);
  }

  // -------------------------------------------------------------- the module
  await adminTab(admin('?option=com_modules&view=select&client_id=0'));
  const card = page.locator('a', { hasText: 'QR Code & Barcode Scanner' }).first();
  check(await card.count() === 1, 'module: QR Code & Barcode Scanner is among the site module types');
  await adminTab(new URL(await card.getAttribute('href'), page.url()).href);
  await page.locator('#jform_title').fill('Scan a code');
  const settings = await page.evaluate(() => {
    const value = (id) => document.getElementById(id)?.value ?? null;
    const checked = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
    return {
      profile: value('jform_params_profile'),
      showReport: checked('jform[params][show_report]'),
      showCredit: checked('jform[params][show_credit]'),
    };
  });
  check(same(settings, { profile: 'full', showReport: '0', showCredit: '0' }),
    'module: its settings default to the full profile, no report, no credit line', settings);
  await page.evaluate(() => {
    const select = document.getElementById('jform_position');
    const fancy = select.closest('joomla-field-fancy-select');
    if (fancy && fancy.choicesInstance) fancy.choicesInstance.setChoiceByValue('main-top');
    if (select.value !== 'main-top') {
      if (![...select.options].some((item) => item.value === 'main-top')) select.add(new Option('main-top', 'main-top'));
      select.value = 'main-top';
    }
    const assignment = document.getElementById('jform_assignment');
    assignment.value = '0';
    assignment.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('jform_published').value = '1';
  });
  if (screenshots) {
    mkdirSync(screenshots, { recursive: true });
    await shot(page, join(screenshots, 'module-settings.png'));
  }
  await Promise.all([page.waitForURL(/view=modules/), page.evaluate(() => Joomla.submitbutton('module.save'))]);
  const savedText = await messages();
  check(/Module saved/i.test(savedText), 'module: saved', savedText);
  const instances = sql(`SELECT id, title, position, published FROM ${PREFIX}modules WHERE module = '${MODULE}' ORDER BY id`)
    .split('\n').map((line) => line.split('\t'));
  // Joomla creates one module of a newly installed type, unpublished and in no position: the
  // installation alone shows nothing on the site.
  check(instances.length === 2 && instances[0][2] === '' && instances[0][3] === '0',
    'module: the one Joomla created at install is unpublished, in no position', instances[0]);
  check(instances[1][1] === 'Scan a code' && instances[1][2] === 'main-top' && instances[1][3] === '1',
    'module: the new one is published in main-top', instances[1]);
  const moduleId = Number(instances[1][0]);
  const assigned = sql(`SELECT menuid FROM ${PREFIX}modules_menu WHERE moduleid = ${moduleId}`);
  check(assigned === '0', 'module: shown on all pages', assigned);

  // -------------------------------------------------------------- as a visitor
  const visitor = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const visit = await visitor.newPage();
  const requests = [];
  visit.on('request', (request) => requests.push(request.url()));
  const workers = [];
  visit.on('worker', (worker) => workers.push(worker.url()));

  await visit.goto(`${base}/`);
  check(await visit.locator('[data-qrbs-root]').count() === 1, 'visitor: one scanner on the home page');
  check(await visit.locator('script[type="module"][src*="/media/mod_qrcodebarcodescanner/js/view.js"]').count() === 1,
    'visitor: the page loads the module script from the site');
  const loadedBefore = requests.filter((url) => url.endsWith('.wasm'));
  check(loadedBefore.length === 0, 'visitor: the engine is not downloaded with the page', loadedBefore);
  const moduleReports = await threeScans(visit, 'visitor');
  const moduleFacts = await pageFacts(visit, `${base}/`);
  check(moduleFacts.package.engine_version === '0.11.0', 'visitor: the engine 0.11.0 is loaded', moduleFacts.package);
  check(await visit.locator('[data-qrbs-root] .qrbs__credit').count() === 0, 'visitor: no credit line by default');
  check(moduleFacts.links.every((link) => link.href === 'https://qrc-ai.com/76xMa'
    && link.rel === 'noopener noreferrer nofollow'), 'visitor: the only link is the decoded one, marked nofollow',
  moduleFacts.links);
  check(await visit.locator('a[href*="qrcode-ai.com"]').count() === 0, 'visitor: no link to QR Code AI on the page');
  check(workers.some((url) => url.includes(`/media/${MODULE}/js/worker.js`)),
    'visitor: the scan runs in the module\'s worker', workers);
  if (screenshots) {
    await visit.locator('[data-qrbs-root]').first().scrollIntoViewIfNeeded();
    await shot(visit, join(screenshots, 'module-visitor.png'));
  }
  await writeReports(join(out, 'module'), moduleReports, moduleFacts, browser, visit);

  // -------------------------------------------------------------- refusals
  for (const [path, problem, label] of [[bmpPath, 'unsupported', 'a BMP image'],
    [textPath, 'unreadable', 'a text file']]) {
    const before = (await scannerState(visit)).scan;
    await visit.locator('[data-qrbs-root] [data-qrbs="file"]').first().setInputFiles(path);
    const seen = await waitFinished(visit, before);
    const texts = await visit.evaluate(() => JSON.parse(document.querySelector('[data-qrbs-root]').dataset.qrbsTexts));
    check(seen.state === 'error' && seen.summary === texts[problem] && seen.shown.length === 0,
      `refusals: ${label} is refused with the ${problem} message, and nothing is shown`, seen);
  }

  // -------------------------------------------------------------- the credit line
  await adminTab(admin(`?option=com_modules&task=module.edit&id=${moduleId}`));
  await page.evaluate(() => {
    document.getElementById('jform_params_show_credit1').checked = true;
    document.getElementById('jform_params_show_credit0').checked = false;
  });
  await Promise.all([page.waitForURL(/view=modules/), page.evaluate(() => Joomla.submitbutton('module.save'))]);
  const creditParams = JSON.parse(sql(`SELECT params FROM ${PREFIX}modules WHERE id = ${moduleId}`));
  check(String(creditParams.show_credit) === '1', 'credit: the credit line is turned on', creditParams);
  await visit.goto(`${base}/`);
  const creditLinks = await visit.$$eval('[data-qrbs-root] .qrbs__credit a', (links) => links.map((link) => link.href));
  check(creditLinks.length === 6, 'credit: the credit line shows six links when turned on', creditLinks);
  // The page names its engine once loaded: one scan loads it.
  await visit.locator('[data-qrbs-root] [data-qrbs="file"]').first().setInputFiles(fixture);
  await waitFinished(visit, 0);
  await writeReports(join(out, 'credit'), {}, await pageFacts(visit, `${base}/`), browser, visit);

  const elsewhere = [...new Set(requests.filter((url) => new URL(url).origin !== origin))];
  check(elsewhere.length === 0, 'network: every request of the visitor goes to the site itself', elsewhere);
  await visitor.close();

  // -------------------------------------------------------------- remove
  const wasmUrl = `${base}/media/${MODULE}/vendor/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm`;
  const served = (url, sha) => {
    try {
      execFileSync(process.execPath, [SERVED, url, ...(sha ? [sha] : [])], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
  const files = { [wasmUrl]: WASM_SHA256, [`${base}/media/${MODULE}/js/view.js`]: null };
  await adminTab(admin('?option=com_installer&view=manage&filter[search]=QR Code'));
  const packageRow = page.locator('tr', { hasText: 'QR Code & Barcode Scanner' })
    .filter({ hasText: 'Package' }).first();
  check(await packageRow.count() === 1, 'remove: the package is listed in Extensions: Manage');
  await packageRow.locator('input[name="cid[]"]').check();
  // Actions > Uninstall asks "Are you sure you want to uninstall?" in Joomla's own dialog: Yes.
  await page.locator('#toolbar button.button-status-group').click();
  await page.locator('#toolbar button.button-delete').click();
  await page.locator('joomla-dialog').getByRole('button', { name: 'Yes' }).click();
  const removed = await page.getByText(/Uninstalling the package (QR Code & Barcode Scanner )?was successful/).first()
    .waitFor({ timeout: 120000 }).then(() => true, () => false);
  check(removed, 'remove: the package uninstalls', removed ? undefined : await messages());
  for (const [url, sha] of Object.entries(files)) {
    check(!served(url, sha), `remove: ${new URL(url).pathname} is no longer served`);
  }
  const left = {
    extensions: sql(`SELECT COUNT(*) FROM ${PREFIX}extensions WHERE element LIKE '%qrcodebarcodescanner%'`),
    modules: sql(`SELECT COUNT(*) FROM ${PREFIX}modules WHERE module = '${MODULE}'`),
    update_sites: sql(`SELECT COUNT(*) FROM ${PREFIX}update_sites WHERE location LIKE '%integrations/joomla/updates.xml'`),
    folder: docker('exec', webName, 'sh', '-c', `ls -d /var/www/html/modules/${MODULE} /var/www/html/media/${MODULE} 2>/dev/null | wc -l`),
  };
  check(same(left, { extensions: '0', modules: '0', update_sites: '0', folder: '0' }),
    'remove: no extension, module, update site or folder is left', left);

  // -------------------------------------------------------------- the judges
  const judge = (script, ...rest) => execFileSync('python3', [join(ROOT, 'scripts', script), ...rest],
    { stdio: 'inherit' });
  const env = process.env;
  const runUrl = env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null;
  const sourceUrl = env.GITHUB_SHA
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/tree/${env.GITHUB_SHA}/integrations/joomla`
    : 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/joomla';
  judge('check-demo-page.py', join(out, 'credit', 'page.json'), '--example', HERE);
  const receipt = join(out, 'receipts', 'module.json');
  mkdirSync(dirname(receipt), { recursive: true });
  const reports = join(out, 'module');
  judge('destination-acceptance.py', 'reports', '--kind', 'page',
    '--produced-by', 'node test/joomla.mjs',
    '--fast', join(reports, 'fast.json'), '--frame', join(reports, 'frame.json'),
    '--full', join(reports, 'full.json'),
    '--destination', `Joomla package, site module, Joomla ${joomla} on PHP ${php} (${image})`,
    '--identifier', `pkg_qrcodebarcodescanner-${VERSION}.zip`, '--version', '0.11.0', '--url', sourceUrl,
    '--install', 'System > Install > Extensions > Upload Package File, then Content > Site Modules > New',
    ...(runUrl ? ['--run-url', runUrl] : []), '--receipt', receipt);
  judge('destination-acceptance.py', 'removed', '--gone', `${process.execPath} ${SERVED} ${wasmUrl} ${WASM_SHA256}`,
    '--uninstall', 'System > Manage > Extensions: select the package, Uninstall', '--receipt', receipt);

  writeFileSync(join(out, 'install.json'), `${JSON.stringify({
    schema: 'qrscan-joomla-docker/1',
    site: { url: base, image, database: dbImage, joomla, php },
    package: { zip, version: VERSION },
    module: { id: moduleId, position: 'main-top', assignment: 'all pages' },
    removal: { uninstall: 'System > Manage > Extensions: Uninstall the package', gone: wasmUrl, left },
    checks,
  }, null, 2)}\n`);
  console.log(`${checks} checks passed`);
} catch (error) {
  failed = true;
  console.error(error.message);
  if (browser) {
    // What the browser showed when a check failed, for the run's artifacts.
    for (const [index, open] of browser.contexts().flatMap((context) => context.pages()).entries()) {
      try {
        await open.screenshot({ path: join(out, `failure-${index}.png`), timeout: 30000 });
      } catch { /* the page is gone */ }
    }
  }
  try {
    writeFileSync(join(out, 'docker-web.log'), execFileSync('docker', ['logs', webName],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }));
  } catch { /* no container */ }
} finally {
  if (browser) await browser.close();
  if (!keep) stopSite();
}
process.exit(failed ? 1 : 0);
