"""The node through its own entry point, with real torch tensors and the published engine wheel."""
import hashlib
import importlib.util
import json
import os
import pathlib
import re
import tomllib

import numpy as np
import pytest
import qrcode_barcode_scanner
import torch
from PIL import Image, ImageOps

from conftest import CODE128, NODE_ROOT, QR

PROFILES = ("fast", "frame", "full")


def load_image(path):
    """What ComfyUI's LoadImage gives a node: [1, H, W, 3] float32 in 0..1."""
    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    return torch.from_numpy(np.array(image).astype(np.float32) / 255.0)[None,]


def run(node_package, image, **inputs):
    node = node_package.NODE_CLASS_MAPPINGS["QRCodeAIScanCodes"]()
    output = node.scan(image, **inputs)
    texts, report_json, matches, count = output["result"]
    return texts, json.loads(report_json), matches, count, output["ui"]["text"][0]


def contents(report):
    return sorted((row["symbology"], row["content"]["text"]) for row in report["detections"])


def test_the_package_registers_one_node_with_consistent_outputs(node_package):
    assert set(node_package.NODE_CLASS_MAPPINGS) == {"QRCodeAIScanCodes"}
    assert node_package.NODE_DISPLAY_NAME_MAPPINGS == {"QRCodeAIScanCodes": "Scan QR Codes and Barcodes"}
    node = node_package.NODE_CLASS_MAPPINGS["QRCodeAIScanCodes"]
    inputs = node.INPUT_TYPES()
    assert list(inputs["required"]) == ["image", "profile", "budget_ms"]
    assert inputs["required"]["image"][0] == "IMAGE"
    assert inputs["required"]["profile"][0] == list(PROFILES)
    assert inputs["required"]["profile"][1]["default"] == "fast"
    assert inputs["required"]["budget_ms"][0] == "INT"
    assert inputs["optional"]["expected_text"][0] == "STRING"
    assert node.RETURN_TYPES == ("STRING", "STRING", "BOOLEAN", "INT")
    assert len(node.RETURN_NAMES) == len(node.RETURN_TYPES) == len(node.OUTPUT_TOOLTIPS)
    assert callable(getattr(node, node.FUNCTION))
    assert node.OUTPUT_NODE is True


def test_the_folder_imported_as_a_lone_module_loads_and_registers_nothing():
    """What pytest does before it runs tests/ in a clone whose folder name has dashes."""
    spec = importlib.util.spec_from_file_location(
        "__init__", NODE_ROOT / "__init__.py", submodule_search_locations=None)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.__package__ == ""
    assert not hasattr(module, "NODE_CLASS_MAPPINGS")


@pytest.mark.parametrize("profile", PROFILES)
def test_the_mixed_sample_returns_both_codes_exactly_once(node_package, mixed_image, profile):
    texts, reports, matches, count, display = run(node_package, load_image(mixed_image), profile=profile)
    assert len(reports) == 1
    report = reports[0]
    assert contents(report) == [("code128", CODE128), ("qr_code", QR)]
    assert report["detections"][0]["symbology"] == "qr_code"
    assert report["trace"]["budget_exhausted"] is False
    assert report["trace"]["engine_panics"] == 0
    assert report["versions"]["scanner"] == "0.11.0"
    assert (report["score"] is None) == (profile == "frame")
    assert texts.split("\n") == [QR, CODE128]
    assert (matches, count) == (True, 2)
    assert display == f"image 1: 2 found: qr_code {QR!r}, code128 {CODE128!r}"


def test_the_tensor_path_gives_the_engine_the_exact_pixels_of_the_file(node_package, mixed_image):
    rgba, width, height = node_package.qrscan_node.to_rgba(load_image(mixed_image)[0])
    expected = Image.open(mixed_image).convert("RGBA")
    assert (width, height) == expected.size == (1666, 1120)
    assert rgba == expected.tobytes()
    # The same pixels as a file scan, so the same report but for the clock.
    from_file = qrcode_barcode_scanner.scan(mixed_image.read_bytes(), "frame", budget_ms=0)
    from_tensor = qrcode_barcode_scanner.scan_frame(rgba, width, height, "frame", budget_ms=0)
    assert from_tensor["detections"] == from_file["detections"]


