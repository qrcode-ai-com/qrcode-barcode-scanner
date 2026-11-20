// SPDX-License-Identifier: MIT
// The built plugin, driven through its commands and menu as Obsidian would, on the mixed fixture.
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import {
  blankPng, buildMain, clipboard, CODE128, EXPECTED, loadPlugin, mixedFixture, network, obsidian, QR, until,
} from './helpers.mjs';

const { FakeEditor, FakeElement, MarkdownView, Modal, Notice, createApp, createMenu, reset } = obsidian;
const manifest = { id: 'qrcode-barcode-scanner', name: 'QR Code and Barcode Scanner', version: '1.0.0' };

let Plugin;
let required;
let mainSize;

before(() => {
  const main = buildMain();
  mainSize = main.code.length;
  ({ exports: { default: Plugin }, required } = loadPlugin(main.code));
});

beforeEach(() => {
  reset();
  network.length = 0;
  clipboard.written.length = 0;
});

/** A vault where Inbox.md embeds IMAGES ([{ link, line }]) with FILES as its content. */
async function setUp({ files = { 'attachments/mixed.png': mixedFixture() }, links = [{ link: 'mixed.png', line: 2 }], lines = ['# Inbox', '', '![[mixed.png]]', ''], cursor, data = null } = {}) {
  const app = createApp({ files: { 'Inbox.md': new Uint8Array(), ...files }, notes: { 'Inbox.md': links } });
  app.pluginData = data;
  const plugin = new Plugin(app, manifest);
  await plugin.onload();
  const note = app.file('Inbox.md');
  const editor = new FakeEditor(lines, cursor ?? lines.length - 1);
  const view = new MarkdownView(note, editor);
  app.workspace.activeFile = note;
  app.workspace.activeView = view;
  return { app, plugin, note, editor, view };
}

function command(plugin, id) {
  const found = plugin.commands.find((entry) => entry.id === id);
  assert.ok(found, `command ${id} is registered`);
  return found;
}

function resultWindow() {
  return until(() => Modal.opened.find((modal) => modal.constructor.name === 'ResultModal' || modal.titleEl.text.startsWith('Codes in')), 'the result window');
}

function messages() {
  return Notice.shown.map((notice) => notice.message).filter((message) => !message.startsWith('Scanning '));
}

function button(modal, text) {
  const found = modal.contentEl.allButtons().find((entry) => entry.text === text);
  assert.ok(found, `button "${text}" is shown`);
  return found;
}

test('main.js loads with only the obsidian module and registers its commands', async () => {
  const { plugin } = await setUp();
  assert.deepEqual([...new Set(required)], ['obsidian']);
  assert.deepEqual(plugin.commands.map((entry) => [entry.id, entry.name]), [
    ['scan-image-in-note', 'Scan an image in this note'],
    ['scan-open-image', 'Scan the open image'],
  ]);
  assert.equal(plugin.settingTabs.length, 1);
  assert.ok(mainSize > 2_000_000, 'the engine module is embedded in main.js');
});

for (const profile of ['fast', 'frame', 'full']) {
  test(`profile ${profile}: the note's image gives both codes and inserts them as a list`, async () => {
    const { plugin, editor, view } = await setUp({ data: { profile, format: 'list' } });
    command(plugin, 'scan-image-in-note').editorCallback(editor, view);
    const modal = await resultWindow();
    assert.equal(modal.titleEl.text, 'Codes in mixed.png');
    const shown = modal.contentEl.all('code').map((element) => element.text);
    assert.deepEqual(new Set(shown), new Set([QR, CODE128]));
    assert.equal(shown.length, 2);
    // The profile's time budget depends on the machine: when it ran out, the window says so.
    for (const note of modal.contentEl.all('p')) assert.match(note.text, new RegExp(`^The ${profile} profile ran out of time`));

    button(modal, 'Insert into Inbox').click();
    assert.equal(modal.isOpen, false);
    assert.equal(editor.inserted.length, 1);
    const inserted = editor.inserted[0];
    assert.ok(inserted.endsWith('\n'));
    const lines = inserted.slice(0, -1).split('\n');
    assert.deepEqual(new Set(lines), EXPECTED);
    // The list follows the order the window shows.
    assert.deepEqual(lines.map((line) => line.slice(line.indexOf('`') + 1, -1)), shown);
    assert.deepEqual(network, []);
  });
}

