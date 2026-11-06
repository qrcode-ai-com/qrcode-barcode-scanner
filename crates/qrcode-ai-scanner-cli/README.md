# QR Code & Barcode Scanner CLI

`qrscan` reads a local image and prints a JSON scan report. Decode **QR codes,
linear barcodes and other 2D formats, including Data Matrix**, inspect measured
symbol positions, and assess QR scannability from a terminal or script.

[CLI reference](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/cli.mdx) ·
[Report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/spec/01-report.md) ·
[Prebuilt archive guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/distribution/cli/README.md)

Use `qrscan` to check a QR design from [QR Code AI](https://qrcode-ai.com/) or decode a barcode from
a saved image. The planned [QR code image scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode image scanner](https://qrcode-ai.com/en-US/barcode-scanner) are the corresponding browser
destinations.

## Scan a label

```sh
qrscan label.png --pretty
qrscan label.png --profile fast
qrscan label.png --score-only --budget-ms 0
qrscan --capabilities
```

PNG, JPEG, WebP and GIF are accepted. The engine processes the image locally;
decoding a URL does not visit it. `--capabilities` lists the compiled readers,
engine versions and symbologies, not a guarantee that any particular image will
decode.

| Output | Use |
|---|---|
| Default JSON | Pass the versioned `ScanReport` to a script or store it for inspection. |
| `--pretty` | Show the first detection in the terminal. Use the default JSON report for all detections. |
| `--score-only` or `-s` | Print the score alone. A missing score is not zero. |

The report distinguishes decoded contents from physical occurrences. Multiple
copies of the same code share a detection with several `occurrences`; different
contents stay separate. Use the measured geometry that is present, including
endpoints for linear barcodes. QR quality diagnostics are software measurements,
not hardware-verifier certification.

## Use exit codes in scripts

| Exit | Meaning |
|---|---|
| `0` | A code was found. |
| `1` | No code was found. |
| `2` | Invalid input, usage or a fault; also a score-only configuration that computes no score. |
| `3` | Score-only mode: decoded, but not judged within the budget. |

A budget cut is recorded in `trace.budget_exhausted`. An empty result after a
budget cut is not a completed search. `--budget-ms 0` removes the scan budget;
input resource limits still apply. The `frame` profile selects a workload for
frame processing; the CLI takes an image file, not a live camera stream.

## Documentation and licensing

Powered by the [Rust core](https://crates.io/crates/qrcode-barcode-scanner).
The [prebuilt archive guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/distribution/cli/README.md)
covers supported platforms, checksums and signing limits separately from Cargo
installation.

[Scoring](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/SCORING.md) ·
[Error codes](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/errors.mdx) ·
[Security](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/SECURITY.md) ·
[Report a bug](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues)

Releases up to 0.10.1 were published as `qrcode-ai-scanner-cli`; both install `qrscan`.

License: [AGPL-3.0-or-later](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSE).
Commercial licensing is described in the
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSING.md).
© SuperNovae Studio.
