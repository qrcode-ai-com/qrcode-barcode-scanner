#!/usr/bin/env python3
"""Export a tested image once and record its real config, binary and layer bytes.

This is a candidate receipt, not a public/frozen release BOM. A native producer
run and its official artifact IDs/digests must be recorded before publication.
"""

import argparse
import copy
import gzip
import hashlib
import io
import json
import subprocess
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def config_identity(tar, image, config):
    """Bind the exported config to either Docker's config ID or OCI index ID."""
    config_digest = "sha256:" + sha(config)
    if image["Id"] == config_digest:
        return config_digest
    descriptor = image.get("Descriptor")
    assert descriptor and descriptor["digest"] == image["Id"], (
        "unknown image identity format"
    )

    def document(item):
        digest = item["digest"]
        assert digest.startswith("sha256:") and len(digest) == 71
        data = tar.extractfile("blobs/sha256/" + digest[7:]).read()
        assert "sha256:" + sha(data) == digest and len(data) == item["size"], (
            "OCI descriptor mismatch"
        )
        return json.loads(data)

    current = document(descriptor)
    if "manifests" in current:
        matches = [
            item
            for item in current["manifests"]
            if item.get("platform", {}).get("os") == image["Os"]
            and item.get("platform", {}).get("architecture") == image["Architecture"]
        ]
        assert len(matches) == 1, "OCI index must select one platform image"
        current = document(matches[0])
    assert current["config"]["digest"] == config_digest, (
        "OCI index selected a different config"
    )
    assert current["config"]["size"] == len(config)
    return config_digest


def self_test():
    config = b'{"architecture":"arm64"}'
    config_digest = "sha256:" + sha(config)
    manifest = json.dumps(
        {"config": {"digest": config_digest, "size": len(config)}}
    ).encode()
    child = {
        "digest": "sha256:" + sha(manifest),
        "size": len(manifest),
        "platform": {"os": "linux", "architecture": "arm64"},
    }
    index = json.dumps({"manifests": [child]}).encode()
    descriptor = {"digest": "sha256:" + sha(index), "size": len(index)}
    image = {
        "Id": descriptor["digest"],
        "Descriptor": descriptor,
        "Os": "linux",
        "Architecture": "arm64",
    }

    def archive():
        out = io.BytesIO()
        with tarfile.open(fileobj=out, mode="w") as tar:
            for data in [manifest, index]:
                item = tarfile.TarInfo("blobs/sha256/" + sha(data))
                item.size = len(data)
                tar.addfile(item, io.BytesIO(data))
        return tarfile.open(fileobj=io.BytesIO(out.getvalue()))

    with archive() as tar:
        assert config_identity(tar, image, config) == config_digest
        assert config_identity(tar, {"Id": config_digest}, config) == config_digest
        count = 0
        for mutate in [
            lambda value: value.update(Architecture="amd64"),
            lambda value: value.update(Id="sha256:" + "0" * 64),
            lambda value: value["Descriptor"].update(size=1),
        ]:
            bad = copy.deepcopy(image)
            mutate(bad)
            try:
                config_identity(tar, bad, config)
            except (AssertionError, KeyError):
                count += 1
            else:
                raise AssertionError("accepted invalid OCI identity")
        try:
            config_identity(tar, image, b"wrong config")
        except AssertionError:
            count += 1
        else:
            raise AssertionError("accepted substituted config")
    print(
        json.dumps(
            {"result": "PASS", "valid_identity_forms": 2, "negative_cases": count}
        )
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", nargs="?")
    parser.add_argument("--consumer", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.image or not args.consumer or not args.out:
        parser.error("image, --consumer and --out are required")
    assert not args.out.exists(), "export destination must be new"
    consumer = json.loads(args.consumer.read_text())
    image = json.loads(
        subprocess.check_output(["docker", "image", "inspect", args.image], text=True)
    )[0]
    assert consumer["result"] == "PASS" and consumer["image_id"] == image["Id"]
    assert (
        consumer["packaging_revision"]
        == image["Config"]["Labels"]["io.qrcode-ai.scanner.packaging-revision"]
    )
    args.out.mkdir(parents=True)
    (args.out / "consumer.json").write_bytes(args.consumer.read_bytes())
    (args.out / "image-inspect.json").write_text(json.dumps(image, indent=2) + "\n")
    archive = args.out / "image.tar.gz"
    result = subprocess.run(
        ["docker", "save", args.image], capture_output=True, check=True, timeout=600
    )
    archive.write_bytes(gzip.compress(result.stdout, mtime=0))
    with tarfile.open(archive) as tar:
        manifests = json.loads(tar.extractfile("manifest.json").read())
        assert len(manifests) == 1
        manifest = manifests[0]
        config = tar.extractfile(manifest["Config"]).read()
        config_digest = config_identity(tar, image, config)
        layers = []
        for path, expected in zip(
            manifest["Layers"], image["RootFS"]["Layers"], strict=True
        ):
            stored = tar.extractfile(path).read()
            raw = gzip.decompress(stored) if stored.startswith(b"\x1f\x8b") else stored
            assert "sha256:" + sha(raw) == expected, path
            layers.append(
                {
                    "digest": expected,
                    "size": len(raw),
                    "stored_sha256": sha(stored),
                    "stored_size": len(stored),
                    "archive_member": path,
                }
            )
    tracked = [
        "distribution/docker/v0.11/" + path.name
        for path in sorted(HERE.iterdir())
        if path.is_file()
    ]
    tracked += [
        ".github/workflows/distribution-checks.yml",
        "scripts/consumer_truth.py",
        "fixtures/consumer-truth.json",
    ]
    files = {
        path.name: sha(path.read_bytes())
        for path in args.out.iterdir()
        if path.is_file()
    }
    bom = {
        "schema": "qrscan-oci-candidate/1",
        "version": "0.11.0",
        "engine_source": consumer["source"],
        "packaging_revision": consumer["packaging_revision"],
        "frozen_for_publication": False,
        "image": "ghcr.io/qrcode-ai-com/qrcode-barcode-scanner",
        "architecture": image["Architecture"],
        "image_id": image["Id"],
        "config_digest": config_digest,
        "config_size": len(config),
        "raw_layers": layers,
        "binary_sha256": consumer["binary_sha256"],
        "execution": consumer["execution"],
        "native_linux_host_required": consumer["native_linux_host_required"],
        "files": files,
        "source_file_sha256": {
            name: sha((ROOT / name).read_bytes()) for name in tracked
        },
        "remaining": [
            "native Linux AMD64 and ARM64 producer receipts",
            "official producer run and artifact IDs/digests",
            "reviewed frozen release BOM and publisher guard",
            "GHCR upload and anonymous pull consumers",
        ],
    }
    (args.out / "candidate-bom.json").write_text(json.dumps(bom, indent=2) + "\n")
    print(
        json.dumps(
            {
                "result": "PASS",
                "image_id": bom["image_id"],
                "architecture": bom["architecture"],
                "archive_sha256": files["image.tar.gz"],
                "raw_layers": len(layers),
                "frozen_for_publication": False,
            }
        )
    )


if __name__ == "__main__":
    main()
