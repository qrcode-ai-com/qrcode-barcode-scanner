// Unit tests of the module's scanner helpers, the package build and its inspection.
//
//   node --test test/unit.test.mjs
//
// The build and inspection tests read build/, so `npm run build` runs first.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readZip, writeZip } from '../scripts/bytes.mjs';
import {
  MODULE, PACKAGE_ELEMENT, checkVersions, packageName, scannerPackage, tag, updatesXml,
} from '../scripts/build.mjs';
import {
  MODULE_FILES, PACKAGE_FILES, inspectModule, inspectPackage, manifestFiles,
} from '../scripts/inspect.mjs';
import { ASSETS, SCREENSHOTS, icons } from '../scripts/listing-assets.mjs';
import { format, openableUrl, sniffType } from '../extension/mod_qrcodebarcodescanner/media/js/results.js';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const PACKAGE = join(HERE, 'build', packageName(own.version));
const source = (path) => readFileSync(join(HERE, 'extension', path), 'utf8');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('the scanner helpers refuse what they must', () => {
  assert.equal(sniffType(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])), 'image/png');
  assert.equal(sniffType(Buffer.from('BM\x46\0\0\0')), null);
  assert.equal(sniffType(Buffer.from('this is text, not an image\n')), null);
  assert.equal(openableUrl({ payload: { kind: 'url', url: 'javascript:alert(1)' } }), null);
  assert.equal(openableUrl({ payload: { kind: 'url', url: 'https://example.com' } }), 'https://example.com/');
  assert.equal(format('Reading %1$s with the %2$s profile…', 'a.png', 'fast'), 'Reading a.png with the fast profile…');
});

