"""The Actor through its entry point and its main function, against local storage and a local server."""
import asyncio
import io
import json
import os
import pathlib
import hashlib
import re

import pytest
import qrcode_barcode_scanner
from PIL import Image

from conftest import ACTOR_ROOT, CODE128, QR, fixtures_root
from qrscan_actor import main as actor

PROFILES = ("fast", "frame", "full")
ITEM_KEYS = {"source", "input", "ok", "count", "texts", "codes", "complete", "error", "report"}


def png(width, height, color="white"):
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buffer, format="PNG")
    return buffer.getvalue()


def record_url(store_id, key):
    return f"https://api.apify.com/v2/key-value-stores/{store_id}/records/{key}"


@pytest.mark.parametrize("profile", PROFILES)
def test_the_mixed_sample_by_url_gives_both_codes(run_actor, web, mixed_image, profile):
    url = web("mixed.png", mixed_image.read_bytes())
    run = run_actor({"imageUrls": [url], "profile": profile, "budgetMs": 0})
    assert run.returncode == 0, run.log
    [item] = run.items
    assert set(item) == ITEM_KEYS
    assert (item["source"], item["input"], item["ok"], item["error"]) == (url, "imageUrls", True, None)
    assert item["texts"] == [QR, CODE128] and item["count"] == 2 and item["complete"] is True
    assert item["codes"] == [{"symbology": "qr_code", "text": QR}, {"symbology": "code128", "text": CODE128}]
    report = item["report"]
    assert report["trace"]["budget_exhausted"] is False and report["trace"]["engine_panics"] == 0
    assert report["versions"]["scanner"] == "0.11.0"
    assert (report["score"] is None) == (profile == "frame")
    # The item's report is the engine's, unchanged.
    direct = qrcode_barcode_scanner.scan(mixed_image.read_bytes(), profile, budget_ms=0)
    assert report["detections"] == json.loads(json.dumps(direct["detections"]))
    assert "Read 1 image(s): 2 code(s) found, 0 image(s) not readable." in run.log


def test_an_uploaded_file_is_read_from_its_key_value_store(run_actor, mixed_image):
    stores = {"uploads": {"mixed.png": str(mixed_image)}}
    run = run_actor({"imageFiles": [record_url("{store:uploads}", "mixed.png")]}, stores)
    assert run.returncode == 0, run.log
    [item] = run.items
    assert item["source"] == record_url(run.store_ids["uploads"], "mixed.png")
    assert (item["input"], item["ok"], item["texts"]) == ("imageFiles", True, [QR, CODE128])
    assert item["report"]["score"] is not None, "the default profile is fast, which grades the QR code"


def test_each_image_is_one_item_and_a_bad_one_does_not_stop_the_run(run_actor, web, mixed_image):
    mixed = web("mixed.png", mixed_image.read_bytes())
    sources = [
        mixed,
        mixed.replace("mixed.png", "absent.png"),
        web("broken.png", b"this is not an image"),
        "ftp://example.com/code.png",
        web("declared.png", b"\0" * (actor.MAX_BYTES + 1)),
        web("streamed.png", b"\0" * (actor.MAX_BYTES + 1), declare_length=False),
        web("wide.png", png(5000, 8)),
        web("blank.png", png(64, 48)),
        web("clean.png", (fixtures_root() / "clean" / "gen_v5_q.png").read_bytes()),
    ]
    run = run_actor({"imageUrls": sources, "profile": "fast"})
    assert run.returncode == 0, run.log
    assert [item["source"] for item in run.items] == sources
    assert [item["ok"] for item in run.items] == [True, False, False, False, False, False, False, True, True]
    errors = [item["error"] for item in run.items]
    assert errors[1] == "The server answered HTTP 404."
    assert re.search(r"\[QRS-001\]", errors[2])
    assert errors[3] == "Not an http or https URL."
    assert errors[4] == f"The image is {actor.MAX_BYTES + 1} bytes; the limit is {actor.MAX_BYTES} bytes."
    assert errors[5] == f"The image is over {actor.MAX_BYTES} bytes, the limit."
    assert re.search(r"\[QRS-\d{3}\]", errors[6])
    for item in run.items[1:7]:
        assert (item["count"], item["texts"], item["complete"], item["report"]) == (0, [], False, None)
    assert (run.items[7]["count"], run.items[7]["complete"], run.items[7]["error"]) == (0, True, None)
    assert run.items[8]["texts"] == ["https://qrcode-ai.com/c/v5q"]
    assert "Read 9 image(s): 3 code(s) found, 6 image(s) not readable." in run.log


@pytest.mark.parametrize("actor_input, message", [
    ({}, "Give at least one image URL or uploaded image file."),
    ({"imageUrls": ["  "], "imageFiles": []}, "Give at least one image URL or uploaded image file."),
    ({"imageUrls": ["http://127.0.0.1:9/a.png"], "profile": "slow"}, "Unknown profile 'slow'"),
    ({"imageUrls": ["http://127.0.0.1:9/a.png"], "budgetMs": 60_001}, "budgetMs must be a whole number"),
])
def test_an_unusable_input_fails_the_run_with_a_message(run_actor, actor_input, message):
    run = run_actor(actor_input)
    assert run.returncode == 1, run.log
    assert run.items == []
    assert message in run.log


