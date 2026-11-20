// SPDX-License-Identifier: MIT
// QR Code and Barcode Scanner for Obsidian: reads the codes in an image of the vault with the
// engine bundled into this file, shows them, and writes them into a note only when asked.
import { Editor, MarkdownView, Notice, Plugin, TFile, type MarkdownFileInfo } from 'obsidian';
import { imagesOfNote, isImage } from './images';
import { ImageSuggestModal, ResultModal, type InsertTarget } from './modals';
import { EngineError, scanBytes, UnreadableImageError, type ScanResult } from './scanner';
import { readSettings, ScannerSettingTab, type ScannerSettings } from './settings';

export default class QrBarcodeScannerPlugin extends Plugin {
  settings: ScannerSettings = readSettings(null);

  async onload(): Promise<void> {
    this.settings = readSettings(await this.loadData());
    this.addSettingTab(new ScannerSettingTab(this.app, this));

    this.addCommand({
      id: 'scan-image-in-note',
      name: 'Scan an image in this note',
      editorCallback: (editor: Editor, context: MarkdownView | MarkdownFileInfo) => {
        const note = context.file;
        if (note) void this.scanNote(note, editor);
      },
    });

    this.addCommand({
      id: 'scan-open-image',
      name: 'Scan the open image',
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !isImage(file)) return false;
        if (!checking) void this.scanAndShow(file, this.activeNoteTarget());
        return true;
      },
    });

    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (!(file instanceof TFile) || !isImage(file)) return;
      menu.addItem((item) => item
        .setTitle('Scan for QR codes and barcodes')
        .setIcon('qr-code')
        .onClick(() => { void this.scanAndShow(file, this.activeNoteTarget()); }));
    }));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** The open Markdown editor, as a place to insert into, when there is one. */
  activeNoteTarget(): InsertTarget | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.file) return null;
    return { name: view.file.basename, insert: (markdown) => insertAtCursor(view.editor, markdown) };
  }

  /** The images NOTE embeds or links: one is scanned, several are offered in a list. */
  async scanNote(note: TFile, editor: Editor): Promise<void> {
    const { images, missing } = imagesOfNote(this.app, note, editor.getCursor().line);
    const target: InsertTarget = { name: note.basename, insert: (markdown) => insertAtCursor(editor, markdown) };
    if (images.length === 0) {
      new Notice(missing.length ? `The image ${missing[0]} is not in this vault.` : 'This note has no embedded or linked image.');
      return;
    }
    if (images.length === 1) {
      await this.scanAndShow(images[0], target);
      return;
    }
    new ImageSuggestModal(this.app, images, (file) => { void this.scanAndShow(file, target); }).open();
  }

  /** Reads FILE, scans it with the chosen profile and shows the result. */
  async scanAndShow(file: TFile, target: InsertTarget | null): Promise<ScanResult | null> {
    const result = await this.scanFile(file);
    if (result) new ResultModal(this.app, file, result, this.settings.format, target).open();
    return result;
  }

  async scanFile(file: TFile): Promise<ScanResult | null> {
    const current = this.app.vault.getAbstractFileByPath(file.path);
    if (!(current instanceof TFile)) {
      new Notice(`The image ${file.path} is no longer in this vault.`);
      return null;
    }
    const progress = new Notice(`Scanning ${file.name}…`, 0);
    try {
      const bytes = await this.app.vault.readBinary(current);
      // Let the notice show before the scan holds the thread.
      await new Promise((resolve) => window.setTimeout(resolve, 20));
      return await scanBytes(bytes, this.settings.profile);
    } catch (error) {
      if (error instanceof UnreadableImageError) new Notice(`${file.name} could not be read as an image: ${error.message}`);
      else if (error instanceof EngineError) new Notice(`The scanner could not start: ${error.message}`);
      else new Notice(`${file.name} could not be read: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      progress.hide();
    }
  }
}

/** Inserts MARKDOWN at the cursor, on lines of its own. */
export function insertAtCursor(editor: Editor, markdown: string): void {
  const cursor = editor.getCursor();
  const before = editor.getLine(cursor.line).slice(0, cursor.ch);
  editor.replaceSelection(`${before.trim() ? '\n' : ''}${markdown}\n`);
}
