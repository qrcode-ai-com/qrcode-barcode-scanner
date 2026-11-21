// The scanner engine, the same code in a module worker and on the page. It loads the
// WebAssembly module bundled in this plugin through the package's own loader; the module is
// fetched from the site that serves the plugin, and nothing goes to any other server.
//
//   load()                      -> { version }
//   scan(bytes, profile)        -> { report, ms }
//
// Every scan runs with no time budget (budget_ms 0): the report is final, never cut short.
import { createScannerLoader } from '../vendor/qrcode-barcode-scanner-wasm/auto.js';
import { PROFILES } from './results.js';

// One attempt for the life of this realm; the page starts a new worker to retry.
const loader = createScannerLoader();

export async function load() {
  const scanner = await loader();
  return { version: scanner.version() };
}

export async function scan(bytes, profile) {
  if (!PROFILES.includes(profile)) throw new TypeError('unknown profile');
  if (!(bytes instanceof Uint8Array)) throw new TypeError('bytes must be a Uint8Array');
  const scanner = await loader();
  const started = performance.now();
  const report = scanner.scan_image(bytes, profile, undefined, undefined, 0);
  return { report, ms: performance.now() - started };
}

/** A failure as plain data that a worker can post: name, message, loader code and QRS code. */
export function describe(error) {
  const object = error !== null && typeof error === 'object';
  const message = object && error.message !== undefined ? String(error.message) : String(error);
  const qrs = /\[(QRS-\d{3})\]/.exec(message);
  const cause = object && error.cause && typeof error.cause === 'object' ? error.cause : null;
  return {
    name: object && error.name ? String(error.name) : 'Error',
    message,
    code: object && typeof error.code === 'string' ? error.code : null,
    qrs: qrs ? qrs[1] : null,
    cause: cause ? `${cause.name || 'Error'}: ${cause.message || ''}` : null,
  };
}
