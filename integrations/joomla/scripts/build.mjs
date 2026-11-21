// Build the Joomla package and its update file from this folder.
//
//   node scripts/build.mjs [--out DIR] [--check]
//
// Run `npm ci --ignore-scripts` first. The engine files are copied from the exact npm package in
// node_modules, after its version, its lockfile integrity and the SHA-256 of its WebAssembly
// module are checked against the pins in package.json. Nothing is compiled or minified. Writes,
// under DIR (default ./build):
//   pkg_qrcodebarcodescanner-<version>.zip   the package to install and to attach to the listing
//   mod_qrcodebarcodescanner/                 the module as Joomla installs it, for reading
//   build-receipt.json                        the package's size and SHA-256, and the engine
// and writes updates.xml in this folder, the update server file the manifest names, with the
// package's SHA-256. --check writes nothing in this folder and fails when updates.xml is not the
// file this build gives. The same inputs give the same bytes: entries are sorted, every date is
// 1980-01-01 and the compression level is fixed (the bytes also depend on the zlib of Node.js).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeZip } from './bytes.mjs';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MODULE = 'mod_qrcodebarcodescanner';
export const PACKAGE_ELEMENT = 'pkg_qrcodebarcodescanner';
export const NAME = 'QR Code & Barcode Scanner';
const REPOSITORY = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust';
const ENGINE_PACKAGE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
// What the scanner loads, and the package's license material. The camera, overlay and
// destination modules of the npm package are left out: the module does not use them.
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
// The Joomla lines the package is tested on, as the update file's target platform.
const TARGET_PLATFORM = '(5\\.[4-9]|6\\.[0-9])';
const PHP_MINIMUM = '8.1';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const xml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  const pinned = own.dependencies[ENGINE_PACKAGE];
  const directory = join(root, 'node_modules', ...ENGINE_PACKAGE.split('/'));
  let installed;
  try {
    installed = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  } catch {
    fail(`${ENGINE_PACKAGE} is not installed: run npm ci --ignore-scripts first`);
  }
  if (installed.version !== pinned) fail(`${ENGINE_PACKAGE} ${installed.version} installed, ${pinned} pinned`);
  const info = JSON.parse(readFileSync(join(directory, 'build-info.json'), 'utf8'));
  const wasm = readFileSync(join(directory, 'qrcode-barcode-scanner_bg.wasm'));
  const actual = sha256(wasm);
  if (info.version !== pinned) fail(`build-info.json names ${info.version}, not ${pinned}`);
  if (actual !== info.wasm.sha256) fail(`module SHA-256 ${actual} differs from build-info.json`);
  if (actual !== own.config.wasmSha256) {
    fail(`module SHA-256 ${actual} differs from the pin ${own.config.wasmSha256}`);
  }
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const locked = lock.packages[`node_modules/${ENGINE_PACKAGE}`];
  if (!locked || locked.version !== pinned) fail(`package-lock.json does not pin ${ENGINE_PACKAGE} ${pinned}`);
  return {
    directory,
    name: ENGINE_PACKAGE,
    version: pinned,
    license: installed.license,
    integrity: locked.integrity,
    resolved: locked.resolved,
    wasm_sha256: actual,
    wasm_bytes: wasm.length,
    source_revision: info.source_revision,
  };
}

/** The text of the first <tag> of an XML document, or null. */
export function tag(text, name) {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`).exec(text);
  return match ? match[1] : null;
}

/** Every place that states the version agrees, or the build stops. */
export function checkVersions(root = HERE) {
  const own = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const module = readFileSync(join(root, 'extension', MODULE, `${MODULE}.xml`), 'utf8');
  const pkg = readFileSync(join(root, 'extension', `${PACKAGE_ELEMENT}.xml`), 'utf8');
  const assets = JSON.parse(readFileSync(join(root, 'extension', MODULE, 'media/joomla.asset.json'), 'utf8'));
  const versions = {
    [`${MODULE}.xml`]: tag(module, 'version'),
    [`${PACKAGE_ELEMENT}.xml`]: tag(pkg, 'version'),
    'joomla.asset.json': assets.version,
  };
  for (const asset of assets.assets) versions[`joomla.asset.json ${asset.name}`] = asset.version;
  for (const [where, value] of Object.entries(versions)) {
    if (value !== own.version) fail(`${where} says ${value}, package.json says ${own.version}`);
  }
  if (tag(pkg, 'name') !== xml(NAME)) fail(`the package <name> is ${tag(pkg, 'name')}, not ${NAME}`);
  return own.version;
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

function engineLicense(scanner, version) {
  return `QR Code & Barcode Scanner ${version}, licenses of its files
=================================================

The extension's own files (the XML manifests, the PHP files under services/, src/ and tmpl/,
the language files, and media/mod_qrcodebarcodescanner/js/, css/ and joomla.asset.json) are
licensed under the GNU General Public License version 3 or later, in LICENSE.txt. They are
project-authored source of QR Code AI and are also available under the MIT License, in
LICENSE-MIT.txt.

The scanner engine is a set of separately licensed files, copied unchanged from the published
npm package ${scanner.name} ${scanner.version} into
media/mod_qrcodebarcodescanner/vendor/qrcode-barcode-scanner-wasm/:

  auto.js, qrcode-barcode-scanner.js   JavaScript loader and bindings
  qrcode-barcode-scanner_bg.wasm       the compiled engine (WebAssembly)
  build-info.json, package.json        how the module was built, and its SHA-256

