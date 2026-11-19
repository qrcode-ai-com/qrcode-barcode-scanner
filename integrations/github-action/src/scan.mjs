// SPDX-License-Identifier: MIT
// Finds the files the patterns name, runs qrscan once per file and judges the reports against the
// expected payloads. Decoded text is attacker-controlled data: it is compared and stored, never
// evaluated, opened or written into an environment file.
import { execFile } from 'node:child_process';
import { lstatSync, readdirSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';

export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

export const PROFILES = ['fast', 'frame', 'full'];
export const FAIL_ON = ['missing', 'no-code', 'never'];
export const SCHEMA = 'qrcode-barcode-scanner-action/1';

/** The newline-separated lines of an input, trimmed, without empty lines (nor `#` comments when asked). */
export function lines(text, { comments = false } = {}) {
  return String(text ?? '').split(/\r?\n/).map((line) => line.trim())
    .filter((line) => line && !(comments && line.startsWith('#')));
}

/** A glob pattern as a regular expression over a `/`-separated relative path. */
export function patternRegExp(pattern) {
  let source = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*') {
      if (pattern[index + 1] === '*') {
        const slash = pattern[index + 2] === '/';
        source += slash ? '(?:[^/]*/)*' : '.*';
        index += slash ? 2 : 1;
      } else source += '[^/]*';
    } else if (char === '?') source += '[^/]';
    else source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

function checkPattern(pattern) {
  const clean = pattern.replace(/\\/g, '/');
  if (isAbsolute(pattern) || /^[A-Za-z]:/.test(clean) || clean.startsWith('/')) {
    throw new InputError(`files: ${JSON.stringify(pattern)} is absolute; write it relative to the workspace`);
  }
  if (clean.split('/').includes('..')) throw new InputError(`files: ${JSON.stringify(pattern)} climbs out of the workspace`);
  return clean.replace(/^\.\//, '');
}

/** Workspace-relative paths of the regular files the patterns match, sorted, at most LIMIT. */
export function findFiles(root, patterns, limit) {
  const include = [];
  const exclude = [];
  for (const raw of patterns) {
    if (raw.startsWith('!')) exclude.push(patternRegExp(checkPattern(raw.slice(1))));
    else include.push(patternRegExp(checkPattern(raw)));
  }
  if (include.length === 0) throw new InputError('files: give at least one pattern');
  const found = [];
  const walk = (directory, prefix) => {
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Links are not followed: a link can point outside the workspace or into a cycle.
      if (entry.isDirectory()) {
        if (entry.name !== '.git') walk(join(directory, entry.name), relative);
      } else if (entry.isFile() && include.some((re) => re.test(relative)) && !exclude.some((re) => re.test(relative))) {
        found.push(relative);
      }
    }
  };
  walk(root, '');
  if (found.length > limit) throw new InputError(`files: the patterns match ${found.length} files, more than max-files (${limit})`);
  return found;
}

function decodeRaw(raw) {
  return typeof raw === 'string' ? Buffer.from(raw, 'base64') : null;
}

/** The detections of a report as plain values: symbology, text (null when unknown), raw base64. */
export function detectionsOf(report) {
  return (Array.isArray(report?.detections) ? report.detections : []).map((detection) => ({
    symbology: String(detection?.symbology ?? 'unknown'),
    text: typeof detection?.content?.text === 'string' ? detection.content.text : null,
    raw: typeof detection?.content?.raw === 'string' ? detection.content.raw : null,
    charset: detection?.content?.charset ?? null,
  }));
}

/** Runs qrscan once and classifies the outcome. Never throws for a scan outcome. */
export function runQrscan(qrscan, file, { profile, budgetMs, timeoutMs = 120000 }, run = execFile) {
  return new Promise((done) => {
    run(qrscan, [file, '--profile', profile, '--budget-ms', String(budgetMs)],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: timeoutMs, windowsHide: true, shell: false },
      (error, stdout, stderr) => {
        const exit = error ? (typeof error.code === 'number' ? error.code : null) : 0;
        const message = String(stderr ?? '').trim().slice(0, 500);
        if (exit === 0 || exit === 1) {
          try {
            const report = JSON.parse(stdout);
            const detections = detectionsOf(report);
            const status = detections.length > 0 ? 'decoded' : 'no-code';
            if ((exit === 0) !== (status === 'decoded')) {
              done({ status: 'fault', exit, error: `qrscan exited ${exit} with ${detections.length} detection(s)` });
            } else {
              done({ status, exit, report, detections, budgetExhausted: report?.trace?.budget_exhausted === true });
            }
          } catch {
            done({ status: 'fault', exit, error: 'qrscan printed no JSON report' });
          }
        } else if (exit === 2) {
          done({ status: 'unreadable', exit, error: message || 'qrscan refused the input' });
        } else {
          const why = error?.killed ? `qrscan was stopped after ${timeoutMs} ms` : error?.signal ? `qrscan ended on ${error.signal}` : `qrscan exited ${exit ?? error?.code}`;
          done({ status: 'fault', exit, error: message ? `${why}: ${message}` : why });
        }
      });
  });
}

