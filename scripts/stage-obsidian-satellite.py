#!/usr/bin/env python3
"""Stage the Obsidian plugin as the tree of its own repository.

  stage-obsidian-satellite.py stage [--revision REV] --out DIR
  stage-obsidian-satellite.py verify DIR
  stage-obsidian-satellite.py --self-test

Obsidian installs a community plugin from the GitHub release of a repository: it reads
`manifest.json` at the root of the default branch and downloads `main.js`, `manifest.json` and
`styles.css` from the release whose tag is the version. The plugin therefore lives in a
repository of its own, qrcode-ai-com/qrcode-barcode-scanner-obsidian, whose content is never
edited by hand: `stage` writes it from one commit of this repository (scripts/satellite_stage.py
says how), with:

  - every file of `integrations/obsidian` at REV, its `mirror/` folder as `.github/workflows/`
    (the tests, and the release that builds main.js and opens a draft);
  - the mixed fixture its tests scan, as `test/fixtures/mixed-code128-qr.png`;
  - the engine's license texts for the WebAssembly module main.js embeds: `ENGINE-LICENSE` (the
    AGPL text the published engine package ships) and `ENGINE-LICENSE-APACHE-2.0`;
  - `SOURCE.json`: the commit and the sha256 of every staged file.

Before writing, the stage checks the plugin against the community directory rules it can read
from the files: the manifest id, name and description, one version in manifest.json,
package.json and versions.json, an exact pin of the engine package, and a source with no Node or
Electron module while the manifest says the plugin runs on mobile. Exit 0 when the step passes,
1 when it fails, 2 for usage. Stdlib only.
"""
import json
import re
import sys

from satellite_stage import ROOT, Refused, Satellite

PACKAGE = "integrations/obsidian"
ENGINE_PACKAGE = "@qrcode-ai-com/qrcode-barcode-scanner-wasm"
ALLOWED_IMPORTS = re.compile(r"^(obsidian|\./[a-z]+|@qrcode-ai-com/qrcode-barcode-scanner-wasm(/[a-z_.-]+)?)$")


def check(files, commit, root):
    try:
        manifest = json.loads(files["manifest.json"])
        package = json.loads(files["package.json"])
        versions = json.loads(files["versions.json"])
    except (KeyError, ValueError) as error:
        raise Refused(f"manifest.json, package.json and versions.json must be JSON: {error}") from error
    plugin_id, name, description = manifest.get("id", ""), manifest.get("name", ""), manifest.get("description", "")
    if not re.fullmatch(r"[a-z0-9-]+", plugin_id) or "obsidian" in plugin_id or plugin_id.endswith("plugin"):
        raise Refused(f"manifest.json id {plugin_id!r} must be lowercase words, without 'obsidian' or a closing 'plugin'")
    if not name or re.search(r"(?i)obsidian|plugin", name) or "&" in name:
        raise Refused(f"manifest.json name {name!r} must not hold 'Obsidian', 'Plugin' or '&'")
    if not description.endswith(".") or len(description) > 250 or re.match(r"(?i)(this|a) plugin", description):
        raise Refused("manifest.json description must be one sentence of at most 250 characters, ending with a period")
    version = manifest.get("version", "")
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise Refused(f"manifest.json version {version!r} is not x.y.z: Obsidian reads the release of that exact tag")
    if package.get("version") != version:
        raise Refused(f"package.json version {package.get('version')!r} is not the manifest version {version}")
    if versions.get(version) != manifest.get("minAppVersion"):
        raise Refused(f"versions.json must map {version} to the manifest minAppVersion {manifest.get('minAppVersion')!r}")
    engine = package.get("dependencies", {}).get(ENGINE_PACKAGE, "")
    if not re.fullmatch(r"\d+\.\d+\.\d+", engine):
        raise Refused(f"package.json must pin {ENGINE_PACKAGE} to one exact version, not {engine!r}")
    if package.get("license") != "MIT":
        raise Refused("package.json license must be MIT, the license of the plugin source")
    for path in ("main.js", "node_modules"):
        if any(staged == path or staged.startswith(path + "/") for staged in files):
            raise Refused(f"{path} is built or installed, never committed")
    if manifest.get("isDesktopOnly") is False:
        for path, data in files.items():
            if not (path.startswith("src/") and path.endswith(".ts")):
                continue
            text = data.decode()
            for module in re.findall(r"from '([^']+)'", text):
                if not ALLOWED_IMPORTS.match(module):
                    raise Refused(f"{path} imports {module}: a plugin that runs on mobile uses no Node or Electron module")
            if re.search(r"\brequire\(|\bprocess\.|\bBuffer\b", text):
                raise Refused(f"{path} uses a Node global: a plugin that runs on mobile cannot")


