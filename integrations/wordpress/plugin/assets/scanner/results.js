// Plain functions that turn a scan report into what the scanner shows. No DOM and no browser
// API, so the unit tests run them in Node. Decoded text comes from the image, which anyone can
// make: it is only ever shown as text, and a link is only opened by an explicit click.

export const PROFILES = ['full', 'fast', 'frame'];

// The image types the engine decodes itself, by MIME type and by their first bytes.
export const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

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

/** The name of a symbology; a newer wire value is shown as it is. */
export function symbologyName(symbology) {
  return Object.hasOwn(SYMBOLOGY_NAMES, symbology) ? SYMBOLOGY_NAMES[symbology] : String(symbology);
}

/** The translated name of a payload kind from `kinds`; a newer kind is shown as it is. */
export function payloadName(payload, kinds = {}) {
  const kind = payload && typeof payload.kind === 'string' ? payload.kind : 'text';
  return Object.hasOwn(kinds, kind) ? kinds[kind] : kind;
}

/**
 * The image type of `bytes` from its signature: one of SUPPORTED_TYPES, or null. The file's
 * own name and the type the browser reports are not trusted: the bytes decide.
 */
export function sniffType(bytes) {
  const starts = (...signature) => signature.every((byte, index) => bytes[index] === byte);
  if (bytes.length >= 8 && starts(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) return 'image/png';
  if (bytes.length >= 3 && starts(0xFF, 0xD8, 0xFF)) return 'image/jpeg';
  if (bytes.length >= 6 && (starts(0x47, 0x49, 0x46, 0x38, 0x37, 0x61)
      || starts(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))) return 'image/gif';
  if (bytes.length >= 12 && starts(0x52, 0x49, 0x46, 0x46)
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

/**
 * The address a visitor may choose to open, or null. Only http and https: a decoded
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
 * The decoded text as the scanner shows it: each hidden character becomes a visible
 * `<U+XXXX>` marker, drawn with U+27E8 and U+27E9. The copy button copies the exact text.
 */
export function visibleText(text) {
  const value = String(text);
  let hidden = 0;
  const shown = value.replace(HIDDEN, (character) => {
    hidden += 1;
    return `⟨U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}⟩`;
  });
  return { shown, hidden };
}

/** One row per detection, in report order, with what the scanner shows and copies. */
export function describeDetections(report, kinds = {}) {
  const detections = report && Array.isArray(report.detections) ? report.detections : [];
  return detections.map((detection, index) => {
    const content = detection.content ?? {};
    const text = typeof content.text === 'string' ? content.text : '';
    const { shown, hidden } = visibleText(text);
    return {
      index,
      symbology: detection.symbology,
      format: symbologyName(detection.symbology),
      kind: payloadName(detection.payload, kinds),
      text,
      shown,
      hidden,
      lossy: content.charset === 'unknown',
      url: openableUrl(detection),
    };
  });
}

/**
 * The state a finished scan ends in, following the page contract of the engine's
 * distribution/acceptance/README.md: result, empty or inconclusive.
 */
export function finalState(report) {
  const found = report && Array.isArray(report.detections) ? report.detections.length : 0;
  if (found > 0) return 'result';
  const exhausted = Boolean(report && report.trace && report.trace.budget_exhausted === true);
  return exhausted ? 'inconclusive' : 'empty';
}

/** `template` with %s, %d, %1$s and %2$s replaced by `values`, in order or by position. */
export function format(template, ...values) {
  let next = 0;
  return String(template).replace(/%(?:(\d+)\$)?[sd]/g, (match, position) => {
    const index = position ? Number(position) - 1 : next++;
    return index < values.length ? String(values[index]) : match;
  });
}
