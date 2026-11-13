# qr_barcode_scanner — Flutter / Dart

<!-- qrcode-ai-readme-actions:v1 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://aistudio.google.com/prompts/new_chat?prompt=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)

Choose an AI assistant to explain this destination using its public sources. Gemini opens Google AI Studio. The link includes the public question; sign-in or a manual paste may be required. Check the answer against the documentation.

<details>
<summary>Copy the question</summary>

```text
Help me understand qr_barcode_scanner — Flutter / Dart (bindings/flutter/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/flutter/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/flutter https://qrcode-ai.com/en-US/barcode-scanner/sdk/flutter https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v1 -->

Scan QR codes and barcodes locally from encoded images or RGBA camera frames.
QR reports include scannability diagnostics when the selected profile measures
them. The native Rust core of
[`qrcode-barcode-scanner`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner)
also decodes barcodes and connects to Flutter via
[flutter_rust_bridge](https://pub.dev/packages/flutter_rust_bridge).
Returns the same versioned `ScanReport` as the Python / Node / WASM / Kotlin /
Swift bindings (one serde wire contract).

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Flutter guide** | [QR code scanner for Flutter](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/flutter) | [Barcode scanner for Flutter](https://qrcode-ai.com/en-US/barcode-scanner/sdk/flutter) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

## Install

To build the binding from source, follow
[Packaging from a candidate checkout](#packaging-from-a-candidate-checkout) below.

> **Toolchain prerequisite.** This package compiles the Rust core at *your* app's
> build time (via cargokit) — the building machine needs the **Rust toolchain
> (≥1.88)** and, for Android, the **NDK (r28+)**. No Rust knowledge required;
> it's a one-time `rustup` install. (A precompiled-binary distribution is a
> future option if this friction is reported.)
>
> NDK r28 aligns the native library for Android devices with 16 KB memory
> pages. A build with NDK r27 is aligned to 4 KB and does not meet that
> requirement.

## Usage

```dart
import 'package:qr_barcode_scanner/qr_barcode_scanner.dart';

await QrcodeAiScanner.init();                       // once, before any scan

// Decode + score an encoded image (PNG/JPEG/WebP/GIF):
final report = await QrcodeAiScanner.scan(pngBytes); // profile: 'full' (default)
if (report.detections.isEmpty) {
  print('no QR found');                              // a result, not an error
} else {
  final d = report.detections.first;
  print('${d.content.text}  •  grade ${report.score?.grade.name}');
}

// Decode a raw RGBA camera frame (width*height*4 bytes), no scoring:
final frame = await QrcodeAiScanner.scanFrame(rgba, w, h); // profile: 'frame'
```

Scans run on flutter_rust_bridge's Rust worker pool, so `await` never blocks the
UI isolate. Profiles: `'full'` (full ladder + score), `'fast'` (reduced),
`'frame'` (per-frame camera decode, no scoring). Errors throw with the
`[QRS-xxx]` wire code in the message.

The return type [`ScanReport`](lib/report.dart) is fully typed (detections, a
typed `Payload` sealed class, `Score` with ISO 15415 / UEC grade cards, hints,
trace, versions). Unknown enum values and payload kinds decode to `unknown` /
catch-all variants — never a throw (the contract is additively forward-compatible).
`Charset` and `Fnc1Position` are the exceptions: a newer wire value decodes to
`unrecognized`. `Charset.unrecognized` is a complete reading, while
`Charset.unknown` is the wire's lossy value — test `content.charset.isLossy`
and then use `content.raw`, the payload's bytes.
`content.eci` and `content.fnc1` are null when none was observed or the
symbology does not report it — not proof that the symbol declares none.

## Packaging from a candidate checkout

The development binding uses the workspace core by relative path. A pub.dev
package instead bundles the **same candidate's sources**, from Cargo's normalized
package archive, under `rust/vendor/qrcode-barcode-scanner`. No published registry
version is substituted. From a clean, committed checkout, with Python 3.11+:

```bash
set -o pipefail
python3 scripts/stage-flutter-package.py --output /tmp/scanner-flutter-validation/bindings/flutter \
  --archive /tmp/scanner-flutter.tar.gz --receipt /tmp/scanner-flutter.json
git archive HEAD spec/examples | tar -x -C /tmp/scanner-flutter-validation
cd /tmp/scanner-flutter-validation/bindings/flutter
cargo check --locked --manifest-path rust/Cargo.toml --lib
flutter pub get
flutter analyze
test -f ../../spec/examples/clean-url.json
flutter test
```

Run the inspector from the candidate checkout, pointing it at that same root:

```bash
python3 scripts/package-inspect.py flutter --package-root /tmp/scanner-flutter-validation/bindings/flutter \
  --strict --release-set --record /tmp/scanner-flutter-inspected.sha256
```

The output directory must not exist. The staging command runs
`cargo package --locked --no-verify` (packing only); `--core-archive FILE`
accepts an already packed candidate and `--cargo-wrapper PATH` supports isolated
Cargo runners. It verifies the revision, source bytes, versions and LICENSE,
rejects archive links and escaping paths, and preserves the binding lockfile.
Only the staged binding manifest's core path and bundle metadata change.
The metadata includes a deterministic core content digest: cargokit hashes the
binding manifest but does not recursively hash path dependency sources, so a
core-only change must update that manifest. A staged `.pubignore` preserves the
core's Cargo provenance file in pub's published file set.

CI creates one staged archive, then uses it outside the checkout for the host
checks, Android/iOS example builds and the guarded publishing job. Host contract
tests receive the candidate's canonical JSON goldens outside the package, at
their expected `../../spec/examples` path; no adjacent Rust checkout is copied.
Without these fixtures, seven golden tests skip rather than qualify the contract.
The fixtures do not change the staged archive or pub's file set. The inspector
requires pub's parsed file tree and completed validation, checks the bundled
sources recursively, and records the published files' hashes for a final
same-byte check. Validation warnings remain visible; validation errors and an
unparsed listing fail. A missing Flutter/Dart SDK is **UNAVAILABLE**, not a pass.
Portable source inspection alone does not establish pub.dev readiness: the
real validator and native consumer builds must also pass, and the first upload
and trusted-publisher setup remain operator steps in `RELEASING.md`.

## License

Dual-licensed **AGPL-3.0-or-later OR commercial** — see the repo-root
[`LICENSING.md`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSING.md).
A closed-source app on the App Store / Play Store links the AGPL Rust core and
therefore needs the **commercial** license: `studio.supernovae@gmail.com`.

Developed by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.
SuperNovae Studio administers the dual-license model and handles commercial licensing.

© SuperNovae Studio.
