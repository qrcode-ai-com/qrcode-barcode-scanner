// SPDX-License-Identifier: MIT
// One JavaScript module that holds the published WebAssembly engine, for hosts that load a single
// script file: a Canva app (one app.js, no code splitting), a Photoshop UXP panel (no fetch of a
// local .wasm), a worker built as one classic script.
//
//   node inline.mjs [--root DIR] --out FILE [--receipt FILE]
//
// DIR is the consuming integration's folder (default: the current directory). Run `npm ci` there
// first: the engine is read from DIR/node_modules/@qrcode-ai-com/qrcode-barcode-scanner-wasm,
// after its version, its lockfile entry and the SHA-256 of its module are checked against the
// pins of DIR/package.json (`dependencies` and `config.wasmSha256`). Nothing is downloaded.
//
// FILE is an ES module with the package's own JavaScript glue, unchanged except for one line, and
// the module's bytes in base64. That line is the glue's default input, `new URL(
// 'qrcode-barcode-scanner_bg.wasm', import.meta.url)`: a bundler reads it as an asset to emit and
// a host without a URL for the script cannot resolve it. It becomes the inlined bytes, so the
// file holds no `import.meta`, and the default export, `initSync` and the scan functions keep
// their meaning. Two helpers are added: `initInline()` (asynchronous compile, allowed on a main
// thread) and `initInlineSync()` (synchronous, for a worker or a host that allows it).
//
// The same inputs give the same file. `esbuildPlugin(root)` serves the same module to esbuild
// in place of the package, so a host's source imports the package by its name.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
const GLUE = 'qrcode-barcode-scanner.js';
const MODULE = 'qrcode-barcode-scanner_bg.wasm';
// The one line of the glue that resolves the module next to the script.
const DEFAULT_INPUT = `module_or_path = new URL('${MODULE}', import.meta.url);`;
const INLINE_INPUT = 'module_or_path = inlineModuleBytes();';
export const RECEIPT_SCHEMA = 'qrscan-wasm-inline/1';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export class InlineError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InlineError';
  }
}

const count = (text, needle) => text.split(needle).length - 1;

