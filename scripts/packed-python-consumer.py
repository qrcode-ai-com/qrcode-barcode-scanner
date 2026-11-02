"""Install a produced wheel into a new venv and exercise its imported extension.

Beyond the FIXTURE control (gen_v5_q.png), the installed module runs the shared
truth set, fixtures/consumer-truth.json (consumer_truth.py).
"""
import argparse
import base64
import hashlib
import importlib.metadata
import importlib.util
from importlib.machinery import EXTENSION_SUFFIXES
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import venv
import xml.etree.ElementTree as ET


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inside(path, root):
    """Path.is_relative_to, which the probe's floor interpreter (3.8) lacks."""
    return path == root or root in path.parents


def probe(args):
    import qrcode_barcode_scanner as qr

    prefix = Path(sys.prefix).resolve()
    imported = Path(qr.__file__).resolve()
    assert sys.prefix != sys.base_prefix, "the consumer must run in a fresh venv"
    assert inside(imported, prefix), (imported, prefix)
    extensions = [Path(module.__file__).resolve() for name, module in sys.modules.items()
                  if name.startswith("qrcode_barcode_scanner.") and getattr(module, "__file__", "").endswith(tuple(EXTENSION_SUFFIXES))]
    assert len(extensions) == 1, f"expected one loaded native extension, found {extensions}"
    extension = extensions[0]
    assert inside(extension, prefix), (extension, prefix)
    assert qr.__version__ == importlib.metadata.version("qrcode-barcode-scanner") == args.version
    # Releases up to 0.9.0 were published as qrcode-ai-scanner. The wheel brings no
    # alias under that name: neither its import package nor its distribution resolves.
    assert importlib.util.find_spec("qrcode_ai_scanner") is None, "the previous import package resolves"
    try:
        importlib.metadata.version("qrcode-ai-scanner")
    except importlib.metadata.PackageNotFoundError:
        pass
    else:
        raise AssertionError("the previous distribution qrcode-ai-scanner is installed")
    data = Path(args.fixture).read_bytes()
    text = "https://qrcode-ai.com/c/v5q"
    full = qr.scan(data, "full", budget_ms=0)
    assert full["versions"] == {"scanner": args.version, "pipeline": 5, "score_contract": 5}
    assert full["trace"]["budget_exhausted"] is False
    assert len(full["detections"]) == 1
    det = full["detections"][0]
    assert det["symbology"] == "qr_code"
    assert det["content"] == {"text": text, "raw": base64.b64encode(text.encode()).decode(), "charset": "utf8"}
    assert (det["payload"]["kind"], det["payload"]["url"]) == ("url", text)
    assert full["score"]["value"] == 100
    assert full["score"]["weights_run"] == 100
    assert [axis["axis"] for axis in full["score"]["axes"]] == [
        "resolution", "blur", "contrast", "perspective", "rotation", "lighting"]
    assert full["score"]["uec"]["grade"] == full["score"]["iso15415"]["overall"] == "a"
    # the installed build lists the readers it carries, in the contract's order
    # UTF-8, never the locale's encoding (cp1252 on Windows)
    contract = json.loads((Path(__file__).resolve().parents[1] / "spec/scan-report.schema.json")
                          .read_text(encoding="utf-8"))["$defs"]
    assert qr.capabilities() == {"versions": full["versions"], "engines": contract["EngineKind"]["enum"],
                                 "symbologies": contract["Symbology"]["enum"]}
    frame = qr.scan(data, "frame", budget_ms=0)
    assert frame["score"] is None
    assert [det["content"]["text"] for det in frame["detections"]] == [text]
    empty = qr.scan_frame(b"\xff" * (64 * 64 * 4), 64, 64, "frame", budget_ms=0)
    assert empty["detections"] == [] and empty["score"] is None
    assert empty["trace"]["budget_exhausted"] is False
    for code, call in [
        ("QRS-001", lambda: qr.scan(b"garbage")),
        ("QRS-002", lambda: qr.scan(data, max_dimension=1)),
        ("QRS-003", lambda: qr.scan(data, max_pixels=1)),
        ("QRS-004", lambda: qr.scan_frame(b"\0" * 10, 2, 2)),
    ]:
        try:
            call()
        except ValueError as error:
            assert re.search(r"\[" + code + r"\]$", str(error)), str(error)
        else:
            raise AssertionError(f"expected {code}")
    # the shared truth set through the installed module, inputs staged in the
    # consumer: exact contents, primary, occurrences and score/null per case
    spec = importlib.util.spec_from_file_location("consumer_truth", Path(__file__).resolve().parent / "consumer_truth.py")
    truth_lib = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(truth_lib)
    truth = truth_lib.load()
    problems, identities = [], {}
    for case, path in truth_lib.stage(truth, Path(args.receipt).parent / "truth"):
        data = path.read_bytes()
        if "error" in case:
            try:
                qr.scan(data, truth["scan"]["profile"], budget_ms=truth["scan"]["budget_ms"])
            except ValueError as error:
                if not str(error).endswith(f"[{case['error']}]"):
                    problems.append(f"{case['id']}: {error}")
            else:
                problems.append(f"{case['id']}: no {case['error']}")
            continue
        report = qr.scan(data, truth["scan"]["profile"], budget_ms=truth["scan"]["budget_ms"])
        problems += truth_lib.judge(case, report, full["versions"])
        identities[case["id"]] = truth_lib.identity(report)
    assert not problems, "\n".join(problems)
    receipt = {"verdict": "PASS", "python": sys.version, "platform": platform.platform(),
               "prefix": str(prefix), "imported": str(imported), "extension": str(extension),
               "extension_sha256": sha256(extension),
               "version": args.version, "full_score": full["score"]["value"],
               "wheel": args.wheel, "wheel_sha256": sha256(Path(args.wheel)),
               "fixture_sha256": sha256(Path(args.fixture)),
               "truth": {"file": "fixtures/consumer-truth.json", "sha256": sha256(truth_lib.TRUTH),
                         "cases": len(truth["cases"]), "identities_sha256": truth_lib.identities_digest(identities)}}
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archives")
    parser.add_argument("fixture")
    parser.add_argument("version")
    parser.add_argument("wheel_tag", help="regex matching exactly one produced wheel filename")
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--wheel")
    parser.add_argument("--receipt")
    parser.add_argument("--suite", action="store_true", help="run the unchanged public pytest/schema suite too")
    args = parser.parse_args()
    if args.probe:
        probe(args)
        return
    wheels = [file.resolve() for file in Path(args.archives).rglob("*.whl")
              if re.search(args.wheel_tag, file.name)]
    assert len(wheels) == 1, f"expected one {args.wheel_tag} wheel, found {wheels}"
    consumer = Path(tempfile.mkdtemp(prefix="qrscan-packed-python-"))
    venv_dir = consumer / "venv"
    # Symlinked like `python -m venv` on POSIX: a copied interpreter that loads
    # @executable_path/../lib/libpython (the 3.8-3.10 standalone builds) aborts.
    venv.EnvBuilder(with_pip=True, symlinks=os.name != "nt").create(venv_dir)
    python = venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    fixture = consumer / "fixture.png"
    shutil.copyfile(Path(args.fixture).resolve(), fixture)
    env = dict(os.environ)
    env.pop("PYTHONPATH", None)
    env.pop("PYTHONHOME", None)
    env["PIP_CACHE_DIR"] = str(consumer / "empty-pip-cache")
    subprocess.run([str(python), "-I", "-m", "pip", "install", "--no-index", "--no-deps",
                    str(wheels[0])], cwd=consumer, env=env, check=True, timeout=180)
    receipt = consumer / "receipt.json"
    subprocess.run([str(python), "-I", str(Path(__file__).resolve()), str(Path(args.archives).resolve()),
                    str(fixture), args.version, args.wheel_tag, "--probe", "--wheel", str(wheels[0]),
                    "--receipt", str(receipt)], cwd=consumer, env=env, check=True, timeout=180)
    if args.suite:
        source = Path(__file__).resolve().parents[1]
        suite = consumer / "suite"
        shutil.copytree(source / "fixtures", suite / "fixtures")
        inputs = ["crates/qrcode-ai-scanner-py/python/tests/test_scan.py",
                  "crates/qrcode-ai-scanner-py/Cargo.toml", "spec/scan-report.schema.json", "corpus.toml",
                  "playground/public/samples/transparent.png"]
        for relative in inputs:
            target = suite / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / relative, target)
            assert sha256(target) == sha256(source / relative)
        suite_inputs = {str(file.relative_to(suite)): sha256(file)
                        for file in sorted(suite.rglob("*")) if file.is_file()}
        requirements = source / "scripts/packed-consumer-requirements.txt"
        subprocess.run([str(python), "-I", "-m", "pip", "--isolated", "install", "--no-deps",
                        "--only-binary=:all:", "--require-hashes", "--no-cache-dir", "-r", str(requirements)],
                       cwd=consumer, env=env, check=True, timeout=180)
        junit = consumer / "pytest.xml"
        subprocess.run([str(python), "-I", "-m", "pytest", "-q", "--strict-markers",
                        f"--junitxml={junit}", str(suite / inputs[0])],
                       cwd=suite, env=env, check=True, timeout=300)
        totals = {name: sum(int(node.get(name, "0")) for node in ET.parse(junit).getroot().iter("testsuite"))
                  for name in ["tests", "failures", "errors", "skipped"]}
        assert totals["tests"] > 0 and totals["failures"] == totals["errors"] == totals["skipped"] == 0, totals
        assert all(sha256(suite / relative) == digest for relative, digest in suite_inputs.items()), "pytest changed an input"
        report = json.loads(receipt.read_text(encoding="utf-8"))
        report["pytest"] = {**totals, "junit": str(junit), "junit_sha256": sha256(junit),
                            "requirements_sha256": sha256(requirements),
                            "suite_inputs": suite_inputs}
        receipt.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(report))
    if "GITHUB_OUTPUT" in env:
        with open(env["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
            output.write(f"receipt={receipt}\n")
            if args.suite:
                output.write(f"junit={junit}\n")


if __name__ == "__main__":
    main()
