// destination-node.js · @supernovae-st/qrcode-ai-scanner-wasm/destination-node (0.11.0)
// Node-only reference resolver and same-origin endpoint handler. Importing creates no socket,
// lookup, resolver, agent, server or timer: the Node facilities below are used only while a
// function runs. Every URL a result reports is observation text: render it as text, never as a
// link, a navigation target or an open action.
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import {
  DESTINATION_POLICY,
  classifyAddress,
  classifyHost,
  destinationCandidate,
  resolveDestination,
} from './destination.js';

const NETWORK_LABEL = 'Server resolver (Node)';
const FIXTURE_LABEL = 'Local fixture (Node resolver)';
const DEFAULT_USER_AGENT = 'qrcode-ai-scanner-destination-bot/1';
const ACCEPT = 'text/html,application/xhtml+xml,*/*;q=0.8';
const MAX_URL_LENGTH = 16384;
const MAX_HOPS_LIMIT = 20;
const MAX_TIMEOUT_MS = 60000;
const HEADER_CAP = 16384;
const MODULE_CEILING = 32;
const DNS_LOOKUP_CEILING = 3;
const RESOLVER_TIMEOUT_MS = 2000;
const RESOLVER_TRIES = 2;
const MAX_LABEL_POINTS = 80;
const LOOKUP_OPTIONS = Object.freeze({ all: true, family: 0, hints: 0 });
const PROVENANCES = Object.freeze(['network', 'fixture', 'simulated']);
const HANDLER_KINDS = Object.freeze(['node', 'prepared', 'custom']);
const FOLLOWED_FAILURES = Object.freeze(['timeout', 'dns_error', 'connection_error', 'tls_error',
  'invalid_response']);
const WIRE_REQUEST_KEYS = Object.freeze(['version', 'url', 'maxHops', 'timeoutMs']);
const DETAIL_CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const SCHEME_TEXT = /^[a-z][a-z0-9+.-]{0,31}:$/;
const USER_AGENT_TEXT = /^[\x20-\x7e]{1,256}$/;
const UNSAFE_TEXT = /[\x00-\x1f\x7f-\x9f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;
const TLS_CODE =
  /^(?:ERR_TLS_|ERR_SSL_|CERT_|UNABLE_TO_|DEPTH_ZERO_SELF_SIGNED_CERT$|SELF_SIGNED_CERT_IN_CHAIN$)/;
const PORT_TEXT = /^[1-9]\d{0,4}$/;
const LENGTH_TEXT = /^\d+$/;
const ASCII_EDGE_SPACE = /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g;

// Attempts in flight across every Node transport of this module. MODULE_CEILING caps them, so an
// application that creates one transport per request, and so escapes maxConcurrent, stays bounded.
const moduleLoad = { active: 0 };

// ---- Small helpers ---------------------------------------------------------------------------

const isObject = value => value !== null && typeof value === 'object';

function isIntegerIn(value, low, high) {
  return typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
}

function integerOption(value, fallback, low, high, name) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number') throw new TypeError(`${name} must be a number.`);
  if (!Number.isInteger(value) || value < low || value > high) {
    throw new RangeError(`${name} must be an integer from ${low} to ${high}.`);
  }
  return value;
}

function booleanOption(value, name) {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean.`);
  return value;
}

function requiredObject(value, name) {
  if (!isObject(value)) throw new TypeError(`${name} must be an object.`);
  return value;
}

function optionalFunction(value, name) {
  if (value !== undefined && typeof value !== 'function') {
    throw new TypeError(`${name} must be a function.`);
  }
  return value;
}

// The native shape of `cause` (ES2022) without the ES2022 constructor option.
function withCause(error, cause) {
  Object.defineProperty(error, 'cause', { value: cause, writable: true, configurable: true });
  return error;
}

// Returns `value` when it has the shape of a signal. Anything else is refused with TypeError,
// including a signal whose members throw when read: what it threw is then the cause. A copy of
// checkSignal() in ./destination.js, which does not export it, so that every built-in transport
// refuses the same signal with the same error.
function checkSignal(value, name) {
  let shaped;
  try {
    shaped = isObject(value) && typeof value.aborted === 'boolean' &&
      typeof value.addEventListener === 'function' &&
      typeof value.removeEventListener === 'function';
  } catch (error) {
    throw withCause(new TypeError(`${name} must be an AbortSignal.`), error);
  }
  if (!shaped) throw new TypeError(`${name} must be an AbortSignal.`);
  return value;
}

function abortReason(signal) {
  const reason = signal.reason;
  return reason === undefined ? new Error('The destination check was aborted.') : reason;
}

function checkLabel(value, name) {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string.`);
  const length = Array.from(value).length;
  if (length < 1 || length > MAX_LABEL_POINTS) {
    throw new TypeError(`${name} must be 1 to ${MAX_LABEL_POINTS} code points.`);
  }
  return value.replace(UNSAFE_TEXT, '\ufffd');
}

