<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-archives-dark.gif?v=bf8517ad6017">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-archives-light.gif?v=2d1ba5193f64" alt="Prebuilt qrscan for Linux, macOS and Windows: the GitHub mark, the commands that download, check and run an archive, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner · GitHub Action

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20GitHub%20Action%20%28integrations%2Fgithub-action%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20GitHub%20Action%20reads%20the%20QR%20codes%20and%20barcodes%20in%20your%20repository%27s%20images%20during%20a%20workflow.%20It%20downloads%20the%20published%20qrscan%20for%20the%20runner%2C%20checks%20it%20against%20the%20release%27s%20SHA256SUMS%20and%20the%20hashes%20the%20action%20pins%2C%20and%20scans%20the%20files%20you%20name.%20The%20step%20can%20fail%20when%20a%20payload%20you%20expect%20is%20not%20in%20any%20image%2C%20so%20a%20broken%20code%20on%20a%20label%2C%20a%20poster%20or%20a%20package%20page%20stops%20the%20build.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fgithub-action%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fgithub-actions%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fgithub-actions%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20GitHub%20Action%20%28integrations%2Fgithub-action%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20GitHub%20Action%20reads%20the%20QR%20codes%20and%20barcodes%20in%20your%20repository%27s%20images%20during%20a%20workflow.%20It%20downloads%20the%20published%20qrscan%20for%20the%20runner%2C%20checks%20it%20against%20the%20release%27s%20SHA256SUMS%20and%20the%20hashes%20the%20action%20pins%2C%20and%20scans%20the%20files%20you%20name.%20The%20step%20can%20fail%20when%20a%20payload%20you%20expect%20is%20not%20in%20any%20image%2C%20so%20a%20broken%20code%20on%20a%20label%2C%20a%20poster%20or%20a%20package%20page%20stops%20the%20build.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fgithub-action%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fgithub-actions%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fgithub-actions%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20GitHub%20Action%20%28integrations%2Fgithub-action%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20GitHub%20Action%20reads%20the%20QR%20codes%20and%20barcodes%20in%20your%20repository%27s%20images%20during%20a%20workflow.%20It%20downloads%20the%20published%20qrscan%20for%20the%20runner%2C%20checks%20it%20against%20the%20release%27s%20SHA256SUMS%20and%20the%20hashes%20the%20action%20pins%2C%20and%20scans%20the%20files%20you%20name.%20The%20step%20can%20fail%20when%20a%20payload%20you%20expect%20is%20not%20in%20any%20image%2C%20so%20a%20broken%20code%20on%20a%20label%2C%20a%20poster%20or%20a%20package%20page%20stops%20the%20build.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fgithub-action%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fgithub-actions%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fgithub-actions%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20GitHub%20Action%20%28integrations%2Fgithub-action%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20GitHub%20Action%20reads%20the%20QR%20codes%20and%20barcodes%20in%20your%20repository%27s%20images%20during%20a%20workflow.%20It%20downloads%20the%20published%20qrscan%20for%20the%20runner%2C%20checks%20it%20against%20the%20release%27s%20SHA256SUMS%20and%20the%20hashes%20the%20action%20pins%2C%20and%20scans%20the%20files%20you%20name.%20The%20step%20can%20fail%20when%20a%20payload%20you%20expect%20is%20not%20in%20any%20image%2C%20so%20a%20broken%20code%20on%20a%20label%2C%20a%20poster%20or%20a%20package%20page%20stops%20the%20build.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fgithub-action%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fgithub-actions%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fgithub-actions%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · GitHub Action (integrations/github-action/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This GitHub Action reads the QR codes and barcodes in your repository's images during a workflow. It downloads the published qrscan for the runner, checks it against the release's SHA256SUMS and the hashes the action pins, and scans the files you name. The step can fail when a payload you expect is not in any image, so a broken code on a label, a poster or a package page stops the build. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/github-action/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/github-actions https://qrcode-ai.com/en-US/barcode-scanner/integrations/github-actions https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This GitHub Action reads the QR codes and barcodes in your repository's images during a workflow. It downloads the published `qrscan` for the runner, checks it against the release's SHA256SUMS and the hashes the action pins, and scans the files you name. The step can fail when a payload you expect is not in any image, so a broken code on a label, a poster or a package page stops the build.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) of QR Code AI read the same codes in a browser, for one image at a time. The [QR code scanner guide for GitHub Actions](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/github-actions) and the [barcode scanner guide for GitHub Actions](https://qrcode-ai.com/en-US/barcode-scanner/integrations/github-actions) show this action in a workflow, step by step.

To make a test image, encode a known text with the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), commit the picture, and list the text as an expected payload. The action then proves on every push that the image still says what you meant.

The action is not listed on GitHub Marketplace yet. Until it is, a workflow of the engine repository runs it from its folder, `./integrations/github-action`.

## How it works

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-cli-dark.gif?v=5b861170b5d2">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-cli-light.gif?v=a700b1da82fb" alt="How qrscan works, in three steps: install qrscan, pass an image file, and read the JSON report" width="100%">
  </picture>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The action follows the three steps in the picture:

1. It installs `qrscan`. It downloads the release archive for the runner over HTTPS, checks the SHA256SUMS file against the hash the action pins, the archive against its line in that file, and the executable against the pinned hash. A file that differs stops the step before anything runs.
2. It passes each image to `qrscan`, one at a time, with the profile and time budget you chose.
3. It reads each JSON report and writes the result: a step output, a full report file and a job summary.

## Use

