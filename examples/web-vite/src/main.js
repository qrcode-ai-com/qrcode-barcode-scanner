// The page script. It hands the bytes of the chosen image to one module worker and writes what
// comes back as text. It never builds markup from a decoded value and never opens a decoded link.
import { name as packageName, version as packageVersion }
  from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/package.json';
import { wasm } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/build-info.json';
import './style.css';

const byId = (id) => document.getElementById(id);
const view = {
  file: byId('file'), dropZone: byId('drop-zone'), profile: byId('profile'),
  preview: byId('preview'), previewImage: byId('preview-image'),
  previewCaption: byId('preview-caption'), result: byId('result'), summary: byId('summary'),
  score: byId('score'), timing: byId('timing'), detections: byId('detections'),
  reportDetails: byId('report-details'), reportJson: byId('report-json'),
};

const worker = new Worker(new URL('./scanner.worker.js', import.meta.url), { type: 'module' });
const pending = new Map(); // request id -> resolve
let lastRequest = 0;
let scans = 0; // scans started; a reply is shown only while its scan is the latest
let chosen = null; // the latest image, as a File
let previewUrl = null;

worker.onmessage = ({ data }) => {
  const resolve = pending.get(data.id);
  pending.delete(data.id);
  if (resolve) resolve(data);
};
// The worker script itself did not load or run.
worker.onerror = (event) => {
  event.preventDefault();
  const reply = { ok: false, phase: 'load', error: { name: 'WorkerError', code: 'worker_failed',
    message: event.message || 'The scanner worker did not start.', qrs: null } };
  for (const resolve of pending.values()) resolve(reply);
  pending.clear();
};

function request(message, transfer = []) {
  lastRequest += 1;
  const id = lastRequest;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({ id, ...message }, transfer);
  });
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

// One place writes the result region: its state, the summary, the list and the full report.
function show(state, summary, { items = [], score = null, ms = null, report = null } = {}) {
  view.result.dataset.state = state;
  view.result.dataset.scan = String(scans);
  view.summary.textContent = summary;
  view.score.hidden = score === null;
  view.score.textContent = score ?? '';
  view.timing.hidden = ms === null;
  view.timing.textContent = ms === null ? '' : `Scanned in ${Math.round(ms)} ms on this device.`;
  view.detections.replaceChildren(...items);
  view.reportDetails.hidden = report === null;
  view.reportJson.textContent = report === null ? '' : JSON.stringify(report, null, 2);
  view.reportJson.dataset.scan = String(scans);
  view.reportJson.dataset.profile = view.profile.value;
}

// What a report proves: an absent flag is unknown, never false. The list is complete when the
// time budget cut nothing and no capacity left a read or a content out. Only then does an empty
// list prove that the image holds no code this profile can read.
function isComplete(report) {
  const trace = report.trace ?? {};
  const saturation = trace.saturation ?? {};
  return trace.budget_exhausted === false && saturation.reads === false
    && saturation.detections === false;
}

function renderDetection(detection, countsExact) {
  const item = document.createElement('li');
  const facts = element('dl', '', 'facts');
  const fact = (term, value) => {
    const row = document.createElement('div');
    row.append(element('dt', term), element('dd', value));
    facts.append(row);
  };
  fact('Symbology', String(detection.symbology));
  fact('Payload kind', detection.payload ? String(detection.payload.kind) : 'not reported');
  if (Array.isArray(detection.occurrences)) {
    const copies = detection.occurrences.length;
    fact('Copies located', countsExact ? String(copies) : `at least ${copies}`);
  }
  item.append(facts, element('pre', detection.content?.text ?? '', 'value'));
  return item;
}

function showReport(report, name, profile, ms) {
  const detections = Array.isArray(report.detections) ? report.detections : [];
  const complete = isComplete(report);
  const countsExact = complete && report.trace.saturation.occurrences === false;
  const options = { ms, report };
  if (detections.length === 0) {
    if (complete) {
      show('empty', `No code found in ${name} with the ${profile} profile. The scan finished: ` +
        'an image without a readable code is a valid result, not an error.', options);
    } else {
      show('inconclusive', `No code listed for ${name} with the ${profile} profile, and that ` +
        'does not prove the image holds none: the scan reached a capacity, or its report does ' +
        'not say.', options);
    }
    return;
  }
  const count = detections.length === 1 ? '1 code' : `${detections.length} codes`;
  const list = complete ? '' : ' More codes may be present than listed.';
  // The score judges the first code, and only some profiles compute one. null is not zero.
  const score = report.score
    ? `Scannability of the first code: ${report.score.value} out of 100 (${report.score.grade}).`
    : null;
  show('result', `${count} found in ${name} with the ${profile} profile.${list}`, {
    ...options, score, items: detections.map((row) => renderDetection(row, countsExact)),
  });
}

