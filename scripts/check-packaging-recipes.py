#!/usr/bin/env python3
"""Check the packaging recipes of qrscan 0.11.0 against the release manifest, without building.

  check-packaging-recipes.py [--archive FILE] [--conda-schema FILE]
  check-packaging-recipes.py --self-test

The recipes under distribution/ (snap, alpine, msys2, termux, macports, freebsd, nix, obs, ppa,
conda-forge, artifacthub, glama, jsr) repack or rebuild the published v0.11.0 release. This check
reads them as text and refuses:

  - a version other than 0.11.0, or a release URL that is not an asset of tag v0.11.0 of
    qrcode-ai-com/qrcode-barcode-scanner-rust;
  - a SHA-256 that the manifest (distribution/releases/v0.11.0.json) does not hold for that file;
  - a license field other than the channel's spelling of AGPL-3.0-or-later, and MIT as a license
    field of any recipe: the 0.11.0 archives are AGPL-3.0-or-later;
  - panic=abort, a source build of more than the qrscan crate, or a source build that does not
    read the mixed fixture's QR code and Code 128 in the fast, frame and full profiles;
  - a glama.json or an artifacthub-repo.yml with a key its host does not define.

With --archive (the downloaded qrcode-barcode-scanner-cli-0.11.0-source.tar.gz) it also checks the
archive's SHA-256, size, SHA-512 (Alpine) and RIPEMD-160 (MacPorts), that the files the recipes
install and test exist in it, that its workspace keeps the rxing overflow checks, and that the
MacPorts and FreeBSD crate lists equal its Cargo.lock. YAML files are parsed when PyYAML is
installed, and the conda recipes are validated when --conda-schema names the recipe JSON schema
and jsonschema is installed; otherwise the check says what it skipped. Exit 0 when every check
passes, 1 when one fails, 2 for usage.
"""
import argparse
import hashlib
import io
import json
import pathlib
import re
import shutil
import sys
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = "distribution/releases/v0.11.0.json"
VERSION = "0.11.0"
DOWNLOAD = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v0.11.0/"
SOURCE = "qrcode-barcode-scanner-cli-0.11.0-source.tar.gz"
SHA512 = "b84de0d7c2a8081a76dce13386d1890d3c97602675ad6b9b6efed197ed176ce18dfa58b8917706a50d932d7f2b44b95dba59382d8f10842ed1ea88cb18035716"
RMD160 = "67ec12678057ea58ef2e870d1f6477386c8c4c5e"
SRI = "sha256-jl4J8OyNk65JyjVhXAW7HTJkSLbel1fO+G70jXvzqW0="
FIXTURE = "fixtures/symbology/mixed-code128-qr.png"
FIXTURE_SHA256 = "c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8"
PAYLOADS = ("https://qrc-ai.com/76xMa", "STOCK-4827")
# The smoke compares the "text" field of the JSON report, quoted for its shell or for Tcl.
TEXT_FIELD = re.compile(r'\\?"text\\?": \\?"')
# Digests that are not release assets, each named where it is pinned.
OTHER_DIGESTS = {
    FIXTURE_SHA256: "the mixed fixture of tag v0.11.0",
    "1ca488eaa04eec33022cf7211221c888b2ea8b00d3889e68b2ae8e5e066d1f03": "the PyPI sdist of 0.11.0",
    "9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e": "the node:22.22.2-bookworm-slim index",
    "a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68": "the WASM of the npm package 0.11.0",
    # The published container image 0.11.0 (distribution/artifacthub/compose-index.py checks them).
    "fd0433f29b0dabd469ce6a8fdcfc7bf6554960301b5bc57b5fca97928fd7cb96": "the image index of tag 0.11.0",
    "4dfcdfb66730e191176be72df398e0dadec15ed6dab25227149375fb3931f42c": "the amd64 image manifest",
    "8720bf185c698747893fbd67d33bda9f42ffa99ef86af094fbaa7e4a9298a359": "the arm64 image manifest",
    "6022934ca26dda33a52ea5f3d2585c0b7430a74e0c51cc9722aa1a4d8b711e64": "the amd64 image configuration",
    "2c1e8d30e960ecf1d32c88200b32dd3df38e80a379637ce2ac91c32d1cceea58": "the arm64 image configuration",
}
ARCHIVE = "qrcode-barcode-scanner-cli-0.11.0-source"
LICENSE_INSTALLED = ("LICENSE", "LICENSING.md", "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
                     "crates/qrcode-ai-scanner/THIRD-PARTY.md")

