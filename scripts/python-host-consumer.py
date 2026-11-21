#!/usr/bin/env python3
"""Judge a Python host of the scanner the way its user meets it: in a new virtual environment.

  python-host-consumer.py run --destination NAME --identifier ID --version X.Y.Z --url URL
      --install "PIP ARGUMENTS" [--install ...] [--scan "COMMAND"] [--cwd DIR]
      --uninstall "PACKAGE ..." --gone-import MODULE [--gone-import ...]
      --receipt FILE [--python PYTHON] [--venv DIR] [--run-url URL] [--kind package|server|page]
  python-host-consumer.py --self-test

`run` does every step of a clean consumer, in order, and stops at the first that fails:

  1. create a virtual environment outside the checkout (`python -m venv`, or DIR when --venv
     names a folder that does not exist yet), with PYTHON (default: this interpreter);
  2. install into it with its own pip, once per --install (each value is split like a shell
     line: `qrcode-barcode-scanner==0.11.0`, `dist/plugin-0.1.0-py3-none-any.whl napari==0.10.0`,
     `-r examples/streamlit/requirements.txt`), then `pip check`;
  3. copy the checked mixed fixture outside the checkout (`destination-acceptance.py stage`);
  4. run the host's scan command inside the environment, from --cwd (default: the checkout).
     Its PATH starts with the environment's scripts folder and VIRTUAL_ENV names it;
     QRSCAN_ACCEPTANCE_IMAGE names the staged fixture and QRSCAN_ACCEPTANCE_DIR the folder where
     it must write fast.json, frame.json and full.json, the convention of every host test of this
     repository (scripts/python_host_kit.py). `{python}`, `{image}` and `{out}` in COMMAND are
     replaced by the environment's interpreter, the staged image and that folder. Without
     --scan, distribution/acceptance/drivers/python-package.py scans through the installed wheel;
  5. judge the three reports with `destination-acceptance.py reports` and write the receipt;
  6. uninstall each named package with the environment's pip, then `destination-acceptance.py
     removed`: an import of every --gone-import module in the environment must now fail;
  7. `destination-acceptance.py check` the receipt. Exit 0 only for a PASS.

The environment is deleted afterwards unless --venv named it. What was installed (`pip freeze`)
and the SHA-256 of every local file given to --install are printed, so the run log shows the exact
artifact. Stdlib only, Python >= 3.8. Exit 0 PASS, 1 a failed step or verdict, 2 usage.
"""
import argparse
import hashlib
import json
import os
import pathlib
import shlex
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
ACCEPTANCE = ROOT / "scripts" / "destination-acceptance.py"
DEFAULT_DRIVER = ROOT / "distribution" / "acceptance" / "drivers" / "python-package.py"
PROFILES = ("fast", "frame", "full")
TIMEOUT = 1800


class Failed(Exception):
    """A step of the consumer did not do what it must; the message says which."""


def venv_python(venv):
    scripts = venv / ("Scripts" if os.name == "nt" else "bin")
    return scripts / ("python.exe" if os.name == "nt" else "python"), scripts


def step(title, command, env=None, cwd=None, check=True):
    print(f"::group::{title}" if os.environ.get("GITHUB_ACTIONS") else f"--- {title}", flush=True)
    print("$ " + " ".join(shlex.quote(str(part)) for part in command), flush=True)
    try:
        done = subprocess.run([str(part) for part in command], env=env, cwd=cwd, timeout=TIMEOUT)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Failed(f"{title}: the command did not run ({type(error).__name__}: {error})") from error
    finally:
        if os.environ.get("GITHUB_ACTIONS"):
            print("::endgroup::", flush=True)
    if check and done.returncode != 0:
        raise Failed(f"{title}: exit {done.returncode}")
    return done.returncode


def local_files(arguments):
    """The local files among pip arguments (wheels, sdists, requirement files), with SHA-256."""
    out = []
    for argument in arguments:
        path = pathlib.Path(argument)
        if not argument.startswith("-") and path.is_file():
            out.append((argument, hashlib.sha256(path.read_bytes()).hexdigest()))
    return out


