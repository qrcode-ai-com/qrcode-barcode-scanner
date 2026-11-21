#!/usr/bin/env python3
"""Assemble and check the Wasmer package of qrscan for wasm32-wasip1.

  package.py assemble --engine DIR --module FILE --out DIR
  package.py verify DIR [--module-sha256 H]
  package.py packed DIR UNPACKED
  package.py --self-test

The module is built from the source of tag v0.11.0 (commit ENGINE_COMMIT), checked out at
--engine, for the wasm32-wasip1 target of the pinned toolchain. Its engine code and Cargo.lock
are those of the 0.11.0 release; the module is a new build target of that source, not one of the
published 0.11.0 files, which stay as they are.

`assemble` runs where the module was built (it reads `cargo tree`, `cargo metadata` and the
toolchain, offline) and writes into a new directory the folder `wasmer publish` reads. Wasmer
packs only the module, the readme, the license file and the directories wasmer.toml maps under
[fs], so every notice the module needs sits in `notices/`, which the manifest maps to /notices:

  - wasmer.toml and README.md of distribution/wasmer, and its LICENSE-NOTES.md as
    notices/LICENSE-NOTES.md, byte for byte;
  - qrscan.wasm, the module;
  - LICENSE, the AGPL-3.0 text of the 0.11.0 source (equal to
    distribution/releases/historical-agpl-3.0.txt), and from that source the Apache-2.0 text and
    THIRD-PARTY.md of the copied reader code, in notices/;
  - notices/COPYRIGHT-rust-std.html, the Rust standard library notice the toolchain ships;
  - notices/THIRD-PARTY-LICENSES.txt: every registry crate the CLI links for wasm32-wasip1, with
    its license expression, checksum and license texts, written as scripts/cli-release.py writes
    it for the release archives, and held to the same deny.toml allow list;
  - notices/SOURCE.json: the engine revision and tag, this repository's revision, the target, the
    rustc release and the sha256 of every other file;
  - SHA256SUMS: one `sha256  path` line per file but itself (it is not part of what Wasmer packs).

`verify` checks a folder against those rules with no toolchain: the exact file set, every
sha256, the manifest, license and README files equal to this checkout's, and the module's sha256
equal to SOURCE.json and to --module-sha256 when given. `packed` reads UNPACKED, the output of
`wasmer package unpack --format webc` for the package Wasmer built from DIR, and requires every
file of DIR that a user must receive (all but wasmer.toml, which a webc does not keep, and
SHA256SUMS) to be in it, byte for byte. Exit 0 when the step passes, 1 when it fails, 2 for usage
or a missing tool. Stdlib only, Python >= 3.11.
"""
import argparse
import hashlib
import importlib.util
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import tomllib

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = ROOT / "distribution/wasmer"
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
SCHEMA = "qrscan-wasmer-package/1"
VERSION = "0.11.0"
ENGINE_TAG = "v0.11.0"
ENGINE_COMMIT = "176ac96ef16ee330dbfc6ada10327d0b4e23a8b2"
TARGET = "wasm32-wasip1"
AGPL = ROOT / "distribution/releases/historical-agpl-3.0.txt"
# Package path: source path, of the files copied from this folder and from the 0.11.0 source.
NOTICES = "notices"
OWN = {"wasmer.toml": "wasmer.toml", "README.md": "README.md",
       f"{NOTICES}/LICENSE-NOTES.md": "LICENSE-NOTES.md"}
FROM_ENGINE = {"LICENSE": "LICENSE",
               f"{NOTICES}/LICENSE-APACHE-2.0": "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
               f"{NOTICES}/THIRD-PARTY.md": "crates/qrcode-ai-scanner/THIRD-PARTY.md"}
MODULE = "qrscan.wasm"
STD_NOTICE = f"{NOTICES}/COPYRIGHT-rust-std.html"
THIRD_PARTY = f"{NOTICES}/THIRD-PARTY-LICENSES.txt"
SOURCE = f"{NOTICES}/SOURCE.json"
FILES = frozenset((*OWN, *FROM_ENGINE, MODULE, STD_NOTICE, THIRD_PARTY, SOURCE, "SHA256SUMS"))
WASM_MAGIC = b"\0asm\x01\0\0\0"


