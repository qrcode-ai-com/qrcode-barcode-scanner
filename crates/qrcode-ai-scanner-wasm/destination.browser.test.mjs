// destination.browser.test.mjs · browser suite of ./destination: the module in real browsers
// through Playwright, against the loopback servers of ./destination-fixtures.mjs only (a test
// helper next to this file; it is never packed). The case labels B1..B17 are local to this file
// and to the report it writes.
//
// Environment:
//   QRSCAN_DESTINATION_PACKAGE  folder with destination.js and, when present, destination-node.js
//                               and the packed scanner (default: the folder of this file)
//   QRSCAN_PLAYWRIGHT_MODULE    playwright module URL or specifier (default 'playwright')
//   QRSCAN_VITE_MODULE          vite module URL or specifier (default 'vite')
//   QRSCAN_BROWSER_CHANNEL      optional Chromium channel
//   QRSCAN_TEST_FIREFOX=1       B14: B2..B8, B15 and B16 again in Firefox
//   QRSCAN_NO_SIMD_BROWSER      B17: executable of the SIMD-disabled Chromium 978106
//   CI=true                     a required case whose prerequisites are missing fails instead of
//                               skipping; B11 (no [::1] on the host), B14 and B17 (opt-in
//                               runtimes) are not required and stay recorded as not run
// Usage: node destination.browser.test.mjs [report.json]
//
// No request may leave loopback. Chromium runs behind a recording proxy that refuses every
// request, redirect hops included, except to the 127.0.0.1 and [::1] fixtures. The main context
// also aborts any other first request (Playwright routes never see redirect hops). Every browser
// request and every Node client socket is logged and checked. One control request per guard,
// addressed to 127.0.0.2, proves each guard live; neither control reaches 127.0.0.2.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { subscribe, unsubscribe } from 'node:diagnostics_channel';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, rmdirSync, symlinkSync,
  unlinkSync, writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PACKAGE_NAME = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
const PACKAGE_DIR = resolve(process.env.QRSCAN_DESTINATION_PACKAGE
  ?? fileURLToPath(new URL('./', import.meta.url)));
const IN_CI = process.env.CI === 'true';
const REPORT_PATH = process.argv[2] ?? null;
const FIXTURE_LABEL = 'Local fixture (this browser)';
const NODE_LABEL = 'Local fixture (Node resolver)';
const BOT_AGENT = 'qrcode-barcode-scanner-destination-bot/1';
const UNOBSERVED = 'Intermediate redirects not observed';
const NETWORK_ERROR = 'Browser network error without detail';
const EXPORTS = [
  'DESTINATION_POLICY', 'classifyAddress', 'classifyHost', 'createDestinationSelection',
  'createDestinationVerifier', 'createEndpointTransport', 'createFetchTransport',
  'createPreparedTransport', 'destinationCandidate', 'resolveDestination',
];
const RESOLUTION_KEYS = [
  'outcome', 'reason', 'url', 'transport', 'provenance', 'requestSent', 'finalUrl', 'status',
  'redirected', 'changed', 'redirects', 'hopCount', 'detail', 'durationMs',
];
const SNAPSHOT_KEYS = [
  'encodedUrl', 'requestUrl', 'state', 'reason', 'attemptId', 'transport', 'provenance',
  'requestSent', 'finalUrl', 'status', 'redirected', 'changed', 'redirects', 'hopCount',
  'startedAt', 'settledAt', 'durationMs', 'detail',
];
const WIRE_KEYS = [
  'detail', 'finalUrl', 'outcome', 'provenance', 'reason', 'redirected', 'redirects',
  'requestSent', 'status', 'url', 'version',
];
const FETCH_INIT_KEYS = [
  'method', 'mode', 'credentials', 'cache', 'redirect', 'referrer', 'referrerPolicy', 'signal',
];
// B9 routes: [path, final path, status] asserted in both resolvers; the others only recorded.
const B9_ASSERTED = [
  ['/ok', '/ok', 200], ['/status/404', '/status/404', 404], ['/r/301', '/ok', 200],
  ['/r/302', '/ok', 200], ['/r/303', '/ok', 200], ['/r/307', '/ok', 200], ['/r/308', '/ok', 200],
  ['/chain/3', '/chain/0', 200], ['/deep/relative', '/ok?x=1', 200],
  ['/utf8-location', '/caf%C3%A9', 200], ['/early-hints', '/ok', 200], ['/dup-same', '/ok', 200],
];
const B9_RECORDED = ['/no-location', '/empty-location', '/dup-distinct'];
const CHROMIUM_CASES = [
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B15', 'B16',
];
const B14_CASES = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B15', 'B16'];
const B17_CASES = ['B1', 'B2', 'B3', 'B13'];
// (module (func (result v128) (v128.const i32x4 0 0 0 0))): valid only where SIMD is enabled.
const SIMD_PROBE = [
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 22, 1, 20, 0, 253, 12,
  ...new Array(16).fill(0), 11,
];

// ---- Modules under test and tools -----------------------------------------------------------

const fileHref = file => pathToFileURL(join(PACKAGE_DIR, file)).href;
const core = await import(fileHref('destination.js'));
const nodeSide = existsSync(join(PACKAGE_DIR, 'destination-node.js'))
  ? await import(fileHref('destination-node.js')) : null;
const playwrightModule = await import(process.env.QRSCAN_PLAYWRIGHT_MODULE ?? 'playwright');
const playwright = playwrightModule.default ?? playwrightModule;
const viteModule = await import(process.env.QRSCAN_VITE_MODULE ?? 'vite');
const vite = typeof viteModule.build === 'function' ? viteModule : viteModule.default;
const { startFixture, startFixturePair } = await import(
  new URL('./destination-fixtures.mjs', import.meta.url).href);
const SCANNER_FILES = ['auto.js', 'qrcode-barcode-scanner.js', 'qrcode-barcode-scanner_bg.wasm'];
const hasScanner = SCANNER_FILES.every(file => existsSync(join(PACKAGE_DIR, file)));

const report = {
  suite: 'destination.browser.test.mjs', package: PACKAGE_DIR, node: process.version,
  nodeResolver: nodeSide !== null, packedScanner: hasScanner, resolution: null, runtimes: [],
  notRun: [], differences: [], b9: {}, guards: {}, cases: [],
};
const failures = [];

