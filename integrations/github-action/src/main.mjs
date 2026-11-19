// SPDX-License-Identifier: MIT
// Entry point of the action: install the pinned qrscan, scan the matched files, write the report
// file, the outputs and the job summary, and fail the step when the result asks for it.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendSummary, commandData, readInputs, setOutput, summaryMarkdown } from './github.mjs';
import { install, InstallError } from './install.mjs';
import { DEFAULT_VERSION } from './releases.mjs';
import { buildReports, findFiles, InputError, judge, parseOptions, scanAll } from './scan.mjs';

const INPUTS = ['files', 'expected', 'profile', 'budget-ms', 'fail-on', 'max-files', 'version', 'sums-sha256'];

export async function run({ env = process.env, log = console.log, installImpl = install, runImpl } = {}) {
  const inputs = readInputs(INPUTS, env);
  const workspace = env.GITHUB_WORKSPACE || process.cwd();
  const temp = join(env.RUNNER_TEMP || tmpdir(), 'qrcode-barcode-scanner-action');
  const options = parseOptions(inputs);
  const files = findFiles(workspace, options.patterns, options.maxFiles);
  const version = (inputs.version || DEFAULT_VERSION).trim();
  const installed = await installImpl({ version, sumsSha256: inputs['sums-sha256'], root: join(temp, 'qrscan') });
  log(`qrscan ${installed.version} for ${installed.target}${installed.reused ? ' (already installed)' : ''}: ${installed.path}`);
  setOutput('qrscan-path', installed.path, env);
  const scans = await scanAll(installed.path, workspace, files, options, runImpl);
  const verdict = judge(scans, options.expected, options.failOn);
  const reports = buildReports({ version: installed.version, target: installed.target, profile: options.profile,
    budgetMs: options.budgetMs, failOn: options.failOn, scans, verdict });
  mkdirSync(temp, { recursive: true });
  const reportPath = join(temp, `report-${randomBytes(6).toString('hex')}.json`);
  writeFileSync(reportPath, `${JSON.stringify(reports.full, null, 2)}\n`, 'utf8');
  setOutput('report', JSON.stringify(reports.compact), env);
  setOutput('report-path', reportPath, env);
  setOutput('result', verdict.result, env);
  appendSummary(summaryMarkdown(reports.compact), env);
  // Decoded text goes to the log as JSON strings, between stop-commands markers, so a payload
  // cannot start a workflow command.
  const token = randomBytes(16).toString('hex');
  log(`::stop-commands::${token}`);
  for (const scan of scans) {
    log(`${scan.path}: ${scan.status}${scan.error ? ` (${scan.error})` : ''}`);
    for (const detection of scan.detections ?? []) log(`  ${detection.symbology} ${JSON.stringify(detection.text)}`);
  }
  log(`::${token}::`);
  log(`result: ${verdict.result}${verdict.missing.length ? `, ${verdict.missing.length} expected payload(s) missing` : ''}`);
  return { verdict, reports, reportPath, installed };
}

const MESSAGES = {
  missing: 'an expected payload was not decoded from any file',
  'no-code': 'a file holds no code',
  unreadable: 'qrscan could not read a file as an image',
  'no-files': 'the files patterns matched no file',
  fault: 'qrscan failed',
};

export async function main(env = process.env) {
  try {
    const { verdict } = await run({ env });
    if (verdict.fails) {
      console.log(`::error title=QR Code & Barcode Scanner::${commandData(`${verdict.result}: ${MESSAGES[verdict.result]}`)}`);
      process.exitCode = 1;
    }
  } catch (error) {
    const known = error instanceof InputError || error instanceof InstallError;
    setOutput('result', 'fault', env);
    console.log(`::error title=QR Code & Barcode Scanner::${commandData(known ? error.message : `${error.name}: ${error.message}`)}`);
    process.exitCode = 1;
  }
}
