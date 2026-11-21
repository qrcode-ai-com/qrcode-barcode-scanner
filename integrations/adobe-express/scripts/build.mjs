// SPDX-License-Identifier: MIT
// Build the Adobe Express add-on package from this folder.
//
//   node scripts/build.mjs
//
// Run `npm ci` first. Writes:
//   dist/                         the add-on as Adobe Express loads it: manifest.json at the root,
//                                 the panel (index.html, index.js, image.js, results.js,
//                                 styles.css), scanner-worker.js with the engine inlined by
//                                 integrations/wasm-inline, and the license files
//   build/qrcode-barcode-scanner-adobe-express-<version>.zip
//                                 the package to upload: the files of dist/ at its root, no hidden
//                                 file, relative paths only, the same bytes from the same inputs
//   build/build-receipt.json      the size and SHA-256 of every file and of the zip, and the pin
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { PACKAGE, esbuildPlugin } from '../../wasm-inline/inline.mjs';
import { writeZip } from './zip.mjs';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SDK_URL = 'https://express.adobe.com/static/add-on-sdk/sdk.js';
// Adobe's limit for an add-on package.
export const ZIP_LIMIT = 50 * 1024 * 1024;
const PANEL_FILES = ['index.html', 'index.js', 'image.js', 'results.js', 'styles.css'];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const own = () => JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const enginePath = (...parts) => join(HERE, 'node_modules', ...PACKAGE.split('/'), ...parts);

export class BuildError extends Error {}

export function workerBanner(version) {
  return `/*! QR Code & Barcode Scanner for Adobe Express ${version}, by QR Code AI: the scanner worker.
 * It holds the scanner engine 0.11.0 (AGPL-3.0-or-later, with Apache-2.0 notices) and this
 * add-on's worker code (MIT). The add-on package as a whole is distributed under
 * AGPL-3.0-or-later; NOTICE.md beside this file lists each part and its source.
 */`;
}

