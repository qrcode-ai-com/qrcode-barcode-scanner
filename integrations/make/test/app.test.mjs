// SPDX-License-Identifier: MIT
// The Make app as files and as requests. Every file is the one makecomapp.json names and passes
// Make's own schema for its kind; every IML expression is one the evaluator knows; the review rules
// that files can show hold. Then the connection and both modules send their real requests to a scan
// service: the contract stub (test/contract-stub.mjs), or the service at QRSCAN_MAKE_SERVICE_URL.
// The mixed fixture must give its QR code and its Code 128 in the fast, frame and full profiles.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { startStub } from './contract-stub.mjs';
import { EXPRESSIONS, expressionsIn, send } from './iml.mjs';
import { loadSchemas } from './make-schemas.mjs';

const app = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = readFileSync(join(app, '../../fixtures/symbology/mixed-code128-qr.png'));
const read = (path) => JSON.parse(readFileSync(join(app, path), 'utf8'));
const manifest = read('makecomapp.json');
const EXPECTED = { qr_code: 'https://qrc-ai.com/76xMa', code128: 'STOCK-4827' };

// The schema of each kind of file, as the Make Apps Editor associates them.
const SCHEMA_OF = {
  base: 'base.json', common: 'common.json', groups: 'groups.json', communication: 'api.json', params: 'parameters.json',
  staticParams: 'parameters.json', mappableParams: 'parameters.json', interface: 'parameters.json', samples: 'samples.json',
  scope: 'scope.json',
};
const files = [];
for (const [code, path] of Object.entries(manifest.generalCodeFiles)) files.push({ code, path });
for (const components of Object.values(manifest.components)) {
  for (const component of Object.values(components)) {
    for (const [code, path] of Object.entries(component.codeFiles)) files.push({ code, path });
  }
}

const base = read(manifest.generalCodeFiles.base);
const connection = manifest.components.connection.scanService;
const scanModule = manifest.components.module.scanImage;
const apiCall = manifest.components.module.makeApiCall;
let service;
let stub = null;

before(async () => {
  if (process.env.QRSCAN_MAKE_SERVICE_URL) service = process.env.QRSCAN_MAKE_SERVICE_URL.replace(/\/$/, '');
  else {
    stub = await startStub();
    service = stub.url;
  }
});
after(() => stub?.close());

test('makecomapp.json and every file it names pass the Make Apps Editor schemas', async () => {
  const schemas = await loadSchemas();
  // Make's schemas hold patterns such as \- that only a non-unicode regular expression accepts.
  const ajv = new Ajv({ strict: false, allErrors: true, unicodeRegExp: false });
  for (const [name, schema] of Object.entries(schemas)) ajv.addSchema(schema, name);
  const check = (schemaName, value, label) => {
    const validate = ajv.getSchema(schemaName);
    assert.ok(validate(value), `${label}: ${JSON.stringify(validate.errors?.slice(0, 3))}`);
  };
  check('makecomapp.schema.json', manifest, 'makecomapp.json');
  for (const { code, path } of files) {
    if (code === 'readme') continue;
    check(SCHEMA_OF[code], read(path), path);
  }
});

test('the folder holds exactly the files makecomapp.json names, plus the repository files', () => {
  const listed = new Set(['makecomapp.json', ...files.map(({ path }) => path)]);
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'test'].includes(entry.name)) walk(path);
      } else found.push(relative(app, path));
    }
  };
  walk(app);
  const repository = new Set(['README.md', 'LICENSE', 'LISTING.md', 'package.json', 'package-lock.json', '.gitignore']);
  assert.deepEqual(found.filter((path) => !repository.has(path)).sort(), [...listed].sort());
});

test('the app uses exactly the IML expressions the evaluator knows', () => {
  const used = new Set();
  for (const { code, path } of files) if (code !== 'readme') expressionsIn(read(path), used);
  assert.deepEqual([...used].sort(), [...EXPRESSIONS].sort());
});