/** The pinned engine package of a consuming folder, checked; throws InlineError otherwise. */
export function checkedPackage(root) {
  const own = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const pinned = own.dependencies?.[PACKAGE] ?? own.devDependencies?.[PACKAGE];
  const expected = own.config?.wasmSha256;
  if (!/^\d+\.\d+\.\d+$/.test(String(pinned))) {
    throw new InlineError(`package.json must pin ${PACKAGE} to one exact version`);
  }
  if (!/^[0-9a-f]{64}$/.test(String(expected))) {
    throw new InlineError('package.json must give config.wasmSha256, the module SHA-256');
  }
  const directory = join(root, 'node_modules', ...PACKAGE.split('/'));
  let installed;
  try {
    installed = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  } catch {
    throw new InlineError(`${PACKAGE} is not installed in ${root}: run npm ci first`);
  }
  if (installed.version !== pinned) {
    throw new InlineError(`${PACKAGE} ${installed.version} installed, ${pinned} pinned`);
  }
  const info = JSON.parse(readFileSync(join(directory, 'build-info.json'), 'utf8'));
  const wasm = readFileSync(join(directory, MODULE));
  const actual = sha256(wasm);
  if (info.version !== pinned) {
    throw new InlineError(`build-info.json names ${info.version}, not ${pinned}`);
  }
  if (actual !== info.wasm.sha256) {
    throw new InlineError(`module SHA-256 ${actual} differs from build-info.json`);
  }
  if (actual !== expected) {
    throw new InlineError(`module SHA-256 ${actual} differs from the pin ${expected}`);
  }
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const locked = lock.packages?.[`node_modules/${PACKAGE}`];
  if (!locked || locked.version !== pinned) {
    throw new InlineError(`package-lock.json does not pin ${PACKAGE} ${pinned}`);
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

/** The glue with its default input replaced; throws when the glue is not the expected shape. */
export function patchGlue(glue) {
  const found = count(glue, DEFAULT_INPUT);
  if (found !== 1) {
    throw new InlineError(`the glue holds ${found} copies of its default input line, not 1`);
  }
  const patched = glue.replace(DEFAULT_INPUT, INLINE_INPUT);
  for (const needle of ['import.meta', `'${MODULE}'`, '"' + MODULE + '"']) {
    if (patched.includes(needle)) {
      throw new InlineError(`the patched glue still holds ${needle}`);
    }
  }
  if (!/^export \{ initSync, __wbg_init as default \};$/m.test(patched)) {
    throw new InlineError('the glue does not export initSync and its default init');
  }
  return patched;
}

// Decodes base64 without depending on atob, which some hosts (Photoshop UXP) do not document.
const DECODER = `function decodeBase64(text) {
  if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(text);
  if (typeof atob === 'function') {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const table = new Uint8Array(128);
  for (let i = 0; i < alphabet.length; i += 1) table[alphabet.charCodeAt(i)] = i;
  const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((text.length / 4) * 3 - padding);
  let out = 0;
  for (let i = 0; i < text.length; i += 4) {
    const n = (table[text.charCodeAt(i)] << 18) | (table[text.charCodeAt(i + 1)] << 12)
      | (table[text.charCodeAt(i + 2)] << 6) | table[text.charCodeAt(i + 3)];
    if (out < bytes.length) bytes[out++] = n >> 16;
    if (out < bytes.length) bytes[out++] = (n >> 8) & 255;
    if (out < bytes.length) bytes[out++] = n & 255;
  }
  return bytes;
}`;

function banner(scanner) {
  return `/*! QR Code & Barcode Scanner engine ${scanner.version}: the WebAssembly module and JavaScript
 * glue of the npm package ${scanner.name} ${scanner.version}, inlined in one file.
 * License of this part: ${scanner.license}, with Apache-2.0 notices for the code derived from
 * rxing (LICENSE, LICENSE-APACHE-2.0 and THIRD-PARTY.md of that package).
 * Corresponding source: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust at tag
 * v${scanner.version}, revision ${scanner.source_revision}.
 * Module SHA-256 ${scanner.wasm_sha256}, ${scanner.wasm_bytes} bytes.
 */`;
}

/** The inlined module's source text and its receipt, for a checked package. */
export function inlineSource(scanner) {
  const glue = readFileSync(join(scanner.directory, GLUE), 'utf8');
  const wasm = readFileSync(join(scanner.directory, MODULE));
  if (sha256(wasm) !== scanner.wasm_sha256) {
    throw new InlineError('the module changed after it was checked');
  }
  const base64 = wasm.toString('base64');
  const info = {
    package: scanner.name,
    version: scanner.version,
    license: scanner.license,
    wasm_sha256: scanner.wasm_sha256,
    wasm_bytes: scanner.wasm_bytes,
    source_revision: scanner.source_revision,
  };
  const code = [
    banner(scanner),
    `// Generated by integrations/wasm-inline/inline.mjs from ${scanner.name} ${scanner.version}.`,
    '// Only the default input of __wbg_init differs from the package glue. Do not edit.',
    patchGlue(glue).trimEnd(),
    '',
    '// ---- the inlined WebAssembly module',
    `const MODULE_BASE64 = '${base64}';`,
    '',
    DECODER,
    '',
    '/** The bytes of the WebAssembly module, decoded on each call. */',
    'function inlineModuleBytes() {',
    '  return decodeBase64(MODULE_BASE64);',
    '}',
    '',
    '/** Compile and instantiate the inlined module asynchronously (allowed on a main thread). */',
    'export function initInline() {',
    '  return __wbg_init({ module_or_path: inlineModuleBytes() });',
    '}',
    '',
    '/** Compile and instantiate the inlined module synchronously (a worker, or a host that allows it). */',
    'export function initInlineSync() {',
    '  return initSync({ module: inlineModuleBytes() });',
    '}',
    '',
    `/** What this file holds. */`,
    `export const INLINE_MODULE = Object.freeze(${JSON.stringify(info)});`,
    '',
  ].join('\n');
  const receipt = {
    schema: RECEIPT_SCHEMA,
    ...info,
    integrity: scanner.integrity,
    base64_bytes: base64.length,
    output_bytes: Buffer.byteLength(code),
    output_sha256: sha256(Buffer.from(code)),
  };
  return { code, receipt };
}

/** Write the inlined module of the folder ROOT to OUT; returns the receipt. */
export function writeInline(root, out, receiptPath) {
  const { code, receipt } = inlineSource(checkedPackage(resolve(root)));
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, code);
  if (receiptPath) {
    mkdirSync(dirname(resolve(receiptPath)), { recursive: true });
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }
  return receipt;
}

/**
 * An esbuild plugin that resolves the bare package name to the inlined module of ROOT, so a
 * host's source keeps `import init, { scan_image } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm'`.
 * Any other subpath of the package is refused: it would load files next to the script.
 * `onReceipt` receives the receipt of the module it served.
 */
export function esbuildPlugin(root, onReceipt = () => {}) {
  const escaped = PACKAGE.replace(/[/@-]/g, (c) => `\\${c}`);
  return {
    name: 'qrscan-wasm-inline',
    setup(build) {
      build.onResolve({ filter: new RegExp(`^${escaped}(/.*)?$`) }, (args) => {
        if (args.path !== PACKAGE) {
          return { errors: [{ text: `${args.path}: only ${PACKAGE} itself is inlined` }] };
        }
        return { path: PACKAGE, namespace: 'qrscan-wasm-inline' };
      });
      build.onLoad({ filter: /.*/, namespace: 'qrscan-wasm-inline' }, () => {
        const { code, receipt } = inlineSource(checkedPackage(resolve(root)));
        onReceipt(receipt);
        return { contents: code, loader: 'js', resolveDir: resolve(root) };
      });
    },
  };
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function main() {
  const out = argument('--out');
  if (!out) {
    console.error('usage: node inline.mjs [--root DIR] --out FILE [--receipt FILE]');
    process.exit(2);
  }
  try {
    const receipt = writeInline(argument('--root', process.cwd()), out, argument('--receipt'));
    console.log(`${out}  ${receipt.output_bytes} bytes  sha256 ${receipt.output_sha256}`
      + `  (module ${receipt.wasm_bytes} bytes, base64 ${receipt.base64_bytes})`);
  } catch (error) {
    if (!(error instanceof InlineError)) throw error;
    console.error(`inline: ${error.message}`);
    process.exit(1);
  }
}

// Run as a script, also through a symbolic link (macOS puts temporary folders behind one).
const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === realpathSync(fileURLToPath(import.meta.url))) main();
