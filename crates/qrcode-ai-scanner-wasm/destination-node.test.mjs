// Node resolver and endpoint handler (destination-node.js). Cases N1..N44 are this file's own
// labels: each check('N<n>') below is one case, and a suffix such as 'N38 (TLS)' marks a variant
// of it. Every request goes to loopback fixtures (destination-fixtures.mjs); names resolve only
// through injected lookups or the loopback DNS fixture. A recorder on `net.client.socket` fails
// the run on any contact outside the fixtures. Children re-execute this file with
// QRSCAN_DESTINATION_CHILD set.
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import dc from 'node:diagnostics_channel';
import dns from 'node:dns';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  startDnsFixture,
  startFixture,
  startRecordingProxy,
  startTcpRecorder,
} from './destination-fixtures.mjs';

const nodeProcess = globalThis.process;
// QRSCAN_DESTINATION_PACKAGE: the folder holding destination.js and destination-node.js, such as
// an installed package (default: this file's folder). The two module variables, when set, win.
const PACKAGE_DIR = nodeProcess.env.QRSCAN_DESTINATION_PACKAGE;
const packaged = file => (PACKAGE_DIR === undefined ? `./${file}`
  : pathToFileURL(resolve(PACKAGE_DIR, file)).href);
const CORE_MODULE = nodeProcess.env.QRSCAN_DESTINATION_MODULE ?? packaged('destination.js');
const NODE_MODULE = nodeProcess.env.QRSCAN_DESTINATION_NODE_MODULE
  ?? packaged('destination-node.js');
const CHILD = nodeProcess.env.QRSCAN_DESTINATION_CHILD;
const SELF = fileURLToPath(import.meta.url);

const FIXTURE_LABEL = 'Local fixture (Node resolver)';
const NETWORK_LABEL = 'Server resolver (Node)';
const FIXTURE_INFO = { kind: 'node', label: FIXTURE_LABEL };
const NETWORK_INFO = { kind: 'node', label: NETWORK_LABEL };
const NETWORK = { transport: NETWORK_INFO, provenance: 'network' };
const USER_AGENT = 'qrcode-barcode-scanner-destination-bot/1';
const ACCEPT = 'text/html,application/xhtml+xml,*/*;q=0.8';
const FOUR_HEADERS = ['accept', 'connection', 'host', 'user-agent'];
const LOOKUP_OPTIONS = { all: true, family: 0, hints: 0 };
const RESOLUTION_KEYS = ['outcome', 'reason', 'url', 'transport', 'provenance', 'requestSent',
  'finalUrl', 'status', 'redirected', 'changed', 'redirects', 'hopCount', 'detail', 'durationMs'];
const SNAPSHOT_KEYS = ['encodedUrl', 'requestUrl', 'state', 'reason', 'attemptId', 'transport',
  'provenance', 'requestSent', 'finalUrl', 'status', 'redirected', 'changed', 'redirects',
  'hopCount', 'startedAt', 'settledAt', 'durationMs', 'detail'];
const WIRE_KEYS = ['version', 'url', 'outcome', 'reason', 'finalUrl', 'status', 'redirected',
  'redirects', 'requestSent', 'provenance', 'detail'];
const STEP_KEYS = ['url', 'status', 'location', 'refusedScheme'];
const JSON_TYPE = { 'content-type': 'application/json' };
const SAME_ORIGIN = { 'sec-fetch-site': 'same-origin' };

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const flush = () => new Promise(resolve => setImmediate(resolve));
const write = payload => nodeProcess.stdout.write(JSON.stringify(payload));
const isObject = value => value !== null && typeof value === 'object';

async function until(predicate, label, ms = 5000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > ms) throw new Error(`timed out waiting for ${label}`);
    await delay(5);
  }
}

// ---------------------------------------------------------------------------- shared harness

const endpointText = (address, port) =>
  (address.includes(':') ? `[${address}]:${port}` : `${address}:${port}`);

// One contact per TCP connection attempt (or per connect where Node has no 'connectionAttempt'
// event). A socket object whose lookup was refused never attempts, so it is not a contact.
const socketChannel = dc.channel('net.client.socket');
function installRecorder() {
  const contacts = [];
  socketChannel.subscribe(({ socket }) => {
    let attempted = false;
    socket.on('connectionAttempt', (address, port) => {
      attempted = true;
      contacts.push(endpointText(address, port));
    });
    socket.once('connect', () => {
      if (!attempted) contacts.push(endpointText(socket.remoteAddress, socket.remotePort));
    });
  });
  return contacts;
}

// Deterministic timers. Members record any call that is not unbound (the d.ts contract).
function fakeClock(wall = 0) {
  let monotonic = 0;
  let sequence = 0;
  const due = new Map();
  const clock = {
    bound: 0,
    get pending() { return due.size; },
    timers: {
      now: function now() { if (this !== undefined) clock.bound++; return wall + monotonic; },
      monotonic: function mono() { if (this !== undefined) clock.bound++; return monotonic; },
      setTimeout: function set(callback, ms) {
        if (this !== undefined) clock.bound++;
        sequence += 1;
        due.set(sequence, { at: monotonic + ms, callback });
        return sequence;
      },
      clearTimeout: function clear(handle) {
        if (this !== undefined) clock.bound++;
        due.delete(handle);
      },
    },
    async advance(ms) {
      const end = monotonic + ms;
      for (;;) {
        let next = null;
        for (const [id, timer] of due) {
          if (timer.at <= end && (next === null || timer.at < next.timer.at)) next = { id, timer };
        }
        if (next === null) break;
        due.delete(next.id);
        monotonic = next.timer.at;
        next.timer.callback();
        await flush();
      }
      monotonic = end;
      await flush();
    },
  };
  return clock;
}

// A resolution without durationMs, after checking its frozen shape and key order.
function plain(resolution) {
  assert.ok(Object.isFrozen(resolution), 'resolutions are frozen');
  assert.deepEqual(Object.keys(resolution), RESOLUTION_KEYS);
  assert.equal(Number.isInteger(resolution.durationMs) && resolution.durationMs >= 0, true,
    'durationMs is a non-negative integer');
  if (Array.isArray(resolution.redirects)) {
    for (const item of resolution.redirects) assert.deepEqual(Object.keys(item), STEP_KEYS);
  }
  const { durationMs, ...rest } = resolution;
  return rest;
}

const step = (url, status, location, refusedScheme = null) =>
  ({ url, status, location, refusedScheme });

const outcomeOf = (url, fields) => ({
  outcome: 'resolved', reason: null, url, transport: FIXTURE_INFO, provenance: 'fixture',
  requestSent: true, finalUrl: null, status: null, redirected: null, changed: null,
  redirects: null, hopCount: null, detail: null, ...fields,
});
const resolvedAt = (url, finalUrl, status, redirects, extra = {}) => outcomeOf(url, {
  finalUrl, status, redirected: redirects.length > 0, changed: finalUrl !== url, redirects,
  hopCount: redirects.length, ...extra,
});
// hopCount, the number of redirects followed, is stated per case; redirected is hopCount > 0.
const failedAt = (url, reason, detail, redirects, requestSent, hopCount, extra = {}) =>
  outcomeOf(url, { outcome: 'failed', reason, requestSent, redirected: hopCount > 0, redirects,
    hopCount, detail, ...extra });
const unavailableAt = (url, reason, detail, extra = {}) =>
  outcomeOf(url, { outcome: 'unavailable', reason, requestSent: false, detail, ...extra });

const v4 = address => [{ address, family: 4 }];
const lookupError = code => Object.assign(new Error(`lookup ${code}`), { code });

function child(name, { execArgv = [], env = {} } = {}) {
  return new Promise(resolve => {
    execFile(nodeProcess.execPath, [...execArgv, SELF], {
      encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024,
      env: { ...nodeProcess.env, ...env, QRSCAN_DESTINATION_CHILD: name },
    }, (error, stdout, stderr) => resolve({ error, stdout, stderr }));
  });
}

async function childJson(name, options) {
  const { error, stdout, stderr } = await child(name, options);
  assert.equal(error, null, `child ${name} failed: ${stderr}`);
  return JSON.parse(stdout);
}

// A throwaway self-signed P-256 pair, or null when openssl is missing outside CI. openssl writes
// the key and the certificate to files in a temporary folder, read back here: a Windows build
// has no /dev/stdout and ends its PEM lines with CRLF. The first call prints the openssl build.
let opensslBuild = null;
function selfSigned(subject, altNames) {
  const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  const dir = mkdtempSync(join(tmpdir(), 'qrscan-tls-'));
  const keyFile = join(dir, 'key.pem');
  const certFile = join(dir, 'cert.pem');
  try {
    try {
      if (opensslBuild === null) {
        opensslBuild = execFileSync('openssl', ['version', '-v', '-d'], options).trim()
          .split(/\r?\n/).join('; ');
        console.log(`openssl: ${opensslBuild}`);
      }
      execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt',
        'ec_paramgen_curve:prime256v1', '-nodes', '-keyout', keyFile, '-out', certFile,
        '-days', '1', '-subj', subject, '-addext', `subjectAltName=${altNames}`], options);
    } catch (error) {
      if (error.code !== 'ENOENT' || nodeProcess.env.CI === 'true') throw error;
      return null;
    }
    const pem = file => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    return {
      key: /-----BEGIN (?:EC )?PRIVATE KEY-----[\s\S]+?-----END (?:EC )?PRIVATE KEY-----\n/
        .exec(pem(keyFile))[0],
      cert: /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----\n/
        .exec(pem(certFile))[0],
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const appendedNodeOptions = flag =>
  [nodeProcess.env.NODE_OPTIONS, flag].filter(text => typeof text === 'string' && text !== '')
    .join(' ');

function listenOn(server, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ port: 0, host }, () => {
      server.off('error', reject);
      resolve(server.address().port);
    });
  });
}

function closeServer(server) {
  return new Promise(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

// One HTTP request with exact headers; resolves with the status, headers and body text.
function send(port, { method = 'POST', headers = {}, body, start } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: '/api/destination',
      headers, agent: new http.Agent({ keepAlive: false }) }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers,
          text: Buffer.concat(chunks).toString('utf8') });
        req.destroy();
      });
    });
    req.on('error', reject);
    if (start === undefined) req.end(body);
    else start(req);
  });
}

