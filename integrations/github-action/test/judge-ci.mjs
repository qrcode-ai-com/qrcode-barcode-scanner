// SPDX-License-Identifier: MIT
// Judges the three action steps of a CI job from their outputs, passed as environment variables:
// the mixed fixture must pass with both payloads, a mismatched payload must fail as `missing`,
// and a file that is not an image must fail as `unreadable`.
import assert from 'node:assert/strict';

const env = process.env;
assert.equal(env.MIXED_RESULT, 'pass', 'the mixed fixture');
const report = JSON.parse(env.MIXED_REPORT);
assert.equal(report.schema, 'qrcode-barcode-scanner-action/1');
assert.equal(report.files.length, 1);
const texts = report.files[0].detections.map((d) => `${d.symbology} ${d.text}`).sort();
assert.deepEqual(texts, ['code128 STOCK-4827', 'qr_code https://qrc-ai.com/76xMa']);
assert.equal(report.files[0].budget_exhausted, false);
assert.deepEqual(report.missing, []);
assert.deepEqual([env.MISMATCH_OUTCOME, env.MISMATCH_RESULT], ['failure', 'missing'], 'the mismatched payload');
assert.deepEqual([env.UNREADABLE_OUTCOME, env.UNREADABLE_RESULT], ['failure', 'unreadable'], 'the file that is not an image');
console.log(`ok: ${report.qrscan.version} on ${report.qrscan.target}, profile ${report.profile}: ${texts.join(', ')}`);
