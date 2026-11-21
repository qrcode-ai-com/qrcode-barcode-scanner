// Unit tests of the plugin's scanner helpers, its build and its inspection.
//
//   node --test test/unit.test.mjs
//
// The build and inspection tests read build/, so `npm run build` runs first.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readZip, writeZip } from '../scripts/bytes.mjs';
import { checkVersions, headers, scannerPackage } from '../scripts/build.mjs';
import { ASSETS, SCREENSHOTS, icons } from '../scripts/directory-assets.mjs';
import { EXPECTED_FILES, inspectPlugin } from '../scripts/inspect.mjs';
import {
  describeDetections, finalState, format, openableUrl, sniffType, visibleText,
} from '../plugin/assets/scanner/results.js';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const ZIP = join(HERE, 'build', `qrcode-barcode-scanner-${own.version}.zip`);
const source = (path) => readFileSync(join(HERE, 'plugin', path), 'utf8');

test('sniffType reads the signature, never the name', () => {
  assert.equal(sniffType(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0])), 'image/png');
  assert.equal(sniffType(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])), 'image/jpeg');
  assert.equal(sniffType(Buffer.from('GIF89a....')), 'image/gif');
  assert.equal(sniffType(Buffer.from('GIF87a....')), 'image/gif');
  assert.equal(sniffType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(sniffType(Buffer.from('RIFF\0\0\0\0WAVEfmt ')), null);
  assert.equal(sniffType(Buffer.from('BM\x46\0\0\0')), null);
  assert.equal(sniffType(Buffer.from('this is text, not an image\n')), null);
  assert.equal(sniffType(Buffer.alloc(0)), null);
});

