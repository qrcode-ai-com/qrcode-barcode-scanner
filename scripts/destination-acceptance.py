#!/usr/bin/env python3
"""Judge one installed qrscan against the destination acceptance contract.

  destination-acceptance.py cli --qrscan COMMAND --destination NAME --version X.Y.Z --url URL
      [--identifier ID] [--install "COMMAND LINE"] [--run-url URL] [--fixtures DIR] --receipt FILE
  destination-acceptance.py removed --qrscan COMMAND --receipt FILE [--uninstall "COMMAND LINE"]
  destination-acceptance.py check FILE
  destination-acceptance.py --self-test

The contract is distribution/acceptance/README.md. `cli` runs the installed command on the mixed
fixture with the fast, frame and full profiles and no budget, and writes the receipt
(qrscan-destination-acceptance/1). Each report must hold the QR code and the Code 128, each once and
nothing else, uncut and with no engine panic; the full report must also meet the shared truth case
(scripts/consumer_truth.py: geometry, primary detection, score). `removed` is run after the route's
own uninstall: it records whether the command is gone and closes the verdict. `check` validates a
receipt's shape and that its verdict follows from its own content.

The driver installs nothing and removes nothing: the caller does both the way a user of that
destination would. COMMAND is a name looked up on PATH or a path to the executable. Stdlib only.
Exit 0 when the step passes, 1 when it fails, 2 for usage or a missing input.
"""
import argparse
import datetime
import hashlib
import importlib.util
import json
import os
import pathlib
import platform
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA = "qrscan-destination-acceptance/1"
SCHEMA_FILE = ROOT / "distribution/acceptance/receipt.schema.json"
CASE = "qr-and-code128"
PROFILES = ("fast", "frame", "full")
REMOVAL = ("pending", "removed", "still_present", "not_applicable")
TIMEOUT = 120


def truth_module():
    spec = importlib.util.spec_from_file_location("consumer_truth", ROOT / "scripts/consumer_truth.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def contract(fixtures):
    """The truth module, the mixed case and the checked fixture path."""
    truth = truth_module()
    case = next(case for case in truth.load()["cases"] if case["id"] == CASE)
    truth.case_bytes(case, fixtures)  # raises when the fixture is not the stated bytes
    return truth, case, pathlib.Path(fixtures) / case["file"]


def git_commit():
    done = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True)
    return done.stdout.strip() if done.returncode == 0 else None


def resolve(command):
    """The executable COMMAND names, or None: a path as given, a bare name through PATH."""
    if os.sep in command or (os.altsep and os.altsep in command):
        path = pathlib.Path(command)
        return str(path) if path.is_file() and os.access(path, os.X_OK) else None
    return shutil.which(command)


def scan(executable, image, profile, run=subprocess.run):
    """(exit code, parsed report or None, problem or None) of one unbudgeted scan."""
    try:
        done = run([executable, str(image), "--profile", profile, "--budget-ms", "0"],
                   capture_output=True, text=True, timeout=TIMEOUT)
    except (OSError, subprocess.TimeoutExpired) as error:
        return None, None, f"{profile}: the command did not run ({type(error).__name__}: {error})"
    try:
        report = json.loads(done.stdout)
    except ValueError:
        return done.returncode, None, f"{profile}: output is not one JSON report (exit {done.returncode})"
    return done.returncode, report, None


def judge_scan(truth, case, profile, code, report):
    """Every way one profile's report departs from the contract."""
    if report is None:
        return []
    problems = []
    if code != 0:
        problems.append(f"{profile}: exit {code}, a found code exits 0")
    trace = report.get("trace", {})
    if trace.get("budget_exhausted") is not False:
        problems.append(f"{profile}: the unbudgeted scan was cut")
    if trace.get("engine_panics") != 0:
        problems.append(f"{profile}: trace.engine_panics is {trace.get('engine_panics')!r}")
    detections = report.get("detections", [])
    for want in case["contents"]:
        content = truth.wire_content(want)
        count = sum(d.get("symbology") == want["symbology"] and d.get("content") == content for d in detections)
        if count != 1:
            problems.append(f"{profile}: {want['symbology']} {want['text']!r} found {count} times")
    if len(detections) != len(case["contents"]):
        seen = sorted((d.get("symbology"), d.get("content", {}).get("text")) for d in detections)
        problems.append(f"{profile}: {len(detections)} detections {seen}, the fixture holds {len(case['contents'])}")
    if profile == "full" and isinstance(report.get("versions"), dict):
        problems += [f"full: {problem}" for problem in truth.judge(case, report, report["versions"])]
    return problems


