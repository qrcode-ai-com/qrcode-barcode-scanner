// Camera witnesses on the installed package. The page drives createCameraScanner over a
// canvas.captureStream() video through one worker, as an application would, and returns plain
// records; the runner judges them against the fixtures. Nothing here asserts an expected value.
import { createCameraScanner, createDetectionTracker } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/camera';

const pngBitmap = bytes => createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));

// A white canvas showing a fixture image at (x, y), drawn 1:1, repainted every 30 ms. A grey
// block in the top-left corner changes on every paint, far from the code: each painted frame
// is a new frame for the frame callback and for the timer path's pixel hash.
function createScene({ width, height, image = null, x = 0, y = 0 }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  let tick = 0;
  const paint = () => {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    if (image) context.drawImage(image, x, y);
    const level = 40 + (tick++ % 8) * 20;
    context.fillStyle = `rgb(${level},${level},${level})`;
    context.fillRect(0, 0, 48, 24);
  };
  paint();
  const timer = setInterval(paint, 30);
  const stream = canvas.captureStream();
  return { canvas, stream, stop() { clearInterval(timer); stream.getTracks().forEach(track => track.stop()); } };
}

function createVideo() {
  const video = document.createElement('video');
  video.width = 160;
  document.body.append(video);
  return video;
}

// One decoder lifecycle at a time: a worker whose loader instantiates the scanner once.
// scanFrame posts the frame with its pixel buffer transferred. It never settles while the
// worker still holds the frame: on abort it terminates the worker first, then rejects.
// replace() ends this lifecycle and starts the next one, as the controller's recover asks.
// An explicit stop followed by a new decoder is a new lifecycle too: each witness below
// starts its own, and only the shared image-and-camera lifecycle has its instantiations counted.
function createDecoder(startWorker, hooks = {}) {
  const decoder = { worker: startWorker(), lifecycles: 1, hangNext: false, origin: new WeakMap(), calls: [] };
  decoder.ready = async () => {
    const reply = await decoder.worker.request();
    if (!reply.ok) throw new Error(`decoder initialization failed: ${reply.code} ${reply.message}`);
    return reply;
  };
  decoder.scanFrame = (rgba, width, height, { signal }) => new Promise((resolve, reject) => {
    const worker = decoder.worker, hang = decoder.hangNext;
    decoder.hangNext = false;
    const onAbort = () => { worker.stop(); reject(signal.reason); };
    if (signal.aborted) { onAbort(); return; }
    signal.addEventListener('abort', onAbort, { once: true });
    const pixels = hooks.unwrap ? hooks.unwrap(rgba) : rgba;
    // No budget (0 = unbounded): a slow runner cannot cut a frame, so every record depends only
    // on which engine and path answered, never on the frame budget.
    const reply = worker.request({ type: 'scan_frame', rgba: pixels, width, height, profile: 'frame', hang,
      probe: hooks.probe }, [pixels.buffer]);
    if (hooks.posted) hooks.posted(rgba, pixels);
    reply.then(response => {
      signal.removeEventListener('abort', onAbort);
      decoder.calls.push({ worker: worker.serial, ok: response.ok, method: response.method ?? null,
        callMs: response.callMs ?? null, received: response.received ?? null, message: response.message ?? null });
      if (!response.ok) { reject(new Error(response.message)); return; }
      decoder.origin.set(response.result, { method: response.method, profile: response.profile, worker: worker.serial,
        instantiations: response.instantiations, callMs: response.callMs });
      resolve(response.result);
    });
  });
  decoder.replace = async () => {
    decoder.worker.stop();
    decoder.worker = startWorker();
    decoder.lifecycles += 1;
    await decoder.ready();
  };
  return decoder;
}

const geometryOf = geometry => geometry && { kind: geometry.kind, points: geometry.points,
  measured: geometry.measured ?? null, reader: geometry.reader ?? null };

