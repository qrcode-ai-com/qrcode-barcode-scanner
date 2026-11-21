<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-dify-dark.gif?v=3ce6c439ffd0">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-dify-light.gif?v=4e067a92af1d" alt="QR Code &amp; Barcode Scanner for Dify: the Dify logo, the scan tool and its parameters, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner for Dify

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Dify%20%28integrations%2Fdify%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Dify%20tool%20plugin%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20file.%20Give%20it%20the%20image%20a%20user%20uploads%2C%20and%20the%20next%20step%20gets%20the%20decoded%20texts%20and%20the%20engine%27s%20report.%20The%20open-source%20engine%20runs%20inside%20your%20Dify%20plugin%20runtime%3A%20the%20image%20goes%20to%20no%20other%20service%2C%20and%20no%20model%20or%20key%20is%20needed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fdify%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fdify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fdify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Dify%20%28integrations%2Fdify%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Dify%20tool%20plugin%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20file.%20Give%20it%20the%20image%20a%20user%20uploads%2C%20and%20the%20next%20step%20gets%20the%20decoded%20texts%20and%20the%20engine%27s%20report.%20The%20open-source%20engine%20runs%20inside%20your%20Dify%20plugin%20runtime%3A%20the%20image%20goes%20to%20no%20other%20service%2C%20and%20no%20model%20or%20key%20is%20needed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fdify%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fdify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fdify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Dify%20%28integrations%2Fdify%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Dify%20tool%20plugin%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20file.%20Give%20it%20the%20image%20a%20user%20uploads%2C%20and%20the%20next%20step%20gets%20the%20decoded%20texts%20and%20the%20engine%27s%20report.%20The%20open-source%20engine%20runs%20inside%20your%20Dify%20plugin%20runtime%3A%20the%20image%20goes%20to%20no%20other%20service%2C%20and%20no%20model%20or%20key%20is%20needed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fdify%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fdify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fdify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Dify%20%28integrations%2Fdify%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Dify%20tool%20plugin%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20file.%20Give%20it%20the%20image%20a%20user%20uploads%2C%20and%20the%20next%20step%20gets%20the%20decoded%20texts%20and%20the%20engine%27s%20report.%20The%20open-source%20engine%20runs%20inside%20your%20Dify%20plugin%20runtime%3A%20the%20image%20goes%20to%20no%20other%20service%2C%20and%20no%20model%20or%20key%20is%20needed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fdify%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fdify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fdify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for Dify (integrations/dify/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A Dify tool plugin that reads every QR code and barcode in an image file. Give it the image a user uploads, and the next step gets the decoded texts and the engine's report. The open-source engine runs inside your Dify plugin runtime: the image goes to no other service, and no model or key is needed. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/dify/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/dify https://qrcode-ai.com/en-US/barcode-scanner/integrations/dify https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A Dify tool plugin that reads every QR code and barcode in an image file. Give it the image a user uploads, and the next step gets the decoded texts and the engine's report. The open-source engine runs inside your Dify plugin runtime: the image goes to no other service, and no model or key is needed.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI's scanning pages in the browser. This plugin follows the same route as the [QR code scanner Dify guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/dify) and the [barcode scanner Dify guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/dify). If a page is not online yet, this README is the reference.

To make a test image with a known value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the text you encoded with the image, then compare it with the `texts` the tool returns, character for character.

## Status

The plugin is built and tested in the engine repository. Its own repository,
[`qrcode-ai-com/qrcode-barcode-scanner-dify`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-dify),
has been public since 20 November 2026, and its tests pass there. Its package 0.1.0, built with the
`dify-plugin` command line 0.6.15, was submitted to the Dify Marketplace the same day as
[pull request 3862](https://github.com/langgenius/dify-plugins/pull/3862) of
`langgenius/dify-plugins`. Its checks wait for a maintainer to approve the run of a first-time
contributor, and it is not on the Marketplace before a maintainer merges it.

## Install

Once the plugin is listed, install **QR Code & Barcode Scanner** from the Marketplace: in Dify,
open **Plugins**, then **Marketplace**, and search for it.

A package file installs the same plugin without the Marketplace. The Dify plugin command line,
`dify`, builds it from this folder:

```sh
dify plugin package ./qrcode-barcode-scanner-dify
```

The command writes a `.difypkg` file. In Dify, choose **Plugins**, **Install plugin**, **Local
package file** and select it. Dify then installs the plugin's two dependencies,
[`dify_plugin`](https://pypi.org/project/dify_plugin/0.11.1/) 0.11.1 and the engine wheel
[`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/) 0.11.0. The
`dify` command line is a program of the
[Dify plugin daemon](https://github.com/langgenius/dify-plugin-daemon/releases), not an npm or
PyPI package. In the engine repository, the `integration-dify-template` job builds the package with
`dify-plugin` 0.6.15 and installs it in Dify 1.20.0 to run the template; that package is a test
artifact, not a release.

A self-hosted Dify accepts only packages signed by the Marketplace by default. To install a local
package there, its administrator adds `FORCE_VERIFYING_SIGNATURE=false` to `docker/.env` and
restarts Dify.

## Use

The plugin has one tool, **Scan QR codes and barcodes** (`scan_image`):

- `image`, required: one file, PNG, JPEG, WebP or GIF. In an agent, the model can fill it from the
  user's upload.
- `profile`: `fast` (the default) suits uploads and gives a reduced quality score. `frame` gives
  no score. `full` searches deepest and gives the full score; artistic QR codes from a generator
  need it.
- `budget_ms`: a time limit in milliseconds, from 0 to 60,000. `0`, the default, means no limit.

The tool returns a one-line summary such as
`Found 2 codes. qr_code: https://qrc-ai.com/76xMa; code128: STOCK-4827`, the engine's JSON report,
and three variables: `texts` (the decoded texts), `count` and `complete`. `complete` is false when
the time budget cut the scan. A file the engine refuses makes the tool fail with the engine's
`QRS-` code, so a workflow can send it to its failure branch.

To try the plugin against a Dify instance before packaging it, write a `.env` file in this folder
with `INSTALL_METHOD=remote`, `REMOTE_INSTALL_URL` set to the debugging address and
`REMOTE_INSTALL_KEY` set to the key that Dify shows under **Plugins**, then run `python -m main`.
Never commit that file: the key opens your Dify workspace to the plugin.

## Limits

- One file per call, up to 16 MiB, 4,096 pixels per side and 16 million pixels. A larger file is
  refused before it is scanned.
- The plugin declares 512 MiB of memory and runs on Python 3.12, on amd64 and arm64.
- It reads the file from Dify's file service and sends it nowhere else. It stores nothing.
  [`PRIVACY.md`](PRIVACY.md) is its privacy policy.
- It never opens what a code points to. Decoded text is data, not instructions.

## Workflow template

[`template/qr-and-barcode-reader.yml`](template/qr-and-barcode-reader.yml) is a draft of a
Marketplace template, **Uploaded Image QR and Barcode Reader**: a workflow app with no model that
sends found codes, an image with no code and an unreadable file down three branches.
[`template/TEMPLATE.md`](template/TEMPLATE.md) holds its listing text and the steps that remain.
The engine repository's `integration-dify-template` job imports it into Dify 1.20.0 and runs it on
the mixed fixture, a blank image and a corrupt file. It waits for the plugin to be on the
Marketplace.

## Develop

The tests load the plugin with the Dify SDK, as the plugin runtime does at start, and call the
tool's `invoke` with files served over HTTP:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt -r tests/requirements.txt
.venv/bin/python -m pytest
```

They scan the sample in the three profiles and cover the defaults, an image with no code, a file
that is not an image, every size limit, bad options and a cut budget. They check the manifest
against the plugin daemon's rules and the template against the tool it uses. The workflow
`integration-python-hosts` of the engine repository runs them. They do not start Dify; the
`integration-dify-template` job does, and runs the template there.

## Its own repository

A Dify plugin lives at the root of its repository, so the plugin is served from a repository of its
own, `qrcode-ai-com/qrcode-barcode-scanner-dify`. Nothing there is edited by hand.
[`scripts/stage-dify-satellite.py`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/scripts/stage-dify-satellite.py)
writes its whole tree from one commit of the engine repository: this folder, the workflow of
[`mirror/`](mirror/), the two test images, the licence and a `SOURCE.json` that names the commit
and the sha256 of every file. The same program checks that a tree is exactly that.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-python-dark.gif?v=60b4945fed7e">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-python-light.gif?v=bb48f1698ce2" alt="How the Python package works, in three steps: install the package, pass an image or a camera frame to the engine inside your process, and read the report" width="100%">
  </picture>
</p>

Dify gives the tool the uploaded file. The tool downloads it from Dify's file service and passes its bytes to the engine, which runs in the plugin's Python process and returns one report.

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

The tool returns the summary text, the report as JSON and the `texts`, `count` and `complete` variables. The JSON message is the engine's report, unchanged.

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

The tool reads what the engine reads, from PNG, JPEG, WebP and GIF files. Codes of different formats in one image come back in one report. The engine's
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

Project-authored plugin source is MIT; see [LICENSE](LICENSE). The plugin installs the engine wheel `qrcode-barcode-scanner` 0.11.0 from PyPI and does not ship it. The published engine 0.11.0 keeps the license it shipped with, AGPL-3.0-or-later; read the license packaged with the version you install and the [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md).

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
