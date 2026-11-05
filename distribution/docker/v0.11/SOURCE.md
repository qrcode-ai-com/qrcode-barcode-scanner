# Corresponding scanner source

This image contains the unchanged Linux CLI from the public `v0.11.0` release
of [QR Code & Barcode Scanner](https://github.com/qrcode-ai-com/qrcode-barcode-scanner).
It does not rebuild Rust. `build-info.json` records its compiler (Rust 1.99.1),
locked dependencies, binary digest and original build producer. The image's
`org.opencontainers.image.revision` names immutable engine source
`176ac96ef16ee330dbfc6ada10327d0b4e23a8b2`; the separate
`io.qrcode-ai.scanner.packaging-revision` names the reviewed image recipe revision.

`source/` contains the exact public CLI corresponding-source archive and both
published crates, verified against `inputs.json`. The license, third-party
notices, Rust standard-library notice and original release source instructions
are installed alongside this file. The runtime base index is pinned by digest
in the recipe; image receipts identify its platform and every raw layer.

- [Immutable engine source](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/176ac96ef16ee330dbfc6ada10327d0b4e23a8b2)
- [Public release and source archive](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0)
- [QR Code AI](https://qrcode-ai.com/)
- [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner)
- [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner)

Core and CLI: AGPL-3.0-or-later. No hosted service or runtime network is required.