# Each recipe: its file, how it writes the version, its license line, whether it is a source
# build (then -p and the three-profile smoke are required) and where its smoke lives.
RECIPES = {
    "snap": {"file": "distribution/snap/snapcraft.yaml", "version": r"^version: '0\.11\.0'$",
             "license": r"^license: AGPL-3\.0-or-later$", "source_build": False},
    "alpine": {"file": "distribution/alpine/APKBUILD", "version": r"^pkgver=0\.11\.0$",
               "license": r'^license="AGPL-3\.0-or-later"$', "source_build": True},
    "msys2": {"file": "distribution/msys2/mingw-w64-qrcode-barcode-scanner/PKGBUILD",
              "version": r"^pkgver=0\.11\.0$", "license": r"^license=\('spdx:AGPL-3\.0-or-later'\)$",
              "source_build": True},
    "termux": {"file": "distribution/termux/qrcode-barcode-scanner/build.sh",
               "version": r'^TERMUX_PKG_VERSION="0\.11\.0"$',
               "license": r'^TERMUX_PKG_LICENSE="AGPL-3\.0-or-later"$', "source_build": True,
               "smoke": None},
    "macports": {"file": "distribution/macports/graphics/qrcode-barcode-scanner/Portfile",
                 "version": r"^version\s+0\.11\.0$", "license": r"^license\s+AGPL-3\+$",
                 "source_build": True},
    "freebsd": {"file": "distribution/freebsd/graphics/qrcode-barcode-scanner/Makefile",
                "version": r"^DISTVERSION=\t0\.11\.0$", "license": r"^LICENSE=\tAGPLv3\+$",
                "source_build": True},
    "nix": {"file": "distribution/nix/package.nix", "version": r'^  version = "0\.11\.0";$',
            "license": r"^    license = lib\.licenses\.agpl3Plus;$", "source_build": True},
    "obs": {"file": "distribution/obs/qrcode-barcode-scanner.spec", "version": r"^Version:\s+0\.11\.0$",
            "license": r"^License:\s+AGPL-3\.0-or-later( AND [A-Za-z0-9.-]+)*$", "source_build": True},
    "ppa": {"file": "distribution/ppa/debian/rules", "version": None, "license": None,
            "source_build": True},
    "conda-cli": {"file": "distribution/conda-forge/recipes/qrcode-barcode-scanner-cli/recipe.yaml",
                  "version": r'^  version: "0\.11\.0"$', "license": r"^  license: AGPL-3\.0-or-later$",
                  "source_build": True,
                  "smoke": "distribution/conda-forge/recipes/qrcode-barcode-scanner-cli/test-scan.sh"},
    "conda-python": {"file": "distribution/conda-forge/recipes/qrcode-barcode-scanner/recipe.yaml",
                     "version": r'^  version: "0\.11\.0"$', "license": r"^  license: AGPL-3\.0-or-later$",
                     "source_build": False},
}
EXTRA_LICENSE_LINES = {
    "distribution/ppa/debian/copyright": r"^Files: \*\nCopyright: .+\nLicense: AGPL-3\.0-or-later$",
    "distribution/ppa/debian/changelog": r"^qrcode-barcode-scanner \(0\.11\.0-1~ppa1~ubuntu24\.04\.1\) noble;",
    "distribution/artifacthub/compose-index.py": r'"io\.artifacthub\.package\.license": "AGPL-3\.0-or-later"',
    "distribution/jsr/stage-jsr-package.py": r'^LICENSE = "AGPL-3\.0-or-later"$',
}
MIT_FIELD = re.compile(r"""(?im)^\s*(?:license|licenses?|TERMUX_PKG_LICENSE|LICENSE)\s*[=:(]\s*['"(]*\s*(?:spdx:)?MIT\b"""
                       r"""|lib\.licenses\.mit\b|"license":\s*"MIT\"""")
