// camera-overlay.js · @supernovae-st/qrcode-ai-scanner-wasm/camera-overlay (0.11.0)
// Framework-free spatial overlay and exact readout drawn from tracker snapshots. Nothing runs
// at import beyond constant definitions: no DOM, network, timer or global access. Decoded
// content is always rendered as text; nothing is fetched or opened without a user action.
import { projectVideoGeometry } from './camera.js';
import { destinationCandidate } from './destination.js';

// -------------------------------------------------------------------- constants and labels

/** Track palette; a track's color index is slot % 8. */
export const TRACK_COLORS = Object.freeze(['#4DA3FF', '#FF6A1A', '#FFD43B', '#22E5F0', '#FF8FA3',
  '#C77DBF', '#A8EB8E', '#C1BE37']);

// Root-only and root-or-part scopes; :where() keeps the specificity of every rule low.
const S = ':where([data-qr-camera-overlay])';
const P = ':where([data-qr-camera-overlay],[data-qr-camera-part])';
const CASING = 'var(--qr-scanner-casing,rgb(0 0 0/55%))';
const EFFECT_LAYERS = ':is(.qr-camera-blur,.qr-camera-scrim,.qr-camera-wash)';
const BADGE_DISC = '.qr-camera-badge circle:not(.qr-camera-hit)';

/** The injected stylesheet, for styles: 'none' under a strict style-src. */
export const CAMERA_OVERLAY_CSS = [
  `${S}{position:absolute;overflow:hidden;pointer-events:none;z-index:1}`,
  `${P}{font:500 14px/1.35 system-ui,sans-serif;color:var(--qr-scanner-text,CanvasText)}`,
  `${P}[data-qr-camera-scheme="dark"]{color-scheme:dark} ` +
    `${P}[data-qr-camera-scheme="light"]{color-scheme:light}`,
  `${P} *{box-sizing:border-box} ${P}[hidden],${P} [hidden]{display:none!important}`,
  `${S} :is(.qr-camera-blur,.qr-camera-scene){position:absolute;inset:0;pointer-events:none}`,
  `${S} ${EFFECT_LAYERS}:not([data-active="true"]),${S}[data-blur="0"] .qr-camera-blur` +
    '{display:none}',
  `${S} .qr-camera-blur{-webkit-backdrop-filter:blur(var(--qr-camera-blur,0px));` +
    'backdrop-filter:blur(var(--qr-camera-blur,0px))}',
  `${S} .qr-camera-scrim{fill:#000;fill-opacity:var(--qr-camera-dim,0);fill-rule:evenodd}`,
  `${S} .qr-camera-wash{fill:var(--qr-camera-wash-color,#000);` +
    'fill-opacity:var(--qr-camera-wash,0);fill-rule:evenodd}',
  `${S} .qr-camera-target{color:var(--qr-target-color,#4DA3FF)}`,
  `${S} :is(.qr-camera-casing,.qr-camera-glow,.qr-camera-outline){fill:none;` +
    'stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}',
  `${S} .qr-camera-casing{stroke:${CASING};stroke-width:4.25px}`,
  `${S} .qr-camera-glow{stroke:currentColor;stroke-width:7px;` +
    'opacity:var(--qr-camera-glow-other,0)}',
  `${S} .qr-camera-outline{stroke:currentColor;stroke-width:2.25px}`,
  `${S} [data-selected="true"] .qr-camera-glow{opacity:var(--qr-camera-glow-selected,0)}`,
  `${S} [data-selected="true"] .qr-camera-outline{stroke-width:3px} ` +
    `${S} [data-selected="true"] .qr-camera-casing{stroke-width:5px}`,
  `${S} .qr-camera-dot{fill:currentColor;stroke:${CASING};stroke-width:1.5px}`,
  `${S} .qr-camera-target:is([data-state="held"],[data-state="lost"]){opacity:.45} ` +
    `${S} [data-state="held"] .qr-camera-glow{display:none}`,
  `${S} .qr-camera-hit{fill:transparent;stroke:transparent;pointer-events:all;cursor:pointer}`,
  `${S} ${BADGE_DISC}{fill:currentColor;stroke:${CASING};stroke-width:1.5px}`,
  `${S} .qr-camera-badge text{fill:var(--qr-target-text,#000);` +
    'font:700 12px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;pointer-events:none}',
  `${S} [data-selected="true"] ${BADGE_DISC}{stroke:var(--qr-scanner-text,CanvasText);` +
    'stroke-width:2.5px}',
  `${S}[data-colors="mono"] .qr-camera-target:not([data-selected="true"]) ${BADGE_DISC}` +
    '{fill:var(--qr-scanner-surface,Canvas);stroke:currentColor}',
  // The hollow disc takes the surface: its numeral takes the text color, not the highlight.
  `${S}[data-colors="mono"] .qr-camera-target:not([data-selected="true"]) .qr-camera-badge text` +
    '{fill:var(--qr-scanner-text,CanvasText)}',
  `${S} .qr-camera-controls{position:absolute;left:12px;right:12px;bottom:12px;display:flex;` +
    'flex-direction:column;gap:8px;pointer-events:none}',
  `${S}[data-qr-camera-size="minimal"] .qr-camera-controls{left:0;right:0;bottom:0}`,
  `${P} .qr-camera-rail{display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;` +
    'padding:8px;pointer-events:auto}',
  `${P} [role="radiogroup"]{display:flex;gap:8px;align-items:center}`,
  `${P} button{min-width:44px;min-height:44px;padding:10px 14px;border:1px solid currentColor;` +
    'border-radius:10px;background:transparent;color:inherit;font:inherit;cursor:pointer;' +
    'touch-action:manipulation}',
  `${P} .qr-camera-entry{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;` +
    'max-width:16rem;padding:6px 12px 6px 6px;border:2px solid rgb(128 128 128/45%);' +
    'border-radius:12px;background:var(--qr-scanner-surface,Canvas);text-align:start}',
  `${P} .qr-camera-entry[aria-checked="true"]{border-color:var(--qr-scanner-text,CanvasText);` +
    'box-shadow:inset 0 -4px 0 var(--qr-target-color,currentColor)}',
  `${P} .qr-camera-check{display:none;font-weight:700} ` +
    `${P} [aria-checked="true"] .qr-camera-check{display:inline}`,
  `${P} .qr-camera-entry[aria-disabled="true"]{opacity:.45;cursor:default}`,
  `${P} .qr-camera-number{display:inline-flex;align-items:center;justify-content:center;` +
    'width:24px;height:24px;border-radius:50%;background:var(--qr-target-color,currentColor);' +
    'color:var(--qr-target-text,#000);font-weight:700;font-variant-numeric:tabular-nums}',
  `${P} .qr-camera-format{font-weight:600;white-space:nowrap} ` +
    `${P} :is(.qr-camera-preview,.qr-camera-line){min-width:0;overflow:hidden;` +
    'text-overflow:ellipsis;white-space:nowrap}',
  `${P} :is(.qr-camera-caption,.qr-camera-divider,.qr-camera-saturated,.qr-camera-meta)` +
    '{align-self:center;font-size:12px;opacity:.8}',
  `${P} .qr-camera-readout{pointer-events:auto;border-radius:14px;` +
    'background:var(--qr-scanner-surface,Canvas)}',
  `${P} .qr-camera-readout[data-view="bar"]{min-height:52px;padding:4px 4px 4px 8px;` +
    'overflow:hidden}',
  `${P} .qr-camera-readout[data-view="bar"]>:not(.qr-camera-head){display:none}`,
  `${P} .qr-camera-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px}`,
  `${P} .qr-camera-readout[data-view="bar"] .qr-camera-head{flex-wrap:nowrap}`,
  `${P} .qr-camera-readout[data-view="card"]{max-height:var(--qr-camera-card-max,none);` +
    'overflow:auto;overscroll-behavior:contain;padding:12px 14px}',
  `${P} .qr-camera-content{margin:8px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;` +
    'unicode-bidi:plaintext}',
  `${P} .qr-camera-escape{display:inline-block;margin:0 1px;padding:0 4px;` +
    'border:1px solid currentColor;border-radius:4px;font:600 11px/1.45 ui-monospace,monospace}',
  `${P} :is(.qr-camera-bytes,.qr-camera-url-text,.qr-camera-final){` +
    'font:12px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}',
  `${P} .qr-camera-fields{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px} ` +
    `${P} .qr-camera-fields dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}`,
  `${P} .qr-camera-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}`,
  `${P} .qr-camera-provenance{padding:0 6px;border:1px dashed currentColor;border-radius:4px;` +
    'font-size:12px}',
  `${P} :is(button,[tabindex]):focus-visible{outline:3px solid var(--qr-scanner-focus,` +
    'CanvasText);outline-offset:1px;box-shadow:0 0 0 6px var(--qr-scanner-surface,Canvas)}',
  `${P} .qr-camera-readout:not([data-expanded="true"]) .qr-camera-details{display:none}`,
  `${P}[data-qr-camera-size="narrow"] .qr-camera-preview{display:none}`,
  `${P}[data-qr-camera-size="narrow"] .qr-camera-readout:not([data-expanded="true"]) ` +
    '.qr-camera-content{display:-webkit-box;-webkit-box-orient:vertical;' +
    '-webkit-line-clamp:3;overflow:hidden}',
  `${S} .qr-camera-announcer{position:absolute;width:1px;height:1px;overflow:hidden;` +
    'clip:rect(0 0 0 0);white-space:nowrap}',
  '@keyframes qr-camera-in{from{opacity:0}}',
  `@media (prefers-reduced-motion:no-preference){${S}[data-motion="auto"] .qr-camera-target` +
    '{animation:qr-camera-in 150ms ease-out}',
  ` ${S}[data-motion="auto"] ${EFFECT_LAYERS}{transition:opacity 150ms ease-out}`,
  ` @starting-style{${S}[data-motion="auto"] ${EFFECT_LAYERS}{opacity:0}}}`,
  `@media (prefers-reduced-transparency:reduce){${S} :is(.qr-camera-blur,.qr-camera-glow)` +
    '{display:none}}',
  `@media (forced-colors:active){${S} :is(.qr-camera-blur,.qr-camera-scrim,.qr-camera-wash,` +
    '.qr-camera-glow){display:none}',
  ` ${S} .qr-camera-target{color:CanvasText} ` +
    `${S} .qr-camera-target[data-selected="true"]{color:Highlight} ` +
    `${S} .qr-camera-casing{stroke:Canvas}`,
  ` ${S} ${BADGE_DISC}{fill:Canvas;stroke:currentColor} ` +
    `${S} .qr-camera-badge text{fill:CanvasText}`,
  ` ${P} .qr-camera-number{background:Canvas;color:CanvasText;border:1px solid CanvasText}`,
  ` ${P} .qr-camera-entry[aria-checked="true"]{border:3px solid Highlight}}`,
].join('\n');

const hasOwn = (record, key) => Object.prototype.hasOwnProperty.call(record, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (record, key) => (isRecord(record) && hasOwn(record, key) ? record[key] : undefined);
const hex4 = codePoint => codePoint.toString(16).toUpperCase().padStart(4, '0');

function deepFreeze(value) {
  if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

const DESTINATION_LABELS = {
  heading: 'Destination',
  sources: { me_card: 'Contact website', gs1_digital_link: 'GS1 Digital Link' },
  requestUrl: 'Requested URL',
  ineligible: {
    lossy_text: 'The URL is not an exact reading', not_http: 'Not an HTTP or HTTPS address',
    control_or_space: 'Contains spaces or control characters', invalid_url: 'Not a valid URL',
    credentials: 'Contains a user name or password', too_long: 'Too long to check',
  },
  unverified: 'Destination not checked', queued: 'Waiting (no request sent)',
  resolving: 'Checking…', observed: 'Destination observed',
  example: 'Example result (simulated)', failed: 'Check failed', canceled: 'Check canceled',
  unavailable: 'Check unavailable', providerError: 'Destination checks unavailable',
  reasons: {
    timeout: 'Timed out', too_many_redirects: 'Too many redirects',
    redirect_loop: 'Redirect loop', invalid_location: 'Invalid redirect location',
    blocked_scheme: 'Redirect to a refused scheme',
    blocked_credentials: 'Redirect with a user name or password',
    blocked_address: 'Address not allowed', blocked_port: 'Port not allowed',
    left_fixture: 'Left the local fixture', name_unusable: 'Host name not usable',
    dns_error: 'Name not found', connection_error: 'Connection failed', tls_error: 'TLS error',
    invalid_response: 'Invalid response',
    transport_unsupported: 'Not supported by this transport',
    out_of_scope: 'Outside this transport\'s scope',
    opaque_network_error: 'Network error hidden by the browser',
    opaque_response: 'Response hidden by the browser', mixed_content: 'Blocked as mixed content',
    endpoint_unreachable: 'Resolver unreachable', endpoint_http_error: 'Resolver error',
    endpoint_invalid_response: 'Invalid resolver response',
    endpoint_timeout: 'Resolver timed out', resolver_busy: 'Resolver busy',
    transport_error: 'Transport error', invalid_observation: 'Invalid observation',
    transport_unresponsive: 'Transport not responding', no_transport: 'No transport configured',
    queue_full: 'Too many checks waiting', canceled: 'Canceled', aborted: 'Aborted',
  },
  httpStatus: status => `HTTP ${status}`,
  redirects: 'Redirects',
  hops: (followed, oneNotFollowed) =>
    `${followed} followed${oneNotFollowed ? ', 1 not followed' : ''}`,
  hopsUnknown: atLeastOne => (atLeastOne ? 'unknown (at least one)' : 'unknown'),
  refusedScheme: scheme => `scheme ${scheme} refused`,
  invalidLocation: 'Invalid or hidden Location',
  detail: 'Detail',
  observedAt: (time, durationMs) => `Observed at ${time} · ${durationMs} ms`,
  exampleAt: (time, durationMs) =>
    `Example prepared at ${time} · simulated latency ${durationMs} ms`,
  endedAt: time => `Finished at ${time}`,
  provenance: { fixture: 'Local fixture', simulated: 'Simulated' },
  request: {
    none: 'No request sent', maybe: 'A request may have been sent',
    response: 'The browser received a response', sent: 'A request was sent',
  },
  check: 'Check destination', checkAgain: 'Check again', cancel: 'Cancel check',
};

/** Deeply frozen English defaults. */
export const DEFAULT_LABELS = deepFreeze({
  targets: 'Detected codes',
  choose: 'Choose a detected code',
  target: (track, slot) => `Code ${slot + 1}`,
  earlier: 'Earlier',
  readout: 'Decoded content',
  none: 'No code selected',
  position: (name, index, count) => `${name} · ${index} of ${count}`,
  previous: 'Previous code', next: 'Next code', more: 'More', less: 'Less',
  states: { inView: 'In view', readNow: 'Read now', lost: 'Lost', notRecent: 'Not read recently' },
  stillReadAs: targets => `Still read as ${targets.join(', ')}`,
  sameContentAs: targets => `Same content as ${targets.join(', ')}`,
  geometry: {
    segment: 'Scan line only', partial: 'Partial position', none: 'Position not measured',
    offscreen: 'Outside the visible area',
  },
  symbologies: {
    qr_code: 'QR Code', micro_qr_code: 'Micro QR Code', rectangular_micro_qr_code: 'rMQR',
    data_matrix: 'Data Matrix', aztec: 'Aztec', pdf417: 'PDF417', maxi_code: 'MaxiCode',
    ean13: 'EAN-13', ean8: 'EAN-8', upc_a: 'UPC-A', upc_e: 'UPC-E', code128: 'Code 128',
    code39: 'Code 39', code93: 'Code 93', codabar: 'Codabar', itf: 'ITF',
    data_bar: 'GS1 DataBar', data_bar_expanded: 'GS1 DataBar Expanded', telepen: 'Telepen',
  },
  families: { matrix: '2D matrix code', stacked: '2D stacked code', linear: '1D barcode' },
  kinds: {
    url: 'URL', wifi: 'Wi-Fi', email: 'Email', sms: 'SMS', tel: 'Phone number', geo: 'Location',
    gs1: 'GS1 element string', gs1_digital_link: 'GS1 Digital Link',
    me_card: 'Contact (MeCard)', crypto: 'Crypto payment', v_card: 'Contact (vCard)',
    v_event: 'Calendar event (vEvent)', text: 'Text',
  },
  fields: {
    url: 'URL', ssid: 'Network name', security: 'Security', password: 'Password',
    hidden: 'Hidden network', to: 'To', subject: 'Subject', body: 'Message', number: 'Number',
    lat: 'Latitude', lon: 'Longitude', name: 'Name', tel: 'Phone', email: 'Email',
    scheme: 'Scheme', address: 'Address', amount: 'Amount', gtin: 'GTIN',
  },
  parsedFields: 'Parsed fields',
  yes: 'Yes', no: 'No', unknown: 'Unknown',
  incomplete: 'No verified text reading. The exact bytes are in Details.',
  incompleteEci: 'No verified text reading: an ECI was declared but not located. ' +
    'The exact bytes are in Details.',
  charset: 'Character set', bytes: 'Bytes', eci: 'ECI', eciUnlocated: 'Declared, not located',
  eciAt: (designator, start) => `ECI ${designator} at byte ${start}`,
  fnc1: 'FNC1', fnc1Positions: { first: 'First position', second: 'Second position' },
  character: (name, codePoint) => `${name} (U+${hex4(codePoint)})`,
  copy: 'Copy', copyBytes: 'Copy bytes', copied: 'Copied', copyFailed: 'Copy failed',
  details: 'Details', open: 'Open link', encodedUrl: 'Encoded URL', host: 'Host',
  conformant: 'Meets the checked GS1 rules', issues: 'GS1 issues',
  saturated: 'More codes in view than can be tracked',
  saturatedOccurrences: 'Some copies of the same content may be merged or missing',
  count: live => (live === 0 ? 'No codes detected'
    : live === 1 ? '1 code detected' : `${live} codes detected`),
  announce: entry => (entry.target === null ? 'No code selected'
    : [entry.target, entry.symbology, entry.kind, entry.state, entry.preview]
      .filter(part => typeof part === 'string' && part !== '').join(', ')),
  destination: DESTINATION_LABELS,
});

// The one record whose keys are open: a label for a field name the table does not list is kept.
const OPEN_LABELS = 'labels.fields';

// Records merge key by key at every depth; strings and functions replace. Unknown keys of closed
// records are ignored, a wrong type is a TypeError, and every merged record is a new frozen one.
function mergeLabels(base, overrides, path = 'labels') {
  if (overrides === undefined || overrides === null) return base;
  if (!isRecord(overrides)) throw new TypeError(`${path} must be an object.`);
  const merged = {};
  for (const key of Object.keys(base)) {
    const current = base[key], next = own(overrides, key), where = `${path}.${key}`;
    if (next === undefined) merged[key] = current;
    else if (typeof current === 'string' || typeof current === 'function') {
      if (typeof next !== typeof current) {
        throw new TypeError(`${where} must be a ${typeof current}.`);
      }
      merged[key] = next;
    } else merged[key] = mergeLabels(current, next, where);
  }
  if (path === OPEN_LABELS) {
    for (const key of Object.keys(overrides)) {
      if (hasOwn(base, key) || key === '__proto__' || overrides[key] === undefined) continue;
      if (typeof overrides[key] !== 'string') {
        throw new TypeError(`${path}.${key} must be a string.`);
      }
      merged[key] = overrides[key];
    }
  }
  return Object.freeze(merged);
}

// --------------------------------------------------------------------------- pure geometry

const FITS = ['contain', 'cover', 'fill', 'none', 'scale-down'];
const CSS_SPACE = /[ \t\n\r\f]/;
const CSS_NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/;
// Keyword -> [axis or null for center, fraction].
const POSITION_KEYWORDS = {
  left: ['x', 0], right: ['x', 1], top: ['y', 0], bottom: ['y', 1], center: [null, 0.5],
};

const zero = n => (n === 0 ? 0 : n);
const finitePoint = p => p !== null && typeof p === 'object' &&
  Number.isFinite(p.x) && Number.isFinite(p.y);
const positionAxis = (fraction, offset) =>
  Object.freeze({ fraction: zero(fraction), offset: zero(offset) });
const CENTER_AXIS = positionAxis(0.5, 0);
const CENTERED = Object.freeze({ x: CENTER_AXIS, y: CENTER_AXIS });

// Top-level tokens split on CSS whitespace; null for nested or unbalanced parentheses.
function positionTokens(text) {
  const tokens = [];
  let depth = 0, current = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (depth < 0 || depth > 1) return null;
    if (depth === 0 && CSS_SPACE.test(ch)) {
      if (current !== '') tokens.push(current);
      current = '';
    } else current += ch;
  }
  if (depth !== 0) return null;
  if (current !== '') tokens.push(current);
  return tokens;
}

// A px or % value (a unitless 0 outside calc()), as { value, percent }.
function plainLength(token, inCalc) {
  const unit = token.endsWith('%') ? '%' : token.endsWith('px') ? 'px' : '';
  const number = token.slice(0, token.length - unit.length);
  if (!CSS_NUMBER.test(number)) return null;
  const value = Number(number);
  if (!Number.isFinite(value) || (unit === '' && (inCalc || value !== 0))) return null;
  return { value, percent: unit === '%' };
}

// <length-percentage> as an axis value: px, %, or calc(<percentage> +/- <px>) in either order.
function lengthPercentage(token) {
  if (token.startsWith('calc(') && token.endsWith(')')) {
    const parts = token.slice(5, -1).split(/[ \t\n\r\f]+/).filter(part => part !== '');
    if (parts.length !== 3 || (parts[1] !== '+' && parts[1] !== '-')) return null;
    const first = plainLength(parts[0], true), second = plainLength(parts[2], true);
    if (first === null || second === null || first.percent === second.percent) return null;
    const sign = parts[1] === '-' ? -1 : 1;
    return first.percent ? { fraction: first.value / 100, offset: sign * second.value }
      : { fraction: sign * second.value / 100, offset: first.value };
  }
  const plain = plainLength(token, false);
  if (plain === null) return null;
  return plain.percent ? { fraction: plain.value / 100, offset: 0 }
    : { fraction: 0, offset: plain.value };
}

// An edge keyword with an offset: left/top count from the start, right/bottom from the end.
const edgeOffset = (keyword, value) => (POSITION_KEYWORDS[keyword][1] === 0 ? value
  : { fraction: 1 - value.fraction, offset: -value.offset });

/**
 * Computed-style <position> forms: one or two keyword, % or px values; the four-value
 * edge-offset form (and an edge offset paired with center); calc(<percentage> +/- <px>) in
 * either order. Other units, other three-value forms, nested calc() and var() return null.
 */
export function parseObjectPosition(value) {
  if (typeof value !== 'string') throw new TypeError('parseObjectPosition() needs a string.');
  const tokens = positionTokens(value.replace(/[A-Z]/g, ch => ch.toLowerCase()));
  if (tokens === null || tokens.length === 0 || tokens.length > 4) return null;
  const parts = tokens.map(token => (hasOwn(POSITION_KEYWORDS, token) ? token
    : lengthPercentage(token)));
  if (parts.includes(null)) return null;
  const axisOf = part => (typeof part === 'string' ? POSITION_KEYWORDS[part][0] : undefined);
  const valueOf = part => (typeof part === 'string'
    ? { fraction: POSITION_KEYWORDS[part][1], offset: 0 } : part);
  const isEdge = part => typeof part === 'string' && part !== 'center';
  let x = CENTER_AXIS, y = CENTER_AXIS;
  if (parts.length === 1) {
    if (axisOf(parts[0]) === 'y') y = valueOf(parts[0]);
    else x = valueOf(parts[0]);
  } else if (parts.length === 2) {
    const [a, b] = parts;
    if (axisOf(a) === 'y' || axisOf(b) === 'x') {
      // Keyword pairs may come in either order: top left, center right.
      if (axisOf(a) === 'x' || axisOf(b) === 'y' || axisOf(a) === undefined ||
        axisOf(b) === undefined) return null;
      x = valueOf(b);
      y = valueOf(a);
    } else {
      x = valueOf(a);
      y = valueOf(b);
    }
  } else if (parts.length === 3) {
    // Only an edge offset beside center: right 10px center, center top 10px.
    const [edge, offset] = parts[0] === 'center' ? [parts[1], parts[2]] : [parts[0], parts[1]];
    const center = parts[0] === 'center' ? parts[0] : parts[2];
    if (center !== 'center' || !isEdge(edge) || typeof offset === 'string') return null;
    if (axisOf(edge) === 'x') x = edgeOffset(edge, offset);
    else y = edgeOffset(edge, offset);
  } else {
    const [edgeA, offsetA, edgeB, offsetB] = parts;
    if (!isEdge(edgeA) || !isEdge(edgeB) || typeof offsetA === 'string' ||
      typeof offsetB === 'string' || axisOf(edgeA) === axisOf(edgeB)) return null;
    const a = edgeOffset(edgeA, offsetA), b = edgeOffset(edgeB, offsetB);
    [x, y] = axisOf(edgeA) === 'x' ? [a, b] : [b, a];
  }
  return Object.freeze({ x: positionAxis(x.fraction, x.offset),
    y: positionAxis(y.fraction, y.offset) });
}

function checkedPosition(position) {
  if (!isRecord(position) || !isRecord(position.x) || !isRecord(position.y)) {
    throw new TypeError('position must be an ObjectPosition { x, y }; parse strings first.');
  }
  const values = [position.x.fraction, position.x.offset, position.y.fraction, position.y.offset];
  if (!values.every(Number.isFinite)) {
    throw new RangeError('position needs finite fractions and offsets.');
  }
  return Object.freeze({ x: positionAxis(position.x.fraction, position.x.offset),
    y: positionAxis(position.y.fraction, position.y.offset) });
}

// Validated view with its defaults and the drawn media rectangle (before mirroring).
function resolveView(view) {
  if (!isRecord(view)) throw new TypeError('An overlay view must be an object.');
  const { mediaWidth, mediaHeight, viewWidth, viewHeight } = view;
  if (![mediaWidth, mediaHeight, viewWidth, viewHeight].every(n => Number.isFinite(n) && n > 0)) {
    throw new RangeError('An overlay view needs positive finite media and view sizes.');
  }
  const fit = view.fit === undefined ? 'contain' : view.fit;
  if (!FITS.includes(fit)) throw new RangeError(`Unsupported fit: ${String(fit)}.`);
  const position = view.position === undefined ? CENTERED : checkedPosition(view.position);
  const mirror = view.mirror === undefined ? false : view.mirror;
  if (typeof mirror !== 'boolean') throw new TypeError('mirror must be a boolean.');
  let width = viewWidth, height = viewHeight;
  if (fit !== 'fill') {
    const sx = viewWidth / mediaWidth, sy = viewHeight / mediaHeight;
    const scale = fit === 'contain' ? Math.min(sx, sy) : fit === 'cover' ? Math.max(sx, sy)
      : fit === 'none' ? 1 : Math.min(1, sx, sy);
    width = mediaWidth * scale;
    height = mediaHeight * scale;
  }
  const rect = Object.freeze({
    x: zero(position.x.fraction * (viewWidth - width) + position.x.offset),
    y: zero(position.y.fraction * (viewHeight - height) + position.y.offset),
    width, height,
  });
  return { mediaWidth, mediaHeight, viewWidth, viewHeight, fit, position, mirror, rect };
}

/** The media's drawn box inside the view before mirroring, CSS px. */
export function overlayMediaRect(view) {
  return resolveView(view).rect;
}

// Centered contain/cover and offset-free fill are projectVideoGeometry's own cases: delegating
// them keeps the projected points bit-identical to it.
function centeredCameraView(resolved) {
  const { fit, position } = resolved;
  const offsetFree = position.x.offset === 0 && position.y.offset === 0;
  const centered = offsetFree && position.x.fraction === 0.5 && position.y.fraction === 0.5;
  if (!(fit === 'fill' ? offsetFree : centered && (fit === 'contain' || fit === 'cover'))) {
    return null;
  }
  return { sourceWidth: resolved.mediaWidth, sourceHeight: resolved.mediaHeight,
    viewWidth: resolved.viewWidth, viewHeight: resolved.viewHeight, fit, mirror: resolved.mirror };
}

// Normalized points to view CSS px: fill projection on the media rectangle, translated to its
// origin, then mirrored about the view. Validity is projectVideoGeometry's.
function projectResolved(resolved, geometry, minArea) {
  const camera = centeredCameraView(resolved);
  if (camera !== null) {
    const projected = projectVideoGeometry(geometry, camera, { minArea });
    return { points: projected.points, valid: projected.valid };
  }
  const { rect, mirror, viewWidth } = resolved;
  const local = projectVideoGeometry(geometry, { sourceWidth: resolved.mediaWidth,
    sourceHeight: resolved.mediaHeight, viewWidth: rect.width, viewHeight: rect.height,
    fit: 'fill' }, { minArea });
  const points = local.points.map(p => {
    const x = p.x + rect.x;
    return { x: mirror ? viewWidth - x : x, y: p.y + rect.y };
  });
  return { points, valid: local.valid };
}

/** Normalized point (x / frame width, y / frame height) to view CSS px. */
export function projectOverlayPoint(point, view) {
  const resolved = resolveView(view);
  if (point === null || typeof point !== 'object') {
    throw new TypeError('projectOverlayPoint() needs a point { x, y }.');
  }
  if (!finitePoint(point)) throw new RangeError('A point needs finite coordinates.');
  return projectResolved(resolved, { kind: 'partial', points: [point], precise: false }, 0)
    .points[0];
}

const doubleArea = points => points.reduce((sum, a, i) => {
  const b = points[(i + 1) % points.length];
  return sum + a.x * b.y - b.x * a.y;
}, 0);

// Sutherland-Hodgman against one box side: keep key >= limit (above) or key <= limit.
function clipSide(polygon, key, limit, above) {
  const kept = [];
  const inside = p => (above ? p[key] >= limit : p[key] <= limit);
  const cut = (a, b) => {
    const t = (limit - a[key]) / (b[key] - a[key]);
    return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  };
  polygon.forEach((end, i) => {
    const start = polygon[(i + polygon.length - 1) % polygon.length];
    if (inside(end)) {
      if (!inside(start)) kept.push(cut(start, end));
      kept.push(end);
    } else if (inside(start)) kept.push(cut(start, end));
  });
  return kept;
}

// Liang-Barsky: the parameter span of a -> b inside [0, W] x [0, H].
function segmentSpan(a, b, width, height) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let low = 0, high = 1;
  for (const [p, q] of [[-dx, a.x], [dx, width - a.x], [-dy, a.y], [dy, height - a.y]]) {
    if (p === 0) {
      if (q < 0) return 0;
    } else if (p < 0) {
      low = Math.max(low, q / p);
    } else high = Math.min(high, q / p);
    if (low > high) return 0;
  }
  return high - low;
}