// Timer members are captured once and always called unbound.
function clockFrom(timers) {
  if (timers === undefined) {
    return {
      set: (callback, ms) => {
        const set = globalThis.setTimeout;
        return set(callback, ms);
      },
      clear: handle => {
        const clear = globalThis.clearTimeout;
        clear(handle);
      },
    };
  }
  if (!isObject(timers)) throw new TypeError('timers must be an object.');
  const { now, monotonic, setTimeout: set, clearTimeout: clear } = timers;
  if ([now, monotonic, set, clear].some(member => typeof member !== 'function')) {
    throw new TypeError('timers needs now, monotonic, setTimeout and clearTimeout functions.');
  }
  return { set: (callback, ms) => set(callback, ms), clear: handle => clear(handle) };
}

function codeOf(error) {
  try {
    const code = isObject(error) ? error.code : undefined;
    return typeof code === 'string' ? code : null;
  } catch (ignored) {
    return null;
  }
}

const withCode = (text, code) =>
  (code !== null && DETAIL_CODE.test(code) ? `${text} (${code})` : text);

// Node only, checked at each call: the `node` export condition also matches Bun.
function onNode() {
  const scope = globalThis;
  const host = scope.process;
  const versions = isObject(host) ? host.versions : undefined;
  return isObject(versions) && typeof versions.node === 'string' && versions.bun === undefined &&
    scope.Deno === undefined;
}

function isRequestUrl(value) {
  if (typeof value !== 'string') return false;
  const candidate = destinationCandidate(value);
  return candidate.eligible && candidate.requestUrl === value;
}

// The request contract every built-in transport enforces synchronously, before any work: the
// requestUrl of an eligible candidate, integer limits and an AbortSignal, else TypeError or
// RangeError.
function checkRequest(request) {
  if (!isObject(request)) throw new TypeError('A destination request object is required.');
  const url = request.url;
  if (!isRequestUrl(url)) {
    throw new TypeError('request.url must be the requestUrl of an eligible candidate.');
  }
  const maxHops = request.maxHops;
  if (!isIntegerIn(maxHops, 0, MAX_HOPS_LIMIT)) {
    throw new RangeError(`request.maxHops must be an integer from 0 to ${MAX_HOPS_LIMIT}.`);
  }
  const timeoutMs = request.timeoutMs;
  if (!isIntegerIn(timeoutMs, 1, MAX_TIMEOUT_MS)) {
    throw new RangeError(`request.timeoutMs must be an integer from 1 to ${MAX_TIMEOUT_MS}.`);
  }
  const signal = checkSignal(request.signal, 'request.signal');
  return { url, maxHops, timeoutMs, signal };
}

const bareHost = hostname =>
  (hostname.charAt(0) === '[' && hostname.charAt(hostname.length - 1) === ']'
    ? hostname.slice(1, -1) : hostname);

const portOf = url => (url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : Number(url.port));

// ---- Transport options -----------------------------------------------------------------------

function fixtureOf(value) {
  if (!isObject(value)) throw new TypeError('fixture must be an object.');
  const address = value.address;
  if (address !== '127.0.0.1' && address !== '::1') {
    throw new TypeError("fixture.address must be the literal '127.0.0.1' or '::1'.");
  }
  const port = value.port;
  if (typeof port !== 'number') throw new TypeError('fixture.port must be a number.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('fixture.port must be an integer from 1 to 65535.');
  }
  if (DESTINATION_POLICY.badPorts.includes(port)) {
    throw new TypeError('fixture.port must not be a Fetch bad port.');
  }
  return Object.freeze({ address, port });
}

function portsOf(value, fixture) {
  if (value === undefined) return fixture === null ? Object.freeze([80, 443]) : null;
  if (fixture !== null) throw new TypeError('allowedPorts belongs to network mode only.');
  if (!Array.isArray(value)) throw new TypeError('allowedPorts must be an array.');
  for (const port of value) {
    if (typeof port !== 'number') throw new TypeError('Each allowedPorts entry is a number.');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new RangeError('Each allowedPorts entry is an integer from 1 to 65535.');
    }
    if (DESTINATION_POLICY.badPorts.includes(port)) {
      throw new TypeError('allowedPorts cannot contain a Fetch bad port.');
    }
  }
  return Object.freeze(value.slice());
}

// 'a.b.c.d[:port]' or '[v6][:port]', port 1..65535: port 0 is refused here because the
// resolver's setServers() aborts the process on it (Node 22.22.2, 18.20.8).
function isDnsServer(text) {
  if (typeof text !== 'string') return false;
  let host;
  let port = null;
  let family;
  if (text.charAt(0) === '[') {
    const close = text.indexOf(']');
    if (close === -1) return false;
    host = text.slice(1, close);
    const rest = text.slice(close + 1);
    if (rest !== '') {
      if (rest.charAt(0) !== ':') return false;
      port = rest.slice(1);
    }
    family = 6;
  } else {
    const colon = text.indexOf(':');
    host = colon === -1 ? text : text.slice(0, colon);
    if (colon !== -1) port = text.slice(colon + 1);
    family = 4;
  }
  const info = classifyAddress(host);
  if (info === null || info.family !== family || info.address !== host.toLowerCase()) {
    return false;
  }
  return port === null || (PORT_TEXT.test(port) && Number(port) <= 65535);
}

