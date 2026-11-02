// The image example's page script. It reads the chosen file, hands its bytes to one module
// worker (scanner.worker.js) and writes what comes back as text. It never builds markup from a
// decoded value and never navigates: a decoded URL is plain text.
const WORKER_URL = new URL('./scanner.worker.js', import.meta.url);
const PACKAGE_JSON_URL = new URL('../package.json', import.meta.url);
const BUILD_INFO_URL = new URL('../build-info.json', import.meta.url);
// budget_ms 0 lets every scan run to its end: the time budget never cuts a report. A capacity
// can still leave codes or copies out, so each report says itself what it proves.
const BUDGET_MS = 0;
// Characters that render as nothing or as plain space: controls, format characters, separators
// (the ordinary space excepted), default-ignorable code points (variation selectors, Hangul
// fillers, tag characters, the combining grapheme joiner) and the blank Braille pattern. Each is
// listed by code point under the value.
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Z}\p{Default_Ignorable_Code_Point}\u2800]/u;
const INVISIBLE_LISTED = 32;
// The binding refuses a profile name it does not know with this message and no QRS code. The
// worker passes no other named option, and refuses a budget outside its domain with QRS-006.
const UNKNOWN_PROFILE = /^unknown profile\b/;

const byId = (id) => document.getElementById(id);
const view = {
  file: byId('file'), dropZone: byId('drop-zone'), profile: byId('profile'),
  preview: byId('preview'), previewImage: byId('preview-image'),
  previewCaption: byId('preview-caption'), result: byId('result'), summary: byId('summary'),
  detections: byId('detections'), retry: byId('retry'), packageName: byId('package-name'),
  packageVersion: byId('package-version'), wasmSha256: byId('wasm-sha256'),
  engineVersion: byId('engine-version'),
};

let worker = null;
let workerFailure = null; // the reply every request gets once the worker itself has failed
let lastRequest = 0;
const pending = new Map(); // request id -> resolve
let scans = 0; // scans started; a reply is shown only while its scan is the latest
let chosen = null; // { file, note } of the latest image
let previewUrl = null;
let packageVersion = null;
let engineVersion = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// One place writes the result region: its state, the summary and the list, all as text.
function show(state, summary, details) {
  const extra = details || {};
  const region = view.result;
  region.dataset.state = state;
  region.dataset.scan = String(scans);
  if (extra.error) region.dataset.error = extra.error; else delete region.dataset.error;
  if (extra.code) region.dataset.code = extra.code; else delete region.dataset.code;
  if (extra.complete !== undefined) region.dataset.complete = String(extra.complete);
  else delete region.dataset.complete;
  view.summary.textContent = summary;
  while (view.detections.firstChild) view.detections.removeChild(view.detections.firstChild);
  for (const item of extra.items || []) view.detections.appendChild(item);
}

function failure(message, code) {
  const error = { name: 'WorkerError', message, code, qrs: null, status: null, cause: null };
  return { ok: false, phase: 'load', error };
}

function failWorker(message) {
  workerFailure = failure(message, 'worker_failed');
  if (worker !== null) worker.terminate();
  worker = null;
  for (const resolve of pending.values()) resolve(workerFailure);
  pending.clear();
}

