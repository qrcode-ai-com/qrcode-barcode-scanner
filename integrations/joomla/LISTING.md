# Joomla Extensions Directory listing kit · QR Code & Barcode Scanner 0.1.0

Everything the owner needs to publish the package in this folder as a GitHub release and to list it in the [Joomla Extensions Directory](https://extensions.joomla.org/) (JED). Nothing has been released, submitted or uploaded: the release, the JED account, the form, the review answers and any support ticket are the owner's.

## The artifact

| | Value |
| --- | --- |
| File | `pkg_qrcodebarcodescanner-0.1.0.zip` |
| Where | the `joomla-package-joomla-6.2` artifact of the [integration-joomla](../../.github/workflows/integration-joomla.yml) run on the merged commit, or `build/` after `npm ci --ignore-scripts && npm run build` in this folder |
| SHA-256 | `20bf81badca15bbc025201703d89b98de7df027913e0d6738acad7633a0623bf`, the `<sha256>` of the committed [updates.xml](updates.xml) |
| Size | 1,036,523 bytes; it holds the package manifest, three licence files and `packages/mod_qrcodebarcodescanner.zip` (1,023,959 bytes, 21 files) |
| Engine | `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, module SHA-256 `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68` |
| Joomla | 5.4 (PHP 8.1 or later) and 6.x (PHP 8.3 or later); tested on 6.2.0 with PHP 8.4 and 5.4.10 with PHP 8.3 |

To check a downloaded package, in the folder that holds it: `shasum -a 256 pkg_qrcodebarcodescanner-0.1.0.zip` on macOS or `sha256sum pkg_qrcodebarcodescanner-0.1.0.zip` on Linux, and compare with the value above. The package is under the JED's 7 MB upload limit and PHP's default 2 MB upload limit.

## The release and the update server

The JED requires an update server for every extension submitted after 10 January 2017. The package manifest names `https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/joomla/updates.xml`, which is live once this folder is on `main`. That file announces 0.1.0 with this download address and the SHA-256 above:

`https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/joomla-v0.1.0/pkg_qrcodebarcodescanner-0.1.0.zip`

The address answers once the owner creates the release `joomla-v0.1.0` with that file, as below. The release page, `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/tag/joomla-v0.1.0`, is the JED download link. No workflow creates the release: there is no privileged job, no environment and no token to set up.

## The values

The JED form is shown only after sign-in, so its exact fields were not read for this kit. The values follow the [submission requirements](https://extensions.joomla.org/support/knowledgebase/category/submission-requirements), the [error codes](https://extensions.joomla.org/support/knowledgebase/error-codes/submission-error-codes) and the [checklists](https://extensions.joomla.org/support/knowledgebase/submission-requirements/jed-entries-checklists).

| Field | Value |
| --- | --- |
| Extension name | `QR Code & Barcode Scanner`, the package manifest's `<name>` (rule NM1). It holds neither "Joomla" nor the reserved words "module", "plugin" and "template". |
| Category | Mobile › QR Code (`https://extensions.joomla.org/category/mobile/qr-code/`) |
| Includes | Module (site), in a package |
| Version | `0.1.0` |
| Compatibility | Joomla 5 and Joomla 6 |
| Type | Free, non-commercial download |
| Licence | GPLv3 or later for the extension; the separately licensed engine files are declared in `LICENSE-ENGINE.txt` and in the manifests' `<license>` tags (see the verdict below) |
| Developer and project link | `QR Code AI`, `https://qrcode-ai.com/` (rule LK1, the developer's main site) |
| Download link | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/tag/joomla-v0.1.0`, live once the release exists (rule LK2) |
| Documentation link | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/joomla`, this folder's README (optional, rule LK4) |
| Support link | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues` (optional, rule LK6). The planned `https://qrcode-ai-com.github.io/support/` can replace it once it is live after the owner's review. |
| Demo link | none: the JED accepts only a non-production demo site, and there is none |
| Upload | the verified `pkg_qrcodebarcodescanner-0.1.0.zip` (checklist A2.5 asks for a copy in the entry) |
| Logo and images | [listing-assets/icon-256x256.png](listing-assets/icon-256x256.png), [module-visitor.png](listing-assets/module-visitor.png), [module-settings.png](listing-assets/module-settings.png) |

### Short description

> Read QR codes and barcodes from an image or a photo, in the visitor's browser. The image is never uploaded. Open source.

### Description

> QR Code & Barcode Scanner is a site module that reads the QR codes and barcodes in an image or a photo. A visitor chooses an image, or takes a photo with the phone's camera, and each code it holds is listed with its format and its exact text, with a button to copy it.
>
> The image never leaves the visitor's device. The scanner engine is a WebAssembly module packaged inside the extension, served by your own site and run in the visitor's browser. The module makes no request to any other server, sets no cookie, stores nothing in your database and collects no data.
>
> It reads QR Code, Micro QR Code, rMQR Code, Data Matrix, Aztec, PDF417, MaxiCode, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded and Telepen. Several codes in one image are read together.
>
> Place the module in any position from Content > Site Modules. Its settings choose the first profile (full, fast or frame), show the full JSON report and show an optional credit line, off by default. A decoded link is shown as text with an explicit button, and is never opened by itself. Invisible and direction-changing characters in decoded text are shown by their code point.
>
> The extension and its scanner engine are open source. The source of the extension, with the script that builds the package, and the source of the engine are public on GitHub.

### Image captions

1. `module-visitor.png`: The module on a Joomla 6.2 page with the Cassiopeia template, after reading an image with a QR code and a Code 128 barcode.
2. `module-settings.png`: The module's settings in the administrator: the first profile, the full report and the credit line.

The icon is drawn by `npm run assets`, and `npm test` checks that the committed file is the drawn one. The screenshots come from `node test/joomla.mjs --screenshots build/screenshots/joomla-6.2` on the official Joomla 6.2.0 image, the run the workflow repeats; `npm run assets -- --screenshots build/screenshots/joomla-6.2` copies them here. The settings screenshot shows the Joomla administrator as it is; no listing image adds a Joomla logo of its own.

## Privacy answers

The JED has no privacy form; reviewers install the package. If a reviewer asks:

- Personal data collected: none. Data sent to the developer or any third party: none.
- Requests to other servers from a site visitor's page: none. The engine, the script and the stylesheet are files of the module, served by the site; the Docker test checks that the page makes no request to another origin.
- Call home: none. The only outside request is Joomla's own update check of `updates.xml`, made by the administrator's site, which checklist C2.3.3 allows for version checks.
- Cookies, local storage, database tables, options: none. The package keeps nothing after it is uninstalled.
- The credit line is optional and off by default: the module shows no link to the developer unless the site owner turns it on in the module's settings. When it is on, it is a plain, visible sentence with six links to QR Code AI pages. Checklist C2.3.6 allows a backlink to the developer that users can remove, flagged on the listing, and "No more than one backlink"; see the open points.

The QR Code AI privacy, terms and support pages are planned at `https://qrcode-ai-com.github.io/privacy/`, `https://qrcode-ai-com.github.io/terms/` and `https://qrcode-ai-com.github.io/support/`. They are live after the owner's review; until then, do not put them in the form.

## Licence and compiled code: the verdict

Not blocked, but the JED's pages do not agree with each other on licences that are not the GPL itself, so a support ticket before the submission is the safe route. Every source below was read live on 21 November 2026.

What the package declares: the module's PHP, XML, language files, script and stylesheet are under the GNU GPL version 3 or later, each PHP file says so in its header, and they stay available under the MIT License. The engine files (`auto.js`, `qrcode-barcode-scanner.js`, `qrcode-barcode-scanner_bg.wasm` and their metadata) are copied unchanged from the npm package 0.11.0 and stay under AGPL-3.0-or-later. `LICENSE-ENGINE.txt` lists each part and both manifests' `<license>` tags name it.

For the listing:

- [Terms of service](https://extensions.joomla.org/community/terms-of-service), 4.1: "Entries must be licensed as GPL… images, CSS and Javascript files do not need to be licensed under the GPL, but usage cannot be limited." The extension is GPL; the engine's JavaScript and compiled module are separate files whose usage is not limited.
- [The GPL & the JED](https://extensions.joomla.org/support/knowledgebase/submission-requirements/the-gpl-the-jed), "Other File Types": "Stand-alone file (like images, compiled flash files)… can be licensed under other licenses. You must include a TXT file for license info and a statement in the extension XML file license tag." The package does both. The same page answers "Can I use a GPL compatible license? No.", and "Can I use libraries in my GPL extension that are GPL compatible? Yes."
- [Error codes](https://extensions.joomla.org/support/knowledgebase/error-codes/submission-error-codes): LC4, "Extensions are required to be GNU/GPL or AGPL licensed"; PH1, the GPL notice in each PHP file; PH2, the `_JEXEC` guard "in all of your PHP files unless they are external library files"; PH3 and XM1, the `<license>` tag. The package meets each one, and `npm run inspect` checks them.
- [Checklists](https://extensions.joomla.org/support/knowledgebase/submission-requirements/jed-entries-checklists): C2.3.1 allows non-GPL files "only for stand alone files that aren't coded (JavaScript, Flash, images, CSS, audio files, etc)"; C2.3.2 allows non-GPL libraries under a GPL-compatible licence listed by the FSF; C3.2 accepts AGPL "only if you modify the source, and provide that modified code for download".

For the compiled module:

- Item 5 of the GPL page excludes "Encrypted or encoded extensions", C2.3.8 limits encoded files and C2.3.9 forbids obfuscated code. The WebAssembly module is compiled, not encoded or obfuscated. `LICENSE-ENGINE.txt` gives its corresponding source, the public repository at tag `v0.11.0`, its build script and its SHA-256. No error code covers compiled code.

The open question is how a reviewer reads AGPL engine files next to GPL extension code: as permitted stand-alone files and a GPL-compatible library (4.1, Other File Types, LC4, C2.3.2), or as the "GPL compatible license" the FAQ refuses. The options, from the safest:

1. **Ask first.** Send the JED a support ticket with the question below, and submit once it is answered. This costs a wait and changes no file.
2. **Submit as it is.** The package already follows the rules that name the case. A refusal costs one review cycle and asks for the same answer.
3. **Change the engine's licence.** The engine 0.11.0 is published under AGPL-3.0-or-later only. A version under the GPL or a GPL-compatible permissive licence would be the owner's licensing decision and a new engine release. That is out of this kit's scope.

The question for option 1, as a JED support ticket. The checklists link the ticket form at `https://extensions.joomla.org/about-jed/listing-support`; it answered 404 to a request without sign-in on 21 November 2026, so open it signed in, or from the support links of the JED profile.

> We would like to list a free site module, QR Code & Barcode Scanner. All of its PHP, XML, language files, JavaScript and CSS are licensed GPLv3 or later, with the GPL notice in each PHP file. It bundles, unchanged, the files of a published npm package that holds a WebAssembly module and its JavaScript loader. That package is licensed AGPL-3.0-or-later, its source is public, and the extension includes a TXT file for its licence and names it in the XML license tag, as the "Other File Types" section of "The GPL & the JED" describes. Can the extension be listed with these bundled AGPL files? This message was drafted with AI assistance.

## Trademark

The name holds no "Joomla", so it needs no licence from Open Source Matters (checklist B1.4, and the [extension name rules](https://extensions.joomla.org/support/knowledgebase/for-jed-developers/extension-names)). The README and the GitHub banner use the word Joomla only descriptively and show no Joomla logo: [Joomla! Name and Logo Use](https://tm.joomla.org/joomla-name-and-logo-use) asks for permission for other uses, and [Conditional Use Logos](https://tm.joomla.org/conditional-use-logos) requires registering with Open Source Matters before an extension shows even a conditional-use logo. The README ends with a non-affiliation statement.

## The owner's steps

1. Open the merged pull request's **integration-joomla** run in the repository's **Actions** tab. In **Artifacts**, download **joomla-package-joomla-6.2** and unzip it. Take `pkg_qrcodebarcodescanner-0.1.0.zip` and check its SHA-256 against the value above.
2. Create the release. In the repository, open **Releases › Draft a new release**. In **Choose a tag**, type `joomla-v0.1.0` and choose to create it on publish, with the merge commit as target. Title it `Joomla package 0.1.0`. Attach the verified zip under its own name. Untick **Set as the latest release**, so that the engine's release stays the latest, then **Publish release**.
3. Check the download: `curl -sL https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/joomla-v0.1.0/pkg_qrcodebarcodescanner-0.1.0.zip | shasum -a 256` must print the SHA-256 above. Optionally, install the package from that address on a test site in **System › Install › Extensions › Install from URL**.
4. Optional and recommended: send the support ticket above and wait for the answer.
5. Optional: run the JED's own checker. It has no command line: install the latest [JEDChecker](https://github.com/joomla-extensions/jedchecker/releases) on a test site, open **Components › JED Checker**, upload the package and read the report.
6. Register at `https://extensions.joomla.org/register` and accept the terms of service.
7. Open the JED profile, choose **Submit extension**, fill in the form with the values above, upload the package and the three images, and **Save**. The listing goes to the review queue.
8. Answer the JED team's tickets from the same account. A requested change goes through a pull request in this repository, with a new version, a new release and the new `updates.xml`.
9. Once the listing is published, open a pull request here that changes the status paragraph of [README.md](README.md) to the listing's address, with its date.

A new version follows the same path: bump the version in both manifests, `joomla.asset.json` and `package.json`, merge (the workflow rebuilds `updates.xml` with the new SHA-256), create the release `joomla-v<version>` with the new package, then upload it to the JED entry. Joomla sites that installed the package see the update in **System › Update › Extensions**.

## Open points

- Checklist C2.3.6 allows "No more than one backlink". The credit line holds six links when the site owner turns it on, and none by default. If a reviewer counts it as backlinks, the fix is a version whose credit line holds one link to `https://qrcode-ai.com/`; tick the listing's backlink flag if the form asks.
- The JED may find the name `QR Code & Barcode Scanner` too descriptive (its name rules ask to "avoid overly descriptive names"). It is the product's public name; another name would be the owner's choice.
- The QR Code AI pages `https://qrcode-ai.com/en-US/qr-code-scanner/integrations/joomla` and `https://qrcode-ai.com/en-US/barcode-scanner/integrations/joomla` that the README links are written by the website team; until they exist, the README is the reference.
- Joomla 6.2.1 was a release candidate on 17 November 2026; the update file's target platform `(5\.[4-9]|6\.[0-9])` covers it. Joomla 5.4.10 is the last 5.x bugfix release and gets security fixes for one more year; the package can drop Joomla 5 in a later version.
- The module has been tested on the official Docker images in Playwright's Chromium only. A manual check on a hosted site and in Firefox and Safari is worth doing before the submission.
