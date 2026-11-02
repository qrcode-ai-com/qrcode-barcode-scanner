// destination-fixtures.mjs · test-only loopback fixtures for the destination test suites. Not
// shipped. Every server listens on a loopback address with port 0, and nothing runs at import.
// HTTP fixtures answer the shared route table; the DNS fixture answers a fixed table and never
// returns an allowed address, except for rows a caller opts into.
import dgram from 'node:dgram';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const LARGE_BYTES = 50 * 1024 * 1024;
const LARGE_CHUNK = 65536;
const SLOW_MS = 5000;
const MAX_HEADER_SIZE = 65536;

// `/to/{name}` targets; `{port}` is the fixture's own port.
const TO_TARGETS = Object.freeze({
  ftp: () => 'ftp://127.0.0.1/x',
  js: () => 'javascript:alert(1)',
  app: () => 'qrcodeai-app://open',
  'ftp-credentials': () => 'ftp://u:p@127.0.0.1/',
  credentials: port => `http://u:p@127.0.0.1:${port}/ok`,
  private: () => 'http://10.0.0.1/',
  metadata: () => 'http://169.254.169.254/latest/meta-data/',
  mapped: port => `http://[::ffff:7f00:1]:${port}/ok`,
  'ipv6-loopback': port => `http://[::1]:${port}/ok`,
  ula: () => 'http://[fd00::1]/',
  rebind: port => `http://rebind.test:${port}/rebind-2`,
  slow: () => '/slow',
  'loopback-other': port => `http://127.0.0.2:${port}/ok`,
  'fixture-alias': port => `http://127.1:${port}/ok`,
  'fixture-hex': port => `http://0x7f.0.0.1:${port}/ok`,
  decimal: port => `http://2130706433:${port}/ok`,
  localhost: port => `http://localhost:${port}/ok`,
  local: () => 'http://printer.local/',
  'single-label': () => 'http://intranet/',
  'bad-port': () => 'http://127.0.0.1:6000/',
  public: () => 'http://example.com/',
  name: port => `http://fixture.test:${port}/ok`,
  flip: port => `http://flip.test:${port}/ok`,
});

// Header values are written as latin1, so a UTF-8 byte sequence goes out byte for byte.
const latin1Bytes = text => Buffer.from(text, 'utf8').toString('latin1');

function listen(server, host) {
  return new Promise((resolve, reject) => {
    const onError = error => reject(error);
    server.once('error', onError);
    server.listen({ port: 0, host }, () => {
      server.off('error', onError);
      resolve(server.address().port);
    });
  });
}

function closeServer(server) {
  return new Promise(resolve => {
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    server.close(() => resolve());
  });
}

function originOf(text, base) {
  try {
    return new URL(text, base).origin;
  } catch (error) {
    return 'null';
  }
}

function corsHeaders(state, req) {
  if (state.cors === 'any') return { 'access-control-allow-origin': '*' };
  const origin = req.headers.origin;
  if (typeof origin === 'string' && state.pageOrigins.includes(origin)) {
    return { 'access-control-allow-origin': origin, vary: 'Origin' };
  }
  return { vary: 'Origin' };
}

function redirect(res, status, location, headers) {
  res.writeHead(status, { ...headers, location });
  res.end();
}

function streamLarge(state, res, headers) {
  const chunk = Buffer.alloc(LARGE_CHUNK, 0x61);
  let sent = 0;
  let closed = false;
  res.writeHead(200, { ...headers, 'content-type': 'application/octet-stream',
    'content-length': String(LARGE_BYTES) });
  res.on('close', () => {
    closed = true;
    state.events.push(sent >= LARGE_BYTES ? 'large:complete' : 'large:closed-early');
  });
  const pump = () => {
    while (!closed && sent < LARGE_BYTES) {
      sent += chunk.length;
      if (!res.write(chunk)) {
        res.once('drain', pump);
        return;
      }
    }
    if (!closed) res.end();
  };
  pump();
}

function answerSlow(state, res, headers) {
  const timer = setTimeout(() => {
    state.timers.delete(timer);
    res.writeHead(200, { ...headers, 'content-type': 'text/plain' });
    res.end('slow');
  }, SLOW_MS);
  state.timers.add(timer);
  res.on('close', () => {
    if (!state.timers.has(timer)) return;
    clearTimeout(timer);
    state.timers.delete(timer);
    state.events.push('slow:closed');
  });
}

