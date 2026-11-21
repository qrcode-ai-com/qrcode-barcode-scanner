#!/usr/bin/env python3
"""Scan through the installed extension in a real JupyterLab, for the clean-consumer harness.

  python lab_acceptance.py IMAGE OUT_DIR

scripts/python-host-consumer.py runs it with the Python of the new virtual environment where it
installed JupyterLab and the extension's wheel. In order, and stopping at the first failure:

  1. `jupyter labextension list` must show the extension enabled and OK, installed by pip;
  2. JupyterLab starts headless on 127.0.0.1, from a temporary root folder holding a copy of IMAGE,
     with its own config, data and runtime folders, no token, and no news or update check;
  3. distribution/acceptance/drivers/web-page.mjs opens /lab?qrcode-barcode-scanner, gives IMAGE
     to the panel's file input with the fast, frame and full profiles and writes fast.json,
     frame.json, full.json and page.json to OUT_DIR;
  4. scripts/check-demo-page.py judges page.json: the six links, the package, its module's SHA-256
     and the engine version that loaded;
  5. tests/file-browser.mjs right-clicks the copy in the file browser and runs "Scan for QR codes
     and barcodes", which reads it through the server's contents API: both codes, twice.

The browser drivers take Playwright from tests/wasm-browser (npm ci there first) and drive the
installed Chrome (QRSCAN_BROWSER_CHANNEL, default chrome). Stdlib only. Exit 0 when every step
passes, 1 otherwise.
"""
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
EXTENSION = HERE.parent
ROOT = EXTENSION.parents[1]
NAME = "@qrcode-ai-com/jupyterlab-qrcode-barcode-scanner"
BROWSER = ROOT / "tests" / "wasm-browser"
CHANNEL = os.environ.get("QRSCAN_BROWSER_CHANNEL", "chrome")


def step(title, command, **kwargs):
    print(f"== {title}\n$ {' '.join(str(part) for part in command)}", flush=True)
    done = subprocess.run([str(part) for part in command], **kwargs)
    if done.returncode != 0:
        raise SystemExit(f"lab_acceptance: {title}: exit {done.returncode}")
    return done


def free_port():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def main(image, out):
    image, out = pathlib.Path(image).resolve(), pathlib.Path(out).resolve()
    listed = step("labextension list", [sys.executable, "-m", "jupyter", "labextension", "list"],
                  capture_output=True, text=True)
    text = re.sub(r"\x1b\[[0-9;]*m", "", listed.stdout + listed.stderr)
    print(text)
    line = next((row for row in text.splitlines() if NAME in row), "")
    if not re.search(r"\benabled\b.*\bOK\b.*\(python, jupyterlab-qrcode-barcode-scanner\)", line):
        raise SystemExit(f"lab_acceptance: the extension is not listed enabled and OK: {line!r}")

    with tempfile.TemporaryDirectory(prefix="qrscan-jupyterlab-") as temp:
        temp = pathlib.Path(temp)
        root = temp / "root"
        root.mkdir()
        shutil.copyfile(image, root / image.name)
        env = dict(os.environ)
        for key in ("config", "data", "runtime"):
            (temp / key).mkdir()
            env[f"JUPYTER_{key.upper()}_DIR"] = str(temp / key)
        port = free_port()
        log = open(temp / "lab.log", "w")
        server = subprocess.Popen([
            sys.executable, "-m", "jupyterlab", "--no-browser", "--ip=127.0.0.1", f"--port={port}",
            "--ServerApp.token=", "--ServerApp.password=", f"--ServerApp.root_dir={root}",
            f"--LabApp.workspaces_dir={temp / 'workspaces'}", "--LabApp.news_url=None",
            "--LabApp.check_for_updates_class=jupyterlab.NeverCheckForUpdate",
        ], env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            base = f"http://127.0.0.1:{port}"
            for _ in range(240):
                try:
                    with urllib.request.urlopen(f"{base}/api/status", timeout=2):
                        break
                except OSError:
                    if server.poll() is not None:
                        break
                    time.sleep(0.5)
            else:
                raise SystemExit("lab_acceptance: JupyterLab did not answer within 120 s")
            if server.poll() is not None:
                raise SystemExit("lab_acceptance: JupyterLab stopped:\n" + (temp / "lab.log").read_text())
            print(f"JupyterLab answers at {base}", flush=True)
            step("scan through the panel's file input, three profiles", [
                "node", ROOT / "distribution" / "acceptance" / "drivers" / "web-page.mjs",
                f"{base}/lab?qrcode-barcode-scanner", image, out, "--wait", "300", "--channel", CHANNEL,
            ], cwd=BROWSER)
            step("judge the panel's links, package and module", [
                sys.executable, ROOT / "scripts" / "check-demo-page.py", out / "page.json",
                "--example", EXTENSION,
            ])
            step("scan a file of the file browser", [
                "node", HERE / "file-browser.mjs", f"{base}/lab", image.name, out / "file-browser.json",
                "--channel", CHANNEL,
            ], cwd=BROWSER)
        finally:
            server.terminate()
            try:
                server.wait(timeout=30)
            except subprocess.TimeoutExpired:
                server.kill()
            log.close()
            shutil.copyfile(temp / "lab.log", out / "jupyterlab.log")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__.split("\n\n")[1], file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
