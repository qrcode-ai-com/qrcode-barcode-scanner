# Adobe Express listing kit

Everything the owner needs to test, list and submit the QR Code & Barcode Scanner add-on in Adobe
Express. Nothing here has been sent to Adobe: signing in, turning on add-on development, accepting
Adobe's terms, creating the publisher profile, uploading the package and submitting it are the
owner's steps, in the order below.

Adobe's pages behind these values, read on 21 November 2026:
[public listing](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/public-dist),
[private link](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/private-dist),
[listing guidelines](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/guidelines/general/listing),
[review process](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/review-process).

## The package to upload

| What | Value |
| --- | --- |
| File | `integrations/adobe-express/build/qrcode-barcode-scanner-adobe-express-0.1.0.zip`, from the `adobe-express-add-on` artifact of the `integration-adobe-express` workflow run on `main`, or from `npm ci --ignore-scripts && npm run build` in this folder |
| Size | 3,050,268 bytes; Adobe's limit is 50 MB |
| SHA-256 | `83e21fb2504518465a917483ef6a24b130d3591cd2798f1f392926ad62e0a0e8` |
| Contents | 12 files at the root, `manifest.json` first; no hidden file; relative paths only |
| Engine inside | `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, module SHA-256 `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68` |
| License | AGPL-3.0-or-later as a whole, see [LICENSE-NOTES.md](LICENSE-NOTES.md) |

The build stores the files uncompressed with one fixed date, so the same lockfile gives the same
bytes on any machine; `build/build-receipt.json` of the run records the hash of the zip and of each
file. Compare it with the file before uploading it.

## Listing details

| Field | Limit | Value |
| --- | --- | --- |
| Add-on name | 25, required, unique | `QR Code & Barcode Scanner` (25 characters). If Adobe says the name is taken, the owner chooses another; it must not contain an Adobe product name. |
| Summary | 50, required | `Read the QR codes and barcodes on your pages` |
| Full description | 1000, required | the text below |
| Help URL | required | `https://qrcode-ai-com.github.io/support/` (live after the owner's review) |
| Support email address | required, not shown to users | `contact@qrcode-ai.com`, the maintainer address of the repository's package recipes, if the owner confirms it |
| Privacy notice | optional | `https://qrcode-ai-com.github.io/privacy/` (live after the owner's review) |
| End User License Agreement | optional | `https://qrcode-ai-com.github.io/terms/` (live after the owner's review) |
| Keywords | 100, comma-separated | `QR code, barcode, scanner, QR code reader, barcode reader, Code 128, EAN-13, Data Matrix` |
| Release notes | 1000 | the text below |
| Supported languages | | English |

The three pages on `qrcode-ai-com.github.io` returned 404 on 21 November 2026: publish them before
submitting. Adobe asks for a help page that explains the add-on's use; the support page should link
to this README.

**Full description** (892 characters):

> Read every QR code and barcode on a page of your design, on every page of your document, or in an image file from your computer. The panel lists each code with its format, such as QR Code, Code 128, EAN-13 or Data Matrix, and its exact text. Invisible characters are shown by their code point, so you can see them. Type the text you expect, and each code shows whether it matches, character for character, before you print or publish. Choose Full to read the most, Fast for clear images or Frame for the quickest scan. The open-source QR Code & Barcode Scanner engine by QR Code AI runs inside the add-on, in your browser: your pages and files are not sent to any other service, no link is opened for you, and nothing is kept after you close the panel. It reads 19 formats, among them QR Code, Micro QR Code, Data Matrix, Aztec, PDF417, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 and ITF.

**Release notes** (version 0.1.0):

> First version. Scan this page, Scan all pages (the first 20) and Scan an image file read the QR codes and barcodes with the scanner engine 0.11.0, in the add-on's panel. Each code shows its format and exact text, and can be compared with the text you expect. Light and dark themes.

## Media

Written by `npm run listing` after `npm run test:express`, into `build/listing/`, and kept in the
workflow's `adobe-express-add-on` artifact.

| Field | File | Size |
| --- | --- | --- |
| Icon, required | `build/listing/icon-144.png` | 144 x 144, opaque, no text; Adobe derives the 36, 64 and 144 pixel icons from it |
| Screenshot 1, required | `build/listing/screenshot-1.png` | 1360 x 800: the mixed test page beside the panel, light theme |
| Screenshot 2 | `build/listing/screenshot-2.png` | 1360 x 800: the same, dark theme |
| Publisher logo, first submission only | the owner's QR Code AI logo | 250 x 250 |

The panel in the screenshots is the built package, captured in the test page that stands in for
the add-on panel of Adobe Express. Once the owner has run the add-on in Adobe Express through a
private link, a screenshot taken there can replace or join them.

## Other answers in the form

- **AI usage:** the add-on uses no generative AI. The engine decodes codes with fixed algorithms;
  it creates no content.
- **Monetization:** Free. No payment, no upgrade, no account.
- **Data:** the add-on collects nothing. It has no account, no analytics, no cookies and no
  storage. It loads the Adobe Express add-on SDK and its own files, and makes no other request;
  the page renditions and chosen files are read in the browser and never uploaded.
- **Preview renditions:** the add-on asks for renditions with the preview intent and declares
  `renditionPreview` in its manifest. The images are only read by the scanner: never shown for
  download, never kept.

## Notes to the reviewer

Paste into **Notes to reviewer**:

> No account or login is needed. Add a QR code or a barcode to a page, for example one made with any QR code generator. Open the add-on and click Scan this page: it lists each code with its format and exact text. Scan all pages reads every page of the document, and Scan an image file reads a PNG, JPEG, WebP or GIF file from your computer. Choose Fast, Frame or Full to change the scanning profile, and type the text you expect in Expected text to see Matches or Differs on each code. A page with no code shows "No QR code or barcode found." The add-on uses preview renditions only to read the page; it offers no download.

## The owner's steps, in order

1. Publish the help, privacy and terms pages listed above, and confirm the support address.
2. Sign in to [Adobe Express](https://express.adobe.com/) with the account that will own the
   add-on, and turn on add-on development in its settings, as Adobe's
   [getting started guide](https://developer.adobe.com/express/add-ons/docs/guides/getting-started/hello-world)
   shows.
3. From the home page, open **Add-ons** in the left-hand navigation and create a listing named as
   above.
4. In its **Private link** tab, upload the zip after checking its SHA-256, add the icon, and open
   the private link. Scan a page that holds a QR code and a barcode in the light and the dark theme,
   then Scan all pages and Scan an image file.
5. In its **Public listing** tab, fill the listing details, media and other answers above, and
   upload the same zip.
6. On a first submission, create the publisher profile: the name QR Code AI, its description,
   the 250 x 250 logo, the website `https://qrcode-ai.com/`, and, to be listed in the European
   Union, the trader details Adobe asks for (business email, telephone, address).
7. Paste the notes to the reviewer and click **Submit for review**.
