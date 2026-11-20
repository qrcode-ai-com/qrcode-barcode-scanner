// Mozilla's add-on linter on the Firefox build, through the pinned web-ext.
//
//   node scripts/lint-firefox.mjs [build/firefox]
//
// Fails on any error and on any warning except the one this package accepts on purpose:
// KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION. The add-on targets desktop Firefox 140 (the
// current ESR) and declares data_collection_permissions, which Firefox for Android reads from
// 142 only. The add-on is not offered for Android, so that warning does not apply.
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? join(HERE, 'build', 'firefox'));
const ACCEPTED = new Set(['KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION']);

let output;
try {
  output = execFileSync(join(HERE, 'node_modules', '.bin', 'web-ext'),
    ['lint', '--source-dir', source, '--self-hosted=false', '--output', 'json',
      '--no-config-discovery'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (error) {
  // web-ext exits non-zero when it finds errors; the JSON is still on stdout.
  output = error.stdout;
}
const result = JSON.parse(output);
const rows = [
  ...result.errors.map((row) => ({ ...row, level: 'error' })),
  ...result.warnings.map((row) => ({ ...row, level: 'warning' })),
  ...result.notices.map((row) => ({ ...row, level: 'notice' })),
];
for (const row of rows) {
  const accepted = row.level === 'warning' && ACCEPTED.has(row.code) ? ' (accepted)' : '';
  console.log(`${row.level} ${row.code} ${row.file ?? ''}${accepted}: ${row.message}`);
}
const refused = rows.filter((row) => row.level === 'error'
  || (row.level === 'warning' && !ACCEPTED.has(row.code)));
console.log(`web-ext lint: ${result.summary.errors} errors, ${result.summary.warnings} warnings, `
  + `${result.summary.notices} notices; ${refused.length} refused`);
process.exit(refused.length === 0 ? 0 : 1);