// Share inside [0, W] x [0, H]: area for a valid quad, length for a valid segment, else points.
function visibleFraction(kind, points, valid, width, height) {
  let fraction;
  if (valid && kind === 'quad' && points.length === 4) {
    let clipped = points;
    for (const [key, limit, above] of [['x', 0, true], ['x', width, false], ['y', 0, true],
      ['y', height, false]]) {
      if (clipped.length > 0) clipped = clipSide(clipped, key, limit, above);
    }
    fraction = clipped.length < 3 ? 0
      : Math.abs(doubleArea(clipped)) / Math.abs(doubleArea(points));
  } else if (valid && kind === 'segment' && points.length === 2) {
    fraction = segmentSpan(points[0], points[1], width, height);
  } else {
    const inside = points.filter(p => finitePoint(p) && p.x >= 0 && p.x <= width &&
      p.y >= 0 && p.y <= height).length;
    fraction = points.length === 0 ? 0 : inside / points.length;
  }
  return Math.min(1, Math.max(0, fraction));
}

/**
 * Projects a tracker geometry onto the view: projectVideoGeometry validity (minArea in CSS px
 * squared, default 16), inView on [-1, W + 1] x [-1, H + 1], and the visible fraction.
 */
export function projectOverlayGeometry(geometry, view, options) {
  const resolved = resolveView(view);
  if (options !== undefined && !isRecord(options)) {
    throw new TypeError('projectOverlayGeometry() options must be an object.');
  }
  const minArea = options === undefined || options.minArea === undefined ? 16 : options.minArea;
  if (!(typeof minArea === 'number' && minArea >= 0)) {
    throw new RangeError('minArea must be a number of at least 0 (CSS px squared).');
  }
  if (geometry === null || typeof geometry !== 'object' || !Array.isArray(geometry.points)) {
    throw new TypeError('projectOverlayGeometry() needs a geometry { kind, points, precise }.');
  }
  return projectGeometry(resolved, geometry, minArea);
}

// projectOverlayGeometry on an already resolved view; the scene projects through it too.
function projectGeometry(resolved, geometry, minArea) {
  const { points, valid } = projectResolved(resolved, geometry, minArea);
  const { viewWidth: width, viewHeight: height } = resolved;
  const inView = points.every(p => p.x >= -1 && p.x <= width + 1 && p.y >= -1 &&
    p.y <= height + 1);
  return {
    kind: geometry.kind, points, valid, inView,
    visibleFraction: visibleFraction(geometry.kind, points, valid, width, height),
    precise: geometry.precise === true && valid && inView,
  };
}

// ---------------------------------------------------------------------- outline and region

// Path numbers: rounded to 0.1 and printed with String(), -0 as 0.
const round1 = n => zero(Math.round(n * 10) / 10);
const pathPoint = p => `${round1(p.x)} ${round1(p.y)}`;
const turn = (a, b, c) => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
const unitTo = (from, to) => {
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
  return { x: dx / length, y: dy / length, length };
};
const along = (origin, direction, distance) =>
  ({ x: origin.x + distance * direction.x, y: origin.y + distance * direction.y });

// A copy of a strictly convex quad in either winding, with the sign of its area.
function convexQuad(points, name) {
  if (!Array.isArray(points)) throw new TypeError(`${name}() needs an array of four points.`);
  if (points.length !== 4) throw new RangeError(`${name}() needs exactly four points.`);
  if (!points.every(finitePoint)) throw new RangeError(`${name}() needs finite points.`);
  const quad = points.map(p => ({ x: p.x, y: p.y }));
  const turns = quad.map((p, i) => turn(p, quad[(i + 1) % 4], quad[(i + 2) % 4]));
  if (!(turns.every(t => t > 0) || turns.every(t => t < 0))) {
    throw new RangeError(`${name}() needs a strictly convex quad.`);
  }
  return { quad, sign: turns[0] > 0 ? 1 : -1 };
}

// Miter-offset corners `distance` px outside each vertex; a displacement longer than
// miterLimit x distance is scaled down to that length.
function offsetCorners(quad, sign, distance, miterLimit) {
  const normals = quad.map((p, i) => {
    const edge = unitTo(p, quad[(i + 1) % 4]);
    return { x: sign * edge.y, y: -sign * edge.x };
  });
  return quad.map((p, i) => {
    const a = normals[(i + 3) % 4], b = normals[i];
    const scale = distance / (1 + a.x * b.x + a.y * b.y);
    let dx = (a.x + b.x) * scale, dy = (a.y + b.y) * scale;
    const length = Math.hypot(dx, dy), cap = miterLimit * distance;
    if (length > cap) {
      dx *= cap / length;
      dy *= cap / length;
    }
    return { x: p.x + dx, y: p.y + dy };
  });
}

// One numeric option: undefined takes the default, anything else must lie in [min, max].
function numberOption(options, key, fallback, min, max, name, openMin = false) {
  const value = options === undefined ? undefined : options[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value > max ||
    (openMin ? value <= min : value < min)) {
    throw new RangeError(`${name}.${key} must be a number in ${openMin ? '(' : '['}${min}, ` +
      `${max}].`);
  }
  return value;
}

function optionRecord(options, name) {
  if (options !== undefined && !isRecord(options)) {
    throw new TypeError(`${name} must be an object.`);
  }
  return options;
}

// Outline options with their defaults; maxArm defaults to max(23, minArm).
function outlineSettings(options, name = 'options') {
  const record = optionRecord(options, name);
  const minArm = numberOption(record, 'minArm', 6, 0, 24, name);
  return {
    offset: numberOption(record, 'offset', 5.5, 0, 16, name),
    arm: numberOption(record, 'arm', 0.27, 0, 0.45, name, true),
    minArm,
    maxArm: numberOption(record, 'maxArm', Math.max(23, minArm), minArm, 64, name),
    radius: numberOption(record, 'radius', 4.2, 0, 16, name),
    miterLimit: numberOption(record, 'miterLimit', 4, 1, 10, name),
  };
}

/**
 * Four rounded corner subpaths at `offset` px outside a strictly convex quad (either winding),
 * in input order; RangeError otherwise. Corners are the unrounded offset corners.
 */
export function quadOutline(points, options) {
  const { quad, sign } = convexQuad(points, 'quadOutline');
  const settings = outlineSettings(options);
  const corners = offsetCorners(quad, sign, settings.offset, settings.miterLimit);
  let bracket = '';
  corners.forEach((corner, i) => {
    const toPrev = unitTo(corner, corners[(i + 3) % 4]);
    const toNext = unitTo(corner, corners[(i + 1) % 4]);
    const arm = length => Math.min(Math.max(settings.arm * length, settings.minArm),
      settings.maxArm, 0.45 * length);
    const armPrev = arm(toPrev.length), armNext = arm(toNext.length);
    const r = Math.min(settings.radius, 0.27 * Math.min(armPrev, armNext));
    bracket += `M${pathPoint(along(corner, toPrev, armPrev))}` +
      `L${pathPoint(along(corner, toPrev, r))}` +
      `Q${pathPoint(corner)} ${pathPoint(along(corner, toNext, r))}` +
      `L${pathPoint(along(corner, toNext, armNext))}`;
  });
  return Object.freeze({
    corners: Object.freeze(corners.map(c => Object.freeze({ x: zero(c.x), y: zero(c.y) }))),
    bracket,
  });
}

/**
 * Closed rounded region `margin` px outside a strictly convex quad: the sharp cutout. Defaults
 * margin 9 (0-24), radius 6 (0-16), miterLimit 4 (1-10). Each corner radius keeps the apex of
 * its curve at least 1 px outside the measured vertex; margin 0 gives the quad itself.
 */
export function quadRegion(points, options) {
  const { quad, sign } = convexQuad(points, 'quadRegion');
  const record = optionRecord(options, 'options');
  const margin = numberOption(record, 'margin', 9, 0, 24, 'options');
  const radius = numberOption(record, 'radius', 6, 0, 16, 'options');
  const miterLimit = numberOption(record, 'miterLimit', 4, 1, 10, 'options');
  const corners = offsetCorners(quad, sign, margin, miterLimit);
  const turns = corners.map((corner, i) => {
    const toPrev = unitTo(corner, corners[(i + 3) % 4]);
    const toNext = unitTo(corner, corners[(i + 1) % 4]);
    const vertex = quad[i];
    const sidePrev = unitTo(vertex, quad[(i + 3) % 4]);
    const sideNext = unitTo(vertex, quad[(i + 1) % 4]);
    // cos(theta / 2) of the interior angle at the measured vertex.
    const cosHalf = Math.hypot(sidePrev.x + sideNext.x, sidePrev.y + sideNext.y) / 2;
    const reach = Math.hypot(corner.x - vertex.x, corner.y - vertex.y);
    const bound = reach > 1 ? 2 * (reach - 1) / cosHalf : 0;
    const r = Math.min(radius, 0.45 * Math.min(toPrev.length, toNext.length), bound);
    return { corner, toPrev, toNext, r };
  });
  let path = `M${pathPoint(along(turns[0].corner, turns[0].toNext, turns[0].r))}`;
  for (const i of [1, 2, 3, 0]) {
    const { corner, toPrev, toNext, r } = turns[i];
    path += r > 0 ? `L${pathPoint(along(corner, toPrev, r))}Q${pathPoint(corner)} ` +
      pathPoint(along(corner, toNext, r)) : `L${pathPoint(corner)}`;
  }
  return `${path}Z`;
}

// ---------------------------------------------------------- text and detection description

// Derived presentation, never a detected value. Each GS1 DataBar wire value covers linear and
// stacked prints alike, so neither gets a family.
const FAMILIES = {
  qr_code: 'matrix', micro_qr_code: 'matrix', rectangular_micro_qr_code: 'matrix',
  data_matrix: 'matrix', aztec: 'matrix', maxi_code: 'matrix', pdf417: 'stacked',
  ean13: 'linear', ean8: 'linear', upc_a: 'linear', upc_e: 'linear', code128: 'linear',
  code39: 'linear', code93: 'linear', codabar: 'linear', itf: 'linear', telepen: 'linear',
};

/** null for data_bar, data_bar_expanded and a symbology this version does not know. */
export function symbologyFamily(symbology) {
  return typeof symbology === 'string' && hasOwn(FAMILIES, symbology) ? FAMILIES[symbology]
    : null;
}

// Unicode abbreviations of the escaped characters; any other escape is named U+XXXX.
const C0_NAMES = ['NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'TAB', 'LF', 'VT',
  'FF', 'CR', 'SO', 'SI', 'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN', 'EM',
  'SUB', 'ESC', 'FS', 'GS', 'RS', 'US'];
const C1_NAMES = ['PAD', 'HOP', 'BPH', 'NBH', 'IND', 'NEL', 'SSA', 'ESA', 'HTS', 'HTJ', 'VTS',
  'PLD', 'PLU', 'RI', 'SS2', 'SS3', 'DCS', 'PU1', 'PU2', 'STS', 'CCH', 'MW', 'SPA', 'EPA', 'SOS',
  'SGC', 'SCI', 'CSI', 'ST', 'OSC', 'PM', 'APC'];
const FORMAT_NAMES = {
  0x7F: 'DEL', 0xAD: 'SHY', 0x61C: 'ALM', 0x200B: 'ZWSP', 0x200C: 'ZWNJ', 0x200D: 'ZWJ',
  0x200E: 'LRM', 0x200F: 'RLM', 0x2028: 'LS', 0x2029: 'PS', 0x202A: 'LRE', 0x202B: 'RLE',
  0x202C: 'PDF', 0x202D: 'LRO', 0x202E: 'RLO', 0x2060: 'WJ', 0x2066: 'LRI', 0x2067: 'RLI',
  0x2068: 'FSI', 0x2069: 'PDI', 0xFEFF: 'ZWNBSP',
};
const FORMAT_OR_SEPARATOR = /^[\p{Cf}\p{Zl}\p{Zp}]$/u;
// Blank-looking letters and symbols, and the combining grapheme joiner, escaped like format
// characters.
const BLANKS = [0x115F, 0x1160, 0x3164, 0xFFA0, 0x2800, 0x034F];
const BLACK_FLAG = 0x1F3F4, CANCEL_TAG = 0xE007F;
const IDEOGRAPH = /^\p{Unified_Ideograph}$/u;

// VS1-VS16, the Mongolian free variation selectors and VS17-VS256.
const isSelector = codePoint => (codePoint >= 0xFE00 && codePoint <= 0xFE0F) ||
  (codePoint >= 0x180B && codePoint <= 0x180F && codePoint !== 0x180E) ||
  (codePoint >= 0xE0100 && codePoint <= 0xE01EF);

// One selector stays text right after a base that stays text (previous: its code point, null
// after a break, an escape or the start); VS17-VS256 only after an ideograph.
const keptSelector = (codePoint, previous) => previous !== null && !isSelector(previous) &&
  (codePoint < 0xE0100 || IDEOGRAPH.test(String.fromCodePoint(previous)));

function characterName(codePoint) {
  if (codePoint < 0x20) return C0_NAMES[codePoint];
  if (codePoint >= 0x80 && codePoint <= 0x9F) return C1_NAMES[codePoint - 0x80];
  return hasOwn(FORMAT_NAMES, codePoint) ? FORMAT_NAMES[codePoint] : `U+${hex4(codePoint)}`;
}

// Cc except LF and CR (handled as breaks), Cf, lone surrogates, Zl, Zp and the blanks.
function isEscaped(codePoint, character) {
  if (codePoint < 0x20 || (codePoint >= 0x7F && codePoint <= 0x9F)) return true;
  if (codePoint < 0xA0) return false;
  if (codePoint >= 0xD800 && codePoint <= 0xDFFF) return true;
  return BLANKS.includes(codePoint) || FORMAT_OR_SEPARATOR.test(character);
}

// ZWNJ and ZWJ stay text between two non-ASCII characters (emoji sequences, joining scripts).
const keptJoiner = (text, index) => index > 0 && index + 1 < text.length &&
  text.charCodeAt(index - 1) > 0x7F && text.charCodeAt(index + 1) > 0x7F;

// End of a subdivision-flag tag run starting at `index`: 3 to 7 tag digits or lowercase tag
// letters (a CLDR subdivision id such as gbeng), then U+E007F; -1 for any other run.
function tagRunEnd(text, index) {
  let at = index, count = 0;
  for (;;) {
    const codePoint = text.codePointAt(at);
    if (codePoint === CANCEL_TAG) return count >= 3 ? at + 2 : -1;
    const tag = (codePoint >= 0xE0030 && codePoint <= 0xE0039) ||
      (codePoint >= 0xE0061 && codePoint <= 0xE007A);
    if (!tag || count === 7) return -1;
    count += 1;
    at += 2;
  }
}

/** Lossless: the segments' text joined equals the input. */
export function segmentText(text) {
  if (typeof text !== 'string') throw new TypeError('segmentText() needs a string.');
  const segments = [];
  // previous: the last code point kept as plain text, for the selector rule.
  let start = 0, index = 0, previous = null;
  const flush = end => {
    if (end > start) segments.push(Object.freeze({ type: 'text', text: text.slice(start, end) }));
  };
  while (index < text.length) {
    const codePoint = text.codePointAt(index);
    const width = codePoint > 0xFFFF ? 2 : 1;
    const flagEnd = codePoint === BLACK_FLAG ? tagRunEnd(text, index + 2) : -1;
    const joiner = (codePoint === 0x200C || codePoint === 0x200D) && keptJoiner(text, index);
    if (codePoint === 0x0A || codePoint === 0x0D) {
      const pair = codePoint === 0x0D && text.charCodeAt(index + 1) === 0x0A;
      flush(index);
      segments.push(Object.freeze({ type: 'break', text: pair ? '\r\n' : text[index] }));
      index += pair ? 2 : 1;
      start = index;
      previous = null;
    } else if (flagEnd !== -1) {
      index = flagEnd;
      previous = null;
    } else if (isSelector(codePoint) ? !keptSelector(codePoint, previous)
      : isEscaped(codePoint, text.slice(index, index + width)) && !joiner) {
      flush(index);
      segments.push(Object.freeze({ type: 'escape', text: text.slice(index, index + width),
        codePoint, name: characterName(codePoint) }));
      index += width;
      start = index;
      previous = null;
    } else {
      // A kept joiner is no base for a selector.
      previous = joiner ? null : codePoint;
      index += width;
    }
  }
  flush(text.length);
  return Object.freeze(segments);
}

const sextet = c => (c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 71
  : c >= 48 && c <= 57 ? c + 4 : c === 43 ? 62 : c === 47 ? 63 : -1);

// content.raw (standard base64, padding optional) as uppercase hex pairs joined by spaces.
function base64Hex(raw) {
  const padding = raw.endsWith('==') ? 2 : raw.endsWith('=') ? 1 : 0;
  const body = raw.slice(0, raw.length - padding);
  if (body.length % 4 === 1 || (padding > 0 && raw.length % 4 !== 0)) {
    throw new TypeError('content.raw is not valid base64.');
  }
  const bytes = [];
  let buffer = 0, bits = 0;
  for (let i = 0; i < body.length; i++) {
    const value = sextet(body.charCodeAt(i));
    if (value < 0) throw new TypeError('content.raw is not valid base64.');
    buffer = ((buffer << 6) | value) & 0xFFFF;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(((buffer >> bits) & 0xFF).toString(16).toUpperCase().padStart(2, '0'));
    }
  }
  return bytes.join(' ');
}

// Parsed payload fields in payload order; the two GS1 kinds are built by gs1Fields.
const KIND_FIELDS = {
  url: [], wifi: ['ssid', 'security', 'password', 'hidden'], email: ['to', 'subject', 'body'],
  sms: ['number', 'body'], tel: ['number'], geo: ['lat', 'lon'], gs1: null,
  gs1_digital_link: null, me_card: ['name', 'tel', 'email', 'url'],
  crypto: ['scheme', 'address', 'amount'], v_card: [], v_event: [], text: [],
};
const GS1_KINDS = ['gs1', 'gs1_digital_link'];

const readoutField = (key, label, value) => Object.freeze({ key, label, value });
const fieldLabel = (labels, key) => {
  const label = own(labels.fields, key);
  return typeof label === 'string' ? label : key;
};

// Exact text; numbers as parsed values via String(); booleans as the yes/no labels; nulls omitted.
function fieldText(value, labels) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? labels.yes : labels.no;
  return null;
}

function gs1Fields(payload, labels) {
  const fields = [];
  for (const element of Array.isArray(payload.elements) ? payload.elements : []) {
    if (isRecord(element) && typeof element.ai === 'string' && typeof element.value === 'string') {
      fields.push(readoutField(`gs1:${element.ai}`, `(${element.ai})`, element.value));
    }
  }
  if (typeof payload.gtin === 'string') {
    fields.push(readoutField('gtin', fieldLabel(labels, 'gtin'), payload.gtin));
  }
  if (typeof payload.conformant === 'boolean') {
    fields.push(readoutField('conformant', labels.conformant,
      payload.conformant ? labels.yes : labels.no));
  }
  return fields;
}

function payloadFields(payload, labels) {
  const names = own(KIND_FIELDS, payload.kind);
  if (names === null) return gs1Fields(payload, labels);
  const fields = [];
  for (const key of names || []) {
    const value = fieldText(payload[key], labels);
    if (value !== null) fields.push(readoutField(key, fieldLabel(labels, key), value));
  }
  return fields;
}

