# Safari · QR Code & Barcode Scanner 0.1.0

What is ready for Safari on macOS, what CI proves, and what only the owner can do. Safari
extensions ship inside an app; this one is a macOS app, with no iOS target. This folder
prepares everything up to signing: the Apple Developer Program, the signing identity, App
Store Connect and the upload belong to the owner.

The Apple pages below were read on 21 November 2026 (see [Sources](#sources)).

## The package

| What | Value |
|---|---|
| Extension | `build/qrcode-barcode-scanner-safari-0.1.0.zip`, and the same files unpacked in `build/safari/` |
| SHA-256 | `94663d26bf7b92b1252239714516a60361e3d39453d98a1641cdf363d7cb463f` |
| Made by | `npm ci && npm run build` in this folder, or the `browser-extension` artifact of the `integration-browser-extension` workflow |
| Manifest | Manifest V3, version 0.1.0, background service worker, permissions `contextMenus` and `activeTab`, optional host permissions `https://*/*` and `http://*/*`, `browser_specific_settings.safari.strict_min_version` 26.0 |
| App, unsigned | `qrcode-barcode-scanner-safari-macos-unsigned.zip` in the `browser-extension-safari` artifact of each CI run (not pinned: Xcode writes it) |
| System | macOS 14 Sonoma or later, the first with Safari 26 |

**Why Safari 26.0.** The extension compiles its WebAssembly module under the policy
`script-src 'self' 'wasm-unsafe-eval'`, and Safari reads `'wasm-unsafe-eval'` in an extension's
policy from 26.0. An older Safari would load the extension and fail to start the scanner.
Safari 26 runs on macOS 14 Sonoma and later, so `scripts/safari.mjs` raises the project's
deployment target to macOS 14.0: Apple's template targets older systems (macOS 10.14 with
Xcode 26.3, 12.0 with Xcode 27.2), where the App Store would offer an app that cannot work.

## What CI proves

The `safari` job of `.github/workflows/integration-browser-extension.yml` runs on GitHub's
`macos-15` runner with the newest Xcode 26 there:

1. `npm run check:pins`: the Safari zip has the pinned bytes.
2. `node scripts/safari.mjs`: Apple's packager writes a macOS-only Xcode project from
   `build/safari` (`--macos-only`), and `xcodebuild` builds the app, Release, with
   `CODE_SIGNING_ALLOWED=NO`. In the built app and its extension it checks the Info.plist
   (Safari's web extension point, the bundle identifiers, macOS 14.0 as the minimum system),
   that the resources are the 23 files of `build/safari` byte for byte, the pinned WebAssembly
   module and the manifest's Safari 26.0 floor.
3. `npm run test:webkit-page`: the Safari build's page in Playwright's WebKit, served with the
   manifest's policy. It reads the mixed fixture (QR `https://qrc-ai.com/76xMa`, Code 128
   `STOCK-4827`) in fast, frame and full, and a control run without `'wasm-unsafe-eval'` must
   fail to compile the module.

Not proven by CI: the extension running inside Safari itself. Safari loads an unsigned extension
only after a person allows it in Safari's settings, and a CI runner cannot. Playwright's WebKit is
the engine, not Safari. Whether the toolbar popover stays open while the file chooser is shown is
untested; in Firefox it closes, and the page then offers a tab.

## Try it on a Mac, without Xcode

Safari 26 or later:

1. Safari, Settings, Advanced: tick "Show features for web developers".
2. Settings, Developer: tick "Allow unsigned extensions" (Safari turns it off again when it quits).
3. Settings, Developer, **Add Temporary Extension…**, then choose
   `build/qrcode-barcode-scanner-safari-0.1.0.zip` or the `build/safari` folder.
4. Settings, Extensions: turn the extension on, and allow it on the sites where you use the menu.

Safari removes a temporary extension after 24 hours or when it quits.

## Where the Xcode project lives: generated in CI, not committed

Decided on evidence, in the engine repository and with no satellite repository:

- **The project is generated output.** Apple's packager writes it in seconds from `build/safari`,
  the app name and the bundle identifier. `scripts/safari.mjs` then sets two values on each
  run: the macOS 14.0 deployment target, and the app's bundle identifier, which Xcode 27.2's
  packager derives from the app name in a macOS-only project. Nothing else needs a hand edit
  to build unsigned.
- **A committed copy would drift or leak paths.** With `--copy-resources` the project holds its
  own copy of the 23 extension files (3.0 MB with the WebAssembly module), which would have to be
  kept equal to `build/safari` by hand. Without it, the project points at the build by a path
  relative to the machine: on the Mac where this was written, every resource was
  `../../../../../Users/<user>/.../build/safari/<file>`.
- **The format follows Xcode.** On the CI runner, Xcode 26.3 writes `project.pbxproj`; Xcode
  27.2 writes the same project as JSON (`project.xcproj`), with other default deployment
  targets. The CI receipt (`project_files` in `safari-run.json`) records which. A committed
  project would tie the repository to one Xcode generation.

The first hand edit will be the owner's signing team, or an app screen beyond Apple's template.
At that point, commit the generated project under `integrations/browser-extension/safari/`, in
this repository, and have CI refresh its resources with the packager's `--rebuild-project`.

## Publishing (the owner)

**Proposed identifiers.** App `com.qrcode-ai.qrcode-barcode-scanner`, extension
`com.qrcode-ai.qrcode-barcode-scanner.Extension`, app name `QR Code & Barcode Scanner`. Confirm
them before the first upload: a bundle identifier cannot change afterwards.
`node scripts/safari.mjs --bundle-identifier <id>` generates the project with another one.

Three routes, each needing the Apple Developer Program (US$99 per membership year):

1. **App Store Connect's web packager.** Create the app record in App Store Connect, with macOS
   as its only platform in the New App dialog, then Users and Access, Xcode Cloud, Safari Web
   Extension Packager, Upload, and choose
   `qrcode-barcode-scanner-safari-0.1.0.zip`. Apple builds the app with Xcode Cloud, from the 25
   hours a month the membership includes, and offers it to TestFlight or App Review. No Mac is
   needed.
2. **Xcode.** On a Mac with Xcode 26 or later: `npm ci && npm run build && npm run safari`, open
   `build/safari-xcode/project/QR Code & Barcode Scanner/QR Code & Barcode Scanner.xcodeproj`,
   choose the team under Signing & Capabilities for the app and the extension, then Product,
   Archive, and upload to App Store Connect for the Mac App Store.
3. **Outside the App Store.** Sign the app with a Developer ID certificate,
   notarize it, and distribute the app; users then turn the extension on in Safari's settings.

**App Review.** Guideline 4.4 asks an app with extensions for "some functionality, such as help
screens and settings interfaces where possible" and says the extensions "may not include
marketing, advertising, or in-app purchases". Apple's template app shows how to turn the
extension on, which is a help screen. Guideline 4.4.2 says Safari extensions "should not claim
access to more websites than strictly necessary": the extension asks for no site at install, and
for one site at a time when the user clicks Allow.

**Open point for review.** The scanner page ends with links to the QR Code AI scanner, guides
and generators. Chrome, Edge and Firefox accept that as information; an App Reviewer could read
it as marketing under 4.4. If review objects, the Safari build can drop that paragraph.

No workflow in this repository signs, notarizes or uploads anything for Safari, and none needs a
secret or an environment.

## Sources

All read on 21 November 2026.

- Packaging a web extension (`safari-web-extension-packager`, formerly `-converter`, and its
  options):
  <https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari>
- Running an extension, temporary extensions, unsigned extensions:
  <https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension>
- Browser compatibility (Manifest V3 from Safari 15.4):
  <https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility>
- App Store Connect web packager and Xcode Cloud hours:
  <https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect>
- Distribution, Developer ID and notarization:
  <https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension>
- Membership fee: <https://developer.apple.com/programs/whats-included/>
- App Review Guidelines 4.4 and 4.4.2: <https://developer.apple.com/app-store/review/guidelines/>
- `'wasm-unsafe-eval'` in Safari 26.0, and the systems Safari 26 runs on: the Safari 26.0
  release notes,
  <https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes>
