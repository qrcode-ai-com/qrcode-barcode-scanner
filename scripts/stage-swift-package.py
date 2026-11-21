#!/usr/bin/env python3
"""Stage the Swift package as the tree of its own repository, and pack its xcframework.

  stage-swift-package.py pack XCFRAMEWORK --swift FILE --engine CHECKOUT --out DIR
  stage-swift-package.py stage --generated DIR [--revision REV] --out OUT
  stage-swift-package.py verify SATELLITE --generated DIR
  stage-swift-package.py gate --ref REF
  stage-swift-package.py --self-test

SwiftPM and the Swift Package Index read a package from the root of a repository at a tag, with
its compiled engine as a binary target: a zip at a URL, pinned by its sha256. The package is
therefore served from qrcode-ai-com/qrcode-barcode-scanner-swift, whose content is never edited
by hand, and its zip is an asset of this repository's release `swift-vX.Y.Z`.

bindings/swift/package/satellite.json pins what the package holds: the engine tag it is built
from, the package version, the release tag and the sha256 of the zip. A new engine is a change
of that file, reviewed here.

`pack` runs where the engine was built (.github/workflows/swift-package.yml, on macOS). It
writes into DIR the zip of XCFRAMEWORK, every entry sorted with the engine commit's date and
fixed permissions, the Swift that UniFFI generated (FILE), and `build.json`, which names the
engine checkout and the sha256 of both. CHECKOUT must be the pinned engine commit.

`stage` reads bindings/swift/package at REV (HEAD by default) from git, never from the working
tree, and writes into an empty OUT the whole tree of the satellite:

  - `Package.swift` from `Package.swift.in`, with the release asset's URL and pinned sha256;
  - `Sources/QRCodeBarcodeScanner/`, the generated Swift of DIR, which must come from the pinned
    engine commit;
  - README.md (its relative links become links to this repository), LICENSE-NOTES.md and
    `.gitignore`;
  - LICENSE and the engine's notices (`LICENSE-APACHE-2.0`, `THIRD-PARTY.md`), byte for byte
    from the pinned engine commit, the terms the binary target ships under;
  - `SOURCE.json`: this repository and REV, the engine pin, and the sha256 of every staged file.

`verify` stages the commit that SATELLITE's SOURCE.json names, with the generated Swift of DIR,
and compares: same files, same bytes, nothing else beside `.git`. `gate` refuses a ref that is not
the pinned release tag `refs/tags/swift-vX.Y.Z`. Stdlib only. Exit 0 when the step passes, 1 when
it is refused, 2 for usage.
"""
import argparse
import hashlib
import io
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import time
import zipfile

from satellite_stage import REPOSITORY, ROOT, Refused, Satellite, git, tree

PACKAGE = "bindings/swift/package"
PIN = "satellite.json"
SCHEMA = "qrscan-swift-stage/1"
BUILD_SCHEMA = "qrscan-swift-build/1"
SATELLITE_REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-swift"
FRAMEWORK = "QrcodeAiScannerFFI.xcframework"
MODULE = "qrcode_ai_scanner_uniffiFFI"
ASSET = FRAMEWORK + ".zip"
GENERATED = "qrcode_ai_scanner_uniffi.swift"
SOURCES = "Sources/QRCodeBarcodeScanner/" + GENERATED
# The files of bindings/swift/package that the satellite carries as they are.
COPIED = ("README.md", "LICENSE-NOTES.md", ".gitignore")
# What the satellite takes from the pinned engine commit: its license and the notices of the code
# its library derives from (crates/qrcode-ai-scanner).
FROM_ENGINE = {"LICENSE": "LICENSE", "LICENSE-APACHE-2.0": "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
               "THIRD-PARTY.md": "crates/qrcode-ai-scanner/THIRD-PARTY.md"}
LIMIT = 512 * 1024 * 1024
TAG = re.compile(r"refs/tags/(swift-v(\d+\.\d+\.\d+))")