function notRun(id, reason, { runtime = null, required = true } = {}) {
  report.notRun.push({ id, runtime, reason, required });
  console.log(`not run ${id}${runtime === null ? '' : ` (${runtime})`}: ${reason}`);
}

// ---- Loopback fixture hits (./destination-fixtures.mjs) ---------------------------------------

// { name, handle } per started fixture. A hit is { method, path, names, headers }, with header
// names lowercased; a strict fixture grants CORS only to the page origins it was started with.
const fixtures = [];
const header = (hit, name) => (Object.hasOwn(hit.headers, name) ? hit.headers[name] : null);
const brief = hits => hits.map(hit => [hit.method, hit.path, header(hit, 'origin')]);

function drainHits() {
  return Object.fromEntries(fixtures.map(({ name, handle }) => [name, handle.hits.splice(0)]));
}

function expectHits(observed, expected) {
  const actual = Object.fromEntries(Object.entries(observed)
    .map(([name, hits]) => [name, brief(hits)]));
  const wanted = Object.fromEntries(fixtures.map(({ name }) => [name, expected[name] ?? []]));
  assert.deepEqual(actual, wanted);
}

function listen(server, host) {
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(0, host, () => {
      server.off('error', fail);
      done(server.address().port);
    });
  });
}

function closeServer(server) {
  return new Promise(done => {
    server.closeAllConnections();
    server.close(() => done());
  });
}

// ---- Guards ---------------------------------------------------------------------------------

// The Chromium proxy: anything not bypassed (only 127.0.0.1 and [::1] are) lands here, refused.
const sinkLog = [];
const sink = createServer((req, res) => {
  sinkLog.push({ method: req.method, target: req.url });
  res.writeHead(502, { connection: 'close' });
  res.end();
});
sink.on('connect', (req, socket) => {
  sinkLog.push({ method: 'CONNECT', target: req.url });
  socket.destroy();
});
sink.on('upgrade', (req, socket) => {
  sinkLog.push({ method: 'UPGRADE', target: req.url });
  socket.destroy();
});

// Every Node client socket of this process: only the Node resolver may open any, to fixture A.
const sockets = [];
function recordSocket({ socket }) {
  const record = { attempts: [], peer: null };
  sockets.push(record);
  socket.on('connectionAttempt', (address, port) => record.attempts.push(`${address}:${port}`));
  socket.once('connect', () => {
    record.peer = `${socket.remoteAddress}:${socket.remotePort}`;
  });
}

function fixtureUrl(href) {
  if (href.startsWith('data:') || href.startsWith('blob:')) return true;
  let url;
  try {
    url = new URL(href);
  } catch (error) {
    return false;
  }
  return (url.protocol === 'http:' || url.protocol === 'https:')
    && (url.hostname === '127.0.0.1' || url.hostname === '[::1]');
}

// A routed context answers CORS preflights itself (Playwright fulfills intercepted OPTIONS
// requests), so B11 and the proxy control use contexts without routes.
async function openContext(browser, routed) {
  const context = await browser.newContext();
  const guard = { context, seen: [], blocked: [] };
  context.on('request', request => guard.seen.push(request.url()));
  if (routed) {
    await context.route(() => true, route => {
      const href = route.request().url();
      if (fixtureUrl(href)) return route.continue();
      guard.blocked.push(href);
      return route.abort('blockedbyclient');
    });
  }
  return guard;
}

// ---- Page helpers ---------------------------------------------------------------------------

// spec: { origin } for a fixture-scope fetch transport, { endpoint, label } for the endpoint.
function resolveInPage(page, spec, url) {
  return page.evaluate(async ([options, target]) => {
    const api = window.destination;
    const transport = options.endpoint === undefined
      ? api.createFetchTransport({ scope: 'fixture', fixtureOrigin: options.origin })
      : api.createEndpointTransport({ endpoint: options.endpoint, label: options.label,
        provenance: 'fixture' });
    const resolution = await api.resolveDestination(transport, { url: target });
    const parts = [resolution, resolution.transport];
    if (resolution.redirects !== null) parts.push(resolution.redirects, ...resolution.redirects);
    return {
      keys: Object.keys(resolution), frozen: parts.every(part => Object.isFrozen(part)),
      value: JSON.parse(JSON.stringify(resolution)),
    };
  }, [spec, url]);
}

// Checks the shape every resolution shares and returns it without its duration.
function settled(observed) {
  assert.deepEqual(observed.keys, RESOLUTION_KEYS);
  assert.equal(observed.frozen, true, 'resolution, transport and steps are frozen');
  const { durationMs, ...rest } = observed.value;
  assert.ok(Number.isInteger(durationMs) && durationMs >= 0, `durationMs ${durationMs}`);
  return rest;
}

function fixtureResult(url, fields) {
  return {
    outcome: 'resolved', reason: null, url, transport: { kind: 'fetch', label: FIXTURE_LABEL },
    provenance: 'fixture', requestSent: true, finalUrl: null, status: null, redirected: null,
    changed: null, redirects: null, hopCount: null, detail: null, ...fields,
  };
}

const summary = resolution => ({
  outcome: resolution.outcome, reason: resolution.reason, finalUrl: resolution.finalUrl,
  status: resolution.status, redirected: resolution.redirected, hopCount: resolution.hopCount,
  detail: resolution.detail,
});

// ---- Cases ----------------------------------------------------------------------------------

let A = null, B = null, C = null, D = null, E = null;
let PREVIEW = null;
let previewPort = null;
let sinkPort = null;
let nodeTransport = null;
const endpoint = { handler: null, log: [] };
const control = name => `http://127.0.0.2:${sinkPort}/${name}`;

