// SPDX-License-Identifier: MIT
// The published qrscan on the mixed fixture, through the action's own code. It runs when
// QRSCAN_ACTION_LIVE=1 (the action downloads and checks the pinned release for this machine) or
// when QRSCAN names an installed qrscan; otherwise it is skipped with that reason.
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { install } from '../src/install.mjs';
import { run } from '../src/main.mjs';
import { CODE128, mixedFixture, QR } from './helpers.mjs';

const live = process.env.QRSCAN_ACTION_LIVE === '1';
const given = process.env.QRSCAN;
const skip = !live && !given && 'set QRSCAN_ACTION_LIVE=1 or QRSCAN=<path to qrscan> to scan with the published engine';

async function workspace() {
  const root = mkdtempSync(join(tmpdir(), 'qrscan-live-'));
  mkdirSync(join(root, 'images'));
  copyFileSync(mixedFixture(), join(root, 'images/mixed-code128-qr.png'));
  writeFileSync(join(root, 'images/not-an-image.png'), 'these bytes are not an image');
  return root;
}

let installed;
async function qrscan(temp) {
  if (given) return { path: given, version: 'installed', target: 'local', reused: true };
  installed ??= await install({ root: join(temp, 'qrscan') });
  return installed;
}

for (const profile of ['fast', 'frame', 'full']) {
  test(`the mixed fixture gives both payloads in ${profile}`, { skip }, async () => {
    const root = await workspace();
    const temp = mkdtempSync(join(tmpdir(), 'qrscan-live-temp-'));
    const env = { GITHUB_WORKSPACE: root, RUNNER_TEMP: temp, INPUT_FILES: 'images/mixed-*.png', INPUT_EXPECTED: `${QR}\n${CODE128}`,
      INPUT_PROFILE: profile, 'INPUT_BUDGET-MS': '0', 'INPUT_FAIL-ON': 'missing', 'INPUT_MAX-FILES': '5' };
    const { verdict, reportPath } = await run({ env, log: () => {}, installImpl: () => qrscan(temp) });
    assert.equal(verdict.result, 'pass');
    const full = JSON.parse(readFileSync(reportPath, 'utf8'));
    const texts = full.files[0].detections.map((d) => [d.symbology, d.text]).sort();
    assert.deepEqual(texts, [['code128', CODE128], ['qr_code', QR]]);
    assert.equal(full.files[0].budget_exhausted, false);
    assert.equal(full.files[0].report.trace.budget_exhausted, false);
  });

  test(`a mismatched payload and an unreadable image get their own result in ${profile}`, { skip }, async () => {
    const root = await workspace();
    const temp = mkdtempSync(join(tmpdir(), 'qrscan-live-temp-'));
    const base = { GITHUB_WORKSPACE: root, RUNNER_TEMP: temp, INPUT_PROFILE: profile, 'INPUT_BUDGET-MS': '0', 'INPUT_FAIL-ON': 'missing' };
    const mismatch = await run({ env: { ...base, INPUT_FILES: 'images/mixed-*.png', INPUT_EXPECTED: 'STOCK-0000' }, log: () => {}, installImpl: () => qrscan(temp) });
    assert.deepEqual([mismatch.verdict.result, mismatch.verdict.fails, mismatch.verdict.missing], ['missing', true, ['STOCK-0000']]);
    const unreadable = await run({ env: { ...base, INPUT_FILES: 'images/not-an-image.png' }, log: () => {}, installImpl: () => qrscan(temp) });
    assert.deepEqual([unreadable.verdict.result, unreadable.verdict.fails], ['unreadable', true]);
    assert.match(unreadable.reports.compact.files[0].error, /QRS-001/);
  });
}
