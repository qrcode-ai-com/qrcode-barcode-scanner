<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-cli-dark.gif?v=e84805b8f980">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-cli-light.gif?v=1dc243096583" alt="QR Code &amp; Barcode Scanner CLI: qrscan commands in a terminal, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner for Wasmer

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Wasmer%20%28distribution%2Fwasmer%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20builds%20the%20Wasmer%20package%20of%20qrscan%200.11.0%2C%20the%20QR%20Code%20%26%20Barcode%20Scanner%20command%20line%2C%20compiled%20to%20WebAssembly%20for%20WASI%20%28wasm32-wasip1%29.%20The%20package%20holds%20one%20module%2C%20qrscan.wasm%2C%20that%20reads%20an%20image%20file%20and%20prints%20the%20JSON%20report%20of%20qrscan%2C%20on%20any%20machine%20where%20Wasmer%20runs%2C%20with%20no%20network.%20The%20workflow%20.github%2Fworkflows%2Fwasmer.yml%20compiles%20it%20from%20the%20source%20of%20tag%20v0.11.0%20and%20runs%20it%20under%20Wasmer.%20Its%20registry%20page%2C%20wasmer.io%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2C%20lists%20the%20publi%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fwasmer%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Wasmer%20%28distribution%2Fwasmer%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20builds%20the%20Wasmer%20package%20of%20qrscan%200.11.0%2C%20the%20QR%20Code%20%26%20Barcode%20Scanner%20command%20line%2C%20compiled%20to%20WebAssembly%20for%20WASI%20%28wasm32-wasip1%29.%20The%20package%20holds%20one%20module%2C%20qrscan.wasm%2C%20that%20reads%20an%20image%20file%20and%20prints%20the%20JSON%20report%20of%20qrscan%2C%20on%20any%20machine%20where%20Wasmer%20runs%2C%20with%20no%20network.%20The%20workflow%20.github%2Fworkflows%2Fwasmer.yml%20compiles%20it%20from%20the%20source%20of%20tag%20v0.11.0%20and%20runs%20it%20under%20Wasmer.%20Its%20registry%20page%2C%20wasmer.io%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2C%20lists%20the%20publi%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fwasmer%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Wasmer%20%28distribution%2Fwasmer%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20builds%20the%20Wasmer%20package%20of%20qrscan%200.11.0%2C%20the%20QR%20Code%20%26%20Barcode%20Scanner%20command%20line%2C%20compiled%20to%20WebAssembly%20for%20WASI%20%28wasm32-wasip1%29.%20The%20package%20holds%20one%20module%2C%20qrscan.wasm%2C%20that%20reads%20an%20image%20file%20and%20prints%20the%20JSON%20report%20of%20qrscan%2C%20on%20any%20machine%20where%20Wasmer%20runs%2C%20with%20no%20network.%20The%20workflow%20.github%2Fworkflows%2Fwasmer.yml%20compiles%20it%20from%20the%20source%20of%20tag%20v0.11.0%20and%20runs%20it%20under%20Wasmer.%20Its%20registry%20page%2C%20wasmer.io%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2C%20lists%20the%20publi%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fwasmer%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Wasmer%20%28distribution%2Fwasmer%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20builds%20the%20Wasmer%20package%20of%20qrscan%200.11.0%2C%20the%20QR%20Code%20%26%20Barcode%20Scanner%20command%20line%2C%20compiled%20to%20WebAssembly%20for%20WASI%20%28wasm32-wasip1%29.%20The%20package%20holds%20one%20module%2C%20qrscan.wasm%2C%20that%20reads%20an%20image%20file%20and%20prints%20the%20JSON%20report%20of%20qrscan%2C%20on%20any%20machine%20where%20Wasmer%20runs%2C%20with%20no%20network.%20The%20workflow%20.github%2Fworkflows%2Fwasmer.yml%20compiles%20it%20from%20the%20source%20of%20tag%20v0.11.0%20and%20runs%20it%20under%20Wasmer.%20Its%20registry%20page%2C%20wasmer.io%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2C%20lists%20the%20publi%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fwasmer%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for Wasmer (distribution/wasmer/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This folder builds the Wasmer package of qrscan 0.11.0, the QR Code & Barcode Scanner command line, compiled to WebAssembly for WASI (wasm32-wasip1). The package holds one module, qrscan.wasm, that reads an image file and prints the JSON report of qrscan, on any machine where Wasmer runs, with no network. The workflow .github/workflows/wasmer.yml compiles it from the source of tag v0.11.0 and runs it under Wasmer. Its registry page, wasmer.io/qrcode-ai-com/qrcode-barcode-scanner, lists the publi Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/wasmer/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/cli https://qrcode-ai.com/en-US/barcode-scanner/cli https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This folder builds the Wasmer package of qrscan 0.11.0, the QR Code & Barcode Scanner command line, compiled to WebAssembly for WASI (`wasm32-wasip1`). The package holds one module, `qrscan.wasm`, that reads an image file and prints the JSON report of qrscan, on any machine where Wasmer runs, with no network. The workflow `.github/workflows/wasmer.yml` compiles it from the source of tag v0.11.0 and runs it under Wasmer. Its registry page, `wasmer.io/qrcode-ai-com/qrcode-barcode-scanner`, lists the published versions; when this folder was written, no version was published.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) let you try the engine in a browser first. For the qrscan options and its JSON report, read the [QR code scanner command line guide](https://qrcode-ai.com/en-US/qr-code-scanner/cli) and the [barcode scanner command line guide](https://qrcode-ai.com/en-US/barcode-scanner/cli).

To make a test image with a known payload, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), and keep the payload you encoded to compare it with the scan.

