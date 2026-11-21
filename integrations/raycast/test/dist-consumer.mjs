// SPDX-License-Identifier: MIT
// The distribution build that the Raycast Store would publish, run outside the checkout: the
// output of `ray build -e dist` is copied into a new folder, its `@raycast/api` is the stand-in of
// test/raycast-mock.mjs and its React the one Raycast provides at run time, and the command scans
// the mixed fixture with an installed qrscan in the fast, frame and full profiles.
//
//   node test/dist-consumer.mjs --build <ray build output> --qrscan <path> --image <png> --reports <dir>
//     [--home <new folder>] [--packages <folder>]
//
// Each profile must list the QR code and the Code 128, in the engine's order, with their exact
// texts and formats, uncut, from qrscan 0.11.0. Its report is written to <dir>/<profile>.json for
// scripts/destination-acceptance.py. The clipboard route, a missing qrscan and a file that is not
// an image are checked through the same build. The copy goes to --home, a folder that must not
// exist yet, so that a workflow can remove it and prove the command gone; by default it is a new
// temporary folder. The React given to the build is the one installed in --packages, by default
// this integration; a workflow that checks the staged Store folder passes that folder.
import assert from 'node:assert/strict';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const QR = 'https://qrc-ai.com/76xMa';
const CODE128 = 'STOCK-4827';
const ENGINE = '0.11.0';

const { values } = parseArgs({
  options: {
    build: { type: 'string' },
    qrscan: { type: 'string' },
    image: { type: 'string' },
    reports: { type: 'string' },
    home: { type: 'string' },
    packages: { type: 'string' },
  },
});
for (const name of ['build', 'qrscan', 'image', 'reports']) {
  if (!values[name]) {
    console.error('usage: node test/dist-consumer.mjs --build DIR --qrscan PATH --image PNG --reports DIR [--home DIR] [--packages DIR]');
    process.exit(2);
  }
}

// The new folder: the build as Raycast installs it, beside the two modules the host provides.
if (values.home && existsSync(values.home)) {
  console.error(`dist-consumer: ${values.home} already exists; --home names a new folder`);
  process.exit(2);
}
const home = values.home ? resolve(values.home) : mkdtempSync(join(tmpdir(), 'qrscan-raycast-dist-'));
mkdirSync(home, { recursive: true });
cpSync(resolve(values.build), join(home, 'extension'), { recursive: true });
const api = join(home, 'extension/node_modules/@raycast/api');
mkdirSync(api, { recursive: true });
copyFileSync(join(HERE, 'test/raycast-mock.mjs'), join(api, 'index.mjs'));
writeFileSync(join(api, 'package.json'), JSON.stringify({ name: '@raycast/api', type: 'module', exports: './index.mjs' }));
const packages = resolve(values.packages ?? HERE);
symlinkSync(createRequire(join(packages, 'package.json')).resolve('react/package.json').replace(/\/package\.json$/, ''),
  join(home, 'extension/node_modules/react'), 'dir');

const requireBuild = createRequire(join(home, 'extension/package.json'));
const command = requireBuild('./scan-image.js');
const { host } = await import(pathToFileURL(join(api, 'index.mjs')).href);
assert.equal(typeof command.loadScan, 'function', 'the build exports the command');
assert.equal(typeof command.default, 'function', 'the build has a default command');

/** Every element of a React element tree whose component is named NAME. */
function named(node, name) {
  if (node === null || node === undefined || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap((child) => named(child, name));
  const children = node.props ? ['children', 'actions'].map((key) => node.props[key]).filter(Boolean) : [];
  return [...(node.type?.displayName === name ? [node] : []), ...children.flatMap((child) => named(child, name))];
}

mkdirSync(values.reports, { recursive: true });
for (const profile of ['fast', 'frame', 'full']) {
  host.reset();
  host.finder = [{ path: resolve(values.image) }];
  host.preferences = { qrscanPath: values.qrscan, profile };
  const state = await command.loadScan();
  assert.equal(state.kind, 'result', `${profile}: ${JSON.stringify(state).slice(0, 400)}`);
  const { result } = state;
  assert.deepEqual(result.codes, [
    { symbology: 'qr_code', label: 'QR Code', text: QR, complete: true },
    { symbology: 'code128', label: 'Code 128', text: CODE128, complete: true },
  ], profile);
  assert.deepEqual([result.profile, result.engine, result.budgetExhausted], [profile, ENGINE, false], profile);
  assert.equal(result.score === null, profile === 'frame', `${profile}: frame alone gives no score`);
  const items = named(command.ScanView({ state }), 'List.Item');
  assert.deepEqual(items.map((item) => item.props.title), [QR, CODE128], profile);
  const report = named(items[0], 'Action.CopyToClipboard').find((action) => action.props.title === 'Copy Scan Report');
  assert.deepEqual(JSON.parse(report.props.content), result.report, `${profile}: the copied report is qrscan's`);
  writeFileSync(join(values.reports, `${profile}.json`), JSON.stringify(result.report));
  console.log(`${profile}: ${result.codes.map((entry) => `${entry.label} ${entry.text}`).join(', ')}` +
    (result.score ? ` · score ${result.score.value} ${result.score.grade}` : ' · no score'));
}

host.reset();
host.finder = new Error('Finder is not the frontmost application');
host.clipboard = { text: 'label.png', file: pathToFileURL(resolve(values.image)).href };
host.preferences = { qrscanPath: values.qrscan };
const fromClipboard = await command.loadScan();
assert.deepEqual(fromClipboard.result?.codes.map((entry) => entry.text), [QR, CODE128], 'the clipboard route');

host.reset();
host.finder = [{ path: resolve(values.image) }];
host.preferences = { qrscanPath: join(home, 'no-qrscan-here') };
assert.deepEqual(await command.loadScan(), { kind: 'missing', looked: [join(home, 'no-qrscan-here')] }, 'a missing qrscan');

host.reset();
const notImage = join(home, 'not-a-picture.png');
writeFileSync(notImage, 'not a picture');
host.finder = [{ path: notImage }];
host.preferences = { qrscanPath: values.qrscan };
const unreadable = await command.loadScan();
assert.equal(unreadable.kind, 'unreadable', JSON.stringify(unreadable));
assert.match(unreadable.message, /\[QRS-001\]/);
console.log('clipboard, missing qrscan and a file that is not an image: as expected');
