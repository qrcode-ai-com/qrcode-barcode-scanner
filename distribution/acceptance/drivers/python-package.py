"""Destination acceptance, Python package: scan one image with the three profiles through the
installed package and write one JSON report per profile, for
`scripts/destination-acceptance.py reports` to judge.

    python python-package.py IMAGE OUT_DIR

Run it with the interpreter of the environment that installed the package.
"""
import json
import pathlib
import sys

import qrcode_barcode_scanner as scanner

if len(sys.argv) != 3:
    sys.exit("usage: python python-package.py IMAGE OUT_DIR")
image = pathlib.Path(sys.argv[1]).read_bytes()
out = pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for profile in ("fast", "frame", "full"):
    report = scanner.scan(image, profile=profile, budget_ms=0)
    (out / f"{profile}.json").write_text(json.dumps(report), encoding="utf-8")
    print(profile, " ".join(f"{row['symbology']}:{row['content']['text']}" for row in report["detections"]))