## Files

- `wasmer.toml`: the package manifest. It names the package `qrcode-ai-com/qrcode-barcode-scanner`, version 0.11.0, license AGPL-3.0-or-later, declares one WASI module, `qrscan`, and one command of the same name, which is also the entrypoint, and maps `notices/` into the package.
- `package.py`: assembles the package folder from a checkout of tag v0.11.0 and the module built there, and verifies a package folder.
- `consume.py`: runs a package on the shared truth set of the engine, as a user of `wasmer run` would, and compares each report with the native qrscan 0.11.0.
- `qrscan-in-wasmer.sh`: runs the package like an installed `qrscan`: it maps the directory of the image into the module and passes the other options through.
- `LICENSE-NOTES.md`: the license of each part of the package, packed as `notices/LICENSE-NOTES.md`. `LICENSE` is the MIT License of the files of this folder.
- `LISTING.md`: the owner's publication steps.

`package.py assemble` writes a folder that holds `wasmer.toml`, this README, the module and the AGPL-3.0 text of the 0.11.0 source as `LICENSE`. Wasmer packs only the module, the readme, the license file and the directories the manifest maps, so the other notices sit in `notices/`, which the manifest maps to `/notices`: `LICENSE-NOTES.md`, the Apache-2.0 text and the notices of the retained reader code, `THIRD-PARTY-LICENSES.txt` for the crates the module links, the Rust standard library notice and `SOURCE.json`. `SOURCE.json` records the source revision, its `Cargo.lock`, the Rust release that compiled the module and the sha256 of every file. `SHA256SUMS` lists every file of the folder for the owner's check; Wasmer does not pack it.

## Run it

With a package folder, a downloaded artifact of the workflow or one you built as below, and Wasmer installed:

```sh
mkdir -p /tmp/images
cp fixtures/symbology/mixed-code128-qr.png /tmp/images/label.png
wasmer run --offline --volume /tmp/images:/data ./qrscan-wasmer-package -- /data/label.png
```

The module sees only the directories you map: `--volume HOST:GUEST` maps a host directory to a path inside the module, and the image path you pass is that inside path. The options after `--` go to qrscan, for example `--profile frame` or `--budget-ms 0`. qrscan prints the JSON report on stdout. It exits with 0 when it found at least one code, 1 when it found none and 2 when the image could not be read. `--offline` keeps Wasmer from asking the registry about a local folder.

`qrscan-in-wasmer.sh` does the mapping and the colour choice for you. Set `QRSCAN_WASMER_PACKAGE` to the package folder, then call it as you would call qrscan:

```sh
QRSCAN_WASMER_PACKAGE=./qrscan-wasmer-package distribution/wasmer/qrscan-in-wasmer.sh /tmp/images/label.png --profile full
```

## Limits

- One thread. The `wasm32-wasip1` target has no threads, so the engine runs the stages it spreads over several threads in a native build one after another. A profile's wall-clock budget is the same, and one thread does less work within it: pass `--budget-ms 0` when every code of the image matters.
- A panic stops the module. The native command catches a panic of a reader, counts it in `trace.engine_panics` and still prints a report. WebAssembly code built for this target aborts on a panic, so the module ends with a trap and prints no report. The tests below require `trace.engine_panics` to be 0 on every image of the truth set.
- Colour. Wasmer presents the standard streams to the module as a terminal, so a plain `wasmer run` colours the messages qrscan writes on stderr even into a pipe or a file. Add `--env NO_COLOR=1` for plain text. `qrscan-in-wasmer.sh` decides as qrscan does on the host: `NO_COLOR`, then `CLICOLOR_FORCE`, then colour only when its output is a terminal. The JSON report is never coloured.
- Files only. The module reads an image from a mapped directory; it reads no standard input, opens no network connection and sees no other host file.
- Memory. A `wasm32` module addresses at most 4 GiB. The engine's own pixel and size limits apply as in the native command.

## Build and check it

