#!/usr/bin/env python3
"""Publish the frozen, previously executed OCI artifacts without rebuilding them.

Only the named GHCR image and the qualified 0.11.0 BOM are accepted. Registry
errors other than an explicit 404 stop publication; an existing tag is skipped
only after its config and every decompressed layer match the qualified bytes.
"""

import argparse
import contextlib
import copy
import gzip
import hashlib
import importlib.util
import io
import json
import os
import platform
import subprocess
import tarfile
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zlib
from pathlib import Path, PurePosixPath
from unittest import mock

import tomllib

ROOT = Path(__file__).resolve().parents[3]
BOM_PATH = Path(__file__).with_name("release-0.11.0.json")
BOM_SHA256 = "582168e1df6c03d672f890ee656ccd32773995192eef76eb57a9052ca795aaa9"
OCI_INDEX = "application/vnd.oci.image.index.v1+json"
OCI_MANIFEST = "application/vnd.oci.image.manifest.v1+json"
DOCKER_MANIFEST = "application/vnd.docker.distribution.manifest.v2+json"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(data):
    return "sha256:" + hashlib.sha256(data).hexdigest()


def load_bom(path=BOM_PATH):
    data = path.read_bytes()
    require(
        hashlib.sha256(data).hexdigest() == BOM_SHA256, "frozen BOM digest mismatch"
    )
    bom = json.loads(data)
    require(
        bom["schema"] == 1 and bom["version"] == "0.11.0", "unsupported OCI release"
    )
    require(bom["tag"] == "oci-v0.11.0", "OCI tag mismatch")
    require(
        bom["engine_source"] == "176ac96ef16ee330dbfc6ada10327d0b4e23a8b2",
        "engine source mismatch",
    )
    require(
        bom["producer_source"] == "1c015523547226f14cc7abc1931bb074786c32dc",
        "producer source mismatch",
    )
    require(bom["producer_run"] == 42063666939, "producer run mismatch")
    require(
        bom["image"] == "ghcr.io/qrcode-ai-com/qrcode-barcode-scanner",
        "image destination mismatch",
    )
    require(set(bom["artifacts"]) == {"amd64", "arm64"}, "platform set mismatch")
    require(
        len(bom["annotations"]["org.opencontainers.image.description"]) <= 512,
        "description too long",
    )
    require(
        bom["repository"] == "qrcode-ai-com/qrcode-barcode-scanner",
        "repository destination mismatch",
    )
    require(
        bom["image_packaging_revision"] == "1c015523547226f14cc7abc1931bb074786c32dc",
        "image packaging revision mismatch",
    )
    source_files = (
        ".github/workflows/distribution-checks.yml",
        "distribution/docker/v0.11/Dockerfile",
        "distribution/docker/v0.11/README.md",
        "distribution/docker/v0.11/SOURCE.md",
        "distribution/docker/v0.11/inputs.json",
        "distribution/docker/v0.11/prepare.py",
        "distribution/docker/v0.11/record.py",
        "distribution/docker/v0.11/verify.py",
        "fixtures/consumer-truth.json",
        "scripts/consumer_truth.py",
    )
    require(
        set(bom["source_file_sha256"]) == set(source_files),
        "frozen producer file set mismatch",
    )
    for name in source_files:
        require(
            hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
            == bom["source_file_sha256"][name],
            "frozen image recipe/consumer source drift: " + name,
        )
    return bom


def gate(ref, bom, root=ROOT):
    workspace = tomllib.loads((root / "Cargo.toml").read_text())["workspace"][
        "package"
    ]["version"]
    require(
        ref == "refs/tags/" + bom["tag"],
        "only the exact frozen OCI release tag may publish",
    )
    require(workspace == bom["version"], "workspace/BOM version mismatch")
    require(
        os.environ.get("GITHUB_REPOSITORY", bom["repository"]) == bom["repository"],
        "repository mismatch",
    )


def command(arguments):
    return subprocess.check_output(arguments, text=True, timeout=600)


def loaded_identity(bom, architecture, reference="qrscan:qualified"):
    """Check the config digest even when containerd exposes an OCI index as Id."""
    expected = bom["artifacts"][architecture]
    image = json.loads(command(["docker", "image", "inspect", reference]))[0]
    require(
        image["Os"] == "linux" and image["Architecture"] == architecture,
        "loaded platform mismatch",
    )
    require(
        image["RootFS"]["Layers"]
        == [layer["digest"] for layer in expected["raw_layers"]],
        "loaded raw layers mismatch",
    )
    exported = subprocess.check_output(["docker", "save", reference], timeout=600)
    spec = importlib.util.spec_from_file_location(
        "qrscan_oci_record", Path(__file__).with_name("record.py")
    )
    recorder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recorder)
    with tarfile.open(fileobj=io.BytesIO(exported)) as archive:
        manifests = json.loads(archive.extractfile("manifest.json").read())
        require(len(manifests) == 1, "loaded export must contain one platform image")
        config = archive.extractfile(manifests[0]["Config"]).read()
        require(
            recorder.config_identity(archive, image, config) == expected["image_id"],
            "loaded config digest mismatch",
        )
        require(len(config) == expected["config_size"], "loaded config size mismatch")
    image["VerifiedConfigDigest"] = expected["image_id"]
    return image


