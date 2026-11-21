#!/usr/bin/env python3
"""Run the Wasmer package of qrscan on the shared truth set, as a user of `wasmer run` would.

  consume.py --qrscan COMMAND [--native QRSCAN] --version X.Y.Z --receipt FILE
  consume.py --self-test

COMMAND runs the module like an installed qrscan (distribution/wasmer/qrscan-in-wasmer.sh: it
maps the image's directory into the guest). Every case of fixtures/consumer-truth.json is staged
outside the checkout and scanned with `--profile full --budget-ms 0`, then judged by
scripts/consumer_truth.py: exact contents, primary detection, geometry and score, an unbudgeted
and unsaturated trace, trace.engine_panics 0 and the engine version given. A case with no code
must exit 1 with an empty report, the bytes that are not an image exit 2 with the error code of
the truth on stderr, every other case exits 0.

With --native (the qrscan 0.11.0 release binary of the runner) every case runs there too, and
both must give the same exit code and the same identity for each case: the same symbologies,
contents and occurrence kinds (consumer_truth.identity). Scores and coordinates can differ in
their last digits between a native and a WebAssembly build of the same source, so they are judged
against the truth, not against each other; the receipt records where they differ.

The receipt (qrscan-wasmer-truth/1) records each case, the identities digest and the verdict.
Exit 0 when every case passes, 1 when one fails, 2 for usage or a missing input. Stdlib only.
"""
import argparse
import importlib.util
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
SCHEMA = "qrscan-wasmer-truth/1"
TIMEOUT = 300
ARGS = ("--profile", "full", "--budget-ms", "0")


