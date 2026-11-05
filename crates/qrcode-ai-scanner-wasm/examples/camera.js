// The camera example's page script: the camera controller, the detection tracker and the
// overlay, wired on one module worker (scanner.worker.js, the image example's worker). The
// worker loads the scanner when the page opens; the camera opens only from the Start button.
// Decoded values reach the page only through the overlay, which renders them as text, and its
// Open button is turned off: nothing navigates, and nothing is requested outside the package
// folder unless the user turns destination checks on and presses Check destination.
import { createCameraScanner, createDetectionTracker } from '../camera.js';
import { CAMERA_OVERLAY_CSS, createCameraOverlay } from '../camera-overlay.js';
import { createDestinationVerifier, createFetchTransport } from '../destination.js';

const WORKER_URL = new URL('./scanner.worker.js', import.meta.url);
const PACKAGE_JSON_URL = new URL('../package.json', import.meta.url);
const BUILD_INFO_URL = new URL('../build-info.json', import.meta.url);
// Frames use the frame profile, which only decodes. budgetMs 0 lets each frame scan run to its
// end, so a slow device scans fewer frames, never a cut one; the controller's decode timeout
// (5 s by default) still ends a scan that hangs.
const PROFILE = 'frame';
const BUDGET_MS = 0;
// The page's own rules. With the overlay's (CAMERA_OVERLAY_CSS) they are applied as
// constructed stylesheets, which no style-src directive governs: the page needs neither an
// inline style nor a stylesheet file, and the overlay is created with styles: 'none'.
const PAGE_CSS = `
:root {
  color-scheme: light dark;
  --bg: #ffffff; --fg: #1b1d21; --muted: #4f5662; --line: #848c98; --panel: #f3f5f8;
  --focus: #0b57d0; --error: #a8231c;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121417; --fg: #e8eaed; --muted: #b0b7c2; --line: #6b7380; --panel: #1d2026;
    --focus: #8ab4f8; --error: #f2b8b5;
  }
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
main { max-width: 52rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
h1 { font-size: 1.6rem; margin: 0 0 0.5rem; }
h2 { font-size: 1.15rem; margin: 2rem 0 0.75rem; }
p { margin: 0.5rem 0; }
input, select, button { font: inherit; color: inherit; }
select, button {
  background: var(--panel); border: 1px solid var(--line); border-radius: 0.375rem;
  padding: 0.4rem 0.6rem; min-height: 2.75rem;
}
button { cursor: pointer; }
button:disabled { cursor: default; opacity: 0.6; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.controls { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.75rem 1rem; }
.field label { display: block; font-weight: 600; margin-bottom: 0.25rem; }
.settings {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1rem 1.5rem;
}
.settings input[type="range"] { width: 100%; margin: 0; }
output { font-variant-numeric: tabular-nums; }
label.check { display: flex; gap: 0.5rem; align-items: flex-start; font-weight: 600; }
label.check input { margin-top: 0.3rem; flex: none; }
#status { font-weight: 600; }
#status[data-state="failed"], #status[data-scanner="failed"] { color: var(--error); }
#capture {
  position: relative; margin: 1rem 0 0; background: #000000; border-radius: 0.5rem;
  overflow: hidden;
}
#capture video {
  display: block; width: 100%; height: auto; max-height: 70vh; object-fit: contain;
}
#rail-slot, #readout-slot { margin-top: 0.75rem; }
.facts { margin: 0; }
.facts > div { display: flex; flex-wrap: wrap; gap: 0 1rem; margin-bottom: 0.125rem; }
.facts dt { color: var(--muted); min-width: 9rem; }
.facts dd { margin: 0; min-width: 0; flex: 1 1 16rem; overflow-wrap: anywhere; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.note { font-size: 0.9rem; color: var(--muted); }
`;

