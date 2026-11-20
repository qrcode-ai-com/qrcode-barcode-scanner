// SPDX-License-Identifier: MIT
// The node in a Node-RED runtime (node-red-node-test-helper): Buffer and file inputs, the acceptance
// fixture in the three profiles, empty and corrupt images caught by a Catch node, and the packaged
// example flow wired as the editor would import it.
'use strict';
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, copyFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { after, afterEach, before, test } = require('node:test');
const TIMEOUT = { timeout: 30_000 };
const helper = require('node-red-node-test-helper');
const scanNode = require('../nodes/scan.js');
const scanCore = require('../nodes/scan-core.js');
const catchNode = require('@node-red/nodes/core/common/25-catch.js');
const switchNode = require('@node-red/nodes/core/function/10-switch.js');
const commentNode = require('@node-red/nodes/core/common/90-comment.js');
const injectNode = require('@node-red/nodes/core/common/20-inject.js');

helper.init(require.resolve('node-red'));

const fixturePath = join(__dirname, '../../../fixtures/symbology/mixed-code128-qr.png');
const fixture = readFileSync(fixturePath);
const white = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PMQ0AMAzAsPInvYLYYVWKESTzjhsd8KsBrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BbQHKU9LC7/CP1AAAAABJRU5ErkJggg==', 'base64');
const EXPECTED = ['https://qrc-ai.com/76xMa', 'STOCK-4827'];
const workingDirectory = mkdtempSync(join(tmpdir(), 'qrscan-node-red-'));
copyFileSync(fixturePath, join(workingDirectory, 'label.png'));

// Node-RED 5 treats a node without x and y as a configuration node, so every node has a place.
const placed = (nodes) => [{ id: 'tab', type: 'tab', label: 'test' }, ...nodes.map((node, index) => ({ z: 'tab', x: 100 + 160 * index, y: 80, ...node }))];
const flow = (extra = {}) => placed([
  { id: 'scan', type: 'qrcode-barcode-scanner', name: 'label scan', property: 'payload', profile: 'frame', budgetMs: '', wires: [['out']], ...extra },
  { id: 'out', type: 'helper', wires: [] },
  { id: 'catch', type: 'catch', scope: ['scan'], uncaught: false, wires: [['caught']] },
  { id: 'caught', type: 'helper', wires: [] },
]);

/** Send one message to the scan node and resolve with the message it sends, or the caught error. */
async function exchange(message, extra) {
  // The helper wraps the runtime log once per load, so the previous flow is unloaded first.
  await helper.unload();
  return new Promise((resolve, reject) => {
    helper.load([scanNode, catchNode], flow(extra), (error) => {
      if (error) return reject(error);
      const scan = helper.getNode('scan');
      helper.getNode('out').on('input', (msg) => resolve({ msg, scan }));
      helper.getNode('caught').on('input', (msg) => resolve({ caught: msg, scan }));
      scan.receive(message);
    });
  });
}

const lastStatus = (scan) => scan.status.lastCall.args[0];

before(() => new Promise((resolve) => {
  helper.settings({ fileWorkingDirectory: workingDirectory });
  helper.startServer(resolve);
}));
afterEach(() => helper.unload());
after(async () => {
  await new Promise((resolve) => helper.stopServer(resolve));
  await scanCore.stopScanner();
});

for (const profile of ['fast', 'frame', 'full']) {
  test(`a Buffer returns both codes in ${profile}`, TIMEOUT, async () => {
    // Unbounded, so a loaded machine cannot cut the score: the engine's own test rule.
    const { msg, scan } = await exchange({ payload: fixture, profile, budgetMs: 0, topic: 'label' });
    assert.deepEqual(msg.texts, EXPECTED);
    assert.deepEqual(msg.codes.map((code) => code.symbology), ['qr_code', 'code128']);
    assert.equal(msg.payload.versions.scanner, '0.11.0');
    assert.equal(msg.payload.trace.budget_exhausted, false);
    assert.equal(msg.payload.score === null, profile === 'frame');
    assert.equal(msg.topic, 'label', 'the rest of the message is kept');
    assert.deepEqual(lastStatus(scan), { fill: 'green', shape: 'dot', text: '2 codes' });
  });
}

