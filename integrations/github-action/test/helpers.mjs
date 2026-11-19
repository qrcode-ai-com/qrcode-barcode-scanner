// SPDX-License-Identifier: MIT
// Small archive writers and paths shared by the tests.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync, gzipSync } from 'node:zlib';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ACTION = resolve(HERE, '..');

/** The mixed fixture: in the action's own repository, then in the engine repository. */
export function mixedFixture() {
  const candidates = [join(HERE, 'fixtures/mixed-code128-qr.png'), resolve(ACTION, '../../fixtures/symbology/mixed-code128-qr.png')];
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error('the mixed fixture is missing');
  return found;
}

export const QR = 'https://qrc-ai.com/76xMa';
export const CODE128 = 'STOCK-4827';

function header(name, size, type, mode = 0o644) {
  const block = Buffer.alloc(512);
  block.write(name, 0, 100, 'utf8');
  block.write(`${mode.toString(8).padStart(7, '0')}\0`, 100, 'latin1');
  block.write('0000000\0', 108, 'latin1');
  block.write('0000000\0', 116, 'latin1');
  block.write(`${size.toString(8).padStart(11, '0')}\0`, 124, 'latin1');
  block.write('00000000000\0', 136, 'latin1');
  block.write('        ', 148, 'latin1');
  block.write(type, 156, 'latin1');
  block.write('ustar\0', 257, 'latin1');
  block.write('00', 263, 'latin1');
  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 'latin1');
  return block;
}

/** A gzip tar of ENTRIES: [{ name, data?, type? ('0' file, '5' folder, '2' link), mode? }]. */
export function tarGz(entries) {
  const parts = [];
  for (const { name, data = Buffer.alloc(0), type = '0', mode } of entries) {
    const body = Buffer.from(data);
    parts.push(header(name, type === '0' ? body.length : 0, type, mode));
    if (type === '0') parts.push(body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

/** A zip of ENTRIES: [{ name, data, corruptCrc? }], deflated. */
export function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data, corruptCrc = false } of entries) {
    const bytes = Buffer.from(data);
    const nameBytes = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(bytes);
    const crc = (crc32(bytes) ^ (corruptCrc ? 1 : 0)) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, packed);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + packed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

/** A fetch that serves FILES by URL suffix, optionally from another host. */
export function fakeFetch(files, { host = 'https://release-assets.githubusercontent.com/x/', status } = {}) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const name = url.slice(url.lastIndexOf('/') + 1);
    const data = files[name];
    const code = status ?? (data ? 200 : 404);
    return { ok: code >= 200 && code < 300, status: code, url: host + name, arrayBuffer: async () => (data ?? Buffer.alloc(0)) };
  };
  impl.calls = calls;
  return impl;
}
