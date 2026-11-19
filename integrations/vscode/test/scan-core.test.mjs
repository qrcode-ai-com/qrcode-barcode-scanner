// SPDX-License-Identifier: MIT
// The scan logic against the published WASM module, in plain Node: the mixed fixture in the three
// profiles, BMP and GIF files written from it, the repository's JPEG and WebP fixtures, and the
// refusals.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { BMP_MAX_SIDE, BmpError, decodeBmp } from '../src/bmp.mjs';
import {
  IMAGE_EXTENSIONS, PROFILES, describeError, errorCode, formatName, isSupportedImage, knownFormats, label,
  printable, reportJson, reportLines, scanBytes, scanOptions, summarize,
} from '../src/scan-core.mjs';
import { decodePng, encodeBmp, encodeGif, patched, whitePng } from './images.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = resolve(here, '..', '..');
const require = createRequire(join(here, 'package.json'));
const scanner = await import('@qrcode-ai-com/qrcode-barcode-scanner-wasm');
scanner.initSync({ module: readFileSync(require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm')) });

const MIXED = new Uint8Array(readFileSync(join(repository, 'fixtures', 'symbology', 'mixed-code128-qr.png')));
const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
const payloads = (report) => report.detections.map((d) => [d.symbology, d.content.text]).sort();
const schema = JSON.parse(readFileSync(join(repository, 'spec', 'scan-report.schema.json'), 'utf8')).$defs;

test('the pinned module is the published 0.11.0 engine', () => {
  assert.equal(scanner.version(), '0.11.0');
  const { versions } = scanner.capabilities();
  assert.deepEqual(versions, { scanner: '0.11.0', pipeline: 5, score_contract: 5 });
});

for (const profile of PROFILES) {
  test(`mixed fixture, ${profile} profile, unbounded: both payloads exactly`, () => {
    const { report, entry, options } = scanBytes(scanner, MIXED, { profile, budgetMs: 0 });
    assert.equal(entry, 'scan_image');
    assert.deepEqual(options, { profile, budgetMs: 0 });
    assert.deepEqual(payloads(report), EXPECTED);
    assert.equal(report.trace.budget_exhausted, false);
    assert.equal(report.versions.scanner, '0.11.0');
    const qr = report.detections.find((d) => d.symbology === 'qr_code');
    assert.equal(Buffer.from(qr.content.raw, 'base64').toString('utf8'), 'https://qrc-ai.com/76xMa');
    assert.equal(report.detections.find((d) => d.symbology === 'code128').meta.version, null, 'a linear read carries no QR metadata');
    if (profile === 'frame') assert.equal(report.score, null);
    else {
      assert.equal(typeof report.score.value, 'number');
      assert.ok(report.score.value >= 0 && report.score.value <= 100);
    }
    if (profile === 'full') assert.deepEqual([report.score.value, report.score.grade], [100, 'excellent']);
    // The report crosses a worker boundary and is printed as JSON: it holds plain data only.
    assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
    assert.deepEqual(structuredClone(report), report);
  });

  test(`mixed fixture, ${profile} profile, the profile's own budget: complete, or marked as cut`, () => {
    const { report, options } = scanBytes(scanner, MIXED, { profile });
    assert.equal(options.budgetMs, undefined);
    // frame keeps 80 ms: a busy machine may run out of it. The report then says so, and what
    // it found is still exact; without that mark it holds every payload.
    const found = payloads(report);
    if (report.trace.budget_exhausted === true) {
      for (const pair of found) assert.ok(EXPECTED.some((expected) => expected.join() === pair.join()), pair.join());
    } else {
      assert.equal(report.trace.budget_exhausted, false);
      assert.deepEqual(found, EXPECTED);
    }
  });
}

test('BMP written from the fixture reads the same pixels and both payloads in the three profiles', () => {
  const png = decodePng(MIXED);
  assert.deepEqual([png.width, png.height], [1666, 1120]);
  const bmp = encodeBmp(png, 'rgb24');
  const decoded = decodeBmp(bmp);
  assert.deepEqual([decoded.width, decoded.height], [png.width, png.height]);
  assert.ok(Buffer.from(decoded.rgba).equals(Buffer.from(png.rgba)), 'a 24-bit BMP holds the PNG pixels exactly');
  for (const profile of PROFILES) {
    const { report, entry, pixels } = scanBytes(scanner, bmp, { profile, budgetMs: 0 });
    assert.equal(entry, 'scan_frame');
    assert.deepEqual(pixels, { width: 1666, height: 1120 });
    assert.deepEqual(payloads(report), EXPECTED, profile);
    assert.equal(report.score === null, profile === 'frame', profile);
  }
});

test('every BMP layout the reader accepts gives both payloads', () => {
  const png = decodePng(MIXED);
  for (const [layout, topDown] of [['rgb24', true], ['rgb24-core', false], ['rgb32', false], ['bitfields32', true], ['rgb565', false], ['gray8', false], ['mono1', true]]) {
    const bmp = encodeBmp(png, layout, { topDown });
    const decoded = decodeBmp(bmp);
    if (['rgb24', 'rgb24-core', 'rgb32', 'bitfields32'].includes(layout)) {
      assert.ok(Buffer.from(decoded.rgba).equals(Buffer.from(png.rgba)), `${layout} pixels`);
    }
    if (layout === 'rgb32') assert.ok(decoded.rgba.every((value, i) => i % 4 !== 3 || value === 255), 'zero alpha bytes of BI_RGB are opaque');
    const { report } = scanBytes(scanner, bmp, { profile: 'frame', budgetMs: 0 });
    assert.deepEqual(payloads(report), EXPECTED, `${layout}${topDown ? ' top-down' : ''}`);
  }
});

test('BMP channels, row order and row padding round-trip on a coloured image', () => {
  // The fixture is grey: this odd-width image catches swapped channels and misread padding.
  const width = 7;
  const height = 5;
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) rgba.set([(i * 37) & 255, (i * 91 + 13) & 255, (i * 53 + 101) & 255, 255 - i], i * 4);
  const opaque = new Uint8Array(rgba).map((value, i) => (i % 4 === 3 ? 255 : value));
  for (const [layout, topDown, expected] of [['rgb24', false, opaque], ['rgb24', true, opaque], ['rgb24-core', false, opaque],
    ['rgb32', true, opaque], ['bitfields32', false, rgba], ['bitfields32', true, rgba]]) {
    const decoded = decodeBmp(encodeBmp({ width, height, rgba }, layout, { topDown }));
    assert.deepEqual([decoded.width, decoded.height], [width, height]);
    assert.deepEqual([...decoded.rgba], [...expected], `${layout}${topDown ? ' top-down' : ''}`);
  }
  const quantized = decodeBmp(encodeBmp({ width, height, rgba }, 'rgb565'));
  for (let i = 0; i < width * height * 4; i += 4) {
    assert.deepEqual([...quantized.rgba.subarray(i, i + 4)], [
      Math.round(((rgba[i] >> 3) * 255) / 31), Math.round(((rgba[i + 1] >> 2) * 255) / 63), Math.round(((rgba[i + 2] >> 3) * 255) / 31), 255]);
  }
  const mono = decodeBmp(encodeBmp({ width: 9, height: 2, rgba: new Uint8Array(9 * 2 * 4).map((_, i) => (i % 4 === 3 ? 255 : Math.floor(i / 4) % 2 ? 255 : 0)) }, 'mono1'));
  assert.deepEqual([...mono.rgba].filter((_, i) => i % 4 === 0), [0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255]);
});

test('malformed and unsupported BMP files are refused with a plain reason', () => {
  const small = { width: 4, height: 2, rgba: new Uint8Array(4 * 2 * 4).fill(255) };
  const good = encodeBmp(small, 'gray8');
  assert.doesNotThrow(() => decodeBmp(good));
  const cases = [
    [patched(good, 30, 1), /compressed BMP \(RLE8\) is not supported/],
    [patched(good, 30, 2), /compressed BMP \(RLE4\)/],
    [patched(good, 30, 9), /compression 9 is not supported/],
    [patched(good, 28, 2, 2), /2 bits per pixel is not supported/],
    [patched(good, 14, 20), /header of 20 bytes/],
    [patched(good, 18, 0), /no pixels/],
    [patched(good, 18, BMP_MAX_SIDE + 1), /larger than the scanner accepts/],
    [patched(good, 46, 300), /palette is larger/],
    [patched(good, 10, good.length), /pixel data is truncated/],
    [good.subarray(0, good.length - 1), /pixel data is truncated/],
    [good.subarray(0, 20), /truncated/],
  ];
  // A pixel that names palette entry 3 of a two-entry palette.
  const twoColours = patched(encodeBmp(small, 'gray8'), 46, 2);
  const shifted = new Uint8Array(twoColours);
  shifted[new DataView(shifted.buffer).getUint32(10, true)] = 3;
  cases.push([shifted, /outside its palette/]);
  for (const [bytes, reason] of cases) {
    assert.throws(() => decodeBmp(bytes), (error) => error instanceof BmpError && reason.test(error.message), String(reason));
    assert.throws(() => scanBytes(scanner, bytes, { profile: 'frame' }), BmpError);
    try {
      scanBytes(scanner, bytes, {});
    } catch (error) {
      assert.equal(describeError(error).kind, 'bmp');
    }
  }
});

test('JPEG, WebP and GIF files go to the engine and give their recorded payloads', () => {
  const fixture = (path) => new Uint8Array(readFileSync(join(repository, 'fixtures', ...path.split('/'))));
  // Expected values from corpus.toml: JPEG files stored sideways with EXIF orientation 6, and
  // a QR Code AI template in WebP that only the full profile decodes.
  for (const [path, expected] of [
    ['symbology/exif6-rotated-ean.jpg', [['ean13', '9506000134352']]],
    ['degraded/exif6-rotated-qr.jpg', [['qr_code', 'https://qrcode-ai.com/exif-pin']]],
    ['artistic/blob-style-monkey-logo.webp', [['qr_code', 'https://qrc-ai.com/Uo54C']]],
  ]) {
    const { report, entry } = scanBytes(scanner, fixture(path), { profile: 'full', budgetMs: 0 });
    assert.equal(entry, 'scan_image', path);
    assert.deepEqual(payloads(report), expected, path);
  }
  const gif = encodeGif(decodePng(MIXED));
  assert.equal(Buffer.from(gif.subarray(0, 6)).toString('ascii'), 'GIF89a');
  for (const profile of PROFILES) {
    const { report, entry } = scanBytes(scanner, gif, { profile, budgetMs: 0 });
    assert.equal(entry, 'scan_image');
    assert.deepEqual(payloads(report), EXPECTED, `GIF, ${profile}`);
  }
});

test('bytes that are not an image return the engine error QRS-001', () => {
  assert.throws(() => scanBytes(scanner, new Uint8Array([1, 2, 3, 4]), { profile: 'full' }), (error) => {
    const described = describeError(error);
    assert.equal(described.code, 'QRS-001');
    assert.equal(described.kind, 'engine');
    assert.match(described.message, /unsupported or corrupt image/);
    return true;
  });
  assert.equal(errorCode('no code here'), null);
});

test('an image without a code is a successful empty report', () => {
  for (const profile of PROFILES) {
    const { report } = scanBytes(scanner, whitePng(repository), { profile, budgetMs: 0 });
    assert.deepEqual(report.detections, []);
    assert.deepEqual(summarize(report).codes, []);
    assert.ok(reportLines('white.png', { report, options: { profile, budgetMs: 0 } }).includes('  No QR code or barcode found.'));
  }
});

test('settings outside their domain fall back to the engine defaults', () => {
  assert.deepEqual(scanOptions('fast', 250), { profile: 'fast', budgetMs: 250 });
  assert.deepEqual(scanOptions('frame', 0), { profile: 'frame', budgetMs: 0 });
  for (const profile of ['FULL', '', null, undefined, 3]) assert.equal(scanOptions(profile, 0).profile, 'full');
  for (const budget of [null, undefined, -1, 1.5, 60001, '100', Number.NaN, Infinity]) assert.equal(scanOptions('full', budget).budgetMs, undefined);
});

test('format names cover every symbology of the report schema', () => {
  assert.deepEqual([...knownFormats()].sort(), [...schema.Symbology.enum].sort());
  assert.equal(formatName('code128'), 'Code 128');
  assert.equal(formatName('qr_code'), 'QR Code');
  assert.equal(formatName('a_future_format'), 'a_future_format');
  assert.equal(formatName('constructor'), 'constructor');
});

test('file names: the six image extensions, in any letter case', () => {
  assert.deepEqual(IMAGE_EXTENSIONS, ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);
  for (const name of ['a.png', 'b.JPG', 'dir/c.jpeg', 'C:\\x\\d.WebP', 'e.gif', 'f.bmp']) assert.ok(isSupportedImage(name), name);
  for (const name of ['a.svg', 'b.tiff', 'c', '.png', 'd.png.txt']) assert.ok(!isSupportedImage(name), name);
});

test('decoded text is shown without its hidden controls, and copied unchanged', () => {
  assert.equal(printable('\u001b[31mred\u0007'), '\\u{001b}[31mred\\u{0007}');
  assert.equal(printable('a\tb\nc\r'), 'a\tb\\u{000a}c\\u{000d}');
  assert.equal(printable('abc\u202edef\u2066\u200f\u009b\u007f\ufeff'), 'abc\\u{202e}def\\u{2066}\\u{200f}\\u{009b}\\u{007f}\\u{feff}');
  assert.equal(printable('café 日本 🙂'), 'café 日本 🙂');
  assert.equal(label('$(alert) urgent'), '$\u200b(alert) urgent');
  assert.equal(label('x'.repeat(300)).length, 120);
  const report = { detections: [{ symbology: 'qr_code', content: { text: 'a\u202eb\u0085c\u0001', charset: 'utf8' } }] };
  const json = reportJson(report);
  assert.ok(json.includes('a\\u202eb\\u0085c\\u0001'), json);
  assert.deepEqual(JSON.parse(json), report);
  const lines = reportLines('img.png', { report, options: { profile: 'full', budgetMs: undefined } });
  assert.ok(lines.includes('  1. QR Code: a\\u{202e}b\\u{0085}c\\u{0001}'));
  assert.ok(lines.every((line) => !/[\u0000-\u0008\u000a-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(line)));
});

test('the output lines name the file, the settings, each code and the report', () => {
  const result = scanBytes(scanner, MIXED, { profile: 'full', budgetMs: 0 });
  const lines = reportLines('fixtures/mixed.png', result);
  assert.equal(lines[0], 'fixtures/mixed.png');
  assert.equal(lines[1], '  Profile full · budget none · scanner 0.11.0');
  assert.ok(lines.includes('  2 codes found:'));
  assert.ok(lines.some((line) => /^ {2}\d\. QR Code: https:\/\/qrc-ai\.com\/76xMa$/.test(line)));
  assert.ok(lines.some((line) => /^ {2}\d\. Code 128: STOCK-4827$/.test(line)));
  assert.ok(lines.includes('  QR quality score: 100 (excellent)'));
  const json = lines.slice(lines.indexOf('  Engine report:') + 1).map((line) => line.slice(2)).join('\n');
  assert.deepEqual(JSON.parse(json), result.report);
  const frame = reportLines('m.png', scanBytes(scanner, MIXED, { profile: 'frame' }));
  assert.equal(frame[1], '  Profile frame · budget profile default · scanner 0.11.0');
  assert.ok(frame.includes('  QR quality score: not measured by the frame profile.'));
});
