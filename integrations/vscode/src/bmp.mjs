// SPDX-License-Identifier: MIT
// The published 0.11.0 WASM module reads PNG, JPEG, WebP and GIF, not BMP. This reader turns an
// uncompressed BMP into RGBA pixels for the module's scan_frame. Every offset comes from the
// file, so every read is checked against its length before it happens.

/** Same caps as the engine's defaults (spec/02-profiles.md, Anti-DoS limits). */
export const BMP_MAX_SIDE = 10_000;
export const BMP_MAX_PIXELS = 64_000_000;

export class BmpError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BmpError';
  }
}

/** True when the bytes start with the BMP signature. */
export function isBmp(bytes) {
  return bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d;
}

const BI_RGB = 0;
const BI_BITFIELDS = 3;
const BI_ALPHABITFIELDS = 6;
const COMPRESSION_NAMES = { 1: 'RLE8', 2: 'RLE4', 4: 'JPEG', 5: 'PNG' };

function channel(mask) {
  if (mask === 0) return null;
  let shift = 0;
  while (((mask >>> shift) & 1) === 0) shift += 1;
  let bits = 0;
  while (shift + bits < 32 && ((mask >>> (shift + bits)) & 1) === 1) bits += 1;
  if (bits === 0 || bits > 16) throw new BmpError('BMP colour mask is not supported');
  if (((mask >>> shift) >>> bits) !== 0) throw new BmpError('BMP colour mask is not contiguous');
  const max = 2 ** bits - 1;
  return (pixel) => Math.round((((pixel & mask) >>> shift) * 255) / max);
}

/**
 * Decode an uncompressed BMP (1, 4, 8, 16, 24 or 32 bits per pixel, bottom-up or top-down).
 * Returns { width, height, rgba } with rows top-down; throws BmpError with a plain message.
 */
