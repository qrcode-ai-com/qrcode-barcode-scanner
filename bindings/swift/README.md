# qrcode-barcode-scanner — Swift / iOS binding

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Swift%20%2F%20iOS%20binding%20%28bindings%2Fswift%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20SwiftPM%20package%20for%20qrcode-barcode-scanner%2C%20generated%20from%20the%20shared%20UniFFI%20crate%20crates%2Fqrcode-ai-scanner-uniffi.%20SwiftPM%20versions%20are%20the%20repo%27s%20git%20tags%20%28vX.Y.Z%29%20%E2%80%94%20no%20manifest%20version%20field%20to%20sync.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fswift%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Swift%20%2F%20iOS%20binding%20%28bindings%2Fswift%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20SwiftPM%20package%20for%20qrcode-barcode-scanner%2C%20generated%20from%20the%20shared%20UniFFI%20crate%20crates%2Fqrcode-ai-scanner-uniffi.%20SwiftPM%20versions%20are%20the%20repo%27s%20git%20tags%20%28vX.Y.Z%29%20%E2%80%94%20no%20manifest%20version%20field%20to%20sync.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fswift%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Swift%20%2F%20iOS%20binding%20%28bindings%2Fswift%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20SwiftPM%20package%20for%20qrcode-barcode-scanner%2C%20generated%20from%20the%20shared%20UniFFI%20crate%20crates%2Fqrcode-ai-scanner-uniffi.%20SwiftPM%20versions%20are%20the%20repo%27s%20git%20tags%20%28vX.Y.Z%29%20%E2%80%94%20no%20manifest%20version%20field%20to%20sync.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fswift%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Swift%20%2F%20iOS%20binding%20%28bindings%2Fswift%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20SwiftPM%20package%20for%20qrcode-barcode-scanner%2C%20generated%20from%20the%20shared%20UniFFI%20crate%20crates%2Fqrcode-ai-scanner-uniffi.%20SwiftPM%20versions%20are%20the%20repo%27s%20git%20tags%20%28vX.Y.Z%29%20%E2%80%94%20no%20manifest%20version%20field%20to%20sync.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fswift%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v1.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v1.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v1.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v1.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand qrcode-barcode-scanner — Swift / iOS binding (bindings/swift/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): SwiftPM package for qrcode-barcode-scanner, generated from the shared UniFFI crate crates/qrcode-ai-scanner-uniffi. SwiftPM versions are the repo's git tags (vX.Y.Z) — no manifest version field to sync. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/swift/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ios https://qrcode-ai.com/en-US/barcode-scanner/sdk/ios https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

