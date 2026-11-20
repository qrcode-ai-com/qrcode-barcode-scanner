<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-node-dark.gif?v=5ccb9970e48c">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-node-light.gif?v=3cddfebb8fa2" alt="QR Code &amp; Barcode Scanner for Node.js: the Node.js logo, the quick start in JavaScript, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner · Node-RED node 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Node-RED%20node%200.1.0%20%28integrations%2Fnode-red%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Node-RED%20node%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20and%20sends%20the%20scanner%20report%20on%2C%20with%20the%20decoded%20texts%20ready%20to%20use.%20It%20takes%20image%20bytes%20or%20the%20path%20of%20an%20image%20file%2C%20runs%20the%20open-source%20scanner%20engine%20on%20the%20Node-RED%20host%20in%20a%20worker%20thread%2C%20and%20makes%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20or%20in%20the%20Node-RED%20Flow%20Library%20yet%2C%20so%20the%20install%20steps%20below%20work%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fnode-red%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fnode-red%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fnode-red%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Node-RED%20node%200.1.0%20%28integrations%2Fnode-red%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Node-RED%20node%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20and%20sends%20the%20scanner%20report%20on%2C%20with%20the%20decoded%20texts%20ready%20to%20use.%20It%20takes%20image%20bytes%20or%20the%20path%20of%20an%20image%20file%2C%20runs%20the%20open-source%20scanner%20engine%20on%20the%20Node-RED%20host%20in%20a%20worker%20thread%2C%20and%20makes%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20or%20in%20the%20Node-RED%20Flow%20Library%20yet%2C%20so%20the%20install%20steps%20below%20work%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fnode-red%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fnode-red%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fnode-red%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Node-RED%20node%200.1.0%20%28integrations%2Fnode-red%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Node-RED%20node%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20and%20sends%20the%20scanner%20report%20on%2C%20with%20the%20decoded%20texts%20ready%20to%20use.%20It%20takes%20image%20bytes%20or%20the%20path%20of%20an%20image%20file%2C%20runs%20the%20open-source%20scanner%20engine%20on%20the%20Node-RED%20host%20in%20a%20worker%20thread%2C%20and%20makes%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20or%20in%20the%20Node-RED%20Flow%20Library%20yet%2C%20so%20the%20install%20steps%20below%20work%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fnode-red%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fnode-red%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fnode-red%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Node-RED%20node%200.1.0%20%28integrations%2Fnode-red%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Node-RED%20node%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20and%20sends%20the%20scanner%20report%20on%2C%20with%20the%20decoded%20texts%20ready%20to%20use.%20It%20takes%20image%20bytes%20or%20the%20path%20of%20an%20image%20file%2C%20runs%20the%20open-source%20scanner%20engine%20on%20the%20Node-RED%20host%20in%20a%20worker%20thread%2C%20and%20makes%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20or%20in%20the%20Node-RED%20Flow%20Library%20yet%2C%20so%20the%20install%20steps%20below%20work%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fnode-red%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fnode-red%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fnode-red%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · Node-RED node 0.1.0 (integrations/node-red/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This Node-RED node reads the QR codes and barcodes in an image and sends the scanner report on, with the decoded texts ready to use. It takes image bytes or the path of an image file, runs the open-source scanner engine on the Node-RED host in a worker thread, and makes no network call. Version 0.1.0 is built and tested from this folder. It is not on npm or in the Node-RED Flow Library yet, so the install steps below work once it is published. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/node-red/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/node-red https://qrcode-ai.com/en-US/barcode-scanner/integrations/node-red https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This Node-RED node reads the QR codes and barcodes in an image and sends the scanner report on, with the decoded texts ready to use. It takes image bytes or the path of an image file, runs the open-source scanner engine on the Node-RED host in a worker thread, and makes no network call. Version 0.1.0 is built and tested from this folder. It is not on npm or in the Node-RED Flow Library yet, so the install steps below work once it is published.

You can try the same engine in a browser first. The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) reads a QR code image, and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) reads a barcode label. The [QR code scanner guide for Node-RED](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/node-red) and the [barcode scanner guide for Node-RED](https://qrcode-ai.com/en-US/barcode-scanner/integrations/node-red) explain this node for each kind of code. To call the engine from your own code instead, read the [QR code scanner SDK guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) and the [barcode scanner SDK guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk).

To make test images, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) for a QR code and the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator) for a barcode. Keep the text you encoded next to the image, then compare it with `msg.texts`, leading zeroes included.

## Before you install

