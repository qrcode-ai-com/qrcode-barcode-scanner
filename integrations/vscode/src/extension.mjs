// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { Worker } from 'node:worker_threads';
import {
  IMAGE_EXTENSIONS, MAX_FILE_BYTES, isSupportedImage, label, reportJson, reportLines, scanOptions, summarize,
} from './scan-core.mjs';

export const COMMAND = 'qrcodeBarcodeScanner.scan';
const SECTION = 'qrcodeBarcodeScanner';
const WASM_FILE = 'qrcode-barcode-scanner_bg.wasm';
const READS = 'It reads PNG, JPEG, WebP, GIF and uncompressed BMP files.';

let extensionUri = null;
let output = null;
let wasmBytes = null;
const workers = new Set();

export function activate(context) {
  extensionUri = context.extensionUri;
  output = vscode.window.createOutputChannel('QR Code & Barcode Scanner');
  context.subscriptions.push(output, vscode.commands.registerCommand(COMMAND, scanCommand));
}

export function deactivate() {
  for (const worker of workers) worker.terminate();
  workers.clear();
}

const isUri = (value) => value !== null && typeof value === 'object' && typeof value.scheme === 'string' && typeof value.path === 'string';
const baseName = (uri) => uri.path.split('/').pop() || uri.path;

/** Explorer and editor menus pass the clicked file and the selection; the palette passes nothing. */
async function scanCommand(clicked, selection) {
  let targets = Array.isArray(selection) && selection.some(isUri) ? selection.filter(isUri) : isUri(clicked) ? [clicked] : [];
  if (targets.length === 0) {
    const picked = await vscode.window.showOpenDialog({
      title: 'Choose an image to scan for QR codes and barcodes',
      openLabel: 'Scan',
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
      filters: { Images: IMAGE_EXTENSIONS },
    });
    if (!picked || picked.length === 0) return;
    targets = picked;
  }

  const unsupported = targets.filter((uri) => !isSupportedImage(uri.path));
  if (unsupported.length > 0) {
    const names = unsupported.map(baseName).join(', ');
    void vscode.window.showWarningMessage(`${label(names)} is not an image file this scanner reads. ${READS}`);
    targets = targets.filter((uri) => isSupportedImage(uri.path));
    if (targets.length === 0) return;
  }

  const settings = vscode.workspace.getConfiguration(SECTION, targets[0]);
  const options = scanOptions(settings.get('profile'), settings.get('budgetMs'));
  const outcome = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Scanning for QR codes and barcodes', cancellable: true },
    (progress, token) => scanFiles(targets, options, progress, token),
  );
  await present(outcome);
  return outcome;
}

async function loadWasm() {
  wasmBytes ??= await vscode.workspace.fs.readFile(vscode.Uri.joinPath(extensionUri, 'dist', WASM_FILE));
  return wasmBytes;
}

/** One worker thread per command: it compiles the module once and scans the chosen files in turn. */
function startWorker(wasm) {
  const worker = new Worker(vscode.Uri.joinPath(extensionUri, 'dist', 'worker.js').fsPath, { workerData: { wasm } });
  workers.add(worker);
  const pending = new Map();
  let next = 0;
  let ended = null;
  const failAll = (error) => {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
  };
  worker.on('message', (message) => {
    const waiting = pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    waiting.resolve(message);
  });
  worker.on('error', failAll);
  worker.on('exit', (code) => {
    workers.delete(worker);
    ended = new Error(`the scanner stopped (exit code ${code})`);
    failAll(ended);
  });
  return {
    scan(bytes, options) {
      // After its exit event a worker answers nothing: refuse instead of waiting forever.
      if (ended) return Promise.reject(ended);
      next += 1;
      const id = next;
      // A copy with its own buffer: the file bytes may share a pooled buffer that must not move.
      const own = bytes.slice();
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, bytes: own, ...options }, [own.buffer]);
      });
    },
    stop() {
      workers.delete(worker);
      return worker.terminate();
    },
  };
}

