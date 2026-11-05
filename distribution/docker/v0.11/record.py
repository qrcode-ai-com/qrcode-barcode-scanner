#!/usr/bin/env python3
"""Export a tested image once and record its real config, binary and layer bytes.

This is a candidate receipt, not a public/frozen release BOM. A native producer
run and its official artifact IDs/digests must be recorded before publication.
"""

import argparse
import gzip
import hashlib
import json
import subprocess
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image")
    parser.add_argument("--consumer", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
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
        assert "sha256:" + sha(config) == image["Id"]
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
