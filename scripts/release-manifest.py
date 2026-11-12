#!/usr/bin/env python3
"""The manifest of a public engine release: its tag, its commit and every public hash.

  release-manifest.py build --tag vX.Y.Z --out FILE
  release-manifest.py verify FILE [FILE ...]
  release-manifest.py --self-test

`build` reads a release the way a stranger can: anonymously, over https, from the places that
serve it. It downloads every public file, hashes the bytes itself and compares them with what
each place declares:

  - the tag and its commit, from the repository;
  - the checksum list of the GitHub release, each file it lists, and in each prebuilt archive
    the `build-info.json` and the executable it names;
  - the two crates, against the cksum of the crates.io index;
  - the Node package, the platform packages its `optionalDependencies` name and the browser
    package, against the integrity and the shasum of the npm registry;
  - every file of the Python package, against the digests of PyPI.

It writes one JSON file with no date and no machine detail, so the same release always gives
the same bytes. `verify` builds the manifest of FILE's tag again and compares: any difference
means a public file or a registry answer changed. Recipes, demos and integrations take their
pinned values from that file (distribution/releases/README.md).

Nothing is built, installed or published. Stdlib and git only. Exit 0 when the step passes,
1 when it is refused, 2 for usage.
"""
import argparse
import base64
import hashlib
import http.client
import io
import json
import os
import pathlib
import re
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA = "qrscan-release-manifest/1"
BUILD_INFO = "qrscan-build-info/1"
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner"
CLI = "qrcode-barcode-scanner-cli"
CRATES = ("qrcode-barcode-scanner", "qrcode-barcode-scanner-cli")
NPM_NODE = "@qrcode-ai-com/qrcode-barcode-scanner"
NPM_WASM = "@qrcode-ai-com/qrcode-barcode-scanner-wasm"
WASM_FILE = "qrcode-barcode-scanner_bg.wasm"
PYPI = "qrcode-barcode-scanner"
# Where each name above is spelled in this repository. The self-test reads them.
SPELLED = (("crates/qrcode-ai-scanner/Cargo.toml", 'name = "qrcode-barcode-scanner"'),
           ("crates/qrcode-ai-scanner-cli/Cargo.toml", 'name = "qrcode-barcode-scanner-cli"'),
           ("crates/qrcode-ai-scanner-node/package.json", f'"name": "{NPM_NODE}"'),
           ("scripts/patch-wasm-pkg.mjs", NPM_WASM),
           ("scripts/patch-wasm-pkg.mjs", WASM_FILE),
           ("crates/qrcode-ai-scanner-py/pyproject.toml", f'name = "{PYPI}"'))
# The hosts a request or a redirect may reach, all over https.
HOSTS = ("github.com", "static.crates.io", "index.crates.io", "registry.npmjs.org", "pypi.org",
         "files.pythonhosted.org")
HOST_SUFFIX = ".githubusercontent.com"
NPM_REGISTRY = "https://registry.npmjs.org/"
PYPI_FILES = "https://files.pythonhosted.org/"
LIMIT = 256 * 1024 * 1024  # one public file, or one member of an archive
HEX40 = re.compile(r"[0-9a-f]{40}")
HEX64 = re.compile(r"[0-9a-f]{64}")
TAG = re.compile(r"v(\d+\.\d+\.\d+)")


class Refused(Exception):
    """The public release does not hold together, or does not match the manifest."""


