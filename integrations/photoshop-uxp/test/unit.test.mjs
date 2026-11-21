// SPDX-License-Identifier: MIT
// Node unit tests, no browser and no Photoshop: the polyfills against Node's own TextDecoder and
// TextEncoder, the pixel reading against a stand-in of Photoshop's Imaging API, the manifest and
// the plugin's files, the zip, the listing kit, and the engine bundled as the plugin bundles it,
// run in a bare JavaScript context that has none of TextDecoder, TextEncoder, performance and
// Worker, and whose asynchronous WebAssembly calls throw, as UXP gives a plugin. Run
// `npm run build` first.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { BuildError, HOST_MODULES, bundle, checkFiles, pluginFiles } from '../scripts/build.mjs';
import { decodePng } from '../scripts/png.mjs';
import { readZip, writeZip } from '../scripts/zip.mjs';
import { imageFormat } from '../src/image.js';
import { MAX_PIXELS, ReadError, SRGB, readPixels, selectionBounds, targetSize, toRgba } from '../src/photoshop.js';
import { Utf8Decoder, Utf8Encoder, installPolyfills } from '../src/polyfills.js';
import { describeDetections, finalState } from '../src/results.js';

const HERE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(HERE, '..', '..');
const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
const WASM_SHA256 = 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const contents = (report) => report.detections.map((row) => [row.symbology, row.content.text]).sort();
const fixturePath = execFileSync('python3', [join(ROOT, 'scripts/destination-acceptance.py'), 'stage',
  mkdtempSync(join(tmpdir(), 'qrscan-photoshop-'))], { encoding: 'utf8' }).trim();
const fixture = readFileSync(fixturePath);
const zipPath = join(HERE, 'build', 'qrcode-barcode-scanner-photoshop-0.1.0.zip');

test('the UTF-8 decoder agrees with the standard one, fatal or not', () => {
  const samples = ['', 'STOCK-4827', 'https://qrc-ai.com/76xMa', 'é', '€', '𝄞 and 😀', 'a‮b', '﻿bom',
    'Grüße, 你好, مرحبا', String.fromCodePoint(0x10FFFF)];
  for (const text of samples) {
    const bytes = new TextEncoder().encode(text);
    for (const options of [{}, { ignoreBOM: true }, { fatal: true }, { fatal: true, ignoreBOM: true }]) {
      assert.equal(new Utf8Decoder('utf-8', options).decode(bytes), new TextDecoder('utf-8', options).decode(bytes), text);
    }
  }
  const broken = [[0xC0, 0xAF], [0xE0, 0x80, 0xAF], [0xED, 0xA0, 0x80], [0xF4, 0x90, 0x80, 0x80], [0xF8], [0xE2, 0x82],
    [0x61, 0xFF, 0x62], [0xF0, 0x9F, 0x98], [0x80, 0x80], [0xC2, 0x41]];
  for (let index = 0; index < 2000; index += 1) broken.push([...randomBytes(1 + (index % 12))]);
  for (const sequence of broken) {
    const bytes = new Uint8Array(sequence);
    assert.equal(new Utf8Decoder().decode(bytes), new TextDecoder().decode(bytes), sequence.join(','));
    let standard = null;
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (error) { standard = error.name; }
    let ours = null;
    try { new Utf8Decoder('utf-8', { fatal: true }).decode(bytes); } catch (error) { ours = error.name; }
    assert.equal(ours, standard, sequence.join(','));
  }
  assert.equal(new Utf8Decoder().decode(), '');
  assert.equal(new Utf8Decoder().decode(new TextEncoder().encode('xyz').buffer), 'xyz');
  assert.throws(() => new Utf8Decoder('latin1'), RangeError);
});

test('the UTF-8 encoder agrees with the standard one, encodeInto included', () => {
  for (const text of ['', 'STOCK-4827', 'é€𝄞', 'lone \uD800 high', 'lone \uDC00 low', '😀😀', 'x'.repeat(10000)]) {
    assert.deepEqual(new Utf8Encoder().encode(text), new TextEncoder().encode(text), text.slice(0, 20));
    for (const room of [0, 1, 3, 4, 7]) {
      const mine = new Uint8Array(room);
      const theirs = new Uint8Array(room);
      assert.deepEqual(new Utf8Encoder().encodeInto(text, mine), new TextEncoder().encodeInto(text, theirs), `${text.slice(0, 10)} ${room}`);
      assert.deepEqual(mine, theirs);
    }
  }
});

