<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-node-dark.gif?v=5ccb9970e48c">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-node-light.gif?v=3cddfebb8fa2" alt="QR Code &amp; Barcode Scanner for Node.js: the Node.js logo, the quick start in JavaScript, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code and Barcode Scanner · Obsidian plugin

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20and%20Barcode%20Scanner%20%C2%B7%20Obsidian%20plugin%20%28integrations%2Fobsidian%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Obsidian%20plugin%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20of%20your%20vault%20and%20writes%20their%20text%20into%20a%20note%20when%20you%20ask.%20The%20scan%20runs%20on%20your%20device%2C%20in%20the%20published%20WebAssembly%20engine%20that%20the%20plugin%20carries.%20It%20makes%20no%20network%20request%20and%20never%20opens%20a%20decoded%20link.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fobsidian%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fobsidian%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fobsidian%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20and%20Barcode%20Scanner%20%C2%B7%20Obsidian%20plugin%20%28integrations%2Fobsidian%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Obsidian%20plugin%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20of%20your%20vault%20and%20writes%20their%20text%20into%20a%20note%20when%20you%20ask.%20The%20scan%20runs%20on%20your%20device%2C%20in%20the%20published%20WebAssembly%20engine%20that%20the%20plugin%20carries.%20It%20makes%20no%20network%20request%20and%20never%20opens%20a%20decoded%20link.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fobsidian%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fobsidian%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fobsidian%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20and%20Barcode%20Scanner%20%C2%B7%20Obsidian%20plugin%20%28integrations%2Fobsidian%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Obsidian%20plugin%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20of%20your%20vault%20and%20writes%20their%20text%20into%20a%20note%20when%20you%20ask.%20The%20scan%20runs%20on%20your%20device%2C%20in%20the%20published%20WebAssembly%20engine%20that%20the%20plugin%20carries.%20It%20makes%20no%20network%20request%20and%20never%20opens%20a%20decoded%20link.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fobsidian%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fobsidian%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fobsidian%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20and%20Barcode%20Scanner%20%C2%B7%20Obsidian%20plugin%20%28integrations%2Fobsidian%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Obsidian%20plugin%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20of%20your%20vault%20and%20writes%20their%20text%20into%20a%20note%20when%20you%20ask.%20The%20scan%20runs%20on%20your%20device%2C%20in%20the%20published%20WebAssembly%20engine%20that%20the%20plugin%20carries.%20It%20makes%20no%20network%20request%20and%20never%20opens%20a%20decoded%20link.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fobsidian%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fobsidian%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fobsidian%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code and Barcode Scanner · Obsidian plugin (integrations/obsidian/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This Obsidian plugin reads the QR codes and barcodes in an image of your vault and writes their text into a note when you ask. The scan runs on your device, in the published WebAssembly engine that the plugin carries. It makes no network request and never opens a decoded link. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/obsidian/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/obsidian https://qrcode-ai.com/en-US/barcode-scanner/integrations/obsidian https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This Obsidian plugin reads the QR codes and barcodes in an image of your vault and writes their text into a note when you ask. The scan runs on your device, in the published WebAssembly engine that the plugin carries. It makes no network request and never opens a decoded link.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) of QR Code AI read the same codes in a browser. The [QR code scanner guide for Obsidian](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/obsidian) and the [barcode scanner guide for Obsidian](https://qrcode-ai.com/en-US/barcode-scanner/integrations/obsidian) show this plugin in a vault, step by step.

To make a test image, encode a known text with the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), save the picture in your vault and embed it in a note. The plugin should give back exactly the text you encoded, leading zeros included.

Its own repository, [`qrcode-ai-com/qrcode-barcode-scanner-obsidian`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-obsidian), has been public since 20 November 2026, and its tests pass there. The plugin is not listed in Obsidian's community plugins yet. Until it is, build it from this folder and install it by hand, as written below.

## How it works

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-dark.gif?v=50f76ea0d290">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-packages-light.gif?v=4ec5c6f31076" alt="Scan inside your application, in Rust, Node.js, browser WASM or Python, in three steps: install and initialize, pass an image or a camera frame, read the result." width="100%">
  </picture>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The picture shows the three steps of the package route. In Obsidian they are:

1. Install and enable the plugin. The engine starts on the first scan, from the module inside `main.js`.
2. Embed or link an image in a note, then run **Scan an image in this note** from the command palette.
3. Read the codes in the window that opens. Choose **Insert into** the note, or **Copy**. Nothing is written before you choose.

