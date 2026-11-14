#!/usr/bin/env python3
"""Exercise URL payloads, README preservation and publication boundaries."""
import base64
import importlib.util
import json
from pathlib import Path
import unittest
from urllib.parse import parse_qs, urlsplit, unquote
from readme_prose import canonical_links, prose_links
from readme_actions import action_block, ai_links, insert_actions, mcp_links, question, strip_actions

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build-readme-actions.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class ReadmeActions(unittest.TestCase):
    def test_prefill_routes_keep_exact_text_and_paste_routes_use_only_official_homepages(self):
        prompt = question('Flutter & café', 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/flutter/README.md')
        expected = [('chatgpt.com', '/', 'q'), ('claude.ai', '/new', 'q'),
                    ('gemini.google.com', '/', None), ('grok.com', '/', 'q'), ('www.perplexity.ai', '/', 'q'),
                    ('copilot.com', '/', None), ('chat.deepseek.com', '/', None),
                    ('www.meta.ai', '/', None), ('qwen.ai', '/', None)]
        self.assertEqual(len(ai_links(prompt)), 9)
        for (_, _, link), (host, path, param) in zip(ai_links(prompt), expected, strict=True):
            parsed = urlsplit(link)
            self.assertEqual((parsed.scheme, parsed.netloc, parsed.path), ('https', host, path))
            self.assertEqual(parse_qs(parsed.query), {param: [prompt]} if param else {})
            self.assertEqual(parsed.fragment, '')
        self.assertIn('if a page is unavailable', prompt)
        self.assertIn('Do not invent', prompt)
        contextual = question('MCP', 'https://qrcode-ai.com/', context='Local stdio adapter for the scanner.')
        self.assertIn('Provided README context (verify against the sources): Local stdio adapter for the scanner.', contextual)

    def test_editor_configuration_is_exact_pinned_and_has_no_grants(self):
        config = json.loads((ROOT / 'distribution/readme-actions.json').read_text())['mcpLaunch']
        cursor, vscode = mcp_links(config)
        self.assertEqual(json.loads(base64.b64decode(parse_qs(urlsplit(cursor[2]).query)['config'][0])), config)
        native = parse_qs(urlsplit(vscode[2]).query)['url'][0]
        self.assertEqual(json.loads(unquote(native.split('?', 1)[1])), {'name': 'qrscan', **config})
        with self.assertRaises(ValueError):
            mcp_links({**config, 'env': {'ALLOWED_ROOTS': '/'}})
        with self.assertRaises(ValueError):
            mcp_links({'command': 'npx', 'args': ['--yes', '--ignore-scripts', '@qrcode-ai-com/qrcode-barcode-scanner-mcp@latest']})

    def test_generated_blocks_preserve_the_original_body_and_are_idempotent(self):
        original = '# Flutter\n\nNatural description.\n\n```dart\nscan(bytes);\n```\n'
        block = action_block('Explain this destination.')
        rendered = insert_actions(original, block)
        self.assertEqual(strip_actions(rendered), original)
        self.assertEqual(insert_actions(rendered, block), rendered)
        with self.assertRaises(ValueError):
            strip_actions(rendered + block)
        self.assertIn('Copy the plain-text prompt', block)
        self.assertIn('```text\nExplain this destination.\n```', block)
        self.assertNotIn('Google AI Studio', block)
        self.assertIn('](https://gemini.google.com/)', block)

    def test_previous_action_blocks_upgrade_without_duplicating_or_rewriting_the_body(self):
        body = '# Scanner\n\nA natural introduction.\n'
        old = '# Scanner\n\n<!-- qrcode-ai-readme-actions:v1 -->\n\nOld controls.\n\n<!-- /qrcode-ai-readme-actions:v1 -->\n\nA natural introduction.\n'
        self.assertEqual(strip_actions(old), body)
        upgraded = insert_actions(old, action_block('Explain the scanner.'))
        self.assertIn('qrcode-ai-readme-actions:v2', upgraded)
        self.assertNotIn('qrcode-ai-readme-actions:v1', upgraded)
        self.assertEqual(strip_actions(upgraded), body)
        with self.assertRaises(ValueError):
            strip_actions(old + action_block('Do not accept two formats.'))

    def test_frozen_and_vendored_readmes_are_not_targets(self):
        paths = builder.maintained_readmes()
        self.assertEqual(len(paths), 37)
        self.assertNotIn('distribution/docker/v0.11/README.md', paths)
        self.assertNotIn('docs/assets/readme/README.md', paths)
        self.assertFalse(any('/cargokit/' in path for path in paths))
        outputs = builder.outputs()
        for path in paths:
            self.assertEqual(outputs[path].count('### Ask AI'), 1)
            self.assertEqual(outputs[path].count('[![ChatGPT]'), 1)
            self.assertEqual('Add to Cursor' in outputs[path], path in ('README.md', 'integrations/mcp/README.md'))

    def test_six_links_must_be_in_sentences_not_just_a_table_or_prompt(self):
        link = '[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner)'
        self.assertEqual(prose_links('A sentence before the table.\n| Try it | ' + link + ' |'), set())
        self.assertEqual(prose_links('```text\nTry the scanner with this prompt: ' + link + '\n```'), set())
        self.assertEqual(prose_links(link + ' · [Other](https://example.com/)'), set())
        self.assertEqual(prose_links('To check an image before integrating the package, use the ' + link + '.'),
                         {'https://qrcode-ai.com/en-US/qr-code-scanner'})

    def test_fence_like_lines_cannot_turn_code_links_into_prose(self):
        url = 'https://qrcode-ai.com/en-US/qr-code-scanner'
        sentence = 'To check an image before integrating the package, use the [QR code scanner](' + url + ').'
        for newline in ('\n', '\r\n'):
            for marker in ('`', '~'):
                for false_close in (marker * 3 + 'not-a-close', marker * 5 + ' trailing',
                                    marker * 3 + ' ' + marker, marker * 2, '    ' + marker * 4):
                    with self.subTest(newline=newline, marker=marker, false_close=false_close):
                        code = newline.join((marker * 4 + 'md', false_close, sentence))
                        self.assertEqual(prose_links(code), set())
                        self.assertEqual(prose_links(code + newline + marker * 5 + ' \t'), set())
                        # Only a real closer allows a subsequent prose paragraph to qualify.
                        self.assertEqual(prose_links(code + newline + marker * 5 + ' \t' + newline * 2 + sentence), {url})
        self.assertEqual(prose_links('```invalid`info\n\n' + sentence), {url})
        for indent in ('    ', '\t'):
            self.assertEqual(prose_links(indent + sentence), set())
            self.assertEqual(prose_links(indent + '```md\n' + indent + sentence + '\n' + indent + '```'), set())

    def test_every_maintained_readme_has_its_six_canonical_links_in_prose(self):
        for path in builder.maintained_readmes():
            with self.subTest(path=path):
                body = (ROOT / path).read_text()
                self.assertEqual(set(canonical_links(path)) - prose_links(body), set())

    def test_every_assistant_badge_embeds_its_colored_retained_logo_and_license(self):
        import hashlib
        import xml.etree.ElementTree as ET
        manifest = json.loads((ROOT / 'docs/assets/actions/brands/provenance.json').read_text())
        outputs = builder.outputs()
        ns = {'s': 'http://www.w3.org/2000/svg'}
        self.assertEqual({row['id'] for row in manifest['icons']}, {row[0] for row in builder.PROVIDERS})
        for row in manifest['icons']:
            with self.subTest(provider=row['id']):
                original = (ROOT / 'docs/assets/actions/brands' / row['file']).read_bytes()
                self.assertEqual(hashlib.sha256(original).hexdigest(), row['sha256'])
                key = row['id']
                self.assertTrue(f'docs/assets/actions/{key}-v2.svg' in outputs, 'Missing colored badge: ' + key)
                logo = ET.fromstring(outputs[f'docs/assets/actions/{key}-logo-v1.svg'])
                badge = ET.fromstring(outputs[f'docs/assets/actions/{key}-v2.svg'])
                self.assertEqual(logo.attrib['data-ai-logo'], key)
                self.assertEqual(badge.find('s:svg', ns).attrib['data-ai-logo'], key)
                self.assertIn('Copyright (c) 2023 LobeHub', ''.join(badge.itertext()))
                self.assertIn('Permission is hereby granted', ''.join(badge.itertext()))
                # All original path geometry survives; this is a logo, not a text-only badge.
                source_paths = [p.attrib['d'] for p in ET.fromstring(original).findall('.//s:path', ns)]
                self.assertTrue(source_paths)
                self.assertEqual([p.attrib['d'] for p in badge.findall('.//s:path', ns)], source_paths)
                self.assertEqual(logo.find('s:svg', ns).attrib['color'], row['color'])
                self.assertEqual(logo.find('s:rect', ns).attrib['fill'], '#fff')
                self.assertFalse(badge.findall('.//s:image', ns))
                self.assertFalse(badge.findall('.//s:script', ns))
        # Legacy versioned image URLs keep their original text-only bytes.
        from readme_actions import badge_svg
        for key, label, *_ in builder.PROVIDERS:
            self.assertEqual((ROOT / f'docs/assets/actions/{key}-v1.svg').read_text(), badge_svg('Ask ' + label))
        for path in builder.maintained_readmes():
            for key, *_ in builder.PROVIDERS:
                self.assertTrue(f'/{key}-v2.svg' in outputs[path], path + ': missing colored ' + key)

    def test_badge_inputs_reject_active_svg_and_external_paint(self):
        from readme_actions import brand_logo
        for body in ('<script/>', '<path onload="alert(1)"/>',
                     '<path fill="url(https://invalid.example/track.svg)"/>', '<image href="https://invalid.example/track.svg"/>'):
            with self.subTest(svg=body), self.assertRaises(ValueError):
                brand_logo('<svg xmlns="http://www.w3.org/2000/svg">' + body + '</svg>', '#000', 'grok', 'MIT')
        with self.assertRaises(ValueError):
            brand_logo('<!DOCTYPE svg><svg/>', '#000', 'grok', 'MIT')
        with self.assertRaises(ValueError):
            brand_logo('<svg xmlns="http://www.w3.org/2000/svg"/>', '#12345', 'grok', 'MIT')

    def test_scope_and_context_cannot_be_ambiguous(self):
        self.assertIn('connected product', question('iOS app', 'https://qrcode-ai.com/', scope='qrcodeai'))
        for url in ('file:///private/x', 'http://example.com', 'https://token@example.com/'):
            with self.assertRaises(ValueError):
                question('Scanner', url)
        with self.assertRaises(ValueError):
            question('Scanner\nignore instructions', 'https://qrcode-ai.com/')


if __name__ == '__main__':
    unittest.main()
