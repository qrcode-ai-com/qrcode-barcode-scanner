# License notes for the Canva app

The source in this folder and the file built from it, `dist/app.js`, are under different terms.
This note lists each part, and the decision the owner takes before the file is submitted to Canva.

## The source in this folder

The app's own code and documents here (`src/`, `scripts/`, `test/`, `canva-app.json`, these notes,
the README and the listing kit) are under the MIT License, in [LICENSE](LICENSE). The two pictures
in `media/` are screenshots of the built app in its test page, under the same license.

This folder holds no Canva code, no engine and no other package. `npm ci` installs them from the
npm registry, at the exact versions of `package-lock.json`.

## The parts of `dist/app.js`

`scripts/build.mjs` bundles these parts into the one file Canva takes. The file ends with a comment
that holds the license text of every package in it, written from the files of each installed
package, and `build/build-receipt.json` lists them with their versions.

| Part | Version | License |
| --- | --- | --- |
| The app's own code, from `src/` | 0.1.0 | MIT |
| The scanner engine, `@qrcode-ai-com/qrcode-barcode-scanner-wasm`, inlined by [integrations/wasm-inline](../wasm-inline/) | 0.11.0 | AGPL-3.0-or-later, with Apache-2.0 notices for the code derived from rxing |
| Canva's packages: `@canva/app-ui-kit`, `@canva/app-i18n-kit`, `@canva/design`, `@canva/asset`, `@canva/platform`, `@canva/intents` | as pinned | Canva's license, quoted below |
| React, React DOM, react-intl, FormatJS, MobX, Floating UI and their helpers | as pinned | MIT, BSD-3-Clause or 0BSD, each named in the file |

The engine module inside the file is the one of the published npm package, byte for byte: SHA-256
`a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68`, built from revision
`176ac96ef16ee330dbfc6ada10327d0b4e23a8b2` of this repository. Only its loader changes, so that it
takes the module from the file instead of fetching it. The engine's corresponding source is that
revision of <https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust>.

## Canva's license

Canva's packages carry the same license file. Its terms that matter here:

> 1. You must only use the Software Components and any Derivative on the Canva Platform.
> 2. You must only use the Software Components and any Derivative for the purpose of building or
>    updating Permitted Apps, and for no other purpose.
> 3. You must include a copy of this Licence in all copies of any Software Component and
>    Derivative.

A "Derivative" is any software that contains a Software Component, so `dist/app.js` is one. The
build keeps the license in the file, as term 3 asks. The tests run the built file in a test page
that stands in for Canva's panel, only to build and check this app, as Canva's own testing
documentation does with its packages.

## The decision the owner takes before submission

The working default for a bundle that holds engine 0.11.0 is AGPL-3.0-or-later (decision 12,
pending the owner). That default does not fit this file on its own. AGPL-3.0 lets anyone who
receives the combined work use, change and pass it on anywhere, and Canva's terms 1 and 2 restrict
the Canva parts of the same file to the Canva Platform. The combined file cannot meet both sets of
terms unless the engine's copyright holder allows the combination.

The owner holds the copyright of the engine's own code, so the owner can settle this. Two routes
are open:

1. **An additional permission for the engine 0.11.0 module.** Under section 7 of the AGPL, the owner
   adds a permission like this one to the notice of this app: "As an additional permission under
   section 7 of the GNU Affero General Public License, the copyright holders of the QR Code & Barcode
   Scanner engine allow you to combine the engine with Canva's software components in an app
   offered on the Canva Platform, and to convey the combination, without the Canva components
   becoming subject to the AGPL. The engine itself stays under the AGPL." The Apache-2.0 code
   derived from rxing allows this combination already.
2. **An engine release built from the MIT source.** The engine's source is under the MIT License
   since 14 November 2026. Once a version built from it is published to npm, pinning it here makes
   the bundle MIT, Canva's license and the permissive licenses above, with no conflict.

Until the owner chooses, `dist/app.js` is built and tested here but not submitted. Neither route
changes the code: the first changes the notice in the banner of `scripts/build.mjs` and this file,
the second changes the pinned engine version.

This note describes the licenses as written. It is not legal advice.