function buildCases() {
  const at = (fixture, path) => `${fixture.origin}${path}`;
  const okAt = url => fixtureResult(url, { finalUrl: url, status: 200, redirected: false,
    changed: false, redirects: [], hopCount: 0 });
  const followed = (url, finalUrl) => fixtureResult(url, { finalUrl, status: 200,
    redirected: true, changed: true, detail: UNOBSERVED });
  const lost = url => fixtureResult(url, { outcome: 'unavailable', reason: 'opaque_network_error',
    requestSent: null, detail: NETWORK_ERROR });
  const fromPage = path => ['GET', path, PREVIEW];
  const single = (id, fixture, path, expected, hits) => ({
    id,
    observe: async run => ({
      resolution: await resolveInPage(run.page, { origin: fixture.origin }, at(fixture, path)),
    }),
    check(observed) {
      assert.deepEqual(settled(observed.resolution), expected);
      expectHits(observed.hits, hits);
    },
  });
  const needsHandler = () => (endpoint.handler === null
    ? 'destination-node.js is not in the package folder (no Node resolver or handler)' : null);

  return [
    // B1
    {
      id: 'B1',
      async observe(run) {
        const exported = await run.page.evaluate(() => Object.keys(window.destination)
          .map(name => [name, typeof window.destination[name]]));
        const policyFrozen = await run.page.evaluate(
          () => Object.isFrozen(window.destination.DESTINATION_POLICY));
        return { exported, policyFrozen, requests: run.loadRequests };
      },
      check(observed, run) {
        assert.deepEqual(observed.exported,
          EXPORTS.map(name => [name, name === 'DESTINATION_POLICY' ? 'object' : 'function']));
        assert.equal(observed.policyFrozen, true);
        const network = observed.requests.filter(href => !href.startsWith('data:'))
          .map(href => (href.startsWith(`${PREVIEW}/`) ? href.slice(PREVIEW.length) : href));
        assert.deepEqual([...new Set(network)].sort(), run.assets.page);
        expectHits(observed.hits, {});
      },
    },
    // B2
    {
      id: 'B2',
      async observe(run) {
        const url = at(A, '/ok');
        const direct = await resolveInPage(run.page, { origin: A.origin }, url);
        const verified = await run.page.evaluate(async ([origin, target]) => {
          const { createDestinationVerifier, createFetchTransport } = window.destination;
          const verifier = createDestinationVerifier({
            transport: createFetchTransport({ scope: 'fixture', fixtureOrigin: origin }),
          });
          const events = [];
          verifier.subscribe(change => events.push([change.cause, change.snapshot.state]));
          const snapshot = await verifier.resolve(target);
          return {
            keys: Object.keys(snapshot), frozen: Object.isFrozen(snapshot),
            same: snapshot === verifier.get(target), events, canResolve: verifier.canResolve,
            transport: verifier.transport, snapshot: JSON.parse(JSON.stringify(snapshot)),
          };
        }, [A.origin, url]);
        return { direct, verified };
      },
      check(observed) {
        const url = at(A, '/ok');
        assert.deepEqual(settled(observed.direct), okAt(url));
        const { verified } = observed;
        assert.deepEqual(verified.keys, SNAPSHOT_KEYS);
        assert.equal(verified.frozen, true);
        assert.equal(verified.same, true, 'the promise value is the stored snapshot');
        assert.equal(verified.canResolve, true);
        assert.deepEqual(verified.transport,
          { kind: 'fetch', label: FIXTURE_LABEL, provenance: 'fixture' });
        assert.deepEqual(verified.events, [['attempt', 'resolving'], ['settle', 'resolved']]);
        const { startedAt, settledAt, durationMs, ...snapshot } = verified.snapshot;
        assert.ok(Number.isFinite(startedAt) && settledAt >= startedAt, 'clock fields');
        assert.ok(Number.isInteger(durationMs) && durationMs >= 0, `durationMs ${durationMs}`);
        assert.deepEqual(snapshot, {
          encodedUrl: url, requestUrl: url, state: 'resolved', reason: null, attemptId: 1,
          transport: { kind: 'fetch', label: FIXTURE_LABEL }, provenance: 'fixture',
          requestSent: true, finalUrl: url, status: 200, redirected: false, changed: false,
          redirects: [], hopCount: 0, detail: null,
        });
        expectHits(observed.hits, { A: [fromPage('/ok'), fromPage('/ok')] });
      },
    },
    // B3
    single('B3', A, '/r/302', followed(at(A, '/r/302'), at(A, '/ok')),
      { A: [fromPage('/r/302'), fromPage('/ok')] }),
    // B4: the fixture logged the request, so it was sent although the result says null.
    single('B4', A, '/nocors/ok', lost(at(A, '/nocors/ok')),
      { A: [fromPage('/nocors/ok')] }),
    // B5: the CORS check fails on the redirect itself (HTTP fetch 4.4 before 6).
    single('B5', A, '/nocors/redirect', lost(at(A, '/nocors/redirect')),
      { A: [fromPage('/nocors/redirect')] }),
    // B6: the cross-origin hop carries Origin: null, which the strict peer never grants.
    single('B6', A, '/to/peer', lost(at(A, '/to/peer')),
      { A: [fromPage('/to/peer')], B: [['GET', '/ok', 'null']] }),
    // B7
    {
      id: 'B7',
      async observe(run) {
        // A cookie for the fixture host: the transport must not send it, a credentialed
        // control must (the hit log can see cookies), and /cookie must not add one.
        await run.context.addCookies([{ name: 'probe', value: '1', url: A.origin }]);
        const runs = [
          await resolveInPage(run.page, { origin: A.origin }, at(A, '/cookie')),
          await resolveInPage(run.page, { origin: A.origin }, at(A, '/referrer-policy')),
        ];
        const transportHits = A.hits.splice(0);
        const controls = await run.page.evaluate(async ([withCookie, withReferrer]) => {
          const outcome = pending => pending.then(response => response.status,
            error => error.name);
          return [await outcome(fetch(withCookie, { credentials: 'include' })),
            await outcome(fetch(withReferrer))];
        }, [at(A, '/headers'), at(A, '/referrer-policy')]);
        const controlHits = A.hits.splice(0);
        const jar = (await run.context.cookies(A.origin))
          .map(cookie => `${cookie.name}=${cookie.value}`).sort();
        await run.context.clearCookies();
        return { runs, transportHits, controls, controlHits, jar };
      },
      check(observed) {
        const headers = at(A, '/headers');
        assert.deepEqual(settled(observed.runs[0]), followed(at(A, '/cookie'), headers));
        assert.deepEqual(settled(observed.runs[1]), followed(at(A, '/referrer-policy'), headers));
        const view = hit => [hit.path, header(hit, 'origin'), header(hit, 'cookie'),
          header(hit, 'referer')];
        assert.deepEqual(observed.transportHits.map(view), [
          ['/cookie', PREVIEW, null, null], ['/headers', PREVIEW, null, null],
          ['/referrer-policy', PREVIEW, null, null], ['/headers', PREVIEW, null, null],
        ]);
        // Controls: the credentialed fetch sent the cookie (then failed CORS without
        // Access-Control-Allow-Credentials); a default fetch sent a Referer on both hops.
        assert.deepEqual(observed.controls, ['TypeError', 200]);
        const pageUrl = `${PREVIEW}/`;
        assert.deepEqual(observed.controlHits.map(view), [
          ['/headers', PREVIEW, 'probe=1', pageUrl], ['/referrer-policy', PREVIEW, null, pageUrl],
          ['/headers', PREVIEW, null, pageUrl],
        ]);
        assert.deepEqual(observed.jar, ['probe=1']);
        expectHits(observed.hits, {});
      },
    },
    // B8: the browser stops at its 20-redirect limit.
    single('B8', A, '/chain/21', lost(at(A, '/chain/21')),
      { A: Array.from({ length: 21 }, (_, index) => fromPage(`/chain/${21 - index}`)) }),
    // B9
    {
      id: 'B9',
      node: true,
      async observe(run) {
        if (nodeTransport === null) {
          notRun('B9', 'Node half: destination-node.js is not in the package folder; the '
            + 'browser half is asserted against the expected values',
          { runtime: run.runtime.name });
        }
        const browser = {};
        const node = nodeTransport === null ? null : {};
        for (const path of [...B9_ASSERTED.map(([route]) => route), ...B9_RECORDED]) {
          const url = at(A, path);
          const observed = await resolveInPage(run.page, { origin: A.origin }, url);
          browser[path] = summary(settled(observed));
          if (node !== null) {
            node[path] = summary(await core.resolveDestination(nodeTransport, { url }));
          }
        }
        report.b9[run.runtime.name] = {
          asserted: B9_ASSERTED.map(([path]) => path),
          recorded: B9_RECORDED.map(path => ({ path, browser: browser[path],
            node: node === null ? null : node[path] })),
        };
        return { browser, node };
      },
      check(observed) {
        for (const [path, finalPath, status] of B9_ASSERTED) {
          const expected = { outcome: 'resolved', finalUrl: at(A, finalPath), status };
          const pick = result => ({ outcome: result.outcome, finalUrl: result.finalUrl,
            status: result.status });
          assert.deepEqual(pick(observed.browser[path]), expected, `browser ${path}`);
          if (observed.node !== null) {
            assert.deepEqual(pick(observed.node[path]), expected, `Node ${path}`);
          }
        }
        // Every Node hop is one request with the bot agent and one socket to A, nothing else.
        const bot = observed.hits.A.filter(hit => header(hit, 'user-agent') === BOT_AGENT);
        if (observed.node === null) assert.equal(bot.length, 0);
        else assert.ok(bot.length > 0, 'the Node resolver reached A');
        assert.deepEqual(observed.sockets, bot.map(() => `127.0.0.1:${A.port}`));
        for (const hit of bot) {
          assert.deepEqual(['origin', 'cookie', 'referer'].map(name => header(hit, name)),
            [null, null, null]);
        }
      },
    },
    // B10
    {
      id: 'B10',
      node: true,
      endpoint: true,
      needs: needsHandler,
      async observe(run) {
        const resolution = await resolveInPage(run.page,
          { endpoint: '/api/destination', label: NODE_LABEL }, at(A, '/chain/2'));
        return { resolution };
      },
      check(observed) {
        const url = at(A, '/chain/2');
        const steps = [
          { url, status: 302, location: at(A, '/chain/1'), refusedScheme: null },
          { url: at(A, '/chain/1'), status: 302, location: at(A, '/chain/0'), refusedScheme: null },
        ];
        assert.deepEqual(settled(observed.resolution), {
          outcome: 'resolved', reason: null, url,
          transport: { kind: 'endpoint', label: NODE_LABEL }, provenance: 'fixture',
          requestSent: true, finalUrl: at(A, '/chain/0'), status: 200, redirected: true,
          changed: true, redirects: steps, hopCount: 2, detail: null,
        });
        assert.equal(observed.endpoint.length, 1);
        const { body, ...call } = observed.endpoint[0];
        assert.deepEqual(call, {
          method: 'POST', host: `127.0.0.1:${previewPort}`, origin: PREVIEW,
          fetchSite: 'same-origin', contentType: 'application/json', status: 200, allow: null,
          cors: null, responseType: 'application/json; charset=utf-8', cacheControl: 'no-store',
          nosniff: 'nosniff',
        });
        const wire = JSON.parse(body);
        assert.deepEqual(Object.keys(wire).sort(), WIRE_KEYS);
        assert.deepEqual(wire, {
          version: 1, url, outcome: 'resolved', reason: null, finalUrl: at(A, '/chain/0'),
          status: 200, redirected: true, redirects: steps, requestSent: true,
          provenance: 'fixture', detail: null,
        });
        expectHits(observed.hits, { A: ['/chain/2', '/chain/1', '/chain/0']
          .map(path => ['GET', path, null]) });
        assert.deepEqual(observed.hits.A.map(hit => ['user-agent', 'sec-fetch-site', 'cookie']
          .map(name => header(hit, name))), [0, 1, 2].map(() => [BOT_AGENT, null, null]));
        assert.deepEqual(observed.sockets, [0, 1, 2].map(() => `127.0.0.1:${A.port}`));
      },
    },
    // B11
    {
      id: 'B11',
      endpoint: true,
      needs: needsHandler,
      async observe(run) {
        const body = JSON.stringify({ version: 1, url: at(A, '/ok'), maxHops: 10,
          timeoutMs: 9000 });
        const runs = [];
        for (const fixture of E === null ? [B] : [B, E]) {
          const guard = await openContext(run.browser, false);
          run.guards.push(guard);
          try {
            const page = await guard.context.newPage();
            await page.goto(at(fixture, '/page/blank'));
            const results = await page.evaluate(async ([target, payload]) => {
              const attempt = type => fetch(target, { method: 'POST',
                headers: { 'content-type': type }, body: payload })
                .then(response => ({ status: response.status }), error => ({ error: error.name }));
              return [await attempt('application/json'),
                await attempt('text/plain;application/json')];
            }, [`${PREVIEW}/api/destination`, body]);
            runs.push({ origin: fixture.origin, results, calls: endpoint.log.splice(0) });
          } finally {
            await guard.context.close();
          }
        }
        return { runs };
      },
      check(observed) {
        // Ports do not make sites: origin B is same-site with the preview, [::1] is cross-site.
        const pages = [[B, 'same-site'], ...(E === null ? [] : [[E, 'cross-site']])];
        assert.deepEqual(observed.runs.map(item => item.origin),
          pages.map(([fixture]) => fixture.origin));
        const answer = { responseType: 'application/json; charset=utf-8',
          cacheControl: 'no-store', nosniff: 'nosniff' };
        for (const [index, [fixture, site]] of pages.entries()) {
          const item = observed.runs[index];
          assert.deepEqual(item.results, [{ error: 'TypeError' }, { error: 'TypeError' }]);
          const common = { host: `127.0.0.1:${previewPort}`, origin: fixture.origin,
            fetchSite: site, cors: null, ...answer };
          assert.deepEqual(item.calls, [
            { method: 'OPTIONS', contentType: null, status: 405, allow: 'POST',
              body: '{"error":"method_not_allowed"}', ...common },
            { method: 'POST', contentType: 'text/plain;application/json', status: 403,
              allow: null, body: '{"error":"forbidden"}', ...common },
          ]);
        }
        // The handler resolved nothing: no request reached A, no Node socket opened.
        const blank = ['GET', '/page/blank', null];
        expectHits(observed.hits, E === null ? { B: [blank] } : { B: [blank], E: [blank] });
      },
    },
    // B12
    {
      id: 'B12',
      needs: () => (hasScanner ? null : 'no packed scanner in the package folder (needs '
        + `${SCANNER_FILES.join(', ')})`),
      async observe(run) {
        const images = payloadImages().map(([name, sha256, lines]) => {
          const base64 = lines.join('');
          assert.equal(createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex'),
            sha256, `embedded ${name}`);
          return [name, base64];
        });
        const page = await run.context.newPage();
        const requests = [];
        page.on('request', request => requests.push(request.url()));
        try {
          await page.goto(`${PREVIEW}/scanner.html`, { waitUntil: 'networkidle' });
          await page.waitForFunction(() => window.scannerReady === true);
          const decoded = await page.evaluate(async list => {
            const { loadScanner, destinationCandidate } = window.scannerHarness;
            const scanner = await loadScanner();
            return list.map(([name, base64]) => {
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
              }
              const scan = scanner.scan_image(bytes, 'full');
              return { name, detections: scan.detections.map(detection => ({
                kind: detection.payload.kind, text: detection.content.text,
                candidate: destinationCandidate(detection),
              })) };
            });
          }, images);
          await page.waitForTimeout(300);
          return { decoded, requests };
        } finally {
          await page.close();
        }
      },
      check(observed, run) {
        const gs1 = 'https://id.gs1.org/01/09506000134352/10/LOT1?17=271231';
        const none = { eligible: false, source: null, encodedUrl: null, requestUrl: null,
          reason: 'no_url' };
        const one = (name, kind, text, candidate) => ({ name,
          detections: [{ kind, text, candidate }] });
        assert.deepEqual(observed.decoded, [
          one('me_card.png', 'me_card',
            'MECARD:N:Doe,Jane;TEL:+33600000000;URL:https://qrcode-ai.com;;',
            { eligible: true, source: 'me_card', encodedUrl: 'https://qrcode-ai.com',
              requestUrl: 'https://qrcode-ai.com/', reason: null }),
          one('gs1-digital-link.png', 'gs1_digital_link', gs1,
            { eligible: true, source: 'gs1_digital_link', encodedUrl: gs1, requestUrl: gs1,
              reason: null }),
          one('wifi.png', 'wifi', 'WIFI:T:WPA;S:QRCodeAI Guest;P:sunrise2027;;', none),
          one('sms.png', 'sms', 'SMSTO:+33600000000:Hello from a QR', none),
          one('crypto-bitcoin.png', 'crypto',
            'bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.01', none),
        ]);
        // Only page assets were requested: no destination request of any kind.
        const network = observed.requests.filter(href => !href.startsWith('data:'));
        assert.deepEqual(network.filter(href => !run.assets.scanner.includes(href)), []);
        assert.ok(network.some(href => href.endsWith('.wasm')), 'the packed binary was served');
        expectHits(observed.hits, {});
      },
    },
    // B13
    {
      id: 'B13',
      async observe(run) {
        return run.page.evaluate(async ([origin, url]) => {
          const { createFetchTransport, resolveDestination } = window.destination;
          const plain = resolution => {
            const parts = [resolution, resolution.transport];
            if (resolution.redirects !== null) {
              parts.push(resolution.redirects, ...resolution.redirects);
            }
            return { keys: Object.keys(resolution), frozen: parts.every(Object.isFrozen),
              value: JSON.parse(JSON.stringify(resolution)) };
          };
          const original = window.fetch;
          const records = [];
          const early = createFetchTransport({ scope: 'fixture', fixtureOrigin: origin });
          window.fetch = function replacement(input, init) {
            'use strict';
            let receiver = typeof this;
            if (this === undefined) receiver = 'undefined';
            else if (this === window) receiver = 'window';
            records.push({
              input: String(input), receiver, initKeys: Object.keys(init),
              init: { method: init.method, mode: init.mode, credentials: init.credentials,
                cache: init.cache, redirect: init.redirect, referrer: init.referrer,
                referrerPolicy: init.referrerPolicy },
              signal: init.signal instanceof AbortSignal,
            });
            return original(input, init);
          };
          let first;
          try {
            first = await resolveDestination(early, { url });
          } finally {
            window.fetch = original;
          }
          const injected = createFetchTransport({ scope: 'fixture', fixtureOrigin: origin,
            fetch: window.fetch });
          const second = await resolveDestination(injected, { url });
          // Control: the hazard is real, a method call of the native fetch is refused.
          let hazard;
          try {
            await ({ fetch: original }).fetch(url);
            hazard = { name: 'none', message: '' };
          } catch (error) {
            hazard = { name: error.name, message: String(error.message) };
          }
          return { records, first: plain(first), second: plain(second), hazard };
        }, [A.origin, at(A, '/ok')]);
      },
      check(observed) {
        const url = at(A, '/ok');
        assert.deepEqual(observed.records, [{
          input: url, receiver: 'undefined', initKeys: FETCH_INIT_KEYS,
          init: { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store',
            redirect: 'follow', referrer: '', referrerPolicy: 'no-referrer' },
          signal: true,
        }]);
        assert.deepEqual(settled(observed.first), okAt(url));
        assert.deepEqual(settled(observed.second), okAt(url));
        assert.equal(observed.hazard.name, 'TypeError');
        assert.match(observed.hazard.message, /Illegal invocation/);
        expectHits(observed.hits, { A: [fromPage('/ok'), fromPage('/ok')] });
      },
    },
    // B15: the browser follows before the transport can refuse.
    single('B15', C, '/to/peer', fixtureResult(at(C, '/to/peer'), { outcome: 'failed',
      reason: 'left_fixture', redirected: true, detail: 'Left the fixture scope' }),
    { C: [fromPage('/to/peer')], D: [['GET', '/ok', 'null']] }),
    // B16
    {
      id: 'B16',
      async observe(run) {
        const strict = await resolveInPage(run.page, { origin: A.origin },
          at(A, '/to/peer-and-back'));
        const strictHits = drainHits();
        const permissive = await resolveInPage(run.page, { origin: C.origin },
          at(C, '/to/peer-and-back'));
        return { strict, strictHits, permissive };
      },
      check(observed) {
        assert.deepEqual(settled(observed.strict), lost(at(A, '/to/peer-and-back')));
        expectHits(observed.strictHits, { A: [fromPage('/to/peer-and-back')],
          B: [['GET', '/to/peer', 'null']] });
        assert.deepEqual(settled(observed.permissive),
          followed(at(C, '/to/peer-and-back'), at(C, '/ok')));
        expectHits(observed.hits, {
          C: [fromPage('/to/peer-and-back'), ['GET', '/ok', 'null']],
          D: [['GET', '/to/peer', 'null']],
        });
      },
    },
  ];
}

