#!/usr/bin/env python3
"""Run qrscan from its release archive on a fresh host, the way a user would.

  packed-cli-consumer.py --release-dir DIR --target T [--sums-sha256 H] [--contract-root DIR] [--receipt F]
      [--container IMAGE@sha256:H --platform linux/amd64|linux/arm64 --expect-glibc X.Y]
  packed-cli-consumer.py fetch --repository OWNER/REPO --tag vX.Y.Z --sums-sha256 H (--target T | --all)
      --out DIR [--receipt F]
  packed-cli-consumer.py fetch --rehearsal --repository OWNER/REPO --tag TAG --asset NAME --sha256 H
      --out DIR [--receipt F]
  packed-cli-consumer.py --self-test

The consumer never builds Rust. It checks the release's SHA256SUMS (exact format and, with
--sums-sha256, its own sha256), hashes the target's archive with hashlib and with the OS tool
(sha256sum, shasum -a 256 or PowerShell Get-FileHash) against its line, extracts it with the OS tool
(tar, or Expand-Archive for the zip) into a new temporary directory outside the checkout, and holds
the extracted tree to the archive's exact members. The inputs come from the contract root (this
checkout, or --contract-root): the gen_v5_q.png control, a white PNG, bytes that are not an image,
unicode names and the shared truth set (fixtures/consumer-truth.json, judged by consumer_truth.py).
Every case runs with PATH holding system directories only, new empty HOME and temporary
directories, and no CARGO_*, RUST*, RAYON_*, colour or token variable unless the case sets it:
version, help, capabilities, usage and read errors, the JSON, frame, score-only and pretty outputs,
colour, paths, the PATH lookup, a panic that must unwind (exit 101, never an abort) and the truth
set, where every report must carry trace.engine_panics 0. With --container the same cases run in
that digest-pinned image (docker run --network none --read-only --cap-drop ALL ...) on the extracted
tree mounted read-only, and the image's glibc must be --expect-glibc. Not executed: exit 3 (budget-
and machine-dependent), a panic through engine frames (no deterministic fixture) and non-UTF-8 file
names outside native Linux.

fetch downloads release assets anonymously: an HTTPS GET of
https://github.com/OWNER/REPO/releases/download/TAG/ASSET without an Authorization header, following
redirects only to https:// on github.com or a *.githubusercontent.com host, which must serve the
bytes. It refuses to start while GH_TOKEN or GITHUB_TOKEN is set. An unpublished draft answers 404,
so a download also proves publication. The release form checks SHA256SUMS against --sums-sha256 and
each asset against its line; --rehearsal checks one asset of any release against --sha256 and
requires its line in that release's SHA256SUMS.

Receipts: qrscan-cli-consumer/1 and qrscan-cli-fetch/1, printed and written to --receipt. The
consumer receipt names the truth file by the sha256 of its blob at the contract commit (a Windows
checkout's CRLF copy included); an edited copy, or one outside git, by its own bytes. Exit 0 when
every check passes, 1 when one fails, 2 for usage, a missing input or tool, or a token in fetch's
environment. Stdlib only, Python >= 3.11.
"""
import argparse
import base64
import contextlib
import datetime
import hashlib
import http.client
import http.server
import importlib.util
import io
import json
import os
from pathlib import Path
import platform
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import tomllib
import urllib.error
import urllib.parse
import urllib.request
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "qrscan-cli-consumer/1"
FETCH_SCHEMA = "qrscan-cli-fetch/1"
PREFIX = "qrcode-barcode-scanner-cli-"
# triple: (the OS that runs it, as sys.platform names it; machine; archive extension)
TARGETS = {
    "x86_64-unknown-linux-gnu": ("linux", "x86_64", "tar.gz"),
    "aarch64-unknown-linux-gnu": ("linux", "aarch64", "tar.gz"),
    "x86_64-apple-darwin": ("darwin", "x86_64", "tar.gz"),
    "aarch64-apple-darwin": ("darwin", "aarch64", "tar.gz"),
    "x86_64-pc-windows-msvc": ("win32", "x86_64", "zip"),
}
_VERSION = r"(?P<version>\d+\.\d+\.\d+)"
ARCHIVE = re.compile("^" + re.escape(PREFIX) + _VERSION + "-(?P<target>" + "|".join(map(re.escape, TARGETS))
                     + r")\.(?P<ext>tar\.gz|zip)$")
SOURCE = re.compile("^" + re.escape(PREFIX) + _VERSION + r"-source\.tar\.gz$")
SUMS = re.compile("^" + re.escape(PREFIX) + _VERSION + "-SHA256SUMS$")
SUMS_LINE = re.compile(r"^(?P<sha256>[0-9a-f]{64})  (?P<name>[!-~]+)$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
# every member besides the binary, under one top directory named like the archive
MEMBERS = ("COPYRIGHT-rust-std.html", "LICENSE", "LICENSE-APACHE-2.0", "LICENSING.md", "README.md", "SOURCE.md",
           "THIRD-PARTY-LICENSES.txt", "THIRD-PARTY.md", "build-info.json")
TRUTH_FILE = "fixtures/consumer-truth.json"
CONTROL = "clean/gen_v5_q.png"
CONTROL_TEXT = "https://qrcode-ai.com/c/v5q"
CONTROL_CONTENT = {"text": CONTROL_TEXT, "raw": base64.b64encode(CONTROL_TEXT.encode()).decode(), "charset": "utf8"}
UNICODE_DIR, UNICODE_FILE, UNICODE_MISSING = "données 测试", "gen v5 q ✓.png", "absent-é ✓.png"
NON_UTF8 = b"qr-\xff.png"
CAP = 64 * 1024
TIMEOUT = 120
PLATFORMS = {"linux/amd64": "x86_64", "linux/arm64": "aarch64"}
IMAGE = re.compile(r"^[a-z0-9][a-z0-9._/:-]*@sha256:[0-9a-f]{64}$")
# SIGABRT as a signal, as a shell's 128 + 6, and Windows' fail-fast STATUS_STACK_BUFFER_OVERRUN
ABORTS = {-6, 134, 0xC0000409, 0xC0000409 - (1 << 32)}
GITHUB = "github.com"
ASSET_HOST = ".githubusercontent.com"
MAX_ASSET = 256 * 1024 * 1024
TOKENS = ("GH_TOKEN", "GITHUB_TOKEN")
REPOSITORY = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9._-]{1,100}$")
RELEASE_TAG = re.compile(r"^v\d+\.\d+\.\d+$")
ANY_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._+-]{0,200}$")


class Refused(Exception):
    """A check failed (exit 1); each argument is one named problem."""


class Unavailable(Exception):
    """A missing input or tool (exit 2)."""


class _Missing:
    def __repr__(self):
        return "missing"


MISSING = _Missing()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def get(value, *keys):
    """VALUE[key][key]..., or MISSING where a level is absent."""
    for key in keys:
        if isinstance(value, dict) and isinstance(key, str) and key in value:
            value = value[key]
        elif isinstance(value, list) and isinstance(key, int) and -len(value) <= key < len(value):
            value = value[key]
        else:
            return MISSING
    return value


def is_int(value, expected):
    # bool is an int in Python: True == 1 and False == 0 must not pass
    return type(value) is int and value == expected


def host_os():
    return "linux" if sys.platform.startswith("linux") else sys.platform


def host_machine():
    machine = platform.machine().lower()
    return {"amd64": "x86_64", "x64": "x86_64", "arm64": "aarch64"}.get(machine, machine)


