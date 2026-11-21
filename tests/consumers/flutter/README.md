# Flutter public-package consumers

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Flutter%20public-package%20consumers%20%28tests%2Fconsumers%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20These%20consumers%20install%20the%20published%20qr_barcode_scanner%20package%20from%20pub.dev%20into%20a%20new%20Flutter%20app%20outside%20the%20checkout%2C%20build%20it%20for%20an%20Android%20emulator%20and%20an%20iPhone%20simulator%2C%20and%20scan%20through%20the%20package%27s%20own%20Dart%20interface.%20They%20never%20publish%20and%20never%20run%20from%20the%20staged%20source%20binding.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Ftests%2Fconsumers%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20Flutter%20public-package%20consumers%20%28tests%2Fconsumers%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20These%20consumers%20install%20the%20published%20qr_barcode_scanner%20package%20from%20pub.dev%20into%20a%20new%20Flutter%20app%20outside%20the%20checkout%2C%20build%20it%20for%20an%20Android%20emulator%20and%20an%20iPhone%20simulator%2C%20and%20scan%20through%20the%20package%27s%20own%20Dart%20interface.%20They%20never%20publish%20and%20never%20run%20from%20the%20staged%20source%20binding.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Ftests%2Fconsumers%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20Flutter%20public-package%20consumers%20%28tests%2Fconsumers%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20These%20consumers%20install%20the%20published%20qr_barcode_scanner%20package%20from%20pub.dev%20into%20a%20new%20Flutter%20app%20outside%20the%20checkout%2C%20build%20it%20for%20an%20Android%20emulator%20and%20an%20iPhone%20simulator%2C%20and%20scan%20through%20the%20package%27s%20own%20Dart%20interface.%20They%20never%20publish%20and%20never%20run%20from%20the%20staged%20source%20binding.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Ftests%2Fconsumers%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Flutter%20public-package%20consumers%20%28tests%2Fconsumers%2Fflutter%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20These%20consumers%20install%20the%20published%20qr_barcode_scanner%20package%20from%20pub.dev%20into%20a%20new%20Flutter%20app%20outside%20the%20checkout%2C%20build%20it%20for%20an%20Android%20emulator%20and%20an%20iPhone%20simulator%2C%20and%20scan%20through%20the%20package%27s%20own%20Dart%20interface.%20They%20never%20publish%20and%20never%20run%20from%20the%20staged%20source%20binding.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Ftests%2Fconsumers%2Fflutter%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fflutter%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand Flutter public-package consumers (tests/consumers/flutter/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): These consumers install the published qr_barcode_scanner package from pub.dev into a new Flutter app outside the checkout, build it for an Android emulator and an iPhone simulator, and scan through the package's own Dart interface. They never publish and never run from the staged source binding. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/tests/consumers/flutter/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/flutter https://qrcode-ai.com/en-US/barcode-scanner/sdk/flutter https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

These consumers install the published `qr_barcode_scanner` package from pub.dev into a new Flutter app outside the checkout, build it for an Android emulator and an iPhone simulator, and scan through the package's own Dart interface. They never publish and never run from the staged source binding.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner Flutter guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/flutter) and [barcode scanner Flutter guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/flutter) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare an exploratory Flutter input without changing the required mixed-code fixture, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

The `Flutter public consumers` workflow checks the published `qr_barcode_scanner` 0.11.0
archive, SHA-256 `460e3a09878f1148554732212f31e5ec604fd820583a78554292cf8689ff862e`.
It is a destination-specific pin, updated only after another version is public and reviewed.

Each job copies the published example outside the checkout, replaces its parent-path dependency
with the exact pub.dev version, and resolves it in an empty pub cache. All 198 installed
package files must match the reviewed public archive before the native build starts.

