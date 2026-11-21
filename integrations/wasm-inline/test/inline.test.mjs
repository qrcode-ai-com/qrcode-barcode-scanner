// SPDX-License-Identifier: MIT
// The generator: the pins it checks, the one line it changes, and the generated module itself,
// imported by Node and run on the mixed fixture in fast, frame and full.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  InlineError, PACKAGE, checkedPackage, inlineSource, patchGlue, writeInline,
} from '../inline.mjs';
import {
  ENGINE, HERE, PROFILES, WASM_SHA256, assertMixed, scratch, stageFixture,
} from './helpers.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const packageDir = join(HERE, 'node_modules', ...PACKAGE.split('/'));
const fixture = readFileSync(stageFixture());

/** Write the generated module to a new file and import it: a fresh module instance each time. */
async function freshModule(name) {
  const directory = scratch(name);
  const path = join(directory, 'qrcode-barcode-scanner.inline.mjs');
  writeInline(HERE, path);
  return import(pathToFileURL(path).href);
}

test('the pinned package is checked: version, module SHA-256, lockfile entry', () => {
  const scanner = checkedPackage(HERE);
  assert.equal(scanner.name, PACKAGE);
  assert.equal(scanner.version, ENGINE);
  assert.equal(scanner.wasm_sha256, WASM_SHA256);
  assert.equal(scanner.wasm_bytes, 2220640);
  assert.equal(scanner.license, 'AGPL-3.0-or-later');
  assert.equal(scanner.source_revision, '176ac96ef16ee330dbfc6ada10327d0b4e23a8b2');
  assert.match(scanner.integrity, /^sha512-/);
});

test('the generated module holds the module bytes and no reference to a file next to it', () => {
  const { code, receipt } = inlineSource(checkedPackage(HERE));
  assert.equal(code.includes('import.meta'), false, 'no import.meta');
  assert.equal(code.includes('_bg.wasm'), false, 'no name of the module file');
  assert.equal(code.split('new URL(').length - 1, 0, 'no URL built from the script address');
  const base64 = /const MODULE_BASE64 = '([A-Za-z0-9+/=]+)';/.exec(code)[1];
  const decoded = Buffer.from(base64, 'base64');
  assert.equal(sha256(decoded), WASM_SHA256, 'the base64 is the pinned module');
  assert.equal(receipt.base64_bytes, base64.length);
  assert.equal(receipt.base64_bytes, 2960856, 'about 2.96 MB of base64 for the 2,220,640-byte module');
  assert.equal(receipt.output_bytes, Buffer.byteLength(code));
  assert.equal(receipt.output_sha256, sha256(Buffer.from(code)));
  assert.match(code, /^\/\*! QR Code & Barcode Scanner engine 0\.11\.0/, 'the license banner first');
  assert.match(code, /License of this part: AGPL-3\.0-or-later/);
  assert.match(code, /revision 176ac96ef16ee330dbfc6ada10327d0b4e23a8b2/);
});

test('only the default input line differs from the package glue', () => {
  const glue = readFileSync(join(packageDir, 'qrcode-barcode-scanner.js'), 'utf8');
  const { code } = inlineSource(checkedPackage(HERE));
  const start = code.indexOf(glue.slice(0, 80));
  assert.ok(start > 0, 'the glue follows the banner');
  const patchedGlue = code.slice(start, code.indexOf('\n\n// ---- the inlined WebAssembly module'));
  const before = glue.trimEnd().split('\n');
  const after = patchedGlue.split('\n');
  assert.equal(after.length, before.length, 'same number of lines');
  const changed = before.map((line, index) => [line, after[index]]).filter(([a, b]) => a !== b);
  assert.deepEqual(changed, [[
    "        module_or_path = new URL('qrcode-barcode-scanner_bg.wasm', import.meta.url);",
    '        module_or_path = inlineModuleBytes();',
  ]]);
});

test('the same inputs give the same bytes', () => {
  const first = inlineSource(checkedPackage(HERE));
  const second = inlineSource(checkedPackage(HERE));
  assert.equal(first.code, second.code);
  assert.deepEqual(first.receipt, second.receipt);
});

