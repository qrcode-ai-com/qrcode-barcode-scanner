# QR Code & Barcode Scanner for JupyterLab

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20JupyterLab%20%28integrations%2Fjupyterlab%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20JupyterLab%20extension%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image.%20It%20opens%20a%20scanner%20panel%20from%20the%20launcher%2C%20the%20command%20palette%20or%20the%20file%20browser%2C%20and%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20next%20to%20the%20engine%27s%20full%20report.%20The%20open-source%20engine%20runs%20in%20your%20browser%20tab%20as%20WebAssembly%3A%20the%20image%20is%20read%20there%20and%20is%20not%20uploaded%20anywhere%2C%20and%20no%20kernel%20is%20needed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fjupyterlab%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fjupyterlab%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fjupyterlab%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20JupyterLab%20%28integrations%2Fjupyterlab%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20JupyterLab%20extension%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image.%20It%20opens%20a%20scanner%20panel%20from%20the%20launcher%2C%20the%20command%20palette%20or%20the%20file%20browser%2C%20and%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20next%20to%20the%20engine%27s%20full%20report.%20The%20open-source%20engine%20runs%20in%20your%20browser%20tab%20as%20WebAssembly%3A%20the%20image%20is%20read%20there%20and%20is%20not%20uploaded%20anywhere%2C%20and%20no%20kernel%20is%20needed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fjupyterlab%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fjupyterlab%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fjupyterlab%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20JupyterLab%20%28integrations%2Fjupyterlab%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20JupyterLab%20extension%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image.%20It%20opens%20a%20scanner%20panel%20from%20the%20launcher%2C%20the%20command%20palette%20or%20the%20file%20browser%2C%20and%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20next%20to%20the%20engine%27s%20full%20report.%20The%20open-source%20engine%20runs%20in%20your%20browser%20tab%20as%20WebAssembly%3A%20the%20image%20is%20read%20there%20and%20is%20not%20uploaded%20anywhere%2C%20and%20no%20kernel%20is%20needed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fjupyterlab%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fjupyterlab%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fjupyterlab%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20JupyterLab%20%28integrations%2Fjupyterlab%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20JupyterLab%20extension%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image.%20It%20opens%20a%20scanner%20panel%20from%20the%20launcher%2C%20the%20command%20palette%20or%20the%20file%20browser%2C%20and%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20next%20to%20the%20engine%27s%20full%20report.%20The%20open-source%20engine%20runs%20in%20your%20browser%20tab%20as%20WebAssembly%3A%20the%20image%20is%20read%20there%20and%20is%20not%20uploaded%20anywhere%2C%20and%20no%20kernel%20is%20needed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fjupyterlab%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fjupyterlab%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fjupyterlab%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for JupyterLab (integrations/jupyterlab/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A JupyterLab extension that reads every QR code and barcode in an image. It opens a scanner panel from the launcher, the command palette or the file browser, and lists each code with its format and its exact text, next to the engine's full report. The open-source engine runs in your browser tab as WebAssembly: the image is read there and is not uploaded anywhere, and no kernel is needed. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/jupyterlab/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/jupyterlab https://qrcode-ai.com/en-US/barcode-scanner/integrations/jupyterlab https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A JupyterLab extension that reads every QR code and barcode in an image. It opens a scanner panel from the launcher, the command palette or the file browser, and lists each code with its format and its exact text, next to the engine's full report. The open-source engine runs in your browser tab as WebAssembly: the image is read there and is not uploaded anywhere, and no kernel is needed.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI's scanning pages in the browser. This extension follows the same route as the [QR code scanner JupyterLab guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/jupyterlab) and the [barcode scanner JupyterLab guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/jupyterlab). If a page is not online yet, this README is the reference.

To make a test image with a known value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Put the exported image next to your notebooks, scan it from the file browser and compare the text the panel lists with the text you encoded.

<p align="center">
  <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/jupyterlab/media/scanner-panel.png" alt="The QR Code &amp; Barcode Scanner panel in JupyterLab, beside the file browser: the sample image scanned with the full profile lists a QR code with https://qrc-ai.com/76xMa and a Code 128 barcode with STOCK-4827" width="100%">
</p>

## Status

The extension is built and tested in the engine repository. It is not yet published on PyPI, so
JupyterLab's Extension Manager does not list it yet. Its Python package name will be
`jupyterlab-qrcode-barcode-scanner`.

## Install

It is a prebuilt extension: one Python wheel that holds the built frontend, the way JupyterLab 4
installs extensions with pip and lists them in its Extension Manager. JupyterLab needs no rebuild,
Node.js is not needed to use it, and it adds no server or kernel code.

Until it is on PyPI, build the wheel from this folder. That needs Node.js 22 and Python 3.9 or
later:

```sh
cd integrations/jupyterlab
npm ci
python -m pip install jupyter-builder==1.3.0 build
npm run build:prod
python -m build
python -m pip install dist/jupyterlab_qrcode_barcode_scanner-0.1.0-py3-none-any.whl
```

Install the wheel in the environment that runs JupyterLab 4, then reload the JupyterLab page.
`jupyter labextension list` shows it as `@qrcode-ai-com/jupyterlab-qrcode-barcode-scanner`.

## Use

- **Launcher**: the **QR Code & Barcode Scanner** card, under **Other**.
- **Command palette**: **QR Code & Barcode Scanner**.
- **File browser**: right-click a PNG, JPEG, WebP or GIF file and choose **Scan for QR codes and
  barcodes**. The panel opens and scans that file.
- **Address**: `/lab?qrcode-barcode-scanner` opens JupyterLab with the panel.

In the panel, choose an image from your computer or use a file of the file browser, then pick a
profile. Changing the profile scans the same image again.

- `fast` suits uploads and gives a reduced quality score.
- `frame` is made for camera frames and gives no score.
- `full` searches deepest and gives the full score; artistic QR codes from a generator need it.

Each code is listed with its format, the kind of payload (a URL, Wi-Fi settings, plain text) and
its exact text. Decoded text is shown as text: the panel never opens a decoded link. The
scannability score of the first code sits above the list, and the engine's full JSON report below
it. The panel's **What runs here** section names the browser package, its version, the SHA-256 of
its WebAssembly module and the engine version that loaded, so you can check what ran.

## Privacy

The scan runs in the browser tab that shows JupyterLab. An image chosen from your computer never
leaves it. A file of the file browser is read through the Jupyter server's contents API, which
already serves that file to the tab; nothing else is requested. The extension sends no telemetry
and makes no other network request.

## Limits

- JupyterLab 4 only. It was tested on JupyterLab 4.6.6. Jupyter Notebook 7 loads JupyterLab 4
  extensions too, but this one has not been tried there.
- The scan runs on the page's main thread without a time budget. A `full` scan of a large image can
  keep the tab busy for a few seconds.
- An image wider or taller than 10,000 pixels, or above 64 million pixels, is refused with the
  engine's `QRS-` code, and the panel says so.
- A content security policy that forbids WebAssembly stops the engine from loading; the panel then
  shows a loading error and scans nothing.
- The wheel is about 1 MB, most of it the engine's WebAssembly module.

## Develop

```sh
cd integrations/jupyterlab
npm ci
npm test
```

The unit tests load the same WebAssembly module under Node, scan the repository's sample with the
three profiles and check the exact codes, the sentence and the score line the panel shows, and
how refused inputs and cut scans are reported. The workflow `integration-jupyterlab` of the engine
repository then builds the wheel, installs it with JupyterLab 4.6.6 in a clean environment, opens
`/lab?qrcode-barcode-scanner` in Chrome, scans the sample through the panel's own file input with
each profile and checks every code and link, then uninstalls the wheel and checks that JupyterLab no
longer has the extension. [LISTING.md](LISTING.md) holds the publication kit.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-browser-dark.gif?v=32206e525b2c">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-browser-light.gif?v=248e5382e6cc" alt="How the browser package works, in three steps: install and initialize, pass an image or a camera frame to the engine in the page, and read the report" width="100%">
  </picture>
</p>

The extension bundles the published browser package and its WebAssembly module. The panel reads the
image's bytes in the tab, hands them to the engine with the chosen profile and shows the report it
returns. Each scan gives one report.

## What it returns

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of the sample image, which holds a QR code and a Code 128 barcode.
Both come back in one report, each with its format, its exact text and the place where the engine
measured it: `https://qrc-ai.com/76xMa` and `STOCK-4827`.

The picture is a recorded scan of the sample image, which holds a QR code and a Code 128 barcode.
Both come back in one report, each with its format, its exact text and the place where the engine
measured it: `https://qrc-ai.com/76xMa` and `STOCK-4827`.

The report itself is described field by field in the
[report reference](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/docs/api/report.mdx).
An empty list of detections means the image holds no code the engine could read. A refused file
is an error with a `QRS-` code instead, listed in the
[error codes](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/docs/api/errors.mdx).

## What it reads

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>

| Family | Formats |
|---|---|
| QR | QR Code, Micro QR, rectangular Micro QR (rMQR) |
| Matrix and stacked | Data Matrix, Aztec, PDF417, MaxiCode |
| Retail | EAN-13, EAN-8, UPC-A, UPC-E |
| Other linear | Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen |

The extension reads what the engine reads. Codes of different formats in one image come back in one report. The engine's
[supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats)
section states the known limits.

## The same engine in other runtimes

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>

| Runtime | Package | How it scans |
|---|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-dark.png?v=31b5deebc32e"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-light.png?v=c5207721973f" alt="" width="24" height="24" align="absmiddle"></picture> Rust | [`qrcode-barcode-scanner`](https://crates.io/crates/qrcode-barcode-scanner) on crates.io | In process |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-nodejs-dark.png?v=cf2159524fc6"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-nodejs-light.png?v=6dd098480218" alt="" width="24" height="24" align="absmiddle"></picture> Node.js | [`@qrcode-ai-com/qrcode-barcode-scanner`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner) on npm | In process, native |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-browser-dark.png?v=bbe2f3560a6d"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-browser-light.png?v=591e304cf9e9" alt="" width="24" height="24" align="absmiddle"></picture> Browser | [`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm) on npm | In the page, WebAssembly |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-python-dark.png?v=7469c3e0b4fb"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-python-light.png?v=308121255ab7" alt="" width="24" height="24" align="absmiddle"></picture> Python | [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/) on PyPI | In process |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-go-dark.png?v=b6dbac901176"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-go-light.png?v=1983a9eb7344" alt="" width="24" height="24" align="absmiddle"></picture> Go | [`qrcode-barcode-scanner-go`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-go) | Through the installed `qrscan` |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-php-dark.png?v=3800932934c8"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-php-light.png?v=7bdd6884b3a4" alt="" width="24" height="24" align="absmiddle"></picture> PHP | [`qrcode-barcode-scanner-php`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-php) | Through the installed `qrscan` |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-terminal-dark.png?v=1e987f0ab278"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-terminal-light.png?v=2262d66bee6b" alt="" width="24" height="24" align="absmiddle"></picture> Command line | [`qrscan`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line) | One command, one JSON report |

The Rust, Node.js, browser and Python packages hold the engine. The Go and PHP packages hold no decoder:
each one starts `qrscan` and hands you its report.

<sub>Language and platform names and logos belong to their owners. They identify a runtime or a destination and imply no endorsement.</sub>

## Licence

The wheel holds two kinds of code. The extension's own code, from `src/` and `style/`, is MIT; see [LICENSE](LICENSE). The engine it bundles, the labextension's WebAssembly module and its JavaScript glue, is the published npm package `@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0`, which stays under AGPL-3.0-or-later. Its corresponding source is the [`v0.11.0` tag](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0) of the scanner repository. The package therefore declares `MIT AND AGPL-3.0-or-later`, and [LICENSE-NOTES.md](LICENSE-NOTES.md) says which file is which. The wheel carries the engine's license, its Apache-2.0 notices and its build record. Whoever distributes the wheel also distributes that AGPL engine.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
