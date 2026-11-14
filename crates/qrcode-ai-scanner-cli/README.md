# QR Code & Barcode Scanner CLI

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20qrscan%20for%20a%20one-off%20label%20check%2C%20a%20shell%20pipeline%20or%20a%20batch%20of%20saved%20images.%20Keep%20the%20default%20JSON%20when%20your%20script%20needs%20every%20detection%3B%20the%20human-readable%20view%20has%20a%20different%20presentation%20purpose.%20The%20installation%2C%20supported%20image%20types%20and%20exit-code%20behavior%20below%20let%20a%20caller%20distinguish%20a%20valid%20image%20with%20no%20codes%20from%20an%20input%20or%20execution%20error.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20qrscan%20for%20a%20one-off%20label%20check%2C%20a%20shell%20pipeline%20or%20a%20batch%20of%20saved%20images.%20Keep%20the%20default%20JSON%20when%20your%20script%20needs%20every%20detection%3B%20the%20human-readable%20view%20has%20a%20different%20presentation%20purpose.%20The%20installation%2C%20supported%20image%20types%20and%20exit-code%20behavior%20below%20let%20a%20caller%20distinguish%20a%20valid%20image%20with%20no%20codes%20from%20an%20input%20or%20execution%20error.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20qrscan%20for%20a%20one-off%20label%20check%2C%20a%20shell%20pipeline%20or%20a%20batch%20of%20saved%20images.%20Keep%20the%20default%20JSON%20when%20your%20script%20needs%20every%20detection%3B%20the%20human-readable%20view%20has%20a%20different%20presentation%20purpose.%20The%20installation%2C%20supported%20image%20types%20and%20exit-code%20behavior%20below%20let%20a%20caller%20distinguish%20a%20valid%20image%20with%20no%20codes%20from%20an%20input%20or%20execution%20error.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20CLI%20%28crates%2Fqrcode-ai-scanner-cli%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20qrscan%20for%20a%20one-off%20label%20check%2C%20a%20shell%20pipeline%20or%20a%20batch%20of%20saved%20images.%20Keep%20the%20default%20JSON%20when%20your%20script%20needs%20every%20detection%3B%20the%20human-readable%20view%20has%20a%20different%20presentation%20purpose.%20The%20installation%2C%20supported%20image%20types%20and%20exit-code%20behavior%20below%20let%20a%20caller%20distinguish%20a%20valid%20image%20with%20no%20codes%20from%20an%20input%20or%20execution%20error.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fcrates%2Fqrcode-ai-scanner-cli%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner CLI (crates/qrcode-ai-scanner-cli/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use qrscan for a one-off label check, a shell pipeline or a batch of saved images. Keep the default JSON when your script needs every detection; the human-readable view has a different presentation purpose. The installation, supported image types and exit-code behavior below let a caller distinguish a valid image with no codes from an input or execution error. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/crates/qrcode-ai-scanner-cli/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/cli https://qrcode-ai.com/en-US/barcode-scanner/cli https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use qrscan for a one-off label check, a shell pipeline or a batch of saved images. Keep the default JSON when your script needs every detection; the human-readable view has a different presentation purpose. The installation, supported image types and exit-code behavior below let a caller distinguish a valid image with no codes from an input or execution error.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner command line guide](https://qrcode-ai.com/en-US/qr-code-scanner/cli) and [barcode scanner command line guide](https://qrcode-ai.com/en-US/barcode-scanner/cli) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a known label to pass to qrscan, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

`qrscan` reads a local image and prints a JSON scan report. Decode **QR codes,
linear barcodes and other 2D formats, including Data Matrix**, inspect measured
symbol positions, and assess QR scannability from a terminal or script.

[CLI reference](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/cli.mdx) ·
[Report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/spec/01-report.md) ·
[Prebuilt archive guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/distribution/cli/README.md)

Use `qrscan` to check a QR design from [QR Code AI](https://qrcode-ai.com/en-US/qr-code-scanner/cli) or decode a barcode from
a saved image.

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

Source license: [MIT](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSE). Published archives retain their own packaged license.
Commercial licensing is described in the
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSING.md).
© SuperNovae Studio.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