test('the callout format writes one callout titled with the image name', async () => {
  const { plugin, editor, view } = await setUp({ data: { profile: 'full', format: 'callout' } });
  command(plugin, 'scan-image-in-note').editorCallback(editor, view);
  button(await resultWindow(), 'Insert into Inbox').click();
  const [title, ...rest] = editor.inserted[0].slice(0, -1).split('\n');
  assert.equal(title, '> [!info] Codes in mixed.png');
  assert.deepEqual(new Set(rest), new Set([...EXPECTED].map((line) => `> ${line}`)));
});

test('inserting after text on the cursor line starts a new line', async () => {
  const { plugin, editor, view } = await setUp({ lines: ['# Inbox', '', '![[mixed.png]]', 'Codes:'] });
  command(plugin, 'scan-image-in-note').editorCallback(editor, view);
  button(await resultWindow(), 'Insert into Inbox').click();
  assert.ok(editor.inserted[0].startsWith('\n- '));
});

test('Copy writes the same Markdown to the clipboard', async () => {
  const { plugin, editor, view } = await setUp();
  command(plugin, 'scan-image-in-note').editorCallback(editor, view);
  const modal = await resultWindow();
  await button(modal, 'Copy').click();
  await until(() => clipboard.written.length, 'the clipboard');
  assert.deepEqual(new Set(clipboard.written[0].split('\n')), EXPECTED);
  assert.deepEqual(messages(), ['Copied to the clipboard.']);
  assert.deepEqual(editor.inserted, [], 'copying writes nothing into the note');
});

test('a note without an image says so', async () => {
  const { plugin, editor, view } = await setUp({ links: [], lines: ['# Inbox', 'nothing here'] });
  command(plugin, 'scan-image-in-note').editorCallback(editor, view);
  await until(() => messages().length, 'a notice');
  assert.deepEqual(messages(), ['This note has no embedded or linked image.']);
  assert.deepEqual(Modal.opened, []);
});

test('an image link to a file that is not in the vault says so', async () => {
  const { plugin, editor, view } = await setUp({ links: [{ link: 'gone.png', line: 2 }] });
  command(plugin, 'scan-image-in-note').editorCallback(editor, view);
  await until(() => messages().length, 'a notice');
  assert.deepEqual(messages(), ['The image gone.png is not in this vault.']);
});

test('a file that is not an image gives the engine error, and no window', async () => {
  const { plugin, editor, view } = await setUp({
    files: { 'broken.png': new TextEncoder().encode('not a picture') },
    links: [{ link: 'broken.png', line: 2 }],
  });
  command(plugin, 'scan-image-in-note').editorCallback(editor, view);
  await until(() => messages().length, 'a notice');
  const [message] = messages();
  assert.match(message, /^broken\.png could not be read as an image: .*\[QRS-001\]/);
  assert.deepEqual(Modal.opened, []);
  assert.ok(Notice.shown.find((notice) => notice.message === 'Scanning broken.png…').hidden, 'the progress notice is closed');
});

test('an image with no code says so in the window and offers no insert', async () => {
  const blank = blankPng(64, 64);
  const { plugin, editor, view } = await setUp({ files: { 'blank.png': blank }, links: [{ link: 'blank.png', line: 2 }] });
  command(plugin, 'scan-image-in-note').editorCallback(editor, view);
  const modal = await resultWindow();
  assert.equal(modal.contentEl.all('p')[0].text, 'No QR code or barcode was found in blank.png.');
  assert.deepEqual(modal.contentEl.allButtons(), []);
});

test('several images open a picker, the one on the cursor line first', async () => {
  const { plugin, editor, view } = await setUp({
    files: { 'first.png': mixedFixture(), 'attachments/mixed.png': mixedFixture() },
    links: [{ link: 'first.png', line: 0 }, { link: 'mixed.png', line: 3 }, { link: 'first.png', line: 5, embed: false }],
    lines: ['![[first.png]]', '', 'text', '![[mixed.png]]', '', '[[first.png]]'],
    cursor: 3,
  });
  command(plugin, 'scan-image-in-note').editorCallback(editor, view);
  const picker = await until(() => Modal.opened.find((modal) => typeof modal.getSuggestions === 'function'), 'the picker');
  assert.equal(picker.placeholder, 'Choose the image to scan');
  assert.deepEqual(picker.getSuggestions('').map((file) => file.path), ['attachments/mixed.png', 'first.png']);
  assert.deepEqual(picker.getSuggestions('FIRST').map((file) => file.path), ['first.png']);
  const row = new FakeElement('div');
  picker.renderSuggestion(picker.getSuggestions('')[0], row);
  assert.deepEqual(row.children.map((child) => [child.tag, child.text]), [['div', 'mixed.png'], ['small', 'attachments/mixed.png']]);
  picker.onChooseSuggestion(picker.getSuggestions('')[0]);
  const modal = await resultWindow();
  assert.equal(modal.titleEl.text, 'Codes in mixed.png');
});

