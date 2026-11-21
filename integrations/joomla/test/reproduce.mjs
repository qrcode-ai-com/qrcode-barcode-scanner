// Rebuild the package twice, in two time zones, and compare it byte for byte with the package in
// build/ and with the SHA-256 that the committed updates.xml names.
//
//   node test/reproduce.mjs [--build build]
//
// Zip dates are local time in the zip format: the two time zones are UTC and UTC+14, so that a
// date that leaked into the archive changes its bytes. Exits 1 on the first difference.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const index = process.argv.indexOf('--build');
const build = resolve(index >= 0 ? process.argv[index + 1] : join(HERE, 'build'));
const name = `pkg_qrcodebarcodescanner-${own.version}.zip`;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const original = readFileSync(join(build, name));
const committed = /<sha256>([0-9a-f]{64})<\/sha256>/.exec(readFileSync(join(HERE, 'updates.xml'), 'utf8'))?.[1];
let failed = committed !== sha256(original);
for (const zone of ['UTC', 'Pacific/Kiritimati']) {
  const out = mkdtempSync(join(tmpdir(), 'qrbs-joomla-reproduce-'));
  execFileSync(process.execPath, [join(HERE, 'scripts', 'build.mjs'), '--out', out, '--check'],
    { cwd: HERE, env: { ...process.env, TZ: zone }, stdio: ['ignore', 'ignore', 'inherit'] });
  const again = readFileSync(join(out, name));
  const same = again.equals(original);
  console.log(`${same ? 'same' : 'DIFFERENT'}  TZ=${zone}  ${again.length} bytes  sha256 ${sha256(again)}`);
  if (!same) failed = true;
}
console.log(`build/${name}  ${original.length} bytes  sha256 ${sha256(original)}  (updates.xml: ${committed})`);
process.exit(failed ? 1 : 0);
