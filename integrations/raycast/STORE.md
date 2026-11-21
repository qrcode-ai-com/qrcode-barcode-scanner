# QR Code & Barcode Scanner

Read every QR code and barcode in an image on your Mac, then copy each decoded text or the full scan report. Select the image in Finder, or copy the image file, and run **Scan Image for Codes**.

The extension runs `qrscan`, the command line of the open-source [QR Code & Barcode Scanner](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust) engine. The scan happens on your Mac: the image is sent nowhere, and the extension makes no network request.

## Setup

Install `qrscan` once with Homebrew:

```sh
brew install qrcode-ai-com/tap/qrscan
```

The extension finds `qrscan` in `/opt/homebrew/bin`, `/usr/local/bin` and `~/.cargo/bin`. If yours is somewhere else, set **qrscan Path** in the extension preferences. When `qrscan` is missing, the command says where it looked and offers to copy the install command.

## Use

1. Select a PNG, JPEG, WebP or GIF image in Finder. When Finder is not in front, the command reads the image file on the clipboard instead.
2. Run **Scan Image for Codes**.
3. Each code is one item, with its text and its format. Press Enter to copy the text, or open the actions:
   - **Paste Text** pastes the text into the app in front.
   - **Copy All Texts** copies every text of the image, one per line.
   - **Copy Scan Report** copies the engine's JSON report: formats, exact bytes, positions and the quality score.

Several codes of different formats in one image come back together. With the Full and Fast profiles, the first code carries a score tag that says how well it scans, from 0 to 100.

Decoded text comes from an image anyone can make. The extension only shows, copies and pastes it; it never opens a link it reads.

## Preferences

- **Scan Profile**: Full, the default, searches longest, reads the most damaged codes and gives the full score. Fast stops sooner and gives a reduced score. Frame decodes only and gives no score. When Fast or Frame runs out of time, the list says so, because an empty result is then not final.
- **qrscan Path**: the full path of `qrscan`, when it is not in one of the usual places.

## Formats

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

## License

The extension is MIT. It carries no engine code: it runs the `qrscan` you install as a separate program, which keeps the license of its own release (AGPL-3.0-or-later for `qrscan` 0.11.0). The source of both is in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust), maintained for [QR Code AI](https://qrcode-ai.com/).
