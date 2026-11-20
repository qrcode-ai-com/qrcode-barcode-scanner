// SPDX-License-Identifier: MIT
// Read a VSIX (a ZIP file) without another dependency: its central directory gives each entry,
// and every entry read is inflated and checked against its CRC-32.
import assert from 'node:assert/strict';
import { crc32, inflateRawSync } from 'node:zlib';

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

/** The entries of the ZIP held in BYTES, in central-directory order. */
export function zipEntries(bytes) {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let at = buffer.length - 22; at >= Math.max(0, buffer.length - 22 - 0xffff); at -= 1) {
    if (buffer.readUInt32LE(at) === EOCD) {
      end = at;
      break;
    }
  }
  assert.ok(end >= 0, 'not a ZIP file: no end of central directory');
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    assert.equal(buffer.readUInt32LE(at), CENTRAL, `bad central directory entry ${index}`);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    entries.push({
      name: buffer.toString('utf8', at + 46, at + 46 + nameLength),
      method: buffer.readUInt16LE(at + 10),
      crc: buffer.readUInt32LE(at + 16),
      compressedSize: buffer.readUInt32LE(at + 20),
      size: buffer.readUInt32LE(at + 24),
      offset: buffer.readUInt32LE(at + 42),
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** The bytes of ENTRY, inflated and checked against its CRC-32. */
export function zipRead(bytes, entry) {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(buffer.readUInt32LE(entry.offset), LOCAL, `bad local header for ${entry.name}`);
  const start = entry.offset + 30 + buffer.readUInt16LE(entry.offset + 26) + buffer.readUInt16LE(entry.offset + 28);
  const stored = buffer.subarray(start, start + entry.compressedSize);
  assert.ok(entry.method === 0 || entry.method === 8, `${entry.name}: compression method ${entry.method}`);
  const data = entry.method === 0 ? Buffer.from(stored) : inflateRawSync(stored);
  assert.equal(data.length, entry.size, `${entry.name}: size`);
  assert.equal(crc32(data) >>> 0, entry.crc, `${entry.name}: CRC-32`);
  return data;
}