async function scanFiles(targets, options, progress, token) {
  const results = [];
  let session = null;
  const cancelled = () => token.isCancellationRequested;
  const subscription = token.onCancellationRequested(() => session?.stop());
  try {
    session = startWorker(await loadWasm());
    for (const [index, uri] of targets.entries()) {
      if (cancelled()) break;
      const name = vscode.workspace.asRelativePath(uri, false);
      progress.report({ message: targets.length > 1 ? `${index + 1} of ${targets.length}: ${label(baseName(uri))}` : label(baseName(uri)) });
      try {
        const { size } = await vscode.workspace.fs.stat(uri);
        if (size > MAX_FILE_BYTES) throw new Error(`the file is ${Math.ceil(size / 1048576)} MiB; this scanner reads files up to ${MAX_FILE_BYTES / 1048576} MiB`);
        if (size === 0) throw new Error('the file is empty');
        const bytes = await vscode.workspace.fs.readFile(uri);
        if (cancelled()) break;
        const reply = await session.scan(bytes, options);
        if (reply.ok) results.push({ uri, name, result: reply.result });
        else results.push({ uri, name, error: reply.error.message, code: reply.error.code });
      } catch (error) {
        if (cancelled()) break;
        results.push({ uri, name, error: error instanceof Error ? error.message : String(error), code: null });
      }
    }
  } catch (error) {
    // The module could not be read or the worker could not start: nothing was scanned.
    return { options, results, cancelled: cancelled(), failure: error instanceof Error ? error.message : String(error) };
  } finally {
    subscription.dispose();
    await session?.stop();
  }
  return { options, results, cancelled: cancelled(), failure: null };
}

async function present(outcome) {
  const { results, options } = outcome;
  for (const entry of results) {
    output.appendLine('');
    if (entry.result) {
      for (const line of reportLines(entry.name, entry.result)) output.appendLine(line);
    } else {
      output.appendLine(label(entry.name, 4096));
      output.appendLine(`  Not scanned: ${label(entry.error, 4096)}`);
    }
  }
  if (outcome.failure) {
    output.appendLine(`The scanner could not start: ${outcome.failure}`);
    void vscode.window.showErrorMessage(`The QR code and barcode scanner could not start: ${outcome.failure}`);
    return;
  }
  if (outcome.cancelled) {
    void vscode.window.showInformationMessage('Scan cancelled.');
    return;
  }

  const scanned = results.filter((entry) => entry.result);
  const failed = results.filter((entry) => entry.error);
  for (const entry of failed) {
    void vscode.window.showErrorMessage(`Could not scan ${label(baseName(entry.uri))}: ${label(entry.error, 400)}`);
  }
  if (scanned.length === 0) return;
  output.show(true);

  const several = scanned.length > 1;
  const codes = scanned.flatMap((entry) => summarize(entry.result.report).codes.map((code) => ({ ...code, file: baseName(entry.uri) })));
  if (codes.length === 0) {
    const cut = scanned.some((entry) => summarize(entry.result.report).budgetExhausted);
    const where = several ? `${scanned.length} images` : label(baseName(scanned[0].uri));
    const hint = cut ? ' The time budget stopped the scan, so the result may be incomplete.' : '';
    void vscode.window.showInformationMessage(`No QR code or barcode found in ${where} (profile ${options.profile}).${hint}`);
    return;
  }

  const items = codes.map((code) => ({
    label: label(code.text) || '(empty text)',
    description: code.format,
    detail: `${several ? `${label(code.file)} · ` : ''}${code.charset === 'unknown' ? 'The text is not exact: the report holds the original bytes.' : 'Select to copy the text.'}`,
    action: 'copy',
    code,
  }));
  items.push(
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    { label: 'Copy the engine report as JSON', action: 'json' },
    { label: 'Show the scan output', action: 'output' },
  );
  const where = several ? `${scanned.length} images` : label(baseName(scanned[0].uri));
  const picked = await vscode.window.showQuickPick(items, {
    title: `${codes.length === 1 ? '1 code' : `${codes.length} codes`} found in ${where}`,
    placeHolder: 'Select a code to copy its text',
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!picked) return;
  if (picked.action === 'copy') {
    await vscode.env.clipboard.writeText(picked.code.text);
    void vscode.window.showInformationMessage(`Copied the ${picked.code.format} text.`);
  } else if (picked.action === 'json') {
    const reports = scanned.map((entry) => entry.result.report);
    await vscode.env.clipboard.writeText(reportJson(several ? reports : reports[0]));
    void vscode.window.showInformationMessage(several ? `Copied ${reports.length} engine reports as JSON.` : 'Copied the engine report as JSON.');
  } else {
    output.show(false);
  }
}
