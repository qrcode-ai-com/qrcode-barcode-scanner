<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-ios-dark.gif?v=33ed879f1f39">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-ios-light.gif?v=ee3be2ad49a6" alt="QR Code &amp; Barcode Scanner for iOS: the Swift logo, the quick start in Swift, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner for Swift

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Swift%20%28bindings%2Fswift%2Fpackage%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Swift%20package%20reads%20QR%20codes%20and%20barcodes%20from%20an%20image%20on%20iOS%20and%20macOS%2C%20in%20process%2C%20with%20the%20open-source%20engine%20of%20QR%20Code%20%26%20Barcode%20Scanner%20compiled%20into%20an%20xcframework.%20Your%20app%20supplies%20the%20image%20or%20the%20camera%20frame%20and%20owns%20permissions%20and%20presentation%3B%20the%20package%20returns%20one%20JSON%20report%20that%20lists%20every%20code%20it%20found%2C%20with%20its%20format%2C%20its%20content%20and%20where%20it%20sits%20in%20the%20image.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fswift%2Fpackage%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Swift%20%28bindings%2Fswift%2Fpackage%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Swift%20package%20reads%20QR%20codes%20and%20barcodes%20from%20an%20image%20on%20iOS%20and%20macOS%2C%20in%20process%2C%20with%20the%20open-source%20engine%20of%20QR%20Code%20%26%20Barcode%20Scanner%20compiled%20into%20an%20xcframework.%20Your%20app%20supplies%20the%20image%20or%20the%20camera%20frame%20and%20owns%20permissions%20and%20presentation%3B%20the%20package%20returns%20one%20JSON%20report%20that%20lists%20every%20code%20it%20found%2C%20with%20its%20format%2C%20its%20content%20and%20where%20it%20sits%20in%20the%20image.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fswift%2Fpackage%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Swift%20%28bindings%2Fswift%2Fpackage%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Swift%20package%20reads%20QR%20codes%20and%20barcodes%20from%20an%20image%20on%20iOS%20and%20macOS%2C%20in%20process%2C%20with%20the%20open-source%20engine%20of%20QR%20Code%20%26%20Barcode%20Scanner%20compiled%20into%20an%20xcframework.%20Your%20app%20supplies%20the%20image%20or%20the%20camera%20frame%20and%20owns%20permissions%20and%20presentation%3B%20the%20package%20returns%20one%20JSON%20report%20that%20lists%20every%20code%20it%20found%2C%20with%20its%20format%2C%20its%20content%20and%20where%20it%20sits%20in%20the%20image.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fswift%2Fpackage%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Swift%20%28bindings%2Fswift%2Fpackage%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Swift%20package%20reads%20QR%20codes%20and%20barcodes%20from%20an%20image%20on%20iOS%20and%20macOS%2C%20in%20process%2C%20with%20the%20open-source%20engine%20of%20QR%20Code%20%26%20Barcode%20Scanner%20compiled%20into%20an%20xcframework.%20Your%20app%20supplies%20the%20image%20or%20the%20camera%20frame%20and%20owns%20permissions%20and%20presentation%3B%20the%20package%20returns%20one%20JSON%20report%20that%20lists%20every%20code%20it%20found%2C%20with%20its%20format%2C%20its%20content%20and%20where%20it%20sits%20in%20the%20image.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fswift%2Fpackage%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fios%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for Swift (bindings/swift/package/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This Swift package reads QR codes and barcodes from an image on iOS and macOS, in process, with the open-source engine of QR Code & Barcode Scanner compiled into an xcframework. Your app supplies the image or the camera frame and owns permissions and presentation; the package returns one JSON report that lists every code it found, with its format, its content and where it sits in the image. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/bindings/swift/package/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ios https://qrcode-ai.com/en-US/barcode-scanner/sdk/ios https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This Swift package reads QR codes and barcodes from an image on iOS and macOS, in process, with the open-source engine of QR Code & Barcode Scanner compiled into an xcframework. Your app supplies the image or the camera frame and owns permissions and presentation; the package returns one JSON report that lists every code it found, with its format, its content and where it sits in the image.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI's browser scanning entry points. The [QR code scanner iOS guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ios) and the [barcode scanner iOS guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/ios) are the development routes for Apple platforms. To prepare a known label for a test, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), and keep the payload you encoded to compare it with the report.

> **Not published yet.** This repository is the package SwiftPM and the Swift Package Index read,
> and no version of it is tagged yet: until the first tag and its release asset exist, no
> dependency line resolves. [How this repository is made](#how-this-repository-is-made) says
> what a release adds.

## Usage

The library product and module are `QRCodeBarcodeScanner`. `scan` takes the bytes of an encoded
image (PNG, JPEG and the other formats the engine decodes), `scanFrame` the RGBA pixels of a
camera frame. Both are synchronous: run them off the main thread.

```swift
import QRCodeBarcodeScanner

let json = try scan(image: imageData, profile: "full")
let frameJson = try scanFrame(rgba: pixels, width: width, height: height, profile: "frame")
```

Each call returns the report as a JSON `String` and throws `ScanBindingError` for an image it
cannot read or an option it does not know. An image without a code is not an error: its report
has no detections. The profiles are `fast`, `full` and `frame`; the report's fields are
described in the engine's [report specification](../../../spec/01-report.md).

Decode the report leniently: it grows by additive keys and enum values, so make new keys
optional and read enum-like values such as `geometry.kind` as `String`. A report is final only
when `trace.budget_exhausted` is `false`. Compare contents by `symbology`, `raw`, `fnc1` and
`eci`, never by `text` alone.

## What it returns

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both come
back in the same report, each with its format and the place where the engine measured it.

## What it reads

The package holds the engine, so it reads what the engine reads. Codes of different formats in
the same image come back in one report.

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>

| Family | Formats |
|---|---|
| QR | QR Code, Micro QR, rectangular Micro QR (rMQR) |
| Matrix and stacked | Data Matrix, Aztec, PDF417, MaxiCode |
| Retail | EAN-13, EAN-8, UPC-A, UPC-E |
| Other linear | Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen |

The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## Platforms

| Platform | Minimum | Slices of the xcframework |
|---|---|---|
| iOS | 13 | `arm64` |
| iOS simulator | 13 | `arm64`, `x86_64` |
| macOS | 11 | `arm64`, `x86_64` |

The binary target `QrcodeAiScannerFFI` is a static library: it adds no framework to embed or sign
in your app.

## How this repository is made

The engine repository, [qrcode-barcode-scanner-rust](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust),
is the only hand-edited source of this package. Its workflow
[Swift package](../../../.github/workflows/swift-package.yml) builds the engine tag that
`SOURCE.json` names for iOS and macOS, generates the Swift with UniFFI, and
[`scripts/stage-swift-package.py`](../../../scripts/stage-swift-package.py) writes this whole tree
from one commit of the engine repository. The same workflow compares this repository with the
stage of the commit it names, and installs the staged package in a clean Swift package, where it
reads both codes of the engine's mixed QR code and Code 128 sample in the three profiles.

`Package.swift` pins the xcframework zip by its sha256: SwiftPM fetches it from the engine's
release `swift-vX.Y.Z` and refuses any other file. A version of this package is a tag `X.Y.Z` of
this repository on a commit whose `Package.swift` pins that release.

## License

The package is distributed under the license of the engine version it is built from, which
`LICENSE` holds; [LICENSE-NOTES.md](LICENSE-NOTES.md) says which part of the package each license
covers.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
