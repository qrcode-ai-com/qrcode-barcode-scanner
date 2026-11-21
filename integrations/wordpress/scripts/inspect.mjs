// Inspect the plugin zip the build wrote, as a plugin reviewer would open it.
//
//   node scripts/inspect.mjs [BUILD_DIR]
//
// The entries are exactly the expected files, all in the qrcode-barcode-scanner/ folder, each
// equal to the unpacked build; the WebAssembly module and its build-info.json are the pinned
// ones; the header, the readme and block.json agree; every PHP file stops when it is opened
// directly; no script or PHP file calls another server, builds code from text or loads code from
// the network; the zip is under the directory's 10 MB limit. Prints the zip's size and SHA-256
// and exits 1 when it finds a problem.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readZip } from './bytes.mjs';
import { headers } from './build.mjs';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'qrcode-barcode-scanner';
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const VENDOR = 'assets/vendor/qrcode-barcode-scanner-wasm';
// The WordPress.org upload limit for a plugin zip.
const MAX_BYTES = 10 * 1024 * 1024;

export const EXPECTED_FILES = [
  'LICENSE', 'LICENSE-MIT', 'LICENSE-NOTES.txt', 'PROVENANCE.json',
  'assets/scanner/engine.js', 'assets/scanner/results.js', 'assets/scanner/scanner.css',
  'assets/scanner/view.js', 'assets/scanner/worker.js',
  ...['LICENSE', 'LICENSE-APACHE-2.0', 'THIRD-PARTY.md', 'auto.js', 'build-info.json',
    'package.json', 'qrcode-barcode-scanner.js', 'qrcode-barcode-scanner_bg.wasm']
    .map((name) => `${VENDOR}/${name}`),
  'build/scanner/block.json', 'build/scanner/index.asset.php', 'build/scanner/index.js',
  'build/scanner/render.php',
  'includes/engine.php', 'includes/markup.php',
  'qrcode-barcode-scanner.php', 'readme.txt',
  'src/scanner/block.json', 'src/scanner/index.js', 'src/scanner/render.php',
].map((name) => `${SLUG}/${name}`).sort();

