# QR Code & Barcode Scanner · Photoshop plugin 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Photoshop%20plugin%200.1.0%20%28integrations%2Fphotoshop-uxp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Photoshop%20plugin%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20your%20document.%20Click%20Scan%20the%20document%2C%20Scan%20the%20selection%20or%20Scan%20an%20image%20file%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20plugin%27s%20panel%2C%20on%20your%20computer%3A%20the%20document%20is%20not%20sent%20anywhere%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fphotoshop-uxp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fphotoshop%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fphotoshop%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Photoshop%20plugin%200.1.0%20%28integrations%2Fphotoshop-uxp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Photoshop%20plugin%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20your%20document.%20Click%20Scan%20the%20document%2C%20Scan%20the%20selection%20or%20Scan%20an%20image%20file%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20plugin%27s%20panel%2C%20on%20your%20computer%3A%20the%20document%20is%20not%20sent%20anywhere%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fphotoshop-uxp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fphotoshop%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fphotoshop%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Photoshop%20plugin%200.1.0%20%28integrations%2Fphotoshop-uxp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Photoshop%20plugin%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20your%20document.%20Click%20Scan%20the%20document%2C%20Scan%20the%20selection%20or%20Scan%20an%20image%20file%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20plugin%27s%20panel%2C%20on%20your%20computer%3A%20the%20document%20is%20not%20sent%20anywhere%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fphotoshop-uxp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fphotoshop%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fphotoshop%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Photoshop%20plugin%200.1.0%20%28integrations%2Fphotoshop-uxp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Photoshop%20plugin%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20your%20document.%20Click%20Scan%20the%20document%2C%20Scan%20the%20selection%20or%20Scan%20an%20image%20file%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20plugin%27s%20panel%2C%20on%20your%20computer%3A%20the%20document%20is%20not%20sent%20anywhere%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fphotoshop-uxp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fphotoshop%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fphotoshop%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · Photoshop plugin 0.1.0 (integrations/photoshop-uxp/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A Photoshop plugin that reads the QR codes and barcodes in your document. Click Scan the document, Scan the selection or Scan an image file: the panel lists each code with its format and its exact text, and can compare it with the text you expect. The published WebAssembly engine 0.11.0 runs inside the plugin's panel, on your computer: the document is not sent anywhere, and a decoded link is never opened for you. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/photoshop-uxp/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/photoshop https://qrcode-ai.com/en-US/barcode-scanner/integrations/photoshop https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A Photoshop plugin that reads the QR codes and barcodes in your document. Click Scan the document, Scan the selection or Scan an image file: the panel lists each code with its format and its exact text, and can compare it with the text you expect. The published WebAssembly engine 0.11.0 runs inside the plugin's panel, on your computer: the document is not sent anywhere, and a decoded link is never opened for you.

Version 0.1.0 is built and tested in this folder with a stand-in for Photoshop. It has not been run in Photoshop yet, and it is not in the Creative Cloud Marketplace. Until it is, a developer can load a build of this folder with Adobe's UXP Developer Tool, as shown below. Read [WebAssembly in Photoshop](#webassembly-in-photoshop) first: Adobe does not officially support WebAssembly in plugins.

The same engine runs on the web as the [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) of QR Code AI. The [QR code scanner Photoshop guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/photoshop) and the [barcode scanner Photoshop guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/photoshop) explain this plugin for each use. If a page is unavailable, this README and the listing kit in [LISTING.md](LISTING.md) remain the reference.

To make a test document with a known value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Place the code in a document, keep the text you encoded, then type it in Expected text: each code shows Matches or Differs, character for character, leading zeroes included.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/photoshop-uxp/media/screenshot-dark.png">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/photoshop-uxp/media/screenshot-light.png" alt="A document with a Code 128 barcode and a QR code beside the plugin's panel: the panel found two codes, STOCK-4827 marked Matches and https://qrc-ai.com/76xMa marked Differs from the expected text" width="100%">
  </picture>
</p>

The picture is the built plugin in its test page, which stands in for a Photoshop panel, after it read the mixed test document in the full profile with `STOCK-4827` as the expected text. It is not a screenshot of Photoshop.

