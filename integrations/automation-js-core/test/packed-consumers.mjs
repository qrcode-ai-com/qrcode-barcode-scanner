// SPDX-License-Identifier: MIT
// The packed host packages, installed outside the checkout the way a host installs them, then
// loaded through their host entry points and run on the mixed fixture in the three profiles.
//
//   node integrations/automation-js-core/test/packed-consumers.mjs \
//     [--n8n <tgz>] [--node-red <tgz>] [--activepieces <tgz>] [--out <receipt.json>]
//
// Each tarball's file list is checked against what its host loads, its sha256 and npm integrity
// are recorded, and `npm install <tgz>` runs in a new temporary folder with lifecycle scripts
// disabled. The engine comes from the npm registry at the pinned version, as on a real host.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const ENGINE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
const ENGINE_VERSION = '0.11.0';
const fixture = readFileSync(new URL('../../../fixtures/symbology/mixed-code128-qr.png', import.meta.url));
const EXPECTED = ['https://qrc-ai.com/76xMa', 'STOCK-4827'];
const PROFILES = ['fast', 'frame', 'full'];

const HOSTS = {
  n8n: {
    name: '@qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner',
    files: [
      'LICENSE', 'README.md', 'package.json',
      'dist/nodes/QrcodeBarcodeScanner/QrcodeBarcodeScanner.node.js',
      'dist/nodes/QrcodeBarcodeScanner/QrcodeBarcodeScanner.node.json',
      'dist/nodes/QrcodeBarcodeScanner/scanCore.js',
      'dist/nodes/QrcodeBarcodeScanner/qrcodeBarcodeScanner.svg',
      'dist/nodes/QrcodeBarcodeScanner/qrcodeBarcodeScanner.dark.svg',
    ],
    allowed: /^(LICENSE|README\.md|package\.json|dist\/(package\.json|nodes\/QrcodeBarcodeScanner\/[^/]+\.(js|d\.ts|js\.map|json|svg)))$/,
    scan: scanWithN8n,
  },
  'node-red': {
    name: '@qrcode-ai-com/node-red-qrcode-barcode-scanner',
    files: ['LICENSE', 'README.md', 'package.json', 'nodes/scan.js', 'nodes/scan.html', 'nodes/scan-core.js', 'examples/scan-image.json'],
    allowed: /^(LICENSE|README\.md|package\.json|nodes\/scan(-core)?\.js|nodes\/scan\.html|examples\/[^/]+\.json)$/,
    scan: scanWithNodeRed,
  },
  activepieces: {
    name: '@qrcode-ai-com/piece-qrcode-barcode-scanner',
    files: ['LICENSE', 'README.md', 'package.json', 'src/index.js', 'THIRD-PARTY-NOTICES.txt'],
    allowed: /^(LICENSE|README\.md|package\.json|src\/index\.js|THIRD-PARTY-NOTICES\.txt)$/,
    scan: scanWithActivepieces,
  },
};

/** n8n: the node class run through the IExecuteFunctions surface it uses. */
async function scanWithN8n(root, profile) {
  const requireHere = createRequire(join(root, 'package.json'));
  const { QrcodeBarcodeScanner } = requireHere('./dist/nodes/QrcodeBarcodeScanner/QrcodeBarcodeScanner.node.js');
  const items = [{ json: {}, binary: { data: { data: fixture.toString('base64'), mimeType: 'image/png', fileName: 'label.png' } } }];
  const parameters = { binaryPropertyName: 'data', profile, output: 'image', options: { budgetMs: 0 } };
  const context = {
    getInputData: () => items,
    getNode: () => ({ name: 'QR Code & Barcode Scanner', type: `${HOSTS.n8n.name}.qrcodeBarcodeScanner`, typeVersion: 1, parameters }),
    continueOnFail: () => false,
    getNodeParameter: (name, _index, fallback) => parameters[name] ?? fallback,
    helpers: {
      assertBinaryData: (index, field) => items[index].binary[field],
      getBinaryDataBuffer: async (index, field) => Buffer.from(items[index].binary[field].data, 'base64'),
    },
  };
  const [[item]] = await new QrcodeBarcodeScanner().execute.call(context);
  return { texts: item.json.texts, report: item.json.report };
}

