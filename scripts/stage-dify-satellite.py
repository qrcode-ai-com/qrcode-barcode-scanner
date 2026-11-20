#!/usr/bin/env python3
"""Stage the Dify tool plugin as the tree of its own repository.

  stage-dify-satellite.py stage [--revision REV] --out DIR
  stage-dify-satellite.py verify DIR
  stage-dify-satellite.py --self-test

A Dify plugin is a folder whose root holds `manifest.yaml`; `dify plugin package` turns that folder
into the `.difypkg` the Marketplace and a local install read. The plugin therefore lives in a small
repository of its own, qrcode-ai-com/qrcode-barcode-scanner-dify, whose content is never edited by
hand: `stage` writes it from `integrations/dify` at one commit of this repository.
scripts/python_satellite_stage.py says what a stage holds.
"""
import sys

from python_satellite_stage import Satellite, main

DIFY = Satellite(
    name="stage-dify-satellite",
    slug="qrcode-ai-com/qrcode-barcode-scanner-dify",
    package="integrations/dify",
    schema="qrscan-dify-stage/1",
    required=("manifest.yaml", "main.py", "requirements.txt", ".difyignore", "README.md", "PRIVACY.md",
              "_assets/icon.svg", "provider/qrcode_barcode_scanner.yaml", "provider/qrcode_barcode_scanner.py",
              "tools/scan_image.yaml", "tools/scan_image.py", ".github/workflows/tests.yml"),
    edited="tools/scan_image.py",
    # The remote-debugging key lives in .env; a built package is a release asset, not source.
    ignored=(".env", "*.difypkg"),
)

if __name__ == "__main__":
    sys.exit(main(DIFY, __doc__.split("\n\n")[0]))
