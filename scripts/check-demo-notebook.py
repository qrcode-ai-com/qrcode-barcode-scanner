#!/usr/bin/env python3
"""Check the demo notebook: as it is committed, and after a host has run it.

  check-demo-notebook.py source NOTEBOOK --requirements FILE --page-key KEY
  check-demo-notebook.py executed NOTEBOOK
  check-demo-notebook.py kaggle FOLDER --requirements FILE
  check-demo-notebook.py --self-test

`source` judges the notebook as committed:

  clean     no stored output and no execution count: a visitor sees only what their own run prints
  links     its first cell shows the six QR Code AI links, each with its exact address: the two
            scanner pages, the two guides of the notebook (its page KEY on the site, such as
            sdk/python) and the two generator pages
  version   the version its install cell pins is the one FILE pins (binder/requirements.txt, which
            a notebook host installs before the notebook opens)
  hashes    FILE pins that one requirement with --hash values, so pip refuses any other file

`kaggle` judges a folder `kaggle kernels push -p FOLDER` publishes (examples/kaggle/):

  metadata  kernel-metadata.json holds only fields the Kaggle CLI reads; a Python notebook, public,
            no GPU, Internet on (the install and the sample need it), the original environment
            pinned, distinct tags; its id is <username>/<slug>, the slug Kaggle derives from the
            title, and code_file is a notebook beside it
  notebook  clean, version and hashes as for `source`; its first cell links the PyPI page of
            the pinned version and the source repository, and no cell links a QR Code AI product
            page (the owner's Kaggle terms decision, examples/kaggle/LISTING.md); a code cell
            reads the sample from the release tag of that version and one writes scan-reports/

`executed` judges a copy a host ran from top to bottom (Run All, `jupyter execute` or
`jupyter nbconvert --execute`): every code cell ran, in order, and none ended in an error. The
cells assert their own results, so a cell without an error did what it says.

Stdlib only. Exit 0 when the notebook passes, 1 when it does not, 2 for usage or a missing input.
"""
import argparse
import json
import pathlib
import re
import sys

PACKAGE = "qrcode-barcode-scanner"
SITE = "https://qrcode-ai.com/en-US"


def links_of(page_key):
    """The six links of a notebook whose guide is PAGE_KEY on the site, in three pairs."""
    return (
        f"{SITE}/qr-code-scanner",
        f"{SITE}/barcode-scanner",
        f"{SITE}/qr-code-scanner/{page_key}",
        f"{SITE}/barcode-scanner/{page_key}",
        f"{SITE}/qr-code-generator",
        f"{SITE}/barcode-generator",
    )


PIN = re.compile(rf"(?<![\w.-]){re.escape(PACKAGE)}==([0-9]+\.[0-9]+\.[0-9]+)(?![\w.])")
MARKDOWN_LINK = re.compile(r"\]\(([^)\s]+)\)")


def text(cell):
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else str(source)


def code_cells(notebook):
    return [cell for cell in notebook.get("cells", []) if cell.get("cell_type") == "code"]


def judge_source(notebook, requirements, page_key):
    """The problems of the committed notebook, as text; none when it passes."""
    problems = []
    for index, cell in enumerate(code_cells(notebook), 1):
        if cell.get("outputs") or cell.get("execution_count") is not None:
            problems.append(f"clean: code cell {index} stores an output or an execution count")
    cells = notebook.get("cells", [])
    first = text(cells[0]) if cells and cells[0].get("cell_type") == "markdown" else ""
    shown = MARKDOWN_LINK.findall(first)
    for address in links_of(page_key) if page_key else ():
        if address not in shown:
            problems.append(f"links: the first cell has no link to {address}")
    pinned = sorted({version for cell in code_cells(notebook) for version in PIN.findall(text(cell))
                     if "pip install" in text(cell)})
    lines = [line.strip() for line in requirements.splitlines()
             if line.strip() and not line.strip().startswith("#")]
    required = PIN.findall(" ".join(lines))
    if len(pinned) != 1:
        problems.append(f"version: the notebook's install cells pin {pinned or 'no version'}, expected exactly one")
    if len(required) != 1 or len([line for line in lines if not line.startswith("--hash=")]) != 1:
        problems.append("version: the requirements file does not hold exactly one pinned requirement")
    elif pinned and pinned != required:
        problems.append(f"version: the notebook installs {pinned[0]}, the requirements file {required[0]}")
    if not re.search(r"--hash=sha256:[0-9a-f]{64}", requirements):
        problems.append("hashes: the requirements file pins no --hash=sha256 value")
    return problems