def native_target(system=None, machine=None):
    """The release target this host runs natively, or None."""
    wanted = (system or host_os(), machine or host_machine())
    return next((target for target, row in TARGETS.items() if row[:2] == wanted), None)


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def tool_output(argv, cwd=None, env=None, timeout=300, failure=Unavailable):
    """A host tool's stdout (UTF-8, stripped). A missing tool is Unavailable; a failed run raises FAILURE."""
    try:
        done = subprocess.run([str(arg) for arg in argv], cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                              capture_output=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Unavailable(f"{argv[0]}: {error}") from None
    if done.returncode != 0:
        said = done.stderr.decode("utf-8", "replace").strip()[-300:]
        raise failure(f"{' '.join(str(arg) for arg in argv)}: exit {done.returncode}: {said}")
    return done.stdout.decode("utf-8", "replace").strip()


def which(name):
    found = shutil.which(name)
    if not found:
        raise Unavailable(f"{name} is not on PATH")
    return found


def powershell(script, env_extra, failure=Unavailable):
    """Windows PowerShell with no profile and no prompt; paths arrive through $env:, never quoted inline."""
    return tool_output([which("powershell"), "-NoProfile", "-NonInteractive", "-Command",
                        "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue'; " + script],
                       env={**os.environ, **env_extra}, failure=failure)


def git_commit(path):
    """HEAD^{commit} of the checkout holding PATH, or None outside a git checkout."""
    try:
        done = subprocess.run(["git", "-C", str(path), "rev-parse", "--verify", "HEAD^{commit}"],
                              stdin=subprocess.DEVNULL, capture_output=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    text = done.stdout.decode("ascii", "replace").strip()
    return text if done.returncode == 0 and re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", text) else None


def committed_blob(root, commit, relative):
    """RELATIVE's bytes as COMMIT holds them (git cat-file blob in the checkout at ROOT), or None
    without a commit or such a blob."""
    if commit is None:
        return None
    try:
        done = subprocess.run(["git", "-C", str(root), "cat-file", "blob", f"{commit}:{relative}"],
                              stdin=subprocess.DEVNULL, capture_output=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return done.stdout if done.returncode == 0 else None


def truth_digest(data, blob):
    """The sha256 a receipt names the truth file by. A working-tree copy that is the committed BLOB,
    or that blob with each LF written as CRLF (a Windows checkout under core.autocrlf), names the
    blob, so every host names the same bytes; any other copy names its own bytes, the ones judged."""
    if blob is not None and (data == blob or (b"\r" not in blob and data == blob.replace(b"\n", b"\r\n"))):
        return sha256(blob)
    return sha256(data)


def stream_record(data):
    """One output stream as a receipt keeps it: capped text, size and sha256."""
    return {"text": data[:CAP].decode("utf-8", "backslashreplace"), "bytes": len(data), "sha256": sha256(data),
            "truncated": len(data) > CAP}


def shown(arg):
    return arg.decode("utf-8", "backslashreplace") if isinstance(arg, bytes) else str(arg)


def truth_module():
    """The shared judge, loaded by path from this consumer's own scripts directory."""
    path = Path(__file__).resolve().parent / "consumer_truth.py"
    spec = importlib.util.spec_from_file_location("consumer_truth", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def workspace_version(root):
    with open(Path(root) / "Cargo.toml", "rb") as handle:
        return tomllib.load(handle)["workspace"]["package"]["version"]


def archive_name(version, target):
    return f"{PREFIX}{version}-{target}.{TARGETS[target][2]}"


def parse_sums(data, version, name):
    """[(sha256, asset)] of an exact CLI SHA256SUMS: ASCII, LF, a final newline, one sorted
    '<64 lowercase hex>  <asset>' line per CLI asset of VERSION. Refused names the defect."""
    try:
        text = data.decode("ascii")
    except UnicodeDecodeError:
        raise Refused(f"{name}: not ASCII") from None
    if "\r" in text:
        raise Refused(f"{name}: a CR (its lines end in LF alone)")
    if not text.endswith("\n"):
        raise Refused(f"{name}: no final newline")
    entries = []
    for line in text[:-1].split("\n"):
        match = SUMS_LINE.match(line)
        if not match:
            raise Refused(f"{name}: line {line!r} is not '<64 lowercase hex>  <asset>'")
        asset = match["name"]
        grammar = ARCHIVE.match(asset) or SOURCE.match(asset)
        if not grammar or grammar["version"] != version:
            raise Refused(f"{name}: {asset} is not a {version} CLI asset")
        if "target" in grammar.groupdict() and TARGETS[grammar["target"]][2] != grammar["ext"]:
            raise Refused(f"{name}: {asset} has the wrong extension for its target")
        entries.append((match["sha256"], asset))
    assets = [asset for _, asset in entries]
    if len(set(assets)) != len(assets):
        raise Refused(f"{name}: an asset listed twice")
    if assets != sorted(assets):
        raise Refused(f"{name}: lines not sorted by asset name")
    return entries


def os_hasher(system):
    """{tool, version} and a function PATH -> sha256 for this host's own SHA-256 tool."""
    if system == "win32":
        version = powershell("$PSVersionTable.PSVersion.ToString()", {})

        def digest(path):
            return powershell("(Get-FileHash -Algorithm SHA256 -LiteralPath $env:A).Hash", {"A": str(path)}).lower()
        return {"tool": "Get-FileHash -Algorithm SHA256", "version": f"PowerShell {version}"}, digest
    argv = ["shasum", "-a", "256"] if system == "darwin" else ["sha256sum"]
    tool = which(argv[0])
    version = tool_output([tool, "--version"]).splitlines()[0]

    def digest(path):
        line = tool_output([tool, *argv[1:], path.name], cwd=path.parent)
        match = re.match(r"\\?([0-9a-f]{64}) ", line)
        if not match:
            raise Unavailable(f"{argv[0]} printed {line[:120]!r}")
        return match[1]
    return {"tool": " ".join(argv), "version": version}, digest


def safe_name(name):
    return (bool(name) and not name.startswith("/") and "\\" not in name and ":" not in name
            and all(part not in ("", ".", "..") for part in name.split("/")))


def archive_members(path, ext):
    """({file: (bytes, mode)}, {directory}) read in place. A link, device or unsafe name is refused
    before any OS tool sees the archive."""
    files, dirs = {}, set()

    def add(name, directory, data=None, mode=None):
        name = name.rstrip("/") if directory else name
        if not safe_name(name):
            raise Refused(f"{path.name}: unsafe member name {name!r}")
        if name in files or name in dirs:
            raise Refused(f"{path.name}: {name} twice")
        if directory:
            dirs.add(name)
        else:
            files[name] = (data, mode)
    try:
        if ext == "tar.gz":
            with tarfile.open(path, "r:gz") as archive:
                for member in archive.getmembers():
                    if member.isdir():
                        add(member.name, True)
                    elif member.isreg():
                        add(member.name, False, archive.extractfile(member).read(), member.mode)
                    else:
                        raise Refused(f"{path.name}: {member.name} is neither a file nor a directory")
        else:
            with zipfile.ZipFile(path) as archive:
                for info in archive.infolist():
                    mode = info.external_attr >> 16
                    if stat.S_ISLNK(mode):
                        raise Refused(f"{path.name}: {info.filename} is a symbolic link")
                    if info.is_dir():
                        add(info.filename, True)
                    else:
                        add(info.filename, False, archive.read(info), mode)
    except (tarfile.TarError, zipfile.BadZipFile, zlib.error, EOFError, OSError, ValueError) as error:
        raise Refused(f"{path.name}: unreadable archive ({error})") from None
    return files, dirs


def check_members(path, stem, binary, files, dirs):
    """Exactly the documented members under one top directory named like the archive."""
    want = {f"{stem}/{name}" for name in (*MEMBERS, binary)}
    problems = [f"{path.name}: unexpected member {name}" for name in sorted(set(files) - want)]
    problems += [f"{path.name}: missing member {name}" for name in sorted(want - set(files))]
    problems += [f"{path.name}: unexpected directory {name}" for name in sorted(dirs - {stem})]
    if problems:
        raise Refused(*problems)


def extract(archive, ext, dest):
    """Extract as a user would, with the OS tool; returns that tool's version line."""
    if ext == "zip":
        version = powershell("$PSVersionTable.PSVersion.ToString()", {})
        powershell("Expand-Archive -LiteralPath $env:A -DestinationPath $env:D", {"A": str(archive), "D": str(dest)},
                   failure=Refused)
        return f"Expand-Archive (PowerShell {version})"
    tar = which("tar")
    version = tool_output([tar, "--version"]).splitlines()[0]
    tool_output([tar, "-xzf", archive, "-C", dest], failure=Refused)
    return version


def check_tree(dest, stem, binary_name, files, system):
    """The extracted tree equals the members byte for byte; the binary is owner-executable on Unix."""
    seen, dirs, problems = {}, set(), []
    for top, subdirs, names in os.walk(dest):
        for name in (*subdirs, *names):
            path = Path(top, name)
            relative = path.relative_to(dest).as_posix()
            if path.is_symlink():
                problems.append(f"extracted {relative} is a symbolic link")
            elif path.is_dir():
                dirs.add(relative)
            else:
                seen[relative] = path
    for name in sorted(set(seen) ^ set(files)):
        problems.append(f"extracted tree: {name} {'is not a member' if name in seen else 'was not extracted'}")
    for name in sorted(set(seen) & set(files)):
        if seen[name].read_bytes() != files[name][0]:
            problems.append(f"extracted {name} differs from its member")
    if dirs != {stem}:
        problems.append(f"extracted directories {sorted(dirs)}, expected [{stem!r}]")
    binary = Path(dest, stem, binary_name)
    if system != "win32" and binary.is_file() and not binary.stat().st_mode & stat.S_IXUSR:
        problems.append(f"{stem}/{binary_name} is not owner-executable after extraction "
                        f"(mode {binary.stat().st_mode & 0o777:04o})")
    if problems:
        raise Refused(*problems)
    return binary


def stage_inputs(stage, contract, truth_lib, truth, system, native):
    """Write every input under STAGE; returns (the staged truth cases, the Windows long path or None)."""
    control = next((case for case in truth["cases"] if case.get("file") == CONTROL), None)
    if control is None:
        raise Unavailable(f"the truth set has no {CONTROL} case")
    data = (contract / "fixtures" / CONTROL).read_bytes()
    if sha256(data) != control["sha256"]:
        raise Unavailable(f"fixtures/{CONTROL} is {sha256(data)}, the truth set says {control['sha256']}")
    (stage / "gen_v5_q.png").write_bytes(data)
    (stage / "white.png").write_bytes(truth_lib.white_png(64, 64))
    (stage / "invalid.png").write_bytes(b"not an image")
    (stage / "dir").mkdir()
    (stage / UNICODE_DIR).mkdir()
    (stage / UNICODE_DIR / UNICODE_FILE).write_bytes(data)
    if system == "linux" and native:
        with open(os.path.join(os.fsencode(stage), NON_UTF8), "wb") as handle:
            handle.write(data)
    long_path = None
    if system == "win32":
        # created through \\?\; the case passes the plain path, which is past MAX_PATH
        folder = Path(stage, *(["l" * 60] * 5))
        os.makedirs("\\\\?\\" + str(folder))
        long_path = folder / "gen_v5_q.png"
        with open("\\\\?\\" + str(long_path), "wb") as handle:
            handle.write(data)
    try:
        staged = truth_lib.stage(truth, stage / "truth", fixtures=contract / "fixtures")
    except (AssertionError, OSError, KeyError) as error:
        raise Unavailable(f"staging the truth set: {error}") from None
    return staged, long_path


def scrubbed_env(scratch, system, first=None):
    """System directories only on PATH (FIRST before them), new empty HOME and temporary directories;
    Windows keeps SystemRoot, WINDIR, PATHEXT and COMSPEC. Nothing else is inherited."""
    home, temp = scratch / "home", scratch / "tmp"
    home.mkdir(exist_ok=True)
    temp.mkdir(exist_ok=True)
    env = {}
    if system == "win32":
        root = os.environ.get("SystemRoot", "C:\\Windows")
        for key, default in (("SystemRoot", root), ("WINDIR", root), ("PATHEXT", ".COM;.EXE;.BAT;.CMD"),
                             ("COMSPEC", root + "\\System32\\cmd.exe")):
            env[key] = os.environ.get(key, default)
        system_dirs = [root + "\\System32", root, root + "\\System32\\Wbem",
                       root + "\\System32\\WindowsPowerShell\\v1.0"]
    else:
        system_dirs = ["/usr/bin", "/bin", "/usr/sbin", "/sbin"]
    separator = ";" if system == "win32" else ":"
    env["PATH"] = separator.join(([str(first)] if first else []) + system_dirs)
    for key in ("HOME", "USERPROFILE"):
        env[key] = str(home)
    for key in ("TMPDIR", "TEMP", "TMP"):
        env[key] = str(temp)
    return env


def lookup_commands(system, system_root="C:\\Windows"):
    """[(case id, argv)] that find qrscan through PATH alone. POSIX: a bare name, which subprocess
    resolves on the env's PATH. Windows: subprocess resolves on the parent's PATH, so cmd.exe and
    where.exe, each by its absolute path, search the scrubbed PATH with PATHEXT."""
    if system == "win32":
        return [("path-lookup", [system_root + "\\System32\\cmd.exe", "/d", "/s", "/c", "qrscan --version"]),
                ("path-lookup-where", [system_root + "\\System32\\where.exe", "qrscan"])]
    return [("path-lookup", ["qrscan", "--version"])]


def docker_command(box, argv, env=None, entrypoint=None):
    """docker run for one case: no network, read-only root, every capability dropped, the caller's
    uid, bounded CPU, memory and processes, the tree and the inputs mounted read-only. --entrypoint
    also clears the image's CMD, so a case with no argument passes none."""
    command = [box["docker"], "run", "--rm", "--pull", "never", "--network", "none", "--read-only",
               "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--user", f"{box['uid']}:{box['gid']}",
               "--cpus", "2", "--memory", "1g", "--pids-limit", "128", "--platform", box["platform"],
               "-v", f"{box['extracted']}:/opt/qrscan:ro", "-v", f"{box['stage']}:/work:ro", "-w", "/work"]
    for key, value in sorted((env or {}).items()):
        command += ["-e", f"{key}={value}"]
    return command + ["--entrypoint", entrypoint or box["binary"], box["image"], *argv]


def prepare(ctx, case):
    """(argv, env, env keys) of one case. Natively, case["first"] is a directory put before the system
    ones on PATH and case["command"] replaces the binary's own argv; a container takes env and entrypoint."""
    if ctx["box"]:
        env = case.get("env") or {}
        return docker_command(ctx["box"], case["argv"], env, case.get("entrypoint")), None, sorted(env)
    first = case.get("first")
    env = {**(scrubbed_env(ctx["scratch"], ctx["system"], first) if first else ctx["env"]), **(case.get("env") or {})}
    return case.get("command") or [str(ctx["binary"]), *case["argv"]], env, sorted(env)


def report_of(text):
    """(the parsed JSON object, None), or (None, the problem)."""
    try:
        value = json.loads(text)
    except ValueError as error:
        return None, f"stdout is not JSON ({error})"
    return (value, None) if isinstance(value, dict) else (None, "stdout is not a JSON object")


def contents_of(report):
    detections = report.get("detections")
    return [get(detection, "content") for detection in detections] if isinstance(detections, list) else MISSING


def stdout_is(want):
    def check(out, err, code):
        return [] if out == want else [f"stdout {out[:200]!r}, expected {want!r}"]
    return check


def stderr_is(want):
    def check(out, err, code):
        return [] if err == want else [f"stderr {err[:300]!r}, expected {want!r}"]
    return check


def stderr_matches(pattern, plain=True):
    regex = re.compile(pattern)

    def check(out, err, code):
        problems = [] if regex.fullmatch(err) else [f"stderr {err[:300]!r} does not match {pattern!r}"]
        return problems + (["an ESC in stderr"] if plain and "\x1b" in err else [])
    return check


def clap_error(*needles):
    def check(out, err, code):
        problems = [] if err.startswith("error: ") else [f"stderr {err[:200]!r} does not start with 'error: '"]
        return problems + [f"stderr does not name {needle}" for needle in needles if needle not in err]
    return check


def read_error(name, errno, colour=False):
    """The CLI's unreadable-input line: the mark, the name as given, the OS text and its code."""
    mark = "\x1b\\[1;31m✖\x1b\\[0m" if colour else "✖"
    return mark + " cannot read " + re.escape(name) + r": [^\n\x1b]+ \(os error " + str(errno) + r"\)\n"


def help_check(out, err, code):
    # help text may wrap anywhere: compare word runs
    words = " ".join(out.split())
    problems = [f"help does not say {phrase!r}" for phrase in ("3 = a decoded QR the budget left unjudged", "exits 3")
                if phrase not in words]
    return problems + ([] if re.search(r"Usage: qrscan(\.exe)? \[OPTIONS\]", out) else ["no 'Usage: qrscan [OPTIONS]'"])


def capabilities_check(versions, engines, symbologies):
    def check(out, err, code):
        report, problem = report_of(out)
        if problem:
            return [problem]
        problems = [] if sorted(report) == ["engines", "symbologies", "versions"] else [
            f"keys {sorted(report)} != ['engines', 'symbologies', 'versions']"]
        for key, want in (("engines", engines), ("symbologies", symbologies), ("versions", versions)):
            if report.get(key, MISSING) != want:
                problems.append(f"{key} {report.get(key, MISSING)!r} != {want!r}")
        return problems
    return check


def control_check(versions, full=True):
    """The control's report: exactly its one content; from the full profile also score 100, a final
    scan and no engine panic. JSON never carries an ESC, whatever the colour variables say."""
    def check(out, err, code):
        problems = ["an ESC in the JSON report"] if "\x1b" in out else []
        report, problem = report_of(out)
        if problem:
            return problems + [problem]
        if report.get("versions", MISSING) != versions:
            problems.append(f"versions {report.get('versions', MISSING)!r} != {versions!r}")
        if contents_of(report) != [CONTROL_CONTENT]:
            problems.append(f"contents {contents_of(report)!r} != {[CONTROL_CONTENT]!r}")
        if full:
            if not is_int(get(report, "score", "value"), 100):
                problems.append(f"score.value {get(report, 'score', 'value')!r}, expected 100")
            if get(report, "trace", "budget_exhausted") is not False:
                problems.append(f"trace.budget_exhausted {get(report, 'trace', 'budget_exhausted')!r}, expected false")
            if not is_int(get(report, "trace", "engine_panics"), 0):
                problems.append(f"trace.engine_panics {get(report, 'trace', 'engine_panics')!r}, expected 0")
        return problems
    return check


def frame_check(versions):
    def check(out, err, code):
        report, problem = report_of(out)
        if problem:
            return [problem]
        texts = contents_of(report)
        texts = [get(content, "text") for content in texts] if texts is not MISSING else MISSING
        score = report.get("score", MISSING)
        problems = [] if score is None else [f"score {score!r}, expected null"]
        if texts != [CONTROL_TEXT]:
            problems.append(f"texts {texts!r} != {[CONTROL_TEXT]!r}")
        if report.get("versions", MISSING) != versions:
            problems.append(f"versions {report.get('versions', MISSING)!r} != {versions!r}")
        return problems
    return check


def empty_check(versions):
    def check(out, err, code):
        report, problem = report_of(out)
        if problem:
            return [problem]
        problems = [] if report.get("detections", MISSING) == [] else [
            f"detections {report.get('detections', MISSING)!r}, expected []"]
        if report.get("score", MISSING) is not None:
            problems.append(f"score {report.get('score', MISSING)!r}, expected null")
        if get(report, "trace", "budget_exhausted") is not False:
            problems.append(f"trace.budget_exhausted {get(report, 'trace', 'budget_exhausted')!r}, expected false")
        if report.get("versions", MISSING) != versions:
            problems.append(f"versions {report.get('versions', MISSING)!r} != {versions!r}")
        return problems
    return check


def pretty_check(first, scored):
    """--pretty without colour: its first line, the score line when due, the closing 'took' line, no ESC."""
    def check(out, err, code):
        lines = out.splitlines()
        head, tail = (lines[0], lines[-1]) if lines else ("", "")
        problems = ["an ESC in the plain pretty output"] if "\x1b" in out else []
        if head != first:
            problems.append(f"first line {head!r}, expected {first!r}")
        if scored and not any(re.match(r"score {5}100/100 \(", line) for line in lines):
            problems.append("no 'score     100/100 (' line")
        if not re.fullmatch(r"took {6}\d+ms", tail):
            problems.append(f"last line {tail!r}, expected 'took      <n>ms'")
        return problems
    return check


def colour_pretty_check(out, err, code):
    if any(re.match(r"score {5}\x1b\[[0-9;]+m100/100\x1b\[0m \(", line) for line in out.splitlines()):
        return []
    return ["no coloured 'score     100/100 (' line under CLICOLOR_FORCE"]


def unwind_check(out, err, code):
    """A failed write to stdout panics in println!; the panic must unwind to exit 101."""
    if code in ABORTS:
        return [f"the panic did not unwind (exit {code})"]
    problems = [] if code == 101 else [f"exit {code}, expected 101"]
    return problems + [f"stderr does not say {needle!r}" for needle in ("panicked", "failed printing to stdout")
                       if needle not in err]


def where_check(binary):
    def check(out, err, code):
        lines = out.splitlines()
        if len(lines) != 1:
            return [f"where printed {len(lines)} lines {out[:300]!r}, expected one"]
        if os.path.normcase(lines[0].strip()) != os.path.normcase(str(binary)):
            return [f"where found {lines[0]!r}, not the extracted {binary}"]
        return []
    return check


def truth_check(truth_lib, case, versions, tally):
    """consumer_truth.judge on one truth case, plus the engine-panics rule: trace.engine_panics is 0
    in every report, and only then must stderr be empty."""
    def check(out, err, code):
        if "error" in case:
            want = re.compile(r"✖ [^\n]+ \[" + re.escape(case["error"]) + r"\]\n")
            return [] if want.fullmatch(err) else [f"stderr {err[:300]!r}, expected '✖ <message> [{case['error']}]'"]
        report, problem = report_of(out)
        if problem:
            return [problem]
        try:
            problems = list(truth_lib.judge(case, report, versions))
            tally["identities"][case["id"]] = truth_lib.identity(report)
        except (KeyError, TypeError, IndexError, AttributeError, ValueError) as error:
            return [f"malformed report ({type(error).__name__}: {error})"]
        panics = get(report, "trace", "engine_panics")
        if type(panics) is not int or panics < 0:
            problems.append(f"engine-panics: trace.engine_panics {panics!r} is not a count")
        elif panics:
            tally["engine_panics"] += panics
            problems.append(f"engine-panics: trace.engine_panics {panics}")
        elif err:
            problems.append(f"stderr on a clean truth case: {err[:200]!r}")
        return problems
    return check


def case(case_id, argv, exit_code, check, **more):
    return {"id": case_id, "argv": argv, "exit": exit_code, "check": check, **more}


def build_cases(ctx, versions, enums, truth_lib, truth, staged, tally):
    """Every case for this host and mode, the truth set last. A case judges its own stderr when it
    says stderr=True; otherwise stderr must be empty on exits 0 and 1, and stdout on exit 2."""
    system, banner, stage = ctx["system"], f"qrscan {ctx['version']}\n", ctx["stage"]
    control = "gen_v5_q.png"
    full = [control, "--profile", "full", "--budget-ms", "0"]
    pretty = [control, "--pretty", "--profile", "full", "--budget-ms", "0"]
    colour = {"CLICOLOR_FORCE": "1"}
    content = control_check(versions, full=False)
    absolute = "/work/" + control if ctx["box"] else str(stage / control)
    cases = [
        case("version", ["--version"], 0, stdout_is(banner)),
        case("version-short", ["-V"], 0, stdout_is(banner)),
        case("help", ["--help"], 0, help_check),
        case("capabilities", ["--capabilities"], 0, capabilities_check(versions, *enums)),
        case("capabilities-exclusive", ["--capabilities", control], 2, clap_error("--capabilities")),
        case("no-image", [], 2, clap_error("<IMAGE>")),
        case("unknown-flag", ["--no-such-flag", control], 2, clap_error()),
        case("bad-profile", ["--profile", "nope", control], 2, clap_error()),
        case("bad-budget", ["--budget-ms", "4294967296", control], 2, clap_error()),
        case("bad-preset", ["--score-preset", "nope", control], 2,
             stderr_is("✖ unknown score preset `nope` — expected design | capture\n")),
        case("missing", ["absent.png"], 2, stderr_matches(read_error("absent.png", 2))),
        case("directory", ["dir"], 2, stderr_matches(read_error("dir", 5 if system == "win32" else 21))),
        case("malformed", ["invalid.png"], 2, stderr_matches(r"✖ [^\n]+ \[QRS-001\]\n")),
        case("control-json", full, 0, control_check(versions)),
        case("frame-json", [control, "--profile", "frame", "--budget-ms", "0"], 0, frame_check(versions)),
        case("score-only", [*full, "--score-only"], 0, stdout_is("100\n")),
        case("score-only-frame", [control, "--score-only", "--profile", "frame", "--budget-ms", "0"], 2,
             stderr_is("✖ the frame profile computes no score (use --profile full|fast)\n")),
        case("empty-json", ["white.png", "--profile", "full", "--budget-ms", "0"], 1, empty_check(versions)),
        case("empty-score-only", ["white.png", "--score-only", "--budget-ms", "0"], 1,
             stderr_is("no QR code found — no score\n"), stderr=True),
        case("pretty", pretty, 0, pretty_check("content   " + CONTROL_TEXT, True)),
        case("pretty-empty", ["white.png", "--pretty", "--budget-ms", "0"], 1, pretty_check("no QR code found", False)),
        case("colour-error", ["absent.png"], 2, stderr_matches(read_error("absent.png", 2, colour=True), plain=False),
             env=colour),
        case("colour-no-color", ["absent.png"], 2, stderr_matches(read_error("absent.png", 2)),
             env={**colour, "NO_COLOR": "1"}),
        case("colour-json", full, 0, control_check(versions), env=colour),
        case("colour-pretty", pretty, 0, colour_pretty_check, env=colour),
        case("absolute", [absolute, "--budget-ms", "0"], 0, content),
        case("unicode", [f"{UNICODE_DIR}/{UNICODE_FILE}", "--budget-ms", "0"], 0, content),
        case("unicode-missing", [UNICODE_MISSING], 2, stderr_matches(read_error(UNICODE_MISSING, 2))),
    ]
    if ctx["box"]:
        box = ctx["box"]
        cases.append(case("path-lookup", ["--version"], 0, stdout_is(banner), entrypoint="qrscan",
                          env={"PATH": f"/opt/qrscan/{ctx['stem']}:/usr/bin:/bin"}))
        cases.append(case("unwind", ["-c", 'exec "$0" --capabilities >/dev/full', box["binary"]], 101, unwind_check,
                          entrypoint="/bin/sh", own_exit=True, stderr=True))
    else:
        for case_id, command in lookup_commands(system, ctx["env"].get("SystemRoot", "C:\\Windows")):
            check = where_check(ctx["binary"]) if case_id == "path-lookup-where" else stdout_is(banner)
            cases.append(case(case_id, [], 0, check, command=command, first=ctx["binary"].parent))
        cases.append(case("unwind", ["--capabilities"], 101, unwind_check, sink=True, own_exit=True, stderr=True))
        if system == "linux":
            cases.append(case("non-utf8-name", [NON_UTF8, "--budget-ms", "0"], 0, content))
    if system == "win32":
        plain = str(stage / control)
        cases += [case("forward-slashes", [plain.replace("\\", "/"), "--budget-ms", "0"], 0, content),
                  case("long-path", [str(ctx["long_path"]), "--budget-ms", "0"], 0, content),
                  case("verbatim", ["\\\\?\\" + plain, "--budget-ms", "0"], 0, content)]
    scan = truth["scan"]
    for truth_case, path in staged:
        expected = 2 if "error" in truth_case else (0 if truth_case["contents"] else 1)
        cases.append(case(f"truth-set/{truth_case['id']}", [path.relative_to(stage).as_posix(), "--profile",
                                                             scan["profile"], "--budget-ms", str(scan["budget_ms"])],
                          expected, truth_check(truth_lib, truth_case, versions, tally), stderr=True))
    return cases


def not_executed(ctx):
    skipped = [{"id": "exit-3", "reason": "depends on the budget and the machine; help asserts it is documented"},
               {"id": "engine-frame-panic", "reason": "no deterministic fixture; unwind covers std and main only"}]
    if ctx["box"] or ctx["system"] != "linux":
        reason = {"darwin": "APFS refuses names that are not UTF-8", "win32": "Windows names are UTF-16"}
        skipped.append({"id": "non-utf8-name", "reason": "container argv is UTF-8" if ctx["box"]
                        else reason.get(ctx["system"], "native Linux only")})
    if ctx["system"] != "win32":
        skipped += [{"id": name, "reason": "Windows paths only"}
                    for name in ("forward-slashes", "long-path", "verbatim")]
    return skipped


def decode(data, name, problems):
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as error:
        problems.append(f"{name} is not UTF-8 ({error})")
        return data.decode("utf-8", "replace")


def run_case(ctx, case):
    """Run one case and judge it: its receipt record, whose detail names every problem."""
    argv, env, keys = prepare(ctx, case)
    problems, code, out, err, sink, stdout = [], None, b"", b"", None, subprocess.PIPE
    if case.get("sink") and ctx["system"] == "linux":
        sink = stdout = open("/dev/full", "wb")
    elif case.get("sink"):
        # the write end of a pipe whose read end is closed before the spawn
        read, sink = os.pipe()
        os.close(read)
        stdout = sink
    try:
        done = subprocess.run(argv, cwd=ctx["stage"], env=env, stdin=subprocess.DEVNULL, stdout=stdout,
                              stderr=subprocess.PIPE, timeout=TIMEOUT)
        code, out, err = done.returncode, done.stdout or b"", done.stderr or b""
    except subprocess.TimeoutExpired as error:
        out, err = error.stdout or b"", error.stderr or b""
        problems.append(f"no exit within {TIMEOUT} s")
    except OSError as error:
        problems.append(f"cannot run: {error}")
    finally:
        if isinstance(sink, int):
            os.close(sink)
        elif sink is not None:
            sink.close()
    out_text, err_text = decode(out, "stdout", problems), decode(err, "stderr", problems)
    if code is not None:
        expected = case["exit"]
        if not case.get("own_exit") and code != expected:
            problems.append(f"exit {code}, expected {expected}")
        if expected == 2 and out:
            problems.append("stdout is not empty on an error")
        if expected in (0, 1) and not case.get("stderr") and err:
            problems.append(f"stderr is not empty: {err_text[:200]!r}")
        problems += case["check"](out_text, err_text, code)
    return {"id": case["id"], "argv": [shown(arg) for arg in argv], "env": keys, "exit": code,
            "expected_exit": case["exit"], "ok": not problems, "stdout": stream_record(out),
            "stderr": stream_record(err), "detail": problems}


def host_record():
    record = {"os": host_os(), "machine": host_machine(), "platform": platform.platform(),
              "python": platform.python_version()}
    if host_os() == "linux":
        with contextlib.suppress(ValueError, OSError):
            record["glibc"] = os.confstr("CS_GNU_LIBC_VERSION")
    record["runner"] = {key: os.environ[key] for key in ("RUNNER_OS", "RUNNER_ARCH", "ImageOS", "ImageVersion")
                        if key in os.environ}
    return record


# the libc object prints its banner when executed; the first that exists answers
LIBC_PROBE = ("for f in /lib64/libc.so.6 /lib/x86_64-linux-gnu/libc.so.6 /lib/aarch64-linux-gnu/libc.so.6 "
              '/usr/lib64/libc.so.6 /lib/libc.so.6; do if [ -x "$f" ]; then exec "$f"; fi; done; exit 127')


def container_box(args, docker, extracted, stage, stem):
    """The fixed parts of every docker run, and the container's receipt record. The pinned image must
    already be present: docker run --pull never never fetches it."""
    server = tool_output([docker, "version", "--format", "{{.Server.Version}}"])
    try:
        found = tool_output([docker, "image", "inspect", "--format", "{{.Os}}/{{.Architecture}}", args.container])
    except Unavailable:
        raise Unavailable(f"{args.container} is not present; run docker pull --platform {args.platform} "
                          f"{args.container} first") from None
    box = {"docker": docker, "image": args.container, "platform": args.platform, "uid": os.getuid(),
           "gid": os.getgid(), "extracted": str(extracted), "stage": str(stage),
           "binary": f"/opt/qrscan/{stem}/qrscan"}
    return box, {"image": args.container, "platform": args.platform, "image_platform": found, "docker": server,
                 "expect_glibc": args.expect_glibc, "glibc": None, "glibc_probe": None}


def container_glibc(box):
    """(version, probe): getconf GNU_LIBC_VERSION prints 'glibc X.Y'; otherwise the libc object
    prints 'release version X.Y'."""
    said = []
    for argv, entrypoint, pattern, probe in (
            (["GNU_LIBC_VERSION"], "getconf", r"glibc (\d+\.\d+)\n", "getconf GNU_LIBC_VERSION"),
            (["-c", LIBC_PROBE], "/bin/sh", r"(?s).*?release version (\d+\.\d+)\b.*", "libc.so.6")):
        try:
            done = subprocess.run(docker_command(box, argv, entrypoint=entrypoint), stdin=subprocess.DEVNULL,
                                  capture_output=True, timeout=TIMEOUT)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise Unavailable(f"docker run {entrypoint}: {error}") from None
        out = done.stdout.decode("utf-8", "replace")
        match = re.fullmatch(pattern, out)
        if done.returncode == 0 and match:
            return match[1], probe
        said.append(f"{probe}: exit {done.returncode}, {out[:120]!r}")
    raise Refused(f"{box['image']}: no glibc version ({'; '.join(said)})")


def load_contract(contract, truth_lib):
    """(truth, versions constants, (engines, symbologies), workspace version) from the contract root."""
    try:
        truth = truth_lib.load(contract / TRUTH_FILE)
        defs = json.loads((contract / "spec/scan-report.schema.json").read_text(encoding="utf-8"))["$defs"]
        consts = {key: defs["Versions"]["properties"][key]["const"] for key in ("pipeline", "score_contract")}
        return truth, consts, (defs["EngineKind"]["enum"], defs["Symbology"]["enum"]), workspace_version(contract)
    except (OSError, ValueError, KeyError, TypeError, AssertionError) as error:
        raise Unavailable(f"the contract root {contract}: {type(error).__name__}: {error}") from None


def verify_release(args, receipt):
    """Step 1: the SUMS name and format, the anchor, and the target's archive against its line through
    hashlib and the OS tool. Returns (version, archive path)."""
    release = Path(args.release_dir)
    found = sorted(path for path in release.iterdir() if SUMS.match(path.name)) if release.is_dir() else []
    if len(found) != 1:
        raise Unavailable(f"{release}: {len(found)} CLI SHA256SUMS files, expected 1")
    sums = found[0]
    version = receipt["version"] = SUMS.match(sums.name)["version"]
    data = sums.read_bytes()
    receipt["sums_sha256"] = sha256(data)
    if args.sums_sha256 and receipt["sums_sha256"] != args.sums_sha256:
        raise Refused(f"{sums.name}: sha256 {receipt['sums_sha256']} != --sums-sha256 {args.sums_sha256}")
    lines = {asset: digest for digest, asset in parse_sums(data, version, sums.name)}
    name = archive_name(version, args.target)
    archive = release / name
    if not archive.is_file():
        raise Unavailable(f"{release}: no {name}")
    blob = archive.read_bytes()
    receipt["archive"] = {"name": name, "sha256": sha256(blob), "size": len(blob)}
    if name not in lines:
        raise Refused(f"{name} is not listed in {sums.name}")
    tool, digest = os_hasher(host_os())
    receipt["hash_tools"] = [{"tool": "hashlib", "version": f"Python {platform.python_version()}",
                              "sha256": sha256(blob)}, {**tool, "sha256": digest(archive)}]
    for entry in receipt["hash_tools"]:
        if entry["sha256"] != lines[name]:
            raise Refused(f"{name}: {entry['tool']} says {entry['sha256']}, its {sums.name} line says {lines[name]}")
    return version, archive


def run_consumer(args, receipt):
    system = "linux" if args.container else host_os()
    docker = which("docker") if args.container else None
    contract = Path(args.contract_root).resolve() if args.contract_root else ROOT
    receipt["contract_commit"] = git_commit(contract)
    truth_lib = truth_module()
    truth, consts, enums, contract_version = load_contract(contract, truth_lib)
    version, archive = verify_release(args, receipt)
    if version != contract_version:
        raise Unavailable(f"the release is {version}, the contract root {contract} is {contract_version}")
    ext = TARGETS[args.target][2]
    stem, binary_name = archive.name[:-len("." + ext)], "qrscan.exe" if TARGETS[args.target][0] == "win32" else "qrscan"
    files, dirs = archive_members(archive, ext)
    check_members(archive, stem, binary_name, files, dirs)
    # Step 2: a new directory outside the checkout and the contract root, extracted by the OS tool.
    scratch = Path(tempfile.mkdtemp(prefix="qrscan-cli-consumer-")).resolve()
    for root in {ROOT, contract}:
        if scratch == root or root in scratch.parents:
            raise Unavailable(f"the scratch directory {scratch} is inside {root}")
    extracted, stage = scratch / "extract", scratch / "stage"
    extracted.mkdir()
    stage.mkdir()
    receipt["extracted_with"] = extract(archive, ext, extracted)
    binary = check_tree(extracted, stem, binary_name, files, system)
    receipt["binary_sha256"] = sha256(binary.read_bytes())
    # Steps 3 and 4: the inputs, then the scrubbed environment.
    staged, long_path = stage_inputs(stage, contract, truth_lib, truth, system, native=not args.container)
    ctx = {"system": system, "version": version, "stage": stage, "scratch": scratch, "binary": binary, "stem": stem,
           "long_path": long_path, "box": None, "env": scrubbed_env(scratch, system)}
    if args.container:
        ctx["box"], receipt["container"] = container_box(args, docker, extracted, stage, stem)
        glibc, probe = container_glibc(ctx["box"])
        receipt["container"].update(glibc=glibc, glibc_probe=probe)
        if glibc != args.expect_glibc:
            raise Refused(f"{args.container}: glibc {glibc}, expected {args.expect_glibc}")
    # Step 5: every case.
    tally = {"identities": {}, "engine_panics": 0}
    versions = {"scanner": version, **consts}
    for one in build_cases(ctx, versions, enums, truth_lib, truth, staged, tally):
        record = run_case(ctx, one)
        receipt["cases"].append(record)
        receipt["problems"] += [f"{record['id']}: {problem}" for problem in record["detail"]]
    judged = [truth_case["id"] for truth_case, _ in staged if "error" not in truth_case]
    complete = all(case_id in tally["identities"] for case_id in judged)
    # the committed blob's sha256, the same on every host; a CRLF checkout names it too
    receipt["truth"] = {"file": TRUTH_FILE,
                        "sha256": truth_digest((contract / TRUTH_FILE).read_bytes(),
                                               committed_blob(contract, receipt["contract_commit"], TRUTH_FILE)),
                        "cases": len(staged),
                        "identities_sha256": truth_lib.identities_digest(tally["identities"]) if complete else None,
                        "engine_panics_total": tally["engine_panics"]}
    receipt["not_executed"] = not_executed(ctx)


def consume(args):
    """Step 6: the qrscan-cli-consumer/1 receipt, printed and written to --receipt, and the exit code."""
    receipt = {"schema": SCHEMA, "verdict": "FAIL", "exit": None, "target": args.target, "version": None,
               "archive": None, "sums_sha256": None, "consumer_commit": git_commit(ROOT), "contract_commit": None,
               "hash_tools": [], "extracted_with": None, "host": host_record(), "container": None,
               "binary_sha256": None, "cases": [], "truth": None, "not_executed": [], "problems": []}
    try:
        run_consumer(args, receipt)
        code = 1 if receipt["problems"] else 0
    except Refused as error:
        receipt["problems"] += [str(problem) for problem in error.args]
        code = 1
    except Unavailable as error:
        receipt["problems"] += [str(problem) for problem in error.args]
        code = 2
    return finish(receipt, args.receipt, code)


def finish(receipt, path, code):
    receipt["verdict"], receipt["exit"] = ("PASS" if code == 0 else "FAIL"), code
    text = json.dumps(receipt, indent=2)
    if path:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(text + "\n", encoding="utf-8")
    print(text)
    return code


def allowed_host(host):
    return host == GITHUB or host.endswith(ASSET_HOST)


class RedirectPolicy(urllib.request.HTTPRedirectHandler):
    """Follow a redirect only to https:// on github.com or a *.githubusercontent.com host; record each host."""

    def __init__(self, hosts):
        super().__init__()
        self.hosts = hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parts = urllib.parse.urlsplit(newurl)
        host = (parts.hostname or "").lower()
        if parts.scheme != "https":
            raise Refused(f"a redirect to {parts.scheme}://{host}: only https:// is followed")
        if not allowed_host(host):
            raise Refused(f"a foreign redirect to {host}")
        self.hosts.append(host)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class Anonymous(urllib.request.BaseHandler):
    """The last request processor: a request that carries an Authorization header, whoever added it,
    never leaves."""
    handler_order = 10_000

    def check(self, req):
        if any(name.lower() == "authorization" for name in (*req.headers, *req.unredirected_hdrs)):
            raise Refused(f"an Authorization header on the request to {req.host}")
        return req

    http_request = https_request = check


def public_opener(hosts):
    return urllib.request.build_opener(RedirectPolicy(hosts), Anonymous())


def fetch_asset(make_opener, url, attempts=3, pause=time.sleep):
    """One anonymous GET under the redirect policy: (receipt entry, bytes). A connection failure or a
    5xx is retried; a policy refusal or a 4xx is final (an unpublished draft answers 404)."""
    for attempt in range(1, attempts + 1):
        hosts = [urllib.parse.urlsplit(url).hostname]
        request = urllib.request.Request(url, headers={"User-Agent": "qrscan-cli-consumer",
                                                       "Accept": "application/octet-stream"})
        try:
            with make_opener(hosts).open(request, timeout=60) as response:
                final, status = urllib.parse.urlsplit(response.geturl()), response.status
                chunks, size = [], 0
                while chunk := response.read(1 << 20):
                    size += len(chunk)
                    if size > MAX_ASSET:
                        raise Refused(f"{url}: more than {MAX_ASSET} bytes")
                    chunks.append(chunk)
        except urllib.error.HTTPError as error:
            error.close()
            if error.code >= 500 and attempt < attempts:
                pause(2 * attempt)
                continue
            note = " (an unpublished draft answers 404)" if error.code == 404 else ""
            raise Refused(f"{url}: HTTP {error.code}{note}") from None
        except (urllib.error.URLError, http.client.HTTPException, OSError) as error:
            if attempt < attempts:
                pause(2 * attempt)
                continue
            raise Refused(f"{url}: {error}") from None
        host = (final.hostname or "").lower()
        if final.scheme != "https" or not host.endswith(ASSET_HOST):
            raise Refused(f"{url}: the bytes came from {final.scheme}://{host}, not https on a *{ASSET_HOST} host")
        data = b"".join(chunks)
        return {"url": url, "hosts": hosts, "final_host": host, "status": status, "size": len(data),
                "sha256": sha256(data), "date": now(), "attempts": attempt}, data
    raise AssertionError("unreachable")


def fetch_release(args, get_asset, receipt):
    """SHA256SUMS against the anchor, then the target's archive (or every listed asset) against its line."""
    version = args.tag[1:]
    base = f"https://github.com/{args.repository}/releases/download/{args.tag}/"
    sums_name = f"{PREFIX}{version}-SHA256SUMS"
    entry, sums = get_asset(base + sums_name)
    receipt["assets"].append({"name": sums_name, **entry})
    if entry["sha256"] != args.sums_sha256:
        raise Refused(f"{sums_name}: sha256 {entry['sha256']} != --sums-sha256 {args.sums_sha256}")
    lines = {asset: digest for digest, asset in parse_sums(sums, version, sums_name)}
    wanted = sorted(lines) if args.all else [archive_name(version, args.target)]
    unlisted = [name for name in wanted if name not in lines]
    if unlisted:
        raise Refused(*(f"{name} is not listed in {sums_name}" for name in unlisted))
    files = {sums_name: sums}
    for name in wanted:
        entry, files[name] = get_asset(base + name)
        receipt["assets"].append({"name": name, **entry})
        if entry["sha256"] != lines[name]:
            raise Refused(f"{name}: sha256 {entry['sha256']} != its {sums_name} line {lines[name]}")
    return files


def fetch_rehearsal(args, get_asset, receipt):
    """Any release's asset against --sha256, and its line in that release's SHA256SUMS."""
    base = f"https://github.com/{args.repository}/releases/download/{args.tag}/"
    entry, blob = get_asset(base + args.asset)
    receipt["assets"].append({"name": args.asset, **entry})
    if entry["sha256"] != args.sha256:
        raise Refused(f"{args.asset}: sha256 {entry['sha256']} != --sha256 {args.sha256}")
    entry, sums = get_asset(base + "SHA256SUMS")
    receipt["assets"].append({"name": "SHA256SUMS", **entry})
    if f"{args.sha256}  {args.asset}" not in sums.decode("utf-8", "replace").splitlines():
        raise Refused(f"SHA256SUMS of {args.tag} has no line '{args.sha256}  {args.asset}'")
    return {args.asset: blob, "SHA256SUMS": sums}


def fetch_parser():
    parser = argparse.ArgumentParser(prog="packed-cli-consumer.py fetch", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--rehearsal", action="store_true", help="any release's asset and its SHA256SUMS line")
    parser.add_argument("--repository", required=True, help="OWNER/REPO")
    parser.add_argument("--tag", required=True)
    parser.add_argument("--sums-sha256", help="release form: the anchor's SHA256SUMS sha256")
    which_assets = parser.add_mutually_exclusive_group()
    which_assets.add_argument("--target", choices=sorted(TARGETS), help="release form: this target's archive")
    which_assets.add_argument("--all", action="store_true", help="release form: every asset SHA256SUMS lists")
    parser.add_argument("--asset", help="rehearsal: the asset name")
    parser.add_argument("--sha256", help="rehearsal: the asset's sha256")
    parser.add_argument("--out", required=True, help="a new or empty directory for the verified assets")
    parser.add_argument("--receipt", help="write the qrscan-cli-fetch/1 receipt here")
    return parser


def fetch_usage(args):
    """The usage error of a parsed fetch command line, or None."""
    if not REPOSITORY.match(args.repository):
        return f"--repository {args.repository!r} is not OWNER/REPO"
    if args.rehearsal:
        if args.sums_sha256 or args.target or args.all:
            return "--rehearsal takes --asset and --sha256, not --sums-sha256, --target or --all"
        if not (ANY_NAME.match(args.tag) and args.asset and ANY_NAME.match(args.asset)):
            return "--rehearsal needs a plain --tag and --asset"
        if not (args.sha256 and HEX64.match(args.sha256)):
            return "--sha256 must be 64 lowercase hex digits"
        return None
    if args.asset or args.sha256:
        return "--asset and --sha256 belong to --rehearsal"
    if not RELEASE_TAG.match(args.tag):
        return f"--tag {args.tag!r} is not vX.Y.Z"
    if not (args.sums_sha256 and HEX64.match(args.sums_sha256)):
        return "--sums-sha256 must be 64 lowercase hex digits"
    if not (args.target or args.all):
        return "the release form needs --target T or --all"
    return None


def fetch_command(args, make_opener=public_opener, environ=None, pause=time.sleep):
    """Exit 2 before any request while a token is in the environment; the verified assets land in
    --out only once every check passed."""
    environ = os.environ if environ is None else environ
    held = [name for name in TOKENS if name in environ]
    receipt = {"schema": FETCH_SCHEMA, "verdict": "FAIL", "exit": None, "mode": "rehearsal" if args.rehearsal
               else "release", "repository": args.repository, "tag": args.tag, "token_in_env": bool(held),
               "assets": [], "out": str(args.out), "problems": []}
    if held:
        receipt["problems"].append(f"{' and '.join(held)} set: fetch is anonymous and refuses to start with a token")
        return finish(receipt, args.receipt, 2)
    out = Path(args.out)
    if out.exists() and (not out.is_dir() or any(out.iterdir())):
        receipt["problems"].append(f"--out {out} must be a new or empty directory")
        return finish(receipt, args.receipt, 2)

    def get_asset(url):
        return fetch_asset(make_opener, url, pause=pause)
    try:
        files = (fetch_rehearsal if args.rehearsal else fetch_release)(args, get_asset, receipt)
    except Refused as error:
        receipt["problems"] += [str(problem) for problem in error.args]
        return finish(receipt, args.receipt, 1)
    out.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (out / name).write_bytes(data)
    return finish(receipt, args.receipt, 0)


# ------------------------------------------------------------------ self-test
# A stand-in qrscan: a Python script run through its shebang, answering every case the way the CLI
# does, from a table of consumer_truth.conforming_report reports keyed by the input's sha256.
# DEFECT plants one departure.
STUB = r'''#!__PYTHON__ -IS
import hashlib
import json
import os
import sys

CONFIG = json.loads(__CONFIG__)
DEFECT = CONFIG["defect"]
COLOUR = "NO_COLOR" not in os.environ and "CLICOLOR_FORCE" in os.environ
MARK = "\x1b[1;31m✖\x1b[0m" if COLOUR else "✖"
MORE = "\n\nFor more information, try '--help'.\n"


def out(text):
    try:
        sys.stdout.buffer.write(text.encode("utf-8"))
        sys.stdout.buffer.flush()
    except OSError as error:
        if DEFECT == "abort-unwind":
            os._exit(134)
        sys.stderr.buffer.write(("\nthread 'main' (1) panicked at library/std/src/io/stdio.rs:1166:9:\n"
                                 "failed printing to stdout: %s (os error %d)\n"
                                 % (error.strerror, error.errno)).encode())
        sys.stderr.buffer.flush()
        os._exit(101)


def fail(text, code=2):
    sys.stderr.buffer.write(text.encode("utf-8"))
    sys.stderr.buffer.flush()
    sys.exit(code)


def main(args):
    if args in (["--version"], ["-V"]):
        out("qrscan %s\n" % ("0.0.1" if DEFECT == "wrong-version" else CONFIG["version"]))
        return 0
    if args == ["--help"]:
        out(CONFIG["help"])
        return 0
    if "--capabilities" in args:
        if args != ["--capabilities"]:
            fail("error: the argument '--capabilities' cannot be used with one or more of the other specified "
                 "arguments\n\nUsage: qrscan --capabilities" + MORE)
        extra = {"features": []} if DEFECT == "capabilities-key" else {}
        out(json.dumps(dict(CONFIG["capabilities"], **extra), indent=2) + "\n")
        return 0
    options, image, rest = {"--profile": "full", "--budget-ms": "4000"}, None, list(args)
    while rest:
        arg = rest.pop(0)
        if arg in ("--pretty", "-p", "--score-only", "-s"):
            options[{"-p": "--pretty", "-s": "--score-only"}.get(arg, arg)] = True
        elif arg in ("--profile", "--budget-ms", "--score-preset") and rest:
            options[arg] = rest.pop(0)
        elif arg.startswith("-"):
            fail("error: unexpected argument '%s' found\n\nUsage: qrscan [OPTIONS] [IMAGE]%s" % (arg, MORE))
        else:
            image = arg
    if options["--profile"] not in ("full", "fast", "frame"):
        fail("error: invalid value '%s' for '--profile <PROFILE>'\n  [possible values: full, fast, frame]%s"
             % (options["--profile"], MORE))
    if not options["--budget-ms"].isdigit() or int(options["--budget-ms"]) > 4294967295:
        fail("error: invalid value '%s' for '--budget-ms <BUDGET_MS>': number too large%s"
             % (options["--budget-ms"], MORE))
    if image is None:
        fail("error: the following required arguments were not provided:\n  <IMAGE>\n\nUsage: qrscan <IMAGE>" + MORE)
    try:
        with open(image, "rb") as handle:
            data = handle.read()
    except OSError as error:
        name = image.encode("utf-8", "surrogateescape").decode("utf-8", "replace")
        fail("%s cannot read %s: %s (os error %d)\n" % (MARK, name, error.strerror, error.errno),
             0 if DEFECT == "missing-exit-0" and error.errno == 2 else 2)
    if options.get("--score-preset", "design") not in ("design", "capture"):
        fail("%s unknown score preset `%s` — expected design | capture\n" % (MARK, options["--score-preset"]))
    entry = CONFIG["table"].get(hashlib.sha256(data).hexdigest(), {"error": "QRS-001"})
    if "error" in entry:
        fail("%s unsupported or corrupt image: The image format could not be determined [%s]\n"
             % (MARK, entry["error"]), 1 if DEFECT == "malformed-exit-1" else 2)
    report, case = entry["report"], entry["case"]
    if options["--profile"] == "frame":
        report["score"] = None
        if DEFECT == "frame-text":
            report["detections"][0]["content"]["text"] += "#"
    if DEFECT == "truth-content" and case == "code128":
        report["detections"][0]["content"]["text"] = "QRCAI-0043"
    if DEFECT == "engine-panics" and case == "aztec":
        report["trace"]["engine_panics"] = 1
    if DEFECT == "truth-stderr" and case == "aztec":
        sys.stderr.write("warning: a slow reader\n")
        sys.stderr.flush()
    detections = report["detections"]
    if "--score-only" in options:
        if report["score"] is not None:
            out("%d\n" % report["score"]["value"])
            return 0
        if not detections:
            fail("no QR code found — no score\n", 1)
        fail("%s the frame profile computes no score (use --profile full|fast)\n" % MARK)
    if "--pretty" in options:
        lines = ["content   " + detections[0]["content"]["text"] if detections else "no QR code found"]
        if report["score"] is not None:
            value = "%d/100" % report["score"]["value"]
            lines.append("score     %s (Excellent)" % ("\x1b[1;32m%s\x1b[0m" % value if COLOUR else value))
        lines.append("\x1b[2mtook      7ms\x1b[0m" if COLOUR else "took      7ms")
        out("\n".join(lines) + "\n")
    else:
        text = json.dumps(report, indent=2)
        out(("\x1b[2m" + text + "\x1b[0m" if COLOUR and DEFECT == "esc-json" else text) + "\n")
    return 0 if detections else 1


sys.exit(main(sys.argv[1:]))
'''
# clap wraps help text anywhere; these lines wrap inside both phrases the help case looks for
STUB_HELP = ("Scan a QR code image: decode + scannability score + hints\n\nUsage: qrscan [OPTIONS] [IMAGE]\n\n"
             "Options:\n      --budget-ms <BUDGET_MS>  With --score-only, a decoded QR the budget left unjudged exits\n"
             "                               3 (spec/02, spec/03)\n"
             "  -s, --score-only             Exit codes: 0 = the value on stdout · 1 = no QR found · 2 = no\n"
             "                               score in this configuration · 3 = a decoded QR the budget left\n"
             "                               unjudged (nothing on stdout)\n"
             "  -V, --version                Print version\n")
STUB_DEFECTS = ("wrong-version", "missing-exit-0", "esc-json", "malformed-exit-1", "frame-text", "capabilities-key",
                "truth-content", "engine-panics", "truth-stderr", "abort-unwind")


def stub_table(truth_lib, truth, versions):
    """{input sha256: the conforming report, or the error code} for every truth case."""
    table = {}
    for truth_case in truth["cases"]:
        data = truth_lib.case_bytes(truth_case, ROOT / "fixtures")
        if "error" in truth_case:
            table[sha256(data)] = {"error": truth_case["error"]}
            continue
        report = truth_lib.conforming_report(truth_case, versions)
        report["trace"]["engine_panics"] = 0
        table[sha256(data)] = {"case": truth_case["id"], "report": report}
    return table


def stub_release(where, target, version, binary, mode=0o755, extra=(), line=True, digest=None):
    """A release directory holding the target's archive (the exact members, BINARY as qrscan) and a
    SHA256SUMS that also lists a source asset the directory does not hold, as a public run downloads."""
    stem, name = f"{PREFIX}{version}-{target}", archive_name(version, target)
    where.mkdir(parents=True)
    members = [(f"{stem}/{member}", b"{}\n" if member.endswith(".json") else b"stub\n", 0o644) for member in MEMBERS]
    members += [(f"{stem}/qrscan", binary, mode), *extra]
    with tarfile.open(where / name, "w:gz", format=tarfile.USTAR_FORMAT) as archive:
        top = tarfile.TarInfo(stem)
        top.type, top.mode = tarfile.DIRTYPE, 0o755
        archive.addfile(top)
        for member, data, member_mode in sorted(members):
            info = tarfile.TarInfo(member)
            info.size, info.mode = len(data), member_mode
            archive.addfile(info, io.BytesIO(data))
    lines = [(f"{PREFIX}{version}-source.tar.gz", "0" * 64)]
    if line:
        lines.append((name, digest or sha256((where / name).read_bytes())))
    sums = "".join(f"{hexdigest}  {asset}\n" for asset, hexdigest in sorted(lines))
    (where / f"{PREFIX}{version}-SHA256SUMS").write_bytes(sums.encode("ascii"))
    return where


def slug(label):
    return re.sub(r"[^A-Za-z0-9.-]+", "-", label).strip("-")


class Checks:
    """Self-test scenarios: each one counted, each departure named."""

    def __init__(self):
        self.failures, self.count, self.skipped = [], 0, []

    def skip(self, label, reason):
        """A scenario this checkout cannot hold, named in the printed result rather than counted."""
        self.skipped.append(f"{label}: {reason}")

    def true(self, label, ok, detail=""):
        self.count += 1
        if not ok:
            self.failures.append(f"{label}: {detail}")

    def equal(self, label, got, want):
        self.true(label, got == want, f"{got!r} != {want!r}")

    def refused(self, label, call, needle):
        """CALL must raise Refused with a problem containing NEEDLE."""
        try:
            call()
        except Refused as error:
            self.true(label, any(needle in str(problem) for problem in error.args), f"{error.args} lacks {needle!r}")
        else:
            self.true(label, False, "accepted")


def unit_checks(checks, scratch):
    """The pure judges, on every host: SHA256SUMS, archive members, the win32 PATH lookup argv, the
    docker run argv, the unwind verdicts, the error lines, the truth file's receipt sha256, and the
    Windows and container case plans."""
    version = "1.2.3"
    darwin, linux = archive_name(version, "aarch64-apple-darwin"), archive_name(version, "x86_64-unknown-linux-gnu")
    source = f"{PREFIX}{version}-source.tar.gz"
    good = "".join(f"{char * 64}  {name}\n" for char, name in (("a", darwin), ("c", source), ("b", linux)))
    checks.equal("sums: clean", parse_sums(good.encode(), version, "S"),
                [("a" * 64, darwin), ("c" * 64, source), ("b" * 64, linux)])
    for label, text, needle in (
            ("CRLF", good.replace("\n", "\r\n"), "S: a CR"),
            ("no final newline", good[:-1], "S: no final newline"),
            ("a blank line", good + "\n", "S: line '' is not"),
            ("not ASCII", good + "é\n", "S: not ASCII"),
            ("unsorted", "".join(reversed(good.splitlines(True))), "S: lines not sorted by asset name"),
            ("twice", good + f"{'c' * 64}  {source}\n", "S: an asset listed twice"),
            ("uppercase hex", good.replace("a" * 64, "A" * 64), "<64 lowercase hex>  <asset>"),
            ("one space", good.replace(f"  {linux}", f" {linux}"), "<64 lowercase hex>  <asset>"),
            ("another version", good.replace(f"-{version}-source", "-1.2.4-source"), "is not a 1.2.3 CLI asset"),
            ("a foreign asset", good + f"{'d' * 64}  SHA256SUMS\n", "S: SHA256SUMS is not a 1.2.3 CLI asset"),
            ("a zip for Linux", good.replace(linux, linux[:-len("tar.gz")] + "zip"), "wrong extension for its target")):
        checks.refused(f"sums: {label}", lambda text=text: parse_sums(text.encode(), version, "S"), needle)
    stem = f"{PREFIX}{version}-x86_64-pc-windows-msvc"
    for label, names, needle in (
            ("an extra member", (*MEMBERS, "qrscan.exe", "extra.txt"), f"unexpected member {stem}/extra.txt"),
            ("a missing member", (*MEMBERS[1:], "qrscan.exe"), f"missing member {stem}/{MEMBERS[0]}"),
            ("qrscan without .exe", (*MEMBERS, "qrscan"), f"unexpected member {stem}/qrscan")):
        path = scratch / f"{label}.zip"
        with zipfile.ZipFile(path, "w") as archive:
            for name in names:
                archive.writestr(f"{stem}/{name}", b"x")
        files, dirs = archive_members(path, "zip")
        checks.refused(f"zip: {label}", lambda path=path, files=files, dirs=dirs:
                      check_members(path, stem, "qrscan.exe", files, dirs), needle)
    for label, name, kind, needle in (
            ("a symbolic link", "s/qrscan", tarfile.SYMTYPE, "is neither a file nor a directory"),
            ("a parent name", "../qrscan", tarfile.REGTYPE, "unsafe member name '../qrscan'"),
            ("an absolute name", "/s/qrscan", tarfile.REGTYPE, "unsafe member name '/s/qrscan'")):
        path = scratch / f"{label}.tar.gz"
        with tarfile.open(path, "w:gz", format=tarfile.USTAR_FORMAT) as archive:
            info = tarfile.TarInfo(name)
            info.type, info.linkname = kind, "/bin/sh" if kind == tarfile.SYMTYPE else ""
            archive.addfile(info, io.BytesIO(b""))
        checks.refused(f"tar: {label}", lambda path=path: archive_members(path, "tar.gz"), needle)
    commands = lookup_commands("win32", "C:\\Windows")
    checks.equal("win32 path-lookup argv", commands,
                [("path-lookup", ["C:\\Windows\\System32\\cmd.exe", "/d", "/s", "/c", "qrscan --version"]),
                 ("path-lookup-where", ["C:\\Windows\\System32\\where.exe", "qrscan"])])
    checks.equal("win32 path-lookup command line", subprocess.list2cmdline(commands[0][1]),
                'C:\\Windows\\System32\\cmd.exe /d /s /c "qrscan --version"')
    checks.equal("posix path-lookup argv", lookup_commands("linux"), [("path-lookup", ["qrscan", "--version"])])
    image = "debian@sha256:" + "e" * 64
    box = {"docker": "docker", "image": image, "platform": "linux/amd64", "uid": 1001, "gid": 118,
           "extracted": "/t/extract", "stage": "/t/stage", "binary": "/opt/qrscan/s/qrscan"}
    checks.equal("docker run argv", docker_command(box, ["--version"], {"PATH": "/opt/qrscan/s:/bin"}, "qrscan"),
                ["docker", "run", "--rm", "--pull", "never", "--network", "none", "--read-only", "--cap-drop", "ALL",
                 "--security-opt", "no-new-privileges", "--user", "1001:118", "--cpus", "2", "--memory", "1g",
                 "--pids-limit", "128", "--platform", "linux/amd64", "-v", "/t/extract:/opt/qrscan:ro",
                 "-v", "/t/stage:/work:ro", "-w", "/work", "-e", "PATH=/opt/qrscan/s:/bin", "--entrypoint", "qrscan",
                 image, "--version"])
    for code in (-6, 134, 0xC0000409):
        checks.equal(f"unwind exit {code}", unwind_check("", "", code), [f"the panic did not unwind (exit {code})"])
    checks.equal("unwind exit 101", unwind_check("", "thread 'main' panicked at x:\nfailed printing to stdout: "
                                                          "Broken pipe (os error 32)\n", 101), [])
    checks.equal("unwind without its message", unwind_check("", "", 101),
                ["stderr does not say 'panicked'", "stderr does not say 'failed printing to stdout'"])
    lines = ("✖ cannot read dir: Access is denied. (os error 5)\n",
             "✖ cannot read dir: Is a directory (os error 21)\n",
             "\x1b[1;31m✖\x1b[0m cannot read a.png: No such file or directory (os error 2)\n")
    for label, pattern, text, matches in (
            ("errno 5", read_error("dir", 5), lines[0], True),
            ("errno 21", read_error("dir", 21), lines[1], True),
            ("errno 5 where 21 is due", read_error("dir", 21), lines[0], False),
            ("colour", read_error("a.png", 2, colour=True), lines[2], True),
            ("colour where plain is due", read_error("a.png", 2), lines[2], False),
            ("two lines", read_error("dir", 21), lines[1].replace(": ", ":\n", 1), False)):
        checks.true(f"error line: {label}", bool(re.fullmatch(pattern, text)) == matches,
                    f"{text!r} {'does not match' if matches else 'matches'} {pattern!r}")
    checks.equal("help, wrapped", help_check(STUB_HELP, "", 0), [])
    checks.equal("help, qrscan.exe", help_check(STUB_HELP.replace("qrscan [", "qrscan.exe ["), "", 0), [])
    checks.equal("help without exit 3", help_check(STUB_HELP.replace("exits", "ends"), "", 0),
                ["help does not say 'exits 3'"])
    digest_checks(checks)
    plan_checks(checks, scratch)


def digest_checks(checks):
    """The truth file's receipt sha256 for planted working-tree copies, and committed_blob on this
    checkout: the bytes it reads must hash to the object id the commit's tree names."""
    lf = b'{\n  "schema": "qrscan-consumer-truth/1"\n}\n'
    crlf, mixed = lf.replace(b"\n", b"\r\n"), b'{\r\n  "schema": "x"\n}\n'
    for label, data, blob, want in (
            ("the committed blob", lf, lf, sha256(lf)),
            ("its CRLF checkout", crlf, lf, sha256(lf)),
            ("an edited copy", lf + b"\n", lf, sha256(lf + b"\n")),
            ("an edited CRLF copy", crlf + b"\r\n", lf, sha256(crlf + b"\r\n")),
            ("CRLF over a blob that holds a CR", mixed.replace(b"\n", b"\r\n"), mixed,
             sha256(mixed.replace(b"\n", b"\r\n"))),
            ("no committed blob", crlf, None, sha256(crlf))):
        checks.equal(f"truth sha256: {label}", truth_digest(data, blob), want)
    checks.true("truth sha256: a CRLF checkout differs from its blob", sha256(crlf) != sha256(lf))
    commit = git_commit(ROOT)
    checks.equal("committed blob: no commit", committed_blob(ROOT, None, TRUTH_FILE), None)
    checks.equal("committed blob: an unknown commit", committed_blob(ROOT, "0" * 40, TRUTH_FILE), None)
    if commit is None:
        checks.skip("committed blob: this checkout's", "not a git checkout")
        return
    checks.equal("committed blob: a path the commit lacks", committed_blob(ROOT, commit, "fixtures/absent.json"), None)
    blob = committed_blob(ROOT, commit, TRUTH_FILE)
    named = tool_output(["git", "-C", ROOT, "rev-parse", "--verify", f"{commit}:{TRUTH_FILE}"])
    algorithm = hashlib.sha1 if len(commit) == 40 else hashlib.sha256
    checks.equal("committed blob: the object its commit names",
                 None if blob is None else algorithm(b"blob %d\0" % len(blob) + blob).hexdigest(), named)


# every host and mode runs these first, in this order
BASE_IDS = ["version", "version-short", "help", "capabilities", "capabilities-exclusive", "no-image", "unknown-flag",
            "bad-profile", "bad-budget", "bad-preset", "missing", "directory", "malformed", "control-json",
            "frame-json", "score-only", "score-only-frame", "empty-json", "empty-score-only", "pretty", "pretty-empty",
            "colour-error", "colour-no-color", "colour-json", "colour-pretty", "absolute", "unicode",
            "unicode-missing"]


def plan_checks(checks, scratch):
    """The plans this host may never run, built and prepared without executing anything: the
    Windows native cases and a container's."""
    versions, truth, control = {"scanner": "1.2.3"}, {"scan": {"profile": "full", "budget_ms": 0}}, "gen_v5_q.png"
    stage, binary = scratch / "stage", scratch / "extract" / "s" / "qrscan.exe"
    ctx = {"system": "win32", "version": "1.2.3", "stage": stage, "scratch": scratch, "binary": binary, "stem": "s",
           "long_path": scratch / ("l" * 60) / control, "box": None, "env": scrubbed_env(scratch, "win32")}
    cases = {one["id"]: one for one in build_cases(ctx, versions, ([], []), None, truth, [], {})}
    checks.equal("win32 plan: case ids", list(cases), [*BASE_IDS, "path-lookup", "path-lookup-where", "unwind",
                                                      "forward-slashes", "long-path", "verbatim"])
    argv, env, keys = prepare(ctx, cases["path-lookup"])
    root = ctx["env"]["SystemRoot"]
    checks.equal("win32 plan: path-lookup", (argv, env["PATH"].split(";")[0], keys),
                 ([root + "\\System32\\cmd.exe", "/d", "/s", "/c", "qrscan --version"], str(binary.parent),
                  ["COMSPEC", "HOME", "PATH", "PATHEXT", "SystemRoot", "TEMP", "TMP", "TMPDIR", "USERPROFILE",
                   "WINDIR"]))
    checks.equal("win32 plan: paths", [cases[name]["argv"][0] for name in ("forward-slashes", "long-path", "verbatim")],
                 [str(stage / control).replace("\\", "/"), str(ctx["long_path"]), "\\\\?\\" + str(stage / control)])
    checks.equal("win32 plan: unwind", {key: cases["unwind"].get(key) for key in ("argv", "exit", "sink", "own_exit")},
                 {"argv": ["--capabilities"], "exit": 101, "sink": True, "own_exit": True})
    checks.equal("win32 plan: not executed", [(one["id"], one["reason"]) for one in not_executed(ctx)][2:],
                 [("non-utf8-name", "Windows names are UTF-16")])
    image = "debian@sha256:" + "e" * 64
    box = {"docker": "docker", "image": image, "platform": "linux/arm64", "uid": 1001, "gid": 118,
           "extracted": "/t/extract", "stage": "/t/stage", "binary": "/opt/qrscan/s/qrscan"}
    ctx.update(system="linux", box=box, long_path=None, env=scrubbed_env(scratch, "linux"))
    cases = {one["id"]: one for one in build_cases(ctx, versions, ([], []), None, truth, [], {})}
    checks.equal("container plan: case ids", list(cases), [*BASE_IDS, "path-lookup", "unwind"])
    # what follows the fixed docker run flags, and the env keys the receipt records
    head, tails = docker_command(box, [])[:-3], []
    for name in ("path-lookup", "unwind", "absolute", "colour-error"):
        argv, _, keys = prepare(ctx, cases[name])
        tails.append([*argv[len(head):], keys])
    checks.equal("container plan: argv", tails, [
        ["-e", "PATH=/opt/qrscan/s:/usr/bin:/bin", "--entrypoint", "qrscan", image, "--version", ["PATH"]],
        ["--entrypoint", "/bin/sh", image, "-c", 'exec "$0" --capabilities >/dev/full', "/opt/qrscan/s/qrscan", []],
        ["--entrypoint", "/opt/qrscan/s/qrscan", image, "/work/" + control, "--budget-ms", "0", []],
        ["-e", "CLICOLOR_FORCE=1", "--entrypoint", "/opt/qrscan/s/qrscan", image, "absent.png", ["CLICOLOR_FORCE"]]])
    windows_only = [(name, "Windows paths only") for name in ("forward-slashes", "long-path", "verbatim")]
    checks.equal("container plan: not executed", [(one["id"], one["reason"]) for one in not_executed(ctx)][2:],
                 [("non-utf8-name", "container argv is UTF-8"), *windows_only])


def stub_checks(checks, scratch, target):
    """main() on stub releases for this host's own target: the conforming stub passes with exact
    receipt values; every planted stub, archive and SUMS defect is refused with its named reason."""
    truth_lib = truth_module()
    truth, consts, enums, version = load_contract(ROOT, truth_lib)
    versions = {"scanner": version, **consts}
    table = stub_table(truth_lib, truth, versions)
    config = {"version": version, "help": STUB_HELP, "table": table,
              "capabilities": {"versions": versions, "engines": enums[0], "symbologies": enums[1]}}

    def stub(defect=None):
        source = STUB.replace("__PYTHON__", sys.executable)
        return source.replace("__CONFIG__", repr(json.dumps({**config, "defect": defect}))).encode("utf-8")

    def run(label, release, *extra, chosen=target):
        receipt = scratch / f"{slug(label)}.json"
        with contextlib.redirect_stdout(io.StringIO()) as printed:
            code = main(["--release-dir", str(release), "--target", chosen, "--receipt", str(receipt), *extra])
        text = receipt.read_text(encoding="utf-8")
        checks.true(f"{label}: printed receipt", printed.getvalue() == text, "differs from the one --receipt wrote")
        return code, json.loads(text)
    system, binary = TARGETS[target][0], stub()
    stem, name = f"{PREFIX}{version}-{target}", archive_name(version, target)
    sums_name = f"{PREFIX}{version}-SHA256SUMS"
    clean = stub_release(scratch / "clean", target, version, binary)
    archive_sha, sums_sha = sha256((clean / name).read_bytes()), sha256((clean / sums_name).read_bytes())
    code, receipt = run("clean", clean)
    checks.equal("clean: exit, verdict, problems", (code, receipt["verdict"], receipt["exit"], receipt["problems"]),
                  (0, "PASS", 0, []))
    ids = [*BASE_IDS, "path-lookup", "unwind", *(["non-utf8-name"] if system == "linux" else []),
           *(f"truth-set/{truth_case['id']}" for truth_case in truth["cases"])]
    by_id = {record["id"]: record for record in receipt["cases"]}
    checks.equal("clean: case ids", [record["id"] for record in receipt["cases"]], ids)
    checks.equal("clean: cases not ok", [record["id"] for record in receipt["cases"]
                                         if not record["ok"] or record["exit"] != record["expected_exit"]], [])
    checks.equal("clean: unwind exit", (by_id["unwind"]["exit"], by_id["unwind"]["expected_exit"]), (101, 101))
    checks.equal("clean: path-lookup argv", by_id["path-lookup"]["argv"], ["qrscan", "--version"])
    scrubbed = ["HOME", "PATH", "TEMP", "TMP", "TMPDIR", "USERPROFILE"]
    checks.equal("clean: env keys", (by_id["version"]["env"], by_id["colour-no-color"]["env"]),
                 (scrubbed, sorted([*scrubbed, "CLICOLOR_FORCE", "NO_COLOR"])))
    checks.equal("clean: identity", {key: receipt[key] for key in (
        "schema", "target", "version", "archive", "sums_sha256", "binary_sha256", "container", "consumer_commit",
        "contract_commit")}, {"schema": SCHEMA, "target": target, "version": version,
                              "archive": {"name": name, "sha256": archive_sha, "size": (clean / name).stat().st_size},
                              "sums_sha256": sums_sha, "binary_sha256": sha256(binary), "container": None,
                              "consumer_commit": git_commit(ROOT), "contract_commit": git_commit(ROOT)})
    checks.equal("clean: hash tools", [(tool["tool"], tool["sha256"]) for tool in receipt["hash_tools"]],
                 [("hashlib", archive_sha), ("shasum -a 256" if system == "darwin" else "sha256sum", archive_sha)])
    checks.true("clean: extracted with", bool(re.match(r"(bsdtar \d|tar \(GNU tar\) \d)", receipt["extracted_with"])),
                repr(receipt["extracted_with"]))
    identities = {entry["case"]: truth_lib.identity(entry["report"]) for entry in table.values() if "case" in entry}
    blob = committed_blob(ROOT, git_commit(ROOT), TRUTH_FILE)
    checks.equal("clean: truth", receipt["truth"], {
        "file": TRUTH_FILE, "sha256": truth_digest((ROOT / TRUTH_FILE).read_bytes(), blob),
        "cases": len(truth["cases"]), "identities_sha256": truth_lib.identities_digest(identities),
        "engine_panics_total": 0})
    checks.equal("clean: not executed", [skipped["id"] for skipped in receipt["not_executed"]],
                 ["exit-3", "engine-frame-panic", *(["non-utf8-name"] if system != "linux" else []),
                  "forward-slashes", "long-path", "verbatim"])
    contract_checks(checks, scratch, run, clean, truth_lib, truth)
    banner = f"qrscan {version}\n"
    needles = {
        "wrong-version": ["version: stdout " + repr("qrscan 0.0.1\n") + ", expected " + repr(banner)],
        "missing-exit-0": ["missing: exit 0, expected 2"],
        "esc-json": ["colour-json: an ESC in the JSON report"],
        "malformed-exit-1": ["malformed: exit 1, expected 2", "truth-set/malformed: exit 1, expected 2"],
        "frame-text": ["frame-json: texts " + repr([CONTROL_TEXT + "#"]) + " != " + repr([CONTROL_TEXT])],
        "capabilities-key": ["capabilities: keys ['engines', 'features', 'symbologies', 'versions'] != "
                             "['engines', 'symbologies', 'versions']"],
        "truth-content": ["truth-set/code128: code128: code128 'QRCAI-0042' found 0 times"],
        "engine-panics": ["truth-set/aztec: engine-panics: trace.engine_panics 1"],
        "truth-stderr": ["truth-set/aztec: stderr on a clean truth case: " + repr("warning: a slow reader\n")],
        "abort-unwind": ["unwind: the panic did not unwind (exit 134)"],
    }
    for defect in STUB_DEFECTS:
        code, receipt = run(defect, stub_release(scratch / defect, target, version, stub(defect)))
        missing = [needle for needle in needles[defect] if not any(p.startswith(needle) for p in receipt["problems"])]
        checks.true(f"stub {defect}", (code, receipt["verdict"], missing) == (1, "FAIL", []),
                    f"exit {code}, {receipt['verdict']}, no {missing} among {receipt['problems'][:6]}")
    line = stub_release(scratch / "line", target, version, binary, digest="1" * 64)
    planted = (
        ("an archive not in SUMS", stub_release(scratch / "unlisted", target, version, binary, line=False), (),
         f"{name} is not listed in {sums_name}"),
        ("a SUMS sha256 mismatch", clean, ("--sums-sha256", "0" * 64),
         f"{sums_name}: sha256 {sums_sha} != --sums-sha256 {'0' * 64}"),
        ("an archive that differs from its line", line, (),
         f"{name}: hashlib says {sha256((line / name).read_bytes())}, its {sums_name} line says {'1' * 64}"),
        ("an extra member", stub_release(scratch / "extra", target, version, binary,
                                         extra=[(f"{stem}/extra.txt", b"x\n", 0o644)]), (),
         f"{name}: unexpected member {stem}/extra.txt"),
        ("qrscan 0644", stub_release(scratch / "mode", target, version, binary, mode=0o644), (),
         f"{stem}/qrscan is not owner-executable after extraction (mode 0644)"))
    for label, release, extra, needle in planted:
        code, receipt = run(label, release, *extra)
        checks.true(label, (code, receipt["verdict"], receipt["cases"], needle in receipt["problems"])
                    == (1, "FAIL", [], True), f"exit {code}, {len(receipt['cases'])} cases, {receipt['problems']}")
    linux = native_target("linux")
    if linux:
        platform_name = next(key for key, machine in PLATFORMS.items() if machine == TARGETS[linux][1])
        usage, said = None, io.StringIO()
        with contextlib.redirect_stderr(said):
            try:
                main(["--release-dir", str(clean), "--target", linux, "--container", "debian:12-slim",
                      "--platform", platform_name, "--expect-glibc", "2.36"])
            except SystemExit as stop:
                usage = stop.code
        checks.true("an image without a digest", (usage, "must be pinned as NAME@sha256:<64 hex>" in said.getvalue())
                    == (2, True), f"exit {usage}, {said.getvalue()[-200:]!r}")
        empty, saved = scratch / "empty-path", os.environ.get("PATH", "")
        empty.mkdir()
        os.environ["PATH"] = str(empty)
        try:
            code, receipt = run("no docker", clean, "--container", "debian@sha256:" + "e" * 64, "--platform",
                                platform_name, "--expect-glibc", "2.36", chosen=linux)
        finally:
            os.environ["PATH"] = saved
        checks.equal("a missing docker", (code, receipt["problems"]), (2, ["docker is not on PATH"]))


def contract_copy(where, truth, data):
    """A --contract-root holding this checkout's Cargo.toml, schema and truth fixtures, and DATA as
    its truth file."""
    for relative in ("Cargo.toml", "spec/scan-report.schema.json",
                     *sorted({f"fixtures/{case['file']}" for case in truth["cases"] if "file" in case})):
        (where / relative).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / relative, where / relative)
    (where / TRUTH_FILE).write_bytes(data)
    return where


def contract_checks(checks, scratch, run, release, truth_lib, truth):
    """The clean stub release judged from --contract-root copies of this checkout, GIT_DIR pointing
    git at its repository as from a checkout of the same commit: a CRLF truth file names the
    committed blob, an edited one its own bytes, and a root outside git its own bytes, no commit."""
    commit = git_commit(ROOT)
    blob = committed_blob(ROOT, commit, TRUTH_FILE)
    try:
        # the stub release answers this checkout's truth set; the copies carry the commit's
        same = blob is not None and truth_lib.prepare(json.loads(blob.decode("utf-8"))) == truth
    except (ValueError, KeyError, TypeError, AssertionError):
        same = False
    if not same:
        checks.skip("contract roots", "no commit to read" if blob is None else f"{TRUTH_FILE} is not its commit's")
        return
    repository = tool_output(["git", "-C", ROOT, "rev-parse", "--absolute-git-dir"])
    crlf, saved = blob.replace(b"\n", b"\r\n"), os.environ.get("GIT_DIR")
    for label, data, git_dir, want in (
            ("a CRLF checkout of the contract", crlf, repository, (commit, sha256(blob))),
            ("a contract truth file edited after its commit", blob + b"\n", repository,
             (commit, sha256(blob + b"\n"))),
            ("a contract root outside git", crlf, str(scratch / "no-repository"), (None, sha256(crlf)))):
        where = contract_copy(scratch / f"contract-{slug(label)}", truth, data)
        os.environ["GIT_DIR"] = git_dir
        try:
            code, receipt = run(label, release, "--contract-root", str(where))
        finally:
            if saved is None:
                os.environ.pop("GIT_DIR", None)
            else:
                os.environ["GIT_DIR"] = saved
        checks.equal(label, (code, receipt["verdict"], receipt["contract_commit"], get(receipt, "truth", "sha256")),
                     (0, "PASS", *want))


class Served:
    """A loopback HTTP server (127.0.0.1 only) answering by (Host, path), recording every request."""

    def __init__(self):
        self.routes, self.seen = {}, []
        served = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                host = (self.headers.get("Host") or "").split(":")[0].lower()
                served.seen.append((host, self.path, {key.lower(): value for key, value in self.headers.items()}))
                status, headers, body = served.routes.get((host, self.path), (404, {}, b"not found\n"))
                self.send_response(status)
                for key, value in headers.items():
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass
        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.port = self.server.server_address[1]

    def __enter__(self):
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        return self

    def __exit__(self, *exc):
        self.server.shutdown()
        self.server.server_close()


class Loopback(urllib.request.AbstractHTTPHandler):
    """Self-test transport: every http:// and https:// request reaches the loopback server with its
    Host header, so the redirect policy judges the real URLs and nothing leaves this host."""
    handler_order = 100

    def __init__(self, port):
        super().__init__()
        self.port = port

    def connect(self, host, **kwargs):
        return http.client.HTTPConnection("127.0.0.1", self.port, timeout=kwargs.get("timeout", 30))

    def http_open(self, req):
        return self.do_open(self.connect, req)

    https_open = http_open


class Bearer(urllib.request.BaseHandler):
    """A planted defect: a request processor that adds a token."""

    def add(self, req):
        req.add_unredirected_header("Authorization", "Bearer planted")
        return req

    http_request = https_request = add


def fetch_checks(checks, scratch):
    """fetch against the loopback server standing in for github.com and its asset host: the release
    and rehearsal forms pass with exact receipts; an anchor or asset mismatch, an Authorization
    header, an http:// or foreign redirect, bytes served by github.com itself, a draft's 404 and a
    token in the environment are refused, and no request ever reaches the server with a token."""
    repository, tag, version, target = "o/r", "v1.2.3", "1.2.3", "x86_64-unknown-linux-gnu"
    archive, source = archive_name(version, target), f"{PREFIX}{version}-source.tar.gz"
    sums_name = f"{PREFIX}{version}-SHA256SUMS"
    blobs = {archive: b"archive bytes\n", source: b"source bytes\n"}
    blobs[sums_name] = "".join(f"{sha256(blobs[name])}  {name}\n" for name in sorted(blobs)).encode("ascii")
    path, assets = f"/{repository}/releases/download/{tag}/", "release-assets.githubusercontent.com"

    def served(files, location=lambda name: f"https://{assets}/a/{name}", direct=False):
        routes = {}
        for name, body in files.items():
            routes[(GITHUB, path + name)] = (200, {}, body) if direct else (302, {"Location": location(name)}, b"")
            routes[(assets, f"/a/{name}")] = (200, {}, body)
        return routes
    parse = fetch_parser().parse_args
    base = ["--repository", repository, "--tag", tag, "--sums-sha256", sha256(blobs[sums_name])]
    for label, argv, needle in (
            ("a tag that is not vX.Y.Z", ["--repository", repository, "--tag", "agents-v0.1.0", *base[4:], "--all"],
             "--tag 'agents-v0.1.0' is not vX.Y.Z"),
            ("no target", base, "the release form needs --target T or --all"),
            ("a repository URL", ["--repository", "https://github.com/o/r", *base[2:], "--all"], "is not OWNER/REPO"),
            ("a rehearsal without --sha256", ["--rehearsal", "--repository", repository, "--tag", "t", "--asset", "a"],
             "--sha256 must be 64 lowercase hex digits")):
        problem = fetch_usage(parse([*argv, "--out", str(scratch / "unused")]))
        checks.true(f"fetch usage: {label}", needle in (problem or ""), repr(problem))
    with Served() as server:
        def run(label, argv, routes, planted=(), environ=None):
            server.routes, server.seen[:] = routes, []
            label = slug(label)
            args = parse([*argv, "--out", str(scratch / label), "--receipt", str(scratch / f"{label}.json")])
            checks.equal(f"fetch {label}: usage", fetch_usage(args), None)

            def make(hosts):
                return urllib.request.build_opener(urllib.request.ProxyHandler({}), RedirectPolicy(hosts), Anonymous(),
                                                   Loopback(server.port), *planted)
            with contextlib.redirect_stdout(io.StringIO()):
                code = fetch_command(args, make_opener=make, environ=environ or {}, pause=lambda seconds: None)
            receipt = json.loads((scratch / f"{label}.json").read_text(encoding="utf-8"))
            checks.equal(f"fetch {label}: a token at the server",
                         [seen for seen in server.seen if "authorization" in seen[2]], [])
            return code, receipt, list(server.seen)
        code, receipt, seen = run("release", [*base, "--target", target], served(blobs))
        dates = [asset.pop("date", None) for asset in receipt["assets"]]
        checks.equal("fetch release: exit, verdict, token, problems",
                     (code, receipt["verdict"], receipt["token_in_env"], receipt["problems"]), (0, "PASS", False, []))
        checks.equal("fetch release: assets", receipt["assets"], [
            {"name": name, "url": f"https://{GITHUB}{path}{name}", "hosts": [GITHUB, assets], "final_host": assets,
             "status": 200, "size": len(blobs[name]), "sha256": sha256(blobs[name]), "attempts": 1}
            for name in (sums_name, archive)])
        checks.true("fetch release: dates", all(re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", date or "")
                                                for date in dates), repr(dates))
        checks.equal("fetch release: files", {file.name: file.read_bytes() for file in (scratch / "release").iterdir()},
                     {name: blobs[name] for name in (sums_name, archive)})
        checks.equal("fetch release: requests", [(host, url) for host, url, _ in seen],
                     [(GITHUB, path + sums_name), (assets, f"/a/{sums_name}"), (GITHUB, path + archive),
                      (assets, f"/a/{archive}")])
        code, receipt, _ = run("all", [*base, "--all"], served(blobs))
        checks.equal("fetch --all", (code, sorted(file.name for file in (scratch / "all").iterdir())),
                     (0, sorted(blobs)))
        first = f"https://{GITHUB}{path}{sums_name}"
        for label, routes, planted, needle in (
                ("an anchor mismatch", served(blobs), (), None),
                ("an asset mismatch", served({**blobs, archive: b"tampered\n"}), (),
                 f"{archive}: sha256 {sha256(b'tampered' + bytes([10]))} != its {sums_name} line "
                 f"{sha256(blobs[archive])}"),
                ("an Authorization header", served(blobs), (Bearer(),),
                 f"an Authorization header on the request to {GITHUB}"),
                ("an http:// redirect", served(blobs, lambda name: f"http://{assets}/a/{name}"), (),
                 f"a redirect to http://{assets}: only https:// is followed"),
                ("a foreign redirect", served(blobs, lambda name: f"https://evil.example/a/{name}"), (),
                 "a foreign redirect to evil.example"),
                ("bytes from github.com", served(blobs, direct=True), (),
                 f"{first}: the bytes came from https://{GITHUB}, not https on a *{ASSET_HOST} host"),
                ("a draft", {}, (), f"{first}: HTTP 404 (an unpublished draft answers 404)")):
            anchor = "0" * 64 if needle is None else base[-1]
            needle = needle or f"{sums_name}: sha256 {sha256(blobs[sums_name])} != --sums-sha256 {anchor}"
            code, receipt, seen = run(label, [*base[:-1], anchor, "--target", target], routes, planted)
            checks.true(f"fetch: {label}", (code, receipt["verdict"], needle in receipt["problems"],
                                            (scratch / slug(label)).exists()) == (1, "FAIL", True, False),
                        f"exit {code}, {receipt['problems']}")
            if planted:
                checks.equal(f"fetch: {label} sent nothing", seen, [])
        code, receipt, seen = run("a busy server", [*base, "--target", target],
                                  {(GITHUB, path + sums_name): (503, {}, b"busy\n")})
        checks.equal("fetch: a 5xx retried, then refused", (code, receipt["problems"], len(seen)),
                     (1, [f"{first}: HTTP 503"], 3))
        for token in TOKENS:
            code, receipt, seen = run(token, [*base, "--target", target], served(blobs), environ={token: "x"})
            checks.equal(f"fetch with {token} set", (code, receipt["token_in_env"], receipt["problems"], seen),
                         (2, True, [f"{token} set: fetch is anonymous and refuses to start with a token"], []))
        asset, body = "pkg-0.1.0.tgz", b"package bytes\n"
        # unsorted, as a hand-made SHA256SUMS may be; only the asset's own line counts
        sums = f"{'0' * 64}  zz-other.zip\n{sha256(body)}  {asset}\n".encode("ascii")
        other = f"/{repository}/releases/download/agents-v0.1.0/"
        routes = {(GITHUB, other + asset): (302, {"Location": f"https://{assets}/b/1"}, b""),
                  (assets, "/b/1"): (200, {}, body),
                  (GITHUB, other + "SHA256SUMS"): (302, {"Location": f"https://{assets}/b/2"}, b""),
                  (assets, "/b/2"): (200, {}, sums)}
        rehearsal = ["--rehearsal", "--repository", repository, "--tag", "agents-v0.1.0", "--asset", asset,
                     "--sha256", sha256(body)]
        code, receipt, _ = run("rehearsal", rehearsal, routes)
        landed = {file.name: file.read_bytes() for file in (scratch / "rehearsal").iterdir()}
        names = [entry["name"] for entry in receipt["assets"]]
        checks.equal("fetch --rehearsal", (code, receipt["mode"], names, landed),
                     (0, "rehearsal", [asset, "SHA256SUMS"], {asset: body, "SHA256SUMS": sums}))
        routes[(assets, "/b/2")] = (200, {}, sums.replace(sha256(body).encode("ascii"), b"f" * 64))
        code, receipt, _ = run("rehearsal without its line", rehearsal, routes)
        checks.equal("fetch --rehearsal without its line", (code, receipt["problems"]),
                     (1, [f"SHA256SUMS of agents-v0.1.0 has no line '{sha256(body)}  {asset}'"]))


def self_test():
    checks, ran = Checks(), {}
    with tempfile.TemporaryDirectory(prefix="qrscan-cli-consumer-self-test-") as scratch:
        root, saved = Path(scratch).resolve(), tempfile.tempdir
        for part in ("tmp", "units", "stubs", "fetch"):
            (root / part).mkdir()
        # every consumer run's mkdtemp lands in this scratch and leaves with it
        tempfile.tempdir = str(root / "tmp")
        target = native_target()
        try:
            for name, section, args in (("units", unit_checks, (root / "units",)),
                                        ("stub_runs", stub_checks, (root / "stubs", target)),
                                        ("fetch", fetch_checks, (root / "fetch",))):
                if section is stub_checks and not (target and TARGETS[target][2] == "tar.gz"):
                    ran[name] = f"not executed: the stub runs on a POSIX release host, not {host_os()} {host_machine()}"
                    continue
                before = checks.count
                section(checks, *args)
                ran[name] = checks.count - before
        finally:
            tempfile.tempdir = saved
    skipped = {"not_executed": checks.skipped} if checks.skipped else {}
    print(json.dumps({"self_test": "FAIL" if checks.failures else "PASS", **ran, **skipped,
                      "failures": checks.failures}))
    return 1 if checks.failures else 0


def consumer_parser():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--release-dir", help="the directory holding SHA256SUMS and the target's archive")
    parser.add_argument("--target", choices=sorted(TARGETS))
    parser.add_argument("--sums-sha256", help="the SHA256SUMS sha256 every consumer must have judged")
    parser.add_argument("--contract-root",
                        help="the checkout whose fixtures/ and spec/ judge the binary (default: this one)")
    parser.add_argument("--receipt", help="write the qrscan-cli-consumer/1 receipt here")
    parser.add_argument("--container", metavar="IMAGE@sha256:H", help="run every case in this pinned Linux image")
    parser.add_argument("--platform", choices=sorted(PLATFORMS))
    parser.add_argument("--expect-glibc", metavar="X.Y")
    parser.add_argument("--self-test", action="store_true")
    return parser


def consumer_usage(args):
    """The usage error of a parsed consumer command line, or None. An image is pinned by digest, a
    container runs its own architecture, and a native target runs on its own host."""
    if not (args.release_dir and args.target):
        return "--release-dir and --target are required"
    if args.sums_sha256 and not HEX64.match(args.sums_sha256):
        return "--sums-sha256 must be 64 lowercase hex digits"
    system, machine, _ = TARGETS[args.target]
    if args.container is None:
        if args.platform or args.expect_glibc:
            return "--platform and --expect-glibc belong to --container"
        if (system, machine) != (host_os(), host_machine()):
            return f"{args.target} does not run natively on this {host_os()} {host_machine()} host"
        return None
    if not IMAGE.match(args.container):
        return f"--container {args.container!r} must be pinned as NAME@sha256:<64 hex>"
    if not (args.platform and args.expect_glibc and re.fullmatch(r"\d+\.\d+", args.expect_glibc)):
        return "--container needs --platform and --expect-glibc X.Y"
    if system != "linux" or PLATFORMS[args.platform] != machine:
        return f"{args.target} is not the {args.platform} target"
    if host_os() == "win32" or host_machine() != machine:
        return f"{args.platform} runs natively on a {machine} Linux or macOS host, not on {host_os()} {host_machine()}"
    return None


def main(argv=None):
    argv = sys.argv[1:] if argv is None else list(argv)
    if argv[:1] == ["fetch"]:
        parser = fetch_parser()
        args = parser.parse_args(argv[1:])
        problem = fetch_usage(args)
        if problem:
            parser.error(problem)
        return fetch_command(args)
    parser = consumer_parser()
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    problem = consumer_usage(args)
    if problem:
        parser.error(problem)
    return consume(args)


if __name__ == "__main__":
    sys.exit(main())
