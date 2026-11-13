# QR Code & Barcode Scanner — specification

<!-- qrcode-ai-readme-actions:v1 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20directory%20is%20the%20normative%20contract%20of%20the%20scanner.%20If%20code%20and%20spec%20disagree%2C%20one%20of%20them%20has%20a%20bug%20%E2%80%94%20file%20it.%20Everything%20here%20is%20versioned%20by%20the%20markers%20every%20report%20carries%3A%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20directory%20is%20the%20normative%20contract%20of%20the%20scanner.%20If%20code%20and%20spec%20disagree%2C%20one%20of%20them%20has%20a%20bug%20%E2%80%94%20file%20it.%20Everything%20here%20is%20versioned%20by%20the%20markers%20every%20report%20carries%3A%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://aistudio.google.com/prompts/new_chat?prompt=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20directory%20is%20the%20normative%20contract%20of%20the%20scanner.%20If%20code%20and%20spec%20disagree%2C%20one%20of%20them%20has%20a%20bug%20%E2%80%94%20file%20it.%20Everything%20here%20is%20versioned%20by%20the%20markers%20every%20report%20carries%3A%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20directory%20is%20the%20normative%20contract%20of%20the%20scanner.%20If%20code%20and%20spec%20disagree%2C%20one%20of%20them%20has%20a%20bug%20%E2%80%94%20file%20it.%20Everything%20here%20is%20versioned%20by%20the%20markers%20every%20report%20carries%3A%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%E2%80%94%20specification%20%28spec%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20directory%20is%20the%20normative%20contract%20of%20the%20scanner.%20If%20code%20and%20spec%20disagree%2C%20one%20of%20them%20has%20a%20bug%20%E2%80%94%20file%20it.%20Everything%20here%20is%20versioned%20by%20the%20markers%20every%20report%20carries%3A%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fspec%2FREADME.md)

Choose an AI assistant to explain this destination using its public sources. Gemini opens Google AI Studio. The link includes the public question; sign-in or a manual paste may be required. Check the answer against the documentation.

<details>
<summary>Copy the question</summary>

```text
Help me understand QR Code & Barcode Scanner — specification (spec/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This directory is the normative contract of the scanner. If code and spec disagree, one of them has a bug — file it. Everything here is versioned by the markers every report carries: Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/spec/README.md
```

</details>

<!-- /qrcode-ai-readme-actions:v1 -->

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
