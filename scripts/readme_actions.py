"""Public README action format, shared by documentation producers (stdlib only)."""
import base64
import copy
import html
import json
import re
import xml.etree.ElementTree as ET
from urllib.parse import quote, urlencode, urlsplit

START = '<!-- qrcode-ai-readme-actions:v2 -->'
END = '<!-- /qrcode-ai-readme-actions:v2 -->'
ASSETS = 'https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/'
PROVIDERS = (
    ('chatgpt', 'ChatGPT', 'https://chatgpt.com/', 'q'),
    ('claude', 'Claude', 'https://claude.ai/new', 'q'),
    ('gemini', 'Gemini', 'https://gemini.google.com/', None),
    ('grok', 'Grok', 'https://grok.com/', 'q'),
    ('perplexity', 'Perplexity', 'https://www.perplexity.ai/', 'q'),
    ('copilot', 'Copilot', 'https://copilot.com/', None),
    ('deepseek', 'DeepSeek', 'https://chat.deepseek.com/', None),
    ('meta-ai', 'Meta AI', 'https://www.meta.ai/', None),
    ('qwen', 'Qwen', 'https://qwen.ai/', None),
)


def public_url(value):
    parsed = urlsplit(value)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or re.search(r'[\s<>`]', value)):
        raise ValueError('README context needs an HTTPS public URL without credentials')
    return value


def question(title, source_url, links=(), scope='scanner', status='Source documentation; publication is not implied.', context=''):
    if len(context) > 800 or any(c in title + status + context for c in '\r\n`<>'):
        raise ValueError('README title and status must be plain single-line text')
    product = 'QR Code & Barcode Scanner, the open-source scanner' if scope == 'scanner' else 'QR Code AI, the connected product'
    if scope not in ('scanner', 'qrcodeai'):
        raise ValueError('Unknown product scope')
    sources = list(dict.fromkeys([public_url(source_url), *(public_url(url) for url in links)]))
    if len(sources) > 8:
        raise ValueError('Too many public context links')
    return (f'Help me understand {title} for {product}. {status} '
            + (f'Provided README context (verify against the sources): {context} ' if context else '') +
            'Read the public documentation below. Explain what this destination does, its documented '
            'installation or access steps, a minimal example if supported, prerequisites, limitations and license. '
            'Distinguish published packages from working source and preparation. Cite your sources; if a page '
            'is unavailable or a fact cannot be checked, say so. Do not invent installation commands, '
            'benchmark results or comparisons. Answer in my language. Public sources: ' + ' '.join(sources))


def ai_links(prompt):
    return [(key, label, base + ('?' + urlencode({param: prompt}, quote_via=quote) if param else ''))
            for key, label, base, param in PROVIDERS]


def mcp_links(config):
    # The policy is a reviewed public version, independent from the engine train.
    if (set(config) != {'command', 'args'} or config['command'] != 'npx'
            or len(config['args']) != 3 or config['args'][:2] != ['--yes', '--ignore-scripts']
            or not re.fullmatch(r'@qrcode-ai-com/qrcode-barcode-scanner-mcp@\d+\.\d+\.\d+', config['args'][2])):
        raise ValueError('Only the reviewed, pinned MCP launch configuration is supported')
    compact = lambda value: json.dumps(value, separators=(',', ':'))
    cursor = 'https://cursor.com/install-mcp?' + urlencode({
        'name': 'qrscan', 'config': base64.b64encode(compact(config).encode()).decode()}, quote_via=quote)
    vscode = 'vscode:mcp/install?' + quote(compact({'name': 'qrscan', **config}), safe='')
    return [('cursor', 'Add to Cursor', cursor),
            ('vscode', 'Add to VS Code', 'https://vscode.dev/redirect?' + urlencode({'url': vscode}, quote_via=quote))]


def strip_actions(text):
    tokens = re.findall(r'<!-- /?qrcode-ai-readme-actions:v\d+ -->', text)
    if not tokens:
        return text
    if len(tokens) != 2:
        raise ValueError('Repeated or incomplete README action block')
    version = next((v for v in (1, 2) if tokens == [f'<!-- qrcode-ai-readme-actions:v{v} -->',
                                                   f'<!-- /qrcode-ai-readme-actions:v{v} -->']), None)
    if version is None:
        raise ValueError('Unknown or mismatched README action format')
    before, rest = text.split(tokens[0])
    block, after = rest.split(tokens[1])
    if not block.startswith('\n') or not after.startswith('\n\n'):
        raise ValueError('Malformed README action boundary')
    return before + after[2:]


