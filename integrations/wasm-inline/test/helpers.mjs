// SPDX-License-Identifier: MIT
// What the tests share: this folder as a consuming root, the checked mixed fixture and its truth.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = resolve(HERE, '..', '..');
export const ENGINE = '0.11.0';
export const WASM_SHA256 = 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68';
// The two codes of fixtures/symbology/mixed-code128-qr.png (case qr-and-code128 of
// fixtures/consumer-truth.json), each exactly once, sorted by symbology.
export const EXPECTED = [['code128', 'STOCK-4827'], ['qr_code', 'https://qrc-ai.com/76xMa']];
export const PROFILES = ['fast', 'frame', 'full'];

export const contents = (report) => report.detections
  .map((row) => [row.symbology, row.content.text]).sort();

export const scratch = (name) => mkdtempSync(join(tmpdir(), `qrscan-inline-${name}-`));

/** The checked fixture, copied outside the checkout as a user's own file would be. */
export function stageFixture(directory = scratch('fixture')) {
  return execFileSync('python3', [join(ROOT, 'scripts/destination-acceptance.py'), 'stage',
    directory], { encoding: 'utf8' }).trim();
}

/** Assert one report of the fixture: the two codes, uncut, from engine 0.11.0. */
export function assertMixed(assert, report, label) {
  assert.deepEqual(contents(report), EXPECTED, `${label}: the two exact payloads, nothing else`);
  assert.equal(report.trace.budget_exhausted, false, `${label}: not cut by a budget`);
  assert.equal(report.trace.engine_panics, 0, `${label}: no engine panic`);
  assert.equal(report.versions.scanner, ENGINE, `${label}: engine ${ENGINE}`);
}
