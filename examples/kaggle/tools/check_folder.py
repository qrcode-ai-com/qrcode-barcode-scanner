#!/usr/bin/env python3
"""Judge examples/kaggle as `kaggle kernels push -p FOLDER` publishes it.

  python3 examples/kaggle/tools/check_folder.py FOLDER --requirements FILE
  python3 examples/kaggle/tools/check_folder.py --self-test

  metadata  kernel-metadata.json holds only fields the Kaggle CLI reads; a Python notebook, public,
            no GPU, Internet on (the install and the sample need it), the original environment
            pinned, distinct tags; its id is <username>/<slug>, the slug Kaggle derives from the
            title, and code_file is a notebook beside it
  notebook  committed without outputs; its install cell pins the one version FILE pins with
            hashes (scripts/check-demo-notebook.py `source`, whose six product links are left
            out); its first cell links the PyPI page of that version and the source repository,
            and no cell links a QR Code AI product page (the owner's Kaggle terms decision,
            examples/kaggle/LISTING.md); a code cell reads the sample from the release tag of
            that version and one writes scan-reports/

Stdlib only. Exit 0 when the folder passes, 1 when it does not, 2 when it cannot be read.
"""
import argparse
import importlib.util
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
_SPEC = importlib.util.spec_from_file_location("check_demo_notebook", ROOT / "scripts" / "check-demo-notebook.py")
demo = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(demo)

FIELDS = {"id", "id_no", "title", "code_file", "language", "kernel_type", "is_private", "enable_gpu",
          "enable_tpu", "enable_internet", "machine_shape", "dataset_sources", "competition_sources",
          "kernel_sources", "model_sources", "keywords", "docker_image_pinning_type", "docker_image"}
WANT = {"language": "python", "kernel_type": "notebook", "is_private": False, "enable_gpu": False,
        "enable_internet": True, "docker_image_pinning_type": "original"}
KERNEL_ID = re.compile(r"^([A-Za-z0-9_-]+)/([a-z0-9-]+)$")
PYPI_PAGE = "https://pypi.org/project/{package}/{version}/"
SOURCE = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
SAMPLE_PATH = "/fixtures/symbology/mixed-code128-qr.png"


def slug(title):
    """The slug Kaggle derives from a title (python-slugify on ASCII text): lower case, every run
    of other characters one dash."""
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def judge_source(notebook, requirements):
    """The `source` problems of scripts/check-demo-notebook.py, without its six product links,
    which this notebook does not show."""
    product = {f"links: the first cell has no link to {address}" for address in demo.links_of("sdk/python")}
    return [problem for problem in demo.judge_source(notebook, requirements, "sdk/python") if problem not in product]


def judge(metadata, notebook, requirements, code_file_present=True):
    """The problems of the folder as committed (kernel-metadata.json and its notebook)."""
    if not isinstance(metadata, dict):
        return ["metadata: kernel-metadata.json does not hold one JSON object"]
    problems = [f"metadata: {key} is not a field kaggle kernels push reads" for key in sorted(set(metadata) - FIELDS)]
    for key, value in WANT.items():
        if type(metadata.get(key)) is not type(value) or metadata.get(key) != value:
            problems.append(f"metadata: {key} is {metadata.get(key)!r}, want {value!r}")
    title = metadata.get("title")
    match = KERNEL_ID.match(str(metadata.get("id", "")))
    if not isinstance(title, str) or len(title) < 5:
        problems.append("metadata: the title must be a text of five characters or more")
    elif not match:
        problems.append(f"metadata: id {metadata.get('id')!r} is not <username>/<slug>")
    elif match[2] != slug(title):
        problems.append(f"metadata: the id's slug {match[2]!r} is not the title's slug {slug(title)!r}")
    if "id_no" in metadata:
        problems.append("metadata: id_no would override id; the first push creates the notebook from id")
    if not code_file_present:
        problems.append(f"metadata: code_file {metadata.get('code_file')!r} is not a notebook beside it")
    keywords = metadata.get("keywords")
    if not isinstance(keywords, list) or not keywords or len(set(map(str, keywords))) != len(keywords) \
            or not all(isinstance(word, str) and word for word in keywords):
        problems.append("metadata: keywords must be a list of distinct tags")
    problems += judge_source(notebook, requirements)
    code = demo.code_cells(notebook)
    pinned = sorted({version for cell in code for version in demo.PIN.findall(demo.text(cell))
                     if "pip install" in demo.text(cell)})
    cells = notebook.get("cells", [])
    first = demo.text(cells[0]) if cells and cells[0].get("cell_type") == "markdown" else ""
    shown = demo.MARKDOWN_LINK.findall(first)
    if len(pinned) == 1:
        if PYPI_PAGE.format(package=demo.PACKAGE, version=pinned[0]) not in shown:
            problems.append(f"links: the first cell has no link to the PyPI page of {pinned[0]}")
        sample = SOURCE.replace("https://github.com/", "https://raw.githubusercontent.com/") + f"/v{pinned[0]}"
        # Adjacent string literals are one string: "…/rust/"\n"v1.2.3/…" reads as …/rust/v1.2.3/….
        joined = [re.sub(r'"\s*\n?\s*"', "", demo.text(cell)) for cell in code]
        if not any(sample + SAMPLE_PATH in source for source in joined):
            problems.append(f"sample: no code cell reads the sample from tag v{pinned[0]}")
    if not any(address == SOURCE or address.startswith(SOURCE + "/") for address in shown):
        problems.append(f"links: the first cell has no link to the source repository {SOURCE}")
    every = [address for cell in cells for address in demo.MARKDOWN_LINK.findall(demo.text(cell))]
    if any("qrcode-ai.com" in address for address in every):
        problems.append("links: a QR Code AI product link is shown; the Kaggle notebook links the source and PyPI "
                        "only until the owner settles the terms decision (examples/kaggle/LISTING.md)")
    if not any("scan-reports" in demo.text(cell) for cell in code):
        problems.append("reports: no code cell writes the three reports to scan-reports/")
    return problems


