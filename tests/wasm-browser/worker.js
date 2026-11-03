// First import: it wraps WebAssembly before the scanner modules below are evaluated.
import { wasmLog } from './wasm-count.js';
import { createScannerLoader, scannerCapabilities } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/auto';
let load;
// Resource timing of the .wasm fetches this worker made (the loader fetches in the worker).
const wasmResources = () => performance.getEntriesByType('resource')
  .filter(entry => /\.wasm(?:\?|$)/.test(entry.name))
  .map(({ startTime, responseStart, responseEnd, duration, transferSize, encodedBodySize, decodedBodySize }) =>
    ({ startTime, responseStart, responseEnd, duration, transferSize: transferSize ?? null,
      encodedBodySize: encodedBodySize ?? null, decodedBodySize: decodedBodySize ?? null }));
self.onmessage = async ({ data }) => {
  let phase = 'initialization';
  try {
    load ??= createScannerLoader({ variant: data.variant ?? 'auto', wasmUrl: data.wasmUrl });
    const scanner = await load();
    phase = 'scan';
    const loaded = { variant: scanner.variant, version: scanner.version(), capabilities: scannerCapabilities(),
      instantiations: wasmLog().instantiations };
    if (data.type === 'stats') {
      self.postMessage({ id: data.id, ok: true, ...loaded, wasm: wasmLog(), resources: wasmResources() });
      return;
    }
    if (data.type === 'scan_frame') {
      const view = data.rgba;
      const pixels = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      // The bytes as they arrived, before the engine reads them.
      const received = { byteLength: pixels.byteLength,
        probes: (data.probe ?? []).map(offset => Array.from(pixels.subarray(offset, offset + 4))) };
      if (data.hang) for (;;) { /* a frame the decoder never finishes */ }
      const profile = data.profile ?? 'frame';
      const started = performance.now();
      const result = scanner.scan_frame(pixels, data.width, data.height, profile, data.budgetMs ?? 0);
      self.postMessage({ id: data.id, ok: true, method: 'scan_frame', profile, callMs: performance.now() - started,
        result, received, ...loaded });
      return;
    }
    const started = performance.now();
    const result = data.bytes
      ? scanner.scan_image(new Uint8Array(data.bytes), data.profile ?? 'full', undefined, undefined, data.budgetMs ?? 0,
        data.skipAxes, data.skipChecks)
      : null;
    self.postMessage({ id: data.id, ok: true, result, method: data.bytes ? 'scan_image' : null,
      callMs: performance.now() - started, ...loaded });
  } catch (error) {
    self.postMessage({ id: data.id, ok: false, phase, code: error.code ?? null,
      variant: error.variant ?? null, name: error.name, message: error.message,
      status: error.status ?? null, method: data.type ?? (data.bytes ? 'scan_image' : null),
      instantiations: wasmLog().instantiations,
      nativeError: error.cause ? { name: error.cause.name, message: error.cause.message } : null });
  }
};
