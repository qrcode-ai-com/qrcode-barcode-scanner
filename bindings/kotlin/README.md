<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-android-dark.gif?v=0c94904e3f8a">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-android-light.gif?v=aa34e190696b" alt="QR Code &amp; Barcode Scanner for Android: the Kotlin logo, the quick start in Kotlin, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# qrcode-barcode-scanner — Kotlin / Android binding

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Kotlin%20%2F%20Android%20binding%20%28bindings%2Fkotlin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20binding%20connects%20an%20Android%20application%20to%20the%20shared%20scanner%20through%20generated%20Kotlin%20and%20native%20libraries.%20Your%20application%20supplies%20the%20image%20and%20handles%20camera%20permissions%20or%20file%20selection%3B%20the%20binding%20returns%20the%20scan%20result.%20Read%20the%20installation%20and%20generated-artifact%20requirements%20before%20choosing%20a%20tag%2C%20because%20source%20availability%20alone%20does%20not%20establish%20that%20a%20JitPack%20coordinate%20resolves.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fkotlin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Kotlin%20%2F%20Android%20binding%20%28bindings%2Fkotlin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20binding%20connects%20an%20Android%20application%20to%20the%20shared%20scanner%20through%20generated%20Kotlin%20and%20native%20libraries.%20Your%20application%20supplies%20the%20image%20and%20handles%20camera%20permissions%20or%20file%20selection%3B%20the%20binding%20returns%20the%20scan%20result.%20Read%20the%20installation%20and%20generated-artifact%20requirements%20before%20choosing%20a%20tag%2C%20because%20source%20availability%20alone%20does%20not%20establish%20that%20a%20JitPack%20coordinate%20resolves.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fkotlin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Kotlin%20%2F%20Android%20binding%20%28bindings%2Fkotlin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20binding%20connects%20an%20Android%20application%20to%20the%20shared%20scanner%20through%20generated%20Kotlin%20and%20native%20libraries.%20Your%20application%20supplies%20the%20image%20and%20handles%20camera%20permissions%20or%20file%20selection%3B%20the%20binding%20returns%20the%20scan%20result.%20Read%20the%20installation%20and%20generated-artifact%20requirements%20before%20choosing%20a%20tag%2C%20because%20source%20availability%20alone%20does%20not%20establish%20that%20a%20JitPack%20coordinate%20resolves.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fkotlin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20qrcode-barcode-scanner%20%E2%80%94%20Kotlin%20%2F%20Android%20binding%20%28bindings%2Fkotlin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20binding%20connects%20an%20Android%20application%20to%20the%20shared%20scanner%20through%20generated%20Kotlin%20and%20native%20libraries.%20Your%20application%20supplies%20the%20image%20and%20handles%20camera%20permissions%20or%20file%20selection%3B%20the%20binding%20returns%20the%20scan%20result.%20Read%20the%20installation%20and%20generated-artifact%20requirements%20before%20choosing%20a%20tag%2C%20because%20source%20availability%20alone%20does%20not%20establish%20that%20a%20JitPack%20coordinate%20resolves.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fkotlin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fandroid%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand qrcode-barcode-scanner — Kotlin / Android binding (bindings/kotlin/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This binding connects an Android application to the shared scanner through generated Kotlin and native libraries. Your application supplies the image and handles camera permissions or file selection; the binding returns the scan result. Read the installation and generated-artifact requirements before choosing a tag, because source availability alone does not establish that a JitPack coordinate resolves. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/bindings/kotlin/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/android https://qrcode-ai.com/en-US/barcode-scanner/sdk/android https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This binding connects an Android application to the shared scanner through generated Kotlin and native libraries. Your application supplies the image and handles camera permissions or file selection; the binding returns the scan result. Read the installation and generated-artifact requirements before choosing a tag, because source availability alone does not establish that a JitPack coordinate resolves.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner Android guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/android) and [barcode scanner Android guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/android) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a known label for an Android image-import test, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

The Android library module (AAR) for `qrcode-barcode-scanner`, generated from the
shared UniFFI crate `crates/qrcode-ai-scanner-uniffi` (the engine; this is the
Gradle shell). One crate produces both this Kotlin binding and the Swift one in
`../swift/`.

> **Generated, not committed.** `src/main/kotlin/` (UniFFI `.kt`) and
> `src/main/jniLibs/<abi>/*.so` (cargo-ndk) are produced in CI / JitPack and are
> git-ignored — git is not the artifact store (architecture plan §1.3).

## License

Project-authored source in this checkout is **MIT**. See the [source license](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE) and
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md).
Published archives and separately licensed dependencies retain their original terms.

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

## Maven Central

Not published yet: `io.github.qrcode-ai-com:qrcode-barcode-scanner` is not on Maven Central, and
JitPack above is the only coordinate that resolves today. The workflow
[Maven Central bundle](../../.github/workflows/maven-central.yml) builds the complete bundle
Central takes: the AAR with the native library of four Android ABIs (`arm64-v8a`,
`armeabi-v7a`, `x86_64`, `x86`) and its license files, the POM, the sources and javadoc jars,
and their checksums. It inspects the bundle, then installs the AAR from that bundle alone in the
clean Android project on an emulator with 16 KB pages, where it reads the QR code and the
Code 128 of the mixed fixture in the fast, full and frame profiles. The bundle is unsigned;
signing it and the upload are the owner's steps, written in [LISTING.md](LISTING.md). The
license of each part of the AAR is in [LICENSE-NOTES.md](LICENSE-NOTES.md).

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

The binding holds the engine, so it reads what the engine reads.
Codes of different formats in the same image come back in one report.

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

## The same engine in other runtimes

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>

| Runtime | Package | How it scans |
|---|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-dark.png?v=31b5deebc32e"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-light.png?v=c5207721973f" alt="" width="24" height="24" align="absmiddle"></picture> Rust | [`qrcode-barcode-scanner`](https://crates.io/crates/qrcode-barcode-scanner) on crates.io | In process |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-nodejs-dark.png?v=cf2159524fc6"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-nodejs-light.png?v=6dd098480218" alt="" width="24" height="24" align="absmiddle"></picture> Node.js | [`@qrcode-ai-com/qrcode-barcode-scanner`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner) on npm | In process, native |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-browser-dark.png?v=bbe2f3560a6d"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-browser-light.png?v=591e304cf9e9" alt="" width="24" height="24" align="absmiddle"></picture> Browser | [`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm) on npm | In the page, WebAssembly |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-python-dark.png?v=7469c3e0b4fb"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-python-light.png?v=308121255ab7" alt="" width="24" height="24" align="absmiddle"></picture> Python | [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/) on PyPI | In process |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-go-dark.png?v=b6dbac901176"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-go-light.png?v=1983a9eb7344" alt="" width="24" height="24" align="absmiddle"></picture> Go | [`qrcode-barcode-scanner-go`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-go) | Through the installed `qrscan` |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-php-dark.png?v=3800932934c8"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-php-light.png?v=7bdd6884b3a4" alt="" width="24" height="24" align="absmiddle"></picture> PHP | [`qrcode-barcode-scanner-php`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-php) | Through the installed `qrscan` |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-terminal-dark.png?v=1e987f0ab278"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-terminal-light.png?v=2262d66bee6b" alt="" width="24" height="24" align="absmiddle"></picture> Command line | [`qrscan`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line) | One command, one JSON report |

The Rust, Node.js, browser and Python packages hold the engine. The Go and PHP packages hold no decoder:
each one starts `qrscan` and hands you its report.

<sub>Language and platform names and logos belong to their owners. They identify a runtime or a destination and imply no endorsement.</sub>

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

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