// http(s) URLs of url and gs1_digital_link payloads: the exact text, the WHATWG serialization
// (used only by Open) and the ASCII host.
function encodedUrlOf(payload) {
  if ((payload.kind !== 'url' && payload.kind !== 'gs1_digital_link') ||
    typeof payload.url !== 'string' || typeof URL !== 'function') return null;
  let url;
  try {
    url = new URL(payload.url);
  } catch (error) {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return Object.freeze({ encoded: payload.url, href: url.href, host: url.hostname });
}

// The readout of one detection under an already merged label table.
function describeWith(detection, labels) {
  const refusal = 'describeDetection() needs a Detection { symbology, content, payload }.';
  if (!isRecord(detection) || !isRecord(detection.content) || !isRecord(detection.payload)) {
    throw new TypeError(refusal);
  }
  const { symbology, content, payload } = detection;
  if (typeof symbology !== 'string' || typeof content.text !== 'string' ||
    typeof content.raw !== 'string' || typeof content.charset !== 'string' ||
    typeof payload.kind !== 'string') throw new TypeError(refusal);
  const family = symbologyFamily(symbology);
  const symbologyLabel = own(labels.symbologies, symbology);
  const kindLabel = own(labels.kinds, payload.kind);
  const gs1 = GS1_KINDS.includes(payload.kind);
  return Object.freeze({
    symbology,
    symbologyLabel: typeof symbologyLabel === 'string' ? symbologyLabel : symbology,
    family,
    familyLabel: family === null ? null : labels.families[family],
    kind: payload.kind,
    kindLabel: typeof kindLabel === 'string' ? kindLabel : labels.kinds.text,
    text: content.text,
    segments: segmentText(content.text),
    complete: content.charset !== 'unknown',
    charset: content.charset,
    eci: Array.isArray(content.eci) ? Object.freeze(content.eci.map(entry => Object.freeze({
      designator: entry.designator, start: entry.start }))) : null,
    fnc1: typeof content.fnc1 === 'string' ? content.fnc1 : null,
    bytes: base64Hex(content.raw),
    url: encodedUrlOf(payload),
    candidate: destinationCandidate(detection),
    gtin: gs1 && typeof payload.gtin === 'string' ? payload.gtin : null,
    fields: Object.freeze(payloadFields(payload, labels)),
    issues: Object.freeze(gs1 && Array.isArray(payload.issues)
      ? payload.issues.filter(issue => typeof issue === 'string') : []),
  });
}

/** Exact readout content of a detection: labels, complete text, bytes, URL and fields. */
export function describeDetection(detection, labels) {
  return describeWith(detection, mergeLabels(DEFAULT_LABELS, labels));
}

// ------------------------------------------------------------------------- overlay factory

// Per-instance state (ctx), shared by every section below:
//   doc, win, video, container, clock, instance     inputs and the 8-hex instance id
//   raw, settings, labels                           given values, resolved settings, label table
//   root, blur, scene, defs, scrim, wash            root subtree; targets follow wash in scene
//   controls, announcer, parts.rail|readout         in-video controls (null when both parts are
//                                                   mounted); part name/mount/wrapper/host/size
//   rail.toolbar|group|note, readout                static rail and readout shells
//   reading, alignment, view, resolved              layout reading; view for aligned and
//                                                   frame-mismatch, resolved for aligned only
//   arrangement, controlsHeight                     in-video arrangement and controls height
//   snapshot, ordering, layoutEpoch, ignored        last applied snapshot and ordering record
//   cleared                                         clear() hides the scene until an update
//   selection.mode|selectedId|held|declined|locks   selection state; notified: last onSelect
//   targets                                         Map TrackId -> per-target state, slot order
//   sceneNodes                                      Map TrackId -> drawn nodes of that target
//   effects.active|eligibleSince|offSince|activations|clip, blurSupported
//   destinationsState, frames.pending|crops|askedAt|serial|head, entries
//   abort, listeners, timers, observers, scrollers, frameRequest, inline, destroyed

const SVG_NS = 'http://www.w3.org/2000/svg';

// The default clock reads the globals at call time, never at import.
const SYSTEM_CLOCK = Object.freeze({
  now: () => globalThis.performance.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: handle => globalThis.clearTimeout(handle),
});

const FIT_OPTIONS = ['auto'].concat(FITS);
const FOCUS_MODES = ['auto', 'all', 'selected', 'off'];
const RAIL_MODES = ['auto', 'multiple', 'always', 'never'];
const SCHEMES = ['dark', 'light', 'inherit'];
// Every key setOptions() reads; CREATION_KEYS are accepted by createCameraOverlay() only.
const SETTING_KEYS = ['onSelect', 'onAction', 'onError', 'fit', 'position', 'mirror', 'scene',
  'focus', 'effects', 'markers', 'colors', 'motion', 'rail', 'retained', 'readout', 'actions',
  'thumbnails', 'destinations', 'destinationSlot', 'announceContent', 'labels', 'lang', 'scheme'];
const CREATION_KEYS = ['video', 'container', 'mount', 'styles', 'styleNonce', 'clock'];
// Settings whose change re-reads the layout.
const LAYOUT_KEYS = ['fit', 'position', 'mirror', 'markers', 'scheme', 'lang'];
// Records whose given keys merge into the stored ones.
const MERGED_RECORDS = ['effects', 'markers', 'actions'];
// [default, min, max] per number.
const EFFECT_RANGES = { dim: [0.42, 0, 0.85], blur: [8, 0, 24], wash: [0, 0, 0.25],
  glow: [0.7, 0, 1], dwellMs: [500, 300, 5000], cooldownMs: [1000, 400, 5000] };
const CUTOUT_RANGES = { cutoutMargin: [9, 0, 24], cutoutRadius: [6, 0, 16], hitSlop: [12, 0, 24] };
const THUMBNAIL_RANGES = { size: [48, 24, 96], refreshMs: [1000, 250, 60000] };
const ACTION_KEYS = ['open', 'copy', 'check'];
const DESTINATION_METHODS = ['get', 'resolve', 'cancel', 'subscribe'];

function enumOption(value, allowed, fallback, name) {
  if (value === undefined) return fallback;
  if (!allowed.includes(value)) {
    throw new RangeError(`${name} must be one of ${allowed.join(', ')}.`);
  }
  return value;
}

function booleanOption(value, fallback, name) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean.`);
  return value;
}

function callbackOption(value, name) {
  if (value !== undefined && typeof value !== 'function') {
    throw new TypeError(`${name} must be a function.`);
  }
  return value;
}

// Numbers of one settings record, each [default, min, max]; other keys are ignored.
function rangeSettings(record, ranges, name) {
  optionRecord(record, name);
  const out = {};
  for (const key of Object.keys(ranges)) {
    const [fallback, min, max] = ranges[key];
    out[key] = numberOption(record, key, fallback, min, max, name);
  }
  return out;
}

function markerSettings(record) {
  const markers = Object.assign(outlineSettings(record, 'markers'),
    rangeSettings(record, CUTOUT_RANGES, 'markers'));
  const given = key => (record === undefined ? undefined : record[key]);
  markers.segment = enumOption(given('segment'), ['line', 'none'], 'line', 'markers.segment');
  markers.partial = enumOption(given('partial'), ['points', 'none'], 'points', 'markers.partial');
  markers.edgeHints = booleanOption(given('edgeHints'), true, 'markers.edgeHints');
  return Object.freeze(markers);
}

function actionSettings(record) {
  optionRecord(record, 'actions');
  const actions = {};
  for (const key of ACTION_KEYS) {
    actions[key] = booleanOption(record === undefined ? undefined : record[key], true,
      `actions.${key}`);
  }
  return Object.freeze(actions);
}

// The defined keys of record over a copy of base (__proto__ skipped).
function definedOver(base, record) {
  const out = Object.assign({}, isRecord(base) ? base : {});
  for (const key of Object.keys(record)) {
    if (key !== '__proto__' && record[key] !== undefined) out[key] = record[key];
  }
  return out;
}

// Stored as { enabled, size?, refreshMs? }: a boolean switches, a record enables and merges.
function mergeThumbnails(stored, value) {
  const base = isRecord(stored) ? stored : { enabled: false };
  if (typeof value === 'boolean') return Object.assign({}, base, { enabled: value });
  if (!isRecord(value)) throw new TypeError('thumbnails must be a boolean or { size, refreshMs }.');
  return Object.assign(definedOver(base, value), { enabled: true });
}

function thumbnailSettings(stored) {
  const record = stored === undefined ? { enabled: false } : stored;
  return Object.freeze(Object.assign({ enabled: record.enabled === true },
    rangeSettings(record, THUMBNAIL_RANGES, 'thumbnails')));
}

function destinationsOption(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || typeof value.canResolve !== 'boolean' ||
    DESTINATION_METHODS.some(key => typeof value[key] !== 'function')) {
    throw new TypeError('destinations must be null or a verifier with a boolean canResolve ' +
      'and get, resolve, cancel and subscribe functions.');
  }
  return value;
}

// The canonical BCP 47 tag.
function langOption(value) {
  if (value === undefined) return 'en';
  if (typeof value !== 'string') throw new TypeError('lang must be a BCP 47 language tag.');
  if (typeof Intl === 'undefined' || typeof Intl.getCanonicalLocales !== 'function') {
    if (value === '') throw new RangeError('lang must not be empty.');
    return value;
  }
  let tags;
  try {
    tags = Intl.getCanonicalLocales(value);
  } catch (error) {
    throw new RangeError(`lang ${JSON.stringify(value)} is not a valid BCP 47 language tag.`);
  }
  return tags[0];
}

// 'auto', or a frozen ObjectPosition from a string or an object.
function positionOption(value) {
  if (value === undefined || value === 'auto') return 'auto';
  if (typeof value !== 'string') return checkedPosition(value);
  const position = parseObjectPosition(value);
  if (position === null) {
    throw new RangeError(`position ${JSON.stringify(value)} is not a supported object-position ` +
      '(keywords, px, % and calc(% +/- px)).');
  }
  return position;
}

function mirrorOption(value) {
  if (value === undefined || value === 'auto') return 'auto';
  if (typeof value !== 'boolean') throw new RangeError('mirror must be true, false or \'auto\'.');
  return value;
}

// The given settings over the stored ones: undefined keeps a value, effects, markers and actions
// merge key by key, thumbnails switch or merge. Labels are merged into the table separately.
function mergeSettings(stored, given) {
  const next = Object.assign({}, stored);
  for (const key of SETTING_KEYS) {
    const value = given[key];
    if (value === undefined || key === 'labels') continue;
    if (key === 'thumbnails') next.thumbnails = mergeThumbnails(stored.thumbnails, value);
    else if (MERGED_RECORDS.includes(key) && isRecord(value)) {
      next[key] = definedOver(stored[key], value);
    } else next[key] = value;
  }
  return next;
}

// Every setting validated with its default; RangeError or TypeError before anything changes.
function resolveSettings(stored) {
  return Object.freeze({
    onSelect: callbackOption(stored.onSelect, 'onSelect'),
    onAction: callbackOption(stored.onAction, 'onAction'),
    onError: callbackOption(stored.onError, 'onError'),
    fit: enumOption(stored.fit, FIT_OPTIONS, 'auto', 'fit'),
    position: positionOption(stored.position),
    mirror: mirrorOption(stored.mirror),
    scene: booleanOption(stored.scene, true, 'scene'),
    focus: enumOption(stored.focus, FOCUS_MODES, 'auto', 'focus'),
    effects: Object.freeze(rangeSettings(stored.effects, EFFECT_RANGES, 'effects')),
    markers: markerSettings(stored.markers),
    colors: enumOption(stored.colors, ['track', 'mono'], 'track', 'colors'),
    motion: enumOption(stored.motion, ['auto', 'reduce'], 'auto', 'motion'),
    rail: enumOption(stored.rail, RAIL_MODES, 'auto', 'rail'),
    retained: booleanOption(stored.retained, true, 'retained'),
    readout: booleanOption(stored.readout, true, 'readout'),
    actions: actionSettings(stored.actions),
    thumbnails: thumbnailSettings(stored.thumbnails),
    destinations: destinationsOption(stored.destinations),
    destinationSlot: booleanOption(stored.destinationSlot, true, 'destinationSlot'),
    announceContent: enumOption(stored.announceContent, ['none', 'preview'], 'none',
      'announceContent'),
    lang: langOption(stored.lang),
    scheme: enumOption(stored.scheme, SCHEMES, 'dark', 'scheme'),
  });
}

// Flat-tree parent: the assigned slot, the parent element, or the host of a shadow root.
function flatParent(node) {
  if (node.assignedSlot) return node.assignedSlot;
  if (node.parentElement) return node.parentElement;
  const parent = node.parentNode;
  return parent && parent.nodeType === 11 && parent.host ? parent.host : null;
}

function checkElements(options) {
  if (!isRecord(options)) {
    throw new TypeError('createCameraOverlay() needs options { video, container }.');
  }
  const { video, container } = options;
  const doc = video !== null && typeof video === 'object' ? video.ownerDocument : null;
  const win = doc ? doc.defaultView : null;
  if (!doc || !win || typeof win.getComputedStyle !== 'function') {
    throw new TypeError('video must be a video element of a document with a window ' +
      '(it has no ownerDocument).');
  }
  if (container === null || typeof container !== 'object' || container === video ||
    typeof container.contains !== 'function' || !container.contains(video)) {
    throw new TypeError('container must be an element that contains the video.');
  }
  if (win.getComputedStyle(container).position === 'static') {
    throw new TypeError('container must be positioned (position: static found); ' +
      'give it position: relative.');
  }
  return { doc, win, video, container };
}

// Mount elements of the video's document outside the container; any tree scope.
function checkMount(mount, doc, container) {
  if (mount === undefined) return {};
  if (!isRecord(mount)) throw new TypeError('mount must be an object { rail?, readout? }.');
  const mounts = {};
  for (const key of ['rail', 'readout']) {
    const el = mount[key];
    if (el === undefined) continue;
    if (el === null || typeof el !== 'object' || el.nodeType !== 1 || el.ownerDocument !== doc) {
      throw new TypeError(`mount.${key} must be an element of the video's document.`);
    }
    for (let node = el; node !== null; node = flatParent(node)) {
      if (node === container) throw new TypeError(`mount.${key} must lie outside the container.`);
    }
    mounts[key] = el;
  }
  return mounts;
}

function checkCreation(options) {
  const styles = enumOption(options.styles, ['inject', 'none'], 'inject', 'styles');
  const nonce = options.styleNonce;
  if (nonce !== undefined && typeof nonce !== 'string') {
    throw new TypeError('styleNonce must be a string.');
  }
  const clock = options.clock === undefined ? SYSTEM_CLOCK : options.clock;
  if (clock === null || typeof clock !== 'object' || typeof clock.now !== 'function' ||
    typeof clock.setTimeout !== 'function' || typeof clock.clearTimeout !== 'function') {
    throw new TypeError('clock must provide now(), setTimeout() and clearTimeout().');
  }
  return { inject: styles === 'inject', nonce, clock };
}

// 8 random hex characters per instance, so element ids of two module copies never collide.
function instanceId(win) {
  const bytes = new Uint8Array(4);
  const source = win.crypto || globalThis.crypto;
  if (source && typeof source.getRandomValues === 'function') source.getRandomValues(bytes);
  else bytes.forEach((byte, i) => { bytes[i] = Math.floor(Math.random() * 256); });
  return Array.prototype.map.call(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Backdrop blur needs a path() clip and backdrop-filter; dim and wash need SVG only.
function blurSupport(win) {
  const css = win.CSS;
  if (!css || typeof css.supports !== 'function') return false;
  return css.supports('clip-path', 'path(evenodd, "M0 0")') &&
    (css.supports('backdrop-filter', 'blur(1px)') ||
      css.supports('-webkit-backdrop-filter', 'blur(1px)'));
}

// Writes an attribute only when its value changes; null or undefined removes it.
function setAttr(el, name, value) {
  if (value === null || value === undefined) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== String(value)) el.setAttribute(name, String(value));
}

function setAttrs(el, attributes) {
  for (const name of Object.keys(attributes)) setAttr(el, name, attributes[name]);
  return el;
}

function htmlNode(doc, tag, attributes, parent) {
  const el = setAttrs(doc.createElement(tag), attributes);
  if (parent) parent.appendChild(el);
  return el;
}

function svgNode(doc, tag, attributes, parent) {
  const el = setAttrs(doc.createElementNS(SVG_NS, tag), attributes);
  if (parent) parent.appendChild(el);
  return el;
}

// Inline properties go through CSSOM (never a style attribute), written only on change.
function setStyle(ctx, el, name, value) {
  let written = ctx.inline.get(el);
  if (written === undefined) {
    written = new Map();
    ctx.inline.set(el, written);
  }
  if (written.get(name) === value) return;
  written.set(name, value);
  if (value === null) el.style.removeProperty(name);
  else el.style.setProperty(name, value);
}

// A CSS number: 4 decimals at most, never an exponent, -0 as 0.
const cssNumber = n => String(zero(Math.round(n * 1e4) / 1e4));
const cssPx = n => `${cssNumber(n)}px`;

// qr-camera-<name>-<instance>[-<suffix>]: unique across instances and module copies.
const elementId = (ctx, name, suffix) => 'qr-camera-' + name + '-' + ctx.instance +
  (suffix === undefined ? '' : '-' + suffix);

// A target's color and numeral color: themable per palette index, or the monochrome highlight.
// Set them as --qr-target-color and --qr-target-text with setStyle().
function trackColor(slot, colors) {
  if (colors === 'mono') {
    return { index: 'mono', color: 'var(--qr-scanner-highlight,#F5F7FA)',
      text: 'var(--qr-scanner-action-text,#000)' };
  }
  const index = slot % 8;
  return { index, color: `var(--qr-scanner-color-${index},${TRACK_COLORS[index]})`,
    text: `var(--qr-scanner-color-${index}-text,var(--qr-scanner-action-text,#000))` };
}

// Every listener carries the instance's abort signal and is removed explicitly on destroy too.
// Returns a function that removes this one listener earlier.
function listen(ctx, target, type, handler, options) {
  const capture = isRecord(options) ? options.capture === true : options === true;
  const record = { target, type, handler, capture };
  target.addEventListener(type, handler,
    Object.assign({}, isRecord(options) ? options : { capture }, { signal: ctx.abort.signal }));
  ctx.listeners.add(record);
  return () => {
    if (ctx.listeners.delete(record)) target.removeEventListener(type, handler, capture);
  };
}

// UI timers on the clock: destroy() clears them and a callback never runs after it.
function setTimer(ctx, callback, ms) {
  const entry = { handle: null };
  ctx.timers.add(entry);
  entry.handle = ctx.clock.setTimeout(() => {
    if (ctx.timers.delete(entry) && !ctx.destroyed) callback();
  }, ms);
  return entry;
}

function clearTimer(ctx, entry) {
  if (entry && ctx.timers.delete(entry)) ctx.clock.clearTimeout(entry.handle);
}

// Whether a node belongs to the root or a mounted part.
function ownsNode(ctx, node) {
  if (node === null || typeof node !== 'object') return false;
  return [ctx.root, ctx.parts.rail.wrapper, ctx.parts.readout.wrapper]
    .some(owner => owner !== null && owner.contains(node));
}

const rootNodeOf = node => (typeof node.getRootNode === 'function' ? node.getRootNode()
  : node.ownerDocument);

// One stylesheet as the first child of parent, carrying the nonce.
function styleSheet(ctx, parent) {
  const sheet = ctx.doc.createElement('style');
  if (ctx.nonce !== undefined) sheet.setAttribute('nonce', ctx.nonce);
  sheet.textContent = CAMERA_OVERLAY_CSS;
  parent.insertBefore(sheet, parent.firstChild);
  return sheet;
}

// A part renders into its mount through a wrapper, or into the in-video controls. The wrapper
// starts with a stylesheet when its tree scope has none yet.
function makePart(ctx, name, mount, styledScopes) {
  if (mount === undefined) {
    return { name, mount: null, wrapper: null, host: ctx.controls, mounted: false,
      size: 'regular' };
  }
  const wrapper = htmlNode(ctx.doc, 'div', { 'data-qr-camera-part': name });
  const scope = rootNodeOf(mount);
  if (ctx.inject && !styledScopes.includes(scope)) {
    styledScopes.push(scope);
    styleSheet(ctx, wrapper);
  }
  return { name, mount, wrapper, host: wrapper, mounted: true, size: 'regular' };
}

// Root subtree, part wrappers and the static rail and readout shells; attached at the end.
function buildTree(ctx, mounts) {
  const { doc } = ctx;
  const root = htmlNode(doc, 'div', { 'data-qr-camera-overlay': '' });
  ctx.root = root;
  if (ctx.inject) styleSheet(ctx, root);
  ctx.blur = htmlNode(doc, 'div', { class: 'qr-camera-blur', 'data-active': 'false' }, root);
  ctx.scene = svgNode(doc, 'svg', { class: 'qr-camera-scene', 'aria-hidden': 'true',
    width: '100%', height: '100%', viewBox: '0 0 0 0' }, root);
  ctx.defs = svgNode(doc, 'defs', {}, ctx.scene);
  ctx.scrim = svgNode(doc, 'path', { class: 'qr-camera-scrim', 'data-active': 'false' },
    ctx.scene);
  ctx.wash = svgNode(doc, 'path', { class: 'qr-camera-wash', 'data-active': 'false' },
    ctx.scene);
  ctx.controls = mounts.rail !== undefined && mounts.readout !== undefined ? null
    : htmlNode(doc, 'div', { class: 'qr-camera-controls' }, root);
  ctx.announcer = htmlNode(doc, 'div', { class: 'qr-camera-announcer', role: 'status',
    'aria-atomic': 'true' }, root);
  const styledScopes = [rootNodeOf(ctx.container)];
  ctx.parts = { rail: makePart(ctx, 'rail', mounts.rail, styledScopes),
    readout: makePart(ctx, 'readout', mounts.readout, styledScopes) };
  const noteId = elementId(ctx, 'note');
  // tabindex -1: browsers that make a scroll container focusable keep the one tab stop.
  const toolbar = htmlNode(doc, 'div', { class: 'qr-camera-rail', role: 'toolbar',
    'aria-orientation': 'horizontal', 'aria-describedby': noteId, tabindex: '-1', hidden: '' },
  ctx.parts.rail.host);
  ctx.rail = { toolbar, group: htmlNode(doc, 'div', { role: 'radiogroup' }, toolbar),
    note: htmlNode(doc, 'span', { class: 'qr-camera-saturated', id: noteId, hidden: '' },
      toolbar) };
  ctx.readout = htmlNode(doc, 'section', { class: 'qr-camera-readout', tabindex: '-1',
    'data-view': ctx.parts.readout.mounted ? 'card' : 'bar', hidden: '' },
  ctx.parts.readout.host);
}

// Layout inputs are read only by layout(), its triggers and an epoch change.
const SCROLLING = ['auto', 'scroll', 'hidden', 'overlay'];
const IDENTITY = Object.freeze([1, 0, 0, 1]);
const ANGLE_UNITS = { deg: Math.PI / 180, grad: Math.PI / 200, rad: 1, turn: 2 * Math.PI };
const ROTATE_AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const CSS_ANGLE = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)$/;
const near = (a, b) => Math.abs(a - b) <= 1e-6;

// 2D linear parts [a, b, c, d] with x' = a x + c y and y' = b x + d y; n applies first.
const multiply = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3]];

function cssValue(style, name) {
  const value = style.getPropertyValue(name);
  return typeof value === 'string' ? value.trim() : '';
}

// Computed transform: none, matrix(), or matrix3d() without perspective on the element plane.
function transformLinear(value) {
  if (value === '' || value === 'none') return IDENTITY;
  const match = /^(matrix(?:3d)?)\(([^()]*)\)$/.exec(value);
  if (match === null) return null;
  const n = match[2].split(',').map(Number);
  if (!n.every(Number.isFinite)) return null;
  if (match[1] === 'matrix') return n.length === 6 ? n.slice(0, 4) : null;
  if (n.length !== 16 || !near(n[3], 0) || !near(n[7], 0) || !(n[15] > 0)) return null;
  return [n[0] / n[15], n[1] / n[15], n[4] / n[15], n[5] / n[15]];
}

// Computed scale: none, or one to three numbers (the third scales z only).
function scaleLinear(value) {
  if (value === '' || value === 'none') return IDENTITY;
  const n = value.split(/\s+/).map(token => (token.endsWith('%')
    ? Number(token.slice(0, -1)) / 100 : Number(token)));
  if (n.length > 3 || !n.every(Number.isFinite)) return null;
  return [n[0], 0, 0, n.length === 1 ? n[0] : n[1]];
}

// Computed rotate: an angle about z, an x, y or z keyword, or a vector axis; projected on the
// element plane.
function rotateLinear(value) {
  if (value === '' || value === 'none') return IDENTITY;
  let angle = null, axis = null;
  const numbers = [];
  for (const token of value.split(/\s+/)) {
    const match = CSS_ANGLE.exec(token);
    if (match !== null && angle === null) angle = Number(match[1]) * ANGLE_UNITS[match[2]];
    else if (hasOwn(ROTATE_AXES, token) && axis === null) axis = ROTATE_AXES[token];
    else if (CSS_NUMBER.test(token)) numbers.push(Number(token));
    else return null;
  }
  if (numbers.length === 3 && axis === null) axis = numbers;
  else if (numbers.length !== 0) return null;
  if (angle === null) return null;
  const [x, y, z] = axis === null ? ROTATE_AXES.z : axis;
  const length = Math.hypot(x, y, z);
  if (length === 0) return IDENTITY;
  const ux = x / length, uy = y / length, uz = z / length;
  const cos = Math.cos(angle), sin = Math.sin(angle), k = 1 - cos;
  return [cos + ux * ux * k, uy * ux * k + uz * sin, ux * uy * k - uz * sin, cos + uy * uy * k];
}

// One element's linear part: rotate, scale, then transform (translations never count).
function elementLinear(style) {
  const rotate = rotateLinear(cssValue(style, 'rotate'));
  const scale = scaleLinear(cssValue(style, 'scale'));
  const transform = transformLinear(cssValue(style, 'transform'));
  return rotate === null || scale === null || transform === null ? null
    : multiply(rotate, multiply(scale, transform));
}

// Identity is false, a horizontal flip true, anything else null.
function mirrorOf(m) {
  if (m === null || !near(m[1], 0) || !near(m[2], 0) || !near(m[3], 1)) return null;
  return near(m[0], 1) ? false : near(m[0], -1) ? true : null;
}

// s for s·I with s > 0 (1e-6 relative), else null.
function uniformScale(m) {
  if (m === null || !(m[0] > 0)) return null;
  const tolerance = 1e-6 * m[0];
  return Math.abs(m[1]) <= tolerance && Math.abs(m[2]) <= tolerance &&
    Math.abs(m[3] - m[0]) <= tolerance ? m[0] : null;
}

// Border plus padding per side, the left and top borders, the content size and the border-box
// width, in local CSS px.
function boxOf(style) {
  const px = name => {
    const n = parseFloat(cssValue(style, name));
    return Number.isFinite(n) ? n : 0;
  };
  const edge = side => px(`border-${side}-width`) + px(`padding-${side}`);
  const box = { left: edge('left'), right: edge('right'), top: edge('top'),
    bottom: edge('bottom'), borderLeft: px('border-left-width'),
    borderTop: px('border-top-width') };
  const borderBox = cssValue(style, 'box-sizing') === 'border-box';
  box.width = Math.max(0, px('width') - (borderBox ? box.left + box.right : 0));
  box.height = Math.max(0, px('height') - (borderBox ? box.top + box.bottom : 0));
  box.outerWidth = box.width + box.left + box.right;
  return box;
}

// Every layout input in one read pass; nothing is written here.
function readLayout(ctx) {
  const { win, video, container, root } = ctx;
  const styleOf = el => win.getComputedStyle(el);
  const videoStyle = styleOf(video);
  // The video and the elements between it and the container: identity or a mirror.
  let linear = elementLinear(videoStyle);
  const scrollers = [];
  for (let node = flatParent(video); node !== null && node !== container;
    node = flatParent(node)) {
    const style = styleOf(node);
    const own = linear === null ? null : elementLinear(style);
    linear = own === null ? null : multiply(own, linear);
    if (SCROLLING.includes(cssValue(style, 'overflow-x')) ||
      SCROLLING.includes(cssValue(style, 'overflow-y'))) scrollers.push(node);
  }
  // The container and its ancestors: a positive uniform scale.
  let chain = IDENTITY;
  for (let node = container; node !== null && chain !== null; node = flatParent(node)) {
    const own = elementLinear(styleOf(node));
    chain = own === null ? null : multiply(own, chain);
  }
  const containerRect = container.getBoundingClientRect();
  const containerBox = boxOf(styleOf(container));
  const videoRect = video.getBoundingClientRect();
  const videoBox = boxOf(videoStyle);
  // A video without a box (display: none) has no view, whatever its computed width says.
  if (video.getClientRects().length === 0) {
    videoBox.width = 0;
    videoBox.height = 0;
  }
  const mirror = mirrorOf(linear);
  // Rect over computed width also covers CSS zoom.
  const scale = containerBox.outerWidth > 0 ? containerRect.width / containerBox.outerWidth : 0;
  const placed = scale > 0 && Number.isFinite(scale);
  let controlsHeight = 0;
  if (placed && ctx.controls !== null && root.isConnected) {
    const controlsRect = ctx.controls.getBoundingClientRect();
    if (controlsRect.height > 0) {
      controlsHeight = (root.getBoundingClientRect().bottom - controlsRect.top) / scale;
    }
  }
  const partWidth = part => (part.mounted ? boxOf(styleOf(part.wrapper)).outerWidth : null);
  const viewBox = cssValue(videoStyle, 'object-view-box');
  return {
    chain: uniformScale(chain) !== null, mirror, scale: placed ? scale : 0,
    left: placed ? (videoRect.left - containerRect.left) / scale - containerBox.borderLeft +
      container.scrollLeft + (mirror === true ? videoBox.right : videoBox.left) : 0,
    top: placed ? (videoRect.top - containerRect.top) / scale - containerBox.borderTop +
      container.scrollTop + videoBox.top : 0,
    width: videoBox.width, height: videoBox.height,
    fit: cssValue(videoStyle, 'object-fit'),
    position: parseObjectPosition(cssValue(videoStyle, 'object-position')),
    viewBox: viewBox !== '' && viewBox !== 'none', scrollers, controlsHeight,
    parts: { rail: partWidth(ctx.parts.rail), readout: partWidth(ctx.parts.readout) },
  };
}

const arrangementOf = (width, height) => (width >= 360 && height >= 380 ? 'regular'
  : width >= 300 && height >= 190 ? 'compact' : 'minimal');

// Writes ctx.reading: the placement (on the video where it inverts exactly, else over the
// container's padding box, so the in-video rail and readout stay usable while markers are
// hidden), the viewBox, the arrangement, the card height, the controls height and the part sizes.
function applyLayout(ctx) {
  const r = ctx.reading;
  if (r.scale > 0) {
    const exact = r.chain && r.mirror !== null;
    setStyle(ctx, ctx.root, 'left', exact ? cssPx(r.left) : '0px');
    setStyle(ctx, ctx.root, 'top', exact ? cssPx(r.top) : '0px');
    setStyle(ctx, ctx.root, 'width', exact ? cssPx(r.width) : '100%');
    setStyle(ctx, ctx.root, 'height', exact ? cssPx(r.height) : '100%');
  }
  setAttr(ctx.scene, 'viewBox', `0 0 ${cssNumber(r.width)} ${cssNumber(r.height)}`);
  const arrangement = arrangementOf(r.width, r.height);
  // The controls move with the arrangement: measure them again on the next frame.
  if (arrangement !== ctx.arrangement && ctx.controls !== null) scheduleLayout(ctx);
  ctx.arrangement = arrangement;
  ctx.controlsHeight = Math.min(r.height, Math.max(0, r.controlsHeight));
  setStyle(ctx, ctx.root, '--qr-camera-card-max', `${Math.round(0.85 * r.height)}px`);
  for (const part of [ctx.parts.rail, ctx.parts.readout]) {
    if (part.mounted) part.size = r.parts[part.name] < 360 ? 'narrow' : 'regular';
  }
  watchScrollers(ctx, r.scrollers);
}

// A scroll listener on each scroll container between the container and the video.
function watchScrollers(ctx, scrollers) {
  ctx.scrollers.forEach((remove, el) => {
    if (!scrollers.includes(el)) {
      remove();
      ctx.scrollers.delete(el);
    }
  });
  for (const el of scrollers) {
    if (ctx.scrollers.has(el)) continue;
    ctx.scrollers.set(el, listen(ctx, el, 'scroll', event => {
      if (!ownsNode(ctx, event.target)) scheduleLayout(ctx);
    }, { passive: true }));
  }
}

// Observer and event triggers coalesce into one animation frame, cancelled by destroy().
function scheduleLayout(ctx) {
  if (ctx.destroyed || ctx.frameRequest !== null) return;
  if (typeof ctx.win.requestAnimationFrame !== 'function') {
    relayout(ctx, 'layout');
    return;
  }
  ctx.frameRequest = ctx.win.requestAnimationFrame(() => {
    ctx.frameRequest = null;
    if (!ctx.destroyed) relayout(ctx, 'layout');
  });
}

// Synchronous re-read, then a render pass from the last snapshot.
function relayout(ctx, cause) {
  ctx.reading = readLayout(ctx);
  applyLayout(ctx);
  refreshView(ctx);
  renderPass(ctx, passOf(ctx, cause));
}

// Alignment state and view from the reading, the settings, the media size and the frame; the
// first failing state wins. Reads only videoWidth and videoHeight.
function refreshView(ctx) {
  const { reading: r, settings } = ctx;
  const frame = ctx.snapshot === null ? null : ctx.snapshot.frame;
  ctx.view = null;
  ctx.resolved = null;
  const state = (() => {
    if (frame === null || frame === undefined) return 'no-frame';
    const videoWidth = ctx.video.videoWidth, videoHeight = ctx.video.videoHeight;
    const sized = videoWidth > 0 && videoHeight > 0;
    const mediaWidth = sized ? videoWidth : frame.width;
    const mediaHeight = sized ? videoHeight : frame.height;
    if (!(r.width > 0 && r.height > 0 && r.scale > 0 && mediaWidth > 0 && mediaHeight > 0 &&
      frame.width > 0 && frame.height > 0)) return 'no-size';
    if (!r.chain || r.mirror === null) return 'unsupported-transform';
    if (r.viewBox) return 'object-view-box';
    const fit = settings.fit === 'auto' ? r.fit : settings.fit;
    if (!FITS.includes(fit)) return 'unsupported-fit';
    const position = settings.position === 'auto' ? r.position : settings.position;
    if (position === null) return 'unsupported-position';
    if (!sized && (fit === 'none' || fit === 'scale-down')) return 'no-media';
    ctx.view = resolveView({ mediaWidth, mediaHeight, viewWidth: r.width, viewHeight: r.height,
      fit, position, mirror: typeof settings.mirror === 'boolean' ? settings.mirror : r.mirror });
    if (sized && Math.abs((frame.width / frame.height) / (videoWidth / videoHeight) - 1) > 0.01) {
      return 'frame-mismatch';
    }
    ctx.resolved = ctx.view;
    return 'aligned';
  })();
  ctx.alignment = state;
  return state;
}

// Focus as drawn: 'auto' follows the selection mode.
const focusOf = ctx => (ctx.settings.focus !== 'auto' ? ctx.settings.focus
  : ctx.selection.mode === 'manual' ? 'selected' : 'all');

