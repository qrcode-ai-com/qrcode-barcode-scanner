// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { inert, setOutput, summaryMarkdown } from '../src/github.mjs';
import { run } from '../src/main.mjs';
import { buildReports, findFiles, judge, parseOptions, patternRegExp, runQrscan } from '../src/scan.mjs';
import { CODE128, QR } from './helpers.mjs';

const REPORT = (detections) => JSON.stringify({ detections: detections.map(([symbology, text]) => ({
  symbology, content: { text, raw: Buffer.from(text).toString('base64'), charset: 'utf8' } })), trace: { budget_exhausted: false } });
const MIXED = REPORT([['qr_code', QR], ['code128', CODE128]]);

/** A stand-in for execFile: answers by file name, records the arguments. */
function fakeRun(answers) {
  const calls = [];
  const impl = (command, args, options, callback) => {
    calls.push({ command, args, options });
    const name = args[0].split(/[\\/]/).pop();
    const [exit, stdout, stderr = ''] = answers[name] ?? [2, '', 'no such file'];
    const error = exit === 0 ? null : Object.assign(new Error(`exit ${exit}`), { code: exit });
    setImmediate(() => callback(error, stdout, stderr));
  };
  impl.calls = calls;
  return impl;
}

test('glob patterns cross folders only with **', () => {
  assert.ok(patternRegExp('**/*.png').test('a/b/c.png'));
  assert.ok(patternRegExp('**/*.png').test('c.png'));
  assert.ok(!patternRegExp('*.png').test('a/c.png'));
  assert.ok(patternRegExp('labels/?.png').test('labels/1.png'));
  assert.ok(!patternRegExp('labels/?.png').test('labels/10.png'));
  assert.ok(patternRegExp('a.b(c)/x+y.png').test('a.b(c)/x+y.png'));
  assert.ok(!patternRegExp('a.png').test('aXpng'));
});

test('files are found in the workspace, sorted, without links, .git or excluded paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'qrscan-ws-'));
  for (const path of ['b/2.png', 'a/1.png', 'a/skip.png', '.git/x.png', 'c.jpg']) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), 'x');
  }
  if (process.platform !== 'win32') symlinkSync(join(root, 'a'), join(root, 'link'));
  assert.deepEqual(findFiles(root, ['**/*.png', '!a/skip.png'], 10), ['a/1.png', 'b/2.png']);
  assert.deepEqual(findFiles(root, ['./c.jpg'], 10), ['c.jpg']);
  assert.throws(() => findFiles(root, ['**/*.png'], 2), /match 3 files, more than max-files \(2\)/);
  assert.throws(() => findFiles(root, ['../outside/*.png'], 10), /climbs out/);
  assert.throws(() => findFiles(root, ['/etc/*.png'], 10), /is absolute/);
  assert.deepEqual(findFiles(root, ['none/*.png'], 10), []);
});

test('inputs are validated with the reason in the message', () => {
  const base = { files: 'a.png', expected: '', profile: '', 'budget-ms': '', 'fail-on': '', 'max-files': '' };
  assert.deepEqual(parseOptions(base), { profile: 'full', budgetMs: 0, failOn: 'missing', maxFiles: 100, patterns: ['a.png'], expected: [] });
  assert.deepEqual(parseOptions({ ...base, files: '# comment\n a.png \n\n!b.png', expected: `${QR}\r\n${QR}\n#tag` }).expected, [QR, '#tag']);
  assert.throws(() => parseOptions({ ...base, profile: 'slow' }), /profile must be one of fast, frame, full/);
  assert.throws(() => parseOptions({ ...base, 'budget-ms': '-1' }), /budget-ms must be a whole number/);
  assert.throws(() => parseOptions({ ...base, 'fail-on': 'always' }), /fail-on must be one of/);
  assert.throws(() => parseOptions({ ...base, 'max-files': '0' }), /max-files/);
  assert.throws(() => parseOptions({ ...base, files: '\n# only a comment\n' }), /at least one pattern/);
});

test('each qrscan outcome is classified, and the arguments carry no shell', async () => {
  const runImpl = fakeRun({ 'mixed.png': [0, MIXED], 'white.png': [1, REPORT([])], 'bad.png': [2, '', '✖ unsupported or corrupt image [QRS-001]'],
    'crash.png': [101, '', 'panicked'], 'garbage.png': [0, 'not json'], 'liar.png': [0, REPORT([])] });
  const options = { profile: 'frame', budgetMs: 0 };
  const mixed = await runQrscan('/bin/qrscan', '/w/mixed.png', options, runImpl);
  assert.equal(mixed.status, 'decoded');
  assert.deepEqual(mixed.detections.map((d) => [d.symbology, d.text]), [['qr_code', QR], ['code128', CODE128]]);
  assert.deepEqual(runImpl.calls[0].args, ['/w/mixed.png', '--profile', 'frame', '--budget-ms', '0']);
  assert.equal(runImpl.calls[0].options.shell, false);
  assert.equal((await runQrscan('q', '/w/white.png', options, runImpl)).status, 'no-code');
  const bad = await runQrscan('q', '/w/bad.png', options, runImpl);
  assert.deepEqual([bad.status, bad.exit], ['unreadable', 2]);
  assert.match(bad.error, /QRS-001/);
  assert.equal((await runQrscan('q', '/w/crash.png', options, runImpl)).status, 'fault');
  assert.match((await runQrscan('q', '/w/garbage.png', options, runImpl)).error, /no JSON report/);
  assert.match((await runQrscan('q', '/w/liar.png', options, runImpl)).error, /exited 0 with 0 detection/);
});

