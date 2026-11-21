// The Firefox store package, installed in a new Firefox profile and driven as a user would.
//
//   node test/firefox-addon.mjs [--package ZIP] [--firefox PATH] [--out build/acceptance]
//                               [--headed]
//
// Firefox is started with a new, empty profile and WebDriver BiDi (test/bidi.mjs). The store zip
// itself is installed with `webExtension.install`, as a temporary add-on: release Firefox installs
// an unsigned add-on only that way, and the signed copy from Firefox Add-ons differs from this zip
// only by Mozilla's signature files. Then it checks:
//   install   the add-on ID, the two permissions, no site granted, the "Scan this image" item
//   popup     the toolbar page in a tab: the mixed fixture, given to the file input, in fast,
//             frame and full (release Firefox refuses input.setFiles on an add-on page, so the
//             file goes through a DataTransfer there: test/bidi.mjs)
//   states    an image with no code empties the previous result; a file that is not an image is
//             an error and shows nothing
//   network   a local page shows the request listener works; then no request of the add-on's
//             tab leaves the browser, and the page reports the pinned module
//   remove    `webExtension.uninstall`, then the add-on's page is gone
// FIREFOX or --firefox names the binary (default: firefox on the PATH). The menu click itself
// cannot be driven here: test/chromium.mjs calls the same background handler in Chromium.
// Writes fast.json, frame.json, full.json and page.json under OUT/firefox-addon.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { encodePng } from '../scripts/bytes.mjs';
import { GECKO_ID } from '../scripts/manifest.mjs';
import { Bidi, BidiPage, launchFirefox } from './bidi.mjs';
import {
  ENGINE, HERE, check, checkCount, finished, option, pageFacts, readState, ready, same,
  stageFixture, threeProfiles,
} from './page-contract.mjs';

const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const packageZip = resolve(option('--package',
  join(HERE, 'build', `qrcode-barcode-scanner-firefox-${own.version}.zip`)));
const binary = option('--firefox', process.env.FIREFOX || 'firefox');
const out = resolve(option('--out', join(HERE, 'build', 'acceptance')));
const headed = process.argv.includes('--headed');
const packageSha256 = createHash('sha256').update(readFileSync(packageZip)).digest('hex');

// The add-on's moz-extension:// address is random per profile; this preference fixes it.
const UUID = '5b2e7c1a-93d4-4f0e-8a61-0c7d2e9b4f35';
const base = `moz-extension://${UUID}`;

const stageDir = mkdtempSync(join(tmpdir(), 'qrscan-firefox-addon-'));
const fixture = stageFixture(stageDir);
const blankPath = join(stageDir, 'blank.png');
writeFileSync(blankPath, encodePng(64, 64, new Uint8Array(64 * 64 * 4).fill(255)));
const notImagePath = join(stageDir, 'notes.png');
writeFileSync(notImagePath, 'this is text, not an image\n');

const profile = mkdtempSync(join(tmpdir(), 'qrscan-firefox-profile-'));
writeFileSync(join(profile, 'user.js'), [
  `user_pref("extensions.webextensions.uuids", ${JSON.stringify(JSON.stringify({
    [GECKO_ID]: UUID }))});`,
  'user_pref("browser.shell.checkDefaultBrowser", false);',
  'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
  '',
].join('\n'));

// The control page: WebDriver BiDi reports http(s) requests, not the add-on's own files, so the
// network check first proves on this page that a request is seen.
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
  // A data: icon, so that no favicon request arrives after the add-on page has opened.
  response.end('<!doctype html><title>Control</title><link rel="icon" href="data:,">'
    + '<p>Control page</p>');
});
await new Promise((done) => { server.listen(0, '127.0.0.1', done); });
const control = `http://127.0.0.1:${server.address().port}/control.html`;

// ------------------------------------------------------------------ install

