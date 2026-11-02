"""Browser WASM provenance: compiled-input digest, emitted feature envelope, build-info.

`scripts/build-wasm.sh` writes `pkg/build-info.json` from the bytes it has just
built and validated. Packing and inspection then refuse a package whose WASM
bytes differ from that record (modified) or whose compiled inputs changed since
(a stale build reused under the same version). The input digest links the bytes
to their source inputs, recipe and tools; it is not a bit-for-bit
reproducibility claim.

The feature envelope is read from the module itself: every function body is
decoded instruction by instruction, so an immediate is never mistaken for an
opcode, and an opcode this decoder does not know makes the envelope incomplete
instead of guessed. LLVM/Rust defaults evolve; the recorded envelope is what
this exact module needs from an engine.

    python3 scripts/wasm_provenance.py digest              # compiled-input digest (before a build)
    python3 scripts/wasm_provenance.py write PKG_DIR --rustflags FLAGS --wasm-opt-flags FLAGS \\
        --inputs DIGEST_BEFORE --built-after EPOCH_SECONDS
    python3 scripts/wasm_provenance.py verify PKG_DIR      # JSON findings, exit 1 on any
    python3 scripts/wasm_provenance.py envelope FILE.wasm  # JSON feature set
    python3 scripts/wasm_provenance.py --self-test
"""
import hashlib
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
WASM_NAME = "qrcode-ai-scanner_bg.wasm"
SCHEMA = 1
# What compiles into the browser module: the WASM crate, its one path
# dependency (the core, library sources only), the workspace manifest and lock
# (profiles, pins) and the build recipe itself. Tests, benches, fixtures and
# docs of the core do not enter the release library build.
INPUTS = (
    "Cargo.toml",
    "Cargo.lock",
    "crates/qrcode-ai-scanner/Cargo.toml",
    "crates/qrcode-ai-scanner/src",
    "crates/qrcode-ai-scanner-wasm/Cargo.toml",
    "crates/qrcode-ai-scanner-wasm/src",
    "scripts/build-wasm.sh",
)
# The agreed browser floor's features. Anything else the module needs
# (SIMD, threads, tail calls, exceptions, GC, memory64, ...) is outside it.
FLOOR = frozenset({
    "mutable-globals", "multivalue", "bulk-memory", "sign-ext", "nontrapping-fptoint", "reference-types",
})


# ------------------------------------------------------------------ inputs


def input_files(root: pathlib.Path = ROOT) -> list:
    """Every regular file of the compiled inputs, as sorted posix paths.

    A symbolic link or a missing input is an error: the digest must describe
    the bytes cargo actually reads, not a link target that can move."""
    found = []
    for entry in INPUTS:
        path = root / entry
        if path.is_symlink():
            raise ValueError(f"compiled input is a symbolic link: {entry}")
        if path.is_file():
            found.append(entry)
        elif path.is_dir():
            for child in sorted(path.rglob("*")):
                if child.is_symlink():
                    raise ValueError(f"compiled input is a symbolic link: {child.relative_to(root).as_posix()}")
                if child.is_file():
                    found.append(child.relative_to(root).as_posix())
        else:
            raise ValueError(f"compiled input missing: {entry}")
    return sorted(set(found))


def inputs_digest(root: pathlib.Path = ROOT) -> dict:
    files = input_files(root)
    listing = "".join(f"{hashlib.sha256((root / name).read_bytes()).hexdigest()}  {name}\n" for name in files)
    return {"sha256": hashlib.sha256(listing.encode()).hexdigest(), "files": len(files),
            "roots": list(INPUTS)}


# ---------------------------------------------------------------- envelope


class Incomplete(Exception):
    """The decoder met bytes it does not know: no envelope claim follows."""


