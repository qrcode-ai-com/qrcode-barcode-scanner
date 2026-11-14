#!/usr/bin/env python3
"""Inspect the independently versioned MCP adapter; never build the scanner."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "@qrcode-ai-com/qrcode-barcode-scanner-mcp"
ENGINE = "@qrcode-ai-com/qrcode-barcode-scanner"
ENGINE_VERSION = "0.11.0"
MCP_NAME = "io.github.qrcode-ai-com/qrcode-barcode-scanner"
REPOSITORY = "qrcode-ai-com/qrcode-barcode-scanner"
REPOSITORY_ID = "1126991539"
ENVIRONMENT = "npm-agents"
SCHEMA_SHA256 = "101f84b2888bea2ba617dd4a1d97593bd1a7c7e37e4bd57da6767e944e21fcad"
FILES = ("LICENSE", "README.md", "package.json", "scan-report.schema.json", "server.json", "src/cli.mjs", "src/server.mjs")
SEMVER = r"(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?"
LIMIT = 2 * 1024 * 1024


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def integrity(data: bytes) -> str:
    return "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode()


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def metadata(root: Path = ROOT) -> dict:
    directory = root / "integrations/mcp"
    package = json.loads((directory / "package.json").read_text())
    server = json.loads((directory / "server.json").read_text())
    version = package.get("version", "")
    require(re.fullmatch(SEMVER, version) is not None, "adapter version must be a release SemVer")
    require(package.get("name") == PACKAGE and package.get("mcpName") == MCP_NAME, "wrong adapter identity")
    require(package.get("bin") == {"qrscan-mcp": "src/cli.mjs"} and package.get("type") == "module", "wrong adapter executable")
    require(package.get("license") == "MIT", "wrong adapter license")
    require(package.get("engines") == {"node": "^22.19.0 || >=24.0.0"}, "adapter runtime floor differs from the consumer matrix")
    require(package.get("repository") == {"type": "git", "url": f"https://github.com/{REPOSITORY}.git", "directory": "integrations/mcp"}, "wrong source repository")
    require(package.get("homepage") == "https://qrcode-ai.com/en-US/qr-code-scanner/mcp", "wrong homepage")
    require(package.get("publishConfig") == {"access": "public"}, "adapter must be public")
    require(package.get("dependencies") == {"@modelcontextprotocol/server": "2.3.1", ENGINE: ENGINE_VERSION, "zod": "4.6.7"}, "runtime dependencies must remain exact qualified pins")
    require(package.get("devDependencies") == {"@modelcontextprotocol/client": "2.3.1", "@modelcontextprotocol/sdk": "1.32.1"}, "consumer SDK pins differ")
    require(server.get("name") == MCP_NAME and server.get("version") == version, "registry identity/version mismatch")
    require(server.get("repository") == {"url": f"https://github.com/{REPOSITORY}", "source": "github", "subfolder": "integrations/mcp"}, "registry source repository mismatch")
    require(server.get("packages") == [{"registryType": "npm", "registryBaseUrl": "https://registry.npmjs.org", "identifier": PACKAGE, "version": version, "transport": {"type": "stdio"}}], "registry npm package mismatch")
    require(sha((directory / "scan-report.schema.json").read_bytes()) == SCHEMA_SHA256, "schema differs from the pinned engine")
    require((directory / "LICENSE").read_bytes() == (root / "LICENSE").read_bytes(), "license differs from engine license")
    lock = json.loads((directory / "package-lock.json").read_text())
    require(lock.get("name") == PACKAGE and lock.get("version") == version, "lock identity/version mismatch")
    require(lock["packages"][""].get("name") == PACKAGE and lock["packages"][""].get("version") == version, "lock root identity/version mismatch")
    require(lock["packages"][""].get("dependencies") == package["dependencies"], "lock runtime pins differ")
    require(lock["packages"][""].get("devDependencies") == package["devDependencies"], "lock consumer pins differ")
    return package


def gate(ref: str, root: Path = ROOT) -> dict:
    package = metadata(root)
    if ref.startswith("refs/tags/"):
        require(ref == f"refs/tags/agents-v{package['version']}", "tag must match the independent adapter version")
    return package


def repository_context(context: dict | None = None) -> None:
    context = os.environ if context is None else context
    require(context.get("GITHUB_REPOSITORY") == REPOSITORY, "publication must run in the canonical repository, never a fork")
    require(context.get("GITHUB_REPOSITORY_ID") == REPOSITORY_ID, "publication repository immutable ID differs")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("release readback must not follow redirects")


def fetch(url: str, limit: int = LIMIT) -> bytes:
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "qrscan-mcp-release"})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=25) as response:
        result = response.read(limit + 1)
    require(len(result) <= limit, "release response exceeds its size limit")
    return result


def protected_environment(get=fetch) -> dict:
    base = f"https://api.github.com/repos/{REPOSITORY}/environments/{ENVIRONMENT}"
    environment = json.loads(get(base))
    policies = json.loads(get(base + "/deployment-branch-policies"))
    require(environment.get("name") == ENVIRONMENT, "protected npm-agents environment does not exist")
    require(environment.get("deployment_branch_policy") == {"protected_branches": False, "custom_branch_policies": True}, "environment must use custom tag policies")
    rules = environment.get("protection_rules", [])
    reviewers = [rule for rule in rules if rule.get("type") == "required_reviewers"]
    require(len(reviewers) == 1, "environment must require release review")
    members = reviewers[0].get("reviewers", [])
    require(len(members) == 1 and members[0].get("type") == "User" and members[0].get("reviewer", {}).get("id") == 20891897 and members[0]["reviewer"].get("login") == "ThibautMelen", "environment must retain ThibautMelen as the sole release reviewer")
    require(policies.get("total_count") == 1 and [(item.get("name"), item.get("type")) for item in policies.get("branch_policies", [])] == [("agents-v*", "tag")], "environment must allow agents-v* tags only")
    return {"name": ENVIRONMENT, "tagPolicy": "agents-v*", "requiredReviewer": "ThibautMelen"}


def publishing_preflight(ref: str, event: str, mode: str, context: dict | None = None, get=fetch) -> bool:
    gate(ref)
    requested = ref.startswith("refs/tags/agents-v") and (event == "push" or (event == "workflow_dispatch" and mode == "publish"))
    if requested:
        repository_context(context)
        protected_environment(get)
    return requested


def archive_info(archive: Path, root: Path = ROOT) -> dict:
    require(archive.is_absolute() and archive.is_file() and not archive.is_symlink() and archive.suffix == ".tgz", "archive must be an absolute regular .tgz file, not a link or directory")
    require(archive.stat().st_size <= LIMIT, "archive is too large")
    package = metadata(root)
    files = {}
    with tarfile.open(archive, "r:gz") as tar:
        members = tar.getmembers()
        require(len(members) == len(FILES), "archive must contain exactly seven regular files")
        for member in members:
            require(member.isfile() and not member.issym() and not member.islnk(), "archive contains a link or non-regular member")
            require(member.name.startswith("package/"), "archive must use npm package/ root")
            name = member.name.removeprefix("package/")
            require(name in FILES and name not in files, "archive has an unexpected or duplicate path")
            require(0 <= member.size <= LIMIT, "archive member too large")
            mode = 0o755 if name == "src/cli.mjs" else 0o644
            require(member.mode == mode, f"unexpected mode for {name}")
            data = tar.extractfile(member).read(LIMIT + 1)
            require(data == (root / "integrations/mcp" / name).read_bytes(), f"{name} is not the reviewed source bytes")
            files[name] = {"sha256": sha(data), "mode": mode, "bytes": len(data)}
    require(set(files) == set(FILES), "archive file inventory differs")
    data = archive.read_bytes()
    source = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    return {"schema": 1, "package": PACKAGE, "version": package["version"], "engine": {"package": ENGINE, "version": ENGINE_VERSION, "schemaSha256": SCHEMA_SHA256}, "sourceRevision": source, "archiveSha256": sha(data), "archiveIntegrity": integrity(data), "files": files}


def inspect(archive: Path, receipt: Path, expected: str, record: Path | None = None) -> dict:
    require(re.fullmatch(r"[a-f0-9]{64}", expected) is not None, "expected receipt digest must be SHA256")
    require(sha(receipt.read_bytes()) == expected, "producer receipt digest differs from the prerequisite output")
    measured = archive_info(archive)
    require(json.loads(receipt.read_text()) == measured, "archive, source or producer receipt changed after inspection")
    if record is not None:
        record.write_text(f"{measured['archiveSha256']}  {archive}\n")
    return measured


def npm_command(cli: str | None) -> list[str]:
    return ["node", cli] if cli else ["npm"]


def clean_npm_env(directory: Path) -> dict:
    environment = {key: value for key, value in os.environ.items() if key not in {"NODE_PATH", "NODE_OPTIONS", "NODE_AUTH_TOKEN", "NPM_TOKEN", "NAPI_RS_NATIVE_LIBRARY_PATH"} and not key.lower().startswith("npm_config_")}
    for name in ("user", "global"):
        config = directory / f"empty-{name}.npmrc"
        config.write_text("")
        environment[f"NPM_CONFIG_{name.upper()}CONFIG"] = str(config)
    environment["NPM_CONFIG_CACHE"] = str(directory / "empty-cache")
    return environment


def pack(out: Path, cli: str | None, github_output: Path | None) -> None:
    metadata()
    dirty = subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=all", "--", "integrations/mcp"], cwd=ROOT, text=True)
    require(not dirty.strip(), "commit adapter files before packing a release")
    out.mkdir(parents=True, exist_ok=False)
    with tempfile.TemporaryDirectory(prefix="qrscan-mcp-pack-config-") as temporary:
        environment = clean_npm_env(Path(temporary))
        packed = json.loads(subprocess.check_output(npm_command(cli) + ["pack", "--ignore-scripts", "--json", "--pack-destination", str(out)], cwd=ROOT / "integrations/mcp", env=environment, text=True, timeout=120))
    require(len(packed) == 1, "npm must pack exactly one adapter")
    archive = out / packed[0]["filename"]
    receipt = archive_info(archive)
    require(receipt["archiveIntegrity"] == packed[0]["integrity"], "npm integrity differs from inspected bytes")
    write_json(out / "receipt.json", receipt)
    digest = sha((out / "receipt.json").read_bytes())
    if github_output:
        with github_output.open("a") as handle:
            handle.write(f"receipt_sha256={digest}\n")
    print(json.dumps({"archive": str(archive), "receiptSha256": digest, "version": receipt["version"]}))


class RegistryManifestPending(ValueError):
    """The exact public version still returns HTTP 404 after an accepted upload."""


def registry_probe(archive: Path, out: Path, uploaded: bool = False, get=fetch) -> str:
    if uploaded:
        require(os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL") and os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN"), "OIDC-only upload receipt requires a GitHub OIDC job")
        require(not os.environ.get("NODE_AUTH_TOKEN") and not os.environ.get("NPM_TOKEN"), "static npm credentials are not allowed")
    measured = archive_info(archive)
    version = measured["version"]
    url = f"https://registry.npmjs.org/{urllib.parse.quote(PACKAGE, safe='@')}/{version}"
    try:
        manifest = json.loads(get(url))
    except urllib.error.HTTPError as error:
        error.close()
        if error.code != 404:
            raise
        if uploaded:
            raise RegistryManifestPending("successful publication is not publicly served yet") from error
        write_json(out, {**measured, "outcome": "MISSING", "oidcUploadExercised": False})
        return "missing"
    require(manifest.get("name") == PACKAGE and manifest.get("version") == version, "registry identity/version differs")
    require(manifest.get("dist", {}).get("integrity") == measured["archiveIntegrity"], "existing registry version has different integrity; never overwrite it")
    tarball = f"https://registry.npmjs.org/{PACKAGE}/-/qrcode-barcode-scanner-mcp-{version}.tgz"
    require(manifest["dist"].get("tarball") == tarball, "unexpected registry tarball URL")
    require(sha(get(tarball)) == measured["archiveSha256"], "public registry tarball differs from the qualified archive")
    attestations = manifest["dist"].get("attestations")
    if uploaded:
        require(isinstance(attestations, dict) and attestations.get("provenance"), "new OIDC upload must expose npm provenance metadata")
    write_json(out, {**measured, "outcome": "PUBLISHED_OIDC_AND_PUBLIC_BYTES" if uploaded else "EXISTING_MATCH_NO_UPLOAD", "oidcUploadExercised": uploaded, "provenanceMetadata": attestations, "cryptographicAttestationVerification": "NOT_CLAIMED"})
    return "present"


def registry_after_upload(archive: Path, out: Path, *, get=fetch, clock=time.monotonic, sleep=time.sleep) -> str:
    deadline = clock() + 7 * 60
    while clock() < deadline:
        try:
            return registry_probe(archive, out, uploaded=True, get=get)
        except RegistryManifestPending:
            remaining = deadline - clock()
            if remaining > 0:
                sleep(min(10, remaining))
    raise ValueError("npm accepted the upload, but its version manifest still returned HTTP 404 after 7 minutes. Verify public bytes before rerunning.")


def consume(archive: Path, receipt: Path, expected: str, out: Path, registry: bool, cli: str | None) -> None:
    measured = inspect(archive, receipt, expected)
    out.mkdir(parents=True, exist_ok=False)
    consumer = Path(tempfile.mkdtemp(prefix="qrscan-mcp-consumer-"))
    environment = clean_npm_env(consumer)
    (consumer / "package.json").write_text('{"name":"qrscan-mcp-qualified-consumer","private":true,"type":"module"}\n')
    spec = f"{PACKAGE}@{measured['version']}" if registry else str(archive)
    command = npm_command(cli) + ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", "--registry=https://registry.npmjs.org", spec, "@modelcontextprotocol/client@2.3.1", "@modelcontextprotocol/sdk@1.32.1"]
    installed = subprocess.run(command, cwd=consumer, env=environment, text=True, capture_output=True, timeout=180, check=True)
    (out / "installation.log").write_text(installed.stdout + installed.stderr)
    directory = consumer / "node_modules" / PACKAGE
    for name, expected_file in measured["files"].items():
        require(sha((directory / name).read_bytes()) == expected_file["sha256"], f"installed {name} differs from qualified archive")
    lock = json.loads((consumer / "package-lock.json").read_text())
    require(lock["packages"][f"node_modules/{ENGINE}"]["version"] == ENGINE_VERSION, "installed engine is not the qualified pin")
    if registry:
        adapter = lock["packages"][f"node_modules/{PACKAGE}"]
        require(adapter.get("integrity") == measured["archiveIntegrity"] and adapter.get("resolved", "").startswith("https://registry.npmjs.org/"), "registry consumer resolved a local archive or different bytes")
    shutil.copyfile(ROOT / "integrations/mcp/test/protocol-consumer.mjs", consumer / "probe.mjs")
    for name, fixture in {"clean.png": "fixtures/clean/gen_v5_q.png", "binary.png": "fixtures/eci/eci899-binary.png", "mixed.png": "fixtures/symbology/mixed-code128-qr.png"}.items():
        shutil.copyfile(ROOT / fixture, consumer / name)
    white = re.search(r'const white = Buffer.from\("([A-Za-z0-9+/=]+)"', (ROOT / "scripts/packed-node-consumer.mjs").read_text())
    require(white is not None, "public negative fixture is missing")
    (consumer / "white.png").write_bytes(base64.b64decode(white[1], validate=True))
    shutil.copyfile(ROOT / "integrations/mcp/test/readme-consumer.mjs", consumer / "readme-probe.mjs")
    example = subprocess.run(["node", "readme-probe.mjs"], cwd=consumer, env=environment, text=True, capture_output=True, timeout=120, check=True)
    (out / "readme-example-output.json").write_text(example.stdout)
    shutil.copyfile(consumer / "readme-example-receipt.json", out / "readme-example-receipt.json")
    result = subprocess.run(["node", "probe.mjs"], cwd=consumer, env=environment, text=True, capture_output=True, timeout=180, check=True)
    (out / "protocol-output.json").write_text(result.stdout)
    for name in ("protocol-receipt.json", "modern-wire.json", "legacy-wire.json", "package-lock.json"):
        shutil.copyfile(consumer / name, out / name)
    write_json(out / "consumer.json", {"outcome": "PASS", "installSource": "registry" if registry else "qualified_archive", "sourceRevision": measured["sourceRevision"], "archiveSha256": measured["archiveSha256"], "node": subprocess.check_output(["node", "--version"], text=True).strip(), "engineVersion": ENGINE_VERSION, "adapterVersion": measured["version"], "consumerOutsideCheckout": True, "productClientAcceptance": "NOT_CLAIMED"})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("gate")
    check.add_argument("--ref", required=True)
    check.add_argument("--environment", choices=[ENVIRONMENT])
    preflight = commands.add_parser("preflight")
    preflight.add_argument("--ref", required=True)
    preflight.add_argument("--event", required=True)
    preflight.add_argument("--mode", choices=["inspect", "publish"], required=True)
    preflight.add_argument("--github-output", type=Path, required=True)
    packing = commands.add_parser("pack")
    packing.add_argument("--out", type=Path, required=True)
    packing.add_argument("--npm-cli")
    packing.add_argument("--github-output", type=Path)
    inspecting = commands.add_parser("inspect")
    inspecting.add_argument("archive", type=Path)
    inspecting.add_argument("--strict", action="store_true", required=True)
    inspecting.add_argument("--receipt", type=Path, required=True)
    inspecting.add_argument("--expected-receipt", required=True)
    inspecting.add_argument("--record", type=Path)
    probe = commands.add_parser("registry")
    probe.add_argument("archive", type=Path)
    probe.add_argument("--out", type=Path, required=True)
    probe.add_argument("--uploaded", action="store_true")
    consumer = commands.add_parser("consume")
    consumer.add_argument("archive", type=Path)
    consumer.add_argument("--receipt", type=Path, required=True)
    consumer.add_argument("--expected-receipt", required=True)
    consumer.add_argument("--out", type=Path, required=True)
    consumer.add_argument("--registry", action="store_true")
    consumer.add_argument("--npm-cli")
    args = parser.parse_args()
    if args.command == "gate":
        if args.environment:
            repository_context()
        gate(args.ref)
        if args.environment:
            protected_environment()
    elif args.command == "preflight":
        requested = publishing_preflight(args.ref, args.event, args.mode)
        with args.github_output.open("a") as handle:
            handle.write(f"publish_allowed={str(requested).lower()}\n")
    elif args.command == "pack":
        pack(args.out.resolve(), args.npm_cli, args.github_output)
    elif args.command == "inspect":
        inspect(args.archive, args.receipt, args.expected_receipt, args.record)
    elif args.command == "registry":
        readback = registry_after_upload if args.uploaded else registry_probe
        print(readback(args.archive, args.out))
    elif args.command == "consume":
        consume(args.archive, args.receipt, args.expected_receipt, args.out.resolve(), args.registry, args.npm_cli)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, json.JSONDecodeError, tarfile.TarError, subprocess.SubprocessError) as error:
        print(f"mcp-release: {error}", file=sys.stderr)
        sys.exit(1)
