# Debian and Ubuntu package recipe

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Debian%20and%20Ubuntu%20package%20recipe%20%28distribution%2Fdebian%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20recipe%20to%20wrap%20the%20official%20GNU%2FLinux%20executable%20in%20a%20Debian%20package%20while%20retaining%20its%20original%20bytes%20and%20source%20information.%20Building%20and%20installing%20that%20package%20locally%20is%20distinct%20from%20admission%20to%20Debian%20or%20Ubuntu%20repositories.%20The%20architecture%20and%20upstream%20release%20must%20match%20the%20inputs%20verified%20by%20the%20build%20script.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdebian%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20Debian%20and%20Ubuntu%20package%20recipe%20%28distribution%2Fdebian%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20recipe%20to%20wrap%20the%20official%20GNU%2FLinux%20executable%20in%20a%20Debian%20package%20while%20retaining%20its%20original%20bytes%20and%20source%20information.%20Building%20and%20installing%20that%20package%20locally%20is%20distinct%20from%20admission%20to%20Debian%20or%20Ubuntu%20repositories.%20The%20architecture%20and%20upstream%20release%20must%20match%20the%20inputs%20verified%20by%20the%20build%20script.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdebian%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20Debian%20and%20Ubuntu%20package%20recipe%20%28distribution%2Fdebian%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20recipe%20to%20wrap%20the%20official%20GNU%2FLinux%20executable%20in%20a%20Debian%20package%20while%20retaining%20its%20original%20bytes%20and%20source%20information.%20Building%20and%20installing%20that%20package%20locally%20is%20distinct%20from%20admission%20to%20Debian%20or%20Ubuntu%20repositories.%20The%20architecture%20and%20upstream%20release%20must%20match%20the%20inputs%20verified%20by%20the%20build%20script.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdebian%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Debian%20and%20Ubuntu%20package%20recipe%20%28distribution%2Fdebian%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20recipe%20to%20wrap%20the%20official%20GNU%2FLinux%20executable%20in%20a%20Debian%20package%20while%20retaining%20its%20original%20bytes%20and%20source%20information.%20Building%20and%20installing%20that%20package%20locally%20is%20distinct%20from%20admission%20to%20Debian%20or%20Ubuntu%20repositories.%20The%20architecture%20and%20upstream%20release%20must%20match%20the%20inputs%20verified%20by%20the%20build%20script.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdebian%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand Debian and Ubuntu package recipe (distribution/debian/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use this recipe to wrap the official GNU/Linux executable in a Debian package while retaining its original bytes and source information. Building and installing that package locally is distinct from admission to Debian or Ubuntu repositories. The architecture and upstream release must match the inputs verified by the build script. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/distribution/debian/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/cli https://qrcode-ai.com/en-US/barcode-scanner/cli https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use this recipe to wrap the official GNU/Linux executable in a Debian package while retaining its original bytes and source information. Building and installing that package locally is distinct from admission to Debian or Ubuntu repositories. The architecture and upstream release must match the inputs verified by the build script.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner command line guide](https://qrcode-ai.com/en-US/qr-code-scanner/cli) and [barcode scanner command line guide](https://qrcode-ai.com/en-US/barcode-scanner/cli) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a label for a Debian or Ubuntu installation check, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

This recipe packages the official 0.11.0 GNU/Linux CLI archives for Debian
`amd64` and `arm64`. It preserves the published `qrscan` executable, licenses,
notices and source reference. The package revision is `0.11.0-1`.

## Build

Put the two GNU/Linux archives, `qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS`
and `qrcode-barcode-scanner-cli-0.11.0-source.tar.gz` from the
[0.11.0 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0)
in an input directory. Run on Debian 12 with Bash, GNU tar, GNU coreutils, gzip and
`dpkg-deb` installed. Use a fresh output directory:

```sh
mkdir out
distribution/debian/build.sh amd64 ./input ./out
distribution/debian/build.sh arm64 ./input ./out
```

The recipe verifies the manifest, archive, source and executable hashes
before creating a package. The original source archive remains at the same
[corresponding source URL](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-source.tar.gz)
named in the installed documentation. Its SHA-256 is
`8e5e09f0ec8d93ae49ca35615c05bb1d326448b6de9757cef86ef48d7bf3a96d`.

## Install and test

Download the file for your architecture and check its SHA-256 from the
[public Linux package release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/linux-packages-v0.11.0).
Install the file and check the scanner version:

```sh
sudo apt install ./qrcode-barcode-scanner_0.11.0-1_amd64.deb
qrscan --version
curl -fL -O https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/176ac96ef16ee330dbfc6ada10327d0b4e23a8b2/fixtures/symbology/mixed-code128-qr.png
for profile in fast frame full; do
  qrscan mixed-code128-qr.png --profile "$profile" --budget-ms 0
done
sudo apt purge qrcode-barcode-scanner
```

The release fixture [mixed-code128-qr.png](../../fixtures/symbology/mixed-code128-qr.png)
reports the QR URL `https://qrc-ai.com/76xMa` and Code 128 `STOCK-4827` together. The CLI runs locally.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
