// SPDX-License-Identifier: MIT
// The built dist/app.js in Playwright's Chromium, under Canva's content security policy, in a
// test page that stands in for Canva's app iframe.
//
//   node test/canva-csp.mjs [--app dist/app.js] [--out build/acceptance] [--shots build/screenshots]
//                           [--headed]
//
// Canva runs an app's one JavaScript file in an iframe whose policy is published at
// https://www.canva.dev/docs/apps/content-security-policy/ (read 21 November 2026). The page
// here is served with that policy, word for word, with its two placeholders filled: the address
// of the app's file and the nonce of the host's own script. The host's script is a fake of the
// parts of Canva's SDK the app's packages read (window.canva_sdk and window.__canva__), so the
// real @canva/* packages inside the bundle run unchanged. Canva itself is not part of this test;
// Canva's review is the owner's step. It checks:
//   load      the engine starts under the policy and the packages register their versions
//   select    an image selection reaches the panel through selection.registerOnChange
//   profiles  the mixed fixture is read in fast, frame and full through getTemporaryUrl and fetch
//   links     a decoded link is text, never a link; the source button asks Canva to open the
//             repository through requestOpenExternalUrl
//   states    an image with no code, a file that is not an image, a missing file, nothing selected
//   themes    the panel follows Canva's light and dark themes (screenshots written to --shots)
//   policy    no violation of the policy; every request is the page, the app, or a temporary URL
//   control   the same page without 'wasm-unsafe-eval' cannot start the engine and says so, which
//             shows the policy is enforced here
//   remove    the app leaves no cookie or storage behind, and the page is closed
// The three reports are written to OUT/fast.json, OUT/frame.json and OUT/full.json for
// scripts/destination-acceptance.py to judge, with OUT/run.json for the facts above.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { encodePng } from '../scripts/png.mjs';