const byId = (id) => document.getElementById(id);
const view = {
  toggle: byId('toggle'), deviceField: byId('device-field'), device: byId('device'),
  retry: byId('retry'), status: byId('status'), capture: byId('capture'), video: byId('video'),
  railSlot: byId('rail-slot'), readoutSlot: byId('readout-slot'), focus: byId('focus'),
  dim: byId('dim'), dimValue: byId('dim-value'), blur: byId('blur'), blurValue: byId('blur-value'),
  glow: byId('glow'), glowValue: byId('glow-value'), rail: byId('rail'),
  destinations: byId('destinations'), packageName: byId('package-name'),
  packageVersion: byId('package-version'), wasmSha256: byId('wasm-sha256'),
  engineVersion: byId('engine-version'),
};

// Constructed stylesheets need adoptedStyleSheets; without it the page runs unstyled.
function applyStyles() {
  if (!Array.isArray(document.adoptedStyleSheets) || typeof CSSStyleSheet !== 'function') {
    return false;
  }
  const sheets = [CAMERA_OVERLAY_CSS, PAGE_CSS].map((text) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    return sheet;
  });
  document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheets);
  return true;
}
const styled = applyStyles();

// The status line: the page's one live region. data-state is the camera's state and
// data-scanner the worker's ('loading', 'ready' or 'failed'); data-error names a camera error.
function say(text, error) {
  view.status.textContent = text;
  if (error) view.status.dataset.error = error; else delete view.status.dataset.error;
}

// ---------------------------------------------------------------- the scanner worker
// As in the image example: one module worker, requests matched to replies by id, and a failed
// load retried only from the button, in a new worker. Here the camera controller may also
// replace the worker (recover, below) when a frame hangs.
let worker = null;
let workerFailure = null; // the reply every request gets once the worker itself has failed
let lastRequest = 0;
const pending = new Map(); // request id -> resolve
let packageVersion = null;
let engineVersion = null;

function failure(message, code) {
  const error = { name: 'WorkerError', message, code, qrs: null, status: null, cause: null };
  return { ok: false, phase: 'load', error };
}

// Ends the current worker; every request still waiting gets REPLY.
function endWorker(reply) {
  workerFailure = reply;
  if (worker !== null) worker.terminate();
  worker = null;
  for (const resolve of pending.values()) resolve(reply);
  pending.clear();
}

function startWorker() {
  workerFailure = null;
  try {
    worker = new Worker(WORKER_URL, { type: 'module' });
  } catch (error) {
    endWorker(failure(`The scanner worker could not be created: ${error && error.message}`,
      'worker_failed'));
    return;
  }
  worker.onmessage = (event) => {
    const reply = event.data || {};
    const resolve = pending.get(reply.id);
    if (resolve === undefined) return;
    pending.delete(reply.id);
    resolve(reply);
  };
  // The worker script did not load or run: a file:// page, a server that sends .js files with
  // another type than text/javascript, or a browser without module workers.
  worker.onerror = (event) => {
    event.preventDefault();
    const detail = event.message ? ` ${event.message}` : '';
    endWorker(failure('The scanner worker did not start. Serve the package folder over ' +
      'http(s), with .js files sent as text/javascript, in a browser that runs module ' +
      `workers.${detail}`, 'worker_failed'));
  };
  worker.onmessageerror = () => endWorker(failure('A reply from the scanner worker could not ' +
    'be read.', 'worker_failed'));
}

function request(message, transfer) {
  if (worker === null) {
    const stopped = failure('The scanner worker is not running.', 'worker_failed');
    return Promise.resolve(workerFailure || stopped);
  }
  lastRequest += 1;
  const id = lastRequest;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage(Object.assign({ id }, message), transfer || []);
  });
}

// One request under a controller signal. On abort the worker is ended first, so it never keeps
// working on what the controller gave up, and only then does the promise reject.
function guarded(signal, message, transfer) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      endWorker(failure('The scanner worker was stopped.', 'worker_stopped'));
      reject(signal.reason);
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    request(message, transfer).then((reply) => {
      signal.removeEventListener('abort', abort);
      if (reply.ok) {
        resolve(reply);
        return;
      }
      const error = reply.error || {};
      reject(new Error(`${reply.phase} error (${error.code || error.qrs || error.name}): ` +
        `${error.message}`));
    });
  });
}