```yaml
jobs:
  codes:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - name: Check the codes on the labels
        id: codes
        uses: qrcode-ai-com/qrcode-barcode-scanner-action@v1
        with:
          files: |
            labels/**/*.png
            !labels/drafts/**
          expected: |
            https://example.com/menu
            4006381333931
      - run: echo "Result ${{ steps.codes.outputs.result }}"
```

Pin the action to a full commit SHA rather than a tag, as GitHub advises for third-party actions. In the engine repository, `uses: ./integrations/github-action` runs it from its folder.

It runs on GitHub-hosted Linux (x64 and arm64, glibc 2.28 or later), macOS (Apple silicon and Intel) and Windows x64 runners. It needs no token and no secret: the download is anonymous, and the action asks for no permission.

### Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `files` | required | Glob patterns of the images, one per line, relative to the workspace. `**` crosses folders, `*` and `?` stay inside one, and a line that starts with `!` leaves files out. |
| `expected` | empty | Payloads that must be decoded, one per line. Each must be the exact text of a code in at least one file. |
| `profile` | `full` | `fast`, `frame` or `full`. |
| `budget-ms` | `0` | The time budget of one scan in milliseconds. `0` means no budget, the reproducible choice for CI. |
| `fail-on` | `missing` | `missing` fails when an expected payload is not found, `no-code` also fails when a file holds no code, `never` only reports. |
| `max-files` | `100` | The most files one run may scan. |
| `version` | `0.11.0` | The `qrscan` release to install. |
| `sums-sha256` | empty | For a version the action does not pin, the sha256 of that release's SHA256SUMS file. |

A fault, an image `qrscan` cannot read and a pattern that matches no file always fail the step, whatever `fail-on` says.

### Outputs

| Output | Meaning |
| --- | --- |
| `result` | `pass`, `missing`, `no-code`, `unreadable`, `no-files` or `fault`. |
| `report` | The compact JSON report: each file, its status and its decoded codes, then each expected payload and the files it was found in. |
| `report-path` | The path of the full JSON report, with each file's complete `qrscan` report. |
| `qrscan-path` | The path of the installed `qrscan`, for later steps. |

Decoded text comes from an image anyone can make. The action writes it to the log as JSON strings, with workflow commands turned off around them, and shows it in the job summary as escaped text. It never opens a link it reads.

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

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both come back in the same report, each with its format, its exact text and the place where the engine measured it. For that image, scanned from this repository on an Apple silicon Mac with the expected payloads `https://qrc-ai.com/76xMa` and `STOCK-4827`, the `report` output is:

```json
{
  "schema": "qrcode-barcode-scanner-action/1",
  "qrscan": { "version": "0.11.0", "target": "aarch64-apple-darwin" },
  "profile": "full",
  "budget_ms": 0,
  "fail_on": "missing",
  "result": "pass",
  "files": [
    {
      "path": "fixtures/symbology/mixed-code128-qr.png",
      "status": "decoded",
      "exit": 0,
      "budget_exhausted": false,
      "error": null,
      "detections": [
        { "symbology": "qr_code", "text": "https://qrc-ai.com/76xMa", "charset": "utf8" },
        { "symbology": "code128", "text": "STOCK-4827", "charset": "utf8" }
      ]
    }
  ],
  "expected": [
    { "text": "https://qrc-ai.com/76xMa", "found_in": ["fixtures/symbology/mixed-code128-qr.png"] },
    { "text": "STOCK-4827", "found_in": ["fixtures/symbology/mixed-code128-qr.png"] }
  ],
  "missing": []
}
```

The file at `report-path` holds the same fields, with each file's complete `qrscan` report and the raw bytes of each code, in base64.

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

Codes of different formats in one image come back in one report.

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

`qrscan` reads PNG, JPEG, WebP and GIF files. The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

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

The action runs the `qrscan` command line. The Rust, Node.js, browser and Python packages hold the same engine, for a scan inside your own program. Every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## Tests

From the root of the engine repository:

```sh
cd integrations/github-action
npm test
QRSCAN_ACTION_LIVE=1 npm test
```

`npm test` checks the archive reader, the installer and its refusals (a wrong SUMS file, archive or executable, an unsafe archive member, a download from another host), the file patterns, the verdicts and the log and summary escaping. With `QRSCAN_ACTION_LIVE=1`, it also downloads and checks the pinned `qrscan`, and scans the mixed fixture in the fast, frame and full profiles. The workflow `integration-github-action.yml` runs the action from its local path on five kinds of hosted runner, in the three profiles, with two cases that must fail: a payload that is not in the image, and a file that is not an image.

## Its own repository

GitHub Marketplace lists an action from the `action.yml` at the root of a public repository. This folder is therefore staged as the repository `qrcode-ai-com/qrcode-barcode-scanner-action`, whose content is never edited by hand. From the root of the engine repository:

```sh
python3 scripts/stage-action-satellite.py stage --out /absolute/empty/folder
python3 scripts/stage-action-satellite.py verify /absolute/empty/folder
```

The stage reads one commit, checks that the hashes pinned in `src/releases.mjs` equal the release manifest of their version, and writes `SOURCE.json` with the sha256 of every file. The workflow in [mirror/](mirror/test.yml) becomes the repository's own test.

## Licenses of what you install

The action source is MIT, in [LICENSE](LICENSE). It downloads `qrscan` 0.11.0, whose published archives keep the license they shipped with, AGPL-3.0-or-later, in the `LICENSE` file inside each archive. The action runs `qrscan` as a separate program and does not change that license.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