def truth_lib():
    spec = importlib.util.spec_from_file_location("consumer_truth", ROOT / "scripts/consumer_truth.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def expected_exit(case):
    if "error" in case:
        return 2
    return 1 if not case["contents"] else 0


def run(command, path):
    try:
        done = subprocess.run([command, str(path), *ARGS], capture_output=True, text=True, timeout=TIMEOUT)
    except (OSError, subprocess.TimeoutExpired) as error:
        return None, "", f"did not run ({type(error).__name__}: {error})"
    return done.returncode, done.stdout, done.stderr


def judge_case(lib, case, code, out, err, version):
    """(problems, report or None) of one case's run."""
    problems = []
    want = expected_exit(case)
    if code != want:
        problems.append(f"exit {code}, expected {want}; stderr {err[-300:]!r}")
    if "error" in case:
        pattern = re.compile(r"✖ [^\n]+ \[" + re.escape(case["error"]) + r"\]\n")
        if not pattern.search(err):
            problems.append(f"stderr {err[-300:]!r} does not end with the error [{case['error']}]")
        return problems, None
    try:
        report = json.loads(out)
    except ValueError:
        return problems + [f"stdout is not one JSON report: {out[:200]!r}"], None
    versions = report.get("versions") if isinstance(report, dict) else None
    if not isinstance(versions, dict) or versions.get("scanner") != version:
        problems.append(f"versions {versions!r}: the scanner is not {version}")
        versions = versions if isinstance(versions, dict) else {}
    try:
        problems += list(lib.judge(case, report, versions))
    except (KeyError, TypeError, IndexError, AttributeError, ValueError) as error:
        problems.append(f"malformed report ({type(error).__name__}: {error})")
    panics = report.get("trace", {}).get("engine_panics")
    if panics != 0:
        problems.append(f"trace.engine_panics is {panics!r}")
    return problems, report


def differing(left, right, path=""):
    """Paths where two reports differ, timing fields excluded."""
    if isinstance(left, dict) and isinstance(right, dict):
        found = []
        for key in sorted(set(left) | set(right)):
            if key == "total_ms" or key.endswith("_ms") or key == "ms":
                continue
            found += differing(left.get(key), right.get(key), f"{path}.{key}")
        return found
    if isinstance(left, list) and isinstance(right, list) and len(left) == len(right):
        return [p for i, (a, b) in enumerate(zip(left, right)) for p in differing(a, b, f"{path}[{i}]")]
    return [] if left == right else [path or "."]


def consume(command, native, version, receipt_path, lib=None):
    lib = lib or truth_lib()
    truth = lib.load()
    rows, identities, problems = [], {}, []
    with tempfile.TemporaryDirectory(prefix="qrscan-wasmer-truth-") as box:
        staged = lib.stage(truth, box)
        for case, path in staged:
            code, out, err = run(command, path)
            found, report = judge_case(lib, case, code, out, err, version)
            row = {"id": case["id"], "exit": code, "problems": found}
            if report is not None:
                row["detections"] = [[d["symbology"], d["content"]["text"]] for d in report["detections"]]
                identities[case["id"]] = lib.identity(report)
            if native:
                n_code, n_out, n_err = run(native, path)
                row["native_exit"] = n_code
                if n_code != code:
                    found.append(f"native qrscan exits {n_code}, the module {code}")
                if report is not None:
                    try:
                        native_report = json.loads(n_out)
                    except ValueError:
                        found.append("native qrscan printed no JSON report")
                    else:
                        if lib.identity(native_report) != lib.identity(report):
                            found.append("the native report holds other detections")
                        row["differs_from_native"] = differing(report, native_report)[:20]
            rows.append(row)
            problems += [f"{case['id']}: {problem}" for problem in found]
    receipt = {"schema": SCHEMA, "command": command, "native": native, "version": version,
               "arguments": list(ARGS), "cases": rows, "identities_sha256": lib.identities_digest(identities),
               "verdict": "FAIL" if problems else "PASS", "problems": problems}
    text = json.dumps(receipt, indent=2, ensure_ascii=False) + "\n"
    pathlib.Path(receipt_path).write_text(text, encoding="utf-8")
    print(f"{receipt['verdict']}  {len(rows)} truth cases through {command}"
          + (f", compared with {native}" if native else "") + f"; identities {receipt['identities_sha256']}")
    for problem in problems:
        print(f"  {problem}", file=sys.stderr)
    return 0 if not problems else 1


def self_test():
    """A stand-in qrscan that answers from the truth itself passes; one that drops a code fails."""
    lib = truth_lib()
    truth = lib.load()
    failures = []
    with tempfile.TemporaryDirectory(prefix="qrscan-wasmer-self-test-") as box:
        box = pathlib.Path(box)
        table = {}
        for case, path in lib.stage(truth, box / "inputs"):
            digest = __import__("hashlib").sha256(path.read_bytes()).hexdigest()
            if "error" in case:
                table[digest] = {"exit": 2, "stderr": f"✖ not an image [{case['error']}]\n"}
            else:
                report = lib.conforming_report(case, {"scanner": "0.11.0", "pipeline": 5, "score_contract": 5})
                report["trace"]["engine_panics"] = 0
                table[digest] = {"exit": expected_exit(case), "report": report}
        (box / "table.json").write_text(json.dumps(table))
        for name, drop in (("good", False), ("dropping", True)):
            stub = box / f"qrscan-{name}"
            stub.write_text("#!/usr/bin/env python3\n"
                            "import hashlib, json, sys\n"
                            f"table = json.load(open({str(box / 'table.json')!r}))\n"
                            "row = table[hashlib.sha256(open(sys.argv[1], 'rb').read()).hexdigest()]\n"
                            "report = row.get('report')\n"
                            f"if report and {drop} and report['detections']:\n"
                            "    report['detections'] = report['detections'][1:]\n"
                            "print(json.dumps(report)) if report else sys.stderr.write(row['stderr'])\n"
                            "sys.exit(row['exit'])\n")
            stub.chmod(0o755)
        if consume(str(box / "qrscan-good"), str(box / "qrscan-good"), "0.11.0", box / "good.json", lib):
            failures.append("a conforming stand-in failed")
        if not consume(str(box / "qrscan-dropping"), None, "0.11.0", box / "bad.json", lib):
            failures.append("a stand-in that drops a code passed")
        if not consume(str(box / "qrscan-good"), None, "9.9.9", box / "version.json", lib):
            failures.append("another engine version passed")
        if not consume(str(box / "qrscan-good"), str(box / "qrscan-dropping"), "0.11.0", box / "native.json", lib):
            failures.append("a native binary with other detections passed")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (1 conforming stand-in, 3 refusals)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--qrscan")
    parser.add_argument("--native")
    parser.add_argument("--version")
    parser.add_argument("--receipt")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not (args.qrscan and args.version and args.receipt):
        parser.error("--qrscan, --version and --receipt are required")
    for command in filter(None, (args.qrscan, args.native)):
        if shutil.which(command) is None:
            print(f"consume.py: {command} is not a command", file=sys.stderr)
            return 2
    return consume(args.qrscan, args.native, args.version, args.receipt)


if __name__ == "__main__":
    sys.exit(main())
