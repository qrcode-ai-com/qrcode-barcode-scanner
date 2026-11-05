// Overlay witnesses on the installed package. Scenes run frame by frame: the page composes each
// frame from fixture images, a module worker reads it with scan_frame, and the shipped tracker
// and overlay take the report on one fake clock, so every time in a scene is chosen by the
// runner. The effects witness drives the shipped camera controller instead. The page returns
// plain records; the runner judges them against fixtures/consumer-truth.json. Nothing here
// asserts an expected value. Importing this module opens no camera and starts no worker.
import { createCameraScanner, createDetectionTracker } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/camera';
import {
  createCameraOverlay, projectOverlayGeometry, quadOutline,
} from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/camera-overlay';

// The scene clock starts here; a step's `at` is relative to it.
const START = 10_000;
// The modelled decode time of every scene frame: the tracker takes the report this much later.
const DECODE_MS = 40;

// Timers fire only when the clock is moved past them, in time order, then creation order.
function createFakeClock(start) {
  let now = start, serial = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout(callback, ms) {
      serial += 1;
      timers.set(serial, { at: now + Math.max(0, Number(ms) || 0), callback });
      return serial;
    },
    clearTimeout(handle) { timers.delete(handle); },
    advanceTo(to) {
      for (;;) {
        let next = null;
        for (const [handle, timer] of timers) {
          if (timer.at <= to && (next === null || timer.at < next.timer.at)) next = { handle, timer };
        }
        if (next === null) break;
        timers.delete(next.handle);
        now = Math.max(now, next.timer.at);
        next.timer.callback();
      }
      now = Math.max(now, to);
    },
  };
}

const decode = bytes => createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));

async function decodeImages(images) {
  const entries = await Promise.all(Object.entries(images).map(async ([key, bytes]) => [key, await decode(bytes)]));
  return Object.fromEntries(entries);
}

// White, then each layer: a whole image at (x, y) and scale, a crop [sx, sy, sw, sh] of it, or
// the image under an affine matrix [a, b, c, d, e, f]; then an optional grey patch whose level
// makes otherwise equal frames differ.
function paint(context, width, height, layers, bitmaps, patch = null) {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  for (const layer of layers) {
    const image = bitmaps[layer.image];
    if (!image) throw new Error(`no image ${layer.image}`);
    if (layer.matrix) {
      context.setTransform(...layer.matrix);
      context.drawImage(image, 0, 0);
      context.setTransform(1, 0, 0, 1, 0, 0);
    } else if (layer.crop) {
      const [sx, sy, sw, sh] = layer.crop, scale = layer.scale ?? 1;
      context.drawImage(image, sx, sy, sw, sh, layer.x, layer.y, sw * scale, sh * scale);
    } else {
      const scale = layer.scale ?? 1;
      context.drawImage(image, layer.x, layer.y, image.width * scale, image.height * scale);
    }
  }
  if (patch !== null) {
    context.fillStyle = `rgb(${patch},${patch},${patch})`;
    context.fillRect(0, 0, 48, 24);
  }
}

// The smallest rectangle [x, y, w, h] in frame px that holds every dark pixel (R + G + B below
// 384) of a composed frame, or null when it has none: where the fixture's code was drawn,
// measured before the worker reads the frame and whatever the scanner reports.
function inkBox(rgba, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = 4 * (y * width + x);
      if (rgba[i] + rgba[i + 1] + rgba[i + 2] < 384) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : [left, top, right + 1 - left, bottom + 1 - top];
}

function canvasOf(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) };
}

// One module worker per page, started on first use and kept.
let frameWorker = null;
function frameScanner() {
  if (frameWorker) return frameWorker;
  const worker = new Worker(new URL('./overlay-worker.js', import.meta.url), { type: 'module' });
  const pending = new Map();
  let serial = 0;
  worker.onmessage = ({ data }) => { pending.get(data.id)?.(data); pending.delete(data.id); };
  worker.onerror = event => {
    for (const settle of pending.values()) settle({ ok: false, name: 'WorkerError', message: event.message });
    pending.clear();
  };
  frameWorker = {
    scan(rgba, width, height, profile, budgetMs) {
      return new Promise(resolve => {
        serial += 1;
        pending.set(serial, resolve);
        worker.postMessage({ id: serial, rgba, width, height, profile, budgetMs }, [rgba.buffer]);
      });
    },
  };
  return frameWorker;
}

