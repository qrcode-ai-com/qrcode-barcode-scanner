# qrcode-barcode-scanner — Kotlin / Android binding

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Kotlin%20%2F%20Android%20binding%20%28bindings%2Fkotlin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20Android%20library%20module%20%28AAR%29%20for%20qrcode-barcode-scanner%2C%20generated%20from%20the%20shared%20UniFFI%20crate%20crates%2Fqrcode-ai-scanner-uniffi%20%28the%20engine%3B%20this%20is%20the%20Gradle%20shell%29.%20One%20crate%20produces%20both%20this%20Kotlin%20binding%20and%20the%20Swift%20one%20in%20..%2Fswift%2F.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fkotlin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Kotlin%20%2F%20Android%20binding%20%28bindings%2Fkotlin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20Android%20library%20module%20%28AAR%29%20for%20qrcode-barcode-scanner%2C%20generated%20from%20the%20shared%20UniFFI%20crate%20crates%2Fqrcode-ai-scanner-uniffi%20%28the%20engine%3B%20this%20is%20the%20Gradle%20shell%29.%20One%20crate%20produces%20both%20this%20Kotlin%20binding%20and%20the%20Swift%20one%20in%20..%2Fswift%2F.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fkotlin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Kotlin%20%2F%20Android%20binding%20%28bindings%2Fkotlin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20Android%20library%20module%20%28AAR%29%20for%20qrcode-barcode-scanner%2C%20generated%20from%20the%20shared%20UniFFI%20crate%20crates%2Fqrcode-ai-scanner-uniffi%20%28the%20engine%3B%20this%20is%20the%20Gradle%20shell%29.%20One%20crate%20produces%20both%20this%20Kotlin%20binding%20and%20the%20Swift%20one%20in%20..%2Fswift%2F.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fkotlin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Kotlin%20%2F%20Android%20binding%20%28bindings%2Fkotlin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20Android%20library%20module%20%28AAR%29%20for%20qrcode-barcode-scanner%2C%20generated%20from%20the%20shared%20UniFFI%20crate%20crates%2Fqrcode-ai-scanner-uniffi%20%28the%20engine%3B%20this%20is%20the%20Gradle%20shell%29.%20One%20crate%20produces%20both%20this%20Kotlin%20binding%20and%20the%20Swift%20one%20in%20..%2Fswift%2F.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fkotlin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v1.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v1.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v1.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v1.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand qrcode-barcode-scanner — Kotlin / Android binding (bindings/kotlin/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): The Android library module (AAR) for qrcode-barcode-scanner, generated from the shared UniFFI crate crates/qrcode-ai-scanner-uniffi (the engine; this is the Gradle shell). One crate produces both this Kotlin binding and the Swift one in ../swift/. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/kotlin/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/android https://qrcode-ai.com/en-US/barcode-scanner/sdk/android https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

The Android library module (AAR) for `qrcode-barcode-scanner`, generated from the
shared UniFFI crate `crates/qrcode-ai-scanner-uniffi` (the engine; this is the
Gradle shell). One crate produces both this Kotlin binding and the Swift one in
`../swift/`.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Android guide** | [QR code scanner for Android](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/android) | [Barcode scanner for Android](https://qrcode-ai.com/en-US/barcode-scanner/sdk/android) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

> **Generated, not committed.** `src/main/kotlin/` (UniFFI `.kt`) and
> `src/main/jniLibs/<abi>/*.so` (cargo-ndk) are produced in CI / JitPack and are
> git-ignored — git is not the artifact store (architecture plan §1.3).

## License

Dual-licensed **AGPL-3.0-or-later OR commercial** — see the repo-root
`LICENSING.md`. A native mobile app shipped on the App Store / Play Store is
almost always closed-source and therefore needs the **commercial** license.
Contact `studio.supernovae@gmail.com`.

## Install

JitPack builds the AAR from a release tag. Version 0.11.0 was installed from
jitpack.io by a clean Android project
([`tests/consumers/jitpack-android`](../../tests/consumers/jitpack-android/)) and
scanned on an emulator, in a debug build and in an R8-minified build.

JitPack coordinate: com.github.qrcode-ai-com:qrcode-barcode-scanner:0.11.0

With 0.11.0, add JNA's Android AAR yourself. The module metadata published with
that version names JNA without its AAR, so Gradle would resolve the plain jar,
which has no Android native library, and the first scan would fail with an
`UnsatisfiedLinkError`. The next version no longer publishes that metadata, so
its one-line dependency is enough; a
[check](../../.github/workflows/kotlin-publication.yml) installs it that way on
an emulator. For 0.11.0:

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}

