#!/usr/bin/env python3
"""Build, assemble and check the prebuilt qrscan release archives.

  cli-release.py targets                    release targets and the source-asset flag, as JSON
  cli-release.py build --target T --out DIR --target-dir TDIR [--allow-dirty]
  cli-release.py assemble --builds DIR --out DIR [--receipt F] [--partial]
  cli-release.py licenses --check-release DIR [--receipt F]
  cli-release.py notes --version X.Y.Z      the dated CHANGELOG section and the unsigned statement
  cli-release.py qualify --release-dir DIR --receipts DIR --out F [--summary F] [--github-output F]
  cli-release.py qualify --public --anchor-sums-sha256 H --anchor-identities H --receipts DIR --out F
                 [--summary F]
  cli-release.py attach-plan --phase list --tag vX.Y.Z --list F
  cli-release.py attach-plan --phase plan --tag vX.Y.Z --commit SHA --view F --present DIR
                 --release-dir DIR --record F --out F --upload-list F
  cli-release.py readback --tag vX.Y.Z --commit SHA --view F --dir DIR --record F [--summary F]
  cli-release.py anchor --validate --tag vX.Y.Z --run ID [--sums-sha256 H]
  cli-release.py anchor --tag vX.Y.Z --run ID --qualification F --run-view F [--sums-sha256 H]
                 --github-output F
  cli-release.py --self-test

One archive per target, qrcode-barcode-scanner-cli-<version>-<target>.tar.gz (.zip
for Windows), whose one top directory of that name holds qrscan[.exe] and its
license and build material; the corresponding source,
qrcode-barcode-scanner-cli-<version>-source.tar.gz, a `git archive` of the commit;
and qrcode-barcode-scanner-cli-<version>-SHA256SUMS, one line per other asset.

build runs on the target's build runner (TARGETS). Before cargo starts it
refuses, with exit 2: an inherited RUSTFLAGS, CARGO_TARGET_DIR,
CARGO_BUILD_TARGET_DIR or other compiler, flag, profile or target-directory
setting (REFUSED_ENV); a RUSTUP_TOOLCHAIN other than the pin; a Cargo config
in CARGO_HOME, in .cargo/ or in an ancestor; a target directory that is not
new or empty, or lies inside the checkout; a dirty tree (--allow-dirty outside
GitHub Actions only); a host or rustc release that does not match the row; a
required tool fact it cannot read (on macOS only xcodebuild is optional:
Command Line Tools have none). cargo builds with --locked into the given
target directory, CARGO_ENCODED_RUSTFLAGS holding --remap-path-prefix for the
checkout, CARGO_HOME and the target directory, shortest first, then the row's
flags. After cargo, native-floor.py --policy cli scans the binary for
build-host paths, macOS arm64 needs `codesign --verify --strict`, and a binary
that runs on the build host must print `qrscan <version>`. DIR then holds
qrscan[.exe] and build-facts.json (qrscan-build-facts/1), with every host path
recorded as a placeholder. The Cargo.lock sha256 that build and assemble
compare is the committed file's (git cat-file), whatever line endings the
checkout wrote: a Windows checkout has CRLF by default.

assemble takes the cli-build-<target> directories (--partial accepts fewer,
outside GitHub Actions only) and checks that they agree with each other, with
this checkout and with this toolchain. It derives each target's linked crates
through cargo tree and cargo metadata (--locked --offline: run
`cargo fetch --locked` first) and their license texts (a crate without one
needs a reviewed override under distribution/cli/license-texts/), refuses a
license expression deny.toml does not allow, then writes each archive twice
and refuses any difference. Members are sorted bytewise, modes by policy
(0755 binary and directory, 0644 otherwise), owner 0, mtime SOURCE_DATE_EPOCH;
gzip has mtime 0, no file name and OS 255. licenses --check-release re-reads
that license material from the archives.

qualify, attach-plan, readback and anchor read files only, and refuse to run
while GH_TOKEN or GITHUB_TOKEN is set: the gh steps that wrote the files held
the token. qualify reads every *.json below --receipts and knows each by its
content: the qrscan-cli-consumer/1 receipts of the thirteen rows of TARGETS (each
target natively, then each libc container), the native-floor --policy cli
report and, with --public, the qrscan-cli-fetch/1 receipts. It requires one
passing receipt per row; the release directory's SHA256SUMS sha256 (with
--public, the anchor's, which the fetched SHA256SUMS must match); each archive
equal to its SHA256SUMS line; each container's glibc and platform; the unwind
case exiting 101; trace.engine_panics 0 and every case passing on the truth
set; the checkout's HEAD^{commit} as consumer and contract commit (with
--public, one contract commit); each GNU unwinder in build-info.json equal to
the floor report's; one identities digest (with --public, the anchor's). It
writes qrscan-cli-qualification/1 to --out and the summary and, once it
passes, sums_sha256 and commit to --github-output.

attach-plan --phase list requires exactly one release, draft or published,
for the tag. --phase plan decides from `gh release view` JSON and the CLI
assets downloaded from that release: the owner's draft targeting this commit
takes the missing assets, archives, then the source, then SHA256SUMS, each
file's line in the inspected record; a published release passes only complete
and identical; SHA256SUMS ahead of a missing asset, a differing same-name
asset or an unexpected CLI asset refuses the plan and nothing is uploaded.
Other assets (another lane's) are ignored. readback requires the CLI assets
on the release after the upload to be exactly the set, each the inspected
bytes, the release targeting this commit. anchor --validate checks a
public-download dispatch's tag and run id; anchor then requires the run's
qualification and `gh run view` of the run to agree: the cli-archives
workflow, completed with success, a push or workflow_dispatch event (a
pull_request, a fork's included, runs its own copy of this script under any
branch name) with headBranch the tag, headSha equal to the recorded GITHUB_SHA
and commit, the same event, a passing qualification of refs/tags/<tag> and
the optional --sums-sha256 equal to its own; it writes sums_sha256, commit
and identities_sha256 to --github-output.

--self-test also holds the matrices of the workflow to TARGETS: build,
consume, consume-container, public-download, public-download-container and
fetch-rehearsal each hold exactly their strategy.matrix.include rows (target
and runner; a container row adds image, pinned as NAME@sha256:<64 hex>, one
digest per image and platform, platform and glibc), once the tree holds it.

The toolchain pin is the top-level env RUST_TOOLCHAIN of
.github/workflows/cli-archives.yml (check-publish-guards.py --toolchains holds
it equal to ci.yml's); this script never assigns RUST_TOOLCHAIN or
RUSTUP_TOOLCHAIN. Exit 0 success; 1 a refusal naming each problem; 2 usage, a
refused environment or an unavailable tool. Stdlib only, Python >= 3.11.
"""

import argparse
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import tarfile
import tempfile
import time
import tomllib
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "qrcode-barcode-scanner-cli"
BINARY = "qrscan"
WORKFLOW = ".github/workflows/cli-archives.yml"
# The corresponding source ships as a release asset: a git archive of the commit.
SOURCE_ASSET = True
ZIG_VERSION = "0.14.1"
CARGO_ZIGBUILD_VERSION = "0.23.4"
GLIBC = "2.28"
CRATES_IO = "registry+https://github.com/rust-lang/crates.io-index"
FACTS_SCHEMA = "qrscan-build-facts/1"
INFO_SCHEMA = "qrscan-build-info/1"
ASSEMBLE_SCHEMA = "qrscan-cli-assemble/1"
LICENSES_SCHEMA = "qrscan-cli-licenses/1"
TARGETS_SCHEMA = "qrscan-cli-targets/1"
OVERRIDES = "distribution/cli/license-texts"
OVERRIDES_SCHEMA = "qrscan-license-overrides/1"


def _containers(platform, runner):
    return [{"image": "almalinux:8.10-minimal", "glibc": "2.28", "platform": platform, "runner": runner},
            {"image": "debian:bookworm-slim", "glibc": "2.36", "platform": platform, "runner": runner}]


# Each row: archive extension, build runner and the host triple rustc must
# report there, linker path, deployment target, the row's own rustflags, the
# native consumer runner and the glibc containers the archive also runs in.
TARGETS = {
    "x86_64-unknown-linux-gnu": {
        "ext": "tar.gz", "label": "Linux x86_64 (glibc 2.28 or later)",
        "build_runner": "ubuntu-24.04", "build_host": "x86_64-unknown-linux-gnu",
        "linker": "cargo-zigbuild", "unwinder": "zig-libunwind", "deployment_target": None,
        "adhoc_signature": False, "rustflags": ["-Clinker-features=-lld"],
        "consumer_runner": "ubuntu-24.04", "containers": _containers("linux/amd64", "ubuntu-24.04")},
    "aarch64-unknown-linux-gnu": {
        "ext": "tar.gz", "label": "Linux aarch64 (glibc 2.28 or later)",
        "build_runner": "ubuntu-24.04", "build_host": "x86_64-unknown-linux-gnu",
        "linker": "cargo-zigbuild", "unwinder": "zig-libunwind", "deployment_target": None,
        "adhoc_signature": False, "rustflags": [],
        "consumer_runner": "ubuntu-24.04-arm", "containers": _containers("linux/arm64", "ubuntu-24.04-arm")},
    "x86_64-apple-darwin": {
        "ext": "tar.gz", "label": "macOS x86_64 (10.15 or later)",
        "build_runner": "macos-15", "build_host": "aarch64-apple-darwin",
        "linker": "apple-ld", "unwinder": None, "deployment_target": "10.15",
        "adhoc_signature": False, "rustflags": [],
        "consumer_runner": "macos-15-intel", "containers": []},
    "aarch64-apple-darwin": {
        "ext": "tar.gz", "label": "macOS arm64 (11.0 or later)",
        "build_runner": "macos-15", "build_host": "aarch64-apple-darwin",
        "linker": "apple-ld", "unwinder": None, "deployment_target": "11.0",
        "adhoc_signature": True, "rustflags": [],
        "consumer_runner": "macos-15", "containers": []},
    "x86_64-pc-windows-msvc": {
        "ext": "zip", "label": "Windows x86_64",
        "build_runner": "windows-2025", "build_host": "x86_64-pc-windows-msvc",
        "linker": "msvc-link", "unwinder": None, "deployment_target": None,
        "adhoc_signature": False, "rustflags": ["-Ctarget-feature=+crt-static"],
        "consumer_runner": "windows-2025", "containers": []},
    "x86_64-unknown-linux-musl": {
        "ext": "tar.gz", "label": "Linux x86_64 (static musl, including Alpine)",
        "build_runner": "ubuntu-24.04", "build_host": "x86_64-unknown-linux-gnu",
        "linker": "musl-cc", "unwinder": None, "deployment_target": None,
        "adhoc_signature": False, "rustflags": ["-Ctarget-feature=+crt-static", "-Clink-self-contained=yes"],
        "consumer_runner": "ubuntu-24.04", "containers": [
            {"image": "alpine:3.22", "musl": "1.2.5", "platform": "linux/amd64", "runner": "ubuntu-24.04"}]},
    "aarch64-unknown-linux-musl": {
        "ext": "tar.gz", "label": "Linux aarch64 (static musl, including Alpine)",
        "build_runner": "ubuntu-24.04-arm", "build_host": "aarch64-unknown-linux-gnu",
        "linker": "musl-cc", "unwinder": None, "deployment_target": None,
        "adhoc_signature": False, "rustflags": ["-Ctarget-feature=+crt-static", "-Clink-self-contained=yes"],
        "consumer_runner": "ubuntu-24.04-arm", "containers": [
            {"image": "alpine:3.22", "musl": "1.2.5", "platform": "linux/arm64", "runner": "ubuntu-24.04-arm"}]},
}

# Archive members copied byte for byte from the checkout.
COPIED = {
    "LICENSE": "LICENSE",
    "LICENSE-APACHE-2.0": "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
    "LICENSING.md": "LICENSING.md",
    "README.md": "distribution/cli/README.md",
    "THIRD-PARTY.md": "crates/qrcode-ai-scanner/THIRD-PARTY.md",
}
STD_NOTICE = ("share", "doc", "rust", "COPYRIGHT-library.html")
STD_MEMBER = "COPYRIGHT-rust-std.html"

# Inherited settings that would change what cargo builds or where it writes.
REFUSED_ENV = frozenset({
    "RUSTFLAGS", "CARGO_BUILD_RUSTFLAGS", "CARGO_ENCODED_RUSTFLAGS", "RUSTC", "RUSTC_WRAPPER",
    "RUSTC_WORKSPACE_WRAPPER", "CARGO_BUILD_RUSTC", "CARGO_BUILD_RUSTC_WRAPPER",
    "CARGO_BUILD_RUSTC_WORKSPACE_WRAPPER", "CARGO_BUILD_TARGET", "CARGO_TARGET_DIR", "CARGO_BUILD_TARGET_DIR",
})
REFUSED_ENV_PATTERN = re.compile(r"CARGO_TARGET_[A-Z0-9_]+_(RUSTFLAGS|LINKER)|CARGO_PROFILE_RELEASE_.*")
REFUSED_REASON = "build sets the compiler flags, profile and target directory itself"
# --remap-path-prefix targets, and the placeholders recorded for the host paths.
REMAP_TO = {"checkout": "/source", "cargo-home": "/cargo", "target-dir": "/target"}
CARGO_ARGS = ("--release", "--locked", "-p", PACKAGE, "--bin", BINARY)
LICENSE_FILE = re.compile(r"(LICEN[CS]E|COPYING|NOTICE|COPYRIGHT|UNLICENSE)([-._].*)?", re.IGNORECASE)
WORKSPACE_ANCHORS = ("qrcode-barcode-scanner", PACKAGE)
FACTS_KEYS = ("schema", "name", "package", "version", "target", "source", "toolchain", "linker", "profile",
              "rustflags", "command", "deployment_target", "builder", "binary", "checks")
INFO_KEYS = ("schema", "name", "package", "version", "target", "source", "toolchain", "linker", "profile",
             "rustflags", "command", "deployment_target", "builder", "binary", "dependencies",
             "build_dependencies")


# ---------------------------------------------------------------- helpers


class Stop(Exception):
    """A command stops: code 1 refuses (each problem named), 2 cannot proceed."""

    def __init__(self, code, problems):
        super().__init__(code, problems)
        self.code, self.problems = code, list(problems)


def getenv(env, name):
    """ENV[NAME], also under another case (Windows folds environment names)."""
    if name in env:
        return env[name]
    folded = name.upper()
    return next((value for key, value in env.items() if key.upper() == folded), None)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def tail(proc):
    """The last line a command printed, stderr first."""
    for stream in (proc.stderr, proc.stdout):
        lines = (stream or b"").decode("utf-8", "replace").strip().splitlines()
        if lines:
            return lines[-1].strip()
    return "no output"


