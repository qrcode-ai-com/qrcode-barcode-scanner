# QR Code & Barcode Scanner for Rust

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Rust%20%28crates%2Fqrcode-ai-scanner%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20the%20Rust%20library%20when%20your%20program%20needs%20to%20scan%20image%20bytes%20or%20RGBA%20frames%20in%20process%20and%20inspect%20the%20resulting%20detections.%20The%20report%20separates%20decoded%20content%20from%20its%20physical%20occurrences%20and%20keeps%20an%20unmeasured%20QR%20quality%20score%20distinct%20from%20a%20zero%20score.%20Start%20with%20the%20image%20example%20below%2C%20then%20choose%20profiles%20and%20input%20limits%20for%20your%20workload.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Frust%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Frust%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Rust%20%28crates%2Fqrcode-ai-scanner%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20the%20Rust%20library%20when%20your%20program%20needs%20to%20scan%20image%20bytes%20or%20RGBA%20frames%20in%20process%20and%20inspect%20the%20resulting%20detections.%20The%20report%20separates%20decoded%20content%20from%20its%20physical%20occurrences%20and%20keeps%20an%20unmeasured%20QR%20quality%20score%20distinct%20from%20a%20zero%20score.%20Start%20with%20the%20image%20example%20below%2C%20then%20choose%20profiles%20and%20input%20limits%20for%20your%20workload.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Frust%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Frust%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Rust%20%28crates%2Fqrcode-ai-scanner%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20the%20Rust%20library%20when%20your%20program%20needs%20to%20scan%20image%20bytes%20or%20RGBA%20frames%20in%20process%20and%20inspect%20the%20resulting%20detections.%20The%20report%20separates%20decoded%20content%20from%20its%20physical%20occurrences%20and%20keeps%20an%20unmeasured%20QR%20quality%20score%20distinct%20from%20a%20zero%20score.%20Start%20with%20the%20image%20example%20below%2C%20then%20choose%20profiles%20and%20input%20limits%20for%20your%20workload.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Frust%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Frust%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Rust%20%28crates%2Fqrcode-ai-scanner%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20the%20Rust%20library%20when%20your%20program%20needs%20to%20scan%20image%20bytes%20or%20RGBA%20frames%20in%20process%20and%20inspect%20the%20resulting%20detections.%20The%20report%20separates%20decoded%20content%20from%20its%20physical%20occurrences%20and%20keeps%20an%20unmeasured%20QR%20quality%20score%20distinct%20from%20a%20zero%20score.%20Start%20with%20the%20image%20example%20below%2C%20then%20choose%20profiles%20and%20input%20limits%20for%20your%20workload.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Frust%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Frust%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v1.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v1.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v1.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v1.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for Rust (crates/qrcode-ai-scanner/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use the Rust library when your program needs to scan image bytes or RGBA frames in process and inspect the resulting detections. The report separates decoded content from its physical occurrences and keeps an unmeasured QR quality score distinct from a zero score. Start with the image example below, then choose profiles and input limits for your workload. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/crates/qrcode-ai-scanner/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/rust https://qrcode-ai.com/en-US/barcode-scanner/sdk/rust https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use the Rust library when your program needs to scan image bytes or RGBA frames in process and inspect the resulting detections. The report separates decoded content from its physical occurrences and keeps an unmeasured QR quality score distinct from a zero score. Start with the image example below, then choose profiles and input limits for your workload.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner Rust guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/rust) and [barcode scanner Rust guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/rust) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a fixture with a known payload for a Rust application, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

Decode **QR codes, linear barcodes and other 2D formats, including Data Matrix**,
from local images or raw RGBA frames. Read decoded content and measured symbol
positions from one structured report. QR scannability diagnostics add stress-test
results and suggestions for improving artistic or photo-captured codes.

`qrcode-barcode-scanner` is the Rust core of [QR Code AI](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/rust).
It runs locally, with no network requests.

[API](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/rust.mdx) ·
[Report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/spec/01-report.md) ·
[Scoring](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/SCORING.md)

For a one-off image check, the [browser image example](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/crates/qrcode-ai-scanner-wasm/examples/README.md#scan-an-image-headlesshtml) uses the same engine.

## Scan an image

```rust
use qrcode_barcode_scanner::{ImageInput, ScanProfile, Scanner};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bytes = std::fs::read("label.png")?;
    let scanner = Scanner::builder().profile(ScanProfile::Full).build();
    let report = scanner.scan(ImageInput::encoded(&bytes))?;

    for detection in &report.detections {
        println!("{:?}: {}", detection.symbology, detection.content.text);
        println!("Physical occurrences: {}", detection.occurrences.len());
    }
    Ok(())
}
```

Encoded input accepts PNG, JPEG, WebP and GIF. Use `ImageInput::rgba8` for raw
frames without an image-format roundtrip. Compiled format support depends on the
selected engine features; the capabilities API lists the readers included in the
build, not a guarantee that a particular image will decode.

## Read the report

| Field | Meaning |
|---|---|
| `detections` | Distinct decoded contents, with their symbology and payload classification. |
| `detections[*].occurrences` | Measured physical copies of each content. Two copies can belong to one detection. |
| `score` | QR scannability assessment when available. `None` means no score, never zero. |
| `hints` | Suggestions derived from the measurements the engine actually made. |
| `trace.budget_exhausted` | Whether the deadline prevented planned scan work. |

Use the geometry that was measured: a linear barcode can have endpoints instead
of four corners. Only the QR family carries QR metadata and correction-margin
diagnostics. These software measurements do not certify a code with a hardware
barcode verifier.

<details>
<summary>Exact payloads, errors and scan budgets</summary>

For the QR family, `content.raw` holds the original payload bytes. For other
symbologies it holds the decoding engine's reading, encoded as ISO/IEC 8859-1
when every character fits, otherwise UTF-8. `content.charset` describes how
`content.text` reads those bytes; `unknown` is the only lossy value, so use
`raw` in that case. Content identity includes the symbology, raw bytes, FNC1
position and compatible ECI declarations, never display text alone.

When no code is detected, the scan returns `Ok` with an empty `detections` list.
Errors cover invalid input
(`QRS-001..004`), cancellation (`QRS-005`) and invalid options (`QRS-006`);
branch on `err.code()`. A zero `Limits` cap or `ScanConfig` side, a palette above
`ScanConfig::MAX_ALPHA_PALETTE`, or a budget above
`ScanConfig::MAX_BUDGET_MS` is refused before the image is read.

The `full`, `fast` and `frame` profiles select the scan workload and default
budget. A report is final when `report.trace.budget_exhausted == Some(false)`.
Set the configuration's `budget_ms` to `None` for an unbounded scan; a time-bounded
scan can stop before planned work finishes, which the trace records.

The multi-engine ladder uses rxing and rqrr. QR quality diagnostics include
survival-ramp stress tests and the synthetic unused-error-correction margin
measured from the verified stream. See the scoring contract for the measurement
limits and which results can be absent.

</details>

## Documentation and licensing

[Architecture](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/ARCHITECTURE.md) ·
[Error codes](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/errors.mdx) ·
[Security](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/SECURITY.md) ·
[Report a bug](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues)

Releases up to 0.10.1 were published as `qrcode-ai-scanner`.

License: [AGPL-3.0-or-later](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSE).
Commercial licensing is described in the
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSING.md).
© SuperNovae Studio.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.
