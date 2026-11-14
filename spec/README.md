# QR Code & Barcode Scanner — specification

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Read%20this%20specification%20when%20implementing%20a%20consumer%2C%20interpreting%20a%20scan%20report%20or%20reviewing%20a%20behavior%20change.%20Field%20names%2C%20absent%20values%2C%20exact%20content%20and%20measured%20geometry%20have%20explicit%20meanings%20shared%20across%20the%20runtime%20bindings.%20Product%20documentation%20can%20introduce%20a%20use%20case%2C%20but%20the%20versioned%20contract%20in%20this%20directory%20determines%20how%20a%20consumer%20must%20interpret%20the%20result.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Read%20this%20specification%20when%20implementing%20a%20consumer%2C%20interpreting%20a%20scan%20report%20or%20reviewing%20a%20behavior%20change.%20Field%20names%2C%20absent%20values%2C%20exact%20content%20and%20measured%20geometry%20have%20explicit%20meanings%20shared%20across%20the%20runtime%20bindings.%20Product%20documentation%20can%20introduce%20a%20use%20case%2C%20but%20the%20versioned%20contract%20in%20this%20directory%20determines%20how%20a%20consumer%20must%20interpret%20the%20result.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Read%20this%20specification%20when%20implementing%20a%20consumer%2C%20interpreting%20a%20scan%20report%20or%20reviewing%20a%20behavior%20change.%20Field%20names%2C%20absent%20values%2C%20exact%20content%20and%20measured%20geometry%20have%20explicit%20meanings%20shared%20across%20the%20runtime%20bindings.%20Product%20documentation%20can%20introduce%20a%20use%20case%2C%20but%20the%20versioned%20contract%20in%20this%20directory%20determines%20how%20a%20consumer%20must%20interpret%20the%20result.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Read%20this%20specification%20when%20implementing%20a%20consumer%2C%20interpreting%20a%20scan%20report%20or%20reviewing%20a%20behavior%20change.%20Field%20names%2C%20absent%20values%2C%20exact%20content%20and%20measured%20geometry%20have%20explicit%20meanings%20shared%20across%20the%20runtime%20bindings.%20Product%20documentation%20can%20introduce%20a%20use%20case%2C%20but%20the%20versioned%20contract%20in%20this%20directory%20determines%20how%20a%20consumer%20must%20interpret%20the%20result.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner — specification (spec/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Read this specification when implementing a consumer, interpreting a scan report or reviewing a behavior change. Field names, absent values, exact content and measured geometry have explicit meanings shared across the runtime bindings. Product documentation can introduce a use case, but the versioned contract in this directory determines how a consumer must interpret the result. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/spec/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk https://qrcode-ai.com/en-US/barcode-scanner/sdk https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Read this specification when implementing a consumer, interpreting a scan report or reviewing a behavior change. Field names, absent values, exact content and measured geometry have explicit meanings shared across the runtime bindings. Product documentation can introduce a use case, but the versioned contract in this directory determines how a consumer must interpret the result.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner SDK guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) and [barcode scanner SDK guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare an illustrative input alongside the normative report examples, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

This directory is the **normative contract** of the scanner. If code and
spec disagree, one of them has a bug — file it. Everything here is
versioned by the markers every report carries:

| Marker | Current | Bumped when |
|---|---|---|
| `versions.scanner` | crate semver | every release |
| `versions.pipeline` | `5` | the decode ladder's observable behavior changes (v2: transparent inputs flatten before decode — 01-report § Alpha; v3: exact content — original QR bytes, the scanner's own parses and re-read, declarations and Kanji/Hanzi segments interpreted once, refused malformed streams, reconciliation by content identity, the walk continuing past signalled-only QR reads — 01-report § Content, 07-pipeline properties 2 and 6; v4: budgeted native-resolution linear completion after QR pyramid success and consolidated linear-format acceptance; v5: every physical copy of a content measured as an occurrence — 01-report § Occurrences — equal linear copies kept apart instead of collapsed, and the capacities a scan reached published as `trace.saturation`) |
| `versions.score_contract` | `5` | any score semantic changes (weights, axes, caps, bands; v4: alpha inputs score their flattened image; v5: the UEC margin cap, measured when `uec` is skipped, on the verified orientation's stream; interrupted judgments absent; probes match content identity) |

## Layout

| File | Contract |
|---|---|
| [`01-report.md`](01-report.md) | The `ScanReport` wire format — every field, type, nullability |
| [`02-profiles.md`](02-profiles.md) | Profiles, budgets, anti-DoS limits |
| [`03-errors.md`](03-errors.md) | `QRS-xxx` error catalog + per-surface mapping + exit codes |
| [`04-score.md`](04-score.md) | Score contract v5 — axes, weights, caps, UEC, ISO 15415 card |
| [`05-payloads.md`](05-payloads.md) | The payload kinds incl. the GS1 conformance verdict |
| [`06-hints.md`](06-hints.md) | Hint catalog with exact firing conditions |
| [`07-pipeline.md`](07-pipeline.md) | Ladder S1→S5 normative behavior + determinism contract |
| [`scan-report.schema.json`](scan-report.schema.json) | JSON Schema (draft 2020-12) of the report — machine-validatable |
| [`examples/`](examples/) | Golden reports produced by the real binary — **CI-validated** |

## Examples

Each golden is the CLI's JSON for one committed fixture, scanned unbounded
on the full profile from the repository root:
`qrscan <fixture> --profile full --budget-ms 0 > spec/examples/<golden>`.
Timings (`ms`, `total_ms`) are whatever the producing run measured; every
other field is reproducible on the platform that produced the golden (across
platforms, see 04-score.md § Determinism). Goldens carry the `versions` of
the build that produced them, so a marker or version bump regenerates the
set (a development build's markers can differ from the last release's —
01-report § Machine-readable mirrors). The generated fixtures come from
`cargo run -p xtask -- gen-fixtures`.

| Golden | Fixture | Shows |
|---|---|---|
| [`examples/artistic-blob.json`](examples/artistic-blob.json) | `fixtures/artistic/blob-style-monkey-logo.webp` | an artistic code only the deep stage reads |
| [`examples/clean-url.json`](examples/clean-url.json) | `fixtures/clean/OK_68ms_100_4e875a2c.png` | a clean URL, both engines, every score section |
| [`examples/crypto-bitcoin.json`](examples/crypto-bitcoin.json) | `fixtures/payloads/crypto-bitcoin.png` | the `crypto` payload |
| [`examples/datamatrix.json`](examples/datamatrix.json) | `fixtures/symbology/datamatrix.png` | a Data Matrix symbol |
| [`examples/ean13-retail-gtin.json`](examples/ean13-retail-gtin.json) | `fixtures/symbology/ean13.png` | a retail barcode, the GS1 payload |
| [`examples/eci-iso-8859-2.json`](examples/eci-iso-8859-2.json) | `fixtures/eci/eci4-a1.png` | ECI 4 over byte A1: `charset` `eci`, the located designator |
| [`examples/eci-undecodable.json`](examples/eci-undecodable.json) | `fixtures/eci/eci899-binary.png` | ECI 899 (binary): `charset` `unknown`, the exact bytes |
| [`examples/gs1-digital-link.json`](examples/gs1-digital-link.json) | `fixtures/payloads/gs1-digital-link.png` | the `gs1_digital_link` payload |
| [`examples/gs1-fnc1.json`](examples/gs1-fnc1.json) | `fixtures/clean/gs1-fnc1.png` | FNC1 in first position under ECI 26: `fnc1`, a GS1 element string |
| [`examples/hanzi-gb18030.json`](examples/hanzi-gb18030.json) | `fixtures/eci/hanzi-zhongwen.png` | a Hanzi segment: `charset` `gb18030` |
| [`examples/mecard.json`](examples/mecard.json) | `fixtures/payloads/me_card.png` | the `me_card` payload |
| [`examples/micro-qr.json`](examples/micro-qr.json) | `fixtures/symbology/microqr.png` | a Micro QR symbol |
| [`examples/no-detection.json`](examples/no-detection.json) | `fixtures/degraded/FAIL_1491ms_0_584c998c.png` | no detection: an empty, final report |
| [`examples/rescued-occluded.json`](examples/rescued-occluded.json) | `fixtures/degraded/logo-occluded-rescue.png` | the S5 rescue (`engines: ["rescue"]`) |
| [`examples/sms.json`](examples/sms.json) | `fixtures/payloads/sms.png` | the `sms` payload |
| [`examples/transparent-envelope.json`](examples/transparent-envelope.json) | `playground/public/samples/transparent.png` | the `alpha` block and the placement envelope |
| [`examples/transparent-palette.json`](examples/transparent-palette.json) | `playground/public/samples/transparent.png` | the same scan with `--alpha-palette '#f5f5f4,#1c1917'`: per-color verdicts |
| [`examples/wifi.json`](examples/wifi.json) | `fixtures/payloads/wifi.png` | the `wifi` payload |

## Anti-rot guarantees

The spec cannot silently drift from the code:

1. `crates/qrcode-ai-scanner/tests/spec_golden.rs` deserializes every
   `examples/*.json` through the real serde types AND validates each one
   against `scan-report.schema.json` — a contract change that forgets the
   spec breaks the build. It also holds every golden to the build: a final
   report (`trace.budget_exhausted: false`), this build's `versions`, no two
   detections that denote one content, and a row of the table above naming
   its fixture. It then scans each fixture again, in a build with both
   engines like the CLI's, with the configuration `qrscan` builds from the
   golden's command line. The test does not run `qrscan`: its `cli_profile`
   mirrors how the CLI builds a custom profile from its options, so a change
   there must change `cli_profile` too. The report must equal the golden in
   every field except the measured timings (`trace.total_ms` and each
   stage's `ms`), so a behavior change that leaves a golden unregenerated
   fails `golden_equals_a_fresh_scan::<name>`, which lists every differing
   JSON pointer with both values. CI runs this comparison on Linux, macOS
   and Windows, while the determinism contract holds per platform
   (04-score.md § Determinism): a result that one platform's math library
   moves, such as a stress cell on a knee, fails it on that platform. The
   test's list of command lines names every golden once, with the fixture
   of its row above, and that row shows any `--alpha-palette` argument the
   line adds.
2. The TypeScript mirror (`bindings/report-types.d.ts`) ships inside both
   npm packages and is synced by `scripts/sync-report-types.mjs`.
3. The wire names (`snake_case` tags, profile names, error codes) are
   pinned by unit tests next to their Rust definitions.

## Reading order for agents

`01-report.md` → `05-payloads.md` → `03-errors.md` covers 90% of consumer
integration questions. The schema + examples are the ground truth a tool
can load directly.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
