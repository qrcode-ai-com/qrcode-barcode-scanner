# License notes for the Adobe Express add-on

The source in this folder and the package built from it are under different terms. This note lists
each part.

## The source in this folder

The add-on's own code and documents here (`src/`, `scripts/`, `test/`, these notes, the README and
the listing kit) are under the MIT License, in [LICENSE](LICENSE). The two pictures in `media/` are
screenshots of the built add-on in its test page, under the same license.

This folder holds no Adobe code and no engine. `npm ci` installs the engine and the build tools
from the npm registry, at the exact versions of `package-lock.json`.

## The parts of the package

`scripts/build.mjs` writes the package, `build/qrcode-barcode-scanner-adobe-express-<version>.zip`,
from these parts. Its `NOTICE.md` lists them again inside the package.

| Files in the package | What they are | Version | License |
| --- | --- | --- | --- |
| `manifest.json`, `index.html`, `index.js`, `image.js`, `results.js`, `styles.css` | the add-on's panel, copied from `src/` | 0.1.0 | MIT, in `LICENSE-MIT.txt` |
| `scanner-worker.js` | the add-on's worker code, from `src/worker.js`, with the scanner engine `@qrcode-ai-com/qrcode-barcode-scanner-wasm` inlined by [integrations/wasm-inline](../wasm-inline/) | 0.1.0, engine 0.11.0 | MIT for the worker code; AGPL-3.0-or-later for the engine, with Apache-2.0 notices for the code derived from rxing |
| `LICENSE`, `LICENSE-APACHE-2.0`, `THIRD-PARTY.md` | the engine package's own license files, copied byte for byte | 0.11.0 | |
| `LICENSE-MIT.txt`, `NOTICE.md` | the MIT License of the add-on's code, and the list of parts with the engine's source revision | 0.1.0 | |

The package as a whole is distributed under AGPL-3.0-or-later, the working default for a bundle
that holds engine 0.11.0 (decision 12, pending the owner). The MIT parts allow that.

The engine module inside `scanner-worker.js` is the one of the published npm package, byte for byte:
SHA-256 `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68`, built from revision
`176ac96ef16ee330dbfc6ada10327d0b4e23a8b2` of this repository. Only its loader changes, so that it
takes the module from the file instead of fetching it. The engine's corresponding source is that
revision of <https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust>, named in `NOTICE.md`.

## Adobe's code is not in the package

The panel imports the Adobe Express add-on SDK from `https://express.adobe.com/static/add-on-sdk/sdk.js`
when it runs, as Adobe's documentation shows. The SDK is Adobe's, served by Adobe, and no copy of
it is in this folder or in the package. The build checks that the panel names no other remote
address.

So the package combines no code under another vendor's license, and AGPL-3.0-or-later applies to it
as it is. Adobe's developer terms, which the owner accepts in the Adobe Express distribution flow,
govern the listing and the use of the SDK; they are not a license of the package.

## If the owner chooses another license

The engine's source is under the MIT License since 14 November 2026. Once a version built from it
is published to npm, pinning it here instead of 0.11.0 makes the package MIT as a whole. That
changes the pinned version, `notice()` in `scripts/build.mjs` and this file, not the code.

This note describes the licenses as written. It is not legal advice.
