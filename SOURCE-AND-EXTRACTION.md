# Scanner source and package identity

**QR Code & Barcode Scanner** is one Rust engine for QR codes, barcodes and
other supported 2D formats. Its runtime bindings share the versioned scan-report
contract. QR and barcode use cases do not require separate engine repositories.

The source repository is
[`qrcode-ai-com/qrcode-barcode-scanner`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner).
The repository retains its identity, commits and tags across renames.

## Package names

Releases through 0.10.x keep their `qrcode-ai-scanner` names and stay available
under them. From 0.11.0 the packages carry the `qrcode-barcode-scanner` family
names: `qrcode-barcode-scanner` and `qrcode-barcode-scanner-cli` on crates.io,
`qrcode-barcode-scanner` on PyPI, and `@qrcode-ai-com/qrcode-barcode-scanner`,
its six platform packages and `@qrcode-ai-com/qrcode-barcode-scanner-wasm` on
npm. Nothing from 0.11.0 on is published under a former name, and there are no
alias or wrapper packages. The `qrscan` command keeps its name. The Flutter
package is not yet published. Container images, the agent skill and the MCP
adapter already published keep their names; their next releases take names
from the new family.

These spellings stay as they were in 0.11; none of them is an install name:

- the repository directories: `crates/qrcode-ai-scanner*`,
  `bindings/kotlin/qrcodeaiscanner` and `bindings/swift/Sources/QrcodeAiScanner`;
- the Cargo packages that are never published: `qrcode-ai-scanner-node`,
  `qrcode-ai-scanner-wasm`, `qrcode-ai-scanner-uniffi` and `qrcode-ai-scanner-fuzz`;
- the UniFFI, Kotlin, Swift and Android module names: the UniFFI library
  `qrcode_ai_scanner_uniffi`, the Kotlin package `uniffi.qrcode_ai_scanner_uniffi`,
  the Gradle module `:qrcodeaiscanner`, the Swift package `QrcodeAiScanner` with
  its `QrcodeAiScannerFFI` binary target, and the Android namespaces of the
  Kotlin and Flutter bindings;
- the platform identifiers of the Flutter example app.

Install from the coordinates in [README.md](README.md), the documentation and
the [distribution guide](distribution/README.md), not from the repository name.
The [migration guide](docs/guides/migrate-to-qrcode-barcode-scanner.mdx) maps
each former name to its new one.

## Development and delivery

1. Implement and test scanner changes in this repository.
2. Select an exact source revision and build the affected runtime artifacts.
3. Qualify the actual packages in clean consumers, including platform-specific
   requirements. A source tag or workspace test alone does not qualify a binding.
4. Publish through [RELEASING.md](RELEASING.md), then verify each artifact's
   version, source revision, installation and supported-platform evidence.

Preserve exact content, report/schema compatibility, advanced QR recovery,
scoring semantics and resource contracts. A repository rename does not release
or retire a package, rename its registry entry, or change its license. Published
artifact hashes, source snapshots, schema identifiers and dated verification
receipts retain their original identities.

QR Code AI is the application consuming this scanner; its creation engine has
its own source and release process. A mobile scanner binding is a developer
artifact, not an application-store release. See [LICENSING.md](LICENSING.md) for
this scanner's licensing terms.

The filename is retained for existing links. Earlier two-engine extraction
proposals are superseded; no extraction or alias/wrapper package is required.
Private operating plans and account data do not belong in this repository or
its distributable archives.
