# Fedora RPM recipe

This recipe packages the official scanner 0.11.0 GNU/Linux CLI for Fedora.
The executable stays byte-identical to the published `qrscan` on x86_64 and
aarch64. The package includes the licenses, notices, and source reference.

## Build

Use Fedora 44 with `rpm-build`, `coreutils`, `gzip`, and `tar` installed.
Download both GNU/Linux archives and the corresponding source archive from
the [engine release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0).
Place the three files under a fresh RPM top directory and build on the desired
architecture:

```sh
mkdir -p "$PWD/rpm-build/SOURCES"
# Copy the three engine archives to rpm-build/SOURCES.
rpmbuild -ba --define "_topdir $PWD/rpm-build" distribution/rpm/qrcode-barcode-scanner.spec
```

The spec pins the SHA-256 of all three inputs and verifies the selected
executable before packaging. The source RPM includes the same three archives
and spec for an offline rebuild. The binary RPM contains a link to the
[corresponding source](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-source.tar.gz).

## Install and test

On Fedora 44, choose the RPM for your architecture and verify it against the
SHA-256 manifest that accompanies the release. The package revision is
`0.11.0-1.fc44` and the CLI reports `qrscan 0.11.0`.

```sh
sha256sum --check --ignore-missing qrcode-barcode-scanner-rpm-0.11.0-1.fc44-SHA256SUMS
sudo dnf install "./qrcode-barcode-scanner-0.11.0-1.fc44.$(uname -m).rpm"
qrscan --version
```

Download the [mixed fixture](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/v0.11.0/fixtures/symbology/mixed-code128-qr.png)
as `mixed-code128-qr.png`. The report for each profile contains the QR URL
`https://qrc-ai.com/76xMa` and the Code 128 value `STOCK-4827`. The CLI runs
locally.

```sh
for profile in fast frame full; do
  qrscan mixed-code128-qr.png --profile "$profile" --budget-ms 0
done
sudo dnf remove qrcode-barcode-scanner
```


| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Command line guide** | [QR code scanner for the command line](https://qrcode-ai.com/en-US/qr-code-scanner/cli) | [Barcode scanner for the command line](https://qrcode-ai.com/en-US/barcode-scanner/cli) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |
