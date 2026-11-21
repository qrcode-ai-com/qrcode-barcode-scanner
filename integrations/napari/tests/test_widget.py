"""The widget function on napari layers, its manifest as napari discovers it, and its generated GUI.

No window is opened: napari's Qt window is the host application. The widget function runs on
napari's own layer classes and its headless ViewerModel, the model behind the window.
"""
import hashlib
import inspect
import json
import os
import pathlib
import re

import napari
import numpy as np
import pytest
import qrcode_barcode_scanner
from magicgui.type_map import get_widget_class
from napari.components import ViewerModel
from napari.layers import Image, Layer
from npe2 import PluginManifest
from npe2.manifest.utils import import_python_name

import napari_qrcode_barcode_scanner as plugin
from napari_qrcode_barcode_scanner import _widget

from conftest import CODE128, PLUGIN_ROOT, QR

PROFILES = ("fast", "frame", "full")


@pytest.fixture
def notes(monkeypatch):
    shown = []
    monkeypatch.setattr(_widget, "notify", shown.append)
    return shown


def as_layer(result):
    data, meta, kind = result
    return Layer.create(data, meta, kind)


def scan_in_viewer(viewer, image, **options):
    """The widget's call: napari passes the chosen layer, the form's values and its viewer."""
    plugin.scan_codes(image, viewer=viewer, **options)
    return viewer.layers[f"{image.name} codes"] if f"{image.name} codes" in viewer.layers else None


@pytest.mark.parametrize("profile", PROFILES)
def test_the_mixed_sample_is_outlined_with_both_codes(mixed_rgb, notes, profile):
    viewer = ViewerModel()
    image = viewer.add_image(mixed_rgb, name="mixed")
    layer = scan_in_viewer(viewer, image, profile=profile, budget_ms=0)
    assert [type(each).__name__ for each in viewer.layers] == ["Image", "Shapes"]
    assert layer.name == "mixed codes"
    assert list(layer.features["text"]) == [QR, CODE128]
    assert list(layer.features["symbology"]) == ["qr_code", "code128"]
    assert layer.shape_type == ["polygon", "line"]
    report = layer.metadata["qrcode_barcode_scanner"]
    assert report["trace"]["budget_exhausted"] is False and report["trace"]["engine_panics"] == 0
    assert report["versions"]["scanner"] == "0.11.0"
    assert (report["score"] is None) == (profile == "frame")
    # The outline is the engine's geometry in napari's (row, column) order.
    quad = report["detections"][0]["occurrences"][0]["geometry"]["points"]
    np.testing.assert_allclose(layer.data[0], [[p["y"], p["x"]] for p in quad])
    assert notes == [f"mixed: 2 code(s) found. qr_code: {QR}; code128: {CODE128}"]


def test_the_layer_pixels_reach_the_engine_unchanged(mixed_rgb, mixed_path, notes):
    image = Image(mixed_rgb)
    rgba, width, height = _widget.to_rgba(image)
    assert (width, height) == (mixed_rgb.shape[1], mixed_rgb.shape[0])
    pixels = np.frombuffer(rgba, np.uint8).reshape(height, width, 4)
    np.testing.assert_array_equal(pixels[..., :3], mixed_rgb)
    assert (pixels[..., 3] == 255).all()
    frame = qrcode_barcode_scanner.scan_frame(rgba, width, height, profile="fast")
    file = qrcode_barcode_scanner.scan(mixed_path.read_bytes(), "fast")
    assert [d["content"]["text"] for d in frame["detections"]] == [d["content"]["text"] for d in file["detections"]]


def test_grey_and_float_layers_are_read_through_their_contrast_limits(mixed_rgb, notes):
    grey = mixed_rgb.mean(axis=-1)
    for data, limits in ((grey.astype(np.uint8), None), (grey / 255.0, None), (grey.astype(np.uint16) * 200, None),
                         (grey.astype(np.float32) + 1000.0, (1000.0, 1255.0))):
        image = Image(data, contrast_limits=limits) if limits else Image(data)
        layer = as_layer(plugin.scan_layer(image))
        assert list(layer.features["text"]) == [QR, CODE128], (data.dtype, image.contrast_limits)
    rgba = np.concatenate([mixed_rgb, np.full(mixed_rgb.shape[:2] + (1,), 255, np.uint8)], axis=-1)
    assert list(as_layer(plugin.scan_layer(Image(rgba))).features["text"]) == [QR, CODE128]


def test_the_scan_leaves_the_image_layer_untouched(mixed_rgb, notes):
    image = Image(mixed_rgb, name="mixed", scale=(0.5, 2.0), translate=(10.0, -4.0))
    before = hashlib.sha256(image.data.tobytes()).hexdigest(), image.contrast_limits
    layer = as_layer(plugin.scan_layer(image))
    assert (hashlib.sha256(image.data.tobytes()).hexdigest(), image.contrast_limits) == before
    # The outlines share the image's transform, so they sit on the codes.
    np.testing.assert_allclose(layer.scale, image.scale)
    np.testing.assert_allclose(layer.translate, image.translate)


def test_a_new_scan_replaces_the_codes_layer_and_no_code_removes_it(mixed_rgb, notes):
    viewer = ViewerModel()
    image = viewer.add_image(mixed_rgb, name="sample")
    first = scan_in_viewer(viewer, image)
    again = scan_in_viewer(viewer, image, profile="frame")
    assert again is not first and len(viewer.layers) == 2 and len(again.data) == 2
    image.data = np.full((48, 64, 3), 255, np.uint8)
    assert scan_in_viewer(viewer, image) is None
    assert [layer.name for layer in viewer.layers] == ["sample"]
    assert notes[-1] == "sample: no QR code or barcode found."
    # Called from a script, without a viewer, it only reports.
    plugin.scan_codes(Image(mixed_rgb, name="script"))
    assert notes[-1].startswith("script: 2 code(s) found.")