// Root and part attributes and the shells' names, written only on change.
function syncAttributes(ctx) {
  const { settings, labels } = ctx;
  setAttrs(ctx.root, { lang: settings.lang, 'data-alignment': ctx.alignment,
    'data-focus': focusOf(ctx), 'data-colors': settings.colors, 'data-motion': settings.motion,
    'data-qr-camera-scheme': settings.scheme, 'data-qr-camera-size': ctx.arrangement,
    'data-blur': ctx.blurSupported ? cssNumber(settings.effects.blur) : '0' });
  for (const part of [ctx.parts.rail, ctx.parts.readout]) {
    if (!part.mounted) continue;
    setAttrs(part.wrapper, { lang: settings.lang, 'data-colors': settings.colors,
      'data-qr-camera-scheme': settings.scheme, 'data-qr-camera-size': part.size });
  }
  setAttr(ctx.rail.toolbar, 'aria-label', labels.targets);
  setAttr(ctx.rail.group, 'aria-label', labels.choose);
  setAttr(ctx.readout, 'aria-label', labels.readout);
}

// One render pass. cause: 'update', 'select', 'clear', 'layout', 'options', 'input', 'timer',
// 'destinations' or 'frame'. newFrame: the snapshot carries another accepted frame than the
// previous one (observedAt, epoch or sequence); epochChanged: its epoch differs.
const passOf = (ctx, cause, extra) => Object.assign({ cause, snapshot: ctx.snapshot,
  previous: null, newFrame: false, epochChanged: false }, extra);

// The fixed order every layer hooks into; each layer diffs its own nodes. ctx.passDepth tells
// input handlers that a pass is running. A callback or provider error handler may destroy the
// overlay mid-pass: the remaining steps are then skipped.
const PASS_STEPS = [syncAttributes, projectScene, planEffects, drawScene, drawEffects,
  renderRail, renderReadout, settleControls, finishPass];

function renderPass(ctx, pass) {
  if (ctx.destroyed) return;
  ctx.passDepth += 1;
  try {
    for (const step of PASS_STEPS) {
      step(ctx, pass);
      if (ctx.destroyed) return;
    }
  } finally {
    ctx.passDepth -= 1;
  }
}

function checkSnapshot(snapshot) {
  const frame = isRecord(snapshot) ? snapshot.frame : null;
  if (!isRecord(snapshot) || !Array.isArray(snapshot.tracks) ||
    !Array.isArray(snapshot.results) || typeof snapshot.now !== 'number' ||
    typeof snapshot.epoch !== 'number' ||
    (frame !== null && frame !== undefined && !isRecord(frame))) {
    throw new TypeError('update() needs a TrackerSnapshot from createDetectionTracker(), ' +
      'with tracks and results arrays; got ' +
      (Array.isArray(snapshot) ? 'an array' : snapshot === null ? 'null' : typeof snapshot) + '.');
  }
}

// Why a snapshot is older than the last applied one, or null. Destroyed snapshots always apply.
function staleReason(ctx, snapshot) {
  const last = ctx.ordering;
  if (last === null || snapshot.status === 'destroyed') return null;
  if (snapshot.epoch !== last.epoch) return snapshot.epoch < last.epoch ? 'stale_epoch' : null;
  if (snapshot.now < last.now) return 'stale_time';
  const a = snapshot.frame, b = last.frame;
  if (!isRecord(a) || !isRecord(b)) return null;
  const older = typeof a.sequence === 'number' && typeof b.sequence === 'number'
    ? a.sequence < b.sequence : a.observedAt < b.observedAt;
  return older ? 'stale_frame' : null;
}

const sameFrame = (a, b) => isRecord(a) && isRecord(b) && a.observedAt === b.observedAt &&
  a.epoch === b.epoch && a.sequence === b.sequence;

// The selected live track of the last snapshot; null for none or a result selection.
function selectedTrack(ctx) {
  const id = ctx.selection.selectedId;
  if (ctx.snapshot === null || typeof id !== 'string' || id.indexOf('track-') !== 0) return null;
  return ctx.snapshot.tracks.find(track => track.id === id) || null;
}

const resultById = (ctx, id) => (ctx.snapshot === null || typeof id !== 'string' ? null
  : ctx.snapshot.results.find(result => result.id === id) || null);

// The readout's result: the selected track's, a selected result, or the held one.
function readoutResult(ctx) {
  const track = selectedTrack(ctx);
  if (track !== null) return resultById(ctx, track.resultId);
  const id = ctx.selection.selectedId;
  if (typeof id === 'string' && id.indexOf('result-') === 0) return resultById(ctx, id);
  return resultById(ctx, ctx.selection.held);
}

// The readout subject: the readout result's detection, else the selected track's own.
function readoutSubject(ctx) {
  const result = readoutResult(ctx);
  if (result !== null) return result.detection;
  const track = selectedTrack(ctx);
  return track === null ? null : track.detection;
}

const pointCopy = p => ({ x: p.x, y: p.y });

function targetInspection(t) {
  return { id: t.id, slot: t.slot, number: String(t.slot + 1), color: t.color, state: t.state,
    basis: t.basis, kind: t.kind, drawn: t.drawn, selected: t.selected, related: t.related,
    precise: t.precise, cutout: t.cutout, margin: t.margin, visibleFraction: t.visibleFraction,
    stateText: t.stateText, points: t.points === null ? null : t.points.map(pointCopy),
    bracket: t.bracket, badge: t.badge === null ? null : pointCopy(t.badge) };
}

// A new deep-frozen copy on each call; nothing in it is shared with the instance.
function inspection(ctx) {
  const v = ctx.view;
  const axis = a => ({ fraction: a.fraction, offset: a.offset });
  const { selection, effects } = ctx;
  return deepFreeze({
    alignment: ctx.alignment,
    view: v === null ? null : { mediaWidth: v.mediaWidth, mediaHeight: v.mediaHeight,
      viewWidth: v.viewWidth, viewHeight: v.viewHeight, fit: v.fit,
      position: { x: axis(v.position.x), y: axis(v.position.y) }, mirror: v.mirror,
      rect: { x: v.rect.x, y: v.rect.y, width: v.rect.width, height: v.rect.height } },
    arrangement: ctx.controls === null ? 'mounted' : ctx.arrangement,
    controlsHeight: ctx.controls === null ? 0 : ctx.controlsHeight,
    focus: focusOf(ctx),
    effects: { active: effects.active, eligibleSince: effects.eligibleSince,
      offSince: effects.offSince, activations: effects.activations },
    blur: !ctx.blurSupported ? 'unsupported' : ctx.settings.effects.blur > 0 ? 'on' : 'off',
    clip: effects.clip,
    selectionMode: selection.mode,
    selected: selection.selectedId,
    held: selection.held,
    declined: Array.from(selection.declined),
    locks: { pointer: selection.locks.pointer, focus: selection.locks.focus },
    ignored: { count: ctx.ignored.count, last: ctx.ignored.last },
    destinations: ctx.destinationsState,
    frameImage: { pending: ctx.frames.pending !== null, crops: ctx.frames.crops.size },
    entries: ctx.entries.slice(),
    targets: Array.from(ctx.targets.values()).sort((a, b) => a.slot - b.slot)
      .map(targetInspection),
  });
}

// Per-snapshot state: initial at creation and emptied again by destroy().
function resetState(ctx) {
  ctx.snapshot = null;
  ctx.ordering = null;
  ctx.layoutEpoch = null;
  ctx.ignored = { count: 0, last: null };
  ctx.cleared = false;
  ctx.selection = { mode: 'auto', selectedId: null, held: null, declined: new Set(),
    locks: { pointer: false, focus: false } };
  ctx.notified = { track: null, result: null, empty: true };
  ctx.targets = new Map();
  ctx.sceneNodes = new Map();
  ctx.effects = { active: false, eligibleSince: null, offSince: null, activations: 0,
    clip: null };
  ctx.entries = [];
  ctx.frames = { pending: null, crops: new Map(), askedAt: null, serial: 0, head: null };
  ctx.destinationsState = 'none';
  ctx.view = null;
  ctx.resolved = null;
  ctx.alignment = 'no-frame';
  ctx.controlsHeight = 0;
  ctx.controlsKey = null;
  ctx.railView = { nodes: new Map(), divider: null, shown: false };
  ctx.readoutView = null;
  ctx.readoutState = { card: false, expanded: false, slot: null,
    status: { copy: '', bytes: '' }, timers: { copy: null, bytes: null },
    tokens: { copy: null, bytes: null }, subject: null, labels: null, described: null,
    rendered: null };
  const generation = isRecord(ctx.dest) ? ctx.dest.generation + 1 : 0;
  ctx.dest = { generation, unsubscribe: null, shown: null, failed: false, queued: false };
  ctx.texts = new WeakMap();
  resetInteraction(ctx);
}

// Layout triggers: size and class or style changes, window resize and new media. A mounted
// part only matters when its width changes.
function observe(ctx) {
  const { win } = ctx;
  const schedule = () => scheduleLayout(ctx);
  const wrappers = [ctx.parts.rail.wrapper, ctx.parts.readout.wrapper].filter(el => el !== null);
  if (typeof win.ResizeObserver === 'function') {
    const widths = new Map();
    const resize = new win.ResizeObserver(entries => {
      let relevant = false;
      entries.forEach(entry => {
        if (!wrappers.includes(entry.target)) {
          relevant = true;
          return;
        }
        const width = entry.contentRect.width;
        if (widths.get(entry.target) !== width) relevant = true;
        widths.set(entry.target, width);
      });
      if (relevant) schedule();
    });
    [ctx.container, ctx.video, ctx.controls].concat(wrappers)
      .forEach(el => { if (el !== null) resize.observe(el); });
    ctx.observers.push(resize);
  }
  if (typeof win.MutationObserver === 'function') {
    const mutation = new win.MutationObserver(schedule);
    const filter = { attributes: true, attributeFilter: ['class', 'style'] };
    mutation.observe(ctx.video, filter);
    mutation.observe(ctx.container, filter);
    ctx.observers.push(mutation);
  }
  listen(ctx, win, 'resize', schedule);
  listen(ctx, ctx.video, 'loadedmetadata', schedule);
  listen(ctx, ctx.video, 'resize', schedule);
}

/** Framework-free spatial overlay and readout; repaint it from the tracker's onChange. */
export function createCameraOverlay(options) {
  // Every option is validated before any node, listener or observer exists.
  const { doc, win, video, container } = checkElements(options);
  const mounts = checkMount(options.mount, doc, container);
  const { inject, nonce, clock } = checkCreation(options);
  const raw = mergeSettings({}, options);
  const settings = resolveSettings(raw);
  const labels = mergeLabels(DEFAULT_LABELS, options.labels);
  const Controller = win.AbortController || globalThis.AbortController;
  const ctx = { doc, win, video, container, clock, inject, nonce, instance: instanceId(win),
    raw, settings, labels, blurSupported: blurSupport(win), abort: new Controller(),
    inline: new WeakMap(), listeners: new Set(), timers: new Set(), scrollers: new Map(),
    observers: [], frameRequest: null, destroyed: false, reading: null, arrangement: null,
    passDepth: 0 };
  resetState(ctx);
  buildTree(ctx, mounts);
  container.appendChild(ctx.root);
  for (const part of [ctx.parts.rail, ctx.parts.readout]) {
    if (part.mounted) part.mount.appendChild(part.wrapper);
  }
  observe(ctx);
  attachInteraction(ctx);
  bindDestinations(ctx);
  // Nothing is drawn before the first update: state no-frame.
  ctx.reading = readLayout(ctx);
  applyLayout(ctx);
  refreshView(ctx);
  syncAttributes(ctx);
  return overlayApi(ctx);
}

function overlayApi(ctx) {
  return Object.freeze({
    get selected() { return selectedTrack(ctx); },
    get selectedResult() { return readoutResult(ctx); },
    get detection() { return readoutSubject(ctx); },
    get selectionMode() { return ctx.selection.mode; },
    get alignment() { return ctx.alignment; },
    get destroyed() { return ctx.destroyed; },
    update(snapshot) { updateOverlay(ctx, snapshot); },
    select(id) {
      if (ctx.destroyed) return false;
      const done = id === null ? resetSelection(ctx) : selectId(ctx, id);
      if (done) renderPass(ctx, passOf(ctx, 'select'));
      return done;
    },
    clear() {
      if (ctx.destroyed) return;
      ctx.ordering = null;
      ctx.cleared = true;
      resetSelection(ctx);
      // A pending copy belongs to the forgotten session: it goes with the crops.
      dropFrameImages(ctx);
      renderPass(ctx, passOf(ctx, 'clear'));
    },
    layout() {
      if (!ctx.destroyed) relayout(ctx, 'layout');
    },
    setOptions(given) { setOverlayOptions(ctx, given); },
    wantsFrameImage() { return !ctx.destroyed && wantsFrame(ctx); },
    setFrameImage(image, frame) {
      if (ctx.destroyed) closeBitmap(image);
      else takeFrameImage(ctx, image, frame);
    },
    inspect() { return inspection(ctx); },
    destroy() { destroyOverlay(ctx); },
  });
}

function updateOverlay(ctx, snapshot) {
  if (ctx.destroyed) return;
  checkSnapshot(snapshot);
  const reason = staleReason(ctx, snapshot);
  if (reason !== null) {
    ctx.ignored = { count: ctx.ignored.count + 1, last: reason };
    return;
  }
  const previous = ctx.snapshot;
  const pass = passOf(ctx, 'update', { snapshot, previous,
    newFrame: isRecord(snapshot.frame) &&
      !sameFrame(snapshot.frame, previous === null ? null : previous.frame),
    epochChanged: snapshot.epoch !== ctx.layoutEpoch });
  ctx.snapshot = snapshot;
  ctx.cleared = false;
  if (snapshot.status !== 'destroyed') {
    ctx.ordering = { epoch: snapshot.epoch, now: snapshot.now, frame: snapshot.frame };
  }
  // A new capture session may come with another camera: read the layout again now.
  if (pass.epochChanged) {
    ctx.layoutEpoch = snapshot.epoch;
    ctx.reading = readLayout(ctx);
    applyLayout(ctx);
  }
  refreshView(ctx);
  applySelection(ctx, pass);
  matchFrameImage(ctx, pass);
  renderPass(ctx, pass);
}

// Validates and merges everything first; a RangeError or TypeError changes nothing.
function setOverlayOptions(ctx, given) {
  if (ctx.destroyed) return;
  if (!isRecord(given)) throw new TypeError('setOptions() needs a settings object.');
  const creation = CREATION_KEYS.filter(key => given[key] !== undefined);
  if (creation.length > 0) {
    throw new TypeError(`${creation.join(', ')} can only be given to createCameraOverlay().`);
  }
  const raw = mergeSettings(ctx.raw, given);
  const settings = resolveSettings(raw);
  const labels = mergeLabels(ctx.labels, given.labels);
  ctx.raw = raw;
  ctx.settings = settings;
  ctx.labels = labels;
  syncThumbnails(ctx);
  if (given.destinations !== undefined) {
    unbindDestinations(ctx);
    bindDestinations(ctx);
    // A provider error handler may have destroyed the overlay.
    if (ctx.destroyed) return;
  }
  if (LAYOUT_KEYS.some(key => given[key] !== undefined)) {
    ctx.reading = readLayout(ctx);
    applyLayout(ctx);
  }
  refreshView(ctx);
  renderPass(ctx, passOf(ctx, 'options'));
}

// ----------------------------------------------------------------------------------- scene

// ctx.targets maps each TrackId of the applied snapshot to its per-target state, in slot order;
// it is empty before the first update and after clear(). An id keeps its object across passes,
// so a later layer may keep private fields on it. Public fields are those of
// OverlayTargetInspection (number excepted): id, slot, color (0-7 or 'mono'), state, basis,
// kind, drawn, selected, related, precise, cutout, margin, visibleFraction, stateText, points,
// bracket and badge. cutout (false) and margin (null) are written by the effects layer only.
// Private fields: track, valid (projection validity), offscreen (valid, nothing in view),
// centroid, caption (rail caption or null), paint (trackColor), corners (outline offset
// corners) and chevron (edge hint path, badge space).
// Inputs: ctx.resolved (the aligned view, else null), ctx.cleared (no scene until the next
// update), ctx.settings.scene and .markers, ctx.controlsHeight (badges stay above it).

const GEOMETRY_KINDS = ['quad', 'segment', 'partial'];
// Projection validity floor (CSS px squared), then badge, dot and glow-region sizes (CSS px).
const MIN_AREA = 16;
const BADGE_RADIUS = 10, BADGE_HIT = 12, BADGE_REACH = 14, BADGE_INSET = 12;
const DOT_RADIUS = 3, GLOW_MARGIN = 12;

// Markers are drawn only when aligned, with scene on, after an update and not since clear().
const sceneShown = ctx => ctx.resolved !== null && ctx.settings.scene === true &&
  !ctx.cleared && ctx.snapshot !== null;

// The measured geometry of a live spatial track, else null (content, lost or stale).
function trackGeometry(track) {
  const geometry = track.basis === 'spatial' && track.state !== 'lost' ? track.geometry : null;
  return isRecord(geometry) && GEOMETRY_KINDS.includes(geometry.kind) &&
    Array.isArray(geometry.points) ? geometry : null;
}

// Strictly convex in either winding, judged on the drawn points themselves.
function strictlyConvex(points) {
  if (points.length !== 4) return false;
  const turns = points.map((p, i) => turn(p, points[(i + 1) % 4], points[(i + 2) % 4]));
  return turns.every(t => t > 0) || turns.every(t => t < 0);
}

const centroidOf = points => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

// The live tracks of the held result (scene and rail).
const isRelated = (ctx, track) => ctx.selection.held !== null &&
  track.resultId === ctx.selection.held;

// State words: a position claim only for an aligned live spatial track.
function stateTextOf(labels, track, fraction) {
  if (track.state === 'lost') return labels.states.lost;
  if (fraction === null) return labels.states.readNow;
  return fraction > 0 ? labels.states.inView : labels.geometry.offscreen;
}

// Rail caption from what was measured; null for a quad shown as an outline.
function captionOf(labels, t, geometry) {
  if (t.state === 'lost') return labels.states.lost;
  if (geometry === null) return labels.geometry.none;
  if (t.offscreen) return labels.geometry.offscreen;
  if (geometry.kind === 'segment') return labels.geometry.segment;
  if (geometry.kind === 'partial' || (t.points !== null && !t.valid)) {
    return labels.geometry.partial;
  }
  return null;
}

// What the scene draws: outline, line, points, an edge badge or nothing.
function drawnOf(ctx, t, geometry) {
  const { markers } = ctx.settings;
  if (!sceneShown(ctx) || t.points === null) return 'none';
  if (t.offscreen) return markers.edgeHints ? 'edge' : 'none';
  if (t.valid && geometry.kind === 'quad') return 'outline';
  if (t.valid && geometry.kind === 'segment') return markers.segment === 'line' ? 'line' : 'none';
  return markers.partial === 'points' ? 'points' : 'none';
}

// Unclamped badge anchor: 14 px beyond the outline's first offset corner, before a scan line's
// first end, from the centroid through the first point (up when they meet), or the centroid.
function badgeAnchor(ctx, t) {
  const p0 = t.points[0];
  if (t.drawn === 'edge') return t.centroid;
  if (t.drawn === 'line') return along(p0, unitTo(t.points[1], p0), BADGE_REACH);
  if (t.drawn === 'outline') {
    const corner = t.corners[0];
    if (Math.hypot(corner.x - p0.x, corner.y - p0.y) > 1e-9) {
      return along(corner, unitTo(p0, corner), BADGE_REACH);
    }
    // Offset 0 puts the corner on the vertex: take the direction of a 1 px offset.
    const { quad, sign } = convexQuad(t.points, 'quadOutline');
    const nudged = offsetCorners(quad, sign, 1, ctx.settings.markers.miterLimit)[0];
    return along(p0, unitTo(p0, nudged), BADGE_REACH);
  }
  const center = t.centroid;
  return Math.hypot(p0.x - center.x, p0.y - center.y) < 1e-6
    ? { x: center.x, y: center.y - BADGE_REACH } : along(center, unitTo(center, p0), BADGE_REACH);
}

// Clamped to [12, W - 12] x [12, H - 12 - controlsHeight] on the 0.1 px grid: never under the
// in-video controls.
function clampBadge(ctx, point) {
  const { viewWidth: width, viewHeight: height } = ctx.resolved;
  const clamp = (value, low, high) => Math.max(low, Math.min(round1(value), high));
  return { x: clamp(point.x, BADGE_INSET, width - BADGE_INSET),
    y: clamp(point.y, BADGE_INSET, height - BADGE_INSET - ctx.controlsHeight) };
}

// Forced colors as the stylesheet's media rule sees them; read only to paint a chevron.
const forcedColors = ctx => typeof ctx.win.matchMedia === 'function' &&
  ctx.win.matchMedia('(forced-colors: active)').matches;

// A 6 px chevron inside the edge badge, pointing at the true centroid; null when they meet.
function chevronOf(badge, centroid) {
  const dx = centroid.x - badge.x, dy = centroid.y - badge.y, length = Math.hypot(dx, dy);
  if (!(length > 1e-6)) return null;
  const ux = dx / length, uy = dy / length;
  const at = (reach, side) => pathPoint({ x: reach * ux - side * uy, y: reach * uy + side * ux });
  return `M${at(5.5, -3)}L${at(8.5, 0)}L${at(5.5, 3)}`;
}

// Recomputes one target from its track, the aligned view, the selection and the settings.
function describeTarget(ctx, t, track) {
  const { labels, settings, resolved } = ctx;
  const geometry = trackGeometry(track);
  const projected = geometry !== null && resolved !== null
    ? projectGeometry(resolved, geometry, MIN_AREA) : null;
  const finite = projected !== null && projected.points.length > 0 &&
    projected.points.every(finitePoint);
  t.track = track;
  t.slot = track.slot;
  t.state = track.state;
  t.basis = track.basis;
  t.kind = geometry === null ? null : geometry.kind;
  t.paint = trackColor(track.slot, settings.colors);
  t.color = t.paint.index;
  t.selected = ctx.selection.selectedId === track.id;
  t.related = isRelated(ctx, track);
  t.points = finite ? projected.points : null;
  t.valid = finite && projected.valid && (geometry.kind !== 'quad' || strictlyConvex(t.points));
  t.precise = t.valid && projected.precise;
  t.visibleFraction = finite ? projected.visibleFraction : null;
  t.offscreen = t.valid && t.visibleFraction === 0;
  t.centroid = finite ? centroidOf(t.points) : null;
  t.stateText = stateTextOf(labels, track, t.visibleFraction);
  t.caption = captionOf(labels, t, geometry);
  t.drawn = drawnOf(ctx, t, geometry);
  const outline = t.drawn === 'outline' ? quadOutline(t.points, settings.markers) : null;
  t.corners = outline === null ? null : outline.corners;
  t.bracket = outline === null ? null : outline.bracket;
  t.badge = t.drawn === 'none' ? null : clampBadge(ctx, badgeAnchor(ctx, t));
  t.chevron = t.drawn === 'edge' ? chevronOf(t.badge, t.centroid) : null;
}

// Projects the live tracks of the applied snapshot into ctx.targets, in slot order.
function projectScene(ctx, pass) {
  const tracks = ctx.cleared || ctx.snapshot === null ? []
    : ctx.snapshot.tracks.slice().sort((a, b) => a.slot - b.slot);
  const targets = new Map();
  for (const track of tracks) {
    const t = ctx.targets.get(track.id) || { id: track.id, cutout: false, margin: null };
    describeTarget(ctx, t, track);
    targets.set(track.id, t);
  }
  ctx.targets = targets;
}

// Shape nodes of one drawn kind in paint order; shapeAttributes writes their geometry.
function buildShapes(ctx, drawn, count) {
  const make = (tag, className) => svgNode(ctx.doc, tag, { class: className });
  if (drawn === 'outline') {
    return [make('path', 'qr-camera-casing'), make('path', 'qr-camera-glow'),
      make('path', 'qr-camera-outline'), make('polygon', 'qr-camera-hit')];
  }
  if (drawn === 'line') {
    return [make('line', 'qr-camera-casing'), make('line', 'qr-camera-outline'),
      make('line', 'qr-camera-hit')];
  }
  const dots = [], hits = [];
  for (let i = 0; drawn === 'points' && i < count; i++) {
    dots.push(make('circle', 'qr-camera-dot'));
    hits.push(make('circle', 'qr-camera-hit'));
  }
  return dots.concat(hits);
}

// Geometry of the shapes: one bracket d for casing, glow and outline; hit strokes 2 x hitSlop.
function shapeAttributes(ctx, t, nodes) {
  const shapes = nodes.shapes, slop = ctx.settings.markers.hitSlop;
  const xy = p => ({ cx: zero(p.x), cy: zero(p.y) });
  if (t.drawn === 'outline') {
    setAttr(shapes[0], 'd', t.bracket);
    setAttrs(shapes[1], { d: t.bracket, filter: `url(#${elementId(ctx, 'glow', t.slot)})` });
    setAttr(shapes[2], 'd', t.bracket);
    setAttrs(shapes[3], { points: t.points.map(p => `${zero(p.x)},${zero(p.y)}`).join(' '),
      'stroke-width': 2 * slop, 'stroke-linejoin': 'round' });
  } else if (t.drawn === 'line') {
    const [a, b] = t.points;
    const ends = { x1: zero(a.x), y1: zero(a.y), x2: zero(b.x), y2: zero(b.y) };
    setAttrs(shapes[0], ends);
    setAttrs(shapes[1], ends);
    setAttrs(shapes[2], Object.assign({ 'stroke-width': 2 * slop, 'stroke-linecap': 'round' },
      ends));
  } else if (t.drawn === 'points') {
    const count = t.points.length;
    t.points.forEach((p, i) => {
      setAttrs(shapes[i], Object.assign(xy(p), { r: DOT_RADIUS }));
      setAttrs(shapes[count + i], Object.assign(xy(p), { r: slop }));
    });
  }
}

// The numbered badge (disc, hit circle, numeral) with the chevron of an edge hint, last in g.
function drawBadge(ctx, t, nodes) {
  if (t.badge === null) {
    if (nodes.badge !== null) nodes.g.removeChild(nodes.badge.g);
    nodes.badge = null;
    return;
  }
  if (nodes.badge === null) {
    const g = svgNode(ctx.doc, 'g', { class: 'qr-camera-badge' });
    nodes.badge = { g, disc: svgNode(ctx.doc, 'circle', { r: BADGE_RADIUS }, g),
      hit: svgNode(ctx.doc, 'circle', { class: 'qr-camera-hit', r: BADGE_HIT }, g),
      text: svgNode(ctx.doc, 'text', { 'text-anchor': 'middle', dy: '0.35em' }, g),
      chevron: null };
  }
  const badge = nodes.badge, numeral = String(t.slot + 1);
  setAttrs(badge.g, { transform: `translate(${t.badge.x} ${t.badge.y})`,
    'data-offscreen': t.drawn === 'edge' ? 'true' : null });
  if (badge.text.textContent !== numeral) badge.text.textContent = numeral;
  setStyle(ctx, badge.text, 'font-size', numeral.length > 2 ? '10px' : null);
  if (t.chevron === null && badge.chevron !== null) {
    badge.g.removeChild(badge.chevron);
    badge.chevron = null;
  } else if (t.chevron !== null) {
    if (badge.chevron === null) {
      badge.chevron = svgNode(ctx.doc, 'path', { class: 'qr-camera-chevron', fill: 'none',
        stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round',
        'stroke-linejoin': 'round' }, badge.g);
    }
    setAttr(badge.chevron, 'd', t.chevron);
    // The numeral's paint as the stylesheet sets it: CanvasText under forced colors, the
    // text color on a hollow monochrome badge, else --qr-target-text.
    const hollow = ctx.settings.colors === 'mono' && !t.selected;
    setStyle(ctx, badge.chevron, 'color', forcedColors(ctx) ? 'CanvasText'
      : hollow ? 'var(--qr-scanner-text,CanvasText)' : 'var(--qr-target-text,#000)');
  }
  if (badge.g.parentNode !== nodes.g) nodes.g.appendChild(badge.g);
}

