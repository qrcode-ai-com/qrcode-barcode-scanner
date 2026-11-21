// SPDX-License-Identifier: MIT
// Reading the bytes of a selected image: Canva gives a temporary URL of the original file, the
// app fetches it, and the first bytes say which format it is. The engine reads PNG, JPEG, WebP
// and GIF; anything else is refused here with its name, before a scan is attempted.

export const SUPPORTED = ['png', 'jpeg', 'webp', 'gif'];
// The largest file the panel reads. A larger image would hold the panel for a long time.
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

export class ImageReadError extends Error {
  constructor(kind, detail) {
    super(`${kind}${detail === undefined ? '' : `: ${detail}`}`);
    this.name = 'ImageReadError';
    this.kind = kind; // network | http | too-large | unsupported
    this.detail = detail;
  }
}

/** Fetch the file at a temporary URL and check it is an image the engine reads. */
export async function readImage(url, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(url, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
  } catch (error) {
    throw new ImageReadError('network', String(error && error.message ? error.message : error));
  }
  if (!response.ok) throw new ImageReadError('http', response.status);
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BYTES) throw new ImageReadError('too-large', declared);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new ImageReadError('too-large', bytes.length);
  const format = imageFormat(bytes);
  if (!SUPPORTED.includes(format)) throw new ImageReadError('unsupported', format);
  return { bytes, format };
}
