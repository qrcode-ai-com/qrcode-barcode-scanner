# Arch Linux package recipe

`qrcode-barcode-scanner-bin` installs the upstream `qrscan` executable for
x86_64 Arch Linux. The recipe verifies the official
[0.11.0 release archive](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0)
and keeps the executable bytes unchanged. It conflicts with other packages
providing `qrscan`, including the unrelated AUR `qrscan-bin`.

Install from the [public AUR package](https://aur.archlinux.org/packages/qrcode-barcode-scanner-bin)
on Arch Linux x86_64.

```sh
git clone https://aur.archlinux.org/qrcode-barcode-scanner-bin.git
cd qrcode-barcode-scanner-bin
makepkg -si
```

Check `qrscan --version` and scan the
[mixed QR and Code 128 sample](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/fixtures/symbology/mixed-code128-qr.png)
to exercise both formats.

The recipe is licensed under [0BSD](LICENSE). The executable retains its
AGPL-3.0-or-later license, notices and build metadata. The release provides the
[corresponding source archive](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-source.tar.gz)
and [SHA-256 manifest](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS).

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Command line guide** | [QR code scanner for the command line](https://qrcode-ai.com/en-US/qr-code-scanner/cli) | [Barcode scanner for the command line](https://qrcode-ai.com/en-US/barcode-scanner/cli) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |
