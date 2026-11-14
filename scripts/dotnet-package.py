#!/usr/bin/env python3
"""The native libraries and the archive of the .NET package.

  dotnet-package.py native --target TRIPLE --library FILE --out DIR
  dotnet-package.py generated FILE [FILE ...] --project DIR
  dotnet-package.py layout --natives DIR --project DIR
  dotnet-package.py inspect NUPKG --natives DIR --version X.Y.Z --commit SHA
  dotnet-package.py --self-test

The package QRCodeAI.QRCodeBarcodeScanner carries the engine's UniFFI library for five systems,
under `runtimes/<rid>/native/`. A .NET application loads the one of its system.

`native` judges one built library against the floor of its target, the floor of the prebuilt
qrscan (scripts/cli-release.py): glibc 2.28 with no library beyond glibc's own, macOS 10.15 on
x86_64 and 11.0 on arm64 with system libraries only, and on Windows no Visual C++ or Universal
C runtime library. It reads the file with scripts/native-floor.py, then writes it under
DIR/<rid>/ beside `native.json`: its target, its hash, its size and what it needs.

`generated` takes the C# that uniffi-bindgen-cs wrote on several systems from this commit,
requires the same file from each, line ends aside, and places it in the project. The archive's
own libraries cannot give it: built through cargo-zigbuild they carry no symbol table, the only
place that generator reads, and it then writes nothing and reports no error.

`layout` copies the five libraries into the project, where `dotnet pack` takes them. It refuses
a missing or foreign target and a library that left its record.

`inspect` opens the archive `dotnet pack` wrote and refuses anything that is not the package:
its files, the five libraries byte for byte, and the fields nuget.org shows.

Nothing is built, installed or published by this program. Stdlib only. Exit 0 when the step
passes, 1 when it is refused, 2 for usage.
"""
import argparse
import hashlib
import io
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
PACKAGE = "QRCodeAI.QRCodeBarcodeScanner"
FRAMEWORK = "net8.0"
LICENSE = "MIT"
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner"
PROJECT_URL = "https://qrcode-ai.com/en-US/qr-code-scanner/sdk/dotnet"
SCHEMA = "qrscan-dotnet-native/1"
STEM = "qrcode_ai_scanner_uniffi"
GENERATED = f"{STEM}.cs"
NAMESPACE = f"namespace {PACKAGE}.Generated;"
# Each target: the .NET runtime identifier, the file name and the floor of the prebuilt qrscan.
TARGETS = {
    "x86_64-unknown-linux-gnu": {"rid": "linux-x64", "file": f"lib{STEM}.so",
                                 "format": "elf64", "arch": "x86_64", "glibc": "2.28"},
    "aarch64-unknown-linux-gnu": {"rid": "linux-arm64", "file": f"lib{STEM}.so",
                                  "format": "elf64", "arch": "aarch64", "glibc": "2.28"},
    "x86_64-apple-darwin": {"rid": "osx-x64", "file": f"lib{STEM}.dylib",
                            "format": "macho", "arch": "x86_64", "minos": "10.15"},
    "aarch64-apple-darwin": {"rid": "osx-arm64", "file": f"lib{STEM}.dylib",
                             "format": "macho", "arch": "arm64", "minos": "11.0"},
    "x86_64-pc-windows-msvc": {"rid": "win-x64", "file": f"{STEM}.dll",
                               "format": "pe32+", "arch": "x86_64"},
}
GLIBC_OWN = {"libc.so.6", "libm.so.6", "libpthread.so.0", "librt.so.1", "libdl.so.2",
             "ld-linux-x86-64.so.2", "ld-linux-aarch64.so.1"}
C_RUNTIME = re.compile(r"^(vcruntime|msvcp|msvcr|concrt|vccorlib|ucrtbase|api-ms-win-crt-)", re.I)
# The files of an archive that are its envelope, not its content. NuGet names the properties
# file after a random identifier or, in a build that can be repeated, a fixed word.
ENVELOPE = re.compile(r"\[Content_Types\]\.xml|_rels/\.rels|package/services/metadata/core-properties/[0-9A-Za-z]+\.psmdcp")
# NuGet writes the nuspec in the oldest of its schemas that holds what the package uses.
NUSPEC = re.compile(r"\{http://schemas\.microsoft\.com/packaging/\d{4}/\d{2}/nuspec\.xsd\}")


