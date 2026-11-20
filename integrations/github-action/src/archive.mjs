// SPDX-License-Identifier: MIT
// Reads the members of a qrscan release archive without an external tool: a gzip tar for Linux
// and macOS, a zip for Windows. Only regular files under the archive's one top folder are
// returned; a link, a device, an absolute name or a `..` step refuses the whole archive, because
// the archive is untrusted until its hash has been checked and stays untrusted in the reader.
import { crc32, gunzipSync, inflateRawSync } from 'node:zlib';

export class ArchiveError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArchiveError';
  }
}

const MAX_MEMBER = 64 * 1024 * 1024;

function safeName(name, top) {
  const clean = name.replace(/\\/g, '/');
  if (clean.startsWith('/') || /^[A-Za-z]:/.test(clean)) throw new ArchiveError(`absolute member name ${JSON.stringify(name)}`);
  const parts = clean.split('/').filter((part) => part !== '' && part !== '.');
  if (parts.includes('..')) throw new ArchiveError(`member name ${JSON.stringify(name)} climbs out of the archive`);
  if (parts[0] !== top) throw new ArchiveError(`member ${JSON.stringify(name)} is outside the folder ${top}`);
  return parts.slice(1).join('/');
}

function octal(field) {
  const text = field.toString('latin1').replace(/\0.*$/s, '').trim();
  if (!/^[0-7]*$/.test(text)) throw new ArchiveError(`a tar header holds the size ${JSON.stringify(text)}`);
  return text === '' ? 0 : parseInt(text, 8);
}

function paxPath(data) {
  let offset = 0;
  let path;
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset);
    if (space < 0) break;
    const length = parseInt(data.subarray(offset, space).toString('latin1'), 10);
    if (!Number.isInteger(length) || length <= 0) throw new ArchiveError('a pax header is malformed');
    const record = data.subarray(space + 1, offset + length - 1).toString('utf8');
    const equals = record.indexOf('=');
    if (record.slice(0, equals) === 'path') path = record.slice(equals + 1);
    offset += length;
  }
  return path;
}

/** Every regular file of a gzip tar under TOP, as Map(relative path → { data, mode }). */
export function readTarGz(buffer, top) {
  let tar;
  try {
    tar = gunzipSync(buffer, { maxOutputLength: 256 * 1024 * 1024 });
  } catch (error) {
    throw new ArchiveError(`the archive is not gzip data: ${error.message}`);
  }
  const files = new Map();
  let offset = 0;
  let longName;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const size = octal(header.subarray(124, 136));
    const type = String.fromCharCode(header[156] || 0x30);
    const start = offset + 512;
    const data = tar.subarray(start, start + size);
    if (data.length !== size) throw new ArchiveError('the tar archive is truncated');
    offset = start + Math.ceil(size / 512) * 512;
    if (type === 'x') { longName = paxPath(data) ?? longName; continue; }
    if (type === 'L') { longName = data.toString('utf8').replace(/\0.*$/s, ''); continue; }
    if (type === 'g') continue;
    let name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '');
    if (header.subarray(257, 262).toString('latin1') === 'ustar') {
      const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/s, '');
      if (prefix) name = `${prefix}/${name}`;
    }
    if (longName !== undefined) { name = longName; longName = undefined; }
    const relative = safeName(name, top);
    if (type === '5') continue;
    if (type !== '0' && type !== '\0') throw new ArchiveError(`member ${JSON.stringify(name)} is not a regular file (type ${type})`);
    if (relative === '') throw new ArchiveError('a file stands where the top folder should be');
    if (size > MAX_MEMBER) throw new ArchiveError(`member ${relative} is larger than ${MAX_MEMBER} bytes`);
    files.set(relative, { data: Buffer.from(data), mode: octal(header.subarray(100, 108)) & 0o777 });
  }
  return files;
}

/** Every regular file of a zip under TOP, as Map(relative path → { data, mode }). */
export function readZip(buffer, top) {
  const minimum = Math.max(0, buffer.length - 0xffff - 22);
  let end = -1;
  for (let at = buffer.length - 22; at >= minimum; at -= 1) {
    if (buffer.readUInt32LE(at) === 0x06054b50) { end = at; break; }
  }
  if (end < 0) throw new ArchiveError('the archive is not a zip file');
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const files = new Map();
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new ArchiveError('the zip central directory is damaged');
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const expectedCrc = buffer.readUInt32LE(offset + 16);
    const compressed = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const external = buffer.readUInt32LE(offset + 38);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString(flags & 0x800 ? 'utf8' : 'latin1');
    offset += 46 + nameLength + extraLength + commentLength;
    const relative = safeName(name, top);
    if (name.endsWith('/')) continue;
    const unixType = (external >>> 16) & 0o170000;
    if (unixType !== 0 && unixType !== 0o100000) throw new ArchiveError(`member ${JSON.stringify(name)} is not a regular file`);
    if (flags & 0x1) throw new ArchiveError(`member ${relative} is encrypted`);
    if (size > MAX_MEMBER) throw new ArchiveError(`member ${relative} is larger than ${MAX_MEMBER} bytes`);
    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50) {
      throw new ArchiveError(`the local header of ${relative} is damaged`);
    }
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(start, start + compressed);
    if (raw.length !== compressed) throw new ArchiveError(`member ${relative} is truncated`);
    let data;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) {
      try { data = inflateRawSync(raw, { maxOutputLength: MAX_MEMBER }); }
      catch (error) { throw new ArchiveError(`member ${relative} does not inflate: ${error.message}`); }
    } else throw new ArchiveError(`member ${relative} uses compression method ${method}`);
    if (data.length !== size) throw new ArchiveError(`member ${relative} has ${data.length} bytes, its header says ${size}`);
    if ((crc32(data) >>> 0) !== expectedCrc) throw new ArchiveError(`member ${relative} fails its CRC-32`);
    files.set(relative, { data, mode: 0o644 });
  }
  return files;
}
