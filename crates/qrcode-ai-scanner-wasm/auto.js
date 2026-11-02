// Import-safe on servers. Capability checks run in the caller's realm, including
// a module Worker. The SIMD probe (a small real i8x16.splat / i8x16.popcnt
// module) is diagnostic only: the one portable module needs no SIMD.
const SIMD_PROBE = new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]);
// Conservative supported baseline: mutable globals, multivalue, bulk memory,
// sign extension, nontrapping conversions and reference types. This probe is
// not the artifact's minimum requirement; inspect its bytes separately. The
// README records the probe's WAT and actual binary feature-omission evidence.
const BASELINE_PROBE = new Uint8Array([0,97,115,109,1,0,0,0,1,6,1,96,0,2,127,127,3,2,1,0,4,4,1,112,0,1,5,3,1,0,1,6,6,1,127,1,65,0,11,7,5,1,1,103,3,0,10,37,1,35,0,65,0,192,26,68,0,0,0,0,0,0,0,0,252,2,26,65,0,65,0,65,0,252,10,0,0,208,112,26,65,0,65,0,11]);

/** Stable loader failures, separate from scan_image's existing QRS errors. */
export class ScannerInitError extends Error {
  constructor(code, variant, cause, status) {
    super(`Scanner initialization failed: ${code}`);
    this.name = 'ScannerInitError';
    this.code = code;
    this.variant = variant;
    if (status !== undefined) this.status = status;
    if (cause !== undefined) this.cause = cause;
  }
}

/** No user-agent checks and no scanner compilation or network access. */
export function scannerCapabilities() {
  const wasm = typeof WebAssembly === 'object' && typeof WebAssembly.validate === 'function';
  let simd = false;
  let baseline = false;
  if (wasm) {
    try { simd = WebAssembly.validate(SIMD_PROBE); baseline = WebAssembly.validate(BASELINE_PROBE); } catch { /* unavailable in this realm */ }
  }
  return { wasm, simd, baseline };
}

/** One bounded attempt per loader. Success, failure and concurrent callers share
 * the same Promise. An explicit user retry may create a fresh loader; there is
 * no automatic download retry or switch after an unidentified failure.
 * One portable module (no SIMD) serves every supported engine: `variant` only
 * accepts 'auto', 'portable' and 'compatible', the pre-0.11 name of this same
 * feature set. There is no SIMD module to request. */
export function createScannerLoader({ variant = 'auto', wasmUrl } = {}) {
  let pending;
  return () => pending ??= (async () => {
    if (!['auto', 'portable', 'compatible'].includes(variant)) throw new ScannerInitError('invalid_options', null);
    const selected = 'portable';
    const capabilities = scannerCapabilities();
    if (!capabilities.wasm) throw new ScannerInitError('wasm_unavailable', selected);
    if (!capabilities.baseline) throw new ScannerInitError('wasm_features_unsupported', selected);
    // A literal URL/import lets Vite and similar bundlers retain and rewrite the
    // one asset; nothing is fetched before this call.
    let mod;
    try { mod = await import('./qrcode-ai-scanner.js'); }
    catch (cause) { throw new ScannerInitError('loader_import_failed', selected, cause); }
    const url = wasmUrl ?? new URL('./qrcode-ai-scanner_bg.wasm', import.meta.url);
    let response;
    try { response = await fetch(url); }
    catch (cause) { throw new ScannerInitError('asset_network_failed', selected, cause); }
    if (!response.ok) throw new ScannerInitError('asset_http_failed', selected, undefined, response.status);
    let bytes;
    try { bytes = await response.arrayBuffer(); }
    catch (cause) { throw new ScannerInitError('asset_read_failed', selected, cause); }
    let module;
    try { module = await WebAssembly.compile(bytes); }
    catch (cause) {
      // Known feature probes passed. Keep the original native exception; do not
      // turn CSP/compiler faults into a claim about the engine or the user's CPU.
      const header = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 8));
      const validHeader = header.length === 8 && [0,97,115,109,1,0,0,0].every((byte,index) => header[index] === byte);
      const code = !validHeader ? 'binary_invalid'
        : WebAssembly.validate(bytes) ? 'wasm_compile_failed' : 'wasm_validation_failed';
      throw new ScannerInitError(code, selected, cause);
    }
    try { await mod.default({ module_or_path: module }); }
    catch (cause) { throw new ScannerInitError('wasm_instantiate_failed', selected, cause); }
    return Object.freeze({ ...mod, variant: selected });
  })();
}

export const loadScanner = createScannerLoader();
