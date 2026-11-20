// SPDX-License-Identifier: MIT
// The result window and the image picker. Decoded text is set as element text, never as HTML,
// and nothing in it is opened.
import { App, Modal, Notice, Setting, SuggestModal, TFile } from 'obsidian';
import { codesMarkdown, formatLabel, type InsertFormat } from './format';
import type { ScanResult } from './scanner';

export interface InsertTarget {
  /** The note the text goes into, named in the button. */
  name: string;
  insert: (markdown: string) => void;
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    new Notice('Copied to the clipboard.');
  } catch {
    new Notice('The clipboard is not available here.');
  }
}

export class ResultModal extends Modal {
  constructor(app: App, readonly image: TFile, readonly result: ScanResult, readonly format: InsertFormat, readonly target: InsertTarget | null) {
    super(app);
  }

  onOpen(): void {
    const { codes, budgetExhausted, profile } = this.result;
    this.titleEl.setText(`Codes in ${this.image.name}`);
    this.contentEl.empty();
    this.contentEl.addClass('qrcode-barcode-scanner-result');
    if (codes.length === 0) {
      this.contentEl.createEl('p', { text: `No QR code or barcode was found in ${this.image.name}.` });
    } else {
      const list = this.contentEl.createEl('ul', { cls: 'qrcode-barcode-scanner-codes' });
      for (const code of codes) {
        const item = list.createEl('li');
        item.createSpan({ cls: 'qrcode-barcode-scanner-format', text: formatLabel(code.symbology) });
        item.createEl('code', { cls: 'qrcode-barcode-scanner-text', text: code.text });
        if (!code.complete) item.createSpan({ cls: 'qrcode-barcode-scanner-note', text: 'Some bytes could not be read as text.' });
      }
    }
    if (budgetExhausted) {
      this.contentEl.createEl('p', {
        cls: 'qrcode-barcode-scanner-note',
        text: `The ${profile} profile ran out of time before the scan ended. Choose the full profile in the settings to search longer.`,
      });
    }
    if (codes.length === 0) return;
    const markdown = codesMarkdown(codes, this.image.name, this.format);
    const actions = new Setting(this.contentEl);
    actions.addButton((button) => button.setButtonText('Copy').onClick(() => { void copy(markdown); }));
    const target = this.target;
    if (target) {
      actions.addButton((button) => button.setButtonText(`Insert into ${target.name}`).setCta().onClick(() => {
        target.insert(markdown);
        this.close();
      }));
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ImageSuggestModal extends SuggestModal<TFile> {
  constructor(app: App, readonly images: TFile[], readonly choose: (file: TFile) => void) {
    super(app);
    this.setPlaceholder('Choose the image to scan');
  }

  getSuggestions(query: string): TFile[] {
    const needle = query.toLowerCase();
    return this.images.filter((file) => file.path.toLowerCase().includes(needle));
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createDiv({ text: file.name });
    el.createEl('small', { text: file.path });
  }

  onChooseSuggestion(file: TFile): void {
    this.choose(file);
  }
}