def host_env(venv, scripts, image, out):
    env = dict(os.environ)
    env.pop("PYTHONHOME", None)
    env.pop("PYTHONPATH", None)
    env["VIRTUAL_ENV"] = str(venv)
    env["PATH"] = str(scripts) + os.pathsep + env.get("PATH", "")
    env["QRSCAN_ACCEPTANCE_IMAGE"] = str(image)
    env["QRSCAN_ACCEPTANCE_DIR"] = str(out)
    env["PIP_DISABLE_PIP_VERSION_CHECK"] = "1"
    return env


def scan_command(args, python, image, out):
    if not args.scan:
        return [python, DEFAULT_DRIVER, image, out]
    words = shlex.split(args.scan, posix=os.name != "nt")
    return [word.replace("{python}", str(python)).replace("{image}", str(image)).replace("{out}", str(out))
            for word in words]


def consume(args, work):
    venv = pathlib.Path(args.venv) if args.venv else work / "venv"
    if venv.exists():
        raise Failed(f"{venv} exists: the environment must be new")
    step("Create a new virtual environment", [args.python, "-m", "venv", venv])
    python, scripts = venv_python(venv)
    env = host_env(venv, scripts, "", "")
    for line in args.install:
        words = shlex.split(line, posix=os.name != "nt")
        for name, digest in local_files(words):
            print(f"local file {name}  sha256 {digest}")
        step(f"Install {line}", [python, "-m", "pip", "install", "--no-cache-dir", *words], env=env)
    step("Check the installed set", [python, "-m", "pip", "check"], env=env)
    step("What is installed", [python, "-m", "pip", "freeze", "--all"], env=env)
    staged = subprocess.run([sys.executable, ACCEPTANCE, "stage", work / "input"], capture_output=True,
                            text=True)
    if staged.returncode != 0:
        raise Failed(f"stage the fixture: {staged.stderr.strip()}")
    image, out = pathlib.Path(staged.stdout.strip()), work / "reports"
    out.mkdir()
    env = host_env(venv, scripts, image, out)
    command = scan_command(args, python, image, out)
    step("Scan the mixed fixture through the host", command, env=env, cwd=args.cwd or ROOT)
    missing = [profile for profile in PROFILES if not (out / f"{profile}.json").is_file()]
    if missing:
        raise Failed(f"the host wrote no report for {', '.join(missing)} in {out}")
    install = " && ".join(f"pip install {line}" for line in args.install)
    produced_by = " ".join(shlex.quote(str(part)) for part in command)
    step("Judge the three reports", [
        sys.executable, ACCEPTANCE, "reports", "--kind", args.kind, "--produced-by", produced_by,
        *[item for profile in PROFILES for item in (f"--{profile}", out / f"{profile}.json")],
        "--destination", args.destination, "--identifier", args.identifier, "--version", args.version,
        "--url", args.url, "--install", install, *(["--run-url", args.run_url] if args.run_url else []),
        "--receipt", args.receipt], check=False)
    uninstall = shlex.split(args.uninstall, posix=os.name != "nt")
    if uninstall:
        step(f"Uninstall {args.uninstall}", [python, "-m", "pip", "uninstall", "--yes", *uninstall], env=env)
    imports = "; ".join(f"import {module}" for module in args.gone_import)
    gone = subprocess.list2cmdline([str(python), "-c", imports]) if os.name == "nt" else \
        " ".join(shlex.quote(part) for part in (str(python), "-c", imports))
    step("Record that it is gone", [sys.executable, ACCEPTANCE, "removed", "--gone", gone,
                                    "--uninstall", f"pip uninstall --yes {args.uninstall}",
                                    "--receipt", args.receipt], check=False)
    step("Check the receipt", [sys.executable, ACCEPTANCE, "check", args.receipt])
    verdict = json.loads(pathlib.Path(args.receipt).read_text(encoding="utf-8"))["verdict"]
    if verdict != "PASS":
        raise Failed(f"the verdict is {verdict}")
    return 0