const HERE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(HERE, '..', '..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const appPath = resolve(option('--app', join(HERE, 'dist', 'app.js')));
const out = resolve(option('--out', join(HERE, 'build', 'acceptance')));
const shots = resolve(option('--shots', join(HERE, 'build', 'screenshots')));
const headed = process.argv.includes('--headed');

const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
const ENGINE = { package: '@qrcode-ai-com/qrcode-barcode-scanner-wasm', version: '0.11.0',
  wasm_sha256: 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68' };
const SOURCE_URL = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust';
const APP_ORIGIN = 'https://app.example.com';
const PAGE_URL = `${APP_ORIGIN}/canva/index.html`;
const APP_URL = `${APP_ORIGIN}/canva/app.js`;
const TEMPORARY = 'https://canva-temporary.example.com';
const PANEL = { width: 360, height: 640 };

// Canva's policy for an app's iframe, as published. Only the placeholders are replaced below.
const CANVA_CSP = [
  "base-uri 'none';",
  "child-src 'none';",
  'connect-src https: data: wss: https://o13855.ingest.sentry.io https://telemetry.canva.com/v1/traces;',
  "default-src 'none';",
  'font-src  data: https: https://static.canva.com;',
  "form-action 'none';",
  'frame-ancestors https://.canva.com http://localhost:*;',
  "frame-src 'none';",
  'img-src data: https: blob: https://static.canva.com;',
  'media-src  data: https: blob: https://static.canva.com;',
  "object-src 'none';",
  "script-src 'wasm-unsafe-eval'  https://thirdparty-public-apps.canva-apps-dev.com/XX/file.js https://static.canva.com 'nonce-XXXX';",
  "style-src 'unsafe-inline' https://static.canva.com;",
  "worker-src 'none';",
].join(' ');

function policy(nonce, { wasm = true } = {}) {
  let text = CANVA_CSP
    .replace('https://thirdparty-public-apps.canva-apps-dev.com/XX/file.js', APP_URL)
    .replace("'nonce-XXXX'", `'nonce-${nonce}'`);
  if (!wasm) text = text.replace("'wasm-unsafe-eval'", '');
  if (text.includes('XX')) throw new Error('a placeholder of the policy is left');
  return text;
}

let failures = 0;
const facts = { checks: [] };
function check(name, ok, detail = '') {
  facts.checks.push({ name, ok: Boolean(ok), detail: String(detail) });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures += 1;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ------------------------------------------------------------------ inputs

const stageDir = mkdtempSync(join(tmpdir(), 'qrscan-canva-csp-'));
const fixturePath = execFileSync('python3', [join(ROOT, 'scripts', 'destination-acceptance.py'),
  'stage', stageDir], { encoding: 'utf8' }).trim();
const files = {
  'mixed.png': { type: 'image/png', body: readFileSync(fixturePath) },
  'blank.png': { type: 'image/png', body: encodePng(64, 64, new Uint8Array(64 * 64 * 4).fill(255)) },
  'notes.png': { type: 'image/png', body: Buffer.from('this is text, not an image\n') },
};
const appCode = readFileSync(appPath, 'utf8');
const messages = Object.fromEntries(Object.entries(JSON.parse(readFileSync(join(HERE, 'dist',
  'messages_en.json'), 'utf8'))).map(([id, message]) => [id, message.defaultMessage]));

// The host's script: the parts of Canva's SDK that the app's packages read when they load, and
// the calls the app makes. Anything else throws, so an unexpected call shows up as an error.
function fakeHost(localized) {
  const host = {
    listeners: [], temporary: [], opened: [], registered: [], ui: [], theme: 'light',
    violations: [], uiKitVersion: null, rendered: 0,
  };
  window.__host = host;
  document.addEventListener('securitypolicyviolation', (event) => {
    host.violations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
  });
  const unavailable = (name) => () => { throw new Error(`${name} is not part of this test host`); };
  const stubs = (names) => Object.fromEntries(names.map((name) => [name, unavailable(name)]));
  const selection = {
    registerOnChange({ scope, onChange }) {
      const entry = { scope, onChange };
      host.listeners.push(entry);
      return () => { host.listeners = host.listeners.filter((other) => other !== entry); };
    },
  };
  host.select = (refs) => {
    for (const { scope, onChange } of host.listeners) {
      if (scope !== 'image') continue;
      onChange({
        scope,
        count: refs.length,
        read: async () => ({ contents: refs.map((ref) => ({ ref })), save: async () => {} }),
      });
    }
  };
  host.setTheme = (theme) => {
    host.theme = theme;
    for (const listener of host.ui) listener({ theme });
  };
  window.canva_sdk = {
    design: { v2: {
      designInteraction: {
        ...stubs(['addAudioTrack', 'addElementAtCursor', 'addElementAtPoint', 'addNativeElement',
          'addPage', 'bulkCreate', 'createRichtextRange', 'editContent', 'getBrandKitColors',
          'getCurrentPageContext', 'getCurrentPageMetadata', 'getDefaultPageDimensions',
          'getDesignColors', 'getDesignMetadata', 'getDesignToken', 'initAppElement', 'openDesign',
          'publish', 'resizeDesign', 'searchResizePreset', 'setCurrentPageBackground']),
        overlay: {},
        selection,
      },
      autofill: stubs(['autofillDesign', 'requestDataFieldMatching', 'setDataFieldLabelVisibility']),
      dragAndDrop: {},
      export: stubs(['requestExport']),
      templates: stubs(['applyTemplate', 'getBrandTemplateMetadata', 'getDesignTemplateMetadata',
        'requestApplyPublicTemplate', 'requestBrandTemplates']),
    } },
    asset: { v2: { content: {
      ...stubs(['findFonts', 'openColorSelector', 'requestFontSelection', 'searchFonts', 'upload']),
      async getTemporaryUrl({ type, ref }) {
        host.temporary.push({ type, ref });
        return { url: `https://canva-temporary.example.com/${encodeURIComponent(ref)}`, expiry: Date.now() + 60000 };
      },
    } } },
    intents: { v1: { design: {
      prepareDesignEditor(implementation) {
        host.rendered += 1;
        implementation.render();
      },
    } } },
    platform: { v2: {
      appProcess: {},
      features: {},
      notification: {},
      i18n: { getLocalizedMessages: () => ({ messages: localized }), pseudolocalize: (value) => value },
      platform: {
        getPlatformInfo: () => ({ canAcceptPayments: false }),
        async requestOpenExternalUrl({ url }) {
          host.opened.push(url);
          return { status: 'aborted' };
        },
      },
    } },
  };
  window.__canva__ = {
    sdkRegistration: {
      registerPackageVersion: (name, version, stage) => { host.registered.push([name, version, stage]); },
    },
    uiKit: {
      async registerAppUiKitVersion({ version }) { host.uiKitVersion = version; },
      getUiContext: async () => ({ theme: host.theme }),
      onUiContextChange(listener) {
        host.ui.push(listener);
        return () => { host.ui = host.ui.filter((other) => other !== listener); };
      },
    },
  };
}

function pageHtml(nonce) {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<title>Canva app test page</title>
<script nonce="${nonce}">(${fakeHost.toString()})(${JSON.stringify(messages)});</script>
</head>
<body style="margin: 0 0 0 16px">
<div id="root"></div>
<script nonce="${nonce}" src="${APP_URL}"></script>
</body>
</html>
`;
}

// ------------------------------------------------------------------ the page

const browser = await chromium.launch({ headless: !headed });

async function openPanel({ wasm = true } = {}) {
  const context = await browser.newContext({ viewport: PANEL, deviceScaleFactor: 2 });
  const requests = { page: 0, app: 0, temporary: [], outside: [] };
  const nonce = `n${Math.random().toString(36).slice(2, 12)}`;
  await context.route(/.*/, async (route) => {
    const url = route.request().url();
    if (url === PAGE_URL) {
      requests.page += 1;
      return route.fulfill({ status: 200, body: pageHtml(nonce), headers: {
        'content-type': 'text/html; charset=utf-8', 'content-security-policy': policy(nonce, { wasm }),
      } });
    }
    if (url === APP_URL) {
      requests.app += 1;
      return route.fulfill({ status: 200, body: appCode, headers: { 'content-type': 'text/javascript; charset=utf-8' } });
    }
    if (url.startsWith(`${TEMPORARY}/`)) {
      const name = decodeURIComponent(url.slice(TEMPORARY.length + 1));
      requests.temporary.push(name);
      const file = files[name];
      const headers = { 'access-control-allow-origin': '*', 'cache-control': 'no-store' };
      if (!file) return route.fulfill({ status: 404, headers });
      return route.fulfill({ status: 200, body: file.body, headers: { ...headers, 'content-type': file.type } });
    }
    requests.outside.push(url);
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await page.goto(PAGE_URL);
  return { context, page, requests, errors };
}

const host = (page) => page.evaluate(() => JSON.parse(JSON.stringify({
  ...window.__host, listeners: window.__host.listeners.length, ui: window.__host.ui.length,
})));
const resultState = (page) => page.evaluate(() => {
  const result = document.querySelector('#result');
  return {
    state: result?.dataset.state ?? null,
    scan: Number(result?.dataset.scan ?? 0),
    summary: document.querySelector('#summary')?.textContent ?? '',
    rows: [...document.querySelectorAll('.detection')].map((row) => [row.dataset.symbology,
      row.querySelector('.text')?.textContent ?? '']).sort(),
    links: document.querySelectorAll('#result a').length,
  };
});

async function scanOnce(page, profile) {
  const before = (await resultState(page)).scan;
  await page.getByRole('radio', { name: profile[0].toUpperCase() + profile.slice(1), exact: true }).check({ force: true });
  await page.waitForSelector(`#profile[data-value="${profile}"]`, { state: 'attached' });
  await page.getByRole('button', { name: 'Scan selected image' }).click();
  await page.waitForFunction((n) => {
    const result = document.querySelector('#result');
    return Number(result.dataset.scan) === n && !['scanning', 'loading'].includes(result.dataset.state);
  }, before + 1, { timeout: 60000 });
  return resultState(page);
}

async function readReport(page) {
  const report = page.locator('#report-json');
  if (await report.isHidden()) await page.getByRole('button', { name: 'Show the full report' }).click();
  const text = await report.textContent();
  return { profile: await report.getAttribute('data-profile'), report: JSON.parse(text) };
}

mkdirSync(out, { recursive: true });
mkdirSync(shots, { recursive: true });

// ------------------------------------------------------------------ load
const panel = await openPanel();
const { page } = panel;
await page.waitForSelector('#about[data-engine-version="0.11.0"]', { state: 'attached', timeout: 60000 });
await page.waitForSelector('#result[data-state="ready"]', { state: 'attached' });
let seen = await host(page);
const about = await page.evaluate(() => ({ ...document.querySelector('#about').dataset }));
check('load: the engine starts under the policy', about.engineVersion === '0.11.0'
  && about.package === ENGINE.package && about.wasmSha256 === ENGINE.wasm_sha256, JSON.stringify(about));
check('load: render is called once through prepareDesignEditor', seen.rendered === 1);
check('load: the App UI Kit registers its version', seen.uiKitVersion === '5.16.1', seen.uiKitVersion);
const registered = Object.fromEntries(seen.registered.map(([name, version]) => [name, version]));
check('load: the SDK packages register their versions', same(registered, {
  'app-i18n-kit': '1.3.0', asset: '2.4.0', design: '2.14.0', 'intents/design': '2.8.0', platform: '2.2.3',
}), JSON.stringify(registered));
check('load: one selection listener, scope image', seen.listeners === 1);
check('select: nothing selected, the scan button is disabled',
  await page.getByRole('button', { name: 'Scan selected image' }).isDisabled());

// ------------------------------------------------------------------ select and profiles
await page.evaluate(() => window.__host.select(['mixed.png']));
await page.waitForSelector('#selection[data-count="1"]');
check('select: the selection reaches the panel', true);
const reports = {};
for (const profile of ['fast', 'frame', 'full']) {
  const state = await scanOnce(page, profile);
  check(`profiles: ${profile} finds the two codes`, state.state === 'result' && same(state.rows, EXPECTED),
    JSON.stringify(state.rows));
  const { profile: shown, report } = await readReport(page);
  const decoded = report.detections.map((row) => [row.symbology, row.content.text]).sort();
  check(`profiles: ${profile} report`, shown === profile && same(decoded, EXPECTED)
    && report.trace?.budget_exhausted === false, `${report.detections.length} detections`);
  reports[profile] = report;
  writeFileSync(join(out, `${profile}.json`), `${JSON.stringify(report, null, 2)}\n`);
}
seen = await host(page);
check('profiles: each scan asked Canva for a temporary URL of the selected image',
  seen.temporary.length === 3 && seen.temporary.every((entry) => entry.type === 'image' && entry.ref === 'mixed.png'));
check('profiles: each scan downloaded the image once', same(panel.requests.temporary, ['mixed.png', 'mixed.png', 'mixed.png']));

// ------------------------------------------------------------------ links and themes
let state = await resultState(page);
check('links: the decoded link is text, not a link', state.links === 0
  && state.rows.some(([, text]) => text === 'https://qrc-ai.com/76xMa'));
await page.getByRole('button', { name: 'Hide the full report' }).click();
await page.getByLabel('Expected text').fill('STOCK-4827');
await page.waitForFunction(() => document.querySelectorAll('.detection').length === 2
  && document.body.textContent.includes('Matches') && document.body.textContent.includes('Differs'));
check('expected: one code matches the expected text and the other differs', true);
// The luminance of the title's text color: dark text on the light theme, light text on the dark.
const titleLight = () => page.evaluate(() => {
  const [r, g, b] = getComputedStyle(document.querySelector('h1, h2, h3, h4')).color.match(/\d+/g).map(Number);
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
});
const lightText = await titleLight();
await page.screenshot({ path: join(shots, 'panel-light.png'), fullPage: true });
await page.evaluate(() => window.__host.setTheme('dark'));
await page.waitForFunction((before) => {
  const [r, g, b] = getComputedStyle(document.querySelector('h1, h2, h3, h4')).color.match(/\d+/g).map(Number);
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b) !== before;
}, lightText);
const darkText = await titleLight();
await page.waitForTimeout(800); // the App UI Kit animates the change of theme
await page.screenshot({ path: join(shots, 'panel-dark.png'), fullPage: true });
check('themes: the panel follows the light and dark themes', lightText < 96 && darkText > 160,
  `title luminance ${lightText} light, ${darkText} dark`);
await page.evaluate(() => window.__host.setTheme('light'));
await page.getByLabel('Expected text').fill('');
await page.getByRole('button', { name: 'Source code and licenses' }).click();
await page.waitForFunction(() => window.__host.opened.length === 1);
seen = await host(page);
check('links: the source button asks Canva to open the repository', same(seen.opened, [SOURCE_URL]),
  JSON.stringify(seen.opened));

// ------------------------------------------------------------------ states
await page.evaluate(() => window.__host.select(['blank.png']));
state = await scanOnce(page, 'fast');
check('states: an image with no code', state.state === 'empty' && state.rows.length === 0, state.summary);
await page.evaluate(() => window.__host.select(['notes.png']));
state = await scanOnce(page, 'fast');
check('states: a file that is not an image', state.state === 'error' && state.rows.length === 0
  && state.summary.includes('format the scanner does not read'), state.summary);
await page.evaluate(() => window.__host.select(['gone.png']));
state = await scanOnce(page, 'fast');
check('states: a file Canva does not return', state.state === 'error' && state.summary.includes('status 404'), state.summary);
await page.evaluate(() => window.__host.select([]));
await page.waitForSelector('#selection[data-count="0"]');
check('states: an empty selection disables the scan button again',
  await page.getByRole('button', { name: 'Scan selected image' }).isDisabled());

// ------------------------------------------------------------------ policy
seen = await host(page);
check('policy: no violation', seen.violations.length === 0, JSON.stringify(seen.violations));
// Two messages are expected. Chromium says the frame-ancestors source 'https://.canva.com' of
// Canva's published policy is not a valid expression (it does not apply to this page, which is not
// in a frame), and the missing-file state above logs its 404.
const expectedErrors = [
  "console: The Content-Security-Policy directive 'frame-ancestors' does not support the source expression 'https://.canva.com'",
  'console: Failed to load resource: the server responded with a status of 404 (Not Found)',
];
check('policy: no error in the page but the two expected ones', same(panel.errors, expectedErrors),
  panel.errors.join(' | '));
check('policy: every request is the page, the app or a temporary URL', panel.requests.outside.length === 0
  && panel.requests.page === 1 && panel.requests.app === 1, JSON.stringify(panel.requests.outside));

// ------------------------------------------------------------------ remove
const storage = await panel.context.storageState();
check('remove: no cookie and no storage left behind', storage.cookies.length === 0
  && storage.origins.every((origin) => origin.localStorage.length === 0), JSON.stringify(storage));
await panel.context.close();
check('remove: the page is closed', page.isClosed());

// ------------------------------------------------------------------ control
const control = await openPanel({ wasm: false });
await control.page.waitForSelector('#result[data-state="error"]', { state: 'attached', timeout: 60000 });
const controlSeen = await host(control.page);
const controlState = await resultState(control.page);
check('control: without wasm-unsafe-eval the engine cannot start, and the panel says so',
  controlState.summary.includes('could not start') && controlSeen.violations.some((v) => v.directive === 'script-src'),
  JSON.stringify(controlSeen.violations));
await control.context.close();
await browser.close();

facts.engine = ENGINE;
facts.app = { path: appPath, bytes: Buffer.byteLength(appCode) };
facts.policy_source = 'https://www.canva.dev/docs/apps/content-security-policy/';
facts.reports = Object.fromEntries(Object.entries(reports).map(([profile, report]) => [profile,
  report.detections.length]));
writeFileSync(join(out, 'run.json'), `${JSON.stringify(facts, null, 2)}\n`);
rmSync(stageDir, { recursive: true, force: true });
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