function route(state, req, res) {
  const rawNames = [];
  const headers = {};
  for (let i = 0; i + 1 < req.rawHeaders.length; i += 2) {
    const name = req.rawHeaders[i].toLowerCase();
    rawNames.push(name);
    headers[name] = req.rawHeaders[i + 1];
  }
  state.hits.push({ method: req.method, path: req.url, names: rawNames, headers });
  const path = new URL(req.url, 'http://fixture.invalid').pathname;
  const cors = corsHeaders(state, req);
  const text = (status, body, extra = cors) => {
    res.writeHead(status, { ...extra, 'content-type': 'text/plain' });
    res.end(body);
  };
  let match;
  if (path === '/ok' || path === '/headers' || path === '/caf%C3%A9') return text(200, 'ok');
  if ((match = /^\/status\/([2-9]\d{2})$/.exec(path)) !== null) {
    res.statusCode = Number(match[1]);
    for (const [name, value] of Object.entries(cors)) res.setHeader(name, value);
    return res.end();
  }
  if (path === '/no-location') return text(302, '');
  if ((match = /^\/r\/(30[12378])$/.exec(path)) !== null) {
    return redirect(res, Number(match[1]), '/ok', cors);
  }
  if (path === '/mixed-chain') return redirect(res, 301, '/mixed-chain/2', cors);
  if (path === '/mixed-chain/2') return redirect(res, 307, '/mixed-chain/3', cors);
  if (path === '/mixed-chain/3') return redirect(res, 308, '/ok', cors);
  if ((match = /^\/chain\/(\d{1,3})$/.exec(path)) !== null) {
    const n = Number(match[1]);
    return n === 0 ? text(200, 'ok') : redirect(res, 302, `/chain/${n - 1}`, cors);
  }
  if (path === '/loop/a') return redirect(res, 302, '/loop/b', cors);
  if (path === '/loop/b') return redirect(res, 302, '/loop/a', cors);
  if (path === '/self') return redirect(res, 302, '/self', cors);
  if (path === '/empty-location') return redirect(res, 302, '', cors);
  if (path === '/deep/relative') return redirect(res, 302, '../ok?x=1#f', cors);
  if (path === '/dup-same') return redirect(res, 302, ['/ok', '/ok'], cors);
  if (path === '/dup-distinct') return redirect(res, 302, ['/ok', '/status/404'], cors);
  if (path === '/bad-location/parse') return redirect(res, 302, 'http://[::1', cors);
  if (path === '/bad-location/utf8') return redirect(res, 302, '\xff\xfe', cors);
  if (path.startsWith('/long-path/')) return redirect(res, 302, `?${'b'.repeat(500)}`, cors);
  if (path === '/long-location') return redirect(res, 302, `/ok?${'a'.repeat(17000)}`, cors);
  if (path === '/utf8-location') return redirect(res, 302, latin1Bytes('/caf\u00e9'), cors);
  if (path === '/escape') return redirect(res, 302, `/o\tk?x=${latin1Bytes('\u202e')}`, cors);
  if (path === '/rebind-2') {
    return redirect(res, 302, `http://rebind.test:${state.port}/ok`, {});
  }
  if (path === '/cookie') {
    return redirect(res, 302, '/headers', { ...cors, 'set-cookie': 's=1; Path=/' });
  }
  if (path === '/referrer-policy') {
    return redirect(res, 302, '/headers', { ...cors, 'referrer-policy': 'unsafe-url' });
  }
  if (path === '/large') return streamLarge(state, res, cors);
  if (path === '/slow') return answerSlow(state, res, cors);
  if (path === '/early-hints') {
    res.writeEarlyHints({ link: '</ok>; rel=preload; as=fetch' });
    return redirect(res, 302, '/ok', cors);
  }
  if (path === '/reset') return req.socket.destroy();
  if (path === '/garbage') return req.socket.end('HTTP/1.1 2OO OK\r\n\r\n');
  if (path === '/huge-headers') return text(200, 'ok', { ...cors, 'x-huge': 'h'.repeat(20000) });
  if (path === '/nocors/ok') return text(200, 'ok', {});
  if (path === '/nocors/redirect') return redirect(res, 302, '/ok', {});
  if (path === '/page/blank') {
    res.writeHead(200, { ...cors, 'content-type': 'text/html; charset=utf-8' });
    return res.end('<!doctype html><title>blank</title>');
  }
  if (path === '/to/peer' || path === '/to/peer-and-back') {
    if (state.peer === null) return text(404, 'no peer');
    const target = path === '/to/peer' ? '/ok' : '/to/peer';
    return redirect(res, 302, `${state.peer}${target}`, cors);
  }
  if ((match = /^\/to\/([a-z0-9-]+)$/.exec(path)) !== null && Object.hasOwn(TO_TARGETS, match[1])) {
    const location = TO_TARGETS[match[1]](state.port);
    // Routes that leave the fixture origins send no CORS headers: a browser fails the CORS check
    // on such a 302 before following it, so no browser test can leave the fixtures that way.
    const target = originOf(location, state.origin);
    const stays = target === state.origin || (state.peer !== null && target === state.peer);
    return redirect(res, 302, location, stays ? cors : {});
  }
  return text(404, 'not found');
}