PANIC = re.compile(r"(?i)panic\s*=\s*['\"]?abort|PANIC=abort|-C\s*panic=abort")
HEX64 = re.compile(r"(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])")
URL = re.compile(r"https://github\.com/qrcode-ai-com/qrcode-barcode-scanner(?:-rust)?/releases/download/[^\s\"')]+")
VERSION_SPELLINGS = ("${{ version }}", "${finalAttrs.version}", "${TERMUX_PKG_VERSION}", "${DISTVERSION}",
                     "${pkgver}", "$pkgver", "%{version}", "${version}", "$version")
ARCHIVE_SPELLINGS = ("${_archive}", "%{archive}", "${archive}", "$archive", "${distname}")
# Files whose license words are not a package license: DEP-5 copyright paragraphs name the licenses
# of the vendored crates, and the staging scripts carry refusal cases in their self-tests.
MIT_EXEMPT = ("distribution/ppa/debian/copyright",)
COMMENT = re.compile(r"^\s*(?:#|//|rem\s|;)")


class Report:
    def __init__(self):
        self.failures, self.passes, self.skipped = [], [], []

    def check(self, condition, success, failure):
        (self.passes if condition else self.failures).append(success if condition else failure)


def read(root, path):
    return (root / path).read_text(encoding="utf-8")


def release_names(manifest):
    names = dict(manifest["release"]["assets"])
    names[manifest["release"]["checksums"]["name"]] = manifest["release"]["checksums"]
    return names


def manifest_digests(manifest):
    digests = {manifest["release"]["checksums"]["sha256"]: manifest["release"]["checksums"]["name"]}
    for name, asset in manifest["release"]["assets"].items():
        digests[asset["sha256"]] = name
        if "executable" in asset:
            digests[asset["executable"]["sha256"]] = f"{name}:{asset['executable']['path']}"
    return digests


def crate_checksums(text):
    """The crates.io packages of a Cargo.lock: {name-version: checksum}."""
    crates = {}
    for block in text.split("[[package]]")[1:]:
        fields = dict(re.findall(r'^(name|version|source|checksum) = "([^"]+)"$', block, re.M))
        if fields.get("source", "").startswith("registry+") and "checksum" in fields:
            crates[f"{fields['name']}-{fields['version']}"] = fields["checksum"]
    return crates