// The glow filter of an outline in defs: userSpaceOnUse over the bracket's box +/- 12 px. The
// offset corners bound the bracket, so their box is the region (CSS numbers, 4 decimals).
function drawGlowFilter(ctx, t, nodes) {
  if (t.drawn !== 'outline') {
    if (nodes.filter !== null) ctx.defs.removeChild(nodes.filter);
    nodes.filter = null;
    return;
  }
  if (nodes.filter === null) {
    nodes.filter = svgNode(ctx.doc, 'filter', { filterUnits: 'userSpaceOnUse' });
    svgNode(ctx.doc, 'feGaussianBlur', { stdDeviation: 2.5 }, nodes.filter);
  }
  const xs = t.corners.map(c => c.x), ys = t.corners.map(c => c.y);
  const left = Math.min.apply(null, xs), top = Math.min.apply(null, ys);
  setAttrs(nodes.filter, { id: elementId(ctx, 'glow', t.slot),
    x: cssNumber(left - GLOW_MARGIN), y: cssNumber(top - GLOW_MARGIN),
    width: cssNumber(Math.max.apply(null, xs) - left + 2 * GLOW_MARGIN),
    height: cssNumber(Math.max.apply(null, ys) - top + 2 * GLOW_MARGIN) });
  if (nodes.filter.parentNode !== ctx.defs) ctx.defs.appendChild(nodes.filter);
}

// One target group: its data attributes and color, then shapes, badge and glow filter.
function drawTarget(ctx, t, nodes) {
  const { g } = nodes;
  setAttrs(g, { 'data-target-id': t.id, 'data-slot': t.slot, 'data-state': t.state,
    'data-basis': t.basis, 'data-kind': t.kind, 'data-drawn': t.drawn,
    'data-precise': t.precise, 'data-cutout': t.cutout === true, 'data-selected': t.selected,
    'data-related': t.related,
    'data-visible-fraction': t.visibleFraction === null ? null : cssNumber(t.visibleFraction),
    'data-color': t.color });
  setStyle(ctx, g, '--qr-target-color', t.paint.color);
  setStyle(ctx, g, '--qr-target-text', t.paint.text);
  const count = t.points === null ? 0 : t.points.length;
  if (nodes.drawn !== t.drawn || nodes.count !== count) {
    nodes.shapes.forEach(node => g.removeChild(node));
    nodes.shapes = buildShapes(ctx, t.drawn, count);
    const before = nodes.badge === null ? null : nodes.badge.g;
    nodes.shapes.forEach(node => g.insertBefore(node, before));
    nodes.drawn = t.drawn;
    nodes.count = count;
  }
  shapeAttributes(ctx, t, nodes);
  drawBadge(ctx, t, nodes);
  drawGlowFilter(ctx, t, nodes);
}

// Glow opacity on the root: the selected target's, and the others' (0 under focus selected).
function drawGlowOpacity(ctx) {
  const glow = ctx.settings.effects.glow;
  setStyle(ctx, ctx.root, '--qr-camera-glow-selected', cssNumber(glow));
  setStyle(ctx, ctx.root, '--qr-camera-glow-other',
    cssNumber(focusOf(ctx) === 'selected' ? 0 : 0.6 * glow));
}

// Diffs the g.qr-camera-target nodes after ctx.wash in slot order: one per live target while
// the scene is shown (drawn none: an empty group), none otherwise. Writes happen on change only.
function drawScene(ctx, pass) {
  const shown = sceneShown(ctx);
  ctx.sceneNodes.forEach((nodes, id) => {
    if (shown && ctx.targets.has(id)) return;
    for (const node of [nodes.g, nodes.filter]) {
      if (node !== null && node.parentNode !== null) node.parentNode.removeChild(node);
    }
    ctx.sceneNodes.delete(id);
  });
  drawGlowOpacity(ctx);
  if (!shown) return;
  let previous = ctx.wash;
  ctx.targets.forEach(t => {
    let nodes = ctx.sceneNodes.get(t.id);
    if (nodes === undefined) {
      nodes = { g: svgNode(ctx.doc, 'g', { class: 'qr-camera-target' }), drawn: null, count: 0,
        shapes: [], badge: null, filter: null };
      ctx.sceneNodes.set(t.id, nodes);
    }
    drawTarget(ctx, t, nodes);
    if (nodes.g.parentNode !== ctx.scene || nodes.g.previousSibling !== previous) {
      ctx.scene.insertBefore(nodes.g, previous.nextSibling);
    }
    previous = nodes.g;
  });
}

// --------------------------------------------------------------------------------- effects

// ctx.effects: active, eligibleSince, offSince and activations of the state machine, which runs
// on snapshot.now only, and clip, the even-odd region of the included cutouts (null without
// one). planEffects runs between projectScene and drawScene and writes t.cutout and t.margin on
// every target, plus two private fields: lastPrecise (precise at the end of the previous pass)
// and stable (precise in this and the previous accepted frame, and in every pass since).

// Gap (CSS px) two holes keep once their path numbers are rounded to 0.1, which moves each
// boundary by at most 0.05 x sqrt(2) px.
const MIN_GAP = 0.15;
const UNIT_AXES = Object.freeze([Object.freeze({ x: 1, y: 0 }), Object.freeze({ x: 0, y: 1 })]);

// Span of the points projected on a unit axis.
function spanOn(points, axis) {
  let low = Infinity, high = -Infinity;
  for (const p of points) {
    const d = axis.x * p.x + axis.y * p.y;
    if (d < low) low = d;
    if (d > high) high = d;
  }
  return { low, high };
}

// Separating-axis test of two convex quads over the edge normals of both and the x and y axes:
// true when one of them leaves a gap wider than MIN_GAP.
function separated(a, b) {
  const axes = UNIT_AXES.slice();
  for (const quad of [a, b]) {
    quad.forEach((p, i) => {
      const q = quad[(i + 1) % quad.length], length = Math.hypot(q.x - p.x, q.y - p.y);
      if (length > 0) axes.push({ x: (q.y - p.y) / length, y: (p.x - q.x) / length });
    });
  }
  return axes.some(axis => {
    const one = spanOn(a, axis), two = spanOn(b, axis);
    return two.low - one.high > MIN_GAP || one.low - two.high > MIN_GAP;
  });
}

// A cutout candidate: its target and its miter-offset quads by margin, each computed once.
function cutoutCandidate(t, miterLimit) {
  const { quad, sign } = convexQuad(t.points, 'quadRegion');
  const offsets = new Map();
  return { t, margin: null, offsetQuad(margin) {
    if (!offsets.has(margin)) offsets.set(margin, offsetCorners(quad, sign, margin, miterLimit));
    return offsets.get(margin);
  } };
}

// The largest margin at which both offset quads stay separated: the cutout margin itself, else
// the largest multiple of 0.5 below it. A smaller margin only widens the gap.
function pairMargin(a, b, top) {
  const steps = [top];
  for (let k = Math.ceil(top * 2) - 1; k >= 0; k -= 1) steps.push(k / 2);
  for (const margin of steps) {
    if (separated(a.offsetQuad(margin), b.offsetQuad(margin))) return margin;
  }
  return 0;
}

// A target the focus mode selects, tracked, spatial, drawn as a precise outline, and stable.
const cutoutAllowed = (t, focus) => focus !== 'off' && (focus === 'all' || t.selected === true) &&
  t.state === 'tracked' && t.basis === 'spatial' && t.kind === 'quad' && t.drawn === 'outline' &&
  t.precise === true && t.stable === true;

// Cutouts in slot order with their margins and the region, then the state machine.
function planEffects(ctx, pass) {
  const { markers } = ctx.settings;
  const focus = focusOf(ctx), shown = sceneShown(ctx);
  const candidates = [];
  ctx.targets.forEach(t => {
    // A new accepted frame needs precision in the previous one too; any other pass (a time
    // step, a re-layout, a selection) keeps a target stable only while it stays precise.
    t.stable = t.precise === true && (pass.newFrame ? t.lastPrecise === true : t.stable === true);
    t.lastPrecise = t.precise === true;
    t.cutout = false;
    t.margin = null;
    if (shown && cutoutAllowed(t, focus)) candidates.push(cutoutCandidate(t, markers.miterLimit));
  });
  // Even-odd holes of intersecting or touching quads would cancel: both are left out.
  const kept = candidates.filter(c =>
    candidates.every(other => other === c || separated(c.offsetQuad(0), other.offsetQuad(0))));
  kept.forEach(c => { c.margin = markers.cutoutMargin; });
  kept.forEach((c, i) => kept.slice(i + 1).forEach(other => {
    const margin = pairMargin(c, other, markers.cutoutMargin);
    c.margin = Math.min(c.margin, margin);
    other.margin = Math.min(other.margin, margin);
  }));
  const holes = kept.map(c => {
    c.t.cutout = true;
    c.t.margin = c.margin;
    return quadRegion(c.t.points, { margin: c.margin, radius: markers.cutoutRadius,
      miterLimit: markers.miterLimit });
  });
  const view = ctx.resolved;
  ctx.effects.clip = holes.length === 0 ? null : [`M0 0H${cssNumber(view.viewWidth)}` +
    `V${cssNumber(view.viewHeight)}H0Z`].concat(holes).join(' ');
  switchEffects(ctx, holes.length > 0 && eligible(ctx, focus));
}

// Eligibility E once a cutout exists: no content track or result selected, then the focus
// mode's rule: the selected track's cutout (selected), or a cutout on the selected target, if
// any, and on every drawn target in view (all).
function eligible(ctx, focus) {
  const id = ctx.selection.selectedId;
  const selected = id === null ? null : ctx.targets.get(id) || null;
  if (id !== null && (selected === null || selected.basis !== 'spatial')) return false;
  if (focus === 'selected') return selected !== null && selected.cutout === true;
  if (focus !== 'all' || (selected !== null && selected.cutout !== true)) return false;
  return Array.from(ctx.targets.values()).every(t =>
    t.cutout === true || t.drawn === 'none' || !(t.visibleFraction > 0));
}

// Reduced motion: motion 'reduce', or prefers-reduced-motion as the page reports it now. The
// query is made afresh: a kept MediaQueryList may update only at the next rendering step.
function reducedMotion(ctx) {
  if (ctx.settings.motion === 'reduce') return true;
  return typeof ctx.win.matchMedia === 'function' &&
    ctx.win.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
}

// The state machine on snapshot.now: off in the pass where E turns false; on once E has held
// for dwellMs and cooldownMs (doubled under reduced motion) has passed since the last switch-off.
function switchEffects(ctx, eligibleNow) {
  const fx = ctx.effects, timing = ctx.settings.effects;
  const now = ctx.snapshot === null ? null : ctx.snapshot.now;
  if (!eligibleNow || now === null) {
    fx.eligibleSince = null;
    if (fx.active) {
      fx.active = false;
      fx.offSince = now;
    }
    return;
  }
  // A clock that went back (clear(), then another tracker) restarts both waits from now.
  if (fx.eligibleSince === null || now < fx.eligibleSince) fx.eligibleSince = now;
  if (fx.offSince !== null && now < fx.offSince) fx.offSince = now;
  if (fx.active || now - fx.eligibleSince < timing.dwellMs) return;
  if (fx.offSince !== null &&
    now - fx.offSince < timing.cooldownMs * (reducedMotion(ctx) ? 2 : 1)) return;
  fx.active = true;
  fx.offSince = null;
  fx.activations += 1;
}

// The wash takes the selected track's color, else the monochrome highlight.
function washColor(ctx) {
  const id = ctx.selection.selectedId;
  const t = id === null ? undefined : ctx.targets.get(id);
  return (t === undefined ? trackColor(0, 'mono') : t.paint).color;
}

// One region on the scrim, the wash and the blur clip, the effect values, then data-active,
// which the stylesheet turns into display. Every write happens on change only.
function drawEffects(ctx, pass) {
  const { effects, settings } = ctx;
  const clip = effects.clip;
  setAttr(ctx.scrim, 'd', clip);
  setAttr(ctx.wash, 'd', clip);
  setStyle(ctx, ctx.blur, 'clip-path',
    clip === null || !ctx.blurSupported ? null : `path(evenodd, "${clip}")`);
  setStyle(ctx, ctx.scrim, '--qr-camera-dim', cssNumber(settings.effects.dim));
  setStyle(ctx, ctx.wash, '--qr-camera-wash', cssNumber(settings.effects.wash));
  setStyle(ctx, ctx.wash, '--qr-camera-wash-color', washColor(ctx));
  setStyle(ctx, ctx.blur, '--qr-camera-blur', cssPx(settings.effects.blur));
  const active = effects.active ? 'true' : 'false';
  for (const layer of [ctx.blur, ctx.scrim, ctx.wash]) setAttr(layer, 'data-active', active);
}

// ----------------------------------------------------------------------------- interaction

// ctx.selection follows rules 1-5 on every applied snapshot. Explicit input (a tap, Enter,
// Space, a digit, Escape, Previous or Next) goes through selectByInput(), which renders and
// then reveals the entry; select() of the API never scrolls. ctx.focusWithin ('rail',
// 'readout' or null) drives locks.focus and ctx.press drives locks.pointer. The rail and
// readout layer reads both locks (placeholders, fixed order, rail kept displayed), moves focus
// with focusNode() or rescueFocus(), wires Previous and Next to stepSelection(), closes the
// card in closeCard() and reports action outcomes with announceNow(). Entries are selected
// here by one delegated click listener on the toolbar: a .qr-camera-entry carries
// data-target-id or data-result-id, and aria-disabled="true" ignores taps and arrow keys.

// Expiry reasons that decline the neighbors of a vanished manual selection, those that empty
// the declined set, and those whose successors inherit a decline.
const DECLINING_EXPIRY = ['timeout', 'ambiguous', 'superseded', 'capacity'];
const RESETTING_EXPIRY = ['epoch', 'frame_changed', 'reset'];
const SUCCESSOR_EXPIRY = ['ambiguous', 'superseded'];
// Pointer lock (ms): after the release, and at most after the press.
const RELEASE_MS = 500, PRESS_MS = 3000;
const ARROW_STEPS = { ArrowLeft: -1, ArrowRight: 1 };

const isTrackId = id => typeof id === 'string' && id.indexOf('track-') === 0;
const bySlot = (a, b) => a.slot - b.slot;

// The live tracks of the applied snapshot in slot order; none before an update or after clear().
const liveTracks = ctx => (ctx.cleared || ctx.snapshot === null ? []
  : ctx.snapshot.tracks.slice().sort(bySlot));

// Present: listed in snapshot.results (TrackedResult.present says only "decoded recently").
const resultIn = (snapshot, id) => typeof id === 'string' &&
  snapshot.results.some(result => result.id === id);

const expiries = snapshot => (Array.isArray(snapshot.events) ? snapshot.events : [])
  .filter(event => isRecord(event) && event.type === 'expired');

const successorsOf = event => (event !== null && Array.isArray(event.successors)
  ? event.successors : []);

function safely(ctx, run) {
  try {
    run();
  } catch (error) {
    reportError(ctx, error);
  }
}

// An event handler that does nothing after destroy() and reports its errors.
const guard = (ctx, handler) => event => {
  if (!ctx.destroyed) safely(ctx, () => handler(event));
};

// Interaction state: initial at creation and again after destroy().
function resetInteraction(ctx) {
  ctx.focusWithin = null;
  // A pending focus check: { timer, placeholder } (settleLater()).
  ctx.focusSettle = null;
  ctx.followUp = { queued: false, unlock: false };
  ctx.press = { pointers: new Set(), release: null, cap: null, removers: [] };
  ctx.speech = { text: '', repeat: null, selection: { id: null, first: null, timer: null },
    watch: null, states: new Map(), count: { live: 0, spoken: 0, timer: null }, expired: null,
    saturated: false, occurrences: false, batch: null };
}

// Pointer, keyboard and focus listeners on the overlay's own nodes; none on the document.
function attachInteraction(ctx) {
  const { toolbar } = ctx.rail;
  listen(ctx, ctx.scene, 'click', guard(ctx, event => tapScene(ctx, event)));
  listen(ctx, toolbar, 'click', guard(ctx, event => tapEntry(ctx, event)));
  listen(ctx, toolbar, 'pointerdown', guard(ctx, event => pressRail(ctx, event)));
  for (const part of [toolbar, ctx.readout]) {
    listen(ctx, part, 'keydown', guard(ctx, event => pressKey(ctx, event)));
    listen(ctx, part, 'focusin', guard(ctx, event => moveFocus(ctx, event.target, null)));
    listen(ctx, part, 'focusout',
      guard(ctx, event => moveFocus(ctx, event.relatedTarget, event.target)));
  }
  attachReadout(ctx);
}

// Selection rules 1-5 for an applied snapshot (pass.previous to pass.snapshot).
function applySelection(ctx, pass) {
  const s = ctx.selection, snapshot = pass.snapshot;
  const tracks = liveTracks(ctx), live = new Set(tracks.map(track => track.id));
  const events = expiries(snapshot);
  checkFocusLock(ctx);
  // 1. The selected track is gone: held keeps its content, the mode turns automatic.
  if (isTrackId(s.selectedId) && !live.has(s.selectedId)) {
    const id = s.selectedId;
    const event = events.filter(e => e.trackId === id)[0] || null;
    const before = pass.previous === null ? [] : pass.previous.tracks;
    if (s.mode === 'manual') declineAround(s.declined, event, before, tracks);
    const old = before.filter(track => track.id === id)[0] || null;
    const resultId = old === null ? null : old.resultId;
    s.held = resultIn(snapshot, resultId) ? resultId : null;
    s.selectedId = null;
    s.mode = 'auto';
    ctx.speech.expired = old;
  }
  // 2. Successors of declined tracks are declined too; then only live ids stay.
  closeDeclined(s.declined, events);
  s.declined.forEach(id => {
    if (!live.has(id)) s.declined.delete(id);
  });
  // 3. A selected result follows its lowest-slot live track, or ends with its result.
  if (typeof s.selectedId === 'string' && !isTrackId(s.selectedId)) {
    const id = s.selectedId;
    const first = tracks.filter(track => track.resultId === id)[0];
    if (!resultIn(snapshot, id)) {
      s.selectedId = null;
      s.held = null;
      s.mode = 'auto';
    } else if (first !== undefined) s.selectedId = first.id;
  }
  // 4. The automatic choice, then 5. a held result that left the results.
  autoSelect(ctx, false);
  if (s.held !== null && !resultIn(snapshot, s.held)) s.held = null;
}

// Rule 1 in manual mode: the ids of the last applied snapshot and the event's successors are
// declined, plus every new id when the reason is unknown (successors may be among them); an
// epoch, frame change or reset empties the set instead.
function declineAround(declined, event, before, tracks) {
  const reason = event === null ? null : event.reason;
  if (RESETTING_EXPIRY.includes(reason)) {
    declined.clear();
    return;
  }
  const known = new Set(before.map(track => track.id));
  known.forEach(id => declined.add(id));
  successorsOf(event).forEach(id => declined.add(id));
  if (!DECLINING_EXPIRY.includes(reason)) {
    tracks.forEach(track => {
      if (!known.has(track.id)) declined.add(track.id);
    });
  }
}

// Rule 2: successors of declined tracks that expired as ambiguous or superseded, to a fixpoint.
function closeDeclined(declined, events) {
  let grown = true;
  while (grown) {
    grown = false;
    for (const event of events) {
      if (!declined.has(event.trackId) || !SUCCESSOR_EXPIRY.includes(event.reason)) continue;
      for (const id of successorsOf(event)) {
        if (!declined.has(id)) {
          declined.add(id);
          grown = true;
        }
      }
    }
  }
}

// focusout never fires for a focused node that leaves the document, and a focusout across
// trees may leave the lock to a later check: the focus lock is checked against the active
// element of each part's tree scope before a snapshot uses it.
function checkFocusLock(ctx) {
  if (!ctx.selection.locks.focus) return;
  ctx.focusWithin = activePart(ctx);
  if (ctx.focusWithin === null) ctx.selection.locks.focus = false;
}

// Rule 4 on the last snapshot, in automatic mode only. Under the pointer or focus lock (unless
// ignoreLocks, for explicit input) it keeps a present track and never switches to another.
function autoSelect(ctx, ignoreLocks) {
  const s = ctx.selection;
  if (s.mode !== 'auto') return;
  const tracks = liveTracks(ctx);
  const current = tracks.filter(track => track.id === s.selectedId)[0] || null;
  if (current !== null && current.state !== 'lost') return;
  if (ignoreLocks || !(s.locks.pointer || s.locks.focus)) {
    const free = tracks.filter(track => !s.declined.has(track.id));
    const tracked = basis => free.filter(track => track.state === 'tracked' &&
      track.basis === basis)[0];
    const pick = (s.held === null ? undefined
      : free.filter(track => track.resultId === s.held)[0]) ||
      tracked('spatial') || tracked('content');
    if (pick !== undefined) {
      s.selectedId = pick.id;
      s.held = null;
      return;
    }
  }
  if (current === null) s.selectedId = null;
}

// A live TrackId, or a present ResultId (moved to its lowest-slot live track when it has one),
// becomes the manual selection and held is cleared; false for any other id.
function selectId(ctx, id) {
  if (typeof id !== 'string' || ctx.cleared || ctx.snapshot === null) return false;
  const tracks = liveTracks(ctx);
  let chosen = tracks.some(track => track.id === id) ? id : null;
  if (chosen === null && !isTrackId(id) && resultIn(ctx.snapshot, id)) {
    const first = tracks.filter(track => track.resultId === id)[0];
    chosen = first === undefined ? id : first.id;
  }
  if (chosen === null) return false;
  const s = ctx.selection;
  s.mode = 'manual';
  s.selectedId = chosen;
  s.held = null;
  return true;
}

// Automatic mode with nothing selected, held or declined, then one automatic choice.
function resetSelection(ctx) {
  const { selection } = ctx;
  selection.mode = 'auto';
  selection.selectedId = null;
  selection.held = null;
  selection.declined.clear();
  autoSelect(ctx, true);
  return true;
}

// Explicit input: the selection, a render pass, then the entry revealed in the rail.
function selectByInput(ctx, id) {
  if (!selectId(ctx, id)) return false;
  renderPass(ctx, passOf(ctx, 'input'));
  revealEntry(ctx, entryNode(ctx, ctx.selection.selectedId));
  return true;
}

// Previous (-1) or Next (+1) in slot order, without wrapping. Without a selected track, Next
// takes the first live track and Previous the last.
function stepSelection(ctx, delta) {
  const tracks = liveTracks(ctx);
  const at = tracks.map(track => track.id).indexOf(ctx.selection.selectedId);
  const next = at === -1 ? (delta > 0 ? 0 : tracks.length - 1) : at + delta;
  if (next < 0 || next >= tracks.length || next === at) return false;
  return selectByInput(ctx, tracks[next].id);
}

const entryIdOf = el => el.getAttribute('data-target-id') || el.getAttribute('data-result-id');
const disabledEntry = el => el.getAttribute('aria-disabled') === 'true';
const railEntries = ctx =>
  Array.prototype.slice.call(ctx.rail.group.querySelectorAll('.qr-camera-entry'));

// The rail entry of a TrackId or a ResultId, or null.
function entryNode(ctx, id) {
  if (typeof id !== 'string') return null;
  return railEntries(ctx).filter(el => entryIdOf(el) === id)[0] || null;
}

// The entry around a node, when it belongs to this rail.
function entryOf(ctx, node) {
  const el = node !== null && node !== undefined && typeof node.closest === 'function'
    ? node.closest('.qr-camera-entry') : null;
  return el !== null && ctx.rail.group.contains(el) ? el : null;
}

// The rail scrolls itself to show an entry, with its padding as margin; scrollIntoView() is
// never used, so no ancestor and no page scrolls. offsetLeft ignores the rail's own scroll.
function revealEntry(ctx, el) {
  const rail = ctx.rail.toolbar;
  if (el === null || rail.hidden || el.offsetParent === null || !(rail.clientWidth > 0)) return;
  let left;
  if (el.offsetParent === rail) left = el.offsetLeft;
  else if (el.offsetParent === rail.offsetParent) {
    left = el.offsetLeft - rail.offsetLeft - rail.clientLeft;
  } else {
    const a = el.getBoundingClientRect(), b = rail.getBoundingClientRect();
    left = a.left - b.left - rail.clientLeft + rail.scrollLeft;
  }
  const style = ctx.win.getComputedStyle(rail);
  const before = parseFloat(style.paddingLeft) || 0, after = parseFloat(style.paddingRight) || 0;
  const right = left + el.offsetWidth, view = rail.scrollLeft, width = rail.clientWidth;
  let target = null;
  if (left - before < view) target = left - before;
  else if (right + after > view + width) target = right + after - width;
  if (target === null) return;
  try {
    rail.scrollTo({ left: target, behavior: 'instant' });
  } catch (error) {
    rail.scrollLeft = target;
  }
}

// Focus moves never scroll an ancestor.
function focusNode(ctx, el) {
  if (el !== null && el !== undefined && typeof el.focus === 'function') {
    el.focus({ preventScroll: true });
  }
}

// Before a focused readout control goes: focus moves to the first connected, shown and enabled
// candidate (More or Less, then Details), else to the readout region (tabindex -1).
function rescueFocus(ctx, candidates) {
  const usable = el => el !== null && el !== undefined && el.isConnected === true &&
    !el.hidden && el.disabled !== true;
  focusNode(ctx, candidates.filter(usable)[0] || ctx.readout);
}

// 'rail', 'readout' or null for a node.
function partOf(ctx, node) {
  if (node === null || node === undefined || typeof node.nodeType !== 'number') return null;
  if (ctx.rail.toolbar.contains(node)) return 'rail';
  return ctx.readout.contains(node) ? 'readout' : null;
}

// The part holding the focused element, looked up in each part's own tree scope, or null.
const activePart = ctx => (focusInside(ctx.rail.toolbar) !== null ? 'rail'
  : focusInside(ctx.readout) !== null ? 'readout' : null);

// Whether a focusout's related target may stand for a part: none at all, or the host of a
// shadow tree that holds a part (a related target inside it is retargeted to that host).
function mayHidePart(ctx, node) {
  if (node === null || node === undefined) return true;
  return [ctx.rail.toolbar, ctx.readout].some(part => {
    for (let scope = rootNodeOf(part); scope && scope.host; scope = rootNodeOf(scope.host)) {
      if (scope.host === node) return true;
    }
    return false;
  });
}

// The rail's one tab stop: the focused entry while focus is in the rail, else the checked
// usable entry, else the first usable one. Returns the usable entries in rail order.
function setRovingStop(ctx, focused) {
  const entries = railEntries(ctx), usable = entries.filter(el => !disabledEntry(el));
  const stop = focused || usable.filter(el => el.getAttribute('aria-checked') === 'true')[0] ||
    usable[0] || null;
  entries.forEach(el => setAttr(el, 'tabindex', el === stop ? '0' : '-1'));
  return usable;
}

// focusin (node: its target) and focusout (node: the next focused node, left: the node that
// lost focus) keep ctx.focusWithin, the focus lock and the rail's tab stop. Taking the lock
// renders nothing: a mousedown may be focusing, and a node rewritten under it loses the click.
// The end of the lock runs rule 4 and renders; so does focus leaving a placeholder. When the
// next node may be a part in another tree, the lock holds until focus has settled: a focusin
// on a part keeps it, settleFocus() ends it otherwise.
function moveFocus(ctx, node, left) {
  const s = ctx.selection, was = s.locks.focus, part = partOf(ctx, node);
  const leaving = left !== null && left !== undefined;
  const placeholder = leaving && typeof left.getAttribute === 'function' && disabledEntry(left);
  if (leaving && part === null && mayHidePart(ctx, node)) {
    ctx.focusWithin = null;
    setRovingStop(ctx, null);
    if (was || placeholder) settleLater(ctx, placeholder);
    return;
  }
  ctx.focusWithin = part;
  s.locks.focus = part !== null;
  const entry = part === 'rail' ? entryOf(ctx, node) : null;
  if (part !== 'rail' || entry !== null) setRovingStop(ctx, entry);
  if ((was && !s.locks.focus) || placeholder) followUp(ctx, was && !s.locks.focus);
}

// One check on the clock once the focus events of this move have run; a later deferral
// replaces it and keeps its placeholder render.
function settleLater(ctx, placeholder) {
  const pending = ctx.focusSettle;
  const entry = { timer: null, placeholder: placeholder || (pending !== null &&
    pending.placeholder) };
  if (pending !== null) clearTimer(ctx, pending.timer);
  ctx.focusSettle = entry;
  entry.timer = setTimer(ctx, () => safely(ctx, () => {
    if (ctx.focusSettle === entry) ctx.focusSettle = null;
    settleFocus(ctx, entry.placeholder);
  }), 0);
}

