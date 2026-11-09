# Arch Linux package recipe

`qrcode-barcode-scanner-bin` installs the upstream `qrscan` executable for
x86_64 Arch Linux. The recipe verifies the official
[0.11.0 release archive](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0)
and keeps the executable bytes unchanged. It conflicts with other packages
providing `qrscan`, including the unrelated AUR `qrscan-bin`.

Use `makepkg -si` from this directory to build and install the package.
Check `qrscan --version` and scan the
[mixed QR and Code 128 sample](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/fixtures/symbology/mixed-code128-qr.png)
to exercise both formats.

The recipe is licensed under [0BSD](LICENSE). The executable retains its
AGPL-3.0-or-later license, notices and build metadata. The release provides the
[corresponding source archive](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-source.tar.gz)
and [SHA-256 manifest](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS).

[QR Code AI](https://qrcode-ai.com/) · [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) ·
[Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner)
