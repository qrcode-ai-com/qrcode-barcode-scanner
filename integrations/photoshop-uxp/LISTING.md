# Creative Cloud Marketplace listing kit

Everything the owner needs to test, list and submit the QR Code & Barcode Scanner plugin for
Photoshop. Nothing here has been sent to Adobe: accepting Adobe's Developer Terms of Use, signing
in, running the plugin in Photoshop, creating the publisher profile and the listing, packaging the
`.ccx`, uploading it and submitting it are the owner's steps, in the order below.

Adobe's pages behind these values, read on 21 November 2026:
[Developer Distribution](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/getting-started),
[listing](https://developer.adobe.com/uxp/guides/how-to/distribution/listing/),
[packaging](https://developer.adobe.com/uxp/guides/how-to/distribution/package/),
[review guidelines](https://developer.adobe.com/uxp/guides/how-to/distribution/review-guidelines/).

## First, run it in Photoshop

No test has run this plugin in Photoshop: Adobe does not officially support WebAssembly in UXP,
and the plugin's route is the one of Adobe's own sample (see the README's
[WebAssembly in Photoshop](README.md#webassembly-in-photoshop)). Before anything is listed, load
`dist/` with the UXP Developer Tool in the current Photoshop on macOS arm64, open the mixed test
image (`fixtures/symbology/mixed-code128-qr.png` of this repository) as a document, and check that
Scan the document finds `https://qrc-ai.com/76xMa` and `STOCK-4827` in fast, frame and full, that
Scan the selection and Scan an image file work, and that the panel stays usable afterwards. If the
panel says the scanner could not start, stop: the next route is a WebView panel, not a listing.

## The plugin to package

| What | Value |
| --- | --- |
| Folder | `integrations/photoshop-uxp/dist/`, from the `photoshop-uxp-plugin` artifact of the `integration-photoshop-uxp` workflow run on `main`, or from `npm ci --ignore-scripts && npm run build` in this folder |
| Zip of the folder | `build/qrcode-barcode-scanner-photoshop-0.1.0.zip`, to compare a build with the workflow's; Adobe takes the `.ccx`, not this zip |
| Size | 3,057,794 bytes |
| SHA-256 | `7d845a2df8739005a887aa3fde9997159811217b1ec4642acf15ca4458425912` |
| Contents | 13 files, `manifest.json` first, the four panel icons in `icons/`; no hidden file |
| Engine inside | `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, module SHA-256 `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68` |
| Host | Photoshop 25.0 or later, manifest version 5 |
| License | AGPL-3.0-or-later as a whole, see [LICENSE-NOTES.md](LICENSE-NOTES.md) |

The ID in `src/manifest.json`, `qrcode-barcode-scanner`, is a placeholder for development. The
Marketplace takes a plugin only under the ID its Developer Distribution portal generates for the
listing. Put that ID in `src/manifest.json` in a pull request: the workflow then builds `dist/` with
it, and this table's size and SHA-256 change (the unit tests say so until they are updated). The
UXP Developer Tool's **Package** action makes the `.ccx` from that `dist/`.

## Listing details

| Field | Limit | Value |
| --- | --- | --- |
| Public plugin name | 45, required | `QR Code & Barcode Scanner` (25 characters, ASCII). Adobe's review guidelines forbid Adobe trademarks such as Photoshop in the name. |
| Subtitle | 30, required | `Read QR codes and barcodes` |
| Description | 5000, required | the text below |
| Categories | required | `Tools & Automation` |
| Tags | 300 | `QR code, barcode, scanner, QR code reader, barcode reader, Code 128, EAN-13, Data Matrix, packaging, print` |
| Support email | required | `contact@qrcode-ai.com`, the maintainer address of the repository's package recipes, if the owner confirms it |
| Help URL | | `https://qrcode-ai-com.github.io/support/` (live after the owner's review) |
| Privacy Policy URL | | `https://qrcode-ai-com.github.io/privacy/` (live after the owner's review) |
| Terms of Service URL | | `https://qrcode-ai-com.github.io/terms/` (live after the owner's review) |
| Purchase method | | Free |
| Version details | 1000, required | the text below |
| Supported languages | required | English |
| Note to Adobe reviewers | 1000, required | the text below |

The three pages on `qrcode-ai-com.github.io` returned 404 on 21 November 2026. Adobe's review
guidelines ask for privacy and terms URLs that open, and website and support links that open and
hold valid contact details, so publish them before submitting. The guidelines also ask that the
listing and its materials name no competing product: keep the support page, and any page it links
to for this plugin, free of other design tools' names. Adobe's Developer Terms of Use ask for an
end-user license agreement, which the terms page is.

**Description** (1,157 characters):

> Read every QR code and barcode in your Photoshop document, in a selection, or in an image file from your computer. The panel lists each code with its format, such as QR Code, Code 128, EAN-13 or Data Matrix, and its exact text. Invisible characters are shown by their code point, so you can see them. Type the text you expect, and each code shows whether it matches, character for character, before you send a file to print or publish it. The document is read as you see it, with every visible layer merged, and is never changed. Choose Full to read the most, Fast for clear images or Frame for the quickest scan. The open-source QR Code & Barcode Scanner engine by QR Code AI runs inside the panel, on your computer: your documents and files are not sent anywhere, no link is opened for you, and nothing is kept after you close the panel. The plugin asks for no network access; it only opens the file you choose. It reads 19 formats, among them QR Code, Micro QR Code, Data Matrix, Aztec, PDF417, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 and ITF. Large documents are read at up to 4096 x 4096 pixels; select an area to read a small code at full size.

**Version details** (version 0.1.0):

> First version. Scan the document, Scan the selection and Scan an image file read the QR codes and barcodes with the scanner engine 0.11.0, in the plugin's panel. Each code shows its format and exact text, and can be compared with the text you expect. Follows Photoshop's light and dark themes.

## Media

Written by `npm run listing` after `npm run test:uxp`, into `build/listing/`, and kept in the
workflow's `photoshop-uxp-plugin` artifact.

| Field | File | Size |
| --- | --- | --- |
| 48 x 48 icon, required | `build/listing/icon-48.png` | 48 x 48, opaque, no text |
| 96 x 96 icon, required | `build/listing/icon-96.png` | 96 x 96, the same art |
| 192 x 192 icon, required | `build/listing/icon-192.png` | 192 x 192, the same art |
| Screenshot, required | `build/listing/screenshot-1.png` | 1360 x 800: the mixed test document beside the panel, light theme |
| Additional screenshot | `build/listing/screenshot-2.png` | 1360 x 800: the same, dark theme |
| Publisher logo, first submission only | the owner's QR Code AI logo | 250 x 250 |

The panel in these screenshots is the built plugin in the test page that stands in for Photoshop.
Adobe asks for screenshots that represent the plugin accurately: once the owner has run it in
Photoshop, replace them with screenshots of Photoshop with the panel open on the test document, at
1360 x 800.

## Notes to Adobe reviewers

Paste into **Note to Adobe reviewers**:

> No account, login or license key is needed, and the plugin makes no network request. Open any document that holds a QR code or a barcode, for example one made with any QR code generator, then open QR Code & Barcode Scanner from the Plugins menu and click Scan the document: it lists each code with its format and exact text. Make a rectangular selection around one code and click Scan the selection to read only that area. Scan an image file opens a file dialog (the only permission the plugin requests) and reads a PNG, JPEG, WebP or GIF file. Choose Fast, Frame or Full to change the scanning profile, and type the text you expect in Expected text to see Matches or Differs on each code. A document with no code shows "No QR code or barcode found." The plugin reads pixels with the Imaging API inside executeAsModal and never changes the document. The open-source engine is a WebAssembly module inlined in index.js; its source is public.

## The owner's steps, in order

1. Accept Adobe's [Developer Terms of Use](https://www.adobe.com/go/developer-terms) with the
   Adobe ID that will own the plugin, and install the UXP Developer Tool from the Creative Cloud
   desktop app.
2. Run the plugin in Photoshop as described in [First, run it in Photoshop](#first-run-it-in-photoshop),
   and take the 1360 x 800 screenshots there.
3. Publish the help, privacy and terms pages listed above, and confirm the support address.
4. In the [Developer Distribution](https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/getting-started)
   portal, create the publisher profile on a first submission: the name QR Code AI, the 250 x 250
   logo, the website `https://qrcode-ai.com/`, and, to be listed in the European Union, the trader
   information Adobe asks for.
5. Create a new Photoshop plugin listing named as above. Copy the plugin ID it generates into
   `src/manifest.json` in a pull request, and wait for the `integration-photoshop-uxp` workflow to
   pass on `main`.
6. Download `dist/` from that run's `photoshop-uxp-plugin` artifact, check its zip against the
   run's `build/build-receipt.json`, add the folder in the UXP Developer Tool, load it once in
   Photoshop, then choose **Package** to write the `.ccx`.
7. In the listing, upload the `.ccx`, fill the listing details and media above, paste the note to
   reviewers, and submit for review.