function dnsServersOf(value, fixture, lookup) {
  if (value === undefined) return null;
  if (fixture !== null) throw new TypeError('dnsServers belongs to network mode only.');
  if (lookup !== undefined) {
    throw new TypeError('dnsServers configures the default resolver and cannot join lookup.');
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('dnsServers must be a non-empty array.');
  }
  if (!value.every(isDnsServer)) {
    throw new TypeError("Each dnsServers entry is 'a.b.c.d[:port]' or '[v6][:port]'.");
  }
  return Object.freeze(value.slice());
}

function addressOptionsOf(prefixes, ranges) {
  const options = {};
  if (prefixes !== undefined) options.translationPrefixes = prefixes;
  if (ranges !== undefined) options.deniedRanges = ranges;
  // The core validates every entry and throws TypeError for any invalid one.
  classifyAddress('0.0.0.0', options);
  return Object.freeze({
    translationPrefixes: Object.freeze(prefixes === undefined ? [] : prefixes.slice()),
    deniedRanges: Object.freeze(ranges === undefined ? [] : ranges.slice()),
  });
}

function caOf(value, fixture) {
  if (value === undefined) return null;
  if (fixture === null) throw new TypeError('ca belongs to fixture mode only.');
  if (typeof value === 'string' && value !== '') return value;
  if (Array.isArray(value) && value.length > 0 &&
      value.every(item => typeof item === 'string' && item !== '')) {
    return Object.freeze(value.slice());
  }
  throw new TypeError('ca must be a PEM string or a non-empty array of PEM strings.');
}

// ---- Next-hop policy -------------------------------------------------------------------------

const refusal = (reason, detail) => ({ unavailable: false, reason, detail });

function policyRefusal(config, url, port, firstHop) {
  const { fixture, addressOptions } = config;
  if (DESTINATION_POLICY.badPorts.includes(port)) {
    return refusal('blocked_port', 'Port not allowed');
  }
  const literal = classifyAddress(bareHost(url.hostname), addressOptions);
  if (literal !== null && literal.range === 'denied') {
    return refusal('blocked_address', 'Address not allowed');
  }
  const fixtureLiteral = fixture !== null && literal !== null &&
    literal.address === fixture.address;
  if (!fixtureLiteral) {
    const host = classifyHost(url.hostname, addressOptions);
    if (host === null || !host.allowed || host.specialUse !== null) {
      return refusal('blocked_address', 'Address not allowed');
    }
    if (fixture === null && !config.allowedPorts.includes(port)) {
      return refusal('blocked_port', 'Port not allowed');
    }
  }
  if (fixture !== null) {
    const named = literal === null && config.lookup !== undefined;
    if (port !== fixture.port || !(fixtureLiteral || named)) {
      return firstHop
        ? { unavailable: true, reason: 'out_of_scope', detail: 'Outside this transport scope' }
        : refusal('left_fixture', 'Left the fixture scope');
    }
  }
  return null;
}

// ---- Responses and locations -----------------------------------------------------------------

// Distinct raw Location values, in order. Node decodes header bytes as latin1.
function locationValues(raw) {
  const values = [];
  if (!Array.isArray(raw)) return values;
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const name = raw[i];
    if (typeof name === 'string' && name.toLowerCase() === 'location' &&
        !values.includes(raw[i + 1])) {
      values.push(raw[i + 1]);
    }
  }
  return values;
}

