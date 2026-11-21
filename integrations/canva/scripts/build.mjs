// SPDX-License-Identifier: MIT
// Build the Canva app bundle from this folder.
//
//   node scripts/build.mjs
//
// Run `npm ci` first. Writes:
//   dist/app.js             the one file the Canva Developer Portal takes, at most 5 MB, no code
//                           splitting; the engine is inlined by integrations/wasm-inline, and the
//                           file ends with the license text of every package it holds
//   dist/messages_en.json   the panel's strings for Canva's translation, from src/messages.js
//   build/build-receipt.json  sizes and SHA-256 of both files, the engine pin and the packages
// The same inputs give the same bytes.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { PACKAGE, esbuildPlugin } from '../../wasm-inline/inline.mjs';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Canva's limit for an app bundle is 5 MB. The gate uses 5,000,000 bytes, the smaller reading.
export const SIZE_LIMIT = 5_000_000;
const MESSAGE_LIMIT = 500;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const own = () => JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

export function banner(version) {
  return `/*! QR Code & Barcode Scanner for Canva ${version}, by QR Code AI.
 * This file combines parts under different licenses; LICENSE-NOTES in
 * https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/canva
 * lists each part: the app's own code (MIT), the scanner engine 0.11.0 (AGPL-3.0-or-later, with
 * Apache-2.0 notices), Canva's SDK and App UI Kit components (Canva's licence), React and the
 * other npm packages (their licenses, kept below).
 */`;
}

// The App UI Kit's stylesheet entry loads its left-to-right or right-to-left sheet with a dynamic
// import, which would split the bundle. Both sheets are inlined instead, and the one that matches
// the document's direction is added as a <style> element (Canva's policy allows inline styles).
function uiKitStyles() {
  return {
    name: 'canva-ui-kit-styles',
    setup(build) {
      build.onResolve({ filter: /^@canva\/app-ui-kit\/styles\.css$/ }, () => ({
        path: 'styles', namespace: 'canva-ui-kit-styles',
      }));
      build.onLoad({ filter: /.*/, namespace: 'canva-ui-kit-styles' }, async () => {
        const kit = join(HERE, 'node_modules', '@canva', 'app-ui-kit', 'dist');
        const sheet = async (name) => (await esbuild.transform(readFileSync(join(kit, name), 'utf8'),
          { loader: 'css', minify: true, legalComments: 'none' })).code;
        const ltr = await sheet('styles.ltr.css');
        const rtl = await sheet('styles.rtl.css');
        return {
          loader: 'js',
          contents: `const sheets = { ltr: ${JSON.stringify(ltr)}, rtl: ${JSON.stringify(rtl)} };
const style = document.createElement('style');
style.textContent = document.documentElement.getAttribute('dir') === 'rtl' ? sheets.rtl : sheets.ltr;
document.head.appendChild(style);
`,
        };
      });
    },
  };
}

// The packages whose code is in the bundle, from esbuild's metafile, with their license files.
// The engine is resolved in the inliner's own namespace, so it is added by name.
const LICENSE_FILE = /^(licen[cs]e|notice|third-party)([.-][a-z0-9.-]+)?$/i;

