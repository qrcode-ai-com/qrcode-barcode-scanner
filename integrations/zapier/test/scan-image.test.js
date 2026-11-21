// SPDX-License-Identifier: MIT
// The Scan Image action through the Zapier app tester: the mixed fixture over HTTP in the three
// profiles, an image without a code, and every refusal (empty, corrupt, oversized, bad URL, bad
// option). With QRSCAN_ACCEPTANCE_IMAGE and QRSCAN_ACCEPTANCE_DIR set, it also writes the three
// engine reports the destination acceptance driver judges.
'use strict';
// Read by zapier-platform-core when it loads: it then skips its per-run memory log.
process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const http = require('node:http');
const { join } = require('node:path');
const { after, before, test } = require('node:test');
const zapier = require('zapier-platform-core');
const App = require('../index');
const scanCore = require('../lib/scan-core');

const appTester = zapier.createAppTester(App);
const perform = App.creates.scan_image.operation.perform;
const TIMEOUT = { timeout: 60_000 };
const fixture = readFileSync(join(__dirname, '../../../fixtures/symbology/mixed-code128-qr.png'));
const acceptanceImage = process.env.QRSCAN_ACCEPTANCE_IMAGE;
const acceptanceDir = process.env.QRSCAN_ACCEPTANCE_DIR;
const white = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PMQ0AMAzAsPInvYLYYVWKESTzjhsd8KsBrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BbQHKU9LC7/CP1AAAAABJRU5ErkJggg==', 'base64');
const EXPECTED = { qr_code: 'https://qrc-ai.com/76xMa', code128: 'STOCK-4827' };
const OVER_LIMIT = scanCore.LIMITS.inputBytes + 1;

// The images a Zap would hand over, each behind its own path.
const routes = {
  '/label.png': (response) => response.end(fixture),
  '/acceptance.png': (response) => response.end(acceptanceImage ? readFileSync(acceptanceImage) : fixture),
  '/white.png': (response) => response.end(white),
  '/empty.png': (response) => response.end(),
  '/corrupt.png': (response) => response.end(Buffer.concat([fixture.subarray(0, 16), Buffer.alloc(64)])),
  '/text.png': (response) => response.end('this is not an image'),
  // No content-length: the body is cut while it streams, after the limit.
  '/streamed-large.png': (response) => {
    response.write(Buffer.alloc(scanCore.LIMITS.inputBytes));
    response.end(Buffer.alloc(1));
  },
  // A declared length over the limit is refused before the body is read.
  '/declared-large.png': (response) => {
    response.setHeader('content-length', String(OVER_LIMIT));
    response.end(Buffer.alloc(OVER_LIMIT));
  },
};
let server;
let base;

