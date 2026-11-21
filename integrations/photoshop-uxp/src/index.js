// SPDX-License-Identifier: MIT
// The panel of the Photoshop plugin. Scan the document reads the composite image of the active
// document, Scan the selection the selection's bounding rectangle, through Photoshop's Imaging
// API; Scan an image file reads a file the user picks. The engine (engine.js) reads the pixels
// or the file in the panel, and each code is shown as text.
//
// For the test in test/uxp-panel.mjs the panel keeps the DOM contract of the other scanner pages
// of this repository: #result carries data-state and data-scan, #summary the sentence,
// .detection[data-symbology] .text each decoded text, and #report-json the report of the scan with
// data-scan and data-profile. Attributes are set with setAttribute, which UXP supports.
import { startEngine, scanFile, scanPixels } from './engine.js';
import { MAX_BYTES, SUPPORTED, imageFormat } from './image.js';
import { ReadError, readPixels } from './photoshop.js';
import { DEFAULT_PROFILE, PROFILES, describeDetections, finalState } from './results.js';

// Each scan may run this long before the engine stops it and says so. The scan runs on the
// plugin's thread, so the bound also bounds how long the panel waits.
export const BUDGET_MS = 20000;
export const FILE_TYPES = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

const photoshop = require('photoshop');
const uxp = require('uxp');

const $ = (selector) => document.querySelector(selector);

let scanNumber = 0;
let busy = true;
let lastItem = null;
let lastProfile = '';
let reportShown = false;

function profile() {
  const value = $('#profile').value;
  return PROFILES.includes(value) ? value : DEFAULT_PROFILE;
}

function setBusy(value) {
  busy = value;
  for (const id of ['#scan-document', '#scan-selection', '#scan-file']) $(id).disabled = value;
}

function setState(state, summary, note = '') {
  $('#result').setAttribute('data-state', state);
  $('#result').setAttribute('data-scan', String(scanNumber));
  $('#summary').textContent = summary;
  $('#note').textContent = note;
}

const KIND_NAMES = {
  url: 'Link', wifi: 'Wi-Fi network', email: 'Email', sms: 'Text message', tel: 'Phone number',
  geo: 'Location', gs1: 'GS1 element string', gs1_digital_link: 'GS1 Digital Link',
  me_card: 'Contact (MECARD)', crypto: 'Payment address', v_card: 'Contact (vCard)',
  v_event: 'Calendar event', text: 'Text',
};
const FORMAT_NAMES = { png: 'PNG', jpeg: 'JPEG', webp: 'WebP', gif: 'GIF' };