def require(condition, message):
    if not condition:
        raise Refused(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


# ------------------------------------------------------------------ public sources

def allowed_host(host):
    return host in HOSTS or host.endswith(HOST_SUFFIX)


def checked_url(url):
    parts = urllib.parse.urlsplit(url)
    host = (parts.hostname or "").lower()
    require(parts.scheme == "https", f"only https:// is read, not {url}")
    require(allowed_host(host), f"a foreign host: {host}")
    return url


class RedirectPolicy(urllib.request.HTTPRedirectHandler):
    """Follow a redirect only to https:// on a host this program reads."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return super().redirect_request(req, fp, code, msg, headers, checked_url(newurl))


class Anonymous(urllib.request.BaseHandler):
    """The last request processor: a request that carries an Authorization header never leaves."""
    handler_order = 10_000

    def check(self, req):
        names = (*req.headers, *req.unredirected_hdrs)
        require(not any(name.lower() == "authorization" for name in names),
                f"an Authorization header on the request to {req.host}")
        return req

    http_request = https_request = check


def read_capped(stream, url, limit=LIMIT):
    data = stream.read(limit + 1)
    require(len(data) <= limit, f"{url} is larger than {limit} bytes")
    return data


class Public:
    """The public release, read anonymously. The self-test replaces this class."""

    def __init__(self, attempts=4, pause=time.sleep):
        self.opener = urllib.request.build_opener(RedirectPolicy(), Anonymous())
        self.attempts, self.pause = attempts, pause

    def get(self, url):
        request = urllib.request.Request(checked_url(url), headers={
            "User-Agent": "qrscan-release-manifest", "Accept-Encoding": "identity"})
        for attempt in range(1, self.attempts + 1):
            try:
                with self.opener.open(request, timeout=120) as response:
                    return read_capped(response, url)
            except urllib.error.HTTPError as error:
                # A missing file is an answer. A busy or failing server is not.
                if error.code not in (408, 425, 429) and error.code < 500:
                    raise Refused(f"{url} answers {error.code}") from error
                problem = f"{url} answers {error.code}"
            except (urllib.error.URLError, http.client.HTTPException, OSError) as error:
                problem = f"{url} cannot be read: {error}"
            if attempt == self.attempts:
                raise Refused(problem)
            self.pause(5 * attempt)
        raise Refused(f"{url} was not read")

    def tag(self, repository, tag):
        """(tag object or None, commit) of TAG, from the repository itself."""
        ref = f"refs/tags/{tag}"
        try:
            listing = subprocess.run(
                ["git", "-c", "credential.helper=", "ls-remote", repository, ref, ref + "^{}"],
                capture_output=True, text=True, check=True, timeout=120,
                env={"PATH": os.environ.get("PATH", ""), "GIT_TERMINAL_PROMPT": "0",
                     "GIT_CONFIG_NOSYSTEM": "1", "HOME": tempfile.gettempdir()}).stdout
        except (OSError, subprocess.SubprocessError) as error:
            raise Refused(f"the tags of {repository} cannot be read: {error}") from error
        return resolve_tag(listing, tag)


def resolve_tag(listing, tag):
    """An annotated tag lists its own object, then the commit it points to under `^{}`."""
    found = dict(reversed(line.split("\t", 1)) for line in listing.splitlines() if "\t" in line)
    ref = f"refs/tags/{tag}"
    require(ref in found, f"no tag {tag} in the repository")
    for value in found.values():
        require(HEX40.fullmatch(value), f"the repository lists an unreadable object for {tag}")
    if ref + "^{}" in found:
        return found[ref], found[ref + "^{}"]
    return None, found[ref]


# ------------------------------------------------------------------ the GitHub release

def parse_sums(data, prefix):
    """{name: sha256} of a checksum list whose every name starts with PREFIX."""
    listed = {}
    for line in data.decode("utf-8").splitlines():
        digest, separator, name = line.partition("  ")
        require(separator and HEX64.fullmatch(digest), f"the checksum list has an unreadable line: {line!r}")
        require(name.startswith(prefix) and "/" not in name and "\\" not in name,
                f"the checksum list names a foreign file: {name}")
        require(name not in listed, f"the checksum list names {name} twice")
        listed[name] = digest
    require(listed, "the checksum list is empty")
    return listed


def member(name, data, path):
    """The bytes of PATH inside the archive NAME, read in memory. Nothing is unpacked to disk."""
    try:
        if name.endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                info = archive.getinfo(path)
                require(info.file_size <= LIMIT, f"{name}: {path} is too large")
                return archive.read(info)
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
            info = archive.getmember(path)
            require(info.isfile() and info.size <= LIMIT, f"{name}: {path} is not a plain file")
            return archive.extractfile(info).read()
    except KeyError:
        raise Refused(f"{name} has no {path}") from None
    except (tarfile.TarError, zipfile.BadZipFile, OSError, EOFError) as error:
        raise Refused(f"{name} cannot be read: {error}") from error


def prebuilt(name, data, stem, target, facts):
    """What a prebuilt archive says of itself, checked against the release and its own bytes."""
    try:
        info = json.loads(member(name, data, f"{stem}/build-info.json"))
        source, binary = info["source"], info["binary"]
        told = (info["schema"], info["version"], info["target"], source["repository"], source["tag"])
        commit, epoch, dirty = source["commit"], source["source_date_epoch"], source["dirty"]
        path, digest, size = binary["path"], binary["sha256"], binary["size"]
    except (ValueError, KeyError, TypeError) as error:
        raise Refused(f"{name}: build-info.json cannot be read: {error!r}") from error
    wanted = (BUILD_INFO, facts["version"], target, facts["repository"], facts["tag"])
    require(told == wanted, f"{name}: build-info.json describes {told}, not {wanted}")
    require(commit == facts["commit"],
            f"{name} was built from another commit: {commit}, and the tag is {facts['commit']}")
    require(dirty is False, f"{name} was built from a dirty checkout")
    require(isinstance(epoch, int) and not isinstance(epoch, bool), f"{name}: unreadable source date")
    require(isinstance(path, str) and path and "/" not in path and "\\" not in path,
            f"{name}: build-info.json names an executable outside the archive: {path!r}")
    executable = member(name, data, f"{stem}/{path}")
    require((sha256(executable), len(executable)) == (digest, size),
            f"{name}: the executable {path} is not the one build-info.json describes")
    return {"path": path, "sha256": digest, "size": size}, epoch


def release_part(source, facts):
    version, base = facts["version"], f"{facts['repository']}/releases/download/{facts['tag']}/"
    prefix = f"{CLI}-{version}-"
    sums_name = prefix + "SHA256SUMS"
    sums = source.get(base + sums_name)
    assets, epochs = {}, set()
    for name, expected in sorted(parse_sums(sums, prefix).items()):
        data = source.get(base + name)
        require(sha256(data) == expected, f"{name} does not match its line of the checksum list")
        entry = {"sha256": expected, "size": len(data)}
        stem = next((name[:-len(end)] for end in (".tar.gz", ".zip") if name.endswith(end)), None)
        require(stem, f"the checksum list names a file that is not an archive: {name}")
        target = stem[len(prefix):]
        if target != "source":
            entry["target"] = target
            entry["executable"], epoch = prebuilt(name, data, stem, target, facts)
            epochs.add(epoch)
        assets[name] = entry
    require(prefix + "source.tar.gz" in assets, "the release has no source archive")
    require(epochs, "the release has no prebuilt archive")
    require(len(epochs) == 1, f"the prebuilt archives disagree on the source date: {sorted(epochs)}")
    return {"page": f"{facts['repository']}/releases/tag/{facts['tag']}", "download": base,
            "checksums": {"name": sums_name, "sha256": sha256(sums), "size": len(sums)},
            "assets": assets}, epochs.pop()


# ------------------------------------------------------------------ the registries

def document(source, url):
    try:
        value = json.loads(source.get(url))
    except ValueError as error:
        raise Refused(f"{url} is not JSON: {error}") from error
    require(isinstance(value, dict), f"{url} is not a JSON object")
    return value


def crate_part(source, name, version):
    url = f"https://static.crates.io/crates/{name}/{name}-{version}.crate"
    data = source.get(url)
    index = source.get(f"https://index.crates.io/{name[:2]}/{name[2:4]}/{name}")
    try:
        rows = [json.loads(line) for line in index.decode("utf-8").splitlines() if line.strip()]
        rows = [(row["cksum"], row["yanked"]) for row in rows if row["vers"] == version]
    except (ValueError, KeyError, TypeError) as error:
        raise Refused(f"the crates.io index of {name} cannot be read: {error!r}") from error
    require(len(rows) == 1, f"the crates.io index lists {name} {version} {len(rows)} times")
    require(rows[0][1] is False, f"crate {name} {version} is yanked")
    require(rows[0][0] == sha256(data), f"crate {name} {version} does not match the cksum of the index")
    return {"version": version, "sha256": rows[0][0], "size": len(data), "url": url}


def npm_part(source, name, version, files=()):
    url = NPM_REGISTRY + urllib.parse.quote(name, safe="@") + "/" + version
    record = document(source, url)
    try:
        told = (record["name"], record["version"])
        tarball, integrity, shasum = (record["dist"][key] for key in ("tarball", "integrity", "shasum"))
        optional = record.get("optionalDependencies", {})
    except (KeyError, TypeError) as error:
        raise Refused(f"the npm record of {name} {version} cannot be read: {error!r}") from error
    require(told == (name, version), f"{url} describes {told}")
    require(isinstance(tarball, str) and tarball.startswith(NPM_REGISTRY),
            f"npm package {name} names a foreign tarball: {tarball}")
    data = source.get(tarball)
    actual = "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode()
    require(actual == integrity, f"npm package {name} {version} does not match its integrity")
    require(hashlib.sha1(data).hexdigest() == shasum, f"npm package {name} {version} does not match its shasum")
    entry = {"version": version, "integrity": integrity, "shasum": shasum, "size": len(data),
             "tarball": tarball}
    if files:
        read = {path: member(tarball.rsplit("/", 1)[1], data, f"package/{path}") for path in files}
        entry["files"] = {path: {"sha256": sha256(inner), "size": len(inner)} for path, inner in read.items()}
    return entry, optional


def npm_packages(source, version):
    packages = {}
    packages[NPM_NODE], optional = npm_part(source, NPM_NODE, version)
    require(isinstance(optional, dict) and optional, f"npm package {NPM_NODE} names no platform package")
    for name, wanted in sorted(optional.items()):
        require(name.startswith(NPM_NODE + "-") and name != NPM_WASM,
                f"npm package {NPM_NODE} depends on a foreign package: {name}")
        require(wanted == version, f"npm package {NPM_NODE} asks for {name} at another version: {wanted}")
        packages[name], _ = npm_part(source, name, version)
    packages[NPM_NODE]["platforms"] = sorted(optional)
    packages[NPM_WASM], _ = npm_part(source, NPM_WASM, version, files=(WASM_FILE,))
    return packages


def pypi_part(source, name, version):
    url = f"https://pypi.org/pypi/{name}/{version}/json"
    record = document(source, url)
    files = {}
    try:
        require(record["info"]["version"] == version, f"{url} describes version {record['info']['version']}")
        for item in record["urls"]:
            filename, address = item["filename"], item["url"]
            require(item["yanked"] is False, f"PyPI file {filename} is yanked")
            require(isinstance(address, str) and address.startswith(PYPI_FILES),
                    f"PyPI file {filename} is served from a foreign address: {address}")
            require(filename not in files, f"PyPI lists {filename} twice")
            data = source.get(address)
            require((sha256(data), len(data)) == (item["digests"]["sha256"], item["size"]),
                    f"PyPI file {filename} does not match its digest")
            files[filename] = {"sha256": sha256(data), "size": len(data), "url": address,
                               "kind": item["packagetype"]}
    except (KeyError, TypeError) as error:
        raise Refused(f"the PyPI record of {name} {version} cannot be read: {error!r}") from error
    require(files, f"PyPI serves no file of {name} {version}")
    return {"version": version, "files": files}


# ------------------------------------------------------------------ the manifest

def build(source, tag, repository=REPOSITORY):
    match = TAG.fullmatch(tag)
    require(match, f"an engine release tag reads vX.Y.Z, not {tag}")
    version = match[1]
    tag_object, commit = source.tag(repository, tag)
    facts = {"repository": repository, "tag": tag, "version": version, "commit": commit}
    release, epoch = release_part(source, facts)
    return {"schema": SCHEMA, **facts, "tag_object": tag_object, "source_date_epoch": epoch,
            "release": release,
            "crates": {name: crate_part(source, name, version) for name in CRATES},
            "npm": npm_packages(source, version),
            "pypi": {PYPI: pypi_part(source, PYPI, version)}}


def serialize(manifest):
    return (json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")


def leaves(value, path=""):
    if isinstance(value, dict):
        for key in sorted(value):
            yield from leaves(value[key], f"{path}/{key}")
    else:
        yield path, value


def differences(recorded, public):
    """One line for each value the manifest and the public release do not share."""
    ours, theirs = dict(leaves(recorded)), dict(leaves(public))
    for path in sorted(ours.keys() | theirs.keys()):
        if ours.get(path, "absent") != theirs.get(path, "absent"):
            yield f"{path}: the manifest says {ours.get(path, 'absent')!r}, the public release {theirs.get(path, 'absent')!r}"


def verify(source, path):
    """Build the manifest of PATH's tag again and compare it with the file, byte for byte."""
    try:
        text = path.read_bytes()
        recorded = json.loads(text)
        schema, tag, repository = recorded["schema"], recorded["tag"], recorded["repository"]
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise Refused(f"{path} is not a release manifest: {error!r}") from error
    require(schema == SCHEMA, f"{path} has schema {schema!r}, not {SCHEMA}")
    require(path.name == f"{tag}.json", f"{path.name} holds the manifest of {tag}: name it {tag}.json")
    public = build(source, tag, repository)
    if serialize(public) != text:
        found = list(differences(recorded, public)) or ["the same values, written another way"]
        raise Refused(f"{path} differs from the public release:\n  " + "\n  ".join(found))
    return public


# ------------------------------------------------------------------ self-test

def packed_tar(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path, data in files.items():
            info = tarfile.TarInfo(path)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


def packed_zip(files):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for path, data in files.items():
            archive.writestr(zipfile.ZipInfo(path), data)
    return buffer.getvalue()


class World:
    """A small public release held in memory: every address `build` reads, and what it answers."""
    VERSION, TAG_NAME = "9.8.7", "v9.8.7"
    COMMIT, TAG_OBJECT = "c" * 40, "a" * 40
    TARGETS = (("x86_64-unknown-linux-gnu", ".tar.gz", "qrscan"), ("x86_64-pc-windows-msvc", ".zip", "qrscan.exe"))
    PLATFORMS = (NPM_NODE + "-linux-x64-gnu", NPM_NODE + "-win32-x64-msvc")

    def __init__(self):
        self.files, self.listing = {}, (f"{self.TAG_OBJECT}\trefs/tags/{self.TAG_NAME}\n"
                                        f"{self.COMMIT}\trefs/tags/{self.TAG_NAME}^{{}}\n")
        self.base = f"{REPOSITORY}/releases/download/{self.TAG_NAME}/"
        self.prefix = f"{CLI}-{self.VERSION}-"
        self.assets, self.infos = {}, {}
        for target, end, binary in self.TARGETS:
            self.infos[target] = self.info(target, binary, f"machine code for {target}".encode())
        self.assets[self.prefix + "source.tar.gz"] = packed_tar({"source/Cargo.toml": b"[workspace]\n"})
        self.crates = {name: f"crate {name}".encode() for name in CRATES}
        self.crates_index = {}  # a crate whose index row describes other bytes
        self.yanked = {name: False for name in CRATES}
        self.npm = {name: packed_tar({"package/package.json": name.encode()})
                    for name in (NPM_NODE, *self.PLATFORMS)}
        self.npm[NPM_WASM] = packed_tar({"package/package.json": b"{}", f"package/{WASM_FILE}": b"\0asm wasm"})
        self.optional = {name: self.VERSION for name in self.PLATFORMS}
        self.npm_records = {}
        self.wheels = {f"qrcode_barcode_scanner-{self.VERSION}-cp39-abi3-manylinux_2_28_x86_64.whl": b"wheel",
                       f"qrcode_barcode_scanner-{self.VERSION}.tar.gz": b"sdist"}
        self.pypi_records = None

    def info(self, target, binary, code, **changes):
        source = {"repository": REPOSITORY, "ref": f"refs/tags/{self.TAG_NAME}", "tag": self.TAG_NAME,
                  "commit": self.COMMIT, "source_date_epoch": 1_700_000_000, "dirty": False}
        source.update(changes)
        return {"code": code, "json": {"schema": BUILD_INFO, "version": self.VERSION, "target": target,
                                       "source": source,
                                       "binary": {"path": binary, "sha256": sha256(code), "size": len(code)}}}

    def publish(self):
        """Lay every answer out at its address. Called once the world has its final shape."""
        files = self.files = {}
        for target, end, binary in self.TARGETS:
            stem, info = self.prefix + target, self.infos[target]
            content = {f"{stem}/build-info.json": json.dumps(info["json"]).encode(), f"{stem}/{binary}": info["code"]}
            self.assets.setdefault(stem + end, (packed_zip if end == ".zip" else packed_tar)(content))
        for name, data in self.assets.items():
            files[self.base + name] = data
        files.setdefault(self.base + self.prefix + "SHA256SUMS", "".join(
            f"{sha256(data)}  {name}\n" for name, data in sorted(self.assets.items())).encode())
        for name, data in self.crates.items():
            files[f"https://static.crates.io/crates/{name}/{name}-{self.VERSION}.crate"] = data
            rows = [{"vers": "0.0.1", "cksum": "0" * 64, "yanked": False},
                    {"vers": self.VERSION, "cksum": sha256(self.crates_index.get(name, data)),
                     "yanked": self.yanked[name]}]
            files[f"https://index.crates.io/{name[:2]}/{name[2:4]}/{name}"] = "\n".join(map(json.dumps, rows)).encode()
        for name, data in self.npm.items():
            tarball = f"{NPM_REGISTRY}{name}/-/{name.rsplit('/', 1)[1]}-{self.VERSION}.tgz"
            record = {"name": name, "version": self.VERSION, "dist": {
                "tarball": tarball, "shasum": hashlib.sha1(data).hexdigest(),
                "integrity": "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode()}}
            if name == NPM_NODE:
                record["optionalDependencies"] = self.optional
            record = self.npm_records.get(name, record)
            files[record["dist"]["tarball"]] = data
            files[NPM_REGISTRY + urllib.parse.quote(name, safe="@") + "/" + self.VERSION] = json.dumps(record).encode()
        urls = [{"filename": name, "url": f"{PYPI_FILES}packages/{index}/{name}", "size": len(data), "yanked": False,
                 "digests": {"sha256": sha256(data)}, "packagetype": "sdist" if name.endswith(".tar.gz") else "bdist_wheel"}
                for index, (name, data) in enumerate(sorted(self.wheels.items()))]
        for item in urls:
            files[item["url"]] = self.wheels[item["filename"]]
        record = {"info": {"version": self.VERSION}, "urls": self.pypi_records or urls}
        files[f"https://pypi.org/pypi/{PYPI}/{self.VERSION}/json"] = json.dumps(record).encode()
        return self

    def get(self, url):
        require(checked_url(url) in self.files, f"{url} answers 404")
        return self.files[url]

    def tag(self, repository, tag):
        return resolve_tag(self.listing, tag)


def broken_worlds():
    """(what is wrong, the words the refusal must hold, a world with that one defect)."""
    def case(label, words, change):
        world = World()
        change(world)
        return label, words, world.publish()

    linux, windows = (target for target, _, _ in World.TARGETS)

    def reinfo(target, binary, **changes):
        return lambda world: world.infos.__setitem__(target, world.info(target, binary, b"machine code", **changes))

    def other_binary(world):
        world.infos[linux]["code"] = b"another program"

    def npm_record(name, **changes):
        def apply(world):
            data = world.npm[name]
            dist = {"tarball": f"{NPM_REGISTRY}{name}/-/x-{World.VERSION}.tgz", "shasum": hashlib.sha1(data).hexdigest(),
                    "integrity": "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode()}
            dist.update(changes)
            world.npm_records[name] = {"name": name, "version": World.VERSION, "dist": dist,
                                       "optionalDependencies": world.optional}
        return apply

    def pypi_record(**changes):
        def apply(world):
            name, data = sorted(world.wheels.items())[0]
            item = {"filename": name, "url": f"{PYPI_FILES}packages/0/{name}", "size": len(data), "yanked": False,
                    "digests": {"sha256": sha256(data)}, "packagetype": "bdist_wheel"}
            item.update(changes)
            world.pypi_records = [item]
        return apply

    yield case("an archive built from another commit", "another commit",
               reinfo(linux, "qrscan", commit="d" * 40))
    yield case("an archive built from a dirty checkout", "dirty checkout", reinfo(linux, "qrscan", dirty=True))
    yield case("two archives with two source dates", "disagree on the source date",
               reinfo(linux, "qrscan", source_date_epoch=1_700_000_001))
    yield case("an archive of another tag", "build-info.json describes", reinfo(linux, "qrscan", tag="v0.0.1"))
    yield case("an executable named outside the archive", "outside the archive",
               reinfo(windows, "../qrscan.exe"))
    yield case("an executable that build-info.json does not describe", "is not the one", other_binary)
    yield case("a release with no source archive", "no source archive",
               lambda world: world.assets.pop(world.prefix + "source.tar.gz"))
    yield case("a crate whose bytes left the index", "cksum of the index",
               lambda world: setattr(world, "crates_index", {CRATES[0]: b"another crate"}))
    yield case("a yanked crate", "is yanked", lambda world: world.yanked.__setitem__(CRATES[1], True))
    yield case("an npm tarball that left its integrity", "does not match its integrity",
               npm_record(NPM_NODE, integrity="sha512-" + base64.b64encode(bytes(64)).decode()))
    yield case("an npm tarball that left its shasum", "does not match its shasum",
               npm_record(World.PLATFORMS[0], shasum="0" * 40))
    yield case("an npm tarball on a foreign address", "foreign tarball",
               npm_record(NPM_WASM, tarball="https://github.com/elsewhere/x.tgz"))
    yield case("a platform package asked at another version", "at another version",
               lambda world: world.optional.__setitem__(World.PLATFORMS[0], "9.8.6"))
    yield case("a dependency outside the package family", "foreign package",
               lambda world: world.optional.__setitem__("left-pad", World.VERSION))
    yield case("a browser package with no module", f"has no package/{WASM_FILE}",
               lambda world: world.npm.__setitem__(NPM_WASM, packed_tar({"package/package.json": b"{}"})))
    yield case("a PyPI file that left its digest", "does not match its digest",
               pypi_record(digests={"sha256": "0" * 64}))
    yield case("a yanked PyPI file", "is yanked", pypi_record(yanked=True))
    yield case("a PyPI file on a foreign address", "foreign address",
               pypi_record(url="https://pypi.org/elsewhere.whl"))
    yield case("a tag the repository does not have", "no tag",
               lambda world: setattr(world, "listing", ""))

    for label, words, change in (
            ("a checksum line with another hash", "does not match its line",
             lambda lines: ["0" * 64 + line[64:] if "linux" in line else line for line in lines]),
            ("a checksum list that names a file twice", "twice", lambda lines: lines + lines[:1]),
            ("a checksum list that names a foreign file", "foreign file", lambda lines: lines + ["0" * 64 + "  ../x.tar.gz"]),
            ("a checksum list with a broken line", "unreadable line", lambda lines: lines + ["not a line"]),
            ("a checksum list that names a file the release lacks", "answers 404",
             lambda lines: lines + ["0" * 64 + f"  {CLI}-{World.VERSION}-riscv64.tar.gz"])):
        world = World().publish()
        address = world.base + world.prefix + "SHA256SUMS"
        world.files[address] = ("\n".join(change(world.files[address].decode().splitlines())) + "\n").encode()
        yield label, words, world


def refused(action):
    try:
        action()
    except Refused as error:
        return str(error)
    return None


def self_test():
    checks = []

    def check(label, passed, detail=""):
        checks.append((label, bool(passed), detail))

    for path, text in SPELLED:
        check(f"{path} spells {text}", text in (ROOT / path).read_text(encoding="utf-8"))

    world = World().publish()
    manifest = build(world, World.TAG_NAME)
    again = build(World().publish(), World.TAG_NAME)
    check("the same release gives the same bytes", serialize(manifest) == serialize(again))
    assets = manifest["release"]["assets"]
    check("a manifest names the tag object, the commit and the source date",
          (manifest["tag_object"], manifest["commit"], manifest["source_date_epoch"])
          == (World.TAG_OBJECT, World.COMMIT, 1_700_000_000))
    check("each prebuilt archive carries its target and its executable",
          {name: (entry.get("target"), entry.get("executable", {}).get("path")) for name, entry in assets.items()}
          == {world.prefix + "x86_64-unknown-linux-gnu.tar.gz": ("x86_64-unknown-linux-gnu", "qrscan"),
              world.prefix + "x86_64-pc-windows-msvc.zip": ("x86_64-pc-windows-msvc", "qrscan.exe"),
              world.prefix + "source.tar.gz": (None, None)})
    check("the Node package names its platform packages, each with its own hashes",
          manifest["npm"][NPM_NODE]["platforms"] == sorted(World.PLATFORMS)
          and set(manifest["npm"]) == {NPM_NODE, NPM_WASM, *World.PLATFORMS})
    check("the browser package carries the hash of its module",
          manifest["npm"][NPM_WASM]["files"][WASM_FILE] == {"sha256": sha256(b"\0asm wasm"), "size": 9})
    check("every file of the Python package is listed", len(manifest["pypi"][PYPI]["files"]) == 2)

    lightweight = World()
    lightweight.listing = f"{World.COMMIT}\trefs/tags/{World.TAG_NAME}\n"
    check("a tag with no object of its own is its commit",
          build(lightweight.publish(), World.TAG_NAME)["tag_object"] is None)
    check("a tag that is not an engine release is refused",
          "reads vX.Y.Z" in (refused(lambda: build(world, "agents-v0.3.0")) or ""))

    for label, words, broken in broken_worlds():
        message = refused(lambda: build(broken, World.TAG_NAME))
        check(f"refuses {label}", message is not None and words in message, message or "it was accepted")

    with tempfile.TemporaryDirectory() as scratch:
        path = pathlib.Path(scratch) / f"{World.TAG_NAME}.json"
        path.write_bytes(serialize(manifest))
        check("verify accepts the manifest of the public release", refused(lambda: verify(world, path)) is None)
        changed = json.loads(path.read_bytes())
        changed["crates"][CRATES[0]]["sha256"] = "0" * 64
        path.write_bytes(serialize(changed))
        message = refused(lambda: verify(world, path)) or ""
        check("verify names the value that differs",
              "differs from the public release" in message and f"/crates/{CRATES[0]}/sha256" in message, message)
        path.write_bytes(json.dumps(manifest).encode())
        check("verify refuses the same values written another way",
              "written another way" in (refused(lambda: verify(world, path)) or ""))
        misnamed = pathlib.Path(scratch) / "latest.json"
        misnamed.write_bytes(serialize(manifest))
        check("verify refuses a manifest under another name",
              f"name it {World.TAG_NAME}.json" in (refused(lambda: verify(world, misnamed)) or ""))

    check("an http address is never read", "only https://" in (refused(lambda: checked_url("http://github.com/x")) or ""))
    check("a foreign host is never read", "foreign host" in (refused(lambda: checked_url("https://example.org/x")) or ""))
    check("a release asset host is read", checked_url("https://release-assets.githubusercontent.com/x"))
    policy = RedirectPolicy()
    check("a redirect to a foreign host is refused", "foreign host" in (refused(
        lambda: policy.redirect_request(None, None, 302, "", {}, "https://example.org/x")) or ""))
    request = urllib.request.Request("https://github.com/x", headers={"Authorization": "Bearer x"})
    check("a request with credentials never leaves", "Authorization" in (refused(lambda: Anonymous().check(request)) or ""))
    check("a file above the limit is refused",
          "larger than 4 bytes" in (refused(lambda: read_capped(io.BytesIO(b"12345"), "u", limit=4)) or ""))

    failed = [(label, detail) for label, passed, detail in checks if not passed]
    for label, detail in failed:
        print(f"FAIL {label}" + (f": {detail}" if detail else ""))
    print(f"self-test: {len(checks) - len(failed)}/{len(checks)} checks passed")
    return 1 if failed else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    build_command = commands.add_parser("build")
    build_command.add_argument("--tag", required=True)
    build_command.add_argument("--out", required=True, type=pathlib.Path)
    verify_command = commands.add_parser("verify")
    verify_command.add_argument("manifest", nargs="+", type=pathlib.Path)
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.command:
        parser.print_usage(sys.stderr)
        return 2
    try:
        if args.command == "build":
            require(args.out.name == f"{args.tag}.json", f"name the file {args.tag}.json")
            require(not args.out.exists(), f"{args.out} exists: a manifest is written once")
            manifest = build(Public(), args.tag)
            args.out.write_bytes(serialize(manifest))
            print(f"{args.out}: {args.tag} at {manifest['commit']}, "
                  f"sha256 {sha256(serialize(manifest))}")
        else:
            for path in args.manifest:
                manifest = verify(Public(), path)
                print(f"{path}: the public release of {manifest['tag']} matches, "
                      f"sha256 {sha256(serialize(manifest))}")
    except Refused as error:
        print(f"refused: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
