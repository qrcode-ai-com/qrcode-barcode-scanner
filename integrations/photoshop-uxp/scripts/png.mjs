// SPDX-License-Identifier: MIT
// A PNG writer for the listing images and the icons (8-bit RGBA, one IDAT, no filter), and a reader
// for the test fixture (8-bit, not interlaced), so the tests hold its pixels without a browser.
import { crc32, deflateSync, inflateSync } from 'node:zlib';

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** PNG bytes of a `width` x `height` image from its RGBA pixels. */
export function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rows.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** The RGBA pixels of 8-bit, non-interlaced grey, grey-alpha, RGB or RGBA PNG bytes. */
export function decodePng(bytes) {
  const png = Buffer.from(bytes);
  if (!png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    throw new Error('not a PNG');
  }
  let at = 8;
  let header = null;
  const data = [];
  while (at < png.length) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') header = body;
    else if (type === 'IDAT') data.push(body);
    else if (type === 'IEND') break;
    at += 12 + length;
  }
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const [depth, colour, , , interlace] = header.subarray(8, 13);
  const channels = CHANNELS[colour];
  if (depth !== 8 || !channels || interlace !== 0) throw new Error('only 8-bit, non-interlaced grey or RGB PNG');
  const rows = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = rows[y * (stride + 1)];
    const line = rows.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? raw[y * stride + x - channels] : 0;
      const up = y > 0 ? raw[(y - 1) * stride + x] : 0;
      const corner = x >= channels && y > 0 ? raw[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - corner;
        const [a, b, c] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
        value += a <= b && a <= c ? left : b <= c ? up : corner;
      }
      raw[y * stride + x] = value & 0xFF;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const pixel = raw.subarray(index * channels, index * channels + channels);
    const [r, g, b] = channels >= 3 ? pixel : [pixel[0], pixel[0], pixel[0]];
    rgba.set([r, g, b, channels === 2 ? pixel[1] : channels === 4 ? pixel[3] : 255], index * 4);
  }
  return { width, height, rgba };
}