def test_a_batch_of_two_images_returns_two_reports_in_order(node_package, mixed_image, fixture):
    first = load_image(mixed_image)
    second = load_image(fixture("clean/gen_v5_q.png"))
    # A batch holds images of one size: pad the small one onto a white canvas.
    canvas = torch.ones_like(first)
    canvas[0, : second.shape[1], : second.shape[2], :] = second[0]
    texts, reports, matches, count, display = run(node_package, torch.cat([first, canvas]), profile="fast")
    assert [contents(report) for report in reports] == [
        [("code128", CODE128), ("qr_code", QR)], [("qr_code", "https://qrcode-ai.com/c/v5q")]]
    assert texts.split("\n") == [QR, CODE128, "https://qrcode-ai.com/c/v5q"]
    assert (matches, count) == (True, 3)
    assert display.splitlines()[1] == "image 2: 1 found: qr_code 'https://qrcode-ai.com/c/v5q'"


def test_an_image_with_no_code_is_an_empty_result_not_an_error(node_package):
    blank = torch.ones((1, 64, 96, 3), dtype=torch.float32)
    texts, reports, matches, count, display = run(node_package, blank, profile="full", expected_text="x")
    assert reports[0]["detections"] == [] and reports[0]["trace"]["budget_exhausted"] is False
    assert reports[0]["score"] is None
    assert (texts, matches, count) == ("", False, 0)
    assert display == "image 1: no code found"


def test_the_expected_text_must_be_held_by_every_image(node_package, mixed_image, fixture):
    image = load_image(mixed_image)
    assert run(node_package, image, expected_text=CODE128)[2] is True
    assert run(node_package, image, expected_text=QR)[2] is True
    assert run(node_package, image, expected_text="STOCK-4828")[2] is False
    assert run(node_package, image, expected_text="stock-4827")[2] is False
    blank = torch.ones_like(image)
    assert run(node_package, torch.cat([image, blank]), expected_text=CODE128)[2] is False


def test_values_are_clamped_rounded_and_other_dtypes_are_read(node_package, mixed_image):
    to_rgba = node_package.qrscan_node.to_rgba
    exact, _, _ = to_rgba(load_image(mixed_image)[0])
    noisy = load_image(mixed_image)[0] * 1.0004 - 0.0001  # within half a level of each 8-bit value
    assert to_rgba(noisy)[0] == exact
    odd = torch.tensor([[[-0.5, 1.7, float("nan")], [0.5, float("inf"), float("-inf")]]])
    assert list(to_rgba(odd)[0]) == [0, 255, 0, 255, 128, 255, 0, 255]
    for dtype in (torch.float16, torch.bfloat16, torch.float64):
        texts = run(node_package, load_image(mixed_image).to(dtype), profile="frame")[0]
        assert texts.split("\n") == [QR, CODE128], dtype
    gray = load_image(mixed_image)[..., :1]
    assert run(node_package, gray, profile="frame")[0].split("\n") == [QR, CODE128]
    rgba = torch.cat([load_image(mixed_image), torch.ones((1, 1120, 1666, 1))], dim=3)
    assert run(node_package, rgba, profile="frame")[0].split("\n") == [QR, CODE128]


def test_the_source_tensor_is_left_unchanged(node_package, mixed_image):
    image = load_image(mixed_image) * 1.2 - 0.1  # out of range on purpose: clamping must not write back
    before = hashlib.sha256(image.numpy().tobytes()).hexdigest()
    run(node_package, image, profile="frame")
    assert hashlib.sha256(image.numpy().tobytes()).hexdigest() == before


