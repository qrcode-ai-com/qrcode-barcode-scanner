// SPDX-License-Identifier: MIT
// Builds main.js, the one script Obsidian loads: the plugin source and the published engine
// WASM module, embedded as bytes (Obsidian downloads only main.js, manifest.json and
// styles.css from a release, so the module cannot be a separate file). The output is not
// minified, so the plugin source stays readable for review.
//
//   node scripts/build.mjs [--out DIR]     writes DIR/main.js (default: this folder)
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = process.argv.indexOf('--out');
const out = resolve(at > 0 ? process.argv[at + 1] : here);
const require = createRequire(join(here, 'package.json'));
const engine = JSON.parse(readFileSync(require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm/package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8'));
const wasmPath = require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm');
const wasmSha = createHash('sha256').update(readFileSync(wasmPath)).digest('hex');

// Obsidian installs only main.js, so the engine's own license texts travel inside it: the
// published package's LICENSE, LICENSE-APACHE-2.0 and THIRD-PARTY.md, byte for byte, in a
// closing comment.
const notices = ['LICENSE', 'LICENSE-APACHE-2.0', 'THIRD-PARTY.md'].map((name) => {
  const text = readFileSync(join(dirname(wasmPath), name), 'utf8');
  if (text.includes('*/')) throw new Error(`${name} of the engine package cannot sit in a comment`);
  return `----- ${engine.name}@${engine.version} · ${name} -----\n${text}`;
});

const banner = [
  `/* ${manifest.name} ${manifest.version} for Obsidian. Source: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/obsidian`,
  ' * The plugin source is MIT. This file also embeds the published engine',
  ` * ${engine.name}@${engine.version} (${engine.license}), its WebAssembly module as base64 (sha256 ${wasmSha}).`,
  ` * That component keeps its own license; its source is https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v${engine.version}`,
  ' * and its license texts close this file (also ENGINE-LICENSE, ENGINE-LICENSE-APACHE-2.0 and ENGINE-THIRD-PARTY.md in the plugin repository). */',
].join('\n');
const footer = `/*!\n${notices.join('\n')}*/`;

const result = await build({
  entryPoints: [join(here, 'src/main.ts')],
  outfile: join(out, 'main.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  // Obsidian provides these modules to plugins; nothing else is loaded at run time.
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  loader: { '.wasm': 'binary' },
  // The engine's loader reads import.meta.url only when it must fetch the module itself, which
  // this plugin never asks for: it always passes the embedded bytes.
  define: { 'import.meta.url': 'undefined' },
  banner: { js: banner },
  footer: { js: footer },
  legalComments: 'inline',
  minify: false,
  sourcemap: false,
  logLevel: 'warning',
  metafile: true,
});
if (result.errors.length || result.warnings.length) {
  console.error(result.warnings);
  process.exit(1);
}
const mainPath = join(out, 'main.js');
const size = statSync(mainPath).size;
const sha = createHash('sha256').update(readFileSync(mainPath)).digest('hex');
console.log(JSON.stringify({ main: mainPath, bytes: size, sha256: sha, engine: `${engine.name}@${engine.version}`,
  wasmBytes: statSync(wasmPath).size, wasmSha256: wasmSha }, null, 2));