def judge_executed(notebook):
    """The problems of a notebook a host ran from top to bottom; none when it passes."""
    problems = []
    cells = code_cells(notebook)
    if not cells:
        problems.append("executed: the notebook has no code cell")
    counts = [cell.get("execution_count") for cell in cells]
    for index, (cell, count) in enumerate(zip(cells, counts), 1):
        if not isinstance(count, int):
            problems.append(f"executed: code cell {index} did not run")
        for output in cell.get("outputs", []):
            if output.get("output_type") == "error":
                problems.append(f"executed: code cell {index} ended in {output.get('ename')}: "
                                f"{str(output.get('evalue'))[:200]}")
    ran = [count for count in counts if isinstance(count, int)]
    if ran != sorted(ran) or len(set(ran)) != len(ran):
        problems.append(f"executed: the cells did not run once each, in order (counts {counts})")
    return problems


# ------------------------------------------------------------------------------------------ kaggle

KAGGLE_FIELDS = {"id", "id_no", "title", "code_file", "language", "kernel_type", "is_private",
                 "enable_gpu", "enable_tpu", "enable_internet", "machine_shape", "dataset_sources",
                 "competition_sources", "kernel_sources", "model_sources", "keywords",
                 "docker_image_pinning_type", "docker_image"}
KAGGLE_WANT = {"language": "python", "kernel_type": "notebook", "is_private": False, "enable_gpu": False,
               "enable_internet": True, "docker_image_pinning_type": "original"}
KAGGLE_ID = re.compile(r"^([A-Za-z0-9_-]+)/([a-z0-9-]+)$")
PYPI_PAGE = "https://pypi.org/project/{package}/{version}/"
SOURCE = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
SAMPLE_PATH = "/fixtures/symbology/mixed-code128-qr.png"


def kaggle_slug(title):
    """The slug Kaggle derives from a title (python-slugify on ASCII text): lower case, every run
    of other characters one dash."""
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def judge_kaggle(metadata, notebook, requirements, code_file_present=True):
    """The problems of the Kaggle folder as committed (kernel-metadata.json and its notebook)."""
    problems = []
    if not isinstance(metadata, dict):
        return ["metadata: kernel-metadata.json does not hold one JSON object"]
    for key in sorted(set(metadata) - KAGGLE_FIELDS):
        problems.append(f"metadata: {key} is not a field kaggle kernels push reads")
    for key, value in KAGGLE_WANT.items():
        if type(metadata.get(key)) is not type(value) or metadata.get(key) != value:
            problems.append(f"metadata: {key} is {metadata.get(key)!r}, want {value!r}")
    title = metadata.get("title")
    match = KAGGLE_ID.match(str(metadata.get("id", "")))
    if not isinstance(title, str) or len(title) < 5:
        problems.append("metadata: the title must be a text of five characters or more")
    elif not match:
        problems.append(f"metadata: id {metadata.get('id')!r} is not <username>/<slug>")
    elif match[2] != kaggle_slug(title):
        problems.append(f"metadata: the id's slug {match[2]!r} is not the title's slug {kaggle_slug(title)!r}")
    if "id_no" in metadata:
        problems.append("metadata: id_no would override id; the first push creates the notebook from id")
    if not code_file_present:
        problems.append(f"metadata: code_file {metadata.get('code_file')!r} is not a notebook beside it")
    keywords = metadata.get("keywords")
    if not isinstance(keywords, list) or not keywords or not all(isinstance(word, str) and word for word in keywords) \
            or len(set(keywords)) != len(keywords):
        problems.append("metadata: keywords must be a list of distinct tags")
    problems += judge_source(notebook, requirements, None)
    pinned = sorted({version for cell in code_cells(notebook) for version in PIN.findall(text(cell))
                     if "pip install" in text(cell)})
    cells = notebook.get("cells", [])
    first = text(cells[0]) if cells and cells[0].get("cell_type") == "markdown" else ""
    shown = MARKDOWN_LINK.findall(first)
    if len(pinned) == 1:
        if PYPI_PAGE.format(package=PACKAGE, version=pinned[0]) not in shown:
            problems.append(f"links: the first cell has no link to the PyPI page of {pinned[0]}")
        sample = f"{SOURCE.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/v{pinned[0]}"
        # Adjacent string literals are one string: "…/rust/"\n"v1.2.3/…" reads as …/rust/v1.2.3/….
        joined = [re.sub(r'"\s*\n?\s*"', "", text(cell)) for cell in code_cells(notebook)]
        if not any(sample + SAMPLE_PATH in code for code in joined):
            problems.append(f"sample: no code cell reads the sample from tag v{pinned[0]}")
    if not any(address == SOURCE or address.startswith(SOURCE + "/") for address in shown):
        problems.append(f"links: the first cell has no link to the source repository {SOURCE}")
    every = [address for cell in cells for address in MARKDOWN_LINK.findall(text(cell))]
    if any("qrcode-ai.com" in address for address in every):
        problems.append("links: a QR Code AI product link is shown; the Kaggle notebook links the source and PyPI "
                        "only until the owner settles the terms decision (examples/kaggle/LISTING.md)")
    if not any("scan-reports" in text(cell) for cell in code_cells(notebook)):
        problems.append("reports: no code cell writes the three reports to scan-reports/")
    return problems