def test_a_stack_is_refused_with_a_way_out(notes):
    with pytest.raises(ValueError, match=r"has 3 dimensions.*Split Stack"):
        plugin.scan_codes(Image(np.zeros((2, 32, 32), np.uint8), name="stack"))
    with pytest.raises(ValueError, match="select an image layer"):
        plugin.scan_codes(None)


def test_bad_options_and_oversized_images_are_refused(mixed_rgb, notes):
    image = Image(mixed_rgb)
    with pytest.raises(ValueError, match="Unknown profile"):
        plugin.scan_codes(image, profile="slow")
    with pytest.raises(ValueError, match="budget_ms must be"):
        plugin.scan_codes(image, budget_ms=600_001)
    with pytest.raises(ValueError, match=r"\[QRS-\d{3}\]"):
        plugin.scan_codes(Image(np.zeros((8, 10_001), np.uint8)))


def test_a_budget_cut_says_the_result_is_not_final(mixed_rgb, notes):
    _, meta, _ = plugin.scan_layer(Image(mixed_rgb, name="m"), profile="full", budget_ms=1)
    report = meta["metadata"]["qrcode_barcode_scanner"]
    assert ("not final" in _widget.summary("m", report)) is report["trace"]["budget_exhausted"]
    cut = dict(report, trace=dict(report["trace"], budget_exhausted=True))
    assert _widget.summary("m", cut).endswith("The time budget cut the scan, so this result is not final.")


def test_napari_discovers_the_installed_manifest():
    manifest = PluginManifest.from_distribution("napari-qrcode-barcode-scanner")
    source = PluginManifest.from_file(PLUGIN_ROOT / "src/napari_qrcode_barcode_scanner/napari.yaml")
    assert manifest.name == source.name == "napari-qrcode-barcode-scanner"
    assert manifest.package_version == plugin.__version__ == "0.1.0"
    [command] = manifest.contributions.commands
    assert command.python_name == "napari_qrcode_barcode_scanner._widget:scan_codes"
    assert import_python_name(command.python_name) is plugin.scan_codes
    [widget] = manifest.contributions.widgets
    assert widget.autogenerate and widget.command == command.id
    assert [str(category) for category in manifest.categories] == ["Measurement", "Utilities"]


def test_the_generated_gui_has_a_layer_picker_a_profile_menu_and_a_bounded_budget():
    """The widget classes magicgui picks for each parameter, as napari's autogenerate does."""
    parameters = inspect.signature(plugin.scan_codes).parameters
    # The annotation is the string napari's plugin guide uses; magicgui resolves it by import.
    assert parameters["image"].annotation == "napari.layers.Image"
    image_class, image_options = get_widget_class(annotation=parameters["image"].annotation)
    assert image_class.__name__ == "ComboBox" and callable(image_options["choices"])
    profile_class, profile_options = get_widget_class(annotation=parameters["profile"].annotation)
    assert profile_class.__name__ == "ComboBox" and list(profile_options["choices"]) == list(PROFILES)
    budget_class, budget_options = get_widget_class(annotation=parameters["budget_ms"].annotation)
    assert budget_class.__name__ == "SpinBox"
    # napari binds its viewer to this parameter, so the form shows no field for it.
    viewer_class, viewer_options = get_widget_class(annotation=parameters["viewer"].annotation)
    assert parameters["viewer"].annotation == "napari.viewer.Viewer" and "bind" in viewer_options
    assert (budget_options["min"], budget_options["max"]) == (0, _widget.MAX_BUDGET_MS)
    assert parameters["profile"].default == "fast" and parameters["budget_ms"].default == 0


def test_the_package_metadata_follows_the_napari_hub_rules():
    import tomllib

    project = tomllib.loads((PLUGIN_ROOT / "pyproject.toml").read_text())["project"]
    assert "Framework :: napari" in project["classifiers"]
    assert project["entry-points"]["napari.manifest"] == {
        "napari-qrcode-barcode-scanner": "napari_qrcode_barcode_scanner:napari.yaml"}
    assert "qrcode-barcode-scanner==0.11.0" in project["dependencies"]
    assert not any(dep.split("[")[0].startswith(("napari", "PyQt", "PySide")) for dep in project["dependencies"])
    assert project["license"] == "MIT"
    # The hub's GitHub link is read from Homepage or "Source Code", a repository root only.
    assert re.fullmatch(r"https://github\.com/[^/]+/[^/]+", project["urls"]["Source Code"])
    assert all(url.startswith("https://") for url in project["urls"].values())
    manifest = PluginManifest.from_file(PLUGIN_ROOT / "src/napari_qrcode_barcode_scanner/napari.yaml")
    assert (manifest.display_name, str(manifest.visibility)) == ("QR Code & Barcode Scanner", "public")


def test_the_acceptance_reports_are_written_through_the_widget(mixed_rgb, notes):
    """Three reports for scripts/destination-acceptance.py, when an acceptance run asks for them."""
    out_dir = os.environ.get("QRSCAN_ACCEPTANCE_DIR")
    if not out_dir:
        pytest.skip("QRSCAN_ACCEPTANCE_DIR is not set")
    pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)
    for profile in PROFILES:
        _, meta, _ = plugin.scan_layer(Image(mixed_rgb), profile=profile)
        report = meta["metadata"]["qrcode_barcode_scanner"]
        (pathlib.Path(out_dir) / f"{profile}.json").write_text(json.dumps(report), encoding="utf-8")
