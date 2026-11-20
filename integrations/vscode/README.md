<!-- qrcode-ai-brand-header:v2 -->
<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-vscode-dark.gif?v=24258416096c">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-vscode-light.gif?v=2262d54dabc2" alt="QR Code &amp; Barcode Scanner for VS Code: the VS Code logo, the Explorer command that scans a right-clicked image, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>
<!-- /qrcode-ai-brand-header:v2 -->

# QR Code & Barcode Scanner · VS Code extension 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20VS%20Code%20extension%200.1.0%20%28integrations%2Fvscode%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20VS%20Code%20extension%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20file%20of%20your%20workspace.%20Right-click%20a%20PNG%2C%20JPEG%2C%20WebP%2C%20GIF%20or%20BMP%20file%20and%20choose%20Scan%20QR%20codes%20and%20barcodes.%20Each%20decoded%20text%2C%20its%20format%20and%20the%20engine%20report%20appear%20in%20an%20output%20channel%2C%20and%20you%20can%20copy%20each%20text.%20The%20scan%20runs%20on%20your%20machine%20with%20the%20published%20WebAssembly%20engine%200.11.0%3A%20no%20network%2C%20no%20native%20binary%2C%20one%20package%20for%20every%20platform.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fvscode%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fvscode%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fvscode%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20VS%20Code%20extension%200.1.0%20%28integrations%2Fvscode%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20VS%20Code%20extension%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20file%20of%20your%20workspace.%20Right-click%20a%20PNG%2C%20JPEG%2C%20WebP%2C%20GIF%20or%20BMP%20file%20and%20choose%20Scan%20QR%20codes%20and%20barcodes.%20Each%20decoded%20text%2C%20its%20format%20and%20the%20engine%20report%20appear%20in%20an%20output%20channel%2C%20and%20you%20can%20copy%20each%20text.%20The%20scan%20runs%20on%20your%20machine%20with%20the%20published%20WebAssembly%20engine%200.11.0%3A%20no%20network%2C%20no%20native%20binary%2C%20one%20package%20for%20every%20platform.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fvscode%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fvscode%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fvscode%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20VS%20Code%20extension%200.1.0%20%28integrations%2Fvscode%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20VS%20Code%20extension%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20file%20of%20your%20workspace.%20Right-click%20a%20PNG%2C%20JPEG%2C%20WebP%2C%20GIF%20or%20BMP%20file%20and%20choose%20Scan%20QR%20codes%20and%20barcodes.%20Each%20decoded%20text%2C%20its%20format%20and%20the%20engine%20report%20appear%20in%20an%20output%20channel%2C%20and%20you%20can%20copy%20each%20text.%20The%20scan%20runs%20on%20your%20machine%20with%20the%20published%20WebAssembly%20engine%200.11.0%3A%20no%20network%2C%20no%20native%20binary%2C%20one%20package%20for%20every%20platform.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fvscode%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fvscode%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fvscode%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20VS%20Code%20extension%200.1.0%20%28integrations%2Fvscode%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20VS%20Code%20extension%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20file%20of%20your%20workspace.%20Right-click%20a%20PNG%2C%20JPEG%2C%20WebP%2C%20GIF%20or%20BMP%20file%20and%20choose%20Scan%20QR%20codes%20and%20barcodes.%20Each%20decoded%20text%2C%20its%20format%20and%20the%20engine%20report%20appear%20in%20an%20output%20channel%2C%20and%20you%20can%20copy%20each%20text.%20The%20scan%20runs%20on%20your%20machine%20with%20the%20published%20WebAssembly%20engine%200.11.0%3A%20no%20network%2C%20no%20native%20binary%2C%20one%20package%20for%20every%20platform.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fvscode%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fvscode%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fvscode%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · VS Code extension 0.1.0 (integrations/vscode/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This VS Code extension reads the QR codes and barcodes in an image file of your workspace. Right-click a PNG, JPEG, WebP, GIF or BMP file and choose Scan QR codes and barcodes. Each decoded text, its format and the engine report appear in an output channel, and you can copy each text. The scan runs on your machine with the published WebAssembly engine 0.11.0: no network, no native binary, one package for every platform. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/vscode/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/vscode https://qrcode-ai.com/en-US/barcode-scanner/integrations/vscode https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This VS Code extension reads the QR codes and barcodes in an image file of your workspace. Right-click a PNG, JPEG, WebP, GIF or BMP file and choose Scan QR codes and barcodes. Each decoded text, its format and the engine report appear in an output channel, and you can copy each text. The scan runs on your machine with the published WebAssembly engine 0.11.0: no network, no native binary, one package for every platform.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) of QR Code AI read the same codes in a browser. The [QR code scanner guide for VS Code](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/vscode) and the [barcode scanner guide for VS Code](https://qrcode-ai.com/en-US/barcode-scanner/integrations/vscode) describe this extension for each kind of code. If a page is not online yet, this README is the reference.