def load(folder):
    """(metadata, notebook, code file present) of a folder; OSError or ValueError when unreadable."""
    folder = pathlib.Path(folder)
    metadata = json.loads((folder / "kernel-metadata.json").read_text(encoding="utf-8"))
    code = folder / str(metadata.get("code_file", "")) if isinstance(metadata, dict) else None
    present = bool(code) and code.suffix == ".ipynb" and code.is_file() and code.parent == folder
    notebook = json.loads(code.read_text(encoding="utf-8")) if present else {"cells": []}
    return metadata, notebook, present


def self_test():
    package = demo.PACKAGE
    requirements = f"{package}==9.9.9 \\\n    --hash=sha256:{'ab' * 32}\n"
    sample_url = SOURCE.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/v9.9.9" + SAMPLE_PATH
    intro = (f"# Demo\n\n[`{package}`]({PYPI_PAGE.format(package=package, version='9.9.9')}) "
             f"from [the source]({SOURCE}/tree/main/examples/kaggle).")
    good = {"cells": [
        {"cell_type": "markdown", "source": intro},
        {"cell_type": "code", "source": f"%pip install --quiet {package}==9.9.9", "outputs": [], "execution_count": None},
        {"cell_type": "code", "source": f'URL = "{sample_url}"\nout = "scan-reports"', "outputs": [],
         "execution_count": None},
    ]}
    meta = {"id": "someone/qr-code-barcode-scanner-demo", "title": "QR Code & Barcode Scanner demo",
            "code_file": "demo.ipynb", "language": "python", "kernel_type": "notebook", "is_private": False,
            "enable_gpu": False, "enable_internet": True, "docker_image_pinning_type": "original",
            "keywords": ["image", "python"]}
    failures = []

    def case(name, change, needle, present=True):
        metadata, notebook = json.loads(json.dumps(meta)), json.loads(json.dumps(good))
        change(metadata, notebook)
        problems = judge(metadata, notebook, requirements, present)
        if (needle is None) != (not problems) or (needle and not any(needle in row for row in problems)):
            failures.append(f"{name}: {problems}")

    def cell(index, **fields):
        return lambda m, nb: nb["cells"][index].update(**fields)

    third = good["cells"][2]["source"]
    case("good", lambda m, nb: None, None)
    case("private", lambda m, nb: m.update(is_private=True), "is_private is True")
    case("internet-off", lambda m, nb: m.update(enable_internet=False), "enable_internet is False")
    case("string-bool", lambda m, nb: m.update(enable_gpu="false"), "enable_gpu is 'false'")
    case("latest-image", lambda m, nb: m.update(docker_image_pinning_type="latest"), "docker_image_pinning_type")
    case("unknown-field", lambda m, nb: m.update(colour="blue"), "colour is not a field")
    case("slug", lambda m, nb: m.update(id="someone/qrcode-barcode-scanner-demo"), "is not the title's slug")
    case("id", lambda m, nb: m.update(id="qr-code-barcode-scanner-demo"), "is not <username>/<slug>")
    case("id-no", lambda m, nb: m.update(id_no=12), "id_no would override id")
    case("tags", lambda m, nb: m.update(keywords=["image", "image"]), "distinct tags")
    case("code-file", lambda m, nb: None, "is not a notebook beside it", present=False)
    case("output", cell(1, execution_count=1), "clean: code cell 1")
    case("other-version", cell(1, source=f"%pip install {package}==9.9.8"), "the notebook installs 9.9.8")
    case("no-pypi", cell(0, source=intro.replace("pypi.org", "example.com")), "no link to the PyPI page")
    case("no-source", cell(0, source=intro.replace(f"({SOURCE}/", "(https://example.com/")),
         "no link to the source repository")
    case("product-link", lambda m, nb: nb["cells"].append(
        {"cell_type": "markdown", "source": "[scanner](https://qrcode-ai.com/en-US/qr-code-scanner)"}), "product link")
    case("other-tag", cell(2, source=third.replace("v9.9.9", "v9.9.8")), "reads the sample from tag v9.9.9")
    case("split-url", cell(2, source=third.replace("/v9.9.9/", '/"\n    "v9.9.9/')), None)
    case("no-reports", cell(2, source=f'URL = "{sample_url}"'), "scan-reports")
    unhashed = judge(meta, good, f"{package}==9.9.9\n")
    if not any("pins no --hash" in row for row in unhashed):
        failures.append(f"no-hash requirements: {unhashed}")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (20 folders)")
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("folder", nargs="?")
    parser.add_argument("--requirements", help="the requirements file that pins the same version with hashes")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.folder or not args.requirements:
        parser.print_usage(sys.stderr)
        return 2
    try:
        metadata, notebook, present = load(args.folder)
        requirements = pathlib.Path(args.requirements).read_text(encoding="utf-8")
    except (OSError, ValueError) as error:
        print(f"check_folder: {error}", file=sys.stderr)
        return 2
    problems = judge(metadata, notebook, requirements, present)
    for problem in problems:
        print(f"FAILED · {problem}", file=sys.stderr)
    print(f"{'FAILED' if problems else 'ok'}    {args.folder} · kaggle")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