class Refused(Exception):
    """The package cannot be written, or a folder is not the package."""


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def manifest_problems(data):
    """Every way wasmer.toml departs from the package this folder describes."""
    try:
        manifest = tomllib.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, tomllib.TOMLDecodeError) as error:
        return [f"wasmer.toml is not TOML: {error}"]
    package = manifest.get("package", {})
    expected = {"name": "qrcode-ai-com/qrcode-barcode-scanner", "version": VERSION, "license": "AGPL-3.0-or-later",
                "license-file": "LICENSE", "readme": "README.md", "repository": REPOSITORY, "entrypoint": "qrscan"}
    problems = [f"wasmer.toml [package] {key} is {package.get(key)!r}, not {value!r}"
                for key, value in expected.items() if package.get(key) != value]
    if manifest.get("module") != [{"name": "qrscan", "source": MODULE, "abi": "wasi"}]:
        problems.append(f"wasmer.toml declares {manifest.get('module')!r}, not the one WASI module {MODULE}")
    if manifest.get("command") != [{"name": "qrscan", "module": "qrscan", "runner": "wasi"}]:
        problems.append(f"wasmer.toml declares {manifest.get('command')!r}, not the one WASI command qrscan")
    if manifest.get("fs") != {f"/{NOTICES}": NOTICES}:
        problems.append(f"wasmer.toml [fs] is {manifest.get('fs')!r}, not the one {NOTICES}/ directory of notices")
    return problems


def sums_bytes(files):
    return "".join(f"{sha256(data)}  {name}\n" for name, data in sorted(files.items())).encode()


