"""The installed-package truth set, `fixtures/consumer-truth.json`.

Stage its inputs outside the checkout, then judge each report an installed
artifact returns: the exact contents as a multiset (order ignored), the
primary detection, every occurrence's geometry, the score/null association
and the unbudgeted, unsaturated trace. Stdlib only; the packed consumers load
this file by path (they run under `python -I`). The JavaScript twin is
`consumer-truth.mjs`: both read the same JSON and apply the same rules.
"""
import base64
import hashlib
import json
import math
from pathlib import Path
import shutil
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
TRUTH = ROOT / "fixtures/consumer-truth.json"
SCHEMA = "qrscan-consumer-truth/1"
QR_FAMILY = {"qr_code", "micro_qr_code", "rectangular_micro_qr_code"}
# points per geometry kind (spec/01-report.md § Occurrences)
POINTS = {"quad": (4, 4), "segment": (2, 2), "partial": (1, 8), "unavailable": (0, 0)}
# trace.saturation of a scan that reached no capacity (spec/01-report.md § PipelineTrace)
UNSATURATED = {"reads": False, "detections": False, "occurrences": False}


def load(path=TRUTH):
    return prepare(json.loads(Path(path).read_text(encoding="utf-8")))


def prepare(truth):
    """Check a parsed truth; a case without its own tolerance_px takes the document's."""
    assert truth["schema"] == SCHEMA, truth.get("schema")
    tolerance = truth.get("tolerance_px")
    pixels = type(tolerance) in (int, float) and math.isfinite(tolerance) and tolerance >= 0
    assert pixels, f"truth tolerance_px {tolerance!r}"
    ids = [case["id"] for case in truth["cases"]]
    assert len(ids) == len(set(ids)), "duplicate case id"
    for case in truth["cases"]:
        if case.get("tolerance_px") is None:
            case["tolerance_px"] = tolerance
    return truth


def white_png(width, height):
    """An all-white 8-bit greyscale PNG: a valid image with no symbol."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    rows = (b"\0" + b"\xff" * width) * height
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b""))


def case_bytes(case, fixtures):
    """The input bytes of a case: its fixture (hash checked) or its synthetic image."""
    if "file" in case:
        data = (Path(fixtures) / case["file"]).read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        assert digest == case["sha256"], f"{case['id']}: {case['file']} is {digest}, truth says {case['sha256']}"
        return data
    synthetic = case["synthetic"]
    if synthetic["kind"] == "white_png":
        return white_png(synthetic["width"], synthetic["height"])
    if synthetic["kind"] == "bytes":
        return synthetic["utf8"].encode()
    raise AssertionError(f"{case['id']}: unknown synthetic input {synthetic['kind']}")


def stage(truth, dest, fixtures=ROOT / "fixtures"):
    """Write every case's input under DEST (outside the checkout): [(case, path)]."""
    dest = Path(dest)
    staged = []
    for case in truth["cases"]:
        target = dest / (case["file"] if "file" in case else f"synthetic/{case['id']}.bin")
        target.parent.mkdir(parents=True, exist_ok=True)
        if "file" in case:
            shutil.copyfile(Path(fixtures) / case["file"], target)
            case_bytes(case, dest)
        else:
            target.write_bytes(case_bytes(case, fixtures))
        staged.append((case, target))
    return staged


def wire_content(expected):
    """An expected content in the report's wire shape (spec/01 § Content)."""
    content = {"text": expected["text"], "raw": base64.b64encode(bytes.fromhex(expected["raw_hex"])).decode(),
               "charset": expected["charset"]}
    for key in ("eci", "fnc1"):
        if key in expected:
            content[key] = expected[key]
    return content


def _near(points, want, tolerance):
    return len(points) == len(want) and all(
        math.hypot(p["x"] - x, p["y"] - y) <= tolerance for p, (x, y) in zip(points, want))


def _within(points, box, tolerance):
    x, y, w, h = box
    return all(x - tolerance <= p["x"] <= x + w + tolerance and y - tolerance <= p["y"] <= y + h + tolerance
               for p in points)


def _occurrence_fits(occurrence, want, tolerance):
    geometry = occurrence["geometry"]
    if geometry["kind"] != want["kind"]:
        return False
    if "near" in want and not _near(geometry["points"], want["near"], tolerance):
        return False
    return "within" not in want or _within(geometry["points"], want["within"], tolerance)


def _match_occurrences(occurrences, wanted, tolerance):
    """True when a one-to-one assignment of occurrences to expectations exists
    (occurrence order is the scanner's earliest read, not a contract)."""
    if len(occurrences) != len(wanted):
        return False
    def assign(index, free):
        if index == len(occurrences):
            return True
        return any(_occurrence_fits(occurrences[index], wanted[j], tolerance) and assign(index + 1, free - {j})
                   for j in free)
    return assign(0, frozenset(range(len(wanted))))


def geometry_problems(case, detection, size):
    """Structural rules every occurrence obeys, whatever the reader."""
    problems = []
    width, height = size
    for index, occurrence in enumerate(detection.get("occurrences", [])):
        geometry = occurrence["geometry"]
        kind, points, reader = geometry["kind"], geometry["points"], geometry.get("reader")
        where = f"{case['id']}: {detection['symbology']} occurrence {index}"
        if kind not in POINTS:
            problems.append(f"{where}: unknown kind {kind!r}")
            continue
        low, high = POINTS[kind]
        if not low <= len(points) <= high:
            problems.append(f"{where}: {kind} with {len(points)} points")
        if (reader is None) != (kind == "unavailable"):
            problems.append(f"{where}: reader {reader!r} for {kind}")
        if not all(math.isfinite(p["x"]) and math.isfinite(p["y"]) for p in points):
            problems.append(f"{where}: non-finite point")
        elif not _within(points, (0, 0, width, height), 2.0):
            problems.append(f"{where}: a point outside the {width}x{height} image")
    return problems


def judge(case, report, versions):
    """Every way REPORT departs from CASE's truth (empty: it conforms)."""
    problems = []
    name = case["id"]
    if report.get("versions") != versions:
        problems.append(f"{name}: versions {report.get('versions')} != {versions}")
    if report["trace"]["budget_exhausted"] is not False:
        problems.append(f"{name}: the unbudgeted scan was cut")
    saturation = report["trace"].get("saturation")
    if saturation is None:
        problems.append(f"{name}: no trace.saturation")
    elif canonical(saturation) != canonical(UNSATURATED):
        problems.append(f"{name}: saturated {saturation}")
    detections = report["detections"]
    expected = case["contents"]
    found = []
    for want in expected:
        if "raw_hex" in want:
            content = wire_content(want)
            matches = [i for i, d in enumerate(detections)
                       if d["symbology"] == want["symbology"] and d["content"] == content]
        else:
            # a text truth states the text and its charset, not the bytes: no
            # reader independent of the scanner states them
            matches = [i for i, d in enumerate(detections)
                       if d["symbology"] == want["symbology"] and d["content"]["text"] == want["text"]
                       and d["content"].get("charset") == want.get("charset")]
        if len(matches) != 1:
            problems.append(f"{name}: {want['symbology']} {want['text']!r} found {len(matches)} times")
            found.append(None)
            continue
        found.append(matches[0])
        detection = detections[matches[0]]
        if not _match_occurrences(detection.get("occurrences", []), want["occurrences"], case["tolerance_px"]):
            seen = [(o["geometry"]["kind"], [(round(p["x"], 1), round(p["y"], 1)) for p in o["geometry"]["points"]])
                    for o in detection.get("occurrences", [])]
            problems.append(f"{name}: {want['symbology']} occurrences {seen} != {want['occurrences']}")
    unexpected = len(detections) - len({i for i in found if i is not None})
    if unexpected:
        extra = [(d["symbology"], d["content"]["text"]) for i, d in enumerate(detections) if i not in found]
        problems.append(f"{name}: {unexpected} unexpected detection(s) {extra}")
    primary = case.get("primary")
    if detections and primary == "qr_family" and detections[0]["symbology"] not in QR_FAMILY:
        problems.append(f"{name}: primary {detections[0]['symbology']} is not QR family")
    elif isinstance(primary, int) and found[primary] != 0:
        problems.append(f"{name}: detections[0] is not {expected[primary]['symbology']} {expected[primary]['text']!r}")
    score = case["score"]
    value = None if report["score"] is None else report["score"]["value"]
    if score is None and report["score"] is not None:
        problems.append(f"{name}: score {value}, truth says null")
    elif score == "present" and report["score"] is None:
        problems.append(f"{name}: score null, truth says present")
    elif isinstance(score, int) and value != score:
        problems.append(f"{name}: score {value} != {score}")
    for detection in detections:
        problems += geometry_problems(case, detection, case.get("size", (math.inf, math.inf)))
    return problems


def canonical(value):
    """Key-sorted compact JSON, the form consumer-truth.mjs writes too."""
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def identity(report):
    """The order-free identity summary a receipt keeps: (symbology, content, occurrence kinds)."""
    return sorted(canonical([d["symbology"], d["content"], sorted(o["geometry"]["kind"] for o in d.get("occurrences", []))])
                  for d in report["detections"])


def identities_digest(identities):
    """One digest of {case id: identity} that every runtime's consumer computes alike."""
    return hashlib.sha256(canonical(identities).encode("utf-8")).hexdigest()


def conforming_report(case, versions):
    """A report built from CASE's truth alone: what a conforming scan returns."""
    def points(want):
        if "near" in want:
            return [{"x": x, "y": y} for x, y in want["near"]]
        x, y = want.get("within", [0, 0, 4, 4])[:2]
        return [{"x": x + i, "y": y + 1} for i in range(POINTS[want["kind"]][0])]
    detections = []
    for want in case["contents"]:
        content = wire_content(want) if "raw_hex" in want else {
            "text": want["text"], "raw": base64.b64encode(want["text"].encode()).decode(), "charset": want["charset"]}
        detections.append({"symbology": want["symbology"], "content": content, "occurrences": [
            {"geometry": {"kind": o["kind"], "points": points(o), "reader": None if o["kind"] == "unavailable" else "rxing"}}
            for o in want["occurrences"]]})
    if isinstance(case.get("primary"), int):
        detections.insert(0, detections.pop(case["primary"]))
    score = None if case["score"] is None else {"value": case["score"] if isinstance(case["score"], int) else 50}
    return {"versions": versions, "detections": detections, "score": score,
            "trace": {"budget_exhausted": False, "saturation": dict(UNSATURATED)}}


