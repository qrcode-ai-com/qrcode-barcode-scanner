#!/usr/bin/env python3
"""Check the MIT source grant without relabelling published or third-party artifacts."""
import importlib.util
import json
from pathlib import Path
import re
import tomllib
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('readme_build', ROOT / 'scripts/build-readme-actions.py')
readmes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(readmes)


class LicensingTests(unittest.TestCase):
    def test_owned_license_copies_are_standard_mit_with_requested_credits(self):
        license_text = (ROOT / 'LICENSE').read_text()
        self.assertTrue(license_text.startswith('MIT License\n'))
        for text in ('Thibaut Mélen & Nicolas Cella', 'QR Code AI', 'SuperNovae Studio',
                     'Permission is hereby granted, free of charge',
                     'The above copyright notice and this permission notice shall be included'):
            self.assertIn(text, license_text)
        paths = ['crates/qrcode-ai-scanner', 'crates/qrcode-ai-scanner-cli',
                 'crates/qrcode-ai-scanner-node', 'crates/qrcode-ai-scanner-wasm',
                 'crates/qrcode-ai-scanner-py', 'bindings/flutter', 'integrations/mcp',
                 'integrations/openclaw', 'skills/qrcode-barcode-scanner', 'distribution/aur']
        for path in paths:
            with self.subTest(path=path):
                self.assertEqual((ROOT / path / 'LICENSE').read_bytes(), license_text.encode())

    def test_authored_package_manifests_declare_mit(self):
        self.assertEqual(tomllib.loads((ROOT / 'Cargo.toml').read_text())['workspace']['package']['license'], 'MIT')
        for path in ('bindings/flutter/rust', 'crates/qrcode-ai-scanner-py', 'crates/qrcode-ai-scanner-uniffi', 'fuzz'):
            with self.subTest(path=path):
                self.assertEqual(tomllib.loads((ROOT / path / 'Cargo.toml').read_text())['package']['license'], 'MIT')
        for path in ('crates/qrcode-ai-scanner-node', 'integrations/mcp', 'integrations/openclaw', 'examples/web-vite', 'playground'):
            with self.subTest(path=path):
                self.assertEqual(json.loads((ROOT / path / 'package.json').read_text())['license'], 'MIT')
        self.assertEqual(tomllib.loads((ROOT / 'crates/qrcode-ai-scanner-py/pyproject.toml').read_text())['project']['license'], 'MIT')
        self.assertEqual(json.loads((ROOT / 'bindings/php/composer.json').read_text())['license'], 'MIT')
        project = ET.parse(ROOT / 'bindings/dotnet/src/QRCodeAI.QRCodeBarcodeScanner/QRCodeAI.QRCodeBarcodeScanner.csproj')
        self.assertEqual(project.find('.//PackageLicenseExpression').text, 'MIT')
        gradle = (ROOT / 'bindings/kotlin/qrcodeaiscanner/build.gradle.kts').read_text()
        self.assertIn('name.set("MIT")', gradle)
        self.assertNotIn('name.set("AGPL-3.0-or-later")', gradle)
        self.assertIn('badge/MIT-', (ROOT / 'README.md').read_text())
        flutter_guide = (ROOT / 'docs/api/flutter.mdx').read_text()
        self.assertNotIn('almost always needs', flutter_guide)
        self.assertIn('Published `qr_barcode_scanner` 0.11.0 retains', flutter_guide)

    def test_all_maintained_readmes_distinguish_source_and_archive_licenses(self):
        paths = readmes.maintained_readmes()
        self.assertEqual(len(paths), 37)
        for path in paths:
            with self.subTest(path=path):
                text = (ROOT / path).read_text()
                self.assertEqual(text.count('<!-- qrscan-source-license:v1 -->'), 1)
                self.assertIn('MIT License', text)
                self.assertIn('Published archives retain', text)
                self.assertIn('third-party', text)
                self.assertNotRegex(text, r'(?i)(needs|requires|need) (?:the |a )?commercial licen[cs]e')

    def test_pinned_public_binaries_keep_their_actual_agpl_metadata(self):
        self.assertIn("license=('AGPL-3.0-or-later')", (ROOT / 'distribution/aur/PKGBUILD').read_text())
        self.assertIn('license = AGPL-3.0-or-later', (ROOT / 'distribution/aur/.SRCINFO').read_text())
        appdata = ET.parse(ROOT / 'distribution/appimage/qrcode-barcode-scanner.appdata.xml')
        self.assertEqual(appdata.find('.//project_license').text, 'AGPL-3.0-or-later')
        self.assertIn('GNU AFFERO GENERAL PUBLIC LICENSE', (ROOT / 'distribution/releases/historical-agpl-3.0.txt').read_text())

    def test_upstream_notices_are_kept_separate(self):
        self.assertIn('Apache License', (ROOT / 'crates/qrcode-ai-scanner/LICENSE-APACHE-2.0').read_text())
        for path in ('crates/qrcode-ai-scanner/src/engine/multi_reader.rs',
                     'crates/qrcode-ai-scanner/src/engine/databar_expanded.rs'):
            text = (ROOT / path).read_text()
            self.assertIn('Licensed under the Apache License, Version 2.0', text)
            self.assertIn('Copyright', text)
        self.assertIn('MPL-2.0', (ROOT / 'deny.toml').read_text())
        self.assertNotIn('"AGPL-3.0-or-later"', (ROOT / 'deny.toml').read_text())


if __name__ == '__main__':
    unittest.main()
