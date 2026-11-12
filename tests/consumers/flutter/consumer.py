#!/usr/bin/env python3
"""Qualify the public Flutter package in a fresh example outside the checkout.

prepare APP RECEIPTS installs only from pub.dev; test APP RECEIPTS DEVICE runs on a device;
finish APP RECEIPTS judges the reports and removes the dependency. No publisher credentials.
"""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import unittest
from urllib.request import urlopen
from urllib.parse import urljoin, urlparse, unquote

ROOT = Path(__file__).resolve().parents[3]
PACKAGE = "qr_barcode_scanner"
VERSION = "0.11.0"
ARCHIVE_SHA256 = "460e3a09878f1148554732212f31e5ec604fd820583a78554292cf8689ff862e"
FIXTURE_SHA256 = "c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8"
PROFILES = ("fast", "frame", "full")


def run(args, cwd):
    """Run a fixed argv, retaining failures and avoiding a shell."""
    return subprocess.run(args, cwd=cwd, check=True, timeout=1500)


def public_files(raw):
    """Only the reviewed immutable public archive is accepted."""
    if hashlib.sha256(raw).hexdigest() != ARCHIVE_SHA256:
        raise ValueError("public archive differs from the reviewed publication")
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
        members = [m for m in archive.getmembers() if m.isfile()]
        return {m.name.removeprefix("./"): archive.extractfile(m).read() for m in members}


def prepare(app, receipts):
    """Copy the public example, replace its local dependency, and resolve pub.dev."""
    if app.exists() or ROOT in app.parents:
        raise ValueError("consumer must be a new directory outside the checkout")
    receipts.mkdir(parents=True)
    with urlopen(f"https://pub.dev/api/packages/{PACKAGE}/versions/{VERSION}", timeout=30) as response:
        metadata = json.load(response)
    if metadata["version"] != VERSION or metadata["archive_sha256"] != ARCHIVE_SHA256:
        raise ValueError("pub.dev metadata differs from the reviewed version")
    expected_url = f"https://pub.dev/api/archives/{PACKAGE}-{VERSION}.tar.gz"
    if metadata["archive_url"] != expected_url:
        raise ValueError("unexpected public archive address")
    with urlopen(expected_url, timeout=30) as response:
        files = public_files(response.read(2 * 1024 * 1024))
    app.mkdir(parents=True)
    for name, data in files.items():
        if not name.startswith("example/"):
            continue
        relative = Path(name).relative_to("example")
        if ".." in relative.parts or relative.is_absolute():
            raise ValueError("unsafe example member")
        target = app / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    # The reviewed example has one parent-path dependency. It must become an exact hosted one.
    pubspec = app / "pubspec.yaml"
    text, count = re.subn(r"  qr_barcode_scanner:\n(?:    #[^\n]*\n)*    path: \.\./\n",
                          f"  {PACKAGE}: {VERSION}\n", pubspec.read_text())
    if count != 1 or "dependency_overrides:" in text:
        raise ValueError("example dependency shape differs")
    pubspec.write_text(text.replace("    - assets/sample_qr.png", "    - assets/sample_qr.png\n    - assets/mixed.png"))
    fixture = (ROOT / "fixtures/symbology/mixed-code128-qr.png").read_bytes()
    if hashlib.sha256(fixture).hexdigest() != FIXTURE_SHA256:
        raise ValueError("consumer fixture differs")
    (app / "assets/mixed.png").write_bytes(fixture)
    shutil.copyfile(Path(__file__).with_name("registry_test.dart"), app / "integration_test/scan_test.dart")
    gradle = app / "android/app/build.gradle.kts"
    gradle.write_text(gradle.read_text().replace("ndkVersion = flutter.ndkVersion", 'ndkVersion = "28.2.13676358"'))
    run(["flutter", "pub", "get"], app)
    config = json.loads((app / ".dart_tool/package_config.json").read_text())
    rows = [p for p in config["packages"] if p["name"] == PACKAGE]
    if len(rows) != 1:
        raise ValueError("public package missing from the fresh app")
    uri = urljoin((app / ".dart_tool/package_config.json").as_uri(), rows[0]["rootUri"])
    installed = Path(unquote(urlparse(uri).path)).resolve()
    cache = Path(os.environ["PUB_CACHE"]).resolve()
    if not installed.is_relative_to(cache / "hosted/pub.dev"):
        raise ValueError("consumer resolved a local package instead of pub.dev")
    for name, data in files.items():
        if (installed / name).read_bytes() != data:
            raise ValueError(f"installed public file differs: {name}")
    (receipts / "public-package.json").write_text(json.dumps({
        "package": PACKAGE, "version": VERSION, "archive_sha256": ARCHIVE_SHA256,
        "public_files_byte_exact": len(files), "installed_from": expected_url,
        "dependency_source": "pub.dev", "fixture_sha256": FIXTURE_SHA256,
    }, indent=2) + "\n")
    shutil.copyfile(app / "pubspec.lock", receipts / "consumer-pubspec.lock")


