# License notes

This folder builds one Python wheel, `jupyterlab-qrcode-barcode-scanner`, that holds two kinds of
code under two licenses. Its metadata therefore declares `MIT AND AGPL-3.0-or-later`.

## The extension's own code: MIT

The source in `src/`, `style/`, `scripts/`, `tests/` and `jupyterlab_qrcode_barcode_scanner/`, and
the JavaScript the build compiles from it into the labextension's `static/` folder, is available
under the MIT License in [LICENSE](LICENSE). The bundle also holds the small runtime helpers of
`css-loader` and `style-loader`, both MIT; `static/third-party-licenses.json` lists them with their
texts.

## The bundled scanner engine: AGPL-3.0-or-later

The labextension's `static/*.wasm` file and the JavaScript glue bundled with it are the published
npm package `@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0`, unchanged. The module's SHA-256 is
`a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68`; the build refuses any other.
That package is distributed under AGPL-3.0-or-later, and two of its reader parts keep their
Apache-2.0 notices. Its corresponding source is the
[`v0.11.0` tag](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0) of the
scanner repository, revision `176ac96ef16ee330dbfc6ada10327d0b4e23a8b2`.

The build copies the package's own license files, unchanged, into `licenses/`:
`ENGINE-0.11.0-LICENSE`, `ENGINE-0.11.0-LICENSE-APACHE-2.0` and `ENGINE-0.11.0-THIRD-PARTY.md`,
with `ENGINE.json`, the record of the bundled module. The wheel carries them in its
`.dist-info/licenses/` folder, and the installed labextension carries them, with this file and
[LICENSE](LICENSE), in its own `licenses/` folder.

Whoever distributes the wheel also distributes that AGPL engine. Installing the extension does not
relicense the engine, and the engine's license does not change the MIT terms of the extension's own
source.
