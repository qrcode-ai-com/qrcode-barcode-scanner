// SPDX-License-Identifier: MIT
// Build the Photoshop UXP plugin from this folder.
//
//   node scripts/build.mjs
//
// Run `npm ci` first. Writes:
//   dist/                         the plugin folder as the UXP Developer Tool loads it:
//                                 manifest.json, index.html, styles.css, index.js (the panel with
//                                 the engine inlined by integrations/wasm-inline), the icons, and
//                                 the license files
//   build/qrcode-barcode-scanner-photoshop-<version>.zip
//                                 the files of dist/ at its root, stored with one fixed date, so the
//                                 same inputs give the same bytes on any machine
//   build/build-receipt.json      the size and SHA-256 of every file and of the zip, and the pin
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { PACKAGE, esbuildPlugin } from '../../wasm-inline/inline.mjs';
import { panelIcons } from './icons.mjs';
import { writeZip } from './zip.mjs';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The modules UXP gives the plugin through require(); everything else is in index.js.
export const HOST_MODULES = ['photoshop', 'uxp'];
const COPIED = ['index.html', 'styles.css'];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const own = () => JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const enginePath = (...parts) => join(HERE, 'node_modules', ...PACKAGE.split('/'), ...parts);

export class BuildError extends Error {}

export function banner(version) {
  return `/*! QR Code & Barcode Scanner for Photoshop ${version}, by QR Code AI: the panel script.
 * It holds the scanner engine 0.11.0 (AGPL-3.0-or-later, with Apache-2.0 notices) and this
 * plugin's own code (MIT). The plugin as a whole is distributed under AGPL-3.0-or-later;
 * NOTICE.md beside this file lists each part and its source.
 */`;
}

/** Bundle src/index.js with the engine inlined into one classic script for the panel. */
export async function bundle(entry = join(HERE, 'src', 'index.js')) {
  let inline = null;
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    // UXP's JavaScript engine is V8; ES2020 keeps the output inside what its documentation shows.
    target: ['es2020'],
    external: HOST_MODULES,
    minify: false,
    charset: 'utf8',
    legalComments: 'eof',
    banner: { js: banner(own().version) },
    write: false,
    logLevel: 'silent',
    absWorkingDir: HERE,
    plugins: [esbuildPlugin(HERE, (receipt) => { inline = receipt; })],
  });
  if (result.outputFiles.length !== 1) throw new BuildError(`${result.outputFiles.length} files, not one`);
  if (!inline) throw new BuildError('the engine was not inlined');
  return { code: Buffer.from(result.outputFiles[0].contents), inline };
}

export function notice(version, inline) {
  return `# QR Code & Barcode Scanner for Photoshop ${version}

This plugin, by QR Code AI, is distributed under the GNU Affero General Public License, version 3
or any later version (AGPL-3.0-or-later), in LICENSE.

## Its parts

| Files | What they are | License |
| --- | --- | --- |
| manifest.json, index.html, styles.css, icons/ | the plugin's panel | MIT, in LICENSE-MIT.txt |
| index.js | the plugin's code (MIT) with the scanner engine inlined | AGPL-3.0-or-later for the engine, with Apache-2.0 notices in LICENSE-APACHE-2.0 and THIRD-PARTY.md |

The engine is the published npm package ${inline.package} ${inline.version}. Its WebAssembly
module is inlined in index.js as base64, byte for byte: ${inline.wasm_bytes} bytes, SHA-256
${inline.wasm_sha256}. Only its loader changes, so that it takes the module from the file instead
of fetching it.

## Source

The corresponding source of the engine is revision ${inline.source_revision} of
https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust, and the source of this plugin is
integrations/photoshop-uxp in the same repository. Photoshop's APIs are not part of this plugin:
it asks Photoshop for them with require('photoshop') and require('uxp') when it runs.
`;
}

