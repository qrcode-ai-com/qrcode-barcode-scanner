// Node suite of the destination core (./destination.js). The case labels D1..D74 are local to
// this file: each marks a block of assertions, and blocks that cover parts of one rule share a
// label. Every transport and timer here is fake: no request leaves this process. Two children
// re-execute this file: `import` traps globals around the import (D23); `browserlike` removes
// `process` and defines `location`.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { getEventListeners } from 'node:events';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const nodeProcess = globalThis.process;
// QRSCAN_DESTINATION_PACKAGE: the folder holding destination.js, such as an installed package
// (default: this file's folder). QRSCAN_DESTINATION_MODULE, when set, names the module itself.
const PACKAGE_DIR = nodeProcess.env.QRSCAN_DESTINATION_PACKAGE;
const MODULE = nodeProcess.env.QRSCAN_DESTINATION_MODULE ?? (PACKAGE_DIR === undefined
  ? './destination.js' : pathToFileURL(resolve(PACKAGE_DIR, 'destination.js')).href);
const CHILD = nodeProcess.env.QRSCAN_DESTINATION_CHILD;
const SELF = fileURLToPath(import.meta.url);

const EXPORTS = ['DESTINATION_POLICY', 'classifyAddress', 'classifyHost',
  'createDestinationSelection', 'createDestinationVerifier', 'createEndpointTransport',
  'createFetchTransport', 'createPreparedTransport', 'destinationCandidate', 'resolveDestination'];

// WHATWG Fetch "bad port" table (83 ports), embedded so the policy is checked against text.
const FETCH_BAD_PORTS = [0, 1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69,
  77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139,
  143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563,
  587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000,
  6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080];

const WIRE_SENTENCES = [
  ['Address not allowed', false], ['Resolved address not allowed', false],
  ['Port not allowed', false], ['Redirect scheme not allowed', false],
  ['Redirect carries credentials', false], ['Redirect location invalid', false],
  ['Redirect limit reached', false], ['Redirect loop', false], ['Left the fixture scope', false],
  ['Outside this transport scope', false], ['Name resolution failed', true],
  ['Connection failed', true], ['TLS handshake failed', true], ['Invalid HTTP response', true],
  ['Timed out', false], ['Resolver busy', false], ['Name not usable', false],
].map(([text, code]) => ({ text, code }));

// spec/examples/gs1-digital-link.json and spec/examples/mecard.json payloads, embedded.
const GS1_EXAMPLE = {
  kind: 'gs1_digital_link', url: 'https://id.gs1.org/01/09506000134352/10/LOT1?17=271231',
  elements: [{ ai: '01', value: '09506000134352' }, { ai: '10', value: 'LOT1' },
    { ai: '17', value: '271231' }],
  gtin: '09506000134352', conformant: true, issues: [],
};
const MECARD_EXAMPLE = {
  kind: 'me_card', name: 'Doe,Jane', tel: '+33600000000', email: null, url: 'https://qrcode-ai.com',
};

const A = 'https://a.test/';
const B = 'https://b.test/';
const C = 'https://c.test/';
const FAKE = { kind: 'custom', label: 'Fake' };
const SNAPSHOT_KEYS = ['encodedUrl', 'requestUrl', 'state', 'reason', 'attemptId', 'transport',
  'provenance', 'requestSent', 'finalUrl', 'status', 'redirected', 'changed', 'redirects',
  'hopCount', 'startedAt', 'settledAt', 'durationMs', 'detail'];
const RESOLUTION_KEYS = ['outcome', 'reason', 'url', 'transport', 'provenance', 'requestSent',
  'finalUrl', 'status', 'redirected', 'changed', 'redirects', 'hopCount', 'detail', 'durationMs'];

const flush = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
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

// What a promise has settled with one macrotask later; fails while it is pending or rejected.
async function settledNow(promise, label) {
  let state = 'pending';
  let value;
  promise.then(result => {
    state = 'fulfilled';
    value = result;
  }, error => {
    state = 'rejected';
    value = error;
  });
  await flush();
  const why = state === 'rejected' ? ` (${value})` : '';
  assert.equal(state, 'fulfilled', `${label}: ${state}${why}`);
  return value;
}

// Timers whose `member` throws `error` on the calls `breaks` selects (counted from 1).
function brokenTimers(timers, member, error, breaks = () => true) {
  const real = timers[member];
  let count = 0;
  return { ...timers, [member](...args) {
    count += 1;
    if (breaks(count)) throw error;
    return Reflect.apply(real, undefined, args);
  } };
}

// Timers whose `member` runs `hook` on its first call after arm(), then works normally; a hook
// that throws makes that call throw. The hook stands for injected code re-entering the verifier.
function hookedTimers(timers, member, hook) {
  const real = timers[member];
  let armed = false;
  return {
    arm() { armed = true; },
    timers: { ...timers, [member](...args) {
      if (armed) {
        armed = false;
        hook();
      }
      return Reflect.apply(real, undefined, args);
    } },
  };
}

// A caller signal over a real one whose removeEventListener runs `hook` on its first call after
// arm(), then removes the listener; `held` lists the abort listeners still attached.
function hookedSignal(hook) {
  const real = new AbortController().signal;
  const held = [];
  let armed = false;
  return {
    held,
    arm() { armed = true; },
    signal: {
      get aborted() { return real.aborted; },
      addEventListener(type, listener, options) {
        held.push(listener);
        real.addEventListener(type, listener, options);
      },
      removeEventListener(type, listener) {
        if (armed) {
          armed = false;
          hook();
        }
        const index = held.indexOf(listener);
        if (index !== -1) held.splice(index, 1);
        real.removeEventListener(type, listener);
      },
    },
  };
}

const step = (url, location, status = 301, refusedScheme = null) =>
  ({ url, status, location, refusedScheme });
const resolvedAt = (finalUrl, redirects, extra = {}) => ({
  outcome: 'resolved', finalUrl, status: 200, redirects,
  redirected: redirects === null || redirects.length > 0, requestSent: true, ...extra,
});

function pendingTransport(fields = {}) {
  const calls = [];
  const transport = {
    kind: 'custom', label: 'Fake', provenance: 'network',
    resolve(request) {
      const d = deferred();
      calls.push({ request, ...d });
      return d.promise;
    },
    ...fields,
  };
  return { transport, calls };
}

const fixedTransport = (observation, fields = {}) => ({
  kind: 'custom', label: 'Fake', provenance: 'network',
  resolve: () => Promise.resolve(observation), ...fields,
});

const unverified = (encodedUrl, requestUrl = encodedUrl) => ({
  encodedUrl, requestUrl, state: 'unverified', reason: null, attemptId: null, transport: null,
  provenance: null, requestSent: null, finalUrl: null, status: null, redirected: null,
  changed: null, redirects: null, hopCount: null, startedAt: null, settledAt: null,
  durationMs: null, detail: null,
});
const expected = (encodedUrl, fields, requestUrl = encodedUrl) =>
  ({ ...unverified(encodedUrl, requestUrl), ...fields });

function assertSnapshot(actual, want, message) {
  assert.ok(Object.isFrozen(actual), 'snapshots are frozen');
  assert.deepEqual(Object.keys(actual), SNAPSHOT_KEYS, message);
  assert.deepEqual(actual, want, message);
}

const outcome = fields => ({
  outcome: 'resolved', reason: null, url: A, transport: FAKE, provenance: 'network',
  requestSent: true, finalUrl: null, status: null, redirected: null, changed: null,
  redirects: null, hopCount: null, detail: null, durationMs: 0, ...fields,
});

function assertResolution(actual, want, message) {
  assert.ok(Object.isFrozen(actual), 'resolutions are frozen');
  assert.deepEqual(Object.keys(actual), RESOLUTION_KEYS, message);
  assert.deepEqual(actual, want, message);
}

async function observe(d, observation, request = {}, fields = {}) {
  const clock = fakeClock();
  const result = await d.resolveDestination(fixedTransport(observation, fields),
    { url: A, ...request }, { timers: clock.timers });
  assert.equal(clock.pending, 0, 'no timer survives a settled call');
  return result;
}

const invalidObservation = rule => outcome({
  outcome: 'unavailable', reason: 'invalid_observation', requestSent: null,
  detail: `Invalid observation: ${rule}`,
});

const detection = (payload, charset = 'utf8', text = '') =>
  ({ symbology: 'qr_code', content: { raw: '', text, charset }, payload, corners: null });