def read_pin(revision, root=ROOT):
    """The pin of bindings/swift/package at REVISION, checked."""
    try:
        pin = json.loads(git("show", f"{revision}:{PACKAGE}/{PIN}", root=root))
    except (subprocess.CalledProcessError, ValueError) as error:
        raise Refused(f"{PACKAGE}/{PIN} is missing or not JSON at {revision}") from error
    try:
        version, tag, commit = pin["version"], pin["engine"]["tag"], pin["engine"]["commit"]
        release, checksum = pin["release_tag"], pin["checksum"]
    except (KeyError, TypeError) as error:
        raise Refused(f"{PIN} lacks {error}") from error
    if pin.get("schema") != "qrscan-swift-pin/1":
        raise Refused(f"{PIN} has another schema: {pin.get('schema')!r}")
    if not re.fullmatch(r"\d+\.\d+\.\d+", str(version)) or release != f"swift-v{version}":
        raise Refused(f"{PIN}: the release tag {release!r} is not swift-v and the version {version!r}")
    if not re.fullmatch(r"v\d+\.\d+\.\d+", str(tag)) or not re.fullmatch(r"[0-9a-f]{40}", str(commit)):
        raise Refused(f"{PIN}: the engine must be a tag vX.Y.Z and its full commit")
    if checksum is not None and not re.fullmatch(r"[0-9a-f]{64}", str(checksum)):
        raise Refused(f"{PIN}: the checksum is not a sha256")
    return pin


def asset_url(pin):
    return f"{REPOSITORY}/releases/download/{pin['release_tag']}/{ASSET}"


def read_build(directory):
    """The build record and the generated Swift of a `pack` output DIRECTORY."""
    directory = pathlib.Path(directory)
    try:
        build = json.loads((directory / "build.json").read_text(encoding="utf-8"))
        swift = (directory / GENERATED).read_bytes()
        build["engine"]["tag"], build["engine"]["commit"], build["swift_sha256"]
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise Refused(f"{directory} is not the output of pack: {error}") from error
    if build.get("schema") != BUILD_SCHEMA:
        raise Refused(f"{directory}/build.json has another schema")
    if hashlib.sha256(swift).hexdigest() != build["swift_sha256"]:
        raise Refused(f"{GENERATED} is not the file build.json records")
    return build, swift


def render(template, pin):
    text = template.decode()
    for key, value in (("@ENGINE_TAG@", pin["engine"]["tag"]), ("@URL@", asset_url(pin)),
                       ("@CHECKSUM@", pin["checksum"])):
        if text.count(key) != 1:
            raise Refused(f"Package.swift.in holds {text.count(key)} times {key}, expected once")
        text = text.replace(key, value)
    if "@" in re.sub(r"//.*", "", text):
        raise Refused("Package.swift.in holds a placeholder that is not filled")
    return text.encode()


def staged(revision, generated, root=ROOT):
    """The whole tree of the satellite for REVISION, with the Swift of GENERATED, as {path: bytes}."""
    try:
        commit = git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
    except subprocess.CalledProcessError as error:
        raise Refused(f"{revision} is not a commit of this repository") from error
    pin = read_pin(commit, root)
    if pin["checksum"] is None:
        raise Refused(f"{PIN} pins no checksum at {commit}: record the sha256 of the zip a build packed")
    build, swift = read_build(generated)
    if (build["engine"]["tag"], build["engine"]["commit"]) != (pin["engine"]["tag"], pin["engine"]["commit"]):
        raise Refused(f"the generated Swift comes from {build['engine']['tag']} {build['engine']['commit']}, "
                      f"not the pinned engine {pin['engine']['tag']} {pin['engine']['commit']}")
    package = tree(commit, PACKAGE, root)
    unknown = sorted(set(package) - {*COPIED, PIN, "Package.swift.in"})
    if unknown:
        raise Refused(f"{PACKAGE} holds {unknown}, which the stage does not place")
    files = {"Package.swift": render(package["Package.swift.in"], pin), SOURCES: swift}
    for name in COPIED:
        if name not in package:
            raise Refused(f"{PACKAGE}/{name} is missing at {commit}")
        files[name] = package[name]
    for staged_path, engine_path in FROM_ENGINE.items():
        try:
            files[staged_path] = git("show", f"{pin['engine']['commit']}:{engine_path}", root=root)
        except subprocess.CalledProcessError as error:
            raise Refused(f"{engine_path} is missing at the engine commit {pin['engine']['commit']}") from error
    readme = Satellite("stage-swift-package", SCHEMA, PACKAGE)
    files["README.md"] = readme.readme(files["README.md"].decode(), commit, files).encode()
    if "](../" in files["README.md"].decode():
        raise Refused("README.md still links outside the package")
    record = {"schema": SCHEMA, "engine": {"repository": REPOSITORY, "revision": commit},
              "package": {"version": pin["version"], "engine_tag": pin["engine"]["tag"],
                          "engine_commit": pin["engine"]["commit"], "binary_target": asset_url(pin),
                          "checksum": pin["checksum"]},
              "files": {path: hashlib.sha256(data).hexdigest() for path, data in sorted(files.items())}}
    files["SOURCE.json"] = (json.dumps(record, indent=2) + "\n").encode()
    return files


