#!/usr/bin/env python3
"""List the inspected MCP 0.3.1 adapter in the Official MCP Registry."""

import argparse
import base64
import hashlib
import io
import json
import os
import platform
import subprocess
import tarfile
import tempfile
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import HTTPRedirectHandler, Request, build_opener

REPOSITORY = "qrcode-ai-com/qrcode-barcode-scanner"
REGISTRY = "https://registry.modelcontextprotocol.io"
NPM = "https://registry.npmjs.org"
PACKAGE = "@qrcode-ai-com/qrcode-barcode-scanner-mcp"
SERVER = "io.github.qrcode-ai-com/qrcode-barcode-scanner"
VERSION = "0.3.1"
SOURCE_COMMIT = "365585f9db955fd41a6101a3240c4f63436434a3"  # agents-v0.3.1
SERVER_SHA256 = "6d120fa4c23666a190dc6b061dcd459ae774b8950b07a686f3349422035cdbca"
NPM_INTEGRITY = "sha512-JLPa1AqFpygcrt/zKMQwhIfD67U9j1DUPnKdBmYYwo8yQoZmwNtd4FH80yllFbONKwxcjpReqLiVrWilWgeEng=="
PUBLISHER_URL = (
    "https://github.com/modelcontextprotocol/registry/releases/download/v1.8.7/"
    "mcp-publisher_linux_amd64.tar.gz"
)
PUBLISHER_SHA256 = "00b21004149a4ce66f0782508ae4a2bce67d1bea395a8da0bd8028159fb59579"
PUBLIC_VERSION = f"{REGISTRY}/v0.1/servers/{quote(SERVER, safe='')}/versions/{VERSION}?include_deleted=true"


def require(condition, message):
    if not condition:
        raise ValueError(message)


class RegistryRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if req.full_url == PUBLISHER_URL and newurl.startswith("https://release-assets.githubusercontent.com/"):
            return super().redirect_request(req, fp, code, msg, headers, newurl)
        raise ValueError("unexpected redirect from a release source")


def fetch(url, *, payload=None, limit=1024 * 1024, allow_missing=False):
    request = Request(url, data=payload, headers={
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "qrscan-official-mcp-release",
    })
    try:
        response = build_opener(RegistryRedirect()).open(request, timeout=25)
    except HTTPError as error:
        if not allow_missing or error.code != 404:
            error.close()
            raise
        response = error
    with response:
        data = response.read(limit + 1)
        require(len(data) <= limit, "release response exceeds its size limit")
        return response.code, data


def repository_context():
    expected = {
        "GITHUB_REPOSITORY": REPOSITORY,
        "GITHUB_REPOSITORY_ID": "1126991539",
        "GITHUB_REF": "refs/heads/main",
        "GITHUB_EVENT_NAME": "workflow_dispatch",
        "GITHUB_WORKFLOW_REF": f"{REPOSITORY}/.github/workflows/mcp-registry-publish.yml@refs/heads/main",
    }
    require(all(os.environ.get(key) == value for key, value in expected.items()),
            "Official MCP publication requires a manual dispatch from canonical main")


def protected_environment():
    url = f"https://api.github.com/repos/{REPOSITORY}/environments/mcp-registry"
    environment = json.loads(fetch(url)[1])
    require(environment.get("name") == "mcp-registry" and environment.get("id") == 26468587275,
            "the reviewed mcp-registry environment must exist")
    require(environment.get("can_admins_bypass") is False, "administrator bypass must be disabled")
    require(environment.get("deployment_branch_policy") == {
        "protected_branches": False, "custom_branch_policies": True,
    }, "mcp-registry must use selected deployment branches")
    rules = [rule for rule in environment["protection_rules"] if rule["type"] == "required_reviewers"]
    require(len(rules) == 1, "mcp-registry must require release review")
    reviewers = rules[0]["reviewers"]
    require(len(reviewers) == 1 and reviewers[0]["type"] == "User"
            and reviewers[0]["reviewer"]["id"] == 20891897
            and reviewers[0]["reviewer"]["login"] == "ThibautMelen",
            "mcp-registry must retain its sole owner reviewer")
    policies = json.loads(fetch(url + "/deployment-branch-policies")[1])
    require(policies["total_count"] == 1
            and [(item["type"], item["name"]) for item in policies["branch_policies"]] == [("branch", "main")],
            "mcp-registry must accept exactly the main branch")


