<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-node-dark.gif?v=5ccb9970e48c">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-node-light.gif?v=3cddfebb8fa2" alt="QR Code &amp; Barcode Scanner for Node.js: the Node.js logo, the quick start in JavaScript, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner · Activepieces piece 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Activepieces%20piece%200.1.0%20%28integrations%2Factivepieces%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Activepieces%20piece%20adds%20one%20action%2C%20Scan%20Image%2C%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20file%20and%20returns%20their%20texts%20and%20the%20scanner%20report.%20It%20runs%20the%20open-source%20scanner%20engine%20on%20your%20Activepieces%20worker%2C%20in%20a%20worker%20thread%2C%20with%20no%20connection%20to%20set%20up%20and%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20yet%2C%20and%20it%20is%20not%20part%20of%20the%20official%20Activepieces%20catalogue%3A%20you%20install%20it%20by%20its%20npm%20name%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Factivepieces%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Factivepieces%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Factivepieces%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Activepieces%20piece%200.1.0%20%28integrations%2Factivepieces%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Activepieces%20piece%20adds%20one%20action%2C%20Scan%20Image%2C%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20file%20and%20returns%20their%20texts%20and%20the%20scanner%20report.%20It%20runs%20the%20open-source%20scanner%20engine%20on%20your%20Activepieces%20worker%2C%20in%20a%20worker%20thread%2C%20with%20no%20connection%20to%20set%20up%20and%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20yet%2C%20and%20it%20is%20not%20part%20of%20the%20official%20Activepieces%20catalogue%3A%20you%20install%20it%20by%20its%20npm%20name%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Factivepieces%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Factivepieces%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Factivepieces%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Activepieces%20piece%200.1.0%20%28integrations%2Factivepieces%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Activepieces%20piece%20adds%20one%20action%2C%20Scan%20Image%2C%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20file%20and%20returns%20their%20texts%20and%20the%20scanner%20report.%20It%20runs%20the%20open-source%20scanner%20engine%20on%20your%20Activepieces%20worker%2C%20in%20a%20worker%20thread%2C%20with%20no%20connection%20to%20set%20up%20and%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20yet%2C%20and%20it%20is%20not%20part%20of%20the%20official%20Activepieces%20catalogue%3A%20you%20install%20it%20by%20its%20npm%20name%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Factivepieces%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Factivepieces%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Factivepieces%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Activepieces%20piece%200.1.0%20%28integrations%2Factivepieces%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Activepieces%20piece%20adds%20one%20action%2C%20Scan%20Image%2C%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20file%20and%20returns%20their%20texts%20and%20the%20scanner%20report.%20It%20runs%20the%20open-source%20scanner%20engine%20on%20your%20Activepieces%20worker%2C%20in%20a%20worker%20thread%2C%20with%20no%20connection%20to%20set%20up%20and%20no%20network%20call.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20on%20npm%20yet%2C%20and%20it%20is%20not%20part%20of%20the%20official%20Activepieces%20catalogue%3A%20you%20install%20it%20by%20its%20npm%20name%20once%20it%20is%20published.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Factivepieces%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Factivepieces%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Factivepieces%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · Activepieces piece 0.1.0 (integrations/activepieces/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This Activepieces piece adds one action, Scan Image, that reads the QR codes and barcodes in an image file and returns their texts and the scanner report. It runs the open-source scanner engine on your Activepieces worker, in a worker thread, with no connection to set up and no network call. Version 0.1.0 is built and tested from this folder. It is not on npm yet, and it is not part of the official Activepieces catalogue: you install it by its npm name once it is published. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/activepieces/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/activepieces https://qrcode-ai.com/en-US/barcode-scanner/integrations/activepieces https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This Activepieces piece adds one action, **Scan Image**, that reads the QR codes and barcodes in an image file and returns their texts and the scanner report. It runs the open-source scanner engine on your Activepieces worker, in a worker thread, with no connection to set up and no network call. Version 0.1.0 is built and tested from this folder. It is not on npm yet, and it is not part of the official Activepieces catalogue: you install it by its npm name once it is published.

You can try the same engine in a browser first. The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) reads a QR code image, and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) reads a barcode label. The [QR code scanner guide for Activepieces](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/activepieces) and the [barcode scanner guide for Activepieces](https://qrcode-ai.com/en-US/barcode-scanner/integrations/activepieces) explain this piece for each kind of code. To call the engine from your own code instead, read the [QR code scanner SDK guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) and the [barcode scanner SDK guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk).

To make test images, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) for a QR code and the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator) for a barcode. Keep the text you encoded next to the image, then compare it with what the action returns, leading zeroes included.

## Before you install

A platform admin installs custom pieces, and the Activepieces edition decides whether custom pieces from npm are allowed. The piece declares Activepieces 0.30.0 as its lowest release. The engine is WebAssembly, so the package needs no native build on the worker.

## Install