def run(env, argv, cwd=None, timeout=300):
    """ARGV, ARGV[0] looked up on ENV's PATH (on Windows subprocess ignores an env PATH)."""
    found = shutil.which(argv[0], path=getenv(env, "PATH") or "")
    if found is None:
        raise Stop(2, [f"{argv[0]} is not on PATH"])
    try:
        return subprocess.run([found, *argv[1:]], cwd=cwd, env=env, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise Stop(2, [f"`{' '.join(argv)}` timed out after {timeout} s"]) from None


def fact(env, argv, cwd=None, raw=False):
    """The output of a command that must succeed: a required fact (exit 2 otherwise)."""
    proc = run(env, argv, cwd)
    if proc.returncode:
        raise Stop(2, [f"`{' '.join(argv)}` failed (exit {proc.returncode}): {tail(proc)}"])
    return proc.stdout if raw else proc.stdout.decode("utf-8", "replace")


def output_lines(proc):
    """Everything a command printed, stdout then stderr, as lines."""
    text = (proc.stdout or b"").decode("utf-8", "replace") + (proc.stderr or b"").decode("utf-8", "replace")
    return [line.rstrip() for line in text.strip().splitlines()]


def git(env, root, *args, raw=False):
    return fact(env, ["git", "-C", str(root), *args], raw=raw)


def commit_facts(env, root):
    """(HEAD's commit, its committer time, whether the work tree is dirty)."""
    commit = git(env, root, "rev-parse", "HEAD^{commit}").strip()
    epoch = git(env, root, "log", "-1", "--format=%ct", commit).strip()
    if not re.fullmatch(r"[0-9a-f]{40}", commit) or not epoch.isdigit():
        raise Stop(2, [f"git reports commit {commit!r} and time {epoch!r}"])
    return commit, int(epoch), bool(git(env, root, "status", "--porcelain").strip())


def toolchain_pin(root):
    """The top-level env RUST_TOOLCHAIN of the CLI workflow (exit 2 when unreadable)."""
    try:
        lines = (root / WORKFLOW).read_text(encoding="utf-8").splitlines()
    except OSError as err:
        raise Stop(2, [f"cannot read the toolchain pin in {WORKFLOW}: {err.strerror}"]) from None
    pins, top_env = [], False
    for line in lines:
        if line[:1] and not line[:1].isspace() and not line.startswith("#"):
            top_env = line.split("#", 1)[0].rstrip() == "env:"
            continue
        match = re.fullmatch(r"\s+RUST_TOOLCHAIN:\s*([\"']?)(\d+\.\d+\.\d+)\1\s*(#.*)?", line)
        if top_env and match:
            pins.append(match.group(2))
    if len(pins) != 1:
        raise Stop(2, [f"{WORKFLOW} holds {len(pins)} top-level env RUST_TOOLCHAIN x.y.z, not one"])
    return pins[0]


def toolchain_problems(env, pin):
    selected = getenv(env, "RUSTUP_TOOLCHAIN")
    return [] if selected is None or selected == pin else [f"RUSTUP_TOOLCHAIN is {selected}, not the pinned {pin}"]


def read_manifest(root):
    try:
        return tomllib.loads((root / "Cargo.toml").read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as err:
        raise Stop(2, [f"cannot read Cargo.toml: {err}"]) from None


def workspace_version(root):
    return read_manifest(root)["workspace"]["package"]["version"]


def workspace_repository(root):
    repository = read_manifest(root)["workspace"]["package"].get("repository")
    if not repository:
        raise Stop(2, ["Cargo.toml has no [workspace.package] repository"])
    return repository


def release_profile(root):
    """The root manifest's release profile with cargo's defaults, as build-info records it."""
    release = read_manifest(root).get("profile", {}).get("release", {})
    return {"opt_level": str(release.get("opt-level", 3)), "lto": release.get("lto", False),
            "codegen_units": release.get("codegen-units", 16), "strip": release.get("strip", False),
            "panic": release.get("panic", "unwind"),
            "overflow_checks": {name: package["overflow-checks"] for name, package in
                                sorted(release.get("package", {}).items()) if "overflow-checks" in package}}


def read_input(root, relative):
    """A checkout file the archives need (exit 2 when missing)."""
    try:
        return (root / relative).read_bytes()
    except OSError as err:
        raise Stop(2, [f"cannot read {relative}: {err.strerror}"]) from None


def committed(env, root, commit, relative):
    """RELATIVE's bytes as COMMIT holds them, whatever line endings the checkout wrote: Git for
    Windows checks text out with CRLF by default, and git status still reports a clean tree."""
    return git(env, root, "cat-file", "blob", f"{commit}:{relative}", raw=True)


def rustc_facts(env, root):
    """(`rustc -vV` lines, its `key: value` fields)."""
    lines = [line.strip() for line in fact(env, ["rustc", "-vV"], root).strip().splitlines()]
    return lines, dict(line.split(": ", 1) for line in lines if ": " in line)


def std_notice(env, root):
    """The Rust std notice the toolchain ships (COPYRIGHT-library.html)."""
    sysroot = fact(env, ["rustc", "--print", "sysroot"], root).strip()
    try:
        return Path(sysroot, *STD_NOTICE).read_bytes()
    except OSError:
        raise Stop(2, [f"the toolchain lacks <sysroot>/{'/'.join(STD_NOTICE)}"]) from None


def cargo_home(env):
    home = getenv(env, "CARGO_HOME")
    if home:
        return Path(home)
    return Path(getenv(env, "USERPROFILE" if os.name == "nt" else "HOME") or Path.home()) / ".cargo"


def cargo_configs(root, home):
    """The Cargo config files a build in ROOT would read."""
    found = [folder / ".cargo" / name for folder in (root, *root.parents) for name in ("config.toml", "config")]
    found += [home / name for name in ("config.toml", "config")]
    return list(dict.fromkeys(path for path in found if path.is_file()))


def inside(path, folder):
    return path == folder or folder in path.parents


def fresh_dir_problem(path, what, root):
    """Why PATH cannot be a new or empty directory outside the checkout ROOT (None when it can)."""
    if inside(path.resolve(), root):
        return f"the {what} is inside the checkout: {path}"
    if path.exists() and not path.is_dir():
        return f"the {what} is not a directory: {path}"
    if path.is_dir() and any(path.iterdir()):
        return f"the {what} is not empty: {path}"
    return None


def forms(path):
    """PATH as given (made absolute) and resolved, never a filesystem root."""
    if not path:
        return []
    found = dict.fromkeys([os.path.abspath(path), str(Path(path).resolve())])
    return [form for form in found if Path(form).parent != Path(form)]


def scrub(value, marks):
    """VALUE with each host path of MARKS (longest first) replaced by its placeholder."""
    if isinstance(value, str):
        for text, mark in marks:
            value = value.replace(text, mark)
        return value
    if isinstance(value, list):
        return [scrub(item, marks) for item in value]
    if isinstance(value, dict):
        return {key: scrub(item, marks) for key, item in value.items()}
    return value


def builder(env):
    server, repository, run_id = (getenv(env, name) for name in ("GITHUB_SERVER_URL", "GITHUB_REPOSITORY",
                                                                  "GITHUB_RUN_ID"))
    run_url = f"{server}/{repository}/actions/runs/{run_id}" if server and repository and run_id else None
    return {"runner_os": getenv(env, "RUNNER_OS"), "runner_arch": getenv(env, "RUNNER_ARCH"),
            "image_os": getenv(env, "ImageOS"), "image_version": getenv(env, "ImageVersion"),
            "workflow_run": run_url}


def emit(receipt, path=None):
    text = json.dumps(receipt, indent=2) + "\n"
    if path:
        Path(path).write_bytes(text.encode())
    sys.stdout.write(text)


# ---------------------------------------------------------------- writers


def archive_stem(version, target):
    return f"{PACKAGE}-{version}-{target}"


def archive_name(version, target):
    return f"{archive_stem(version, target)}.{TARGETS[target]['ext']}"


def source_name(version):
    return f"{PACKAGE}-{version}-source.tar.gz"


def sums_name(version):
    return f"{PACKAGE}-{version}-SHA256SUMS"


def binary_name(target):
    return f"{BINARY}.exe" if TARGETS[target]["ext"] == "zip" else BINARY


def asset_names(version, targets=None):
    """The CLI assets of one release (every target by default), SUMS last."""
    names = [archive_name(version, target) for target in (TARGETS if targets is None else targets)]
    return names + ([source_name(version)] if SOURCE_ASSET else []) + [sums_name(version)]


ARCHIVE_NAME = re.compile(rf"{re.escape(PACKAGE)}-(?P<version>\d+\.\d+\.\d+)-(?P<target>"
                          + "|".join(map(re.escape, TARGETS)) + r")\.(?P<ext>tar\.gz|zip)")


def gzip_bytes(data):
    """gzip as every asset has it: deflate level 9, mtime 0, no file name, XFL 2, OS 255."""
    deflate = zlib.compressobj(9, zlib.DEFLATED, -zlib.MAX_WBITS, zlib.DEF_MEM_LEVEL, zlib.Z_DEFAULT_STRATEGY)
    body = deflate.compress(data) + deflate.flush()
    return (b"\x1f\x8b\x08\x00" + struct.pack("<I", 0) + b"\x02\xff" + body
            + struct.pack("<II", zlib.crc32(data) & 0xFFFFFFFF, len(data) & 0xFFFFFFFF))


def _tar_entry(name, kind, mode, size, epoch):
    info = tarfile.TarInfo(name)
    info.type, info.mode, info.size, info.mtime = kind, mode, size, epoch
    info.uid = info.gid = 0
    info.uname = info.gname = ""
    return info


def write_archive(top, members, epoch, ext):
    """MEMBERS {name: (bytes, mode)} under the directory TOP, as a USTAR tar.gz or a
    zip: sorted bytewise after the directory, every timestamp EPOCH, owner 0."""
    names = sorted(members)
    if any(len(f"{top}/{name}".encode()) >= 100 for name in names):
        raise ValueError(f"a member of {top} needs more than the USTAR name field")
    buffer = io.BytesIO()
    if ext == "zip":
        stamp = time.gmtime(epoch)[:6]
        if stamp[0] < 1980:
            raise ValueError("zip timestamps start in 1980")
        entries = [(f"{top}/", b"", 0o040755, zipfile.ZIP_STORED)]
        entries += [(f"{top}/{name}", members[name][0], 0o100000 | members[name][1], zipfile.ZIP_DEFLATED)
                    for name in names]
        with zipfile.ZipFile(buffer, "w") as archive:
            for name, data, mode, method in entries:
                info = zipfile.ZipInfo(name, stamp)
                info.create_system = 3
                info.external_attr = mode << 16 | (0x10 if name.endswith("/") else 0)
                info.compress_type = method
                archive.writestr(info, data, compress_type=method,
                                 compresslevel=9 if method == zipfile.ZIP_DEFLATED else None)
        return buffer.getvalue()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        archive.addfile(_tar_entry(top, tarfile.DIRTYPE, 0o755, 0, epoch))
        for name in names:
            data, mode = members[name]
            archive.addfile(_tar_entry(f"{top}/{name}", tarfile.REGTYPE, mode, len(data), epoch), io.BytesIO(data))
    return gzip_bytes(buffer.getvalue())


def sums_bytes(assets):
    """`<sha256>  <name>` per asset, sorted by name, LF with a final newline, ASCII."""
    return "".join(f"{sha256(data)}  {name}\n" for name, data in sorted(assets.items())).encode("ascii")


def read_members(path):
    """({file below the top directory: bytes}, the top directories joined by '|') of a CLI archive."""
    files, tops = {}, set()
    if path.name.endswith(".zip"):
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                top, _, inner = name.partition("/")
                tops.add(top)
                if inner and not name.endswith("/"):
                    files[inner] = archive.read(name)
    else:
        with tarfile.open(path, "r:gz") as archive:
            for member in archive.getmembers():
                top, _, inner = member.name.partition("/")
                tops.add(top)
                if member.isfile() and inner:
                    files[inner] = archive.extractfile(member).read()
    return files, "|".join(sorted(tops))


# ---------------------------------------------------------------- build


def zig_facts(env, root):
    zig = fact(env, ["zig", "version"], root).strip()
    zigbuild = fact(env, ["cargo-zigbuild", "--version"], root).strip()
    problems = [] if zig == ZIG_VERSION else [f"zig version prints {zig}, not the pinned {ZIG_VERSION}"]
    if not re.fullmatch(rf"cargo-zigbuild\S* {re.escape(CARGO_ZIGBUILD_VERSION)}", zigbuild):
        problems.append(f"cargo-zigbuild --version prints {zigbuild}, not the pinned {CARGO_ZIGBUILD_VERSION}")
    if problems:
        raise Stop(2, problems)
    return {"zig": zig, "cargo_zigbuild": zigbuild, "glibc": GLIBC}


def apple_facts(env, root):
    """SDK and linker facts; only xcodebuild may be missing (Command Line Tools)."""
    found = {"developer_dir": fact(env, ["xcode-select", "-p"], root).strip(),
             "sdk_version": fact(env, ["xcrun", "--show-sdk-version"], root).strip(),
             "sdk_build_version": fact(env, ["xcrun", "--show-sdk-build-version"], root).strip()}
    for tool, flag in (("ld", "-v"), ("clang", "--version")):
        proc = run(env, [fact(env, ["xcrun", "--find", tool], root).strip(), flag], root)
        if proc.returncode:
            raise Stop(2, [f"`{tool} {flag}` failed (exit {proc.returncode}): {tail(proc)}"])
        found[tool] = output_lines(proc)
    try:
        proc = run(env, ["xcodebuild", "-version"], root)
    except Stop:
        proc = None
    if proc is not None and proc.returncode == 0:
        found["xcodebuild"] = output_lines(proc)
    elif found["developer_dir"].rstrip("/").endswith("/CommandLineTools"):
        found["xcodebuild"] = "unavailable: command line tools only"
    else:
        found["xcodebuild"] = f"unavailable: {tail(proc) if proc is not None else 'xcodebuild is not on PATH'}"
    return found


def msvc_facts(env, root):
    base = getenv(env, "ProgramFiles(x86)") or r"C:\Program Files (x86)"
    query = [str(Path(base, "Microsoft Visual Studio", "Installer", "vswhere.exe")), "-latest", "-products", "*",
             "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-utf8", "-property"]
    version = fact(env, [*query, "catalog_productDisplayVersion"], root).strip()
    install = fact(env, [*query, "installationPath"], root).strip()
    try:
        tools = Path(install, "VC", "Auxiliary", "Build", "Microsoft.VCToolsVersion.default.txt").read_text(
            encoding="utf-8").strip()
    except OSError:
        tools = ""
    if not version or not tools:
        raise Stop(2, [f"vswhere names Visual Studio {version or '?'} and VC tools {tools or '?'}"])
    return {"visual_studio": version, "vc_tools": tools}


def musl_facts(env, root):
    """The native C driver; Rust's target supplies the self-contained musl libraries."""
    return {"cc": fact(env, ["cc", "--version"], root).strip().splitlines()}


LINKER_FACTS = {"cargo-zigbuild": zig_facts, "apple-ld": apple_facts, "msvc-link": msvc_facts,
                "musl-cc": musl_facts}


def marks_of(pairs):
    """[(host path form, placeholder)], longest first, for scrub()."""
    found = {}
    for path, name in pairs:
        for form in forms(path):
            found.setdefault(form, f"<{name}>")
    return sorted(found.items(), key=lambda item: (-len(item[0]), item[0]))


def remap_flags(paths):
    """(flags, recorded): one --remap-path-prefix per path, in the form cargo is given it,
    shortest first so that the most specific prefix comes last and wins; recorded with
    placeholders. native-floor's --forbid then covers every form of each path."""
    ordered = sorted(((str(path), name) for path, name in paths), key=lambda item: (len(item[0]), item[0]))
    return ([f"--remap-path-prefix={form}={REMAP_TO[name]}" for form, name in ordered],
            [f"--remap-path-prefix=<{name}>={REMAP_TO[name]}" for form, name in ordered])


def cargo_command(target, target_dir):
    if TARGETS[target]["linker"] == "cargo-zigbuild":
        return ["cargo", "zigbuild", *CARGO_ARGS, "--target", f"{target}.{GLIBC}", "--target-dir", target_dir]
    return ["cargo", "build", *CARGO_ARGS, "--target", target, "--target-dir", target_dir]


def floor_check(env, root, target, binary, forbid):
    """native-floor.py --policy cli on the binary, every host path forbidden."""
    argv = [sys.executable, str(root / "scripts" / "native-floor.py"), "--policy", "cli", "--target", target]
    if TARGETS[target]["unwinder"]:
        argv += ["--unwinder", TARGETS[target]["unwinder"]]
    for value in forbid:
        argv += ["--forbid", value]
    proc = subprocess.run([*argv, str(binary)], cwd=root, env=env, capture_output=True, timeout=600)
    try:
        problems = [str(problem) for problem in json.loads(proc.stdout)["problems"]]
    except (ValueError, KeyError, TypeError):
        problems = [tail(proc)]
    if proc.returncode == 1:
        raise Stop(1, [f"native-floor --policy cli refused the binary: {'; '.join(problems)}"])
    if proc.returncode:
        raise Stop(2, [f"native-floor --policy cli failed (exit {proc.returncode}): {tail(proc)}"])
    return {"policy": "cli", "verdict": "PASS", "unwinder": TARGETS[target]["unwinder"], "forbid": forbid}


def after_cargo(env, root, target, host, version, binary, forbid, linker):
    """The checks on the binary that ships: floor, macOS signature, version smoke."""
    row = TARGETS[target]
    checks = {"floor": floor_check(env, root, target, binary, forbid), "signature": None}
    if row["linker"] == "apple-ld":
        linker["codesign"] = output_lines(run(env, ["codesign", "-dv", str(binary)], root))
        if row["adhoc_signature"]:
            proc = run(env, ["codesign", "--verify", "--strict", str(binary)], root)
            if proc.returncode:
                raise Stop(1, [f"codesign --verify --strict refused the binary: {tail(proc)}"])
            checks["signature"] = "codesign --verify --strict: valid"
    native_musl = target.endswith("-linux-musl") and target.removesuffix("-musl") + "-gnu" == host
    if target != host and not native_musl:
        checks["version"] = f"not run: {target} binaries do not run on the build host {host}"
        return checks
    want = f"{BINARY} {version}\n".encode()
    try:
        proc = subprocess.run([str(binary), "--version"], cwd=binary.parent, env=env, capture_output=True,
                              timeout=120)
    except OSError as err:
        raise Stop(1, [f"{BINARY} --version did not start: {err}"]) from None
    if proc.returncode or proc.stdout != want:
        raise Stop(1, [f"{BINARY} --version printed {proc.stdout!r} (exit {proc.returncode}), not {want!r}"])
    checks["version"] = want.decode().strip()
    return checks


def build(args, env, root):
    """Build one target's qrscan into ARGS.out with its build-facts.json (see the module doc)."""
    target, row = args.target, TARGETS[args.target]
    root = root.resolve()
    out, tdir = Path(os.path.abspath(args.out)), Path(os.path.abspath(args.target_dir))
    problems = [f"{name} is set: {REFUSED_REASON}" for name in sorted(env)
                if name in REFUSED_ENV or REFUSED_ENV_PATTERN.fullmatch(name)]
    pin = toolchain_pin(root)
    problems += toolchain_problems(env, pin)
    home = cargo_home(env)
    home = home if home.is_absolute() else root / home  # cargo reads a relative CARGO_HOME from its cwd
    problems += [f"a Cargo config would apply: {path}" for path in cargo_configs(root, home)]
    problems += filter(None, (fresh_dir_problem(tdir, "target directory", root),
                              fresh_dir_problem(out, "output directory", root)))
    if inside(out.resolve(), tdir.resolve()) or inside(tdir.resolve(), out.resolve()):
        problems.append("the output and target directories overlap")
    commit, epoch, dirty = commit_facts(env, root)
    if args.allow_dirty and getenv(env, "GITHUB_ACTIONS") == "true":
        problems.append("--allow-dirty is refused under GitHub Actions")
    elif dirty and not args.allow_dirty:
        problems.append("the working tree is dirty (--allow-dirty, outside GitHub Actions only)")
    if problems:
        raise Stop(2, problems)
    rustc, fields = rustc_facts(env, root)
    host = fields.get("host")
    if fields.get("release") != pin:
        problems.append(f"rustc -vV reports release {fields.get('release')}, not the pinned {pin}")
    if host != row["build_host"]:
        problems.append(f"this host is {host}; {target} builds on {row['build_host']}")
    if problems:
        raise Stop(2, problems)
    cargo_version = fact(env, ["cargo", "-V"], root).strip()
    notice = std_notice(env, root)
    linker = {"kind": row["linker"], "unwinder": row["unwinder"], **LINKER_FACTS[row["linker"]](env, root)}
    lock, version = committed(env, root, commit, "Cargo.lock"), workspace_version(root)
    flags, recorded = remap_flags([(root, "checkout"), (home, "cargo-home"), (tdir, "target-dir")])
    cargo_env = {**env, "CARGO_ENCODED_RUSTFLAGS": "\x1f".join(flags + row["rustflags"]),
                 "CARGO_INCREMENTAL": "0", "SOURCE_DATE_EPOCH": str(epoch)}
    if row["deployment_target"]:
        cargo_env["MACOSX_DEPLOYMENT_TARGET"] = row["deployment_target"]
    tdir.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    cargo = shutil.which("cargo", path=getenv(env, "PATH") or "")
    # cargo's own stdout joins stderr: stdout carries this script's JSON only.
    code = subprocess.run([cargo, *cargo_command(target, str(tdir))[1:]], cwd=root, env=cargo_env,
                          stdout=2).returncode
    if code:
        raise Stop(1, [f"cargo exited {code}"])
    built = tdir / target / "release" / binary_name(target)
    if not built.is_file():
        raise Stop(1, [f"cargo left no {binary_name(target)} for {target}"])
    shipped = out / binary_name(target)
    shutil.copyfile(built, shipped)
    os.chmod(shipped, 0o755)
    home_dir = getenv(env, "USERPROFILE" if os.name == "nt" else "HOME")
    runner_temp = getenv(env, "RUNNER_TEMP")
    forbid = list(dict.fromkeys(form for path in (root, home_dir, home, runner_temp, tdir) for form in forms(path)))
    try:
        checks = after_cargo(env, root, target, host, version, shipped, forbid, linker)
    except Stop:
        shipped.unlink(missing_ok=True)
        raise
    data = shipped.read_bytes()
    ref = getenv(env, "GITHUB_REF") or None
    facts = {
        "schema": FACTS_SCHEMA, "name": BINARY, "package": PACKAGE, "version": version, "target": target,
        "source": {"repository": workspace_repository(root), "ref": ref,
                   "tag": ref.removeprefix("refs/tags/") if ref and ref.startswith("refs/tags/") else None,
                   "commit": commit, "source_date_epoch": epoch, "cargo_lock_sha256": sha256(lock), "dirty": dirty},
        "toolchain": {"rustc": rustc, "cargo": cargo_version, "std_notice_sha256": sha256(notice)},
        "linker": linker, "profile": release_profile(root),
        "rustflags": recorded + row["rustflags"], "command": cargo_command(target, "<target-dir>"),
        "deployment_target": row["deployment_target"], "builder": builder(env),
        "binary": {"path": binary_name(target), "sha256": sha256(data), "size": len(data)},
        "checks": checks,
    }
    marks = marks_of([(tdir, "target-dir"), (out, "out"), (root, "checkout"), (home, "cargo-home"),
                      (runner_temp, "runner-temp"), (home_dir, "home")])
    facts = scrub(facts, marks)
    (out / "build-facts.json").write_bytes((json.dumps(facts, indent=2) + "\n").encode())
    return facts


def cmd_build(args, env, root):
    emit(build(args, env, root))
    return 0


# ---------------------------------------------------------------- licenses


def spdx_parse(expression):
    """An SPDX license expression (a legacy `/` reads as OR) as a tree; ValueError when malformed."""
    tokens, position = re.findall(r"[()/]|[^\s()/]+", expression), 0

    def peek():
        return tokens[position] if position < len(tokens) else None

    def take():
        nonlocal position
        position += 1
        return tokens[position - 1]

    def operator(name):
        return peek() is not None and peek().upper() == name

    def identifier():
        token = peek()
        if token is None or token in ("(", ")", "/") or token.upper() in ("AND", "OR", "WITH"):
            raise ValueError(f"expected a license identifier at {token!r}")
        return take()

    def atom():
        if peek() == "(":
            take()
            node = any_of()
            if peek() != ")":
                raise ValueError("unbalanced parenthesis")
            take()
            return node
        node = ("id", identifier())
        if operator("WITH"):
            take()
            node = ("with", node[1], identifier())
        return node

    def all_of():
        nodes = [atom()]
        while operator("AND"):
            take()
            nodes.append(atom())
        return nodes[0] if len(nodes) == 1 else ("and", nodes)

    def any_of():
        nodes = [all_of()]
        while peek() == "/" or operator("OR"):
            take()
            nodes.append(all_of())
        return nodes[0] if len(nodes) == 1 else ("or", nodes)

    tree = any_of()
    if peek() is not None:
        raise ValueError(f"unexpected {peek()!r}")
    return tree


def spdx_allowed(tree, allowed):
    """Whether one choice of OR branches needs only ALLOWED licenses (lower-cased)."""
    if tree[0] == "id":
        return tree[1].lower() in allowed
    if tree[0] == "with":
        return f"{tree[1]} with {tree[2]}".lower() in allowed
    branches = (spdx_allowed(node, allowed) for node in tree[1])
    return all(branches) if tree[0] == "and" else any(branches)


def deny_allowed(root):
    """deny.toml's [licenses] allow list, lower-cased with single spaces."""
    try:
        allow = tomllib.loads(read_input(root, "deny.toml").decode("utf-8"))["licenses"]["allow"]
    except (KeyError, TypeError, ValueError) as err:
        raise Stop(2, [f"deny.toml has no readable [licenses] allow list: {err}"]) from None
    return {" ".join(str(item).split()).lower() for item in allow}


def license_problem(name, version, expression, allowed):
    if not expression:
        return f"{name} {version} declares no license expression: a reviewed override names one"
    try:
        tree = spdx_parse(expression)
    except ValueError as err:
        return f"{name} {version}: cannot parse license {expression!r}: {err}"
    if spdx_allowed(tree, allowed):
        return None
    return f"{name} {version}: license {expression} is not allowed by deny.toml"


OVERRIDE_KEYS = frozenset({"crate", "version", "file", "sha256", "url", "reason"})
SAFE_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.+-]*")


def load_overrides(root):
    """({(crate, version): [entry with its text]}, problems) from the reviewed overrides."""
    folder = root / OVERRIDES
    if not folder.exists():
        return {}, []
    where = f"{OVERRIDES}/SOURCES.json"
    try:
        data = json.loads((folder / "SOURCES.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        return {}, [f"{where} is unreadable: {err}"]
    if not isinstance(data, dict) or data.get("schema") != OVERRIDES_SCHEMA or \
            not isinstance(data.get("overrides"), list):
        return {}, [f"{where} is not {OVERRIDES_SCHEMA}"]
    found, problems, used = {}, [], {"SOURCES.json"}
    for item in data["overrides"]:
        keys = set(item) if isinstance(item, dict) else set()
        if not OVERRIDE_KEYS <= keys <= OVERRIDE_KEYS | {"spdx"} or \
                not all(SAFE_NAME.fullmatch(str(item[key])) for key in ("crate", "version", "file")):
            problems.append(f"{where}: an entry has keys {sorted(keys)} or an unsafe crate, version or file")
            continue
        relative = f"{item['crate']}-{item['version']}/{item['file']}"
        try:
            raw = (folder / relative).read_bytes()
        except OSError:
            problems.append(f"license override {OVERRIDES}/{relative} is missing")
            continue
        used.add(relative)
        if sha256(raw) != item["sha256"]:
            problems.append(f"license override {OVERRIDES}/{relative}: sha256 {sha256(raw)}, "
                            f"SOURCES.json records {item['sha256']}")
        elif b"\r" in raw or not is_utf8(raw):
            problems.append(f"license override {OVERRIDES}/{relative} is not LF UTF-8 text")
        else:
            found.setdefault((item["crate"], item["version"]), []).append({**item, "text": raw})
    stray = sorted(path.relative_to(folder).as_posix() for path in folder.rglob("*") if path.is_file())
    problems += [f"{OVERRIDES}/{name} is not listed in SOURCES.json" for name in stray if name not in used]
    return found, problems


def is_utf8(raw):
    try:
        raw.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def normalized(raw):
    """A license text with LF line endings; ValueError (UnicodeDecodeError) when not UTF-8."""
    return raw.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def crate_texts(package, overrides, problems):
    """{label: LF text} of a registry crate: its package-root license and notice files,
    its license_file and its reviewed overrides."""
    name, version = package["name"], package["version"]
    base = Path(package["manifest_path"]).parent
    try:
        paths = {path.name: path for path in sorted(base.iterdir())
                 if path.is_file() and LICENSE_FILE.fullmatch(path.name)}
    except OSError:
        raise Stop(2, [f"the sources of {name} {version} are missing: run cargo fetch --locked"]) from None
    declared = package.get("license_file")
    if declared:
        path = base / declared
        if inside(path.resolve(), base.resolve()) and path.is_file():
            paths.setdefault(Path(declared).as_posix(), path)
        else:
            problems.append(f"{name} {version}: license_file {declared} is not a file of the package")
    texts = {}
    for label, path in sorted(paths.items()):
        try:
            texts[label] = normalized(path.read_bytes())
        except ValueError:
            problems.append(f"{name} {version}: {label} is not UTF-8 text; a reviewed override replaces it")
    for item in overrides.get((name, version), []):
        texts[f"override {item['file']}"] = item["text"]
    if not texts:
        problems.append(f"no license text for {name} {version}")
    return texts


THIRD_PARTY_FIELDS = (("license", r".+"), ("source", r"\S+"), ("checksum", r"[0-9a-f]{64}"),
                      ("texts", r"[0-9a-f]{64}(?: [0-9a-f]{64})*"))


def third_party_header(version, target):
    return f"Third-party crates in qrscan {version} for {target}, and their license texts"


def third_party_bytes(version, target, crates, texts):
    """THIRD-PARTY-LICENSES.txt: a header line and an empty line; per crate of CRATES (sorted)
    `== <name> <version> ==`, `license:`, `source:`, `checksum:`, `texts: <sha256>...` and an
    empty line; then each distinct text once, by sha256: `--- text <sha256> <size> bytes ---`,
    its bytes and a newline."""
    lines = [third_party_header(version, target), ""]
    for crate in crates:
        lines += [f"== {crate['name']} {crate['version']} ==", f"license: {crate['license']}",
                  f"source: {crate['source']}", f"checksum: {crate['checksum']}",
                  "texts: " + " ".join(crate["texts"]), ""]
    body = ("\n".join(lines) + "\n").encode("utf-8")
    for digest in sorted({digest for crate in crates for digest in crate["texts"]}):
        body += f"--- text {digest} {len(texts[digest])} bytes ---\n".encode() + texts[digest] + b"\n"
    return body


def parse_third_party(data, version, target):
    """(crates, {sha256: text}) of a THIRD-PARTY-LICENSES.txt; ValueError names the first defect."""
    position = 0

    def line():
        nonlocal position
        end = data.find(b"\n", position)
        if end < 0:
            raise ValueError(f"no newline after byte {position}")
        found, position = data[position:end].decode("utf-8"), end + 1
        return found

    header = line()
    if header != third_party_header(version, target) or line():
        raise ValueError(f"the header is {header!r}, or no empty line follows it")
    crates, texts = [], {}
    while data.startswith(b"== ", position):
        title = re.fullmatch(r"== (\S+) (\S+) ==", line())
        fields = [re.fullmatch(rf"{key}: ({pattern})", line()) for key, pattern in THIRD_PARTY_FIELDS]
        if not title or not all(fields) or line():
            raise ValueError(f"a malformed crate block ending at byte {position}")
        crates.append({"name": title.group(1), "version": title.group(2),
                       **{key: found.group(1) for (key, _), found in zip(THIRD_PARTY_FIELDS, fields)}})
        crates[-1]["texts"] = crates[-1]["texts"].split()
    while position < len(data):
        head = re.fullmatch(r"--- text ([0-9a-f]{64}) (\d+) bytes ---", line())
        if not head:
            raise ValueError(f"no `--- text <sha256> <size> bytes ---` line ending at byte {position}")
        digest, size = head.group(1), int(head.group(2))
        body, position = data[position:position + size], position + size
        if len(body) != size or data[position:position + 1] != b"\n" or digest in texts:
            raise ValueError(f"the text {digest} is cut short or repeated")
        texts[digest], position = body, position + 1
    return crates, texts


# ---------------------------------------------------------------- assemble

# The path crates linked into qrscan, covered by LICENSE, LICENSING.md and THIRD-PARTY.md.
WORKSPACE_CRATES = frozenset({"qrcode-barcode-scanner", PACKAGE})


def rustc_name(lines):
    fields = dict(line.split(": ", 1) for line in lines if ": " in line)
    return f"{fields.get('release')} ({fields.get('commit-hash')})"


def facts_problems(target, facts, binary, reference):
    """How one build's facts disagree with its binary, its row or this checkout and toolchain."""
    sections = ("source", "toolchain", "linker", "builder", "binary", "checks")
    if not isinstance(facts, dict) or facts.get("schema") != FACTS_SCHEMA or set(facts) != set(FACTS_KEYS) \
            or not all(isinstance(facts[key], dict) for key in sections):
        return [f"{target}: build-facts.json is not {FACTS_SCHEMA}"]
    row, source, toolchain, linker, shipped = (TARGETS[target], facts["source"], facts["toolchain"],
                                               facts["linker"], facts["binary"])
    rustc = [line for line in toolchain.get("rustc") or [] if not str(line).startswith("host: ")]
    checks = [
        ((facts["name"], facts["package"], facts["target"]) == (BINARY, PACKAGE, target),
         f"build-facts names {facts['name']} {facts['package']} {facts['target']}"),
        (facts["version"] == reference["version"],
         f"version {facts['version']}, the workspace is {reference['version']}"),
        (source.get("repository") == reference["repository"],
         f"repository {source.get('repository')}, the workspace's is {reference['repository']}"),
        (facts["profile"] == reference["profile"], "the release profile differs from this checkout's"),
        (source.get("commit") == reference["commit"],
         f"built from commit {source.get('commit')}, this checkout is {reference['commit']}"),
        (source.get("source_date_epoch") == reference["epoch"],
         f"SOURCE_DATE_EPOCH {source.get('source_date_epoch')}, the commit's is {reference['epoch']}"),
        (source.get("cargo_lock_sha256") == reference["cargo_lock_sha256"],
         f"Cargo.lock sha256 {source.get('cargo_lock_sha256')}, this checkout's is {reference['cargo_lock_sha256']}"),
        (source.get("dirty") is False, "built from a dirty tree"),
        (source.get("ref") == reference["ref"],
         f"built for ref {source.get('ref')}, this run is on {reference['ref']}"),
        (facts["builder"].get("workflow_run") == reference["workflow_run"],
         f"built by run {facts['builder'].get('workflow_run')}, this run is {reference['workflow_run']}"),
        (rustc == reference["rustc"],
         f"rustc {rustc_name(rustc)} differs from this toolchain's {rustc_name(reference['rustc'])}"),
        (toolchain.get("std_notice_sha256") == reference["std_notice_sha256"],
         f"Rust std notice sha256 {toolchain.get('std_notice_sha256')} differs from this toolchain's "
         f"{reference['std_notice_sha256']}"),
        ((linker.get("kind"), linker.get("unwinder"), facts["deployment_target"])
         == (row["linker"], row["unwinder"], row["deployment_target"]),
         f"linker {linker.get('kind')}, unwinder {linker.get('unwinder')}, deployment target "
         f"{facts['deployment_target']}: not this row's"),
        ((shipped.get("path"), shipped.get("sha256"), shipped.get("size"))
         == (binary_name(target), sha256(binary), len(binary)),
         f"{binary_name(target)} sha256 {sha256(binary)} ({len(binary)} bytes) differs from build-facts "
         f"{shipped.get('sha256')} ({shipped.get('size')} bytes)"),
    ]
    return [f"{target}: {problem}" for ok, problem in checks if not ok]


def read_builds(builds, reference, partial):
    """({target: (facts, binary, facts sha256)}, problems) of the cli-build-<target> directories."""
    found, problems, present = {}, [], set()
    for entry in sorted(builds.iterdir(), key=lambda path: path.name):
        target = entry.name.removeprefix("cli-build-")
        if not entry.name.startswith("cli-build-") or target not in TARGETS or not entry.is_dir():
            problems.append(f"unexpected entry in the builds directory: {entry.name}")
            continue
        present.add(target)
        names = sorted(path.name for path in entry.iterdir())
        expected = sorted((binary_name(target), "build-facts.json"))
        problems += [f"{target}: unexpected file {name}" for name in names if name not in expected]
        missing = [name for name in expected if name not in names]
        problems += [f"{target}: no {name}" for name in missing]
        if missing:
            continue
        raw = (entry / "build-facts.json").read_bytes()
        try:
            facts = json.loads(raw)
        except ValueError:
            problems.append(f"{target}: build-facts.json is not JSON")
            continue
        binary = (entry / binary_name(target)).read_bytes()
        problems += facts_problems(target, facts, binary, reference)
        found[target] = (facts, binary, sha256(raw))
    if not partial:
        problems += [f"missing build for {target}" for target in TARGETS if target not in present]
    elif not present:
        problems.append("no build at all")
    return found, problems


def cargo_tree(env, root, target, edges):
    """{(name, version)} of the CLI's graph for TARGET along EDGES."""
    output = fact(env, ["cargo", "tree", "-p", PACKAGE, "--target", target, "-e", edges, "--prefix", "none",
                        "--format", "{p}", "--locked", "--offline"], root)
    crates = set()
    for line in filter(None, (line.strip() for line in output.splitlines())):
        match = re.fullmatch(r"(\S+) v(\S+)( .*)?", line)
        if not match:
            raise Stop(2, [f"cargo tree printed {line!r}"])
        crates.add((match.group(1), match.group(2)))
    return crates


def records(keys, lock, packages, overrides, problems):
    """[{name, version, source, checksum, license}] of KEYS, sorted by (name, version) as strings."""
    rows = []
    for name, version in sorted(keys):
        entry, package = lock.get((name, version)), packages.get((name, version))
        if entry is None or package is None:
            problems.append(f"{name} {version} is missing from Cargo.lock or cargo metadata")
            continue
        source = entry.get("source")
        if source is None and name not in WORKSPACE_CRATES:
            problems.append(f"{name} {version} is a path crate outside the reviewed workspace crates")
        elif source not in (None, CRATES_IO):
            problems.append(f"{name} {version} comes from {source}, not crates.io")
        spdx = next((item["spdx"] for item in overrides.get((name, version), []) if item.get("spdx")), None)
        license = package.get("license") or spdx
        if not license:
            problems.append(license_problem(name, version, license, set()))
        rows.append({"name": name, "version": version, "source": source, "checksum": entry.get("checksum"),
                     "license": license})
    return rows


def build_info(facts, dependencies, build_dependencies):
    info = {**facts, "schema": INFO_SCHEMA, "dependencies": dependencies, "build_dependencies": build_dependencies}
    return {key: info[key] for key in INFO_KEYS}


def source_md(info):
    """SOURCE.md: the facts naming this archive's source, and where its corresponding source is."""
    version, target, source = info["version"], info["target"], info["source"]
    commit, run_url, repository = source["commit"], info["builder"]["workflow_run"], source["repository"]
    tag = source["tag"] or f"not a release tag ({source['ref']})"
    if SOURCE_ASSET:
        gate = f"{source_name(version)} (its sha256 is in {sums_name(version)})"
        how = [f"{source_name(version)}, published with this archive, is a `git archive` of the commit",
               "above: every file the repository tracks at that commit, the build recipe included,",
               f"under `{PACKAGE}-{version}-source/`. Its pax header names the commit."]
    else:
        gate = "the repository tree at the commit above"
        how = [f"The repository tree at {repository}/tree/{commit} is the corresponding source,",
               "the build recipe included."]
    lines = [
        f"# Source of qrscan {version} for {target}", "",
        "qrscan is the command line of the QR Code & Barcode Scanner engine. This archive was built from",
        "the public repository and the commit below.", "",
        f"- Repository: {repository}", f"- Tag: {tag}", f"- Commit: {commit}", f"- Tree: {repository}/tree/{commit}",
        f"- Cargo.lock sha256: {source['cargo_lock_sha256']}",
        f"- Workflow run: {run_url or 'none (built outside GitHub Actions)'}",
        f"- Build recipe: {WORKFLOW} and scripts/cli-release.py at that commit",
        f"- Corresponding source: {gate}", "",
        "## Corresponding source", "", *how, "",
        "## Third-party crates", "",
        "Every third-party crate linked into qrscan is listed, with its version and its Cargo.lock",
        "checksum, in build-info.json (`dependencies`) and in THIRD-PARTY-LICENSES.txt. Its source",
        "is the crates.io download", "",
        "    https://static.crates.io/crates/<name>/<name>-<version>.crate", "",
        "whose sha256 equals that checksum. build-info.json also lists the crates used only to",
        "build qrscan (`build_dependencies`).", "",
        "## License and notice files", "",
        "- LICENSE: the MIT text that covers qrscan and its engine.",
        "- LICENSING.md: how the engine is licensed.",
        "- LICENSE-APACHE-2.0 and THIRD-PARTY.md: the notices of the engine's parts derived from rxing.",
        "- THIRD-PARTY-LICENSES.txt: the license and notice texts of the linked crates.",
        f"- {STD_MEMBER}: the notices of the Rust standard library linked into qrscan.", "",
        "## Signing", "",
        "qrscan is not code-signed or notarized. README.md explains how to check a download against",
        "the release's SHA256SUMS file, what that check proves, and how to run an unsigned binary.",
    ]
    return "\n".join(lines) + "\n"


def source_asset(env, root, version, commit):
    """(tar, problems): `git archive` of COMMIT under <name>-source/, whatever the local eol or umask."""
    prefix = f"{PACKAGE}-{version}-source/"
    tar = git(env, root, "-c", "core.autocrlf=false", "-c", "core.eol=lf", "-c", "tar.umask=0002",
              "archive", "--format=tar", f"--prefix={prefix}", commit, raw=True)
    try:
        with tarfile.open(fileobj=io.BytesIO(tar)) as archive:
            members = archive.getmembers()
            comment = archive.pax_headers.get("comment")
    except tarfile.TarError as err:
        return tar, [f"the source archive does not parse: {err}"]
    problems = [] if comment == commit else [f"the source archive's pax comment is {comment}, not the commit {commit}"]
    for member in members:
        if not f"{member.name}/".startswith(prefix):
            problems.append(f"source archive member {member.name} is outside {prefix}")
        elif not (member.isfile() or member.isdir()):
            problems.append(f"source archive member {member.name} is not a file or a directory")
    if not any(member.isfile() for member in members):
        problems.append("the source archive holds no file")
    return tar, problems


def assemble(args, env, root, write=write_archive, compress=gzip_bytes):
    """The release set from the builds (see the module doc); the receipt, or Stop."""
    root = root.resolve()
    builds, out = Path(os.path.abspath(args.builds)), Path(os.path.abspath(args.out))
    problems = ["--partial is refused under GitHub Actions"] if args.partial and \
        getenv(env, "GITHUB_ACTIONS") == "true" else []
    if not builds.is_dir():
        problems.append(f"the builds directory does not exist: {builds}")
    problems += filter(None, [fresh_dir_problem(out, "output directory", root)])
    pin = toolchain_pin(root)
    problems += toolchain_problems(env, pin)
    if problems:
        raise Stop(2, problems)
    commit, epoch, dirty = commit_facts(env, root)
    rustc, fields = rustc_facts(env, root)
    if dirty:
        problems.append("the working tree is dirty: the archives take their license files from it")
    if fields.get("release") != pin:
        problems.append(f"rustc -vV reports release {fields.get('release')}, not the pinned {pin}")
    if problems:
        raise Stop(2, problems)
    version, lock_text = workspace_version(root), committed(env, root, commit, "Cargo.lock")
    notice = std_notice(env, root)
    copied = {member: read_input(root, path) for member, path in COPIED.items()}
    allowed = deny_allowed(root)
    reference = {"version": version, "repository": workspace_repository(root), "profile": release_profile(root),
                 "commit": commit, "epoch": epoch, "cargo_lock_sha256": sha256(lock_text),
                 "rustc": [line for line in rustc if not line.startswith("host: ")],
                 "std_notice_sha256": sha256(notice), "ref": getenv(env, "GITHUB_REF") or None,
                 "workflow_run": builder(env)["workflow_run"]}
    found, problems = read_builds(builds, reference, args.partial)
    overrides, more = load_overrides(root)
    problems += more
    targets = [target for target in TARGETS if target in found]
    lock = {(item["name"], item["version"]): item for item in tomllib.loads(lock_text.decode("utf-8"))["package"]}
    metadata = json.loads(fact(env, ["cargo", "metadata", "--format-version", "1", "--locked", "--offline"], root))
    packages = {(item["name"], item["version"]): item for item in metadata["packages"]}
    graphs = {target: (cargo_tree(env, root, target, "normal,no-proc-macro"),
                       cargo_tree(env, root, target, "normal,build")) for target in targets}
    # License texts and expressions, once per linked registry crate.
    texts, digests = {}, {}
    for key in sorted({key for linked, _ in graphs.values() for key in linked}):
        if key not in packages or (lock.get(key) or {}).get("source") is None:
            continue
        spdx = next((item["spdx"] for item in overrides.get(key, []) if item.get("spdx")), None)
        problem = license_problem(*key, packages[key].get("license") or spdx, allowed)
        problems += [problem] if problem else []
        found_texts = crate_texts(packages[key], overrides, problems)
        digests[key] = sorted({sha256(text) for text in found_texts.values()})
        texts.update({sha256(text): text for text in found_texts.values()})
    if not args.partial:
        linked_all = {key for linked, _ in graphs.values() for key in linked}
        problems += [f"the license override for {crate} {release} matches no linked crate"
                     for crate, release in sorted(overrides) if (crate, release) not in linked_all]
    members, inventory = {}, {}
    for target in targets:
        facts, binary, facts_digest = found[target]
        linked, every = graphs[target]
        dependencies = records(linked, lock, packages, overrides, problems)
        build_only = records(every - linked, lock, packages, overrides, problems)
        third = [{**row, "texts": digests.get((row["name"], row["version"]), [])}
                 for row in dependencies if row["source"] is not None]
        info = build_info(facts, dependencies, build_only)
        members[target] = {
            STD_MEMBER: (notice, 0o644), **{name: (data, 0o644) for name, data in copied.items()},
            "SOURCE.md": (source_md(info).encode(), 0o644),
            "THIRD-PARTY-LICENSES.txt": (third_party_bytes(version, target, third, texts), 0o644),
            "build-info.json": ((json.dumps(info, indent=2) + "\n").encode(), 0o644),
            binary_name(target): (binary, 0o755)}
        inventory[target] = {"build_facts_sha256": facts_digest, "binary_sha256": sha256(binary),
                             "dependencies": len(dependencies), "third_party_crates": len(third),
                             "license_texts": len({digest for row in third for digest in row["texts"]}),
                             "build_dependencies": len(build_only)}
    problems = list(dict.fromkeys(problems))
    if problems:
        raise Stop(1, problems)
    # Every asset written twice: a writer that is not deterministic for one input set is refused.
    assets = {}
    for target in targets:
        name = archive_name(version, target)
        try:
            first, second = (write(archive_stem(version, target), members[target], epoch, TARGETS[target]["ext"])
                             for _ in range(2))
        except ValueError as err:
            raise Stop(1, [f"{name}: {err}"]) from None
        if first != second:
            problems.append(f"the archive writer is not deterministic: {name} differs between two writes")
        assets[name] = first
    if SOURCE_ASSET:
        tar, more = source_asset(env, root, version, commit)
        first, second = compress(tar), compress(tar)
        problems += more
        if first != second:
            problems.append(f"the archive writer is not deterministic: {source_name(version)} differs between "
                            "two writes")
        assets[source_name(version)] = first
    if problems:
        raise Stop(1, problems)
    sums = sums_bytes(assets)
    out.mkdir(parents=True, exist_ok=True)
    for name, data in {**assets, sums_name(version): sums}.items():
        (out / name).write_bytes(data)
    return {"schema": ASSEMBLE_SCHEMA, "verdict": "PASS", "version": version, "commit": commit,
            "partial": bool(args.partial), "targets": inventory, "double_write": "identical",
            "python": {"version": sys.version, "zlib_runtime": zlib.ZLIB_RUNTIME_VERSION},
            "assets": {name: sha256(data) for name, data in sorted(assets.items())},
            "sums": {"name": sums_name(version), "sha256": sha256(sums)}, "problems": []}


def cmd_assemble(args, env, root):
    try:
        receipt, code = assemble(args, env, root), 0
    except Stop as stop:
        receipt = {"schema": ASSEMBLE_SCHEMA, "verdict": "FAIL" if stop.code == 1 else "ERROR",
                   "problems": stop.problems}
        code = stop.code
    emit(receipt, args.receipt)
    return code


# ---------------------------------------------------------------- check, notes, targets

ENTRY_KEYS = ("name", "version", "license", "source", "checksum")


def check_release(args, env, root):
    """The license material of every CLI archive in a release directory, against
    build-info.json, deny.toml, the reviewed overrides and this checkout."""
    directory = Path(args.check_release)
    if not directory.is_dir():
        raise Stop(2, [f"the release directory does not exist: {directory}"])
    version, allowed = workspace_version(root), deny_allowed(root)
    copied = {member: read_input(root, path) for member, path in COPIED.items()}
    overrides, problems = load_overrides(root)
    seen, checked = {}, []
    for path in sorted(directory.iterdir(), key=lambda item: item.name):
        match = ARCHIVE_NAME.fullmatch(path.name)
        if not match:
            continue
        label, target = path.name, match["target"]
        checked.append(label)
        try:
            files, top = read_members(path)
            info = json.loads(files["build-info.json"])
            crates, texts = parse_third_party(files["THIRD-PARTY-LICENSES.txt"], match["version"], target)
        except (KeyError, ValueError, OSError, tarfile.TarError, zipfile.BadZipFile) as err:
            problems.append(f"{label}: unreadable license material: {err!r}")
            continue
        if (match["version"], top, info.get("target")) != (version, archive_stem(version, target), target):
            problems.append(f"{label}: version {match['version']}, top directory {top}, build-info target "
                            f"{info.get('target')}: not workspace {version}")
        problems += [f"{label}: {member} differs from {COPIED[member]}" for member, data in copied.items()
                     if files.get(member) != data]
        notice = files.get(STD_MEMBER)
        if notice is None or sha256(notice) != (info.get("toolchain") or {}).get("std_notice_sha256"):
            problems.append(f"{label}: {STD_MEMBER} is not the std notice build-info records")
        expected = [tuple(row.get(key) for key in ENTRY_KEYS) for row in info.get("dependencies") or []
                    if row.get("source") is not None]
        listed = [tuple(crate[key] for key in ENTRY_KEYS) for crate in crates]
        if listed != expected:
            problems.append(f"{label}: THIRD-PARTY-LICENSES.txt lists {[row[:2] for row in listed]}, build-info "
                            f"links {[row[:2] for row in expected]}")
        named = set()
        for crate in crates:
            name = f"{crate['name']} {crate['version']}"
            named.update(crate["texts"])
            if not crate["texts"]:
                problems.append(f"{label}: no license text for {name}")
            problems += [f"{label}: {name} names the text {digest}, which the file lacks"
                         for digest in crate["texts"] if digest not in texts]
            problem = license_problem(crate["name"], crate["version"], crate["license"], allowed)
            problems += [f"{label}: {problem}"] if problem else []
            problems += [f"{label}: {name} lacks its reviewed override {item['file']}"
                         for item in overrides.get((crate["name"], crate["version"]), [])
                         if sha256(item["text"]) not in crate["texts"]]
            if seen.setdefault((crate["name"], crate["version"]), crate) != crate:
                problems.append(f"{label}: the entry of {name} differs from another archive's")
        problems += [f"{label}: the text keyed {digest} has sha256 {sha256(text)}"
                     for digest, text in texts.items() if sha256(text) != digest]
        problems += [f"{label}: no crate names the text {digest}" for digest in sorted(set(texts) - named)]
    if not checked:
        problems.append(f"no CLI archive in {directory}")
    problems = list(dict.fromkeys(problems))
    return {"schema": LICENSES_SCHEMA, "verdict": "FAIL" if problems else "PASS", "archives": checked,
            "crates": len(seen), "problems": problems}


def cmd_licenses(args, env, root):
    try:
        receipt = check_release(args, env, root)
        code = 1 if receipt["problems"] else 0
    except Stop as stop:
        receipt = {"schema": LICENSES_SCHEMA, "verdict": "FAIL" if stop.code == 1 else "ERROR",
                   "problems": stop.problems}
        code = stop.code
    emit(receipt, args.receipt)
    return code


def unsigned_statement(version):
    labels = [row["label"] for row in TARGETS.values()]
    lines = ["### Prebuilt qrscan archives", "",
             f"The `{PACKAGE}-{version}-<target>` archives hold the qrscan command line for",
             f"{', '.join(labels[:-1])} and {labels[-1]}.",
             f"`{sums_name(version)}` lists the sha256 of every other CLI asset. It is an asset of",
             "this same release, so it detects a damaged download, not a substituted release."]
    if SOURCE_ASSET:
        lines.append(f"`{source_name(version)}` is the corresponding source, a git archive of the tagged commit.")
    lines += ["", "The binaries are not code-signed or notarized: there is no Apple Developer ID signature, no",
              "notarization and no Authenticode signature. Each archive's README.md gives the steps to verify",
              "the download and run the binary."]
    return "\n".join(lines) + "\n"


def release_notes(version, root):
    """The dated CHANGELOG section of VERSION, then the statement on the prebuilt archives."""
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise Stop(2, [f"--version {version!r} is not X.Y.Z"])
    workspace = workspace_version(root)
    if version != workspace:
        raise Stop(1, [f"version {version} is not the workspace version {workspace}"])
    changelog = read_input(root, "CHANGELOG.md").decode("utf-8")
    heading = re.search(rf"^## {re.escape(version)} — \d{{4}}-\d{{2}}-\d{{2}}.*$", changelog, re.MULTILINE)
    if not heading:
        raise Stop(1, [f"CHANGELOG.md has no dated '## {version} — YYYY-MM-DD' section"])
    following = re.search(r"^## ", changelog[heading.end():], re.MULTILINE)
    end = heading.end() + following.start() if following else len(changelog)
    return changelog[heading.start():end].rstrip("\n") + "\n\n" + unsigned_statement(version)


def cmd_notes(args, env, root):
    sys.stdout.write(release_notes(args.version, root))
    return 0


def targets_receipt(root):
    version = workspace_version(root)
    return {"schema": TARGETS_SCHEMA, "package": PACKAGE, "binary": BINARY, "version": version,
            "source_asset": SOURCE_ASSET, "targets": [{"target": target, **row} for target, row in TARGETS.items()],
            "assets": asset_names(version)}


def cmd_targets(args, env, root):
    emit(targets_receipt(root))
    return 0


# ---------------------------------------------------------------- release files

# qualify, attach-plan, readback and anchor read files only: the gh steps that
# wrote them held the token, and these commands refuse to run beside one.
TOKENS = ("GH_TOKEN", "GITHUB_TOKEN")
RELEASE_TAG = re.compile(r"v([0-9]+\.[0-9]+\.[0-9]+)")
HEX40, HEX64 = re.compile(r"[0-9a-f]{40}"), re.compile(r"[0-9a-f]{64}")
CLI_PREFIX = f"{PACKAGE}-"
WORKFLOW_NAME = "cli-archives"
# The events whose runs can be on a tag, both needing write access. A pull_request, a fork's too,
# runs its own copy of this workflow and script under a branch name it chooses, and headBranch
# alone does not tell a tag from a branch of the same name.
TAG_EVENTS = ("push", "workflow_dispatch")
PLAN_SCHEMA = "qrscan-cli-attach-plan/1"
READBACK_SCHEMA = "qrscan-cli-readback/1"
QUALIFICATION_SCHEMA = "qrscan-cli-qualification/1"
ANCHOR_SCHEMA = "qrscan-cli-anchor/1"
CONSUMER_SCHEMA = "qrscan-cli-consumer/1"
FETCH_SCHEMA = "qrscan-cli-fetch/1"


def without_token(env, command):
    held = [name for name in TOKENS if getenv(env, name) is not None]
    if held:
        raise Stop(2, [f"{' and '.join(held)} set: {command} reads files and runs without a token"])


def flag(name):
    return "--" + name.replace("_", "-")


def usage(args, command, required, refused=()):
    """Stop(2) naming each missing option of REQUIRED and each given option of REFUSED."""
    problems = [f"{command} needs {flag(name)}" for name in required if not getattr(args, name)]
    problems += [f"{command} does not take {flag(name)}" for name in refused if getattr(args, name)]
    if problems:
        raise Stop(2, problems)


def tag_version(tag):
    """X.Y.Z of a vX.Y.Z tag (exit 2 otherwise)."""
    match = RELEASE_TAG.fullmatch(tag or "")
    if not match:
        raise Stop(2, [f"--tag {tag!r} is not vX.Y.Z"])
    return match.group(1)


def full_commit(commit):
    if not HEX40.fullmatch(commit or ""):
        raise Stop(2, [f"--commit {commit!r} is not a full 40-hex commit"])
    return commit


def dig(value, *keys):
    """VALUE[key][key]..., None where a level is missing or not a mapping."""
    for key in keys:
        value = value.get(key) if isinstance(value, dict) else None
    return value


def read_json(path, what):
    """PATH's JSON (exit 2 when unreadable)."""
    try:
        return json.loads(Path(path).read_bytes())
    except OSError as err:
        raise Stop(2, [f"cannot read the {what} {path}: {err.strerror}"]) from None
    except ValueError:
        raise Stop(2, [f"the {what} {path} is not JSON"]) from None


def read_record(path):
    """{asset name: (sha256, path)} of the inspector's --record file: one sha256sum line per file."""
    try:
        lines = Path(path).read_bytes().decode("utf-8").split("\n")
    except OSError as err:
        raise Stop(2, [f"cannot read the inspected record {path}: {err.strerror}"]) from None
    except UnicodeDecodeError:
        raise Stop(2, [f"the inspected record {path} is not UTF-8"]) from None
    entries = {}
    for line in lines[:-1] if lines[-1] == "" else lines:
        match = re.fullmatch(r"([0-9a-f]{64})  (.+)", line)
        name = match.group(2).rsplit("/", 1)[-1] if match else None
        if name is None or name in entries:
            raise Stop(2, [f"the inspected record {path} has a malformed or repeated line {line!r}"])
        entries[name] = (match.group(1), match.group(2))
    return entries


def folder_files(path, what, must_exist=True):
    """{name: bytes} of the regular files directly in PATH; a missing PATH holds none unless MUST_EXIST."""
    folder = Path(path)
    if not folder.is_dir():
        if must_exist or folder.exists():
            raise Stop(2, [f"the {what} {path} is not a directory"])
        return {}
    return {entry.name: entry.read_bytes() for entry in sorted(folder.iterdir()) if entry.is_file()}


def release_view(path):
    """(tag, draft, target, {CLI asset name: asset}, [other asset names]) of a
    `gh release view --json tagName,isDraft,targetCommitish,assets` file (exit 2 when malformed)."""
    view = read_json(path, "release view")
    assets = view.get("assets") if isinstance(view, dict) else None
    shaped = isinstance(assets, list) and all(isinstance(item, dict) and isinstance(item.get("name"), str)
                                               for item in assets)
    names = [item["name"] for item in assets] if shaped else []
    if not shaped or len(set(names)) != len(names) or not isinstance(view.get("isDraft"), bool) or \
            not isinstance(view.get("tagName"), str) or not isinstance(view.get("targetCommitish"), str):
        raise Stop(2, [f"{path} is not `gh release view --json tagName,isDraft,targetCommitish,assets` output"])
    cli = {item["name"]: item for item in assets if item["name"].startswith(CLI_PREFIX)}
    others = sorted(name for name in names if not name.startswith(CLI_PREFIX))
    return view["tagName"], view["isDraft"], view["targetCommitish"], cli, others


def asset_problems(name, asset, data, where):
    """How the release's listing of asset NAME disagrees with DATA, the bytes downloaded from it."""
    problems = []
    if asset.get("state", "uploaded") != "uploaded":
        problems.append(f"{name} on the {where} is in state {asset['state']}, not uploaded: an interrupted upload")
    if "size" in asset and asset["size"] != len(data):
        problems.append(f"{name}: the {where} lists {asset['size']} bytes, its download has {len(data)}")
    digest = asset.get("digest")
    if isinstance(digest, str) and digest.startswith("sha256:") and digest != f"sha256:{sha256(data)}":
        problems.append(f"{name}: the {where} lists {digest}, its download has sha256 {sha256(data)}")
    return problems


def append_text(path, text):
    """TEXT appended to PATH (a GitHub step summary or output file), with LF line endings."""
    with open(path, "a", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


# ---------------------------------------------------------------- attach-plan

NO_RELEASE = "no release for {tag}: the owner creates the draft (RELEASING §5), then re-runs this job"
PUBLISHED = "a published release is never completed in place; ship the next patch version (RELEASING §6)"
DRAFT_NEXT = ("nothing was uploaded: the owner deletes the CLI assets from the draft, then dispatches mode build "
              "on the tag (RELEASING §6)")
PLAN_OPTIONS = ("commit", "view", "present", "release_dir", "record", "out", "upload_list")


def plan_list(args, tag):
    """--phase list: exactly one release, draft or published, carries TAG."""
    releases = read_json(args.list, "release list")
    if not isinstance(releases, list) or not all(isinstance(item, dict) and isinstance(item.get("tagName"), str)
                                                and isinstance(item.get("isDraft"), bool) for item in releases):
        raise Stop(2, [f"{args.list} is not `gh release list --json tagName,isDraft` output"])
    kinds = ["draft" if item["isDraft"] else "published" for item in releases if item["tagName"] == tag]
    problems = [NO_RELEASE.format(tag=tag)] if not kinds else [] if len(kinds) == 1 else [
        f"{len(kinds)} releases carry {tag} ({', '.join(kinds)}): exactly one may, the owner's draft"]
    return {"schema": PLAN_SCHEMA, "phase": "list", "verdict": "FAIL" if problems else "PASS", "tag": tag,
            "releases": kinds, "problems": problems}


def plan_upload(args, tag, version):
    """--phase plan: what to upload into the one release, from the files the gh steps wrote.
    Only the owner's draft targeting this commit takes assets: the missing ones, archives, then
    the source, then SHA256SUMS. A published release is complete or refused, never completed."""
    commit, expected = full_commit(args.commit), asset_names(version)
    view_tag, draft, target, assets, others = release_view(args.view)
    record = read_record(args.record)
    local = folder_files(args.release_dir, "release directory")
    present = folder_files(args.present, "present directory", must_exist=False)
    if sorted(present) != sorted(assets):
        raise Stop(2, [f"the release lists the CLI assets {sorted(assets)}, the present directory holds "
                       f"{sorted(present)}"])
    paths = {name: os.path.join(args.release_dir, name) for name in expected}
    # Each file the upload step may send must pass its `grep -qxF "$(sha256sum -- "$file")"` check.
    problems = [f"the release directory has no {name}" for name in expected if name not in local]
    problems += [f"{name}: '{sha256(local[name])}  {paths[name]}' is not in the inspected record"
                 for name in expected if name in local and record.get(name) != (sha256(local[name]), paths[name])]
    if view_tag != tag:
        problems.append(f"the release view is of {view_tag}, not {tag}")
    if target != commit:
        problems.append(f"{tag} targets {target}, not this run's commit {commit}")
    where = "draft" if draft else "published release"
    identical = [name for name in expected if name in present and present[name] == local.get(name)]
    missing = [name for name in expected if name not in assets]
    upload, after = [], None
    if not problems:
        problems += [f"{name} is on the {where} but is not an asset of this set" for name in sorted(assets)
                     if name not in expected]
        for name in expected:
            if name in present:
                problems += asset_problems(name, assets[name], present[name], where)
                if name not in identical:
                    problems.append(f"{name} differs: the {where} holds sha256 {sha256(present[name])}, the "
                                    f"inspected set {sha256(local[name])}")
        if draft and expected[-1] in assets and missing:
            verb = "is" if len(missing) == 1 else "are"
            problems.append(f"{expected[-1]} is on the draft while {', '.join(missing)} {verb} missing: it goes "
                            "last, after every other asset")
        if not draft and (problems or missing):
            problems = [PUBLISHED, *problems, *(f"{name} is missing from the published release" for name in missing)]
        elif problems:
            after = DRAFT_NEXT
        elif draft:
            upload = [paths[name] for name in missing]
    return {"schema": PLAN_SCHEMA, "phase": "plan", "verdict": "FAIL" if problems else "PASS", "tag": tag,
            "commit": commit, "draft": draft, "target": target,
            "present": {name: sha256(data) for name, data in present.items()}, "identical": identical,
            "upload": upload, "ignored": others, "next": after, "problems": problems}


def cmd_attach_plan(args, env, root):
    """--phase list prints its verdict. --phase plan writes the plan to --out and, once it passes,
    the files to upload to --upload-list, one per line (removed when the plan is refused)."""
    without_token(env, "attach-plan")
    if args.phase == "list":
        usage(args, "attach-plan --phase list", ("tag", "list"), PLAN_OPTIONS)
        tag_version(args.tag)
        receipt = plan_list(args, args.tag)
        emit(receipt)
    else:
        usage(args, "attach-plan --phase plan", ("tag", *PLAN_OPTIONS), ("list",))
        receipt = plan_upload(args, args.tag, tag_version(args.tag))
        upload = Path(args.upload_list)
        if receipt["verdict"] == "PASS":
            upload.write_bytes("".join(f"{path}\n" for path in receipt["upload"]).encode())
        else:
            upload.unlink(missing_ok=True)
        emit(receipt, args.out)
    return 0 if receipt["verdict"] == "PASS" else 1


# ---------------------------------------------------------------- readback


def readback(args, env):
    """The CLI assets on the release after the upload: exactly the set, each one the inspected bytes,
    the release targeting this commit."""
    tag, commit = args.tag, full_commit(args.commit)
    expected = asset_names(tag_version(tag))
    view_tag, draft, target, assets, others = release_view(args.view)
    record = read_record(args.record)
    files = folder_files(args.dir, "readback directory")
    where = "draft" if draft else "published release"
    problems = [] if view_tag == tag else [f"the release view is of {view_tag}, not {tag}"]
    if target != commit:
        problems.append(f"{tag} targets {target}, not this run's commit {commit}")
    problems += [f"{name} is on the {where} but is not an asset of this set" for name in sorted(assets)
                 if name not in expected]
    problems += [f"{name} was downloaded, but the {where} does not list it" for name in sorted(files)
                 if name not in assets]
    problems += [f"the inspected record names {name}, not an asset of this set" for name in sorted(record)
                 if name not in expected]
    for name in expected:
        if name not in assets:
            problems.append(f"{name} is missing from the {where}")
        elif name not in files:
            problems.append(f"{name} is on the {where} but was not downloaded")
        else:
            problems += asset_problems(name, assets[name], files[name], where)
            if name not in record:
                problems.append(f"{name} has no line in the inspected record")
            elif sha256(files[name]) != record[name][0]:
                problems.append(f"{name}: the {where} serves sha256 {sha256(files[name])}, the inspected set "
                                f"{record[name][0]}")
    sums = expected[-1]
    return {"schema": READBACK_SCHEMA, "verdict": "FAIL" if problems else "PASS", "tag": tag, "commit": commit,
            "draft": draft, "target": target, "run_id": getenv(env, "GITHUB_RUN_ID"),
            "assets": {name: {"sha256": sha256(files[name]), "size": len(files[name])} for name in expected
                       if name in files},
            "sums": {"name": sums, "sha256": sha256(files[sums]) if sums in files else None},
            "ignored": others, "problems": problems}


def readback_summary(receipt):
    """The step summary: the asset table, the SHA256SUMS sha256 and, once it passes, this run's id."""
    kind, sums = "draft" if receipt["draft"] else "published", receipt["sums"]["sha256"]
    lines = [f"### qrscan CLI assets on {receipt['tag']}: {receipt['verdict']}", "",
             f"The {kind} release targets `{receipt['target']}`.", "",
             "| Asset | Bytes | sha256 |", "|---|---:|---|"]
    lines += [f"| {name} | {item['size']} | `{item['sha256']}` |" for name, item in receipt["assets"].items()]
    lines += ["", f"SHA256SUMS sha256: `{sums}`" if sums else "SHA256SUMS: not downloaded", ""]
    if receipt["problems"]:
        lines += [f"- {problem}" for problem in receipt["problems"]]
    else:
        run_id = receipt["run_id"] or "none (outside GitHub Actions)"
        lines.append(f"This run's id is {run_id}: once the release is published, it is the `qualified_run` input "
                     "of the public-download dispatch.")
    return "\n".join(lines) + "\n"


def cmd_readback(args, env, root):
    without_token(env, "readback")
    usage(args, "readback", ("tag", "commit", "view", "dir", "record"))
    tag_version(args.tag)
    receipt = readback(args, env)
    if args.summary:
        append_text(args.summary, readback_summary(receipt))
    emit(receipt)
    return 0 if receipt["verdict"] == "PASS" else 1


# ---------------------------------------------------------------- qualify


def consumer_rows():
    """[(label, target, container row or None)]: each target's native consumer, then each container."""
    rows = [(target, target, None) for target in TARGETS]
    return rows + [(f"{target} in {box['image']}", target, box) for target, row in TARGETS.items()
                   for box in row["containers"]]


def row_key(target, image):
    """A consumer row: (target, the image name without its digest, or None on the native host)."""
    return target, (image.split("@", 1)[0] if isinstance(image, str) else None)


def scan_receipts(folder):
    """({kind: [(path below FOLDER, JSON)]}, problems) of every *.json under FOLDER, known by content:
    consumer and fetch receipts by schema, the native-floor --policy cli report by its policy."""
    found, problems = {"consumer": [], "fetch": [], "floor": []}, []
    for path in sorted(path for path in Path(folder).rglob("*.json") if path.is_file()):
        label = path.relative_to(folder).as_posix()
        try:
            data = json.loads(path.read_bytes())
        except (OSError, ValueError):
            problems.append(f"{label} is not JSON")
            continue
        schema = dig(data, "schema")
        if schema == CONSUMER_SCHEMA or schema == FETCH_SCHEMA:
            found["consumer" if schema == CONSUMER_SCHEMA else "fetch"].append((label, data))
        elif dig(data, "policy") == "cli" and isinstance(dig(data, "binaries"), list):
            found["floor"].append((label, data))
    return found, problems


def release_set(folder, version):
    """({asset SHA256SUMS lists: sha256}, the SHA256SUMS sha256, problems) of the release directory."""
    expected = asset_names(version)
    files = folder_files(folder, "release directory")
    problems = [f"the release directory has no {name}" for name in expected if name not in files]
    problems += [f"the release directory holds {name}, not an asset of this set" for name in sorted(files)
                 if name not in expected]
    listed, sums = {name: files[name] for name in expected[:-1] if name in files}, files.get(expected[-1])
    if sums is not None and sums != sums_bytes(listed):
        problems.append(f"{expected[-1]} does not list the release directory's assets exactly")
    return {name: sha256(data) for name, data in listed.items()}, None if sums is None else sha256(sums), problems


def floor_problems(floors, release, version):
    """({GNU target: unwinder}, problems): the one native-floor --policy cli report judged each
    archive's executable once, and each GNU archive's build-info.json names the unwinder it judged."""
    if len(floors) != 1:
        return {}, [f"{len(floors)} native-floor --policy cli reports among the receipts, expected 1"]
    label, floor = floors[0]
    verdict = floor.get("verdict")
    problems = [] if verdict == "PASS" else [f"{label}: the native-floor verdict is {verdict}"]
    unwinders = {}
    for target in TARGETS:
        name = archive_name(version, target)
        member = f"{name}!{archive_stem(version, target)}/{binary_name(target)}"
        judged = [item for item in floor["binaries"] if dig(item, "input") == member]
        if len(judged) != 1 or judged[0].get("target") != target:
            problems.append(f"{label}: judged {member} {len(judged)} times, expected once as {target}")
            continue
        if not target.endswith("-linux-gnu"):
            continue
        try:
            files, _top = read_members(Path(release) / name)
            unwinders[target] = dig(json.loads(files["build-info.json"]), "linker", "unwinder")
        except (KeyError, ValueError, OSError, tarfile.TarError, zipfile.BadZipFile) as err:
            problems.append(f"{name}: no readable build-info.json ({type(err).__name__})")
            continue
        if judged[0].get("unwinder") != unwinders[target]:
            problems.append(f"{target}: build-info.json names the unwinder {unwinders[target]}, the floor report "
                            f"judged {judged[0].get('unwinder')}")
    return unwinders, problems


def fetch_facts(fetches, anchor_sums):
    """(version, {asset SHA256SUMS lists: sha256}, the fetch record, problems) of the anonymous
    downloads: each fetch PASS without a token, one release, every asset of its set fetched alike,
    SHA256SUMS hashing to the anchor."""
    problems, hashes, releases = [], {}, []
    if not fetches:
        problems.append(f"no {FETCH_SCHEMA} receipt among the receipts")
    for label, receipt in fetches:
        state = tuple(receipt.get(key) for key in ("verdict", "exit", "mode", "token_in_env"))
        if state != ("PASS", 0, "release", False) or receipt.get("problems") != []:
            problems.append(f"{label}: fetch verdict {state[0]} (exit {state[1]}, mode {state[2]}, token in env "
                            f"{state[3]})")
        releases.append(f"{receipt.get('repository')} {receipt.get('tag')}")
        for item in receipt.get("assets") if isinstance(receipt.get("assets"), list) else []:
            name, digest = str(dig(item, "name")), dig(item, "sha256")
            if hashes.setdefault(name, digest) != digest:
                problems.append(f"{label}: fetched {name} of sha256 {digest}, another fetch got {hashes[name]}")
    repository, _, tag = (releases[0] if releases else "None None").partition(" ")
    match = RELEASE_TAG.fullmatch(tag)
    if len(set(releases)) > 1 or not match:
        problems.append(f"the fetch receipts name {sorted(set(releases))}, not one vX.Y.Z release")
        return None, {}, {"repository": repository, "tag": tag, "assets": hashes}, problems
    expected = asset_names(match.group(1))
    problems += [f"no fetch receipt holds {name}" for name in expected if name not in hashes]
    problems += [f"a fetch receipt holds {name}, not an asset of this set" for name in sorted(hashes)
                 if name not in expected]
    if expected[-1] in hashes and hashes[expected[-1]] != anchor_sums:
        problems.append(f"the fetched {expected[-1]} has sha256 {hashes[expected[-1]]}, the anchor's is {anchor_sums}")
    lines = {name: hashes[name] for name in expected[:-1] if name in hashes}
    return match.group(1), lines, {"repository": repository, "tag": tag, "assets": hashes}, problems


def consumer_problems(label, receipt, target, box, want):
    """How one consumer receipt falls short. WANT: version, sums, lines, commit and contract."""
    problems = []
    if (receipt.get("verdict"), receipt.get("exit"), receipt.get("problems")) != ("PASS", 0, []):
        problems.append(f"{label}: the consumer's verdict is {receipt.get('verdict')} (exit {receipt.get('exit')})")
    if receipt.get("version") != want["version"]:
        problems.append(f"{label}: release {receipt.get('version')}, expected {want['version']}")
    if receipt.get("sums_sha256") != want["sums"]:
        problems.append(f"{label}: judged a SHA256SUMS of sha256 {receipt.get('sums_sha256')}, expected {want['sums']}")
    name = archive_name(want["version"], target) if want["version"] else None
    judged = (dig(receipt, "archive", "name"), dig(receipt, "archive", "sha256"))
    if judged != (name, want["lines"].get(name)):
        problems.append(f"{label}: judged {judged[0]} of sha256 {judged[1]}, its SHA256SUMS line says "
                        f"{want['lines'].get(name)}")
    for key, commit in (("consumer_commit", want["commit"]), ("contract_commit", want["contract"])):
        if receipt.get(key) != commit:
            problems.append(f"{label}: {key} {receipt.get(key)}, expected {commit}")
    if box is not None:
        libc = "musl" if "musl" in box else "glibc"
        found = (dig(receipt, "container", libc), dig(receipt, "container", "platform"))
        if found != (box[libc], box["platform"]):
            problems.append(f"{label}: {libc} {found[0]} on {found[1]}, expected {box[libc]} on {box['platform']}")
    cases = [case for case in receipt.get("cases") or [] if isinstance(case, dict)]
    unwind = [case for case in cases if case.get("id") == "unwind"]
    if len(unwind) != 1:
        problems.append(f"{label}: {len(unwind)} unwind cases, expected 1")
    elif (unwind[0].get("ok"), unwind[0].get("exit")) != (True, 101):
        problems.append(f"{label}: unwind did not pass (exit {unwind[0].get('exit')}, expected 101): the panic must "
                        "unwind")
    panics = dig(receipt, "truth", "engine_panics_total")
    if type(panics) is not int or panics != 0:
        problems.append(f"{label}: engine-panics: the truth set reports trace.engine_panics {panics}, expected 0")
    truth = [case for case in cases if str(case.get("id")).startswith("truth-set/")]
    count = dig(receipt, "truth", "cases")
    if type(count) is not int or count < 1 or len(truth) != count or any(case.get("ok") is not True for case in truth):
        passed = sum(case.get("ok") is True for case in truth)
        problems.append(f"{label}: {passed} of {len(truth)} truth-set cases passed, the truth set holds {count}")
    return problems


def identities_problems(judged, anchor):
    """(the one identities digest, problems): every consumer's against the anchor's, or the first's."""
    digests = [(label, dig(receipt, "truth", "identities_sha256")) for label, receipt in judged]
    valid = [(label, digest) for label, digest in digests if isinstance(digest, str) and HEX64.fullmatch(digest)]
    reference = ("the anchor", anchor) if anchor else (valid[0] if valid else (None, None))
    problems = [f"{label}: identities_sha256 {digest!r} is not a sha256" for label, digest in digests
                if (label, digest) not in valid]
    problems += [f"{label}: identities_sha256 {digest}, {reference[0]} reports {reference[1]}"
                 for label, digest in valid if digest != reference[1]]
    return reference[1], problems


def skipped_cases(judged):
    """[{id, reason, rows}] of the cases the consumers did not execute, by first appearance."""
    found = {}
    for label, receipt in judged:
        for item in receipt.get("not_executed") or []:
            found.setdefault((str(dig(item, "id")), str(dig(item, "reason"))), []).append(label)
    return [{"id": key[0], "reason": key[1], "rows": rows} for key, rows in found.items()]


def qualify(args, env, root):
    """The agreement of the thirteen consumer receipts (see the module doc); the qualification receipt."""
    folder = Path(args.receipts)
    if not folder.is_dir():
        raise Stop(2, [f"the receipts directory {folder} is not a directory"])
    commit = git(env, root, "rev-parse", "HEAD^{commit}").strip()
    if not HEX40.fullmatch(commit):
        raise Stop(2, [f"git reports HEAD^{{commit}} {commit!r}"])
    found, problems = scan_receipts(folder)
    if args.public:
        version, lines, fetched, more = fetch_facts(found["fetch"], args.anchor_sums_sha256)
        sums, unwinders = args.anchor_sums_sha256, None
    else:
        version = workspace_version(root)
        lines, sums, more = release_set(args.release_dir, version)
        unwinders, floor = floor_problems(found["floor"], args.release_dir, version)
        more += floor
    problems += more
    rows, by_row = consumer_rows(), {}
    for path, receipt in found["consumer"]:
        key = row_key(receipt.get("target"), dig(receipt, "container", "image"))
        by_row.setdefault(key, []).append((path, receipt))
    known = {row_key(target, box and box["image"]) for _label, target, box in rows}
    problems += [f"{path}: a consumer receipt for {key[0]}{' in ' + key[1] if key[1] else ''}, not a row of this "
                 "release" for key, items in by_row.items() if key not in known for path, _receipt in items]
    firsts = [by_row.get(row_key(target, box and box["image"]), [])[:1] for _label, target, box in rows]
    contract = next((items[0][1].get("contract_commit") for items in firsts if items), None)
    if args.public and not (isinstance(contract, str) and HEX40.fullmatch(contract)):
        problems.append(f"the consumers name the contract commit {contract!r}, not a full commit")
    want = {"version": version, "sums": sums, "lines": lines, "commit": commit,
            "contract": contract if args.public else commit}
    judged, native, containers = [], [], []
    for label, target, box in rows:
        items = by_row.get(row_key(target, box and box["image"]), [])
        if len(items) != 1:
            problems.append(f"{len(items)} consumer receipts for {label}: {', '.join(path for path, _ in items)}"
                            if items else f"no consumer receipt for {label}")
            continue
        path, receipt = items[0]
        judged.append((label, receipt))
        problems += consumer_problems(label, receipt, target, box, want)
        entry = {"target": target, "receipt": path, "verdict": receipt.get("verdict")}
        if box is None:
            host = {key: dig(receipt, "host", key) for key in ("os", "machine")}
            native.append({**entry, "host": host})
        else:
            container = {**entry, "image": dig(receipt, "container", "image"), "platform": box["platform"],
                         "glibc": dig(receipt, "container", "glibc")}
            if "musl" in box:
                container["musl"] = dig(receipt, "container", "musl")
            containers.append(container)
    identities, more = identities_problems(judged, args.anchor_identities if args.public else None)
    problems = list(dict.fromkeys(problems + more))
    receipt = {"schema": QUALIFICATION_SCHEMA, "verdict": "FAIL" if problems else "PASS", "version": version,
               "commit": commit, **{key: getenv(env, name) for key, name in (
                   ("github_sha", "GITHUB_SHA"), ("ref", "GITHUB_REF"), ("event", "GITHUB_EVENT_NAME"),
                   ("run_id", "GITHUB_RUN_ID"), ("run_attempt", "GITHUB_RUN_ATTEMPT"))},
               "sums_sha256": sums, "archives": lines, "native": native, "containers": containers,
               "unwinders": unwinders, "identities_sha256": identities, "not_executed": skipped_cases(judged),
               "problems": problems}
    if args.public:
        receipt.update(anchor={"sums_sha256": args.anchor_sums_sha256, "identities_sha256": args.anchor_identities,
                               "contract_commit": contract}, fetch=fetched,
                       attestation={"claimed": False, "reason": "gh release verify runs in its own step, only "
                                                                "with expect_immutable"})
        receipt["problems"] = receipt.pop("problems")
    return receipt


def qualification_summary(receipt):
    what = "public download" if "anchor" in receipt else "release set"
    lines = [f"### qrscan {receipt['version']} CLI qualification, {what}: {receipt['verdict']}", "",
             "| Consumer | Receipt | Verdict |", "|---|---|---|"]
    lines += [f"| {row['target']} | {row['receipt']} | {row['verdict']} |" for row in receipt["native"]]
    lines += [f"| {row['target']} in {row['image']} | {row['receipt']} | {row['verdict']} |"
              for row in receipt["containers"]]
    lines += ["", f"SHA256SUMS sha256 `{receipt['sums_sha256']}`, identities sha256 "
                  f"`{receipt['identities_sha256']}`."]
    lines += ["", *(f"- {problem}" for problem in receipt["problems"])] if receipt["problems"] else []
    return "\n".join(lines) + "\n"


def cmd_qualify(args, env, root):
    """--out receives the qualification, printed too; --summary and, once it passes, --github-output
    (sums_sha256 and commit) are appended to."""
    without_token(env, "qualify")
    anchors = ("anchor_sums_sha256", "anchor_identities")
    if args.public:
        usage(args, "qualify --public", (*anchors, "receipts", "out"), ("release_dir", "github_output"))
        bad = [f"{flag(name)} {getattr(args, name)!r} is not 64 lowercase hex digits" for name in anchors
               if not HEX64.fullmatch(getattr(args, name))]
        if bad:
            raise Stop(2, bad)
    else:
        usage(args, "qualify", ("release_dir", "receipts", "out"), anchors)
    receipt = qualify(args, env, root)
    emit(receipt, args.out)
    if args.summary:
        append_text(args.summary, qualification_summary(receipt))
    if args.github_output and receipt["verdict"] == "PASS":
        append_text(args.github_output, f"sums_sha256={receipt['sums_sha256']}\ncommit={receipt['commit']}\n")
    return 0 if receipt["verdict"] == "PASS" else 1


# ---------------------------------------------------------------- anchor


def anchor_inputs(args):
    """The dispatch inputs: a vX.Y.Z tag, a run id and an optional SHA256SUMS sha256 (exit 2 otherwise)."""
    problems = [] if RELEASE_TAG.fullmatch(args.tag or "") else [f"--tag {args.tag!r} is not vX.Y.Z"]
    if not re.fullmatch(r"[0-9]+", args.run or ""):
        problems.append(f"--run {args.run!r} is not a workflow run id")
    if args.sums_sha256 and not HEX64.fullmatch(args.sums_sha256):
        problems.append(f"--sums-sha256 {args.sums_sha256!r} is not 64 lowercase hex digits")
    if problems:
        raise Stop(2, problems)


def anchor(args):
    """The tag run behind a public download, from its qualification and `gh run view` of it: that
    workflow, completed with success, a push or workflow_dispatch (TAG_EVENTS) whose headBranch is
    the tag and whose headSha is the commit and GITHUB_SHA the qualification recorded."""
    tag, run = args.tag, args.run
    qualification = read_json(args.qualification, "qualification")
    view = read_json(args.run_view, "run view")
    if not isinstance(qualification, dict) or not isinstance(view, dict):
        raise Stop(2, ["the qualification and the run view are JSON objects"])
    q, v = qualification.get, view.get
    problems = [] if v("workflowName") == WORKFLOW_NAME else [
        f"run {run} belongs to the workflow {v('workflowName')}, not {WORKFLOW_NAME}"]
    if (v("status"), v("conclusion")) != ("completed", "success"):
        problems.append(f"run {run} is {v('status')} with conclusion {v('conclusion') or 'none'}, not completed with "
                        "success")
    if v("headBranch") != tag:
        problems.append(f"run {run} ran on {v('headBranch')}, not the tag {tag}")
    if v("event") not in TAG_EVENTS:
        problems.append(f"run {run} was a {v('event')} event, not a push or workflow_dispatch: only those run on a tag")
    if v("headSha") != q("github_sha"):
        problems.append(f"run {run} ran on {v('headSha')}, the qualification records GITHUB_SHA {q('github_sha')}")
    if q("commit") != v("headSha"):
        problems.append(f"the qualification's commit {q('commit')} is not the run's headSha {v('headSha')}")
    if v("event") != q("event"):
        problems.append(f"run {run} was a {v('event')} event, the qualification records {q('event')}")
    if (q("schema"), q("verdict")) != (QUALIFICATION_SCHEMA, "PASS"):
        problems.append(f"the qualification is {q('schema')} {q('verdict')}, not {QUALIFICATION_SCHEMA} PASS")
    if (q("ref"), q("version")) != (f"refs/tags/{tag}", tag[1:]):
        problems.append(f"the qualification is of {q('ref')} ({q('version')}), not refs/tags/{tag}")
    if q("run_id") != run:
        problems.append(f"the qualification was written by run {q('run_id')}, not {run}")
    for key, pattern in (("commit", HEX40), ("sums_sha256", HEX64), ("identities_sha256", HEX64)):
        if not (isinstance(q(key), str) and pattern.fullmatch(q(key))):
            problems.append(f"the qualification's {key} is {q(key)!r}")
    if args.sums_sha256 and q("sums_sha256") != args.sums_sha256:
        problems.append(f"--sums-sha256 {args.sums_sha256} is not the qualification's {q('sums_sha256')}")
    return {"schema": ANCHOR_SCHEMA, "phase": "anchor", "verdict": "FAIL" if problems else "PASS", "tag": tag,
            "run": run, "workflow": v("workflowName"), "head_sha": v("headSha"), "event": v("event"),
            **{key: q(key) for key in ("sums_sha256", "commit", "identities_sha256")}, "problems": problems}


def cmd_anchor(args, env, root):
    """--validate checks the dispatch inputs only. Otherwise, once the anchor holds, sums_sha256,
    commit and identities_sha256 are appended to --github-output."""
    without_token(env, "anchor")
    files = ("qualification", "run_view", "github_output")
    if args.validate:
        usage(args, "anchor --validate", ("tag", "run"), files)
        anchor_inputs(args)
        receipt = {"schema": ANCHOR_SCHEMA, "phase": "validate", "verdict": "PASS", "tag": args.tag, "run": args.run,
                   "problems": []}
    else:
        usage(args, "anchor", ("tag", "run", *files))
        anchor_inputs(args)
        receipt = anchor(args)
        if receipt["verdict"] == "PASS":
            append_text(args.github_output, "".join(f"{key}={receipt[key]}\n" for key in (
                "sums_sha256", "commit", "identities_sha256")))
    emit(receipt)
    return 0 if receipt["verdict"] == "PASS" else 1


# ---------------------------------------------------------------- workflow matrices


def expected_matrices():
    """{job: include rows} the CLI workflow's matrices must hold, all derived from TARGETS."""
    def native(runner):
        return [{"target": target, "runner": row[runner]} for target, row in TARGETS.items()]
    boxes = [{"target": target, "runner": box["runner"], "image": box["image"], "platform": box["platform"],
              **{libc: box[libc] for libc in ("glibc", "musl") if libc in box}}
             for target, row in TARGETS.items() for box in row["containers"]]
    return {"build": native("build_runner"), "consume": native("consumer_runner"), "consume-container": boxes,
            "public-download": native("consumer_runner"), "public-download-container": boxes,
            "fetch-rehearsal": native("consumer_runner")}


def matrix_problems(workflow):
    """How the parsed CLI WORKFLOW's matrices depart from TARGETS: each matrix job holds exactly its
    `strategy.matrix.include` rows; an image is pinned as NAME@sha256:<64 hex>, one digest per row."""
    jobs, problems, pins = dig(workflow, "jobs"), [], {}
    for job, rows in expected_matrices().items():
        matrix = dig(jobs, job, "strategy", "matrix")
        include = matrix.get("include") if isinstance(matrix, dict) and set(matrix) == {"include"} else None
        if not isinstance(include, list) or not all(isinstance(row, dict) for row in include):
            problems.append(f"{job}: strategy.matrix is not one include: list of rows")
            continue
        got = []
        for row in include:
            row = {str(key): str(value) for key, value in row.items()}
            if "image" in row:
                name, _, digest = row["image"].partition("@")
                if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
                    problems.append(f"{job}: {row['image']} is not pinned as NAME@sha256:<64 hex>")
                pin = (row.get("target"), name, row.get("platform"))
                if pins.setdefault(pin, row["image"]) != row["image"]:
                    problems.append(f"{job}: {row.get('target')} runs {row['image']}, another job pins {pins[pin]}")
                row["image"] = name
            got.append(json.dumps(row, sort_keys=True))
        extra = list(got)
        for row in (json.dumps(row, sort_keys=True) for row in rows):
            if row in extra:
                extra.remove(row)
            else:
                problems.append(f"{job}: no matrix row {row}")
        problems += [f"{job}: a matrix row TARGETS does not hold: {row}" for row in extra]
    return problems


def guard_module():
    """check-publish-guards.py, whose YAML reader reads every workflow here."""
    spec = importlib.util.spec_from_file_location("check_publish_guards",
                                                  Path(__file__).resolve().parent / "check-publish-guards.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def workflow_matrix_problems(root):
    """None when ROOT holds no CLI workflow; otherwise how its matrices depart from TARGETS."""
    path = root / WORKFLOW
    if not path.exists():
        return None
    try:
        return matrix_problems(guard_module().load_yaml(path.read_text(encoding="utf-8")))
    except (OSError, ValueError) as err:
        return [f"{WORKFLOW} is unreadable: {err}"]

# ---------------------------------------------------------------- self-test

# One stub answers for every tool (git, rustc, cargo, cargo-zigbuild, zig, the
# Xcode tools, codesign, vswhere) from the state file CLI_RELEASE_STUB names,
# and logs each call with its argv and the watched environment.
STUB_TOOL = r'''
import io, json, os, sys, tarfile

state = json.load(open(os.environ["CLI_RELEASE_STUB"], encoding="utf-8"))
tool = os.path.basename(sys.argv[0]).removesuffix(".exe")
args = sys.argv[1:]
with open(state["log"], "a", encoding="utf-8") as log:
    log.write(json.dumps({"tool": tool, "argv": args, "env": {k: os.environ.get(k) for k in state["watch"]}}) + "\n")


def reply(out="", code=0, err=""):
    sys.stdout.write(out)
    sys.stderr.write(err)
    sys.exit(code)


def option(name):
    return args[args.index(name) + 1]


def archive(prefix):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.PAX_FORMAT,
                      pax_headers={"comment": state["archive_comment"]}) as tar:
        info = tarfile.TarInfo(prefix.rstrip("/"))
        info.type, info.mode, info.mtime = tarfile.DIRTYPE, 0o775, state["epoch"]
        tar.addfile(info)
        for name, text in sorted(state["archive_files"].items()):
            info = tarfile.TarInfo(prefix + name)
            info.size, info.mode, info.mtime = len(text.encode()), 0o664, state["epoch"]
            tar.addfile(info, io.BytesIO(text.encode()))
    sys.stdout.buffer.write(buffer.getvalue())
    sys.exit(0)


if tool == "git":
    while args[:1] in (["-C"], ["-c"]):
        args = args[2:]
    if args[0] == "archive":
        archive(next(arg for arg in args if arg.startswith("--prefix="))[len("--prefix="):])
    if args[0] == "cat-file":
        rev, _, path = args[2].partition(":")
        if args[1] != "blob" or rev != state["commit"] or path not in state["blobs"]:
            reply(code=128, err=f"fatal: path '{path}' does not exist in '{rev}'\n")
        sys.stdout.buffer.write(state["blobs"][path].encode())
        sys.exit(0)
    answers = {"rev-parse": state["commit"] + "\n", "log": f"{state['epoch']}\n", "status": state["status"]}
    if args[0] in answers:
        reply(answers[args[0]])
if tool == "cargo" and args[0] in ("build", "zigbuild"):
    target = option("--target").split(".")[0]
    folder = os.path.join(option("--target-dir"), target, "release")
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, "qrscan.exe" if "-windows-" in target else "qrscan")
    with open(path, "w", encoding="utf-8") as binary:
        binary.write(f"#!{state['python']} -IS\nimport sys\nsys.stdout.write({state['smoke']!r})\n"
                     f"# {target} {state['plant']}\n")
    os.chmod(path, 0o755)
    reply(code=state["cargo_exit"])
if tool == "cargo" and args[0] == "tree":
    reply("\n".join(state["tree"][option("--target")][option("-e")]) + "\n")
if tool == "xcrun" and args == ["--show-sdk-version"] and state["xcrun_fails"]:
    reply(code=1, err="xcrun: error: SDK cannot be located\n")
if tool == "xcodebuild" and state["xcodebuild"] is None:
    reply(code=1, err="xcode-select: error: tool 'xcodebuild' requires Xcode\n")
if tool == "codesign" and args[0] == "--verify" and state["codesign_verify"]:
    reply(code=1, err="invalid signature (code or signature have been modified)\n")
if tool == "codesign" and args[0] == "-dv":
    reply(err=f"Executable={args[-1]}\nIdentifier=qrscan\nFormat=Mach-O thin (arm64)\nSignature=adhoc\n")
if tool == "ld" and args == ["-v"]:
    reply(err="@(#)PROGRAM:ld PROJECT:ld-1167.5\nBUILD 01:45:05 Apr 30 2025\n")
answers = {
    ("cc", "--version"): "cc (GCC) 13.3.0 (fixture)",
    ("rustc", "-vV"): "\n".join(state["rustc"]), ("rustc", "--print"): state["sysroot"],
    ("cargo", "-V"): state["cargo"], ("cargo", "metadata"): json.dumps(state["metadata"]),
    ("cargo-zigbuild", "--version"): state["zigbuild"], ("zig", "version"): state["zig"],
    ("xcode-select", "-p"): state["developer_dir"], ("xcrun", "--show-sdk-version"): "26.2",
    ("xcrun", "--show-sdk-build-version"): "25C58", ("xcrun", "--find"): os.path.join(state["bin"], args[-1]),
    ("xcodebuild", "-version"): state["xcodebuild"], ("codesign", "--verify"): "",
    ("clang", "--version"): "Apple clang version 17.0.0 (clang-1700.0.13.5)\nTarget: arm64-apple-darwin24.6.0",
    ("vswhere", "-latest"): {"catalog_productDisplayVersion": "17.14.9", "installationPath": state["vs"]}.get(args[-1]),
}
answer = answers.get((tool, args[0] if args else ""))
if answer is None:
    reply(code=99, err=f"stub: unexpected {tool} {args}\n")
reply(answer.rstrip("\n") + "\n" if answer else "")
'''

# The fixture checkout's scripts/native-floor.py: refuses a binary holding a --forbid
# string, or stops as a judge without --policy cli would.
FLOOR_STUB = r'''
import argparse, json, os, sys

state = json.load(open(os.environ["CLI_RELEASE_STUB"], encoding="utf-8"))
with open(state["log"], "a", encoding="utf-8") as log:
    log.write(json.dumps({"tool": "native-floor", "argv": sys.argv[1:], "env": {}}) + "\n")
if state["floor_usage"]:
    sys.stderr.write("native-floor.py: error: unrecognized arguments: --target\n")
    sys.exit(2)
parser = argparse.ArgumentParser()
parser.add_argument("inputs", nargs="+")
for flag in ("--policy", "--target", "--unwinder"):
    parser.add_argument(flag)
parser.add_argument("--forbid", action="append", default=[])
args = parser.parse_args()
problems = [f"{path}: holds the --forbid string {value}" for path in args.inputs
            for value in args.forbid if value.encode() in open(path, "rb").read()]
print(json.dumps({"verdict": "FAIL" if problems else "PASS", "policy": args.policy, "problems": problems}))
sys.exit(1 if problems else 0)
'''

STUB_TOOLS = ("git", "rustc", "cargo", "cargo-zigbuild", "zig", "cc", "xcrun", "xcode-select", "xcodebuild", "ld",
              "clang", "codesign")
WATCH = ["CARGO_ENCODED_RUSTFLAGS", "CARGO_INCREMENTAL", "SOURCE_DATE_EPOCH", "MACOSX_DEPLOYMENT_TARGET",
         "RUSTUP_TOOLCHAIN", "RUST_TOOLCHAIN"]
COMMIT, OTHER, EPOCH = "0123456789abcdef0123456789abcdef01234567", "f" * 40, 1793597346
NOTICE = b"<p>Rust standard library notices (fixture)</p>\n"
MIT = b"MIT License\n\nPermission is hereby granted (fixture).\n"
APACHE = b"Apache License, Version 2.0 (fixture)\n"
MIT_CRLF = b"MIT License\r\n\r\nCopyright (c) the rqrr authors (fixture)\r\n"
RXING_NOTICE = b"rxing NOTICE (fixture)\n"
UNICODE = b"UNICODE LICENSE V3 (fixture)\n"
ANES = b"MIT License\n\nCopyright (c) the anes authors (fixture)\n"


def rustc_fixture(release, host):
    commit = sha256(release.encode())[:40]
    return [f"rustc {release} ({commit[:9]} 2026-10-15)", "binary: rustc", f"commit-hash: {commit}",
            "commit-date: 2026-10-15", f"host: {host}", f"release: {release}", "LLVM version: 21.1.2"]


class Tally:
    def __init__(self):
        self.count, self.failures = 0, []

    def check(self, name, got, want):
        self.count += 1
        if got != want:
            self.failures.append(f"{name}: got {got!r}, want {want!r}")
        return got == want


FIXTURE_REPO = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner"
RUN_URL = f"{FIXTURE_REPO}/actions/runs/123456"
SMOKE = "qrscan 0.11.0\n"
FIXTURE_CARGO = "cargo 1.99.1 (fixture 2026-10-10)"
GZIP_HEADER = b"\x1f\x8b\x08\x00\x00\x00\x00\x00\x02\xff"
FIXTURE_MANIFEST = f"""[workspace]
members = ["crates/qrcode-ai-scanner", "crates/qrcode-ai-scanner-cli"]
resolver = "3"

[workspace.package]
version = "0.11.0"
license = "MIT"
repository = "{FIXTURE_REPO}"

[profile.release]
lto = "thin"
codegen-units = 1
strip = true

[profile.release.package.rxing]
overflow-checks = true
"""
FIXTURE_PROFILE = {"opt_level": "3", "lto": "thin", "codegen_units": 1, "strip": True, "panic": "unwind",
                   "overflow_checks": {"rxing": True}}
FIXTURE_DENY = ('[licenses]\nallow = [\n  "MIT",\n  "Apache-2.0",\n  "Apache-2.0 WITH LLVM-exception",\n'
                '  "Unicode-3.0",\n]\n')
FIXTURE_WORKFLOW = ('name: cli-archives\non: push\nenv:\n  CARGO_TERM_COLOR: always\n'
                    '  RUST_TOOLCHAIN: "1.99.1"  # = ci.yml\njobs:\n  build:\n    runs-on: ubuntu-24.04\n'
                    '    steps:\n      - run: python scripts/cli-release.py targets\n')
FIXTURE_CHANGELOG = ("# Changelog\n\n## 0.11.0 — 2026-11-02\n\n### Added\n\n- Prebuilt qrscan archives.\n\n"
                     "## 0.10.0 — 2026-10-01\n\n- Earlier.\n")
FIXTURE_COPIES = {
    "LICENSE": b"GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (fixture)\n",
    "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0": b"Apache License 2.0, rxing-derived parts (fixture)\n",
    "LICENSING.md": b"# Licensing (fixture)\n",
    "distribution/cli/README.md": b"# qrscan release archives (fixture)\n",
    "crates/qrcode-ai-scanner/THIRD-PARTY.md": b"# Third-party notices (fixture)\n",
}
# (name, version, license, files at the package root, license_file, where it links)
FIXTURE_CRATES = (
    ("anes", "0.1.6", "MIT OR Apache-2.0", {}, None, "all"),
    ("cc", "1.2.27", "MIT OR Apache-2.0", {"LICENSE-MIT": MIT}, None, "build"),
    ("clap", "4.5.40", "MIT OR Apache-2.0", {"LICENSE-APACHE": APACHE, "LICENSE-MIT": MIT}, None, "all"),
    ("image", "0.25.6", "MIT OR Apache-2.0", {"LICENSE-APACHE": APACHE, "LICENSE-MIT": MIT}, None, "all"),
    ("libc", "0.2.174", "MIT OR Apache-2.0", {"LICENSE-APACHE": APACHE, "LICENSE-MIT": MIT}, None, "unix"),
    ("rqrr", "0.9.0", "MIT/Apache-2.0", {"LICENSE": MIT_CRLF}, None, "all"),
    ("rxing", "0.7.1", "Apache-2.0", {"LICENSE": APACHE, "NOTICE": RXING_NOTICE}, None, "all"),
    ("serde_derive", "1.0.219", "MIT OR Apache-2.0", {"LICENSE-MIT": MIT}, None, "build"),
    ("serde_json", "1.0.140", "MIT OR Apache-2.0", {"LICENSES/MIT.txt": MIT, "README.md": b"# serde_json\n"},
     "LICENSES/MIT.txt", "all"),
    ("unicode-ident", "1.0.18", "(MIT OR Apache-2.0) AND Unicode-3.0",
     {"LICENSE-APACHE": APACHE, "LICENSE-MIT": MIT, "LICENSE-UNICODE": UNICODE}, None, "all"),
    ("windows-sys", "0.59.0", "MIT OR Apache-2.0", {"license-apache-2.0": APACHE, "license-mit": MIT}, None,
     "windows"),
)
FIXTURE_WORKSPACE = (("qrcode-barcode-scanner", "crates/qrcode-ai-scanner"), (PACKAGE, "crates/qrcode-ai-scanner-cli"))
# The texts assemble must find for each linked registry crate (CRLF read as LF).
WANT_TEXTS = {"anes": [ANES], "clap": [APACHE, MIT], "image": [APACHE, MIT], "libc": [APACHE, MIT],
              "rqrr": [MIT_CRLF.replace(b"\r\n", b"\n")], "rxing": [APACHE, RXING_NOTICE], "serde_json": [MIT],
              "unicode-ident": [APACHE, MIT, UNICODE], "windows-sys": [APACHE, MIT]}
ACTIONS_ENV = {"GITHUB_ACTIONS": "true", "GITHUB_SERVER_URL": "https://github.com",
               "GITHUB_REPOSITORY": "qrcode-ai-com/qrcode-barcode-scanner", "GITHUB_RUN_ID": "123456",
               "GITHUB_REF": "refs/tags/v0.11.0", "RUNNER_OS": "Linux", "RUNNER_ARCH": "X64", "ImageOS": "ubuntu24",
               "ImageVersion": "20261026.1"}


def checksum(name, version):
    return sha256(f"{name} {version}".encode())


def put(path, data, mode=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data if isinstance(data, bytes) else data.encode())
    if mode is not None:
        os.chmod(path, mode)


class Fixture:
    """A checkout, a cargo home with registry sources, a toolchain and stub tools in BASE."""

    def __init__(self, base):
        self.base, self.root, self.bin = base, base / "checkout", base / "bin"
        self.home, self.cargo_home, self.pf86 = base / "home", base / "cargo-home", base / "pf86"
        self.state_path, self.log = base / "state.json", base / "log.jsonl"
        self.home.mkdir(parents=True)
        tool = f"#!{sys.executable} -IS\n{STUB_TOOL}"
        for name in STUB_TOOLS:
            put(self.bin / name, tool, 0o755)
        put(self.pf86 / "Microsoft Visual Studio" / "Installer" / "vswhere.exe", tool, 0o755)
        put(base / "vs" / "VC" / "Auxiliary" / "Build" / "Microsoft.VCToolsVersion.default.txt", "14.44.35207\n")
        put(base / "sysroot" / Path(*STD_NOTICE), NOTICE)
        self.write_checkout()
        packages = []
        for name, version, license, files, license_file, _links in FIXTURE_CRATES:
            folder = self.cargo_home / "registry" / "src" / "index.crates.io-fixture" / f"{name}-{version}"
            put(folder / "Cargo.toml", f'[package]\nname = "{name}"\nversion = "{version}"\n')
            for relative, data in files.items():
                put(folder / relative, data)
            packages.append({"name": name, "version": version, "license": license, "license_file": license_file,
                             "manifest_path": str(folder / "Cargo.toml")})
        packages += [{"name": name, "version": "0.11.0", "license": "MIT", "license_file": None,
                      "manifest_path": str(self.root / folder / "Cargo.toml")} for name, folder in FIXTURE_WORKSPACE]
        self.state = {
            "log": str(self.log), "watch": WATCH, "python": sys.executable, "bin": str(self.bin), "commit": COMMIT,
            "epoch": EPOCH, "status": "", "archive_comment": COMMIT,
            "archive_files": {"Cargo.toml": "[workspace]\n", "README.md": "# qrscan source (fixture)\n"},
            "blobs": {"Cargo.lock": (self.root / "Cargo.lock").read_bytes().decode()},  # git cat-file blob
            "sysroot": str(base / "sysroot"), "cargo": FIXTURE_CARGO, "metadata": {"packages": packages},
            "tree": {target: {"normal,no-proc-macro": self.tree(target, False), "normal,build": self.tree(target, True)}
                     for target in TARGETS},
            "zigbuild": f"cargo-zigbuild {CARGO_ZIGBUILD_VERSION}", "zig": ZIG_VERSION,
            "developer_dir": "/Applications/Xcode_26.1.app/Contents/Developer",
            "xcodebuild": "Xcode 26.1\nBuild version 17B55", "xcrun_fails": False, "codesign_verify": False,
            "vs": str(base / "vs"), "smoke": SMOKE, "plant": "", "cargo_exit": 0, "floor_usage": False,
        }

    def write_checkout(self):
        lock = ["# This file is automatically @generated by Cargo.", "version = 4", ""]
        for name, version, *_rest in FIXTURE_CRATES:
            lock += ["[[package]]", f'name = "{name}"', f'version = "{version}"', f'source = "{CRATES_IO}"',
                     f'checksum = "{checksum(name, version)}"', ""]
        for name, _folder in FIXTURE_WORKSPACE:
            lock += ["[[package]]", f'name = "{name}"', 'version = "0.11.0"', ""]
        sources = {"schema": OVERRIDES_SCHEMA, "overrides": [{
            "crate": "anes", "version": "0.1.6", "file": "LICENSE-MIT", "sha256": sha256(ANES),
            "url": "https://example.com/anes/0.1.6/LICENSE-MIT", "reason": "the package ships no license file"}]}
        files = {"Cargo.toml": FIXTURE_MANIFEST, "Cargo.lock": "\n".join(lock), "deny.toml": FIXTURE_DENY,
                 "CHANGELOG.md": FIXTURE_CHANGELOG, WORKFLOW: FIXTURE_WORKFLOW, ".cargo/mutants.toml": "timeout = 2\n",
                 "scripts/native-floor.py": FLOOR_STUB, f"{OVERRIDES}/SOURCES.json": json.dumps(sources, indent=2),
                 f"{OVERRIDES}/anes-0.1.6/LICENSE-MIT": ANES, **FIXTURE_COPIES}
        for relative, data in files.items():
            put(self.root / relative, data)

    def tree(self, target, build):
        side = "windows" if target.endswith("-windows-msvc") else "unix"
        lines = [f"{PACKAGE} v0.11.0 ({self.root}/crates/qrcode-ai-scanner-cli)",
                 f"qrcode-barcode-scanner v0.11.0 ({self.root}/crates/qrcode-ai-scanner)", "image v0.25.6 (*)"]
        lines += [f"{name} v{version}" for name, version, *_rest, links in FIXTURE_CRATES if links in ("all", side)]
        return lines + (["cc v1.2.27", "serde_derive v1.0.219 (proc-macro)"] if build else [])

    def env(self, actions=False, **extra):
        env = {"PATH": str(self.bin), "HOME": str(self.home), "CARGO_HOME": str(self.cargo_home),
               "CLI_RELEASE_STUB": str(self.state_path), "ProgramFiles(x86)": str(self.pf86)}
        if actions:
            env.update(ACTIONS_ENV, RUNNER_TEMP=str(self.base / "runner-temp"))
        return {**env, **extra}

    def arm(self, host="x86_64-unknown-linux-gnu", release="1.99.1", **changes):
        """Write the stub state with CHANGES and empty the call log."""
        self.state_path.write_text(json.dumps({**self.state, "rustc": rustc_fixture(release, host), **changes}),
                                   encoding="utf-8")
        self.log.write_text("", encoding="utf-8")

    def invoke(self, argv, host="x86_64-unknown-linux-gnu", release="1.99.1", env=None, root=None, **changes):
        """(exit code, stdout, the stub calls) of main(ARGV) against the stub state with CHANGES."""
        self.arm(host, release, **changes)
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            code = main(argv, self.env() if env is None else env, self.root if root is None else root)
        calls = [json.loads(line) for line in self.log.read_text(encoding="utf-8").splitlines()]
        return code, captured.getvalue(), calls


TRIPLES = ("x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu", "x86_64-apple-darwin", "aarch64-apple-darwin",
           "x86_64-pc-windows-msvc", "x86_64-unknown-linux-musl", "aarch64-unknown-linux-musl")
HOSTS = {"aarch64-unknown-linux-gnu": "x86_64-unknown-linux-gnu", "x86_64-apple-darwin": "aarch64-apple-darwin",
         "x86_64-unknown-linux-musl": "x86_64-unknown-linux-gnu",
         "aarch64-unknown-linux-musl": "aarch64-unknown-linux-gnu"}
ROW_FLAGS = {"x86_64-unknown-linux-gnu": ["-Clinker-features=-lld"],
             "x86_64-pc-windows-msvc": ["-Ctarget-feature=+crt-static"],
             "x86_64-unknown-linux-musl": ["-Ctarget-feature=+crt-static", "-Clink-self-contained=yes"],
             "aarch64-unknown-linux-musl": ["-Ctarget-feature=+crt-static", "-Clink-self-contained=yes"]}
DEPLOYMENT = {"x86_64-apple-darwin": "10.15", "aarch64-apple-darwin": "11.0"}
WANT_LINKERS = {
    "linux": {"kind": "cargo-zigbuild", "unwinder": "zig-libunwind", "zig": "0.14.1",
              "cargo_zigbuild": "cargo-zigbuild 0.23.4", "glibc": "2.28"},
    "darwin": {"kind": "apple-ld", "unwinder": None, "developer_dir": "/Applications/Xcode_26.1.app/Contents/Developer",
               "sdk_version": "26.2", "sdk_build_version": "25C58",
               "ld": ["@(#)PROGRAM:ld PROJECT:ld-1167.5", "BUILD 01:45:05 Apr 30 2025"],
               "clang": ["Apple clang version 17.0.0 (clang-1700.0.13.5)", "Target: arm64-apple-darwin24.6.0"],
               "xcodebuild": ["Xcode 26.1", "Build version 17B55"],
               "codesign": ["Executable=<out>/qrscan", "Identifier=qrscan", "Format=Mach-O thin (arm64)",
                            "Signature=adhoc"]},
    "windows": {"kind": "msvc-link", "unwinder": None, "visual_studio": "17.14.9", "vc_tools": "14.44.35207"},
    "musl": {"kind": "musl-cc", "unwinder": None, "cc": ["cc (GCC) 13.3.0 (fixture)"]},
}


def family(target):
    return ("musl" if target.endswith("-linux-musl") else "linux" if target.endswith("-linux-gnu")
            else "darwin" if target.endswith("-darwin") else "windows")


def stub_binary(target, plant="", smoke=SMOKE):
    """The bytes the stub cargo writes for TARGET."""
    return f"#!{sys.executable} -IS\nimport sys\nsys.stdout.write({smoke!r})\n# {target} {plant}\n".encode()


def want_command(target, target_dir="<target-dir>"):
    gnu = family(target) == "linux"
    return ["cargo", "zigbuild" if gnu else "build", "--release", "--locked", "-p", "qrcode-barcode-scanner-cli",
            "--bin", "qrscan", "--target", f"{target}.2.28" if gnu else target, "--target-dir", target_dir]


def want_facts(fx, target, binary, actions=False, dirty=False, linker=None):
    host = HOSTS.get(target, target)
    builder = {"runner_os": "Linux", "runner_arch": "X64", "image_os": "ubuntu24", "image_version": "20261026.1",
               "workflow_run": RUN_URL} if actions else dict.fromkeys(
        ("runner_os", "runner_arch", "image_os", "image_version", "workflow_run"))
    forbid = ["<checkout>", "<home>", "<cargo-home>", *(["<runner-temp>"] if actions else []), "<target-dir>"]
    unwinder = WANT_LINKERS[family(target)]["unwinder"]
    return {
        "schema": "qrscan-build-facts/1", "name": "qrscan", "package": "qrcode-barcode-scanner-cli",
        "version": "0.11.0", "target": target,
        "source": {"repository": FIXTURE_REPO, "ref": "refs/tags/v0.11.0" if actions else None,
                   "tag": "v0.11.0" if actions else None, "commit": COMMIT, "source_date_epoch": EPOCH,
                   "cargo_lock_sha256": sha256((fx.root / "Cargo.lock").read_bytes()), "dirty": dirty},
        "toolchain": {"rustc": rustc_fixture("1.99.1", host), "cargo": FIXTURE_CARGO,
                      "std_notice_sha256": sha256(NOTICE)},
        "linker": {**WANT_LINKERS[family(target)], **(linker or {})}, "profile": FIXTURE_PROFILE,
        "rustflags": ["--remap-path-prefix=<checkout>=/source", "--remap-path-prefix=<cargo-home>=/cargo",
                      "--remap-path-prefix=<target-dir>=/target", *ROW_FLAGS.get(target, [])],
        "command": want_command(target), "deployment_target": DEPLOYMENT.get(target), "builder": builder,
        "binary": {"path": "qrscan.exe" if family(target) == "windows" else "qrscan", "sha256": sha256(binary),
                   "size": len(binary)},
        "checks": {"floor": {"policy": "cli", "verdict": "PASS", "unwinder": unwinder, "forbid": forbid},
                   "signature": "codesign --verify --strict: valid" if target == "aarch64-apple-darwin" else None,
                   "version": "qrscan 0.11.0" if target == host or family(target) == "musl" else
                   f"not run: {target} binaries do not run on the build host {host}"},
    }


def want_calls(fx, target, out, tdir, actions=False, rustup=None):
    """The cargo call (argv and the environment it sees) and the native-floor call of a clean build."""
    flags = [f"--remap-path-prefix={fx.root}=/source", f"--remap-path-prefix={fx.cargo_home}=/cargo",
             f"--remap-path-prefix={tdir}=/target", *ROW_FLAGS.get(target, [])]
    cargo = {"tool": "cargo", "argv": want_command(target, str(tdir))[1:], "env": {
        "CARGO_ENCODED_RUSTFLAGS": "\x1f".join(flags), "CARGO_INCREMENTAL": "0", "SOURCE_DATE_EPOCH": str(EPOCH),
        "MACOSX_DEPLOYMENT_TARGET": DEPLOYMENT.get(target), "RUSTUP_TOOLCHAIN": rustup, "RUST_TOOLCHAIN": None}}
    forbid = [fx.root, fx.home, fx.cargo_home, *([fx.base / "runner-temp"] if actions else []), tdir]
    floor = ["--policy", "cli", "--target", target, *(["--unwinder", "zig-libunwind"] if family(target) == "linux"
                                                       else [])]
    floor += [item for path in forbid for item in ("--forbid", str(path))]
    name = "qrscan.exe" if family(target) == "windows" else "qrscan"
    return [cargo, {"tool": "native-floor", "argv": [*floor, str(out / name)], "env": {}}]


def build_case(fx, target, label, actions=False, allow_dirty=False, env=None, out=None, tdir=None, **changes):
    """(exit, stdout JSON, stub calls, out, target dir) of one build."""
    run = fx.base / "runs" / label
    out, tdir = out or run / "out", tdir or run / "target"
    argv = ["build", "--target", target, "--out", str(out), "--target-dir", str(tdir)]
    changes.setdefault("host", HOSTS.get(target, target))
    code, text, calls = fx.invoke(argv + (["--allow-dirty"] if allow_dirty else []),
                                  env=fx.env(actions) if env is None else env, **changes)
    return code, json.loads(text), calls, out, tdir


def listing(folder):
    return sorted(path.name for path in folder.iterdir()) if folder.is_dir() else None


def attempt(function, *args):
    """FUNCTION(*ARGS), or the error it raised, named."""
    try:
        return function(*args)
    except (ValueError, KeyError, OSError) as err:
        return f"{type(err).__name__}: {err}"


def stop_of(function, *args, **keywords):
    """(code, problems) of the Stop FUNCTION raises; (0, []) when it returns."""
    try:
        function(*args, **keywords)
    except Stop as stop:
        return stop.code, stop.problems
    return 0, []


def archive_file(target):
    return f"qrcode-barcode-scanner-cli-0.11.0-{target}.{'zip' if family(target) == 'windows' else 'tar.gz'}"


def relevant(calls):
    return [call for call in calls if call["tool"] == "native-floor"
            or (call["tool"] == "cargo" and call["argv"][0] in ("build", "zigbuild"))]


def check_build(t, fx, label, result, target, actions=False, dirty=False, linker=None, rustup=None):
    """A build that passes: its exit, outputs, facts, binary and calls, exactly."""
    code, facts, calls, out, tdir = result
    name = "qrscan.exe" if family(target) == "windows" else "qrscan"
    binary = (out / name).read_bytes() if (out / name).is_file() else b""
    t.check(f"build {label}: exit and outputs", (code, listing(out)), (0, sorted([name, "build-facts.json"])))
    want = want_facts(fx, target, binary, actions, dirty, linker)
    t.check(f"build {label}: printed facts", facts, want)
    if code == 0:
        written = (out / "build-facts.json").read_bytes()
        t.check(f"build {label}: build-facts.json", json.loads(written), want)
        t.check(f"build {label}: no host path in the facts", str(fx.base).encode() in written, False)
        t.check(f"build {label}: binary and mode", (binary, (out / name).stat().st_mode & 0o777),
                (stub_binary(target), 0o755))
    t.check(f"build {label}: cargo and floor calls", relevant(calls),
            want_calls(fx, target, out, tdir, actions, rustup))


def _build_clean(t, fx):
    """Every row built locally and under Actions (the builds assemble takes next), and the
    Darwin rows on Command Line Tools, with a failing xcodebuild and the pinned RUSTUP_TOOLCHAIN."""
    for actions, folder in ((False, "builds-local"), (True, "builds-ci")):
        for target in TRIPLES:
            label = f"{folder}/{target}"
            tdir = fx.base / ("runner-temp" if actions else "runs") / f"target-{target}"
            result = build_case(fx, target, label, actions, out=fx.base / folder / f"cli-build-{target}", tdir=tdir)
            check_build(t, fx, label, result, target, actions)
    clt = "/Library/Developer/CommandLineTools"
    check_build(t, fx, "command line tools", build_case(fx, "aarch64-apple-darwin", "clt", developer_dir=clt,
                                                        xcodebuild=None), "aarch64-apple-darwin",
                linker={"developer_dir": clt, "xcodebuild": "unavailable: command line tools only"})
    check_build(t, fx, "xcodebuild failing", build_case(fx, "x86_64-apple-darwin", "xcodebuild", xcodebuild=None),
                "x86_64-apple-darwin",
                linker={"xcodebuild": "unavailable: xcode-select: error: tool 'xcodebuild' requires Xcode"})
    check_build(t, fx, "--allow-dirty locally", build_case(fx, "x86_64-unknown-linux-gnu", "allow-dirty",
                                                           allow_dirty=True, status=" M LICENSE\n"),
                "x86_64-unknown-linux-gnu", dirty=True)
    check_build(t, fx, "RUSTUP_TOOLCHAIN at the pin", build_case(
        fx, "x86_64-pc-windows-msvc", "rustup-pin", env=fx.env(RUSTUP_TOOLCHAIN="1.99.1")),
        "x86_64-pc-windows-msvc", rustup="1.99.1")
    # A CRLF work-tree Cargo.lock (Git for Windows) and its LF blob: the facts name the blob, so they
    # equal the LF build's; builds-crlf is builds-ci with this build in place of its Windows one.
    windows, crlf = "x86_64-pc-windows-msvc", checkout_copy(fx, fx.base / "crlf", crlf_lock)
    builds, lf = fx.base / "builds-crlf", (fx.root / "Cargo.lock").read_bytes()
    shutil.copytree(fx.base / "builds-ci", builds)
    shutil.rmtree(builds / f"cli-build-{windows}")
    out, tdir = builds / f"cli-build-{windows}", fx.base / "runner-temp" / "target-crlf"
    code, facts, calls, out, _tdir = build_case(fx, windows, "crlf", True, root=crlf, out=out, tdir=tdir)
    t.check("build from a CRLF checkout: its Cargo.lock", (crlf / "Cargo.lock").read_bytes(),
            lf.replace(b"\n", b"\r\n"))
    t.check("build from a CRLF checkout: the committed Cargo.lock's sha256", (code, facts),
            (0, want_facts(fx, windows, stub_binary(windows), actions=True)))
    t.check("build from a CRLF checkout: the LF build's build-facts.json", (out / "build-facts.json").read_bytes(),
            (fx.base / "builds-ci" / f"cli-build-{windows}" / "build-facts.json").read_bytes())
    t.check("build from a CRLF checkout: the blob it hashed", [call["argv"] for call in calls if call["tool"] == "git"
                                                              and "cat-file" in call["argv"]],
            [["-C", str(crlf), "cat-file", "blob", f"{COMMIT}:Cargo.lock"]])


def checkout_copy(fx, folder, change):
    shutil.copytree(fx.root, folder)
    change(folder)
    return folder


def crlf_lock(root):
    """A Windows checkout's Cargo.lock: CRLF in the work tree, the commit's blob (the stub's) LF."""
    path = root / "Cargo.lock"
    path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))


def _build_planted(t, fx):
    """Each refused build exits with its named reasons; cargo runs only for the after-cargo checks."""
    base, linux, mac = fx.base, "x86_64-unknown-linux-gnu", "aarch64-apple-darwin"
    reason = "build sets the compiler flags, profile and target directory itself"
    config_root = checkout_copy(fx, base / "roots" / "config", lambda root: put(root / ".cargo" / "config.toml", ""))
    no_workflow = checkout_copy(fx, base / "roots" / "no-workflow", lambda root: (root / WORKFLOW).unlink())
    nested = checkout_copy(fx, base / "nest" / "checkout", lambda root: put(root.parent / ".cargo" / "config", ""))
    put(base / "cargo-home-2" / "config.toml", "")
    put(base / "runs" / "full-target-dir" / "target" / "stale", "")
    put(base / "runs" / "full-out" / "out" / "old", "")
    run = base / "runs"
    old, new = b"qrscan 0.10.0\n", SMOKE.encode()
    cases = [  # (label, target, build_case keywords, exit, problems)
        ("RUSTFLAGS", linux, {"env": fx.env(RUSTFLAGS="-Ctarget-cpu=native")}, 2, [f"RUSTFLAGS is set: {reason}"]),
        ("CARGO_TARGET_DIR", linux, {"env": fx.env(CARGO_TARGET_DIR=str(base / "elsewhere"))}, 2,
         [f"CARGO_TARGET_DIR is set: {reason}"]),
        ("CARGO_BUILD_TARGET_DIR", linux, {"env": fx.env(CARGO_BUILD_TARGET_DIR=str(base / "elsewhere"))}, 2,
         [f"CARGO_BUILD_TARGET_DIR is set: {reason}"]),
        ("a row linker", mac, {"env": fx.env(CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER="cc")}, 2,
         [f"CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER is set: {reason}"]),
        ("a profile and a wrapper", linux, {"env": fx.env(CARGO_PROFILE_RELEASE_LTO="false", RUSTC_WRAPPER="sccache")},
         2, [f"CARGO_PROFILE_RELEASE_LTO is set: {reason}", f"RUSTC_WRAPPER is set: {reason}"]),
        ("another RUSTUP_TOOLCHAIN", linux, {"env": fx.env(RUSTUP_TOOLCHAIN="1.98.1")}, 2,
         ["RUSTUP_TOOLCHAIN is 1.98.1, not the pinned 1.99.1"]),
        ("full-target-dir", linux, {}, 2, [f"the target directory is not empty: {run / 'full-target-dir' / 'target'}"]),
        ("in-checkout target dir", linux, {"tdir": fx.root / "target"}, 2,
         [f"the target directory is inside the checkout: {fx.root / 'target'}"]),
        ("full-out", linux, {}, 2, [f"the output directory is not empty: {run / 'full-out' / 'out'}"]),
        ("overlap", linux, {"out": run / "overlap" / "target" / "out"}, 2,
         ["the output and target directories overlap"]),
        ("stub rustc 1.98.1", linux, {"release": "1.98.1"}, 2,
         ["rustc -vV reports release 1.98.1, not the pinned 1.99.1"]),
        ("a .cargo config", linux, {"root": config_root}, 2,
         [f"a Cargo config would apply: {config_root / '.cargo' / 'config.toml'}"]),
        ("a CARGO_HOME config", linux, {"env": fx.env(CARGO_HOME=str(base / "cargo-home-2"))}, 2,
         [f"a Cargo config would apply: {base / 'cargo-home-2' / 'config.toml'}"]),
        ("an ancestor config", linux, {"root": nested}, 2,
         [f"a Cargo config would apply: {base / 'nest' / '.cargo' / 'config'}"]),
        ("a dirty tree", linux, {"status": " M LICENSE\n"}, 2,
         ["the working tree is dirty (--allow-dirty, outside GitHub Actions only)"]),
        ("--allow-dirty under Actions", linux, {"actions": True, "allow_dirty": True, "status": " M LICENSE\n"}, 2,
         ["--allow-dirty is refused under GitHub Actions"]),
        ("another host", mac, {"host": linux}, 2, [f"this host is {linux}; {mac} builds on {mac}"]),
        ("xcrun failing", "x86_64-apple-darwin", {"xcrun_fails": True}, 2,
         ["`xcrun --show-sdk-version` failed (exit 1): xcrun: error: SDK cannot be located"]),
        ("zig drift", "aarch64-unknown-linux-gnu", {"zig": "0.13.0", "zigbuild": "cargo-zigbuild 0.22.0"}, 2,
         ["zig version prints 0.13.0, not the pinned 0.14.1",
          "cargo-zigbuild --version prints cargo-zigbuild 0.22.0, not the pinned 0.23.4"]),
        ("no workflow", linux, {"root": no_workflow}, 2,
         [f"cannot read the toolchain pin in {WORKFLOW}: No such file or directory"]),
        ("a commit without Cargo.lock", linux, {"blobs": {}}, 2,
         [f"`git -C {fx.root} cat-file blob {COMMIT}:Cargo.lock` failed (exit 128): fatal: path 'Cargo.lock' does "
          f"not exist in '{COMMIT}'"]),
        ("a judge without --policy cli", linux, {"floor_usage": True}, 2,
         ["native-floor --policy cli failed (exit 2): native-floor.py: error: unrecognized arguments: --target"]),
        ("a dropped remap", linux, {"plant": str(fx.root)}, 1,
         [f"native-floor --policy cli refused the binary: {run / 'a dropped remap' / 'out' / 'qrscan'}: "
          f"holds the --forbid string {fx.root}"]),
        ("a broken signature", mac, {"codesign_verify": True}, 1,
         ["codesign --verify --strict refused the binary: invalid signature (code or signature have been modified)"]),
        ("another version", "x86_64-pc-windows-msvc", {"smoke": old.decode()}, 1,
         [f"qrscan --version printed {old!r} (exit 0), not {new!r}"]),
        ("cargo failing", "x86_64-apple-darwin", {"cargo_exit": 101}, 1, ["cargo exited 101"]),
    ]
    after_cargo = {"a judge without --policy cli", "a dropped remap", "a broken signature", "another version",
                   "cargo failing"}
    for label, target, keywords, code, problems in cases:
        got, receipt, calls, out, _tdir = build_case(fx, target, label, **keywords)
        t.check(f"build {label}: refused", (got, receipt.get("verdict"), receipt.get("problems")),
                (code, "ERROR" if code == 2 else "FAIL", problems))
        ran = label in after_cargo
        t.check(f"build {label}: cargo ran", any(call["tool"] == "cargo" for call in relevant(calls)), ran)
        t.check(f"build {label}: nothing shipped", listing(out),
                [] if ran else ["old"] if label == "full-out" else None)


COPY_MEMBERS = {"LICENSE": "LICENSE", "LICENSE-APACHE-2.0": "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
                "LICENSING.md": "LICENSING.md", "README.md": "distribution/cli/README.md",
                "THIRD-PARTY.md": "crates/qrcode-ai-scanner/THIRD-PARTY.md"}
UNIX_NAMES = ["anes", "clap", "image", "libc", "qrcode-barcode-scanner", "qrcode-barcode-scanner-cli", "rqrr", "rxing",
              "serde_json", "unicode-ident"]


def want_dependencies(target):
    side = "windows" if family(target) == "windows" else "unix"
    rows = [{"name": name, "version": version, "source": CRATES_IO, "checksum": checksum(name, version),
             "license": license} for name, version, license, _files, _file, links in FIXTURE_CRATES
            if links in ("all", side)]
    rows += [{"name": name, "version": "0.11.0", "source": None, "checksum": None, "license": "MIT"}
             for name, _folder in FIXTURE_WORKSPACE]
    return sorted(rows, key=lambda row: (row["name"], row["version"]))


def archive_rows(raw, zipped):
    """(header, [(name, mode, time, owner facts)], {name: bytes}) of an archive as written."""
    if zipped:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            rows = [(info.filename, info.external_attr >> 16, info.date_time,
                     (info.create_system, info.compress_type, info.extra)) for info in archive.infolist()]
            data = {info.filename: archive.read(info) for info in archive.infolist() if not info.is_dir()}
            return raw[:4], rows, data
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
        found = archive.getmembers()
        rows = [(member.name + ("/" if member.isdir() else ""), member.mode, member.mtime,
                 (member.uid, member.gid, member.uname, member.gname, member.type, member.pax_headers))
                for member in found]
        data = {member.name: archive.extractfile(member).read() for member in found if member.isfile()}
        return (raw[:10], dict(archive.pax_headers)), rows, data


def check_archive(t, fx, label, raw, builds, target, actions):
    zipped, name = family(target) == "windows", "qrscan.exe" if family(target) == "windows" else "qrscan"
    stem, build = f"qrcode-barcode-scanner-cli-0.11.0-{target}", builds / f"cli-build-{target}"
    members = ["COPYRIGHT-rust-std.html", "LICENSE", "LICENSE-APACHE-2.0", "LICENSING.md", "README.md", "SOURCE.md",
               "THIRD-PARTY-LICENSES.txt", "THIRD-PARTY.md", "build-info.json", name]
    head, rows, data = archive_rows(raw, zipped)
    if zipped:
        stamp = time.gmtime(EPOCH)
        dos = (*stamp[:5], stamp[5] - stamp[5] % 2)
        want = [(f"{stem}/", 0o040755, dos, (3, zipfile.ZIP_STORED, b""))] + [
            (f"{stem}/{member}", 0o100755 if member == name else 0o100644, dos, (3, zipfile.ZIP_DEFLATED, b""))
            for member in members]
        t.check(f"{label} {target}: zip header and entries", (head, rows), (b"PK\x03\x04", want))
    else:
        want = [(f"{stem}/", 0o755, EPOCH, (0, 0, "", "", tarfile.DIRTYPE, {}))] + [
            (f"{stem}/{member}", 0o755 if member == name else 0o644, EPOCH, (0, 0, "", "", tarfile.REGTYPE, {}))
            for member in members]
        t.check(f"{label} {target}: gzip, tar header and entries", (head, rows), ((GZIP_HEADER, {}), want))
    inner = {key[len(stem) + 1:]: value for key, value in data.items()}
    t.check(f"{label} {target}: copied members, std notice and binary",
            ({member: inner.get(member) for member in COPY_MEMBERS}, inner.get(STD_MEMBER), inner.get(name)),
            ({member: FIXTURE_COPIES[path] for member, path in COPY_MEMBERS.items()}, NOTICE,
             (build / name).read_bytes()))
    facts = json.loads((build / "build-facts.json").read_bytes())
    build_only = [{"name": crate, "version": version, "source": CRATES_IO, "checksum": checksum(crate, version),
                   "license": "MIT OR Apache-2.0"}
                  for crate, version in (("cc", "1.2.27"), ("serde_derive", "1.0.219"))]
    info = json.loads(inner.get("build-info.json", b"null"))
    t.check(f"{label} {target}: build-info.json", info, {
        **{key: value for key, value in facts.items() if key != "checks"}, "schema": "qrscan-build-info/1",
        "dependencies": want_dependencies(target), "build_dependencies": build_only})
    names = [*UNIX_NAMES[:3], *UNIX_NAMES[4:], "windows-sys"] if zipped else UNIX_NAMES
    t.check(f"{label} {target}: linked crates", [row["name"] for row in (info or {}).get("dependencies", [])], names)
    registry = [row for row in want_dependencies(target) if row["source"]]
    third = inner.get("THIRD-PARTY-LICENSES.txt", b"")
    t.check(f"{label} {target}: THIRD-PARTY-LICENSES.txt", attempt(parse_third_party, third, "0.11.0", target), (
        [{**row, "texts": sorted(sha256(text) for text in WANT_TEXTS[row["name"]])} for row in registry],
        {sha256(text): text for row in registry for text in WANT_TEXTS[row["name"]]}))
    opening = (f"Third-party crates in qrscan 0.11.0 for {target}, and their license texts\n\n== anes 0.1.6 ==\n"
               f"license: MIT OR Apache-2.0\nsource: {CRATES_IO}\n").encode()
    t.check(f"{label} {target}: THIRD-PARTY-LICENSES.txt opening", third[:len(opening)], opening)
    tag, run = ("v0.11.0", RUN_URL) if actions else ("not a release tag (None)", "none (built outside GitHub Actions)")
    t.check(f"{label} {target}: SOURCE.md facts", inner.get("SOURCE.md", b"").decode().split("\n")[:13], [
        f"# Source of qrscan 0.11.0 for {target}", "",
        "qrscan is the command line of the QR Code & Barcode Scanner engine. This archive was built from",
        "the public repository and the commit below.", "", f"- Repository: {FIXTURE_REPO}", f"- Tag: {tag}",
        f"- Commit: {COMMIT}", f"- Tree: {FIXTURE_REPO}/tree/{COMMIT}",
        f"- Cargo.lock sha256: {sha256((fx.root / 'Cargo.lock').read_bytes())}", f"- Workflow run: {run}",
        "- Build recipe: .github/workflows/cli-archives.yml and scripts/cli-release.py at that commit",
        "- Corresponding source: qrcode-barcode-scanner-cli-0.11.0-source.tar.gz (its sha256 is in "
        "qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS)"])
    t.check(f"{label} {target}: members holding a host path or a CR",
            sorted(member for member, value in inner.items() if str(fx.base).encode() in value
                   or (member.endswith((".md", ".txt", ".json")) and b"\r" in value)), [])


def assemble_case(fx, label, builds, actions=False, partial=False, env=None, **changes):
    """(exit, receipt, stub calls, out) of one assemble into a new directory."""
    folder = fx.base / "assembled"
    folder.mkdir(exist_ok=True)
    argv = ["assemble", "--builds", str(builds), "--out", str(folder / label),
            "--receipt", str(folder / f"{label}.json")]
    code, text, calls = fx.invoke(argv + (["--partial"] if partial else []),
                                  env=fx.env(actions) if env is None else env, **changes)
    return code, json.loads(text), calls, folder / label


def check_release_set(t, fx, label, result, builds, actions=False, targets=TRIPLES):
    """A release set that passes: files, SHA256SUMS, receipt, each archive and the source asset."""
    code, receipt, _calls, out = result
    sums, source = "qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS", "qrcode-barcode-scanner-cli-0.11.0-source.tar.gz"
    names = [archive_file(target) for target in targets] + [source]
    if not t.check(f"{label}: exit and files", (code, listing(out)), (0, sorted([*names, sums]))):
        return {}
    files = {name: (out / name).read_bytes() for name in [*names, sums]}
    t.check(f"{label}: SHA256SUMS", files[sums],
            "".join(f"{sha256(files[name])}  {name}\n" for name in sorted(names)).encode())
    binaries = {target: builds / f"cli-build-{target}" / ("qrscan.exe" if family(target) == "windows" else "qrscan")
                for target in targets}
    t.check(f"{label}: receipt", receipt, {
        "schema": "qrscan-cli-assemble/1", "verdict": "PASS", "version": "0.11.0", "commit": COMMIT,
        "partial": len(targets) < len(TRIPLES),
        "targets": {target: {"build_facts_sha256": sha256((path.parent / "build-facts.json").read_bytes()),
                             "binary_sha256": sha256(path.read_bytes()), "dependencies": 10, "third_party_crates": 8,
                             "license_texts": 6, "build_dependencies": 2} for target, path in binaries.items()},
        "double_write": "identical", "python": {"version": sys.version, "zlib_runtime": zlib.ZLIB_RUNTIME_VERSION},
        "assets": {name: sha256(files[name]) for name in sorted(names)},
        "sums": {"name": sums, "sha256": sha256(files[sums])}, "problems": []})
    for target in targets:
        check_archive(t, fx, label, files[archive_file(target)], builds, target, actions)
    prefix = "qrcode-barcode-scanner-cli-0.11.0-source/"
    with tarfile.open(fileobj=io.BytesIO(files[source]), mode="r:gz") as archive:
        found = [(member.name, member.isdir()) for member in archive.getmembers()]
        contents = {member.name: archive.extractfile(member).read().decode() for member in archive.getmembers()
                    if member.isfile()}
        pax = dict(archive.pax_headers)
    t.check(f"{label}: source asset", (files[source][:10], pax, found, contents), (
        GZIP_HEADER, {"comment": COMMIT}, [(prefix[:-1], True), (prefix + "Cargo.toml", False),
                                           (prefix + "README.md", False)],
        {prefix + name: text for name, text in fx.state["archive_files"].items()}))
    return files


def _assemble_clean(t, fx):
    """The local and the Actions builds assemble into byte-identical sets on a rerun; --partial
    outside Actions; licenses --check-release passes on both sets. Returns the clean set's directory."""
    local, ci = fx.base / "builds-local", fx.base / "builds-ci"
    result = assemble_case(fx, "clean", local)
    files = check_release_set(t, fx, "assemble", result, local)
    _code, receipt, calls, out = result
    t.check("assemble: --receipt file", json.loads((fx.base / "assembled" / "clean.json").read_bytes()), receipt)
    t.check("assemble: git archive call", [call["argv"] for call in calls if call["tool"] == "git" and
                                           "archive" in call["argv"]], [
        ["-C", str(fx.root), "-c", "core.autocrlf=false", "-c", "core.eol=lf", "-c", "tar.umask=0002", "archive",
         "--format=tar", "--prefix=qrcode-barcode-scanner-cli-0.11.0-source/", COMMIT]])
    cargo = [call["argv"] for call in calls if call["tool"] == "cargo"]
    t.check("assemble: cargo calls", (len(cargo), cargo[:2]), (15, [
        ["metadata", "--format-version", "1", "--locked", "--offline"],
        ["tree", "-p", "qrcode-barcode-scanner-cli", "--target", "x86_64-unknown-linux-gnu", "-e",
         "normal,no-proc-macro", "--prefix", "none", "--format", "{p}", "--locked", "--offline"]]))
    again = assemble_case(fx, "clean-again", local)[3]
    t.check("assemble: a rerun writes the same bytes", {name: (again / name).read_bytes() for name in listing(again)
                                                       or []}, files)
    ci_files = check_release_set(t, fx, "assemble under Actions", assemble_case(fx, "ci", ci, actions=True), ci,
                                 actions=True)
    # The Windows build from a CRLF checkout, assembled on an LF checkout as in CI, then on a CRLF one.
    crlf = fx.base / "builds-crlf"
    for label, root in (("a CRLF-checkout build", fx.root), ("on a CRLF checkout", fx.base / "crlf")):
        files = check_release_set(t, fx, f"assemble {label}", assemble_case(fx, label, crlf, actions=True, root=root),
                                  crlf, actions=True)
        t.check(f"assemble {label}: the LF set's bytes", files, ci_files)
    partial = fx.base / "builds-partial"
    shutil.copytree(local, partial)
    shutil.rmtree(partial / "cli-build-x86_64-pc-windows-msvc")
    check_release_set(t, fx, "assemble --partial", assemble_case(fx, "partial", partial, partial=True), partial,
                      targets=tuple(target for target in TRIPLES if target != "x86_64-pc-windows-msvc"))
    for label in ("clean", "ci"):
        code, text, _calls = fx.invoke(["licenses", "--check-release", str(fx.base / "assembled" / label)])
        t.check(f"licenses --check-release {label}", (code, json.loads(text)), (0, {
            "schema": "qrscan-cli-licenses/1", "verdict": "PASS", "archives": sorted(map(archive_file, TRIPLES)),
            "crates": 9, "problems": []}))
    return out


def edit_facts(target, edit):
    """A change to a copied builds directory: EDIT on TARGET's build-facts.json."""
    def change(builds):
        path = builds / f"cli-build-{target}" / "build-facts.json"
        facts = json.loads(path.read_bytes())
        edit(facts)
        path.write_text(json.dumps(facts, indent=2) + "\n", encoding="utf-8")
    return change


def metadata_with(fx, crate, **fields):
    """The stub state change giving CRATE other cargo metadata FIELDS."""
    return {"metadata": {"packages": [{**package, **fields} if package["name"] == crate else package
                                      for package in fx.state["metadata"]["packages"]]}}


def add_unlinked_override(root):
    path = root / OVERRIDES / "SOURCES.json"
    sources = json.loads(path.read_bytes())
    sources["overrides"].append({"crate": "foo", "version": "1.0.0", "file": "LICENSE", "sha256": sha256(MIT),
                                 "url": "https://example.com/foo/LICENSE", "reason": "fixture"})
    put(path, json.dumps(sources, indent=2))
    put(root / OVERRIDES / "foo-1.0.0" / "LICENSE", MIT)


def _assemble_planted(t, fx):
    """Each planted defect is refused with its named reasons, and nothing is written."""
    base, roots = fx.base, fx.base / "roots"
    h198, h199, notice = sha256(b"1.98.1")[:40], sha256(b"1.99.1")[:40], sha256(b"another std notice")
    lock = (fx.root / "Cargo.lock").read_bytes()
    lf, crlf = sha256(lock), sha256(lock.replace(b"\n", b"\r\n"))
    before = (base / "builds-local" / "cli-build-aarch64-unknown-linux-gnu" / "qrscan").read_bytes()
    grown, empty = before + b"\0", base / "empty-crate" / "Cargo.toml"
    put(empty, "")
    override = f"{OVERRIDES}/anes-0.1.6/LICENSE-MIT"
    missing = checkout_copy(fx, roots / "missing-override", lambda root: (root / override).unlink())
    rehashed = checkout_copy(fx, roots / "mis-hashed", lambda root: put(root / override, ANES + b"x"))
    stray = checkout_copy(fx, roots / "stray", lambda root: put(root / OVERRIDES / "anes-0.1.6" / "NOTICE", "x\n"))
    unlinked = checkout_copy(fx, roots / "unlinked", add_unlinked_override)

    def drop_windows(builds):
        shutil.rmtree(builds / "cli-build-x86_64-pc-windows-msvc")

    def strays(builds):
        put(builds / "README.txt", "")
        (builds / "cli-build-wasm32-unknown-unknown").mkdir()

    cases = [  # (label, change to a copy of the local builds, assemble_case keywords, exit, problems)
        ("differing commits", edit_facts("aarch64-apple-darwin", lambda facts: facts["source"].update(commit=OTHER)),
         {}, 1, [f"aarch64-apple-darwin: built from commit {OTHER}, this checkout is {COMMIT}"]),
        ("differing rustc", edit_facts("x86_64-pc-windows-msvc", lambda facts: facts["toolchain"].update(
            rustc=rustc_fixture("1.98.1", "x86_64-pc-windows-msvc"))), {}, 1,
         [f"x86_64-pc-windows-msvc: rustc 1.98.1 ({h198}) differs from this toolchain's 1.99.1 ({h199})"]),
        ("differing std notices", edit_facts("x86_64-apple-darwin", lambda facts: facts["toolchain"].update(
            std_notice_sha256=notice)), {}, 1,
         [f"x86_64-apple-darwin: Rust std notice sha256 {notice} differs from this toolchain's {sha256(NOTICE)}"]),
        ("a dirty build", edit_facts("x86_64-unknown-linux-gnu", lambda facts: facts["source"].update(dirty=True)),
         {}, 1, ["x86_64-unknown-linux-gnu: built from a dirty tree"]),
        ("a work-tree CRLF Cargo.lock hash", edit_facts("x86_64-pc-windows-msvc", lambda facts: facts["source"].update(
            cargo_lock_sha256=crlf)), {}, 1,
         [f"x86_64-pc-windows-msvc: Cargo.lock sha256 {crlf}, this checkout's is {lf}"]),
        ("a missing license text", None, metadata_with(fx, "clap", manifest_path=str(empty)), 1,
         ["no license text for clap 4.5.40"]),
        ("a missing override", None, {"root": missing}, 1,
         [f"license override {override} is missing", "no license text for anes 0.1.6"]),
        ("a mis-hashed override", None, {"root": rehashed}, 1,
         [f"license override {override}: sha256 {sha256(ANES + b'x')}, SOURCES.json records {sha256(ANES)}",
          "no license text for anes 0.1.6"]),
        ("an unlisted override file", None, {"root": stray}, 1,
         [f"{OVERRIDES}/anes-0.1.6/NOTICE is not listed in SOURCES.json"]),
        ("an override no crate links", None, {"root": unlinked}, 1,
         ["the license override for foo 1.0.0 matches no linked crate"]),
        ("GPL-3.0-only", None, metadata_with(fx, "image", license="GPL-3.0-only"), 1,
         ["image 0.25.6: license GPL-3.0-only is not allowed by deny.toml"]),
        ("a build crate without a license", None, metadata_with(fx, "cc", license=None), 1,
         ["cc 1.2.27 declares no license expression: a reviewed override names one"]),
        ("four targets", drop_windows, {}, 1, ["missing build for x86_64-pc-windows-msvc"]),
        ("four targets, --partial under Actions", drop_windows, {"actions": True, "partial": True}, 2,
         ["--partial is refused under GitHub Actions"]),
        ("an extra file", lambda builds: put(builds / "cli-build-x86_64-unknown-linux-gnu" / "notes.txt", ""), {},
         1, ["x86_64-unknown-linux-gnu: unexpected file notes.txt"]),
        ("unexpected entries", strays, {}, 1,
         ["unexpected entry in the builds directory: README.txt",
          "unexpected entry in the builds directory: cli-build-wasm32-unknown-unknown"]),
        ("a binary sha256 mismatch", lambda builds: put(builds / "cli-build-aarch64-unknown-linux-gnu" / "qrscan",
                                                        grown), {}, 1,
         [f"aarch64-unknown-linux-gnu: qrscan sha256 {sha256(grown)} ({len(grown)} bytes) differs from build-facts "
          f"{sha256(before)} ({len(before)} bytes)"]),
        ("another pax comment", None, {"archive_comment": OTHER}, 1,
         [f"the source archive's pax comment is {OTHER}, not the commit {COMMIT}"]),
        ("a dirty tree", None, {"status": " M LICENSE\n"}, 2,
         ["the working tree is dirty: the archives take their license files from it"]),
        ("stub rustc 1.98.1", None, {"release": "1.98.1"}, 2,
         ["rustc -vV reports release 1.98.1, not the pinned 1.99.1"]),
        ("builds of another run", None, {"builds": "builds-ci", "env": fx.env(True, GITHUB_RUN_ID="999")}, 1,
         [f"{target}: built by run {RUN_URL}, this run is {FIXTURE_REPO}/actions/runs/999"
          for target in sorted(TRIPLES)]),
    ]
    for label, change, keywords, code, problems in cases:
        builds = base / keywords.pop("builds", "builds-local")
        if change:
            shutil.copytree(builds, base / "planted" / label)
            builds = base / "planted" / label
            change(builds)
        got, receipt, _calls, out = assemble_case(fx, label, builds, **keywords)
        t.check(f"assemble {label}: refused", (got, receipt.get("verdict"), receipt.get("problems")),
                (code, "ERROR" if code == 2 else "FAIL", problems))
        t.check(f"assemble {label}: nothing written", out.exists(), False)
    full = base / "assembled" / "a full output directory"
    put(full / "old", "")
    got, receipt, _calls, _out = assemble_case(fx, "a full output directory", base / "builds-local")
    t.check("assemble into a full directory: refused", (got, receipt.get("problems")),
            (2, [f"the output directory is not empty: {full}"]))


def _writer_cases(t, fx):
    """An mtime-varying archive writer or gzip is refused, naming each asset, before anything is written."""
    out = fx.base / "assembled" / "varying"
    args = argparse.Namespace(builds=str(fx.base / "builds-local"), out=str(out), partial=False, receipt=None)
    writes, packs = [], []

    def varying_writer(top, members, epoch, ext):
        writes.append(top)
        return write_archive(top, members, epoch + len(writes), ext)

    def varying_gzip(data):
        packs.append(len(data))
        raw = gzip_bytes(data)
        return raw[:4] + struct.pack("<I", len(packs)) + raw[8:]

    fx.arm()
    t.check("assemble: an mtime-varying archive writer",
            stop_of(assemble, args, fx.env(), fx.root, write=varying_writer),
            (1, [f"the archive writer is not deterministic: {archive_file(target)} differs between two writes"
                 for target in TRIPLES]))
    fx.arm()
    t.check("assemble: a varying gzip", stop_of(assemble, args, fx.env(), fx.root, compress=varying_gzip), (1, [
        "the archive writer is not deterministic: qrcode-barcode-scanner-cli-0.11.0-source.tar.gz differs between "
        "two writes"]))
    t.check("assemble: nothing written by a varying writer", (out.exists(), len(writes), len(packs)), (False, 14, 2))


def _license_cases(t, fx, release):
    """licenses --check-release on tampered copies of the clean release set, and on an empty directory."""
    altered = APACHE.replace(b"fixture", b"altered")
    linux, mac, windows = (archive_file(target) for target in (TRIPLES[0], TRIPLES[3], TRIPLES[4]))

    def third_party(old, new):
        name = "THIRD-PARTY-LICENSES.txt"
        return lambda files: files.update({name: files[name].replace(old, new)})

    cases = [  # (label, archive, change to its members, problems)
        ("an altered LICENSE", linux, lambda files: files.update(LICENSE=b"another license\n"),
         [f"{linux}: LICENSE differs from LICENSE"]),
        ("an altered text", mac, third_party(APACHE, altered),
         [f"{mac}: the text keyed {sha256(APACHE)} has sha256 {sha256(altered)}"]),
        ("a dropped override text", windows,
         third_party(f"texts: {sha256(ANES)}".encode(), f"texts: {sha256(MIT)}".encode()),
         [f"{windows}: anes 0.1.6 lacks its reviewed override LICENSE-MIT",
          f"{windows}: the entry of anes 0.1.6 differs from another archive's",
          f"{windows}: no crate names the text {sha256(ANES)}"]),
    ]
    for label, name, change, problems in cases:
        folder = fx.base / "tampered" / label
        shutil.copytree(release, folder)
        files, top = read_members(folder / name)
        change(files)
        target = ARCHIVE_NAME.fullmatch(name)["target"]
        members = {member: (data, 0o755 if member == binary_name(target) else 0o644) for member, data in files.items()}
        (folder / name).write_bytes(write_archive(top, members, EPOCH, TARGETS[target]["ext"]))
        code, text, _calls = fx.invoke(["licenses", "--check-release", str(folder)])
        receipt = json.loads(text)
        t.check(f"licenses {label}", (code, receipt.get("verdict"), receipt.get("problems")), (1, "FAIL", problems))
    empty = fx.base / "tampered" / "empty"
    empty.mkdir(parents=True)
    code, text, _calls = fx.invoke(["licenses", "--check-release", str(empty)])
    t.check("licenses on an empty directory", (code, json.loads(text).get("problems")),
            (1, [f"no CLI archive in {empty}"]))


WANT_NOTES = "\n".join([
    "## 0.11.0 — 2026-11-02", "", "### Added", "", "- Prebuilt qrscan archives.", "",
    "### Prebuilt qrscan archives", "",
    "The `qrcode-barcode-scanner-cli-0.11.0-<target>` archives hold the qrscan command line for",
    "Linux x86_64 (glibc 2.28 or later), Linux aarch64 (glibc 2.28 or later), macOS x86_64 (10.15 or later), "
    "macOS arm64 (11.0 or later), Windows x86_64, Linux x86_64 (static musl, including Alpine) "
    "and Linux aarch64 (static musl, including Alpine).",
    "`qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS` lists the sha256 of every other CLI asset. It is an asset of",
    "this same release, so it detects a damaged download, not a substituted release.",
    "`qrcode-barcode-scanner-cli-0.11.0-source.tar.gz` is the corresponding source, a git archive of the tagged "
    "commit.",
    "", "The binaries are not code-signed or notarized: there is no Apple Developer ID signature, no",
    "notarization and no Authenticode signature. Each archive's README.md gives the steps to verify",
    "the download and run the binary.", ""])


def _command_cases(t, fx):
    """targets, notes and usage errors of the release commands, exactly."""
    code, text, _calls = fx.invoke(["targets"])
    receipt = json.loads(text)
    t.check("targets", (code, {key: value for key, value in receipt.items() if key != "targets"}), (0, {
        "schema": "qrscan-cli-targets/1", "package": "qrcode-barcode-scanner-cli", "binary": "qrscan",
        "version": "0.11.0", "source_asset": True,
        "assets": [*map(archive_file, TRIPLES), "qrcode-barcode-scanner-cli-0.11.0-source.tar.gz",
                   "qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS"]}))
    keys = ("target", "ext", "build_runner", "build_host", "linker", "unwinder", "deployment_target", "rustflags",
            "consumer_runner")
    t.check("targets: rows", [tuple(row[key] for key in keys) for row in receipt["targets"]], [
        ("x86_64-unknown-linux-gnu", "tar.gz", "ubuntu-24.04", "x86_64-unknown-linux-gnu", "cargo-zigbuild",
         "zig-libunwind", None, ["-Clinker-features=-lld"], "ubuntu-24.04"),
        ("aarch64-unknown-linux-gnu", "tar.gz", "ubuntu-24.04", "x86_64-unknown-linux-gnu", "cargo-zigbuild",
         "zig-libunwind", None, [], "ubuntu-24.04-arm"),
        ("x86_64-apple-darwin", "tar.gz", "macos-15", "aarch64-apple-darwin", "apple-ld", None, "10.15", [],
         "macos-15-intel"),
        ("aarch64-apple-darwin", "tar.gz", "macos-15", "aarch64-apple-darwin", "apple-ld", None, "11.0", [],
         "macos-15"),
        ("x86_64-pc-windows-msvc", "zip", "windows-2025", "x86_64-pc-windows-msvc", "msvc-link", None, None,
         ["-Ctarget-feature=+crt-static"], "windows-2025"),
        ("x86_64-unknown-linux-musl", "tar.gz", "ubuntu-24.04", "x86_64-unknown-linux-gnu", "musl-cc", None, None,
         ["-Ctarget-feature=+crt-static", "-Clink-self-contained=yes"], "ubuntu-24.04"),
        ("aarch64-unknown-linux-musl", "tar.gz", "ubuntu-24.04-arm", "aarch64-unknown-linux-gnu", "musl-cc", None, None,
         ["-Ctarget-feature=+crt-static", "-Clink-self-contained=yes"], "ubuntu-24.04-arm")])
    code, text, _calls = fx.invoke(["notes", "--version", "0.11.0"])
    t.check("notes 0.11.0", (code, text), (0, WANT_NOTES))
    undated = checkout_copy(fx, fx.base / "roots" / "undated", lambda root: put(
        root / "CHANGELOG.md", FIXTURE_CHANGELOG.replace("0.11.0 — 2026-11-02", "0.11.0 — Unreleased")))
    for label, argv, root, code, problems in (
            ("another version", ["notes", "--version", "0.10.0"], None, 1,
             ["version 0.10.0 is not the workspace version 0.11.0"]),
            ("a tag name", ["notes", "--version", "v0.11.0"], None, 2, ["--version 'v0.11.0' is not X.Y.Z"]),
            ("an undated section", ["notes", "--version", "0.11.0"], undated, 1,
             ["CHANGELOG.md has no dated '## 0.11.0 — YYYY-MM-DD' section"]),
            ("qualify without its options", ["qualify", "--release-dir", "x"], None, 2,
             ["qualify needs --receipts", "qualify needs --out"]),
            ("attach-plan --phase list alone", ["attach-plan", "--phase", "list"], None, 2,
             ["attach-plan --phase list needs --tag", "attach-plan --phase list needs --list"]),
            ("readback with a tag alone", ["readback", "--tag", "v0.11.0"], None, 2,
             ["readback needs --commit", "readback needs --view", "readback needs --dir", "readback needs --record"]),
            ("anchor --validate alone", ["anchor", "--validate"], None, 2,
             ["anchor --validate needs --tag", "anchor --validate needs --run"])):
        got, text, _calls = fx.invoke(argv, root=root)
        t.check(label, (got, json.loads(text)), (code, {"command": argv[0], "verdict": "ERROR" if code == 2 else "FAIL",
                                                        "problems": problems}))


SOURCE_FILE = "qrcode-barcode-scanner-cli-0.11.0-source.tar.gz"
SUMS_FILE = "qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS"
NAMES = [*map(archive_file, TRIPLES), SOURCE_FILE, SUMS_FILE]  # the upload order: archives, source, SHA256SUMS
IOS = ["QRCodeScanner.xcframework.zip", "checksum.txt"]  # another lane's assets on the same draft
FOREIGN = "qrcode-barcode-scanner-cli-0.11.0-riscv64gc-unknown-linux-musl.tar.gz"
PUBLISHED_TEXT = "a published release is never completed in place; ship the next patch version (RELEASING §6)"
DRAFT_TEXT = ("nothing was uploaded: the owner deletes the CLI assets from the draft, then dispatches mode build on "
              "the tag (RELEASING §6)")


def gh_asset(name, data, **changes):
    """One asset as `gh release view --json assets` lists it."""
    return {"apiUrl": f"https://api.github.com/repos/qrcode-ai-com/qrcode-barcode-scanner/releases/assets/{len(name)}",
            "contentType": "application/octet-stream", "digest": f"sha256:{sha256(data)}", "downloadCount": 0,
            "label": "", "name": name, "size": len(data), "state": "uploaded", **changes}


def gh_files(fx, label, on_release, draft=True, target=COMMIT, changes=None, tag="v0.11.0"):
    """(view file, present directory) of a release holding ON_RELEASE {name: bytes}, as the gh steps
    write them: the view, and the CLI assets downloaded, the directory made only when there is one."""
    where = fx.base / "gh" / label
    put(where / "view.json", json.dumps({"tagName": tag, "isDraft": draft, "targetCommitish": target, "assets": [
        gh_asset(name, data, **(changes or {}).get(name, {})) for name, data in on_release.items()]}))
    for name, data in on_release.items():
        if name.startswith("qrcode-barcode-scanner-cli-"):
            put(where / "present" / name, data)
    return where / "view.json", where / "present"


def write_record(path, folder, names):
    """The inspector's --record of the files NAMES in FOLDER: sha256sum lines, sorted."""
    put(path, "".join(f"{sha256((folder / name).read_bytes())}  {folder / name}\n" for name in sorted(names)))
    return path


def _plan_list_cases(t, fx):
    """attach-plan --phase list: exactly one release carries the tag, whatever its state."""
    def listed(label, releases, tag="v0.11.0", env=None):
        path = fx.base / "gh" / label / "list.json"
        put(path, json.dumps(releases))
        code, text, _calls = fx.invoke(["attach-plan", "--phase", "list", "--tag", tag, "--list", str(path)], env=env)
        return code, json.loads(text), path

    others = [{"tagName": "v0.10.1", "isDraft": False}, {"tagName": "agents-v0.1.0", "isDraft": False}]
    code, receipt, _path = listed("one draft", [*others, {"tagName": "v0.11.0", "isDraft": True}])
    t.check("attach-plan --phase list: one draft", (code, receipt), (0, {
        "schema": "qrscan-cli-attach-plan/1", "phase": "list", "verdict": "PASS", "tag": "v0.11.0",
        "releases": ["draft"], "problems": []}))
    code, receipt, _path = listed("one published", [{"tagName": "v0.11.0", "isDraft": False}])
    t.check("attach-plan --phase list: one published release", (code, receipt["verdict"], receipt["releases"]),
            (0, "PASS", ["published"]))
    for label, releases, problems in (
            ("no release", others,
             ["no release for v0.11.0: the owner creates the draft (RELEASING §5), then re-runs this job"]),
            ("two releases", [{"tagName": "v0.11.0", "isDraft": True}, {"tagName": "v0.11.0", "isDraft": False}],
             ["2 releases carry v0.11.0 (draft, published): exactly one may, the owner's draft"])):
        code, receipt, _path = listed(label, releases)
        t.check(f"attach-plan --phase list: {label}", (code, receipt["verdict"], receipt["problems"]),
                (1, "FAIL", problems))
    code, receipt, path = listed("not gh's", {"tagName": "v0.11.0", "isDraft": True})
    t.check("attach-plan --phase list: not a list", (code, receipt), (2, {
        "command": "attach-plan", "verdict": "ERROR",
        "problems": [f"{path} is not `gh release list --json tagName,isDraft` output"]}))
    for label, tag, env, problems in (
            ("a tag without v", "0.11.0", None, ["--tag '0.11.0' is not vX.Y.Z"]),
            ("GH_TOKEN set", "v0.11.0", fx.env(GH_TOKEN="fixture"),
             ["GH_TOKEN set: attach-plan reads files and runs without a token"])):
        code, receipt, _path = listed(label, others, tag=tag, env=env)
        t.check(f"attach-plan --phase list: {label}", (code, receipt.get("verdict"), receipt.get("problems")),
                (2, "ERROR", problems))


def plan_case(fx, label, release, record, on_release, env=None, extra=(), commit=COMMIT, prepare=None, **view):
    """(exit, printed receipt, the --out file, the upload list or None) of one --phase plan;
    PREPARE(folder, present directory) changes the gh files first."""
    view_file, present = gh_files(fx, label, on_release, **view)
    where = fx.base / "gh" / label
    if prepare:
        prepare(where, present)
    argv = ["attach-plan", "--phase", "plan", "--tag", "v0.11.0", "--commit", commit, "--view", str(view_file),
            "--present", str(present), "--release-dir", str(release), "--record", str(record),
            "--out", str(where / "plan.json"), "--upload-list", str(where / "upload.txt"), *extra]
    code, text, _calls = fx.invoke(argv, env=env)
    written = json.loads((where / "plan.json").read_bytes()) if (where / "plan.json").exists() else None
    upload = (where / "upload.txt").read_text(encoding="utf-8") if (where / "upload.txt").exists() else None
    return code, json.loads(text), written, upload


def _plan_cases(t, fx, release):
    """attach-plan --phase plan on every row of the decision table, each refusal named."""
    files = {name: (release / name).read_bytes() for name in NAMES}
    record = write_record(fx.base / "gh" / "cli-inspected.sha256", release, NAMES)
    ios = {name: f"{name} (fixture)".encode() for name in IOS}
    altered = {name: data + b"\0" for name, data in files.items()}

    def some(*indices, base=files):
        return {NAMES[index]: base[NAMES[index]] for index in indices}

    def lines(*indices):
        return "".join(f"{release / NAMES[index]}\n" for index in indices)

    source, sums = len(TRIPLES), len(TRIPLES) + 1
    binaries = range(len(TRIPLES))
    code, receipt, written, upload = plan_case(fx, "a draft without CLI assets", release, record, ios)
    want = {"schema": "qrscan-cli-attach-plan/1", "phase": "plan", "verdict": "PASS", "tag": "v0.11.0",
            "commit": COMMIT, "draft": True, "target": COMMIT, "present": {}, "identical": [],
            "upload": [str(release / name) for name in NAMES], "ignored": IOS, "next": None, "problems": []}
    t.check("attach-plan: a draft without CLI assets", (code, receipt, written, upload),
            (0, want, want, lines(*range(len(NAMES)))))
    every = range(len(NAMES))
    cases = [  # (label, assets on the release, view keywords, exit, problems, upload list, identical, next)
        ("a draft with two archives and the source", {**some(0, 1, source), **ios}, {}, 0, [],
         lines(*range(2, len(TRIPLES)), sums), some(0, 1, source), None),
        ("a draft with the whole set", some(*every), {}, 0, [], "", files, None),
        ("a published release with the whole set", some(*every), {"draft": False}, 0, [], "", files, None),
        ("a foreign target", ios, {"target": "main"}, 1,
         [f"v0.11.0 targets main, not this run's commit {COMMIT}"], None, {}, None),
        ("an abbreviated target", ios, {"target": COMMIT[:12]}, 1,
         [f"v0.11.0 targets {COMMIT[:12]}, not this run's commit {COMMIT}"], None, {}, None),
        ("another tag's view", {}, {"tag": "v0.10.0"}, 1, ["the release view is of v0.10.0, not v0.11.0"], None,
         {}, None),
        ("SHA256SUMS before the other assets", some(0, sums), {}, 1,
         [f"{SUMS_FILE} is on the draft while {', '.join(NAMES[1:-1])} are missing: it goes last, after every "
          "other asset"], None, some(0, sums), DRAFT_TEXT),
        ("SHA256SUMS before the source", some(*binaries, sums), {}, 1,
         [f"{SUMS_FILE} is on the draft while {SOURCE_FILE} is missing: it goes last, after every other asset"],
         None, some(*binaries, sums), DRAFT_TEXT),
        ("a differing archive on the draft", some(3, base=altered), {}, 1,
         [f"{NAMES[3]} differs: the draft holds sha256 {sha256(altered[NAMES[3]])}, the inspected set "
          f"{sha256(files[NAMES[3]])}"], None, {}, DRAFT_TEXT),
        ("an unexpected CLI asset", {FOREIGN: b"musl (fixture)"}, {}, 1,
         [f"{FOREIGN} is on the draft but is not an asset of this set"], None, {}, DRAFT_TEXT),
        ("an interrupted upload", some(4), {"changes": {NAMES[4]: {"state": "open"}}}, 1,
         [f"{NAMES[4]} on the draft is in state open, not uploaded: an interrupted upload"], None, some(4),
         DRAFT_TEXT),
        ("a published release without SHA256SUMS", some(*binaries, source), {"draft": False}, 1,
         [PUBLISHED_TEXT, f"{SUMS_FILE} is missing from the published release"], None, some(*binaries, source), None),
        ("a published release with another source", {**some(*binaries, sums), **some(source, base=altered)},
         {"draft": False}, 1,
         [PUBLISHED_TEXT, f"{SOURCE_FILE} differs: the published release holds sha256 "
                          f"{sha256(altered[SOURCE_FILE])}, the inspected set {sha256(files[SOURCE_FILE])}"],
         None, some(*binaries, sums), None),
    ]
    for label, on_release, view, code, problems, upload, identical, after in cases:
        got, receipt, written, uploaded = plan_case(fx, label, release, record, on_release, **view)
        t.check(f"attach-plan: {label}", (got, receipt.get("verdict"), receipt.get("problems"), uploaded,
                                          receipt.get("identical"), receipt.get("next"), written == receipt),
                (code, "FAIL" if code else "PASS", problems, upload, [name for name in NAMES if name in identical],
                 after, True))
    _plan_refusals(t, fx, release, record, files)


def _plan_refusals(t, fx, release, record, files):
    """A release file swapped after the inspection, gh files that disagree, usage and a token: refused."""
    swapped, grown = fx.base / "gh" / "swapped-release", files[NAMES[2]] + b"\0"
    shutil.copytree(release, swapped)
    swapped_record = write_record(fx.base / "gh" / "swapped.sha256", swapped, NAMES)
    put(swapped / NAMES[2], grown)
    code, receipt, _written, upload = plan_case(fx, "a swapped release file", swapped, swapped_record, {})
    t.check("attach-plan: a release file swapped after the inspection", (code, receipt["problems"], upload), (1, [
        f"{NAMES[2]}: '{sha256(grown)}  {swapped / NAMES[2]}' is not in the inspected record"], None))
    code, receipt, _written, upload = plan_case(fx, "another record", release, swapped_record, {})
    t.check("attach-plan: a record of another directory", (code, receipt["problems"], upload), (1, [
        f"{name}: '{sha256(files[name])}  {release / name}' is not in the inspected record" for name in NAMES], None))
    code, receipt, _written, upload = plan_case(fx, "a stale upload list", release, record, {FOREIGN: b"musl"},
                                                prepare=lambda where, present: put(where / "upload.txt", "stale\n"))
    t.check("attach-plan: a refused plan removes a stale upload list", (code, receipt["verdict"], upload),
            (1, "FAIL", None))
    held = sorted(set(NAMES) - {NAMES[1]})
    cases = [  # (label, assets on the release, plan_case keywords, problems)
        ("a CLI asset left undownloaded", files, {"prepare": lambda where, present: (present / NAMES[1]).unlink()},
         [f"the release lists the CLI assets {sorted(NAMES)}, the present directory holds {held}"]),
        ("GH_TOKEN set", {}, {"env": fx.env(GH_TOKEN="fixture")},
         ["GH_TOKEN set: attach-plan reads files and runs without a token"]),
        ("an abbreviated --commit", {}, {"commit": COMMIT[:12]},
         [f"--commit '{COMMIT[:12]}' is not a full 40-hex commit"]),
        ("--list with --phase plan", {}, {"extra": ["--list", "list.json"]},
         ["attach-plan --phase plan does not take --list"]),
    ]
    for label, on_release, keywords, problems in cases:
        code, receipt, written, upload = plan_case(fx, label, release, record, on_release, **keywords)
        t.check(f"attach-plan: {label}", (code, receipt, written, upload),
                (2, {"command": "attach-plan", "verdict": "ERROR", "problems": problems}, None, None))


def readback_case(fx, label, record, on_release, env=None, prepare=None, commit=COMMIT, **view):
    """(exit, printed receipt, the step summary or None) of one readback of the CLI assets downloaded
    from a release holding ON_RELEASE, under Actions unless ENV is given."""
    view_file, present = gh_files(fx, label, on_release, **view)
    where = fx.base / "gh" / label
    if prepare:
        prepare(where, present)
    argv = ["readback", "--tag", "v0.11.0", "--commit", commit, "--view", str(view_file), "--dir", str(present),
            "--record", str(record), "--summary", str(where / "summary.md")]
    code, text, _calls = fx.invoke(argv, env=fx.env(True) if env is None else env)
    summary = (where / "summary.md").read_text(encoding="utf-8") if (where / "summary.md").exists() else None
    return code, json.loads(text), summary


def _readback_cases(t, fx, release):
    """readback after the upload: exactly the set, each asset the inspected bytes, the target this commit."""
    files = {name: (release / name).read_bytes() for name in NAMES}
    record = write_record(fx.base / "gh" / "readback.sha256", release, NAMES)
    ios = {name: f"{name} (fixture)".encode() for name in IOS}
    code, receipt, summary = readback_case(fx, "readback of the draft", record, {**files, **ios})
    table = "".join(f"| {name} | {len(data)} | `{sha256(data)}` |\n" for name, data in files.items())
    t.check("readback: the draft holds the inspected set", (code, receipt, summary), (0, {
        "schema": "qrscan-cli-readback/1", "verdict": "PASS", "tag": "v0.11.0", "commit": COMMIT, "draft": True,
        "target": COMMIT, "run_id": "123456",
        "assets": {name: {"sha256": sha256(data), "size": len(data)} for name, data in files.items()},
        "sums": {"name": SUMS_FILE, "sha256": sha256(files[SUMS_FILE])}, "ignored": IOS, "problems": []},
        f"### qrscan CLI assets on v0.11.0: PASS\n\nThe draft release targets `{COMMIT}`.\n\n"
        f"| Asset | Bytes | sha256 |\n|---|---:|---|\n{table}\nSHA256SUMS sha256: `{sha256(files[SUMS_FILE])}`\n\n"
        "This run's id is 123456: once the release is published, it is the `qualified_run` input of the "
        "public-download dispatch.\n"))
    code, receipt, summary = readback_case(fx, "readback of the published release", record, files, draft=False,
                                           env=fx.env())
    lines = summary.splitlines()
    t.check("readback: the published release, outside Actions",
            (code, receipt["verdict"], receipt["draft"], receipt["run_id"], lines[2], lines[-1]),
            (0, "PASS", False, None, f"The published release targets `{COMMIT}`.",
             "This run's id is none (outside GitHub Actions): once the release is published, it is the "
             "`qualified_run` input of the public-download dispatch."))
    without_sums = {name: data for name, data in files.items() if name != SUMS_FILE}
    altered, bad = files[NAMES[0]] + b"\0", "sha256:" + "0" * 64
    cases = [  # (label, assets on the release, readback_case keywords, problems)
        ("SHA256SUMS missing from the draft", without_sums, {}, [f"{SUMS_FILE} is missing from the draft"]),
        ("SHA256SUMS missing from the published release", without_sums, {"draft": False},
         [f"{SUMS_FILE} is missing from the published release"]),
        ("an unexpected CLI asset", {**files, FOREIGN: b"musl"}, {},
         [f"{FOREIGN} is on the draft but is not an asset of this set"]),
        ("an asset that differs from the inspected set", {**files, NAMES[0]: altered}, {},
         [f"{NAMES[0]}: the draft serves sha256 {sha256(altered)}, the inspected set {sha256(files[NAMES[0]])}"]),
        ("a foreign target", files, {"target": "main"}, [f"v0.11.0 targets main, not this run's commit {COMMIT}"]),
        ("another tag's view", files, {"tag": "v0.10.0"}, ["the release view is of v0.10.0, not v0.11.0"]),
        ("a listing that disagrees with its download", files, {"changes": {NAMES[1]: {"digest": bad, "size": 1}}},
         [f"{NAMES[1]}: the draft lists 1 bytes, its download has {len(files[NAMES[1]])}",
          f"{NAMES[1]}: the draft lists {bad}, its download has sha256 {sha256(files[NAMES[1]])}"]),
        ("an interrupted upload", files, {"changes": {SUMS_FILE: {"state": "open"}}},
         [f"{SUMS_FILE} on the draft is in state open, not uploaded: an interrupted upload"]),
        ("an asset not downloaded", files, {"prepare": lambda where, present: (present / NAMES[2]).unlink()},
         [f"{NAMES[2]} is on the draft but was not downloaded"]),
        ("a download the release does not list", files,
         {"prepare": lambda where, present: put(present / FOREIGN, b"musl")},
         [f"{FOREIGN} was downloaded, but the draft does not list it"]),
    ]
    for label, on_release, keywords, problems in cases:
        code, receipt, summary = readback_case(fx, f"readback {label}", record, on_release, **keywords)
        t.check(f"readback: {label}", (code, receipt["verdict"], receipt["problems"], summary.split("\n\n")[-1]),
                (1, "FAIL", problems, "".join(f"- {problem}\n" for problem in problems)))
    _readback_refusals(t, fx, release, files, record)


def _readback_refusals(t, fx, release, files, record):
    """A record of another set refused; usage, malformed files and a token stopped with exit 2."""
    short = write_record(fx.base / "gh" / "readback-short.sha256", release, NAMES[:-1])
    longer = fx.base / "gh" / "readback-longer.sha256"
    put(longer, record.read_text(encoding="utf-8") + f"{sha256(b'musl')}  {release / FOREIGN}\n")
    for label, path, problems in (
            ("a record without SHA256SUMS", short, [f"{SUMS_FILE} has no line in the inspected record"]),
            ("a record naming another asset", longer,
             [f"the inspected record names {FOREIGN}, not an asset of this set"])):
        code, receipt, _summary = readback_case(fx, f"readback {label}", path, files)
        t.check(f"readback: {label}", (code, receipt["verdict"], receipt["problems"]), (1, "FAIL", problems))
    garbled = fx.base / "gh" / "readback-garbled.sha256"
    put(garbled, "not a record line\n")
    where = fx.base / "gh" / "readback exit 2"
    cases = [  # (label, record, readback_case keywords, problems)
        ("GITHUB_TOKEN set", record, {"env": fx.env(True, GITHUB_TOKEN="fixture")},
         ["GITHUB_TOKEN set: readback reads files and runs without a token"]),
        ("both tokens set", record, {"env": fx.env(GH_TOKEN="fixture", GITHUB_TOKEN="fixture")},
         ["GH_TOKEN and GITHUB_TOKEN set: readback reads files and runs without a token"]),
        ("an abbreviated --commit", record, {"commit": COMMIT[:12]},
         [f"--commit '{COMMIT[:12]}' is not a full 40-hex commit"]),
        ("a garbled record", garbled, {},
         [f"the inspected record {garbled} has a malformed or repeated line 'not a record line'"]),
        ("no readback directory", record, {"prepare": lambda folder, present: shutil.rmtree(present)},
         [f"the readback directory {where / 'present'} is not a directory"]),
        ("a view that is not gh's", record, {"prepare": lambda folder, present: put(folder / "view.json", "[]")},
         [f"{where / 'view.json'} is not `gh release view --json tagName,isDraft,targetCommitish,assets` output"]),
    ]
    for label, path, keywords, problems in cases:
        shutil.rmtree(where, ignore_errors=True)
        code, receipt, summary = readback_case(fx, where.name, path, files, **keywords)
        t.check(f"readback: {label}", (code, receipt, summary),
                (2, {"command": "readback", "verdict": "ERROR", "problems": problems}, None))


BOXES = (  # the container rows of TARGETS, written out: (target, image, platform, glibc)
    ("x86_64-unknown-linux-gnu", "almalinux:8.10-minimal", "linux/amd64", "2.28"),
    ("x86_64-unknown-linux-gnu", "debian:bookworm-slim", "linux/amd64", "2.36"),
    ("aarch64-unknown-linux-gnu", "almalinux:8.10-minimal", "linux/arm64", "2.28"),
    ("aarch64-unknown-linux-gnu", "debian:bookworm-slim", "linux/arm64", "2.36"),
    ("x86_64-unknown-linux-musl", "alpine:3.22", "linux/amd64", "1.2.5"),
    ("aarch64-unknown-linux-musl", "alpine:3.22", "linux/arm64", "1.2.5"))
NATIVE_HOSTS = {"x86_64-unknown-linux-gnu": ("linux", "x86_64"), "aarch64-unknown-linux-gnu": ("linux", "aarch64"),
                "x86_64-apple-darwin": ("darwin", "x86_64"), "aarch64-apple-darwin": ("darwin", "aarch64"),
                "x86_64-pc-windows-msvc": ("win32", "x86_64"),
                "x86_64-unknown-linux-musl": ("linux", "x86_64"),
                "aarch64-unknown-linux-musl": ("linux", "aarch64")}
# (label, target, (image, platform, glibc) or None, receipt path below the receipts directory)
QUALIFY_ROWS = [(target, target, None, f"cli-receipt-{target}/cli-receipt.json") for target in TRIPLES] + [
    (f"{box[0]} in {box[1]}", box[0], box[1:], f"cli-receipt-container-{index}/cli-receipt.json")
    for index, box in enumerate(BOXES)]
LABELS = [row[0] for row in QUALIFY_ROWS]
IDENTITIES = sha256(b"identities (fixture)")
FLOOR_PATH = "cli-receipt-floor/native-floor.json"
QUALIFY_ENV = {"GITHUB_SHA": COMMIT, "GITHUB_EVENT_NAME": "push", "GITHUB_RUN_ATTEMPT": "1"}
EXIT_3 = {"id": "exit-3", "reason": "depends on the budget and the machine"}
NON_UTF8 = {"id": "non-utf8-name", "reason": "container argv is UTF-8"}


def image_ref(image):
    return f"{image}@sha256:{sha256(image.encode())}"


def consumer_fixture(release, target, box, contract=COMMIT):
    """A passing qrscan-cli-consumer/1 receipt of TARGET's archive in the release set, natively or in BOX."""
    name = archive_file(target)
    data = (release / name).read_bytes()
    system, machine = NATIVE_HOSTS[target] if box is None else ("linux", target.split("-")[0])
    cases = [{"id": case, "exit": code, "expected_exit": code, "ok": True, "detail": []}
             for case, code in (("version", 0), ("unwind", 101), ("truth-set/qr", 0), ("truth-set/ean-13", 0),
                                ("truth-set/aztec", 0))]
    container = None if box is None else {
        "image": image_ref(box[0]), "platform": box[1], "image_platform": box[1], "docker": "28.5.1",
        "expect_glibc": box[2], "glibc": box[2], "glibc_probe": "getconf GNU_LIBC_VERSION"}
    if box and target.endswith("-linux-musl"):
        container.update(expect_glibc=None, glibc=None, glibc_probe=None,
                         expect_musl=box[2], musl=box[2], musl_probe="musl dynamic loader")
    return {"schema": "qrscan-cli-consumer/1", "verdict": "PASS", "exit": 0, "target": target, "version": "0.11.0",
            "archive": {"name": name, "sha256": sha256(data), "size": len(data)},
            "sums_sha256": sha256((release / SUMS_FILE).read_bytes()), "consumer_commit": COMMIT,
            "contract_commit": contract, "hash_tools": [], "extracted_with": "tar",
            "host": {"os": system, "machine": machine}, "container": container, "binary_sha256": sha256(name.encode()),
            "cases": cases, "truth": {"file": "fixtures/consumer-truth.json", "sha256": sha256(b"truth (fixture)"),
                                      "cases": 3, "identities_sha256": IDENTITIES, "engine_panics_total": 0},
            "not_executed": [EXIT_3] if box is None else [EXIT_3, NON_UTF8], "problems": []}


def floor_fixture(judged=None, verdict="PASS"):
    """The native-floor --policy cli --complete report on the release set. JUDGED {target: unwinder}
    replaces zig-libunwind on a GNU row; a target it maps to False is left out."""
    binaries = []
    for target in TRIPLES:
        gnu = target.endswith("-linux-gnu")
        unwinder = (judged or {}).get(target, "zig-libunwind" if gnu else None)
        if unwinder is not False:
            exe = "qrscan.exe" if family(target) == "windows" else "qrscan"
            binaries.append({"input": f"{archive_file(target)}!qrcode-barcode-scanner-cli-0.11.0-{target}/{exe}",
                             "target": target, "unwinder": unwinder,
                             "unwinder_from": "build-info.json" if gnu else None})
    return {"verdict": verdict, "policy": "cli", "binaries": binaries, "skipped": [SOURCE_FILE, SUMS_FILE],
            "forbid": [], "problems": []}


def fetch_fixture(release, names, **changes):
    """A passing anonymous qrscan-cli-fetch/1 receipt of the published NAMES."""
    assets = [{"name": name, "url": f"{FIXTURE_REPO}/releases/download/v0.11.0/{name}",
               "hosts": ["github.com", "release-assets.githubusercontent.com"],
               "final_host": "release-assets.githubusercontent.com", "status": 200,
               "size": len((release / name).read_bytes()), "sha256": sha256((release / name).read_bytes()),
               "date": "2026-11-02T10:00:00Z", "attempts": 1} for name in names]
    return {"schema": "qrscan-cli-fetch/1", "verdict": "PASS", "exit": 0, "mode": "release",
            "repository": "qrcode-ai-com/qrcode-barcode-scanner", "tag": "v0.11.0", "token_in_env": False,
            "assets": assets, "out": "fetched", "problems": [], **changes}


def qualify_case(fx, label, release, edit=None, options=None, env=None, public=False, **changes):
    """(exit, printed receipt, --out file, summary, GitHub output) of one qualify over the receipts the
    qualified job downloads: thirteen consumers and the floor report or, PUBLIC, thirteen consumers judged on
    the anchor commit's contract and the fetches (one per consumer, and public-verify's --all).
    EDIT(receipts by path) plants a defect; CHANGES go to the stub state."""
    receipts = {path: consumer_fixture(release, target, box, OTHER if public else COMMIT)
                for _label, target, box, path in QUALIFY_ROWS}
    if public:
        receipts.update({f"cli-fetch-{index}/cli-fetch.json": fetch_fixture(release, [SUMS_FILE, archive_file(row[1])])
                         for index, row in enumerate(QUALIFY_ROWS)})
        receipts["cli-fetch-all/cli-fetch.json"] = fetch_fixture(release, [SUMS_FILE, *NAMES[:-1]])
    else:
        receipts[FLOOR_PATH] = floor_fixture()
    if edit:
        edit(receipts)
    folder, out = fx.base / "qualify" / label, fx.base / "qualify" / f"{label}.result"
    for path, receipt in receipts.items():
        put(folder / path, receipt if isinstance(receipt, str) else json.dumps(receipt, indent=2))
    out.mkdir(parents=True)
    if options is None and public:
        options = ["--public", "--anchor-sums-sha256", sha256((release / SUMS_FILE).read_bytes()),
                   "--anchor-identities", IDENTITIES]
    elif options is None:
        options = ["--release-dir", str(release), "--github-output", str(out / "github-output")]
    argv = ["qualify", *options, "--receipts", str(folder), "--out", str(out / "qualification.json"),
            "--summary", str(out / "summary.md")]
    code, text, _calls = fx.invoke(argv, env=fx.env(True, **QUALIFY_ENV) if env is None else env, **changes)
    found = [(out / name).read_text(encoding="utf-8") if (out / name).exists() else None
             for name in ("qualification.json", "summary.md", "github-output")]
    return code, json.loads(text), found[0] and json.loads(found[0]), found[1], found[2]


def want_qualification(release, **changes):
    """The qualification a clean receipts directory earns, with CHANGES."""
    native = [{"target": target, "receipt": path, "verdict": "PASS",
               "host": {"os": NATIVE_HOSTS[target][0], "machine": NATIVE_HOSTS[target][1]}}
              for _label, target, box, path in QUALIFY_ROWS if box is None]
    containers = [{"target": target, "receipt": path, "verdict": "PASS", "image": image_ref(box[0]),
                   "platform": box[1], "glibc": None if target.endswith("-linux-musl") else box[2],
                   **({"musl": box[2]} if target.endswith("-linux-musl") else {})}
                  for _label, target, box, path in QUALIFY_ROWS if box]
    return {"schema": "qrscan-cli-qualification/1", "verdict": "PASS", "version": "0.11.0", "commit": COMMIT,
            "github_sha": COMMIT, "ref": "refs/tags/v0.11.0", "event": "push", "run_id": "123456", "run_attempt": "1",
            "sums_sha256": sha256((release / SUMS_FILE).read_bytes()),
            "archives": {name: sha256((release / name).read_bytes()) for name in NAMES[:-1]},
            "native": native, "containers": containers,
            "unwinders": {"x86_64-unknown-linux-gnu": "zig-libunwind", "aarch64-unknown-linux-gnu": "zig-libunwind"},
            "identities_sha256": IDENTITIES,
            "not_executed": [{**EXIT_3, "rows": LABELS}, {**NON_UTF8, "rows": LABELS[len(TRIPLES):]}], "problems": [], **changes}


def want_summary(receipt, what):
    """The step summary of a qualification RECEIPT, written out."""
    text = f"### qrscan 0.11.0 CLI qualification, {what}: {receipt['verdict']}\n\n| Consumer | Receipt | Verdict |\n"
    text += "|---|---|---|\n" + "".join(f"| {row['target']} | {row['receipt']} | {row['verdict']} |\n"
                                         for row in receipt["native"])
    text += "".join(f"| {row['target']} in {row['image']} | {row['receipt']} | {row['verdict']} |\n"
                    for row in receipt["containers"])
    text += f"\nSHA256SUMS sha256 `{receipt['sums_sha256']}`, identities sha256 `{receipt['identities_sha256']}`.\n"
    return text + ("\n" + "".join(f"- {problem}\n" for problem in receipt["problems"]) if receipt["problems"] else "")


def _qualify_cases(t, fx, release):
    """qualify over the thirteen consumer receipts and the floor report: the clean set passes, each
    planted defect is refused by name. Returns the clean and a failed qualification."""
    sums, other = sha256((release / SUMS_FILE).read_bytes()), sha256(b"other (fixture)")
    want = want_qualification(release)
    code, receipt, written, summary, output = qualify_case(fx, "clean", release)
    t.check("qualify: the clean receipts", (code, receipt, written, summary, output),
            (0, want, want, want_summary(want, "release set"), f"sums_sha256={sums}\ncommit={COMMIT}\n"))
    path = {label: where for label, _target, _box, where in QUALIFY_ROWS}
    linux, darwin, windows = LABELS[0], LABELS[2], LABELS[4]
    alma, deb = LABELS[len(TRIPLES)], LABELS[len(TRIPLES) + 3]
    alpine = LABELS[len(TRIPLES) + 4]
    unwind_134 = {"id": "unwind", "exit": 134, "expected_exit": 101, "ok": False, "detail": ["exit 134, expected 101"]}
    member = f"{archive_file(darwin)}!qrcode-barcode-scanner-cli-0.11.0-{darwin}/qrscan"

    def receipt_of(label, *keys, value):
        def edit(receipts):
            item = receipts[path[label]]
            for key in keys[:-1]:
                item = item[key]
            item[keys[-1]] = value
        return edit

    cases = [  # (label, edit, problems)
        ("a consumer that failed", lambda r: r[path[LABELS[3]]].update(verdict="FAIL", exit=1, problems=["x"]),
         [f"{LABELS[3]}: the consumer's verdict is FAIL (exit 1)"]),
        ("a missing target", lambda r: r.pop(path[windows]), [f"no consumer receipt for {windows}"]),
        ("a missing container row", lambda r: r.pop(path[deb]), [f"no consumer receipt for {deb}"]),
        ("a missing Alpine row", lambda r: r.pop(path[alpine]), [f"no consumer receipt for {alpine}"]),
        ("a wrong musl version", receipt_of(alpine, "container", "musl", value="1.2.4"),
         [f"{alpine}: musl 1.2.4 on linux/amd64, expected 1.2.5 on linux/amd64"]),
        ("a differing sums_sha256", receipt_of(darwin, "sums_sha256", value=other),
         [f"{darwin}: judged a SHA256SUMS of sha256 {other}, expected {sums}"]),
        ("an archive digest that disagrees with its line", receipt_of(alma, "archive", "sha256", value=other),
         [f"{alma}: judged {archive_file(linux)} of sha256 {other}, its SHA256SUMS line says "
          f"{sha256((release / archive_file(linux)).read_bytes())}"]),
        ("an identities digest disagreement", receipt_of(deb, "truth", "identities_sha256", value=other),
         [f"{deb}: identities_sha256 {other}, {linux} reports {IDENTITIES}"]),
        ("a wrong glibc", receipt_of(alma, "container", "glibc", value="2.31"),
         [f"{alma}: glibc 2.31 on linux/amd64, expected 2.28 on linux/amd64"]),
        ("a wrong platform", receipt_of(alma, "container", "platform", value="linux/arm64"),
         [f"{alma}: glibc 2.28 on linux/arm64, expected 2.28 on linux/amd64"]),
        ("a failed unwind", receipt_of(linux, "cases", 1, value=unwind_134),
         [f"{linux}: unwind did not pass (exit 134, expected 101): the panic must unwind"]),
        ("no unwind case", lambda r: r[path[LABELS[1]]]["cases"].pop(1), [f"{LABELS[1]}: 0 unwind cases, expected 1"]),
        ("engine_panics 1", receipt_of(windows, "truth", "engine_panics_total", value=1),
         [f"{windows}: engine-panics: the truth set reports trace.engine_panics 1, expected 0"]),
        ("a truth set cut short", lambda r: r[path[LABELS[6]]]["cases"].pop(),
         [f"{LABELS[6]}: 2 of 2 truth-set cases passed, the truth set holds 3"]),
        ("an unwinder disagreement", lambda r: r.update({FLOOR_PATH: floor_fixture({LABELS[1]: "libgcc_s"})}),
         [f"{LABELS[1]}: build-info.json names the unwinder zig-libunwind, the floor report judged libgcc_s"]),
        ("no floor report", lambda r: r.pop(FLOOR_PATH),
         ["0 native-floor --policy cli reports among the receipts, expected 1"]),
        ("a floor report without an archive", lambda r: r.update({FLOOR_PATH: floor_fixture({darwin: False})}),
         [f"{FLOOR_PATH}: judged {member} 0 times, expected once as {darwin}"]),
        ("a failed floor report", lambda r: r.update({FLOOR_PATH: floor_fixture(verdict="FAIL")}),
         [f"{FLOOR_PATH}: the native-floor verdict is FAIL"]),
        ("a duplicate receipt", lambda r: r.update({"rerun/cli-receipt.json": r[path[darwin]]}),
         [f"2 consumer receipts for {darwin}: {path[darwin]}, rerun/cli-receipt.json"]),
        ("a receipt of a target this release lacks",
         lambda r: r.update({"foreign/cli-receipt.json": {**r[path[linux]], "target": "riscv64gc-unknown-linux-musl"}}),
         ["foreign/cli-receipt.json: a consumer receipt for riscv64gc-unknown-linux-musl, not a row of this release"]),
        ("a receipt of an image this release lacks", lambda r: r.update({"ubuntu/cli-receipt.json": {
            **r[path[alma]], "container": {**r[path[alma]]["container"], "image": image_ref("ubuntu:24.04")}}}),
         [f"ubuntu/cli-receipt.json: a consumer receipt for {linux} in ubuntu:24.04, not a row of this release"]),
        ("a file that is not JSON", lambda r: r.update({"broken/cli-receipt.json": "{"}),
         ["broken/cli-receipt.json is not JSON"]),
    ]
    failed = None
    for label, edit, problems in cases:
        code, receipt, written, summary, output = qualify_case(fx, label, release, edit)
        failed = failed or fx.base / "qualify" / f"{label}.result" / "qualification.json"
        t.check(f"qualify: {label}", (code, receipt["verdict"], receipt["problems"], written == receipt, output),
                (1, "FAIL", problems, True, None))
    t.check("qualify: a failed summary names each problem", summary, want_summary(receipt, "release set"))
    _qualify_more(t, fx, release, want)
    return fx.base / "qualify" / "clean.result" / "qualification.json", failed


def _qualify_more(t, fx, release, want):
    """Receipts of another commit, a JSON file of another kind, a release directory holding an archive
    under the old package name, and the usage errors."""
    code, receipt, _written, _summary, output = qualify_case(fx, "another commit", release, commit=OTHER)
    t.check("qualify: receipts of another commit", (code, receipt["commit"], receipt["problems"], output), (
        1, OTHER, [f"{label}: {key} {COMMIT}, expected {OTHER}" for label in LABELS
                   for key in ("consumer_commit", "contract_commit")], None))
    inspection = {"schema": "qrscan-package-inspect/1", "verdict": "PASS"}
    code, receipt, *_rest = qualify_case(fx, "another kind of JSON", release,
                                         lambda r: r.update({"cli-receipt-inspect/inspect.json": inspection}))
    t.check("qualify: a JSON file of another kind is not a receipt", (code, receipt), (0, want))
    label, stale = "an archive under the old package name", f"qrcode-ai-scanner-cli-0.11.0-{TRIPLES[0]}.tar.gz"
    old = fx.base / "qualify" / "old-name-release"
    shutil.copytree(release, old)
    shutil.copyfile(release / archive_file(TRIPLES[0]), old / stale)
    github = fx.base / "qualify" / f"{label}.result" / "github-output"
    code, receipt, written, _summary, output = qualify_case(
        fx, label, release, options=["--release-dir", str(old), "--github-output", str(github)])
    t.check(f"qualify: {label}", (code, receipt["verdict"], receipt["problems"], written == receipt, output),
            (1, "FAIL", [f"the release directory holds {stale}, not an asset of this set"], True, None))
    env = fx.env(True, GH_TOKEN="fixture", **QUALIFY_ENV)
    bad = IDENTITIES.upper()
    cases = [  # (label, options, keywords, problems)
        ("GH_TOKEN set", None, {"env": env}, ["GH_TOKEN set: qualify reads files and runs without a token"]),
        ("no --release-dir", [], {}, ["qualify needs --release-dir"]),
        ("an anchor without --public", ["--release-dir", str(release), "--anchor-identities", IDENTITIES], {},
         ["qualify does not take --anchor-identities"]),
        ("--public with the release-set options", ["--public", "--release-dir", str(release), "--github-output", "x"],
         {}, ["qualify --public needs --anchor-sums-sha256", "qualify --public needs --anchor-identities",
              "qualify --public does not take --release-dir", "qualify --public does not take --github-output"]),
        ("--public with malformed anchors", ["--public", "--anchor-sums-sha256", "abc", "--anchor-identities", bad],
         {}, ["--anchor-sums-sha256 'abc' is not 64 lowercase hex digits",
              f"--anchor-identities '{bad}' is not 64 lowercase hex digits"]),
        ("git without a commit", None, {"commit": "HEAD"}, ["git reports HEAD^{commit} 'HEAD'"]),
    ]
    for label, options, keywords, problems in cases:
        code, receipt, written, summary, output = qualify_case(fx, f"usage {label}", release, options=options,
                                                               **keywords)
        t.check(f"qualify: {label}", (code, receipt, written, summary, output),
                (2, {"command": "qualify", "verdict": "ERROR", "problems": problems}, None, None, None))
    _qualify_public(t, fx, release, want)


def _qualify_public(t, fx, release, want):
    """qualify --public over the anonymous fetches and the thirteen consumers judged on the anchor's contract."""
    sums, other = sha256((release / SUMS_FILE).read_bytes()), sha256(b"other (fixture)")
    env = fx.env(True, **{**QUALIFY_ENV, "GITHUB_EVENT_NAME": "workflow_dispatch", "GITHUB_REF": "refs/heads/main",
                          "GITHUB_RUN_ID": "223344"})
    public = {**{key: value for key, value in want.items() if key != "problems"}, "ref": "refs/heads/main",
              "event": "workflow_dispatch", "run_id": "223344", "unwinders": None,
              "anchor": {"sums_sha256": sums, "identities_sha256": IDENTITIES, "contract_commit": OTHER},
              "fetch": {"repository": "qrcode-ai-com/qrcode-barcode-scanner", "tag": "v0.11.0",
                        "assets": {name: sha256((release / name).read_bytes()) for name in NAMES}},
              "attestation": {"claimed": False, "reason": "gh release verify runs in its own step, only with "
                                                          "expect_immutable"}, "problems": []}
    code, receipt, written, summary, output = qualify_case(fx, "public", release, env=env, public=True)
    t.check("qualify --public: the clean download", (code, receipt, list(receipt), written, summary, output),
            (0, public, list(public), public, want_summary(public, "public download"), None))
    anchors = ["--public", "--anchor-sums-sha256", sums, "--anchor-identities", IDENTITIES]
    line = sha256((release / NAMES[0]).read_bytes())

    def fetch(index, **changes):
        return lambda r: r.update({f"cli-fetch-{index}/cli-fetch.json": fetch_fixture(release, [], **changes)})

    def tampered(r):
        r["cli-fetch-all/cli-fetch.json"]["assets"][1]["sha256"] = other

    cases = [  # (label, edit, options, problems)
        ("SHA256SUMS other than the anchor's", None, [*anchors[:2], other, *anchors[3:]],
         [f"the fetched {SUMS_FILE} has sha256 {sums}, the anchor's is {other}",
          *(f"{label}: judged a SHA256SUMS of sha256 {sums}, expected {other}" for label in LABELS)]),
        ("identities other than the anchor's", None, [*anchors[:4], other],
         [f"{label}: identities_sha256 {IDENTITIES}, the anchor reports {other}" for label in LABELS]),
        ("a fetch that held a token", fetch(2, verdict="FAIL", exit=2, token_in_env=True, problems=["token"]), None,
         ["cli-fetch-2/cli-fetch.json: fetch verdict FAIL (exit 2, mode release, token in env True)"]),
        ("two fetches that disagree", tampered, None,
         [f"cli-fetch-all/cli-fetch.json: fetched {NAMES[0]} of sha256 {other}, another fetch got {line}"]),
        ("a fetch of another release", fetch(3, tag="v0.10.0"), None,
         ["the fetch receipts name ['qrcode-ai-com/qrcode-barcode-scanner v0.10.0', "
          "'qrcode-ai-com/qrcode-barcode-scanner v0.11.0'], not one vX.Y.Z release",
          *(f"{label}: {problem}" for label, target, _box, _path in QUALIFY_ROWS for problem in (
              "release 0.11.0, expected None", f"judged {archive_file(target)} of sha256 "
              f"{sha256((release / archive_file(target)).read_bytes())}, its SHA256SUMS line says None"))]),
        ("a consumer on another contract", lambda r: r[QUALIFY_ROWS[3][3]].update(contract_commit=COMMIT), None,
         [f"{LABELS[3]}: contract_commit {COMMIT}, expected {OTHER}"]),
        ("consumers without a contract commit", lambda r: [r[row[3]].update(contract_commit=None)
                                                           for row in QUALIFY_ROWS], None,
         ["the consumers name the contract commit None, not a full commit"]),
    ]
    for label, edit, options, problems in cases:
        code, receipt, *_rest = qualify_case(fx, f"public {label}", release, edit, options, env=env, public=True)
        t.check(f"qualify --public: {label}", (code, receipt["verdict"], receipt["problems"]), (1, "FAIL", problems))


RUN_VIEW = {"workflowName": "cli-archives", "headSha": COMMIT, "headBranch": "v0.11.0", "event": "push",
            "status": "completed", "conclusion": "success"}


def anchor_case(fx, label, qualification, view=None, run="123456", extra=(), env=None):
    """(exit, printed receipt, GitHub output or None) of one anchor on `gh run view` output: RUN_VIEW with VIEW."""
    where = fx.base / "anchor" / label
    put(where / "run.json", json.dumps({**RUN_VIEW, **(view or {})}))
    argv = ["anchor", "--tag", "v0.11.0", "--run", run, "--qualification", str(qualification), "--run-view",
            str(where / "run.json"), "--github-output", str(where / "github-output"), *extra]
    code, text, _calls = fx.invoke(argv, env=env)
    output = where / "github-output"
    return code, json.loads(text), output.read_text(encoding="utf-8") if output.exists() else None


def _anchor_cases(t, fx, qualification, failed):
    """anchor on the clean qualification and `gh run view` of its run; each departure refused by name."""
    q = json.loads(qualification.read_bytes())
    sums, other = q["sums_sha256"], sha256(b"other (fixture)")
    edited = {}
    for label, change in (("branch", {"ref": "refs/heads/main"}), ("no identities", {"identities_sha256": None}),
                          ("dispatch", {"event": "workflow_dispatch"}), ("pull request", {"event": "pull_request"}),
                          ("review", {"event": "pull_request_review"}), ("another commit", {"commit": OTHER})):
        edited[label] = fx.base / "anchor" / f"qualification {label}.json"
        put(edited[label], json.dumps({**q, **change}))
    want = {"schema": "qrscan-cli-anchor/1", "phase": "anchor", "verdict": "PASS", "tag": "v0.11.0", "run": "123456",
            "workflow": "cli-archives", "head_sha": COMMIT, "event": "push", "sums_sha256": sums, "commit": COMMIT,
            "identities_sha256": IDENTITIES, "problems": []}
    for label, path, event in (("the qualified tag run", qualification, "push"),
                               ("a workflow_dispatch of the tag", edited["dispatch"], "workflow_dispatch")):
        code, receipt, output = anchor_case(fx, label, path, {"event": event})
        t.check(f"anchor: {label}", (code, receipt, output),
                (0, {**want, "event": event}, f"sums_sha256={sums}\ncommit={COMMIT}\nidentities_sha256={IDENTITIES}\n"))
    for label, extra in (("with the cross-check", ["--sums-sha256", sums]), ("with an empty cross-check",
                                                                          ["--sums-sha256", ""])):
        code, receipt, output = anchor_case(fx, label, qualification, extra=extra)
        t.check(f"anchor: {label}", (code, receipt["verdict"], output is not None), (0, "PASS", True))
    not_a_tag = "event, not a push or workflow_dispatch: only those run on a tag"
    cases = [  # (label, anchor_case keywords, problems)
        ("another workflow", {"view": {"workflowName": "ci"}},
         ["run 123456 belongs to the workflow ci, not cli-archives"]),
        ("a failed conclusion", {"view": {"conclusion": "failure"}},
         ["run 123456 is completed with conclusion failure, not completed with success"]),
        ("a run in progress", {"view": {"status": "in_progress", "conclusion": ""}},
         ["run 123456 is in_progress with conclusion none, not completed with success"]),
        ("another branch", {"view": {"headBranch": "main"}}, ["run 123456 ran on main, not the tag v0.11.0"]),
        # A pull request's own copy of the workflow and script, its branch named like the tag, writes a
        # qualification that agrees with its run in every field: only the event refuses it.
        ("a pull_request run", {"qualification": edited["pull request"], "view": {"event": "pull_request"}},
         [f"run 123456 was a pull_request {not_a_tag}"]),
        ("a pull_request_review run", {"qualification": edited["review"], "view": {"event": "pull_request_review"}},
         [f"run 123456 was a pull_request_review {not_a_tag}"]),
        ("headSha other than github_sha", {"view": {"headSha": OTHER}},
         [f"run 123456 ran on {OTHER}, the qualification records GITHUB_SHA {COMMIT}",
          f"the qualification's commit {COMMIT} is not the run's headSha {OTHER}"]),
        ("a commit other than headSha", {"qualification": edited["another commit"]},
         [f"the qualification's commit {OTHER} is not the run's headSha {COMMIT}"]),
        ("another event", {"view": {"event": "workflow_dispatch"}},
         ["run 123456 was a workflow_dispatch event, the qualification records push"]),
        ("the cross-check", {"extra": ["--sums-sha256", other]},
         [f"--sums-sha256 {other} is not the qualification's {sums}"]),
        ("another run", {"run": "654321"}, ["the qualification was written by run 123456, not 654321"]),
        ("a failed qualification", {"qualification": failed},
         ["the qualification is qrscan-cli-qualification/1 FAIL, not qrscan-cli-qualification/1 PASS"]),
        ("a qualification of a branch", {"qualification": edited["branch"]},
         ["the qualification is of refs/heads/main (0.11.0), not refs/tags/v0.11.0"]),
        ("a qualification without identities", {"qualification": edited["no identities"]},
         ["the qualification's identities_sha256 is None"]),
    ]
    for label, keywords, problems in cases:
        keywords = {"qualification": qualification, **keywords}
        code, receipt, output = anchor_case(fx, label, keywords.pop("qualification"), **keywords)
        t.check(f"anchor: {label}", (code, receipt["verdict"], receipt["problems"], output),
                (1, "FAIL", problems, None))
    _anchor_usage(t, fx, qualification)


def _anchor_usage(t, fx, qualification):
    """anchor --validate on the dispatch inputs; usage, malformed files and a token stopped with exit 2."""
    code, text, _calls = fx.invoke(["anchor", "--validate", "--tag", "v0.11.0", "--run", "123456"])
    t.check("anchor --validate: the dispatch inputs", (code, json.loads(text)), (0, {
        "schema": "qrscan-cli-anchor/1", "phase": "validate", "verdict": "PASS", "tag": "v0.11.0", "run": "123456",
        "problems": []}))
    garbled = fx.base / "anchor" / "garbled.json"
    put(garbled, "{")
    for label, argv, env, problems in (
            ("--validate on malformed inputs", ["--validate", "--tag", "v0.11", "--run", "12a", "--sums-sha256", "XYZ"],
             None, ["--tag 'v0.11' is not vX.Y.Z", "--run '12a' is not a workflow run id",
                    "--sums-sha256 'XYZ' is not 64 lowercase hex digits"]),
            ("--validate with a file", ["--validate", "--tag", "v0.11.0", "--run", "1", "--qualification", "q.json"],
             None, ["anchor --validate does not take --qualification"]),
            ("no --run-view", ["--tag", "v0.11.0", "--run", "1", "--qualification", "q.json", "--github-output", "o"],
             None, ["anchor needs --run-view"]),
            ("a run view that is not JSON", ["--tag", "v0.11.0", "--run", "123456", "--qualification",
                                             str(qualification), "--run-view", str(garbled), "--github-output", "o"],
             None, [f"the run view {garbled} is not JSON"]),
            ("GH_TOKEN set", ["--validate", "--tag", "v0.11.0", "--run", "123456"], fx.env(GH_TOKEN="fixture"),
             ["GH_TOKEN set: anchor reads files and runs without a token"])):
        code, text, _calls = fx.invoke(["anchor", *argv], env=env)
        t.check(f"anchor: {label}", (code, json.loads(text)),
                (2, {"command": "anchor", "verdict": "ERROR", "problems": problems}))


CLI_RUNNERS = {  # (build runner, consumer runner) of each target, written out
    "x86_64-unknown-linux-gnu": ("ubuntu-24.04", "ubuntu-24.04"),
    "aarch64-unknown-linux-gnu": ("ubuntu-24.04", "ubuntu-24.04-arm"),
    "x86_64-apple-darwin": ("macos-15", "macos-15-intel"),
    "aarch64-apple-darwin": ("macos-15", "macos-15"),
    "x86_64-pc-windows-msvc": ("windows-2025", "windows-2025"),
    "x86_64-unknown-linux-musl": ("ubuntu-24.04", "ubuntu-24.04"),
    "aarch64-unknown-linux-musl": ("ubuntu-24.04-arm", "ubuntu-24.04-arm"),
}
BOX_RUNNERS = {"linux/amd64": "ubuntu-24.04", "linux/arm64": "ubuntu-24.04-arm"}


def matrix_yaml(jobs):
    """A workflow whose JOBS {job: include rows} hold flow-mapping matrix rows, values quoted."""
    lines = ["name: cli-archives", "on: push", "jobs:"]
    for job, rows in jobs.items():
        lines += [f"  {job}:", "    strategy:", "      fail-fast: false", "      matrix:", "        include:"]
        lines += ["          - { " + ", ".join(f"{key}: {json.dumps(value)}" for key, value in row.items()) + " }"
                  for row in rows]
    return "\n".join(lines) + "\n"


def _matrix_cases(t, base):
    """The workflow matrices equal TARGETS: the derived rows, a parsed workflow, each drift named, and
    the real workflow when the tree holds it. Returns how the real workflow was judged."""
    digests = {image: image_ref(image) for _target, image, _platform, _glibc in BOXES}
    native = {kind: [{"target": target, "runner": CLI_RUNNERS[target][index]} for target in TRIPLES]
              for index, kind in enumerate(("build", "consume"))}
    boxes = [{"target": target, "runner": BOX_RUNNERS[platform], "image": image, "platform": platform,
              "musl" if target.endswith("-linux-musl") else "glibc": glibc}
             for target, image, platform, glibc in BOXES]
    t.check("matrices: TARGETS written out", expected_matrices(), {
        "build": native["build"], "consume": native["consume"], "consume-container": boxes,
        "public-download": native["consume"], "public-download-container": boxes, "fetch-rehearsal": native["consume"]})
    pinned = [{**row, "image": digests[row["image"]]} for row in boxes]
    jobs = {"build": native["build"], "consume": native["consume"], "consume-container": pinned,
            "public-download": native["consume"], "public-download-container": pinned,
            "fetch-rehearsal": native["consume"]}
    clean = guard_module().load_yaml(matrix_yaml(jobs))
    t.check("matrices: the parsed workflow", ({job: dig(clean, "jobs", job, "strategy", "matrix", "include")
                                               for job in jobs}, matrix_problems(clean)), (jobs, []))
    alma, other = digests["almalinux:8.10-minimal"], f"almalinux:8.10-minimal@sha256:{'e' * 64}"

    def row(job, index, **changes):
        def edit(workflow):
            workflow["jobs"][job]["strategy"]["matrix"]["include"][index].update(changes)
        return edit

    def text(**row):
        return json.dumps(row, sort_keys=True)

    cases = [  # (label, edit, problems)
        ("a target missing from consume", lambda w: w["jobs"]["consume"]["strategy"]["matrix"]["include"].pop(),
         [f"consume: no matrix row {text(runner='ubuntu-24.04-arm', target=TRIPLES[-1])}"]),
        ("a duplicate musl row in build", lambda w: w["jobs"]["build"]["strategy"]["matrix"]["include"].append(
            {"target": "x86_64-unknown-linux-musl", "runner": "ubuntu-24.04"}),
         ["build: a matrix row TARGETS does not hold: "
          + text(runner="ubuntu-24.04", target="x86_64-unknown-linux-musl")]),
        ("the arm64 consumer on an x86_64 runner", row("consume", 1, runner="ubuntu-24.04"),
         [f"consume: no matrix row {text(runner='ubuntu-24.04-arm', target=TRIPLES[1])}",
          f"consume: a matrix row TARGETS does not hold: {text(runner='ubuntu-24.04', target=TRIPLES[1])}"]),
        ("an image without a digest", row("consume-container", 0, image="almalinux:8.10-minimal"),
         ["consume-container: almalinux:8.10-minimal is not pinned as NAME@sha256:<64 hex>",
          f"public-download-container: {TRIPLES[0]} runs {alma}, another job pins almalinux:8.10-minimal"]),
        ("two digests of one image", row("public-download-container", 2, image=other),
         [f"public-download-container: {TRIPLES[1]} runs {other}, another job pins {alma}"]),
        ("a wrong glibc", row("consume-container", 1, glibc="2.31"),
         [f"consume-container: no matrix row {text(**boxes[1])}",
          f"consume-container: a matrix row TARGETS does not hold: {text(**{**boxes[1], 'glibc': '2.31'})}"]),
        ("a matrix of lists", lambda w: w["jobs"]["fetch-rehearsal"]["strategy"].update(
            matrix={"target": list(TRIPLES), "runner": ["macos-15"]}),
         ["fetch-rehearsal: strategy.matrix is not one include: list of rows"]),
        ("include beside another key", lambda w: w["jobs"]["consume"]["strategy"]["matrix"].update(os=["linux"]),
         ["consume: strategy.matrix is not one include: list of rows"]),
        ("a job missing", lambda w: w["jobs"].pop("public-download"),
         ["public-download: strategy.matrix is not one include: list of rows"]),
    ]
    for label, edit, problems in cases:
        workflow = json.loads(json.dumps(clean))
        edit(workflow)
        t.check(f"matrices: {label}", matrix_problems(workflow), problems)
    return _workflow_matrix_cases(t, base, jobs)


def _workflow_matrix_cases(t, base, jobs):
    """workflow_matrix_problems on a tree without the workflow, with a clean one, with an unreadable
    one, then on this checkout. Returns how this checkout's workflow was judged."""
    t.check("matrices: a tree without the workflow", workflow_matrix_problems(base / "no-workflow"), None)
    put(base / "matrix-tree" / WORKFLOW, matrix_yaml(jobs))
    t.check("matrices: a tree with a clean workflow", workflow_matrix_problems(base / "matrix-tree"), [])
    put(base / "matrix-broken" / WORKFLOW, "jobs:\n  build: &anchor\n")
    found = workflow_matrix_problems(base / "matrix-broken")
    t.check("matrices: an unreadable workflow", (len(found), found[0].startswith(f"{WORKFLOW} is unreadable: ")),
            (1, True))
    found = workflow_matrix_problems(ROOT)
    if found is None:
        return "not present"
    t.check(f"matrices: {WORKFLOW} in this checkout", found, [])
    return "checked"


def _unit_cases(t, base):
    """SPDX expressions, the toolchain pin, the writers and THIRD-PARTY-LICENSES.txt, exactly."""
    allowed = {"mit", "apache-2.0", "apache-2.0 with llvm-exception", "unicode-3.0"}
    for expression, want in (("MIT/Apache-2.0", True), ("(MIT OR Apache-2.0) AND Unicode-3.0", True),
                             ("GPL-3.0-only", False), ("MIT AND GPL-3.0-only", False), ("GPL-3.0-only OR MIT", True),
                             ("Apache-2.0 WITH LLVM-exception", True),
                             ("GPL-2.0-only WITH Classpath-exception-2.0", False)):
        t.check(f"SPDX {expression}", spdx_allowed(spdx_parse(expression), allowed), want)
    for expression, error in (("MIT OR", "expected a license identifier at None"), ("(MIT", "unbalanced parenthesis"),
                              ("MIT Apache-2.0", "unexpected 'Apache-2.0'")):
        t.check(f"SPDX {expression!r} refused", attempt(spdx_parse, expression), f"ValueError: {error}")
    t.check("SPDX legacy slash", spdx_parse("MIT/Apache-2.0"), ("or", [("id", "MIT"), ("id", "Apache-2.0")]))
    t.check("no license expression", license_problem("x", "1.0.0", None, allowed),
            "x 1.0.0 declares no license expression: a reviewed override names one")
    refused = [f"{WORKFLOW} holds {count} top-level env RUST_TOOLCHAIN x.y.z, not one" for count in (0, 2)]
    for label, text, want in (
            ("pinned", 'env:\n  RUST_TOOLCHAIN: "1.99.1"  # = ci.yml\njobs: {}\n', "1.99.1"),
            ("job-level", 'jobs:\n  build:\n    env:\n      RUST_TOOLCHAIN: "1.99.1"\n', refused[:1]),
            ("twice", "env:\n  RUST_TOOLCHAIN: 1.99.1\n  RUST_TOOLCHAIN: '1.98.1'\n", refused[1:]),
            ("a channel", "env:\n  RUST_TOOLCHAIN: stable\n", refused[:1])):
        put(base / "pins" / label / WORKFLOW, text)
        try:
            got = toolchain_pin(base / "pins" / label)
        except Stop as stop:
            got = stop.problems
        t.check(f"toolchain pin, {label}", got, want)
    data = gzip_bytes(b"qrscan")
    t.check("gzip header and body", (data[:10], zlib.decompress(data, 31)), (GZIP_HEADER, b"qrscan"))
    t.check("a name past USTAR", attempt(write_archive, "t" * 90, {"long-member": (b"", 0o644)}, EPOCH, "tar.gz"),
            f"ValueError: a member of {'t' * 90} needs more than the USTAR name field")
    t.check("a zip before 1980", attempt(write_archive, "top", {"a": (b"", 0o644)}, 0, "zip"),
            "ValueError: zip timestamps start in 1980")
    t.check("SHA256SUMS lines", sums_bytes({"b": b"2", "a": b"1"}), f"{sha256(b'1')}  a\n{sha256(b'2')}  b\n".encode())
    texts = {sha256(MIT): MIT, sha256(APACHE): APACHE}
    crates = [{"name": "clap", "version": "4.5.40", "license": "MIT OR Apache-2.0", "source": CRATES_IO,
               "checksum": checksum("clap", "4.5.40"), "texts": sorted(texts)}]
    linux = "x86_64-unknown-linux-gnu"
    data = third_party_bytes("0.11.0", linux, crates, texts)
    want = (f"Third-party crates in qrscan 0.11.0 for {linux}, and their license texts\n\n== clap 4.5.40 ==\n"
            f"license: MIT OR Apache-2.0\nsource: {CRATES_IO}\nchecksum: {checksum('clap', '4.5.40')}\n"
            f"texts: {' '.join(sorted(texts))}\n\n").encode()
    want += b"".join(f"--- text {digest} {len(texts[digest])} bytes ---\n".encode() + texts[digest] + b"\n"
                     for digest in sorted(texts))
    t.check("THIRD-PARTY-LICENSES.txt bytes", data, want)
    t.check("THIRD-PARTY-LICENSES.txt read back", attempt(parse_third_party, data, "0.11.0", linux), (crates, texts))
    t.check("THIRD-PARTY-LICENSES.txt cut short", attempt(parse_third_party, data[:-2], "0.11.0", linux),
            f"ValueError: the text {sorted(texts)[-1]} is cut short or repeated")
    header = f"Third-party crates in qrscan 0.11.0 for {linux}, and their license texts"
    t.check("THIRD-PARTY-LICENSES.txt for another target", attempt(parse_third_party, data, "0.11.0", TRIPLES[1]),
            f"ValueError: the header is {header!r}, or no empty line follows it")


def self_test():
    """Clean and planted runs of every command on stub tools and fixture JSON in a temporary
    directory, and the workflow matrices against TARGETS. No process here holds a token."""
    if os.name == "nt" or " " in sys.executable:
        print("--self-test runs its stub tools as #! scripts: it needs a POSIX host and an interpreter path "
              "without spaces", file=sys.stderr)
        return 2
    t, base = Tally(), Path(tempfile.mkdtemp(prefix="cli-release-self-test-")).resolve()
    try:
        fx = Fixture(base)
        above = cargo_configs(fx.root, fx.cargo_home)
        if above:
            print(f"--self-test: a Cargo config above the temporary directory would apply: {above[0]}",
                  file=sys.stderr)
            return 2
        _unit_cases(t, base)
        _build_clean(t, fx)
        _build_planted(t, fx)
        release = _assemble_clean(t, fx)
        _assemble_planted(t, fx)
        _writer_cases(t, fx)
        _license_cases(t, fx, release)
        _command_cases(t, fx)
        _plan_list_cases(t, fx)
        _plan_cases(t, fx, release)
        _readback_cases(t, fx, release)
        qualification, failed = _qualify_cases(t, fx, release)
        _anchor_cases(t, fx, qualification, failed)
        workflow = _matrix_cases(t, base)
    finally:
        shutil.rmtree(base, ignore_errors=True)
    print(json.dumps({"self_test": "FAIL" if t.failures else "PASS", "checks": t.count,
                      "workflow_matrices": workflow, "failures": [failure[:3000] for failure in t.failures]}, indent=2))
    return 1 if t.failures else 0

# ---------------------------------------------------------------- main


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--self-test", action="store_true", help="clean and planted runs on stub tools")
    commands = parser.add_subparsers(dest="command", metavar="COMMAND")
    sub = commands.add_parser("targets", help="the release targets and the source-asset flag, as JSON")
    sub.set_defaults(handler=cmd_targets)
    sub = commands.add_parser("build", help="build one target's qrscan and its build facts")
    sub.add_argument("--target", required=True, choices=list(TARGETS))
    sub.add_argument("--out", required=True, help="new or empty: receives qrscan[.exe] and build-facts.json")
    sub.add_argument("--target-dir", required=True, help="new or empty cargo target directory, outside the checkout")
    sub.add_argument("--allow-dirty", action="store_true", help="outside GitHub Actions only")
    sub.set_defaults(handler=cmd_build)
    sub = commands.add_parser("assemble", help="the release set from the cli-build-<target> directories")
    sub.add_argument("--builds", required=True)
    sub.add_argument("--out", required=True, help="new or empty, outside the checkout")
    sub.add_argument("--receipt")
    sub.add_argument("--partial", action="store_true", help="fewer than every target, outside GitHub Actions only")
    sub.set_defaults(handler=cmd_assemble)
    sub = commands.add_parser("licenses", help="re-check the license material of a release set")
    sub.add_argument("--check-release", required=True, metavar="DIR")
    sub.add_argument("--receipt")
    sub.set_defaults(handler=cmd_licenses)
    sub = commands.add_parser("notes", help="release notes for X.Y.Z")
    sub.add_argument("--version", required=True)
    sub.set_defaults(handler=cmd_notes)
    # The release commands read files only; usage() names the options each form needs.
    sub = commands.add_parser("qualify", help="judge the consumer receipts of a release set or of its public download")
    for option in ("--release-dir", "--receipts", "--out", "--summary", "--github-output", "--anchor-sums-sha256",
                   "--anchor-identities"):
        sub.add_argument(option)
    sub.add_argument("--public", action="store_true")
    sub.set_defaults(handler=cmd_qualify)
    sub = commands.add_parser("attach-plan", help="exactly one release carries the tag; what to upload into it")
    sub.add_argument("--phase", choices=["list", "plan"], required=True)
    for option in ("--tag", "--list", "--commit", "--view", "--present", "--release-dir", "--record", "--out",
                   "--upload-list"):
        sub.add_argument(option)
    sub.set_defaults(handler=cmd_attach_plan)
    sub = commands.add_parser("readback", help="the CLI assets on the release are the inspected set")
    for option in ("--tag", "--commit", "--view", "--dir", "--record", "--summary"):
        sub.add_argument(option)
    sub.set_defaults(handler=cmd_readback)
    sub = commands.add_parser("anchor", help="the qualified tag run behind a public download")
    sub.add_argument("--validate", action="store_true")
    for option in ("--tag", "--run", "--qualification", "--run-view", "--sums-sha256", "--github-output"):
        sub.add_argument(option)
    sub.set_defaults(handler=cmd_anchor)
    return parser


def main(argv=None, env=None, root=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if args.command is None:
        parser.error("give a command, or --self-test")
    env = dict(os.environ) if env is None else env
    try:
        return args.handler(args, env, ROOT if root is None else Path(root))
    except Stop as stop:
        emit({"command": args.command, "verdict": "FAIL" if stop.code == 1 else "ERROR", "problems": stop.problems})
        return stop.code


if __name__ == "__main__":
    sys.exit(main())
