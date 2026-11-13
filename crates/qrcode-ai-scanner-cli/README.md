# QR Code & Barcode Scanner CLI

<!-- qrcode-ai-readme-actions:v1 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://aistudio.google.com/prompts/new_chat?prompt=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)

Open an AI assistant with a question about this destination and its public sources. Gemini opens Google AI Studio. Sign-in or pasting the question may be needed; nothing is sent until you submit it. Check the answer against the documentation.

<details>
<summary>Copy the question</summary>

```text
Help me understand QR Code & Barcode Scanner CLI (crates/qrcode-ai-scanner-cli/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/crates/qrcode-ai-scanner-cli/README.md https://qrcode-ai.com/en-US/qr-code-scanner/cli https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/barcode-scanner/cli https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v1 -->

`qrscan` reads a local image and prints a JSON scan report. Decode **QR codes,
linear barcodes and other 2D formats, including Data Matrix**, inspect measured
symbol positions, and assess QR scannability from a terminal or script.

[CLI reference](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/cli.mdx) ·
[Report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/spec/01-report.md) ·
[Prebuilt archive guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/distribution/cli/README.md)

Use `qrscan` to check a QR design from [QR Code AI](https://qrcode-ai.com/en-US/qr-code-scanner/cli) or decode a barcode from
a saved image.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Command line guide** | [QR code scanner for the command line](https://qrcode-ai.com/en-US/qr-code-scanner/cli) | [Barcode scanner for the command line](https://qrcode-ai.com/en-US/barcode-scanner/cli) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

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
