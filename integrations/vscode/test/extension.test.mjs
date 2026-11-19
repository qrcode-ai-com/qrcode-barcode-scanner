// SPDX-License-Identifier: MIT
// The bundled extension with a recorded `vscode` module: activation, the command from a menu and
// from the palette, the output channel, the quick pick and the clipboard. By default it runs the
// built folder out/stage; QRSCAN_VSCODE_EXTENSION_DIR points it at the folder unpacked from the
// VSIX. No editor is started: menus and settings are checked from the manifest.
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { decodePng, encodeBmp, whitePng } from './images.mjs';
import { createVscode, loadExtension } from './vscode-mock.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = resolve(here, '..', '..');
const extensionDir = resolve(process.env.QRSCAN_VSCODE_EXTENSION_DIR ?? join(here, 'out', 'stage'));
const manifest = JSON.parse(readFileSync(join(extensionDir, 'package.json'), 'utf8'));
const COMMAND = 'qrcodeBarcodeScanner.scan';
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];

const workspace = mkdtempSync(join(tmpdir(), 'qrscan-vscode-workspace-'));
const mixed = readFileSync(join(repository, 'fixtures', 'symbology', 'mixed-code128-qr.png'));
writeFileSync(join(workspace, 'mixed.png'), mixed);
writeFileSync(join(workspace, 'mixed.bmp'), encodeBmp(decodePng(new Uint8Array(mixed)), 'rgb24'));
writeFileSync(join(workspace, 'white.png'), whitePng(repository));
writeFileSync(join(workspace, 'broken.png'), 'not an image at all');
writeFileSync(join(workspace, 'notes.txt'), 'text');
writeFileSync(join(workspace, 'empty.gif'), '');

const { vscode, state } = createVscode({ workspaceRoot: workspace });
const extension = loadExtension(join(extensionDir, 'dist', 'extension.js'), vscode);
const context = { extensionUri: vscode.Uri.file(extensionDir), subscriptions: [] };
const file = (name) => vscode.Uri.file(join(workspace, name));
const run = (...args) => vscode.commands.executeCommand(COMMAND, ...args);
const channel = () => state.channels[0];
const lastPick = () => state.picks.at(-1);
const payloads = (outcome) => outcome.results.map((entry) => entry.result.report.detections.map((d) => [d.symbology, d.content.text]).sort());
const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];

before(() => extension.activate(context));
after(() => {
  extension.deactivate();
  for (const disposable of context.subscriptions) disposable.dispose();
  rmSync(workspace, { recursive: true, force: true });
});
beforeEach(() => {
  Object.assign(state, { messages: [], dialogs: [], picks: [], progress: [], clipboard: null, config: {}, openDialogResult: undefined, choose: () => undefined, onProgress: () => {}, onRead: () => {}, reads: [] });
  state.sizes.clear();
  channel().lines.length = 0;
  channel().shown.length = 0;
});

test('the manifest declares the command, its menus on the six image types and the settings', () => {
  assert.equal(manifest.name, 'qrcode-barcode-scanner');
  assert.equal(manifest.publisher, 'qrcode-ai-com');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.main, './dist/extension.js');
  assert.equal(manifest.engines.vscode, '^1.74.0');
  assert.deepEqual(manifest.activationEvents, []);
  assert.equal(manifest.license, 'MIT AND AGPL-3.0-or-later');
  assert.equal(manifest.icon, 'images/icon.png');
  assert.equal(manifest.browser, undefined, 'no web extension entry until a web host has run it');
  assert.deepEqual(manifest.contributes.commands, [{ command: COMMAND, title: 'Scan QR codes and barcodes', category: 'QR Code & Barcode Scanner' }]);
  const menus = manifest.contributes.menus;
  assert.deepEqual(Object.keys(menus).sort(), ['editor/title', 'editor/title/context', 'explorer/context']);
  for (const [where, entries] of Object.entries(menus)) {
    assert.equal(entries.length, 1, where);
    const [{ command, when }] = entries;
    assert.equal(command, COMMAND);
    const [, source, flags] = /resourceExtname =~ \/(.+)\/(\w*)$/.exec(when);
    const pattern = new RegExp(source, flags);
    for (const extension of EXTENSIONS) {
      assert.ok(pattern.test(`.${extension}`) && pattern.test(`.${extension.toUpperCase()}`), `${where} shows on .${extension}`);
    }
    for (const other of ['.svg', '.tiff', '.txt', '.png.txt', '.pngx']) assert.ok(!pattern.test(other), `${where} hides on ${other}`);
  }
  assert.match(menus['explorer/context'][0].when, /^!explorerResourceIsFolder && /);
  const settings = manifest.contributes.configuration.properties;
  assert.deepEqual(settings['qrcodeBarcodeScanner.profile'].enum, ['full', 'fast', 'frame']);
  assert.equal(settings['qrcodeBarcodeScanner.profile'].default, 'full');
  assert.deepEqual([settings['qrcodeBarcodeScanner.budgetMs'].minimum, settings['qrcodeBarcodeScanner.budgetMs'].maximum], [0, 60000]);
  assert.equal(settings['qrcodeBarcodeScanner.budgetMs'].default, null);
});

