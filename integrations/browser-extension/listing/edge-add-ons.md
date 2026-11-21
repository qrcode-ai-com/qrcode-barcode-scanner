# Microsoft Edge Add-ons · QR Code & Barcode Scanner 0.1.0

Everything the Partner Center form asks for, ready to paste. Nothing here has been submitted:
the account, the agreement, the upload and the publish button belong to the owner.

The store rules below were read on the linked pages on 21 November 2026 (see
[Sources](#sources)). Open each page again before submitting; Partner Center changes its forms
without notice.

## The package

| What | Value |
|---|---|
| File | `build/qrcode-barcode-scanner-edge-0.1.0.zip` |
| SHA-256 | `6b9f3e52ca4d567582192c2b118555d31e9d69cb02849fc57cc4c0dcfc94a614` |
| Made by | `npm ci && npm run build` in this folder, or the `browser-extension` artifact of the `integration-browser-extension` workflow |
| Checked by | `npm run check:pins` (same bytes as [SHA256SUMS](../SHA256SUMS)), `npm run inspect`, and `node test/chromium.mjs --package` on that zip, in Playwright's Chromium and with `--channel msedge` in Microsoft Edge |
| Manifest | Manifest V3, version 0.1.0, permissions `contextMenus` and `activeTab`, optional host permissions `https://*/*` and `http://*/*`; no `update_url`, and neither the name nor the description names another browser (`npm run inspect` checks both) |

Rebuilding on any system with Node.js 22 or 24 gives the same bytes. If the hash differs, do
not upload: rebuild from a clean checkout of `main`.

The Edge zip differs from the Chrome zip only in its manifest. Upload the Edge zip here, not the
Chrome one.

## Before the first upload (the owner)

1. **A personal Microsoft account** (MSA). Partner Center does not take a work or school account
   for this program.
2. **Enroll in the Microsoft Edge program** in [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
   There is no registration fee.
3. **Account type.** An individual account checks that the publisher display name is free. A
   company account adds a verification of the company that takes "a few days to a few weeks",
   with an approver and possibly phone calls. The publisher display name is at most 50
   characters; `QR Code AI` fits.

No token, environment or tag is needed: no workflow in this repository uploads to Edge Add-ons.

## Upload

Partner Center, Microsoft Edge, **Create new extension**, then drop
`qrcode-barcode-scanner-edge-0.1.0.zip`. The pages on the left then follow in this order:
Availability, Properties, Privacy and Store listings; **Save & Continue** moves to the next.

## Availability

Visibility **Public**, markets **all** (the default, which includes markets added later).

## Properties

| Field | Value |
|---|---|
| Category | Required. The list appears only in the form; no public page gives it. Choose **Productivity** if offered, otherwise the closest to reading images. |
| Website | `https://qrcode-ai.com/en-US/qr-code-scanner/integrations/browser-extension` (a page of the publisher's own site, as the form asks) |
| Support contact detail | `https://qrcode-ai-com.github.io/support/` (live after the owner's review); until then `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues` |
| Mature content | Unticked |

## Privacy

The same five sections as the Chrome Web Store's privacy tab, with the same answers.

**Single Purpose Description**

```text
Read the QR codes and barcodes in an image the user chooses, and show their decoded text.
```

**Permission justification.** Paste each text from
[texts.md](texts.md#permission-justifications) into the box of the same permission:
`contextMenus`, `activeTab`, and the host permissions `https://*/*` and `http://*/*`.

**Are you using remote code?** "No, I am not using remote code". Edge does not allow remote
code in Manifest V3 at all.

**Data usage.** Under "What user data do you plan to collect from users now or in the future?",
tick the type that covers the content of web pages, if the form has one: the image the user
clicks is read inside the browser, and nothing is sent anywhere. Tick no other type. Under "I
certify that the following disclosures are true", tick every certification. The answers must
agree with the privacy policy below, which says the same.

**Privacy Policy URL.** `https://qrcode-ai-com.github.io/privacy/` (live after the owner's
review). Until it is live, the public copy of [PRIVACY.md](PRIVACY.md):
`https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/browser-extension/listing/PRIVACY.md`.
The page must open when the form is saved. The policy names no browser, which keeps to the rule
that a policy "should primarily refer to the Microsoft Edge browser".

## Store listings (English)

| Field | Value |
|---|---|
| Description | The long description in [texts.md](texts.md#long-description). Edge asks for 250 to 10,000 characters; `npm test` checks the range. It names no browser. Do not use **Generate with AI**: the written text is the one the other stores show. |
| Short description | Taken from the manifest's description (the short description in [texts.md](texts.md#short-description)) |
| Extension logo | `build/store-assets/logo-300.png`, 300 × 300, the recommended size (minimum 128 × 128, 1:1) |
| Small promotional tile | `listing/images/promo-small-440x280.png` (optional) |
| Large promotional tile | `listing/images/promo-marquee-1400x560.png` (optional) |
| Screenshots | The four `listing/images/screenshot-*-1280x800.png` files, in order (optional, at most 6, 640 × 480 or 1280 × 800). They show a neutral window, no browser's frame. |
| YouTube video | Empty |
| Search terms | The line below: 7 terms, each under 30 characters, 11 words (limits: 7 terms, 30 characters each, 21 words) |

```text
QR code; barcode; scanner; QR reader; barcode reader; Data Matrix; EAN
```

**Save draft**. The language row then reads Complete and the **Publish** button turns active.

## Submit

**Publish** opens the "Submit your extension" page. In **Notes for certification**, paste the
notes for reviewers from [texts.md](texts.md#notes-for-reviewers); no test account is needed.
Then **Publish** again. Certification "can take up to seven business days", after which the
status reads In the Store.

Once published, the listing address is
`https://microsoftedge.microsoft.com/addons/detail/<extension id>`. Add it to the extension
README's Install section then, not before.

## Sources

All read on 21 November 2026.

- Developer account, no fee, account types:
  <https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account>
- Submission pages (Availability, Properties, Privacy, Store listings, Submit), field sizes,
  search terms, certification time (page updated 2 September 2026):
  <https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension>
- Porting from Chrome (no `update_url`, no other browser's name):
  <https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension>
- Program policies (no reference to other browsers, privacy policy, no obfuscated code, at most
  seven search terms):
  <https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies>