def check_recipes(root, archive=None, conda_schema=None):
    report = Report()
    manifest = json.loads(read(root, MANIFEST))
    assets = release_names(manifest)
    digests = manifest_digests(manifest)
    report.check(manifest["version"] == VERSION and manifest["tag"] == "v0.11.0",
                 "the manifest is v0.11.0", f"{MANIFEST} is {manifest.get('tag')}, not v0.11.0")

    files = sorted(path for path in (root / "distribution").rglob("*") if path.is_file()
                   and path.relative_to(root).parts[1] in {"snap", "alpine", "msys2", "termux", "macports",
                                                           "freebsd", "nix", "obs", "ppa", "conda-forge",
                                                           "artifacthub", "glama", "jsr"})
    crate_lists = {}
    for path in files:
        relative = path.relative_to(root).as_posix()
        if path.suffix in (".png", ".wasm") or relative.endswith("package-lock.json"):
            continue
        text = path.read_text(encoding="utf-8")
        for number, line in enumerate(text.splitlines(), 1):
            # A README says in prose that panic=abort is never set; only recipe lines can set it.
            if path.suffix != ".md" and PANIC.search(line) and not COMMENT.match(line):
                report.failures.append(f"{relative}:{number} sets panic=abort")
        if relative not in MIT_EXEMPT and path.suffix != ".py" and MIT_FIELD.search(text):
            report.failures.append(f"{relative} has MIT as a license field; the 0.11.0 archives are AGPL-3.0-or-later")
        resolved = text
        for spelling in VERSION_SPELLINGS:
            resolved = resolved.replace(spelling, VERSION)
        for spelling in ARCHIVE_SPELLINGS:
            resolved = resolved.replace(spelling, ARCHIVE)
        for match in URL.finditer(resolved):
            url = match[0]
            if url in (DOWNLOAD, DOWNLOAD.rstrip("/")):
                continue  # a base (master_sites, MASTER_SITES) the recipe appends an asset name to
            if not url.startswith(DOWNLOAD):
                report.failures.append(f"{relative}: {url} is not a download of tag v0.11.0 of the -rust repository")
                continue
            name = url[len(DOWNLOAD):]
            if name not in assets and "$" not in name:
                report.failures.append(f"{relative}: {name} is not an asset of v0.11.0")
        if relative.endswith(("Portfile", "distinfo")):
            crate_lists[relative] = text
        for match in HEX64.finditer(text):
            value = match[0]
            if value in digests or value in OTHER_DIGESTS:
                continue
            if relative.endswith(("Portfile", "distinfo")):
                continue  # crate checksums, checked against Cargo.lock below
            report.failures.append(f"{relative}: {value[:16]}… is not a digest of the v0.11.0 manifest")

    for channel, recipe in RECIPES.items():
        path = root / recipe["file"]
        if not path.is_file():
            report.failures.append(f"{channel}: {recipe['file']} is missing")
            continue
        text = path.read_text(encoding="utf-8")
        if recipe["version"]:
            report.check(re.search(recipe["version"], text, re.M), f"{channel}: version 0.11.0",
                         f"{channel}: {recipe['file']} does not state version 0.11.0 as expected")
        if recipe["license"]:
            report.check(re.search(recipe["license"], text, re.M), f"{channel}: license AGPL-3.0-or-later",
                         f"{channel}: {recipe['file']} does not state AGPL-3.0-or-later in its license field")
        if recipe["source_build"]:
            narrow = re.search(r"-p qrcode-barcode-scanner-cli|--package[ =\"\n\t]+\"?qrcode-barcode-scanner-cli"
                               r"|--path crates/qrcode-ai-scanner-cli", text)
            report.check(narrow, f"{channel}: builds only the qrscan crate",
                         f"{channel}: {recipe['file']} does not limit the build to qrcode-barcode-scanner-cli")
            smoke_file = recipe.get("smoke", recipe["file"])
            if smoke_file:
                smoke = read(root, smoke_file)
                ok = (all(payload in smoke for payload in PAYLOADS) and TEXT_FIELD.search(smoke)
                      and re.search(r"fast[ ,]+frame[ ,]+full", smoke))
                report.check(ok, f"{channel}: reads both payloads in fast, frame and full",
                             f"{channel}: {smoke_file} does not check both payloads in the three profiles")
            else:
                report.skipped.append(f"{channel}: no smoke in the recipe (cross-compiled; run on the device)")
    for relative, pattern in EXTRA_LICENSE_LINES.items():
        report.check(re.search(pattern, read(root, relative), re.M), f"{relative}: AGPL-3.0-or-later",
                     f"{relative} does not state what it must ({pattern})")

    snap = read(root, "distribution/snap/snapcraft.yaml")
    for asset in ("qrcode-barcode-scanner-cli-0.11.0-x86_64-unknown-linux-gnu.tar.gz",
                  "qrcode-barcode-scanner-cli-0.11.0-aarch64-unknown-linux-gnu.tar.gz"):
        data = assets[asset]
        report.check(data["sha256"] in snap and data["executable"]["sha256"] in snap,
                     f"snap: pins {asset} and its qrscan", f"snap: does not pin {asset} and its executable")
    nix = read(root, "distribution/nix/package.nix")
    report.check(SRI in nix, "nix: SRI hash of the source archive", "nix: the source hash is not the archive's")
    report.check(SHA512 in read(root, "distribution/alpine/APKBUILD"), "alpine: sha512 of the archive",
                 "alpine: sha512sums does not hold the archive's SHA-512")
    portfile = read(root, "distribution/macports/graphics/qrcode-barcode-scanner/Portfile")
    report.check(RMD160 in portfile and str(assets[SOURCE]["size"]) in portfile, "macports: rmd160 and size",
                 "macports: checksums-append does not hold the archive's rmd160 and size")
    report.check(re.search(r"^conflicts\s+qrscan$", portfile, re.M), "macports: conflicts with the port qrscan",
                 "macports: the port qrscan also installs bin/qrscan; declare the conflict")
    distinfo = read(root, "distribution/freebsd/graphics/qrcode-barcode-scanner/distinfo")
    report.check(f"SIZE ({SOURCE}) = {assets[SOURCE]['size']}" in distinfo, "freebsd: size of the archive",
                 "freebsd: distinfo does not hold the archive's size")

    check_hosts(root, report)
    check_yaml(root, report, conda_schema)
    if archive:
        check_archive(pathlib.Path(archive), assets, portfile, distinfo,
                      read(root, "distribution/freebsd/graphics/qrcode-barcode-scanner/Makefile.crates"), report)
    else:
        report.skipped.append("archive: no --archive, so hashes, files and crate lists were not compared with it")
    return report


