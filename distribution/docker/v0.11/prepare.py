#!/usr/bin/env python3
"""Prepare a minimal OCI build context from pinned public v0.11.0 assets.

No Cargo, registry login or upload. Downloads are anonymous and hash checked;
existing inputs are accepted only with their pinned digest. The output must be
new or empty, so no other checkout or operator file enters a Docker context.
"""

import argparse
import hashlib
import io
import json
import os
import shutil
import tarfile
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path, PurePosixPath

HERE = Path(__file__).resolve().parent
INPUTS = json.loads((HERE / "inputs.json").read_text())
RELEASE = INPUTS["repository"] + "/releases/download/v0.11.0/"
DOCS = {
    "COPYRIGHT-rust-std.html",
    "LICENSE",
    "LICENSE-APACHE-2.0",
    "LICENSING.md",
    "README.md",
    "SOURCE.md",
    "THIRD-PARTY-LICENSES.txt",
    "THIRD-PARTY.md",
    "build-info.json",
}
MAX_ASSET = 32 * 1024 * 1024


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


class PublicRedirect(urllib.request.HTTPRedirectHandler):
    """Limit anonymous redirects to the two public artifact providers."""

    def redirect_request(self, request, fp, code, message, headers, url):
        host = urllib.parse.urlparse(url)
        require(
            host.scheme == "https" and host.username is None and host.password is None,
            "unsafe artifact redirect",
        )
        require(
            host.hostname in {"github.com", "static.crates.io"}
            or host.hostname.endswith(".githubusercontent.com"),
            "unexpected artifact host",
        )
        return super().redirect_request(request, fp, code, message, headers, url)


def asset(root, name, url, expected):
    path = root / name
    require(path.name == name and not path.is_symlink(), "unsafe asset path")
    if path.exists():
        data = path.read_bytes()
        require(digest(data) == expected, "existing artifact digest mismatch: " + name)
        return data
    with urllib.request.build_opener(PublicRedirect()).open(
        url, timeout=60
    ) as response:
        require(response.status == 200, "artifact HTTP status")
        data = response.read(MAX_ASSET + 1)
    require(
        len(data) <= MAX_ASSET and digest(data) == expected,
        "download digest mismatch: " + name,
    )
    path.write_bytes(data)
    return data


def unpack(data, item, out):
    stem = item["archive"].removesuffix(".tar.gz")
    members = {}
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        for member in archive.getmembers():
            path = PurePosixPath(member.name)
            require(
                not path.is_absolute() and ".." not in path.parts, "unsafe archive path"
            )
            require(
                member.isdir() or member.isfile(),
                "archive links/special members forbidden",
            )
            if member.isdir():
                require(member.name.rstrip("/") == stem, "unexpected archive directory")
                continue
            require(
                len(path.parts) == 2
                and path.parts[0] == stem
                and path.name not in members,
                "unexpected or duplicate archive member",
            )
            members[path.name] = archive.extractfile(member).read()
    require(set(members) == DOCS | {"qrscan"}, "release archive member set mismatch")
    info = json.loads(members["build-info.json"])
    require(
        info["schema"] == "qrscan-build-info/1" and info["version"] == "0.11.0",
        "binary version mismatch",
    )
    require(info["target"] == item["target"], "binary target mismatch")
    require(
        info["source"]["commit"] == INPUTS["engineSource"]
        and info["source"]["dirty"] is False,
        "binary engine source mismatch",
    )
    require(
        info["binary"]["sha256"] == digest(members["qrscan"])
        and info["binary"]["size"] == len(members["qrscan"]),
        "binary digest mismatch",
    )
    require(
        info["toolchain"]["rustc"][0].startswith("rustc 1.99.1 "),
        "binary compiler mismatch",
    )
    out.mkdir(parents=True)
    (out / "docs").mkdir()
    for name, content in members.items():
        path = (
            out / "qrscan"
            if name == "qrscan"
            else out / "docs" / ("CLI-SOURCE.md" if name == "SOURCE.md" else name)
        )
        path.write_bytes(content)
        path.chmod(0o755 if name == "qrscan" else 0o644)
    return {
        "target": item["target"],
        "archive_sha256": digest(data),
        "binary_sha256": info["binary"]["sha256"],
        "binary_size": info["binary"]["size"],
        "original_producer": info["builder"]["workflow_run"],
    }


