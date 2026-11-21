// Mozilla's add-on linter on the Firefox build, through the pinned web-ext.
//
//   node scripts/lint-firefox.mjs [build/firefox]
//
// Fails on any error, warning or notice: Firefox Add-ons runs the same linter on upload, and the
// package is held to a clean report.
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? join(HERE, 'build', 'firefox'));

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
for (const row of rows) console.log(`${row.level} ${row.code} ${row.file ?? ''}: ${row.message}`);
console.log(`web-ext lint: ${result.summary.errors} errors, ${result.summary.warnings} warnings, `
  + `${result.summary.notices} notices`);
process.exit(rows.length === 0 ? 0 : 1);
