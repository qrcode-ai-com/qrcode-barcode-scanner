#!/usr/bin/env python3
"""Build the MCP Bundle (.mcpb) of the published MCP server 0.3.1, the same bytes on every host.

  build-mcpb-bundle.py build --out DIR [--revision REV] [--cache DIR]
  build-mcpb-bundle.py verify FILE [--revision REV] [--cache DIR]
  build-mcpb-bundle.py gate --ref REF
  build-mcpb-bundle.py --self-test

An MCP Bundle is a ZIP archive with a manifest.json at its root, which MCPB hosts such as Claude
Desktop install in one step (https://github.com/modelcontextprotocol/mcpb). This one runs the
published npm package @qrcode-ai-com/qrcode-barcode-scanner-mcp 0.3.1 with its dependencies, the
scanner engine 0.11.0 and its six native platform packages included: it installs nothing and
needs no network. Nothing is compiled.

`build` reads distribution/mcpb at REV (HEAD by default) from git, never from the working tree:
manifest.json, package.json, package-lock.json and server/launch.mjs. Every npm package of the
lock is downloaded from its `resolved` address and must match its `integrity` (SHA-512): npm ci
would install only the host's native package, the bundle carries all six. Each archive is
extracted unchanged under node_modules/; a link, a device or a path leaving the package is
refused. Two notice files of the engine's rxing-derived source come from tag v0.11.0, pinned by
SHA-256. The bundle adds icon.png (the QR Code AI logo of the VS Code extension), LICENSE.md,
SOURCE.md and licenses/LICENSE-MIT (this repository's license at REV, for the bundle's own files).

The archive is the same bytes for the same REV on any host and in any time zone: entries sorted,
no directory entries, modes 0644 or 0755, and every date the commit time of REV (or
SOURCE_DATE_EPOCH when set), converted in UTC, never in local time. Deflate comes from the zlib
Python links; the receipt records its version. DIR receives the .mcpb, its SHA256SUMS line and
build-receipt.json. --cache keeps the downloads, by digest, for a later run.

`verify` builds REV again in a temporary directory and requires the same bytes as FILE: the
artifact another job built is the build of that commit. `gate` accepts only the tag
refs/tags/mcpb-v<version of the manifest at HEAD>. Stdlib only. Exit 0 when the step passes, 1
when it fails, 2 for usage.
"""
import argparse
import base64
import dataclasses
import hashlib
import io
import json
import os
import pathlib
import posixpath
import re
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
import zipfile
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
PACKAGE = "distribution/mcpb"
SCHEMA = "qrscan-mcpb-build/1"
NAME = "qrcode-barcode-scanner"
DISPLAY_NAME = "QR Code & Barcode Scanner"
VERSION = "0.3.1"
TAG_PREFIX = "refs/tags/mcpb-v"
BUNDLE = f"{NAME}-{VERSION}.mcpb"
SUMS = f"{NAME}-mcpb-{VERSION}-SHA256SUMS"
REGISTRY = "https://registry.npmjs.org/"
ADAPTER = "@qrcode-ai-com/qrcode-barcode-scanner-mcp"
ADAPTER_INTEGRITY = "sha512-JLPa1AqFpygcrt/zKMQwhIfD67U9j1DUPnKdBmYYwo8yQoZmwNtd4FH80yllFbONKwxcjpReqLiVrWilWgeEng=="
ADAPTER_COMMIT = "365585f9db955fd41a6101a3240c4f63436434a3"  # tag agents-v0.3.1
ENGINE = "@qrcode-ai-com/qrcode-barcode-scanner"
ENGINE_VERSION = "0.11.0"
ENGINE_COMMIT = "176ac96ef16ee330dbfc6ada10327d0b4e23a8b2"  # tag v0.11.0
NATIVES = ("darwin-arm64", "darwin-x64", "linux-arm64-gnu", "linux-x64-gnu", "linux-x64-musl", "win32-x64-msvc")
AGPL, APACHE, MIT = "AGPL-3.0-or-later", "Apache-2.0", "MIT"
# Every package the bundle holds: (version, license). The lock may hold no other.
LOCKED = {
    ADAPTER: (VERSION, AGPL),
    ENGINE: (ENGINE_VERSION, AGPL),
    **{f"{ENGINE}-{native}": (ENGINE_VERSION, AGPL) for native in NATIVES},
    "@modelcontextprotocol/server": ("2.3.1", APACHE),
    "@modelcontextprotocol/core": ("2.3.1", APACHE),
    "zod": ("4.6.7", MIT),
}
SOURCES = ("manifest.json", "package.json", "package-lock.json", "server/launch.mjs")
ICON_SOURCE = "integrations/vscode/images/icon.png"
LAUNCHER = "server/launch.mjs"
SERVER_CONFIG = {
    "type": "node",
    "entry_point": LAUNCHER,
    "mcp_config": {"command": "node", "args": ["${__dirname}/" + LAUNCHER, "${user_config.allowed_directories}"]},
}
TOOLS = ("scan_image", "scan_file")
PLATFORMS = ["darwin", "win32", "linux"]
# The engine's notices for the reader parts derived from rxing (Apache-2.0), at tag v0.11.0.
RAW = f"https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/{ENGINE_COMMIT}/"
NOTICES = (
    ("licenses/engine-0.11.0/THIRD-PARTY.md", RAW + "crates/qrcode-ai-scanner/THIRD-PARTY.md",
     "sha256-e3c3e5d7b5f2e2d880fa39216658df0f84f0de297dd211b65d38373e8e7c6a4a"),
    ("licenses/engine-0.11.0/LICENSE-APACHE-2.0", RAW + "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
     "sha256-865b180617725f20be71aa305e82efaa8e56b3c6936d68089bc63cf91cb23087"),
)
DOS_EPOCH = 315532800  # 1980-01-01T00:00:00Z, the earliest date a ZIP entry holds


