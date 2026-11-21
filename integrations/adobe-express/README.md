# QR Code & Barcode Scanner · Adobe Express add-on 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Adobe%20Express%20add-on%200.1.0%20%28integrations%2Fadobe-express%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20An%20Adobe%20Express%20add-on%20that%20reads%20the%20QR%20codes%20and%20barcodes%20on%20a%20page%20of%20your%20design.%20Click%20Scan%20this%20page%2C%20Scan%20all%20pages%20or%20Scan%20an%20image%20file%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20add-on%27s%20panel%2C%20in%20your%20browser%3A%20the%20page%20is%20not%20sent%20to%20any%20other%20service%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fadobe-express%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fadobe-express%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fadobe-express%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Adobe%20Express%20add-on%200.1.0%20%28integrations%2Fadobe-express%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20An%20Adobe%20Express%20add-on%20that%20reads%20the%20QR%20codes%20and%20barcodes%20on%20a%20page%20of%20your%20design.%20Click%20Scan%20this%20page%2C%20Scan%20all%20pages%20or%20Scan%20an%20image%20file%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20add-on%27s%20panel%2C%20in%20your%20browser%3A%20the%20page%20is%20not%20sent%20to%20any%20other%20service%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fadobe-express%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fadobe-express%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fadobe-express%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Adobe%20Express%20add-on%200.1.0%20%28integrations%2Fadobe-express%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20An%20Adobe%20Express%20add-on%20that%20reads%20the%20QR%20codes%20and%20barcodes%20on%20a%20page%20of%20your%20design.%20Click%20Scan%20this%20page%2C%20Scan%20all%20pages%20or%20Scan%20an%20image%20file%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20add-on%27s%20panel%2C%20in%20your%20browser%3A%20the%20page%20is%20not%20sent%20to%20any%20other%20service%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fadobe-express%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fadobe-express%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fadobe-express%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Adobe%20Express%20add-on%200.1.0%20%28integrations%2Fadobe-express%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20An%20Adobe%20Express%20add-on%20that%20reads%20the%20QR%20codes%20and%20barcodes%20on%20a%20page%20of%20your%20design.%20Click%20Scan%20this%20page%2C%20Scan%20all%20pages%20or%20Scan%20an%20image%20file%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20add-on%27s%20panel%2C%20in%20your%20browser%3A%20the%20page%20is%20not%20sent%20to%20any%20other%20service%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fadobe-express%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fadobe-express%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fadobe-express%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · Adobe Express add-on 0.1.0 (integrations/adobe-express/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): An Adobe Express add-on that reads the QR codes and barcodes on a page of your design. Click Scan this page, Scan all pages or Scan an image file: the panel lists each code with its format and its exact text, and can compare it with the text you expect. The published WebAssembly engine 0.11.0 runs inside the add-on's panel, in your browser: the page is not sent to any other service, and a decoded link is never opened for you. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/adobe-express/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/adobe-express https://qrcode-ai.com/en-US/barcode-scanner/integrations/adobe-express https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

An Adobe Express add-on that reads the QR codes and barcodes on a page of your design. Click Scan this page, Scan all pages or Scan an image file: the panel lists each code with its format and its exact text, and can compare it with the text you expect. The published WebAssembly engine 0.11.0 runs inside the add-on's panel, in your browser: the page is not sent to any other service, and a decoded link is never opened for you.

Version 0.1.0 is built and tested in this folder, but it is not in the Adobe Express add-on marketplace yet. Until Adobe lists it, you can run it from a build of this folder with a private link of your own, as shown below.

The same engine runs on the web as the [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) of QR Code AI. The [QR code scanner Adobe Express guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/adobe-express) and the [barcode scanner Adobe Express guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/adobe-express) explain this add-on for each use. If a page is unavailable, this README and the listing kit in [LISTING.md](LISTING.md) remain the reference.

To make a test page with a known value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Place the code on a page, keep the text you encoded, then type it in Expected text: each code shows Matches or Differs, character for character, leading zeroes included.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/adobe-express/media/screenshot-dark.png">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/adobe-express/media/screenshot-light.png" alt="A page with a Code 128 barcode and a QR code beside the add-on's panel: the panel found two codes, STOCK-4827 marked Matches and https://qrc-ai.com/76xMa marked Differs from the expected text" width="100%">
  </picture>
</p>

The picture is the built package in its test page, which stands in for the add-on panel of Adobe Express, after it read the mixed test page in the full profile with `STOCK-4827` as the expected text.

## Use

