"""Public README action format, shared by documentation producers (stdlib only)."""
import base64
import html
import json
import re
from urllib.parse import quote, urlencode, urlsplit

START = '<!-- qrcode-ai-readme-actions:v1 -->'
END = '<!-- /qrcode-ai-readme-actions:v1 -->'
ASSETS = 'https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/'
PROVIDERS = (
    ('chatgpt', 'ChatGPT', 'https://chatgpt.com/', 'q'),
    ('claude', 'Claude', 'https://claude.ai/new', 'q'),
    ('gemini', 'Gemini', 'https://aistudio.google.com/prompts/new_chat', 'prompt'),
    ('grok', 'Grok', 'https://grok.com/', 'q'),
    ('perplexity', 'Perplexity', 'https://www.perplexity.ai/', 'q'),
)


def public_url(value):
    parsed = urlsplit(value)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or re.search(r'[\s<>`]', value)):
        raise ValueError('README context needs an HTTPS public URL without credentials')
    return value


def question(title, source_url, links=(), scope='scanner', status='Source documentation; publication is not implied.'):
    if any(c in title + status for c in '\r\n`<>'):
        raise ValueError('README title and status must be plain single-line text')
    product = 'QR Code & Barcode Scanner, the open-source scanner' if scope == 'scanner' else 'QR Code AI, the connected product'
    if scope not in ('scanner', 'qrcodeai'):
        raise ValueError('Unknown product scope')
    sources = list(dict.fromkeys([public_url(source_url), *(public_url(url) for url in links)]))
    if len(sources) > 8:
        raise ValueError('Too many public context links')
    return (f'Help me understand {title} for {product}. {status} '
            'Read the public documentation below. Explain what this destination does, its documented '
            'installation or access steps, a minimal example if supported, prerequisites, limitations and license. '
            'Distinguish published packages from working source and preparation. Cite your sources; if a page '
            'is unavailable or a fact cannot be checked, say so. Do not invent installation commands, '
            'benchmark results or comparisons. Answer in my language. Public sources: ' + ' '.join(sources))


def ai_links(prompt):
    return [(key, label, base + '?' + urlencode({param: prompt}, quote_via=quote))
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
    if START not in text and END not in text:
        return text
    if text.count(START) != 1 or text.count(END) != 1:
        raise ValueError('Repeated or incomplete README action block')
    before, rest = text.split(START)
    block, after = rest.split(END)
    if not block.startswith('\n') or not after.startswith('\n\n'):
        raise ValueError('Malformed README action boundary')
    return before + after[2:]


def action_block(prompt, installers=()):
    badges = lambda rows: '\n'.join(f'[![{label}]({ASSETS}{key}-v1.svg)]({url})' for key, label, url in rows)
    installation = ''
    if installers:
        installation = ('\n\n' + badges(installers) + '\n\n'
                        'Open your editor to review the pinned MCP configuration before adding it. '
                        'Node.js must already be installed; local file access remains disabled by default.')
    return (START + '\n\n### Ask AI\n\n' + badges(ai_links(prompt)) + '\n\n'
            'Choose an AI assistant to explain this destination using its public sources. '
            'Gemini opens Google AI Studio. The link includes the public question; '
            'sign-in or a manual paste may be required. Check the answer against the documentation.\n\n'
            '<details>\n<summary>Copy the question</summary>\n\n```text\n' + prompt + '\n```\n\n</details>'
            + installation + '\n\n' + END + '\n\n')


def insert_actions(text, block):
    clean = strip_actions(text)
    heading = re.search(r'^# .+\n\n', clean, re.M)
    if not heading:
        raise ValueError('README needs a top-level heading')
    return clean[:heading.end()] + block + clean[heading.end():]


def badge_svg(label):
    # Original text-only artwork: no third-party brand geometry or remote fonts.
    width = len(label) * 8 + 32
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="36" viewBox="0 0 {width} 36" role="img" aria-label="{html.escape(label)}">'
            f'<title>{html.escape(label)}</title><rect x=".5" y=".5" width="{width - 1}" height="35" rx="18" fill="#18181b" stroke="#52525b"/>'
            f'<text x="{width / 2:g}" y="23" fill="#fafafa" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="middle">{html.escape(label)}</text></svg>\n')