def write(out, files):
    out = pathlib.Path(out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    out.mkdir(parents=True, exist_ok=True)
    for name, data in sorted(files.items()):
        path = out / name
        path.parent.mkdir(parents=True, exist_ok=True)
        os.chmod(path.parent, 0o755)
        path.write_bytes(data)
        os.chmod(path, 0o644)


def package_files(module, engine_files, generated, source_facts, packaging_revision):
    """The whole folder as {name: bytes}, SOURCE.json and SHA256SUMS included."""
    if not module.startswith(WASM_MAGIC):
        raise Refused(f"{MODULE} is not a WebAssembly 1.0 binary module")
    files = {name: (HERE / source).read_bytes() for name, source in OWN.items()}
    problems = manifest_problems(files["wasmer.toml"])
    if engine_files["LICENSE"] != AGPL.read_bytes():
        problems.append("the LICENSE of the engine source is not the AGPL-3.0 text of 0.11.0")
    if problems:
        raise Refused("; ".join(problems))
    files.update(engine_files)
    files[MODULE] = module
    files.update(generated)
    record = {"schema": SCHEMA, "version": VERSION, "target": TARGET,
              "engine": {"repository": REPOSITORY, "tag": ENGINE_TAG, "revision": ENGINE_COMMIT, **source_facts},
              "packaging": {"repository": REPOSITORY, "revision": packaging_revision},
              "module": {"name": MODULE, "sha256": sha256(module), "size": len(module)},
              "files": {name: sha256(data) for name, data in sorted(files.items())}}
    files[SOURCE] = (json.dumps(record, indent=2) + "\n").encode()
    files["SHA256SUMS"] = sums_bytes(files)
    return files


def cli_release():
    spec = importlib.util.spec_from_file_location("cli_release", ROOT / "scripts/cli-release.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def generated_files(engine):
    """The Rust std notice and the third-party license list, from cargo and the toolchain, offline."""
    release = cli_release()
    env = dict(os.environ)
    try:
        notice = release.std_notice(env, engine)
        rustc, fields = release.rustc_facts(env, engine)
        lock_text = (engine / "Cargo.lock").read_bytes()
        lock = {(item["name"], item["version"]): item for item in tomllib.loads(lock_text.decode())["package"]}
        metadata = json.loads(release.fact(env, ["cargo", "metadata", "--format-version", "1", "--locked",
                                                 "--offline"], engine))
        packages = {(item["name"], item["version"]): item for item in metadata["packages"]}
        linked = release.cargo_tree(env, engine, TARGET, "normal,no-proc-macro")
    except release.Stop as stop:
        raise Refused("; ".join(stop.problems)) from None
    problems = []
    overrides, more = release.load_overrides(ROOT)
    problems += more
    allowed = release.deny_allowed(ROOT)
    texts, digests = {}, {}
    for key in sorted(linked):
        if key not in packages or (lock.get(key) or {}).get("source") is None:
            continue
        spdx = next((item["spdx"] for item in overrides.get(key, []) if item.get("spdx")), None)
        problem = release.license_problem(*key, packages[key].get("license") or spdx, allowed)
        problems += [problem] if problem else []
        found = release.crate_texts(packages[key], overrides, problems)
        digests[key] = sorted({sha256(text) for text in found.values()})
        texts.update({sha256(text): text for text in found.values()})
    rows = release.records(linked, lock, packages, overrides, problems)
    third = [{**row, "texts": digests.get((row["name"], row["version"]), [])} for row in rows if row["source"]]
    if problems:
        raise Refused("; ".join(dict.fromkeys(problems)))
    generated = {STD_NOTICE: notice, THIRD_PARTY: release.third_party_bytes(VERSION, TARGET, third, texts)}
    facts = {"cargo_lock_sha256": sha256(lock_text), "third_party_crates": len(third),
             "rustc": [line for line in rustc if not line.startswith("host: ")], "release": fields.get("release")}
    return generated, facts


def git_output(*arguments, cwd):
    return subprocess.run(["git", *arguments], cwd=cwd, capture_output=True, text=True, check=True).stdout.strip()


def assemble(engine, module_path, out):
    engine = pathlib.Path(engine).resolve()
    try:
        commit = git_output("rev-parse", "HEAD^{commit}", cwd=engine)
        packaging = git_output("rev-parse", "HEAD^{commit}", cwd=ROOT)
    except (OSError, subprocess.CalledProcessError) as error:
        raise Refused(f"cannot read the revisions: {error}") from None
    if commit != ENGINE_COMMIT:
        raise Refused(f"the engine source at {engine} is {commit}, not {ENGINE_TAG} ({ENGINE_COMMIT})")
    version = tomllib.loads((engine / "Cargo.toml").read_text())["workspace"]["package"]["version"]
    if version != VERSION:
        raise Refused(f"the engine source is version {version}, not {VERSION}")
    engine_files = {name: (engine / path).read_bytes() for name, path in FROM_ENGINE.items()}
    generated, facts = generated_files(engine)
    files = package_files(pathlib.Path(module_path).read_bytes(), engine_files, generated, facts, packaging)
    write(out, files)
    return json.loads(files[SOURCE])


def verify(directory, module_sha256=None):
    directory = pathlib.Path(directory)
    present = {path.relative_to(directory).as_posix(): path for path in directory.rglob("*") if path.is_file()}
    problems = [f"missing {name}" for name in sorted(FILES - set(present))]
    problems += [f"not part of the package: {name}" for name in sorted(set(present) - FILES)]
    if problems:
        raise Refused("; ".join(problems))
    files = {name: path.read_bytes() for name, path in present.items()}
    sums = {name: data for name, data in files.items() if name != "SHA256SUMS"}
    if files["SHA256SUMS"] != sums_bytes(sums):
        problems.append("SHA256SUMS does not list the sha256 of every other file")
    try:
        record = json.loads(files[SOURCE])
        engine, module = record["engine"], record["module"]
        if record["schema"] != SCHEMA or engine["revision"] != ENGINE_COMMIT or engine["tag"] != ENGINE_TAG:
            problems.append("SOURCE.json names another schema or engine revision")
        listed = {name: data for name, data in sums.items() if name != SOURCE}
        if record["files"] != {name: sha256(data) for name, data in sorted(listed.items())}:
            problems.append("SOURCE.json does not record the sha256 of every file")
        if module["sha256"] != sha256(files[MODULE]) or module["size"] != len(files[MODULE]):
            problems.append("SOURCE.json names another module")
    except (ValueError, KeyError, TypeError) as error:
        problems.append(f"{SOURCE} is not a package record: {error}")
    if module_sha256 and sha256(files[MODULE]) != module_sha256:
        problems.append(f"{MODULE} is {sha256(files[MODULE])}, not the built module {module_sha256}")
    if not files[MODULE].startswith(WASM_MAGIC):
        problems.append(f"{MODULE} is not a WebAssembly 1.0 binary module")
    problems += manifest_problems(files["wasmer.toml"])
    problems += [f"{name} differs from distribution/wasmer/{source}" for name, source in OWN.items()
                 if files[name] != (HERE / source).read_bytes()]
    if files["LICENSE"] != AGPL.read_bytes():
        problems.append("LICENSE is not the AGPL-3.0 text of 0.11.0")
    if problems:
        raise Refused("; ".join(problems))
    return sha256(files[MODULE]), len(files)


# Files a package folder holds for the owner's checks, not for the published package.
NOT_PACKED = ("wasmer.toml", "SHA256SUMS")


def packed(directory, unpacked):
    """The number of files found when every file a user must receive is in the unpacked webc."""
    directory, unpacked = pathlib.Path(directory), pathlib.Path(unpacked)
    found = {sha256(path.read_bytes()) for path in unpacked.rglob("*") if path.is_file()}
    wanted = {name: sha256((directory / name).read_bytes()) for name in sorted(FILES - set(NOT_PACKED))}
    missing = [name for name, digest in wanted.items() if digest not in found]
    if missing:
        raise Refused("the package Wasmer built does not hold " + ", ".join(missing))
    return len(wanted)


def self_test():
    """A synthetic package verifies; each departure from it is refused for its own reason."""
    failures = []
    module = WASM_MAGIC + b"\x00" * 8
    engine_files = {"LICENSE": AGPL.read_bytes(), f"{NOTICES}/LICENSE-APACHE-2.0": b"apache\n",
                    f"{NOTICES}/THIRD-PARTY.md": b"notes\n"}
    generated = {STD_NOTICE: b"<p>std</p>\n", THIRD_PARTY: b"crates\n"}
    good = package_files(module, engine_files, generated, {"cargo_lock_sha256": "0" * 64}, "0" * 40)

    def case(name, files, needle, module_sha256=None):
        with tempfile.TemporaryDirectory() as box:
            write(pathlib.Path(box) / "p", files)
            try:
                verify(pathlib.Path(box) / "p", module_sha256)
            except Refused as error:
                if needle is None or needle not in str(error):
                    failures.append(f"{name}: refused with {error}")
            else:
                if needle is not None:
                    failures.append(f"{name}: accepted")

    def changed(name, data):
        files = dict(good, **{name: data})
        return files

    case("the package as written", good, None, sha256(module))
    case("another built module", good, "not the built module", "1" * 64)
    edited = changed(MODULE, WASM_MAGIC + b"\x01" * 8)
    case("a module replaced after the record", edited, "SHA256SUMS")
    case("a file added", dict(good, **{"extra.txt": b"x"}), "not part of the package: extra.txt")
    case("a file missing", {k: v for k, v in good.items() if k != "LICENSE"}, "missing LICENSE")
    other = package_files(module, dict(engine_files), generated, {}, "0" * 40)
    other["wasmer.toml"] = good["wasmer.toml"].replace(b'version = "0.11.0"', b'version = "0.11.1"')
    other["SHA256SUMS"] = sums_bytes({k: v for k, v in other.items() if k != "SHA256SUMS"})
    case("another package version", other, "[package] version")
    unmapped = dict(good)
    unmapped["wasmer.toml"] = good["wasmer.toml"].replace(b'[fs]\n"/notices" = "notices"\n', b"")
    unmapped["SHA256SUMS"] = sums_bytes({k: v for k, v in unmapped.items() if k != "SHA256SUMS"})
    case("notices Wasmer would not pack", unmapped, "[fs]")
    try:
        package_files(module, dict(engine_files, LICENSE=b"MIT\n"), generated, {}, "0" * 40)
        failures.append("a source whose LICENSE is not the AGPL text: accepted")
    except Refused as error:
        if "AGPL" not in str(error):
            failures.append(f"a source whose LICENSE is not the AGPL text: refused with {error}")
    try:
        package_files(b"\x7fELF", engine_files, generated, {}, "0" * 40)
        failures.append("a native binary as the module: accepted")
    except Refused:
        pass
    with tempfile.TemporaryDirectory() as box:
        write(pathlib.Path(box) / "p", good)
        webc = {f"atoms/{MODULE}": module, **{f"volumes/{name}": data for name, data in good.items()
                                              if name not in NOT_PACKED}}
        write(pathlib.Path(box) / "u", webc)
        try:
            packed(pathlib.Path(box) / "p", pathlib.Path(box) / "u")
        except Refused as error:
            failures.append(f"a webc holding every notice: refused with {error}")
        (pathlib.Path(box) / "u/volumes" / THIRD_PARTY).unlink()
        try:
            packed(pathlib.Path(box) / "p", pathlib.Path(box) / "u")
            failures.append("a webc without the third-party licenses: accepted")
        except Refused as error:
            if THIRD_PARTY not in str(error):
                failures.append(f"a webc without the third-party licenses: refused with {error}")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (1 package, 8 refusals, 1 webc, 1 refusal)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("assemble")
    one.add_argument("--engine", required=True)
    one.add_argument("--module", required=True)
    one.add_argument("--out", required=True)
    two = commands.add_parser("verify")
    two.add_argument("directory")
    two.add_argument("--module-sha256")
    three = commands.add_parser("packed")
    three.add_argument("directory")
    three.add_argument("unpacked")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        if args.command == "assemble":
            record = assemble(args.engine, args.module, args.out)
            print(json.dumps({k: record[k] for k in ("version", "target", "engine", "module")}, indent=2))
        elif args.command == "verify":
            digest, count = verify(args.directory, args.module_sha256)
            print(f"ok    {count} files; {MODULE} {digest}")
        elif args.command == "packed":
            print(f"ok    the built package holds the {packed(args.directory, args.unpacked)} files a user receives")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"package.py: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
