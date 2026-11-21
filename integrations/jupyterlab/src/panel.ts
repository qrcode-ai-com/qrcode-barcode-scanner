// The scanner panel. It reads an image the user chooses, or one of the file browser, and scans it in
// this browser tab with the WebAssembly engine bundled in the extension. No image and no result
// leaves the page: the only requests are for the extension's own files and, for a file of the file
// browser, the Jupyter server's contents API that already serves that file to this tab.
//
// The panel follows the page contract of the engine's destination acceptance
// (distribution/acceptance/README.md): #file, #profile, #result with data-state and data-scan, and
// the last report as JSON text in #report-json. It never builds markup from a decoded value and
// never opens a decoded link.
import { Widget } from '@lumino/widgets';
import { createScannerLoader, type LoadedScanner } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/auto';
import enginePackage from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/package.json';
import buildInfo from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/build-info.json';

import { qrsCode, summarize } from './report';

const PROFILES: [string, string][] = [
  ['fast', 'fast: made for uploads, with a reduced quality score'],
  ['frame', 'frame: made for camera frames, with no quality score'],
  ['full', 'full: the deepest search and the full quality score'],
];
// 0 removes the time budget: every scan runs to its end.
const BUDGET_MS = 0;
const SITE = 'https://qrcode-ai.com/en-US';
const LINKS: [string, [string, string][]][] = [
  ['Try the scanner on the web', [['QR code scanner', `${SITE}/qr-code-scanner`],
    ['Barcode scanner', `${SITE}/barcode-scanner`]]],
  ['JupyterLab guide', [['for QR codes', `${SITE}/qr-code-scanner/integrations/jupyterlab`],
    ['for barcodes', `${SITE}/barcode-scanner/integrations/jupyterlab`]]],
  ['Create a code', [['QR code generator', `${SITE}/qr-code-generator`],
    ['Barcode generator', `${SITE}/barcode-generator`]]],
];
const SOURCE = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/jupyterlab';

// One loader for the page: the module is fetched and compiled once, on the first panel.
const load = createScannerLoader();

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function fact(list: HTMLElement, term: string, id: string, value: string): HTMLElement {
  const row = element('div');
  const definition = element('dd', value, 'jp-qrscan-mono');
  definition.id = id;
  row.append(element('dt', term), definition);
  list.append(row);
  return definition;
}

export class ScannerPanel extends Widget {
  private readonly file: HTMLInputElement;
  private readonly profile: HTMLSelectElement;
  private readonly result: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly score: HTMLElement;
  private readonly detections: HTMLOListElement;
  private readonly details: HTMLDetailsElement;
  private readonly reportJson: HTMLPreElement;
  private readonly engineVersion: HTMLElement;
  private chosen: { name: string; bytes: Uint8Array } | null = null;
  private scans = 0;
  private scanner: LoadedScanner | null = null;

