<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-node-dark.gif?v=5ccb9970e48c">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-node-light.gif?v=3cddfebb8fa2" alt="QR Code &amp; Barcode Scanner for Node.js: the Node.js logo, the quick start in JavaScript, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner · n8n community node 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20n8n%20community%20node%200.1.0%20%28integrations%2Fn8n%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20n8n%20community%20node%20reads%20the%20QR%20codes%20and%20barcodes%20in%20the%20images%20of%20a%20workflow%20and%20returns%20each%20code%20as%20data.%20It%20runs%20the%20open-source%20scanner%20engine%20on%20your%20own%20n8n%20server%2C%20in%20a%20worker%20thread%2C%20with%20no%20API%20key%2C%20no%20credential%20and%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20yet%2C%20so%20the%20install%20commands%20below%20work%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fn8n%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20n8n%20community%20node%200.1.0%20%28integrations%2Fn8n%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20n8n%20community%20node%20reads%20the%20QR%20codes%20and%20barcodes%20in%20the%20images%20of%20a%20workflow%20and%20returns%20each%20code%20as%20data.%20It%20runs%20the%20open-source%20scanner%20engine%20on%20your%20own%20n8n%20server%2C%20in%20a%20worker%20thread%2C%20with%20no%20API%20key%2C%20no%20credential%20and%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20yet%2C%20so%20the%20install%20commands%20below%20work%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fn8n%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20n8n%20community%20node%200.1.0%20%28integrations%2Fn8n%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20n8n%20community%20node%20reads%20the%20QR%20codes%20and%20barcodes%20in%20the%20images%20of%20a%20workflow%20and%20returns%20each%20code%20as%20data.%20It%20runs%20the%20open-source%20scanner%20engine%20on%20your%20own%20n8n%20server%2C%20in%20a%20worker%20thread%2C%20with%20no%20API%20key%2C%20no%20credential%20and%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20yet%2C%20so%20the%20install%20commands%20below%20work%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fn8n%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20n8n%20community%20node%200.1.0%20%28integrations%2Fn8n%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20n8n%20community%20node%20reads%20the%20QR%20codes%20and%20barcodes%20in%20the%20images%20of%20a%20workflow%20and%20returns%20each%20code%20as%20data.%20It%20runs%20the%20open-source%20scanner%20engine%20on%20your%20own%20n8n%20server%2C%20in%20a%20worker%20thread%2C%20with%20no%20API%20key%2C%20no%20credential%20and%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20yet%2C%20so%20the%20install%20commands%20below%20work%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fn8n%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · n8n community node 0.1.0 (integrations/n8n/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This n8n community node reads the QR codes and barcodes in the images of a workflow and returns each code as data. It runs the open-source scanner engine on your own n8n server, in a worker thread, with no API key, no credential and no network call. Version 0.1.0 is built and tested from this folder. It is not on npm yet, so the install commands below work once it is published. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/n8n/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk https://qrcode-ai.com/en-US/barcode-scanner/sdk https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This n8n community node reads the QR codes and barcodes in the images of a workflow and returns each code as data. It runs the open-source scanner engine on your own n8n server, in a worker thread, with no API key, no credential and no network call. Version 0.1.0 is built and tested from this folder. It is not on npm yet, so the install commands below work once it is published.

You can try the same engine in a browser first. The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) reads a QR code image, and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) reads a barcode label. The [QR code scanner guide for n8n](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/n8n) and the [barcode scanner guide for n8n](https://qrcode-ai.com/en-US/barcode-scanner/integrations/n8n) explain this node for each kind of code. To call the engine from your own code instead, read the [QR code scanner SDK guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) and the [barcode scanner SDK guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk).

To make test images, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) for a QR code and the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator) for a barcode. Keep the text you encoded next to the image, then compare it with what the node returns, leading zeroes included.

## Before you install

The node needs a self-hosted n8n. n8n Cloud only installs verified community nodes, and this node cannot be verified: it depends on the scanner engine package and runs it in a worker thread, two things the verification rules exclude. The engine is WebAssembly, so the package needs no native build and no compiler on the n8n host.

The package needs Node.js 22 or later; n8n 2.48 itself requires Node.js 24. Community nodes must be enabled, which is the default on a self-hosted n8n.

## Install

In n8n, open **Settings**, then **Community nodes**, and select **Install**. Enter the package name `@qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner`, confirm that you accept the risk of an unverified node, and install. The node then appears in the nodes panel as **QR Code & Barcode Scanner**.

