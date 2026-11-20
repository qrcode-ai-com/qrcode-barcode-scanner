#!/usr/bin/env python3
"""Compose the Artifact Hub index of the 0.11.0 container image, without rebuilding anything.

  compose-index.py compose --readme-commit SHA --out DIR [--fetch]
  compose-index.py verify-pushed --tag TAG --expect DIR/index.json
  compose-index.py --self-test

Artifact Hub reads its listing keys from the annotations of an OCI index. The published index of
ghcr.io/qrcode-ai-com/qrcode-barcode-scanner, tag 0.11.0, lacks two keys it needs
(org.opencontainers.image.created and io.artifacthub.package.readme-url), and that index is frozen
by distribution/docker/v0.11/release-0.11.0.json. So the listing gets a new index under a new tag:
the same two platform manifests, copied by digest and size, byte for byte, plus the listing
annotations. No image, layer or manifest is rebuilt or uploaded; only the small index is new.

`compose` starts from published-index-0.11.0.json, the exact bytes of the published index (or, with
--fetch, from the registry, read anonymously). It refuses any byte that differs from the pinned
digests below, keeps every original annotation, adds the listing keys and writes DIR/index.json,
DIR/index.sha256 and DIR/compose.json. The new digest depends on the README commit, which must be
a full 40-character commit of this repository whose distribution/artifacthub/LISTING.md is the page.

`verify-pushed` reads TAG anonymously after the owner pushed it and checks that the registry
returns exactly DIR/index.json and that both platform manifests are still the published ones.
Stdlib only. Exit 0 when the step passes, 1 when it fails, 2 for usage.
"""
import argparse
import hashlib
import json
import pathlib
import re
import sys
import tempfile
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
REGISTRY = "ghcr.io"
REPOSITORY = "qrcode-ai-com/qrcode-barcode-scanner"
ENGINE = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
PUBLISHED = HERE / "published-index-0.11.0.json"
INDEX_DIGEST = "sha256:fd0433f29b0dabd469ce6a8fdcfc7bf6554960301b5bc57b5fca97928fd7cb96"
INDEX_TYPE = "application/vnd.oci.image.index.v1+json"
CHILD_TYPE = "application/vnd.docker.distribution.manifest.v2+json"
# The two platform manifests of the published index, and the image configurations they name.
CHILDREN = {
    "amd64": {"digest": "sha256:4dfcdfb66730e191176be72df398e0dadec15ed6dab25227149375fb3931f42c",
              "size": 1574,
              "config": "sha256:6022934ca26dda33a52ea5f3d2585c0b7430a74e0c51cc9722aa1a4d8b711e64",
              "created": "2026-11-05T16:22:13.275184105Z"},
    "arm64": {"digest": "sha256:8720bf185c698747893fbd67d33bda9f42ffa99ef86af094fbaa7e4a9298a359",
              "size": 1574,
              "config": "sha256:2c1e8d30e960ecf1d32c88200b32dd3df38e80a379637ce2ac91c32d1cceea58",
              "created": "2026-11-05T16:22:15.301462348Z"},
}
# The build time of the images: the later of the two configurations, not the date of the new index.
CREATED = max(child["created"] for child in CHILDREN.values())
LISTING = {
    "org.opencontainers.image.created": CREATED,
    "org.opencontainers.image.vendor": "QR Code AI",
    "io.artifacthub.package.license": "AGPL-3.0-or-later",
    "io.artifacthub.package.keywords": "qr-code,barcode,scanner,qrscan,offline,cli,data-matrix,pdf417",
    "io.artifacthub.package.logo-url": "https://avatars.githubusercontent.com/u/349890106?v=4",
    "io.artifacthub.package.maintainers": '[{"name":"QR Code AI","email":"contact@qrcode-ai.com"}]',
}
README_URL = "https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/{commit}/distribution/artifacthub/LISTING.md"


class Refused(Exception):
    """An input is not the published one, or an argument is unusable."""


def sha256(data):
    return "sha256:" + hashlib.sha256(data).hexdigest()


def encode(document):
    """The registry form of an index: sorted keys, no spaces, no final newline."""
    return json.dumps(document, sort_keys=True, separators=(",", ":")).encode()