def verdict(receipt):
    """PASS, FAIL or INCOMPLETE, from the receipt's own scans and removal."""
    scanned = [row["profile"] for row in receipt["scans"]] == list(PROFILES)
    failed = receipt["problems"] or any(row["problems"] for row in receipt["scans"])
    state = receipt["removal"]["state"]
    if failed or not scanned or state == "still_present":
        return "FAIL"
    return "INCOMPLETE" if state == "pending" else "PASS"


def validate(receipt):
    """Every way RECEIPT departs from the format (empty: it is a receipt)."""
    problems = []

    def need(node, path, fields):
        if not isinstance(node, dict):
            problems.append(f"{path} is not an object")
            return False
        for key, kinds in fields.items():
            if key not in node:
                problems.append(f"{path}.{key} is missing")
            elif not isinstance(node[key], kinds) or isinstance(node[key], bool) and bool not in _tuple(kinds):
                problems.append(f"{path}.{key} has the wrong type")
        problems.extend(f"{path}.{key} is not a field of the format" for key in node if key not in fields)
        return True

    text, maybe_text = str, (str, type(None))
    if not need(receipt, "receipt", {
            "schema": text, "verdict": text, "checked_at": text, "destination": dict, "route": dict,
            "artifact": dict, "engine": (dict, type(None)), "contract": dict, "host": dict, "scans": list,
            "removal": dict, "run": dict, "problems": list}):
        return problems
    if receipt.get("schema") != SCHEMA:
        problems.append(f"receipt.schema is {receipt.get('schema')!r}, not {SCHEMA}")
    need(receipt.get("destination"), "destination", {"name": text})
    need(receipt.get("route"), "route", {"kind": text, "command": text, "install": maybe_text})
    need(receipt.get("artifact"), "artifact", {"identifier": maybe_text, "version": text, "url": text})
    need(receipt.get("contract"), "contract", {"commit": maybe_text, "case": text, "fixture_sha256": text,
                                               "truth_sha256": text})
    need(receipt.get("host"), "host", {"system": text, "machine": text})
    need(receipt.get("removal"), "removal", {"state": text, "uninstall": maybe_text})
    need(receipt.get("run"), "run", {"url": maybe_text})
    for index, row in enumerate(receipt.get("scans") if isinstance(receipt.get("scans"), list) else []):
        need(row, f"scans[{index}]", {"profile": text, "exit": (int, type(None)), "contents": list,
                                      "budget_exhausted": (bool, type(None)),
                                      "engine_panics": (int, type(None)), "problems": list})
    if problems:
        return problems
    if receipt["removal"]["state"] not in REMOVAL:
        problems.append(f"removal.state is {receipt['removal']['state']!r}")
    if receipt["route"]["kind"] != "cli":
        problems.append(f"route.kind is {receipt['route']['kind']!r}; this driver writes cli receipts")
    if receipt["verdict"] != verdict(receipt):
        problems.append(f"verdict {receipt['verdict']} does not follow from the receipt, which gives {verdict(receipt)}")
    return problems


def _tuple(kinds):
    return kinds if isinstance(kinds, tuple) else (kinds,)


def write(receipt, path):
    receipt["verdict"] = verdict(receipt)
    problems = validate(receipt)
    assert not problems, problems
    pathlib.Path(path).write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))