def run(args):
    if not args.gone_import:
        print("python-host-consumer: give at least one --gone-import", file=sys.stderr)
        return 2
    pathlib.Path(args.receipt).parent.mkdir(parents=True, exist_ok=True)
    work = pathlib.Path(tempfile.mkdtemp(prefix="qrscan-python-host-"))
    try:
        if ROOT in work.resolve().parents:
            raise Failed("the work folder is inside the checkout")
        code = consume(args, work)
        print(f"PASS  {args.destination}: {args.receipt}")
        return code
    except Failed as error:
        print(f"FAIL  {args.destination}: {error}", file=sys.stderr)
        return 1
    finally:
        shutil.rmtree(work, ignore_errors=True)


def parser():
    top = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    commands = top.add_subparsers(dest="command", required=True)
    one = commands.add_parser("run", help="install, scan, judge, uninstall, in a new environment")
    one.add_argument("--destination", required=True, help="the destination's name, as its page shows it")
    one.add_argument("--identifier", required=True, help="the package, app or model the route installs")
    one.add_argument("--version", required=True, help="the engine version the reports must name")
    one.add_argument("--url", required=True, help="the public page or source the install came from")
    one.add_argument("--install", action="append", default=[], required=True,
                     help="arguments of one `pip install`, split like a shell line; repeatable")
    one.add_argument("--scan", help="the host's scan command; default: the wheel's own driver")
    one.add_argument("--cwd", help="where the scan command runs (default: the checkout)")
    one.add_argument("--uninstall", required=True, help="the packages `pip uninstall` removes")
    one.add_argument("--gone-import", action="append", default=[],
                     help="a module that must no longer import after the uninstall; repeatable")
    one.add_argument("--receipt", required=True)
    one.add_argument("--python", default=sys.executable, help="the interpreter that creates the environment")
    one.add_argument("--venv", help="create the environment here and keep it (default: a deleted temporary)")
    one.add_argument("--run-url")
    one.add_argument("--kind", default="package", choices=["package", "server", "page"])
    return top


# --------------------------------------------------------------------------------------- self-test

FAKE_HOST = '''
import json, os, pathlib, sys
sys.path.insert(0, {scripts!r})
import consumer_truth as truth
case = next(case for case in truth.load()["cases"] if case["id"] == "qr-and-code128")
out = pathlib.Path(os.environ["QRSCAN_ACCEPTANCE_DIR"])
assert pathlib.Path(os.environ["QRSCAN_ACCEPTANCE_IMAGE"]).is_file()
assert os.path.realpath(sys.prefix) == os.path.realpath(os.environ["VIRTUAL_ENV"]), (sys.prefix, os.environ["VIRTUAL_ENV"])
for profile in ("fast", "frame", "full"):
    report = truth.conforming_report(case, {{"scanner": sys.argv[1], "pipeline": 5, "score_contract": 5}})
    report["trace"]["engine_panics"] = 0
    if profile != "full":
        report["score"] = None
    if sys.argv[2] == "missing" and profile == "frame":
        report["detections"] = report["detections"][:1]
    if sys.argv[2] != "silent" or profile != "full":
        (out / (profile + ".json")).write_text(json.dumps(report))
'''