export function bundledPackages(metafile) {
  const inputs = Object.values(metafile.outputs)[0].inputs;
  const directories = new Map([[PACKAGE, join('node_modules', ...PACKAGE.split('/'))]]);
  for (const [path, value] of Object.entries(inputs)) {
    if (value.bytesInOutput === 0) continue;
    const at = path.lastIndexOf('node_modules/');
    if (at < 0) continue;
    const rest = path.slice(at + 'node_modules/'.length).split('/');
    const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
    directories.set(name, path.slice(0, at) + join('node_modules', name));
  }
  return [...directories].map(([name, directory]) => {
    const meta = JSON.parse(readFileSync(join(HERE, directory, 'package.json'), 'utf8'));
    const files = readdirSync(join(HERE, directory)).filter((file) => LICENSE_FILE.test(file)).sort();
    return { name, version: meta.version, license: meta.license ?? null, directory, files };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** One comment with the license text of each package, identical texts written once. */
export function licenseFooter(packages) {
  const groups = new Map();
  for (const item of packages) {
    const text = item.files.length === 0
      ? `This package ships no license file. Its package.json declares the license ${item.license}.`
      : item.files.map((file) => readFileSync(join(HERE, item.directory, file), 'utf8').trim()).join('\n\n');
    const key = text.replace(/\r\n/g, '\n');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const rank = (name) => (name === PACKAGE ? 0 : name.startsWith('@canva/') ? 1 : 2);
  const ordered = [...groups].sort(([, a], [, b]) => rank(a[0].name) - rank(b[0].name)
    || a[0].name.localeCompare(b[0].name));
  const lines = ['Licenses of the parts of this file, written by scripts/build.mjs from the files of',
    'each package. LICENSE-NOTES in integrations/canva of',
    'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust explains how they apply.'];
  for (const [text, items] of ordered) {
    lines.push('', `==== ${items.map((item) => `${item.name} ${item.version} (${item.license})`).join(', ')}`, '');
    lines.push(...text.split('\n'));
  }
  const body = lines.map((line) => (line ? ` * ${line}` : ' *').replace(/\*\//g, '* /').trimEnd());
  return `\n/*! ${body.join('\n').slice(3)}\n */\n`;
}

/** Bundle src/index.jsx into one IIFE script; returns { code, inline, metafile }. */
export async function bundle({ minify = true } = {}) {
  let inline = null;
  const result = await esbuild.build({
    entryPoints: [join(HERE, 'src', 'index.jsx')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome110', 'firefox115', 'safari16'],
    minify,
    jsx: 'automatic',
    charset: 'utf8',
    legalComments: 'eof',
    define: { 'process.env.NODE_ENV': '"production"', 'process.env["NODE_ENV"]': '"production"' },
    banner: { js: banner(own().version) },
    write: false,
    metafile: true,
    logLevel: 'silent',
    absWorkingDir: HERE,
    plugins: [esbuildPlugin(HERE, (receipt) => { inline = receipt; }), uiKitStyles()],
  });
  for (const warning of result.warnings) console.warn(`build: warning: ${warning.text}`);
  if (result.outputFiles.length !== 1) fail(`${result.outputFiles.length} output files, not one`);
  if (!inline) fail('the engine was not inlined');
  const packages = bundledPackages(result.metafile);
  const footer = new TextEncoder().encode(licenseFooter(packages));
  const bundled = result.outputFiles[0].contents;
  const code = new Uint8Array(bundled.length + footer.length);
  code.set(bundled);
  code.set(footer, bundled.length);
  return { code, inline, metafile: result.metafile, packages };
}

/** Extract the panel's strings with formatjs and check Canva's rules for the translation file. */
export function extractMessages(out) {
  const cli = join(HERE, 'node_modules', '@formatjs', 'cli', 'bin', 'formatjs');
  execFileSync(process.execPath, [cli, 'extract', 'src/**/*.{js,jsx}', '--out-file', out,
    '--throws'], { cwd: HERE, stdio: ['ignore', 'ignore', 'inherit'] });
  const messages = JSON.parse(readFileSync(out, 'utf8'));
  const entries = Object.entries(messages);
  if (entries.length === 0 || entries.length > MESSAGE_LIMIT) fail(`${entries.length} messages`);
  for (const [id, message] of entries) {
    for (const key of ['defaultMessage', 'description']) {
      const text = message[key];
      if (typeof text !== 'string' || text.trim() === '' || text.length >= 500) {
        fail(`message ${id}: ${key} must be non-empty text under 500 characters`);
      }
    }
  }
  return entries.length;
}

function packageVersion(name) {
  return JSON.parse(readFileSync(join(HERE, 'node_modules', ...name.split('/'), 'package.json'), 'utf8')).version;
}

async function main() {
  const dist = join(HERE, 'dist');
  const build = join(HERE, 'build');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  mkdirSync(build, { recursive: true });
  const { code, inline, metafile, packages } = await bundle();
  if (code.length > SIZE_LIMIT) fail(`dist/app.js is ${code.length} bytes, above ${SIZE_LIMIT}`);
  writeFileSync(join(dist, 'app.js'), code);
  const messagesPath = join(dist, 'messages_en.json');
  const count = extractMessages(messagesPath);
  const messagesBytes = readFileSync(messagesPath);
  const inputs = Object.entries(metafile.outputs)[0][1].inputs;
  const share = (prefix) => Object.entries(inputs).filter(([path]) => path.includes(prefix))
    .reduce((sum, [, value]) => sum + value.bytesInOutput, 0);
  const receipt = {
    schema: 'qrscan-canva-build/1',
    version: own().version,
    node: process.version,
    app: {
      path: 'dist/app.js', bytes: code.length, sha256: sha256(code), limit: SIZE_LIMIT,
      share: {
        engine: share('qrscan-wasm-inline'),
        ui_kit_styles: share('canva-ui-kit-styles'),
        canva_packages: share('node_modules/@canva/'),
        react: share('node_modules/react'),
      },
    },
    messages: { path: 'dist/messages_en.json', count, bytes: messagesBytes.length, sha256: sha256(messagesBytes) },
    engine: inline,
    dependencies: Object.fromEntries(Object.keys(own().dependencies).sort()
      .map((name) => [name, packageVersion(name)])),
    bundled: packages.map(({ name, version, license, files }) => ({ name, version, license, files })),
  };
  writeFileSync(join(build, 'build-receipt.json'), json(receipt));
  console.log(`dist/app.js  ${code.length} bytes (limit ${SIZE_LIMIT})  sha256 ${receipt.app.sha256}`);
  console.log(`dist/messages_en.json  ${count} messages  sha256 ${receipt.messages.sha256}`);
  console.log(`engine module sha256 ${inline.wasm_sha256}, inlined ${receipt.app.share.engine} bytes`);
}

const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === realpathSync(fileURLToPath(import.meta.url))) await main();
