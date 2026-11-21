"""The Replicate model of the QR Code & Barcode Scanner: read every QR code and barcode in an image.

Cog builds this folder into a container image (cog.yaml) and serves `Runner.run` as one
prediction: an image file in, the engine's scan report out, unchanged. The engine is the published
wheel `qrcode-barcode-scanner` 0.11.0 from PyPI, running inside the container. On Replicate the
image is uploaded to Replicate's servers and scanned there, not on the caller's machine.

The limits are those of the scanner's MCP adapter (integrations/mcp/src/server.mjs, HARD_LIMITS
and the budgetMs field): 8 MiB per file, 4096 pixels per side, 16,000,000 pixels, and a time
budget from 0 to 60,000 ms. A file the engine cannot read fails the prediction with its QRS code;
an image with no code succeeds with an empty `detections` list.
"""
from typing import Optional

import qrcode_barcode_scanner as scanner
from cog import BaseRunner, Input, Path

PROFILES = ("fast", "frame", "full")
MAX_BYTES = 8 * 1024 * 1024
MAX_DIMENSION = 4096
MAX_PIXELS = 16_000_000
MAX_BUDGET_MS = 60_000


def scan_file(image, profile: str = "fast", budget_ms: Optional[int] = None) -> dict:
    """The engine's report for the encoded image at IMAGE, within the model's limits.

    budget_ms None keeps the profile's own budget (fast 800, frame 80, full 4000 ms); 0 removes it.
    Raises ValueError for a refused input: the engine's own errors carry a QRS code.
    """
    if profile not in PROFILES:
        raise ValueError(f"Unknown profile {profile!r}: use fast, frame or full.")
    if budget_ms is not None and (isinstance(budget_ms, bool) or not 0 <= budget_ms <= MAX_BUDGET_MS):
        raise ValueError(f"budget_ms must be from 0 to {MAX_BUDGET_MS}.")
    with open(image, "rb") as handle:
        data = handle.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError(f"The file is larger than {MAX_BYTES} bytes, the model's limit.")
    if not data:
        raise ValueError("The file is empty.")
    return scanner.scan(data, profile, max_dimension=MAX_DIMENSION, max_pixels=MAX_PIXELS, budget_ms=budget_ms)


class Runner(BaseRunner):
    # `cog build` reads these inputs from the source without running it (Cog 0.23's static schema):
    # each keyword must be one literal, a description one string on one line, choices a list.
    def run(
        self,
        image: Path = Input(description="The image to read: PNG, JPEG, WebP or GIF, at most 8 MiB and 4096 pixels per side. Every QR code and barcode in it is decoded."),
        profile: str = Input(default="fast", choices=["fast", "frame", "full"], description="fast suits uploads and gives a reduced quality score. frame only decodes, as for camera frames, and gives no score. full searches deepest and gives the full score; artistic QR codes from a generator need it."),
        budget_ms: Optional[int] = Input(default=None, ge=0, le=60000, description="A time limit in milliseconds. Empty keeps the profile's own budget (fast 800, frame 80, full 4000). 0 removes it, so the scan always runs to its end. When the budget cuts a scan, trace.budget_exhausted is true and the result is not final."),
    ) -> dict:
        """The engine's complete scan report: each code's format, text, payload and measured place."""
        return scan_file(image, profile, budget_ms)