def check_hosts(root, report):
    glama = json.loads(read(root, "distribution/glama/glama.json"))
    report.check(set(glama) <= {"$schema", "maintainers"} and glama.get("maintainers")
                 and len(set(glama["maintainers"])) == len(glama["maintainers"]),
                 "glama: glama.json has only $schema and distinct maintainers",
                 "glama: glama.json holds a key Glama's schema does not define, or no maintainer")
    package = json.loads(read(root, "distribution/glama/package.json"))
    report.check(package.get("dependencies") == {"@qrcode-ai-com/qrcode-barcode-scanner-mcp": "0.3.1"},
                 "glama: the container installs MCP 0.3.1 exactly", "glama: package.json does not pin MCP 0.3.1")
    repo = read(root, "distribution/artifacthub/artifacthub-repo.yml")
    keys = set(re.findall(r"^([A-Za-z]+):", repo, re.M))
    report.check(keys <= {"repositoryID", "owners", "ignore"} and "repositoryID" in keys,
                 "artifacthub: artifacthub-repo.yml has only Artifact Hub keys",
                 f"artifacthub: artifacthub-repo.yml has unknown keys {sorted(keys - {'repositoryID', 'owners', 'ignore'})}")
    index = (root / "distribution/artifacthub/published-index-0.11.0.json").read_bytes()
    report.check(hashlib.sha256(index).hexdigest() == "fd0433f29b0dabd469ce6a8fdcfc7bf6554960301b5bc57b5fca97928fd7cb96",
                 "artifacthub: the recorded index is the published one",
                 "artifacthub: published-index-0.11.0.json is not the published index")


def check_yaml(root, report, conda_schema):
    try:
        import yaml
    except ImportError:
        report.skipped.append("yaml: PyYAML is not installed, YAML files were read as text only")
        return
    snap = yaml.safe_load(read(root, "distribution/snap/snapcraft.yaml"))
    wanted = {"name": "qrcode-barcode-scanner", "base": "core24", "confinement": "strict", "grade": "stable",
              "license": "AGPL-3.0-or-later", "version": VERSION}
    report.check(all(snap.get(key) == value for key, value in wanted.items()), "snap: core24, strict, stable",
                 f"snap: {', '.join(f'{k}={snap.get(k)!r}' for k in wanted if snap.get(k) != wanted[k])}")
    report.check(set(snap.get("platforms", {})) == {"amd64", "arm64"}, "snap: platforms amd64 and arm64",
                 "snap: platforms are not amd64 and arm64")
    app = snap.get("apps", {}).get("qrscan", {})
    report.check(app.get("command") == "bin/qrscan-launcher" and set(app.get("plugs", [])) == {"home", "removable-media"},
                 "snap: the qrscan app runs the launcher with home and removable-media",
                 "snap: the qrscan app command or plugs differ")
    allowed_snap = {"name", "title", "version", "summary", "description", "license", "website", "source-code",
                    "issues", "contact", "base", "grade", "confinement", "platforms", "apps", "parts"}
    report.check(set(snap) <= allowed_snap, "snap: only known top-level keys",
                 f"snap: unknown top-level keys {sorted(set(snap) - allowed_snap)}")
    report.check(len(snap.get("summary", "")) <= 78, "snap: summary within 78 characters", "snap: summary too long")
    recipes = {}
    for name in ("qrcode-barcode-scanner-cli", "qrcode-barcode-scanner"):
        recipes[name] = yaml.safe_load(read(root, f"distribution/conda-forge/recipes/{name}/recipe.yaml"))
        report.check(recipes[name]["package"]["name"] == name and recipes[name]["about"]["license"] == "AGPL-3.0-or-later",
                     f"conda {name}: name and license", f"conda {name}: name or license differ")
    repo = yaml.safe_load(read(root, "distribution/artifacthub/artifacthub-repo.yml"))
    owners = repo.get("owners", [])
    report.check(isinstance(owners, list) and all(set(owner) == {"name", "email"} for owner in owners),
                 "artifacthub: owners have a name and an email", "artifacthub: owners need name and email")
    if not conda_schema:
        report.skipped.append("conda: no --conda-schema, so the recipes were not validated against the format")
        return
    try:
        import jsonschema
    except ImportError:
        report.skipped.append("conda: jsonschema is not installed, the recipes were not validated")
        return
    schema = json.loads(pathlib.Path(conda_schema).read_text(encoding="utf-8"))
    for name, recipe in recipes.items():
        validator = jsonschema.validators.validator_for(schema)(schema)
        errors = sorted(validator.iter_errors(recipe), key=lambda error: list(error.path))
        report.check(not errors, f"conda {name}: valid against the recipe schema",
                     f"conda {name}: {'; '.join(error.message[:120] for error in errors[:3])}")