test('initInline (asynchronous) reads the mixed fixture in fast, frame and full', async () => {
  const engine = await freshModule('async');
  await engine.initInline();
  assert.equal(engine.version(), ENGINE);
  assert.deepEqual(engine.INLINE_MODULE, {
    package: PACKAGE, version: ENGINE, license: 'AGPL-3.0-or-later', wasm_sha256: WASM_SHA256,
    wasm_bytes: 2220640, source_revision: '176ac96ef16ee330dbfc6ada10327d0b4e23a8b2',
  });
  for (const profile of PROFILES) {
    const report = engine.scan_image(new Uint8Array(fixture), profile, undefined, undefined, 0);
    assertMixed(assert, report, `initInline ${profile}`);
  }
});

test('initInlineSync and the default init with no argument load the same module', async () => {
  const sync = await freshModule('sync');
  sync.initInlineSync();
  assertMixed(assert, sync.scan_image(new Uint8Array(fixture), 'frame', undefined, undefined, 0),
    'initInlineSync frame');
  const plain = await freshModule('default');
  await plain.default();
  assertMixed(assert, plain.scan_image(new Uint8Array(fixture), 'fast', undefined, undefined, 0),
    'default init fast');
});

test('the base64 decoder works without atob and without Uint8Array.fromBase64', async () => {
  const saved = { atob: globalThis.atob, fromBase64: Uint8Array.fromBase64 };
  try {
    delete globalThis.atob;
    delete Uint8Array.fromBase64;
    assert.equal(typeof globalThis.atob, 'undefined');
    const engine = await freshModule('decoder');
    await engine.initInline();
    assertMixed(assert, engine.scan_image(new Uint8Array(fixture), 'full', undefined, undefined, 0),
      'table decoder full');
  } finally {
    globalThis.atob = saved.atob;
    if (saved.fromBase64) Uint8Array.fromBase64 = saved.fromBase64;
  }
});

test('a glue without exactly one default input line is refused', () => {
  const glue = readFileSync(join(packageDir, 'qrcode-barcode-scanner.js'), 'utf8');
  const line = "module_or_path = new URL('qrcode-barcode-scanner_bg.wasm', import.meta.url);";
  assert.throws(() => patchGlue(glue.replace(line, '')), InlineError);
  assert.throws(() => patchGlue(glue.replace(line, `${line}\n${line}`)), InlineError);
  assert.throws(() => patchGlue(`${glue}\nconsole.log(import.meta.url);\n`), /still holds import\.meta/);
  assert.throws(() => patchGlue(glue.replace('export { initSync, __wbg_init as default };', '')),
    /does not export/);
});

/** A copy of this folder's manifests, with its node_modules linked, then changed by `edit`. */
function plantedRoot(name, edit) {
  const root = scratch(name);
  for (const file of ['package.json', 'package-lock.json']) cpSync(join(HERE, file), join(root, file));
  mkdirSync(join(root, 'node_modules'), { recursive: true });
  symlinkSync(join(HERE, 'node_modules', '@qrcode-ai-com'), join(root, 'node_modules', '@qrcode-ai-com'));
  edit(root);
  return root;
}

function editJson(path, change) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  change(value);
  writeFileSync(path, JSON.stringify(value));
}

test('a package that is not the pinned one is refused', () => {
  assert.doesNotThrow(() => checkedPackage(plantedRoot('good', () => {})));
  const cases = [
    ['other-hash', (root) => editJson(join(root, 'package.json'), (p) => { p.config.wasmSha256 = 'ab'.repeat(32); }),
      /differs from the pin/],
    ['no-hash', (root) => editJson(join(root, 'package.json'), (p) => { delete p.config; }),
      /config\.wasmSha256/],
    ['range', (root) => editJson(join(root, 'package.json'), (p) => { p.devDependencies[PACKAGE] = '^0.11.0'; }),
      /one exact version/],
    ['other-version', (root) => editJson(join(root, 'package.json'), (p) => { p.devDependencies[PACKAGE] = '0.10.9'; }),
      /0\.11\.0 installed, 0\.10\.9 pinned/],
    ['lock', (root) => editJson(join(root, 'package-lock.json'), (l) => { delete l.packages[`node_modules/${PACKAGE}`]; }),
      /package-lock\.json does not pin/],
  ];
  for (const [name, edit, message] of cases) {
    assert.throws(() => checkedPackage(plantedRoot(name, edit)), message, name);
  }
  const missing = scratch('missing');
  cpSync(join(HERE, 'package.json'), join(missing, 'package.json'));
  assert.throws(() => checkedPackage(missing), /is not installed/);
});