test('activation registers one command and one output channel', () => {
  assert.deepEqual([...state.commands.keys()], [COMMAND]);
  assert.equal(state.channels.length, 1);
  assert.equal(channel().name, 'QR Code & Barcode Scanner');
  assert.equal(context.subscriptions.length, 2);
});

for (const profile of ['fast', 'frame', 'full']) {
  test(`explorer command on the mixed fixture, ${profile} profile: output, quick pick and copy`, async () => {
    state.config = { 'qrcodeBarcodeScanner.profile': profile, 'qrcodeBarcodeScanner.budgetMs': 0 };
    state.choose = (items) => items.find((item) => item.description === 'Code 128');
    const outcome = await run(file('mixed.png'), [file('mixed.png')]);
    assert.equal(outcome.cancelled, false);
    assert.deepEqual(payloads(outcome), [EXPECTED]);
    assert.equal(outcome.results[0].result.entry, 'scan_image');
    assert.deepEqual(outcome.options, { profile, budgetMs: 0 });
    assert.equal(state.progress.length, 1);
    assert.equal(state.progress[0].options.cancellable, true);

    const lines = channel().lines;
    assert.ok(lines.includes('mixed.png'));
    assert.ok(lines.includes(`  Profile ${profile} · budget none · scanner 0.11.0`));
    assert.ok(lines.some((line) => /^ {2}\d\. QR Code: https:\/\/qrc-ai\.com\/76xMa$/.test(line)));
    assert.ok(lines.some((line) => /^ {2}\d\. Code 128: STOCK-4827$/.test(line)));
    assert.equal(lines.includes('  QR quality score: not measured by the frame profile.'), profile === 'frame');
    if (profile === 'full') assert.ok(lines.includes('  QR quality score: 100 (excellent)'));
    const json = lines.slice(lines.indexOf('  Engine report:') + 1).map((line) => line.slice(2)).join('\n');
    assert.deepEqual(JSON.parse(json), outcome.results[0].result.report);
    assert.deepEqual(channel().shown, [true], 'the output is shown without taking focus');

    const { items, options } = lastPick();
    const codes = items.filter((item) => item.action === 'copy');
    assert.deepEqual(codes.map((item) => [item.description, item.label]).sort(), [['Code 128', 'STOCK-4827'], ['QR Code', 'https://qrc-ai.com/76xMa']]);
    assert.equal(options.title, '2 codes found in mixed.png');
    assert.deepEqual(items.slice(-2).map((item) => item.action), ['json', 'output']);
    assert.equal(state.clipboard, 'STOCK-4827');
    assert.deepEqual(state.messages, [{ level: 'info', text: 'Copied the Code 128 text.', items: [] }]);
  });
}

