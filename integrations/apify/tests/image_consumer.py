"""Run the built Actor image the way the Apify platform starts it, on the mixed fixture.

python tests/image_consumer.py --image TAG --fixture PNG --reports DIR --work DIR
    [--network host] [--url-host 127.0.0.1] [--prefill .actor/input_schema.json]

The fixture is served over HTTP from this process. For each profile (fast, frame, full) the image
runs once with `docker run`, against a fresh local storage whose INPUT record holds the fixture's
address and an address that answers 404. Each run must end with status 0 and give two dataset
items in input order: the fixture with the QR code `https://qrc-ai.com/76xMa` and the Code 128
`STOCK-4827`, in the engine's order and uncut, from engine 0.11.0, a score except in frame; then an
item with ok false for the missing image. The fixture's report is written to DIR/<profile>.json for
scripts/destination-acceptance.py.

With the default `--network host` the container reaches the server on 127.0.0.1 (Linux). Docker
Desktop on a Mac reaches the host with `--network bridge --url-host host.docker.internal`.

With --prefill, one more run does what the Apify Store's daily test does: the input is the prefill
of the input schema, the image is fetched from its public address, and the run must succeed with a
non-empty dataset in under five minutes. That prefill is the same fixture, so its codes are
checked too. Standard library only.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import os
import pathlib
import shutil
import subprocess
import sys
import threading
import time

QR = "https://qrc-ai.com/76xMa"
CODE128 = "STOCK-4827"
ENGINE = "0.11.0"
PROFILES = ("fast", "frame", "full")
DAILY_TEST_SECONDS = 300


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(folder: pathlib.Path, bind: str) -> tuple[http.server.ThreadingHTTPServer, int]:
    handler = functools.partial(QuietHandler, directory=str(folder))
    server = http.server.ThreadingHTTPServer((bind, 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_port


def writable(path: pathlib.Path) -> None:
    """The container runs as its own user: let it write the mounted storage."""
    path.mkdir(parents=True, exist_ok=True)
    for folder in (path, *path.rglob("*")):
        folder.chmod(0o777 if folder.is_dir() else 0o666)


def run_image(args, name: str, actor_input: dict, network: list[str]) -> list[dict]:
    """One run of the image on a fresh local storage holding ACTOR_INPUT: its dataset items."""
    storage = pathlib.Path(args.work) / name / "storage"
    store = storage / "key_value_stores" / "default"
    store.mkdir(parents=True)
    (store / "INPUT.json").write_text(json.dumps(actor_input))
    writable(storage)
    command = ["docker", "run", "--rm", *network, "-e", "APIFY_LOCAL_STORAGE_DIR=/storage",
               "-v", f"{storage.resolve()}:/storage", args.image]
    print("$ " + " ".join(command), flush=True)
    run = subprocess.run(command, capture_output=True, text=True, timeout=600)
    (pathlib.Path(args.work) / f"{name}.log").write_text(run.stdout + run.stderr)
    if run.returncode != 0:
        sys.exit(f"{name}: the Actor exited with {run.returncode}\n{run.stdout}{run.stderr}")
    files = sorted((storage / "datasets" / "default").glob("*.json"))
    return [json.loads(path.read_text()) for path in files if path.name != "__metadata__.json"]


def run_profile(args, profile: str, address: str, missing: str) -> list[dict]:
    items = run_image(args, profile, {"imageUrls": [address, missing], "profile": profile},
                      ["--network", args.network])
    if len(items) != 2:
        sys.exit(f"{profile}: {len(items)} dataset items instead of 2")
    return items


def daily_test(args) -> None:
    """The Store's daily test: the prefill input, a Succeeded run and a non-empty dataset in 5 min."""
    schema = json.loads(pathlib.Path(args.prefill).read_text())
    actor_input = {name: field["prefill"] for name, field in schema["properties"].items() if "prefill" in field}
    started = time.monotonic()
    items = run_image(args, "prefill", actor_input, [])
    elapsed = time.monotonic() - started
    texts = [item["texts"] for item in items]
    if not items or not all(item["ok"] for item in items) or texts != [[QR, CODE128]]:
        sys.exit(f"prefill: the daily test input gave {[(item['source'], item['ok'], item['error']) for item in items]}"
                 f" and the texts {texts}")
    if elapsed >= DAILY_TEST_SECONDS:
        sys.exit(f"prefill: the run took {elapsed:.0f} s, over the daily test's {DAILY_TEST_SECONDS} s")
    print(f"prefill: {actor_input} gave {texts[0]} in {elapsed:.1f} s, under {DAILY_TEST_SECONDS} s", flush=True)


def check(profile: str, items: list[dict], address: str, missing: str) -> dict:
    good, bad = items
    problems = []
    expected = [{"symbology": "qr_code", "text": QR}, {"symbology": "code128", "text": CODE128}]
    if (good["source"], good["input"], good["ok"], good["error"]) != (address, "imageUrls", True, None):
        problems.append(f"the fixture item is {good['source']!r} {good['ok']!r} {good['error']!r}")
    if good["codes"] != expected or good["texts"] != [QR, CODE128] or good["count"] != 2:
        problems.append(f"the fixture gave {good['codes']!r}")
    if good["complete"] is not True:
        problems.append("the fixture's scan is not complete")
    report = good["report"] or {}
    if report.get("versions", {}).get("scanner") != ENGINE:
        problems.append(f"engine {report.get('versions')!r}, not {ENGINE}")
    if report.get("trace", {}).get("budget_exhausted") is not False:
        problems.append("the scan was cut by its budget")
    if (report.get("score") is None) != (profile == "frame"):
        problems.append(f"score {report.get('score')!r} in {profile}: frame alone gives none")
    if (bad["source"], bad["ok"], bad["count"], bad["complete"]) != (missing, False, 0, False) \
            or "404" not in (bad["error"] or ""):
        problems.append(f"the missing image gave {bad!r}")
    if problems:
        sys.exit(f"{profile}: " + "; ".join(problems))
    score = report.get("score")
    found = ", ".join(f"{code['symbology']} {code['text']}" for code in good["codes"])
    print(f"{profile}: {found}" + (f" · score {score['value']} {score['grade']}" if score else " · no score")
          + f" · missing image: {bad['error']}", flush=True)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--image", required=True, help="the built Actor image")
    parser.add_argument("--fixture", required=True, help="the staged mixed fixture")
    parser.add_argument("--reports", required=True, help="where the three reports go")
    parser.add_argument("--work", required=True, help="a new folder for the storages and logs")
    parser.add_argument("--network", default="host")
    parser.add_argument("--url-host", default="127.0.0.1")
    parser.add_argument("--prefill", help="the input schema whose prefill the daily test runs")
    args = parser.parse_args()
    work = pathlib.Path(args.work)
    if work.exists():
        sys.exit(f"{work} already exists; --work names a new folder")
    served = work / "served"
    served.mkdir(parents=True)
    shutil.copyfile(args.fixture, served / "mixed-code128-qr.png")
    server, port = serve(served, "127.0.0.1" if args.url_host == "127.0.0.1" else "0.0.0.0")
    try:
        address = f"http://{args.url_host}:{port}/mixed-code128-qr.png"
        missing = f"http://{args.url_host}:{port}/missing.png"
        os.makedirs(args.reports, exist_ok=True)
        for profile in PROFILES:
            report = check(profile, run_profile(args, profile, address, missing), address, missing)
            pathlib.Path(args.reports, f"{profile}.json").write_text(json.dumps(report), encoding="utf-8")
    finally:
        server.shutdown()
        server.server_close()
    if args.prefill:
        daily_test(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
