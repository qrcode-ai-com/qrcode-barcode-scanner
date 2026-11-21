"""The Replicate runner through Cog's own Python SDK, without Docker.

`Runner.run` is called the way Cog's server calls it, with every input given. The image build and
the predictions through `cog run` are the workflow integration-replicate.yml's other job.
"""
import json
import pathlib
import struct
import zlib

import pytest
import qrcode_barcode_scanner
import yaml
from cog import BaseRunner, Path

from conftest import MODEL_ROOT, kit

PROFILES = ("fast", "frame", "full")


def png(width, height, value=255):
    """A plain grey PNG, built here so that the tests need no image package."""
    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))
    row = b"\x00" + bytes([value]) * width
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(row * height)) + chunk(b"IEND", b""))


def run(runner, image, profile="fast", budget_ms=0):
    return runner.run(image=Path(image), profile=profile, budget_ms=budget_ms)


def test_the_runner_is_the_class_cog_yaml_names(model):
    config = yaml.safe_load((MODEL_ROOT / "cog.yaml").read_text())
    assert config["run"] == "run.py:Runner"
    assert issubclass(model.Runner, BaseRunner)
    assert config["build"] == {"gpu": False, "python_version": "3.13", "python_requirements": "requirements.txt",
                               "sdk_version": "0.23.1"}
    assert config["image"] == "r8.im/qrcode-ai-com/qrcode-barcode-scanner"
    assert set(config) == {"build", "image", "run"}


def test_the_requirements_pin_the_published_engine():
    assert (MODEL_ROOT / "requirements.txt").read_text().split() == ["qrcode-barcode-scanner==0.11.0"]
    assert qrcode_barcode_scanner.__version__ == kit.ENGINE_VERSION == "0.11.0"


@pytest.mark.parametrize("profile", PROFILES)
def test_the_mixed_fixture_gives_both_codes_in_each_profile(runner, mixed_path, profile):
    report = run(runner, mixed_path, profile)
    kit.assert_mixed(report, profile)
    assert kit.found(report) == list(kit.EXPECTED)


@pytest.mark.parametrize("profile", PROFILES)
def test_the_report_is_the_engine_report_unchanged_and_json(runner, mixed_path, profile):
    report = run(runner, mixed_path, profile)
    direct = qrcode_barcode_scanner.scan(mixed_path.read_bytes(), profile, max_dimension=4096,
                                         max_pixels=16_000_000, budget_ms=0)
    text = json.dumps(report)  # what Cog sends back as the prediction's output
    assert json.loads(text)["detections"] == json.loads(json.dumps(direct["detections"]))
    assert set(report) == set(direct)


def test_the_profile_budget_is_kept_when_no_budget_is_given(runner, mixed_path):
    report = runner.run(image=Path(mixed_path), profile="full", budget_ms=None)
    assert report["versions"]["scanner"] == "0.11.0"
    assert isinstance(report["trace"]["budget_exhausted"], bool)
    if not report["trace"]["budget_exhausted"]:
        assert kit.found(report) == list(kit.EXPECTED)


def test_an_image_without_a_code_is_an_empty_success(runner, tmp_path):
    blank = tmp_path / "blank.png"
    blank.write_bytes(png(64, 48))
    report = run(runner, blank, "full")
    assert report["detections"] == [] and report["trace"]["budget_exhausted"] is False


def test_a_file_that_is_not_an_image_fails_with_its_code(runner, tmp_path):
    notes = tmp_path / "notes.png"
    notes.write_bytes(b"this is not an image")
    with pytest.raises(ValueError, match=r"\[QRS-001\]"):
        run(runner, notes)


def test_an_empty_file_fails_before_the_scan(runner, tmp_path):
    empty = tmp_path / "empty.png"
    empty.write_bytes(b"")
    with pytest.raises(ValueError, match="The file is empty"):
        run(runner, empty)


def test_a_file_above_eight_mib_is_refused_before_it_is_read_whole(runner, model, tmp_path):
    big = tmp_path / "big.png"
    big.write_bytes(b"\0" * (model.MAX_BYTES + 1))
    with pytest.raises(ValueError, match="larger than 8388608 bytes"):
        run(runner, big)


def test_an_image_wider_than_4096_pixels_is_refused_by_the_engine(runner, tmp_path):
    wide = tmp_path / "wide.png"
    wide.write_bytes(png(4097, 8))
    with pytest.raises(ValueError, match=r"\[QRS-\d{3}\]"):
        run(runner, wide)


def test_bad_options_are_refused(runner, mixed_path):
    with pytest.raises(ValueError, match="Unknown profile"):
        run(runner, mixed_path, profile="slow")
    for budget in (-1, 60_001, True):
        with pytest.raises(ValueError, match="budget_ms must be"):
            run(runner, mixed_path, budget_ms=budget)


def test_the_inputs_cog_publishes(model):
    """The defaults and bounds of each input, as Cog reads them from run()'s signature."""
    import inspect

    parameters = inspect.signature(model.Runner.run).parameters
    assert list(parameters) == ["self", "image", "profile", "budget_ms"]
    profile, budget = parameters["profile"].default, parameters["budget_ms"].default
    assert profile.default == "fast" and list(profile.choices) == list(PROFILES)
    assert budget.default is None and (budget.ge, budget.le) == (0, 60_000)
    assert parameters["image"].annotation is Path
    assert all(parameters[name].default.description for name in ("image", "profile", "budget_ms"))


def test_every_input_keyword_is_a_literal_cog_build_can_read():
    """Cog 0.23 builds the schema from run.py's source: a name, a call or joined strings are lost."""
    import ast

    source = (MODEL_ROOT / "run.py").read_text()
    calls = [node for node in ast.walk(ast.parse(source))
             if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "Input"]
    assert len(calls) == 3
    for call in calls:
        for keyword in call.keywords:
            value = keyword.value
            literal = isinstance(value, ast.Constant) or (
                isinstance(value, ast.List) and all(isinstance(item, ast.Constant) for item in value.elts))
            assert literal, f"{keyword.arg} is not a literal"
            if keyword.arg == "description":
                text = ast.get_source_segment(source, value)
                assert text == '"' + value.value + '"', f"the description {text[:40]} is not one string"


def test_the_acceptance_reports_are_written_through_the_runner(runner, mixed_path):
    """Three reports for scripts/destination-acceptance.py, when an acceptance run asks for them."""
    written = kit.write_acceptance_reports(lambda profile: run(runner, mixed_path, profile))
    if written is None:
        pytest.skip("QRSCAN_ACCEPTANCE_DIR is not set")
    assert [path.name for path in written] == ["fast.json", "frame.json", "full.json"]
    for path, profile in zip(written, PROFILES):
        kit.assert_mixed(json.loads(pathlib.Path(path).read_text()), profile)
