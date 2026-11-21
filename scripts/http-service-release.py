#!/usr/bin/env python3
"""Build record, clean consumer, rehearsal and publication of the scanner HTTP service image.

  http-service-release.py gate --ref REF
  http-service-release.py save --tag TAG --architecture ARCH --revision SHA --out DIR
  http-service-release.py consume --images DIR --architecture ARCH --fixture FILE --receipt FILE [--host FILE]
  http-service-release.py verify --images DIR --receipts DIR
  http-service-release.py rehearse --images DIR --receipts DIR --receipt FILE
  http-service-release.py publish --images DIR --receipts DIR --ref REF --receipt FILE
  http-service-release.py --self-test

The image of distribution/http is built by .github/workflows/http-service.yml from the tree that
scripts/stage-http-satellite.py writes, once per architecture, and saved as a tar archive:

  gate      REF is refs/tags/http-vX.Y.Z, X.Y.Z is the version of distribution/http/package.json
            and of server.mjs, and the service pins the engine 0.11.0.
  save      `docker save` of TAG into DIR/qrscan-http-ARCH.tar, with DIR/ARCH.json: the tar's
            sha256, the image config digest read from the tar, the architecture and the commit.
  consume   loads the tar after checking its sha256, checks the image (non-root, labels,
            architecture, health check), runs it fresh with a read-only filesystem, no capability
            and no route out of an internal network, judges it with distribution/http/test/
            consumer.mjs from a second container, proves the service has no outbound access,
            then removes the container, the network and the image and checks they are gone.
            With --host, a profile of scripts/check-http-hosts.py, the service runs as that host
            runs it: the host's PORT and variables, the memory and CPU of its plan.
  verify    every downloaded tar has the sha256 that a passing consumer receipt names.
  rehearse  verify, then publish to a local registry (registry 3.0.0, pinned by digest) exactly as
            the tag does, read the index back and pull it, then remove everything.
  publish   verify, then for each architecture `docker load`, push VERSION-ARCH, check that the
            pushed manifest holds the judged config digest, and push the index VERSION over the
            two; then read the index back. The caller has logged in to ghcr.io.

Exit 0 when the step passes, 1 when it fails, 2 for usage. Stdlib only, Python >= 3.11.
"""
import argparse
import hashlib
import io
import json
import pathlib
import re
import subprocess
import sys
import tarfile
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
SERVICE = ROOT / "distribution/http"
IMAGE = "ghcr.io/qrcode-ai-com/qrcode-barcode-scanner-http"
ENGINE = "0.11.0"
ARCHITECTURES = ("amd64", "arm64")
TAG = re.compile(r"refs/tags/http-v(\d+\.\d+\.\d+)")
HEX = re.compile(r"[0-9a-f]{64}")
COMMIT = re.compile(r"[0-9a-f]{40}")
FIXTURE_SHA256 = "c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8"
# The judge runs in this image, the one the service is built on.
NODE_IMAGE = "node:22.22.2-bookworm-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e"
REGISTRY_IMAGE = "registry:3.0.0@sha256:6c5666b861f3505b116bb9aa9b25175e71210414bd010d92035ff64018f9457e"
LABELS = {
    "org.opencontainers.image.title": "QR Code & Barcode Scanner HTTP service",
    "org.opencontainers.image.licenses": "AGPL-3.0-or-later",
    "org.opencontainers.image.source": "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust",
}


class Refused(Exception):
    """A release step that must not go on."""


def run(*command, capture=True, check=True, stdin=None):
    result = subprocess.run(command, capture_output=capture, text=True, check=False, input=stdin)
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()[-2000:] if capture else ""
        raise Refused(f"`{' '.join(command)}` exited {result.returncode}: {detail}")
    return result


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def service_versions(root=ROOT):
    """(package version, server.mjs SERVICE_VERSION, engine pin of package.json, ENGINE_VERSION)."""
    package = json.loads((root / "distribution/http/package.json").read_text())
    server = (root / "distribution/http/server.mjs").read_text()
    service = re.search(r'export const SERVICE_VERSION = "(\d+\.\d+\.\d+)";', server)
    engine = re.search(r'export const ENGINE_VERSION = "(\d+\.\d+\.\d+)";', server)
    return (package["version"], service and service[1],
            package.get("dependencies", {}).get("@qrcode-ai-com/qrcode-barcode-scanner"), engine and engine[1])