test('the file menu offers a scan for images only', async () => {
  const { app } = await setUp();
  const forNote = createMenu();
  app.workspace.trigger('file-menu', forNote, app.file('Inbox.md'));
  assert.deepEqual(forNote.items, []);

  const forImage = createMenu();
  app.workspace.trigger('file-menu', forImage, app.file('attachments/mixed.png'));
  assert.equal(forImage.items.length, 1);
  assert.equal(forImage.items[0].title, 'Scan for QR codes and barcodes');
  assert.equal(forImage.items[0].icon, 'qr-code');

  app.workspace.activeView = null;
  forImage.items[0].handler();
  const modal = await resultWindow();
  assert.deepEqual(modal.contentEl.allButtons().map((entry) => entry.text), ['Copy'], 'no note is open, so nothing to insert into');
});

test('"Scan the open image" is offered only when an image is open', async () => {
  const { app, plugin } = await setUp();
  const scanOpen = command(plugin, 'scan-open-image');
  assert.equal(scanOpen.checkCallback(true), false);
  app.workspace.activeFile = app.file('attachments/mixed.png');
  assert.equal(scanOpen.checkCallback(true), true);
  assert.deepEqual(Modal.opened, [], 'checking does not scan');
  scanOpen.checkCallback(false);
  const modal = await resultWindow();
  assert.deepEqual(modal.contentEl.allButtons().map((entry) => entry.text), ['Copy', 'Insert into Inbox']);
});

test('an image removed before the scan gives a notice', async () => {
  const { app, plugin } = await setUp();
  const image = app.file('attachments/mixed.png');
  app.vault.delete(image.path);
  assert.equal(await plugin.scanAndShow(image, null), null);
  assert.deepEqual(messages(), ['The image attachments/mixed.png is no longer in this vault.']);
});

test('the settings tab saves the chosen profile and format', async () => {
  const { plugin } = await setUp({ data: { profile: 'nonsense', format: 42 } });
  assert.deepEqual(plugin.settings, { profile: 'full', format: 'list' });
  const [tab] = plugin.settingTabs;
  tab.display();
  const dropdowns = tab.containerEl.children.flatMap((child) => child.dropdowns);
  assert.deepEqual(dropdowns.map((dropdown) => [dropdown.name, dropdown.value, Object.keys(dropdown.options)]), [
    ['Scan profile', 'full', ['full', 'fast', 'frame']],
    ['Inserted text', 'list', ['list', 'callout']],
  ]);
  await dropdowns[0].select('fast');
  await dropdowns[1].select('callout');
  assert.deepEqual(plugin.saved, { profile: 'fast', format: 'callout' });
});

test('the settings tab declares the same settings for the settings search of Obsidian 1.13', async () => {
  const { plugin } = await setUp({ data: { profile: 'frame', format: 'callout' } });
  const [tab] = plugin.settingTabs;
  const definitions = tab.getSettingDefinitions();
  assert.deepEqual(definitions.map(({ name, control }) => [name, control.type, control.key, control.options, control.defaultValue]), [
    ['Scan profile', 'dropdown', 'profile', { full: 'Full', fast: 'Fast', frame: 'Frame' }, 'full'],
    ['Inserted text', 'dropdown', 'format', { list: 'List', callout: 'Callout' }, 'list'],
  ]);
  assert.deepEqual(definitions.map(({ desc }) => typeof desc === 'string' && desc.length > 0), [true, true]);
  assert.deepEqual(definitions.map(({ control }) => tab.getControlValue(control.key)), ['frame', 'callout']);

  // display(), which Obsidian before 1.13 calls, shows the same names, options and values.
  tab.display();
  const dropdowns = tab.containerEl.children.flatMap((child) => child.dropdowns);
  assert.deepEqual(dropdowns.map((dropdown) => [dropdown.name, dropdown.options, dropdown.value]),
    definitions.map(({ name, control }) => [name, control.options, tab.getControlValue(control.key)]));

  await tab.setControlValue('profile', 'fast');
  await tab.setControlValue('format', 'list');
  assert.deepEqual(plugin.saved, { profile: 'fast', format: 'list' });
  assert.deepEqual(plugin.settings, { profile: 'fast', format: 'list' });
  await tab.setControlValue('profile', 'nonsense');
  assert.deepEqual(plugin.saved, { profile: 'full', format: 'list' }, 'an unknown value is saved as the default');
});
