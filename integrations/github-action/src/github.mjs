// SPDX-License-Identifier: MIT
// The runner's file commands and the job summary. Decoded text can hold Markdown, HTML, newlines
// or a workflow command: it is written to outputs through a delimiter it cannot contain, and to
// the summary as HTML entities inside a code element.
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { EOL } from 'node:os';

/** The action's inputs as the runner passes them: INPUT_<NAME> environment variables. */
export function readInputs(names, env = process.env) {
  return Object.fromEntries(names.map((name) => [name, env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] ?? '']));
}

/** Appends NAME=VALUE to the GITHUB_OUTPUT file, with a random delimiter absent from VALUE. */
export function setOutput(name, value, env = process.env) {
  const file = env.GITHUB_OUTPUT;
  if (!file) return false;
  const text = String(value);
  let delimiter;
  do { delimiter = `qrscan_${randomBytes(12).toString('hex')}`; } while (text.includes(delimiter));
  appendFileSync(file, `${name}<<${delimiter}${EOL}${text}${EOL}${delimiter}${EOL}`, 'utf8');
  return true;
}

export function appendSummary(markdown, env = process.env) {
  if (!env.GITHUB_STEP_SUMMARY) return false;
  appendFileSync(env.GITHUB_STEP_SUMMARY, markdown, 'utf8');
  return true;
}

/** A workflow command's data, escaped as the runner expects (%, CR, LF). */
export function commandData(text) {
  return String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** Text as inert HTML: every character outside a small safe set becomes an entity. */
export function inert(text, limit = 300) {
  const value = String(text);
  const cut = value.length > limit ? `${value.slice(0, limit)}…` : value;
  let out = '';
  for (const char of cut) {
    const code = char.codePointAt(0);
    out += /[A-Za-z0-9 ,.:;@/=?+-]/.test(char) && code < 128 ? char : `&#${code};`;
  }
  return out;
}

const STATUS = { decoded: 'decoded', 'no-code': 'no code found', unreadable: 'unreadable image', fault: 'scanner fault' };

/** The job summary of one run, from its compact report. */
export function summaryMarkdown(report) {
  const rows = [];
  for (const file of report.files) {
    const path = `<code>${inert(file.path, 200)}</code>`;
    if (file.detections.length === 0) {
      const note = file.error ? `${STATUS[file.status]}: ${inert(file.error, 200)}` : STATUS[file.status];
      rows.push(`| ${path} | ${note} | | |`);
    }
    for (const detection of file.detections) {
      const text = detection.text === null ? '<em>no verified text</em>' : `<code>${inert(detection.text)}</code>`;
      rows.push(`| ${path} | ${STATUS[file.status]} | ${inert(detection.symbology, 40)} | ${text} |`);
    }
  }
  const expected = report.expected.map((match) => `| <code>${inert(match.text)}</code> | ${match.found_in.length ? 'found' : '**missing**'} |`);
  return [
    '### QR Code & Barcode Scanner',
    '',
    `Result: **${report.result}**. qrscan ${inert(report.qrscan.version, 20)} (${inert(report.qrscan.target, 40)}), profile ${report.profile}, `
      + `budget ${report.budget_ms === 0 ? 'unbounded' : `${report.budget_ms} ms`}, ${report.files.length} file(s).`,
    '',
    '| File | Status | Format | Text |',
    '| --- | --- | --- | --- |',
    ...(rows.length ? rows : ['| | no file matched | | |']),
    '',
    ...(expected.length ? ['| Expected payload | |', '| --- | --- |', ...expected, ''] : []),
    'Decoded text is shown as data. Links in it were not opened.',
    '',
  ].join('\n');
}
