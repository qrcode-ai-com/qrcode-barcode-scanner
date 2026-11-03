// scan_frame on the installed package for the overlay witnesses. The budget is passed as given:
// 0 is unbounded, null is the profile's own default. The reply carries the SHA-256 of the bytes
// this worker received, taken before the engine reads them: the exact detector input.
import { createScannerLoader } from '@supernovae-st/qrcode-ai-scanner-wasm/auto';

const load = createScannerLoader();
const hex = buffer => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');

self.onmessage = async ({ data }) => {
  try {
    const scanner = await load();
    const view = data.rgba;
    const pixels = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    const sha256 = hex(await crypto.subtle.digest('SHA-256', pixels));
    const started = performance.now();
    const result = scanner.scan_frame(pixels, data.width, data.height, data.profile, data.budgetMs);
    self.postMessage({ id: data.id, ok: true, sha256, callMs: performance.now() - started, result,
      version: scanner.version() });
  } catch (error) {
    self.postMessage({ id: data.id, ok: false, name: error.name, code: error.code ?? null,
      message: error.message });
  }
};
