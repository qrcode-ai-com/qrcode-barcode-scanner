// SPDX-License-Identifier: MIT
// Builds the plugin as Obsidian loads it (main.js, with the engine embedded) and runs it against
// the stand-in `obsidian` module, with no network.
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { crc32, deflateSync } from 'node:zlib';
import { build } from 'esbuild';
import * as obsidian from './obsidian-mock.mjs';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const QR = 'https://qrc-ai.com/76xMa';
export const CODE128 = 'STOCK-4827';
export const EXPECTED = new Set([`- QR Code: \`${QR}\``, `- Code 128: \`${CODE128}\``]);

/** The mixed fixture: a QR code and a Code 128 barcode in one picture. */
export function mixedFixture() {
  for (const path of [join(HERE, 'test/fixtures/mixed-code128-qr.png'), join(HERE, '../../fixtures/symbology/mixed-code128-qr.png')]) {
    if (existsSync(path)) return new Uint8Array(readFileSync(path));
  }
  throw new Error('the mixed fixture is missing');
}

/** A white grayscale PNG of WIDTH x HEIGHT pixels: an image with no code in it. */
export function blankPng(width, height) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grayscale
  const rows = Buffer.alloc((width + 1) * height, 0xff);
  for (let row = 0; row < height; row += 1) rows[row * (width + 1)] = 0; // filter: none
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)),
  ]));
}

/** Builds main.js into a new folder with the plugin's own build script. */
export function buildMain() {
  const out = mkdtempSync(join(tmpdir(), 'qrscan-obsidian-'));
  execFileSync(process.execPath, [join(HERE, 'scripts/build.mjs'), '--out', out], { stdio: 'pipe' });
  return { path: join(out, 'main.js'), code: readFileSync(join(out, 'main.js'), 'utf8') };
}

/** Calls made to fetch and XMLHttpRequest while the plugin runs: the plugin must make none. */
export const network = [];
function noNetwork(kind) {
  return function refused(...args) {
    network.push({ kind, target: String(args[0]) });
    throw new Error(`network refused in the test: ${kind}`);
  };
}

export const clipboard = { written: [], writeText: async (text) => { clipboard.written.push(text); } };

/**
 * Evaluates CODE the way Obsidian does (CommonJS, `require` limited to the host modules) and
 * returns its exports and the module names it asked for.
 */
export function loadPlugin(code) {
  const required = [];
  const module = { exports: {} };
  const host = (name) => {
    required.push(name);
    if (name === 'obsidian') return obsidian;
    throw new Error(`the plugin asked for a module Obsidian does not provide: ${name}`);
  };
  const scope = { window: globalThis, navigator: { clipboard }, fetch: noNetwork('fetch'), XMLHttpRequest: noNetwork('XMLHttpRequest') };
  // eslint-disable-next-line no-new-func
  const run = new Function('module', 'exports', 'require', ...Object.keys(scope), code);
  run(module, module.exports, host, ...Object.values(scope));
  return { exports: module.exports, required };
}

/** One source file of the plugin, bundled against the stand-in module, for unit tests. */
export async function bundleSource(entry) {
  const result = await build({
    entryPoints: [join(HERE, entry)],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    loader: { '.wasm': 'binary' },
    define: { 'import.meta.url': 'undefined' },
    alias: { obsidian: join(HERE, 'test/obsidian-mock.mjs') },
    logLevel: 'silent',
  });
  const text = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
}

/** Waits until CHECK returns a true value, while the scan runs. */
export async function until(check, what, timeout = 30000) {
  const start = Date.now();
  for (;;) {
    const value = check();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export { obsidian };
