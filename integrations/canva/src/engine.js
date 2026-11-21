// SPDX-License-Identifier: MIT
// The engine, inlined in app.js by integrations/wasm-inline at build time: the import below is
// served by that build step, so no .wasm file is fetched and the bundle stays one file.
import {
  INLINE_MODULE, initInline, scan_image, version,
} from '@qrcode-ai-com/qrcode-barcode-scanner-wasm';

export const ENGINE = INLINE_MODULE;

let loading = null;

/** Compile the inlined module once, asynchronously, so the compile does not hold the panel's thread. */
export function load() {
  loading ??= initInline().then(() => version());
  return loading;
}

/** Scan encoded image bytes with a profile and a time budget; the engine's report. */
export function scan(bytes, profile, budgetMs) {
  return scan_image(bytes, profile, undefined, undefined, budgetMs);
}
