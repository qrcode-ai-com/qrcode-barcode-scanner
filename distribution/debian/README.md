# Debian and Ubuntu package recipe

This recipe packages the official 0.11.0 GNU/Linux CLI archives for Debian
`amd64` and `arm64`. It preserves the published `qrscan` executable, licenses,
notices and source reference. The package revision is `0.11.0-1`.

## Build

Put the two GNU/Linux archives, `qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS`
and `qrcode-barcode-scanner-cli-0.11.0-source.tar.gz` from the
[0.11.0 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0)
in an input directory. Run on Debian 12 with Bash, GNU tar, GNU coreutils, gzip and
`dpkg-deb` installed. Use a fresh output directory:

```sh
mkdir out
distribution/debian/build.sh amd64 ./input ./out
distribution/debian/build.sh arm64 ./input ./out
```

The recipe verifies the manifest, archive, source and executable hashes
before creating a package. The original source archive remains at the same
[corresponding source URL](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-source.tar.gz)
named in the installed documentation. Its SHA-256 is
`8e5e09f0ec8d93ae49ca35615c05bb1d326448b6de9757cef86ef48d7bf3a96d`.

## Install and test

After checking the distribution release's published SHA-256, install the
file for your architecture and check its scanner version:

```sh
sudo apt install ./qrcode-barcode-scanner_0.11.0-1_amd64.deb
qrscan --version
curl -fL -O https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/176ac96ef16ee330dbfc6ada10327d0b4e23a8b2/fixtures/symbology/mixed-code128-qr.png
for profile in fast frame full; do
  qrscan mixed-code128-qr.png --profile "$profile" --budget-ms 0
done
sudo apt purge qrcode-barcode-scanner
```

The release fixture [mixed-code128-qr.png](../../fixtures/symbology/mixed-code128-qr.png)
reports the QR URL `https://qrc-ai.com/76xMa` and Code 128 `STOCK-4827` together. The CLI runs locally.
See [QR Code AI](https://qrcode-ai.com/), the
[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the
[barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) for the web tools.
