// SPDX-License-Identifier: MIT
// The Scan Image for Codes command against a stand-in Raycast: what it reads from the host, and
// the list it shows for each outcome.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { before, beforeEach, describe, test } from 'node:test';
import { bundleSource, CODE128, HERE, liveQrscan, mixedFixture, named, QR } from './helpers.mjs';
import { host } from './raycast-mock.mjs';

let command;
before(async () => {
  command = await bundleSource('src/scan-image.tsx');
});
beforeEach(() => host.reset());

const result = (codes, extra = {}) => ({ file: '/d/mixed.png', codes, budgetExhausted: false, profile: 'full', engine: '0.11.0', score: null, report: { detections: [] }, ...extra });
const code = (text, symbology = 'qr_code', label = 'QR Code', complete = true) => ({ symbology, label, text, complete });
const view = (state) => command.ScanView({ state });

test('the manifest is a Raycast extension under MIT with one view command', () => {
  const manifest = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.title, 'QR Code & Barcode Scanner');
  assert.deepEqual(manifest.platforms, ['macOS']);
  assert.deepEqual(manifest.commands.map((entry) => [entry.name, entry.mode]), [['scan-image', 'view']]);
  assert.deepEqual(manifest.preferences.map((entry) => [entry.name, entry.type, entry.required]), [['qrscanPath', 'textfield', false], ['profile', 'dropdown', false]]);
  assert.deepEqual(manifest.preferences[1].data.map((entry) => entry.value), ['full', 'fast', 'frame']);
  assert.equal(manifest.preferences[1].default, 'full');
  assert.deepEqual(Object.keys(manifest.dependencies), ['@raycast/api'], 'the extension carries no engine package');
});

test('two codes become two items, each copied or pasted as its exact text', () => {
  const report = { detections: [{ symbology: 'qr_code' }, { symbology: 'code128' }], score: { value: 100, grade: 'excellent' } };
  const tree = view({ kind: 'result', name: 'mixed.png', result: result([code(QR), code(CODE128, 'code128', 'Code 128')], { score: { value: 100, grade: 'excellent' }, report }) });
  const [section] = named(tree, 'List.Section');
  assert.deepEqual([section.props.title, section.props.subtitle], ['mixed.png', '2 codes']);
  const items = named(tree, 'List.Item');
  assert.deepEqual(items.map((item) => [item.props.title, item.props.subtitle, item.props.icon]), [
    [QR, 'QR Code', 'icon:AppWindowGrid3x3'],
    [CODE128, 'Code 128', 'icon:BarCode'],
  ]);
  for (const [index, text] of [QR, CODE128].entries()) {
    const actions = named(items[index], 'Action.CopyToClipboard').map((action) => [action.props.title, action.props.content]);
    assert.deepEqual(actions, [['Copy Text', text], ['Copy All Texts', `${QR}\n${CODE128}`], ['Copy Scan Report', JSON.stringify(report, null, 2)]]);
    assert.deepEqual(named(items[index], 'Action.Paste').map((action) => action.props.content), [text]);
  }
  // The report judges its first code only: the score is shown on that item and no other.
  assert.deepEqual(items.map((item) => item.props.accessories), [[{ tag: { value: 'Score 100 · excellent', color: 'color:Green' } }], []]);
  assert.deepEqual(named(tree, 'Action.OpenInBrowser'), [], 'a decoded link is never opened');
});

test('the root command keeps its own title and every list has a search placeholder', () => {
  const states = [
    { kind: 'loading' },
    { kind: 'result', name: 'mixed.png', result: result([code(QR)]) },
    { kind: 'result', name: 'blank.png', result: result([]) },
    { kind: 'none', reason: 'Select an image.' },
    { kind: 'missing', looked: ['/opt/homebrew/bin/qrscan'] },
    { kind: 'unreadable', name: 'x.png', message: 'corrupt [QRS-001]' },
    { kind: 'failed', message: 'crash' },
  ];
  for (const state of states) {
    const tree = view(state);
    assert.equal(tree.type.displayName, 'List', state.kind);
    assert.equal(tree.props.navigationTitle, undefined, `${state.kind}: Raycast sets the root title from the command`);
    assert.equal(tree.props.searchBarPlaceholder, 'Filter the codes', state.kind);
  }
});

test('the score tag follows the grade', () => {
  const colors = ['excellent', 'good', 'acceptable', 'fair', 'poor'].map((grade) => command.scoreTag({ value: 50, grade }).color);
  assert.deepEqual(colors, ['color:Green', 'color:Green', 'color:Yellow', 'color:Red', 'color:Red']);
  assert.equal(command.scoreTag({ value: 72, grade: 'good' }).value, 'Score 72 · good');
});

test('text on several lines is shown on one line and copied whole; incomplete text is tagged', () => {
  const tree = view({ kind: 'result', name: 'a.png', result: result([code('WIFI:S:home;\nT:WPA;'), code('', 'ean13', 'EAN-13', false)]) });
  const items = named(tree, 'List.Item');
  assert.deepEqual(items.map((item) => item.props.title), ['WIFI:S:home; ↵ T:WPA;', '(empty)']);
  assert.equal(named(items[0], 'Action.CopyToClipboard')[0].props.content, 'WIFI:S:home;\nT:WPA;');
  assert.deepEqual(items.map((item) => item.props.accessories.length), [0, 1]);
  assert.equal(items[1].props.accessories[0].tag.value, 'incomplete text');
});

