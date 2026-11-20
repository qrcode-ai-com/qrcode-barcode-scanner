// SPDX-License-Identifier: MIT
// Scanning and presentation, free of any editor API: the worker and the tests share it.
import { BmpError, decodeBmp, isBmp } from './bmp.mjs';

export const PROFILES = ['full', 'fast', 'frame'];
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];
/** Larger files are refused before they are read: a scan holds the whole file in memory. */
export const MAX_FILE_BYTES = 64 * 1024 * 1024;

/** Wire names of spec/scan-report.schema.json `Symbology`, as people write them. */
const FORMAT_NAMES = {
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

/** A format name for a wire symbology; an unknown future value is shown as sent. */
export function formatName(symbology) {
  return Object.hasOwn(FORMAT_NAMES, symbology) ? FORMAT_NAMES[symbology] : String(symbology);
}

export function knownFormats() {
  return Object.keys(FORMAT_NAMES);
}

/** The lowercase extension of a path or file name, without its dot. */
export function extensionOf(name) {
  const base = String(name).split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

export function isSupportedImage(name) {
  return IMAGE_EXTENSIONS.includes(extensionOf(name));
}

/** Read the setting values; anything outside their domain falls back to the engine default. */
export function scanOptions(profile, budgetMs) {
  const chosen = PROFILES.includes(profile) ? profile : 'full';
  const budget = Number.isInteger(budgetMs) && budgetMs >= 0 && budgetMs <= 60000 ? budgetMs : undefined;
  return { profile: chosen, budgetMs: budget };
}

/** The engine's `[QRS-xxx]` code inside an error message, when it has one. */
export function errorCode(message) {
  const match = /\[(QRS-\d{3})\]/.exec(String(message));
  return match ? match[1] : null;
}

/**
 * Scan one encoded image with the WASM module's exports. PNG, JPEG, WebP and GIF go to
 * scan_image; a BMP is decoded here and its pixels go to scan_frame. Returns the engine report
 * unchanged, with the entry point that produced it.
 */
export function scanBytes(scanner, bytes, { profile, budgetMs } = {}) {
  const options = scanOptions(profile, budgetMs);
  if (isBmp(bytes)) {
    const { width, height, rgba } = decodeBmp(bytes);
    const report = scanner.scan_frame(rgba, width, height, options.profile, options.budgetMs);
    return { report, entry: 'scan_frame', options, pixels: { width, height } };
  }
  const report = scanner.scan_image(bytes, options.profile, undefined, undefined, options.budgetMs);
  return { report, entry: 'scan_image', options };
}

/** Turn a thrown value into a plain, serializable error. */
export function describeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return { message, code: errorCode(message), kind: error instanceof BmpError ? 'bmp' : 'engine' };
}

// Decoded text is chosen by whoever made the image. Shown text keeps tabs but escapes other
// control characters and the bidirectional controls that can reorder what a reader sees.
const HIDDEN = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu;

// What JSON.stringify leaves unescaped inside strings: it escapes every C0 control itself.
const JSON_HIDDEN = /[\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu;

export function printable(text) {
  return String(text).replace(HIDDEN, (char) => `\\u{${char.codePointAt(0).toString(16).padStart(4, '0')}}`);
}

/**
 * The report as JSON. JSON.stringify already escapes C0 controls inside strings; this also
 * escapes DEL, C1 and the bidirectional controls, as JSON escapes, so the value is unchanged.
 */
export function reportJson(report, indent = 2) {
  return JSON.stringify(report, null, indent).replace(JSON_HIDDEN, (char) => `\\u${char.codePointAt(0).toString(16).padStart(4, '0')}`);
}

/** A single-line label for a quick pick: escaped, without codicon syntax, and bounded. */
export function label(text, max = 120) {
  const shown = printable(text).replace(/\$\(/g, '$\u200b(');
  return shown.length > max ? `${shown.slice(0, max - 1)}…` : shown;
}

/** The facts a person reads first, taken from the report without changing it. */
export function summarize(report) {
  const detections = Array.isArray(report?.detections) ? report.detections : [];
  return {
    versions: report?.versions ?? null,
    score: report?.score ?? null,
    budgetExhausted: report?.trace?.budget_exhausted === true,
    saturated: Object.values(report?.trace?.saturation ?? {}).some((flag) => flag === true),
    codes: detections.map((detection) => ({
      symbology: detection.symbology,
      format: formatName(detection.symbology),
      text: detection.content?.text ?? '',
      charset: detection.content?.charset ?? null,
      occurrences: Array.isArray(detection.occurrences) ? detection.occurrences.length : 0,
    })),
  };
}

/** The lines written to the output channel for one scanned file. */
export function reportLines(name, result) {
  const { report, options } = result;
  const facts = summarize(report);
  const budget = options.budgetMs === undefined ? 'profile default' : options.budgetMs === 0 ? 'none' : `${options.budgetMs} ms`;
  const lines = [`${printable(name)}`, `  Profile ${options.profile} · budget ${budget} · scanner ${facts.versions?.scanner ?? 'unknown'}`];
  if (facts.codes.length === 0) {
    lines.push('  No QR code or barcode found.');
  } else {
    lines.push(`  ${facts.codes.length === 1 ? '1 code' : `${facts.codes.length} codes`} found:`);
    facts.codes.forEach((code, index) => {
      const lossy = code.charset === 'unknown' ? ' (text is not exact; content.raw in the report holds the bytes)' : '';
      lines.push(`  ${index + 1}. ${code.format}: ${printable(code.text)}${lossy}`);
    });
  }
  if (facts.score && typeof facts.score.value === 'number') {
    lines.push(`  QR quality score: ${facts.score.value}${facts.score.grade ? ` (${facts.score.grade})` : ''}`);
  } else if (options.profile === 'frame') {
    lines.push('  QR quality score: not measured by the frame profile.');
  } else {
    lines.push('  QR quality score: none published for this image (null is not zero).');
  }
  if (facts.budgetExhausted) lines.push('  The time budget stopped this scan: the result may be incomplete.');
  if (facts.saturated) lines.push('  A capacity limit was reached: more codes may be present.');
  lines.push('  Engine report:');
  lines.push(...reportJson(report).split('\n').map((line) => `  ${line}`));
  return lines;
}
