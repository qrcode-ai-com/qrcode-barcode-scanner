# QR Code & Barcode Scanner for Rust

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

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Rust guide** | [QR code scanner for Rust](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/rust) | [Barcode scanner for Rust](https://qrcode-ai.com/en-US/barcode-scanner/sdk/rust) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

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
