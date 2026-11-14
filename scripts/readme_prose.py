"""The six-link editorial contract for maintained scanner documentation."""
import re

# Source files share a guide only when they describe the same consumer surface.
GUIDES = {
    'bindings/dotnet/README.md': ('sdk/dotnet', '.NET'),
    'bindings/flutter/README.md': ('sdk/flutter', 'Flutter'),
    'bindings/flutter/example/README.md': ('sdk/flutter', 'Flutter'),
    'bindings/flutter/example/ios/Runner/Assets.xcassets/LaunchImage.imageset/README.md': ('sdk/flutter', 'Flutter'),
    'bindings/go/README.md': ('sdk/go', 'Go'),
    'bindings/kotlin/README.md': ('sdk/android', 'Android'),
    'bindings/php/README.md': ('sdk/php', 'PHP'),
    'bindings/swift/README.md': ('sdk/ios', 'iOS'),
    'crates/qrcode-ai-scanner/README.md': ('sdk/rust', 'Rust'),
    'crates/qrcode-ai-scanner-node/README.md': ('sdk/nodejs', 'Node.js'),
    'crates/qrcode-ai-scanner-py/README.md': ('sdk/python', 'Python'),
    'crates/qrcode-ai-scanner-wasm/README.md': ('sdk/javascript', 'JavaScript'),
    'crates/qrcode-ai-scanner-wasm/examples/README.md': ('sdk/javascript', 'JavaScript'),
    'distribution/npm/README.md': ('sdk/nodejs', 'Node.js'),
    'examples/notebooks/README.md': ('sdk/python', 'Python'),
    'examples/web-vite/README.md': ('sdk/javascript', 'JavaScript'),
    'playground/README.md': ('sdk/javascript', 'JavaScript'),
    'integrations/mcp/README.md': ('mcp', 'MCP'),
    'integrations/openclaw/README.md': ('integrations/openclaw', 'OpenClaw'),
    'skills/qrcode-barcode-scanner/README.md': ('skills', 'agent skill'),
    'tests/consumers/jitpack-android/README.md': ('sdk/android', 'Android'),
}
for _path in ('crates/qrcode-ai-scanner-cli', 'distribution/appimage', 'distribution/aur',
              'distribution/chocolatey', 'distribution/cli', 'distribution/debian',
              'distribution/docker', 'distribution/rpm'):
    GUIDES[f'{_path}/README.md'] = ('cli', 'command line')


def canonical_links(path):
    guide, _ = GUIDES.get(path, ('sdk', 'SDK'))
    root = 'https://qrcode-ai.com/en-US/'
    return [root + 'qr-code-scanner', root + 'barcode-scanner',
            root + 'qr-code-scanner/' + guide, root + 'barcode-scanner/' + guide,
            root + 'qr-code-generator', root + 'barcode-generator']


def prose_links(text):
    """Count Markdown links in sentences, excluding controls, lists, tables and code.

    A table immediately following a sentence still must not qualify as prose.
    Fenced prompts may repeat every URL without satisfying the description.
    """
    from readme_actions import strip_actions
    text = strip_actions(text)
    lines, fence = [], None
    for line in text.splitlines():
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', line)
        if fence is not None:
            # CommonMark closers have no info string and cannot be shorter than the opener.
            if (marker and marker[1][0] == fence[0] and len(marker[1]) >= fence[1]
                    and re.fullmatch(r'[ \t]*', marker[2])):
                fence = None
            lines.append('')
        elif marker and not (marker[1][0] == '`' and '`' in marker[2]):
            fence = (marker[1][0], len(marker[1]))
            lines.append('')
        elif line.startswith(('    ', '\t')) or re.match(r'^\s*(?:[#|<!>]|[-+*]\s|\d+[.)]\s|\[[^]]+\]:)', line):
            lines.append('')
        else:
            lines.append(line)
    found = set()
    for paragraph in '\n'.join(lines).split('\n\n'):
        plain = re.sub(r'!?\[[^]]*\]\([^)]*\)', '', paragraph)
        if len(plain.split()) >= 8 and re.search(r'[.!?:]', plain):
            found.update(re.findall(r'(?<!!)\[[^]\n]+\]\((https://[^\s)]+)\)', paragraph))
    return found
