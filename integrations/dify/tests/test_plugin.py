"""The plugin through the SDK: its declaration as the runtime loads it, and the tool's invoke."""
import io
import json
import os
import pathlib
import re

import pytest
import qrcode_barcode_scanner
import yaml
from dify_plugin import DifyPluginEnv
from dify_plugin.core.plugin_registration import PluginRegistration
from dify_plugin.entities.tool import ToolRuntime
from dify_plugin.file.constants import DIFY_FILE_IDENTITY
from PIL import Image

from conftest import CODE128, PLUGIN_ROOT, QR

PROFILES = ("fast", "frame", "full")
# The plugin daemon's rules (pkg/entities/plugin_entities/plugin_declaration.go, manifest_entities/tags.go).
DAEMON_NAME = re.compile(r"^[a-z0-9_-]{1,128}$")
DAEMON_AUTHOR = re.compile(r"^[a-z0-9_-]{1,64}$")
DAEMON_TAGS = {"search", "image", "videos", "weather", "finance", "design", "travel", "social", "news",
               "medical", "productivity", "education", "business", "entertainment", "utilities", "agent",
               "rag", "other", "trigger"}


@pytest.fixture
def registration(in_plugin_root):
    """Exactly what the plugin runtime loads at start: manifest, provider, tool and their classes."""
    return PluginRegistration(DifyPluginEnv())


@pytest.fixture
def tool(registration):
    provider, provider_class, tools = registration.tools_mapping["qrcode_barcode_scanner"]
    declaration, tool_class = tools["scan_image"]
    return tool_class(runtime=ToolRuntime(credentials={}, user_id="test", session_id="test"), session=None)


def as_file(url, name="image.png", mime="image/png", size=None):
    """A file parameter as Dify sends it over the wire, before the SDK turns it into a File."""
    return {"dify_model_identity": DIFY_FILE_IDENTITY, "url": url, "mime_type": mime, "type": "image",
            "filename": name, "extension": "." + name.rsplit(".", 1)[-1], "size": size}


def invoke(tool, **parameters):
    """The tool's messages, by kind: text, json and the variables."""
    out = {"text": [], "json": [], "variables": {}}
    for message in tool.invoke(parameters):
        kind = message.type.value
        if kind == "text":
            out["text"].append(message.message.text)
        elif kind == "json":
            out["json"].append(message.message.json_object)
        elif kind == "variable":
            out["variables"][message.message.variable_name] = message.message.variable_value
        else:
            raise AssertionError(f"unexpected message type {kind}")
    return out


def png(width, height, color="white"):
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_the_runtime_loads_the_declaration_and_the_classes(registration):
    manifest = registration.configuration
    assert (manifest.author, manifest.name, manifest.version) == ("qrcode-ai-com", "qrcode-barcode-scanner", "0.1.0")
    assert [arch.value for arch in manifest.meta.arch] == ["amd64", "arm64"]
    assert (manifest.meta.runner.language.value, manifest.meta.runner.version,
            manifest.meta.runner.entrypoint) == ("python", "3.12", "main")
    provider, provider_class, tools = registration.tools_mapping["qrcode_barcode_scanner"]
    assert list(tools) == ["scan_image"]
    declaration, tool_class = tools["scan_image"]
    assert [parameter.name for parameter in declaration.parameters] == ["image", "profile", "budget_ms"]
    assert declaration.parameters[0].type.value == "file" and declaration.parameters[0].required
    assert [option.value for option in declaration.parameters[1].options] == list(PROFILES)
    assert set(declaration.output_schema["properties"]) == {"texts", "count", "complete"}
    assert provider_class().validate_credentials({}) is None
    assert {asset.filename for asset in registration.files} == {"icon.svg"}


def test_the_manifest_meets_the_daemon_and_marketplace_rules():
    manifest = yaml.safe_load((PLUGIN_ROOT / "manifest.yaml").read_text())
    assert DAEMON_NAME.match(manifest["name"]) and DAEMON_AUTHOR.match(manifest["author"])
    assert set(manifest["tags"]) <= DAEMON_TAGS
    assert manifest["type"] == "plugin" and manifest["meta"]["version"] == "0.0.1"
    assert (PLUGIN_ROOT / manifest["privacy"]).is_file()
    assert (PLUGIN_ROOT / "_assets" / manifest["icon"]).is_file()
    assert manifest["repo"] == "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-dify"
    # The marketplace validator (dify-marketplace-toolkit, checks/manifest.py) blocks a package
    # whose manifest has no contact email.
    assert re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]+", manifest["contact"])
    assert "permission" not in manifest["resource"], "the plugin calls back into nothing in Dify"
    for path in manifest["plugins"]["tools"]:
        assert (PLUGIN_ROOT / path).is_file()
    assert (PLUGIN_ROOT / "README.md").is_file()
    requirements = (PLUGIN_ROOT / "requirements.txt").read_text().split()
    assert requirements == ["dify_plugin==0.11.1", f"qrcode-barcode-scanner=={qrcode_barcode_scanner.__version__}"]
    assert requirements[1] == "qrcode-barcode-scanner==0.11.0"
    assert not (PLUGIN_ROOT / "pyproject.toml").exists(), "the daemon would prefer it to requirements.txt"
    ignored = (PLUGIN_ROOT / ".difyignore").read_text().split()
    assert {"tests/", "template/", "mirror/", ".env"} <= set(ignored)
    # The packaged icon is the engine's mark.
    engine_mark = next((parent / "docs/favicon.svg" for parent in PLUGIN_ROOT.parents
                        if (parent / "docs/favicon.svg").is_file()), None)
    if engine_mark is not None:
        assert (PLUGIN_ROOT / "_assets/icon.svg").read_bytes() == engine_mark.read_bytes()


