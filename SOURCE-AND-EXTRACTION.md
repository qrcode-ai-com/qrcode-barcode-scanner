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
npm. These five runtime entry points are public in 0.11.0, as are the prebuilt
CLI archives in the [v0.11.0 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0).
The six native npm platform packages are automatic optional dependencies of the
Node parent, not six additional SDKs. The browser package ships one portable
WASM module. No 0.11.0 package uses a former name or an alias/wrapper package;
`qrscan` remains the CLI command.

Flutter is still unpublished, Kotlin/JitPack is unqualified, and Swift requires
a local source build. JSR has no qualified publication here. The public ClawHub
skill and OpenClaw bundle are 0.2.0 on engine 0.11.0. The MCP adapter is 0.2.1
on npm and in the Official MCP Registry. Homebrew and GHCR distribute the CLI
0.11.0. See the [distribution guide](distribution/README.md) for coordinates
and platform evidence. The initial engine npm uploads were manual. The adapter
0.2.1 and PyPI uploads have their own trusted publishing evidence.

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

## QR Code AI

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **SDK guides** | [QR code scanner SDKs](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) | [Barcode scanner SDKs](https://qrcode-ai.com/en-US/barcode-scanner/sdk) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |
