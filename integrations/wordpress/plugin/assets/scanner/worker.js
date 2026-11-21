// A module worker that owns one scanner for the page that starts it, so a long scan never
// freezes the page.
//
//   { id, type: 'load' }                   -> { id, ok: true, version }
//   { id, type: 'scan', bytes, profile }   -> { id, ok: true, report, ms }
//   any failure                            -> { id, ok: false, phase, error }
import { describe, load, scan } from './engine.js';

self.onmessage = async (event) => {
  const message = event.data !== null && typeof event.data === 'object' ? event.data : {};
  const { id, type } = message;
  let phase = 'load';
  try {
    if (type !== 'load' && type !== 'scan') throw new TypeError(`unknown request ${String(type)}`);
    const loaded = await load();
    if (type === 'load') {
      self.postMessage({ id, ok: true, ...loaded });
      return;
    }
    phase = 'scan';
    if (!(message.bytes instanceof ArrayBuffer)) throw new TypeError('bytes must be an ArrayBuffer');
    const done = await scan(new Uint8Array(message.bytes), message.profile);
    self.postMessage({ id, ok: true, ...done });
  } catch (error) {
    self.postMessage({ id, ok: false, phase, error: describe(error) });
  }
};