def action_block(prompt, installers=()):
    badges = lambda rows: '\n'.join(f'[![{label}]({ASSETS}{key}-v{2 if key in {p[0] for p in PROVIDERS} else 1}.svg)]({url})' for key, label, url in rows)
    installation = ''
    if installers:
        installation = ('\n\n' + badges(installers) + '\n\n'
                        'Open your editor to review the pinned MCP configuration before adding it. '
                        'Node.js must already be installed; local file access remains disabled by default.')
    return (START + '\n\n### Ask AI\n\n' + badges(ai_links(prompt)) + '\n\n'
            'Choose an AI assistant to explain this destination using its public sources. '
            'Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require '
            'pasting the prompt below; the other links include it in their URL. Sign-in or a manual '
            'paste may still be required. Check the answer against the documentation.\n\n'
            '<details>\n<summary>Copy the plain-text prompt</summary>\n\n'
            'Use the code block\'s copy control, or select its complete text, then paste it into your assistant.\n\n'
            '```text\n' + prompt + '\n```\n\n</details>'
            + installation + '\n\n' + END + '\n\n')


def insert_actions(text, block):
    clean = strip_actions(text)
    heading = re.search(r'^# .+\n\n', clean, re.M)
    if not heading:
        raise ValueError('README needs a top-level heading')
    return clean[:heading.end()] + block + clean[heading.end():]


SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)


def _retained_svg(text):
    # Build-time retained inputs only: standalone badges never fetch or execute anything.
    if len(text) > 50000 or '<!' in text:
        raise ValueError('Unsupported retained SVG')
    root = ET.fromstring(text)
    allowed = {'svg', 'title', 'metadata', 'rect', 'path', 'g', 'defs', 'linearGradient', 'radialGradient', 'stop'}
    for node in root.iter():
        if node.tag not in {f'{{{SVG}}}{name}' for name in allowed}:
            raise ValueError('Unsupported SVG element')
        for name, value in node.attrib.items():
            if name.lower().startswith('on') or name.endswith('href') or 'javascript:' in value.lower():
                raise ValueError('Active SVG is not supported')
            if 'url(' in value and not re.fullmatch(r'url\(#[A-Za-z0-9_-]+\)', value):
                raise ValueError('Only local SVG paint references are supported')
    if root.tag != f'{{{SVG}}}svg':
        raise ValueError('Expected an SVG root')
    return root


def brand_logo(svg, color, provider, license_text):
    if provider not in {row[0] for row in PROVIDERS} or not re.fullmatch(r'#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})', color):
        raise ValueError('Unknown provider or display color')
    original = _retained_svg(svg)
    root = ET.Element(f'{{{SVG}}}svg', {'width': '24', 'height': '24', 'viewBox': '0 0 24 24', 'data-ai-logo': provider})
    ET.SubElement(root, f'{{{SVG}}}metadata').text = license_text
    # A fixed light tile keeps original black/colored geometry visible in either host theme.
    ET.SubElement(root, f'{{{SVG}}}rect', {'width': '24', 'height': '24', 'rx': '5', 'fill': '#fff'})
    original.attrib.update({'x': '2', 'y': '2', 'width': '20', 'height': '20', 'color': color})
    root.append(original)
    return ET.tostring(root, encoding='unicode') + '\n'


def badge_svg(label, logo=None):
    # Keep legacy v1 text-only bytes exact; v2 embeds retained, licensed brand geometry.
    width = len(label) * 8 + 32
    if logo is not None:
        mark = copy.deepcopy(_retained_svg(logo))
        mark.attrib.update({'x': '8', 'y': '6', 'width': '24', 'height': '24'})
        width += 28
        return (f'<svg xmlns="{SVG}" width="{width}" height="36" viewBox="0 0 {width} 36" role="img" aria-label="{html.escape(label)}">'
                f'<title>{html.escape(label)}</title><rect x=".5" y=".5" width="{width - 1}" height="35" rx="18" fill="#18181b" stroke="#52525b"/>'
                + ET.tostring(mark, encoding='unicode') +
                f'<text x="{(width + 32) / 2:g}" y="23" fill="#fafafa" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="middle">{html.escape(label)}</text></svg>\n')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="36" viewBox="0 0 {width} 36" role="img" aria-label="{html.escape(label)}">'
            f'<title>{html.escape(label)}</title><rect x=".5" y=".5" width="{width - 1}" height="35" rx="18" fill="#18181b" stroke="#52525b"/>'
            f'<text x="{width / 2:g}" y="23" fill="#fafafa" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="middle">{html.escape(label)}</text></svg>\n')
