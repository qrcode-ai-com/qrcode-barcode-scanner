# Publishing the Swift package and listing it on the Swift Package Index

The Swift package is not published yet. Its repository,
[`qrcode-ai-com/qrcode-barcode-scanner-swift`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-swift),
holds the staged tree but no tag, and the release asset its `Package.swift` pins does not exist
yet. Each step below that creates an environment or a tag, approves a deployment, publishes a
release or sends a submission is the owner's; no workflow performs it.

## What a release publishes

| Field | Value |
| --- | --- |
| Package URL | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-swift.git` |
| Package name | `QRCodeBarcodeScanner` |
| Library product and module | `QRCodeBarcodeScanner` |
| Binary target | `QrcodeAiScannerFFI`, the zip `QrcodeAiScannerFFI.xcframework.zip` of the engine's release `swift-vX.Y.Z` |
| Platforms | iOS 13 (`arm64`), iOS simulator (`arm64`, `x86_64`), macOS 11 (`arm64`, `x86_64`) |
| Engine | the tag `bindings/swift/package/satellite.json` pins, with its full commit |
| License | the pinned engine version's (`LICENSE` of the satellite, copied from that tag); `LICENSE-NOTES.md` says which part each license covers |
| Package version | `X.Y.Z`, a tag of the satellite repository |

`satellite.json` pins the engine tag, the package version, the release tag `swift-vX.Y.Z` and the
sha256 of the zip. The pinned engine today is the published engine tag, whose source was licensed
AGPL-3.0-or-later, so the package is distributed under that license (decision 12, which is the
owner's). Moving the pin to a later engine tag is one reviewed change of that file: a new zip, a
new checksum, a new package version.

## Where the built files are

Every run of the workflow [Swift package](../../.github/workflows/swift-package.yml) uploads:

- **`swift-xcframework`**: `QrcodeAiScannerFFI.xcframework.zip`, the Swift UniFFI generated, and
  `build.json`, with the engine commit, the zip's sha256 (SwiftPM's checksum), its members and
  whether it reproduces the pinned sha256.
- **`swift-satellite`**: the staged tree of the satellite repository, with its `SOURCE.json`.
- **`swift-consumer`**: the receipt of the clean Swift package that installed the staged package
  on macOS and read both codes of `fixtures/symbology/mixed-code128-qr.png` in the fast, full and
  frame profiles, then built it for iOS devices and the iOS simulator.

## Setup, once, by the owner

1. In the engine repository, **Settings → Environments → New environment**, name it **`swift`**.
   Under **Required reviewers** add `ThibautMelen`. Under **Deployment branches and tags** choose
   **Selected branches and tags** and add one rule: type **Tag**, pattern **`swift-v*`**. Add no
   branch rule, no secret and no variable, and do not allow administrators to bypass it.
2. Add `swift-v*` to the tag ruleset that protects the distribution tags.

The job `attach` holds `contents: write` only, in that environment, on a `swift-v*` tag only.

## A release, by the owner

1. Check that `main` holds the change, that `satellite.json` pins the checksum, and that the run
   of `Swift package` on that commit is green with `build.json` reading `"reproduced": true`.
2. Check that the satellite repository equals the stage of that commit: the job `satellite`
   compares it; to refresh it, replace its tree with the `swift-satellite` artifact of the run
   on `main`, in one commit.
3. Create the draft release of the tag, targeting that commit `SHA`:
   `gh release create swift-vX.Y.Z --draft --target SHA --title swift-vX.Y.Z --notes-file notes.md`.
4. Tag that commit and push the tag:
   `git tag -a swift-vX.Y.Z SHA -m 'Swift package X.Y.Z'`, then `git push origin swift-vX.Y.Z`.
5. When the run on the tag reaches `attach`, open it, **Review deployments**, select **swift**,
   then **Approve and deploy**. The job uploads the zip and `checksum.txt` into the draft, only
   when the zip is the pinned one, and reads it back.
6. Publish the draft once its readback is green: `gh release edit swift-vX.Y.Z --draft=false --verify-tag`.
7. In the satellite repository, tag the commit whose `Package.swift` pins that release:
   `git tag -a X.Y.Z <commit> -m 'QRCodeBarcodeScanner X.Y.Z'`, then `git push origin X.Y.Z`. A tag
   is never moved or reused.
8. In an empty Swift package that depends on
   `.package(url: "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-swift.git", exact: "X.Y.Z")`,
   run `swift package resolve` and `swift build`: SwiftPM must fetch the zip and accept its
   checksum.

## The Swift Package Index submission, by the owner

The index lists a public repository with a `Package.swift` at its root, at least one semantic
version tag, valid `swift package dump-package` output and a package that compiles, so it is sent
after step 7 above.

1. Open [Add Package(s)](https://github.com/SwiftPackageIndex/PackageList/issues/new?template=add_package.yml)
   on `SwiftPackageIndex/PackageList`.
2. Title: `Add qrcode-barcode-scanner-swift`.
3. **New Packages**, one line:

   ```text
   https://github.com/qrcode-ai-com/qrcode-barcode-scanner-swift.git
   ```

4. Click **Create** (sending it is the owner's step). The index's own automation validates the
   package and opens the change that adds it.

Once the package page exists, its sidebar link **Do you maintain this package?** gives the
platform and Swift version badges; adding them and replacing the "Not published yet" note of
the satellite README are one change in `bindings/swift/package/README.md` here, then a new stage.

Sources: [Add a Package](https://swiftpackageindex.com/add-a-package),
[GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