def native_host(architecture):
    aliases = {
        "x86_64": "amd64",
        "amd64": "amd64",
        "aarch64": "arm64",
        "arm64": "arm64",
    }
    require(
        platform.system() == "Linux"
        and aliases.get(platform.machine()) == architecture,
        "runner is not native Linux for this architecture",
    )
    engine = command(["docker", "info", "--format", "{{.Architecture}}"]).strip()
    require(
        aliases.get(engine) == architecture,
        "Docker daemon is not native for this architecture",
    )


def inspect_artifact(bom, artifacts, architecture, load=False):
    expected = bom["artifacts"][architecture]
    directory = artifacts / architecture
    require(
        directory.is_dir() and not directory.is_symlink(), "missing artifact directory"
    )
    require(
        {p.name for p in directory.iterdir()} == set(expected["files"]),
        "artifact file set mismatch",
    )
    for name, digest in expected["files"].items():
        path = directory / name
        require(
            path.is_file() and not path.is_symlink(), "artifact must be a regular file"
        )
        require(
            hashlib.sha256(path.read_bytes()).hexdigest() == digest,
            "artifact file digest mismatch: " + name,
        )
    archive = directory / "image.tar.gz"
    with tarfile.open(archive) as tar:
        names = set()
        for member in tar.getmembers():
            path = PurePosixPath(member.name)
            require(
                not path.is_absolute()
                and ".." not in path.parts
                and member.name not in names,
                "unsafe image archive member",
            )
            require(
                member.isfile() or member.isdir(),
                "image archive contains a link or special member",
            )
            names.add(member.name)
            if member.isfile() and member.name.startswith("blobs/sha256/"):
                require(
                    sha256(tar.extractfile(member).read()) == "sha256:" + path.name,
                    "image blob digest mismatch",
                )
        manifests = json.loads(tar.extractfile("manifest.json").read())
        require(len(manifests) == 1, "image archive must contain one image")
        manifest = manifests[0]
        require(
            manifest["RepoTags"] == ["qrscan:qualified"], "archive image tag mismatch"
        )
        config = tar.extractfile(manifest["Config"]).read()
        require(
            sha256(config) == expected["image_id"]
            and len(config) == expected["config_size"],
            "archive config mismatch",
        )
        image = json.loads(config)
        require(
            image["os"] == "linux" and image["architecture"] == architecture,
            "archive platform mismatch",
        )
        require(
            image["rootfs"]["diff_ids"]
            == [layer["digest"] for layer in expected["raw_layers"]],
            "config raw layer mismatch",
        )
        require(
            len(manifest["Layers"]) == len(expected["raw_layers"]),
            "archive layer count mismatch",
        )
        for path, layer in zip(manifest["Layers"], expected["raw_layers"], strict=True):
            data = tar.extractfile(path).read()
            if data.startswith(b"\x1f\x8b"):
                data = gzip.decompress(data)
            require(
                sha256(data) == layer["digest"] and len(data) == layer["size"],
                "archive raw layer mismatch",
            )
        for key, value in bom["annotations"].items():
            require(
                image["config"]["Labels"][key] == value,
                "archive label mismatch: " + key,
            )
        require(
            image["config"]["Labels"]["io.qrcode-ai.scanner.packaging-revision"]
            == bom["image_packaging_revision"],
            "packaging label mismatch",
        )
        require(
            image["config"]["User"] == "65532:65532"
            and image["config"]["Entrypoint"] == ["/usr/local/bin/qrscan"],
            "runtime config mismatch",
        )
    original = json.loads((directory / "consumer.json").read_text())
    require(
        original["result"] == "PASS" and original["image_id"] == expected["image_id"],
        "qualified execution receipt mismatch",
    )
    require(
        original["binary_sha256"] == expected["binary_sha256"],
        "qualified binary mismatch",
    )
    if load:
        command(["docker", "load", "--input", str(archive)])
        loaded_identity(bom, architecture)
        command(
            ["docker", "tag", "qrscan:qualified", "qrscan:qualified-" + architecture]
        )
    return {
        "architecture": architecture,
        "image_id": expected["image_id"],
        "archive_sha256": expected["archive_sha256"],
        "result": "PASS",
    }


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    """Registry blob URLs may redirect; never forward a bearer to another host."""

    def redirect_request(self, request, fp, code, message, headers, url):
        destination = urllib.parse.urlparse(url)
        require(
            destination.scheme == "https"
            and destination.username is None
            and destination.password is None,
            "unsafe registry redirect",
        )
        redirected = super().redirect_request(request, fp, code, message, headers, url)
        if destination.hostname != urllib.parse.urlparse(request.full_url).hostname:
            redirected.remove_header("Authorization")
        return redirected