## Use

1. Open **QR Code & Barcode Scanner** from Photoshop's **Plugins** menu.
2. Choose a profile. **Full** reads the most and also scores QR codes, **Fast** suits clear images and **Frame** is the quickest.
3. Optionally type the text you expect in **Expected text**.
4. Click **Scan the document** to read the active document, **Scan the selection** to read the rectangle around the current selection, or **Scan an image file** to read a PNG, JPEG, WebP or GIF file from your computer.
5. Each code appears with its format (QR Code, Code 128 and so on), its kind (link, text, Wi-Fi network and others) and its exact text. Invisible characters are shown by their code point, such as `⟨U+200B⟩`.
6. **Show the full report** shows the engine's JSON report, with where each code was measured.

The document is read as Photoshop draws it: every visible layer merged, converted to 8-bit sRGB, with transparent areas on white. A code hidden under another layer is not read. Photoshop converts documents of other colour modes and bit depths as it gives the pixels; the document itself is not changed. A selection is read as its bounding rectangle, so a lasso around a code reads the rectangle that holds it.

## WebAssembly in Photoshop

Photoshop plugins run in UXP, Adobe's plugin runtime, not in a browser. What Adobe and developers say about WebAssembly there, as read on 21 November 2026:

- Adobe's [code samples page](https://developer.adobe.com/photoshop/uxp/2022/guides/code-samples/) says UXP also supports WebAssembly and links its [wasm-rust-sample](https://github.com/AdobeDocs/uxp-photoshop-plugin-samples/tree/main/wasm-rust-sample), which inlines a Rust module in the plugin's script and starts it synchronously.
- An Adobe staff answer to a [Photoshop 2025 crash report](https://community.adobe.com/bug-reports-711/critical-issue-photoshop-2025-crashes-when-using-web-assembly-based-plugins-657777) says: "Currently, our UXP team does not test or officially support WASM." Developers on Adobe's forum reported [the crash](https://forums.creativeclouddeveloper.com/t/when-my-uxp-plugin-uses-wasm-photoshop-2025-crashes/8619) and [instantiation errors](https://forums.creativeclouddeveloper.com/t/dependency-wasm-instantiate-error/8536) when a module was compiled asynchronously.
- Adobe's [network recipe](https://developer.adobe.com/uxp/guides/how-to/recipes/network/) says that `TextDecoder` is not available in UXP, and a [write-up on WebAssembly in UXP plugins](https://renzullomichele.medium.com/webassembly-in-adobe-photoshop-uxp-plugins-46aca4def9d6) notes that plugins have no Web Workers.

So the plugin takes the route of Adobe's sample and avoids what was reported to fail:

- The engine's WebAssembly module is inlined in `index.js` by [integrations/wasm-inline](../wasm-inline/README.md) and started with the synchronous `initSync`. The plugin makes no asynchronous WebAssembly call and fetches nothing; the tests make those calls throw to prove it.
- `src/polyfills.js` gives the engine a `TextDecoder`, a `TextEncoder` and `performance.now()` when Photoshop lacks them or its own cannot do what the engine asks of them, and leaves Photoshop's own in place otherwise.
- The engine runs on the panel's thread, since there is no worker. Each scan stops at 20 seconds and says so; while it runs, the panel waits.

If Photoshop refuses the module, the panel says "The scanner could not start in this version of Photoshop" and the buttons stay off. The closest route then is a panel that shows a WebView, which manifest version 5 allows ([WebViews](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp-guide/uxp-misc/manifest-v5/#webviews)), running the browser package and receiving the pixels from the panel. That route is not built.

## Permissions, and why

The plugin asks for one permission in [src/manifest.json](src/manifest.json): `localFileSystem: "request"`, so that **Scan an image file** can open Photoshop's file dialog and read the one file you choose. It asks for no network access, no clipboard, no launching of other programs and no access to other plugins. It has no login and no server. The source code address is shown as text, so the plugin opens no link.

Reading the document goes through Photoshop's Imaging API inside `executeAsModal`, under the name **Read QR codes and barcodes**; the plugin never changes the document or its history.

## Privacy

The plugin loads only its own files. It reads the document's pixels or the file you choose on your computer, in the panel; nothing is uploaded. It has no analytics, no cookies and no storage, and keeps nothing after you close the panel.

## Try it from a build

You need Photoshop 25.0 or later, Adobe's UXP Developer Tool (installed from the Creative Cloud desktop app), and Node.js 22.19 or later on the 22 line, or Node.js 24 or later. From a checkout of this repository:

```sh
cd integrations/photoshop-uxp
npm ci --ignore-scripts
npm run build
```

The build checks that the installed scanner package is version 0.11.0 and that its WebAssembly module has the pinned SHA-256, then writes the plugin folder `dist/`, the same files in `build/qrcode-barcode-scanner-photoshop-0.1.0.zip`, and `build/build-receipt.json`.

Then, as Adobe's [UXP Developer Tool guide](https://github.com/adobedocs/uxp-photoshop/blob/main/src/pages/guides/devtool/plugin-workflows.md) describes: start Photoshop, enable Developer Mode when the UXP Developer Tool asks for it, click **Add Plugin** and choose `dist/manifest.json`, then choose **Load** in the plugin's **•••** menu. The panel opens in Photoshop. Read [LICENSE-NOTES.md](LICENSE-NOTES.md) before you share a build.

## Build and test

```sh
npm ci --ignore-scripts
npm run build              # dist/, the zip and build/build-receipt.json
npm test                   # Node unit tests, no browser
node node_modules/playwright/cli.js install chromium
npm run test:uxp           # the plugin in Playwright's Chromium, in a stand-in for a Photoshop panel
npm run listing            # the icons and screenshots for the listing, in build/listing/
```

- `npm run build` copies the panel from `src/`, draws its icons, bundles `src/index.js` with esbuild into one classic script with the engine inlined, and adds the license files. It refuses a hidden file, a file the manifest or the page names but the plugin lacks, a `require` of anything but `photoshop` and `uxp`, a worker, and code built from text. The zip stores the files with one fixed date, so the same lockfile gives the same bytes on any machine.
- `npm test` checks the `TextDecoder` and `TextEncoder` stand-ins against Node's own on thousands of inputs, the pixel reading against a stand-in for Photoshop's Imaging API (bounds, the smaller size asked for above 4096 x 4096 pixels, the colour options, the modal scope, `dispose`), the manifest, the icons, the plugin checks and the zip, and that [LISTING.md](LISTING.md) keeps Adobe's character limits and names the zip just built. It then runs the built `index.js` in a plain JavaScript context with no `TextDecoder`, `TextEncoder`, `performance`, worker, `fetch` or `atob`, and asynchronous WebAssembly calls that throw, and reads the mixed test image in fast, frame and full, as pixels and as a file.
- `npm run test:uxp` serves the files of the zip to a page made to look like UXP the same way, with stand-ins for `require('photoshop')` and `require('uxp')` that hold test documents and answer the file dialog. It reads the mixed test document in the three profiles, a selection, a document larger than 4096 x 4096 pixels and an image file, refuses a file that is not an image, and shows the empty and error states and both themes. Every request must be a file of the plugin, and nothing may be left in storage. It writes the three reports under `build/acceptance/` for `scripts/destination-acceptance.py`, and two screenshots under `build/screenshots/`.

Photoshop itself is not part of these tests, and no hosted runner can run it. The `integration-photoshop-uxp` workflow runs them on every change to this folder; running the plugin in Photoshop with the UXP Developer Tool is the owner's step before submission, and the first proof that WebAssembly starts there.

## What Photoshop receives

The plugin is 13 files, about 3.1 MB: `manifest.json` (manifest version 5, Photoshop 25.0 or later, one panel), `index.html`, `styles.css`, four panel icons for light and dark themes, `index.js` with the engine's WebAssembly module as base64 (about 3.0 MB), and the license files with `NOTICE.md`. For the Creative Cloud Marketplace, the UXP Developer Tool's **Package** action turns this folder into a `.ccx` file, with the plugin ID that the Developer Distribution portal gives; [LISTING.md](LISTING.md) has the values, the media and the owner's steps.

A document larger than 4096 x 4096 pixels is asked from Photoshop at a smaller size, so the plugin never holds more than about 64 MB of pixels, and the panel says so; a small code in a large document reads better from a selection around it.

## Limits

- It reads PNG, JPEG, WebP and GIF files. Other files are refused with a message, and files larger than 32 MB too.
- The document is read as its merged visible layers, and a selection as its bounding rectangle. Areas above 4096 x 4096 pixels are read at a smaller size.
- A scan holds the panel until it ends, at most 20 seconds.
- The panel is in English.
- It has been tested in Playwright's Chromium with a stand-in for Photoshop, not yet in Photoshop.

## How it works

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-browser-dark.gif?v=32206e525b2c">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-browser-light.gif?v=248e5382e6cc" alt="How the browser package works, in three steps: install and initialize, pass an image or a camera frame to the engine in the page, and read the report" width="100%">
  </picture>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The picture shows the three steps of the browser package, and the plugin follows them. When the panel opens, it starts the engine from the module carried in `index.js`. When you scan, the panel asks Photoshop for the pixels of the document or the selection, or reads the file you chose, and hands them to the engine with the chosen profile. The report comes back as JSON, and the panel shows each code as text.

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

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. The plugin reads the same test image in its tests, as document pixels and as a file: the QR code gives `https://qrc-ai.com/76xMa` and the barcode gives `STOCK-4827`, in one report. The panel lists each code with its format and exact text; the full report also holds where the engine measured it.

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

The plugin uses the browser package. The Rust, Node.js, browser and Python packages hold the same engine. The Go and PHP packages hold no decoder: each one starts `qrscan` and hands you its report. Every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## For maintainers

The plugin follows Adobe's documentation as read on 21 November 2026:

- [Imaging API](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/media/imaging): `imaging.getPixels` with `sourceBounds`, `targetSize`, `colorSpace`, `colorProfile`, `componentSize` and `applyAlpha`, then `getData({ chunky: true })` and `dispose()`.
- [executeAsModal](https://github.com/adobedocs/uxp-photoshop/blob/main/src/pages/ps-reference/media/executeasmodal.md): the modal scope the Imaging API needs, with a `commandName`.
- [Selection](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/classes/selection): `bounds`, empty when nothing is selected (Photoshop 25.0 and later, hence the manifest's minimum version).
- [Manifest version 5](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp-guide/uxp-misc/manifest-v5/) and [plugin icons](https://github.com/adobedocs/uxp-photoshop/blob/main/src/pages/guides/uxp-guide/uxp-misc/plugin-icons/index.md): one panel entry point, `requiredPermissions`, icons per theme at 1x and 2x, entry point handlers that return within 300 ms (the engine starts after the panel shows).
- [UXP API reference](https://developer.adobe.com/uxp/uxp-api/), its [known issues](https://developer.adobe.com/uxp/uxp-api/known-issues), and the [Photoshop changelog](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/changelog/): what UXP provides to a panel script.
- The WebAssembly sources listed in [WebAssembly in Photoshop](#webassembly-in-photoshop).
- [Packaging](https://developer.adobe.com/uxp/guides/how-to/distribution/package/), [Developer Distribution](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/getting-started), [listing](https://developer.adobe.com/uxp/guides/how-to/distribution/listing/) and [review guidelines](https://developer.adobe.com/uxp/guides/how-to/distribution/review-guidelines/): the plugin ID, the `.ccx` and the values in [LISTING.md](LISTING.md).

The stand-ins in `test/uxp-panel.mjs` and `test/unit.test.mjs` provide the parts of Photoshop the panel calls (`app.activeDocument`, `core.executeAsModal`, `imaging.getPixels`, `entrypoints.setup` and `storage.localFileSystem.getFileForOpening`); when the panel calls more of Photoshop, add it there. A stand-in proves the panel's side of the contract, not Photoshop's.

## License of the plugin

The plugin's own source in this folder is under the MIT License, in [LICENSE](LICENSE). The built plugin also holds engine 0.11.0 under AGPL-3.0-or-later, so the plugin as a whole is distributed under AGPL-3.0-or-later; it holds no Adobe code. [LICENSE-NOTES.md](LICENSE-NOTES.md) lists every part.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