def test_a_budget_cut_is_marked_incomplete(run_actor, web, mixed_image):
    run = run_actor({"imageUrls": [web("mixed.png", mixed_image.read_bytes())], "profile": "full", "budgetMs": 1})
    assert run.returncode == 0, run.log
    [item] = run.items
    assert item["ok"] is True
    assert item["complete"] is (not item["report"]["trace"]["budget_exhausted"])


def test_main_runs_in_process_with_the_documented_local_input_file(tmp_path, monkeypatch, web, mixed_image):
    """main() itself, with storage/key_value_stores/default/INPUT.json as `apify run` reads it."""
    storage = tmp_path / "storage"
    (storage / "key_value_stores" / "default").mkdir(parents=True)
    url = web("mixed.png", mixed_image.read_bytes())
    (storage / "key_value_stores" / "default" / "INPUT.json").write_text(json.dumps({"imageUrls": [url]}))
    for key in [key for key in os.environ if key.startswith(("APIFY_", "CRAWLEE_"))]:
        monkeypatch.delenv(key)
    monkeypatch.setenv("APIFY_LOCAL_STORAGE_DIR", str(storage))
    monkeypatch.setenv("NO_PROXY", "127.0.0.1,localhost")
    try:
        asyncio.run(actor.main())
    except SystemExit as exit:
        assert exit.code in (0, None)
    pages = sorted(path for path in (storage / "datasets" / "default").glob("*.json")
                   if not path.name.startswith("__"))
    [item] = [json.loads(path.read_text()) for path in pages]
    assert (item["ok"], item["texts"]) == (True, [QR, CODE128])


def test_the_input_rules_match_the_input_schema():
    schema = json.loads((ACTOR_ROOT / ".actor" / "input_schema.json").read_text())
    properties = schema["properties"]
    assert set(properties) == {"imageUrls", "imageFiles", "profile", "budgetMs"}
    assert properties["profile"]["enum"] == list(actor.PROFILES) and properties["profile"]["default"] == "fast"
    assert (properties["budgetMs"]["minimum"], properties["budgetMs"]["maximum"]) == (0, actor.MAX_BUDGET_MS)
    assert properties["imageFiles"]["editor"] == "fileupload" and properties["imageUrls"]["editor"] == "stringList"
    # The prefilled sample is the mixed fixture at the published tag.
    [prefill] = properties["imageUrls"]["prefill"]
    assert prefill == ("https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/"
                       f"v{qrcode_barcode_scanner.__version__}/fixtures/symbology/mixed-code128-qr.png")
    assert actor.read_input({"imageUrls": [" a "], "imageFiles": ["b"]}) == (
        [("imageUrls", "a"), ("imageFiles", "b")], "fast", 0)
    for bad in ({"imageUrls": "a"}, {"imageUrls": [1]}, {"imageUrls": ["a"], "budgetMs": True},
                {"imageUrls": ["a"], "budgetMs": 2.5}, {"imageUrls": ["a"], "budgetMs": -1}):
        with pytest.raises(actor.InputError):
            actor.read_input(bad)


def test_a_store_the_run_cannot_open_falls_back_to_the_address(monkeypatch):
    calls = []

    async def no_store(url):
        raise PermissionError("not your store")

    async def fetched(client, url):
        calls.append(url)
        return b"bytes"

    monkeypatch.setattr(actor, "read_record", no_store)
    monkeypatch.setattr(actor, "fetch", fetched)
    assert asyncio.run(actor.load(None, record_url("abc", "k.png"))) == b"bytes"
    assert calls == [record_url("abc", "k.png")]
    assert actor.RECORD_URL.match(record_url("user~uploads", "photo%201.png"))["key"] == "photo%201.png"
    assert actor.RECORD_URL.match("https://example.com/v2/key-value-stores/a/records/b") is None


def test_the_actor_definition_is_consistent():
    definition = json.loads((ACTOR_ROOT / ".actor" / "actor.json").read_text())
    assert definition["actorSpecification"] == 1 and re.fullmatch(r"[a-z0-9-]+", definition["name"])
    for key in ("inputSchema", "outputSchema", "dockerfile", "readme", "changelog"):
        assert (ACTOR_ROOT / ".actor" / definition[key]).is_file(), key
    assert (ACTOR_ROOT / ".actor" / definition["storages"]["dataset"]).is_file()
    dataset = json.loads((ACTOR_ROOT / ".actor" / "dataset_schema.json").read_text())
    assert set(dataset["fields"]["properties"]) == ITEM_KEYS == set(dataset["fields"]["required"])
    view = dataset["views"]["overview"]
    assert set(view["transformation"]["fields"]) == set(view["display"]["properties"]) <= ITEM_KEYS
    dockerfile = (ACTOR_ROOT / "Dockerfile").read_text()
    assert [line for line in dockerfile.splitlines() if line.startswith("FROM ")] == ["FROM apify/actor-python:3.12"]
    assert 'org.opencontainers.image.licenses="AGPL-3.0-or-later"' in dockerfile
    assert 'CMD ["python", "-m", "qrscan_actor"]' in dockerfile
    assert (ACTOR_ROOT / "requirements.txt").read_text().split() == [
        "apify==4.3.0", "httpx==0.28.1", "qrcode-barcode-scanner==0.11.0"]


