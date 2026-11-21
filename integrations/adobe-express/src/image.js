// SPDX-License-Identifier: MIT
// Telling image formats apart by their first bytes. A page rendition from Adobe Express is a PNG;
// a file the user chooses can be anything. The engine reads PNG, JPEG, WebP and GIF; anything else
// is refused here with its name, before a scan is attempted.

export const SUPPORTED = ['png', 'jpeg', 'webp', 'gif'];
// The largest file the panel reads.
export const MAX_BYTES = 32 * 1024 * 1024;

const starts = (bytes, values, at = 0) => values.every((value, index) => bytes[at + index] === value);
const ascii = (bytes, from, to) => String.fromCharCode(...bytes.subarray(from, to));

/** The format of an image file from its first bytes: png, jpeg, webp, gif, svg, heic, ... */
export function imageFormat(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 12) return 'unknown';
  if (starts(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return 'png';
  if (starts(bytes, [0xFF, 0xD8, 0xFF])) return 'jpeg';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'webp';
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'gif';
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand)) return 'heic';
    if (brand === 'avif') return 'avif';
  }
  if (starts(bytes, [0x49, 0x49, 0x2A, 0x00]) || starts(bytes, [0x4D, 0x4D, 0x00, 0x2A])) return 'tiff';
  const head = ascii(bytes, 0, Math.min(bytes.length, 256)).trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  return 'unknown';
}