function deepFrozen(value) {
  if (value === null || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(deepFrozen);
}

// A Response-like object; its reader yields `chunks` and records reads and cancels.
function fakeResponse({ status = 200, contentType = 'application/json; charset=utf-8', chunks = [],
  type = 'basic', url = '', redirected = false } = {}) {
  const record = { reads: 0, readerCancels: 0, bodyCancels: 0, getReaders: 0 };
  const queue = chunks.slice();
  const reader = {
    read() {
      record.reads++;
      if (queue.length === 0) return Promise.resolve({ done: true, value: undefined });
      return Promise.resolve({ done: false, value: queue.shift() });
    },
    cancel() { record.readerCancels++; queue.length = 0; return Promise.resolve(); },
    releaseLock() {},
  };
  const response = {
    type, status, url, redirected,
    headers: { get: name => (name.toLowerCase() === 'content-type' ? contentType : null) },
    body: {
      cancel() { record.bodyCancels++; return Promise.resolve(); },
      getReader() { record.getReaders++; return reader; },
    },
  };
  return { response, record };
}

const encode = text => new TextEncoder().encode(text);
const wire = fields => ({
  version: 1, url: A, outcome: 'resolved', reason: null, finalUrl: A, status: 200,
  redirected: false, redirects: [], requestSent: true, provenance: 'network', detail: null,
  ...fields,
});

function endpointWith(d, bodyFor, options = {}) {
  const calls = [];
  const transport = d.createEndpointTransport({
    endpoint: 'http://127.0.0.1:9/api/destination', label: 'Test endpoint',
    fetch: (input, init) => {
      calls.push({ input, init });
      return Promise.resolve(bodyFor(calls.length - 1));
    },
    ...options,
  });
  return { transport, calls };
}

// --------------------------------------------------------------------------- parent: D1..D74

async function parent() {
  const unhandled = [];
  nodeProcess.on('unhandledRejection', reason => unhandled.push(reason));
  const globalFetchCalls = [];
  globalThis.fetch = (...args) => {
    globalFetchCalls.push(args);
    throw new Error('the global fetch must never run in this suite');
  };
  const d = await import(MODULE);
  const candidate = d.destinationCandidate;

  // D1
  {
    const c = candidate({ kind: 'url', url: 'https://qrcode-ai.com/a#frag' });
    assert.deepEqual(c, { eligible: true, source: 'url', encodedUrl: 'https://qrcode-ai.com/a#frag',
      requestUrl: 'https://qrcode-ai.com/a', reason: null });
    assert.deepEqual(Object.keys(c), ['eligible', 'source', 'encodedUrl', 'requestUrl', 'reason']);
    assert.ok(Object.isFrozen(c));
  }
  // D2
  assert.deepEqual(candidate(GS1_EXAMPLE), { eligible: true, source: 'gs1_digital_link',
    encodedUrl: GS1_EXAMPLE.url,
    requestUrl: 'https://id.gs1.org/01/09506000134352/10/LOT1?17=271231', reason: null });
  assert.deepEqual(candidate(detection(GS1_EXAMPLE)), candidate(GS1_EXAMPLE));
  // D3
  assert.deepEqual(candidate({ ...GS1_EXAMPLE, url: 'https://example.com/01/09506000134352',
    conformant: false, issues: ['missing check digit'] }), { eligible: true,
    source: 'gs1_digital_link', encodedUrl: 'https://example.com/01/09506000134352',
    requestUrl: 'https://example.com/01/09506000134352', reason: null });
  // D4
  assert.deepEqual(candidate(MECARD_EXAMPLE), { eligible: true, source: 'me_card',
    encodedUrl: 'https://qrcode-ai.com', requestUrl: 'https://qrcode-ai.com/', reason: null });
  // D5
  for (const url of [null, '']) {
    assert.deepEqual(candidate({ ...MECARD_EXAMPLE, url }), { eligible: false, source: 'me_card',
      encodedUrl: null, requestUrl: null, reason: 'no_url' });
  }
  // D6
  assert.deepEqual(candidate({ ...MECARD_EXAMPLE, url: 'www.example.com' }), { eligible: false,
    source: 'me_card', encodedUrl: 'www.example.com', requestUrl: null, reason: 'not_http' });
  // D7
  // U+017F folds onto 's' under Unicode case folding: the prefix test is ASCII-only.
  for (const value of [' https://x.io', 'example.com:8080', 'http:/a.example', 'ftp://x.test/',
    'mailto:a@b.test', 'javascript:alert(1)', 'http\u017f://x.io']) {
    assert.deepEqual(candidate(value), { eligible: false, source: null, encodedUrl: value,
      requestUrl: null, reason: 'not_http' }, value);
  }
  // D8
  assert.deepEqual(candidate('HTTPS://EXAMPLE.COM'), { eligible: true, source: null,
    encodedUrl: 'HTTPS://EXAMPLE.COM', requestUrl: 'https://example.com/', reason: null });
  for (const value of ['https://x.io ', 'https://exa\tmple.com/a\nb',
    'https://x.io/p\nmore words here', 'https://x.io/a b', 'https://x.io/a\u00a0b',
    'https://exa\u200bmple.com/', 'https://exa\u00admple.com/', 'https://x.io/\u202eabc',
    'https://x.io/\u2028', 'https://x.io/\u{E0041}', 'https://x.io/a\rb', 'https://x.io/\u3000']) {
    assert.deepEqual(candidate(value), { eligible: false, source: null, encodedUrl: value,
      requestUrl: null, reason: 'control_or_space' }, JSON.stringify(value));
  }
  assert.equal(candidate('https://x.io/café').eligible, true, 'letters are not invisible');
  // D8: default-ignorable code points outside Cf (IDNA deletes them inside a host) and lone
  // surrogates (the parser turns them into U+FFFD) are refused too: parsing would repair them.
  for (const value of ['https://exa\u034fmple.com/', 'https://exa\u180bmple.com/',
    'https://exa\ufe0fmple.com/', 'https://exa\u{E0100}mple.com/', 'https://good\u3164site.com/',
    'https://exa\u115fmple.com/', 'https://exa\u17b4mple.com/', 'https://x.io/a\u034fb',
    'https://x.io/\u2764\ufe0f', 'https://x.io/a\ud800b', 'https://x.io/?q=\udc00']) {
    assert.deepEqual(candidate(value), { eligible: false, source: null, encodedUrl: value,
      requestUrl: null, reason: 'control_or_space' }, JSON.stringify(value));
  }
  for (const [kind, url] of [['url', 'https://exa\u034fmple.com/'],
    ['gs1_digital_link', 'https://id.gs1.org/01/09506000134352\ufe0f'],
    ['me_card', 'https://exa\u180bmple.com/']]) {
    assert.deepEqual(candidate({ kind, url }), { eligible: false, source: kind, encodedUrl: url,
      requestUrl: null, reason: 'control_or_space' }, kind);
  }
  for (const [value, requestUrl] of [['https://x.io/e\u0301', 'https://x.io/e%CC%81'],
    ['https://x.io/\u{1F600}', 'https://x.io/%F0%9F%98%80'],
    ['https://b\u00fccher.example/', 'https://xn--bcher-kva.example/']]) {
    assert.deepEqual(candidate(value), { eligible: true, source: null, encodedUrl: value,
      requestUrl, reason: null }, JSON.stringify(value));
  }
  // D9
  for (const value of ['https://', 'http://[::1', 'https://exa%20mple.com',
    'http://[fe80::1%25en0]/']) {
    assert.deepEqual(candidate(value), { eligible: false, source: null, encodedUrl: value,
      requestUrl: null, reason: 'invalid_url' }, value);
  }
  // D10
  for (const value of ['https://user:pw@example.com/', 'https://user@example.com']) {
    assert.deepEqual(candidate(value), { eligible: false, source: null, encodedUrl: value,
      requestUrl: null, reason: 'credentials' }, value);
  }
  assert.deepEqual(candidate('http://@example.com'), { eligible: true, source: null,
    encodedUrl: 'http://@example.com', requestUrl: 'http://example.com/', reason: null });
  // D11
  {
    const exact = `https://x.io/${'a'.repeat(16384 - 13)}`;
    assert.equal(exact.length, 16384);
    const c = candidate(exact);
    assert.deepEqual(c, { eligible: true, source: null, encodedUrl: exact, requestUrl: exact,
      reason: null });
    const grows = `https://x.io?${'a'.repeat(16384 - 13)}`;
    assert.equal(grows.length, 16384);
    assert.equal(new URL(grows).href.length, 16385);
    assert.deepEqual(candidate(grows), { eligible: false, source: null, encodedUrl: grows,
      requestUrl: null, reason: 'too_long' });
    const raw = `https://x.io/${'a'.repeat(16385 - 13)}`;
    assert.equal(raw.length, 16385);
    assert.deepEqual(candidate(raw), { eligible: false, source: null, encodedUrl: raw,
      requestUrl: null, reason: 'too_long' });
  }
  // D12
  assert.deepEqual(candidate(detection({ kind: 'text' }, 'unknown', 'https://x.io')),
    { eligible: false, source: null, encodedUrl: null, requestUrl: null, reason: 'lossy_text' });
  // D13
  {
    const payloads = [
      { kind: 'wifi', ssid: 'Home', security: 'WPA', password: 'secret', hidden: false },
      { kind: 'email', to: 'a@b.test', subject: null, body: null },
      { kind: 'sms', number: '+33600000000', body: null },
      { kind: 'tel', number: '+33600000000' },
      { kind: 'geo', lat: 48.85, lon: 2.35 },
      { kind: 'gs1', elements: [], gtin: null, conformant: true, issues: [] },
      { kind: 'crypto', scheme: 'bitcoin', address: 'bc1qexample', amount: null },
      { kind: 'text' },
      { kind: 'v_card', raw: 'BEGIN:VCARD\nURL:https://x.io\nEND:VCARD' },
      { kind: 'v_event', raw: 'BEGIN:VEVENT\nEND:VEVENT' },
      { kind: 'future' },
    ];
    for (const payload of payloads) {
      const want = { eligible: false, source: null, encodedUrl: null, requestUrl: null,
        reason: 'no_url' };
      assert.deepEqual(candidate(payload), want, payload.kind);
      assert.deepEqual(candidate(detection(payload)), want, payload.kind);
    }
  }
  // D14
  for (const value of [42, null, {}, { symbology: 'qr_code', content: { raw: '',
    text: 'https://x.io', charset: 'utf8' } }, undefined, () => 'https://x.io']) {
    assert.throws(() => candidate(value), TypeError);
  }

  // D15
  {
    const rows = [
      ['0.1.2.3', 'unspecified'], ['10.1.2.3', 'private'], ['100.64.0.1', 'shared'],
      ['127.0.0.1', 'loopback'], ['169.254.169.254', 'link_local'], ['172.16.5.4', 'private'],
      ['192.0.0.170', 'reserved'], ['192.0.2.1', 'documentation'], ['192.31.196.1', 'reserved'],
      ['192.52.193.1', 'reserved'], ['192.88.99.1', 'tunnel'], ['192.168.1.1', 'private'],
      ['192.175.48.1', 'reserved'], ['198.18.0.1', 'benchmarking'],
      ['198.51.100.1', 'documentation'], ['203.0.113.1', 'documentation'],
      ['224.0.0.1', 'multicast'], ['255.255.255.255', 'broadcast'], ['240.0.0.1', 'reserved'],
      ['168.63.129.16', 'platform'], ['8.8.8.8', 'public'],
      ['172.15.255.255', 'public'], ['172.16.0.0', 'private'], ['172.31.255.255', 'private'],
      ['172.32.0.0', 'public'], ['100.63.255.255', 'public'], ['100.127.255.255', 'shared'],
      ['100.128.0.0', 'public'], ['198.17.255.255', 'public'], ['198.19.255.255', 'benchmarking'],
      ['198.20.0.0', 'public'], ['192.0.0.9', 'reserved'], ['168.63.129.17', 'public'],
      ['255.255.255.254', 'reserved'], ['223.255.255.255', 'public'],
    ];
    for (const [address, range] of rows) {
      const info = d.classifyAddress(address);
      assert.deepEqual(info, { address, family: 4, range, embedded: null,
        allowed: range === 'public' }, address);
      assert.ok(Object.isFrozen(info));
    }
  }
  // D16
  for (const value of ['127.1', '0x7f.0.0.1', '2130706433', '010.0.0.1', '1.2.3.4.5',
    '256.1.1.1', ' 1.2.3.4', '1.2.3.4 ', '', '1.2.3.']) {
    assert.equal(d.classifyAddress(value), null, JSON.stringify(value));
  }
  // D17
  const v4 = (address, range) =>
    ({ address, family: 4, range, embedded: null, allowed: range === 'public' });
  {
    const rows = [
      ['::', '::', 'unspecified', null, false],
      ['::1', '::1', 'loopback', null, false],
      ['::ffff:127.0.0.1', '::ffff:7f00:1', 'ipv4_mapped', v4('127.0.0.1', 'loopback'), false],
      ['::ffff:7f00:1', '::ffff:7f00:1', 'ipv4_mapped', v4('127.0.0.1', 'loopback'), false],
      ['::ffff:8.8.8.8', '::ffff:808:808', 'ipv4_mapped', v4('8.8.8.8', 'public'), false],
      ['::7f00:1', '::7f00:1', 'ipv4_compatible', v4('127.0.0.1', 'loopback'), false],
      ['64:ff9b::808:808', '64:ff9b::808:808', 'translation', v4('8.8.8.8', 'public'), true],
      ['64:ff9b::a00:1', '64:ff9b::a00:1', 'translation', v4('10.0.0.1', 'private'), false],
      ['64:ff9b:1::1', '64:ff9b:1::1', 'translation', null, false],
      ['100::1', '100::1', 'discard', null, false],
      ['2001::1', '2001::1', 'tunnel', null, false],
      ['2001:2::1', '2001:2::1', 'benchmarking', null, false],
      ['2001:20::1', '2001:20::1', 'reserved', null, false],
      ['2001:db8::1', '2001:db8::1', 'documentation', null, false],
      ['2002:c000:201::1', '2002:c000:201::1', 'tunnel', v4('192.0.2.1', 'documentation'),
        false],
      ['2620:4f:8000::1', '2620:4f:8000::1', 'reserved', null, false],
      ['3fff::1', '3fff::1', 'documentation', null, false],
      ['fd00::1', 'fd00::1', 'unique_local', null, false],
      ['fe80::1', 'fe80::1', 'link_local', null, false],
      ['fec0::1', 'fec0::1', 'site_local', null, false],
      ['ff02::1', 'ff02::1', 'multicast', null, false],
      ['4000::1', '4000::1', 'reserved', null, false],
      ['2606:4700:4700::1111', '2606:4700:4700::1111', 'public', null, true],
    ];
    for (const [input, address, range, embedded, allowed] of rows) {
      assert.deepEqual(d.classifyAddress(input), { address, family: 6, range, embedded, allowed },
        input);
    }
  }
  // D18
  for (const value of ['fe80::1%en0', ':::1', '1::2::3', '[::1]', '12345::1', '1:2:3:4:5:6:7:8:9',
    '1:2:3:4:5:6:7', '::1:', ':1::', '::ffff:1.2.3', '::1.2.3.4:5', 'g::1']) {
    assert.equal(d.classifyAddress(value), null, value);
  }
  assert.deepEqual(d.classifyAddress('FE80::1'),
    { address: 'fe80::1', family: 6, range: 'link_local', embedded: null, allowed: false });
  for (const [input, address] of [['2001:0DB8:0000:0000:0000:0000:0000:0001', '2001:db8::1'],
    ['1:0:0:2:0:0:3:4', '1::2:0:0:3:4'], ['1:0:1:0:1:0:1:0', '1:0:1:0:1:0:1:0'],
    ['1:2:3:4:5:6:7::', '1:2:3:4:5:6:7:0'], ['0:0:0:0:0:0:0:1', '::1'],
    ['1:0:0:0:1:0:0:0', '1::1:0:0:0'], ['2606:4700::6810:84e5', '2606:4700::6810:84e5']]) {
    assert.equal(d.classifyAddress(input).address, address, input);
  }
  // D19
  {
    const t96 = { translationPrefixes: ['2a00:1:2:3::/96'] };
    assert.deepEqual(d.classifyAddress('2a00:1:2:3::808:808', t96), {
      address: '2a00:1:2:3::808:808', family: 6, range: 'translation',
      embedded: v4('8.8.8.8', 'public'), allowed: true });
    assert.deepEqual(d.classifyAddress('2a00:1:2:3::a00:1', t96), { address: '2a00:1:2:3::a00:1',
      family: 6, range: 'translation', embedded: v4('10.0.0.1', 'private'), allowed: false });
    const t64 = { translationPrefixes: ['2a00:1:2:3::/64'] };
    const rows = [
      ['2a00:1:2:3:8:808:800:0', v4('8.8.8.8', 'public'), true],
      ['2a00:1:2:3:a:0:100:0', v4('10.0.0.1', 'private'), false],
      ['2a00:1:2:3:a9:fea9:fe00:0', v4('169.254.169.254', 'link_local'), false],
      ['2a00:1:2:3:108:808:800:0', null, false],
    ];
    for (const [address, embedded, allowed] of rows) {
      assert.deepEqual(d.classifyAddress(address, t64),
        { address, family: 6, range: 'translation', embedded, allowed }, address);
    }
    assert.deepEqual(d.classifyAddress('2a00:1:a00:1::', { translationPrefixes: ['2a00:1::/32'] }),
      { address: '2a00:1:a00:1::', family: 6, range: 'translation',
        embedded: v4('10.0.0.1', 'private'), allowed: false });
    assert.deepEqual(d.classifyAddress('2a00:1:2:3:a9:fea9:fe00:0'), { address:
      '2a00:1:2:3:a9:fea9:fe00:0', family: 6, range: 'public', embedded: null, allowed: true },
    'an unconfigured network-specific prefix reads as public: the documented operator duty');
    assert.equal(d.classifyAddress('2a00:1:2:3::808:808',
      { translationPrefixes: ['2a00:1::/32', '2a00:1:2:3::/96'] }).allowed, true,
    'the longest configured prefix wins');
    const deny = { deniedRanges: ['8.8.4.0/24', '2606:4700::/32'] };
    assert.deepEqual(d.classifyAddress('8.8.4.4', deny),
      { address: '8.8.4.4', family: 4, range: 'denied', embedded: null, allowed: false });
    assert.deepEqual(d.classifyAddress('2606:4700:4700::1111', deny), { address:
      '2606:4700:4700::1111', family: 6, range: 'denied', embedded: null, allowed: false });
    const deniedV4 = { address: '8.8.4.4', family: 4, range: 'denied', embedded: null,
      allowed: false };
    assert.deepEqual(d.classifyAddress('64:ff9b::808:404', deny), { address: '64:ff9b::808:404',
      family: 6, range: 'denied', embedded: deniedV4, allowed: false });
    assert.equal(d.classifyAddress('::ffff:8.8.4.4', deny).range, 'denied');
    assert.equal(d.classifyAddress('2002:808:404::1', deny).range, 'denied');
    assert.equal(d.classifyAddress('8.8.8.8', deny).range, 'public');
    for (const prefix of ['2a00::/63', '2a00:1:2:3::1/64', 'x', '10.0.0.0/32', '2a00::/096']) {
      assert.throws(() => d.classifyAddress('8.8.8.8', { translationPrefixes: [prefix] }),
        TypeError, prefix);
    }
    for (const range of ['10.0.0.1/8', '8.8.4.0/33', '::/129', '::1/0', 'example.com/8', '10/8']) {
      assert.throws(() => d.classifyAddress('8.8.8.8', { deniedRanges: [range] }), TypeError,
        range);
    }
    assert.throws(() => d.classifyAddress('8.8.8.8', { translationPrefixes: '2a00::/32' }),
      TypeError);
    assert.throws(() => d.classifyAddress('8.8.8.8', 5), TypeError);
    assert.throws(() => d.classifyAddress(5), TypeError);
    assert.equal(d.classifyAddress('8.8.8.8', { deniedRanges: ['0.0.0.0/0'] }).range, 'denied');
  }
  // D20
  {
    const special = [['localhost', 'localhost'], ['a.localhost', 'localhost'],
      ['localhost.', 'localhost'], ['printer.local', 'local'], ['nas.home.arpa', 'home.arpa'],
      ['svc.internal', 'internal'], ['x.invalid', 'invalid'], ['abc.onion', 'onion'],
      ['x.alt', 'alt'], ['intranet', 'single_label']];
    for (const [hostname, specialUse] of special) {
      const host = hostname.replace(/\.+$/, '');
      assert.deepEqual(d.classifyHost(hostname),
        { kind: 'name', host, address: null, specialUse, allowed: false }, hostname);
    }
    for (const hostname of ['example.test', 'a.example', 'qrcode-ai.com',
      'xn--bcher-kva.example']) {
      const info = d.classifyHost(hostname);
      assert.deepEqual(info,
        { kind: 'name', host: hostname, address: null, specialUse: null, allowed: true });
      assert.ok(Object.isFrozen(info));
    }
    for (const [hostname, host, specialUse] of [['localhost..', 'localhost', 'localhost'],
      ['a.localhost..', 'a.localhost', 'localhost'], ['intranet..', 'intranet', 'single_label'],
      ['printer.local..', 'printer.local', 'local'], ['LOCALHOST', 'localhost', 'localhost']]) {
      assert.deepEqual(d.classifyHost(hostname),
        { kind: 'name', host, address: null, specialUse, allowed: false }, hostname);
    }
    for (const hostname of ['.localhost', 'a..b', '...', 'a b.test', 'exémple.test',
      'example.123', 'a.0x1f']) {
      assert.equal(d.classifyHost(hostname), null, hostname);
    }
  }
  // D21
  {
    const loop4 = v4('127.0.0.1', 'loopback');
    assert.deepEqual(d.classifyHost('127.0.0.1'),
      { kind: 'address', host: '127.0.0.1', address: loop4, specialUse: null, allowed: false });
    assert.deepEqual(d.classifyHost('[::1]'), { kind: 'address', host: '::1',
      address: { address: '::1', family: 6, range: 'loopback', embedded: null, allowed: false },
      specialUse: null, allowed: false });
    assert.equal(d.classifyHost('[::ffff:7f00:1]').address.range, 'ipv4_mapped');
    assert.deepEqual(d.classifyHost('8.8.8.8.'), { kind: 'address', host: '8.8.8.8',
      address: v4('8.8.8.8', 'public'), specialUse: null, allowed: true });
    for (const hostname of ['0x7f.1', 'a/b', '', '[::1', '[1.2.3.4]', '[fe80::1%25en0]']) {
      assert.equal(d.classifyHost(hostname), null, hostname);
    }
    assert.throws(() => d.classifyHost(null), TypeError);
    assert.equal(d.classifyHost('[2606:4700:4700::1111]', { deniedRanges: ['2606:4700::/32'] })
      .address.range, 'denied');
  }
  // D22
  {
    const policy = d.DESTINATION_POLICY;
    assert.ok(deepFrozen(policy), 'DESTINATION_POLICY is deep-frozen');
    assert.deepEqual(Object.keys(policy), ['snapshot', 'maxUrlLength', 'maxHopsLimit',
      'maxTimeoutMs', 'defaultMaxHops', 'defaultTimeoutMs', 'redirectStatuses', 'badPorts',
      'translationPrefixLengths', 'platformRanges', 'detailSentences']);
    assert.equal(policy.snapshot, '2026-11-02');
    assert.equal(policy.maxUrlLength, 16384);
    assert.equal(policy.maxHopsLimit, 20);
    assert.equal(policy.maxTimeoutMs, 60000);
    assert.equal(policy.defaultMaxHops, 10);
    assert.equal(policy.defaultTimeoutMs, 10000);
    assert.equal(FETCH_BAD_PORTS.length, 83);
    assert.deepEqual(policy.badPorts, FETCH_BAD_PORTS);
    assert.deepEqual(policy.redirectStatuses, [301, 302, 303, 307, 308]);
    assert.deepEqual(policy.translationPrefixLengths, [32, 40, 48, 56, 64, 96]);
    assert.deepEqual(policy.platformRanges, ['168.63.129.16/32']);
    assert.deepEqual(policy.detailSentences, WIRE_SENTENCES);
  }
  // D23
  {
    const child = spawnSync(nodeProcess.execPath, [SELF], { encoding: 'utf8', timeout: 60000,
      env: { ...nodeProcess.env, QRSCAN_DESTINATION_CHILD: 'import' } });
    assert.equal(child.status, 0, child.stderr);
    const report = JSON.parse(child.stdout);
    assert.equal(report.failure, null);
    assert.deepEqual(report.hits, [], 'importing reads none of the trapped globals');
    assert.deepEqual(report.exports.slice().sort(), EXPORTS.slice().sort());
  }

  // D24
  {
    const { transport } = pendingTransport();
    assert.throws(() => d.createDestinationVerifier(), TypeError);
    assert.throws(() => d.createDestinationVerifier({}), TypeError);
    assert.throws(() => d.createDestinationVerifier({ transport: undefined }), TypeError);
    for (const [key, value] of [['timeoutMs', 0], ['timeoutMs', 60001], ['timeoutMs', 1.5],
      ['maxHops', 21], ['maxHops', -1], ['maxConcurrent', 0], ['maxConcurrent', 9],
      ['maxQueued', 257], ['maxEntries', 18], ['maxEntries', 1025]]) {
      assert.throws(() => d.createDestinationVerifier({ transport, [key]: value }), RangeError,
        `${key} ${value}`);
    }
    assert.throws(() => d.createDestinationVerifier({ transport, timeoutMs: '5' }), TypeError);
    assert.throws(() => d.createDestinationVerifier({ transport: { ...transport,
      resolve: undefined } }), TypeError);
    assert.throws(() => d.createDestinationVerifier({ transport: { ...transport,
      provenance: 'observed' } }), TypeError);
    assert.throws(() => d.createDestinationVerifier({ transport: { ...transport,
      kind: 'browser' } }), TypeError);
    assert.throws(() => d.createDestinationVerifier({ transport, reportError: 1 }), TypeError);
    assert.throws(() => d.createDestinationVerifier({ transport, timers: {} }), TypeError);
    const ok = d.createDestinationVerifier({ transport, maxConcurrent: 1, maxQueued: 0,
      maxEntries: 2 });
    assert.equal(ok.canResolve, true);
    assert.deepEqual(ok.transport, { kind: 'custom', label: 'Fake', provenance: 'network' });
    assert.ok(Object.isFrozen(ok.transport));
  }
  // D25
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport });
    const first = verifier.get(A);
    assertSnapshot(first, unverified(A));
    assert.equal(verifier.get(A), first);
    assert.equal(verifier.get(candidate(A)), first);
    assert.equal(verifier.get('mailto:a@b.test'), null);
    assert.equal(verifier.get(candidate('mailto:a@b.test')), null);
    assertSnapshot(verifier.get('https://a.test'), unverified('https://a.test', A));
    assert.equal(calls.length, 0, 'get never sends');
  }
  // D26
  {
    const clock = fakeClock(950);
    await clock.advance(50);
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers });
    const events = [];
    verifier.subscribe(change => events.push(change));
    const promise = verifier.resolve(A);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].request.url, A);
    assert.equal(calls[0].request.maxHops, 10);
    assert.equal(calls[0].request.timeoutMs, 10000);
    assert.equal(calls[0].request.signal.aborted, false);
    assert.ok(Object.isFrozen(calls[0].request));
    assert.equal(events.length, 1);
    assert.ok(Object.isFrozen(events[0]));
    assert.equal(events[0].encodedUrl, A);
    assert.equal(events[0].cause, 'attempt');
    assertSnapshot(events[0].previous, unverified(A));
    assertSnapshot(events[0].snapshot, expected(A, { state: 'resolving', attemptId: 1,
      transport: FAKE, provenance: 'network', startedAt: 1000 }));
    await clock.advance(250);
    calls[0].resolve(resolvedAt(B, [step(A, B)]));
    const settled = await promise;
    assert.equal(events.length, 2);
    assert.equal(events[1].cause, 'settle');
    assert.equal(events[1].previous, events[0].snapshot);
    assert.equal(events[1].snapshot, settled);
    assertSnapshot(settled, expected(A, { state: 'resolved', attemptId: 1, transport: FAKE,
      provenance: 'network', requestSent: true, finalUrl: B, status: 200, redirected: true,
      changed: true, redirects: [step(A, B)], hopCount: 1, startedAt: 1000, settledAt: 1250,
      durationMs: 250 }));
    assert.deepEqual(Object.keys(settled.redirects[0]), ['url', 'status', 'location',
      'refusedScheme']);
    assert.ok(Object.isFrozen(settled.redirects) && Object.isFrozen(settled.redirects[0]));
    assert.equal(verifier.get(A), settled);
    assert.equal(clock.pending, 0, 'no timer outlives the attempt');
    assert.equal(clock.bound, 0, 'timers are called unbound');
  }
  // D27
  {
    const verifier = d.createDestinationVerifier({ transport: fixedTransport(resolvedAt(A, [])),
      timers: fakeClock().timers });
    const settled = await verifier.resolve(A);
    assert.equal(settled.state, 'resolved');
    assert.equal(settled.changed, false);
    assert.equal(settled.hopCount, 0);
    assert.equal(settled.redirected, false);
    assert.deepEqual(settled.redirects, []);
  }
  // D28
  {
    const verifier = d.createDestinationVerifier({ transport: pendingTransport().transport });
    assert.throws(() => verifier.resolve('ftp://x'), TypeError);
    assert.throws(() => verifier.resolve(candidate('https://x.io/a b')), TypeError);
    assert.throws(() => verifier.resolve(42), TypeError);
    verifier.destroy();
    for (const call of [() => verifier.get(A), () => verifier.resolve(A), () => verifier.cancel(A),
      () => verifier.subscribe(() => {}), () => verifier.forget(A), () => verifier.clear()]) {
      assert.throws(call, TypeError);
    }
    verifier.destroy();
  }
  // D29
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const events = [];
    verifier.subscribe(change => events.push(change.cause));
    const first = verifier.resolve(A);
    const second = verifier.resolve(candidate(A));
    assert.equal(first, second);
    assert.equal(calls.length, 1);
    assert.deepEqual(events, ['attempt']);
    calls[0].resolve(resolvedAt(A, []));
    assert.equal((await first).attemptId, 1);
  }
  // D29: a joining caller's signal whose addEventListener ends the shared attempt (here
  // with forget()) keeps no listener: the attempt has ended before the listener is linked.
  {
    const { transport } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const first = verifier.resolve(A);
    const held = [];
    const signal = {
      aborted: false,
      addEventListener(type, listener) {
        verifier.forget(A);
        held.push(listener);
      },
      removeEventListener(type, listener) {
        const index = held.indexOf(listener);
        if (index !== -1) held.splice(index, 1);
      },
    };
    assert.equal(verifier.resolve(A, { signal }), first);
    assert.equal((await settledNow(first, 'joined')).reason, 'cleared');
    assert.deepEqual(held, [], 'no listener stays on the joining signal');
    assertSnapshot(verifier.get(A), unverified(A));
  }
  // D30
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const first = verifier.resolve(A);
    calls[0].resolve(resolvedAt(A, []));
    assert.equal((await first).attemptId, 1);
    const again = verifier.resolve(A);
    assert.notEqual(again, first);
    assert.equal(calls.length, 2, 'no TTL: a settled entry is checked again on request');
    calls[1].resolve(resolvedAt(A, []));
    assert.equal((await again).attemptId, 2);
  }
  // D31
  {
    const clock = fakeClock(5000);
    const verifier = d.createDestinationVerifier({ transport: null, timers: clock.timers });
    assert.equal(verifier.canResolve, false);
    assert.equal(verifier.transport, null);
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.snapshot.state]));
    const settled = await verifier.resolve(A);
    assertSnapshot(settled, expected(A, { state: 'unavailable', reason: 'no_transport',
      attemptId: 1, requestSent: false, settledAt: 5000 }));
    assert.deepEqual(events, [['attempt', 'unavailable']]);
    assert.equal(verifier.get(A), settled);
  }
  // D32
  {
    const clock = fakeClock(100);
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
      maxConcurrent: 2, maxQueued: 1, maxEntries: 8 });
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state]));
    const urls = ['https://a.test/', 'https://b.test/', 'https://c.test/', 'https://d.test/'];
    const promises = urls.map(url => verifier.resolve(url));
    assert.deepEqual(calls.map(call => call.request.url), urls.slice(0, 2));
    assert.equal(verifier.get(urls[2]).state, 'resolving');
    assert.equal(verifier.get(urls[2]).startedAt, null);
    assertSnapshot(verifier.get(urls[3]), expected(urls[3], { state: 'unavailable',
      reason: 'queue_full', attemptId: 4, transport: FAKE, provenance: 'network',
      requestSent: false, settledAt: 100 }));
    assert.equal(await promises[3], verifier.get(urls[3]));
    events.length = 0;
    calls[0].resolve(resolvedAt(urls[0], []));
    await promises[0];
    assert.deepEqual(events, [['settle', urls[0], 'resolved'], ['start', urls[2], 'resolving']]);
    assert.equal(verifier.get(urls[2]).startedAt, 100);
    assert.equal(calls.length, 3);
    assert.equal(calls[2].request.url, urls[2]);
  }
  // D32: attempts resolved from the event that frees a slot (settle, cancel, caller abort
  // or forget) queue behind the attempt already waiting, which starts first; the queue keeps
  // its bound, so the second one is queue_full.
  for (const ending of ['settle', 'cancel', 'abort', 'forget']) {
    const clock = fakeClock(1000);
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
      maxConcurrent: 1, maxQueued: 1, maxEntries: 8 });
    const D = 'https://d.test/';
    const E = 'https://e.test/';
    const controller = new AbortController();
    const running = verifier.resolve(A, { signal: controller.signal });
    const queued = verifier.resolve(C);
    const events = [];
    let late = null;
    verifier.subscribe(change => {
      events.push([change.cause, change.encodedUrl, change.snapshot.state,
        change.snapshot.startedAt]);
      if (change.encodedUrl === A && late === null) late = [D, E].map(url => verifier.resolve(url));
    });
    await clock.advance(5);
    if (ending === 'settle') calls[0].resolve(resolvedAt(A, []));
    if (ending === 'cancel') verifier.cancel(A);
    if (ending === 'abort') controller.abort();
    if (ending === 'forget') verifier.forget(A);
    await running;
    const ended = { settle: ['settle', A, 'resolved', 1000],
      cancel: ['cancel', A, 'canceled', 1000], abort: ['cancel', A, 'canceled', 1000],
      forget: ['forget', A, 'unverified', null] }[ending];
    assert.deepEqual(events, [ended, ['attempt', D, 'resolving', null],
      ['attempt', E, 'unavailable', null], ['start', C, 'resolving', 1005]], ending);
    assert.deepEqual(calls.map(call => call.request.url), [A, C], ending);
    assertSnapshot(await late[1], expected(E, { state: 'unavailable', reason: 'queue_full',
      attemptId: 4, transport: FAKE, provenance: 'network', requestSent: false,
      settledAt: 1005 }), ending);
    events.length = 0;
    calls[1].resolve(resolvedAt(C, []));
    await queued;
    assert.deepEqual(events, [['settle', C, 'resolved', 1005], ['start', D, 'resolving', 1005]],
      ending);
    assert.deepEqual(calls.map(call => call.request.url), [A, C, D], ending);
  }
  // D32: queued attempts start oldest first, and time spent queued counts neither in
  // durationMs nor in the backstop, which is armed when the attempt starts.
  {
    const clock = fakeClock(10000);
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
      timeoutMs: 1000, maxConcurrent: 1, maxQueued: 2, maxEntries: 8 });
    const D = 'https://d.test/';
    const [first, second, third] = [A, C, D].map(url => verifier.resolve(url));
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.startedAt]));
    await clock.advance(700);
    calls[0].resolve(resolvedAt(A, []));
    await first;
    assert.deepEqual(events, [['settle', A, 10000], ['start', C, 10700]]);
    assert.deepEqual(calls.map(call => call.request.url), [A, C]);
    await clock.advance(300);
    calls[1].resolve(resolvedAt(C, []));
    assertSnapshot(await second, expected(C, { state: 'resolved', attemptId: 2, transport: FAKE,
      provenance: 'network', requestSent: true, finalUrl: C, status: 200, redirected: false,
      changed: false, redirects: [], hopCount: 0, startedAt: 10700, settledAt: 11000,
      durationMs: 300 }));
    assert.deepEqual(calls.map(call => call.request.url), [A, C, D]);
    await clock.advance(1999);
    assert.equal(verifier.get(D).state, 'resolving', 'the backstop counts from the start');
    await clock.advance(1);
    assertSnapshot(await third, expected(D, { state: 'unavailable',
      reason: 'transport_unresponsive', attemptId: 3, transport: FAKE, provenance: 'network',
      requestSent: null, startedAt: 11000, settledAt: 13000, durationMs: 2000,
      detail: 'Transport did not settle' }));
    assert.equal(clock.pending, 0);
  }
  // D33
  {
    const clock = fakeClock();
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers });
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.snapshot.state]));
    const promise = verifier.resolve(A);
    await clock.advance(30);
    assert.equal(verifier.cancel(A), true);
    assert.equal(calls[0].request.signal.aborted, true);
    const canceled = await promise;
    assertSnapshot(canceled, expected(A, { state: 'canceled', reason: 'canceled', attemptId: 1,
      transport: FAKE, provenance: 'network', requestSent: null, startedAt: 0, settledAt: 30,
      durationMs: 30 }));
    calls[0].resolve(resolvedAt(A, []));
    await flush();
    assert.equal(verifier.get(A), canceled, 'the late result is ignored');
    assert.deepEqual(events, [['attempt', 'resolving'], ['cancel', 'canceled']]);
    assert.equal(verifier.cancel(A), false);
    assert.equal(verifier.cancel('mailto:a@b.test'), false);
    assert.equal(clock.pending, 0);
  }
  // D33: canceling a running attempt, with cancel() or through its caller's signal, starts
  // the oldest queued attempt.
  for (const ending of ['cancel', 'abort']) {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock(40).timers,
      maxConcurrent: 1, maxQueued: 1, maxEntries: 8 });
    const controller = new AbortController();
    const running = verifier.resolve(A, { signal: controller.signal });
    const queued = verifier.resolve(C);
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state, change.snapshot.startedAt]));
    if (ending === 'cancel') assert.equal(verifier.cancel(A), true);
    else controller.abort();
    assert.deepEqual(events, [['cancel', A, 'canceled', 40], ['start', C, 'resolving', 40]],
      ending);
    assert.deepEqual(calls.map(call => call.request.url), [A, C], ending);
    assert.equal((await running).reason, ending === 'cancel' ? 'canceled' : 'aborted');
    calls[1].resolve(resolvedAt(C, []));
    assert.equal((await queued).state, 'resolved', ending);
  }
  // D34
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock(7).timers,
      maxConcurrent: 2, maxQueued: 1, maxEntries: 8 });
    verifier.resolve(A);
    verifier.resolve(B);
    const queued = verifier.resolve(C);
    assert.equal(verifier.cancel(C), true);
    assertSnapshot(await queued, expected(C, { state: 'canceled', reason: 'canceled',
      attemptId: 3, transport: FAKE, provenance: 'network', requestSent: false, settledAt: 7 }));
    calls[0].resolve(resolvedAt(A, []));
    await flush();
    assert.deepEqual(calls.map(call => call.request.url), [A, B], 'C never reached the transport');
  }
  // D35
  {
    const clock = fakeClock();
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers });
    const controller = new AbortController();
    const promise = verifier.resolve(A, { signal: controller.signal });
    await clock.advance(5);
    controller.abort();
    assertSnapshot(await promise, expected(A, { state: 'canceled', reason: 'aborted',
      attemptId: 1, transport: FAKE, provenance: 'network', requestSent: null, startedAt: 0,
      settledAt: 5, durationMs: 5 }));
    assert.equal(calls[0].request.signal.aborted, true);
    const aborted = new AbortController();
    aborted.abort();
    assertSnapshot(await verifier.resolve(B, { signal: aborted.signal }), expected(B, {
      state: 'canceled', reason: 'aborted', attemptId: 2, transport: FAKE, provenance: 'network',
      requestSent: false, settledAt: 5 }));
    assert.equal(calls.length, 1, 'an aborted signal never reaches the transport');
    assert.throws(() => verifier.resolve(C, { signal: {} }), TypeError);
  }
  // D35: a signal that cannot take the abort listener (here one borrowing a real signal's
  // methods, so Node's EventTarget refuses its `this`) is refused synchronously, before anything
  // changes: no event, entry, attemptId or slot is used. Joining with it leaves the shared
  // attempt running.
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      maxConcurrent: 1, maxQueued: 1, maxEntries: 8 });
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state]));
    const real = new AbortController().signal;
    const borrowed = { get aborted() { return real.aborted; },
      addEventListener: real.addEventListener, removeEventListener: real.removeEventListener };
    const refused = error => error instanceof TypeError &&
      error.message === 'options.signal must be an AbortSignal.' &&
      error.cause instanceof TypeError;
    assert.throws(() => verifier.resolve(A, { signal: borrowed }), refused);
    assert.deepEqual(events, []);
    assertSnapshot(verifier.get(A), unverified(A));
    const shared = verifier.resolve(A);
    assert.deepEqual(calls.map(call => call.request.url), [A], 'the refused call took no slot');
    assert.throws(() => verifier.resolve(A, { signal: borrowed }), refused);
    assert.equal(verifier.resolve(A), shared);
    assert.equal(calls[0].request.signal.aborted, false);
    calls[0].resolve(resolvedAt(A, []));
    assert.equal((await shared).attemptId, 1, 'the refused calls took no attemptId');
    assert.deepEqual(events, [['attempt', A, 'resolving'], ['settle', A, 'resolved']]);
  }
  // D35: a signal that throws on the first read of `aborted`, `addEventListener` or
  // `removeEventListener` is refused with TypeError whose cause is what it threw; nothing changes.
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const events = [];
    verifier.subscribe(change => events.push(change.cause));
    for (const member of ['aborted', 'addEventListener', 'removeEventListener']) {
      const thrown = new Error(`${member} read broke`);
      const signal = { aborted: false, addEventListener() {}, removeEventListener() {} };
      Object.defineProperty(signal, member, { get() { throw thrown; } });
      assert.throws(() => verifier.resolve(A, { signal }), error => error instanceof TypeError &&
        error.message === 'options.signal must be an AbortSignal.' && error.cause === thrown,
      member);
    }
    assert.deepEqual(events, []);
    assertSnapshot(verifier.get(A), unverified(A));
    const value = verifier.resolve(A);
    assert.equal(calls.length, 1);
    calls[0].resolve(resolvedAt(A, []));
    assert.equal((await value).attemptId, 1, 'the refused calls took no attemptId');
  }
  // D36
  {
    const clock = fakeClock();
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
      timeoutMs: 1000 });
    const promise = verifier.resolve(A);
    await clock.advance(1999);
    assert.equal(verifier.get(A).state, 'resolving');
    assert.equal(calls[0].request.signal.aborted, false);
    await clock.advance(1);
    assert.equal(verifier.get(A).state, 'unavailable', 'the backstop fires at timeoutMs + 1000');
    assertSnapshot(await promise, expected(A, { state: 'unavailable',
      reason: 'transport_unresponsive', attemptId: 1, transport: FAKE, provenance: 'network',
      requestSent: null, startedAt: 0, settledAt: 2000, durationMs: 2000,
      detail: 'Transport did not settle' }));
    assert.equal(calls[0].request.signal.aborted, true);
    assert.equal(clock.pending, 0);
  }
  // D37
  {
    const thrown = new Error('boom');
    const rejected = new Error('rejected');
    const reported = [];
    for (const [resolve, cause] of [[() => { throw thrown; }, thrown],
      [() => Promise.reject(rejected), rejected]]) {
      const verifier = d.createDestinationVerifier({ transport: { ...FAKE, provenance: 'network',
        resolve }, timers: fakeClock().timers, reportError: error => reported.push(error) });
      assertSnapshot(await verifier.resolve(A), expected(A, { state: 'unavailable',
        reason: 'transport_error', attemptId: 1, transport: FAKE, provenance: 'network',
        requestSent: null, startedAt: 0, settledAt: 0, durationMs: 0,
        detail: 'Transport threw' }));
      assert.equal(reported.at(-1), cause);
    }
    assert.deepEqual(reported, [thrown, rejected]);
  }
  // D37: a timers member that throws before the transport is called ends the attempt as
  // unavailable/transport_error with detail 'Timers threw' and requestSent false. The error is
  // reported, no timer is left and the slot is free again. startedAt stays null when the start
  // time itself could not be read.
  for (const member of ['now', 'monotonic', 'setTimeout']) {
    const clock = fakeClock(100);
    const error = new Error(`${member} broke`);
    const reported = [];
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport,
      timers: brokenTimers(clock.timers, member, error, count => count === 1),
      reportError: value => reported.push(value), maxConcurrent: 1, maxQueued: 1, maxEntries: 8 });
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.snapshot.state]));
    const failed = await settledNow(verifier.resolve(A), member);
    const started = member === 'setTimeout';
    assertSnapshot(failed, expected(A, { state: 'unavailable', reason: 'transport_error',
      attemptId: 1, transport: FAKE, provenance: 'network', requestSent: false,
      startedAt: started ? 100 : null, settledAt: 100, durationMs: started ? 0 : null,
      detail: 'Timers threw' }), member);
    assert.deepEqual(events, [['attempt', 'resolving'], ['settle', 'unavailable']], member);
    assert.deepEqual(reported, [error], member);
    assert.equal(calls.length, 0, `${member}: nothing was sent`);
    assert.equal(clock.pending, 0, member);
    const next = verifier.resolve(B);
    assert.deepEqual(calls.map(call => call.request.url), [B], `${member}: the slot is free`);
    calls[0].resolve(resolvedAt(B, []));
    assert.equal((await next).state, 'resolved', member);
  }
  // D37: timers that throw while attempts end are reported and cannot strand them: the
  // wall time falls back to Date.now() and the duration to 0, for a settle and for a cancel.
  {
    const clock = fakeClock(100);
    const nowError = new Error('now broke late');
    const monotonicError = new Error('monotonic broke late');
    const reported = [];
    const { transport, calls } = pendingTransport();
    let broken = false;
    const timers = brokenTimers(brokenTimers(clock.timers, 'now', nowError, () => broken),
      'monotonic', monotonicError, () => broken);
    const verifier = d.createDestinationVerifier({ transport, timers,
      reportError: value => reported.push(value) });
    const settling = verifier.resolve(A);
    const canceling = verifier.resolve(B);
    await clock.advance(50);
    broken = true;
    const before = Date.now();
    calls[0].resolve(resolvedAt(A, []));
    const settled = await settledNow(settling, 'late clock, settle');
    assert.equal(verifier.cancel(B), true);
    const canceled = await settledNow(canceling, 'late clock, cancel');
    const after = Date.now();
    for (const value of [settled.settledAt, canceled.settledAt]) {
      assert.equal(value >= before && value <= after, true, 'settledAt reads Date.now()');
    }
    assertSnapshot(settled, expected(A, { state: 'resolved', attemptId: 1, transport: FAKE,
      provenance: 'network', requestSent: true, finalUrl: A, status: 200, redirected: false,
      changed: false, redirects: [], hopCount: 0, startedAt: 100, settledAt: settled.settledAt,
      durationMs: 0 }));
    assertSnapshot(canceled, expected(B, { state: 'canceled', reason: 'canceled', attemptId: 2,
      transport: FAKE, provenance: 'network', requestSent: null, startedAt: 100,
      settledAt: canceled.settledAt, durationMs: 0 }));
    assert.deepEqual(reported, [nowError, monotonicError, nowError, monotonicError]);
    assert.equal(calls[1].request.signal.aborted, true);
    assert.equal(clock.pending, 0);
  }
  // D38
  {
    const getter = resolvedAt(A, []);
    Object.defineProperty(getter, 'finalUrl', { enumerable: true, get: () => A });
    const cases = [
      [resolvedAt(A, [], { status: 199 }), {}, 'status'],
      [resolvedAt(A, [], { status: 600 }), {}, 'status'],
      [resolvedAt(A, [], { status: 2.5 }), {}, 'status'],
      [resolvedAt(B, [step(A, B, 200)]), {}, 'status'],
      [resolvedAt('javascript:x', null), {}, 'url'],
      [resolvedAt('https://A.test/', null), {}, 'url'],
      [resolvedAt('https://a.test/#f', null), {}, 'url'],
      [resolvedAt('https://u:p@a.test/', null), {}, 'url'],
      [getter, {}, 'shape'],
      [{ outcome: 'blocked', requestSent: null }, {}, 'shape'],
      [{ outcome: 'unavailable', reason: 'queue_full', requestSent: false }, {}, 'reason'],
      [resolvedAt(B, [step('https://other.test/', B)]), {}, 'chain'],
      [resolvedAt(C, [step(A, B), step('https://x.test/', C)]), {}, 'chain'],
      [resolvedAt(C, [step(A, B), step(B, C)]), { maxHops: 1 }, 'count'],
      [resolvedAt(A, [], { requestSent: false, provenance: 'network' }), {}, 'request_sent'],
      [{ outcome: 'failed', reason: 'invalid_location', redirects: [step(A, 'javascript:x')],
        requestSent: true }, {}, 'url'],
      [resolvedAt(C, [step(A, B, 301, 'ftp:'), step(B, C)]), {}, 'scheme'],
      [{ outcome: 'failed', reason: 'blocked_scheme', redirects: [step(A, B, 302, 'ftp:')],
        requestSent: true }, {}, 'scheme'],
      [{ outcome: 'failed', reason: 'blocked_scheme', redirects: [step(A, null, 302, 'http:')],
        requestSent: true }, {}, 'scheme'],
      [resolvedAt(B, [{ ...step(A, B), extra: 1 }]), {}, 'shape'],
    ];
    assert.equal(cases.length, 20);
    for (const [observation, request, rule] of cases) {
      assertResolution(await observe(d, observation, request), invalidObservation(rule), rule);
    }
    // Further shapes: own __proto__, symbols, extra keys, class instances and a non-object.
    const own = JSON.parse('{"outcome":"resolved","finalUrl":"https://a.test/","status":200,' +
      '"redirects":[],"redirected":false,"requestSent":true,"__proto__":{"x":1}}');
    for (const observation of [own, { ...resolvedAt(A, []), [Symbol('s')]: 1 },
      { ...resolvedAt(A, []), reason: null }, new (class Obs {})(), 'resolved', null,
      { outcome: 'resolved', finalUrl: A, status: 200, redirects: [], requestSent: true }]) {
      assert.equal((await observe(d, observation)).detail, 'Invalid observation: shape');
    }
    assert.equal(({}).x, undefined, 'no prototype was changed');
    assert.equal((await observe(d, { outcome: 'failed', reason: 'timeout', redirects: null,
      requestSent: 'yes' })).detail, 'Invalid observation: request_sent');
    assert.equal((await observe(d, { ...resolvedAt(A, []), detail: 5 })).detail,
      'Invalid observation: detail');
    assert.equal((await observe(d, { outcome: 'failed', reason: 'redirect_loop',
      redirects: [step(A, B)], requestSent: true })).detail, 'Invalid observation: chain');
    assert.equal((await observe(d, { outcome: 'failed', reason: 'too_many_redirects',
      redirects: [], requestSent: true })).detail, 'Invalid observation: chain');
    assert.equal((await observe(d, { outcome: 'failed', reason: 'timeout',
      redirects: [step(A, null)], requestSent: true })).detail, 'Invalid observation: chain');
    assert.equal((await observe(d, { outcome: 'failed', reason: 'too_many_redirects',
      redirects: [step(A, B), step(B, C)], requestSent: true }, { maxHops: 0 })).detail,
    'Invalid observation: count');
    assertResolution(await observe(d, { outcome: 'failed', reason: 'redirect_loop',
      redirects: [step(A, B), step(B, A)], requestSent: true }), outcome({ outcome: 'failed',
      reason: 'redirect_loop', redirected: true, redirects: [step(A, B), step(B, A)],
      hopCount: 1 }));
    assertResolution(await observe(d, { outcome: 'failed', reason: 'invalid_location',
      redirects: [step(A, null, 302)], requestSent: true }), outcome({ outcome: 'failed',
      reason: 'invalid_location', redirected: false, redirects: [step(A, null, 302)],
      hopCount: 0 }));
  }
  // D39
  {
    assertResolution(await observe(d, resolvedAt(A, [], { provenance: 'network' }), {},
      { provenance: 'fixture' }), outcome({ outcome: 'unavailable',
      reason: 'invalid_observation', provenance: 'fixture', requestSent: null,
      detail: 'Invalid observation: provenance' }));
    assertResolution(await observe(d, resolvedAt(A, []), {}, { provenance: 'simulated' }),
      outcome({ outcome: 'unavailable', reason: 'invalid_observation', provenance: 'simulated',
        requestSent: null, detail: 'Invalid observation: request_sent' }));
    assertResolution(await observe(d, resolvedAt(A, [], { provenance: 'fixture' })),
      outcome({ provenance: 'fixture', finalUrl: A, status: 200, redirected: false,
        changed: false, redirects: [], hopCount: 0 }));
    assert.equal((await observe(d, resolvedAt(A, [], { provenance: 'bogus' }))).detail,
      'Invalid observation: provenance');
    assert.equal((await observe(d, { outcome: 'unavailable', reason: 'out_of_scope',
      requestSent: true }, {}, { provenance: 'simulated' })).detail,
    'Invalid observation: request_sent');
  }
  // D40
  {
    const detail = `a\u202eb\u0007c\u200bd\u061ce\ufeff${'x'.repeat(400)}`;
    const result = await observe(d, resolvedAt(A, [], { detail }));
    assert.equal(result.detail, `a\ufffdb\ufffdc\ufffdd\ufffde\ufffd${'x'.repeat(290)}`);
    assert.equal(Array.from(result.detail).length, 300);
    const astral = await observe(d, resolvedAt(A, [], { detail: '\u{1F600}'.repeat(301) }));
    assert.equal(astral.detail, '\u{1F600}'.repeat(300));
    const controls = await observe(d, resolvedAt(A, [], { detail: '\u0085\u2066\u007f\u200e' }));
    assert.equal(controls.detail, '\ufffd'.repeat(4));
    for (const label of ['', 'x'.repeat(81), 5]) {
      assert.throws(() => d.resolveDestination(fixedTransport(resolvedAt(A, []), { label }),
        { url: A }), TypeError, String(label).length);
      assert.throws(() => d.createDestinationVerifier({ transport: fixedTransport(null,
        { label }) }), TypeError);
      assert.throws(() => d.createPreparedTransport([], { label }), TypeError);
    }
    for (const [label, shown] of [['x\u202e', 'x\ufffd'], ['x\u200b', 'x\ufffd'],
      ['x'.repeat(80), 'x'.repeat(80)], ['\u{1F600}'.repeat(80), '\u{1F600}'.repeat(80)]]) {
      const shownResult = await observe(d, resolvedAt(A, []), {}, { label });
      assert.deepEqual(shownResult.transport, { kind: 'custom', label: shown });
    }
  }
  // D41
  {
    const clock = fakeClock();
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers });
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.snapshot.state]));
    const promise = verifier.resolve(A);
    await clock.advance(10);
    verifier.forget(A);
    assert.deepEqual(events, [['attempt', 'resolving'], ['forget', 'unverified']]);
    assertSnapshot(await promise, expected(A, { state: 'canceled', reason: 'cleared',
      attemptId: 1, transport: FAKE, provenance: 'network', requestSent: null, startedAt: 0,
      settledAt: 10, durationMs: 10 }));
    assertSnapshot(verifier.get(A), unverified(A));
    assert.equal(calls[0].request.signal.aborted, true);
    verifier.forget(A);
    verifier.forget('mailto:a@b.test');
    assert.equal(events.length, 2, 'forgetting an unverified or ineligible target emits nothing');
  }
  // D41: forgetting a running attempt frees its slot for the oldest queued attempt.
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock(40).timers,
      maxConcurrent: 1, maxQueued: 1, maxEntries: 8 });
    const running = verifier.resolve(A);
    const queued = verifier.resolve(C);
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state, change.snapshot.startedAt]));
    verifier.forget(A);
    assert.deepEqual(events, [['forget', A, 'unverified', null], ['start', C, 'resolving', 40]]);
    assert.deepEqual(calls.map(call => call.request.url), [A, C]);
    assert.equal((await running).reason, 'cleared');
    calls[1].resolve(resolvedAt(C, []));
    assert.equal((await queued).state, 'resolved');
  }
  // D41: forget() queues its event before the ending attempt's injected code runs. A
  // resolve() raised there (the transport's abort listener, the backstop's clearTimeout or the
  // clock) starts attempt 2 after the forget event, so get(), the last event and a binder agree.
  for (const where of ['abort listener', 'clearTimeout', 'now']) {
    const clock = fakeClock(1000);
    let verifier = null;
    let inner = null;
    const again = () => { inner = verifier.resolve(A); };
    const hooked = hookedTimers(clock.timers, where === 'now' ? 'now' : 'clearTimeout', again);
    const calls = [];
    const transport = { ...FAKE, provenance: 'network', resolve(request) {
      const pending = deferred();
      calls.push({ request, ...pending });
      if (where === 'abort listener' && calls.length === 1) {
        request.signal.addEventListener('abort', again);
      }
      return pending.promise;
    } };
    verifier = d.createDestinationVerifier({ transport, timers: hooked.timers });
    const first = verifier.resolve(A);
    const selection = d.createDestinationSelection(verifier);
    selection.select(A);
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state, change.snapshot.attemptId]));
    await clock.advance(10);
    if (where !== 'abort listener') hooked.arm();
    verifier.forget(A);
    assert.deepEqual(events, [['forget', A, 'unverified', null],
      ['attempt', A, 'resolving', 2]], where);
    assertSnapshot(verifier.get(A), expected(A, { state: 'resolving', attemptId: 2,
      transport: FAKE, provenance: 'network', startedAt: 1010 }), where);
    assert.equal(selection.view.snapshot, verifier.get(A), where);
    assert.deepEqual(calls.map(call => call.request.url), [A, A], where);
    assertSnapshot(await settledNow(first, where), expected(A, { state: 'canceled',
      reason: 'cleared', attemptId: 1, transport: FAKE, provenance: 'network', requestSent: null,
      startedAt: 1000, settledAt: 1010, durationMs: 10 }), where);
    calls[1].resolve(resolvedAt(A, []));
    assert.equal((await inner).attemptId, 2, where);
  }
  // D42
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      maxConcurrent: 2, maxQueued: 1, maxEntries: 8 });
    const settledPromise = verifier.resolve(A);
    calls[0].resolve(resolvedAt(A, []));
    await settledPromise;
    const pendingB = verifier.resolve(B);
    const pendingC = verifier.resolve(C);
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state]));
    verifier.clear();
    assert.deepEqual(events.slice().sort(), [['clear', A, 'unverified'],
      ['clear', B, 'unverified'], ['clear', C, 'unverified']]);
    for (const promise of [pendingB, pendingC]) {
      const value = await promise;
      assert.equal(value.state, 'canceled');
      assert.equal(value.reason, 'cleared');
    }
    assert.equal(calls[1].request.signal.aborted, true);
    assert.equal(calls[2].request.signal.aborted, true);
    const again = verifier.resolve(A);
    assert.equal(calls.length, 4);
    calls[3].resolve(resolvedAt(A, []));
    assert.equal((await again).attemptId, 4);
  }
  // D42: every entry is detached before the first clear event, so a listener that resolves
  // during clear() gets a free slot and starts at once, and one that frees a slot cannot start an
  // attempt that clear() is removing.
  {
    const clock = fakeClock(50);
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
      maxConcurrent: 1, maxQueued: 1, maxEntries: 8 });
    const X = 'https://x.test/';
    const running = verifier.resolve(A);
    const queued = verifier.resolve(B);
    const events = [];
    let resolvedX = null;
    verifier.subscribe(change => {
      events.push([change.cause, change.encodedUrl, change.snapshot.state]);
      if (change.cause === 'clear' && change.encodedUrl === B) resolvedX = verifier.resolve(X);
    });
    verifier.clear();
    assert.deepEqual(events, [['clear', A, 'unverified'], ['clear', B, 'unverified'],
      ['attempt', X, 'resolving']]);
    assert.deepEqual(calls.map(call => call.request.url), [A, X]);
    assert.equal(calls[0].request.signal.aborted, true);
    assertSnapshot(verifier.get(X), expected(X, { state: 'resolving', attemptId: 3,
      transport: FAKE, provenance: 'network', startedAt: 50 }));
    for (const promise of [running, queued]) assert.equal((await promise).reason, 'cleared');
    calls[1].resolve(resolvedAt(X, []));
    const settled = await resolvedX;
    assert.equal(settled.state, 'resolved');
    assert.equal(settled.attemptId, 3);
    assert.equal(verifier.get(X), settled);
    assert.equal(clock.pending, 0);
  }
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      maxConcurrent: 1, maxQueued: 2, maxEntries: 8 });
    const promises = [A, B, C].map(url => verifier.resolve(url));
    const events = [];
    verifier.subscribe(change => {
      events.push([change.cause, change.encodedUrl, change.snapshot.state]);
      if (change.cause === 'clear' && change.encodedUrl === B) verifier.forget(A);
    });
    verifier.clear();
    assert.deepEqual(events, [['clear', A, 'unverified'], ['clear', B, 'unverified'],
      ['clear', C, 'unverified']], 'one event per entry, none for the re-entrant forget');
    assert.deepEqual(calls.map(call => call.request.url), [A], 'C never reached the transport');
    for (const promise of promises) assert.equal((await promise).reason, 'cleared');
  }
  // D42: clear() is one change. Every clear event is queued before a listener or an ending
  // attempt's injected code runs, so a listener that resolves another cleared URL at the first
  // clear event starts that attempt after the last one: get(), the last event and a binder agree.
  {
    const clock = fakeClock(1000);
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers });
    for (const url of [A, B]) {
      const promise = verifier.resolve(url);
      calls.at(-1).resolve(resolvedAt(url, []));
      await promise;
    }
    const selection = d.createDestinationSelection(verifier);
    selection.select(B);
    const events = [];
    let again = null;
    verifier.subscribe(change => {
      events.push([change.cause, change.encodedUrl, change.snapshot.state,
        change.snapshot.attemptId]);
      if (change.cause === 'clear' && again === null) again = verifier.resolve(B);
    });
    verifier.clear();
    assert.deepEqual(events, [['clear', A, 'unverified', null], ['clear', B, 'unverified', null],
      ['attempt', B, 'resolving', 3]]);
    assertSnapshot(verifier.get(B), expected(B, { state: 'resolving', attemptId: 3,
      transport: FAKE, provenance: 'network', startedAt: 1000 }));
    assert.equal(selection.view.snapshot, verifier.get(B));
    assert.deepEqual(calls.map(call => call.request.url), [A, B, B]);
    calls[2].resolve(resolvedAt(B, []));
    assert.equal((await again).attemptId, 3);
  }
  // D42: an attempt that an ending attempt's injected code starts during clear() (here the
  // transport's abort listener) finds the slots free and the queue empty, and runs at once.
  {
    const clock = fakeClock(1000);
    const X = 'https://x.test/';
    let verifier = null;
    let started = null;
    const calls = [];
    const transport = { ...FAKE, provenance: 'network', resolve(request) {
      const pending = deferred();
      calls.push({ request, ...pending });
      if (request.url === A) {
        request.signal.addEventListener('abort', () => { started = verifier.resolve(X); });
      }
      return pending.promise;
    } };
    verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
      maxConcurrent: 1, maxQueued: 1, maxEntries: 8 });
    const promises = [A, B].map(url => verifier.resolve(url));
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state, change.snapshot.startedAt]));
    verifier.clear();
    assert.deepEqual(events, [['clear', A, 'unverified', null], ['clear', B, 'unverified', null],
      ['attempt', X, 'resolving', 1000]]);
    assert.deepEqual(calls.map(call => call.request.url), [A, X]);
    for (const promise of promises) assert.equal((await promise).reason, 'cleared');
    calls[1].resolve(resolvedAt(X, []));
    assert.equal((await started).state, 'resolved');
    assert.equal(clock.pending, 0);
  }
  // D43
  {
    const { transport } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.snapshot.state]));
    const pending = verifier.resolve(A);
    verifier.destroy();
    assert.deepEqual(events, [['attempt', 'resolving'], ['clear', 'unverified']]);
    assert.equal((await pending).reason, 'cleared');
    assert.equal(verifier.canResolve, false);
    verifier.destroy();
    assert.equal(events.length, 2);
    assert.throws(() => verifier.get(A), TypeError);
  }
  // D43: resolve() is refused from the moment destroy() starts, so a listener cannot start
  // or queue an attempt during the clear events; get() inside those listeners still works. First
  // with a free slot (A running), then with every slot taken (A running, B queued).
  const clearSeen = url => [['clear', url, 'unverified'], ['canResolve', false], ['get', true]];
  for (const [options, urls] of [[{}, [A]],
    [{ maxConcurrent: 1, maxQueued: 1, maxEntries: 8 }, [A, B]]]) {
    const clock = fakeClock();
    const { transport, calls } = pendingTransport();
    const reported = [];
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
      reportError: error => reported.push(error), ...options });
    const X = 'https://x.test/';
    const seen = [];
    verifier.subscribe(change => {
      seen.push([change.cause, change.encodedUrl, change.snapshot.state]);
      if (change.cause !== 'clear') return;
      seen.push(['canResolve', verifier.canResolve],
        ['get', verifier.get(change.encodedUrl) === change.snapshot]);
      verifier.resolve(X);
    });
    const promises = urls.map(url => verifier.resolve(url));
    assert.equal(clock.pending, 1);
    verifier.destroy();
    assert.deepEqual(seen, [...urls.map(url => ['attempt', url, 'resolving']),
      ...urls.flatMap(clearSeen)], JSON.stringify(options));
    assert.equal(reported.length, urls.length);
    for (const error of reported) {
      assert.equal(error instanceof TypeError, true);
      assert.equal(error.message, 'verifier.resolve() was called during destroy().');
    }
    assert.deepEqual(calls.map(call => call.request.url), [A], 'nothing starts during destroy()');
    assert.equal(calls[0].request.signal.aborted, true);
    assert.equal(clock.pending, 0, 'no timer survives destroy()');
    for (const promise of promises) assert.equal((await promise).reason, 'cleared');
    await clock.advance(60000);
    assert.equal(calls.length, 1);
    assert.equal(verifier.canResolve, false);
    assert.throws(() => verifier.resolve(X), TypeError);
  }
  // D43: a transport that ends its own attempt from inside resolve() leaves no timer.
  for (const action of ['destroy', 'clear', 'forget', 'cancel']) {
    const clock = fakeClock();
    let verifier = null;
    const transport = { ...FAKE, provenance: 'network', resolve() {
      if (action === 'destroy' || action === 'clear') verifier[action]();
      else verifier[action](A);
      return new Promise(() => {});
    } };
    verifier = d.createDestinationVerifier({ transport, timers: clock.timers });
    const settled = await verifier.resolve(A);
    assert.deepEqual([settled.state, settled.reason],
      ['canceled', action === 'cancel' ? 'canceled' : 'cleared'], action);
    assert.equal(clock.pending, 0, `${action}: no timer survives`);
  }
  // D43: a caller signal aborted from inside transport.resolve() ends the attempt
  // canceled/aborted and clears its backstop.
  {
    const clock = fakeClock();
    const controller = new AbortController();
    let seen = null;
    const transport = { ...FAKE, provenance: 'network', resolve(request) {
      seen = request;
      controller.abort();
      return new Promise(() => {});
    } };
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers });
    assertSnapshot(await verifier.resolve(A, { signal: controller.signal }), expected(A, {
      state: 'canceled', reason: 'aborted', attemptId: 1, transport: FAKE, provenance: 'network',
      requestSent: null, startedAt: 0, settledAt: 0, durationMs: 0 }));
    assert.equal(seen.signal.aborted, true);
    assert.equal(clock.pending, 0, 'the backstop is cleared');
  }
  // D43: an end raised from inside the clock while an attempt starts (timers.now() or
  // timers.monotonic(), for a new attempt and for a queued one) is that attempt's last change:
  // nothing is stored for it afterwards, so its promise, get() and the last event agree; the
  // transport is never called, no timer is left and the slot is free again.
  for (const member of ['now', 'monotonic']) {
    for (const path of ['attempt', 'start']) {
      for (const how of ['abort', 'cancel', 'forget', 'clear', 'destroy']) {
        const label = `${member}, ${path}, ${how}`;
        const clock = fakeClock(1000);
        const { transport, calls } = pendingTransport();
        const controller = new AbortController();
        const target = path === 'attempt' ? A : C;
        let verifier = null;
        const hooked = hookedTimers(clock.timers, member, () => {
          if (how === 'abort') controller.abort();
          if (how === 'cancel') verifier.cancel(target);
          if (how === 'forget') verifier.forget(target);
          if (how === 'clear') verifier.clear();
          if (how === 'destroy') verifier.destroy();
        });
        verifier = d.createDestinationVerifier({ transport, timers: hooked.timers,
          maxConcurrent: 1, maxQueued: 1, maxEntries: 8 });
        if (path === 'start') verifier.resolve(A);
        let promise = null;
        const events = [];
        verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
          change.snapshot.state, change.snapshot.attemptId]));
        if (path === 'attempt') {
          hooked.arm();
          promise = verifier.resolve(A, { signal: controller.signal });
        } else {
          promise = verifier.resolve(C, { signal: controller.signal });
          events.length = 0;
          verifier.subscribe(change => {
            if (change.cause === 'cancel' && change.encodedUrl === A) hooked.arm();
          });
          verifier.cancel(A);
        }
        const id = path === 'attempt' ? 1 : 2;
        const reason = { abort: 'aborted', cancel: 'canceled' }[how] ?? 'cleared';
        const value = await settledNow(promise, label);
        assertSnapshot(value, expected(target, { state: 'canceled', reason, attemptId: id,
          transport: FAKE, provenance: 'network', requestSent: null, settledAt: 1000 }), label);
        const ended = {
          abort: [['cancel', target, 'canceled', id]],
          cancel: [['cancel', target, 'canceled', id]],
          forget: [['forget', target, 'unverified', null]],
          clear: path === 'attempt' ? [['clear', A, 'unverified', null]]
            : [['clear', C, 'unverified', null], ['clear', A, 'unverified', null]],
        };
        ended.destroy = ended.clear;
        const before = path === 'attempt' ? [] : [['cancel', A, 'canceled', 1]];
        assert.deepEqual(events, [...before, ...ended[how]], label);
        assert.deepEqual(calls.map(call => call.request.url), path === 'attempt' ? [] : [A],
          label);
        assert.equal(clock.pending, 0, label);
        if (how === 'destroy') {
          assert.throws(() => verifier.get(target), TypeError);
          continue;
        }
        if (how === 'abort' || how === 'cancel') assert.equal(verifier.get(target), value, label);
        else assertSnapshot(verifier.get(target), unverified(target), label);
        verifier.resolve(B);
        assert.equal(calls.at(-1).request.url, B, `${label}: the slot is free`);
      }
    }
  }
  // D43: when that clock read then throws as well, its error is reported once and the
  // attempt stays canceled.
  {
    const clock = fakeClock(1000);
    const { transport, calls } = pendingTransport();
    const reported = [];
    const error = new Error('now broke after a cancel');
    let verifier = null;
    const hooked = hookedTimers(clock.timers, 'now', () => {
      verifier.cancel(A);
      throw error;
    });
    verifier = d.createDestinationVerifier({ transport, timers: hooked.timers,
      reportError: value => reported.push(value) });
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.snapshot.state]));
    hooked.arm();
    const canceled = await settledNow(verifier.resolve(A), 'now throws after a cancel');
    assertSnapshot(canceled, expected(A, { state: 'canceled', reason: 'canceled', attemptId: 1,
      transport: FAKE, provenance: 'network', requestSent: null, settledAt: 1000 }));
    assert.equal(verifier.get(A), canceled);
    assert.deepEqual(events, [['cancel', 'canceled']]);
    assert.deepEqual(reported, [error]);
    assert.equal(calls.length, 0);
    assert.equal(clock.pending, 0);
  }
  // D43 (call start): the same once the call itself starts. After the start event, the call reads
  // timers.monotonic() and then calls timers.setTimeout() for its backstop. An end raised inside
  // one of them (for a new attempt and for a queued one) is the attempt's last change: the
  // transport is never called, no timer is left and the slot is free again. When that member
  // then throws as well, its error is reported once; when it returns, nothing is reported.
  for (const member of ['monotonic', 'setTimeout']) {
    for (const path of ['attempt', 'start']) {
      for (const how of ['abort', 'cancel', 'forget', 'clear', 'destroy']) {
        for (const throws of [true, false]) {
          const label = `call start, ${member}, ${path}, ${how}, ${throws ? 'throws' : 'returns'}`;
          const clock = fakeClock(1000);
          const { transport, calls } = pendingTransport();
          const controller = new AbortController();
          const target = path === 'attempt' ? A : C;
          const error = new Error(`${member} broke after ${how}`);
          const reported = [];
          let verifier = null;
          const hooked = hookedTimers(clock.timers, member, () => {
            if (how === 'abort') controller.abort();
            if (how === 'cancel') verifier.cancel(target);
            if (how === 'forget') verifier.forget(target);
            if (how === 'clear') verifier.clear();
            if (how === 'destroy') verifier.destroy();
            if (throws) throw error;
          });
          verifier = d.createDestinationVerifier({ transport, timers: hooked.timers,
            reportError: value => reported.push(value), maxConcurrent: 1, maxQueued: 1,
            maxEntries: 8 });
          const events = [];
          // begin() has read the clock when the target's start is announced, so the next call
          // of `member` is the call's own.
          const subscribe = () => verifier.subscribe(change => {
            events.push([change.cause, change.encodedUrl, change.snapshot.state,
              change.snapshot.attemptId]);
            if (change.encodedUrl === target && change.cause === path) hooked.arm();
          });
          let promise = null;
          if (path === 'attempt') {
            subscribe();
            promise = verifier.resolve(A, { signal: controller.signal });
          } else {
            verifier.resolve(A);
            promise = verifier.resolve(C, { signal: controller.signal });
            subscribe();
            verifier.cancel(A);
          }
          const id = path === 'attempt' ? 1 : 2;
          const reason = { abort: 'aborted', cancel: 'canceled' }[how] ?? 'cleared';
          const value = await settledNow(promise, label);
          assertSnapshot(value, expected(target, { state: 'canceled', reason, attemptId: id,
            transport: FAKE, provenance: 'network', requestSent: null, startedAt: 1000,
            settledAt: 1000, durationMs: 0 }), label);
          const ended = {
            abort: [['cancel', target, 'canceled', id]],
            cancel: [['cancel', target, 'canceled', id]],
            forget: [['forget', target, 'unverified', null]],
            clear: path === 'attempt' ? [['clear', A, 'unverified', null]]
              : [['clear', A, 'unverified', null], ['clear', C, 'unverified', null]],
          };
          ended.destroy = ended.clear;
          const before = path === 'attempt' ? [['attempt', A, 'resolving', 1]]
            : [['cancel', A, 'canceled', 1], ['start', C, 'resolving', 2]];
          assert.deepEqual(events, [...before, ...ended[how]], label);
          assert.deepEqual(calls.map(call => call.request.url), path === 'attempt' ? [] : [A],
            label);
          assert.equal(clock.pending, 0, label);
          assert.deepEqual(reported, throws ? [error] : [], label);
          if (how === 'destroy') {
            assert.throws(() => verifier.get(target), TypeError);
            continue;
          }
          if (how === 'abort' || how === 'cancel') assert.equal(verifier.get(target), value, label);
          else assertSnapshot(verifier.get(target), unverified(target), label);
          verifier.resolve(B);
          assert.equal(calls.at(-1).request.url, B, `${label}: the slot is free`);
          assert.deepEqual(reported, throws ? [error] : [], `${label}: reported once`);
        }
      }
    }
  }
  // D44
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      maxConcurrent: 1, maxQueued: 1, maxEntries: 3 });
    const D = 'https://d.test/';
    const E = 'https://e.test/';
    for (const url of [A, B, C]) {
      const promise = verifier.resolve(url);
      calls.at(-1).resolve(resolvedAt(url, []));
      await promise;
    }
    verifier.get(A);
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state]));
    verifier.resolve(D);
    assert.deepEqual(events, [['evict', B, 'unverified'], ['attempt', D, 'resolving']]);
    assertSnapshot(verifier.get(B), unverified(B));
    assert.equal(verifier.get(A).state, 'resolved');
    events.length = 0;
    verifier.get(C);
    verifier.get(A);
    verifier.resolve(E);
    assert.deepEqual(events, [['evict', C, 'unverified'], ['attempt', E, 'resolving']]);
    assert.equal(verifier.get(D).state, 'resolving', 'a resolving entry is never evicted');
  }
  // D44: resolve() is one change. Its evict event is delivered after the new entry is in
  // place, so a listener that resolves the evicted URL makes room again (the store keeps its
  // bound) and queues behind the attempt that caused the eviction.
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      maxConcurrent: 1, maxQueued: 1, maxEntries: 3 });
    const D = 'https://d.test/';
    for (const url of [A, B, C]) {
      const promise = verifier.resolve(url);
      calls.at(-1).resolve(resolvedAt(url, []));
      await promise;
    }
    const events = [];
    let again = null;
    verifier.subscribe(change => {
      events.push([change.cause, change.encodedUrl, change.snapshot.state]);
      if (change.cause === 'evict' && again === null) again = verifier.resolve(change.encodedUrl);
    });
    verifier.resolve(D);
    assert.deepEqual(events, [['evict', A, 'unverified'], ['attempt', D, 'resolving'],
      ['evict', B, 'unverified'], ['attempt', A, 'resolving']]);
    assert.deepEqual(calls.map(call => call.request.url), [A, B, C, D]);
    assert.deepEqual([A, B, C, D].map(url => verifier.get(url).state),
      ['resolving', 'unverified', 'resolved', 'resolving']);
    calls[3].resolve(resolvedAt(D, []));
    await flush();
    assert.deepEqual(calls.map(call => call.request.url), [A, B, C, D, A]);
    calls[4].resolve(resolvedAt(A, []));
    assert.equal((await again).attemptId, 5);
  }
  // D44: the same URL resolved from that evict listener joins the attempt being admitted:
  // one promise, one transport call, and cancel() reaches it.
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      maxConcurrent: 2, maxQueued: 0, maxEntries: 3 });
    const D = 'https://d.test/';
    for (const url of [A, B, C]) {
      const promise = verifier.resolve(url);
      calls.at(-1).resolve(resolvedAt(url, []));
      await promise;
    }
    let inner = null;
    verifier.subscribe(change => {
      if (change.cause === 'evict' && inner === null) inner = verifier.resolve(D);
    });
    const outer = verifier.resolve(D);
    assert.equal(inner, outer);
    assert.deepEqual(calls.map(call => call.request.url), [A, B, C, D]);
    assert.equal(verifier.cancel(D), true);
    assert.equal(calls[3].request.signal.aborted, true);
    assert.equal(verifier.cancel(D), false);
    assert.equal((await outer).reason, 'canceled');
    assert.equal(verifier.get(D), await outer);
  }
  // D44: settling refreshes an entry's recency: B settled before A, so B is evicted.
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      maxConcurrent: 2, maxQueued: 0, maxEntries: 3 });
    const D = 'https://d.test/';
    const [first, second] = [A, B].map(url => verifier.resolve(url));
    calls[1].resolve(resolvedAt(B, []));
    await second;
    calls[0].resolve(resolvedAt(A, []));
    await first;
    const third = verifier.resolve(C);
    calls[2].resolve(resolvedAt(C, []));
    await third;
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
      change.snapshot.state]));
    verifier.resolve(D);
    assert.deepEqual(events, [['evict', B, 'unverified'], ['attempt', D, 'resolving']]);
  }
  // D45
  {
    const { transport, calls } = pendingTransport();
    const reported = [];
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      reportError: error => reported.push(error) });
    const log = [];
    const l2error = new Error('L2');
    let insideGet = null;
    verifier.subscribe(change => {
      log.push(`L1:${change.encodedUrl}`);
      if (change.encodedUrl === A && change.cause === 'attempt') {
        verifier.resolve(B);
        insideGet = verifier.get(B);
        assert.equal(calls.length, 0, 'each transport call waits until its event is delivered');
      }
    });
    const unsubscribe2 = verifier.subscribe(change => {
      log.push(`L2:${change.encodedUrl}`);
      unsubscribe2();
      throw l2error;
    });
    verifier.subscribe(change => log.push(`L3:${change.encodedUrl}`));
    verifier.resolve(A);
    assert.deepEqual(log, [`L1:${A}`, `L2:${A}`, `L3:${A}`, `L1:${B}`, `L3:${B}`]);
    assert.deepEqual(reported, [l2error]);
    assert.equal(insideGet.state, 'resolving', 'get() inside a listener sees the new snapshot');
    assert.deepEqual(calls.map(call => call.request.url), [A, B]);
    unsubscribe2();
    const order = [];
    let unsubscribeM2 = null;
    verifier.subscribe(() => { order.push('M1'); unsubscribeM2(); });
    unsubscribeM2 = verifier.subscribe(() => order.push('M2'));
    verifier.cancel(A);
    assert.deepEqual(order, ['M1'], 'a listener removed during dispatch is not called');
    assert.throws(() => verifier.subscribe('listener'), TypeError);
  }
  // D46
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers,
      maxConcurrent: 4 });
    verifier.resolve('https://x.io');
    verifier.resolve('https://x.io/');
    assert.equal(calls.length, 2, 'two exact strings are two entries');
    assert.deepEqual(calls.map(call => call.request.url), ['https://x.io/', 'https://x.io/']);
    assert.notEqual(verifier.get('https://x.io'), verifier.get('https://x.io/'));
    const fromUrl = verifier.resolve(candidate({ kind: 'url', url: 'https://y.io/' }));
    const fromCard = verifier.resolve(candidate({ ...MECARD_EXAMPLE, url: 'https://y.io/' }));
    assert.equal(fromUrl, fromCard);
    assert.equal(calls.length, 3, 'a url payload and a me_card with one string share one entry');
    const forged = { eligible: true, source: 'url', encodedUrl: 'https://z.io/',
      requestUrl: 'http://10.0.0.1/', reason: null };
    verifier.resolve(forged);
    assert.equal(calls[3].request.url, 'https://z.io/', 'requestUrl is recomputed');
  }
  // D47
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const events = [];
    verifier.subscribe(change => events.push([change.cause, change.snapshot.attemptId]));
    verifier.resolve(A);
    verifier.cancel(A);
    const second = verifier.resolve(A);
    calls[0].resolve(resolvedAt(B, [step(A, B)]));
    await flush();
    assert.equal(verifier.get(A).state, 'resolving', "attempt 1's late result is dropped");
    calls[1].resolve(resolvedAt(A, []));
    const settled = await second;
    assert.equal(settled.attemptId, 2);
    assert.equal(settled.finalUrl, A);
    assert.deepEqual(events, [['attempt', 1], ['cancel', 1], ['attempt', 2], ['settle', 2]]);
  }
  // D47: a write that injected code superseded is not stored; the promise still gets the
  // call's own snapshot. resolve() settling at once (no transport, an aborted signal, a full
  // queue): A forgotten or resolved again from inside timers.now() keeps that newer state.
  for (const kind of ['no_transport', 'aborted', 'queue_full']) {
    for (const how of ['forget', 'resolve']) {
      const label = `${kind}, ${how}`;
      const clock = fakeClock(1000);
      const { transport, calls } = pendingTransport();
      let verifier = null;
      let inner = null;
      const hooked = hookedTimers(clock.timers, 'now', () => {
        if (how === 'forget') verifier.forget(A);
        else inner = verifier.resolve(A);
      });
      verifier = d.createDestinationVerifier({ transport: kind === 'no_transport' ? null
        : transport, timers: hooked.timers, maxConcurrent: 1, maxQueued: 0, maxEntries: 8 });
      if (kind === 'queue_full') verifier.resolve(B);
      const events = [];
      verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
        change.snapshot.state, change.snapshot.attemptId]));
      const controller = new AbortController();
      if (kind === 'aborted') controller.abort();
      hooked.arm();
      const outer = await settledNow(verifier.resolve(A, { signal: controller.signal }), label);
      const id = kind === 'queue_full' ? 2 : 1;
      const used = kind === 'no_transport' ? {} : { transport: FAKE, provenance: 'network' };
      const fields = { no_transport: { state: 'unavailable', reason: 'no_transport' },
        aborted: { state: 'canceled', reason: 'aborted' },
        queue_full: { state: 'unavailable', reason: 'queue_full' } }[kind];
      assertSnapshot(outer, expected(A, { ...fields, attemptId: id, ...used, requestSent: false,
        settledAt: 1000 }), label);
      if (how === 'forget') {
        assert.deepEqual(events, [['forget', A, 'unverified', null]], label);
        assertSnapshot(verifier.get(A), unverified(A), label);
        continue;
      }
      const newer = kind === 'aborted'
        ? expected(A, { state: 'resolving', attemptId: 2, ...used, startedAt: 1000 })
        : expected(A, { ...fields, attemptId: id + 1, ...used, requestSent: false,
          settledAt: 1000 });
      assert.deepEqual(events, [['attempt', A, newer.state, id + 1]], label);
      assertSnapshot(verifier.get(A), newer, label);
      if (kind !== 'aborted') assert.equal(await inner, verifier.get(A), label);
      assert.deepEqual(calls.map(call => call.request.url),
        { no_transport: [], aborted: [A], queue_full: [B] }[kind], label);
    }
  }
  // D47: the same when the caller signal's removeEventListener raises the forget() or the
  // resolve() while the immediate result detaches it; no listener stays on that signal.
  for (const kind of ['no_transport', 'queue_full']) {
    for (const how of ['forget', 'resolve']) {
      const label = `removeEventListener, ${kind}, ${how}`;
      const { transport, calls } = pendingTransport();
      let verifier = null;
      let inner = null;
      const hooked = hookedSignal(() => {
        if (how === 'forget') verifier.forget(A);
        else inner = verifier.resolve(A);
      });
      verifier = d.createDestinationVerifier({ transport: kind === 'no_transport' ? null
        : transport, timers: fakeClock(1000).timers, maxConcurrent: 1, maxQueued: 0,
        maxEntries: 8 });
      if (kind === 'queue_full') verifier.resolve(B);
      const events = [];
      verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
        change.snapshot.state, change.snapshot.attemptId]));
      hooked.arm();
      const outer = await settledNow(verifier.resolve(A, { signal: hooked.signal }), label);
      const id = kind === 'queue_full' ? 2 : 1;
      const used = kind === 'no_transport' ? {} : { transport: FAKE, provenance: 'network' };
      const fields = kind === 'no_transport' ? { state: 'unavailable', reason: 'no_transport' }
        : { state: 'unavailable', reason: 'queue_full' };
      assertSnapshot(outer, expected(A, { ...fields, attemptId: id, ...used, requestSent: false,
        settledAt: 1000 }), label);
      assert.deepEqual(hooked.held, [], label);
      if (how === 'forget') {
        assert.deepEqual(events, [['forget', A, 'unverified', null]], label);
        assertSnapshot(verifier.get(A), unverified(A), label);
        continue;
      }
      const newer = expected(A, { ...fields, attemptId: id + 1, ...used, requestSent: false,
        settledAt: 1000 });
      assert.deepEqual(events, [['attempt', A, 'unavailable', id + 1]], label);
      assertSnapshot(verifier.get(A), newer, label);
      assert.equal(await inner, verifier.get(A), label);
      assert.deepEqual(calls.map(call => call.request.url),
        kind === 'queue_full' ? [B] : [], label);
    }
  }
  // D47: the same for a settle. forget() raised from inside its timers.now() or the caller
  // signal's removeEventListener leaves A unverified with no later event; resolve() raised there
  // starts attempt 2, whose state stays stored; cancel() raised there finds nothing to cancel.
  for (const where of ['now', 'removeEventListener']) {
    for (const how of ['forget', 'resolve', 'cancel']) {
      const label = `${where}, ${how}`;
      const clock = fakeClock(1000);
      const { transport, calls } = pendingTransport();
      let verifier = null;
      let inner = null;
      let canceled = null;
      const raise = () => {
        if (how === 'forget') verifier.forget(A);
        if (how === 'resolve') inner = verifier.resolve(A);
        if (how === 'cancel') canceled = verifier.cancel(A);
      };
      const hooked = hookedTimers(clock.timers, 'now', raise);
      const caller = hookedSignal(raise);
      verifier = d.createDestinationVerifier({ transport, timers: hooked.timers });
      const first = where === 'now' ? verifier.resolve(A)
        : verifier.resolve(A, { signal: caller.signal });
      const events = [];
      verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
        change.snapshot.state, change.snapshot.attemptId]));
      await clock.advance(20);
      if (where === 'now') hooked.arm();
      else caller.arm();
      calls[0].resolve(resolvedAt(A, []));
      const settled = await settledNow(first, label);
      assertSnapshot(settled, expected(A, { state: 'resolved', attemptId: 1, transport: FAKE,
        provenance: 'network', requestSent: true, finalUrl: A, status: 200, redirected: false,
        changed: false, redirects: [], hopCount: 0, startedAt: 1000, settledAt: 1020,
        durationMs: 20 }), label);
      if (how === 'forget') {
        assert.deepEqual(events, [['forget', A, 'unverified', null]], label);
        assertSnapshot(verifier.get(A), unverified(A), label);
      } else if (how === 'resolve') {
        assert.deepEqual(events, [['attempt', A, 'resolving', 2]], label);
        assertSnapshot(verifier.get(A), expected(A, { state: 'resolving', attemptId: 2,
          transport: FAKE, provenance: 'network', startedAt: 1020 }), label);
        assert.deepEqual(calls.map(call => call.request.url), [A, A], label);
        calls[1].resolve(resolvedAt(A, []));
        assert.equal(await inner, verifier.get(A), label);
      } else {
        assert.equal(canceled, false, label);
        assert.deepEqual(events, [['settle', A, 'resolved', 1]], label);
        assert.equal(verifier.get(A), settled, label);
      }
      assert.deepEqual(caller.held, [], label);
      assert.equal(clock.pending, 0, label);
    }
  }
  // D47: the same for cancel(). A forget() or a resolve() raised while the ending attempt
  // runs injected code (its backstop's clearTimeout, the transport's abort listener, the clock)
  // supersedes the canceled snapshot, which only the promise receives.
  for (const where of ['clearTimeout', 'abort listener', 'now']) {
    for (const how of ['forget', 'resolve']) {
      const label = `${where}, ${how}`;
      const clock = fakeClock(1000);
      let verifier = null;
      let inner = null;
      const raise = () => {
        if (how === 'forget') verifier.forget(A);
        else inner = verifier.resolve(A);
      };
      const hooked = hookedTimers(clock.timers, where === 'now' ? 'now' : 'clearTimeout', raise);
      const calls = [];
      const transport = { ...FAKE, provenance: 'network', resolve(request) {
        const pending = deferred();
        calls.push({ request, ...pending });
        if (where === 'abort listener' && calls.length === 1) {
          request.signal.addEventListener('abort', raise);
        }
        return pending.promise;
      } };
      verifier = d.createDestinationVerifier({ transport, timers: hooked.timers });
      const first = verifier.resolve(A);
      const events = [];
      verifier.subscribe(change => events.push([change.cause, change.encodedUrl,
        change.snapshot.state, change.snapshot.attemptId]));
      await clock.advance(10);
      if (where !== 'abort listener') hooked.arm();
      assert.equal(verifier.cancel(A), true, label);
      assertSnapshot(await settledNow(first, label), expected(A, { state: 'canceled',
        reason: 'canceled', attemptId: 1, transport: FAKE, provenance: 'network',
        requestSent: null, startedAt: 1000, settledAt: 1010, durationMs: 10 }), label);
      assert.equal(calls[0].request.signal.aborted, true, label);
      if (how === 'forget') {
        assert.deepEqual(events, [['forget', A, 'unverified', null]], label);
        assertSnapshot(verifier.get(A), unverified(A), label);
        assert.equal(clock.pending, 0, label);
        continue;
      }
      assert.deepEqual(events, [['attempt', A, 'resolving', 2]], label);
      assertSnapshot(verifier.get(A), expected(A, { state: 'resolving', attemptId: 2,
        transport: FAKE, provenance: 'network', startedAt: 1010 }), label);
      assert.deepEqual(calls.map(call => call.request.url), [A, A], label);
      calls[1].resolve(resolvedAt(A, []));
      assert.equal(await inner, verifier.get(A), label);
    }
  }
  // D48
  {
    const verifier = d.createDestinationVerifier({ transport: pendingTransport().transport });
    const views = [];
    const selection = d.createDestinationSelection(verifier,
      { onChange: view => views.push(view) });
    assert.equal(selection.view, null);
    const view = selection.select(A);
    assert.equal(selection.select(A), view);
    assert.equal(views.length, 1);
    assert.deepEqual(view, { candidate: candidate(A), snapshot: verifier.get(A) });
    assert.equal(view.snapshot, verifier.get(A));
    assert.ok(Object.isFrozen(view));
    assert.equal(selection.view, view);
  }
  // D48: when verifier.get() throws, select() changes nothing: the previous selection and
  // view stay (its events still update the view) and selecting the same candidate again retries.
  {
    const inner = d.createDestinationVerifier({ transport: pendingTransport().transport,
      timers: fakeClock().timers });
    const failure = new Error('get failed');
    let failures = 1;
    const verifier = {
      subscribe: listener => inner.subscribe(listener),
      cancel: target => inner.cancel(target),
      get(target) {
        if (target.encodedUrl === B && failures > 0) {
          failures -= 1;
          throw failure;
        }
        return inner.get(target);
      },
    };
    const views = [];
    const selection = d.createDestinationSelection(verifier,
      { onChange: view => views.push(view) });
    const first = selection.select(A);
    assert.throws(() => selection.select(B), error => error === failure);
    assert.equal(selection.view, first);
    inner.resolve(A);
    assert.deepEqual(selection.view, { candidate: candidate(A), snapshot: inner.get(A) });
    assert.equal(selection.view.snapshot.state, 'resolving');
    const retried = selection.select(B);
    assert.deepEqual(retried, { candidate: candidate(B), snapshot: inner.get(B) });
    assert.equal(retried.snapshot, inner.get(B));
    assert.equal(selection.view, retried);
    assert.deepEqual(views.map(view => view.candidate.encodedUrl), [A, A, B]);
  }
  // D48: a binder kept after its verifier was destroyed refuses every select() of a new
  // candidate and keeps its last view.
  {
    const verifier = d.createDestinationVerifier({ transport: pendingTransport().transport,
      timers: fakeClock().timers });
    const selection = d.createDestinationSelection(verifier);
    const first = selection.select(A);
    verifier.destroy();
    for (const round of [1, 2]) {
      assert.throws(() => selection.select(B), { name: 'TypeError',
        message: 'verifier.get() was called after destroy().' }, `round ${round}`);
      assert.equal(selection.view, first, `round ${round}`);
    }
  }
  // D49
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const views = [];
    const selection = d.createDestinationSelection(verifier,
      { onChange: view => views.push(view) });
    selection.select(A);
    const resolving = verifier.resolve(A);
    assert.equal(views.length, 2);
    assert.equal(views[1].snapshot.state, 'resolving');
    selection.select(B);
    assert.equal(views.length, 3);
    calls[0].resolve(resolvedAt(A, []));
    await resolving;
    assert.equal(views.length, 3, 'no onChange for the deselected entry');
    assert.equal(selection.view.candidate.encodedUrl, B);
    assertSnapshot(selection.view.snapshot, unverified(B));
    assert.equal(verifier.get(A).state, 'resolved');
    assert.equal(selection.select(A).snapshot, verifier.get(A));
  }
  // D50
  for (const cancelOnDeselect of [true, undefined]) {
    const { transport } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const selection = d.createDestinationSelection(verifier,
      cancelOnDeselect === undefined ? undefined : { cancelOnDeselect });
    selection.select(A);
    verifier.resolve(A);
    selection.select(B);
    const state = verifier.get(A);
    if (cancelOnDeselect) {
      assert.equal(state.state, 'canceled');
      assert.equal(state.reason, 'canceled');
    } else {
      assert.equal(state.state, 'resolving');
    }
  }
  assert.throws(() => d.createDestinationSelection(null), TypeError);
  assert.throws(() => d.createDestinationSelection(d.createDestinationVerifier({ transport: null }),
    { cancelOnDeselect: 'yes' }), TypeError);
  // D51
  {
    const { transport, calls } = pendingTransport();
    const verifier = d.createDestinationVerifier({ transport, timers: fakeClock().timers });
    const views = [];
    const selection = d.createDestinationSelection(verifier,
      { onChange: view => views.push(view) });
    const view = selection.select(detection({ kind: 'text' }, 'utf8', 'hello'));
    assert.deepEqual(view, { candidate: { eligible: false, source: null, encodedUrl: null,
      requestUrl: null, reason: 'no_url' }, snapshot: null });
    selection.select(A);
    assert.equal(selection.select(null), null);
    assert.equal(selection.view, null);
    assert.equal(views.length, 3);
    assert.equal(views[2], null);
    selection.select(A);
    selection.destroy();
    assert.equal(selection.view, null);
    const count = views.length;
    const promise = verifier.resolve(A);
    calls[0].resolve(resolvedAt(A, []));
    await promise;
    assert.equal(views.length, count, 'no onChange after destroy');
    selection.destroy();
    assert.throws(() => selection.select(A), TypeError);
  }
  // D52
  {
    let seen = null;
    const clock = fakeClock();
    const transport = { ...FAKE, provenance: 'network', resolve(request) {
      seen = request;
      return Promise.resolve(resolvedAt(request.url, []));
    } };
    const result = await d.resolveDestination(transport, { url: A }, { timers: clock.timers });
    assert.equal(seen.url, A);
    assert.equal(seen.maxHops, 10);
    assert.equal(seen.timeoutMs, 10000);
    assert.equal(seen.signal.aborted, false);
    assert.equal(typeof seen.signal.addEventListener, 'function');
    assertResolution(result, outcome({ finalUrl: A, status: 200, redirected: false,
      changed: false, redirects: [], hopCount: 0 }));
    assert.equal(clock.pending, 0);
  }
  // D53
  {
    const transport = fixedTransport(resolvedAt(A, []));
    for (const url of ['https://A.test/', 'https://a.test/#x', 'ftp://a.test/',
      'https://u:p@a.test/', 'https://a.test/a b', 'https://a.test', 42, undefined]) {
      assert.throws(() => d.resolveDestination(transport, { url }), TypeError, String(url));
    }
    assert.throws(() => d.resolveDestination(transport, { url: A, maxHops: 21 }), RangeError);
    assert.throws(() => d.resolveDestination(transport, { url: A, timeoutMs: 0 }), RangeError);
    assert.throws(() => d.resolveDestination(transport, { url: A, maxHops: 1.5 }), RangeError);
    assert.throws(() => d.resolveDestination(transport, { url: A, maxHops: '2' }), TypeError);
    assert.throws(() => d.resolveDestination(transport, { url: A, signal: {} }), TypeError);
    assert.throws(() => d.resolveDestination(transport, null), TypeError);
    assert.throws(() => d.resolveDestination(null, { url: A }), TypeError);
    assert.throws(() => d.resolveDestination(transport, { url: A }, { timers: 1 }), TypeError);
  }
  // D54
  {
    const clock = fakeClock();
    const { transport, calls } = pendingTransport();
    const controller = new AbortController();
    const promise = d.resolveDestination(transport, { url: A, signal: controller.signal },
      { timers: clock.timers });
    controller.abort();
    assertResolution(await promise, outcome({ outcome: 'canceled', reason: 'aborted',
      requestSent: null }));
    assert.equal(calls[0].request.signal.aborted, true);
    assert.equal(clock.pending, 0);
    const early = new AbortController();
    early.abort();
    const { transport: unused, calls: none } = pendingTransport();
    assertResolution(await d.resolveDestination(unused, { url: A, signal: early.signal },
      { timers: clock.timers }), outcome({ outcome: 'canceled', reason: 'aborted',
      requestSent: false }));
    assert.equal(none.length, 0);
  }
  // D54: a caller abort raised while the call starts, inside timers.setTimeout or inside
  // transport.resolve(), is seen at once: canceled/aborted, the request signal aborted, and
  // neither a timer nor a listener is left.
  for (const where of ['setTimeout', 'transport']) {
    const clock = fakeClock();
    const controller = new AbortController();
    const requests = [];
    const transport = { ...FAKE, provenance: 'network', resolve(request) {
      requests.push(request);
      if (where === 'transport') controller.abort();
      return new Promise(() => {});
    } };
    const timers = where === 'transport' ? clock.timers : { ...clock.timers,
      setTimeout(callback, ms) {
        controller.abort();
        return Reflect.apply(clock.timers.setTimeout, undefined, [callback, ms]);
      } };
    const result = await settledNow(d.resolveDestination(transport,
      { url: A, signal: controller.signal }, { timers }), where);
    assertResolution(result, outcome({ outcome: 'canceled', reason: 'aborted',
      requestSent: where === 'transport' ? null : false }), where);
    assert.equal(requests.length, where === 'transport' ? 1 : 0, where);
    if (where === 'transport') assert.equal(requests[0].signal.aborted, true);
    assert.equal(clock.pending, 0, where);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0, where);
  }
  // D55
  {
    const error = new RangeError('transport broke');
    const result = await d.resolveDestination({ ...FAKE, provenance: 'network',
      resolve: () => Promise.reject(error) }, { url: A }, { timers: fakeClock().timers });
    assertResolution(result, outcome({ outcome: 'unavailable', reason: 'transport_error',
      requestSent: null, detail: 'Transport threw' }));
    assert.equal(result.cause, error);
    assert.equal(Object.getOwnPropertyDescriptor(result, 'cause').enumerable, false);
    assert.equal(JSON.stringify(result).includes('transport broke'), false);
  }
  // D55: a call that has ended leaves no listener on the caller's signal, also when the
  // transport throws synchronously.
  {
    const controller = new AbortController();
    const error = new Error('transport broke');
    for (const [resolve, reason] of [[() => { throw error; }, 'transport_error'],
      [() => Promise.reject(error), 'transport_error'],
      [() => Promise.resolve(resolvedAt(A, [])), null]]) {
      const clock = fakeClock();
      const result = await d.resolveDestination({ ...FAKE, provenance: 'network', resolve },
        { url: A, signal: controller.signal }, { timers: clock.timers });
      assert.equal(result.reason, reason);
      assert.equal(getEventListeners(controller.signal, 'abort').length, 0, String(resolve));
      assert.equal(clock.pending, 0);
    }
  }
  // D55: timers that throw before the transport is called end the call unavailable/
  // transport_error, detail 'Timers threw', requestSent false, with the error as cause. Nothing
  // is sent and no timer or listener is left.
  for (const member of ['monotonic', 'setTimeout']) {
    const clock = fakeClock();
    const error = new Error(`${member} broke`);
    const controller = new AbortController();
    const { transport, calls } = pendingTransport();
    const result = await settledNow(d.resolveDestination(transport,
      { url: A, signal: controller.signal },
      { timers: brokenTimers(clock.timers, member, error) }), member);
    assertResolution(result, outcome({ outcome: 'unavailable', reason: 'transport_error',
      requestSent: false, detail: 'Timers threw' }), member);
    assert.equal(result.cause, error, member);
    assert.equal(calls.length, 0, member);
    assert.equal(clock.pending, 0, member);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0, member);
  }
  // D55: later failures cannot strand the call. A monotonic clock that breaks once the
  // transport runs gives durationMs 0. A backstop that clearTimeout cannot clear stays armed
  // and does nothing when it fires.
  {
    const clock = fakeClock();
    const { transport, calls } = pendingTransport();
    const promise = d.resolveDestination(transport, { url: A }, { timers: brokenTimers(
      clock.timers, 'monotonic', new Error('monotonic broke late'), count => count >= 2) });
    await clock.advance(30);
    calls[0].resolve(resolvedAt(A, []));
    assertResolution(await settledNow(promise, 'late monotonic'), outcome({ finalUrl: A,
      status: 200, redirected: false, changed: false, redirects: [], hopCount: 0 }));
    assert.equal(clock.pending, 0);
  }
  {
    const clock = fakeClock();
    const { transport, calls } = pendingTransport();
    const promise = d.resolveDestination(transport, { url: A, timeoutMs: 1000 },
      { timers: brokenTimers(clock.timers, 'clearTimeout', new Error('clearTimeout broke')) });
    await clock.advance(30);
    calls[0].resolve(resolvedAt(A, []));
    const result = await settledNow(promise, 'clearTimeout');
    assertResolution(result, outcome({ finalUrl: A, status: 200, redirected: false,
      changed: false, redirects: [], hopCount: 0, durationMs: 30 }));
    assert.equal(clock.pending, 1, 'the backstop could not be cleared');
    await clock.advance(2000);
    assert.equal(clock.pending, 0);
    assert.equal(calls[0].request.signal.aborted, false, 'the late backstop aborts nothing');
  }
  // D55: a caller signal that cannot take the abort listener is refused synchronously,
  // before anything starts; a signal whose removeEventListener throws cannot strand the call.
  {
    const real = new AbortController().signal;
    for (const signal of [{ aborted: false, removeEventListener() {},
      addEventListener() { throw new TypeError('addEventListener refused'); } },
    { get aborted() { return real.aborted; }, addEventListener: real.addEventListener,
      removeEventListener: real.removeEventListener }]) {
      const clock = fakeClock();
      const { transport, calls } = pendingTransport();
      assert.throws(() => d.resolveDestination(transport, { url: A, signal },
        { timers: clock.timers }), error => error instanceof TypeError &&
        error.message === 'request.signal must be an AbortSignal.' &&
        error.cause instanceof TypeError);
      assert.equal(calls.length, 0);
      assert.equal(clock.pending, 0);
    }
    const signal = { aborted: false, addEventListener() {},
      removeEventListener() { throw new Error('removeEventListener broke'); } };
    const { transport, calls } = pendingTransport();
    const promise = d.resolveDestination(transport, { url: A, signal },
      { timers: fakeClock().timers });
    calls[0].resolve(resolvedAt(A, []));
    assert.equal((await settledNow(promise, 'removeEventListener')).outcome, 'resolved');
  }
  // D55: a request.signal that throws on the first read of `aborted`, `addEventListener` or
  // `removeEventListener` is refused with TypeError whose cause is what it threw, before anything
  // starts.
  for (const member of ['aborted', 'addEventListener', 'removeEventListener']) {
    const clock = fakeClock();
    const thrown = new Error(`${member} read broke`);
    const signal = { aborted: false, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(signal, member, { get() { throw thrown; } });
    const { transport, calls } = pendingTransport();
    assert.throws(() => d.resolveDestination(transport, { url: A, signal },
      { timers: clock.timers }), error => error instanceof TypeError &&
      error.message === 'request.signal must be an AbortSignal.' && error.cause === thrown,
    member);
    assert.equal(calls.length, 0, member);
    assert.equal(clock.pending, 0, member);
  }
  // D60 (parent part): an injected fetch never bypasses the server-runtime guard, also under a
  // DOM shim that defines location on Node.
  {
    const calls = [];
    const fetch = (...args) => { calls.push(args); return Promise.reject(new TypeError('no')); };
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'location');
    const shim = { href: 'http://127.0.0.1:5273/', origin: 'http://127.0.0.1:5273',
      protocol: 'http:' };
    try {
      for (const page of [undefined, shim]) {
        if (page !== undefined) globalThis.location = page;
        for (const transport of [d.createFetchTransport({ scope: 'network', fetch }),
          d.createFetchTransport({ scope: 'network' }),
          d.createFetchTransport({ scope: 'fixture', fixtureOrigin: 'http://127.0.0.1:5279',
            fetch })]) {
          const url = transport.provenance === 'fixture' ? 'http://127.0.0.1:5279/ok' : A;
          const result = await d.resolveDestination(transport, { url },
            { timers: fakeClock().timers });
          assert.equal(result.outcome, 'unavailable', String(page && page.href));
          assert.equal(result.reason, 'transport_unsupported');
          assert.equal(result.requestSent, false);
          assert.equal(result.detail, 'Runtime not supported');
        }
      }
    } finally {
      if (saved) Object.defineProperty(globalThis, 'location', saved);
      else delete globalThis.location;
    }
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, 'location'), saved);
    assert.equal(calls.length, 0);
  }
  // D56..D62, the fetch part of D71 and the location cases of D67 (browser-like child).
  {
    const child = spawnSync(nodeProcess.execPath, [SELF], { encoding: 'utf8', timeout: 120000,
      env: { ...nodeProcess.env, QRSCAN_DESTINATION_CHILD: 'browserlike' } });
    assert.equal(child.status, 0, `browser-like child failed:\n${child.stdout}\n${child.stderr}`);
    assert.match(child.stdout, /PASS browser-like child: D56 D57 D58 D59 D60 D61 D62 D67 D71/);
  }
  // D63
  {
    const clock = fakeClock();
    for (const [t, budget] of [[10000, 9000], [500, 450], [1, 1]]) {
      const calls = [];
      const transport = d.createEndpointTransport({ endpoint: 'http://127.0.0.1:9/api/destination',
        label: 'Test endpoint', timers: clock.timers,
        fetch: function fetch(input, init) {
          calls.push({ self: this, input, init });
          return new Promise(() => {});
        } });
      assert.deepEqual([transport.kind, transport.label, transport.provenance],
        ['endpoint', 'Test endpoint', 'network']);
      const controller = new AbortController();
      const pending = transport.resolve({ url: A, maxHops: 10, timeoutMs: t,
        signal: controller.signal });
      assert.equal(calls.length, 1);
      const { self, input, init } = calls[0];
      assert.equal(self, undefined);
      assert.equal(input, 'http://127.0.0.1:9/api/destination');
      assert.deepEqual(Object.keys(init), ['method', 'credentials', 'cache', 'redirect', 'headers',
        'body', 'signal']);
      const { signal, ...rest } = init;
      assert.deepEqual(rest, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        redirect: 'error', headers: { 'content-type': 'application/json',
          accept: 'application/json' },
        body: `{"version":1,"url":"https://a.test/","maxHops":10,"timeoutMs":${budget}}` });
      assert.equal(signal.aborted, false);
      controller.abort();
      await assert.rejects(pending);
      assert.equal(signal.aborted, true);
    }
    assert.equal(clock.pending, 0);
    const calls = [];
    const withHeaders = d.createEndpointTransport({ endpoint: 'http://127.0.0.1:9/api',
      label: 'Test endpoint', credentials: 'include', headers: { 'x-csrf-token': 'abc' },
      timers: clock.timers, fetch: (input, init) => {
        calls.push(init);
        return new Promise(() => {});
      } });
    const controller = new AbortController();
    const pending = withHeaders.resolve({ url: A, maxHops: 3, timeoutMs: 2000,
      signal: controller.signal });
    assert.deepEqual(calls[0].headers, { 'x-csrf-token': 'abc',
      'content-type': 'application/json', accept: 'application/json' });
    assert.equal(calls[0].credentials, 'include');
    assert.equal(calls[0].body,
      '{"version":1,"url":"https://a.test/","maxHops":3,"timeoutMs":1800}');
    controller.abort();
    await assert.rejects(pending);
  }
  // D64
  {
    const S2 = [step(A, B, 301), step(B, C, 302)];
    const cases = [
      [wire({ finalUrl: C, redirected: true, redirects: S2 }), {},
        { state: 'resolved', requestSent: true, finalUrl: C, status: 200, redirected: true,
          changed: true, redirects: S2, hopCount: 2 }],
      [wire({ outcome: 'failed', reason: 'too_many_redirects', finalUrl: null, status: null,
        redirected: true, redirects: [step(A, B), step(B, C)], detail: 'Redirect limit reached' }),
      { maxHops: 1 }, { state: 'failed', reason: 'too_many_redirects', requestSent: true,
        redirected: true, redirects: [step(A, B), step(B, C)], hopCount: 1,
        detail: 'Redirect limit reached' }],
      [wire({ outcome: 'unavailable', reason: 'out_of_scope', finalUrl: null, status: null,
        redirected: null, redirects: null, requestSent: false,
        detail: 'Outside this transport scope' }), {},
      { state: 'unavailable', reason: 'out_of_scope', requestSent: false,
        detail: 'Outside this transport scope' }],
      [wire({ outcome: 'unavailable', reason: 'resolver_busy', finalUrl: null, status: null,
        redirected: null, redirects: null, requestSent: false, detail: 'Resolver busy' }), {},
      { state: 'unavailable', reason: 'resolver_busy', requestSent: false,
        detail: 'Resolver busy' }],
      [wire({ outcome: 'failed', reason: 'name_unusable', finalUrl: null, status: null,
        redirects: [], requestSent: false, detail: 'Name not usable' }), {},
      { state: 'failed', reason: 'name_unusable', requestSent: false, redirected: false,
        redirects: [], hopCount: 0, detail: 'Name not usable' }],
      [wire({ provenance: 'fixture' }), {}, { state: 'resolved', provenance: 'fixture',
        requestSent: true, finalUrl: A, status: 200, redirected: false, changed: false,
        redirects: [], hopCount: 0 }],
      [wire({}), { provenance: 'fixture' }, { state: 'unavailable',
        reason: 'endpoint_invalid_response', provenance: 'fixture', requestSent: null,
        detail: 'Invalid endpoint response: provenance' }],
      [wire({ outcome: 'failed', reason: 'connection_error', finalUrl: null, status: null,
        redirects: [], requestSent: null, detail: 'Connection failed (ECONNRESET)' }), {},
      { state: 'failed', reason: 'connection_error', requestSent: null, redirected: false,
        redirects: [], hopCount: 0, detail: 'Connection failed (ECONNRESET)' }],
      [wire({ detail: 'Destination vérifiée, sûre' }), {}, { state: 'resolved',
        requestSent: true, finalUrl: A, status: 200, redirected: false, changed: false,
        redirects: [], hopCount: 0, detail: null }],
      [wire({ outcome: 'failed', reason: 'timeout', finalUrl: null, status: null,
        redirected: null, redirects: null, requestSent: null, detail: 'Timed out (X1)' }), {},
      { state: 'failed', reason: 'timeout', requestSent: null, detail: null }],
    ];
    for (const [body, options, fields] of cases) {
      const clock = fakeClock();
      const { maxHops, provenance } = options;
      const { transport } = endpointWith(d,
        () => fakeResponse({ chunks: [encode(JSON.stringify(body))] }).response,
        { timers: clock.timers, ...(provenance ? { provenance } : {}) });
      const verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
        ...(maxHops === undefined ? {} : { maxHops }) });
      const settled = await verifier.resolve(A);
      assertSnapshot(settled, expected(A, { attemptId: 1,
        transport: { kind: 'endpoint', label: 'Test endpoint' }, provenance: 'network',
        startedAt: 0, settledAt: 0, durationMs: 0, ...fields }), JSON.stringify(body));
      assert.equal(clock.pending, 0);
    }
  }
  // D65
  {
    const big = new Uint8Array(1024 * 1024);
    const valid = JSON.stringify(wire({}));
    const S = JSON.stringify(step(A, B));
    const bodies = [
      [{ contentType: 'text/plain', chunks: [encode(valid)] }, 'media_type'],
      [{ chunks: [new Uint8Array([0xff, 0xfe])] }, 'encoding'],
      [{ chunks: [encode('{')] }, 'json'],
      [{ chunks: [encode(JSON.stringify((({ detail, ...rest }) => rest)(wire({}))))] }, 'shape'],
      [{ chunks: [encode(JSON.stringify(wire({ extra: 1 })))] }, 'shape'],
      [{ chunks: [encode(JSON.stringify(wire({ version: 2 })))] }, 'version'],
      [{ chunks: [encode(JSON.stringify(wire({ url: B })))] }, 'echo'],
      [{ chunks: [encode(JSON.stringify(wire({ outcome: 'unavailable', reason: 'opaque_response',
        finalUrl: null, status: null, redirected: null, redirects: null, requestSent: null })))] },
      'reason'],
      [{ chunks: [encode(JSON.stringify(wire({ outcome: 'unavailable', reason: 'transport_error',
        finalUrl: null, status: null, redirected: null, redirects: null, requestSent: null })))] },
      'reason'],
      [{ chunks: [encode(JSON.stringify(wire({ status: 600 })))] }, 'status'],
      [{ chunks: [encode(JSON.stringify(wire({ finalUrl: 'https://a.test/#f',
        redirects: null, redirected: true })))] }, 'url'],
      [{ chunks: [encode(JSON.stringify(wire({ finalUrl: 'https://u:p@a.test/',
        redirects: null, redirected: true })))] }, 'url'],
      [{ chunks: [encode(JSON.stringify(wire({ finalUrl: C, redirected: true,
        redirects: [step(A, B), step(C, C)] })))] }, 'chain'],
      [{ chunks: [encode(JSON.stringify(wire({ outcome: 'failed', reason: 'too_many_redirects',
        finalUrl: null, status: null, redirected: true,
        redirects: Array.from({ length: 22 }, (_, i) =>
          step(i === 0 ? A : `https://h${i}.test/`, `https://h${i + 1}.test/`)) })))] }, 'count'],
      [{ chunks: [big, big, new Uint8Array(1), encode('never read')] }, 'size'],
      [{ chunks: [encode(JSON.stringify(wire({ outcome: 'failed', reason: 'invalid_location',
        finalUrl: null, status: null, redirects: [step(A, 'javascript:alert(1)')] })))] }, 'url'],
      [{ chunks: [encode(JSON.stringify(wire({ finalUrl: B, redirected: true,
        redirects: [{ ...step(A, B), extra: 1 }] })))] }, 'shape'],
      [{ chunks: [encode(valid.replace('"redirects":[]', `"redirects":[${S.slice(0, -1)},` +
        '"__proto__":{"polluted":1}}]').replace('"redirected":false', '"redirected":true')
        .replace('"finalUrl":"https://a.test/"', `"finalUrl":"${B}"`))] }, 'shape'],
      [{ chunks: [encode(valid.replace('"redirects":[]', '"redirects":[{"url":"https://a.test/",' +
        `"status":301,"location":"${B}","__proto__":null}]`)
        .replace('"redirected":false', '"redirected":true')
        .replace('"finalUrl":"https://a.test/"', `"finalUrl":"${B}"`))] }, 'shape'],
      [{ chunks: [encode(JSON.stringify(wire({ outcome: 'failed', reason: 'blocked_scheme',
        finalUrl: null, status: null, redirects: [step(A, null, 302, 'JavaScript:')] })))] },
      'scheme'],
      [{ chunks: [encode(valid.replace('"detail":null', '"detail":null,"__proto__":' +
        '{"polluted":1}'))] }, 'shape'],
    ];
    for (const [shape, rule] of bodies) {
      const { response, record } = fakeResponse(shape);
      const { transport } = endpointWith(d, () => response, { timers: fakeClock().timers });
      const result = await d.resolveDestination(transport, { url: A, maxHops: 20 },
        { timers: fakeClock().timers });
      assertResolution(result, outcome({ outcome: 'unavailable',
        reason: 'endpoint_invalid_response', transport: { kind: 'endpoint',
          label: 'Test endpoint' }, requestSent: null,
        detail: `Invalid endpoint response: ${rule}` }), rule);
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      if (rule === 'size') {
        assert.equal(record.readerCancels, 1, 'the reader is canceled at the cap');
        assert.equal(record.reads, 3);
      }
      if (rule === 'media_type') assert.equal(record.getReaders, 0);
    }
    assert.equal(({}).polluted, undefined, 'no prototype changed');
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'), false);
  }
  // D66
  {
    for (const status of [403, 500, 503]) {
      const { response, record } = fakeResponse({ status, chunks: [encode('{}')] });
      const { transport } = endpointWith(d, () => response, { timers: fakeClock().timers });
      const result = await d.resolveDestination(transport, { url: A },
        { timers: fakeClock().timers });
      assertResolution(result, outcome({ outcome: 'unavailable', reason: 'endpoint_http_error',
        transport: { kind: 'endpoint', label: 'Test endpoint' }, requestSent: null,
        detail: `HTTP ${status}` }));
      assert.deepEqual([record.getReaders, record.reads, record.bodyCancels], [0, 0, 1]);
    }
    const clock = fakeClock();
    const unreachable = d.createEndpointTransport({ endpoint: 'http://127.0.0.1:9/api',
      label: 'Test endpoint', timers: clock.timers,
      fetch: () => Promise.reject(new TypeError('Failed to fetch')) });
    assertResolution(await d.resolveDestination(unreachable, { url: A }, { timers: clock.timers }),
      outcome({ outcome: 'unavailable', reason: 'endpoint_unreachable',
        transport: { kind: 'endpoint', label: 'Test endpoint' }, requestSent: null }));
    let seenSignal = null;
    const silent = d.createEndpointTransport({ endpoint: 'http://127.0.0.1:9/api',
      label: 'Test endpoint', timers: clock.timers,
      fetch: (input, init) => { seenSignal = init.signal; return new Promise(() => {}); } });
    const pending = d.resolveDestination(silent, { url: A, timeoutMs: 800 },
      { timers: clock.timers });
    await clock.advance(799);
    assert.equal(seenSignal.aborted, false);
    await clock.advance(1);
    assertResolution(await pending, outcome({ outcome: 'unavailable', reason: 'endpoint_timeout',
      transport: { kind: 'endpoint', label: 'Test endpoint' }, requestSent: null,
      detail: 'Endpoint did not answer', durationMs: 800 }));
    assert.equal(seenSignal.aborted, true);
    assert.equal(clock.pending, 0);
    const rangeError = new RangeError('odd');
    const odd = d.createEndpointTransport({ endpoint: 'http://127.0.0.1:9/api',
      label: 'Test endpoint', timers: clock.timers, fetch: () => Promise.reject(rangeError) });
    const broken = await d.resolveDestination(odd, { url: A }, { timers: clock.timers });
    assert.equal(broken.reason, 'transport_error');
    assert.equal(broken.cause, rangeError);
  }
  // D67 (parent part; the location cases run in the browser-like child)
  {
    const base = { endpoint: 'http://127.0.0.1:9/api', label: 'Test endpoint' };
    for (const options of [{ endpoint: base.endpoint }, { ...base, endpoint: 'ftp://x' },
      { ...base, endpoint: 'https://u:p@x/' }, { ...base, endpoint: 'api' },
      { ...base, endpoint: '/api/destination' }, { ...base, headers: { 'content-type': 'x' } },
      { ...base, headers: { Accept: 'x' } }, { ...base, headers: { 'x-a': 'a\r\nb: c' } },
      { ...base, headers: { 'bad name': 'x' } }, { ...base, headers: { 'x-a': 5 } },
      { ...base, credentials: 'bogus' }, { ...base, provenance: 'observed' },
      { ...base, crossOrigin: 'yes' }, { ...base, label: '' }, { ...base, fetch: 'fetch' },
      undefined]) {
      assert.throws(() => d.createEndpointTransport(options), TypeError, JSON.stringify(options));
    }
    assert.equal(d.createEndpointTransport({ ...base, endpoint: 'https://resolver.example/api' })
      .kind, 'endpoint', 'without a page location an absolute endpoint is allowed');
  }
  // D68
  {
    const A2 = 'https://a2.test/';
    const entries = [
      { url: A, result: { outcome: 'resolved', finalUrl: A2, status: 200,
        redirects: [step(A, A2, 302)] } },
      { url: B, result: { outcome: 'failed', reason: 'blocked_address', redirects: [],
        detail: 'Address not allowed' } },
      { url: C, result: 'pending' },
      { url: 'https://d.test/', result: 'pending' },
      { url: 'https://e.test/', result: { outcome: 'unavailable', reason: 'resolver_busy' } },
    ];
    const clock = fakeClock();
    const transport = d.createPreparedTransport(entries, { timers: clock.timers });
    assert.deepEqual([transport.kind, transport.label, transport.provenance],
      ['prepared', 'Prepared example', 'simulated']);
    const verifier = d.createDestinationVerifier({ transport, timers: clock.timers,
      timeoutMs: 1000 });
    const prepared = { kind: 'prepared', label: 'Prepared example' };
    assertSnapshot(await verifier.resolve(A), expected(A, { state: 'resolved', attemptId: 1,
      transport: prepared, provenance: 'simulated', requestSent: false, finalUrl: A2,
      status: 200, redirected: true, changed: true, redirects: [step(A, A2, 302)], hopCount: 1,
      startedAt: 0, settledAt: 0, durationMs: 0 }));
    assertSnapshot(await verifier.resolve(B), expected(B, { state: 'failed',
      reason: 'blocked_address', attemptId: 2, transport: prepared, provenance: 'simulated',
      requestSent: false, redirected: false, redirects: [], hopCount: 0, startedAt: 0,
      settledAt: 0, durationMs: 0, detail: 'Address not allowed' }));
    const E = await verifier.resolve('https://e.test/');
    assert.deepEqual([E.state, E.reason, E.requestSent], ['unavailable', 'resolver_busy', false]);
    assertSnapshot(await verifier.resolve('https://unknown.test/'), expected(
      'https://unknown.test/', { state: 'unavailable', reason: 'out_of_scope', attemptId: 4,
        transport: prepared, provenance: 'simulated', requestSent: false, startedAt: 0,
        settledAt: 0, durationMs: 0, detail: 'Outside this transport scope' }));
    const canceled = verifier.resolve(C);
    verifier.cancel(C);
    assert.deepEqual([(await canceled).state, (await canceled).reason], ['canceled', 'canceled']);
    const timing = verifier.resolve('https://d.test/');
    await clock.advance(999);
    assert.equal(verifier.get('https://d.test/').state, 'resolving');
    await clock.advance(1);
    assertSnapshot(await timing, expected('https://d.test/', { state: 'failed', reason: 'timeout',
      attemptId: 6, transport: prepared, provenance: 'simulated', requestSent: false,
      startedAt: 0, settledAt: 1000, durationMs: 1000, detail: 'Timed out' }));
    const slowClock = fakeClock();
    const slow = d.createPreparedTransport(entries, { delayMs: 500, timers: slowClock.timers });
    const slowVerifier = d.createDestinationVerifier({ transport: slow, timers: slowClock.timers });
    const later = slowVerifier.resolve(A);
    await slowClock.advance(499);
    assert.equal(slowVerifier.get(A).state, 'resolving');
    await slowClock.advance(1);
    const settled = await later;
    assert.deepEqual([settled.state, settled.durationMs, settled.settledAt],
      ['resolved', 500, 500]);
    assert.equal(slowClock.pending, 0);
    assert.throws(() => d.createPreparedTransport(entries, { delayMs: 60001 }), RangeError);
    assert.throws(() => d.createPreparedTransport(entries, { delayMs: 1.5 }), RangeError);
    assert.throws(() => d.createPreparedTransport(null), TypeError);
  }
  // D69
  {
    const ok = { outcome: 'resolved', finalUrl: A, status: 200, redirects: [] };
    for (const entries of [
      [{ url: 'https://A.test/', result: ok }],
      [{ url: A, result: ok }, { url: A, result: 'pending' }],
      [{ url: A, result: { ...ok, finalUrl: 'javascript:x', redirects: null } }],
      [{ url: A, result: { ...ok, finalUrl: B, redirects: [{ url: A, status: 301,
        location: B }] } }],
      [{ url: A, result: { outcome: 'failed', reason: 'queue_full' } }],
      [{ url: A, result: 'later' }],
      [{ url: A }],
      'https://a.test/',
    ]) {
      assert.throws(() => d.createPreparedTransport(entries), TypeError, JSON.stringify(entries));
    }
    const D = 'https://d.test/';
    const chain = [step(A, B), step(B, C), step(C, D)];
    const transport = d.createPreparedTransport([{ url: A, result: { outcome: 'resolved',
      finalUrl: D, status: 200, redirects: chain } }]);
    const result = await d.resolveDestination(transport, { url: A, maxHops: 1 },
      { timers: fakeClock().timers });
    assertResolution(result, outcome({ outcome: 'failed', reason: 'too_many_redirects',
      transport: { kind: 'prepared', label: 'Prepared example' }, provenance: 'simulated',
      requestSent: false, redirected: true, redirects: chain.slice(0, 2), hopCount: 1,
      detail: 'Redirect limit reached' }));
    const whole = await d.resolveDestination(transport, { url: A, maxHops: 3 },
      { timers: fakeClock().timers });
    assert.deepEqual([whole.outcome, whole.hopCount, whole.finalUrl], ['resolved', 3, D]);
  }
  // D70
  {
    const want = value => ({ eligible: false, source: null, encodedUrl: value, requestUrl: null,
      reason: 'control_or_space' });
    const menu = 'https://x.io/menu\nTable 4';
    assert.deepEqual(candidate(detection({ kind: 'url', url: menu }, 'utf8', menu)),
      { ...want(menu), source: 'url' });
    const gs1 = `${GS1_EXAMPLE.url} `;
    assert.deepEqual(candidate({ ...GS1_EXAMPLE, url: gs1 }),
      { ...want(gs1), source: 'gs1_digital_link' });
    assert.deepEqual(candidate({ ...MECARD_EXAMPLE, url: 'https://x.io ' }),
      { ...want('https://x.io '), source: 'me_card' });
  }
  // D71 (parent part: prepared and endpoint transports)
  {
    const fetchCalls = [];
    const transports = [
      d.createPreparedTransport([{ url: A, result: 'pending' }]),
      d.createEndpointTransport({ endpoint: 'http://127.0.0.1:9/api', label: 'Test endpoint',
        fetch: (...args) => { fetchCalls.push(args); return new Promise(() => {}); } }),
    ];
    const signal = new AbortController().signal;
    for (const transport of transports) {
      assert.throws(() => transport.resolve({ url: A, signal }), RangeError);
      assert.throws(() => transport.resolve({ url: A, maxHops: 2.5, timeoutMs: 1000, signal }),
        RangeError);
      assert.throws(() => transport.resolve({ url: A, maxHops: 1, timeoutMs: 0, signal }),
        RangeError);
      assert.throws(() => transport.resolve({ url: 'https://A.test/', maxHops: 1,
        timeoutMs: 1000, signal }), TypeError);
      assert.throws(() => transport.resolve({ url: A, maxHops: 1, timeoutMs: 1000 }), TypeError);
      assert.throws(() => transport.resolve(), TypeError);
    }
    assert.equal(fetchCalls.length, 0);
  }
  // D71: the built-in transports refuse a signal that throws when read the same way: a
  // TypeError whose cause is what it threw, synchronously and before any fetch.
  {
    const fetchCalls = [];
    const transports = [
      d.createPreparedTransport([{ url: A, result: 'pending' }]),
      d.createEndpointTransport({ endpoint: 'http://127.0.0.1:9/api', label: 'Test endpoint',
        fetch: (...args) => { fetchCalls.push(args); return new Promise(() => {}); } }),
    ];
    for (const transport of transports) {
      for (const member of ['aborted', 'addEventListener', 'removeEventListener']) {
        const thrown = new Error(`${member} read broke`);
        const signal = { aborted: false, addEventListener() {}, removeEventListener() {} };
        Object.defineProperty(signal, member, { get() { throw thrown; } });
        assert.throws(() => transport.resolve({ url: A, maxHops: 1, timeoutMs: 1000, signal }),
          error => error instanceof TypeError &&
          error.message === 'request.signal must be an AbortSignal.' && error.cause === thrown,
        `${transport.kind}: ${member}`);
      }
    }
    assert.equal(fetchCalls.length, 0);
  }
  // D72
  {
    const scheme = { outcome: 'failed', reason: 'blocked_scheme',
      redirects: [step(A, null, 302, 'ftp:')], requestSent: true };
    assertResolution(await observe(d, { ...scheme, redirected: false }), outcome({
      outcome: 'failed', reason: 'blocked_scheme', redirected: false,
      redirects: [step(A, null, 302, 'ftp:')], hopCount: 0 }));
    assertResolution(await observe(d, { ...scheme, redirected: true }),
      invalidObservation('redirected'));
    assertResolution(await observe(d, { outcome: 'failed', reason: 'too_many_redirects',
      redirects: [step(A, B)], redirected: false, requestSent: true }, { maxHops: 0 }),
    outcome({ outcome: 'failed', reason: 'too_many_redirects', redirected: false,
      redirects: [step(A, B)], hopCount: 0 }));
    assertResolution(await observe(d, { outcome: 'failed', reason: 'timeout',
      redirects: [step(A, B)], redirected: true, requestSent: true }), outcome({
      outcome: 'failed', reason: 'timeout', redirected: true, redirects: [step(A, B)],
      hopCount: 1 }));
    assertResolution(await observe(d, { outcome: 'failed', reason: 'blocked_address',
      redirects: [step(A, B), step(B, C)], redirected: true, requestSent: true }), outcome({
      outcome: 'failed', reason: 'blocked_address', redirected: true,
      redirects: [step(A, B), step(B, C)], hopCount: 1 }));
    assert.equal((await observe(d, { outcome: 'failed', reason: 'timeout', redirects: null,
      redirected: false, requestSent: null })).detail, 'Invalid observation: redirected');
    assert.equal((await observe(d, resolvedAt(B, null, { redirected: null }))).redirected, null);
    assert.equal((await observe(d, { outcome: 'failed', reason: 'timeout',
      redirects: [step(A, B)], requestSent: true })).redirected, true, 'derived when absent');
  }
  // D73
  {
    const verifier = d.createDestinationVerifier({ transport: pendingTransport().transport });
    const views = [];
    const selection = d.createDestinationSelection(verifier,
      { onChange: view => views.push(view) });
    selection.select(detection({ kind: 'url', url: 'https://x.io' }, 'utf8', 'https://x.io'));
    selection.select(detection({ ...MECARD_EXAMPLE, url: 'https://x.io' }));
    selection.select(detection({ kind: 'text' }, 'utf8', 'hello'));
    selection.select(detection({ kind: 'text' }, 'unknown', 'https://x.io'));
    assert.equal(views.length, 4);
    assert.deepEqual(views.map(view => view.candidate.source), ['url', 'me_card', null, null]);
    assert.equal(views[0].snapshot, views[1].snapshot);
    assert.equal(views[0].snapshot, verifier.get('https://x.io'));
    assert.deepEqual(views.map(view => view.candidate.reason), [null, null, 'no_url',
      'lossy_text']);
    selection.select(detection({ kind: 'text' }, 'unknown', 'other'));
    assert.equal(views.length, 4, 'an unchanged candidate is not a change');
  }
  // D74
  {
    assert.equal(typeof globalThis.reportError, 'undefined');
    const original = console.error;
    const logged = [];
    console.error = value => logged.push(value);
    const listenerError = new Error('listener');
    const rejection = new Error('rejection');
    const changes = [];
    try {
      const verifier = d.createDestinationVerifier({ transport: { ...FAKE,
        provenance: 'network', resolve: () => Promise.reject(rejection) },
      timers: fakeClock().timers });
      verifier.subscribe(() => { throw listenerError; });
      verifier.subscribe(change => changes.push([change.cause, change.snapshot.state]));
      const settled = await verifier.resolve(A);
      await flush();
      assert.equal(settled.state, 'unavailable');
      assert.equal(settled.reason, 'transport_error');
    } finally {
      console.error = original;
    }
    assert.deepEqual(changes, [['attempt', 'resolving'], ['settle', 'unavailable']]);
    assert.deepEqual(logged, [listenerError, listenerError, rejection]);
  }

  await flush();
  assert.deepEqual(unhandled, [], 'no unhandled rejection');
  assert.equal(globalFetchCalls.length, 0, 'the global fetch never ran');
  console.log('PASS destination core: D1..D74, exact eligibility, policy tables, guard, store,' +
    ' binder and transports');
}