def read_published(data):
    """The published index, refused unless its bytes have the pinned digest and shape."""
    if sha256(data) != INDEX_DIGEST:
        raise Refused(f"the index is {sha256(data)}, not the published {INDEX_DIGEST}")
    index = json.loads(data)
    if encode(index) != data:
        raise Refused("the published index no longer re-encodes to its own bytes")
    if index.get("mediaType") != INDEX_TYPE or index.get("schemaVersion") != 2:
        raise Refused("the published index is not an OCI image index")
    found = {entry.get("platform", {}).get("architecture"): entry for entry in index.get("manifests", [])}
    if set(found) != set(CHILDREN) or len(index["manifests"]) != len(CHILDREN):
        raise Refused(f"the published index lists {sorted(map(str, found))}, not amd64 and arm64")
    for architecture, child in CHILDREN.items():
        entry = found[architecture]
        if (entry.get("digest"), entry.get("size"), entry.get("mediaType"), entry["platform"].get("os")) \
                != (child["digest"], child["size"], CHILD_TYPE, "linux"):
            raise Refused(f"the {architecture} manifest of the index is not the published one")
    return index


def compose(index, commit):
    if not re.fullmatch(r"[0-9a-f]{40}", commit or ""):
        raise Refused("--readme-commit must be a full 40-character commit of the engine repository")
    annotations = dict(index["annotations"])
    for key, value in LISTING.items():
        if key in annotations:
            raise Refused(f"the published index already sets {key}: compose would replace it")
        annotations[key] = value
    annotations["io.artifacthub.package.readme-url"] = README_URL.format(commit=commit)
    # The platform manifests are copied as they are: same digest, size, type and platform.
    return {"annotations": annotations, "manifests": index["manifests"],
            "mediaType": index["mediaType"], "schemaVersion": index["schemaVersion"]}


# ------------------------------------------------------------------ the registry, read anonymously

def token():
    url = f"https://{REGISTRY}/token?scope=repository:{REPOSITORY}:pull&service={REGISTRY}"
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.load(response)["token"]


def get(path, accept, bearer):
    request = urllib.request.Request(f"https://{REGISTRY}/v2/{REPOSITORY}/{path}",
                                     headers={"Authorization": f"Bearer {bearer}", "Accept": accept})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def fetch_published():
    """Read the published index, its two manifests and their configurations; check every digest."""
    bearer = token()
    data = get(f"manifests/{INDEX_DIGEST}", INDEX_TYPE, bearer)
    index = read_published(data)
    for architecture, child in CHILDREN.items():
        manifest = get(f"manifests/{child['digest']}", CHILD_TYPE, bearer)
        if sha256(manifest) != child["digest"] or len(manifest) != child["size"]:
            raise Refused(f"the registry returned another {architecture} manifest")
        config_digest = json.loads(manifest)["config"]["digest"]
        if config_digest != child["config"]:
            raise Refused(f"the {architecture} manifest names another configuration")
        config = get(f"blobs/{config_digest}", "application/octet-stream", bearer)
        if sha256(config) != config_digest or json.loads(config).get("created") != child["created"]:
            raise Refused(f"the {architecture} configuration is not the published one")
    return data, index


