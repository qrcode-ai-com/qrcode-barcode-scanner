#!/usr/bin/env python3
"""Render/check the maintained README badges; never change frozen evidence."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tomllib
from readme_actions import PROVIDERS, action_block, badge_svg, insert_actions, mcp_links, question, strip_actions

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/'


def maintained_readmes():
    paths = subprocess.check_output(['git', 'ls-files', '*README.md', 'README.md'], cwd=ROOT, text=True).splitlines()
    rules = tomllib.loads((ROOT / 'distribution/releases/pins.toml').read_text())
    frozen = [pattern for rule in rules['frozen'] for pattern in rule['paths']]
    from fnmatch import fnmatch
    return [path for path in paths if '/cargokit/' not in path and not any(fnmatch(path, pattern) for pattern in frozen)]


def outputs():
    config = json.loads((ROOT / 'distribution/readme-actions.json').read_text())['mcpLaunch']
    result = {}
    for path in maintained_readmes():
        text = (ROOT / path).read_text()
        clean = strip_actions(text)
        title = re.search(r'^# (.+)$', clean, re.M)[1]
        urls = list(dict.fromkeys(re.findall(r'https://qrcode-ai\.com/en-US/[a-zA-Z0-9/_-]+', clean)))[:6]
        paragraphs = [part.replace('\n', ' ').strip() for part in clean.split('\n\n')]
        context = next((part for part in paragraphs if len(part) > 60 and not part.startswith(('#', '[', '|', '<', '!', '```', '>'))), '')
        context = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', context)
        context = re.sub(r'[`<>*]', '', context)[:500]
        prompt = question(f'{title} ({path})', REPOSITORY + path, urls, context=context)
        installers = mcp_links(config) if path in ('README.md', 'integrations/mcp/README.md') else ()
        result[path] = insert_actions(text, action_block(prompt, installers))
    for key, label, *_ in PROVIDERS:
        result[f'docs/assets/actions/{key}-v1.svg'] = badge_svg('Ask ' + label)
    for key, label, _ in mcp_links(config):
        result[f'docs/assets/actions/{key}-v1.svg'] = badge_svg(label)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    stale = []
    for path, expected in outputs().items():
        file = ROOT / path
        if not file.exists() or file.read_text() != expected:
            stale.append(path)
            if not args.check:
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(expected)
    if args.check and stale:
        raise SystemExit('Stale README actions: ' + ', '.join(stale))
    print(f'README actions: {len(maintained_readmes())} maintained documents; frozen and vendored documents excluded')


if __name__ == '__main__':
    main()
