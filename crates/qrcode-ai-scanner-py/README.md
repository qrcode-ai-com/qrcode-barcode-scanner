# QR Code & Barcode Scanner for Python

Decode **QR codes, linear barcodes and other 2D formats, including Data Matrix**,
with a local Rust engine. Read decoded content and measured symbol geometry from
Python, with QR scannability diagnostics for artistic or photo-captured codes.

The distribution is `qrcode-barcode-scanner`; the import is
`qrcode_barcode_scanner`. Python 3.8 or later is required. The PyO3 extension
returns the same versioned `ScanReport` as the Rust, Node.js and browser bindings.

[Python API](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/python.mdx) ·
[Report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/v0.11.0/spec) ·
[Scoring](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/SCORING.md)

## Scan an image

```python
import qrcode_barcode_scanner as qr

with open("label.png", "rb") as image:
    report = qr.scan(image.read(), profile="full")

for detection in report["detections"]:
    print(detection["symbology"], detection["content"]["text"])
    print("Physical occurrences:", len(detection["occurrences"]))

score = report["score"]
if score is not None:
    print(score["value"], score["grade"])
elif report["trace"]["budget_exhausted"]:
    print("Quality assessment did not finish within the scan budget.")
```

Repeated physical copies of the same content share one detection with several
`occurrences`. Different contents stay separate. Use the geometry that was
measured: a linear barcode can have endpoints instead of four corners. QR
metadata and correction-margin diagnostics belong to the QR family only.

A missing score is not zero. QR quality diagnostics are software measurements,
not hardware-verifier certification. The extension runs locally; decoding a URL
does not visit its destination.

## Choose the input

| Function | Input and result |
|---|---|
| `scan(image, profile="full", ...)` | Encoded PNG, JPEG, WebP or GIF bytes; returns a report `dict`. |
| `scan_frame(rgba, width, height, profile="frame", ...)` | Raw RGBA bytes and dimensions; returns the same report shape without an image-format roundtrip. |
| `capabilities()` | Compiled reader versions, engines and symbologies; not proof that a particular image decodes. |

`scan_frame()` processes a frame supplied by the caller. It does not acquire a
camera or render an overlay.

<details>
<summary>Resource limits, budgets and exact payloads</summary>

Both scan functions accept `max_dimension`, `max_pixels` and `budget_ms`.
The default caps are 10000 px per side and 64 million pixels; lower them when
processing untrusted uploads. Caps are checked before pixel work.

An unset budget uses the profile default: `full` 4000 ms, `fast` 800 ms,
`frame` 80 ms. `budget_ms=0` removes the scan budget for reproducible scans.
The clock starts after image decoding; the input caps bound the decoding step.
A budget that prevents planned work sets
`report["trace"]["budget_exhausted"]` to `True`. A `None` score then means
“not judged”, and an empty detections list does not establish a completed search.

When no code is detected, the report contains an empty `detections` list.
Invalid input or invalid scan options can raise `ValueError`; engine faults carry their `QRS-xxx` code.

`content["raw"]` is base64: original payload bytes for the QR family, the
reader's reading for other symbologies. `content["charset"]` describes how
`content["text"]` reads them. `unknown` is the only lossy charset; use `raw`
in that case. Optional `eci` and `fnc1` fields preserve ECI declarations and
FNC1 position. Compare content identity using symbology, raw bytes, FNC1 and
compatible ECI declarations, never display text alone.

</details>

## Migration and documentation

Releases up to 0.9.0 were published as `qrcode-ai-scanner`.

To migrate, uninstall the previous distribution, install this one and import
`qrcode_barcode_scanner`. The rename itself changes no function name or report
field. The
[migration guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/guides/migrate-to-qrcode-barcode-scanner.mdx)
covers the runtime-specific steps.

[Error codes](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/errors.mdx) ·
[Security](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/SECURITY.md) ·
[Source](https://github.com/qrcode-ai-com/qrcode-barcode-scanner) ·
[Report a bug](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues)

Part of [QR Code AI](https://qrcode-ai.com/).
[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) ·
[Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner)

License: [AGPL-3.0-or-later](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSE).
Commercial licensing is described in the
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSING.md).
© SuperNovae Studio.
