// SPDX-License-Identifier: MIT
// Build the extension folder, package it with @vscode/vsce (no publishing) and write a receipt:
// the VSIX path, its size, its SHA-256 and its file list. Usage: node scripts/package.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipEntries } from './zip.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(here, 'out');
const stage = join(out, 'stage');
const manifest = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const vsix = join(out, `${manifest.name}-${manifest.version}.vsix`);
const require = createRequire(join(here, 'package.json'));
const vsce = join(dirname(require.resolve('@vscode/vsce/package.json')), 'vsce');

// One timestamp for every entry makes the VSIX reproducible: the same sources, engine and Node
// give the same bytes, on a laptop or in a shallow CI checkout. SOURCE_DATE_EPOCH wins;
// otherwise a fixed date, 2026-11-20 00:00 UTC.
const epoch = process.env.SOURCE_DATE_EPOCH || '1795132800';

execFileSync(process.execPath, [join(here, 'scripts', 'build.mjs'), stage], { stdio: 'inherit' });
rmSync(vsix, { force: true });
// The stage holds only the files the extension needs and no node_modules: the bundles carry
// the code, so vsce packages the folder as it is.
execFileSync(process.execPath, [vsce, 'package', '--no-dependencies', '--out', vsix], {
  cwd: stage,
  stdio: 'inherit',
  env: { ...process.env, SOURCE_DATE_EPOCH: epoch },
});

const bytes = readFileSync(vsix);
const receipt = {
  vsix,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  extension: `${manifest.publisher}.${manifest.name}@${manifest.version}`,
  vsce: JSON.parse(readFileSync(require.resolve('@vscode/vsce/package.json'), 'utf8')).version,
  node: process.version,
  sourceDateEpoch: Number(epoch),
  files: zipEntries(bytes).map(({ name, size }) => ({ name, size })),
};
writeFileSync(join(out, 'package-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