function utf8Of(latin1) {
  if (typeof latin1 !== 'string') return null;
  const bytes = new Uint8Array(latin1.length);
  for (let i = 0; i < latin1.length; i += 1) {
    const code = latin1.charCodeAt(i);
    if (code > 255) return null;
    bytes[i] = code;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (error) {
    return null;
  }
}

// The parsed absolute target without its fragment, or null (Fetch HTTP-redirect fetch step 5).
function locationTarget(value, base) {
  const text = utf8Of(value);
  if (text === null) return null;
  let target;
  try {
    target = new URL(text, base.href);
  } catch (error) {
    return null;
  }
  target.hash = '';
  return target.href.length > MAX_URL_LENGTH ? null : target;
}

function familyOf(options) {
  const family = isObject(options) ? options.family : undefined;
  if (family === 4 || family === 'IPv4') return 4;
  if (family === 6 || family === 'IPv6') return 6;
  return 0;
}

function lookupRefused() {
  const error = new Error('The destination policy refused this lookup.');
  error.code = 'EDESTINATIONPOLICY';
  return error;
}

// ---- One attempt -----------------------------------------------------------------------------

function startAttempt(config, request, resolve, reject) {
  const { fixture, addressOptions, clock } = config;
  const signal = request.signal;
  const hopCap = Math.min(request.maxHops, config.maxHops);
  const steps = [];
  const visited = new Set([request.url]);
  let open = true;
  let released = false;
  let pendingLookups = 0;
  let resolver = null;
  let hop = null;
  let sent = false;
  let reached = false;
  let deadline = null;

  config.load.active += 1;
  moduleLoad.active += 1;

  // A slot is held until the attempt settled and no injected lookup of it is pending.
  const release = () => {
    if (released || open || pendingLookups > 0) return;
    released = true;
    config.load.active -= 1;
    moduleLoad.active -= 1;
  };
  // true once a response arrived or a request finished writing; false while no socket reached
  // a vetted peer (a refused post-connect check included); null otherwise.
  const requestSent = () => (sent ? true : reached ? null : false);
  const chain = () => steps.map(item => ({ url: item.url, status: item.status,
    location: item.location, refusedScheme: item.refusedScheme }));
  const failed = (reason, detail) => {
    const redirects = chain();
    const followed = FOLLOWED_FAILURES.includes(reason) ? redirects.length
      : Math.max(0, redirects.length - 1);
    return { outcome: 'failed', reason, redirects, redirected: followed > 0,
      requestSent: requestSent(), detail };
  };
  const unavailable = (reason, detail) =>
    ({ outcome: 'unavailable', reason, requestSent: requestSent(), detail });
  const resolved = (finalUrl, status) => ({ outcome: 'resolved', finalUrl, status,
    redirects: chain(), redirected: steps.length > 0, requestSent: requestSent() });
  const failureOf = error => {
    const code = codeOf(error);
    if (code !== null && TLS_CODE.test(code)) {
      return failed('tls_error', withCode('TLS handshake failed', code));
    }
    if (code !== null && code.startsWith('HPE_')) {
      return failed('invalid_response', withCode('Invalid HTTP response', code));
    }
    return failed('connection_error', withCode('Connection failed', code));
  };

  const dropHop = () => {
    const current = hop;
    hop = null;
    if (current === null) return;
    current.done = true;
    if (current.request !== null) current.request.destroy();
    current.agent.destroy();
  };
  const close = () => {
    open = false;
    if (deadline !== null) {
      clock.clear(deadline);
      deadline = null;
    }
    signal.removeEventListener('abort', onAbort);
    dropHop();
    if (resolver !== null) resolver.cancel();
  };
  const settle = observation => {
    if (!open) return;
    close();
    resolve(observation);
    release();
  };
  function onAbort() {
    if (!open) return;
    close();
    reject(abortReason(signal));
    release();
  }

  const follow = url => {
    if (!open) return;
    const port = portOf(url);
    const refused = policyRefusal(config, url, port, steps.length === 0);
    if (refused !== null) {
      settle(refused.unavailable ? unavailable(refused.reason, refused.detail)
        : failed(refused.reason, refused.detail));
      return;
    }
    send(url, port);
  };

  const answered = (url, status, raw) => {
    if (!open) return;
    if (!Number.isInteger(status) || status < 200 || status > 599) {
      settle(failed('invalid_response', 'Invalid HTTP response'));
      return;
    }
    if (!DESTINATION_POLICY.redirectStatuses.includes(status)) {
      settle(resolved(url.href, status));
      return;
    }
    const values = locationValues(raw);
    if (values.length === 0) {
      settle(resolved(url.href, status));
      return;
    }
    const target = values.length === 1 ? locationTarget(values[0], url) : null;
    if (target === null) {
      steps.push({ url: url.href, status, location: null, refusedScheme: null });
      settle(failed('invalid_location', 'Redirect location invalid'));
      return;
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      const scheme = SCHEME_TEXT.test(target.protocol) ? target.protocol : null;
      steps.push({ url: url.href, status, location: null, refusedScheme: scheme });
      settle(failed('blocked_scheme', 'Redirect scheme not allowed'));
      return;
    }
    const shown = target.username !== '' || target.password !== '' ? null : target.href;
    steps.push({ url: url.href, status, location: shown, refusedScheme: null });
    if (steps.length > hopCap) {
      settle(failed('too_many_redirects', 'Redirect limit reached'));
      return;
    }
    if (shown === null) {
      settle(failed('blocked_credentials', 'Redirect carries credentials'));
      return;
    }
    if (visited.has(target.href)) {
      settle(failed('redirect_loop', 'Redirect loop'));
      return;
    }
    visited.add(target.href);
    follow(target);
  };

  const send = (url, port) => {
    const secure = url.protocol === 'https:';
    const lib = secure ? https : http;
    const hostname = bareHost(url.hostname);
    const literal = classifyAddress(hostname, addressOptions);
    const current = {
      request: null,
      // One agent per hop: no keep-alive, no proxy support, never the shared default agent.
      agent: new lib.Agent({ keepAlive: false }),
      done: false,
      vetted: new Set(literal === null ? [] : [literal.address]),
    };
    hop = current;
    const endHop = observation => {
      if (current.done) return;
      dropHop();
      settle(observation);
    };

    // net calls this at connect time; it answers only with vetted addresses.
    const guardedLookup = (name, lookupOptions, callback) => {
      let replied = false;
      const reply = (error, list) => {
        if (replied) return;
        replied = true;
        if (error !== null) {
          callback(error);
        } else if (isObject(lookupOptions) && lookupOptions.all === true) {
          callback(null, list.map(info => ({ address: info.address, family: info.family })));
        } else {
          callback(null, list[0].address, list[0].family);
        }
      };
      const refuse = observation => {
        endHop(observation);
        reply(lookupRefused());
      };
      const lookupFailed = error =>
        refuse(failed('dns_error', withCode('Name resolution failed', codeOf(error))));
      const vet = addresses => {
        if (current.done || !open) {
          reply(lookupRefused());
          return;
        }
        if (!Array.isArray(addresses) || addresses.length === 0) {
          refuse(failed('dns_error', 'Name resolution failed'));
          return;
        }
        const accepted = [];
        let blocked = false;
        let outside = false;
        for (const entry of addresses) {
          const text = isObject(entry) ? entry.address : entry;
          const info = typeof text === 'string' ? classifyAddress(text, addressOptions) : null;
          if (info === null) {
            blocked = true;
          } else if (fixture === null) {
            if (info.allowed) accepted.push(info);
            else blocked = true;
          } else if (info.address === fixture.address && info.range !== 'denied') {
            accepted.push(info);
          } else if (info.allowed) {
            outside = true;
          } else {
            blocked = true;
          }
        }
        // One refused answer refuses the whole answer; public answers never leave a fixture.
        if (blocked) {
          refuse(failed('blocked_address', 'Resolved address not allowed'));
          return;
        }
        if (outside) {
          refuse(steps.length === 0
            ? unavailable('out_of_scope', 'Outside this transport scope')
            : failed('left_fixture', 'Left the fixture scope'));
          return;
        }
        const family = familyOf(lookupOptions);
        const ordered = accepted.filter(info => info.family === 4)
          .concat(accepted.filter(info => info.family === 6))
          .filter(info => family === 0 || info.family === family);
        if (ordered.length === 0) {
          refuse(failed('dns_error', 'Name resolution failed'));
          return;
        }
        for (const info of ordered) current.vetted.add(info.address);
        reply(null, ordered);
      };

      if (current.done || !open) {
        reply(lookupRefused());
        return;
      }
      if (literal !== null) {
        reply(null, [literal]);
        return;
      }
      const injected = config.lookup;
      if (injected !== undefined) {
        pendingLookups += 1;
        let returned = false;
        const onAnswer = (error, addresses) => {
          if (returned) return;
          returned = true;
          pendingLookups -= 1;
          release();
          if (current.done || !open) reply(lookupRefused());
          else if (error !== null && error !== undefined) lookupFailed(error);
          else vet(addresses);
        };
        try {
          injected(name, LOOKUP_OPTIONS, onAnswer);
        } catch (error) {
          if (returned) return;
          returned = true;
          pendingLookups -= 1;
          release();
          if (current.done || !open) reply(lookupRefused());
          else lookupFailed(error);
        }
        return;
      }
      // The attempt's cancelable resolver: off the libuv pool, A and AAAA asked together so the
      // whole answer is vetted; close() cancels its pending queries.
      if (resolver === null) {
        let created;
        try {
          created = new dns.promises.Resolver({ timeout: RESOLVER_TIMEOUT_MS,
            tries: RESOLVER_TRIES });
          if (config.dnsServers !== null) created.setServers(config.dnsServers);
        } catch (error) {
          lookupFailed(error);
          return;
        }
        resolver = created;
      }
      const active = resolver;
      const failures = [];
      const query = (method, family) => {
        let pending;
        try {
          pending = active[method](name);
        } catch (error) {
          pending = Promise.reject(error);
        }
        return Promise.resolve(pending).then(
          list => list.map(address => ({ address, family })),
          error => {
            failures.push(error);
            return null;
          });
      };
      Promise.all([query('resolve4', 4), query('resolve6', 6)]).then(([v4, v6]) => {
        if (current.done || !open) reply(lookupRefused());
        else if (v4 === null && v6 === null) lookupFailed(failures[0]);
        else vet((v4 === null ? [] : v4).concat(v6 === null ? [] : v6));
      }).catch(() => reply(lookupRefused()));
    };

    let req;
    try {
      req = lib.request({
        hostname,
        port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { 'user-agent': config.userAgent, accept: ACCEPT },
        agent: current.agent,
        lookup: guardedLookup,
        maxHeaderSize: HEADER_CAP,
        insecureHTTPParser: false,
        ...(secure ? { rejectUnauthorized: true, ...(config.ca === null ? {} : { ca: config.ca }) }
          : {}),
      });
    } catch (error) {
      endHop(failureOf(error));
      return;
    }
    req.on('error', error => {
      if (!current.done) endHop(failureOf(error));
    });
    if (current.done) {
      // A synchronous lookup refusal ended the hop while the request was being created.
      req.destroy();
      return;
    }
    current.request = req;
    // Mandatory post-connect check, the backstop for a connect that ignores `lookup`: the peer
    // must be a vetted address. It runs before the request is written.
    req.once('socket', socket => {
      const check = () => {
        if (current.done) return;
        const remote = typeof socket.remoteAddress === 'string'
          ? classifyAddress(socket.remoteAddress) : null;
        if (remote === null || !current.vetted.has(remote.address)) {
          socket.destroy();
          endHop(failed('blocked_address', 'Resolved address not allowed'));
          return;
        }
        reached = true;
      };
      if (socket.connecting) socket.once('connect', check);
      else check();
    });
    req.once('finish', () => {
      sent = true;
    });
    req.once('response', response => {
      sent = true;
      const status = response.statusCode;
      const raw = response.rawHeaders;
      response.on('error', () => {});
      // Bodies are never read.
      response.destroy();
      if (current.done) return;
      current.done = true;
      if (hop === current) hop = null;
      current.agent.destroy();
      answered(url, status, raw);
    });
    req.end();
  };

  try {
    deadline = clock.set(() => {
      deadline = null;
      settle(failed('timeout', 'Timed out'));
    }, Math.min(request.timeoutMs, config.timeoutMs));
    signal.addEventListener('abort', onAbort, { once: true });
    follow(new URL(request.url));
  } catch (error) {
    if (!open) return;
    close();
    reject(error);
    release();
  }
}

/**
 * The Node reference resolver. Network mode by default; fixture mode reaches exactly one
 * loopback address and port. resolve() answers transport_unsupported outside Node.
 */
export function createNodeTransport(options) {
  const settings = options === undefined ? {}
    : requiredObject(options, 'createNodeTransport() options');
  const fixture = settings.fixture === undefined ? null : fixtureOf(settings.fixture);
  const label = settings.label === undefined ? (fixture === null ? NETWORK_LABEL : FIXTURE_LABEL)
    : checkLabel(settings.label, 'label');
  const timeoutMs = integerOption(settings.timeoutMs, 10000, 1, 30000, 'timeoutMs');
  const maxHops = integerOption(settings.maxHops, 10, 0, MAX_HOPS_LIMIT, 'maxHops');
  const lookup = optionalFunction(settings.lookup, 'lookup');
  // dns.lookup holds a libuv pool thread, shared with the application, that it cannot release
  // early: with it, maxConcurrent is at most DNS_LOOKUP_CEILING.
  const maxConcurrent = integerOption(settings.maxConcurrent, 2, 1,
    lookup === dns.lookup ? DNS_LOOKUP_CEILING : 16, 'maxConcurrent');
  const userAgent = settings.userAgent === undefined ? DEFAULT_USER_AGENT : settings.userAgent;
  if (typeof userAgent !== 'string' || !USER_AGENT_TEXT.test(userAgent)) {
    throw new TypeError('userAgent must be 1 to 256 printable ASCII characters.');
  }
  const allowedPorts = portsOf(settings.allowedPorts, fixture);
  const dnsServers = dnsServersOf(settings.dnsServers, fixture, lookup);
  const addressOptions = addressOptionsOf(settings.translationPrefixes, settings.deniedRanges);
  const ca = caOf(settings.ca, fixture);
  const clock = clockFrom(settings.timers);
  const config = Object.freeze({
    fixture, timeoutMs, maxHops, lookup, maxConcurrent, userAgent, allowedPorts, dnsServers,
    addressOptions, ca, clock, load: { active: 0 },
  });
  return Object.freeze({
    kind: 'node',
    label,
    provenance: fixture === null ? 'network' : 'fixture',
    resolve(request) {
      const checked = checkRequest(request);
      const signal = checked.signal;
      if (signal.aborted) return Promise.reject(abortReason(signal));
      if (!onNode()) {
        return Promise.resolve({ outcome: 'unavailable', reason: 'transport_unsupported',
          requestSent: false, detail: 'Runtime not supported' });
      }
      if (config.load.active >= maxConcurrent || moduleLoad.active >= MODULE_CEILING) {
        return Promise.resolve({ outcome: 'unavailable', reason: 'resolver_busy',
          requestSent: false, detail: 'Resolver busy' });
      }
      return new Promise((resolve, reject) => startAttempt(config, checked, resolve, reject));
    },
  });
}

// ---- Endpoint handler ------------------------------------------------------------------------

function originsOf(value) {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError('allowedOrigins must be an array.');
  for (const origin of value) {
    let serialized = null;
    try {
      serialized = typeof origin === 'string' ? new URL(origin).origin : null;
    } catch (error) {
      serialized = null;
    }
    if (serialized === null || serialized === 'null' || serialized !== origin) {
      throw new TypeError('Each allowedOrigins entry is a serialized http(s) origin.');
    }
  }
  return Object.freeze(value.slice());
}

const mediaEssence = value =>
  (typeof value === 'string' ? value.split(';')[0].replace(ASCII_EDGE_SPACE, '').toLowerCase()
    : '');

function wireDetail(value) {
  if (typeof value !== 'string') return null;
  for (const row of DESTINATION_POLICY.detailSentences) {
    if (value === row.text) return value;
    if (row.code && value.startsWith(`${row.text} (`) && value.endsWith(')') &&
        DETAIL_CODE.test(value.slice(row.text.length + 2, -1))) {
      return value;
    }
  }
  return null;
}

// The wire request, a plain JSON object with exactly four keys: version 1, a canonical eligible
// url, maxHops 0..20 and timeoutMs 1..60000. Null for anything else.
function wireRequestOf(bytes) {
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    return null;
  }
  if (!isObject(parsed) || Array.isArray(parsed) ||
      Object.getPrototypeOf(parsed) !== Object.prototype) {
    return null;
  }
  const keys = Object.keys(parsed);
  if (keys.length !== WIRE_REQUEST_KEYS.length ||
      !WIRE_REQUEST_KEYS.every(key => keys.includes(key))) {
    return null;
  }
  const { version, url, maxHops, timeoutMs } = parsed;
  if (version !== 1 || !isRequestUrl(url) || !isIntegerIn(maxHops, 0, MAX_HOPS_LIMIT) ||
      !isIntegerIn(timeoutMs, 1, MAX_TIMEOUT_MS)) {
    return null;
  }
  return { url, maxHops, timeoutMs };
}