## Install

Build `main.js` with Node.js 22 or later, in this folder: `integrations/obsidian` of the engine repository, or the root of the plugin repository.

```sh
npm ci
npm run build
```

Then copy `main.js`, `manifest.json` and `styles.css` into the folder `.obsidian/plugins/qrcode-barcode-scanner/` of your vault. Restart Obsidian, open **Settings → Community plugins** and turn on **QR Code and Barcode Scanner**.

Once the plugin is listed, you will find it in **Settings → Community plugins → Browse** under the same name.

## Use

The plugin adds two commands and one menu item:

- **Scan an image in this note** reads the image the note embeds or links. When the note holds several images, a list opens; the image on the cursor line comes first.
- **Scan the open image** reads the image open in the current tab.
- **Scan for QR codes and barcodes**, in the menu of an image file, reads that file.

The window shows each code with its format and its exact text. **Insert into** writes them at the cursor of the note, on lines of their own. With the mixed test image, the list looks like this:

```markdown
- QR Code: `https://qrc-ai.com/76xMa`
- Code 128: `STOCK-4827`
```

In the settings, **Inserted text** can write a callout instead:

```markdown
> [!info] Codes in mixed-code128-qr.png
> - QR Code: `https://qrc-ai.com/76xMa`
> - Code 128: `STOCK-4827`
```

Decoded text comes from an image anyone can make. The plugin therefore writes it inside code spans, so a link, an embed or HTML in a code stays plain text in your note. Text on several lines goes in a fenced block.

**Scan profile** sets how long the engine searches. Full, the default, searches longest and reads the most damaged codes. Fast and Frame stop sooner; when they run out of time, the window says so, because an empty result is then not final.

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

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both come back in the same report, each with its format and its exact text. The plugin keeps the format and the text. A code whose bytes are not all text is marked as incomplete, so you know to check it against the image.

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

The plugin reads PNG, JPEG, WebP and GIF files. The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## On your device, on desktop and mobile

The plugin makes no network request, needs no account and collects nothing. The engine runs inside Obsidian, from the module embedded in `main.js`, so the plugin works offline.

It uses no Node.js or Electron module, so the manifest allows mobile. The scan holds Obsidian while it runs: on the test image it takes about half a second on a recent Mac. `main.js` weighs about 3 MB, because the engine travels inside it.

## Tests

In the same folder:

```sh
npm ci
npm run typecheck
npm test
```

`npm test` builds `main.js`, loads it the way Obsidian does and drives its commands against a stand-in for the Obsidian API. It scans the mixed test image in the fast, frame and full profiles, and checks the inserted text, the notices for a missing or unreadable image, the image list and the settings. Every network call is refused and counted.

With Playwright's own browsers installed (`npx playwright-core install chromium webkit`), the tests also run `main.js` in Chromium and WebKit, the engines of Obsidian on desktop, Android, iPhone and iPad. CI sets `QRSCAN_OBSIDIAN_BROWSERS=required`, so a missing browser fails instead of skipping.

## Its own repository

Obsidian installs a plugin from the releases of a GitHub repository. This folder is therefore staged as the repository `qrcode-ai-com/qrcode-barcode-scanner-obsidian`, whose content is never edited by hand. From the root of the engine repository:

```sh
python3 scripts/stage-obsidian-satellite.py stage --out /absolute/empty/folder
python3 scripts/stage-obsidian-satellite.py verify /absolute/empty/folder
```

The stage reads one commit, checks the manifest against the community directory rules and writes `SOURCE.json` with the sha256 of every file. The workflows of [mirror/](mirror/test.yml) become the repository's own: its tests, and a release that a tag such as `1.0.0` starts. That release builds `main.js`, runs the tests and opens a draft with `main.js`, `manifest.json` and `styles.css`.

## Licenses of what you install

The plugin source is MIT, in [LICENSE](LICENSE). `main.js` also embeds the published engine `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0. That engine keeps its own license, AGPL-3.0-or-later, and two of its reader parts keep their Apache-2.0 notice. Their texts close `main.js` and sit beside it as [ENGINE-LICENSE](../../distribution/releases/historical-agpl-3.0.txt), [ENGINE-LICENSE-APACHE-2.0](../../crates/qrcode-ai-scanner/LICENSE-APACHE-2.0) and [ENGINE-THIRD-PARTY.md](ENGINE-THIRD-PARTY.md). The source of that engine version is the tag `v0.11.0` of the [engine repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust). Installing the plugin does not relicense the engine.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
