// destination.js · @qrcode-ai-com/qrcode-barcode-scanner-wasm/destination (0.11.0)
// Optional URL destination checks. No imports, and no network, DOM or timer work at import:
// globals are read only when a function runs. Nothing is requested until resolve() runs with a
// transport the application supplied. Every URL a result reports is observation text: render
// it as text, never as a link, a navigation target or an open action.

const MAX_URL_LENGTH = 16384;
const MAX_HOPS_LIMIT = 20;
const MAX_TIMEOUT_MS = 60000;
const DEFAULT_MAX_HOPS = 10;
const DEFAULT_TIMEOUT_MS = 10000;
const BACKSTOP_MS = 1000;
const MAX_LABEL_POINTS = 80;
const MAX_DETAIL_POINTS = 300;
const MAX_ENDPOINT_BYTES = 2097152;
const UNVERIFIED_MEMO_SIZE = 1024;

const sentence = (text, code) => Object.freeze({ text, code });

export const DESTINATION_POLICY = Object.freeze({
  snapshot: '2026-11-02',
  maxUrlLength: MAX_URL_LENGTH,
  maxHopsLimit: MAX_HOPS_LIMIT,
  maxTimeoutMs: MAX_TIMEOUT_MS,
  defaultMaxHops: DEFAULT_MAX_HOPS,
  defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
  redirectStatuses: Object.freeze([301, 302, 303, 307, 308]),
  // WHATWG Fetch "bad port" list (port 0 included), checked on the snapshot date.
  badPorts: Object.freeze([0, 1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53,
    69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137,
    139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554,
    556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060,
    5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080]),
  translationPrefixLengths: Object.freeze([32, 40, 48, 56, 64, 96]),
  platformRanges: Object.freeze(['168.63.129.16/32']),
  detailSentences: Object.freeze([
    sentence('Address not allowed', false),
    sentence('Resolved address not allowed', false),
    sentence('Port not allowed', false),
    sentence('Redirect scheme not allowed', false),
    sentence('Redirect carries credentials', false),
    sentence('Redirect location invalid', false),
    sentence('Redirect limit reached', false),
    sentence('Redirect loop', false),
    sentence('Left the fixture scope', false),
    sentence('Outside this transport scope', false),
    sentence('Name resolution failed', true),
    sentence('Connection failed', true),
    sentence('TLS handshake failed', true),
    sentence('Invalid HTTP response', true),
    sentence('Timed out', false),
    sentence('Resolver busy', false),
    sentence('Name not usable', false),
  ]),
});

const TRANSPORT_KINDS = Object.freeze(['fetch', 'endpoint', 'node', 'prepared', 'custom']);
const PROVENANCES = Object.freeze(['network', 'fixture', 'simulated']);
const URL_SOURCES = Object.freeze(['url', 'gs1_digital_link', 'me_card']);
const FAILURE_REASONS = Object.freeze(['timeout', 'too_many_redirects', 'redirect_loop',
  'invalid_location', 'blocked_scheme', 'blocked_credentials', 'blocked_address', 'blocked_port',
  'left_fixture', 'name_unusable', 'dns_error', 'connection_error', 'tls_error',
  'invalid_response']);
const TRANSPORT_UNAVAILABLE_REASONS = Object.freeze(['transport_unsupported', 'out_of_scope',
  'opaque_network_error', 'opaque_response', 'mixed_content', 'endpoint_unreachable',
  'endpoint_http_error', 'endpoint_invalid_response', 'endpoint_timeout', 'resolver_busy']);
// Failures that happen while the last step's location is fetched: that step was followed.
const FOLLOWED_FAILURES = Object.freeze(['timeout', 'dns_error', 'connection_error', 'tls_error',
  'invalid_response']);
// The only failures whose last step may carry a null location.
const OPEN_LOCATION_FAILURES = Object.freeze(['invalid_location', 'blocked_credentials',
  'blocked_scheme', 'too_many_redirects']);
const STEP_KEYS = Object.freeze(['url', 'status', 'location', 'refusedScheme']);
const WIRE_KEYS = Object.freeze(['version', 'url', 'outcome', 'reason', 'finalUrl', 'status',
  'redirected', 'redirects', 'requestSent', 'provenance', 'detail']);

