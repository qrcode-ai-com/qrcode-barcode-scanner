<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-cli-dark.gif?v=e84805b8f980">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-cli-light.gif?v=1dc243096583" alt="QR Code &amp; Barcode Scanner CLI: qrscan commands in a terminal, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# Nixpkgs derivation

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Nixpkgs%20derivation%20%28distribution%2Fnix%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20a%20Nixpkgs%20derivation%20for%20qrscan%200.11.0%2C%20for%20the%20path%20pkgs%2Fby-name%2Fqr%2Fqrcode-barcode-scanner%2Fpackage.nix.%20It%20is%20not%20submitted.%20This%20derivation%20was%20drafted%20with%20an%20AI%20assistant%2C%20and%20the%20Nixpkgs%20policy%20for%20such%20work%20applies%3A%20the%20owner%20reviews%20it%2C%20builds%20it%20and%20submits%20it%20himself%2C%20and%20writes%20the%20pull%20request%20and%20the%20commit%20message%20in%20his%20own%20words.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fnix%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20Nixpkgs%20derivation%20%28distribution%2Fnix%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20a%20Nixpkgs%20derivation%20for%20qrscan%200.11.0%2C%20for%20the%20path%20pkgs%2Fby-name%2Fqr%2Fqrcode-barcode-scanner%2Fpackage.nix.%20It%20is%20not%20submitted.%20This%20derivation%20was%20drafted%20with%20an%20AI%20assistant%2C%20and%20the%20Nixpkgs%20policy%20for%20such%20work%20applies%3A%20the%20owner%20reviews%20it%2C%20builds%20it%20and%20submits%20it%20himself%2C%20and%20writes%20the%20pull%20request%20and%20the%20commit%20message%20in%20his%20own%20words.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fnix%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20Nixpkgs%20derivation%20%28distribution%2Fnix%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20a%20Nixpkgs%20derivation%20for%20qrscan%200.11.0%2C%20for%20the%20path%20pkgs%2Fby-name%2Fqr%2Fqrcode-barcode-scanner%2Fpackage.nix.%20It%20is%20not%20submitted.%20This%20derivation%20was%20drafted%20with%20an%20AI%20assistant%2C%20and%20the%20Nixpkgs%20policy%20for%20such%20work%20applies%3A%20the%20owner%20reviews%20it%2C%20builds%20it%20and%20submits%20it%20himself%2C%20and%20writes%20the%20pull%20request%20and%20the%20commit%20message%20in%20his%20own%20words.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fnix%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Nixpkgs%20derivation%20%28distribution%2Fnix%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20holds%20a%20Nixpkgs%20derivation%20for%20qrscan%200.11.0%2C%20for%20the%20path%20pkgs%2Fby-name%2Fqr%2Fqrcode-barcode-scanner%2Fpackage.nix.%20It%20is%20not%20submitted.%20This%20derivation%20was%20drafted%20with%20an%20AI%20assistant%2C%20and%20the%20Nixpkgs%20policy%20for%20such%20work%20applies%3A%20the%20owner%20reviews%20it%2C%20builds%20it%20and%20submits%20it%20himself%2C%20and%20writes%20the%20pull%20request%20and%20the%20commit%20message%20in%20his%20own%20words.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fnix%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand Nixpkgs derivation (distribution/nix/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This folder holds a Nixpkgs derivation for qrscan 0.11.0, for the path pkgs/by-name/qr/qrcode-barcode-scanner/package.nix. It is not submitted. This derivation was drafted with an AI assistant, and the Nixpkgs policy for such work applies: the owner reviews it, builds it and submits it himself, and writes the pull request and the commit message in his own words. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/nix/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/cli https://qrcode-ai.com/en-US/barcode-scanner/cli https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This folder holds a Nixpkgs derivation for qrscan 0.11.0, for the path `pkgs/by-name/qr/qrcode-barcode-scanner/package.nix`. It is not submitted. This derivation was drafted with an AI assistant, and the Nixpkgs policy for such work applies: the owner reviews it, builds it and submits it himself, and writes the pull request and the commit message in his own words.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) let you try the engine in a browser first. For the qrscan options and its JSON report, read the [QR code scanner command line guide](https://qrcode-ai.com/en-US/qr-code-scanner/cli) and the [barcode scanner command line guide](https://qrcode-ai.com/en-US/barcode-scanner/cli).

To make a test image with a known payload, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), and keep the payload you encoded to compare it with the scan.

## What the derivation does

[package.nix](package.nix) uses `rustPlatform.buildRustPackage`. It builds only the `qrcode-barcode-scanner-cli` crate from the [release source archive](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-source.tar.gz) of tag v0.11.0, with the exact crates of its `Cargo.lock`. It keeps the workspace release profile: integer overflow stays checked in the rxing reader, and `panic=abort` is never set, because the engine catches reader panics. The install check runs the installed qrscan. The check scans the [mixed QR and Code 128 sample](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/fixtures/symbology/mixed-code128-qr.png) with the fast, frame and full profiles and no time budget, and requires both payloads, `https://qrc-ai.com/76xMa` and `STOCK-4827`, in each report. Its metadata gives the license `agpl3Plus`, the main program `qrscan`, and Linux and macOS as platforms.

`cargoHash` is still `lib.fakeHash`. The first build of the crates prints the real hash, which replaces the placeholder. [ci.nix](ci.nix) evaluates the derivation against a pinned nixpkgs revision for the lint workflow; it is not part of the submission.

## How it is tested

The `nix` job of `.github/workflows/integration-packaging-lint.yml` parses the file, evaluates the name, the version, the license and the main program against nixos-unstable, instantiates the derivation, and fetches the crates, which prints the value of `cargoHash`. Fetching the crates compiles nothing. `scripts/check-packaging-recipes.py` checks the source hash against the release archive.

## Submit it

Submission is the owner's step, with his GitHub account and a Nixpkgs maintainer entry.

1. In a checkout of `NixOS/nixpkgs`, copy package.nix to `pkgs/by-name/qr/qrcode-barcode-scanner/package.nix`.
2. Run `nix-build -A qrcode-barcode-scanner`. It fails once and prints `got: sha256-...`; put that value in `cargoHash` and build again. The install check must pass.
3. Add the owner to `maintainers/maintainer-list.nix` if needed, and to `meta.maintainers`.
4. Run `nixpkgs-review` on the change, then open the pull request with the commit title `qrcode-barcode-scanner: init at 0.11.0`. Read the current AI section of the Nixpkgs contributing guide before opening it.

Once it is merged, users run `nix-shell -p qrcode-barcode-scanner` or `nix run nixpkgs#qrcode-barcode-scanner -- photo.png`. qrscan prints a JSON report on stdout. It exits with 0 when it found at least one code, 1 when it found none and 2 when the image could not be read.

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

The package installs qrscan 0.11.0. That program and its release archives are licensed AGPL-3.0-or-later; the package keeps their license files, the third-party notices and the Apache-2.0 text of the retained reader code. The recipe files in this folder are project source, available under the MIT License described below. They do not change the license of the program they install.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
