# Flutter public-package consumers

The `Flutter public consumers` workflow checks the published `qr_barcode_scanner` 0.11.0
archive, SHA-256 `460e3a09878f1148554732212f31e5ec604fd820583a78554292cf8689ff862e`.
It is a destination-specific pin, updated only after another version is public and reviewed.
It never publishes or runs from the staged source binding.

Each job copies the published example outside the checkout, replaces its parent-path dependency
with the exact pub.dev version, and resolves it in an empty pub cache. All 198 installed
package files must match the reviewed public archive before the native build starts.

Android 14 x86_64 and an available iPhone simulator run the real Rust bridge. Five native
cases execute: exact mixed QR/Code 128 contents in fast/frame/full, a blank frame and an invalid
image. Full reports are collected in bounded chunks; missing or repeated chunks fail. The
common destination acceptance driver judges the three reports. The dependency is then removed
with `flutter pub remove`, and a fresh package-config lookup must fail.

The Flutter 0.11 facade does not expose a budget override. Tests use its documented defaults
and require `budgetExhausted == false`; this is not an unbounded-runtime claim. The Android APK
also passes the 16 KB library-alignment check. A 4 KB Android emulator is not a 16 KB device.
Neither emulator is a physical-camera or store-admission check. Publisher transfer is separate.

Local collector checks require only Python:

```sh
python3 tests/consumers/flutter/consumer.py --self-test
```

Native builds and simulator runs belong on hosted runners. Do not run them on the operator Mac.