function assertJsonHeaders(response) {
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.deepEqual(Object.keys(response.headers).filter(name => name.startsWith('access-control')),
    []);
}

const wireBody = (url, extra = {}) =>
  JSON.stringify({ version: 1, url, maxHops: 10, timeoutMs: 9000, ...extra });

const wireOf = (url, fields) => ({
  version: 1, url, outcome: 'failed', reason: null, finalUrl: null, status: null,
  redirected: false, redirects: [], requestSent: true, provenance: 'fixture', detail: null,
  ...fields,
});

// ------------------------------------------------------------------------------- the parent

const failures = [];
const skipped = [];

async function check(id, body, ms = 30000) {
  let timer = null;
  const expired = new Promise((ignored, reject) => {
    timer = setTimeout(() => reject(new Error(`${id} did not finish within ${ms} ms`)), ms);
  });
  try {
    await Promise.race([body(), expired]);
  } catch (error) {
    failures.push(id);
    nodeProcess.stderr.write(`FAIL ${id}: ${error && error.stack ? error.stack : error}\n`);
  } finally {
    clearTimeout(timer);
  }
}

async function parent() {
  const unhandled = [];
  nodeProcess.on('unhandledRejection', reason => unhandled.push(reason));
  const contacts = installRecorder();
  const core = await import(CORE_MODULE);
  const node = await import(NODE_MODULE);
  const { createDestinationEndpoint, createNodeTransport } = node;
  const run = (transport, url, request = {}, options) =>
    core.resolveDestination(transport, { url, ...request }, options);

  const cleanup = [];
  const allowed = new Set();
  const fx = await startFixture();
  cleanup.push(() => fx.close());
  allowed.add(endpointText('127.0.0.1', fx.port));
  const A = fx.port;
  const u = path => fx.url(path);
  const FX = { address: '127.0.0.1', port: A };
  const FX_CONTACT = endpointText('127.0.0.1', A);
  const transport = createNodeTransport({ fixture: FX });
  const paths = mark => fx.hits.slice(mark).map(hit => hit.path);
  const events = name => fx.events.filter(event => event === name).length;
  const nameTarget = `http://fixture.test:${A}/ok`;
  const childContacts = list => assert.deepEqual(list.filter(item => !allowed.has(item)), []);

  async function startHandler(options, before = null) {
    let handler = null;
    const responses = [];
    const server = http.createServer((req, res) => {
      const end = res.end;
      const record = { res, ended: [] };
      res.end = function patchedEnd(...args) {
        record.ended.push(args[0]);
        return end.apply(this, args);
      };
      responses.push(record);
      if (before === null) handler(req, res);
      else before(req).then(() => handler(req, res));
    });
    const port = await listenOn(server);
    const host = `127.0.0.1:${port}`;
    handler = createDestinationEndpoint({ allowedHosts: [host], publicScheme: 'http',
      ...options });
    allowed.add(endpointText('127.0.0.1', port));
    cleanup.push(() => closeServer(server));
    return { port, host, origin: `http://${host}`, responses,
      contact: endpointText('127.0.0.1', port) };
  }

  // N1
  await check('N1', async () => {
    assert.deepEqual([transport.kind, transport.label, transport.provenance],
      ['node', FIXTURE_LABEL, 'fixture']);
    assert.equal(Object.isFrozen(transport), true);
    const mark = contacts.length;
    assert.deepEqual(plain(await run(transport, u('/ok'))),
      resolvedAt(u('/ok'), u('/ok'), 200, []));
    assert.deepEqual(contacts.slice(mark), [FX_CONTACT]);
  });

  // N2
  await check('N2', async () => {
    for (const code of [204, 404, 500]) {
      const url = u(`/status/${code}`);
      assert.deepEqual(plain(await run(transport, url)), resolvedAt(url, url, code, []), url);
    }
  });

  // N3
  await check('N3', async () => {
    for (const code of [301, 302, 303, 307, 308]) {
      const url = u(`/r/${code}`);
      assert.deepEqual(plain(await run(transport, url)),
        resolvedAt(url, u('/ok'), 200, [step(url, code, u('/ok'))]), url);
    }
  });

  // N4
  await check('N4', async () => {
    const url = u('/no-location');
    assert.deepEqual(plain(await run(transport, url)), resolvedAt(url, url, 302, []));
  });

  // N5
  await check('N5', async () => {
    const url = u('/chain/3');
    assert.deepEqual(plain(await run(transport, url)), resolvedAt(url, u('/chain/0'), 200, [
      step(url, 302, u('/chain/2')), step(u('/chain/2'), 302, u('/chain/1')),
      step(u('/chain/1'), 302, u('/chain/0'))]));
    const mixed = u('/mixed-chain');
    assert.deepEqual(plain(await run(transport, mixed)), resolvedAt(mixed, u('/ok'), 200, [
      step(mixed, 301, u('/mixed-chain/2')), step(u('/mixed-chain/2'), 307, u('/mixed-chain/3')),
      step(u('/mixed-chain/3'), 308, u('/ok'))]));
  });

  // N6
  await check('N6', async () => {
    const url = u('/deep/relative');
    assert.deepEqual(plain(await run(transport, url)),
      resolvedAt(url, u('/ok?x=1'), 200, [step(url, 302, u('/ok?x=1'))]));
  });

  // N7
  await check('N7', async () => {
    let mark = fx.hits.length;
    const url = u('/chain/11');
    const steps = [];
    const requested = [];
    for (let n = 11; n >= 1; n -= 1) {
      steps.push(step(u(`/chain/${n}`), 302, u(`/chain/${n - 1}`)));
      requested.push(`/chain/${n}`);
    }
    assert.equal(steps.length, 11);
    assert.deepEqual(plain(await run(transport, url)),
      failedAt(url, 'too_many_redirects', 'Redirect limit reached', steps, true, 10));
    assert.deepEqual(paths(mark), requested, '/chain/0 is never requested');
    mark = fx.hits.length;
    const once = u('/r/302');
    assert.deepEqual(plain(await run(transport, once, { maxHops: 0 })), failedAt(once,
      'too_many_redirects', 'Redirect limit reached', [step(once, 302, u('/ok'))], true, 0));
    assert.deepEqual(paths(mark), ['/r/302']);
  });

  // N8
  await check('N8', async () => {
    const loop = u('/loop/a');
    assert.deepEqual(plain(await run(transport, loop)), failedAt(loop, 'redirect_loop',
      'Redirect loop', [step(loop, 302, u('/loop/b')), step(u('/loop/b'), 302, loop)], true, 1));
    for (const path of ['/self', '/empty-location']) {
      const url = u(path);
      assert.deepEqual(plain(await run(transport, url)), failedAt(url, 'redirect_loop',
        'Redirect loop', [step(url, 302, url)], true, 0), path);
    }
  });

  // N9
  await check('N9', async () => {
    const same = u('/dup-same');
    assert.deepEqual(plain(await run(transport, same)),
      resolvedAt(same, u('/ok'), 200, [step(same, 302, u('/ok'))]));
    const distinct = u('/dup-distinct');
    assert.deepEqual(plain(await run(transport, distinct)), failedAt(distinct, 'invalid_location',
      'Redirect location invalid', [step(distinct, 302, null)], true, 0));
  });

  // N10
  await check('N10', async () => {
    for (const path of ['/bad-location/parse', '/bad-location/utf8',
      `/long-path/${'a'.repeat(16330)}`]) {
      const url = u(path);
      assert.deepEqual(plain(await run(transport, url)), failedAt(url, 'invalid_location',
        'Redirect location invalid', [step(url, 302, null)], true, 0), path.slice(0, 24));
    }
    const long = u('/long-location');
    assert.deepEqual(plain(await run(transport, long)), failedAt(long, 'invalid_response',
      'Invalid HTTP response (HPE_HEADER_OVERFLOW)', [], true, 0));
    const utf8 = u('/utf8-location');
    assert.deepEqual(plain(await run(transport, utf8)),
      resolvedAt(utf8, u('/caf%C3%A9'), 200, [step(utf8, 302, u('/caf%C3%A9'))]));
    const escape = u('/escape');
    assert.deepEqual(plain(await run(transport, escape)),
      resolvedAt(escape, u('/ok?x=%E2%80%AE'), 200, [step(escape, 302, u('/ok?x=%E2%80%AE'))]));
  });

  // N11
  await check('N11', async () => {
    for (const [name, scheme] of [['ftp', 'ftp:'], ['js', 'javascript:'],
      ['app', 'qrcodeai-app:'], ['ftp-credentials', 'ftp:']]) {
      const url = u(`/to/${name}`);
      assert.deepEqual(plain(await run(transport, url)), failedAt(url, 'blocked_scheme',
        'Redirect scheme not allowed', [step(url, 302, null, scheme)], true, 0), name);
    }
  });

  // N12
  await check('N12', async () => {
    const mark = fx.hits.length;
    const url = u('/to/credentials');
    assert.deepEqual(plain(await run(transport, url)), failedAt(url, 'blocked_credentials',
      'Redirect carries credentials', [step(url, 302, null)], true, 0));
    assert.deepEqual(paths(mark), ['/to/credentials'], 'no second request');
    assert.deepEqual([...fx.hits[mark].names].sort(), FOUR_HEADERS, 'no Authorization header');
  });

  // N13
  await check('N13', async () => {
    for (const [name, location] of [['private', 'http://10.0.0.1/'],
      ['metadata', 'http://169.254.169.254/latest/meta-data/'],
      ['mapped', `http://[::ffff:7f00:1]:${A}/ok`], ['ipv6-loopback', `http://[::1]:${A}/ok`],
      ['ula', 'http://[fd00::1]/'], ['loopback-other', `http://127.0.0.2:${A}/ok`]]) {
      const mark = contacts.length;
      const url = u(`/to/${name}`);
      assert.deepEqual(plain(await run(transport, url)), failedAt(url, 'blocked_address',
        'Address not allowed', [step(url, 302, location)], true, 0), name);
      assert.deepEqual(contacts.slice(mark), [FX_CONTACT], `no socket for ${name}`);
    }
    for (const name of ['fixture-alias', 'fixture-hex', 'decimal']) {
      const mark = contacts.length;
      const url = u(`/to/${name}`);
      assert.deepEqual(plain(await run(transport, url)),
        resolvedAt(url, u('/ok'), 200, [step(url, 302, u('/ok'))]), name);
      assert.deepEqual(contacts.slice(mark), [FX_CONTACT, FX_CONTACT], name);
    }
  });

  // N14
  await check('N14', async () => {
    const calls = [];
    const spy = createNodeTransport({ fixture: FX, lookup: (...args) => {
      calls.push(args[0]);
      args[2](null, v4('127.0.0.1'));
    } });
    for (const [name, location] of [['localhost', `http://localhost:${A}/ok`],
      ['local', 'http://printer.local/'], ['single-label', 'http://intranet/']]) {
      const url = u(`/to/${name}`);
      assert.deepEqual(plain(await run(spy, url)), failedAt(url, 'blocked_address',
        'Address not allowed', [step(url, 302, location)], true, 0), name);
    }
    assert.deepEqual(calls, [], 'the lookup is never called');
  });

  // N15
  await check('N15', async () => {
    const url = u('/to/bad-port');
    assert.deepEqual(plain(await run(transport, url)), failedAt(url, 'blocked_port',
      'Port not allowed', [step(url, 302, 'http://127.0.0.1:6000/')], true, 0));
  });

  // N16
  await check('N16', async () => {
    const calls = [];
    const spy = createNodeTransport({ fixture: FX, lookup: (hostname, options, callback) => {
      calls.push([hostname, options]);
      callback(null, v4('127.0.0.1'));
    } });
    let mark = contacts.length;
    const outside = 'https://example.com/';
    assert.deepEqual(plain(await run(spy, outside)),
      unavailableAt(outside, 'out_of_scope', 'Outside this transport scope'));
    assert.deepEqual(contacts.slice(mark), []);
    mark = contacts.length;
    const pub = u('/to/public');
    assert.deepEqual(plain(await run(spy, pub)), failedAt(pub, 'left_fixture',
      'Left the fixture scope', [step(pub, 302, 'http://example.com/')], true, 0));
    assert.deepEqual(contacts.slice(mark), [FX_CONTACT], 'example.com is never contacted');
    const name = u('/to/name');
    assert.deepEqual(plain(await run(transport, name)), failedAt(name, 'left_fixture',
      'Left the fixture scope', [step(name, 302, nameTarget)], true, 0));
    assert.deepEqual(calls, []);
    assert.deepEqual(plain(await run(spy, name)),
      resolvedAt(name, nameTarget, 200, [step(name, 302, nameTarget)]));
    assert.deepEqual(calls, [['fixture.test', LOOKUP_OPTIONS]]);
  });

  // N17
  await check('N17', async () => {
    const answers = [];
    const lookups = [];
    const t17 = createNodeTransport({ fixture: FX, lookup: (hostname, options, callback) => {
      lookups.push(hostname);
      const next = answers.shift();
      if (next instanceof Error) callback(next, []);
      else callback(null, next);
    } });
    let mark = contacts.length;
    answers.push(v4('127.0.0.1'), v4('10.0.0.1'));
    const rebind = u('/to/rebind');
    const second = `http://rebind.test:${A}/rebind-2`;
    assert.deepEqual(plain(await run(t17, rebind)), failedAt(rebind, 'blocked_address',
      'Resolved address not allowed', [step(rebind, 302, second),
        step(second, 302, `http://rebind.test:${A}/ok`)], true, 1));
    assert.deepEqual(contacts.slice(mark), [FX_CONTACT, FX_CONTACT], 'sockets only to A');
    mark = contacts.length;
    answers.push([{ address: '127.0.0.1', family: 4 }, { address: '10.0.0.1', family: 4 }]);
    const flip = u('/to/flip');
    assert.deepEqual(plain(await run(t17, flip)), failedAt(flip, 'blocked_address',
      'Resolved address not allowed', [step(flip, 302, `http://flip.test:${A}/ok`)], true, 0));
    assert.deepEqual(contacts.slice(mark), [FX_CONTACT], 'no new socket for the flip answer');
    const name = u('/to/name');
    answers.push([]);
    assert.deepEqual(plain(await run(t17, name)), failedAt(name, 'dns_error',
      'Name resolution failed', [step(name, 302, nameTarget)], true, 1));
    answers.push(lookupError('ENOTFOUND'));
    assert.deepEqual(plain(await run(t17, name)), failedAt(name, 'dns_error',
      'Name resolution failed (ENOTFOUND)', [step(name, 302, nameTarget)], true, 1));
    assert.deepEqual(answers, []);
    assert.deepEqual(lookups, ['rebind.test', 'rebind.test', 'flip.test', 'fixture.test',
      'fixture.test']);
  });

  // N18
  await check('N18', async () => {
    const t18 = createNodeTransport({ fixture: FX, timeoutMs: 200 });
    let closed = events('slow:closed');
    const slow = u('/slow');
    assert.deepEqual(plain(await run(t18, slow)), failedAt(slow, 'timeout', 'Timed out', [],
      true, 0));
    await until(() => events('slow:closed') === closed + 1, 'the /slow close');
    closed = events('slow:closed');
    const toSlow = u('/to/slow');
    assert.deepEqual(plain(await run(t18, toSlow)), failedAt(toSlow, 'timeout', 'Timed out',
      [step(toSlow, 302, slow)], true, 1));
    await until(() => events('slow:closed') === closed + 1, 'the /to/slow close');
  });

  // N19
  await check('N19', async () => {
    const mark = fx.hits.length;
    const url = u('/headers');
    assert.deepEqual(plain(await run(transport, url)), resolvedAt(url, url, 200, []));
    const hit = fx.hits[mark];
    assert.equal(hit.method, 'GET');
    assert.equal(hit.path, '/headers');
    assert.deepEqual([...hit.names].sort(), FOUR_HEADERS);
    assert.deepEqual(hit.headers, { host: `127.0.0.1:${A}`, 'user-agent': USER_AGENT,
      accept: ACCEPT, connection: 'close' });
  });

  // N20, N21
  for (const [id, path] of [['N20', '/cookie'], ['N21', '/referrer-policy']]) {
    await check(id, async () => {
      const mark = fx.hits.length;
      const url = u(path);
      assert.deepEqual(plain(await run(transport, url)),
        resolvedAt(url, u('/headers'), 200, [step(url, 302, u('/headers'))]));
      assert.deepEqual(paths(mark), [path, '/headers']);
      assert.deepEqual([...fx.hits[mark + 1].names].sort(), FOUR_HEADERS,
        'no Cookie and no Referer on the second hop');
    });
  }

  // N22
  await check('N22', async () => {
    const started = performance.now();
    const url = u('/large');
    assert.deepEqual(plain(await run(transport, url)), resolvedAt(url, url, 200, []));
    assert.equal(performance.now() - started < 1000, true, 'resolved within 1 s');
    await until(() => fx.events.includes('large:closed-early'), 'the /large close');
    assert.equal(fx.events.includes('large:complete'), false);
  });

  // N23
  await check('N23', async () => {
    const url = u('/huge-headers');
    const expected = failedAt(url, 'invalid_response',
      'Invalid HTTP response (HPE_HEADER_OVERFLOW)', [], true, 0);
    assert.deepEqual(plain(await run(transport, url)), expected);
    const flag = '--max-http-header-size=65536';
    const shared = { QRSCAN_FX_PORT: String(A), QRSCAN_FX_PATHS: '["/huge-headers"]',
      QRSCAN_FLAG: flag };
    for (const options of [{ execArgv: [flag], env: shared },
      { env: { ...shared, NODE_OPTIONS: appendedNodeOptions(flag) } }]) {
      const out = await childJson('flags', options);
      assert.equal(out.flagSeen, true);
      assert.equal(out.maxHeaderSize, 65536, 'the flag raised http.maxHeaderSize');
      assert.deepEqual(out.results, [expected]);
      childContacts(out.contacts);
    }
  }, 60000);

  // N24
  await check('N24', async () => {
    const routes = [['/garbage', 'invalid_response', 'Invalid HTTP response (HPE_INVALID_STATUS)'],
      ['/reset', 'connection_error', 'Connection failed (ECONNRESET)'],
      ['/status/999', 'invalid_response', 'Invalid HTTP response']];
    const expected = routes.map(([path, reason, detail]) =>
      failedAt(u(path), reason, detail, [], true, 0));
    const results = [];
    for (const [path] of routes) results.push(plain(await run(transport, u(path))));
    assert.deepEqual(results, expected);
    const flag = '--insecure-http-parser';
    const shared = { QRSCAN_FX_PORT: String(A),
      QRSCAN_FX_PATHS: JSON.stringify(routes.map(([path]) => path)), QRSCAN_FLAG: flag };
    for (const options of [{ execArgv: [flag], env: shared },
      { env: { ...shared, NODE_OPTIONS: appendedNodeOptions(flag) } }]) {
      const out = await childJson('flags', options);
      assert.equal(out.flagSeen, true);
      assert.deepEqual(out.results, expected);
      childContacts(out.contacts);
    }
  }, 60000);

  // N25
  await check('N25', async () => {
    const url = u('/early-hints');
    assert.deepEqual(plain(await run(transport, url)),
      resolvedAt(url, u('/ok'), 200, [step(url, 302, u('/ok'))]));
  });

  // N26
  await check('N26', async () => {
    const proxy = await startRecordingProxy();
    cleanup.push(() => proxy.close());
    const proxyContact = endpointText('127.0.0.1', proxy.port);
    allowed.add(proxyContact);
    const out = await childJson('proxy', { execArgv: ['--use-env-proxy'], env: {
      HTTP_PROXY: proxy.url, HTTPS_PROXY: proxy.url, ALL_PROXY: proxy.url, http_proxy: proxy.url,
      https_proxy: proxy.url, all_proxy: proxy.url, NO_PROXY: '', no_proxy: '',
      NODE_USE_ENV_PROXY: '1', QRSCAN_FX_PORT: String(A) } });
    assert.deepEqual(out.result, resolvedAt(u('/ok'), u('/ok'), 200, []));
    assert.deepEqual(out.resolverContacts, [FX_CONTACT], 'the resolver never met the proxy');
    assert.equal(out.resolverSpyUses, 0, 'the resolver never used the global agent');
    assert.deepEqual(out.control, { status: 299 });
    assert.deepEqual(out.controlContacts, [proxyContact]);
    assert.equal(out.spyUses, 1, 'the control went through the spy global agent');
    assert.equal(proxy.connections, 1, 'one proxy connection, from the control');
    assert.deepEqual(proxy.requestLines, ['GET http://proxied.test/ HTTP/1.1']);
  }, 60000);

  // N27
  await check('N27', async () => {
    const pair = selfSigned('/CN=127.0.0.1', 'IP:127.0.0.1');
    if (pair === null) {
      skipped.push('N27 (openssl missing)');
      return;
    }
    const { key, cert } = pair;
    const secure = await startFixture({ tls: { key, cert } });
    cleanup.push(() => secure.close());
    allowed.add(endpointText('127.0.0.1', secure.port));
    const fixture = { address: '127.0.0.1', port: secure.port };
    const ok = secure.url('/ok');
    assert.equal(ok, `https://127.0.0.1:${secure.port}/ok`);
    assert.deepEqual(plain(await run(createNodeTransport({ fixture, ca: cert }), ok)),
      resolvedAt(ok, ok, 200, []));
    const refused = failedAt(ok, 'tls_error', 'TLS handshake failed (DEPTH_ZERO_SELF_SIGNED_CERT)',
      [], null, 0);
    assert.deepEqual(plain(await run(createNodeTransport({ fixture }), ok)), refused);
    const out = await childJson('tls-env', { env: { NODE_TLS_REJECT_UNAUTHORIZED: '0',
      QRSCAN_FX_PORT: String(secure.port) } });
    assert.equal(out.environmentDisablesChecks, true);
    assert.deepEqual(out.result, refused);
    childContacts(out.contacts);
    assert.throws(() => createNodeTransport({ ca: cert }), TypeError);
  }, 60000);

  // N28
  await check('N28', async () => {
    const refused = [
      [{ fixture: FX, allowedPorts: [8080] }, TypeError],
      [{ fixture: FX, dnsServers: ['127.0.0.1'] }, TypeError],
      [{ fixture: { address: 'localhost', port: A } }, TypeError],
      [{ fixture: { address: '10.0.0.1', port: A } }, TypeError],
      [{ fixture: { address: '127.0.0.1', port: 6000 } }, TypeError],
      [{ translationPrefixes: ['2a00::/63'] }, TypeError],
      [{ deniedRanges: ['10.0.0.1/8'] }, TypeError],
      [{ timeoutMs: 30001 }, RangeError],
      [{ maxHops: 21 }, RangeError],
      [{ userAgent: 'bot/1\r\nx-injected: 1' }, TypeError],
      [{ maxConcurrent: 0 }, RangeError],
      [{ lookup: dns.lookup, maxConcurrent: 4 }, RangeError],
      // Further refusals: dnsServers on port 0 (setServers() would abort the process), empty or
      // beside a lookup; bad or out-of-range ports; a label over 80 code points, an empty ca list,
      // incomplete timers and options that are not an object.
      [{ dnsServers: ['127.0.0.1:0'] }, TypeError],
      [{ dnsServers: [] }, TypeError],
      [{ dnsServers: ['127.0.0.1'], lookup: () => {} }, TypeError],
      [{ allowedPorts: [6000] }, TypeError],
      [{ allowedPorts: [65536] }, RangeError],
      [{ fixture: { address: '127.0.0.1', port: 0 } }, RangeError],
      [{ label: 'x'.repeat(81) }, TypeError],
      [{ fixture: FX, ca: [] }, TypeError],
      [{ timers: {} }, TypeError],
      [1, TypeError],
    ];
    for (const [options, type] of refused) {
      assert.throws(() => createNodeTransport(options), type, JSON.stringify(options));
    }
    const accepted = createNodeTransport({ lookup: dns.lookup, maxConcurrent: 3 });
    assert.deepEqual([accepted.kind, accepted.label, accepted.provenance],
      ['node', NETWORK_LABEL, 'network']);
    assert.equal(createNodeTransport({ allowedPorts: [] }).provenance, 'network');
    assert.equal(createNodeTransport({ label: 'x\u202e' }).label, 'x\ufffd');
  });

  // N29
  await check('N29', async () => {
    const calls = [];
    let answer = [];
    const t29 = createNodeTransport({ lookup: (hostname, options, callback) => {
      calls.push([hostname, options]);
      callback(null, answer);
    } });
    assert.deepEqual([t29.kind, t29.label, t29.provenance], ['node', NETWORK_LABEL, 'network']);
    const mark = contacts.length;
    const literal = 'http://127.0.0.1/';
    assert.deepEqual(plain(await run(t29, literal)),
      failedAt(literal, 'blocked_address', 'Address not allowed', [], false, 0, NETWORK));
    const port = 'http://example.test:8080/';
    assert.deepEqual(plain(await run(t29, port)),
      failedAt(port, 'blocked_port', 'Port not allowed', [], false, 0, NETWORK));
    assert.deepEqual(calls, [], 'no lookup for refused ports');
    const name = 'http://example.test/';
    answer = v4('10.1.2.3');
    assert.deepEqual(plain(await run(t29, name)),
      failedAt(name, 'blocked_address', 'Resolved address not allowed', [], false, 0, NETWORK));
    answer = [];
    assert.deepEqual(plain(await run(t29, name)),
      failedAt(name, 'dns_error', 'Name resolution failed', [], false, 0, NETWORK));
    assert.deepEqual(calls, [['example.test', LOOKUP_OPTIONS], ['example.test', LOOKUP_OPTIONS]]);
    assert.deepEqual(contacts.slice(mark), [], 'zero sockets');
  });

  // N30
  await check('N30', async () => {
    const clock = fakeClock();
    const held = [];
    let holdNext = true;
    const t30 = createNodeTransport({ fixture: FX, maxConcurrent: 1, timers: clock.timers,
      timeoutMs: 100, lookup: (hostname, options, callback) => {
        if (holdNext) {
          holdNext = false;
          held.push(callback);
          return;
        }
        callback(null, v4('127.0.0.1'));
      } });
    const options = { timers: clock.timers };
    const name = u('/to/name');
    const first = run(t30, name, {}, options);
    await until(() => held.length === 1, 'the held lookup');
    await clock.advance(100);
    const a = await first;
    assert.equal(a.durationMs, 100);
    assert.deepEqual(plain(a), failedAt(name, 'timeout', 'Timed out',
      [step(name, 302, nameTarget)], true, 1));
    assert.deepEqual(plain(await run(t30, u('/ok'), {}, options)),
      unavailableAt(u('/ok'), 'resolver_busy', 'Resolver busy'), 'the held lookup holds the slot');
    const mark = contacts.length;
    held[0](null, v4('127.0.0.1'));
    await delay(50);
    assert.deepEqual(contacts.slice(mark), [], 'no socket for A after the release');
    assert.deepEqual(plain(await run(t30, u('/ok'), {}, options)),
      resolvedAt(u('/ok'), u('/ok'), 200, []));
    assert.equal(clock.bound, 0, 'timers are called unbound');
    assert.equal(clock.pending, 0, 'no timer survives');
  });

  // N31
  await check('N31', async () => {
    let mark = fx.hits.length;
    let closed = events('slow:closed');
    const controller = new AbortController();
    const reason = new Error('stop');
    const pending = transport.resolve({ url: u('/slow'), maxHops: 10, timeoutMs: 10000,
      signal: controller.signal });
    await until(() => paths(mark).includes('/slow'), 'the /slow request');
    controller.abort(reason);
    await assert.rejects(pending, error => error === reason);
    await until(() => events('slow:closed') === closed + 1, 'the /slow close');
    await delay(50);
    assert.deepEqual(paths(mark), ['/slow'], 'no further hop');
    mark = fx.hits.length;
    closed = events('slow:closed');
    const caller = new AbortController();
    const via = run(transport, u('/to/slow'), { signal: caller.signal });
    await until(() => paths(mark).includes('/slow'), 'the second /slow request');
    caller.abort();
    const canceled = plain(await via);
    assert.deepEqual(canceled, outcomeOf(u('/to/slow'), { outcome: 'canceled', reason: 'aborted',
      requestSent: null }));
    await until(() => events('slow:closed') === closed + 1, 'the second /slow close');
    await delay(50);
    assert.deepEqual(paths(mark), ['/to/slow', '/slow'], 'no further hop');
  });

  // N32
  await check('N32', async () => {
    const out = await childJson('import');
    assert.equal(out.failure, null);
    assert.deepEqual(out.exports, ['createDestinationEndpoint', 'createNodeTransport']);
    assert.deepEqual(out.counts, {}, 'no socket, lookup, resolver, agent, server or timer');
    assert.deepEqual(out.after, out.before, 'no new active resource');
  }, 60000);

  // N33
  let handler = null;
  await check('N33', async () => {
    handler = await startHandler({ transport });
    const body = wireBody(u('/ok'));
    for (const method of ['GET', 'OPTIONS']) {
      const response = await send(handler.port, { method, headers: { origin: 'http://evil.test',
        'access-control-request-method': 'POST' } });
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.allow, 'POST');
      assertJsonHeaders(response);
      assert.equal(response.text, '{"error":"method_not_allowed"}');
    }
    const forbidden = [
      { ...JSON_TYPE, ...SAME_ORIGIN, host: 'evil.test' },
      { ...JSON_TYPE, 'sec-fetch-site': 'cross-site', origin: handler.origin },
      { ...JSON_TYPE, 'sec-fetch-site': 'same-site' },
      { ...JSON_TYPE, 'sec-fetch-site': 'none' },
      { ...JSON_TYPE, origin: `https://${handler.host}` },
      // A foreign Origin is refused even without Sec-Fetch-Site.
      { ...JSON_TYPE, origin: 'http://evil.test' },
    ];
    for (const headers of forbidden) {
      const response = await send(handler.port, { headers, body });
      assert.equal(response.status, 403, JSON.stringify(headers));
      assertJsonHeaders(response);
      assert.equal(response.text, '{"error":"forbidden"}');
    }
    const okWire = wireOf(u('/ok'), { outcome: 'resolved', finalUrl: u('/ok'), status: 200 });
    const admitted = await send(handler.port, { headers: { ...JSON_TYPE, ...SAME_ORIGIN,
      origin: handler.origin }, body });
    assert.equal(admitted.status, 200);
    assertJsonHeaders(admitted);
    assert.deepEqual(JSON.parse(admitted.text), okWire);
    const neither = await send(handler.port, { headers: JSON_TYPE, body });
    assert.equal(neither.status, 403);
    assert.equal(neither.text, '{"error":"forbidden"}');
    const lenient = await startHandler({ transport, allowMissingFetchMetadata: true });
    const accepted = await send(lenient.port, { headers: JSON_TYPE, body });
    assert.equal(accepted.status, 200);
    assert.deepEqual(JSON.parse(accepted.text), okWire);
  });

  // N34
  await check('N34', async () => {
    const h = handler ?? await startHandler({ transport });
    const body = wireBody(u('/ok'));
    const typed = type => ({ ...SAME_ORIGIN, 'content-type': type });
    for (const type of ['text/plain', 'text/plain;application/json']) {
      const response = await send(h.port, { headers: typed(type), body });
      assert.equal(response.status, 415, type);
      assertJsonHeaders(response);
      assert.equal(response.text, '{"error":"unsupported_media_type"}');
    }
    const upper = await send(h.port, { headers: typed('Application/JSON; charset=utf-8'), body });
    assert.equal(upper.status, 200);
    assert.equal(JSON.parse(upper.text).outcome, 'resolved');
    const declared = await send(h.port, { headers: { ...typed('application/json'),
      'content-length': '65537' }, start: req => req.flushHeaders() });
    assert.equal(declared.status, 413);
    assert.equal(declared.text, '{"error":"payload_too_large"}');
    assert.equal(declared.headers.connection, 'close');
    const chunked = await send(h.port, { headers: { ...typed('application/json'),
      'transfer-encoding': 'chunked' }, start: req => req.write(Buffer.alloc(65537, 0x20)) });
    assert.equal(chunked.status, 413);
    assert.equal(chunked.text, '{"error":"payload_too_large"}');
    const stalling = await startHandler({ transport, bodyTimeoutMs: 200 });
    const stalled = await send(stalling.port, { headers: { ...typed('application/json'),
      'content-length': '10' }, start: req => req.write('{') });
    assert.equal(stalled.status, 408);
    assertJsonHeaders(stalled);
    assert.equal(stalled.text, '{"error":"request_timeout"}');
    const parsed = await startHandler({ transport }, async req => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    });
    const consumed = await send(parsed.port, { headers: typed('application/json'), body });
    assert.equal(consumed.status, 500);
    assertJsonHeaders(consumed);
    assert.equal(consumed.text, '{"error":"body_already_read"}');
    for (const text of ['{', wireBody(u('/ok'), { version: 2 }), wireBody(u('/ok'), { extra: 1 }),
      wireBody('https://A.test/'), wireBody(u('/ok'), { maxHops: 21 }),
      wireBody(u('/ok'), { timeoutMs: 0 })]) {
      const response = await send(h.port, { headers: typed('application/json'), body: text });
      assert.equal(response.status, 400, text);
      assertJsonHeaders(response);
      assert.equal(response.text, '{"error":"bad_request"}');
    }
  });

  // N35
  await check('N35', async () => {
    const h = handler ?? await startHandler({ transport });
    const headers = { ...JSON_TYPE, ...SAME_ORIGIN };
    const chain = u('/chain/2');
    const response = await send(h.port, { headers, body: wireBody(chain) });
    assert.equal(response.status, 200);
    assertJsonHeaders(response);
    const wire = JSON.parse(response.text);
    assert.deepEqual(Object.keys(wire), WIRE_KEYS);
    assert.equal(wire.redirects.length, 2);
    for (const item of wire.redirects) assert.deepEqual(Object.keys(item), STEP_KEYS);
    assert.deepEqual(wire, wireOf(chain, { outcome: 'resolved', finalUrl: u('/chain/0'),
      status: 200, redirected: true, redirects: [step(chain, 302, u('/chain/1')),
        step(u('/chain/1'), 302, u('/chain/0'))] }));
    const boom = new Error('boom');
    const reported = [];
    const throwing = await startHandler({ reportError: error => reported.push(error),
      transport: { kind: 'custom', label: 'Throwing', provenance: 'network',
        resolve() { throw boom; } } });
    const failure = await send(throwing.port, { headers, body: wireBody(u('/ok')) });
    assert.equal(failure.status, 500);
    assertJsonHeaders(failure);
    assert.equal(failure.text, '{"error":"resolver_failed"}');
    assert.equal(reported.length, 1);
    assert.equal(reported[0], boom);
    const custom = await startHandler({ transport: { kind: 'custom', label: 'Custom',
      provenance: 'network', resolve: () => Promise.resolve({ outcome: 'failed',
        reason: 'connection_error', redirects: [], requestSent: null,
        detail: 'internal host db7' }) } });
    const free = await send(custom.port, { headers, body: wireBody(u('/ok')) });
    assert.equal(free.status, 200);
    assert.deepEqual(JSON.parse(free.text), wireOf(u('/ok'), { reason: 'connection_error',
      requestSent: null, provenance: 'network', detail: null }));
  });

  // N36
  await check('N36', async () => {
    let seen = null;
    let settled = null;
    const watching = await startHandler({ transport: { kind: 'custom', label: 'Watching',
      provenance: 'fixture', resolve(request) {
        seen = request.signal;
        const pending = transport.resolve(request);
        settled = pending.then(() => 'resolved', () => 'rejected');
        return pending;
      } } });
    const mark = fx.hits.length;
    const closed = events('slow:closed');
    const req = http.request({ host: '127.0.0.1', port: watching.port, method: 'POST',
      path: '/api/destination', headers: { ...JSON_TYPE, ...SAME_ORIGIN },
      agent: new http.Agent({ keepAlive: false }) });
    req.on('error', () => {});
    req.end(wireBody(u('/slow')));
    await until(() => paths(mark).includes('/slow'), 'the /slow request');
    req.destroy();
    await until(() => seen !== null && seen.aborted, 'the transport signal abort');
    await until(() => events('slow:closed') === closed + 1, 'the fixture close');
    assert.equal(await settled, 'rejected');
    await delay(50);
    assert.equal(watching.responses.length, 1);
    assert.deepEqual(watching.responses[0].ended, [], 'nothing is written');
    assert.equal(watching.responses[0].res.headersSent, false);
  });

  // N37
  await check('N37', async () => {
    const served = await startHandler({ transport, allowMissingFetchMetadata: true });
    const client = core.createEndpointTransport({ endpoint: `${served.origin}/api/destination`,
      label: 'Test endpoint', fetch: globalThis.fetch });
    const verifier = core.createDestinationVerifier({ transport: client });
    const url = u('/r/302');
    const snapshot = await verifier.resolve(url);
    assert.deepEqual(Object.keys(snapshot), SNAPSHOT_KEYS);
    const { startedAt, settledAt, durationMs, ...rest } = snapshot;
    assert.equal(Number.isInteger(startedAt) && Number.isInteger(settledAt) &&
      settledAt >= startedAt && Number.isInteger(durationMs) && durationMs >= 0, true);
    assert.deepEqual(rest, { encodedUrl: url, requestUrl: url, state: 'resolved', reason: null,
      attemptId: 1, transport: { kind: 'endpoint', label: 'Test endpoint' },
      provenance: 'fixture', requestSent: true, finalUrl: u('/ok'), status: 200,
      redirected: true, changed: true, redirects: [step(url, 302, u('/ok'))], hopCount: 1,
      detail: null });
    verifier.destroy();
    const written = JSON.parse(served.responses.at(-1).ended[0]);
    assert.deepEqual(Object.keys(written), WIRE_KEYS, 'no time, address or header field');
    assert.deepEqual(written, wireOf(url, { outcome: 'resolved', finalUrl: u('/ok'), status: 200,
      redirected: true, redirects: [step(url, 302, u('/ok'))] }));
    const networkServer = await startHandler({ transport: createNodeTransport(),
      allowMissingFetchMetadata: true });
    const ceiling = core.createEndpointTransport({
      endpoint: `${networkServer.origin}/api/destination`, label: 'Fixture endpoint',
      fetch: globalThis.fetch, provenance: 'fixture' });
    const mark = contacts.length;
    const target = 'http://10.0.0.1/';
    assert.deepEqual(plain(await run(ceiling, target)), outcomeOf(target, {
      outcome: 'unavailable', reason: 'endpoint_invalid_response',
      transport: { kind: 'endpoint', label: 'Fixture endpoint' }, requestSent: null,
      detail: 'Invalid endpoint response: provenance' }));
    assert.deepEqual(contacts.slice(mark).filter(item => item !== networkServer.contact), [],
      'zero sockets besides the endpoint itself');
    assert.deepEqual(JSON.parse(networkServer.responses.at(-1).ended[0]), wireOf(target, {
      reason: 'blocked_address', requestSent: false, provenance: 'network',
      detail: 'Address not allowed' }));
  });

  // N38
  await check('N38', async () => {
    const out = await childJson('redirect-connect');
    if (out.skipped !== undefined) {
      skipped.push(`N38 (${out.skipped})`);
      return;
    }
    assert.deepEqual(out.result, failedAt(out.url, 'blocked_address',
      'Resolved address not allowed', [], false, 0));
    assert.deepEqual(out.contacts, [endpointText('::1', out.recorderPort)]);
    assert.deepEqual(out.connections, [{ bytes: 0, closed: true }], 'zero request bytes');
    assert.equal(out.fixtureHits, 0);
  }, 60000);

  // N38 (TLS): the same redirect over TLS. The handshake starts at connect, before the check,
  // so the unvetted peer receives exactly one ClientHello (SNI for a name) and no request byte.
  await check('N38 (TLS)', async () => {
    const pair = selfSigned('/CN=fixture.test', 'DNS:fixture.test,IP:127.0.0.1');
    if (pair === null) {
      skipped.push('N38 (TLS) (openssl missing)');
      return;
    }
    const tlsEnv = mode => ({ env: { QRSCAN_REDIRECT_MODE: mode, QRSCAN_TLS_KEY: pair.key,
      QRSCAN_TLS_CERT: pair.cert } });
    for (const [mode, host, serverName] of [['https-literal', '127.0.0.1', null],
      ['https-name', 'fixture.test', 'fixture.test']]) {
      const out = await childJson('redirect-connect', tlsEnv(mode));
      if (out.skipped !== undefined) {
        skipped.push(`N38 (TLS) (${out.skipped})`);
        return;
      }
      assert.equal(out.url, `https://${host}:${out.fixturePort}/ok`, mode);
      assert.deepEqual(out.result, failedAt(out.url, 'blocked_address',
        'Resolved address not allowed', [], false, 0), mode);
      assert.deepEqual(out.contacts, [endpointText('::1', out.recorderPort)], mode);
      assert.deepEqual(out.connections, [{ closed: true,
        records: [{ type: 22, handshake: 1, serverName }], trailing: 0 }],
      `${mode}: one ClientHello record, no application data`);
      assert.equal(out.fixtureHits, 0, mode);
      assert.equal(out.lookups, 0, `${mode}: the redirected connect never asked the lookup`);
    }
    // A TLS peer valid for the name: without the check, the request would complete there.
    const out = await childJson('redirect-connect', tlsEnv('https-peer'));
    assert.equal(out.url, `https://fixture.test:${out.fixturePort}/ok`);
    assert.deepEqual(out.result, failedAt(out.url, 'blocked_address',
      'Resolved address not allowed', [], false, 0));
    assert.deepEqual(out.contacts, [endpointText('::1', out.peerPort)]);
    assert.equal(out.peerHits, 0, 'the unvetted TLS peer received no request');
    assert.equal(out.fixtureHits, 0);
    assert.equal(out.lookups, 0);
  }, 60000);

  // N39
  await check('N39', async () => {
    for (const runtime of ['bun', 'deno']) {
      const mark = fx.hits.length;
      const out = await childJson(runtime, { env: { QRSCAN_FX_PORT: String(A) } });
      assert.deepEqual(out.result, unavailableAt(u('/ok'), 'transport_unsupported',
        'Runtime not supported'), runtime);
      assert.deepEqual(out.contacts, [], `${runtime}: zero sockets`);
      assert.deepEqual(out.counts, { lookups: 0, injected: 0, resolvers: 0 }, runtime);
      assert.equal(fx.hits.length, mark, `${runtime}: no request reached the fixture`);
    }
  }, 60000);

  // N40
  await check('N40', async () => {
    const hosts = ['127.0.0.1:5273'];
    const custom = { kind: 'custom', label: 'Custom', provenance: 'network',
      resolve: () => new Promise(() => {}) };
    assert.throws(() => createDestinationEndpoint({ allowedHosts: hosts,
      transport: core.createFetchTransport({ scope: 'network' }) }), TypeError);
    assert.throws(() => createDestinationEndpoint({ allowedHosts: hosts,
      transport: core.createEndpointTransport({ endpoint: 'http://127.0.0.1:9/api',
        label: 'Endpoint' }) }), TypeError);
    assert.equal(typeof createDestinationEndpoint({ allowedHosts: hosts,
      transport: core.createPreparedTransport([]) }), 'function');
    assert.equal(typeof createDestinationEndpoint({ allowedHosts: hosts, transport: custom }),
      'function');
    assert.throws(() => createDestinationEndpoint({ allowedHosts: new Set(hosts), transport }),
      TypeError);
    // Further creation checks: a missing or malformed option is a TypeError, and a number out
    // of range is a RangeError.
    for (const [options, type] of [[undefined, TypeError], [{ allowedHosts: hosts }, TypeError],
      [{ allowedHosts: [], transport }, TypeError], [{ allowedHosts: [''], transport }, TypeError],
      [{ allowedHosts: hosts, transport, publicScheme: 'ftp' }, TypeError],
      [{ allowedHosts: hosts, transport, allowedOrigins: ['http://a.test/'] }, TypeError],
      [{ allowedHosts: hosts, transport, maxBodyBytes: 255 }, RangeError],
      [{ allowedHosts: hosts, transport, bodyTimeoutMs: 60001 }, RangeError],
      [{ allowedHosts: hosts, transport, revealNameErrors: 1 }, TypeError],
      [{ allowedHosts: hosts, transport, reportError: 1 }, TypeError],
      [{ allowedHosts: hosts, transport: { ...custom, kind: 'other' } }, TypeError]]) {
      assert.throws(() => createDestinationEndpoint(options), type, JSON.stringify(options));
    }
  });

  // N41
  await check('N41', async () => {
    let failing = false;
    const t41 = createNodeTransport({ fixture: FX, lookup: (hostname, options, callback) => {
      if (failing) callback(lookupError('ENOTFOUND'), []);
      else callback(null, v4('10.0.0.1'));
    } });
    const merged = await startHandler({ transport: t41, allowMissingFetchMetadata: true });
    const revealing = await startHandler({ transport: t41, allowMissingFetchMetadata: true,
      revealNameErrors: true });
    const ask = async (h, url) => {
      const response = await send(h.port, { headers: JSON_TYPE, body: wireBody(url) });
      assert.equal(response.status, 200);
      const wire = JSON.parse(response.text);
      assert.deepEqual(Object.keys(wire), WIRE_KEYS);
      return wire;
    };
    const name = u('/to/name');
    const chain = [step(name, 302, nameTarget)];
    const unusable = wireOf(name, { reason: 'name_unusable', detail: 'Name not usable',
      redirects: chain, redirected: false });
    failing = false;
    assert.deepEqual(await ask(merged, name), unusable);
    failing = true;
    assert.deepEqual(await ask(merged, name), unusable);
    const priv = u('/to/private');
    assert.deepEqual(await ask(merged, priv), wireOf(priv, { reason: 'blocked_address',
      detail: 'Address not allowed', redirects: [step(priv, 302, 'http://10.0.0.1/')] }));
    failing = false;
    assert.deepEqual(await ask(revealing, name), wireOf(name, { reason: 'blocked_address',
      detail: 'Resolved address not allowed', redirects: chain, redirected: false }));
    failing = true;
    assert.deepEqual(await ask(revealing, name), wireOf(name, { reason: 'dns_error',
      detail: 'Name resolution failed (ENOTFOUND)', redirects: chain, redirected: true }));
  });

  // N42
  await check('N42', async () => {
    const signal = new AbortController().signal;
    const before = fx.hits.length;
    assert.throws(() => transport.resolve({ url: u('/ok'), signal }), RangeError);
    assert.throws(() => transport.resolve({ url: 'https://A.test/', maxHops: 1, timeoutMs: 1000,
      signal }), TypeError);
    assert.throws(() => transport.resolve({ url: u('/ok'), maxHops: 2.5, timeoutMs: 1000,
      signal }), RangeError);
    assert.throws(() => transport.resolve({ url: u('/ok'), maxHops: 1, timeoutMs: 1000 }),
      TypeError);
    const aborted = new AbortController();
    const reason = new Error('already aborted');
    aborted.abort(reason);
    await assert.rejects(transport.resolve({ url: u('/ok'), maxHops: 1, timeoutMs: 1000,
      signal: aborted.signal }), error => error === reason);
    assert.equal(fx.hits.length, before, 'invalid requests send nothing');
    const mark = contacts.length;
    const zero = 'http://127.0.0.1:0/';
    assert.deepEqual(plain(await run(transport, zero)),
      failedAt(zero, 'blocked_port', 'Port not allowed', [], false, 0));
    assert.deepEqual(contacts.slice(mark), [], 'zero sockets: one computed port value');
  });

  // N42 (throwing signal): a request.signal whose `aborted`, `addEventListener` or
  // `removeEventListener` read throws is refused as the prepared transport refuses it: a
  // synchronous TypeError whose cause is what the signal threw. Nothing starts: no lookup,
  // timer, socket or request. With a real signal, the same transport then resolves the name.
  await check('N42 (throwing signal)', async () => {
    const calls = [];
    const clock = fakeClock();
    const timers = {};
    for (const [name, member] of Object.entries(clock.timers)) {
      timers[name] = (...args) => {
        calls.push(name);
        return member(...args);
      };
    }
    const t42 = createNodeTransport({ fixture: FX, maxConcurrent: 1, timers,
      lookup: (hostname, options, callback) => {
        calls.push(`lookup ${hostname}`);
        callback(null, v4('127.0.0.1'));
      } });
    const prepared = core.createPreparedTransport([{ url: nameTarget, result: 'pending' }]);
    const request = signal => ({ url: nameTarget, maxHops: 1, timeoutMs: 1000, signal });
    // What resolve() threw, as data: the cause by identity, then its property attributes.
    const refusalOf = (target, signal, thrown) => {
      try {
        target.resolve(request(signal));
      } catch (error) {
        const { value, ...attributes } = Object.getOwnPropertyDescriptor(error, 'cause') ?? {};
        return { typeError: error instanceof TypeError, message: error.message,
          causeIsThrown: value === thrown, attributes };
      }
      return 'no throw';
    };
    const refused = { typeError: true, message: 'request.signal must be an AbortSignal.',
      causeIsThrown: true, attributes: { writable: true, enumerable: false, configurable: true } };
    const members = ['aborted', 'addEventListener', 'removeEventListener'];
    const before = fx.hits.length;
    const mark = contacts.length;
    // One row per member whose read throws: the prepared, then the Node transport's refusal.
    const rows = members.map(member => {
      const thrown = new Error(`${member} read broke`);
      const signal = { aborted: false, addEventListener() {}, removeEventListener() {} };
      Object.defineProperty(signal, member, { get() { throw thrown; } });
      return [member, refusalOf(prepared, signal, thrown), refusalOf(t42, signal, thrown)];
    });
    assert.deepEqual(rows, members.map(member => [member, refused, refused]));
    assert.deepEqual(calls, [], 'no lookup and no timers call');
    assert.equal(fx.hits.length, before, 'no request reached the fixture');
    assert.deepEqual(contacts.slice(mark), [], 'zero sockets');
    // Control: with a real signal, the same transport finds its single slot free, looks the
    // name up under an armed deadline and connects, so the zeros above are not blind spots.
    assert.deepEqual(await t42.resolve(request(new AbortController().signal)),
      { outcome: 'resolved', finalUrl: nameTarget, status: 200, redirects: [],
        redirected: false, requestSent: true });
    assert.deepEqual(calls, ['setTimeout', 'lookup fixture.test', 'clearTimeout']);
    assert.equal(clock.pending, 0, 'the deadline was cleared');
    assert.equal(fx.hits.length, before + 1);
    assert.deepEqual(contacts.slice(mark), [FX_CONTACT]);
  });

  // N43
  await check('N43', async () => {
    const dnsFixture = await startDnsFixture();
    cleanup.push(() => dnsFixture.close());
    const clock = fakeClock();
    const t43 = createNodeTransport({ dnsServers: [`127.0.0.1:${dnsFixture.port}`],
      timers: clock.timers, maxConcurrent: 1 });
    const go = (url, request = {}) => run(t43, url, request, { timers: clock.timers });
    const mark = contacts.length;
    const priv = 'http://private.test/';
    const blocked = failedAt(priv, 'blocked_address', 'Resolved address not allowed', [], false,
      0, NETWORK);
    assert.deepEqual(plain(await go(priv)), blocked);
    const missing = 'http://nx.test/';
    assert.deepEqual(plain(await go(missing)), failedAt(missing, 'dns_error',
      'Name resolution failed (ENOTFOUND)', [], false, 0, NETWORK));
    const queries = dnsFixture.queries.length;
    const both = 'http://dns64.test/';
    assert.deepEqual(plain(await go(both)), failedAt(both, 'blocked_address',
      'Resolved address not allowed', [], false, 0, NETWORK));
    assert.deepEqual(dnsFixture.queries.slice(queries).map(query => `${query.name} ${query.type}`)
      .sort(), ['dns64.test A', 'dns64.test AAAA']);
    const hang = 'http://hang.test/';
    const pending = go(hang, { timeoutMs: 100 });
    await until(() => dnsFixture.queries.some(query => query.name === 'hang.test'),
      'the hang.test queries');
    await clock.advance(100);
    const timedOut = await pending;
    assert.equal(timedOut.durationMs, 100);
    assert.deepEqual(plain(timedOut), failedAt(hang, 'timeout', 'Timed out', [], false, 0,
      NETWORK));
    assert.deepEqual(plain(await go(priv)), blocked, 'the next request is not busy');
    assert.deepEqual(contacts.slice(mark), [], 'zero TCP sockets');
    assert.equal(clock.bound, 0, 'timers are called unbound');
  });

  // N43 (mixed answers): the c-ares path merges both families before the whole-answer rule.
  // Opt-in fixture rows pair a refused A with an allowed AAAA, at once or with the A 100 ms late.
  // The child withholds every lookup reply from net, so even a wrong merge reaches no address.
  await check('N43 (mixed answers)', async () => {
    const out = await childJson('mixed-answers');
    const names = ['dns64.test', 'nsp64.test', 'slowa64.test'];
    for (const name of names) {
      const url = `http://${name}/`;
      assert.deepEqual(out.results[name], failedAt(url, 'blocked_address',
        'Resolved address not allowed', [], false, 0, NETWORK), name);
      assert.deepEqual(out.queries[name], [`${name} A`, `${name} AAAA`], name);
    }
    assert.deepEqual(out.replies, names.map(name =>
      ({ name, error: 'EDESTINATIONPOLICY', addresses: null })), 'net never got an address');
    assert.deepEqual(out.contacts, [], 'zero TCP sockets');
    assert.deepEqual(out.trapped, { lookup: 0, promisesLookup: 0 }, 'no system resolver');
  }, 60000);

  // N44
  await check('N44', async () => {
    const answering = answer => (hostname, options, callback) => callback(null, answer);
    const denied = createNodeTransport({ fixture: FX, deniedRanges: ['127.0.0.1/32'],
      lookup: answering(v4('127.0.0.1')) });
    let mark = contacts.length;
    assert.deepEqual(plain(await run(denied, u('/ok'))),
      failedAt(u('/ok'), 'blocked_address', 'Address not allowed', [], false, 0));
    // deniedRanges refuses the literal fixture at hop 0, so the lookup case starts on a name.
    const named = `http://fixture.test:${A}/to/name`;
    assert.deepEqual(plain(await run(denied, named)),
      failedAt(named, 'blocked_address', 'Resolved address not allowed', [], false, 0));
    assert.deepEqual(contacts.slice(mark), [], 'zero sockets');
    const nat = [{ address: '2a00:1:2:3:a9:fea9:fe00:0', family: 6 }];
    const prefixes = ['2a00:1:2:3::/64'];
    assert.equal(core.classifyAddress(nat[0].address, { translationPrefixes: prefixes })
      .embedded.address, '169.254.169.254');
    const name = u('/to/name');
    const chain = [step(name, 302, nameTarget)];
    mark = contacts.length;
    assert.deepEqual(plain(await run(createNodeTransport({ fixture: FX, lookup: answering(nat) }),
      name)), failedAt(name, 'left_fixture', 'Left the fixture scope', chain, true, 0));
    assert.deepEqual(contacts.slice(mark), [FX_CONTACT], 'the public answer is never contacted');
    mark = contacts.length;
    assert.deepEqual(plain(await run(createNodeTransport({ fixture: FX, lookup: answering(nat),
      translationPrefixes: prefixes }), name)), failedAt(name, 'blocked_address',
      'Resolved address not allowed', chain, true, 0));
    assert.deepEqual(contacts.slice(mark), [FX_CONTACT]);
  });

  for (const close of cleanup.reverse()) await close();
  await flush();
  await check('recorder', async () => {
    assert.deepEqual(contacts.filter(item => !allowed.has(item)), [],
      'every contact was a loopback fixture');
    assert.deepEqual(unhandled, [], 'no unhandled rejection');
  });
  if (skipped.length > 0) console.log(`SKIP ${skipped.join(', ')}`);
  if (failures.length > 0) {
    console.log(`FAIL destination-node: ${failures.join(' ')}`);
    nodeProcess.exitCode = 1;
    return;
  }
  console.log(`PASS destination-node: N1..N44 on Node ${nodeProcess.versions.node}, ` +
    `${contacts.length} loopback contacts, none elsewhere`);
}

