# Canva listing kit

Everything the owner needs to create, list and submit the QR Code & Barcode Scanner app in the
Canva Developer Portal. Nothing here has been sent to Canva: creating the app, accepting Canva's
terms, uploading the file and submitting it are the owner's steps, in the order below.

Canva's pages behind these values, read on 21 November 2026:
[written content](https://www.canva.dev/docs/apps/app-listing-guidelines/written-content/),
[app icon](https://www.canva.dev/docs/apps/app-listing-guidelines/app-icon/),
[featured image](https://www.canva.dev/docs/apps/app-listing-guidelines/featured-image/),
[app support and links](https://www.canva.dev/docs/apps/app-listing-guidelines/app-urls/),
[submission checklist](https://www.canva.dev/docs/apps/submission-checklist/),
[submitting apps](https://www.canva.dev/docs/apps/submitting-apps/).

## Before anything: the license decision

`dist/app.js` combines engine 0.11.0 (AGPL-3.0-or-later) with Canva's packages, whose license
allows their use on the Canva Platform only. [LICENSE-NOTES.md](LICENSE-NOTES.md) explains why
this needs the owner's decision and the two routes that settle it. Do not upload the file before
that decision.

## The file to upload

| What | Value |
| --- | --- |
| File | `integrations/canva/dist/app.js`, from the `canva-app` artifact of the `integration-canva` workflow run on `main`, or from `npm ci --ignore-scripts && npm run build` in this folder |
| Size | 4,143,587 bytes; Canva's limit is 5 MB |
| SHA-256 | `242c16264ea9d8fb594dcafbab464f7f23cb6f2cd62c5b19a48cc42233e00757` |
| Engine inside | `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, module SHA-256 `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68` |
| Strings for translation | `integrations/canva/dist/messages_en.json`, 51 strings, SHA-256 `7f6b4db5b4fc0a8fb063f70722fa935e1e370ae8124d6a849f95ec05abf96577` |

The build gives the same bytes from the same lockfile; `build/build-receipt.json` of the run
records both hashes. Compare them with the file before uploading it.

## App settings

| Setting | Value | Why |
| --- | --- | --- |
| Audience | Public, for anyone on Canva | The app is for the Apps Marketplace |
| Intent | Design editor (`design_editor`), enrolled | The app opens as a panel beside the design |
| Permission | `canva:design:content:read`, mandatory | To read the original file of the image the user selects, through a temporary URL, so the engine can read the codes in it |
| Other permissions | None | The app does not change the design, upload assets or read anything else |
| Authentication | None | The app has no account, no login and no server |

The same intent and permission are in [canva-app.json](canva-app.json) for the Canva CLI.

## Listing text

**App name.** `QR Code & Barcode Scanner`, the product's public name. Canva advises names under 10
characters and says longer ones may not display in full; the owner decides whether to keep the
full name or choose a shorter one. The name must not contain "Canva".

**Short description** (one sentence, starts with a verb, no final punctuation):

> Read the QR codes and barcodes in an image of your design

**Description** (two or three sentences, plain text, no links):

> Select an image in your design and scan it to see each QR code and barcode it holds, with its format and its exact text. You can type the text you expect, and each code shows whether it matches, character for character. The open-source QR Code & Barcode Scanner engine by QR Code AI runs inside the app, so the image is not sent to any other service.

**Category.** The owner picks the closest one in the form's list.

## Media

Written by `npm run listing` after `npm run test:canva-csp`, into `build/listing/`, and kept in the
workflow's `canva-app` artifact.

| Field | File | Size |
| --- | --- | --- |
| App icon | `build/listing/icon-512.png` | 512 x 512, full bleed, opaque, square corners, no text |
| Featured image 1 | `build/listing/featured-1.png` | 2400 x 1800 (4:3): the mixed test image beside the panel, light theme |
| Featured image 2 | `build/listing/featured-2.png` | 2400 x 1800 (4:3): the same, dark theme |

The panel in the featured images is the built `dist/app.js`, captured in the test page that stands
in for Canva's panel.

## Links

| Field | Value |
| --- | --- |
| Terms and conditions URL | `https://qrcode-ai-com.github.io/terms/` (live after the owner's review) |
| Privacy policy URL | `https://qrcode-ai-com.github.io/privacy/` (live after the owner's review) |
| Support URL | `https://qrcode-ai-com.github.io/support/` (live after the owner's review) |
| Company website URL | `https://qrcode-ai.com/` |

Canva requires the four, reachable without an account. The three policy pages returned 404 on
21 November 2026: publish them before submitting.

## Privacy and data use answers

- **Data collected:** none. The app has no account, no analytics, no cookies and no storage.
- **Network:** the app downloads the original file of the selected image from the temporary URL
  that Canva gives it, and makes no other request. The test checks this.
- **Where the image goes:** nowhere. The engine reads it inside the app's panel, in the browser.
- **Decoded content:** shown as text in the panel. A decoded link is never opened; the only link
  the app opens is its source code repository, through Canva's `requestOpenExternalUrl`, after the
  user clicks it.

## Testing instructions for the reviewer

Paste into **Release > Testing instructions**:

> No account or login is needed. Add an image that holds a QR code or a barcode to a design, for example a QR code made with any QR code generator. Open the app, select the image, and click Scan selected image. The app lists each code with its format and exact text. Choose Fast, Frame or Full to change the scanning profile, and type the text you expect in Expected text to see Matches or Differs on each code. Select an image with no code to see the empty state.

## The owner's steps, in order

1. Take the license decision in [LICENSE-NOTES.md](LICENSE-NOTES.md), and update the notice if
   the first route is chosen.
2. Publish the terms, privacy and support pages listed above.
3. Sign in to the [Canva Developer Portal](https://www.canva.com/developers/apps) with the account that
   will own the app, and read the
   [Terms of Use](https://www.canva.com/policies/terms-of-use/) and the
   [Canva Developer Terms](https://www.canva.com/policies/canva-developer-terms/).
4. In **Your apps**, create an app for the public audience.
5. Set the intent and the permission of the table above.
6. Upload `dist/app.js` as the app's bundle, after checking its SHA-256.
7. Upload `dist/messages_en.json` where the portal takes the app's UI strings for translation.
8. Open the app in the editor from the portal's preview, select an image with a QR code and a
   barcode, and scan it in the light and the dark theme.
9. Fill **Release > App listing details** (details, media, links) with the values above.
10. Fill **Release > Testing instructions** with the text above.
11. In **Release > App status**, complete the developer verification if the portal asks for it,
    agree to the terms and conditions, and submit the app for review.