// ---- Runner ---------------------------------------------------------------------------------

async function runCase(run, spec) {
  const runtime = run.runtime;
  const missing = spec.needs === undefined ? null : spec.needs();
  if (missing !== null) {
    notRun(spec.id, missing, { runtime: runtime.name });
    return;
  }
  drainHits();
  endpoint.log.splice(0);
  const first = sockets.length;
  try {
    const observed = await spec.observe(run);
    observed.hits = drainHits();
    observed.endpoint = endpoint.log.splice(0);
    observed.sockets = sockets.slice(first).map(record => record.peer);
    report.cases.push({ id: spec.id, runtime: runtime.name, observed });
    spec.check(observed, run);
    if (spec.endpoint !== true) assert.deepEqual(observed.endpoint, [], 'endpoint calls');
    if (spec.node !== true) assert.deepEqual(observed.sockets, [], 'Node sockets');
    console.log(`ok ${spec.id} (${runtime.name})`);
  } catch (error) {
    if (runtime.recordDifferences) {
      report.differences.push({ id: spec.id, runtime: runtime.name, message: error.message });
      console.log(`difference ${spec.id} (${runtime.name}): ${error.message.split('\n')[0]}`);
      return;
    }
    failures.push({ id: spec.id, runtime: runtime.name, error });
    console.log(`FAIL ${spec.id} (${runtime.name}): ${error.message}`);
  }
}