SATELLITE = Satellite(
    name="stage-obsidian-satellite",
    schema="qrscan-obsidian-stage/1",
    package=PACKAGE,
    extras={
        "test/fixtures/mixed-code128-qr.png": "fixtures/symbology/mixed-code128-qr.png",
        "ENGINE-LICENSE": "distribution/releases/historical-agpl-3.0.txt",
        "ENGINE-LICENSE-APACHE-2.0": "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
    },
    required=("manifest.json", "versions.json", "styles.css", "package.json", "package-lock.json", "src/main.ts",
              "scripts/build.mjs", "README.md", "LICENSE", "ENGINE-LICENSE", "ENGINE-LICENSE-APACHE-2.0",
              "ENGINE-THIRD-PARTY.md", ".github/workflows/test.yml", ".github/workflows/release.yml"),
    check=check,
)


def license_is_engine(directory):
    if (directory / "LICENSE").read_bytes() != (ROOT / "LICENSE").read_bytes():
        return "the staged LICENSE is not the engine repository's MIT license"
    if b"GNU AFFERO GENERAL PUBLIC LICENSE" not in (directory / "ENGINE-LICENSE").read_bytes():
        return "ENGINE-LICENSE is not the AGPL text of the published engine"
    return None


def readme_links(directory):
    if "](mirror/" in (directory / "README.md").read_text():
        return "the README still points into mirror/"
    return None


def refused(directory, edit, needle):
    files = {path.relative_to(directory).as_posix(): path.read_bytes() for path in directory.rglob("*") if path.is_file()}
    edit(files)
    try:
        check(files, "HEAD", ROOT)
    except Refused as error:
        return None if needle in str(error) else f"refused for another reason: {error}"
    return "accepted"


def refuses_a_desktop_import(directory):
    def edit(files):
        files["src/images.ts"] = b"import { readFileSync } from 'fs';\n" + files["src/images.ts"]
    return refused(directory, edit, "uses no Node or Electron module")


def refuses_a_version_drift(directory):
    def edit(files):
        package = json.loads(files["package.json"])
        package["version"] = "9.9.9"
        files["package.json"] = json.dumps(package).encode()
    return refused(directory, edit, "is not the manifest version")


def refuses_a_name_with_obsidian(directory):
    def edit(files):
        manifest = json.loads(files["manifest.json"])
        manifest["name"] = "Obsidian QR Scanner"
        files["manifest.json"] = json.dumps(manifest).encode()
    return refused(directory, edit, "must not hold 'Obsidian'")


def refuses_a_built_file(directory):
    def edit(files):
        files["main.js"] = b"// built\n"
    return refused(directory, edit, "never committed")


if __name__ == "__main__":
    sys.exit(SATELLITE.main(__doc__, "src/scanner.ts", (
        ("README links", readme_links),
        ("license files", license_is_engine),
        ("a Node module in a plugin that runs on mobile", refuses_a_desktop_import),
        ("a package version that is not the manifest's", refuses_a_version_drift),
        ("a name that holds Obsidian", refuses_a_name_with_obsidian),
        ("a committed main.js", refuses_a_built_file),
    )))
