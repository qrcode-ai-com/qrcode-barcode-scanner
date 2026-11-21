// Host tests of the Dart facade (lib/qr_barcode_scanner.dart) with
// flutter_rust_bridge in mock mode: no native library is loaded, so these pin
// what the facade hands to the bridge and what it does with the answer. The
// native core's own behavior (the budget it applies, its `[QRS-006]` refusal)
// is covered by the example app's integration_test on an emulator or simulator.

import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:qr_barcode_scanner/qr_barcode_scanner.dart';
import 'package:qr_barcode_scanner/src/rust/frb_generated.dart';

/// Records every bridge call and answers with [reply] or throws [error].
class _RecordingApi implements RustLibApi {
  final calls = <Map<String, Object?>>[];
  String reply = '';
  Object? error;

  @override
  Future<void> crateApiScanInitApp() async {}

  @override
  Future<String> crateApiScanScan({
    required List<int> image,
    required String profile,
    BigInt? budgetMs,
  }) async {
    calls.add({
      'call': 'scan',
      'bytes': image.length,
      'profile': profile,
      'budgetMs': budgetMs,
    });
    if (error != null) throw error!;
    return reply;
  }

  @override
  Future<String> crateApiScanScanFrame({
    required List<int> rgba,
    required int width,
    required int height,
    required String profile,
    BigInt? budgetMs,
  }) async {
    calls.add({
      'call': 'scanFrame',
      'bytes': rgba.length,
      'width': width,
      'height': height,
      'profile': profile,
      'budgetMs': budgetMs,
    });
    if (error != null) throw error!;
    return reply;
  }
}

void main() {
  final golden = File('../../spec/examples/no-detection.json');
  final skipReason = golden.existsSync()
      ? null
      : 'spec/examples goldens absent (run from the repo)';
  final api = _RecordingApi();
  final image = Uint8List.fromList([0x89, 0x50, 0x4E, 0x47]);
  final frame = Uint8List(2 * 3 * 4);

  setUpAll(() => RustLib.initMock(api: api));
  setUp(() {
    api.calls.clear();
    api.error = null;
    api.reply = golden.existsSync() ? golden.readAsStringSync() : '';
  });

  group('budgetMs', () {
    test('unset keeps the profile default: no budget crosses the bridge',
        () async {
      await QrcodeAiScanner.scan(image);
      await QrcodeAiScanner.scanFrame(frame, 2, 3);
      expect(api.calls, [
        {'call': 'scan', 'bytes': 4, 'profile': 'full', 'budgetMs': null},
        {
          'call': 'scanFrame',
          'bytes': 24,
          'width': 2,
          'height': 3,
          'profile': 'frame',
          'budgetMs': null,
        },
      ]);
    }, skip: skipReason);

    test('0 (unbounded) and the largest admitted budget cross unchanged',
        () async {
      await QrcodeAiScanner.scan(image, profile: 'fast', budgetMs: 0);
      await QrcodeAiScanner.scan(image, budgetMs: 4294967295);
      await QrcodeAiScanner.scanFrame(frame, 2, 3, budgetMs: 80);
      expect(api.calls.map((c) => c['budgetMs']).toList(), [
        BigInt.zero,
        BigInt.from(4294967295),
        BigInt.from(80),
      ]);
      expect(api.calls.first['profile'], 'fast');
    }, skip: skipReason);

    test('a budget above the maximum is left to the core', () async {
      // The facade does not clamp or pre-check the maximum: the value
      // reaches the core, whose QRS-006 error comes back unchanged.
      const refusal = 'invalid option `budget_ms`: 4294967296 ms is above the '
          'maximum 4294967295 ms (no budget = unbounded) [QRS-006]';
      api.error = refusal;
      await expectLater(
        QrcodeAiScanner.scan(image, budgetMs: 4294967296),
        throwsA(refusal),
      );
      expect(api.calls.single['budgetMs'], BigInt.from(4294967296));
    });

    test('a negative budget throws a RangeError before the bridge', () async {
      await expectLater(
        QrcodeAiScanner.scan(image, budgetMs: -1),
        throwsA(isA<RangeError>()
            .having((e) => e.name, 'name', 'budgetMs')
            .having((e) => e.invalidValue, 'invalidValue', -1)),
      );
      await expectLater(
        QrcodeAiScanner.scanFrame(frame, 2, 3, budgetMs: -80),
        throwsA(isA<RangeError>()
            .having((e) => e.name, 'name', 'budgetMs')
            .having((e) => e.invalidValue, 'invalidValue', -80)),
      );
      expect(api.calls, isEmpty);
    });
  });

  test('a scan fault comes back as the bridge threw it', () async {
    api.error = 'invalid image: unsupported format [QRS-001]';
    await expectLater(
      QrcodeAiScanner.scan(image),
      throwsA(predicate((e) => '$e'.endsWith('[QRS-001]'))),
    );
    expect(api.calls.single['budgetMs'], isNull);
  });

  test('the report the bridge returns is parsed', () async {
    final report = await QrcodeAiScanner.scan(image, budgetMs: 0);
    expect(report.detections, isEmpty);
    expect(report.versions.scoreContract, 5);
  }, skip: skipReason);
}