class Refused(Exception):
    """The bundle cannot be built from these inputs, or a file is not the build of its commit."""


@dataclasses.dataclass
class Inputs:
    """What one build reads besides the registry: the commit, its time and the files it bundles."""
    commit: str
    epoch: int
    epoch_source: str
    files: dict  # bundle path -> (bytes, mode)


def git(*arguments, root=ROOT):
    return subprocess.run(["git", "-C", str(root), *arguments], capture_output=True, check=True).stdout


def blob(commit, path, root=ROOT):
    """(bytes, mode) of a regular file at COMMIT; a link or a missing file is refused."""
    listing = git("ls-tree", "-z", commit, "--", path, root=root).decode()
    entries = [entry for entry in listing.split("\0") if entry]
    if len(entries) != 1:
        raise Refused(f"{path} is missing at {commit}")
    meta, _ = entries[0].split("\t", 1)
    mode, kind, _ = meta.split(" ")
    if kind != "blob" or mode not in ("100644", "100755"):
        raise Refused(f"{path} is not a regular file at {commit} (mode {mode})")
    return git("show", f"{commit}:{path}", root=root), 0o755 if mode == "100755" else 0o644


def inputs_at(revision, root=ROOT):
    try:
        commit = git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
    except subprocess.CalledProcessError as error:
        raise Refused(f"{revision} is not a commit of this repository") from error
    epoch, source = int(git("show", "-s", "--format=%ct", commit, root=root).decode()), "commit time"
    if os.environ.get("SOURCE_DATE_EPOCH"):
        if not re.fullmatch(r"\d+", os.environ["SOURCE_DATE_EPOCH"]):
            raise Refused("SOURCE_DATE_EPOCH must be a number of seconds")
        epoch, source = int(os.environ["SOURCE_DATE_EPOCH"]), "SOURCE_DATE_EPOCH"
    files = {path: blob(commit, f"{PACKAGE}/{path}", root) for path in SOURCES}
    files["icon.png"] = blob(commit, ICON_SOURCE, root)
    files["licenses/LICENSE-MIT"] = blob(commit, "LICENSE", root)
    return Inputs(commit, epoch, source, files)


def digest_of(data, integrity):
    algorithm, _, expected = integrity.partition("-")
    if algorithm == "sha512":
        return "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode()
    if algorithm == "sha256":
        return "sha256-" + hashlib.sha256(data).hexdigest()
    raise Refused(f"unsupported digest {integrity[:16]}…")


def downloader(cache=None):
    """fetch(url, integrity) -> bytes: from the cache when the digest matches, else downloaded."""
    def fetch(url, integrity):
        name = hashlib.sha256(integrity.encode()).hexdigest()
        if cache is not None:
            kept = pathlib.Path(cache) / name
            if kept.is_file() and digest_of(kept.read_bytes(), integrity) == integrity:
                return kept.read_bytes()
        if not url.startswith("https://"):
            raise Refused(f"{url} is not an https address")
        error = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url, timeout=120) as response:
                    data = response.read()
                break
            except OSError as failure:
                error = failure
                time.sleep(2 * (attempt + 1))
        else:
            raise Refused(f"cannot download {url}: {error}")
        if digest_of(data, integrity) != integrity:
            raise Refused(f"{url} does not match its pinned digest {integrity[:24]}…")
        if cache is not None:
            pathlib.Path(cache).mkdir(parents=True, exist_ok=True)
            (pathlib.Path(cache) / name).write_bytes(data)
        return data
    return fetch


