// SPDX-License-Identifier: MIT
// The Markdown written into a note, and the result window, on text anyone can put in a code.
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { bundleSource, obsidian } from './helpers.mjs';

let format;
let modals;
let images;

before(async () => {
  format = await bundleSource('src/format.ts');
  modals = await bundleSource('src/modals.ts');
  images = await bundleSource('src/images.ts');
});

const code = (text, symbology = 'qr_code', complete = true) => ({ symbology, text, complete });

test('each format has a readable name, and an unknown one keeps its wire name', () => {
  assert.equal(format.formatLabel('qr_code'), 'QR Code');
  assert.equal(format.formatLabel('rectangular_micro_qr_code'), 'rMQR Code');
  assert.equal(format.formatLabel('data_bar_expanded'), 'GS1 DataBar Expanded');
  assert.equal(format.formatLabel('future_format'), 'future_format');
});

test('links, embeds and HTML in a code stay inside a code span', () => {
  const hostile = ['[click](javascript:alert(1))', '![[secret.md]]', '<img src=x onerror=alert(1)>', '#tag', '$$x$$'];
  const lines = format.codesMarkdown(hostile.map((text) => code(text)), 'a.png', 'list').split('\n');
  assert.deepEqual(lines, hostile.map((text) => `- QR Code: \`${text}\``));
});

test('backticks in a code get a longer fence and padding', () => {
  assert.equal(format.inlineCode('a`b'), '``a`b``');
  assert.equal(format.inlineCode('`start'), '`` `start ``');
  assert.equal(format.inlineCode('x ``` y'), '````x ``` y````');
});

test('several lines go in a fenced block; empty and incomplete text are named', () => {
  const markdown = format.codesMarkdown([
    code('WIFI:S:home;\nT:WPA;\n```\nend'),
    code('', 'code128'),
    code('caf?', 'ean13', false),
  ], 'a.png', 'list');
  assert.equal(markdown, [
    '- QR Code:',
    '  ````text',
    '  WIFI:S:home;',
    '  T:WPA;',
    '  ```',
    '  end',
    '  ````',
    '- Code 128: (empty)',
    '- EAN-13 (incomplete text): `caf?`',
  ].join('\n'));
});

test('a callout keeps every line inside the callout and escapes the image name', () => {
  const markdown = format.codesMarkdown([code('one\ntwo'), code('STOCK-4827', 'code128')], 'scan [1] *final* #tag ==hi==.png', 'callout');
  assert.equal(markdown, [
    '> [!info] Codes in scan \\[1\\] \\*final\\* \\#tag \\=\\=hi\\=\\=.png',
    '> - QR Code:',
    '>   ```text',
    '>   one',
    '>   two',
    '>   ```',
    '> - Code 128: `STOCK-4827`',
  ].join('\n'));
});

test('the result window shows decoded text as text and warns when the budget ran out', () => {
  const app = obsidian.createApp({ files: { 'x.png': new Uint8Array() } });
  const image = app.file('x.png');
  const result = { codes: [code('<b>bold</b>')], budgetExhausted: true, profile: 'fast', engine: 'test' };
  const modal = new modals.ResultModal(app, image, result, 'list', null);
  modal.onOpen();
  assert.equal(modal.contentEl.all('code')[0].text, '<b>bold</b>');
  assert.equal(modal.contentEl.all('p')[0].text,
    'The fast profile ran out of time before the scan ended. Choose the full profile in the settings to search longer.');
  modal.onClose();
  assert.deepEqual(modal.contentEl.children, []);
});

test('only image files are offered, links with a heading resolve, and duplicates count once', () => {
  assert.deepEqual(images.IMAGE_EXTENSIONS, ['png', 'jpg', 'jpeg', 'webp', 'gif']);
  assert.equal(images.isImage({ extension: 'PNG' }), true);
  assert.equal(images.isImage({ extension: 'svg' }), false);
  assert.equal(images.isImage({ extension: 'pdf' }), false);
  const app = obsidian.createApp({
    files: { 'a.png': new Uint8Array(), 'b.jpg': new Uint8Array(), 'doc.pdf': new Uint8Array() },
    notes: { 'n.md': [{ link: 'a.png', line: 0 }, { link: 'doc.pdf', line: 1 }, { link: 'b.jpg#x', line: 2 }, { link: 'a.png', line: 3, embed: false }, { link: 'lost.webp', line: 4 }] },
  });
  const { images: found, missing } = images.imagesOfNote(app, app.file('n.md'));
  assert.deepEqual(found.map((file) => file.path), ['a.png', 'b.jpg']);
  assert.deepEqual(missing, ['lost.webp']);
});
