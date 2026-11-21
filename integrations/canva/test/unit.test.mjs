// SPDX-License-Identifier: MIT
// Node unit tests, no browser: the result and image helpers, the controller driven by fake Canva
// functions (the selection of @canva/design and getTemporaryUrl of @canva/asset) with the real
// engine inlined by integrations/wasm-inline, the strings for translation, the manifest, and the
// built dist/app.js (run `npm run build` first).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeInline } from '../../wasm-inline/inline.mjs';
import { BUDGET_MS, MAX_IMAGES, createScanner } from '../src/controller.js';
import { ImageReadError, imageFormat, readImage } from '../src/image.js';
import { combinedState, describeDetections, finalState, visibleText } from '../src/results.js';

const HERE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(HERE, '..', '..');
const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
const WASM_SHA256 = 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const scratch = (name) => mkdtempSync(join(tmpdir(), `qrscan-canva-${name}-`));
const contents = (report) => report.detections.map((row) => [row.symbology, row.content.text]).sort();

const fixturePath = execFileSync('python3', [join(ROOT, 'scripts/destination-acceptance.py'), 'stage',
  scratch('fixture')], { encoding: 'utf8' }).trim();
const fixture = new Uint8Array(readFileSync(fixturePath));

// The engine the bundle carries, as Node loads it: the same inlined module and the same calls.
const inlinePath = join(scratch('engine'), 'engine.inline.mjs');
writeInline(HERE, inlinePath);
const inlined = await import(pathToFileURL(inlinePath).href);
const engine = {
  load: async () => { await inlined.initInline(); return inlined.version(); },
  scan: (bytes, profile, budgetMs) => inlined.scan_image(bytes, profile, undefined, undefined, budgetMs),
};

/** A fake of the two Canva functions the controller calls, with a selection the test changes. */
function fakeCanva(files) {
  const calls = { registered: [], urls: [], fetched: [] };
  let onChange = null;
  const canva = {
    selection: {
      registerOnChange(options) {
        calls.registered.push(options.scope);
        onChange = options.onChange;
        return () => { onChange = null; };
      },
    },
    async getTemporaryUrl(options) {
      calls.urls.push(options);
      return { url: `https://canva-temporary.example.com/${options.ref}` };
    },
  };
  const fetchImpl = async (url, init) => {
    calls.fetched.push({ url, init });
    const name = url.split('/').pop();
    if (!Object.hasOwn(files, name)) return new Response(null, { status: 404 });
    return new Response(files[name], { status: 200 });
  };
  const select = (refs) => onChange({
    count: refs.length,
    read: async () => ({ contents: refs.map((ref) => ({ ref })), save: async () => {} }),
  });
  return { canva, fetchImpl, calls, select, listening: () => onChange !== null };
}

const png = (size = 64) => {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return bytes;
};

