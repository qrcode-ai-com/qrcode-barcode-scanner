// Inspect the package the build wrote, as an extension reviewer would open it.
//
//   node scripts/inspect.mjs [BUILD_DIR]
//
// The package holds exactly its manifest, its three license files and the module zip; the module
// zip holds exactly the expected files, each equal to the unpacked build, and every one of them is
// named by the module manifest; the WebAssembly module is the pinned one; every PHP file stops
// unless Joomla runs it and states its GPL license; every language key the module uses is
// defined; no script or PHP file calls another server, builds code from text or loads code from
// the network; updates.xml names this version, this package and its SHA-256; the package is
// under the 2 MB upload limit of a default PHP configuration. Prints the package's size and
// SHA-256 and exits 1 when it finds a problem.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readZip } from './bytes.mjs';
import { MODULE, PACKAGE_ELEMENT, packageName, tag } from './build.mjs';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const VENDOR = 'media/vendor/qrcode-barcode-scanner-wasm';
// upload_max_filesize of a PHP installation without a php.ini, as in the official Joomla image.
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const UPDATE_SERVER = 'https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/joomla/updates.xml';

export const PACKAGE_FILES = [
  'LICENSE-ENGINE.txt', 'LICENSE-MIT.txt', 'LICENSE.txt', `packages/${MODULE}.zip`, `${PACKAGE_ELEMENT}.xml`,
].sort();

