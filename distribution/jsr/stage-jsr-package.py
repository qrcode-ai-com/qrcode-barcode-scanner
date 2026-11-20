#!/usr/bin/env python3
"""Stage the JSR package @qrcode-ai-com/qrcode-barcode-scanner from the published npm WASM package.

  stage-jsr-package.py stage --out DIR [--tarball FILE]
  stage-jsr-package.py --self-test

JSR publishes the files of a folder that holds a jsr.json. This script writes that folder from the
npm tarball of @qrcode-ai-com/qrcode-barcode-scanner-wasm 0.11.0, the published browser build. It
compiles nothing: the WebAssembly module and the JavaScript are the npm bytes, checked against the
npm integrity and the module's SHA-256 before anything is written. JSR needs two small changes
to the type information, and only these are made:

  - each exported JavaScript file starts with a `@ts-self-types` comment naming its own .d.ts, so
    JSR finds the types (qrcode-barcode-scanner.js already has it, the four others gain one line);
  - relative imports inside the .d.ts files name their file exactly (`./report-types` becomes
    `./report-types.d.ts`), because JSR resolves no extensionless or `.js`-for-`.d.ts` path. An
    import of a staged .js module stays as it is: its `@ts-self-types` line names its types.

The camera modules name browser types (HTMLVideoElement, MediaDevices). JSR refuses a
`/// <reference lib="dom" />` line in a package, so jsr.json sets the DOM library in its
compilerOptions for the check that `jsr publish` runs.

Without --tarball the tarball is downloaded from the npm registry. The package README is
distribution/jsr/README.md. DIR also receives SOURCE.json: the tarball, its integrity, and for every
staged file its npm path, both SHA-256 and the change made, if any. Stdlib only. Exit 0 when the
step passes, 1 when it fails, 2 for usage.
"""
import argparse
import base64
import hashlib
import io
import json
import pathlib
import re
import sys
import tarfile
import tempfile
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
NAME = "@qrcode-ai-com/qrcode-barcode-scanner"
VERSION = "0.11.0"
NPM = "@qrcode-ai-com/qrcode-barcode-scanner-wasm"
TARBALL = "https://registry.npmjs.org/@qrcode-ai-com/qrcode-barcode-scanner-wasm/-/qrcode-barcode-scanner-wasm-0.11.0.tgz"
INTEGRITY = "sha512-ER8yFXFrXIXpLLGHmtIvtUdc4421YKxh6eHGMER6VkzwK0vmhfVXTbp43Z9vcCSGdSuuuoLiUnaw1YZAYrZbKA=="
WASM = "qrcode-barcode-scanner_bg.wasm"
WASM_SHA256 = "a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68"
LICENSE = "AGPL-3.0-or-later"
EXPORTS = {".": "qrcode-barcode-scanner", "./auto": "auto", "./camera": "camera",
           "./camera-overlay": "camera-overlay", "./destination": "destination"}
KEPT = (WASM, "report-types.d.ts", "build-info.json", "LICENSE", "LICENSE-APACHE-2.0", "THIRD-PARTY.md")
SPECIFIER = re.compile(r"""(from\s+|import\()(['"])\./([A-Za-z0-9_-]+?)(\.js)?\2""")
# The camera modules name browser types; Deno checks them only with the DOM library.
LIBRARIES = ["dom", "dom.iterable", "esnext", "deno.ns"]
SCHEMA = "qrscan-jsr-stage/1"


class Refused(Exception):
    """An input is not the published one, or the stage cannot be written."""


def integrity(data):
    return "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def members(tarball):
    """The files of the npm tarball, as {path below package/: bytes}."""
    files = {}
    with tarfile.open(fileobj=io.BytesIO(tarball), mode="r:gz") as archive:
        for member in archive.getmembers():
            if not member.isfile():
                continue
            if not member.name.startswith("package/") or ".." in member.name.split("/"):
                raise Refused(f"the tarball holds an unexpected path: {member.name}")
            files[member.name[len("package/"):]] = archive.extractfile(member).read()
    return files