def check_archive(archive, assets, portfile, distinfo, freebsd_crates, report):
    data = archive.read_bytes()
    asset = assets[SOURCE]
    report.check(hashlib.sha256(data).hexdigest() == asset["sha256"] and len(data) == asset["size"],
                 "archive: SHA-256 and size of the manifest", "archive: not the published source archive")
    report.check(hashlib.sha512(data).hexdigest() == SHA512, "archive: SHA-512 (Alpine)", "archive: SHA-512 differs")
    try:
        report.check(hashlib.new("ripemd160", data).hexdigest() == RMD160, "archive: RIPEMD-160 (MacPorts)",
                     "archive: RIPEMD-160 differs")
    except ValueError:
        report.skipped.append("archive: this Python has no RIPEMD-160, the MacPorts rmd160 was not recomputed")
    top = "qrcode-barcode-scanner-cli-0.11.0-source/"
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        names = set(tar.getnames())

        def member(path):
            return tar.extractfile(top + path).read()

        for path in (*LICENSE_INSTALLED, FIXTURE, "crates/qrcode-ai-scanner-cli/Cargo.toml", "Cargo.lock"):
            report.check(top + path in names, f"archive: holds {path}", f"archive: {path} is missing")
        report.check(hashlib.sha256(member(FIXTURE)).hexdigest() == FIXTURE_SHA256, "archive: the mixed fixture",
                     "archive: the mixed fixture differs")
        workspace = member("Cargo.toml").decode()
        report.check(re.search(r"\[profile\.release\.package\.rxing\]\s*\noverflow-checks = true", workspace)
                     and not PANIC.search(workspace), "archive: rxing overflow checks, no panic=abort",
                     "archive: the workspace release profile changed")
        lock = crate_checksums(member("Cargo.lock").decode())
    macports = {f"{name}-{version}": checksum for name, version, checksum in
                re.findall(r"^\s+([A-Za-z0-9_-]+)\s+(\d[^\s]*)\s+([0-9a-f]{64})", portfile, re.M)}
    report.check(macports == lock, f"macports: cargo.crates equals Cargo.lock ({len(lock)} crates)",
                 f"macports: cargo.crates differs from Cargo.lock ({len(set(macports) ^ set(lock))} entries)")
    listed = set(re.findall(r"([A-Za-z0-9_-]+-\d[^\s\\]*)", freebsd_crates.split("=", 1)[1]))
    distinfo_sums = dict(re.findall(r"^SHA256 \(rust/crates/(.+)\.crate\) = ([0-9a-f]{64})$", distinfo, re.M))
    report.check(listed == set(lock) and distinfo_sums == lock,
                 f"freebsd: Makefile.crates and distinfo equal Cargo.lock ({len(lock)} crates)",
                 "freebsd: Makefile.crates or distinfo differ from Cargo.lock")
    sizes = re.findall(r"^SIZE \(rust/crates/.+\.crate\) = \d+$", distinfo, re.M)
    report.check(len(sizes) == len(lock), "freebsd: a size for every crate", "freebsd: a crate size is missing")
    report.skipped.append("freebsd: crate sizes come from crates.io and are only re-read by `make makesum`")


