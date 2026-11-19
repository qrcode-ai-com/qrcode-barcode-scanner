// SPDX-License-Identifier: MIT
// How the extension finds qrscan, runs it and reads its report: with a stand-in process for
// every exit qrscan has, then with the published qrscan on the mixed fixture.
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { before, describe, test } from 'node:test';
import { bundleSource, CODE128, HERE, liveQrscan, mixedFixture, QR } from './helpers.mjs';

let q;
before(async () => {
  q = await bundleSource('src/qrscan.ts');
});

const REPORT = JSON.stringify({
  versions: { scanner: '0.11.0' },
  detections: [
    { symbology: 'qr_code', content: { text: QR, charset: 'utf8' } },
    { symbology: 'code128', content: { text: CODE128, charset: 'iso8859_1' } },
    { symbology: 'future_format', content: { text: 'caf?', charset: 'unknown' } },
  ],
  trace: { budget_exhausted: false },
});

/** A stand-in for execFile that records the call and answers with EXIT. */
function fakeRun(exit) {
  const calls = [];
  const run = (file, args, options, callback) => {
    calls.push({ file, args, options });
    const { code = 0, stdout = '', stderr = '', killed = false, signal = null } = exit;
    const error = code === 0 && !killed ? null : Object.assign(new Error('exit'), { code, killed, signal });
    queueMicrotask(() => callback(error, stdout, stderr));
  };
  return { run, calls };
}

test('formats have readable names, and an unknown one keeps its wire name', () => {
  assert.equal(q.formatLabel('qr_code'), 'QR Code');
  assert.equal(q.formatLabel('ean13'), 'EAN-13');
  assert.equal(q.formatLabel('future_format'), 'future_format');
});

test('only PNG, JPEG, WebP and GIF files are offered to qrscan', () => {
  assert.deepEqual(['a.png', 'b.JPG', 'c.jpeg', 'd.webp', 'e.gif'].map(q.isImagePath), [true, true, true, true, true]);
  assert.deepEqual(['f.bmp', 'g.tiff', 'h.heic', 'i.pdf', 'noext'].map(q.isImagePath), [false, false, false, false, false]);
});

test('a clipboard or Finder value becomes a local path, and anything else is refused', () => {
  assert.equal(q.localPath('file:///Users/me/Desktop/My%20Label.png'), '/Users/me/Desktop/My Label.png');
  assert.equal(q.localPath('/Users/me/a.png'), '/Users/me/a.png');
  assert.equal(q.localPath('a.png'), null);
  assert.equal(q.localPath('https://example.com/a.png'), null);
  assert.equal(q.localPath(''), null);
  assert.equal(q.localPath(undefined), null);
});

test('qrscan is found at the preferred path, or in the usual places', async () => {
  const present = new Set(['/usr/local/bin/qrscan', join(homedir(), 'bin/qrscan')]);
  const isExecutable = async (path) => present.has(path);
  assert.equal(await q.findQrscan('', q.defaultLocations(), isExecutable), '/usr/local/bin/qrscan');
  assert.equal(await q.findQrscan('~/bin/qrscan', q.defaultLocations(), isExecutable), join(homedir(), 'bin/qrscan'));
  await assert.rejects(q.findQrscan('/nowhere/qrscan', q.defaultLocations(), isExecutable), (error) => {
    assert.equal(error.name, 'QrscanMissingError');
    assert.deepEqual(error.looked, ['/nowhere/qrscan']);
    return true;
  });
  assert.deepEqual(q.defaultLocations('/Users/me'), ['/opt/homebrew/bin/qrscan', '/usr/local/bin/qrscan', '/Users/me/.cargo/bin/qrscan']);
});

test('a report becomes codes; the file and the profile are the only arguments', async () => {
  const { run, calls } = fakeRun({ code: 0, stdout: REPORT });
  const result = await q.scanFile('/opt/homebrew/bin/qrscan', '/tmp/-label.png', 'fast', run);
  assert.deepEqual(calls.map((call) => [call.file, call.args]), [['/opt/homebrew/bin/qrscan', ['/tmp/-label.png', '--profile', 'fast']]]);
  assert.equal(calls[0].options.timeout, 30000);
  assert.deepEqual(result.codes, [
    { symbology: 'qr_code', label: 'QR Code', text: QR, complete: true },
    { symbology: 'code128', label: 'Code 128', text: CODE128, complete: true },
    { symbology: 'future_format', label: 'future_format', text: 'caf?', complete: false },
  ]);
  assert.equal(result.engine, '0.11.0');
  assert.equal(result.budgetExhausted, false);
  assert.equal(q.allTexts(result.codes), `${QR}\n${CODE128}\ncaf?`);
});

