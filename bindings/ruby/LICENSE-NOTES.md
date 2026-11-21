# License notes for the qrcode-barcode-scanner gem

Each platform gem of `qrcode-barcode-scanner` holds three kinds of content. Each keeps its own
license.

| Content | Files in the gem | License |
| --- | --- | --- |
| The Ruby of this folder: the public module, `Report`, `ScanError` and the loader of the native library | `lib/qrcode_barcode_scanner.rb`, `lib/qrcode_barcode_scanner/*.rb` | MIT, see `LICENSE` |
| The Ruby that UniFFI generates from the native library | `lib/qrcode_barcode_scanner/generated/qrcode_ai_scanner_uniffi.rb` | Generated from MIT source by UniFFI's Ruby generator; UniFFI itself is MPL-2.0 |
| The engine's native library, compiled from `crates/qrcode-ai-scanner-uniffi` and its locked Rust dependencies | `lib/qrcode_barcode_scanner/native/` | The engine is MIT. Two parts of its reader derive from rxing, a Rust port of ZXing, and keep their Apache-2.0 notices: see `LICENSE-APACHE-2.0` and `THIRD-PARTY.md`. UniFFI's runtime includes MPL-2.0 components; the other Rust dependencies keep their declared licenses. |

The gem depends on the [ffi](https://rubygems.org/gems/ffi) gem, which RubyGems installs
separately under its own license.

The gem's metadata names MIT, the license of the project-authored source. The MIT grant does not
relicense the third-party parts above. Keep `LICENSE`, `LICENSE-APACHE-2.0`, `THIRD-PARTY.md`
and this file with any copy of the gem or of its native library.

A published gem keeps the license it shipped with. The
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md)
and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx)
explain the engine's grants and their dates.
