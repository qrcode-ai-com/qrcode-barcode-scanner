// The scanner page, shown as the toolbar popup and as a tab. It reads an image the user drops,
// pastes or chooses, or the one sent by the "Scan this image" menu item, and shows each code it
// finds as text. It follows the page contract of distribution/acceptance/README.md: #file,
// #profile, #result (data-state, data-scan) and #report-json (data-scan, data-profile).
import {
  chooseProfile, describeDetections, finalState, fromBase64, summary,
} from './results.js';

// Absent when the page is opened outside the extension, as the Firefox page test does.
const api = globalThis.browser ?? globalThis.chrome;
const extension = Boolean(api && api.runtime && api.runtime.id);
const firefox = Boolean(globalThis.browser && globalThis.browser.runtime
  && typeof globalThis.browser.runtime.getBrowserInfo === 'function');

const params = new URLSearchParams(location.search);
const view = params.get('view') === 'popup' ? 'popup' : 'tab';
document.documentElement.dataset.view = view;

const $ = (id) => document.getElementById(id);
const fileInput = $('file');
const profileSelect = $('profile');
const result = $('result');
const summaryText = $('summary');
const list = $('detections');
const reportJson = $('report-json');
const drop = $('drop');

const PROFILE_KEY = 'qrscan.profile';
profileSelect.value = chooseProfile(readStored(PROFILE_KEY));

let current = null; // { bytes: Uint8Array, name }
let scans = 0;
let ready = false;

function readStored(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function setState(state, text) {
  result.dataset.state = state;
  summaryText.textContent = text;
}

// ------------------------------------------------------------------ the scanner worker

let worker = null;
let nextId = 0;
const replies = new Map();

function startWorker() {
  worker = new Worker(new URL('./scanner-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    const resolve = replies.get(event.data && event.data.id);
    if (resolve) { replies.delete(event.data.id); resolve(event.data); }
  };
  // A worker that cannot start (a blocked module, a refused policy) answers nothing.
  worker.onerror = (event) => {
    event.preventDefault();
    const error = { name: 'Error', message: event.message || 'The scanner worker could not start' };
    for (const [id, resolve] of replies) {
      replies.delete(id);
      resolve({ id, ok: false, phase: 'load', error });
    }
  };
}

function ask(request, transfer = []) {
  return new Promise((resolve) => {
    nextId += 1;
    replies.set(nextId, resolve);
    worker.postMessage({ ...request, id: nextId }, transfer);
  });
}

function failure(reply) {
  const error = reply.error || {};
  if (reply.phase === 'load') {
    return `The scanner could not load in this browser (${error.code || error.message}).`;
  }
  if (error.qrs === 'QRS-001' || error.qrs === 'QRS-002') {
    return `This file could not be read as a PNG, JPEG, WebP or GIF image (${error.qrs}).`;
  }
  return `The scan failed: ${error.message}`;
}

// ------------------------------------------------------------------ showing a report

function clearResults() {
  list.replaceChildren();
}

function note(text) {
  const paragraph = document.createElement('p');
  paragraph.className = 'note';
  paragraph.textContent = text;
  return paragraph;
}

function copyButton(label, value) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy';
  button.textContent = label;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy failed: select the text';
    }
    setTimeout(() => { button.textContent = label; }, 1600);
  });
  return button;
}

