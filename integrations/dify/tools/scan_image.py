"""Scan one image file with the QR Code & Barcode Scanner engine, inside the plugin runtime."""
from collections.abc import Generator
from typing import Any

import qrcode_barcode_scanner as scanner
from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

PROFILES = ("fast", "frame", "full")
# Uploads are untrusted: bound the bytes read and the decoded size (docs/api/python.mdx).
MAX_BYTES = 16 * 1024 * 1024
MAX_DIMENSION = 4096
MAX_PIXELS = 16_000_000
MAX_BUDGET_MS = 60_000


def options(tool_parameters: dict[str, Any]) -> tuple[str, int]:
    profile = tool_parameters.get("profile") or "fast"
    if profile not in PROFILES:
        raise ValueError(f"Unknown profile {profile!r}: use fast, frame or full.")
    raw = tool_parameters.get("budget_ms")
    refused = f"budget_ms must be a whole number of milliseconds from 0 to {MAX_BUDGET_MS}."
    # A number field can arrive as an int, a float or the text of one.
    try:
        budget = 0.0 if raw in (None, "") else float(raw)
    except (TypeError, ValueError) as error:
        raise ValueError(refused) from error
    if isinstance(raw, bool) or not budget.is_integer() or not 0 <= budget <= MAX_BUDGET_MS:
        raise ValueError(refused)
    return profile, int(budget)


def summary(report: dict[str, Any]) -> str:
    found = report["detections"]
    if found:
        listed = "; ".join(f"{row['symbology']}: {row['content']['text']}" for row in found)
        text = f"Found {len(found)} code{'s' if len(found) > 1 else ''}. {listed}"
    else:
        text = "No QR code or barcode found."
    if report["trace"].get("budget_exhausted"):
        text += " The time budget cut the scan, so this result is not final: raise budget_ms or set it to 0."
    return text


class ScanImageTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        file = tool_parameters.get("image")
        if file is None:
            raise ValueError("Attach an image file to scan.")
        if isinstance(file, list):
            if len(file) != 1:
                raise ValueError("Attach exactly one image file.")
            file = file[0]
        profile, budget = options(tool_parameters)
        if file.size is not None and file.size > MAX_BYTES:
            raise ValueError(f"The file is {file.size} bytes; the limit is {MAX_BYTES} bytes.")
        data = file.blob
        if len(data) > MAX_BYTES:
            raise ValueError(f"The file is {len(data)} bytes; the limit is {MAX_BYTES} bytes.")
        # A file that is not an image, or is too large once decoded, raises ValueError with its
        # [QRS-xxx] code: Dify shows it as the tool's error.
        report = scanner.scan(data, profile, max_dimension=MAX_DIMENSION, max_pixels=MAX_PIXELS,
                              budget_ms=budget)
        texts = [row["content"]["text"] for row in report["detections"]]
        yield self.create_text_message(summary(report))
        yield self.create_json_message(report)
        yield self.create_variable_message("texts", texts)
        yield self.create_variable_message("count", len(texts))
        yield self.create_variable_message("complete", not report["trace"].get("budget_exhausted", False))
