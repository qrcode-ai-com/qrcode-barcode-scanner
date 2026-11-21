// Byte helpers shared by the build: CRC-32, a deterministic zip writer and reader, and a PNG
// encoder. Written here rather than taken from a package so that the store packages are made by
// code a reviewer can read in one file, and so that the same inputs always give the same bytes.
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes, seed = 0) {
  let crc = ~seed >>> 0;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return ~crc >>> 0;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// A zlib stream of stored (uncompressed) blocks. Its bytes depend on the input only, never on
// the zlib build of the Node.js that runs the script.
function zlibStored(data) {
  const blocks = [];
  for (let start = 0; start < data.length || start === 0; start += 0xFFFF) {
    const chunk = data.subarray(start, start + 0xFFFF);
    const header = Buffer.alloc(5);
    header[0] = start + 0xFFFF >= data.length ? 1 : 0;
    header.writeUInt16LE(chunk.length, 1);
    header.writeUInt16LE(~chunk.length & 0xFFFF, 3);
    blocks.push(header, chunk);
    if (data.length === 0) break;
  }
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(adler32(data));
  return Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, tail]);
}

function pngChunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])));
  return Buffer.concat([head, data, crc]);
}

/** An 8-bit RGBA PNG of `rgba` (width * height * 4 bytes, row by row). */
export function encodePng(width, height, rgba) {
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rows[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4)
      .copy(rows, y * (width * 4 + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlibStored(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// 1980-01-01 00:00, the earliest DOS date: every entry carries the same time.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

/**
 * A zip archive of `files` (a Map of forward-slash path to bytes), entries sorted by path,
 * fixed times and no extra fields. Deflate is used where it makes an entry smaller.
 */
export function writeZip(files) {
  const names = [...files.keys()].sort();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const name of names) {
    const data = Buffer.from(files.get(name));
    const deflated = deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034B50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014B50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

/** The entries of a zip archive: a Map of path to bytes, with each CRC-32 checked. */
export function readZip(archive) {
  const buffer = Buffer.from(archive);
  const endAt = buffer.lastIndexOf(Buffer.from([0x50, 0x4B, 0x05, 0x06]));
  if (endAt < 0) throw new Error('not a zip archive: no end of central directory');
  const count = buffer.readUInt16LE(endAt + 10);
  let at = buffer.readUInt32LE(endAt + 16);
  const files = new Map();
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(at) !== 0x02014B50) throw new Error('broken central directory');
    const method = buffer.readUInt16LE(at + 10);
    const crc = buffer.readUInt32LE(at + 16);
    const size = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const localAt = buffer.readUInt32LE(at + 42);
    const name = buffer.toString('utf8', at + 46, at + 46 + nameLength);
    // An entry may not leave the folder it is extracted into.
    if (!name || name.startsWith('/') || name.includes('\\') || /^[A-Za-z]:/.test(name)
        || name.split('/').some((part) => part === '..' || part === '.')) {
      throw new Error(`unsafe entry name in the archive: ${JSON.stringify(name)}`);
    }
    const localName = buffer.readUInt16LE(localAt + 26);
    const localExtra = buffer.readUInt16LE(localAt + 28);
    const start = localAt + 30 + localName + localExtra;
    const body = buffer.subarray(start, start + size);
    const data = method === 0 ? Buffer.from(body) : inflateRawSync(body);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch in ${name}`);
    files.set(name, data);
    at += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}