// app/build.gradle.kts
dependencies {
    implementation("com.github.qrcode-ai-com:qrcode-barcode-scanner:0.11.0") {
        exclude(group = "net.java.dev.jna", module = "jna")
    }
    implementation("net.java.dev.jna:jna:5.17.0@aar")
}
```

Use JNA 5.17.0 or later: its native library is aligned for Android devices with
16 KB memory pages on every 64-bit ABI. JNA 5.13.0, the version the published
POM names, is aligned to 4 KB on x86_64. The scanner's own 64-bit libraries in
the 0.11.0 AAR are aligned to 16 KB.

For a minified build with 0.11.0, also add this line to your ProGuard rules:

```
-dontwarn java.awt.*
```

Use the version string `0.11.0`, without a `v`. JitPack treats `v0.11.0` as
another build of the same tag.

## Usage

`scan(...)` returns the `ScanReport` as a **JSON String** (the cross-surface
wire SSOT — same bytes as the Python / Node / WASM bindings). Decode it with
`kotlinx.serialization` against `spec/scan-report.schema.json`, leniently: the
wire grows by additive keys and enum values (pipeline 5 added
`detections[].occurrences` and `trace.saturation`), so build the decoder with
`Json { ignoreUnknownKeys = true }`, give new keys defaults, and read enum-like
values such as `geometry.kind` as `String` or with an unknown fallback. Run it
off the main thread — the scan is synchronous.

UniFFI 0.31 emits the API into the package `uniffi.qrcode_ai_scanner_uniffi`
(derived from the crate's `[lib] name`), while the `.so`/AAR ships under the
module `namespace` `studio.supernovae.qrcodeaiscanner`:

```kotlin
import uniffi.qrcode_ai_scanner_uniffi.scan

val json: String = scan(imageBytes, "full")   // "No QR found" = empty detections, not an error
```

Reading the report: `content.charset` is a `String` — test it against
`"unknown"`, the only lossy value (no verified reading: use `content.raw`,
the payload's bytes in base64), and read any other value, one your decoder
does not know included, as a complete reading. `content.eci` and
`content.fnc1` are optional keys. Compare contents by `symbology`, `raw`,
`fnc1` and `eci`, never by `text`. A report is final only when
`trace.budget_exhausted` is `false`; a `null` score beside detections then
means "not judged", never 0 (spec/01).

## Build locally

```bash
# from repo root — the uniffi crate is EXCLUDED from the workspace, so always
# address it with --manifest-path and read its crate-local target/ dir (NOT -p,
# NOT the root target/ — that's the gotcha that fails for excluded crates).
cargo ndk -t arm64-v8a -t x86_64 \
  -o bindings/kotlin/qrcodeaiscanner/src/main/jniLibs \
  build --release --manifest-path crates/qrcode-ai-scanner-uniffi/Cargo.toml
cargo build --release --manifest-path crates/qrcode-ai-scanner-uniffi/Cargo.toml
cargo run --manifest-path crates/qrcode-ai-scanner-uniffi/Cargo.toml --bin uniffi-bindgen -- \
  generate --library crates/qrcode-ai-scanner-uniffi/target/release/libqrcode_ai_scanner_uniffi.so \
  --language kotlin --out-dir bindings/kotlin/qrcodeaiscanner/src/main/kotlin

cd bindings/kotlin && gradle :qrcodeaiscanner:assembleRelease   # or ./gradlew if you ran `gradle wrapper`
# → qrcodeaiscanner/build/outputs/aar/qrcodeaiscanner-release.aar
```

## The Gradle wrapper JAR (optional · local-dev convenience only)

Neither CI nor JitPack needs a committed Gradle wrapper jar — both provision
Gradle 8.9 themselves:

- **CI** (`.github/workflows/mobile.yml`) uses `gradle/actions/setup-gradle` and
  invokes `gradle` directly.
- **JitPack** (`jitpack.yml`) downloads `gradle-8.9-bin.zip` in `before_install`
  and runs `/opt/gradle-8.9/bin/gradle` — so a tagged release builds with **no
  committed wrapper jar**.

The committed `gradle-wrapper.properties` pins Gradle 8.9. If you want a
self-bootstrapping `./gradlew` for local dev, generate it once:

```bash
cd bindings/kotlin
gradle wrapper --gradle-version 8.9   # creates gradlew, gradlew.bat, gradle-wrapper.jar
git add gradlew gradlew.bat gradle/wrapper/gradle-wrapper.jar
```