// The lock and focusWithin follow the focused element; its end runs rule 4 and renders.
function settleFocus(ctx, placeholder) {
  const s = ctx.selection, was = s.locks.focus, part = activePart(ctx);
  ctx.focusWithin = part;
  s.locks.focus = part !== null;
  if (part !== 'rail') setRovingStop(ctx, null);
  if ((was && !s.locks.focus) || placeholder) followUp(ctx, was && !s.locks.focus);
}

const microtask = run => (typeof queueMicrotask === 'function' ? queueMicrotask(run)
  : Promise.resolve().then(run));

// One render pass after a lock change: at once, or once the running pass has ended (a focus
// move made by a pass never renders inside it).
function followUp(ctx, unlocked) {
  const state = ctx.followUp;
  if (unlocked) state.unlock = true;
  if (ctx.passDepth === 0) {
    runFollowUp(ctx);
    return;
  }
  if (state.queued) return;
  state.queued = true;
  microtask(() => {
    state.queued = false;
    if (!ctx.destroyed) safely(ctx, () => runFollowUp(ctx));
  });
}

function runFollowUp(ctx) {
  const unlock = ctx.followUp.unlock;
  ctx.followUp.unlock = false;
  if (unlock) autoSelect(ctx, false);
  renderPass(ctx, passOf(ctx, 'input'));
}

// Pointer lock: from a pointerdown in the rail until 500 ms after the last pressed pointer is
// released or cancelled, and at most 3 s after the latest press. Window capture listeners see
// a release anywhere; there is no pointer capture, so a press released outside an entry does
// not click it.
function pressRail(ctx, event) {
  const press = ctx.press;
  press.pointers.add(event.pointerId);
  clearTimer(ctx, press.release);
  clearTimer(ctx, press.cap);
  press.release = null;
  press.cap = setTimer(ctx, () => safely(ctx, () => unlockPointer(ctx)), PRESS_MS);
  if (press.removers.length === 0) {
    const release = guard(ctx, up => releasePointer(ctx, up));
    press.removers = [listen(ctx, ctx.win, 'pointerup', release, true),
      listen(ctx, ctx.win, 'pointercancel', release, true)];
  }
  ctx.selection.locks.pointer = true;
}

function releasePointer(ctx, event) {
  const press = ctx.press;
  if (!press.pointers.delete(event.pointerId) || press.pointers.size > 0) return;
  clearTimer(ctx, press.release);
  press.release = setTimer(ctx, () => safely(ctx, () => unlockPointer(ctx)), RELEASE_MS);
}

// Ends the lock: timers and window listeners go, rule 4 runs, the rail renders in slot order.
function unlockPointer(ctx) {
  const press = ctx.press;
  clearTimer(ctx, press.release);
  clearTimer(ctx, press.cap);
  press.removers.forEach(remove => remove());
  ctx.press = { pointers: new Set(), release: null, cap: null, removers: [] };
  if (!ctx.selection.locks.pointer) return;
  ctx.selection.locks.pointer = false;
  followUp(ctx, true);
}

// Keys inside the rail and the readout. Arrows (mirrored in RTL), Home and End move focus
// between entries without wrapping; Enter and Space check an entry; 1-9 select the live track
// numbered N; Escape closes the card, else returns to automatic selection when the mode is
// manual or a track is declined, and is otherwise left to the page.
function pressKey(ctx, event) {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey ||
    event.altKey) return;
  const key = event.key, entry = entryOf(ctx, event.target);
  let handled = false;
  if (entry !== null && (hasOwn(ARROW_STEPS, key) || key === 'Home' || key === 'End')) {
    focusEntry(ctx, entry, key);
    handled = true;
  } else if (entry !== null && (key === 'Enter' || key === ' ')) {
    if (!disabledEntry(entry)) selectByInput(ctx, entryIdOf(entry));
    handled = true;
  } else if (/^[1-9]$/.test(key)) {
    const track = liveTracks(ctx).filter(item => item.slot === Number(key) - 1)[0];
    handled = track !== undefined && selectByInput(ctx, track.id);
  } else if (key === 'Escape') {
    handled = escapeSelection(ctx);
    if (handled) event.stopPropagation();
  }
  if (handled) event.preventDefault();
}

function escapeSelection(ctx) {
  if (closeCard(ctx)) return true;
  const s = ctx.selection;
  if (s.mode !== 'manual' && s.declined.size === 0) return false;
  resetSelection(ctx);
  renderPass(ctx, passOf(ctx, 'input'));
  return true;
}

// Focus moves to the next usable entry in the key's direction, or the first or last one, and
// the tab stop moves with it; the selection and the readout stay as they are.
function focusEntry(ctx, entry, key) {
  const entries = railEntries(ctx);
  const usable = entries.filter(el => !disabledEntry(el) && !el.hidden);
  let next = null;
  if (key === 'Home' || key === 'End') {
    next = usable[key === 'Home' ? 0 : usable.length - 1] || null;
  } else {
    const rtl = ctx.win.getComputedStyle(ctx.rail.toolbar).direction === 'rtl';
    const step = ARROW_STEPS[key] * (rtl ? -1 : 1);
    for (let i = entries.indexOf(entry) + step; i >= 0 && i < entries.length; i += step) {
      if (usable.includes(entries[i])) {
        next = entries[i];
        break;
      }
    }
  }
  if (next === null || next === entry) return;
  focusNode(ctx, next);
  if (focusInside(ctx.rail.group) === next) setRovingStop(ctx, next);
  revealEntry(ctx, next);
}

// A tap on an entry checks it; a placeholder ignores it.
function tapEntry(ctx, event) {
  const entry = entryOf(ctx, event.target);
  if (entry === null || disabledEntry(entry)) return;
  const id = entryIdOf(entry);
  if (id !== null) selectByInput(ctx, id);
}

// The scene's one delegated click: the client point in view px through the inverse screen CTM
// (scale and mirroring included), then the target under it.
function tapScene(ctx, event) {
  if (!sceneShown(ctx)) return;
  const point = scenePoint(ctx, event.clientX, event.clientY);
  const t = point === null ? null : pickTarget(ctx, point);
  if (t !== null) selectByInput(ctx, t.id);
}

function scenePoint(ctx, x, y) {
  const ctm = typeof ctx.scene.getScreenCTM === 'function' ? ctx.scene.getScreenCTM() : null;
  if (ctm === null) return null;
  let m;
  try {
    m = ctm.inverse();
  } catch (error) {
    return null;
  }
  const p = { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  return finitePoint(p) ? p : null;
}

// Badge hit circles first (edge hints included), then the smallest-area outline quad that
// contains the point, then the nearest marker within hitSlop; ties go to the lower slot.
function pickTarget(ctx, p) {
  const targets = Array.from(ctx.targets.values()).sort(bySlot);
  const badge = targets.filter(t => t.badge !== null &&
    Math.hypot(p.x - t.badge.x, p.y - t.badge.y) <= BADGE_HIT)[0];
  if (badge !== undefined) return badge;
  let best = null, least = Infinity;
  for (const t of targets) {
    const area = t.drawn === 'outline' && insideConvex(t.points, p)
      ? Math.abs(doubleArea(t.points)) : Infinity;
    if (area < least) {
      best = t;
      least = area;
    }
  }
  if (best !== null) return best;
  for (const t of targets) {
    const gap = markerDistance(t, p);
    if (gap <= ctx.settings.markers.hitSlop && gap < least) {
      best = t;
      least = gap;
    }
  }
  return best;
}

// Inside or on a convex polygon of either winding.
function insideConvex(points, p) {
  let positive = false, negative = false;
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross > 0) positive = true;
    else if (cross < 0) negative = true;
  });
  return !(positive && negative);
}

function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const k = length > 0
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - a.x - k * dx, p.y - a.y - k * dy);
}

// Distance to a drawn marker: an outline's edges, a scan line or the nearest dot.
function markerDistance(t, p) {
  const points = t.points;
  if (t.drawn === 'line') return segmentDistance(p, points[0], points[1]);
  if (t.drawn === 'outline') {
    return Math.min.apply(null, points.map((a, i) =>
      segmentDistance(p, a, points[(i + 1) % points.length])));
  }
  if (t.drawn === 'points') {
    return Math.min.apply(null, points.map(a => Math.hypot(p.x - a.x, p.y - a.y)));
  }
  return Infinity;
}

// Announcer (ms): the selection wait and its cap, one state per target, the count debounce.
const SELECTION_MS = 250, SELECTION_CAP_MS = 1000, STATE_MS = 3000, COUNT_MS = 1000;
const PREVIEW_POINTS = 48;

// Announcements due after a pass, through ctx.announcer and setTimer(): saturation notes, the
// selected track's expiry, the selection, its state words and the count. ctx.speech holds the
// last text, the pending timers, the watched state and one record per target ({ until, timer,
// spoken, expiry }: no state announcement before until, the last state words spoken). The
// texts a pass speaks are collected in ctx.speech.batch and written once, joined, so a later
// one never replaces an earlier one before it is heard.
function announce(ctx, pass) {
  if (ctx.destroyed) return;
  const sp = ctx.speech, outer = sp.batch !== null;
  if (!outer) sp.batch = [];
  safely(ctx, () => {
    announceSaturation(ctx);
    announceExpiry(ctx);
    announceSelection(ctx);
    announceState(ctx);
    announceCount(ctx);
    ctx.speech.states.forEach((record, id) => {
      if (!ctx.targets.has(id) && record.timer === null && record.expiry === null) {
        ctx.speech.states.delete(id);
      }
    });
  });
  // A nested pass leaves the writing to the outer one; destroy() replaced ctx.speech.
  if (outer || ctx.destroyed || ctx.speech !== sp) return;
  const texts = sp.batch;
  sp.batch = null;
  if (texts.length > 0) say(ctx, texts.join(' · '));
}

// Only consecutive identical texts are dropped; during a pass the text is collected.
function speak(ctx, text) {
  const sp = ctx.speech, batch = sp.batch;
  if (typeof text !== 'string' || text === '') return;
  const last = batch !== null && batch.length > 0 ? batch[batch.length - 1] : sp.text;
  if (text === last) return;
  if (batch !== null) batch.push(text);
  else say(ctx, text);
}

function say(ctx, text) {
  const sp = ctx.speech;
  if (text === sp.text) return;
  clearTimer(ctx, sp.repeat);
  sp.repeat = null;
  sp.text = text;
  ctx.announcer.textContent = text;
}

// An action outcome (Copied, Copy failed, a destination outcome): spoken at once and never
// deduplicated. A repeat clears the text and sets it again on the next clock turn.
function announceNow(ctx, text) {
  if (ctx.destroyed || typeof text !== 'string' || text === '') return;
  const sp = ctx.speech, el = ctx.announcer;
  clearTimer(ctx, sp.repeat);
  sp.repeat = null;
  sp.text = text;
  if (el.textContent !== text) {
    el.textContent = text;
    return;
  }
  el.textContent = '';
  sp.repeat = setTimer(ctx, () => {
    sp.repeat = null;
    el.textContent = text;
  }, 0);
}

// Each saturation note once per episode of its flags.
function announceSaturation(ctx) {
  const sp = ctx.speech;
  const flags = ctx.cleared || ctx.snapshot === null ? null : ctx.snapshot.saturated;
  const flag = name => isRecord(flags) && flags[name] === true;
  const saturated = flag('detections') || flag('observations') || flag('tracks');
  const occurrences = flag('occurrences');
  if (saturated && !sp.saturated) speak(ctx, ctx.labels.saturated);
  if (occurrences && !sp.occurrences) speak(ctx, ctx.labels.saturatedOccurrences);
  sp.saturated = saturated;
  sp.occurrences = occurrences;
}

// Symbology and kind labels of a detection, as the readout names them.
function spokenLabels(labels, detection) {
  const symbology = isRecord(detection) && typeof detection.symbology === 'string'
    ? detection.symbology : null;
  const payload = isRecord(detection) ? detection.payload : null;
  const kind = isRecord(payload) && typeof payload.kind === 'string' ? payload.kind : null;
  const symbologyLabel = symbology === null ? null : own(labels.symbologies, symbology);
  const kindLabel = kind === null ? null : own(labels.kinds, kind);
  return { symbology: typeof symbologyLabel === 'string' ? symbologyLabel : symbology,
    kind: typeof kindLabel === 'string' ? kindLabel : kind === null ? null : labels.kinds.text };
}

const spokenEntry = (target, names, state, preview) => Object.freeze({ target,
  symbology: names.symbology, kind: names.kind, state, preview });

// A target's entry: its name, its labels and the given state words, with the preview only
// for a selection under announceContent 'preview'.
function targetEntry(ctx, track, state, preview) {
  return spokenEntry(ctx.labels.target(track, track.slot),
    spokenLabels(ctx.labels, track.detection), state, preview ? previewOf(ctx) : null);
}

function previewOf(ctx) {
  if (ctx.settings.announceContent !== 'preview') return null;
  const subject = readoutSubject(ctx);
  const text = isRecord(subject) && isRecord(subject.content) ? subject.content.text : null;
  return typeof text === 'string' ? previewText(text) : null;
}

// The first 48 code points, chips by name: an escape reads as its name, a break as a space.
function previewText(text) {
  const head = Array.from(text).slice(0, PREVIEW_POINTS).join('');
  return segmentText(head).map(segment => (segment.type === 'text' ? segment.text
    : segment.type === 'escape' ? ` ${segment.name} ` : ' ')).join('')
    .replace(/ {2,}/g, ' ').trim();
}

// The selection as spoken: a target, a retained result (it has no name), or none.
function selectionEntry(ctx) {
  const id = ctx.selection.selectedId;
  const t = id === null ? undefined : ctx.targets.get(id);
  if (t !== undefined) return targetEntry(ctx, t.track, t.stateText, true);
  const result = isTrackId(id) ? null : resultById(ctx, id);
  if (result !== null) {
    return spokenEntry('', spokenLabels(ctx.labels, result.detection),
      ctx.labels.states.notRecent, previewOf(ctx));
  }
  return spokenEntry(null, { symbology: null, kind: null }, null, null);
}

// A selection change is spoken 250 ms after the last change, at most 1000 ms after the first
// pending one; state changes never restart this wait.
function announceSelection(ctx) {
  const pending = ctx.speech.selection, id = ctx.selection.selectedId;
  if (id === pending.id) return;
  pending.id = id;
  const now = ctx.clock.now();
  if (pending.first === null) pending.first = now;
  clearTimer(ctx, pending.timer);
  const at = Math.min(now + SELECTION_MS, pending.first + SELECTION_CAP_MS);
  pending.timer = setTimer(ctx, () => safely(ctx, () => flushSelection(ctx)),
    Math.max(0, at - now));
}

function flushSelection(ctx) {
  const pending = ctx.speech.selection;
  pending.timer = null;
  pending.first = null;
  const entry = selectionEntry(ctx), id = ctx.selection.selectedId;
  speak(ctx, ctx.labels.announce(entry));
  if (entry.state !== null && ctx.targets.has(id)) stateRecord(ctx, id).spoken = entry.state;
}

function stateRecord(ctx, id) {
  let record = ctx.speech.states.get(id);
  if (record === undefined) {
    record = { until: -Infinity, timer: null, spoken: null, expiry: null };
    ctx.speech.states.set(id, record);
  }
  return record;
}

// Lost and In view of the selected target. Held never changes the words, so it is never
// spoken; a change while a selection announcement waits is part of that announcement.
function announceState(ctx) {
  const sp = ctx.speech, id = ctx.selection.selectedId;
  const t = id === null ? undefined : ctx.targets.get(id);
  if (t === undefined) {
    sp.watch = null;
    return;
  }
  if (sp.watch === null || sp.watch.id !== id) {
    sp.watch = { id, state: t.stateText };
    return;
  }
  if (t.stateText === sp.watch.state) return;
  sp.watch.state = t.stateText;
  if (sp.selection.timer === null && spokenState(ctx, t.stateText)) requestState(ctx, id);
}

const spokenState = (ctx, state) => state === ctx.labels.states.lost ||
  state === ctx.labels.states.inView;

// The selected track expired in this pass: its name with the words that follow, Still read
// as ... while its content has live tracks, else Not read recently.
function announceExpiry(ctx) {
  const old = ctx.speech.expired, { labels } = ctx;
  ctx.speech.expired = null;
  if (old === null || ctx.snapshot === null) return;
  const others = old.resultId === null ? []
    : liveTracks(ctx).filter(track => track.resultId === old.resultId);
  const state = others.length > 0
    ? labels.stillReadAs(others.map(track => labels.target(track, track.slot)))
    : labels.states.notRecent;
  stateRecord(ctx, old.id).expiry = targetEntry(ctx, old, state, false);
  requestState(ctx, old.id);
}

// At most one state announcement per target per 3 s; within the window, the latest state is
// spoken when it ends.
function requestState(ctx, id) {
  const record = stateRecord(ctx, id), now = ctx.clock.now();
  if (now >= record.until) {
    flushState(ctx, id);
  } else if (record.timer === null) {
    record.timer = setTimer(ctx, () => safely(ctx, () => {
      record.timer = null;
      flushState(ctx, id);
    }), record.until - now);
  }
}

// The pending expiry, else the target's words while it is still selected; spoken only when
// they differ from the last words spoken for that target.
function flushState(ctx, id) {
  const record = stateRecord(ctx, id), t = ctx.targets.get(id);
  let entry = record.expiry;
  record.expiry = null;
  if (entry === null && t !== undefined && ctx.selection.selectedId === id &&
    ctx.speech.selection.timer === null && spokenState(ctx, t.stateText)) {
    entry = targetEntry(ctx, t.track, t.stateText, false);
  }
  if (entry === null || entry.state === record.spoken) return;
  speak(ctx, ctx.labels.announce(entry));
  record.spoken = entry.state;
  record.until = ctx.clock.now() + STATE_MS;
}

// labels.count(n) for the live tracks, 1000 ms after the last change.
function announceCount(ctx) {
  const count = ctx.speech.count, live = ctx.targets.size;
  if (live === count.live) return;
  count.live = live;
  clearTimer(ctx, count.timer);
  count.timer = setTimer(ctx, () => safely(ctx, () => {
    count.timer = null;
    if (count.live === count.spoken) return;
    count.spoken = count.live;
    speak(ctx, ctx.labels.count(count.live));
  }), COUNT_MS);
}

// ------------------------------------------------------------------------ rail and readout

// ctx.railView: entry records by TrackId or ResultId, the Earlier divider and whether the
// toolbar is displayed. ctx.readoutView: the readout's persistent nodes, built on first use.
// ctx.readoutState: the in-video card, Details, copy statuses, the cached description and the
// description and slot last written (rendered, slot), which the actions use.
// ctx.dest: the destination binding. Writes happen on change only; decoded text only ever
// becomes text nodes, chips and breaks.

const CHECK_GLYPH = '✓';
// Code points of the bar's first line; the card shows the whole content.
const LINE_POINTS = 256;
const STATUS_MS = 2000;
const TIME_OPTIONS = Object.freeze({ hour: 'numeric', minute: '2-digit', second: '2-digit' });
const SETTLED = ['resolved', 'failed', 'canceled', 'unavailable'];

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

// The focused element of node's tree scope when it lies inside node, else null.
function focusInside(node) {
  const scope = rootNodeOf(node);
  const active = scope && scope.activeElement ? scope.activeElement : null;
  return active !== null && node.contains(active) ? active : null;
}

const headPoints = (text, count) => Array.from(text.slice(0, 2 * count)).slice(0, count)
  .join('');

const contentText = detection => (isRecord(detection) && isRecord(detection.content) &&
  typeof detection.content.text === 'string' ? detection.content.text : '');

const formatOf = (labels, detection) => spokenLabels(labels, detection).symbology || '';

// An escaped character as a named chip; data-text keeps the exact character.
function chipNode(ctx, text, codePoint, name) {
  const chip = htmlNode(ctx.doc, 'span', { class: 'qr-camera-escape', role: 'img',
    'aria-label': String(ctx.labels.character(name, codePoint)), 'data-text': text });
  chip.textContent = name;
  return chip;
}

// Text nodes, chips and breaks (a chip per character when inline), never markup.
function appendSegments(ctx, parent, text, inline) {
  for (const segment of segmentText(text)) {
    if (segment.type === 'text') {
      parent.appendChild(ctx.doc.createTextNode(segment.text));
    } else if (segment.type === 'escape') {
      parent.appendChild(chipNode(ctx, segment.text, segment.codePoint, segment.name));
    } else if (!inline) {
      parent.appendChild(htmlNode(ctx.doc, 'br', { 'data-text': segment.text }));
    } else {
      for (const character of segment.text) {
        const codePoint = character.codePointAt(0);
        parent.appendChild(chipNode(ctx, character, codePoint, characterName(codePoint)));
      }
    }
  }
}

// The children of el, rebuilt by fill(el) only when key or the label table changes.
function rebuild(ctx, el, key, fill) {
  const last = ctx.texts.get(el);
  if (last !== undefined && last.key === key && last.labels === ctx.labels) return;
  ctx.texts.set(el, { key, labels: ctx.labels });
  if (el.firstChild !== null) el.textContent = '';
  fill(el);
}

// Decoded text of an element, rebuilt only when the text or the label table changes.
function setSegments(ctx, el, text, inline) {
  rebuild(ctx, el, text, () => appendSegments(ctx, el, text, inline));
}

// Children in the given order with few moves; with keepOrder, nodes already there keep their
// relative order and new ones are appended. Other children are removed. The anchor (a focused
// child) never moves, since moving a node blurs it: the others are placed around it.
function arrangeChildren(parent, nodes, keepOrder, anchor) {
  let order = nodes;
  if (keepOrder) {
    const present = Array.prototype.filter.call(parent.childNodes,
      node => nodes.indexOf(node) !== -1);
    order = present.concat(nodes.filter(node => present.indexOf(node) === -1));
  }
  Array.prototype.slice.call(parent.childNodes).forEach(node => {
    if (order.indexOf(node) === -1) parent.removeChild(node);
  });
  const at = anchor && anchor.parentNode === parent ? order.indexOf(anchor) : -1;
  if (at === -1) {
    placeRun(parent, order, parent.firstChild);
    return;
  }
  placeRun(parent, order.slice(0, at), parent.firstChild);
  placeRun(parent, order.slice(at + 1), anchor.nextSibling);
}

// Puts nodes in order starting at ref, moving only those out of place.
function placeRun(parent, nodes, ref) {
  let next = ref;
  for (const node of nodes) {
    if (node === next) next = next.nextSibling;
    else parent.insertBefore(node, next);
  }
}

// Index in order just after the nearest earlier sibling of node that order holds, else 0.
function placeIndex(node, order) {
  for (let sibling = node.previousSibling; sibling !== null; sibling = sibling.previousSibling) {
    const at = order.indexOf(sibling);
    if (at !== -1) return at + 1;
  }
  return 0;
}

// The readout is displayed for a subject, or while focus is inside it (then with labels.none).
const readoutShown = ctx => ctx.settings.readout &&
  (readoutSubject(ctx) !== null || ctx.focusWithin === 'readout');

const cardOpen = ctx => !ctx.parts.readout.mounted && ctx.readoutState.card &&
  readoutShown(ctx);

// Live tracks in slot order, then (retained on) results without a live track, newest first.
function railModel(ctx) {
  const results = !ctx.settings.retained || ctx.cleared || ctx.snapshot === null ? []
    : ctx.snapshot.results.filter(result => isRecord(result) &&
      Array.isArray(result.trackIds) && result.trackIds.length === 0);
  const seen = result => (typeof result.lastObservedAt === 'number' ? result.lastObservedAt
    : -Infinity);
  results.sort((a, b) => (seen(b) - seen(a)) || 0);
  return { tracks: liveTracks(ctx), results };
}

// The visibility table over L live tracks and E entries; focus inside keeps the rail. In
// video it shows in the regular arrangement only, and never under the open card.
function railDisplayed(ctx, live, total) {
  if (ctx.focusWithin === 'rail') return true;
  if (!ctx.parts.rail.mounted && (ctx.arrangement !== 'regular' || cardOpen(ctx))) return false;
  const mode = ctx.settings.rail;
  if (mode === 'auto') return live >= 2 || (total >= 1 && ctx.selection.selectedId === null);
  if (mode === 'multiple') return live >= 2;
  return mode === 'always' && total >= 1;
}

// One radio per id, kept across updates; a retained entry has no number and no color.
function entryRecord(ctx, id, kind) {
  let rec = ctx.railView.nodes.get(id);
  if (rec !== undefined) return rec;
  const { doc } = ctx;
  const el = htmlNode(doc, 'button', { type: 'button', class: 'qr-camera-entry', role: 'radio',
    [kind === 'track' ? 'data-target-id' : 'data-result-id']: id, tabindex: '-1' });
  rec = { id, kind, el, thumb: null,
    number: kind === 'track' ? htmlNode(doc, 'span', { class: 'qr-camera-number' }, el) : null,
    format: htmlNode(doc, 'span', { class: 'qr-camera-format' }, el),
    check: htmlNode(doc, 'span', { class: 'qr-camera-check', 'aria-hidden': 'true' }, el),
    caption: htmlNode(doc, 'span', { class: 'qr-camera-caption',
      id: elementId(ctx, 'caption', id), hidden: '' }, el),
    preview: htmlNode(doc, 'span', { class: 'qr-camera-preview', lang: '', dir: 'auto',
      id: elementId(ctx, 'preview', id) }, el) };
  rec.check.textContent = CHECK_GLYPH;
  ctx.railView.nodes.set(id, rec);
  return rec;
}

// Caption (hidden when null), preview and thumbnail; the description is the caption, then
// the preview.
function entryText(ctx, rec, caption, detection) {
  setText(rec.caption, caption === null ? '' : caption);
  setAttr(rec.caption, 'hidden', caption === null ? '' : null);
  setAttr(rec.el, 'aria-describedby', caption === null ? rec.preview.id
    : `${rec.caption.id} ${rec.preview.id}`);
  setSegments(ctx, rec.preview, headPoints(contentText(detection), PREVIEW_POINTS), true);
  // The thumbnail layer's crop canvas for this entry id (ctx.frames.crops) goes first.
  const crop = ctx.frames.crops.get(rec.id);
  const canvas = isRecord(crop) && crop.canvas ? crop.canvas : null;
  const { el } = rec;
  if (rec.thumb !== null && rec.thumb !== canvas && rec.thumb.parentNode === el) {
    el.removeChild(rec.thumb);
  }
  rec.thumb = canvas;
  if (canvas !== null && el.firstChild !== canvas) el.insertBefore(canvas, el.firstChild);
}

function liveEntry(ctx, track) {
  const t = ctx.targets.get(track.id), rec = entryRecord(ctx, track.id, 'track');
  const format = formatOf(ctx.labels, track.detection);
  setAttrs(rec.el, { 'data-slot': track.slot, 'data-state': track.state,
    'data-basis': track.basis, 'data-precise': t.precise, 'data-color': t.color,
    'data-related': t.related, 'aria-checked': ctx.selection.selectedId === track.id,
    'aria-disabled': null,
    'aria-label': `${String(ctx.labels.target(track, track.slot))}, ${format}`,
    'aria-keyshortcuts': track.slot < 9 ? String(track.slot + 1) : null });
  setStyle(ctx, rec.el, '--qr-target-color', t.paint.color);
  setStyle(ctx, rec.el, '--qr-target-text', t.paint.text);
  setText(rec.number, String(track.slot + 1));
  setText(rec.format, format);
  entryText(ctx, rec, t.caption, track.detection);
  return rec;
}

function retainedEntry(ctx, result) {
  const rec = entryRecord(ctx, result.id, 'result');
  const format = formatOf(ctx.labels, result.detection), state = ctx.labels.states.notRecent;
  setAttrs(rec.el, { 'data-state': 'retained', 'aria-disabled': null,
    'aria-checked': ctx.selection.selectedId === result.id, 'aria-label': `${format}, ${state}` });
  setText(rec.format, format);
  entryText(ctx, rec, state, result.detection);
  return rec;
}

