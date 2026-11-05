// A module worker that owns one scanner for the page that starts it. It knows nothing about
// that page: the image example and a camera page can share it. Start it with
//   new Worker(new URL('./scanner.worker.js', import.meta.url), { type: 'module' })
// and post requests { id, type, ... }. Every request gets one reply carrying the same id:
//   { id, type: 'load' }
//     -> { id, type, ok: true, version, variant, runtime, capabilities }
//        runtime: what this browser supports, { wasm, simd, baseline } (scannerCapabilities()
//        of ../auto.js); capabilities: the readers compiled into the loaded module,
//        { versions, engines, symbologies } (its capabilities()).
//   { id, type: 'scan_image', bytes, profile, budgetMs }
//     -> { id, type, ok: true, report, ms }   bytes: the encoded image (an ArrayBuffer or a view)
//   { id, type: 'scan_frame', rgba, width, height, profile, budgetMs }
//     -> { id, type, ok: true, report, ms }   rgba: width * height * 4 bytes, row by row
// profile is a profile name and budgetMs a number of milliseconds (0: no time budget); either
// may be left out. When a request fails, the reply is { id, type, ok: false, phase, error }
// where phase is 'load' (the scanner could not load), 'scan' (the engine refused the call or
// its input, or stopped) or 'request' (the message itself is malformed). Transfer a large buffer
// instead of copying it: postMessage(request, [bytes]) for an ArrayBuffer, [bytes.buffer] for a
// typed array, which is not transferable itself. The transfer detaches the whole buffer, with
// every view on it. Requests run one at a time, in the order they arrive.
import { createScannerLoader, scannerCapabilities } from '../auto.js';

// One loader for the life of this worker: every request shares its single attempt, a failure
// included. Terminating the worker and starting a new one is the explicit retry.
let load = null;

const QRS_CODE = /\[(QRS-\d{3})\]/;

// An error rebuilt from plain fields: an Error object does not keep its own fields (code,
// status, cause) across postMessage in every browser.
function describe(error) {
  const object = error !== null && typeof error === 'object';
  const message = object && error.message !== undefined ? String(error.message) : String(error);
  const qrs = QRS_CODE.exec(message);
  const cause = object && error.cause !== undefined && error.cause !== null ? error.cause : null;
  return {
    name: object && error.name ? String(error.name) : 'Error',
    message,
    // A loader failure names its stable code (ScannerInitError); a scan fault ends with [QRS-xxx].
    code: object && typeof error.code === 'string' ? error.code : null,
    qrs: qrs ? qrs[1] : null,
    status: object && typeof error.status === 'number' ? error.status : null,
    cause: cause === null ? null : {
      name: typeof cause === 'object' && cause.name ? String(cause.name) : 'Error',
      message: typeof cause === 'object' && cause.message !== undefined
        ? String(cause.message) : String(cause),
    },
  };
}

function malformed(text) {
  const error = new TypeError(text);
  error.malformed = true;
  return error;
}

function bytesOf(value, what) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw malformed(`${what} must be an ArrayBuffer or a typed array`);
}

// An option of the wrong type is a malformed request: the binding would coerce it (a budget
// given as text becomes NaN, which means no time budget) or fail with an unrelated error.
function optional(value, kind, what) {
  if (value !== undefined && typeof value !== kind) {
    throw malformed(`${what} must be a ${kind} when given`);
  }
  return value;
}

function scan(scanner, message) {
  const profile = optional(message.profile, 'string', `${message.type} profile`);
  const budgetMs = optional(message.budgetMs, 'number', `${message.type} budgetMs`);
  if (message.type === 'scan_image') {
    const bytes = bytesOf(message.bytes, 'scan_image bytes');
    return scanner.scan_image(bytes, profile, undefined, undefined, budgetMs);
  }
  const rgba = bytesOf(message.rgba, 'scan_frame rgba');
  return scanner.scan_frame(rgba, message.width, message.height, profile, budgetMs);
}

self.onmessage = async (event) => {
  const message = event.data !== null && typeof event.data === 'object' ? event.data : {};
  const { id, type } = message;
  let phase = 'request';
  try {
    if (type !== 'load' && type !== 'scan_image' && type !== 'scan_frame') {
      throw malformed(`unknown request type ${JSON.stringify(type)}`);
    }
    phase = 'load';
    if (load === null) load = createScannerLoader();
    const scanner = await load();
    if (type === 'load') {
      self.postMessage({ id, type, ok: true, version: scanner.version(), variant: scanner.variant,
        runtime: scannerCapabilities(), capabilities: scanner.capabilities() });
      return;
    }
    phase = 'scan';
    const started = performance.now();
    const report = scan(scanner, message);
    self.postMessage({ id, type, ok: true, report, ms: performance.now() - started });
  } catch (error) {
    const malformedRequest = error !== null && typeof error === 'object'
      && error.malformed === true;
    self.postMessage({ id, type, ok: false, phase: malformedRequest ? 'request' : phase,
      error: describe(error) });
  }
};
