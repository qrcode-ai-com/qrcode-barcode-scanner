<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-n8n-dark.gif?v=fcfeba6b9f90">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-n8n-light.gif?v=d17439ebf571" alt="QR Code &amp; Barcode Scanner for n8n: the n8n logo, the node and its settings, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner · n8n workflow template

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20n8n%20workflow%20template%20%28integrations%2Fn8n%2Ftemplate%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20n8n%20workflow%20reads%20every%20label%20image%20in%20a%20folder%2C%20decodes%20its%20QR%20codes%20and%20barcodes%20on%20your%20own%20n8n%20server%2C%20and%20checks%20each%20image%20against%20the%20value%20you%20expect.%20Each%20image%20ends%20in%20one%20of%20four%20results%3A%20expected%20value%20found%2C%20wrong%20value%2C%20no%20code%20found%2C%20or%20unreadable%20image.%20The%20file%20is%20qr-barcode-label-check.json.%20It%20is%20prepared%20for%20the%20n8n%20template%20library%20and%20has%20not%20been%20submitted%20yet.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fn8n%2Ftemplate%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fn8n%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fn8n%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20n8n%20workflow%20template%20%28integrations%2Fn8n%2Ftemplate%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20n8n%20workflow%20reads%20every%20label%20image%20in%20a%20folder%2C%20decodes%20its%20QR%20codes%20and%20barcodes%20on%20your%20own%20n8n%20server%2C%20and%20checks%20each%20image%20against%20the%20value%20you%20expect.%20Each%20image%20ends%20in%20one%20of%20four%20results%3A%20expected%20value%20found%2C%20wrong%20value%2C%20no%20code%20found%2C%20or%20unreadable%20image.%20The%20file%20is%20qr-barcode-label-check.json.%20It%20is%20prepared%20for%20the%20n8n%20template%20library%20and%20has%20not%20been%20submitted%20yet.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fn8n%2Ftemplate%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fn8n%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fn8n%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20n8n%20workflow%20template%20%28integrations%2Fn8n%2Ftemplate%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20n8n%20workflow%20reads%20every%20label%20image%20in%20a%20folder%2C%20decodes%20its%20QR%20codes%20and%20barcodes%20on%20your%20own%20n8n%20server%2C%20and%20checks%20each%20image%20against%20the%20value%20you%20expect.%20Each%20image%20ends%20in%20one%20of%20four%20results%3A%20expected%20value%20found%2C%20wrong%20value%2C%20no%20code%20found%2C%20or%20unreadable%20image.%20The%20file%20is%20qr-barcode-label-check.json.%20It%20is%20prepared%20for%20the%20n8n%20template%20library%20and%20has%20not%20been%20submitted%20yet.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fn8n%2Ftemplate%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fn8n%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fn8n%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20n8n%20workflow%20template%20%28integrations%2Fn8n%2Ftemplate%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20n8n%20workflow%20reads%20every%20label%20image%20in%20a%20folder%2C%20decodes%20its%20QR%20codes%20and%20barcodes%20on%20your%20own%20n8n%20server%2C%20and%20checks%20each%20image%20against%20the%20value%20you%20expect.%20Each%20image%20ends%20in%20one%20of%20four%20results%3A%20expected%20value%20found%2C%20wrong%20value%2C%20no%20code%20found%2C%20or%20unreadable%20image.%20The%20file%20is%20qr-barcode-label-check.json.%20It%20is%20prepared%20for%20the%20n8n%20template%20library%20and%20has%20not%20been%20submitted%20yet.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fn8n%2Ftemplate%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fn8n%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fn8n%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · n8n workflow template (integrations/n8n/template/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This n8n workflow reads every label image in a folder, decodes its QR codes and barcodes on your own n8n server, and checks each image against the value you expect. Each image ends in one of four results: expected value found, wrong value, no code found, or unreadable image. The file is qr-barcode-label-check.json. It is prepared for the n8n template library and has not been submitted yet. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/n8n/template/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/n8n https://qrcode-ai.com/en-US/barcode-scanner/integrations/n8n https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This n8n workflow reads every label image in a folder, decodes its QR codes and barcodes on your own n8n server, and checks each image against the value you expect. Each image ends in one of four results: expected value found, wrong value, no code found, or unreadable image. The file is [qr-barcode-label-check.json](qr-barcode-label-check.json). It is prepared for the n8n template library and has not been submitted yet.

The scan step is the [QR Code & Barcode Scanner community node](../README.md). In a browser, the [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) read the same codes one image at a time. The [QR code scanner guide for n8n](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/n8n) and the [barcode scanner guide for n8n](https://qrcode-ai.com/en-US/barcode-scanner/integrations/n8n) explain the node and this workflow. For code instead of a workflow, read the [QR code scanner SDK guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) and the [barcode scanner SDK guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk).

The workflow fits a print or packaging check: make the codes with the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), export the label images, and let the workflow confirm that every label carries the right value before it goes out.

## Requirements

You need a self-hosted n8n with the community node `@qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner` 0.1.0 installed, as its [README](../README.md#install) explains. n8n Cloud cannot install that node, so the template runs on self-hosted n8n only. The other nodes are n8n core nodes: Manual Trigger, Edit Fields (Set) 3.4, Read/Write Files from Disk 1.1 and Switch 3.2.

## Set up and run

1. In n8n, open **Workflows**, choose **Import from File**, and select `qr-barcode-label-check.json`. Without the community node, n8n shows the scan step as an unknown node: install the node first.
2. Open the **Settings** node. Set `expectedText` to the value your labels must carry. Set `imageFiles` to the files to check, as a path or a pattern such as `/home/node/.n8n-files/labels/*.png`.
3. n8n reads files only from the folders it allows. The default is `~/.n8n-files`, and the `N8N_RESTRICT_FILE_ACCESS_TO` setting changes it. Put the label images there.
4. Select **Execute workflow**.

The template holds no credential, no webhook and no pinned data. It only reads the files you name and writes nothing.

## What each branch returns

**Scan QR codes and barcodes** reads the binary field `data` of each file with the `Frame` profile, which decodes without scoring. Choose `Full` there to also score how well each QR code scans. **Compare with the expected value** then sends each image to one branch, and every branch writes one item with a `status`:

- **Expected value found**: one of the decoded texts equals `expectedText`. The item holds the `file` name and the texts `found`.
- **Wrong value**: codes were read, but none equals `expectedText`. The item holds the `file` name, the texts `found` and the `expected` value, so you can see the wrong label.
- **No code found**: the image holds no code the engine can read. The item holds the `file` name. This is a normal result, not an error.
- **Unreadable image**: the file is corrupt, is not an image, or is over the node's limits. The scan step sends it to its error output, the item holds the `error` and its `code` (such as `QRS-001`), and the run goes on with the next file.

Connect a spreadsheet, a chat message or a ticket after the branches you care about.

## How it was checked

The node's test suite, `npm test` in [integrations/n8n](../README.md#build-and-test-from-source), checks this file: every scan parameter is a real node parameter, every connection points to an existing node, the file holds no credential, pinned data, webhook id or local path, and n8n's own filter sends a scan to the branch its result calls for. The workflow has not yet been imported into a running n8n. Before submission, import it into a clean self-hosted n8n with the published node, run it with the mixed fixture in the three profiles, an image without a code and a corrupt file, and take the canvas screenshot that the library asks for when a template uses a community node.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-dark.gif?v=50f76ea0d290">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-light.gif?v=4ec5c6f31076" alt="Scan inside your application, in Rust, Node.js, browser WASM or Python, in three steps: install and initialize, pass an image or a camera frame, read the result." width="100%">
  </picture>
</p>

The workflow follows the same three steps. The community node brings the engine, the file step passes each image, and the Switch node reads the result.

## What it returns

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. With `expectedText` set to `STOCK-4827`, that image takes the **Expected value found** branch, because both codes are read and one of them matches.

## What it reads

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## The same engine in other runtimes

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>

The same engine runs in a [Node-RED node](../../node-red/README.md), an [Activepieces piece](../../activepieces/README.md), and the packages listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## Licensing

The workflow file is MIT, like the [node source](../LICENSE). The community node it needs installs the published engine `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, which keeps its AGPL-3.0-or-later license.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
