"""Fixtures for the plugin tests: the scanner's sample images as napari layers would hold them."""
import os
import pathlib

import numpy as np
import pytest
from PIL import Image

PLUGIN_ROOT = pathlib.Path(__file__).resolve().parents[1]
QR = "https://qrc-ai.com/76xMa"
CODE128 = "STOCK-4827"
MIXED = "symbology/mixed-code128-qr.png"


def fixtures_root():
    """QRSCAN_FIXTURES, else tests/fixtures (a staged copy), else the engine's fixtures/."""
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
def mixed_path():
    """The mixed sample: the staged copy of the acceptance run when there is one."""
    staged = os.environ.get("QRSCAN_ACCEPTANCE_IMAGE")
    return pathlib.Path(staged) if staged else fixtures_root() / MIXED


@pytest.fixture
def mixed_rgb(mixed_path):
    """The mixed sample as napari's image reader gives it: an (H, W, 3) uint8 array."""
    return np.asarray(Image.open(mixed_path).convert("RGB"))
