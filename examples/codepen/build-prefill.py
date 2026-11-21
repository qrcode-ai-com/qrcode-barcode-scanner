#!/usr/bin/env python3
"""Write or check examples/codepen/prefill.html from the three files of the Pen.

  build-prefill.py           write prefill.html
  build-prefill.py --check   exit 1 when prefill.html is not what this program writes

CodePen creates a new Pen from a form POSTed to its prefill endpoint: one field, `data`, whose
value is JSON with the Pen's title, description and code. prefill.html is that form, filled with
examples/codepen/index.html, style.css and script.js byte for byte, so the owner creates the Pen
from a signed-in browser with one click. It holds two forms: the endpoint CodePen documents while
its 1.0 and 2.0 editors coexist, and the one it names for when 2.0 is the only editor. The
values below were read on https://blog.codepen.io/docs/api/post-to-prefill-pen/ (last updated
14 March 2026) on 21 November 2026: tags are no longer read from this form, so the owner adds
them in the Pen's details. Stdlib only.
"""
import argparse
import html
import json
import pathlib
import sys

FOLDER = pathlib.Path(__file__).resolve().parent
TARGET = FOLDER / "prefill.html"
ENDPOINTS = (
    ("https://codepen.io/cpe/pen/define/", "Create the Pen on CodePen"),
    ("https://codepen.io/pen/define", "Use the endpoint for when the 2.0 editor is the only one"),
)
TITLE = "QR Code & Barcode Scanner: browser image demo"
DESCRIPTION = (
    "Scan QR codes and barcodes in your browser with the open-source QR Code & Barcode Scanner. "
    "This Pen loads the published WebAssembly package @qrcode-ai-com/qrcode-barcode-scanner-wasm "
    "0.11.0 from jsDelivr at that exact version, checks the module's SHA-256, then scans a sample "
    "image that holds a QR code and a Code 128 barcode in the fast, frame and full profiles. Drop "
    "your own image to scan it: it is decoded on your device and never uploaded.\n\n"
    "Source of this Pen: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/examples/codepen\n"
    "The engine 0.11.0 is licensed AGPL-3.0-or-later. Its source: "
    "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0\n"
    "QR Code AI: https://qrcode-ai.com/"
)


def payload():
    """The `data` JSON of the form, from the three files as they are in this checkout."""
    files = {name: (FOLDER / name).read_bytes().decode("utf-8") for name in ("index.html", "style.css", "script.js")}
    return {
        "title": TITLE,
        "description": DESCRIPTION,
        "private": False,
        "html": files["index.html"],
        "css": files["style.css"],
        "js": files["script.js"],
    }


def page():
    value = html.escape(json.dumps(payload(), ensure_ascii=False, separators=(",", ":")), quote=True)
    forms = "\n".join(
        f'<form action="{action}" method="POST" target="_blank">\n'
        f'  <input type="hidden" name="data" value="{value}">\n'
        f'  <button type="submit">{label}</button>\n'
        "</form>"
        for action, label in ENDPOINTS
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Create the CodePen demo: QR Code &amp; Barcode Scanner</title>
<style>
  body {{ font: 16px/1.5 system-ui, sans-serif; max-width: 44rem; margin: 2rem auto; padding: 0 1rem; }}
  form {{ margin: 1rem 0; }}
  button {{ font: inherit; padding: 0.5rem 1rem; }}
</style>
</head>
<body>
<!-- Written by build-prefill.py from index.html, style.css and script.js. -->
<h1>Create the CodePen demo</h1>
<p>Sign in to CodePen in this browser, then press the first button. CodePen opens a new, unsaved
  Pen with the three files of this folder, its title and its description. Check the preview, then
  save the Pen as public. The second button sends the same Pen to the address CodePen documents
  for when its 2.0 editor is the only one.</p>
{forms}
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = page()
    if args.check:
        if not TARGET.exists() or TARGET.read_text(encoding="utf-8") != expected:
            print("examples/codepen/prefill.html is stale: run python3 examples/codepen/build-prefill.py", file=sys.stderr)
            return 1
        print("ok    examples/codepen/prefill.html holds the three files of the Pen")
        return 0
    TARGET.write_text(expected, encoding="utf-8")
    print("wrote examples/codepen/prefill.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
