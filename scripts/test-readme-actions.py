#!/usr/bin/env python3
"""Exercise URL payloads, README preservation and publication boundaries."""
import base64
import importlib.util
import json
from pathlib import Path
import unittest
from urllib.parse import parse_qs, urlsplit, unquote
from readme_actions import action_block, ai_links, insert_actions, mcp_links, question, strip_actions

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build-readme-actions.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class ReadmeActions(unittest.TestCase):
    def test_each_ai_receives_the_exact_unicode_question(self):
        prompt = question('Flutter & café', 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/flutter/README.md')
        expected = [('chatgpt.com', '/', 'q'), ('claude.ai', '/new', 'q'),
                    ('aistudio.google.com', '/prompts/new_chat', 'prompt'), ('grok.com', '/', 'q'), ('www.perplexity.ai', '/', 'q')]
        for (_, _, link), (host, path, param) in zip(ai_links(prompt), expected, strict=True):
            parsed = urlsplit(link)
            self.assertEqual((parsed.scheme, parsed.netloc, parsed.path), ('https', host, path))
            self.assertEqual(parse_qs(parsed.query), {param: [prompt]})
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
        self.assertIn('Copy the question', block)

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

    def test_scope_and_context_cannot_be_ambiguous(self):
        self.assertIn('connected product', question('iOS app', 'https://qrcode-ai.com/', scope='qrcodeai'))
        for url in ('file:///private/x', 'http://example.com', 'https://token@example.com/'):
            with self.assertRaises(ValueError):
                question('Scanner', url)
        with self.assertRaises(ValueError):
            question('Scanner\nignore instructions', 'https://qrcode-ai.com/')


if __name__ == '__main__':
    unittest.main()