test('the copied text is the exact decoded text, and the report copies as JSON', async () => {
  state.choose = (items) => items.find((item) => item.description === 'QR Code');
  await run(file('mixed.png'));
  assert.equal(state.clipboard, 'https://qrc-ai.com/76xMa');
  state.choose = (items) => items.find((item) => item.action === 'json');
  const outcome = await run(file('mixed.png'));
  assert.deepEqual(JSON.parse(state.clipboard), outcome.results[0].result.report);
  assert.equal(state.messages.at(-1).text, 'Copied the engine report as JSON.');
  state.choose = (items) => items.find((item) => item.action === 'output');
  await run(file('mixed.png'));
  assert.deepEqual(channel().shown.slice(-2), [true, false], 'the last item focuses the output');
});

test('the command palette asks for files, filtered to the six image types', async () => {
  state.openDialogResult = [file('mixed.bmp')];
  state.config = { 'qrcodeBarcodeScanner.profile': 'frame', 'qrcodeBarcodeScanner.budgetMs': 0 };
  const outcome = await run();
  assert.equal(state.dialogs.length, 1);
  assert.deepEqual(state.dialogs[0].filters, { Images: EXTENSIONS });
  assert.equal(state.dialogs[0].canSelectMany, true);
  assert.equal(state.dialogs[0].defaultUri.path, vscode.Uri.file(workspace).path);
  assert.deepEqual(payloads(outcome), [EXPECTED]);
  assert.equal(outcome.results[0].result.entry, 'scan_frame', 'a BMP is decoded by the extension and read as pixels');
  assert.deepEqual(outcome.options, { profile: 'frame', budgetMs: 0 });
});

test('closing the file dialog scans nothing and says nothing', async () => {
  for (const result of [undefined, []]) {
    state.openDialogResult = result;
    assert.equal(await run(), undefined);
  }
  assert.deepEqual([state.progress, state.messages, state.reads, channel().lines], [[], [], [], []]);
});

test('a file that is not an image is refused before it is read', async () => {
  assert.equal(await run(file('notes.txt')), undefined);
  assert.deepEqual(state.messages, [{ level: 'warning', text: 'notes.txt is not an image file this scanner reads. It reads PNG, JPEG, WebP, GIF and uncompressed BMP files.', items: [] }]);
  assert.deepEqual([state.progress, state.reads], [[], []]);
});

test('an unreadable image gives the engine error and the scan output keeps it', async () => {
  const outcome = await run(file('broken.png'));
  assert.equal(outcome.results[0].code, 'QRS-001');
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].level, 'error');
  assert.match(state.messages[0].text, /^Could not scan broken\.png: unsupported or corrupt image: .*\[QRS-001\]$/);
  assert.ok(channel().lines.some((line) => /^ {2}Not scanned: unsupported or corrupt image: .*\[QRS-001\]$/.test(line)));
  assert.deepEqual(state.picks, []);
});

test('empty and oversized files are refused with their reason', async () => {
  await run(file('empty.gif'));
  assert.equal(state.messages[0].text, 'Could not scan empty.gif: the file is empty');
  state.messages.length = 0;
  state.sizes.set(file('mixed.png').path, 65 * 1024 * 1024);
  await run(file('mixed.png'));
  assert.equal(state.messages[0].text, 'Could not scan mixed.png: the file is 65 MiB; this scanner reads files up to 64 MiB');
  assert.ok(!state.reads.includes(file('mixed.png').path), 'an oversized file is not read');
});

test('an image without a code says so, and opens no quick pick', async () => {
  const outcome = await run(file('white.png'));
  assert.deepEqual(outcome.options, { profile: 'full', budgetMs: undefined }, 'unset settings keep the engine defaults');
  assert.deepEqual(outcome.results[0].result.report.detections, []);
  assert.deepEqual(state.messages, [{ level: 'info', text: 'No QR code or barcode found in white.png (profile full).', items: [] }]);
  assert.ok(channel().lines.includes('  No QR code or barcode found.'));
  assert.deepEqual(state.picks, []);
});

