// SPDX-License-Identifier: MIT
// The scanner's state and the Canva calls it makes, apart from React so the unit tests can drive
// it with fake Canva functions. It listens to the image selection, and on a scan it reads the
// selected images' original files through temporary URLs and scans them on this thread: Canva's
// content security policy allows WebAssembly ('wasm-unsafe-eval') but no worker.
import { ImageReadError, readImage } from './image.js';
import { PROFILES, combinedState } from './results.js';

// Each scan may run this long before the engine stops it and says so. The scan holds the panel's
// thread meanwhile.
export const BUDGET_MS = 20000;
// The first images of a larger selection are read.
export const MAX_IMAGES = 5;

const pause = () => new Promise((done) => { setTimeout(done, 30); });

/**
 * `canva` holds `selection` (from @canva/design) and `getTemporaryUrl` (from @canva/asset);
 * `engine` holds `load()` and `scan(bytes, profile, budgetMs)`.
 */
export function createScanner({ canva, engine, fetchImpl = (...args) => fetch(...args) }) {
  let state = {
    phase: 'loading', // loading | ready | scanning | result | empty | inconclusive | error
    selected: 0,
    scan: 0,
    profile: null,
    items: [],
    error: null, // { kind, detail }
    engineVersion: null,
  };
  let latest = null;
  const listeners = new Set();
  const set = (change) => {
    state = { ...state, ...change };
    for (const listener of listeners) listener();
  };

  const stop = canva.selection.registerOnChange({
    scope: 'image',
    onChange: (event) => {
      latest = event;
      set({ selected: event.count });
    },
  });

  const loaded = (async () => {
    try {
      const version = await engine.load();
      set({ phase: 'ready', engineVersion: version });
      return true;
    } catch (error) {
      set({ phase: 'error', error: { kind: 'engine', detail: String(error?.message ?? error) } });
      return false;
    }
  })();

  async function readOne(ref, profile) {
    try {
      const { url } = await canva.getTemporaryUrl({ type: 'image', ref });
      const { bytes, format } = await readImage(url, fetchImpl);
      await pause(); // let the panel paint "scanning" before the engine holds the thread
      const started = Date.now();
      const report = engine.scan(bytes, profile, BUDGET_MS);
      return { format, bytes: bytes.length, ms: Date.now() - started, report, error: null };
    } catch (error) {
      const kind = error instanceof ImageReadError ? error.kind : 'scan';
      const detail = error instanceof ImageReadError ? error.detail : String(error?.message ?? error);
      return { format: null, bytes: null, ms: null, report: null, error: { kind, detail } };
    }
  }

  async function scan(profile) {
    if (!PROFILES.includes(profile)) throw new TypeError(`unknown profile ${profile}`);
    if (!(await loaded)) return;
    const number = state.scan + 1;
    if (!latest || state.selected === 0) {
      set({ scan: number, profile, phase: 'error', items: [], error: { kind: 'no-selection' } });
      return;
    }
    set({ scan: number, profile, phase: 'scanning', items: [], error: null });
    let refs;
    try {
      const draft = await latest.read();
      refs = draft.contents.map((content) => content.ref).slice(0, MAX_IMAGES);
    } catch (error) {
      set({ phase: 'error', error: { kind: 'selection', detail: String(error?.message ?? error) } });
      return;
    }
    if (refs.length === 0) {
      set({ phase: 'error', error: { kind: 'no-selection' } });
      return;
    }
    const items = [];
    for (const ref of refs) items.push(await readOne(ref, profile));
    const phase = combinedState(items);
    set({ phase, items, error: phase === 'error' ? items[0].error : null });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    scan,
    loaded,
    dispose() {
      if (typeof stop === 'function') stop();
      listeners.clear();
    },
  };
}