test('image formats are told apart by their first bytes', () => {
  assert.equal(imageFormat(fixture), 'png');
  assert.equal(imageFormat(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0])), 'jpeg');
  assert.equal(imageFormat(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'webp');
  assert.equal(imageFormat(new TextEncoder().encode('GIF89a\0\0\0\0\0\0')), 'gif');
  assert.equal(imageFormat(new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="x"/>')), 'svg');
  assert.equal(imageFormat(new TextEncoder().encode('\0\0\0\x18ftypheic\0\0\0\0')), 'heic');
  assert.equal(imageFormat(new TextEncoder().encode('\0\0\0\x18ftypavif\0\0\0\0')), 'avif');
  assert.equal(imageFormat(new Uint8Array([0x49, 0x49, 0x2A, 0, 0, 0, 0, 0, 0, 0, 0, 0])), 'tiff');
  assert.equal(imageFormat(new Uint8Array(4)), 'unknown');
  assert.equal(imageFormat('not bytes'), 'unknown');
});

test('readImage fetches with CORS and no credentials, and refuses what the engine cannot read', async () => {
  const seen = [];
  const ok = await readImage('https://a.example.com/x', async (url, init) => {
    seen.push(init);
    return new Response(fixture, { status: 200 });
  });
  assert.equal(ok.format, 'png');
  assert.equal(ok.bytes.length, fixture.length);
  assert.deepEqual(seen, [{ mode: 'cors', credentials: 'omit', cache: 'no-store' }]);
  const refused = async (fetchImpl, kind, detail) => {
    await assert.rejects(readImage('https://a.example.com/x', fetchImpl),
      (error) => error instanceof ImageReadError && error.kind === kind && error.detail === detail);
  };
  await refused(async () => new Response(null, { status: 403 }), 'http', 403);
  await refused(async () => { throw new TypeError('Failed to fetch'); }, 'network', 'Failed to fetch');
  await refused(async () => new Response('<svg xmlns="http://www.w3.org/2000/svg"></svg>     '),
    'unsupported', 'svg');
  await refused(async () => new Response(png(), { headers: { 'content-length': String(40 * 1024 * 1024) } }),
    'too-large', 40 * 1024 * 1024);
});

test('result rows show hidden characters and compare an expected text exactly', () => {
  assert.deepEqual(visibleText('a‮b​c'), { shown: 'a⟨U+202E⟩b⟨U+200B⟩c', hidden: 2 });
  const report = { detections: [
    { symbology: 'qr_code', content: { text: 'https://qrc-ai.com/76xMa', charset: 'utf-8' }, payload: { kind: 'url' } },
    { symbology: 'code128', content: { text: 'STOCK-4827', charset: 'iso-8859-1' }, payload: { kind: 'text' } },
    { symbology: 'future_code', content: { text: 'x', charset: 'unknown' }, payload: { kind: 'future' } },
  ] };
  const rows = describeDetections(report, 'STOCK-4827');
  assert.deepEqual(rows.map((row) => [row.format, row.kind, row.matches, row.lossy]), [
    ['QR Code', 'url', false, false], ['Code 128', 'text', true, false], ['future_code', 'text', false, true],
  ]);
  assert.deepEqual(describeDetections(report).map((row) => row.matches), [null, null, null]);
  assert.equal(describeDetections(report, 'stock-4827')[1].matches, false, 'case matters');
  assert.equal(finalState({ detections: [], trace: { budget_exhausted: true } }), 'inconclusive');
  assert.equal(finalState({ detections: [], trace: { budget_exhausted: false } }), 'empty');
  assert.equal(combinedState([{ report: null }, { report }]), 'result');
  assert.equal(combinedState([{ report: null }]), 'error');
});

test('the controller listens to image selections and reads the fixture in fast, frame and full', async () => {
  const host = fakeCanva({ 'img-1': fixture });
  const scanner = createScanner({ canva: host.canva, engine, fetchImpl: host.fetchImpl });
  assert.deepEqual(host.calls.registered, ['image'], 'one registration, scope image');
  assert.equal(await scanner.loaded, true);
  assert.equal(scanner.getState().phase, 'ready');
  assert.equal(scanner.getState().engineVersion, '0.11.0');
  await scanner.scan('full');
  assert.deepEqual(scanner.getState().error, { kind: 'no-selection' }, 'nothing selected yet');
  host.select(['img-1']);
  assert.equal(scanner.getState().selected, 1);
  for (const profile of ['fast', 'frame', 'full']) {
    await scanner.scan(profile);
    const state = scanner.getState();
    assert.equal(state.phase, 'result', profile);
    assert.equal(state.profile, profile);
    assert.equal(state.items.length, 1);
    const [item] = state.items;
    assert.equal(item.format, 'png');
    assert.deepEqual(contents(item.report), EXPECTED, `${profile}: the two exact payloads`);
    assert.equal(item.report.trace.budget_exhausted, false);
    assert.equal(item.report.trace.engine_panics, 0);
  }
  assert.deepEqual(host.calls.urls.at(-1), { type: 'image', ref: 'img-1' });
  assert.deepEqual(host.calls.fetched.at(-1).init, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
  assert.equal(scanner.getState().scan, 4);
  scanner.dispose();
  assert.equal(host.listening(), false, 'dispose stops listening to the selection');
});

test('the controller reads at most five images and keeps going past one that fails', async () => {
  const files = { good: fixture, svg: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>    ') };
  const host = fakeCanva(files);
  const scanner = createScanner({ canva: host.canva, engine, fetchImpl: host.fetchImpl });
  await scanner.loaded;
  host.select(['svg', 'missing', 'good', 'good', 'good', 'good', 'good']);
  await scanner.scan('frame');
  const state = scanner.getState();
  assert.equal(MAX_IMAGES, 5);
  assert.equal(state.items.length, 5);
  assert.deepEqual(state.items.slice(0, 2).map((item) => item.error), [
    { kind: 'unsupported', detail: 'svg' }, { kind: 'http', detail: 404 },
  ]);
  assert.equal(state.phase, 'result');
  assert.deepEqual(contents(state.items[2].report), EXPECTED);
  host.select(['svg']);
  await scanner.scan('fast');
  assert.equal(scanner.getState().phase, 'error');
  assert.deepEqual(scanner.getState().error, { kind: 'unsupported', detail: 'svg' });
  await assert.rejects(scanner.scan('slow'), /unknown profile/);
});

test('an engine that cannot load leaves the panel in a stated error', async () => {
  const host = fakeCanva({});
  const scanner = createScanner({
    canva: host.canva,
    engine: { load: async () => { throw new Error('WebAssembly is not allowed'); }, scan: () => null },
    fetchImpl: host.fetchImpl,
  });
  assert.equal(await scanner.loaded, false);
  assert.deepEqual(scanner.getState().error, { kind: 'engine', detail: 'WebAssembly is not allowed' });
  assert.equal(BUDGET_MS, 20000);
});

test('the manifest asks for design read access only, through the design editor intent', () => {
  const manifest = JSON.parse(readFileSync(join(HERE, 'canva-app.json'), 'utf8'));
  assert.deepEqual(manifest.runtime.permissions, [{ name: 'canva:design:content:read', type: 'mandatory' }]);
  assert.deepEqual(manifest.intent, { design_editor: { enrolled: true } });
});

test('dist/app.js is one file under 5 MB with the engine inside and nothing loaded from elsewhere', () => {
  const path = join(HERE, 'dist', 'app.js');
  assert.ok(existsSync(path), 'run npm run build first');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.length <= 5_000_000, `${code.length} bytes`);
  assert.match(code, /^\/\*! QR Code & Barcode Scanner for Canva 0\.1\.0/);
  assert.match(code, /QR Code & Barcode Scanner engine 0\.11\.0/, 'the engine license banner is kept');
  // Code built from text, a worker or a module loaded from elsewhere would break under Canva's
  // policy: these strings must not appear in the bundle.
  for (const needle of ['import.meta', '_bg.wasm', 'new Worker', 'importScripts', 'eval(']) {
    assert.equal(code.includes(needle), false, needle);
  }
  const base64 = /"([A-Za-z0-9+/]{2900000,}={0,2})"/.exec(code)?.[1] ?? /'([A-Za-z0-9+/]{2900000,}={0,2})'/.exec(code)?.[1];
  assert.ok(base64, 'the inlined module');
  assert.equal(sha256(Buffer.from(base64, 'base64')), WASM_SHA256);
  const receipt = JSON.parse(readFileSync(join(HERE, 'build', 'build-receipt.json'), 'utf8'));
  assert.equal(receipt.app.sha256, sha256(Buffer.from(code)));
  assert.equal(receipt.engine.wasm_sha256, WASM_SHA256);
});

test('dist/app.js ends with the license text of every package it holds', () => {
  const code = readFileSync(join(HERE, 'dist', 'app.js'), 'utf8');
  const receipt = JSON.parse(readFileSync(join(HERE, 'build', 'build-receipt.json'), 'utf8'));
  const start = code.lastIndexOf('/*! Licenses of the parts of this file');
  assert.ok(start > 0 && code.trimEnd().endsWith('*/'), 'one closing comment at the end');
  const footer = code.slice(start);
  assert.equal(footer.indexOf('*/'), footer.length - 3, 'the footer is one comment');
  const names = receipt.bundled.map((item) => item.name);
  for (const name of ['@qrcode-ai-com/qrcode-barcode-scanner-wasm', '@canva/app-ui-kit', '@canva/design',
    '@canva/asset', '@canva/platform', '@canva/intents', '@canva/app-i18n-kit', 'react', 'react-dom',
    'react-intl']) {
    assert.ok(names.includes(name), name);
  }
  for (const item of receipt.bundled) {
    assert.ok(footer.includes(`${item.name} ${item.version} (${item.license})`), item.name);
  }
  for (const phrase of ['GNU AFFERO GENERAL PUBLIC LICENSE', 'Apache License', 'Canva Pty Ltd',
    'You must only use the Software Components and any Derivative on the Canva']) {
    assert.ok(footer.includes(phrase), phrase);
  }
});

test('dist/messages_en.json holds every string with a description, under Canva\'s limits', () => {
  const messages = JSON.parse(readFileSync(join(HERE, 'dist', 'messages_en.json'), 'utf8'));
  const source = readFileSync(join(HERE, 'src', 'messages.js'), 'utf8');
  const ids = [...source.matchAll(/id: '([a-z0-9_.]+)'/g)].map((match) => match[1]);
  assert.deepEqual(Object.keys(messages).sort(), [...new Set(ids)].sort());
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.ok(ids.length <= 500);
  for (const [id, { defaultMessage, description }] of Object.entries(messages)) {
    assert.ok(defaultMessage.length > 0 && defaultMessage.length < 500, id);
    assert.ok(description.length > 0 && description.length < 500, id);
  }
});