  constructor() {
    super();
    this.addClass('jp-qrscan-panel');
    this.id = 'qrcode-barcode-scanner-panel';
    this.title.label = 'QR Code & Barcode Scanner';
    this.title.caption = 'Read the QR codes and barcodes of an image, in this browser';
    this.title.closable = true;
    const root = this.node;

    const intro = element('section', '', 'jp-qrscan-intro');
    intro.append(element('h2', 'QR Code & Barcode Scanner'), element('p',
      'Choose an image, or right-click one in the file browser, to read every QR code and barcode in '
      + 'it. The open-source engine runs in this browser tab as WebAssembly: the image is read here, '
      + 'and nothing is sent to the Jupyter server or anywhere else.'));
    for (const [label, pair] of LINKS) {
      const line = element('p', `${label} · `, 'jp-qrscan-links');
      pair.forEach(([text, href], index) => {
        const link = element('a', text);
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        line.append(link);
        if (index === 0) line.append(' · ');
      });
      intro.append(line);
    }

    const input = element('section', '', 'jp-qrscan-input');
    const fileLabel = element('label', 'Image (PNG, JPEG, WebP or GIF)');
    this.file = element('input');
    this.file.id = 'file';
    this.file.type = 'file';
    this.file.accept = 'image/png,image/jpeg,image/webp,image/gif';
    fileLabel.htmlFor = 'file';
    const profileLabel = element('label', 'Scan profile');
    this.profile = element('select');
    this.profile.id = 'profile';
    profileLabel.htmlFor = 'profile';
    for (const [value, text] of PROFILES) {
      const option = element('option', text);
      option.value = value;
      this.profile.append(option);
    }
    input.append(fileLabel, this.file, profileLabel, this.profile, element('p',
      'Every scan runs without a time budget. A large image with the full profile can keep this tab '
      + 'busy for a few seconds.', 'jp-qrscan-muted'));

    const output = element('section', '', 'jp-qrscan-output');
    this.result = element('div');
    this.result.id = 'result';
    this.result.dataset.state = 'loading';
    this.result.dataset.scan = '0';
    this.summary = element('p', 'Loading the scanner…');
    this.summary.id = 'summary';
    this.summary.setAttribute('role', 'status');
    this.summary.setAttribute('aria-live', 'polite');
    this.score = element('p');
    this.score.hidden = true;
    this.detections = element('ol', '', 'jp-qrscan-detections');
    this.result.append(this.summary, this.score, this.detections);
    this.details = element('details');
    this.details.hidden = true;
    this.reportJson = element('pre', '', 'jp-qrscan-mono');
    this.reportJson.id = 'report-json';
    this.reportJson.dataset.scan = '0';
    this.details.append(element('summary', "The engine's full report (JSON)"), this.reportJson);
    output.append(element('h3', 'Result'), this.result, this.details);

    const about = element('section', '', 'jp-qrscan-about');
    const list = element('dl');
    fact(list, 'npm package', 'package-name', String(enginePackage.name));
    fact(list, 'Package version', 'package-version', String(enginePackage.version));
    fact(list, 'WASM SHA-256', 'wasm-sha256', String((buildInfo as { wasm?: { sha256?: string } }).wasm?.sha256 ?? ''));
    this.engineVersion = fact(list, 'Engine version', 'engine-version', 'not loaded yet');
    const source = element('a', 'Source code');
    source.href = SOURCE;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    const sourceLine = element('p', '', 'jp-qrscan-muted');
    sourceLine.append(source, ' · MIT for the extension, AGPL-3.0-or-later for the bundled engine 0.11.0.');
    about.append(element('h3', 'What runs here'), list, sourceLine);

    root.append(intro, input, output, about);

    this.file.addEventListener('change', () => {
      const chosen = this.file.files?.[0];
      if (chosen) void chosen.arrayBuffer().then((buffer) => this.scanBytes(chosen.name, new Uint8Array(buffer)));
    });
    this.profile.addEventListener('change', () => {
      if (this.chosen) void this.scanBytes(this.chosen.name, this.chosen.bytes);
    });
    void this.loadScanner();
  }

  /** Scan BYTES, named NAME, with the selected profile: a file of the browser or of the server. */
  async scanBytes(name: string, bytes: Uint8Array): Promise<void> {
    this.chosen = { name, bytes };
    this.scans += 1;
    const serial = this.scans;
    const profile = this.profile.value;
    this.present('scanning', `Scanning ${name} with the ${profile} profile…`);
    const scanner = await this.loadScanner();
    if (scanner === null || serial !== this.scans) return;
    // Let the page paint the scanning state: the scan itself runs on this thread.
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    if (serial !== this.scans) return;
    let report;
    try {
      report = scanner.scan_image(bytes, profile, undefined, undefined, BUDGET_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = qrsCode(message);
      this.present('error', code
        ? `Input error (${code}): the scanner refused ${name}. ${message}`
        : `Scanner fault: the scanner stopped while scanning ${name}. Reload the page before scanning again. ${message}`);
      return;
    }
    const view = summarize(report, name, profile);
    this.present(view.state, view.text, report, view.score, view.rows);
  }

  private async loadScanner(): Promise<LoadedScanner | null> {
    if (this.scanner) return this.scanner;
    try {
      this.scanner = await load();
      this.engineVersion.textContent = this.scanner.version();
      if (this.result.dataset.state === 'loading') this.present('ready', 'The scanner is ready. Choose an image.');
      return this.scanner;
    } catch (error) {
      const code = (error as { code?: string }).code ?? 'unknown';
      this.present('error', `Loading error (${code}): the scanner did not load, so nothing was scanned. `
        + 'A content security policy that forbids WebAssembly blocks it. Reload the page to try again.');
      return null;
    }
  }

  private present(state: string, text: string, report: unknown = null, score: string | null = null,
    rows: { symbology: string; text: string; kind: string }[] = []): void {
    this.result.dataset.state = state;
    this.result.dataset.scan = String(this.scans);
    this.summary.textContent = text;
    this.score.hidden = score === null;
    this.score.textContent = score ?? '';
    this.detections.replaceChildren(...rows.map((row) => {
      const item = element('li');
      item.append(element('span', `${row.symbology} · ${row.kind}`, 'jp-qrscan-format'),
        element('pre', row.text, 'jp-qrscan-value'));
      return item;
    }));
    this.details.hidden = report === null;
    this.reportJson.textContent = report === null ? '' : JSON.stringify(report, null, 2);
    this.reportJson.dataset.scan = String(this.scans);
    this.reportJson.dataset.profile = this.profile.value;
  }
}