// Rule E step 3 compares ASCII case-insensitively: without the u flag, `i` never folds
// non-ASCII letters such as U+017F onto ASCII ones.
const HTTP_PREFIX = /^https?:\/\//i;
// Rule E step 4. Beyond Cc, Cf and Z: every default-ignorable code point (IDNA deletes the Mn
// and Lo ones inside a host too) and lone surrogates (the parser turns them into U+FFFD).
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Z}\p{Default_Ignorable_Code_Point}\p{Cs}]/u;
const UNSAFE_TEXT = /[\x00-\x1f\x7f-\x9f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;
const REFUSED_SCHEME = /^[a-z][a-z0-9+.-]{0,31}:$/;
const DETAIL_CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const IPV4_TEXT = /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/;
const IPV6_CHARS = /^[0-9A-Fa-f:.]+$/;
const HEX_GROUP = /^[0-9A-Fa-f]{1,4}$/;
const CIDR_TEXT = /^([^/]+)\/(0|[1-9]\d{0,2})$/;
const PRINTABLE_ASCII = /^[\x21-\x7e]+$/;
const FORBIDDEN_HOST = /[#%/:<>?@[\\\]^|]/;
const DIGITS = /^\d+$/;
const HEX_NUMBER = /^0x[0-9a-f]*$/;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const HEADER_VALUE_BREAK = /[\r\n\0]/;

const V4_ROWS = Object.freeze([
  ['0.0.0.0/8', 'unspecified'],
  ['10.0.0.0/8', 'private'],
  ['100.64.0.0/10', 'shared'],
  ['127.0.0.0/8', 'loopback'],
  ['169.254.0.0/16', 'link_local'],
  ['172.16.0.0/12', 'private'],
  ['192.0.0.0/24', 'reserved'],
  ['192.0.2.0/24', 'documentation'],
  ['192.31.196.0/24', 'reserved'],
  ['192.52.193.0/24', 'reserved'],
  ['192.88.99.0/24', 'tunnel'],
  ['192.168.0.0/16', 'private'],
  ['192.175.48.0/24', 'reserved'],
  ['198.18.0.0/15', 'benchmarking'],
  ['198.51.100.0/24', 'documentation'],
  ['203.0.113.0/24', 'documentation'],
  ['224.0.0.0/4', 'multicast'],
  ['255.255.255.255/32', 'broadcast'],
  ['240.0.0.0/4', 'reserved'],
  ['168.63.129.16/32', 'platform'],
]);

// [cidr, range, embedded IPv4 layout, allowed when the embedded IPv4 is allowed]
const V6_ROWS = Object.freeze([
  ['::/128', 'unspecified', null, false],
  ['::1/128', 'loopback', null, false],
  ['::ffff:0:0/96', 'ipv4_mapped', 'low', false],
  ['::/96', 'ipv4_compatible', 'low', false],
  ['64:ff9b::/96', 'translation', 'low', true],
  ['64:ff9b:1::/48', 'translation', null, false],
  ['100::/64', 'discard', null, false],
  ['2001::/32', 'tunnel', null, false],
  ['2001:2::/48', 'benchmarking', null, false],
  ['2001::/23', 'reserved', null, false],
  ['2001:db8::/32', 'documentation', null, false],
  ['2002::/16', 'tunnel', '6to4', false],
  ['2620:4f:8000::/48', 'reserved', null, false],
  ['3fff::/20', 'documentation', null, false],
  ['fc00::/7', 'unique_local', null, false],
  ['fe80::/10', 'link_local', null, false],
  ['fec0::/10', 'site_local', null, false],
  ['ff00::/8', 'multicast', null, false],
]);

// ---- Small helpers ------------------------------------------------------------------------------

const isObject = value => value !== null && typeof value === 'object';
const nullable = value => (value === undefined ? null : value);

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

function requiredObject(value, name) {
  if (!isObject(value)) throw new TypeError(`${name} must be an object.`);
  return value;
}

function optionalObject(value, name) {
  return value === undefined ? {} : requiredObject(value, name);
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
// including a signal whose members throw when read: what it threw is then the cause.
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

// A caller signal is read and wired once; one that throws there is refused as not a signal.
function signalAborted(signal, name) {
  try {
    return signal.aborted === true;
  } catch (error) {
    throw withCause(new TypeError(`${name} must be an AbortSignal.`), error);
  }
}

function listen(signal, listener, name) {
  try {
    signal.addEventListener('abort', listener, { once: true });
  } catch (error) {
    throw withCause(new TypeError(`${name} must be an AbortSignal.`), error);
  }
}

function unlisten(signal, listener) {
  try {
    signal.removeEventListener('abort', listener);
  } catch (ignored) {
    // A foreign signal cannot keep a call or an attempt from ending.
  }
}

function abortReason(signal) {
  const reason = signal.reason;
  return reason === undefined ? new Error('The destination check was aborted.') : reason;
}

function isTypeError(error) {
  if (error instanceof TypeError) return true;
  try {
    return isObject(error) && error.name === 'TypeError';
  } catch (ignored) {
    return false;
  }
}

const cleanText = text => text.replace(UNSAFE_TEXT, '\ufffd');

function cleanDetail(text) {
  const clean = cleanText(text);
  if (clean.length <= MAX_DETAIL_POINTS) return clean;
  return Array.from(clean).slice(0, MAX_DETAIL_POINTS).join('');
}

function checkLabel(value, name) {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string.`);
  const length = Array.from(value).length;
  if (length < 1 || length > MAX_LABEL_POINTS) {
    throw new TypeError(`${name} must be 1 to ${MAX_LABEL_POINTS} code points.`);
  }
  return cleanText(value);
}

// Timer members are captured once and always called unbound.
function clockFrom(timers) {
  if (timers === undefined) {
    return {
      now: () => Date.now(),
      monotonic: () => {
        const performance = globalThis.performance;
        return isObject(performance) && typeof performance.now === 'function'
          ? performance.now() : Date.now();
      },
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
  const now = timers.now;
  const monotonic = timers.monotonic;
  const set = timers.setTimeout;
  const clear = timers.clearTimeout;
  if ([now, monotonic, set, clear].some(member => typeof member !== 'function')) {
    throw new TypeError('timers needs now, monotonic, setTimeout and clearTimeout functions.');
  }
  return {
    now: () => now(),
    monotonic: () => monotonic(),
    set: (callback, ms) => set(callback, ms),
    clear: handle => clear(handle),
  };
}

function rankOf(provenance) {
  if (provenance === 'network') return 3;
  if (provenance === 'fixture') return 2;
  return provenance === 'simulated' ? 1 : 0;
}

// ---- Eligibility (Rule E) -----------------------------------------------------------------------

function ruleE(value) {
  if (typeof value !== 'string' || value === '') return { reason: 'no_url', requestUrl: null };
  if (value.length > MAX_URL_LENGTH) return { reason: 'too_long', requestUrl: null };
  if (!HTTP_PREFIX.test(value)) return { reason: 'not_http', requestUrl: null };
  if (INVISIBLE.test(value)) return { reason: 'control_or_space', requestUrl: null };
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    return { reason: 'invalid_url', requestUrl: null };
  }
  if (url.username !== '' || url.password !== '') {
    return { reason: 'credentials', requestUrl: null };
  }
  url.hash = '';
  const requestUrl = url.href;
  if (requestUrl.length > MAX_URL_LENGTH) return { reason: 'too_long', requestUrl: null };
  return { reason: null, requestUrl };
}

function isRequestUrl(value) {
  if (typeof value !== 'string') return false;
  const checked = ruleE(value);
  return checked.reason === null && checked.requestUrl === value;
}

function candidateOf(eligible, source, encodedUrl, requestUrl, reason) {
  return Object.freeze({ eligible, source, encodedUrl, requestUrl, reason });
}

function candidateFor(source, value) {
  const checked = ruleE(value);
  if (checked.reason === null) return candidateOf(true, source, value, checked.requestUrl, null);
  const encodedUrl = checked.reason === 'no_url' ? null : value;
  return candidateOf(false, source, encodedUrl, null, checked.reason);
}

export function destinationCandidate(input) {
  if (typeof input === 'string') return candidateFor(null, input);
  const refusal = 'destinationCandidate() takes a Detection, a Payload or a string.';
  if (!isObject(input)) throw new TypeError(refusal);
  let payload = input;
  let lossy = false;
  if ('payload' in input || 'content' in input) {
    payload = input.payload;
    const content = input.content;
    lossy = isObject(content) && content.charset === 'unknown';
  }
  if (!isObject(payload) || typeof payload.kind !== 'string') throw new TypeError(refusal);
  if (lossy) return candidateOf(false, null, null, null, 'lossy_text');
  const kind = payload.kind;
  if (!URL_SOURCES.includes(kind)) return candidateOf(false, null, null, null, 'no_url');
  const url = payload.url;
  if (typeof url !== 'string' || url === '') return candidateOf(false, kind, null, null, 'no_url');
  return candidateFor(kind, url);
}

// ---- Addresses ----------------------------------------------------------------------------------

function parseIpv4(text) {
  if (!IPV4_TEXT.test(text)) return null;
  let value = 0;
  for (const part of text.split('.')) {
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

function formatIpv4(value) {
  return [Math.floor(value / 16777216), Math.floor(value / 65536) % 256,
    Math.floor(value / 256) % 256, value % 256].join('.');
}

function parseIpv6(text) {
  if (!IPV6_CHARS.test(text)) return null;
  let body = text;
  let tail = [];
  const dot = text.indexOf('.');
  if (dot !== -1) {
    const colon = text.lastIndexOf(':');
    if (colon === -1 || colon > dot) return null;
    const value = parseIpv4(text.slice(colon + 1));
    if (value === null) return null;
    tail = [Math.floor(value / 65536), value % 65536];
    body = text.slice(0, colon + 1);
    if (!body.endsWith('::')) body = body.slice(0, -1);
  }
  const halves = body.split('::');
  if (halves.length > 2) return null;
  const pieces = part => (part === '' ? [] : part.split(':'));
  const head = pieces(halves[0]);
  const rest = halves.length === 2 ? pieces(halves[1]) : [];
  const words = head.concat(rest);
  if (!words.every(word => HEX_GROUP.test(word))) return null;
  const count = words.length + tail.length;
  const numbers = list => list.map(word => parseInt(word, 16));
  if (halves.length === 1) return count === 8 ? numbers(head).concat(tail) : null;
  if (count > 7) return null;
  const zeros = new Array(8 - count).fill(0);
  return numbers(head).concat(zeros, numbers(rest), tail);
}

// RFC 5952 section 4: lowercase hex, no leading zeros, the longest run of two or more zero
// groups compressed (the first one on a tie).
function formatIpv6(groups) {
  let bestStart = -1;
  let bestLength = 1;
  for (let i = 0; i < 8;) {
    if (groups[i] !== 0) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === 0) j += 1;
    if (j - i > bestLength) {
      bestStart = i;
      bestLength = j - i;
    }
    i = j;
  }
  const hex = groups.map(group => group.toString(16));
  if (bestStart === -1) return hex.join(':');
  return `${hex.slice(0, bestStart).join(':')}::${hex.slice(bestStart + bestLength).join(':')}`;
}

function inIpv4(value, cidr) {
  if (cidr.length === 0) return true;
  const size = Math.pow(2, 32 - cidr.length);
  return Math.floor(value / size) === Math.floor(cidr.value / size);
}

function inIpv6(groups, cidr) {
  let left = cidr.length;
  for (let i = 0; i < 8 && left > 0; i += 1) {
    const bits = Math.min(16, left);
    if (groups[i] >> (16 - bits) !== cidr.groups[i] >> (16 - bits)) return false;
    left -= bits;
  }
  return true;
}

function ipv6HostBitsZero(groups, length) {
  for (let i = 0; i < 8; i += 1) {
    const kept = Math.max(0, Math.min(16, length - i * 16));
    const mask = kept === 16 ? 0 : 0xffff >> kept;
    if ((groups[i] & mask) !== 0) return false;
  }
  return true;
}

function parseCidr(text) {
  if (typeof text !== 'string') return null;
  const match = CIDR_TEXT.exec(text);
  if (match === null) return null;
  const length = Number(match[2]);
  const v4 = parseIpv4(match[1]);
  if (v4 !== null) {
    if (length > 32 || v4 % Math.pow(2, 32 - length) !== 0) return null;
    return { family: 4, value: v4, length };
  }
  const v6 = parseIpv6(match[1]);
  if (v6 === null || length > 128 || !ipv6HostBitsZero(v6, length)) return null;
  return { family: 6, groups: v6, length };
}

let builtTables = null;

function tables() {
  if (builtTables === null) {
    builtTables = {
      v4: V4_ROWS.map(([cidr, range]) => ({ cidr: parseCidr(cidr), range })),
      v6: V6_ROWS.map(([cidr, range, embed, allowEmbedded]) =>
        ({ cidr: parseCidr(cidr), range, embed, allowEmbedded })),
    };
  }
  return builtTables;
}

const NO_ADDRESS_OPTIONS = Object.freeze({ translations: Object.freeze([]),
  denied4: Object.freeze([]), denied6: Object.freeze([]) });

function addressOptions(options) {
  if (options === undefined) return NO_ADDRESS_OPTIONS;
  if (!isObject(options)) throw new TypeError('Address options must be an object.');
  const translations = [];
  const denied4 = [];
  const denied6 = [];
  const prefixes = options.translationPrefixes;
  if (prefixes !== undefined) {
    if (!Array.isArray(prefixes)) throw new TypeError('translationPrefixes must be an array.');
    for (const text of prefixes) {
      const cidr = parseCidr(text);
      if (cidr === null || cidr.family !== 6 ||
          !DESTINATION_POLICY.translationPrefixLengths.includes(cidr.length)) {
        throw new TypeError('Each translationPrefixes entry is an IPv6 /32, /40, /48, /56, ' +
          '/64 or /96 prefix with zero host bits.');
      }
      translations.push(cidr);
    }
    translations.sort((a, b) => b.length - a.length);
  }
  const ranges = options.deniedRanges;
  if (ranges !== undefined) {
    if (!Array.isArray(ranges)) throw new TypeError('deniedRanges must be an array.');
    for (const text of ranges) {
      const cidr = parseCidr(text);
      if (cidr === null) {
        throw new TypeError('Each deniedRanges entry is an IPv4 or IPv6 network with zero host ' +
          'bits.');
      }
      (cidr.family === 4 ? denied4 : denied6).push(cidr);
    }
  }
  return { translations, denied4, denied6 };
}

const addressInfo = (address, family, range, embedded, allowed) =>
  Object.freeze({ address, family, range, embedded, allowed });

function classifyIpv4(value, options) {
  const address = formatIpv4(value);
  if (options.denied4.some(cidr => inIpv4(value, cidr))) {
    return addressInfo(address, 4, 'denied', null, false);
  }
  const row = tables().v4.find(entry => inIpv4(value, entry.cidr));
  if (row !== undefined) return addressInfo(address, 4, row.range, null, false);
  return addressInfo(address, 4, 'public', null, true);
}

function bytesOf(groups) {
  const bytes = [];
  for (const group of groups) bytes.push(group >> 8, group & 255);
  return bytes;
}

// RFC 6052 section 2.2: the IPv4 starts at bit L and skips bits 64..71 (the u-octet).
function translatedIpv4(groups, length) {
  const bytes = bytesOf(groups);
  if (length < 96 && bytes[8] !== 0) return null;
  let value = 0;
  let taken = 0;
  for (let index = length / 8; taken < 4; index += 1) {
    if (index === 8) continue;
    value = value * 256 + bytes[index];
    taken += 1;
  }
  return value;
}

function classifyIpv6(groups, options) {
  const address = formatIpv6(groups);
  let range = null;
  let embedded = null;
  let allowed = false;
  const prefix = options.translations.find(cidr => inIpv6(groups, cidr));
  if (prefix !== undefined) {
    range = 'translation';
    const value = translatedIpv4(groups, prefix.length);
    if (value !== null) {
      embedded = classifyIpv4(value, options);
      allowed = embedded.allowed;
    }
  } else {
    const row = tables().v6.find(entry => inIpv6(groups, entry.cidr));
    if (row !== undefined) {
      range = row.range;
      if (row.embed === 'low') embedded = classifyIpv4(groups[6] * 65536 + groups[7], options);
      if (row.embed === '6to4') embedded = classifyIpv4(groups[1] * 65536 + groups[2], options);
      allowed = row.allowEmbedded && embedded !== null && embedded.allowed;
    } else if ((groups[0] & 0xe000) !== 0x2000) {
      range = 'reserved';
    } else {
      range = 'public';
      allowed = true;
    }
  }
  if (options.denied6.some(cidr => inIpv6(groups, cidr)) ||
      (embedded !== null && embedded.range === 'denied')) {
    return addressInfo(address, 6, 'denied', embedded, false);
  }
  return addressInfo(address, 6, range, embedded, allowed);
}

export function classifyAddress(address, options) {
  if (typeof address !== 'string') throw new TypeError('classifyAddress() takes a string.');
  const parsed = addressOptions(options);
  const v4 = parseIpv4(address);
  if (v4 !== null) return classifyIpv4(v4, parsed);
  const v6 = parseIpv6(address);
  return v6 === null ? null : classifyIpv6(v6, parsed);
}

function specialUseOf(host) {
  if (host === 'localhost' || host.endsWith('.localhost')) return 'localhost';
  if (host.endsWith('.local')) return 'local';
  if (host === 'home.arpa' || host.endsWith('.home.arpa')) return 'home.arpa';
  if (host.endsWith('.internal')) return 'internal';
  if (host.endsWith('.invalid')) return 'invalid';
  if (host.endsWith('.onion')) return 'onion';
  if (host.endsWith('.alt')) return 'alt';
  return host.includes('.') ? null : 'single_label';
}

const hostInfo = (kind, host, address, specialUse, allowed) =>
  Object.freeze({ kind, host, address, specialUse, allowed });

export function classifyHost(hostname, options) {
  if (typeof hostname !== 'string') throw new TypeError('classifyHost() takes a string.');
  const parsed = addressOptions(options);
  if (!PRINTABLE_ASCII.test(hostname)) return null;
  const host = hostname.toLowerCase().replace(/\.+$/, '');
  if (host === '') return null;
  if (host.charAt(0) === '[') {
    if (host.charAt(host.length - 1) !== ']') return null;
    const groups = parseIpv6(host.slice(1, -1));
    if (groups === null) return null;
    const info = classifyIpv6(groups, parsed);
    return hostInfo('address', info.address, info, null, info.allowed);
  }
  if (FORBIDDEN_HOST.test(host)) return null;
  const labels = host.split('.');
  if (labels.includes('')) return null;
  // WHATWG "ends in a number": such a host is IPv4, and only the canonical dotted form passes.
  const last = labels[labels.length - 1];
  if (DIGITS.test(last) || HEX_NUMBER.test(last)) {
    const value = parseIpv4(host);
    if (value === null) return null;
    const info = classifyIpv4(value, parsed);
    return hostInfo('address', info.address, info, null, info.allowed);
  }
  const specialUse = specialUseOf(host);
  return hostInfo('name', host, null, specialUse, specialUse === null);
}

// ---- Observation guard (untrusted transport results) --------------------------------------------

// Own string-keyed data properties of a plain object, read once; null for anything else.
function ownRecord(value) {
  if (!isObject(value) || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const record = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !('value' in descriptor)) return null;
    record[key] = descriptor.value;
  }
  return record;
}

function ownItems(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const length = value.length;
  if (Reflect.ownKeys(value).length !== length + 1) return null;
  const items = [];
  for (let i = 0; i < length; i += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (descriptor === undefined || !('value' in descriptor)) return null;
    items.push(descriptor.value);
  }
  return items;
}

function keysFit(record, required, optional) {
  const own = Object.keys(record);
  return own.every(key => required.includes(key) || optional.includes(key)) &&
    required.every(key => own.includes(key));
}

function variantKeys(outcome) {
  if (outcome === 'resolved') {
    return [['outcome', 'finalUrl', 'status', 'redirects', 'redirected', 'requestSent'],
      ['provenance', 'detail']];
  }
  if (outcome === 'failed') {
    return [['outcome', 'reason', 'redirects', 'requestSent'],
      ['redirected', 'provenance', 'detail']];
  }
  if (outcome === 'unavailable') {
    return [['outcome', 'reason', 'requestSent'], ['provenance', 'detail']];
  }
  return null;
}

function isHttpHref(value) {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH || value.includes('#')) {
    return false;
  }
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    return false;
  }
  return url.href === value && (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.username === '' && url.password === '';
}

function hopCountOf(outcome, reason, steps) {
  if (steps === null) return null;
  if (outcome === 'resolved' || FOLLOWED_FAILURES.includes(reason)) return steps.length;
  return Math.max(0, steps.length - 1);
}

// Validates an untrusted observation and rebuilds it field by field. Nothing from the input
// object is kept. Returns { rule } naming the first failed rule, or { record }.
function checkObservation(value, url, maxHops, ceiling) {
  try {
    return observationRules(value, url, maxHops, ceiling);
  } catch (error) {
    return { rule: 'shape' };
  }
}

function observationRules(value, url, maxHops, ceiling) {
  // 1. shape
  const record = ownRecord(value);
  if (record === null) return { rule: 'shape' };
  const outcome = record.outcome;
  const keys = variantKeys(outcome);
  if (keys === null || !keysFit(record, keys[0], keys[1])) return { rule: 'shape' };
  let steps = null;
  if (outcome !== 'unavailable' && record.redirects !== null) {
    const items = ownItems(record.redirects);
    if (items === null) return { rule: 'shape' };
    steps = [];
    for (const item of items) {
      const step = ownRecord(item);
      if (step === null || !keysFit(step, STEP_KEYS, [])) return { rule: 'shape' };
      steps.push(step);
    }
  }
  // 2. reason
  const reason = outcome === 'resolved' ? null : record.reason;
  if (outcome === 'failed' && !FAILURE_REASONS.includes(reason)) return { rule: 'reason' };
  if (outcome === 'unavailable' && !TRANSPORT_UNAVAILABLE_REASONS.includes(reason)) {
    return { rule: 'reason' };
  }
  // 3. url
  if (outcome === 'resolved' && !isHttpHref(record.finalUrl)) return { rule: 'url' };
  if (steps !== null) {
    for (const step of steps) {
      if (!isHttpHref(step.url)) return { rule: 'url' };
      if (step.location !== null && !isHttpHref(step.location)) return { rule: 'url' };
    }
  }
  // 4. scheme
  if (steps !== null) {
    for (let i = 0; i < steps.length; i += 1) {
      const scheme = steps[i].refusedScheme;
      if (reason !== 'blocked_scheme' || i !== steps.length - 1) {
        if (scheme !== null) return { rule: 'scheme' };
        continue;
      }
      if (steps[i].location !== null) return { rule: 'scheme' };
      if (scheme !== null && (typeof scheme !== 'string' || !REFUSED_SCHEME.test(scheme) ||
          scheme === 'http:' || scheme === 'https:')) {
        return { rule: 'scheme' };
      }
    }
  }
  // 5. status
  if (outcome === 'resolved' && !isIntegerIn(record.status, 200, 599)) return { rule: 'status' };
  if (steps !== null &&
      steps.some(step => !DESTINATION_POLICY.redirectStatuses.includes(step.status))) {
    return { rule: 'status' };
  }
  // 6. chain
  if (steps !== null) {
    for (let i = 0; i < steps.length; i += 1) {
      if (steps[i].url !== (i === 0 ? url : steps[i - 1].location)) return { rule: 'chain' };
      if (steps[i].location === null && (i !== steps.length - 1 ||
          !OPEN_LOCATION_FAILURES.includes(reason))) {
        return { rule: 'chain' };
      }
    }
    if (outcome === 'resolved' &&
        record.finalUrl !== (steps.length === 0 ? url : steps[steps.length - 1].location)) {
      return { rule: 'chain' };
    }
  }
  if (reason === 'too_many_redirects' || reason === 'redirect_loop') {
    if (steps === null || steps.length === 0) return { rule: 'chain' };
    const last = steps[steps.length - 1].location;
    if (reason === 'redirect_loop' && !steps.some(step => step.url === last)) {
      return { rule: 'chain' };
    }
  }
  // 7. count
  if (steps !== null && steps.length > (outcome === 'resolved' ? maxHops : maxHops + 1)) {
    return { rule: 'count' };
  }
  // 8. redirected (an optional key holding undefined counts as absent)
  const hopCount = hopCountOf(outcome, reason, steps);
  let redirected = null;
  if (outcome !== 'unavailable') {
    const claimed = record.redirected;
    if (claimed !== undefined && claimed !== true && claimed !== false && claimed !== null) {
      return { rule: 'redirected' };
    }
    if (steps !== null) {
      redirected = hopCount > 0;
      if (claimed !== undefined && claimed !== redirected) return { rule: 'redirected' };
    } else {
      if (claimed === false) return { rule: 'redirected' };
      redirected = claimed === undefined ? null : claimed;
    }
  }
  // 9. request_sent, judged with a valid claimed provenance, else the ceiling
  const sent = record.requestSent;
  if (sent !== true && sent !== false && sent !== null) return { rule: 'request_sent' };
  const claimedProvenance = record.provenance;
  const effective = rankOf(claimedProvenance) > 0 ? claimedProvenance : ceiling;
  if (effective === 'simulated' ? sent !== false : outcome === 'resolved' && sent !== true) {
    return { rule: 'request_sent' };
  }
  // 10. provenance: a ceiling is asserted, never used to rewrite
  let provenance = ceiling;
  if (claimedProvenance !== undefined) {
    const rank = rankOf(claimedProvenance);
    if (rank === 0 || rank > rankOf(ceiling)) return { rule: 'provenance' };
    provenance = claimedProvenance;
  }
  // 11. detail
  let detail = null;
  if (record.detail !== undefined && record.detail !== null) {
    if (typeof record.detail !== 'string') return { rule: 'detail' };
    detail = cleanDetail(record.detail);
  }
  const redirects = steps === null ? null : Object.freeze(steps.map(step => Object.freeze({
    url: step.url, status: step.status, location: step.location,
    refusedScheme: step.refusedScheme,
  })));
  return {
    record: {
      outcome, reason, provenance, requestSent: sent,
      finalUrl: outcome === 'resolved' ? record.finalUrl : null,
      status: outcome === 'resolved' ? record.status : null,
      redirected, redirects, hopCount, detail,
    },
  };
}

// A fresh plain observation from a checked record (for transports that check before answering).
function observationFrom(record) {
  if (record.outcome === 'resolved') {
    return { outcome: 'resolved', finalUrl: record.finalUrl, status: record.status,
      redirects: record.redirects, redirected: record.redirected, requestSent: record.requestSent,
      provenance: record.provenance, detail: record.detail };
  }
  if (record.outcome === 'failed') {
    return { outcome: 'failed', reason: record.reason, redirects: record.redirects,
      redirected: record.redirected, requestSent: record.requestSent,
      provenance: record.provenance, detail: record.detail };
  }
  return { outcome: 'unavailable', reason: record.reason, requestSent: record.requestSent,
    provenance: record.provenance, detail: record.detail };
}

// ---- Transports: shared validation --------------------------------------------------------------

function transportParts(transport) {
  if (!isObject(transport)) throw new TypeError('A destination transport object is required.');
  const kind = transport.kind;
  if (!TRANSPORT_KINDS.includes(kind)) throw new TypeError('transport.kind is not a known kind.');
  const label = checkLabel(transport.label, 'transport.label');
  const provenance = transport.provenance;
  if (!PROVENANCES.includes(provenance)) {
    throw new TypeError('transport.provenance must be network, fixture or simulated.');
  }
  const resolve = transport.resolve;
  if (typeof resolve !== 'function') throw new TypeError('transport.resolve must be a function.');
  return { transport, resolve, provenance, info: Object.freeze({ kind, label }) };
}

// Every built-in transport refuses an invalid request synchronously, before any work: TypeError
// for the request object, its url or its signal, RangeError for maxHops or timeoutMs.
function checkTransportRequest(request) {
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

// ---- Resolutions and the shared, backstopped call -----------------------------------------------

function makeResolution(url, parts, fields, durationMs, cause) {
  const resolution = {
    outcome: fields.outcome,
    reason: nullable(fields.reason),
    url,
    transport: parts.info,
    provenance: fields.provenance === undefined ? parts.provenance : fields.provenance,
    requestSent: nullable(fields.requestSent),
    finalUrl: nullable(fields.finalUrl),
    status: nullable(fields.status),
    redirected: nullable(fields.redirected),
    changed: nullable(fields.changed),
    redirects: nullable(fields.redirects),
    hopCount: nullable(fields.hopCount),
    detail: nullable(fields.detail),
    durationMs,
  };
  if (cause !== undefined) {
    Object.defineProperty(resolution, 'cause', { value: cause.value, enumerable: false });
  }
  return Object.freeze(resolution);
}

function observedResolution(url, maxHops, parts, observation, durationMs) {
  const checked = checkObservation(observation, url, maxHops, parts.provenance);
  if (checked.rule !== undefined) {
    return makeResolution(url, parts, { outcome: 'unavailable', reason: 'invalid_observation',
      requestSent: null, detail: `Invalid observation: ${checked.rule}` }, durationMs);
  }
  const record = checked.record;
  return makeResolution(url, parts, {
    outcome: record.outcome, reason: record.reason, provenance: record.provenance,
    requestSent: record.requestSent, finalUrl: record.finalUrl, status: record.status,
    redirected: record.redirected,
    changed: record.outcome === 'resolved' ? record.finalUrl !== url : null,
    redirects: record.redirects, hopCount: record.hopCount, detail: record.detail,
  }, durationMs);
}

const thrownResolution = (url, parts, error, durationMs) => makeResolution(url, parts,
  { outcome: 'unavailable', reason: 'transport_error', requestSent: null,
    detail: 'Transport threw' }, durationMs, { value: error });

// The injected timers threw before the transport was called: nothing was sent.
const timersResolution = (url, parts, error, durationMs) => makeResolution(url, parts,
  { outcome: 'unavailable', reason: 'transport_error', requestSent: false,
    detail: 'Timers threw' }, durationMs, { value: error });

// One transport call that settles exactly once: with the checked observation, a
// transport_error, or transport_unresponsive when the backstop fires at timeoutMs + 1000.
// `controller.signal` is the request signal. The handle exists before start() runs any
// injected code, so an abort raised inside timers.setTimeout or transport.resolve() finds it.
// Such an end raised inside the clock while the call starts has already stopped the call, so an
// error that clock member throws as well cannot settle it; it goes to `onLost` when given.
function createCall(parts, url, maxHops, timeoutMs, clock, controller, onSettle, onLost) {
  let live = true;
  let called = false;
  let begun = null;
  let backstop = null;
  const elapsed = () => {
    if (begun === null) return 0;
    try {
      return Math.max(0, Math.round(clock.monotonic() - begun));
    } catch (ignored) {
      return 0;
    }
  };
  const disarm = () => {
    const handle = backstop;
    backstop = null;
    if (handle === null) return;
    try {
      clock.clear(handle);
    } catch (ignored) {
      // The backstop stays armed and does nothing once the call has ended.
    }
  };
  const stop = () => {
    if (!live) return false;
    live = false;
    disarm();
    return true;
  };
  const finish = build => {
    if (stop()) onSettle(build(elapsed()));
  };
  const fire = () => {
    backstop = null;
    if (!live) return;
    controller.abort();
    finish(ms => makeResolution(url, parts, { outcome: 'unavailable',
      reason: 'transport_unresponsive', requestSent: null, detail: 'Transport did not settle' },
    ms));
  };
  function start() {
    if (!live) return;
    try {
      begun = clock.monotonic();
      backstop = clock.set(fire, timeoutMs + BACKSTOP_MS);
    } catch (error) {
      if (live) finish(ms => timersResolution(url, parts, error, ms));
      else if (onLost !== undefined) onLost(error);
      return;
    }
    if (!live) {
      disarm();
      return;
    }
    called = true;
    const request = Object.freeze({ url, maxHops, timeoutMs, signal: controller.signal });
    try {
      const pending = Reflect.apply(parts.resolve, parts.transport, [request]);
      Promise.resolve(pending).then(
        observation => finish(ms => observedResolution(url, maxHops, parts, observation, ms)),
        error => finish(ms => thrownResolution(url, parts, error, ms)),
      );
    } catch (error) {
      finish(ms => thrownResolution(url, parts, error, ms));
    }
  }
  return Object.freeze({ start, cancel: stop, elapsed, get called() { return called; } });
}

export function resolveDestination(transport, request, options) {
  const parts = transportParts(transport);
  if (!isObject(request)) throw new TypeError('resolveDestination() needs a request object.');
  const url = request.url;
  if (!isRequestUrl(url)) {
    throw new TypeError('request.url must be the requestUrl of an eligible candidate.');
  }
  const maxHops = integerOption(request.maxHops, DEFAULT_MAX_HOPS, 0, MAX_HOPS_LIMIT,
    'request.maxHops');
  const timeoutMs = integerOption(request.timeoutMs, DEFAULT_TIMEOUT_MS, 1, MAX_TIMEOUT_MS,
    'request.timeoutMs');
  const signal = request.signal === undefined ? null : request.signal;
  if (signal !== null) checkSignal(signal, 'request.signal');
  const clock = clockFrom(optionalObject(options, 'options').timers);
  const canceled = (requestSent, durationMs) => makeResolution(url, parts,
    { outcome: 'canceled', reason: 'aborted', requestSent }, durationMs);
  if (signal !== null && signalAborted(signal, 'request.signal')) {
    return Promise.resolve(canceled(false, 0));
  }
  let deliver = null;
  const promise = new Promise(resolve => {
    deliver = resolve;
  });
  const controller = new AbortController();
  const call = createCall(parts, url, maxHops, timeoutMs, clock, controller, result => {
    if (signal !== null) unlisten(signal, onAbort);
    deliver(result);
  });
  function onAbort() {
    if (!call.cancel()) return;
    unlisten(signal, onAbort);
    controller.abort();
    deliver(canceled(call.called ? null : false, call.elapsed()));
  }
  // The listener is in place before any injected code runs; a signal that refuses it is
  // refused here, before anything starts.
  if (signal !== null) listen(signal, onAbort, 'request.signal');
  call.start();
  return promise;
}

// ---- Verifier store -----------------------------------------------------------------------------

function makeSnapshot(encodedUrl, requestUrl, fields) {
  return Object.freeze({
    encodedUrl,
    requestUrl,
    state: fields.state,
    reason: nullable(fields.reason),
    attemptId: nullable(fields.attemptId),
    transport: nullable(fields.transport),
    provenance: nullable(fields.provenance),
    requestSent: nullable(fields.requestSent),
    finalUrl: nullable(fields.finalUrl),
    status: nullable(fields.status),
    redirected: nullable(fields.redirected),
    changed: nullable(fields.changed),
    redirects: nullable(fields.redirects),
    hopCount: nullable(fields.hopCount),
    startedAt: nullable(fields.startedAt),
    settledAt: nullable(fields.settledAt),
    durationMs: nullable(fields.durationMs),
    detail: nullable(fields.detail),
  });
}

function defaultReportError(error) {
  const report = globalThis.reportError;
  if (typeof report === 'function') {
    report(error);
    return;
  }
  const console = globalThis.console;
  if (isObject(console) && typeof console.error === 'function') console.error(error);
}

export function createDestinationVerifier(options) {
  requiredObject(options, 'createDestinationVerifier() options');
  if (options.transport === undefined) {
    throw new TypeError('options.transport is required (null means no transport).');
  }
  const parts = options.transport === null ? null : transportParts(options.transport);
  const timeoutMs = integerOption(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1, MAX_TIMEOUT_MS,
    'timeoutMs');
  const maxHops = integerOption(options.maxHops, DEFAULT_MAX_HOPS, 0, MAX_HOPS_LIMIT, 'maxHops');
  const maxConcurrent = integerOption(options.maxConcurrent, 2, 1, 8, 'maxConcurrent');
  const maxQueued = integerOption(options.maxQueued, 16, 0, 256, 'maxQueued');
  const maxEntries = integerOption(options.maxEntries, 64, 1, 1024, 'maxEntries');
  if (maxEntries <= maxConcurrent + maxQueued) {
    throw new RangeError('maxEntries must be greater than maxConcurrent + maxQueued.');
  }
  const clock = clockFrom(options.timers);
  const reportOption = optionalFunction(options.reportError, 'reportError');
  const reportTo = reportOption === undefined ? defaultReportError : reportOption;
  const report = error => {
    try {
      reportTo(error);
    } catch (ignored) {
      // reportError never rethrows.
    }
  };
  const info = parts === null ? null : parts.info;
  const publicTransport = parts === null ? null
    : Object.freeze({ kind: info.kind, label: info.label, provenance: parts.provenance });

  const entries = new Map();
  const unverified = new Map();
  const waiting = [];
  const notes = [];
  let listeners = [];
  let running = 0;
  let nextAttemptId = 1;
  let flushing = false;
  // Set when destroy() starts: no attempt may begin while its clear events are delivered.
  let closing = false;
  let destroyed = false;

  const alive = name => {
    if (destroyed) throw new TypeError(`verifier.${name}() was called after destroy().`);
  };

  function keyOf(target) {
    let value;
    if (typeof target === 'string') {
      value = target;
    } else if (isObject(target) && 'encodedUrl' in target) {
      value = target.encodedUrl;
    } else {
      throw new TypeError('A destination target is a string or a destination candidate.');
    }
    if (typeof value !== 'string') return null;
    const checked = ruleE(value);
    return checked.reason === null ? { encodedUrl: value, requestUrl: checked.requestUrl } : null;
  }

  function unverifiedOf(key) {
    let snapshot = unverified.get(key.encodedUrl);
    if (snapshot !== undefined) {
      unverified.delete(key.encodedUrl);
    } else {
      snapshot = makeSnapshot(key.encodedUrl, key.requestUrl, { state: 'unverified' });
    }
    unverified.set(key.encodedUrl, snapshot);
    if (unverified.size > UNVERIFIED_MEMO_SIZE) unverified.delete(unverified.keys().next().value);
    return snapshot;
  }

  // Recency only moves for an entry that is still in the store.
  function touch(entry) {
    if (entries.get(entry.encodedUrl) !== entry) return;
    entries.delete(entry.encodedUrl);
    entries.set(entry.encodedUrl, entry);
  }

  // Changes caused by a listener wait until the current change has reached every listener.
  function emit(change, after) {
    notes.push({ change, after });
    deliver();
  }

  // Runs `change` as one change: the events it causes reach listeners once it has returned.
  function batch(change) {
    if (flushing) return change();
    flushing = true;
    try {
      return change();
    } finally {
      flushing = false;
      deliver();
    }
  }

  function deliver() {
    if (flushing) return;
    flushing = true;
    try {
      while (notes.length > 0) {
        const note = notes.shift();
        if (note.change !== null) {
          for (const record of listeners.slice()) {
            if (!record.active) continue;
            const listener = record.listener;
            try {
              listener(note.change);
            } catch (error) {
              report(error);
            }
          }
        }
        if (note.after !== null) {
          try {
            note.after();
          } catch (error) {
            report(error);
          }
        }
      }
    } finally {
      flushing = false;
    }
  }

  function store(entry, snapshot, cause, after) {
    const previous = entry.snapshot;
    entry.snapshot = snapshot;
    touch(entry);
    emit(Object.freeze({ encodedUrl: entry.encodedUrl, snapshot, previous, cause }), after);
  }

  // Clock readings for snapshots. A timers member that throws is reported; the wall time then
  // falls back to Date.now() and the duration to 0, so no attempt is stranded.
  function wallNow() {
    try {
      return clock.now();
    } catch (error) {
      report(error);
      return Date.now();
    }
  }

  function durationOf(attempt) {
    if (attempt.startedAt === null) return null;
    try {
      return Math.max(0, Math.round(clock.monotonic() - attempt.begun));
    } catch (error) {
      report(error);
      return 0;
    }
  }

  const snapshotFor = (attempt, fields) => makeSnapshot(attempt.entry.encodedUrl,
    attempt.entry.requestUrl, Object.assign({ attemptId: attempt.id, transport: info,
      provenance: parts.provenance, startedAt: attempt.startedAt }, fields));

  function createAttempt() {
    const attempt = { id: null, entry: null, phase: 'queued',
      controller: parts === null ? null : new AbortController(), core: null, failure: null,
      startedAt: null, begun: 0, links: [], promise: null, resolve: null };
    attempt.promise = new Promise(resolve => {
      attempt.resolve = resolve;
    });
    return attempt;
  }

  function detach(attempt) {
    for (const link of attempt.links) unlisten(link.signal, link.listener);
    attempt.links = [];
  }

  // Throws a TypeError, with nothing attached, for a signal that refuses the listener. The
  // signal's own code may end the attempt while it takes the listener: nothing stays attached.
  function attach(attempt, signal) {
    const listener = () => cancelAttempt(attempt, 'aborted');
    listen(signal, listener, 'options.signal');
    if (attempt.phase === 'done') unlisten(signal, listener);
    else attempt.links.push({ signal, listener });
  }

  // Timers, signals, the transport and reportError are injected code, and what they call while
  // the verifier writes may supersede that write. So an end first frees the attempt's slot or
  // queue place and unlinks it from its entry (retire); its injected work (release, the clock)
  // runs inside a batch, after its change is queued or once its snapshot is known; and a
  // snapshot is stored only while its entry is in the store and unchanged since the end began.
  function retire(attempt) {
    const wasRunning = attempt.phase === 'running';
    if (wasRunning) {
      running -= 1;
    } else {
      const index = waiting.indexOf(attempt);
      if (index !== -1) waiting.splice(index, 1);
    }
    attempt.phase = 'done';
    attempt.entry.attempt = null;
    return wasRunning;
  }

  const unchanged = (entry, before) =>
    entries.get(entry.encodedUrl) === entry && entry.snapshot === before;

  // The injected part of an end: the backstop timer, the callers' listeners, the request signal.
  function release(attempt) {
    if (attempt.core !== null) attempt.core.cancel();
    detach(attempt);
    attempt.controller.abort();
  }

  const canceledOf = (attempt, reason, wasRunning) => snapshotFor(attempt, { state: 'canceled',
    reason, requestSent: wasRunning ? null : false, settledAt: wallNow(),
    durationMs: durationOf(attempt) });

  function cancelAttempt(attempt, reason) {
    const entry = attempt.entry;
    if (entry === null || attempt.phase === 'done' || entry.attempt !== attempt) return;
    const before = entry.snapshot;
    const wasRunning = retire(attempt);
    const snapshot = batch(() => {
      release(attempt);
      const canceled = canceledOf(attempt, reason, wasRunning);
      if (unchanged(entry, before)) store(entry, canceled, 'cancel', null);
      return canceled;
    });
    attempt.resolve(snapshot);
    if (wasRunning) pump();
  }

  // Takes entries out of the store as one change. Every entry leaves the store and frees its slot
  // or queue place, and every event is queued, before any injected code runs; then each
  // in-flight promise resolves canceled/cleared. Returns whether a running attempt ended.
  function removeAll(list, cause) {
    return batch(() => {
      const ended = [];
      for (const entry of list) {
        entries.delete(entry.encodedUrl);
        if (entry.attempt !== null) {
          const attempt = entry.attempt;
          ended.push({ attempt, wasRunning: retire(attempt) });
        }
        emit(Object.freeze({ encodedUrl: entry.encodedUrl, snapshot: unverifiedOf(entry),
          previous: entry.snapshot, cause }), null);
      }
      let freed = false;
      for (const { attempt, wasRunning } of ended) {
        release(attempt);
        attempt.resolve(canceledOf(attempt, 'cleared', wasRunning));
        if (wasRunning) freed = true;
      }
      return freed;
    });
  }

  const remove = (entry, cause) => removeAll([entry], cause);

  function settle(attempt, resolution) {
    const entry = attempt.entry;
    if (attempt.phase !== 'running' || entry.attempt !== attempt) return;
    const before = entry.snapshot;
    retire(attempt);
    const snapshot = batch(() => {
      detach(attempt);
      const settled = snapshotFor(attempt, {
        state: resolution.outcome, reason: resolution.reason, provenance: resolution.provenance,
        requestSent: resolution.requestSent, finalUrl: resolution.finalUrl,
        status: resolution.status, redirected: resolution.redirected,
        changed: resolution.changed, redirects: resolution.redirects,
        hopCount: resolution.hopCount, settledAt: wallNow(), durationMs: durationOf(attempt),
        detail: resolution.detail,
      });
      const after = resolution.reason === 'transport_error' ? () => report(resolution.cause) : null;
      if (unchanged(entry, before)) store(entry, settled, 'settle', after);
      else if (after !== null) after();
      return settled;
    });
    attempt.resolve(snapshot);
    pump();
  }

  // The call is the attempt's core before it starts, so an end of the attempt raised inside
  // timers.setTimeout or transport.resolve() also stops the backstop. Timers that threw in
  // begin() settle the attempt without a call. As in begin(), an error the call's clock throws
  // after an end raised inside it is reported once.
  function launch(attempt) {
    if (attempt.phase !== 'running' || attempt.core !== null) return;
    const url = attempt.entry.requestUrl;
    if (attempt.failure !== null) {
      settle(attempt, timersResolution(url, parts, attempt.failure, 0));
      return;
    }
    const call = createCall(parts, url, maxHops, timeoutMs, clock, attempt.controller,
      resolution => settle(attempt, resolution), report);
    attempt.core = call;
    call.start();
  }

  // The transport is called only after the start event reached every listener. An end raised
  // from inside the clock (cancel, forget, clear, destroy, a caller's abort) is the attempt's
  // last change: it has been stored and freed the slot, so nothing more is stored, and an error
  // the clock threw as well is reported.
  function begin(attempt, cause) {
    attempt.phase = 'running';
    running += 1;
    try {
      const startedAt = clock.now();
      attempt.begun = clock.monotonic();
      attempt.startedAt = startedAt;
    } catch (error) {
      attempt.failure = error;
    }
    if (attempt.phase !== 'running') {
      if (attempt.failure !== null) report(attempt.failure);
      return;
    }
    store(attempt.entry, snapshotFor(attempt, { state: 'resolving' }), cause,
      () => launch(attempt));
  }

  function pump() {
    while (running < maxConcurrent && waiting.length > 0) begin(waiting.shift(), 'start');
  }

  // Returns the least recently used settled entry to unverified when a new entry needs room.
  function makeRoom() {
    if (entries.size < maxEntries) return;
    for (const entry of entries.values()) {
      if (entry.attempt === null) {
        remove(entry, 'evict');
        return;
      }
    }
  }

  // One change: every entry leaves the store and every clear event is queued before any listener
  // or injected code runs. What they start then finds free slots and an empty queue, runs
  // normally and is announced after the last clear event; nothing being cleared can start or be
  // announced twice.
  function clearAll() {
    removeAll(Array.from(entries.values()), 'clear');
  }

  const open = () => {
    alive('resolve');
    if (closing) throw new TypeError('verifier.resolve() was called during destroy().');
  };

  // The caller's signal is attached before anything changes, so a refused one changes nothing.
  function join(entry, signal, aborted) {
    const joined = entry.attempt;
    if (signal !== null && !aborted) attach(joined, signal);
    touch(entry);
    if (aborted) cancelAttempt(joined, 'aborted');
    return joined.promise;
  }

  // Runs as one change: the entry is in place and its attempt registered before the evict
  // event that made room reaches a listener, so a listener that resolves there neither overfills
  // the store nor starts a second attempt for this URL.
  function admit(key, attempt, signal, aborted) {
    let entry = entries.get(key.encodedUrl);
    if (closing || (entry !== undefined && entry.attempt !== null)) {
      // The signal's own code re-entered the verifier while it was being attached.
      detach(attempt);
      open();
      return join(entry, signal, aborted);
    }
    const id = nextAttemptId;
    nextAttemptId += 1;
    if (entry === undefined) {
      makeRoom();
      entry = { encodedUrl: key.encodedUrl, requestUrl: key.requestUrl,
        snapshot: unverifiedOf(key), attempt: null };
      entries.set(key.encodedUrl, entry);
    }
    // Signal and clock code run here: a result they superseded still resolves the promise, but
    // only the entry's latest change stays stored.
    const immediate = fields => {
      const before = entry.snapshot;
      detach(attempt);
      const snapshot = makeSnapshot(key.encodedUrl, key.requestUrl,
        Object.assign({ attemptId: id, requestSent: false, settledAt: wallNow() }, fields));
      if (unchanged(entry, before)) store(entry, snapshot, 'attempt', null);
      return Promise.resolve(snapshot);
    };
    if (parts === null) return immediate({ state: 'unavailable', reason: 'no_transport' });
    const used = { transport: info, provenance: parts.provenance };
    if (aborted) return immediate(Object.assign({ state: 'canceled', reason: 'aborted' }, used));
    // Queued attempts keep their place: a new one starts only when a slot is free and nothing
    // waits, and the bound counts running and queued attempts together.
    if (running + waiting.length >= maxConcurrent + maxQueued) {
      return immediate(Object.assign({ state: 'unavailable', reason: 'queue_full' }, used));
    }
    attempt.id = id;
    attempt.entry = entry;
    entry.attempt = attempt;
    if (running < maxConcurrent && waiting.length === 0) {
      begin(attempt, 'attempt');
    } else {
      waiting.push(attempt);
      store(entry, snapshotFor(attempt, { state: 'resolving' }), 'attempt', null);
    }
    return attempt.promise;
  }

  function resolveTarget(target, resolveOptions) {
    open();
    const key = keyOf(target);
    if (key === null) throw new TypeError('verifier.resolve() needs an eligible destination.');
    let signal = null;
    if (resolveOptions !== undefined) {
      requiredObject(resolveOptions, 'verifier.resolve() options');
      if (resolveOptions.signal !== undefined) {
        signal = checkSignal(resolveOptions.signal, 'options.signal');
      }
    }
    const aborted = signal !== null && signalAborted(signal, 'options.signal');
    const entry = entries.get(key.encodedUrl);
    if (entry !== undefined && entry.attempt !== null) return join(entry, signal, aborted);
    const attempt = createAttempt();
    if (signal !== null && !aborted) attach(attempt, signal);
    return batch(() => admit(key, attempt, signal, aborted));
  }

  return Object.freeze({
    get transport() {
      return publicTransport;
    },
    get canResolve() {
      return parts !== null && !closing;
    },
    get(target) {
      alive('get');
      const key = keyOf(target);
      if (key === null) return null;
      const entry = entries.get(key.encodedUrl);
      if (entry === undefined) return unverifiedOf(key);
      touch(entry);
      return entry.snapshot;
    },
    resolve: resolveTarget,
    cancel(target) {
      alive('cancel');
      const key = keyOf(target);
      if (key === null) return false;
      const entry = entries.get(key.encodedUrl);
      if (entry === undefined || entry.attempt === null) return false;
      cancelAttempt(entry.attempt, 'canceled');
      return true;
    },
    forget(target) {
      alive('forget');
      const key = keyOf(target);
      if (key === null) return;
      const entry = entries.get(key.encodedUrl);
      if (entry !== undefined && remove(entry, 'forget')) pump();
    },
    clear() {
      alive('clear');
      clearAll();
    },
    subscribe(listener) {
      alive('subscribe');
      if (typeof listener !== 'function') throw new TypeError('A listener must be a function.');
      const record = { listener, active: true };
      listeners.push(record);
      return () => {
        if (!record.active) return;
        record.active = false;
        const index = listeners.indexOf(record);
        if (index !== -1) listeners.splice(index, 1);
      };
    },
    destroy() {
      if (closing) return;
      closing = true;
      clearAll();
      destroyed = true;
      // Listeners are dropped after the clear events have been delivered.
      emit(null, () => {
        for (const record of listeners) record.active = false;
        listeners = [];
      });
    },
  });
}

// ---- Selection binder ---------------------------------------------------------------------------

const sameCandidate = (a, b) => a.eligible === b.eligible && a.encodedUrl === b.encodedUrl &&
  a.source === b.source && a.reason === b.reason;

export function createDestinationSelection(verifier, options) {
  if (!isObject(verifier) || typeof verifier.get !== 'function' ||
      typeof verifier.subscribe !== 'function' || typeof verifier.cancel !== 'function') {
    throw new TypeError('createDestinationSelection() needs a destination verifier.');
  }
  const settings = optionalObject(options, 'createDestinationSelection() options');
  const onChange = optionalFunction(settings.onChange, 'onChange');
  const cancelOnDeselect = settings.cancelOnDeselect === undefined ? false
    : settings.cancelOnDeselect;
  if (typeof cancelOnDeselect !== 'boolean') {
    throw new TypeError('cancelOnDeselect must be a boolean.');
  }
  let current = null;
  let view = null;
  let destroyed = false;
  const notify = () => {
    if (onChange !== undefined) onChange(view);
  };
  const unsubscribe = verifier.subscribe(change => {
    if (destroyed || current === null || !current.eligible) return;
    if (change.encodedUrl !== current.encodedUrl) return;
    view = Object.freeze({ candidate: current, snapshot: change.snapshot });
    notify();
  });
  return Object.freeze({
    get view() {
      return view;
    },
    select(input) {
      if (destroyed) throw new TypeError('selection.select() was called after destroy().');
      const next = input === null ? null : destinationCandidate(input);
      if (next === null ? current === null : current !== null && sameCandidate(next, current)) {
        return view;
      }
      // get() may throw: the new view is built before the selection changes.
      const snapshot = next !== null && next.eligible ? verifier.get(next) : null;
      const previous = current;
      current = next;
      view = next === null ? null : Object.freeze({ candidate: next, snapshot });
      if (cancelOnDeselect && previous !== null && previous.eligible &&
          (next === null || next.encodedUrl !== previous.encodedUrl)) {
        verifier.cancel(previous);
      }
      notify();
      return view;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      current = null;
      view = null;
    },
  });
}

// ---- Browser fetch transport --------------------------------------------------------------------

function portOf(url) {
  if (url.port !== '') return Number(url.port);
  return url.protocol === 'https:' ? 443 : 80;
}

function originOf(text) {
  try {
    return new URL(text).origin;
  } catch (error) {
    return null;
  }
}

function checkFixtureOrigin(value) {
  const refusal = 'fixtureOrigin must be an http(s) origin on the literal 127.0.0.1 or [::1].';
  if (typeof value !== 'string') throw new TypeError(refusal);
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new TypeError(refusal);
  }
  if (url.origin !== value || (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      (url.hostname !== '127.0.0.1' && url.hostname !== '[::1]') ||
      DESTINATION_POLICY.badPorts.includes(portOf(url))) {
    throw new TypeError(refusal);
  }
  return value;
}

// Server runtimes have no CORS and follow redirects anywhere: the fetch transport refuses them,
// whatever fetch was injected.
function serverRuntime(injected) {
  const scope = globalThis;
  if (typeof scope.process?.versions?.node === 'string') return true;
  if (scope.Deno !== undefined) return true;
  if (!isObject(scope.location)) return true;
  return !injected && typeof scope.fetch !== 'function';
}

function discardBody(response) {
  try {
    const body = response.body;
    if (isObject(body) && typeof body.cancel === 'function') {
      const done = body.cancel();
      if (isObject(done) && typeof done.catch === 'function') done.catch(() => {});
    }
  } catch (ignored) {
    // The body is never read.
  }
}

function fetchObservation(response, fixtureOrigin) {
  const type = response.type;
  const status = response.status;
  const url = response.url;
  const redirected = response.redirected === true;
  discardBody(response);
  if (type === 'opaque' || type === 'opaqueredirect' || status === 0 || url === '') {
    return { outcome: 'unavailable', reason: 'opaque_response', requestSent: null,
      detail: 'Browser returned an opaque response' };
  }
  if (fixtureOrigin !== null) {
    if (originOf(url) !== fixtureOrigin) {
      return { outcome: 'failed', reason: 'left_fixture', redirects: null, redirected: true,
        requestSent: true, detail: 'Left the fixture scope' };
    }
    if (redirected) {
      return { outcome: 'resolved', finalUrl: url, status, redirects: null, redirected: true,
        requestSent: true, detail: 'Intermediate redirects not observed' };
    }
  }
  return { outcome: 'resolved', finalUrl: url, status, redirects: redirected ? null : [],
    redirected, requestSent: true };
}

const refusedBeforeSending = (reason, detail) =>
  ({ outcome: 'failed', reason, redirects: [], redirected: false, requestSent: false, detail });

export function createFetchTransport(options) {
  const settings = requiredObject(options, 'createFetchTransport() options');
  const scope = settings.scope;
  if (scope !== 'network' && scope !== 'fixture') {
    throw new TypeError("createFetchTransport() needs scope 'network' or 'fixture'.");
  }
  let fixtureOrigin = null;
  if (scope === 'fixture') {
    fixtureOrigin = checkFixtureOrigin(settings.fixtureOrigin);
  } else if (settings.fixtureOrigin !== undefined) {
    throw new TypeError("fixtureOrigin belongs to scope 'fixture' only.");
  }
  const label = settings.label === undefined
    ? (scope === 'fixture' ? 'Local fixture (this browser)' : 'This browser')
    : checkLabel(settings.label, 'label');
  const injected = optionalFunction(settings.fetch, 'fetch');
  const clock = clockFrom(settings.timers);
  return Object.freeze({
    kind: 'fetch',
    label,
    provenance: scope,
    resolve(request) {
      const checked = checkTransportRequest(request);
      const signal = checked.signal;
      if (signal.aborted) return Promise.reject(abortReason(signal));
      if (serverRuntime(injected !== undefined)) {
        return Promise.resolve({ outcome: 'unavailable', reason: 'transport_unsupported',
          requestSent: false, detail: 'Runtime not supported' });
      }
      const target = new URL(checked.url);
      if (fixtureOrigin !== null && target.origin !== fixtureOrigin) {
        return Promise.resolve({ outcome: 'unavailable', reason: 'out_of_scope',
          requestSent: false, detail: 'Outside this transport scope' });
      }
      if (DESTINATION_POLICY.badPorts.includes(portOf(target))) {
        return Promise.resolve(refusedBeforeSending('blocked_port', 'Port not allowed'));
      }
      if (fixtureOrigin === null) {
        const host = classifyHost(target.hostname);
        if (host === null || !host.allowed) {
          return Promise.resolve(refusedBeforeSending('blocked_address', 'Address not allowed'));
        }
        if (globalThis.location.protocol === 'https:' && target.protocol === 'http:') {
          return Promise.resolve({ outcome: 'unavailable', reason: 'mixed_content',
            requestSent: false, detail: 'HTTPS page, HTTP target' });
        }
      }
      const fetchImpl = injected !== undefined ? injected : globalThis.fetch;
      return new Promise((resolve, reject) => {
        const controller = new AbortController();
        let open = true;
        let timer = null;
        const close = () => {
          open = false;
          if (timer !== null) {
            clock.clear(timer);
            timer = null;
          }
          signal.removeEventListener('abort', onAbort);
        };
        function onAbort() {
          if (!open) return;
          close();
          controller.abort();
          reject(abortReason(signal));
        }
        timer = clock.set(() => {
          timer = null;
          if (!open) return;
          close();
          controller.abort();
          resolve({ outcome: 'failed', reason: 'timeout', redirects: null, requestSent: null,
            detail: 'Timed out' });
        }, checked.timeoutMs);
        signal.addEventListener('abort', onAbort, { once: true });
        let pending;
        try {
          pending = fetchImpl(checked.url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-store',
            redirect: 'follow',
            referrer: '',
            referrerPolicy: 'no-referrer',
            signal: controller.signal,
          });
        } catch (error) {
          pending = Promise.reject(error);
        }
        Promise.resolve(pending).then(response => {
          if (!open) {
            discardBody(response);
            return;
          }
          close();
          try {
            resolve(fetchObservation(response, fixtureOrigin));
          } catch (error) {
            reject(error);
          }
        }, error => {
          if (!open) return;
          close();
          if (isTypeError(error)) {
            resolve({ outcome: 'unavailable', reason: 'opaque_network_error', requestSent: null,
              detail: 'Browser network error without detail' });
          } else {
            reject(error);
          }
        });
      });
    },
  });
}

// ---- Endpoint transport -------------------------------------------------------------------------

function endpointHref(value, crossOrigin) {
  const refusal = 'endpoint must be a /path on the page origin or an absolute http(s) URL ' +
    'without credentials.';
  if (typeof value !== 'string' || value === '') throw new TypeError(refusal);
  const page = globalThis.location;
  const pageHref = isObject(page) && typeof page.href === 'string' ? page.href : null;
  let url;
  if (value.charAt(0) === '/') {
    if (value.charAt(1) === '/' || value.charAt(1) === '\\') throw new TypeError(refusal);
    if (pageHref === null) {
      throw new TypeError('A /path endpoint needs a page or worker origin (globalThis.location).');
    }
    try {
      url = new URL(value, pageHref);
    } catch (error) {
      throw new TypeError(refusal);
    }
    if (url.origin !== originOf(pageHref)) throw new TypeError(refusal);
  } else {
    if (!HTTP_PREFIX.test(value)) throw new TypeError(refusal);
    try {
      url = new URL(value);
    } catch (error) {
      throw new TypeError(refusal);
    }
    if (url.username !== '' || url.password !== '') throw new TypeError(refusal);
    if (pageHref !== null && crossOrigin !== true && url.origin !== originOf(pageHref)) {
      throw new TypeError('A browser endpoint must be on the page origin (crossOrigin: true ' +
        'only for third-party wire implementations that grant the preflight).');
    }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new TypeError(refusal);
  url.hash = '';
  return url.href;
}

function endpointHeaders(value) {
  const headers = {};
  if (value === undefined) return headers;
  if (!isObject(value) || Array.isArray(value)) throw new TypeError('headers must be an object.');
  for (const name of Object.keys(value)) {
    const text = value[name];
    const lower = name.toLowerCase();
    if (!HEADER_NAME.test(name) || lower === 'content-type' || lower === 'accept') {
      throw new TypeError('Header names are tokens; content-type and accept are fixed.');
    }
    if (typeof text !== 'string' || HEADER_VALUE_BREAK.test(text)) {
      throw new TypeError('Header values are strings without CR, LF or NUL.');
    }
    Object.defineProperty(headers, name, { value: text, enumerable: true, writable: true,
      configurable: true });
  }
  return headers;
}

function mediaEssence(value) {
  return typeof value === 'string' ? value.split(';')[0].trim().toLowerCase() : '';
}

function cancelQuietly(target) {
  try {
    const done = target.cancel();
    if (isObject(done) && typeof done.catch === 'function') done.catch(() => {});
  } catch (ignored) {
    // Nothing more is read either way.
  }
}

function wireDetail(value) {
  if (typeof value !== 'string') return value;
  for (const row of DESTINATION_POLICY.detailSentences) {
    if (value === row.text) return value;
    if (row.code && value.startsWith(`${row.text} (`) && value.endsWith(')') &&
        DETAIL_CODE.test(value.slice(row.text.length + 2, -1))) {
      return value;
    }
  }
  return null;
}

// Wire response (version 1) to an observation; { rule } when a variant's fixed nulls are not null.
function wireObservation(wire) {
  const outcome = wire.outcome;
  const common = { requestSent: wire.requestSent, provenance: wire.provenance,
    detail: wireDetail(wire.detail) };
  if (outcome === 'resolved') {
    if (wire.reason !== null) return { rule: 'reason' };
    return { observation: Object.assign({ outcome, finalUrl: wire.finalUrl, status: wire.status,
      redirects: wire.redirects, redirected: wire.redirected }, common) };
  }
  if (outcome === 'failed') {
    if (wire.finalUrl !== null || wire.status !== null) return { rule: 'shape' };
    return { observation: Object.assign({ outcome, reason: wire.reason,
      redirects: wire.redirects, redirected: wire.redirected }, common) };
  }
  if (outcome === 'unavailable') {
    if (wire.reason !== 'out_of_scope' && wire.reason !== 'resolver_busy') {
      return { rule: 'reason' };
    }
    if (wire.finalUrl !== null || wire.status !== null || wire.redirected !== null ||
        wire.redirects !== null) {
      return { rule: 'shape' };
    }
    return { observation: Object.assign({ outcome, reason: wire.reason }, common) };
  }
  return { rule: 'shape' };
}

const invalidEndpointResponse = rule => ({ outcome: 'unavailable',
  reason: 'endpoint_invalid_response', requestSent: null,
  detail: `Invalid endpoint response: ${rule}` });

async function endpointObservation(response, request, ceiling) {
  const status = response.status;
  const body = response.body;
  if (status !== 200) {
    if (isObject(body)) cancelQuietly(body);
    return { outcome: 'unavailable', reason: 'endpoint_http_error', requestSent: null,
      detail: `HTTP ${status}` };
  }
  const headers = response.headers;
  const type = isObject(headers) && typeof headers.get === 'function'
    ? headers.get('content-type') : null;
  if (mediaEssence(type) !== 'application/json') {
    if (isObject(body)) cancelQuietly(body);
    return invalidEndpointResponse('media_type');
  }
  if (!isObject(body) || typeof body.getReader !== 'function') {
    return invalidEndpointResponse('body');
  }
  const reader = body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (error) {
      return invalidEndpointResponse('body');
    }
    if (!isObject(chunk) || chunk.done === true) break;
    const value = chunk.value;
    if (!(value instanceof Uint8Array)) {
      cancelQuietly(reader);
      return invalidEndpointResponse('body');
    }
    total += value.length;
    if (total > MAX_ENDPOINT_BYTES) {
      cancelQuietly(reader);
      return invalidEndpointResponse('size');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    return invalidEndpointResponse('encoding');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return invalidEndpointResponse('json');
  }
  const wire = ownRecord(parsed);
  if (wire === null || !keysFit(wire, WIRE_KEYS, [])) return invalidEndpointResponse('shape');
  if (wire.version !== 1) return invalidEndpointResponse('version');
  if (wire.url !== request.url) return invalidEndpointResponse('echo');
  const built = wireObservation(wire);
  if (built.rule !== undefined) return invalidEndpointResponse(built.rule);
  const checked = checkObservation(built.observation, request.url, request.maxHops, ceiling);
  if (checked.rule !== undefined) return invalidEndpointResponse(checked.rule);
  return observationFrom(checked.record);
}

export function createEndpointTransport(options) {
  const settings = requiredObject(options, 'createEndpointTransport() options');
  const label = checkLabel(settings.label, 'label');
  const crossOrigin = settings.crossOrigin === undefined ? false : settings.crossOrigin;
  if (typeof crossOrigin !== 'boolean') throw new TypeError('crossOrigin must be a boolean.');
  const endpoint = endpointHref(settings.endpoint, crossOrigin);
  const credentials = settings.credentials === undefined ? 'same-origin' : settings.credentials;
  if (!['omit', 'same-origin', 'include'].includes(credentials)) {
    throw new TypeError("credentials must be 'omit', 'same-origin' or 'include'.");
  }
  const headers = endpointHeaders(settings.headers);
  const provenance = settings.provenance === undefined ? 'network' : settings.provenance;
  if (!PROVENANCES.includes(provenance)) {
    throw new TypeError('provenance must be network, fixture or simulated.');
  }
  const injected = optionalFunction(settings.fetch, 'fetch');
  const clock = clockFrom(settings.timers);
  return Object.freeze({
    kind: 'endpoint',
    label,
    provenance,
    resolve(request) {
      const checked = checkTransportRequest(request);
      const signal = checked.signal;
      if (signal.aborted) return Promise.reject(abortReason(signal));
      const t = checked.timeoutMs;
      // The server budget leaves the client deadline room to receive its timeout answer.
      const budget = Math.max(1, t - Math.min(1000, Math.floor(t / 10)));
      const body = JSON.stringify({ version: 1, url: checked.url, maxHops: checked.maxHops,
        timeoutMs: budget });
      const fetchImpl = injected !== undefined ? injected : globalThis.fetch;
      return new Promise((resolve, reject) => {
        const controller = new AbortController();
        let open = true;
        let timer = null;
        const close = () => {
          open = false;
          if (timer !== null) {
            clock.clear(timer);
            timer = null;
          }
          signal.removeEventListener('abort', onAbort);
        };
        const finish = value => {
          if (!open) return;
          close();
          resolve(value);
        };
        const fail = error => {
          if (!open) return;
          close();
          reject(error);
        };
        function onAbort() {
          if (!open) return;
          close();
          controller.abort();
          reject(abortReason(signal));
        }
        timer = clock.set(() => {
          timer = null;
          if (!open) return;
          close();
          controller.abort();
          resolve({ outcome: 'unavailable', reason: 'endpoint_timeout', requestSent: null,
            detail: 'Endpoint did not answer' });
        }, t);
        signal.addEventListener('abort', onAbort, { once: true });
        let pending;
        try {
          pending = fetchImpl(endpoint, {
            method: 'POST',
            credentials,
            cache: 'no-store',
            redirect: 'error',
            headers: Object.assign({}, headers, { 'content-type': 'application/json',
              accept: 'application/json' }),
            body,
            signal: controller.signal,
          });
        } catch (error) {
          pending = Promise.reject(error);
        }
        Promise.resolve(pending).then(response => {
          if (!open) return;
          endpointObservation(response, checked, provenance).then(finish, fail);
        }, error => {
          if (isTypeError(error)) {
            finish({ outcome: 'unavailable', reason: 'endpoint_unreachable', requestSent: null });
          } else {
            fail(error);
          }
        });
      });
    },
  });
}

// ---- Prepared transport -------------------------------------------------------------------------

function preparedRecord(url, result) {
  const refusal = rule => new TypeError(`Invalid prepared result: ${rule}`);
  const record = ownRecord(result);
  if (record === null) throw refusal('shape');
  const outcome = record.outcome;
  const detail = record.detail === undefined ? null : record.detail;
  let observation;
  if (outcome === 'resolved') {
    if (!keysFit(record, ['outcome', 'finalUrl', 'status', 'redirects'],
      ['redirected', 'detail'])) {
      throw refusal('shape');
    }
    let redirected = record.redirected;
    if (redirected === undefined) {
      redirected = Array.isArray(record.redirects) ? record.redirects.length > 0 : null;
    }
    observation = { outcome, finalUrl: record.finalUrl, status: record.status,
      redirects: record.redirects, redirected, requestSent: false, detail };
  } else if (outcome === 'failed') {
    if (!keysFit(record, ['outcome', 'reason'], ['redirects', 'detail'])) throw refusal('shape');
    observation = { outcome, reason: record.reason,
      redirects: record.redirects === undefined ? null : record.redirects, requestSent: false,
      detail };
  } else if (outcome === 'unavailable') {
    if (!keysFit(record, ['outcome', 'reason'], ['detail'])) throw refusal('shape');
    observation = { outcome, reason: record.reason, requestSent: false, detail };
  } else {
    throw refusal('shape');
  }
  // Chains are bounded by the hop limit here; each request's maxHops applies at resolve().
  const checked = checkObservation(observation, url, MAX_HOPS_LIMIT, 'simulated');
  if (checked.rule !== undefined) throw refusal(checked.rule);
  return checked.record;
}

function preparedAnswer(record, maxHops) {
  if (record.hopCount !== null && record.hopCount > maxHops) {
    return { outcome: 'failed', reason: 'too_many_redirects',
      redirects: record.redirects.slice(0, maxHops + 1), requestSent: false,
      detail: 'Redirect limit reached' };
  }
  return observationFrom(record);
}

export function createPreparedTransport(entries, options) {
  if (!isObject(entries) || typeof entries[Symbol.iterator] !== 'function') {
    throw new TypeError('createPreparedTransport() takes an iterable of entries.');
  }
  const settings = optionalObject(options, 'createPreparedTransport() options');
  const label = settings.label === undefined ? 'Prepared example'
    : checkLabel(settings.label, 'label');
  const delayMs = integerOption(settings.delayMs, 0, 0, MAX_TIMEOUT_MS, 'delayMs');
  const clock = clockFrom(settings.timers);
  const table = new Map();
  for (const entry of entries) {
    if (!isObject(entry)) throw new TypeError('Each prepared entry is an object.');
    const url = entry.url;
    if (!isRequestUrl(url)) {
      throw new TypeError('A prepared entry url is the requestUrl of an eligible candidate.');
    }
    if (table.has(url)) throw new TypeError('Prepared entry urls must be unique.');
    const result = entry.result;
    table.set(url, result === 'pending' ? 'pending' : preparedRecord(url, result));
  }
  return Object.freeze({
    kind: 'prepared',
    label,
    provenance: 'simulated',
    resolve(request) {
      const checked = checkTransportRequest(request);
      const signal = checked.signal;
      if (signal.aborted) return Promise.reject(abortReason(signal));
      const record = table.get(checked.url);
      if (record === undefined) {
        return Promise.resolve({ outcome: 'unavailable', reason: 'out_of_scope',
          requestSent: false, detail: 'Outside this transport scope' });
      }
      const timesOut = record === 'pending' || delayMs >= checked.timeoutMs;
      if (!timesOut && delayMs === 0) {
        return Promise.resolve(preparedAnswer(record, checked.maxHops));
      }
      return new Promise((resolve, reject) => {
        let timer = null;
        const onAbort = () => {
          if (timer === null) return;
          clock.clear(timer);
          timer = null;
          reject(abortReason(signal));
        };
        timer = clock.set(() => {
          timer = null;
          signal.removeEventListener('abort', onAbort);
          resolve(timesOut ? { outcome: 'failed', reason: 'timeout', redirects: null,
            requestSent: false, detail: 'Timed out' } : preparedAnswer(record, checked.maxHops));
        }, timesOut ? checked.timeoutMs : delayMs);
        signal.addEventListener('abort', onAbort, { once: true });
      });
    },
  });
}
