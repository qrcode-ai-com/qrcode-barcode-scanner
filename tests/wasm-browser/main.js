import { createScannerLoader, scannerCapabilities } from '@supernovae-st/qrcode-ai-scanner-wasm/auto';
import { createCameraHarness } from './camera-harness.js';
// Imports ./camera-overlay at page load: the runner checks that this asks for no camera.
import { createOverlayHarness } from './overlay-harness.js';
const workers = [];
// Every instantiation any worker of this page reported, in arrival order; a terminated
// worker's count stays here.
const instantiations = [];
function startWorker(variant = 'auto', wasmUrl) {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  workers.push(worker);
  const serial = workers.length;
  let id = 0;
  const pending = new Map();
  worker.onmessage = ({ data }) => {
    if (data.type === 'instantiation') { instantiations.push({ worker: serial, count: data.count }); return; }
    pending.get(data.id)?.resolve(data); pending.delete(data.id);
  };
  worker.onerror = () => { for (const item of pending.values()) item.resolve({ ok: false, phase: 'worker', code: 'worker_failed' }); pending.clear(); };
  return { serial, request: (options = {}, transfer = []) => new Promise(resolve => {
    const next = ++id; pending.set(next, { resolve }); worker.postMessage({ ...options, id: next, variant, wasmUrl }, transfer);
  }), stop: () => worker.terminate() };
}
window.harness = {
  scannerCapabilities, startWorker,
  instantiations: () => instantiations.map(entry => ({ ...entry })),
  camera: createCameraHarness({ startWorker, instantiations: () => instantiations.length }),
  overlay: createOverlayHarness(),
  async mainLoad(variant = 'auto') {
    const load = createScannerLoader({ variant });
    const a = load(), b = load();
    const scanner = await a;
    return { samePromise: a === b, variant: scanner.variant, version: scanner.version(), capabilities: scannerCapabilities() };
  },
  stop() { workers.forEach(worker => worker.terminate()); }
};
