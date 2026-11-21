// SPDX-License-Identifier: MIT
// The scanner worker. The engine runs here, off the panel's thread, so the panel stays responsive
// while a page is read. scripts/build.mjs bundles this file, with the published engine inlined by
// integrations/wasm-inline, into dist/scanner-worker.js: one classic worker script that loads
// nothing else.
import {
  INLINE_MODULE, initInline, scan_image, version,
} from '@qrcode-ai-com/qrcode-barcode-scanner-wasm';

let ready = null;
const start = () => {
  ready ??= initInline().then(() => version());
  return ready;
};

self.onmessage = async (event) => {
  const { id, type } = event.data ?? {};
  try {
    if (type === 'init') {
      self.postMessage({ id, ok: true, version: await start(), engine: { ...INLINE_MODULE } });
    } else if (type === 'scan') {
      await start();
      const { bytes, profile, budgetMs } = event.data;
      const report = scan_image(new Uint8Array(bytes), profile, undefined, undefined, budgetMs);
      self.postMessage({ id, ok: true, report });
    } else {
      throw new Error(`unknown message ${String(type)}`);
    }
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error?.message ?? error) });
  }
};
