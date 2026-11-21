// On-device integration test: exercises the REAL native core (the parts the
// host-only tests under test/ can't). Run on an emulator/device:
//   cd example && flutter test integration_test
// CI runs it on an Android emulator and an iOS simulator from the staged
// candidate (.github/workflows/flutter-qualification.yml), in Flutter debug
// mode, so the Rust core is built with the package's [profile.dev].
//
// Each scan prints one `QRSCAN_TIMING` line before its assertions: the
// profile, the budget, the report's ladder time (`total_ms`), the wall time
// of the whole call seen from Dart, whether the budget cut the scan, and what
// it read. A failed assertion therefore still leaves its timing in the log.

import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:qr_barcode_scanner/qr_barcode_scanner.dart';

/// The two codes of assets/mixed-code128-qr.png, as `symbology:text`.
const mixedContents = ['code128:STOCK-4827', 'qr_code:https://qrc-ai.com/76xMa'];

/// One `QRSCAN_TIMING` log line for [report], scanned in [wall].
void logTiming(String name, String profile, int? budgetMs, ScanReport report,
    Stopwatch wall) {
  final stages = report.trace.stages
      .map((s) => '${s.stage}:${s.ms.toStringAsFixed(1)}')
      .join(',');
  // ignore: avoid_print
  print('QRSCAN_TIMING case=$name profile=$profile '
      'budget_ms=${budgetMs ?? 'default'} '
      'total_ms=${report.trace.totalMs.toStringAsFixed(1)} '
      'wall_ms=${wall.elapsedMilliseconds} '
      'budget_exhausted=${report.trace.budgetExhausted} '
      'contents=${contents(report).join('|')} stages=$stages');
}

/// Each detection as `symbology:text`, sorted.
List<String> contents(ScanReport report) =>
    (report.raw['detections'] as List)
        .map((d) => '${d['symbology']}:${d['content']['text']}')
        .toList()
      ..sort();

Future<ScanReport> timedScan(String name, Uint8List bytes,
    {required String profile, int? budgetMs}) async {
  final wall = Stopwatch()..start();
  final report = await QrcodeAiScanner.scan(bytes,
      profile: profile, budgetMs: budgetMs);
  wall.stop();
  logTiming(name, profile, budgetMs, report, wall);
  return report;
}

Future<Uint8List> asset(String name) async =>
    (await rootBundle.load('assets/$name')).buffer.asUint8List();

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async => QrcodeAiScanner.init());

  // First, so that `fast` is the process's first scan, as in the public
  // consumer runs: each default budget (fast 800 · frame 80 · full 4000 ms)
  // must hold without a warm-up.
  group('mixed QR + Code 128 under the default budgets', () {
    for (final profile in ['fast', 'frame', 'full']) {
      testWidgets(profile, (tester) async {
        final bytes = await asset('mixed-code128-qr.png');
        final report = await timedScan('mixed-default', bytes, profile: profile);
        expect(report.trace.enginePanics, 0);
        expect(contents(report), mixedContents);
        expect(report.versions.pipeline, 5);
        expect(report.versions.scoreContract, 5);
        // Last, so that a failure here means only that the budget cut the
        // scan: the reads above already held. A cut report may leave the
        // score unjudged, so the score is checked only on a final report.
        expect(report.trace.budgetExhausted, isFalse,
            reason: 'the default $profile budget cut the scan after '
                '${report.trace.totalMs.toStringAsFixed(1)} ms of ladder');
        if (profile == 'frame') {
          expect(report.score, isNull); // frame profile skips scoring
        } else {
          expect(report.score, isNotNull);
        }
      });
    }
  });

  testWidgets('decodes the bundled QR through the native core', (tester) async {
    final bytes = await asset('sample_qr.png');
    final report = await QrcodeAiScanner.scan(bytes, profile: 'full');
    expect(report.detections, isNotEmpty);
    expect(report.detections.first.content.text, isNotEmpty);
    expect(report.detections.first.symbology, Symbology.qrCode);
    expect(report.versions.scoreContract, 5);
  });

  testWidgets('a blank RGBA frame is "no QR", not an error', (tester) async {
    final blank = Uint8List(16 * 16 * 4)..fillRange(0, 16 * 16 * 4, 0xFF);
    final report = await QrcodeAiScanner.scanFrame(blank, 16, 16);
    expect(report.detections, isEmpty);
    expect(report.score, isNull); // frame profile skips scoring
  });

  testWidgets('invalid bytes throw with the QRS-001 wire code', (tester) async {
    await expectLater(
      QrcodeAiScanner.scan(Uint8List.fromList([0xDE, 0xAD, 0xBE, 0xEF])),
      throwsA(predicate((e) => '$e'.contains('QRS-001'))),
    );
  });

  group('budgetMs', () {
    testWidgets('an explicit large budget is final', (tester) async {
      final bytes = await asset('mixed-code128-qr.png');
      final report = await timedScan('mixed-budget', bytes,
          profile: 'full', budgetMs: 600000);
      expect(report.trace.budgetExhausted, isFalse);
      expect(contents(report), mixedContents);
      expect(report.score, isNotNull);
    });

    testWidgets('0 is unbounded, not a zero-millisecond budget',
        (tester) async {
      final bytes = await asset('mixed-code128-qr.png');
      for (final profile in ['fast', 'frame']) {
        final report = await timedScan('mixed-unbounded', bytes,
            profile: profile, budgetMs: 0);
        expect(report.trace.budgetExhausted, isFalse);
        expect(contents(report), mixedContents);
        expect(report.trace.stages, isNotEmpty);
      }
    });

    testWidgets('the largest admitted budget runs', (tester) async {
      final blank = Uint8List(16 * 16 * 4)..fillRange(0, 16 * 16 * 4, 0xFF);
      final report =
          await QrcodeAiScanner.scanFrame(blank, 16, 16, budgetMs: 4294967295);
      expect(report.detections, isEmpty);
      expect(report.trace.budgetExhausted, isFalse);
    });

    testWidgets('above the maximum is QRS-006, before the input is read',
        (tester) async {
      final bytes = await asset('mixed-code128-qr.png');
      final isQrs006 = predicate(
          (e) => e is String && e.endsWith('[QRS-006]') && e.contains('budget_ms'));
      await expectLater(
          QrcodeAiScanner.scan(bytes, budgetMs: 4294967296), throwsA(isQrs006));
      final blank = Uint8List(16 * 16 * 4);
      await expectLater(
          QrcodeAiScanner.scanFrame(blank, 16, 16, budgetMs: 4294967296),
          throwsA(isQrs006));
      // An invalid option beside unreadable bytes is QRS-006, never QRS-001.
      await expectLater(
          QrcodeAiScanner.scan(Uint8List.fromList([0xDE, 0xAD]),
              budgetMs: 4294967296),
          throwsA(isQrs006));
    });
  });
}