def write(out, document, source):
    out = pathlib.Path(out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    out.mkdir(parents=True, exist_ok=True)
    data = encode(document)
    digest = sha256(data)
    (out / "index.json").write_bytes(data)
    (out / "index.sha256").write_text(digest + "\n")
    record = {"schema": "qrscan-artifacthub-index/1", "image": f"{REGISTRY}/{REPOSITORY}",
              "from": {"digest": INDEX_DIGEST, "read": source},
              "manifests": {name: child["digest"] for name, child in CHILDREN.items()},
              "added": {key: document["annotations"][key] for key in
                        sorted(set(document["annotations"]) - set(json.loads(PUBLISHED.read_bytes())["annotations"]))},
              "index": {"digest": digest, "size": len(data)}}
    (out / "compose.json").write_text(json.dumps(record, indent=2) + "\n")
    return digest, len(data)


def verify_pushed(tag, expect):
    wanted = pathlib.Path(expect).read_bytes()
    bearer = token()
    pushed = get(f"manifests/{tag}", INDEX_TYPE, bearer)
    if pushed != wanted:
        raise Refused(f"{tag} is {sha256(pushed)}, not the composed {sha256(wanted)}")
    for architecture, child in CHILDREN.items():
        manifest = get(f"manifests/{child['digest']}", CHILD_TYPE, bearer)
        if sha256(manifest) != child["digest"]:
            raise Refused(f"the {architecture} manifest changed in the registry")
    return sha256(pushed)


# ------------------------------------------------------------------ self-test

def self_test():
    failures = []
    commit = "176ac96ef16ee330dbfc6ada10327d0b4e23a8b2"

    def refused(name, action, needle):
        try:
            action()
        except Refused as error:
            if needle not in str(error):
                failures.append(f"{name}: refused with {error!s}, expected {needle!r}")
        else:
            failures.append(f"{name}: accepted")

    data = PUBLISHED.read_bytes()
    try:
        index = read_published(data)
    except Refused as error:
        print(f"SELF-TEST FAILED · the recorded published index was refused: {error}", file=sys.stderr)
        return 1
    composed = compose(index, commit)
    if composed["manifests"] != index["manifests"]:
        failures.append("the platform manifests were not copied as they are")
    if any(composed["annotations"][key] != value for key, value in index["annotations"].items()):
        failures.append("an original annotation was changed")
    for key in ("org.opencontainers.image.created", "io.artifacthub.package.readme-url",
                "io.artifacthub.package.license"):
        if key not in composed["annotations"]:
            failures.append(f"{key} is missing")
    if composed["annotations"]["io.artifacthub.package.license"] != "AGPL-3.0-or-later":
        failures.append("the listing license is not the archive's AGPL-3.0-or-later")
    if composed["annotations"]["org.opencontainers.image.created"] != "2026-11-05T16:22:15.301462348Z":
        failures.append("created is not the build time of the images")
    if encode(compose(index, commit)) != encode(composed):
        failures.append("two compositions of the same input differ")
    if sha256(encode(compose(index, "0" * 40))) == sha256(encode(composed)):
        failures.append("the README commit does not reach the digest")
    tampered = data.replace(b"0.11.0", b"0.11.1")
    refused("an index with other bytes", lambda: read_published(tampered), "not the published")
    refused("a short commit", lambda: compose(index, "176ac96"), "full 40-character")
    refused("a branch name", lambda: compose(index, "main"), "full 40-character")
    with tempfile.TemporaryDirectory() as temporary:
        out = pathlib.Path(temporary) / "out"
        digest, size = write(out, composed, "published-index-0.11.0.json")
        if (out / "index.json").read_bytes() != encode(composed) or (out / "index.sha256").read_text().strip() != digest:
            failures.append("the written index or its digest differ from the composition")
        record = json.loads((out / "compose.json").read_text())
        if record["index"] != {"digest": digest, "size": size} or record["from"]["digest"] != INDEX_DIGEST:
            failures.append("compose.json does not describe the written index")
        refused("a second compose into the same directory", lambda: write(out, composed, "x"), "is not empty")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (the published index, one composition, 4 refusals)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("compose", help="write the listing index from the published one")
    one.add_argument("--readme-commit", required=True)
    one.add_argument("--out", required=True)
    one.add_argument("--fetch", action="store_true", help="read the published index from the registry")
    two = commands.add_parser("verify-pushed", help="read a pushed tag back and compare")
    two.add_argument("--tag", required=True)
    two.add_argument("--expect", required=True)
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        if args.command == "compose":
            if args.fetch:
                data, index = fetch_published()
                if data != PUBLISHED.read_bytes():
                    raise Refused("the registry index differs from published-index-0.11.0.json")
                source = f"https://{REGISTRY}/v2/{REPOSITORY}/manifests/{INDEX_DIGEST}"
            else:
                index = read_published(PUBLISHED.read_bytes())
                source = "published-index-0.11.0.json"
            digest, size = write(args.out, compose(index, args.readme_commit), source)
            print(f"composed {args.out}/index.json · {digest} · {size} bytes")
        elif args.command == "verify-pushed":
            print(f"ok    {args.tag} is {verify_pushed(args.tag, args.expect)}")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"compose-index: {error}", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"compose-index: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