before(() => new Promise((resolve) => {
  server = http.createServer((request, response) => {
    const route = routes[new URL(request.url, 'http://localhost').pathname];
    if (!route) {
      response.statusCode = 404;
      return response.end('not found');
    }
    response.setHeader('content-type', 'image/png');
    return route(response);
  });
  server.listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(async () => {
  await scanCore.stopScanner();
  await new Promise((resolve) => server.close(resolve));
});

const run = (inputData) => appTester(perform, { inputData });

/** The code, status and message of a refusal: Zapier serializes them as JSON in the message. */
async function refusal(inputData) {
  try {
    await run(inputData);
  } catch (error) {
    assert.equal(error.name, 'AppError', error.message);
    return JSON.parse(error.message);
  }
  throw new Error('the action did not refuse the input');
}

test('the app definition is valid for the schema of its core', async () => {
  // The command the CLI's validate sends to the app: the compiled definition against the schema.
  const handler = zapier.createAppHandler(App);
  assert.deepEqual(await handler({ command: 'validate', calledFromCli: true }, {}), { results: [], status: 'SUCCESS' });
  assert.equal(App.platformVersion, '19.3.0');
  assert.equal(App.version, require('../package.json').version);
  assert.deepEqual(Object.keys(App.creates), ['scan_image']);
  assert.equal(App.authentication, undefined);
});

for (const profile of scanCore.PROFILES) {
  test(`the mixed fixture over HTTP in the ${profile} profile`, TIMEOUT, async () => {
    const result = await run({ image: `${base}/acceptance.png`, profile, budget_ms: 0 });
    assert.equal(result.count, 2);
    assert.equal(result.profile, profile);
    assert.equal(result.budget_exhausted, false);
    assert.equal(result.scanner_version, scanCore.ENGINE_VERSION);
    assert.deepEqual(Object.fromEntries(result.codes.map((code) => [code.symbology, code.text])), EXPECTED);
    assert.deepEqual([...result.texts].sort(), Object.values(EXPECTED).sort());
    assert.equal(result.text, result.texts[0]);
    const qr = result.codes.find((code) => code.symbology === 'qr_code');
    assert.equal(Buffer.from(qr.raw, 'base64').toString('utf8'), EXPECTED.qr_code);
    assert.equal(qr.charset, 'utf8');
    assert.deepEqual(qr.payload, { kind: 'url', url: EXPECTED.qr_code });
    const report = JSON.parse(result.report_json);
    assert.equal(report.detections.length, 2);
    assert.equal(report.trace.engine_panics, 0);
    assert.deepEqual(Object.keys(result).sort(), Object.keys(App.creates.scan_image.operation.sample).sort());
    if (acceptanceDir) {
      mkdirSync(acceptanceDir, { recursive: true });
      writeFileSync(join(acceptanceDir, `${profile}.json`), result.report_json);
    }
  });
}

test('the default profile is frame, and an empty optional field keeps it', TIMEOUT, async () => {
  for (const inputData of [{ image: `${base}/label.png` }, { image: ` ${base}/label.png `, profile: '', budget_ms: '' }]) {
    const result = await run(inputData);
    assert.equal(result.profile, 'frame');
    assert.equal(result.count, 2);
  }
});

test('an image without a code is a result with no code, not an error', TIMEOUT, async () => {
  const result = await run({ image: `${base}/white.png`, budget_ms: 0 });
  assert.equal(result.count, 0);
  assert.equal(result.text, '');
  assert.deepEqual(result.texts, []);
  assert.deepEqual(result.codes, []);
});

test('an empty download is refused as an invalid image', async () => {
  assert.deepEqual(await refusal({ image: `${base}/empty.png` }),
    { message: 'The image is empty [QRSCAN_INPUT]', code: 'InvalidImage', status: 400 });
});

test('a corrupt image or a file that is not an image is refused by the engine', TIMEOUT, async () => {
  for (const path of ['/corrupt.png', '/text.png']) {
    const refused = await refusal({ image: `${base}${path}` });
    assert.equal(refused.code, 'QRS-001', path);
    assert.equal(refused.status, 422, path);
    assert.match(refused.message, /^unsupported or corrupt image: .+ \[QRS-001\]$/, path);
  }
});

test('an image over 8 MiB is refused, whether or not its length is declared', TIMEOUT, async () => {
  const expected = { message: `The image is larger than ${scanCore.LIMITS.inputBytes} bytes (8 MiB).`, code: 'ImageTooLarge', status: 413 };
  assert.deepEqual(await refusal({ image: `${base}/streamed-large.png` }), expected);
  assert.deepEqual(await refusal({ image: `${base}/declared-large.png` }), expected);
});

test('a missing image, a URL that is not http or https, and a failed download are refused', async () => {
  const missing = { message: 'Choose an image file from an earlier step, or enter the URL of an image.', code: 'ImageMissing', status: 400 };
  const notUrl = { message: 'The image must be a file from an earlier step or an http or https URL.', code: 'ImageUrl', status: 400 };
  assert.deepEqual(await refusal({}), missing);
  assert.deepEqual(await refusal({ image: '   ' }), missing);
  assert.deepEqual(await refusal({ image: 'not a url' }), notUrl);
  assert.deepEqual(await refusal({ image: 'ftp://example.com/label.png' }), notUrl);
  assert.deepEqual(await refusal({ image: 'file:///etc/hosts' }), notUrl);
  assert.deepEqual(await refusal({ image: `${base}/missing.png` }),
    { message: 'The image URL answered HTTP 404.', code: 'ImageDownload', status: 404 });
  // A port nothing listens on: the request itself fails.
  const closed = await refusal({ image: 'http://127.0.0.1:9/label.png' });
  assert.equal(closed.code, 'ImageDownload');
  assert.equal(closed.status, 400);
  assert.match(closed.message, /^The image could not be downloaded: .*ECONNREFUSED/);
});

test('a profile or a budget out of range is refused before the download', async () => {
  assert.deepEqual(await refusal({ image: `${base}/label.png`, profile: 'slow' }),
    { message: 'The profile must be one of frame, fast, full.', code: 'InvalidOption', status: 400 });
  const budget = { message: 'The budget must be a whole number of milliseconds from 0 to 25000.', code: 'InvalidBudget', status: 400 };
  for (const budgetMs of [-1, 25_001, 1.5, 'soon']) {
    assert.deepEqual(await refusal({ image: `${base}/label.png`, budget_ms: budgetMs }), budget, String(budgetMs));
  }
});

test('every output field the editor lists is in the sample', () => {
  const { sample, outputFields } = App.creates.scan_image.operation;
  for (const { key } of outputFields) {
    const top = key.split(/\[\]|__/)[0];
    assert.ok(Object.hasOwn(sample, top), key);
  }
});
