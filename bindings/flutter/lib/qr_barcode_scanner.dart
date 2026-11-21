/// QR Code AI Scanner — QR decoding + scannability scoring for artistic /
/// AI-generated QR codes (the ones that break standard scanners). Native Rust
/// core via flutter_rust_bridge.
///
/// ```dart
/// import 'package:qr_barcode_scanner/qr_barcode_scanner.dart';
///
/// await QrcodeAiScanner.init();                 // once, before any scan
/// final report = await QrcodeAiScanner.scan(pngBytes);
/// final text = report.detections.isEmpty
///     ? 'no QR'
///     : report.detections.first.content.text;   // typed, no JSON wrangling
/// ```
library;

import 'dart:typed_data';

import 'report.dart';
import 'src/rust/api/scan.dart' as ffi;
import 'src/rust/frb_generated.dart';

export 'report.dart';
export 'src/rust/frb_generated.dart' show RustLib;

/// The QR scanner. One Rust core, the same versioned [ScanReport] as the
/// Python / Node / WASM / Kotlin / Swift bindings (one serde wire contract).
///
/// Scans run on flutter_rust_bridge's Rust worker pool, so `await` never blocks
/// the UI isolate. Valid `profile`s are `'full'` (default for [scan]), `'fast'`,
/// and `'frame'` (default for [scanFrame]). "No QR found" is a normal result
/// (empty [ScanReport.detections]), not an error. A scan fault throws a
/// `String` ending with the `[QRS-xxx]` wire code; an unknown profile name
/// throws without a code.
///
/// Budget: [scan] and [scanFrame] run under the profile's default wall-clock
/// budget (`full` 4000 ms · `fast` 800 ms · `frame` 80 ms) unless `budgetMs`
/// says otherwise: `null` keeps that default, `0` is unbounded (NOT a
/// zero-millisecond budget; the reproducible mode), and 1 to 4294967295 is the
/// budget in milliseconds. The clock starts once the image is decoded and
/// normalized. A larger budget throws the core's `[QRS-006]` before the image
/// is read; a negative one throws a [RangeError] before the native call.
/// A report the budget cut says so: `trace.budgetExhausted == true`. Then empty
/// detections are not a final "no QR", and a null [ScanReport.score] beside
/// detections means "not judged" — never a zero. Read
/// `budgetExhausted == false` as final; null (an older report) is unknown.
class QrcodeAiScanner {
  QrcodeAiScanner._();

  /// Initialise the native bridge. Call once at app start before any scan.
  static Future<void> init() => RustLib.init();

  /// Decode + score an encoded image (PNG · JPEG · WebP · GIF).
  ///
  /// [budgetMs] overrides the profile's wall-clock budget (`null`: the
  /// profile default, `0`: unbounded); see [QrcodeAiScanner].
  static Future<ScanReport> scan(
    Uint8List imageBytes, {
    String profile = 'full',
    int? budgetMs,
  }) async {
    final json = await ffi.scan(
      image: imageBytes,
      profile: profile,
      budgetMs: _budget(budgetMs),
    );
    return ScanReport.parse(json);
  }

  /// Decode + score a raw RGBA camera frame. [rgba] must be `width * height * 4`
  /// bytes (a browser `ImageData`-shaped buffer).
  ///
  /// [budgetMs] overrides the profile's wall-clock budget (`null`: the
  /// profile default, `0`: unbounded): the camera loop's per-frame bound.
  static Future<ScanReport> scanFrame(
    Uint8List rgba,
    int width,
    int height, {
    String profile = 'frame',
    int? budgetMs,
  }) async {
    final json = await ffi.scanFrame(
      rgba: rgba,
      width: width,
      height: height,
      profile: profile,
      budgetMs: _budget(budgetMs),
    );
    return ScanReport.parse(json);
  }

  /// The native budget is an unsigned 64-bit integer. A negative Dart `int`
  /// has no such value, so it is refused here, the way Python's integer
  /// conversion refuses one; the range above 4294967295 is the core's to
  /// refuse (`QRS-006`, spec/02 § Option domains).
  static BigInt? _budget(int? budgetMs) {
    if (budgetMs == null) return null;
    RangeError.checkNotNegative(budgetMs, 'budgetMs');
    return BigInt.from(budgetMs);
  }
}
