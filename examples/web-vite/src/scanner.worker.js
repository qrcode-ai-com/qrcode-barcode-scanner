// A module worker that owns one scanner. The page posts { id, type: 'load' } once, then
// { id, type: 'scan', bytes, profile } for each image, and gets one reply with the same id:
//   { id, ok: true, version, variant }             after 'load'
//   { id, ok: true, report, ms }                   after 'scan'
//   { id, ok: false, phase, error }                phase: 'load' or 'scan'
// Scanning in a worker keeps the page responsive while an image is decoded.
import { createScannerLoader } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/auto';

// One loader for the life of this worker. It fetches and compiles the WebAssembly module once.
const load = createScannerLoader();

// 0 removes the time budget: every scan runs to its end.
const BUDGET_MS = 0;

function describe(error) {
  const message = error && error.message !== undefined ? String(error.message) : String(error);
  const qrs = /\[(QRS-\d{3})\]/.exec(message);
  return {
    name: error && error.name ? String(error.name) : 'Error',
    message,
    // A loading failure carries a stable code; a refused input ends with [QRS-xxx].
    code: error && typeof error.code === 'string' ? error.code : null,
    qrs: qrs ? qrs[1] : null,
  };
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  let phase = 'load';
  try {
    const scanner = await load();
    if (type === 'load') {
      self.postMessage({ id, ok: true, version: scanner.version(), variant: scanner.variant });
      return;
    }
    phase = 'scan';
    const started = performance.now();
    const report = scanner.scan_image(new Uint8Array(data.bytes), data.profile, undefined,
      undefined, BUDGET_MS);
    self.postMessage({ id, ok: true, report, ms: performance.now() - started });
  } catch (error) {
    self.postMessage({ id, ok: false, phase, error: describe(error) });
  }
};