test('a file path, relative to the working directory, is read and scanned', TIMEOUT, async () => {
  const relative = await exchange({ payload: 'label.png' });
  assert.deepEqual(relative.msg.texts, EXPECTED);
  const absolute = await exchange({ payload: fixturePath }, { profile: 'full', budgetMs: '0' });
  assert.deepEqual(absolute.msg.texts, EXPECTED);
  assert.equal(typeof absolute.msg.payload.score.value, 'number');
});

test('another message property can hold the image', TIMEOUT, async () => {
  const { msg } = await exchange({ image: fixture, payload: 'kept until the report replaces it' }, { property: 'image' });
  assert.deepEqual(msg.texts, EXPECTED);
  assert.deepEqual(msg.payload.detections.length, 2);
});

test('an image without a code gives an empty list', TIMEOUT, async () => {
  const { msg, scan } = await exchange({ payload: white });
  assert.deepEqual([msg.texts, msg.codes, msg.payload.detections], [[], [], []]);
  assert.deepEqual(lastStatus(scan), { fill: 'green', shape: 'dot', text: 'no code' });
});

test('a corrupt image, a missing file and a wrong input reach the Catch node', TIMEOUT, async () => {
  const cases = [
    [{ payload: Buffer.from('not an image') }, 'QRS-001', /\[QRS-001\]/],
    [{ payload: 'missing.png' }, 'QRSCAN_FILE', /No readable image file/],
    [{ payload: workingDirectory }, 'QRSCAN_FILE', /not a regular file/],
    [{ payload: 42 }, 'QRSCAN_INPUT', /must be a Buffer/],
    [{ payload: fixture, profile: 'slow' }, 'QRSCAN_PROFILE', /profile must be one of/],
  ];
  for (const [message, code, pattern] of cases) {
    const { caught, scan } = await exchange(message);
    assert.ok(caught, `${code} is caught`);
    assert.match(caught.error.message, pattern);
    assert.equal(caught.error.source.id, 'scan');
    assert.deepEqual(lastStatus(scan), { fill: 'red', shape: 'ring', text: code });
  }
});

test('the packaged example flow loads and routes each result', TIMEOUT, async () => {
  const example = JSON.parse(readFileSync(join(__dirname, '../examples/scan-image.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest['node-red'].nodes), [example.find((node) => node.type !== 'comment' && node.type.startsWith('qrcode')).type]);
  // The three debug nodes become helper nodes with the same ids; every other node is the packaged one.
  const debugIds = example.filter((node) => node.type === 'debug').map((node) => node.id);
  // Imported into a tab, as the editor does with an example that names none.
  const nodes = [{ id: 'tab', type: 'tab', label: 'example' }, ...example.map((node) => ({
    ...(node.type === 'debug' ? { id: node.id, x: node.x, y: node.y, type: 'helper', name: node.name, wires: [] } : node),
    z: 'tab',
  }))];
  const [codes, none, failed] = debugIds;
  const scanId = example.find((node) => node.type === 'qrcode-barcode-scanner').id;
  await new Promise((resolve, reject) => helper.load([scanNode, switchNode, catchNode, commentNode, injectNode], nodes, (error) => (error ? reject(error) : resolve())));
  // A Node-RED node keeps its own list of input handlers, so each end node gets one lasting listener.
  let arrived;
  for (const [id, name] of [[codes, 'codes'], [none, 'none'], [failed, 'error']]) {
    helper.getNode(id).on('input', (msg) => arrived({ name, msg }));
  }
  const route = (payload) => new Promise((resolve) => {
    arrived = resolve;
    helper.getNode(scanId).receive({ payload });
  });
  const found = await route(fixturePath);
  assert.deepEqual([found.name, found.msg.texts], ['codes', EXPECTED]);
  assert.equal((await route(white)).name, 'none');
  const error = await route(Buffer.from('garbage'));
  assert.equal(error.name, 'error');
  assert.match(error.msg.error.message, /\[QRS-001\]/);
});
