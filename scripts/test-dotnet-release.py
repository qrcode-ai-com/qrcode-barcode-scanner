#!/usr/bin/env python3
"""Refuse publication boundary bypasses and signed-package content drift without credentials."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import urllib.error
import zipfile
from unittest.mock import patch


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


release = load("dotnet_release", "dotnet-release.py")
guards = load("publish_guards", "check-publish-guards.py")


def zipped(files):
    data = io.BytesIO()
    with zipfile.ZipFile(data, "w") as archive:
        for name, value in files.items():
            archive.writestr(name, value)
    return data.getvalue()


class ReleaseBoundary(unittest.TestCase):
    def setUp(self):
        self.context = {"GITHUB_REPOSITORY": release.REPOSITORY, "GITHUB_REPOSITORY_ID": release.REPOSITORY_ID,
                        "GITHUB_REF": "refs/tags/v" + release.version(), "GITHUB_EVENT_NAME": "push"}
        self.env = {"name": "nuget", "deployment_branch_policy": {
            "protected_branches": False, "custom_branch_policies": True}, "protection_rules": [{
            "type": "required_reviewers", "reviewers": [{"type": "User", "reviewer": {
                "id": 20891897, "login": "ThibautMelen"}}]}]}
        self.policies = {"total_count": 1, "branch_policies": [{"name": "v*", "type": "tag"}]}

    def get(self, url):
        return json.dumps(self.policies if url.endswith("deployment-branch-policies") else self.env).encode()

    def test_tag_requires_real_user_canonical_repository_and_review(self):
        self.assertTrue(release.preflight(self.context, "ActualNuGetUser", self.get))
        for key, bad in (("GITHUB_REPOSITORY", "fork/scanner"), ("GITHUB_REPOSITORY_ID", "1"),
                         ("GITHUB_REF", "refs/tags/v99.0.0")):
            with self.subTest(key=key), self.assertRaises(release.Refused):
                release.preflight({**self.context, key: bad}, "ActualNuGetUser", self.get)
        self.assertFalse(release.preflight({**self.context, "GITHUB_EVENT_NAME": "workflow_dispatch"}, ""))
        for bad in ("", "admin@example.com", "../owner"):
            with self.subTest(user=bad), self.assertRaises(release.Refused):
                release.preflight(self.context, bad, self.get)

    def test_branch_inspection_never_contacts_an_environment(self):
        with patch.object(release, "environment", side_effect=AssertionError("must not query")):
            self.assertFalse(release.preflight({**self.context, "GITHUB_REF": "refs/heads/main"}, ""))

    def test_wrong_or_missing_environment_protection_is_refused(self):
        for change in (lambda: self.env.update(protection_rules=[]),
                       lambda: self.env.update(name="release"),
                       lambda: self.env.update(deployment_branch_policy=None),
                       lambda: self.policies["branch_policies"][0].update(type="branch"),
                       lambda: self.env["protection_rules"][0]["reviewers"][0]["reviewer"].update(id=1)):
            saved = copy.deepcopy((self.env, self.policies))
            change()
            with self.assertRaises(release.Refused):
                release.environment(self.get)
            self.env, self.policies = saved

    def test_existing_versions_and_network_errors_never_become_upload_permission(self):
        with self.assertRaises(release.Refused):
            release.absent("1.2.3", lambda _: b'{"versions":["1.2.3"]}')
        release.absent("1.2.4", lambda _: b'{"versions":["1.2.3"]}')
        for status in (401, 403, 500):
            def failed(_):
                raise urllib.error.HTTPError("https://nuget.org", status, "refused", {}, io.BytesIO())
            with self.subTest(status=status), self.assertRaises(urllib.error.HTTPError) as raised:
                release.absent("1.2.3", failed)
            raised.exception.close()

    def test_signature_is_the_only_permitted_addition(self):
        original = {"README.md": b"guide", "native.dll": b"library"}
        release.compare_signed(zipped(original), zipped({**original, ".signature.p7s": b"signature"}))
        for changed in (original, {**original, ".signature.p7s": b""},
                        {**original, "native.dll": b"changed", ".signature.p7s": b"signature"},
                        {**original, "extra": b"file", ".signature.p7s": b"signature"}):
            with self.subTest(changed=changed), self.assertRaises(release.Refused):
                release.compare_signed(zipped(original), zipped(changed))

    def test_signature_verification_failure_is_fatal(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "package.nupkg"
            archive.write_bytes(zipped({"README.md": b"guide"}))
            signed = zipped({"README.md": b"guide", ".signature.p7s": b"not a valid signature"})
            def invalid(argv, **kwargs):
                self.assertEqual(argv[:3], ["dotnet", "nuget", "verify"])
                self.assertEqual(argv[-1], "--all")
                self.assertTrue(kwargs["check"])
                raise subprocess.CalledProcessError(1, argv)
            with self.assertRaises(subprocess.CalledProcessError):
                release.public_copy(archive, Path(tmp) / "signed", "1.2.3", lambda _: signed, invalid)

    def test_duplicate_zip_members_are_refused(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as archive:
            archive.writestr("one", b"first")
            with self.assertWarns(UserWarning):
                archive.writestr("one", b"second")
        with self.assertRaises(release.Refused):
            release.members(data.getvalue())

    def test_candidate_is_bound_to_the_producer_receipt(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            archive = folder / f"{release.PACKAGE}.{release.version()}.nupkg"
            archive.write_bytes(b"candidate")
            report = {"sha256": release.digest(b"candidate")}
            receipt = json.dumps(report).encode()
            (folder / "package.json").write_bytes(receipt)
            with patch.object(release.package, "inspect", return_value=report), \
                 patch.object(release.package, "read_floor"), \
                 patch.object(release.package, "floor_problems", return_value=[]):
                self.assertEqual(release.candidate(folder, folder, release.digest(receipt), "c" * 40), (archive, report))
                with self.assertRaises(release.Refused):
                    release.candidate(folder, folder, "0" * 64, "c" * 40)
                (folder / "package.json").write_text('{"sha256":"changed"}')
                with self.assertRaises(release.Refused):
                    release.candidate(folder, folder, release.digest(receipt), "c" * 40)

    def test_workflow_refuses_publication_gate_bypasses(self):
        wf = guards.load_yaml((release.ROOT / ".github/workflows/dotnet.yml").read_text())
        def judge(candidate):
            return guards.check_job("dotnet.yml", "publish", candidate["jobs"]["publish"], candidate)
        self.assertEqual(judge(wf), [])
        for mutate in (
            lambda w: w["jobs"]["publish"].update(environment="release"),
            lambda w: w["jobs"]["publish"].update(needs=["pack"]),
            lambda w: w["jobs"]["publish"].update(permissions={"contents": "write", "id-token": "write"}),
            lambda w: w["jobs"]["publish"].update(**{"if": "startsWith(github.ref, 'refs/tags/v')"}),
            lambda w: w["jobs"]["preflight"].update(**{"continue-on-error": True}),
            lambda w: w["jobs"]["publish"]["steps"].pop(5),
            lambda w: w["jobs"]["publish"]["steps"][-1].update(run=guards.DOTNET_PUSH + " --skip-duplicate"),
            lambda w: w["jobs"]["publish"]["steps"][3]["with"].update(**{"digest-mismatch": "warn"}),
        ):
            changed = copy.deepcopy(wf)
            mutate(changed)
            self.assertTrue(judge(changed))


if __name__ == "__main__":
    unittest.main()