/**
 * Starts one HTTP(S) fixture on `address` (127.0.0.1 or ::1), port 0.
 * options: { address, cors: 'strict' | 'any', pageOrigins, tls: { key, cert } }.
 */
export async function startFixture(options = {}) {
  const address = options.address === undefined ? '127.0.0.1' : options.address;
  if (address !== '127.0.0.1' && address !== '::1') {
    throw new TypeError('A fixture listens on 127.0.0.1 or ::1.');
  }
  const cors = options.cors === undefined ? 'strict' : options.cors;
  if (cors !== 'strict' && cors !== 'any') throw new TypeError("cors is 'strict' or 'any'.");
  const tls = options.tls === undefined ? null : options.tls;
  const state = {
    cors,
    pageOrigins: Array.from(options.pageOrigins === undefined ? [] : options.pageOrigins),
    hits: [],
    events: [],
    timers: new Set(),
    peer: null,
    port: 0,
    origin: '',
  };
  const listener = (req, res) => route(state, req, res);
  const server = tls === null
    ? http.createServer({ maxHeaderSize: MAX_HEADER_SIZE }, listener)
    : https.createServer({ maxHeaderSize: MAX_HEADER_SIZE, key: tls.key, cert: tls.cert },
      listener);
  state.port = await listen(server, address);
  const host = address === '::1' ? '[::1]' : address;
  state.origin = `${tls === null ? 'http' : 'https'}://${host}:${state.port}`;
  return {
    address,
    port: state.port,
    origin: state.origin,
    hits: state.hits,
    events: state.events,
    url: path => `${state.origin}${path}`,
    setPeer(origin) {
      state.peer = origin;
    },
    close() {
      for (const timer of state.timers) clearTimeout(timer);
      state.timers.clear();
      return closeServer(server);
    },
  };
}

/** Two fixtures whose `{peer}` is each other's origin. */
export async function startFixturePair(options = {}) {
  const first = await startFixture(options);
  const second = await startFixture(options);
  first.setPeer(second.origin);
  second.setPeer(first.origin);
  return [first, second];
}

// ---- DNS fixture ---------------------------------------------------------------------------

const DNS_TABLE = Object.freeze({
  'private.test': Object.freeze({ A: ['10.1.2.3'], AAAA: [] }),
  'dns64.test': Object.freeze({ A: ['169.254.169.254'], AAAA: ['2001:db8::a9fe:a9fe'] }),
  'nx.test': 'nxdomain',
  'hang.test': 'hang',
});
// Opt-in rows: a refused A beside an ALLOWED AAAA, the DNS64 answer (RFC 6147) under a
// network-specific prefix (RFC 6052) that no translationPrefixes entry declares. Only a caller
// that withholds every lookup reply from net enables them.
const MIXED_TABLE = Object.freeze({
  'nsp64.test': Object.freeze({ A: ['169.254.169.254'], AAAA: ['2a00:1:2:3::a9fe:a9fe'] }),
  // The same answers with the A reply 100 ms late, so the AAAA arrives first.
  'slowa64.test': Object.freeze({ A: ['169.254.169.254'], AAAA: ['2a00:1:2:3::a9fe:a9fe'],
    delayA: 100 }),
});
const TYPE_A = 1;
const TYPE_AAAA = 28;
const RCODE_NXDOMAIN = 3;
const RCODE_REFUSED = 5;

function readName(message, start) {
  const labels = [];
  let offset = start;
  for (;;) {
    if (offset >= message.length) return null;
    const length = message[offset];
    if (length === 0) return { name: labels.join('.'), end: offset + 1 };
    if (length > 63) return null;
    labels.push(message.toString('latin1', offset + 1, offset + 1 + length));
    offset += 1 + length;
  }
}

function ipv6Bytes(text) {
  const [head, tail] = text.split('::');
  const first = head === '' ? [] : head.split(':');
  const last = tail === undefined || tail === '' ? [] : tail.split(':');
  const groups = [...first, ...new Array(8 - first.length - last.length).fill('0'), ...last];
  const bytes = Buffer.alloc(16);
  groups.forEach((group, index) => bytes.writeUInt16BE(parseInt(group, 16), index * 2));
  return bytes;
}