test('the review rules a file can show hold', () => {
  // Base and connection: error handling and sanitization.
  assert.equal(base.baseUrl, '{{connection.baseUrl}}');
  assert.ok(base.response.error.message);
  assert.deepEqual(base.log.sanitize, ['request.headers.authorization']);
  const validation = read(connection.codeFiles.communication);
  assert.equal(validation.url, '{{parameters.baseUrl}}/healthz');
  assert.ok(validation.response.error.message);
  assert.ok(validation.log.sanitize);
  // The universal module: its label, its description and a URL relative to the base.
  assert.equal(apiCall.moduleType, 'universal');
  assert.equal(apiCall.label, 'Make an API call');
  assert.equal(apiCall.description, 'Performs an arbitrary authorized API call.');
  assert.equal(read(apiCall.codeFiles.communication).url, '/{{parameters.url}}');
  // The base URL is the user's own service: no address of a hosted service anywhere in the app.
  for (const { path } of files) {
    const urls = readFileSync(join(app, path), 'utf8').match(/https?:\/\/[^\s"'`)]+/g) ?? [];
    for (const url of urls) assert.match(url, /^https:\/\/((scan\.)?example\.com|github\.com\/qrcode-ai-com\/qrcode-barcode-scanner-rust)/, `${path}: ${url}`);
  }
  // Every module has a group, a label and a description.
  const grouped = read(manifest.generalCodeFiles.groups).flatMap((group) => group.modules).sort();
  assert.deepEqual(grouped, Object.keys(manifest.components.module).sort());
});

test('the connection is validated against GET /healthz', async () => {
  const answer = await send({ communication: read(connection.codeFiles.communication), connection: {}, parameters: { baseUrl: service } });
  assert.equal(answer.statusCode, 200);
  assert.equal(answer.body.status, 'ok');
  assert.equal(answer.body.engine, '0.11.0');
  assert.deepEqual(answer.metadata, { type: 'text', value: `scan service ${answer.body.service}, engine 0.11.0` });
});

test('a connection to an address with no scan service fails', async () => {
  const communication = read(connection.codeFiles.communication);
  await assert.rejects(send({ communication, connection: {}, parameters: { baseUrl: 'http://127.0.0.1:9' } }), /fetch failed/);
  const answer = await send({ communication, connection: {}, parameters: { baseUrl: `${service}/elsewhere` } });
  assert.equal(answer.statusCode, 404);
  assert.deepEqual(answer.error, { type: 'RuntimeError', message: '[404] The scan service did not answer GET /healthz with its status.' });
});

const scan = (parameters) => send({
  base,
  communication: read(scanModule.codeFiles.communication),
  connection: { baseUrl: service },
  parameters: { fileName: 'mixed-code128-qr.png', data: fixture, mode: 'frame', ...parameters },
});

for (const mode of ['fast', 'frame', 'full']) {
  test(`Scan an Image reads the mixed fixture in the ${mode} profile`, { timeout: 60_000 }, async () => {
    const answer = await scan({ mode });
    assert.equal(answer.statusCode, 200, JSON.stringify(answer.error));
    const { output } = answer;
    assert.equal(output.count, 2);
    assert.deepEqual(Object.fromEntries(output.detections.map((code) => [code.symbology, code.content.text])), EXPECTED);
    const qr = output.detections.find((code) => code.symbology === 'qr_code');
    assert.equal(Buffer.from(qr.content.raw, 'base64').toString('utf8'), EXPECTED.qr_code);
    assert.deepEqual(qr.payload, { kind: 'url', url: EXPECTED.qr_code });
    assert.equal(output.versions.scanner, '0.11.0');
    assert.equal(output.trace.engine_panics, 0);
    assert.deepEqual(Object.keys(output).sort(), Object.keys(read(scanModule.codeFiles.samples)).sort());
    const declared = read(scanModule.codeFiles.interface).map((field) => field.name).sort();
    assert.deepEqual(Object.keys(output).sort(), declared);
  });
}

test('a refused image ends the module with a data error that names the service code', { timeout: 60_000 }, async () => {
  const corrupt = await scan({ data: Buffer.concat([fixture.subarray(0, 16), Buffer.alloc(64)]) });
  assert.equal(corrupt.statusCode, 422);
  assert.equal(corrupt.error.type, 'DataError');
  assert.match(corrupt.error.message, /^\[422\] QRS-001: unsupported or corrupt image: /);
  const empty = await scan({ data: Buffer.alloc(0) });
  assert.deepEqual(empty.error, { type: 'DataError', message: '[400] QRSHTTP_NO_IMAGE: The image is empty' });
  const mode = await scan({ mode: 'slow' });
  assert.equal(mode.statusCode, 400);
  assert.equal(mode.error.type, 'DataError');
  assert.match(mode.error.message, /^\[400\] QRSHTTP_MODE: /);
});

test('Make an API call reaches the same service under the connection', async () => {
  const answer = await send({
    base,
    communication: read(apiCall.codeFiles.communication),
    connection: { baseUrl: service },
    parameters: { url: 'healthz', method: 'GET', headers: [{ key: 'x-request-label', value: 'make' }], qs: [] },
  });
  assert.equal(answer.output.statusCode, 200);
  assert.equal(answer.output.body.status, 'ok');
  assert.equal(answer.output.body.engine, '0.11.0');
});
