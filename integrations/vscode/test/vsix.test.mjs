// SPDX-License-Identifier: MIT
// The packaged VSIX: its exact files, its manifest, the engine it bundles, its README and its
// licenses, then the extension tests again on its unpacked copy. Run `npm run package` first;
// QRSCAN_VSIX names another VSIX to check.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { zipEntries, zipRead } from '../scripts/zip.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const vsixPath = resolve(process.env.QRSCAN_VSIX ?? join(here, 'out', `${manifest.name}-${manifest.version}.vsix`));
const vsix = readFileSync(vsixPath);
const entries = zipEntries(vsix);
const read = (name) => {
  const entry = entries.find((candidate) => candidate.name === name);
  assert.ok(entry, `${name} is in the VSIX`);
  return zipRead(vsix, entry);
};
const text = (name) => read(name).toString('utf8');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(join(here, 'package.json'));
const engineRoot = dirname(require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm/package.json'));
const engineInfo = JSON.parse(readFileSync(join(engineRoot, 'build-info.json'), 'utf8'));

const unpacked = mkdtempSync(join(tmpdir(), 'qrscan-vsix-'));
after(() => rmSync(unpacked, { recursive: true, force: true }));

test('the VSIX holds exactly the extension files, and stays small', () => {
  assert.deepEqual(entries.map((entry) => entry.name).sort(), [
    '[Content_Types].xml',
    'extension.vsixmanifest',
    'extension/LICENSE.md',
    'extension/changelog.md',
    'extension/dist/engine/LICENSE',
    'extension/dist/engine/LICENSE-APACHE-2.0',
    'extension/dist/engine/THIRD-PARTY.md',
    'extension/dist/engine/build-info.json',
    'extension/dist/extension.js',
    'extension/dist/qrcode-barcode-scanner_bg.wasm',
    'extension/dist/worker.js',
    'extension/images/icon.png',
    'extension/package.json',
    'extension/readme.md',
  ]);
  // About 1 MB today; node_modules, sources or source maps would push it well past this bound.
  assert.ok(vsix.length < 1_500_000, `${vsix.length} bytes`);
  for (const entry of entries) assert.ok(entry.size < 3_000_000, `${entry.name}: ${entry.size} bytes`);
  const receipt = JSON.parse(readFileSync(join(here, 'out', 'package-receipt.json'), 'utf8'));
  if (resolve(receipt.vsix) === vsixPath) {
    assert.deepEqual([receipt.bytes, receipt.sha256], [vsix.length, sha256(vsix)], 'the receipt describes this VSIX');
  }
});

test('every entry is dated SOURCE_DATE_EPOCH in UTC, whatever the time zone of the build', () => {
  // ZIP stores an MS-DOS date and time with no time zone, and the packager writes them in the
  // zone it runs in. A build in UTC+4 then differs from the publish lane's rebuild in UTC.
  const receipt = JSON.parse(readFileSync(join(here, 'out', 'package-receipt.json'), 'utf8'));
  const epoch = resolve(receipt.vsix) === vsixPath ? receipt.sourceDateEpoch : Number(process.env.SOURCE_DATE_EPOCH || 1795132800);
  const when = new Date(epoch * 1000);
  const dosDate = ((when.getUTCFullYear() - 1980) << 9) | ((when.getUTCMonth() + 1) << 5) | when.getUTCDate();
  const dosTime = (when.getUTCHours() << 11) | (when.getUTCMinutes() << 5) | (when.getUTCSeconds() >> 1);
  for (const entry of entries) {
    assert.deepEqual([entry.name, entry.dosDate, entry.dosTime], [entry.name, dosDate, dosTime]);
  }
});

test('the manifest names one universal extension of the proposed publisher', () => {
  const xml = text('extension.vsixmanifest');
  const identity = /<Identity ([^>]+)\/>/.exec(xml)[1];
  const attributes = Object.fromEntries([...identity.matchAll(/(\w+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
  assert.deepEqual(attributes, { Language: 'en-US', Id: 'qrcode-barcode-scanner', Version: manifest.version, Publisher: 'qrcode-ai-com' });
  assert.ok(!/TargetPlatform/.test(xml), 'no target platform: one VSIX for every platform');
  const property = (id) => new RegExp(`<Property Id="${id.replace(/\./g, '\\.')}" Value="([^"]*)"`).exec(xml)?.[1];
  assert.equal(property('Microsoft.VisualStudio.Code.Engine'), '^1.74.0');
  assert.equal(property('Microsoft.VisualStudio.Code.ExtensionKind'), 'workspace');
  assert.equal(property('Microsoft.VisualStudio.Services.Links.Learn'), manifest.homepage);
  assert.equal(property('Microsoft.VisualStudio.Services.Links.Support'), manifest.bugs.url);
  assert.equal(property('Microsoft.VisualStudio.Services.Branding.Color'), '#18181b');
  assert.match(xml, /<License>extension\/LICENSE\.md<\/License>/);
  assert.match(xml, /<Icon>extension\/images\/icon\.png<\/Icon>/);
  assert.match(xml, /<Categories>Other<\/Categories>/);
  assert.deepEqual(JSON.parse(text('extension/package.json')), manifest, 'the packaged manifest is the source manifest');
  assert.deepEqual([...read('extension/images/icon.png').subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test('the bundled engine is the published 0.11.0 module, byte for byte', () => {
  const info = JSON.parse(text('extension/dist/engine/build-info.json'));
  assert.deepEqual(info, engineInfo);
  const wasm = read('extension/dist/qrcode-barcode-scanner_bg.wasm');
  assert.equal(sha256(wasm), info.wasm.sha256);
  assert.equal(info.wasm.sha256, 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68');
  assert.equal(info.source_revision, '176ac96ef16ee330dbfc6ada10327d0b4e23a8b2');
  for (const file of ['LICENSE', 'LICENSE-APACHE-2.0', 'THIRD-PARTY.md']) {
    assert.ok(read(`extension/dist/engine/${file}`).equals(readFileSync(join(engineRoot, file))), file);
  }
});

test('the bundles load only vscode and worker threads, and never fetch', () => {
  for (const [name, modules] of [['extension.js', ['node:worker_threads', 'vscode']], ['worker.js', ['node:worker_threads']]]) {
    const code = text(`extension/dist/${name}`);
    assert.deepEqual([...new Set([...code.matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1]))].sort(), modules, name);
    for (const pattern of [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /\beval\s*\(/, /new Function\b/, /sourceMappingURL/]) {
      assert.ok(!pattern.test(code), `${name} has no ${pattern}`);
    }
  }
});

test('the README holds no SVG image, only absolute links, and the six links in sentences', () => {
  const readme = text('extension/readme.md');
  assert.ok(!/!\[[^\]]*\]\([^)]*\.svg[^)]*\)/i.test(readme), 'no Markdown SVG image');
  assert.ok(!/<img[^>]+src="[^"]*\.svg/i.test(readme), 'no HTML SVG image');
  for (const [, url] of readme.matchAll(/\]\(([^)\s]+)\)/g)) assert.match(url, /^https:\/\//, url);
  for (const [, url] of readme.matchAll(/(?:src|srcset|href)="([^"]+)"/g)) assert.match(url, /^https:\/\//, url);
  const root = 'https://qrcode-ai.com/en-US/';
  const six = ['qr-code-scanner', 'barcode-scanner', 'qr-code-scanner/integrations/vscode', 'barcode-scanner/integrations/vscode', 'qr-code-generator', 'barcode-generator'];
  const prose = readme.split('\n\n').filter((paragraph) => /^[A-Z]/.test(paragraph) && paragraph.split(/\s+/).length >= 8);
  for (const path of six) assert.ok(prose.some((paragraph) => paragraph.includes(`](${root}${path})`)), path);
  assert.match(readme, /Maintained by \*\*Thibaut Mélen & Nicolas Cella\*\* for \*\*QR Code AI\*\*, a product of \*\*SuperNovae Studio\*\*\./);
  assert.ok(readme.includes('[Ask ChatGPT](https://chatgpt.com/?q='), 'the Ask AI badges become text links');
});

test('LICENSE.md states the boundary: MIT extension code, AGPL engine 0.11.0', () => {
  const license = text('extension/LICENSE.md');
  assert.match(license, /## The extension's own code: MIT\n/);
  assert.match(license, /MIT License\n\nCopyright \(c\) \d{4}/);
  assert.match(license, /## The bundled scanner engine: AGPL-3\.0-or-later\n/);
  assert.ok(license.includes('`@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0`'));
  assert.ok(license.includes('176ac96ef16ee330dbfc6ada10327d0b4e23a8b2'));
  assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE\s*\n\s*Version 3, 19 November 2007/);
  assert.equal(manifest.license, 'MIT AND AGPL-3.0-or-later');
});

test('the unpacked VSIX passes the extension tests', () => {
  for (const entry of entries.filter((candidate) => candidate.name.startsWith('extension/'))) {
    const target = join(unpacked, ...entry.name.slice('extension/'.length).split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, zipRead(vsix, entry));
  }
  // A nested runner that inherits NODE_TEST_CONTEXT reports to its parent instead of printing TAP.
  const { NODE_TEST_CONTEXT: _parent, ...env } = process.env;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', join(here, 'test', 'extension.test.mjs')], {
    env: { ...env, QRSCAN_VSCODE_EXTENSION_DIR: unpacked },
    encoding: 'utf8',
    timeout: 300_000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const passed = Number(/^# pass (\d+)$/m.exec(result.stdout)?.[1]);
  assert.ok(passed >= 17, `${passed} extension tests passed on the unpacked VSIX`);
  assert.match(result.stdout, /^# fail 0$/m);
});
