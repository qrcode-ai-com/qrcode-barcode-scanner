# QR Code & Barcode Scanner for Python

<!-- qrcode-ai-readme-actions:v1 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Python%20%28crates%2Fqrcode-ai-scanner-py%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Decode%20QR%20codes%2C%20linear%20barcodes%20and%20other%202D%20formats%2C%20including%20Data%20Matrix%2C%20with%20a%20local%20Rust%20engine.%20Read%20decoded%20content%20and%20measured%20symbol%20geometry%20from%20Python%2C%20with%20QR%20scannability%20diagnostics%20for%20artistic%20or%20photo-captured%20codes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-py%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Python%20%28crates%2Fqrcode-ai-scanner-py%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Decode%20QR%20codes%2C%20linear%20barcodes%20and%20other%202D%20formats%2C%20including%20Data%20Matrix%2C%20with%20a%20local%20Rust%20engine.%20Read%20decoded%20content%20and%20measured%20symbol%20geometry%20from%20Python%2C%20with%20QR%20scannability%20diagnostics%20for%20artistic%20or%20photo-captured%20codes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-py%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://aistudio.google.com/prompts/new_chat?prompt=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Python%20%28crates%2Fqrcode-ai-scanner-py%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Decode%20QR%20codes%2C%20linear%20barcodes%20and%20other%202D%20formats%2C%20including%20Data%20Matrix%2C%20with%20a%20local%20Rust%20engine.%20Read%20decoded%20content%20and%20measured%20symbol%20geometry%20from%20Python%2C%20with%20QR%20scannability%20diagnostics%20for%20artistic%20or%20photo-captured%20codes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-py%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Python%20%28crates%2Fqrcode-ai-scanner-py%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Decode%20QR%20codes%2C%20linear%20barcodes%20and%20other%202D%20formats%2C%20including%20Data%20Matrix%2C%20with%20a%20local%20Rust%20engine.%20Read%20decoded%20content%20and%20measured%20symbol%20geometry%20from%20Python%2C%20with%20QR%20scannability%20diagnostics%20for%20artistic%20or%20photo-captured%20codes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-py%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Python%20%28crates%2Fqrcode-ai-scanner-py%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Decode%20QR%20codes%2C%20linear%20barcodes%20and%20other%202D%20formats%2C%20including%20Data%20Matrix%2C%20with%20a%20local%20Rust%20engine.%20Read%20decoded%20content%20and%20measured%20symbol%20geometry%20from%20Python%2C%20with%20QR%20scannability%20diagnostics%20for%20artistic%20or%20photo-captured%20codes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-py%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)

Choose an AI assistant to explain this destination using its public sources. Gemini opens Google AI Studio. The link includes the public question; sign-in or a manual paste may be required. Check the answer against the documentation.

<details>
<summary>Copy the question</summary>

```text
Help me understand QR Code & Barcode Scanner for Python (crates/qrcode-ai-scanner-py/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Decode QR codes, linear barcodes and other 2D formats, including Data Matrix, with a local Rust engine. Read decoded content and measured symbol geometry from Python, with QR scannability diagnostics for artistic or photo-captured codes. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/crates/qrcode-ai-scanner-py/README.md https://qrcode-ai.com/en-US/qr-code-scanner/sdk/python https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/barcode-scanner/sdk/python https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v1 -->

Decode **QR codes, linear barcodes and other 2D formats, including Data Matrix**,
with a local Rust engine. Read decoded content and measured symbol geometry from
Python, with QR scannability diagnostics for artistic or photo-captured codes.

The distribution is `qrcode-barcode-scanner`; the import is
`qrcode_barcode_scanner`. Python 3.8 or later is required. The PyO3 extension
returns the same versioned `ScanReport` as the Rust, Node.js and browser bindings.

[Python API](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/python.mdx) ·
[Report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/v0.11.0/spec) ·
[Scoring](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/SCORING.md)

The scanner used by [QR Code AI](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/python) can also check batches of saved QR designs and
barcode photos from a Python workflow.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Python guide** | [QR code scanner for Python](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/python) | [Barcode scanner for Python](https://qrcode-ai.com/en-US/barcode-scanner/sdk/python) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

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

License: [AGPL-3.0-or-later](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSE).
Commercial licensing is described in the
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSING.md).
© SuperNovae Studio.
