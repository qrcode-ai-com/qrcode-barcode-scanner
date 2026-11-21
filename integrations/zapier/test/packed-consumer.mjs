// SPDX-License-Identifier: MIT
// Run the built Zapier bundle the way Zapier runs it: build/build.zip unpacked outside the checkout,
// its zapierwrapper.js handler called with an execute event in a fresh Node process, and, with
// --lambda, inside the AWS Lambda Node.js base image through its runtime interface emulator.
//
//   node test/packed-consumer.mjs build/build.zip [--image FILE] [--reports DIR] [--lambda IMAGE]
//
// It checks the bundle's files and the licence of every package in it against LICENSE-NOTES.md,
// scans the image (the mixed fixture by default) in the three profiles with no budget, expects the
// QR code and the Code 128 exactly, and refuses a corrupt image. With --reports it writes the three
// engine reports for scripts/destination-acceptance.py. It prints one JSON summary.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const checkout = resolve(app, '../..');
const ENGINE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
const ENGINE_VERSION = '0.11.0';
const PROFILES = ['fast', 'frame', 'full'];
const EXPECTED = { qr_code: 'https://qrc-ai.com/76xMa', code128: 'STOCK-4827' };
const METHOD = 'creates.scan_image.operation.perform';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { image: { type: 'string' }, reports: { type: 'string' }, lambda: { type: 'string' } },
});
if (positionals.length !== 1) {
  console.error('usage: node test/packed-consumer.mjs BUILD_ZIP [--image FILE] [--reports DIR] [--lambda IMAGE]');
  process.exit(2);
}
const zipPath = resolve(positionals[0]);
const imagePath = resolve(values.image ?? join(checkout, 'fixtures/symbology/mixed-code128-qr.png'));
const fail = (message) => {
  console.error(`packed consumer: ${message}`);
  process.exit(1);
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// 1. Unpack outside the checkout.
const unpacked = mkdtempSync(join(tmpdir(), 'qrscan-zapier-bundle-'));
if (unpacked === checkout || unpacked.startsWith(checkout + sep)) fail('the bundle must be unpacked outside the checkout');
execFileSync('unzip', ['-q', zipPath, '-d', unpacked]);
// Readable by the Lambda image's non-root user, as Lambda's own task folder is.
chmodSync(unpacked, 0o755);

// 2. The files Zapier loads, the engine, and nothing of the checkout's tests or fixtures.
const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(relative(unpacked, path));
  }
};
walk(unpacked);
const required = [
  'zapierwrapper.js', 'index.js', 'definition.json', 'package.json', 'creates/scan-image.js', 'lib/scan-core.js',
  `node_modules/${ENGINE}/package.json`, `node_modules/${ENGINE}/qrcode-barcode-scanner.js`,
  `node_modules/${ENGINE}/qrcode-barcode-scanner_bg.wasm`, `node_modules/${ENGINE}/LICENSE`,
  `node_modules/${ENGINE}/LICENSE-APACHE-2.0`, `node_modules/${ENGINE}/THIRD-PARTY.md`,
  'node_modules/zapier-platform-core/LICENSE',
];
for (const path of required) if (!files.includes(path)) fail(`build.zip lacks ${path}`);
const stray = files.filter((path) => /^test\/|^build\/|\.png$|node_modules\/zapier-platform-cli\//.test(path));
if (stray.length > 0) fail(`build.zip holds files a Zap never loads: ${stray.slice(0, 5).join(', ')}`);
const engineManifest = JSON.parse(readFileSync(join(unpacked, 'node_modules', ENGINE, 'package.json'), 'utf8'));
if (engineManifest.version !== ENGINE_VERSION) fail(`the bundle holds ${ENGINE}@${engineManifest.version}`);
const definition = JSON.parse(readFileSync(join(unpacked, 'definition.json'), 'utf8'));
if (JSON.stringify(Object.keys(definition.creates)) !== '["scan_image"]' || definition.authentication) {
  fail('definition.json must hold the Scan Image action and no authentication');
}

// 3. Every package in the bundle: its licence is named in LICENSE-NOTES.md, and its notice ships.
const notes = readFileSync(join(app, 'LICENSE-NOTES.md'), 'utf8');
const packages = new Map();
for (const path of files.filter((file) => file.endsWith('/package.json') && file.startsWith('node_modules/'))) {
  const manifest = JSON.parse(readFileSync(join(unpacked, path), 'utf8'));
  if (!manifest.name || !manifest.version) continue; // a folder's module-type marker, not a package
  const license = typeof manifest.license === 'string' ? manifest.license : null;
  packages.set(`${manifest.name}@${manifest.version}`, { license, dir: dirname(path) });
}
const licenses = new Map();
for (const [id, { license, dir }] of packages) {
  const named = license ?? 'none declared';
  if (!notes.includes(`\`${named}\``)) fail(`LICENSE-NOTES.md does not name the licence ${named} of ${id}`);
  licenses.set(named, (licenses.get(named) ?? 0) + 1);
  const notice = files.some((path) => path.startsWith(`${dir}/`) && !path.slice(dir.length + 1).includes('/')
    && /^(license|licence|copying|notice|readme)/i.test(path.slice(dir.length + 1)));
  // A package published without any license text is accepted only when LICENSE-NOTES.md names it.
  if (!notice && license !== 'Public Domain' && !notes.includes(`\`${id}\``)) fail(`build.zip carries no licence text for ${id}`);
}
if (packages.get(`${ENGINE}@${ENGINE_VERSION}`)?.license !== 'AGPL-3.0-or-later') fail('the engine must be the AGPL-3.0-or-later 0.11.0 package');

// 4. The image, served over HTTP as Zapier hands a file to an action.
const image = readFileSync(imagePath);
const corrupt = Buffer.concat([image.subarray(0, 16), Buffer.alloc(64)]);

/** Every way one profile's result departs from the expected codes. */
function judge(profile, result) {
  const problems = [];
  const found = Object.fromEntries((result?.codes ?? []).map((code) => [code.symbology, code.text]));
  if (result?.count !== 2 || JSON.stringify(Object.entries(found).sort()) !== JSON.stringify(Object.entries(EXPECTED).sort())) {
    problems.push(`${profile}: found ${JSON.stringify(found)}`);
  }
  if (result?.profile !== profile) problems.push(`${profile}: the result names profile ${result?.profile}`);
  if (result?.budget_exhausted !== false) problems.push(`${profile}: the unbudgeted scan was cut`);
  if (result?.scanner_version !== ENGINE_VERSION) problems.push(`${profile}: scanner ${result?.scanner_version}`);
  return problems;
}

/** The results of the three profiles and the corrupt image, from a fresh Node process in the bundle. */
async function runInNode(base) {
  const events = [
    ...PROFILES.map((profile) => ({ profile, inputData: { image: `${base}/image.png`, profile, budget_ms: 0 } })),
    { profile: 'corrupt', inputData: { image: `${base}/corrupt.png` } },
  ];
  const script = `
    const { handler } = require('./zapierwrapper.js');
    (async () => {
      const out = [];
      for (const { profile, inputData } of JSON.parse(process.argv[1])) {
        try {
          const response = await handler({ command: 'execute', method: ${JSON.stringify(METHOD)}, bundle: { inputData } }, {});
          out.push({ profile, status: response.status, result: response.results });
        } catch (error) {
          out.push({ profile, error: { name: error.name, message: error.message } });
        }
      }
      process.stdout.write('\\n' + JSON.stringify(out));
    })();`;
  // NODE_ENV=test keeps the core from logging its memory use on every run.
  const env = { PATH: process.env.PATH, NODE_ENV: 'test' };
  const output = await new Promise((done, reject) => {
    const child = spawn(process.execPath, ['-e', script, JSON.stringify(events)], { cwd: unpacked, env, stdio: ['ignore', 'pipe', 'inherit'] });
    let text = '';
    child.stdout.on('data', (chunk) => { text += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? done(text) : reject(new Error(`the bundle process exited ${code}`))));
  });
  return JSON.parse(output.trim().split('\n').pop());
}

/** The same events through the AWS Lambda base image and its runtime interface emulator. */
async function runInLambda(imageRef) {
  // The image is served from inside the container, so the run needs no host network.
  const fixtures = mkdtempSync(join(tmpdir(), 'qrscan-zapier-fixture-'));
  chmodSync(fixtures, 0o755);
  writeFileSync(join(fixtures, 'image.png'), image);
  writeFileSync(join(fixtures, 'corrupt.png'), corrupt);
  writeFileSync(join(fixtures, 'serve.cjs'), `
    const { readFileSync, writeFileSync } = require('node:fs');
    require('node:http').createServer((request, response) => {
      try { response.end(readFileSync('/opt/fixture' + new URL(request.url, 'http://x').pathname)); }
      catch { response.statusCode = 404; response.end(); }
    }).listen(8081, '127.0.0.1', () => writeFileSync('/tmp/fixture-ready', ''));`);
  const container = execFileSync('docker', [
    'run', '--detach', '--rm', '--read-only', '--tmpfs', '/tmp', '--memory', '256m', '--user', '993:990',
    '--env', 'AWS_LAMBDA_FUNCTION_MEMORY_SIZE=256', '--env', 'AWS_LAMBDA_FUNCTION_TIMEOUT=30',
    '--publish', '127.0.0.1::8080',
    '--volume', `${unpacked}:/var/task:ro`, '--volume', `${fixtures}:/opt/fixture:ro`,
    '--entrypoint', '/bin/sh', imageRef, '-c',
    'node /opt/fixture/serve.cjs & while [ ! -e /tmp/fixture-ready ]; do sleep 0.1; done; exec /lambda-entrypoint.sh zapierwrapper.handler',
  ], { encoding: 'utf8' }).trim();
  try {
    const port = execFileSync('docker', ['port', container, '8080/tcp'], { encoding: 'utf8' }).trim().split(':').pop();
    const invoke = (event) => new Promise((done, reject) => {
      const body = JSON.stringify(event);
      const request = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/2015-03-31/functions/function/invocations', headers: { 'content-type': 'application/json' } }, (response) => {
        let text = '';
        response.on('data', (chunk) => { text += chunk; });
        response.on('end', () => done(JSON.parse(text)));
      });
      request.on('error', reject);
      request.end(body);
    });
    const runtime = execFileSync('docker', ['exec', container, 'node', '--version'], { encoding: 'utf8' }).trim();
    const out = [];
    for (const [profile, inputData] of [
      ...PROFILES.map((name) => [name, { image: 'http://127.0.0.1:8081/image.png', profile: name, budget_ms: 0 }]),
      ['corrupt', { image: 'http://127.0.0.1:8081/corrupt.png' }],
    ]) {
      let response;
      for (let attempt = 0; ; attempt += 1) {
        try {
          response = await invoke({ command: 'execute', method: METHOD, bundle: { inputData } });
          break;
        } catch (error) {
          if (attempt >= 50) throw error;
          await new Promise((wait) => setTimeout(wait, 200));
        }
      }
      if (response.errorType) out.push({ profile, error: { name: response.errorType, message: response.errorMessage } });
      else out.push({ profile, status: response.status, result: response.results });
    }
    return { runtime, out };
  } finally {
    execFileSync('docker', ['stop', '--time', '1', container], { stdio: 'ignore' });
  }
}