class Registry:
    def __init__(self, bom, authenticated=True):
        self.opener = urllib.request.build_opener(SafeRedirect())
        self.name = bom["image"].removeprefix("ghcr.io/")
        self.base = "https://ghcr.io/v2/" + self.name
        scope = "repository:" + self.name + (":pull,push" if authenticated else ":pull")
        url = "https://ghcr.io/token?" + urllib.parse.urlencode(
            {"service": "ghcr.io", "scope": scope}
        )
        headers = {}
        if authenticated:
            import base64

            token = os.environ["GHCR_TOKEN"]
            credential = os.environ["GITHUB_ACTOR"] + ":" + token
            headers["Authorization"] = (
                "Basic " + base64.b64encode(credential.encode()).decode()
            )
        try:
            with self.opener.open(
                urllib.request.Request(url, headers=headers), timeout=60
            ) as response:
                self.token = json.load(response)["token"]
        except urllib.error.HTTPError as error:
            raise ValueError(
                "GHCR token exchange failed: HTTP " + str(error.code)
            ) from None

    def request(self, path, data=None, media_type=None, missing=False):
        headers = {
            "Authorization": "Bearer " + self.token,
            "Accept": f"{OCI_INDEX}, {OCI_MANIFEST}, {DOCKER_MANIFEST}",
        }
        if media_type:
            headers["Content-Type"] = media_type
        request = urllib.request.Request(
            self.base + path,
            data=data,
            headers=headers,
            method="PUT" if data is not None else "GET",
        )
        try:
            return self.opener.open(request, timeout=120)
        except urllib.error.HTTPError as error:
            if missing and error.code == 404:
                return None
            raise ValueError(
                "GHCR request failed: HTTP " + str(error.code) + " " + path
            ) from None

    def manifest(self, tag, missing=False):
        response = self.request("/manifests/" + tag, missing=missing)
        if response is None:
            return None
        with response:
            data = response.read()
            digest = sha256(data)
            require(
                response.headers.get("Docker-Content-Digest") == digest,
                "remote manifest digest mismatch",
            )
            return {"digest": digest, "size": len(data), "document": json.loads(data)}

    def verify_architecture(self, tag, expected, architecture, missing=False):
        manifest = self.manifest(tag, missing=missing)
        if manifest is None:
            return None
        document = manifest["document"]
        require(
            document.get("schemaVersion") == 2
            and document.get("mediaType") in (OCI_MANIFEST, DOCKER_MANIFEST),
            "expected a single image manifest",
        )
        config = document["config"]
        config_media = {
            OCI_MANIFEST: "application/vnd.oci.image.config.v1+json",
            DOCKER_MANIFEST: "application/vnd.docker.container.image.v1+json",
        }
        require(
            config.get("mediaType") == config_media[document["mediaType"]],
            "unsupported registry config media type",
        )
        require(
            config["digest"] == expected["image_id"]
            and config["size"] == expected["config_size"],
            "existing registry config mismatch",
        )
        with self.request("/blobs/" + config["digest"]) as response:
            data = response.read(config["size"] + 1)
        require(
            sha256(data) == config["digest"] and len(data) == config["size"],
            "remote config blob mismatch",
        )
        decoded = json.loads(data)
        require(
            decoded["os"] == "linux" and decoded["architecture"] == architecture,
            "remote platform mismatch",
        )
        require(
            decoded["rootfs"]["diff_ids"]
            == [layer["digest"] for layer in expected["raw_layers"]],
            "remote diff IDs mismatch",
        )
        require(
            len(document["layers"]) == len(expected["raw_layers"]),
            "remote layer count mismatch",
        )
        for descriptor, raw in zip(
            document["layers"], expected["raw_layers"], strict=True
        ):
            require(
                0 < descriptor["size"] <= raw["size"] + 1024 * 1024,
                "registry layer size exceeds frozen resource bound",
            )
            compressed = hashlib.sha256()
            uncompressed = hashlib.sha256()
            size = raw_size = 0
            media = descriptor["mediaType"]
            allowed_layers = {
                OCI_MANIFEST: (
                    "application/vnd.oci.image.layer.v1.tar+gzip",
                    "application/vnd.oci.image.layer.v1.tar",
                ),
                DOCKER_MANIFEST: ("application/vnd.docker.image.rootfs.diff.tar.gzip",),
            }
            require(
                media in allowed_layers[document["mediaType"]],
                "unsupported registry layer compression/media family",
            )
            decompressor = (
                zlib.decompressobj(16 + zlib.MAX_WBITS)
                if media.endswith("gzip")
                else None
            )
            with self.request("/blobs/" + descriptor["digest"]) as response:
                while chunk := response.read(1024 * 1024):
                    compressed.update(chunk)
                    size += len(chunk)
                    require(
                        size <= descriptor["size"],
                        "registry blob exceeds its descriptor size",
                    )
                    output = (
                        decompressor.decompress(chunk, raw["size"] - raw_size + 1)
                        if decompressor
                        else chunk
                    )
                    uncompressed.update(output)
                    raw_size += len(output)
                    require(
                        raw_size <= raw["size"],
                        "decompressed layer exceeds frozen resource bound",
                    )
                    if decompressor:
                        require(
                            not decompressor.unconsumed_tail,
                            "compressed layer exceeds frozen output bound",
                        )
                if decompressor:
                    output = decompressor.flush()
                    uncompressed.update(output)
                    raw_size += len(output)
                    require(
                        decompressor.eof and not decompressor.unused_data,
                        "invalid compressed layer stream",
                    )
            require(
                "sha256:" + compressed.hexdigest() == descriptor["digest"]
                and size == descriptor["size"],
                "remote compressed layer mismatch",
            )
            require(
                "sha256:" + uncompressed.hexdigest() == raw["digest"]
                and raw_size == raw["size"],
                "remote raw layer mismatch",
            )
        return {
            "mediaType": document["mediaType"],
            "digest": manifest["digest"],
            "size": manifest["size"],
            "platform": {"os": "linux", "architecture": architecture},
        }


