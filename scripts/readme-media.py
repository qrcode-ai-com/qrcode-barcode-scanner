#!/usr/bin/env python3
"""Build README illustrations from real fixtures and a supplied WASM package.

Requires Python/Pillow, Node and ffmpeg. No package is downloaded or built.
The animation visualizes recorded report geometry; it is not a camera recording.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
BG = "#080f1f"
PANEL = "#101c30"
BORDER = "#263852"
TEXT = "#f3f6ff"
MUTED = "#9eb0cb"
COLORS = ["#64a6ff", "#b69aff", "#5cdeb0"]
FIXTURES = [
    ("QR Code", "Clean", "fixtures/clean/gen_v2_h.png", "qr_code"),
    ("QR Code", "Artistic", "fixtures/artistic/OK_1069ms_85_8b6a54b3.png", "qr_code"),
    ("Micro QR", "Compact 2D", "fixtures/symbology/microqr.png", "micro_qr_code"),
    ("rMQR", "Rectangular 2D", "fixtures/symbology/rmqr-url-kanji.png", "rectangular_micro_qr_code"),
    ("Data Matrix", "2D", "fixtures/symbology/datamatrix.png", "data_matrix"),
    ("GS1 Data Matrix", "FNC1 payload", "fixtures/symbology/datamatrix-gs1.png", "data_matrix"),
    ("Aztec", "Centered fixture", "fixtures/symbology/aztec.png", "aztec"),
    ("PDF417", "Stacked barcode", "fixtures/symbology/pdf417.png", "pdf417"),
    ("Code 128", "STOCK-4827", "fixtures/symbology/code128-stock-4827.png", "code128"),
    ("EAN-13", "Retail barcode", "fixtures/symbology/ean13.png", "ean13"),
    ("Code 39", "Linear barcode", "fixtures/symbology/code39.png", "code39"),
    ("UPC-A", "Retail barcode", "fixtures/symbology/upca.png", "upc_a"),
]
MIXED = "fixtures/symbology/mixed-code128-qr.png"
TWINS = "fixtures/symbology/qr-twins-code128.png"
PAYLOADS = [
    ("Wi-Fi", "Connection fields", "fixtures/payloads/wifi.png"),
    ("Contact", "MECARD fields", "fixtures/payloads/me_card.png"),
    ("SMS", "Phone and message", "fixtures/payloads/sms.png"),
    ("GS1 Digital Link", "Structured URL", "fixtures/payloads/gs1-digital-link.png"),
]
LINKS = [
    ("qr-website.png", "https://qrcode-ai.com/"),
    ("qr-scanner.png", "https://qrcode-ai.com/en-US/qr-code-scanner"),
    ("barcode-scanner.png", "https://qrcode-ai.com/en-US/barcode-scanner"),
]


def font(size: int, bold: bool = False, mono: bool = False):
    choices = (
        ["/System/Library/Fonts/SFNSMono.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
        if mono
        else [
            f"/System/Library/Fonts/Supplemental/Arial{' Bold' if bold else ''}.ttf",
            f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf",
        ]
    )
    for name in choices:
        if Path(name).is_file():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default(size=size)


def text(draw, xy, value, size=22, fill=TEXT, bold=False, mono=False):
    draw.text(xy, value, font=font(size, bold, mono), fill=fill)


def fit(image: Image.Image, box, upscale=True):
    x, y, w, h = box
    ratio = min(w / image.width, h / image.height)
    if not upscale:
        ratio = min(1, ratio)
    size = (round(image.width * ratio), round(image.height * ratio))
    return image.resize(size, Image.Resampling.NEAREST), (x + (w-size[0])//2, y + (h-size[1])//2), ratio


def points(geometry, origin, ratio):
    return [(origin[0] + p["x"]*ratio, origin[1] + p["y"]*ratio) for p in geometry["points"]]


def measured_outline(draw, geometry, origin, ratio, color, width=3):
    pts = points(geometry, origin, ratio)
    if geometry["kind"] == "quad":
        draw.line(pts + [pts[0]], fill=color, width=width, joint="curve")
        for i, p in enumerate(pts):
            for neighbour in [pts[(i-1) % 4], pts[(i+1) % 4]]:
                dx, dy = neighbour[0]-p[0], neighbour[1]-p[1]
                length = math.hypot(dx, dy)
                end = (p[0]+dx*min(23, length*.22)/length, p[1]+dy*min(23, length*.22)/length)
                draw.line([p, end], fill=color, width=width+2)
    elif geometry["kind"] == "segment":
        draw.line(pts, fill=color, width=width+1)
        for x, y in pts:
            draw.ellipse((x-5, y-5, x+5, y+5), fill=color)
    # Unavailable/partial geometry is deliberately not promoted to a rectangle.


def occurrences(report):
    result = []
    for detection in report["detections"]:
        for occurrence in detection.get("occurrences", []):
            result.append({"symbology": detection["symbology"], "text": detection["content"]["text"],
                           "geometry": occurrence["geometry"]})
    return result


def scan_images(package: Path, paths: dict[str, Path]):
    node = r"""
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [root, names] = process.argv.slice(1);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const build=JSON.parse(fs.readFileSync(path.join(root,'build-info.json')));
const m=await import(pathToFileURL(path.join(root,pkg.main)).href);
m.initSync({module:fs.readFileSync(path.join(root,build.wasm.path))});
const reports=Object.fromEntries(Object.entries(JSON.parse(names)).map(([name,file]) => [name,m.scan_image(fs.readFileSync(file),'full',undefined,undefined,0)]));
process.stdout.write(JSON.stringify({engine_version:m.version(),build,reports}));
"""
    return json.loads(subprocess.run(["node", "--input-type=module", "-e", node, str(package),
                                     json.dumps({name: str(path) for name, path in paths.items()})],
                                    text=True, capture_output=True, check=True).stdout)


def collect(source: Path, package: Path, artifact_url: str, tarball_hash: str):
    files = list(dict.fromkeys([x[2] for x in FIXTURES] + [x[2] for x in PAYLOADS] + [MIXED, TWINS]))
    measured = scan_images(package, {name: source/name for name in files})
    build = measured["build"]
    wasm = package/build["wasm"]["path"]
    assert hashlib.sha256(wasm.read_bytes()).hexdigest() == build["wasm"]["sha256"]
    for name, report in measured["reports"].items():
        assert report["trace"]["budget_exhausted"] is False, name
        assert not any(report["trace"]["saturation"].values()), name
    twin = occurrences(measured["reports"][TWINS])
    assert len(twin) == 3
    assert sum(o["symbology"] == "qr_code" and o["geometry"]["kind"] == "quad" for o in twin) == 2
    assert sum(o["symbology"] == "code128" and o["text"] == "STOCK-4827" and o["geometry"]["kind"] == "segment" for o in twin) == 1
    mixed = measured["reports"][MIXED]["detections"]
    assert {(d["symbology"], d["content"]["text"]) for d in mixed} == {
        ("code128", "STOCK-4827"), ("qr_code", "https://qrc-ai.com/76xMa")}
    for _, _, name, expected in FIXTURES:
        assert any(d["symbology"] == expected for d in measured["reports"][name]["detections"]), (name, expected)
    for _, _, name in PAYLOADS:
        assert any(d["symbology"] == "qr_code" for d in measured["reports"][name]["detections"]), name
    return {
        "schema": "qrscan-readme-media/1", "engine_version": measured["engine_version"],
        "source_revision": build["source_revision"],
        "source_archive": {"producer": artifact_url, "tarball_sha256": tarball_hash, "final_release": False},
        "wasm": build["wasm"], "scan": {"profile": "full", "budget_ms": 0},
        "replay": "Post-decode visualization of a static fixture report; not a camera recording or camera-UI capture.",
        "fixtures": [{"path": name, "sha256": hashlib.sha256((source/name).read_bytes()).hexdigest(),
                      "report": measured["reports"][name]} for name in files],
    }


def link_codes(package, out):
    import qrcode

    for name, url in LINKS:
        qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=4)
        qr.add_data(url)
        qr.make(fit=True)
        qr.make_image(fill_color="#0a1429", back_color="white").convert("RGB").save(out/name, optimize=True)
    measured=scan_images(package, {name: out/name for name, _ in LINKS})
    rows=[]
    for name, url in LINKS:
        report=measured["reports"][name]
        assert [(d["symbology"],d["content"]["text"]) for d in report["detections"]]==[("qr_code",url)]
        assert report["trace"]["budget_exhausted"] is False
        assert not any(report["trace"]["saturation"].values())
        rows.append({"file": name, "encoded_url": url,
                     "sha256": hashlib.sha256((out/name).read_bytes()).hexdigest(), "report": report})
    return rows


def gallery(source, manifest, out):
    image = Image.new("RGB", (1440, 1032), BG)
    d = ImageDraw.Draw(image)
    text(d, (48, 29), "ONE ENGINE. MANY FORMATS.", 16, COLORS[0], True)
    text(d, (48, 61), "QR codes, matrix codes and barcodes", 38, bold=True)
    text(d, (48, 112), "Real repository fixtures decoded locally by the 0.11 development build.", 21, MUTED)
    for i, (title, subtitle, path, _) in enumerate(FIXTURES):
        x, y = 48+(i%4)*340, 167+(i//4)*270
        d.rounded_rectangle((x, y, x+320, y+248), radius=17, fill=PANEL, outline=BORDER, width=1)
        d.rounded_rectangle((x+15, y+14, x+305, y+174), radius=9, fill="white")
        im = Image.open(source/path).convert("RGB")
        thumb, pos, _ = fit(im, (x+21, y+20, 278, 148))
        image.paste(thumb, pos)
        text(d, (x+18, y+186), title, 23, bold=True)
        text(d, (x+18, y+217), subtitle, 17, MUTED)
        d.ellipse((x+287, y+194, x+299, y+206), fill=COLORS[2])
    text(d, (48, 1002), "Source fixtures and exact reports are linked below. Examples illustrate format support, not a universal recall guarantee.", 17, MUTED)
    image.save(out/"gallery.png", optimize=True)


def mixed_scene(source, report, out):
    image = Image.new("RGB", (1440, 980), BG)
    d = ImageDraw.Draw(image)
    text(d, (48, 30), "MIXED-FORMAT FIXTURE", 17, COLORS[2], True)
    text(d, (48, 64), "QR + Code 128. In the same image.", 39, bold=True)
    text(d, (48, 119), "Two decoded contents. Measured QR quadrilateral and barcode scan segment.", 22, MUTED)
    d.rounded_rectangle((48, 170, 1392, 824), radius=20, fill="#ffffff")
    im = Image.open(source/MIXED).convert("RGB")
    thumb, pos, ratio = fit(im, (70, 188, 1300, 618))
    image.paste(thumb, pos)
    for row in occurrences(report):
        color = COLORS[0] if row["symbology"] == "qr_code" else COLORS[2]
        measured_outline(d, row["geometry"], pos, ratio, color, 4)
    for x, label, value, color in [(48,"CODE 128 · SEGMENT","STOCK-4827",COLORS[2]),(738,"QR CODE · QUAD","https://qrc-ai.com/76xMa",COLORS[0])]:
        d.rounded_rectangle((x, 850, x+654, 946), radius=14, fill=PANEL, outline=BORDER)
        text(d, (x+20, 866), label, 16, color, True)
        text(d, (x+20, 896), value, 25, mono=True)
    text(d, (48, 958), "Actual full-profile report, budget 0 · development artifact · no performance or physical-camera claim", 16, MUTED)
    image.save(out/"mixed-codes.png", optimize=True)


def payload_gallery(source, out):
    image = Image.new("RGB", (1440, 474), BG)
    d = ImageDraw.Draw(image)
    text(d, (48, 27), "MORE THAN A URL", 16, COLORS[0], True)
    text(d, (48, 58), "Read the code. Keep its exact content.", 36, bold=True)
    for i, (title, subtitle, path) in enumerate(PAYLOADS):
        x, y = 48+i*340, 123
        d.rounded_rectangle((x, y, x+320, y+292), radius=17, fill=PANEL, outline=BORDER)
        d.rounded_rectangle((x+16, y+14, x+304, y+214), radius=9, fill="white")
        thumb, pos, _ = fit(Image.open(source/path).convert("RGB"), (x+25, y+20, 270, 188))
        image.paste(thumb, pos)
        text(d, (x+18, y+228), title, 23, bold=True)
        text(d, (x+18, y+260), subtitle, 18, MUTED)
    text(d, (48, 443), "Public test fixtures. Decoding does not open a link, join a network, send a message or save a contact.", 18, MUTED)
    image.save(out/"payloads.png", optimize=True)


def replay_frame(source, report, frame, total):
    image = Image.new("RGB", (1280, 800), BG)
    d = ImageDraw.Draw(image)
    text(d, (44, 25), "RECORDED REPORT / SELECTION REPLAY", 15, COLORS[0], True)
    text(d, (44, 57), "One payload can appear twice.", 36, bold=True)
    text(d, (44, 107), "2 decoded contents   /   3 physical occurrences", 21, MUTED)
    d.rounded_rectangle((44, 155, 1236, 625), radius=22, fill="#ffffff")
    scene, pos, ratio = fit(Image.open(source/TWINS).convert("RGB"), (60, 175, 1160, 430))
    image.paste(scene, pos)
    rows = occurrences(report)
    selected = min(2, (frame*3)//total)
    phase = (frame % (total//3))/(total//3)
    glow = Image.new("RGBA", image.size, (0,0,0,0))
    gd = ImageDraw.Draw(glow)
    measured_outline(gd, rows[selected]["geometry"], pos, ratio, COLORS[selected], 9)
    glow = glow.filter(ImageFilter.GaussianBlur(7))
    opacity = 0.55 + 0.45*math.sin(phase*math.pi)
    glow.putalpha(glow.getchannel("A").point(lambda value: round(value*opacity)))
    image = Image.alpha_composite(image.convert("RGBA"), glow)
    d = ImageDraw.Draw(image)
    for i, row in enumerate(rows):
        measured_outline(d, row["geometry"], pos, ratio, COLORS[i], 5 if i == selected else 2)
    for i, row in enumerate(rows):
        x = 44+i*405
        label = ["QR Code · copy 1", "QR Code · copy 2", "Code 128"][i]
        d.rounded_rectangle((x, 646, x+382, 705), radius=13, fill=PANEL,
                            outline=COLORS[i] if i==selected else BORDER, width=3 if i==selected else 1)
        d.ellipse((x+18, 670, x+28, 680), fill=COLORS[i])
        text(d, (x+41, 664), label, 21, TEXT if i==selected else MUTED, True)
    row = rows[selected]
    text(d, (44, 723), row["text"], 25, COLORS[selected], mono=True)
    text(d, (44, 770), "Post-decode visualization · measured geometry · synthetic replay, not a physical-camera recording", 16, MUTED)
    return image.convert("RGB")


def render(source, manifest, out):
    reports = {f["path"]: f["report"] for f in manifest["fixtures"]}
    gallery(source, manifest, out)
    payload_gallery(source, out)
    mixed_scene(source, reports[MIXED], out)
    total, fps = 72, 12
    with tempfile.TemporaryDirectory(prefix="qr-readme-frames-") as tmp:
        folder = Path(tmp)
        frames=[]
        for i in range(total):
            frame=replay_frame(source, reports[TWINS], i, total)
            frame.save(folder/f"{i:03d}.png", optimize=True)
            frames.append(frame)
        frames[48].save(out/"scan-replay-poster.png", optimize=True)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", str(fps),
                        "-i", str(folder/"%03d.png"), "-an", "-c:v", "libx264", "-preset", "medium",
                        "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out/"scan-replay.mp4")], check=True)
        # A shared palette and constant stage keep the GIF light and avoid noisy flashing.
        palette=frames[48].quantize(colors=96, method=Image.Quantize.MEDIANCUT)
        indexed=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
        indexed[0].save(out/"scan-replay.gif", save_all=True, append_images=indexed[1:],
                        duration=[80, 80, 90]*(total//3), loop=0, optimize=True, disposal=1)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT, help="Checkout containing the candidate fixtures")
    parser.add_argument("--package", type=Path, help="Already extracted WASM package; no network/build")
    parser.add_argument("--out", type=Path, default=ROOT/"docs/assets/readme")
    parser.add_argument("--artifact-url", default="")
    parser.add_argument("--tarball-sha256", default="")
    parser.add_argument("--recorded", action="store_true", help="Render from the existing scan-results.json")
    args=parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    if args.recorded:
        manifest=json.loads((args.out/"scan-results.json").read_text())
        for row in manifest["fixtures"]:
            assert hashlib.sha256((args.source/row["path"]).read_bytes()).hexdigest()==row["sha256"]
        for row in manifest.get("generated_qr_links", []):
            assert hashlib.sha256((args.out/row["file"]).read_bytes()).hexdigest()==row["sha256"]
    else:
        if args.package is None:parser.error("--package or --recorded is required")
        manifest=collect(args.source.resolve(), args.package.resolve(), args.artifact_url, args.tarball_sha256)
        manifest["generated_qr_links"]=link_codes(args.package.resolve(), args.out.resolve())
        (args.out/"scan-results.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+"\n")
    render(args.source.resolve(), manifest, args.out.resolve())
    print(json.dumps({p.name:p.stat().st_size for p in sorted(args.out.iterdir()) if p.is_file()}, indent=2))


if __name__ == "__main__":
    main()