function dnsAnswer(table, query, name, type) {
  const id = query.readUInt16BE(0);
  const flags = query.readUInt16BE(2);
  const nameEnd = readName(query, 12).end;
  const question = query.subarray(12, nameEnd + 4);
  const entry = table[name];
  let rcode = 0;
  let addresses = [];
  if (entry === undefined) rcode = RCODE_REFUSED;
  else if (entry === 'nxdomain') rcode = RCODE_NXDOMAIN;
  else if (type === TYPE_A) addresses = entry.A;
  else if (type === TYPE_AAAA) addresses = entry.AAAA;
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  // QR, the query's opcode and RD, AA, RA, then the response code.
  header.writeUInt16BE(0x8000 | (flags & 0x7900) | 0x0400 | 0x0080 | rcode, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(addresses.length, 6);
  const records = addresses.map(address => {
    const data = type === TYPE_A ? Buffer.from(address.split('.').map(Number)) : ipv6Bytes(address);
    const record = Buffer.alloc(12);
    record.writeUInt16BE(0xc00c, 0);
    record.writeUInt16BE(type, 2);
    record.writeUInt16BE(1, 4);
    record.writeUInt32BE(60, 6);
    record.writeUInt16BE(data.length, 10);
    return Buffer.concat([record, data]);
  });
  return Buffer.concat([header, question, ...records]);
}

/**
 * A UDP DNS fixture on 127.0.0.1, port 0. `queries` logs `{ name, type }` per question.
 * options: { mixed: true } adds the opt-in rows of MIXED_TABLE, which answer an allowed address.
 */
export async function startDnsFixture(options = {}) {
  const table = options.mixed === true ? { ...DNS_TABLE, ...MIXED_TABLE } : DNS_TABLE;
  const socket = dgram.createSocket('udp4');
  const queries = [];
  const timers = new Set();
  socket.on('message', (message, peer) => {
    if (message.length < 17) return;
    const parsed = readName(message, 12);
    if (parsed === null || parsed.end + 4 > message.length) return;
    const name = parsed.name.toLowerCase();
    const code = message.readUInt16BE(parsed.end);
    const type = code === TYPE_A ? 'A' : code === TYPE_AAAA ? 'AAAA' : code;
    queries.push({ name, type });
    const entry = table[name];
    if (entry === 'hang') return;
    const answer = dnsAnswer(table, message, name, code);
    const late = typeof entry === 'object' && code === TYPE_A && entry.delayA !== undefined
      ? entry.delayA : 0;
    if (late === 0) {
      socket.send(answer, peer.port, peer.address);
      return;
    }
    const timer = setTimeout(() => {
      timers.delete(timer);
      socket.send(answer, peer.port, peer.address);
    }, late);
    timers.add(timer);
  });
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.bind(0, '127.0.0.1', () => {
      socket.off('error', reject);
      resolve();
    });
  });
  return {
    port: socket.address().port,
    queries,
    close: () => new Promise(resolve => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      socket.close(() => resolve());
    }),
  };
}

// ---- TCP recorders -------------------------------------------------------------------------

/**
 * Accepts TCP connections and records the bytes each one sent; never answers.
 * options: { address, capture }; `capture: true` also keeps each connection's bytes in `data`.
 */
export async function startTcpRecorder(options = {}) {
  const address = options.address === undefined ? '127.0.0.1' : options.address;
  const capture = options.capture === true;
  const connections = [];
  const sockets = new Set();
  const server = net.createServer(socket => {
    const record = capture ? { bytes: 0, closed: false, data: Buffer.alloc(0) }
      : { bytes: 0, closed: false };
    connections.push(record);
    sockets.add(socket);
    socket.on('data', chunk => {
      record.bytes += chunk.length;
      if (capture) record.data = Buffer.concat([record.data, chunk]);
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      record.closed = true;
      sockets.delete(socket);
    });
  });
  const port = await listen(server, address);
  return {
    address,
    port,
    connections,
    close: () => new Promise(resolve => {
      for (const socket of sockets) socket.destroy();
      server.close(() => resolve());
    }),
  };
}

/** A forward-proxy stand-in: records each request line and answers 299 without contacting. */
export async function startRecordingProxy() {
  const requestLines = [];
  const sockets = new Set();
  let connections = 0;
  const server = net.createServer(socket => {
    connections += 1;
    sockets.add(socket);
    let head = '';
    socket.on('data', chunk => {
      head += chunk.toString('latin1');
      if (!head.includes('\r\n\r\n')) return;
      requestLines.push(head.split('\r\n')[0]);
      head = '';
      socket.end('HTTP/1.1 299 Proxied\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
    });
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
  });
  const port = await listen(server, '127.0.0.1');
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    requestLines,
    get connections() {
      return connections;
    },
    close: () => new Promise(resolve => {
      for (const socket of sockets) socket.destroy();
      server.close(() => resolve());
    }),
  };
}