def stage(revision, generated, out, root=ROOT):
    out = pathlib.Path(out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    files = staged(revision, generated, root)
    for path, data in files.items():
        target = out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return json.loads(files["SOURCE.json"])["engine"]["revision"], len(files)


def verify(directory, generated, root=ROOT):
    directory = pathlib.Path(directory)
    try:
        record = json.loads((directory / "SOURCE.json").read_text(encoding="utf-8"))
        revision = record["engine"]["revision"]
        if record["schema"] != SCHEMA or record["engine"]["repository"] != REPOSITORY:
            raise ValueError("another schema or repository")
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise Refused(f"SOURCE.json is not a stage record: {error}") from error
    expected = staged(revision, generated, root)
    present = {path.relative_to(directory).as_posix(): path for path in directory.rglob("*")
               if path.is_file() and ".git" not in path.relative_to(directory).parts[:1]}
    problems = [f"missing {path}" for path in sorted(set(expected) - set(present))]
    problems += [f"not from the stage: {path}" for path in sorted(set(present) - set(expected))]
    problems += [f"differs from the stage: {path}" for path in sorted(set(expected) & set(present))
                 if present[path].read_bytes() != expected[path]]
    if problems:
        raise Refused("; ".join(problems))
    return revision, len(expected)


# ------------------------------------------------------------------ the zip of the xcframework

def zip_time(epoch):
    """A zip entry's date (DOS time, no zone): EPOCH in UTC, never before 1980."""
    parts = time.gmtime(max(epoch, 315532800))
    return (parts.tm_year, parts.tm_mon, parts.tm_mday, parts.tm_hour, parts.tm_min, parts.tm_sec - parts.tm_sec % 2)


def zip_tree(framework, epoch):
    """Bytes of the zip of the directory FRAMEWORK, under its own name, files sorted, one date."""
    framework = pathlib.Path(framework)
    if framework.name != FRAMEWORK or not framework.is_dir():
        raise Refused(f"{framework} is not a directory named {FRAMEWORK}")
    paths = sorted(framework.rglob("*"))
    links = [path for path in paths if path.is_symlink()]
    if links:
        raise Refused(f"{framework} holds links ({links[0]}): the zip holds regular files only")
    files = [path for path in paths if path.is_file()]
    if not files:
        raise Refused(f"{framework} is empty")
    # SwiftPM puts the headers of a static-library slice on the include path, where a
    # `framework module` looks for them under Headers/ and finds none.
    maps = [path for path in files if path.name == "module.modulemap"]
    if not maps:
        raise Refused(f"{framework} has no module.modulemap")
    for path in maps:
        declaration = path.read_text(encoding="utf-8").lstrip()
        if not declaration.startswith(f"module {MODULE} "):
            raise Refused(f"{path} does not declare the plain module {MODULE}")
    out = io.BytesIO()
    when = zip_time(epoch)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            info = zipfile.ZipInfo(f"{FRAMEWORK}/{path.relative_to(framework).as_posix()}", when)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            info.create_system = 3
            archive.writestr(info, path.read_bytes())
    data = out.getvalue()
    if len(data) > LIMIT:
        raise Refused("the zip exceeds its size limit")
    return data


def pack(framework, swift, engine, out, root=ROOT):
    """Write the zip, the generated Swift and build.json into OUT; return build.json."""
    pin = read_pin("HEAD", root)
    commit = git("rev-parse", "HEAD^{commit}", root=pathlib.Path(engine)).decode().strip()
    if commit != pin["engine"]["commit"]:
        raise Refused(f"the engine checkout is {commit}, not the pinned {pin['engine']['tag']} {pin['engine']['commit']}")
    epoch = int(git("log", "-1", "--format=%ct", commit, root=pathlib.Path(engine)).decode().strip())
    for name in ("Info.plist",):
        if not (pathlib.Path(framework) / name).is_file():
            raise Refused(f"{framework} has no {name}")
    data = zip_tree(framework, epoch)
    source = pathlib.Path(swift).read_bytes()
    if MODULE.encode() not in source or b"public func scan(" not in source:
        raise Refused(f"{swift} is not the Swift UniFFI generates for the engine")
    out = pathlib.Path(out)
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    (out / ASSET).write_bytes(data)
    (out / GENERATED).write_bytes(source)
    sha = hashlib.sha256(data).hexdigest()
    build = {"schema": BUILD_SCHEMA, "engine": {"tag": pin["engine"]["tag"], "commit": commit},
             "asset": {"name": ASSET, "sha256": sha, "size": len(data)},
             "swift_sha256": hashlib.sha256(source).hexdigest(),
             "pinned": pin["checksum"], "reproduced": sha == pin["checksum"],
             "members": sorted(name for name in zipfile.ZipFile(io.BytesIO(data)).namelist())}
    (out / "build.json").write_text(json.dumps(build, indent=2) + "\n", encoding="utf-8")
    return build


def gate(ref, root=ROOT):
    """Refuse REF unless it is the pinned release tag, with a pinned checksum."""
    pin = read_pin("HEAD", root)
    match = TAG.fullmatch(ref or "")
    if not match:
        raise Refused(f"{ref!r} is not a tag refs/tags/swift-vX.Y.Z")
    if match[1] != pin["release_tag"]:
        raise Refused(f"{match[1]} is not the release tag {pin['release_tag']} that {PIN} pins")
    if pin["checksum"] is None:
        raise Refused(f"{PIN} pins no checksum: there is no zip to attach")
    return pin


# ------------------------------------------------------------------ self-test

def self_test():
    failures = []

    def check(label, passed, detail=""):
        print(("ok    " if passed else "FAIL  ") + label + (f": {detail}" if detail and not passed else ""))
        if not passed:
            failures.append(label)

    def refused(label, action, words):
        try:
            action()
        except Refused as error:
            check(label, words in str(error), str(error))
        else:
            check(label, False, "accepted")

    with tempfile.TemporaryDirectory(prefix="swift-stage-self-test-") as temporary:
        box = pathlib.Path(temporary)
        repo = box / "repo"
        repo.mkdir()
        identity = ("-c", "user.email=self-test@example.com", "-c", "user.name=self-test", "-c", "commit.gpgsign=false")
        run = lambda *args: subprocess.run(["git", *identity, "-C", str(repo), *args], check=True, capture_output=True)
        run("init", "-q", "-b", "main")
        (repo / "LICENSE").write_text("engine license\n")
        (repo / "crates/qrcode-ai-scanner").mkdir(parents=True)
        (repo / "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0").write_text("Apache License\n")
        (repo / "crates/qrcode-ai-scanner/THIRD-PARTY.md").write_text("rxing\n")
        run("add", "-A")
        run("commit", "-q", "-m", "engine")
        engine = run("rev-parse", "HEAD").stdout.decode().strip()
        folder = repo / PACKAGE
        folder.mkdir(parents=True)
        (folder / "Package.swift.in").write_bytes((ROOT / PACKAGE / "Package.swift.in").read_bytes())
        (folder / "README.md").write_text("# Swift\n\nSee [the engine](../../../README.md) and [notes](LICENSE-NOTES.md).\n")
        (folder / "LICENSE-NOTES.md").write_text("notes\n")
        (folder / ".gitignore").write_text(".build/\n")
        pin = {"schema": "qrscan-swift-pin/1", "version": "1.2.3", "engine": {"tag": "v1.2.3", "commit": engine},
               "release_tag": "swift-v1.2.3", "checksum": "a" * 64}
        (folder / PIN).write_text(json.dumps(pin))
        run("add", "-A")
        run("commit", "-q", "-m", "package")
        swift = b"import qrcode_ai_scanner_uniffiFFI\npublic func scan(image: Data) {}\n"
        generated = box / "generated"
        generated.mkdir()
        (generated / GENERATED).write_bytes(swift)
        build = {"schema": BUILD_SCHEMA, "engine": {"tag": "v1.2.3", "commit": engine},
                 "swift_sha256": hashlib.sha256(swift).hexdigest()}
        (generated / "build.json").write_text(json.dumps(build))

        revision, count = stage("HEAD", generated, box / "good", repo)
        good = box / "good"
        manifest = (good / "Package.swift").read_text()
        check("the stage writes the tree", count == 9 and (good / SOURCES).read_bytes() == swift)
        check("Package.swift pins the release asset and its checksum",
              f'url: "{REPOSITORY}/releases/download/swift-v1.2.3/{ASSET}"' in manifest and
              f'checksum: "{"a" * 64}"' in manifest and manifest.startswith("// swift-tools-version:5.9\n"))
        check("the license comes from the engine commit", (good / "LICENSE").read_text() == "engine license\n")
        check("README links into the engine become absolute",
              f"]({REPOSITORY}/blob/{revision}/README.md)" in (good / "README.md").read_text() and
              "](LICENSE-NOTES.md)" in (good / "README.md").read_text())
        check("a fresh stage verifies as itself", verify(good, generated, repo) == (revision, count))
        refused("a second stage into the same directory", lambda: stage("HEAD", generated, good, repo), "not empty")
        edited = box / "edited"
        edited.mkdir()
        for path in good.rglob("*"):
            if path.is_file():
                (edited / path.relative_to(good)).parent.mkdir(parents=True, exist_ok=True)
                (edited / path.relative_to(good)).write_bytes(path.read_bytes())
        (edited / SOURCES).write_bytes(swift + b"// edited by hand\n")
        refused("a generated file edited by hand", lambda: verify(edited, generated, repo), f"differs from the stage: {SOURCES}")
        (edited / SOURCES).write_bytes(swift)
        (edited / "extra.swift").write_text("// added\n")
        refused("a file added by hand", lambda: verify(edited, generated, repo), "not from the stage: extra.swift")
        other = box / "other"
        other.mkdir()
        (other / GENERATED).write_bytes(swift)
        (other / "build.json").write_text(json.dumps(dict(build, engine={"tag": "v1.2.4", "commit": engine})))
        refused("Swift generated from another engine", lambda: stage("HEAD", other, box / "o", repo), "not the pinned engine")
        (other / "build.json").write_text(json.dumps(build))
        (other / GENERATED).write_bytes(swift + b"//\n")
        refused("Swift that build.json does not record", lambda: stage("HEAD", other, box / "p", repo), "not the file")
        refused("a revision that does not exist",
                lambda: stage("0" * 40, generated, box / "none", repo), "is not a commit")

        for label, change, words in (
                ("an unpinned checksum", {"checksum": None}, "pins no checksum"),
                ("a release tag of another version", {"release_tag": "swift-v1.2.4"}, "is not swift-v"),
                ("an engine named by branch", {"engine": {"tag": "main", "commit": engine}}, "tag vX.Y.Z")):
            (folder / PIN).write_text(json.dumps(dict(pin, **change)))
            run("commit", "-q", "-am", label)
            refused(label + " is refused", lambda: stage("HEAD", generated, box / label.replace(" ", "-"), repo), words)
        (folder / PIN).write_text(json.dumps(pin))
        (folder / "notes.txt").write_text("stray\n")
        run("add", "-A")
        run("commit", "-q", "-m", "stray")
        refused("a file the stage does not place", lambda: stage("HEAD", generated, box / "stray", repo), "does not place")
        (folder / "notes.txt").unlink()
        run("commit", "-q", "-am", "clean")

        check("gate accepts the pinned release tag", gate("refs/tags/swift-v1.2.3", repo)["version"] == "1.2.3")
        refused("gate refuses the engine's tag family", lambda: gate("refs/tags/v1.2.3", repo), "not a tag")
        refused("gate refuses another version", lambda: gate("refs/tags/swift-v1.2.4", repo), "not the release tag")
        refused("gate refuses a branch", lambda: gate("refs/heads/main", repo), "not a tag")

        framework = box / "x" / FRAMEWORK
        (framework / "ios-arm64").mkdir(parents=True)
        (framework / "Info.plist").write_text("<plist/>")
        (framework / "ios-arm64" / "libqrcode_ai_scanner_uniffi.a").write_bytes(b"!<arch>\n")
        refused("an xcframework without a module map", lambda: zip_tree(framework, 1793815385), "no module.modulemap")
        (framework / "ios-arm64" / "Headers").mkdir()
        modulemap = framework / "ios-arm64" / "Headers" / "module.modulemap"
        modulemap.write_text(f'framework module {MODULE} {{\n    header "{MODULE}.h"\n}}\n')
        refused("a framework module map", lambda: zip_tree(framework, 1793815385), "plain module")
        modulemap.write_text(f'module {MODULE} {{\n    header "{MODULE}.h"\n}}\n')
        first = zip_tree(framework, 1793815385)
        (framework / "ios-arm64" / "libqrcode_ai_scanner_uniffi.a").touch()
        check("the zip does not depend on file dates", zip_tree(framework, 1793815385) == first)
        names = zipfile.ZipFile(io.BytesIO(first)).namelist()
        check("the zip holds the xcframework at its root, files only",
              names == [f"{FRAMEWORK}/Info.plist", f"{FRAMEWORK}/ios-arm64/Headers/module.modulemap",
                        f"{FRAMEWORK}/ios-arm64/libqrcode_ai_scanner_uniffi.a"])
        (framework / "link").symlink_to("Info.plist")
        refused("a link in the xcframework", lambda: zip_tree(framework, 1793815385), "holds links")
    print(f"self-test: {'FAILED ' + str(len(failures)) if failures else 'all passed'}")
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("pack")
    one.add_argument("framework", type=pathlib.Path)
    one.add_argument("--swift", type=pathlib.Path, required=True)
    one.add_argument("--engine", type=pathlib.Path, required=True)
    one.add_argument("--out", type=pathlib.Path, required=True)
    two = commands.add_parser("stage")
    two.add_argument("--generated", type=pathlib.Path, required=True)
    two.add_argument("--revision", default="HEAD")
    two.add_argument("--out", type=pathlib.Path, required=True)
    three = commands.add_parser("verify")
    three.add_argument("directory", type=pathlib.Path)
    three.add_argument("--generated", type=pathlib.Path, required=True)
    four = commands.add_parser("gate")
    four.add_argument("--ref", required=True)
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    try:
        if args.command == "pack":
            build = pack(args.framework, args.swift, args.engine, args.out)
            print(json.dumps({key: build[key] for key in ("engine", "asset", "pinned", "reproduced")}, indent=2))
        elif args.command == "stage":
            revision, count = stage(args.revision, args.generated, args.out)
            print(f"staged {count} files from {revision} into {args.out}")
        elif args.command == "verify":
            revision, count = verify(args.directory, args.generated)
            print(f"ok    {count} files equal the stage of {revision}")
        elif args.command == "gate":
            pin = gate(args.ref)
            print(f"ok    {pin['release_tag']}: the Swift package {pin['version']} of engine {pin['engine']['tag']}")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"stage-swift-package: {error}", file=sys.stderr)
        return 1
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"stage-swift-package: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