/** Every way a run's results depart from the contract. */
function check(where, out) {
  const problems = [];
  for (const entry of out) {
    if (entry.profile === 'corrupt') {
      let refused = null;
      try { refused = JSON.parse(entry.error?.message ?? 'null'); } catch { refused = null; }
      if (entry.error?.name !== 'AppError' || refused?.code !== 'QRS-001' || refused?.status !== 422) {
        problems.push(`${where} corrupt: ${JSON.stringify(entry.error ?? entry.result)}`);
      }
    } else if (entry.status !== 'SUCCESS') {
      problems.push(`${where} ${entry.profile}: ${JSON.stringify(entry.error)}`);
    } else {
      problems.push(...judge(entry.profile, entry.result).map((problem) => `${where} ${problem}`));
    }
  }
  return problems;
}

const server = http.createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('content-type', 'image/png');
  if (path === '/image.png') return response.end(image);
  if (path === '/corrupt.png') return response.end(corrupt);
  response.statusCode = 404;
  return response.end();
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
let node;
try {
  node = await runInNode(`http://127.0.0.1:${server.address().port}`);
} finally {
  server.close();
}
const problems = check('node', node);
let lambda = null;
if (values.lambda) {
  lambda = await runInLambda(values.lambda);
  problems.push(...check('lambda', lambda.out));
}
if (problems.length > 0) fail(problems.join('; '));