// Reads at most maxBytes within the deadline. The stream is left alone afterwards: a refusal
// answers first and closes the connection, so the client still receives it.
async function readBody(req, maxBytes, timeoutMs, clock) {
  let iterator;
  try {
    iterator = req[Symbol.asyncIterator]();
  } catch (error) {
    return { status: 'error' };
  }
  const expired = {};
  let timer = null;
  const deadline = new Promise(resolve => {
    timer = clock.set(() => resolve(expired), timeoutMs);
  });
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const next = await Promise.race([iterator.next(), deadline]);
      if (next === expired) return { status: 'timeout' };
      if (!isObject(next) || next.done === true) break;
      const value = typeof next.value === 'string' ? new TextEncoder().encode(next.value)
        : next.value;
      if (!(value instanceof Uint8Array)) return { status: 'error' };
      total += value.length;
      if (total > maxBytes) return { status: 'too_large' };
      chunks.push(value);
    }
  } catch (error) {
    return { status: 'error' };
  } finally {
    if (timer !== null) clock.clear(timer);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { status: 'ok', bytes };
}

// A resolution as the wire response (always the same 11 keys), or null when it maps to 500
// resolver_failed. Only fixed detail sentences reach the wire.
function wireOf(resolution, revealNameErrors) {
  const outcome = resolution.outcome;
  let reason = resolution.reason;
  let detail = resolution.detail;
  if (outcome === 'unavailable') {
    if (reason !== 'out_of_scope' && reason !== 'resolver_busy') return null;
    return { version: 1, url: resolution.url, outcome, reason, finalUrl: null, status: null,
      redirected: null, redirects: null, requestSent: resolution.requestSent,
      provenance: resolution.provenance, detail: wireDetail(detail) };
  }
  if (outcome === 'failed' && !revealNameErrors && (reason === 'dns_error' ||
      (reason === 'blocked_address' && detail === 'Resolved address not allowed'))) {
    reason = 'name_unusable';
    detail = 'Name not usable';
  }
  const steps = Array.isArray(resolution.redirects)
    ? resolution.redirects.map(item => ({ url: item.url, status: item.status,
      location: item.location, refusedScheme: item.refusedScheme }))
    : null;
  let redirected = resolution.redirected;
  if (steps !== null) {
    const followed = outcome === 'resolved' || FOLLOWED_FAILURES.includes(reason) ? steps.length
      : Math.max(0, steps.length - 1);
    redirected = followed > 0;
  }
  return { version: 1, url: resolution.url, outcome, reason,
    finalUrl: outcome === 'resolved' ? resolution.finalUrl : null,
    status: outcome === 'resolved' ? resolution.status : null,
    redirected, redirects: steps, requestSent: resolution.requestSent,
    provenance: resolution.provenance, detail: wireDetail(detail) };
}