def test_invalid_and_oversized_input_is_refused_with_a_clear_error(node_package):
    node = node_package.NODE_CLASS_MAPPINGS["QRCodeAIScanCodes"]()
    with pytest.raises(ValueError, match=r"expected 1, 3 or 4 channels, got 2"):
        node.scan(torch.zeros((1, 8, 8, 2)))
    with pytest.raises(ValueError, match="the image is empty"):
        node.scan(torch.zeros((1, 0, 8, 3)))
    with pytest.raises(ValueError, match="expected an IMAGE batch"):
        node.scan(torch.zeros((1, 1, 8, 8, 3)))
    with pytest.raises(ValueError, match=r"image 1 of the batch: .*\[QRS-\d{3}\]"):
        node.scan(torch.ones((1, 1, 10_001, 3)), profile="frame")
    with pytest.raises(ValueError, match="unknown profile"):
        node.scan(torch.ones((1, 8, 8, 3)), profile="slow")
    with pytest.raises(ValueError, match="budget_ms must be between"):
        node.scan(torch.ones((1, 8, 8, 3)), budget_ms=-1)


def test_the_example_workflow_runs_through_the_node(node_package, mixed_image):
    """The API-format workflow: LoadImage of the sample, then this node. Executed node by node."""
    workflow = json.loads((NODE_ROOT / "workflows/scan-mixed-fixture.json").read_text())
    assert {node["class_type"] for node in workflow.values()} == {"LoadImage", "QRCodeAIScanCodes"}
    loader = next(key for key, node in workflow.items() if node["class_type"] == "LoadImage")
    assert workflow[loader]["inputs"]["image"] == "mixed-code128-qr.png"
    scan = next(node for node in workflow.values() if node["class_type"] == "QRCodeAIScanCodes")
    inputs = dict(scan["inputs"])
    assert inputs.pop("image") == [loader, 0]
    declared = node_package.NODE_CLASS_MAPPINGS["QRCodeAIScanCodes"].INPUT_TYPES()
    assert set(inputs) <= set(declared["required"]) | set(declared["optional"])
    texts, reports, matches, count, _ = run(node_package, load_image(mixed_image), **inputs)
    assert (texts.split("\n"), matches, count) == ([QR, CODE128], True, 2)


def test_the_registry_metadata_follows_the_comfy_specification():
    project = tomllib.loads((NODE_ROOT / "pyproject.toml").read_text())
    name = project["project"]["name"]
    assert re.fullmatch(r"[A-Za-z][A-Za-z0-9]*(?:[-_.][A-Za-z0-9]+)*", name) and len(name) < 100
    assert "comfyui" not in name.lower()
    assert re.fullmatch(r"\d+\.\d+\.\d+", project["project"]["version"])
    assert project["project"]["license"] == {"file": "LICENSE"}
    assert project["project"]["urls"]["Repository"] == "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-comfyui"
    assert project["project"]["dynamic"] == ["dependencies"]
    assert project["tool"]["setuptools"]["dynamic"]["dependencies"] == {"file": ["requirements.txt"]}
    comfy = project["tool"]["comfy"]
    assert comfy["PublisherId"] == "qrcode-ai-com"
    assert comfy["DisplayName"] == "QR Code & Barcode Scanner"
    assert comfy["Icon"].startswith("https://raw.githubusercontent.com/qrcode-ai-com/")
    requirements = (NODE_ROOT / "requirements.txt").read_text().split()
    assert requirements == [f"qrcode-barcode-scanner=={qrcode_barcode_scanner.__version__}"] == [
        "qrcode-barcode-scanner==0.11.0"]
    # The registry standards: no install at run time, no dynamic code.
    for source in NODE_ROOT.glob("*.py"):
        text = source.read_text()
        assert not re.search(r"\b(eval|exec|subprocess|pip)\b", text), source.name


def test_the_acceptance_reports_are_written_through_the_node(node_package, mixed_image):
    """Three reports for scripts/destination-acceptance.py, when an acceptance run asks for them."""
    out = os.environ.get("QRSCAN_ACCEPTANCE_DIR")
    if not out:
        pytest.skip("QRSCAN_ACCEPTANCE_DIR is not set")
    pathlib.Path(out).mkdir(parents=True, exist_ok=True)
    for profile in PROFILES:
        reports = run(node_package, load_image(mixed_image), profile=profile, budget_ms=0)[1]
        (pathlib.Path(out) / f"{profile}.json").write_text(json.dumps(reports[0]), encoding="utf-8")
