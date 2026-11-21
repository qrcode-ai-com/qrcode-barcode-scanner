# License notes for the Zapier integration

The files in this folder are MIT: [LICENSE](LICENSE). The bundle that Zapier runs is a different
thing. `zapier-platform build` writes it to `build/build.zip`, and each part inside it keeps its own
license. Read this page before you copy, change or redeploy that bundle.

## What the bundle holds

| Part | Version | License | Where its terms are |
| --- | --- | --- | --- |
| This integration (`index.js`, `creates/`, `lib/scan-core.js`, `package.json`) | 0.1.0 | `MIT` | [LICENSE](LICENSE) |
| `@qrcode-ai-com/qrcode-barcode-scanner-wasm`, the scanner engine | 0.11.0 | `AGPL-3.0-or-later` | `node_modules/@qrcode-ai-com/qrcode-barcode-scanner-wasm/LICENSE` |
| `zapier-platform-core` and `zapier-platform-schema` | 19.3.0 | `SEE LICENSE IN LICENSE` | their `LICENSE` files: the Zapier Platform Agreement, <https://zapier.com/platform/tos> |
| The runtime dependencies of `zapier-platform-core` | as locked | `MIT`, `ISC`, `BSD-2-Clause`, `Apache-2.0`, `(MIT AND BSD-3-Clause)`, `Public Domain` | the license file in each package folder |
| `urlsafe-base64` | 1.0.0 | `none declared` in its `package.json` | the MIT text at the end of its `readme.md` |

Two packages carry their license text in their README instead of a license file:
`urlsafe-base64@1.0.0` (MIT, in `readme.md`) and `isarray@1.0.0` under `hash-base` (MIT, in
`README.md`); the bundle includes both READMEs. Two packages are published on npm without any
license text, only the name of their license in `package.json`: `@zapier/secret-scrubber@1.3.0`
(`ISC`, a Zapier package) and `tr46@0.0.3` (`MIT`). The bundle holds them as npm publishes them.

`test/packed-consumer.mjs` unpacks the bundle and checks this table against it. Every package in
the bundle must have its license named here and its license text shipped with it. If a package or
a license is added, the check fails until this page is updated.

## The engine is AGPL-3.0-or-later

This folder's source is MIT. The published engine package it installs is not. Version 0.11.0 of
`@qrcode-ai-com/qrcode-barcode-scanner-wasm` is licensed AGPL-3.0-or-later, so the deployed bundle
holds AGPL-3.0-or-later code. The MIT grant on this folder does not change the engine's license.

Corresponding source of the engine: tag `v0.11.0`, commit
`176ac96ef16ee330dbfc6ada10327d0b4e23a8b2`, of
<https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust>, folders `crates/qrcode-ai-scanner`
and `crates/qrcode-ai-scanner-wasm`. The package's own `build-info.json` records that revision and
the SHA-256 of `qrcode-barcode-scanner_bg.wasm`.

The engine holds two reader parts derived from rxing 0.9.3, a Rust port of ZXing. They keep their
Apache-2.0 notices: `THIRD-PARTY.md` and `LICENSE-APACHE-2.0` in the engine package describe them.

## Zapier's own packages are not open source

`zapier-platform-core` and `zapier-platform-schema` are under the Zapier Platform Agreement. Their
license is not an open-source license, and Zapier requires them in every integration it runs. The
bundle therefore combines AGPL-3.0-or-later code with code under Zapier's terms.

The engine's own developers, at SuperNovae Studio, publish this integration. Anyone else who builds
and deploys a changed copy of this bundle has to check, for their own deployment, that they can
meet the AGPL-3.0-or-later and the Zapier Platform Agreement together.

## Names and logos

No license on this page grants a right to the QR Code AI or Zapier names and logos.