In Activepieces, open **Platform Admin**, then **Catalogue**, then **Pieces**, and select **Install Piece**. Choose the npm registry as the source, enter `@qrcode-ai-com/piece-qrcode-barcode-scanner` with version `0.1.0`, and install. The same dialog also accepts a `.tgz` file with **Upload File**, which installs a reviewed archive without npm.

In a flow, add the **QR Code & Barcode Scanner** piece and its **Scan Image** action. Removing the piece from the same page removes the action.

## Use

- **Image** is the file to scan: a PNG, JPEG, WebP or GIF file from an earlier step, such as a form upload, an email attachment or an HTTP response.
- **Profile** is `Frame` by default, which decodes every code without scoring. `Fast` and `Full` also score how well a QR code scans.
- **Budget (ms)** replaces the profile's time budget, from 0 to 60000. Leave it empty for the profile default. 0 removes the budget. It is not a hard timeout.
- **Include the full report** is on by default. Turn it off to keep only the texts and the codes.

## What it returns

For an image that holds a QR code and a Code 128 barcode, with the full report turned off, the action returns:

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
  "file": { "name": "mixed-code128-qr.png", "extension": "png" }
}
```

`raw` holds the exact bytes of each code in base64. With **Include the full report** on, the default, the output also has `report`, the engine report unchanged: positions, scores, hints, trace and versions. The `frame` profile leaves `report.score` null, because it does not score.

An image without a code is a normal result: `texts` is empty and `count` is 0. A corrupt file, an unknown format or an image over the limits fails the step with a message that ends with its code, such as `[QRS-001]` or `[QRSCAN_INPUT_LIMIT]`. The step's **Continue on Failure** setting lets the flow go on after such an image.

## Limits

Each image can have at most 8 MiB, 4096 pixels per side and 16 million pixels in all. The action never opens a decoded link: treat every decoded text as untrusted data before a later step acts on it. Scans run one after the other in one worker thread per engine process.

## Build and test from source

Activepieces builds pieces inside its own monorepo, because the framework libraries live there. This folder holds the piece in that layout: `package.json`, `tsconfig.json`, `tsconfig.lib.json`, `.eslintrc.json` and [src](src). Its scan core, `src/lib/scan-core.ts`, is generated from [the shared core](../automation-js-core/src/scan-core.ts) of the three JavaScript automation hosts; edit the source there and run `node integrations/automation-js-core/sync.mjs`.

`"bundleDeps"` lists the framework's own dependencies, so they are inlined as in a default build, while the engine package stays external. The engine reads its `.wasm` file at run time and is found with `require.resolve`, which a bundle cannot inline. The published manifest therefore depends on the engine only.

The [test](test) folder builds and checks the piece with npm packages only:

```sh
cd integrations/activepieces/test
npm ci
npm test
```

`npm test` type checks the piece with its monorepo compiler settings, bundles it with the monorepo's esbuild settings and safety gate, writes the published manifest and a notice file for the inlined code, packs `build/qrcode-ai-com-piece-qrcode-barcode-scanner-0.1.0.tgz`, then loads the bundle the way the Activepieces engine does and runs **Scan Image** on the mixed fixture in the three profiles, an empty image and refused inputs. That build uses the framework published on npm, which is older than the monorepo's.

To build with Activepieces' own bundler and current framework source instead, pass a checkout of `activepieces/activepieces` at revision `ca93da9cd7a3b93250a8c9858b74d0d96832d90f`. A sparse checkout of `packages/cli`, `packages/pieces/framework`, `packages/core/utils` and `packages/core/piece-types` is enough, and the harness pins the versions of the packages the monorepo inlines. This is the build to publish:

```sh
node build.mjs --activepieces /path/to/activepieces
npm run test:built
```

In a full Activepieces checkout, `node integrations/activepieces/stage.mjs /path/to/activepieces` copies the piece to `packages/pieces/custom/qrcode-barcode-scanner`, where `npm run build-piece qrcode-barcode-scanner` builds it with the monorepo's own command. None of these runs start Activepieces: install the archive once on a real instance, in each execution mode you use, before a release.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-dark.gif?v=50f76ea0d290">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-light.gif?v=4ec5c6f31076" alt="Scan inside your application, in Rust, Node.js, browser WASM or Python, in three steps: install and initialize, pass an image or a camera frame, read the result." width="100%">
  </picture>
</p>

The piece follows the same three steps. It installs the engine with the package, passes the image file to it, and returns the report as the step output.

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

The same engine also runs as an [n8n community node](../n8n/README.md) and a [Node-RED node](../node-red/README.md). The Rust, Node.js, browser and Python packages hold the engine, and every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## Licensing

The piece's own source is MIT, in [LICENSE](LICENSE). Its bundle inlines the Activepieces framework (MIT) and four small libraries, zod, nanoid and ipaddr.js (MIT) and deepmerge-ts (BSD-3-Clause), whose notices the package carries in `THIRD-PARTY-NOTICES.txt`. It inlines no engine code. The package installs the published engine, `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, as a separate npm dependency, and that archive keeps its AGPL-3.0-or-later license. Read the engine's packaged license before you distribute an Activepieces installation that includes it.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