@pytest.mark.parametrize("profile", PROFILES)
def test_the_mixed_sample_returns_both_codes_through_invoke(tool, files, mixed_image, profile):
    url = files("mixed.png", mixed_image.read_bytes())
    out = invoke(tool, image=as_file(url, "mixed.png"), profile=profile, budget_ms=0)
    assert out["text"] == [f"Found 2 codes. qr_code: {QR}; code128: {CODE128}"]
    [report] = out["json"]
    assert sorted((row["symbology"], row["content"]["text"]) for row in report["detections"]) == [
        ("code128", CODE128), ("qr_code", QR)]
    assert report["trace"]["budget_exhausted"] is False and report["trace"]["engine_panics"] == 0
    assert report["versions"]["scanner"] == "0.11.0"
    assert (report["score"] is None) == (profile == "frame")
    assert out["variables"] == {"texts": [QR, CODE128], "count": 2, "complete": True}
    # The JSON message is the engine's report, unchanged.
    direct = qrcode_barcode_scanner.scan(mixed_image.read_bytes(), profile, budget_ms=0)
    assert report["detections"] == direct["detections"]


def test_the_defaults_are_the_fast_profile_with_no_budget(tool, files, mixed_image):
    out = invoke(tool, image=as_file(files("mixed.png", mixed_image.read_bytes())))
    assert out["json"][0]["score"] is not None and out["variables"]["count"] == 2
    out = invoke(tool, image=as_file(files("mixed.png", mixed_image.read_bytes())), profile=None, budget_ms="")
    assert out["variables"]["count"] == 2


def test_an_image_with_no_code_is_an_empty_result(tool, files):
    out = invoke(tool, image=as_file(files("blank.png", png(64, 48))), profile="full")
    assert out["text"] == ["No QR code or barcode found."]
    assert out["json"][0]["detections"] == [] and out["json"][0]["score"] is None
    assert out["variables"] == {"texts": [], "count": 0, "complete": True}


def test_a_corrupt_file_is_a_tool_error_with_the_engine_code(tool, files):
    with pytest.raises(ValueError, match=r"\[QRS-001\]"):
        invoke(tool, image=as_file(files("broken.png", b"this is not an image")))


def test_oversized_input_is_refused(tool, files):
    with pytest.raises(ValueError, match=r"\[QRS-\d{3}\]"):
        invoke(tool, image=as_file(files("wide.png", png(5000, 8))))
    with pytest.raises(ValueError, match="the limit is 16777216 bytes"):
        invoke(tool, image=as_file(files("big.png", png(8, 8)), size=16 * 1024 * 1024 + 1))
    with pytest.raises(ValueError, match="the limit is 16777216 bytes"):
        invoke(tool, image=as_file(files("padded.png", png(8, 8) + b"\0" * (16 * 1024 * 1024))))


def test_invalid_options_are_refused(tool, files, mixed_image):
    url = files("mixed.png", mixed_image.read_bytes())
    with pytest.raises(ValueError, match="Unknown profile"):
        invoke(tool, image=as_file(url), profile="slow")
    for budget in (-1, 60_001, 1.5, "soon", True):
        with pytest.raises(ValueError, match="budget_ms must be"):
            invoke(tool, image=as_file(url), budget_ms=budget)
    with pytest.raises(ValueError, match="Attach an image"):
        invoke(tool, profile="fast")
    assert invoke(tool, image=[as_file(url)], budget_ms=250.0)["variables"]["count"] == 2


def test_a_budget_cut_is_reported_as_not_final(tool, files, mixed_image):
    out = invoke(tool, image=as_file(files("mixed.png", mixed_image.read_bytes())), profile="full", budget_ms=1)
    complete = out["variables"]["complete"]
    assert complete is (not out["json"][0]["trace"]["budget_exhausted"])
    if not complete:
        assert "not final" in out["text"][0]


def test_the_acceptance_reports_are_written_through_invoke(tool, files, mixed_image):
    """Three reports for scripts/destination-acceptance.py, when an acceptance run asks for them."""
    out_dir = os.environ.get("QRSCAN_ACCEPTANCE_DIR")
    if not out_dir:
        pytest.skip("QRSCAN_ACCEPTANCE_DIR is not set")
    pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)
    url = files("mixed.png", mixed_image.read_bytes())
    for profile in PROFILES:
        report = invoke(tool, image=as_file(url), profile=profile, budget_ms=0)["json"][0]
        (pathlib.Path(out_dir) / f"{profile}.json").write_text(json.dumps(report), encoding="utf-8")
