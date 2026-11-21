"""Open a napari window, run the plugin from its dock widget on the mixed sample and save the window.

  python capture_window.py --out FILE.png [--image IMAGE] [--size WIDTHxHEIGHT]

The workflow integration-python-hosts runs it under a virtual display (xvfb) with a pinned PyQt6, in
a new environment holding the plugin's built wheel and napari. It opens the window napari users
see, adds the plugin's widget the way the Plugins menu does, sets the `full` profile and presses
Run. It fails unless the scan outlined exactly the two codes of the sample in a new shapes layer,
then writes a PNG of the whole window (canvas, layer list and the plugin's form) and prints its
size and SHA-256. It sends nothing anywhere.
"""
import argparse
import hashlib
import pathlib
import sys

import numpy as np
from PIL import Image

PLUGIN = "napari-qrcode-barcode-scanner"
WIDGET = "Scan QR codes and barcodes"
EXPECTED = {"https://qrc-ai.com/76xMa", "STOCK-4827"}
SAMPLE = pathlib.Path(__file__).resolve().parents[3] / "fixtures" / "symbology" / "mixed-code128-qr.png"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--out", type=pathlib.Path, required=True)
    parser.add_argument("--image", type=pathlib.Path, default=SAMPLE)
    parser.add_argument("--size", default="1440x900", help="the window's size, WIDTHxHEIGHT")
    args = parser.parse_args(argv)
    width, height = (int(part) for part in args.size.split("x"))

    import napari
    from qtpy.QtWidgets import QApplication

    viewer = napari.Viewer(title="napari: QR Code & Barcode Scanner", show=True)
    try:
        viewer.window.resize(width, height)
        image = viewer.add_image(np.asarray(Image.open(args.image).convert("RGB")), name="sample", rgb=True)
        _, form = viewer.window.add_plugin_dock_widget(PLUGIN, WIDGET)
        form.image.value = image
        form.profile.value = "full"
        form()
        QApplication.processEvents()
        codes = viewer.layers["sample codes"]
        found = set(codes.features["text"])
        if found != EXPECTED or len(codes.data) != len(EXPECTED):
            print(f"capture: the window's scan outlined {sorted(found)} in {len(codes.data)} shapes, "
                  f"want {sorted(EXPECTED)}", file=sys.stderr)
            return 1
        viewer.layers.selection.active = image
        viewer.reset_view()
        QApplication.processEvents()
        args.out.parent.mkdir(parents=True, exist_ok=True)
        pixels = viewer.screenshot(canvas_only=False, flash=False)
        Image.fromarray(np.asarray(pixels)[..., :3]).save(args.out, optimize=True)
    finally:
        viewer.close()
    data = args.out.read_bytes()
    with Image.open(args.out) as saved:
        print(f"capture: {args.out} {saved.width}x{saved.height}, sha256 {hashlib.sha256(data).hexdigest()}, "
              f"napari {napari.__version__}, outlined {sorted(found)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
