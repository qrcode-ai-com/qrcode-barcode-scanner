// SPDX-License-Identifier: MIT
// The scanner engine, inlined in the plugin's script by integrations/wasm-inline, started the one
// way UXP is known to run WebAssembly: synchronously. Adobe's WebAssembly sample for UXP calls
// initSync on inlined bytes, and Photoshop 2025 crashed on the asynchronous WebAssembly.compile
// and WebAssembly.instantiate (see the README). UXP documents no worker, so the engine runs on the
// plugin's thread, and every scan has a time budget.
import { INSTALLED } from './polyfills.js';
import { INLINE_MODULE, initInlineSync, scan_frame, scan_image, version } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm';

let started = null;

/** Compile and instantiate the engine once; returns what it is. Throws if the host refuses. */
export function startEngine() {
  if (!started) {
    initInlineSync();
    started = { version: version(), engine: { ...INLINE_MODULE }, polyfills: [...INSTALLED] };
  }
  return started;
}

/** Scan RGBA pixels with a profile and a time budget; returns the engine's report. */
export function scanPixels(rgba, width, height, profile, budgetMs) {
  startEngine();
  return scan_frame(rgba, width, height, profile, budgetMs);
}

/** Scan an encoded image file (PNG, JPEG, WebP or GIF); returns the engine's report. */
export function scanFile(bytes, profile, budgetMs) {
  startEngine();
  return scan_image(bytes, profile, undefined, undefined, budgetMs);
}
