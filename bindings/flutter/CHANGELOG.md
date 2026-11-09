## 0.11.0

* Publish the Flutter binding under the package name `qr_barcode_scanner`.
* Bundle the Rust scanner core at 0.11.0 so Android and iOS builds use the
  same engine and can decode a QR code and a Code 128 barcode in one image.
* Expose the typed scan report, including payload details, barcode occurrences
  and QR quality diagnostics.

## 0.4.0

* Initial Flutter/Dart binding (flutter_rust_bridge v2) for `qrcode-ai-scanner`.
* `QrcodeAiScanner.scan(bytes, profile:)` + `scanFrame(rgba, w, h, profile:)` —
  the same canonical surface as the Python / Node / WASM / Kotlin / Swift bindings.
* Fully typed `ScanReport` (typed `Payload`/`Hint` sealed classes, ISO 15415 /
  UEC grade cards) that tolerates unknown enum values and payload kinds.
* Android (cargokit/NDK) + iOS (cargokit/static lib) build-at-app-time.