def test_the_definition_files_match_apify_published_schemas():
    """Opt-in: QRSCAN_APIFY_SCHEMAS names a folder with Apify's actor, input and dataset .ide.json files."""
    folder = os.environ.get("QRSCAN_APIFY_SCHEMAS")
    if not folder:
        pytest.skip("QRSCAN_APIFY_SCHEMAS is not set")
    jsonschema = pytest.importorskip("jsonschema")
    for name, kind in (("actor.json", "actor"), ("input_schema.json", "input"),
                       ("dataset_schema.json", "dataset"), ("output_schema.json", "output")):
        schema = json.loads((pathlib.Path(folder) / f"{kind}.ide.json").read_text())
        document = json.loads((ACTOR_ROOT / ".actor" / name).read_text())
        validator = jsonschema.validators.validator_for(schema)(schema)
        errors = sorted(validator.iter_errors(document), key=str)
        assert not errors, (name, [error.message for error in errors[:5]])


def test_the_acceptance_reports_are_written_through_the_actor(run_actor, web, mixed_image):
    """Three reports for scripts/destination-acceptance.py, when an acceptance run asks for them."""
    out_dir = os.environ.get("QRSCAN_ACCEPTANCE_DIR")
    if not out_dir:
        pytest.skip("QRSCAN_ACCEPTANCE_DIR is not set")
    pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)
    url = web("mixed.png", mixed_image.read_bytes())
    for profile in PROFILES:
        [item] = run_actor({"imageUrls": [url], "profile": profile}).items
        (pathlib.Path(out_dir) / f"{profile}.json").write_text(json.dumps(item["report"]), encoding="utf-8")


# The three links public text may use; anything else in the Store page is an invented address.
LINKS = {"https://qrcode-ai.com/", "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust",
         "https://qrcode-ai-com.github.io/qrcode-barcode-scanner-rust/"}


def test_the_store_page_follows_apify_readme_guidance():
    """STORE.md is the README Apify shows: H2 and H3 only, the documented sections, the three links."""
    definition = json.loads((ACTOR_ROOT / ".actor" / "actor.json").read_text())
    assert definition["readme"] == "../STORE.md" and definition["changelog"] == "../CHANGELOG.md"
    assert 0 < len(definition["description"]) <= 300 and definition["title"] == "QR Code & Barcode Scanner"
    text = (ACTOR_ROOT / "STORE.md").read_text()
    lines = text.splitlines()
    fenced = False
    headings = []
    for line in lines:
        if line.startswith("```"):
            fenced = not fenced
        elif not fenced and line.startswith("#"):
            headings.append(line)
    # Apify uses the Actor title as the page's H1.
    assert all(re.match(r"^#{2,3} \S", heading) for heading in headings), headings
    h2 = [heading[3:] for heading in headings if heading.startswith("## ")]
    for wanted in ("What does QR Code & Barcode Scanner do?", "How to scan images", "Input", "Output",
                   "How much does it cost?", "FAQ"):
        assert wanted in h2, wanted
    assert len(re.findall(r"[A-Za-z0-9']+", text)) >= 300
    assert set(re.findall(r"\]\((https?://[^)\s]+)\)", text)) <= LINKS
    bare = {address for address in re.findall(r"https?://[^\s\"')\]]+", text) if "example.com" not in address}
    assert bare <= LINKS, bare - LINKS
    assert "<picture" not in text and "qrcode-ai-readme-actions" not in text and "\u2014" not in text
    # The input example is a valid input; the output example has the dataset item's keys.
    blocks = re.findall(r"```json\n(.*?)```", text, re.S)
    sources, profile, budget = actor.read_input(json.loads(blocks[0]))
    assert (len(sources), profile, budget) == (1, "fast", 0)
    assert set(json.loads(blocks[1])) == ITEM_KEYS


def test_the_engine_notices_are_the_v0_11_0_copies():
    """LICENSE-NOTES.md names the two engine notices the image carries, by their sha256."""
    notes = (ACTOR_ROOT / "LICENSE-NOTES.md").read_text()
    folder = ACTOR_ROOT / "licenses" / "engine-0.11.0"
    assert sorted(path.name for path in folder.iterdir()) == ["LICENSE-APACHE-2.0", "THIRD-PARTY.md"]
    for name in ("THIRD-PARTY.md", "LICENSE-APACHE-2.0"):
        digest = hashlib.sha256((folder / name).read_bytes()).hexdigest()
        assert digest in notes, name
    assert "AGPL-3.0-or-later" in notes and "176ac96ef16ee330dbfc6ada10327d0b4e23a8b2" in notes
    dockerignore = (ACTOR_ROOT / ".dockerignore").read_text().split()
    assert "licenses" not in dockerignore and "LICENSE-NOTES.md" not in dockerignore
