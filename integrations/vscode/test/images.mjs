// SPDX-License-Identifier: MIT
// Test images made from the repository's PNG fixtures, so no binary BMP needs to be committed:
// a small PNG reader (8-bit, non-interlaced) and a BMP writer for each layout the reader accepts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

export function decodePng(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((value, index) => bytes[index] === value)) throw new Error('not a PNG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0;
  let height = 0;
  let colorType = 0;
  const data = [];
  for (let at = 8; at < bytes.length;) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      const [depth, color, , , interlace] = body.subarray(8, 13);
      if (depth !== 8 || interlace !== 0 || ![0, 2, 4, 6].includes(color)) throw new Error('test PNG reader: 8-bit, non-interlaced, no palette only');
      colorType = color;
    } else if (type === 'IDAT') {
      data.push(body);
    }
    at += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const corner = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - corner;
        const [a, b, c] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
        predictor = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      pixels[y * stride + x] = (line[x] + predictor) & 0xff;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const s = i * channels;
    const gray = channels <= 2;
    rgba[i * 4] = pixels[s];
    rgba[i * 4 + 1] = gray ? pixels[s] : pixels[s + 1];
    rgba[i * 4 + 2] = gray ? pixels[s] : pixels[s + 2];
    rgba[i * 4 + 3] = channels === 2 ? pixels[s + 1] : channels === 4 ? pixels[s + 3] : 255;
  }
  return { width, height, rgba };
}

const luma = (rgba, i) => Math.round(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);

/**
 * Write a BMP. layout: 'rgb24', 'rgb24-core' (12-byte header), 'rgb32' (BI_RGB, zero alpha bytes),
 * 'bitfields32' (V5 header with an alpha mask), 'rgb565' (40-byte header, three masks),
 * 'gray8' (256-entry palette) or 'mono1' (two-entry palette). topDown writes a negative height.
 */
export function encodeBmp({ width, height, rgba }, layout, { topDown = false } = {}) {
  const bpp = { rgb24: 24, 'rgb24-core': 24, rgb32: 32, bitfields32: 32, rgb565: 16, gray8: 8, mono1: 1 }[layout];
  const headerSize = layout === 'rgb24-core' ? 12 : layout === 'bitfields32' ? 124 : 40;
  const masks = layout === 'rgb565' ? [0xf800, 0x07e0, 0x001f] : [];
  const palette = layout === 'gray8' ? 256 : layout === 'mono1' ? 2 : 0;
  const stride = Math.floor((bpp * width + 31) / 32) * 4;
  const offset = 14 + headerSize + masks.length * 4 + palette * 4;
  const bytes = new Uint8Array(offset + stride * height);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, offset, true);
  view.setUint32(14, headerSize, true);
  if (headerSize === 12) {
    view.setUint16(18, width, true);
    view.setUint16(20, height, true);
    view.setUint16(22, 1, true);
    view.setUint16(24, bpp, true);
  } else {
    view.setInt32(18, width, true);
    view.setInt32(22, topDown ? -height : height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, bpp, true);
    view.setUint32(30, layout === 'bitfields32' || layout === 'rgb565' ? 3 : 0, true);
    view.setUint32(34, stride * height, true);
    view.setUint32(46, palette, true);
    if (layout === 'bitfields32') {
      [0x00ff0000, 0x0000ff00, 0x000000ff, 0xff000000].forEach((mask, i) => view.setUint32(54 + i * 4, mask, true));
    }
    masks.forEach((mask, i) => view.setUint32(54 + i * 4, mask, true));
  }
  for (let i = 0; i < palette; i += 1) {
    const value = palette === 2 ? i * 255 : i;
    const at = 14 + headerSize + i * 4;
    bytes[at] = value;
    bytes[at + 1] = value;
    bytes[at + 2] = value;
  }
  for (let y = 0; y < height; y += 1) {
    const row = offset + (topDown && headerSize !== 12 ? y : height - 1 - y) * stride;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (bpp === 24) {
        bytes[row + x * 3] = rgba[i + 2];
        bytes[row + x * 3 + 1] = rgba[i + 1];
        bytes[row + x * 3 + 2] = rgba[i];
      } else if (bpp === 32) {
        bytes[row + x * 4] = rgba[i + 2];
        bytes[row + x * 4 + 1] = rgba[i + 1];
        bytes[row + x * 4 + 2] = rgba[i];
        bytes[row + x * 4 + 3] = layout === 'bitfields32' ? rgba[i + 3] : 0;
      } else if (bpp === 16) {
        view.setUint16(row + x * 2, ((rgba[i] >> 3) << 11) | ((rgba[i + 1] >> 2) << 5) | (rgba[i + 2] >> 3), true);
      } else if (bpp === 8) {
        bytes[row + x] = luma(rgba, i);
      } else if (luma(rgba, i) >= 128) {
        bytes[row + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return bytes;
}

/**
 * Write a GIF89a with a 256-grey palette. Its LZW stream sends one 9-bit code per pixel and a
 * clear code before the table would grow past 9 bits: valid for every decoder, without compression.
 */
export function encodeGif({ width, height, rgba }) {
  const bytes = [];
  const word = (value) => bytes.push(value & 0xff, value >> 8);
  bytes.push(...Buffer.from('GIF89a', 'ascii'));
  word(width);
  word(height);
  bytes.push(0xf7, 0, 0);
  for (let grey = 0; grey < 256; grey += 1) bytes.push(grey, grey, grey);
  bytes.push(0x2c);
  word(0);
  word(0);
  word(width);
  word(height);
  bytes.push(0, 8);
  const CLEAR = 256;
  const END = 257;
  const stream = [];
  let bits = 0;
  let count = 0;
  const emit = (code) => {
    bits |= code << count;
    count += 9;
    while (count >= 8) {
      stream.push(bits & 0xff);
      bits >>>= 8;
      count -= 8;
    }
  };
  emit(CLEAR);
  for (let i = 0, run = 0; i < width * height; i += 1, run += 1) {
    if (run === 250) {
      emit(CLEAR);
      run = 0;
    }
    emit(luma(rgba, i * 4));
  }
  emit(END);
  if (count > 0) stream.push(bits & 0xff);
  for (let at = 0; at < stream.length; at += 255) {
    const block = stream.slice(at, at + 255);
    bytes.push(block.length, ...block);
  }
  bytes.push(0, 0x3b);
  return new Uint8Array(bytes);
}

/** Set one 32-bit little-endian field of a BMP copy, for malformed-file cases. */
export function patched(bytes, offset, value, size = 4) {
  const copy = new Uint8Array(bytes);
  const view = new DataView(copy.buffer);
  if (size === 4) view.setUint32(offset, value >>> 0, true);
  else view.setUint16(offset, value, true);
  return copy;
}

/** The white PNG the repository's packed consumers already use as an image without a code. */
export function whitePng(repository) {
  const source = readFileSync(join(repository, 'scripts', 'packed-node-consumer.mjs'), 'utf8');
  const match = source.match(/const white = Buffer.from\("([A-Za-z0-9+/=]+)"/);
  if (!match) throw new Error('the shared white PNG fixture moved');
  return new Uint8Array(Buffer.from(match[1], 'base64'));
}
