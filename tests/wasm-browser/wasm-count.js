// Counts every WebAssembly instance this worker creates and times compilation and
// instantiation. worker.js imports this module first, so the wrappers are installed before
// any scanner module is evaluated, even one that kept a reference to the originals.
const wasm = WebAssembly;
const original = { compile: wasm.compile, compileStreaming: wasm.compileStreaming,
  instantiate: wasm.instantiate, instantiateStreaming: wasm.instantiateStreaming,
  Instance: wasm.Instance };
const log = { instantiations: 0, compile: [], instantiate: [] };
const notify = () => {
  if (typeof self.postMessage === 'function') {
    self.postMessage({ type: 'instantiation', count: log.instantiations });
  }
};
// Times one asynchronous WebAssembly call; a rejected call is recorded too, then rethrown.
const timed = (list, call) => {
  const startedAt = performance.now();
  const settle = ok => { list.push({ ok, startedAt, ms: performance.now() - startedAt }); };
  return call().then(value => { settle(true); return value; },
    error => { settle(false); throw error; });
};
// Every request for a new instance counts, at the moment it is made, whatever its outcome.
const instantiation = (list, call) => {
  log.instantiations += 1;
  notify();
  return timed(list, call);
};
wasm.compile = function compile(...args) {
  return timed(log.compile, () => original.compile.apply(wasm, args));
};
if (typeof original.compileStreaming === 'function') {
  wasm.compileStreaming = function compileStreaming(...args) {
    return timed(log.compile, () => original.compileStreaming.apply(wasm, args));
  };
}
wasm.instantiate = function instantiate(...args) {
  return instantiation(log.instantiate, () => original.instantiate.apply(wasm, args));
};
if (typeof original.instantiateStreaming === 'function') {
  wasm.instantiateStreaming = function instantiateStreaming(...args) {
    return instantiation(log.instantiate, () => original.instantiateStreaming.apply(wasm, args));
  };
}
// The synchronous path (new WebAssembly.Instance) counts as well; instanceof keeps working
// because the proxy forwards prototype to the real constructor.
wasm.Instance = new Proxy(original.Instance, {
  construct(target, args, newTarget) {
    log.instantiations += 1;
    notify();
    const startedAt = performance.now();
    const instance = Reflect.construct(target, args, newTarget === wasm.Instance ? target : newTarget);
    log.instantiate.push({ ok: true, startedAt, ms: performance.now() - startedAt });
    return instance;
  },
});

/** A plain copy of what this worker has instantiated and compiled so far. */
export function wasmLog() {
  return { instantiations: log.instantiations, compile: log.compile.map(entry => ({ ...entry })),
    instantiate: log.instantiate.map(entry => ({ ...entry })) };
}
