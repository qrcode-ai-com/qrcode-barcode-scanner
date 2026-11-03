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
BG = "#070a16"
PANEL = "#101629"
BORDER = "#29304b"
TEXT = "#f5f5ff"
MUTED = "#a2aec7"
COLORS = ["#a98bff", "#43dfd2", "#f0b875"]
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
            f"/Library/Fonts/SF-Pro-Text-{'Semibold' if bold else 'Regular'}.otf",
            f"/System/Library/Fonts/Supplemental/Arial{' Bold' if bold else ''}.ttf",
            f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf",
        ]
    )
    for name in choices:
        if Path(name).is_file():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default(size=size)


def display_font(size):
    for name in [Path.home()/"Library/Fonts/Onest-ExtraBold.ttf",
                 Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
                 Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")]:
        if name.is_file():
            return ImageFont.truetype(str(name), size)
    return font(size, True)


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


def backdrop(size, strength=1.0):
    w, h = size
    small = Image.new("RGB", (160, 100))
    pix = small.load()
    for y in range(100):
        for x in range(160):
            violet = math.exp(-(((x-127)/56)**2 + ((y-34)/46)**2))*strength
            cyan = math.exp(-(((x-148)/40)**2 + ((y-79)/39)**2))*strength
            pix[x,y] = (round(7+24*violet+2*cyan), round(10+6*violet+17*cyan), round(22+43*violet+22*cyan))
    return small.resize((w,h), Image.Resampling.BICUBIC)


def divider(draw, x, y, width):
    draw.line((x,y,x+width,y), fill=BORDER, width=1)


def grad_text(image, xy, value, size):
    mask = Image.new("L", image.size)
    ImageDraw.Draw(mask).text(xy, value, font=display_font(size), fill=255)
    band = Image.new("RGB", image.size)
    d=ImageDraw.Draw(band)
    left, right = (169,139,255), (67,223,210)
    for x in range(image.width):
        t=min(1,max(0,(x-xy[0])/650))
        c=tuple(round(a*(1-t)+b*t) for a,b in zip(left,right))
        d.line((x,0,x,image.height),fill=c)
    image.paste(band,(0,0),mask)


def project_coefficients(corners, width, height):
    pairs=list(zip(corners,[(0,0),(width,0),(width,height),(0,height)]))
    rows=[]
    for (x,y),(u,v) in pairs:
        rows.extend([[x,y,1,0,0,0,-u*x,-u*y,u], [0,0,0,x,y,1,-v*x,-v*y,v]])
    for col in range(8):
        pivot=max(range(col,8),key=lambda r:abs(rows[r][col]))
        rows[col],rows[pivot]=rows[pivot],rows[col]
        scale=rows[col][col]
        rows[col]=[v/scale for v in rows[col]]
        for r in range(8):
            if r==col:continue
            scale=rows[r][col]
            rows[r]=[a-scale*b for a,b in zip(rows[r],rows[col])]
    return tuple(row[8] for row in rows)


def specimen_card(source, path, label, size):
    w,h=size
    im=Image.new("RGBA",size)
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((0,0,w-1,h-1),radius=28,fill="#f9faff")
    qr=Image.open(source/path).convert("RGB")
    thumb,pos,_=fit(qr,(32,28,w-64,h-96))
    im.paste(thumb,pos)
    text(d,(32,h-48),label,19,"#243044",True)
    return im


def float_card(image, card, corners, color):
    layer=card.transform(image.size,Image.Transform.PERSPECTIVE,
                         project_coefficients(corners,*card.size),Image.Resampling.BICUBIC)
    shadow=Image.new("RGBA",image.size)
    alpha=layer.getchannel("A")
    shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(24)).point(lambda a:round(a*.45)))
    image=Image.alpha_composite(image,shadow)
    image=Image.alpha_composite(image,layer)
    edge=Image.new("RGBA",image.size)
    d=ImageDraw.Draw(edge)
    d.line(corners+[corners[0]],fill=color,width=3,joint="curve")
    image=Image.alpha_composite(image,edge.filter(ImageFilter.GaussianBlur(12)))
    image=Image.alpha_composite(image,edge)
    return image


