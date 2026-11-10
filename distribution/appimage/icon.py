#!/usr/bin/env python3
"""Draw the icon of the AppImage: a QR finder pattern beside barcode bars.

  python3 distribution/appimage/icon.py OUT_PNG

The committed qrcode-barcode-scanner.png is this script's output at 256 x 256. It needs Pillow
and is not part of the build: the build uses the committed file.
"""
import sys

from PIL import Image, ImageDraw

SIZE = 256
SCALE = 4  # drawn four times larger, then reduced, for smooth corners
NIGHT = (15, 23, 42, 255)
PAPER = (248, 250, 252, 255)


def box(draw, left, top, right, bottom, colour, radius=0):
    draw.rounded_rectangle([left * SCALE, top * SCALE, right * SCALE - 1, bottom * SCALE - 1],
                           radius=radius * SCALE, fill=colour)


image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
box(draw, 8, 8, 248, 248, NIGHT, radius=44)

# The finder pattern of a QR code: a ring around a centre, seven modules of 16 px.
box(draw, 40, 40, 152, 152, PAPER, radius=10)
box(draw, 56, 56, 136, 136, NIGHT, radius=4)
box(draw, 72, 72, 120, 120, PAPER, radius=4)

# A few data modules under it.
for left, top in ((40, 168), (72, 168), (104, 184), (40, 200), (88, 200), (136, 168), (136, 200)):
    box(draw, left, top, left + 16, top + 16, PAPER, radius=2)

# Barcode bars of four widths on the right.
for left, width in ((172, 8), (186, 4), (196, 12), (212, 4)):
    box(draw, left, 40, left + width, 216, PAPER, radius=1)

image.resize((SIZE, SIZE), Image.LANCZOS).save(sys.argv[1], optimize=True)
