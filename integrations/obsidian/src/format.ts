// SPDX-License-Identifier: MIT
// Markdown for decoded codes. Decoded text comes from an image anyone can make, so it is written
// inside code spans or fenced blocks: it is shown as text in the note, never rendered as a link,
// an embed or HTML.

export type InsertFormat = 'list' | 'callout';

export interface Code {
  /** The wire name of the format, such as `qr_code`. */
  symbology: string;
  /** The text the engine decoded. */
  text: string;
  /** False when the engine could not decode every byte as text (charset `unknown`). */
  complete: boolean;
}

const LABELS: Record<string, string> = {
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

/** A readable name for a format, or its wire name when this plugin does not know it yet. */
export function formatLabel(symbology: string): string {
  return LABELS[symbology] ?? symbology;
}

function longestRun(text: string, char: string): number {
  let longest = 0;
  let current = 0;
  for (const c of text) {
    current = c === char ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

/** TEXT as one inline code span, with a fence longer than any backtick run inside it. */
export function inlineCode(text: string): string {
  const fence = '`'.repeat(longestRun(text, '`') + 1);
  const pad = text.startsWith('`') || text.endsWith('`') || text.startsWith(' ') || text.endsWith(' ') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
}

/** TEXT as a fenced block, each line after PREFIX. */
export function fencedBlock(text: string, prefix: string): string[] {
  const fence = '`'.repeat(Math.max(3, longestRun(text, '`') + 1));
  return [`${prefix}${fence}text`, ...text.split(/\r\n|\r|\n/).map((line) => `${prefix}${line}`), `${prefix}${fence}`];
}

/** The characters of a file name that Markdown would read inside a callout title, escaped. */
export function escapeTitle(text: string): string {
  return text.replace(/[\\`*_[\]{}()<>#!|~=$%^]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

function entry(code: Code, prefix: string): string[] {
  const label = `${formatLabel(code.symbology)}${code.complete ? '' : ' (incomplete text)'}`;
  if (/[\r\n]/.test(code.text)) return [`${prefix}- ${label}:`, ...fencedBlock(code.text, `${prefix}  `)];
  if (code.text === '') return [`${prefix}- ${label}: (empty)`];
  return [`${prefix}- ${label}: ${inlineCode(code.text)}`];
}

/** The Markdown inserted into a note for CODES read from the image named SOURCE. */
export function codesMarkdown(codes: Code[], source: string, format: InsertFormat): string {
  if (format === 'callout') {
    const title = `> [!info] Codes in ${escapeTitle(source)}`;
    return [title, ...codes.flatMap((code) => entry(code, '> '))].join('\n');
  }
  return codes.flatMap((code) => entry(code, '')).join('\n');
}