function startWorker() {
  workerFailure = null;
  try {
    worker = new Worker(WORKER_URL, { type: 'module' });
  } catch (error) {
    failWorker(`The scanner worker could not be created: ${error && error.message}`);
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
    failWorker('The scanner worker did not start. Serve the package folder over http(s), with ' +
      `.js files sent as text/javascript, in a browser that runs module workers.${detail}`);
  };
  worker.onmessageerror = () => failWorker('A reply from the scanner worker could not be read.');
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

function fact(list, term, value, className) {
  const row = element('div');
  row.appendChild(element('dt', '', term));
  row.appendChild(element('dd', className, value));
  list.appendChild(row);
}

function invisibleCharacters(text) {
  const found = [];
  let index = 0;
  for (const character of text) {
    if (character !== ' ' && INVISIBLE.test(character)) {
      const hex = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      found.push(`U+${hex} at ${index}`);
    }
    index += 1;
  }
  return found;
}

// A copy count is exact only when the report proves it (counts 'exact', see completeness());
// otherwise it is a lower bound.
function copyCount(detection, counts) {
  if (!Array.isArray(detection.occurrences)) return 'not reported';
  const copies = detection.occurrences.length;
  if (counts === 'exact') return String(copies);
  const why = counts === 'incomplete' ? 'incomplete' : 'not proven complete';
  return `at least ${copies} (${why})`;
}

function renderDetection(detection, counts) {
  const content = detection.content || {};
  const text = typeof content.text === 'string' ? content.text : '';
  const item = element('li', 'detection');
  const facts = element('dl', 'facts');
  fact(facts, 'Symbology', String(detection.symbology), 'symbology');
  const kind = detection.payload ? String(detection.payload.kind) : 'not reported';
  fact(facts, 'Payload kind', kind, 'payload-kind');
  fact(facts, 'Occurrences', copyCount(detection, counts), 'occurrences');
  fact(facts, 'Charset', String(content.charset), 'charset');
  if (content.fnc1) fact(facts, 'FNC1', String(content.fnc1), 'fnc1');
  if (Array.isArray(content.eci)) {
    const located = content.eci.map((eci) => `${eci.designator} from byte ${eci.start}`);
    fact(facts, 'ECI', located.length === 0 ? 'signalled, not located' : located.join(', '), 'eci');
  }
  item.appendChild(facts);
  const lead = 'Decoded text, exactly as returned (text only, never opened):';
  item.appendChild(element('p', 'note', lead));
  item.appendChild(element('pre', 'value', text));
  const invisible = invisibleCharacters(text);
  if (invisible.length > 0) {
    const listed = invisible.slice(0, INVISIBLE_LISTED).join(', ');
    const unlisted = invisible.length - INVISIBLE_LISTED;
    const more = unlisted > 0 ? `, and ${unlisted} more` : '';
    item.appendChild(element('p', 'note invisible',
      `Characters that do not show (code point at character index): ${listed}${more}.`));
  }
  if (content.charset === 'unknown') {
    item.appendChild(element('p', 'note raw', 'This text is not a complete decoding: each U+FFFD ' +
      `replaces bytes the scanner could not read. The bytes, in base64: ${content.raw}`));
  }
  return item;
}

// What a report proves, read as the report contract states it: an absent flag is unknown, never
// false. The list is complete when the time budget cut nothing and no capacity left a read or a
// content out (trace.saturation.reads and .detections); only then does an empty list prove that
// the image holds no code this profile can read. Copy counts are exact when the scan ran to its
// end, reconciled every read and says that no count is incomplete (budget_exhausted, .reads and
// .occurrences all false). A set .occurrences means copies may be missing or kept together, in a
// code the report does not name; contents past the 16 published (.detections) leave the copies
// of the listed codes as they are.
function completeness(report) {
  const trace = report.trace !== null && typeof report.trace === 'object' ? report.trace : {};
  const saturation = trace.saturation !== null && typeof trace.saturation === 'object'
    ? trace.saturation : null;
  const gaps = [], unsaid = []; // unsaid: what the report leaves unknown, after 'whether the scan'
  if (trace.budget_exhausted === true) gaps.push('the time budget cut the scan short');
  else if (trace.budget_exhausted !== false) unsaid.push('ran to its end');
  const flags = saturation === null ? [undefined] : [saturation.reads, saturation.detections];
  if (flags.includes(true)) gaps.push('the scan reached a capacity');
  else if (flags.some((flag) => flag !== false)) unsaid.push('reached a capacity');
  if (unsaid.length > 0) {
    gaps.push(`the report does not say whether the scan ${unsaid.join(' or ')}`);
  }
  const occurrences = saturation === null ? undefined : saturation.occurrences;
  const counted = trace.budget_exhausted === false && saturation !== null
    && saturation.reads === false;
  const counts = occurrences === true ? 'incomplete'
    : counted && occurrences === false ? 'exact' : 'unproven';
  const reason = gaps.join(', and ');
  return { complete: gaps.length === 0, counts,
    reason: reason.charAt(0).toUpperCase() + reason.slice(1) };
}

function showReport(report, name, profile) {
  const detections = Array.isArray(report.detections) ? report.detections : [];
  const { complete, counts, reason } = completeness(report);
  if (detections.length === 0 && complete) {
    show('empty', `No code found in ${name} with the ${profile} profile. The scan finished: an ` +
      'image without a readable code is a valid result, not an error.', { complete });
    return;
  }
  if (detections.length === 0) {
    show('inconclusive', `No code listed for ${name} with the ${profile} profile, and that does ` +
      `not prove the image holds none. ${reason}: codes may be present.`, { complete });
    return;
  }
  const count = detections.length === 1 ? '1 code' : `${detections.length} codes`;
  const list = complete ? ' The scan finished and lists every code it read.'
    : ` ${reason}: more codes may be present than listed.`;
  const copies = counts === 'exact' ? ''
    : counts === 'incomplete'
      ? ' Some copy counts are incomplete: a code may occur more times than its count shows.'
      : ' The report does not prove the copy counts complete: each is a lower bound.';
  show('result', `${count} found in ${name} with the ${profile} profile.${list}${copies}`,
    { complete, items: detections.map((detection) => renderDetection(detection, counts)) });
}

// Loading, configuration and input errors, and a scanner fault, are told apart from each other
// and from an empty result: only a complete scan can say an image holds no code.
function showError(reply, name) {
  const error = reply.error || {};
  const message = error.message || 'No message.';
  if (reply.phase === 'load') {
    const code = error.code || 'unknown';
    const status = typeof error.status === 'number' ? `, HTTP ${error.status}` : '';
    const cause = error.cause ? ` Cause: ${error.cause.name}: ${error.cause.message}` : '';
    show('error', `Loading error (${code}${status}): the scanner did not load, so nothing was ` +
      `scanned. ${message}${cause}`, { error: 'loading', code });
    view.engineVersion.textContent = 'not loaded';
    view.retry.hidden = false;
    return;
  }
  if (reply.phase === 'scan' && error.qrs && error.qrs !== 'QRS-006') {
    show('error', `Input error (${error.qrs}): the scanner refused ${name}. ${message}`,
      { error: 'input', code: error.qrs });
    return;
  }
  // A malformed request, an option outside its domain (QRS-006) or a profile name the binding
  // does not know: the request is wrong, not the image.
  if (reply.phase === 'request' || (reply.phase === 'scan' && (error.qrs === 'QRS-006' ||
      UNKNOWN_PROFILE.test(message)))) {
    const tag = error.qrs ? ` (${error.qrs})` : '';
    show('error', `Configuration error${tag}: the request or one of its options is invalid, not ` +
      `the image. ${message}`, { error: 'configuration', code: error.qrs });
    return;
  }
  // Anything else stopped the scanner in a way neither the image nor the request explains: a
  // WebAssembly trap (RuntimeError), a stack overflow (RangeError, or InternalError in Firefox),
  // a report the binding could not hand over. The module may be unusable after it.
  show('error', `Scanner fault (${error.name || 'Error'}): the scanner stopped while scanning ` +
    `${name}. Reload the page before scanning again. ${message}`, { error: 'fault' });
}

async function scan(file, note) {
  chosen = { file, note };
  scans += 1;
  const serial = scans;
  const profile = view.profile.value;
  show('scanning', `Scanning ${file.name}${note} with the ${profile} profile…`);
  let bytes;
  try {
    bytes = await file.arrayBuffer();
  } catch (error) {
    if (serial === scans) {
      const reason = error && error.message;
      show('error', `Input error: ${file.name} could not be read. ${reason}`, { error: 'input' });
    }
    return;
  }
  const reply = await request({ type: 'scan_image', bytes, profile, budgetMs: BUDGET_MS }, [bytes]);
  if (serial !== scans) return; // a newer image or profile replaced this scan
  if (reply.ok) showReport(reply.report, file.name, profile);
  else showError(reply, file.name);
}

function choose(file, note) {
  if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  view.previewImage.hidden = false;
  view.previewImage.alt = `The chosen image, ${file.name}`;
  view.previewImage.src = previewUrl;
  const type = file.type ? `, ${file.type}` : '';
  view.previewCaption.textContent = `${file.name}: ${file.size} bytes${type}`;
  view.preview.hidden = false;
  scan(file, note);
}

async function loadScanner(retrying) {
  const reply = await request({ type: 'load' });
  if (reply.ok) {
    engineVersion = String(reply.version);
    showVersions();
    if (retrying && chosen !== null) scan(chosen.file, chosen.note);
    else if (retrying || scans === 0) show('ready', 'Ready. Choose or drop an image.');
    return;
  }
  // While a scan is in flight, its own reply reports this same failure.
  if (retrying || scans === 0) showError(reply, 'the image');
}

// An explicit retry gets a new worker, so a new loader: a failed load is never retried by itself.
// The button hides itself, so focus moves to the summary, which then reads the outcome.
function retry() {
  view.retry.hidden = true;
  view.summary.focus();
  if (worker !== null) worker.terminate();
  worker = null;
  const replaced = failure('The scanner worker was replaced.', 'worker_replaced');
  for (const resolve of pending.values()) resolve(replaced);
  pending.clear();
  show('loading', 'Loading the scanner again…');
  startWorker();
  loadScanner(true);
}

view.file.addEventListener('change', () => {
  const file = view.file.files && view.file.files[0];
  if (file) choose(file, '');
});
view.profile.addEventListener('change', () => {
  if (chosen !== null) scan(chosen.file, chosen.note);
});
view.retry.addEventListener('click', retry);
view.previewImage.addEventListener('error', () => {
  if (!view.previewImage.getAttribute('src')) return;
  view.previewImage.hidden = true;
  view.previewCaption.textContent +=
    ' (this browser cannot display it; the scanner reads the bytes itself)';
});
// A file dropped outside the box would make the browser open it in place of this page.
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());
for (const type of ['dragenter', 'dragover']) {
  view.dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    view.dropZone.classList.add('dragging');
  });
}
view.dropZone.addEventListener('dragleave', (event) => {
  if (!view.dropZone.contains(event.relatedTarget)) view.dropZone.classList.remove('dragging');
});
view.dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  view.dropZone.classList.remove('dragging');
  const files = event.dataTransfer ? event.dataTransfer.files : null;
  if (!files || files.length === 0) {
    show('error', 'Input error: the drop held no file. Drop an image file.', { error: 'input' });
    return;
  }
  choose(files[0], files.length > 1 ? ` (the first of ${files.length} dropped files)` : '');
});

show('loading', 'Loading the scanner…');
startWorker();
loadScanner(false);
showPackage();
