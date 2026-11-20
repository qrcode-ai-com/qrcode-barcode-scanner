<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-cli-dark.gif?v=e84805b8f980">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-cli-light.gif?v=1dc243096583" alt="QR Code &amp; Barcode Scanner CLI: qrscan commands in a terminal, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# Snap Store recipe

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Snap%20Store%20recipe%20%28distribution%2Fsnap%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20the%20Snap%20Store%20recipe%20of%20qrscan%200.11.0%2C%20the%20offline%20QR%20code%20and%20barcode%20scanner%20for%20the%20command%20line.%20The%20snap%20repacks%20the%20published%20Linux%20release%20archives%20of%20tag%20v0.11.0.%20It%20checks%20the%20SHA-256%20of%20each%20archive%20and%20of%20its%20qrscan%20executable%20before%20it%20installs%20anything%2C%20and%20it%20compiles%20nothing.%20Nothing%20is%20published%20on%20the%20Snap%20Store%20yet.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fsnap%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20Snap%20Store%20recipe%20%28distribution%2Fsnap%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20the%20Snap%20Store%20recipe%20of%20qrscan%200.11.0%2C%20the%20offline%20QR%20code%20and%20barcode%20scanner%20for%20the%20command%20line.%20The%20snap%20repacks%20the%20published%20Linux%20release%20archives%20of%20tag%20v0.11.0.%20It%20checks%20the%20SHA-256%20of%20each%20archive%20and%20of%20its%20qrscan%20executable%20before%20it%20installs%20anything%2C%20and%20it%20compiles%20nothing.%20Nothing%20is%20published%20on%20the%20Snap%20Store%20yet.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fsnap%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20Snap%20Store%20recipe%20%28distribution%2Fsnap%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20the%20Snap%20Store%20recipe%20of%20qrscan%200.11.0%2C%20the%20offline%20QR%20code%20and%20barcode%20scanner%20for%20the%20command%20line.%20The%20snap%20repacks%20the%20published%20Linux%20release%20archives%20of%20tag%20v0.11.0.%20It%20checks%20the%20SHA-256%20of%20each%20archive%20and%20of%20its%20qrscan%20executable%20before%20it%20installs%20anything%2C%20and%20it%20compiles%20nothing.%20Nothing%20is%20published%20on%20the%20Snap%20Store%20yet.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fsnap%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Snap%20Store%20recipe%20%28distribution%2Fsnap%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20the%20Snap%20Store%20recipe%20of%20qrscan%200.11.0%2C%20the%20offline%20QR%20code%20and%20barcode%20scanner%20for%20the%20command%20line.%20The%20snap%20repacks%20the%20published%20Linux%20release%20archives%20of%20tag%20v0.11.0.%20It%20checks%20the%20SHA-256%20of%20each%20archive%20and%20of%20its%20qrscan%20executable%20before%20it%20installs%20anything%2C%20and%20it%20compiles%20nothing.%20Nothing%20is%20published%20on%20the%20Snap%20Store%20yet.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fsnap%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand Snap Store recipe (distribution/snap/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This folder holds the Snap Store recipe of qrscan 0.11.0, the offline QR code and barcode scanner for the command line. The snap repacks the published Linux release archives of tag v0.11.0. It checks the SHA-256 of each archive and of its qrscan executable before it installs anything, and it compiles nothing. Nothing is published on the Snap Store yet. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/snap/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/cli https://qrcode-ai.com/en-US/barcode-scanner/cli https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This folder holds the Snap Store recipe of qrscan 0.11.0, the offline QR code and barcode scanner for the command line. The snap repacks the published Linux release archives of tag v0.11.0. It checks the SHA-256 of each archive and of its qrscan executable before it installs anything, and it compiles nothing. Nothing is published on the Snap Store yet.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) let you try the engine in a browser first. For the qrscan options and its JSON report, read the [QR code scanner command line guide](https://qrcode-ai.com/en-US/qr-code-scanner/cli) and the [barcode scanner command line guide](https://qrcode-ai.com/en-US/barcode-scanner/cli).

To make a test image with a known payload, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), and keep the payload you encoded to compare it with the scan.

