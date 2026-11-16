#!/usr/bin/env python3
"""Reject README extraction drift, substituted installs and incorrect scan results."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile

from consumer_truth import conforming_report, load

spec = importlib.util.spec_from_file_location("dotnet_readme", Path(__file__).with_name("dotnet-readme.py"))
readme = importlib.util.module_from_spec(spec)
spec.loader.exec_module(readme)


class ReadmeConsumer(unittest.TestCase):
    def test_repository_readme_has_one_complete_program(self):
        program = readme.example((readme.ROOT / "bindings/dotnet/README.md").read_bytes())
        self.assertIn(b"using QRCodeAI.QRCodeBarcodeScanner;", program)
        self.assertIn(b"Console.WriteLine(report.Json);", program)

    def test_extract_preserves_program_and_refuses_ambiguous_blocks(self):
        valid = readme.MARKER + '\n```csharp\nConsole.WriteLine("hello");\n```\n'
        self.assertEqual(readme.example(valid.encode()), b'Console.WriteLine("hello");\n')
        self.assertEqual(readme.example(valid.replace("\n", "\r\n").encode()), b'Console.WriteLine("hello");\r\n')
        for bad in (valid.replace(readme.MARKER, ""), valid + valid, valid[:-5],
                    readme.MARKER + "\n```csharp\n\n```\n", valid.replace("```csharp", "```text")):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                readme.example(bad.encode())

    def test_example_comes_from_identical_installed_package(self):
        version = "test-version"
        original = (readme.MARKER + '\n```csharp\nreturn 0;\n```\n').encode()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "candidate.nupkg"
            with zipfile.ZipFile(archive, "w") as package:
                package.writestr("README.md", original)
            folder = root / "cache" / readme.PACKAGE.lower() / version
            folder.mkdir(parents=True)
            cached = folder / "installed.nupkg"
            cached.write_bytes(archive.read_bytes())
            installed = folder / "README.md"
            installed.write_bytes(original)
            self.assertEqual(readme.installed(archive, root / "cache", version), (original, b"return 0;\n"))
            installed.write_bytes(original + b"changed")
            with self.assertRaisesRegex(ValueError, "installed README"):
                readme.installed(archive, root / "cache", version)
            installed.write_bytes(original)
            cached.write_bytes(b"another archive")
            with self.assertRaisesRegex(ValueError, "different archive"):
                readme.installed(archive, root / "cache", version)

    def test_exact_mixed_content_empty_and_refusal(self):
        versions = {"scanner": "test-version", "pipeline": 5, "score_contract": 5}
        for case in load()["cases"]:
            if case["id"] not in readme.CASES:
                continue
            with self.subTest(case=case["id"]):
                if "error" in case:
                    valid = subprocess.CompletedProcess([], 1, "", "ScanFailed: QRS-001: not an image\n")
                    self.assertEqual(readme.check_result(case, valid, versions)["error"], "QRS-001")
                    for bad in (subprocess.CompletedProcess([], 0, "", valid.stderr),
                                subprocess.CompletedProcess([], 1, "", "ScanFailed: QRS-002: wrong\n"),
                                subprocess.CompletedProcess([], 1, "{}", valid.stderr)):
                        with self.assertRaises(ValueError):
                            readme.check_result(case, bad, versions)
                    continue
                report = conforming_report(case, versions)
                def result(value):
                    return subprocess.CompletedProcess([], 0, json.dumps(value), "")
                self.assertEqual(readme.check_result(case, result(report), versions)["exit"], 0)
                changed = copy.deepcopy(report)
                changed["trace"]["budget_exhausted"] = True
                with self.assertRaises(ValueError):
                    readme.check_result(case, result(changed), versions)
                changed = copy.deepcopy(report)
                changed["versions"]["scanner"] = "wrong-version"
                with self.assertRaises(ValueError):
                    readme.check_result(case, result(changed), versions)
                if report["detections"]:
                    changed = copy.deepcopy(report)
                    changed["detections"][1]["content"]["text"] = "WRONG"
                    with self.assertRaises(ValueError):
                        readme.check_result(case, result(changed), versions)


if __name__ == "__main__":
    unittest.main()
