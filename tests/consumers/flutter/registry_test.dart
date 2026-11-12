import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:qr_barcode_scanner/qr_barcode_scanner.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(QrcodeAiScanner.init);

  for (final profile in ['fast', 'frame', 'full']) {
    testWidgets('public package scans the mixed fixture in $profile', (
      tester,
    ) async {
      final bytes = (await rootBundle.load('assets/mixed.png')).buffer
          .asUint8List();
      final report = await QrcodeAiScanner.scan(bytes, profile: profile);
      // Device logs may truncate a long line; the host requires every exact chunk.
      final encoded = base64Encode(utf8.encode(jsonEncode(report.raw)));
      final count = (encoded.length + 1199) ~/ 1200;
      for (var index = 0; index < count; index++) {
        final end = ((index + 1) * 1200).clamp(0, encoded.length);
        // ignore: avoid_print
        print(
          'QRSCAN_REPORT:$profile:$index:$count:${encoded.substring(index * 1200, end)}',
        );
      }
      expect(report.versions.scanner, '0.11.0');
      expect(report.versions.pipeline, 5);
      expect(report.versions.scoreContract, 5);
      expect(report.trace.budgetExhausted, false);
      expect(report.trace.enginePanics, 0);
      final rows =
          (report.raw['detections'] as List)
              .map((d) => '${d['symbology']}:${d['content']['text']}')
              .toList()
            ..sort();
      expect(rows, ['code128:STOCK-4827', 'qr_code:https://qrc-ai.com/76xMa']);
      for (final detection in report.detections) {
        expect(detection.content.raw, utf8.encode(detection.content.text));
      }
      if (profile == 'full') expect(report.score, isNotNull);
    });
  }

  testWidgets('public package preserves a blank frame as an empty result', (
    tester,
  ) async {
    final blank = Uint8List(16 * 16 * 4)..fillRange(0, 16 * 16 * 4, 255);
    final report = await QrcodeAiScanner.scanFrame(blank, 16, 16);
    expect(report.detections, isEmpty);
    expect(report.score, isNull);
    expect(report.trace.budgetExhausted, false);
    expect(report.trace.enginePanics, 0);
    // ignore: avoid_print
    print('QRSCAN_CASE:blank-frame:PASS');
  });

  testWidgets('public package preserves the invalid-image error', (
    tester,
  ) async {
    await expectLater(
      QrcodeAiScanner.scan(Uint8List.fromList([0xde, 0xad, 0xbe, 0xef])),
      throwsA(predicate((error) => '$error'.contains('QRS-001'))),
    );
    // ignore: avoid_print
    print('QRSCAN_CASE:invalid-image:PASS');
  });
}
