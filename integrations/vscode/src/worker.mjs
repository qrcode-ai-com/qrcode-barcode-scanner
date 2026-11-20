// SPDX-License-Identifier: MIT
// A scan runs synchronously inside the WASM module. It runs in this worker thread so the editor's
// extension host stays responsive, and Cancel can stop it by ending the thread.
import { parentPort, workerData } from 'node:worker_threads';
import { initSync, scan_frame, scan_image, version } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
import { describeError, scanBytes } from './scan-core.mjs';

let ready = null;
try {
  // The package root's initSync takes the bytes the extension read from its own folder; the
  // package's fetch-based loader is never used, so the bundle needs no import.meta.url.
  initSync({ module: workerData.wasm });
  ready = { version: version() };
} catch (error) {
  ready = { error: describeError(error) };
}

parentPort.on('message', (request) => {
  if (ready.error) {
    parentPort.postMessage({ id: request.id, ok: false, error: ready.error, stage: 'load' });
    return;
  }
  try {
    const result = scanBytes({ scan_image, scan_frame }, request.bytes, request);
    parentPort.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    parentPort.postMessage({ id: request.id, ok: false, error: describeError(error), stage: 'scan' });
  }
});