def image_index(bom, descriptors):
    return {
        "schemaVersion": 2,
        "mediaType": OCI_INDEX,
        "manifests": descriptors,
        "annotations": bom["annotations"],
    }


def verify_index(registry, bom, existing):
    """Reject a differing index before uploading anything, including extra keys."""
    document = existing["document"]
    require(
        set(document) == {"schemaVersion", "mediaType", "manifests", "annotations"},
        "existing OCI index shape differs",
    )
    require(
        document["schemaVersion"] == 2
        and document["mediaType"] == OCI_INDEX
        and document["annotations"] == bom["annotations"],
        "existing OCI index metadata differs",
    )
    children = document["manifests"]
    require(
        isinstance(children, list) and len(children) == 2,
        "existing index platform count differs",
    )
    verified = []
    for architecture, child in zip(("amd64", "arm64"), children, strict=True):
        require(
            child.get("platform") == {"os": "linux", "architecture": architecture},
            "existing index platform order/shape differs",
        )
        descriptor = registry.verify_architecture(
            child["digest"], bom["artifacts"][architecture], architecture
        )
        require(descriptor == child, "existing index child differs")
        verified.append(descriptor)
    require(document == image_index(bom, verified), "existing OCI index differs")
    return verified


def save_publication(receipt, result):
    receipt.parent.mkdir(parents=True, exist_ok=True)
    receipt.write_text(json.dumps(result, indent=2) + "\n")


