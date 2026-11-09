#!/usr/bin/env python3
"""Report the PT_LOAD alignment of native libraries inside an APK, an AAR or a folder.

Android devices with 16 KB memory pages only load a 64-bit library whose loadable segments
are aligned to 16384 bytes or more. This reads the ELF program headers directly, so it needs
no NDK tool.

  elf-load-alignment.py <apk | aar | directory | .so> [...] [--min-64 16384] [--json FILE]

Exit 1 when a 64-bit library has a PT_LOAD alignment below --min-64, 2 on unreadable input.
"""
import argparse
import json
import pathlib
import struct
import sys
import zipfile

PT_LOAD = 1


def load_alignments(data):
    """Return (bits, [p_align of each PT_LOAD]) of one ELF image."""
    if data[:4] != b'\x7fELF':
        raise ValueError('not an ELF file')
    bits = {1: 32, 2: 64}[data[4]]
    endian = {1: '<', 2: '>'}[data[5]]
    if bits == 64:
        phoff, = struct.unpack_from(endian + 'Q', data, 0x20)
        phentsize, phnum = struct.unpack_from(endian + 'HH', data, 0x36)
    else:
        phoff, = struct.unpack_from(endian + 'I', data, 0x1C)
        phentsize, phnum = struct.unpack_from(endian + 'HH', data, 0x2A)
    aligns = []
    for index in range(phnum):
        offset = phoff + index * phentsize
        p_type, = struct.unpack_from(endian + 'I', data, offset)
        if p_type != PT_LOAD:
            continue
        if bits == 64:
            align, = struct.unpack_from(endian + 'Q', data, offset + 0x30)
        else:
            align, = struct.unpack_from(endian + 'I', data, offset + 0x1C)
        aligns.append(align)
    return bits, aligns


def libraries(path):
    """Yield (name, bytes) for every .so under a file or directory."""
    path = pathlib.Path(path)
    if path.is_dir():
        for item in sorted(path.rglob('*.so')):
            yield str(item.relative_to(path)), item.read_bytes()
    elif path.suffix == '.so':
        yield path.name, path.read_bytes()
    else:
        with zipfile.ZipFile(path) as archive:
            for name in sorted(archive.namelist()):
                if name.endswith('.so'):
                    yield name, archive.read(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('inputs', nargs='+')
    parser.add_argument('--min-64', type=int, default=16384)
    parser.add_argument('--json')
    args = parser.parse_args()
    rows = []
    try:
        for source in args.inputs:
            for name, data in libraries(source):
                bits, aligns = load_alignments(data)
                lowest = min(aligns) if aligns else 0
                rows.append({
                    'source': pathlib.Path(source).name,
                    'library': name,
                    'bits': bits,
                    'min_load_alignment': lowest,
                    'ok_16k': bits == 32 or lowest >= args.min_64,
                })
    except (OSError, ValueError, KeyError, struct.error, zipfile.BadZipFile) as error:
        print(f'unreadable input: {error}', file=sys.stderr)
        return 2
    if not rows:
        print('no native library found', file=sys.stderr)
        return 2
    for row in rows:
        verdict = 'ok' if row['ok_16k'] else 'BELOW 16 KB'
        print(f"{row['source']}  {row['library']}  {row['bits']}-bit  "
              f"align {row['min_load_alignment']}  {verdict}")
    if args.json:
        pathlib.Path(args.json).write_text(json.dumps(rows, indent=2) + '\n', encoding='utf-8')
    return 0 if all(row['ok_16k'] for row in rows) else 1


if __name__ == '__main__':
    sys.exit(main())