Without the settings page, for example in a container started with community nodes managed by hand, install the package in the n8n nodes folder and restart n8n:

```sh
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install @qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner@0.1.0
```

To remove it, uninstall it from the same settings page, or run `npm uninstall @qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner` in that folder and restart n8n.

## Use

Put the node after any step that outputs a binary image: **Read/Write Files from Disk**, **HTTP Request** with the response as a file, a form upload or an email attachment. It reads PNG, JPEG, WebP and GIF files.

- **Input Binary Field** names the binary field that holds the image. The default is `data`.
- **Profile** is `Frame` by default, which decodes every code without scoring. `Fast` and `Full` also score how well a QR code scans.
- **Output** is `One Item per Image` by default. `One Item per Code` returns one item for each decoded code instead, and nothing for an image without a code.
- **Options** adds **Budget (Ms)**, which replaces the profile's time budget (0 removes it; it is not a hard timeout), and **Include Report**, which keeps or drops the full engine report.

A ready workflow that checks label images against an expected value is in [template/](template/README.md).

## What it returns

With the default settings, an image that holds a QR code and a Code 128 barcode gives this item (the full report is left out here):

```json
{
  "texts": ["https://qrc-ai.com/76xMa", "STOCK-4827"],
  "codes": [
    {
      "symbology": "qr_code",
      "text": "https://qrc-ai.com/76xMa",
      "raw": "aHR0cHM6Ly9xcmMtYWkuY29tLzc2eE1h",
      "charset": "utf8",
      "payload": { "kind": "url", "url": "https://qrc-ai.com/76xMa" }
    },
    {
      "symbology": "code128",
      "text": "STOCK-4827",
      "raw": "U1RPQ0stNDgyNw==",
      "charset": "utf8",
      "payload": { "kind": "text" }
    }
  ],
  "count": 2,
  "profile": "frame",
  "engine": "0.11.0",
  "image": { "fileName": "mixed-code128-qr.png", "mimeType": "image/png", "field": "data" }
}
```

`raw` holds the exact bytes of each code in base64. With **Include Report** on, `report` holds the engine report unchanged: positions, scores, hints, trace and versions. The `frame` profile leaves `report.score` null, because it does not score. The image stays on the item, so a later step can still use it.

An image without a code is a normal result: `texts` is empty and `count` is 0. A corrupt file, an unknown format or an image over the limits stops the node with an error such as `Scanner error QRS-001`. With **On Error** set to continue, the item carries `error` and `code` instead, and the next items are still scanned.

## Limits

Each image can have at most 8 MiB, 4096 pixels per side and 16 million pixels in all. The budget goes from 0 to 60,000 milliseconds. The node never opens a decoded link: treat every decoded text as untrusted data before a later step acts on it. Scans of one n8n process run one after the other in one worker thread, so the editor and the other workflows stay responsive during a long scan.

## Build and test from source

The node source is [nodes/QrcodeBarcodeScanner](nodes/QrcodeBarcodeScanner). Its scan core, `scanCore.ts`, is generated from [the shared core](../automation-js-core/src/scan-core.ts) of the three JavaScript automation hosts; edit the source there and run `node integrations/automation-js-core/sync.mjs`.

```sh
cd integrations/n8n
npm ci
npm run build
npm run lint
npm test
npm pack
```

`npm run lint` runs n8n's own linter with its self-hosted rules. The tests drive the built node through n8n's execution interface with the mixed fixture in the three profiles, an empty image, a corrupt image, several items and the template. They do not start n8n itself: run the installed package once in a real self-hosted n8n before a release.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-dark.gif?v=50f76ea0d290">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-light.gif?v=4ec5c6f31076" alt="Scan inside your application, in Rust, Node.js, browser WASM or Python, in three steps: install and initialize, pass an image or a camera frame, read the result." width="100%">
  </picture>
</p>

The node follows the same three steps. It installs the engine with the package, passes each binary image to it, and turns the report into n8n items.

## The codes in one report

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of the image used in the example above. Both codes come back in the same report, each with its format, its exact text and the place where the engine measured it.

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

The same engine also runs as a [Node-RED node](../node-red/README.md) and an [Activepieces piece](../activepieces/README.md). The Rust, Node.js, browser and Python packages hold the engine, and every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## Licensing

The node's own source is MIT, in [LICENSE](LICENSE). The package installs the published engine, `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, as a separate npm dependency, and that archive keeps its AGPL-3.0-or-later license. The node copies no engine code into its own package. Read the engine's packaged license before you distribute an n8n installation that includes it.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
