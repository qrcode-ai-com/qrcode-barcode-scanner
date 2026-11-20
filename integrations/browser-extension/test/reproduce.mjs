// Rebuild the store packages from the source package, as a Firefox add-on reviewer would.
//
//   node test/reproduce.mjs [--build build]
//
// Extracts BUILD/qrcode-barcode-scanner-source-<version>.zip into an empty temporary folder,
// runs `npm ci --omit=dev --ignore-scripts` there (the scanner package comes from the npm
// registry at the version and integrity of package-lock.json) and `node scripts/build.mjs`, then
// compares every archive with the one in BUILD. Each store zip and the source zip must be the
// same bytes. Exits 1 on the first difference.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { readZip } from '../scripts/bytes.mjs';
import { TARGETS } from '../scripts/manifest.mjs';
import { HERE, check, checkCount, option } from './page-contract.mjs';

const build = resolve(option('--build', join(HERE, 'build')));
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const archives = [
  ...TARGETS.map((target) => `qrcode-barcode-scanner-${target}-${own.version}.zip`),
  `qrcode-barcode-scanner-source-${own.version}.zip`,
];

const work = mkdtempSync(join(tmpdir(), 'qrscan-reproduce-'));
const source = readZip(readFileSync(join(build, archives.at(-1))));
for (const [name, bytes] of source) {
  // readZip refuses absolute and parent paths; the entries stay under `work`.
  const path = join(work, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}
const top = join(work, `qrcode-barcode-scanner-browser-extension-${own.version}`);
check(source.size > 10, `the source package extracts ${source.size} files`, source.size);

execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'],
  { cwd: top, stdio: ['ignore', 'inherit', 'inherit'] });
const rebuilt = join(work, 'rebuilt');
execFileSync(process.execPath, [join(top, 'scripts', 'build.mjs'), '--out', rebuilt],
  { cwd: top, stdio: ['ignore', 'inherit', 'inherit'] });

const rows = [];
for (const name of archives) {
  const original = readFileSync(join(build, name));
  const again = readFileSync(join(rebuilt, name));
  check(original.equals(again), `${name}: rebuilt from source, the same ${original.length} bytes`,
    { original: sha256(original), rebuilt: sha256(again) });
  rows.push({ archive: name, bytes: original.length, sha256: sha256(original) });
}
writeFileSync(join(build, 'reproduce-run.json'), `${JSON.stringify({
  checks: checkCount(), node: process.version, archives: rows,
}, null, 2)}\n`);
rmSync(work, { recursive: true, force: true });
console.log(`${checkCount()} checks passed`);