// ------------------------------------------------------------------- child: import witness (D23)

async function importWitness() {
  const names = ['fetch', 'XMLHttpRequest', 'WebSocket', 'setTimeout', 'setInterval',
    'clearTimeout', 'queueMicrotask', 'document', 'window', 'navigator', 'AbortController',
    'TextDecoder', 'location', 'Deno', 'Date', 'performance', 'reportError', 'console', 'process'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const hits = [];
  for (const name of names) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() { hits.push(name); return () => { throw new Error(`trapped ${name}`); }; },
      set() { hits.push(`${name}=`); },
    });
  }
  let exports = null;
  let failure = null;
  try {
    exports = Object.keys(await import(MODULE));
  } catch (error) {
    failure = String(error);
  }
  for (const [name, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  nodeProcess.stdout.write(JSON.stringify({ hits, exports, failure }));
}

// ------------------------------------------------------------ child: browser-like (D56..D62 ...)

async function browserLike() {
  Object.defineProperty(globalThis, 'process', { configurable: true, writable: true,
    value: undefined });
  const globalFetchCalls = [];
  globalThis.fetch = (...args) => {
    globalFetchCalls.push(args);
    throw new Error('the global fetch must never run in this suite');
  };
  const page = { href: 'http://127.0.0.1:5273/', origin: 'http://127.0.0.1:5273',
    protocol: 'http:' };
  globalThis.location = page;
  const d = await import(MODULE);
  const fetchResult = (fields = {}) => ({ type: 'cors', status: 200, url: A, redirected: false,
    headers: { get: () => null }, body: null, ...fields });
  const browser = { kind: 'fetch', label: 'This browser' };
  const run = async (transport, url, clock = fakeClock(), extra = {}) =>
    d.resolveDestination(transport, { url, ...extra }, { timers: clock.timers });

  // D56
  {
    const clock = fakeClock();
    const calls = [];
    let cancels = 0;
    const response = fetchResult({ url: 'https://a.test/x', body: {
      cancel() { cancels++; return Promise.resolve(); },
      getReader() { throw new Error('the body is never read'); } } });
    const transport = d.createFetchTransport({ scope: 'network', timers: clock.timers,
      fetch: function fetch(input, init) {
        calls.push({ self: this, input, init });
        return Promise.resolve(response);
      } });
    assert.deepEqual([transport.kind, transport.label, transport.provenance],
      ['fetch', 'This browser', 'network']);
    assert.ok(Object.isFrozen(transport));
    const result = await run(transport, 'https://a.test/x', clock);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].self, undefined);
    assert.equal(calls[0].input, 'https://a.test/x');
    assert.deepEqual(Object.keys(calls[0].init), ['method', 'mode', 'credentials', 'cache',
      'redirect', 'referrer', 'referrerPolicy', 'signal']);
    const { signal, ...rest } = calls[0].init;
    assert.deepEqual(rest, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store',
      redirect: 'follow', referrer: '', referrerPolicy: 'no-referrer' });
    assert.ok(signal instanceof AbortSignal);
    assert.equal(cancels, 1);
    assertResolution(result, outcome({ url: 'https://a.test/x', transport: browser,
      finalUrl: 'https://a.test/x', status: 200, redirected: false, changed: false,
      redirects: [], hopCount: 0 }));
    assert.equal(clock.pending, 0);
  }
  // D57
  {
    const redirected = d.createFetchTransport({ scope: 'network',
      fetch: () => Promise.resolve(fetchResult({ redirected: true, url: 'https://b.test/x' })) });
    assertResolution(await run(redirected, A), outcome({ transport: browser,
      finalUrl: 'https://b.test/x', status: 200, redirected: true, changed: true,
      redirects: null, hopCount: null }));
    const missing = d.createFetchTransport({ scope: 'network',
      fetch: () => Promise.resolve(fetchResult({ status: 404 })) });
    assertResolution(await run(missing, A), outcome({ transport: browser, finalUrl: A,
      status: 404, redirected: false, changed: false, redirects: [], hopCount: 0 }));
  }
  // D58
  for (const fields of [{ type: 'opaque', status: 0, url: '' }, { type: 'opaqueredirect' },
    { status: 0 }, { url: '' }]) {
    const transport = d.createFetchTransport({ scope: 'network',
      fetch: () => Promise.resolve(fetchResult(fields)) });
    assertResolution(await run(transport, A), outcome({ outcome: 'unavailable',
      reason: 'opaque_response', transport: browser, requestSent: null,
      detail: 'Browser returned an opaque response' }), JSON.stringify(fields));
  }
  // D59
  {
    const rejecting = d.createFetchTransport({ scope: 'network',
      fetch: () => Promise.reject(new TypeError('Failed to fetch')) });
    assertResolution(await run(rejecting, A), outcome({ outcome: 'unavailable',
      reason: 'opaque_network_error', transport: browser, requestSent: null,
      detail: 'Browser network error without detail' }));
    const odd = new RangeError('odd');
    const other = d.createFetchTransport({ scope: 'network', fetch: () => Promise.reject(odd) });
    const result = await run(other, A);
    assertResolution(result, outcome({ outcome: 'unavailable', reason: 'transport_error',
      transport: browser, requestSent: null, detail: 'Transport threw' }));
    assert.equal(result.cause, odd);
    const throwing = d.createFetchTransport({ scope: 'network',
      fetch: () => { throw new TypeError('sync'); } });
    assert.equal((await run(throwing, A)).reason, 'opaque_network_error');
  }
  // D60
  {
    const calls = [];
    const spy = (...args) => { calls.push(args); return Promise.resolve(fetchResult()); };
    const transport = d.createFetchTransport({ scope: 'network', fetch: spy });
    const refusals = [['http://a.test:6000/', 'blocked_port', 'Port not allowed'],
      ['http://10.0.0.1/', 'blocked_address', 'Address not allowed'],
      ['http://[fd00::1]/', 'blocked_address', 'Address not allowed'],
      ['http://printer.local/', 'blocked_address', 'Address not allowed'],
      ['http://intranet/', 'blocked_address', 'Address not allowed'],
      ['http://localhost../', 'blocked_address', 'Address not allowed'],
      ['https://192.168.1.1:10080/', 'blocked_port', 'Port not allowed']];
    for (const [url, reason, detail] of refusals) {
      assertResolution(await run(transport, url), outcome({ outcome: 'failed', reason, url,
        transport: browser, requestSent: false, redirected: false, redirects: [], hopCount: 0,
        detail }), url);
    }
    globalThis.location = { href: 'https://app.test/', origin: 'https://app.test',
      protocol: 'https:' };
    assertResolution(await run(transport, 'http://a.test/'), outcome({ outcome: 'unavailable',
      reason: 'mixed_content', url: 'http://a.test/', transport: browser, requestSent: false,
      detail: 'HTTPS page, HTTP target' }));
    globalThis.location = page;
    assert.equal(calls.length, 0, 'every pre-check refuses before fetch');
    globalThis.Deno = {};
    assert.equal((await run(transport, A)).reason, 'transport_unsupported');
    delete globalThis.Deno;
    globalThis.location = undefined;
    assert.equal((await run(transport, A)).reason, 'transport_unsupported');
    globalThis.location = page;
    assert.equal(calls.length, 0);
  }
  // D61
  {
    const origin = 'http://127.0.0.1:5279';
    let respond = () => fetchResult({ url: `${origin}/ok` });
    const calls = [];
    const transport = d.createFetchTransport({ scope: 'fixture', fixtureOrigin: origin,
      fetch: input => { calls.push(input); return Promise.resolve(respond()); } });
    assert.deepEqual([transport.kind, transport.label, transport.provenance],
      ['fetch', 'Local fixture (this browser)', 'fixture']);
    const fixture = { kind: 'fetch', label: 'Local fixture (this browser)' };
    const ok = `${origin}/ok`;
    assertResolution(await run(transport, ok), outcome({ url: ok, transport: fixture,
      provenance: 'fixture', finalUrl: ok, status: 200, redirected: false, changed: false,
      redirects: [], hopCount: 0 }));
    assert.deepEqual(calls, [ok]);
    assertResolution(await run(transport, 'https://example.com/'), outcome({
      outcome: 'unavailable', reason: 'out_of_scope', url: 'https://example.com/',
      transport: fixture, provenance: 'fixture', requestSent: false,
      detail: 'Outside this transport scope' }));
    assert.equal(calls.length, 1, 'out_of_scope sends nothing');
    respond = () => fetchResult({ url: 'http://127.0.0.1:5280/ok', redirected: true });
    assertResolution(await run(transport, ok), outcome({ outcome: 'failed',
      reason: 'left_fixture', url: ok, transport: fixture, provenance: 'fixture',
      requestSent: true, redirected: true, detail: 'Left the fixture scope' }));
    respond = () => fetchResult({ url: ok, redirected: true });
    assertResolution(await run(transport, ok), outcome({ url: ok, transport: fixture,
      provenance: 'fixture', finalUrl: ok, status: 200, redirected: true, changed: false,
      redirects: null, hopCount: null, detail: 'Intermediate redirects not observed' }));
    for (const options of [undefined, {}, { scope: 'network', fixtureOrigin: origin },
      { scope: 'fixture' }, { scope: 'fixture', fixtureOrigin: 'http://localhost:5279' },
      { scope: 'fixture', fixtureOrigin: 'http://127.0.0.1:6000' },
      { scope: 'fixture', fixtureOrigin: 'http://127.0.0.1:5279/x' }]) {
      assert.throws(() => d.createFetchTransport(options), TypeError, JSON.stringify(options));
    }
    assert.equal(d.createFetchTransport({ scope: 'fixture', fixtureOrigin: 'https://[::1]:5279' })
      .provenance, 'fixture');
    assert.throws(() => d.createFetchTransport({ scope: 'fixture',
      fixtureOrigin: 'http://127.0.0.1:5279/' }), TypeError);
    assert.throws(() => d.createFetchTransport({ scope: 'network', label: 'x'.repeat(81) }),
      TypeError);
    assert.throws(() => d.createFetchTransport({ scope: 'network', fetch: 'fetch' }), TypeError);
  }
  // D62
  {
    const clock = fakeClock();
    let seen = null;
    const transport = d.createFetchTransport({ scope: 'network', timers: clock.timers,
      fetch: (input, init) => { seen = init.signal; return new Promise(() => {}); } });
    const pending = run(transport, A, clock, { timeoutMs: 500 });
    await clock.advance(499);
    assert.equal(seen.aborted, false);
    await clock.advance(1);
    assertResolution(await pending, outcome({ outcome: 'failed', reason: 'timeout',
      transport: browser, requestSent: null, detail: 'Timed out', durationMs: 500 }));
    assert.equal(seen.aborted, true, 'the init signal is aborted at the budget');
    assert.equal(clock.pending, 0);
  }
  // D67 (location cases)
  {
    const base = { label: 'Test endpoint', fetch: () => new Promise(() => {}) };
    assert.throws(() => d.createEndpointTransport({ ...base,
      endpoint: 'http://127.0.0.1:5274/api' }), TypeError);
    assert.equal(d.createEndpointTransport({ ...base, endpoint: 'http://127.0.0.1:5274/api',
      crossOrigin: true }).kind, 'endpoint');
    assert.equal(d.createEndpointTransport({ ...base, endpoint: 'http://127.0.0.1:5273/api' })
      .kind, 'endpoint');
    const calls = [];
    const path = d.createEndpointTransport({ ...base, endpoint: '/api',
      fetch: input => { calls.push(input); return new Promise(() => {}); } });
    const controller = new AbortController();
    const pending = path.resolve({ url: A, maxHops: 1, timeoutMs: 1000,
      signal: controller.signal });
    assert.deepEqual(calls, ['http://127.0.0.1:5273/api']);
    controller.abort();
    await assert.rejects(pending);
    for (const endpoint of ['//evil.test/api', '/\\evil.test/api']) {
      assert.throws(() => d.createEndpointTransport({ ...base, endpoint }), TypeError, endpoint);
    }
  }
  // D71 (fetch part)
  {
    const calls = [];
    const transport = d.createFetchTransport({ scope: 'network',
      fetch: (...args) => { calls.push(args); return new Promise(() => {}); } });
    const signal = new AbortController().signal;
    assert.throws(() => transport.resolve({ url: A, signal }), RangeError);
    assert.throws(() => transport.resolve({ url: A, maxHops: 2.5, timeoutMs: 1000, signal }),
      RangeError);
    assert.throws(() => transport.resolve({ url: 'https://A.test/', maxHops: 1, timeoutMs: 1000,
      signal }), TypeError);
    assert.throws(() => transport.resolve({ url: A, maxHops: 1, timeoutMs: 1000 }), TypeError);
    assert.equal(calls.length, 0, 'invalid requests are refused before fetch');
    const aborted = new AbortController();
    aborted.abort();
    await assert.rejects(transport.resolve({ url: A, maxHops: 1, timeoutMs: 1000,
      signal: aborted.signal }));
    assert.equal(calls.length, 0);
  }
  assert.equal(globalFetchCalls.length, 0, 'the global fetch never ran');
  console.log('PASS browser-like child: D56 D57 D58 D59 D60 D61 D62 D67 D71');
}

if (CHILD === 'import') await importWitness();
else if (CHILD === 'browserlike') await browserLike();
else await parent();