// What one onResult call saw, as plain data.
function summarize(decoder, report, frame, snapshot) {
  const origin = decoder.origin.get(report) ?? null;
  return {
    at: performance.now(),
    origin: origin && { method: origin.method, profile: origin.profile, worker: origin.worker,
      instantiations: origin.instantiations, callMs: origin.callMs },
    frame: { width: frame.width, height: frame.height, videoWidth: frame.videoWidth, videoHeight: frame.videoHeight,
      source: frame.source, epoch: frame.epoch, sequence: frame.sequence, decoderGeneration: frame.decoderGeneration,
      observedAt: frame.observedAt, decodeStartedAt: frame.decodeStartedAt, completedAt: frame.completedAt },
    score: report.score === null ? null : 'present',
    budgetExhausted: report.trace.budget_exhausted ?? null,
    detections: report.detections.map(detection => ({ symbology: detection.symbology, content: detection.content,
      occurrences: (detection.occurrences ?? []).map(occurrence => geometryOf(occurrence.geometry)) })),
    snapshot: snapshot && { status: snapshot.status, tracks: snapshot.tracks.map(track => ({ id: track.id,
      state: track.state, basis: track.basis, content: track.detection.content, geometry: geometryOf(track.geometry) })) },
  };
}

// The witnesses that judge tracker geometry give the decoder and the tracker windows wider than
// any frame time: with the defaults (geometry withheld once a frame completes 1200 ms after its
// observation, identity kept 2000 ms), a slow runner would fail them for its speed alone. A
// frame that completes before the decode timeout keeps its geometry, and the identity outlasts
// the gap it leaves; the runner checks the frame clock itself and records the slowest frame.
const SLOW_RUNNER_WINDOWS = { decodeTimeoutMs: 8000, tracker: { staleMs: 8000, reacquireMs: 10000 } };

// Starts one controller with a tracker and records every result, state change and error.
// until() resolves once its predicate holds and rejects on a new error or after timeoutMs,
// with the controller's state in the message, so a stalled camera fails instead of hanging.
function startCamera({ video, decoder, stream, options = {}, trackerOptions = {} }) {
  const run = { results: [], states: [], errors: [], startedAt: null };
  let wake = () => {};
  const tracker = createDetectionTracker(trackerOptions);
  const controller = createCameraScanner({
    video, tracker, scanFrame: decoder.scanFrame,
    recover: () => decoder.replace(),
    onResult(report, frame, snapshot) { run.results.push(summarize(decoder, report, frame, snapshot)); wake(); },
    onError(error) { run.errors.push({ code: error.code, message: error.message }); wake(); },
    onState(change) {
      run.states.push({ state: change.state, previous: change.previous, reason: change.reason,
        error: change.error ? change.error.code : null, decoderGeneration: change.decoderGeneration });
      wake();
    },
    mediaDevices: { getUserMedia: async () => stream },
    intervalMs: 20, ...options });
  run.controller = controller;
  run.until = (predicate, label, timeoutMs = 60000) => new Promise((resolve, reject) => {
    const known = run.errors.length;
    const fail = reason => {
      clearTimeout(deadline);
      wake = () => {};
      reject(new Error(`${label}: ${reason}; state ${controller.state}, ${run.results.length} results, ` +
        `errors ${JSON.stringify(run.errors)}, states ${JSON.stringify(run.states)}`));
    };
    const deadline = setTimeout(() => fail(`no result after ${timeoutMs} ms`), timeoutMs);
    wake = () => {
      if (predicate()) { clearTimeout(deadline); wake = () => {}; resolve(); }
      else if (run.errors.length > known) fail('the session reported an error');
    };
    wake();
  });
  run.start = async () => { run.startedAt = performance.now(); await controller.start(); };
  run.stop = () => { controller.stop(); tracker.destroy(); video.remove(); };
  return run;
}