test('several selected files are scanned in turn, and each code names its file', async () => {
  state.config = { 'qrcodeBarcodeScanner.profile': 'frame', 'qrcodeBarcodeScanner.budgetMs': 0 };
  state.choose = (items) => items.find((item) => item.action === 'json');
  const selection = [file('mixed.png'), file('notes.txt'), file('white.png'), file('mixed.bmp')];
  const outcome = await run(selection[0], selection);
  assert.deepEqual(outcome.results.map((entry) => entry.name), ['mixed.png', 'white.png', 'mixed.bmp']);
  assert.equal(state.messages[0].level, 'warning');
  assert.match(state.messages[0].text, /^notes\.txt is not an image file/);
  assert.deepEqual(state.progress[0].reports.map((report) => report.message), ['1 of 3: mixed.png', '2 of 3: white.png', '3 of 3: mixed.bmp']);
  const codes = lastPick().items.filter((item) => item.action === 'copy');
  assert.equal(codes.length, 4);
  assert.deepEqual(codes.map((item) => item.detail.split(' · ')[0]).sort(), ['mixed.bmp', 'mixed.bmp', 'mixed.png', 'mixed.png']);
  assert.equal(lastPick().options.title, '4 codes found in 3 images');
  const reports = JSON.parse(state.clipboard);
  assert.equal(reports.length, 3);
  assert.deepEqual(reports[1].detections, []);
  assert.equal(state.messages.at(-1).text, 'Copied 3 engine reports as JSON.');
});

const cancelledOutcome = (outcome) => {
  assert.equal(outcome.cancelled, true);
  assert.deepEqual(outcome.results, []);
  assert.deepEqual(state.messages, [{ level: 'info', text: 'Scan cancelled.', items: [] }]);
  assert.deepEqual(state.picks, []);
};

test('Cancel while the worker compiles the module or scans ends its thread', async () => {
  state.config = { 'qrcodeBarcodeScanner.profile': 'full', 'qrcodeBarcodeScanner.budgetMs': 0 };
  let cancel = null;
  state.onProgress = (_report, button) => {
    cancel = button;
  };
  // The file is handed to the worker right after this read; 20 ms later the worker is still
  // compiling the module or running the unbounded full scan, which takes far longer.
  state.onRead = () => setTimeout(() => cancel(), 20);
  cancelledOutcome(await run(file('mixed.png')));
  state.onProgress = () => {};
  state.onRead = () => {};
  state.messages.length = 0;
  state.choose = (items) => items.find((item) => item.description === 'QR Code');
  await run(file('mixed.png'));
  assert.equal(state.clipboard, 'https://qrc-ai.com/76xMa', 'the next scan starts a new worker');
});

test('Cancel before the file reaches the worker settles at once, and skips the next files', async () => {
  // A slow read: the thread has exited before the file arrives, so nothing would ever answer.
  state.onProgress = (_report, cancel) => cancel();
  state.onRead = () => new Promise((settle) => setTimeout(settle, 300));
  cancelledOutcome(await run(file('mixed.png'), [file('mixed.png'), file('mixed.bmp')]));
  state.onRead = () => {};
  assert.deepEqual(state.progress[0].reports.map((report) => report.message), ['1 of 2: mixed.png']);
  state.messages.length = 0;
  state.onProgress = (_report, cancel) => setTimeout(cancel, 0);
  cancelledOutcome(await run(file('mixed.png')));
});

test('the extension reads its module from its own folder, not from the working directory', async () => {
  const copy = mkdtempSync(join(tmpdir(), 'qrscan-vscode-moved-'));
  try {
    cpSync(extensionDir, copy, { recursive: true });
    rmSync(join(copy, 'dist', 'qrcode-barcode-scanner_bg.wasm'));
    const second = createVscode({ workspaceRoot: workspace });
    const moved = loadExtension(join(copy, 'dist', 'extension.js'), second.vscode);
    moved.activate({ extensionUri: second.vscode.Uri.file(copy), subscriptions: [] });
    const outcome = await second.vscode.commands.executeCommand(COMMAND, file('mixed.png'));
    assert.match(outcome.failure, /ENOENT|no such file/i);
    assert.match(second.state.messages[0].text, /^The QR code and barcode scanner could not start: /);
    assert.equal(second.state.messages[0].level, 'error');
    moved.deactivate();
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
});

test('deactivate ends every worker and a new scan still works', async () => {
  extension.deactivate();
  state.choose = (items) => items.find((item) => item.description === 'Code 128');
  await run(file('mixed.png'));
  assert.equal(state.clipboard, 'STOCK-4827');
});
