<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-make-dark.gif?v=63721162a2fd">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-make-light.gif?v=7fa17341b061" alt="QR Code &amp; Barcode Scanner for Make: the Make logo, the Scan an Image module with its connection and output bundle, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner · Make app 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Make%20app%200.1.0%20%28integrations%2Fmake%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Make%20custom%20app%20adds%20one%20module%20to%20your%20scenarios%2C%20Scan%20an%20Image%2C%20under%20the%20QR%20Code%20AI%20name.%20It%20sends%20an%20image%20file%20from%20an%20earlier%20module%20to%20a%20scan%20service%20that%20you%20run%2C%20and%20returns%20every%20QR%20code%20and%20barcode%20the%20open-source%20scanner%20engine%20reads%20in%20it%3A%20the%20number%20of%20codes%2C%20each%20code%27s%20format%2C%20its%20text%20and%20its%20exact%20bytes.%20The%20connection%20holds%20the%20base%20URL%20of%20your%20service.%20Version%200.1.0%20is%20source%20in%20this%20folder%2C%20checked%20and%20tested%20on%20each%20change.%20It%20is%20not%20in%20Make%27s%20app%20directory%2C%20and%20no%20hos%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fmake%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fmake%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fmake%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Make%20app%200.1.0%20%28integrations%2Fmake%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Make%20custom%20app%20adds%20one%20module%20to%20your%20scenarios%2C%20Scan%20an%20Image%2C%20under%20the%20QR%20Code%20AI%20name.%20It%20sends%20an%20image%20file%20from%20an%20earlier%20module%20to%20a%20scan%20service%20that%20you%20run%2C%20and%20returns%20every%20QR%20code%20and%20barcode%20the%20open-source%20scanner%20engine%20reads%20in%20it%3A%20the%20number%20of%20codes%2C%20each%20code%27s%20format%2C%20its%20text%20and%20its%20exact%20bytes.%20The%20connection%20holds%20the%20base%20URL%20of%20your%20service.%20Version%200.1.0%20is%20source%20in%20this%20folder%2C%20checked%20and%20tested%20on%20each%20change.%20It%20is%20not%20in%20Make%27s%20app%20directory%2C%20and%20no%20hos%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fmake%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fmake%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fmake%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Make%20app%200.1.0%20%28integrations%2Fmake%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Make%20custom%20app%20adds%20one%20module%20to%20your%20scenarios%2C%20Scan%20an%20Image%2C%20under%20the%20QR%20Code%20AI%20name.%20It%20sends%20an%20image%20file%20from%20an%20earlier%20module%20to%20a%20scan%20service%20that%20you%20run%2C%20and%20returns%20every%20QR%20code%20and%20barcode%20the%20open-source%20scanner%20engine%20reads%20in%20it%3A%20the%20number%20of%20codes%2C%20each%20code%27s%20format%2C%20its%20text%20and%20its%20exact%20bytes.%20The%20connection%20holds%20the%20base%20URL%20of%20your%20service.%20Version%200.1.0%20is%20source%20in%20this%20folder%2C%20checked%20and%20tested%20on%20each%20change.%20It%20is%20not%20in%20Make%27s%20app%20directory%2C%20and%20no%20hos%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fmake%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fmake%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fmake%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Make%20app%200.1.0%20%28integrations%2Fmake%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Make%20custom%20app%20adds%20one%20module%20to%20your%20scenarios%2C%20Scan%20an%20Image%2C%20under%20the%20QR%20Code%20AI%20name.%20It%20sends%20an%20image%20file%20from%20an%20earlier%20module%20to%20a%20scan%20service%20that%20you%20run%2C%20and%20returns%20every%20QR%20code%20and%20barcode%20the%20open-source%20scanner%20engine%20reads%20in%20it%3A%20the%20number%20of%20codes%2C%20each%20code%27s%20format%2C%20its%20text%20and%20its%20exact%20bytes.%20The%20connection%20holds%20the%20base%20URL%20of%20your%20service.%20Version%200.1.0%20is%20source%20in%20this%20folder%2C%20checked%20and%20tested%20on%20each%20change.%20It%20is%20not%20in%20Make%27s%20app%20directory%2C%20and%20no%20hos%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fmake%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fmake%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fmake%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · Make app 0.1.0 (integrations/make/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This Make custom app adds one module to your scenarios, Scan an Image, under the QR Code AI name. It sends an image file from an earlier module to a scan service that you run, and returns every QR code and barcode the open-source scanner engine reads in it: the number of codes, each code's format, its text and its exact bytes. The connection holds the base URL of your service. Version 0.1.0 is source in this folder, checked and tested on each change. It is not in Make's app directory, and no hos Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/make/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/make https://qrcode-ai.com/en-US/barcode-scanner/integrations/make https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This Make custom app adds one module to your scenarios, Scan an Image, under the QR Code AI name. It sends an image file from an earlier module to a scan service that you run, and returns every QR code and barcode the open-source scanner engine reads in it: the number of codes, each code's format, its text and its exact bytes. The connection holds the base URL of your service. Version 0.1.0 is source in this folder, checked and tested on each change. It is not in Make's app directory, and no hosted scan service exists for it: a scenario can use it only in a Make organization where its owner has deployed it, with a scan service of their own.

