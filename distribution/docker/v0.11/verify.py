#!/usr/bin/env python3
"""Qualify the repackaged public 0.11 CLI image; never build Rust or access a registry."""

import argparse
import base64
import copy
import hashlib
import json
import platform
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))
import consumer_truth

INPUTS = json.loads(Path(__file__).with_name("inputs.json").read_text())


def white_png():
    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data))
        )

    row = b"\x00" + b"\xff\xff\xff" * 64
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 64, 64, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(row * 64))
        + chunk(b"IEND", b"")
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image")
    parser.add_argument("fixture", type=Path)
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--expected-platform", choices=("linux/amd64", "linux/arm64"))
    parser.add_argument(
        "--native",
        action="store_true",
        help="require native Linux host and Docker engine",
    )
    parser.add_argument("--packaging-revision", required=True)
    args = parser.parse_args()
    image = json.loads(
        subprocess.check_output(["docker", "image", "inspect", args.image], text=True)
    )[0]
    assert image["Config"]["User"] == "65532:65532"
    assert image["Config"]["Entrypoint"] == ["/usr/local/bin/qrscan"]
    assert image["Config"]["Labels"]["org.opencontainers.image.version"] == "0.11.0"
    assert (
        image["Config"]["Labels"]["org.opencontainers.image.licenses"]
        == "AGPL-3.0-or-later"
    )
    labels = image["Config"]["Labels"]
    assert re.fullmatch(r"[0-9a-f]{40}", args.packaging_revision)
    assert args.packaging_revision != INPUTS["engineSource"]
    assert labels["io.qrcode-ai.scanner.packaging-revision"] == args.packaging_revision
    assert (
        labels["org.opencontainers.image.revision"]
        == "176ac96ef16ee330dbfc6ada10327d0b4e23a8b2"
    )
    assert (
        labels["org.opencontainers.image.source"]
        == "https://github.com/qrcode-ai-com/qrcode-barcode-scanner"
    )
    assert labels["org.opencontainers.image.title"] == "QR Code & Barcode Scanner"
    assert labels["org.opencontainers.image.url"] == "https://qrcode-ai.com/"
    assert (
        labels["org.opencontainers.image.documentation"]
        == INPUTS["repository"] + "/tree/main/distribution/docker/v0.11"
    )
    assert (
        labels["org.opencontainers.image.description"]
        == "Local QR code, barcode and matrix-code scanning. Mount input read-only and run qrscan without network access."
    )
    assert image["Config"]["WorkingDir"] == "/data"
    assert image["Config"]["Cmd"] == ["--help"]
    assert "RAYON_NUM_THREADS=2" in image["Config"]["Env"]
    assert image["Architecture"] in ("amd64", "arm64")
    actual_platform = image["Os"] + "/" + image["Architecture"]
    if args.expected_platform:
        assert actual_platform == args.expected_platform, (
            actual_platform,
            args.expected_platform,
        )
    aliases = {
        "x86_64": "amd64",
        "amd64": "amd64",
        "aarch64": "arm64",
        "arm64": "arm64",
    }
    daemon_arch = subprocess.check_output(
        ["docker", "info", "--format", "{{.Architecture}}"], text=True
    ).strip()
    execution = (
        "native-daemon"
        if aliases.get(daemon_arch) == image["Architecture"]
        else "emulated"
    )
    if args.native:
        assert (
            platform.system() == "Linux"
            and aliases.get(platform.machine()) == image["Architecture"]
        )
        assert execution == "native-daemon"
    fixture = args.fixture.resolve()
    assert (
        hashlib.sha256(fixture.read_bytes()).hexdigest()
        == "1dc399cad19623a145b20251cf1c0da42ea4f54fd79871a4dd796c9554822dd6"
    )
    cases = []
    with tempfile.TemporaryDirectory(prefix="qrscan-oci-") as directory:
        root = Path(directory)
        root.chmod(0o755)
        shutil.copyfile(fixture, root / "input with spaces.png")
        (root / "white.png").write_bytes(white_png())
        (root / "invalid.bin").write_bytes(b"this is not an image")
        for file in root.iterdir():
            file.chmod(0o644)
        prefix = [
            "docker",
            "run",
            "--rm",
            "--platform",
            actual_platform,
            "--network",
            "none",
            "--read-only",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            "--memory",
            "512m",
            "--cpus",
            "2",
            "--pids-limit",
            "128",
            "--mount",
            f"type=bind,src={root},dst=/data,readonly",
            args.image,
        ]

        def run(arguments, code):
            result = subprocess.run(
                prefix + arguments,
                capture_output=True,
                text=True,
                timeout=90,
                check=False,
            )
            cases.append(
                {
                    "arguments": arguments,
                    "exit": result.returncode,
                    "stdout_sha256": hashlib.sha256(result.stdout.encode()).hexdigest(),
                    "stderr": result.stderr,
                }
            )
            assert result.returncode == code, (
                arguments,
                result.returncode,
                result.stderr,
            )
            if code == 2:
                assert result.stdout == "" and result.stderr.strip(), (
                    arguments,
                    result.stdout,
                    result.stderr,
                )
            return result.stdout

        assert run(["--version"], 0).strip() == "qrscan 0.11.0"
        assert "--profile" in run(["--help"], 0)
        full = json.loads(
            run(
                [
                    "/data/input with spaces.png",
                    "--profile",
                    "full",
                    "--budget-ms",
                    "0",
                ],
                0,
            )
        )
        assert full["versions"] == {
            "scanner": "0.11.0",
            "pipeline": 5,
            "score_contract": 5,
        }
        text = "https://qrcode-ai.com/c/v5q"
        assert [d["content"] for d in full["detections"]] == [
            {
                "text": text,
                "raw": base64.b64encode(text.encode()).decode(),
                "charset": "utf8",
            }
        ]
        assert [d["symbology"] for d in full["detections"]] == ["qr_code"]
        assert full["score"]["value"] == 100
        assert full["trace"]["budget_exhausted"] is False
        assert "alpha" not in full
        frame = json.loads(
            run(
                [
                    "/data/input with spaces.png",
                    "--profile",
                    "frame",
                    "--budget-ms",
                    "0",
                ],
                0,
            )
        )
        assert frame["versions"] == full["versions"]
        assert frame["score"] is None
        assert [(d["symbology"], d["content"]) for d in frame["detections"]] == [
            (d["symbology"], d["content"]) for d in full["detections"]
        ]
        assert frame["trace"]["budget_exhausted"] is False and "alpha" not in frame
        empty = json.loads(
            run(["/data/white.png", "--profile", "full", "--budget-ms", "0"], 1)
        )
        assert empty["versions"] == full["versions"]
        assert empty["detections"] == [] and empty["score"] is None
        assert empty["trace"]["budget_exhausted"] is False and "alpha" not in empty
        assert (
            run(
                ["/data/input with spaces.png", "--budget-ms", "0", "--score-only"], 0
            ).strip()
            == "100"
        )
        assert (
            run(
                ["/data/input with spaces.png", "--profile", "frame", "--score-only"], 2
            )
            == ""
        )
        assert run(["/data/invalid.bin"], 2) == ""
        assert run(["/data/absent.png"], 2) == ""
        assert run(["/data/input with spaces.png", "--profile", "invalid"], 2) == ""
        truth = consumer_truth.load()
        staged = consumer_truth.stage(truth, root / "truth")
        for file in (root / "truth").rglob("*"):
            file.chmod(0o755 if file.is_dir() else 0o644)
        truth_profiles = []
        for case, path in staged:
            profiles = (
                ("full", "fast", "frame")
                if case["id"] in {"qr-and-code128", "qr-twins-and-code128"}
                else ("full",)
            )
            for profile in profiles:
                code = 2 if "error" in case else 0 if case["contents"] else 1
                output = run(
                    [
                        "/data/" + str(path.relative_to(root)),
                        "--profile",
                        profile,
                        "--budget-ms",
                        "0",
                    ],
                    code,
                )
                if "error" not in case:
                    report = json.loads(output)
                    expected = copy.deepcopy(case)
                    if profile == "frame":
                        expected["score"] = None
                    problems = consumer_truth.judge(expected, report, full["versions"])
                    assert not problems, (case["id"], profile, problems)
                    assert report["trace"]["engine_panics"] == 0, (case["id"], profile)
                truth_profiles.append(
                    {"id": case["id"], "profile": profile, "exit": code}
                )
        permission = subprocess.run(
            prefix[:-1]
            + [
                "--entrypoint",
                "/bin/sh",
                args.image,
                "-c",
                "test $(id -u) -eq 65532 && test ! -w /data && test ! -w /usr/local/bin && test ! -w /tmp",
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        assert permission.returncode == 0, permission.stderr
        source_hashes = subprocess.check_output(
            prefix[:-1]
            + [
                "--entrypoint",
                "sha256sum",
                args.image,
                "/usr/share/doc/qrscan/source/qrcode-barcode-scanner-0.11.0.crate",
                "/usr/share/doc/qrscan/source/qrcode-barcode-scanner-cli-0.11.0.crate",
            ],
            text=True,
            timeout=30,
        )
        assert source_hashes.splitlines() == [
            "08d6f8736cc4d8c82836e8b2056d47809ba9ea9219ef904f5ba2935c8f972031  /usr/share/doc/qrscan/source/qrcode-barcode-scanner-0.11.0.crate",
            "9c29e1bb38efb23d5937527f284d773b265fabd501b8da8fffa3f54647ad11d3  /usr/share/doc/qrscan/source/qrcode-barcode-scanner-cli-0.11.0.crate",
        ]
        source_set = subprocess.check_output(
            prefix[:-1]
            + [
                "--entrypoint",
                "sha256sum",
                args.image,
                *["/usr/share/doc/qrscan/source/" + name for name in INPUTS["sources"]],
            ],
            text=True,
            timeout=30,
        )
        assert source_set.splitlines() == [
            item["sha256"] + "  /usr/share/doc/qrscan/source/" + name
            for name, item in INPUTS["sources"].items()
        ]
        binary_hash = subprocess.check_output(
            prefix[:-1]
            + ["--entrypoint", "sha256sum", args.image, "/usr/local/bin/qrscan"],
            text=True,
            timeout=30,
        ).split()[0]
        assert binary_hash == INPUTS["platforms"][image["Architecture"]]["binarySha256"]
        build_info = json.loads(
            subprocess.check_output(
                prefix[:-1]
                + [
                    "--entrypoint",
                    "cat",
                    args.image,
                    "/usr/share/doc/qrscan/build-info.json",
                ],
                text=True,
                timeout=30,
            )
        )
        assert build_info["binary"]["sha256"] == binary_hash
        assert build_info["source"]["commit"] == INPUTS["engineSource"]
        assert build_info["source"]["dirty"] is False
        assert (
            build_info["target"] == INPUTS["platforms"][image["Architecture"]]["target"]
        )
        assert build_info["version"] == "0.11.0"
    recipe = Path(__file__).with_name("Dockerfile").read_text()
    base_images = re.findall(r"^FROM (\S+)", recipe, re.MULTILINE)
    assert base_images == [INPUTS["baseImage"]]
    receipt = {
        "image": args.image,
        "image_id": image["Id"],
        "platform": actual_platform,
        "expected_platform": args.expected_platform,
        "host": platform.platform(),
        "source": image["Config"]["Labels"]["org.opencontainers.image.revision"],
        "packaging_revision": args.packaging_revision,
        "cases": cases,
        "execution": execution,
        "native_linux_host_required": args.native,
        "daemon_architecture": daemon_arch,
        "truth_profiles": truth_profiles,
        "truth_sha256": hashlib.sha256(
            (ROOT / "fixtures/consumer-truth.json").read_bytes()
        ).hexdigest(),
        "base_images": base_images,
        "source_archive_checksums": source_hashes.splitlines(),
        "binary_sha256": binary_hash,
        "runtime_permissions": "nonroot/read-only/no-network/no-capabilities",
        "result": "PASS",
    }
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
