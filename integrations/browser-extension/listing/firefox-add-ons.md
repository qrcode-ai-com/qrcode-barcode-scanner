# Firefox Add-ons · QR Code & Barcode Scanner 0.1.0

Everything addons.mozilla.org (AMO) asks for, ready to paste or to send with `web-ext sign`.
Nothing here has been submitted: the account, the agreement, the API keys, the upload and the
submission belong to the owner.

The store rules below were read on the linked pages on 21 November 2026 (see
[Sources](#sources)). A new Developer Hub rolls out in December 2026 and a policy update takes
effect on 1 December 2026: open each page again before submitting.

## The packages

| What | Value |
|---|---|
| Add-on | `build/qrcode-barcode-scanner-firefox-0.1.0.zip` |
| SHA-256 | `b7f58e3d17e92143f0557b7f7affff4640c6f58a8b73be033e56e3fb9b9f60d2` |
| Source package | `build/qrcode-barcode-scanner-source-0.1.0.zip` |
| SHA-256 | `daab04820df331bafa63fa88dda27279c6eb7b88321f771c678a5a442e76bda2` |
| Listing metadata | `build/amo-metadata.json`, written by the build from [texts.md](texts.md) |
| Made by | `npm ci && npm run build` in this folder, or the `browser-extension` artifact of the `integration-browser-extension` workflow |
| Checked by | `npm run check:pins` (same bytes as [SHA256SUMS](../SHA256SUMS)), `npm run inspect`, `npm run lint:firefox` (no error, warning or notice), `npm run test:firefox-addon` (the zip installed in release Firefox), `npm run test:reproduce` (the source package rebuilds every archive) |
| Manifest | Manifest V3, version 0.1.0, add-on ID `qrcode-barcode-scanner@qrcode-ai.com`, `strict_min_version` 142.0, `data_collection_permissions` `{"required": ["none"]}`, permissions `contextMenus` and `activeTab`, optional host permissions `https://*/*` and `http://*/*` |

Rebuilding on any system with Node.js 22 or 24 gives the same bytes. If a hash differs, do not
upload: rebuild from a clean checkout of `main`.

**Minimum version.** Desktop Firefox reads `data_collection_permissions` from 140 and Firefox
for Android from 142; with 142 the linter reports nothing. The current releases are Firefox 160
and ESR 153. Without a `gecko_android` key, the add-on is offered on desktop only.

## Before the first upload (the owner)

1. **A Mozilla account** with two-factor authentication on: AMO's Developer Hub requires it.
2. **The Firefox Add-on Distribution Agreement and the add-on policies**, accepted at the first
   submission. There is no fee.
3. **For the command line only:** an API key and secret (the JWT issuer and secret) generated
   in the Developer Hub. They stay in the owner's shell or keychain, never in a file of this
   repository.

No environment, tag rule or stored secret is needed: no workflow in this repository uploads to
AMO.

## Submit from the command line

From this folder, after `npm ci && npm run build`:

```sh
node_modules/.bin/web-ext sign --source-dir build/firefox --channel listed \
  --amo-metadata build/amo-metadata.json \
  --upload-source-code build/qrcode-barcode-scanner-source-0.1.0.zip \
  --api-key "$AMO_JWT_ISSUER" --api-secret "$AMO_JWT_SECRET"
```

`--channel listed` is required and lists the add-on on AMO. The metadata file is required for
the first listed version and carries the name, summary, description, category, homepage, support
address, the reviewer notes and the license. With the API, AMO does not ask for the second
factor. web-ext packs `build/firefox` itself; its zip holds the same files as the store zip above.

## Or submit in the Developer Hub

Submit a New Add-on, **On this site**, then upload
`build/qrcode-barcode-scanner-firefox-0.1.0.zip`. The field names below are those of the current
Developer Hub; the new one may word them differently. Then:

| Question or field | Value |
|---|---|
| Do you need to submit source code? | **Yes**: the package holds generated code, the WebAssembly module and its wasm-bindgen glue. Upload `build/qrcode-barcode-scanner-source-0.1.0.zip`. |
| Name | `QR Code & Barcode Scanner` (from the manifest) |
| Add-on URL | `qrcode-barcode-scanner` if free |
| Summary | The summary for Firefox Add-ons in [texts.md](texts.md#summary-for-firefox-add-ons) (at most 250 characters) |
| Description | The long description in [texts.md](texts.md#long-description) |
| Categories | **Photos, Music & Videos** (`photos-music-videos`). AMO allows two; no second one fits. |
| Support email | Empty |
| Support website | `https://qrcode-ai-com.github.io/support/` (live after the owner's review); until then `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues` |
| Homepage | `https://qrcode-ai.com/en-US/qr-code-scanner/integrations/browser-extension` |
| License | **Custom**, with the name and text of `version.custom_license` in `build/amo-metadata.json` |
| Privacy policy | Not required: AMO asks for one "if any data is being transmitted from the user's device", and none is. To show one anyway, paste [PRIVACY.md](PRIVACY.md). |
| Notes to reviewer | The notes for reviewers in [texts.md](texts.md#notes-for-reviewers) |

**License.** AMO's list has `AGPL-3.0-only` but not `AGPL-3.0-or-later`, the license of the
bundled engine 0.11.0, and the extension's own files are MIT. Either preset would misstate the
package, so the license is custom and states both parts.

**Images.** AMO shows the manifest's icon unless another is uploaded. Screenshots: the four
`listing/images/screenshot-*-1280x800.png` files (AMO recommends 1280 × 800), added on the
listing's edit page after the first upload.

## Review

Signing "can take up to 24 hours", and a human review can follow "at any time after
submission". The reviewer reads [SOURCE.md](../SOURCE.md) in the source package: it rebuilds
every archive with `npm ci --omit=dev --ignore-scripts` and `npm run build-for-amo`, and gives
the steps to rebuild the WebAssembly module from its Rust source at tag v0.11.0. The repository's
CI runs those steps on every change (job `wasm-rebuild`) and requires the module's pinned
SHA-256.

**Known risk.** The policy refuses "build tools or environments that no longer appear to be
supported by their maintainers", and a reviewer rejected another add-on in September 2026 over
its wasm-pack and Rust versions. The module was built with Rust 1.99.1, wasm-pack 0.13.1 and
Binaryen 130; wasm-pack has newer releases (0.15.1). The add-on itself takes the module
unchanged from the official npm package, through npm, as the policy allows for dependencies. If
a reviewer asks for newer tools, that is an engine release, not a change to this folder.

**Policy update of 1 December 2026.** The preview keeps the source code rules above. For an
add-on that needs Firefox 140 or later and uses Firefox's built-in consent, the manifest "must
accurately state the data collection practices ... including when it does not collect data":
`required: ["none"]` does so. The extension fetches only the image the user clicked, from the
address the page already used, and sends nothing to the publisher or anyone else.

Once listed, the address is `https://addons.mozilla.org/firefox/addon/<slug>/`. Add it to the
extension README's Install section then, not before.

## Sources

All read on 21 November 2026.

- Built-in data collection consent, `data_collection_permissions`, versions 140 and 142:
  <https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/>,
  <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings>
- Current releases: <https://product-details.mozilla.org/1.0/firefox_versions.json>
- Add-on policies, source code (section 3.1):
  <https://extensionworkshop.com/documentation/publish/add-on-policies/>
- Policy update of 1 December 2026:
  <https://extensionworkshop.com/documentation/publish/add-on-policies-preview-2026-12/>
- Source code submission:
  <https://extensionworkshop.com/documentation/publish/source-code-submission/>
- Rejection over wasm-pack and Rust versions:
  <https://discourse.mozilla.org/t/i-have-no-understanding-of-what-is-going-on/149581>
- Submission and privacy policy:
  <https://extensionworkshop.com/documentation/publish/submitting-an-add-on/>
- Listing fields and two categories:
  <https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/>
- Categories: <https://addons.mozilla.org/api/v5/addons/categories/>
- Licenses and custom license:
  <https://mozilla.github.io/addons-server/topics/api/licenses.html>,
  <https://mozilla.github.io/addons-server/topics/api/addons.html>
- Signing times: <https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/>
- Two-factor authentication:
  <https://blog.mozilla.org/addons/2021/03/11/two-factor-authentication-required-for-extension-developers/>
- New Developer Hub:
  <https://blog.mozilla.org/addons/2026/11/20/unveiling-the-all-new-firefox-add-on-developer-hub/>
- `web-ext sign` options:
  <https://extensionworkshop.com/documentation/develop/web-ext-command-reference/>
- wasm-pack releases: <https://github.com/wasm-bindgen/wasm-pack/releases>