def hero(source, out):
    image=backdrop((1600,900),1.3).convert("RGBA")
    d=ImageDraw.Draw(image)
    # The finder motif belongs to the subject, rather than generic decorative dots.
    for ox,oy,scale in [(72,66,9),(99,66,9),(72,93,9)]:
        d.rounded_rectangle((ox,oy,ox+18,oy+18),radius=4,outline=COLORS[0],width=4)
    text(d,(134,67),"QR CODE AI",22,TEXT,True)
    text(d,(134,99),"OPEN-SOURCE SCANNER",16,MUTED,mono=True)
    d.rounded_rectangle((73,191,230,231),radius=20,fill="#201a39",outline="#514174")
    text(d,(92,201),"0.11 PREVIEW",16,COLORS[0],True)
    for y,line in [(270,"QR codes."),(378,"Barcodes.")]:
        d.text((66,y),line,font=display_font(108),fill=TEXT)
    grad_text(image,(69,512),"One Rust engine.",77)
    d=ImageDraw.Draw(image)
    text(d,(76,649),"Decode images and camera frames.",28,"#bec8dc")
    text(d,(76,690),"Inspect the quality of a QR design.",28,"#bec8dc")
    # Perspective is an editorial illustration of the supplied image fixtures.
    image=float_card(image,specimen_card(source,FIXTURES[1][2],"Artistic QR",(284,304)),
                     [(1260,90),(1536,144),(1482,421),(1218,369)],"#6b6298")
    image=float_card(image,specimen_card(source,FIXTURES[0][2],"QR Code",(480,505)),
                     [(941,219),(1392,277),(1334,678),(888,592)],COLORS[0])
    image=float_card(image,specimen_card(source,FIXTURES[8][2],"Code 128 · STOCK-4827",(575,235)),
                     [(941,651),(1494,584),(1511,779),(958,855)],COLORS[1])
    image.convert("RGB").save(out/"hero.png",optimize=True)