The node needs Node-RED 5.0 or later, which needs Node.js 22.9 or later. The engine is WebAssembly, so the package needs no native build and no compiler, and it does not depend on the processor or the C library of the host.

## Install

In the Node-RED editor, open the menu, choose **Manage palette**, then the **Install** tab. Search for `@qrcode-ai-com/node-red-qrcode-barcode-scanner` and select **install**. The node appears in the **parser** category of the palette as **qr & barcode scan**.

From a shell, install it in your Node-RED user directory, usually `~/.node-red`, then restart Node-RED:

```sh
cd ~/.node-red
npm install @qrcode-ai-com/node-red-qrcode-barcode-scanner@0.1.0
```

To remove it, use **Manage palette** again, or run `npm uninstall @qrcode-ai-com/node-red-qrcode-barcode-scanner` in the same directory and restart.

## Use

Wire the node after any node that puts an image in a message: **file in** with a single Buffer output, **http request** with a binary response, an MQTT input carrying image bytes, or an **inject** node with a file path.

- **Image** is the message property that holds the image, `msg.payload` by default. It can hold a Buffer of PNG, JPEG, WebP or GIF bytes, or the path of an image file. A relative path starts from the Node-RED working directory, like the core file nodes.
- **Profile** is `frame` by default, which decodes every code without scoring. `fast` and `full` also score how well a QR code scans.
- **Budget (ms)** replaces the profile's time budget, from 0 to 60000. Leave it empty for the profile default. 0 removes the budget. It is not a hard timeout.

A message can override the settings with `msg.profile` and `msg.budgetMs`. The node keeps every other property of the message.

To import a ready flow, open the menu, choose **Import**, then **Examples**, and select **scan-image** under this package. It scans an image path, sends the decoded texts or the empty result to two debug nodes, and catches scan errors with a **catch** node.

## What it returns

The node sets three properties and sends the message on:

- `msg.payload` is the complete scanner report, unchanged: detections, scores, hints, trace and versions.
- `msg.texts` lists the decoded texts, one per code, in report order. For the image in the picture below, it is `["https://qrc-ai.com/76xMa", "STOCK-4827"]`.
- `msg.codes` holds one object per code, with `symbology` (such as `qr_code` or `code128`), `text`, the exact bytes in base64 as `raw`, `charset` and the parsed `payload`.

An image without a code is a normal result: `msg.texts` is an empty array and the status reads **no code**. A corrupt file, an unknown format, a missing file or an input over the limits raises an error that a **catch** node receives, and the status shows its code, such as `QRS-001` or `QRSCAN_INPUT_LIMIT`. The `frame` profile leaves `msg.payload.score` null, because it does not score.

## Limits

Each image can have at most 8 MiB, 4096 pixels per side and 16 million pixels in all. The node never opens a decoded link: treat every decoded text as untrusted data before a later node acts on it. Scans run one after the other in one worker thread per Node-RED process, so the other flows keep running during a long scan.

## Build and test from source

The node is [nodes/scan.js](nodes/scan.js) with its editor file [nodes/scan.html](nodes/scan.html). Its scan core, `nodes/scan-core.js`, is generated from [the shared core](../automation-js-core/src/scan-core.ts) of the three JavaScript automation hosts; edit the source there and run `node integrations/automation-js-core/sync.mjs`.

```sh
cd integrations/node-red
npm ci
npm test
npm pack
```

The tests load the node into a Node-RED 5 runtime with `node-red-node-test-helper`. They scan the mixed fixture as a Buffer and as a file path in the three profiles, an empty image, a corrupt file, a missing file and wrong inputs, and run the packaged example flow with the core switch and catch nodes. They do not open the editor: install the package once in a real Node-RED before a release.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-dark.gif?v=50f76ea0d290">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-light.gif?v=4ec5c6f31076" alt="Scan inside your application, in Rust, Node.js, browser WASM or Python, in three steps: install and initialize, pass an image or a camera frame, read the result." width="100%">
  </picture>
</p>

The node follows the same three steps. It installs the engine with the package, passes each image to it, and puts the report on the message.

## The codes in one report

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both codes come back in the same report, each with its format, its exact text and the place where the engine measured it.

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

The same engine also runs as an [n8n community node](../n8n/README.md) and an [Activepieces piece](../activepieces/README.md). The Rust, Node.js, browser and Python packages hold the engine, and every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## Licensing

The node's own source is MIT, in [LICENSE](LICENSE). The package installs the published engine, `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, as a separate npm dependency, and that archive keeps its AGPL-3.0-or-later license. The node copies no engine code into its own package. Read the engine's packaged license before you distribute a Node-RED installation that includes it.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
