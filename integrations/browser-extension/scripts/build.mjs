// Build the three store packages and the source package from this folder.
//
//   node scripts/build.mjs [--out DIR]
//
// Run `npm ci` first: the scanner files are copied from the exact npm package in node_modules,
// after its version and the SHA-256 of its WebAssembly module are checked against the pins in
// package.json. Writes, under DIR (default ./build):
//   chrome/ edge/ firefox/                       the unpacked extensions
//   qrcode-barcode-scanner-<target>-<version>.zip  one per store
//   qrcode-barcode-scanner-source-<version>.zip    the source package for Firefox review
//   store-assets/                                the icon and logo the store forms ask for
//   amo-metadata.json                            the Firefox Add-ons listing, for web-ext sign
//   build-receipt.json                           sizes and SHA-256 of every archive
// The same inputs give the same files; the zip bytes also depend on the zlib of the Node.js used.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeZip } from './bytes.mjs';
import { ICON_SIZES, drawIcon } from './icons.mjs';
import { amoMetadata, listingTexts } from './listing.mjs';
import { HOMEPAGE, TARGETS, manifestFor } from './manifest.mjs';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
// Only what the page and its worker load, and the package's license material. The camera,
// overlay and destination modules are left out: the extension does not use them.
const VENDOR_FILES = [
  'qrcode-barcode-scanner.js',
  'qrcode-barcode-scanner_bg.wasm',
  'auto.js',
  'build-info.json',
  'package.json',
  'LICENSE',
  'LICENSE-APACHE-2.0',
  'THIRD-PARTY.md',
];
const SOURCE_FILES = [
  'background.js', 'results.js', 'scanner-worker.js', 'scanner.css', 'scanner.html', 'scanner.js',
];
// The source package holds what a reviewer needs to rebuild the store packages.
const SOURCE_PACKAGE_ROOTS = [
  '.gitignore', 'LICENSE', 'README.md', 'SOURCE.md', 'package.json', 'package-lock.json',
  'scripts', 'src', 'store', 'test',
];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

