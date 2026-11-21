// SPDX-License-Identifier: MIT
// Plain functions that turn a scan report into what the panel shows. No DOM and no Canva API, so
// the unit tests run them in Node. Adapted from integrations/browser-extension/src/results.js.
// Decoded text comes from the image, which anyone can make: it is only ever shown as text.

export const PROFILES = ['fast', 'frame', 'full'];
export const DEFAULT_PROFILE = 'full';

const SYMBOLOGY_NAMES = {
  qr_code: 'QR Code',
  micro_qr_code: 'Micro QR Code',
  rectangular_micro_qr_code: 'rMQR Code',
  data_matrix: 'Data Matrix',
  aztec: 'Aztec',
  pdf417: 'PDF417',
  maxi_code: 'MaxiCode',
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  code128: 'Code 128',
  code39: 'Code 39',
  code93: 'Code 93',
  codabar: 'Codabar',
  itf: 'ITF',
  data_bar: 'GS1 DataBar',
  data_bar_expanded: 'GS1 DataBar Expanded',
  telepen: 'Telepen',
};

/** The name of a symbology, a proper name in every language; a newer wire value as it is. */
export function symbologyName(symbology) {
  return Object.hasOwn(SYMBOLOGY_NAMES, symbology) ? SYMBOLOGY_NAMES[symbology] : String(symbology);
}

// The payload kinds the panel names; any other kind is shown as plain text.
export const PAYLOAD_KINDS = ['url', 'wifi', 'email', 'sms', 'tel', 'geo', 'gs1',
  'gs1_digital_link', 'me_card', 'crypto', 'v_card', 'v_event', 'text'];

export function payloadKind(payload) {
  const kind = payload && typeof payload.kind === 'string' ? payload.kind : 'text';
  return PAYLOAD_KINDS.includes(kind) ? kind : 'text';
}

// Characters that change how text looks without being visible themselves: C0 and C1 controls
// (tab and line breaks stay), direction overrides and isolates, and zero-width characters.
const HIDDEN = new RegExp(['[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F',
  '\\u061C\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF]'].join(''), 'gu');

/** The decoded text with each hidden character shown as a visible <U+XXXX> marker. */
export function visibleText(text) {
  const value = String(text);
  let hidden = 0;
  const shown = value.replace(HIDDEN, (character) => {
    hidden += 1;
    return `⟨U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}⟩`;
  });
  return { shown, hidden };
}

/**
 * One row per detection, in report order. `matches` is true when an expected text was typed
 * and the decoded text equals it exactly, false when one was typed and differs, null otherwise.
 */
export function describeDetections(report, expected = '') {
  const detections = report && Array.isArray(report.detections) ? report.detections : [];
  const wanted = String(expected);
  return detections.map((detection, index) => {
    const content = detection.content ?? {};
    const text = typeof content.text === 'string' ? content.text : '';
    const { shown, hidden } = visibleText(text);
    return {
      index,
      symbology: detection.symbology,
      format: symbologyName(detection.symbology),
      kind: payloadKind(detection.payload),
      text,
      shown,
      hidden,
      lossy: content.charset === 'unknown',
      matches: wanted === '' ? null : text === wanted,
    };
  });
}

/** The state a finished scan of one image ends in: result, empty or inconclusive. */
export function finalState(report) {
  const found = report && Array.isArray(report.detections) ? report.detections.length : 0;
  if (found > 0) return 'result';
  const exhausted = Boolean(report && report.trace && report.trace.budget_exhausted === true);
  return exhausted ? 'inconclusive' : 'empty';
}

/** The state of a scan of several images: the best of their states, error when all failed. */
export function combinedState(items) {
  const states = items.map((item) => (item.report ? finalState(item.report) : 'error'));
  for (const state of ['result', 'inconclusive', 'empty']) if (states.includes(state)) return state;
  return 'error';
}

export function chooseProfile(stored) {
  return PROFILES.includes(stored) ? stored : DEFAULT_PROFILE;
}
