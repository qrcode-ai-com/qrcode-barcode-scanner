// The plugin zip on a new WordPress site, installed and removed the way a site owner does it.
//
//   node test/playground.mjs [--zip build/qrcode-barcode-scanner-0.1.0.zip] [--wp latest]
//       [--php 8.3] [--out build/acceptance] [--port 9400] [--screenshots DIR] [--headed]
//
// It starts WordPress Playground (WordPress on PHP compiled to WebAssembly, with SQLite) with
// nothing installed, then in Playwright's Chromium:
//   install    uploads the zip in Plugins > Add New > Upload Plugin, installs and activates it
//   editor     the block is in the editor, is inserted with its settings, and the page is published
//   block      on the published page, as a visitor: the three mixed scans (fast, frame, full),
//              no request to another server, no link to another site, the worker running
//   refusals   a BMP image is refused as an unsupported type, a text file as unreadable
//   shortcode  a page with [qrcode_barcode_scanner profile="fast"]: the three mixed scans
//   credit     a block with the credit line turned on shows the six QR Code AI links
//   remove     Deactivate, then Delete; the plugin's files answer 404 and no option is left
// Each scanner's reports are written as fast.json, frame.json and full.json, with page.json, under
// OUT/block, OUT/shortcode and OUT/credit (page.json only), in the shape of the engine's
// distribution/acceptance/drivers/web-page.mjs, for scripts/destination-acceptance.py and
// scripts/check-demo-page.py, which it runs: OUT/receipts holds the two acceptance receipts, closed
// by the removal while the site still answers. OUT/install.json records the site and the plugin.
// Exits 1 on the first failed check.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCLI } from '@wp-playground/cli';
import { chromium } from 'playwright';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(HERE, '..', '..');
const SLUG = 'qrcode-barcode-scanner';
const OWN = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const VERSION = OWN.version;
const WASM_SHA256 = OWN.config.wasmSha256;
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
const zip = resolve(option('--zip', join(HERE, 'build', `${SLUG}-${VERSION}.zip`)));
const wp = option('--wp', 'latest');
const php = option('--php', '8.3');
const out = resolve(option('--out', join(HERE, 'build', 'acceptance')));
const port = Number(option('--port', '9400'));
const screenshots = option('--screenshots', null);
const headed = args.includes('--headed');

