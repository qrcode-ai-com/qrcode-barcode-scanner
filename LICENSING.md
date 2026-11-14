# Licensing

Project-authored QR Code & Barcode Scanner source and documentation in this checkout use the
**[MIT License](LICENSE)**. This covers our engine, runtime bindings, command adapters, MCP
adapter, portable skill and bundle helpers. Thibaut Mélen & Nicolas Cella develop the scanner
for **QR Code AI**, a product of **SuperNovae Studio**.

## Using the MIT source

MIT permits use, modification, redistribution, sublicensing and sale of this source, including
use in proprietary applications. Keep the copyright and permission notice in copies or
substantial portions. The license contains its warranty and liability terms. A separate
commercial license is not required for project-authored MIT source.

## Published versions and pinned dependencies

The source change does not replace or relabel a published archive. Each archive retains its
packaged license. The [dated license history](docs/guides/license-history.mdx) records earlier
engine, adapter and portable-helper grants. Source, an installed package and a hosted listing
can show different licenses until a new qualified version is published. Identify an unreleased
source build by its exact commit and archive hash, not just its version.

Some examples and helpers install an earlier published engine. Their MIT-authored wrapper
does not change that runtime's license. Inspect the complete dependency set before treating an
installation as an MIT engine distribution. New tags and registry uploads need their normal
qualification and owner approval.

## Third-party components and data

Retain upstream licenses and notices. The copied rxing/ZXing reader source keeps its Apache-2.0
notices and [license text](crates/qrcode-ai-scanner/LICENSE-APACHE-2.0), as described in
[THIRD-PARTY.md](crates/qrcode-ai-scanner/THIRD-PARTY.md). UniFFI dependencies include MPL-2.0
components; other dependencies retain their declared licenses. Our MIT grant does not relicense
those dependencies, third-party fixtures, datasets or the separate QR Code AI service.

CLI archives carry LICENSE, this guide, source references and third-party license material.
Their build-info.json records dependencies and checksums; SOURCE.md identifies the corresponding
source and registry crates. Keep this material with redistributed archives. AUR, AppImage and
container recipes pinned to older public CLI bytes retain that CLI's actual license until a
new qualified artifact replaces the pin.

## Ask AI artwork

The retained marks and badges use [Lobe Icons](https://github.com/lobehub/lobe-icons) under its
[MIT license](docs/assets/actions/brands/LICENSE-Lobe-Icons.txt). Source revision and hashes are
in [the provenance](docs/assets/actions/brands/provenance.json); each colored image embeds the
notice. Trademarks remain with their owners and imply no endorsement. OpenAI uses a green
display tint; Grok retains black. Vendored Cargokit keeps its upstream MIT notice.

## Contributions

New project-authored contributions are accepted under MIT, matching this source. Retain
third-party notices and identify imports and their license. Earlier contributions and releases
retain their existing grants; this document claims no retroactive change to packaged metadata.

Developed by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of
**SuperNovae Studio**. © SuperNovae Studio.