def self_test(truth):
    """The judge accepts every conforming report and names each departure."""
    import copy
    versions = {"scanner": "0.0.0", "pipeline": 5, "score_contract": 5}
    cases = {case["id"]: case for case in truth["cases"]}
    for case in truth["cases"]:
        if "error" not in case:
            assert judge(case, conforming_report(case, versions), versions) == [], case["id"]

    def mutated(case_id, change):
        report = copy.deepcopy(conforming_report(cases[case_id], versions))
        change(report)
        return judge(cases[case_id], report, versions)

    def point(report, detection, occurrence, dx):
        report["detections"][detection]["occurrences"][occurrence]["geometry"]["points"][0]["x"] += dx

    def setitem(target, key, value):
        target[key] = value

    refusals = {
        "a content lost": ("qr-twins-and-code128", lambda r: r["detections"].pop(), "found 0 times"),
        "an extra content": ("valid-empty", lambda r: r["detections"].append(
            conforming_report(cases["code128"], versions)["detections"][0]), "unexpected detection"),
        "a content twice": ("code128", lambda r: r["detections"].append(copy.deepcopy(r["detections"][0])),
                            "found 2 times"),
        "other bytes, same text": ("eci4-eci26-equal-text",
                                   lambda r: setitem(r["detections"][0]["content"], "raw", "og=="), "found 0 times"),
        "a declaration dropped": ("eci4-eci26-equal-text",
                                  lambda r: r["detections"][1]["content"].pop("eci"), "found 0 times"),
        "FNC1 dropped": ("qr-gs1-fnc1", lambda r: r["detections"][0]["content"].pop("fnc1"), "found 0 times"),
        "another symbology": ("ean13", lambda r: setitem(r["detections"][0], "symbology", "upc_a"),
                              "found 0 times"),
        "the barcode leads": ("qr-and-code128", lambda r: r["detections"].reverse(), "detections[0] is not"),
        "two copies merged": ("qr-twins-and-code128",
                              lambda r: r["detections"][0]["occurrences"].pop(), "occurrences"),
        "a corner 5 px off": ("eci4-eci26-equal-text", lambda r: point(r, 0, 0, 5.0), "occurrences"),
        "a segment off its bars": ("qr-twins-and-code128", lambda r: point(r, 1, 0, -100.0), "occurrences"),
        "a measured kind as unavailable": ("ean13", lambda r: setitem(
            r["detections"][0]["occurrences"][0], "geometry", {"kind": "unavailable", "points": [], "reader": None}),
            "occurrences"),
        "a quad of three points": ("aztec", lambda r: r["detections"][0]["occurrences"][0]["geometry"]["points"].pop(),
                                   "quad with 3 points"),
        "a reader without points": ("telepen", lambda r: setitem(
            r["detections"][0]["occurrences"][0]["geometry"], "reader", "rxing"), "reader 'rxing' for unavailable"),
        "a point off the image": ("qr-v5q-control", lambda r: point(r, 0, 0, -400.0), "outside"),
        "a null score": ("micro-qr", lambda r: setitem(r, "score", None), "score null"),
        "a score on nothing": ("valid-empty", lambda r: setitem(r, "score", {"value": 0}), "truth says null"),
        "another value": ("qr-v5q-control", lambda r: setitem(r, "score", {"value": 99}), "score 99 != 100"),
        "a cut scan": ("aztec", lambda r: setitem(r["trace"], "budget_exhausted", True), "was cut"),
        "a saturated scan": ("aztec", lambda r: setitem(r["trace"]["saturation"], "occurrences", True),
                             "saturated"),
        "no saturation": ("aztec", lambda r: r["trace"].pop("saturation"), "no trace.saturation"),
        # only all three flags, each false, are unsaturated (0 == False in Python)
        "a partial saturation": ("aztec", lambda r: r["trace"]["saturation"].pop("occurrences"), "saturated"),
        "a non-boolean flag": ("aztec", lambda r: setitem(r["trace"]["saturation"], "reads", 0), "saturated"),
        "a text truth's charset": ("rescue-occluded",
                                   lambda r: setitem(r["detections"][0]["content"], "charset", "latin1"),
                                   "found 0 times"),
        "other versions": ("aztec", lambda r: setitem(r, "versions", {**versions, "pipeline": 4}), "versions"),
    }
    for name, (case_id, change, expected) in refusals.items():
        problems = mutated(case_id, change)
        assert any(expected in problem for problem in problems), (name, problems)
    family = {**cases["qr-and-code128"], "primary": "qr_family"}
    report = conforming_report(cases["qr-and-code128"], versions)
    report["detections"].reverse()
    assert any("is not QR family" in p for p in judge(family, report, versions)), "a barcode as the QR-family primary"

    # a case that states no tolerance takes the document's
    def shifted(tolerance, dx):
        case = prepare({**truth, "tolerance_px": tolerance,
                        "cases": [{**cases["eci4-eci26-equal-text"], "tolerance_px": None}]})["cases"][0]
        moved = conforming_report(case, versions)
        point(moved, 0, 0, dx)
        return judge(case, moved, versions)
    assert any("occurrences" in p for p in shifted(1, 1.5)), "a corner 1.5 px off at 1 px"
    assert shifted(3, 2.5) == [], ("a corner 2.5 px off at 3 px", shifted(3, 2.5))
    return len(refusals) + 2


if __name__ == "__main__":
    import sys
    assert sys.argv[1:] == ["--self-test"], "usage: consumer_truth.py --self-test"
    loaded = load()
    print(json.dumps({"self_test": "PASS", "cases": len(loaded["cases"]), "refusals": self_test(loaded)}))
