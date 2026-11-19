// SPDX-License-Identifier: MIT
// A small stand-in for the `obsidian` module and the app, with the parts this plugin uses. It
// records what the plugin shows (notices, windows, buttons) and what it writes (editor text).
// It runs in Node and in a browser page, so it uses no Node API.

export class FakeElement {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.text = '';
    this.classes = new Set();
    this.buttons = [];
    this.dropdowns = [];
  }

  createEl(tag, options = {}) {
    const element = new FakeElement(tag);
    if (options.text !== undefined) element.text = String(options.text);
    if (options.cls) element.classes.add(options.cls);
    this.children.push(element);
    return element;
  }

  createDiv(options) { return this.createEl('div', options); }
  createSpan(options) { return this.createEl('span', options); }
  setText(text) { this.text = String(text); }
  empty() { this.children = []; this.text = ''; this.buttons = []; this.dropdowns = []; }
  addClass(name) { this.classes.add(name); }

  get textContent() {
    return this.text + this.children.map((child) => child.textContent).join('');
  }

  all(tag) {
    return this.children.flatMap((child) => [...(child.tag === tag ? [child] : []), ...child.all(tag)]);
  }

  allButtons() {
    return [...this.buttons, ...this.children.flatMap((child) => child.allButtons())];
  }
}

export class Notice {
  static shown = [];
  constructor(message, timeout) {
    this.message = String(message);
    this.timeout = timeout;
    this.hidden = false;
    Notice.shown.push(this);
  }
  hide() { this.hidden = true; }
}

export class Modal {
  static opened = [];
  constructor(app) {
    this.app = app;
    this.titleEl = new FakeElement('h2');
    this.contentEl = new FakeElement('div');
    this.isOpen = false;
  }
  open() { this.isOpen = true; Modal.opened.push(this); this.onOpen?.(); }
  close() { this.isOpen = false; this.onClose?.(); }
}

export class SuggestModal extends Modal {
  setPlaceholder(text) { this.placeholder = text; }
}

class ButtonComponent {
  setButtonText(text) { this.text = text; return this; }
  setCta() { this.cta = true; return this; }
  onClick(handler) { this.handler = handler; return this; }
  click() { return this.handler?.(); }
}

class DropdownComponent {
  constructor() { this.options = {}; }
  addOptions(options) { Object.assign(this.options, options); return this; }
  setValue(value) { this.value = value; return this; }
  onChange(handler) { this.handler = handler; return this; }
  async select(value) { this.value = value; await this.handler?.(value); }
}

export class Setting {
  constructor(containerEl) {
    this.settingEl = containerEl.createDiv({ cls: 'setting-item' });
  }
  setName(name) { this.name = name; this.settingEl.createSpan({ text: name }); return this; }
  setDesc(desc) { this.desc = desc; return this; }
  addButton(callback) { const button = new ButtonComponent(); callback(button); this.settingEl.buttons.push(button); return this; }
  addDropdown(callback) { const dropdown = new DropdownComponent(); dropdown.name = this.name; callback(dropdown); this.settingEl.dropdowns.push(dropdown); return this; }
}

export class TAbstractFile {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').pop();
  }
}

export class TFile extends TAbstractFile {
  constructor(path) {
    super(path);
    const dot = this.name.lastIndexOf('.');
    this.basename = dot > 0 ? this.name.slice(0, dot) : this.name;
    this.extension = dot > 0 ? this.name.slice(dot + 1) : '';
  }
}

export class MarkdownView {
  constructor(file, editor) { this.file = file; this.editor = editor; }
}

export class Plugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this.commands = [];
    this.events = [];
    this.settingTabs = [];
    this.saved = undefined;
  }
  addCommand(command) { this.commands.push(command); return command; }
  registerEvent(ref) { this.events.push(ref); }
  addSettingTab(tab) { this.settingTabs.push(tab); }
  async loadData() { return this.app.pluginData ?? null; }
  async saveData(data) { this.saved = JSON.parse(JSON.stringify(data)); }
}

export class PluginSettingTab {
  constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = new FakeElement('div'); }
}

export const Platform = { isMobile: false, isDesktopApp: true };

/** An editor over LINES with the cursor at the end of line CURSOR_LINE. */
export class FakeEditor {
  constructor(lines, cursorLine = lines.length - 1) {
    this.lines = [...lines];
    this.cursor = { line: cursorLine, ch: this.lines[cursorLine].length };
    this.inserted = [];
  }
  getCursor() { return { ...this.cursor }; }
  getLine(line) { return this.lines[line] ?? ''; }
  replaceSelection(text) { this.inserted.push(text); }
}

/** An app over FILES ({ path: bytes }) with NOTES ({ path: [{ link, line, embed }] }). */
export function createApp({ files = {}, notes = {} } = {}) {
  const entries = new Map(Object.entries(files).map(([path, bytes]) => [path, { file: new TFile(path), bytes }]));
  for (const path of Object.keys(notes)) if (!entries.has(path)) entries.set(path, { file: new TFile(path), bytes: new Uint8Array() });
  const handlers = {};
  const app = {
    pluginData: null,
    vault: {
      getAbstractFileByPath: (path) => entries.get(path)?.file ?? null,
      async readBinary(file) {
        const entry = entries.get(file.path);
        if (!entry) throw new Error(`ENOENT: ${file.path}`);
        return entry.bytes.buffer.slice(entry.bytes.byteOffset, entry.bytes.byteOffset + entry.bytes.byteLength);
      },
      delete(path) { entries.delete(path); },
    },
    metadataCache: {
      getFileCache(file) {
        const references = notes[file.path];
        if (!references) return null;
        const cache = { embeds: [], links: [] };
        references.forEach(({ link, line, embed = true }, index) => {
          const position = { start: { line, col: 0, offset: index * 100 }, end: { line, col: 10, offset: index * 100 + 10 } };
          (embed ? cache.embeds : cache.links).push({ link, original: `![[${link}]]`, position });
        });
        return cache;
      },
      getFirstLinkpathDest(linkpath, sourcePath) {
        void sourcePath;
        for (const { file } of entries.values()) if (file.path === linkpath || file.name === linkpath) return file;
        return null;
      },
    },
    workspace: {
      activeFile: null,
      activeView: null,
      getActiveFile() { return this.activeFile; },
      getActiveViewOfType(type) { return this.activeView instanceof type ? this.activeView : null; },
      on(name, handler) { (handlers[name] ??= []).push(handler); return { name }; },
      trigger(name, ...args) { for (const handler of handlers[name] ?? []) handler(...args); },
    },
    file: (path) => entries.get(path)?.file ?? null,
  };
  return app;
}

/** A menu for the file-menu event, collecting its items. */
export function createMenu() {
  const items = [];
  return {
    items,
    addItem(callback) {
      const item = { setTitle(t) { this.title = t; return this; }, setIcon(i) { this.icon = i; return this; }, onClick(h) { this.handler = h; return this; } };
      callback(item);
      items.push(item);
      return this;
    },
  };
}

export function reset() {
  Notice.shown = [];
  Modal.opened = [];
}