They are licensed under the GNU Affero General Public License version 3 or (at your option) any
later version (AGPL-3.0-or-later), in vendor/qrcode-barcode-scanner-wasm/LICENSE, with
Apache-2.0 notices for two parts that derive from rxing (LICENSE-APACHE-2.0, THIRD-PARTY.md).

The compiled engine is not encoded or obfuscated. Its corresponding source is the public
repository ${REPOSITORY}
at revision ${scanner.source_revision} (tag v${scanner.version}), and its build script is
${REPOSITORY}/blob/v${scanner.version}/scripts/build-wasm.sh
WebAssembly module SHA-256: ${scanner.wasm_sha256}

The source of this extension and the script that makes this package are in
${REPOSITORY}/tree/main/integrations/joomla

Developed by Thibaut Mélen & Nicolas Cella for QR Code AI, a product of SuperNovae Studio.
`;
}

/** The module's files, as its install zip holds them: a Map of path to bytes. */
export function moduleFiles(scanner, version, root = HERE) {
  const files = new Map();
  const source = join(root, 'extension', MODULE);
  for (const name of walk(source)) files.set(name, readFileSync(join(source, name)));
  for (const name of VENDOR_FILES) {
    files.set(`media/vendor/qrcode-barcode-scanner-wasm/${name}`, readFileSync(join(scanner.directory, name)));
  }
  files.set('LICENSE-ENGINE.txt', Buffer.from(engineLicense(scanner, version)));
  return files;
}

/** The package's files: its manifest, the license texts and the module zip. */
export function packageFiles(scanner, version, root = HERE) {
  const module = writeZip(moduleFiles(scanner, version, root));
  const files = new Map();
  files.set(`${PACKAGE_ELEMENT}.xml`, readFileSync(join(root, 'extension', `${PACKAGE_ELEMENT}.xml`)));
  files.set('LICENSE.txt', readFileSync(join(root, 'extension', 'LICENSE-GPL-3.0.txt')));
  files.set('LICENSE-MIT.txt', readFileSync(join(root, 'LICENSE')));
  files.set('LICENSE-ENGINE.txt', Buffer.from(engineLicense(scanner, version)));
  files.set(`packages/${MODULE}.zip`, module);
  return { files, module };
}

export function packageName(version) {
  return `${PACKAGE_ELEMENT}-${version}.zip`;
}

/** The update server file: one <update> for this version, with the package's SHA-256. */
export function updatesXml(version, packageSha256) {
  const download = `${REPOSITORY}/releases/download/joomla-v${version}/${packageName(version)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- The update server of the ${xml(NAME)} package for Joomla, written by
     integrations/joomla/scripts/build.mjs. The download is the GitHub release joomla-v${version}. -->
<updates>
	<update>
		<name>${xml(NAME)}</name>
		<description>Reads QR codes and barcodes from an image or a photo in the visitor's browser.</description>
		<element>${PACKAGE_ELEMENT}</element>
		<type>package</type>
		<client>site</client>
		<version>${version}</version>
		<infourl title="${xml(NAME)} ${version}">${REPOSITORY}/tree/main/integrations/joomla</infourl>
		<downloads>
			<downloadurl type="full" format="zip">${download}</downloadurl>
		</downloads>
		<sha256>${packageSha256}</sha256>
		<maintainer>QR Code AI</maintainer>
		<maintainerurl>https://qrcode-ai.com/</maintainerurl>
		<targetplatform name="joomla" version="${TARGET_PLATFORM}" />
		<php_minimum>${PHP_MINIMUM}</php_minimum>
	</update>
</updates>
`;
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
  const version = checkVersions();
  const scanner = scannerPackage();
  const { files, module } = packageFiles(scanner, version);
  mkdirSync(out, { recursive: true });
  const unpacked = join(out, MODULE);
  rmSync(unpacked, { recursive: true, force: true });
  for (const [name, bytes] of moduleFiles(scanner, version)) {
    mkdirSync(dirname(join(unpacked, name)), { recursive: true });
    writeFileSync(join(unpacked, name), bytes);
  }
  const zip = writeZip(files);
  const name = packageName(version);
  writeFileSync(join(out, name), zip);
  const updates = updatesXml(version, sha256(zip));
  const updatesPath = join(HERE, 'updates.xml');
  let current = null;
  try { current = readFileSync(updatesPath, 'utf8'); } catch { current = null; }
  if (check && current !== updates) {
    fail('updates.xml is not the file this build gives: run node scripts/build.mjs and commit it');
  }
  if (!check) writeFileSync(updatesPath, updates);
  writeFileSync(join(out, 'updates.xml'), updates);
  const receipt = {
    schema: 'qrscan-joomla-package-build/1',
    version,
    node: process.version,
    revision: revision(),
    scanner: { ...scanner, directory: undefined },
    archive: { path: name, bytes: zip.length, sha256: sha256(zip), files: files.size },
    module: { path: `packages/${MODULE}.zip`, bytes: module.length, sha256: sha256(module) },
  };
  writeFileSync(join(out, 'build-receipt.json'), json(receipt));
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