let checks = 0;
function check(condition, what, detail) {
  if (!condition) {
    throw new Error(`FAIL ${what}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
  }
  checks += 1;
  console.log(`ok   ${what}`);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// A child process, without blocking: Playground's server answers from this process's event loop,
// so a synchronous child that asks the site something would wait for an answer that cannot come.
const runChild = (command, argv, stdio = 'inherit') => new Promise((done) => {
  const child = spawn(command, argv, { stdio });
  child.on('error', () => done(127));
  child.on('close', (code) => done(code ?? 1));
});
const contents = (report) => report.detections.map((row) => [row.symbology, row.content.text]).sort();

// ------------------------------------------------------------------ inputs

const stageDir = mkdtempSync(join(tmpdir(), 'qrbs-wordpress-'));
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
// WP_HTTP_BLOCK_EXTERNAL: WordPress itself calls api.wordpress.org from the admin screens; the
// site is kept offline so that those calls fail at once instead of holding the server, and so
// that nothing the plugin does on the server can depend on another site. No auto-login: the
// admin signs in through wp-login.php, and the visitor's browser has no session at all.
// One PHP worker: with several, a worker can still see a file that another one deleted.
const site = await runCLI({ command: 'server', php, wp, port, quiet: true, workers: 1,
  'define-bool': { WP_HTTP_BLOCK_EXTERNAL: true } });
const base = String(site.serverUrl).replace(/\/$/, '');
const origin = new URL(base).origin;
console.log(`WordPress Playground at ${base} (WordPress ${wp}, PHP ${php})`);
// Paint holding keeps the previous page on screen until the next one paints; in headless
// Chromium a tab that followed a link or submitted a form in wp-admin can then stop drawing
// frames for good (no click, no screenshot), so it is turned off.
const browser = await chromium.launch({ headless: !headed, args: ['--disable-features=PaintHolding'] });
async function shot(target, path) {
  try {
    await target.screenshot({ path, animations: 'disabled', caret: 'hide', timeout: 90000 });
  } catch (problem) {
    console.error(`no screenshot ${path}: ${problem.message.split('\n')[0]}`);
  }
}
let failed = false;
try {
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

  // -------------------------------------------------------------- sign in
  // Playground's administrator account.
  await adminTab(`${base}/wp-login.php`);
  await page.locator('#user_login').fill('admin');
  await page.locator('#user_pass').fill('password');
  await Promise.all([page.waitForURL(/\/wp-admin\/?$/), page.locator('#wp-submit').click()]);
  check(await page.locator('#wpadminbar').count() === 1, 'the administrator is signed in');

  // -------------------------------------------------------------- the site before
  await adminTab(`${base}/wp-admin/options.php`);
  const optionNames = () => page.$$eval('form table input[name], form table textarea[name]',
    (fields) => fields.map((field) => field.getAttribute('name')).filter((name) => name !== 'page_options'));
  const optionsBefore = new Set(await optionNames());
  check(optionsBefore.size > 20, 'the site lists its options', optionsBefore.size);
  const versions = await page.evaluate(() => ({
    wordpress: document.querySelector('#footer-upgrade')?.textContent.trim() ?? null,
  }));

  // -------------------------------------------------------------- install
  await adminTab(`${base}/wp-admin/plugin-install.php?tab=upload`);
  await page.locator('#pluginzip').setInputFiles(zip);
  await page.locator('#install-plugin-submit').click();
  await page.waitForLoadState('domcontentloaded');
  const installText = await page.locator('#wpbody-content').innerText();
  check(/Plugin installed successfully/i.test(installText), 'install: the zip installs', installText.slice(0, 400));
  // The installer's Activate Plugin link, followed as a click would.
  const activate = await page.locator('a[href*="action=activate"]').first().getAttribute('href');
  await adminTab(new URL(activate, page.url()).href);
  const PLUGIN_ROW = `tr[data-plugin="${SLUG}/${SLUG}.php"]`;
  const row = page.locator(PLUGIN_ROW);
  check(await row.count() === 1, 'install: the plugin is listed');
  check((await row.getAttribute('class')).split(/\s+/).includes('active'), 'install: the plugin is active');
  const rowText = await row.innerText();
  check(rowText.includes('QR Code & Barcode Scanner') && rowText.includes(`Version ${VERSION}`),
    'install: name and version as in the header', rowText);

  // -------------------------------------------------------------- the editor
  await adminTab(`${base}/wp-admin/post-new.php?post_type=page`);
  await page.waitForFunction(() => window.wp && wp.blocks && wp.data && wp.data.select('core/editor')
    && wp.blocks.getBlockTypes().length > 10, undefined, { timeout: 120000 });
  const blockType = await page.evaluate(() => {
    wp.data.dispatch('core/preferences')?.set('core/edit-post', 'welcomeGuide', false);
    const type = wp.blocks.getBlockType('qrcode-barcode-scanner/scanner');
    return type ? { title: type.title, attributes: Object.keys(type.attributes).sort() } : null;
  });
  check(blockType && blockType.title === 'QR Code & Barcode Scanner', 'editor: the block is registered', blockType);
  check(['profile', 'showCredit', 'showReport'].every((name) => blockType.attributes.includes(name)),
    'editor: the block has its three settings', blockType.attributes);
  await page.evaluate(() => {
    const block = wp.blocks.createBlock('qrcode-barcode-scanner/scanner', { showReport: true });
    wp.data.dispatch('core/block-editor').insertBlocks(block);
    wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
    wp.data.dispatch('core/editor').editPost({ title: 'Scan a code', status: 'publish' });
  });
  const canvas = page.frameLocator('iframe[name="editor-canvas"]');
  const placeholder = canvas.locator('.wp-block-qrcode-barcode-scanner-scanner .components-placeholder');
  await placeholder.waitFor({ timeout: 60000 });
  check((await placeholder.innerText()).includes('QR Code & Barcode Scanner'), 'editor: the block shows its preview');
  await page.evaluate(() => wp.data.dispatch('core/edit-post')?.openGeneralSidebar?.('edit-post/block'));
  await page.getByText('Show a credit line').first().waitFor({ timeout: 30000 });
  if (screenshots) {
    mkdirSync(screenshots, { recursive: true });
    await shot(page, join(screenshots, 'screenshot-2.png'));
  }
  await page.evaluate(() => wp.data.dispatch('core/editor').savePost());
  await page.waitForFunction(() => {
    const editor = wp.data.select('core/editor');
    return !editor.isSavingPost() && editor.getCurrentPost().status === 'publish';
  }, undefined, { timeout: 60000 });
  const blockUrl = await page.evaluate(() => wp.data.select('core/editor').getCurrentPost().link);
  const saved = await page.evaluate(() => wp.data.select('core/editor').getEditedPostContent());
  check(saved.includes('<!-- wp:qrcode-barcode-scanner/scanner {"showReport":true} /-->'),
    'editor: the page saves the block with its setting and no markup', saved);
  const created = await page.evaluate(async () => {
    const make = (title, content) => wp.apiFetch({ path: '/wp/v2/pages', method: 'POST',
      data: { title, content, status: 'publish' } });
    const shortcode = await make('Scan with a shortcode', '[qrcode_barcode_scanner profile="fast"]');
    const credit = await make('Scan with the credit line',
      '<!-- wp:qrcode-barcode-scanner/scanner {"showCredit":true} /-->');
    return { shortcode: shortcode.link, credit: credit.link };
  });

  // -------------------------------------------------------------- as a visitor
  const visitor = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const visit = await visitor.newPage();
  const requests = [];
  visit.on('request', (request) => requests.push(request.url()));
  const workers = [];
  visit.on('worker', (worker) => workers.push(worker.url()));

  await visit.goto(blockUrl);
  check(await visit.locator('[data-qrbs-root]').count() === 1, 'block: one scanner on the page');
  check(await visit.locator('#wpadminbar').count() === 0, 'block: seen by a visitor who is not signed in');
  const loadedBefore = requests.filter((url) => url.endsWith('.wasm'));
  check(loadedBefore.length === 0, 'block: the engine is not downloaded with the page', loadedBefore);
  const blockReports = await threeScans(visit, 'block');
  const blockFacts = await pageFacts(visit, blockUrl);
  check(blockFacts.package.engine_version === '0.11.0', 'block: the engine 0.11.0 is loaded', blockFacts.package);
  check(await visit.locator('[data-qrbs-root] .qrbs__credit').count() === 0, 'block: no credit line by default');
  // The only links in the scanner are the decoded link's own button, never opened by itself.
  check(blockFacts.links.every((link) => link.href === 'https://qrc-ai.com/76xMa'
    && link.rel === 'noopener noreferrer nofollow'), 'block: the only link is the decoded one, marked nofollow',
  blockFacts.links);
  check(await visit.locator('a[href*="qrcode-ai.com"]').count() === 0, 'block: no link to QR Code AI on the page');
  check(workers.some((url) => url.includes(`/wp-content/plugins/${SLUG}/assets/scanner/worker.js`)),
    'block: the scan runs in the plugin\'s module worker', workers);
  if (screenshots) {
    await visit.locator('[data-qrbs-root]').first().scrollIntoViewIfNeeded();
    await shot(visit, join(screenshots, 'screenshot-1.png'));
  }
  await writeReports(join(out, 'block'), blockReports, blockFacts, browser, visit);

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

  // -------------------------------------------------------------- the shortcode
  await visit.goto(created.shortcode);
  const chosen = await visit.locator('[data-qrbs-root] [data-qrbs="profile"]').first().inputValue();
  check(chosen === 'fast', 'shortcode: profile="fast" is chosen first', chosen);
  const shortcodeReports = await threeScans(visit, 'shortcode');
  await writeReports(join(out, 'shortcode'), shortcodeReports, await pageFacts(visit, created.shortcode),
    browser, visit);

  // -------------------------------------------------------------- the credit line
  await visit.goto(created.credit);
  const creditLinks = await visit.$$eval('[data-qrbs-root] .qrbs__credit a', (links) => links.map((link) => link.href));
  check(creditLinks.length === 6, 'credit: the credit line shows six links when turned on', creditLinks);
  // The page names its engine once loaded: one scan loads it.
  await visit.locator('[data-qrbs-root] [data-qrbs="file"]').first().setInputFiles(fixture);
  await waitFinished(visit, 0);
  await writeReports(join(out, 'credit'), {}, await pageFacts(visit, created.credit), browser, visit);

  const elsewhere = [...new Set(requests.filter((url) => new URL(url).origin !== origin))];
  check(elsewhere.length === 0, 'network: every request of the visitor goes to the site itself', elsewhere);
  await visitor.close();

  // -------------------------------------------------------------- remove
  // Deactivate, as its link does; then Delete on the plugins screen, which asks for a
  // confirmation (accepted) and deletes the files in the background.
  // Two of the plugin's static files, served until they are deleted. After the removal, a
  // missing file under wp-content/plugins/ may answer 404 or a redirect to a guessed page: what
  // matters is that the file is no longer served (test/served.mjs).
  const pluginFiles = {
    'readme.txt': null,
    'assets/vendor/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm': WASM_SHA256,
  };
  const served = async (file) => await runChild(process.execPath, [SERVED,
    `${base}/wp-content/plugins/${SLUG}/${file}`, ...(pluginFiles[file] ? [pluginFiles[file]] : [])],
  'ignore') === 0;
  for (const file of Object.keys(pluginFiles)) {
    check(await served(file), `remove: ${file} is served before the removal`);
  }
  await adminTab(`${base}/wp-admin/plugins.php`);
  const deactivate = await page.locator(`${PLUGIN_ROW} .deactivate a`).getAttribute('href');
  await adminTab(new URL(deactivate, page.url()).href);
  check(!(await page.locator(PLUGIN_ROW).getAttribute('class')).split(/\s+/).includes('active'),
    'remove: the plugin is deactivated');
  await adminTab(`${base}/wp-admin/plugins.php`);
  await page.locator(`${PLUGIN_ROW} .delete a`).click();
  await page.waitForFunction((selector) => !document.querySelector(selector)
    || /deleted/i.test(document.querySelector(selector).textContent), PLUGIN_ROW, { timeout: 60000 });
  await adminTab(`${base}/wp-admin/plugins.php`);
  check(await page.locator(PLUGIN_ROW).count() === 0, 'remove: the plugin is no longer listed');
  for (const file of Object.keys(pluginFiles)) {
    check(!(await served(file)), `remove: ${file} is no longer served`);
  }
  await adminTab(`${base}/wp-admin/options.php`);
  const added = (await optionNames()).filter((name) => !optionsBefore.has(name)
    && !/^_(site_)?transient_/.test(name));
  // The options added during the run are WordPress's own (recently_activated records the last
  // deactivation; can_compress_scripts and theme_mods_<theme> come from the admin screens and the
  // theme). None may belong to the plugin: no name names it, and no value holds its slug.
  const optionValues = await page.$$eval('form table input[name], form table textarea[name]',
    (fields) => fields.map((field) => [field.getAttribute('name'), field.value]));
  const left = added.filter((name) => name !== 'recently_activated' && (/qrcode|qrbs|barcode|scanner/i.test(name)
    || optionValues.some(([field, value]) => field === name && /qrcode|qrbs/i.test(value))));
  check(left.length === 0, 'remove: no option of the plugin is left behind', { added, left });

  // -------------------------------------------------------------- the judges
  // The repository's own judges, run while the site still answers so that the removal is
  // checked against it: the reports of each scanner, the page facts and the removal.
  const judge = async (script, ...rest) => {
    const code = await runChild('python3', [join(ROOT, 'scripts', script), ...rest]);
    check(code === 0, `judge: ${script} ${rest[0].startsWith('/') ? '' : rest[0]}`.trim(), code);
  };
  const env = process.env;
  const runUrl = env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null;
  const sourceUrl = env.GITHUB_SHA
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/tree/${env.GITHUB_SHA}/integrations/wordpress`
    : 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/wordpress';
  const wasmUrl = `${base}/wp-content/plugins/${SLUG}/assets/vendor/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm`;
  await judge('check-demo-page.py', join(out, 'credit', 'page.json'), '--example', HERE);
  for (const record of ['block', 'shortcode']) {
    const reports = join(out, record);
    const receipt = join(out, 'receipts', `${record}.json`);
    mkdirSync(dirname(receipt), { recursive: true });
    await judge('destination-acceptance.py', 'reports', '--kind', 'page',
      '--produced-by', `node test/playground.mjs (${record})`,
      '--fast', join(reports, 'fast.json'), '--frame', join(reports, 'frame.json'),
      '--full', join(reports, 'full.json'),
      '--destination', `WordPress plugin zip, ${record}, WordPress ${wp} on PHP ${php} (Playground)`,
      '--identifier', `${SLUG}-${VERSION}.zip`, '--version', '0.11.0', '--url', sourceUrl,
      '--install', 'wp-admin Plugins > Add New > Upload Plugin, then Activate',
      ...(runUrl ? ['--run-url', runUrl] : []), '--receipt', receipt);
    await judge('destination-acceptance.py', 'removed', '--gone', `${process.execPath} ${SERVED} ${wasmUrl} ${WASM_SHA256}`,
      '--uninstall', 'wp-admin Plugins: Deactivate, then Delete', '--receipt', receipt);
  }

  writeFileSync(join(out, 'install.json'), `${JSON.stringify({
    schema: 'qrscan-wordpress-playground/1',
    site: { url: base, wordpress_requested: wp, php_requested: php, footer: versions.wordpress },
    plugin: { zip, version: VERSION },
    pages: { block: blockUrl, ...created },
    removal: {
      uninstall: 'wp-admin Plugins: Deactivate, then Delete',
      gone: wasmUrl,
      options_added: added,
    },
    checks,
  }, null, 2)}\n`);
  console.log(`${checks} checks passed`);
} catch (error) {
  failed = true;
  console.error(error.message);
  // What the browser showed when a check failed, for the run's artifacts.
  for (const [index, open] of browser.contexts().flatMap((context) => context.pages()).entries()) {
    await shot(open, join(out, `failure-${index}.png`));
  }
} finally {
  await browser.close();
  await site[Symbol.asyncDispose]?.();
  await site.server?.close?.();
}
process.exit(failed ? 1 : 0);
