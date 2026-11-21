// SPDX-License-Identifier: MIT
// Node unit tests, no browser: the result and format helpers, the manifest, the package checks,
// the zip, the listing kit, and the built scanner worker run in a plain JavaScript context with
// the real engine. Run `npm run build` first.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { BuildError, SDK_URL, ZIP_LIMIT, checkFiles, packageFiles } from '../scripts/build.mjs';
import { readZip, writeZip } from '../scripts/zip.mjs';
import { imageFormat } from '../src/image.js';
import { combinedState, describeDetections, finalState, visibleText } from '../src/results.js';

const HERE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(HERE, '..', '..');
const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
const WASM_SHA256 = 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const contents = (report) => report.detections.map((row) => [row.symbology, row.content.text]).sort();
const fixturePath = execFileSync('python3', [join(ROOT, 'scripts/destination-acceptance.py'), 'stage',
  mkdtempSync(join(tmpdir(), 'qrscan-express-'))], { encoding: 'utf8' }).trim();
const fixture = readFileSync(fixturePath);
const zipPath = join(HERE, 'build', 'qrcode-barcode-scanner-adobe-express-0.1.0.zip');

/** The built worker in its own context, as a browser runs a classic worker script. */
function startWorker() {
  const code = readFileSync(join(HERE, 'dist', 'scanner-worker.js'), 'utf8');
  const replies = [];
  // In a worker, `self` is the global scope; the engine reads performance from it.
  const self = vm.createContext({
    postMessage: (message) => replies.push(JSON.parse(JSON.stringify(message))),
    WebAssembly, TextDecoder, TextEncoder, performance, console,
  });
  self.self = self;
  vm.runInContext(code, self, { filename: 'scanner-worker.js' });
  let id = 0;
  return async (message) => {
    id += 1;
    const before = replies.length;
    await self.onmessage({ data: { ...message, id } });
    assert.equal(replies.length, before + 1, 'one reply per message');
    const reply = replies.at(-1);
    assert.equal(reply.id, id);
    return reply;
  };
}

test('result rows show hidden characters and compare an expected text exactly', () => {
  assert.deepEqual(visibleText('a‮b'), { shown: 'a⟨U+202E⟩b', hidden: 1 });
  const report = { detections: [
    { symbology: 'qr_code', content: { text: 'https://qrc-ai.com/76xMa' }, payload: { kind: 'url' } },
    { symbology: 'code128', content: { text: 'STOCK-4827' }, payload: { kind: 'text' } },
  ] };
  assert.deepEqual(describeDetections(report, 'STOCK-4827').map((row) => [row.format, row.kind, row.matches]),
    [['QR Code', 'url', false], ['Code 128', 'text', true]]);
  assert.equal(finalState({ detections: [], trace: { budget_exhausted: true } }), 'inconclusive');
  assert.equal(combinedState([{ report: null }, { report }]), 'result');
  assert.equal(imageFormat(new Uint8Array(fixture)), 'png');
  assert.equal(imageFormat(new TextEncoder().encode('<svg xmlns="x"></svg>')), 'svg');
});

test('the manifest is version 2, one panel, preview renditions, no other permission', () => {
  const manifest = JSON.parse(readFileSync(join(HERE, 'src', 'manifest.json'), 'utf8'));
  const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
  assert.equal(manifest.manifestVersion, 2);
  assert.equal(manifest.version, own.version);
  assert.deepEqual(manifest.requirements, { apps: [{ name: 'Express', apiVersion: 1 }], renditionPreview: true });
  assert.deepEqual(manifest.entryPoints, [{ type: 'panel', id: 'panel1', main: 'index.html' }]);
});