def tarball_address(name, version):
    return f"{REGISTRY}{name}/-/{name.rsplit('/', 1)[-1]}-{version}.tgz"


def check_lock(files, adapter_integrity):
    """The lock pins exactly LOCKED from the npm registry, the adapter at its published bytes."""
    try:
        package = json.loads(files["package.json"][0])
        lock = json.loads(files["package-lock.json"][0])
    except (KeyError, ValueError) as error:
        raise Refused(f"package.json or package-lock.json is missing or not JSON: {error}") from error
    if package.get("dependencies") != {ADAPTER: VERSION} or package.get("version") != VERSION:
        raise Refused(f"package.json must be version {VERSION} and depend on {ADAPTER} {VERSION} exactly, on nothing else")
    root = lock.get("packages", {}).get("", {})
    if lock.get("lockfileVersion") != 3 or root.get("dependencies") != {ADAPTER: VERSION} \
            or root.get("version") != VERSION or root.get("name") != package.get("name"):
        raise Refused("package-lock.json does not lock package.json (lockfile version 3, same name, version and dependency)")
    entries = {key: value for key, value in lock["packages"].items() if key}
    expected = {f"node_modules/{name}" for name in LOCKED}
    if set(entries) != expected:
        missing, extra = sorted(expected - set(entries)), sorted(set(entries) - expected)
        raise Refused(f"package-lock.json packages differ from the bundle's: missing {missing}, extra {extra}")
    packages = []
    for name, (version, license_id) in sorted(LOCKED.items()):
        entry = entries[f"node_modules/{name}"]
        if entry.get("version") != version or entry.get("license") != license_id:
            raise Refused(f"{name} is locked at {entry.get('version')} ({entry.get('license')}), not {version} ({license_id})")
        if entry.get("resolved") != tarball_address(name, version):
            raise Refused(f"{name} resolves to {entry.get('resolved')}, not the registry's archive")
        if not re.fullmatch(r"sha512-[A-Za-z0-9+/]{86}==", str(entry.get("integrity"))):
            raise Refused(f"{name} has no SHA-512 integrity")
        packages.append({"name": name, "version": version, "license": license_id,
                         "resolved": entry["resolved"], "integrity": entry["integrity"]})
    if entries[f"node_modules/{ADAPTER}"]["integrity"] != adapter_integrity:
        raise Refused(f"package-lock.json does not pin the published {ADAPTER} {VERSION}")
    return packages


def license_expression(packages):
    """The bundle's SPDX expression: every package's license and MIT for the bundle's own files."""
    return " AND ".join(sorted({package["license"] for package in packages} | {MIT}))


def check_manifest(files, adapter, packages):
    """The manifest as an MCPB host and `mcpb validate` read it, bound to the adapter it runs."""
    try:
        manifest = json.loads(files["manifest.json"][0])
    except (KeyError, ValueError) as error:
        raise Refused(f"manifest.json is missing or not JSON: {error}") from error
    want = {"manifest_version": "0.3", "name": NAME, "display_name": DISPLAY_NAME, "version": VERSION,
            "icon": "icon.png", "license": license_expression(packages)}
    for key, value in want.items():
        if manifest.get(key) != value:
            raise Refused(f"manifest.json {key} is {manifest.get(key)!r}, not {value!r}")
    if manifest.get("server") != SERVER_CONFIG:
        raise Refused(f"manifest.json server must be exactly {json.dumps(SERVER_CONFIG)}: the launcher turns the "
                      "folder arguments into QRSCAN_MCP_ALLOWED_DIRECTORIES")
    tools = manifest.get("tools")
    if not isinstance(tools, list) or [tool.get("name") for tool in tools] != list(TOOLS) or \
            any(set(tool) != {"name", "description"} or not tool["description"] for tool in tools):
        raise Refused(f"manifest.json tools must be {list(TOOLS)}, each with a name and a description only "
                      "(mcpb validate refuses an inputSchema)")
    option = (manifest.get("user_config") or {}).get("allowed_directories")
    if set(manifest.get("user_config") or {}) != {"allowed_directories"} or not isinstance(option, dict) or \
            option.get("type") != "directory" or option.get("multiple") is not True or \
            option.get("required") is not False or "default" in option:
        raise Refused("manifest.json user_config must hold only allowed_directories: directory, multiple, not "
                      "required, no default (no folder is readable until the user chooses one)")
    runtime = adapter.get("engines", {}).get("node")
    if manifest.get("compatibility") != {"platforms": PLATFORMS, "runtimes": {"node": runtime}}:
        raise Refused(f"manifest.json compatibility must be platforms {PLATFORMS} and the adapter's Node range {runtime!r}")
    return manifest