function renderDetections(report) {
  clearResults();
  for (const row of describeDetections(report)) {
    const item = document.createElement('li');
    item.className = 'detection';
    item.dataset.symbology = row.symbology;

    const meta = document.createElement('p');
    meta.className = 'meta';
    const format = document.createElement('span');
    format.className = 'format';
    format.textContent = row.format;
    meta.append(format, ` \u00B7 ${row.kind}`);
    if (row.occurrences > 1) meta.append(` \u00B7 seen ${row.occurrences} times in the image`);

    // Decoded text is shown as text only: textContent, never markup.
    const text = document.createElement('output');
    text.className = 'text';
    text.textContent = row.shown;
    text.dataset.exact = row.hidden === 0 ? 'true' : 'false';

    item.append(meta, text);
    if (row.hidden > 0) {
      item.append(note(`This text holds ${row.hidden} invisible or direction-changing `
        + 'characters, shown here by their code point. Copy keeps the exact text.'));
    }
    if (row.lossy) {
      item.append(note('Some bytes are not text in a known character set; they are shown as '
        + '\uFFFD. Copy the raw bytes to keep every byte.'));
    }
    if (row.url) {
      item.append(note('This link was not opened. Read the address before you open it.'));
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(copyButton('Copy text', row.text));
    if (row.lossy) actions.append(copyButton('Copy raw bytes (base64)', row.raw));
    if (row.url) {
      const open = document.createElement('a');
      open.className = 'open';
      open.href = row.url;
      open.target = '_blank';
      open.rel = 'noopener noreferrer';
      open.textContent = 'Open link in a new tab';
      actions.append(open);
    }
    item.append(actions);
    list.append(item);
  }
}

async function scanCurrent() {
  if (!current || !ready) return;
  const profile = profileSelect.value;
  scans += 1;
  const scan = scans;
  result.dataset.scan = String(scan);
  // The previous result goes first: a failed or empty scan never leaves an older code on screen.
  clearResults();
  setState('scanning', `Reading ${current.name} with the ${profile} profile...`);
  const bytes = current.bytes.slice().buffer;
  const reply = await ask({ type: 'scan', bytes, profile }, [bytes]);
  if (scan !== scans) return;
  reportJson.dataset.scan = String(scan);
  reportJson.dataset.profile = profile;
  if (!reply.ok) {
    reportJson.textContent = '';
    setState('error', failure(reply));
    return;
  }
  reportJson.textContent = JSON.stringify(reply.report, null, 2);
  renderDetections(reply.report);
  setState(finalState(reply.report), summary(reply.report,
    { name: current.name, profile, ms: reply.ms }));
}

function useImage(bytes, name) {
  current = { bytes, name };
  return scanCurrent();
}

async function useFile(file) {
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await useImage(bytes, file.name ? `\u201C${file.name}\u201D` : 'the pasted image');
}

// ------------------------------------------------------------------ the image from the menu

const REASONS = {
  permission: (answer) => `The site ${answer.host} does not let other sites read this image. `
    + `Allow the extension to read images from ${answer.host}, or save the image and drop it here.`,
  unsupported: (answer) => (answer.scheme === 'file'
    ? 'This image is a file on your computer. Drop it here or choose it, or allow access to file '
      + 'URLs in the extension settings.'
    : `This image exists only inside the page (${answer.scheme || 'unknown'} address), so the `
      + 'extension cannot read it. Save the image, then drop it here or choose it.'),
  http: (answer) => `The site answered HTTP ${answer.status} for this image. `
    + 'Save it and drop it here.',
  'too-large': () => 'This image is larger than 32 MB.',
  unreadable: () => 'The image could not be read again from its site. Save it and drop it here.',
  expired: () => 'This request has expired. Right-click the image and choose Scan this image '
    + 'again.',
};

function showSource(answer) {
  $('source').hidden = false;
  const address = String(answer.srcUrl || '');
  $('source-title').textContent = answer.host ? `Image from ${answer.host}` : 'Image from the page';
  $('source-url').textContent = address.length > 240 ? `${address.slice(0, 240)}...` : address;
  $('source-url').title = address.slice(0, 2048);
  const reason = REASONS[answer.reason] || REASONS.unreadable;
  $('source-message').textContent = answer.ok ? '' : reason(answer);
  const allow = $('allow-site');
  allow.hidden = answer.reason !== 'permission';
  if (!allow.hidden) {
    allow.textContent = `Allow ${answer.host}`;
    allow.onclick = () => { void allowAndRead(answer); };
  }
}

// A per-site permission, asked for on the user's click only. With it, the background reads
// the image again; the page never fetches an image itself.
async function allowAndRead(answer) {
  let granted = false;
  try {
    granted = await api.permissions.request({ origins: [answer.pattern] });
  } catch {
    granted = false;
  }
  if (!granted) {
    $('source-message').textContent = `No permission for ${answer.host}. `
      + 'Save the image and drop it here.';
    return;
  }
  let again;
  try {
    again = await api.runtime.sendMessage({ type: 'qrscan:read-again', srcUrl: answer.srcUrl });
  } catch {
    again = undefined;
  }
  const fallback = { ...answer, reason: 'unreadable' };
  await showAnswer(again && typeof again === 'object' ? again : fallback);
}

async function showAnswer(answer) {
  showSource(answer);
  if (answer.ok) {
    const name = answer.host ? `the image from ${answer.host}` : 'the image';
    await useImage(fromBase64(answer.base64), name);
  } else if (!current) {
    setState('ready', 'Drop an image here, paste a screenshot or choose a file.');
  }
}

async function takeRequest(id) {
  $('source').hidden = false;
  $('source-message').textContent = 'Reading the image you chose...';
  let answer;
  try {
    answer = await api.runtime.sendMessage({ type: 'qrscan:take-request', id });
  } catch {
    answer = undefined;
  }
  const fallback = { ok: false, reason: 'expired' };
  await showAnswer(answer && typeof answer === 'object' ? answer : fallback);
}

// ------------------------------------------------------------------ inputs

profileSelect.addEventListener('change', () => {
  try { localStorage.setItem(PROFILE_KEY, profileSelect.value); } catch { /* private mode */ }
  void scanCurrent();
});

fileInput.addEventListener('change', () => {
  const [file] = fileInput.files;
  void useFile(file);
});

$('choose').addEventListener('click', () => {
  // Firefox closes a popup when its file chooser opens: choose from a tab there.
  if (firefox && view === 'popup') {
    void api.tabs.create({ url: api.runtime.getURL('scanner.html') }).then(() => window.close());
    return;
  }
  fileInput.click();
});

if (extension && view === 'popup') {
  const openTab = $('open-tab');
  openTab.hidden = false;
  openTab.addEventListener('click', () => {
    void api.tabs.create({ url: api.runtime.getURL('scanner.html') }).then(() => window.close());
  });
}

for (const name of ['dragenter', 'dragover']) {
  drop.addEventListener(name, (event) => { event.preventDefault(); drop.classList.add('over'); });
}
drop.addEventListener('dragleave', () => { drop.classList.remove('over'); });
drop.addEventListener('drop', (event) => {
  event.preventDefault();
  drop.classList.remove('over');
  const [file] = event.dataTransfer ? event.dataTransfer.files : [];
  if (file) {
    void useFile(file);
  } else {
    setState('ready', 'That was an address, not a file. Right-click the image on its page and '
      + 'choose Scan this image, or save it first.');
  }
});

document.addEventListener('paste', (event) => {
  const files = event.clipboardData ? [...event.clipboardData.files] : [];
  const image = files.find((file) => file.type.startsWith('image/'));
  if (image) { event.preventDefault(); void useFile(image); }
});

// ------------------------------------------------------------------ start

async function describePackage() {
  try {
    const info = await (await fetch('vendor/qrcode-barcode-scanner-wasm/build-info.json')).json();
    $('package-version').textContent = info.version;
    $('wasm-sha256').textContent = info.wasm.sha256;
  } catch {
    $('package-version').textContent = '';
  }
}

async function start() {
  void describePackage();
  startWorker();
  const loaded = await ask({ type: 'load' });
  if (!loaded.ok) {
    setState('error', failure(loaded));
    return;
  }
  $('engine-version').textContent = loaded.version;
  ready = true;
  const request = params.get('request');
  if (request && extension) {
    await takeRequest(request);
  } else if (current) {
    await scanCurrent();
  } else {
    setState('ready', 'Drop an image here, paste a screenshot or choose a file.');
  }
}

void start();
