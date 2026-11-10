import { defineConfig } from 'vite';

export default defineConfig({
  // The scanner package finds its .wasm file next to its own modules, through import.meta.url.
  // A copy pre-bundled by the dev server would not be next to that file, so leave it as it is.
  optimizeDeps: {
    exclude: ['@qrcode-ai-com/qrcode-barcode-scanner-wasm'],
  },
  // The worker is a module worker in the built page too.
  worker: {
    format: 'es',
  },
});