if (values.reports) {
  mkdirSync(values.reports, { recursive: true });
  for (const entry of node.filter((item) => PROFILES.includes(item.profile))) {
    writeFileSync(join(values.reports, `${entry.profile}.json`), entry.result.report_json);
  }
}
const zip = readFileSync(zipPath);
console.log(JSON.stringify({
  bundle: { path: relative(process.cwd(), zipPath), bytes: zip.length, sha256: sha256(zip), files: files.length },
  engine: { package: `${ENGINE}@${engineManifest.version}`, wasm_sha256: sha256(readFileSync(join(unpacked, 'node_modules', ENGINE, 'qrcode-barcode-scanner_bg.wasm'))) },
  packages: packages.size,
  licenses: Object.fromEntries([...licenses].sort()),
  node: { runtime: process.version, profiles: node.filter((item) => item.status === 'SUCCESS').map((item) => item.profile), corrupt: 'QRS-001' },
  lambda: lambda && { image: values.lambda, runtime: lambda.runtime, memory_mb: 256, profiles: lambda.out.filter((item) => item.status === 'SUCCESS').map((item) => item.profile), corrupt: 'QRS-001' },
  reports: values.reports ?? null,
  unpacked,
  image: existsSync(imagePath) ? relative(process.cwd(), imagePath) : imagePath,
}, null, 2));
