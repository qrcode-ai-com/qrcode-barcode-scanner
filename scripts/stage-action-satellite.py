#!/usr/bin/env python3
"""Stage the GitHub Action as the tree of its own repository.

  stage-action-satellite.py stage [--revision REV] --out DIR
  stage-action-satellite.py verify DIR
  stage-action-satellite.py --self-test

GitHub Marketplace lists an action from the `action.yml` at the root of a public repository, and
the `v*` tags of this repository start its package releases. The action therefore lives in a
repository of its own, qrcode-ai-com/qrcode-barcode-scanner-action, whose content is never edited
by hand: `stage` writes it from one commit of this repository (scripts/satellite_stage.py says
how), with:

  - every file of `integrations/github-action` at REV, its `mirror/` folder as `.github/workflows/`;
  - the mixed fixture its tests scan, as `test/fixtures/mixed-code128-qr.png`;
  - `SOURCE.json`: the commit and the sha256 of every staged file.

Before writing, the stage checks the action against this repository: the qrscan hashes pinned
in `src/releases.mjs` equal the release manifest of their version in distribution/releases/,
the default `version` input of `action.yml` is the pinned default, `action.yml` has the fields
the Marketplace form reads, and the file it runs is staged. Exit 0 when the step passes, 1 when
it fails, 2 for usage. Stdlib only.
"""
import json
import re
import subprocess
import sys

from satellite_stage import ROOT, Refused, Satellite, git

PACKAGE = "integrations/github-action"
FIXTURE = "fixtures/symbology/mixed-code128-qr.png"
BLOCK = re.compile(r"'(\d+\.\d+\.\d+)': Object\.freeze\(\{\s*tag: '([^']+)',\s*sums: '([0-9a-f]{64})',\s*archives: Object\.freeze\(\{(.*?)\}\),\s*\}\),", re.S)
ARCHIVE = re.compile(r"'([a-z0-9_-]+)': Object\.freeze\(\{\s*sha256: '([0-9a-f]{64})',\s*executable: '([0-9a-f]{64})'")
BRAND_COLORS = ("white", "black", "yellow", "blue", "green", "orange", "red", "purple", "gray-dark")


def pinned_table(text):
    """{version: (tag, sums, {target: (archive sha256, executable sha256)})} of src/releases.mjs."""
    table = {}
    for version, tag, sums, body in BLOCK.findall(text):
        table[version] = (tag, sums, {target: (archive, executable) for target, archive, executable in ARCHIVE.findall(body)})
    default = re.search(r"export const DEFAULT_VERSION = '(\d+\.\d+\.\d+)';", text)
    if not table or not default:
        raise Refused("src/releases.mjs holds no pinned release or no DEFAULT_VERSION")
    return table, default[1]


def manifest_table(manifest):
    release = manifest["release"]
    version = manifest["version"]
    archives = {}
    for name, asset in release["assets"].items():
        if "target" in asset:
            archives[asset["target"]] = (asset["sha256"], asset["executable"]["sha256"])
    return (manifest["tag"], release["checksums"]["sha256"], archives), release["checksums"]["name"] == f"qrcode-barcode-scanner-cli-{version}-SHA256SUMS"


def check(files, commit, root):
    table, default = pinned_table(files["src/releases.mjs"].decode())
    if default not in table:
        raise Refused(f"DEFAULT_VERSION {default} is not pinned in src/releases.mjs")
    for version, pinned in table.items():
        try:
            manifest = json.loads(git("show", f"{commit}:distribution/releases/v{version}.json", root=root))
        except subprocess.CalledProcessError as error:
            raise Refused(f"src/releases.mjs pins {version}, which has no manifest in distribution/releases/") from error
        expected, named = manifest_table(manifest)
        if not named:
            raise Refused(f"the manifest of {version} names another checksum file")
        if pinned != expected:
            raise Refused(f"src/releases.mjs pins other values for {version} than distribution/releases/v{version}.json")
    action = files["action.yml"].decode()
    if not re.search(rf"(?m)^  version:\n(?:    .*\n)*?    default: {re.escape(default)}$", action):
        raise Refused(f"the default version input of action.yml is not {default}")
    name = re.search(r"(?m)^name: (.+)$", action)
    description = re.search(r"(?m)^description: (.+)$", action)
    if not name or not description or len(description[1]) > 125:
        raise Refused("action.yml needs a name and a description of at most 125 characters")
    icon = re.search(r"(?m)^  icon: ([a-z-]+)$", action)
    color = re.search(r"(?m)^  color: ([a-z-]+)$", action)
    if not icon or not color or color[1] not in BRAND_COLORS:
        raise Refused("action.yml needs a branding icon and one of the Marketplace colors")
    main = re.search(r"(?m)^  using: node\d+\n  main: (\S+)$", action)
    if not main or main[1] not in files:
        raise Refused("action.yml must run a staged file with a Node runtime")


SATELLITE = Satellite(
    name="stage-action-satellite",
    schema="qrscan-action-stage/1",
    package=PACKAGE,
    extras={"test/fixtures/mixed-code128-qr.png": FIXTURE, "LICENSE": "LICENSE"},
    required=("action.yml", "src/index.mjs", "LICENSE", "README.md", ".github/workflows/test.yml"),
    check=check,
)


def readme_links(directory):
    text = (directory / "README.md").read_text()
    if "](mirror/" in text:
        return "the README still points into mirror/"
    return None


def license_is_engine(directory):
    if (directory / "LICENSE").read_bytes() != (ROOT / "LICENSE").read_bytes():
        return "the staged LICENSE is not the engine's"
    return None


def refuses_a_wrong_pin(directory):
    text = (directory / "src/releases.mjs").read_text()
    changed = re.sub(r"sums: '[0-9a-f]{64}'", "sums: '" + "0" * 64 + "'", text, count=1)
    files = {"src/releases.mjs": changed.encode(), "action.yml": (directory / "action.yml").read_bytes()}
    commit = json.loads((directory / "SOURCE.json").read_text())["engine"]["revision"]
    try:
        check(files, commit, ROOT)
    except Refused as error:
        return None if "pins other values" in str(error) else f"refused for another reason: {error}"
    return "a changed pinned hash was accepted"


if __name__ == "__main__":
    sys.exit(SATELLITE.main(__doc__, "src/scan.mjs", (
        ("README links", readme_links),
        ("LICENSE", license_is_engine),
        ("a pinned hash that differs from the manifest", refuses_a_wrong_pin),
    )))
