#!/usr/bin/env python3
"""Check what a demo page says about itself, from the page.json the page driver wrote.

  check-demo-page.py PAGE_JSON [--example DIR] [--version X.Y.Z] [--wasm-sha256 HEX] [--in-frame]
  check-demo-page.py --self-test

distribution/acceptance/drivers/web-page.mjs opens a page, scans through it and writes page.json:
the package the page names, the engine it loaded and every link it shows. The scans themselves are
judged by scripts/destination-acceptance.py. This script judges the rest:

  links     the page links the three QR Code AI pages, each with its exact address
  package   the page names the browser package, at the expected version
  engine    the loaded engine reports that same version
  module    the page names the SHA-256 of the WebAssembly module of that package

--example DIR reads the expected version from the example's package.json and the expected SHA-256
from the module installed in its node_modules. --version and --wasm-sha256 give them directly, for
a page whose source is not on this machine. --in-frame also requires that the page was found in a
frame of the address that was opened, as a preview is on a hosted editor.

Stdlib only. Exit 0 when the page passes, 1 when it does not, 2 for usage or a missing input.
"""
import argparse
import hashlib
import json
import pathlib
import sys

PACKAGE = "@qrcode-ai-com/qrcode-barcode-scanner-wasm"
LINKS = (
    "https://qrcode-ai.com/",
    "https://qrcode-ai.com/en-US/qr-code-scanner",
    "https://qrcode-ai.com/en-US/barcode-scanner",
)


def judge(page, version, wasm_sha256, in_frame=False):
    """The problems of one page.json, as text; none when the page passes."""
    problems = []
    shown = [link.get("href") for link in page.get("links", []) if isinstance(link, dict)]
    for address in LINKS:
        if address not in shown:
            problems.append(f"links: no link to {address}")
    package = page.get("package") if isinstance(page.get("package"), dict) else {}
    if package.get("name") != PACKAGE:
        problems.append(f"package: the page names {package.get('name')!r}, not {PACKAGE!r}")
    if package.get("version") != version:
        problems.append(f"package: the page names version {package.get('version')!r}, expected {version!r}")
    if package.get("engine_version") != version:
        problems.append(f"engine: the loaded engine reports {package.get('engine_version')!r}, expected {version!r}")
    if package.get("wasm_sha256") != wasm_sha256:
        problems.append(f"module: the page names SHA-256 {package.get('wasm_sha256')!r}, expected {wasm_sha256!r}")
    if in_frame and page.get("in_frame") is not True:
        problems.append("frame: the page was not found in a frame of the address that was opened")
    return problems


def expected(args):
    """(version, wasm sha256) from the options; raises ValueError with what is missing."""
    version, digest = args.version, args.wasm_sha256
    if args.example:
        example = pathlib.Path(args.example)
        manifest = json.loads((example / "package.json").read_text(encoding="utf-8"))
        version = version or manifest.get("dependencies", {}).get(PACKAGE)
        module = example / "node_modules" / PACKAGE / "qrcode-barcode-scanner_bg.wasm"
        digest = digest or hashlib.sha256(module.read_bytes()).hexdigest()
    if not version or not digest:
        raise ValueError("give --example DIR, or both --version and --wasm-sha256")
    return version, digest


def self_test():
    good = {
        "in_frame": True,
        "package": {"name": PACKAGE, "version": "9.9.9", "engine_version": "9.9.9", "wasm_sha256": "ab" * 32},
        "links": [{"text": "x", "href": address, "rel": None} for address in LINKS],
    }
    failures = []

    def expect(name, change, needle, in_frame=False):
        page = json.loads(json.dumps(good))
        change(page)
        problems = judge(page, "9.9.9", "ab" * 32, in_frame)
        if (needle is None) != (not problems) or (needle and not any(needle in row for row in problems)):
            failures.append(f"{name}: {problems}")

    expect("good", lambda page: None, None)
    expect("good-in-frame", lambda page: None, None, in_frame=True)
    expect("missing-link", lambda page: page["links"].pop(1), "no link to https://qrcode-ai.com/en-US/qr-code-scanner")
    expect("redirected-link", lambda page: page["links"][0].update(href="https://qrcode-ai.com/en-US"),
           "no link to https://qrcode-ai.com/")
    expect("other-package", lambda page: page["package"].update(name="other"), "package: the page names 'other'")
    expect("other-version", lambda page: page["package"].update(version="9.9.8"), "names version '9.9.8'")
    expect("other-engine", lambda page: page["package"].update(engine_version="9.9.8"), "engine reports '9.9.8'")
    expect("engine-not-loaded", lambda page: page["package"].update(engine_version="not loaded yet"),
           "engine reports 'not loaded yet'")
    expect("other-module", lambda page: page["package"].update(wasm_sha256="cd" * 32), "module: the page names")
    expect("no-package", lambda page: page.pop("package"), "package: the page names None")
    expect("not-in-frame", lambda page: page.update(in_frame=False), "frame: the page was not found", in_frame=True)
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (11 pages)")
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Check what a demo page says about itself.")
    parser.add_argument("page", nargs="?", help="the page.json written by web-page.mjs")
    parser.add_argument("--example", help="the example's folder, with its package.json and node_modules")
    parser.add_argument("--version", help="the expected package and engine version, X.Y.Z")
    parser.add_argument("--wasm-sha256", help="the expected SHA-256 of the WebAssembly module")
    parser.add_argument("--in-frame", action="store_true", help="the page must sit in a frame of the opened address")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.page:
        parser.print_usage(sys.stderr)
        return 2
    try:
        page = json.loads(pathlib.Path(args.page).read_text(encoding="utf-8"))
        version, digest = expected(args)
    except (OSError, ValueError) as error:
        print(f"check-demo-page: {error}", file=sys.stderr)
        return 2
    if not isinstance(page, dict):
        print("check-demo-page: the file does not hold one JSON object", file=sys.stderr)
        return 2
    problems = judge(page, version, digest, args.in_frame)
    for problem in problems:
        print(f"FAILED · {problem}", file=sys.stderr)
    print(f"{'FAILED' if problems else 'ok'}    {page.get('frame')} · {PACKAGE} {version}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