The module is built from tag v0.11.0 (commit `176ac96ef16ee330dbfc6ada10327d0b4e23a8b2`), never from a branch, so the version and the license the package states are those of its source. From the root of a checkout of the engine repository, with Rust 1.99.1, its `wasm32-wasip1` target and Python 3:

```sh
git clone --depth 1 --branch v0.11.0 https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust /tmp/engine-0.11.0
(cd /tmp/engine-0.11.0 && cargo build --locked --release --target wasm32-wasip1 -p qrcode-barcode-scanner-cli --bin qrscan)
python3 distribution/wasmer/package.py assemble --engine /tmp/engine-0.11.0 \
  --module /tmp/engine-0.11.0/target/wasm32-wasip1/release/qrscan.wasm --out /tmp/qrscan-wasmer-package
python3 distribution/wasmer/package.py verify /tmp/qrscan-wasmer-package
python3 distribution/wasmer/package.py --self-test
python3 distribution/wasmer/consume.py --self-test
```

`assemble` refuses a checkout whose commit is not the one of v0.11.0, and an output folder that is not empty. It lists the third-party crates with the same code as the release archives of the command line (`scripts/cli-release.py`), from `Cargo.lock`, for the `wasm32-wasip1` target. `verify` checks the exact list of files, `SHA256SUMS`, `SOURCE.json`, the manifest fields, the `notices` mapping and that the files taken from this folder are the ones of the checkout. The workflow sets `RUSTFLAGS` to remap the build directory and the Cargo home to fixed paths, so the module does not depend on where it was built.

The module is a new build of the 0.11.0 source for a new target. It is not one of the files published for 0.11.0, which keep their bytes, and building it changes neither the tag nor the release.

## How it is tested

The workflow `.github/workflows/wasmer.yml` of the [engine repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust) runs the self-tests of `package.py` and `consume.py`, then compiles the module twice, in two directories, and requires the same sha256. On a fresh runner it downloads the package folder, verifies it, and installs Wasmer 7.5.0 from its release archive, checked by sha256, with a Wasmer home of its own. Then it:

- runs `consume.py` on the 35 images of the shared truth set with the full profile and no budget, and requires every expected code, an exit of 1 and an empty report for the images that hold none, an exit of 2 for the bytes that are not an image, `trace.engine_panics` 0 and engine version 0.11.0;
- runs the native qrscan 0.11.0 of the release on the same images, downloaded anonymously and checked by sha256, and requires the same exit code and the same detections for each one;
- runs the destination acceptance of `scripts/destination-acceptance.py` on the [mixed QR and Code 128 sample](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/fixtures/symbology/mixed-code128-qr.png) with the fast, frame and full profiles, which require `https://qrc-ai.com/76xMa` and `STOCK-4827` in each report;
- runs the `wasmer run` command of this README on the sample with each profile, a missing file, which exits 2, and `--version`;
- builds the package with `wasmer package build`, unpacks it and requires the module, the readme, `LICENSE` and every file of `notices/` in it;
- tries `wasmer publish --dry-run` without an account and records the answer, then removes the package folder and the Wasmer home with its cache, and requires the package to be gone.

The receipts of each run are kept as the artifact `qrscan-wasmer-receipts`.

When this folder was written, run [44885967740](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44885967740) built the same module twice, sha256 `65c4436f2ac461bd94696c9daaf7fce40bf5a6c26203f1a7115a8d9201c45460`. Under Wasmer 7.5.0 on Ubuntu 24.04 x64, all 35 truth cases passed with the same exit codes and detections as the native command, and the acceptance on the mixed sample passed in the three profiles. The package Wasmer built held every notice, and `wasmer publish --dry-run` answered that no user was logged in.

## Publish it

Publication is the owner's step: it needs a Wasmer account that owns the namespace `qrcode-ai-com`, and Wasmer signs in before it reads a package, even for `wasmer publish --dry-run`. No workflow publishes. [LISTING.md](LISTING.md) has the steps, from the package folder of a workflow run, checked by its sha256.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-cli-dark.gif?v=5b861170b5d2">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-cli-light.gif?v=a700b1da82fb" alt="How qrscan works, in three steps: install qrscan, pass an image file, and read the JSON report" width="100%">
  </picture>
</p>

The picture shows the three steps of the command line route: get qrscan, pass it an image file, and read the JSON report. With Wasmer, the first step is the package folder and the image is passed through a mapped directory, as written above.

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

The package holds qrscan 0.11.0 compiled to WebAssembly. That source is licensed AGPL-3.0-or-later in this version, so the module and the package are too: `LICENSE` in the package is the AGPL-3.0 text of the 0.11.0 source, which is the corresponding source of the module. The package keeps the Apache-2.0 text and notices of the retained reader code, the licenses of the crates the module links and the notice of the Rust standard library. `LICENSE-NOTES.md` names each part. The files of this folder are project source, available under the MIT License described below. They do not change the license of the module.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