def explicit_types(text, available):
    """Name the .d.ts file of every relative import of a declaration file."""
    def replace(match):
        stem = match[3]
        if match[4] and f"{stem}.js" in available:
            return match[0]  # a staged module whose @ts-self-types names its types
        if f"{stem}.d.ts" not in available:
            raise Refused(f"a declaration imports ./{stem}, which has no {stem}.d.ts in the stage")
        return f"{match[1]}{match[2]}./{stem}.d.ts{match[2]}"
    return SPECIFIER.sub(replace, text)


def staged(tarball, readme, expected_integrity=INTEGRITY, expected_wasm=WASM_SHA256):
    """The tree of the JSR package, as {path: bytes}, and the record of every change."""
    if integrity(tarball) != expected_integrity:
        raise Refused(f"the tarball is {integrity(tarball)}, not the published {expected_integrity}")
    npm = members(tarball)
    manifest = json.loads(npm.get("package.json", b"{}"))
    if (manifest.get("name"), manifest.get("version"), manifest.get("license")) != (NPM, VERSION, LICENSE):
        raise Refused(f"the tarball is not {NPM} {VERSION} under {LICENSE}")
    if sha256(npm.get(WASM, b"")) != expected_wasm:
        raise Refused(f"{WASM} is not the published module")
    wanted = {f"{stem}.js" for stem in EXPORTS.values()} | {f"{stem}.d.ts" for stem in EXPORTS.values()}
    wanted |= set(KEPT)
    missing = sorted(wanted - set(npm))
    if missing:
        raise Refused(f"the tarball lacks {', '.join(missing)}")
    files, changes = {}, {}
    for path in sorted(wanted):
        data = npm[path]
        change = None
        if path.endswith(".d.ts"):
            text = explicit_types(data.decode(), wanted)
            if text.encode() != data:
                data, change = text.encode(), "relative type imports name their .d.ts file"
        elif path.endswith(".js"):
            header = f'/* @ts-self-types="./{path[:-3]}.d.ts" */'
            if not data.decode().startswith(header):
                data, change = (header + "\n").encode() + data, "a @ts-self-types first line"
        files[path] = data
        changes[path] = {"npm": sha256(npm[path]), "staged": sha256(data), "change": change}
    files["README.md"] = readme
    config = {"name": NAME, "version": VERSION, "license": LICENSE,
              "exports": {key: f"./{stem}.js" for key, stem in EXPORTS.items()},
              "publish": {"include": sorted([*wanted, "README.md", "jsr.json"])},
              "compilerOptions": {"lib": LIBRARIES}}
    files["jsr.json"] = (json.dumps(config, indent=2) + "\n").encode()
    record = {"schema": SCHEMA, "package": NAME, "version": VERSION,
              "from": {"npm": f"{NPM}@{VERSION}", "tarball": TARBALL, "integrity": expected_integrity},
              "files": changes}
    files["SOURCE.json"] = (json.dumps(record, indent=2) + "\n").encode()
    return files


