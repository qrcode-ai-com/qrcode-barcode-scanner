// Inspect the archives the build wrote, as a store reviewer would open them.
//
//   node scripts/inspect.mjs [BUILD_DIR]
//
// For each store zip: the entries are exactly the expected files, each equal to the unpacked
// build; the manifest is the one scripts/manifest.mjs describes for that store; the
// WebAssembly module is the pinned one; no script loads code from the network or builds code
// from text. For the source zip: it holds the lockfile and the build, and no dependency or
// build output. Prints each archive's size and SHA-256 and exits 1 on the first problem.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readZip } from './bytes.mjs';
import { ICON_SIZES } from './icons.mjs';
import { TARGETS, manifestFor } from './manifest.mjs';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = resolve(process.argv[2] ?? join(HERE, 'build'));
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export const EXPECTED_FILES = [
  'LICENSE', 'NOTICE.md', 'PROVENANCE.json', 'background.js',
  ...ICON_SIZES.map((size) => `icons/icon-${size}.png`),
  'manifest.json', 'results.js', 'scanner-worker.js', 'scanner.css', 'scanner.html', 'scanner.js',
  ...['LICENSE', 'LICENSE-APACHE-2.0', 'THIRD-PARTY.md', 'auto.js', 'build-info.json',
    'package.json', 'qrcode-barcode-scanner.js', 'qrcode-barcode-scanner_bg.wasm']
    .map((name) => `vendor/qrcode-barcode-scanner-wasm/${name}`),
].sort();

// Code built from text, or code fetched from elsewhere: neither may appear in a script.
const FORBIDDEN = [
  [/\beval\s*\(/, 'eval('],
  [/\bnew\s+Function\s*\(/, 'new Function('],
  [/\bimportScripts\s*\(/, 'importScripts('],
  [/\bimport\s*\(\s*['"`]https?:/, 'a remote import'],
  [/\bfrom\s+['"]https?:/, 'a remote import'],
  [/<script[^>]+src=["']https?:/i, 'a remote script'],
];

const problems = [];
const problem = (text) => { problems.push(text); };

function walk(directory, base = directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...walk(path, base));
    else found.push(relative(base, path).split('\\').join('/'));
  }
  return found.sort();
}

export function inspectStore(target, files, unpacked) {
  const names = [...files.keys()].sort();
  if (JSON.stringify(names) !== JSON.stringify(EXPECTED_FILES)) {
    problem(`${target}: entries differ from the expected list: ${names.join(', ')}`);
  }
  if (unpacked) {
    const onDisk = walk(unpacked);
    if (JSON.stringify(onDisk) !== JSON.stringify(names)) {
      problem(`${target}: zip and folder differ`);
    }
    for (const name of names) {
      if (!files.get(name).equals(readFileSync(join(unpacked, name)))) {
        problem(`${target}: ${name} differs from the unpacked build`);
      }
    }
  }
  const manifest = JSON.parse(files.get('manifest.json'));
  if (JSON.stringify(manifest) !== JSON.stringify(manifestFor(target, own.version))) {
    problem(`${target}: manifest.json is not the described manifest`);
  }
  const text = JSON.stringify(manifest);
  if (/update_url/.test(text)) problem(`${target}: the manifest names an update_url`);
  if (target !== 'chrome' && /chrome/i.test(`${manifest.name} ${manifest.description}`)) {
    problem(`${target}: the name or description names Chrome`);
  }
  const wasm = files.get('vendor/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm');
  const info = JSON.parse(files.get('vendor/qrcode-barcode-scanner-wasm/build-info.json'));
  if (sha256(wasm) !== own.config.wasmSha256 || info.wasm.sha256 !== own.config.wasmSha256) {
    problem(`${target}: the WebAssembly module is not the pinned one`);
  }
  for (const [name, bytes] of files) {
    if (!/\.(m?js|html)$/.test(name)) continue;
    const source = bytes.toString('utf8');
    for (const [pattern, what] of FORBIDDEN) {
      if (pattern.test(source)) problem(`${target}: ${name} contains ${what}`);
    }
  }
  return { manifest, wasmSha256: sha256(wasm) };
}

function inspectSource(files) {
  const names = [...files.keys()];
  const top = `qrcode-barcode-scanner-browser-extension-${own.version}/`;
  for (const need of ['package.json', 'package-lock.json', 'SOURCE.md', 'LICENSE',
    'scripts/build.mjs', 'scripts/bytes.mjs', 'scripts/icons.mjs', 'scripts/manifest.mjs',
    'src/background.js', 'src/scanner.js']) {
    if (!files.has(top + need)) problem(`source: ${need} is missing`);
  }
  for (const name of names) {
    if (!name.startsWith(top)) problem(`source: ${name} is outside ${top}`);
    if (/\/(node_modules|build)\//.test(name.slice(top.length - 1))) {
      problem(`source: ${name} is a dependency or a build output`);
    }
  }
}

function main() {
  const rows = [];
  for (const target of TARGETS) {
    const path = join(build, `qrcode-barcode-scanner-${target}-${own.version}.zip`);
    const archive = readFileSync(path);
    const files = readZip(archive);
    const { manifest } = inspectStore(target, files, join(build, target));
    rows.push({ archive: relative(build, path), bytes: archive.length, sha256: sha256(archive),
      entries: files.size, permissions: manifest.permissions.join(' ') });
  }
  const sourcePath = join(build, `qrcode-barcode-scanner-source-${own.version}.zip`);
  const source = readFileSync(sourcePath);
  inspectSource(readZip(source));
  rows.push({ archive: relative(build, sourcePath), bytes: source.length, sha256: sha256(source),
    entries: readZip(source).size, permissions: '' });
  for (const row of rows) {
    console.log(`${row.archive}  ${row.bytes} bytes  ${row.entries} entries  sha256 ${row.sha256}`
      + (row.permissions ? `  permissions: ${row.permissions}` : ''));
  }
  for (const text of problems) console.error(`problem: ${text}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

// Run as a script, also through a symbolic link (macOS puts temporary folders behind one).
const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === realpathSync(fileURLToPath(import.meta.url))) main();