def package_metadata():
    raw_url = f"https://raw.githubusercontent.com/{REPOSITORY}/{SOURCE_COMMIT}/integrations/mcp/server.json"
    source = fetch(raw_url)[1]
    require(hashlib.sha256(source).hexdigest() == SERVER_SHA256, "server.json digest differs from agents-v0.2.1")
    manifest = json.loads(source)
    require(manifest["name"] == SERVER and manifest["version"] == VERSION and manifest["packages"] == [{
        "registryType": "npm", "registryBaseUrl": NPM, "identifier": PACKAGE,
        "version": VERSION, "transport": {"type": "stdio"},
    }], "server.json does not describe the pinned stdio adapter")
    metadata = json.loads(fetch(f"{NPM}/{quote(PACKAGE, safe='')}/{VERSION}")[1])
    require((metadata["name"], metadata["version"], metadata["mcpName"]) == (PACKAGE, VERSION, SERVER),
            "npm metadata names a different adapter")
    require(metadata["repository"]["url"] == f"git+https://github.com/{REPOSITORY}.git"
            and metadata["repository"]["directory"] == "integrations/mcp", "npm source repository differs")
    tarball = f"{NPM}/{PACKAGE}/-/qrcode-barcode-scanner-mcp-{VERSION}.tgz"
    dist = metadata["dist"]
    require(dist["tarball"] == tarball and dist["integrity"] == NPM_INTEGRITY
            and dist["attestations"]["provenance"]["predicateType"] == "https://slsa.dev/provenance/v1",
            "npm integrity or provenance metadata differs")
    archive = fetch(tarball)[1]
    archive_integrity = "sha512-" + base64.b64encode(hashlib.sha512(archive).digest()).decode()
    require(archive_integrity == NPM_INTEGRITY, "published npm archive does not match its pinned integrity")
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
        members = [item for item in bundle.getmembers() if item.name == "package/server.json"]
        require(len(members) == 1 and members[0].isfile(), "npm archive needs one regular server.json")
        require(bundle.extractfile(members[0]).read() == source, "npm server.json differs from the release source")
    return source, manifest


def version_missing(manifest):
    status, raw = fetch(PUBLIC_VERSION, allow_missing=True)
    result = json.loads(raw)
    if status == 404:
        require(result.get("status") == 404 and result.get("detail") == "Server not found",
                "unrecognized absence response from Official MCP Registry")
        return True
    require(status == 200, "unexpected readback status from Official MCP Registry")
    server = result["server"]
    require(all(server.get(key) == value for key, value in manifest.items() if key != "$schema")
            and not server.get("remotes"), "the existing Registry version differs from the reviewed manifest")
    status = result["_meta"]["io.modelcontextprotocol.registry/official"]["status"]
    require(status == "active", "the existing Registry version is not active")
    return False


def install_publisher(directory):
    archive = fetch(PUBLISHER_URL, limit=40 * 1024 * 1024)[1]
    require(hashlib.sha256(archive).hexdigest() == PUBLISHER_SHA256, "mcp-publisher archive digest differs")
    binary = directory / "mcp-publisher"
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
        members = [item for item in bundle.getmembers() if item.name == "mcp-publisher"]
        require(len(members) == 1 and members[0].isfile(), "publisher archive needs one regular executable")
        binary.write_bytes(bundle.extractfile(members[0]).read())
    binary.chmod(0o700)
    return binary


def note(message):
    print(message)
    with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a") as summary:
        summary.write(message + "\n")


def inspect_or_publish(mode):
    repository_context()
    source, manifest = package_metadata()
    valid = json.loads(fetch(REGISTRY + "/v0.1/validate", payload=source)[1])
    require(valid == {"valid": True, "issues": []}, "Official MCP Registry rejected server.json")
    missing = version_missing(manifest)
    if missing:
        protected_environment()
    if mode == "inspect":
        with Path(os.environ["GITHUB_OUTPUT"]).open("a") as output:
            output.write(f"missing={str(missing).lower()}\n")
    if not missing:
        note(f"{SERVER}@{VERSION} is already active and matches the published npm manifest.")
        return
    if mode == "inspect":
        note(f"{SERVER}@{VERSION} is validated and absent. Publication requires environment approval.")
        return
    require(os.environ.get("GITHUB_ACTIONS") == "true"
            and os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
            and os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN"), "publication requires the runner's OIDC identity")
    require(platform.system() == "Linux" and platform.machine() == "x86_64",
            "the approved publisher runs on Linux amd64")
    with tempfile.TemporaryDirectory(prefix="qrscan-mcp-registry-") as temp:
        directory = Path(temp)
        publisher = install_publisher(directory)
        metadata = directory / "server.json"
        metadata.write_bytes(source)
        if not version_missing(manifest):
            note(f"{SERVER}@{VERSION} appeared during preparation and matches. No write was needed.")
            return
        # v1.8.7 stores the short-lived exchanged token at this fixed path.
        token_file = Path.home() / ".config" / "mcp-publisher" / "token.json"
        require(not token_file.exists() and not token_file.is_symlink(), "publisher runner must start logged out")
        try:
            subprocess.run([publisher, "login", "github-oidc", f"--registry={REGISTRY}"], cwd=directory,
                           check=True, timeout=40)
            subprocess.run([publisher, "publish", metadata], cwd=directory, check=True, timeout=50)
        finally:
            token_file.unlink(missing_ok=True)
    for delay in (0, 2, 4, 8, 16):
        time.sleep(delay)
        if not version_missing(manifest):
            note(f"Verified active listing {SERVER}@{VERSION}.\n\n{PUBLIC_VERSION}")
            return
    raise ValueError("Official MCP Registry has not served the expected listing after publication")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("inspect", "publish"))
    try:
        inspect_or_publish(parser.parse_args().mode)
    except (KeyError, OSError, TypeError, ValueError, subprocess.SubprocessError, tarfile.TarError) as error:
        raise SystemExit(f"Official MCP Registry: {error}") from None
