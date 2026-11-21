// SPDX-License-Identifier: MIT
// The panel of the Adobe Express add-on. It asks Adobe Express for a PNG rendition of the current
// page or of every page, with the preview intent: the rendition is only read by the scanner, never
// shown, downloaded or shared. A file the user chooses is read the same way. The bytes go to the
// scanner worker (scanner-worker.js, the published engine inlined), and the panel shows each code
// as text.
//
// For the test in test/express-panel.mjs the panel keeps the DOM contract of the other scanner
// pages of this repository: #result carries data-state and data-scan, #summary the sentence,
// .detection[data-symbology] .text each decoded text, and #report-json the report of the first
// image with data-scan and data-profile.
import addOnUISdk from 'https://express.adobe.com/static/add-on-sdk/sdk.js';
import { MAX_BYTES, SUPPORTED, imageFormat } from './image.js';
import { DEFAULT_PROFILE, PROFILES, combinedState, describeDetections } from './results.js';

// Each scan may run this long before the engine stops it and says so.
export const BUDGET_MS = 20000;
// The pages of a long document read by Scan all pages, from the first one.
export const MAX_PAGES = 20;

const $ = (selector) => document.querySelector(selector);

// ------------------------------------------------------------------ the scanner worker

const worker = new Worker('scanner-worker.js');
const pending = new Map();
let nextId = 0;
worker.onmessage = (event) => {
  const waiting = pending.get(event.data?.id);
  if (!waiting) return;
  pending.delete(event.data.id);
  if (event.data.ok) waiting.resolve(event.data);
  else waiting.reject(new Error(event.data.error));
};
worker.onerror = (event) => {
  const error = new Error(event.message || 'the scanner worker stopped');
  for (const waiting of pending.values()) waiting.reject(error);
  pending.clear();
};
function call(message, transfer = []) {
  return new Promise((resolve, reject) => {
    nextId += 1;
    pending.set(nextId, { resolve, reject });
    worker.postMessage({ ...message, id: nextId }, transfer);
  });
}

// ------------------------------------------------------------------ state

let scanNumber = 0;
let busy = true;
let lastItems = [];
let lastProfile = '';

function profile() {
  const value = document.querySelector('input[name="profile"]:checked')?.value;
  return PROFILES.includes(value) ? value : DEFAULT_PROFILE;
}

function setBusy(value) {
  busy = value;
  for (const id of ['#scan-page', '#scan-document', '#file']) $(id).disabled = value;
  $('#choose-file').setAttribute('aria-disabled', String(value));
}

function setState(state, summary) {
  $('#result').dataset.state = state;
  $('#result').dataset.scan = String(scanNumber);
  $('#summary').textContent = summary;
}

const FORMAT_NAMES = { png: 'PNG', jpeg: 'JPEG', webp: 'WebP', gif: 'GIF' };
const KIND_NAMES = {
  url: 'Link', wifi: 'Wi-Fi network', email: 'Email', sms: 'Text message', tel: 'Phone number',
  geo: 'Location', gs1: 'GS1 element string', gs1_digital_link: 'GS1 Digital Link',
  me_card: 'Contact (MECARD)', crypto: 'Payment address', v_card: 'Contact (vCard)',
  v_event: 'Calendar event', text: 'Text',
};

function errorText(error) {
  switch (error?.kind) {
    case 'unsupported':
      return `This file is in a format the scanner does not read (${String(error.detail).toUpperCase()}). It reads PNG, JPEG, WebP and GIF.`;
    case 'too-large': return 'This file is larger than 32 MB, which this add-on does not read.';
    case 'rendition': return `Adobe Express could not render the page: ${error.detail}`;
    case 'engine': return `The scanner could not start: ${error.detail}`;
    default: return `The scanner could not read this image: ${error?.detail ?? ''}`;
  }
}

function element(tag, attributes = {}, text = null) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== null) node.textContent = text;
  return node;
}