test('the polyfills are installed only where the host lacks them', () => {
  const bare = {};
  assert.deepEqual(installPolyfills(bare), ['TextDecoder', 'TextEncoder', 'performance']);
  assert.equal(typeof bare.performance.now(), 'number');
  const host = { TextDecoder, TextEncoder, performance };
  assert.deepEqual(installPolyfills(host), []);
  assert.equal(host.TextDecoder, TextDecoder);
  // A host class that refuses the glue's options, or a read-only property, is replaced as well.
  class PartialDecoder { constructor(label, options) { if (options) throw new TypeError('no options'); } }
  const partial = { TextDecoder: PartialDecoder, TextEncoder, performance: {} };
  Object.defineProperty(partial, 'performance', { get: () => ({}), configurable: true });
  assert.deepEqual(installPolyfills(partial), ['TextDecoder', 'performance']);
  assert.equal(partial.TextDecoder, Utf8Decoder);
  assert.equal(typeof partial.performance.now(), 'number');
});

/** A stand-in for require('photoshop') holding one document of RGB pixels. */
function standIn({ width, height, rgb, selection = null, title = 'Test.psd' }) {
  const calls = { modal: [], getPixels: [], disposed: 0 };
  const photoshop = {
    app: { activeDocument: { id: 7, title, width, height, selection: { bounds: selection } } },
    core: {
      async executeAsModal(fn, options) {
        calls.modal.push(options);
        return fn({ isCancelled: false });
      },
    },
    imaging: {
      async getPixels(options) {
        calls.getPixels.push(options);
        const { left, top, right, bottom } = options.sourceBounds;
        let w = right - left;
        let h = bottom - top;
        let data = new Uint8Array(w * h * 3);
        for (let y = 0; y < h; y += 1) data.set(rgb.subarray(((top + y) * width + left) * 3, ((top + y) * width + right) * 3), y * w * 3);
        if (options.targetSize) {
          const [tw, th] = [options.targetSize.width, options.targetSize.height];
          const scaled = new Uint8Array(tw * th * 3);
          for (let y = 0; y < th; y += 1) {
            for (let x = 0; x < tw; x += 1) {
              const from = (Math.floor((y * h) / th) * w + Math.floor((x * w) / tw)) * 3;
              scaled.set(data.subarray(from, from + 3), (y * tw + x) * 3);
            }
          }
          [w, h, data] = [tw, th, scaled];
        }
        return { imageData: { width: w, height: h, components: 3, async getData() { return data; }, dispose() { calls.disposed += 1; } } };
      },
    },
  };
  return { photoshop, calls };
}

function rgbOf({ width, height, rgba }) {
  const rgb = new Uint8Array(width * height * 3);
  for (let index = 0; index < width * height; index += 1) rgb.set(rgba.subarray(index * 4, index * 4 + 3), index * 3);
  return rgb;
}

test('the document and the selection are read as 8-bit sRGB RGBA, large ones at a smaller size', async () => {
  assert.equal(targetSize(4096, 4096), null);
  assert.deepEqual(targetSize(8000, 6000), { width: 4729, height: 3547 });
  assert.ok(4729 * 3547 <= MAX_PIXELS);
  assert.deepEqual(toRgba(new Uint8Array([1, 2, 3, 4, 5, 6]), 2, 1, 3), new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]));
  assert.deepEqual(toRgba(new Uint8Array([9]), 1, 1, 1), new Uint8Array([9, 9, 9, 255]));
  assert.throws(() => toRgba(new Uint8Array(5), 2, 1, 3), ReadError);
  const document = { width: 100, height: 50, selection: { bounds: { left: -5, top: 10.5, right: 40.2, bottom: 80 } } };
  assert.deepEqual(selectionBounds(document), { left: 0, top: 10, right: 41, bottom: 50 });
  assert.equal(selectionBounds({ width: 10, height: 10, selection: { bounds: null } }), null);
  assert.equal(selectionBounds({ width: 10, height: 10, selection: { bounds: { left: 20, top: 0, right: 30, bottom: 5 } } }), null);

  const image = decodePng(fixture);
  const { photoshop, calls } = standIn({ ...image, rgb: rgbOf(image), selection: { left: 0, top: 0, right: 700, bottom: 1120 } });
  const whole = await readPixels(photoshop, 'document');
  assert.deepEqual([whole.width, whole.height, whole.scaled], [1666, 1120, false]);
  assert.deepEqual(whole.rgba, image.rgba);
  assert.deepEqual(calls.getPixels[0], { documentID: 7, sourceBounds: { left: 0, top: 0, right: 1666, bottom: 1120 },
    colorSpace: 'RGB', colorProfile: SRGB, componentSize: 8, applyAlpha: true });
  assert.deepEqual(calls.modal, [{ commandName: 'Read QR codes and barcodes' }]);
  const part = await readPixels(photoshop, 'selection');
  assert.deepEqual([part.width, part.height], [700, 1120]);
  assert.equal(calls.disposed, 2, 'each image data is disposed');

  const big = standIn({ width: 5000, height: 4000, rgb: new Uint8Array(5000 * 4000 * 3) });
  const scaled = await readPixels(big.photoshop, 'document');
  assert.equal(scaled.scaled, true);
  assert.deepEqual(big.calls.getPixels[0].targetSize, targetSize(5000, 4000));
  await assert.rejects(readPixels(big.photoshop, 'selection'), (error) => error.kind === 'no-selection');
  await assert.rejects(readPixels({ app: { activeDocument: null } }, 'document'), (error) => error.kind === 'no-document');
});

