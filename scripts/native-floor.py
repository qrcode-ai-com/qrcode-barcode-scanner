"""What a native binary needs from the system that loads it, read from its bytes.

  native-floor.py FILE|ARCHIVE...                       report (JSON)
  native-floor.py --policy node [--complete] [--out F] FILE|ARCHIVE...
  native-floor.py --policy cli [--complete] [--forbid S]... [--out F] ARCHIVE...
  native-floor.py --policy cli --target T [--unwinder U] [--forbid S]... [--out F] BINARY
  native-floor.py --self-test

ELF: architecture, type, DT_NEEDED, DT_RPATH/DT_RUNPATH, PT_INTERP,
PT_GNU_STACK, the libc (glibc or musl) and the highest GLIBC_/GCC_/... symbol
version per family. Mach-O (thin or fat): each slice's CPU, file type and
flags, LC_BUILD_VERSION / LC_VERSION_MIN_* minimum OS and SDK, load dylibs,
LC_MAIN, LC_LOAD_DYLINKER, LC_RPATH and LC_CODE_SIGNATURE. PE32+: machine,
characteristics, subsystem, DllCharacteristics, OS/subsystem versions,
imported and delay-imported DLLs. Archives (.tgz, .whl) are read in place:
their .node, .so, .pyd, .dylib and .dll members. A CLI release archive
(qrcode-barcode-scanner-cli-<version>-<triple>.tar.gz, .zip for Windows) yields
its <stem>/qrscan or <stem>/qrscan.exe.

`--policy node` judges each `<name>.<napi-suffix>.node` against the platform
floor of Node 18, the oldest runtime the package admits (engines.node >= 18):
an addon may not need more than the runtime it loads into. From nodejs/node
v18.x BUILDING.md (Supported platforms): GNU/Linux x64/arm64 glibc >= 2.28,
musl x64, macOS x64 >= 10.15 and arm64 >= 11, Windows >= 10. node.exe links
the C runtime statically and imports no Visual C++ runtime DLL, so an addon
importing one fails where the Visual C++ Redistributable is absent. Every
system library must belong to the operating system. Anchors (a libc, the
system library, kernel32) keep a misread binary from passing empty.
`--complete` also requires each of the six release targets exactly once.

`--policy cli` judges the qrscan executable of each CLI release archive, or
the one raw binary --target names, against its release row. GNU/Linux
(x86_64, aarch64): a position-independent ELF executable whose PT_INTERP is
the glibc loader, no executable stack, no RPATH/RUNPATH, only glibc system
libraries (libc.so.6 the anchor) and no GLIBC_ version above 2.28. macOS: a
thin MH_EXECUTE with MH_PIE, LC_MAIN and /usr/lib/dyld, a minimum macOS of
exactly 10.15 (x86_64) or 11.0 (arm64), system dylibs only (libSystem the
anchor), no LC_RPATH and, on arm64, an LC_CODE_SIGNATURE. Windows: an x86_64
PE32+ console executable with relocations, HIGH_ENTROPY_VA, DYNAMIC_BASE and
NX_COMPAT, kernel32.dll the anchor, and no Visual C++ or Universal C Runtime
DLL. A GNU binary's unwinder comes from its archive's <stem>/build-info.json
(linker.unwinder) or from --unwinder: under zig-libunwind it must not need
libgcc_s.so.1, under libgcc_s it must. No binary may hold a build-host path
(a home, temp, Actions work or tool-cache directory) or a --forbid string,
in UTF-8 or UTF-16LE. The source archive and SHA256SUMS hold no executable
and are skipped. `--complete` requires each of the five triples exactly once.
"""
import argparse
import contextlib
import io
import json
import re
import struct
import sys
import tarfile
import tempfile
import zipfile
import zlib
from pathlib import Path

MEMBER = re.compile(r"\.(node|so|pyd|dylib|dll)$|\.so\.")


def cstr(data, offset):
    return data[offset:data.index(b"\0", offset)].decode("utf-8", "replace")


def version_key(text):
    """Comparable version: 11.0.0 == 11.0 == 11, and 2.2.5 < 2.17."""
    parts = [int(part) for part in re.findall(r"\d+", text)]
    while parts and parts[-1] == 0:
        parts.pop()
    return tuple(parts)


