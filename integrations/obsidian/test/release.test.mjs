// SPDX-License-Identifier: MIT
// What a release carries: the three files Obsidian downloads, their metadata rules, and the
// engine's license texts, byte for byte as the published engine package ships them.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { buildMain, HERE } from './helpers.mjs';

const require = createRequire(join(HERE, 'package.json'));
const enginePackage = dirname(require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm/package.json'));
const json = (path) => JSON.parse(readFileSync(join(HERE, path), 'utf8'));

/** A file of the plugin repository, or in this engine tree the engine file it is staged from. */
function staged(name, enginePath) {
  for (const path of [join(HERE, name), join(HERE, '../..', enginePath)]) if (existsSync(path)) return readFileSync(path, 'utf8');
  throw new Error(`${name} is missing`);
}

test('manifest.json follows the community directory rules', () => {
  const manifest = json('manifest.json');
  assert.deepEqual(Object.keys(manifest).sort(), ['author', 'authorUrl', 'description', 'id', 'isDesktopOnly', 'minAppVersion', 'name', 'version']);
  assert.match(manifest.id, /^[a-z0-9-]+$/);
  assert.doesNotMatch(manifest.id, /obsidian|plugin$/);
  assert.doesNotMatch(manifest.name, /obsidian|plugin|&/i);
  assert.ok(manifest.description.length <= 250);
  assert.match(manifest.description, /\.$/);
  assert.doesNotMatch(manifest.description, /^(this|a) plugin|obsidian/i);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.isDesktopOnly, false);
});

test('the plugin version is the same in manifest.json, package.json and versions.json', () => {
  const manifest = json('manifest.json');
  assert.equal(json('package.json').version, manifest.version);
  assert.equal(json('versions.json')[manifest.version], manifest.minAppVersion);
});

test('the source uses no Node or Electron module, so the plugin can run on mobile', () => {
  for (const file of ['main.ts', 'scanner.ts', 'images.ts', 'modals.ts', 'settings.ts', 'format.ts']) {
    const source = readFileSync(join(HERE, 'src', file), 'utf8');
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
    for (const name of imports) {
      assert.ok(name === 'obsidian' || name.startsWith('./') || name.startsWith('@qrcode-ai-com/qrcode-barcode-scanner-wasm'), `${file} imports ${name}`);
    }
    assert.doesNotMatch(source, /\brequire\(|\bprocess\.|\bBuffer\b/, file);
  }
});

test('main.js names the engine and closes with its license texts', () => {
  const { code } = buildMain();
  const engine = JSON.parse(readFileSync(join(enginePackage, 'package.json'), 'utf8'));
  assert.ok(code.startsWith('/* QR Code and Barcode Scanner '));
  assert.ok(code.includes(`${engine.name}@${engine.version} (${engine.license})`));
  for (const name of ['LICENSE', 'LICENSE-APACHE-2.0', 'THIRD-PARTY.md']) {
    assert.ok(code.includes(`----- ${engine.name}@${engine.version} · ${name} -----\n${readFileSync(join(enginePackage, name), 'utf8')}`), name);
  }
  assert.ok(code.trimEnd().endsWith('*/'));
});

test('the repository license files are the plugin MIT license and the engine package texts', () => {
  assert.ok(readFileSync(join(HERE, 'LICENSE'), 'utf8').startsWith('MIT License\n'));
  assert.equal(staged('ENGINE-LICENSE', 'distribution/releases/historical-agpl-3.0.txt'), readFileSync(join(enginePackage, 'LICENSE'), 'utf8'));
  assert.equal(staged('ENGINE-LICENSE-APACHE-2.0', 'crates/qrcode-ai-scanner/LICENSE-APACHE-2.0'), readFileSync(join(enginePackage, 'LICENSE-APACHE-2.0'), 'utf8'));
  assert.equal(readFileSync(join(HERE, 'ENGINE-THIRD-PARTY.md'), 'utf8'), readFileSync(join(enginePackage, 'THIRD-PARTY.md'), 'utf8'));
});