async function checkGuards(run, main) {
  const routeControl = control('route-control');
  const proxyControl = control('proxy-control');
  const attempt = href => fetch(href).then(response => `HTTP ${response.status}`,
    error => error.name);
  assert.equal(await run.page.evaluate(attempt, routeControl), 'TypeError');
  assert.deepEqual(main.blocked, [routeControl], 'the route guard aborted only its control');
  if (run.runtime.proxied) {
    const probe = await openContext(run.browser, false);
    run.guards.push(probe);
    try {
      const page = await probe.context.newPage();
      assert.equal(await page.evaluate(attempt, proxyControl), 'TypeError');
    } finally {
      await probe.context.close();
    }
  }
  const attempts = sinkLog.splice(0);
  assert.deepEqual(attempts, run.runtime.proxied
    ? [{ method: 'GET', target: proxyControl }] : [], 'the proxy saw only its control');
  const seen = run.guards.flatMap(guard => guard.seen);
  const outside = seen.filter(href => !fixtureUrl(href)
    && href !== routeControl && href !== proxyControl);
  report.guards[run.runtime.name] = { requests: seen.length, routeBlocked: main.blocked,
    proxyAttempts: attempts, outside };
  assert.deepEqual(outside, [], 'every browser request stayed on the loopback fixtures');
}