// ------------------------------------------------------------------------- plain records

const plainReport = (result, sha256) => ({
  sha256, versions: result.versions,
  score: result.score === null ? null : { value: result.score.value },
  trace: { budget_exhausted: result.trace.budget_exhausted, saturation: result.trace.saturation },
  detections: result.detections.map(detection => ({ symbology: detection.symbology,
    content: detection.content, occurrences: detection.occurrences ?? [] })),
});

const plainGeometry = geometry => geometry && { kind: geometry.kind, points: geometry.points,
  measured: geometry.measured, precise: geometry.precise, restart: geometry.restart };

const plainSnapshot = snapshot => snapshot && {
  status: snapshot.status, rejection: snapshot.rejection, epoch: snapshot.epoch, now: snapshot.now,
  frame: snapshot.frame,
  tracks: snapshot.tracks.map(track => ({ id: track.id, slot: track.slot, state: track.state,
    basis: track.basis, resultId: track.resultId, symbology: track.detection.symbology,
    text: track.detection.content.text, geometry: plainGeometry(track.geometry) })),
  results: snapshot.results.map(result => ({ id: result.id, symbology: result.detection.symbology,
    text: result.detection.content.text, present: result.present, trackIds: result.trackIds })),
  events: snapshot.events.map(event => ({ type: event.type, trackId: event.trackId ?? null,
    reason: event.reason ?? null })),
};

const visible = el => Boolean(el) && el.getClientRects().length > 0;
const textOf = (scope, selector) => {
  const el = scope && scope.querySelector(selector);
  return el ? el.textContent : null;
};

// What the document shows: every target group (its own shapes, badges left out), the effects
// region, the rail entries and the readout.
function readDom(container, rail, readout) {
  const root = container.querySelector(':scope > [data-qr-camera-overlay]');
  const targets = root ? Array.from(root.querySelectorAll('g.qr-camera-target')).map(g => {
    const own = selector => Array.from(g.querySelectorAll(selector)).filter(el => !el.closest('.qr-camera-badge'));
    return {
      id: g.getAttribute('data-target-id'), drawn: g.getAttribute('data-drawn'),
      color: g.getAttribute('data-color'), precise: g.getAttribute('data-precise'),
      outline: own('path.qr-camera-outline').map(el => el.getAttribute('d')),
      paths: own('path').length, polygons: own('polygon').length, rects: own('rect').length,
      lines: own('line').map(el => ({ role: el.getAttribute('class'),
        points: [Number(el.getAttribute('x1')), Number(el.getAttribute('y1')),
          Number(el.getAttribute('x2')), Number(el.getAttribute('y2'))] })),
      dots: own('circle.qr-camera-dot').length,
      dotPoints: own('circle.qr-camera-dot').map(el => ({ x: Number(el.getAttribute('cx')),
        y: Number(el.getAttribute('cy')) })),
    };
  }) : [];
  const scrim = root ? root.querySelector('path.qr-camera-scrim') : null;
  const entries = Array.from(rail.querySelectorAll('.qr-camera-entry')).map(el => ({
    target: el.getAttribute('data-target-id'), result: el.getAttribute('data-result-id'),
    state: el.getAttribute('data-state'), number: textOf(el, '.qr-camera-number'),
    format: textOf(el, '.qr-camera-format'), caption: textOf(el, '.qr-camera-caption'),
  }));
  const section = readout.querySelector('section.qr-camera-readout');
  const details = section ? section.querySelector('.qr-camera-details') : null;
  return {
    root: Boolean(root), targets, entries,
    scrim: scrim ? { d: scrim.getAttribute('d'), visible: visible(scrim) } : null,
    readout: section ? { content: textOf(section, '.qr-camera-content'),
      details: details ? details.textContent : null, detailsVisible: visible(details) } : null,
  };
}

