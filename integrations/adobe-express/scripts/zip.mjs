// SPDX-License-Identifier: MIT
// A small ZIP writer and reader for the add-on package. The writer stores every file as it is,
// without compression, in the order given, with one fixed date (1 January 1980, 00:00) written as
// raw DOS fields. So the bytes depend neither on the machine's time zone, nor on the files' times,
// nor on the zlib version of the Node.js release that writes them.
import { crc32, inflateRawSync } from 'node:zlib';

const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

/** ZIP bytes of `files`, a list of { name, bytes }; names are relative, with forward slashes. */
export function writeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, bytes } of files) {
    if (name.startsWith('/') || name.includes('\\') || name.split('/').includes('..')) {
      throw new Error(`zip: ${name} is not a relative path`);
    }
    const nameBytes = Buffer.from(name, 'utf8');
    const data = bytes;
    const crc = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034B50, 0);
    local.writeUInt16LE(10, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014B50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(10, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

/** The entries of ZIP bytes, as a Map of name to bytes, read from the central directory. */
export function readZip(archive) {
  const buffer = Buffer.from(archive);
  const endAt = buffer.lastIndexOf(Buffer.from([0x50, 0x4B, 0x05, 0x06]));
  if (endAt < 0) throw new Error('zip: no end of central directory');
  const count = buffer.readUInt16LE(endAt + 10);
  let at = buffer.readUInt32LE(endAt + 16);
  const entries = new Map();
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(at) !== 0x02014B50) throw new Error('zip: bad central directory');
    const method = buffer.readUInt16LE(at + 10);
    const crc = buffer.readUInt32LE(at + 16);
    const compressed = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const localAt = buffer.readUInt32LE(at + 42);
    const name = buffer.toString('utf8', at + 46, at + 46 + nameLength);
    const dataAt = localAt + 30 + buffer.readUInt16LE(localAt + 26) + buffer.readUInt16LE(localAt + 28);
    const data = buffer.subarray(dataAt, dataAt + compressed);
    const bytes = method === 8 ? inflateRawSync(data) : Buffer.from(data);
    if (crc32(bytes) !== crc) throw new Error(`zip: ${name} fails its CRC`);
    entries.set(name, bytes);
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