test('openableUrl keeps http and https only', () => {
  const url = (value, kind = 'url') => openableUrl({ payload: { kind, url: value } });
  assert.equal(url('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(url('http://example.com'), 'http://example.com/');
  assert.equal(url('https://example.com/01/09506000134352', 'gs1_digital_link'),
    'https://example.com/01/09506000134352');
  for (const refused of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'not a url']) {
    assert.equal(url(refused), null, refused);
  }
  assert.equal(openableUrl({ payload: { kind: 'text', url: 'https://example.com' } }), null);
  assert.equal(openableUrl({}), null);
});

test('visibleText shows hidden and direction-changing characters by code point', () => {
  assert.deepEqual(visibleText('plain'), { shown: 'plain', hidden: 0 });
  assert.deepEqual(visibleText('a\u200Bb'), { shown: 'a⟨U+200B⟩b', hidden: 1 });
  assert.deepEqual(visibleText('\u202Egnp.exe'), { shown: '⟨U+202E⟩gnp.exe', hidden: 1 });
  assert.deepEqual(visibleText('line\nnext\ttab'), { shown: 'line\nnext\ttab', hidden: 0 });
});

test('describeDetections and finalState follow the report', () => {
  const report = {
    detections: [
      { symbology: 'qr_code', content: { text: 'https://example.com', charset: 'utf-8' },
        payload: { kind: 'url', url: 'https://example.com' } },
      { symbology: 'code128', content: { text: 'STOCK-4827', charset: 'unknown' },
        payload: { kind: 'text' } },
      { symbology: 'future_code', content: { text: 'x' }, payload: { kind: 'future_kind' } },
    ],
    trace: { budget_exhausted: false },
  };
  const rows = describeDetections(report, { url: 'Link', text: 'Text' });
  assert.deepEqual(rows.map((row) => [row.format, row.kind, row.url, row.lossy]), [
    ['QR Code', 'Link', 'https://example.com/', false],
    ['Code 128', 'Text', null, true],
    ['future_code', 'future_kind', null, false],
  ]);
  assert.equal(finalState(report), 'result');
  assert.equal(finalState({ detections: [], trace: { budget_exhausted: false } }), 'empty');
  assert.equal(finalState({ detections: [], trace: { budget_exhausted: true } }), 'inconclusive');
});

test('format fills %s, %d and numbered placeholders', () => {
  assert.equal(format('Codes found: %d.', 2), 'Codes found: 2.');
  assert.equal(format('Reading %1$s with the %2$s profile…', 'a.png', 'fast'),
    'Reading a.png with the fast profile…');
  assert.equal(format('%2$s before %1$s', 'one', 'two'), 'two before one');
  assert.equal(format('missing %s'), 'missing %s');
});

test('every text the script uses is translated by the plugin', () => {
  const view = source('assets/scanner/view.js');
  const markup = source('includes/markup.php');
  const used = [...new Set([...view.matchAll(/\btext\('([A-Za-z]+)'/g)].map((match) => match[1]))];
  assert.ok(used.length >= 10, used.join(' '));
  for (const key of [...used, 'idle', 'empty', 'inconclusive', 'unsupported', 'unreadable']) {
    assert.match(markup, new RegExp(`'${key}'\\s*=>\\s*__\\(`), key);
  }
  // Every translated string names the plugin's text domain.
  for (const call of markup.matchAll(/__\(\s*'(?:[^'\\]|\\.)*',\s*'([^']+)'\s*\)/g)) {
    assert.equal(call[1], 'qrcode-barcode-scanner');
  }
});

test('the credit line is off unless turned on, in the block and in the shortcode', () => {
  const block = JSON.parse(source('src/scanner/block.json'));
  assert.equal(block.attributes.showCredit.default, false);
  assert.equal(block.attributes.showReport.default, false);
  assert.deepEqual(block.attributes.profile.enum, ['full', 'fast', 'frame']);
  assert.equal(block.viewScriptModule, 'qrcode-barcode-scanner-view');
  const main = source('qrcode-barcode-scanner.php');
  assert.match(main, /'credit'\s*=>\s*'no'/);
  assert.match(main, /'showCredit'\s*=>\s*'yes' === \$atts\['credit'\]/);
});

test('the header, readme.txt, block.json and package.json agree', () => {
  const { version } = checkVersions();
  assert.equal(version, own.version);
  const header = headers(source('qrcode-barcode-scanner.php'));
  assert.equal(header['Plugin Name'], 'QR Code & Barcode Scanner');
  assert.equal(header.License, 'AGPL-3.0-or-later');
  assert.equal(header['Text Domain'], 'qrcode-barcode-scanner');
  const readme = headers(source('readme.txt'));
  assert.equal(readme['Stable tag'], own.version);
  assert.ok(readme.Tags.split(',').length <= 5);
});

test('the engine is the pinned npm package', () => {
  const scanner = scannerPackage();
  assert.equal(scanner.version, own.dependencies['@qrcode-ai-com/qrcode-barcode-scanner-wasm']);
  assert.equal(scanner.wasm_sha256, own.config.wasmSha256);
  assert.match(scanner.integrity, /^sha512-/);
  assert.equal(scanner.license, 'AGPL-3.0-or-later');
});

test('the built zip passes the inspection, and the inspection catches changes', { skip: !existsSync(ZIP) }, () => {
  const files = readZip(readFileSync(ZIP));
  assert.deepEqual([...files.keys()].sort(), EXPECTED_FILES);
  assert.deepEqual(inspectPlugin(new Map(files)), []);
  const changed = (edit) => {
    const copy = new Map(files);
    edit(copy);
    return inspectPlugin(copy);
  };
  const wasm = 'qrcode-barcode-scanner/assets/vendor/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm';
  assert.ok(changed((copy) => copy.set(wasm, Buffer.from('not the module')))
    .some((text) => text.includes('not the pinned one')));
  assert.ok(changed((copy) => copy.set('qrcode-barcode-scanner/.env', Buffer.from('x')))
    .some((text) => text.includes('entries differ')));
  const markup = 'qrcode-barcode-scanner/includes/markup.php';
  assert.ok(changed((copy) => copy.set(markup, Buffer.from(`${files.get(markup)}\nwp_remote_get( 'https://example.com' );\n`)))
    .some((text) => text.includes('a request to another server')));
  assert.ok(changed((copy) => copy.set(markup, Buffer.from(String(files.get(markup)).replace("defined( 'ABSPATH' ) || exit;", ''))))
    .some((text) => text.includes('does not stop when it is opened directly')));
  const view = 'qrcode-barcode-scanner/assets/scanner/view.js';
  assert.ok(changed((copy) => copy.set(view, Buffer.from(`${files.get(view)}\nimport('https://example.com/x.js');\n`)))
    .some((text) => text.includes('a remote import')));
});

test('a zip of the same files has the same bytes', () => {
  const files = new Map([['b.txt', Buffer.from('two')], ['a.txt', Buffer.from('one'.repeat(100))]]);
  const first = writeZip(files);
  assert.ok(first.equals(writeZip(new Map([...files].reverse()))));
  assert.deepEqual([...readZip(first).keys()], ['a.txt', 'b.txt']);
});

test('the directory images are the drawn icons and one screenshot per readme caption', () => {
  for (const [name, bytes] of icons()) {
    const size = Number(/icon-(\d+)x/.exec(name)[1]);
    assert.equal(bytes.readUInt32BE(16), size, name);
    assert.equal(bytes.readUInt32BE(20), size, name);
    assert.ok(readFileSync(join(ASSETS, name)).equals(bytes), `${name} is the drawn icon`);
    assert.ok(bytes.length < 1024 * 1024, `${name} is under the directory's 1 MB`);
  }
  const captions = /== Screenshots ==\n\n([\s\S]*?)\n\n==/.exec(source('readme.txt'))[1].split('\n');
  assert.deepEqual(captions.map((line) => /^(\d+)\. /.exec(line)?.[1]), SCREENSHOTS.map((_, i) => String(i + 1)));
  for (const name of SCREENSHOTS) {
    const bytes = readFileSync(join(ASSETS, name));
    assert.ok(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])), name);
    assert.ok(bytes.length < 10 * 1024 * 1024, `${name} is under the directory's 10 MB`);
  }
});