// The overlay's own diagnostic object as data, with, per drawn quad, the bracket quadOutline
// gives for its points and the projection of the track's published geometry.
function readOverlay(overlay, snapshot, markers) {
  const inspection = JSON.parse(JSON.stringify(overlay.inspect()));
  const tracks = new Map((snapshot ? snapshot.tracks : []).map(track => [track.id, track]));
  const expected = inspection.targets.map(target => {
    const track = tracks.get(target.id);
    const projected = track && track.geometry && inspection.view
      ? projectOverlayGeometry(track.geometry, inspection.view) : null;
    return { id: target.id,
      bracket: target.kind === 'quad' && target.points ? quadOutline(target.points, markers).bracket : null,
      projected: projected && { kind: projected.kind, points: projected.points, valid: projected.valid } };
  });
  return { inspection, expected, selectionMode: overlay.selectionMode, alignment: overlay.alignment,
    detection: overlay.detection ? overlay.detection.content.text : null };
}

// A video element of the scene's CSS box whose media size is the frame size, as a playing
// camera would report it, in a positioned container; the rail and readout mount below it.
function createStage(frame, box) {
  const stage = document.createElement('div');
  stage.style.cssText = 'position: absolute; left: 0; top: 0; margin: 0; padding: 0;';
  const container = document.createElement('div');
  container.style.cssText = `position: relative; width: ${box.width}px; height: ${box.height}px; ` +
    'margin: 0; padding: 0; border: 0;';
  const video = document.createElement('video');
  video.muted = true;
  video.style.cssText = `display: block; width: ${box.width}px; height: ${box.height}px; ` +
    'object-fit: contain; margin: 0; padding: 0; border: 0;';
  Object.defineProperties(video, { videoWidth: { value: frame.width, configurable: true },
    videoHeight: { value: frame.height, configurable: true } });
  container.append(video);
  const rail = document.createElement('div'), readout = document.createElement('div');
  stage.append(container, rail, readout);
  document.body.append(stage);
  return { stage, container, video, rail, readout };
}

// The live track of a content, the nth by slot (scenes name the copy they select).
function trackOf(snapshot, { symbology, text, index = 0 }) {
  const tracks = snapshot.tracks.filter(track => track.state !== 'lost' &&
    track.detection.symbology === symbology && track.detection.content.text === text);
  return tracks[index] ?? null;
}

// One scene: every step is a frame (layers, observed at `at`, read with scan_frame, given to the
// tracker DECODE_MS later), a time step, a selection, a press on Details, a tracker reset to a
// new epoch, or the replay of a snapshot an earlier step received. Each step returns the report,
// the snapshot, the overlay's inspection and the document as they stand after it; a frame step
// of a spec with ink: true also returns its frame's inkBox.
async function runScene(spec) {
  const { profile, budgetMs, frame, box, steps } = spec;
  const bitmaps = await decodeImages(spec.images);
  const clock = createFakeClock(START);
  const errors = [];
  const { stage, container, video, rail, readout } = createStage(frame, box);
  const { context } = canvasOf(frame.width, frame.height);
  const overlay = createCameraOverlay({ video, container, mount: { rail, readout }, clock,
    onError: error => errors.push(`overlay: ${error && error.message}`), ...spec.overlay });
  let latest = null;
  const tracker = createDetectionTracker({ clock,
    onChange: snapshot => { latest = snapshot; overlay.update(snapshot); },
    onError: error => errors.push(`tracker: ${error && error.message}`) });
  const received = [], records = [];
  let sequence = 0;
  try {
    for (const [index, step] of steps.entries()) {
      const record = { step: index, label: step.label ?? null };
      if (step.layers) {
        clock.advanceTo(START + step.at);
        paint(context, frame.width, frame.height, step.layers, bitmaps);
        const rgba = context.getImageData(0, 0, frame.width, frame.height).data;
        // Before the buffer moves to the worker.
        if (spec.ink) record.ink = inkBox(rgba, frame.width, frame.height);
        const reply = await frameScanner().scan(rgba, frame.width, frame.height, profile, budgetMs);
        if (!reply.ok) throw new Error(`${spec.name} step ${index}: scan_frame failed: ${reply.name} ${reply.message}`);
        clock.advanceTo(START + step.at + DECODE_MS);
        sequence += 1;
        const snapshot = tracker.update(reply.result, { width: frame.width, height: frame.height,
          observedAt: START + step.at, epoch: step.epoch ?? 1, sequence }, { now: clock.now() });
        Object.assign(record, { kind: 'frame', report: plainReport(reply.result, reply.sha256),
          callMs: reply.callMs, returned: snapshot.status });
      } else if (step.advance) {
        clock.advanceTo(START + step.at);
        record.kind = 'time';
      } else if (step.select) {
        const track = latest && trackOf(latest, step.select);
        Object.assign(record, { kind: 'select', target: track ? track.id : null,
          selected: track ? overlay.select(track.id) : false });
      } else if (step.details) {
        const button = Array.from(readout.querySelectorAll('section.qr-camera-readout button'))
          .find(el => el.textContent.trim() === 'Details');
        if (button) button.click();
        Object.assign(record, { kind: 'details', pressed: Boolean(button) });
      } else if (step.reset !== undefined) {
        tracker.reset({ epoch: step.reset });
        record.kind = 'reset';
      } else if (step.replay !== undefined) {
        overlay.update(received[step.replay]);
        record.kind = 'replay';
      } else {
        throw new Error(`${spec.name} step ${index}: unknown step ${JSON.stringify(step)}`);
      }
      received[index] = latest;
      Object.assign(record, { at: clock.now() - START, snapshot: plainSnapshot(latest),
        overlay: readOverlay(overlay, latest, spec.overlay?.markers), dom: readDom(container, rail, readout) });
      records.push(record);
    }
    return { name: spec.name, profile, budgetMs, records, errors };
  } finally {
    overlay.destroy();
    tracker.destroy();
    stage.remove();
  }
}