def load_kaggle(folder):
    """(metadata, notebook, code file present) of a Kaggle folder; OSError or ValueError when unreadable."""
    folder = pathlib.Path(folder)
    metadata = json.loads((folder / "kernel-metadata.json").read_text(encoding="utf-8"))
    code = folder / str(metadata.get("code_file", "")) if isinstance(metadata, dict) else None
    present = bool(code) and code.suffix == ".ipynb" and code.is_file() and code.parent == folder
    notebook = json.loads(code.read_text(encoding="utf-8")) if present else {"cells": []}
    return metadata, notebook, present


def self_test():
    requirements = f"# pinned\n{PACKAGE}==9.9.9 \\\n    --hash=sha256:{'ab' * 32} \\\n    --hash=sha256:{'cd' * 32}\n"
    links = links_of("sdk/test")
    intro = "# Title\n\n" + " · ".join(f"[page {index}]({address})" for index, address in enumerate(links))
    good = {"cells": [
        {"cell_type": "markdown", "source": intro},
        {"cell_type": "code", "source": [f"%pip install --quiet {PACKAGE}==9.9.9\n"], "outputs": [], "execution_count": None},
        {"cell_type": "code", "source": "print(1)", "outputs": [], "execution_count": None},
    ]}
    failures = []

    def expect(name, problems, needle):
        if (needle is None) != (not problems) or (needle and not any(needle in row for row in problems)):
            failures.append(f"{name}: {problems}")

    def source(name, change, needle, requirements=requirements):
        notebook = json.loads(json.dumps(good))
        change(notebook)
        expect(name, judge_source(notebook, requirements, "sdk/test"), needle)

    source("good", lambda nb: None, None)
    source("stored-output", lambda nb: nb["cells"][2].update(outputs=[{"output_type": "stream"}]), "clean: code cell 2")
    source("stored-count", lambda nb: nb["cells"][1].update(execution_count=3), "clean: code cell 1")
    source("missing-scanner-page", lambda nb: nb["cells"][0].update(source=intro.replace(f"({links[1]})", "(https://example.test/)")),
           "no link to https://qrcode-ai.com/en-US/barcode-scanner")
    source("missing-guide", lambda nb: nb["cells"][0].update(source=intro.replace(f"({links[2]})", "(https://example.test/)")),
           "no link to https://qrcode-ai.com/en-US/qr-code-scanner/sdk/test")
    source("missing-generator", lambda nb: nb["cells"][0].update(source=intro.replace(f"({links[4]})", "(https://example.test/)")),
           "no link to https://qrcode-ai.com/en-US/qr-code-generator")
    source("link-not-first", lambda nb: nb["cells"].insert(0, {"cell_type": "markdown", "source": "# Other"}),
           "no link to https://qrcode-ai.com/en-US/qr-code-scanner")
    source("other-version", lambda nb: nb["cells"][1].update(source=f"%pip install {PACKAGE}==9.9.8"),
           "the notebook installs 9.9.8, the requirements file 9.9.9")
    source("no-pin", lambda nb: nb["cells"][1].update(source=f"%pip install {PACKAGE}"), "pin no version")
    source("no-hash", lambda nb: None, "pins no --hash", requirements=f"{PACKAGE}==9.9.9\n")
    source("two-requirements", lambda nb: None, "exactly one pinned requirement",
           requirements=requirements + "other==1.0.0\n")

    def executed(name, change, needle):
        notebook = json.loads(json.dumps(good))
        for count, cell in enumerate(code_cells(notebook), 1):
            cell["execution_count"] = count
        change(notebook)
        expect(name, judge_executed(notebook), needle)

    executed("ran", lambda nb: None, None)
    executed("not-run", lambda nb: nb["cells"][2].update(execution_count=None), "code cell 2 did not run")
    executed("error", lambda nb: nb["cells"][2].update(
        outputs=[{"output_type": "error", "ename": "AssertionError", "evalue": "fast"}]), "ended in AssertionError: fast")
    executed("out-of-order", lambda nb: nb["cells"][1].update(execution_count=5), "did not run once each, in order")
    executed("no-code", lambda nb: nb.update(cells=[nb["cells"][0]]), "has no code cell")
    sample_url = SOURCE.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/v9.9.9" + SAMPLE_PATH
    kaggle_intro = (f"# Demo\n\n[`{PACKAGE}`]({PYPI_PAGE.format(package=PACKAGE, version='9.9.9')}) "
                    f"from [the source]({SOURCE}/tree/main/examples/kaggle).")
    kaggle_good = {"cells": [
        {"cell_type": "markdown", "source": kaggle_intro},
        {"cell_type": "code", "source": f"%pip install --quiet {PACKAGE}==9.9.9", "outputs": [], "execution_count": None},
        {"cell_type": "code", "source": f'URL = "{sample_url}"\nout = "scan-reports"', "outputs": [],
         "execution_count": None},
    ]}
    meta_good = {"id": "someone/qr-code-barcode-scanner-demo", "title": "QR Code & Barcode Scanner demo",
                 "code_file": "demo.ipynb", "language": "python", "kernel_type": "notebook", "is_private": False,
                 "enable_gpu": False, "enable_internet": True, "docker_image_pinning_type": "original",
                 "keywords": ["image", "python"]}

    def kaggle(name, change, needle, present=True):
        metadata, notebook = json.loads(json.dumps(meta_good)), json.loads(json.dumps(kaggle_good))
        change(metadata, notebook)
        expect(name, judge_kaggle(metadata, notebook, requirements, present), needle)

    kaggle("kaggle-good", lambda m, nb: None, None)
    kaggle("kaggle-private", lambda m, nb: m.update(is_private=True), "is_private is True")
    kaggle("kaggle-internet-off", lambda m, nb: m.update(enable_internet=False), "enable_internet is False")
    kaggle("kaggle-string-bool", lambda m, nb: m.update(enable_gpu="false"), "enable_gpu is 'false'")
    kaggle("kaggle-latest-image", lambda m, nb: m.update(docker_image_pinning_type="latest"), "docker_image_pinning_type")
    kaggle("kaggle-unknown-field", lambda m, nb: m.update(colour="blue"), "colour is not a field")
    kaggle("kaggle-slug", lambda m, nb: m.update(id="someone/qrcode-barcode-scanner-demo"), "is not the title's slug")
    kaggle("kaggle-id", lambda m, nb: m.update(id="qr-code-barcode-scanner-demo"), "is not <username>/<slug>")
    kaggle("kaggle-id-no", lambda m, nb: m.update(id_no=12), "id_no would override id")
    kaggle("kaggle-tags", lambda m, nb: m.update(keywords=["image", "image"]), "distinct tags")
    kaggle("kaggle-code-file", lambda m, nb: None, "is not a notebook beside it", present=False)
    kaggle("kaggle-output", lambda m, nb: nb["cells"][1].update(execution_count=1), "clean: code cell 1")
    kaggle("kaggle-other-version", lambda m, nb: nb["cells"][1].update(source=f"%pip install {PACKAGE}==9.9.8"),
           "the notebook installs 9.9.8")
    kaggle("kaggle-no-pypi", lambda m, nb: nb["cells"][0].update(source=kaggle_intro.replace("pypi.org", "example.com")),
           "no link to the PyPI page")
    kaggle("kaggle-no-source", lambda m, nb: nb["cells"][0].update(source=kaggle_intro.replace(f"({SOURCE}/", "(https://example.com/")),
           "no link to the source repository")
    kaggle("kaggle-product-link", lambda m, nb: nb["cells"].append(
        {"cell_type": "markdown", "source": "[scanner](https://qrcode-ai.com/en-US/qr-code-scanner)"}), "product link")
    kaggle("kaggle-other-tag", lambda m, nb: nb["cells"][2].update(source=nb["cells"][2]["source"].replace("v9.9.9", "v9.9.8")),
           "reads the sample from tag v9.9.9")
    kaggle("kaggle-split-url", lambda m, nb: nb["cells"][2].update(
        source=nb["cells"][2]["source"].replace("/v9.9.9/", '/"\n    "v9.9.9/')), None)
    kaggle("kaggle-no-reports", lambda m, nb: nb["cells"][2].update(source=f'URL = "{sample_url}"'), "scan-reports")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (11 committed notebooks, 5 executed notebooks, "
          "19 Kaggle folders)")
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Check the demo notebook.")
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("source", help="judge the notebook as committed")
    one.add_argument("notebook")
    one.add_argument("--requirements", required=True, help="the requirements file a notebook host installs")
    one.add_argument("--page-key", required=True, help="the notebook's guide on the site, such as sdk/python")
    two = commands.add_parser("executed", help="judge a copy a host ran from top to bottom")
    two.add_argument("notebook")
    three = commands.add_parser("kaggle", help="judge a folder kaggle kernels push publishes")
    three.add_argument("folder")
    three.add_argument("--requirements", required=True, help="the requirements file that pins the same version")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.command:
        parser.print_usage(sys.stderr)
        return 2
    if args.command == "kaggle":
        try:
            metadata, notebook, present = load_kaggle(args.folder)
            requirements = pathlib.Path(args.requirements).read_text(encoding="utf-8")
        except (OSError, ValueError) as error:
            print(f"check-demo-notebook: {error}", file=sys.stderr)
            return 2
        problems = judge_kaggle(metadata, notebook, requirements, present)
        for problem in problems:
            print(f"FAILED · {problem}", file=sys.stderr)
        print(f"{'FAILED' if problems else 'ok'}    {args.folder} · kaggle")
        return 1 if problems else 0
    try:
        notebook = json.loads(pathlib.Path(args.notebook).read_text(encoding="utf-8"))
        requirements = pathlib.Path(args.requirements).read_text(encoding="utf-8") if args.command == "source" else ""
    except (OSError, ValueError) as error:
        print(f"check-demo-notebook: {error}", file=sys.stderr)
        return 2
    if not isinstance(notebook, dict):
        print("check-demo-notebook: the file does not hold one notebook", file=sys.stderr)
        return 2
    problems = (judge_source(notebook, requirements, args.page_key) if args.command == "source"
                else judge_executed(notebook))
    for problem in problems:
        print(f"FAILED · {problem}", file=sys.stderr)
    print(f"{'FAILED' if problems else 'ok'}    {args.notebook} · {args.command}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