export const MODULE_FILES = [
  'LICENSE-ENGINE.txt',
  `language/en-GB/${MODULE}.ini`, `language/en-GB/${MODULE}.sys.ini`,
  'media/css/scanner.css', 'media/joomla.asset.json',
  'media/js/engine.js', 'media/js/results.js', 'media/js/view.js', 'media/js/worker.js',
  ...['LICENSE', 'LICENSE-APACHE-2.0', 'THIRD-PARTY.md', 'auto.js', 'build-info.json',
    'package.json', 'qrcode-barcode-scanner.js', 'qrcode-barcode-scanner_bg.wasm']
    .map((name) => `${VENDOR}/${name}`),
  `${MODULE}.xml`, 'services/provider.php', 'src/Dispatcher/Dispatcher.php', 'tmpl/default.php',
].sort();

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
  [/\bHttpFactory\b|\bHttp\\|\bJHttp\b/, 'a request to another server'],
  [/\bcurl_\w+\s*\(/, 'cURL'],
  [/\b(fsockopen|stream_socket_client)\s*\(/, 'a socket'],
  [/\bfile_get_contents\s*\(\s*['"]https?:/, 'a remote read'],
  [/\b(eval|assert|create_function)\s*\(/, 'code built from text'],
  [/\b(base64_decode|gzinflate|str_rot13)\s*\(/, 'encoded code'],
  [/\b(exec|shell_exec|system|passthru|proc_open|popen)\s*\(/, 'a shell command'],
  [/\bsetcookie\s*\(|->set\(\s*'session/, 'stored state'],
];
const GUARD = "\\defined('_JEXEC') or die;";

function walk(directory, base = directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...walk(path, base));
    else found.push(relative(base, path).split('\\').join('/'));
  }
  return found.sort();
}

/** The files a module manifest names: <files>, <media> (under media/) and <languages>. */
export function manifestFiles(manifest, present) {
  const named = [];
  const section = (name) => (new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)</${name}>`).exec(manifest) ?? [])
    .slice(1);
  const entries = (body, prefix) => {
    for (const match of body.matchAll(/<(filename|folder|language)\b[^>]*>([^<]+)<\/\1>/g)) {
      const path = `${prefix}${match[2].trim()}`;
      if (match[1] === 'folder') named.push(...present.filter((file) => file.startsWith(`${path}/`)));
      else named.push(path);
    }
  };
  const [, files = ''] = section('files');
  entries(files, '');
  const [mediaAttributes = '', media = ''] = section('media');
  const folder = /folder="([^"]+)"/.exec(mediaAttributes);
  entries(media, folder ? `${folder[1]}/` : '');
  const [languageAttributes = '', languages = ''] = section('languages');
  const languageFolder = /folder="([^"]+)"/.exec(languageAttributes);
  entries(languages, languageFolder ? `${languageFolder[1]}/` : '');
  return [...new Set(named)].sort();
}

/** The keys an .ini language file defines; a malformed line is a problem. */
export function iniKeys(text, problems, where) {
  const keys = new Set();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim() || line.startsWith(';')) continue;
    const match = /^([A-Z0-9_]+)="((?:[^"\\]|\\.)*)"$/.exec(line);
    if (!match) problems.push(`${where}:${index + 1} is not KEY="value"`);
    else keys.add(match[1]);
  }
  return keys;
}

/** The problems of the module zip's files (a Map of path to bytes); `unpacked` is the build folder. */
export function inspectModule(files, unpacked = null) {
  const problems = [];
  const problem = (text) => { problems.push(text); };
  const names = [...files.keys()].sort();
  if (JSON.stringify(names) !== JSON.stringify(MODULE_FILES)) {
    const extra = names.filter((name) => !MODULE_FILES.includes(name));
    const missing = MODULE_FILES.filter((name) => !names.includes(name));
    problem(`module entries differ: extra ${extra.join(', ') || 'none'}; missing ${missing.join(', ') || 'none'}`);
  }
  if (unpacked) {
    const onDisk = walk(unpacked);
    if (JSON.stringify(onDisk) !== JSON.stringify(names)) problem('the module zip and its folder differ');
    for (const name of names) {
      if (onDisk.includes(name) && !files.get(name).equals(readFileSync(join(unpacked, name)))) {
        problem(`${name} differs from the unpacked build`);
      }
    }
  }
  const text = (name) => (files.get(name) ?? Buffer.alloc(0)).toString('utf8');
  const manifest = text(`${MODULE}.xml`);
  if (!/<extension type="module" client="site" method="upgrade">/.test(manifest)) {
    problem('the module manifest is not a site module installed with method="upgrade"');
  }
  if (tag(manifest, 'version') !== own.version) problem(`the module manifest says ${tag(manifest, 'version')}`);
  if (!/GNU General Public License/.test(tag(manifest, 'license') ?? '')) problem('the module manifest names no GPL license');
  const named = manifestFiles(manifest, names);
  const unnamed = names.filter((name) => name !== `${MODULE}.xml` && !named.includes(name));
  const absent = named.filter((name) => !names.includes(name));
  if (unnamed.length) problem(`files the manifest does not name: ${unnamed.join(', ')}`);
  if (absent.length) problem(`files the manifest names that are absent: ${absent.join(', ')}`);

  const wasm = files.get(`${VENDOR}/qrcode-barcode-scanner_bg.wasm`) ?? Buffer.alloc(0);
  const info = JSON.parse(text(`${VENDOR}/build-info.json`) || '{}');
  if (sha256(wasm) !== own.config.wasmSha256 || info.wasm?.sha256 !== own.config.wasmSha256) {
    problem('the WebAssembly module is not the pinned one');
  }
  const assets = JSON.parse(text('media/joomla.asset.json') || '{"assets":[]}');
  for (const asset of assets.assets) {
    const folder = asset.type === 'script' ? 'js' : 'css';
    const file = `media/${folder}/${asset.uri.split('/').pop()}`;
    if (!names.includes(file)) problem(`the asset ${asset.name} names ${asset.uri}, which is not in media/${folder}/`);
  }

  const keys = new Set([
    ...iniKeys(text(`language/en-GB/${MODULE}.ini`), problems, `${MODULE}.ini`),
    ...iniKeys(text(`language/en-GB/${MODULE}.sys.ini`), problems, `${MODULE}.sys.ini`),
  ]);
  const used = new Set();
  for (const [name, bytes] of files) {
    if (!/\.(php|xml)$/.test(name)) continue;
    for (const match of bytes.toString('utf8').matchAll(/\bMOD_QRCODEBARCODESCANNER(?:_[A-Z0-9]+)*\b/g)) {
      used.add(match[0]);
    }
  }
  // The Dispatcher builds the JS_ and KIND_ keys from its two lists.
  const dispatcher = text('src/Dispatcher/Dispatcher.php');
  const list = (name) => [...(new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(dispatcher)?.[1] ?? '')
    .matchAll(/'([a-z_A-Z0-9]+)'/g)].map((match) => match[1].toUpperCase());
  for (const name of list('TEXTS')) used.add(`MOD_QRCODEBARCODESCANNER_JS_${name}`);
  for (const name of list('KINDS')) used.add(`MOD_QRCODEBARCODESCANNER_KIND_${name}`);
  for (const key of ['MOD_QRCODEBARCODESCANNER_JS', 'MOD_QRCODEBARCODESCANNER_KIND']) used.delete(key);
  const undefinedKeys = [...used].filter((key) => !keys.has(key)).sort();
  if (undefinedKeys.length) problem(`language keys used but not defined: ${undefinedKeys.join(', ')}`);

  for (const [name, bytes] of files) {
    const source = bytes.toString('utf8');
    if (/\.(m?js)$/.test(name) && !name.startsWith(VENDOR)) {
      for (const [pattern, what] of FORBIDDEN_SCRIPT) {
        if (pattern.test(source)) problem(`${name} contains ${what}`);
      }
    }
    if (name.startsWith(VENDOR) && /\.js$/.test(name)) {
      for (const [pattern, what] of FORBIDDEN_SCRIPT.slice(0, 5)) {
        if (pattern.test(source)) problem(`${name} contains ${what}`);
      }
    }
    if (name.endsWith('.php')) {
      if (!source.startsWith('<?php')) problem(`${name} does not start with <?php`);
      if (!source.includes(GUARD)) problem(`${name} does not stop unless Joomla runs it`);
      if (!/@license\s+GNU General Public License version 3 or later/.test(source)) {
        problem(`${name} does not state its GPL license`);
      }
      for (const [pattern, what] of FORBIDDEN_PHP) {
        if (pattern.test(source)) problem(`${name} contains ${what}`);
      }
    }
    if (/(^|\/)\.|\.(zip|phar|exe|sh|tar|gz)$/.test(name)) problem(`${name} is a file an extension should not hold`);
  }
  return problems;
}

/** The problems of the package (a Map of path to bytes) and of the update file. */
export function inspectPackage(files, updates, archiveSha256) {
  const problems = [];
  const names = [...files.keys()].sort();
  if (JSON.stringify(names) !== JSON.stringify(PACKAGE_FILES)) {
    problems.push(`package entries differ: ${names.join(', ')}`);
  }
  const manifest = (files.get(`${PACKAGE_ELEMENT}.xml`) ?? Buffer.alloc(0)).toString('utf8');
  if (!/<extension type="package" method="upgrade">/.test(manifest)) problems.push('the package manifest is not a package installed with method="upgrade"');
  if (tag(manifest, 'version') !== own.version) problems.push(`the package manifest says ${tag(manifest, 'version')}`);
  if (tag(manifest, 'packagename') !== 'qrcodebarcodescanner') problems.push('the package name is not qrcodebarcodescanner');
  if (!manifest.includes(`<file type="module" id="${MODULE}" client="site">${MODULE}.zip</file>`)) {
    problems.push('the package manifest does not name the site module');
  }
  const server = /<server type="extension" name="[^"]+">([^<]+)<\/server>/.exec(manifest);
  if (!server || server[1] !== UPDATE_SERVER) problems.push(`the update server is ${server ? server[1] : 'missing'}`);
  for (const [field, value] of [['element', PACKAGE_ELEMENT], ['type', 'package'], ['version', own.version],
    ['client', 'site'], ['sha256', archiveSha256]]) {
    if (tag(updates, field) !== value) problems.push(`updates.xml <${field}> is ${tag(updates, field)}, not ${value}`);
  }
  const download = tag(updates, 'downloadurl');
  if (!download || !download.endsWith(`/releases/download/joomla-v${own.version}/${packageName(own.version)}`)) {
    problems.push(`updates.xml downloads ${download}`);
  }
  return problems;
}

function main() {
  const build = resolve(process.argv[2] ?? join(HERE, 'build'));
  const path = join(build, packageName(own.version));
  const archive = readFileSync(path);
  const files = readZip(archive);
  const updates = readFileSync(join(HERE, 'updates.xml'), 'utf8');
  const problems = [
    ...inspectPackage(files, updates, sha256(archive)),
    ...inspectModule(readZip(files.get(`packages/${MODULE}.zip`)), join(build, MODULE)),
  ];
  if (archive.length > MAX_UPLOAD_BYTES) {
    problems.push(`the package is ${archive.length} bytes, over the 2 MB default upload limit of PHP`);
  }
  console.log(`${relative(build, path)}  ${archive.length} bytes  ${files.size} entries  sha256 ${sha256(archive)}`);
  for (const text of problems) console.error(`problem: ${text}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

// Run as a script, also through a symbolic link (macOS puts temporary folders behind one).
const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === realpathSync(fileURLToPath(import.meta.url))) main();