export function decodeBmp(bytes) {
  if (!isBmp(bytes)) throw new BmpError('not a BMP file');
  if (bytes.length < 26) throw new BmpError('BMP file is truncated');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataOffset = view.getUint32(10, true);
  const headerSize = view.getUint32(14, true);
  let width;
  let height;
  let bpp;
  let compression = BI_RGB;
  let paletteCount = 0;
  let paletteEntry = 4;
  let masks = null;
  let afterHeader = 14 + headerSize;

  if (headerSize === 12) {
    width = view.getUint16(18, true);
    height = view.getUint16(20, true);
    bpp = view.getUint16(24, true);
    paletteEntry = 3;
  } else if (headerSize >= 40) {
    if (bytes.length < 14 + 40) throw new BmpError('BMP file is truncated');
    width = view.getInt32(18, true);
    height = view.getInt32(22, true);
    bpp = view.getUint16(28, true);
    compression = view.getUint32(30, true);
    paletteCount = view.getUint32(46, true);
    if (compression === BI_BITFIELDS || compression === BI_ALPHABITFIELDS) {
      const count = compression === BI_ALPHABITFIELDS ? 4 : 3;
      // A 40-byte header puts its masks right after it; larger headers hold them.
      const start = headerSize === 40 ? afterHeader : 54;
      const available = headerSize === 40 ? count : Math.min(4, (headerSize - 40) / 4);
      if (start + available * 4 > bytes.length) throw new BmpError('BMP file is truncated');
      masks = [];
      for (let i = 0; i < 4; i += 1) masks.push(i < available ? view.getUint32(start + i * 4, true) : 0);
      if (headerSize === 40) afterHeader += count * 4;
    }
  } else {
    throw new BmpError(`BMP header of ${headerSize} bytes is not supported`);
  }

  if (COMPRESSION_NAMES[compression]) {
    throw new BmpError(`compressed BMP (${COMPRESSION_NAMES[compression]}) is not supported; save it as an uncompressed BMP or a PNG`);
  }
  if (![BI_RGB, BI_BITFIELDS, BI_ALPHABITFIELDS].includes(compression)) {
    throw new BmpError(`BMP compression ${compression} is not supported`);
  }
  if (![1, 4, 8, 16, 24, 32].includes(bpp)) throw new BmpError(`BMP with ${bpp} bits per pixel is not supported`);
  if (bpp <= 8 && compression !== BI_RGB) throw new BmpError('BMP palette image with colour masks is not valid');
  if (bpp === 24 && compression !== BI_RGB) throw new BmpError('24-bit BMP with colour masks is not valid');

  const topDown = height < 0;
  const rows = Math.abs(height);
  if (width <= 0 || rows <= 0) throw new BmpError('BMP has no pixels');
  if (width > BMP_MAX_SIDE || rows > BMP_MAX_SIDE || width * rows > BMP_MAX_PIXELS) {
    throw new BmpError(`BMP of ${width} × ${rows} pixels is larger than the scanner accepts`);
  }

  let palette = null;
  if (bpp <= 8) {
    const count = paletteCount === 0 ? 2 ** bpp : paletteCount;
    if (count > 2 ** bpp) throw new BmpError('BMP palette is larger than its bit depth allows');
    const end = afterHeader + count * paletteEntry;
    if (end > bytes.length || end > dataOffset) throw new BmpError('BMP palette is truncated');
    palette = new Uint8Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const at = afterHeader + i * paletteEntry;
      palette[i * 3] = bytes[at + 2];
      palette[i * 3 + 1] = bytes[at + 1];
      palette[i * 3 + 2] = bytes[at];
    }
  }

  const stride = Math.floor((bpp * width + 31) / 32) * 4;
  if (dataOffset < afterHeader || dataOffset + stride * rows > bytes.length) {
    throw new BmpError('BMP pixel data is truncated');
  }

  let red;
  let green;
  let blue;
  let alpha = null;
  if (bpp === 16 || bpp === 32) {
    const [r, g, b, a] = masks ?? (bpp === 16 ? [0x7c00, 0x03e0, 0x001f, 0] : [0x00ff0000, 0x0000ff00, 0x000000ff, 0]);
    red = channel(r);
    green = channel(g);
    blue = channel(b);
    alpha = channel(a);
    if (!red || !green || !blue) throw new BmpError('BMP colour mask is missing');
  }

  const rgba = new Uint8Array(width * rows * 4);
  let anyAlpha = false;
  for (let y = 0; y < rows; y += 1) {
    const source = dataOffset + (topDown ? y : rows - 1 - y) * stride;
    let out = y * width * 4;
    for (let x = 0; x < width; x += 1, out += 4) {
      if (palette) {
        const bit = x * bpp;
        const byte = bytes[source + (bit >> 3)];
        const index = (byte >> (8 - bpp - (bit & 7))) & ((1 << bpp) - 1);
        if (index * 3 >= palette.length) throw new BmpError('BMP pixel names a colour outside its palette');
        rgba[out] = palette[index * 3];
        rgba[out + 1] = palette[index * 3 + 1];
        rgba[out + 2] = palette[index * 3 + 2];
        rgba[out + 3] = 255;
      } else if (bpp === 24) {
        const at = source + x * 3;
        rgba[out] = bytes[at + 2];
        rgba[out + 1] = bytes[at + 1];
        rgba[out + 2] = bytes[at];
        rgba[out + 3] = 255;
      } else {
        const pixel = bpp === 16 ? view.getUint16(source + x * 2, true) : view.getUint32(source + x * 4, true);
        rgba[out] = red(pixel);
        rgba[out + 1] = green(pixel);
        rgba[out + 2] = blue(pixel);
        rgba[out + 3] = alpha ? alpha(pixel) : 255;
        if (alpha && rgba[out + 3] !== 0) anyAlpha = true;
      }
    }
  }
  // Many writers declare an alpha mask and leave it zero: such a file is opaque, not invisible.
  if (alpha && !anyAlpha) for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  return { width, height: rows, rgba };
}