def members(name, data):
    """{path below the package: (bytes, mode)} of an npm archive; anything but a regular file inside
    package/ is refused."""
    found, folded = {}, set()
    try:
        archive = tarfile.open(fileobj=io.BytesIO(data), mode="r:gz")
    except tarfile.TarError as error:
        raise Refused(f"{name}: not a gzip tar archive: {error}") from error
    with archive:
        for member in archive.getmembers():
            if member.isdir():
                continue
            if not member.isfile():
                raise Refused(f"{name}: {member.name} is not a regular file (a link or a device is not bundled)")
            path = member.name
            normal = posixpath.normpath(path)
            if "\\" in path or normal != path or not path.startswith("package/") or ".." in path.split("/"):
                raise Refused(f"{name}: {path} is outside package/")
            inner = path[len("package/"):]
            if inner in found or inner.lower() in folded:
                raise Refused(f"{name}: {inner} appears twice (or twice up to letter case)")
            folded.add(inner.lower())
            content = archive.extractfile(member).read()
            found[inner] = (content, 0o755 if member.mode & 0o111 else 0o644)
    if "package.json" not in found:
        raise Refused(f"{name}: the archive holds no package.json")
    return found


def compose(inputs, fetch, adapter_integrity=ADAPTER_INTEGRITY, notices=NOTICES):
    """(tree, packages, manifest): every bundle path with its bytes and mode."""
    packages = check_lock(inputs.files, adapter_integrity)
    tree = {path: inputs.files[path] for path in (*SOURCES, "icon.png", "licenses/LICENSE-MIT")}
    if tree["icon.png"][0][:8] != b"\x89PNG\r\n\x1a\n":
        raise Refused(f"{ICON_SOURCE} is not a PNG file")
    manifests = {}
    for package in packages:
        files = members(package["name"], fetch(package["resolved"], package["integrity"]))
        published = json.loads(files["package.json"][0])
        if (published.get("name"), published.get("version"), published.get("license")) != \
                (package["name"], package["version"], package["license"]):
            raise Refused(f"{package['name']}: its package.json is not {package['version']} ({package['license']})")
        texts = sorted(path for path in files if re.fullmatch(r"(?i)licen[cs]e(\.(md|txt))?", path))
        if not texts:
            raise Refused(f"{package['name']}: the archive carries no LICENSE file")
        package["license_file"] = f"node_modules/{package['name']}/{texts[0]}"
        manifests[package["name"]] = published
        for path, entry in files.items():
            tree[f"node_modules/{package['name']}/{path}"] = entry
    adapter, engine = manifests[ADAPTER], manifests[ENGINE]
    if adapter.get("bin") != {"qrscan-mcp": "src/cli.mjs"} or f"node_modules/{ADAPTER}/src/cli.mjs" not in tree:
        raise Refused(f"{ADAPTER} does not start from src/cli.mjs, which the launcher imports")
    natives = {f"{ENGINE}-{native}": ENGINE_VERSION for native in NATIVES}
    if engine.get("optionalDependencies") != natives:
        raise Refused(f"{ENGINE} selects other native packages than the six the bundle carries")
    for native in NATIVES:
        if f"node_modules/{ENGINE}-{native}/qrcode-barcode-scanner.{native}.node" not in tree:
            raise Refused(f"{ENGINE}-{native} holds no qrcode-barcode-scanner.{native}.node")
    manifest = check_manifest(inputs.files, adapter, packages)
    for path, url, integrity in notices:
        tree[path] = (fetch(url, integrity), 0o644)
    tree["LICENSE.md"] = (license_text(packages, manifest).encode(), 0o644)
    tree["SOURCE.md"] = (source_text(inputs.commit, packages).encode(), 0o644)
    folded = {}
    for path in tree:
        if path.lower() in folded:
            raise Refused(f"{path} and {folded[path.lower()]} differ only by letter case")
        folded[path.lower()] = path
    return tree, packages, manifest


