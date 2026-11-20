"""Fixtures for the plugin tests: scanner images, a local file server and the plugin directory."""
import http.server
import os
import pathlib
import threading

import pytest

PLUGIN_ROOT = pathlib.Path(__file__).resolve().parents[1]
QR = "https://qrc-ai.com/76xMa"
CODE128 = "STOCK-4827"
MIXED = "symbology/mixed-code128-qr.png"


def fixtures_root():
    """QRSCAN_FIXTURES, else tests/fixtures (the plugin repository), else the engine's fixtures/."""
    if os.environ.get("QRSCAN_FIXTURES"):
        return pathlib.Path(os.environ["QRSCAN_FIXTURES"])
    staged = PLUGIN_ROOT / "tests" / "fixtures"
    if staged.is_dir():
        return staged
    for parent in PLUGIN_ROOT.parents:
        if (parent / "fixtures" / "consumer-truth.json").is_file():
            return parent / "fixtures"
    raise RuntimeError("no scanner fixtures found: set QRSCAN_FIXTURES")


@pytest.fixture
def mixed_image():
    """The mixed sample: the staged copy of the acceptance run when there is one."""
    staged = os.environ.get("QRSCAN_ACCEPTANCE_IMAGE")
    return pathlib.Path(staged) if staged else fixtures_root() / MIXED


@pytest.fixture
def files():
    """A local HTTP server standing in for Dify's file service: serve(name, bytes) gives a URL."""
    served = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            body = served.get(self.path)
            self.send_response(200 if body is not None else 404)
            self.end_headers()
            if body is not None:
                self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def serve(name, body):
        served["/" + name] = body
        return f"http://127.0.0.1:{server.server_port}/{name}"

    try:
        yield serve
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


@pytest.fixture
def in_plugin_root(monkeypatch):
    """The plugin runtime starts in the plugin directory and reads its paths from there."""
    monkeypatch.chdir(PLUGIN_ROOT)
    return PLUGIN_ROOT
