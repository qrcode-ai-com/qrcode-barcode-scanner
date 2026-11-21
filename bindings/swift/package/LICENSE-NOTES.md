# License notes for the QRCodeBarcodeScanner Swift package

This repository is written from
[qrcode-barcode-scanner-rust](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust) by
`scripts/stage-swift-package.py`. Its content comes from two places, and each keeps its own
license.

| Content | Files | License |
| --- | --- | --- |
| The engine's library for iOS and macOS, compiled from the engine tag that `SOURCE.json` names, and fetched by SwiftPM from that release | the binary target `QrcodeAiScannerFFI` (`QrcodeAiScannerFFI.xcframework.zip`) | The license of that engine version: `LICENSE`, copied from the tag. For engine 0.11.0 this is the GNU Affero General Public License, version 3 or later. Two parts of its reader derive from rxing, a Rust port of ZXing, and keep their Apache-2.0 notices: see `LICENSE-APACHE-2.0` and `THIRD-PARTY.md`. UniFFI's runtime includes MPL-2.0 components; the other Rust dependencies keep their declared licenses. The zip carries the same three files. |
| The Swift that UniFFI generates from that library | `Sources/QRCodeBarcodeScanner/qrcode_ai_scanner_uniffi.swift` | Generated from the engine source of that tag, under its license; UniFFI itself is MPL-2.0 |
| The manifest and the documentation written by the stage | `Package.swift`, `README.md`, `LICENSE-NOTES.md`, `.gitignore` | MIT, from the engine repository's source |

An application that links this package links the engine library, so the license of the engine
version in `SOURCE.json` applies to that use. Keep `LICENSE`, `LICENSE-APACHE-2.0`,
`THIRD-PARTY.md` and this file with any copy of the package or of its library.

A published version keeps the license it shipped with. The
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md)
and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx)
explain the engine's grants and their dates.