/** Node-RED: the module's register function given the runtime API surface the node calls. */
async function scanWithNodeRed(root, profile) {
  const requireHere = createRequire(join(root, 'package.json'));
  const types = new Map();
  const RED = {
    nodes: {
      // As the runtime does: registerType makes the constructor inherit from its Node class, and
      // createNode initialises that node.
      registerType(type, constructor) {
        Object.setPrototypeOf(constructor.prototype, EventEmitter.prototype);
        types.set(type, constructor);
      },
      createNode(node) {
        EventEmitter.call(node);
        node.status = () => {};
      },
    },
    util: { getMessageProperty: (msg, property) => msg[property] },
    settings: {},
  };
  requireHere('./nodes/scan.js')(RED);
  const Node = types.get('qrcode-barcode-scanner');
  const node = new Node({ property: 'payload', profile: 'frame', budgetMs: '' });
  const msg = await new Promise((resolveMessage, reject) => {
    node.emit('input', { payload: fixture, profile, budgetMs: 0 }, resolveMessage, (error) => error && reject(error));
  });
  return { texts: msg.texts, report: msg.payload };
}

/** Activepieces: the bundle's Piece export found as the engine finds it, then its action. */
async function scanWithActivepieces(root, profile) {
  const requireHere = createRequire(join(root, 'package.json'));
  const bundle = requireHere('./src/index.js');
  const piece = Object.values(bundle).find((value) => value?.constructor?.name === 'Piece');
  const result = await piece.getAction('scan_image').run({
    propsValue: { image: { filename: 'label.png', data: fixture, extension: 'png' }, profile, budgetMs: 0, includeReport: true },
  });
  return { texts: result.texts, report: result.report };
}

const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : resolve(args[index + 1]);
};
const receipt = { engine: `${ENGINE}@${ENGINE_VERSION}`, node: process.version, packages: [] };

for (const [host, spec] of Object.entries(HOSTS)) {
  const tarball = option(`--${host}`);
  if (!tarball) continue;
  const bytes = readFileSync(tarball);
  const entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).split('\n').filter(Boolean)
    .map((entry) => entry.replace(/^package\//, '')).filter((entry) => !entry.endsWith('/'));
  for (const file of spec.files) assert.ok(entries.includes(file), `${basename(tarball)} holds ${file}`);
  for (const entry of entries) assert.match(entry, spec.allowed, `${basename(tarball)} holds only what ${host} loads: ${entry}`);

  const consumer = realpathSync(mkdtempSync(join(tmpdir(), `qrscan-${host}-consumer-`)));
  writeFileSync(join(consumer, 'package.json'), '{ "private": true }\n');
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], { cwd: consumer, stdio: 'inherit' });
  const root = join(consumer, 'node_modules', ...spec.name.split('/'));
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.name, spec.name);
  assert.deepEqual(manifest.dependencies, { [ENGINE]: ENGINE_VERSION });
  assert.equal(manifest.license, 'MIT');
  const engine = JSON.parse(readFileSync(join(consumer, 'node_modules', ...ENGINE.split('/'), 'package.json'), 'utf8'));
  assert.deepEqual([engine.version, engine.license], [ENGINE_VERSION, 'AGPL-3.0-or-later']);

  const scans = {};
  for (const profile of PROFILES) {
    const { texts, report } = await spec.scan(root, profile);
    assert.deepEqual(texts, EXPECTED, `${host} ${profile}`);
    assert.equal(report.versions.scanner, ENGINE_VERSION);
    assert.equal(report.trace.budget_exhausted, false);
    assert.equal(report.score === null, profile === 'frame');
    scans[profile] = { texts, score: report.score === null ? null : report.score.value };
  }
  receipt.packages.push({
    host,
    name: spec.name,
    version: manifest.version,
    tarball: basename(tarball),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    files: entries.sort(),
    scans,
  });
  console.log(`${host}: ${basename(tarball)} installed and scanned in ${PROFILES.join(', ')}`);
}

assert.ok(receipt.packages.length > 0, 'pass at least one of --n8n, --node-red, --activepieces');
const out = option('--out');
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt.packages.map(({ tarball, sha256, integrity }) => ({ tarball, sha256, integrity })), null, 2));
// The engine workers are unref'd once idle, so the process exits on its own.