test('no code, a cut scan, a missing qrscan and a bad file each say what happened', () => {
  const empty = named(view({ kind: 'result', name: 'blank.png', result: result([]) }), 'List.EmptyView')[0].props;
  assert.deepEqual([empty.title, empty.description], ['No QR code or barcode found', 'qrscan found no code in blank.png.']);

  const cut = named(view({ kind: 'result', name: 'blank.png', result: result([], { budgetExhausted: true, profile: 'fast' }) }), 'List.EmptyView')[0].props;
  assert.equal(cut.description, 'The fast profile ran out of time before the scan ended. Choose the full profile in the preferences to search longer.');

  const missing = view({ kind: 'missing', looked: ['/opt/homebrew/bin/qrscan'] });
  const missingView = named(missing, 'List.EmptyView')[0].props;
  assert.equal(missingView.title, 'qrscan is not installed');
  assert.match(missingView.description, /brew install qrcode-ai-com\/tap\/qrscan/);
  assert.deepEqual(named(missing, 'Action.CopyToClipboard').map((action) => action.props.content), ['brew install qrcode-ai-com/tap/qrscan']);
  assert.deepEqual(named(missing, 'Action.OpenInBrowser').map((action) => action.props.url), ['https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line']);

  const unreadable = named(view({ kind: 'unreadable', name: 'x.png', message: 'unsupported or corrupt image [QRS-001]' }), 'List.EmptyView')[0].props;
  assert.deepEqual([unreadable.title, unreadable.description], ['x.png could not be read as an image', 'unsupported or corrupt image [QRS-001]']);
  assert.equal(named(view({ kind: 'none', reason: 'Select an image.' }), 'List.EmptyView')[0].props.description, 'Select an image.');
  assert.equal(view({ kind: 'loading' }).props.isLoading, true);
});

test('without an image, the command asks for one and runs nothing', async () => {
  host.finder = new Error('Finder is not the frontmost application');
  host.clipboard = { text: 'hello' };
  host.preferences = { qrscanPath: '/nowhere/qrscan' };
  assert.deepEqual(await command.loadScan(), { kind: 'none', reason: 'Select an image in Finder, or copy an image file, then run the command again.' });
});

test('a qrscan path that does not exist gives the install view', async () => {
  host.finder = [{ path: mixedFixture() }];
  host.preferences = { qrscanPath: '/nowhere/qrscan', profile: 'fast' };
  assert.deepEqual(await command.loadScan(), { kind: 'missing', looked: ['/nowhere/qrscan'] });
});

const live = liveQrscan();
describe('with the published qrscan', { skip: live.skip }, () => {
  for (const profile of ['fast', 'frame', 'full']) {
    test(`profile ${profile}: the image selected in Finder gives both codes`, async () => {
      host.finder = [{ path: mixedFixture() }];
      host.preferences = { qrscanPath: live.path, profile };
      const state = await command.loadScan();
      assert.equal(state.kind, 'result', JSON.stringify(state));
      assert.equal(state.name, 'mixed-code128-qr.png');
      assert.equal(state.result.profile, profile);
      const items = named(view(state), 'List.Item');
      // The engine's order: the QR code first, then the Code 128.
      assert.deepEqual(items.map((item) => [item.props.title, item.props.subtitle]), [[QR, 'QR Code'], [CODE128, 'Code 128']]);
      assert.equal(state.result.engine, '0.11.0');
      assert.equal(state.result.budgetExhausted, false);
      // frame never scores; fast and full judge the QR code, which this fixture prints cleanly.
      if (profile === 'frame') assert.equal(state.result.score, null);
      else assert.ok(state.result.score.value > 0 && ['excellent', 'good'].includes(state.result.score.grade), JSON.stringify(state.result.score));
      assert.deepEqual(state.result.report.detections.map((entry) => entry.content.text), [QR, CODE128]);
    });
  }

  test('an image file on the clipboard is scanned when Finder is not in front', async () => {
    host.finder = new Error('Finder is not the frontmost application');
    host.clipboard = { text: 'mixed-code128-qr.png', file: `file://${mixedFixture().split('/').map(encodeURIComponent).join('/')}` };
    host.preferences = { qrscanPath: live.path };
    const state = await command.loadScan();
    assert.equal(state.kind, 'result', JSON.stringify(state));
    assert.deepEqual(state.result.codes.map((entry) => entry.text), [QR, CODE128]);
  });

  test('a file that is not an image gives the unreadable view', async () => {
    const fake = join(mkdtempSync(join(tmpdir(), 'qrscan-raycast-')), 'not-a-picture.png');
    writeFileSync(fake, 'not a picture');
    host.finder = [{ path: fake }];
    host.preferences = { qrscanPath: live.path };
    const state = await command.loadScan();
    assert.equal(state.kind, 'unreadable', JSON.stringify(state));
    assert.match(state.message, /QRS-001/);
  });
});