1. In Adobe Express, open the add-on from **Add-ons** in the left rail.
2. Choose a profile. **Full** reads the most and also scores QR codes, **Fast** suits clear images and **Frame** is the quickest.
3. Optionally type the text you expect in **Expected text**.
4. Click **Scan this page** to read the page you are on, **Scan all pages** to read every page of the document (the first 20), or **Scan an image file** to read a PNG, JPEG, WebP or GIF file from your computer.
5. Each code appears under its page with its format (QR Code, Code 128 and so on), its kind (link, text, Wi-Fi network and others) and its exact text. Invisible characters are shown by their code point, such as `⟨U+200B⟩`.
6. **Full report of the first image** shows the engine's JSON report for the first page or file, with where each code was measured.

A page is read as Adobe Express draws it: crops, layers and effects are applied, so a code hidden under another element is not read, and a code made of several elements is read as one picture. The page is read at the size Adobe Express renders it; a code that is very small on a large page can be too small to read, and scanning its image file reads it at full size.

## Permissions, and why

The add-on asks for one capability in [src/manifest.json](src/manifest.json): `renditionPreview`. Adobe Express requires it to give the add-on a rendition with the preview intent, whose image Adobe lets an add-on read or show but not offer for download or keep on a server. This add-on only reads it. The add-on asks for no other permission: no pop-ups, no downloads, no clipboard, no OAuth and no account. It has no login and no server. The source code address is shown as text, so the add-on opens no link.

## Privacy

The add-on loads the Adobe Express add-on SDK from Adobe and its own files from the package; it makes no other request. The page rendition comes from Adobe Express inside the browser, and the engine reads it in the add-on's scanner worker, in the browser. A file you choose is read the same way, and is not uploaded. The add-on has no analytics, no cookies and no storage, and keeps nothing after you close it.

## Try it from a build

You need Node.js 22.19 or later on the 22 line, or Node.js 24 or later, and an Adobe Express account with add-on development turned on in its settings, as Adobe's [getting started guide](https://developer.adobe.com/express/add-ons/docs/guides/getting-started/hello-world) shows. From a checkout of this repository:

```sh
cd integrations/adobe-express
npm ci --ignore-scripts
npm run build
```

The build checks that the installed scanner package is version 0.11.0 and that its WebAssembly module has the pinned SHA-256, then writes `dist/`, the package `build/qrcode-barcode-scanner-adobe-express-0.1.0.zip` and `build/build-receipt.json`.

From the Adobe Express home page, open **Add-ons** in the left-hand navigation, create a listing, and in its **Private link** tab upload the zip, as Adobe's [private link guide](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/private-dist) describes. Adobe checks the package and gives a link that opens the add-on for you and anyone you share it with. Read [LICENSE-NOTES.md](LICENSE-NOTES.md) before you share it.

## Build and test

```sh
npm ci --ignore-scripts
npm run build              # dist/, the zip and build/build-receipt.json
npm test                   # Node unit tests, no browser
node node_modules/playwright/cli.js install chromium
npm run test:express       # the zip in Playwright's Chromium, in a stand-in for the add-on panel
npm run listing            # the icon and screenshots for the listing, in build/listing/
```

- `npm run build` copies the panel from `src/`, bundles `src/worker.js` with esbuild into one classic worker script with the engine inlined by [integrations/wasm-inline](../wasm-inline/README.md), adds the license files, and writes the zip with `manifest.json` at its root. It refuses a hidden file, a path that is not relative, a reference to a file outside the package, a remote import other than the SDK, and code built from text. Entries are stored with one fixed date, so the same lockfile gives the same bytes on any machine.
- `npm test` checks the result helpers, the manifest, the package checks, the zip, and that [LISTING.md](LISTING.md) names the size and SHA-256 of the zip just built and keeps Adobe's character limits, then runs the built `scanner-worker.js` in a plain JavaScript context with the real engine: it reads the mixed test image in fast, frame and full and states an image it cannot read.
- `npm run test:express` serves the files of the zip at an HTTPS origin of their own, as Adobe Express does, and answers the SDK address with a fake SDK that renders test pages as PNG and switches themes. It reads the mixed test page in the three profiles, checks that each rendition asks for the PNG format and the preview intent, reads a two-page document and an image file, refuses a file that is not an image, and shows the empty and error states and both themes. Every request must be a file of the package or the SDK address, and nothing may be left in storage. It writes the three reports under `build/acceptance/` for `scripts/destination-acceptance.py`, and two screenshots under `build/screenshots/`.

