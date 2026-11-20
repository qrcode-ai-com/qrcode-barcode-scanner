<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-mcp-dark.gif?v=b585c4a58dad">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-mcp-light.gif?v=6bc9fb70ba28" alt="QR Code &amp; Barcode Scanner MCP: the MCP mark, the client configuration that starts the server, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner MCP server for Glama

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%20for%20Glama%20%28distribution%2Fglama%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20what%20Glama%20needs%20to%20list%20and%20inspect%20the%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%2C%20version%200.3.1.%20The%20Dockerfile%20installs%20the%20published%20npm%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%20from%20a%20lockfile%20that%20pins%20every%20package%20by%20integrity%2C%20on%20a%20Node.js%2022%20base%20image%20pinned%20by%20digest.%20It%20builds%20nothing%20from%20source.%20The%20server%20speaks%20MCP%20over%20stdio.%20Its%20tool%20scan_image%20reads%20the%20QR%20codes%20and%20barcodes%20in%20base64%20image%20bytes%2C%20offline%2C%20and%20returns%20the%20scanner%27s%20JSON%20report.%20Gla%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fglama%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%20for%20Glama%20%28distribution%2Fglama%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20what%20Glama%20needs%20to%20list%20and%20inspect%20the%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%2C%20version%200.3.1.%20The%20Dockerfile%20installs%20the%20published%20npm%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%20from%20a%20lockfile%20that%20pins%20every%20package%20by%20integrity%2C%20on%20a%20Node.js%2022%20base%20image%20pinned%20by%20digest.%20It%20builds%20nothing%20from%20source.%20The%20server%20speaks%20MCP%20over%20stdio.%20Its%20tool%20scan_image%20reads%20the%20QR%20codes%20and%20barcodes%20in%20base64%20image%20bytes%2C%20offline%2C%20and%20returns%20the%20scanner%27s%20JSON%20report.%20Gla%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fglama%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%20for%20Glama%20%28distribution%2Fglama%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20what%20Glama%20needs%20to%20list%20and%20inspect%20the%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%2C%20version%200.3.1.%20The%20Dockerfile%20installs%20the%20published%20npm%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%20from%20a%20lockfile%20that%20pins%20every%20package%20by%20integrity%2C%20on%20a%20Node.js%2022%20base%20image%20pinned%20by%20digest.%20It%20builds%20nothing%20from%20source.%20The%20server%20speaks%20MCP%20over%20stdio.%20Its%20tool%20scan_image%20reads%20the%20QR%20codes%20and%20barcodes%20in%20base64%20image%20bytes%2C%20offline%2C%20and%20returns%20the%20scanner%27s%20JSON%20report.%20Gla%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fglama%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%20for%20Glama%20%28distribution%2Fglama%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20what%20Glama%20needs%20to%20list%20and%20inspect%20the%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%2C%20version%200.3.1.%20The%20Dockerfile%20installs%20the%20published%20npm%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%20from%20a%20lockfile%20that%20pins%20every%20package%20by%20integrity%2C%20on%20a%20Node.js%2022%20base%20image%20pinned%20by%20digest.%20It%20builds%20nothing%20from%20source.%20The%20server%20speaks%20MCP%20over%20stdio.%20Its%20tool%20scan_image%20reads%20the%20QR%20codes%20and%20barcodes%20in%20base64%20image%20bytes%2C%20offline%2C%20and%20returns%20the%20scanner%27s%20JSON%20report.%20Gla%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fglama%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner MCP server for Glama (distribution/glama/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This folder holds what Glama needs to list and inspect the QR Code & Barcode Scanner MCP server, version 0.3.1. The Dockerfile installs the published npm package @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1 from a lockfile that pins every package by integrity, on a Node.js 22 base image pinned by digest. It builds nothing from source. The server speaks MCP over stdio. Its tool scan_image reads the QR codes and barcodes in base64 image bytes, offline, and returns the scanner's JSON report. Gla Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/glama/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/mcp https://qrcode-ai.com/en-US/barcode-scanner/mcp https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This folder holds what Glama needs to list and inspect the QR Code & Barcode Scanner MCP server, version 0.3.1. The Dockerfile installs the published npm package `@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1` from a lockfile that pins every package by integrity, on a Node.js 22 base image pinned by digest. It builds nothing from source. The server speaks MCP over stdio. Its tool `scan_image` reads the QR codes and barcodes in base64 image bytes, offline, and returns the scanner's JSON report. Glama lists the server at [glama.ai](https://glama.ai/mcp/servers/qrcode-ai-com/qrcode-barcode-scanner-mcp) since 20 November 2026.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) let you try the engine in a browser first. To connect the server to a client, read the [QR code scanner MCP guide](https://qrcode-ai.com/en-US/qr-code-scanner/mcp) and the [barcode scanner MCP guide](https://qrcode-ai.com/en-US/barcode-scanner/mcp).

To make a test image with a known payload, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), and keep the payload you encoded to compare it with the scan.

## Files

- `glama.json`: the Glama schema and the maintainer, the GitHub account `ThibautMelen`.
- `Dockerfile`: the container that Glama builds to start the server and read its tools.
- `package.json` and `package-lock.json`: the one dependency, the MCP server 0.3.1, and the exact packages it installs.
- `SOURCE.json`, in the staged repository: the engine commit that the files come from and the SHA-256 of each file.

## Run it

```sh
docker build -t qrscan-mcp:glama .
docker run -i --rm --network none --read-only --cap-drop ALL qrscan-mcp:glama
```

The container needs no network and writes nothing. It has no allowed directory, so the file tool `scan_file` of the server stays off and only `scan_image` is offered. Limits are set with the `QRSCAN_MCP_*` environment variables of the [MCP server](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/mcp/README.md).

## How it is tested

The workflow `.github/workflows/integration-glama.yml` of the [engine repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust) stages this folder, builds the container on amd64 and arm64 runners, and starts it the way a client would, with no network and a read-only file system. The MCP driver of `distribution/acceptance` lists the tools, calls `scan_image` on the [mixed QR and Code 128 sample](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/fixtures/symbology/mixed-code128-qr.png) with the fast, frame and full profiles, and requires both codes in each report. The job then removes the image and checks the receipt. When the folder was written, the same lockfile installed MCP 0.3.1 outside a container, and the driver read both payloads in the three profiles.

## Publish it

The files are staged into their own repository, [`qrcode-ai-com/qrcode-barcode-scanner-mcp`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-mcp), because Glama reads `glama.json` and the Dockerfile at the root of a repository. That repository has been public since 20 November 2026. The same day, Glama built its Dockerfile, inspected the server and listed it on [its page](https://glama.ai/mcp/servers/qrcode-ai-com/qrcode-barcode-scanner-mcp), with the tool `scan_image`. To publish a new stage:

1. In the engine repository, run `python3 scripts/stage-glama-package.py stage --out /tmp/qrscan-mcp-glama`, then `python3 scripts/stage-glama-package.py verify /tmp/qrscan-mcp-glama`.
2. Copy the staged folder over a clean checkout of `qrcode-ai-com/qrcode-barcode-scanner-mcp` and push it to its `main` branch.
3. On glama.ai, signed in with the GitHub account `ThibautMelen`, open the server's admin page and run Build & Release. Glama builds the Dockerfile again, reads the tools and publishes a new release of its listing. Glama numbers these releases itself: its first, 0.1.0, carries the MCP server 0.3.1.

The server was added from this repository and claimed once, on 20 November 2026; a new stage needs neither step again.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-agents-dark.gif?v=40259e2ce31c">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-agents-light.gif?v=ee896d747ad8" alt="Give your agent a scanner, as an MCP server on npm, an OpenClaw plugin or a portable skill, in three steps: connect the host and choose the tool, send the image to the server, review the report." width="100%">
  </picture>
</p>

The picture shows the three steps of the agent route: connect the client and choose the tool, send the image to the server, and review the report.

## What it returns

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both come back in the same report, each with its format, its exact text and the place where the engine measured it.

## What it reads

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>

The same engine reads every destination’s images, so codes of different formats in one image come back in one report.

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

The engine’s [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## The same engine in other runtimes

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>

The Rust, Node.js, browser and Python packages hold the engine. The Go and PHP packages hold no decoder: each one starts `qrscan` and hands you its report. Every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## License

The container runs the MCP server 0.3.1 and the scanner engine 0.11.0. Both published packages are licensed AGPL-3.0-or-later, and npm installs them with their license files and notices. The files of this folder are project source, available under the MIT License described below. They do not change the license of the packages they install.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
