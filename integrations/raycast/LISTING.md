# Raycast Store listing · QR Code & Barcode Scanner

The Raycast Store takes an extension through a pull request to
[raycast/extensions](https://github.com/raycast/extensions): the extension goes in
`extensions/qrcode-barcode-scanner/` of a fork, and Raycast publishes it when its reviewers merge
the pull request. This file holds the values of that listing, the pull request text and the
owner's steps. Nothing here is submitted.

## The folder the pull request carries

`scripts/stage-raycast-store.py` writes it from a commit of this repository. It takes the files
the Store ships (`package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`,
`.prettierrc`, `.gitignore`, `CHANGELOG.md`, `LICENSE`, `src/`, `assets/`, and `metadata/` once
the screenshots exist), puts [STORE.md](STORE.md) in place of the README, sets the author and
drops the `test` script, which needs files that stay here. It refuses any file it does not
classify, and it checks the result against the Store rules it can check offline.

```sh
python3 scripts/stage-raycast-store.py stage --out /absolute/new/folder --author <raycast-username>
python3 scripts/stage-raycast-store.py check /absolute/new/folder
```

The job `store` of [integration-raycast.yml](../../.github/workflows/integration-raycast.yml)
stages it on every pull request that touches the extension and checks it the way raycast/extensions
does:

- `npm ci`, then `ray validate` against `https://www.raycast.com/schemas/extension.json`. Every
  stage is ready except the author: `ray validate` looks `qrcode-ai-com` up in Raycast's user
  directory and gets 404, because no Raycast account has that username. The job accepts that one
  error and refuses any other. It goes away when the author is the owner's Raycast username.
- `ray build -e dist`, which needs no account.
- Raycast's screenshot checker (`scripts/check_metadata_images.py` and `check_raycast_images.py`
  of raycast/extensions at commit `1aef446889476810eebd08301d03f2ff8ae74c0b`, verified by sha256).
  It passes with no screenshot and checks every screenshot added to `metadata/`.
- The built extension, copied into a new folder, scans the mixed QR and Code 128 fixture with
  the published `qrscan` 0.11.0 in the fast, frame and full profiles. The destination acceptance
  receipt records the exact texts, then the folder is removed and the receipt closed.

The job keeps `kit/` as the artifact `raycast-store-kit`: the staged folder as
`qrcode-barcode-scanner-raycast-store.tar.gz` with its `SHA256SUMS`, the `ray validate` log and the
acceptance receipt. The archive is reproducible: the same commit gives the same bytes in any time
zone. At the commit that added this file, its sha256 is in the run of its pull request.

## Listing values

All of them come from `package.json`; the Store reads them from there.

- Name (folder and URL): `qrcode-barcode-scanner`
- Title: `QR Code & Barcode Scanner`
- Description (125 characters):

  ```text
  Read every QR code and barcode in an image from Finder or the clipboard, then copy each decoded text or the full scan report.
  ```

- Categories: `Developer Tools`, `Productivity`
- Keywords: `qr code`, `barcode`, `scanner`, `ean`, `code 128`, `data matrix`
- Command: **Scan Image for Codes** (`scan-image`, view), no subtitle
- Preferences: **qrscan Path** (optional text field), **Scan Profile** (Full, Fast, Frame)
- License: `MIT`. Platforms: `macOS`. Icon: `assets/icon.png`, 512 × 512 PNG.
- Author: the owner's Raycast username. No `owner` field: raycast/extensions refuses
  organisation extensions unless Raycast allows them.

## Pull request text

The title raycast/extensions uses for a new extension:

```text
Add qrcode-barcode-scanner extension
```

The body follows its template. Fill in the screencast, and tick each box only after doing it.

