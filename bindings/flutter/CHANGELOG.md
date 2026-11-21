## Unreleased

* `QrcodeAiScanner.scan` and `scanFrame` take an optional `budgetMs`, the
  wall-clock budget in milliseconds, with the semantics of `budget_ms` in the
  other bindings: `null` keeps the profile's default, `0` is unbounded, and a
  value above 4294967295 throws `[QRS-006]` before the image is read. A
  negative value throws a `RangeError`. Calls written for 0.11.0 compile and
  behave as before.
* Debug builds of the Rust core are optimized. Simulators and emulators run
  Flutter only in debug mode, where cargokit builds the core with Cargo's dev
  profile, and 0.11.0 left that profile unoptimized: on the iOS simulator,
  scans overran their default budgets. `rust/Cargo.toml` now gives the dev
  profile opt-level 3 without debug assertions. Overflow checks stay on, and
  there is no LTO in debug builds.
* The package metadata names the renamed repository,
  `qrcode-ai-com/qrcode-barcode-scanner-rust`: the pubspec `repository`, the
  podspec `homepage` and the Rust crate's `repository`.
* The example app bundles the mixed QR/Code 128 fixture. Its integration tests
  check that the three profiles read both codes within their default budgets,
  and exercise `budgetMs`.

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