// Code built from text, code fetched from elsewhere, or a call to another server.
const FORBIDDEN_SCRIPT = [
  [/\beval\s*\(/, 'eval('],
  [/\bnew\s+Function\s*\(/, 'new Function('],
  [/\bimportScripts\s*\(/, 'importScripts('],
  [/\bimport\s*\(\s*['"`]https?:/, 'a remote import'],
  [/\bfrom\s+['"]https?:/, 'a remote import'],
  [/\bfetch\s*\(\s*['"`]https?:/, 'a request to another server'],
  [/\bnew\s+WebSocket\s*\(/, 'a WebSocket'],
  [/\bnavigator\.sendBeacon\s*\(/, 'a beacon'],
];
const FORBIDDEN_PHP = [
  [/\bwp_(safe_)?remote_(get|post|request|head)\s*\(/, 'a request to another server'],
  [/\bdownload_url\s*\(/, 'a download'],
  [/\bcurl_\w+\s*\(/, 'cURL'],
  [/\b(fsockopen|stream_socket_client)\s*\(/, 'a socket'],
  [/\bfile_get_contents\s*\(\s*['"]https?:/, 'a remote read'],
  [/\b(eval|assert|create_function)\s*\(/, 'code built from text'],
  [/\b(base64_decode|gzinflate|str_rot13)\s*\(/, 'encoded code'],
  [/\b(exec|shell_exec|system|passthru|proc_open|popen)\s*\(/, 'a shell command'],
  [/\b(add_option|update_option|set_transient|setcookie|wpdb)\b/, 'stored state'],
  [/<script[^>]+src=/i, 'a script tag'],
];
const GUARD = "defined( 'ABSPATH' ) || exit;";

function walk(directory, base = directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...walk(path, base));
    else found.push(relative(base, path).split('\\').join('/'));
  }
  return found.sort();
}

/** The problems of the plugin's files (a Map of zip path to bytes); `unpacked` is the build folder. */
export function inspectPlugin(files, unpacked = null) {
  const problems = [];
  const problem = (text) => { problems.push(text); };
  const names = [...files.keys()].sort();
  if (JSON.stringify(names) !== JSON.stringify(EXPECTED_FILES)) {
    const extra = names.filter((name) => !EXPECTED_FILES.includes(name));
    const missing = EXPECTED_FILES.filter((name) => !names.includes(name));
    problem(`entries differ from the expected list: extra ${extra.join(', ') || 'none'}; missing ${missing.join(', ') || 'none'}`);
  }
  if (unpacked) {
    const onDisk = walk(unpacked).map((name) => `${SLUG}/${name}`);
    if (JSON.stringify(onDisk) !== JSON.stringify(names)) problem('zip and folder differ');
    for (const name of names) {
      if (onDisk.includes(name) && !files.get(name).equals(readFileSync(join(unpacked, name.slice(SLUG.length + 1))))) {
        problem(`${name} differs from the unpacked build`);
      }
    }
  }
  const text = (name) => (files.get(`${SLUG}/${name}`) ?? Buffer.alloc(0)).toString('utf8');
  const wasm = files.get(`${SLUG}/${VENDOR}/qrcode-barcode-scanner_bg.wasm`) ?? Buffer.alloc(0);
  const info = JSON.parse(text(`${VENDOR}/build-info.json`) || '{}');
  if (sha256(wasm) !== own.config.wasmSha256 || info.wasm?.sha256 !== own.config.wasmSha256) {
    problem('the WebAssembly module is not the pinned one');
  }
  if (!text('includes/engine.php').includes(`'wasm_sha256' => '${own.config.wasmSha256}'`)) {
    problem('includes/engine.php does not name the pinned module');
  }

  const header = headers(text('qrcode-barcode-scanner.php'));
  const readme = headers(text('readme.txt'));
  const block = JSON.parse(text('build/scanner/block.json') || '{}');
  if (header.Version !== own.version || readme['Stable tag'] !== own.version || block.version !== own.version) {
    problem(`versions differ: header ${header.Version}, readme ${readme['Stable tag']}, block ${block.version}`);
  }
  if (header['Text Domain'] !== SLUG || block.textdomain !== SLUG) problem('the text domain is not the slug');
  for (const field of ['Requires at least', 'Requires PHP', 'License']) {
    if (header[field] !== readme[field]) problem(`${field} differs between the header and readme.txt`);
  }
  if (!/^=== QR Code & Barcode Scanner ===/.test(text('readme.txt'))) problem('readme.txt does not start with the plugin name');
  const tags = (readme.Tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean);
  if (tags.length === 0 || tags.length > 5) problem(`readme.txt has ${tags.length} tags, the directory reads at most 5`);
  const short = text('readme.txt').split('\n').find((line, index, lines) => index > 0
    && lines.slice(0, index).some((before) => before.startsWith('License URI')) && line.trim());
  if (!short || short.length > 150) problem('the short description is missing or longer than 150 characters');

  for (const [name, bytes] of files) {
    const source = bytes.toString('utf8');
    if (/\.(m?js)$/.test(name)) {
      for (const [pattern, what] of FORBIDDEN_SCRIPT) {
        if (pattern.test(source)) problem(`${name} contains ${what}`);
      }
    }
    if (name.endsWith('.php')) {
      if (!source.startsWith('<?php')) problem(`${name} does not start with <?php`);
      // The build's index.asset.php only returns an array: opened directly, it does nothing.
      const dataOnly = /^<\?php\s+return\s+array\([^;]*\);\s*$/.test(source);
      if (!source.includes(GUARD) && !dataOnly) problem(`${name} does not stop when it is opened directly`);
      for (const [pattern, what] of FORBIDDEN_PHP) {
        if (pattern.test(source)) problem(`${name} contains ${what}`);
      }
    }
    if (/(^|\/)\.|\.(zip|phar|exe|sh|tar|gz)$/.test(name)) problem(`${name} is a file the directory refuses`);
  }
  return problems;
}

function main() {
  const build = resolve(process.argv[2] ?? join(HERE, 'build'));
  const path = join(build, `${SLUG}-${own.version}.zip`);
  const archive = readFileSync(path);
  const files = readZip(archive);
  const problems = inspectPlugin(files, join(build, SLUG));
  if (archive.length > MAX_BYTES) problems.push(`the zip is ${archive.length} bytes, over the 10 MB limit`);
  console.log(`${relative(build, path)}  ${archive.length} bytes  ${files.size} entries  sha256 ${sha256(archive)}`);
  for (const text of problems) console.error(`problem: ${text}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

// Run as a script, also through a symbolic link (macOS puts temporary folders behind one).
const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === realpathSync(fileURLToPath(import.meta.url))) main();