```markdown
## Description

QR Code & Barcode Scanner reads every QR code and barcode in an image on the Mac. Select an image in Finder, or copy an image file, and run **Scan Image for Codes**. Each code is one list item with its text and format; the actions copy or paste the text, copy every text of the image, or copy the full JSON scan report (formats, exact bytes, positions and the quality score). With the Full and Fast profiles, the first code carries a score tag that says how well it scans.

It reads 19 formats in one pass, including QR Code, Micro QR, rMQR, Data Matrix, Aztec, PDF417, EAN-13, UPC-A, Code 128 and GS1 DataBar, and several codes of different formats in one image come back together, with the scan report and the score.

The scan runs `qrscan`, the command line of the open-source QR Code & Barcode Scanner engine (https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust), on the Mac. The image is sent nowhere and the extension makes no network request. The user installs `qrscan` once with Homebrew (`brew install qrcode-ai-com/tap/qrscan`, a formula pinned by sha256). The extension does not download or bundle a binary: `qrscan` is AGPL-3.0-or-later and stays a separate program, so the extension itself is MIT. When `qrscan` is missing, the command says where it looked and offers to copy the install command.

## Screencast

<!-- the screencast or the screenshots -->

## Checklist

- [ ] I read the [extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [ ] I read the [documentation about publishing](https://developers.raycast.com/basics/publish-an-extension)
- [ ] I ran `npm run build` and [tested this distribution build in Raycast](https://developers.raycast.com/basics/prepare-an-extension-for-store#metadata-and-configuration)
- [ ] I checked that files in the `assets` folder are used by the extension itself
- [ ] I checked that assets used in the `README` are located outside the metadata folder if they were not generated with our [metadata tool](https://developers.raycast.com/basics/prepare-an-extension-for-store#how-to-use-it)
```

raycast/extensions asks for no AI disclosure. If the owner wants to say how the code was
written, the Description is the place.

## The owner's steps

1. **Raycast account.** Sign in to Raycast with the account that will own the listing and note
   its username (the `raycast.com/<username>` part). The Store page shows it as the author.
2. **Install `qrscan` and run the extension.** `brew install qrcode-ai-com/tap/qrscan`, then in
   `integrations/raycast`: `npm ci` and `npm run dev`.
3. **Screenshots, 3 to 6.** In Raycast, give **Capture Window** a hotkey. Open
   **Scan Image for Codes** on an image with several codes (the fixture
   `fixtures/symbology/mixed-code128-qr.png` is one), press the hotkey, tick **Save to Metadata**
   and capture. Use one wallpaper for all of them, and show no private data. Good subjects: the
   list with its score tag, the actions panel, the missing-`qrscan` screen. Capture Window writes
   2000 × 1250 PNG files into `integrations/raycast/metadata/`; commit them there in a pull request
   of this repository, whose CI runs Raycast's checker on them.
4. **Distribution build.** Run `npm run build` in `integrations/raycast` and open the extension
   in Raycast once more, as the checklist asks.
5. **Fork and branch.** Fork raycast/extensions on GitHub and clone the fork. Then, from this
   repository:

   ```sh
   python3 scripts/stage-raycast-store.py fork --clone /path/to/the/fork --author <raycast-username>
   ```

   It checks that the clone is raycast/extensions or a fork with a clean tree and no
   `qrcode-barcode-scanner` folder yet, creates the branch `ext/qrcode-barcode-scanner`, writes the
   folder with the screenshots and commits it as `Add qrcode-barcode-scanner extension`, with the
   clone's own git identity and no trailer. It never pushes.
6. **Open the pull request.** Push the branch to the fork and open the pull request into `main`
   with the text above. The other route Raycast documents is `npm run publish` in a folder staged
   with `--author`: it asks for a GitHub sign-in and opens the pull request itself.
7. **Review.** Raycast replies within about a week. Answer each comment: a pull request is
   marked stale after 14 days without activity and closed after 21. A change asked by the
   reviewers goes first into this repository, then into the fork with `fork --update` on a new
   branch, or by hand.

## What can still block it

- **Similar extensions.** Raycast refuses an extension that gives "very similar value" to one
  already in the Store, and several QR code extensions are there. Search the Store for `qr` and
  `barcode` before opening the pull request. The Description names what this one does: image
  files, 19 formats in one pass, the scan report and the score.
- **An extra install.** Raycast prefers extensions that need no separate download. `qrscan` stays
  a separate program because of its license, and it comes from a Homebrew formula pinned by
  sha256, the route Raycast lists as acceptable. If the reviewers ask for an automatic download,
  that is a change of this extension, to decide before the next round.