def prepare(assets, out):
    require(
        not any(os.environ.get(key) for key in ("GH_TOKEN", "GITHUB_TOKEN")),
        "asset preparation must run without GitHub credentials",
    )
    require(
        not out.exists()
        or (out.is_dir() and not out.is_symlink() and not any(out.iterdir())),
        "build context must be new or empty",
    )
    assets.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    manifest = INPUTS["releaseManifest"]
    sums = asset(
        assets, manifest["name"], RELEASE + manifest["name"], manifest["sha256"]
    )
    lines = dict(line.split("  ", 1)[::-1] for line in sums.decode().splitlines())
    platforms = {}
    for architecture, item in INPUTS["platforms"].items():
        require(lines[item["archive"]] == item["sha256"], "manifest/archive mismatch")
        data = asset(assets, item["archive"], RELEASE + item["archive"], item["sha256"])
        platforms[architecture] = unpack(data, item, out / architecture)
    (out / "source").mkdir()
    for name, item in INPUTS["sources"].items():
        if name.endswith(".tar.gz"):
            require(lines[name] == item["sha256"], "source/manifest mismatch")
        data = asset(assets, name, item["url"], item["sha256"])
        (out / "source" / name).write_bytes(data)
    shutil.copyfile(HERE / "SOURCE.md", out / "SOURCE.md")
    receipt = {
        "schema": "qrscan-oci-preparation/1",
        "result": "PASS",
        "engine_source": INPUTS["engineSource"],
        "manifest_sha256": manifest["sha256"],
        "base_image": INPUTS["baseImage"],
        "platforms": platforms,
        "sources": {name: item["sha256"] for name, item in INPUTS["sources"].items()},
        "context_files": {
            str(path.relative_to(out)): digest(path.read_bytes())
            for path in sorted(out.rglob("*"))
            if path.is_file()
        },
    }
    return receipt


def self_test():
    # A forged source, target or binary is refused before creating any context.
    original = {
        "schema": "qrscan-build-info/1",
        "version": "0.11.0",
        "target": "test-target",
        "source": {"commit": INPUTS["engineSource"], "dirty": False},
        "binary": {"sha256": digest(b"binary"), "size": 6},
        "toolchain": {"rustc": ["rustc 1.99.1 (test)"]},
        "builder": {"workflow_run": "test"},
    }
    count = 0

    def archive(info, extra=None):
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode="w:gz") as tar:
            files = {name: b"notice" for name in DOCS} | {"qrscan": b"binary"}
            files["build-info.json"] = json.dumps(info).encode()
            for name, content in files.items():
                header = tarfile.TarInfo("test/" + name)
                header.size = len(content)
                tar.addfile(header, io.BytesIO(content))
            if extra:
                header = tarfile.TarInfo(extra)
                header.size = 1
                tar.addfile(header, io.BytesIO(b"x"))
        return output.getvalue()

    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        unpack(
            archive(original),
            {"archive": "test.tar.gz", "target": "test-target"},
            root / "valid",
        )
        for field, value in [
            ("target", "wrong"),
            ("version", "0.10.0"),
            ("binary", {"sha256": "0" * 64, "size": 6}),
            ("source", {"commit": "0" * 40, "dirty": False}),
        ]:
            try:
                unpack(
                    archive(original | {field: value}),
                    {"archive": "test.tar.gz", "target": "test-target"},
                    root / field,
                )
            except ValueError:
                count += 1
            else:
                raise AssertionError("accepted forged " + field)
        try:
            unpack(
                archive(original, "test/../../escape"),
                {"archive": "test.tar.gz", "target": "test-target"},
                root / "unsafe",
            )
        except ValueError:
            count += 1
        else:
            raise AssertionError("accepted unsafe path")
        (root / "asset").write_bytes(b"wrong")
        try:
            asset(root, "asset", "https://invalid.example/", digest(b"correct"))
        except ValueError:
            count += 1
        else:
            raise AssertionError("accepted corrupt existing artifact")
    print(json.dumps({"result": "PASS", "valid_archive": 1, "negative_cases": count}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.assets or not args.out:
        parser.error("--assets and --out are required")
    receipt = prepare(args.assets, args.out)
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