/** Bundle src/worker.js with the engine inlined into one classic worker script. */
export async function bundleWorker() {
  let inline = null;
  const result = await esbuild.build({
    entryPoints: [join(HERE, 'src', 'worker.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome110', 'firefox115', 'safari16'],
    minify: false,
    charset: 'utf8',
    legalComments: 'eof',
    banner: { js: workerBanner(own().version) },
    write: false,
    logLevel: 'silent',
    absWorkingDir: HERE,
    plugins: [esbuildPlugin(HERE, (receipt) => { inline = receipt; })],
  });
  if (result.outputFiles.length !== 1) throw new BuildError(`${result.outputFiles.length} worker files, not one`);
  if (!inline) throw new BuildError('the engine was not inlined');
  return { code: Buffer.from(result.outputFiles[0].contents), inline };
}

export function notice(version, inline) {
  return `# QR Code & Barcode Scanner for Adobe Express ${version}

This add-on package, by QR Code AI, is distributed under the GNU Affero General Public License,
version 3 or any later version (AGPL-3.0-or-later), in LICENSE.

## Its parts

| Files | What they are | License |
| --- | --- | --- |
| index.html, index.js, image.js, results.js, styles.css, manifest.json | the add-on's panel | MIT, in LICENSE-MIT.txt |
| scanner-worker.js | the add-on's worker code (MIT) with the scanner engine inlined | AGPL-3.0-or-later for the engine, with Apache-2.0 notices in LICENSE-APACHE-2.0 and THIRD-PARTY.md |

The engine is the published npm package ${inline.package} ${inline.version}. Its WebAssembly
module is inlined in scanner-worker.js as base64, byte for byte: ${inline.wasm_bytes} bytes,
SHA-256 ${inline.wasm_sha256}. Only its loader changes, so that it takes the module from the
file instead of fetching it.

## Source

The corresponding source of the engine is revision ${inline.source_revision} of
https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust, and the source of this add-on is
integrations/adobe-express in the same repository. The Adobe Express add-on SDK is not part of
this package: the panel loads it from ${SDK_URL} when it runs.
`;
}

/** The files of the package, in zip order: manifest first, then by name. */
export async function packageFiles() {
  const version = own().version;
  const manifestText = readFileSync(join(HERE, 'src', 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  if (manifest.version !== version) throw new BuildError(`manifest.json is ${manifest.version}, package.json ${version}`);
  if (manifest.manifestVersion !== 2) throw new BuildError('manifest.json must use manifestVersion 2');
  const files = new Map([['manifest.json', Buffer.from(manifestText)]]);
  for (const name of PANEL_FILES) files.set(name, readFileSync(join(HERE, 'src', name)));
  const { code, inline } = await bundleWorker();
  files.set('scanner-worker.js', code);
  files.set('LICENSE', readFileSync(enginePath('LICENSE')));
  files.set('LICENSE-APACHE-2.0', readFileSync(enginePath('LICENSE-APACHE-2.0')));
  files.set('THIRD-PARTY.md', readFileSync(enginePath('THIRD-PARTY.md')));
  files.set('LICENSE-MIT.txt', readFileSync(join(HERE, 'LICENSE')));
  files.set('NOTICE.md', Buffer.from(notice(version, inline)));
  checkFiles(files);
  const ordered = [...files].sort(([a], [b]) => (a === 'manifest.json' ? -1 : b === 'manifest.json' ? 1 : a.localeCompare(b)));
  return { files: ordered.map(([name, bytes]) => ({ name, bytes })), inline, manifest };
}

/** What Adobe's package check and this add-on's design require of the files. */
export function checkFiles(files) {
  for (const name of files.keys()) {
    if (name.split('/').some((part) => part.startsWith('.'))) throw new BuildError(`hidden file ${name}`);
  }
  const html = files.get('index.html').toString('utf8');
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    if (!files.has(match[1])) throw new BuildError(`index.html refers to ${match[1]}, which is not in the package`);
  }
  for (const name of ['index.js', 'image.js', 'results.js']) {
    const code = files.get(name).toString('utf8');
    for (const match of code.matchAll(/^import\b[^;]*?from '([^']+)';/gms)) {
      const target = match[1];
      if (target === SDK_URL) continue;
      if (!target.startsWith('./') || !files.has(target.slice(2))) throw new BuildError(`${name} imports ${target}`);
    }
    if (/\beval\(|new Function\(/.test(code)) throw new BuildError(`${name} builds code from text`);
  }
  const worker = files.get('scanner-worker.js').toString('utf8');
  // The glue keeps a fetch branch for a module given by URL; the worker always passes the bytes.
  for (const needle of ['import.meta', '_bg.wasm', 'importScripts']) {
    if (worker.includes(needle)) throw new BuildError(`scanner-worker.js contains ${needle}`);
  }
}

async function main() {
  const version = own().version;
  const dist = join(HERE, 'dist');
  const build = join(HERE, 'build');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  mkdirSync(build, { recursive: true });
  const { files, inline } = await packageFiles();
  for (const { name, bytes } of files) writeFileSync(join(dist, name), bytes);
  const zip = writeZip(files);
  if (zip.length > ZIP_LIMIT) throw new BuildError(`the zip is ${zip.length} bytes, above ${ZIP_LIMIT}`);
  const zipName = `qrcode-barcode-scanner-adobe-express-${version}.zip`;
  writeFileSync(join(build, zipName), zip);
  const receipt = {
    schema: 'qrscan-adobe-express-build/1',
    version,
    node: process.version,
    zip: { path: `build/${zipName}`, bytes: zip.length, sha256: sha256(zip), limit: ZIP_LIMIT },
    files: files.map(({ name, bytes }) => ({ name, bytes: bytes.length, sha256: sha256(bytes) })),
    sdk: SDK_URL,
    engine: inline,
  };
  writeFileSync(join(build, 'build-receipt.json'), json(receipt));
  console.log(`build/${zipName}  ${zip.length} bytes  sha256 ${receipt.zip.sha256}`);
  console.log(`${files.length} files; engine module sha256 ${inline.wasm_sha256}`);
}

const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    await main();
  } catch (error) {
    console.error(`build: ${error.message}`);
    process.exit(1);
  }
}