async function serve(config, req, res) {
  let closed = false;
  let written = false;
  let controller = null;
  res.on('close', () => {
    closed = true;
    if (!written && controller !== null) controller.abort();
  });
  const send = (status, body, extra) => {
    if (written || closed) return;
    written = true;
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    if (extra !== undefined) {
      for (const name of Object.keys(extra)) res.setHeader(name, extra[name]);
    }
    res.end(JSON.stringify(body));
  };
  const refuse = (status, error, extra) => send(status, { error }, extra);
  try {
    const headers = isObject(req.headers) ? req.headers : {};
    if (req.method !== 'POST') return refuse(405, 'method_not_allowed', { allow: 'POST' });
    const host = headers.host;
    if (typeof host !== 'string' || !config.allowedHosts.includes(host.toLowerCase())) {
      return refuse(403, 'forbidden');
    }
    const site = headers['sec-fetch-site'];
    const origin = headers.origin;
    if (site !== undefined && site !== 'same-origin') return refuse(403, 'forbidden');
    if (origin !== undefined && origin !== `${config.publicScheme}://${host.toLowerCase()}` &&
        !config.allowedOrigins.includes(origin)) {
      return refuse(403, 'forbidden');
    }
    if (site === undefined && origin === undefined && !config.allowMissingFetchMetadata) {
      return refuse(403, 'forbidden');
    }
    if (mediaEssence(headers['content-type']) !== 'application/json') {
      return refuse(415, 'unsupported_media_type');
    }
    if (req.readableEnded === true || req.body !== undefined) {
      return refuse(500, 'body_already_read');
    }
    const length = headers['content-length'];
    if (typeof length === 'string' && LENGTH_TEXT.test(length) &&
        Number(length) > config.maxBodyBytes) {
      return refuse(413, 'payload_too_large', { connection: 'close' });
    }
    const body = await readBody(req, config.maxBodyBytes, config.bodyTimeoutMs, config.clock);
    if (body.status === 'too_large') {
      return refuse(413, 'payload_too_large', { connection: 'close' });
    }
    if (body.status === 'timeout') return refuse(408, 'request_timeout', { connection: 'close' });
    const wire = body.status === 'ok' ? wireRequestOf(body.bytes) : null;
    if (wire === null) return refuse(400, 'bad_request');
    if (closed) return undefined;
    controller = new AbortController();
    const resolution = await resolveDestination(config.transport,
      { url: wire.url, maxHops: wire.maxHops, timeoutMs: wire.timeoutMs,
        signal: controller.signal },
      config.timers === undefined ? undefined : { timers: config.timers });
    // The client closed the connection: nothing is written.
    if (resolution.outcome === 'canceled') return undefined;
    const answer = wireOf(resolution, config.revealNameErrors);
    if (answer === null) {
      if (resolution.reason === 'transport_error' && config.reportError !== undefined) {
        try {
          config.reportError(resolution.cause);
        } catch (ignored) {
          // reportError never rethrows.
        }
      }
      return refuse(500, 'resolver_failed');
    }
    return send(200, answer);
  } catch (error) {
    return refuse(500, 'resolver_failed');
  }
}