test('the package checks refuse hidden files, outside imports and code built from text', async () => {
  const { files } = await packageFiles();
  const map = () => new Map(files.map(({ name, bytes }) => [name, bytes]));
  assert.doesNotThrow(() => checkFiles(map()));
  const planted = (name, bytes) => { const copy = map(); copy.set(name, Buffer.from(bytes)); return copy; };
  assert.throws(() => checkFiles(planted('.DS_Store', 'x')), BuildError);
  assert.throws(() => checkFiles(planted('index.js', "import x from 'https://cdn.example.com/x.js';\n")), /imports/);
  assert.throws(() => checkFiles(planted('results.js', 'eval(text);\n')), /builds code/);
  assert.throws(() => checkFiles(planted('index.html', '<script src="/abs.js"></script>')), /not in the package/);
  assert.throws(() => checkFiles(planted('scanner-worker.js', 'new URL("x_bg.wasm", import.meta.url)')), /import\.meta/);
  const index = map().get('index.js').toString('utf8');
  assert.equal([...index.matchAll(/https:\/\/[^'"\s]+/g)].map((match) => match[0]).join(), SDK_URL,
    'the panel names one remote address, the Adobe Express SDK');
});

test('the zip holds dist/ at its root, under the limit, with the same bytes each time', async () => {
  assert.ok(existsSync(zipPath), 'run npm run build first');
  const zip = readFileSync(zipPath);
  assert.ok(zip.length <= ZIP_LIMIT);
  const entries = readZip(zip);
  const names = [...entries.keys()];
  assert.equal(names[0], 'manifest.json');
  assert.deepEqual([...names].sort(), readdirSync(join(HERE, 'dist')).sort());
  for (const name of names) {
    assert.ok(!name.includes('/') && !name.startsWith('.'), name);
    assert.equal(sha256(entries.get(name)), sha256(readFileSync(join(HERE, 'dist', name))), name);
  }
  const { files } = await packageFiles();
  assert.equal(sha256(writeZip(files)), sha256(zip), 'the same inputs give the same zip');
  const receipt = JSON.parse(readFileSync(join(HERE, 'build', 'build-receipt.json'), 'utf8'));
  assert.equal(receipt.zip.sha256, sha256(zip));
  assert.equal(receipt.engine.wasm_sha256, WASM_SHA256);
  const notice = entries.get('NOTICE.md').toString('utf8');
  assert.match(notice, /AGPL-3\.0-or-later/);
  assert.match(notice, /176ac96ef16ee330dbfc6ada10327d0b4e23a8b2/);
  assert.match(entries.get('LICENSE').toString('utf8'), /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.throws(() => writeZip([{ name: '../x', bytes: Buffer.from('x') }]), /relative/);
});

test('the listing kit stays within Adobe\'s limits and names the zip that was built', () => {
  const listing = readFileSync(join(HERE, 'LISTING.md'), 'utf8');
  const field = (name) => listing.match(new RegExp(`^\\| ${name} \\|[^|]*\\| \`([^\`]+)\``, 'm'))?.[1];
  const quotes = listing.split('\n').filter((line) => line.startsWith('> ')).map((line) => line.slice(2));
  assert.equal(field('Add-on name'), 'QR Code & Barcode Scanner');
  assert.ok(field('Add-on name').length <= 25);
  assert.ok(field('Summary').length <= 50, field('Summary'));
  assert.ok(field('Keywords').length <= 100, field('Keywords'));
  const [description, notes] = quotes;
  assert.ok(description.length <= 1000);
  assert.match(listing, new RegExp(`\\*\\*Full description\\*\\* \\(${description.length} characters\\)`));
  assert.ok(notes.length <= 1000);
  assert.ok(existsSync(zipPath), 'run npm run build first');
  const zip = readFileSync(zipPath);
  assert.match(listing, new RegExp(`\\| SHA-256 \\| \`${sha256(zip)}\` \\|`), 'LISTING.md names the SHA-256 of the built zip');
  assert.match(listing, new RegExp(`\\| Size \\| ${zip.length.toLocaleString('en-US')} bytes`));
});

test('the built worker starts the engine and reads the fixture in fast, frame and full', async () => {
  const send = startWorker();
  const init = await send({ type: 'init' });
  assert.equal(init.ok, true);
  assert.equal(init.version, '0.11.0');
  assert.equal(init.engine.wasm_sha256, WASM_SHA256);
  for (const profile of ['fast', 'frame', 'full']) {
    const bytes = new Uint8Array(fixture).buffer;
    const reply = await send({ type: 'scan', bytes, profile, budgetMs: 20000 });
    assert.equal(reply.ok, true, reply.error);
    assert.deepEqual(contents(reply.report), EXPECTED, profile);
    assert.equal(reply.report.trace.budget_exhausted, false);
    assert.equal(reply.report.trace.engine_panics, 0);
  }
  const unknown = await send({ type: 'other' });
  assert.deepEqual([unknown.ok, unknown.error], [false, 'unknown message other']);
  const broken = await send({ type: 'scan', bytes: new TextEncoder().encode('not an image').buffer, profile: 'fast', budgetMs: 1000 });
  assert.equal(broken.ok, false);
  assert.ok(broken.error.length > 0);
});
