// The panel's report logic, on reports of the published engine itself: the 0.11.0 WebAssembly
// module the extension bundles scans the repository's mixed fixture under Node, with each profile,
// and src/report.ts must turn each report into the exact rows and sentence the panel shows.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { base64Bytes, isComplete, isImageName, qrsCode, summarize } from '../src/report.ts';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const enginePath = require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm/package.json');
const engineDir = dirname(enginePath);
const engine = await import(join(engineDir, 'qrcode-barcode-scanner.js'));
const buildInfo = JSON.parse(readFileSync(join(engineDir, 'build-info.json'), 'utf8'));
const wasm = readFileSync(join(engineDir, 'qrcode-barcode-scanner_bg.wasm'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256(wasm), 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68');
assert.equal(buildInfo.wasm.sha256, sha256(wasm));
engine.initSync({ module: wasm });

const fixture = readFileSync(join(here, '..', '..', '..', 'fixtures', 'symbology', 'mixed-code128-qr.png'));
assert.equal(sha256(fixture), 'c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8');
const EXPECTED = [
  { symbology: 'code128', text: 'STOCK-4827' },
  { symbology: 'qr_code', text: 'https://qrc-ai.com/76xMa' },
];
const pairs = (rows) => rows.map(({ symbology, text }) => ({ symbology, text }))
  .sort((a, b) => a.symbology.localeCompare(b.symbology));

for (const profile of ['fast', 'frame', 'full']) {
  test(`the ${profile} profile: both codes, a complete scan, the panel's sentence and score`, () => {
    const report = engine.scan_image(fixture, profile, undefined, undefined, 0);
    assert.equal(engine.version(), '0.11.0');
    assert.equal(isComplete(report), true);
    const view = summarize(report, 'mixed-code128-qr.png', profile);
    assert.equal(view.state, 'result');
    assert.deepEqual(pairs(view.rows), EXPECTED);
    assert.equal(view.text, `2 codes found in mixed-code128-qr.png with the ${profile} profile.`);
    const url = view.rows.find((row) => row.symbology === 'qr_code');
    assert.equal(url.kind, 'url');
    if (profile === 'frame') {
      assert.equal(report.score ?? null, null);
      assert.equal(view.score, null);
    } else {
      assert.equal(typeof report.score.value, 'number');
      assert.ok(report.score.value >= 0 && report.score.value <= 100, String(report.score.value));
      assert.match(String(report.score.grade), /^[a-z]+$/);
      assert.equal(view.score,
        `Scannability of the first code: ${report.score.value} out of 100 (${report.score.grade}).`);
    }
  });
}

test('an image without a code is a finished, empty result', () => {
  const blank = { detections: [], score: null,
    trace: { budget_exhausted: false, saturation: { reads: false, detections: false } } };
  const view = summarize(blank, 'blank.png', 'full');
  assert.equal(view.state, 'empty');
  assert.deepEqual(view.rows, []);
  assert.match(view.text, /^No code found in blank\.png with the full profile\./);
});

test('a scan that reached a limit, or whose flags are absent, is never called complete', () => {
  assert.equal(isComplete({}), false);
  assert.equal(isComplete({ trace: { budget_exhausted: false } }), false);
  const cut = { detections: [],
    trace: { budget_exhausted: true, saturation: { reads: false, detections: false } } };
  assert.equal(summarize(cut, 'big.png', 'fast').state, 'inconclusive');
  const partial = { detections: [{ symbology: 'qr_code', content: { text: 'x' } }],
    trace: { budget_exhausted: false, saturation: { reads: true, detections: false } } };
  const view = summarize(partial, 'many.png', 'fast');
  assert.equal(view.state, 'result');
  assert.equal(view.text, '1 code found in many.png with the fast profile. More codes may be present than listed.');
});

test('an input the engine refuses carries its QRS code', () => {
  let message = '';
  try {
    engine.scan_image(new Uint8Array([1, 2, 3, 4]), 'fast', undefined, undefined, 0);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert.match(qrsCode(message) ?? '', /^QRS-\d{3}$/, message);
  assert.equal(qrsCode('no code in this sentence'), null);
});

test('the contents API base64 text decodes to the file bytes', () => {
  const text = fixture.toString('base64').replace(/(.{76})/g, '$1\n');
  assert.deepEqual(Buffer.from(base64Bytes(text)), fixture);
});

test('only image names offer the file browser command', () => {
  for (const name of ['a.png', 'B.JPG', 'c.jpeg', 'd.webp', 'e.gif']) assert.equal(isImageName(name), true, name);
  for (const name of ['notes.ipynb', 'png', 'image.png.txt', 'scan.svg']) assert.equal(isImageName(name), false, name);
});