def decode_reports(log):
    """Require a complete, unique report for each profile and both negative cases."""
    rows = {}
    for profile, index, count, data in re.findall(r"QRSCAN_REPORT:(fast|frame|full):(\d+):(\d+):([A-Za-z0-9+/=]+)", log):
        group = rows.setdefault(profile, {})
        index, count = int(index), int(count)
        if index in group or not 0 <= index < count <= 200:
            raise ValueError("duplicate or invalid report chunk")
        group[index] = (count, data)
    result = {}
    for profile in PROFILES:
        chunks = rows.get(profile, {})
        if 0 not in chunks or set(chunks) != set(range(chunks[0][0])) or any(n != len(chunks) for n, _ in chunks.values()):
            raise ValueError("missing report chunk")
        result[profile] = json.loads(base64.b64decode("".join(chunks[i][1] for i in range(len(chunks))), validate=True))
    if not all(f"QRSCAN_CASE:{case}:PASS" in log for case in ("blank-frame", "invalid-image")):
        raise ValueError("negative native cases did not execute")
    return result


def test(app, receipts, device):
    """Run the native integration tests and retain exact device output."""
    with (receipts / "native-tests.log").open("w") as log:
        process = subprocess.Popen(["flutter", "test", "integration_test", "--reporter", "expanded", "-d", device],
                                   cwd=app, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        for line in process.stdout:
            log.write(line)
            print(line, end="", flush=True)
        if process.wait():
            raise ValueError("native integration tests failed")


def installed(app):
    config = json.loads((app / ".dart_tool/package_config.json").read_text())
    return any(p["name"] == PACKAGE for p in config["packages"])


def finish(app, receipts):
    """Judge exact reports, remove the public dependency and record removal."""
    reports = decode_reports((receipts / "native-tests.log").read_text())
    for profile, report in reports.items():
        (receipts / f"{profile}.json").write_text(json.dumps(report) + "\n")
    acceptance = receipts / "acceptance.json"
    run([sys.executable, str(ROOT / "scripts/destination-acceptance.py"), "reports", "--kind", "package",
         "--produced-by", "Flutter integration_test on the pub.dev dependency",
         *[part for profile in PROFILES for part in (f"--{profile}", str(receipts / f"{profile}.json"))],
         "--destination", "pub.dev Flutter", "--identifier", PACKAGE, "--version", VERSION,
         "--url", f"https://pub.dev/packages/{PACKAGE}/versions/{VERSION}",
         "--run-url", f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{os.environ.get('GITHUB_REPOSITORY', 'qrcode-ai-com/qrcode-barcode-scanner')}/actions/runs/{os.environ.get('GITHUB_RUN_ID', 'local-preparation')}",
         "--install", f"flutter pub add {PACKAGE}:{VERSION}", "--receipt", str(acceptance)], ROOT)
    run(["flutter", "pub", "remove", PACKAGE], app)
    if installed(app):
        raise ValueError("the removed dependency is still resolved")
    import shlex
    gone = shlex.join([sys.executable, str(Path(__file__).resolve()), "installed", str(app)])
    run([sys.executable, str(ROOT / "scripts/destination-acceptance.py"), "removed", "--gone", gone,
         "--uninstall", f"flutter pub remove {PACKAGE}", "--receipt", str(acceptance)], ROOT)


def self_test():
    class Reports(unittest.TestCase):
        def log(self):
            return "\n".join(f"QRSCAN_REPORT:{p}:0:1:e30=" for p in PROFILES) + "\nQRSCAN_CASE:blank-frame:PASS\nQRSCAN_CASE:invalid-image:PASS"

        def test_complete(self):
            self.assertEqual(decode_reports(self.log()), {p: {} for p in PROFILES})

        def test_missing_profile(self):
            with self.assertRaises(ValueError):
                decode_reports(self.log().replace("QRSCAN_REPORT:frame:0:1:e30=", ""))

        def test_duplicate(self):
            with self.assertRaises(ValueError):
                decode_reports(self.log() + "\nQRSCAN_REPORT:fast:0:1:e30=")

        def test_missing_chunk(self):
            with self.assertRaises(ValueError):
                decode_reports(self.log().replace(":0:1:", ":0:2:"))

        def test_first_chunk_missing(self):
            with self.assertRaises(ValueError):
                decode_reports(self.log().replace(":0:1:", ":1:2:"))

        def test_negative_skipped(self):
            with self.assertRaises(ValueError):
                decode_reports(self.log().replace("QRSCAN_CASE:invalid-image:PASS", ""))

        def test_archive_changed(self):
            with self.assertRaises(ValueError):
                public_files(b"not the reviewed archive")

    return 0 if unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Reports)).wasSuccessful() else 1


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        raise SystemExit(self_test())
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("prepare", "test", "finish", "installed"))
    parser.add_argument("app", type=Path)
    parser.add_argument("receipts", type=Path, nargs="?")
    parser.add_argument("device", nargs="?")
    args = parser.parse_args()
    if args.mode == "installed":
        raise SystemExit(0 if installed(args.app) else 1)
    if args.receipts is None:
        parser.error("receipts directory is required")
    if args.mode == "prepare":
        prepare(args.app.resolve(), args.receipts.resolve())
    elif args.mode == "test":
        if not args.device:
            parser.error("device is required")
        test(args.app.resolve(), args.receipts.resolve(), args.device)
    else:
        finish(args.app.resolve(), args.receipts.resolve())