const { child, url } = await launchFirefox(binary, { profile, headless: !headed });
const bidi = await Bidi.connect(url);
let finishedCleanly = false;
try {
  const session = await bidi.send('session.new', { capabilities: {} });
  const browserVersion = session.capabilities.browserVersion;
  console.log(`firefox ${browserVersion} from ${binary}`);

  const requests = [];
  bidi.onEvent((message) => {
    if (message.method === 'network.beforeRequestSent' && message.params.context) {
      requests.push({ context: message.params.context, url: message.params.request.url });
    }
  });
  await bidi.send('session.subscribe', { events: ['network.beforeRequestSent'] });

  const installed = await bidi.send('webExtension.install',
    { extensionData: { type: 'archivePath', path: packageZip } });
  check(installed.extension === GECKO_ID, 'the store zip installs as add-on '
    + `${GECKO_ID}`, installed);

  const tree = await bidi.send('browsingContext.getTree', {});
  const page = new BidiPage(bidi, tree.contexts[0].context);
  await page.goto(control);
  check(requests.some((row) => row.url === control),
    'control: the request listener sees a page request', requests);
  const sinceControl = requests.length;
  await page.goto(`${base}/scanner.html?view=popup`);
  let seen = await ready(page);
  check(seen.state === 'ready', 'the popup page loads the scanner in the add-on', seen.summary);

  const manifest = await page.evaluate(() => browser.runtime.getManifest());
  // Firefox gives back the manifest it normalized: an absent list reads as [].
  const gecko = manifest.browser_specific_settings?.gecko ?? {};
  check(same(manifest.permissions, ['contextMenus', 'activeTab'])
    && (manifest.host_permissions ?? []).length === 0 && gecko.id === GECKO_ID,
  'it holds contextMenus and activeTab, its ID, and no host permission at install',
  { permissions: manifest.permissions, host: manifest.host_permissions, id: gecko.id });
  check(same(gecko.data_collection_permissions?.required, ['none'])
    && (gecko.data_collection_permissions?.optional ?? []).length === 0,
  'Firefox reads the declaration that no data is collected', gecko.data_collection_permissions);
  const granted = await page.evaluate(() => browser.permissions.getAll());
  check(granted.origins.length === 0, 'no site is granted after install', granted.origins);
  const menu = await page.evaluate(async () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        await browser.contextMenus.update('scan-image', {});
        return true;
      } catch {
        await new Promise((done) => { setTimeout(done, 100); });
      }
    }
    return false;
  });
  check(menu, 'the "Scan this image" menu item exists');

  // ---------------------------------------------------------------- the three profiles

  await threeProfiles(page, 'firefox-addon', join(out, 'firefox-addon'),
    () => page.setInputFiles('#file', fixture));
  const facts = await pageFacts(page, join(out, 'firefox-addon'),
    { name: 'firefox', version: browserVersion });
  check(facts.package.engine_version === ENGINE && facts.package.version === ENGINE,
    'the page names the package and the engine it loaded', facts.package);

  seen = await readState(page);
  await page.setInputFiles('#file', blankPath);
  seen = await finished(page, seen.scan);
  check(seen.state === 'empty' && seen.shown.length === 0,
    'an image without a code: empty, and the previous codes are gone', seen.summary);
  await page.setInputFiles('#file', notImagePath);
  seen = await finished(page, seen.scan);
  check(seen.state === 'error' && seen.shown.length === 0 && seen.json === '',
    'a file that is not an image: an error, nothing shown', seen.summary);

  // ---------------------------------------------------------------- network and removal

  const outside = requests.slice(sinceControl)
    .filter((row) => !/^(moz-extension|data|blob|about):/.test(row.url));
  check(outside.length === 0, 'no request of the add-on\'s tab left the browser', outside);
  check(facts.package.wasm_sha256 === own.config.wasmSha256,
    'the page reports the pinned WebAssembly module', facts.package.wasm_sha256);

  await bidi.send('webExtension.uninstall', { extension: GECKO_ID });
  let gone;
  try {
    await page.goto(`${base}/scanner.html`);
    gone = !(await page.evaluate(() => Boolean(document.getElementById('result'))));
  } catch {
    gone = true;
  }
  check(gone, 'after webExtension.uninstall the add-on page is gone');

  writeFileSync(join(out, 'firefox-addon-run.json'), `${JSON.stringify({
    checks: checkCount(), package: { path: packageZip, sha256: packageSha256 }, fixture,
    browser: `firefox ${browserVersion}`, binary, file_route: page.fileRoute,
    requests: requests.map((row) => row.url),
  }, null, 2)}\n`);
  await bidi.send('session.end', {}).catch(() => {});
  finishedCleanly = true;
  console.log(`${checkCount()} checks passed`);
} finally {
  bidi.close();
  child.kill();
  server.close();
  // The profile is a temporary folder of this run only.
  rmSync(profile, { recursive: true, force: true });
  if (!finishedCleanly) process.exitCode = 1;
}
