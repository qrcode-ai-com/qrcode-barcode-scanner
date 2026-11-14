# qr_barcode_scanner — Flutter / Dart

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20the%20Flutter%20binding%20to%20connect%20image%20import%20or%20application-supplied%20RGBA%20frames%20to%20the%20shared%20native%20scanner.%20The%20package%20supplies%20decoding%20and%20report%20data%3B%20your%20app%20owns%20camera%20acquisition%2C%20permissions%2C%20preview%20and%20the%20response%20to%20decoded%20content.%20Follow%20the%20source%20packaging%20instructions%20below%20when%20evaluating%20an%20upcoming%20version%20instead%20of%20assuming%20that%20published%20and%20working-source%20archives%20are%20identical.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20the%20Flutter%20binding%20to%20connect%20image%20import%20or%20application-supplied%20RGBA%20frames%20to%20the%20shared%20native%20scanner.%20The%20package%20supplies%20decoding%20and%20report%20data%3B%20your%20app%20owns%20camera%20acquisition%2C%20permissions%2C%20preview%20and%20the%20response%20to%20decoded%20content.%20Follow%20the%20source%20packaging%20instructions%20below%20when%20evaluating%20an%20upcoming%20version%20instead%20of%20assuming%20that%20published%20and%20working-source%20archives%20are%20identical.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20the%20Flutter%20binding%20to%20connect%20image%20import%20or%20application-supplied%20RGBA%20frames%20to%20the%20shared%20native%20scanner.%20The%20package%20supplies%20decoding%20and%20report%20data%3B%20your%20app%20owns%20camera%20acquisition%2C%20permissions%2C%20preview%20and%20the%20response%20to%20decoded%20content.%20Follow%20the%20source%20packaging%20instructions%20below%20when%20evaluating%20an%20upcoming%20version%20instead%20of%20assuming%20that%20published%20and%20working-source%20archives%20are%20identical.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20qr_barcode_scanner%20%E2%80%94%20Flutter%20%2F%20Dart%20%28bindings%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20the%20Flutter%20binding%20to%20connect%20image%20import%20or%20application-supplied%20RGBA%20frames%20to%20the%20shared%20native%20scanner.%20The%20package%20supplies%20decoding%20and%20report%20data%3B%20your%20app%20owns%20camera%20acquisition%2C%20permissions%2C%20preview%20and%20the%20response%20to%20decoded%20content.%20Follow%20the%20source%20packaging%20instructions%20below%20when%20evaluating%20an%20upcoming%20version%20instead%20of%20assuming%20that%20published%20and%20working-source%20archives%20are%20identical.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand qr_barcode_scanner — Flutter / Dart (bindings/flutter/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use the Flutter binding to connect image import or application-supplied RGBA frames to the shared native scanner. The package supplies decoding and report data; your app owns camera acquisition, permissions, preview and the response to decoded content. Follow the source packaging instructions below when evaluating an upcoming version instead of assuming that published and working-source archives are identical. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/flutter/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/flutter https://qrcode-ai.com/en-US/barcode-scanner/sdk/flutter https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use the Flutter binding to connect image import or application-supplied RGBA frames to the shared native scanner. The package supplies decoding and report data; your app owns camera acquisition, permissions, preview and the response to decoded content. Follow the source packaging instructions below when evaluating an upcoming version instead of assuming that published and working-source archives are identical.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner Flutter guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/flutter) and [barcode scanner Flutter guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/flutter) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare an image to import into a Flutter screen, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

Scan QR codes and barcodes locally from encoded images or RGBA camera frames.
QR reports include scannability diagnostics when the selected profile measures
them. The native Rust core of
[`qrcode-barcode-scanner`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner)
also decodes barcodes and connects to Flutter via
[flutter_rust_bridge](https://pub.dev/packages/flutter_rust_bridge).
Returns the same versioned `ScanReport` as the Python / Node / WASM / Kotlin /
Swift bindings (one serde wire contract).

## Install

Public Flutter package [`qr_barcode_scanner` 0.11.0](https://pub.dev/packages/qr_barcode_scanner/versions/0.11.0)
is available under verified publisher `qrcode-ai.com`. In a Flutter project, pin
the version explicitly:

```bash
flutter pub add qr_barcode_scanner:0.11.0
```

The package includes the Rust core sources; installation does not provide a
prebuilt native library. To evaluate an upcoming version from this checkout,
follow [Packaging from a candidate checkout](#packaging-from-a-candidate-checkout)
below instead. Working source and the published archive are separate candidates.

> **Toolchain prerequisite.** This package compiles the Rust core at *your* app's
> build time (via cargokit) — the building machine needs the **Rust toolchain
> (≥1.88)** and, for Android, the **NDK (r28+)**. No Rust knowledge required;
> it's a one-time `rustup` install. (A precompiled-binary distribution is a
> future option if this friction is reported.)
>
> NDK r28 aligns the native library for Android devices with 16 KB memory
> pages. A build with NDK r27 is aligned to 4 KB and does not meet that
> requirement.

## Public native consumer evidence

The [public-package consumer run of 12 November 2026](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/43278040726)
installs the exact pub.dev archive in new applications with an empty package
cache. Android 14 x86_64 passes the mixed QR/Code 128 scans in all three
profiles, blank and invalid input checks, and uninstall. This run explicitly
sets `CARGO_PROFILE_DEV_OPT_LEVEL=2` in Flutter debug mode; it does not qualify
default unoptimized debug builds or physical devices. APK alignment passes for
16 KB pages; the emulator itself uses 4 KB pages.

On the iOS simulator, both payloads decode, but the fast profile reports
`budgetExhausted == true` and fails the unchanged acceptance assertion. Common
iOS acceptance and uninstall are consequently not complete. These are dated
consumer observations, not a comparative benchmark or a claim that every
Android or iOS device is supported. The [Flutter API guide](../../docs/api/flutter.mdx)
keeps installation, build prerequisites and report-budget semantics together.

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