export function createCameraHarness({ startWorker, instantiations }) {
  let lifecycle = null;
  return {
    // One decoder lifecycle shared by an image scan and the camera: one worker, so one loader,
    // first scans an image with scan_image (the cold load happens there), then serves every
    // camera frame with scan_frame. The page keeps running for lifecycleRecover().
    async lifecycleStart({ imageBytes, sceneBytes, width, height, x, y, frames }) {
      const decoder = createDecoder(startWorker);
      const imageStarted = performance.now();
      const image = await decoder.worker.request({ bytes: imageBytes });
      const imageRoundTripMs = performance.now() - imageStarted;
      if (!image.ok) throw new Error(`scan_image failed: ${image.code} ${image.message}`);
      const scene = createScene({ width, height, image: await pngBitmap(sceneBytes), x, y });
      const run = startCamera({ video: createVideo(), decoder, stream: scene.stream,
        options: { decodeTimeoutMs: SLOW_RUNNER_WINDOWS.decodeTimeoutMs }, trackerOptions: SLOW_RUNNER_WINDOWS.tracker });
      lifecycle = { decoder, scene, run };
      await run.start();
      await run.until(() => run.results.length >= frames, `${frames} camera frames`);
      const results = run.results.slice(0, frames);
      const stats = await decoder.worker.request({ type: 'stats' });
      return {
        image: { method: image.method, callMs: image.callMs, roundTripMs: imageRoundTripMs,
          instantiations: image.instantiations, contents: image.result.detections.map(detection => detection.content) },
        startedAt: run.startedAt, firstResultMs: results[0].at - run.startedAt, results,
        stats: { instantiations: stats.instantiations, wasm: stats.wasm, resources: stats.resources },
        instantiations: instantiations(), lifecycles: decoder.lifecycles,
        states: run.states.slice(), errors: run.errors.slice(),
      };
    },
    // Hangs the next frame in the worker. The decode timeout aborts it, the adapter terminates
    // that worker and the controller's recover starts a new one: a new decoder lifecycle,
    // which loads and instantiates the scanner once more.
    async lifecycleRecover({ frames }) {
      const { decoder, scene, run } = lifecycle;
      lifecycle = null;
      const before = run.results.length, generation = run.controller.decoderGeneration;
      decoder.hangNext = true;
      const later = () => run.results.slice(before).filter(result => result.frame.decoderGeneration > generation);
      try {
        await run.until(() => later().length >= frames, `${frames} frames after recovery`);
        return { generation, results: later().slice(0, frames), instantiations: instantiations(),
          lifecycles: decoder.lifecycles, states: run.states.slice(), errors: run.errors.slice() };
      } finally {
        run.stop();
        scene.stop();
        decoder.worker.stop();
      }
    },
    // Exact bytes from the capture canvas to the worker. A canvas stands in for the video
    // element: drawImage copies its pixels without the colour conversion a video pipeline may
    // apply, so a difference in what the worker receives can only come from the capture path
    // (channel order, a flip, an offset). It has no frame callback, so this runs the timer path.
    async exactBytes({ width, height, background, pixels, probe }) {
      const source = document.createElement('canvas');
      source.width = width;
      source.height = height;
      const context = source.getContext('2d');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      for (const { x, y, rgba } of pixels) {
        const pixel = context.createImageData(1, 1);
        pixel.data.set(rgba);
        context.putImageData(pixel, x, y);
      }
      Object.defineProperties(source, { readyState: { value: 4 }, videoWidth: { value: width },
        videoHeight: { value: height }, play: { value: () => Promise.resolve() }, pause: { value: () => {} } });
      const decoder = createDecoder(startWorker, { probe });
      try {
        await decoder.ready();
        const run = startCamera({ video: source, decoder, stream: { getTracks: () => [] } });
        await run.start();
        await run.until(() => run.results.length >= 1, 'first frame of the canvas source');
        run.stop();
        return { received: decoder.calls[0].received, frame: run.results[0].frame, errors: run.errors.slice() };
      } finally {
        decoder.worker.stop();
      }
    },
    // A fixture code at a known offset in a larger video, captured under maxDimension.
    async mapping({ sceneBytes, width, height, x, y, maxDimension, frames }) {
      const scene = createScene({ width, height, image: await pngBitmap(sceneBytes), x, y });
      const decoder = createDecoder(startWorker);
      try {
        await decoder.ready();
        const run = startCamera({ video: createVideo(), decoder, stream: scene.stream,
          options: { maxDimension, decodeTimeoutMs: SLOW_RUNNER_WINDOWS.decodeTimeoutMs },
          trackerOptions: SLOW_RUNNER_WINDOWS.tracker });
        await run.start();
        const decoded = () => run.results.filter(result => result.detections.length > 0);
        await run.until(() => decoded().length >= frames, `${frames} decoded frames of the ${width}x${height} scene`);
        run.stop();
        return { startedAt: run.startedAt, results: decoded().slice(0, frames), errors: run.errors.slice() };
      } finally {
        scene.stop();
        decoder.worker.stop();
      }
    },
    // scan_frame's own length and dimension checks in the browser worker, beside a control
    // frame of the exact length.
    async frameErrors({ width, height }) {
      const worker = startWorker();
      const ask = (length, frameWidth) => worker.request({ type: 'scan_frame',
        rgba: new Uint8ClampedArray(length).fill(255), width: frameWidth, height });
      const plain = reply => ({ ok: reply.ok, phase: reply.phase ?? null, message: reply.message ?? null,
        detections: reply.ok ? reply.result.detections.length : null });
      try {
        return { exact: plain(await ask(width * height * 4, width)),
          short: plain(await ask(width * height * 4 - 1, width)), zeroWidth: plain(await ask(0, 0)) };
      } finally {
        worker.stop();
      }
    },
    // Copies and buffer lifetime on an instrumented canvas. Every getImageData of a canvas
    // other than the scene's is counted, and its pixel array is handed out behind a proxy that
    // counts each access: one made before the frame's transfer is a read or copy on the way
    // to the worker, one made after it is a read of a buffer the worker now owns. The adapter
    // unwraps the proxy without touching it and transfers the real buffer.
    async transfer({ sceneBytes, width, height, x, y, frames }) {
      const scene = createScene({ width, height, image: await pngBitmap(sceneBytes), x, y });
      const prototype = CanvasRenderingContext2D.prototype, original = prototype.getImageData;
      const copies = [], handed = [], wrapped = new WeakMap(), canvases = new Set();
      let latest = null;
      prototype.getImageData = function getImageData(...args) {
        const image = original.apply(this, args);
        if (this.canvas === scene.canvas) return image;
        canvases.add(this.canvas);
        const copy = { byteLength: image.data.byteLength, transferred: false, readsBefore: 0, readsAfter: 0 };
        const touch = () => { if (copy.transferred) copy.readsAfter += 1; else copy.readsBefore += 1; };
        const data = new Proxy(image.data, {
          get(target, key) { touch(); return Reflect.get(target, key, target); },
          has(target, key) { touch(); return Reflect.has(target, key); },
          set(target, key, value) { touch(); return Reflect.set(target, key, value, target); },
          ownKeys(target) { touch(); return Reflect.ownKeys(target); },
          getOwnPropertyDescriptor(target, key) { touch(); return Reflect.getOwnPropertyDescriptor(target, key); },
        });
        wrapped.set(data, { real: image.data, copy });
        copies.push(copy);
        latest = data;
        return { width: image.width, height: image.height, data };
      };
      const decoder = createDecoder(startWorker, {
        unwrap(rgba) {
          const entry = wrapped.get(rgba);
          handed.push({ identical: entry !== undefined && rgba === latest, copiesBefore: copies.length,
            byteLengthBefore: entry ? entry.real.byteLength : null, byteLengthAfter: null, bufferByteLengthAfter: null });
          return entry ? entry.real : rgba;
        },
        posted(rgba, pixels) {
          const entry = wrapped.get(rgba);
          if (entry) entry.copy.transferred = true;
          Object.assign(handed[handed.length - 1], { byteLengthAfter: pixels.byteLength,
            bufferByteLengthAfter: pixels.buffer.byteLength });
        },
      });
      try {
        await decoder.ready();
        const run = startCamera({ video: createVideo(), decoder, stream: scene.stream });
        await run.start();
        await run.until(() => run.results.length >= frames, `${frames} instrumented frames`);
        run.stop();
        // A late read of a transferred buffer (a settled frame, a stop) would land here.
        await new Promise(resolve => setTimeout(resolve, 250));
        return { source: run.results[0].frame.source, canvases: canvases.size,
          copies: copies.map(copy => ({ ...copy })), handed: handed.map(entry => ({ ...entry })), errors: run.errors.slice() };
      } finally {
        prototype.getImageData = original;
        scene.stop();
        decoder.worker.stop();
      }
    },
  };
}