// Entries (rail order in ctx.entries), placeholders, the single tab stop, the Earlier divider,
// the saturation note and the toolbar's visibility. Under the pointer lock, nodes keep their
// order (new ones are appended) and never move. Otherwise the canonical order applies (live
// entries in slot order, the divider, retained results); the focused entry never moves, the
// others are placed around it, and a focused placeholder stays after the node before it.
function renderRail(ctx, pass) {
  const view = ctx.railView, s = ctx.selection;
  const { tracks, results } = railModel(ctx);
  const focused = entryOf(ctx, focusInside(ctx.rail.group));
  const wanted = new Set(), canonical = [];
  tracks.forEach(track => {
    wanted.add(track.id);
    canonical.push(liveEntry(ctx, track).el);
  });
  const earlier = results.map(result => {
    wanted.add(result.id);
    return retainedEntry(ctx, result).el;
  });
  // A vanished entry stays as a placeholder under the pointer lock or while it has focus.
  const kept = [];
  view.nodes.forEach((rec, id) => {
    if (wanted.has(id)) return;
    if (s.locks.pointer || rec.el === focused) {
      setAttrs(rec.el, { 'aria-disabled': 'true', 'data-state': 'expired', 'aria-checked': false,
        'aria-keyshortcuts': null });
      kept.push(rec);
    } else view.nodes.delete(id);
  });
  if (earlier.length > 0 || kept.some(rec => rec.kind === 'result')) {
    if (view.divider === null) {
      view.divider = htmlNode(ctx.doc, 'span', { class: 'qr-camera-divider',
        'aria-hidden': 'true' });
    }
    setText(view.divider, ctx.labels.earlier);
    canonical.push(view.divider);
  }
  let order = canonical.concat(earlier);
  if (s.locks.pointer) order = order.concat(kept.map(rec => rec.el));
  else if (focused !== null && order.indexOf(focused) === -1) {
    const at = placeIndex(focused, order);
    order = order.slice(0, at).concat([focused], order.slice(at));
  }
  arrangeChildren(ctx.rail.group, order, s.locks.pointer, focused);
  const usable = setRovingStop(ctx, focused);
  ctx.entries = usable.map(entryIdOf);
  view.shown = railDisplayed(ctx, tracks.length, usable.length);
  setAttr(ctx.rail.toolbar, 'hidden', view.shown ? null : '');
  const flags = ctx.cleared || ctx.snapshot === null ? null : ctx.snapshot.saturated;
  const flag = name => isRecord(flags) && flags[name] === true;
  const notes = [];
  if (flag('detections') || flag('observations') || flag('tracks')) {
    notes.push(ctx.labels.saturated);
  }
  if (flag('occurrences')) notes.push(ctx.labels.saturatedOccurrences);
  setText(ctx.rail.note, notes.join(' · '));
  setAttr(ctx.rail.note, 'hidden', notes.length > 0 ? null : '');
}

const show = (el, on) => setAttr(el, 'hidden', on ? null : '');

// A section that does not apply is detached rather than hidden; it returns before ref.
function attach(parent, el, on, ref) {
  if (on && el.parentNode !== parent) parent.insertBefore(el, ref);
  else if (!on && el.parentNode === parent) parent.removeChild(el);
}

// Bar text that gives way first: one ellipsized line.
const SQUEEZED = [['min-width', '0'], ['overflow', 'hidden'], ['text-overflow', 'ellipsis'],
  ['white-space', 'nowrap']];

function squeeze(ctx, el, on) {
  SQUEEZED.forEach(([name, value]) => setStyle(ctx, el, name, on ? value : null));
}

// Previous or Next: a 44 x 44 icon button named by aria-label.
function navButton(ctx, parent, path) {
  const button = htmlNode(ctx.doc, 'button', { type: 'button', tabindex: '0' }, parent);
  const icon = svgNode(ctx.doc, 'svg', { viewBox: '0 0 16 16', width: 16, height: 16,
    'aria-hidden': 'true', focusable: 'false' }, button);
  svgNode(ctx.doc, 'path', { d: path, fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, icon);
  setStyle(ctx, button, 'padding', '0');
  return button;
}

// The readout's persistent nodes, in section order; More exists in video only. Optional
// buttons (Open, Check, Copy, Copy bytes) are attached only while they apply.
function readoutNodes(ctx) {
  if (ctx.readoutView !== null) return ctx.readoutView;
  const { doc } = ctx;
  const node = (tag, className, parent, attributes) =>
    htmlNode(doc, tag, Object.assign({ class: className }, attributes), parent);
  const button = (className, parent) => node('button', className, parent,
    { type: 'button', tabindex: '0' });
  const exact = { lang: '', dir: 'ltr' };
  const head = node('header', 'qr-camera-head');
  const v = { head, none: node('span', 'qr-camera-meta', head),
    number: node('span', 'qr-camera-number', head), name: node('span', 'qr-camera-name', head),
    format: node('span', 'qr-camera-format', head),
    family: node('span', 'qr-camera-family', head), kind: node('span', 'qr-camera-kind', head),
    state: node('span', 'qr-camera-state', head),
    line: node('span', 'qr-camera-line', head, { lang: '', dir: 'auto' }),
    nav: node('div', 'qr-camera-nav', head, { role: 'group' }) };
  v.previous = navButton(ctx, v.nav, 'M10 3L5 8l5 5');
  v.position = node('span', 'qr-camera-meta', v.nav);
  v.next = navButton(ctx, v.nav, 'M6 3l5 5-5 5');
  v.more = ctx.parts.readout.mounted ? null : button('qr-camera-more', head);
  v.content = node('p', 'qr-camera-content', null, { lang: '', dir: 'auto' });
  v.incomplete = node('p', 'qr-camera-incomplete');
  v.url = node('div', 'qr-camera-url');
  const row = () => node('div', null, v.url);
  const urlRow = row(), hostRow = row();
  v.urlLabel = node('span', 'qr-camera-meta', urlRow);
  urlRow.appendChild(doc.createTextNode(' '));
  v.urlText = node('bdi', 'qr-camera-url-text', urlRow, exact);
  v.hostLabel = node('span', 'qr-camera-meta', hostRow);
  hostRow.appendChild(doc.createTextNode(' '));
  v.host = node('span', 'qr-camera-host', hostRow, exact);
  v.slot = node('div', 'qr-camera-destination');
  v.fieldsTitle = node('p', 'qr-camera-fields-title');
  v.fields = node('dl', 'qr-camera-fields');
  v.issuesTitle = node('p', 'qr-camera-fields-title');
  // Engine strings, verbatim: not in the label table's language.
  v.issues = node('ul', 'qr-camera-issues', null, { lang: '' });
  v.actions = node('div', 'qr-camera-actions');
  v.open = button('qr-camera-open');
  // The stylesheet shows .qr-camera-check only inside a checked entry.
  v.check = button('qr-camera-check');
  setStyle(ctx, v.check, 'display', 'inline-block');
  setStyle(ctx, v.check, 'font-weight', 'inherit');
  v.copy = button('qr-camera-copy');
  v.copyStatus = node('span', 'qr-camera-meta');
  v.expand = button('qr-camera-expand', v.actions);
  v.details = node('div', 'qr-camera-details');
  v.facts = node('dl', 'qr-camera-fields', v.details);
  v.bytesRow = node('div', 'qr-camera-actions', v.details);
  v.copyBytes = button('qr-camera-copy-bytes');
  v.bytesStatus = node('span', 'qr-camera-meta');
  v.same = node('p', 'qr-camera-meta', v.details);
  [head, v.content, v.incomplete, v.url, v.slot, v.fieldsTitle, v.fields, v.issuesTitle,
    v.issues, v.actions, v.details].forEach(el => ctx.readout.appendChild(el));
  [v.number, v.nav, v.more].forEach(el => {
    if (el !== null) setStyle(ctx, el, 'flex-shrink', '0');
  });
  setStyle(ctx, v.nav, 'display', 'flex');
  setStyle(ctx, v.nav, 'align-items', 'center');
  setStyle(ctx, v.nav, 'gap', '8px');
  ctx.readoutView = v;
  return v;
}

// The subject's description, cached per detection and label table. A detection that cannot be
// described is reported once and reads as no subject.
function describedSubject(ctx, subject) {
  const st = ctx.readoutState;
  if (subject === null) return null;
  if (st.subject !== subject || st.labels !== ctx.labels) {
    st.subject = subject;
    st.labels = ctx.labels;
    try {
      st.described = describeWith(subject, ctx.labels);
    } catch (error) {
      st.described = null;
      reportError(ctx, error);
    }
  }
  return st.described;
}

// The state words: the live track's own, Still read as for a held result with live tracks,
// else Not read recently.
function readoutStateText(ctx, track, result) {
  const { labels } = ctx;
  const t = track === null ? undefined : ctx.targets.get(track.id);
  if (t !== undefined) return t.stateText;
  if (track !== null) return labels.states.readNow;
  const live = result === null ? [] : liveTracks(ctx).filter(k => k.resultId === result.id);
  return live.length === 0 ? labels.states.notRecent
    : labels.stillReadAs(live.map(k => labels.target(k, k.slot)));
}

const clipboardOf = ctx => {
  const nav = ctx.win.navigator, clipboard = nav ? nav.clipboard : null;
  return clipboard && typeof clipboard.writeText === 'function' ? clipboard : null;
};

// The first provider exception goes to onError; the slot then reads providerError.
function providerFailed(ctx, error) {
  if (ctx.dest.failed) return;
  ctx.dest.failed = true;
  ctx.destinationsState = 'failed';
  reportError(ctx, error);
}

// Followed redirects, or how much is unknown about them.
function hopsText(L, s) {
  if (Array.isArray(s.redirects)) {
    const followed = typeof s.hopCount === 'number' ? s.hopCount : s.redirects.length;
    return L.hops(followed, s.redirects.length > followed);
  }
  if (s.redirected === false) return L.hops(typeof s.hopCount === 'number' ? s.hopCount : 0, false);
  return L.hopsUnknown(s.redirected === true);
}

const stepLine = (L, step) => {
  const to = typeof step.location === 'string' ? step.location : null;
  return ['step', String(step.url), to, to !== null ? null
    : typeof step.refusedScheme === 'string' ? L.refusedScheme(step.refusedScheme)
      : L.invalidLocation];
};

function requestText(L, s, transport) {
  if (s.requestSent === false) return L.request.none;
  if (s.requestSent !== true) return L.request.maybe;
  return transport !== null && transport.kind === 'fetch' ? L.request.response : L.request.sent;
}

// The settled time as a sentence split around a <time datetime> holding the Intl wall time;
// the label receives that text. null when settledAt is not a valid time.
function timeLine(ctx, s) {
  const L = ctx.labels.destination, at = new Date(s.settledAt);
  if (Number.isNaN(at.getTime())) return null;
  const iso = at.toISOString();
  let text;
  try {
    text = new Intl.DateTimeFormat(ctx.settings.lang, TIME_OPTIONS).format(at);
  } catch (error) {
    // No usable Intl: the valid time as ISO text.
    text = iso;
  }
  const ms = typeof s.durationMs === 'number' ? s.durationMs : 0;
  const words = String(s.state !== 'resolved' ? L.endedAt(text)
    : s.provenance === 'simulated' ? L.exampleAt(text, ms) : L.observedAt(text, ms));
  const mark = words.indexOf(text);
  if (mark === -1) return ['time', '', iso, words, ''];
  return ['time', words.slice(0, mark), iso, text, words.slice(mark + text.length)];
}

// State and reason words of a destination snapshot.
function destinationWords(L, s) {
  const reason = typeof s.reason === 'string' ? s.reason : null;
  const said = reason === null ? undefined : own(L.reasons, reason);
  const state = { unverified: L.unverified, failed: L.failed, canceled: L.canceled,
    unavailable: L.unavailable, resolving: s.startedAt === null ? L.queued : L.resolving,
    resolved: s.provenance === 'simulated' ? L.example : L.observed };
  const label = own(state, s.state);
  return { state: typeof label === 'string' ? label : L.unverified,
    reason: reason === null ? null : typeof said === 'string' ? said : reason };
}

// Lines of a snapshot after the state line: final URL, facts, badge, transport, request, time.
// The badge shows for every attempt, queued or running included (never for network); the
// request line once an attempt has started, since a queued one reads "no request sent".
function snapshotLines(ctx, s, lines) {
  const L = ctx.labels.destination, settled = SETTLED.includes(s.state);
  const started = settled || (s.state === 'resolving' && s.startedAt !== null);
  const transport = isRecord(s.transport) ? s.transport : null;
  if (s.state === 'resolved' && typeof s.finalUrl === 'string') lines.push(['final', s.finalUrl]);
  if (s.state === 'resolved' || s.state === 'failed') {
    if (typeof s.status === 'number') lines.push(['text', L.httpStatus(s.status)]);
    lines.push(['text', `${L.redirects}: ${hopsText(L, s)}`]);
    (Array.isArray(s.redirects) ? s.redirects : []).forEach(step => {
      if (isRecord(step)) lines.push(stepLine(L, step));
    });
  }
  if (typeof s.detail === 'string') lines.push(['detail', L.detail, s.detail]);
  const badge = s.state !== 'unverified' && typeof s.provenance === 'string'
    ? own(L.provenance, s.provenance) : undefined;
  if (typeof badge === 'string') lines.push(['badge', badge]);
  if (s.state !== 'unverified' && transport !== null && typeof transport.label === 'string') {
    lines.push(['meta', transport.label]);
  }
  if (started) lines.push(['text', requestText(L, s, transport)]);
  const time = settled && Number.isFinite(s.settledAt) ? timeLine(ctx, s) : null;
  if (time !== null) lines.push(time);
}

// URL-bearing payloads: url, gs1_digital_link and a me_card with a url. Only they get a
// destination slot; a text read with an unknown charset carries no URL to describe.
function urlBearing(detection) {
  const payload = isRecord(detection) ? detection.payload : null;
  if (!isRecord(payload)) return false;
  return payload.kind === 'url' || payload.kind === 'gs1_digital_link' ||
    (payload.kind === 'me_card' && typeof payload.url === 'string' && payload.url !== '');
}

// The destination slot as plain data, null when hidden: state, data attributes, lines and the
// check button's label key. ctx.dest.shown is the encoded URL whose changes re-render it.
function slotPlan(ctx, candidate, subject) {
  const dest = ctx.dest, provider = ctx.settings.destinations, L = ctx.labels.destination;
  dest.shown = null;
  if (!ctx.settings.destinationSlot || !isRecord(candidate) || candidate.reason === 'no_url' ||
    !urlBearing(subject)) return null;
  const plan = { candidate, state: 'unverified', provenance: null, reason: null, button: null,
    lines: [['meta', L.heading]] };
  const source = typeof candidate.source === 'string' ? own(L.sources, candidate.source) : null;
  if (typeof source === 'string') plan.lines.push(['text', source]);
  if (candidate.eligible !== true) {
    const said = own(L.ineligible, candidate.reason);
    Object.assign(plan, { state: 'ineligible', reason: String(candidate.reason) });
    plan.lines.push(['state', typeof said === 'string' ? said : plan.reason, null]);
    return plan;
  }
  if (candidate.requestUrl !== candidate.encodedUrl) {
    plan.lines.push(['url', L.requestUrl, candidate.requestUrl]);
  }
  let s = null, can = false;
  if (provider !== null && !dest.failed) {
    try {
      s = provider.get(candidate);
      can = provider.canResolve === true;
      dest.shown = candidate.encodedUrl;
    } catch (error) {
      providerFailed(ctx, error);
    }
  }
  if (provider !== null && dest.failed) {
    plan.state = 'provider-error';
    plan.lines.push(['state', L.providerError, null]);
    return plan;
  }
  if (!isRecord(s)) {
    plan.lines.push(['state', L.unverified, null]);
    return plan;
  }
  const base = plan.lines.length;
  try {
    const words = destinationWords(L, s);
    plan.state = s.state === 'resolving' && s.startedAt === null ? 'queued' : String(s.state);
    plan.reason = typeof s.reason === 'string' ? s.reason : null;
    plan.provenance = SETTLED.includes(s.state) && typeof s.provenance === 'string'
      ? s.provenance : null;
    plan.lines.push(['state', words.state, words.reason]);
    snapshotLines(ctx, s, plan.lines);
    if (can && ctx.settings.actions.check) {
      plan.button = s.state === 'unverified' ? 'check' : s.state === 'resolving' ? 'cancel'
        : 'checkAgain';
    }
  } catch (error) {
    // A snapshot that cannot be rendered counts as the provider's first exception: onError
    // once, then providerError, so update() and select() never throw for provider data.
    providerFailed(ctx, error);
    dest.shown = null;
    plan.lines.length = base;
    Object.assign(plan, { state: 'provider-error', provenance: null, reason: null,
      button: null });
    plan.lines.push(['state', L.providerError, null]);
  }
  return plan;
}

// What the readout shows, or null when it is hidden. minimal: the in-video bar of the minimal
// arrangement (number, format and More).
function readoutPlan(ctx) {
  if (!readoutShown(ctx)) return null;
  const st = ctx.readoutState, inVideo = !ctx.parts.readout.mounted, { actions } = ctx.settings;
  const track = selectedTrack(ctx), result = readoutResult(ctx), live = liveTracks(ctx);
  const subject = readoutSubject(ctx), info = describedSubject(ctx, subject);
  const card = !inVideo || st.card, minimal = !card && ctx.arrangement === 'minimal';
  const copy = info !== null && actions.copy && clipboardOf(ctx) !== null;
  const slot = info === null ? null : slotPlan(ctx, info.candidate, subject);
  if (info === null) ctx.dest.shown = null;
  return { info, track, result, live, card, minimal, copy, slot,
    nav: info !== null && !ctx.railView.shown && live.length >= 2 && !minimal,
    more: inVideo && info !== null, open: info !== null && info.url !== null && actions.open,
    check: slot !== null && slot.button !== null, expanded: info !== null && st.expanded,
    held: track === null && result !== null && result.id === ctx.selection.held };
}

// Before a focused readout control goes or is hidden, focus moves to More or Less, then
// Details, else to the readout region: an update never drops it to body.
function keepFocus(ctx, plan) {
  const v = ctx.readoutView, active = focusInside(ctx.readout);
  if (v === null || active === null || active === ctx.readout) return;
  const body = plan !== null && plan.info !== null && plan.card;
  const kept = plan === null ? [] : [plan.more && v.more, plan.nav && v.previous,
    plan.nav && v.next, body && plan.open && v.open, body && plan.check && v.check,
    body && plan.copy && v.copy, body && v.expand,
    body && plan.expanded && plan.copy && v.copyBytes];
  if (kept.indexOf(active) !== -1) return;
  rescueFocus(ctx, [plan !== null && plan.more ? v.more : null, body ? v.expand : null]);
}

function firstLine(text) {
  const end = text.search(/[\r\n]/);
  return headPoints(end === -1 ? text : text.slice(0, end), LINE_POINTS);
}

function writeReadout(ctx, plan) {
  if (plan === null) {
    show(ctx.readout, false);
    return;
  }
  const v = readoutNodes(ctx), { info, track } = plan;
  const t = track === null ? undefined : ctx.targets.get(track.id);
  setAttrs(ctx.readout, { 'data-view': plan.card ? 'card' : 'bar',
    'data-state': track !== null ? track.state : info !== null ? 'retained' : null,
    'data-slot': track === null ? null : track.slot,
    'data-basis': track === null ? null : track.basis,
    'data-precise': t === undefined ? null : t.precise,
    'data-symbology': info === null ? null : info.symbology,
    'data-kind': info === null ? null : info.kind,
    'data-expanded': plan.expanded, 'data-held': plan.held });
  writeHead(ctx, v, plan);
  writeBody(ctx, v, plan);
  show(ctx.readout, true);
}

// Number and name (live track), format, family (card), kind, state, the first line (bar),
// Previous and Next, More or Less. In the bar, labels give way before the buttons.
function writeHead(ctx, v, plan) {
  const { info, track } = plan, L = ctx.labels, some = info !== null, bar = !plan.card;
  const t = track === null ? undefined : ctx.targets.get(track.id);
  setText(v.none, L.none);
  show(v.none, !some);
  if (track !== null) {
    const paint = t === undefined ? trackColor(track.slot, ctx.settings.colors) : t.paint;
    setText(v.number, String(track.slot + 1));
    setStyle(ctx, v.number, '--qr-target-color', paint.color);
    setStyle(ctx, v.number, '--qr-target-text', paint.text);
    setText(v.name, String(L.target(track, track.slot)));
  }
  show(v.number, some && track !== null);
  // The thumbnail layer's copy of the live track's crop, in the card only: the in-video bar
  // keeps its fixed height.
  headThumb(ctx, v, some && track !== null && plan.card ? track : null);
  show(v.name, some && track !== null && plan.card);
  const family = some ? info.familyLabel : null;
  setText(v.format, some ? info.symbologyLabel : '');
  setText(v.family, family === null ? '' : family);
  setText(v.kind, some ? info.kindLabel : '');
  setText(v.state, some ? readoutStateText(ctx, track, plan.result) : '');
  show(v.format, some);
  attach(v.head, v.family, family !== null && plan.card, v.kind);
  show(v.kind, some && !plan.minimal);
  show(v.state, some && !plan.minimal);
  [v.format, v.kind, v.state].forEach(el => squeeze(ctx, el, bar));
  const line = some && bar && !plan.minimal && !plan.nav;
  setSegments(ctx, v.line, line ? firstLine(info.text) : '', true);
  show(v.line, line);
  writeNav(ctx, v, plan);
  if (v.more !== null) {
    setText(v.more, plan.card ? L.less : L.more);
    show(v.more, plan.more);
  }
}

// Previous and Next in slot order, aria-disabled at the ends; the position in the card.
function writeNav(ctx, v, plan) {
  const L = ctx.labels, ids = plan.live.map(k => k.id);
  const at = plan.track === null ? -1 : ids.indexOf(plan.track.id);
  const position = plan.nav && plan.card && at !== -1;
  setAttr(v.nav, 'aria-label', L.choose);
  setAttrs(v.previous, { 'aria-label': L.previous, 'aria-disabled': at === 0 ? 'true' : null });
  setAttrs(v.next, { 'aria-label': L.next,
    'aria-disabled': at !== -1 && at === ids.length - 1 ? 'true' : null });
  setText(v.position, position
    ? L.position(String(L.target(plan.track, plan.track.slot)), at + 1, ids.length) : '');
  show(v.position, position);
  show(v.nav, plan.nav);
}

// Content, the incomplete note, the encoded URL and host, the slot, fields, actions, Details.
function writeBody(ctx, v, plan) {
  const { info } = plan, L = ctx.labels, some = info !== null;
  setSegments(ctx, v.content, some ? info.text : '', false);
  show(v.content, some);
  const incomplete = some && !info.complete;
  setText(v.incomplete, !incomplete ? ''
    : info.eci !== null && info.eci.length === 0 ? L.incompleteEci : L.incomplete);
  show(v.incomplete, incomplete);
  const url = some ? info.url : null;
  setText(v.urlLabel, L.encodedUrl);
  setSegments(ctx, v.urlText, url === null ? '' : url.encoded, false);
  setText(v.hostLabel, L.host);
  setText(v.host, url === null ? '' : url.host);
  show(v.url, url !== null);
  writeSlot(ctx, v, plan.slot);
  writeFields(ctx, v, info);
  writeActions(ctx, v, plan);
  writeDetails(ctx, v, plan);
}

// Parsed fields as dt and dd (values as segments), then the GS1 issues verbatim.
function writeFields(ctx, v, info) {
  const L = ctx.labels, { doc } = ctx;
  const fields = info === null ? [] : info.fields, issues = info === null ? [] : info.issues;
  setText(v.fieldsTitle, L.parsedFields);
  show(v.fieldsTitle, fields.length > 0);
  show(v.fields, fields.length > 0);
  rebuild(ctx, v.fields, JSON.stringify(fields.map(f => [f.label, f.value])), el => {
    fields.forEach(field => {
      htmlNode(doc, 'dt', {}, el).textContent = field.label;
      appendSegments(ctx, htmlNode(doc, 'dd', { lang: '', dir: 'auto' }, el), field.value, false);
    });
  });
  setText(v.issuesTitle, L.issues);
  show(v.issuesTitle, issues.length > 0);
  show(v.issues, issues.length > 0);
  rebuild(ctx, v.issues, JSON.stringify(issues), el => issues.forEach(issue => {
    htmlNode(doc, 'li', {}, el).textContent = issue;
  }));
}

// Open, Check, Copy with its status and Details; a button that does not apply is detached.
function writeActions(ctx, v, plan) {
  const L = ctx.labels, st = ctx.readoutState;
  setText(v.open, L.open);
  setText(v.copy, L.copy);
  setText(v.copyStatus, st.status.copy);
  setText(v.expand, L.details);
  setAttr(v.expand, 'aria-expanded', plan.expanded);
  if (plan.check) setText(v.check, L.destination[plan.slot.button]);
  arrangeChildren(v.actions, [plan.open && v.open, plan.check && v.check, plan.copy && v.copy,
    plan.copy && v.copyStatus, plan.info !== null && v.expand].filter(Boolean), false);
  show(v.actions, plan.info !== null);
}

// Other live tracks of the readout's result, by name, when it has two or more.
function sameContent(ctx, plan) {
  const { result, track } = plan;
  if (result === null || !Array.isArray(result.trackIds) || result.trackIds.length < 2) return [];
  return plan.live.filter(k => k.resultId === result.id && (track === null || k.id !== track.id))
    .map(k => String(ctx.labels.target(k, k.slot)));
}

// Charset, ECI, FNC1 and the bytes as hex, Copy bytes, then the same-content note.
function writeDetails(ctx, v, plan) {
  const { info } = plan, L = ctx.labels, st = ctx.readoutState, { doc } = ctx;
  show(v.details, info !== null);
  if (info === null) return;
  const rows = [[L.charset, info.charset]];
  if (info.eci !== null && info.eci.length === 0) rows.push([L.eci, L.eciUnlocated]);
  (info.eci || []).forEach(entry => rows.push([L.eci, L.eciAt(entry.designator, entry.start)]));
  if (info.fnc1 !== null) {
    const position = own(L.fnc1Positions, info.fnc1);
    rows.push([L.fnc1, typeof position === 'string' ? position : info.fnc1]);
  }
  rows.push([L.bytes, info.bytes, true]);
  rebuild(ctx, v.facts, JSON.stringify(rows), el => rows.forEach(([label, value, bytes]) => {
    htmlNode(doc, 'dt', {}, el).textContent = label;
    const dd = htmlNode(doc, 'dd', {}, el);
    (bytes ? htmlNode(doc, 'code', { class: 'qr-camera-bytes' }, dd) : dd).textContent = value;
  }));
  setText(v.copyBytes, L.copyBytes);
  setText(v.bytesStatus, st.status.bytes);
  arrangeChildren(v.bytesRow, plan.copy ? [v.copyBytes, v.bytesStatus] : [], false);
  show(v.bytesRow, plan.copy);
  const others = sameContent(ctx, plan);
  setText(v.same, others.length > 0 ? L.sameContentAs(others) : '');
  show(v.same, others.length > 0);
}

function writeSlot(ctx, v, slot) {
  attach(ctx.readout, v.slot, slot !== null, v.fieldsTitle);
  if (slot === null) return;
  setAttrs(v.slot, { 'data-destination-state': slot.state, 'data-provenance': slot.provenance,
    'data-reason': slot.reason });
  rebuild(ctx, v.slot, JSON.stringify(slot.lines), el => slot.lines.forEach(line => {
    slotLine(ctx, el, line);
  }));
}

// One slot line, text only: URLs in bdi[dir=ltr][lang=""], never a link or an action.
function slotLine(ctx, parent, [kind, a, b, c, d]) {
  const { doc } = ctx;
  const div = htmlNode(doc, 'div', { class: kind === 'meta' ? 'qr-camera-meta' : null }, parent);
  const text = value => {
    if (value !== '') div.appendChild(doc.createTextNode(value));
  };
  const span = (value, attributes) => {
    htmlNode(doc, 'span', attributes, div).textContent = value;
  };
  const exact = (value, className) => {
    htmlNode(doc, 'bdi', { class: className, dir: 'ltr', lang: '' }, div).textContent = value;
  };
  if (kind === 'meta' || kind === 'text') text(a);
  else if (kind === 'state') {
    span(a, {});
    if (b !== null) text(` · ${b}`);
  } else if (kind === 'badge') span(a, { class: 'qr-camera-provenance' });
  else if (kind === 'final') exact(a, 'qr-camera-final');
  else if (kind === 'url') {
    span(a, { class: 'qr-camera-meta' });
    text(' ');
    exact(b, null);
  } else if (kind === 'step') {
    exact(a, null);
    text(' → ');
    if (b !== null) exact(b, null);
    else text(c);
  } else if (kind === 'detail') {
    text(`${a}: `);
    span(b, { lang: '' });
  } else if (kind === 'time') {
    text(a);
    htmlNode(doc, 'time', { datetime: b }, div).textContent = c;
    text(d);
  }
}

// The ctx.readout section: bar or card, content, URL, destination slot and actions. Focus is
// kept before anything it stands on disappears; writes happen on change only.
function renderReadout(ctx, pass) {
  const plan = readoutPlan(ctx), st = ctx.readoutState;
  // A provider error handler may have destroyed the overlay.
  if (ctx.destroyed) return;
  if (plan === null) {
    st.card = false;
    st.expanded = false;
    ctx.dest.shown = null;
  }
  keepFocus(ctx, plan);
  writeReadout(ctx, plan);
  // Open, Copy and Check act on what was written, never on a newer description.
  st.slot = plan === null ? null : plan.slot;
  st.rendered = plan === null ? null : plan.info;
}

// Escape inside the rail or readout: closes the open in-video card; false when none is open.
function closeCard(ctx) {
  if (!cardOpen(ctx)) return false;
  ctx.readoutState.card = false;
  renderPass(ctx, passOf(ctx, 'input'));
  return true;
}

// An OverlayAction through onAction; defaultPrevented tells whether the consumer took over.
function fireAction(ctx, type, value) {
  let prevented = false;
  const action = Object.freeze({ type, track: selectedTrack(ctx), result: readoutResult(ctx),
    value, get defaultPrevented() { return prevented; },
    preventDefault() { prevented = true; } });
  invoke(ctx, 'onAction', action);
  return action;
}

// The readout's one delegated click: More or Less, Details, Previous and Next, the actions.
function tapReadout(ctx, event) {
  const v = ctx.readoutView, target = event.target, st = ctx.readoutState;
  const button = v === null || !target || typeof target.closest !== 'function' ? null
    : target.closest('button');
  if (button === null || !ctx.readout.contains(button)) return;
  if (button === v.more || button === v.expand) {
    if (button === v.more) st.card = !st.card;
    else st.expanded = !st.expanded;
    renderPass(ctx, passOf(ctx, 'input'));
  } else if (button === v.previous || button === v.next) {
    if (!disabledEntry(button)) stepSelection(ctx, button === v.next ? 1 : -1);
  } else if (button === v.open) openLink(ctx);
  else if (button === v.copy) copyContent(ctx, 'copy');
  else if (button === v.copyBytes) copyContent(ctx, 'bytes');
  else if (button === v.check) checkDestination(ctx);
}

// Never automatic: onAction, then the WHATWG href in a new browsing context without opener.
function openLink(ctx) {
  const info = ctx.readoutState.rendered;
  if (info === null || info.url === null || !ctx.settings.actions.open) return;
  const action = fireAction(ctx, 'open', info.url.encoded);
  if (!action.defaultPrevented && !ctx.destroyed) {
    ctx.win.open(info.url.href, '_blank', 'noopener,noreferrer');
  }
}

// Copy (the exact content) or Copy bytes (the hex): onAction, then the clipboard unless it was
// prevented. A continuation after destroy() or a newer copy does nothing.
function copyContent(ctx, which) {
  const info = ctx.readoutState.rendered, clipboard = clipboardOf(ctx);
  if (info === null) return;
  const value = which === 'copy' ? info.text : info.bytes;
  const action = fireAction(ctx, which === 'copy' ? 'copy' : 'copy-bytes', value);
  if (action.defaultPrevented || ctx.destroyed || clipboard === null) return;
  const token = {};
  ctx.readoutState.tokens[which] = token;
  let written;
  try {
    written = Promise.resolve(clipboard.writeText(value));
  } catch (error) {
    written = Promise.reject(error);
  }
  const settle = ok => {
    if (!ctx.destroyed && ctx.readoutState.tokens[which] === token) {
      safely(ctx, () => copied(ctx, which, ok));
    }
  };
  written.then(() => settle(true), () => settle(false));
}

// Copied or Copy failed beside the button for 2000 ms on the clock, announced at once.
function copied(ctx, which, ok) {
  const st = ctx.readoutState, v = ctx.readoutView, text = ok ? ctx.labels.copied
    : ctx.labels.copyFailed;
  const status = v === null ? null : which === 'copy' ? v.copyStatus : v.bytesStatus;
  clearTimer(ctx, st.timers[which]);
  st.status[which] = text;
  st.timers[which] = setTimer(ctx, () => {
    st.timers[which] = null;
    st.status[which] = '';
    if (status !== null) setText(status, '');
  }, STATUS_MS);
  if (status !== null) setText(status, text);
  announceNow(ctx, text);
}

// Check, Cancel check or Check again as last rendered: onAction, then resolve() without a
// signal (attempts are shared) or cancel(). An attempt started here announces its outcome.
function checkDestination(ctx) {
  const slot = ctx.readoutState.slot, provider = ctx.settings.destinations, dest = ctx.dest;
  if (slot === null || slot.button === null || provider === null || dest.failed) return;
  const cancel = slot.button === 'cancel', { candidate } = slot, generation = dest.generation;
  const action = fireAction(ctx, cancel ? 'cancel' : 'resolve', candidate.encodedUrl);
  // onAction may have taken over, destroyed the overlay or replaced the provider.
  if (action.defaultPrevented || ctx.destroyed || ctx.dest !== dest ||
    dest.generation !== generation) return;
  try {
    const attempt = cancel ? provider.cancel(candidate) : provider.resolve(candidate);
    if (!cancel && attempt !== null && typeof attempt === 'object' &&
      typeof attempt.then === 'function') {
      attempt.then(snapshot => {
        if (!ctx.destroyed && ctx.dest.generation === generation && isRecord(snapshot)) {
          safely(ctx, () => announceOutcome(ctx, snapshot));
        }
      }, () => {});
    }
  } catch (error) {
    providerFailed(ctx, error);
    renderPass(ctx, passOf(ctx, 'destinations'));
  }
}

function announceOutcome(ctx, snapshot) {
  if (!SETTLED.includes(snapshot.state) || snapshot.reason === 'cleared') return;
  const words = destinationWords(ctx.labels.destination, snapshot);
  announceNow(ctx, words.reason === null ? words.state : `${words.state}, ${words.reason}`);
}

// Text nodes as they are; an element with data-text (a chip or a break) as that text.
function exactText(node) {
  let out = '';
  node.childNodes.forEach(child => {
    if (child.nodeType === 3) out += child.nodeValue;
    else if (child.nodeType === 1) {
      out += child.hasAttribute('data-text') ? child.getAttribute('data-text') : exactText(child);
    }
  });
  return out;
}

// A copy of a selection in the content carries the exact characters, not the chip names.
function copySelection(ctx, event) {
  const v = ctx.readoutView, data = event.clipboardData;
  const selection = typeof ctx.win.getSelection === 'function' ? ctx.win.getSelection() : null;
  if (v === null || !data || selection === null || selection.rangeCount === 0) return;
  let text = '', inside = false;
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    if (range.intersectsNode(v.content)) inside = true;
    text += exactText(range.cloneContents());
  }
  if (!inside) return;
  data.setData('text/plain', text);
  event.preventDefault();
}