class Refused(Exception):
    """A library or an archive is not what the package must hold."""


def require(condition, message):
    if not condition:
        raise Refused(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def version_key(text):
    """10.15 and 10.15.0 are one version: three numbers, the missing ones zero."""
    numbers = [int(part) for part in re.findall(r"\d+", text)][:3]
    return tuple(numbers + [0] * (3 - len(numbers)))


# ------------------------------------------------------------------ one native library

def floor_problems(target, found):
    """What a library needs beyond the floor of TARGET, from the report of native-floor.py."""
    floor, problems = TARGETS[target], []

    def check(condition, message):
        if not condition:
            problems.append(message)

    if floor["format"] == "macho":
        slices = found.get("slices") or []
        check(found.get("format") == "macho" and len(slices) == 1, "not a thin Mach-O file")
        found = slices[0] if len(slices) == 1 else {}
        minos = (found.get("min_os") or {}).get("minos")
        check(found.get("arch") == floor["arch"], f"built for {found.get('arch')}, not {floor['arch']}")
        check(found.get("filetype") == 6, "not a dynamic library")
        check(minos is not None and version_key(minos) <= version_key(floor["minos"]),
              f"needs macOS {minos}, above {floor['minos']}")
        foreign = [name for name in found.get("dylibs", []) if not name.startswith(("/usr/lib/", "/System/Library/"))]
        check("/usr/lib/libSystem.B.dylib" in found.get("dylibs", []), "does not load libSystem")
        check(not foreign, f"loads a library that is not the system's: {foreign}")
        check(not found.get("rpaths"), f"carries a search path: {found.get('rpaths')}")
        return problems
    check(found.get("format") == floor["format"], f"a {found.get('format')} file, not {floor['format']}")
    check(found.get("arch") == floor["arch"], f"built for {found.get('arch')}, not {floor['arch']}")
    if floor["format"] == "elf64":
        highest = (found.get("highest_versions") or {}).get("GLIBC", "")
        needed = set(found.get("needed", []))
        check(found.get("elf_type") == 3 and not found.get("interp"), "not a shared library")
        check(found.get("libc") == "glibc" and "libc.so.6" in needed, "does not load glibc")
        check(highest and version_key(highest) <= version_key(floor["glibc"]),
              f"needs {highest or 'no glibc version'}, above GLIBC_{floor['glibc']}")
        check(needed <= GLIBC_OWN, f"needs a library beyond glibc's own: {sorted(needed - GLIBC_OWN)}")
        check(not found.get("rpath") and not found.get("runpath"), "carries a search path")
        check(found.get("gnu_stack") == "RW", f"asks for a stack that is {found.get('gnu_stack')}")
    else:
        imports = [name.lower() for name in found.get("imports", []) + found.get("delay_imports", [])]
        runtime = [name for name in imports if C_RUNTIME.match(name)]
        check("kernel32.dll" in imports, "does not import kernel32.dll")
        check(not runtime, f"needs a C runtime library that Windows does not carry: {runtime}")
    return problems


def read_floor(path):
    """The report of scripts/native-floor.py on one file."""
    done = subprocess.run([sys.executable, str(ROOT / "scripts/native-floor.py"), str(path)],
                          capture_output=True, text=True, check=False)
    try:
        binaries = json.loads(done.stdout)["binaries"]
    except (ValueError, KeyError) as error:
        raise Refused(f"native-floor.py could not read {path}: {done.stderr.strip() or error}") from error
    require(len(binaries) == 1, f"native-floor.py found {len(binaries)} binaries in {path}")
    return binaries[0]


def native(target, library, out, read=read_floor):
    require(target in TARGETS, f"not a target of the package: {target}")
    row = TARGETS[target]
    require(library.name == row["file"], f"the library of {target} is named {row['file']}, not {library.name}")
    found = read(library)
    problems = floor_problems(target, found)
    require(not problems, f"{library.name} for {target}: " + "; ".join(problems))
    data = library.read_bytes()
    folder = out / row["rid"]
    folder.mkdir(parents=True, exist_ok=False)
    (folder / row["file"]).write_bytes(data)
    record = {"schema": SCHEMA, "target": target, "rid": row["rid"], "file": row["file"],
              "sha256": sha256(data), "size": len(data),
              "needs": {key: found[key] for key in ("needed", "highest_versions", "imports") if key in found}
              or {"macos": (found["slices"][0].get("min_os") or {}).get("minos"),
                  "dylibs": found["slices"][0].get("dylibs")}}
    (folder / "native.json").write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return record


def natives(folder):
    """{rid: (record, bytes)} of the five libraries under FOLDER, each equal to its record."""
    found = {}
    present = sorted(path.name for path in folder.iterdir()) if folder.is_dir() else []
    wanted = sorted(row["rid"] for row in TARGETS.values())
    require(present == wanted, f"{folder} holds {present}, not the five targets {wanted}")
    for target, row in TARGETS.items():
        try:
            record = json.loads((folder / row["rid"] / "native.json").read_text(encoding="utf-8"))
            data = (folder / row["rid"] / row["file"]).read_bytes()
        except (OSError, ValueError) as error:
            raise Refused(f"the library of {row['rid']} cannot be read: {error}") from error
        told = tuple(record.get(key) for key in ("schema", "target", "rid", "file"))
        require(told == (SCHEMA, target, row["rid"], row["file"]), f"the record of {row['rid']} describes {told}")
        require((record.get("sha256"), record.get("size")) == (sha256(data), len(data)),
                f"the library of {row['rid']} left its record")
        require(sorted(path.name for path in (folder / row["rid"]).iterdir()) == sorted(["native.json", row["file"]]),
                f"{row['rid']} holds a file beyond its library and its record")
        found[row["rid"]] = (record, data)
    return found


def generated(files, project):
    """Place the one generated C# file in PROJECT: the same from every system, line ends aside."""
    require(files, "no generated C# file was given")
    texts = {}
    for path in files:
        require(path.name == GENERATED, f"the generated file is named {GENERATED}, not {path.name}")
        try:
            texts[str(path)] = path.read_bytes().replace(b"\r\n", b"\n")
        except OSError as error:
            raise Refused(f"{path} cannot be read: {error}") from error
    digests = {name: sha256(text) for name, text in texts.items()}
    require(len(set(digests.values())) == 1,
            "the systems did not generate the same C#: " + ", ".join(f"{name} {digest[:16]}" for name, digest in digests.items()))
    text = next(iter(texts.values()))
    require(NAMESPACE.encode() in text, f"the generated C# does not declare {NAMESPACE}")
    target = project / "generated"
    require(not target.exists(), f"{target} exists: place the generated file in a clean checkout")
    target.mkdir(parents=True)
    (target / GENERATED).write_bytes(text)
    return {"file": f"generated/{GENERATED}", "sha256": sha256(text), "lines": text.count(b"\n"), "systems": len(texts)}


def layout(folder, project):
    runtimes = project / "runtimes"
    require(not runtimes.exists(), f"{runtimes} exists: lay the libraries out in a clean checkout")
    for rid, (record, data) in natives(folder).items():
        target = runtimes / rid / "native"
        target.mkdir(parents=True)
        (target / record["file"]).write_bytes(data)
    return sorted(str(path.relative_to(project)) for path in runtimes.rglob("*") if path.is_file())


# ------------------------------------------------------------------ the archive

def inspect(archive, folder, version, commit):
    """Refuse an archive that is not the package of VERSION built from COMMIT with these libraries."""
    libraries = natives(folder)
    try:
        with zipfile.ZipFile(io.BytesIO(archive)) as package:
            names = package.namelist()
            require(len(names) == len(set(names)), "the archive names a file twice")
            files = {name: package.read(name) for name in names}
    except zipfile.BadZipFile as error:
        raise Refused(f"not an archive: {error}") from error
    content = {name for name in files if not ENVELOPE.fullmatch(name)}
    wanted = {f"{PACKAGE}.nuspec", "README.md", f"lib/{FRAMEWORK}/{PACKAGE}.dll", f"lib/{FRAMEWORK}/{PACKAGE}.xml"}
    wanted |= {f"runtimes/{rid}/native/{record['file']}" for rid, (record, _) in libraries.items()}
    require(content == wanted, f"the archive holds {sorted(content - wanted) or 'nothing more'} beyond the package "
                               f"and lacks {sorted(wanted - content) or 'nothing'}")
    for rid, (record, data) in libraries.items():
        require(files[f"runtimes/{rid}/native/{record['file']}"] == data,
                f"the library of {rid} in the archive is not the one that was judged")
    require(files[f"lib/{FRAMEWORK}/{PACKAGE}.dll"][:2] == b"MZ", "the assembly is not a .NET assembly")
    manifest = files[f"{PACKAGE}.nuspec"]
    # A nuspec declares no document type and no entity: one that does is not read at all.
    require(b"<!DOCTYPE" not in manifest and b"<!ENTITY" not in manifest,
            "the nuspec declares a document type or an entity")
    try:
        root = ET.fromstring(manifest)
        schema = NUSPEC.match(root.tag)
        require(schema and root.tag == schema[0] + "package", f"the nuspec is a {root.tag}, not a NuGet package")
        metadata = root.find(schema[0] + "metadata")
        field = {child.tag.removeprefix(schema[0]): child for child in metadata}
        told = {"id": field["id"].text, "version": field["version"].text,
                "license": (field["license"].get("type"), field["license"].text),
                "projectUrl": field["projectUrl"].text, "readme": field["readme"].text,
                "repository": (field["repository"].get("type"), field["repository"].get("url"),
                               field["repository"].get("commit"))}
        groups = [(group.get("targetFramework"), [dependency.get("id") for dependency in group])
                  for group in field["dependencies"]] if "dependencies" in field else []
    except (ET.ParseError, KeyError, AttributeError) as error:
        raise Refused(f"the nuspec cannot be read: {error!r}") from error
    wanted_fields = {"id": PACKAGE, "version": version, "license": ("expression", LICENSE),
                     "projectUrl": PROJECT_URL, "readme": "README.md", "repository": ("git", REPOSITORY, commit)}
    for name, value in wanted_fields.items():
        require(told[name] == value, f"the nuspec says {name} {told[name]!r}, not {value!r}")
    require(all(not ids for _, ids in groups), f"the package depends on another package: {groups}")
    readme = files["README.md"].decode("utf-8")
    require("](../" not in readme and "](./" not in readme,
            "the README links to a file beside it: nuget.org shows it alone")
    return {"package": PACKAGE, "version": version, "commit": commit, "sha256": sha256(archive),
            "size": len(archive), "files": sorted(content),
            "natives": {rid: record["sha256"] for rid, (record, _) in libraries.items()}}


# ------------------------------------------------------------------ self-test

def canned(target):
    """What native-floor.py reports for a library that meets the floor of TARGET."""
    floor = TARGETS[target]
    if floor["format"] == "elf64":
        return {"format": "elf64", "arch": floor["arch"], "elf_type": 3, "libc": "glibc", "interp": None,
                "needed": ["libc.so.6", "libm.so.6"], "highest_versions": {"GLIBC": "GLIBC_2.28"},
                "gnu_stack": "RW", "rpath": [], "runpath": []}
    if floor["format"] == "macho":
        return {"format": "macho", "fat": False, "slices": [{
            "arch": floor["arch"], "filetype": 6, "min_os": {"platform": "macos", "minos": floor["minos"] + ".0"},
            "dylibs": ["/usr/lib/libSystem.B.dylib", "/usr/lib/libiconv.2.dylib"], "rpaths": []}]}
    return {"format": "pe32+", "arch": "x86_64", "imports": ["KERNEL32.dll", "ntdll.dll", "bcryptprimitives.dll"],
            "delay_imports": []}


def nuspec(version="9.8.7", commit="c" * 40, **changes):
    fields = {"id": PACKAGE, "version": version, "license": LICENSE, "license_type": "expression",
              "projectUrl": PROJECT_URL, "readme": "README.md", "url": REPOSITORY, "commit": commit,
              "dependencies": '<group targetFramework="net8.0" />',
              "schema": "http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd"}
    fields.update(changes)
    return (f'<?xml version="1.0" encoding="utf-8"?><package xmlns="{fields["schema"]}"><metadata>'
            f'<id>{fields["id"]}</id><version>{fields["version"]}</version><authors>QR Code AI</authors>'
            f'<license type="{fields["license_type"]}">{fields["license"]}</license>'
            f'<readme>{fields["readme"]}</readme><projectUrl>{fields["projectUrl"]}</projectUrl>'
            f'<repository type="git" url="{fields["url"]}" commit="{fields["commit"]}" />'
            f'<dependencies>{fields["dependencies"]}</dependencies></metadata></package>').encode()


def packed(folder, drop=(), add=None, **changes):
    files = {f"{PACKAGE}.nuspec": nuspec(**changes), "README.md": b"# The package\n[spec](https://example.org/spec)\n",
             f"lib/{FRAMEWORK}/{PACKAGE}.dll": b"MZ assembly", f"lib/{FRAMEWORK}/{PACKAGE}.xml": b"<doc/>",
             "[Content_Types].xml": b"<Types/>", "_rels/.rels": b"<Relationships/>",
             "package/services/metadata/core-properties/0123456789abcdef.psmdcp": b"<coreProperties/>"}
    for rid, (record, data) in natives(folder).items():
        files[f"runtimes/{rid}/native/{record['file']}"] = data
    files.update(add or {})
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, data in files.items():
            if name not in drop:
                archive.writestr(name, data)
    return buffer.getvalue()


def refused(action):
    try:
        action()
    except Refused as error:
        return str(error)
    return None


def self_test():
    checks = []

    def check(label, passed, detail=""):
        checks.append((label, bool(passed), detail))

    def expect(label, action, words):
        message = refused(action)
        check(f"refuses {label}", message is not None and words in message, message or "it was accepted")

    for target in TARGETS:
        check(f"a library at the floor of {target} has no problem", not floor_problems(target, canned(target)),
              "; ".join(floor_problems(target, canned(target))))
    linux, mac, windows = "x86_64-unknown-linux-gnu", "aarch64-apple-darwin", "x86_64-pc-windows-msvc"
    for label, target, change, words in (
            ("a glibc above the floor", linux, {"highest_versions": {"GLIBC": "GLIBC_2.34"}}, "above GLIBC_2.28"),
            ("a library beyond glibc's own", linux, {"needed": ["libc.so.6", "libgcc_s.so.1"]}, "beyond glibc's own"),
            ("a library built for another processor", linux, {"arch": "aarch64"}, "built for aarch64"),
            ("an executable in place of a library", linux, {"interp": "/lib64/ld-linux-x86-64.so.2"}, "not a shared library"),
            ("a search path in the file", linux, {"runpath": ["$ORIGIN"]}, "search path"),
            ("a musl library", linux, {"libc": "musl", "needed": ["libc.so"]}, "does not load glibc"),
            ("a Visual C++ runtime import", windows, {"imports": ["KERNEL32.dll", "VCRUNTIME140.dll"]}, "C runtime"),
            ("a Universal C Runtime import", windows, {"imports": ["kernel32.dll", "api-ms-win-crt-heap-l1-1-0.dll"]},
             "C runtime"),
            ("a file with no kernel32 import", windows, {"imports": []}, "kernel32")):
        found = {**canned(target), **change}
        problems = floor_problems(target, found)
        check(f"names {label}", any(words in problem for problem in problems), "; ".join(problems) or "no problem")
    for label, change, words in (
            ("a macOS above the floor", {"min_os": {"minos": "12.0.0"}}, "needs macOS 12.0.0"),
            ("a library outside the system", {"dylibs": ["/usr/lib/libSystem.B.dylib", "/opt/homebrew/lib/libz.dylib"]},
             "not the system's"),
            ("an executable in place of a library", {"filetype": 2}, "not a dynamic library")):
        found = canned(mac)
        found["slices"][0].update(change)
        problems = floor_problems(mac, found)
        check(f"names {label}", any(words in problem for problem in problems), "; ".join(problems) or "no problem")
    fat = canned(mac)
    fat["slices"] = fat["slices"] * 2
    check("names a file with two architectures", any("thin" in problem for problem in floor_problems(mac, fat)))

    with tempfile.TemporaryDirectory() as scratch:
        scratch = pathlib.Path(scratch)
        built, out = scratch / "built", scratch / "natives"
        for target, row in TARGETS.items():
            (built / target).mkdir(parents=True)
            (built / target / row["file"]).write_bytes(f"library for {target}".encode())
            record = native(target, built / target / row["file"], out, read=lambda path, target=target: canned(target))
            check(f"records the library of {row['rid']}",
                  (record["rid"], record["size"]) == (row["rid"], len(f"library for {target}")))
        expect("a library under another name", lambda: native(linux, built / windows / TARGETS[windows]["file"], scratch / "x"),
               "is named")
        expect("a target the package does not have", lambda: native("riscv64gc-unknown-linux-gnu", built / linux / "x", out),
               "not a target")
        expect("a library above its floor", lambda: native(
            linux, built / linux / TARGETS[linux]["file"], scratch / "y",
            read=lambda path: {**canned(linux), "highest_versions": {"GLIBC": "GLIBC_2.39"}}), "above GLIBC_2.28")

        code = (NAMESPACE + "\ninternal static class NativeScanner {}\n").encode()
        sources = []
        for system, ends in (("linux", b"\n"), ("macos", b"\n"), ("windows", b"\r\n")):
            (scratch / system).mkdir()
            sources.append(scratch / system / GENERATED)
            sources[-1].write_bytes(code.replace(b"\n", ends))
        placed = generated(sources, scratch / "with-code")
        check("places the C# that three systems generated alike, line ends aside",
              placed["systems"] == 3 and (scratch / "with-code" / "generated" / GENERATED).read_bytes() == code, str(placed))
        expect("a second generated file over the first", lambda: generated(sources, scratch / "with-code"), "exists")
        sources[1].write_bytes(code + b"// one more line\n")
        expect("systems that generated different C#", lambda: generated(sources, scratch / "differs"), "did not generate the same C#")
        expect("no generated file at all", lambda: generated([], scratch / "none"), "no generated C# file")
        sources[1].write_bytes(b"// a generator that wrote nothing useful\n")
        expect("a generated file with another namespace", lambda: generated(sources[1:2], scratch / "foreign"), "does not declare")
        (scratch / "linux" / "other.cs").write_bytes(code)
        expect("a generated file under another name", lambda: generated([scratch / "linux" / "other.cs"], scratch / "named"), "is named")

        project = scratch / "project"
        project.mkdir()
        laid = layout(out, project)
        check("lays the five libraries out under runtimes", laid == sorted(
            f"runtimes/{row['rid']}/native/{row['file']}" for row in TARGETS.values()), str(laid))
        expect("a second layout over the first", lambda: layout(out, project), "exists")

        archive = packed(out)
        report = inspect(archive, out, "9.8.7", "c" * 40)
        check("accepts the archive of the package", report["version"] == "9.8.7" and len(report["natives"]) == 5)
        older = packed(out, schema="http://schemas.microsoft.com/packaging/2012/06/nuspec.xsd")
        check("accepts a nuspec in an older NuGet schema", refused(lambda: inspect(older, out, "9.8.7", "c" * 40)) is None)
        named = packed(out, drop=("package/services/metadata/core-properties/0123456789abcdef.psmdcp",),
                       add={"package/services/metadata/core-properties/nuget.psmdcp": b"<coreProperties/>"})
        check("accepts the properties file under the name a repeatable build gives it",
              refused(lambda: inspect(named, out, "9.8.7", "c" * 40)) is None)
        for label, words, broken in (
                ("an archive with one library missing", "lacks", packed(out, drop=("runtimes/win-x64/native/" + TARGETS[windows]["file"],))),
                ("an archive with a file too many", "beyond the package", packed(out, add={"tools/install.ps1": b"x"})),
                ("a file beside the properties file", "beyond the package",
                 packed(out, add={"package/services/metadata/core-properties/run.ps1": b"x"})),
                ("an archive with no README", "lacks", packed(out, drop=("README.md",))),
                ("a library that is not the one judged", "not the one that was judged",
                 packed(out, add={"runtimes/linux-x64/native/" + TARGETS[linux]["file"]: b"another library"})),
                ("another package id", "says id", packed(out, id="Another.Package")),
                ("another version", "says version", packed(out, version="9.8.6")),
                ("another license", "says license", packed(out, license="AGPL-3.0-or-later")),
                ("a license file in place of an expression", "says license", packed(out, license_type="file")),
                ("another project address", "says projectUrl", packed(out, projectUrl="https://example.org/")),
                ("another repository", "says repository", packed(out, url="https://github.com/elsewhere/fork")),
                ("another commit", "says repository", packed(out, commit="d" * 40)),
                ("a dependency on another package", "depends on another package",
                 packed(out, dependencies='<group targetFramework="net8.0"><dependency id="Newtonsoft.Json" version="13.0.3" /></group>')),
                ("a README with a link beside it", "links to a file beside it",
                 packed(out, add={"README.md": b"[spec](../../spec/01-report.md)\n"})),
                ("a nuspec of another kind of document", "not a NuGet package",
                 packed(out, schema="http://example.org/another")),
                ("a nuspec that declares an entity", "document type or an entity",
                 packed(out, add={f"{PACKAGE}.nuspec": b'<!DOCTYPE x [<!ENTITY a "b">]>' + nuspec()})),
                ("an assembly that is not one", "not a .NET assembly", packed(out, add={f"lib/{FRAMEWORK}/{PACKAGE}.dll": b"text"}))):
            expect(label, lambda broken=broken: inspect(broken, out, "9.8.7", "c" * 40), words)
        expect("bytes that are not an archive", lambda: inspect(b"not a zip", out, "9.8.7", "c" * 40), "not an archive")

        (out / "win-x64" / TARGETS[windows]["file"]).write_bytes(b"changed after its record")
        expect("a library that left its record", lambda: natives(out), "left its record")
        shutil.rmtree(out / "osx-x64")
        expect("a missing target", lambda: natives(out), "not the five targets")

    failed = [(label, detail) for label, passed, detail in checks if not passed]
    for label, detail in failed:
        print(f"FAIL {label}" + (f": {detail}" if detail else ""))
    print(f"self-test: {len(checks) - len(failed)}/{len(checks)} checks passed")
    return 1 if failed else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("native")
    one.add_argument("--target", required=True)
    one.add_argument("--library", required=True, type=pathlib.Path)
    one.add_argument("--out", required=True, type=pathlib.Path)
    code = commands.add_parser("generated")
    code.add_argument("files", nargs="+", type=pathlib.Path)
    code.add_argument("--project", required=True, type=pathlib.Path)
    place = commands.add_parser("layout")
    place.add_argument("--natives", required=True, type=pathlib.Path)
    place.add_argument("--project", required=True, type=pathlib.Path)
    judge = commands.add_parser("inspect")
    judge.add_argument("archive", type=pathlib.Path)
    judge.add_argument("--natives", required=True, type=pathlib.Path)
    judge.add_argument("--version", required=True)
    judge.add_argument("--commit", required=True)
    judge.add_argument("--out", type=pathlib.Path)
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    try:
        if args.command == "native":
            record = native(args.target, args.library, args.out)
            print(json.dumps(record, indent=2, sort_keys=True))
        elif args.command == "generated":
            print(json.dumps(generated(args.files, args.project), indent=2, sort_keys=True))
        elif args.command == "layout":
            for path in layout(args.natives, args.project):
                print(path)
        elif args.command == "inspect":
            require(args.archive.name == f"{PACKAGE}.{args.version}.nupkg",
                    f"the archive of {args.version} is named {PACKAGE}.{args.version}.nupkg")
            report = inspect(args.archive.read_bytes(), args.natives, args.version, args.commit)
            text = json.dumps(report, indent=2, sort_keys=True) + "\n"
            if args.out:
                args.out.write_text(text, encoding="utf-8")
            print(text, end="")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"refused: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
