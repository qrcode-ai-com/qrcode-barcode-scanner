"""The Python host kit: one way for every Python host of the scanner to find the mixed fixture,
judge a scan of it and hand its three reports to the destination acceptance driver.

A host is anything that runs the published wheel `qrcode-barcode-scanner` inside a program of its
own: a notebook, a napari plugin, a Streamlit app, a Cog predictor, a JupyterLab server. Its tests
import this module (add `scripts/` of the engine checkout to `sys.path`, or copy the file into a
staged tree) and use three things:

  mixed_path() / mixed_bytes()   the checked fixture `fixtures/symbology/mixed-code128-qr.png`, or
                                 the staged copy an acceptance run names in QRSCAN_ACCEPTANCE_IMAGE;
                                 its SHA-256 is checked before it is returned
  problems(report, profile)      every way one report departs from the contract: the QR code
  assert_mixed(report, profile)  `https://qrc-ai.com/76xMa` and the Code 128 `STOCK-4827`, each
                                 exactly once and nothing else, an uncut scan, no engine panic,
                                 the expected engine version, a score in every profile but frame
  write_acceptance_reports(scan) when QRSCAN_ACCEPTANCE_DIR is set, write fast.json, frame.json
                                 and full.json from scan(profile) for
                                 `scripts/destination-acceptance.py reports` to judge

`scripts/python-host-consumer.py` runs a host this way in a new virtual environment and records
the receipt. The contract itself is distribution/acceptance/README.md; this module only applies
it inside a test. Stdlib only, Python >= 3.8.
"""
import hashlib
import json
import os
import pathlib

QR = "https://qrc-ai.com/76xMa"
CODE128 = "STOCK-4827"
EXPECTED = (("qr_code", QR), ("code128", CODE128))
PROFILES = ("fast", "frame", "full")
MIXED = "symbology/mixed-code128-qr.png"
MIXED_SHA256 = "c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8"
ENGINE_VERSION = "0.11.0"
IMAGE_VARIABLE = "QRSCAN_ACCEPTANCE_IMAGE"
REPORTS_VARIABLE = "QRSCAN_ACCEPTANCE_DIR"
FIXTURES_VARIABLE = "QRSCAN_FIXTURES"


def fixtures_root(start=None):
    """QRSCAN_FIXTURES, else the first `fixtures/` holding consumer-truth.json above START."""
    if os.environ.get(FIXTURES_VARIABLE):
        return pathlib.Path(os.environ[FIXTURES_VARIABLE])
    here = pathlib.Path(start or __file__).resolve()
    for parent in (here, *here.parents):
        if (parent / "fixtures" / "consumer-truth.json").is_file():
            return parent / "fixtures"
    raise RuntimeError(f"no scanner fixtures found above {here}: set {FIXTURES_VARIABLE}")


def mixed_path(start=None):
    """The mixed fixture: the staged copy of an acceptance run, else the checked file."""
    staged = os.environ.get(IMAGE_VARIABLE)
    path = pathlib.Path(staged) if staged else fixtures_root(start) / MIXED
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != MIXED_SHA256:
        raise RuntimeError(f"{path} is not the mixed fixture: SHA-256 {digest}, want {MIXED_SHA256}")
    return path


def mixed_bytes(start=None):
    return mixed_path(start).read_bytes()


def found(report):
    """The (symbology, text) pairs of a report, in its order."""
    return [(row.get("symbology"), (row.get("content") or {}).get("text"))
            for row in report.get("detections") or []]


def problems(report, profile, version=ENGINE_VERSION):
    """Every way REPORT, the scan of the mixed fixture with PROFILE and no budget, departs from
    the contract (empty: it passes). VERSION None skips the engine version."""
    if not isinstance(report, dict):
        return [f"{profile}: the report is a {type(report).__name__}, not one JSON object"]
    if profile not in PROFILES:
        return [f"{profile}: not one of the profiles {', '.join(PROFILES)}"]
    out = []
    pairs = found(report)
    for want in EXPECTED:
        count = pairs.count(want)
        if count != 1:
            out.append(f"{profile}: {want[0]} {want[1]!r} found {count} times")
    if len(pairs) != len(EXPECTED):
        out.append(f"{profile}: {len(pairs)} detections {sorted(map(str, pairs))}, the fixture holds 2")
    trace = report.get("trace") or {}
    if trace.get("budget_exhausted") is not False:
        out.append(f"{profile}: the scan was cut (trace.budget_exhausted is {trace.get('budget_exhausted')!r})")
    if trace.get("engine_panics") != 0:
        out.append(f"{profile}: trace.engine_panics is {trace.get('engine_panics')!r}")
    scanner = (report.get("versions") or {}).get("scanner")
    if version is not None and scanner != version:
        out.append(f"{profile}: the report names engine {scanner!r}, want {version!r}")
    if (report.get("score") is None) != (profile == "frame"):
        out.append(f"{profile}: score is {'absent' if report.get('score') is None else 'present'}; "
                   "every profile but frame scores")
    return out


def assert_mixed(report, profile, version=ENGINE_VERSION):
    """Raise AssertionError with every problem of the report; return it when it passes."""
    found_problems = problems(report, profile, version)
    if found_problems:
        raise AssertionError("; ".join(found_problems))
    return report


def write_acceptance_reports(scan, out_dir=None):
    """With QRSCAN_ACCEPTANCE_DIR (or OUT_DIR) set, write <profile>.json from scan(profile) for
    each profile and return the three paths; return None when no acceptance run asks for them.
    SCAN returns the report as a dict, or its JSON text."""
    target = out_dir or os.environ.get(REPORTS_VARIABLE)
    if not target:
        return None
    target = pathlib.Path(target)
    target.mkdir(parents=True, exist_ok=True)
    paths = []
    for profile in PROFILES:
        report = scan(profile)
        text = report if isinstance(report, str) else json.dumps(report, ensure_ascii=False)
        path = target / f"{profile}.json"
        path.write_text(text, encoding="utf-8")
        paths.append(path)
    return paths