function receiptRevision(executable) {
  for (const folder of [dirname(executable), dirname(dirname(executable))]) {
    const file = join(folder, 'browser-receipt.json');
    if (!existsSync(file)) continue;
    try {
      return JSON.parse(readFileSync(file, 'utf8')).revision ?? null;
    } catch (error) {
      return null;
    }
  }
  return null;
}

function buildRuntimes() {
  const proxy = { server: `http://127.0.0.1:${sinkPort}`, bypass: '<-loopback>,127.0.0.1,[::1]' };
  const channel = process.env.QRSCAN_BROWSER_CHANNEL;
  const runtimes = [{
    name: 'chromium', type: playwright.chromium, proxied: true, recordDifferences: false,
    cases: CHROMIUM_CASES, options: channel ? { channel, proxy } : { proxy },
  }];
  const noSimd = process.env.QRSCAN_NO_SIMD_BROWSER;
  if (noSimd) {
    // B17
    runtimes.push({
      name: 'chromium-simd-disabled', type: playwright.chromium, proxied: true,
      recordDifferences: false, cases: B17_CASES, executable: noSimd,
      options: { executablePath: noSimd, args: ['--js-flags=--noexperimental-wasm-simd'], proxy },
    });
  } else {
    notRun('B17', 'QRSCAN_NO_SIMD_BROWSER is not set', { required: false });
  }
  if (process.env.QRSCAN_TEST_FIREFOX === '1') {
    // B14
    runtimes.push({
      name: 'firefox', type: playwright.firefox, proxied: false, recordDifferences: true,
      cases: B14_CASES, options: {},
    });
  } else {
    notRun('B14', 'QRSCAN_TEST_FIREFOX is not 1', { required: false });
  }
  return runtimes;
}