function showVersions() {
  if (engineVersion === null) return;
  const differs = packageVersion !== null && packageVersion !== engineVersion;
  const note = differs ? ` (differs from package.json, ${packageVersion})` : '';
  view.engineVersion.textContent = `${engineVersion}${note}`;
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.pathname}`);
  return response.json();
}

async function showPackage() {
  const reads = [readJson(PACKAGE_JSON_URL), readJson(BUILD_INFO_URL)];
  const [manifest, buildInfo] = await Promise.allSettled(reads);
  if (manifest.status === 'fulfilled') {
    view.packageName.textContent = String(manifest.value.name);
    packageVersion = String(manifest.value.version);
    view.packageVersion.textContent = packageVersion;
  } else {
    const reason = `unavailable (${manifest.reason && manifest.reason.message})`;
    view.packageName.textContent = reason;
    view.packageVersion.textContent = reason;
  }
  const digest = buildInfo.status === 'fulfilled' && buildInfo.value && buildInfo.value.wasm
    ? buildInfo.value.wasm.sha256 : undefined;
  view.wasmSha256.textContent = typeof digest === 'string' && /^[0-9a-f]{64}$/.test(digest) ? digest
    : buildInfo.status === 'fulfilled' ? 'unavailable (build-info.json names no wasm.sha256)'
      : `unavailable (${buildInfo.reason && buildInfo.reason.message})`;
  showVersions();
}

// ------------------------------------------------------------ overlay, tracker, camera
// A throw from this page's own display callbacks: a bug in the page, never a scan result.
function reportUiError(error) {
  console.error(error);
  say(`The display failed: ${error && error.message}`, 'display_failed');
}

const overlay = createCameraOverlay({
  video: view.video,
  container: view.capture,
  // The list of codes and the readout render below the video: no control covers a code.
  mount: { rail: view.railSlot, readout: view.readoutSlot },
  styles: 'none',
  scheme: 'inherit',
  // A thumbnail of each listed code, cut from a frame the scanner read (see scanFrame).
  thumbnails: true,
  // Decoded links stay text: no Open button. Copy stays, and Check when destinations are on.
  actions: { open: false },
  destinations: null,
  onError: reportUiError,
});
// Every snapshot the tracker produces reaches the overlay, in order.
const tracker = createDetectionTracker({
  onChange: (snapshot) => overlay.update(snapshot),
  onError: reportUiError,
});

// The controller calls this for one frame at a time, with that frame's own RGBA buffer. The
// overlay asks for a copy only when a thumbnail is due, and the copy is made before the buffer
// moves to the worker: the transfer detaches it.
function scanFrame(rgba, width, height, context) {
  if (overlay.wantsFrameImage()) {
    const copy = new ImageData(new Uint8ClampedArray(rgba), width, height);
    overlay.setFrameImage(copy, context.frame);
  }
  const message = {
    type: 'scan_frame', rgba, width, height, profile: PROFILE, budgetMs: BUDGET_MS,
  };
  return guarded(context.signal, message, [rgba.buffer]).then((reply) => reply.report);
}

// Replaces a hung or failed decoder when the controller asks: a new worker, which loads the
// scanner once, under the controller's signal.
function recover(cause, context) {
  endWorker(failure('The scanner worker was replaced.', 'worker_replaced'));
  startWorker();
  return guarded(context.signal, { type: 'load' }).then((reply) => {
    engineVersion = String(reply.version);
    showVersions();
  });
}

const LIVE = ['starting', 'running', 'recovering'];
let scannerReady = false;

function showState(change) {
  const live = LIVE.includes(change.state);
  view.status.dataset.state = change.state;
  view.toggle.textContent = live ? 'Stop the camera' : 'Start the camera';
  view.toggle.disabled = !live && !scannerReady;
  if (change.state === 'starting') {
    say('Waiting for the camera. The browser may ask for your permission.');
  } else if (change.state === 'running') {
    if (change.muted) say('The camera sends no picture for now: the system or browser muted it.');
    else if (change.stalled) say('The camera has stopped sending new frames.');
    else say('Scanning. Point the camera at a code.');
    if (change.reason === 'start' || change.reason === 'constraints') listCameras();
  } else if (change.state === 'recovering') {
    say('The scanner stopped answering: starting a new scanner worker.');
  } else if (change.state === 'stopped') {
    say(change.reason === 'hidden' || change.reason === 'pagehide'
      ? 'Camera stopped because the page was hidden. Press Start the camera to scan again.'
      : 'Camera stopped.');
  }
}

const CAMERA_ERRORS = {
  unsupported: 'This browser gives this page no camera access.',
  permission_denied: 'Camera access was denied. Allow the camera for this site in the ' +
    'browser, then press Start the camera again.',
  device_not_found: 'No camera was found. Connect one, then press Start the camera again.',
  device_busy: 'The camera could not be read: another application may be using it. Close it, ' +
    'then press Start the camera again.',
  constraints_unsatisfied: 'The chosen camera cannot give the requested picture. Choose ' +
    'another camera, or press Start the camera again.',
  start_failed: 'The camera did not start.',
  play_failed: 'The camera picture could not be played in the page.',
  canvas_unavailable: 'This browser could not read the camera frames.',
  stream_ended: 'The camera stopped: it was disconnected, or another application took it.',
  decode_failed: 'The scanner failed on a frame.',
  decode_timeout: 'The scanner took too long on a frame.',
  recover_failed: 'The scanner could not be restarted.',
  callback_failed: 'A callback of this page failed.',
};

// Each failed session, and each throw from a callback, with the native cause's name.
function showCameraError(error) {
  const code = String(error && error.code);
  let text = Object.prototype.hasOwnProperty.call(CAMERA_ERRORS, code) ? CAMERA_ERRORS[code]
    : `The camera failed: ${error && error.message}`;
  if (code === 'unsupported' && window.isSecureContext === false) {
    text = 'Camera access needs a secure context: open this page over https, or from ' +
      'http://localhost or http://127.0.0.1.';
  }
  const cause = error && error.cause && error.cause.name ? `, ${error.cause.name}` : '';
  say(`${text} (${code}${cause})`, code);
}

const camera = createCameraScanner({
  video: view.video, tracker, scanFrame, recover, onState: showState, onError: showCameraError,
});

// ------------------------------------------------------------------------ controls
view.toggle.addEventListener('click', () => {
  if (LIVE.includes(camera.state)) {
    camera.stop();
    return;
  }
  // start() rejects with the error that showCameraError already shows.
  camera.start().catch(() => {});
});

// The cameras, listed once the browser has granted access (their labels need it) and again
// when one is connected or removed. The choice shows only when there are two or more.
let chosenDevice = null;
let watchingDevices = false;

function currentDeviceId() {
  const stream = view.video.srcObject;
  const tracks = stream && typeof stream.getVideoTracks === 'function'
    ? stream.getVideoTracks() : [];
  const settings = tracks.length > 0 && typeof tracks[0].getSettings === 'function'
    ? tracks[0].getSettings() : {};
  return settings.deviceId || chosenDevice;
}

async function listCameras() {
  const devices = navigator.mediaDevices;
  if (!devices || typeof devices.enumerateDevices !== 'function') return;
  if (!watchingDevices && typeof devices.addEventListener === 'function') {
    devices.addEventListener('devicechange', listCameras);
    watchingDevices = true;
  }
  let found;
  try {
    found = await devices.enumerateDevices();
  } catch (error) {
    return;
  }
  const cameras = found.filter((device) => device.kind === 'videoinput' && device.deviceId);
  const current = currentDeviceId();
  while (view.device.firstChild) view.device.removeChild(view.device.firstChild);
  cameras.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `Camera ${index + 1}`;
    option.selected = device.deviceId === current;
    view.device.appendChild(option);
  });
  view.deviceField.hidden = cameras.length < 2;
}

// A running session ends on the current camera and opens the chosen one; a stopped one keeps
// the choice for the next start.
view.device.addEventListener('change', () => {
  chosenDevice = view.device.value;
  camera.setConstraints({ deviceId: { exact: chosenDevice } }).catch(() => {});
});

// The display controls are overlay options. setOptions checks every value before it changes
// anything, and an effects record merges into the current one.
function applyDisplay() {
  const off = view.focus.value === 'off';
  for (const input of [view.dim, view.blur, view.glow]) input.disabled = off;
  view.dimValue.textContent = view.dim.value;
  view.blurValue.textContent = view.blur.value;
  view.glowValue.textContent = view.glow.value;
  overlay.setOptions({
    focus: view.focus.value,
    rail: view.rail.value,
    effects: {
      dim: Number(view.dim.value), blur: Number(view.blur.value), glow: Number(view.glow.value),
    },
  });
}
for (const control of [view.focus, view.rail]) control.addEventListener('change', applyDisplay);
for (const control of [view.dim, view.blur, view.glow]) {
  control.addEventListener('input', applyDisplay);
}

// Destination checks: off whenever the page opens. Turned on, they bind a verifier whose
// transport this page creates (a fetch from this browser, no hosted service). The overlay then
// offers Check destination for an eligible link, and checks only when the user presses it.
let verifier = null;
function applyDestinations() {
  if (view.destinations.checked && verifier === null) {
    verifier = createDestinationVerifier({ transport: createFetchTransport({ scope: 'network' }) });
    overlay.setOptions({ destinations: verifier });
  } else if (!view.destinations.checked && verifier !== null) {
    overlay.setOptions({ destinations: null });
    verifier.destroy();
    verifier = null;
  }
}
view.destinations.addEventListener('change', applyDestinations);

// The controller stops the camera by itself when the page is hidden or left. A page that is
// discarded, not kept in the back-forward cache, also ends the rest, in any order.
window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  camera.stop();
  tracker.destroy();
  overlay.destroy();
  if (verifier !== null) verifier.destroy();
  endWorker(failure('The page was closed.', 'worker_stopped'));
});

// ------------------------------------------------------------------------- loading
async function loadScanner() {
  view.status.dataset.scanner = 'loading';
  const reply = await request({ type: 'load' });
  if (reply.ok) {
    engineVersion = String(reply.version);
    showVersions();
    scannerReady = true;
    view.status.dataset.scanner = 'ready';
    if (!LIVE.includes(camera.state)) {
      view.toggle.disabled = false;
      say('Ready. The camera starts only when you press Start the camera.');
    }
    return;
  }
  const error = reply.error || {};
  const status = typeof error.status === 'number' ? `, HTTP ${error.status}` : '';
  view.status.dataset.scanner = 'failed';
  view.engineVersion.textContent = 'not loaded';
  say(`Loading error (${error.code || 'unknown'}${status}): the scanner did not load, so the ` +
    `camera cannot scan. ${error.message || ''}`, 'loading');
  view.retry.hidden = false;
}

// As in the image example: a new worker, so a new loader. The button hides itself, so focus
// moves to the status line, which then reads the outcome.
view.retry.addEventListener('click', () => {
  view.retry.hidden = true;
  view.status.focus();
  endWorker(failure('The scanner worker was replaced.', 'worker_replaced'));
  say('Loading the scanner again…');
  startWorker();
  loadScanner();
});

if (!styled) console.warn('This browser lacks constructed stylesheets: the page is unstyled.');
view.status.dataset.state = camera.state;
view.destinations.checked = false;
applyDisplay();
say('Loading the scanner…');
startWorker();
loadScanner();
showPackage();
