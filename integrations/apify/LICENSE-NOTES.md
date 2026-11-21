# License notes for the Actor image

The files of this folder (the `qrscan_actor` package, `Dockerfile`, `requirements.txt`, the
`.actor` definition, the tests and these notes) are project source of the QR Code & Barcode
Scanner, under the MIT License in `LICENSE`.

The image Apify builds from them is not only that source. It also holds:

| Part | Version | License | Where its text is in the image |
| --- | --- | --- | --- |
| `qrcode-barcode-scanner`, the scanner engine wheel from PyPI | 0.11.0 | AGPL-3.0-or-later | `qrcode_barcode_scanner-0.11.0.dist-info/licenses/LICENSE` in the image's `site-packages` |
| the reader parts the engine derives from rxing 0.9.3 | as in engine 0.11.0 | Apache-2.0 | `/usr/src/app/licenses/engine-0.11.0/` |
| the Apify SDK, HTTPX and their dependencies | as pinned in `requirements.txt` and resolved by `pip` | their own licenses | each package's `dist-info` folder in `site-packages` |
| Python and the base of the `apify/actor-python:3.12` image | as that tag resolves at build time | their own licenses | as that base image ships them |

The engine 0.11.0 was published under AGPL-3.0-or-later, and the image runs it, so the image as a
whole is distributed under **AGPL-3.0-or-later**. The MIT grant of this folder's files does not
change the engine's license.

## Corresponding source

- The engine 0.11.0: tag `v0.11.0` of
  [qrcode-ai-com/qrcode-barcode-scanner-rust](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0),
  commit `176ac96ef16ee330dbfc6ada10327d0b4e23a8b2`. The wheel was built from it.
- The Actor: the folder `integrations/apify` of the same repository, at the commit the Actor's
  Git source names when it is built.

The Actor answers no network request: it reads its input, scans and writes its dataset. If you
change it and offer the result to others, give them its source as the AGPL asks.

`licenses/engine-0.11.0/THIRD-PARTY.md` and `LICENSE-APACHE-2.0` are copies of
`crates/qrcode-ai-scanner/THIRD-PARTY.md` and `crates/qrcode-ai-scanner/LICENSE-APACHE-2.0` at tag
`v0.11.0`, byte for byte (sha256 `e3c3e5d7b5f2e2d880fa39216658df0f84f0de297dd211b65d38373e8e7c6a4a`
and `865b180617725f20be71aa305e82efaa8e56b3c6936d68089bc63cf91cb23087`).