test('every text the script uses is passed by the Dispatcher and translated', () => {
  const view = source(`${MODULE}/media/js/view.js`);
  const dispatcher = source(`${MODULE}/src/Dispatcher/Dispatcher.php`);
  const ini = source(`${MODULE}/language/en-GB/${MODULE}.ini`);
  const texts = [.../const TEXTS = \[([^\]]*)\]/.exec(dispatcher)[1].matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
  const used = [...new Set([...view.matchAll(/\btext\('([A-Za-z]+)'/g)].map((match) => match[1]))];
  assert.ok(used.length >= 10, used.join(' '));
  for (const key of [...used, 'idle', 'empty', 'inconclusive', 'unsupported', 'unreadable']) {
    assert.ok(texts.includes(key), `the Dispatcher passes ${key}`);
    assert.match(ini, new RegExp(`^MOD_QRCODEBARCODESCANNER_JS_${key.toUpperCase()}="`, 'm'), key);
  }
});

test('the credit line is off unless turned on', () => {
  const manifest = source(`${MODULE}/${MODULE}.xml`);
  assert.match(manifest, /<field name="show_credit" type="radio" default="0"/);
  assert.match(manifest, /<field name="show_report" type="radio" default="0"/);
  assert.match(manifest, /<field name="profile" type="list" default="full"/);
  const layout = source(`${MODULE}/tmpl/default.php`);
  assert.match(layout, /<\?php if \(\$scanner\['showCredit'\]\) : \?>/);
});

test('the versions agree and the engine is the pinned npm package', () => {
  assert.equal(checkVersions(), own.version);
  const scanner = scannerPackage();
  assert.equal(scanner.version, own.dependencies['@qrcode-ai-com/qrcode-barcode-scanner-wasm']);
  assert.equal(scanner.wasm_sha256, own.config.wasmSha256);
  assert.match(scanner.integrity, /^sha512-/);
  assert.equal(scanner.license, 'AGPL-3.0-or-later');
});

test('manifestFiles reads files, media and languages', () => {
  const manifest = source(`${MODULE}/${MODULE}.xml`);
  const named = manifestFiles(manifest, MODULE_FILES);
  assert.deepEqual(named, MODULE_FILES.filter((name) => name !== `${MODULE}.xml`));
});

test('the update file names this version and the package checksum', () => {
  const xml = updatesXml('9.8.7', 'ab'.repeat(32));
  assert.equal(tag(xml, 'version'), '9.8.7');
  assert.equal(tag(xml, 'element'), PACKAGE_ELEMENT);
  assert.equal(tag(xml, 'sha256'), 'ab'.repeat(32));
  assert.match(tag(xml, 'downloadurl'), /\/releases\/download\/joomla-v9\.8\.7\/pkg_qrcodebarcodescanner-9\.8\.7\.zip$/);
  assert.match(xml, /<targetplatform name="joomla" version="\(5\\\.\[4-9\]\|6\\\.\[0-9\]\)" \/>/);
});

test('the built package passes the inspection, and the inspection catches changes', { skip: !existsSync(PACKAGE) }, () => {
  const archive = readFileSync(PACKAGE);
  const files = readZip(archive);
  assert.deepEqual([...files.keys()].sort(), PACKAGE_FILES);
  const updates = readFileSync(join(HERE, 'updates.xml'), 'utf8');
  assert.deepEqual(inspectPackage(files, updates, sha256(archive)), []);
  assert.ok(inspectPackage(files, updates, 'cd'.repeat(32)).some((text) => text.includes('<sha256>')));
  const module = readZip(files.get(`packages/${MODULE}.zip`));
  assert.deepEqual([...module.keys()].sort(), MODULE_FILES);
  assert.deepEqual(inspectModule(new Map(module)), []);
  const changed = (edit) => {
    const copy = new Map(module);
    edit(copy);
    return inspectModule(copy);
  };
  const has = (problems, needle) => problems.some((text) => text.includes(needle));
  assert.ok(has(changed((copy) => copy.set('media/vendor/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm',
    Buffer.from('not the module'))), 'not the pinned one'));
  assert.ok(has(changed((copy) => copy.set('tmpl/extra.php', Buffer.from('<?php'))), 'module entries differ'));
  const layout = 'tmpl/default.php';
  assert.ok(has(changed((copy) => copy.set(layout, Buffer.from(String(module.get(layout)).replace("\\defined('_JEXEC') or die;", '')))),
    'does not stop unless Joomla runs it'));
  assert.ok(has(changed((copy) => copy.set(layout, Buffer.from(`${module.get(layout)}<?php echo Text::_('MOD_QRCODEBARCODESCANNER_NOT_DEFINED'); ?>`))),
    'MOD_QRCODEBARCODESCANNER_NOT_DEFINED'));
  assert.ok(has(changed((copy) => copy.set(layout, Buffer.from(`${module.get(layout)}<?php curl_init('https://example.com'); ?>`))),
    'cURL'));
  const view = 'media/js/view.js';
  assert.ok(has(changed((copy) => copy.set(view, Buffer.from(`${module.get(view)}\nfetch('https://example.com/x');\n`))),
    'a request to another server'));
});

test('a zip of the same files has the same bytes', () => {
  const files = new Map([['b.txt', Buffer.from('two')], ['a.txt', Buffer.from('one'.repeat(100))]]);
  const first = writeZip(files);
  assert.ok(first.equals(writeZip(new Map([...files].reverse()))));
  assert.deepEqual([...readZip(first).keys()], ['a.txt', 'b.txt']);
});

test('the listing images are the drawn icon and the two screenshots', () => {
  for (const [name, bytes] of icons()) {
    assert.equal(bytes.readUInt32BE(16), 256, name);
    assert.equal(bytes.readUInt32BE(20), 256, name);
    assert.ok(readFileSync(join(ASSETS, name)).equals(bytes), `${name} is the drawn icon`);
  }
  for (const name of SCREENSHOTS) {
    const bytes = readFileSync(join(ASSETS, name));
    assert.ok(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])), name);
    assert.equal(bytes.readUInt32BE(16), 1280, name);
  }
});