export function errorText(error) {
  switch (error?.kind) {
    case 'no-document': return 'Open a document first.';
    case 'no-selection': return 'Make a selection on the canvas first, or scan the whole document.';
    case 'unsupported':
      return `This file is in a format the scanner does not read (${String(error.detail).toUpperCase()}). It reads PNG, JPEG, WebP and GIF.`;
    case 'too-large': return 'This file is larger than 32 MB, which this plugin does not read.';
    case 'engine': return `The scanner could not start in this version of Photoshop: ${error.detail}`;
    case 'read': return `Photoshop could not give the pixels: ${error.detail}`;
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
  while (items.firstChild) items.removeChild(items.firstChild);
  const report = $('#report-json');
  report.textContent = lastItem?.report ? JSON.stringify(lastItem.report, null, 2) : '';
  report.setAttribute('data-scan', lastItem?.report ? String(scanNumber) : '0');
  report.setAttribute('data-profile', lastItem?.report ? lastProfile : '');
  $('#toggle-report').disabled = !lastItem?.report;
  if (!lastItem?.report) return;
  const section = element('div', { class: 'item' });
  section.appendChild(element('h2', {}, lastItem.heading));
  const rows = describeDetections(lastItem.report, $('#expected').value);
  if (rows.length === 0) section.appendChild(element('p', { class: 'help' }, 'No code in this image.'));
  for (const row of rows) {
    const block = element('div', { class: 'detection', 'data-symbology': row.symbology });
    block.appendChild(element('p', { class: 'format' }, `${row.format} · ${KIND_NAMES[row.kind]}`));
    block.appendChild(element('p', { class: 'text' }, row.shown));
    if (row.matches !== null) {
      block.appendChild(element('p', { class: `badge ${row.matches ? 'match' : 'differ'}` }, row.matches ? 'Matches' : 'Differs'));
    }
    if (row.hidden > 0) {
      block.appendChild(element('p', { class: 'help' }, `${row.hidden} invisible character${row.hidden === 1 ? ' is' : 's are'} shown by ${row.hidden === 1 ? 'its' : 'their'} code point.`));
    }
    if (row.lossy) block.appendChild(element('p', { class: 'help' }, 'Some bytes are not text in a known character set.'));
    section.appendChild(block);
  }
  items.appendChild(section);
}

// ------------------------------------------------------------------ reading

async function readDocument(area) {
  try {
    const pixels = await readPixels(photoshop, area);
    const what = area === 'selection' ? 'The selection' : 'The document';
    return { ...pixels, heading: `${what}: ${pixels.width} x ${pixels.height} pixels` };
  } catch (error) {
    if (error instanceof ReadError) throw error;
    throw new ReadError('read', String(error?.message ?? error));
  }
}

async function readFile() {
  const file = await uxp.storage.localFileSystem.getFileForOpening({ types: FILE_TYPES });
  if (!file) return null;
  const bytes = new Uint8Array(await file.read({ format: uxp.storage.formats.binary }));
  const format = imageFormat(bytes);
  if (!SUPPORTED.includes(format)) throw new ReadError('unsupported', format);
  if (bytes.length > MAX_BYTES) throw new ReadError('too-large', bytes.length);
  return { bytes, heading: `${file.name}: ${FORMAT_NAMES[format]}, ${Math.ceil(bytes.length / 1024)} KB` };
}

function summaryOf(state, report) {
  const count = report?.detections.length ?? 0;
  return {
    result: `Found ${count} code${count === 1 ? '' : 's'}.`,
    empty: 'No QR code or barcode found.',
    inconclusive: 'The scan stopped at its time limit before it finished. Try the fast profile.',
  }[state];
}

async function scan(source) {
  if (busy) return;
  const chosen = profile();
  const before = [$('#result').getAttribute('data-state'), $('#summary').textContent, $('#note').textContent];
  scanNumber += 1;
  setBusy(true);
  setState('scanning', `Reading with the ${chosen} profile…`);
  try {
    const item = source === 'file' ? await readFile() : await readDocument(source);
    if (!item) {
      // The file dialog was closed without a file: the panel shows what it showed before.
      setState(...before);
      return;
    }
    // Let the panel draw the reading state before the engine holds the thread.
    await new Promise((resolve) => setTimeout(resolve, 0));
    startEngineOnce();
    const report = item.bytes
      ? scanFile(item.bytes, chosen, BUDGET_MS)
      : scanPixels(item.rgba, item.width, item.height, chosen, BUDGET_MS);
    lastItem = { heading: item.heading, report };
    lastProfile = chosen;
    render();
    const state = finalState(report);
    const note = item.scaled
      ? `The area is larger than 4096 x 4096 pixels, so Photoshop gave it at ${item.width} x ${item.height}. A small code reads better from a selection around it.`
      : '';
    setState(state, summaryOf(state, report), note);
  } catch (error) {
    lastItem = null;
    render();
    setState('error', errorText(error?.kind ? error : { kind: 'scan', detail: String(error?.message ?? error) }));
  } finally {
    setBusy(false);
  }
}

// ------------------------------------------------------------------ start

class EngineError extends Error {
  constructor(detail) {
    super(detail);
    this.kind = 'engine';
    this.detail = detail;
  }
}

function startEngineOnce() {
  try {
    return startEngine();
  } catch (error) {
    throw new EngineError(String(error?.message ?? error));
  }
}

function start() {
  try {
    const { version, engine } = startEngineOnce();
    const about = $('#about');
    about.setAttribute('data-package', engine.package);
    about.setAttribute('data-version', engine.version);
    about.setAttribute('data-wasm-sha256', engine.wasm_sha256);
    about.setAttribute('data-engine-version', version);
  } catch (error) {
    setState('error', errorText(error));
    return;
  }
  $('#scan-document').addEventListener('click', () => scan('document'));
  $('#scan-selection').addEventListener('click', () => scan('selection'));
  $('#scan-file').addEventListener('click', () => scan('file'));
  $('#expected').addEventListener('input', render);
  $('#toggle-report').addEventListener('click', () => {
    reportShown = !reportShown;
    $('#report-json').style.display = reportShown ? 'block' : 'none';
    $('#toggle-report').textContent = reportShown ? 'Hide the full report' : 'Show the full report';
  });
  setBusy(false);
  setState('ready', '');
}

uxp.entrypoints.setup({ panels: { scanner: { show() {} } } });
// Entry point handlers must return within 300 ms; the engine starts after the panel shows.
setTimeout(start, 0);