// A loading error, an input the scanner refused and a scanner fault are told apart from each
// other and from an empty result.
function showError(reply, name) {
  const { error = {}, phase } = reply;
  if (phase === 'load') {
    show('error', `Loading error (${error.code ?? 'unknown'}): the scanner did not load, so ` +
      `nothing was scanned. ${error.message} Reload the page to try again.`);
  } else if (error.qrs) {
    show('error', `Input error (${error.qrs}): the scanner refused ${name}. ${error.message}`);
  } else {
    show('error', `Scanner fault (${error.name}): the scanner stopped while scanning ${name}. ` +
      `Reload the page before scanning again. ${error.message}`);
  }
}

async function scan(file) {
  chosen = file;
  scans += 1;
  const serial = scans;
  const profile = view.profile.value;
  show('scanning', `Scanning ${file.name} with the ${profile} profile…`);
  const bytes = await file.arrayBuffer();
  const reply = await request({ type: 'scan', bytes, profile }, [bytes]);
  if (serial !== scans) return; // a newer image or profile replaced this scan
  if (reply.ok) showReport(reply.report, file.name, profile, reply.ms);
  else showError(reply, file.name);
}

function choose(file) {
  if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  view.previewImage.hidden = false;
  view.previewImage.alt = `The chosen image, ${file.name}`;
  view.previewImage.src = previewUrl;
  view.previewCaption.textContent = `${file.name}: ${file.size} bytes`;
  view.preview.hidden = false;
  scan(file);
}

// The three sample inputs: an image with two codes, an image with none, and bytes that are not
// an image. Each shows a different outcome.
const samples = {
  async mixed() {
    const response = await fetch(`${import.meta.env.BASE_URL}samples/mixed-code128-qr.png`);
    if (!response.ok) throw new Error(`HTTP ${response.status} for the sample image`);
    return new File([await response.blob()], 'mixed-code128-qr.png', { type: 'image/png' });
  },
  async blank() {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 200;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => { canvas.toBlob(resolve, 'image/png'); });
    return new File([blob], 'blank.png', { type: 'image/png' });
  },
  async invalid() {
    return new File(['not an image'], 'not-an-image.txt', { type: 'text/plain' });
  },
};

for (const button of document.querySelectorAll('[data-sample]')) {
  button.addEventListener('click', async () => {
    try {
      choose(await samples[button.dataset.sample]());
    } catch (error) {
      scans += 1;
      show('error', `Input error: the sample could not be read. ${error.message}`);
    }
  });
}
view.file.addEventListener('change', () => {
  const file = view.file.files?.[0];
  if (file) choose(file);
});
view.profile.addEventListener('change', () => {
  if (chosen !== null) scan(chosen);
});
view.previewImage.addEventListener('error', () => {
  view.previewImage.hidden = true;
  view.previewCaption.textContent += ' (this browser cannot display it)';
});
// A file dropped outside the box would make the browser open it in place of this page.
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());
view.dropZone.addEventListener('dragover', () => view.dropZone.classList.add('dragging'));
view.dropZone.addEventListener('dragleave', () => view.dropZone.classList.remove('dragging'));
view.dropZone.addEventListener('drop', (event) => {
  view.dropZone.classList.remove('dragging');
  const file = event.dataTransfer?.files?.[0];
  if (file) choose(file);
});

byId('package-name').textContent = packageName;
byId('package-version').textContent = packageVersion;
byId('wasm-sha256').textContent = wasm.sha256;

const loaded = await request({ type: 'load' });
if (loaded.ok) {
  byId('engine-version').textContent = String(loaded.version);
  // A scan started while the scanner was loading reports for itself.
  if (scans === 0) show('ready', 'Ready. Choose a sample or an image.');
} else if (scans === 0) {
  showError(loaded, 'the image');
}
