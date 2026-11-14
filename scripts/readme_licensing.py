"""Current-source MIT prose, separate from immutable artifact license facts."""
import re

START = '<!-- qrscan-source-license:v1 -->'
END = '<!-- /qrscan-source-license:v1 -->'
ROOT = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/'


def license_section():
    return (START + '\n\n## Source license\n\n'
            'Project-authored scanner code and documentation in this checkout are available under the '
            f'[MIT License]({ROOT}LICENSE). You may use, modify and redistribute this source in open-source '
            'or proprietary applications, including commercial products, while preserving the copyright '
            'and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.\n\n'
            'Retained third-party code, dependencies, artwork and test data keep their own licenses and '
            f'notices. The [licensing guide]({ROOT}LICENSING.md) explains these component boundaries; '
            'the project license does not assign a license to an unrelated platform or service.\n\n'
            'Published archives retain the license shipped with their version. A pinned engine, adapter '
            'or bundle may therefore have different terms from this working source. Read its packaged '
            f'license and the [license history]({ROOT}docs/guides/license-history.mdx) before reuse. '
            'The source change does not replace an archive or publish a new version.\n\n' + END + '\n')


def with_license(text):
    if START in text or END in text:
        if text.count(START) != 1 or text.count(END) != 1:
            raise ValueError('Repeated or incomplete source-license section')
        text = re.sub(re.escape(START) + r'.*?' + re.escape(END), '', text, flags=re.S)
    return text.rstrip() + '\n\n' + license_section()