/**
 * A Connect-style, http.createServer-compatible handler for the endpoint wire. It never
 * throws and never rejects. Mount it before any body parser, on the page's own origin.
 */
export function createDestinationEndpoint(options) {
  const settings = requiredObject(options, 'createDestinationEndpoint() options');
  const transport = settings.transport;
  if (!isObject(transport)) throw new TypeError('transport must be a destination transport.');
  if (transport.kind === 'fetch' || transport.kind === 'endpoint') {
    throw new TypeError('An endpoint must police every hop itself: use a node, prepared or ' +
      'custom transport.');
  }
  if (!HANDLER_KINDS.includes(transport.kind)) {
    throw new TypeError('transport.kind is not a known kind.');
  }
  checkLabel(transport.label, 'transport.label');
  if (!PROVENANCES.includes(transport.provenance)) {
    throw new TypeError('transport.provenance must be network, fixture or simulated.');
  }
  if (typeof transport.resolve !== 'function') {
    throw new TypeError('transport.resolve must be a function.');
  }
  const hosts = settings.allowedHosts;
  if (!Array.isArray(hosts) || hosts.length === 0 ||
      !hosts.every(host => typeof host === 'string' && host !== '')) {
    throw new TypeError('allowedHosts must be a non-empty array of Host values.');
  }
  const publicScheme = settings.publicScheme === undefined ? 'https' : settings.publicScheme;
  if (publicScheme !== 'https' && publicScheme !== 'http') {
    throw new TypeError("publicScheme must be 'https' or 'http'.");
  }
  const timers = settings.timers;
  const config = Object.freeze({
    transport,
    allowedHosts: Object.freeze(hosts.map(host => host.toLowerCase())),
    publicScheme,
    allowedOrigins: originsOf(settings.allowedOrigins),
    maxBodyBytes: integerOption(settings.maxBodyBytes, 65536, 256, 1048576, 'maxBodyBytes'),
    bodyTimeoutMs: integerOption(settings.bodyTimeoutMs, 5000, 100, 60000, 'bodyTimeoutMs'),
    allowMissingFetchMetadata: booleanOption(settings.allowMissingFetchMetadata,
      'allowMissingFetchMetadata'),
    revealNameErrors: booleanOption(settings.revealNameErrors, 'revealNameErrors'),
    timers,
    clock: clockFrom(timers),
    reportError: optionalFunction(settings.reportError, 'reportError'),
  });
  return function destinationEndpoint(req, res) {
    serve(config, req, res).catch(() => {});
  };
}