def gallery(source, manifest, out):
    image=backdrop((1600,1000),.5)
    d=ImageDraw.Draw(image)
    text(d,(64,44),"THE FORMAT COLLECTION",16,COLORS[1],True)
    d.text((60,83),"QR, matrix codes and barcodes",font=display_font(49),fill=TEXT)
    text(d,(65,152),"Real fixtures, decoded by the 0.11 development build.",22,MUTED)
    for i,(title,subtitle,path,_) in enumerate(FIXTURES):
        x,y=64+(i%4)*375,224+(i//4)*245
        color=COLORS[0] if i<4 else COLORS[1] if i<8 else COLORS[2]
        d.rounded_rectangle((x,y,x+346,y+158),radius=17,fill="#fbfbff")
        thumb,pos,_=fit(Image.open(source/path).convert("RGB"),(x+20,y+15,306,128))
        image.paste(thumb,pos)
        d.rectangle((x,y+182,x+5,y+213),fill=color)
        text(d,(x+19,y+178),title,24,TEXT,True)
        text(d,(x+19,y+210),subtitle,16,MUTED)
    divider(d,64,968,1472)
    image.save(out/"gallery.png",optimize=True)


def mixed_scene(source, report, out):
    image=backdrop((1600,950),.6)
    d=ImageDraw.Draw(image)
    text(d,(64,46),"MIXED QR + BARCODE",16,COLORS[1],True)
    d.text((60,86),"Both codes. One image.",font=display_font(57),fill=TEXT)
    text(d,(65,165),"QR Code and Code 128, returned together.",25,MUTED)
    d.rounded_rectangle((64,234,1536,735),radius=25,fill="#fbfbff")
    thumb,pos,ratio=fit(Image.open(source/MIXED).convert("RGB"),(90,256,1420,455))
    image.paste(thumb,pos)
    for row in occurrences(report):
        c=COLORS[0] if row["symbology"]=="qr_code" else COLORS[1]
        measured_outline(d,row["geometry"],pos,ratio,c,4)
    for x,label,value,color in [(64,"QR CODE","https://qrc-ai.com/76xMa",COLORS[0]),
                                (824,"CODE 128","STOCK-4827",COLORS[1])]:
        d.rounded_rectangle((x,777,x+712,891),radius=17,fill=PANEL,outline=BORDER)
        text(d,(x+24,795),label,15,color,True)
        text(d,(x+24,833),value,27,TEXT,mono=True)
    text(d,(66,921),"Recorded scan · measured quad and reading segment",16,MUTED)
    image.save(out/"mixed-codes.png",optimize=True)


def payload_gallery(source, out):
    image=backdrop((1600,520),.6)
    d=ImageDraw.Draw(image)
    text(d,(64,36),"INSIDE THE QR",15,COLORS[0],True)
    d.text((60,75),"A link is just the beginning.",font=display_font(47),fill=TEXT)
    for i,(title,subtitle,path) in enumerate(PAYLOADS):
        x,y=64+i*375,165
        d.rounded_rectangle((x,y,x+346,y+228),radius=18,fill="#fbfbff")
        thumb,pos,_=fit(Image.open(source/path).convert("RGB"),(x+30,y+20,286,188))
        image.paste(thumb,pos)
        text(d,(x,y+249),title,25,TEXT,True)
        text(d,(x,y+285),subtitle,17,MUTED)
    image.save(out/"payloads.png",optimize=True)


def replay_frame(source, report, frame, total):
    image=backdrop((1440,900),.8)
    d=ImageDraw.Draw(image)
    text(d,(52,37),"MULTIPLE CODES",15,COLORS[0],True)
    d.text((49,72),"Select the code you need.",font=display_font(50),fill=TEXT)
    d.rounded_rectangle((1124,53,1388,110),radius=28,fill=PANEL,outline=BORDER)
    text(d,(1146,70),"2 contents · 3 locations",17,MUTED)
    d.rounded_rectangle((52,173,1388,625),radius=26,fill="#fbfbff")
    scene,pos,ratio=fit(Image.open(source/TWINS).convert("RGB"),(74,194,1292,408))
    image.paste(scene,pos)
    rows=occurrences(report)
    selected=min(2,(frame*3)//total)
    phase=(frame%(total//3))/(total//3)
    # This focus treatment is presentation over a recorded report, not decoder input.
    if rows[selected]["geometry"]["kind"] == "quad":
        original=image.copy()
        stage=image.crop((52,173,1388,625)).filter(ImageFilter.GaussianBlur(3))
        stage=Image.blend(stage,Image.new("RGB",stage.size,PANEL),.66)
        stage_mask=Image.new("L",stage.size)
        ImageDraw.Draw(stage_mask).rounded_rectangle((0,0,stage.width-1,stage.height-1),radius=26,fill=255)
        image.paste(stage,(52,173),stage_mask)
        mask=Image.new("L",image.size)
        ImageDraw.Draw(mask).polygon(points(rows[selected]["geometry"],pos,ratio),fill=255)
        image=Image.composite(original,image,mask)
    else:
        # A linear read supplies only a segment; do not fabricate a focus rectangle.
        stage=image.crop((52,173,1388,625))
        image.paste(Image.blend(stage,Image.new("RGB",stage.size,PANEL),.15),(52,173))
    glow=Image.new("RGBA",image.size)
    measured_outline(ImageDraw.Draw(glow),rows[selected]["geometry"],pos,ratio,COLORS[selected],9)
    glow=glow.filter(ImageFilter.GaussianBlur(9))
    opacity=.35+.3*math.sin(phase*math.pi)
    glow.putalpha(glow.getchannel("A").point(lambda a:round(a*opacity)))
    image=Image.alpha_composite(image.convert("RGBA"),glow)
    d=ImageDraw.Draw(image)
    for i,row in enumerate(rows):
        measured_outline(d,row["geometry"],pos,ratio,COLORS[i],5 if i==selected else 2)
    for i,row in enumerate(rows):
        x=52+i*452
        color=COLORS[i]
        d.rounded_rectangle((x,653,x+432,745),radius=18,fill=PANEL,
                            outline=color if i==selected else BORDER,width=2 if i==selected else 1)
        d.ellipse((x+22,675,x+32,685),fill=color)
        text(d,(x+48,678),["QR Code · first copy","QR Code · second copy","Code 128"][i],24,TEXT,True)
    text(d,(55,781),rows[selected]["text"],27,COLORS[selected],mono=True)
    divider(d,52,840,1336)
    text(d,(55,855),"Recorded scan · illustrative selection replay",21,MUTED)
    return image.convert("RGB")



def render(source, manifest, out):
    reports = {f["path"]: f["report"] for f in manifest["fixtures"]}
    hero(source, out)
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
        palette_source=Image.new("RGB",(frames[0].width,frames[0].height*3))
        for j,index in enumerate([0,24,48]):palette_source.paste(frames[index],(0,j*frames[0].height))
        palette=palette_source.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
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