/** The pinned scanner package, checked: version, module hash and lockfile integrity. */
export function scannerPackage(root = HERE) {
  const own = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const pinned = own.dependencies[PACKAGE];
  const expectedWasm = own.config.wasmSha256;
  const directory = join(root, 'node_modules', ...PACKAGE.split('/'));
  let installed;
  try {
    installed = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  } catch {
    fail(`${PACKAGE} is not installed: run npm ci first`);
  }
  if (installed.version !== pinned) {
    fail(`${PACKAGE} ${installed.version} installed, ${pinned} pinned`);
  }
  const info = JSON.parse(readFileSync(join(directory, 'build-info.json'), 'utf8'));
  const wasm = readFileSync(join(directory, 'qrcode-barcode-scanner_bg.wasm'));
  const actual = sha256(wasm);
  if (info.version !== pinned) fail(`build-info.json names ${info.version}, not ${pinned}`);
  if (actual !== info.wasm.sha256) fail(`module SHA-256 ${actual} differs from build-info.json`);
  if (actual !== expectedWasm) {
    fail(`module SHA-256 ${actual} differs from the pin ${expectedWasm}`);
  }
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const locked = lock.packages[`node_modules/${PACKAGE}`];
  if (!locked || locked.version !== pinned) {
    fail(`package-lock.json does not pin ${PACKAGE} ${pinned}`);
  }
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

function notice(scanner, version) {
  return `# Licenses in this package

QR Code & Barcode Scanner browser extension ${version}.

- The extension's own files (\`manifest.json\`, \`background.js\`, \`scanner.*\`, \`results.js\`,
  \`scanner-worker.js\`, \`icons/\`) are project-authored source under the MIT License in
  \`LICENSE\`.
- \`vendor/qrcode-barcode-scanner-wasm/\` holds files copied unchanged from the published npm
  package ${scanner.name} ${scanner.version}. That archive is licensed ${scanner.license}
  (\`vendor/qrcode-barcode-scanner-wasm/LICENSE\`), with Apache-2.0 notices for the parts that
  derive from rxing (\`LICENSE-APACHE-2.0\`, \`THIRD-PARTY.md\`). The MIT License of the
  extension does not relicense it.
- The corresponding engine source is the public repository
  https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust at revision
  ${scanner.source_revision} (tag v${scanner.version}); \`build-info.json\` records how the
  WebAssembly module was built and its SHA-256.

Developed by Thibaut Mélen & Nicolas Cella for QR Code AI, a product of SuperNovae Studio.
`;
}

/** Every file of one store package: a Map of path to bytes. */
export function packageFiles(target, scanner, version, root = HERE) {
  const files = new Map();
  files.set('manifest.json', Buffer.from(json(manifestFor(target, version))));
  for (const name of SOURCE_FILES) files.set(name, readFileSync(join(root, 'src', name)));
  for (const size of ICON_SIZES) files.set(`icons/icon-${size}.png`, drawIcon(size));
  for (const name of VENDOR_FILES) {
    const bytes = readFileSync(join(scanner.directory, name));
    files.set(`vendor/qrcode-barcode-scanner-wasm/${name}`, bytes);
  }
  files.set('LICENSE', readFileSync(join(root, 'LICENSE')));
  files.set('NOTICE.md', Buffer.from(notice(scanner, version)));
  files.set('PROVENANCE.json', Buffer.from(json({
    schema: 'qrscan-browser-extension-provenance/1',
    extension: { name: 'QR Code & Barcode Scanner', version, target },
    scanner: {
      package: scanner.name,
      version: scanner.version,
      license: scanner.license,
      integrity: scanner.integrity,
      resolved: scanner.resolved,
      wasm_sha256: scanner.wasm_sha256,
      source_revision: scanner.source_revision,
    },
  })));
  return files;
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

/** The source package: the files of SOURCE_PACKAGE_ROOTS, under one top folder. */
export function sourceFiles(version, root = HERE) {
  const files = new Map();
  const top = `qrcode-barcode-scanner-browser-extension-${version}`;
  for (const entry of SOURCE_PACKAGE_ROOTS) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      for (const name of walk(path)) {
        files.set(`${top}/${entry}/${name}`, readFileSync(join(path, name)));
      }
    } else {
      files.set(`${top}/${entry}`, readFileSync(path));
    }
  }
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

function main() {
  const out = resolve(argument('--out', join(HERE, 'build')));
  const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
  const scanner = scannerPackage();
  mkdirSync(out, { recursive: true });
  const archives = [];
  for (const target of TARGETS) {
    const files = packageFiles(target, scanner, own.version);
    const directory = join(out, target);
    rmSync(directory, { recursive: true, force: true });
    for (const [name, bytes] of files) {
      mkdirSync(dirname(join(directory, name)), { recursive: true });
      writeFileSync(join(directory, name), bytes);
    }
    const zip = writeZip(files);
    const path = join(out, `qrcode-barcode-scanner-${target}-${own.version}.zip`);
    writeFileSync(path, zip);
    archives.push({ target, path: relative(out, path), bytes: zip.length, sha256: sha256(zip),
      files: files.size });
  }
  // The store forms take their own images: the Chrome Web Store a 128 px icon, Edge a 300 px logo.
  const assets = join(out, 'store-assets');
  mkdirSync(assets, { recursive: true });
  writeFileSync(join(assets, 'icon-128.png'), drawIcon(128));
  writeFileSync(join(assets, 'logo-300.png'), drawIcon(300));
  const license = readFileSync(join(HERE, 'LICENSE'), 'utf8');
  writeFileSync(join(out, 'amo-metadata.json'),
    json(amoMetadata(listingTexts(), { license, scanner, homepage: HOMEPAGE })));
  const source = writeZip(sourceFiles(own.version));
  const sourcePath = join(out, `qrcode-barcode-scanner-source-${own.version}.zip`);
  writeFileSync(sourcePath, source);
  archives.push({ target: 'source', path: relative(out, sourcePath), bytes: source.length,
    sha256: sha256(source) });
  const receipt = {
    schema: 'qrscan-browser-extension-build/1',
    version: own.version,
    node: process.version,
    revision: revision(),
    scanner: { ...scanner, directory: undefined },
    archives,
  };
  writeFileSync(join(out, 'build-receipt.json'), json(receipt));
  for (const archive of archives) {
    console.log(`${archive.path}  ${archive.bytes} bytes  sha256 ${archive.sha256}`);
  }
}

// Run as a script, also through a symbolic link (macOS puts temporary folders behind one).
const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === realpathSync(fileURLToPath(import.meta.url))) main();
