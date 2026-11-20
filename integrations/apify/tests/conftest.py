"""Fixtures for the Actor tests: scanner images, a local web server and a run of the Actor."""
import dataclasses
import http.server
import json
import os
import pathlib
import subprocess
import sys
import threading

import pytest

ACTOR_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ACTOR_ROOT))  # the Actor package, as the image runs it from its root
QR = "https://qrc-ai.com/76xMa"
CODE128 = "STOCK-4827"
MIXED = "symbology/mixed-code128-qr.png"


def fixtures_root():
    """QRSCAN_FIXTURES, else tests/fixtures (a staged copy), else the engine's fixtures/."""
    if os.environ.get("QRSCAN_FIXTURES"):
        return pathlib.Path(os.environ["QRSCAN_FIXTURES"])
    staged = ACTOR_ROOT / "tests" / "fixtures"
    if staged.is_dir():
        return staged
    for parent in ACTOR_ROOT.parents:
        if (parent / "fixtures" / "consumer-truth.json").is_file():
            return parent / "fixtures"
    raise RuntimeError("no scanner fixtures found: set QRSCAN_FIXTURES")


@pytest.fixture
def mixed_image():
    """The mixed sample: the staged copy of the acceptance run when there is one."""
    staged = os.environ.get("QRSCAN_ACCEPTANCE_IMAGE")
    return pathlib.Path(staged) if staged else fixtures_root() / MIXED


@pytest.fixture
def web():
    """A local web server: serve(name, body, declare_length=True) gives the URL of that body."""
    served = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            entry = served.get(self.path)
            if entry is None:
                self.send_response(404)
                self.end_headers()
                return
            body, declare_length = entry
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            if declare_length:
                self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass  # the Actor stopped reading at its limit

        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def serve(name, body, declare_length=True):
        served["/" + name] = (body, declare_length)
        return f"http://127.0.0.1:{server.server_port}/{name}"

    try:
        yield serve
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


@dataclasses.dataclass
class Run:
    returncode: int
    items: list
    log: str
    store_ids: dict


@pytest.fixture
def run_actor(tmp_path):
    """Run the Actor as its image does (python -m qrscan_actor) against a fresh local storage."""
    count = 0

    def run(actor_input, stores=None):
        nonlocal count
        count += 1
        folder = tmp_path / f"run{count}"
        folder.mkdir()
        env = {key: value for key, value in os.environ.items() if not key.startswith(("APIFY_", "CRAWLEE_"))}
        env.update(APIFY_LOCAL_STORAGE_DIR=str(folder / "storage"), NO_PROXY="127.0.0.1,localhost",
                   PYTHONDONTWRITEBYTECODE="1")
        helper = str(ACTOR_ROOT / "tests" / "apify_storage.py")
        # The helper must not purge the storage it prepares or reads; the Actor keeps the default.
        keep = env | {"CRAWLEE_PURGE_ON_START": "false", "APIFY_PURGE_ON_START": "false"}
        spec = folder / "spec.json"
        spec.write_text(json.dumps({"input": actor_input, "stores": stores or {}}))
        subprocess.run([sys.executable, helper, "prepare", str(spec), str(folder / "ids.json")],
                       env=keep, cwd=folder, check=True, capture_output=True, timeout=120)
        actor = subprocess.run([sys.executable, "-m", "qrscan_actor"], env=env | {"PYTHONPATH": str(ACTOR_ROOT)},
                               cwd=folder, capture_output=True, text=True, timeout=300)
        subprocess.run([sys.executable, helper, "items", str(folder / "items.json")],
                       env=keep, cwd=folder, check=True, capture_output=True, timeout=120)
        return Run(actor.returncode, json.loads((folder / "items.json").read_text()),
                   actor.stdout + actor.stderr, json.loads((folder / "ids.json").read_text()))

    return run
