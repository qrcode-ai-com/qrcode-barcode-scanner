# QR Code & Barcode Scanner · Canva app 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Canva%20app%200.1.0%20%28integrations%2Fcanva%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Canva%20app%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20of%20your%20design.%20Select%20an%20image%2C%20choose%20a%20profile%20and%20click%20Scan%20selected%20image%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20app%27s%20panel%2C%20in%20your%20browser%3A%20the%20image%20is%20not%20sent%20to%20any%20other%20service%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fcanva%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fcanva%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fcanva%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Canva%20app%200.1.0%20%28integrations%2Fcanva%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Canva%20app%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20of%20your%20design.%20Select%20an%20image%2C%20choose%20a%20profile%20and%20click%20Scan%20selected%20image%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20app%27s%20panel%2C%20in%20your%20browser%3A%20the%20image%20is%20not%20sent%20to%20any%20other%20service%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fcanva%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fcanva%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fcanva%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Canva%20app%200.1.0%20%28integrations%2Fcanva%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Canva%20app%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20of%20your%20design.%20Select%20an%20image%2C%20choose%20a%20profile%20and%20click%20Scan%20selected%20image%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20app%27s%20panel%2C%20in%20your%20browser%3A%20the%20image%20is%20not%20sent%20to%20any%20other%20service%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fcanva%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fcanva%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fcanva%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Canva%20app%200.1.0%20%28integrations%2Fcanva%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Canva%20app%20that%20reads%20the%20QR%20codes%20and%20barcodes%20in%20an%20image%20of%20your%20design.%20Select%20an%20image%2C%20choose%20a%20profile%20and%20click%20Scan%20selected%20image%3A%20the%20panel%20lists%20each%20code%20with%20its%20format%20and%20its%20exact%20text%2C%20and%20can%20compare%20it%20with%20the%20text%20you%20expect.%20The%20published%20WebAssembly%20engine%200.11.0%20runs%20inside%20the%20app%27s%20panel%2C%20in%20your%20browser%3A%20the%20image%20is%20not%20sent%20to%20any%20other%20service%2C%20and%20a%20decoded%20link%20is%20never%20opened%20for%20you.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fcanva%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fcanva%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fcanva%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · Canva app 0.1.0 (integrations/canva/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A Canva app that reads the QR codes and barcodes in an image of your design. Select an image, choose a profile and click Scan selected image: the panel lists each code with its format and its exact text, and can compare it with the text you expect. The published WebAssembly engine 0.11.0 runs inside the app's panel, in your browser: the image is not sent to any other service, and a decoded link is never opened for you. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/canva/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/canva https://qrcode-ai.com/en-US/barcode-scanner/integrations/canva https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A Canva app that reads the QR codes and barcodes in an image of your design. Select an image, choose a profile and click Scan selected image: the panel lists each code with its format and its exact text, and can compare it with the text you expect. The published WebAssembly engine 0.11.0 runs inside the app's panel, in your browser: the image is not sent to any other service, and a decoded link is never opened for you.

Version 0.1.0 is built and tested in this folder, but it is not on the Canva Apps Marketplace yet. Until Canva lists it, you can run it from a build of this folder in your own Canva developer app, as shown below.

The same engine runs on the web as the [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) of QR Code AI. The [QR code scanner Canva guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/canva) and the [barcode scanner Canva guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/canva) explain this app for each use. If a page is unavailable, this README and the listing kit in [LISTING.md](LISTING.md) remain the reference.

To make a test image with a known value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Place it in a design, keep the text you encoded, then type it in Expected text: each code shows Matches or Differs, character for character, leading zeroes included.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/canva/media/featured-dark.png">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/canva/media/featured-light.png" alt="An image with a Code 128 barcode and a QR code beside the app's panel: the panel found two codes, STOCK-4827 marked Matches and https://qrc-ai.com/76xMa marked Differs from the expected text" width="100%">
  </picture>
</p>

The picture is the built app in its test page, which stands in for Canva's side panel, after it read the mixed test image in the full profile with `STOCK-4827` as the expected text.

## Use