async function runRuntime(runtime, cases, assets) {
  const browser = await runtime.type.launch({ headless: true, timeout: 60000, ...runtime.options });
  const info = { name: runtime.name, version: browser.version() };
  if (runtime.executable !== undefined) {
    info.executable = runtime.executable;
    info.revision = receiptRevision(runtime.executable);
  }
  report.runtimes.push(info);
  console.log(`runtime ${runtime.name} ${info.version}`);
  const run = { runtime, browser, guards: [], assets, context: null, page: null };
  try {
    const main = await openContext(browser, true);
    run.guards.push(main);
    run.context = main.context;
    run.page = await main.context.newPage();
    const loading = [];
    const onRequest = request => loading.push(request.url());
    run.page.on('request', onRequest);
    await run.page.goto(`${PREVIEW}/`, { waitUntil: 'networkidle' });
    await run.page.waitForFunction(() => window.destinationReady === true);
    await run.page.waitForTimeout(300);
    run.page.off('request', onRequest);
    run.loadRequests = loading;
    info.simd = await run.page.evaluate(bytes => WebAssembly.validate(new Uint8Array(bytes)),
      SIMD_PROBE);
    if (runtime.executable !== undefined && info.simd !== false) {
      failures.push({ id: 'B17', runtime: runtime.name,
        error: new Error('QRSCAN_NO_SIMD_BROWSER validates WebAssembly SIMD') });
      console.log(`FAIL B17 (${runtime.name}): the runtime validates WebAssembly SIMD`);
    }
    for (const spec of cases) {
      if (runtime.cases.includes(spec.id)) await runCase(run, spec);
    }
    try {
      await checkGuards(run, main);
      console.log(`ok loopback guards (${runtime.name})`);
    } catch (error) {
      failures.push({ id: 'guards', runtime: runtime.name, error });
      console.log(`FAIL loopback guards (${runtime.name}): ${error.message}`);
    }
  } finally {
    await browser.close();
  }
}

// ---- Page build, preview and endpoint ---------------------------------------------------------

function mountEndpoint(req, res) {
  const entry = {
    method: req.method, host: req.headers.host ?? null, origin: req.headers.origin ?? null,
    fetchSite: req.headers['sec-fetch-site'] ?? null,
    contentType: req.headers['content-type'] ?? null, status: null, allow: null, cors: null,
    responseType: null, cacheControl: null, nosniff: null, body: null,
  };
  endpoint.log.push(entry);
  const end = res.end;
  res.end = function recordedEnd(body, ...rest) {
    entry.status = res.statusCode;
    entry.allow = res.getHeader('allow') ?? null;
    entry.cors = res.getHeader('access-control-allow-origin') ?? null;
    entry.responseType = res.getHeader('content-type') ?? null;
    entry.cacheControl = res.getHeader('cache-control') ?? null;
    entry.nosniff = res.getHeader('x-content-type-options') ?? null;
    entry.body = body === undefined || body === null ? '' : String(body);
    return end.call(this, body, ...rest);
  };
  if (endpoint.handler === null) {
    res.statusCode = 503;
    res.end('{"error":"no_handler"}');
    return;
  }
  endpoint.handler(req, res);
}

function writePages(workRoot) {
  const html = (title, script) => '<!doctype html><html><head><meta charset="utf-8">'
    + `<link rel="icon" href="data:,"><title>${title}</title></head><body>`
    + `<script type="module" src="./${script}"></script></body></html>\n`;
  writeFileSync(join(workRoot, 'index.html'), html('destination', 'main.js'));
  writeFileSync(join(workRoot, 'main.js'), [
    `import * as destination from '${PACKAGE_NAME}/destination';`,
    'window.destination = destination;',
    'window.destinationReady = true;',
    '',
  ].join('\n'));
  const input = { index: join(workRoot, 'index.html') };
  if (hasScanner) {
    writeFileSync(join(workRoot, 'scanner.html'), html('scanner', 'scanner.js'));
    writeFileSync(join(workRoot, 'scanner.js'), [
      `import { loadScanner } from '${PACKAGE_NAME}/auto';`,
      `import { destinationCandidate } from '${PACKAGE_NAME}/destination';`,
      'window.scannerHarness = { loadScanner, destinationCandidate };',
      'window.scannerReady = true;',
      '',
    ].join('\n'));
    input.scanner = join(workRoot, 'scanner.html');
  }
  return input;
}

// An installed package resolves through its exports map; a bare folder through aliases.
function packageIsInstallable() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8'));
  } catch (error) {
    return false;
  }
  const map = manifest.exports;
  return manifest.name === PACKAGE_NAME && map !== null && typeof map === 'object'
    && map['./destination'] !== undefined;
}

function assetClosure(manifest, key, dynamic, out = new Set()) {
  const chunk = manifest[key];
  if (out.has(chunk.file)) return out;
  out.add(chunk.file);
  for (const file of [...(chunk.css ?? []), ...(chunk.assets ?? [])]) out.add(file);
  for (const child of chunk.imports ?? []) assetClosure(manifest, child, dynamic, out);
  if (dynamic) {
    for (const child of chunk.dynamicImports ?? []) assetClosure(manifest, child, dynamic, out);
  }
  return out;
}

function removeLink(path) {
  try {
    unlinkSync(path);
  } catch (error) {
    rmdirSync(path);
  }
}

// ---- Main -----------------------------------------------------------------------------------

const watchdog = setTimeout(() => {
  console.error('destination.browser.test.mjs: no result after 600 s');
  process.exit(1);
}, 600000);
watchdog.unref();