function attachReadout(ctx) {
  listen(ctx, ctx.readout, 'click', guard(ctx, event => tapReadout(ctx, event)));
  listen(ctx, ctx.readout, 'copy', guard(ctx, event => copySelection(ctx, event)));
}

// One subscription per provider: 'ready' with a verifier, 'none' without one, 'failed' after
// its first exception. A change re-renders only for the shown encoded URL.
function bindDestinations(ctx) {
  const dest = ctx.dest, provider = ctx.settings.destinations;
  dest.generation += 1;
  dest.failed = false;
  dest.unsubscribe = null;
  ctx.destinationsState = provider === null ? 'none' : 'ready';
  if (provider === null) return;
  const generation = dest.generation;
  try {
    const off = provider.subscribe(change => {
      if (!ctx.destroyed && ctx.dest === dest && dest.generation === generation) {
        safely(ctx, () => destinationChanged(ctx, change));
      }
    });
    dest.unsubscribe = typeof off === 'function' ? off : null;
  } catch (error) {
    providerFailed(ctx, error);
  }
}

// Unsubscribes; shared destination attempts are left to the verifier. An exception counts as
// the provider's first one.
function unbindDestinations(ctx) {
  const dest = ctx.dest, off = dest.unsubscribe;
  dest.generation += 1;
  dest.unsubscribe = null;
  dest.shown = null;
  if (off !== null) {
    try {
      off();
    } catch (error) {
      providerFailed(ctx, error);
    }
  }
  ctx.destinationsState = 'none';
}

// A render pass for a change of the shown URL; after the running pass when one is running.
function destinationChanged(ctx, change) {
  const dest = ctx.dest;
  if (dest.failed || dest.shown === null || !isRecord(change) ||
    change.encodedUrl !== dest.shown) return;
  if (ctx.passDepth === 0) {
    renderPass(ctx, passOf(ctx, 'destinations'));
    return;
  }
  if (dest.queued) return;
  dest.queued = true;
  microtask(() => {
    dest.queued = false;
    if (!ctx.destroyed) safely(ctx, () => renderPass(ctx, passOf(ctx, 'destinations')));
  });
}

// The in-video controls are measured again at once when what they show changes, so badges
// clamp above them in this pass; the resize observer follows later changes.
function settleControls(ctx, pass) {
  const r = ctx.reading, view = ctx.readout.getAttribute('data-view');
  if (ctx.controls === null || r === null || !(r.scale > 0) || !ctx.root.isConnected) return;
  const card = view === 'card' && !ctx.readout.hidden;
  const key = [ctx.arrangement, ctx.railView.shown, ctx.readout.hidden, view,
    card ? ctx.selection.selectedId : '', card && ctx.readoutState.expanded].join(' ');
  if (key === ctx.controlsKey) return;
  ctx.controlsKey = key;
  const rect = ctx.controls.getBoundingClientRect();
  const measured = rect.height > 0
    ? (ctx.root.getBoundingClientRect().bottom - rect.top) / r.scale : 0;
  const height = Math.min(r.height, Math.max(0, measured));
  if (height === ctx.controlsHeight) return;
  ctx.controlsHeight = height;
  if (ctx.resolved === null) return;
  ctx.targets.forEach(t => {
    if (t.badge === null) return;
    t.badge = clampBadge(ctx, badgeAnchor(ctx, t));
    t.chevron = t.drawn === 'edge' ? chevronOf(t.badge, t.centroid) : null;
  });
  drawScene(ctx, pass);
}

// ------------------------------------------------------------------------------ thumbnails

// ctx.frames.pending: { image, key } or null, the one copy waiting for its update; key is
// { epoch (null: whatever epoch that update has), sequence (null when absent), observedAt }.
// ctx.frames.crops: a live TrackId or a retained ResultId -> { canvas, context, resultId, slot,
// at, serial, css }, where at is the clock time of the copy, serial orders copies of one time
// and css is the [width, height] CSS size. ctx.frames.askedAt: clock time of the last true
// wantsFrameImage(). The rail shows a crop through entryText(); the readout header shows a
// copy of the live subject's crop (ctx.frames.head) through writeHead(). Crops are never
// mirrored: they show the pixels the decoder read.

// Live crops (TRACKER_LIMITS.tracks), retained crops, and the margin share of the longer side.
const LIVE_CROPS = 64, RETAINED_CROPS = 16, CROP_MARGIN = 0.12;
// Frame px from normalized points, without float noise before floor and ceil.
const framePx = v => Math.round(v * 1e6) / 1e6;
const typeTag = value => Object.prototype.toString.call(value);
const isFrameBitmap = image => typeTag(image) === '[object ImageBitmap]';
const isFrameData = image => typeTag(image) === '[object ImageData]';
const sequenceOf = frame => (typeof frame.sequence === 'number' ? frame.sequence : null);

// Tracked spatial quads of a snapshot whose measured quad has four finite points.
const croppable = snapshot => snapshot.tracks.filter(track => isRecord(track) &&
  track.state === 'tracked' && track.basis === 'spatial' && isRecord(track.geometry) &&
  track.geometry.kind === 'quad' && Array.isArray(track.geometry.measured) &&
  track.geometry.measured.length === 4 && track.geometry.measured.every(finitePoint));

// True when thumbnails are on, no copy is pending, refreshMs have passed since the last true
// answer, and a tracked quad of the last snapshot has no crop or one older than refreshMs.
// After a destroyed snapshot no frame can be accepted, so no copy is asked for.
function wantsFrame(ctx) {
  const f = ctx.frames, { enabled, refreshMs } = ctx.settings.thumbnails, last = ctx.snapshot;
  if (!enabled || f.pending !== null || ctx.cleared || last === null ||
    last.status === 'destroyed') return false;
  const now = ctx.clock.now();
  // A clock that went back counts as time passed, so pacing never sticks.
  const waited = since => since === null || now < since || now - since >= refreshMs;
  if (!waited(f.askedAt)) return false;
  const due = croppable(last).some(track => {
    const crop = f.crops.get(track.id);
    return crop === undefined || waited(crop.at);
  });
  if (due) f.askedAt = now;
  return due;
}

// The normalized key of a FrameImageFrame: the given epoch or the last applied one (none after
// clear()), the sequence or null, observedAt.
function frameKey(ctx, frame) {
  if (!isRecord(frame) || frame.observedAt === undefined) {
    throw new TypeError('setFrameImage() needs the frame { width, height, observedAt, epoch, ' +
      'sequence } of the pixels about to be scanned.');
  }
  const given = value => value !== undefined && value !== null;
  const positive = value => typeof value === 'number' && value > 0 && Number.isFinite(value);
  if (!positive(frame.width) || !positive(frame.height) || !Number.isFinite(frame.observedAt) ||
    (given(frame.epoch) && !Number.isFinite(frame.epoch)) ||
    (given(frame.sequence) && !Number.isFinite(frame.sequence))) {
    throw new RangeError('setFrameImage() needs a finite positive frame width and height, a ' +
      'finite observedAt, and a finite epoch and sequence when given.');
  }
  const epoch = given(frame.epoch) ? frame.epoch
    : ctx.ordering === null ? null : ctx.ordering.epoch;
  return Object.freeze({ epoch, sequence: given(frame.sequence) ? frame.sequence : null,
    observedAt: frame.observedAt });
}

// Validates, then keeps the image as the one pending copy; a replaced bitmap is closed. A
// rejected bitmap is closed too, and with thumbnails off the image is released at once.
function takeFrameImage(ctx, image, frame) {
  if (!isFrameData(image) && !isFrameBitmap(image)) {
    throw new TypeError('setFrameImage() takes an ImageData or an ImageBitmap; for a canvas ' +
      'pass createImageBitmap(canvas), since a canvas can be redrawn before its update.');
  }
  let key;
  try {
    key = frameKey(ctx, frame);
    if (image.width !== frame.width || image.height !== frame.height) {
      throw new RangeError(`setFrameImage(): the image is ${image.width} x ${image.height} but ` +
        `the frame is ${frame.width} x ${frame.height}.`);
    }
  } catch (error) {
    closeBitmap(image);
    throw error;
  }
  const f = ctx.frames, previous = f.pending;
  if (!ctx.settings.thumbnails.enabled) {
    closeBitmap(image);
    return;
  }
  f.pending = { image, key };
  if (previous !== null && previous.image !== image) closeBitmap(previous.image);
}

const sameFrameKey = (key, frame) => (key.epoch === null || key.epoch === frame.epoch) &&
  key.sequence === sequenceOf(frame) && key.observedAt === frame.observedAt;

// An accepted frame after the key, in the order of the snapshot ordering rule.
function newerFrame(frame, key) {
  if (key.epoch !== null && frame.epoch !== key.epoch) return frame.epoch > key.epoch;
  const sequence = sequenceOf(frame);
  if (sequence !== null && key.sequence !== null) return sequence > key.sequence;
  return frame.observedAt > key.observedAt;
}

// Every applied update: crops follow their tracks, then a pending copy whose key matches the
// accepted frame crops the tracked quads measured in it and is released. A copy that can no
// longer match (a newer frame, a destroyed snapshot) is released without a crop; a snapshot
// before the first accepted frame leaves it pending.
function matchFrameImage(ctx, pass) {
  const snapshot = pass.snapshot, f = ctx.frames;
  if (snapshot === null) return;
  retainCrops(ctx, snapshot);
  const pending = f.pending, frame = snapshot.frame, ended = snapshot.status === 'destroyed';
  if (pending === null || (!ended && !isRecord(frame))) return;
  const matched = !ended && sameFrameKey(pending.key, frame);
  if (!matched && !ended && !newerFrame(frame, pending.key)) return;
  f.pending = null;
  if (matched) safely(ctx, () => cropFrame(ctx, snapshot, pending.image));
  closeBitmap(pending.image);
}

// The aspect-preserving crop of a measured quad: its box plus 12 % of the longer side, out to
// whole pixels and clamped to the frame. The device size never exceeds the source size.
function cropBox(points, width, height, target) {
  const xs = points.map(p => framePx(p.x * width)), ys = points.map(p => framePx(p.y * height));
  const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
  const pad = CROP_MARGIN * Math.max(maxX - minX, maxY - minY);
  const sx = Math.max(0, Math.floor(framePx(minX - pad)));
  const sy = Math.max(0, Math.floor(framePx(minY - pad)));
  const sw = Math.min(width, Math.ceil(framePx(maxX + pad))) - sx;
  const sh = Math.min(height, Math.ceil(framePx(maxY + pad))) - sy;
  if (!(sw > 0 && sh > 0)) return null;
  const scale = Math.min(1, target / Math.max(sw, sh));
  return { sx, sy, sw, sh, dw: Math.max(1, Math.round(sw * scale)),
    dh: Math.max(1, Math.round(sh * scale)) };
}

// A crop canvas with its 2D context, or null (a canvas without one keeps no pixels).
function newCrop(ctx) {
  const canvas = htmlNode(ctx.doc, 'canvas', { class: 'qr-camera-thumb', 'aria-hidden': 'true' });
  let context = null;
  try {
    context = canvas.getContext('2d');
  } finally {
    if (context === null) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
  if (context === null) return null;
  setStyle(ctx, canvas, 'flex-shrink', '0');
  return { canvas, context, resultId: null, slot: 0, at: 0, serial: 0, css: null };
}

// Draws one crop: a bitmap through its source rectangle; ImageData as its sub-rectangle, put
// 1:1 or through a crop-sized scratch canvas and drawn scaled. CSS size = device size / DPR.
function paintCrop(ctx, crop, image, box, ratio, scratch) {
  const { canvas, context } = crop, { sx, sy, sw, sh, dw, dh } = box;
  if (canvas.width !== dw || canvas.height !== dh) {
    canvas.width = dw;
    canvas.height = dh;
  } else context.clearRect(0, 0, dw, dh);
  crop.css = [cssPx(dw / ratio), cssPx(dh / ratio)];
  setStyle(ctx, canvas, 'width', crop.css[0]);
  setStyle(ctx, canvas, 'height', crop.css[1]);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (isFrameBitmap(image)) {
    context.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
    return;
  }
  if (dw === sw && dh === sh) {
    context.putImageData(image, -sx, -sy, sx, sy, sw, sh);
    return;
  }
  if (scratch.canvas === null) {
    scratch.canvas = ctx.doc.createElement('canvas');
    scratch.context = scratch.canvas.getContext('2d');
  }
  if (scratch.context === null) throw new TypeError('A 2D canvas context is unavailable.');
  scratch.canvas.width = sw;
  scratch.canvas.height = sh;
  scratch.context.putImageData(image, -sx, -sy, sx, sy, sw, sh);
  context.drawImage(scratch.canvas, 0, 0, sw, sh, 0, 0, dw, dh);
}

// Crops, from the copy of this frame, every tracked quad measured in it (refreshing an existing
// crop in place); at most LIVE_CROPS live crops. A crop that fails to draw is dropped.
function cropFrame(ctx, snapshot, image) {
  // A bitmap its owner closed has no pixels left to crop.
  if (isFrameBitmap(image) && !(image.width > 0 && image.height > 0)) return;
  // Engines differ on a detached buffer (an exception or a blank draw): never a blank crop.
  if (isFrameData(image) && !(image.data.length >= image.width * image.height * 4)) {
    throw new TypeError('setFrameImage(): the ImageData buffer was detached before its update; ' +
      'pass a copy of the pixels.');
  }
  const f = ctx.frames, crops = f.crops, now = ctx.clock.now();
  const dpr = Number(ctx.win.devicePixelRatio);
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const target = ctx.settings.thumbnails.size * ratio;
  let live = 0;
  crops.forEach((crop, id) => { if (isTrackId(id)) live += 1; });
  const scratch = { canvas: null, context: null };
  try {
    for (const track of croppable(snapshot)) {
      const geometry = track.geometry;
      if (geometry.observedAt !== snapshot.frame.observedAt) continue;
      const known = crops.get(track.id);
      if (known === undefined && live >= LIVE_CROPS) continue;
      const box = cropBox(geometry.measured, image.width, image.height, target);
      const crop = box === null ? null : known === undefined ? newCrop(ctx) : known;
      if (crop === null) continue;
      try {
        paintCrop(ctx, crop, image, box, ratio, scratch);
      } catch (error) {
        if (known !== undefined) crops.delete(track.id);
        evictCrop(crop);
        throw error;
      }
      if (known === undefined) {
        crops.set(track.id, crop);
        live += 1;
      }
      f.serial += 1;
      Object.assign(crop, { resultId: typeof track.resultId === 'string' ? track.resultId : null,
        slot: track.slot, at: now, serial: f.serial });
    }
  } finally {
    if (scratch.canvas !== null) {
      scratch.canvas.width = 0;
      scratch.canvas.height = 0;
    }
  }
}

// Newer copy first; for copies of one time, the lower slot.
const preferredCrop = (a, b) => (a.at !== b.at ? a.at > b.at : a.slot < b.slot);
const olderCrop = (a, b) => (a.at !== b.at ? a.at < b.at : a.serial < b.serial);

// Crops follow their tracks: the crop of a track that left the snapshot moves to its result
// (one crop per result, the preferred one), a retained crop goes with its result, and retained
// crops beyond RETAINED_CROPS are evicted oldest first.
function retainCrops(ctx, snapshot) {
  const crops = ctx.frames.crops;
  if (crops.size === 0) return;
  const tracks = new Map(), results = new Set(), moved = [];
  snapshot.tracks.forEach(track => { if (isRecord(track)) tracks.set(track.id, track); });
  snapshot.results.forEach(result => { if (isRecord(result)) results.add(result.id); });
  crops.forEach((crop, id) => {
    const track = isTrackId(id) ? tracks.get(id) : undefined;
    if (track !== undefined) {
      crop.resultId = typeof track.resultId === 'string' ? track.resultId : null;
      crop.slot = track.slot;
    } else if (isTrackId(id) || !results.has(id)) {
      crops.delete(id);
      if (isTrackId(id)) moved.push(crop);
      else evictCrop(crop);
    }
  });
  moved.forEach(crop => {
    const holder = results.has(crop.resultId) ? crops.get(crop.resultId) : null;
    if (holder === null || (holder !== undefined && !preferredCrop(crop, holder))) {
      evictCrop(crop);
      return;
    }
    if (holder !== undefined) evictCrop(holder);
    crops.set(crop.resultId, crop);
  });
  let retained = 0;
  crops.forEach((crop, id) => { if (!isTrackId(id)) retained += 1; });
  for (; retained > RETAINED_CROPS; retained -= 1) {
    let oldest = null;
    crops.forEach((crop, id) => {
      if (!isTrackId(id) && (oldest === null || olderCrop(crop, oldest.crop))) {
        oldest = { id, crop };
      }
    });
    crops.delete(oldest.id);
    evictCrop(oldest.crop);
  }
}

// An evicted crop keeps no pixels and leaves the rail.
function evictCrop(crop) {
  const { canvas } = crop;
  canvas.width = 0;
  canvas.height = 0;
  if (canvas.parentNode !== null) canvas.parentNode.removeChild(canvas);
}

// The overlay closes every ImageBitmap it receives.
function closeBitmap(image) {
  if (isFrameBitmap(image) && typeof image.close === 'function') image.close();
}

function clearCrops(ctx) {
  ctx.frames.crops.forEach(evictCrop);
  ctx.frames.crops.clear();
}

// The readout header's copy of the live subject's crop, before the number (a canvas has one
// place in the tree, and the rail entry keeps the crop). Drawn again only when the crop or its
// copy changes; released when no crop applies. track: the live subject, or null.
function headThumb(ctx, v, track) {
  const f = ctx.frames, crop = track === null ? undefined : f.crops.get(track.id);
  if (crop === undefined || crop.css === null || !(crop.canvas.width > 0)) {
    releaseHead(ctx);
    return;
  }
  if (f.head === null) {
    const made = newCrop(ctx);
    if (made === null) return;
    f.head = { canvas: made.canvas, context: made.context, crop: null, serial: 0 };
  }
  const head = f.head, { canvas, context } = head, source = crop.canvas;
  if (canvas.parentNode !== v.head || canvas.nextSibling !== v.number) {
    v.head.insertBefore(canvas, v.number);
  }
  if (head.crop === crop && head.serial === crop.serial) return;
  if (canvas.width !== source.width || canvas.height !== source.height) {
    canvas.width = source.width;
    canvas.height = source.height;
  } else context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0);
  setStyle(ctx, canvas, 'width', crop.css[0]);
  setStyle(ctx, canvas, 'height', crop.css[1]);
  head.crop = crop;
  head.serial = crop.serial;
}

function releaseHead(ctx) {
  const head = ctx.frames.head;
  if (head === null) return;
  ctx.frames.head = null;
  evictCrop(head);
}

// The pending copy (a bitmap is closed), every crop and the header copy go: clear(),
// thumbnails off, destroy().
function dropFrameImages(ctx) {
  const pending = ctx.frames.pending;
  ctx.frames.pending = null;
  if (pending !== null) closeBitmap(pending.image);
  clearCrops(ctx);
  releaseHead(ctx);
}

// setOptions(): thumbnails off releases the pending copy and every crop.
function syncThumbnails(ctx) {
  if (!ctx.settings.thumbnails.enabled) dropFrameImages(ctx);
}

// ------------------------------------------------------------------------------- lifecycle

// Announcements, then onSelect once per change of the selected track id, the readout's result
// id or the presence of a readout subject.
function finishPass(ctx, pass) {
  announce(ctx, pass);
  if (ctx.destroyed) return;
  const track = selectedTrack(ctx), result = readoutResult(ctx);
  const next = { track: track === null ? null : track.id,
    result: result === null ? null : result.id, empty: readoutSubject(ctx) === null };
  const last = ctx.notified;
  if (next.track === last.track && next.result === last.result && next.empty === last.empty) {
    return;
  }
  ctx.notified = next;
  invoke(ctx, 'onSelect', track, result);
}

const rethrow = error => {
  const queue = typeof queueMicrotask === 'function' ? queueMicrotask
    : run => { Promise.resolve().then(run); };
  queue(() => { throw error; });
};

// Callback and provider errors go to onError, else are rethrown from a microtask; after
// destroy() they are dropped.
function reportError(ctx, error) {
  if (ctx.destroyed) return;
  const handler = ctx.settings.onError;
  if (typeof handler !== 'function') {
    rethrow(error);
    return;
  }
  try {
    handler(error);
  } catch (failure) {
    rethrow(failure);
  }
}

// A consumer callback by settings name; its exception never reaches the caller.
function invoke(ctx, name, ...args) {
  const callback = ctx.settings[name];
  if (ctx.destroyed || typeof callback !== 'function') return undefined;
  try {
    return callback(...args);
  } catch (error) {
    reportError(ctx, error);
    return undefined;
  }
}

// Idempotent: listeners, observers, the frame request, the subscription, timers, images and
// nodes go; the mount elements stay. Every method is a no-op afterwards.
function destroyOverlay(ctx) {
  if (ctx.destroyed) return;
  ctx.destroyed = true;
  ctx.abort.abort();
  ctx.listeners.forEach(({ target, type, handler, capture }) => {
    target.removeEventListener(type, handler, capture);
  });
  ctx.listeners.clear();
  ctx.scrollers.clear();
  ctx.observers.forEach(observer => observer.disconnect());
  ctx.observers = [];
  if (ctx.frameRequest !== null) ctx.win.cancelAnimationFrame(ctx.frameRequest);
  ctx.frameRequest = null;
  // Unsubscribes only: shared destination attempts belong to the verifier and its host.
  unbindDestinations(ctx);
  ctx.raw = Object.assign({}, ctx.raw, { destinations: null });
  ctx.settings = Object.freeze(Object.assign({}, ctx.settings, { destinations: null }));
  ctx.timers.forEach(entry => ctx.clock.clearTimeout(entry.handle));
  ctx.timers.clear();
  dropFrameImages(ctx);
  for (const node of [ctx.root, ctx.parts.rail.wrapper, ctx.parts.readout.wrapper]) {
    if (node !== null && node.parentNode !== null) node.parentNode.removeChild(node);
  }
  resetState(ctx);
}
