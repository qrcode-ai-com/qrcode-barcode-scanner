# Store listings · QR Code & Barcode Scanner 0.1.0

The texts every store shows. This file is the one copy of them: the build writes
`build/amo-metadata.json` for Firefox Add-ons from it, and `npm test` checks their lengths and
the six links. Each store's form, step by step, with its package and the owner's steps, is in its
own kit: [chrome-web-store.md](chrome-web-store.md), [edge-add-ons.md](edge-add-ons.md) and
[firefox-add-ons.md](firefox-add-ons.md).

Nothing here is submitted. Each store needs its owner's account, its own review, and a check of
the live listing once it is public.

## Shared texts

### Name

```text
QR Code & Barcode Scanner
```

### Short description

The manifest's description. The Chrome Web Store shows it as the summary, at most 132
characters. Edge shows it when its own short description is empty.

```text
Read QR codes and barcodes from images on web pages or on your computer. Decoding runs in your browser and no image is uploaded.
```

### Summary for Firefox Add-ons

At most 250 characters.

```text
Read QR codes and barcodes from images. Right-click an image on a page, or drop a file in the toolbar popup. Each code shows its format and exact text. Decoding runs in your browser, no image is uploaded, and a link is never opened for you.
```

### Long description

Plain text: the Chrome Web Store and Edge show it as written. Firefox Add-ons turns the
addresses into links.

```text
QR Code & Barcode Scanner reads the QR codes and barcodes in an image and shows each one as text.

Right-click an image on a web page and choose "Scan this image". Or open the toolbar popup, then drop, paste or choose an image file. Each code is listed with its format and its exact text, with a button to copy it. A decoded link is shown as text first and is never opened for you: read the address, then open it yourself if you want to.

Everything runs in your browser. The scanner engine is a WebAssembly module packaged inside the extension, and no image or result is sent anywhere. To read an image from a web page, the extension fetches that image again from its own site. When a site does not let other sites read its images, the scanner page offers an "Allow" button for that one site, and the browser asks you to confirm.

It reads QR Code, Micro QR Code, rMQR Code, Data Matrix, Aztec, PDF417, MaxiCode, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded and Telepen. Several codes in one image come back together. Three profiles trade speed for thoroughness: fast, frame and full.

The same engine runs on the web. Try the QR code scanner at https://qrcode-ai.com/en-US/qr-code-scanner and the barcode scanner at https://qrcode-ai.com/en-US/barcode-scanner. The QR code guide at https://qrcode-ai.com/en-US/qr-code-scanner/integrations/browser-extension and the barcode guide at https://qrcode-ai.com/en-US/barcode-scanner/integrations/browser-extension explain this extension. To make a test image, use the QR code generator at https://qrcode-ai.com/en-US/qr-code-generator or the barcode generator at https://qrcode-ai.com/en-US/barcode-generator.

The extension is open source: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/browser-extension. It is maintained by Thibaut Mélen and Nicolas Cella for QR Code AI, a product of SuperNovae Studio.
```

### Single purpose

```text
Read the QR codes and barcodes in an image the user chooses, and show their decoded text.
```

### Permission justifications

contextMenus:

```text
Adds "Scan this image" to the right-click menu of images, so the user can scan an image on a page.
```

activeTab:

```text
When the user chooses "Scan this image", the extension fetches that one image again from the page's own site to read its bytes. activeTab gives that access for the clicked tab only, at the moment of the click.
```

Optional host permissions (`https://*/*`, `http://*/*`):

```text
No site is granted at install. When the clicked image comes from another site that does not let other sites read it, the scanner page shows an "Allow" button for that one site. Only on that click does the extension ask the browser for that site (for example https://images.example.com/*), and it uses that access only to fetch the image the user clicked.
```

Remote code:

```text
No remote code. The scanner engine is a WebAssembly module packaged inside the extension and compiled under the policy script-src 'self' 'wasm-unsafe-eval'. Every script is a file of the package.
```

### Privacy

The extension's own privacy statement is [PRIVACY.md](PRIVACY.md). Where a form asks for a
privacy policy address, use the publisher's privacy page, `https://qrcode-ai-com.github.io/privacy/`.
That page and the terms and support pages below are planned on the organisation's GitHub Pages
site and are live only after the owner's review: open each one before pasting it into a form.
Until then, the public copy of PRIVACY.md is
`https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/browser-extension/listing/PRIVACY.md`.

### Addresses

- Website: `https://qrcode-ai.com/en-US/qr-code-scanner/integrations/browser-extension`
- Privacy policy: `https://qrcode-ai-com.github.io/privacy/` (live after the owner's review)
- Terms: `https://qrcode-ai-com.github.io/terms/` (live after the owner's review)
- Support: `https://qrcode-ai-com.github.io/support/` (live after the owner's review); issues
  also reach the maintainers at `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues`
- Source: `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/browser-extension`

### Images

- Store icon 128 × 128, artwork 96 × 96 inside a transparent margin of 16 px:
  `build/store-assets/icon-128.png`.
- Logo 300 × 300, for Edge: `build/store-assets/logo-300.png`.
- Four screenshots, 1280 × 800, full bleed, and two promotional tiles, 440 × 280 and
  1400 × 560: [images/](images/). `npm run store-images` captures them again from the real build
  in Playwright's Chromium; CI does so on every run.

## Chrome Web Store (map-49)

The account, the form values tab by tab, the images and the sources read are in
[chrome-web-store.md](chrome-web-store.md).

## Microsoft Edge Add-ons (map-50)

The account, the form values page by page, the search terms and the sources read are in
[edge-add-ons.md](edge-add-ons.md).

## Firefox Add-ons (map-51)

The account, the `web-ext sign` command, the Developer Hub fields, the source package, the
license and the sources read are in [firefox-add-ons.md](firefox-add-ons.md).

## Notes for reviewers

```text
QR Code & Barcode Scanner reads QR codes and barcodes from images, in the browser.

How to test: open the toolbar popup and choose a PNG or JPEG that holds a QR code or a barcode, or right-click an image on a web page and choose "Scan this image". Each code is listed with its format and its text. A decoded link is never opened automatically.

Permissions: contextMenus for the menu item; activeTab to fetch the clicked image from the page's own site. Host access is optional and requested for one site only, when the user clicks "Allow" for an image of another site that refuses cross-site reads.

Code: no remote code and no minified code. The extension's own files are written by hand. vendor/qrcode-barcode-scanner-wasm/ is copied unchanged from the npm package @qrcode-ai-com/qrcode-barcode-scanner-wasm 0.11.0: a WebAssembly module built from https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust at tag v0.11.0, and its generated wasm-bindgen glue. auto.js validates two small inline WebAssembly byte arrays to check browser support; they are validated, never run. The module is compiled in a worker under script-src 'self' 'wasm-unsafe-eval'. SOURCE.md in the source package gives the rebuild steps: npm ci --omit=dev --ignore-scripts, then npm run build-for-amo.
```