def publish(bom, artifacts, receipt):
    gate(os.environ["GITHUB_REF"], bom)
    # A known bad second artifact or alias must stop before a first upload.
    for architecture in ("amd64", "arm64"):
        inspect_artifact(bom, artifacts, architecture, load=True)
    registry = Registry(bom)
    result = {
        "result": "FAIL",
        "image": bom["image"],
        "version": bom["version"],
        "engine_source": bom["engine_source"],
        "producer_source": bom["producer_source"],
        "producer_run": bom["producer_run"],
        "annotations": bom["annotations"],
        "upload_attempts": [],
        "platforms": [],
    }
    try:
        existing = registry.manifest(bom["version"], missing=True)
        if existing is not None:
            result["platforms"] = verify_index(registry, bom, existing)
            result.update(
                {
                    "result": "PASS",
                    "index_digest": existing["digest"],
                    "operation": "verified-existing-index-no-writes",
                }
            )
            save_publication(receipt, result)
            print(json.dumps(result, indent=2))
            return
        preflight = {}
        for architecture in ("amd64", "arm64"):
            preflight[architecture] = registry.verify_architecture(
                bom["version"] + "-" + architecture,
                bom["artifacts"][architecture],
                architecture,
                missing=True,
            )
        for architecture in ("amd64", "arm64"):
            expected = bom["artifacts"][architecture]
            tag = bom["version"] + "-" + architecture
            remote = preflight[architecture]
            if remote is None:
                target = bom["image"] + ":" + tag
                loaded_identity(bom, architecture, "qrscan:qualified-" + architecture)
                command(["docker", "tag", "qrscan:qualified-" + architecture, target])
                result["upload_attempts"].append({"tag": tag, "status": "attempted"})
                save_publication(receipt, result)
                print(
                    command(
                        [
                            "docker",
                            "push",
                            "--platform",
                            "linux/" + architecture,
                            target,
                        ]
                    )
                )
                remote = registry.verify_architecture(tag, expected, architecture)
                result["upload_attempts"][-1]["status"] = "verified"
            result["platforms"].append(remote)
            save_publication(receipt, result)
        index = image_index(bom, result["platforms"])
        data = json.dumps(index, sort_keys=True, separators=(",", ":")).encode()
        # Outside writers can race preflight. Detect an intervening version tag
        # before the PUT, but do not claim registry-wide atomicity or rollback.
        intervening = registry.manifest(bom["version"], missing=True)
        if intervening is not None:
            require(
                intervening["document"] == index,
                "version tag appeared during publication and differs",
            )
            verify_index(registry, bom, intervening)
        else:
            result["index_upload_attempted"] = True
            save_publication(receipt, result)
            with registry.request(
                "/manifests/" + bom["version"], data=data, media_type=OCI_INDEX
            ) as response:
                require(
                    response.headers.get("Docker-Content-Digest") == sha256(data),
                    "uploaded index digest mismatch",
                )
        actual = registry.manifest(bom["version"])
        require(actual["document"] == index, "published OCI index readback mismatch")
        result.update(
            {
                "result": "PASS",
                "index_digest": actual["digest"],
                "operation": "completed-frozen-index",
            }
        )
        save_publication(receipt, result)
        print(json.dumps(result, indent=2))
    except Exception as error:
        result.update(
            {
                "result": "FAIL",
                "error_type": type(error).__name__,
                "limitation": "Uploads already accepted by GHCR are not rolled back; attempted and verified uploads are distinct.",
            }
        )
        save_publication(receipt, result)
        raise


def record_consumer(bom, architecture, receipt, reference="qrscan:qualified"):
    result = json.loads(receipt.read_text())
    expected = bom["artifacts"][architecture]
    loaded = loaded_identity(bom, architecture, reference)
    require(
        result["result"] == "PASS" and result["image_id"] == loaded["Id"],
        "consumer image identity mismatch",
    )
    result["image_config_digest"] = loaded["VerifiedConfigDigest"]
    require(
        result["source"] == bom["engine_source"]
        and result["binary_sha256"] == expected["binary_sha256"],
        "consumer source/binary mismatch",
    )
    require(result["platform"] == "linux/" + architecture, "consumer platform mismatch")
    require(
        [case["exit"] for case in result["cases"]] == expected["consumer_case_exits"],
        "consumer case exits mismatch",
    )
    require(
        result["truth_profiles"] == expected["truth_profiles"],
        "consumer truth/profile set mismatch",
    )
    require(
        result["native_linux_host_required"] is True
        and result["execution"] == "native-daemon",
        "consumer was not native Linux",
    )
    require(
        result["packaging_revision"] == bom["image_packaging_revision"],
        "consumer packaging identity mismatch",
    )
    result["execution_revision"] = os.environ.get("GITHUB_SHA")
    result["image_packaging_revision"] = bom["image_packaging_revision"]
    result["producer_source"] = bom["producer_source"]
    result["producer_run"] = bom["producer_run"]
    receipt.write_text(json.dumps(result, indent=2) + "\n")
    return result


def public_pull(bom, architecture, receipt):
    native_host(architecture)
    registry = Registry(bom, authenticated=False)
    index = registry.manifest(bom["version"])
    require(
        index["document"].get("mediaType") == OCI_INDEX
        and index["document"]["annotations"] == bom["annotations"],
        "public OCI index mismatch",
    )
    platforms = index["document"]["manifests"]
    require(
        sorted(
            (item["platform"]["os"], item["platform"]["architecture"])
            for item in platforms
        )
        == [("linux", "amd64"), ("linux", "arm64")],
        "public platform set mismatch",
    )
    descriptor = next(
        item for item in platforms if item["platform"]["architecture"] == architecture
    )
    verified = registry.verify_architecture(
        descriptor["digest"], bom["artifacts"][architecture], architecture
    )
    require(verified == descriptor, "public child descriptor mismatch")
    image = bom["image"] + "@" + index["digest"]
    print(command(["docker", "pull", "--platform", "linux/" + architecture, image]))
    loaded_identity(bom, architecture, image)
    command(
        [
            "python3",
            str(Path(__file__).with_name("verify.py")),
            image,
            str(ROOT / "fixtures/clean/gen_v5_q.png"),
            "--expected-platform",
            "linux/" + architecture,
            "--packaging-revision",
            bom["image_packaging_revision"],
            "--native",
            "--receipt",
            str(receipt),
        ]
    )
    result = record_consumer(bom, architecture, receipt, reference=image)
    result.update(
        {
            "public_index_digest": index["digest"],
            "public_manifest_digest": descriptor["digest"],
            "anonymous_pull": True,
        }
    )
    receipt.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


