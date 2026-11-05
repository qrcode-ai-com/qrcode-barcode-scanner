#!/usr/bin/env python3
"""Negative release witnesses; no network, npm credentials or publication."""

import importlib.util
import io
import json
import os
import shutil
import tarfile
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("mcp_release", Path(__file__).with_name("mcp-release.py"))
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


class ReleaseBoundaries(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="qrscan-mcp-release-tests-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.archive = self.directory / "mcp.tgz"
        self.make_archive()

    def make_archive(self, change=None):
        with tarfile.open(self.archive, "w:gz") as archive:
            for name in release.FILES:
                data = (release.ROOT / "integrations/mcp" / name).read_bytes()
                member = tarfile.TarInfo("package/" + name)
                member.size = len(data)
                member.mode = 0o755 if name == "src/cli.mjs" else 0o644
                if change:
                    data = change(name, member, data)
                    member.size = len(data)
                archive.addfile(member, io.BytesIO(data) if member.isfile() else None)

    def source_copy(self):
        root = self.directory / "source"
        shutil.copytree(release.ROOT / "integrations/mcp", root / "integrations/mcp")
        shutil.copyfile(release.ROOT / "LICENSE", root / "LICENSE")
        return root

    def test_exact_archive(self):
        value = release.archive_info(self.archive)
        self.assertEqual(value["package"], release.PACKAGE)
        self.assertEqual(value["engine"]["version"], "0.11.0")
        self.assertEqual(set(value["files"]), set(release.FILES))

    def test_archive_source_substitution(self):
        self.make_archive(lambda name, member, data: data + b"modified" if name == "src/server.mjs" else data)
        with self.assertRaisesRegex(ValueError, "reviewed source bytes"):
            release.archive_info(self.archive)

    def test_archive_symlink(self):
        def link(name, member, data):
            if name == "README.md":
                member.type, member.linkname = tarfile.SYMTYPE, "../../outside"
            return data
        self.make_archive(link)
        with self.assertRaisesRegex(ValueError, "link or non-regular"):
            release.archive_info(self.archive)

    def test_archive_traversal(self):
        def traverse(name, member, data):
            if name == "README.md":
                member.name = "package/../../README.md"
            return data
        self.make_archive(traverse)
        with self.assertRaisesRegex(ValueError, "unexpected or duplicate"):
            release.archive_info(self.archive)

    def test_archive_executable_mode(self):
        def mode(name, member, data):
            if name == "src/cli.mjs":
                member.mode = 0o644
            return data
        self.make_archive(mode)
        with self.assertRaisesRegex(ValueError, "unexpected mode"):
            release.archive_info(self.archive)

    def test_archive_operand_refuses_link_directory_relative(self):
        link = self.directory / "link.tgz"
        link.symlink_to(self.archive)
        for path in (link, self.directory, Path("npm-mcp/file.tgz")):
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, "absolute regular"):
                release.archive_info(path)

    def test_archive_extra_member(self):
        with tarfile.open(self.archive, "r:gz") as archive:
            members = [(member, archive.extractfile(member).read()) for member in archive]
        with tarfile.open(self.archive, "w:gz") as archive:
            for member, data in members:
                archive.addfile(member, io.BytesIO(data))
            extra = tarfile.TarInfo("package/token.txt")
            archive.addfile(extra, io.BytesIO())
        with self.assertRaisesRegex(ValueError, "exactly seven"):
            release.archive_info(self.archive)

    def test_engine_pin_schema_and_registry_identity(self):
        root = self.source_copy()
        package_file = root / "integrations/mcp/package.json"
        original = package_file.read_bytes()
        package = json.loads(original)
        package["dependencies"][release.ENGINE] = "^0.11.0"
        package_file.write_text(json.dumps(package))
        with self.assertRaisesRegex(ValueError, "exact qualified pins"):
            release.metadata(root)
        package_file.write_bytes(original)
        server_file = root / "integrations/mcp/server.json"
        server = json.loads(server_file.read_text())
        server["packages"][0]["version"] = "999.0.0"
        server_file.write_text(json.dumps(server))
        with self.assertRaisesRegex(ValueError, "registry npm package mismatch"):
            release.metadata(root)

    def test_independent_tag(self):
        version = release.metadata()["version"]
        self.assertEqual(release.gate(f"refs/tags/agents-v{version}")["version"], version)
        self.assertEqual(release.gate("refs/heads/rehearsal")["version"], version)
        for ref in ("refs/tags/v0.11.0", "refs/tags/agents-v999.0.0", f"refs/tags/agents-v{version}-wrong"):
            with self.subTest(ref=ref), self.assertRaisesRegex(ValueError, "independent adapter version"):
                release.gate(ref)

    @staticmethod
    def environment():
        return {"name": "npm-agents", "deployment_branch_policy": {"protected_branches": False, "custom_branch_policies": True}, "protection_rules": [{"type": "required_reviewers", "reviewers": [{"type": "User", "reviewer": {"id": 20891897, "login": "ThibautMelen"}}]}]}

    @staticmethod
    def policies():
        return {"total_count": 1, "branch_policies": [{"name": "agents-v*", "type": "tag"}]}

    def test_protected_environment(self):
        def get(url):
            return json.dumps(self.policies() if url.endswith("deployment-branch-policies") else self.environment()).encode()
        self.assertEqual(release.protected_environment(get)["tagPolicy"], "agents-v*")

    def test_fork_and_same_name_replacement_cannot_reach_environment_lookup(self):
        version = release.metadata()["version"]
        for context in ({}, {"GITHUB_REPOSITORY": "someone/qrcode-barcode-scanner", "GITHUB_REPOSITORY_ID": "1"}, {"GITHUB_REPOSITORY": release.REPOSITORY, "GITHUB_REPOSITORY_ID": "1"}):
            with self.subTest(context=context), self.assertRaises(ValueError):
                release.publishing_preflight(f"refs/tags/agents-v{version}", "push", "inspect", context, lambda url: self.fail("fork must be rejected before any canonical-environment lookup"))

    def test_branch_or_manual_inspection_never_requests_publication(self):
        version = release.metadata()["version"]
        for ref in ("refs/heads/rehearsal", f"refs/tags/agents-v{version}"):
            self.assertFalse(release.publishing_preflight(ref, "workflow_dispatch", "inspect", {}, lambda url: self.fail("inspection must not look up an environment")))

    def test_canonical_publish_requires_real_environment(self):
        version = release.metadata()["version"]
        context = {"GITHUB_REPOSITORY": release.REPOSITORY, "GITHUB_REPOSITORY_ID": release.REPOSITORY_ID}
        def get(url):
            return json.dumps(self.policies() if url.endswith("deployment-branch-policies") else self.environment()).encode()
        self.assertTrue(release.publishing_preflight(f"refs/tags/agents-v{version}", "push", "inspect", context, get))
        self.assertTrue(release.publishing_preflight(f"refs/tags/agents-v{version}", "workflow_dispatch", "publish", context, get))

    def test_missing_or_unprotected_environment(self):
        for mutate in (lambda item: item.update(name="other"), lambda item: item.update(protection_rules=[]), lambda item: item.update(deployment_branch_policy=None), lambda item: item["protection_rules"][0].update(reviewers=[])):
            environment = self.environment()
            mutate(environment)
            def get(url, environment=environment):
                return json.dumps(self.policies() if url.endswith("deployment-branch-policies") else environment).encode()
            with self.subTest(environment=environment), self.assertRaises(ValueError):
                release.protected_environment(get)

    def test_branch_or_wildcard_environment_is_refused(self):
        for policy in ({"name": "agents-v*", "type": "branch"}, {"name": "*", "type": "tag"}, {"name": "v*", "type": "tag"}):
            def get(url, policy=policy):
                return json.dumps({"total_count": 1, "branch_policies": [policy]} if url.endswith("deployment-branch-policies") else self.environment()).encode()
            with self.subTest(policy=policy), self.assertRaisesRegex(ValueError, "agents-v\\* tags only"):
                release.protected_environment(get)

    def test_receipt_bound_to_archive_and_source(self):
        receipt = self.directory / "receipt.json"
        release.write_json(receipt, release.archive_info(self.archive))
        expected = release.sha(receipt.read_bytes())
        record = self.directory / "record"
        release.inspect(self.archive, receipt, expected, record)
        self.assertEqual(record.read_text(), f"{release.sha(self.archive.read_bytes())}  {self.archive}\n")
        with self.assertRaisesRegex(ValueError, "producer receipt digest"):
            release.inspect(self.archive, receipt, "a" * 64)
        value = json.loads(receipt.read_text())
        value["sourceRevision"] = "f" * 40
        release.write_json(receipt, value)
        with self.assertRaisesRegex(ValueError, "changed after inspection"):
            release.inspect(self.archive, receipt, release.sha(receipt.read_bytes()))

    def manifest(self):
        measured = release.archive_info(self.archive)
        version = measured["version"]
        return {"name": release.PACKAGE, "version": version, "dist": {"integrity": measured["archiveIntegrity"], "tarball": f"https://registry.npmjs.org/{release.PACKAGE}/-/qrcode-barcode-scanner-mcp-{version}.tgz"}}

    def getter(self, manifest):
        return lambda url: self.archive.read_bytes() if url.endswith(".tgz") else json.dumps(manifest).encode()

    def test_existing_public_bytes_are_not_an_oidc_upload(self):
        out = self.directory / "public.json"
        self.assertEqual(release.registry_probe(self.archive, out, get=self.getter(self.manifest())), "present")
        result = json.loads(out.read_text())
        self.assertEqual(result["outcome"], "EXISTING_MATCH_NO_UPLOAD")
        self.assertIs(result["oidcUploadExercised"], False)

    def test_existing_different_bytes_refused(self):
        manifest = self.manifest()
        manifest["dist"]["integrity"] = "sha512-wrong"
        with self.assertRaisesRegex(ValueError, "different integrity"):
            release.registry_probe(self.archive, self.directory / "out", get=self.getter(manifest))

    def test_missing_vs_failed_registry(self):
        for status in (401, 403, 429, 500):
            def fail(url, status=status):
                raise urllib.error.HTTPError(url, status, "fixture", {}, io.BytesIO())
            with self.subTest(status=status), self.assertRaises(urllib.error.HTTPError):
                release.registry_probe(self.archive, self.directory / "out", get=fail)
        def missing(url):
            raise urllib.error.HTTPError(url, 404, "fixture", {}, io.BytesIO())
        out = self.directory / "missing.json"
        self.assertEqual(release.registry_probe(self.archive, out, get=missing), "missing")
        self.assertIs(json.loads(out.read_text())["oidcUploadExercised"], False)

    def test_registry_cannot_redirect_tarball_elsewhere(self):
        manifest = self.manifest()
        manifest["dist"]["tarball"] = "https://example.com/attacker.tgz"
        with self.assertRaisesRegex(ValueError, "tarball URL"):
            release.registry_probe(self.archive, self.directory / "out", get=self.getter(manifest))

    def test_new_upload_requires_oidc_no_static_token_and_provenance(self):
        manifest = self.manifest()
        get = self.getter(manifest)
        with patch.dict(os.environ, {}, clear=True), self.assertRaisesRegex(ValueError, "GitHub OIDC job"):
            release.registry_probe(self.archive, self.directory / "out", True, get)
        identity = {"ACTIONS_ID_TOKEN_REQUEST_URL": "fixture", "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "fixture"}
        with patch.dict(os.environ, identity, clear=True), self.assertRaisesRegex(ValueError, "provenance"):
            release.registry_probe(self.archive, self.directory / "out", True, get)
        manifest["dist"]["attestations"] = {"provenance": {"predicateType": "https://slsa.dev/provenance/v1"}}
        with patch.dict(os.environ, identity, clear=True):
            release.registry_probe(self.archive, self.directory / "uploaded.json", True, self.getter(manifest))
        with patch.dict(os.environ, {**identity, "NODE_AUTH_TOKEN": "fixture"}, clear=True), self.assertRaisesRegex(ValueError, "static npm credentials"):
            release.registry_probe(self.archive, self.directory / "out", True, self.getter(manifest))

    def test_accepted_upload_can_become_visible_after_old_deadline(self):
        elapsed = 0
        attempts = []
        manifest = self.manifest()
        manifest["dist"]["attestations"] = {"provenance": {"predicateType": "https://slsa.dev/provenance/v1"}}
        published = self.getter(manifest)

        def get(url):
            if not url.endswith(".tgz"):
                attempts.append(elapsed)
                if elapsed < 90:
                    raise urllib.error.HTTPError(url, 404, "fixture", {}, io.BytesIO())
            return published(url)

        def sleep(seconds):
            nonlocal elapsed
            elapsed += seconds

        out = self.directory / "public.json"
        identity = {"ACTIONS_ID_TOKEN_REQUEST_URL": "fixture", "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "fixture"}
        with patch.dict(os.environ, identity, clear=True):
            self.assertEqual(release.registry_after_upload(self.archive, out, get=get, clock=lambda: elapsed, sleep=sleep), "present")
        self.assertEqual(attempts, list(range(0, 91, 10)))
        self.assertEqual(json.loads(out.read_text())["outcome"], "PUBLISHED_OIDC_AND_PUBLIC_BYTES")

    def test_accepted_upload_grace_expires_without_a_success_receipt(self):
        elapsed = 0
        attempts = []

        def get(url):
            attempts.append(elapsed)
            raise urllib.error.HTTPError(url, 404, "fixture", {}, io.BytesIO())

        def sleep(seconds):
            nonlocal elapsed
            elapsed += seconds

        out = self.directory / "public.json"
        identity = {"ACTIONS_ID_TOKEN_REQUEST_URL": "fixture", "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "fixture"}
        with patch.dict(os.environ, identity, clear=True), self.assertRaisesRegex(ValueError, "npm accepted.*7 minutes"):
            release.registry_after_upload(self.archive, out, get=get, clock=lambda: elapsed, sleep=sleep)
        self.assertEqual(attempts, list(range(0, 420, 10)))
        self.assertEqual(elapsed, 420)
        self.assertFalse(out.exists())

    def test_accepted_upload_readback_fails_immediately_on_inconsistent_evidence(self):
        wrong = self.manifest()
        wrong["dist"]["integrity"] = "sha512-wrong"
        valid = self.manifest()
        valid["dist"]["attestations"] = {"provenance": {"predicateType": "https://slsa.dev/provenance/v1"}}

        def tarball_missing(url):
            if url.endswith(".tgz"):
                error = urllib.error.HTTPError(url, 404, "fixture", {}, io.BytesIO())
                error.close()
                raise error
            return json.dumps(valid).encode()

        def changed_tarball(url):
            return b"wrong archive" if url.endswith(".tgz") else json.dumps(valid).encode()

        def server_error(url):
            raise urllib.error.HTTPError(url, 503, "fixture", {}, io.BytesIO())

        identity = {"ACTIONS_ID_TOKEN_REQUEST_URL": "fixture", "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "fixture"}
        for get, error, message in (
            (self.getter(wrong), ValueError, "different integrity"),
            (self.getter(self.manifest()), ValueError, "provenance"),
            (changed_tarball, ValueError, "public registry tarball differs"),
            (tarball_missing, urllib.error.HTTPError, "404"),
            (server_error, urllib.error.HTTPError, "503"),
        ):
            with self.subTest(message=message), patch.dict(os.environ, identity, clear=True), self.assertRaisesRegex(error, message):
                release.registry_after_upload(self.archive, self.directory / "out", get=get, clock=lambda: 0, sleep=lambda _: self.fail("inconsistent evidence must fail without waiting"))


if __name__ == "__main__":
    unittest.main()