def license_text(packages, manifest):
    rows = "\n".join(f"| `{package['name']}` | {package['version']} | {package['license']} | "
                     f"`{package['license_file']}` |" for package in packages)
    return f"""# Licenses of this bundle

This MCP Bundle holds published npm packages, extracted without change, and a few files of its own.
Each part keeps its own license. The bundle as a whole is distributed under all of them:
`{manifest['license']}`.

| Package | Version | License | License text |
| --- | --- | --- | --- |
{rows}

The bundle's own files, `manifest.json`, `package.json`, `package-lock.json`, `server/launch.mjs`,
`LICENSE.md` and `SOURCE.md`, are licensed MIT: `licenses/LICENSE-MIT`. `icon.png` is the QR Code AI
logo; no license of this bundle grants a trademark right.

The MCP server and the scanner engine are licensed AGPL-3.0-or-later in these published versions.
`SOURCE.md` names their corresponding source.

The native scanner builds hold two reader parts derived from rxing 0.9.3, a Rust port of ZXing,
which keep their Apache-2.0 notices: `licenses/engine-0.11.0/THIRD-PARTY.md` describes them and
`licenses/engine-0.11.0/LICENSE-APACHE-2.0` is their license. Both files come from tag v0.11.0 of
the scanner repository. The native builds also link Rust crates under their own licenses;
`Cargo.lock` at that tag names each crate and its version.
"""


def source_text(commit, packages):
    rows = "\n".join(f"| `{package['name']}` | {package['version']} | `{package['integrity']}` |"
                     for package in packages)
    return f"""# Source of this bundle

Built by `scripts/build-mcpb-bundle.py` from commit {commit} of
{REPOSITORY}, with the files of `{PACKAGE}` at that commit.

Corresponding source of the AGPL-3.0-or-later parts:

- MCP server {VERSION}: tag `agents-v{VERSION}`, commit {ADAPTER_COMMIT}, folder `integrations/mcp`.
  The JavaScript in `node_modules/{ADAPTER}` is that source as npm publishes it.
- Scanner engine {ENGINE_VERSION} and its six native builds: tag `v{ENGINE_VERSION}`, commit {ENGINE_COMMIT},
  folders `crates/qrcode-ai-scanner` and `crates/qrcode-ai-scanner-node`.

Every package under `node_modules` is the npm registry's archive of that version, extracted without
change. `package-lock.json` gives its address; its SHA-512:

| Package | Version | SHA-512 |
| --- | --- | --- |
{rows}
"""