SwiftPM package for `qrcode-barcode-scanner`, generated from the shared UniFFI crate
`crates/qrcode-ai-scanner-uniffi`. SwiftPM versions are the repo's git tags
(`vX.Y.Z`) — no manifest version field to sync.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **iOS guide** | [QR code scanner for iOS](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ios) | [Barcode scanner for iOS](https://qrcode-ai.com/en-US/barcode-scanner/sdk/ios) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

> **Generated, not committed.** `Sources/QrcodeAiScanner/*.swift`
> (uniffi-bindgen-swift) and `build/QrcodeAiScannerFFI.xcframework` (CI) are
> git-ignored — git is not the artifact store (architecture plan §1.3). A fresh
> checkout will NOT resolve in Xcode until CI has produced the xcframework (or
> you build it locally, below), or the package is switched to the release
> `url + checksum` binaryTarget form.

## License

Dual-licensed **AGPL-3.0-or-later OR commercial** — see the repo-root
`LICENSING.md`. A native iOS app shipped on the App Store is almost always
closed-source and therefore needs the **commercial** license. Contact
`studio.supernovae@gmail.com`.

The distributed xcframework includes `LICENSE` and `LICENSING.md` inside its
bundle. The release helper refuses a version that differs from the workspace
version and uses the committed Cargo lockfile.

## Install

There is no SwiftPM dependency line to copy: the package manifest sits in
`bindings/swift`, not at the repository root, so SwiftPM cannot add this
repository by URL. Build from source instead: run the commands in
[Build the xcframework locally](#build-the-xcframework-locally) on a Mac with
Xcode, then add the `bindings/swift` directory of that checkout to your app as
a local package and link its `QrcodeAiScanner` library.

The Swift names keep their original spelling: the `QrcodeAiScanner` library and
module, and the `QrcodeAiScannerFFI` binary target.

## Usage

`scan(...)` throws `ScanBindingError` and returns the `ScanReport` as a **JSON
`String`** (the cross-surface wire SSOT). Decode with `JSONDecoder` against
`spec/scan-report.schema.json`, leniently: the wire grows by additive keys and
enum values (pipeline 5 added `detections[].occurrences` and
`trace.saturation`). `JSONDecoder` ignores keys your types do not declare, but
a `Codable` enum throws on a raw value it does not know: decode enum-like
values such as `geometry.kind` as `String`, or give the enum an unknown case,
and make new keys optional. Run it off the main thread — the scan is sync.

```swift
import QrcodeAiScanner

let json = try scan(image: imageData, profile: "full")  // empty detections = no QR (not an error)
```

Reading the report: `content.charset` is a `String` — test it against
`"unknown"`, the only lossy value (no verified reading: use `content.raw`,
the payload's bytes in base64), and read any other value, one your decoder
does not know included, as a complete reading. `content.eci` and
`content.fnc1` are optional keys. Compare contents by `symbology`, `raw`,
`fnc1` and `eci`, never by `text`. A report is final only when
`trace.budget_exhausted` is `false`; a `null` score beside detections then
means "not judged", never 0 (spec/01).

## Build the xcframework locally

```bash
# from repo root — the uniffi crate is EXCLUDED from the workspace, so always
# address it with --manifest-path and read its crate-local target/ dir (NOT -p,
# NOT the root target/). This mirrors the `ios` job in .github/workflows/mobile.yml.
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
MP=crates/qrcode-ai-scanner-uniffi/Cargo.toml
T=crates/qrcode-ai-scanner-uniffi/target
cargo build --release --manifest-path "$MP" --target aarch64-apple-ios
cargo build --release --manifest-path "$MP" --target aarch64-apple-ios-sim
cargo build --release --manifest-path "$MP" --target x86_64-apple-ios

mkdir -p bindings/swift/Sources/QrcodeAiScanner build/swift/Modules
cargo run --manifest-path "$MP" --bin uniffi-bindgen-swift -- \
  "$T/aarch64-apple-ios/release/libqrcode_ai_scanner_uniffi.a" \
  bindings/swift/Sources/QrcodeAiScanner --swift-sources
cargo run --manifest-path "$MP" --bin uniffi-bindgen-swift -- \
  "$T/aarch64-apple-ios/release/libqrcode_ai_scanner_uniffi.a" \
  build/swift/Modules --headers --xcframework --modulemap --modulemap-filename module.modulemap

mkdir -p build/sim
lipo -create \
  "$T/aarch64-apple-ios-sim/release/libqrcode_ai_scanner_uniffi.a" \
  "$T/x86_64-apple-ios/release/libqrcode_ai_scanner_uniffi.a" \
  -output build/sim/libqrcode_ai_scanner_uniffi.a
xcodebuild -create-xcframework \
  -library "$T/aarch64-apple-ios/release/libqrcode_ai_scanner_uniffi.a" -headers build/swift/Modules \
  -library build/sim/libqrcode_ai_scanner_uniffi.a -headers build/swift/Modules \
  -output bindings/swift/build/QrcodeAiScannerFFI.xcframework
```

## Cutting a release (iOS)

A SwiftPM binary target resolves a remote consumer via `url + checksum`, and the
checksum must match the **exact** asset the release serves. `release.sh` is the
one place that produces a matching pair — it builds the xcframework, computes its
checksum, and pins `Package.swift` from a single local build. Run it on a mac:

```bash
bindings/swift/release.sh vX.Y.Z   # the tag being released
```

It mutates only the working tree (rewrites `Package.swift`, fills `build/`) and
prints the exact `git` + `gh release` commands — the network steps stay in your
hands. The tag then fires `mobile.yml`, where two guards make a broken release
impossible: **Guard A** rejects a tag whose `Package.swift` is still in dev
(`path:`) mode, and **Guard B** re-downloads the published asset and fails if its
checksum ≠ the pin. So a tagged release either resolves cleanly for consumers or
never ships.