# ------------------------------------------------------------------------ ELF
def elf(data):
    if data[4] != 2 or data[5] != 1:
        return {"format": "elf (not 64-bit little-endian)"}
    (e_type, e_machine, _version, _entry, e_phoff, e_shoff, _flags, _ehsize, e_phentsize, e_phnum,
     e_shentsize, e_shnum, _shstrndx) = struct.unpack_from("<HHIQQQIHHHHHH", data, 16)
    sections = [struct.unpack_from("<IIQQQQIIQQ", data, e_shoff + i * e_shentsize) for i in range(e_shnum)]
    needed, versions, search = [], [], {15: [], 29: []}  # DT_RPATH, DT_RUNPATH
    for (_name, sh_type, _f, _a, offset, size, link, info, _al, _es) in sections:
        strtab = sections[link][4] if link < len(sections) else 0
        if sh_type == 6:  # SHT_DYNAMIC
            for i in range(size // 16):
                tag, value = struct.unpack_from("<qQ", data, offset + i * 16)
                if tag == 0:
                    break
                if tag == 1:  # DT_NEEDED
                    needed.append(cstr(data, strtab + value))
                elif tag in search:
                    search[tag].append(cstr(data, strtab + value))
        elif sh_type == 0x6FFFFFFE:  # SHT_GNU_verneed
            entry = offset
            for _ in range(info):
                _v, count, _file, aux, following = struct.unpack_from("<HHIII", data, entry)
                item = entry + aux
                for _ in range(count):
                    _hash, _fl, _other, name, item_next = struct.unpack_from("<IHHII", data, item)
                    versions.append(cstr(data, strtab + name))
                    if not item_next:
                        break
                    item += item_next
                if not following:
                    break
                entry += following
    if any(n == "libc.so" or n.startswith("libc.musl") for n in needed):
        libc = "musl"
    elif "libc.so.6" in needed:
        libc = "glibc"
    else:
        libc = None
    highest = {}
    for name in versions:
        family = re.match(r"([A-Z][A-Z_]*?)_\d", name)
        if family and (family.group(1) not in highest
                       or version_key(name) > version_key(highest[family.group(1)])):
            highest[family.group(1)] = name
    # Program headers: the loader a dynamically linked executable names, and
    # the stack permissions it asks for (None: no PT_GNU_STACK at all).
    interp = stack = None
    if e_phentsize >= 56 and e_phoff + e_phnum * e_phentsize <= len(data):
        for i in range(e_phnum):
            p_type, p_flags, p_offset, _vaddr, _paddr, p_filesz = struct.unpack_from(
                "<IIQQQQ", data, e_phoff + i * e_phentsize)
            if p_type == 3:  # PT_INTERP
                interp = data[p_offset:p_offset + p_filesz].split(b"\0")[0].decode("utf-8", "replace")
            elif p_type == 0x6474E551:  # PT_GNU_STACK
                stack = "".join(flag for bit, flag in ((4, "R"), (2, "W"), (1, "X")) if p_flags & bit)
    return {"format": "elf64", "arch": {62: "x86_64", 183: "aarch64"}.get(e_machine, f"e_machine {e_machine}"),
            "elf_type": e_type, "libc": libc, "needed": needed, "highest_versions": highest,
            "interp": interp, "gnu_stack": stack, "rpath": search[15], "runpath": search[29]}


# --------------------------------------------------------------------- Mach-O
CPU = {0x0100000C: "arm64", 0x01000007: "x86_64"}
PLATFORM = {1: "macos", 2: "ios", 3: "tvos", 4: "watchos", 6: "maccatalyst", 7: "ios-simulator"}


def packed(value):
    return f"{value >> 16}.{(value >> 8) & 0xFF}.{value & 0xFF}"


def macho_slice(data, base):
    magic, cputype, _sub, filetype, ncmds = struct.unpack_from("<IiiII", data, base)
    if magic != 0xFEEDFACF:
        return {"arch": f"magic {magic:#x}", "min_os": None, "dylibs": []}
    flags = struct.unpack_from("<I", data, base + 24)[0]
    found = {"arch": CPU.get(cputype & 0xFFFFFFFF, f"cputype {cputype & 0xFFFFFFFF:#x}"), "filetype": filetype,
             "min_os": None, "dylibs": [], "flags": f"{flags:#010x}", "pie": bool(flags & 0x200000),  # MH_PIE
             "main": False, "dylinker": None, "rpaths": [], "code_signature": None}
    offset = base + 32
    for _ in range(ncmds):
        cmd, size = struct.unpack_from("<II", data, offset)
        if cmd == 0x32:  # LC_BUILD_VERSION
            platform, minos, sdk = struct.unpack_from("<III", data, offset + 8)
            found["min_os"] = {"platform": PLATFORM.get(platform, platform), "minos": packed(minos), "sdk": packed(sdk)}
        elif cmd in (0x24, 0x25):  # LC_VERSION_MIN_MACOSX / _IPHONEOS
            minos, sdk = struct.unpack_from("<II", data, offset + 8)
            found["min_os"] = {"platform": "macos" if cmd == 0x24 else "ios", "minos": packed(minos), "sdk": packed(sdk)}
        elif cmd in (0xC, 0x20, 0x80000018, 0x8000001F, 0x80000023):  # LOAD, LAZY, WEAK, REEXPORT, UPWARD
            found["dylibs"].append(cstr(data, offset + struct.unpack_from("<I", data, offset + 8)[0]))
        elif cmd == 0x80000028:  # LC_MAIN
            found["main"] = True
        elif cmd == 0xE:  # LC_LOAD_DYLINKER
            found["dylinker"] = cstr(data, offset + struct.unpack_from("<I", data, offset + 8)[0])
        elif cmd == 0x8000001C:  # LC_RPATH
            found["rpaths"].append(cstr(data, offset + struct.unpack_from("<I", data, offset + 8)[0]))
        elif cmd == 0x1D:  # LC_CODE_SIGNATURE: the blob's offset (from the slice) and size
            dataoff, datasize = struct.unpack_from("<II", data, offset + 8)
            found["code_signature"] = {"offset": dataoff, "size": datasize,
                                       "in_file": datasize > 0 and base + dataoff + datasize <= len(data)}
        offset += size
    return found


def macho(data):
    if struct.unpack_from(">I", data, 0)[0] == 0xCAFEBABE:
        count = struct.unpack_from(">I", data, 4)[0]
        offsets = [struct.unpack_from(">iiIII", data, 8 + 20 * i)[2] for i in range(count)]
        return {"format": "macho", "fat": True, "slices": [macho_slice(data, o) for o in offsets]}
    return {"format": "macho", "fat": False, "slices": [macho_slice(data, 0)]}


# ------------------------------------------------------------------------- PE
DLL_CHARACTERISTICS = ((0x0020, "HIGH_ENTROPY_VA"), (0x0040, "DYNAMIC_BASE"), (0x0080, "FORCE_INTEGRITY"),
                       (0x0100, "NX_COMPAT"), (0x0200, "NO_ISOLATION"), (0x0400, "NO_SEH"), (0x0800, "NO_BIND"),
                       (0x1000, "APPCONTAINER"), (0x2000, "WDM_DRIVER"), (0x4000, "GUARD_CF"),
                       (0x8000, "TERMINAL_SERVER_AWARE"))


def pe(data):
    header = struct.unpack_from("<I", data, 0x3C)[0]
    if data[header:header + 4] != b"PE\0\0":
        return {"format": "pe (no PE signature)"}
    machine, nsections, _ts, _sym, _nsym, opt_size, characteristics = struct.unpack_from("<HHIIIHH", data, header + 4)
    opt = header + 24
    if struct.unpack_from("<H", data, opt)[0] != 0x20B:
        return {"format": "pe (not PE32+)"}
    os_major, os_minor, _im, _in, sub_major, sub_minor = struct.unpack_from("<HHHHHH", data, opt + 40)
    subsystem, dll_characteristics = struct.unpack_from("<HH", data, opt + 68)
    ndirs = struct.unpack_from("<I", data, opt + 108)[0]
    dirs = [struct.unpack_from("<II", data, opt + 112 + 8 * i) for i in range(ndirs)]
    table = opt + opt_size
    sections = [struct.unpack_from("<8sIIII", data, table + 40 * i)[1:] for i in range(nsections)]

    def at(rva):
        for vsize, vaddr, rawsize, rawptr in sections:
            if vaddr <= rva < vaddr + max(vsize, rawsize):
                return rawptr + rva - vaddr
        raise ValueError(f"RVA {rva:#x} outside every section")

    def names(index, size, name_field):
        found = []
        if ndirs > index and dirs[index][0]:
            offset = at(dirs[index][0])
            while any(struct.unpack_from(f"<{size // 4}I", data, offset)):
                found.append(cstr(data, at(struct.unpack_from("<I", data, offset + name_field)[0])))
                offset += size
        return found
    return {"format": "pe32+", "arch": {0x8664: "x86_64", 0xAA64: "arm64"}.get(machine, f"machine {machine:#x}"),
            "dll": bool(characteristics & 0x2000), "os_version": f"{os_major}.{os_minor}",
            "subsystem_version": f"{sub_major}.{sub_minor}",
            "imports": names(1, 20, 12), "delay_imports": names(13, 32, 4),
            "executable": bool(characteristics & 0x0002), "relocs_stripped": bool(characteristics & 0x0001),
            "subsystem": subsystem,
            "dll_characteristics": [name for bit, name in DLL_CHARACTERISTICS if dll_characteristics & bit]}


def inspect(data):
    if data[:4] == b"\x7fELF":
        return elf(data)
    if data[:2] == b"MZ":
        return pe(data)
    if data[:4] in (b"\xcf\xfa\xed\xfe", b"\xca\xfe\xba\xbe"):
        return macho(data)
    return {"format": f"unknown magic {data[:4].hex()}"}


# CLI release assets: <stem>.tar.gz holds <stem>/qrscan and <stem>.zip holds
# <stem>/qrscan.exe; the source archive and SHA256SUMS hold no executable.
CLI_ARCHIVE = re.compile(r"^qrcode-barcode-scanner-cli-(?P<version>\d+\.\d+\.\d+)"
                         r"-(?P<triple>[a-z0-9_]+(?:-[a-z0-9_]+)+)\.(?P<ext>tar\.gz|zip)$")
CLI_NOT_EXECUTABLE = re.compile(r"^qrcode-barcode-scanner-cli-\d+\.\d+\.\d+-(?:source\.tar\.gz|SHA256SUMS)$")
ARCHIVE_SUFFIXES = (".tar.gz", ".tgz", ".zip", ".whl")


def cli_member(name):
    """(triple, ext, executable member, build-info member) of a CLI archive name, else None."""
    found = CLI_ARCHIVE.match(name)
    if not found or CLI_NOT_EXECUTABLE.match(name):
        return None
    stem = name[:-len(found["ext"]) - 1]
    exe = "qrscan.exe" if found["ext"] == "zip" else "qrscan"
    return found["triple"], found["ext"], f"{stem}/{exe}", f"{stem}/build-info.json"


def cli_kind(name):
    """How --policy cli takes an input: skipped, archive, foreign (another archive) or raw."""
    if CLI_NOT_EXECUTABLE.match(name):
        return "skipped"
    if cli_member(name):
        return "archive"
    return "foreign" if name.endswith(ARCHIVE_SUFFIXES) else "raw"


def read_members(path, ext, wanted):
    """Every copy of each wanted member, in archive order: its bytes, or None if not a regular file."""
    found = {}
    if ext == "zip":
        with zipfile.ZipFile(path) as archive:
            for info in archive.infolist():
                if info.filename in wanted:
                    if info.flag_bits & 0x1:
                        raise zipfile.BadZipFile(f"{info.filename} is encrypted")
                    file_type = (info.external_attr >> 16) & 0o170000  # S_IFMT; 0 when written without a mode
                    regular = not info.is_dir() and file_type in (0, 0o100000)
                    found.setdefault(info.filename, []).append(archive.read(info) if regular else None)
    else:
        with tarfile.open(path, "r:gz") as archive:
            for member in archive.getmembers():
                if member.name in wanted:
                    found.setdefault(member.name, []).append(
                        archive.extractfile(member).read() if member.isfile() else None)
    return found


def binaries(path):
    cli = cli_member(path.name)
    if cli:
        _triple, ext, exe, _info = cli
        for data in read_members(path, ext, {exe}).get(exe, []):
            if data is not None:
                yield f"{path.name}!{exe}", data
    elif path.name.endswith((".tgz", ".tar.gz")):
        with tarfile.open(path) as archive:
            for member in archive.getmembers():
                if member.isfile() and MEMBER.search(member.name):
                    yield f"{path.name}!{member.name}", archive.extractfile(member).read()
    elif path.suffix == ".whl":
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                if MEMBER.search(name):
                    yield f"{path.name}!{name}", archive.read(name)
    else:
        yield str(path), path.read_bytes()


# --------------------------------------------------------------------- policy
NODE_FLOOR = {
    "linux-x64-gnu": {"format": "elf64", "arch": "x86_64", "libc": "glibc", "glibc": "2.28"},
    "linux-arm64-gnu": {"format": "elf64", "arch": "aarch64", "libc": "glibc", "glibc": "2.28"},
    "linux-x64-musl": {"format": "elf64", "arch": "x86_64", "libc": "musl"},
    "darwin-x64": {"format": "macho", "arch": "x86_64", "minos": "10.15"},
    "darwin-arm64": {"format": "macho", "arch": "arm64", "minos": "11.0"},
    "win32-x64-msvc": {"format": "pe32+", "arch": "x86_64"},
}
ELF_SYSTEM = {"libc.so.6", "libm.so.6", "libpthread.so.0", "librt.so.1", "libdl.so.2", "libgcc_s.so.1",
              "ld-linux-x86-64.so.2", "ld-linux-aarch64.so.1", "libc.so", "libc.musl-x86_64.so.1"}
WINDOWS_SYSTEM = {"kernel32.dll", "ntdll.dll", "bcryptprimitives.dll", "bcrypt.dll", "advapi32.dll",
                  "ws2_32.dll", "userenv.dll", "secur32.dll", "crypt32.dll", "ole32.dll", "oleaut32.dll",
                  "shell32.dll", "user32.dll", "psapi.dll", "synchronization.dll"}
VC_RUNTIME = re.compile(r"^(vcruntime|msvcp|msvcr|concrt|vccorlib)\d", re.I)

# The prebuilt qrscan rows: what each executable may need from the host that
# runs it. GNU rows link against glibc 2.28 and load through its loader; the
# macOS minimum is pinned exactly, so a compiler or SDK default cannot drift it.
CLI_FLOOR = {
    "x86_64-unknown-linux-gnu": {"format": "elf64", "arch": "x86_64", "ext": "tar.gz",
                                 "interp": "/lib64/ld-linux-x86-64.so.2", "glibc": "2.28"},
    "aarch64-unknown-linux-gnu": {"format": "elf64", "arch": "aarch64", "ext": "tar.gz",
                                  "interp": "/lib/ld-linux-aarch64.so.1", "glibc": "2.28"},
    "x86_64-apple-darwin": {"format": "macho", "arch": "x86_64", "ext": "tar.gz", "minos": "10.15", "signed": False},
    "aarch64-apple-darwin": {"format": "macho", "arch": "arm64", "ext": "tar.gz", "minos": "11.0", "signed": True},
    "x86_64-pc-windows-msvc": {"format": "pe32+", "arch": "x86_64", "ext": "zip"},
}
UNWINDERS = ("zig-libunwind", "libgcc_s")
ELF_GLIBC = ELF_SYSTEM - {"libc.so", "libc.musl-x86_64.so.1"}
# Home, temp, Actions work and tool-cache directories of build hosts; --forbid adds exact strings.
LEAK_MARKERS = ("/home/", "/Users/", "C:\\Users\\", "D:\\a\\", "/__w/", "/private/var/folders/",
                "/opt/hostedtoolcache/")
ELF_TYPE = {1: "ET_REL", 2: "ET_EXEC", 3: "ET_DYN", 4: "ET_CORE"}
MACHO_TYPE = {1: "MH_OBJECT", 2: "MH_EXECUTE", 6: "MH_DYLIB", 7: "MH_DYLINKER", 8: "MH_BUNDLE"}
SUBSYSTEM = {1: "native", 2: "Windows GUI", 3: "console"}
ASLR_NX = ("HIGH_ENTROPY_VA", "DYNAMIC_BASE", "NX_COMPAT")  # DllCharacteristics every CLI executable sets


def node_problems(label, report):
    suffix = re.search(r"\.([a-z0-9]+(?:-[a-z0-9]+)+)\.node$", label)
    floor = NODE_FLOOR.get(suffix.group(1)) if suffix else None
    if floor is None:
        return [f"{label}: not a <name>.<napi-suffix>.node of a release target"]
    target, problems = suffix.group(1), []
    if report.get("format") != floor["format"]:
        return [f"{label}: {report.get('format')}, not {floor['format']}"]
    if floor["format"] == "elf64":
        if report["arch"] != floor["arch"]:
            problems.append(f"{label}: {report['arch']}, not {floor['arch']}")
        if report["libc"] != floor["libc"]:
            problems.append(f"{label}: libc {report['libc']}, not {floor['libc']}")
        glibc = report["highest_versions"].get("GLIBC")
        if floor["libc"] == "glibc" and (glibc is None or version_key(glibc) > version_key(floor["glibc"])):
            problems.append(f"{label}: needs {glibc}, above Node 18's glibc {floor['glibc']}")
        if floor["libc"] == "musl" and glibc:
            problems.append(f"{label}: a musl build needs {glibc}")
        problems += [f"{label}: needs {lib}, not a system library" for lib in report["needed"] if lib not in ELF_SYSTEM]
    elif floor["format"] == "macho":
        slices = [s for s in report["slices"] if s["arch"] == floor["arch"]]
        if len(slices) != 1:
            return problems + [f"{label}: {len(slices)} {floor['arch']} slices"]
        found = slices[0]
        minos = (found["min_os"] or {}).get("minos")
        if minos is None or version_key(minos) > version_key(floor["minos"]):
            problems.append(f"{label}: minimum macOS {minos}, above Node 18's {floor['minos']} on {target}")
        if "/usr/lib/libSystem.B.dylib" not in found["dylibs"]:
            problems.append(f"{label}: no libSystem among its dylibs")
        problems += [f"{label}: loads {lib}, not an OS library" for lib in found["dylibs"]
                     if not lib.startswith(("/usr/lib/", "/System/Library/Frameworks/"))]
    else:
        if report["arch"] != floor["arch"]:
            problems.append(f"{label}: {report['arch']}, not {floor['arch']}")
        every = report["imports"] + report["delay_imports"]
        if "kernel32.dll" not in {name.lower() for name in report["imports"]}:
            problems.append(f"{label}: no kernel32.dll import")
        for name in every:
            if VC_RUNTIME.match(name):
                problems.append(f"{label}: imports {name}, which node.exe does not carry")
            elif not (name.lower() in WINDOWS_SYSTEM or name.lower().startswith("api-ms-win-")):
                problems.append(f"{label}: imports {name}, not a Windows system DLL")
    return problems


def leak_problems(label, data, forbid):
    problems = []
    for kind, texts in (("build-host path", LEAK_MARKERS), ("--forbid string", forbid)):
        for text in texts:
            for encoding, note in (("utf-8", ""), ("utf-16-le", " (UTF-16LE)")):
                if text.encode(encoding) in data:
                    problems.append(f"{label}: holds the {kind} {text}{note}")
    return problems


def elf_cli_problems(label, floor, report, unwinder):
    problems = []
    if report["arch"] != floor["arch"]:
        problems.append(f"{label}: {report['arch']}, not {floor['arch']}")
    if report["elf_type"] != 3:
        kind = ELF_TYPE.get(report["elf_type"], f"e_type {report['elf_type']}")
        problems.append(f"{label}: {kind}, not ET_DYN: not a position-independent executable")
    if report["interp"] is None:
        problems.append(f"{label}: no PT_INTERP: not a dynamically linked executable")
    elif report["interp"] != floor["interp"]:
        problems.append(f"{label}: interpreter {report['interp']}, not {floor['interp']}")
    if report["gnu_stack"] is None:
        problems.append(f"{label}: no PT_GNU_STACK: the loader may map an executable stack")
    elif "X" in report["gnu_stack"]:
        problems.append(f"{label}: an executable stack (PT_GNU_STACK {report['gnu_stack']})")
    problems += [f"{label}: DT_RPATH {path}: a library search path" for path in report["rpath"]]
    problems += [f"{label}: DT_RUNPATH {path}: a library search path" for path in report["runpath"]]
    if "libc.so.6" not in report["needed"]:
        problems.append(f"{label}: does not need libc.so.6 (the glibc anchor)")
    problems += [f"{label}: needs {lib}, not a glibc system library" for lib in report["needed"]
                 if lib not in ELF_GLIBC]
    # cargo-zigbuild links Zig's static libunwind in place of libgcc_s; the
    # other toolchain unwinds through the system's libgcc_s.so.1.
    gcc_s = "libgcc_s.so.1" in report["needed"]
    if unwinder == "zig-libunwind" and gcc_s:
        problems.append(f"{label}: needs libgcc_s.so.1, but its unwinder is zig-libunwind")
    elif unwinder == "libgcc_s" and not gcc_s:
        problems.append(f"{label}: does not need libgcc_s.so.1, but its unwinder is libgcc_s")
    glibc = report["highest_versions"].get("GLIBC")
    if glibc is None:
        problems.append(f"{label}: no GLIBC_ symbol version (the glibc anchor)")
    elif version_key(glibc) > version_key(floor["glibc"]):
        problems.append(f"{label}: needs {glibc}, above glibc {floor['glibc']}")
    return problems


def macho_cli_problems(label, floor, report):
    if report["fat"]:
        arches = ", ".join(found["arch"] for found in report["slices"])
        return [f"{label}: a fat Mach-O ({arches}), not a thin {floor['arch']} executable"]
    found, problems = report["slices"][0], []
    if found["arch"] != floor["arch"]:
        problems.append(f"{label}: {found['arch']}, not {floor['arch']}")
    if "filetype" not in found:  # not a 64-bit Mach-O header: nothing more to read
        return problems
    if found["filetype"] != 2:
        kind = MACHO_TYPE.get(found["filetype"], f"filetype {found['filetype']}")
        problems.append(f"{label}: {kind}, not MH_EXECUTE")
    if not found["pie"]:
        problems.append(f"{label}: no MH_PIE flag: not a position-independent executable")
    if not found["main"]:
        problems.append(f"{label}: no LC_MAIN")
    if found["dylinker"] is None:
        problems.append(f"{label}: no LC_LOAD_DYLINKER")
    elif found["dylinker"] != "/usr/lib/dyld":
        problems.append(f"{label}: dylinker {found['dylinker']}, not /usr/lib/dyld")
    min_os = found["min_os"]
    if min_os is None:
        problems.append(f"{label}: no minimum OS version")
    elif min_os["platform"] != "macos":
        problems.append(f"{label}: minimum OS for {min_os['platform']}, not macos")
    elif version_key(min_os["minos"]) != version_key(floor["minos"]):
        problems.append(f"{label}: minimum macOS {min_os['minos']}, not exactly {floor['minos']}")
    if "/usr/lib/libSystem.B.dylib" not in found["dylibs"]:
        problems.append(f"{label}: no libSystem among its dylibs")
    problems += [f"{label}: loads {lib}, not an OS library" for lib in found["dylibs"]
                 if not lib.startswith(("/usr/lib/", "/System/Library/Frameworks/"))]
    problems += [f"{label}: LC_RPATH {path}: a library search path" for path in found["rpaths"]]
    signature = found["code_signature"]
    if signature is None:
        if floor["signed"]:
            problems.append(f"{label}: no LC_CODE_SIGNATURE: arm64 macOS runs signed code only")
    elif not signature["in_file"]:
        problems.append(f"{label}: LC_CODE_SIGNATURE runs past the end of the file")
    return problems


def pe_cli_problems(label, floor, report):
    problems = []
    if report["arch"] != floor["arch"]:
        problems.append(f"{label}: {report['arch']}, not {floor['arch']}")
    if report["dll"]:
        problems.append(f"{label}: a DLL, not an executable")
    elif not report["executable"]:
        problems.append(f"{label}: not marked IMAGE_FILE_EXECUTABLE_IMAGE")
    if report["subsystem"] != 3:
        name = SUBSYSTEM.get(report["subsystem"])
        shown = f"{report['subsystem']} ({name})" if name else str(report["subsystem"])
        problems.append(f"{label}: subsystem {shown}, not 3 (console)")
    problems += [f"{label}: DllCharacteristics lacks {flag}" for flag in ASLR_NX
                 if flag not in report["dll_characteristics"]]
    if report["relocs_stripped"]:
        problems.append(f"{label}: relocations stripped: it cannot load at a random base")
    if "kernel32.dll" not in {name.lower() for name in report["imports"]}:
        problems.append(f"{label}: no kernel32.dll import")
    for name in report["imports"] + report["delay_imports"]:
        lower = name.lower()
        if VC_RUNTIME.match(name):
            problems.append(f"{label}: imports {name}, a Visual C++ runtime DLL")
        elif lower == "ucrtbase.dll" or lower.startswith("api-ms-win-crt-"):
            problems.append(f"{label}: imports {name}, the Universal C Runtime")
        elif not (lower in WINDOWS_SYSTEM or lower.startswith("api-ms-win-core-")):
            problems.append(f"{label}: imports {name}, not a Windows system DLL")
    return problems


def cli_problems(label, target, report, data, unwinder, forbid):
    """Every refusal of one qrscan executable against its row; each names LABEL."""
    floor = CLI_FLOOR[target]
    if report.get("format") != floor["format"]:
        problems = [f"{label}: {report.get('format')}, not {floor['format']}"]
    elif floor["format"] == "elf64":
        problems = elf_cli_problems(label, floor, report, unwinder)
    elif floor["format"] == "macho":
        problems = macho_cli_problems(label, floor, report)
    else:
        problems = pe_cli_problems(label, floor, report)
    return problems + leak_problems(label, data, forbid)


def judge(paths, policy, complete):
    reports, problems = [], []
    for path in paths:
        for label, data in binaries(Path(path)):
            report = {"input": label, **inspect(data)}
            reports.append(report)
            if policy == "node":
                problems += node_problems(label, report)
    if policy == "node" and complete:
        seen = [m.group(1) for r in reports if (m := re.search(r"\.([a-z0-9-]+)\.node$", r["input"]))]
        problems += [f"{target}: {seen.count(target)} addons, expected 1" for target in NODE_FLOOR
                     if seen.count(target) != 1]
    return reports, problems


def archive_unwinder(name, info, copies):
    """The unwinder a GNU archive's build-info.json names (linker.unwinder), and the refusals reading it."""
    if len(copies) != 1:
        return None, [f"{name}: {len(copies)} {info} members, expected 1"]
    if copies[0] is None:
        return None, [f"{name}!{info}: not a regular file"]
    try:
        facts = json.loads(copies[0])
    except ValueError:
        return None, [f"{name}!{info}: not JSON"]
    linker = facts.get("linker") if isinstance(facts, dict) else None
    unwinder = linker.get("unwinder") if isinstance(linker, dict) else None
    if unwinder not in UNWINDERS:
        return None, [f"{name}!{info}: linker.unwinder is {json.dumps(unwinder)}, not one of {', '.join(UNWINDERS)}"]
    return unwinder, []


def cli_entries(path, target, unwinder):
    """[(label, bytes, triple, unwinder, unwinder_from)] of one --policy cli input, and its refusals."""
    if cli_kind(path.name) == "raw":  # --target and --unwinder describe it
        gnu = CLI_FLOOR[target]["format"] == "elf64"
        return [(str(path), path.read_bytes(), target, unwinder if gnu else None, "--unwinder" if gnu else None)], []
    triple, ext, exe, info = cli_member(path.name)
    if triple not in CLI_FLOOR:
        return [], [f"{path.name}: {triple} is not a release target"]
    if ext != CLI_FLOOR[triple]["ext"]:
        return [], [f"{path.name}: a .{ext} archive, but {triple} ships as .{CLI_FLOOR[triple]['ext']}"]
    gnu = CLI_FLOOR[triple]["format"] == "elf64"
    try:
        members = read_members(path, ext, {exe, info} if gnu else {exe})
    except (OSError, EOFError, RuntimeError, tarfile.TarError, zipfile.BadZipFile, zlib.error) as error:
        return [], [f"{path.name}: unreadable archive ({error})"]
    copies = members.get(exe, [])
    if len(copies) != 1:
        return [], [f"{path.name}: {len(copies)} {exe} members, expected 1"]
    if copies[0] is None:
        return [], [f"{path.name}!{exe}: not a regular file"]
    found, problems = archive_unwinder(path.name, info, members.get(info, [])) if gnu else (None, [])
    return [(f"{path.name}!{exe}", copies[0], triple, found, "build-info.json" if gnu else None)], problems


def judge_cli(paths, complete, target, unwinder, forbid):
    reports, problems, skipped = [], [], []
    for path in map(Path, paths):
        kind = cli_kind(path.name)
        if kind == "skipped":
            skipped.append(path.name)
            continue
        if kind == "foreign":
            problems.append(f"{path.name}: not a qrcode-barcode-scanner-cli-<version>-<triple>.tar.gz or .zip archive")
            continue
        entries, refused = cli_entries(path, target, unwinder)
        problems += refused
        for label, data, triple, found_unwinder, unwinder_from in entries:
            try:
                found = inspect(data)
            except (IndexError, ValueError, struct.error) as error:
                found = {"format": f"unreadable ({error})"}
            report = {"input": label, "target": triple, "unwinder": found_unwinder, "unwinder_from": unwinder_from,
                      **found}
            reports.append(report)
            problems += cli_problems(label, triple, report, data, found_unwinder, forbid)
    if complete:
        seen = [report["target"] for report in reports]
        problems += [f"{triple}: {seen.count(triple)} executables, expected 1" for triple in CLI_FLOOR
                     if seen.count(triple) != 1]
    return reports, problems, skipped


def cli_usage(parser, args):
    """--policy cli usage errors (exit 2), before anything is read."""
    for value in args.inputs:
        if not Path(value).is_file():
            parser.error(f"no such file: {value}")
    raw = [value for value in args.inputs if cli_kind(Path(value).name) == "raw"]
    if raw and not args.target:
        parser.error(f"{raw[0]}: a raw binary needs --target")
    if args.target and len(raw) != 1:
        parser.error(f"--target describes one raw binary, and {len(raw)} were given")
    gnu = bool(args.target) and CLI_FLOOR[args.target]["format"] == "elf64"
    if gnu and not args.unwinder:
        parser.error(f"--target {args.target} needs --unwinder ({' or '.join(UNWINDERS)})")
    if args.unwinder and not gnu:
        parser.error("--unwinder describes a raw GNU/Linux binary (--target *-linux-gnu)")
    if "" in args.forbid:
        parser.error("--forbid needs a non-empty string")


# ------------------------------------------------------------------ self-test
def make_elf(machine=62, needed=("libc.so.6", "libgcc_s.so.1"), versions=("GLIBC_2.17", "GLIBC_2.2.5"),
             e_type=3, interp=None, stack=None, rpath=(), runpath=(), extra=b""):
    """A shared object needing NEEDED, VERSIONS from its libc. `interp` adds PT_INTERP, `stack`
    (its p_flags) PT_GNU_STACK, `rpath`/`runpath` their dynamic entries; `extra` trails the file."""
    strings = b"\0"
    offsets = {}
    for text in (*needed, *versions, *rpath, *runpath):
        offsets[text] = len(strings)
        strings += text.encode() + b"\0"
    dynamic = b"".join(struct.pack("<qQ", tag, offsets[text])
                       for tag, texts in ((1, needed), (15, rpath), (29, runpath)) for text in texts)
    dynamic += struct.pack("<qQ", 0, 0)
    library = next((n for n in needed if n.startswith("libc")), needed[0])
    verneed = struct.pack("<HHIII", 1, len(versions), offsets[library], 16, 0)
    for i, name in enumerate(versions):
        verneed += struct.pack("<IHHII", 0, 0, 2 + i, offsets[name], 16 if i < len(versions) - 1 else 0)
    segments = [(3, 4, interp.encode() + b"\0")] if interp is not None else []  # PT_INTERP, PF_R
    if stack is not None:
        segments.append((0x6474E551, stack, b""))  # PT_GNU_STACK
    body = [strings, dynamic, verneed] + [payload for _type, _flags, payload in segments]
    offset, layout = 64 + 56 * len(segments), []
    for part in body:
        layout.append((offset, len(part)))
        offset += len(part)
    shoff = offset
    header = b"\x7fELF" + bytes([2, 1, 1]) + bytes(9) + struct.pack(
        "<HHIQQQIHHHHHH", e_type, machine, 1, 0, 64 if segments else 0, shoff, 0, 64, 56, len(segments), 64, 4, 0)
    phdrs = b"".join(struct.pack("<IIQQQQQQ", p_type, flags, layout[3 + i][0], 0, 0, layout[3 + i][1],
                                 layout[3 + i][1], 1) for i, (p_type, flags, _payload) in enumerate(segments))
    shdrs = bytes(64)
    for sh_type, (off, size), link, info in ((3, layout[0], 0, 0), (6, layout[1], 1, 0),
                                             (0x6FFFFFFE, layout[2], 1, 1)):
        shdrs += struct.pack("<IIQQQQIIQQ", 0, sh_type, 0, 0, off, size, link, info, 8, 0)
    return header + phdrs + b"".join(body) + shdrs + extra


def make_macho(cpu=0x0100000C, minos=(11, 0), dylibs=("/usr/lib/libSystem.B.dylib",), more=(),
               filetype=8, flags=0, extra_commands=(), platform=1):
    """An MH_BUNDLE unless `filetype` says otherwise: `dylibs` through LC_LOAD_DYLIB, then `more`
    as (load command, dylib) pairs, then `extra_commands` as raw load commands."""
    commands = struct.pack("<IIIIII", 0x32, 24, platform, minos[0] << 16 | minos[1] << 8, 26 << 16, 0)
    loads = [(0xC, name) for name in dylibs] + list(more)
    for cmd, name in loads:
        raw = name.encode() + b"\0"
        raw += bytes(-(24 + len(raw)) % 8)
        commands += struct.pack("<IIIIII", cmd, 24 + len(raw), 24, 0, 0, 0) + raw
    commands += b"".join(extra_commands)
    count = 1 + len(loads) + len(extra_commands)
    return struct.pack("<IiiIIIII", 0xFEEDFACF, cpu, 0, filetype, count, len(commands), flags, 0) + commands


def load_text(cmd, text):
    """A load command holding one string at offset 12 (LC_LOAD_DYLINKER, LC_RPATH)."""
    raw = text.encode() + b"\0"
    raw += bytes(-(12 + len(raw)) % 8)
    return struct.pack("<III", cmd, 12 + len(raw), 12) + raw


def make_executable_macho(cpu=0x0100000C, minos=(11, 0), signed=True, filetype=2, flags=0x00200085, main=True,
                          dylinker="/usr/lib/dyld", dylibs=("/usr/lib/libSystem.B.dylib",), rpaths=(), platform=1,
                          extra=b"", signature=16):
    """An executable as ld64 links one: MH_NOUNDEFS|MH_DYLDLINK|MH_TWOLEVEL|MH_PIE, /usr/lib/dyld,
    LC_MAIN. `extra` trails the load commands; when signed, a 16-byte blob follows, which
    LC_CODE_SIGNATURE declares as `signature` bytes."""
    commands = [load_text(0xE, dylinker)] if dylinker else []
    if main:
        commands.append(struct.pack("<IIQQ", 0x80000028, 24, 0x4000, 0))
    commands += [load_text(0x8000001C, path) for path in rpaths]
    if signed:
        start = len(make_macho(cpu, minos, dylibs, (), filetype, flags, commands, platform)) + 16 + len(extra)
        commands.append(struct.pack("<IIII", 0x1D, 16, start, signature))
    blob = bytes(16) if signed else b""
    return make_macho(cpu, minos, dylibs, (), filetype, flags, commands, platform) + extra + blob


def make_fat(*slices):
    """A universal binary of (cputype, Mach-O bytes) slices at 8-byte aligned offsets."""
    table, body, start = b"", b"", 8 + 20 * len(slices)
    for cpu, data in slices:
        body += bytes(-(start + len(body)) % 8)
        table += struct.pack(">iiIII", cpu, 0, start + len(body), len(data), 3)
        body += data
    return struct.pack(">II", 0xCAFEBABE, len(slices)) + table + body


def make_pe(imports=("KERNEL32.dll", "api-ms-win-core-synch-l1-2-0.dll"), delayed=(), machine=0x8664,
            characteristics=0x2022, subsystem=3, dll_characteristics=0, extra=b""):
    """A PE32+ DLL unless `characteristics` says otherwise, importing IMPORTS and delay-loading
    DELAYED; `extra` trails the file."""
    header, opt_size, raw = 0x80, 240, 0x400
    va = 0x1000
    names, blob_names = {}, b""
    for name in (*imports, *delayed):
        names[name] = len(blob_names)
        blob_names += name.encode() + b"\0"
    descriptors_size = 20 * (len(imports) + 1)
    delay_size = 32 * (len(delayed) + 1)
    base_names = va + descriptors_size + delay_size
    descriptors = b"".join(struct.pack("<IIIII", 0, 0, 0, base_names + names[n], 0) for n in imports) + bytes(20)
    delay = b"".join(struct.pack("<8I", 1, base_names + names[n], 0, 0, 0, 0, 0, 0) for n in delayed) + bytes(32)
    section = descriptors + delay + blob_names
    dirs = [(0, 0)] * 16
    dirs[1] = (va, descriptors_size)
    if delayed:
        dirs[13] = (va + descriptors_size, delay_size)
    optional = struct.pack("<H", 0x20B) + bytes(38) + struct.pack("<HHHHHH", 6, 0, 0, 0, 6, 0)
    optional += bytes(68 - len(optional)) + struct.pack("<HH", subsystem, dll_characteristics)
    optional += bytes(108 - len(optional)) + struct.pack("<I", 16) + b"".join(struct.pack("<II", *d) for d in dirs)
    coff = b"PE\0\0" + struct.pack("<HHIIIHH", machine, 1, 0, 0, 0, opt_size, characteristics)
    table = struct.pack("<8sIIIIIIHHI", b".idata", len(section), va, len(section), raw, 0, 0, 0, 0, 0)
    image = bytearray(b"MZ" + bytes(header - 2))
    struct.pack_into("<I", image, 0x3C, header)
    image += coff + optional + table
    image += bytes(raw - len(image)) + section + extra
    return bytes(image)


def cli_self_test():
    """--policy cli: (failures, counts). Clean executables pass; each planted defect is refused with
    exactly its named reasons; then the command line on CLI release archives and raw binaries."""
    x64, arm = "x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu"
    intel, mac, win = "x86_64-apple-darwin", "aarch64-apple-darwin", "x86_64-pc-windows-msvc"
    zig = "zig-libunwind"
    glibc = ("libc.so.6", "libm.so.6", "libpthread.so.0", "libdl.so.2", "ld-linux-x86-64.so.2")
    gnu = {"needed": glibc, "versions": ("GLIBC_2.2.5", "GLIBC_2.28"), "interp": "/lib64/ld-linux-x86-64.so.2",
           "stack": 6}  # PF_R|PF_W
    gnu_arm = {"machine": 183, "needed": ("libc.so.6", "ld-linux-aarch64.so.1"),
               "versions": ("GLIBC_2.17", "GLIBC_2.28"), "interp": "/lib/ld-linux-aarch64.so.1", "stack": 6}
    system = ("KERNEL32.dll", "ntdll.dll", "bcryptprimitives.dll", "api-ms-win-core-synch-l1-2-0.dll")
    # IMAGE_FILE_EXECUTABLE_IMAGE|LARGE_ADDRESS_AWARE; HIGH_ENTROPY_VA|DYNAMIC_BASE|NX_COMPAT|TERMINAL_SERVER_AWARE
    console = {"imports": system, "characteristics": 0x22, "dll_characteristics": 0x8160}
    core_foundation = "/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation"

    def gnu_elf(**changes):
        return make_elf(**{**gnu, **changes})

    def console_pe(**changes):
        return make_pe(**{**console, **changes})

    def intel_macho(**changes):
        return make_executable_macho(**{"cpu": 0x01000007, "minos": (10, 15), "signed": False, **changes})

    clean = {x64: gnu_elf(), arm: make_elf(**gnu_arm), intel: intel_macho(), mac: make_executable_macho(),
             win: console_pe()}
    # (case, target, bytes, unwinder, --forbid strings, refusal reasons after "qrscan: ")
    cases = [(f"clean {target}", target, data, zig if target in (x64, arm) else None, (), [])
             for target, data in clean.items()]
    cases += [
        ("libgcc_s.so.1 under libgcc_s", x64, gnu_elf(needed=(*glibc, "libgcc_s.so.1")), "libgcc_s", (), []),
        ("an ad-hoc signed x86_64", intel, intel_macho(signed=True), None, (), []),
        ("a system framework", intel, intel_macho(dylibs=("/usr/lib/libSystem.B.dylib", core_foundation)), None, (),
         []),
        ("GLIBC_2.29", x64, gnu_elf(versions=("GLIBC_2.2.5", "GLIBC_2.29")), zig, (),
         ["needs GLIBC_2.29, above glibc 2.28"]),
        ("no PT_INTERP", x64, gnu_elf(interp=None), zig, (), ["no PT_INTERP: not a dynamically linked executable"]),
        ("ET_EXEC", x64, gnu_elf(e_type=2), zig, (), ["ET_EXEC, not ET_DYN: not a position-independent executable"]),
        ("an executable stack", x64, gnu_elf(stack=7), zig, (), ["an executable stack (PT_GNU_STACK RWX)"]),
        ("no PT_GNU_STACK", x64, gnu_elf(stack=None), zig, (),
         ["no PT_GNU_STACK: the loader may map an executable stack"]),
        ("DT_RUNPATH", x64, gnu_elf(runpath=("$ORIGIN/../lib",)), zig, (),
         ["DT_RUNPATH $ORIGIN/../lib: a library search path"]),
        ("DT_RPATH", x64, gnu_elf(rpath=("/usr/local/lib",)), zig, (),
         ["DT_RPATH /usr/local/lib: a library search path"]),
        ("libssl.so.3", x64, gnu_elf(needed=(*glibc, "libssl.so.3")), zig, (),
         ["needs libssl.so.3, not a glibc system library"]),
        ("a wrong interpreter", x64, gnu_elf(interp="/lib/ld-musl-x86_64.so.1"), zig, (),
         ["interpreter /lib/ld-musl-x86_64.so.1, not /lib64/ld-linux-x86-64.so.2"]),
        ("the x86_64 loader on aarch64", arm, make_elf(**{**gnu_arm, "interp": "/lib64/ld-linux-x86-64.so.2"}), zig, (),
         ["interpreter /lib64/ld-linux-x86-64.so.2, not /lib/ld-linux-aarch64.so.1"]),
        ("libgcc_s.so.1 under zig-libunwind", x64, gnu_elf(needed=(*glibc, "libgcc_s.so.1")), zig, (),
         ["needs libgcc_s.so.1, but its unwinder is zig-libunwind"]),
        ("no libgcc_s.so.1 under libgcc_s", x64, gnu_elf(), "libgcc_s", (),
         ["does not need libgcc_s.so.1, but its unwinder is libgcc_s"]),
        ("a musl libc", x64, gnu_elf(needed=("libc.so",), versions=()), zig, (),
         ["does not need libc.so.6 (the glibc anchor)", "needs libc.so, not a glibc system library",
          "no GLIBC_ symbol version (the glibc anchor)"]),
        ("aarch64 bytes on the x86_64 row", x64, gnu_elf(machine=183), zig, (), ["aarch64, not x86_64"]),
        ("a 32-bit ELF", x64, gnu_elf()[:4] + b"\x01" + gnu_elf()[5:], zig, (),
         ["elf (not 64-bit little-endian), not elf64"]),
        ("a Mach-O on a GNU row", x64, make_executable_macho(), zig, (), ["macho, not elf64"]),
        ("fat", mac, make_fat((0x01000007, intel_macho()), (0x0100000C, make_executable_macho())), None, (),
         ["a fat Mach-O (x86_64, arm64), not a thin arm64 executable"]),
        ("minos 12.0 (arm64)", mac, make_executable_macho(minos=(12, 0)), None, (),
         ["minimum macOS 12.0.0, not exactly 11.0"]),
        ("minos 10.13 (x86_64)", intel, intel_macho(minos=(10, 13)), None, (),
         ["minimum macOS 10.13.0, not exactly 10.15"]),
        ("minos 11.0 (x86_64)", intel, intel_macho(minos=(11, 0)), None, (),
         ["minimum macOS 11.0.0, not exactly 10.15"]),
        ("no arm64 signature", mac, make_executable_macho(signed=False), None, (),
         ["no LC_CODE_SIGNATURE: arm64 macOS runs signed code only"]),
        ("a signature past the end", mac, make_executable_macho(signature=4096), None, (),
         ["LC_CODE_SIGNATURE runs past the end of the file"]),
        ("not PIE", mac, make_executable_macho(flags=0x85), None, (),
         ["no MH_PIE flag: not a position-independent executable"]),
        ("MH_DYLIB", mac, make_executable_macho(filetype=6), None, (), ["MH_DYLIB, not MH_EXECUTE"]),
        ("@rpath", mac, make_executable_macho(dylibs=("/usr/lib/libSystem.B.dylib", "@rpath/libqrscan.dylib")), None,
         (), ["loads @rpath/libqrscan.dylib, not an OS library"]),
        ("LC_RPATH", mac, make_executable_macho(rpaths=("@executable_path/../lib",)), None, (),
         ["LC_RPATH @executable_path/../lib: a library search path"]),
        ("no LC_MAIN", mac, make_executable_macho(main=False), None, (), ["no LC_MAIN"]),
        ("no LC_LOAD_DYLINKER", mac, make_executable_macho(dylinker=None), None, (), ["no LC_LOAD_DYLINKER"]),
        ("another dylinker", mac, make_executable_macho(dylinker="/usr/lib/dyld_sim"), None, (),
         ["dylinker /usr/lib/dyld_sim, not /usr/lib/dyld"]),
        ("an iOS minimum", mac, make_executable_macho(platform=2), None, (), ["minimum OS for ios, not macos"]),
        ("no libSystem", mac, make_executable_macho(dylibs=(core_foundation,)), None, (),
         ["no libSystem among its dylibs"]),
        ("an x86_64 slice on the arm64 row", mac, intel_macho(minos=(11, 0), signed=True), None, (),
         ["x86_64, not arm64"]),
        ("GUI", win, console_pe(subsystem=2), None, (), ["subsystem 2 (Windows GUI), not 3 (console)"]),
        ("no NX_COMPAT", win, console_pe(dll_characteristics=0x8060), None, (), ["DllCharacteristics lacks NX_COMPAT"]),
        ("no DYNAMIC_BASE", win, console_pe(dll_characteristics=0x8120), None, (),
         ["DllCharacteristics lacks DYNAMIC_BASE"]),
        ("no HIGH_ENTROPY_VA", win, console_pe(dll_characteristics=0x8140), None, (),
         ["DllCharacteristics lacks HIGH_ENTROPY_VA"]),
        ("relocations stripped", win, console_pe(characteristics=0x23), None, (),
         ["relocations stripped: it cannot load at a random base"]),
        ("VCRUNTIME140.dll", win, console_pe(imports=(*system, "VCRUNTIME140.dll")), None, (),
         ["imports VCRUNTIME140.dll, a Visual C++ runtime DLL"]),
        ("a delay-loaded MSVCP140.dll", win, console_pe(delayed=("MSVCP140.dll",)), None, (),
         ["imports MSVCP140.dll, a Visual C++ runtime DLL"]),
        ("api-ms-win-crt-*", win, console_pe(imports=(*system, "api-ms-win-crt-runtime-l1-1-0.dll")), None, (),
         ["imports api-ms-win-crt-runtime-l1-1-0.dll, the Universal C Runtime"]),
        ("ucrtbase.dll", win, console_pe(imports=(*system, "ucrtbase.dll")), None, (),
         ["imports ucrtbase.dll, the Universal C Runtime"]),
        ("a DLL", win, console_pe(characteristics=0x2022), None, (), ["a DLL, not an executable"]),
        ("not an executable image", win, console_pe(characteristics=0x20), None, (),
         ["not marked IMAGE_FILE_EXECUTABLE_IMAGE"]),
        ("no kernel32", win, console_pe(imports=("ntdll.dll",)), None, (), ["no kernel32.dll import"]),
        ("an application DLL", win, console_pe(imports=(*system, "libqrscan.dll")), None, (),
         ["imports libqrscan.dll, not a Windows system DLL"]),
        ("an api-ms-win set outside core", win, console_pe(imports=(*system, "api-ms-win-security-base-l1-1-0.dll")),
         None, (), ["imports api-ms-win-security-base-l1-1-0.dll, not a Windows system DLL"]),
        ("an arm64 PE", win, console_pe(machine=0xAA64), None, (), ["arm64, not x86_64"]),
        ("an ELF on the Windows row", win, gnu_elf(), None, (), ["elf64, not pe32+"]),
        # Leaks: a path under each build-host directory (spelled here, not taken from LEAK_MARKERS),
        # a wide string, and --forbid strings.
        *((f"a path under {marker}", x64, gnu_elf(extra=path.encode()), zig, (),
           [f"holds the build-host path {marker}"]) for marker, path in (
              ("/home/", "/home/runner/work/scanner/scanner/crates/cli/src/main.rs"),
              ("/Users/", "/Users/runner/work/scanner/scanner/crates/cli/src/main.rs"),
              ("C:\\Users\\", "C:\\Users\\runneradmin\\.cargo\\registry\\src\\rxing\\src\\lib.rs"),
              ("D:\\a\\", "D:\\a\\scanner\\scanner\\crates\\cli\\src\\main.rs"),
              ("/__w/", "/__w/scanner/scanner/crates/cli/src/main.rs"),
              ("/private/var/folders/", "/private/var/folders/xy/abc/T/rustc-out/build.rs"),
              ("/opt/hostedtoolcache/", "/opt/hostedtoolcache/zig/0.14.1/x64/lib/libunwind/src/Unwind.c"))),
        ("a UTF-16LE leak", win, console_pe(extra="C:\\Users\\x\\.cargo".encode("utf-16-le")), None, (),
         ["holds the build-host path C:\\Users\\ (UTF-16LE)"]),
        ("a --forbid string", mac, make_executable_macho(extra=b"/tmp/qr-build-7/target/release"), None,
         ("/tmp/qr-build-7",), ["holds the --forbid string /tmp/qr-build-7"]),
        ("a UTF-16LE --forbid string", win, console_pe(extra="/tmp/qr-build-7".encode("utf-16-le")), None,
         ("/tmp/qr-build-7",), ["holds the --forbid string /tmp/qr-build-7 (UTF-16LE)"]),
    ]
    failures, refused = [], 0
    for case, target, data, unwinder, forbid, reasons in cases:
        got = cli_problems("qrscan", target, inspect(data), data, unwinder, forbid)
        want = [f"qrscan: {reason}" for reason in reasons]
        if got != want:
            failures.append(f"cli {case}: problems {got}, want {want}")
        elif reasons:
            refused += 1
    runs = cli_command_line(failures, clean, gnu_elf, console_pe, make_elf(**gnu_arm), glibc)
    return failures, {"cli_clean": len([c for c in cases if not c[5]]), "cli_refused": refused, "cli_runs": runs}


def cli_command_line(failures, clean, gnu_elf, console_pe, arm_elf, glibc):
    """main(argv) on CLI release archives as the release workflow assembles them, on the raw binary
    the build step scans, and on usage errors (exit 2, no receipt). Appends to FAILURES; returns
    the number of runs."""
    x64, arm = "x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu"
    mac, win = "aarch64-apple-darwin", "x86_64-pc-windows-msvc"
    zig = "zig-libunwind"
    with tempfile.TemporaryDirectory(prefix="native-floor-cli-") as scratch:
        root = Path(scratch)

        def release(triple, data, unwinder=zig, folder="", ext=None, facts=None, copies=1, info_copies=1, link=False):
            """root/folder/<stem>.<ext> holding build-info.json (`facts`; b"" for none), then the
            executable unless DATA is None (`link`: a symlink in its place). Copies repeat a member."""
            if ext is None:
                ext = CLI_FLOOR[triple]["ext"] if triple in CLI_FLOOR else "tar.gz"
            stem = f"qrcode-barcode-scanner-cli-1.2.3-{triple}"
            exe = f"{stem}/{'qrscan.exe' if ext == 'zip' else 'qrscan'}"
            if facts is None:
                linker = {"unwinder": unwinder if triple.endswith("-linux-gnu") else None}
                facts = json.dumps({"target": triple, "linker": linker}).encode()
            members = [(f"{stem}/build-info.json", facts)] * info_copies if facts else []
            members += [(exe, data)] * copies if data is not None else []
            path = root / folder / f"{stem}.{ext}"
            path.parent.mkdir(parents=True, exist_ok=True)
            if ext == "zip":
                with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
                    for name, content in members:
                        entry = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                        entry.create_system, entry.compress_type = 3, zipfile.ZIP_DEFLATED
                        entry.external_attr = (0o120777 if link and name == exe else 0o100755) << 16
                        archive.writestr(entry, b"qrscan.real" if link and name == exe else content)
            else:
                with tarfile.open(path, "w:gz") as archive:
                    for name, content in members:
                        info = tarfile.TarInfo(name)
                        if link and name == exe:
                            info.type, info.linkname = tarfile.SYMTYPE, "qrscan.real"
                            archive.addfile(info)
                            continue
                        info.size = len(content)
                        info.mode = 0o755 if name == exe else 0o644
                        archive.addfile(info, io.BytesIO(content))
            return str(path)

        def member(triple):
            stem, ext = f"qrcode-barcode-scanner-cli-1.2.3-{triple}", CLI_FLOOR[triple]["ext"]
            return f"{stem}.{ext}!{stem}/" + ("qrscan.exe" if ext == "zip" else "qrscan")

        every = {target: release(target, data) for target, data in clean.items()}

        def but(*left_out):
            return [path for target, path in every.items() if target not in left_out]

        source = root / "qrcode-barcode-scanner-cli-1.2.3-source.tar.gz"
        with tarfile.open(source, "w:gz") as archive:
            info = tarfile.TarInfo("qrcode-barcode-scanner-cli-1.2.3-source/README.md")
            info.size = 7
            archive.addfile(info, io.BytesIO(b"source\n"))
        sums = root / "qrcode-barcode-scanner-cli-1.2.3-SHA256SUMS"
        sums.write_bytes(b"".join(b"0" * 64 + b"  " + Path(path).name.encode() + b"\n"
                                  for path in (*every.values(), str(source))))
        npm = root / "qrcode-ai-com-qrcode-barcode-scanner-linux-x64-gnu-1.2.3.tgz"
        npm.write_bytes(b"\x1f\x8b")
        raw = root / "build" / "qrscan"
        raw.parent.mkdir()
        raw.write_bytes(clean[x64])
        leaky = root / "remap" / "qrscan"
        leaky.parent.mkdir()
        leaky.write_bytes(make_executable_macho(extra=b"/tmp/qr-build-7/target/release/build/qrscan-0/out"))
        arm_stem, with_gcc_s = f"qrcode-barcode-scanner-cli-1.2.3-{arm}", gnu_elf(needed=(*glibc, "libgcc_s.so.1"))
        pdb = b"D:\\a\\scanner\\scanner\\target\\release\\deps\\qrscan.pdb"
        corrupt_tar = root / "corrupt" / f"qrcode-barcode-scanner-cli-1.2.3-{x64}.tar.gz"
        corrupt_zip = root / "corrupt" / f"qrcode-barcode-scanner-cli-1.2.3-{win}.zip"
        corrupt_tar.parent.mkdir()
        corrupt_tar.write_bytes(b"not a gzip stream")
        corrupt_zip.write_bytes(b"not a zip archive")
        encrypted = Path(release(win, clean[win], folder="encrypted"))
        sealed = bytearray(encrypted.read_bytes())
        at = sealed.find(b"PK\x01\x02")  # each central directory entry: general purpose flag bit 0, encrypted
        while at != -1:
            sealed[at + 8] |= 1
            at = sealed.find(b"PK\x01\x02", at + 4)
        encrypted.write_bytes(bytes(sealed))
        truncated = root / "truncated" / "qrscan"
        truncated.parent.mkdir()
        truncated.write_bytes(b"\x7fELF\x02\x01")
        old_name = root / "old-name" / f"qrcode-ai-scanner-cli-1.2.3-{x64}.tar.gz"
        old_name.parent.mkdir()
        old_name.write_bytes(Path(every[x64]).read_bytes())
        runs = [
            ("the release set", ["--complete", *every.values(), str(source), str(sums)], []),
            ("four targets", ["--complete", *but(win)], [f"{win}: 0 executables, expected 1"]),
            ("a target twice", ["--complete", *every.values(), release(x64, clean[x64], folder="twice")],
             [f"{x64}: 2 executables, expected 1"]),
            ("an unknown triple", ["--complete", *every.values(), release("x86_64-unknown-freebsd", clean[x64])],
             ["qrcode-barcode-scanner-cli-1.2.3-x86_64-unknown-freebsd.tar.gz:"
              " x86_64-unknown-freebsd is not a release target"]),
            ("a PDB path in the Windows archive",
             ["--complete", *but(win), release(win, console_pe(extra=pdb), folder="pdb")],
             [f"{member(win)}: holds the build-host path D:\\a\\"]),
            ("a --forbid string in the arm64 archive", ["--complete", "--forbid", "/tmp/qr-build-7", *but(mac),
                                                        release(mac, make_executable_macho(extra=b"/tmp/qr-build-7/x"),
                                                                folder="forbid")],
             [f"{member(mac)}: holds the --forbid string /tmp/qr-build-7"]),
            ("libgcc_s.so.1 under the archive's zig-libunwind",
             ["--complete", *but(x64), release(x64, with_gcc_s, folder="gcc")],
             [f"{member(x64)}: needs libgcc_s.so.1, but its unwinder is zig-libunwind"]),
            ("the libgcc_s fallback",
             ["--complete", *but(x64), release(x64, with_gcc_s, "libgcc_s", folder="gcc_s")], []),
            ("no build-info.json", [release(arm, arm_elf, folder="no-info", facts=b"")],
             [f"{arm_stem}.tar.gz: 0 {arm_stem}/build-info.json members, expected 1"]),
            ("an unknown unwinder", [release(arm, arm_elf, "llvm-libunwind", folder="llvm")],
             [f'{arm_stem}.tar.gz!{arm_stem}/build-info.json: linker.unwinder is "llvm-libunwind", not one of'
              ' zig-libunwind, libgcc_s']),
            ("a build-info.json that is not JSON", [release(arm, arm_elf, folder="not-json", facts=b"{")],
             [f"{arm_stem}.tar.gz!{arm_stem}/build-info.json: not JSON"]),
            ("no executable", [release(arm, None, folder="empty")],
             [f"{arm_stem}.tar.gz: 0 {arm_stem}/qrscan members, expected 1", "no native binary among the inputs"]),
            ("an executable twice", [release(arm, arm_elf, folder="dup", copies=2)],
             [f"{arm_stem}.tar.gz: 2 {arm_stem}/qrscan members, expected 1", "no native binary among the inputs"]),
            ("build-info.json twice", [release(arm, arm_elf, folder="dup-info", info_copies=2)],
             [f"{arm_stem}.tar.gz: 2 {arm_stem}/build-info.json members, expected 1"]),
            ("a symlinked executable", [release(mac, clean[mac], folder="tar-link", link=True),
                                        release(win, clean[win], folder="zip-link", link=True)],
             [f"{member(mac)}: not a regular file", f"{member(win)}: not a regular file",
              "no native binary among the inputs"]),
            ("unreadable archives", [str(corrupt_tar), str(corrupt_zip)],
             [f"{corrupt_tar.name}: unreadable archive (not a gzip file)",
              f"{corrupt_zip.name}: unreadable archive (File is not a zip file)", "no native binary among the inputs"]),
            ("an encrypted executable", [str(encrypted)],
             [f"{encrypted.name}: unreadable archive (qrcode-barcode-scanner-cli-1.2.3-{win}/qrscan.exe is encrypted)",
              "no native binary among the inputs"]),
            ("a .tar.gz on the Windows row", [release(win, console_pe(), folder="ext", ext="tar.gz")],
             [f"qrcode-barcode-scanner-cli-1.2.3-{win}.tar.gz: a .tar.gz archive, but {win} ships as .zip",
              "no native binary among the inputs"]),
            ("an npm tarball", [str(npm)],
             [f"{npm.name}: not a qrcode-barcode-scanner-cli-<version>-<triple>.tar.gz or .zip archive",
              "no native binary among the inputs"]),
            ("an archive under the old package name", [str(old_name)],
             [f"{old_name.name}: not a qrcode-barcode-scanner-cli-<version>-<triple>.tar.gz or .zip archive",
              "no native binary among the inputs"]),
            ("the build step's binary",
             ["--target", x64, "--unwinder", zig, "--forbid", "/tmp/qr-build-7", str(raw)], []),
            ("a dropped remap in the build step's binary", ["--target", mac, "--forbid", "/tmp/qr-build-7", str(leaky)],
             [f"{leaky}: holds the --forbid string /tmp/qr-build-7"]),
        ]
        receipts = {}
        for index, (name, argv, want) in enumerate(runs):
            out = root / f"cli-receipt-{index}.json"
            with contextlib.redirect_stdout(io.StringIO()) as printed:
                code = main(["--policy", "cli", "--out", str(out), *argv])
            text = out.read_text()
            receipts[name] = receipt = json.loads(text)
            got = (code, receipt["verdict"], receipt["problems"])
            expected = (1, "FAIL", want) if want else (0, "PASS", [])
            if got != expected:
                failures.append(f"cli {name}: exit, verdict, problems {got}, want {expected}")
            if printed.getvalue() != text:
                failures.append(f"cli {name}: the printed receipt is not the one --out wrote")
        # Bytes too short to parse: refused as unreadable, in the parser's own words (which vary by Python).
        out = root / "truncated.json"
        with contextlib.redirect_stdout(io.StringIO()):
            code = main(["--policy", "cli", "--target", x64, "--unwinder", zig, "--out", str(out), str(truncated)])
        receipt = json.loads(out.read_text())
        problems = receipt["problems"]
        if (code, receipt["verdict"], len(problems)) != (1, "FAIL", 1) or not (
                problems[0].startswith(f"{truncated}: unreadable (") and problems[0].endswith("), not elf64")):
            failures.append(f"cli a truncated binary: exit, verdict, problems {(code, receipt['verdict'], problems)}")

        # What the receipt records: per executable its target and unwinder (and where that came
        # from), the inputs skipped as holding no executable, and the --forbid strings checked.
        def rows(name):
            return [(b["input"], b["target"], b["unwinder"], b["unwinder_from"]) for b in receipts[name]["binaries"]]
        gnu_rows = {x64: (zig, "build-info.json"), arm: (zig, "build-info.json")}
        recorded = [
            ("the release set", "binaries", rows("the release set"),
             [(member(target), target, *gnu_rows.get(target, (None, None))) for target in clean]),
            ("the release set", "skipped", receipts["the release set"]["skipped"], [source.name, sums.name]),
            ("the release set", "forbid", receipts["the release set"]["forbid"], []),
            ("the libgcc_s fallback", "last binary", rows("the libgcc_s fallback")[-1:],
             [(member(x64), x64, "libgcc_s", "build-info.json")]),
            ("no build-info.json", "binaries", rows("no build-info.json"),
             [(f"{arm_stem}.tar.gz!{arm_stem}/qrscan", arm, None, "build-info.json")]),
            ("the build step's binary", "binaries", rows("the build step's binary"),
             [(str(raw), x64, zig, "--unwinder")]),
            ("the build step's binary", "forbid", receipts["the build step's binary"]["forbid"], ["/tmp/qr-build-7"]),
            ("a dropped remap in the build step's binary", "binaries",
             rows("a dropped remap in the build step's binary"), [(str(leaky), mac, None, None)]),
        ]
        for name, key, got, want in recorded:
            if got != want:
                failures.append(f"cli {name}: {key} {got}, want {want}")
        # binaries() learns a CLI archive by name in every mode: the plain report reads its
        # executable, and the node policy refuses it as no addon of a release target.
        modes = [("report", [every[mac]], (0, "PASS", [])),
                 ("node", ["--policy", "node", every[mac]],
                  (1, "FAIL", [f"{member(mac)}: not a <name>.<napi-suffix>.node of a release target"]))]
        for name, argv, want in modes:
            out = root / f"mode-{name}.json"
            with contextlib.redirect_stdout(io.StringIO()):
                code = main(["--out", str(out), *argv])
            receipt = json.loads(out.read_text())
            got = (code, receipt["verdict"], receipt["problems"], [b["input"] for b in receipt["binaries"]])
            if got != (*want, [member(mac)]):
                failures.append(f"cli {name} mode on a CLI archive: {got}, want {(*want, [member(mac)])}")
        # Usage errors exit 2 before anything is judged, naming the error, with no receipt.
        missing = root / "absent" / "qrscan"
        usage = [(name, ["--policy", "cli", *argv], message) for name, argv, message in (
            ("a raw binary without --target", [str(raw)], f"{raw}: a raw binary needs --target"),
            ("a GNU --target without --unwinder", ["--target", x64, str(raw)],
             f"--target {x64} needs --unwinder (zig-libunwind or libgcc_s)"),
            ("--unwinder with a Darwin --target", ["--target", mac, "--unwinder", zig, str(leaky)],
             "--unwinder describes a raw GNU/Linux binary (--target *-linux-gnu)"),
            ("--target with archives only", ["--target", win, every[win]],
             "--target describes one raw binary, and 0 were given"),
            ("--target with two raw binaries", ["--target", mac, str(raw), str(leaky)],
             "--target describes one raw binary, and 2 were given"),
            ("an empty --forbid", ["--forbid", "", *every.values()], "--forbid needs a non-empty string"),
            ("an unknown --target triple", ["--target", "x86_64-unknown-freebsd", str(raw)],
             "argument --target: invalid choice: 'x86_64-unknown-freebsd'"),
            ("an unknown --unwinder", ["--target", x64, "--unwinder", "llvm-libunwind", str(raw)],
             "argument --unwinder: invalid choice: 'llvm-libunwind'"),
            ("a missing input", [str(missing)], f"no such file: {missing}"),
            ("no input", [], "no input"))]
        usage += [("--forbid under --policy node", ["--policy", "node", "--forbid", "/tmp/qr-build-7", every[win]],
                   "--target, --unwinder and --forbid go with --policy cli"),
                  ("--target without a policy", ["--target", x64, "--unwinder", zig, str(raw)],
                   "--target, --unwinder and --forbid go with --policy cli")]
        for name, argv, message in usage:
            out = root / "usage-receipt.json"
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as stderr:
                try:
                    code = main(["--out", str(out), *argv])
                except SystemExit as stop:
                    code = stop.code
            if (code, out.exists(), message in stderr.getvalue()) != (2, False, True):
                failures.append(f"cli usage {name}: exit {code}, receipt written {out.exists()},"
                                f" stderr {stderr.getvalue()!r}, want exit 2, none and {message!r}")
        return len(runs) + 1 + len(modes) + len(usage)


def self_test():
    gnu, musl = "qrcode-barcode-scanner.linux-x64-gnu.node", "qrcode-barcode-scanner.linux-x64-musl.node"
    arm, mac = "qrcode-barcode-scanner.linux-arm64-gnu.node", "qrcode-barcode-scanner.darwin-arm64.node"
    intel, win = "qrcode-barcode-scanner.darwin-x64.node", "qrcode-barcode-scanner.win32-x64-msvc.node"
    clean = [
        (gnu, make_elf()),
        (arm, make_elf(machine=183, needed=("libc.so.6", "ld-linux-aarch64.so.1"), versions=("GLIBC_2.28",))),
        (musl, make_elf(needed=("libc.so",), versions=())),
        (mac, make_macho()),
        (intel, make_macho(cpu=0x01000007, minos=(10, 12),
                           dylibs=("/usr/lib/libSystem.B.dylib",
                                   "/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation"))),
        (win, make_pe()),
    ]
    planted = [
        ("glibc above 2.28", gnu, make_elf(versions=("GLIBC_2.17", "GLIBC_2.34"))),
        ("no glibc version", gnu, make_elf(versions=())),
        ("musl libc under a gnu name", gnu, make_elf(needed=("libc.so",), versions=())),
        ("glibc under the musl name", musl, make_elf(versions=("GLIBC_2.17",))),
        ("aarch64 under an x64 name", gnu, make_elf(machine=183)),
        ("no libc at all", gnu, make_elf(needed=("libgcc_s.so.1",), versions=("GCC_4.2.0",))),
        ("a non-system shared library", gnu, make_elf(needed=("libc.so.6", "libssl.so.3"))),
        ("macOS 12 on arm64", mac, make_macho(minos=(12, 0))),
        ("macOS 11 on x86_64", intel, make_macho(cpu=0x01000007, minos=(11, 0))),
        ("x86_64 slice under the arm64 name", mac, make_macho(cpu=0x01000007)),
        ("no libSystem", mac, make_macho(dylibs=("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation",))),
        ("a bundled dylib", mac, make_macho(dylibs=("/usr/lib/libSystem.B.dylib", "@rpath/libscan.dylib"))),
        *((f"a bundled dylib by {kind}", mac, make_macho(more=((cmd, "@rpath/libscan.dylib"),)))
          for kind, cmd in (("LC_LAZY_LOAD_DYLIB", 0x20), ("LC_LOAD_WEAK_DYLIB", 0x80000018),
                            ("LC_REEXPORT_DYLIB", 0x8000001F), ("LC_LOAD_UPWARD_DYLIB", 0x80000023))),
        ("the Visual C++ runtime", win, make_pe(imports=("KERNEL32.dll", "VCRUNTIME140.dll"))),
        ("a delay-loaded msvcp", win, make_pe(delayed=("MSVCP140.dll",))),
        ("no kernel32", win, make_pe(imports=("ntdll.dll",))),
        ("an application DLL", win, make_pe(imports=("KERNEL32.dll", "libscan.dll"))),
        ("an arm64 PE under the x64 name", win, make_pe(machine=0xAA64)),
        ("an ELF under the Windows name", win, make_elf()),
        ("an unknown target", "qrcode-barcode-scanner.freebsd-x64.node", make_elf()),
    ]
    failures = []
    for label, data in clean:
        problems = node_problems(label, inspect(data))
        if problems:
            failures.append(f"clean {label}: {problems}")
    for reason, label, data in planted:
        if not node_problems(label, inspect(data)):
            failures.append(f"accepted {reason}")
    # The command line on npm tarballs as pack-native packs them (each addon at
    # package/<name>.<suffix>.node, the main package with none): binaries(),
    # judge() and main(), the label a problem names, the receipt it prints and
    # writes, and its exit code.
    with tempfile.TemporaryDirectory(prefix="native-floor-") as scratch:
        root = Path(scratch)

        def tarball(name, members):
            path = root / name
            path.parent.mkdir(exist_ok=True)
            with tarfile.open(path, "w:gz") as archive:
                for member, data in members:
                    info = tarfile.TarInfo(f"package/{member}")
                    info.size = len(data)
                    archive.addfile(info, io.BytesIO(data))
            return str(path)
        addons = [tarball(f"qrcode-ai-com-qrcode-barcode-scanner-{label.split('.')[1]}-1.2.3.tgz", [(label, data)])
                  for label, data in clean]
        main_package = tarball("qrcode-ai-com-qrcode-barcode-scanner-1.2.3.tgz",
                               [("package.json", b"{}"), ("index.js", b"")])
        twin = tarball("qrcode-ai-com-qrcode-barcode-scanner-linux-x64-gnu-1.2.4.tgz", [clean[0]])
        # The win32 package under its own name, its addon importing the Visual C++ runtime (as 0.10.0's did)
        vc_runtime = tarball("planted/qrcode-ai-com-qrcode-barcode-scanner-win32-x64-msvc-1.2.3.tgz",
                             [(win, make_pe(imports=("KERNEL32.dll", "VCRUNTIME140.dll")))])
        runs = [
            ("the release set", ["--complete", *addons, main_package], []),
            ("a planted addon", ["--complete", *addons[:-1], vc_runtime, main_package],
             [f"qrcode-ai-com-qrcode-barcode-scanner-win32-x64-msvc-1.2.3.tgz!package/{win}: imports VCRUNTIME140.dll,"
              " which node.exe does not carry"]),
            ("five of six", ["--complete", *addons[1:], main_package], ["linux-x64-gnu: 0 addons, expected 1"]),
            ("a target twice", ["--complete", *addons, twin, main_package], ["linux-x64-gnu: 2 addons, expected 1"]),
            ("no addon at all", [main_package], ["no native binary among the inputs"]),
        ]
        for index, (name, argv, want) in enumerate(runs):
            out = root / f"receipt-{index}.json"
            with contextlib.redirect_stdout(io.StringIO()) as printed:
                code = main(["--policy", "node", "--out", str(out), *argv])
            text = out.read_text()
            receipt = json.loads(text)
            got = (code, receipt["verdict"], receipt["problems"])
            expected = (1, "FAIL", want) if want else (0, "PASS", [])
            if got != expected:
                failures.append(f"{name}: exit, verdict, problems {got}, want {expected}")
            if printed.getvalue() != text:
                failures.append(f"{name}: the printed receipt is not the one --out wrote")
    refused = len(planted) - len([f for f in failures if f.startswith("accepted")])
    cli_failures, cli_counts = cli_self_test()
    failures += cli_failures
    verdict = "FAIL" if failures else "PASS"
    print(json.dumps({"self_test": verdict, "clean": len(clean), "refused": refused, "archive_runs": len(runs),
                      **cli_counts, "failures": failures}))
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("inputs", nargs="*")
    parser.add_argument("--policy", choices=["node", "cli"])
    parser.add_argument("--complete", action="store_true",
                        help="each release target exactly once (node: the six addons, cli: the five triples)")
    parser.add_argument("--out", help="write the JSON receipt here")
    parser.add_argument("--target", choices=list(CLI_FLOOR), help="cli: the triple of the one raw binary input")
    parser.add_argument("--unwinder", choices=UNWINDERS, help="cli: the unwinder that raw GNU/Linux binary links")
    parser.add_argument("--forbid", action="append", default=[], metavar="S",
                        help="cli: a string no binary may hold, such as a build-host path (repeatable)")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.inputs:
        parser.error("no input")
    if args.policy != "cli" and (args.target or args.unwinder or args.forbid):
        parser.error("--target, --unwinder and --forbid go with --policy cli")
    if args.policy == "cli":
        cli_usage(parser, args)
        reports, problems, skipped = judge_cli(args.inputs, args.complete, args.target, args.unwinder, args.forbid)
    else:
        reports, problems = judge(args.inputs, args.policy, args.complete)
    if not reports:
        problems.append("no native binary among the inputs")
    receipt = {"verdict": "FAIL" if problems else "PASS", "policy": args.policy, "binaries": reports}
    if args.policy == "cli":
        receipt.update(skipped=skipped, forbid=args.forbid)
    receipt["problems"] = problems
    text = json.dumps(receipt, indent=2)
    if args.out:
        Path(args.out).write_text(text + "\n")
    print(text)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