## What the snap holds

The snap is named `qrcode-barcode-scanner`. It uses the core24 base and strict confinement, for amd64 and arm64. [snapcraft.yaml](snapcraft.yaml) downloads the release archive of the target architecture, checks it against the SHA-256 of the [release manifest](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS) and installs:

- `bin/qrscan`, the release executable, unchanged;
- `bin/qrscan-launcher`, the [launcher](launcher/qrscan-launcher) that the `qrscan` app runs;
- the license texts, notices, source reference and build record of the release, in `usr/share/doc/qrcode-barcode-scanner`.

The launcher runs qrscan and never changes its output or its exit status. When qrscan exits with 2 and the image cannot be read from inside the snap, the launcher adds one hint on stderr: which folders the snap reads, and how to connect removable media.

## Install and use, once it is published

```sh
sudo snap install qrcode-barcode-scanner
qrcode-barcode-scanner.qrscan photo.png
```

The snap reads files in your home folder, except hidden files and folders. It reads `/media` and `/mnt` after `sudo snap connect qrcode-barcode-scanner:removable-media`. It has its own `/tmp`, so copy an image from `/tmp` into your home folder first. qrscan prints a JSON report on stdout. It exits with 0 when it found at least one code, 1 when it found none and 2 when the image could not be read. To type `qrscan` instead of the full name, add a local alias with `sudo snap alias qrcode-barcode-scanner.qrscan qrscan`.

## How it is tested

The workflow `.github/workflows/integration-snap.yml` packs the snap on GitHub-hosted Ubuntu 24.04 runners, amd64 and arm64, with `snapcraft pack --destructive-mode`. It installs the result with `snap install --dangerous` and judges it with `scripts/destination-acceptance.py cli`. The check scans the [mixed QR and Code 128 sample](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/fixtures/symbology/mixed-code128-qr.png) with the fast, frame and full profiles and no time budget, and requires both payloads, `https://qrc-ai.com/76xMa` and `STOCK-4827`, in each report. The same job scans an image in `/tmp`, checks the exit status 2 and the hint, removes the snap and checks the receipt. [test-launcher.sh](test-launcher.sh) tests the launcher against a stand-in qrscan, and `scripts/check-packaging-recipes.py` checks the pinned digests against the release manifest.

## Publish it

Publication is the owner's step. It needs a Snapcraft account, which is an Ubuntu One account, for QR Code AI.

1. Run `snapcraft login`, then `snapcraft register qrcode-barcode-scanner`.
2. Download the artifacts `qrscan-snap-amd64` and `qrscan-snap-arm64` of a green `integration-snap` run. Each holds the tested `.snap` and its acceptance receipt.
3. Run `snapcraft upload --release=stable qrcode-barcode-scanner_0.11.0_amd64.snap`, then the same command for the arm64 file.
4. On the store page, check the title, the summary, the license `AGPL-3.0-or-later`, the website `https://qrcode-ai.com/en-US/qr-code-scanner/cli` and the contact `contact@qrcode-ai.com`. They come from snapcraft.yaml.

To build in Canonical's builders instead, run `snapcraft remote-build` from this folder; it needs a Launchpad account. A global `qrscan` alias needs a request in the store-requests category of the Snapcraft forum. Until it is granted, users run `qrcode-barcode-scanner.qrscan`.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-cli-dark.gif?v=5b861170b5d2">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-cli-light.gif?v=a700b1da82fb" alt="How qrscan works, in three steps: install qrscan, pass an image file, and read the JSON report" width="100%">
  </picture>
</p>

The picture shows the three steps of this route: install qrscan, pass it an image file, and read the JSON report. The installation and the checks of this destination are written above.

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

The snap installs qrscan 0.11.0. That program and its release archives are licensed AGPL-3.0-or-later; the snap keeps their license files, the third-party notices and the Apache-2.0 text of the retained reader code. The recipe files in this folder are project source, available under the MIT License described below. They do not change the license of the program they install.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
