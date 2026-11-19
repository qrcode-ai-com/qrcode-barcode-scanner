// SPDX-License-Identifier: MIT
// The built main.js in the two browser engines Obsidian runs on: Chromium (desktop, Android)
// and WebKit (iPhone, iPad). The page has no network: every request is refused and counted.
//
// The test needs Playwright's own Chromium and WebKit (`npx playwright-core install chromium
// webkit`). Without them it is skipped, unless QRSCAN_OBSIDIAN_BROWSERS=required, as in CI.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { before, describe, test } from 'node:test';
import { build } from 'esbuild';
import { buildMain, CODE128, EXPECTED, HERE, mixedFixture, QR } from './helpers.mjs';

const required = process.env.QRSCAN_OBSIDIAN_BROWSERS === 'required';
let playwright = null;
try {
  playwright = await import('playwright-core');
} catch {
  playwright = null;
}

function available(name) {
  if (!playwright) return false;
  try {
    return existsSync(playwright[name].executablePath());
  } catch {
    return false;
  }
}

async function mockScript() {
  const result = await build({
    entryPoints: [join(HERE, 'test/obsidian-mock.mjs')],
    bundle: true, format: 'iife', globalName: 'ObsidianMock', write: false, logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

/** Runs the note command in the page and returns what it wrote, or the notices it showed. */
async function scanInPage({ fixture, profile, format }) {
  const M = window.ObsidianMock;
  M.reset();
  const bytes = Uint8Array.from(atob(fixture), (char) => char.charCodeAt(0));
  const app = M.createApp({ files: { 'Inbox.md': new Uint8Array(), 'mixed.png': bytes }, notes: { 'Inbox.md': [{ link: 'mixed.png', line: 2 }] } });
  app.pluginData = { profile, format };
  const plugin = new window.QrBarcodeScanner.default(app, { id: 'qrcode-barcode-scanner' });
  await plugin.onload();
  const editor = new M.FakeEditor(['# Inbox', '', '![[mixed.png]]', ''], 3);
  const view = new M.MarkdownView(app.file('Inbox.md'), editor);
  const started = performance.now();
  plugin.commands.find((entry) => entry.id === 'scan-image-in-note').editorCallback(editor, view);
  const finished = () => M.Modal.opened.length || M.Notice.shown.some((notice) => !notice.message.startsWith('Scanning '));
  while (!finished()) {
    if (performance.now() - started > 60000) throw new Error('the scan did not finish');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const elapsed = Math.round(performance.now() - started);
  const modal = M.Modal.opened[0];
  if (!modal) return { notices: M.Notice.shown.map((notice) => notice.message) };
  modal.contentEl.allButtons().find((entry) => entry.text === 'Insert into Inbox').click();
  return { inserted: editor.inserted, elapsed, nativeBase64: typeof Uint8Array.fromBase64 === 'function' };
}

for (const name of ['chromium', 'webkit']) {
  const skip = !available(name) && !required && `Playwright's ${name} is not installed`;
  describe(`main.js in ${name}`, { skip }, () => {
    let browser;
    let page;
    const requests = [];

    before(async () => {
      assert.ok(playwright, 'playwright-core is installed');
      browser = await playwright[name].launch();
      const context = await browser.newContext();
      await context.route('**/*', (route) => { requests.push(route.request().url()); return route.abort(); });
      page = await context.newPage();
      page.on('pageerror', (error) => { throw error; });
      await page.setContent('<!doctype html><title>QR Code and Barcode Scanner</title>');
      await page.addScriptTag({ content: await mockScript() });
      // Obsidian evaluates main.js as CommonJS with `require` limited to its own modules.
      const main = buildMain().code;
      await page.addScriptTag({
        content: `window.QrBarcodeScanner = (function () {
  const module = { exports: {} };
  const require = (id) => { if (id === 'obsidian') return window.ObsidianMock; throw new Error('not provided: ' + id); };
  (function (module, exports, require) {\n${main}\n})(module, module.exports, require);
  return module.exports;
})();`,
      });
    });

    for (const profile of ['fast', 'frame', 'full']) {
      test(`profile ${profile} finds both codes and inserts them`, async (t) => {
        const fixture = Buffer.from(mixedFixture()).toString('base64');
        const result = await page.evaluate(scanInPage, { fixture, profile, format: 'list' });
        assert.ok(result.inserted, `the scan opened no window: ${JSON.stringify(result.notices)}`);
        const lines = result.inserted[0].slice(0, -1).split('\n');
        assert.deepEqual(new Set(lines), EXPECTED, `${QR} and ${CODE128}`);
        assert.deepEqual(requests, [], 'the page made no request');
        t.diagnostic(`${name} ${profile}: ${result.elapsed} ms, native base64 decoder: ${result.nativeBase64}`);
      });
    }

    test('closes', async () => {
      await browser?.close();
    });
  });
}
