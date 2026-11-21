# License notes · QR Code & Barcode Scanner Wasmer package

The Wasmer package `qrcode-ai-com/qrcode-barcode-scanner` holds one WebAssembly module,
`qrscan.wasm`: the `qrscan` command of the QR Code & Barcode Scanner, compiled for the
`wasm32-wasip1` target from the source of engine tag `v0.11.0`, commit
`176ac96ef16ee330dbfc6ada10327d0b4e23a8b2` of
<https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust>.

## The module

That source is licensed **AGPL-3.0-or-later**, so the module and the package are distributed
under the GNU Affero General Public License, version 3 or any later version. `LICENSE` holds its
text, as the 0.11.0 source ships it. The corresponding source is the tag above:

<https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0>

`notices/SOURCE.json` records that revision, the target, the Rust release that compiled the
module and the sha256 of every file of the package. The build command is in the README of
`distribution/wasmer` in that repository, and the workflow `.github/workflows/wasmer.yml` runs it.

The module is a new build of that source for a new target. It is not one of the files published
for 0.11.0, which keep their own bytes and licenses. The project chose the MIT License for its
source on 14 November 2026; that choice applies to later source and later qualified versions and
does not relabel a build of the 0.11.0 source.

## Code the module contains

The notices below sit in the `notices` directory of the package, beside this file, and the
package maps that directory to `/notices` inside the module's filesystem.

- The reader code copied from rxing and ZXing keeps its Apache-2.0 notices:
  `notices/LICENSE-APACHE-2.0` and `notices/THIRD-PARTY.md`, from the same source.
- The Rust crates the command links for `wasm32-wasip1` keep their own licenses.
  `notices/THIRD-PARTY-LICENSES.txt` lists each one with its version, checksum, license
  expression and license texts.
- The Rust standard library notice is `notices/COPYRIGHT-rust-std.html`, as the compiler ships
  it.

## The package files

`wasmer.toml`, `README.md` and this file (`notices/LICENSE-NOTES.md`) are project source of the
repository above, available under the MIT License:

```text
MIT License

Copyright (c) 2026 SuperNovae Studio — QR Code AI, by Thibaut Mélen & Nicolas Cella

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

They do not change the license of the module. The QR Code AI name and logo are trademarks; no
license of the package grants a trademark right.