// --------------------------------------------------------------------- child: import (N32)

async function importWitness() {
  const counts = {};
  const bump = name => {
    counts[name] = (counts[name] ?? 0) + 1;
  };
  const restore = [];
  const wrapFunction = (target, key, name) => {
    const original = target[key];
    restore.push(() => {
      target[key] = original;
    });
    target[key] = function wrapped(...args) {
      bump(name);
      return original.apply(this, args);
    };
  };
  const wrapClass = (target, key, name) => {
    const Original = target[key];
    restore.push(() => {
      target[key] = Original;
    });
    target[key] = class extends Original {
      constructor(...args) {
        bump(name);
        super(...args);
      }
    };
  };
  wrapFunction(dns, 'lookup', 'dns.lookup');
  wrapFunction(dns.promises, 'lookup', 'dns.promises.lookup');
  wrapClass(dns, 'Resolver', 'dns.Resolver');
  wrapClass(dns.promises, 'Resolver', 'dns.promises.Resolver');
  wrapClass(http, 'Agent', 'http.Agent');
  wrapClass(https, 'Agent', 'https.Agent');
  for (const [lib, prefix] of [[http, 'http'], [https, 'https']]) {
    for (const key of ['createServer', 'request', 'get']) {
      wrapFunction(lib, key, `${prefix}.${key}`);
    }
  }
  for (const key of ['connect', 'createConnection', 'createServer']) {
    wrapFunction(net, key, `net.${key}`);
  }
  for (const key of ['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask']) {
    wrapFunction(globalThis, key, key);
  }
  const onSocket = () => bump('net.client.socket');
  socketChannel.subscribe(onSocket);
  const before = nodeProcess.getActiveResourcesInfo();
  let exports = null;
  let failure = null;
  try {
    exports = Object.keys(await import(NODE_MODULE)).sort();
  } catch (error) {
    failure = String(error);
  }
  const after = nodeProcess.getActiveResourcesInfo();
  for (const undo of restore.reverse()) undo();
  socketChannel.unsubscribe(onSocket);
  write({ counts, exports, failure, before, after });
}