// The real path: Vite names HTML entries relative to its root, and macOS links /var to
// /private/var, so a linked temp folder fails the build.
const workRoot = realpathSync(mkdtempSync(join(tmpdir(), 'qrscan-destination-browser-')));
const packageLink = join(workRoot, 'node_modules', ...PACKAGE_NAME.split('/'));
let linked = false;
let preview = null;
subscribe('net.client.socket', recordSocket);
try {
  sinkPort = await listen(sink, '127.0.0.1');
  const input = writePages(workRoot);
  let alias = [];
  if (packageIsInstallable()) {
    mkdirSync(dirname(packageLink), { recursive: true });
    symlinkSync(PACKAGE_DIR, packageLink, process.platform === 'win32' ? 'junction' : 'dir');
    linked = true;
    report.resolution = 'package exports';
  } else {
    alias = ['destination', 'auto'].map(name => ({
      find: new RegExp(`^${PACKAGE_NAME.replace('/', '\\/')}\\/${name}$`),
      replacement: vite.normalizePath(join(PACKAGE_DIR, `${name}.js`)),
    }));
    report.resolution = 'file aliases';
  }
  const outDir = join(workRoot, 'dist');
  await vite.build({
    root: workRoot, configFile: false, logLevel: 'warn', publicDir: false,
    resolve: { alias },
    build: {
      outDir, emptyOutDir: true, target: 'es2020', assetsInlineLimit: 0, manifest: true,
      modulePreload: { polyfill: false }, rollupOptions: { input },
    },
  });
  preview = await vite.preview({
    root: workRoot, configFile: false, logLevel: 'warn', publicDir: false, build: { outDir },
    preview: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'qrscan-destination-endpoint',
      configurePreviewServer(server) {
        server.middlewares.use('/api/destination', mountEndpoint);
      },
    }],
  });
  previewPort = preview.httpServer.address().port;
  PREVIEW = `http://127.0.0.1:${previewPort}`;

  // A strict fixture fixes its page origins at start, so the fixtures follow the preview.
  const strict = { cors: 'strict', pageOrigins: [PREVIEW] };
  [A, B] = await startFixturePair(strict);
  fixtures.push({ name: 'A', handle: A }, { name: 'B', handle: B });
  [C, D] = await startFixturePair({ cors: 'any' });
  fixtures.push({ name: 'C', handle: C }, { name: 'D', handle: D });
  try {
    E = await startFixture({ address: '::1', ...strict });
    fixtures.push({ name: 'E', handle: E });
  } catch (error) {
    notRun('B11', `cross-site page skipped: no [::1] on this host (${error.code})`,
      { required: false });
  }
  if (nodeSide !== null) {
    nodeTransport = nodeSide.createNodeTransport({
      fixture: { address: '127.0.0.1', port: A.port },
    });
    endpoint.handler = nodeSide.createDestinationEndpoint({ transport: nodeTransport,
      allowedHosts: [`127.0.0.1:${previewPort}`], publicScheme: 'http' });
  }

  const manifest = JSON.parse(readFileSync(join(outDir, '.vite', 'manifest.json'), 'utf8'));
  const assets = {
    page: ['/', ...[...assetClosure(manifest, 'index.html', false)].map(file => `/${file}`)].sort(),
    scanner: hasScanner ? [`${PREVIEW}/scanner.html`, ...[...assetClosure(manifest,
      'scanner.html', true)].map(file => `${PREVIEW}/${file}`)] : [],
  };
  const cases = buildCases();
  for (const runtime of buildRuntimes()) {
    try {
      await runRuntime(runtime, cases, assets);
    } catch (error) {
      failures.push({ id: 'runtime', runtime: runtime.name, error });
      console.log(`FAIL runtime ${runtime.name}: ${error.message}`);
    }
  }

  try {
    const fixturePeer = `127.0.0.1:${A.port}`;
    const strays = sockets.filter(record => record.peer !== fixturePeer
      || record.attempts.some(attempt => attempt !== fixturePeer));
    report.guards.nodeSockets = { count: sockets.length, strays };
    assert.deepEqual(strays, [], 'Node sockets went only to fixture A');
    assert.deepEqual(sinkLog, [], 'no late proxy attempt');
    console.log(`ok loopback guards (Node sockets: ${sockets.length})`);
  } catch (error) {
    failures.push({ id: 'guards', runtime: null, error });
    console.log(`FAIL loopback guards (Node): ${error.message}`);
  }
} finally {
  unsubscribe('net.client.socket', recordSocket);
  if (preview !== null) await preview.close();
  for (const { handle } of fixtures) await handle.close();
  if (sink.listening) await closeServer(sink);
  if (linked) removeLink(packageLink);
  rmSync(workRoot, { recursive: true, force: true });
}

if (IN_CI) {
  for (const entry of report.notRun.filter(item => item.required)) {
    failures.push({ id: entry.id, runtime: entry.runtime,
      error: new Error(`not run in CI: ${entry.reason}`) });
  }
}
report.failures = failures.map(({ id, runtime, error }) => ({ id, runtime,
  message: error.message }));
if (REPORT_PATH !== null) {
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
} else {
  const { cases: observations, ...rest } = report;
  console.log(JSON.stringify(rest, null, 2));
}
console.log(`${failures.length === 0 ? 'passed' : 'FAILED'}: ${failures.length} failure(s), `
  + `${report.notRun.length} not run, ${report.differences.length} recorded difference(s)`);
if (failures.length > 0) process.exitCode = 1;

// ---- B12 inputs ------------------------------------------------------------------------------

// fixtures/payloads PNGs, embedded (the suite reads no repository file) and checked by SHA-256.
function payloadImages() {
  return [
    ['me_card.png', '55c7b885b6d9d6f1dce975ea5bc3b35c4e8c38b83be83b0b9111d3f45e27d9ea', [
      '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',
      'AElFTkSuQmCC',
    ]],
    ['gs1-digital-link.png', '6be9d470ea67b281400a00e68fb24648541cd7e6c407e1e590a28e0c544a7c24', [
      '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',
      'CwAQ/P8CAPwjIhP8B2oZaEcAAAAASUVORK5CYII=',
    ]],
    ['wifi.png', 'c0f8fff2f5e31f157355e87252da5ab11437c43681a1a01f59baa14227026aac', [
      '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',
      'BFkh+Acn6TAPAAAAAElFTkSuQmCC',
    ]],
    ['sms.png', '422f7cfd72c6e941f797cd02e52525bd425420643d6504084eadefdb5485f62a', [
      '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',
    ]],
    ['crypto-bitcoin.png', 'ccc1f708e9b7d48d60f22c83fe0a5d37e9b9bebba3dbf9015d71c871eb729e0b', [
      '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',
      '8I9Njo6HYcZ0IgAAAABJRU5ErkJggg==',
    ]],
  ];
}
