// A module worker that owns one scanner for the page that starts it, so a long scan never
// freezes the page. It loads the WebAssembly module packaged in the extension, next to the
// package's own loader; nothing is fetched from the network.
//
//   { id, type: 'load' }                       -> { id, ok: true, version, capabilities }
//   { id, type: 'scan', bytes, profile }       -> { id, ok: true, report, ms }
//   any failure                                -> { id, ok: false, phase, error }
//
// Every scan runs with no time budget (budget_ms 0): the report is final, never cut short.
import { createScannerLoader } from './vendor/qrcode-barcode-scanner-wasm/auto.js';

const PROFILES = ['fast', 'frame', 'full'];
// One attempt for the life of the worker; the page starts a new worker to retry.
const load = createScannerLoader();

function describe(error) {
  const object = error !== null && typeof error === 'object';
  const message = object && error.message !== undefined ? String(error.message) : String(error);
  const qrs = /\[(QRS-\d{3})\]/.exec(message);
  return {
    name: object && error.name ? String(error.name) : 'Error',
    message,
    code: object && typeof error.code === 'string' ? error.code : null,
    qrs: qrs ? qrs[1] : null,
  };
}

self.onmessage = async (event) => {
  const message = event.data !== null && typeof event.data === 'object' ? event.data : {};
  const { id, type } = message;
  let phase = 'load';
  try {
    if (type !== 'load' && type !== 'scan') throw new TypeError(`unknown request ${String(type)}`);
    const scanner = await load();
    if (type === 'load') {
      self.postMessage({ id, ok: true, version: scanner.version(),
        capabilities: scanner.capabilities() });
      return;
    }
    phase = 'scan';
    if (!PROFILES.includes(message.profile)) throw new TypeError('unknown profile');
    if (!(message.bytes instanceof ArrayBuffer)) {
      throw new TypeError('bytes must be an ArrayBuffer');
    }
    const started = performance.now();
    const report = scanner.scan_image(new Uint8Array(message.bytes), message.profile,
      undefined, undefined, 0);
    self.postMessage({ id, ok: true, report, ms: performance.now() - started });
  } catch (error) {
    self.postMessage({ id, ok: false, phase, error: describe(error) });
  }
};