test('the verdict ranks faults above unreadable images above missing payloads', () => {
  const decoded = { path: 'm.png', status: 'decoded', detections: [{ symbology: 'qr_code', text: QR, raw: null }] };
  const empty = { path: 'w.png', status: 'no-code', detections: [] };
  assert.deepEqual(judge([decoded], [QR], 'missing'), { result: 'pass', fails: false, matches: [{ text: QR, found_in: ['m.png'] }], missing: [] });
  assert.equal(judge([decoded], [CODE128], 'missing').result, 'missing');
  assert.equal(judge([decoded], [CODE128], 'missing').fails, true);
  assert.equal(judge([decoded], [CODE128], 'never').fails, false);
  assert.equal(judge([decoded, empty], [], 'missing').result, 'pass');
  assert.equal(judge([decoded, empty], [], 'no-code').result, 'no-code');
  assert.equal(judge([decoded, { path: 'b', status: 'unreadable' }], [CODE128], 'never').result, 'unreadable');
  assert.equal(judge([decoded, { path: 'b', status: 'unreadable' }], [], 'never').fails, true);
  assert.equal(judge([{ path: 'c', status: 'fault' }, { path: 'b', status: 'unreadable' }], [], 'missing').result, 'fault');
  assert.deepEqual([judge([], [], 'never').result, judge([], [], 'never').fails], ['no-files', true]);
});

test('decoded text cannot inject Markdown, HTML, outputs or workflow commands', () => {
  const hostile = 'x | <script>alert(1)</script> [link](https://evil.test) `code`\n::set-output name=result::pass';
  const html = inert(hostile);
  assert.doesNotMatch(html, /[<>|`[\]\n]/);
  assert.match(html, /&#60;script&#62;/);
  const verdict = judge([{ path: 'a|b.png', status: 'decoded', detections: [{ symbology: 'qr_code', text: hostile, raw: null }] }], [], 'missing');
  const { compact } = buildReports({ version: '1.2.3', target: 't', profile: 'full', budgetMs: 0, failOn: 'missing',
    scans: [{ path: 'a|b.png', status: 'decoded', detections: [{ symbology: 'qr_code', text: hostile, raw: null }] }], verdict });
  const summary = summaryMarkdown(compact);
  assert.doesNotMatch(summary, /<script|\n::|\[link\]/);
  for (const row of summary.split('\n').filter((line) => line.startsWith('| <code>a'))) assert.equal(row.split('|').length, 6);
  const dir = mkdtempSync(join(tmpdir(), 'qrscan-out-'));
  const env = { GITHUB_OUTPUT: join(dir, 'out') };
  setOutput('report', hostile, env);
  const written = readFileSync(env.GITHUB_OUTPUT, 'utf8');
  const delimiter = /^report<<(\S+)$/m.exec(written)[1];
  assert.equal(written.split(delimiter).length, 3, 'the delimiter appears only around the value');
  assert.ok(written.includes(hostile));
});

test('a run writes the result, the compact report, the full report file and the summary', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'qrscan-run-'));
  const temp = mkdtempSync(join(tmpdir(), 'qrscan-temp-'));
  mkdirSync(join(workspace, 'labels'));
  for (const name of ['mixed.png', 'white.png']) writeFileSync(join(workspace, 'labels', name), 'x');
  const env = { GITHUB_WORKSPACE: workspace, RUNNER_TEMP: temp, GITHUB_OUTPUT: join(temp, 'out'), GITHUB_STEP_SUMMARY: join(temp, 'summary'),
    INPUT_FILES: 'labels/*.png', INPUT_EXPECTED: `${QR}\n${CODE128}`, INPUT_PROFILE: 'fast', 'INPUT_BUDGET-MS': '0',
    'INPUT_FAIL-ON': 'missing', 'INPUT_MAX-FILES': '10', INPUT_VERSION: '', 'INPUT_SUMS-SHA256': '' };
  const installImpl = async ({ root }) => ({ path: join(root, 'qrscan'), version: '1.2.3', target: 'test-target', reused: false });
  const logged = [];
  const runImpl = fakeRun({ 'mixed.png': [0, MIXED], 'white.png': [1, REPORT([])] });
  const { verdict, reportPath } = await run({ env, log: (line) => logged.push(line), installImpl, runImpl });
  assert.equal(verdict.result, 'pass');
  const outputs = Object.fromEntries([...readFileSync(env.GITHUB_OUTPUT, 'utf8').matchAll(/^([\w-]+)<<(\S+)\r?\n([\s\S]*?)\r?\n\2$/gm)].map((m) => [m[1], m[3]]));
  assert.equal(outputs.result, 'pass');
  assert.equal(outputs['report-path'], reportPath);
  const compact = JSON.parse(outputs.report);
  assert.deepEqual(compact.files.map((f) => [f.path, f.status, f.detections.map((d) => d.text)]),
    [['labels/mixed.png', 'decoded', [QR, CODE128]], ['labels/white.png', 'no-code', []]]);
  assert.equal(compact.files[0].detections[0].raw, undefined, 'the compact report leaves raw bytes to the file');
  const full = JSON.parse(readFileSync(reportPath, 'utf8'));
  assert.equal(full.files[0].report.detections.length, 2);
  assert.equal(full.qrscan.version, '1.2.3');
  assert.match(readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8'), /Result: \*\*pass\*\*/);
  const stop = logged.findIndex((line) => line.startsWith('::stop-commands::'));
  const resume = logged.findIndex((line) => line === `::${logged[stop].slice('::stop-commands::'.length)}::`);
  assert.ok(stop >= 0 && resume > stop, 'decoded text is logged between stop-commands markers');
  assert.ok(logged.slice(stop + 1, resume).some((line) => line.includes(JSON.stringify(QR))));
});