def print_report(report):
    for line in report.passes:
        print(f"ok    {line}")
    for line in report.skipped:
        print(f"skip  {line}")
    for line in report.failures:
        print(f"FAIL  {line}", file=sys.stderr)
    print(f"packaging recipes: {len(report.passes)} passed, {len(report.skipped)} skipped, "
          f"{len(report.failures)} failed")


def self_test():
    """Copy the recipes, break each rule once and expect the check to say so."""
    problems = []
    cases = [
        ("an MIT license field", "distribution/alpine/APKBUILD", 'license="AGPL-3.0-or-later"', 'license="MIT"',
         "MIT as a license field"),
        ("another archive digest", "distribution/msys2/mingw-w64-qrcode-barcode-scanner/PKGBUILD",
         "8e5e09f0ec8d93ae", "8e5e09f0ec8d93af", "not a digest of the v0.11.0 manifest"),
        ("panic=abort", "distribution/obs/qrcode-barcode-scanner.spec", "%build\n",
         "%build\nexport CARGO_PROFILE_RELEASE_PANIC=abort\n", "sets panic=abort"),
        ("a whole-workspace build", "distribution/freebsd/graphics/qrcode-barcode-scanner/Makefile",
         "CARGO_BUILD_ARGS=\t--package qrcode-barcode-scanner-cli\nCARGO_TEST_ARGS=\t--package qrcode-barcode-scanner-cli\nCARGO_INSTALL_PATH=\tcrates/qrcode-ai-scanner-cli\n",
         "", "does not limit the build"),
        ("a smoke without the Code 128", "distribution/nix/package.nix", "STOCK-4827", "STOCK-0000",
         "does not check both payloads"),
        ("another release tag", "distribution/snap/snapcraft.yaml", "releases/download/v0.11.0",
         "releases/download/v0.10.0", "is not a download of tag v0.11.0"),
        ("another version", "distribution/termux/qrcode-barcode-scanner/build.sh", 'TERMUX_PKG_VERSION="0.11.0"',
         'TERMUX_PKG_VERSION="0.11.1"', "does not state version 0.11.0"),
        ("a glama.json key Glama lacks", "distribution/glama/glama.json", '"maintainers"',
         '"name": "x", "maintainers"', "holds a key Glama's schema does not define"),
    ]
    with tempfile.TemporaryDirectory() as temporary:
        base = pathlib.Path(temporary) / "base"
        for part in ("distribution", "scripts"):
            shutil.copytree(ROOT / part, base / part, ignore=shutil.ignore_patterns("node_modules", "__pycache__"))
        clean = check_recipes(base)
        if clean.failures:
            problems.append(f"the recipes as they are fail: {clean.failures[:3]}")
        for name, path, old, new, needle in cases:
            box = pathlib.Path(temporary) / name.replace(" ", "-")
            shutil.copytree(base, box)
            text = (box / path).read_text()
            if old not in text:
                problems.append(f"{name}: the self-test cannot find {old!r} in {path}")
                continue
            (box / path).write_text(text.replace(old, new, 1))
            found = check_recipes(box).failures
            if not any(needle in failure for failure in found):
                problems.append(f"{name}: not refused ({found[:2]})")
    for problem in problems:
        print(f"SELF-TEST FAILED · {problem}", file=sys.stderr)
    print(f"self-test: {'FAILED' if problems else 'ok'} (the recipes as they are, {len(cases)} broken copies)")
    return 1 if problems else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--archive", help="the downloaded qrcode-barcode-scanner-cli-0.11.0-source.tar.gz")
    parser.add_argument("--conda-schema", help="the JSON schema of the conda recipe format")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        report = check_recipes(ROOT, args.archive, args.conda_schema)
    except (OSError, ValueError, KeyError) as error:
        print(f"check-packaging-recipes: {error}", file=sys.stderr)
        return 2
    print_report(report)
    return 1 if report.failures else 0


if __name__ == "__main__":
    sys.exit(main())