class Reader:
    def __init__(self, data: bytes, at: int = 0, end=None):
        self.data, self.at = data, at
        self.end = len(data) if end is None else end
        if self.end > len(data):
            raise Incomplete(f"a section or body ends past the module ({self.end} > {len(data)})")

    def byte(self) -> int:
        if self.at >= self.end:
            raise Incomplete(f"truncated at {self.at}")
        value = self.data[self.at]
        self.at += 1
        return value

    def take(self, count: int) -> bytes:
        if self.at + count > self.end:
            raise Incomplete(f"truncated at {self.at}")
        chunk = self.data[self.at:self.at + count]
        self.at += count
        return chunk

    def uleb(self) -> int:
        value = shift = 0
        for _ in range(10):
            b = self.byte()
            value |= (b & 0x7F) << shift
            shift += 7
            if b < 0x80:
                return value
        raise Incomplete(f"overlong LEB at {self.at}")

    def sleb(self, bits: int) -> int:
        value = shift = 0
        for _ in range((bits + 6) // 7):
            b = self.byte()
            value |= (b & 0x7F) << shift
            shift += 7
            if b < 0x80:
                if b & 0x40:
                    value -= 1 << shift
                return value
        raise Incomplete(f"overlong signed LEB at {self.at}")

    def name(self) -> str:
        return self.take(self.uleb()).decode("utf-8", errors="replace")


NUMERIC = {0x7F, 0x7E, 0x7D, 0x7C}
V128, FUNCREF, EXTERNREF = 0x7B, 0x70, 0x6F


def valtype(r: Reader, used: set) -> int:
    t = r.byte()
    if t in NUMERIC:
        return t
    if t == V128:
        used.add("simd128")
        return t
    if t in (FUNCREF, EXTERNREF):
        used.add("reference-types")
        return t
    raise Incomplete(f"value type 0x{t:02x}")


def table_reftype(r: Reader, used: set) -> None:
    """A table's element type: funcref tables are MVP; externref needs reference-types."""
    t = r.byte()
    if t == EXTERNREF:
        used.add("reference-types")
    elif t != FUNCREF:
        raise Incomplete(f"table element type 0x{t:02x}")


def limits(r: Reader, used: set) -> None:
    flags = r.uleb()
    if flags & ~0x07:
        raise Incomplete(f"limits flags 0x{flags:x}")
    if flags & 0x02:
        used.add("threads")
    if flags & 0x04:
        used.add("memory64")
    r.uleb()
    if flags & 0x01:
        r.uleb()


def const_expr(r: Reader, used: set) -> None:
    """A constant expression: MVP allows one const/global.get then end."""
    count = 0
    while True:
        op = r.byte()
        if op == 0x0B:
            break
        count += 1
        if op == 0x41:
            r.sleb(32)
        elif op == 0x42:
            r.sleb(64)
        elif op == 0x43:
            r.take(4)
        elif op == 0x44:
            r.take(8)
        elif op == 0x23:
            r.uleb()
        elif op == 0xD0:
            used.add("reference-types")
            r.sleb(33)
        elif op == 0xD2:
            used.add("reference-types")
            r.uleb()
        elif op in (0x6A, 0x6B, 0x6C, 0x7C, 0x7D, 0x7E):
            used.add("extended-const")
        elif op == 0xFD:
            used.add("simd128")
            if r.uleb() != 12:
                raise Incomplete("SIMD constant expression")
            r.take(16)
        else:
            raise Incomplete(f"constant expression opcode 0x{op:02x}")
    if count > 1:
        used.add("extended-const")


def memarg(r: Reader, used: set) -> None:
    align = r.uleb()
    if align & 0x40:
        used.add("multi-memory")
        r.uleb()
    r.uleb()


def memidx(r: Reader, used: set) -> None:
    if r.uleb() != 0:
        used.add("multi-memory")


def blocktype(r: Reader, used: set, types: list) -> None:
    first = r.data[r.at] if r.at < r.end else None
    if first == 0x40:
        r.byte()
    elif first is not None and first in NUMERIC | {V128, FUNCREF, EXTERNREF}:
        valtype(r, used)
    else:
        index = r.sleb(33)
        if index < 0 or index >= len(types):
            raise Incomplete(f"block type {index}")
        used.add("multivalue")


NO_IMMEDIATE = {0x00, 0x01, 0x05, 0x0B, 0x0F, 0x1A, 0x1B} | set(range(0x45, 0xC0))
SIGN_EXT = set(range(0xC0, 0xC5))


def scan_body(r: Reader, used: set, types: list) -> None:
    """Decode one function body's instructions; record the features they need."""
    for _ in range(r.uleb()):
        r.uleb()
        valtype(r, used)
    depth = 0
    while r.at < r.end:
        op = r.byte()
        if op == 0x0B:
            if depth == 0:
                if r.at != r.end:
                    raise Incomplete(f"bytes after the function's end at {r.at}")
                return
            depth -= 1
            continue
        if op in NO_IMMEDIATE:
            continue
        if op in SIGN_EXT:
            used.add("sign-ext")
        elif op in (0x02, 0x03, 0x04):
            blocktype(r, used, types)
            depth += 1
        elif op in (0x0C, 0x0D, 0x20, 0x21, 0x22, 0x23, 0x24, 0x10):
            r.uleb()
        elif op == 0x0E:
            for _ in range(r.uleb() + 1):
                r.uleb()
        elif op == 0x11:
            r.uleb()
            start = r.at
            if r.uleb() != 0 or r.at - start != 1:
                # A non-zero table, or table 0 as an overlong LEB, needs the
                # reference-types decoder (LLVM's call-indirect-overlong).
                used.add("reference-types")
        elif op in (0x12, 0x13):
            used.add("tail-call")
            r.uleb()
            if op == 0x13:
                r.uleb()
        elif op == 0x1C:
            used.add("reference-types")
            for _ in range(r.uleb()):
                valtype(r, used)
        elif op in (0x25, 0x26):
            used.add("reference-types")
            r.uleb()
        elif 0x28 <= op <= 0x3E:
            memarg(r, used)
        elif op in (0x3F, 0x40):
            memidx(r, used)
        elif op == 0x41:
            r.sleb(32)
        elif op == 0x42:
            r.sleb(64)
        elif op == 0x43:
            r.take(4)
        elif op == 0x44:
            r.take(8)
        elif op == 0xD0:
            used.add("reference-types")
            r.sleb(33)
        elif op == 0xD1:
            used.add("reference-types")
        elif op == 0xD2:
            used.add("reference-types")
            r.uleb()
        elif op == 0xFC:
            sub = r.uleb()
            if sub <= 7:
                used.add("nontrapping-fptoint")
            elif sub == 8:
                used.add("bulk-memory")
                r.uleb()
                memidx(r, used)
            elif sub == 9:
                used.add("bulk-memory")
                r.uleb()
            elif sub == 10:
                used.add("bulk-memory")
                memidx(r, used)
                memidx(r, used)
            elif sub == 11:
                used.add("bulk-memory")
                memidx(r, used)
            elif sub in (12, 14):
                used.add("bulk-memory")
                r.uleb()
                r.uleb()
            elif sub == 13:
                used.add("bulk-memory")
                r.uleb()
            elif sub in (15, 16, 17):
                used.add("reference-types")
                r.uleb()
            else:
                raise Incomplete(f"0xFC {sub}")
        elif op == 0xFD:
            # SIMD alone already leaves the floor; its immediates are not
            # decoded, so the rest of this body is skipped, not guessed.
            used.add("simd128")
            r.at = r.end
            return
        elif op == 0xFE:
            used.add("threads")
            r.at = r.end
            return
        elif op in (0x06, 0x07, 0x08, 0x09, 0x0A, 0x18, 0x19, 0x1F):
            used.add("exception-handling")
            raise Incomplete(f"exception-handling opcode 0x{op:02x}")
        elif op in (0x14, 0x15, 0xD3, 0xD4, 0xD5, 0xD6, 0xFB):
            used.add("gc-or-function-references")
            raise Incomplete(f"typed-reference opcode 0x{op:02x}")
        else:
            raise Incomplete(f"opcode 0x{op:02x}")
    raise Incomplete("function body without end")


def envelope(data: bytes) -> dict:
    """The features this module needs, read from its sections and code."""
    if data[:8] != b"\0asm\x01\0\0\0":
        raise Incomplete("not a version-1 WASM module")
    used, types, globals_mut, skipped = set(), [], [], 0
    r = Reader(data, 8)
    while r.at < len(data):
        section = r.byte()
        size = r.uleb()
        body = Reader(data, r.at, r.at + size)
        r.at += size
        if section == 1:
            for _ in range(body.uleb()):
                form = body.byte()
                if form != 0x60:
                    raise Incomplete(f"type form 0x{form:02x}")
                params = [valtype(body, used) for _ in range(body.uleb())]
                results = [valtype(body, used) for _ in range(body.uleb())]
                if len(results) > 1:
                    used.add("multivalue")
                types.append((params, results))
        elif section == 2:
            for _ in range(body.uleb()):
                body.name()
                body.name()
                kind = body.byte()
                if kind == 0:
                    body.uleb()
                elif kind == 1:
                    table_reftype(body, used)
                    limits(body, used)
                elif kind == 2:
                    limits(body, used)
                elif kind == 3:
                    valtype(body, used)
                    mutable = body.byte()
                    if mutable:
                        used.add("mutable-globals")
                    globals_mut.append(bool(mutable))
                elif kind == 4:
                    used.add("exception-handling")
                    body.byte()
                    body.uleb()
                else:
                    raise Incomplete(f"import kind {kind}")
        elif section == 4:
            count = body.uleb()
            if count > 1:
                used.add("reference-types")
            for _ in range(count):
                table_reftype(body, used)
                limits(body, used)
        elif section == 5:
            count = body.uleb()
            if count > 1:
                used.add("multi-memory")
            for _ in range(count):
                limits(body, used)
        elif section == 6:
            for _ in range(body.uleb()):
                valtype(body, used)
                globals_mut.append(bool(body.byte()))
                const_expr(body, used)
        elif section == 7:
            for _ in range(body.uleb()):
                body.name()
                kind = body.byte()
                index = body.uleb()
                if kind == 3 and index < len(globals_mut) and globals_mut[index]:
                    used.add("mutable-globals")
        elif section == 9:
            for _ in range(body.uleb()):
                flags = body.uleb()
                if flags > 7:
                    raise Incomplete(f"element flags {flags}")
                if flags & 0x01:
                    used.add("bulk-memory")
                if flags & 0x02 and not flags & 0x01:
                    body.uleb()
                if flags in (2, 6):
                    used.add("reference-types")
                if not flags & 0x01:
                    const_expr(body, used)
                if flags & 0x03:
                    if flags & 0x04:
                        valtype(body, used)
                    elif body.byte() != 0x00:
                        raise Incomplete("element kind")
                for _ in range(body.uleb()):
                    if flags & 0x04:
                        used.add("reference-types")
                        const_expr(body, used)
                    else:
                        body.uleb()
        elif section == 10:
            for _ in range(body.uleb()):
                length = body.uleb()
                fn = Reader(data, body.at, body.at + length)
                body.at += length
                scan_body(fn, used, types)
                if "simd128" in used or "threads" in used:
                    skipped += 0 if fn.at == fn.end else 1
        elif section == 11:
            for _ in range(body.uleb()):
                flags = body.uleb()
                if flags == 1:
                    used.add("bulk-memory")
                elif flags == 2:
                    used.add("multi-memory")
                    body.uleb()
                elif flags != 0:
                    raise Incomplete(f"data flags {flags}")
                if flags != 1:
                    const_expr(body, used)
                body.take(body.uleb())
        elif section == 12:
            used.add("bulk-memory")
        elif section == 13:
            used.add("exception-handling")
        elif section in (0, 3, 8):
            pass
        else:
            raise Incomplete(f"section {section}")
    return {"features": sorted(used), "outside_floor": sorted(used - FLOOR)}


# -------------------------------------------------------------- build-info


def tool_version(cmd: list) -> str:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as error:
        return f"unavailable: {error.__class__.__name__}"
    return proc.stdout.strip() if proc.returncode == 0 else f"unavailable: exit {proc.returncode}"


def locked_version(crate: str, root: pathlib.Path = ROOT):
    lock = (root / "Cargo.lock").read_text()
    found = re.findall(rf'\[\[package\]\]\nname = "{re.escape(crate)}"\nversion = "([^"]+)"', lock)
    return found[0] if len(found) == 1 else None


def source_revision(root: pathlib.Path = ROOT):
    head = tool_version(["git", "-C", str(root), "rev-parse", "HEAD"])
    if head.startswith("unavailable"):
        return None, None
    status = tool_version(["git", "-C", str(root), "status", "--porcelain", "--untracked-files=no", "--", *INPUTS])
    return head, (None if status.startswith("unavailable") else bool(status))


def write(pkg: pathlib.Path, rustflags: str, wasm_opt_flags: str, inputs_before: str, built_after: int,
          root: pathlib.Path = ROOT) -> dict:
    """Record a build the caller has just produced; refuse anything else.

    `inputs_before` is the digest taken before the compiler ran: if the inputs
    changed meanwhile, the bytes describe neither state. `built_after` is the
    build's start (epoch seconds): an older module is not this build's output,
    so no fresh record can be written beside it."""
    wasm_path = pkg / WASM_NAME
    if int(wasm_path.stat().st_mtime) < built_after:
        raise SystemExit(f"error: {WASM_NAME} predates this build (mtime < {built_after}): refusing to record it")
    digest = inputs_digest(root)
    if digest["sha256"] != inputs_before:
        raise SystemExit("error: compiled inputs changed while the module was being built: rebuild")
    wasm = wasm_path.read_bytes()
    found = envelope(wasm)
    if found["outside_floor"]:
        raise SystemExit(f"error: {WASM_NAME} needs features outside the floor: {found['outside_floor']}")
    manifest = json.loads((pkg / "package.json").read_text())
    revision, dirty = source_revision(root)
    info = {
        "schema": SCHEMA,
        "package": manifest.get("name"),
        "version": manifest.get("version"),
        "source_revision": revision,
        "compiled_inputs_modified_from_revision": dirty,
        "inputs": digest,
        "toolchain": {
            "rustc": tool_version(["rustc", "-vV"]),
            "cargo": tool_version(["cargo", "-V"]),
            "wasm_pack": tool_version(["wasm-pack", "--version"]),
            "wasm_bindgen": locked_version("wasm-bindgen", root),
            "wasm_opt": tool_version(["wasm-opt", "--version"]),
        },
        "settings": {
            "target": "wasm32-unknown-unknown",
            "profile": "release",
            "rustflags": rustflags,
            "wasm_opt": wasm_opt_flags,
        },
        "wasm": {"path": WASM_NAME, "bytes": len(wasm), "sha256": hashlib.sha256(wasm).hexdigest(),
                 "features": found["features"]},
    }
    (pkg / "build-info.json").write_text(json.dumps(info, indent=2) + "\n")
    return info


def check(info: dict, wasm: bytes, version, root: pathlib.Path = ROOT) -> list:
    """Every reason these bytes are not the recorded, current build."""
    problems = []
    if info.get("schema") != SCHEMA:
        problems.append(f"build-info schema {info.get('schema')!r} (expected {SCHEMA})")
    if version is not None and info.get("version") != version:
        problems.append(f"build-info version {info.get('version')!r} differs from the package {version!r}")
    recorded = (info.get("wasm") or {}).get("sha256")
    actual = hashlib.sha256(wasm).hexdigest()
    if recorded != actual:
        problems.append(f"modified WASM: bytes sha256 {actual} differ from the recorded {recorded}")
    try:
        current = inputs_digest(root)
    except ValueError as error:
        problems.append(str(error))
    else:
        if (info.get("inputs") or {}).get("sha256") != current["sha256"]:
            problems.append("stale build: compiled inputs changed since this WASM was built "
                            f"(recorded {(info.get('inputs') or {}).get('sha256')}, now {current['sha256']})")
    try:
        found = envelope(wasm)
    except Incomplete as error:
        problems.append(f"feature envelope incomplete: {error}")
    else:
        if found["outside_floor"]:
            problems.append(f"features outside the floor: {', '.join(found['outside_floor'])}")
        if found["features"] != (info.get("wasm") or {}).get("features"):
            problems.append(f"feature envelope {found['features']} differs from the recorded "
                            f"{(info.get('wasm') or {}).get('features')}")
    return problems


def verify(pkg: pathlib.Path, root: pathlib.Path = ROOT) -> list:
    try:
        info = json.loads((pkg / "build-info.json").read_text())
    except (OSError, ValueError) as error:
        return [f"build-info.json unreadable: {error}"]
    version = json.loads((pkg / "package.json").read_text()).get("version")
    return check(info, (pkg / WASM_NAME).read_bytes(), version, root)


# --------------------------------------------------------------- self-test


def _module(*sections) -> bytes:
    def uleb(n):
        out = bytearray()
        while True:
            b = n & 0x7F
            n >>= 7
            out.append(b | (0x80 if n else 0))
            if not n:
                return bytes(out)
    return b"\0asm\x01\0\0\0" + b"".join(bytes([sid]) + uleb(len(payload)) + payload for sid, payload in sections)


def self_test() -> int:
    import tempfile
    failures = []

    def expect(label, ok):
        if not ok:
            failures.append(label)

    # The loader's two probes (auto.js): the SIMD probe needs SIMD; the
    # baseline probe needs exactly the floor's six features.
    auto = (ROOT / "crates/qrcode-ai-scanner-wasm/auto.js").read_text()
    probes = {name: bytes(json.loads(f"[{body}]")) for name, body in
              re.findall(r"const (\w+_PROBE) = new Uint8Array\(\[([0-9,]+)\]\)", auto)}
    expect("SIMD probe needs simd128", "simd128" in envelope(probes["SIMD_PROBE"])["features"])
    expect("baseline probe needs exactly the floor",
           set(envelope(probes["BASELINE_PROBE"])["features"]) == FLOOR)
    # An MVP module (one function returning i32.const 42) needs nothing.
    mvp = _module((1, b"\x01\x60\x00\x01\x7f"), (3, b"\x01\x00"), (10, b"\x01\x04\x00\x41\x2a\x0b"))
    expect("MVP module needs no feature", envelope(mvp)["features"] == [])
    # An MVP funcref table with call_indirect needs nothing; an externref table does.
    table = _module((1, b"\x01\x60\x00\x00"), (3, b"\x01\x00"), (4, b"\x01\x70\x00\x01"),
                    (10, b"\x01\x07\x00\x41\x00\x11\x00\x00\x0b"))
    expect("funcref table + call_indirect is MVP", envelope(table)["features"] == [])
    externref = _module((4, b"\x01\x6f\x00\x01"))
    expect("externref table needs reference-types", envelope(externref)["features"] == ["reference-types"])
    overlong = _module((1, b"\x01\x60\x00\x00"), (3, b"\x01\x00"), (4, b"\x01\x70\x00\x01"),
                       (10, b"\x01\x0b\x00\x41\x00\x11\x00\x80\x80\x80\x80\x00\x0b"))
    expect("an overlong call_indirect table index needs reference-types",
           envelope(overlong)["features"] == ["reference-types"])
    # Unknown opcodes and truncation fail closed.
    for label, code in (("unknown opcode", b"\x01\x03\x00\xff\x0b"), ("truncated body", b"\x01\x05\x00\x41")):
        bad = _module((1, b"\x01\x60\x00\x01\x7f"), (3, b"\x01\x00"), (10, code))
        try:
            envelope(bad)
            expect(f"{label} is incomplete", False)
        except Incomplete:
            pass
    # An immediate that looks like an opcode is not one: i32.const 0xFD.
    tricky = _module((1, b"\x01\x60\x00\x01\x7f"), (3, b"\x01\x00"), (10, b"\x01\x05\x00\x41\xfd\x00\x0b"))
    expect("an immediate byte is not a SIMD opcode", envelope(tricky)["features"] == [])
    # Stale build and modified bytes are refused; the recorded build passes.
    with tempfile.TemporaryDirectory() as scratch:
        root = pathlib.Path(scratch)
        for entry in INPUTS:
            path = root / entry
            if entry.endswith("/src"):
                (path / "nested").mkdir(parents=True)
                (path / "lib.rs").write_text("pub fn f() {}\n")
                (path / "nested" / "m.rs").write_text("// m\n")
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(f"# {entry}\n")
        info = {"schema": SCHEMA, "version": "1.2.3", "inputs": inputs_digest(root),
                "wasm": {"sha256": hashlib.sha256(mvp).hexdigest(), "features": []}}
        expect("recorded build verifies", check(info, mvp, "1.2.3", root) == [])
        expect("modified WASM refused", any("modified WASM" in p for p in check(info, mvp + b"\0", "1.2.3", root)))
        expect("other version refused", any("version" in p for p in check(info, mvp, "1.2.4", root)))
        (root / "crates/qrcode-ai-scanner/src/nested/m.rs").write_text("// m changed\n")
        expect("stale inputs refused", any("stale build" in p for p in check(info, mvp, "1.2.3", root)))
        (root / "crates/qrcode-ai-scanner/src/nested/m.rs").write_text("// m\n")
        expect("restored inputs verify again", check(info, mvp, "1.2.3", root) == [])
        (root / "crates/qrcode-ai-scanner-wasm/src/new.rs").write_text("// added\n")
        expect("an added input file is stale", any("stale build" in p for p in check(info, mvp, "1.2.3", root)))
    print(f"wasm_provenance self-test: {'ok' if not failures else 'FAILED: ' + '; '.join(failures)}")
    return 1 if failures else 0


def main(argv: list) -> int:
    if argv[:1] == ["--self-test"]:
        return self_test()
    if len(argv) >= 2 and argv[0] == "envelope":
        try:
            print(json.dumps(envelope(pathlib.Path(argv[1]).read_bytes())))
        except Incomplete as error:
            print(json.dumps({"incomplete": str(error)}))
            return 1
        return 0
    if len(argv) >= 2 and argv[0] == "verify":
        problems = verify(pathlib.Path(argv[1]))
        print(json.dumps({"ok": not problems, "problems": problems}, indent=2))
        return 1 if problems else 0
    if argv == ["digest"]:
        print(inputs_digest()["sha256"])
        return 0
    if (len(argv) == 10 and argv[0] == "write" and argv[2] == "--rustflags" and argv[4] == "--wasm-opt-flags"
            and argv[6] == "--inputs" and argv[8] == "--built-after"):
        info = write(pathlib.Path(argv[1]), argv[3], argv[5], argv[7], int(argv[9]))
        print(f"build-info: wasm sha256 {info['wasm']['sha256']} · inputs {info['inputs']['sha256'][:16]}… "
              f"({info['inputs']['files']} files) · features {', '.join(info['wasm']['features']) or 'none'}")
        return 0
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