You can try the same engine in a browser first. The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) reads a QR code image, and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) reads a barcode label. The [QR code scanner guide for Make](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/make) and the [barcode scanner guide for Make](https://qrcode-ai.com/en-US/barcode-scanner/integrations/make) explain this module for each kind of code.

To make test images, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) for a QR code and the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator) for a barcode. Keep the text you encoded next to the image, then compare it with the module's **Codes**, leading zeroes included.

## What you can build with it

Scan an Image fits after any module that gives a scenario a file:

- read the QR code on a scanned invoice that arrives as an email attachment, and add the decoded text to a spreadsheet row;
- read the barcode on a product photo uploaded through a form, and look the code up in your inventory;
- read the QR codes of the images that land in a cloud storage folder, and post each decoded link to a chat channel.

An image can hold several codes of different kinds; each one comes back once, in the **Codes** array, ready for an iterator.

## The scan service

The module does not read the image itself. It calls the scanner's HTTP service, which runs the same engine on a server: `POST /scan` reads the image in the request body and answers with the scanner's JSON report, and `GET /healthz` answers once the engine is loaded. The service has no authentication of its own, so put it on a network or behind a gateway you control before a Make scenario reaches it. It is not released yet, and this app has nothing to call until it is.

## Use

Create a connection with the **Base URL** of your scan service, such as `https://scan.example.com`. Make checks it by calling `GET /healthz`, and shows the service and engine versions it answers with.

In a scenario, add the **QR Code AI** app, then the **Scan an Image** module:

| Field | What to enter |
| --- | --- |
| **File name** | The name of the file, mapped from the module that gives the file. |
| **Data** | The file's data, mapped from the same module. |
| **Profile** | `frame` (the default) for one clear photo or scan, `fast` for a quick pass, `full` for a difficult image. |

**Make an API call** sends any other request to the same service, with a path relative to the base URL.

## Output

| Field | Content |
| --- | --- |
| **Number of codes** | How many codes the engine read, `0` when there are none. |
| **Codes** | One item per code: its symbology, such as `qr_code` or `code128`, its text, its bytes in base64, its charset, its parsed payload, its corners and its metadata. |
| **Score**, **Hints**, **Trace** | The rest of the scanner report: the image score, hints about what limited the read, and whether the time budget ran out. |
| **Versions** | The scanner, pipeline and score contract versions that produced the report. |

## Errors

Make shows each refusal as `[status] code: message`, with the service's own code:

| Status | Code | Make error | When |
| --- | --- | --- | --- |
| 400 | `QRSHTTP_NO_IMAGE`, `QRSHTTP_MODE`, `QRSHTTP_MULTIPART` | data error | The file is empty, the profile is unknown, or the upload is malformed. |
| 413 | `QRSHTTP_INPUT_LIMIT` | data error | The image is larger than the service accepts. |
| 415 | `QRSHTTP_MEDIA_TYPE` | data error | The request is not an image or a form upload. |
| 422 | `QRS-001` and the other engine codes | data error | The engine refused the image, such as a file that is not a decodable image. |
| 503 | `QRSHTTP_BUSY` | connection error | The service is reading as many images as it allows; Make can retry. |

A connection that cannot reach the service, or a base URL that does not answer `GET /healthz`, fails when you save it.

## Build and test

The folder holds the app in the local file format of Make's [Apps Editor for Visual Studio Code](https://github.com/integromat/vscode-apps-sdk): `makecomapp.json` names every file, and each component keeps its communication, parameters and interface in its own file. To check it:

```sh
npm ci --ignore-scripts
npm test
```

The tests validate `makecomapp.json` and every file it names against the Apps Editor's own JSON schemas, pinned by commit and SHA-256. They check that the app uses only the IML expressions they can evaluate, then evaluate them: the connection and both modules send their real requests to a stub of the scan service backed by the published WebAssembly engine, and the mixed fixture must give its QR code and its Code 128 in the three profiles, with the exact texts. Set `QRSCAN_MAKE_SERVICE_URL` to the base URL of a running scan service to send the same requests to it instead.

The [integration workflow](../../.github/workflows/integration-make.yml) runs these tests on each change, and against the scan service itself once the service is on the revision under test. Nothing is deployed to Make.

## The codes in one report

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both codes come back in the same bundle, each with its format, its exact text and the place where the engine measured it.

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

The same engine also runs inside an [n8n community node](../n8n/README.md), a [Node-RED node](../node-red/README.md) and an [Activepieces piece](../activepieces/README.md), which read the image in the workflow step and need no service. The Rust, Node.js, browser and Python packages hold the engine, and every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## Licensing

The app's own files are MIT, in [LICENSE](LICENSE). The app holds no engine code: the scan service runs the engine, under the license of the engine version it ships. The tests use the published `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, under its AGPL-3.0-or-later license, and download Make's JSON schemas from the Apps Editor repository, under its own license; neither is part of the app. [LISTING.md](LISTING.md) holds the values and the steps for deploying the app to Make.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
