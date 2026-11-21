# License notes for the HTTP service image

The files of this folder (`server.mjs`, `Dockerfile`, `package.json`, the tests and these notes)
are project source of the QR Code & Barcode Scanner, under the MIT License in `LICENSE`.

The image built from them is not only that source. It also holds:

| Part | Version | License | Where its text is in the image |
| --- | --- | --- | --- |
| `@qrcode-ai-com/qrcode-barcode-scanner`, the scanner engine for Node.js | 0.11.0 | AGPL-3.0-or-later | `/opt/qrscan-http/node_modules/@qrcode-ai-com/qrcode-barcode-scanner/LICENSE` |
| its native package for the image's platform (`linux-x64-gnu` or `linux-arm64-gnu`) | 0.11.0 | AGPL-3.0-or-later | `LICENSE` in that package's folder under `node_modules/@qrcode-ai-com/` |
| the reader parts the engine derives from rxing 0.9.3 | as in engine 0.11.0 | Apache-2.0 | `/opt/qrscan-http/licenses/engine-0.11.0/` |
| Node.js and the Debian base of the `node:22.22.2-bookworm-slim` image | as pinned in `Dockerfile` | their own licenses | as that base image ships them (Debian's under `/usr/share/doc`) |

The engine 0.11.0 was published under AGPL-3.0-or-later, and the image runs it, so the image as a
whole is distributed under **AGPL-3.0-or-later**. Its `org.opencontainers.image.licenses` label
says so. The MIT grant of this folder's files does not change the engine's license.

## Corresponding source

- The engine 0.11.0: tag `v0.11.0` of
  [qrcode-ai-com/qrcode-barcode-scanner-rust](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0),
  commit `176ac96ef16ee330dbfc6ada10327d0b4e23a8b2`. The npm packages were built from it.
- The service: the folder `distribution/http` of the same repository, at the commit that
  `SOURCE.json` names next to `server.mjs` in the image.

AGPL-3.0 section 13 asks a modified program that users reach over a network to offer them its
source. The service does it on every answer: the `X-Source-Code` header and the `source` field of
`GET /` name the service's source at its commit and the engine's source at `v0.11.0`. If you
change the service and run it for others, point those links at your own source.

`licenses/engine-0.11.0/THIRD-PARTY.md` and `LICENSE-APACHE-2.0` are copies of
`crates/qrcode-ai-scanner/THIRD-PARTY.md` and `crates/qrcode-ai-scanner/LICENSE-APACHE-2.0` at tag
`v0.11.0`, byte for byte.