function render() {
  const items = $('#items');
  items.replaceChildren();
  const expected = $('#expected').value;
  for (const item of lastItems) {
    const section = element('section', { class: 'item' });
    if (!item.report) {
      section.append(element('h2', {}, item.label), element('p', { class: 'error' }, errorText(item.error)));
      items.append(section);
      continue;
    }
    const heading = `${item.label}: ${FORMAT_NAMES[item.format] ?? item.format}, ${Math.ceil(item.bytes / 1024)} KB`;
    section.append(element('h2', {}, heading));
    const rows = describeDetections(item.report, expected);
    if (rows.length === 0) section.append(element('p', { class: 'help' }, 'No code on this image.'));
    const list = element('ul', { class: 'detections' });
    for (const row of rows) {
      const li = element('li', { class: 'detection', 'data-symbology': row.symbology });
      li.append(element('p', { class: 'format' }, `${row.format} · ${KIND_NAMES[row.kind]}`));
      li.append(element('p', { class: 'text' }, row.shown));
      if (row.matches !== null) {
        li.append(element('p', { class: `badge ${row.matches ? 'match' : 'differ'}` }, row.matches ? 'Matches' : 'Differs'));
      }
      if (row.hidden > 0) {
        li.append(element('p', { class: 'help' }, `${row.hidden} invisible character${row.hidden === 1 ? ' is' : 's are'} shown by ${row.hidden === 1 ? 'its' : 'their'} code point.`));
      }
      if (row.lossy) li.append(element('p', { class: 'help' }, 'Some bytes are not text in a known character set.'));
      list.append(li);
    }
    section.append(list);
    items.append(section);
  }
  const first = lastItems.find((item) => item.report)?.report ?? null;
  const report = $('#report-json');
  report.textContent = first ? JSON.stringify(first, null, 2) : '';
  report.dataset.scan = first ? String(scanNumber) : '0';
  report.dataset.profile = first ? lastProfile : '';
}

// ------------------------------------------------------------------ reading images

async function renditions(range, label) {
  const { constants } = addOnUISdk;
  const pages = await addOnUISdk.app.document.createRenditions(
    { range, format: constants.RenditionFormat.png },
    constants.RenditionIntent.preview,
  );
  return Promise.all(pages.slice(0, MAX_PAGES).map(async (page, index) => ({
    label: label(index), bytes: new Uint8Array(await page.blob.arrayBuffer()),
  })));
}

async function scanOne({ label, bytes }, chosen) {
  const format = imageFormat(bytes);
  const size = bytes.length;
  if (!SUPPORTED.includes(format)) return { label, format, bytes: size, report: null, error: { kind: 'unsupported', detail: format } };
  if (size > MAX_BYTES) return { label, format, bytes: size, report: null, error: { kind: 'too-large', detail: size } };
  try {
    const { report } = await call({ type: 'scan', bytes: bytes.buffer, profile: chosen, budgetMs: BUDGET_MS }, [bytes.buffer]);
    return { label, format, bytes: size, report, error: null };
  } catch (error) {
    return { label, format, bytes: size, report: null, error: { kind: 'scan', detail: String(error?.message ?? error) } };
  }
}

async function scan(source) {
  if (busy) return;
  const chosen = profile();
  scanNumber += 1;
  setBusy(true);
  setState('scanning', `Reading with the ${chosen} profile…`);
  lastItems = [];
  render();
  let images;
  try {
    images = await source();
  } catch (error) {
    lastItems = [];
    render();
    setState('error', errorText({ kind: 'rendition', detail: String(error?.message ?? error) }));
    setBusy(false);
    return;
  }
  const items = [];
  for (const image of images) items.push(await scanOne(image, chosen));
  lastItems = items;
  lastProfile = chosen;
  const state = images.length === 0 ? 'empty' : combinedState(items);
  const count = items.reduce((sum, item) => sum + (item.report?.detections.length ?? 0), 0);
  const summaries = {
    result: `Found ${count} code${count === 1 ? '' : 's'}.`,
    empty: 'No QR code or barcode found.',
    inconclusive: 'The scan stopped at its time limit before it finished. Try the fast profile.',
    error: errorText(items[0]?.error),
  };
  render();
  setState(state, summaries[state]);
  setBusy(false);
}

// ------------------------------------------------------------------ start

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

async function main() {
  for (const input of document.querySelectorAll('input[name="profile"]')) {
    input.addEventListener('change', () => { $('#profile').dataset.value = profile(); });
  }
  $('#expected').addEventListener('input', render);
  await addOnUISdk.ready;
  applyTheme(addOnUISdk.app.ui.theme);
  addOnUISdk.app.on('themechange', (data) => applyTheme(data.theme));
  try {
    const { version, engine } = await call({ type: 'init' });
    const about = $('#about');
    about.dataset.package = engine.package;
    about.dataset.version = engine.version;
    about.dataset.wasmSha256 = engine.wasm_sha256;
    about.dataset.engineVersion = version;
  } catch (error) {
    setState('error', errorText({ kind: 'engine', detail: String(error?.message ?? error) }));
    return;
  }
  const { Range } = addOnUISdk.constants;
  $('#scan-page').addEventListener('click', () => scan(() => renditions(Range.currentPage, () => 'This page')));
  $('#scan-document').addEventListener('click', () => scan(() => renditions(Range.entireDocument, (index) => `Page ${index + 1}`)));
  $('#file').addEventListener('change', (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (file) scan(async () => [{ label: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }]);
  });
  setBusy(false);
  setState('ready', '');
}

main();
