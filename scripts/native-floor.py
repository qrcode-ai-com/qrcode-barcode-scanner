"""What a native binary needs from the system that loads it, read from its bytes.

  native-floor.py FILE|ARCHIVE...                       report (JSON)
  native-floor.py --policy node [--complete] [--out F] FILE|ARCHIVE...
  native-floor.py --self-test

ELF: architecture, DT_NEEDED, the libc (glibc or musl) and the highest
GLIBC_/GCC_/... symbol version per family. Mach-O (thin or fat): each slice's
CPU, LC_BUILD_VERSION / LC_VERSION_MIN_* minimum OS and SDK, and its load
dylibs. PE32+: machine, OS/subsystem versions, imported and delay-imported
DLLs. Archives (.tgz, .whl) are read in place: their .node, .so, .pyd, .dylib
and .dll members.

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
    (e_type, e_machine, _version, _entry, _phoff, e_shoff, _flags, _ehsize, _phentsize, _phnum,
     e_shentsize, e_shnum, _shstrndx) = struct.unpack_from("<HHIQQQIHHHHHH", data, 16)
    sections = [struct.unpack_from("<IIQQQQIIQQ", data, e_shoff + i * e_shentsize) for i in range(e_shnum)]
    needed, versions = [], []
    for (_name, sh_type, _f, _a, offset, size, link, info, _al, _es) in sections:
        strtab = sections[link][4] if link < len(sections) else 0
        if sh_type == 6:  # SHT_DYNAMIC
            for i in range(size // 16):
                tag, value = struct.unpack_from("<qQ", data, offset + i * 16)
                if tag == 0:
                    break
                if tag == 1:  # DT_NEEDED
                    needed.append(cstr(data, strtab + value))
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
    return {"format": "elf64", "arch": {62: "x86_64", 183: "aarch64"}.get(e_machine, f"e_machine {e_machine}"),
            "elf_type": e_type, "libc": libc, "needed": needed, "highest_versions": highest}


# --------------------------------------------------------------------- Mach-O
CPU = {0x0100000C: "arm64", 0x01000007: "x86_64"}
PLATFORM = {1: "macos", 2: "ios", 3: "tvos", 4: "watchos", 6: "maccatalyst", 7: "ios-simulator"}


def packed(value):
    return f"{value >> 16}.{(value >> 8) & 0xFF}.{value & 0xFF}"


def macho_slice(data, base):
    magic, cputype, _sub, filetype, ncmds = struct.unpack_from("<IiiII", data, base)
    if magic != 0xFEEDFACF:
        return {"arch": f"magic {magic:#x}", "min_os": None, "dylibs": []}
    found = {"arch": CPU.get(cputype & 0xFFFFFFFF, f"cputype {cputype & 0xFFFFFFFF:#x}"), "filetype": filetype,
             "min_os": None, "dylibs": []}
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
        offset += size
    return found


def macho(data):
    if struct.unpack_from(">I", data, 0)[0] == 0xCAFEBABE:
        count = struct.unpack_from(">I", data, 4)[0]
        offsets = [struct.unpack_from(">iiIII", data, 8 + 20 * i)[2] for i in range(count)]
        return {"format": "macho", "fat": True, "slices": [macho_slice(data, o) for o in offsets]}
    return {"format": "macho", "fat": False, "slices": [macho_slice(data, 0)]}


# ------------------------------------------------------------------------- PE
def pe(data):
    header = struct.unpack_from("<I", data, 0x3C)[0]
    if data[header:header + 4] != b"PE\0\0":
        return {"format": "pe (no PE signature)"}
    machine, nsections, _ts, _sym, _nsym, opt_size, characteristics = struct.unpack_from("<HHIIIHH", data, header + 4)
    opt = header + 24
    if struct.unpack_from("<H", data, opt)[0] != 0x20B:
        return {"format": "pe (not PE32+)"}
    os_major, os_minor, _im, _in, sub_major, sub_minor = struct.unpack_from("<HHHHHH", data, opt + 40)
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
            "imports": names(1, 20, 12), "delay_imports": names(13, 32, 4)}


def inspect(data):
    if data[:4] == b"\x7fELF":
        return elf(data)
    if data[:2] == b"MZ":
        return pe(data)
    if data[:4] in (b"\xcf\xfa\xed\xfe", b"\xca\xfe\xba\xbe"):
        return macho(data)
    return {"format": f"unknown magic {data[:4].hex()}"}


def binaries(path):
    if path.name.endswith((".tgz", ".tar.gz")):
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


# ------------------------------------------------------------------ self-test
def make_elf(machine=62, needed=("libc.so.6", "libgcc_s.so.1"), versions=("GLIBC_2.17", "GLIBC_2.2.5")):
    strings = b"\0"
    offsets = {}
    for text in (*needed, *versions):
        offsets[text] = len(strings)
        strings += text.encode() + b"\0"
    dynamic = b"".join(struct.pack("<qQ", 1, offsets[n]) for n in needed) + struct.pack("<qQ", 0, 0)
    library = next((n for n in needed if n.startswith("libc")), needed[0])
    verneed = struct.pack("<HHIII", 1, len(versions), offsets[library], 16, 0)
    for i, name in enumerate(versions):
        verneed += struct.pack("<IHHII", 0, 0, 2 + i, offsets[name], 16 if i < len(versions) - 1 else 0)
    body = [strings, dynamic, verneed]
    offset, layout = 64, []
    for part in body:
        layout.append((offset, len(part)))
        offset += len(part)
    shoff = offset
    header = b"\x7fELF" + bytes([2, 1, 1]) + bytes(9) + struct.pack(
        "<HHIQQQIHHHHHH", 3, machine, 1, 0, 0, shoff, 0, 64, 56, 0, 64, 4, 0)
    shdrs = bytes(64)
    for sh_type, (off, size), link, info in ((3, layout[0], 0, 0), (6, layout[1], 1, 0),
                                             (0x6FFFFFFE, layout[2], 1, 1)):
        shdrs += struct.pack("<IIQQQQIIQQ", 0, sh_type, 0, 0, off, size, link, info, 8, 0)
    return header + b"".join(body) + shdrs


def make_macho(cpu=0x0100000C, minos=(11, 0), dylibs=("/usr/lib/libSystem.B.dylib",), more=()):
    """`dylibs` through LC_LOAD_DYLIB, then `more` as (load command, dylib) pairs."""
    commands = struct.pack("<IIIIII", 0x32, 24, 1, minos[0] << 16 | minos[1] << 8, 26 << 16, 0)
    loads = [(0xC, name) for name in dylibs] + list(more)
    for cmd, name in loads:
        raw = name.encode() + b"\0"
        raw += bytes(-(24 + len(raw)) % 8)
        commands += struct.pack("<IIIIII", cmd, 24 + len(raw), 24, 0, 0, 0) + raw
    return struct.pack("<IiiIIIII", 0xFEEDFACF, cpu, 0, 8, 1 + len(loads), len(commands), 0, 0) + commands


def make_pe(imports=("KERNEL32.dll", "api-ms-win-core-synch-l1-2-0.dll"), delayed=(), machine=0x8664):
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
    optional += bytes(68 - len(optional)) + struct.pack("<H", 3)
    optional += bytes(108 - len(optional)) + struct.pack("<I", 16) + b"".join(struct.pack("<II", *d) for d in dirs)
    coff = b"PE\0\0" + struct.pack("<HHIIIHH", machine, 1, 0, 0, 0, opt_size, 0x2022)
    table = struct.pack("<8sIIIIIIHHI", b".idata", len(section), va, len(section), raw, 0, 0, 0, 0, 0)
    image = bytearray(b"MZ" + bytes(header - 2))
    struct.pack_into("<I", image, 0x3C, header)
    image += coff + optional + table
    image += bytes(raw - len(image)) + section
    return bytes(image)


def self_test():
    gnu, musl = "qrcode-ai-scanner.linux-x64-gnu.node", "qrcode-ai-scanner.linux-x64-musl.node"
    arm, mac = "qrcode-ai-scanner.linux-arm64-gnu.node", "qrcode-ai-scanner.darwin-arm64.node"
    intel, win = "qrcode-ai-scanner.darwin-x64.node", "qrcode-ai-scanner.win32-x64-msvc.node"
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
        ("an unknown target", "qrcode-ai-scanner.freebsd-x64.node", make_elf()),
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
        addons = [tarball(f"qrcode-ai-scanner-{label.split('.')[1]}-1.2.3.tgz", [(label, data)])
                  for label, data in clean]
        main_package = tarball("qrcode-ai-scanner-1.2.3.tgz", [("package.json", b"{}"), ("index.js", b"")])
        twin = tarball("qrcode-ai-scanner-linux-x64-gnu-1.2.4.tgz", [clean[0]])
        # The win32 package under its own name, its addon importing the Visual C++ runtime (as 0.10.0's did)
        vc_runtime = tarball("planted/qrcode-ai-scanner-win32-x64-msvc-1.2.3.tgz",
                             [(win, make_pe(imports=("KERNEL32.dll", "VCRUNTIME140.dll")))])
        runs = [
            ("the release set", ["--complete", *addons, main_package], []),
            ("a planted addon", ["--complete", *addons[:-1], vc_runtime, main_package],
             [f"qrcode-ai-scanner-win32-x64-msvc-1.2.3.tgz!package/{win}: imports VCRUNTIME140.dll,"
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
    verdict = "FAIL" if failures else "PASS"
    print(json.dumps({"self_test": verdict, "clean": len(clean), "refused": len(planted) - len(
        [f for f in failures if f.startswith("accepted")]), "archive_runs": len(runs), "failures": failures}))
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("inputs", nargs="*")
    parser.add_argument("--policy", choices=["node"])
    parser.add_argument("--complete", action="store_true", help="node: each release target exactly once")
    parser.add_argument("--out", help="write the JSON receipt here")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.inputs:
        parser.error("no input")
    reports, problems = judge(args.inputs, args.policy, args.complete)
    if not reports:
        problems.append("no native binary among the inputs")
    receipt = {"verdict": "FAIL" if problems else "PASS", "policy": args.policy, "binaries": reports,
               "problems": problems}
    text = json.dumps(receipt, indent=2)
    if args.out:
        Path(args.out).write_text(text + "\n")
    print(text)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
