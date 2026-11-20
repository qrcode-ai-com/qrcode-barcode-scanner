"""The QR Code & Barcode Scanner node for ComfyUI.

A ComfyUI IMAGE is a batch: a tensor of shape [B, H, W, C], channels last, values from 0 to 1.
Each image of the batch becomes 8-bit RGBA and goes to the engine's `scan_frame`, so no PNG or
JPEG round trip touches the pixels. The engine is the published `qrcode-barcode-scanner` wheel.
"""
import json

import numpy as np
import qrcode_barcode_scanner as scanner

PROFILES = ("fast", "frame", "full")
# Ten minutes: far above what one image needs, low enough that a typing slip cannot hang a queue.
MAX_BUDGET_MS = 600_000


def to_rgba(image):
    """One image of a batch, [H, W, C] with C of 1, 3 or 4, as (RGBA bytes, width, height).

    Float values are clamped to 0..1 and rounded to the nearest 8-bit level, so an image that came
    from an 8-bit file through ComfyUI's LoadImage gets back its exact pixels. Not-a-number becomes 0.
    The source tensor is never written.
    """
    if hasattr(image, "detach"):
        # torch: a half or bfloat16 tensor has no NumPy view, so read it as float32.
        array = image.detach().cpu().float().numpy()
    else:
        array = np.asarray(image)
    if array.ndim == 2:
        array = array[..., None]
    if array.ndim != 3:
        raise ValueError(f"expected one image of shape [height, width, channels], got {list(array.shape)}")
    height, width, channels = array.shape
    if height == 0 or width == 0:
        raise ValueError("the image is empty")
    if channels not in (1, 3, 4):
        raise ValueError(f"expected 1, 3 or 4 channels, got {channels}")
    if array.dtype == np.uint8:
        pixels = array
    else:
        values = np.nan_to_num(array.astype(np.float32), nan=0.0, posinf=1.0, neginf=0.0)
        pixels = np.rint(np.clip(values, 0.0, 1.0) * 255.0).astype(np.uint8)
    if channels == 1:
        pixels = np.repeat(pixels, 3, axis=2)
    if pixels.shape[2] == 3:
        pixels = np.concatenate([pixels, np.full((height, width, 1), 255, dtype=np.uint8)], axis=2)
    return np.ascontiguousarray(pixels).tobytes(), width, height


def batch(images):
    """The images of an IMAGE input: a 4-D batch, or a single 3-D image."""
    shape = tuple(images.shape)
    if len(shape) == 3:
        return [images]
    if len(shape) != 4:
        raise ValueError(f"expected an IMAGE batch of shape [batch, height, width, channels], got {list(shape)}")
    return [images[index] for index in range(shape[0])]


def summary(index, report):
    """One line per image for the node's own display."""
    found = report["detections"]
    if found:
        listed = ", ".join(f"{row['symbology']} {row['content']['text']!r}" for row in found)
        line = f"image {index + 1}: {len(found)} found: {listed}"
    else:
        line = f"image {index + 1}: no code found"
    if report["trace"].get("budget_exhausted"):
        line += " (the time budget cut the scan: raise budget_ms, or set it to 0)"
    return line


class ScanCodes:
    """Read every QR code and barcode of each image in a batch."""

    DESCRIPTION = (
        "Reads the QR codes and barcodes of each image with the QR Code & Barcode Scanner engine. "
        "Returns the decoded texts, the engine's JSON report for every image of the batch, whether "
        "every image holds the expected text, and how many codes were found. Nothing leaves the "
        "machine: the engine runs inside ComfyUI's Python.")
    CATEGORY = "image/analysis"
    FUNCTION = "scan"
    OUTPUT_NODE = True
    RETURN_TYPES = ("STRING", "STRING", "BOOLEAN", "INT")
    RETURN_NAMES = ("texts", "report_json", "matches", "count")
    OUTPUT_TOOLTIPS = (
        "Every decoded text, one per line, in batch order.",
        "A JSON array with the engine's report for each image, unchanged.",
        "With an expected text: true when every image holds a code with exactly that text. "
        "Without one: true when every image holds at least one code.",
        "The number of codes found in the whole batch.",
    )
    SEARCH_ALIASES = ["qr code", "barcode", "decode", "read code", "scan", "code 128", "data matrix"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE", {"tooltip": "The images to read. Every image of the batch is scanned."}),
                "profile": (list(PROFILES), {
                    "default": "fast",
                    "tooltip": "fast: decode with a reduced judgment. frame: decode only, no score. "
                               "full: decode and judge how well a QR code scans (slowest).",
                }),
                "budget_ms": ("INT", {
                    "default": 0, "min": 0, "max": MAX_BUDGET_MS, "step": 10,
                    "tooltip": "Time limit per image in milliseconds. 0 means no limit: the result "
                               "then does not depend on how busy the machine is.",
                }),
            },
            "optional": {
                "expected_text": ("STRING", {
                    "default": "",
                    "tooltip": "The exact text every image should hold. Leave empty to only check "
                               "that each image holds a code.",
                }),
            },
        }

    def scan(self, image, profile="fast", budget_ms=0, expected_text=""):
        if profile not in PROFILES:
            raise ValueError(f"unknown profile {profile!r}: use one of {', '.join(PROFILES)}")
        if not 0 <= int(budget_ms) <= MAX_BUDGET_MS:
            raise ValueError(f"budget_ms must be between 0 and {MAX_BUDGET_MS}")
        reports = []
        for index, one in enumerate(batch(image)):
            rgba, width, height = to_rgba(one)
            try:
                reports.append(scanner.scan_frame(rgba, width, height, profile, budget_ms=int(budget_ms)))
            except ValueError as error:
                raise ValueError(f"image {index + 1} of the batch: {error}") from error
        texts = [row["content"]["text"] for report in reports for row in report["detections"]]
        if expected_text:
            matches = all(any(row["content"]["text"] == expected_text for row in report["detections"])
                          for report in reports)
        else:
            matches = all(report["detections"] for report in reports)
        lines = [summary(index, report) for index, report in enumerate(reports)]
        return {
            "ui": {"text": ["\n".join(lines)]},
            "result": ("\n".join(texts), json.dumps(reports, ensure_ascii=False), bool(matches and reports),
                       len(texts)),
        }


NODE_CLASS_MAPPINGS = {"QRCodeAIScanCodes": ScanCodes}
NODE_DISPLAY_NAME_MAPPINGS = {"QRCodeAIScanCodes": "Scan QR Codes and Barcodes"}