To make a test image, encode a known text with the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep that text next to the exported image. Then compare it with the text the extension decodes, leading zeroes included.

## Install

The extension needs VS Code 1.74 or later. Its identifier is `qrcode-ai-com.qrcode-barcode-scanner` on the Visual Studio Marketplace and on Open VSX.

### From the Visual Studio Marketplace

In VS Code, open the Extensions view, search for QR Code & Barcode Scanner and choose Install. You can also open its [page on the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=qrcode-ai-com.qrcode-barcode-scanner), or install it from a terminal:

```sh
code --install-extension qrcode-ai-com.qrcode-barcode-scanner
```

### From Open VSX

VSCodium, Cursor and other editors built on VS Code install extensions from Open VSX. Search for QR Code & Barcode Scanner in their Extensions view, or open its [page on Open VSX](https://open-vsx.org/extension/qrcode-ai-com/qrcode-barcode-scanner). From a terminal, use the editor's own command with the same identifier:

```sh
codium --install-extension qrcode-ai-com.qrcode-barcode-scanner
```

### From source

You can also build the VSIX file from this folder and install it. You need Node.js 22 or later, npm and Git.

```sh
git clone https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust.git
cd qrcode-barcode-scanner-rust/integrations/vscode
npm ci
npm run package
code --install-extension out/qrcode-barcode-scanner-0.1.0.vsix
```

`npm run package` checks that the installed engine is version 0.11.0 and that its WebAssembly module matches the SHA-256 of its build record. It then bundles the extension and writes `out/qrcode-barcode-scanner-0.1.0.vsix`. You can also open the Command Palette in VS Code, run Extensions: Install from VSIX... and choose that file. Editors built on VS Code, such as VSCodium or Cursor, take the same file with their own command (`codium`, `cursor`).

## Use

- In the Explorer, right-click an image and choose **Scan QR codes and barcodes**. Select several images first to scan them in turn.
- With an image open in an editor tab, use the same command in the editor title bar or in the tab's context menu.
- From the Command Palette, run **QR Code & Barcode Scanner: Scan QR codes and barcodes** and choose one or more image files.

While the scan runs, a notification shows its progress, and Cancel stops it at once. The output channel named QR Code & Barcode Scanner then lists each image, the profile and budget used, each code with its format and text, the QR quality score, and the engine report as JSON. A quick pick lists each decoded text with its format: select one to copy it exactly. Its last two items copy the engine report as JSON and show the output.

The extension never opens a decoded link and never runs what it reads. The output and the quick pick show hidden control and direction characters as `\u{...}` escapes. The copied text stays exactly what the code holds.

## Settings

- `qrcodeBarcodeScanner.profile`: `full` (the default), `fast` or `frame`.
- `qrcodeBarcodeScanner.budgetMs`: empty (the default), or a number of milliseconds from 0 to 60000.

The `full` profile runs every decode stage and the full QR quality score. The `fast` profile runs fewer stages and a reduced score. The `frame` profile only decodes, with the stages meant for camera frames, and gives no score. An empty budget keeps the profile's own: 4000 ms for `full`, 800 ms for `fast` and 80 ms for `frame`. A budget of 0 removes the limit. When the budget stops a scan, the output says so, because the result may then be incomplete.

## Limits

- The engine reads PNG, JPEG, WebP and GIF files. The extension decodes BMP files itself: 1, 4, 8, 16, 24 and 32 bits per pixel, uncompressed or with bit fields. It refuses compressed BMP files (RLE) with a message; save them as PNG.
- Files up to 64 MiB, and images up to 10,000 pixels on a side and 64 million pixels.
- The extension runs where the workspace runs and reads files through VS Code, so it is meant for local, remote and virtual workspaces. It has no web build: vscode.dev and github.dev cannot run it.
- Its tests run the bundled extension with a recorded `vscode` module. It has not yet been run in a real editor.

## How it works

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-dark.gif?v=50f76ea0d290">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-light.gif?v=4ec5c6f31076" alt="Scan inside your application, in Rust, Node.js, browser WASM or Python, in three steps: install and initialize, pass an image or a camera frame, read the result." width="100%">
  </picture>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The picture shows the three steps of every engine package: install and initialize, pass an image or a camera frame, read the result. In this extension, VS Code reads the file you chose. A worker thread starts the engine's WebAssembly module and scans the bytes, so the editor stays responsive. The extension then writes the report to the output channel and offers the texts to copy.

## What it returns

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. The extension's tests scan that image, [`fixtures/symbology/mixed-code128-qr.png`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/fixtures/symbology/mixed-code128-qr.png), in the three profiles. The output channel then starts like this:

```text
mixed-code128-qr.png
  Profile full · budget profile default · scanner 0.11.0
  2 codes found:
  1. QR Code: https://qrc-ai.com/76xMa
  2. Code 128: STOCK-4827
  QR quality score: 100 (excellent)
  Engine report:
  {
    "detections": [
```

For each code, the report keeps its format, its exact text and its bytes, how often it was seen and where the engine measured it. A QR quality score of `null` means that the profile did not measure it: it is not a score of zero. An image without a code gives an empty list, which is different from a file the engine cannot read.

## What it reads

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The bundled engine 0.11.0 reads 19 formats. Codes of different formats in one image come back in one report.

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## The same engine in other runtimes

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The Rust, Node.js, browser and Python packages hold the engine. This extension bundles the WebAssembly package [`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm/v/0.11.0), the one made for browsers. The Go and PHP packages hold no decoder: each one starts `qrscan` and hands you its report. Every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## Develop and test

```sh
cd integrations/vscode
npm ci
npm test
npm run package
npm run test:vsix
```

`npm test` builds the extension into `out/stage`. It scans the repository's mixed fixture with the bundled engine in the three profiles, a GIF copy of it and BMP copies in seven layouts, and the repository's JPEG and WebP fixtures. It then loads the bundled `dist/extension.js` with a recorded `vscode` module and runs the command from the menus and the palette, the file dialog, the quick pick, the clipboard, Cancel and the error messages. No editor is started. `npm run package` writes the VSIX and `out/package-receipt.json`, which holds its size, its SHA-256 and its file list. With the same sources, engine and Node.js version, it writes the same bytes. `npm run test:vsix` checks the files and the manifest inside the VSIX, then runs the extension tests again on its unpacked copy.

## Licensing

The VSIX holds two kinds of code. The extension's own code, from `src/` and bundled in `dist/extension.js` and `dist/worker.js`, is MIT. The engine it bundles, `dist/qrcode-barcode-scanner_bg.wasm` and its JavaScript glue, is the published npm package `@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0`, which stays under AGPL-3.0-or-later. Its corresponding source is the [`v0.11.0` tag](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0) of the scanner repository. The manifest therefore declares `MIT AND AGPL-3.0-or-later`, and the packaged `LICENSE.md` holds both texts. The `dist/engine/` folder keeps the engine's license, its Apache-2.0 notices and its build record. Whoever distributes the VSIX also distributes that AGPL engine.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