test('the result helpers name the codes and compare an expected text exactly', () => {
  const report = { detections: [
    { symbology: 'qr_code', content: { text: 'https://qrc-ai.com/76xMa' }, payload: { kind: 'url' } },
    { symbology: 'code128', content: { text: 'STOCK-4827' }, payload: { kind: 'text' } },
  ] };
  assert.deepEqual(describeDetections(report, 'STOCK-4827').map((row) => [row.format, row.matches]),
    [['QR Code', false], ['Code 128', true]]);
  assert.equal(finalState({ detections: [], trace: { budget_exhausted: true } }), 'inconclusive');
  assert.equal(imageFormat(new Uint8Array(fixture)), 'png');
});

test('the manifest is version 5, one panel, file pickers only, its icons in the plugin', async () => {
  const manifest = JSON.parse(readFileSync(join(HERE, 'src', 'manifest.json'), 'utf8'));
  const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
  assert.equal(manifest.manifestVersion, 5);
  assert.equal(manifest.version, own.version);
  assert.equal(manifest.name, 'QR Code & Barcode Scanner');
  assert.deepEqual(manifest.host, { app: 'PS', minVersion: '25.0.0' });
  assert.deepEqual(manifest.requiredPermissions, { localFileSystem: 'request' });
  assert.deepEqual(manifest.entrypoints.map((entry) => [entry.type, entry.id]), [['panel', 'scanner']]);
  const { files } = await pluginFiles();
  const map = new Map(files.map(({ name, bytes }) => [name, bytes]));
  for (const [name, size] of [['icons/dark.png', 23], ['icons/dark@2x.png', 46], ['icons/light.png', 23], ['icons/light@2x.png', 46]]) {
    const icon = decodePng(map.get(name));
    assert.deepEqual([icon.width, icon.height], [size, size], name);
    assert.ok(icon.rgba.some((value, index) => index % 4 === 3 && value === 0), `${name} has a transparent ground`);
  }
  const planted = (name, bytes) => { const copy = new Map(map); copy.set(name, Buffer.from(bytes)); return copy; };
  assert.doesNotThrow(() => checkFiles(map, manifest));
  assert.throws(() => checkFiles(planted('.DS_Store', 'x'), manifest), BuildError);
  assert.throws(() => checkFiles(planted('index.js', 'const x = require("fs");\n__require("fs");'), manifest), /requires fs/);
  assert.throws(() => checkFiles(planted('index.js', 'new Worker("x.js")'), manifest), /Worker/);
  assert.throws(() => checkFiles(planted('index.html', '<script src="other.js"></script>'), manifest), /not in the plugin/);
  const index = map.get('index.js').toString('utf8');
  assert.deepEqual([...new Set([...index.matchAll(/__require\("([^"]+)"\)/g)].map((match) => match[1]))].sort(), HOST_MODULES);
  assert.ok(!/https?:\/\/(?!github\.com\/qrcode-ai-com|www\.apache\.org|www\.gnu\.org|fsf\.org|opensource\.org)/.test(index.replace(/\/\*[\s\S]*?\*\//g, '')),
    'the panel script names no network address outside its comments');
});

test('the zip holds dist/ at its root with the same bytes each time', async () => {
  assert.ok(existsSync(zipPath), 'run npm run build first');
  const zip = readFileSync(zipPath);
  const entries = readZip(zip);
  const names = [...entries.keys()];
  assert.equal(names[0], 'manifest.json');
  const onDisk = [...readdirSync(join(HERE, 'dist')).filter((name) => name !== 'icons'),
    ...readdirSync(join(HERE, 'dist', 'icons')).map((name) => `icons/${name}`)];
  assert.deepEqual([...names].sort(), onDisk.sort());
  for (const name of names) assert.equal(sha256(entries.get(name)), sha256(readFileSync(join(HERE, 'dist', name))), name);
  const { files } = await pluginFiles();
  assert.equal(sha256(writeZip(files)), sha256(zip), 'the same inputs give the same zip');
  const receipt = JSON.parse(readFileSync(join(HERE, 'build', 'build-receipt.json'), 'utf8'));
  assert.equal(receipt.zip.sha256, sha256(zip));
  assert.equal(receipt.engine.wasm_sha256, WASM_SHA256);
  assert.match(entries.get('NOTICE.md').toString('utf8'), /176ac96ef16ee330dbfc6ada10327d0b4e23a8b2/);
  assert.match(entries.get('LICENSE').toString('utf8'), /GNU AFFERO GENERAL PUBLIC LICENSE/);
});

test('the listing kit stays within Adobe\'s limits and names the plugin that was built', () => {
  const listing = readFileSync(join(HERE, 'LISTING.md'), 'utf8');
  const field = (name) => listing.match(new RegExp(`^\\| ${name} \\|[^|]*\\| \`([^\`]+)\``, 'm'))?.[1];
  const quotes = listing.split('\n').filter((line) => line.startsWith('> ')).map((line) => line.slice(2));
  const manifest = JSON.parse(readFileSync(join(HERE, 'src', 'manifest.json'), 'utf8'));
  assert.equal(field('Public plugin name'), manifest.name);
  assert.ok(field('Public plugin name').length <= 45);
  assert.match(manifest.name, /^[\x20-\x7e]+$/, 'the manifest name is ASCII');
  assert.doesNotMatch(field('Public plugin name'), /adobe|photoshop/i, 'no Adobe trademark in the name');
  assert.ok(field('Subtitle').length <= 30, field('Subtitle'));
  assert.ok(field('Tags').length <= 300, field('Tags'));
  assert.equal(quotes.length, 3, 'the description, the version details and the note to reviewers');
  const [description, details, notes] = quotes;
  assert.ok(description.length <= 5000);
  assert.match(listing, new RegExp(`\\*\\*Description\\*\\* \\(${description.length.toLocaleString('en-US')} characters\\)`));
  assert.ok(details.length <= 1000);
  assert.ok(notes.length <= 1000);
  assert.doesNotMatch(listing, /canva|figma/i, 'the listing names no competing product');
  assert.ok(existsSync(zipPath), 'run npm run build first');
  const zip = readFileSync(zipPath);
  assert.match(listing, new RegExp(`\\| SHA-256 \\| \`${sha256(zip)}\` \\|`), 'LISTING.md names the SHA-256 of the built zip');
  assert.match(listing, new RegExp(`\\| Size \\| ${zip.length.toLocaleString('en-US')} bytes`));
  assert.match(listing, new RegExp(`\\| Contents \\| ${readZip(zip).size} files`));
});

test('the engine starts and reads the fixture in a context shaped like UXP', async () => {
  const entry = join(HERE, 'test', 'engine-entry.js');
  const { code } = await bundle(entry);
  const refused = [];
  const refuse = (name) => () => { refused.push(name); throw new Error(`${name} is not used in UXP`); };
  const Wasm = { Module: WebAssembly.Module, Instance: WebAssembly.Instance, Memory: WebAssembly.Memory,
    Table: WebAssembly.Table, Global: WebAssembly.Global, CompileError: WebAssembly.CompileError,
    LinkError: WebAssembly.LinkError, RuntimeError: WebAssembly.RuntimeError,
    compile: refuse('WebAssembly.compile'), instantiate: refuse('WebAssembly.instantiate'),
    compileStreaming: refuse('WebAssembly.compileStreaming'), instantiateStreaming: refuse('WebAssembly.instantiateStreaming') };
  const context = vm.createContext({ console, setTimeout, WebAssembly: Wasm });
  for (const name of ['TextDecoder', 'TextEncoder', 'performance', 'Worker', 'fetch', 'atob']) {
    assert.equal(vm.runInContext(`typeof ${name}`, context), 'undefined', name);
  }
  vm.runInContext(code.toString('utf8'), context, { filename: 'engine-entry.js' });
  const engine = context.engine;
  const started = engine.startEngine();
  assert.equal(started.version, '0.11.0');
  assert.equal(started.engine.wasm_sha256, WASM_SHA256);
  assert.deepEqual([...started.polyfills], ['TextDecoder', 'TextEncoder', 'performance']);
  const image = decodePng(fixture);
  for (const profile of ['fast', 'frame', 'full']) {
    const report = JSON.parse(JSON.stringify(engine.scanPixels(image.rgba, image.width, image.height, profile, 20000)));
    assert.deepEqual(contents(report), EXPECTED, profile);
    assert.equal(report.trace.budget_exhausted, false);
    assert.equal(report.trace.engine_panics, 0);
    const fromFile = JSON.parse(JSON.stringify(engine.scanFile(new Uint8Array(fixture), profile, 20000)));
    assert.deepEqual(contents(fromFile), EXPECTED, `${profile} file`);
  }
  assert.throws(() => engine.scanFile(new TextEncoder().encode('not an image'), 'fast', 1000));
  assert.deepEqual(refused, [], 'no asynchronous WebAssembly call');
});