1. In the Canva editor, open the app from the Apps panel.
2. Select an image in your design. The panel says how many images are selected; it reads the first five.
3. Choose a profile. **Full** reads the most and also scores QR codes, **Fast** suits clear images and **Frame** is the quickest.
4. Optionally type the text you expect in **Expected text**.
5. Click **Scan selected image**. Each code appears with its format (QR Code, Code 128 and so on), its kind (link, text, Wi-Fi network and others) and its exact text. Invisible characters are shown by their code point, such as `⟨U+200B⟩`.
6. **Show the full report** shows the engine's JSON report for the first image, with where each code was measured.

The app reads the original file of the image you placed, at full size. Cropping, filters and anything layered over the image on the page are not applied, so a code hidden by a crop is still read, and a code drawn over the image is not.

## Permissions, and why

The app asks for one permission, `canva:design:content:read`. It lets the app read the selection and ask Canva for a temporary URL of the selected image's original file. The app does not ask to change the design, to upload assets or for any account: there is no login and no server. The intent is the design editor, so the app opens as a panel beside the design. Both are declared in [canva-app.json](canva-app.json).

## Privacy

The only network request the app makes is to download the selected image from the temporary URL Canva gives it. The engine reads the image in the panel, in the browser. The app has no analytics, no cookies and no storage, and keeps nothing after you close it. The decoded text is shown as text; the only link the app opens is its source code, through Canva, when you click it.

## Try it from a build