// --------------------------------------------------------------- child: flags (N23, N24)

async function flagsChild() {
  const contacts = installRecorder();
  const core = await import(CORE_MODULE);
  const { createNodeTransport } = await import(NODE_MODULE);
  const port = Number(nodeProcess.env.QRSCAN_FX_PORT);
  const transport = createNodeTransport({ fixture: { address: '127.0.0.1', port } });
  const results = [];
  for (const path of JSON.parse(nodeProcess.env.QRSCAN_FX_PATHS)) {
    results.push(plain(await core.resolveDestination(transport,
      { url: `http://127.0.0.1:${port}${path}` })));
  }
  const flag = nodeProcess.env.QRSCAN_FLAG;
  const options = (nodeProcess.env.NODE_OPTIONS ?? '').split(/\s+/);
  write({ results, contacts, maxHeaderSize: http.maxHeaderSize,
    flagSeen: nodeProcess.execArgv.includes(flag) || options.includes(flag) });
}

// ------------------------------------------------------------------------ child: proxy (N26)

async function proxyChild() {
  const contacts = installRecorder();
  const core = await import(CORE_MODULE);
  const { createNodeTransport } = await import(NODE_MODULE);
  let spyUses = 0;
  class SpyAgent extends http.Agent {
    addRequest(...args) {
      spyUses += 1;
      return super.addRequest(...args);
    }
  }
  class SpyHttpsAgent extends https.Agent {
    addRequest(...args) {
      spyUses += 1;
      return super.addRequest(...args);
    }
  }
  // Global agents that honour the proxy environment, as an application could install.
  http.globalAgent = new SpyAgent({ proxyEnv: nodeProcess.env });
  https.globalAgent = new SpyHttpsAgent({ proxyEnv: nodeProcess.env });
  const port = Number(nodeProcess.env.QRSCAN_FX_PORT);
  const transport = createNodeTransport({ fixture: { address: '127.0.0.1', port } });
  const result = plain(await core.resolveDestination(transport,
    { url: `http://127.0.0.1:${port}/ok` }));
  const resolverContacts = contacts.slice();
  const resolverSpyUses = spyUses;
  // The control: the same environment through the global agent reaches the proxy. Its lookup
  // refuses, so a missing proxy can never become a real DNS query.
  const control = await new Promise(resolve => {
    const refuse = (hostname, options, callback) =>
      callback(Object.assign(new Error('refused'), { code: 'EREFUSEDLOOKUP' }));
    const req = http.get('http://proxied.test/', { lookup: refuse }, res => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', error => resolve({ error: error.code ?? String(error) }));
  });
  write({ result, resolverContacts, resolverSpyUses, control,
    controlContacts: contacts.slice(resolverContacts.length), spyUses });
}

// ---------------------------------------------------------------------- child: TLS env (N27)

async function tlsEnvChild() {
  const contacts = installRecorder();
  const core = await import(CORE_MODULE);
  const { createNodeTransport } = await import(NODE_MODULE);
  const port = Number(nodeProcess.env.QRSCAN_FX_PORT);
  const transport = createNodeTransport({ fixture: { address: '127.0.0.1', port } });
  const result = plain(await core.resolveDestination(transport,
    { url: `https://127.0.0.1:${port}/ok` }));
  write({ result, contacts,
    environmentDisablesChecks: nodeProcess.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' });
}

// --------------------------------------------------------- child: redirected connect (N38)

// The ClientHello's server_name (RFC 8446 §4.1.2, RFC 6066 §3), or null without one.
function serverNameOf(hello) {
  let at = 4 + 2 + 32;
  at += 1 + hello[at];
  at += 2 + hello.readUInt16BE(at);
  at += 1 + hello[at];
  const end = at + 2 + hello.readUInt16BE(at);
  at += 2;
  while (at + 4 <= end) {
    if (hello.readUInt16BE(at) === 0) {
      return hello.toString('latin1', at + 9, at + 9 + hello.readUInt16BE(at + 7));
    }
    at += 4 + hello.readUInt16BE(at + 2);
  }
  return null;
}

// The TLS records of captured bytes: content type, handshake type and server name.
function tlsRecords(data) {
  const records = [];
  let at = 0;
  while (at + 5 <= data.length && at + 5 + data.readUInt16BE(at + 3) <= data.length) {
    const type = data[at];
    const body = data.subarray(at + 5, at + 5 + data.readUInt16BE(at + 3));
    const handshake = type === 22 ? body[0] : null;
    records.push({ type, handshake, serverName: handshake === 1 ? serverNameOf(body) : null });
    at += 5 + body.length;
  }
  return { records, trailing: data.length - at };
}

// QRSCAN_REDIRECT_MODE: 'http' (default), or over TLS 'https-literal' and 'https-name' to the
// recorder, 'https-peer' to a TLS fixture on [::1] that is valid for the name.
async function redirectConnectChild() {
  const mode = nodeProcess.env.QRSCAN_REDIRECT_MODE ?? 'http';
  const tls = mode === 'http' ? null
    : { key: nodeProcess.env.QRSCAN_TLS_KEY, cert: nodeProcess.env.QRSCAN_TLS_CERT };
  let recorder;
  let peer = null;
  try {
    recorder = await startTcpRecorder({ address: '::1', capture: tls !== null });
    if (mode === 'https-peer') peer = await startFixture({ address: '::1', tls });
  } catch (error) {
    write({ skipped: `no ::1 (${error.code ?? error})` });
    return;
  }
  const fx = await startFixture(tls === null ? {} : { tls });
  const target = peer === null ? recorder.port : peer.port;
  const contacts = installRecorder();
  const core = await import(CORE_MODULE);
  const { createNodeTransport } = await import(NODE_MODULE);
  const original = net.Socket.prototype.connect;
  // A runtime that ignores `lookup`: the fixture connection lands on [::1] instead.
  net.Socket.prototype.connect = function connect(...args) {
    const options = Array.isArray(args[0]) ? args[0][0] : args[0];
    if (isObject(options) && options.port === fx.port) {
      options.host = '::1';
      options.port = target;
    }
    return original.apply(this, args);
  };
  const fixture = { address: '127.0.0.1', port: fx.port };
  if (tls === null) {
    const url = fx.url('/ok');
    const transport = createNodeTransport({ fixture });
    const result = plain(await core.resolveDestination(transport, { url }));
    net.Socket.prototype.connect = original;
    await until(() => recorder.connections.length === 1 && recorder.connections[0].closed,
      'the [::1] close');
    write({ result, url, contacts, connections: recorder.connections,
      recorderPort: recorder.port, fixtureHits: fx.hits.length });
  } else {
    let lookups = 0;
    const lookup = (hostname, options, callback) => {
      lookups += 1;
      callback(null, v4('127.0.0.1'));
    };
    const host = mode === 'https-literal' ? '127.0.0.1' : 'fixture.test';
    const url = `https://${host}:${fx.port}/ok`;
    const transport = createNodeTransport({ fixture, ca: tls.cert, lookup });
    const result = plain(await core.resolveDestination(transport, { url }));
    net.Socket.prototype.connect = original;
    if (peer === null) {
      await until(() => recorder.connections.length === 1 && recorder.connections[0].closed,
        'the [::1] close');
    }
    const connections = recorder.connections
      .map(({ closed, data }) => ({ closed, ...tlsRecords(data) }));
    write({ result, url, contacts, lookups, connections, fixturePort: fx.port,
      recorderPort: recorder.port, peerPort: peer === null ? null : peer.port,
      peerHits: peer === null ? null : peer.hits.length, fixtureHits: fx.hits.length });
    if (peer !== null) await peer.close();
  }
  await fx.close();
  await recorder.close();
}

// -------------------------------------------------------- child: mixed c-ares answers (N43)

// The DNS fixture's opt-in rows answer an allowed AAAA. Nothing can reach it: every reply of the
// transport's lookup is recorded and withheld from net, a direct connect to a non-loopback
// literal throws, and the system resolver is trapped once the fixture is bound.
async function mixedAnswersChild() {
  const contacts = installRecorder();
  const core = await import(CORE_MODULE);
  const { createNodeTransport } = await import(NODE_MODULE);
  const dnsFixture = await startDnsFixture({ mixed: true });
  const trapped = { lookup: 0, promisesLookup: 0 };
  const lookup = dns.lookup;
  const promisesLookup = dns.promises.lookup;
  dns.lookup = () => {
    trapped.lookup += 1;
    throw new Error('dns.lookup is trapped');
  };
  dns.promises.lookup = () => {
    trapped.promisesLookup += 1;
    throw new Error('dns.promises.lookup is trapped');
  };
  const replies = [];
  const original = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function connect(...args) {
    const options = Array.isArray(args[0]) ? args[0][0] : args[0];
    if (isObject(options) && typeof options.lookup === 'function') {
      const guarded = options.lookup;
      options.lookup = (name, lookupOptions, callback) => guarded(name, lookupOptions,
        (error, addresses) => {
          const refused = isObject(error);
          replies.push({ name, error: refused ? error.code : null,
            addresses: refused ? null : addresses });
          callback(refused ? error
            : Object.assign(new Error('withheld by the test'), { code: 'EWITHHELD' }));
        });
    } else if (isObject(options) && net.isIP(String(options.host)) !== 0
      && options.host !== '127.0.0.1' && options.host !== '::1') {
      throw new Error(`refused a direct connect to ${options.host}`);
    }
    return original.apply(this, args);
  };
  const transport = createNodeTransport({ dnsServers: [`127.0.0.1:${dnsFixture.port}`] });
  const results = {};
  const queries = {};
  for (const name of ['dns64.test', 'nsp64.test', 'slowa64.test']) {
    const mark = dnsFixture.queries.length;
    results[name] = plain(await core.resolveDestination(transport, { url: `http://${name}/` }));
    queries[name] = dnsFixture.queries.slice(mark).map(query => `${query.name} ${query.type}`)
      .sort();
  }
  net.Socket.prototype.connect = original;
  dns.lookup = lookup;
  dns.promises.lookup = promisesLookup;
  await dnsFixture.close();
  write({ results, queries, replies, contacts, trapped });
}

// -------------------------------------------------------------- child: Bun and Deno (N39)

async function runtimeChild(runtime) {
  if (runtime === 'bun') nodeProcess.versions.bun = '1.2.0';
  else globalThis.Deno = {};
  const contacts = installRecorder();
  const counts = { lookups: 0, injected: 0, resolvers: 0 };
  const lookup = dns.lookup;
  dns.lookup = (...args) => {
    counts.lookups += 1;
    return lookup(...args);
  };
  const Resolver = dns.promises.Resolver;
  dns.promises.Resolver = class extends Resolver {
    constructor(...args) {
      counts.resolvers += 1;
      super(...args);
    }
  };
  const core = await import(CORE_MODULE);
  const { createNodeTransport } = await import(NODE_MODULE);
  const port = Number(nodeProcess.env.QRSCAN_FX_PORT);
  const transport = createNodeTransport({ fixture: { address: '127.0.0.1', port },
    lookup: () => {
      counts.injected += 1;
    } });
  const result = plain(await core.resolveDestination(transport,
    { url: `http://127.0.0.1:${port}/ok` }));
  write({ result, contacts, counts });
}

if (CHILD === undefined) await parent();
else if (CHILD === 'import') await importWitness();
else if (CHILD === 'flags') await flagsChild();
else if (CHILD === 'proxy') await proxyChild();
else if (CHILD === 'tls-env') await tlsEnvChild();
else if (CHILD === 'redirect-connect') await redirectConnectChild();
else if (CHILD === 'mixed-answers') await mixedAnswersChild();
else if (CHILD === 'bun' || CHILD === 'deno') await runtimeChild(CHILD);
else throw new Error(`unknown child ${CHILD}`);