def cli(args, run=subprocess.run, now=None):
    try:
        truth, case, image = contract(args.fixtures)
    except (OSError, AssertionError, StopIteration) as error:
        print(f"destination-acceptance: the contract inputs are not usable: {error}", file=sys.stderr)
        return 2
    executable = resolve(args.qrscan)
    receipt = {
        "schema": SCHEMA, "verdict": "FAIL",
        "checked_at": (now or datetime.datetime.now(datetime.timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "destination": {"name": args.destination},
        "route": {"kind": "cli", "command": args.qrscan, "install": args.install},
        "artifact": {"identifier": args.identifier, "version": args.version, "url": args.url},
        "engine": None,
        "contract": {"commit": git_commit(), "case": CASE, "fixture_sha256": case["sha256"],
                     "truth_sha256": hashlib.sha256(truth.TRUTH.read_bytes()).hexdigest()},
        "host": {"system": platform.system(), "machine": platform.machine()},
        "scans": [], "removal": {"state": "pending", "uninstall": None},
        "run": {"url": args.run_url}, "problems": [],
    }
    if executable is None:
        receipt["problems"].append(f"{args.qrscan!r} is not an installed command")
    # The fixture is read from a copy outside the checkout, as an installed user's file would be.
    with tempfile.TemporaryDirectory(prefix="qrscan-acceptance-") as box:
        staged = pathlib.Path(box) / image.name
        shutil.copyfile(image, staged)
        versions = []
        for profile in PROFILES if executable else ():
            code, report, problem = scan(executable, staged, profile, run)
            problems = ([problem] if problem else []) + judge_scan(truth, case, profile, code, report)
            detections = report.get("detections", []) if report else []
            trace = report.get("trace", {}) if report else {}
            receipt["scans"].append({
                "profile": profile, "exit": code,
                "contents": sorted([d.get("symbology"), d.get("content", {}).get("text")] for d in detections),
                "budget_exhausted": trace.get("budget_exhausted"), "engine_panics": trace.get("engine_panics"),
                "problems": problems})
            if report and isinstance(report.get("versions"), dict):
                versions.append(report["versions"])
    if versions and all(row == versions[0] for row in versions) and len(versions) == len(PROFILES):
        receipt["engine"] = versions[0]
        if versions[0].get("scanner") != args.version:
            receipt["problems"].append(f"the reports name engine {versions[0].get('scanner')!r}, the artifact is "
                                       f"{args.version!r}")
    elif executable:
        receipt["problems"].append("the three reports do not name one engine version")
    write(receipt, args.receipt)
    return 0 if receipt["verdict"] == "INCOMPLETE" else 1


def removed(args):
    try:
        receipt = json.loads(pathlib.Path(args.receipt).read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        print(f"destination-acceptance: cannot read the receipt: {error}", file=sys.stderr)
        return 2
    problems = validate(receipt)
    if problems or receipt["removal"]["state"] != "pending":
        print("destination-acceptance: the receipt is not one that waits for its removal step: "
              + "; ".join(problems or [f"removal is already {receipt['removal']['state']}"]), file=sys.stderr)
        return 2
    state = "not_applicable" if args.not_applicable else "still_present" if resolve(args.qrscan) else "removed"
    receipt["removal"] = {"state": state, "uninstall": args.uninstall}
    write(receipt, args.receipt)
    return 0 if receipt["verdict"] == "PASS" else 1


def check(args):
    try:
        receipt = json.loads(pathlib.Path(args.file).read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        print(f"destination-acceptance: cannot read the receipt: {error}", file=sys.stderr)
        return 2
    problems = validate(receipt)
    for problem in problems:
        print(f"FAIL  {problem}")
    if not problems:
        print(f"ok    {receipt['destination']['name']} · {receipt['artifact']['version']} · {receipt['verdict']}")
    return 1 if problems else 0


# --------------------------------------------------------------------------------------- self-test

def self_test():
    truth, case, _ = contract(ROOT / "fixtures")
    versions = {"scanner": "9.9.9", "pipeline": 5, "score_contract": 5}
    good = truth.conforming_report(case, versions)
    good["trace"]["engine_panics"] = 0  # every real report carries it (spec/01-report.md § PipelineTrace)
    failures = []

    def fake(defect=None):
        def run(command, **_):
            report = json.loads(json.dumps(good))
            profile = command[command.index("--profile") + 1]
            assert command[-2:] == ["--budget-ms", "0"] and pathlib.Path(command[1]).is_file(), command
            assert ROOT not in pathlib.Path(command[1]).resolve().parents, "the fixture is read inside the checkout"
            if profile != "full":
                report["score"] = None  # only the full profile owes a score
            if defect == "missing-barcode" and profile == "frame":
                report["detections"] = [d for d in report["detections"] if d["symbology"] != "code128"]
            if defect == "extra" and profile == "fast":
                report["detections"].append(dict(report["detections"][0], symbology="aztec"))
            if defect == "cut" and profile == "fast":
                report["trace"]["budget_exhausted"] = True
            if defect == "panic" and profile == "full":
                report["trace"]["engine_panics"] = 1
            if defect == "no-score" and profile == "full":
                report["score"] = None
            if defect == "other-engine" and profile == "frame":
                report["versions"] = dict(versions, scanner="9.9.8")
            if defect == "not-json":
                return subprocess.CompletedProcess(command, 2, "error: unreadable image\n", "")
            return subprocess.CompletedProcess(command, 1 if defect == "exit" else 0, json.dumps(report), "")
        return run

    with tempfile.TemporaryDirectory(prefix="qrscan-acceptance-selftest-") as box:
        box = pathlib.Path(box)
        binary = box / "qrscan"
        binary.write_text("#!/bin/sh\nexit 0\n")
        binary.chmod(0o755)

        def attempt(name, defect, want_exit, want_verdict, needle, version="9.9.9", command=None):
            receipt = box / f"{name}.json"
            args = argparse.Namespace(qrscan=command or str(binary), destination="Self-test", version=version,
                                      url="https://example.test/qrscan", identifier=None, install=None,
                                      run_url=None, fixtures=ROOT / "fixtures", receipt=str(receipt))
            with open(os.devnull, "w") as quiet:
                stdout, sys.stdout = sys.stdout, quiet
                try:
                    code = cli(args, run=fake(defect))
                finally:
                    sys.stdout = stdout
            written = json.loads(receipt.read_text())
            text = json.dumps(written)
            if (code, written["verdict"]) != (want_exit, want_verdict) or needle not in text or validate(written):
                failures.append(f"{name}: exit {code} verdict {written['verdict']}, want {want_exit} "
                                f"{want_verdict} with {needle!r}; format {validate(written)}")
            return receipt

        clean = attempt("clean", None, 0, "INCOMPLETE", '"problems": []')
        attempt("missing-barcode", "missing-barcode", 1, "FAIL", "frame: code128 'STOCK-4827' found 0 times")
        attempt("extra", "extra", 1, "FAIL", "fast: 3 detections")
        attempt("cut", "cut", 1, "FAIL", "fast: the unbudgeted scan was cut")
        attempt("panic", "panic", 1, "FAIL", "full: trace.engine_panics is 1")
        attempt("no-score", "no-score", 1, "FAIL", "score null, truth says present")
        attempt("exit", "exit", 1, "FAIL", "fast: exit 1, a found code exits 0")
        attempt("not-json", "not-json", 1, "FAIL", "output is not one JSON report")
        attempt("other-engine", "other-engine", 1, "FAIL", "do not name one engine version")
        attempt("other-version", None, 1, "FAIL", "the artifact is '9.9.8'", version="9.9.8")
        attempt("absent", None, 1, "FAIL", "is not an installed command", command=str(box / "nowhere"))

        def close(name, source, remove, want_exit, want_verdict, **options):
            receipt = box / f"{name}.json"
            shutil.copyfile(source, receipt)
            if remove:
                binary.rename(box / "qrscan.removed")
            args = argparse.Namespace(qrscan=str(binary), receipt=str(receipt), uninstall="rm qrscan",
                                      not_applicable=options.get("not_applicable", False))
            with open(os.devnull, "w") as quiet:
                stdout, sys.stdout = sys.stdout, quiet
                try:
                    code = removed(args)
                finally:
                    sys.stdout = stdout
            if remove:
                (box / "qrscan.removed").rename(binary)
            written = json.loads(receipt.read_text())
            if (code, written["verdict"]) != (want_exit, want_verdict) or validate(written):
                failures.append(f"{name}: exit {code} verdict {written['verdict']}, want {want_exit} {want_verdict}")
            return receipt

        passed = close("removed", clean, True, 0, "PASS")
        close("still-present", clean, False, 1, "FAIL")
        close("not-applicable", clean, False, 0, "PASS", not_applicable=True)
        with open(os.devnull, "w") as quiet:
            stderr, sys.stderr = sys.stderr, quiet
            try:
                again = removed(argparse.Namespace(qrscan=str(binary), receipt=str(passed), uninstall=None,
                                                   not_applicable=False))
            finally:
                sys.stderr = stderr
        if again != 2:
            failures.append("a closed receipt accepted a second removal step")
        # A receipt whose verdict does not follow from its content, or with a stray field, is refused.
        tampered = json.loads(passed.read_text())
        tampered["scans"][0]["problems"] = ["fast: edited"]
        if not any("does not follow" in problem for problem in validate(tampered)):
            failures.append("a PASS receipt with a failing scan was accepted")
        stray = json.loads(passed.read_text())
        stray["note"] = "x"
        if not any("not a field of the format" in problem for problem in validate(stray)):
            failures.append("a receipt with a stray field was accepted")

    # The JSON Schema file names the same fields as the validator.
    schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
    receipt = json.loads(json.dumps(tampered))
    for path, node in (("receipt", receipt), ("destination", receipt["destination"]), ("route", receipt["route"]),
                       ("artifact", receipt["artifact"]), ("contract", receipt["contract"]),
                       ("host", receipt["host"]), ("removal", receipt["removal"]), ("run", receipt["run"]),
                       ("scans[]", receipt["scans"][0])):
        declared = schema if path == "receipt" else (
            schema["properties"]["scans"]["items"] if path == "scans[]" else schema["properties"][path])
        if sorted(declared.get("required", [])) != sorted(node) or sorted(declared["properties"]) != sorted(node) \
                or declared.get("additionalProperties") is not False:
            failures.append(f"receipt.schema.json and the validator disagree on {path}")
    if schema["properties"]["schema"].get("const") != SCHEMA:
        failures.append("receipt.schema.json names another schema")
    if schema["properties"]["removal"]["properties"]["state"].get("enum") != list(REMOVAL):
        failures.append("receipt.schema.json and the validator disagree on removal.state")

    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (11 scan scenarios, 4 removal scenarios, 2 refused "
          "receipts, the schema file)")
    return 1 if failures else 0


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if argv == ["--self-test"]:
        return self_test()
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    commands = parser.add_subparsers(dest="command", required=True)
    one = commands.add_parser("cli", help="scan with the installed command and write the receipt")
    one.add_argument("--qrscan", required=True, help="the installed command: a name on PATH or a path")
    one.add_argument("--destination", required=True, help="the destination's name, as its page shows it")
    one.add_argument("--version", required=True, help="the engine version the artifact states, X.Y.Z")
    one.add_argument("--url", required=True, help="the public page or artifact the install came from")
    one.add_argument("--identifier", help="the package or formula name, when the route has one")
    one.add_argument("--install", help="the install command line, as it was run")
    one.add_argument("--run-url", help="the hosted run that produced this receipt")
    one.add_argument("--fixtures", type=pathlib.Path, default=ROOT / "fixtures")
    one.add_argument("--receipt", required=True)
    two = commands.add_parser("removed", help="after the uninstall: record that the command is gone")
    two.add_argument("--qrscan", required=True)
    two.add_argument("--receipt", required=True)
    two.add_argument("--uninstall", help="the uninstall command line, as it was run")
    two.add_argument("--not-applicable", action="store_true",
                     help="the route has no uninstall (a downloaded archive that was only unpacked)")
    three = commands.add_parser("check", help="validate a receipt")
    three.add_argument("file")
    args = parser.parse_args(argv)
    return {"cli": cli, "removed": removed, "check": check}[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