You need Node.js 22.19 or later on the 22 line, or Node.js 24 or later, and a Canva account with access to the [Canva Developer Portal](https://www.canva.com/developers/apps). From a checkout of this repository:

```sh
cd integrations/canva
npm ci --ignore-scripts
npm run build
```

The build checks that the installed scanner package is version 0.11.0 and that its WebAssembly module has the pinned SHA-256, then writes `dist/app.js`, `dist/messages_en.json` and `build/build-receipt.json`.

In the Developer Portal, create an app for yourself, enrol it in the design editor intent, give it the `canva:design:content:read` permission, upload `dist/app.js` as its bundle, then preview it in the editor. A preview app is visible to your account only. Read [LICENSE-NOTES.md](LICENSE-NOTES.md) before you pass the built file to anyone else.

## Build and test

```sh
npm ci --ignore-scripts
npm run build              # dist/app.js, dist/messages_en.json and build/build-receipt.json
npm test                   # Node unit tests, no browser
node node_modules/playwright/cli.js install chromium
npm run test:canva-csp     # dist/app.js in Playwright's Chromium under Canva's policy
npm run listing            # the icon and featured images for the listing, in build/listing/
```

- `npm run build` bundles the app into one JavaScript file with esbuild, as Canva requires, with the engine inlined by [integrations/wasm-inline](../wasm-inline/README.md). It fails if the file is larger than 5,000,000 bytes, and it extracts the panel's 51 strings for Canva's translation with their descriptions. The same lockfile gives the same bytes.
- `npm test` drives the scanner with fake Canva functions and the real engine: it reads the mixed test image in fast, frame and full, reads at most five images, keeps going past one that fails, and states an engine that cannot start. It also checks the manifest, the size of the file, the engine module inside it, the license texts at its end and the strings.
- `npm run test:canva-csp` serves the built file in a test page under Canva's content security policy, word for word, with a fake of the parts of Canva's SDK the app's packages read. It reads the mixed test image in the three profiles, checks the link and source buttons, the empty and error states and both themes, and that every request is the page, the app or the temporary URL. A control run without `'wasm-unsafe-eval'` must fail to start the engine, which shows the policy is enforced. It writes the three reports under `build/acceptance/` for `scripts/destination-acceptance.py`, and two screenshots under `build/screenshots/`.

Canva itself is not part of these tests. The `integration-canva` workflow runs them on every change to this folder; running the file in the Canva editor is the owner's step before submission.

## What Canva receives

Canva takes one JavaScript file of at most 5 MB, with no code splitting. `dist/app.js` holds the app, React, Canva's App UI Kit and SDK packages, the engine's WebAssembly module as base64, and at its end the license text of every package in it. It is about 4.1 MB, of which the engine is about 3.0 MB.

Canva's policy for apps allows WebAssembly (`'wasm-unsafe-eval'`) but no worker (`worker-src 'none'`), so the engine runs on the panel's own thread. A scan holds the panel until it ends, and each scan stops at 20 seconds and says so. The listing values, the media and the owner's steps are in [LISTING.md](LISTING.md).

## Limits

- It reads PNG, JPEG, WebP and GIF images. SVG, HEIC, AVIF and TIFF images are refused with a message.
- Images larger than 32 MB are refused. The first five selected images are read.
- It reads the original image file, not the image as cropped or edited on the page, and not a video or a whole page.
- It has been tested in Playwright's Chromium under Canva's policy, not yet in the Canva editor.

## How it works

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-browser-dark.gif?v=32206e525b2c">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-browser-light.gif?v=248e5382e6cc" alt="How the browser package works, in three steps: install and initialize, pass an image or a camera frame to the engine in the page, and read the report" width="100%">
  </picture>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The picture shows the three steps of the browser package, and the app follows them. When the panel opens, the app compiles the WebAssembly module carried in its file. When you scan, it asks Canva for a temporary URL of the selected image, downloads the original file, and hands its bytes to the engine with the chosen profile. The report comes back as JSON, and the panel shows each code as text.

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

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. The app reads the same test image in its tests: the QR code gives `https://qrc-ai.com/76xMa` and the barcode gives `STOCK-4827`, in one report. The panel lists each code with its format and exact text; the full report also holds where the engine measured it.

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

The app uses the browser package. The Rust, Node.js, browser and Python packages hold the same engine. The Go and PHP packages hold no decoder: each one starts `qrscan` and hands you its report. Every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## For maintainers

The app follows Canva's documentation as read on 21 November 2026:

- [Content security policy](https://www.canva.dev/docs/apps/content-security-policy/): the policy the test serves, word for word.
- [Bundling apps](https://www.canva.dev/docs/apps/bundling-apps/): one file, 5 MB, no code splitting.
- [Selection](https://www.canva.dev/docs/apps/selection/) and [registerOnChange](https://www.canva.dev/docs/apps/api/latest/design-selection-register-on-change): the image selection and its draft.
- [Design editor intent](https://www.canva.dev/docs/apps/intents/design-editor/implementation-guide): `prepareDesignEditor` and `render`.
- [Permissions](https://www.canva.dev/docs/apps/configuring-permissions): `canva:design:content:read`.
- [App UI Kit](https://www.canva.dev/docs/apps/app-ui-kit/quickstart) and [accessibility](https://www.canva.dev/docs/apps/design-guidelines/accessibility): the panel's components and both themes.
- [Localization](https://www.canva.dev/docs/apps/localization/recommended-workflow): the strings with descriptions, extracted with FormatJS.
- [Testing](https://www.canva.dev/docs/apps/testing/) and the [unit test example](https://www.canva.dev/docs/apps/examples/unit-test).
- [Submission checklist](https://www.canva.dev/docs/apps/submission-checklist/), [app listing guidelines](https://www.canva.dev/docs/apps/app-listing-guidelines/written-content/), [app icon](https://www.canva.dev/docs/apps/app-listing-guidelines/app-icon/), [featured image](https://www.canva.dev/docs/apps/app-listing-guidelines/featured-image/), [app links](https://www.canva.dev/docs/apps/app-listing-guidelines/app-urls/) and [submitting apps](https://www.canva.dev/docs/apps/submitting-apps/): the values in [LISTING.md](LISTING.md).

Canva's packages are pinned to exact versions. When one changes, rebuild, run both tests, and check that the fake host in `test/canva-csp.mjs` still provides every `canva_sdk` path the new packages read: they read them when they load, so a missing one fails at once.

## License of the app file

The app's own source in this folder is under the MIT License, in [LICENSE](LICENSE). The built `dist/app.js` also holds engine 0.11.0 under AGPL-3.0-or-later and Canva's packages under Canva's license, which allows their use on the Canva Platform only. [LICENSE-NOTES.md](LICENSE-NOTES.md) lists every part and the decision the owner takes before the file is submitted.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