def self_test():
    sys.path.insert(0, str(ROOT / "scripts"))
    import python_host_kit as kit

    failures = []
    with tempfile.TemporaryDirectory(prefix="qrscan-python-host-selftest-") as box:
        box = pathlib.Path(box)
        host = box / "host.py"
        host.write_text(FAKE_HOST.format(scripts=str(ROOT / "scripts")))

        def attempt(name, want, defect="none", version="9.9.9", gone="qrscan_selftest_absent_module"):
            receipt = box / f"{name}.json"
            args = parser().parse_args([
                "run", "--destination", f"Self-test {name}", "--identifier", "self-test", "--version", version,
                "--url", "https://example.com/self-test", "--install", "--no-index pip",
                "--scan", f"{{python}} {host} 9.9.9 {defect}", "--uninstall", "", "--gone-import", gone,
                "--receipt", str(receipt), "--python", sys.executable])
            with open(os.devnull, "w") as quiet:
                stdout, stderr = sys.stdout, sys.stderr
                sys.stdout = sys.stderr = quiet
                try:
                    with _quiet_children():
                        code = run(args)
                finally:
                    sys.stdout, sys.stderr = stdout, stderr
            verdict = json.loads(receipt.read_text())["verdict"] if receipt.is_file() else None
            if (code, verdict) != want:
                failures.append(f"{name}: exit {code} verdict {verdict}, want {want}")

        attempt("clean", (0, "PASS"))
        attempt("missing-barcode", (1, "FAIL"), defect="missing")
        attempt("other-engine", (1, "FAIL"), version="9.9.8")
        attempt("still-importable", (1, "FAIL"), gone="json")
        attempt("no-full-report", (1, None), defect="silent")

    # The in-test assertions on the same contract.
    truth = _truth()
    case = next(case for case in truth.load()["cases"] if case["id"] == "qr-and-code128")
    good = truth.conforming_report(case, {"scanner": kit.ENGINE_VERSION, "pipeline": 5, "score_contract": 5})
    good["trace"]["engine_panics"] = 0
    frame = dict(good, score=None)
    checks = {
        "full passes": (kit.problems(good, "full"), False),
        "frame passes without a score": (kit.problems(frame, "frame"), False),
        "frame with a score": (kit.problems(good, "frame"), True),
        "fast without a score": (kit.problems(frame, "fast"), True),
        "a third code": (kit.problems(dict(good, detections=good["detections"] * 2), "full"), True),
        "a cut scan": (kit.problems(dict(good, trace=dict(good["trace"], budget_exhausted=True)), "full"), True),
        "a panic": (kit.problems(dict(good, trace=dict(good["trace"], engine_panics=1)), "full"), True),
        "another engine": (kit.problems(good, "full", version="0.10.0"), True),
        "not a report": (kit.problems([], "fast"), True),
        "unknown profile": (kit.problems(good, "slow"), True),
    }
    for name, (found, should_fail) in checks.items():
        if bool(found) != should_fail:
            failures.append(f"kit: {name}: {found}")
    if kit.mixed_path().name != "mixed-code128-qr.png" or len(kit.mixed_bytes()) == 0:
        failures.append("kit: the mixed fixture is not found")
    with tempfile.TemporaryDirectory() as out:
        paths = kit.write_acceptance_reports(lambda profile: good, out_dir=out)
        if [path.name for path in paths] != ["fast.json", "frame.json", "full.json"]:
            failures.append(f"kit: write_acceptance_reports wrote {paths}")
    for failure in failures:
        print(f"FAIL  {failure}")
    print("python-host-consumer self-test:", "FAIL" if failures else "ok", f"({len(checks) + 6} checks)")
    return 1 if failures else 0


class _quiet_children:
    """Send the children's output to the null device while the self-test runs."""

    def __enter__(self):
        self.saved = (os.dup(1), os.dup(2))
        null = os.open(os.devnull, os.O_WRONLY)
        os.dup2(null, 1)
        os.dup2(null, 2)
        os.close(null)

    def __exit__(self, *_):
        os.dup2(self.saved[0], 1)
        os.dup2(self.saved[1], 2)
        os.close(self.saved[0])
        os.close(self.saved[1])


def _truth():
    import importlib.util
    spec = importlib.util.spec_from_file_location("consumer_truth", ROOT / "scripts" / "consumer_truth.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if argv == ["--self-test"]:
        return self_test()
    args = parser().parse_args(argv)
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
