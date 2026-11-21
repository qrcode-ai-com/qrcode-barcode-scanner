// Build the WordPress plugin zip from this folder.
//
//   node scripts/build.mjs [--out DIR] [--check]
//
// Run `npm ci --ignore-scripts` first. The engine files are copied from the exact npm package in
// node_modules, after its version, its lockfile integrity and the SHA-256 of its WebAssembly
// module are checked against the pins in package.json. The block's editor script is compiled
// by @wordpress/scripts from plugin/src; its source ships in the zip next to it. Writes, under
// DIR (default ./build):
//   qrcode-barcode-scanner/                the unpacked plugin, as WordPress installs it
//   qrcode-barcode-scanner-<version>.zip   the plugin zip for the directory and for upload
//   build-receipt.json                     the zip's size and SHA-256, and the engine it holds
//   SHA256SUMS                             the zip's SHA-256, in the format of sha256sum
// and writes the same SHA256SUMS in this folder, where it is committed: the listing kit cites it.
// --check writes nothing in this folder and fails when the committed SHA256SUMS is not the
// build's. The same inputs give the same bytes: entries are sorted, every date is 1980-01-01 and
// the compression level is fixed (the bytes also depend on the zlib of the Node.js used).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeZip } from './bytes.mjs';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SLUG = 'qrcode-barcode-scanner';
const PACKAGE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
// What the scanner loads, and the package's license material. The camera, overlay and
// destination modules of the package are left out: the plugin does not use them.
const VENDOR_FILES = [
  'auto.js',
  'qrcode-barcode-scanner.js',
  'qrcode-barcode-scanner_bg.wasm',
  'build-info.json',
  'package.json',
  'LICENSE',
  'LICENSE-APACHE-2.0',
  'THIRD-PARTY.md',
];
// The plugin's own files, copied as they are. The editor script is added from the compiler.
const PLUGIN_ROOTS = ['qrcode-barcode-scanner.php', 'readme.txt', 'includes', 'assets', 'src'];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function fail(message) {
  throw new Error(`build: ${message}`);
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

/** The pinned scanner package, checked: version, module hash and lockfile integrity. */
export function scannerPackage(root = HERE) {
  const own = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const pinned = own.dependencies[PACKAGE];
  const directory = join(root, 'node_modules', ...PACKAGE.split('/'));
  let installed;
  try {
    installed = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  } catch {
    fail(`${PACKAGE} is not installed: run npm ci --ignore-scripts first`);
  }
  if (installed.version !== pinned) fail(`${PACKAGE} ${installed.version} installed, ${pinned} pinned`);
  const info = JSON.parse(readFileSync(join(directory, 'build-info.json'), 'utf8'));
  const wasm = readFileSync(join(directory, 'qrcode-barcode-scanner_bg.wasm'));
  const actual = sha256(wasm);
  if (info.version !== pinned) fail(`build-info.json names ${info.version}, not ${pinned}`);
  if (actual !== info.wasm.sha256) fail(`module SHA-256 ${actual} differs from build-info.json`);
  if (actual !== own.config.wasmSha256) {
    fail(`module SHA-256 ${actual} differs from the pin ${own.config.wasmSha256}`);
  }
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const locked = lock.packages[`node_modules/${PACKAGE}`];
  if (!locked || locked.version !== pinned) fail(`package-lock.json does not pin ${PACKAGE} ${pinned}`);
  return {
    directory,
    name: PACKAGE,
    version: pinned,
    license: installed.license,
    integrity: locked.integrity,
    resolved: locked.resolved,
    wasm_sha256: actual,
    wasm_bytes: wasm.length,
    source_revision: info.source_revision,
  };
}

/** The fields of the plugin header and of readme.txt, by name. */
export function headers(text) {
  const fields = {};
  for (const match of text.matchAll(/^[ \t/*#]*([A-Z][A-Za-z ]+):[ \t]*(.+?)[ \t]*$/gm)) {
    fields[match[1].trim()] ??= match[2];
  }
  return fields;
}

/** Every place that states a version or a floor agrees, or the build stops. */
export function checkVersions(root = HERE) {
  const own = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const plugin = headers(readFileSync(join(root, 'plugin', `${SLUG}.php`), 'utf8'));
  const readme = headers(readFileSync(join(root, 'plugin', 'readme.txt'), 'utf8'));
  const block = JSON.parse(readFileSync(join(root, 'plugin/src/scanner/block.json'), 'utf8'));
  const constant = /define\( 'QRCODE_BARCODE_SCANNER_VERSION', '([^']+)' \)/
    .exec(readFileSync(join(root, 'plugin', `${SLUG}.php`), 'utf8'));
  const versions = {
    'package.json': own.version,
    'plugin header Version': plugin.Version,
    'QRCODE_BARCODE_SCANNER_VERSION': constant && constant[1],
    'readme.txt Stable tag': readme['Stable tag'],
    'block.json version': block.version,
  };
  for (const [where, value] of Object.entries(versions)) {
    if (value !== own.version) fail(`${where} is ${value}, package.json says ${own.version}`);
  }
  for (const field of ['Requires at least', 'Requires PHP', 'License']) {
    if (plugin[field] !== readme[field]) {
      fail(`${field}: the plugin header says ${plugin[field]}, readme.txt ${readme[field]}`);
    }
  }
  return { version: own.version, plugin, readme };
}

function walk(directory, base = directory) {
  const found = [];
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...walk(path, base));
    else found.push(relative(base, path).split('\\').join('/'));
  }
  return found;
}

/** The block's editor script, compiled by @wordpress/scripts into a new folder: its files. */
export function compileEditor(root = HERE) {
  const out = mkdtempSync(join(tmpdir(), 'qrbs-editor-'));
  try {
    execFileSync(process.execPath, [
      join(root, 'node_modules/@wordpress/scripts/bin/wp-scripts.js'), 'build',
      '--webpack-src-dir=plugin/src', `--output-path=${out}`,
    ], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, NODE_ENV: 'production' } });
    return new Map(walk(out).map((name) => [name, readFileSync(join(out, name))]));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

function engineFile(scanner) {
  return `<?php
/**
 * The bundled scanner engine, written by the build from the npm package in assets/vendor/.
 *
 * @package QRCodeBarcodeScanner
 */

defined( 'ABSPATH' ) || exit;

return array(
	'package'     => '${scanner.name}',
	'version'     => '${scanner.version}',
	'wasm_sha256' => '${scanner.wasm_sha256}',
);
`;
}

function licenseNotes(scanner, version) {
  return `Licenses in this plugin
=======================

QR Code & Barcode Scanner for WordPress ${version}. The plugin as a whole is distributed under the
GNU Affero General Public License, version 3 or (at your option) any later version
(AGPL-3.0-or-later), in LICENSE, because it includes the scanner engine below.

- The plugin's own files (${SLUG}.php, includes/, assets/scanner/, src/ and
  build/, compiled from src/) are project-authored source of QR Code AI, also available
  under the MIT License in LICENSE-MIT.
- assets/vendor/qrcode-barcode-scanner-wasm/ holds files copied unchanged from the published
  npm package ${scanner.name} ${scanner.version}. That package is licensed
  ${scanner.license} (assets/vendor/qrcode-barcode-scanner-wasm/LICENSE), with Apache-2.0
  notices for the parts that derive from rxing (LICENSE-APACHE-2.0, THIRD-PARTY.md).
- qrcode-barcode-scanner_bg.wasm is compiled code. Its corresponding source is the public
  repository https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust at revision
  ${scanner.source_revision} (tag v${scanner.version}); build-info.json records the compiler,
  the settings and the SHA-256 of the module, and the build script is
  https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v${scanner.version}/scripts/build-wasm.sh

The source of this plugin and the script that makes this zip are in
https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/wordpress

Developed by Thibaut Mélen & Nicolas Cella for QR Code AI, a product of SuperNovae Studio.
`;
}

/** Every file of the plugin, under its folder name: a Map of path to bytes. */
export function pluginFiles(scanner, version, editor, root = HERE) {
  const files = new Map();
  const add = (name, bytes) => files.set(`${SLUG}/${name}`, Buffer.from(bytes));
  const source = join(root, 'plugin');
  for (const entry of PLUGIN_ROOTS) {
    const path = join(source, entry);
    if (statSync(path).isDirectory()) {
      for (const name of walk(path)) add(`${entry}/${name}`, readFileSync(join(path, name)));
    } else {
      add(entry, readFileSync(path));
    }
  }
  for (const [name, bytes] of editor) add(`build/${name}`, bytes);
  for (const name of VENDOR_FILES) {
    add(`assets/vendor/qrcode-barcode-scanner-wasm/${name}`, readFileSync(join(scanner.directory, name)));
  }
  add('includes/engine.php', engineFile(scanner));
  add('LICENSE', readFileSync(join(scanner.directory, 'LICENSE')));
  add('LICENSE-MIT', readFileSync(join(root, 'LICENSE')));
  add('LICENSE-NOTES.txt', licenseNotes(scanner, version));
  add('PROVENANCE.json', json({
    schema: 'qrscan-wordpress-plugin-provenance/1',
    plugin: { name: 'QR Code & Barcode Scanner', slug: SLUG, version },
    scanner: {
      package: scanner.name,
      version: scanner.version,
      license: scanner.license,
      integrity: scanner.integrity,
      resolved: scanner.resolved,
      wasm_sha256: scanner.wasm_sha256,
      source_revision: scanner.source_revision,
    },
  }));
  return files;
}

/** The Git revision of this folder, for the receipt only: no packaged file depends on it. */
function revision() {
  const git = (...args) => execFileSync('git', args,
    { cwd: HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    const head = git('rev-parse', 'HEAD').trim();
    const dirty = git('status', '--porcelain', '--', '.').split('\n')
      .filter((line) => line && !line.includes('build/')).length > 0;
    return { commit: head, folder_modified: dirty };
  } catch {
    return null;
  }
}

export function build(out, { check = false } = {}) {
  const { version } = checkVersions();
  const scanner = scannerPackage();
  const editor = compileEditor();
  const files = pluginFiles(scanner, version, editor);
  mkdirSync(out, { recursive: true });
  const unpacked = join(out, SLUG);
  rmSync(unpacked, { recursive: true, force: true });
  for (const [name, bytes] of files) {
    mkdirSync(dirname(join(out, name)), { recursive: true });
    writeFileSync(join(out, name), bytes);
  }
  const zip = writeZip(files);
  const zipName = `${SLUG}-${version}.zip`;
  writeFileSync(join(out, zipName), zip);
  const receipt = {
    schema: 'qrscan-wordpress-plugin-build/1',
    version,
    node: process.version,
    revision: revision(),
    scanner: { ...scanner, directory: undefined },
    archive: { path: zipName, bytes: zip.length, sha256: sha256(zip), files: files.size },
  };
  writeFileSync(join(out, 'build-receipt.json'), json(receipt));
  const sums = `${receipt.archive.sha256}  ${zipName}\n`;
  writeFileSync(join(out, 'SHA256SUMS'), sums);
  const committed = join(HERE, 'SHA256SUMS');
  let current = null;
  try { current = readFileSync(committed, 'utf8'); } catch { current = null; }
  if (check && current !== sums) {
    fail(`SHA256SUMS says ${current ? current.trim() : 'nothing'}, this build gives ${sums.trim()}`);
  }
  if (!check) writeFileSync(committed, sums);
  return receipt;
}

// Run as a script, also through a symbolic link (macOS puts temporary folders behind one).
const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const receipt = build(resolve(argument('--out', join(HERE, 'build'))),
      { check: process.argv.includes('--check') });
    console.log(`${receipt.archive.path}  ${receipt.archive.bytes} bytes  sha256 ${receipt.archive.sha256}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
