"""What the Streamlit app shows for one image: the engine's report, a table and the outlined image.

Kept apart from the page so it can be read and tested without Streamlit.
"""
import io
import pathlib
import urllib.request

import qrcode_barcode_scanner as scanner
from PIL import Image, ImageDraw

PROFILES = {
    "fast": "Fast: made for uploads, with a reduced quality score",
    "frame": "Frame: made for camera frames, with no quality score",
    "full": "Full: the deepest search and the full quality score",
}
MAX_BYTES = 8 * 1024 * 1024
MAX_DIMENSION = 4096
MAX_PIXELS = 16_000_000
MAX_BUDGET_MS = 60_000
OUTLINE = (34, 211, 238)
SAMPLE_NAME = "mixed-code128-qr.png"
SAMPLE_URL = ("https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/"
              f"v{scanner.__version__}/fixtures/symbology/{SAMPLE_NAME}")
SAMPLE_PATH = pathlib.Path(__file__).resolve().parents[2] / "fixtures" / "symbology" / SAMPLE_NAME


def sample() -> bytes:
    """The sample image: the repository's copy, else the one published with the release tag."""
    if SAMPLE_PATH.is_file():
        return SAMPLE_PATH.read_bytes()
    with urllib.request.urlopen(SAMPLE_URL, timeout=20) as response:  # noqa: S310 - a fixed https address
        return response.read(MAX_BYTES + 1)[:MAX_BYTES]


def scan(data: bytes, profile: str = "fast", budget_ms: int | None = None) -> dict:
    """The engine's report for an encoded image, within the app's size limits.

    budget_ms None keeps the profile's own budget (fast 800, frame 80, full 4000 ms); 0 removes it.
    """
    if len(data) > MAX_BYTES:
        raise ValueError(f"The file is {len(data)} bytes; this app reads up to {MAX_BYTES} bytes.")
    if profile not in PROFILES:
        raise ValueError(f"Unknown profile {profile!r}.")
    if budget_ms is not None and not 0 <= budget_ms <= MAX_BUDGET_MS:
        raise ValueError(f"The time budget must be from 0 to {MAX_BUDGET_MS} ms.")
    return scanner.scan(data, profile, max_dimension=MAX_DIMENSION, max_pixels=MAX_PIXELS, budget_ms=budget_ms)


def rows(report: dict) -> list[dict]:
    """One table row per code: its format, its text and its payload kind."""
    return [{"Format": row["symbology"], "Text": row["content"]["text"],
             "Kind": (row.get("payload") or {}).get("kind", "text")} for row in report["detections"]]


def outlined(data: bytes, report: dict) -> bytes:
    """The image as PNG with each measured occurrence drawn where the engine found it."""
    image = Image.open(io.BytesIO(data))
    image.seek(0)
    image = image.convert("RGB")
    draw = ImageDraw.Draw(image)
    width = max(2, round(min(image.size) / 200))
    for row in report["detections"]:
        for occurrence in row.get("occurrences") or []:
            geometry = occurrence["geometry"]
            points = [(point["x"], point["y"]) for point in geometry.get("points") or []]
            if geometry["kind"] == "quad" and len(points) == 4:
                draw.line(points + points[:1], fill=OUTLINE, width=width)
            elif len(points) >= 2:
                draw.line(points, fill=OUTLINE, width=width)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