def stage(out, tarball):
    out = pathlib.Path(out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    files = staged(tarball, (HERE / "README.md").read_bytes())
    for path, data in files.items():
        target = out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return files


def download():
    with urllib.request.urlopen(TARBALL, timeout=120) as response:
        return response.read()


# ------------------------------------------------------------------ self-test

def sample(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path, data in files.items():
            member = tarfile.TarInfo(f"package/{path}")
            member.size = len(data)
            archive.addfile(member, io.BytesIO(data))
    return buffer.getvalue()


def self_test():
    failures = []

    def refused(name, action, needle):
        try:
            action()
        except Refused as error:
            if needle not in str(error):
                failures.append(f"{name}: refused with {error!s}, expected {needle!r}")
        else:
            failures.append(f"{name}: accepted")

    wasm = b"\0asm\1\0\0\0"
    npm = {"package.json": json.dumps({"name": NPM, "version": VERSION, "license": LICENSE}).encode(),
           WASM: wasm, "report-types.d.ts": b"export type ScanReport = {};\n", "build-info.json": b"{}",
           "LICENSE": b"AGPL", "LICENSE-APACHE-2.0": b"Apache", "THIRD-PARTY.md": b"notices",
           "examples/headless.js": b"// not staged\n"}
    for stem in EXPORTS.values():
        npm[f"{stem}.js"] = f"export const {stem.replace('-', '_')} = 1;\n".encode()
        npm[f"{stem}.d.ts"] = (f"import type {{ ScanReport }} from './report-types';\n"
                               f"export * from \"./report-types.js\";\n").encode()
    npm["qrcode-barcode-scanner.js"] = b'/* @ts-self-types="./qrcode-barcode-scanner.d.ts" */\nexport {};\n'
    npm["camera-overlay.d.ts"] = b"export declare function mount(video: HTMLVideoElement): void;\n"
    tarball = sample(npm)
    good = integrity(tarball)
    files = staged(tarball, b"# readme\n", good, sha256(wasm))
    config = json.loads(files["jsr.json"])
    if config["name"] != NAME or config["license"] != LICENSE or set(config["exports"]) != set(EXPORTS):
        failures.append("jsr.json does not name the package, its license and its five exports")
    if files[WASM] != wasm:
        failures.append("the WebAssembly module was changed")
    if "examples/headless.js" in files:
        failures.append("an example was staged")
    if files["camera.js"] != b'/* @ts-self-types="./camera.d.ts" */\n' + npm["camera.js"]:
        failures.append("camera.js did not gain exactly one @ts-self-types line")
    if files["qrcode-barcode-scanner.js"] != npm["qrcode-barcode-scanner.js"]:
        failures.append("a file that already names its types was changed")
    if "dom" not in config.get("compilerOptions", {}).get("lib", []) or b"/// <reference" in files["camera-overlay.d.ts"]:
        failures.append("the DOM library is not set in jsr.json, or a banned reference line was added")
    if b"'./report-types.d.ts'" not in files["camera.d.ts"] or b'"./report-types.d.ts"' not in files["camera.d.ts"]:
        failures.append("the relative type imports were not made explicit")
    record = json.loads(files["SOURCE.json"])
    if record["files"][WASM]["change"] is not None or record["files"]["camera.js"]["change"] is None:
        failures.append("SOURCE.json does not record which files changed")
    refused("a tarball with another integrity", lambda: staged(tarball, b"", INTEGRITY, sha256(wasm)), "not the published")
    refused("another WebAssembly module", lambda: staged(tarball, b"", good, "0" * 64), "not the published module")
    relicensed = dict(npm, **{"package.json": json.dumps({"name": NPM, "version": VERSION, "license": "MIT"}).encode()})
    other = sample(relicensed)
    refused("a package under another license", lambda: staged(other, b"", integrity(other), sha256(wasm)), "under AGPL")
    broken = dict(npm, **{"camera.d.ts": b"import type { X } from './missing';\n"})
    other = sample(broken)
    refused("a type import with no file", lambda: staged(other, b"", integrity(other), sha256(wasm)), "has no missing.d.ts")
    with tempfile.TemporaryDirectory() as temporary:
        out = pathlib.Path(temporary)
        (out / "x").write_text("x")
        refused("a directory that is not empty", lambda: stage(out, tarball), "is not empty")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (one sample package, 5 refusals)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("stage", help="write the JSR package folder")
    one.add_argument("--out", required=True)
    one.add_argument("--tarball", help="the npm tarball, read instead of downloaded")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.command != "stage":
        parser.print_usage(sys.stderr)
        return 2
    try:
        tarball = pathlib.Path(args.tarball).read_bytes() if args.tarball else download()
        files = stage(args.out, tarball)
    except (Refused, OSError) as error:
        print(f"stage-jsr-package: {error}", file=sys.stderr)
        return 1
    changed = sum(1 for entry in json.loads(files["SOURCE.json"])["files"].values() if entry["change"])
    print(f"staged {len(files)} files into {args.out} ({changed} with a recorded change)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
