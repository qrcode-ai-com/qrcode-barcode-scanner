<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-python-dark.gif?v=05df706be1b2">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-python-light.gif?v=c050b0a71771" alt="QR Code &amp; Barcode Scanner for Python: the Python logo, the quick start in Python, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner for ComfyUI

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20ComfyUI%20%28integrations%2Fcomfyui%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20ComfyUI%20node%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20batch.%20Put%20it%20after%20a%20generation%20or%20an%20image%20edit%20to%20check%20that%20a%20code%20still%20decodes%20to%20the%20text%20you%20meant.%20The%20open-source%20engine%20runs%20inside%20ComfyUI%27s%20own%20Python%2C%20on%20your%20machine%2C%20so%20no%20image%20leaves%20it.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fcomfyui%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fcomfyui%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fcomfyui%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20ComfyUI%20%28integrations%2Fcomfyui%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20ComfyUI%20node%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20batch.%20Put%20it%20after%20a%20generation%20or%20an%20image%20edit%20to%20check%20that%20a%20code%20still%20decodes%20to%20the%20text%20you%20meant.%20The%20open-source%20engine%20runs%20inside%20ComfyUI%27s%20own%20Python%2C%20on%20your%20machine%2C%20so%20no%20image%20leaves%20it.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fcomfyui%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fcomfyui%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fcomfyui%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20ComfyUI%20%28integrations%2Fcomfyui%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20ComfyUI%20node%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20batch.%20Put%20it%20after%20a%20generation%20or%20an%20image%20edit%20to%20check%20that%20a%20code%20still%20decodes%20to%20the%20text%20you%20meant.%20The%20open-source%20engine%20runs%20inside%20ComfyUI%27s%20own%20Python%2C%20on%20your%20machine%2C%20so%20no%20image%20leaves%20it.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fcomfyui%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fcomfyui%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fcomfyui%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20ComfyUI%20%28integrations%2Fcomfyui%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20ComfyUI%20node%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20batch.%20Put%20it%20after%20a%20generation%20or%20an%20image%20edit%20to%20check%20that%20a%20code%20still%20decodes%20to%20the%20text%20you%20meant.%20The%20open-source%20engine%20runs%20inside%20ComfyUI%27s%20own%20Python%2C%20on%20your%20machine%2C%20so%20no%20image%20leaves%20it.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fcomfyui%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fcomfyui%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fcomfyui%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for ComfyUI (integrations/comfyui/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A ComfyUI node that reads every QR code and barcode in an image batch. Put it after a generation or an image edit to check that a code still decodes to the text you meant. The open-source engine runs inside ComfyUI's own Python, on your machine, so no image leaves it. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/comfyui/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/comfyui https://qrcode-ai.com/en-US/barcode-scanner/integrations/comfyui https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A ComfyUI node that reads every QR code and barcode in an image batch. Put it after a generation or an image edit to check that a code still decodes to the text you meant. The open-source engine runs inside ComfyUI's own Python, on your machine, so no image leaves it.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI's scanning pages in the browser. This node follows the same route as the [QR code scanner ComfyUI guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/comfyui) and the [barcode scanner ComfyUI guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/comfyui). If a page is not online yet, this README is the reference.

To make a test image with a known value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the text you encoded and give it to the node's `expected_text` input: `matches` then tells you whether the generated image still holds it.

## Status

The node is built and tested in the engine repository. It is not on the Comfy Registry yet, and
its own repository, `qrcode-ai-com/qrcode-barcode-scanner-comfyui`, is not created yet. Until
both exist, the commands below that name them do not work.

## Install

Once the node is on the registry, ComfyUI Manager finds it as **QR Code & Barcode Scanner**. The
Comfy command line installs it by its id:

```sh
comfy node install qrcode-barcode-scanner-nodes
```

By hand, clone the node's repository into `ComfyUI/custom_nodes` and install its one dependency
with the Python that runs ComfyUI, then restart ComfyUI:

```sh
cd ComfyUI/custom_nodes
git clone https://github.com/qrcode-ai-com/qrcode-barcode-scanner-comfyui.git
python -m pip install -r qrcode-barcode-scanner-comfyui/requirements.txt
```

The portable Windows build has its own Python, `python_embeded\python.exe`; use it for the last
command. The dependency is the engine wheel
[`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/) 0.11.0. PyPI
has prebuilt wheels for macOS, Linux on x86-64 and ARM64, and 64-bit Windows. Anywhere else pip
builds it from source, which needs a Rust toolchain.

## Use

Add **Scan QR Codes and Barcodes** from the `image/analysis` category, or search for "qr code" or
"barcode". Connect any `IMAGE` output to it.

- `profile`: `fast` (the default) suits uploads and gives a reduced quality score. `frame` suits
  camera frames and gives no score. `full` searches deepest and gives the full score; artistic QR
  codes from a generator need it.
- `budget_ms`: a time limit per image. `0`, the default, means no limit, so the result does not
  depend on how busy the machine is.
- `expected_text`, optional: the exact text every image should hold.

It has four outputs:

- `texts`: every decoded text, one per line, in batch order.
- `report_json`: a JSON array with the engine's report for each image, unchanged.
- `matches`: with an expected text, true when every image holds a code with exactly that text.
  Without one, true when every image holds at least one code.
- `count`: the number of codes in the whole batch.

The node also prints one line per image in the graph, such as
`image 1: 2 found: qr_code 'https://qrc-ai.com/76xMa', code128 'STOCK-4827'`.

[`workflows/scan-mixed-fixture.json`](workflows/scan-mixed-fixture.json) is a two-node workflow in
the API format. It loads
[`mixed-code128-qr.png`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/fixtures/symbology/mixed-code128-qr.png),
the engine's sample image, and expects `STOCK-4827`. Copy the sample into `ComfyUI/input` before
you queue it.

## Limits

- Each image of the batch is read as ComfyUI holds it, converted to 8-bit RGBA: values from 0 to 1
  become 0 to 255. The node does not change the tensor it receives.
- An image wider or taller than 10,000 pixels, or above 64 million pixels, stops the node with the
  engine's `QRS-` code and the number of the image in the batch.
- The scan runs on the CPU, in ComfyUI's process. The node fetches nothing and never opens what a
  code points to.

## Develop

The tests run the node class on real tensors, the way ComfyUI calls it:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt -r tests/requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
.venv/bin/python -m pytest
```

They scan the sample in the three profiles, check that the pixels reach the engine unchanged, and
cover batches, an image with no code, `expected_text`, every tensor type ComfyUI uses, a refused
size and the example workflow. They also check the registry rules for `pyproject.toml`. The
workflow `integration-python-hosts` of the engine repository runs them. They have not run inside
a ComfyUI server.

## Its own repository

The Comfy Registry reads `pyproject.toml` at the root of a repository, so the node is served from
a repository of its own, `qrcode-ai-com/qrcode-barcode-scanner-comfyui`. Nothing there is edited by
hand.
[`scripts/stage-comfyui-satellite.py`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/scripts/stage-comfyui-satellite.py)
writes its whole tree from one commit of the engine repository: this folder, the workflows of
[`mirror/`](mirror/), the two test images, the licence and a `SOURCE.json` that names the commit
and the sha256 of every file. The same program checks that a tree is exactly that. Its publish
workflow runs `comfy node publish` with a registry key kept in the repository's `comfy-registry`
environment.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-python-dark.gif?v=60b4945fed7e">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-python-light.gif?v=bb48f1698ce2" alt="How the Python package works, in three steps: install the package, pass an image or a camera frame to the engine inside your process, and read the report" width="100%">
  </picture>
</p>

The node turns each image of the batch into RGBA pixels and passes them to the engine, which runs in ComfyUI's Python process. Each image gives one report.

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

The node returns the texts, the reports as JSON, `matches` and `count`. `report_json` holds one report per image of the batch, in order.

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

The node reads what the engine reads. Codes of different formats in one image come back in one report. The engine's
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

Project-authored node source is MIT; see [LICENSE](LICENSE). The node installs the engine wheel `qrcode-barcode-scanner` 0.11.0 from PyPI and does not ship it. The published engine 0.11.0 keeps the license it shipped with, AGPL-3.0-or-later; read the license packaged with the version you install and the [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md).

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
