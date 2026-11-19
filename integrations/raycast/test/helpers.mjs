// SPDX-License-Identifier: MIT
// Bundles the extension source against the stand-in `@raycast/api`, and finds the qrscan the
// live tests run.
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const QR = 'https://qrc-ai.com/76xMa';
export const CODE128 = 'STOCK-4827';

/** The mixed fixture: a QR code and a Code 128 barcode in one picture. */
export function mixedFixture() {
  for (const path of [join(HERE, 'test/fixtures/mixed-code128-qr.png'), join(HERE, '../../fixtures/symbology/mixed-code128-qr.png')]) {
    if (existsSync(path)) return path;
  }
  throw new Error('the mixed fixture is missing');
}

/**
 * The published qrscan for the live tests: the path in QRSCAN. Without it the live tests are
 * skipped, unless QRSCAN_RAYCAST_LIVE=required, as in CI.
 */
export function liveQrscan() {
  const path = process.env.QRSCAN;
  if (path && existsSync(path)) return { path, skip: false };
  if (process.env.QRSCAN_RAYCAST_LIVE === 'required') throw new Error('QRSCAN must name an installed qrscan');
  return { path: null, skip: 'set QRSCAN to an installed qrscan to run the live scans' };
}

/** One source file of the extension, bundled with React and the stand-in `@raycast/api`. */
export async function bundleSource(entry) {
  const result = await build({
    entryPoints: [join(HERE, entry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    jsx: 'automatic',
    write: false,
    // The stand-in stays outside the bundle, so the test and the extension share its host state.
    plugins: [{
      name: 'raycast-mock',
      setup(context) {
        context.onResolve({ filter: /^@raycast\/api$/ }, () => ({ path: pathToFileURL(join(HERE, 'test/raycast-mock.mjs')).href, external: true }));
      },
    }],
    logLevel: 'silent',
  });
  const folder = mkdtempSync(join(tmpdir(), 'qrscan-raycast-'));
  const file = join(folder, 'bundle.mjs');
  writeFileSync(file, result.outputFiles[0].text);
  return import(pathToFileURL(file).href);
}

/** Every element of a React element tree, depth first. */
export function elements(node) {
  if (node === null || node === undefined || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  const children = node.props ? Object.entries(node.props).filter(([key]) => key === 'children' || key === 'actions').map(([, value]) => value) : [];
  return [node, ...children.flatMap(elements)];
}

/** The elements of TREE whose component is named NAME. */
export function named(tree, name) {
  return elements(tree).filter((element) => element.type?.displayName === name);
}
