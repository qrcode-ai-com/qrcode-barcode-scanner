// SPDX-License-Identifier: MIT
// The generated module through the two bundlers the host integrations use: esbuild (Canva,
// Adobe Express, Photoshop UXP here) and webpack 5 (Canva's starter kit, Adobe's add-on CLI and
// Adobe's UXP WebAssembly sample). Each must give one script with no module file beside it, and
// that script, run as a classic script with no URL of its own, reads the mixed fixture. A control
// build of the package as published shows what the inlining avoids.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import * as esbuild from 'esbuild';
import webpack from 'webpack';
import { PACKAGE, esbuildPlugin, writeInline } from '../inline.mjs';
import {
  ENGINE, HERE, PROFILES, assertMixed, scratch, stageFixture,
} from './helpers.mjs';

const fixture = readFileSync(stageFixture());
const CANVA_LIMIT = 5 * 1024 * 1024;

// The entry every bundle is built from: init, then the three profiles, results on a global.
const ENTRY = (source) => `import init, { scan_image, version } from ${JSON.stringify(source)};
globalThis.__qrscan = (async () => {
  await init();
  const bytes = globalThis.__fixture;
  const reports = {};
  for (const profile of ${JSON.stringify(PROFILES)}) {
    reports[profile] = scan_image(bytes, profile, undefined, undefined, 0);
  }
  return { version: version(), reports };
})();
`;

/** Run a classic-script bundle in a fresh context that has no document, no URL and no fetch. */
async function runClassic(code) {
  const context = vm.createContext({
    __fixture: new Uint8Array(fixture),
    console, TextDecoder, TextEncoder, WebAssembly, performance, Date, URL,
  });
  context.globalThis = context;
  vm.runInContext(code, context, { filename: 'bundle.js' });
  // Values of the other realm have other prototypes: compare their JSON.
  return JSON.parse(JSON.stringify(await context.__qrscan));
}

function judgeRun(result, label) {
  assert.equal(result.version, ENGINE);
  for (const profile of PROFILES) assertMixed(assert, result.reports[profile], `${label} ${profile}`);
}

test('esbuild with the plugin: one IIFE script, under 5 MB, that reads the fixture', async () => {
  const directory = scratch('esbuild');
  writeFileSync(join(directory, 'entry.js'), ENTRY(PACKAGE));
  const receipts = [];
  const result = await esbuild.build({
    entryPoints: [join(directory, 'entry.js')],
    bundle: true, format: 'iife', minify: true, outdir: join(directory, 'dist'),
    platform: 'browser', target: 'es2020', logLevel: 'silent', metafile: true,
    plugins: [esbuildPlugin(HERE, (receipt) => receipts.push(receipt))],
  });
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(readdirSync(join(directory, 'dist')), ['entry.js'], 'one file, no .wasm');
  const code = readFileSync(join(directory, 'dist', 'entry.js'), 'utf8');
  assert.ok(code.length < CANVA_LIMIT, `${code.length} bytes`);
  assert.equal(code.includes('import.meta'), false);
  assert.match(code, /QR Code & Barcode Scanner engine 0\.11\.0/, 'the license banner survives minifying');
  assert.equal(receipts.length, 1);
  judgeRun(await runClassic(code), 'esbuild');
});

test('esbuild refuses a subpath of the package, which would load files beside the script', async () => {
  const directory = scratch('esbuild-subpath');
  writeFileSync(join(directory, 'entry.js'), `import '${PACKAGE}/auto';\n`);
  await assert.rejects(esbuild.build({
    entryPoints: [join(directory, 'entry.js')], bundle: true, write: false, logLevel: 'silent',
    plugins: [esbuildPlugin(HERE)],
  }), /only @qrcode-ai-com\/qrcode-barcode-scanner-wasm itself is inlined/);
});

test('control: esbuild on the package as published gives a script whose init fails', async () => {
  const directory = scratch('esbuild-control');
  writeFileSync(join(directory, 'entry.js'), ENTRY(PACKAGE));
  const result = await esbuild.build({
    entryPoints: [join(directory, 'entry.js')], bundle: true, format: 'iife', write: false,
    nodePaths: [join(HERE, 'node_modules')], logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;
  // esbuild replaces import.meta with an empty object in an IIFE: the default input has no base.
  assert.match(code, /new URL\("qrcode-barcode-scanner_bg\.wasm", import_meta\.url\)/);
  await assert.rejects(runClassic(code), /Invalid URL/);
});

function webpackBuild(entry, directory, alias = {}) {
  return new Promise((done, fail) => {
    webpack({
      mode: 'production', target: 'web', context: directory, entry,
      output: { path: join(directory, 'dist'), filename: 'app.js', clean: true },
      resolve: { alias, modules: [join(HERE, 'node_modules')] },
      performance: { hints: false },
      optimization: { splitChunks: false, runtimeChunk: false },
    }, (error, stats) => {
      if (error) return fail(error);
      const info = stats.toJson({ assets: true, errors: true, warnings: true });
      if (stats.hasErrors()) return fail(new Error(JSON.stringify(info.errors)));
      return done(info);
    });
  });
}

test('webpack 5 with the generated file: one app.js and no emitted module', async () => {
  const directory = scratch('webpack');
  writeInline(HERE, join(directory, 'engine.inline.js'));
  writeFileSync(join(directory, 'entry.js'), ENTRY('./engine.inline.js'));
  const info = await webpackBuild('./entry.js', directory);
  assert.deepEqual(info.assets.map((asset) => asset.name), ['app.js']);
  const code = readFileSync(join(directory, 'dist', 'app.js'), 'utf8');
  assert.ok(code.length < CANVA_LIMIT, `${code.length} bytes`);
  judgeRun(await runClassic(code), 'webpack');
});

test('control: webpack 5 on the package as published emits the module as a second file', async () => {
  const directory = scratch('webpack-control');
  writeFileSync(join(directory, 'entry.js'), ENTRY(PACKAGE));
  const info = await webpackBuild('./entry.js', directory);
  const names = info.assets.map((asset) => asset.name);
  assert.ok(names.some((name) => name.endsWith('.wasm')), `a .wasm asset is emitted: ${names}`);
});
