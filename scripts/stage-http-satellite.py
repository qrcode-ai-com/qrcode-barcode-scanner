#!/usr/bin/env python3
"""Stage the scanner HTTP service as the tree of its own repository.

  stage-http-satellite.py stage [--revision REV] --out DIR
  stage-http-satellite.py verify DIR
  stage-http-satellite.py --self-test

Deploy hosts read their files at the root of a repository and build the image from the Dockerfile
they find there. The service therefore has a repository of its own,
qrcode-ai-com/qrcode-barcode-scanner-http, whose content is never edited by hand: `stage` writes it
from one commit of this repository (scripts/satellite_stage.py says how), with:

  - every file of `distribution/http` at REV, its `mirror/` folder as `.github/workflows/` (the
    repository's own check: every file comes from the engine, and the image a host builds from
    the root passes the consumer);
  - `render.yaml`, the Render Blueprint that a Deploy to Render button reads at the root;
  - the mixed fixture its tests scan, as `test/fixtures/mixed-code128-qr.png`;
  - `SOURCE.json`: the commit and the sha256 of every staged file. The image copies it, and the
    service names that commit as its source (AGPL section 13).

The image of .github/workflows/http-service.yml is built from this staged tree, so the image that
CI judges and the one a host builds come from the same files. Before writing, the stage checks the
service: one version in package.json, server.mjs and the Dockerfile label; the engine 0.11.0 pinned
with its six native packages and their sha512 in package-lock.json; a base image pinned by digest;
the engine's notices byte-equal to tag v0.11.0; the MIT LICENSE equal to this repository's. Exit 0
when the step passes, 1 when it fails, 2 for usage. Stdlib only.
"""
import hashlib
import json
import re
import sys

from satellite_stage import ROOT, Refused, Satellite

PACKAGE = "distribution/http"
FIXTURE = "fixtures/symbology/mixed-code128-qr.png"
ENGINE = "0.11.0"
ENGINE_PACKAGE = "@qrcode-ai-com/qrcode-barcode-scanner"
NATIVES = ("darwin-arm64", "darwin-x64", "linux-arm64-gnu", "linux-x64-gnu", "linux-x64-musl", "win32-x64-msvc")
BASE = "node:22.22.2-bookworm-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e"
# crates/qrcode-ai-scanner/<name> at tag v0.11.0 (commit 176ac96), the engine the image runs.
NOTICES = {
    "licenses/engine-0.11.0/THIRD-PARTY.md": "e3c3e5d7b5f2e2d880fa39216658df0f84f0de297dd211b65d38373e8e7c6a4a",
    "licenses/engine-0.11.0/LICENSE-APACHE-2.0": "865b180617725f20be71aa305e82efaa8e56b3c6936d68089bc63cf91cb23087",
}


def check(files, commit, root):
    package = json.loads(files["package.json"])
    version = package.get("version", "")
    server = files["server.mjs"].decode()
    dockerfile = files["Dockerfile"].decode()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise Refused(f"package.json has no x.y.z version: {version!r}")
    if f'export const SERVICE_VERSION = "{version}";' not in server:
        raise Refused(f"server.mjs does not declare SERVICE_VERSION {version}")
    if f'export const ENGINE_VERSION = "{ENGINE}";' not in server:
        raise Refused(f"server.mjs does not declare ENGINE_VERSION {ENGINE}")
    if f'org.opencontainers.image.version="{version}"' not in dockerfile:
        raise Refused(f"the Dockerfile label version is not {version}")
    if package.get("dependencies") != {ENGINE_PACKAGE: ENGINE}:
        raise Refused(f"package.json must depend on {ENGINE_PACKAGE} {ENGINE} exactly, and on nothing else")
    froms = re.findall(r"(?m)^FROM\s+(\S+)", dockerfile)
    if froms != [BASE]:
        raise Refused(f"the Dockerfile must build FROM {BASE} only, found {froms}")
    if "npm ci --omit=dev --ignore-scripts" not in dockerfile:
        raise Refused("the Dockerfile must install with npm ci --omit=dev --ignore-scripts")
    lock = json.loads(files["package-lock.json"])
    entries = lock.get("packages", {})
    wanted = [f"node_modules/{ENGINE_PACKAGE}"] + [f"node_modules/{ENGINE_PACKAGE}-{native}" for native in NATIVES]
    if sorted(entries) != sorted(["", *wanted]):
        raise Refused(f"package-lock.json must hold the engine and its six native packages only, found {sorted(entries)}")
    for name in wanted:
        entry = entries[name]
        tarball = name.split("/", 1)[1].split("/")[1]
        expected = f"https://registry.npmjs.org/{name[len('node_modules/'):]}/-/{tarball}-{ENGINE}.tgz"
        if entry.get("version") != ENGINE or entry.get("resolved") != expected or \
                not str(entry.get("integrity", "")).startswith("sha512-"):
            raise Refused(f"{name} is not pinned to {ENGINE} from the npm registry with a sha512")
    for path, digest in NOTICES.items():
        if hashlib.sha256(files.get(path, b"")).hexdigest() != digest:
            raise Refused(f"{path} is not the engine's notice of tag v{ENGINE}")
    if files["LICENSE"] != (root / "LICENSE").read_bytes():
        raise Refused("LICENSE is not this repository's MIT LICENSE")


SATELLITE = Satellite(
    name="stage-http-satellite",
    schema="qrscan-http-stage/1",
    package=PACKAGE,
    extras={"test/fixtures/mixed-code128-qr.png": FIXTURE},
    required=("Dockerfile", ".dockerignore", "server.mjs", "package.json", "package-lock.json", "LICENSE",
              "LICENSE-NOTES.md", "README.md", "render.yaml", ".github/workflows/test.yml",
              "test/consumer.mjs", "test/server.test.mjs", *NOTICES),
    check=check,
)


def readme_links(directory):
    text = (directory / "README.md").read_text()
    if "](../" in text or "](mirror/" in text:
        return "the README still points outside the staged tree"
    return None


def refuses_a_floating_engine(directory):
    files = {path.relative_to(directory).as_posix(): path.read_bytes() for path in directory.rglob("*") if path.is_file()}
    package = json.loads(files["package.json"])
    package["dependencies"][ENGINE_PACKAGE] = "^0.11.0"
    files["package.json"] = json.dumps(package).encode()
    try:
        check(files, None, ROOT)
    except Refused as error:
        return None if "exactly" in str(error) else f"refused for another reason: {error}"
    return "a range for the engine was accepted"


def refuses_another_notice(directory):
    files = {path.relative_to(directory).as_posix(): path.read_bytes() for path in directory.rglob("*") if path.is_file()}
    files["licenses/engine-0.11.0/THIRD-PARTY.md"] += b"\nchanged\n"
    try:
        check(files, None, ROOT)
    except Refused as error:
        return None if "notice of tag" in str(error) else f"refused for another reason: {error}"
    return "a changed notice was accepted"


if __name__ == "__main__":
    sys.exit(SATELLITE.main(__doc__, "server.mjs", (
        ("README links", readme_links),
        ("a floating engine version", refuses_a_floating_engine),
        ("a notice that is not the tag's", refuses_another_notice),
    )))
