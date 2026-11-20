"""Scan the selected image layer and outline each QR code and barcode it reads in a Shapes layer.

The pixels are the layer's own, mapped through its contrast limits as napari shows them, and are
read by the published engine wheel inside napari's process. Nothing is sent anywhere.
"""
from typing import Annotated, Literal

import numpy as np
import qrcode_barcode_scanner as scanner

PROFILES = ("fast", "frame", "full")
MAX_BUDGET_MS = 600_000
EDGE_COLOR = "#22d3ee"
# What a reader measured, drawn as napari draws it. "unavailable" has no point to draw.
SHAPE_TYPES = {"quad": "polygon", "segment": "line", "partial": "path"}
MIN_POINTS = {"polygon": 3, "line": 2, "path": 2}


def to_rgba(image) -> tuple[bytes, int, int]:
    """The plane of a 2D image layer as RGBA bytes, through the layer's contrast limits."""
    if image.ndim != 2:
        raise ValueError(
            f"The layer {image.name!r} has {image.ndim} dimensions. Scan a 2D image: "
            "split a stack with Layers > Split Stack, or project it first.")
    data = np.asarray(image.data[0] if image.multiscale else image.data)
    if image.rgb:
        channels = data.shape[-1]
    else:
        data, channels = data[..., None], 1
    low, high = (float(limit) for limit in image.contrast_limits)
    if data.dtype == np.uint8 and (low, high) == (0.0, 255.0):
        pixels = data
    else:
        scaled = (np.nan_to_num(data.astype(np.float64)) - low) / max(high - low, np.finfo(float).eps)
        pixels = np.rint(np.clip(scaled, 0.0, 1.0) * 255).astype(np.uint8)
    if channels == 1:
        pixels = np.repeat(pixels, 3, axis=-1)
    if pixels.shape[-1] == 3:
        alpha = np.full(pixels.shape[:-1] + (1,), 255, dtype=np.uint8)
        pixels = np.concatenate([pixels, alpha], axis=-1)
    height, width = pixels.shape[:2]
    return np.ascontiguousarray(pixels).tobytes(), width, height


def summary(name: str, report: dict) -> str:
    """One line for napari's notification: what was read in which layer."""
    found = [f"{row['symbology']}: {row['content']['text']}" for row in report["detections"]]
    line = (f"{name}: {len(found)} code(s) found. " + "; ".join(found)) if found else f"{name}: no QR code or barcode found."
    if report["trace"]["budget_exhausted"]:
        line += " The time budget cut the scan, so this result is not final."
    return line


def shapes(report: dict) -> tuple[list[np.ndarray], list[str], dict[str, list[str]]]:
    """Each measured occurrence as a napari shape in (row, column) order, with its code's text."""
    data, types, features = [], [], {"text": [], "symbology": []}
    for row in report["detections"]:
        for occurrence in row.get("occurrences") or []:
            geometry = occurrence["geometry"]
            kind = SHAPE_TYPES.get(geometry["kind"])
            points = geometry.get("points") or []
            if kind is None or len(points) < MIN_POINTS[kind]:
                continue
            data.append(np.array([[point["y"], point["x"]] for point in points], dtype=float))
            types.append(kind)
            features["text"].append(row["content"]["text"])
            features["symbology"].append(row["symbology"])
    return data, types, features


def notify(message: str) -> None:
    from napari.utils.notifications import show_info

    show_info(message)


def scan_layer(image, profile: str = "fast", budget_ms: int = 0):
    """The codes of a 2D image layer as a napari layer data tuple (data, metadata, "shapes")."""
    if image is None:
        raise ValueError("Open or select an image layer to scan.")
    if profile not in PROFILES:
        raise ValueError(f"Unknown profile {profile!r}: use fast, frame or full.")
    if isinstance(budget_ms, bool) or not 0 <= int(budget_ms) <= MAX_BUDGET_MS:
        raise ValueError(f"budget_ms must be from 0 to {MAX_BUDGET_MS}.")
    rgba, width, height = to_rgba(image)
    report = scanner.scan_frame(rgba, width, height, profile=profile, budget_ms=int(budget_ms))
    data, types, features = shapes(report)
    meta = {
        "name": f"{image.name} codes",
        "shape_type": types,
        "features": features,
        "text": {"string": "{symbology}: {text}", "color": EDGE_COLOR, "size": 12, "anchor": "upper_left"},
        "edge_color": EDGE_COLOR,
        "face_color": "transparent",
        "edge_width": max(2.0, round(min(width, height) / 250, 1)),
        # The outlines sit on the image whatever its transform.
        "scale": image.scale,
        "translate": image.translate,
        "rotate": image.rotate,
        "shear": image.shear,
        "affine": image.affine.affine_matrix,
        "metadata": {"qrcode_barcode_scanner": report},
    }
    return data, meta, "shapes"


def scan_codes(
    image: "napari.layers.Image",  # noqa: F821 - resolved by magicgui inside napari
    profile: Literal["fast", "frame", "full"] = "fast",
    budget_ms: Annotated[int, {"min": 0, "max": MAX_BUDGET_MS, "step": 10,
                               "tooltip": "Stop after this many milliseconds. 0 means no budget."}] = 0,
    viewer: "napari.viewer.Viewer" = None,  # noqa: F821 - napari passes its viewer, the form hides it
) -> None:
    """Read every QR code and barcode in the image layer and outline them in a "<layer> codes" layer.

    A new scan replaces the codes layer of the same image. With no code found, it is removed.
    """
    from napari.layers import Layer

    data, meta, kind = scan_layer(image, profile, budget_ms)
    notify(summary(image.name, meta["metadata"]["qrcode_barcode_scanner"]))
    if viewer is None:
        return
    if meta["name"] in viewer.layers:
        viewer.layers.remove(viewer.layers[meta["name"]])
    if data:
        viewer.add_layer(Layer.create(data, meta, kind))