def self_test():
    bom = load_bom()
    scenarios = 0
    with tempfile.TemporaryDirectory(prefix="qrscan-oci-policy-") as directory:
        root = Path(directory)
        (root / "Cargo.toml").write_text('[workspace.package]\nversion = "0.11.0"\n')
        gate("refs/tags/oci-v0.11.0", bom, root)
        scenarios += 1
        for bad in (
            "refs/heads/main",
            "refs/tags/v0.11.0",
            "refs/tags/oci-v0.11.1",
            "refs/tags/oci-v0.11.0-extra",
        ):
            try:
                gate(bad, bom, root)
            except ValueError:
                scenarios += 1
            else:
                raise ValueError("bad OCI ref accepted: " + bad)
        (root / "Cargo.toml").write_text('[workspace.package]\nversion = "0.11.1"\n')
        try:
            gate("refs/tags/oci-v0.11.0", bom, root)
        except ValueError:
            scenarios += 1
        else:
            raise ValueError("workspace/BOM drift accepted")
        for key, value in (
            ("version", "0.11.1"),
            ("producer_run", 1),
            ("engine_source", "0" * 40),
        ):
            bad = copy.deepcopy(bom)
            bad[key] = value
            altered = root / "bom.json"
            altered.write_text(json.dumps(bad))
            try:
                load_bom(altered)
            except ValueError:
                scenarios += 1
            else:
                raise ValueError("mutated BOM accepted: " + key)
    with tempfile.TemporaryDirectory(prefix="qrscan-oci-consumer-policy-") as directory:
        expected = bom["artifacts"]["amd64"]
        valid = {
            "result": "PASS",
            "image_id": expected["image_id"],
            "source": bom["engine_source"],
            "binary_sha256": expected["binary_sha256"],
            "platform": "linux/amd64",
            "cases": [{"exit": code} for code in expected["consumer_case_exits"]],
            "truth_profiles": expected["truth_profiles"],
            "native_linux_host_required": True,
            "execution": "native-daemon",
            "packaging_revision": bom["image_packaging_revision"],
        }
        receipt = Path(directory) / "consumer.json"
        receipt.write_text(json.dumps(valid))
        with mock.patch.dict(
            globals(),
            {
                "loaded_identity": lambda *_: {
                    "Id": expected["image_id"],
                    "VerifiedConfigDigest": expected["image_id"],
                }
            },
        ):
            record_consumer(bom, "amd64", receipt)
        scenarios += 1
        for key, value in [
            ("cases", []),
            ("truth_profiles", []),
            ("native_linux_host_required", False),
            ("execution", "emulated"),
            ("packaging_revision", "0" * 40),
            ("image_id", "sha256:" + "0" * 64),
            ("binary_sha256", "0" * 64),
        ]:
            receipt.write_text(json.dumps(valid | {key: value}))
            try:
                with mock.patch.dict(
                    globals(),
                    {
                        "loaded_identity": lambda *_: {
                            "Id": expected["image_id"],
                            "VerifiedConfigDigest": expected["image_id"],
                        }
                    },
                ):
                    record_consumer(bom, "amd64", receipt)
            except ValueError:
                scenarios += 1
            else:
                raise ValueError("mutated native consumer accepted: " + key)
    request = urllib.request.Request(
        "https://ghcr.io/v2/test/blobs/x", headers={"Authorization": "Bearer synthetic"}
    )
    redirected = SafeRedirect().redirect_request(
        request,
        None,
        302,
        "Found",
        {},
        "https://pkg-containers.githubusercontent.com/blob",
    )
    require(
        not redirected.has_header("Authorization"),
        "registry credential leaked across redirect",
    )
    scenarios += 1
    try:
        SafeRedirect().redirect_request(
            request, None, 302, "Found", {}, "http://example.com/blob"
        )
    except ValueError:
        scenarios += 1
    else:
        raise ValueError("insecure registry redirect accepted")
    raw = b"qualified raw layer"
    compressed = gzip.compress(raw, mtime=0)
    config_data = json.dumps(
        {"os": "linux", "architecture": "amd64", "rootfs": {"diff_ids": [sha256(raw)]}}
    ).encode()
    expected = {
        "image_id": sha256(config_data),
        "config_size": len(config_data),
        "raw_layers": [{"digest": sha256(raw), "size": len(raw)}],
    }
    document = {
        "schemaVersion": 2,
        "mediaType": OCI_MANIFEST,
        "config": {
            "digest": expected["image_id"],
            "size": len(config_data),
            "mediaType": "application/vnd.oci.image.config.v1+json",
        },
        "layers": [
            {
                "digest": sha256(compressed),
                "size": len(compressed),
                "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
            }
        ],
    }

    class FrozenRegistry(Registry):
        def __init__(self):
            self.document = copy.deepcopy(document)
            self.blobs = {
                sha256(config_data): config_data,
                sha256(compressed): compressed,
            }

        def manifest(self, tag, missing=False):
            data = json.dumps(self.document).encode()
            return {
                "digest": sha256(data),
                "size": len(data),
                "document": self.document,
            }

        def request(self, path, **kwargs):
            return io.BytesIO(self.blobs[path.removeprefix("/blobs/")])

    registry = FrozenRegistry()
    registry.verify_architecture("synthetic", expected, "amd64")
    scenarios += 1
    docker_registry = FrozenRegistry()
    docker_registry.document["mediaType"] = DOCKER_MANIFEST
    docker_registry.document["config"]["mediaType"] = (
        "application/vnd.docker.container.image.v1+json"
    )
    docker_registry.document["layers"][0]["mediaType"] = (
        "application/vnd.docker.image.rootfs.diff.tar.gzip"
    )
    docker_registry.verify_architecture("synthetic", expected, "amd64")
    scenarios += 1
    for mutation in (
        "config",
        "config-media",
        "config-media-family",
        "layer-media-family",
        "raw-layer",
        "compressed-layer",
        "layer-size",
        "layer-count",
        "platform",
    ):
        registry = FrozenRegistry()
        altered = copy.deepcopy(expected)
        if mutation == "config":
            altered["image_id"] = "sha256:" + "0" * 64
        elif mutation == "config-media":
            registry.document["config"]["mediaType"] = (
                "application/x-not-an-image-config"
            )
        elif mutation == "config-media-family":
            registry.document["mediaType"] = DOCKER_MANIFEST
        elif mutation == "layer-media-family":
            registry.document["layers"][0]["mediaType"] = (
                "application/vnd.docker.image.rootfs.diff.tar.gzip"
            )
        elif mutation == "raw-layer":
            altered["raw_layers"][0]["digest"] = "sha256:" + "0" * 64
        elif mutation == "compressed-layer":
            registry.blobs[sha256(compressed)] = gzip.compress(b"wrong layer", mtime=0)
        elif mutation == "layer-size":
            registry.document["layers"][0]["size"] += 1
        elif mutation == "layer-count":
            registry.document["layers"] = []
        try:
            registry.verify_architecture(
                "synthetic", altered, "arm64" if mutation == "platform" else "amd64"
            )
        except ValueError:
            scenarios += 1
        else:
            raise ValueError("registry mismatch accepted: " + mutation)

    # Reproduce publication ordering without a Docker daemon or registry writes.
    def publication_scenario(scenario):
        events = []
        descriptors = [
            {
                "mediaType": OCI_MANIFEST,
                "digest": "sha256:" + digit * 64,
                "size": 512,
                "platform": {"os": "linux", "architecture": architecture},
            }
            for architecture, digit in (("amd64", "a"), ("arm64", "b"))
        ]

        class PublicationRegistry:
            def __init__(self, unused):
                self.uploaded = set()
                self.index = None
                if scenario in ("existing", "extra-index-key", "extra-child-key"):
                    self.index = copy.deepcopy(image_index(bom, descriptors))
                    if scenario == "extra-index-key":
                        self.index["artifactType"] = "unexpected/type"
                    elif scenario == "extra-child-key":
                        self.index["manifests"][1]["artifactType"] = "unexpected/type"

            def manifest(self, tag, missing=False):
                events.append(("manifest", tag))
                if self.index is None:
                    return None
                data = json.dumps(self.index).encode()
                return {
                    "document": self.index,
                    "digest": sha256(data),
                    "size": len(data),
                }

            def verify_architecture(self, tag, expected, architecture, missing=False):
                events.append(("verify", tag))
                if scenario == "conflicting-arm-alias" and tag == "0.11.0-arm64":
                    raise ValueError("synthetic known ARM alias mismatch")
                if (
                    tag.startswith("sha256:")
                    or scenario == "existing-aliases"
                    or architecture in self.uploaded
                ):
                    return copy.deepcopy(
                        descriptors[("amd64", "arm64").index(architecture)]
                    )
                return None

            def request(self, path, data=None, media_type=None, **kwargs):
                events.append(("put-index", path))
                self.index = json.loads(data)
                response = io.BytesIO(b"")
                response.headers = {"Docker-Content-Digest": sha256(data)}
                return response

        holder = []

        def factory(unused):
            registry = PublicationRegistry(bom)
            holder.append(registry)
            return registry

        def fake_command(arguments):
            events.append(tuple(arguments))
            if arguments[:2] == ["docker", "push"]:
                architecture = arguments[-1].rsplit("-", 1)[1]
                if scenario == "partial-upload-failure" and architecture == "arm64":
                    raise subprocess.CalledProcessError(1, arguments)
                holder[0].uploaded.add(architecture)
            return ""

        def fake_inspect(unused_bom, unused_artifacts, architecture, load=False):
            events.append(("inspect", architecture, load))

        with tempfile.TemporaryDirectory(prefix="qrscan-oci-order-") as directory:
            receipt = Path(directory) / "result.json"
            failed = False
            with (
                mock.patch.dict(
                    globals(),
                    {
                        "Registry": factory,
                        "command": fake_command,
                        "inspect_artifact": fake_inspect,
                        "loaded_identity": lambda *unused: None,
                    },
                ),
                mock.patch.dict(os.environ, {"GITHUB_REF": "refs/tags/oci-v0.11.0"}),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                try:
                    publish(bom, Path(directory), receipt)
                except (ValueError, subprocess.CalledProcessError):
                    failed = True
            pushes = [event for event in events if event[:2] == ("docker", "push")]
            index_writes = [event for event in events if event[0] == "put-index"]
            actual = json.loads(receipt.read_text())
            if scenario in (
                "extra-index-key",
                "extra-child-key",
                "conflicting-arm-alias",
            ):
                require(
                    failed
                    and actual["result"] == "FAIL"
                    and not pushes
                    and not index_writes,
                    "known mismatch caused registry mutation: " + scenario,
                )
            elif scenario == "existing":
                require(
                    not failed
                    and actual["result"] == "PASS"
                    and not pushes
                    and not index_writes,
                    "existing qualified version performed writes",
                )
            elif scenario == "existing-aliases":
                require(
                    not failed
                    and actual["result"] == "PASS"
                    and not pushes
                    and len(index_writes) == 1,
                    "existing qualified aliases were reuploaded",
                )
            elif scenario == "fresh":
                require(
                    not failed
                    and actual["result"] == "PASS"
                    and len(pushes) == 2
                    and len(index_writes) == 1,
                    "fresh upload sequence differs",
                )
                first_push = events.index(pushes[0])
                require(
                    events.index(("verify", "0.11.0-amd64")) < first_push
                    and events.index(("verify", "0.11.0-arm64")) < first_push,
                    "both aliases must be checked before first push",
                )
            else:
                require(
                    failed and actual["result"] == "FAIL" and not index_writes,
                    "partial upload failure lost failure status",
                )
                require(
                    actual["upload_attempts"]
                    == [
                        {"tag": "0.11.0-amd64", "status": "verified"},
                        {"tag": "0.11.0-arm64", "status": "attempted"},
                    ]
                    and len(actual["platforms"]) == 1,
                    "partial accepted/attempted uploads were not retained",
                )
            return 1

    for scenario in (
        "existing",
        "extra-index-key",
        "extra-child-key",
        "conflicting-arm-alias",
        "existing-aliases",
        "fresh",
        "partial-upload-failure",
    ):
        scenarios += publication_scenario(scenario)
    print(f"OCI policy self-test: {scenarios}/{scenarios} scenarios passed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("gate")
    check.add_argument("--ref", required=True)
    inspect = sub.add_parser("inspect")
    inspect.add_argument("--artifacts", type=Path, required=True)
    inspect.add_argument("--architecture", choices=("amd64", "arm64"), required=True)
    inspect.add_argument("--load", action="store_true")
    inspect.add_argument("--native", action="store_true")
    record = sub.add_parser("record-consumer")
    record.add_argument("--architecture", choices=("amd64", "arm64"), required=True)
    record.add_argument("--receipt", type=Path, required=True)
    publish_parser = sub.add_parser("publish")
    publish_parser.add_argument("--artifacts", type=Path, required=True)
    publish_parser.add_argument("--receipt", type=Path, required=True)
    public = sub.add_parser("public-pull")
    public.add_argument("--architecture", choices=("amd64", "arm64"), required=True)
    public.add_argument("--receipt", type=Path, required=True)
    sub.add_parser("self-test")
    args = parser.parse_args()
    bom = load_bom()
    if args.command == "gate":
        gate(args.ref, bom)
    elif args.command == "inspect":
        if args.native:
            require(args.load, "native inspection must reload the image")
            native_host(args.architecture)
        print(
            json.dumps(
                inspect_artifact(bom, args.artifacts, args.architecture, args.load),
                indent=2,
            )
        )
    elif args.command == "record-consumer":
        print(
            json.dumps(record_consumer(bom, args.architecture, args.receipt), indent=2)
        )
    elif args.command == "publish":
        publish(bom, args.artifacts, args.receipt)
    elif args.command == "public-pull":
        public_pull(bom, args.architecture, args.receipt)
    else:
        self_test()


if __name__ == "__main__":
    main()