// ------------------------------------------------------------------------- effects witness

// The strongest effects the declarations allow, with thumbnails on.
const STRONG = { focus: 'all', effects: { dim: 0.85, blur: 24, wash: 0.25, glow: 1, dwellMs: 300 },
  thumbnails: true };

// The shipped controller reads a canvas standing in for the video, as the camera RGBA witness
// does: drawImage copies its pixels exactly, so two runs read the same frames. Mode 'overlay'
// covers that element with the shipped overlay at STRONG and wires frame images as
// examples/camera.js does (a copy, only when the overlay asks, before the buffer moves to the
// worker). Frame k is painted once frame k - 1 was reported and gapMs has passed; frames differ
// only by a grey patch far from the codes. Attribute writes on the element are recorded.
async function runEffects(spec) {
  const { mode, profile, budgetMs, frame, box, frames, gapMs, layers } = spec;
  const bitmaps = await decodeImages(spec.images);
  const errors = [];
  const stage = document.createElement('div');
  stage.style.cssText = 'position: absolute; left: 0; top: 0; margin: 0; padding: 0;';
  const container = document.createElement('div');
  container.style.cssText = `position: relative; width: ${box.width}px; height: ${box.height}px; ` +
    'margin: 0; padding: 0; border: 0;';
  const { canvas: source, context } = canvasOf(frame.width, frame.height);
  source.style.cssText = `display: block; width: ${box.width}px; height: ${box.height}px; ` +
    'object-fit: contain; margin: 0; padding: 0; border: 0;';
  Object.defineProperties(source, { readyState: { value: 4 }, videoWidth: { value: frame.width },
    videoHeight: { value: frame.height }, play: { value: () => Promise.resolve() }, pause: { value: () => {} } });
  container.append(source);
  const rail = document.createElement('div'), readout = document.createElement('div');
  stage.append(container, rail, readout);
  document.body.append(stage);
  const writes = [];
  const observer = new MutationObserver(list => list.forEach(entry => writes.push(entry.attributeName)));
  observer.observe(source, { attributes: true });
  const overlay = mode === 'overlay' ? createCameraOverlay({ video: source, container,
    mount: { rail, readout }, onError: error => errors.push(`overlay: ${error && error.message}`), ...STRONG }) : null;
  // Windows wider than any frame time: a slow runtime keeps the geometry, so the holes, and the
  // effects can switch on there too (the defaults withhold a geometry 1200 ms after its frame).
  const tracker = createDetectionTracker({ staleMs: 30_000, reacquireMs: 60_000,
    onChange: snapshot => { if (overlay) overlay.update(snapshot); },
    onError: error => errors.push(`tracker: ${error && error.message}`) });
  const captures = [];
  let reported = 0, wake = () => {};
  const scanFrame = (rgba, width, height, scan) => {
    const capture = { sequence: scan.frame.sequence, width, height, frameImage: false,
      effectsActive: overlay ? overlay.inspect().effects.active : null };
    if (overlay && overlay.wantsFrameImage()) {
      overlay.setFrameImage(new ImageData(new Uint8ClampedArray(rgba), width, height), scan.frame);
      capture.frameImage = true;
    }
    captures.push(capture);
    return frameScanner().scan(rgba, width, height, profile, budgetMs).then(reply => {
      if (!reply.ok) throw new Error(`scan_frame failed: ${reply.name} ${reply.message}`);
      Object.assign(capture, { sha256: reply.sha256, report: reply.result });
      return reply.result;
    });
  };
  const controller = createCameraScanner({ video: source, tracker, scanFrame,
    mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) },
    intervalMs: 20, decodeTimeoutMs: 120_000,
    onResult() { reported += 1; wake(); },
    onError(error) { errors.push(`controller: ${error.code} ${error.message}`); wake(); } });
  const until = (predicate, label) => new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`${label}: no result after 120 s`)), 120_000);
    wake = () => {
      if (errors.length) { clearTimeout(deadline); reject(new Error(`${label}: ${errors.join('; ')}`)); }
      else if (predicate()) { clearTimeout(deadline); wake = () => {}; resolve(); }
    };
    wake();
  });
  try {
    paint(context, frame.width, frame.height, layers, bitmaps, 40);
    await controller.start();
    for (let k = 0; k < frames - 1; k += 1) {
      await until(() => reported > k, `${mode} ${profile} frame ${k}`);
      await new Promise(resolve => setTimeout(resolve, gapMs));
      paint(context, frame.width, frame.height, layers, bitmaps, 40 + 20 * (k + 1));
    }
    await until(() => reported >= frames, `${mode} ${profile} frame ${frames - 1}`);
    // The overlay as the last frame left it; stopping ends the epoch, which clears the scene.
    const inspection = overlay ? overlay.inspect() : null;
    const scrim = overlay ? container.querySelector('path.qr-camera-scrim') : null;
    const shown = scrim ? { d: scrim.getAttribute('d'), visible: visible(scrim) } : null;
    controller.stop();
    return { mode, profile, budgetMs, errors, writes: writes.slice(),
      frames: captures.map(capture => ({ ...capture })),
      overlay: inspection && { effects: { ...inspection.effects }, blur: inspection.blur,
        clip: inspection.clip, frameImage: { ...inspection.frameImage },
        targets: inspection.targets.map(target => ({ id: target.id, drawn: target.drawn, cutout: target.cutout })),
        scrim: shown } };
  } finally {
    controller.stop();
    observer.disconnect();
    if (overlay) overlay.destroy();
    tracker.destroy();
    stage.remove();
  }
}

// ------------------------------------------------------------------------------- the rest

// A composed image as PNG bytes (lossless): white, then the layers.
async function composePng({ width, height, images, layers }) {
  const bitmaps = await decodeImages(images);
  const { canvas, context } = canvasOf(width, height);
  paint(context, width, height, layers, bitmaps);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

// An overlay over a video with no source, given one empty snapshot: the import and the overlay
// itself must not ask for a camera (the runner counts the page's camera calls around this).
function createIdleOverlay() {
  const { stage, container, video, rail, readout } = createStage({ width: 640, height: 480 },
    { width: 320, height: 240 });
  const tracker = createDetectionTracker();
  const overlay = createCameraOverlay({ video, container, mount: { rail, readout } });
  overlay.update(tracker.update([], { width: 640, height: 480, observedAt: performance.now() },
    { complete: true }));
  const alignment = overlay.alignment;
  overlay.destroy();
  tracker.destroy();
  stage.remove();
  return { alignment };
}

export function createOverlayHarness() {
  return { runScene, runEffects, composePng, createIdleOverlay };
}