def archive_bytes(tree, epoch):
    """The ZIP of TREE: sorted entries, no directory entries, one UTC date, fixed modes."""
    stamp = time.gmtime(max(epoch, DOS_EPOCH))[:6]
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for path in sorted(tree, key=lambda name: name.encode()):
            data, mode = tree[path]
            info = zipfile.ZipInfo(path, date_time=stamp)
            info.create_system = 3  # Unix, so the mode below is read
            info.external_attr = (0o100000 | mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buffer.getvalue()


def build(inputs, fetch, out=None, **options):
    """(bundle bytes, receipt); with OUT, also writes the bundle, its checksum line and the receipt."""
    tree, packages, _ = compose(inputs, fetch, **options)
    data = archive_bytes(tree, inputs.epoch)
    digest = hashlib.sha256(data).hexdigest()
    receipt = {
        "schema": SCHEMA,
        "bundle": {"file": BUNDLE, "size": len(data), "sha256": digest, "entries": len(tree)},
        "source": {"repository": REPOSITORY, "revision": inputs.commit},
        "source_date_epoch": inputs.epoch,
        "epoch_source": inputs.epoch_source,
        "packer": {"python": sys.version.split()[0], "zlib": zlib.ZLIB_RUNTIME_VERSION},
        "packages": packages,
        "notices": [{"path": path, "url": url, "digest": integrity} for path, url, integrity in NOTICES],
    }
    if out is not None:
        out = pathlib.Path(out)
        if out.exists() and any(out.iterdir()):
            raise Refused(f"{out} is not empty")
        out.mkdir(parents=True, exist_ok=True)
        (out / BUNDLE).write_bytes(data)
        (out / SUMS).write_text(f"{digest}  {BUNDLE}\n")
        (out / "build-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    return data, receipt


def verify(path, inputs, fetch):
    data = pathlib.Path(path).read_bytes()
    expected, receipt = build(inputs, fetch)
    if data != expected:
        raise Refused(f"{path} (sha256 {hashlib.sha256(data).hexdigest()}) is not the build of {inputs.commit} "
                      f"(sha256 {receipt['bundle']['sha256']})")
    return receipt


def gate(ref, root=ROOT):
    """The tag a bundle is attested on names the version of the manifest at HEAD."""
    manifest = json.loads(blob("HEAD", f"{PACKAGE}/manifest.json", root)[0])
    expected = TAG_PREFIX + VERSION
    if manifest.get("version") != VERSION or ref != expected:
        raise Refused(f"{ref} is not {expected}, the tag of the bundle version {manifest.get('version')}")
    return expected


# ---------------------------------------------------------------------------------------- self-test

def tarball(files, links=()):
    """A gzip npm archive of {path below package/: bytes}, with optional symbolic links."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path, data in files.items():
            info = tarfile.TarInfo(path if path.startswith(("/", "..")) else f"package/{path}")
            info.size, info.mode = len(data), 0o755 if path.endswith(".mjs") and "cli" in path else 0o644
            archive.addfile(info, io.BytesIO(data))
        for path, target in links:
            info = tarfile.TarInfo(f"package/{path}")
            info.type, info.linkname = tarfile.SYMTYPE, target
            archive.addfile(info)
    return buffer.getvalue()


def synthetic(real):
    """(inputs, served, adapter integrity, notices): the committed bundle files over small fake archives."""
    served, packages = {}, {}
    for name, (version, license_id) in LOCKED.items():
        meta = {"name": name, "version": version, "license": license_id}
        files = {"LICENSE": f"{license_id} text\n".encode()}
        if name == ADAPTER:
            meta.update(bin={"qrscan-mcp": "src/cli.mjs"}, engines={"node": "^22.19.0 || >=24.0.0"})
            files["src/cli.mjs"] = b"// cli\n"
        if name == ENGINE:
            meta["optionalDependencies"] = {f"{ENGINE}-{native}": ENGINE_VERSION for native in NATIVES}
        for native in NATIVES:
            if name == f"{ENGINE}-{native}":
                files[f"qrcode-barcode-scanner.{native}.node"] = native.encode()
        files["package.json"] = json.dumps(meta).encode()
        packages[name] = files
    lock = json.loads(real.files["package-lock.json"][0])
    for name, files in packages.items():
        data = tarball(files)
        integrity = digest_of(data, "sha512-")
        served[tarball_address(name, LOCKED[name][0])] = data
        lock["packages"][f"node_modules/{name}"]["integrity"] = integrity
    notices = []
    for path, url, _ in NOTICES:
        served[url] = f"notice {path}\n".encode()
        notices.append((path, url, digest_of(served[url], "sha256-")))
    files = dict(real.files, **{"package-lock.json": (json.dumps(lock).encode(), 0o644)})
    adapter = lock["packages"][f"node_modules/{ADAPTER}"]["integrity"]
    return Inputs(real.commit, 1_700_000_000, "self-test", files), served, adapter, tuple(notices)


def self_test():
    failures, refusals = [], []

    def refused(name, action, needle):
        refusals.append(name)
        try:
            action()
        except Refused as error:
            if needle not in str(error):
                failures.append(f"{name}: refused with {error!s}, expected {needle!r}")
        else:
            failures.append(f"{name}: accepted")

    real = inputs_at("HEAD")
    try:
        real_packages = check_lock(real.files, ADAPTER_INTEGRITY)
        if license_expression(real_packages) != "AGPL-3.0-or-later AND Apache-2.0 AND MIT":
            failures.append(f"the committed lock gives the license {license_expression(real_packages)}")
    except Refused as error:
        failures.append(f"the committed package.json and lock were refused: {error}")
    inputs, served, adapter, notices = synthetic(real)

    def fetch(url, integrity):
        if url not in served or digest_of(served[url], integrity) != integrity:
            raise Refused(f"{url} does not match its pinned digest")
        return served[url]

    def attempt(changed=None, serve=None, **files):
        given = dataclasses.replace(inputs, files=dict(inputs.files, **files))
        return build(given, serve or fetch, adapter_integrity=adapter, notices=changed or notices)

    first, receipt = attempt()
    zone = os.environ.get("TZ")
    try:
        for name in ("Etc/GMT-4", "America/Los_Angeles"):
            os.environ["TZ"] = name
            time.tzset()
            if attempt()[0] != first:
                failures.append(f"the bundle differs in the time zone {name}")
    finally:
        if zone is None:
            os.environ.pop("TZ", None)
        else:
            os.environ["TZ"] = zone
        time.tzset()
    with zipfile.ZipFile(io.BytesIO(first)) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if names != sorted(names, key=lambda name: name.encode()) or any(name.endswith("/") for name in names):
            failures.append("entries are not sorted, or a directory entry is present")
        if {info.date_time for info in infos} != {time.gmtime(1_700_000_000)[:6]}:
            failures.append(f"entry dates are not the epoch in UTC: {sorted({info.date_time for info in infos})}")
        modes = {info.filename: info.external_attr >> 16 for info in infos}
        if modes[f"node_modules/{ADAPTER}/src/cli.mjs"] != 0o100755 or modes["manifest.json"] != 0o100644:
            failures.append("file modes are not kept as 0755 and 0644")
        for required in ("manifest.json", LAUNCHER, "icon.png", "LICENSE.md", "SOURCE.md", "licenses/LICENSE-MIT",
                         *(path for path, _, _ in NOTICES),
                         *(f"node_modules/{ENGINE}-{n}/qrcode-barcode-scanner.{n}.node" for n in NATIVES)):
            if required not in names:
                failures.append(f"the bundle lacks {required}")
        if archive.read("manifest.json") != inputs.files["manifest.json"][0]:
            failures.append("manifest.json is not the committed file byte for byte")
        if inputs.commit not in archive.read("SOURCE.md").decode():
            failures.append("SOURCE.md does not name the commit")
    if receipt["bundle"]["sha256"] != hashlib.sha256(first).hexdigest():
        failures.append("the receipt does not record the bundle's sha256")
    with tempfile.TemporaryDirectory() as temporary:
        box = pathlib.Path(temporary)
        good = box / "good.mcpb"
        good.write_bytes(first)
        try:
            _verify_synthetic(good, inputs, fetch, adapter, notices)
        except Refused as error:
            failures.append(f"verify refused a fresh build: {error}")
        changed = bytearray(first)
        changed[len(changed) // 2] ^= 1
        (box / "changed.mcpb").write_bytes(bytes(changed))
        refused("verify of a changed byte",
                lambda: _verify_synthetic(box / "changed.mcpb", inputs, fetch, adapter, notices), "is not the build of")
        build(inputs, fetch, out=box / "out", adapter_integrity=adapter, notices=notices)
        if sorted(path.name for path in (box / "out").iterdir()) != sorted([BUNDLE, SUMS, "build-receipt.json"]):
            failures.append("the output directory holds other files than the bundle, its SHA256SUMS and the receipt")
        refused("a second build into the same directory",
                lambda: build(inputs, fetch, out=box / "out", adapter_integrity=adapter, notices=notices), "is not empty")

    manifest = json.loads(inputs.files["manifest.json"][0])
    lock = json.loads(inputs.files["package-lock.json"][0])

    def edited(document, change):
        copy = json.loads(json.dumps(document))
        change(copy)
        return (json.dumps(copy).encode(), 0o644)

    def swapped(url, integrity):
        data = served[url] + (b"\0" if url == tarball_address(ADAPTER, VERSION) else b"")
        if digest_of(data, integrity) != integrity:
            raise Refused(f"{url} does not match its pinned digest")
        return data

    refused("an archive that differs from its integrity", lambda: attempt(serve=swapped), "does not match its pinned digest")
    refused("the adapter at other bytes than the published ones", lambda: build(
        inputs, fetch, adapter_integrity=ADAPTER_INTEGRITY, notices=notices), "does not pin the published")
    refused("an extra package in the lock", lambda: attempt(**{"package-lock.json": edited(
        lock, lambda d: d["packages"].update({"node_modules/left-pad": {"version": "1.3.0"}}))}), "extra ['node_modules/left-pad']")
    refused("a native package missing from the lock", lambda: attempt(**{"package-lock.json": edited(
        lock, lambda d: d["packages"].pop(f"node_modules/{ENGINE}-win32-x64-msvc"))}), "missing")
    refused("a package resolved elsewhere than the registry", lambda: attempt(**{"package-lock.json": edited(
        lock, lambda d: d["packages"]["node_modules/zod"].update(resolved="https://example.com/zod-4.6.7.tgz"))}),
        "not the registry's archive")
    refused("an adapter range in package.json", lambda: attempt(**{"package.json": edited(
        json.loads(inputs.files["package.json"][0]), lambda d: d["dependencies"].update({ADAPTER: "^0.3.1"}))}), "exactly")
    refused("a manifest at another version", lambda: attempt(**{"manifest.json": edited(
        manifest, lambda d: d.update(version="0.3.2"))}), "manifest.json version")
    refused("folders passed through env, which a host leaves unexpanded", lambda: attempt(**{"manifest.json": edited(
        manifest, lambda d: d["server"]["mcp_config"].update(
            env={"QRSCAN_MCP_ALLOWED_DIRECTORIES": "${user_config.allowed_directories}"}))}), "server must be exactly")
    refused("a tool with an inputSchema", lambda: attempt(**{"manifest.json": edited(
        manifest, lambda d: d["tools"][0].update(inputSchema={"type": "object"}))}), "name and a description only")
    refused("a folder granted by default", lambda: attempt(**{"manifest.json": edited(
        manifest, lambda d: d["user_config"]["allowed_directories"].update(default=["${HOME}"]))}), "no default")
    refused("a license field that hides the AGPL parts", lambda: attempt(**{"manifest.json": edited(
        manifest, lambda d: d.update(license="MIT"))}), "manifest.json license")
    refused("a Node range other than the adapter's", lambda: attempt(**{"manifest.json": edited(
        manifest, lambda d: d["compatibility"]["runtimes"].update(node=">=18"))}), "compatibility")
    refused("an icon that is not a PNG", lambda: attempt(**{"icon.png": (b"GIF89a", 0o644)}), "not a PNG")
    refused("a notice at other bytes", lambda: attempt(changed=((notices[0][0], notices[0][1],
                                                                 digest_of(b"x", "sha256-")), notices[1])),
            "does not match its pinned digest")
    for label, files, links, needle in (
            ("a symbolic link in an archive", {"package.json": b"{}"}, (("LICENSE", "/etc/passwd"),), "not a regular file"),
            ("a path leaving package/", {"../evil": b"x", "package.json": b"{}"}, (), "outside package/"),
            ("an archive without package.json", {"LICENSE": b"x"}, (), "no package.json")):
        refused(label, lambda files=files, links=links: members("x", tarball(files, links)), needle)
    refused("a file twice up to letter case", lambda: members("x", tarball(
        {"package.json": b"{}", "LICENSE": b"a", "license": b"b"})), "twice")
    refused("a tag of another version", lambda: gate("refs/tags/mcpb-v0.3.2"), "is not refs/tags/mcpb-v0.3.1")
    refused("the engine's tag", lambda: gate("refs/tags/v0.3.1"), "is not refs/tags/mcpb-v0.3.1")
    refused("a branch", lambda: gate("refs/heads/main"), "is not refs/tags/mcpb-v0.3.1")
    try:
        gate(TAG_PREFIX + VERSION)
    except Refused as error:
        failures.append(f"the bundle's own tag was refused: {error}")
    refused("a revision that does not exist", lambda: inputs_at("0" * 40), "is not a commit")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (the committed lock, a synthetic bundle in three time zones, "
          f"verify, {len(refusals)} refusals)")
    return 1 if failures else 0


def _verify_synthetic(path, inputs, fetch, adapter, notices):
    data = pathlib.Path(path).read_bytes()
    expected, _ = build(inputs, fetch, adapter_integrity=adapter, notices=notices)
    if data != expected:
        raise Refused(f"{path} is not the build of {inputs.commit}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("build", help="build the bundle of one commit into an empty directory")
    one.add_argument("--out", required=True)
    one.add_argument("--revision", default="HEAD")
    one.add_argument("--cache")
    two = commands.add_parser("verify", help="require FILE to be the build of the commit")
    two.add_argument("file")
    two.add_argument("--revision", default="HEAD")
    two.add_argument("--cache")
    three = commands.add_parser("gate", help="accept only the tag of the manifest's version")
    three.add_argument("--ref", required=True)
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        if args.command == "build":
            _, receipt = build(inputs_at(args.revision), downloader(args.cache), out=args.out)
            bundle = receipt["bundle"]
            print(f"built {bundle['file']} from {receipt['source']['revision']}: {bundle['size']} bytes, "
                  f"{bundle['entries']} entries, sha256 {bundle['sha256']} (zlib {receipt['packer']['zlib']})")
        elif args.command == "verify":
            receipt = verify(args.file, inputs_at(args.revision), downloader(args.cache))
            print(f"ok    {args.file} is the build of {receipt['source']['revision']} "
                  f"(sha256 {receipt['bundle']['sha256']})")
        elif args.command == "gate":
            print(f"ok    {gate(args.ref)}")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"build-mcpb-bundle: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"build-mcpb-bundle: git failed: {error.stderr.decode(errors='replace').strip()}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
