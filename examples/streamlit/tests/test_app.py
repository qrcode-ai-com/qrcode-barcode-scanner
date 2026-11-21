"""The app through Streamlit's own test runner: each widget driven as a visitor would use it."""
import io
import json
import os
import pathlib

import pytest
import python_host_kit as kit
import qrcode_barcode_scanner
import tomllib
from PIL import Image
from streamlit.testing.v1 import AppTest

import scan_view

APP = pathlib.Path(__file__).resolve().parents[1]
QR = "https://qrc-ai.com/76xMa"
CODE128 = "STOCK-4827"
PROFILES = ("fast", "frame", "full")


@pytest.fixture
def mixed_bytes():
    """The mixed fixture, or the copy an acceptance run staged, checked against its SHA-256."""
    return kit.mixed_bytes(APP)


def start():
    app = AppTest.from_file(str(APP / "streamlit_app.py"), default_timeout=60)
    app.run()
    assert not app.exception, app.exception
    return app


def upload(app, name, data, mime="image/png"):
    app.radio[0].set_value("Upload an image").run()
    app.file_uploader[0].set_value((name, data, mime)).run()
    assert not app.exception, app.exception
    return app


def table(app):
    [frame] = app.dataframe
    return frame.value.to_dict("records")


def png(width, height, color="white"):
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_the_first_visit_scans_the_sample_with_the_fast_profile():
    app = start()
    assert app.title[0].value == "QR Code & Barcode Scanner"
    # Where the scan runs, said on the page itself: on Community Cloud, a Streamlit server.
    assert app.caption[0].value.startswith("On Streamlit Community Cloud, that machine is a Streamlit server")
    # The three QR Code AI links every scanner destination carries.
    links = [element.value for element in app.markdown if "qrcode-ai.com" in element.value]
    assert links == ["From [QR Code AI](https://qrcode-ai.com/): the "
                     "[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the "
                     "[barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) in the browser."]
    assert app.radio[0].value == "Sample image" and app.selectbox[0].value == "fast"
    assert app.number_input[0].value is None
    assert app.success[0].value == "2 code(s) found in mixed-code128-qr.png."
    assert table(app) == [{"Format": "qr_code", "Text": QR, "Kind": "url"},
                          {"Format": "code128", "Text": CODE128, "Kind": "text"}]
    assert len(app.get("image")) == 1 and not app.warning
    [download] = app.get("download_button")
    assert download.label == "Download the report (JSON)"


@pytest.mark.parametrize("profile", PROFILES)
def test_an_uploaded_mixed_image_gives_both_codes_in_each_profile(mixed_bytes, profile):
    app = start()
    app.selectbox[0].set_value(profile)
    app.number_input[0].set_value(0)
    upload(app, "label.png", mixed_bytes)
    assert app.success[0].value == "2 code(s) found in label.png."
    assert [row["Text"] for row in table(app)] == [QR, CODE128]
    report = kit.assert_mixed(json.loads(app.json[0].value), profile)
    direct = qrcode_barcode_scanner.scan(mixed_bytes, profile, budget_ms=0)
    assert report["detections"] == json.loads(json.dumps(direct["detections"]))


def test_the_upload_view_waits_for_a_file_and_names_the_limit():
    app = start()
    app.radio[0].set_value("Upload an image").run()
    [uploader] = app.file_uploader
    assert uploader.allowed_type == [".png", ".jpg", ".jpeg", ".webp", ".gif"]
    assert app.info[0].value == "Choose an image to scan." and not app.success and not app.dataframe


def test_an_image_without_code_and_a_file_that_is_no_image(tmp_path):
    app = upload(start(), "blank.png", png(64, 48))
    assert app.warning[0].value == "No QR code or barcode found in blank.png." and not app.dataframe
    app = upload(start(), "notes.png", b"this is not an image")
    assert "[QRS-001]" in app.error[0].value and not app.get("image")


def test_an_oversized_image_is_refused_before_the_scan():
    app = upload(start(), "wide.png", png(5000, 8))
    assert app.error[0].value.startswith("This image cannot be read:")
    assert "[QRS-" in app.error[0].value


def test_a_budget_cut_says_the_result_is_not_final(mixed_bytes):
    app = start()
    app.selectbox[0].set_value("full")
    app.number_input[0].set_value(1)
    app = upload(app, "mixed.png", mixed_bytes)
    report = json.loads(app.json[0].value)
    shown = any("not final" in warning.value for warning in app.warning)
    assert shown is report["trace"]["budget_exhausted"]


def test_the_requirements_pin_the_published_engine():
    assert (APP / "requirements.txt").read_text().split() == [
        "streamlit==1.67.0", "pillow==13.0.0", f"qrcode-barcode-scanner=={qrcode_barcode_scanner.__version__}"]
    assert qrcode_barcode_scanner.__version__ == "0.11.0"


def test_the_config_beside_the_app_matches_its_limits():
    """Community Cloud reads .streamlit/config.toml beside the entrypoint; it must hold the app's limit."""
    config = tomllib.loads((APP / ".streamlit" / "config.toml").read_text())
    assert config == {"server": {"maxUploadSize": 8}, "browser": {"gatherUsageStats": False}}
    assert config["server"]["maxUploadSize"] * 1024 * 1024 == scan_view.MAX_BYTES
    assert not (APP.parents[1] / ".streamlit").exists(), "a root config would be read by every app"


def test_the_acceptance_reports_are_written_through_the_app(mixed_bytes):
    """Three reports for scripts/destination-acceptance.py, when an acceptance run asks for them."""
    if not os.environ.get(kit.REPORTS_VARIABLE):
        pytest.skip(f"{kit.REPORTS_VARIABLE} is not set")

    def scan(profile):
        app = start()
        app.selectbox[0].set_value(profile)
        app.number_input[0].set_value(0)
        upload(app, "mixed.png", mixed_bytes)
        assert app.success[0].value == "2 code(s) found in mixed.png."
        return kit.assert_mixed(json.loads(app.json[0].value), profile)

    assert len(kit.write_acceptance_reports(scan)) == 3