test('every way qrscan can end is told apart', async () => {
  const none = await q.scanFile('/q', '/a.png', 'full', fakeRun({ code: 1, stdout: JSON.stringify({ detections: [], trace: { budget_exhausted: true } }) }).run);
  assert.deepEqual([none.codes, none.budgetExhausted], [[], true]);
  const cases = [
    [{ code: 2, stderr: '✖ unsupported or corrupt image: The image format could not be determined [QRS-001]\n' }, 'UnreadableImageError', 'unsupported or corrupt image: The image format could not be determined [QRS-001]'],
    [{ code: 'ENOENT' }, 'QrscanMissingError', 'qrscan was not found in /q'],
    [{ code: null, killed: true, signal: 'SIGTERM' }, 'ScanFailedError', 'qrscan stopped after 30 s without a report'],
    [{ code: 101, stderr: 'thread panicked\n' }, 'ScanFailedError', 'qrscan ended with status 101: thread panicked'],
    [{ code: 0, stdout: 'not json' }, 'ScanFailedError', 'qrscan did not print a scan report'],
    [{ code: 0, stdout: '{"detections": 3}' }, 'ScanFailedError', 'qrscan did not print a scan report'],
  ];
  for (const [exit, name, message] of cases) {
    await assert.rejects(q.scanFile('/q', '/a.png', 'full', fakeRun(exit).run), (error) => {
      assert.equal(error.name, name, JSON.stringify(exit));
      assert.equal(error.message, message);
      return true;
    });
  }
  await assert.rejects(q.scanFile('/q', '/a.png', '--help', fakeRun({ code: 0 }).run), /unknown profile/);
});

test('the image comes from Finder first, then from the clipboard', async () => {
  const finder = (items) => async () => items;
  const clipboard = (content) => async () => content;
  const notFrontmost = async () => { throw new Error('Finder is not the frontmost application'); };
  assert.deepEqual(await q.pickImage({ finder: finder([{ path: '/d/notes.txt' }, { path: '/d/label.PNG' }]), clipboard: clipboard({}) }),
    { kind: 'image', path: '/d/label.PNG', name: 'label.PNG', origin: 'finder' });
  assert.deepEqual(await q.pickImage({ finder: finder([{ path: '/d/notes.txt' }]), clipboard: clipboard({ file: '/d/a.png' }) }),
    { kind: 'none', reason: 'The Finder selection holds no PNG, JPEG, WebP or GIF image.' });
  assert.deepEqual(await q.pickImage({ finder: notFrontmost, clipboard: clipboard({ text: 'x', file: 'file:///d/My%20Shot.png' }) }),
    { kind: 'image', path: '/d/My Shot.png', name: 'My Shot.png', origin: 'clipboard' });
  assert.deepEqual(await q.pickImage({ finder: notFrontmost, clipboard: clipboard({ text: 'x', file: '/d/report.pdf' }) }),
    { kind: 'none', reason: 'report.pdf is not a PNG, JPEG, WebP or GIF image.' });
  assert.deepEqual(await q.pickImage({ finder: finder([]), clipboard: async () => { throw new Error('denied'); } }),
    { kind: 'none', reason: 'Select an image in Finder, or copy an image file, then run the command again.' });
});

const live = liveQrscan();
describe('the published qrscan', { skip: live.skip }, () => {
  for (const profile of ['fast', 'frame', 'full']) {
    test(`profile ${profile} reads both codes of the mixed fixture`, async (t) => {
      const result = await q.scanFile(live.path, mixedFixture(), profile);
      assert.deepEqual(new Set(result.codes.map((code) => code.text)), new Set([QR, CODE128]));
      assert.deepEqual(new Set(result.codes.map((code) => code.label)), new Set(['QR Code', 'Code 128']));
      assert.ok(result.codes.every((code) => code.complete));
      assert.match(result.engine, /^\d+\.\d+\.\d+$/);
      t.diagnostic(`${profile}: engine ${result.engine}, budget exhausted ${result.budgetExhausted}`);
    });
  }

  test('a file that is not an image is refused with its reason', async () => {
    await assert.rejects(q.scanFile(live.path, join(HERE, 'package.json'), 'full'), (error) => {
      assert.equal(error.name, 'UnreadableImageError');
      assert.match(error.message, /\[QRS-001\]$/);
      return true;
    });
  });
});
