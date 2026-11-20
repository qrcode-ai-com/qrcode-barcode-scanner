"""Where the tests find the scanner fixtures, in the engine repository or in the node's own one."""
import importlib.util
import os
import pathlib
import sys

import pytest

NODE_ROOT = pathlib.Path(__file__).resolve().parents[1]
QR = "https://qrc-ai.com/76xMa"
CODE128 = "STOCK-4827"
MIXED = "symbology/mixed-code128-qr.png"


def fixtures_root():
    """QRSCAN_FIXTURES, else tests/fixtures (the node repository), else the engine's fixtures/."""
    if os.environ.get("QRSCAN_FIXTURES"):
        return pathlib.Path(os.environ["QRSCAN_FIXTURES"])
    staged = NODE_ROOT / "tests" / "fixtures"
    if staged.is_dir():
        return staged
    for parent in NODE_ROOT.parents:
        if (parent / "fixtures" / "consumer-truth.json").is_file():
            return parent / "fixtures"
    raise RuntimeError("no scanner fixtures found: set QRSCAN_FIXTURES")


@pytest.fixture
def fixture():
    return lambda name: fixtures_root() / name


@pytest.fixture
def mixed_image():
    """The mixed sample: the staged copy of the acceptance run when there is one."""
    staged = os.environ.get("QRSCAN_ACCEPTANCE_IMAGE")
    return pathlib.Path(staged) if staged else fixtures_root() / MIXED


@pytest.fixture(scope="session")
def node_package():
    """The node folder imported the way ComfyUI imports a custom node: as a package, by path."""
    spec = importlib.util.spec_from_file_location(
        "qrcode_barcode_scanner_nodes", NODE_ROOT / "__init__.py", submodule_search_locations=[str(NODE_ROOT)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module
