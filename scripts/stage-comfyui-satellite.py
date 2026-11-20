#!/usr/bin/env python3
"""Stage the ComfyUI node as the tree of its own repository.

  stage-comfyui-satellite.py stage [--revision REV] --out DIR
  stage-comfyui-satellite.py verify DIR
  stage-comfyui-satellite.py --self-test

The Comfy Registry reads `pyproject.toml` at the root of a repository, and ComfyUI Manager clones
that whole repository into `custom_nodes/`. The node therefore lives in a small repository of its
own, qrcode-ai-com/qrcode-barcode-scanner-comfyui, whose content is never edited by hand: `stage`
writes it from `integrations/comfyui` at one commit of this repository. scripts/python_satellite_stage.py
says what a stage holds.
"""
import sys

from python_satellite_stage import Satellite, main

COMFYUI = Satellite(
    name="stage-comfyui-satellite",
    slug="qrcode-ai-com/qrcode-barcode-scanner-comfyui",
    package="integrations/comfyui",
    schema="qrscan-comfyui-stage/1",
    required=("pyproject.toml", "__init__.py", "qrscan_node.py", "requirements.txt", ".comfyignore",
              "README.md", ".github/workflows/tests.yml", ".github/workflows/publish.yml"),
    edited="qrscan_node.py",
)

if __name__ == "__main__":
    sys.exit(main(COMFYUI, __doc__.split("\n\n")[0]))
