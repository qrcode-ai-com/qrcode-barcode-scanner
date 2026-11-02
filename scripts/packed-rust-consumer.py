#!/usr/bin/env python3
"""Exercise inspected Cargo archives outside the checkout before publication.

The CLI's unavailable registry core is substituted with its exact archive.
This is archive qualification, not a post-publish cargo install --locked proof.
Beyond the gen_v5_q.png control, the library (both graphs) and the installed
CLI run the shared truth set, fixtures/consumer-truth.json (consumer_truth.py).

The temporary consumer names its compiler explicitly: RUSTUP_TOOLCHAIN from
the caller, else the workflow variable RUST_TOOLCHAIN, else the one pin of
.github/workflows/ci.yml. A checkout's rustup directory override does not
follow a process into another directory, and cargo never reads RUST_TOOLCHAIN.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import struct
import tarfile
import tempfile
import tomllib
import zlib


def run(args, cwd, env):
    # Every text this consumer reads or writes is UTF-8, never the locale's
    # encoding: text=True decodes as cp1252 on Windows, turning 中文 into
    # mojibake before the judge sees it.
    print(json.dumps(args), flush=True)
    return subprocess.check_output(args, cwd=cwd, env=env, encoding="utf-8")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


ROOT = Path(__file__).resolve().parents[1]


def truth_module():
    spec = importlib.util.spec_from_file_location("consumer_truth", ROOT / "scripts/consumer_truth.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def toolchain(env):
    """(name, source): the compiler the temporary consumer must use."""
    if env.get("RUSTUP_TOOLCHAIN"):
        return env["RUSTUP_TOOLCHAIN"], "RUSTUP_TOOLCHAIN"
    if env.get("RUST_TOOLCHAIN"):
        return env["RUST_TOOLCHAIN"], "RUST_TOOLCHAIN"
    pins = set(re.findall(r'^\s*RUST_TOOLCHAIN:\s*"?([0-9][^"\s]*)"?\s*$',
                          (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8"), re.M))
    assert len(pins) == 1, f"ci.yml must pin one RUST_TOOLCHAIN, found {pins}"
    return pins.pop(), ".github/workflows/ci.yml"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archives", type=Path)
    parser.add_argument("fixture", type=Path)
    parser.add_argument("version")
    args = parser.parse_args()
    consumer = Path(tempfile.mkdtemp(prefix="qrscan-packed-rust-"))
    env = dict(os.environ)
    env["CARGO_TARGET_DIR"] = str(consumer / "target")
    env["RAYON_NUM_THREADS"] = "1"
    selected, selected_from = toolchain(env)
    env["RUSTUP_TOOLCHAIN"] = selected
    compiler = {"rustup_toolchain": selected, "selected_from": selected_from,
                "rustc": run(["rustc", "-vV"], consumer, env).strip().splitlines(),
                "cargo": run(["cargo", "-V"], consumer, env).strip()}
    release = next(line.split(": ", 1)[1] for line in compiler["rustc"] if line.startswith("release: "))
    if re.fullmatch(r"\d+\.\d+\.\d+", selected):
        assert release == selected, f"the consumer compiles with rustc {release}, not {selected}"
    archives = {}
    for name in ("qrcode-ai-scanner", "qrcode-ai-scanner-cli"):
        file = (args.archives / f"{name}-{args.version}.crate").resolve()
        archives[name] = {"path": str(file), "sha256": sha(file)}
        with tarfile.open(file) as archive:
            archive.extractall(consumer, filter="data")
    core = consumer / f"qrcode-ai-scanner-{args.version}"
    cli = consumer / f"qrcode-ai-scanner-cli-{args.version}"
    for root in (core, cli):
        package = tomllib.loads((root / "Cargo.toml").read_text(encoding="utf-8"))["package"]
        assert package["version"] == args.version
    fixture = consumer / "fixture.png"
    shutil.copyfile(args.fixture.resolve(), fixture)
    truth_lib = truth_module()
    truth = truth_lib.load()
    staged = truth_lib.stage(truth, consumer / "truth")
    versions = {"scanner": args.version, "pipeline": 5, "score_contract": 5}
    problems, identities = [], {}

    def judged(label, case, report):
        problems.extend(f"{label}: {problem}" for problem in truth_lib.judge(case, report, versions))
        identities.setdefault(case["id"], {})[label] = truth_lib.identity(report)
    app = consumer / "application"
    (app / "src").mkdir(parents=True)
    (app / "Cargo.toml").write_text(
        '[package]\nname = "packed-scanner-consumer"\nversion = "0.0.0"\nedition = "2024"\n'
        'rust-version = "1.88"\n[dependencies]\nqrcode-ai-scanner = { path = '
        + json.dumps(str(core)) + ', features = ["serde"] }\nserde_json = "1"\n'
        '[profile.release.package.rxing]\noverflow-checks = true\n', encoding="utf-8")
    (app / "src/main.rs").write_text('''use qrcode_ai_scanner::{ImageInput, ScanProfile, Scanner};
fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut config = ScanProfile::Full.config();
    config.budget_ms = None;
    let scanner = Scanner::builder().profile(ScanProfile::Custom(config)).build();
    if args[0] == "--truth" {
        // one JSON line per input: the report, or the error's code
        for path in &args[1..] {
            let data = std::fs::read(path).unwrap();
            match scanner.scan(ImageInput::encoded(&data)) {
                Ok(report) => println!("{}", serde_json::to_string(&report).unwrap()),
                Err(error) => println!("{}", serde_json::json!({ "error": error.code() })),
            }
        }
        return;
    }
    let data = std::fs::read(&args[0]).unwrap();
    let report = scanner.scan(ImageInput::encoded(&data)).unwrap();
    assert_eq!(report.detections.len(), 1);
    assert_eq!(report.detections[0].content.text, "https://qrcode-ai.com/c/v5q");
    assert_eq!(report.score.as_ref().unwrap().value, 100);
    assert_eq!(report.trace.budget_exhausted, Some(false));
}
''', encoding="utf-8")
    shutil.copyfile(core / "Cargo.lock", app / "Cargo.lock")
    original_core_lock = sha(core / "Cargo.lock")
    registry_before = {
        (p["name"], p["version"], p["source"]): p.get("checksum")
        for p in tomllib.loads((core / "Cargo.lock").read_text(encoding="utf-8"))["package"] if "source" in p
    }
    graphs = {}
    # Cargo adds this consumer root to the packaged graph; no registry package
    # is replaced by checkout source. The second graph intentionally re-resolves.
    run(["cargo", "metadata", "--format-version", "1"], app, env)
    registry_after = {
        (p["name"], p["version"], p["source"]): p.get("checksum")
        for p in tomllib.loads((app / "Cargo.lock").read_text(encoding="utf-8"))["package"] if "source" in p
    }
    # Cargo may prune the package's development-only dependencies. Every
    # retained registry dependency must be the same pinned, checksummed one.
    assert all(key in registry_before and checksum == registry_before[key]
               for key, checksum in registry_after.items()), "packaged dependency graph drifted"
    graphs["packaged"] = sha(app / "Cargo.lock")

    def library(label):
        run(["cargo", "run", "--release", "--locked", "--", str(fixture)], app, env)
        lines = run(["cargo", "run", "--release", "--locked", "--", "--truth", *(str(path) for _, path in staged)],
                    app, env).splitlines()
        assert len(lines) == len(staged), (label, len(lines))
        for (case, _), line in zip(staged, lines):
            result = json.loads(line)
            if "error" in case or "error" in result:
                if result != {"error": case.get("error")}:
                    problems.append(f"{label}: {case['id']}: {result.get('error', 'a report')}")
                continue
            judged(label, case, result)

    library("library-packaged")
    (app / "Cargo.lock").unlink()
    run(["cargo", "generate-lockfile"], app, env)
    graphs["latest-compatible"] = sha(app / "Cargo.lock")
    library("library-latest-compatible")
    # The normalized CLI pins a core not yet live. Modify only this extracted
    # scratch copy; retain both original archive/lock hashes in the receipt.
    cli_lock = sha(cli / "Cargo.lock")
    patch = 'patch.crates-io.qrcode-ai-scanner.path=' + json.dumps(str(core))
    run(["cargo", "metadata", "--format-version", "1", "--config", patch], cli, env)
    run(["cargo", "install", "--path", str(cli), "--locked", "--root", str(consumer / "installed"),
         "--config", patch], consumer, env)
    binary = consumer / "installed/bin" / ("qrscan.exe" if os.name == "nt" else "qrscan")
    version = run([str(binary), "--version"], consumer, env).strip()
    assert version == f"qrscan {args.version}", version
    command = [str(binary), str(fixture), "--profile", "full", "--budget-ms", "0"]
    report = json.loads(run(command, consumer, env))
    text = "https://qrcode-ai.com/c/v5q"
    assert report["versions"] == {"scanner": args.version, "pipeline": 5, "score_contract": 5}
    assert [d["content"] for d in report["detections"]] == [
        {"text": text, "raw": base64.b64encode(text.encode()).decode(), "charset": "utf8"}]
    assert report["score"]["value"] == 100 and report["trace"]["budget_exhausted"] is False
    assert run(command + ["--score-only"], consumer, env).strip() == "100"
    frame = json.loads(run([str(binary), str(fixture), "--profile", "frame", "--budget-ms", "0"], consumer, env))
    assert frame["score"] is None and [d["content"]["text"] for d in frame["detections"]] == [text]
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    white = consumer / "white.png"
    white.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 64, 64, 8, 2, 0, 0, 0))
                      + chunk(b"IDAT", zlib.compress((b"\0" + b"\xff" * 192) * 64)) + chunk(b"IEND", b""))
    empty = subprocess.run([str(binary), str(white), "--profile", "full", "--budget-ms", "0"],
                           cwd=consumer, env=env, capture_output=True, encoding="utf-8")
    empty_report = json.loads(empty.stdout)
    assert empty.returncode == 1 and empty_report["detections"] == [] and empty_report["score"] is None
    assert empty_report["trace"]["budget_exhausted"] is False
    invalid = consumer / "invalid.png"
    invalid.write_bytes(b"not an image")
    result = subprocess.run([str(binary), str(invalid)], cwd=consumer, env=env, capture_output=True, encoding="utf-8")
    assert result.returncode == 2 and "[QRS-001]" in result.stderr and not result.stdout
    scan = truth["scan"]
    for case, path in staged:
        result = subprocess.run([str(binary), str(path), "--profile", scan["profile"], "--budget-ms",
                                 str(scan["budget_ms"])], cwd=consumer, env=env, capture_output=True, encoding="utf-8")
        if "error" in case:
            if not (result.returncode == 2 and f"[{case['error']}]" in result.stderr and not result.stdout):
                problems.append(f"cli: {case['id']}: exit {result.returncode}, stderr {result.stderr[-160:]!r}")
            continue
        # exit 0 with a symbol, 1 for a valid empty result (spec/03-errors.md)
        if result.returncode != (0 if case["contents"] else 1):
            problems.append(f"cli: {case['id']}: exit {result.returncode}")
        judged("cli", case, json.loads(result.stdout))
    assert not problems, "\n".join(problems)
    # one core, one configuration: the library in both graphs and the CLI agree
    disagree = [case for case, seen in identities.items() if len({json.dumps(v) for v in seen.values()}) != 1]
    assert not disagree, disagree
    agreed = {case: next(iter(seen.values())) for case, seen in identities.items()}
    receipt = {"verdict": "PASS", "version": args.version, "consumer": str(consumer),
               "archives": archives, "fixture_sha256": sha(fixture), "core_graphs": graphs,
               "core_original_lock_sha256": original_core_lock,
               "core_registry_packages_preserved": len(registry_after),
               "core_profile": "release, caller explicitly enables rxing overflow checks",
               "cli_original_lock_sha256": cli_lock, "cli_substituted_lock_sha256": sha(cli / "Cargo.lock"),
               "cli_sha256": sha(binary), "cli_registry_install": False, "compiler": compiler,
               "truth": {"file": str(truth_lib.TRUTH.relative_to(ROOT)), "sha256": sha(truth_lib.TRUTH),
                         "cases": len(staged), "judged": ["library-packaged", "library-latest-compatible", "cli"],
                         "identities_sha256": truth_lib.identities_digest(agreed)},
               "qualification": "exact archives with local core substitution; registry replay required"}
    receipt_path = consumer / "receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    if "GITHUB_OUTPUT" in env:
        with open(env["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
            output.write(f"receipt={receipt_path}\n")
    print(json.dumps(receipt))


if __name__ == "__main__":
    main()