def gate(ref, root=ROOT):
    match = TAG.fullmatch(ref or "")
    if not match:
        raise Refused(f"{ref!r} is not a refs/tags/http-vX.Y.Z tag")
    package, server, pinned, engine = service_versions(root)
    if not match[1] == package == server:
        raise Refused(f"tag {match[1]}, package.json {package}, server.mjs {server}: they must be one version")
    if not pinned == engine == ENGINE:
        raise Refused(f"the service pins engine {pinned} and declares {engine}; this recipe serves {ENGINE}")
    return match[1]


def config_digest(tar_path):
    """The image config digest of a `docker save` archive (classic or OCI layout)."""
    with tarfile.open(tar_path) as archive:
        member = archive.extractfile("manifest.json")
        if member is None:
            raise Refused(f"{tar_path} has no manifest.json")
        manifest = json.load(member)
    if not isinstance(manifest, list) or len(manifest) != 1:
        raise Refused(f"{tar_path} must hold exactly one image")
    config = str(manifest[0].get("Config", ""))
    found = re.search(r"([0-9a-f]{64})(?:\.json)?$", config)
    if not found:
        raise Refused(f"{tar_path}: no config digest in manifest.json ({config!r})")
    return "sha256:" + found[1]


def save(tag, architecture, revision, out):
    if architecture not in ARCHITECTURES or not COMMIT.fullmatch(revision):
        raise Refused("an architecture of amd64 or arm64 and a 40-hex revision are required")
    out = pathlib.Path(out)
    out.mkdir(parents=True, exist_ok=True)
    tar_path = out / f"qrscan-http-{architecture}.tar"
    run("docker", "save", "--output", str(tar_path), tag)
    package, _, _, _ = service_versions()
    record = {"schema": "qrscan-http-image/1", "architecture": architecture, "file": tar_path.name,
              "sha256": sha256(tar_path), "config": config_digest(tar_path), "version": package,
              "engine": ENGINE, "revision": revision}
    (out / f"{architecture}.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record))
    return record


def image_record(images, architecture):
    images = pathlib.Path(images)
    record = json.loads((images / f"{architecture}.json").read_text())
    tar_path = images / record["file"]
    if record.get("schema") != "qrscan-http-image/1" or record.get("architecture") != architecture:
        raise Refused(f"{architecture}.json is not the record of the {architecture} image")
    if sha256(tar_path) != record["sha256"]:
        raise Refused(f"{tar_path.name} does not have the sha256 its record names")
    return record, tar_path


def load(tar_path):
    """`docker load` and the reference it reports."""
    output = run("docker", "load", "--input", str(tar_path)).stdout
    loaded = re.findall(r"Loaded image(?: ID)?: (\S+)", output)
    if len(loaded) != 1:
        raise Refused(f"docker load reported {loaded or 'nothing'}")
    return loaded[0]


def inspect_image(reference, record):
    info = json.loads(run("docker", "image", "inspect", reference).stdout)[0]
    config = info.get("Config") or {}
    labels = config.get("Labels") or {}
    problems = []
    if info.get("Architecture") != record["architecture"] or info.get("Os") != "linux":
        problems.append(f"platform {info.get('Os')}/{info.get('Architecture')}")
    if config.get("User") != "1000:1000":
        problems.append(f"user {config.get('User')!r}, want 1000:1000")
    for key, value in {**LABELS, "org.opencontainers.image.version": record["version"],
                       "org.opencontainers.image.revision": record["revision"]}.items():
        if labels.get(key) != value:
            problems.append(f"label {key} is {labels.get(key)!r}, want {value!r}")
    if not (config.get("Healthcheck") or {}).get("Test"):
        problems.append("no health check")
    if problems:
        raise Refused("the image is not the one the recipe describes: " + "; ".join(problems))


def host_profile(path):
    """The host profile of scripts/check-http-hosts.py, refused unless it is one."""
    profile = json.loads(pathlib.Path(path).read_text())
    env = profile.get("env")
    if profile.get("schema") != "qrscan-http-host/1" or not isinstance(env, dict) or \
            env.get("PORT") != str(profile.get("port")) or \
            not re.fullmatch(r"\d+m", str(profile.get("memory"))) or \
            not re.fullmatch(r"\d+(\.\d+)?", str(profile.get("cpus"))) or \
            any(not re.fullmatch(r"PORT|QRSCAN_HTTP_[A-Z_]+", key) or not re.fullmatch(r"\d+", value)
                for key, value in env.items()):
        raise Refused(f"{path} is not a host profile")
    return profile


def consume(images, architecture, fixture, receipt, host=None):
    record, tar_path = image_record(images, architecture)
    profile = host_profile(host) if host else None
    port = profile["port"] if profile else 8080
    memory = profile["memory"] if profile else "768m"
    settings = [argument for key, value in sorted((profile or {}).get("env", {}).items())
                for argument in ("--env", f"{key}={value}")]
    settings += ["--cpus", profile["cpus"]] if profile else []
    fixture = pathlib.Path(fixture).resolve()
    if sha256(fixture) != FIXTURE_SHA256:
        raise Refused(f"{fixture} is not the mixed fixture")
    reference = load(tar_path)
    inspect_image(reference, record)
    network, name = f"qrscan-http-internal-{architecture}", f"qrscan-http-{architecture}"
    out = pathlib.Path(tempfile.mkdtemp(prefix="qrscan-http-judge-"))
    out.chmod(0o777)
    judged = {}
    try:
        run("docker", "network", "create", "--internal", network)
        run("docker", "run", "--detach", "--name", name, "--network", network, "--read-only",
            "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128",
            "--memory", memory, *settings, "--health-interval", "2s", "--health-start-period", "1s", reference)
        for _ in range(60):
            status = run("docker", "inspect", "--format", "{{.State.Health.Status}}", name).stdout.strip()
            if status == "healthy":
                break
            if status == "unhealthy" or run("docker", "inspect", "--format", "{{.State.Running}}", name).stdout.strip() != "true":
                raise Refused(f"the service is {status}: {run('docker', 'logs', name).stdout[-1500:]}")
            time.sleep(1)
        else:
            raise Refused("the service did not become healthy within 60 seconds")
        consumer = SERVICE / "test/consumer.mjs"
        judge = run("docker", "run", "--rm", "--network", network, "--read-only", "--user", "1000:1000",
                    "--volume", f"{consumer}:/judge/consumer.mjs:ro", "--volume", f"{fixture}:/judge/fixture.png:ro",
                    "--volume", f"{out}:/out", NODE_IMAGE, "node", "/judge/consumer.mjs",
                    f"http://{name}:{port}", "/judge/fixture.png", "--revision", record["revision"],
                    "--receipt", "/out/consumer.json", check=False)
        print(judge.stdout, end="")
        if judge.returncode != 0:
            raise Refused(f"the consumer failed ({judge.returncode}): {judge.stderr.strip()[-1500:]}")
        judged = json.loads((out / "consumer.json").read_text())
        # Scans need no network: the service has no route out of the internal network.
        probe = run("docker", "exec", name, "node", "-e",
                    "fetch('https://example.com/', { signal: AbortSignal.timeout(5000) })"
                    ".then(() => process.exit(1), () => process.exit(0))", check=False)
        if probe.returncode != 0:
            raise Refused("the service container reached the network")
        logs = run("docker", "logs", name)
        lines = [line for line in (logs.stdout + logs.stderr).splitlines() if line.strip()]
        if any("mode=" in line or "STOCK-4827" in line or "qrc-ai.com" in line for line in lines):
            raise Refused("the service log holds a query or a decoded payload")
    finally:
        run("docker", "rm", "--force", name, check=False)
        run("docker", "network", "rm", network, check=False)
        run("docker", "image", "rm", "--force", reference, check=False)
    gone = [what for what, command in (("container", ("docker", "container", "inspect", name)),
                                       ("network", ("docker", "network", "inspect", network)),
                                       ("image", ("docker", "image", "inspect", reference)))
            if run(*command, check=False).returncode == 0]
    if gone:
        raise Refused(f"still present after removal: {', '.join(gone)}")
    result = {"schema": "qrscan-http-consumed/1", "architecture": architecture, "sha256": record["sha256"],
              "config": record["config"], "version": record["version"], "revision": record["revision"],
              "isolation": "read-only root filesystem, no capability, internal network with no route out",
              "removed": True, "passed": bool(judged.get("passed")), "consumer": judged}
    if profile:
        result["host"] = profile
    if not result["passed"]:
        raise Refused("the consumer receipt does not say passed")
    pathlib.Path(receipt).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(receipt).write_text(json.dumps(result, indent=2) + "\n")
    print(f"consumed {architecture}{' as ' + profile['host'] + ' runs it' if profile else ''}: "
          f"{record['sha256']} ({record['config']}), removed")
    return result


def verify(images, receipts):
    judged = {}
    for architecture in ARCHITECTURES:
        record, tar_path = image_record(images, architecture)
        consumed = json.loads((pathlib.Path(receipts) / f"{architecture}.json").read_text())
        if consumed.get("schema") != "qrscan-http-consumed/1" or consumed.get("passed") is not True or \
                consumed.get("removed") is not True:
            raise Refused(f"the {architecture} consumer receipt is not a passing one")
        if "host" in consumed:
            raise Refused(f"the {architecture} receipt judged a host's run, not the image's own")
        for key in ("sha256", "config", "version", "revision"):
            if consumed.get(key) != record[key]:
                raise Refused(f"the {architecture} image is not the one its consumer judged ({key})")
        judged[architecture] = (record, tar_path)
    versions = {record["version"] for record, _ in judged.values()}
    revisions = {record["revision"] for record, _ in judged.values()}
    if len(versions) != 1 or len(revisions) != 1:
        raise Refused("the two images come from different versions or commits")
    print("verified: " + ", ".join(f"{a} {r['sha256']}" for a, (r, _) in judged.items()))
    return judged


def pushed_manifest(reference, insecure):
    flags = ["--insecure"] if insecure else []
    return json.loads(run("docker", "manifest", "inspect", *flags, reference).stdout)


def publish(images, receipts, image, version, receipt, insecure=False):
    judged = verify(images, receipts)
    if any(record["version"] != version for record, _ in judged.values()):
        raise Refused(f"the judged images are version {judged['amd64'][0]['version']}, not {version}")
    pushed = {}
    for architecture, (record, tar_path) in judged.items():
        reference = load(tar_path)
        target = f"{image}:{version}-{architecture}"
        run("docker", "tag", reference, target)
        output = run("docker", "push", target).stdout
        digest = re.findall(r"digest: (sha256:[0-9a-f]{64})", output)
        if not digest:
            # Some Docker versions print no digest line: the registry digest is then a RepoDigest.
            known = json.loads(run("docker", "image", "inspect", "--format", "{{json .RepoDigests}}", target).stdout) or []
            digest = [entry.split("@", 1)[1] for entry in known if entry.startswith(f"{image}@")]
        if len(digest) != 1:
            raise Refused(f"docker push of {target} reported no single digest: {output.strip()[-500:]}")
        manifest = pushed_manifest(f"{image}@{digest[0]}", insecure)
        if manifest.get("config", {}).get("digest") != record["config"]:
            raise Refused(f"{target} holds config {manifest.get('config', {}).get('digest')}, not the judged {record['config']}")
        pushed[architecture] = {"tag": target, "manifest": digest[0], "config": record["config"], "archive_sha256": record["sha256"]}
    index = f"{image}:{version}"
    flags = ["--insecure"] if insecure else []
    run("docker", "manifest", "rm", index, check=False)
    run("docker", "manifest", "create", *flags, index, *(f"{image}@{pushed[a]['manifest']}" for a in ARCHITECTURES))
    for architecture in ARCHITECTURES:
        run("docker", "manifest", "annotate", index, f"{image}@{pushed[architecture]['manifest']}",
            "--os", "linux", "--arch", architecture)
    output = run("docker", "manifest", "push", *flags, index).stdout.strip()
    index_digest = re.findall(r"sha256:[0-9a-f]{64}", output)
    readback = pushed_manifest(index, insecure)
    platforms = {(entry.get("platform", {}).get("architecture"), entry.get("digest")) for entry in readback.get("manifests", [])}
    if platforms != {(a, pushed[a]["manifest"]) for a in ARCHITECTURES}:
        raise Refused(f"the index {index} reads back as {sorted(platforms)}")
    result = {"schema": "qrscan-http-published/1", "image": image, "version": version,
              "index": index_digest[-1] if index_digest else None, "architectures": pushed,
              "revision": judged["amd64"][0]["revision"], "engine": ENGINE}
    pathlib.Path(receipt).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(receipt).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return result


def rehearse(images, receipts, receipt):
    version = service_versions()[0]
    name = "qrscan-http-rehearsal-registry"
    image = "localhost:5000/qrcode-barcode-scanner-http"
    try:
        run("docker", "run", "--detach", "--name", name, "--publish", "127.0.0.1:5000:5000", REGISTRY_IMAGE)
        for _ in range(30):
            if run("curl", "--silent", "--fail", "http://127.0.0.1:5000/v2/", check=False).returncode == 0:
                break
            time.sleep(1)
        else:
            raise Refused("the local registry did not start")
        result = publish(images, receipts, image, version, receipt, insecure=True)
        run("docker", "image", "rm", "--force", f"{image}:{version}-amd64", f"{image}:{version}-arm64", check=False)
        run("docker", "pull", "--platform", "linux/amd64", f"{image}:{version}")
        pulled = json.loads(run("docker", "image", "inspect", f"{image}:{version}").stdout)[0]
        if pulled.get("Architecture") != "amd64":
            raise Refused("the index did not resolve to the amd64 image")
        run("docker", "image", "rm", "--force", f"{image}:{version}", check=False)
        return result
    finally:
        run("docker", "rm", "--force", name, check=False)


def self_test():
    failures = []

    def refused(name, action, needle):
        try:
            action()
        except Refused as error:
            if needle not in str(error):
                failures.append(f"{name}: refused with {error}, expected {needle!r}")
        else:
            failures.append(f"{name}: accepted")

    version = service_versions()[0]
    try:
        if gate(f"refs/tags/http-v{version}") != version:
            failures.append("the tag of this version did not gate to it")
    except Refused as error:
        failures.append(f"the tag of this version was refused: {error}")
    refused("an engine tag", lambda: gate("refs/tags/v0.11.0"), "is not a refs/tags/http-vX.Y.Z tag")
    refused("a branch", lambda: gate("refs/heads/main"), "is not a refs/tags/http-vX.Y.Z tag")
    refused("another version", lambda: gate("refs/tags/http-v9.9.9"), "must be one version")
    with tempfile.TemporaryDirectory() as temporary:
        box = pathlib.Path(temporary)
        for layout, config in (("classic", "0" * 64 + ".json"), ("oci", "blobs/sha256/" + "1" * 64)):
            tar_path = box / f"{layout}.tar"
            with tarfile.open(tar_path, "w") as archive:
                data = json.dumps([{"Config": config, "RepoTags": ["x:y"], "Layers": []}]).encode()
                info = tarfile.TarInfo("manifest.json")
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
            want = "sha256:" + ("0" if layout == "classic" else "1") * 64
            if config_digest(tar_path) != want:
                failures.append(f"the {layout} config digest was misread")
        images, receipts = box / "images", box / "receipts"
        images.mkdir()
        receipts.mkdir()
        for architecture in ARCHITECTURES:
            tar_path = images / f"qrscan-http-{architecture}.tar"
            tar_path.write_bytes(architecture.encode())
            record = {"schema": "qrscan-http-image/1", "architecture": architecture, "file": tar_path.name,
                      "sha256": sha256(tar_path), "config": "sha256:" + "2" * 64, "version": version,
                      "engine": ENGINE, "revision": "3" * 40}
            (images / f"{architecture}.json").write_text(json.dumps(record))
            consumed = {"schema": "qrscan-http-consumed/1", "passed": True, "removed": True,
                        **{key: record[key] for key in ("sha256", "config", "version", "revision")}}
            (receipts / f"{architecture}.json").write_text(json.dumps(consumed))
        try:
            verify(images, receipts)
        except Refused as error:
            failures.append(f"matching images and receipts were refused: {error}")
        (images / "qrscan-http-arm64.tar").write_bytes(b"swapped")
        refused("a swapped archive", lambda: verify(images, receipts), "does not have the sha256 its record names")
        (images / "qrscan-http-arm64.tar").write_bytes(b"arm64")
        failed = json.loads((receipts / "amd64.json").read_text())
        (receipts / "amd64.json").write_text(json.dumps(dict(failed, passed=False)))
        refused("a failed consumer", lambda: verify(images, receipts), "is not a passing one")
        (receipts / "amd64.json").write_text(json.dumps(dict(failed, config="sha256:" + "4" * 64)))
        refused("another image judged", lambda: verify(images, receipts), "is not the one its consumer judged (config)")
        (receipts / "amd64.json").write_text(json.dumps(dict(failed, host={"host": "render"})))
        refused("a host's run", lambda: verify(images, receipts), "judged a host's run")
        good = {"schema": "qrscan-http-host/1", "host": "render", "port": 10000, "cpus": "0.1", "memory": "512m",
                "env": {"PORT": "10000", "QRSCAN_HTTP_MAX_CONCURRENT": "1"}}
        profile = box / "profile.json"
        profile.write_text(json.dumps(good))
        try:
            host_profile(profile)
        except Refused as error:
            failures.append(f"a host profile was refused: {error}")
        for name, bad in (("a profile whose PORT is not its port", dict(good, port=8080)),
                          ("a profile with another variable", dict(good, env={**good["env"], "NODE_OPTIONS": "1"})),
                          ("a profile with an option in its memory", dict(good, memory="512m --privileged"))):
            profile.write_text(json.dumps(bad))
            refused(name, lambda: host_profile(profile), "is not a host profile")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (gate, two archive layouts, verify on 4 defects, host profiles)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("gate")
    one.add_argument("--ref", required=True)
    two = commands.add_parser("save")
    two.add_argument("--tag", required=True)
    two.add_argument("--architecture", required=True, choices=ARCHITECTURES)
    two.add_argument("--revision", required=True)
    two.add_argument("--out", required=True)
    three = commands.add_parser("consume")
    three.add_argument("--images", required=True)
    three.add_argument("--architecture", required=True, choices=ARCHITECTURES)
    three.add_argument("--fixture", required=True)
    three.add_argument("--receipt", required=True)
    three.add_argument("--host")
    four = commands.add_parser("verify")
    four.add_argument("--images", required=True)
    four.add_argument("--receipts", required=True)
    five = commands.add_parser("rehearse")
    five.add_argument("--images", required=True)
    five.add_argument("--receipts", required=True)
    five.add_argument("--receipt", required=True)
    six = commands.add_parser("publish")
    six.add_argument("--images", required=True)
    six.add_argument("--receipts", required=True)
    six.add_argument("--ref", required=True)
    six.add_argument("--receipt", required=True)
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        if args.command == "gate":
            print(f"http-v{gate(args.ref)}: package.json, server.mjs and engine {ENGINE} agree")
        elif args.command == "save":
            save(args.tag, args.architecture, args.revision, args.out)
        elif args.command == "consume":
            consume(args.images, args.architecture, args.fixture, args.receipt, args.host)
        elif args.command == "verify":
            verify(args.images, args.receipts)
        elif args.command == "rehearse":
            rehearse(args.images, args.receipts, args.receipt)
        elif args.command == "publish":
            publish(args.images, args.receipts, IMAGE, gate(args.ref), args.receipt)
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"http-service-release: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
