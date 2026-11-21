# License notes for the Photoshop plugin

The source in this folder and the plugin built from it are under different terms. This note lists
each part.

## The source in this folder

The plugin's own code and documents here (`src/`, `scripts/`, `test/`, these notes, the README and
the listing kit) are under the MIT License, in [LICENSE](LICENSE). The two pictures in `media/` are
made from screenshots of the built plugin in its test page, under the same license.

This folder holds no Adobe code and no engine. `npm ci` installs the engine and the build tools
from the npm registry, at the exact versions of `package-lock.json`.

## The parts of the plugin

`scripts/build.mjs` writes the plugin folder, `dist/`, and the same files in
`build/qrcode-barcode-scanner-photoshop-<version>.zip`. Its `NOTICE.md` lists them again inside the
plugin.

| Files in the plugin | What they are | Version | License |
| --- | --- | --- | --- |
| `manifest.json`, `index.html`, `styles.css`, `icons/` | the plugin's panel, copied from `src/`, and its icons drawn by `scripts/icons.mjs` | 0.1.0 | MIT, in `LICENSE-MIT.txt` |
| `index.js` | the plugin's code from `src/`, with the scanner engine `@qrcode-ai-com/qrcode-barcode-scanner-wasm` inlined by [integrations/wasm-inline](../wasm-inline/) | 0.1.0, engine 0.11.0 | MIT for the plugin's code; AGPL-3.0-or-later for the engine, with Apache-2.0 notices for the code derived from rxing |
| `LICENSE`, `LICENSE-APACHE-2.0`, `THIRD-PARTY.md` | the engine package's own license files, copied byte for byte | 0.11.0 | |
| `LICENSE-MIT.txt`, `NOTICE.md` | the MIT License of the plugin's code, and the list of parts with the engine's source revision | 0.1.0 | |

The plugin as a whole is distributed under AGPL-3.0-or-later, the working default for a bundle that
holds engine 0.11.0 (decision 12, pending the owner). The MIT parts allow that.

The engine module inside `index.js` is the one of the published npm package, byte for byte:
SHA-256 `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68`, built from revision
`176ac96ef16ee330dbfc6ada10327d0b4e23a8b2` of this repository. Only its loader changes, so that it
takes the module from the file instead of fetching it. The engine's corresponding source is that
revision of <https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust>, named in `NOTICE.md`.

The `TextDecoder`, `TextEncoder` and `performance` stand-ins in `src/polyfills.js` are this
plugin's own MIT code, written for it; no polyfill package is bundled.

## Adobe's code is not in the plugin

The plugin reaches Photoshop through `require('photoshop')` and `require('uxp')`, which Photoshop
answers when the panel runs. The build keeps both outside `index.js` and refuses any other
`require`. No Adobe code, SDK or sample is copied into this folder or the plugin. The way the
engine is started (the module inlined, then started synchronously) follows the pattern Adobe shows
in its `wasm-rust-sample`; the code here is written for this plugin.

So the plugin combines no code under another vendor's license, and AGPL-3.0-or-later applies to it
as it is. Adobe's Developer Terms of Use, which the owner accepts before using the UXP Developer
Tool and the Developer Distribution portal, govern packaging and the Marketplace listing; they are
not a license of the plugin. As read on 10 November 2026, those terms forbid putting Adobe's
developer tools under AGPL-type terms (clause 6.6), which is why none of them is in the plugin, and
ask for an end-user license agreement (clause 6.15), which is why the listing gives a terms URL.

## If the owner chooses another license

The engine's source is under the MIT License since 14 November 2026. Once a version built from it
is published to npm, pinning it here instead of 0.11.0 makes the plugin MIT as a whole. That changes
the pinned version, `banner()` and `notice()` in `scripts/build.mjs`, the footer of
`src/index.html` and this file, not the code.

This note describes the licenses as written. It is not legal advice.
