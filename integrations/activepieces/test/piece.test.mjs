// SPDX-License-Identifier: MIT
// The bundled piece (build/package/src/index.js, written by build.mjs) loaded the way the
// Activepieces engine loads it: the export whose constructor is named Piece, its metadata, and
// the scan action run on the acceptance fixture in the three profiles, an empty image and refusals.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const bundlePath = new URL('./build/package/src/index.js', import.meta.url).pathname;
const bundle = require(bundlePath);
const { ApFile } = require('@activepieces/pieces-framework');
const published = JSON.parse(readFileSync(new URL('./build/package/package.json', import.meta.url), 'utf8'));
const fixture = readFileSync(new URL('../../../fixtures/symbology/mixed-code128-qr.png', import.meta.url));
const white = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PMQ0AMAzAsPInvYLYYVWKESTzjhsd8KsBrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BbQHKU9LC7/CP1AAAAABJRU5ErkJggg==', 'base64');
const EXPECTED = ['https://qrc-ai.com/76xMa', 'STOCK-4827'];

// extractPieceFromModule: the engine scans the module's exports for constructor.name === 'Piece'.
const pieces = Object.values(bundle).filter((value) => value?.constructor?.name === 'Piece');
const [piece] = pieces;
const action = piece.getAction('scan_image');
const run = (propsValue) => action.run({ propsValue, auth: undefined });

test('the bundle exports one Piece with the scan action and no connection', () => {
  assert.equal(pieces.length, 1);
  const metadata = piece.metadata();
  assert.equal(metadata.displayName, 'QR Code & Barcode Scanner');
  assert.deepEqual(Object.keys(metadata.actions), ['scan_image']);
  assert.deepEqual(Object.keys(metadata.triggers), []);
  assert.equal(metadata.auth, undefined, 'PieceAuth.None(): no connection to set up');
  assert.match(metadata.logoUrl, /^https:\/\/raw\.githubusercontent\.com\/qrcode-ai-com\/qrcode-barcode-scanner-rust\/main\/integrations\/activepieces\/logo\.svg$/);
  const scan = metadata.actions.scan_image;
  assert.deepEqual(Object.keys(scan.props), ['image', 'profile', 'budgetMs', 'includeReport']);
  assert.equal(scan.props.image.type, 'FILE');
  assert.equal(scan.props.image.required, true);
  assert.equal(scan.props.profile.defaultValue, 'frame');
  assert.deepEqual(scan.props.profile.options.options.map((option) => option.value), ['frame', 'fast', 'full']);
  assert.equal(scan.audience, 'both');
  assert.equal(scan.aiMetadata.idempotent, true);
});

test('the published manifest installs only the pinned engine', () => {
  assert.equal(published.main, './src/index.js');
  assert.deepEqual(published.dependencies, { '@qrcode-ai-com/qrcode-barcode-scanner-wasm': '0.11.0' });
  assert.equal(published.license, 'MIT');
  for (const key of ['scripts', 'devDependencies', 'bundleDeps', 'types']) assert.ok(!(key in published), `${key} is removed`);
  const source = readFileSync(bundlePath, 'utf8');
  assert.doesNotMatch(source, /\b__dirname\b/);
  assert.match(source, /require\.resolve\("@qrcode-ai-com\/qrcode-barcode-scanner-wasm"\)/);
  assert.ok(source.length < 3 * 1024 * 1024, 'under the monorepo warning threshold');
  assert.ok(published.files.includes('THIRD-PARTY-NOTICES.txt'));
  const notices = readFileSync(new URL('./build/package/THIRD-PARTY-NOTICES.txt', import.meta.url), 'utf8');
  for (const name of ['@activepieces/pieces-framework', 'zod', 'nanoid', 'ipaddr.js', 'deepmerge-ts']) {
    assert.ok(notices.includes(`----\n\n${name} `), `${name} has its notice`);
  }
  assert.ok(!notices.includes('----\n\n@qrcode-ai-com/qrcode-barcode-scanner-wasm'), 'the engine is not inlined');
});

for (const profile of ['fast', 'frame', 'full']) {
  test(`the action returns both codes in ${profile}`, async () => {
    // Unbounded, so a loaded machine cannot cut the score: the engine's own test rule.
    const result = await run({ image: new ApFile('label.png', fixture, 'png'), profile, budgetMs: 0, includeReport: true });
    assert.deepEqual(result.texts, EXPECTED);
    assert.deepEqual(result.codes.map((code) => code.symbology), ['qr_code', 'code128']);
    assert.equal(result.count, 2);
    assert.deepEqual([result.profile, result.engine], [profile, '0.11.0']);
    assert.deepEqual(result.file, { name: 'label.png', extension: 'png' });
    assert.equal(result.report.versions.scanner, '0.11.0');
    assert.equal(result.report.trace.budget_exhausted, false);
    assert.equal(result.report.score === null, profile === 'frame');
  });
}

test('empty optional inputs take the profile defaults, and the report can be left out', async () => {
  const result = await run({ image: new ApFile('label.png', fixture), profile: 'frame', budgetMs: null, includeReport: false });
  assert.deepEqual(result.texts, EXPECTED);
  assert.equal('report' in result, false);
  assert.deepEqual(result.file, { name: 'label.png', extension: null });
});

test('an image without a code is a normal result', async () => {
  const result = await run({ image: new ApFile('white.png', white, 'png'), profile: 'frame' });
  assert.deepEqual([result.texts, result.codes, result.count], [[], [], 0]);
});

test('a corrupt image and refused inputs fail the step with their code', async () => {
  const cases = [
    [{ image: new ApFile('bad.png', Buffer.from('not an image')), profile: 'frame' }, 'QRS-001'],
    [{ image: new ApFile('label.png', fixture), profile: 'slow' }, 'QRSCAN_PROFILE'],
    [{ image: new ApFile('label.png', fixture), profile: 'frame', budgetMs: 60_001 }, 'QRSCAN_BUDGET'],
    [{ image: new ApFile('empty.png', Buffer.alloc(0)), profile: 'frame' }, 'QRSCAN_INPUT'],
    [{ image: new ApFile('big.png', Buffer.alloc(8 * 1024 * 1024 + 1)), profile: 'frame' }, 'QRSCAN_INPUT_LIMIT'],
  ];
  for (const [propsValue, code] of cases) {
    await assert.rejects(run(propsValue), (error) => {
      assert.equal(error.code, code);
      assert.ok(error.message.endsWith(`[${code}]`), error.message);
      return true;
    });
  }
});