Adobe Express itself is not part of these tests. The `integration-adobe-express` workflow runs them on every change to this folder; running the package in Adobe Express through a private link is the owner's step before submission.

## What Adobe Express receives

Adobe Express takes a zip of at most 50 MB with the add-on's `manifest.json` at its root, relative paths and no hidden file. This package holds 12 files and is about 3.1 MB: the panel (`index.html`, `index.js`, `image.js`, `results.js`, `styles.css`), `scanner-worker.js` with the engine's WebAssembly module as base64 (about 3.0 MB), and the license files with `NOTICE.md`. Adobe Express serves these files from a subdomain of its own for the add-on (`<id>.wxp.adobe-addons.com`), in a frame sandboxed with `allow-scripts allow-same-origin` only.

The engine runs in a dedicated worker, so the panel stays responsive while it reads. Each scan stops at 20 seconds and says so. The listing values, the media and the owner's steps are in [LISTING.md](LISTING.md).

## Limits

- It reads PNG, JPEG, WebP and GIF files. SVG, HEIC, AVIF and TIFF files are refused with a message.
- Files and renditions larger than 32 MB are refused. Scan all pages reads the first 20 pages.
- A page is read as rendered by Adobe Express, at its rendition size.
- The panel is in English.
- It has been tested in Playwright's Chromium with a stand-in for Adobe Express, not yet in Adobe Express.

## How it works

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-browser-dark.gif?v=32206e525b2c">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-browser-light.gif?v=248e5382e6cc" alt="How the browser package works, in three steps: install and initialize, pass an image or a camera frame to the engine in the page, and read the report" width="100%">
  </picture>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The picture shows the three steps of the browser package, and the add-on follows them. When the panel opens, it starts its scanner worker, which compiles the WebAssembly module carried in `scanner-worker.js`. When you scan, the panel asks Adobe Express for a PNG rendition of the page, or takes the file you chose, and hands its bytes to the worker with the chosen profile. The report comes back as JSON, and the panel shows each code as text.

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

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. The add-on reads the same test image in its tests, as a rendered page: the QR code gives `https://qrc-ai.com/76xMa` and the barcode gives `STOCK-4827`, in one report. The panel lists each code with its format and exact text; the full report also holds where the engine measured it.

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

The WebAssembly module of engine 0.11.0 reads these 19 formats, and codes of different formats in one image come back in one report.

- QR: QR Code, Micro QR Code, rectangular Micro QR Code (rMQR)
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

The add-on uses the browser package. The Rust, Node.js, browser and Python packages hold the same engine. The Go and PHP packages hold no decoder: each one starts `qrscan` and hands you its report. Every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## For maintainers

The add-on follows Adobe's documentation as read on 21 November 2026:

- [Create renditions](https://developer.adobe.com/express/add-ons/docs/guides/learn/how-to/create-renditions) and the [document API](https://developer.adobe.com/express/add-ons/docs/references/addonsdk/app-document): `createRenditions` with a range, the PNG format and an intent.
- [Premium content](https://developer.adobe.com/express/add-ons/docs/guides/learn/how-to/premium-content): the preview intent and the `renditionPreview` requirement it needs.
- [SDK constants](https://developer.adobe.com/express/add-ons/docs/references/addonsdk/addonsdk-constants): `Range`, `RenditionFormat` and `RenditionIntent`.
- [Manifest](https://developer.adobe.com/express/add-ons/docs/references/manifest): manifest version 2, one panel entry point, the requirements.
- [Add-on context](https://developer.adobe.com/express/add-ons/docs/guides/learn/platform-concepts/context): the sandboxed frame and the subdomain the files are served from.
- [Theme and locale](https://developer.adobe.com/express/add-ons/docs/guides/learn/how-to/theme-locale): `app.ui.theme` and the `themechange` event.
- [Private link](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/private-dist), [public listing](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/public-dist), [listing guidelines](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/guidelines/general/listing) and [review process](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/review-process): the package rules and the values in [LISTING.md](LISTING.md).

The SDK is not pinned: Adobe serves it from one address for every add-on. The fake SDK in `test/express-panel.mjs` provides the parts the panel calls (`ready`, `app.ui.theme`, `app.on`, `app.document.createRenditions` and `constants`); when the panel calls more of the SDK, add it there.

## License of the package

The add-on's own source in this folder is under the MIT License, in [LICENSE](LICENSE). The package also holds engine 0.11.0 under AGPL-3.0-or-later, so the package as a whole is distributed under AGPL-3.0-or-later; it holds no Adobe code. [LICENSE-NOTES.md](LICENSE-NOTES.md) lists every part.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
