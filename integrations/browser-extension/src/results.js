// Plain functions that turn a scan report into what the page shows. No DOM and no browser API,
// so the unit tests run them in Node. Decoded text comes from the image, which anyone can make:
// it is only ever shown as text, and a link is only opened by an explicit click.

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

const PAYLOAD_NAMES = {
  url: 'Link',
  wifi: 'Wi-Fi network',
  email: 'Email',
  sms: 'Text message',
  tel: 'Phone number',
  geo: 'Location',
  gs1: 'GS1 element string',
  gs1_digital_link: 'GS1 Digital Link',
  me_card: 'Contact (MECARD)',
  crypto: 'Payment address',
  v_card: 'Contact (vCard)',
  v_event: 'Calendar event',
  text: 'Text',
};

/** The human name of a symbology; a newer wire value is shown as it is. */
export function symbologyName(symbology) {
  return Object.hasOwn(SYMBOLOGY_NAMES, symbology) ? SYMBOLOGY_NAMES[symbology] : String(symbology);
}

/** The human name of a payload kind; a newer kind is shown as it is. */
export function payloadName(payload) {
  const kind = payload && typeof payload.kind === 'string' ? payload.kind : 'text';
  return Object.hasOwn(PAYLOAD_NAMES, kind) ? PAYLOAD_NAMES[kind] : kind;
}

/**
 * The address a user may choose to open, or null. Only http and https: a decoded
 * `javascript:`, `data:` or `file:` text is never turned into something clickable.
 */
export function openableUrl(detection) {
  const payload = detection && detection.payload;
  const candidate = payload && (payload.kind === 'url' || payload.kind === 'gs1_digital_link')
    ? payload.url : null;
  if (typeof candidate !== 'string') return null;
  let parsed;
  try { parsed = new URL(candidate); } catch { return null; }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  return parsed.href;
}

// Characters that change how text looks without being visible themselves: C0 and C1 controls
// (tab and line breaks stay), direction overrides and isolates, and zero-width characters.
// They can make a link look like another one.
const HIDDEN = new RegExp(['[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F',
  '\\u061C\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF]'].join(''), 'gu');

/**
 * The decoded text as the page shows it: each hidden character becomes a visible
 * `<U+XXXX>` marker, drawn with U+27E8 and U+27E9. The copy button copies the exact text,
 * not this version.
 */
export function visibleText(text) {
  const value = String(text);
  let hidden = 0;
  const shown = value.replace(HIDDEN, (character) => {
    hidden += 1;
    return `\u27E8U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}\u27E9`;
  });
  return { shown, hidden };
}

/** One row per detection, in report order, with what the page needs to show and copy. */
export function describeDetections(report) {
  const detections = report && Array.isArray(report.detections) ? report.detections : [];
  return detections.map((detection, index) => {
    const content = detection.content ?? {};
    const text = typeof content.text === 'string' ? content.text : '';
    const lossy = content.charset === 'unknown';
    const { shown, hidden } = visibleText(text);
    const occurrences = Array.isArray(detection.occurrences) ? detection.occurrences.length : 1;
    return {
      index,
      symbology: detection.symbology,
      format: symbologyName(detection.symbology),
      kind: payloadName(detection.payload),
      text,
      shown,
      hidden,
      lossy,
      raw: typeof content.raw === 'string' ? content.raw : '',
      url: openableUrl(detection),
      occurrences,
    };
  });
}

/**
 * The page state a finished scan ends in, following the page contract of
 * distribution/acceptance/README.md: result, empty or inconclusive.
 */
export function finalState(report) {
  const found = report && Array.isArray(report.detections) ? report.detections.length : 0;
  if (found > 0) return 'result';
  const exhausted = Boolean(report && report.trace && report.trace.budget_exhausted === true);
  return exhausted ? 'inconclusive' : 'empty';
}

/** A short sentence for the result region. */
export function summary(report, { name, profile, ms }) {
  const found = report.detections.length;
  const where = name ? ` in ${name}` : '';
  const how = `${profile} profile${Number.isFinite(ms) ? `, ${Math.round(ms)} ms` : ''}`;
  if (found === 0) {
    return finalState(report) === 'inconclusive'
      ? `The scan stopped before it finished${where} (${how}). Try the full profile.`
      : `No QR code or barcode found${where} (${how}).`;
  }
  return `Found ${found} ${found === 1 ? 'code' : 'codes'}${where} (${how}).`;
}

/** The profile to use: a stored choice when it is valid, else the default. */
export function chooseProfile(stored) {
  return PROFILES.includes(stored) ? stored : DEFAULT_PROFILE;
}

/** Bytes to base64 and back, in chunks: a large image must not overflow the call stack. */
export function toBase64(bytes) {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

export function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