/** The files of the plugin, in zip order: manifest first, then by name. */
export async function pluginFiles() {
  const version = own().version;
  const manifestText = readFileSync(join(HERE, 'src', 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  if (manifest.version !== version) throw new BuildError(`manifest.json is ${manifest.version}, package.json ${version}`);
  if (manifest.manifestVersion !== 5) throw new BuildError('manifest.json must use manifestVersion 5');
  const files = new Map([['manifest.json', Buffer.from(manifestText)]]);
  for (const name of COPIED) files.set(name, readFileSync(join(HERE, 'src', name)));
  const { code, inline } = await bundle();
  files.set('index.js', code);
  for (const [name, bytes] of panelIcons()) files.set(name, bytes);
  files.set('LICENSE', readFileSync(enginePath('LICENSE')));
  files.set('LICENSE-APACHE-2.0', readFileSync(enginePath('LICENSE-APACHE-2.0')));
  files.set('THIRD-PARTY.md', readFileSync(enginePath('THIRD-PARTY.md')));
  files.set('LICENSE-MIT.txt', readFileSync(join(HERE, 'LICENSE')));
  files.set('NOTICE.md', Buffer.from(notice(version, inline)));
  checkFiles(files, manifest);
  const ordered = [...files].sort(([a], [b]) => (a === 'manifest.json' ? -1 : b === 'manifest.json' ? 1 : a.localeCompare(b)));
  return { files: ordered.map(([name, bytes]) => ({ name, bytes })), inline, manifest };
}

/** What UXP and this plugin's design require of the files. */
export function checkFiles(files, manifest) {
  for (const name of files.keys()) {
    if (name.split('/').some((part) => part.startsWith('.'))) throw new BuildError(`hidden file ${name}`);
  }
  if (!files.has(manifest.main)) throw new BuildError(`the manifest's main, ${manifest.main}, is not in the plugin`);
  const icons = [...manifest.icons, ...manifest.entrypoints.flatMap((entry) => entry.icons ?? [])];
  for (const icon of icons) {
    for (const scale of icon.scale) {
      const name = scale === 1 ? icon.path : icon.path.replace(/\.png$/, `@${scale}x.png`);
      if (!files.has(name)) throw new BuildError(`the manifest names the icon ${name}, which is not in the plugin`);
    }
  }
  const html = files.get('index.html').toString('utf8');
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    if (!files.has(match[1])) throw new BuildError(`index.html refers to ${match[1]}, which is not in the plugin`);
  }
  const code = files.get('index.js').toString('utf8');
  // The glue keeps a fetch branch and the asynchronous WebAssembly calls for a module given by
  // URL; the panel never takes them (the tests make them throw).
  for (const needle of ['import.meta', '_bg.wasm', 'eval(', 'new Function(', 'new Worker(']) {
    if (code.includes(needle)) throw new BuildError(`index.js contains ${needle}`);
  }
  for (const match of code.matchAll(/__require\("([^"]+)"\)/g)) {
    if (!HOST_MODULES.includes(match[1])) throw new BuildError(`index.js requires ${match[1]}`);
  }
  if (/^\s*(?:import|export)\s/m.test(code)) throw new BuildError('index.js is not a classic script');
}

async function main() {
  const version = own().version;
  const dist = join(HERE, 'dist');
  const build = join(HERE, 'build');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, 'icons'), { recursive: true });
  mkdirSync(build, { recursive: true });
  const { files, inline } = await pluginFiles();
  for (const { name, bytes } of files) writeFileSync(join(dist, name), bytes);
  const zip = writeZip(files);
  const zipName = `qrcode-barcode-scanner-photoshop-${version}.zip`;
  writeFileSync(join(build, zipName), zip);
  const receipt = {
    schema: 'qrscan-photoshop-uxp-build/1',
    version,
    node: process.version,
    zip: { path: `build/${zipName}`, bytes: zip.length, sha256: sha256(zip) },
    files: files.map(({ name, bytes }) => ({ name, bytes: bytes.length, sha256: sha256(bytes) })),
    host_modules: HOST_MODULES,
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