Five native cases execute on Android 14 x86_64 and on an available iPhone simulator: exact
mixed QR/Code 128 contents in fast/frame/full, a blank frame and an invalid image. Full reports
are collected in bounded chunks; missing or repeated chunks fail. The common destination
acceptance driver judges the three reports. The dependency is then removed with
`flutter pub remove`, and a fresh package-config lookup must fail.

## Native build settings

Simulators and emulators only run Flutter in debug mode, and in debug mode cargokit builds the
package's Rust core with Cargo's dev profile. The workflow gives that build opt-level 3, the
optimization of the package's own `[profile.release]` (`rust/Cargo.toml`):

| Variable | Value | The package's release profile |
| --- | --- | --- |
| `CARGO_PROFILE_DEV_OPT_LEVEL` | `3` | `3`, Cargo's release default |
| `CARGO_PROFILE_DEV_DEBUG_ASSERTIONS` | `false` | `false` |

The rest of the release profile (thin LTO, one codegen unit, no debug info) is not set: with it,
the iOS test app never connected to the test runner (runs listed below).

Overflow checks stay on for every crate, as in the dev profile. No package file changes. The
receipt `public-package.json` records the variables the job ran with.

The Flutter 0.11 facade does not expose a budget override. Tests use its documented defaults
(`fast` 800 ms, `frame` 80 ms, `full` 4000 ms) and require `budgetExhausted == false`; this is
not an unbounded-runtime claim. The Android APK also passes the 16 KB library-alignment check.
A 4 KB Android emulator is not a 16 KB device. Neither emulator is a physical-camera or
store-admission check, and a simulator says nothing about the speed of a given device.

Local collector checks require only Python:

```sh
python3 tests/consumers/flutter/consumer.py --self-test
```

Native builds and simulator runs belong on hosted runners. Do not run them on the operator Mac.

## Retained earlier runs

The first Android run, [43274479127](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/43274479127),
resolved the public package correctly but failed `budgetExhausted == false` for all three
mixed-scene profiles with Rust's default unoptimized development build. Blank-frame and
invalid-image cases passed. The standalone Flutter crate does not inherit the core workspace's
development optimization settings. This is a known limit of the published 0.11 package,
not a passing default-debug result. The configured consumer does not close that limit.
Carry standalone development settings and a fresh default-debug check into the next engine
release. Do not replace published 0.11.0 or infer release-device performance from simulators.

The second run, [43278040726](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/43278040726),
set only `CARGO_PROFILE_DEV_OPT_LEVEL=2`. Android passed every case (fast 688 ms). The iPhone
simulator read both codes in every profile, but its first scan, fast, took 1250 ms and was cut
by the 800 ms budget; frame, full and both negative cases passed.

## Runs of 21 November 2026

Each run installed `qr_barcode_scanner` 0.11.0 from pub.dev (archive sha256 `460e3a09…`, 198
public files equal to the archive) into a new app, and every scan decoded both payloads of the
mixed fixture unless noted.

| Run | Platform | Rust build | Result |
| --- | --- | --- | --- |
| [44882430387](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44882430387) (two attempts), [44887343863](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44887343863) | iOS simulator | opt-level 3, thin LTO, one codegen unit, no debug info | Built; the test app never connected, and the step timed out after 1800 s, three times |
| [44900149034](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44900149034) | iOS simulator | Cargo's default dev profile | Connected; fast 7336 ms, frame 277 ms (QR code only), full 6438 ms, all cut by their budgets |
| [44901416134](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44901416134) | iOS simulator | opt-level 3 alone | Connected; fast 1815 ms (cut), frame 1660 ms (passed), full 6315 ms (cut) |
| [44887343863](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44887343863) | Android emulator | opt-level 3, thin LTO, one codegen unit, no debug info | fast 733 ms, cut by its 800 ms budget; frame and full passed |

The hang comes from the extra release settings, not from the runner image. With a build that
connects, the simulator and the emulator still miss the fast budget, and the iOS simulator also
misses the full budget: this is the open engine note for the next Flutter release, together with a
budget the facade can set.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