const RANK = { pass: 0, 'no-code': 1, missing: 2, unreadable: 3, 'no-files': 4, fault: 5 };

/** The overall result and whether the step fails, from the scans and the expected payloads. */
export function judge(scans, expected, failOn) {
  const texts = new Map();
  for (const scan of scans) {
    for (const detection of scan.detections ?? []) {
      const values = new Set([detection.text]);
      const raw = decodeRaw(detection.raw);
      if (raw) values.add(raw.toString('utf8'));
      for (const value of values) {
        if (value === null) continue;
        if (!texts.has(value)) texts.set(value, []);
        if (!texts.get(value).includes(scan.path)) texts.get(value).push(scan.path);
      }
    }
  }
  const matches = expected.map((text) => ({ text, found_in: texts.get(text) ?? [] }));
  const missing = matches.filter((match) => match.found_in.length === 0).map((match) => match.text);
  let result = 'pass';
  const raise = (next) => { if (RANK[next] > RANK[result]) result = next; };
  if (scans.length === 0) raise('no-files');
  for (const scan of scans) {
    if (scan.status === 'fault') raise('fault');
    else if (scan.status === 'unreadable') raise('unreadable');
    else if (scan.status === 'no-code' && failOn === 'no-code') raise('no-code');
  }
  if (missing.length) raise('missing');
  const always = ['fault', 'unreadable', 'no-files'];
  const fails = always.includes(result) || (failOn !== 'never' && result !== 'pass');
  return { result, fails, matches, missing };
}

/** The reports of one run: the compact one for the step output and the full one for the file. */
export function buildReports({ version, target, profile, budgetMs, failOn, scans, verdict }) {
  const compactText = (value) => (value !== null && value.length > 1000 ? `${value.slice(0, 1000)}…` : value);
  const common = { schema: SCHEMA, qrscan: { version, target }, profile, budget_ms: budgetMs, fail_on: failOn, result: verdict.result };
  const file = (scan, full) => ({
    path: scan.path,
    status: scan.status,
    exit: scan.exit ?? null,
    budget_exhausted: scan.budgetExhausted ?? false,
    error: scan.error ?? null,
    detections: (scan.detections ?? []).map((d) => ({ ...d, text: full ? d.text : compactText(d.text), raw: full ? d.raw : undefined })),
    ...(full ? { report: scan.report ?? null } : {}),
  });
  return {
    compact: { ...common, files: scans.map((scan) => file(scan, false)), expected: verdict.matches, missing: verdict.missing },
    full: { ...common, files: scans.map((scan) => file(scan, true)), expected: verdict.matches, missing: verdict.missing },
  };
}

/** Scans every file in order; ROOT is the workspace, FILES are relative to it. */
export async function scanAll(qrscan, root, files, options, run) {
  const scans = [];
  for (const path of files) {
    // An absolute path never starts with `-`, so a file name cannot be read as an option.
    const absolute = resolve(root, path.split('/').join(sep));
    scans.push({ path, ...(await runQrscan(qrscan, absolute, options, run)) });
  }
  return scans;
}

export function parseOptions(inputs) {
  const profile = (inputs.profile || 'full').trim();
  if (!PROFILES.includes(profile)) throw new InputError(`profile must be one of ${PROFILES.join(', ')}, not ${JSON.stringify(profile)}`);
  const budgetText = String(inputs['budget-ms'] ?? '0').trim() || '0';
  if (!/^\d{1,7}$/.test(budgetText)) throw new InputError(`budget-ms must be a whole number of milliseconds, not ${JSON.stringify(budgetText)}`);
  const failOn = (inputs['fail-on'] || 'missing').trim();
  if (!FAIL_ON.includes(failOn)) throw new InputError(`fail-on must be one of ${FAIL_ON.join(', ')}, not ${JSON.stringify(failOn)}`);
  const limitText = String(inputs['max-files'] ?? '100').trim() || '100';
  if (!/^\d{1,5}$/.test(limitText) || Number(limitText) < 1) throw new InputError(`max-files must be a whole number from 1, not ${JSON.stringify(limitText)}`);
  const patterns = lines(inputs.files, { comments: true });
  if (patterns.length === 0) throw new InputError('files: give at least one pattern');
  const expected = [...new Set(lines(inputs.expected))];
  return { profile, budgetMs: Number(budgetText), failOn, maxFiles: Number(limitText), patterns, expected };
}
