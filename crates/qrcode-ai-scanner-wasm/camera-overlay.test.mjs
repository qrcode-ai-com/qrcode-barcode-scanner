// Rendered overlay suite: Playwright pages over the real tracker (camera.js), the destination
// module (destination.js) and the overlay (camera-overlay.js). Run with node; filter with
// --test-name-pattern. Environment:
//   QRSCAN_PLAYWRIGHT_MODULE  Playwright module specifier or file URL (default 'playwright')
//   QRSCAN_CAMERA_PACKAGE     installed package directory holding the three modules
//   QRSCAN_BROWSER_CHANNEL    Chromium channel
//   QRSCAN_TEST_FIREFOX=1, QRSCAN_TEST_WEBKIT=1  add those engines
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { after, before, test } from 'node:test';

// ======================================================================= shared helpers
// Everything up to the first test is shared by every row; extend, never duplicate.

// --------------------------------------------------------------------- configuration
const PLAYWRIGHT_SPECIFIER = process.env.QRSCAN_PLAYWRIGHT_MODULE || 'playwright';
const playwright = await import(PLAYWRIGHT_SPECIFIER);
const ENGINE_TYPES = playwright.default || playwright;
const SOURCE_DIR = new URL('./', import.meta.url);
const PACKAGE_DIR = process.env.QRSCAN_CAMERA_PACKAGE
  ? pathToFileURL(process.env.QRSCAN_CAMERA_PACKAGE.replace(/\/*$/, '/')) : SOURCE_DIR;
// Served to the page from PACKAGE_DIR; test-only helpers always come from SOURCE_DIR.
const MODULE_FILES = ['camera.js', 'destination.js', 'camera-overlay.js'];
const FIXTURES_URL = new URL('./destination-fixtures.mjs', SOURCE_DIR);
// The rendered core runs in these engines; rows that need fewer pass their own list.
const CORE_ENGINES = ['chromium', 'firefox', 'webkit'];
const ENABLED = new Set(['chromium',
  ...(process.env.QRSCAN_TEST_FIREFOX === '1' ? ['firefox'] : []),
  ...(process.env.QRSCAN_TEST_WEBKIT === '1' ? ['webkit'] : [])]);
const LAUNCH = {
  chromium: process.env.QRSCAN_BROWSER_CHANNEL
    ? { channel: process.env.QRSCAN_BROWSER_CHANNEL } : {},
  firefox: {},
  webkit: {},
};
// Harness geometry: the video content box is 400 x 300 CSS px inside #capture (padding 20,
// border 4); in-video controls of the compact arrangement take 64 px (12 + 52).
const VIEW = Object.freeze({ width: 400, height: 300, compactControls: 64 });
const FRAME = Object.freeze({ width: 1600, height: 800 });

// Playwright's expect computes accessible names and descriptions the same way in every engine.
let expectPromise = null;
function playwrightExpect() {
  if (!expectPromise) {
    const base = process.env.QRSCAN_PLAYWRIGHT_MODULE;
    const specifier = !base ? 'playwright/test'
      : /^file:/.test(base) ? new URL('./test.mjs', base).href
        : base.startsWith('/') ? new URL('./test.mjs', pathToFileURL(base)).href : `${base}/test`;
    expectPromise = import(specifier).then(module => module.expect || module.default.expect);
  }
  return expectPromise;
}

// Node-side fixture servers (destination checks); loaded only by the rows that need them.
let fixturesPromise = null;
function destinationFixtures() {
  if (!fixturesPromise) fixturesPromise = import(FIXTURES_URL.href);
  return fixturesPromise;
}

// ------------------------------------------------------------------ reference values
// Outline, region and badge strings for the 400 x 300 view and the 1600 x 800 frame.
const OUTLINE = Object.freeze({
  // Quad one, contain.
  A: {
    corners: '34.5,64.5 165.5,64.5 165.5,135.5 34.5,135.5',
    bracket: 'M34.5 83.7L34.5 68.7Q34.5 64.5 38.7 64.5L57.5 64.5M142.5 64.5L161.3 64.5Q165.5 ' +
      '64.5 165.5 68.7L165.5 83.7M165.5 116.3L165.5 131.3Q165.5 135.5 161.3 135.5L142.5 135.5' +
      'M57.5 135.5L38.7 135.5Q34.5 135.5 34.5 131.3L34.5 116.3',
    region: 'M37 61L163 61Q169 61 169 67L169 133Q169 139 163 139L37 139Q31 139 31 133L31 67Q31 ' +
      '61 37 61Z',
    badge: { x: 24.6, y: 54.6 },
  },
  // Quad two, contain.
  D: {
    bracket: 'M234.5 163.7L234.5 148.7Q234.5 144.5 238.7 144.5L257.5 144.5M342.5 144.5L361.3 ' +
      '144.5Q365.5 144.5 365.5 148.7L365.5 163.7M365.5 196.3L365.5 211.3Q365.5 215.5 361.3 ' +
      '215.5L342.5 215.5M257.5 215.5L238.7 215.5Q234.5 215.5 234.5 211.3L234.5 196.3',
    region: 'M237 141L363 141Q369 141 369 147L369 213Q369 219 363 219L237 219Q231 219 231 213' +
      'L231 147Q231 141 237 141Z',
    badge: { x: 224.6, y: 134.6 },
  },
  // Quad one, cover, mirrored.
  B: {
    bracket: 'M445.5 47.5L445.5 28.7Q445.5 24.5 441.3 24.5L422.5 24.5M277.5 24.5L258.7 24.5' +
      'Q254.5 24.5 254.5 28.7L254.5 47.5M254.5 102.5L254.5 121.3Q254.5 125.5 258.7 125.5' +
      'L277.5 125.5M422.5 125.5L441.3 125.5Q445.5 125.5 445.5 121.3L445.5 102.5',
    region: 'M443 21L257 21Q251 21 251 27L251 123Q251 129 257 129L443 129Q449 129 449 123L449 27' +
      'Q449 21 443 21Z',
    badge: { x: 388, y: 14.6 },
  },
  // Perspective quad, contain.
  C: {
    bracket: 'M43.6 92.2L44.6 73.4Q44.8 69.2 49 69.4L67.8 70.4M132.8 73.6L151.6 74.6Q155.8 74.8 ' +
      '155.6 79L154.6 97.8M151.4 157.8L150.4 176.6Q150.2 180.8 146 180.6L127.2 179.6M62.2 176.4' +
      'L43.4 175.4Q39.2 175.2 39.4 171L40.4 152.2',
    region: 'M47.5 65.9L153.5 71.2Q159.5 71.5 159.1 77.5L153.8 178.4Q153.5 184.4 147.5 184.1' +
      'L41.5 178.8Q35.5 178.5 35.9 172.5L41.2 71.6Q41.5 65.6 47.5 65.9Z',
  },
  // Tiny 4 px quad at (100, 100).
  tiny: {
    bracket: 'M94.5 100.5L94.5 96.1Q94.5 94.5 96.1 94.5L100.5 94.5M103.5 94.5L107.9 94.5Q109.5 ' +
      '94.5 109.5 96.1L109.5 100.5M109.5 103.5L109.5 107.9Q109.5 109.5 107.9 109.5L103.5 109.5' +
      'M100.5 109.5L96.1 109.5Q94.5 109.5 94.5 107.9L94.5 103.5',
    region: 'M97 91L107 91Q113 91 113 97L113 107Q113 113 107 113L97 113Q91 113 91 107L91 97Q91 ' +
      '91 97 91Z',
  },
  // Close pair (100,100)-(160,160) and (165,100)-(225,160): margin 2.
  pair: {
    margin: 2,
    S1: 'M103.2 98L156.8 98Q162 98 162 103.2L162 156.8Q162 162 156.8 162L103.2 162Q98 162 98 ' +
      '156.8L98 103.2Q98 98 103.2 98Z',
    S2: 'M168.2 98L221.8 98Q227 98 227 103.2L227 156.8Q227 162 221.8 162L168.2 162Q163 162 163 ' +
      '156.8L163 103.2Q163 98 168.2 98Z',
  },
});

// Quad one (0.1, 0.1)-(0.4, 0.4) in a 400 x 300 view of a 1600 x 800 frame: fit, position,
// mirror, media size, polygon and visible fraction.
const QUAD_ONE_ROWS = Object.freeze([
  ['contain', '50% 50%', false, [1600, 800], '40,70 160,70 160,130 40,130', 1],
  ['contain', '50% 0%', false, [1600, 800], '40,20 160,20 160,80 40,80', 1],
  ['contain', '50% 100%', false, [1600, 800], '40,120 160,120 160,180 40,180', 1],
  ['contain', 'left 0px bottom 10px', false, [1600, 800], '40,110 160,110 160,170 40,170', 1],
  ['contain', '50% calc(100% - 30px)', false, [1600, 800], '40,90 160,90 160,150 40,150', 1],
  ['contain', '20% 80%', true, [1600, 800], '360,100 240,100 240,160 360,160', 1],
  ['cover', '50% 50%', false, [1600, 800], '-40,30 140,30 140,120 -40,120', 0.7778],
  ['cover', '50% 50%', true, [1600, 800], '440,30 260,30 260,120 440,120', 0.7778],
  ['cover', '0% 50%', false, [1600, 800], '60,30 240,30 240,120 60,120', 1],
  ['cover', '0% 50%', true, [1600, 800], '340,30 160,30 160,120 340,120', 1],
  ['cover', '20% 80%', true, [1600, 800], '380,30 200,30 200,120 380,120', 1],
  ['cover', '100% 50%', false, [1600, 800], '-140,30 40,30 40,120 -140,120', 0.2222],
  // The table's 'right 10px center': object-position has no three-value form, so the same
  // position is written as its valid four-value twin.
  ['cover', 'right 10px top 50%', false, [1600, 800], '-150,30 30,30 30,120 -150,120', 0.1667],
  ['cover', '25% 50%', false, [1600, 800], '10,30 190,30 190,120 10,120', 1],
  // fill ignores the position: any value gives this row.
  ['fill', '10% 90%', false, [1600, 800], '40,30 160,30 160,120 40,120', 1],
  ['none', '50% 50%', false, [320, 160], '72,86 168,86 168,134 72,134', 1],
  ['scale-down', '50% 50%', false, [320, 160], '72,86 168,86 168,134 72,134', 1],
  ['scale-down', '50% 50%', false, [1600, 800], '40,70 160,70 160,130 40,130', 1],
  ['none', '50% 50%', false, [1600, 800], '-440,-170 40,-170 40,70 -440,70', 0.0243],
].map(([fit, position, mirror, media, polygon, fraction]) =>
  Object.freeze({ fit, position, mirror, media, polygon, fraction })));

// Perspective quad (0.125, 0.125), (0.375, 0.15), (0.3625, 0.625), (0.1125, 0.6), media 1600 x 800.
const PERSPECTIVE_ROWS = Object.freeze([
  ['contain', '50% 50%', false, '50,75 150,80 145,175 45,170', 1],
  ['cover', '50% 50%', false, '-25,37.5 125,45 117.5,187.5 -32.5,180', 0.8083],
  ['cover', '50% 50%', true, '425,37.5 275,45 282.5,187.5 432.5,180', 0.8083],
  ['cover', '0% 0%', false, '75,37.5 225,45 217.5,187.5 67.5,180', 1],
  ['contain', '25% 75%', false, '50,100 150,105 145,200 45,195', 1],
  ['fill', '50% 50%', false, '50,37.5 150,45 145,187.5 45,180', 1],
].map(([fit, position, mirror, polygon, fraction]) =>
  Object.freeze({ fit, position, mirror, media: [1600, 800], polygon, fraction })));

// Other projected references: quad two in contain and cover, segment stock, the edge quad.
const PROJECTED = Object.freeze({
  twoContain: '240,150 360,150 360,210 240,210',
  twoCover: '260,150 440,150 440,240 260,240',
  stockContain: [50, 225, 150, 225],
  stockCover: [-25, 262.5, 125, 262.5],
  edgeCover: '-100,30 -10,30 -10,120 -100,120',
  edgeBadge: { x: 12, y: 75 },
});

// English default strings the rendered rows read back.
const TEXT = Object.freeze({
  inView: 'In view', readNow: 'Read now', lost: 'Lost', notRecent: 'Not read recently',
  segment: 'Scan line only', partial: 'Partial position', none: 'Position not measured',
  offscreen: 'Outside the visible area', earlier: 'Earlier', details: 'Details', open: 'Open link',
});

// Effect region of the 400 x 300 view before any cutout.
const VIEW_FRAME_PATH = 'M0 0H400V300H0Z';
// Track palette by color index (slot % 8).
const TRACK_COLOR_HEX = Object.freeze(['#4DA3FF', '#FF6A1A', '#FFD43B', '#22E5F0', '#FF8FA3',
  '#C77DBF', '#A8EB8E', '#C1BE37']);
const MONO_HEX = '#F5F7FA';
const FAMILY_LABELS = Object.freeze({ matrix: '2D matrix code', stacked: '2D stacked code',
  linear: '1D barcode' });
// [wire id, label, family label or null]
const SYMBOLOGY_LABELS = Object.freeze([
  ['qr_code', 'QR Code', 'matrix'], ['micro_qr_code', 'Micro QR Code', 'matrix'],
  ['rectangular_micro_qr_code', 'rMQR', 'matrix'], ['data_matrix', 'Data Matrix', 'matrix'],
  ['aztec', 'Aztec', 'matrix'], ['maxi_code', 'MaxiCode', 'matrix'],
  ['pdf417', 'PDF417', 'stacked'],
  ['ean13', 'EAN-13', 'linear'], ['ean8', 'EAN-8', 'linear'], ['upc_a', 'UPC-A', 'linear'],
  ['upc_e', 'UPC-E', 'linear'], ['code128', 'Code 128', 'linear'], ['code39', 'Code 39', 'linear'],
  ['code93', 'Code 93', 'linear'], ['codabar', 'Codabar', 'linear'], ['itf', 'ITF', 'linear'],
  ['data_bar', 'GS1 DataBar', null], ['data_bar_expanded', 'GS1 DataBar Expanded', null],
  ['telepen', 'Telepen', 'linear'],
].map(([id, label, family]) => Object.freeze({ id, label,
  family: family === null ? null : FAMILY_LABELS[family] })));
const KIND_LABELS = Object.freeze({ url: 'URL', wifi: 'Wi-Fi', email: 'Email', sms: 'SMS',
  tel: 'Phone number', v_card: 'Contact (vCard)', text: 'Text', geo: 'Location',
  gs1: 'GS1 element string', gs1_digital_link: 'GS1 Digital Link', me_card: 'Contact (MeCard)',
  crypto: 'Crypto payment', v_event: 'Calendar event (vEvent)' });
// Readout, rail and destination strings the rows read back.
const LABEL = Object.freeze({
  incomplete: 'No verified text reading. The exact bytes are in Details.',
  incompleteEci: 'No verified text reading: an ECI was declared but not located. The exact ' +
    'bytes are in Details.',
  eciUnlocated: 'Declared, not located', fnc1First: 'First position', copy: 'Copy',
  copyBytes: 'Copy bytes', copied: 'Copied', previous: 'Previous code', next: 'Next code',
  saturated: 'More codes in view than can be tracked',
  saturatedOccurrences: 'Some copies of the same content may be merged or missing',
  unverified: 'Destination not checked', queued: 'Waiting (no request sent)',
  resolving: 'Checking…', observed: 'Destination observed',
  example: 'Example result (simulated)', failed: 'Check failed', canceled: 'Check canceled',
  unavailable: 'Check unavailable', providerError: 'Destination checks unavailable',
  check: 'Check destination', checkAgain: 'Check again', cancel: 'Cancel check',
  fixture: 'Local fixture', simulated: 'Simulated', contactWebsite: 'Contact website',
  noRequest: 'No request sent', response: 'The browser received a response',
  credentials: 'Contains a user name or password', tooLong: 'Too long to check',
  controlOrSpace: 'Contains spaces or control characters',
});
// Every English default a readout may show, for the text-provenance check.
const READOUT_WORDS = Object.freeze([].concat(
  SYMBOLOGY_LABELS.map(row => row.label), Object.values(FAMILY_LABELS), Object.values(KIND_LABELS),
  Object.values(TEXT), Object.values(LABEL),
  ['Decoded content', 'No code selected', 'More', 'Less', 'Parsed fields', 'Yes', 'No', 'Unknown',
    'Character set', 'Bytes', 'ECI', 'FNC1', 'Second position', 'Copy failed', 'Encoded URL',
    'Host',
    'Meets the checked GS1 rules', 'GS1 issues', 'Network name', 'Security', 'Password',
    'Hidden network', 'To', 'Subject', 'Message', 'Number', 'Latitude', 'Longitude', 'Name',
    'Phone', 'Scheme', 'Address', 'Amount', 'GTIN', 'Destination', 'Requested URL',
    'The URL is not an exact reading', 'Not an HTTP or HTTPS address', 'Not a valid URL']));
// Label shapes built by functions: target names, positions, ECI offsets, related codes.
const READOUT_PATTERNS = Object.freeze([/Code \d+/g, /\d+ of \d+/g, /ECI \d+ at byte \d+/g,
  /\(\d{2,4}\)/g]);
// Pure separators between labels and values.
const SEPARATORS = /^[\s·:;,.()[\]|/–—→-]*$/;

/** Rail visibility table: live tracks L, entries E (retained included), a selection or not. */
function railShown(mode, live, entries, selected) {
  if (mode === 'auto') return live >= 2 || (entries >= 1 && !selected);
  if (mode === 'multiple') return live >= 2;
  if (mode === 'always') return entries >= 1;
  return false;
}

/** The holes of an effect region: the view frame first, then one region per cutout. */
function clipHoles(clip, label) {
  if (clip === null) return [];
  assert.equal(typeof clip, 'string', `${label}: clip is a string or null`);
  const parts = clip.split(/ (?=M)/);
  assert.equal(parts[0], VIEW_FRAME_PATH, `${label}: clip starts with the view frame`);
  return parts.slice(1);
}

/** Uppercase hex pairs of a UTF-8 string, as Details shows bytes. */
const hexBytes = text => Array.from(Buffer.from(text, 'utf8'))
  .map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');

// ------------------------------------------------------------------ assertion helpers
const numbersOf = text => String(text).trim().split(/[\s,]+/).map(Number);
const sortedIds = list => (Array.isArray(list) ? list.slice().sort() : list);

/** A points attribute equals an expected 'x,y x,y' string within 1e-9 per coordinate. */
function assertPoints(actual, expected, label) {
  assert.equal(typeof actual, 'string', `${label}: no points attribute (expected ${expected})`);
  const got = numbersOf(actual), want = numbersOf(expected);
  const same = got.length === want.length && got.every((v, i) => Math.abs(v - want[i]) <= 1e-9);
  assert.ok(same, `${label}: points ${actual} instead of ${expected}`);
}

/** data-visible-fraction carries at most 4 decimals and equals the expected value. */
function assertFraction(actual, expected, label) {
  assert.match(String(actual), /^\d+(\.\d{1,4})?$/,
    `${label}: fraction ${actual} is not a 4-decimal number`);
  assert.ok(Math.abs(Number(actual) - expected) <= 1e-9,
    `${label}: fraction ${actual} instead of ${expected}`);
}

function assertNear(actual, expected, tolerance, label) {
  assert.ok(typeof actual === 'number' && Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} is not within ${tolerance} of ${expected}`);
}

function assertPoint(actual, expected, tolerance, label) {
  assert.ok(actual, `${label}: no point (expected ${expected.x}, ${expected.y})`);
  assertNear(actual.x, expected.x, tolerance, `${label} x`);
  assertNear(actual.y, expected.y, tolerance, `${label} y`);
}

function assertRect(actual, expected, tolerance, label) {
  assert.ok(actual && expected, `${label}: missing rectangle`);
  for (const key of ['left', 'top', 'width', 'height']) {
    assertNear(actual[key], expected[key], tolerance, `${label} ${key}`);
  }
}

/** A scene target drawn as an outline: data-drawn, the shared bracket d and the hit polygon. */
function assertOutline(target, { bracket, polygon }, label) {
  assert.ok(target, `${label}: no scene target`);
  assert.equal(target.attrs['data-drawn'], 'outline', `${label}: data-drawn`);
  if (bracket !== undefined) {
    assert.equal(target.outline, bracket, `${label}: outline d`);
    assert.equal(target.casing, bracket, `${label}: casing d`);
    assert.equal(target.glow, bracket, `${label}: glow d`);
  }
  if (polygon !== undefined) assertPoints(target.polygon, polygon, `${label}: hit polygon`);
}

/** A segment target: casing, outline and hit lines along [x1, y1, x2, y2], nothing else. */
function assertSegmentLine(target, [x1, y1, x2, y2], label) {
  assert.ok(target, `${label}: no scene target`);
  assert.equal(target.attrs['data-drawn'], 'line', `${label}: data-drawn`);
  assert.deepEqual([target.paths, target.polygons], [0, 0], `${label}: no path or polygon`);
  const roles = target.lines.map(line => line.role).sort();
  assert.deepEqual(roles, ['casing', 'hit', 'outline'], `${label}: line roles`);
  const want = [x1, y1, x2, y2];
  for (const line of target.lines) {
    const ends = [[line.x1, line.y1, line.x2, line.y2], [line.x2, line.y2, line.x1, line.y1]];
    const same = ends.some(list => list.every((v, i) => Math.abs(v - want[i]) <= 1e-9));
    assert.ok(same, `${label}: ${line.role} line ${ends[0]} instead of ${want}`);
  }
}

/** A target that draws nothing: absent from the scene, or data-drawn none without shapes. */
function assertNotDrawn(target, label) {
  if (target === null) return;
  assert.equal(target.attrs['data-drawn'], 'none', `${label}: data-drawn`);
  assert.deepEqual([target.paths, target.polygons, target.lines.length, target.dots, target.badge],
    [0, 0, 0, 0, null], `${label}: no shape`);
}

/** Text left after removing known labels, engine strings and label shapes; '' when all known. */
function unknownText(text, words) {
  let rest = String(text);
  words.filter(word => word).slice().sort((a, b) => b.length - a.length).forEach(word => {
    rest = rest.split(word).join(' ');
  });
  READOUT_PATTERNS.forEach(pattern => { rest = rest.replace(pattern, ' '); });
  return SEPARATORS.test(rest) ? '' : rest.trim();
}

/** Both paths carry the same numbers in the same order (engines reformat path strings). */
function assertSameNumbers(actual, expected, label) {
  const numbers = text => (String(text).match(/-?\d+(\.\d+)?(e-?\d+)?/g) || []).map(Number);
  const got = numbers(actual), want = numbers(expected);
  const same = got.length === want.length && got.every((v, i) => Math.abs(v - want[i]) <= 1e-6);
  assert.ok(same, `${label}: ${actual} does not carry the numbers of ${expected}`);
}

function permutations(list) {
  if (list.length <= 1) return [list.slice()];
  return list.flatMap((item, i) =>
    permutations([...list.slice(0, i), ...list.slice(i + 1)]).map(rest => [item, ...rest]));
}

// --------------------------------------------------------------------- color helpers
/** [r, g, b, a] in 0-255 (alpha 0-1) from rgb(), rgba(), #rgb, #rrggbb or color(srgb ...). */
function parseColor(text) {
  const value = String(text).trim();
  let match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (match) {
    const hex = match[1].length === 3 ? [...match[1]].map(c => c + c).join('') : match[1];
    return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).concat(1);
  }
  match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
    .exec(value);
  if (match) {
    const alpha = match[4] === undefined ? 1
      : match[4].endsWith('%') ? parseFloat(match[4]) / 100 : Number(match[4]);
    return [Number(match[1]), Number(match[2]), Number(match[3]), alpha];
  }
  match = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i.exec(value);
  if (match) {
    return [1, 2, 3].map(i => Number(match[i]) * 255)
      .concat(match[4] === undefined ? 1 : Number(match[4]));
  }
  throw new Error(`unparsed color ${value}`);
}

/** WCAG 2 relative luminance of an sRGB color given as [r, g, b] in 0-255. */
function relativeLuminance([r, g, b]) {
  const channel = c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a, b) {
  const [la, lb] = [a, b].map(color =>
    relativeLuminance(typeof color === 'string' ? parseColor(color) : color));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Source-over composite of a translucent color on an opaque background, both [r, g, b, a]. */
function composite([r, g, b, a], [br, bg, bb]) {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1];
}

// ------------------------------------------------------------------------ page harness
// Serialized into the page with toString(): it must not use anything from this module.
// It defines window.h: fake time, counters, builders, the overlay factory and DOM readers.
async function pageHarness() {
  const h = { ready: false, fatal: null,
    errors: { camera: null, destination: null, overlay: null } };
  window.h = h;

  // window.open is recorded and never followed. h.sequence interleaves it with onAction calls.
  h.openCalls = [];
  h.sequence = [];
  window.open = function open() {
    h.openCalls.push(Array.prototype.map.call(arguments, String));
    h.sequence.push('open');
    return null;
  };
  // Observers of the harness itself; spies installed later never count them.
  const NativeMutationObserver = window.MutationObserver;

  // One fake time base; every clock tags its timers so rows can count them per owner.
  const time = { now: 0, serial: 0, timers: new Map() };
  h.time = {
    now: () => time.now,
    clock(tag) {
      return {
        now: () => time.now,
        setTimeout(callback, ms) {
          time.serial += 1;
          const id = time.serial;
          time.timers.set(id, { id, tag, at: time.now + Math.max(0, Number(ms) || 0), callback });
          return id;
        },
        clearTimeout(id) { time.timers.delete(id); },
      };
    },
    // Runs every timer due by now + ms in time order, including timers scheduled meanwhile.
    advance(ms) {
      const end = time.now + ms;
      for (;;) {
        let next = null;
        time.timers.forEach(timer => {
          if (timer.at <= end && (next === null || timer.at < next.at)) next = timer;
        });
        if (next === null) break;
        time.timers.delete(next.id);
        time.now = Math.max(time.now, next.at);
        next.callback();
        // Lets a reader (h.voice) take what the timer wrote at the timer's own time.
        if (h.afterTimer) h.afterTimer();
      }
      time.now = Math.max(time.now, end);
      return time.now;
    },
    to: at => h.time.advance(Math.max(0, at - time.now)),
    pending(tag) {
      let count = 0;
      time.timers.forEach(timer => { if (tag === undefined || timer.tag === tag) count += 1; });
      return count;
    },
    pendingList() {
      const list = [];
      time.timers.forEach(timer => list.push(`${timer.tag}@${timer.at}`));
      return list;
    },
  };
  // Real-time waits: one task, or two animation frames and a task.
  h.task = () => new Promise(resolve => setTimeout(resolve, 0));
  h.settle = () => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))));

  const load = async (name, path) => {
    try {
      return await import(path);
    } catch (error) {
      h.errors[name] = String((error && error.stack) || error);
      return null;
    }
  };
  h.camera = await load('camera', '/camera.js');
  h.destination = await load('destination', '/destination.js');
  h.overlayModule = await load('overlay', '/camera-overlay.js');

  h.video = document.querySelector('#capture video');
  h.container = document.getElementById('capture');
  h.stage = document.getElementById('stage');
  h.below = document.getElementById('below');
  h.railSlot = document.getElementById('below-rail');
  h.readoutSlot = document.getElementById('below-readout');
  h.outside = document.getElementById('outside');
  h.sheet = document.getElementById('sheet');

  // ------------------------------------------------------------------ builders
  const encoder = new TextEncoder();
  h.b64 = text => {
    let binary = '';
    encoder.encode(text).forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  };
  h.rect = (x0, y0, x1, y1) =>
    [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  h.quad = points => ({ geometry: { kind: 'quad', points, reader: 'rxing' } });
  h.segment = (p0, p1) => ({ geometry: { kind: 'segment', points: [p0, p1], reader: 'rxing' } });
  h.partial = points => ({ geometry: { kind: 'partial', points, reader: 'rxing' } });
  h.url = href => ({ kind: 'url', url: href });
  h.detection = ({ symbology = 'qr_code', text, raw, charset = 'utf8', eci, fnc1, payload,
    occurrences } = {}) => {
    const content = { text, raw: raw === undefined ? h.b64(text) : raw, charset };
    if (eci !== undefined) content.eci = eci;
    if (fnc1 !== undefined) content.fnc1 = fnc1;
    const detection = { symbology, content, payload: payload || { kind: 'text' }, corners: null,
      meta: { version: null, ec_level: null, mask: null, modules: null, inverted: null },
      engines: ['rxing'] };
    if (occurrences !== undefined) detection.occurrences = occurrences;
    return detection;
  };
  h.report = (detections, { complete = true } = {}) => ({
    detections, score: null, hints: [],
    trace: { stages: [], engine_panics: 0, total_ms: 0, budget_exhausted: !complete,
      saturation: { reads: false, detections: false, occurrences: false } },
    versions: { scanner: '0.11.0', pipeline: 5, score_contract: 5 },
  });
  const urlCode = (text, points) =>
    h.detection({ text, payload: h.url(text), occurrences: [h.quad(points)] });
  // Contents in 1600 x 800 frame px unless noted.
  h.scene = {
    one: (points = h.rect(160, 80, 640, 320)) => urlCode('https://example.test/one', points),
    two: (points = h.rect(960, 400, 1440, 640)) => h.detection({ text: 'javascript:alert(1)',
      payload: h.url('javascript:alert(1)'), occurrences: [h.quad(points)] }),
    stock: () => h.detection({ symbology: 'code128', text: 'STOCK-4827',
      occurrences: [h.segment({ x: 200, y: 700 }, { x: 600, y: 700 })] }),
    // Larger and more central than one.
    big: () => urlCode('https://example.test/big', h.rect(672, 40, 928, 760)),
    fresh: (points = h.rect(80, 440, 560, 680)) => urlCode('https://example.test/new', points),
    edge: () => urlCode('https://example.test/edge', h.rect(0, 80, 240, 320)),
    perspective: () => urlCode('https://example.test/perspective',
      [{ x: 200, y: 100 }, { x: 600, y: 120 }, { x: 580, y: 500 }, { x: 180, y: 480 }]),
    // Crossing copies of one content in a 1000 x 1000 frame, side 100 at y 400.
    crossing: xs => h.detection({ text: 'CROSS',
      occurrences: xs.map(x => h.quad(h.rect(x, 400, x + 100, 500))) }),
  };
  h.tracker = (options = {}) => h.camera.createDetectionTracker(options);
  h.feed = (tracker, detections, observedAt, { epoch = 1, sequence, complete = true,
    now = observedAt, width = 1600, height = 800 } = {}) => {
    const frame = { width, height, observedAt, epoch };
    if (sequence !== undefined) frame.sequence = sequence;
    return tracker.update(h.report(detections, { complete }), frame, { now });
  };
  // Feeds the tracker and delivers the snapshot to the current overlay.
  h.step = (tracker, detections, observedAt, options) => {
    const snapshot = h.feed(tracker, detections, observedAt, options);
    h.last = snapshot;
    h.overlay.update(snapshot);
    return snapshot;
  };
  h.idsByText = (snapshot = h.last) => {
    const ids = {};
    snapshot.tracks.forEach(track => {
      const text = track.detection.content.text;
      ids[text] = (ids[text] || []).concat(track.id);
    });
    return ids;
  };
  // A destroyed snapshot as camera.d.ts types it, with empty tracks and results.
  h.destroyedSnapshot = like => ({ status: 'destroyed', rejection: null, now: like.now,
    epoch: like.epoch, frame: like.frame, frameAge: like.frameAge, complete: like.complete,
    tracks: [], results: [], unassigned: [], dropped: [],
    saturated: { detections: false, occurrences: false, observations: false, tracks: false },
    events: [], nextDeadline: null });

  // ------------------------------------------------------------------ overlay
  h.selects = [];
  h.overlayErrors = [];
  h.actions = [];
  // Action types whose default the recorded onAction prevents.
  h.prevent = [];
  // An error as text whose first line is String(error) in every engine: only V8 starts the
  // stack with the message, SpiderMonkey and JavaScriptCore give frames alone.
  const errorText = error => {
    const text = String(error);
    const stack = error && typeof error.stack === 'string' ? error.stack : '';
    if (stack.indexOf(text) === 0) return stack;
    return stack ? `${text}\n${stack}` : text;
  };
  // Settings are JSON from Node; mount takes 'below', 'rail', 'readout' or an object.
  // selects and actions restart per overlay; overlayErrors accumulate for the whole page.
  h.create = (settings = {}) => {
    if (!h.overlayModule) throw new Error(`overlay module did not load: ${h.errors.overlay}`);
    h.selects = [];
    h.actions = [];
    const options = Object.assign({
      video: h.video, container: h.container, clock: h.time.clock('overlay'),
      onSelect: (track, result) =>
        h.selects.push([track ? track.id : null, result ? result.id : null]),
      onError: error => h.overlayErrors.push(errorText(error)),
      onAction: action => {
        h.actions.push({ type: action.type, value: action.value });
        h.sequence.push(`action:${action.type}`);
        if (h.prevent.indexOf(action.type) !== -1) action.preventDefault();
      },
    }, settings);
    if (options.mount === 'below') options.mount = { rail: h.railSlot, readout: h.readoutSlot };
    else if (options.mount === 'rail') options.mount = { rail: h.railSlot };
    else if (options.mount === 'readout') options.mount = { readout: h.readoutSlot };
    h.overlay = h.overlayModule.createCameraOverlay(options);
    return h.overlay;
  };
  h.state = (overlay = h.overlay) => ({
    selected: overlay.selected ? overlay.selected.id : null,
    result: overlay.selectedResult ? overlay.selectedResult.id : null,
    detection: overlay.detection ? overlay.detection.content.text : null,
    mode: overlay.selectionMode,
    alignment: overlay.alignment,
    destroyed: overlay.destroyed,
    inspected: JSON.parse(JSON.stringify(overlay.inspect())),
  });

  // ------------------------------------------------------------------ DOM readers
  h.attrs = el => {
    const out = {};
    if (el) Array.prototype.forEach.call(el.attributes, a => { out[a.name] = a.value; });
    return out;
  };
  // Trimmed direct text of every element under el (el included), in document order.
  h.texts = el => {
    const out = [];
    if (!el) return out;
    [el].concat(Array.from(el.querySelectorAll('*'))).forEach(node => {
      let text = '';
      node.childNodes.forEach(child => { if (child.nodeType === 3) text += child.nodeValue; });
      text = text.trim();
      if (text) out.push(text);
    });
    return out;
  };
  h.visible = el => Boolean(el) && el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden';
  // Client rectangle of an element's content box (scale from its border box). A mirrored
  // element (scaleX(-1)) shows its right border and padding on the left.
  h.contentBox = (el, mirrored = false) => {
    const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
    const px = name => parseFloat(style[name]) || 0;
    const outerWidth = el.offsetWidth || rect.width;
    const scale = outerWidth ? rect.width / outerWidth : 1;
    const start = (px('borderLeftWidth') + px('paddingLeft')) * scale;
    const end = (px('borderRightWidth') + px('paddingRight')) * scale;
    const left = mirrored ? end : start, right = mirrored ? start : end;
    const top = (px('borderTopWidth') + px('paddingTop')) * scale;
    const bottom = (px('borderBottomWidth') + px('paddingBottom')) * scale;
    return { left: rect.left + left, top: rect.top + top,
      width: rect.width - left - right, height: rect.height - top - bottom };
  };
  // View coordinates are CSS px of the video content box.
  h.toView = (x, y) => {
    const box = h.contentBox(h.video);
    const scale = box.width / h.video.clientWidth;
    return { x: (x - box.left) / scale, y: (y - box.top) / scale };
  };
  h.toClient = (x, y) => {
    const box = h.contentBox(h.video);
    const scale = box.width / h.video.clientWidth;
    return { x: box.left + x * scale, y: box.top + y * scale };
  };
  h.root = () => h.container.querySelector(':scope > [data-qr-camera-overlay]');
  h.rootRect = () => {
    const root = h.root();
    if (!root) return null;
    const r = root.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  const lineRole = el => (el.classList.contains('qr-camera-hit') ? 'hit'
    : el.classList.contains('qr-camera-casing') ? 'casing'
      : el.classList.contains('qr-camera-outline') ? 'outline' : el.getAttribute('class') || '');
  // A point in an SVG element's user space, in view coordinates.
  const svgPoint = (el, x, y) => {
    const m = el.getCTM();
    if (!m) return null;
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  };
  const summary = g => {
    const shape = selector => Array.from(g.querySelectorAll(selector))
      .filter(el => !el.closest('.qr-camera-badge'));
    const first = selector => shape(selector)[0] || null;
    const d = el => (el ? el.getAttribute('d') : null);
    const glow = first('path.qr-camera-glow');
    const hit = first('polygon.qr-camera-hit');
    const badgeGroup = g.querySelector('.qr-camera-badge');
    let badge = null;
    if (badgeGroup) {
      const ring = badgeGroup.querySelector('circle.qr-camera-hit') ||
        badgeGroup.querySelector('circle');
      const text = badgeGroup.querySelector('text');
      badge = { attrs: h.attrs(badgeGroup), text: text ? text.textContent : null,
        center: ring ? svgPoint(ring, Number(ring.getAttribute('cx')) || 0,
          Number(ring.getAttribute('cy')) || 0) : null };
    }
    return {
      id: g.getAttribute('data-target-id'),
      attrs: h.attrs(g),
      outline: d(first('path.qr-camera-outline')),
      casing: d(first('path.qr-camera-casing')),
      glow: d(glow),
      glowDisplay: glow ? getComputedStyle(glow).display : null,
      glowFilter: glow ? glow.getAttribute('filter') : null,
      polygon: hit ? hit.getAttribute('points') : null,
      paths: shape('path').length,
      polygons: shape('polygon').length,
      lines: shape('line').map(el => ({ role: lineRole(el),
        x1: Number(el.getAttribute('x1')), y1: Number(el.getAttribute('y1')),
        x2: Number(el.getAttribute('x2')), y2: Number(el.getAttribute('y2')) })),
      dots: shape('circle.qr-camera-dot').length,
      badge,
      opacity: getComputedStyle(g).opacity,
    };
  };
  h.targets = () => {
    const root = h.root();
    return root ? Array.from(root.querySelectorAll('g.qr-camera-target')).map(summary) : [];
  };
  h.target = id => {
    const found = h.targets().filter(t => t.id === id);
    return found.length ? found[0] : null;
  };
  h.hits = () => {
    const root = h.root();
    return root ? root.querySelectorAll('.qr-camera-hit').length : 0;
  };
  // Rail entries anywhere in the document (in-video or mounted).
  h.entries = (scope = document) => Array.from(scope.querySelectorAll('.qr-camera-entry'))
    .map(el => {
      const part = name => el.querySelector(`.qr-camera-${name}`);
      const text = name => (part(name) ? part(name).textContent : null);
      return { attrs: h.attrs(el), number: text('number'), format: text('format'),
        caption: text('caption'), preview: text('preview'),
        checkDisplay: part('check') ? getComputedStyle(part('check')).display : null,
        visible: h.visible(el), focused: document.activeElement === el };
    });
  h.entry = id => {
    const found = h.entries().filter(e =>
      e.attrs['data-target-id'] === id || e.attrs['data-result-id'] === id);
    return found.length ? found[0] : null;
  };
  h.readout = () => {
    const el = document.querySelector('section.qr-camera-readout');
    if (!el) return null;
    const one = selector => el.querySelector(selector);
    return { attrs: h.attrs(el), head: h.texts(one('.qr-camera-head')), texts: h.texts(el),
      content: one('.qr-camera-content') ? one('.qr-camera-content').textContent : null,
      url: one('.qr-camera-url-text') ? one('.qr-camera-url-text').textContent : null,
      details: h.texts(one('.qr-camera-details')),
      buttons: Array.from(el.querySelectorAll('button')).map(b => b.textContent.trim()),
      visible: h.visible(el) };
  };
  h.announcer = () => {
    const el = document.querySelector('.qr-camera-announcer');
    return el ? { text: el.textContent, attrs: h.attrs(el) } : null;
  };
  // Elements matching selector inside the root and the mounted parts.
  h.count = selector => [h.root(), h.railSlot, h.readoutSlot].reduce((n, scope) =>
    n + (scope ? scope.querySelectorAll(selector).length : 0), 0);

  // Mutation records under an element, by name.
  h.watchers = {};
  h.watch = (name, el) => {
    const watcher = { records: [] };
    const observer = new NativeMutationObserver(list => {
      watcher.records = watcher.records.concat(list);
    });
    observer.observe(el, { attributes: true, characterData: true, childList: true, subtree: true });
    watcher.take = () => {
      watcher.records = watcher.records.concat(observer.takeRecords());
      const out = watcher.records.map(r => `${r.type}:${r.attributeName || ''}`);
      watcher.records = [];
      return out;
    };
    // The same records with their target: { type, attr, node: 'tag.class' or '#text' }.
    watcher.detail = () => {
      watcher.records = watcher.records.concat(observer.takeRecords());
      const out = watcher.records.map(r => ({ type: r.type, attr: r.attributeName || '',
        node: r.target.nodeType === 1 ? `${r.target.tagName.toLowerCase()}.` +
          `${r.target.getAttribute('class') || ''}` : '#text' }));
      watcher.records = [];
      return out;
    };
    watcher.stop = () => observer.disconnect();
    h.watchers[name] = watcher;
    return watcher;
  };

  // Intrinsic media size as the overlay reads it (videoWidth, videoHeight).
  h.setMediaSize = (width, height) => {
    Object.defineProperty(h.video, 'videoWidth', { configurable: true, get: () => width });
    Object.defineProperty(h.video, 'videoHeight', { configurable: true, get: () => height });
  };
  h.clearMediaSize = () => {
    delete h.video.videoWidth;
    delete h.video.videoHeight;
  };

  // Overlay nodes, styles or listeners' targets left behind in the document.
  h.leftovers = () => {
    const found = [];
    const selector = '[data-qr-camera-overlay], [data-qr-camera-part], [class*="qr-camera-"]';
    document.querySelectorAll(selector)
      .forEach(el => found.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`));
    document.querySelectorAll('style').forEach(el => {
      if (el !== h.sheet && el.id !== 'harness-style') found.push('style');
    });
    Array.prototype.forEach.call(h.container.children, el => {
      if (el !== h.video) found.push(`container>${el.tagName.toLowerCase()}`);
    });
    [h.railSlot, h.readoutSlot].forEach(slot => {
      if (slot.childNodes.length) found.push(`#${slot.id} has ${slot.childNodes.length} nodes`);
    });
    return found;
  };

  // A camera capture double: a video whose frames are fired by hand at fake time.
  h.cameraRig = () => {
    let presented = 0, serial = 0;
    const requests = new Map();
    const events = new EventTarget();
    const listen = {
      addEventListener: (type, fn, options) => events.addEventListener(type, fn, options),
      removeEventListener: (type, fn, options) => events.removeEventListener(type, fn, options),
    };
    const context = {
      drawImage() {},
      getImageData: (x, y, width, height) => ({ data: new Uint8ClampedArray(4), width, height }),
    };
    const fakeDocument = Object.assign({ hidden: false, defaultView: Object.assign({}, listen),
      createElement: () => ({ width: 0, height: 0, getContext: () => context }) }, listen);
    const video = { ownerDocument: fakeDocument, readyState: 4, videoWidth: 1600,
      videoHeight: 800, srcObject: null, muted: false, playsInline: false,
      play: () => Promise.resolve(), pause() {},
      requestVideoFrameCallback(callback) {
        serial += 1;
        requests.set(serial, callback);
        return serial;
      },
      cancelVideoFrameCallback(handle) { requests.delete(handle); } };
    const track = { muted: false, stopped: false, stop() { track.stopped = true; },
      addEventListener() {}, removeEventListener() {} };
    const mediaDevices = { getUserMedia: () => Promise.resolve({ getTracks: () => [track] }) };
    return { video, mediaDevices, track,
      pendingFrames: () => requests.size,
      fire() {
        const list = Array.from(requests.values());
        requests.clear();
        list.forEach(callback => {
          presented += 1;
          callback(time.now, { presentedFrames: presented, mediaTime: presented / 30,
            captureTime: time.now });
        });
        return list.length;
      } };
  };

  // Camera + tracker + overlay wired as documented; records callbacks around teardown.
  h.stack = (settings = {}) => {
    if (!h.overlayModule) throw new Error(`overlay module did not load: ${h.errors.overlay}`);
    const rig = h.cameraRig();
    const record = { changes: 0, changesAfterDestroy: 0, selects: 0, selectsAfterDestroy: 0,
      errors: [], trackerDestroyed: false, overlayDestroyed: false };
    const overlay = h.overlayModule.createCameraOverlay(Object.assign({
      video: h.video, container: h.container, clock: h.time.clock('overlay'),
      onSelect: () => {
        record.selects += 1;
        if (record.overlayDestroyed) record.selectsAfterDestroy += 1;
      },
      onError: error => record.errors.push(`overlay: ${String(error)}`),
    }, settings));
    const tracker = h.camera.createDetectionTracker({ clock: h.time.clock('tracker'),
      onChange: snapshot => {
        record.changes += 1;
        if (record.trackerDestroyed) record.changesAfterDestroy += 1;
        overlay.update(snapshot);
      },
      onError: error => record.errors.push(`tracker: ${String(error)}`) });
    const camera = h.camera.createCameraScanner({ video: rig.video, tracker,
      clock: h.time.clock('camera'), mediaDevices: rig.mediaDevices, maxDimension: 1600,
      scanFrame: () => h.report([h.scene.one()]),
      onError: error => record.errors.push(`camera: ${error.code || String(error)}`) });
    return { rig, overlay, tracker, camera, record,
      stop() { camera.stop(); },
      destroyTracker() {
        tracker.destroy();
        record.trackerDestroyed = true;
      },
      destroyOverlay() {
        overlay.destroy();
        record.overlayDestroyed = true;
      } };
  };
  // Advances fake time in steps, firing due video frames and letting decodes settle.
  h.pump = async (stack, ms, step = 100) => {
    const end = time.now + ms;
    while (time.now < end) {
      h.time.advance(Math.min(step, end - time.now));
      stack.rig.fire();
      await h.task();
    }
  };

  // ------------------------------------------------------------------ hand-built snapshots
  // A TrackerSnapshot of the camera.d.ts shape, for states one tracker step cannot reach.
  // tracks: [{ id, slot, state, basis, detection, kind, points (frame px), precise, resultId,
  // seenAt }]; retained: [{ id, detection, seenAt }] are results without a live track.
  h.snap = ({ now = 10000, epoch = 1, width = 1600, height = 800, sequence = null, tracks = [],
    retained = [], saturated = {}, events = [], status = 'updated' } = {}) => {
    const norm = points => points.map(p => ({ x: p.x / width, y: p.y / height }));
    const live = tracks.map((spec, i) => {
      const state = spec.state || 'tracked';
      const seenAt = spec.seenAt === undefined ? now : spec.seenAt;
      const geometry = spec.kind && state !== 'lost' ? { kind: spec.kind, points: norm(spec.points),
        measured: norm(spec.points), observedAt: seenAt, age: now - seenAt, lag: 0,
        reader: 'rxing', downgrade: null, smoothed: false, restart: 'new',
        precise: spec.precise === undefined ? state === 'tracked' && spec.kind === 'quad'
          : spec.precise } : null;
      return { id: spec.id || `track-${i + 1}`, slot: spec.slot === undefined ? i : spec.slot,
        state, basis: spec.basis || (spec.kind ? 'spatial' : 'content'),
        key: h.camera.contentKey(spec.detection),
        resultId: spec.resultId === undefined ? `result-${i + 1}` : spec.resultId,
        detection: spec.detection,
        observation: { sequence, detectionIndex: i, occurrenceIndex: spec.kind ? 0 : null },
        firstSeenAt: Math.min(seenAt, now - 100), lastSeenAt: seenAt, misses: 0, geometry };
    }).sort((a, b) => a.slot - b.slot);
    const results = [];
    retained.forEach((spec, i) => {
      const seenAt = spec.seenAt === undefined ? now - 5000 : spec.seenAt;
      results.push({ id: spec.id || `result-${100 + i}`, key: h.camera.contentKey(spec.detection),
        detection: spec.detection, firstObservedAt: seenAt - 100, lastObservedAt: seenAt,
        present: now < seenAt + 1200, trackIds: [] });
    });
    live.forEach(track => {
      if (track.resultId === null) return;
      let result = results.filter(r => r.id === track.resultId)[0];
      if (!result) {
        result = { id: track.resultId, key: track.key, detection: track.detection,
          firstObservedAt: track.firstSeenAt, lastObservedAt: track.lastSeenAt, present: true,
          trackIds: [] };
        results.push(result);
      }
      result.trackIds.push(track.id);
    });
    return { status, rejection: null, now, epoch,
      frame: { width, height, observedAt: now, epoch, sequence }, frameAge: 0, complete: true,
      tracks: live, results, unassigned: [], dropped: [],
      saturated: Object.assign({ detections: false, occurrences: false, observations: false,
        tracks: false }, saturated),
      events, nextDeadline: null };
  };

  // ------------------------------------------------------------------ effect readers
  // Effect layers as rendered, with the inspection that drives them.
  h.fx = (overlay = h.overlay) => {
    const root = h.root();
    const layer = selector => {
      const el = root ? root.querySelector(selector) : null;
      if (!el) return null;
      const style = getComputedStyle(el);
      return { attrs: h.attrs(el), display: style.display, d: el.getAttribute('d'),
        fill: style.fill, fillOpacity: style.fillOpacity,
        clipPath: style.clipPath || style.webkitClipPath || '',
        backdrop: style.backdropFilter || style.webkitBackdropFilter || '',
        transition: style.transitionDuration, animation: style.animationName };
    };
    const inspected = overlay.inspect();
    return { blur: layer('.qr-camera-blur'), scrim: layer('path.qr-camera-scrim'),
      wash: layer('path.qr-camera-wash'), root: h.attrs(root), clip: inspected.clip,
      focus: inspected.focus, blurState: inspected.blur,
      effects: JSON.parse(JSON.stringify(inspected.effects)),
      targets: inspected.targets.map(k => ({ id: k.id, cutout: k.cutout, margin: k.margin,
        drawn: k.drawn })) };
  };
  // Computed style of the glow, outline and badge parts of one scene target.
  h.paint = id => {
    const root = h.root();
    const g = root ? root.querySelector(`g.qr-camera-target[data-target-id="${id}"]`) : null;
    if (!g) return null;
    const part = selector => {
      const el = Array.from(g.querySelectorAll(selector))
        .filter(node => selector.indexOf('badge') !== -1 || !node.closest('.qr-camera-badge'))[0];
      if (!el) return null;
      const style = getComputedStyle(el);
      return { display: style.display, opacity: style.opacity, stroke: style.stroke,
        strokeWidth: style.strokeWidth, fill: style.fill, fontSize: style.fontSize,
        filter: el.getAttribute('filter') };
    };
    return { color: g.getAttribute('data-color'), glow: part('path.qr-camera-glow'),
      outline: part('path.qr-camera-outline'),
      ring: part('.qr-camera-badge circle:not(.qr-camera-hit)'),
      numeral: part('.qr-camera-badge text') };
  };
  // Fill test and bounding box of a path string in view units, on a scratch SVG.
  h.pathProbe = (d, points = []) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', '300');
    svg.setAttribute('style', 'position:absolute;left:-10000px;top:0');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
    document.body.appendChild(svg);
    try {
      const inside = points.map(p => path.isPointInFill(typeof DOMPoint === 'function'
        ? new DOMPoint(p.x, p.y) : Object.assign(svg.createSVGPoint(), p)));
      const box = path.getBBox();
      return { inside, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
    } finally {
      svg.remove();
    }
  };

  // ------------------------------------------------------------------ readout readers
  // The destination slot and the persistent check button (h.checkButton holds an earlier node).
  h.slot = () => {
    const el = document.querySelector('.qr-camera-destination');
    const button = document.querySelector('button.qr-camera-check');
    const one = selector => (el ? el.querySelector(selector) : null);
    const time = one('time');
    return { present: Boolean(el), attrs: h.attrs(el), text: el ? el.textContent : '',
      lines: el ? Array.from(el.children).map(line => line.textContent) : [],
      final: one('.qr-camera-final') ? one('.qr-camera-final').textContent : null,
      provenance: one('.qr-camera-provenance') ? one('.qr-camera-provenance').textContent : null,
      time: time ? { datetime: time.getAttribute('datetime'), text: time.textContent } : null,
      links: el ? el.querySelectorAll('a').length : 0,
      button: button ? { text: button.textContent.trim(), tag: button.tagName,
        same: button === h.checkButton, focused: document.activeElement === button } : null };
  };
  // Exact text of a rendered content element: text nodes, plus data-text of chips and breaks.
  h.rebuild = el => {
    let out = '';
    const walk = node => node.childNodes.forEach(child => {
      if (child.nodeType === 3) out += child.nodeValue;
      else if (child.nodeType === 1 && child.hasAttribute('data-text')) {
        out += child.getAttribute('data-text');
      } else if (child.nodeType === 1) walk(child);
    });
    if (el) walk(el);
    return out;
  };
  // Trimmed text nodes of the readout outside the containers of decoded strings.
  h.labelTexts = () => {
    const el = document.querySelector('section.qr-camera-readout');
    const engine = '.qr-camera-content, .qr-camera-url-text, .qr-camera-final, .qr-camera-bytes, ' +
      '.qr-camera-escape, .qr-camera-fields dd, .qr-camera-issues, .qr-camera-preview, ' +
      '.qr-camera-line, time';
    const out = [];
    if (!el) return out;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue.trim();
      if (text && !node.parentElement.closest(engine)) out.push(text);
    }
    return out;
  };
  // Non-empty announcer texts in the order they appear, one per mutation record: a text set,
  // cleared and set again before the observer runs still counts twice.
  h.listen = () => {
    const el = document.querySelector('.qr-camera-announcer');
    const heard = [];
    const observer = new NativeMutationObserver(records => records.forEach(record => {
      const text = record.type === 'characterData' ? record.target.data
        : Array.from(record.addedNodes).map(node => node.textContent).join('');
      if (text) heard.push(text);
    }));
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    h.heard = heard;
    h.stopListening = () => observer.disconnect();
    return heard;
  };

  // ------------------------------------------------------------------ frame images
  // 1280 x 720 ImageData in 32 px blocks, so a scaled crop keeps a block's color at its center.
  h.blockColor = (x, y) => {
    const bx = Math.floor(x / 32), by = Math.floor(y / 32);
    return [(bx * 37 + 11) & 255, (by * 59 + 23) & 255, ((bx + by) * 23 + 41) & 255, 255];
  };
  h.patterned = (width = 1280, height = 720) => {
    const image = new ImageData(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const color = h.blockColor(x, y), at = (y * width + x) * 4;
        image.data[at] = color[0];
        image.data[at + 1] = color[1];
        image.data[at + 2] = color[2];
        image.data[at + 3] = 255;
      }
    }
    return image;
  };
  // Canvases created from now on, crops included.
  h.canvasSpy = () => {
    const original = Document.prototype.createElement;
    const made = [];
    Document.prototype.createElement = function createElement(name, options) {
      const el = original.call(this, name, options);
      if (String(name).toLowerCase() === 'canvas') made.push(el);
      return el;
    };
    h.restoreCanvasSpy = () => { Document.prototype.createElement = original; };
    return made;
  };

  // ------------------------------------------------------------------ lifecycle spies
  // Listeners, observers and animation frames added from now on (AbortSignal targets aside).
  h.spy = () => {
    const proto = EventTarget.prototype;
    const add = proto.addEventListener, remove = proto.removeEventListener;
    const raf = window.requestAnimationFrame, caf = window.cancelAnimationFrame;
    const live = [], observers = [], frames = new Set(), restore = [];
    const captures = options => (typeof options === 'boolean' ? options
      : Boolean(options && options.capture));
    const find = (target, type, listener, capture) => live.filter(r => r.target === target &&
      r.type === type && r.listener === listener && r.capture === capture)[0];
    proto.addEventListener = function addEventListener(type, listener, options) {
      const capture = captures(options), known = find(this, String(type), listener, capture);
      if (listener && !known && !(this instanceof AbortSignal)) {
        const record = { target: this, type: String(type), listener, capture };
        const drop = () => {
          const i = live.indexOf(record);
          if (i !== -1) live.splice(i, 1);
        };
        live.push(record);
        const object = options !== null && typeof options === 'object' ? options : {};
        if (object.signal) {
          if (object.signal.aborted) drop();
          else add.call(object.signal, 'abort', drop, { once: true });
        }
        if (object.once) add.call(this, type, drop, { once: true, capture });
      }
      return add.call(this, type, listener, options);
    };
    proto.removeEventListener = function removeEventListener(type, listener, options) {
      const record = find(this, String(type), listener, captures(options));
      if (record) live.splice(live.indexOf(record), 1);
      return remove.call(this, type, listener, options);
    };
    restore.push(() => {
      proto.addEventListener = add;
      proto.removeEventListener = remove;
    });
    ['ResizeObserver', 'MutationObserver', 'IntersectionObserver'].forEach(name => {
      const Native = window[name];
      if (typeof Native !== 'function') return;
      const Spied = function Spied(callback, options) {
        const observer = new Native(callback, options);
        const record = { name, observing: 0 };
        observers.push(record);
        const observe = observer.observe.bind(observer);
        const disconnect = observer.disconnect.bind(observer);
        observer.observe = function observeSpied(...args) {
          record.observing += 1;
          return observe(...args);
        };
        observer.disconnect = function disconnectSpied() {
          record.observing = 0;
          return disconnect();
        };
        if (typeof observer.unobserve === 'function') {
          const unobserve = observer.unobserve.bind(observer);
          observer.unobserve = function unobserveSpied(...args) {
            record.observing = Math.max(0, record.observing - 1);
            return unobserve(...args);
          };
        }
        return observer;
      };
      Spied.prototype = Native.prototype;
      window[name] = Spied;
      restore.push(() => { window[name] = Native; });
    });
    window.requestAnimationFrame = function requestAnimationFrame(callback) {
      let id = 0;
      id = raf.call(window, time => {
        frames.delete(id);
        callback(time);
      });
      frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = function cancelAnimationFrame(id) {
      frames.delete(id);
      return caf.call(window, id);
    };
    restore.push(() => {
      window.requestAnimationFrame = raf;
      window.cancelAnimationFrame = caf;
    });
    const name = target => (target === window ? 'window' : target === document ? 'document'
      : target instanceof ShadowRoot ? '#shadow-root'
        : `${String(target.nodeName || target).toLowerCase()}.${(target.getAttribute &&
          target.getAttribute('class')) || ''}`);
    const spy = {
      listeners: () => live.map(r => `${name(r.target)}:${r.type}${r.capture ? ':capture' : ''}`),
      observing: () => observers.filter(r => r.observing > 0).map(r => r.name),
      frames: () => frames.size,
      restore: () => restore.splice(0).reverse().forEach(undo => undo()),
    };
    h.spied = spy;
    return spy;
  };

  // A positioned box with a 400 x 300 video, appended to parent (an element or a shadow root).
  h.ownCapture = parent => {
    const box = document.createElement('div');
    box.style.cssText = 'position:relative;width:400px;height:300px';
    const video = document.createElement('video');
    video.style.cssText = 'display:block;width:400px;height:300px;object-fit:contain';
    box.appendChild(video);
    parent.appendChild(box);
    return { box, video };
  };

  // ------------------------------------------------------------------ fixed codes and layout
  // Codes for hand-built snapshots by name, with stable ids, slots and result ids ('two' and
  // 'text' are two choices for the second code).
  const CODES = {
    one: [0, () => h.scene.one(), h.rect(160, 80, 640, 320)],
    two: [1, () => h.scene.two(), h.rect(960, 400, 1440, 640)],
    text: [1, () => h.detection({ text: 'SECOND CODE' }), h.rect(960, 400, 1440, 640)],
    third: [2, () => h.detection({ text: 'THIRD CODE' }), h.rect(160, 440, 560, 760)],
    fourth: [3, () => h.detection({ text: 'FOURTH CODE' }), h.rect(1000, 40, 1400, 320)],
  };
  h.code = (name, state = 'tracked', extra = {}) => {
    const [slot, detection, points] = CODES[name];
    return Object.assign({ id: `track-${slot + 1}`, slot, resultId: `result-${slot + 1}`, state,
      kind: 'quad', points, detection: detection() }, extra);
  };
  // count spatial text codes side by side across the frame; state(i) gives each one's state.
  h.lineup = (count, state = () => 'tracked') => Array.from({ length: count }, (_, i) => ({
    id: `track-${i + 1}`, slot: i, resultId: `result-${i + 1}`, state: state(i), kind: 'quad',
    points: h.rect(20 + 196 * i, 100, 170 + 196 * i, 300),
    detection: h.detection({ text: `CODE-${i + 1}` }) }));
  // count animation frames, then a task: room for an observer and the frame it schedules.
  h.frames = async (count = 3) => {
    for (let i = 0; i < count; i += 1) {
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
    }
    await h.task();
  };
  // Layout reads of the video or the container (getBoundingClientRect, getComputedStyle,
  // getClientRects), counted until stop().
  h.layoutReads = () => {
    const proto = Element.prototype;
    const rect = proto.getBoundingClientRect, rects = proto.getClientRects;
    const style = window.getComputedStyle;
    const watched = el => el === h.video || el === h.container;
    const reads = { count: 0 };
    proto.getBoundingClientRect = function getBoundingClientRect() {
      if (watched(this)) reads.count += 1;
      return rect.call(this);
    };
    proto.getClientRects = function getClientRects() {
      if (watched(this)) reads.count += 1;
      return rects.call(this);
    };
    window.getComputedStyle = function getComputedStyle(el, pseudo) {
      if (watched(el)) reads.count += 1;
      return style.call(window, el, pseudo);
    };
    reads.stop = () => {
      proto.getBoundingClientRect = rect;
      proto.getClientRects = rects;
      window.getComputedStyle = style;
      return reads.count;
    };
    return reads;
  };
  // getComputedStyle of the video reports the given values ({ objectFit: 'foo' }), by property
  // and through getPropertyValue, until the returned restore() runs.
  h.stubVideoStyle = values => {
    const original = window.getComputedStyle;
    const dashed = {};
    Object.keys(values).forEach(key => {
      dashed[key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)] = values[key];
    });
    const has = (record, key) => Object.prototype.hasOwnProperty.call(record, key);
    window.getComputedStyle = function getComputedStyle(element, pseudo) {
      const style = original.call(window, element, pseudo);
      if (element !== h.video) return style;
      return new Proxy(style, { get(target, key) {
        if (typeof key === 'string' && has(values, key)) return values[key];
        if (key === 'getPropertyValue') {
          return name => (has(dashed, name) ? dashed[name] : target.getPropertyValue(name));
        }
        const value = target[key];
        return typeof value === 'function' ? value.bind(target) : value;
      } });
    };
    return () => { window.getComputedStyle = original; };
  };
  // Scroll offsets of the window, then of el and each of its ancestors.
  h.scrolls = el => {
    const out = [`window ${window.scrollX} ${window.scrollY}`];
    for (let node = el; node; node = node.parentElement) {
      const name = `${node.tagName.toLowerCase()}#${node.id}.${node.getAttribute('class') || ''}`;
      out.push(`${name} ${node.scrollLeft} ${node.scrollTop}`);
    }
    return out;
  };
  // The in-video arrangement as rendered: sizes, the controls' height from the root's bottom,
  // what elementFromPoint finds at each badge, the readout view and the named nav buttons.
  h.arrangement = names => {
    const root = h.root();
    const box = root.getBoundingClientRect();
    const controls = root.querySelector('.qr-camera-controls');
    const top = controls && controls.getClientRects().length
      ? controls.getBoundingClientRect().top : box.bottom;
    const readout = root.querySelector('section.qr-camera-readout');
    const more = root.querySelector('button.qr-camera-more');
    const named = name => Array.from(root.querySelectorAll('button')).filter(b => h.visible(b) &&
      (b.getAttribute('aria-label') || b.textContent.trim()) === name).length;
    const badges = h.targets().filter(t => t.badge && t.badge.center).map(t => {
      const p = h.toClient(t.badge.center.x, t.badge.center.y);
      const hit = document.elementFromPoint(p.x, p.y);
      return { id: t.id, y: t.badge.center.y,
        scene: Boolean(hit && hit.closest && hit.closest('svg.qr-camera-scene')),
        hit: hit ? `${hit.tagName.toLowerCase()}.${hit.getAttribute('class') || ''}` : null };
    });
    const inspected = h.overlay.inspect();
    return { size: h.attrs(root)['data-qr-camera-size'] || null,
      arrangement: inspected.arrangement, controlsHeight: inspected.controlsHeight,
      height: box.height, covered: box.bottom - top,
      view: readout ? readout.getAttribute('data-view') : null,
      card: readout && h.visible(readout) ? readout.getBoundingClientRect().height : null,
      more: more ? { text: more.textContent.trim(), visible: h.visible(more),
        same: more === h.moreNode, focused: document.activeElement === more } : null,
      rail: h.entries(root).filter(e => e.visible).length,
      previous: named(names[0]), next: named(names[1]), badges };
  };
  // Mounted parts as rendered: size attributes, preview display, content height and lines,
  // and the Details button (the readout button with aria-expanded).
  h.partLayout = () => {
    const content = h.readoutSlot.querySelector('.qr-camera-content');
    const style = content ? getComputedStyle(content) : null;
    const readout = h.readoutSlot.querySelector('section.qr-camera-readout');
    const details = Array.from(h.readoutSlot.querySelectorAll('button'))
      .filter(b => b.hasAttribute('aria-expanded'))[0] || null;
    return { sizes: [h.railSlot, h.readoutSlot].map(slot =>
      h.attrs(slot.firstElementChild)['data-qr-camera-size'] || null),
    previews: Array.from(h.railSlot.querySelectorAll('.qr-camera-preview'))
      .map(el => getComputedStyle(el).display),
    content: content ? { height: content.getBoundingClientRect().height,
      line: parseFloat(style.lineHeight) || 1.2 * parseFloat(style.fontSize) } : null,
    expanded: readout ? readout.getAttribute('data-expanded') : null,
    details: details ? { text: details.textContent.trim(),
      expanded: details.getAttribute('aria-expanded') } : null };
  };

  // ------------------------------------------------------------------ inks, voice and pixels
  // Opacity and background of el and each ancestor, up to the first opaque background.
  const backing = el => {
    const chain = [];
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      chain.push({ opacity: style.opacity, background: style.backgroundColor });
      if (/^rgb\(/.test(style.backgroundColor)) break;
    }
    return chain;
  };
  // Every visible element under scope with its own text (disabled entries aside): its class,
  // color, font size and backing.
  h.inks = scope => {
    const out = [];
    if (!scope) return out;
    const own = el => Array.from(el.childNodes).filter(n => n.nodeType === 3)
      .map(n => n.nodeValue).join('').trim();
    [scope].concat(Array.from(scope.querySelectorAll('*'))).forEach(el => {
      const text = own(el);
      if (!text || !h.visible(el) || el.closest('[aria-disabled="true"]')) return;
      const style = getComputedStyle(el);
      out.push({ text: text.slice(0, 40), cls: el.getAttribute('class') || el.tagName,
        color: style.color, size: style.fontSize, chain: backing(el) });
    });
    return out;
  };
  // Focus ring of el after a programmatic focus, which matches :focus-visible in every engine.
  h.ring = el => {
    if (!el) return null;
    el.focus({ preventScroll: true });
    const style = getComputedStyle(el);
    const out = { visible: el.matches(':focus-visible'), color: style.outlineColor,
      style: style.outlineStyle, width: style.outlineWidth, chain: backing(el) };
    el.blur();
    return out;
  };
  // A border side of el with its backing, for the checked cue.
  h.edge = el => (el ? { color: getComputedStyle(el).borderTopColor,
    width: getComputedStyle(el).borderTopWidth, chain: backing(el) } : null);

  // Announcer texts with the fake time they appeared at (h.said); h.hear() takes the pending
  // records, and every fake timer callback is followed by one.
  h.voice = () => {
    const el = document.querySelector('.qr-camera-announcer');
    const said = [];
    const take = list => list.forEach(record => {
      const text = record.type === 'characterData' ? record.target.data
        : Array.from(record.addedNodes).map(node => node.textContent).join('');
      if (text) said.push({ at: time.now, text });
    });
    const observer = new NativeMutationObserver(take);
    if (el) observer.observe(el, { childList: true, characterData: true, subtree: true });
    h.said = said;
    h.hear = () => take(observer.takeRecords());
    h.afterTimer = h.hear;
    h.stopVoice = () => {
      h.afterTimer = null;
      observer.disconnect();
    };
    return said;
  };
  // Fake time up to end in step ms: timers run, then onTick(now), then pending texts are taken.
  h.walk = async (end, step, onTick) => {
    while (time.now < end) {
      h.time.to(Math.min(end, time.now + step));
      if (onTick) onTick(time.now);
      if (h.hear) h.hear();
      await Promise.resolve();
    }
  };

  // A checkerboard of 8 px cells on a 400 x 200 canvas, streamed into the harness video.
  h.checker = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const g = canvas.getContext('2d');
    const draw = () => {
      for (let y = 0; y < 200; y += 8) {
        for (let x = 0; x < 400; x += 8) {
          g.fillStyle = ((x + y) / 8) % 2 ? '#fff' : '#000';
          g.fillRect(x, y, 8, 8);
        }
      }
    };
    draw();
    // Autoplay and redraws: an explicit play() takes the headless WebKit page down.
    h.video.autoplay = true;
    h.video.srcObject = canvas.captureStream(30);
    const start = performance.now();
    while (h.video.videoWidth === 0 && performance.now() - start < 5000) {
      draw();
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    for (let i = 0; i < 10; i += 1) {
      draw();
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
    }
    return { width: h.video.videoWidth, height: h.video.videoHeight };
  };
  // Rendered buttons and radios under the scopes, with their size in CSS px.
  h.targetSizes = scopes => {
    const out = [];
    scopes.forEach(scope => {
      if (!scope) return;
      scope.querySelectorAll('button, [role="radio"]').forEach(el => {
        if (!h.visible(el)) return;
        const r = el.getBoundingClientRect();
        out.push({ name: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40),
          cls: el.getAttribute('class') || '', width: r.width, height: r.height });
      });
    });
    return out;
  };

  h.ready = true;
}

// --------------------------------------------------------------------- page and server
// #capture: padding 20 and border 4 around a 400 x 300 video; #below receives mounted parts.
const HARNESS_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Overlay harness</title>
<style id="harness-style">
body{margin:0;font:14px/1.4 system-ui,sans-serif}
#stage{width:448px}
#capture{position:relative;width:400px;height:300px;padding:20px;border:4px solid #888}
#capture video{display:block;width:400px;height:300px;object-fit:contain;background:#222}
.mirrored{transform:scaleX(-1)}
#below{width:400px;margin:0 24px}
</style>
<style id="sheet"></style>
</head><body>
<div id="stage"><div id="capture"><video muted playsinline></video></div></div>
<div id="below"><div id="below-rail"></div><div id="below-readout"></div></div>
<button id="outside" type="button">Outside</button>
<script type="module" src="/harness.js"></script>
</body></html>
`;
const HARNESS_JS = `(${pageHarness.toString()})().catch(error => {
  window.h = window.h || {};
  window.h.fatal = String((error && error.stack) || error);
  window.h.ready = true;
});
`;

let server = null;
let origin = null;
const browsers = new Map();

async function serve(request, response) {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  let body = null;
  let type = 'text/javascript; charset=utf-8';
  if (path === '/') {
    body = HARNESS_HTML;
    type = 'text/html; charset=utf-8';
  } else if (path === '/harness.js') {
    body = HARNESS_JS;
  } else if (MODULE_FILES.includes(path.slice(1))) {
    body = await readFile(new URL(path.slice(1), PACKAGE_DIR)).catch(() => null);
  }
  if (body === null) {
    response.writeHead(404, { 'cache-control': 'no-store' });
    response.end();
    return;
  }
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(body);
}

before(async () => {
  server = createServer((request, response) => {
    serve(request, response).catch(() => {
      response.writeHead(500);
      response.end();
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const pending of browsers.values()) {
    const browser = await pending.catch(() => null);
    if (browser) await browser.close().catch(() => {});
  }
  browsers.clear();
  if (server) {
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    await new Promise(resolve => server.close(() => resolve()));
  }
});

function browserFor(engine) {
  if (!browsers.has(engine)) {
    const launched = ENGINE_TYPES[engine].launch(Object.assign({ headless: true }, LAUNCH[engine]))
      .catch(error => {
        throw new Error(`external: ${engine} did not launch: ${error.message}`);
      });
    browsers.set(engine, launched);
  }
  return browsers.get(engine);
}

/** A fresh context and page on the harness; pg.load() navigates and checks the imports. */
async function openPage(engine, { reducedMotion = 'reduce',
  viewport = { width: 1000, height: 1000 }, hasTouch = false, colorScheme, forcedColors,
  permissions, deviceScaleFactor } = {}) {
  const browser = await browserFor(engine);
  const contextOptions = { viewport, reducedMotion, hasTouch };
  if (colorScheme) contextOptions.colorScheme = colorScheme;
  if (forcedColors) contextOptions.forcedColors = forcedColors;
  if (deviceScaleFactor) contextOptions.deviceScaleFactor = deviceScaleFactor;
  const context = await browser.newContext(contextOptions);
  // Short action waits keep a missing element a fast, readable failure.
  context.setDefaultTimeout(5000);
  context.setDefaultNavigationTimeout(30000);
  if (permissions) await context.grantPermissions(permissions, { origin });
  const pg = { engine, context, page: null, requests: [], pageErrors: [], dialogs: [],
    allowed: new Set() };
  // Any request off the harness origin is counted and refused, except allowed loopback
  // fixture origins (pg.allow).
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url === origin || url.startsWith(`${origin}/`)) return route.continue();
    let target = null;
    try {
      target = new URL(url).origin;
    } catch (error) {
      target = null;
    }
    if (target !== null && pg.allowed.has(target)) return route.continue();
    pg.requests.push(url);
    return route.abort();
  });
  pg.allow = fixtureOrigin => pg.allowed.add(fixtureOrigin);
  const page = await context.newPage();
  pg.page = page;
  page.on('pageerror', error => pg.pageErrors.push(String((error && error.stack) || error)));
  page.on('dialog', dialog => {
    pg.dialogs.push(`${dialog.type()}: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  pg.eval = (fn, arg) => page.evaluate(fn, arg);
  pg.load = async () => {
    await page.goto(`${origin}/`);
    await page.waitForFunction(() => Boolean(window.h && window.h.ready), null, { timeout: 30000 });
    const status = await page.evaluate(() => ({ fatal: window.h.fatal, errors: window.h.errors }));
    if (status.fatal) throw new Error(`harness error: ${status.fatal}`);
    // camera.js and destination.js belong to other changes: their load errors are external.
    if (status.errors.camera) {
      throw new Error(`external: camera.js did not load: ${status.errors.camera}`);
    }
    if (status.errors.destination) {
      throw new Error(`external: destination.js did not load: ${status.errors.destination}`);
    }
    if (status.errors.overlay) {
      throw new Error(`camera-overlay.js did not load: ${status.errors.overlay}`);
    }
  };
  const overlayErrors = () => page.evaluate(() => (window.h && window.h.overlayErrors) || []);
  pg.earlierErrors = [];
  // A fresh harness page; onError calls of the page being left are kept for finish().
  pg.reload = async () => {
    pg.earlierErrors = pg.earlierErrors.concat(await overlayErrors());
    await pg.load();
  };
  pg.settle = () => page.evaluate(() => window.h.settle());
  pg.state = () => page.evaluate(() => window.h.state());
  pg.takePageErrors = () => pg.pageErrors.splice(0);
  // Every row ends without page errors or overlay onError calls.
  pg.finish = async () => {
    const errors = pg.earlierErrors.concat(await overlayErrors());
    assert.deepEqual(pg.pageErrors, [], 'page errors');
    assert.deepEqual(errors, [], 'overlay onError calls');
  };
  pg.close = () => context.close().catch(() => {});
  return pg;
}

/** One rendered row: runs body(pg, t) on a fresh page in every enabled engine of the row. */
function rendered(name, body, { engines = CORE_ENGINES, page = {}, timeout = 120000 } = {}) {
  test(name, { timeout }, async t => {
    const failures = [];
    for (const engine of engines) {
      if (!ENABLED.has(engine)) {
        t.diagnostic(`${engine} not run (QRSCAN_TEST_${engine.toUpperCase()}=1 enables it)`);
        continue;
      }
      let pg = null;
      try {
        pg = await openPage(engine, page);
        await pg.load();
        await body(pg, t);
        await pg.finish();
      } catch (error) {
        failures.push({ engine, error });
      } finally {
        if (pg) await pg.close();
      }
    }
    if (failures.length === 1) {
      const { engine, error } = failures[0];
      if (error && typeof error.message === 'string') {
        error.message = `[${engine}] ${error.message}`;
      }
      throw error;
    }
    if (failures.length) {
      throw new Error(failures.map(({ engine, error }) =>
        `[${engine}] ${(error && error.stack) || error}`).join('\n\n'));
    }
  });
}

/** A second page in the row's engine with other options; finished and closed like the first. */
async function withPage(engine, options, body) {
  const pg = await openPage(engine, options);
  try {
    await pg.load();
    const out = await body(pg);
    await pg.finish();
    return out;
  } finally {
    await pg.close();
  }
}

/** Center of the first element matching selector, in client coordinates. */
const centerOf = (pg, selector) => pg.eval(css => {
  const el = document.querySelector(css);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, selector);

/** Clicks (or taps) a point given in view coordinates. */
async function tapView(pg, x, y, { touch = false } = {}) {
  const point = await pg.eval(([vx, vy]) => window.h.toClient(vx, vy), [x, y]);
  if (touch) await pg.page.touchscreen.tap(point.x, point.y);
  else await pg.page.mouse.click(point.x, point.y);
}

/** Computed accessible name and description, the same way in every engine. */
async function assertAccessible(locator, { name, description }, label) {
  const expect = await playwrightExpect();
  try {
    if (name !== undefined) await expect(locator).toHaveAccessibleName(name, { timeout: 2000 });
    if (description !== undefined) {
      await expect(locator).toHaveAccessibleDescription(description, { timeout: 2000 });
    }
  } catch (error) {
    throw new assert.AssertionError({ message: `${label}: ${error.message}` });
  }
}

// ======================================================================= rendered rows
const byId = list => Object.fromEntries(list.map(item => [item.id, item]));
const readScene = pg => pg.eval(() => {
  const h = window.h;
  return { targets: h.targets(), root: h.rootRect(), box: h.contentBox(h.video),
    alignment: h.overlay.alignment, rootAttrs: h.attrs(h.root()) };
});
// The three T59 codes from the real tracker at 0 ms: track-1, track-2 and track-3.
const T59_IDS = Object.freeze({ 'https://example.test/one': ['track-1'],
  'javascript:alert(1)': ['track-2'], 'STOCK-4827': ['track-3'] });

rendered('U15 (T59) quads and the scan line in contain, cover and cover mirrored', async pg => {
  const ids = await pg.eval(() => {
    const h = window.h;
    h.create();
    h.step(h.tracker(), [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
    return h.idsByText();
  });
  assert.deepEqual(ids, T59_IDS, 'tracker ids (precondition)');

  let view = await readScene(pg);
  assert.equal(view.alignment, 'aligned', 'contain: alignment');
  assert.equal(view.rootAttrs['data-alignment'], 'aligned', 'contain: data-alignment');
  assertRect(view.box, { left: 24, top: 24, width: VIEW.width, height: VIEW.height }, 1e-6,
    'harness video content box');
  assertRect(view.root, view.box, 0.01, 'root on the video content box');
  let t = byId(view.targets);
  assertOutline(t['track-1'], { bracket: OUTLINE.A.bracket, polygon: QUAD_ONE_ROWS[0].polygon },
    'contain one');
  assert.equal(t['track-1'].attrs['data-precise'], 'true', 'contain one: data-precise');
  assertFraction(t['track-1'].attrs['data-visible-fraction'], 1, 'contain one');
  assertOutline(t['track-2'], { bracket: OUTLINE.D.bracket, polygon: PROJECTED.twoContain },
    'contain two');
  assertSegmentLine(t['track-3'], PROJECTED.stockContain, 'contain stock');
  assertFraction(t['track-3'].attrs['data-visible-fraction'], 1, 'contain stock');

  await pg.eval(() => {
    window.h.video.style.objectFit = 'cover';
    window.h.overlay.layout();
  });
  view = await readScene(pg);
  assert.equal(view.alignment, 'aligned', 'cover: alignment');
  t = byId(view.targets);
  assertOutline(t['track-1'], { polygon: '-40,30 140,30 140,120 -40,120' }, 'cover one');
  assert.equal(t['track-1'].attrs['data-precise'], 'false', 'cover one: data-precise');
  assertFraction(t['track-1'].attrs['data-visible-fraction'], 0.7778, 'cover one');
  assert.equal(t['track-1'].attrs['data-cutout'], 'false', 'cover one: data-cutout');
  assertOutline(t['track-2'], { polygon: PROJECTED.twoCover }, 'cover two');
  assert.equal(t['track-2'].attrs['data-precise'], 'false', 'cover two: data-precise');
  assertFraction(t['track-2'].attrs['data-visible-fraction'], 0.7778, 'cover two');
  assert.equal(t['track-2'].attrs['data-cutout'], 'false', 'cover two: data-cutout');
  assertSegmentLine(t['track-3'], PROJECTED.stockCover, 'cover stock');
  assertFraction(t['track-3'].attrs['data-visible-fraction'], 0.8333, 'cover stock');

  await pg.eval(() => {
    window.h.overlay.setOptions({ mirror: true });
    window.h.overlay.layout();
  });
  view = await readScene(pg);
  t = byId(view.targets);
  assertOutline(t['track-1'],
    { bracket: OUTLINE.B.bracket, polygon: '440,30 260,30 260,120 440,120' }, 'cover mirrored one');
  assertFraction(t['track-1'].attrs['data-visible-fraction'], 0.7778, 'cover mirrored one');
  assertPoint(t['track-1'].badge && t['track-1'].badge.center, OUTLINE.B.badge, 0.05,
    'cover mirrored one: badge');
});

rendered('U16 (T60) numbers, colors and names agree; three paths select one id', async pg => {
  const ids = await pg.eval(() => {
    const h = window.h;
    h.create({ mount: 'below' });
    h.step(h.tracker(), [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
    return h.idsByText();
  });
  assert.deepEqual(ids, T59_IDS, 'tracker ids (precondition)');
  const view = await pg.eval(() => ({ targets: window.h.targets(), entries: window.h.entries() }));
  const t = byId(view.targets);
  const entries = byId(view.entries.map(e => Object.assign({ id: e.attrs['data-target-id'] }, e)));
  const rows = [['track-1', 0, 'true'], ['track-2', 1, 'true'], ['track-3', 2, 'false']];
  for (const [id, slot, precise] of rows) {
    const want = { 'data-slot': String(slot), 'data-state': 'tracked', 'data-basis': 'spatial',
      'data-color': String(slot), 'data-precise': precise };
    for (const [owner, item] of [['target', t[id]], ['entry', entries[id]]]) {
      assert.ok(item, `${id}: no ${owner}`);
      for (const key of Object.keys(want)) {
        assert.equal(item.attrs[key], want[key], `${id} ${owner}: ${key}`);
      }
    }
    assert.equal(t[id].badge && t[id].badge.text, String(slot + 1), `${id}: badge numeral`);
    assert.equal(entries[id].number, String(slot + 1), `${id}: entry number`);
  }
  assertSegmentLine(t['track-3'], PROJECTED.stockContain, 'segment: line, no outline');
  assert.equal(t['track-3'].outline, null, 'segment: no outline path');

  const rail = pg.page.locator('#below-rail');
  const names = [['track-1', 'Code 1, QR Code', 'https://example.test/one'],
    ['track-2', 'Code 2, QR Code', 'javascript:alert(1)'],
    ['track-3', 'Code 3, Code 128', `${TEXT.segment} STOCK-4827`]];
  for (const [id, name, description] of names) {
    const radio = rail.locator(`[role="radio"][data-target-id="${id}"]`);
    await assertAccessible(radio, { name, description }, `${id} radio`);
  }

  const selectedAfter = async (label, act) => {
    await pg.eval(() => {
      window.h.overlay.select(null);
      window.h.outside.focus();
    });
    await act();
    const state = await pg.state();
    assert.deepEqual([state.selected, state.mode], ['track-2', 'manual'],
      `${label} selects track-2`);
  };
  await selectedAfter('polygon tap', () => tapView(pg, 300, 180));
  await selectedAfter('badge tap', () => tapView(pg, OUTLINE.D.badge.x, OUTLINE.D.badge.y));
  await selectedAfter('Enter on radio 2', async () => {
    await rail.locator('[role="radio"][data-target-id="track-2"]').focus();
    await pg.page.keyboard.press('Enter');
  });

  // Equal-content copies: one detection with two quads.
  const copies = await pg.eval(() => {
    const h = window.h;
    h.overlay.destroy();
    h.create({ mount: 'below' });
    const text = 'https://example.test/one';
    const snapshot = h.step(h.tracker(), [h.detection({ text, payload: h.url(text),
      occurrences: [h.quad(h.rect(160, 80, 640, 320)), h.quad(h.rect(960, 400, 1440, 640))] })], 0);
    return { tracks: snapshot.tracks.map(k => [k.id, k.slot, k.resultId]), targets: h.targets(),
      selected: h.state().selected };
  });
  assert.deepEqual(copies.tracks, [['track-1', 0, 'result-1'], ['track-2', 1, 'result-1']],
    'copies: tracker tracks (precondition)');
  const c = byId(copies.targets);
  assertOutline(c['track-1'], { polygon: QUAD_ONE_ROWS[0].polygon }, 'copy 1');
  assertOutline(c['track-2'], { polygon: PROJECTED.twoContain }, 'copy 2');
  assert.equal(copies.selected, 'track-1', 'copies: automatic selection');
  await pg.page.locator('#below-readout').getByRole('button', { name: TEXT.details }).click();
  const readout = await pg.eval(() => window.h.readout());
  assert.equal(readout.attrs['data-expanded'], 'true', 'copies: details expanded');
  assert.ok(readout.details.join('\n').includes('Same content as Code 2'),
    `copies: details ${JSON.stringify(readout.details)}`);
});

rendered('U17 (T61) an incomplete report holds targets, keeps focus, stays silent', async pg => {
  const ready = await pg.eval(() => {
    const h = window.h;
    h.create({ mount: 'below' });
    h.trackerA = h.tracker();
    h.step(h.trackerA, [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
    h.step(h.trackerA, [h.scene.one(), h.scene.two(), h.scene.stock()], 100);
    h.time.advance(1500);
    return { ids: h.idsByText(), announcer: h.announcer() !== null };
  });
  assert.deepEqual(ready.ids, T59_IDS, 'tracker ids (precondition)');
  assert.ok(ready.announcer, 'announcer present');
  await pg.page.locator('#below-rail [role="radio"][data-target-id="track-2"]').focus();
  const held = await pg.eval(() => {
    const h = window.h;
    h.focused = document.activeElement;
    const watcher = h.watch('announcer', document.querySelector('.qr-camera-announcer'));
    const snapshot = h.step(h.trackerA, [], 200, { complete: false });
    return { states: snapshot.tracks.map(k => k.state), targets: h.targets(), entries: h.entries(),
      readout: h.readout(), state: h.state(), sameFocus: document.activeElement === h.focused,
      focusedId: document.activeElement.getAttribute('data-target-id'), announced: watcher.take() };
  });
  assert.deepEqual(held.states, ['held', 'held', 'held'], 'tracker states (precondition)');
  for (const target of held.targets) {
    assert.equal(target.attrs['data-state'], 'held', `${target.id}: target data-state`);
    assertNear(Number(target.opacity), 0.45, 1e-6, `${target.id}: opacity`);
    assert.ok(target.glow === null || target.glowDisplay === 'none', `${target.id}: glow hidden`);
  }
  assert.equal(held.targets.length, 3, 'three targets');
  for (const entry of held.entries) {
    assert.equal(entry.attrs['data-state'], 'held',
      `${entry.attrs['data-target-id']}: entry data-state`);
  }
  assert.ok(held.readout, 'readout present');
  assert.equal(held.readout.attrs['data-state'], 'held', 'readout data-state');
  assert.equal(held.readout.attrs['data-precise'], 'false', 'readout data-precise');
  assert.ok(held.readout.head.includes(TEXT.inView),
    `readout state text in ${JSON.stringify(held.readout.head)}`);
  const selected = held.state.inspected.targets.filter(k => k.id === held.state.selected)[0];
  assert.equal(selected && selected.stateText, TEXT.inView, 'inspect stateText');
  assert.ok(held.sameFocus, `focus kept on the same node (now ${held.focusedId})`);
  assert.deepEqual(held.announced, [], 'no announcement on held');
  const later = await pg.eval(async () => {
    window.h.time.advance(4000);
    await window.h.settle();
    return window.h.watchers.announcer.take();
  });
  assert.deepEqual(later, [], 'no announcement after 4 s');
});

rendered('U18 (T62a) automatic, keyboard and Earlier selection on the T62 timeline', async pg => {
  const start = await pg.eval(() => {
    const h = window.h;
    h.create({ mount: 'below' });
    h.trackerA = h.tracker();
    h.step(h.trackerA, [h.scene.one(), h.scene.two()], 0);
    h.step(h.trackerA, [h.scene.one(), h.scene.two()], 100);
    return { ids: h.idsByText(), state: h.state(), readout: h.readout() };
  });
  assert.deepEqual(start.ids, { 'https://example.test/one': ['track-1'],
    'javascript:alert(1)': ['track-2'] }, 'tracker ids (precondition)');
  assert.deepEqual([start.state.selected, start.state.mode], ['track-1', 'auto'],
    'automatic selection');
  assert.ok(start.readout, 'readout present');
  assert.equal(start.readout.content, 'https://example.test/one', 'readout content');
  assert.equal(start.readout.url, 'https://example.test/one', 'readout encoded URL');

  const rail = pg.page.locator('#below-rail');
  await rail.locator('[role="radio"][data-target-id="track-1"]').focus();
  await pg.page.keyboard.press('ArrowRight');
  const arrow = await pg.eval(() => ({
    focused: document.activeElement.getAttribute('data-target-id'), state: window.h.state() }));
  assert.equal(arrow.focused, 'track-2', 'ArrowRight moves focus to entry 2');
  assert.deepEqual([arrow.state.selected, arrow.state.mode], ['track-1', 'auto'],
    'ArrowRight leaves the selection');
  await pg.page.keyboard.press('Enter');
  const entered = await pg.state();
  assert.deepEqual([entered.selected, entered.mode], ['track-2', 'manual'],
    'Enter selects entry 2');

  const larger = await pg.eval(() => {
    const h = window.h;
    h.step(h.trackerA, [h.scene.one(), h.scene.big()], 200);
    return { ids: h.idsByText(), state: h.state() };
  });
  assert.deepEqual(larger.ids['https://example.test/big'], ['track-3'],
    'larger code id (precondition)');
  assert.deepEqual([larger.state.selected, larger.state.mode], ['track-2', 'manual'],
    'a larger code does not take a manual selection');

  await pg.eval(() => {
    const h = window.h;
    for (let at = 300; at <= 2000; at += 100) {
      h.step(h.trackerA, [h.scene.one(), h.scene.big()], at);
    }
  });
  await pg.page.locator('#outside').focus();
  const expired = await pg.eval(() => {
    const h = window.h;
    h.selects = [];
    const snapshot = h.step(h.trackerA, [h.scene.one(), h.scene.big()], 2100);
    return { events: snapshot.events.map(e => [e.type, e.trackId, e.reason]), state: h.state(),
      selects: h.selects, readout: h.readout() };
  });
  assert.deepEqual(expired.events, [['expired', 'track-2', 'timeout']],
    'expiry at 2100 (precondition)');
  assert.equal(expired.state.selected, null, '2100: selected');
  assert.deepEqual(expired.selects, [[null, 'result-2']], '2100: onSelect(null, result-2)');
  assert.equal(expired.state.result, 'result-2', '2100: readout result');
  assert.equal(expired.readout && expired.readout.content, 'javascript:alert(1)',
    '2100: readout content');
  assert.ok(expired.readout.head.includes(TEXT.notRecent),
    `2100: readout state in ${JSON.stringify(expired.readout.head)}`);
  assert.deepEqual(sortedIds(expired.state.inspected.declined), ['track-1', 'track-3'],
    '2100: declined');
  assert.equal(expired.state.inspected.held, 'result-2', '2100: held');

  const fresh = await pg.eval(() => {
    const h = window.h;
    h.step(h.trackerA, [h.scene.one(), h.scene.big(), h.scene.fresh()], 2200);
    return { ids: h.idsByText(), state: h.state() };
  });
  assert.deepEqual(fresh.ids['https://example.test/new'], ['track-4'],
    'new content id (precondition)');
  assert.deepEqual([fresh.state.selected, fresh.state.inspected.held], ['track-4', null],
    '2200: new content selected, held cleared');

  const earlier = rail.locator('[role="radio"][data-result-id="result-2"]');
  await assertAccessible(earlier, { name: `QR Code, ${TEXT.notRecent}` },
    'Earlier radio for result-2');
  await earlier.click();
  const picked = await pg.state();
  assert.deepEqual([picked.inspected.selected, picked.mode], ['result-2', 'manual'],
    'Earlier result selected');
  await pg.page.locator('#outside').focus();
  const regained = await pg.eval(() => {
    const h = window.h;
    h.time.advance(600);
    const snapshot = h.step(h.trackerA,
      [h.scene.one(), h.scene.big(), h.scene.fresh(), h.scene.two()], 2300);
    const track = snapshot.tracks
      .filter(k => k.detection.content.text === 'javascript:alert(1)')[0];
    return { track: track ? [track.id, track.slot, track.resultId] : null, state: h.state(),
      entry: h.entry('track-5') };
  });
  assert.deepEqual(regained.track, ['track-5', 3, 'result-2'], 'regained track (precondition)');
  const now = regained.state;
  assert.deepEqual([now.selected, now.mode, now.inspected.selected],
    ['track-5', 'manual', 'track-5'], '2300: the result moves to its live track');
  assert.equal(regained.entry && regained.entry.attrs['aria-checked'], 'true',
    '2300: its radio is checked');
});

// T6 crossing: one content in two copies that cross in a 1000 x 1000 frame, 100 ms apart.
const CROSSING = Object.freeze([[100, 400], [150, 350], [200, 300], [250], [300, 200], [350, 150],
  [400, 100]]);

rendered('U19 (T62b) a crossing declines successors; Escape and epochs reset them', async pg => {
  // Replays the crossing; a manual selection of track-1 is made right after 200 ms.
  const replay = () => pg.eval(xsList => {
    const h = window.h;
    if (h.overlay) h.overlay.destroy();
    h.create({ mount: 'below' });
    h.trackerA = h.tracker();
    return xsList.map((xs, k) => {
      const extra = k === 6 ? [h.scene.fresh(h.rect(700, 700, 800, 800))] : [];
      const snapshot = h.step(h.trackerA, [h.scene.crossing(xs)].concat(extra), 100 * k,
        { width: 1000, height: 1000 });
      if (k === 2) h.overlay.select('track-1');
      return { tracks: snapshot.tracks.map(t => t.id), state: h.state(), targets: h.targets() };
    });
  }, CROSSING);
  const frames = await replay();
  assert.deepEqual(frames.map(f => f.tracks), [['track-1', 'track-2'], ['track-1', 'track-2'],
    ['track-1', 'track-2'], ['track-3'], ['track-4', 'track-5'], ['track-4', 'track-5'],
    ['track-4', 'track-5', 'track-6']], 'tracker tracks (precondition)');
  assert.deepEqual([frames[2].state.selected, frames[2].state.mode], ['track-1', 'manual'],
    '200: manual selection');
  const f300 = frames[3];
  assert.equal(f300.state.selected, null, '300: selected');
  assert.deepEqual(sortedIds(f300.state.inspected.declined), ['track-3'], '300: declined');
  const successor = byId(f300.targets)['track-3'];
  assert.ok(successor, '300: successor target');
  assert.deepEqual([successor.attrs['data-slot'], successor.attrs['data-color'],
    successor.badge && successor.badge.text, successor.attrs['data-cutout']],
  ['2', '2', '3', 'false'], '300: successor slot, color, number and cutout');
  assert.deepEqual(sortedIds(frames[4].state.inspected.declined), ['track-4', 'track-5'],
    '400: declined');
  assert.equal(frames[5].state.selected, null, '500: every live track is declined');
  assert.deepEqual([frames[6].state.selected, frames[6].state.mode], ['track-6', 'auto'],
    '600: the undeclined track is selected');

  await pg.page.locator('#below-rail [role="radio"][aria-checked="true"]').focus();
  await pg.page.keyboard.press('Escape');
  const escaped = await pg.state();
  assert.deepEqual(escaped.inspected.declined, [], 'Escape: declined emptied');
  assert.deepEqual([escaped.mode, escaped.selected], ['auto', 'track-4'],
    'Escape: automatic, first undeclined spatial track');

  await replay();
  const epoch = await pg.eval(() => {
    const h = window.h;
    const before = h.overlay.select('track-6');
    const manual = h.state();
    const code = (text, rect) => h.detection({ text, occurrences: [h.quad(rect)] });
    const snapshot = h.step(h.trackerA, [code('EPOCH-A', h.rect(100, 100, 200, 200)),
      code('EPOCH-B', h.rect(600, 600, 700, 700))], 700, { width: 1000, height: 1000, epoch: 2 });
    return { before, manual, tracks: snapshot.tracks.map(t => t.id), state: h.state() };
  });
  assert.equal(epoch.before, true, 'select(track-6) returns true');
  assert.deepEqual(sortedIds(epoch.manual.inspected.declined), ['track-4', 'track-5'],
    'manual selection keeps the declined set');
  assert.deepEqual(epoch.tracks, ['track-7', 'track-8'], 'epoch tracks (precondition)');
  assert.deepEqual(epoch.state.inspected.declined, [], 'epoch: declined emptied');
  assert.deepEqual([epoch.state.selected, epoch.state.mode], ['track-7', 'auto'],
    'epoch: first tracked track of the new epoch');
});

rendered('U20 (T63) a lost code leaves the scene, then lists as Earlier or goes', async pg => {
  for (const retained of [true, false]) {
    if (!retained) await pg.reload();
    const run = await pg.eval(keep => {
      const h = window.h;
      h.create({ mount: 'below', rail: 'always', retained: keep });
      const tracker = h.tracker({ clock: h.time.clock('tracker'),
        onChange: snapshot => { h.last = snapshot; h.overlay.update(snapshot); } });
      [0, 100, 200, 300].forEach(at => {
        h.time.to(at);
        h.feed(tracker, [h.scene.one()], at);
      });
      const read = () => ({ now: h.time.now(), status: h.last.status,
        tracks: h.last.tracks.map(t => [t.id, t.state]), target: h.target('track-1'),
        entries: h.entries(), readout: h.readout(), state: h.state() });
      h.time.to(1500);
      const lost = read();
      h.time.to(3500);
      const gone = read();
      const divider = document.querySelector('.qr-camera-divider');
      const radio = document.querySelector('[role="radio"][data-result-id="result-1"]');
      gone.divider = divider ? { text: divider.textContent, attrs: h.attrs(divider),
        beforeRadio: Boolean(radio) && Boolean(divider.compareDocumentPosition(radio) &
          Node.DOCUMENT_POSITION_FOLLOWING) } : null;
      gone.results = tracker.snapshot().results.map(r => r.id);
      h.time.advance(1000);
      gone.pending = h.time.pending('overlay');
      return { lost, gone };
    }, retained);
    const label = `retained ${retained}`;
    assert.deepEqual(run.lost.tracks, [['track-1', 'lost']],
      `${label}: lost at 1500 (precondition)`);
    assertNotDrawn(run.lost.target, `${label}: 1500 target`);
    const lostEntry = run.lost.entries.filter(e => e.attrs['data-target-id'] === 'track-1')[0];
    assert.ok(lostEntry, `${label}: 1500 entry`);
    assert.equal(lostEntry.attrs['data-state'], 'lost', `${label}: 1500 entry data-state`);
    assert.equal(lostEntry.caption, TEXT.lost, `${label}: 1500 entry caption`);
    const lostHead = run.lost.readout ? run.lost.readout.head : null;
    assert.ok(lostHead && lostHead.includes(TEXT.lost),
      `${label}: 1500 readout state in ${JSON.stringify(lostHead)}`);
    assert.deepEqual(run.gone.tracks, [], `${label}: expired by 3500 (precondition)`);
    assert.deepEqual(run.gone.results, ['result-1'], `${label}: results`);
    const radios = run.gone.entries;
    if (retained) {
      assert.deepEqual(radios.map(e => e.attrs['data-result-id']), ['result-1'],
        `${label}: Earlier radio`);
      assert.ok(run.gone.divider, `${label}: Earlier divider`);
      assert.equal(run.gone.divider.text, TEXT.earlier, `${label}: divider text`);
      assert.equal(run.gone.divider.attrs['aria-hidden'], 'true', `${label}: divider aria-hidden`);
      assert.ok(run.gone.divider.beforeRadio, `${label}: divider precedes the radio`);
      const radio = pg.page.locator('#below-rail [role="radio"][data-result-id="result-1"]');
      await assertAccessible(radio, { name: `QR Code, ${TEXT.notRecent}` },
        `${label}: Earlier radio`);
    } else {
      assert.deepEqual(radios, [], `${label}: no entry`);
    }
    assert.equal(run.gone.pending, 0, `${label}: overlay timers pending after a further 1000 ms`);
  }
});

rendered('U21 (T64) hostile content stays text; destroy twice leaves no trace', async pg => {
  const HOSTILE = '<img src=x onerror=alert(1)>';
  const before = await pg.eval(() => ({ container: window.h.attrs(window.h.container),
    video: window.h.attrs(window.h.video) }));
  const live = await pg.eval(text => {
    const h = window.h;
    h.create({ mount: 'below' });
    h.trackerA = h.tracker();
    h.step(h.trackerA, [h.detection({ text, payload: h.url('javascript:alert(1)'),
      occurrences: [h.quad(h.rect(160, 80, 640, 320))] })], 0);
    return { readout: h.readout(), links: h.count('a'), images: h.count('img'),
      entries: h.entries(), container: h.attrs(h.container), video: h.attrs(h.video),
      state: h.state() };
  }, HOSTILE);
  assert.equal(live.state.selected, 'track-1', 'the one track is selected');
  assert.ok(live.readout, 'readout present');
  assert.equal(live.readout.content, HOSTILE, 'content is literal text');
  assert.ok(!live.readout.buttons.includes(TEXT.open),
    `no Open button in ${JSON.stringify(live.readout.buttons)}`);
  assert.equal(await pg.page.getByRole('button', { name: TEXT.open }).count(), 0,
    'no Open button by role');
  assert.deepEqual([live.links, live.images], [0, 0], 'no a and no img element');
  assert.deepEqual(live.entries.filter(e => e.visible), [],
    'auto rail hidden for one selected track');
  assert.deepEqual(live.container, before.container, 'container attributes unchanged');
  assert.deepEqual(live.video, before.video, 'video attributes unchanged');

  await pg.settle();
  const after = await pg.eval(() => {
    const h = window.h;
    const errors = [];
    try {
      h.overlay.destroy();
      h.overlay.destroy();
    } catch (error) {
      errors.push(`destroy: ${String(error)}`);
    }
    try {
      h.step(h.trackerA, [h.scene.one()], 100);
    } catch (error) {
      errors.push(`update: ${String(error)}`);
    }
    return { errors, select: h.overlay.select('track-1'), destroyed: h.overlay.destroyed,
      leftovers: h.leftovers(), container: h.attrs(h.container), video: h.attrs(h.video) };
  });
  assert.deepEqual(after.errors, [], 'destroy twice and update after destroy do not throw');
  assert.equal(after.destroyed, true, 'destroyed');
  assert.equal(after.select, false, 'select after destroy returns false');
  assert.deepEqual(after.leftovers, [], 'nothing left after destroy and a late update');
  assert.deepEqual(after.container, before.container,
    'container attributes unchanged after destroy');
  assert.deepEqual(after.video, before.video, 'video attributes unchanged after destroy');
  await pg.settle();
  assert.deepEqual(pg.dialogs, [], 'no dialog');
  assert.deepEqual(pg.requests, [], 'no request off the harness origin');
});

rendered('U22 (T64a, T65) teardown orders, remount, snapshot checks and ordering', async pg => {
  for (const order of permutations(['stop', 'destroyTracker', 'destroyOverlay'])) {
    const label = order.join(', ');
    const run = await pg.eval(async steps => {
      const h = window.h;
      const errors = [];
      const stack = h.stack();
      await stack.camera.start();
      await h.pump(stack, 1000);
      const drawn = h.targets().map(t => [t.attrs['data-drawn'], t.polygon]);
      for (const step of steps) {
        try {
          stack[step]();
        } catch (error) {
          errors.push(`${step}: ${String(error)}`);
        }
        await h.task();
      }
      await h.pump(stack, 3000);
      await h.settle();
      return { drawn, errors, record: stack.record, pending: h.time.pendingList(),
        leftovers: h.leftovers(), camera: stack.camera.state };
    }, order);
    assert.deepEqual(run.drawn, [['outline', QUAD_ONE_ROWS[0].polygon]],
      `${label}: drawn before teardown`);
    assert.deepEqual(run.errors.concat(run.record.errors), [], `${label}: no exception`);
    assert.equal(run.camera, 'stopped', `${label}: camera stopped`);
    assert.deepEqual(run.pending, [], `${label}: no pending timer`);
    assert.deepEqual(run.leftovers, [], `${label}: no node left`);
    assert.equal(run.record.changesAfterDestroy, 0, `${label}: no tracker change after destroy`);
    assert.equal(run.record.selectsAfterDestroy, 0, `${label}: no onSelect after destroy`);
  }

  // StrictMode: mount, unmount before the camera starts, mount again.
  const strict = await pg.eval(async () => {
    const h = window.h;
    const first = h.stack();
    const starting = first.camera.start();
    const firstEpoch = first.camera.epoch;
    first.stop();
    first.destroyTracker();
    first.destroyOverlay();
    await starting.catch(() => {});
    const second = h.stack();
    await second.camera.start();
    await h.pump(second, 1000);
    const out = { firstEpoch, secondEpoch: second.camera.epoch, first: first.record,
      drawn: h.targets().map(t => [t.attrs['data-drawn'], t.polygon]), second: second.record };
    second.stop();
    second.destroyTracker();
    second.destroyOverlay();
    await h.settle();
    out.pending = h.time.pendingList();
    out.leftovers = h.leftovers();
    return out;
  });
  assert.ok(strict.secondEpoch > strict.firstEpoch,
    `remount epoch ${strict.secondEpoch} above ${strict.firstEpoch}`);
  assert.deepEqual(strict.drawn, [['outline', QUAD_ONE_ROWS[0].polygon]],
    'remount: second instance draws');
  assert.deepEqual([strict.first.changesAfterDestroy, strict.first.selectsAfterDestroy], [0, 0],
    'remount: first instance silent after destroy');
  assert.deepEqual(strict.first.errors.concat(strict.second.errors), [], 'remount: no error');
  assert.deepEqual([strict.pending, strict.leftovers], [[], []], 'remount: clean teardown');

  const invalid = await pg.eval(() => {
    const h = window.h;
    h.create();
    return [[], {}].map(value => {
      try {
        h.overlay.update(value);
        return 'no throw';
      } catch (error) {
        return `${error && error.name}: ${error && error.message}`;
      }
    });
  });
  invalid.forEach((message, i) => assert.match(message, /^TypeError: .*TrackerSnapshot/,
    `update(${i === 0 ? '[]' : '{}'})`));

  const ordering = await pg.eval(() => {
    const h = window.h;
    h.overlay.destroy();
    h.create();
    const scene = () => h.targets().map(t => [t.id, t.attrs['data-drawn'], t.polygon]);
    const view = () => ({ state: h.state(), scene: scene() });
    const a = h.tracker();
    const at = (detections, time) => h.feed(a, detections, time, { epoch: 5 });
    h.overlay.update(at([h.scene.one(), h.scene.two()], 0));
    const selected = h.overlay.select('track-2');
    let s1900 = null;
    for (let time = 100; time <= 1900; time += 100) {
      s1900 = at([h.scene.one()], time);
      h.overlay.update(s1900);
    }
    const s2000 = at([h.scene.one(), h.scene.fresh()], 2000);
    const s2100 = at([h.scene.one(), h.scene.fresh()], 2100);
    h.overlay.update(s2100);
    const applied = view();
    const stale = h.feed(h.tracker(), [h.scene.two()], 50, { epoch: 4 });
    h.overlay.update(stale);
    const afterEpoch = view();
    h.overlay.update(s1900);
    const afterTime = view();
    h.overlay.update(h.destroyedSnapshot(s2100));
    const destroyed = view();
    h.overlay.clear();
    h.overlay.update(stale);
    const cleared = view();
    return { selected, skipped: s2000.events.map(e => [e.type, e.trackId, e.reason || e.cause]),
      ids2100: h.idsByText(s2100), applied, afterEpoch, afterTime, destroyed, cleared };
  });
  assert.equal(ordering.selected, true, 'select(track-2)');
  assert.deepEqual(ordering.skipped,
    [['expired', 'track-2', 'timeout'], ['entered', 'track-3', 'new']],
    'skipped snapshot events (precondition)');
  assert.deepEqual(ordering.ids2100, { 'https://example.test/one': ['track-1'],
    'https://example.test/new': ['track-3'] }, 'ids at 2100 (precondition)');
  const applied = ordering.applied.state;
  assert.deepEqual([applied.selected, applied.mode], [null, 'auto'],
    'vanished selection: none, auto');
  assert.deepEqual(sortedIds(applied.inspected.declined), ['track-1', 'track-3'],
    'vanished selection without an event declines the new ids');
  const selection = state => [state.selected, state.mode, sortedIds(state.inspected.declined)];
  for (const [name, view, ignored] of [['epoch 4 after 5', ordering.afterEpoch, [1, 'stale_epoch']],
    ['earlier now', ordering.afterTime, [2, 'stale_time']]]) {
    const counted = view.state.inspected.ignored;
    assert.deepEqual([counted.count, counted.last], ignored, `${name}: ignored`);
    assert.deepEqual(view.scene, ordering.applied.scene, `${name}: scene unchanged`);
    assert.deepEqual(selection(view.state), selection(applied), `${name}: selection unchanged`);
  }
  assert.deepEqual(ordering.destroyed.scene, [], 'destroyed snapshot empties the scene');
  assert.equal(ordering.cleared.scene.length, 1, 'after clear(): the older snapshot is applied');
  assertPoints(ordering.cleared.scene[0][2], PROJECTED.twoContain, 'after clear(): polygon');
  assert.equal(ordering.cleared.state.inspected.ignored.count, 2,
    'after clear(): ignored count kept');
});

// Applies a reference row to the video's style and media size, re-reads the layout and returns
// the target of the given content.
const readRows = (pg, rows, text, transform = 'transform') => pg.eval(args => {
  const [list, content, property] = args;
  const h = window.h;
  const ids = h.idsByText();
  const id = ids[content] ? ids[content][0] : null;
  // Cleared first: a value the engine rejects leaves the property empty instead of keeping
  // the previous row's value.
  const setStyle = (name, value) => {
    h.video.style.removeProperty(name);
    h.video.style.setProperty(name, value);
    return h.video.style.getPropertyValue(name) !== '';
  };
  return list.map(row => {
    h.setMediaSize(row.media[0], row.media[1]);
    const accepted = [setStyle('object-fit', row.fit),
      setStyle('object-position', row.position)];
    h.video.style.removeProperty('transform');
    h.video.style.removeProperty('scale');
    if (row.mirror) {
      h.video.style.setProperty(property, property === 'scale' ? '-1 1' : 'scaleX(-1)');
    }
    h.overlay.layout();
    const target = id && h.target(id);
    return { id, accepted, alignment: h.overlay.alignment,
      drawn: target ? target.attrs['data-drawn'] : null,
      polygon: target ? target.polygon : null,
      fraction: target ? target.attrs['data-visible-fraction'] : null };
  });
}, [rows, text, transform]);

function assertRows(results, rows, label) {
  rows.forEach((row, i) => {
    const name = `${label} ${row.fit} ${row.position}${row.mirror ? ' mirrored' : ''} ` +
      `${row.media.join('x')}`;
    const got = results[i];
    assert.deepEqual(got.accepted, [true, true],
      `${name}: object-fit and object-position accepted on the video (precondition)`);
    assert.ok(got.id, `${name}: no track (precondition)`);
    assert.equal(got.alignment, 'aligned', `${name}: alignment`);
    assertPoints(got.polygon, row.polygon, name);
    assertFraction(got.fraction, row.fraction, name);
  });
}

rendered('U23 object-fit, object-position and mirror rows match the table', async pg => {
  await pg.eval(() => {
    const h = window.h;
    h.create();
    h.step(h.tracker(), [h.scene.one(), h.scene.perspective()], 0);
  });
  const quads = await readRows(pg, QUAD_ONE_ROWS, 'https://example.test/one');
  assertRows(quads, QUAD_ONE_ROWS, 'quad one:');
  const perspective = await readRows(pg, PERSPECTIVE_ROWS, 'https://example.test/perspective');
  assertRows(perspective, PERSPECTIVE_ROWS, 'perspective:');
});

rendered('U24 unsupported layouts report alignment, draw nothing, keep the rail', async (pg, t) => {
  const setup = await pg.eval(() => {
    const h = window.h;
    h.setMediaSize(1600, 800);
    h.create({ mount: 'below' });
    h.trackerA = h.tracker();
    h.step(h.trackerA, [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
    return { ids: h.idsByText(), viewBox: CSS.supports('object-view-box', 'inset(10%)') };
  });
  assert.deepEqual(setup.ids, T59_IDS, 'tracker ids (precondition)');
  // Each case sets one layout, reads it, undoes it and reads the restored state.
  const check = (name, apply, undo) => pg.eval(([applySource, undoSource]) => {
    const h = window.h;
    const read = () => {
      const one = h.idsByText()['https://example.test/one'];
      const target = one ? h.target(one[0]) : null;
      return { alignment: h.overlay.alignment, attr: h.attrs(h.root())['data-alignment'],
        drawn: h.targets()
          .filter(k => k.paths + k.polygons + k.lines.length + k.dots > 0 || k.badge)
          .map(k => k.id),
        groups: h.targets().length,
        hits: h.hits(), radios: h.entries().filter(e => e.visible).length,
        polygon: target ? target.polygon : null };
    };
    (0, eval)(`(${applySource})`)(h);
    h.overlay.layout();
    const applied = read();
    (0, eval)(`(${undoSource})`)(h);
    h.overlay.layout();
    return { applied, restored: read() };
  }, [apply.toString(), undo.toString()]).then(result => {
    assert.equal(result.applied.attr, result.applied.alignment, `${name}: data-alignment`);
    assert.deepEqual([result.applied.drawn, result.applied.groups, result.applied.hits], [[], 0, 0],
      `${name}: nothing drawn (no g.qr-camera-target, no hit shape)`);
    assert.equal(result.applied.radios, 3, `${name}: rail keeps three entries`);
    assert.equal(result.restored.alignment, 'aligned', `${name}: restored`);
    assertPoints(result.restored.polygon, QUAD_ONE_ROWS[0].polygon, `${name}: restored polygon`);
    return result.applied.alignment;
  });

  // [name, apply in the page, undo in the page, expected alignment]
  const cases = [
    ['video rotate(90deg)', h => { h.video.style.transform = 'rotate(90deg)'; },
      h => { h.video.style.transform = ''; }, 'unsupported-transform'],
    ['object-view-box inset(10%)',
      h => { h.video.style.setProperty('object-view-box', 'inset(10%)'); },
      h => { h.video.style.removeProperty('object-view-box'); }, 'object-view-box'],
    ['computed fit foo', h => { h.restoreStyle = h.stubVideoStyle({ objectFit: 'foo' }); },
      h => { h.restoreStyle(); }, 'unsupported-fit'],
    // Engines resolve em in a real computed object-position: only a stub keeps one.
    ['computed position 1em 2em',
      h => { h.restoreStyle = h.stubVideoStyle({ objectPosition: '1em 2em' }); },
      h => { h.restoreStyle(); }, 'unsupported-position'],
    ['object-fit none without a media size', h => {
      h.clearMediaSize();
      h.video.style.objectFit = 'none';
    }, h => {
      h.video.style.objectFit = '';
      h.setMediaSize(1600, 800);
    }, 'no-media'],
    ['object-fit scale-down without a media size', h => {
      h.clearMediaSize();
      h.video.style.objectFit = 'scale-down';
    }, h => {
      h.video.style.objectFit = '';
      h.setMediaSize(1600, 800);
    }, 'no-media'],
    ['container scaleX(-1), padding-left 40', h => {
      h.container.style.transform = 'scaleX(-1)';
      h.container.style.paddingLeft = '40px';
    }, h => {
      h.container.style.transform = '';
      h.container.style.paddingLeft = '';
    }, 'unsupported-transform'],
    ['ancestor rotate(90deg)', h => { h.stage.style.transform = 'rotate(90deg)'; },
      h => { h.stage.style.transform = ''; }, 'unsupported-transform'],
  ];
  for (const [name, apply, undo, expected] of cases) {
    if (name.startsWith('object-view-box') && !setup.viewBox) {
      t.diagnostic(`${pg.engine}: object-view-box is not supported, case not run`);
      continue;
    }
    assert.equal(await check(name, apply, undo), expected, name);
  }

  // The video's own border and padding place the root: the left ones, or the right ones when
  // the video is mirrored. left is measured from the container's padding edge.
  const padded = await pg.eval(() => {
    const h = window.h;
    const style = h.video.style;
    style.borderLeft = '10px solid #444';
    style.paddingLeft = '30px';
    style.borderRight = '2px solid #444';
    style.paddingRight = '6px';
    const read = mirrored => {
      style.transform = mirrored ? 'scaleX(-1)' : '';
      h.overlay.layout();
      const one = h.idsByText()['https://example.test/one'];
      const target = one ? h.target(one[0]) : null;
      const container = h.container.getBoundingClientRect();
      const border = parseFloat(getComputedStyle(h.container).borderLeftWidth) || 0;
      const root = h.rootRect();
      return { alignment: h.overlay.alignment, root, box: h.contentBox(h.video, mirrored),
        left: root ? root.left - container.left - border : null,
        polygon: target ? target.polygon : null };
    };
    const out = { plain: read(false), mirrored: read(true) };
    ['transform', 'border-left', 'padding-left', 'border-right', 'padding-right']
      .forEach(name => style.removeProperty(name));
    h.overlay.layout();
    out.restored = h.rootRect();
    out.box = h.contentBox(h.video);
    return out;
  });
  for (const [key, left, polygon] of [['plain', 60, QUAD_ONE_ROWS[0].polygon],
    ['mirrored', 28, '360,70 240,70 240,130 360,130']]) {
    const run = padded[key], label = `video border 10 + padding 30 left, 2 + 6 right, ${key}`;
    assert.equal(run.alignment, 'aligned', `${label}: alignment`);
    assertNear(run.left, left, 0.01, `${label}: root left from the container padding edge`);
    assertRect(run.root, run.box, 0.01, `${label}: root on the video content box`);
    assertNear(run.root.width, 400, 0.01, `${label}: root width`);
    assertNear(run.root.height, 300, 0.01, `${label}: root height`);
    assertPoints(run.polygon, polygon, `${label}: polygon`);
  }
  assertRect(padded.restored, padded.box, 0.01, 'border and padding removed: root on the video');

  const mismatch = await pg.eval(() => {
    const h = window.h;
    const codes = () => [h.scene.one(), h.scene.two(), h.scene.stock()];
    h.step(h.trackerA, codes(), 100, { width: 800, height: 1600 });
    const rotated = { alignment: h.overlay.alignment,
      drawn: h.targets().filter(k => k.badge).length, hits: h.hits(),
      radios: h.entries().filter(e => e.visible).length };
    h.step(h.trackerA, codes(), 200);
    const one = h.idsByText()['https://example.test/one'];
    const target = one ? h.target(one[0]) : null;
    return { rotated, alignment: h.overlay.alignment, polygon: target ? target.polygon : null };
  });
  assert.deepEqual(mismatch.rotated, { alignment: 'frame-mismatch', drawn: 0, hits: 0, radios: 3 },
    '800 x 1600 frame on 1600 x 800 media');
  assert.equal(mismatch.alignment, 'aligned', 'a matching frame restores alignment');
  assertPoints(mismatch.polygon, QUAD_ONE_ROWS[0].polygon, 'matching frame polygon');

  const scaled = await pg.eval(() => {
    const h = window.h;
    h.stage.style.transform = 'scale(0.5)';
    h.stage.style.transformOrigin = '0 0';
    h.overlay.layout();
    const one = h.idsByText()['https://example.test/one'];
    const target = one ? h.target(one[0]) : null;
    return { alignment: h.overlay.alignment, polygon: target ? target.polygon : null,
      root: h.rootRect(), box: h.contentBox(h.video) };
  });
  assert.equal(scaled.alignment, 'aligned', 'ancestor scale(0.5)');
  assertPoints(scaled.polygon, QUAD_ONE_ROWS[0].polygon, 'ancestor scale(0.5): polygon');
  assertRect(scaled.box, { left: 12, top: 12, width: 200, height: 150 }, 0.01,
    'ancestor scale(0.5): video content box');
  assertRect(scaled.root, scaled.box, 0.01, 'ancestor scale(0.5): root on the video');
});

rendered('U25 mirroring follows transforms, the option, class toggles and epochs', async pg => {
  await pg.eval(() => {
    const h = window.h;
    h.setMediaSize(1600, 800);
    h.create();
    h.trackerA = h.tracker();
    h.step(h.trackerA, [h.scene.one()], 0);
  });
  const mirrored = QUAD_ONE_ROWS.filter(row => row.mirror);
  assert.equal(mirrored.length, 4, 'mirrored reference rows');
  const byTransform = await readRows(pg, mirrored, 'https://example.test/one', 'transform');
  assertRows(byTransform, mirrored, 'scaleX(-1):');
  const byScale = await readRows(pg, mirrored, 'https://example.test/one', 'scale');
  assertRows(byScale, mirrored, 'scale -1 1:');

  const forced = await pg.eval(() => {
    const h = window.h;
    h.overlay.setOptions({ mirror: false });
    h.video.style.removeProperty('scale');
    h.video.style.transform = 'scaleX(-1)';
    h.video.style.objectFit = 'cover';
    const polygonAt = position => {
      h.video.style.objectPosition = position;
      h.overlay.layout();
      const target = h.target('track-1');
      return [h.overlay.alignment, target ? target.polygon : null];
    };
    const out = { center: polygonAt('50% 50%'), left: polygonAt('0% 50%') };
    h.overlay.setOptions({ mirror: 'auto' });
    h.video.style.transform = 'rotate(180deg)';
    h.overlay.layout();
    out.rotated = [h.overlay.alignment, h.hits()];
    return out;
  });
  assert.equal(forced.center[0], 'aligned', 'mirror false: alignment');
  assertPoints(forced.center[1], '-40,30 140,30 140,120 -40,120', 'mirror false, cover 50% 50%');
  assertPoints(forced.left[1], '60,30 240,30 240,120 60,120', 'mirror false, cover 0% 50%');
  assert.deepEqual(forced.rotated, ['unsupported-transform', 0], 'rotate(180deg)');

  // A class toggle is observed without layout().
  const toggled = await pg.eval(async () => {
    const h = window.h;
    h.video.style.transform = '';
    h.video.style.objectPosition = '50% 50%';
    h.overlay.layout();
    const plain = h.target('track-1');
    h.video.classList.add('mirrored');
    await h.settle();
    const flipped = h.target('track-1');
    h.video.classList.remove('mirrored');
    await h.settle();
    const back = h.target('track-1');
    return { plain: plain && plain.polygon, flipped: flipped && flipped.polygon,
      back: back && back.polygon, alignment: h.overlay.alignment };
  });
  assertPoints(toggled.plain, '-40,30 140,30 140,120 -40,120', 'before the class toggle');
  assertPoints(toggled.flipped, '440,30 260,30 260,120 440,120', 'class mirrored, no layout()');
  assertPoints(toggled.back, '-40,30 140,30 140,120 -40,120', 'class removed, no layout()');

  // A stylesheet-only change is read on the next epoch, not on a same-epoch update.
  const sheet = await pg.eval(() => {
    const h = window.h;
    h.sheet.textContent = '#capture video{transform:scaleX(-1)}';
    const polygonOf = snapshot => {
      const ids = h.idsByText(snapshot)['https://example.test/one'];
      const target = ids ? h.target(ids[0]) : null;
      return target ? target.polygon : null;
    };
    const same = polygonOf(h.step(h.trackerA, [h.scene.one()], 100));
    const next = polygonOf(h.step(h.trackerA, [h.scene.one()], 200, { epoch: 2 }));
    return { same, next, alignment: h.overlay.alignment };
  });
  assertPoints(sheet.same, '-40,30 140,30 140,120 -40,120', 'same-epoch update keeps the layout');
  assert.equal(sheet.alignment, 'aligned', 'epoch change: alignment');
  assertPoints(sheet.next, '440,30 260,30 260,120 440,120', 'epoch change re-reads the style');
});

rendered('U26 each geometry kind draws its honest marker', async pg => {
  const run = await pg.eval(() => {
    const h = window.h;
    h.create({ mount: 'below', rail: 'always' });
    const code = (text, occurrences, symbology) => h.detection({ text, occurrences, symbology });
    const tiny = code('TINY', [h.quad(h.rect(1000, 100, 1020, 112))]);
    const lost = code('LOST', [h.quad(h.rect(960, 400, 1440, 640))]);
    const held = code('HELD', [h.quad(h.rect(1100, 80, 1500, 280))]);
    const partial = code('0950110153001',
      [h.partial([{ x: 800, y: 600 }, { x: 900, y: 620 }, { x: 850, y: 700 }])], 'data_bar');
    const content = code('A40156B', undefined, 'codabar');
    const tracker = h.tracker();
    const always = () => [h.scene.one(), h.scene.stock(), partial, tiny, content];
    h.step(tracker, always().concat([lost, held]), 0);
    h.step(tracker, always().concat([held]), 100);
    const snapshot = h.step(tracker, always(), 200);
    return { tracks: snapshot.tracks.map(k => [k.detection.content.text, k.id, k.state, k.basis,
      k.geometry ? k.geometry.kind : null]), targets: h.targets(), entries: h.entries(),
    inspected: h.state().inspected.targets };
  });
  assert.deepEqual(run.tracks, [
    ['TINY', 'track-1', 'tracked', 'spatial', 'quad'],
    ['HELD', 'track-2', 'held', 'spatial', 'quad'],
    ['https://example.test/one', 'track-3', 'tracked', 'spatial', 'quad'],
    ['LOST', 'track-4', 'lost', 'spatial', null],
    ['0950110153001', 'track-5', 'tracked', 'spatial', 'partial'],
    ['STOCK-4827', 'track-6', 'tracked', 'spatial', 'segment'],
    ['A40156B', 'track-7', 'tracked', 'content', null],
  ], 'tracker tracks (precondition)');
  const t = byId(run.targets);
  const inspected = byId(run.inspected);
  const entry = id => run.entries.filter(e => e.attrs['data-target-id'] === id)[0];
  const drawn = Object.keys(inspected).sort().map(id => [id, inspected[id].drawn]);
  assert.deepEqual(drawn, [['track-1', 'points'], ['track-2', 'outline'], ['track-3', 'outline'],
    ['track-4', 'none'], ['track-5', 'points'], ['track-6', 'line'], ['track-7', 'none']],
  'inspect drawn kinds');

  assert.equal(t['track-1'] && t['track-1'].attrs['data-drawn'], 'points', 'area-15 quad: points');
  assert.equal(t['track-1'].dots, 4, 'area-15 quad: four dots');
  assert.equal(t['track-1'].outline, null, 'area-15 quad: no outline');
  assert.equal(entry('track-1') && entry('track-1').caption, TEXT.partial, 'area-15 quad: caption');
  assertOutline(t['track-2'], {}, 'held quad');
  assertNear(Number(t['track-2'].opacity), 0.45, 1e-6, 'held quad: opacity');
  assert.ok(t['track-2'].glow === null || t['track-2'].glowDisplay === 'none',
    'held quad: no glow');
  assertOutline(t['track-3'], { polygon: QUAD_ONE_ROWS[0].polygon }, 'tracked quad');
  assertNotDrawn(t['track-4'] || null, 'lost quad');
  assert.equal(inspected['track-4'].stateText, TEXT.lost, 'lost quad: state text');
  assert.equal(entry('track-4') && entry('track-4').caption, TEXT.lost, 'lost quad: caption');
  assert.equal(t['track-5'] && t['track-5'].attrs['data-drawn'], 'points', 'partial: points');
  assert.equal(t['track-5'].dots, 3, 'partial: three dots');
  assert.equal(entry('track-5') && entry('track-5').caption, TEXT.partial, 'partial: caption');
  assertSegmentLine(t['track-6'], PROJECTED.stockContain, 'segment');
  assert.equal(entry('track-6') && entry('track-6').caption, TEXT.segment, 'segment: caption');
  assertNotDrawn(t['track-7'] || null, 'content track');
  assert.equal(entry('track-7') && entry('track-7').caption, TEXT.none, 'content track: caption');
  assert.equal(inspected['track-7'].stateText, TEXT.readNow, 'content track: state text');
});

rendered('U27 an off-view code gets an edge badge that reads and selects', async pg => {
  const run = await pg.eval(() => {
    const h = window.h;
    h.video.style.objectFit = 'cover';
    h.create({ mount: 'below' });
    h.overlay.layout();
    h.trackerA = h.tracker();
    h.step(h.trackerA, [h.scene.edge(), h.scene.two()], 0);
    return { ids: h.idsByText(), target: h.target('track-1'), entry: h.entry('track-1'),
      readout: h.readout(), state: h.state() };
  });
  assert.deepEqual(run.ids, { 'https://example.test/edge': ['track-1'],
    'javascript:alert(1)': ['track-2'] }, 'tracker ids (precondition)');
  assert.ok(run.target, 'edge target');
  assert.equal(run.target.attrs['data-drawn'], 'edge', 'data-drawn');
  assertFraction(run.target.attrs['data-visible-fraction'], 0, 'edge fraction');
  assert.ok(run.target.badge, 'edge badge');
  assertPoint(run.target.badge.center, PROJECTED.edgeBadge, 0.05, 'edge badge center');
  assert.equal(run.target.badge.attrs['data-offscreen'], 'true', 'badge data-offscreen');
  assert.equal(run.state.selected, 'track-1', 'automatic selection');
  assert.equal(run.entry && run.entry.caption, TEXT.offscreen, 'rail caption');
  assert.ok(run.readout && run.readout.head.includes(TEXT.offscreen),
    `readout state in ${JSON.stringify(run.readout && run.readout.head)}`);
  const spoken = await pg.eval(async () => {
    window.h.time.advance(300);
    await window.h.settle();
    return window.h.announcer() && window.h.announcer().text;
  });
  assert.equal(spoken, `Code 1, QR Code, URL, ${TEXT.offscreen}`, 'announcer');
  await pg.eval(() => window.h.overlay.select('track-2'));
  await tapView(pg, PROJECTED.edgeBadge.x, PROJECTED.edgeBadge.y);
  const tapped = await pg.state();
  assert.deepEqual([tapped.selected, tapped.mode], ['track-1', 'manual'],
    'a tap on the edge badge');
});

// The close pair of the region references, in 1600 x 800 frame px, and its view vertices.
const PAIR_FRAME = Object.freeze([[400, 200, 640, 440], [660, 200, 900, 440]]);
const PAIR_VIEW = Object.freeze([[100, 100, 160, 160], [165, 100, 225, 160]]
  .map(([x0, y0, x1, y1]) => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 },
    { x: x0, y: y1 }]));
const cutoutOf = (fx, id) => fx.targets.filter(k => k.id === id)[0] || null;

rendered('U28 cutouts: precise quads, close pairs, holds, scan lines, time steps', async pg => {
  const run = await pg.eval(() => {
    const h = window.h;
    h.create();
    const tracker = h.tracker();
    h.step(tracker, [h.scene.one()], 0);
    const frame1 = h.fx();
    h.overlay.update(tracker.advance(50));
    const step1 = h.fx();
    h.step(tracker, [h.scene.one()], 100);
    const frame2 = h.fx();
    h.overlay.update(tracker.advance(150));
    const step2 = h.fx();
    for (let at = 200; at <= 700; at += 100) h.step(tracker, [h.scene.one()], at);
    return { ids: h.idsByText(), frame1, step1, frame2, step2, active: h.fx() };
  });
  assert.deepEqual(run.ids, { 'https://example.test/one': ['track-1'] }, 'ids (precondition)');
  assert.deepEqual(clipHoles(run.frame1.clip, 'frame 1'), [], 'frame 1: no hole');
  assert.equal(cutoutOf(run.frame1, 'track-1').cutout, false, 'frame 1: cutout');
  assert.deepEqual(clipHoles(run.step1.clip, 'time step before inclusion'), [],
    'a time step does not include a quad that was not included');
  const regionA = `${VIEW_FRAME_PATH} ${OUTLINE.A.region}`;
  assert.equal(run.frame2.clip, regionA, 'frame 2: clip');
  assert.deepEqual(cutoutOf(run.frame2, 'track-1'),
    { id: 'track-1', cutout: true, margin: 9, drawn: 'outline' }, 'frame 2: cutout at margin 9');
  assert.equal(run.step2.clip, regionA, 'a time step keeps an included hole');
  const active = run.active;
  assert.equal(active.effects.active, true, 'active past the dwell (precondition)');
  for (const name of ['scrim', 'wash']) {
    assert.ok(active[name], `${name} layer`);
    assert.equal(active[name].d, regionA, `${name}: d is the region`);
    assert.equal(active[name].attrs['data-active'], 'true', `${name}: data-active`);
  }
  assert.ok(active.blur, 'blur layer');
  assert.equal(active.blur.attrs['data-active'], 'true', 'blur: data-active');
  if (active.blurState !== 'unsupported') {
    assert.match(active.blur.clipPath, /evenodd/, 'blur clip-path is even-odd');
    assertSameNumbers(active.blur.clipPath, regionA, 'blur clip-path');
  }

  const overlap = await pg.eval(() => {
    const h = window.h;
    h.overlay.destroy();
    h.create({ focus: 'all' });
    const tracker = h.tracker();
    const code = (text, rect) => h.detection({ text, occurrences: [h.quad(rect)] });
    const codes = [code('OVERLAP-A', h.rect(160, 80, 640, 320)),
      code('OVERLAP-B', h.rect(480, 240, 960, 480))];
    for (let at = 0; at <= 1000; at += 100) h.step(tracker, codes, at);
    return { ids: h.idsByText(), fx: h.fx() };
  });
  assert.equal(Object.keys(overlap.ids).length, 2, 'overlap: two tracks (precondition)');
  assert.deepEqual(clipHoles(overlap.fx.clip, 'overlap'), [], 'overlap: no hole');
  assert.deepEqual(overlap.fx.targets.map(k => k.cutout), [false, false], 'overlap: no cutout');
  assert.equal(overlap.fx.effects.active, false, 'overlap: effects inactive under all');
  assert.equal(overlap.fx.effects.activations, 0, 'overlap: never activated');

  const pair = await pg.eval(rects => {
    const h = window.h;
    h.overlay.destroy();
    h.create();
    const tracker = h.tracker();
    const codes = rects.map((r, i) => h.detection({ text: `PAIR-${i + 1}`,
      occurrences: [h.quad(h.rect(r[0], r[1], r[2], r[3]))] }));
    h.step(tracker, codes, 0);
    const snapshot = h.step(tracker, codes, 100);
    return { slots: snapshot.tracks.map(k => [k.detection.content.text, k.id, k.slot]),
      fx: h.fx() };
  }, PAIR_FRAME);
  const bySlot = pair.slots.slice().sort((a, b) => a[2] - b[2]);
  const regionOf = { 'PAIR-1': OUTLINE.pair.S1, 'PAIR-2': OUTLINE.pair.S2 };
  assert.equal(pair.fx.focus, 'all', 'pair: automatic focus resolves to all');
  assert.equal(pair.fx.clip,
    [VIEW_FRAME_PATH].concat(bySlot.map(row => regionOf[row[0]])).join(' '),
    'pair: clip with S1 and S2 in slot order');
  for (const [text, id] of pair.slots) {
    assert.deepEqual(cutoutOf(pair.fx, id), { id, cutout: true, margin: OUTLINE.pair.margin,
      drawn: 'outline' }, `${text}: margin 2`);
  }
  const probes = await pg.eval(([s1, s2, quads]) => [window.h.pathProbe(s1, quads[0]),
    window.h.pathProbe(s2, quads[1])], [OUTLINE.pair.S1, OUTLINE.pair.S2, PAIR_VIEW]);
  probes.forEach((probe, i) => assert.deepEqual(probe.inside, [true, true, true, true],
    `pair: every vertex of quad ${i + 1} inside its hole`));
  const gap = probes[1].box.x - (probes[0].box.x + probes[0].box.width);
  assert.ok(gap >= 0.99, `pair: holes separated (gap ${gap})`);

  const reduced = await pg.eval(() => {
    const h = window.h;
    h.overlay.destroy();
    h.create();
    const tracker = h.tracker();
    h.step(tracker, [h.scene.one()], 0);
    h.step(tracker, [h.scene.one()], 100);
    const included = h.fx();
    const states = h.step(tracker, [], 200, { complete: false }).tracks.map(k => k.state);
    const held = h.fx();
    h.overlay.destroy();
    h.create();
    const lines = h.tracker();
    const seen = [0, 100, 200].map(at => {
      h.step(lines, [h.scene.stock()], at);
      return h.fx();
    });
    return { included, held, states, seen };
  });
  assert.equal(reduced.included.clip, regionA, 'held: included before the hold (precondition)');
  assert.deepEqual(reduced.states, ['held'], 'held: tracker state (precondition)');
  assert.deepEqual(clipHoles(reduced.held.clip, 'held'), [], 'held: no hole');
  assert.equal(cutoutOf(reduced.held, 'track-1').cutout, false, 'held: cutout');
  reduced.seen.forEach((fx, i) => {
    assert.deepEqual(clipHoles(fx.clip, `segment ${i}`), [], `segment frame ${i}: no hole`);
    assert.deepEqual(fx.targets.map(k => [k.drawn, k.cutout]), [['line', false]],
      `segment frame ${i}: a line without a cutout`);
  });
});

rendered('U29 focus modes choose the holes; effects stay honest past the dwell', async pg => {
  const manual = await pg.eval(() => {
    const h = window.h;
    h.create();
    const tracker = h.tracker();
    const codes = () => [h.scene.one(), h.scene.two()];
    h.step(tracker, codes(), 0);
    h.step(tracker, codes(), 100);
    const both = h.fx();
    const selected = h.overlay.select('track-2');
    for (let at = 200; at <= 1000; at += 100) h.step(tracker, codes(), at);
    return { ids: h.idsByText(), both, selected, fx: h.fx(), state: h.state() };
  });
  assert.deepEqual(manual.ids, { 'https://example.test/one': ['track-1'],
    'javascript:alert(1)': ['track-2'] }, 'ids (precondition)');
  assert.equal(manual.both.clip, `${VIEW_FRAME_PATH} ${OUTLINE.A.region} ${OUTLINE.D.region}`,
    'automatic selection: both holes');
  assert.equal(manual.selected, true, 'select(track-2)');
  assert.deepEqual([manual.state.selected, manual.state.mode], ['track-2', 'manual'],
    'manual selection');
  assert.equal(manual.fx.focus, 'selected', 'manual: focus resolves to selected');
  assert.equal(manual.fx.root['data-focus'], 'selected', 'manual: data-focus');
  assert.equal(manual.fx.clip, `${VIEW_FRAME_PATH} ${OUTLINE.D.region}`, 'manual: one hole');
  assert.equal(manual.fx.effects.active, true, 'manual: active past the dwell');
  assert.equal(manual.fx.scrim && manual.fx.scrim.attrs['data-active'], 'true',
    'manual: scrim data-active');

  const off = await pg.eval(() => {
    const h = window.h;
    h.overlay.destroy();
    h.create({ focus: 'off' });
    const tracker = h.tracker();
    for (let at = 0; at <= 1000; at += 100) h.step(tracker, [h.scene.one(), h.scene.two()], at);
    return { fx: h.fx(), targets: h.targets(), glow: [h.paint('track-1'), h.paint('track-2')]
      .map(p => (p && p.glow ? [p.glow.display, Number(p.glow.opacity)] : null)) };
  });
  assert.equal(off.fx.focus, 'off', 'off: focus');
  assert.deepEqual(clipHoles(off.fx.clip, 'off'), [], 'off: no hole');
  assert.deepEqual([off.fx.effects.active, off.fx.effects.activations], [false, 0],
    'off: never active');
  for (const name of ['blur', 'scrim', 'wash']) {
    assert.equal(off.fx[name] && off.fx[name].attrs['data-active'], 'false',
      `off: ${name} data-active`);
  }
  const offTargets = byId(off.targets);
  assertOutline(offTargets['track-1'], { bracket: OUTLINE.A.bracket }, 'off: marker 1 stays');
  assertOutline(offTargets['track-2'], { bracket: OUTLINE.D.bracket }, 'off: marker 2 stays');
  assert.ok(off.glow[0] && off.glow[0][0] !== 'none', 'off: selected glow shown');
  assertNear(off.glow[0][1], 0.7, 1e-6, 'off: selected glow opacity');
  assertNear(off.glow[1] && off.glow[1][1], 0.42, 1e-6, 'off: other glow opacity (0.6 x 0.7)');

  const result = await pg.eval(() => {
    const h = window.h;
    h.overlay.destroy();
    h.create({ focus: 'selected', mount: 'below' });
    const tracker = h.tracker({ staleMs: 100, reacquireMs: 200 });
    const codes = at => (at <= 100 ? [h.scene.one(), h.scene.two()] : [h.scene.two()]);
    for (let at = 0; at <= 300; at += 100) h.step(tracker, codes(at), at);
    const results = h.last.results.map(r => [r.id, r.trackIds.slice()]);
    const selected = h.overlay.select('result-1');
    for (let at = 400; at <= 1500; at += 100) h.step(tracker, codes(at), at);
    return { results, selected, fx: h.fx(), state: h.state() };
  });
  assert.deepEqual(result.results, [['result-1', []], ['result-2', ['track-2']]],
    'ResultId: results at 300 (precondition)');
  assert.equal(result.selected, true, 'select(result-1)');
  assert.deepEqual([result.state.inspected.selected, result.state.mode], ['result-1', 'manual'],
    'ResultId selected');
  assert.deepEqual(clipHoles(result.fx.clip, 'ResultId'), [], 'ResultId: no hole');
  assert.equal(result.fx.effects.active, false, 'ResultId: inactive');

  const imprecise = await pg.eval(() => {
    const h = window.h;
    h.overlay.destroy();
    h.video.style.objectFit = 'cover';
    h.create();
    const tracker = h.tracker();
    const codes = () => [h.scene.one(),
      h.detection({ text: 'CENTER', occurrences: [h.quad(h.rect(800, 200, 1200, 500))] })];
    h.step(tracker, codes(), 0);
    h.step(tracker, codes(), 100);
    const ids = h.idsByText();
    const selected = h.overlay.select(ids['https://example.test/one'][0]);
    for (let at = 200; at <= 1500; at += 100) h.step(tracker, codes(), at);
    const out = { ids, selected, fx: h.fx(), targets: h.targets() };
    h.overlay.destroy();
    h.video.style.objectFit = '';
    return out;
  });
  const one = imprecise.ids['https://example.test/one'][0];
  const center = imprecise.ids.CENTER[0];
  const coverTargets = byId(imprecise.targets);
  assert.equal(imprecise.selected, true, 'imprecise: select');
  assert.equal(coverTargets[one].attrs['data-precise'], 'false', 'imprecise: selected target');
  assert.equal(coverTargets[center].attrs['data-precise'], 'true', 'imprecise: other target');
  assert.deepEqual(clipHoles(imprecise.fx.clip, 'imprecise'), [], 'imprecise: no hole');
  assert.equal(imprecise.fx.effects.active, false, 'imprecise selected target: inactive');

  const lines = await pg.eval(() => {
    const h = window.h;
    h.create({ focus: 'all' });
    const tracker = h.tracker();
    for (let at = 0; at <= 1500; at += 100) h.step(tracker, [h.scene.one(), h.scene.stock()], at);
    return { ids: h.idsByText(), fx: h.fx() };
  });
  const qr = lines.ids['https://example.test/one'][0];
  assert.equal(cutoutOf(lines.fx, qr).cutout, true, 'QR + segment: the QR has its cutout');
  assert.deepEqual([lines.fx.effects.active, lines.fx.effects.activations], [false, 0],
    'QR + segment under all: inactive');

  const content = await pg.eval(() => {
    const h = window.h;
    h.overlay.destroy();
    h.create({ focus: 'all' });
    const tracker = h.tracker();
    const codes = () => [h.scene.one(), h.detection({ symbology: 'codabar', text: 'A40156B' })];
    for (let at = 0; at <= 700; at += 100) h.step(tracker, codes(), at);
    const before = h.fx();
    const id = h.idsByText().A40156B[0];
    const selected = h.overlay.select(id);
    h.step(tracker, codes(), 800);
    const after = h.fx();
    for (let at = 900; at <= 2000; at += 100) h.step(tracker, codes(), at);
    return { id, basis: h.last.tracks.filter(k => k.id === id)[0].basis, selected, before, after,
      later: h.fx(), state: h.state() };
  });
  assert.equal(content.basis, 'content', 'content track (precondition)');
  assert.equal(content.before.effects.active, true, 'precise QR alone: active (precondition)');
  assert.equal(content.selected, true, 'select the content track');
  assert.equal(content.state.selected, content.id, 'content track selected');
  assert.equal(content.after.effects.active, false, 'content track selected: inactive');
  assert.equal(content.later.effects.active, false, 'content track selected: stays inactive');
});

// Path bounding box from the coordinate pairs of a bracket (exact for axis-aligned quads).
function pairBox(d) {
  const n = numbersOf(String(d).replace(/[A-Za-z]/g, ' '));
  const xs = n.filter((v, i) => i % 2 === 0), ys = n.filter((v, i) => i % 2 === 1);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys) };
}

rendered('U30 effect values, ranges, atomic setOptions, blur support, resize mid-fade',
  async pg => {
    const values = await pg.eval(() => {
      const h = window.h;
      h.create({ effects: { dim: 0.5, blur: 6, wash: 0.2, glow: 0.8 } });
      h.trackerA = h.tracker();
      for (let at = 0; at <= 700; at += 100) {
        h.step(h.trackerA, [h.scene.one(), h.scene.two()], at);
      }
      const root = h.root();
      const custom = (selector, name) => {
        const el = root.querySelector(selector);
        return el ? getComputedStyle(el).getPropertyValue(name).trim() : null;
      };
      return { fx: h.fx(), glow: [h.paint('track-1'), h.paint('track-2')],
        supported: CSS.supports('clip-path', 'path(evenodd, "M0 0")') &&
          (CSS.supports('backdrop-filter', 'blur(1px)') ||
            CSS.supports('-webkit-backdrop-filter', 'blur(1px)')),
        vars: { dim: custom('path.qr-camera-scrim', '--qr-camera-dim'),
          wash: custom('path.qr-camera-wash', '--qr-camera-wash'),
          blur: custom('.qr-camera-blur', '--qr-camera-blur'),
          selected: custom('path.qr-camera-glow', '--qr-camera-glow-selected'),
          other: custom('path.qr-camera-glow', '--qr-camera-glow-other') } };
    });
    const fx = values.fx;
    assert.equal(fx.effects.active, true, 'active past the dwell (precondition)');
    assertNear(Number(values.vars.dim), 0.5, 1e-9, '--qr-camera-dim');
    assertNear(Number(values.vars.wash), 0.2, 1e-9, '--qr-camera-wash');
    assert.equal(values.vars.blur, '6px', '--qr-camera-blur');
    assertNear(Number(values.vars.selected), 0.8, 1e-9, '--qr-camera-glow-selected');
    assertNear(Number(values.vars.other), 0.48, 1e-9, '--qr-camera-glow-other');
    assertNear(Number(fx.scrim.fillOpacity), 0.5, 1e-6, 'scrim fill-opacity');
    assertNear(Number(fx.wash.fillOpacity), 0.2, 1e-6, 'wash fill-opacity');
    assert.deepEqual(parseColor(fx.wash.fill).slice(0, 3),
      parseColor(TRACK_COLOR_HEX[0]).slice(0, 3), 'wash color is the selected track color');
    assertNear(Number(values.glow[0].glow.opacity), 0.8, 1e-6, 'selected glow opacity');
    assertNear(Number(values.glow[1].glow.opacity), 0.48, 1e-6, 'other glow opacity');
    assert.equal(fx.blurState === 'unsupported', !values.supported,
      `inspect().blur ${fx.blurState} against CSS.supports ${values.supported}`);
    if (values.supported) {
      assert.equal(fx.blurState, 'on', 'blur 6 while active: on');
      assert.equal(fx.blur.backdrop, 'blur(6px)', 'backdrop-filter');
    }

    const atomic = await pg.eval(() => {
      const h = window.h;
      const before = { fx: h.fx(), inspected: JSON.stringify(h.overlay.inspect()) };
      let error = null;
      try {
        h.overlay.setOptions({ effects: { dim: 0.3, blur: 99 } });
      } catch (caught) {
        error = caught && caught.name;
      }
      const after = { fx: h.fx(), inspected: JSON.stringify(h.overlay.inspect()) };
      h.overlay.setOptions({ effects: { blur: 0 } });
      return { before, after, error, zero: h.fx() };
    });
    assert.equal(atomic.error, 'RangeError', 'setOptions with blur 99');
    assert.deepEqual(atomic.after, atomic.before, 'a rejected setOptions changes nothing');
    assert.equal(atomic.zero.root['data-blur'], '0', 'blur 0: data-blur');
    assert.equal(atomic.zero.blur.display, 'none', 'blur 0: blur layer not displayed');
    assert.notEqual(atomic.zero.blurState, 'on', 'blur 0: inspect().blur is not on');
    assertNear(Number(atomic.zero.scrim.fillOpacity), 0.5, 1e-6, 'blur 0 keeps dim 0.5');

    const created = await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      let error = null;
      try {
        h.create({ effects: { dim: 0.9 } });
      } catch (caught) {
        error = caught && caught.name;
      }
      return { error, leftovers: h.leftovers() };
    });
    assert.equal(created.error, 'RangeError', 'createCameraOverlay with dim 0.9');
    assert.deepEqual(created.leftovers, [], 'a rejected creation leaves nothing');
    await fadeAndResize(pg.engine);
  });

// Activation fades in on a page without reduced motion; a resize lands mid-fade. Every frame
// sampled afterwards carries one consistent size in viewBox, region, clip and filter regions.
async function fadeAndResize(engine) {
  await withPage(engine, { reducedMotion: 'no-preference' }, async pg => {
    const run = await pg.eval(async () => {
      const h = window.h;
      h.create();
      const tracker = h.tracker();
      for (let at = 0; at <= 500; at += 100) h.step(tracker, [h.scene.one()], at);
      const before = h.overlay.inspect().effects.active;
      h.step(tracker, [h.scene.one()], 600);
      const root = h.root();
      const scrim = root.querySelector('path.qr-camera-scrim');
      const fading = scrim && scrim.getAnimations ? scrim.getAnimations().length : null;
      [h.container, h.video].forEach(el => {
        el.style.width = '360px';
        el.style.height = '270px';
      });
      const read = () => {
        const blur = root.querySelector('.qr-camera-blur');
        const style = getComputedStyle(blur);
        return { viewBox: root.querySelector('svg.qr-camera-scene').getAttribute('viewBox'),
          scrim: root.querySelector('path.qr-camera-scrim').getAttribute('d'),
          wash: root.querySelector('path.qr-camera-wash').getAttribute('d'),
          clip: h.overlay.inspect().clip, blurClip: style.clipPath || style.webkitClipPath || '',
          filters: Array.from(root.querySelectorAll('filter')).map(f => ({ id: f.id,
            box: ['x', 'y', 'width', 'height'].map(k => Number(f.getAttribute(k))) })),
          glows: Array.from(root.querySelectorAll('path.qr-camera-glow')).map(p => ({
            filter: p.getAttribute('filter'), d: p.getAttribute('d') })) };
      };
      const samples = [read()];
      for (let i = 0; i < 12; i += 1) {
        await new Promise(resolve => requestAnimationFrame(() => resolve()));
        samples.push(read());
      }
      await h.settle();
      samples.push(read());
      return { before, after: h.overlay.inspect().effects.active, fading,
        unsupported: h.overlay.inspect().blur === 'unsupported', samples };
    });
    assert.deepEqual([run.before, run.after], [false, true], 'activation at 600 (precondition)');
    // The resize is applied in the activation's task: a running fade proves it lands mid-fade.
    assert.ok(typeof run.fading === 'number' && run.fading >= 1,
      `a fade runs on the scrim when the resize lands (precondition): ${run.fading} animation(s)`);
    run.samples.forEach((s, i) => {
      const label = `frame sample ${i}`;
      const size = /^0 0 ([\d.]+) ([\d.]+)$/.exec(s.viewBox);
      assert.ok(size, `${label}: viewBox ${s.viewBox}`);
      const frame = `M0 0H${size[1]}V${size[2]}H0Z`;
      assert.ok(typeof s.clip === 'string' && s.clip.indexOf(`${frame} M`) === 0,
        `${label}: clip ${s.clip} does not start with the frame of viewBox ${s.viewBox}`);
      assert.equal(s.scrim, s.clip, `${label}: scrim d is the clip`);
      assert.equal(s.wash, s.clip, `${label}: wash d is the clip`);
      if (!run.unsupported) assertSameNumbers(s.blurClip, s.clip, `${label}: blur clip-path`);
      s.glows.forEach(glow => {
        const id = /url\(#([^)]+)\)/.exec(glow.filter || '');
        const filter = id ? s.filters.filter(f => f.id === id[1])[0] : null;
        assert.ok(filter, `${label}: glow filter ${glow.filter}`);
        const box = pairBox(glow.d);
        [box.x - 12, box.y - 12, box.width + 24, box.height + 24].forEach((v, k) =>
          assertNear(filter.box[k], v, 0.1, `${label}: filter region ${k} of ${filter.id}`));
      });
    });
    const last = run.samples[run.samples.length - 1];
    assert.equal(last.viewBox, '0 0 360 270', 'after the resize: viewBox');
    assert.equal(last.clip.split(/ (?=M)/).length, 2, 'after the resize: the hole is kept');
  });
}

// Two codes past the dwell with mounted parts; returns animations, layer styles and borders.
const emulatedScene = (pg, settings = {}) => pg.eval(async options => {
  const h = window.h;
  h.create(Object.assign({ mount: 'below' }, options));
  const tracker = h.tracker();
  for (let at = 0; at <= 700; at += 100) h.step(tracker, [h.scene.one(), h.scene.two()], at);
  await h.settle();
  const owned = el => Boolean(el && el.closest &&
    (el.closest('[data-qr-camera-overlay]') || el.closest('[data-qr-camera-part]')));
  const root = h.root();
  const display = selector => Array.from(root.querySelectorAll(selector))
    .map(el => getComputedStyle(el).display);
  const checked = document.querySelector('#below-rail [role="radio"][aria-checked="true"]');
  const border = checked ? getComputedStyle(checked) : null;
  // A system color resolves under the color-scheme where it is used: the probe sits beside
  // the checked radio, in the part's scheme, not in the light-scheme page body.
  let highlight = null;
  if (checked) {
    const probe = document.createElement('span');
    probe.style.color = 'Highlight';
    checked.parentNode.appendChild(probe);
    highlight = getComputedStyle(probe).color;
    probe.remove();
  }
  return { active: h.overlay.inspect().effects.active, motion: h.attrs(root)['data-motion'],
    animations: document.getAnimations ? document.getAnimations()
      .filter(a => owned(a.effect && a.effect.target)).length : 0,
    moving: Array.from(root.querySelectorAll('.qr-camera-blur, .qr-camera-scrim, ' +
      '.qr-camera-wash, g.qr-camera-target')).map(el => {
      const s = getComputedStyle(el);
      return [el.getAttribute('class'), s.animationName, s.transitionDuration];
    }),
    layers: { blur: display('.qr-camera-blur'), scrim: display('path.qr-camera-scrim'),
      wash: display('path.qr-camera-wash'), glow: display('path.qr-camera-glow') },
    highlight, border: border ? [border.borderTopWidth, border.borderTopStyle,
      border.borderTopColor] : null,
    media: { forced: matchMedia('(forced-colors: active)').matches,
      transparency: matchMedia('(prefers-reduced-transparency: reduce)').matches } };
}, settings);

function assertStill(run, label) {
  assert.equal(run.active, true, `${label}: effects active (precondition)`);
  assert.equal(run.animations, 0, `${label}: no running overlay animation`);
  for (const [name, animation, transition] of run.moving) {
    assert.equal(animation, 'none', `${label}: ${name} animation-name`);
    assert.match(transition, /^0s(, 0s)*$/, `${label}: ${name} transition-duration`);
  }
}

rendered('U31 reduced motion, forced colors and reduced transparency', async (pg, t) => {
  const still = await emulatedScene(pg);
  assert.equal(still.motion, 'auto', 'motion auto: data-motion');
  assertStill(still, 'prefers-reduced-motion');
  await withPage(pg.engine, { reducedMotion: 'no-preference' }, async calm => {
    const run = await emulatedScene(calm, { motion: 'reduce' });
    assert.equal(run.motion, 'reduce', "motion 'reduce': data-motion");
    assertStill(run, "motion 'reduce'");
  });

  await withPage(pg.engine, { forcedColors: 'active' }, async forced => {
    const run = await emulatedScene(forced);
    if (!run.media.forced) {
      t.diagnostic(`${pg.engine}: forced-colors emulation is not active, case not run`);
      return;
    }
    for (const name of ['blur', 'scrim', 'wash', 'glow']) {
      assert.ok(run.layers[name].length > 0, `forced colors: ${name} present`);
      run.layers[name].forEach(value => assert.equal(value, 'none', `forced colors: ${name}`));
    }
    assert.ok(run.border, 'forced colors: a checked radio');
    assert.deepEqual(run.border, ['3px', 'solid', run.highlight],
      'forced colors: checked radio border 3 px Highlight');
  });

  if (pg.engine !== 'chromium') {
    t.diagnostic(`${pg.engine}: reduced transparency is emulated through Chromium CDP only`);
    return;
  }
  await withPage(pg.engine, {}, async clear => {
    const session = await clear.context.newCDPSession(clear.page);
    await session.send('Emulation.setEmulatedMedia', { features: [
      { name: 'prefers-reduced-transparency', value: 'reduce' },
      { name: 'prefers-reduced-motion', value: 'reduce' }] });
    const run = await emulatedScene(clear);
    await session.detach().catch(() => {});
    if (!run.media.transparency) {
      t.diagnostic('chromium: prefers-reduced-transparency did not match, case not run');
      return;
    }
    for (const name of ['blur', 'glow']) {
      assert.ok(run.layers[name].length > 0, `reduced transparency: ${name} present`);
      run.layers[name].forEach(value =>
        assert.equal(value, 'none', `reduced transparency: ${name}`));
    }
  });
});

const rgb = text => parseColor(text).slice(0, 3);

rendered('U32 sixteen tracks: colors by slot, digits 1-9, overrides and monochrome', async pg => {
  const run = await pg.eval(() => {
    const h = window.h;
    h.create({ mount: 'below' });
    h.trackerA = h.tracker();
    // A 4 x 4 grid of 60 x 30 view px codes (frame = view x 4, view y - 50 x 4).
    const codes = [];
    for (let i = 0; i < 16; i += 1) {
      const x = 40 + (i % 4) * 90, y = 60 + Math.floor(i / 4) * 45;
      codes.push(h.detection({ text: `CODE-${i + 1}`,
        occurrences: [h.quad(h.rect(x * 4, (y - 50) * 4, (x + 60) * 4, (y - 20) * 4))] }));
    }
    const snapshot = h.step(h.trackerA, codes, 0);
    return { tracks: snapshot.tracks.map(k => [k.id, k.slot]), targets: h.targets(),
      entries: h.entries(), paint: snapshot.tracks.map(k => [k.id, h.paint(k.id)]) };
  });
  assert.deepEqual(run.tracks.map(k => k[1]).sort((a, b) => a - b),
    Array.from({ length: 16 }, (v, i) => i), 'sixteen tracks in slots 0-15 (precondition)');
  const ids = run.tracks.map(k => k[0]);
  const idAt = Object.fromEntries(run.tracks.map(([id, slot]) => [slot, id]));
  const targets = byId(run.targets);
  const entries = byId(run.entries.map(e => Object.assign({ id: e.attrs['data-target-id'] }, e)));
  const paint = Object.fromEntries(run.paint);
  for (const [id, slot] of run.tracks) {
    const color = String(slot % 8), number = String(slot + 1);
    assert.ok(targets[id] && entries[id], `${id}: target and entry`);
    assert.equal(targets[id].attrs['data-color'], color, `${id}: target data-color`);
    assert.equal(targets[id].badge && targets[id].badge.text, number, `${id}: badge number`);
    assert.equal(entries[id].attrs['data-color'], color, `${id}: entry data-color`);
    assert.equal(entries[id].number, number, `${id}: entry number`);
    assert.equal(entries[id].attrs['aria-keyshortcuts'], slot < 9 ? number : undefined,
      `${id}: aria-keyshortcuts`);
    assert.deepEqual(rgb(paint[id].outline.stroke), rgb(TRACK_COLOR_HEX[slot % 8]),
      `${id}: outline stroke`);
  }
  assert.deepEqual([targets[idAt[8]].attrs['data-color'], targets[idAt[8]].badge.text], ['0', '9'],
    'slot 8: color 0, number 9');
  assert.deepEqual([targets[idAt[15]].attrs['data-color'], targets[idAt[15]].badge.text],
    ['7', '16'], 'slot 15: color 7, number 16');

  await pg.page.locator(`#below-rail [role="radio"][data-target-id="${idAt[0]}"]`).focus();
  await pg.page.keyboard.press('9');
  const nine = await pg.state();
  assert.deepEqual([nine.selected, nine.mode], [idAt[8], 'manual'], 'digit 9 selects code 9');
  await pg.page.keyboard.press('0');
  assert.equal((await pg.state()).selected, idAt[8], 'digit 0 selects nothing');

  const override = await pg.eval(list => {
    const h = window.h;
    h.sheet.textContent = ':root{--qr-scanner-color-2:#00FF00}';
    const out = list.map(id => [id, h.paint(id).outline.stroke]);
    h.sheet.textContent = '';
    return out;
  }, ids);
  for (const [id, stroke] of override) {
    const slot = run.tracks.filter(k => k[0] === id)[0][1];
    assert.deepEqual(rgb(stroke), slot % 8 === 2 ? [0, 255, 0] : rgb(TRACK_COLOR_HEX[slot % 8]),
      `${id}: stroke with --qr-scanner-color-2 overridden`);
  }

  const mono = await pg.eval(list => {
    const h = window.h;
    h.overlay.setOptions({ colors: 'mono' });
    const root = h.root();
    // CanvasText resolved in the root's color-scheme, where the numerals are drawn.
    const probe = document.createElement('span');
    probe.style.color = 'CanvasText';
    root.appendChild(probe);
    const canvasText = getComputedStyle(probe).color;
    probe.remove();
    const out = { root: h.attrs(root), selected: h.state().selected,
      text: getComputedStyle(root).color, canvasText,
      paint: list.map(id => [id, h.paint(id)]),
      colors: h.targets().map(k => k.attrs['data-color'])
        .concat(h.entries().map(e => e.attrs['data-color'])) };
    h.sheet.textContent = ':root{--qr-scanner-text:#102030}';
    out.token = list.map(id => {
      const part = h.paint(id);
      return [id, part && part.numeral ? part.numeral.fill : null];
    });
    h.sheet.textContent = '';
    return out;
  }, ids);
  assert.equal(mono.root['data-colors'], 'mono', 'mono: data-colors');
  assert.deepEqual(Array.from(new Set(mono.colors)), ['mono'], 'mono: every data-color');
  assert.deepEqual(rgb(mono.text), rgb(mono.canvasText),
    'mono: the text color falls back to CanvasText in the root scheme');
  for (const [id, part] of mono.paint) {
    const selected = id === mono.selected;
    assert.deepEqual(rgb(part.outline.stroke), rgb(MONO_HEX), `mono ${id}: stroke`);
    assertNear(parseFloat(part.outline.strokeWidth), selected ? 3 : 2.25, 1e-6,
      `mono ${id}: stroke width`);
    if (selected) {
      assert.deepEqual(rgb(part.ring.fill), rgb(MONO_HEX), `mono ${id}: selected badge filled`);
    } else {
      assert.notDeepEqual(rgb(part.ring.fill), rgb(MONO_HEX), `mono ${id}: badge hollow`);
      assert.deepEqual(rgb(part.ring.stroke), rgb(MONO_HEX), `mono ${id}: hollow badge ring`);
      // The hollow disc takes the surface, so its numeral takes the text color, not the
      // highlight (#F5F7FA reaches only 1.07:1 on a light surface).
      assert.deepEqual(rgb(part.numeral.fill), rgb(mono.text),
        `mono ${id}: hollow badge numeral in the text color`);
    }
  }
  const hollow = mono.token.filter(([id]) => id !== mono.selected);
  assert.equal(hollow.length, 15, 'mono: fifteen hollow badges (precondition)');
  for (const [id, fill] of hollow) {
    assert.deepEqual(rgb(fill), [16, 32, 48], `mono ${id}: --qr-scanner-text reaches the numeral`);
  }
});

rendered('U33 badge anchors, three-digit numbers and the clamp above the controls', async pg => {
  const a = await pg.eval(() => {
    const h = window.h;
    h.create({ mount: 'below' });
    h.step(h.tracker(), [h.scene.one()], 0);
    const target = h.target('track-1');
    h.overlay.destroy();
    h.video.style.objectFit = 'cover';
    h.create({ mount: 'below', mirror: true });
    h.step(h.tracker(), [h.scene.one()], 0);
    const mirrored = h.target('track-1');
    h.overlay.destroy();
    h.video.style.objectFit = '';
    return { a: target && target.badge, b: mirrored && mirrored.badge };
  });
  assertPoint(a.a && a.a.center, OUTLINE.A.badge, 0.05, 'badge A');
  assertPoint(a.b && a.b.center, OUTLINE.B.badge, 0.05, 'badge B, clamped to the view');

  const big = await pg.eval(() => {
    const h = window.h;
    h.create({ mount: 'below' });
    h.overlay.update(h.snap({ tracks: [{ id: 'track-100', slot: 99, kind: 'quad',
      points: h.rect(160, 80, 640, 320), detection: h.scene.one() }] }));
    const out = { target: h.target('track-100'), paint: h.paint('track-100') };
    h.overlay.destroy();
    return out;
  });
  assert.ok(big.target && big.target.badge, 'slot 99: badge');
  assert.equal(big.target.badge.text, '100', 'slot 99: number 100');
  assert.equal(big.paint.numeral.fontSize, '10px', 'three digits: 10 px numeral');
  assert.equal(big.target.attrs['data-color'], '3', 'slot 99: color 99 % 8');

  const low = await pg.eval(() => {
    const h = window.h;
    h.create();
    const code = h.detection({ text: 'LOW', occurrences: [h.quad([{ x: 600, y: 800 },
      { x: 600, y: 640 }, { x: 1000, y: 640 }, { x: 1000, y: 800 }])] });
    h.step(h.tracker(), [code, h.scene.one()], 0);
    const inspected = h.overlay.inspect();
    return { ids: h.idsByText(), targets: h.targets(), controls: inspected.controlsHeight,
      arrangement: inspected.arrangement, size: h.attrs(h.root())['data-qr-camera-size'] };
  });
  assert.deepEqual([low.arrangement, low.size], ['compact', 'compact'], 'compact arrangement');
  assert.equal(low.controls, VIEW.compactControls, 'in-video controls height');
  const limit = VIEW.height - 12 - low.controls;
  for (const target of low.targets) {
    assert.ok(target.badge && target.badge.center, `${target.id}: badge`);
    assert.ok(target.badge.center.y <= limit + 0.05,
      `${target.id}: badge y ${target.badge.center.y} above the controls (${limit})`);
  }
  const lowTarget = byId(low.targets)[low.ids.LOW[0]];
  assertPoint(lowTarget.badge.center, { x: 134.6, y: 224 }, 0.05, 'badge of the low code clamped');
});

/** Presses a key; returns focus, whether keydown was prevented or reached document, state. */
async function press(pg, key) {
  await pg.eval(() => {
    const h = window.h;
    h.keyLog = { event: null, bubbled: false };
    if (h.keyHooked) return;
    h.keyHooked = true;
    window.addEventListener('keydown', event => { h.keyLog.event = event; }, true);
    document.addEventListener('keydown', () => { h.keyLog.bubbled = true; });
  });
  await pg.page.keyboard.press(key);
  return pg.eval(() => {
    const h = window.h, el = document.activeElement, event = h.keyLog.event;
    const readout = h.readout();
    return { focused: el ? el.getAttribute('data-target-id') || el.getAttribute('data-result-id') ||
      el.id || el.tagName.toLowerCase() : null,
    prevented: event ? event.defaultPrevented : null, bubbled: h.keyLog.bubbled,
    content: readout ? readout.content : null, state: h.state() };
  });
}

const railEntry = (pg, id, scope = '#below-rail') =>
  pg.page.locator(`${scope} [role="radio"][data-target-id="${id}"]`);

rendered('U34 keyboard: one tab stop, arrows, Enter, Space, digits, Escape, RTL, Previous/Next',
  async pg => {
    const ready = await pg.eval(() => {
      const h = window.h;
      const before = document.createElement('button');
      before.id = 'before';
      before.type = 'button';
      before.textContent = 'Before';
      h.below.insertBefore(before, h.railSlot);
      h.create({ mount: 'below' });
      h.trackerA = h.tracker();
      h.step(h.trackerA, [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
      return { ids: h.idsByText(), entries: h.entries(h.railSlot), state: h.state() };
    });
    assert.deepEqual(ready.ids, T59_IDS, 'tracker ids (precondition)');
    assert.deepEqual([ready.state.selected, ready.state.mode], ['track-1', 'auto'],
      'automatic selection (precondition)');
    const stops = list => list.filter(e => e.attrs.tabindex === '0')
      .map(e => e.attrs['data-target-id']);
    assert.deepEqual(stops(ready.entries), ['track-1'], 'one tabindex=0, on the checked entry');
    assert.deepEqual(ready.entries.map(e => e.attrs['aria-keyshortcuts']), ['1', '2', '3'],
      'aria-keyshortcuts');

    await pg.page.locator('#before').focus();
    assert.equal((await press(pg, 'Tab')).focused, 'track-1', 'Tab: the checked entry');
    await press(pg, 'Tab');
    assert.equal(await pg.eval(() => window.h.readoutSlot.contains(document.activeElement)), true,
      'second Tab: the readout controls');

    await railEntry(pg, 'track-1').focus();
    for (const [key, focus] of [['ArrowRight', 'track-2'], ['End', 'track-3'],
      ['ArrowRight', 'track-3'], ['Home', 'track-1'], ['ArrowLeft', 'track-1'],
      ['ArrowRight', 'track-2']]) {
      const moved = await press(pg, key);
      assert.equal(moved.focused, focus, `${key}: focus`);
      assert.deepEqual([moved.state.selected, moved.state.mode], ['track-1', 'auto'],
        `${key}: selection unchanged`);
      assert.equal(moved.content, 'https://example.test/one', `${key}: readout unchanged`);
      const entries = await pg.eval(() => window.h.entries(window.h.railSlot));
      assert.equal(stops(entries).length, 1, `${key}: one tabindex=0`);
    }
    const entered = await press(pg, 'Enter');
    assert.deepEqual([entered.state.selected, entered.state.mode], ['track-2', 'manual'],
      'Enter checks entry 2');
    await press(pg, 'ArrowRight');
    const spaced = await press(pg, 'Space');
    assert.deepEqual([spaced.state.selected, spaced.state.mode], ['track-3', 'manual'],
      'Space checks entry 3');
    const digit = await press(pg, '2');
    assert.deepEqual([digit.state.selected, digit.state.mode], ['track-2', 'manual'],
      'digit 2 selects Code 2');

    const consumed = await press(pg, 'Escape');
    assert.deepEqual([consumed.prevented, consumed.bubbled], [true, false],
      'manual: Escape prevented and stopped');
    assert.deepEqual([consumed.state.selected, consumed.state.mode], ['track-1', 'auto'],
      'manual: Escape returns to automatic');
    const passed = await press(pg, 'Escape');
    assert.deepEqual([passed.prevented, passed.bubbled], [false, true],
      'auto, nothing declined: Escape not handled');
    assert.deepEqual([passed.state.selected, passed.state.mode], ['track-1', 'auto'],
      'auto, nothing declined: selection unchanged');

    await pg.eval(() => document.activeElement.blur());
    const body = await press(pg, '2');
    assert.equal(body.focused, 'body', 'focus on body (precondition)');
    assert.deepEqual([body.state.selected, body.state.mode], ['track-1', 'auto'],
      'a digit on body does nothing');
    await pg.page.locator('#outside').focus();
    const outside = await press(pg, '3');
    assert.equal(outside.state.selected, 'track-1', 'a digit outside the parts does nothing');

    const declined = await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      h.create({ mount: 'below' });
      h.trackerA = h.tracker({ staleMs: 100, reacquireMs: 200 });
      h.step(h.trackerA, [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
      h.overlay.select('track-2');
      h.step(h.trackerA, [h.scene.one(), h.scene.stock()], 100);
      const snapshot = h.step(h.trackerA, [h.scene.one(), h.scene.stock()], 200);
      return { expired: snapshot.events.filter(e => e.type === 'expired')
        .map(e => [e.trackId, e.reason]), state: h.state() };
    });
    assert.deepEqual(declined.expired, [['track-2', 'timeout']], 'expiry (precondition)');
    assert.deepEqual(sortedIds(declined.state.inspected.declined), ['track-1', 'track-3'],
      'declined set (precondition)');
    assert.deepEqual([declined.state.selected, declined.state.mode], [null, 'auto'],
      'every live track declined (precondition)');
    await railEntry(pg, 'track-1').focus();
    const reset = await press(pg, 'Escape');
    assert.deepEqual([reset.prevented, reset.bubbled], [true, false],
      'auto with a declined set: Escape prevented and stopped');
    assert.deepEqual(reset.state.inspected.declined, [], 'Escape empties the declined set');
    assert.deepEqual([reset.state.selected, reset.state.mode], ['track-1', 'auto'],
      'Escape: automatic choice again');

    // Parts mounted in a modal dialog: a consumed Escape keeps it open, a passed one closes it.
    await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      const dialog = document.createElement('dialog');
      dialog.id = 'dialog';
      ['dialog-rail', 'dialog-readout'].forEach(id => {
        const div = document.createElement('div');
        div.id = id;
        dialog.appendChild(div);
      });
      document.body.appendChild(dialog);
      dialog.showModal();
      h.create({ mount: { rail: document.getElementById('dialog-rail'),
        readout: document.getElementById('dialog-readout') } });
      h.trackerA = h.tracker();
      h.step(h.trackerA, [h.scene.one(), h.scene.two()], 0);
    });
    const open = () => pg.eval(() => document.getElementById('dialog').open);
    await railEntry(pg, 'track-2', '#dialog-rail').focus();
    const chosen = await press(pg, 'Enter');
    assert.deepEqual([chosen.state.selected, chosen.state.mode], ['track-2', 'manual'],
      'dialog: Enter selects (precondition)');
    const kept = await press(pg, 'Escape');
    assert.equal(kept.prevented, true, 'dialog, manual: Escape prevented');
    assert.equal(await open(), true, 'dialog, manual: the dialog stays open');
    assert.deepEqual([kept.state.selected, kept.state.mode], ['track-1', 'auto'],
      'dialog, manual: automatic again');
    const closed = await press(pg, 'Escape');
    assert.equal(closed.prevented, false, 'dialog, auto: Escape not prevented');
    assert.equal(await open(), false, 'dialog, auto with nothing declined: the dialog closes');

    await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      document.getElementById('dialog').remove();
      h.below.setAttribute('dir', 'rtl');
      h.create({ mount: 'below' });
      h.trackerA = h.tracker();
      h.step(h.trackerA, [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
    });
    await railEntry(pg, 'track-1').focus();
    assert.equal((await press(pg, 'ArrowLeft')).focused, 'track-2', 'RTL: ArrowLeft goes forward');
    assert.equal((await press(pg, 'ArrowRight')).focused, 'track-1', 'RTL: ArrowRight goes back');

    const nav = await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      h.below.removeAttribute('dir');
      h.create({ rail: 'never' });
      h.trackerA = h.tracker();
      h.step(h.trackerA, [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
      return { arrangement: h.overlay.inspect().arrangement, state: h.state(),
        shown: h.entries().filter(e => e.visible).length };
    });
    assert.equal(nav.arrangement, 'compact', 'compact arrangement (precondition)');
    assert.equal(nav.shown, 0, "rail 'never': no entry shown");
    assert.equal(nav.state.selected, 'track-1', 'automatic selection (precondition)');
    const scene = pg.page.locator('#capture');
    const previous = scene.getByRole('button', { name: LABEL.previous, exact: true });
    const next = scene.getByRole('button', { name: LABEL.next, exact: true });
    assert.equal(await next.count(), 1, 'Next code shown');
    assert.equal(await previous.count(), 1, 'Previous code shown');
    const go = async button => {
      const usable = await button.count() === 1 && await button.isVisible() &&
        !(await button.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true'));
      if (usable) await button.click();
      return (await pg.state()).selected;
    };
    assert.equal(await go(next), 'track-2', 'Next: Code 2');
    assert.equal(await go(next), 'track-3', 'Next: Code 3');
    assert.equal(await go(next), 'track-3', 'Next at the end: no wrap');
    assert.equal(await go(previous), 'track-2', 'Previous: Code 2');
    assert.equal(await go(previous), 'track-1', 'Previous: Code 1');
    assert.equal(await go(previous), 'track-1', 'Previous at the start: no wrap');
  });

// Builds the T59 scene with mounted parts, optionally in cover and mirrored; returns ids.
const t59Scene = (pg, settings = {}) => pg.eval(options => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  h.video.style.objectFit = options.cover ? 'cover' : '';
  h.create({ mount: 'below', mirror: Boolean(options.mirror) });
  h.overlay.layout();
  h.trackerA = h.tracker(options.tracker || {});
  h.step(h.trackerA, options.edge ? [h.scene.edge(), h.scene.two()]
    : [h.scene.one(), h.scene.two(), h.scene.stock()], 0);
  return h.idsByText();
}, settings);

rendered('U35 pointer: quads, line slop, nested quads, touch, badges and the press lock',
  async pg => {
    assert.deepEqual(await t59Scene(pg), T59_IDS, 'tracker ids (precondition)');
    await tapView(pg, 300, 180);
    let state = await pg.state();
    assert.deepEqual([state.selected, state.mode], ['track-2', 'manual'], 'inside quad two');
    await tapView(pg, 100, 235);
    state = await pg.state();
    assert.deepEqual([state.selected, state.mode], ['track-3', 'manual'],
      '10 px from the scan line');
    await pg.eval(() => window.h.overlay.select(null));
    await tapView(pg, 100, 238);
    state = await pg.state();
    assert.deepEqual([state.selected, state.mode], ['track-1', 'auto'],
      '13 px from the scan line selects nothing');

    // OUTER (100,75)-(300,225) and INNER (175,125)-(225,175) in view px, in both slot orders.
    for (const order of [['OUTER', 'INNER'], ['INNER', 'OUTER']]) {
      const ids = await pg.eval(names => {
        const h = window.h;
        h.overlay.destroy();
        h.create({ mount: 'below' });
        const rects = { OUTER: h.rect(400, 100, 1200, 700), INNER: h.rect(700, 300, 900, 500) };
        h.step(h.tracker(), names.map(text =>
          h.detection({ text, occurrences: [h.quad(rects[text])] })), 0);
        return h.idsByText();
      }, order);
      await tapView(pg, 200, 150);
      state = await pg.state();
      assert.deepEqual([state.selected, state.mode], [ids.INNER[0], 'manual'],
        `nested quads, ${order[0]} first: the smaller quad wins`);
    }

    await withPage(pg.engine, { hasTouch: true }, async touch => {
      assert.deepEqual(await t59Scene(touch), T59_IDS, 'touch: tracker ids (precondition)');
      await tapView(touch, 300, 180, { touch: true });
      const tapped = await touch.state();
      assert.deepEqual([tapped.selected, tapped.mode], ['track-2', 'manual'], 'touch tap');
    });

    for (const [label, settings, point] of [['A', {}, OUTLINE.A.badge],
      ['B', { cover: true, mirror: true }, OUTLINE.B.badge],
      ['edge', { cover: true, edge: true }, PROJECTED.edgeBadge]]) {
      await t59Scene(pg, settings);
      await pg.eval(() => window.h.overlay.select('track-2'));
      await tapView(pg, point.x, point.y);
      state = await pg.state();
      assert.deepEqual([state.selected, state.mode], ['track-1', 'manual'],
        `a tap on badge ${label}`);
    }

    await t59Scene(pg, { tracker: { staleMs: 100, reacquireMs: 200 } });
    const rectOf = id => pg.eval(target => {
      const el = window.h.railSlot.querySelector(`[role="radio"][data-target-id="${target}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.left, r.top, r.width, r.height];
    }, id);
    const before = await rectOf('track-2');
    const center = await centerOf(pg, '#below-rail [role="radio"][data-target-id="track-2"]');
    await pg.page.mouse.move(center.x, center.y);
    await pg.page.mouse.down();
    const pressed = await pg.eval(() => {
      const h = window.h;
      h.step(h.trackerA, [h.scene.two(), h.scene.stock()], 100);
      const snapshot = h.step(h.trackerA, [h.scene.two(), h.scene.stock()], 200);
      const gone = h.railSlot.querySelector('[role="radio"][data-target-id="track-1"]');
      return { expired: snapshot.events.filter(e => e.type === 'expired').map(e => e.trackId),
        placeholder: gone ? [gone.getAttribute('aria-disabled'), gone.getAttribute('data-state')]
          : null, state: h.state() };
    });
    assert.deepEqual(pressed.expired, ['track-1'], 'track-1 expires (precondition)');
    assert.deepEqual(pressed.placeholder, ['true', 'expired'], 'locked: a disabled placeholder');
    assert.deepEqual(await rectOf('track-2'), before, "locked: entry 2's rect unchanged");
    assert.equal(pressed.state.selected, null, 'locked: no automatic switch');
    assert.equal(pressed.state.inspected.locks.pointer, true, 'locked: pointer lock');
    const outside = await centerOf(pg, '#outside');
    await pg.page.mouse.move(outside.x, outside.y);
    await pg.page.mouse.up();
    const released = await pg.eval(() => {
      const h = window.h;
      const out = { state: h.state() };
      h.time.advance(499);
      out.at499 = h.state().inspected.locks.pointer;
      h.time.advance(1);
      out.at500 = h.state().inspected.locks.pointer;
      return out;
    });
    assert.equal(released.state.mode, 'auto', 'released outside: no click');
    assert.deepEqual([released.at499, released.at500], [true, false],
      'the lock ends 500 ms after the release');

    const held = await centerOf(pg, '#below-rail [role="radio"][data-target-id="track-2"]');
    await pg.page.mouse.move(held.x, held.y);
    await pg.page.mouse.down();
    const timed = await pg.eval(() => {
      const h = window.h;
      const out = { start: h.state().inspected.locks.pointer };
      h.time.advance(2999);
      out.at2999 = h.state().inspected.locks.pointer;
      h.time.advance(1);
      out.at3000 = h.state().inspected.locks.pointer;
      return out;
    });
    await pg.page.mouse.move(outside.x, outside.y);
    await pg.page.mouse.up();
    assert.deepEqual([timed.start, timed.at2999, timed.at3000], [true, true, false],
      'a press held 3 s unlocks');

    await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      h.spy();
      h.create({ mount: 'below' });
      h.step(h.tracker(), [h.scene.one(), h.scene.two()], 0);
    });
    const entry = await centerOf(pg, '#below-rail [role="radio"][data-target-id="track-2"]');
    await pg.page.mouse.move(entry.x, entry.y);
    await pg.page.mouse.down();
    const windowListeners = () => pg.eval(() =>
      window.h.spied.listeners().filter(name => name.indexOf('window:') === 0).sort());
    const during = await windowListeners();
    await pg.eval(() => window.h.overlay.destroy());
    const afterDestroy = await windowListeners();
    await pg.page.mouse.move(outside.x, outside.y);
    await pg.page.mouse.up();
    await pg.eval(() => window.h.spied.restore());
    assert.ok(during.indexOf('window:pointerup:capture') !== -1 &&
      during.indexOf('window:pointercancel:capture') !== -1,
    `pressed: window pointerup and pointercancel capture listeners in ${JSON.stringify(during)}`);
    assert.deepEqual(afterDestroy, [], 'destroy() during a press: no window listener');
  });

// Rail cases: L live tracks (lost ones when nothing may be selected), Earlier results, selection.
const RAIL_CASES = Object.freeze(['auto', 'multiple', 'always', 'never'].reduce((list, mode) => {
  [0, 1, 2].forEach(live => [0, 1].forEach(earlier => [false, true].forEach(selected => {
    if (live === 0 && earlier === 0 && selected) return;
    list.push(Object.freeze({ mode, live, earlier, selected }));
  })));
  return list;
}, []));

rendered('U36 rail visibility table, mounted part, Earlier, saturation note and names',
  async pg => {
    const matrix = await pg.eval(cases => {
      const h = window.h;
      const codes = [h.scene.one(), h.detection({ text: 'SECOND' })];
      return cases.map(c => {
        if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
        h.create({ mount: 'rail', rail: c.mode });
        const tracks = [];
        for (let i = 0; i < c.live; i += 1) {
          tracks.push({ state: c.selected ? 'tracked' : 'lost', kind: 'quad',
            points: h.rect(160 + 800 * i, 80, 640 + 800 * i, 320), detection: codes[i] });
        }
        const retained = c.earlier
          ? [{ id: 'result-9', detection: h.detection({ text: 'EARLIER' }) }] : [];
        h.overlay.update(h.snap({ tracks, retained }));
        if (c.selected && c.live === 0) h.overlay.select('result-9');
        const state = h.state();
        return { selected: state.inspected.selected, entries: h.entries(h.railSlot).length,
          shown: h.entries(h.railSlot).filter(e => e.visible).length };
      });
    }, RAIL_CASES);
    RAIL_CASES.forEach((c, i) => {
      const label = `${c.mode}, L ${c.live}, Earlier ${c.earlier}, selected ${c.selected}`;
      const run = matrix[i];
      assert.equal(run.selected !== null, c.selected, `${label}: selection (precondition)`);
      const entries = c.live + c.earlier;
      const shown = railShown(c.mode, c.live, entries, c.selected);
      assert.equal(run.shown, shown ? entries : 0, `${label}: visible entries`);
    });

    const part = await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      h.create({ mount: 'rail', rail: 'always' });
      h.overlay.update(h.snap({ tracks: [{ kind: 'quad', points: h.rect(160, 80, 640, 320),
        detection: h.scene.one() }], retained: [{ id: 'result-9',
        detection: h.detection({ text: 'EARLIER' }) }] }));
      const wrapper = h.railSlot.firstElementChild;
      const divider = h.railSlot.querySelector('.qr-camera-divider');
      const out = { wrapper: h.attrs(wrapper),
        inVideo: h.root().querySelectorAll('.qr-camera-entry').length,
        divider: divider ? [divider.textContent, divider.getAttribute('aria-hidden')] : null,
        result: h.entries(h.railSlot).map(e => e.attrs['data-result-id']).filter(Boolean) };
      h.overlay.destroy();
      h.create({ mount: 'rail', rail: 'always', retained: false });
      h.overlay.update(h.snap({ tracks: [{ kind: 'quad', points: h.rect(160, 80, 640, 320),
        detection: h.scene.one() }], retained: [{ id: 'result-9',
        detection: h.detection({ text: 'EARLIER' }) }] }));
      out.withoutRetained = { results: h.entries(h.railSlot)
        .filter(e => e.attrs['data-result-id']).length,
      dividers: h.railSlot.querySelectorAll('.qr-camera-divider').length };
      return out;
    });
    assert.equal(part.wrapper['data-qr-camera-part'], 'rail', 'mounted part: data-qr-camera-part');
    assert.deepEqual([part.wrapper.lang, part.wrapper['data-colors'],
      part.wrapper['data-qr-camera-scheme'], part.wrapper['data-qr-camera-size']],
    ['en', 'track', 'dark', 'regular'], 'mounted part: lang, colors, scheme and size');
    assert.equal(part.inVideo, 0, 'mounted rail: no in-video entry');
    assert.deepEqual(part.divider, [TEXT.earlier, 'true'], 'Earlier divider: text, aria-hidden');
    assert.deepEqual(part.result, ['result-9'], 'Earlier entry');
    assert.deepEqual(part.withoutRetained, { results: 0, dividers: 0 }, 'retained: false');

    for (const [flag, note] of [[null, ''], ['detections', LABEL.saturated],
      ['observations', LABEL.saturated], ['tracks', LABEL.saturated],
      ['occurrences', LABEL.saturatedOccurrences]]) {
      const noted = await pg.eval(name => {
        const h = window.h;
        h.overlay.destroy();
        h.create({ mount: 'rail', rail: 'always' });
        const saturated = {};
        if (name) saturated[name] = true;
        h.overlay.update(h.snap({ saturated, tracks: [{ kind: 'quad',
          points: h.rect(160, 80, 640, 320), detection: h.scene.one() }] }));
        const el = h.railSlot.querySelector('.qr-camera-saturated');
        return el ? { text: el.textContent.trim(), visible: h.visible(el) } : null;
      }, flag);
      const label = `saturation ${flag || 'none'}`;
      assert.equal(noted && noted.visible ? noted.text : '', note, `${label}: note`);
      await assertAccessible(pg.page.locator('#below-rail [role="toolbar"]'), { description: note },
        `${label}: toolbar description`);
    }

    // The U26 scene: one entry per geometry kind.
    const kinds = await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      h.create({ mount: 'rail', rail: 'always' });
      const code = (text, occurrences, symbology) => h.detection({ text, occurrences, symbology });
      const tiny = code('TINY', [h.quad(h.rect(1000, 100, 1020, 112))]);
      const lost = code('LOST', [h.quad(h.rect(960, 400, 1440, 640))]);
      const held = code('HELD', [h.quad(h.rect(1100, 80, 1500, 280))]);
      const partial = code('0950110153001',
        [h.partial([{ x: 800, y: 600 }, { x: 900, y: 620 }, { x: 850, y: 700 }])], 'data_bar');
      const content = code('A40156B', undefined, 'codabar');
      const tracker = h.tracker();
      const always = () => [h.scene.one(), h.scene.stock(), partial, tiny, content];
      h.step(tracker, always().concat([lost, held]), 0);
      h.step(tracker, always().concat([held]), 100);
      const snapshot = h.step(tracker, always(), 200);
      return snapshot.tracks.map(k => [k.detection.content.text, k.id, k.state]);
    });
    assert.deepEqual(kinds, [['TINY', 'track-1', 'tracked'], ['HELD', 'track-2', 'held'],
      ['https://example.test/one', 'track-3', 'tracked'], ['LOST', 'track-4', 'lost'],
      ['0950110153001', 'track-5', 'tracked'], ['STOCK-4827', 'track-6', 'tracked'],
      ['A40156B', 'track-7', 'tracked']], 'tracker tracks (precondition)');
    for (const [id, name, description] of [
      ['track-1', 'Code 1, QR Code', `${TEXT.partial} TINY`],
      ['track-2', 'Code 2, QR Code', 'HELD'],
      ['track-3', 'Code 3, QR Code', 'https://example.test/one'],
      ['track-4', 'Code 4, QR Code', `${TEXT.lost} LOST`],
      ['track-5', 'Code 5, GS1 DataBar', `${TEXT.partial} 0950110153001`],
      ['track-6', 'Code 6, Code 128', `${TEXT.segment} STOCK-4827`],
      ['track-7', 'Code 7, Codabar', `${TEXT.none} A40156B`]]) {
      await assertAccessible(railEntry(pg, id), { name, description },
        `${id} name and description`);
    }

    const earlier = await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      h.create({ mount: 'rail', rail: 'always' });
      const tracker = h.tracker({ staleMs: 100, reacquireMs: 200 });
      h.step(tracker, [h.scene.one(), h.scene.two()], 0);
      h.step(tracker, [h.scene.two()], 100);
      const snapshot = h.step(tracker, [h.scene.two()], 200);
      return snapshot.results.map(r => [r.id, r.trackIds.length]).sort();
    });
    assert.deepEqual(earlier, [['result-1', 0], ['result-2', 1]],
      'result-1 without a live track (precondition)');
    await assertAccessible(pg.page.locator('#below-rail [role="radio"][data-result-id="result-1"]'),
      { name: `QR Code, ${TEXT.notRecent}`,
        description: `${TEXT.notRecent} https://example.test/one` },
      'Earlier entry name and description');
  });

// One content per payload kind; texts carry CR LF, a tab, U+200B and GS where the kind allows.
const GS1_ELEMENTS = [{ ai: '01', value: '09506000134352' }, { ai: '10', value: 'ABC123' },
  { ai: '17', value: '251231' }];
const KIND_CASES = Object.freeze([
  ['url', 'https://example.test/one', { url: 'https://example.test/one' }],
  ['wifi', 'WIFI:S:Caf\u00e9\u200BNet;T:WPA;P:pa\tss;;',
    { ssid: 'Caf\u00e9\u200BNet', security: 'WPA', password: 'pa\tss', hidden: false }],
  ['email', 'mailto:a@example.test?subject=Hi&body=Line 1\r\nLine 2',
    { to: 'a@example.test', subject: 'Hi', body: 'Line 1\r\nLine 2' }],
  ['sms', 'SMSTO:+33123456789:See you', { number: '+33123456789', body: 'See you' }],
  ['tel', 'tel:+33123456789', { number: '+33123456789' }],
  ['geo', 'geo:48.85660,2.35220', { lat: 48.8566, lon: 2.3522 }],
  ['gs1', '010950600013435210ABC123\u001d17251231', { elements: GS1_ELEMENTS,
    gtin: '09506000134352', conformant: false,
    issues: ['Check digit of (01) does not match', 'Date in (17) <251231> & later'] }],
  ['gs1_digital_link', 'https://id.example.test/01/09506000134352/10/ABC123',
    { url: 'https://id.example.test/01/09506000134352/10/ABC123',
      elements: GS1_ELEMENTS.slice(0, 2), gtin: '09506000134352', conformant: true, issues: [] }],
  ['me_card', 'MECARD:N:Doe,Jane;TEL:+33123456789;EMAIL:jane@example.test;' +
    'URL:https://example.test/jane;;', { name: 'Doe,Jane', tel: '+33123456789',
    email: 'jane@example.test', url: 'https://example.test/jane' }],
  ['crypto', 'bitcoin:bc1qexampleaddress?amount=0.01',
    { scheme: 'bitcoin', address: 'bc1qexampleaddress', amount: '0.01' }],
  ['v_card', 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Jane Doe\r\nEND:VCARD',
    { raw: 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Jane Doe\r\nEND:VCARD' }],
  ['v_event', 'BEGIN:VEVENT\r\nSUMMARY:Launch\r\nDTSTART:20261102T090000Z\r\nEND:VEVENT',
    { raw: 'BEGIN:VEVENT\r\nSUMMARY:Launch\r\nDTSTART:20261102T090000Z\r\nEND:VEVENT' }],
  ['text', 'Plain text\twith a tab\r\nand a zero\u200Bwidth space', {}],
].map(([kind, text, fields]) => Object.freeze({ kind, text, fnc1: kind === 'gs1' ? 'first' : null,
  payload: Object.assign({ kind }, fields) })));
// Parsed fields of each KIND_CASES entry as [label, value]: payload order, numbers via
// String(), booleans as Yes or No, GS1 elements as (AI) before GTIN and conformance.
const KIND_FIELDS = Object.freeze({
  url: [], v_card: [], v_event: [], text: [],
  wifi: [['Network name', 'Café​Net'], ['Security', 'WPA'], ['Password', 'pa\tss'],
    ['Hidden network', 'No']],
  email: [['To', 'a@example.test'], ['Subject', 'Hi'], ['Message', 'Line 1\r\nLine 2']],
  sms: [['Number', '+33123456789'], ['Message', 'See you']],
  tel: [['Number', '+33123456789']],
  geo: [['Latitude', '48.8566'], ['Longitude', '2.3522']],
  gs1: [['(01)', '09506000134352'], ['(10)', 'ABC123'], ['(17)', '251231'],
    ['GTIN', '09506000134352'], ['Meets the checked GS1 rules', 'No']],
  gs1_digital_link: [['(01)', '09506000134352'], ['(10)', 'ABC123'],
    ['GTIN', '09506000134352'], ['Meets the checked GS1 rules', 'Yes']],
  me_card: [['Name', 'Doe,Jane'], ['Phone', '+33123456789'], ['Email', 'jane@example.test'],
    ['URL', 'https://example.test/jane']],
  crypto: [['Scheme', 'bitcoin'], ['Address', 'bc1qexampleaddress'], ['Amount', '0.01']],
});
// A MeCard whose name and email are null: both rows are omitted, the others keep their order.
const NULL_FIELDS_CASE = Object.freeze({ kind: 'me_card',
  text: 'MECARD:TEL:+33123456789;URL:https://example.test/jane;;', fnc1: null,
  payload: { kind: 'me_card', name: null, tel: '+33123456789', email: null,
    url: 'https://example.test/jane' },
  fields: [['Phone', '+33123456789'], ['URL', 'https://example.test/jane']] });

// 7000 code points: 48 plain ones (emoji included), then lines with chips and CR LF.
const LONG_TEXT = Array.from('\u{1F600}'.repeat(3) +
  'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI' +
  'Line with a tab\there, a ZWSP\u200Bthere and CR LF\r\n'.repeat(200)).slice(0, 7000).join('');

// Shows one detection in the mounted readout, with a stub clipboard recording writes.
const showReadout = (pg, spec, settings = {}) => pg.eval(([one, options]) => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  if (options.stubClipboard !== false) {
    h.clip = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: text => {
        h.clip.push(text);
        return Promise.resolve();
      } } });
  }
  h.create(Object.assign({ mount: 'below', rail: 'always' }, options.create || {}));
  const detection = h.detection({ symbology: one.symbology || 'qr_code', text: one.text,
    raw: one.raw, charset: one.charset || 'utf8', eci: one.eci, fnc1: one.fnc1 || undefined,
    payload: one.payload, occurrences: [h.quad(h.rect(160, 80, 640, 320))] });
  h.trackerA = h.tracker();
  h.step(h.trackerA, [detection], 0);
  const content = document.querySelector('section.qr-camera-readout .qr-camera-content');
  const issues = document.querySelector('.qr-camera-issues');
  const bytes = document.querySelector('.qr-camera-bytes');
  // The parsed fields list (Details holds another dl.qr-camera-fields): dt and dd in order,
  // each value rebuilt exactly, with its chips.
  const list = Array.from(document.querySelectorAll('section.qr-camera-readout ' +
    'dl.qr-camera-fields')).filter(dl => !dl.closest('.qr-camera-details'))[0] || null;
  const fields = list ? Array.from(list.children).filter(el => el.tagName === 'DT').map(dt => {
    const dd = dt.nextElementSibling && dt.nextElementSibling.tagName === 'DD'
      ? dt.nextElementSibling : null;
    return { label: dt.textContent, value: dd ? h.rebuild(dd) : null,
      escapes: dd ? Array.from(dd.querySelectorAll('span.qr-camera-escape')).map(chip => ({
        text: chip.getAttribute('data-text'), role: chip.getAttribute('role'),
        name: chip.getAttribute('aria-label') })) : [] };
  }) : null;
  h.lastDetection = detection;
  return { readout: h.readout(), rebuilt: h.rebuild(content), labels: h.labelTexts(),
    issues: issues ? Array.from(issues.children).map(li => li.textContent) : null,
    bytes: bytes ? bytes.textContent.trim() : null, fields,
    fieldsShown: list ? h.visible(list) : null };
}, [spec, settings]);

/** Strings a payload can put on screen: its values, element AIs and values, its URL host. */
function engineStrings(payload) {
  const out = [];
  Object.keys(payload).filter(key => key !== 'kind').forEach(key => {
    const value = payload[key];
    if (typeof value === 'string' || typeof value === 'number') out.push(String(value));
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (typeof item === 'string') out.push(item);
        else if (item && typeof item === 'object') out.push(item.ai, item.value);
      });
    }
  });
  if (payload.url) out.push(new URL(payload.url).hostname);
  return out;
}

const caseOf = kind => KIND_CASES.filter(c => c.kind === kind)[0];

rendered('U37 readout exactness: kinds, chips, copy, charsets, ECI, FNC1, issues, 7000 points',
  async (pg, t) => {
    for (const spec of KIND_CASES) {
      const run = await showReadout(pg, spec);
      assert.ok(run.readout, `${spec.kind}: readout`);
      assert.equal(run.readout.attrs['data-kind'], spec.kind, `${spec.kind}: data-kind`);
      assert.ok(run.readout.head.includes(KIND_LABELS[spec.kind]),
        `${spec.kind}: kind label in ${JSON.stringify(run.readout.head)}`);
      assert.equal(run.rebuilt, spec.text, `${spec.kind}: rebuilt text`);
      const words = READOUT_WORDS.concat([spec.text, 'utf8'], engineStrings(spec.payload));
      const unknown = run.labels.filter(text => !/^\d+$/.test(text))
        .map(text => unknownText(text, words)).filter(Boolean);
      assert.deepEqual(unknown, [], `${spec.kind}: text outside the labels and engine strings`);
      assert.ok(Array.isArray(run.fields), `${spec.kind}: parsed fields list (precondition)`);
      assert.deepEqual(run.fields.map(field => [field.label, field.value]), KIND_FIELDS[spec.kind],
        `${spec.kind}: parsed fields [label, value] in payload order`);
      assert.equal(run.fieldsShown, KIND_FIELDS[spec.kind].length > 0,
        `${spec.kind}: parsed fields shown only when there are some`);
      if (spec.kind === 'wifi') {
        const chips = run.fields.map(field => [field.label, field.escapes]);
        assert.deepEqual(chips, [
          ['Network name', [{ text: '​', role: 'img', name: 'ZWSP (U+200B)' }]],
          ['Security', []], ['Password', [{ text: '\t', role: 'img', name: 'TAB (U+0009)' }]],
          ['Hidden network', []]], 'wifi: the ZWSP and the TAB render as chips in their dd');
      }
    }
    const nulls = await showReadout(pg, NULL_FIELDS_CASE);
    assert.deepEqual(nulls.fields && nulls.fields.map(field => [field.label, field.value]),
      NULL_FIELDS_CASE.fields, 'me_card with null name and email: null fields omitted');
    const gs1 = await showReadout(pg, caseOf('gs1'));
    assert.deepEqual(gs1.issues, caseOf('gs1').payload.issues, 'GS1 issues verbatim');
    assert.ok(gs1.readout.details.includes(LABEL.fnc1First),
      `FNC1 first in ${JSON.stringify(gs1.readout.details)}`);

    const text = caseOf('text');
    await showReadout(pg, text);
    const readout = pg.page.locator('#below-readout');
    const chip = readout.locator('.qr-camera-content')
      .getByRole('img', { name: 'TAB (U+0009)', exact: true });
    assert.equal(await chip.count(), 1, 'one TAB chip with role img');
    await assertAccessible(chip, { name: 'TAB (U+0009)' }, 'TAB chip');
    assert.equal(await chip.getAttribute('data-text'), '\t', 'TAB chip data-text');

    const selected = await pg.eval(() => {
      const p = document.querySelector('section.qr-camera-readout .qr-camera-content');
      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const data = new DataTransfer();
      const event = new ClipboardEvent('copy', { clipboardData: data, bubbles: true,
        cancelable: true });
      p.dispatchEvent(event);
      selection.removeAllRanges();
      return { text: data.getData('text/plain'), prevented: event.defaultPrevented,
        carried: event.clipboardData === data };
    });
    if (selected.carried) {
      assert.equal(selected.text, text.text, 'selection copy rebuilds the exact text');
      assert.equal(selected.prevented, true, 'selection copy: default prevented');
    } else {
      t.diagnostic(`${pg.engine}: ClipboardEvent ignores clipboardData, selection copy not run`);
    }

    const copy = readout.getByRole('button', { name: LABEL.copy, exact: true });
    await copy.click();
    const copied = await pg.eval(async () => {
      const h = window.h;
      await h.task();
      return { clip: h.clip.slice(), actions: h.actions.slice(), texts: h.readout().texts };
    });
    assert.deepEqual(copied.clip, [text.text], 'Copy writes the exact content');
    assert.deepEqual(copied.actions, [{ type: 'copy', value: text.text }], 'onAction copy');
    assert.ok(copied.texts.includes(LABEL.copied), 'Copied shown');
    await assertAccessible(copy, { name: LABEL.copy }, 'Copy keeps its name');
    const fade = await pg.eval(word => {
      const h = window.h;
      h.time.advance(1999);
      const shown = h.readout().texts.includes(word);
      h.time.advance(1);
      return [shown, h.readout().texts.includes(word)];
    }, LABEL.copied);
    assert.deepEqual(fade, [true, false], 'Copied shows for 2000 ms');
    await readout.getByRole('button', { name: TEXT.details, exact: true }).click();
    await readout.getByRole('button', { name: LABEL.copyBytes, exact: true }).click();
    const bytes = await pg.eval(async () => {
      await window.h.task();
      return { clip: window.h.clip.slice(-1)[0], action: window.h.actions.slice(-1)[0] };
    });
    assert.equal(bytes.clip, hexBytes(text.text), 'Copy bytes writes the hex');
    assert.deepEqual(bytes.action, { type: 'copy-bytes', value: hexBytes(text.text) },
      'onAction copy-bytes');

    if (pg.engine === 'chromium') {
      const wifi = caseOf('wifi');
      await withPage(pg.engine, { permissions: ['clipboard-read', 'clipboard-write'] },
        async real => {
          await showReadout(real, wifi, { stubClipboard: false });
          await real.page.locator('#below-readout')
            .getByRole('button', { name: LABEL.copy, exact: true }).click();
          const read = await real.eval(async () => {
            await window.h.task();
            return navigator.clipboard.readText();
          });
          assert.equal(read, wifi.text, 'the system clipboard holds the exact content');
        });
    } else {
      t.diagnostic(`${pg.engine}: system clipboard read runs in Chromium only`);
    }

    // 'caf' + 0xE9: an incomplete reading, then the same with an unlocated ECI.
    const lossy = { text: 'caf\uFFFD', raw: 'Y2Fm6Q==', charset: 'unknown',
      payload: { kind: 'text' } };
    const unknown = await showReadout(pg, lossy);
    assert.ok(unknown.readout.texts.includes(LABEL.incomplete), 'unknown charset: the note');
    assert.equal(unknown.bytes, '63 61 66 E9', 'unknown charset: bytes from raw');
    const unlocated = await showReadout(pg, Object.assign({ eci: [] }, lossy));
    assert.ok(unlocated.readout.texts.includes(LABEL.incompleteEci), 'eci []: the ECI note');
    assert.ok(!unlocated.readout.texts.includes(LABEL.incomplete), 'eci []: not the plain note');
    assert.ok(unlocated.readout.details.includes(LABEL.eciUnlocated),
      `eci []: ${LABEL.eciUnlocated} in ${JSON.stringify(unlocated.readout.details)}`);
    const eci = await showReadout(pg, { text: 'caf\u00e9', raw: 'Y2Fmw6k=', charset: 'eci',
      eci: [{ designator: 26, start: 0 }], payload: { kind: 'text' } });
    assert.ok(eci.readout.details.includes('ECI 26 at byte 0'),
      `ECI 26 at byte 0 in ${JSON.stringify(eci.readout.details)}`);
    assert.ok(!eci.readout.texts.includes(LABEL.incomplete), 'ECI 26: complete reading');
    assert.equal(eci.bytes, '63 61 66 C3 A9', 'ECI 26: bytes');

    await pg.eval(() => { window.h.below.style.width = '320px'; });
    const long = await showReadout(pg, { text: LONG_TEXT, payload: { kind: 'text' } });
    assert.equal(long.rebuilt, LONG_TEXT, '7000 code points: rebuilt text');
    const clampOf = () => pg.eval(() => {
      const content = document.querySelector('section.qr-camera-readout .qr-camera-content');
      const style = getComputedStyle(content);
      return style.webkitLineClamp || style.getPropertyValue('-webkit-line-clamp');
    });
    const narrow = await pg.eval(() => {
      const h = window.h;
      const preview = h.railSlot.querySelector('.qr-camera-preview');
      return { sizes: [h.railSlot, h.readoutSlot]
        .map(slot => h.attrs(slot.firstElementChild)['data-qr-camera-size']),
      preview: preview ? preview.textContent : null,
      previewDisplay: preview ? getComputedStyle(preview).display : null };
    });
    assert.deepEqual(narrow.sizes, ['narrow', 'narrow'], '320 px parts are narrow');
    assert.equal(narrow.preview, Array.from(LONG_TEXT).slice(0, 48).join(''),
      'the preview is the first 48 code points');
    assert.equal(narrow.previewDisplay, 'none', 'narrow: preview hidden');
    assert.equal(await clampOf(), '3', 'narrow: content clamped to 3 lines');
    await readout.getByRole('button', { name: TEXT.details, exact: true }).click();
    assert.equal(await clampOf(), 'none', 'Details lifts the clamp');
    await readout.getByRole('button', { name: LABEL.copy, exact: true }).click();
    const longCopy = await pg.eval(async () => {
      await window.h.task();
      return window.h.clip.slice(-1)[0];
    });
    assert.equal(longCopy, LONG_TEXT, '7000 code points: exact copy');
    const records = await pg.eval(() => {
      const h = window.h;
      h.time.advance(2000);
      const watcher = h.watch('long', h.readoutSlot);
      h.step(h.trackerA, [h.lastDetection], 100);
      const out = watcher.take();
      watcher.stop();
      h.below.style.width = '';
      return out;
    });
    assert.deepEqual(records, [], 'an unchanged re-render mutates nothing');
  });

rendered('U38 format and family labels for every symbology and an unknown one', async pg => {
  const specs = SYMBOLOGY_LABELS.concat([{ id: 'future_code', label: 'future_code',
    family: null }]);
  // Reports carry at most 16 detections: two overlays of 10 codes each.
  const run = await pg.eval(list => [list.slice(0, 10), list.slice(10)].map((chunk, c) => {
    const h = window.h;
    if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
    h.create({ mount: 'below', rail: 'always' });
    const snapshot = h.step(h.tracker(), chunk.map((spec, i) =>
      h.detection({ symbology: spec.id, text: `S-${c * 10 + i + 1}` })), 0);
    return snapshot.tracks.map(track => {
      h.overlay.select(track.id);
      const entry = h.entry(track.id);
      const readout = h.readout();
      const head = document.querySelector('section.qr-camera-readout .qr-camera-head');
      return { symbology: track.detection.symbology, format: entry ? entry.format : null,
        head: readout ? readout.head : [], attr: readout ? readout.attrs['data-symbology'] : null,
        families: head ? head.querySelectorAll('.qr-camera-family').length : 0 };
    });
  }).reduce((all, rows) => all.concat(rows), []), specs);
  assert.equal(run.length, specs.length, 'one content track per detection (precondition)');
  const familyElements = run.some(row => row.families > 0);
  for (const spec of specs) {
    const row = run.filter(r => r.symbology === spec.id)[0];
    assert.ok(row, `${spec.id}: track`);
    assert.equal(row.format, spec.label, `${spec.id}: rail format label`);
    assert.equal(row.attr, spec.id, `${spec.id}: readout data-symbology`);
    assert.ok(row.head.includes(spec.label),
      `${spec.id}: header format label in ${JSON.stringify(row.head)}`);
    const joined = row.head.join(' | ');
    const families = Object.values(FAMILY_LABELS).filter(label => joined.indexOf(label) !== -1);
    assert.deepEqual(families, spec.family ? [spec.family] : [], `${spec.id}: header family`);
    if (spec.family) {
      assert.ok(row.head.includes(spec.family), `${spec.id}: family label item`);
    } else if (familyElements) {
      assert.equal(row.families, 0, `${spec.id}: no family element`);
    }
  }
});

// Shows one URL code in the mounted readout; returns the readout, URL block, slot and calls.
const showUrl = (pg, text, settings = {}) => pg.eval(([value, options]) => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  h.openCalls = [];
  h.sequence = [];
  h.create(Object.assign({ mount: 'below' }, options));
  h.step(h.tracker(), [h.detection({ text: value, payload: h.url(value),
    occurrences: [h.quad(h.rect(160, 80, 640, 320))] })], 0);
  return { readout: h.readout(), url: h.texts(document.querySelector('.qr-camera-url')),
    slot: h.slot(), openCalls: h.openCalls.slice() };
}, [text, settings]);

rendered('U39 URL: exact text and host, Open, preventDefault, other schemes, no provider',
  async pg => {
    const href = 'https://EXAMPLE.test/a b';
    const run = await showUrl(pg, href);
    assert.equal(run.readout.url, href, 'encoded URL exactly as read');
    assert.ok(run.url.includes('example.test'), `host in ${JSON.stringify(run.url)}`);
    const open = pg.page.locator('#below-readout').getByRole('button', { name: TEXT.open,
      exact: true });
    assert.equal(await open.count(), 1, 'one Open control');
    assert.equal(await open.evaluate(el => el.tagName), 'BUTTON', 'Open is a button');
    assert.deepEqual(run.openCalls, [], 'never opened without a click');
    await open.click();
    const clicked = await pg.eval(() => ({ sequence: window.h.sequence.slice(),
      calls: window.h.openCalls.slice(), actions: window.h.actions.slice() }));
    assert.deepEqual(clicked.sequence, ['action:open', 'open'], 'onAction, then window.open');
    assert.deepEqual(clicked.calls,
      [['https://example.test/a%20b', '_blank', 'noopener,noreferrer']],
      'exactly one window.open of the WHATWG serialization');
    assert.deepEqual(clicked.actions, [{ type: 'open', value: href }], 'onAction value');
    await pg.eval(() => {
      window.h.prevent = ['open'];
      window.h.sequence = [];
    });
    await open.click();
    const prevented = await pg.eval(() => ({ sequence: window.h.sequence.slice(),
      calls: window.h.openCalls.length }));
    await pg.eval(() => { window.h.prevent = []; });
    assert.deepEqual(prevented, { sequence: ['action:open'], calls: 1 },
      'prevented: no further window.open');
    assert.deepEqual(pg.requests.filter(url => /example\.test/i.test(url)), [],
      'no request to example.test');

    for (const other of ['javascript:alert(1)', 'data:text/html,hi',
      'intent://scan/#Intent;scheme=zxing;end']) {
      await showUrl(pg, other);
      assert.equal(await open.count(), 0, `${other}: no Open`);
    }

    const plain = await showUrl(pg, 'https://example.test/one');
    assert.ok(plain.slot.present, 'no provider: slot shown');
    assert.ok(plain.slot.text.indexOf(LABEL.unverified) !== -1,
      `no provider: ${LABEL.unverified} in ${JSON.stringify(plain.slot.text)}`);
    assert.equal(plain.slot.button, null, 'no provider: no check button');
    const off = await showUrl(pg, 'https://example.test/one', { destinationSlot: false });
    assert.equal(off.slot.present, false, 'destinationSlot false: no slot');
  });

// Prepared answers by URL path; p and q never settle by themselves.
const PREPARED = Object.freeze({
  r: { outcome: 'resolved', finalUrl: 'https://example.test/final', status: 200, redirected: true,
    redirects: [{ url: 'https://example.test/r', status: 301,
      location: 'https://example.test/final', refusedScheme: null }] },
  n: { outcome: 'resolved', finalUrl: 'https://example.test/n', status: 200, redirects: null,
    redirected: null },
  f: { outcome: 'failed', reason: 'blocked_scheme', redirects: [{ url: 'https://example.test/f',
    status: 302, location: null, refusedScheme: 'ftp:' }] },
  p: 'pending',
  q: 'pending',
  u: { outcome: 'unavailable', reason: 'resolver_busy' },
  m: { outcome: 'resolved', finalUrl: 'https://example.test/m', status: 200, redirects: [],
    redirected: false },
});
// More prepared failures for the label rows: no redirect followed.
const PREPARED_FAILURES = Object.freeze({
  t: { outcome: 'failed', reason: 'timeout', redirects: [] },
  d: { outcome: 'failed', reason: 'dns_error', redirects: [] },
});
// Wall clock base of the fake destination timers.
const DESTINATION_BASE = Date.UTC(2026, 10, 2, 9, 30, 0);

// A verifier over the prepared transport on fake timers, a subscription-counting provider in
// front of it, and one code per prepared URL (m as a MeCard) with mounted parts. settings:
// prepared (more answers by path), urls, create (overlay options) and noTransport.
const preparedScene = (pg, settings = {}) => pg.eval(([base, defaults, options]) => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  const timers = tag => {
    const clock = h.time.clock(tag);
    return { now: () => base + h.time.now(), monotonic: () => h.time.now(),
      setTimeout: (callback, ms) => clock.setTimeout(callback, ms),
      clearTimeout: id => clock.clearTimeout(id) };
  };
  const D = h.destination;
  const prepared = Object.assign({}, defaults, options.prepared || {});
  const transport = options.noTransport ? null : D.createPreparedTransport(Object.keys(prepared)
    .map(key => ({ url: `https://example.test/${key}`, result: prepared[key] })),
  { delayMs: 40, timers: timers('transport') });
  const verifier = D.createDestinationVerifier({ transport, maxConcurrent: 1,
    timers: timers('verifier') });
  const provider = { active: 0, subscribes: 0,
    get canResolve() { return verifier.canResolve; },
    get: target => verifier.get(target),
    resolve: (target, more) => verifier.resolve(target, more),
    cancel: target => verifier.cancel(target),
    subscribe: listener => {
      const off = verifier.subscribe(listener);
      let on = true;
      provider.subscribes += 1;
      provider.active += 1;
      return () => {
        if (on) provider.active -= 1;
        on = false;
        off();
      };
    } };
  h.verifier = verifier;
  h.provider = provider;
  h.create(Object.assign({ mount: 'below', destinations: provider }, options.create || {}));
  const urls = options.urls || Object.keys(prepared).map(key => `https://example.test/${key}`);
  const codes = urls.map((url, i) => {
    const quad = [h.quad(h.rect(40 + (i % 7) * 220, 80, 240 + (i % 7) * 220, 280))];
    if (/\/m$/.test(url)) {
      return h.detection({ text: `MECARD:N:Example;URL:${url};;`, occurrences: quad,
        payload: { kind: 'me_card', name: 'Example', tel: null, email: null, url } });
    }
    return h.detection({ text: url, payload: h.url(url), occurrences: quad });
  });
  h.trackerA = h.tracker();
  h.step(h.trackerA, codes, 0);
  h.trackOf = {};
  h.last.tracks.forEach(track => {
    const payload = track.detection.payload;
    h.trackOf[payload.url] = track.id;
  });
  h.show = url => {
    h.overlay.select(h.trackOf[url]);
    const button = document.querySelector('button.qr-camera-check');
    if (button) h.checkButton = button;
    return h.slot();
  };
  return Object.keys(h.trackOf).length;
}, [DESTINATION_BASE, PREPARED, settings]);

// Activates the check button with the keyboard, then lets fake and real time settle.
async function checkButtonPress(pg, ms = 0) {
  await pg.eval(() => {
    const button = document.querySelector('button.qr-camera-check');
    window.h.checkButton = button;
    if (button) button.focus();
  });
  await pg.page.keyboard.press('Enter');
  return pg.eval(async wait => {
    const h = window.h;
    await h.task();
    h.time.advance(wait);
    await h.task();
    h.time.advance(0);
    await h.task();
    return h.slot();
  }, ms);
}

function assertSlot(slot, { state, texts = [], absent = [], button }, label) {
  assert.ok(slot && slot.present, `${label}: slot`);
  if (state !== undefined) {
    assert.equal(slot.attrs['data-destination-state'], state, `${label}: data-destination-state`);
  }
  texts.forEach(text => assert.ok(slot.text.indexOf(text) !== -1,
    `${label}: ${JSON.stringify(text)} in ${JSON.stringify(slot.text)}`));
  absent.forEach(text => assert.equal(slot.text.indexOf(text), -1,
    `${label}: no ${JSON.stringify(text)} in ${JSON.stringify(slot.text)}`));
  if (button === null) assert.equal(slot.button, null, `${label}: no check button`);
  else if (button !== undefined) {
    assert.ok(slot.button, `${label}: check button`);
    assert.deepEqual([slot.button.text, slot.button.tag, slot.button.same, slot.button.focused],
      [button, 'BUTTON', true, true], `${label}: the same focused check button`);
  }
}

// Destination outcome announcements start with a settled state's label.
const OUTCOME_STATES = Object.freeze([LABEL.observed, LABEL.example, LABEL.failed,
  LABEL.canceled, LABEL.unavailable]);
const outcomesIn = said => said.filter(text =>
  OUTCOME_STATES.some(state => text.indexOf(state) === 0));
// Announcer texts from now on: listen() on the current overlay's announcer, then mark() and
// since(mark) slice what it heard.
const voiceOf = pg => ({
  listen: () => pg.eval(() => {
    const h = window.h;
    if (h.stopListening) h.stopListening();
    h.listen();
  }),
  mark: () => pg.eval(() => window.h.heard.length),
  since: mark => pg.eval(from => window.h.heard.slice(from), mark),
});
/** Exactly one outcome announcement since mark, with the exact text. */
async function assertOutcomeOnce(voice, mark, outcome, label) {
  const said = await voice.since(mark);
  assert.deepEqual(outcomesIn(said), [outcome],
    `${label}: ${JSON.stringify(outcome)} announced once in ${JSON.stringify(said)}`);
}

rendered('U40 destination slot: states, simulated and fixture results, focus, provider errors',
  async pg => {
    assert.equal(await preparedScene(pg), 7, 'seven codes (precondition)');
    const voice = voiceOf(pg);
    await voice.listen();
    const first = await pg.eval(() => window.h.show('https://example.test/r'));
    assertSlot(first, { state: 'unverified', texts: [LABEL.unverified] }, 'r before a check');
    assert.equal(first.button && first.button.text, LABEL.check, 'r: Check destination');
    assert.equal(await pg.eval(() => window.h.provider.subscribes), 1, 'one subscription');
    let mark = await voice.mark();
    const resolving = await checkButtonPress(pg);
    assertSlot(resolving, { state: 'resolving', texts: [LABEL.resolving, 'Prepared example'],
      button: LABEL.cancel }, 'r resolving');
    const done = await pg.eval(async () => {
      const h = window.h;
      h.time.advance(40);
      await h.task();
      h.time.advance(0);
      await h.task();
      return { slot: h.slot(), snapshot: h.verifier.get('https://example.test/r') };
    });
    const slot = done.slot;
    assertSlot(slot, { state: 'resolved', texts: [LABEL.example, '1 followed',
      'https://example.test/r → https://example.test/final', LABEL.noRequest, 'Prepared example'],
    absent: ['not followed'], button: LABEL.checkAgain }, 'r resolved (simulated)');
    assert.equal(slot.attrs['data-provenance'], 'simulated', 'r: data-provenance');
    assert.equal(slot.final, 'https://example.test/final', 'r: final URL text');
    assert.equal(slot.provenance && slot.provenance.trim(), LABEL.simulated, 'r: badge');
    assert.equal(slot.links, 0, 'r: no link');
    assert.ok(slot.time, 'r: time element');
    assert.equal(Date.parse(slot.time.datetime), done.snapshot.settledAt, 'r: time datetime');
    assertSlot(slot, { texts: [`Example prepared at ${slot.time.text} · simulated latency 40 ms`] },
      'r: example line');
    assert.doesNotMatch(slot.text, /observed|checked|resolved|verified|safe/i,
      'simulated: no observation or verdict words');
    await assertOutcomeOnce(voice, mark, LABEL.example, 'r: simulated result');

    await pg.eval(() => window.h.show('https://example.test/n'));
    mark = await voice.mark();
    assertSlot(await checkButtonPress(pg, 40), { state: 'resolved', texts: ['unknown'],
      absent: ['at least one'], button: LABEL.checkAgain }, 'n: redirects unknown');
    await assertOutcomeOnce(voice, mark, LABEL.example, 'n: simulated result');
    await pg.eval(() => window.h.show('https://example.test/f'));
    mark = await voice.mark();
    const failed = await checkButtonPress(pg, 40);
    assertSlot(failed, { state: 'failed', texts: [LABEL.failed, 'Redirect to a refused scheme',
      '0 followed, 1 not followed', 'https://example.test/f → scheme ftp: refused'],
    button: LABEL.checkAgain }, 'f: refused scheme');
    assert.ok(failed.time, 'f: time element');
    assertSlot(failed, { texts: [`Finished at ${failed.time.text}`] }, 'f: finished line');
    await assertOutcomeOnce(voice, mark, `${LABEL.failed}, Redirect to a refused scheme`,
      'f: failed');
    await pg.eval(() => window.h.show('https://example.test/u'));
    mark = await voice.mark();
    assertSlot(await checkButtonPress(pg, 40), { state: 'unavailable',
      texts: [LABEL.unavailable, 'Resolver busy'], button: LABEL.checkAgain }, 'u: unavailable');
    await assertOutcomeOnce(voice, mark, `${LABEL.unavailable}, Resolver busy`, 'u: unavailable');

    await pg.eval(() => window.h.show('https://example.test/p'));
    mark = await voice.mark();
    assertSlot(await checkButtonPress(pg, 40), { state: 'resolving', texts: [LABEL.resolving],
      button: LABEL.cancel }, 'p: running');
    await pg.eval(() => window.h.show('https://example.test/q'));
    assertSlot(await checkButtonPress(pg), { state: 'queued', texts: [LABEL.queued],
      button: LABEL.cancel }, 'q: queued behind p');
    assert.deepEqual(outcomesIn(await voice.since(mark)), [], 'p running, q queued: no outcome');
    await pg.eval(() => window.h.show('https://example.test/p'));
    mark = await voice.mark();
    assertSlot(await checkButtonPress(pg), { state: 'canceled', texts: [LABEL.canceled, 'Canceled'],
      button: LABEL.checkAgain }, 'p: canceled');
    await assertOutcomeOnce(voice, mark, `${LABEL.canceled}, Canceled`, 'p: canceled');
    mark = await voice.mark();
    assertSlot(await pg.eval(() => window.h.show('https://example.test/q')),
      { state: 'resolving', texts: [LABEL.resolving] }, 'q: started after the cancel');
    assertSlot(await pg.eval(() => window.h.show('https://example.test/m')),
      { state: 'unverified', texts: [LABEL.contactWebsite, LABEL.unverified] }, 'm: MeCard source');

    const quiet = await pg.eval(() => {
      const h = window.h;
      h.show('https://example.test/r');
      const watcher = h.watch('slot', h.readoutSlot);
      h.verifier.forget('https://example.test/n');
      const records = watcher.take();
      watcher.stop();
      return records;
    });
    assert.deepEqual(quiet, [], "another URL's change re-renders nothing");
    assert.deepEqual(outcomesIn(await voice.since(mark)), [],
      'q starting and n forgotten: no outcome announced');

    await pg.eval(() => window.h.show('https://example.test/p'));
    await checkButtonPress(pg);
    const destroyed = await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      const snapshot = h.verifier.get('https://example.test/p');
      return { active: h.provider.active, state: snapshot.state };
    });
    assert.deepEqual(destroyed, { active: 0, state: 'resolving' },
      'destroy() unsubscribes and leaves the shared attempt running');

    // Checks the overlay did not start: the slot follows them, the announcer stays silent.
    await preparedScene(pg);
    await voice.listen();
    const outside = await pg.eval(async () => {
      const h = window.h;
      const states = [];
      for (const url of ['https://example.test/r', 'https://example.test/f']) {
        h.show(url);
        const settled = h.verifier.resolve(url);
        await h.task();
        h.time.advance(40);
        await h.task();
        states.push([(await settled).state, h.slot().attrs['data-destination-state']]);
      }
      h.time.advance(0);
      await h.task();
      return { states, said: h.heard.slice() };
    });
    assert.deepEqual(outside.states, [['resolved', 'resolved'], ['failed', 'failed']],
      'checks started on the verifier settle and show in the slot (precondition)');
    assert.deepEqual(outcomesIn(outside.said), [],
      `checks the overlay did not start: no outcome in ${JSON.stringify(outside.said)}`);

    const ineligible = [['https://u:p@example.test/c', LABEL.credentials],
      [`https://example.test/${'a'.repeat(16400)}`, LABEL.tooLong],
      ['https://example.test/a b', LABEL.controlOrSpace]];
    await preparedScene(pg, { urls: ineligible.map(row => row[0]) });
    for (const [url, reason] of ineligible) {
      const shown = await pg.eval(target => window.h.show(target), url);
      assertSlot(shown, { state: 'ineligible', texts: [reason], button: null },
        `ineligible: ${reason}`);
    }
    await preparedScene(pg, { noTransport: true });
    const idle = await pg.eval(() => ({ can: window.h.verifier.canResolve,
      slot: window.h.show('https://example.test/r') }));
    assert.equal(idle.can, false, 'no transport: canResolve false (precondition)');
    assertSlot(idle.slot, { texts: [LABEL.unverified], button: null }, 'canResolve false');

    await preparedScene(pg);
    const broken = await pg.eval(() => {
      const h = window.h;
      h.show('https://example.test/r');
      const before = h.overlayErrors.length;
      h.verifier.destroy();
      h.show('https://example.test/n');
      const first = h.slot();
      h.show('https://example.test/r');
      return { first, again: h.slot(), errors: h.overlayErrors.splice(before) };
    });
    assert.equal(broken.errors.length, 1, `one onError: ${JSON.stringify(broken.errors)}`);
    assertSlot(broken.first, { state: 'provider-error', texts: [LABEL.providerError],
      button: null }, 'destroyed verifier');
    assertSlot(broken.again, { texts: [LABEL.providerError], button: null },
      'destroyed verifier, other code');

    // U13 rendered: a lone destination.reasons.timeout override replaces that reason and keeps
    // every sibling's English default; a destination.hops function override is used.
    const timeoutUrl = 'https://example.test/t', dnsUrl = 'https://example.test/d';
    assert.equal(await preparedScene(pg, { prepared: PREPARED_FAILURES, urls: [timeoutUrl, dnsUrl],
      create: { labels: { destination: { reasons: { timeout: 'Délai dépassé' } } } } }), 2,
    'two codes (precondition)');
    await voice.listen();
    await pg.eval(url => window.h.show(url), timeoutUrl);
    mark = await voice.mark();
    const timedOut = await checkButtonPress(pg, 40);
    assert.ok(timedOut.time, 'timeout: time element (precondition)');
    assert.deepEqual(timedOut.lines, ['Destination', 'Check failed · Délai dépassé',
      'Redirects: 0 followed', LABEL.simulated, 'Prepared example', LABEL.noRequest,
      `Finished at ${timedOut.time.text}`], 'reasons.timeout alone: slot lines');
    await assertOutcomeOnce(voice, mark, 'Check failed, Délai dépassé', 'timeout override');
    await pg.eval(url => window.h.show(url), dnsUrl);
    mark = await voice.mark();
    const dns = await checkButtonPress(pg, 40);
    assert.deepEqual(dns.lines.slice(0, 3),
      ['Destination', 'Check failed · Name not found', 'Redirects: 0 followed'],
      'reasons.timeout alone: dns_error keeps its English reason');
    await assertOutcomeOnce(voice, mark, 'Check failed, Name not found', 'dns_error');
    const hopped = await pg.eval(url => {
      const h = window.h;
      h.hopsCalls = [];
      h.overlay.setOptions({ labels: { destination: { hops: (followed, oneNotFollowed) => {
        h.hopsCalls.push([followed, oneNotFollowed]);
        return `${followed} suivie(s)${oneNotFollowed ? ', 1 non suivie' : ''}`;
      } } } });
      return { slot: h.show(url), calls: h.hopsCalls.slice() };
    }, timeoutUrl);
    assert.deepEqual(hopped.slot.lines.slice(0, 3),
      ['Destination', 'Check failed · Délai dépassé', 'Redirects: 0 suivie(s)'],
      'destination.hops function override used, the timeout override kept');
    assert.ok(hopped.calls.length > 0 && hopped.calls.every(c => c[0] === 0 && c[1] === false),
      `hops called with (0, false): ${JSON.stringify(hopped.calls)}`);

    const { startFixture } = await destinationFixtures();
    const fixture = await startFixture({ pageOrigins: [origin] });
    try {
      pg.allow(fixture.origin);
      const target = fixture.url('/r/302');
      const before = await pg.eval(([fixtureOrigin, url]) => {
        const h = window.h;
        h.overlay.destroy();
        const D = h.destination;
        h.fixtureVerifier = D.createDestinationVerifier({
          transport: D.createFetchTransport({ scope: 'fixture', fixtureOrigin }) });
        h.create({ mount: 'below', destinations: h.fixtureVerifier });
        h.step(h.tracker(), [h.detection({ text: url, payload: h.url(url),
          occurrences: [h.quad(h.rect(160, 80, 640, 320))] })], 0);
        return h.slot();
      }, [fixture.origin, target]);
      assertSlot(before, { state: 'unverified' }, 'fixture before a check');
      await voice.listen();
      mark = await voice.mark();
      await checkButtonPress(pg);
      await pg.page.waitForFunction(url => {
        const snapshot = window.h.fixtureVerifier.get(url);
        return Boolean(snapshot) && snapshot.state !== 'resolving';
      }, target, { timeout: 15000 });
      const seen = await pg.eval(async () => {
        await window.h.task();
        return window.h.slot();
      });
      await assertOutcomeOnce(voice, mark, LABEL.observed, 'fixture observed');
      assertSlot(seen, { state: 'resolved', texts: [LABEL.observed, 'Local fixture (this browser)',
        'unknown (at least one)', 'HTTP 200', LABEL.response], button: LABEL.checkAgain },
      'fixture observed');
      assert.equal(seen.attrs['data-provenance'], 'fixture', 'fixture: data-provenance');
      assert.equal(seen.provenance && seen.provenance.trim(), LABEL.fixture, 'fixture: badge');
      assert.equal(seen.final, fixture.url('/ok'), 'fixture: final URL text');
      assert.ok(seen.time, 'fixture: time element');
      const when = seen.time.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.match(seen.text, new RegExp(`Observed at ${when} · \\d+ ms`),
        'fixture: observed line');
    } finally {
      await pg.eval(() => {
        const h = window.h;
        if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
        if (h.fixtureVerifier) h.fixtureVerifier.destroy();
      }).catch(() => {});
      await fixture.close();
    }
  });

// A fresh thumbnail overlay and helpers on 1280 x 720 frames.
const thumbSetup = pg => pg.eval(() => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  h.create({ mount: 'below', rail: 'always', thumbnails: true });
  h.image = h.image || h.patterned(1280, 720);
  h.frame720 = (observedAt, sequence) => {
    const frame = { width: 1280, height: 720, observedAt, epoch: 1 };
    if (sequence !== undefined) frame.sequence = sequence;
    return frame;
  };
  h.feed720 = (tracker, detections, observedAt, sequence) =>
    h.step(tracker, detections, observedAt, { width: 1280, height: 720, sequence });
  h.crops = () => h.overlay.inspect().frameImage.crops;
  h.big = () => h.detection({ text: 'BIG', occurrences: [h.quad(h.rect(400, 200, 520, 320))] });
  // The rail thumbnail of a track: device and CSS size, and its center pixel.
  h.thumb = id => {
    const entry = h.railSlot.querySelector(`[role="radio"][data-target-id="${id}"]`);
    const canvas = entry ? entry.querySelector('canvas.qr-camera-thumb') : null;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(canvas.width / 2), y = Math.floor(canvas.height / 2);
    const context = canvas.width ? canvas.getContext('2d') : null;
    return { width: canvas.width, height: canvas.height, css: [rect.width, rect.height],
      pixel: context ? Array.from(context.getImageData(x, y, 1, 1).data) : null };
  };
  return true;
});

function assertPixel(actual, expected, label) {
  assert.ok(Array.isArray(actual), `${label}: pixel read`);
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= 1,
    `${label}: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`));
}

rendered('U41 thumbnails: crop sizes and pixels, keys, bitmaps, errors, caps and pacing',
  async pg => {
    await thumbSetup(pg);
    const crop = await pg.eval(() => {
      const h = window.h;
      const tracker = h.tracker();
      const codes = () => [h.big(),
        h.detection({ text: 'SMALL', occurrences: [h.quad(h.rect(700, 400, 730, 430))] }),
        h.detection({ symbology: 'code128', text: 'LINE',
          occurrences: [h.segment({ x: 100, y: 600 }, { x: 500, y: 600 })] })];
      h.feed720(tracker, codes(), 0, 1);
      const wants = h.overlay.wantsFrameImage();
      h.overlay.setFrameImage(h.image, h.frame720(100, 2));
      const pending = h.overlay.inspect().frameImage.pending;
      h.feed720(tracker, codes(), 100, 2);
      const ids = h.idsByText();
      // Crop boxes (385, 185) 150 px and (696, 396) 38 px: source points of the center pixels.
      const scale = 150 / 96;
      return { wants, pending, after: JSON.parse(JSON.stringify(h.overlay.inspect().frameImage)),
        big: h.thumb(ids.BIG[0]), small: h.thumb(ids.SMALL[0]), line: h.thumb(ids.LINE[0]),
        expected: { big: h.blockColor(385 + 48.5 * scale, 185 + 48.5 * scale),
          small: h.blockColor(696 + 19.5, 396 + 19.5) } };
    });
    assert.deepEqual([crop.wants, crop.pending], [true, true], 'a crop is due, then pending');
    assert.deepEqual(crop.after, { pending: false, crops: 2 }, 'two crops, image released');
    assert.ok(crop.big, '120 px quad: thumbnail');
    assert.deepEqual([crop.big.width, crop.big.height], [96, 96], '120 px quad: 96 x 96 device');
    crop.big.css.forEach(v => assertNear(v, 48, 0.01, '120 px quad: 48 CSS px'));
    assertPixel(crop.big.pixel, crop.expected.big, '120 px quad: center pixel');
    assert.ok(crop.small, '30 px quad: thumbnail');
    assert.deepEqual([crop.small.width, crop.small.height], [38, 38], '30 px quad: 38 x 38');
    crop.small.css.forEach(v => assertNear(v, 19, 0.01, '30 px quad: 19 CSS px'));
    assertPixel(crop.small.pixel, crop.expected.small, '30 px quad: center pixel');
    assert.ok(crop.line === null || crop.line.width === 0, 'scan line: no crop');

    await thumbSetup(pg);
    const keys = await pg.eval(async () => {
      const h = window.h;
      const out = {};
      let tracker = h.tracker();
      h.feed720(tracker, [h.big()], 0, 1);
      h.overlay.setFrameImage(h.image, h.frame720(100, 7));
      h.feed720(tracker, [h.big()], 100, 2);
      out.mismatch = h.crops();
      h.overlay.clear();
      tracker = h.tracker();
      h.feed720(tracker, [h.big()], 0, 1);
      const bitmap = await createImageBitmap(h.image);
      h.overlay.setFrameImage(bitmap, h.frame720(100, 2));
      h.feed720(tracker, [h.big()], 100, 2);
      out.bitmap = { width: bitmap.width, crops: h.crops() };
      const name = fn => {
        try {
          fn();
          return 'none';
        } catch (error) {
          return error.name;
        }
      };
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const small = new ImageData(10, 10);
      out.errors = { size: name(() => h.overlay.setFrameImage(small, h.frame720(200, 3))),
        canvas: name(() => h.overlay.setFrameImage(canvas, h.frame720(200, 3))) };
      h.overlay.clear();
      tracker = h.tracker();
      h.feed720(tracker, [h.big()], 0);
      h.overlay.setFrameImage(h.image, { width: 1280, height: 720, observedAt: 100 });
      h.feed720(tracker, [h.big()], 100);
      out.loose = h.crops();
      h.overlay.clear();
      tracker = h.tracker();
      h.feed720(tracker, [h.big()], 0, 1);
      const one = await createImageBitmap(h.image);
      const two = await createImageBitmap(h.image);
      h.overlay.setFrameImage(one, h.frame720(100, 2));
      h.overlay.setFrameImage(two, h.frame720(100, 2));
      out.replaced = one.width;
      h.feed720(tracker, [h.big()], 100, 2);
      out.second = { width: two.width, crops: h.crops() };
      return out;
    });
    assert.equal(keys.mismatch, 0, 'mismatched sequence: no crop');
    assert.deepEqual(keys.bitmap, { width: 0, crops: 1 }, 'bitmap: cropped, then closed');
    assert.deepEqual(keys.errors, { size: 'RangeError', canvas: 'TypeError' },
      'size mismatch and canvas');
    assert.equal(keys.loose, 1, 'a frame without epoch or sequence matches its update');
    assert.equal(keys.replaced, 0, 'a second pending image closes the first');
    assert.deepEqual(keys.second, { width: 0, crops: 1 }, 'the second image crops, then closes');

    // 70 tracks over time: 16 contents x 4 copies (64 live), they expire, then 6 more.
    const caps = await pg.eval(() => {
      const h = window.h;
      h.overlay.destroy();
      const made = h.canvasSpy();
      const out = {};
      try {
        h.create({ mount: 'below', rail: 'always', thumbnails: true });
        const tracker = h.tracker({ staleMs: 100, reacquireMs: 200 });
        const cell = (col, row) => h.quad(h.rect(40 + col * 160, 20 + row * 90,
          100 + col * 160, 60 + row * 90));
        const first = Array.from({ length: 16 }, (v, i) => h.detection({ text: `FIRST-${i + 1}`,
          occurrences: [0, 1, 2, 3].map(k => cell(i % 8, Math.floor(i / 8) * 4 + k)) }));
        h.feed720(tracker, first, 0, 1);
        out.live = h.last.tracks.length;
        h.overlay.setFrameImage(h.image, h.frame720(100, 2));
        h.feed720(tracker, first, 100, 2);
        out.full = h.crops();
        h.feed720(tracker, [], 300, 3);
        out.expired = [h.last.tracks.length, h.crops()];
        const more = Array.from({ length: 6 }, (v, i) => h.detection({ text: `MORE-${i + 1}`,
          occurrences: [cell(i, 0)] }));
        h.time.advance(1000);
        h.feed720(tracker, more, 400, 4);
        out.wants = h.overlay.wantsFrameImage();
        h.overlay.setFrameImage(h.image, h.frame720(500, 5));
        h.feed720(tracker, more, 500, 5);
        out.mixed = h.crops();
        h.feed720(tracker, [], 800, 6);
        out.final = [h.last.tracks.length, h.last.results.length, h.crops()];
        out.drawn = made.filter(c => c.width > 0 || c.height > 0).length;
        out.inDocument = document.querySelectorAll('canvas').length;
        // Rail entries holding a thumbnail, by content, with the canvas size.
        const textOf = {};
        h.last.results.forEach(result => { textOf[result.id] = result.detection.content.text; });
        out.entries = h.railSlot.querySelectorAll('[role="radio"]').length;
        out.thumbs = Array.from(h.railSlot.querySelectorAll('[role="radio"]')).map(entry => {
          const canvas = entry.querySelector('canvas.qr-camera-thumb');
          return canvas ? [textOf[entry.getAttribute('data-result-id')] || null,
            canvas.width > 0 && canvas.height > 0] : null;
        }).filter(Boolean);
      } finally {
        h.restoreCanvasSpy();
      }
      return out;
    });
    assert.equal(caps.live, 64, '64 live tracks (precondition)');
    assert.equal(caps.full, 64, '64 live crops');
    assert.deepEqual(caps.expired, [0, 16], 'expired: crops move to the 16 results');
    assert.equal(caps.wants, true, 'new codes want a frame');
    assert.equal(caps.mixed, 22, '6 live + 16 retained crops');
    assert.deepEqual(caps.final, [0, 22, 16], 'at most 16 retained crops');
    assert.equal(caps.drawn, caps.final[2],
      `evicted canvases are 0 x 0: ${caps.drawn} canvases keep pixels for ${caps.final[2]} crops`);
    assert.equal(caps.inDocument, 16, 'the 16 retained thumbnails are the only canvases shown');
    assert.equal(caps.entries, 22, '22 Earlier entries in the rail (precondition)');
    // Retained crops are evicted oldest first: FIRST-1 to FIRST-6 go.
    const kept = Array.from({ length: 6 }, (v, i) => `MORE-${i + 1}`)
      .concat(Array.from({ length: 10 }, (v, i) => `FIRST-${i + 7}`));
    assert.deepEqual(caps.thumbs.map(([text]) => text).sort(), kept.slice().sort(),
      'thumbnails kept for MORE-1 to MORE-6 and FIRST-7 to FIRST-16');
    assert.deepEqual(caps.thumbs.filter(([, drawn]) => !drawn), [],
      'every thumbnail in the rail keeps its pixels');

    await thumbSetup(pg);
    const idle = await pg.eval(() => {
      const h = window.h;
      const tracker = h.tracker();
      let wanted = 0;
      for (let at = 0; at <= 60000; at += 100) {
        h.time.advance(100);
        h.feed720(tracker, [], at, at / 100);
        if (h.overlay.wantsFrameImage()) wanted += 1;
      }
      return wanted;
    });
    assert.equal(idle, 0, '60 s idle: wantsFrameImage never true');

    await thumbSetup(pg);
    const paced = await pg.eval(() => {
      const h = window.h;
      const tracker = h.tracker();
      const codes = [0, 1, 2, 3].map(i => h.detection({ text: `PACE-${i + 1}`,
        occurrences: [h.quad(h.rect(100 + i * 280, 200, 300 + i * 280, 400))] }));
      const start = h.time.now(), trues = [];
      for (let k = 0; k <= 600; k += 1) {
        h.time.to(start + k * 100);
        h.feed720(tracker, codes, k * 100, k + 1);
        if (h.overlay.wantsFrameImage()) {
          trues.push(h.time.now() - start);
          h.overlay.setFrameImage(h.image, h.frame720((k + 1) * 100, k + 2));
        }
      }
      return { trues, crops: h.crops() };
    });
    assert.ok(paced.trues.length >= 2, `four codes: frames requested (${paced.trues})`);
    assert.equal(paced.crops, 4, 'four codes: four crops');
    paced.trues.slice(1).forEach((at, i) => assert.ok(at - paced.trues[i] >= 1000,
      `at most one request per 1000 ms: ${paced.trues[i]} then ${at}`));
  }, { page: { deviceScaleFactor: 2 } });

rendered('U42 lifecycle: teardown spies, callback errors, copies, shadow roots, late settles',
  async (pg, t) => {
    const spied = await pg.eval(async () => {
      const h = window.h;
      const spy = h.spy();
      try {
        h.create({ mount: 'below', thumbnails: true });
        const tracker = h.tracker();
        for (let at = 0; at <= 1000; at += 100) {
          h.step(tracker, [h.scene.one(), h.scene.two(), h.scene.stock()], at);
        }
        h.overlay.select('track-2');
        await h.settle();
        const during = { listeners: spy.listeners().length, timers: h.time.pending('overlay') };
        h.overlay.destroy();
        await h.settle();
        return { during, after: { listeners: spy.listeners(), observing: spy.observing(),
          frames: spy.frames(), timers: h.time.pending('overlay') }, leftovers: h.leftovers() };
      } finally {
        spy.restore();
      }
    });
    assert.ok(spied.during.listeners > 0, 'listeners while alive (precondition)');
    assert.ok(spied.during.timers > 0, 'overlay timers while alive (precondition)');
    assert.deepEqual(spied.after, { listeners: [], observing: [], frames: 0, timers: 0 },
      'destroy() leaves no listener, observer, animation frame or timer');
    assert.deepEqual(spied.leftovers, [], 'destroy() leaves no node');

    const thrown = await pg.eval(() => {
      const h = window.h;
      h.create({ mount: 'below', onSelect: () => { throw new Error('select failed'); } });
      h.step(h.tracker(), [h.scene.one(), h.scene.two()], 0);
      const errors = h.overlayErrors.splice(0);
      const out = { errors, state: h.state(), readout: h.readout() && h.readout().content,
        checked: h.entries(h.railSlot).filter(e => e.attrs['aria-checked'] === 'true')
          .map(e => e.attrs['data-target-id']) };
      h.overlay.destroy();
      return out;
    });
    assert.equal(thrown.errors.length, 1, 'onError receives the throw');
    assert.equal(thrown.errors[0].split('\n')[0], 'Error: select failed',
      'onError: the thrown error itself');
    assert.equal(thrown.state.selected, 'track-1', 'consistent after the throw: selection');
    assert.deepEqual(thrown.checked, ['track-1'], 'consistent after the throw: rail');
    assert.equal(thrown.readout, 'https://example.test/one', 'consistent after the throw: readout');
    await pg.eval(() => {
      const h = window.h;
      const overlay = h.overlayModule.createCameraOverlay({ video: h.video, container: h.container,
        clock: h.time.clock('overlay'), mount: { rail: h.railSlot, readout: h.readoutSlot },
        onSelect: () => { throw new Error('rethrown select'); } });
      overlay.update(h.feed(h.tracker(), [h.scene.one()], 0));
      h.rethrowing = overlay;
    });
    const deadline = Date.now() + 3000;
    while (!pg.pageErrors.some(e => /rethrown select/.test(e)) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    const rethrown = pg.takePageErrors();
    assert.equal(rethrown.filter(e => /rethrown select/.test(e)).length, 1,
      'without onError the throw is a pageerror');
    assert.deepEqual(rethrown.filter(e => !/rethrown select/.test(e)), [], 'no other page error');
    await pg.eval(() => window.h.rethrowing.destroy());

    const copies = await pg.eval(async () => {
      const h = window.h;
      const other = await import('/camera-overlay.js?copy=2');
      const own = h.ownCapture(document.body);
      h.create({ mount: 'below' });
      const second = other.createCameraOverlay({ video: own.video, container: own.box,
        clock: h.time.clock('overlay'), onError: error => h.overlayErrors.push(String(error)) });
      h.step(h.tracker(), [h.scene.one(), h.scene.two()], 0);
      second.update(h.feed(h.tracker(), [h.scene.one(), h.scene.two()], 0));
      const ids = Array.from(document.querySelectorAll('[data-qr-camera-overlay] [id], ' +
        '[data-qr-camera-part] [id]')).map(el => el.id);
      const filters = Array.from(document.querySelectorAll('[data-qr-camera-overlay] filter[id]'))
        .map(el => el.id);
      second.destroy();
      h.overlay.destroy();
      own.box.remove();
      return { distinct: other !== h.overlayModule, ids, filters };
    });
    assert.ok(copies.distinct, 'two module copies (precondition)');
    assert.ok(copies.filters.length >= 4, `filters in both copies (${copies.filters})`);
    assert.equal(new Set(copies.ids).size, copies.ids.length, `unique ids: ${copies.ids}`);

    const shadow = await pg.eval(() => {
      const h = window.h;
      const host = document.createElement('div');
      const railHost = document.createElement('div');
      document.body.appendChild(host);
      document.body.appendChild(railHost);
      const own = h.ownCapture(host.attachShadow({ mode: 'open' }));
      const railMount = document.createElement('div');
      railMount.style.width = '400px';
      railHost.attachShadow({ mode: 'open' }).appendChild(railMount);
      const overlay = h.overlayModule.createCameraOverlay({ video: own.video, container: own.box,
        mount: { rail: railMount }, clock: h.time.clock('overlay'),
        onError: error => h.overlayErrors.push(String(error)) });
      overlay.update(h.feed(h.tracker(), [h.scene.one(), h.scene.two()], 0));
      const root = own.box.querySelector(':scope > [data-qr-camera-overlay]');
      const entry = railMount.querySelector('.qr-camera-entry');
      const out = { position: root ? getComputedStyle(root).position : null,
        targets: root ? root.querySelectorAll('g.qr-camera-target').length : 0,
        minHeight: entry ? getComputedStyle(entry).minHeight : null,
        styled: railMount.querySelectorAll('style').length,
        selected: overlay.selected ? overlay.selected.id : null };
      overlay.destroy();
      host.remove();
      railHost.remove();
      return out;
    });
    assert.deepEqual(shadow, { position: 'absolute', targets: 2, minHeight: '44px', styled: 1,
      selected: 'track-1' }, 'inside a shadow root, with the rail in another one');

    const frozen = await pg.eval(() => {
      const h = window.h;
      h.create({ mount: 'below' });
      h.step(h.tracker(), [h.scene.one()], 0);
      const a = h.overlay.inspect(), b = h.overlay.inspect();
      h.overlay.destroy();
      return { distinct: a !== b, frozen: Object.isFrozen(a) && Object.isFrozen(b) };
    });
    assert.deepEqual(frozen, { distinct: true, frozen: true }, 'inspect(): a new frozen object');

    await pg.eval(() => {
      const h = window.h;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: () => new Promise(resolve => { h.releaseCopy = resolve; }) } });
      const clock = h.time.clock('verifier');
      const transport = { kind: 'custom', label: 'Held transport', provenance: 'network',
        resolve: () => new Promise(resolve => { h.releaseCheck = resolve; }) };
      h.heldVerifier = h.destination.createDestinationVerifier({ transport,
        timers: { now: () => 1e12 + h.time.now(), monotonic: () => h.time.now(),
          setTimeout: (callback, ms) => clock.setTimeout(callback, ms),
          clearTimeout: id => clock.clearTimeout(id) } });
      h.create({ mount: 'below', destinations: h.heldVerifier });
      h.step(h.tracker(), [h.scene.one()], 0);
    });
    const readout = pg.page.locator('#below-readout');
    await readout.getByRole('button', { name: LABEL.copy, exact: true }).click();
    await readout.locator('button.qr-camera-check').click();
    const late = await pg.eval(async () => {
      const h = window.h;
      const before = h.overlayErrors.length;
      const pending = [typeof h.releaseCopy, typeof h.releaseCheck];
      h.overlay.destroy();
      if (h.releaseCopy) h.releaseCopy();
      if (h.releaseCheck) {
        h.releaseCheck({ outcome: 'resolved', finalUrl: 'https://example.test/one', status: 200,
          redirects: [], redirected: false, requestSent: true });
      }
      await h.task();
      await h.task();
      return { pending, errors: h.overlayErrors.length - before, timers: h.time.pending('overlay'),
        leftovers: h.leftovers() };
    });
    assert.deepEqual(late.pending, ['function', 'function'], 'a copy and a check pending');
    assert.deepEqual([late.errors, late.timers, late.leftovers], [0, 0, []],
      'settles after destroy(): no onError, no overlay timer, no node');
    assert.deepEqual(pg.takePageErrors(), [], 'settles after destroy(): no page error');

    if (pg.engine !== 'chromium') {
      t.diagnostic(`${pg.engine}: CDP listener and node counts run in Chromium only`);
      return;
    }
    const session = await pg.context.newCDPSession(pg.page);
    try {
      await session.send('Performance.enable');
      await session.send('HeapProfiler.enable');
      const metrics = async () => {
        await session.send('HeapProfiler.collectGarbage');
        const list = (await session.send('Performance.getMetrics')).metrics;
        const pick = name => (list.filter(m => m.name === name)[0] || {}).value;
        return { listeners: pick('JSEventListeners'), nodes: pick('Nodes') };
      };
      const cycles = count => pg.eval(n => {
        const h = window.h;
        for (let i = 0; i < n; i += 1) {
          const overlay = h.overlayModule.createCameraOverlay({ video: h.video,
            container: h.container, mount: { rail: h.railSlot, readout: h.readoutSlot },
            clock: h.time.clock('overlay'),
            onError: error => h.overlayErrors.push(String(error)) });
          overlay.update(h.feed(h.tracker(), [h.scene.one(), h.scene.two(), h.scene.stock()], 0));
          overlay.destroy();
        }
      }, count);
      await cycles(5);
      const baseline = await metrics();
      await cycles(50);
      const end = await metrics();
      assert.equal(typeof baseline.listeners, 'number', 'JSEventListeners metric (precondition)');
      assert.equal(typeof baseline.nodes, 'number', 'Nodes metric (precondition)');
      assert.ok(end.listeners <= baseline.listeners,
        `JSEventListeners ${end.listeners} after 50 cycles, baseline ${baseline.listeners}`);
      assert.ok(end.nodes <= baseline.nodes,
        `Nodes ${end.nodes} after 50 cycles, baseline ${baseline.nodes}`);
    } finally {
      await session.detach().catch(() => {});
    }
  });

// In-video views: size, arrangement, controls height in px and its share of H in percent.
const ARRANGEMENTS = Object.freeze([
  [640, 480, 'regular', 132, 27.5], [400, 300, 'compact', 64, 21.3],
  [343, 257, 'compact', 64, 24.9], [320, 240, 'compact', 64, 26.7],
  [180, 135, 'minimal', 52, 38.5],
].map(([width, height, size, controls, percent]) =>
  Object.freeze({ width, height, size, controls, percent })));
// Mounted part widths and the size attribute each one gets.
const PART_WIDTHS = Object.freeze([[320, 'narrow'], [359, 'narrow'], [360, 'regular'],
  [390, 'regular']]);
// Plain words that wrap well past three lines in a 390 px part.
const WRAPPING_TEXT = Array.from({ length: 60 }, (_, i) => `word${i + 1}`).join(' ');
const NAV_NAMES = Object.freeze([LABEL.previous, LABEL.next]);
const MORE = 'More';
const LESS = 'Less';
// The video and its container at width x height CSS px, through the sheet only.
const sizeRule = (width, height) =>
  `#capture,#capture video{width:${width}px;height:${height}px}`;

// Codes one, two and a low one in an in-video view of the given size; the More node is kept.
const arrangedScene = (pg, view) => pg.eval(async ([rule, names]) => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  h.sheet.textContent = rule;
  h.create();
  h.overlay.update(h.snap({ tracks: [h.code('one'), h.code('two'),
    h.code('third', 'tracked', { points: h.rect(600, 640, 1000, 800),
      detection: h.detection({ text: 'LOW' }) })] }));
  await h.frames();
  h.moreNode = h.root().querySelector('button.qr-camera-more');
  return h.arrangement(names);
}, [sizeRule(view.width, view.height), NAV_NAMES]);

/** Presses a key on the focused element, then reads the arrangement after a frame. */
async function pressAndArrange(pg, key) {
  await pg.page.keyboard.press(key);
  return pg.eval(async names => {
    await window.h.frames(1);
    return window.h.arrangement(names);
  }, NAV_NAMES);
}
// The readout view, then the More button's text, identity and focus.
const moreState = a => [a.view].concat(a.more ? [a.more.text, a.more.same, a.more.focused]
  : [null, null, null]);

rendered('U48 arrangements: in-video views, controls coverage, More and Less, narrow parts',
  async pg => {
    for (const view of ARRANGEMENTS) {
      const label = `${view.width} x ${view.height}`;
      const bar = await arrangedScene(pg, view);
      assert.deepEqual([bar.size, bar.arrangement], [view.size, view.size],
        `${label}: data-qr-camera-size and inspect().arrangement`);
      assertNear(bar.height, view.height, 0.01, `${label}: root height (precondition)`);
      assertNear(bar.covered, view.controls, 0.5, `${label}: controls height from the bottom`);
      assertNear(100 * bar.covered / view.height, view.percent, 0.25,
        `${label}: controls coverage of H in percent`);
      assertNear(bar.controlsHeight, bar.covered, 0.5, `${label}: inspect().controlsHeight`);
      assert.ok(bar.covered <= Math.max(52, 0.35 * view.height) + 0.5,
        `${label}: controls within 35 % of H, or the 52 px floor`);
      assert.equal(bar.badges.length, 3, `${label}: three drawn badges`);
      for (const badge of bar.badges) {
        assert.ok(badge.scene, `${label}: elementFromPoint at the ${badge.id} badge finds ` +
          `${badge.hit}, not the scene`);
        assert.ok(badge.y <= view.height - 12 - bar.covered + 0.05,
          `${label}: ${badge.id} badge y ${badge.y} clamped above the controls`);
      }
      const regular = view.size === 'regular', compact = view.size === 'compact';
      assert.equal(bar.rail > 0, regular, `${label}: in-video rail shown in regular only`);
      assert.deepEqual([bar.previous, bar.next], compact ? [1, 1] : [0, 0],
        `${label}: Previous and Next in the bar`);
      assert.ok(bar.more && bar.more.visible, `${label}: More in the bar`);
      assert.deepEqual([bar.view, bar.more.text], ['bar', MORE], `${label}: the bar view`);

      await pg.page.locator('#capture button.qr-camera-more').focus();
      const card = await pressAndArrange(pg, 'Enter');
      const max = Math.round(0.85 * view.height);
      assert.deepEqual(moreState(card), ['card', LESS, true, true],
        `${label}: More opens the card; the same focused node reads Less`);
      assert.ok(card.card !== null && card.card <= max + 0.5,
        `${label}: card height ${card.card} within round(0.85 H) = ${max}`);
      assert.equal(card.rail, 0, `${label}: the card hides the in-video rail`);
      if (view.size === 'minimal') {
        assert.deepEqual([card.previous, card.next], [1, 1],
          `${label}: Previous and Next in the card`);
      }
      const less = await pressAndArrange(pg, 'Enter');
      assert.deepEqual(moreState(less), ['bar', MORE, true, true],
        `${label}: Less returns to the bar, focus kept`);
      await pressAndArrange(pg, 'Enter');
      const escaped = await pressAndArrange(pg, 'Escape');
      assert.deepEqual(moreState(escaped), ['bar', MORE, true, true],
        `${label}: Escape returns to the bar, focus kept`);
      assert.equal(escaped.rail > 0, regular, `${label}: the rail is back with the bar`);
    }

    for (const [width, size] of PART_WIDTHS) {
      const label = `mounted parts ${width} px wide`;
      const part = await pg.eval(async ([w, text]) => {
        const h = window.h;
        if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
        h.sheet.textContent = `#below{width:${w}px}`;
        h.create({ mount: 'below', rail: 'always' });
        h.overlay.update(h.snap({ tracks: [h.code('one', 'tracked',
          { detection: h.detection({ text }) }), h.code('two')] }));
        h.overlay.select('track-1');
        await h.frames();
        const before = h.partLayout();
        const details = Array.from(h.readoutSlot.querySelectorAll('button'))
          .filter(b => b.hasAttribute('aria-expanded'))[0];
        if (details) details.click();
        await h.frames(1);
        return { before, after: h.partLayout() };
      }, [width, WRAPPING_TEXT]);
      const { before, after } = part;
      assert.deepEqual(before.sizes, [size, size], `${label}: data-qr-camera-size of both parts`);
      assert.ok(before.previews.length > 0, `${label}: rail previews (precondition)`);
      assert.equal(before.previews.filter(display => display === 'none').length,
        size === 'narrow' ? before.previews.length : 0, `${label}: previews hidden when narrow`);
      assert.ok(before.content && before.content.line > 0, `${label}: content (precondition)`);
      const lines = height => (height / before.content.line).toFixed(2);
      if (size === 'narrow') {
        assert.ok(before.content.height <= 3 * before.content.line + 1,
          `${label}: content clamped to 3 lines, not ${lines(before.content.height)}`);
      } else {
        assert.ok(before.content.height >= 4 * before.content.line,
          `${label}: content not clamped (${lines(before.content.height)} lines)`);
      }
      assert.deepEqual(before.details, { text: TEXT.details, expanded: 'false' },
        `${label}: Details, collapsed`);
      assert.deepEqual([after.expanded, after.details && after.details.expanded], ['true', 'true'],
        `${label}: Details expands the readout`);
      const lifted = after.content ? lines(after.content.height) : null;
      assert.ok(after.content && after.content.height >= 4 * before.content.line,
        `${label}: Details lifts the clamp (${lifted} lines)`);
    }
  });

// object-position has no three-value form (only background-position does): an edge offset
// beside center is written as its four-value twin, the same position.
function cssPosition(position) {
  const parts = position.split(' ');
  const at = parts.indexOf('center');
  if (parts.length !== 3 || (at !== 0 && at !== 2)) return position;
  const [edge, offset] = at === 0 ? parts.slice(1) : parts.slice(0, 2);
  if (!/^(left|right|top|bottom)$/.test(edge)) return position;
  return `${edge} ${offset} ${/^(left|right)$/.test(edge) ? 'top' : 'left'} 50%`;
}
// A quad one row in a width x height view, set through the sheet only (no observed attribute).
const sheetRow = (row, width, height) => `#capture{width:${width}px;height:${height}px}` +
  `#capture video{width:${width}px;height:${height}px;object-fit:${row.fit};` +
  `object-position:${cssPosition(row.position)}${row.mirror ? ';transform:scaleX(-1)' : ''}}`;
// Rows whose polygon scales with the view: percentages and keywords in contain, cover or fill.
const scalesWithView = row => ['contain', 'cover', 'fill'].indexOf(row.fit) !== -1 &&
  row.position.indexOf('px') === -1;
const scaledPoints = (points, factor) => points.split(' ')
  .map(pair => pair.split(',').map(v => Number(v) * factor).join(',')).join(' ');

// Applies a row at 200 x 150, then at 400 x 300, waiting for the observers each time; layout()
// is never called.
const resizedRow = (pg, row, text) => pg.eval(async ([r, rules, content, position]) => {
  const h = window.h;
  const id = h.idsByText()[content][0];
  const valid = CSS.supports('object-fit', r.fit) && CSS.supports('object-position', position);
  const read = () => {
    const target = h.target(id);
    return { alignment: h.overlay.alignment,
      viewBox: h.root().querySelector('svg.qr-camera-scene').getAttribute('viewBox'),
      polygon: target ? target.polygon : null,
      fraction: target ? target.attrs['data-visible-fraction'] : null };
  };
  h.setMediaSize(r.media[0], r.media[1]);
  h.sheet.textContent = rules[0];
  await h.frames(4);
  const half = read();
  h.sheet.textContent = rules[1];
  await h.frames(4);
  return { valid, half, full: read() };
}, [row, [sheetRow(row, 200, 150), sheetRow(row, 400, 300)], text, cssPosition(row.position)]);

// Scrolls the rail by its scrollLeft, then by a wheel over it; returns layout reads and offsets.
async function scrollRail(pg, selector) {
  const start = await pg.eval(async css => {
    const h = window.h;
    await h.frames();
    const rail = document.querySelector(css);
    if (!rail) return null;
    h.reads = h.layoutReads();
    rail.scrollLeft = 160;
    await h.frames();
    return { overflow: rail.scrollWidth - rail.clientWidth, left: rail.scrollLeft,
      inspected: JSON.stringify(h.overlay.inspect().view) };
  }, selector);
  if (start === null) return null;
  const center = await centerOf(pg, selector);
  await pg.page.mouse.move(center.x, center.y);
  await pg.page.mouse.wheel(200, 0);
  return pg.eval(async ([css, first]) => {
    const h = window.h;
    await h.frames();
    return Object.assign(first, { wheeled: document.querySelector(css).scrollLeft,
      reads: h.reads.stop(), same: JSON.stringify(h.overlay.inspect().view) === first.inspected });
  }, [selector, start]);
}

rendered('U49 resize and scroll: observers re-layout, rail scrolls read nothing, no page jumps',
  async (pg, t) => {
    await pg.eval(() => {
      const h = window.h;
      h.create({ mount: 'below' });
      h.step(h.tracker(), [h.scene.one()], 0);
    });
    for (const row of QUAD_ONE_ROWS) {
      const name = `${row.fit} ${row.position}${row.mirror ? ' mirrored' : ''} ` +
        `${row.media.join('x')}`;
      const run = await resizedRow(pg, row, 'https://example.test/one');
      assert.ok(run.valid, `${name}: object-fit and object-position are valid CSS (precondition)`);
      assert.equal(run.half.viewBox, '0 0 200 150', `${name}: viewBox after the first resize`);
      assert.equal(run.half.alignment, 'aligned', `${name} at 200 x 150: alignment`);
      if (scalesWithView(row)) {
        assertPoints(run.half.polygon, scaledPoints(row.polygon, 0.5), `${name} at 200 x 150`);
        assertFraction(run.half.fraction, row.fraction, `${name} at 200 x 150`);
      }
      assert.equal(run.full.viewBox, '0 0 400 300', `${name}: viewBox after the second resize`);
      assert.equal(run.full.alignment, 'aligned', `${name} at 400 x 300: alignment`);
      assertPoints(run.full.polygon, row.polygon, `${name} at 400 x 300`);
      assertFraction(run.full.fraction, row.fraction, `${name} at 400 x 300`);
    }
    // Inline sizes: the attribute observer and the resize observer, still without layout().
    const inline = await pg.eval(async content => {
      const h = window.h;
      const id = h.idsByText()[content][0];
      h.sheet.textContent = '';
      h.clearMediaSize();
      [h.container, h.video].forEach(el => {
        el.style.width = '300px';
        el.style.height = '225px';
      });
      await h.frames(4);
      const small = h.target(id);
      [h.container, h.video].forEach(el => el.removeAttribute('style'));
      await h.frames(4);
      const back = h.target(id);
      return { small: small && small.polygon, back: back && back.polygon };
    }, 'https://example.test/one');
    assertPoints(inline.small, scaledPoints(QUAD_ONE_ROWS[0].polygon, 0.75),
      'inline 300 x 225 contain');
    assertPoints(inline.back, QUAD_ONE_ROWS[0].polygon, 'inline sizes removed');

    // Rail scrolls, mounted and in-video (regular arrangement): no layout read.
    for (const [where, settings, selector] of [
      ['mounted', { mount: 'below', rail: 'always' }, '#below-rail .qr-camera-rail'],
      ['in-video', { rail: 'always' }, '#capture .qr-camera-rail']]) {
      await pg.eval(([options, rule]) => {
        const h = window.h;
        h.overlay.destroy();
        h.sheet.textContent = rule;
        h.create(options);
        h.overlay.update(h.snap({ tracks: h.lineup(8) }));
      }, [settings, where === 'in-video' ? sizeRule(640, 480) : '']);
      const run = await scrollRail(pg, selector);
      assert.ok(run, `${where}: rail (precondition)`);
      assert.ok(run.overflow > 0 && run.left > 0, `${where}: the rail scrolls (precondition)`);
      t.diagnostic(`${pg.engine} ${where}: scrollLeft ${run.left}, after the wheel ${run.wheeled}`);
      assert.equal(run.reads, 0, `${where}: layout reads of the video or container on rail scroll`);
      assert.equal(run.same, true, `${where}: the view is unchanged`);
    }

    // Automatic selection changes in a scrolled page with a scrolled parent: nothing moves.
    const jumps = await pg.eval(async () => {
      const h = window.h;
      h.overlay.destroy();
      h.sheet.textContent = 'body{padding-bottom:1600px}#below{height:140px;overflow:auto}';
      h.create({ mount: 'below', rail: 'always' });
      const update = (now, lost) => {
        h.overlay.update(h.snap({ now, tracks: h.lineup(8, i => (lost(i) ? 'lost' : 'tracked')) }));
        return h.overlay.selected ? h.overlay.selected.id : null;
      };
      const out = { selected: [update(1000, () => false)] };
      await h.frames();
      h.outside.focus({ preventScroll: true });
      window.scrollTo(0, 120);
      h.below.scrollTop = 30;
      await h.frames();
      const entry = () => h.railSlot.querySelector('[data-target-id="track-8"]');
      out.entry = Boolean(entry());
      out.before = entry() ? h.scrolls(entry()) : [];
      out.selected.push(update(1100, i => i < 7));
      await h.frames();
      out.afterFirst = entry() ? h.scrolls(entry()) : [];
      out.selected.push(update(1200, i => i === 7));
      await h.frames();
      out.afterSecond = entry() ? h.scrolls(entry()) : [];
      out.focused = document.activeElement === h.outside;
      return out;
    });
    assert.ok(jumps.entry, 'eight entries (precondition)');
    assert.deepEqual(jumps.selected, ['track-1', 'track-8', 'track-1'],
      'automatic selection: Code 1, then Code 8 when 1-7 are lost, then Code 1 (precondition)');
    assert.equal(jumps.focused, true, 'focus stays outside the overlay (precondition)');
    assert.equal(jumps.before[0], 'window 0 120', 'page scrolled (precondition)');
    assert.deepEqual(jumps.afterFirst, jumps.before, 'Code 8 selected automatically: no scroll');
    assert.deepEqual(jumps.afterSecond, jumps.before, 'Code 1 selected automatically: no scroll');
  });

/** Source-over composite rounded to 8-bit channels, as the display stores it. */
const blend8 = (color, background) => composite(color, background).slice(0, 3).map(Math.round);

/**
 * The ink of a sample and the background under it, as displayed (8-bit sRGB): opacities below
 * the first background apply to the ink; translucent backgrounds stack over the first opaque
 * one, or over white when there is none.
 */
function inkPair(sample) {
  let alpha = 1;
  const layers = [];
  for (const node of sample.chain) {
    const background = parseColor(node.background);
    if (background[3] > 0) layers.push(background);
    if (!layers.length) alpha *= Number(node.opacity);
    if (background[3] >= 1) break;
  }
  let base = [255, 255, 255];
  layers.reverse().forEach(layer => { base = blend8(layer, base); });
  const ink = parseColor(sample.color);
  return [blend8([ink[0], ink[1], ink[2], ink[3] * alpha], base), base];
}

// scheme x colors x dim (null: the default) x mounted parts or in-video controls.
const READABILITY = Object.freeze(['dark', 'light'].flatMap(scheme =>
  ['track', 'mono'].flatMap(colors => [null, 0].flatMap(dim =>
    [true, false].map(mounted => Object.freeze({ scheme, colors, dim, mounted }))))));

// Eight codes (six quads, a scan line, a content track) in a 640 x 480 view, Code 1 selected:
// rail inks, the checked cue and its focus ring with the bar shown, scene numerals, then the
// full readout (the card in-video) with Details open and the focus ring of Copy.
const readability = (pg, combo) => pg.eval(async ([c, copyName]) => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  const dark = c.host === 'dark';
  h.sheet.textContent = `:root{color-scheme:${c.host};background:${dark ? '#000' : '#fff'};` +
    `color:${dark ? '#fff' : '#000'}}#capture,#capture video{width:640px;height:480px}`;
  const settings = { scheme: c.scheme, colors: c.colors, rail: 'always' };
  if (c.dim !== null) settings.effects = { dim: c.dim };
  if (c.mounted) settings.mount = 'below';
  h.create(settings);
  const tracks = h.lineup(6);
  tracks[0].detection = h.scene.one();
  tracks.push({ id: 'track-7', slot: 6, resultId: 'result-7', kind: 'segment',
    points: [{ x: 200, y: 700 }, { x: 600, y: 700 }], detection: h.scene.stock() });
  tracks.push({ id: 'track-8', slot: 7, resultId: 'result-8',
    detection: h.detection({ text: 'CONTENT ONLY' }) });
  h.overlay.update(h.snap({ tracks }));
  h.overlay.select('track-1');
  await h.frames();
  const scope = c.mounted ? h.below : h.root();
  const entries = Array.from(scope.querySelectorAll('.qr-camera-entry'));
  const checked = entries.filter(e => e.getAttribute('aria-checked') === 'true')[0] || null;
  const out = { rail: [].concat(...entries.map(e => h.inks(e))), checked: h.edge(checked),
    entryRing: h.ring(checked),
    numerals: Array.from(h.root().querySelectorAll('g.qr-camera-target')).map(g => {
      const disc = g.querySelector('.qr-camera-badge circle:not(.qr-camera-hit)');
      const text = g.querySelector('.qr-camera-badge text');
      return disc && text ? { id: g.getAttribute('data-target-id'),
        selected: g.getAttribute('data-selected') === 'true',
        disc: getComputedStyle(disc).fill, text: getComputedStyle(text).fill } : null;
    }).filter(Boolean) };
  const more = h.root().querySelector('button.qr-camera-more');
  if (!c.mounted && more) more.click();
  await h.frames(1);
  const readout = scope.querySelector('section.qr-camera-readout');
  const buttons = () => (readout ? Array.from(readout.querySelectorAll('button')) : []);
  const details = buttons().filter(b => b.hasAttribute('aria-expanded'))[0];
  if (details) details.click();
  await h.frames(1);
  out.readout = h.inks(readout);
  out.copyRing = h.ring(buttons().filter(b => b.textContent.trim() === copyName)[0] || null);
  return out;
}, [combo, LABEL.copy]);

rendered('U50 readability: text, captions, checked cue, focus rings and numerals', async pg => {
  // Numerals under 4.5:1, reported together once every other check has run.
  const faint = [];
  const check = async (page, host) => {
    for (const combo of READABILITY) {
      const c = Object.assign({ host }, combo);
      const label = `${host} host, scheme ${c.scheme}, ${c.colors} colors, dim ` +
        `${c.dim === null ? 'default' : c.dim}, ${c.mounted ? 'mounted' : 'in-video'}`;
      const run = await readability(page, c);
      assert.ok(run.rail.length > 0, `${label}: rail text (precondition)`);
      assert.ok(run.readout.length > 0, `${label}: readout text (precondition)`);
      const captions = run.rail.filter(s => /qr-camera-caption/.test(s.cls));
      assert.ok(captions.length > 0, `${label}: captions (precondition)`);
      for (const sample of run.rail.concat(run.readout)) {
        const [ink, base] = inkPair(sample);
        const ratio = contrastRatio(ink, base);
        const name = `${label}: ${sample.cls} ${JSON.stringify(sample.text)}`;
        // The check glyph is the checked cue (3:1); every other text needs 4.5:1.
        const need = /qr-camera-check/.test(sample.cls) ? 3 : 4.5;
        assert.ok(ratio >= need, `${name}: ${ratio.toFixed(2)}:1, ${ink} on ${base}`);
        assert.ok(parseFloat(sample.size) >= 12, `${name}: font size ${sample.size}`);
      }
      // The reference pair in Chromium: caption .8 on #121212, 12.15:1.
      if (pg.engine === 'chromium' && c.scheme === 'dark' && c.dim === null) {
        for (const sample of captions) {
          const name = `${label}: caption ${JSON.stringify(sample.text)}`;
          const [ink, base] = inkPair(sample);
          assert.deepEqual([ink, base], [[208, 208, 208], [18, 18, 18]],
            `${name}: rgb(208,208,208) on rgb(18,18,18)`);
          assertNear(contrastRatio(ink, base), 12.15, 0.005, `${name}: caption .8 on #121212`);
        }
      }
      assert.ok(run.checked, `${label}: a checked entry (precondition)`);
      const [border, under] = inkPair(run.checked);
      const cue = contrastRatio(border, under);
      assert.ok(parseFloat(run.checked.width) > 0 && cue >= 3,
        `${label}: checked border ${run.checked.width} ${border} on ${under}: ${cue.toFixed(2)}:1`);
      for (const [which, ring] of [['checked entry', run.entryRing], ['Copy', run.copyRing]]) {
        assert.ok(ring, `${label}: ${which} (precondition)`);
        assert.equal(ring.visible, true, `${label}: ${which} matches :focus-visible`);
        assert.ok(ring.style !== 'none' && parseFloat(ring.width) >= 2,
          `${label}: ${which} focus ring ${ring.style} ${ring.width}`);
        const [color, behind] = inkPair(ring);
        const ratio = contrastRatio(color, behind);
        assert.ok(ratio >= 3, `${label}: ${which} focus ring ${color} on ${behind}: ` +
          `${ratio.toFixed(2)}:1`);
      }
      // Track and mono colors; selected (filled) and unselected (hollow in mono) badges.
      assert.ok(run.numerals.length > 0, `${label}: scene numerals (precondition)`);
      assert.deepEqual([true, false].map(selected =>
        run.numerals.some(numeral => numeral.selected === selected)), [true, true],
        `${label}: a selected and an unselected badge (precondition)`);
      for (const numeral of run.numerals) {
        const badge = `${numeral.id} ${numeral.selected ? 'selected' : 'unselected'} badge`;
        const disc = parseColor(numeral.disc);
        assert.equal(disc[3], 1, `${label}: ${badge}: opaque disc ${numeral.disc}`);
        const ratio = contrastRatio(blend8(parseColor(numeral.text), disc), disc.slice(0, 3));
        if (!(ratio >= 4.5)) {
          faint.push(`${label}: ${badge}: numeral ${numeral.text} on ${numeral.disc}: ` +
            `${ratio.toFixed(2)}:1`);
        }
      }
    }
  };
  await check(pg, 'light');
  await withPage(pg.engine, { colorScheme: 'dark' }, page => check(page, 'dark'));
  assert.deepEqual(faint, [], 'every scene numeral reaches 4.5:1 on its disc');
}, { engines: ['chromium', 'webkit'] });

/** Seeded uniform numbers in [0, 1) (mulberry32), so a pattern is the same on every run. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
// Precision patterns of the selected track: name, a factory of precise(k, at, before) for frame
// k at `at` ms (the previous frame at `before`), and the exact activation count (null: any).
const FLASH_PATTERNS = Object.freeze([
  ['alternating', () => k => k % 2 === 0, 0],
  ['one miss every 800 ms', () => (k, at, before) => k === 0 ||
    Math.floor(at / 800) === Math.floor(before / 800), 3],
  ['seeded misses', () => {
    const next = seeded(59);
    return () => next() >= 0.08;
  }, null],
]);
/** Accepted frames at hz for durationMs from start: { now, sequence, precise }. */
function flashFrames(hz, durationMs, start, precise) {
  const offset = k => Math.round(k * 1000 / hz);
  return Array.from({ length: Math.floor(durationMs * hz / 1000) + 1 }, (_, k) => ({
    now: start + offset(k), sequence: k + 1, precise: precise(k, offset(k), offset(k - 1)) }));
}
/**
 * The effects state machine on snapshot.now. E(k) = P(k) and P(k - 1): off in the update where
 * E turns false; on once E has held for dwellMs and cooldownMs has passed since the last
 * switch-off (twice that from reducedAt on).
 */
function flashModel(frames, { dwellMs = 500, cooldownMs = 1000, reducedAt = Infinity } = {}) {
  let active = false, eligibleSince = null, offSince = null, last = false;
  const states = [], activations = [];
  frames.forEach(f => {
    const eligible = f.precise && last;
    last = f.precise;
    if (!eligible) {
      eligibleSince = null;
      if (active) {
        active = false;
        offSince = f.now;
      }
    } else {
      if (eligibleSince === null) eligibleSince = f.now;
      const cooldown = cooldownMs * (f.now >= reducedAt ? 2 : 1);
      if (!active && f.now - eligibleSince >= dwellMs &&
        (offSince === null || f.now - offSince >= cooldown)) {
        active = true;
        activations.push(f.now);
      }
    }
    states.push(active);
  });
  return { states, activations };
}

// One overlay fed one snapshot per frame (the fake clock follows); after each update: effects,
// holes and the data-active of blur, scrim and wash.
const flashRun = (pg, frames, fresh) => pg.eval(([list, create]) => {
  const h = window.h;
  if (create) {
    if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
    h.create();
  }
  const root = h.root();
  const layers = ['.qr-camera-blur', 'path.qr-camera-scrim', 'path.qr-camera-wash']
    .map(selector => root.querySelector(selector));
  return list.map(f => {
    h.time.to(f.now);
    h.overlay.update(h.snap({ now: f.now, sequence: f.sequence,
      tracks: [h.code('one', 'tracked', { precise: f.precise })] }));
    const inspected = h.overlay.inspect();
    return { active: inspected.effects.active, activations: inspected.effects.activations,
      holes: inspected.clip === null ? 0 : inspected.clip.split(/ (?=M)/).length - 1,
      layers: layers.map(el => (el ? el.getAttribute('data-active') : null)) };
  });
}, [frames, fresh]);

function assertFlash(observed, frames, model, label, reducedAt = Infinity) {
  assert.deepEqual(observed.map(o => o.active), model.states, `${label}: active after each update`);
  const rises = [];
  observed.forEach((o, k) => {
    const at = `${label} at ${frames[k].now} ms`;
    if (k > 0 && o.active && !observed[k - 1].active) rises.push(frames[k].now);
    if (!frames[k].precise) assert.equal(o.holes, 0, `${at}: holes gone in the losing update`);
    if (o.active) assert.equal(o.holes, 1, `${at}: the hole while active`);
    const value = o.active ? 'true' : 'false';
    assert.deepEqual(o.layers, [value, value, value], `${at}: data-active of blur, scrim, wash`);
  });
  assert.deepEqual(rises, model.activations, `${label}: false -> true times`);
  assert.equal(observed[observed.length - 1].activations, model.activations.length,
    `${label}: inspect().effects.activations`);
  rises.forEach((at, i) => {
    const gap = i === 0 ? Infinity : at - rises[i - 1];
    const least = at >= reducedAt ? 2000 : 1000;
    assert.ok(gap >= least, `${label}: activations ${gap} ms apart at ${at} (at least ${least})`);
  });
}

rendered('U51 flash limiter: 10 and 30 Hz precision flapping, dwell, cooldown, reduced motion',
  async (pg, t) => {
    await pg.page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await pg.eval(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      false, 'no reduced motion at the start (precondition)');
    let start = 0;
    for (const hz of [10, 30]) {
      for (const [name, pattern, count] of FLASH_PATTERNS) {
        const frames = flashFrames(hz, 5000, start, pattern());
        const model = flashModel(frames);
        const label = `${hz} Hz, ${name}`;
        if (count !== null) {
          assert.equal(model.activations.length, count, `${label}: activations (model)`);
        }
        t.diagnostic(`${label}: activations at ${model.activations.map(a => a - start)} ms`);
        assertFlash(await flashRun(pg, frames, true), frames, model, label);
        start += 10000;
      }
    }
    // Reduced motion from the middle of a run on: the cooldown doubles for later activations.
    const reducedAt = start + 2500;
    const frames = flashFrames(10, 5000, start, FLASH_PATTERNS[1][1]());
    const first = frames.filter(f => f.now < reducedAt);
    const observed = await flashRun(pg, first, true);
    await pg.page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await pg.eval(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      true, 'reduced motion after the toggle (precondition)');
    const rest = await flashRun(pg, frames.slice(first.length), false);
    const model = flashModel(frames, { reducedAt });
    assert.deepEqual(model.activations.map(a => a - start), [600, 2300, 4700],
      'reduced from 2500 ms: the third activation waits 2000 ms after the switch-off (model)');
    assertFlash(observed.concat(rest), frames, model, 'reduced motion mid-run', reducedAt);
  });

// A new overlay with mounted parts over codes one (URL) and text (track-2), at fake time now.
const focusScene = (pg, settings = {}) => pg.eval(options => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  h.create(Object.assign({ mount: 'below' }, options));
  h.time.to(h.time.now() + 100);
  h.overlay.update(h.snap({ now: h.time.now(), tracks: [h.code('one'), h.code('text')] }));
  return h.overlay.selected ? h.overlay.selected.id : null;
}, settings);

// Applies a snapshot of the named codes ([name, state]) with expired events for gone ids;
// returns the focused element, whether it kept its node, the focus lock and the selection.
const focusUpdate = (pg, codes, gone = []) => pg.eval(([list, expired]) => {
  const h = window.h;
  const before = document.activeElement;
  h.time.to(h.time.now() + 100);
  const now = h.time.now();
  h.overlay.update(h.snap({ now, tracks: list.map(([name, state]) => h.code(name, state)),
    events: expired.map(trackId => ({ type: 'expired', trackId, at: now, reason: 'timeout' })) }));
  const el = document.activeElement;
  const toolbar = document.querySelector('#below-rail .qr-camera-rail');
  return { same: el === before, body: el === null || el === document.body, attrs: h.attrs(el),
    lock: h.overlay.inspect().locks.focus, rail: Boolean(toolbar) && h.visible(toolbar),
    placeholders: document.querySelectorAll('#below-rail [aria-disabled="true"]').length,
    selected: h.overlay.selected ? h.overlay.selected.id : null };
}, [codes, gone]);

/** Moves focus out of the overlay to the page's own button, without the pointer. */
async function leaveOverlay(pg) {
  await pg.page.locator('#outside').focus();
  assert.equal(await pg.eval(() => document.activeElement === window.h.outside), true,
    'focus left the overlay (precondition)');
}

rendered('U52 focus lock: placeholders keep focus, the rail stays, no switch, focus moves on',
  async pg => {
    const focused = () => pg.page.locator(':focus');
    // The focused selected entry expires: an aria-disabled placeholder keeps focus and name.
    await focusScene(pg);
    await pg.eval(() => window.h.overlay.select('track-1'));
    await railEntry(pg, 'track-1').focus();
    const expired = await focusUpdate(pg, [['text', 'tracked']], ['track-1']);
    assert.equal(expired.body, false, 'expired: activeElement is not body');
    assert.equal(expired.same, true, 'expired: the focused node keeps focus');
    assert.deepEqual([expired.attrs['data-target-id'], expired.attrs['aria-disabled'],
      expired.attrs['data-state']], ['track-1', 'true', 'expired'],
    'expired: an aria-disabled placeholder');
    assert.equal(expired.lock, true, 'expired: inspect().locks.focus');
    await assertAccessible(focused(), { name: 'Code 1, QR Code' }, 'expired: placeholder name');
    await leaveOverlay(pg);
    const left = await focusUpdate(pg, [['text', 'tracked']]);
    assert.deepEqual([left.placeholders, left.lock], [0, false],
      'after focus leaves: no placeholder, no lock');

    // rail 'multiple', retained false: the second code expires while focused; the rail stays.
    await focusScene(pg, { rail: 'multiple', retained: false });
    await railEntry(pg, 'track-2').focus();
    const second = await focusUpdate(pg, [['one', 'tracked']], ['track-2']);
    assert.equal(second.body, false, 'second expires: activeElement is not body');
    assert.deepEqual([second.same, second.rail, second.attrs['data-target-id'],
      second.attrs['aria-disabled']], [true, true, 'track-2', 'true'],
    'second expires: the rail stays displayed around the focused placeholder');
    await assertAccessible(focused(), { name: 'Code 2, QR Code' }, 'second expires: name');
    await leaveOverlay(pg);
    const single = await focusUpdate(pg, [['one', 'tracked']]);
    assert.deepEqual([single.rail, single.placeholders], [false, 0],
      "after focus leaves: rail 'multiple' hides with one live code");

    // Copy focused: Code 1 is lost while Code 2 is tracked; no automatic switch until focus
    // leaves.
    await pg.eval(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true,
        value: { writeText: () => Promise.resolve() } });
    });
    assert.equal(await focusScene(pg), 'track-1', 'automatic selection of Code 1 (precondition)');
    await pg.page.locator('#below-readout').getByRole('button', { name: LABEL.copy, exact: true })
      .focus();
    const held = await focusUpdate(pg, [['one', 'lost'], ['text', 'tracked']]);
    assert.deepEqual([held.body, held.same, held.lock, held.selected],
      [false, true, true, 'track-1'], 'Copy focused: the lost Code 1 stays selected');
    await assertAccessible(focused(), { name: LABEL.copy }, 'Copy focused: name');
    await leaveOverlay(pg);
    const released = await focusUpdate(pg, [['one', 'lost'], ['text', 'tracked']]);
    assert.deepEqual([released.lock, released.selected], [false, 'track-2'],
      'focus left: automatic selection moves to Code 2');

    // Open focused, then select() of the text code: focus moves to Details.
    await focusScene(pg);
    await pg.eval(() => window.h.overlay.select('track-1'));
    const open = pg.page.locator('#below-readout').getByRole('button', { name: TEXT.open,
      exact: true });
    await open.focus();
    const moved = await pg.eval(openName => {
      const h = window.h;
      h.overlay.select('track-2');
      const el = document.activeElement;
      return { body: el === null || el === document.body, text: el ? el.textContent.trim() : null,
        expanded: el ? el.getAttribute('aria-expanded') : null,
        inReadout: Boolean(el && h.readoutSlot.contains(el)),
        opens: Array.from(h.readoutSlot.querySelectorAll('button'))
          .filter(b => b.textContent.trim() === openName).length };
    }, TEXT.open);
    assert.equal(moved.body, false, 'select(): activeElement is not body');
    assert.deepEqual([moved.opens, moved.inReadout, moved.text, moved.expanded],
      [0, true, TEXT.details, 'false'], 'select() of a text code: focus moves to Details');
    await assertAccessible(focused(), { name: TEXT.details }, 'focus on Details: name');
  });

// Announcer timeline, one snapshot per 100 ms tick: [at, [[code, state], ...]].
//   0-1400      Code 1 alone, tracked (automatic selection);
//   1500-6400   Codes 1 and 2 flap tracked/held at 10 Hz; select('track-2') at 3000;
//   6500-19900  both tracked, except Code 2 lost from 7000 to 7900;
//   20000-25900 Code 3 from 20000, Code 4 from 20300 to 22900.
const ANNOUNCER_SELECT_AT = 3000;
const ANNOUNCER_TICKS = Object.freeze(Array.from({ length: 260 }, (_, i) => {
  const at = i * 100;
  if (at < 1500) return [at, [['one', 'tracked']]];
  if (at < 6500) {
    const state = i % 2 === 0 ? 'tracked' : 'held';
    return [at, [['one', state], ['two', state]]];
  }
  const two = at >= 7000 && at < 8000 ? 'lost' : 'tracked';
  const codes = [['one', 'tracked'], ['two', two]];
  if (at >= 20000) codes.push(['third', 'tracked']);
  if (at >= 20300 && at < 23000) codes.push(['fourth', 'tracked']);
  return [at, codes];
}));
const SELECTED = Object.freeze({ one: 'Code 1, QR Code, URL, In view',
  two: 'Code 2, QR Code, URL, In view' });
const COUNT_TEXT = /^(No codes detected|1 code detected|\d+ codes detected)$/;
// Decoded texts no announcement may carry by default.
const SPOKEN_CONTENT = Object.freeze(['https://example.test/one', 'javascript:alert(1)',
  'THIRD CODE', 'FOURTH CODE', 'example.test']);

rendered('U53 announcer: selection timing, no flapping, Lost and In view, counts, Copy, content',
  async pg => {
    const said = await pg.eval(async ([ticks, selectAt]) => {
      const h = window.h;
      h.create({ mount: 'below' });
      h.voice();
      const byTime = new Map(ticks);
      const tick = now => {
        if (!byTime.has(now)) return;
        h.overlay.update(h.snap({ now, sequence: now / 100 + 1,
          tracks: byTime.get(now).map(([name, state]) => h.code(name, state)) }));
        if (now === selectAt) h.overlay.select('track-2');
      };
      tick(h.time.now());
      await h.walk(26000, 50, tick);
      return h.said.slice();
    }, [ANNOUNCER_TICKS, ANNOUNCER_SELECT_AT]);
    const between = (from, to) => said.filter(s => s.at > from && s.at <= to);
    const show = list => JSON.stringify(list);

    const first = said.filter(s => s.text === SELECTED.one)[0];
    assert.ok(first, `Code 1 selection announced: ${show(said)}`);
    assert.ok(first.at >= 250 && first.at <= 300, `Code 1 announced 250 ms after: ${first.at}`);

    const flapping = between(1500, 6500);
    const chosen = flapping.filter(s => s.text === SELECTED.two);
    assert.equal(chosen.length, 1, `selection during flapping: once in ${show(flapping)}`);
    // State changes every 100 ms never restart the 250 ms wait.
    const chosenAt = chosen[0].at - ANNOUNCER_SELECT_AT;
    assert.ok(chosenAt >= 250 && chosenAt <= 300,
      `selection during flapping announced ${chosenAt} ms after the change, not 250`);
    assert.deepEqual(flapping.filter(s => s.text !== SELECTED.two && !COUNT_TEXT.test(s.text)), [],
      'no state announcement from tracked/held flapping');
    const pair = flapping.filter(s => COUNT_TEXT.test(s.text));
    assert.deepEqual(pair.map(s => s.text), ['2 codes detected'], 'count of two codes');
    assert.ok(pair[0].at >= 2500, `count announced 1 s after the change: ${pair[0].at}`);

    const states = between(6500, 20000).filter(s => !COUNT_TEXT.test(s.text));
    const lost = states.filter(s => /\bLost\b/.test(s.text))[0];
    assert.ok(lost && lost.at >= 7000 && lost.at < 10000, `Lost announced: ${show(states)}`);
    const back = states.filter(s => s.at > lost.at && /\bIn view\b/.test(s.text))[0];
    assert.ok(back && back.at <= 17000, `In view announced after Lost: ${show(states)}`);
    states.forEach((s, i) => {
      if (i > 0) {
        assert.ok(s.at - states[i - 1].at >= 3000,
          `one state announcement per target per 3 s: ${show(states)}`);
      }
    });

    const counts = between(20000, 26000).filter(s => COUNT_TEXT.test(s.text));
    assert.deepEqual(counts.map(s => s.text), ['4 codes detected', '3 codes detected'],
      'counts debounced 1000 ms after the last change');
    assert.ok(counts[0].at >= 21300 && counts[0].at <= 21350, `4 codes at ${counts[0].at}`);
    assert.ok(counts[1].at >= 24000 && counts[1].at <= 24050, `3 codes at ${counts[1].at}`);
    for (const s of said) {
      SPOKEN_CONTENT.forEach(text => assert.equal(s.text.indexOf(text), -1,
        `announceContent 'none': ${JSON.stringify(s.text)} carries decoded content`));
    }

    // A repeated Copy: both outcomes are announced (cleared, then set again in the next task).
    await pg.eval(() => {
      const h = window.h;
      h.clip = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: text => {
          h.clip.push(text);
          return Promise.resolve();
        } } });
      h.said.length = 0;
    });
    const copy = pg.page.locator('#below-readout')
      .getByRole('button', { name: LABEL.copy, exact: true });
    for (let i = 0; i < 2; i += 1) {
      await copy.click();
      await pg.eval(async () => {
        const h = window.h;
        for (let k = 0; k < 3; k += 1) {
          await h.task();
          h.hear();
        }
        await h.walk(h.time.now() + 500, 50);
        await h.task();
        h.hear();
      });
    }
    const copied = await pg.eval(() => ({ clip: window.h.clip.length,
      said: window.h.said.slice() }));
    assert.equal(copied.clip, 2, 'two copies (precondition)');
    assert.equal(copied.said.filter(s => s.text === LABEL.copied).length, 2,
      `both Copy outcomes announced: ${show(copied.said)}`);

    // announceContent 'preview' appends the preview to the selection announcement.
    const preview = await pg.eval(async () => {
      const h = window.h;
      h.overlay.destroy();
      h.create({ mount: 'below', announceContent: 'preview' });
      h.voice();
      const start = h.time.now() + 100;
      h.time.to(start);
      h.overlay.update(h.snap({ now: start, tracks: [h.code('one')] }));
      h.hear();
      await h.walk(start + 1500, 50);
      return { start, said: h.said.slice() };
    });
    const spoken = preview.said.filter(s => s.text.indexOf('Code 1,') === 0)[0];
    assert.ok(spoken, `preview: a selection announcement in ${show(preview.said)}`);
    assert.equal(spoken.text, `${SELECTED.one}, https://example.test/one`,
      "announceContent 'preview': the preview follows the state");
    assert.ok(spoken.at - preview.start >= 250 && spoken.at - preview.start <= 300,
      `preview: announced ${spoken.at - preview.start} ms after the selection`);

    const announcer = await pg.eval(() => {
      const h = window.h;
      const el = h.root().querySelector('.qr-camera-announcer');
      const hidden = [];
      for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (node.hidden || node.getAttribute('aria-hidden') === 'true' ||
          style.display === 'none' || style.visibility === 'hidden') {
          hidden.push(node.getAttribute('class') || node.tagName);
        }
      }
      return el ? { role: el.getAttribute('role'), atomic: el.getAttribute('aria-atomic'),
        child: el.parentElement === h.root(), hidden } : null;
    });
    assert.deepEqual(announcer, { role: 'status', atomic: 'true', child: true, hidden: [] },
      'announcer: role=status, aria-atomic, a direct child of the root, never hidden');
  });

// What moving geometry may rewrite: attribute -> the elements that carry it.
const GEOMETRY_WRITES = Object.freeze({
  d: /^path\.qr-camera-(casing|glow|outline|scrim|wash)$/,
  points: /^polygon\.qr-camera-hit$/,
  transform: /^g\.qr-camera-badge$/,
  x: /^filter\./, y: /^filter\./, width: /^filter\./, height: /^filter\./,
  style: /^div\.qr-camera-blur$/,
});

rendered('U54 mutation budget: unchanged time snapshots write nothing; motion writes geometry',
  async pg => {
    const run = await pg.eval(async () => {
      const h = window.h;
      h.create({ mount: 'below' });
      const tracker = h.tracker({ smoothing: { kind: 'none' } });
      const frame = (at, dx) => {
        h.time.to(at);
        h.step(tracker, [h.scene.one(h.rect(160 + dx, 80, 640 + dx, 320)), h.scene.two()], at);
      };
      for (let at = 0; at <= 700; at += 100) frame(at, 0);
      // Selection and count announcements fall due by 1000 ms; the tracks stay fresh.
      h.time.to(1100);
      await h.frames();
      const active = h.overlay.inspect().effects.active;
      const watchers = [h.watch('root', h.root()), h.watch('rail', h.railSlot),
        h.watch('readout', h.readoutSlot)];
      for (let i = 1; i <= 100; i += 1) {
        h.time.to(1100 + i);
        h.overlay.update(tracker.advance(1100 + i));
      }
      await h.frames();
      const still = watchers.map(w => w.detail());
      for (let k = 1; k <= 10; k += 1) frame(1200 + 100 * k, 8 * k);
      await h.frames();
      const moving = watchers.map(w => w.detail());
      watchers.forEach(w => w.stop());
      return { active, still, moving, stillActive: h.overlay.inspect().effects.active,
        status: tracker.advance(2200).status };
    });
    assert.equal(run.active, true, 'effects active before the budget (precondition)');
    assert.equal(run.status, 'time', "tracker.advance() snapshots have status 'time'");
    assert.deepEqual(run.still, [[], [], []],
      'unchanged time snapshots: no mutation in the root, the rail or the readout');
    const [root, rail, readout] = run.moving;
    assert.ok(root.some(r => r.attr === 'd'), 'moving geometry rewrites d (precondition)');
    assert.equal(run.stillActive, true, 'effects stay active while the code moves (precondition)');
    for (const record of root) {
      const allowed = GEOMETRY_WRITES[record.attr];
      assert.ok(record.type === 'attributes' && allowed && allowed.test(record.node),
        `moving geometry wrote ${record.type} ${record.attr} on ${record.node}`);
    }
    assert.deepEqual([rail, readout], [[], []], 'moving geometry: nothing in the rail or readout');
  });

/** An 8-bit RGB or RGBA, non-interlaced PNG as relative-luminance gray levels per pixel. */
function decodePng(buffer) {
  let at = 8, width = 0, height = 0, type = 0;
  const data = [];
  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at), kind = buffer.toString('ascii', at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + length);
    if (kind === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      type = body[9];
      assert.ok(body[8] === 8 && (type === 2 || type === 6) && body[12] === 0,
        `PNG: 8-bit RGB(A), not interlaced (depth ${body[8]}, type ${type})`);
    } else if (kind === 'IDAT') data.push(body);
    at += 12 + length;
  }
  const bpp = type === 6 ? 4 : 3, stride = width * bpp;
  const raw = inflateSync(Buffer.concat(data)), pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)], line = y * (stride + 1) + 1;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? pixels[y * stride + i - bpp] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + i] : 0;
      const c = y > 0 && i >= bpp ? pixels[(y - 1) * stride + i - bpp] : 0;
      let value = raw[line + i];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[y * stride + i] = value & 255;
    }
  }
  const gray = new Float64Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    gray[i] = 0.2126 * pixels[i * bpp] + 0.7152 * pixels[i * bpp + 1] +
      0.0722 * pixels[i * bpp + 2];
  }
  return { width, height, gray };
}

/** Mean gray level and the variance of the 4-neighbour Laplacian over [x0, y0, x1, y1). */
function regionStats({ width, gray }, [x0, y0, x1, y1]) {
  let sum = 0;
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) sum += gray[y * width + x];
  const laplace = [];
  for (let y = y0 + 1; y < y1 - 1; y += 1) {
    for (let x = x0 + 1; x < x1 - 1; x += 1) {
      const i = y * width + x;
      laplace.push(gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i]);
    }
  }
  const mean = laplace.reduce((s, v) => s + v, 0) / laplace.length;
  return { mean: sum / ((x1 - x0) * (y1 - y0)),
    variance: laplace.reduce((s, v) => s + (v - mean) ** 2, 0) / laplace.length };
}

// View regions: the interiors of quads one and two (inset 10 px), and video outside both holes,
// their outlines, glows and badges.
const HOLE_REGIONS = Object.freeze([[50, 80, 150, 120], [250, 160, 350, 200]]);
const OUTSIDE_REGION = Object.freeze([250, 60, 390, 120]);

rendered('U55 rendered holes: the checkerboard stays sharp in cutouts and blurs outside',
  async (pg, t) => {
    const source = await pg.eval(() => window.h.checker());
    assert.deepEqual(source, { width: 400, height: 200 }, 'checkerboard stream (precondition)');
    const box = await pg.eval(() => window.h.contentBox(window.h.video));
    const clip = { x: box.left, y: box.top, width: 400, height: 300 };
    const shoot = async () => decodePng(await pg.page.screenshot({ clip }));
    const base = await shoot();
    assert.deepEqual([base.width, base.height], [400, 300], 'screenshot size (precondition)');
    const baseline = HOLE_REGIONS.map(region => regionStats(base, region));
    const outsideBase = regionStats(base, OUTSIDE_REGION);
    assert.ok(baseline.concat(outsideBase).every(s => s.variance > 1000),
      'checkerboard detail in every region (precondition)');

    // Whether this engine's screenshots show a plain backdrop blur at all.
    await pg.eval(([left, top]) => {
      const probe = document.createElement('div');
      probe.id = 'blur-probe';
      probe.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:400px;` +
        'height:300px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)';
      document.body.appendChild(probe);
      return window.h.frames();
    }, [box.left, box.top]);
    const probed = regionStats(await shoot(), OUTSIDE_REGION);
    await pg.eval(() => {
      document.getElementById('blur-probe').remove();
      return window.h.frames();
    });
    const blurShown = probed.variance <= 0.5 * outsideBase.variance;
    if (!blurShown) {
      t.diagnostic(`${pg.engine}: a plain backdrop-filter does not show in screenshots ` +
        `(variance ${(probed.variance / outsideBase.variance).toFixed(3)} of the baseline); ` +
        'the outside blur check is not run');
    }

    const scene = await pg.eval(async () => {
      const h = window.h;
      h.create({ mount: 'below', effects: { blur: 8 } });
      const tracker = h.tracker();
      for (let at = 0; at <= 700; at += 100) h.step(tracker, [h.scene.one(), h.scene.two()], at);
      await h.frames();
      const inspected = h.overlay.inspect();
      return { alignment: h.overlay.alignment, active: inspected.effects.active,
        blur: inspected.blur,
        holes: inspected.clip === null ? 0 : inspected.clip.split(/ (?=M)/).length - 1 };
    });
    assert.deepEqual([scene.alignment, scene.active, scene.holes], ['aligned', true, 2],
      'two cutouts, effects active (precondition)');
    assert.notEqual(scene.blur, 'off', 'blur 8 is on (precondition)');
    if (scene.blur === 'unsupported') t.diagnostic(`${pg.engine}: blur unsupported`);
    for (const [name, options] of [['default dim, blur 8', null], ['dim 0, blur 8',
      { effects: { dim: 0, blur: 8 } }]]) {
      if (options) {
        await pg.eval(o => {
          window.h.overlay.setOptions(o);
          return window.h.frames();
        }, options);
      }
      const shot = await shoot();
      HOLE_REGIONS.forEach((region, i) => {
        const s = regionStats(shot, region), b = baseline[i];
        assert.ok(s.variance >= 0.9 * b.variance, `${name}: hole ${i + 1} Laplacian variance ` +
          `${(s.variance / b.variance).toFixed(3)} of the baseline`);
        assert.ok(Math.abs(s.mean - b.mean) <= 0.02 * b.mean,
          `${name}: hole ${i + 1} mean ${s.mean.toFixed(1)}, baseline ${b.mean.toFixed(1)}`);
      });
      const outside = regionStats(shot, OUTSIDE_REGION);
      const ratio = (outside.variance / outsideBase.variance).toFixed(3);
      if (blurShown && scene.blur === 'on') {
        assert.ok(outside.variance <= 0.5 * outsideBase.variance,
          `${name}: outside variance ${ratio} of the baseline`);
      } else {
        t.diagnostic(`${pg.engine} ${name}: outside variance ${ratio} of the baseline`);
      }
    }
  });

// French labels for every leaf except the symbologies. Serialized into the page with
// toString(), so it must stay self-contained.
function frenchLabels() {
  const reasons = {
    timeout: 'Délai dépassé', too_many_redirects: 'Trop de redirections',
    redirect_loop: 'Boucle de redirection', invalid_location: 'Redirection invalide',
    blocked_scheme: 'Redirection hors HTTP(S) refusée',
    blocked_credentials: 'Redirection avec identifiants refusée',
    blocked_address: 'Adresse non publique refusée', blocked_port: 'Port refusé',
    left_fixture: 'A quitté la fixture locale',
    name_unusable: 'Nom inutilisable (introuvable ou non public)', dns_error: 'Nom introuvable',
    connection_error: 'Connexion impossible', tls_error: 'Erreur TLS',
    invalid_response: 'Réponse HTTP invalide', transport_unsupported: 'Transport indisponible ici',
    out_of_scope: 'Hors du périmètre de ce mode',
    opaque_network_error: 'Le navigateur ne donne pas de détail (CORS, réseau ou politique)',
    opaque_response: 'Réponse opaque pour le navigateur',
    mixed_content: 'Page HTTPS, URL HTTP : bloqué', endpoint_unreachable: 'Résolveur injoignable',
    endpoint_http_error: 'Erreur HTTP du résolveur',
    endpoint_invalid_response: 'Réponse du résolveur invalide',
    endpoint_timeout: 'Le résolveur n\'a pas répondu à temps', resolver_busy: 'Résolveur occupé',
    no_transport: 'Vérification désactivée', queue_full: 'Trop de vérifications en attente',
    transport_error: 'Erreur interne du transport',
    invalid_observation: 'Observation invalide rejetée',
    transport_unresponsive: 'Le transport n\'a pas répondu', canceled: 'Vérification annulée',
    aborted: 'Vérification interrompue',
  };
  const destination = {
    heading: 'Destination',
    sources: { me_card: 'Site web du contact', gs1_digital_link: 'GS1 Digital Link' },
    requestUrl: 'URL demandée',
    ineligible: { lossy_text: 'Texte décodé avec pertes : non vérifiable',
      not_http: 'Pas une adresse http(s) : non vérifiable',
      control_or_space: 'URL avec espace ou caractère invisible : non vérifiable',
      invalid_url: 'URL illisible : non vérifiable',
      credentials: 'URL avec identifiants : jamais envoyée', too_long: 'URL trop longue' },
    unverified: 'Destination non vérifiée', queued: 'En attente (aucune requête envoyée)',
    resolving: 'Vérification en cours…', observed: 'Destination observée',
    example: 'Résultat d\'exemple (simulé)',
    // Test values where no French text is given: these four states, detail, provenance and
    // checkAgain.
    failed: 'Échec de la vérification', canceled: 'Vérification annulée',
    unavailable: 'Vérification indisponible',
    providerError: 'Vérifications de destination indisponibles',
    reasons,
    httpStatus: status => `HTTP ${status}`,
    redirects: 'Redirections',
    hops: (followed, oneNotFollowed) =>
      `${followed} suivie(s)${oneNotFollowed ? ', 1 non suivie' : ''}`,
    hopsUnknown: atLeastOne => (atLeastOne ? 'inconnues (au moins une)' : 'inconnues'),
    refusedScheme: scheme => `schéma ${scheme} refusé`,
    invalidLocation: 'Location invalide ou masquée',
    detail: 'Détail',
    observedAt: (time, ms) => `Observée à ${time} · ${ms} ms`,
    exampleAt: (time, ms) => `Exemple préparé à ${time} · latence simulée ${ms} ms`,
    endedAt: time => `Terminée à ${time}`,
    provenance: { fixture: 'Fixture locale', simulated: 'Simulé' },
    request: { none: 'Aucune requête envoyée', maybe: 'Une requête a pu être envoyée',
      response: 'Le navigateur a obtenu une réponse', sent: 'Une requête a été envoyée' },
    check: 'Vérifier la destination', checkAgain: 'Vérifier à nouveau', cancel: 'Annuler',
  };
  return {
    targets: 'Codes détectés', choose: 'Choisir un code détecté',
    target: (track, slot) => `Code ${slot + 1}`, earlier: 'Précédents',
    readout: 'Contenu décodé', none: 'Aucun code sélectionné',
    position: (name, i, n) => `${name} · ${i} sur ${n}`,
    previous: 'Code précédent', next: 'Code suivant', more: 'Plus', less: 'Moins',
    states: { inView: 'Dans le champ', readNow: 'Lu maintenant', lost: 'Perdu',
      notRecent: 'Pas lu récemment' },
    stillReadAs: list => `Toujours lu comme ${list.join(', ')}`,
    sameContentAs: list => `Même contenu que ${list.join(', ')}`,
    geometry: { segment: 'Ligne de lecture seulement', partial: 'Position partielle',
      none: 'Position non mesurée', offscreen: 'Hors de la zone visible' },
    families: { matrix: 'Code matriciel 2D', stacked: 'Code empilé 2D',
      linear: 'Code-barres 1D' },
    kinds: { url: 'URL', wifi: 'Wi-Fi', email: 'E-mail', sms: 'SMS', tel: 'Numéro de téléphone',
      v_card: 'Contact (vCard)', text: 'Texte', geo: 'Position', gs1: 'Chaîne d’éléments GS1',
      gs1_digital_link: 'GS1 Digital Link', me_card: 'Contact (MeCard)',
      crypto: 'Paiement crypto', v_event: 'Événement (vEvent)' },
    fields: { url: 'URL', ssid: 'Nom du réseau', security: 'Sécurité', password: 'Mot de passe',
      hidden: 'Réseau masqué', to: 'Destinataire', subject: 'Objet', body: 'Message',
      number: 'Numéro', lat: 'Latitude', lon: 'Longitude', name: 'Nom', tel: 'Téléphone',
      email: 'E-mail', scheme: 'Schéma', address: 'Adresse', amount: 'Montant', gtin: 'GTIN' },
    parsedFields: 'Champs analysés', yes: 'Oui', no: 'Non', unknown: 'Inconnu',
    incomplete: 'Aucune lecture textuelle vérifiée. Les octets exacts sont dans Détails.',
    incompleteEci: 'Aucune lecture textuelle vérifiée : un ECI est déclaré mais non ' +
      'localisé. Les octets exacts sont dans Détails.',
    charset: 'Jeu de caractères', bytes: 'Octets', eci: 'ECI',
    eciUnlocated: 'Déclaré, non localisé', eciAt: (d, s) => `ECI ${d} à l’octet ${s}`,
    fnc1: 'FNC1', fnc1Positions: { first: 'Première position', second: 'Deuxième position' },
    character: (name, cp) => `${name} (U+${cp.toString(16).toUpperCase().padStart(4, '0')})`,
    copy: 'Copier', copyBytes: 'Copier les octets', copied: 'Copié',
    copyFailed: 'Échec de la copie', details: 'Détails', open: 'Ouvrir le lien',
    encodedUrl: 'URL encodée', host: 'Hôte', conformant: 'Conforme aux règles GS1 vérifiées',
    issues: 'Problèmes GS1', saturated: 'Plus de codes visibles que le suivi n’en accepte',
    saturatedOccurrences: 'Des copies du même contenu peuvent être fusionnées ou manquantes',
    count: n => (n === 0 ? 'Aucun code détecté' : n === 1 ? '1 code détecté'
      : `${n} codes détectés`),
    announce: e => (e.target === null ? 'Aucun code sélectionné'
      : [e.target, e.symbology, e.kind, e.state, e.preview].filter(Boolean).join(', ')),
    destination,
  };
}

// Candidate Intl.DateTimeFormat options for the slot's time (null: no options).
const TIME_FORMATS = Object.freeze([null, { timeStyle: 'short' }, { timeStyle: 'medium' },
  { hour: '2-digit', minute: '2-digit' }, { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  { hour: 'numeric', minute: '2-digit' },
  { hour: 'numeric', minute: '2-digit', second: '2-digit' },
  { dateStyle: 'short', timeStyle: 'short' }, { dateStyle: 'short', timeStyle: 'medium' },
  { dateStyle: 'medium', timeStyle: 'short' }, { dateStyle: 'medium', timeStyle: 'medium' }]);
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

// Language as rendered: lang of the root and parts, of the content and the encoded URL, the
// slot's time with every candidate format in lang, label texts, names, buttons and the slot.
const languageView = (pg, lang) => pg.eval(([code, formats]) => {
  const h = window.h;
  const attr = (el, name) => (el ? el.getAttribute(name) : null);
  const one = selector => document.querySelector(selector);
  const url = one('bdi.qr-camera-url-text');
  const content = one('section.qr-camera-readout .qr-camera-content');
  const time = one('.qr-camera-destination time');
  const at = time ? Date.parse(time.getAttribute('datetime')) : NaN;
  return {
    langs: [h.root(), h.railSlot.firstElementChild, h.readoutSlot.firstElementChild]
      .map(el => attr(el, 'lang')),
    present: { content: Boolean(content), url: Boolean(url) },
    content: attr(content, 'lang'),
    url: [attr(url, 'lang'), attr(url, 'dir')],
    time: time ? { datetime: time.getAttribute('datetime'), text: time.textContent,
      formats: formats.map(o => (Number.isNaN(at) ? null
        : new Intl.DateTimeFormat(code, o === null ? undefined : o).format(new Date(at)))) }
      : null,
    labels: h.labelTexts(),
    names: [attr(one('#below-rail [role="toolbar"]'), 'aria-label'),
      attr(one('#below-rail [role="radiogroup"]'), 'aria-label'),
      attr(one('section.qr-camera-readout'), 'aria-label')],
    buttons: h.readout() ? h.readout().buttons : [],
    slot: h.slot(),
  };
}, [lang, TIME_FORMATS]);

rendered('U56 language: lang on root and parts, lang="" content, Intl times, the French table',
  async pg => {
    assert.equal(await preparedScene(pg), 7, 'seven codes (precondition)');
    await pg.eval(() => window.h.show('https://example.test/r'));
    await checkButtonPress(pg, 40);
    const en = await languageView(pg, 'en');
    assert.deepEqual(en.langs, ['en', 'en', 'en'], 'root, rail and readout parts: lang="en"');
    assert.deepEqual(en.present, { content: true, url: true },
      'the readout shows the decoded content and the encoded URL (precondition)');
    assert.equal(en.content, '', 'decoded content: lang=""');
    assert.deepEqual(en.url, ['', 'ltr'], 'encoded URL: lang="" dir="ltr"');
    assert.ok(en.time, 'resolved slot: a <time> element (precondition)');
    assert.match(en.time.datetime, ISO_TIME, 'time: an ISO 8601 datetime');
    const formats = en.time.formats.map((text, i) => (text === en.time.text ? i : -1))
      .filter(i => i >= 0);
    assert.ok(formats.length > 0,
      `time ${JSON.stringify(en.time.text)} is an Intl format of the datetime in en: ` +
      JSON.stringify(en.time.formats));
    assertSlot(en.slot, { state: 'resolved',
      texts: [`Example prepared at ${en.time.text} · simulated latency 40 ms`] }, 'en slot');

    // The table's functions cannot cross evaluate(): the test's own source is added as a script,
    // the way the harness itself is served.
    await pg.page.addScriptTag({ content: `window.h.frenchLabels = ${frenchLabels.toString()};` });
    const french = await pg.eval(async () => {
      const h = window.h;
      const table = h.frenchLabels();
      const missing = [], pairs = [];
      const walk = (base, over, path) => Object.keys(base).forEach(key => {
        if (path === '' && key === 'symbologies') return;
        const where = path ? `${path}.${key}` : key;
        const value = base[key];
        const other = over !== null && typeof over === 'object' ? over[key] : undefined;
        if (typeof value === 'string' || typeof value === 'function') {
          if (typeof other !== typeof value) missing.push(where);
          else if (typeof value === 'string') pairs.push([value, other]);
        } else walk(value, other, where);
      });
      walk(h.overlayModule.DEFAULT_LABELS, table, '');
      h.overlay.setOptions({ lang: 'fr', labels: table });
      await h.frames();
      return { missing, pairs };
    });
    assert.deepEqual(french.missing, [],
      'the French table covers every DEFAULT_LABELS leaf except the symbologies');
    const fr = await languageView(pg, 'fr');
    assert.deepEqual(fr.langs, ['fr', 'fr', 'fr'], 'root, rail and readout parts: lang="fr"');
    assert.equal(fr.content, '', 'French: decoded content keeps lang=""');
    assert.deepEqual(fr.url, ['', 'ltr'], 'French: encoded URL keeps lang="" dir="ltr"');
    assert.ok(fr.time && fr.time.datetime === en.time.datetime, 'French: the same datetime');
    assert.ok(formats.some(i => fr.time.formats[i] === fr.time.text),
      `French time ${JSON.stringify(fr.time.text)} uses the English row's Intl options`);
    assertSlot(fr.slot, { state: 'resolved', texts: ['Résultat d\'exemple (simulé)',
      `Exemple préparé à ${fr.time.text} · latence simulée 40 ms`, '1 suivie(s)',
      'Aucune requête envoyée'], button: 'Vérifier à nouveau' }, 'French slot');
    assert.deepEqual(fr.names, ['Codes détectés', 'Choisir un code détecté', 'Contenu décodé'],
      'French names of the toolbar, the radio group and the readout');
    ['Copier', 'Détails', 'Ouvrir le lien'].forEach(name => assert.ok(fr.buttons.includes(name),
      `French button ${name} in ${JSON.stringify(fr.buttons)}`));
    const english = french.pairs.filter(([word, other]) => word !== other).map(([word]) => word);
    const shown = fr.labels.concat(fr.names.filter(Boolean), fr.buttons);
    const leaks = shown.filter(text => english.some(word => text === word ||
      (word.length >= 8 && text.indexOf(word) !== -1)));
    assert.deepEqual(leaks, [], 'no English default left after lang fr');
  });

// Arrangements for target sizes: name, sheet rule, mounted parts, whether rail radios show,
// and the buttons that must be among the measured ones.
const READOUT_BUTTONS = Object.freeze([LABEL.copy, TEXT.open, TEXT.details, LABEL.check]);
const SIZE_CASES = Object.freeze([
  ['regular in-video 640 x 480', sizeRule(640, 480), false, true, [MORE]],
  ['compact in-video 400 x 300', sizeRule(400, 300), false, false, [MORE].concat(NAV_NAMES)],
  ['narrow mounted 320 px', '#below{width:320px}', true, true, []],
  ['regular mounted 390 px', '#below{width:390px}', true, true, []],
]);

// Three codes (a URL with a destination check, a text, a scan line), Code 1 selected; sizes of
// every rendered button and radio in the rail and readout at each step: the bar, the card,
// Details open.
const targetSizesOf = (pg, rule, mounted, rail) => pg.eval(async ([css, inParts, mode, base]) => {
  const h = window.h;
  if (h.overlay && !h.overlay.destroyed) h.overlay.destroy();
  h.sheet.textContent = css;
  Object.defineProperty(navigator, 'clipboard', { configurable: true,
    value: { writeText: () => Promise.resolve() } });
  const clock = h.time.clock('verifier');
  const timers = { now: () => base + h.time.now(), monotonic: () => h.time.now(),
    setTimeout: (callback, ms) => clock.setTimeout(callback, ms),
    clearTimeout: id => clock.clearTimeout(id) };
  const transport = h.destination.createPreparedTransport([{ url: 'https://example.test/one',
    result: { outcome: 'resolved', finalUrl: 'https://example.test/one', status: 200,
      redirects: [], redirected: false } }], { delayMs: 40, timers });
  const settings = { rail: mode,
    destinations: h.destination.createDestinationVerifier({ transport, timers }) };
  if (inParts) settings.mount = 'below';
  h.create(settings);
  h.overlay.update(h.snap({ tracks: [h.code('one'), h.code('text'),
    { id: 'track-3', slot: 2, resultId: 'result-3', kind: 'segment',
      points: [{ x: 200, y: 700 }, { x: 600, y: 700 }], detection: h.scene.stock() }] }));
  h.overlay.select('track-1');
  await h.frames();
  const scopes = () => (inParts ? [h.railSlot, h.readoutSlot]
    : [h.root().querySelector('.qr-camera-controls')]);
  const steps = [['bar', h.targetSizes(scopes())]];
  const more = h.root().querySelector('button.qr-camera-more');
  if (!inParts && more) {
    more.click();
    await h.frames(1);
    steps.push(['card', h.targetSizes(scopes())]);
  }
  const readout = (inParts ? h.readoutSlot : h.root()).querySelector('section.qr-camera-readout');
  const details = readout ? Array.from(readout.querySelectorAll('button'))
    .filter(b => b.hasAttribute('aria-expanded'))[0] : null;
  if (details) {
    details.click();
    await h.frames(1);
    steps.push(['details', h.targetSizes(scopes())]);
  }
  return { more: Boolean(more), steps };
}, [rule, mounted, rail ? 'always' : 'never', DESTINATION_BASE]);

rendered('U57 target sizes: every button and radio of the rail and readout is 44 x 44 or more',
  async pg => {
    for (const [name, rule, mounted, rail, extra] of SIZE_CASES) {
      const run = await targetSizesOf(pg, rule, mounted, rail);
      if (!mounted) assert.ok(run.more, `${name}: More (precondition)`);
      const last = run.steps[run.steps.length - 1];
      assert.equal(last[0], 'details', `${name}: Details opened (precondition)`);
      const all = [].concat(...run.steps.map(([step, list]) =>
        list.map(item => Object.assign({ step }, item))));
      const radios = all.filter(item => /qr-camera-entry/.test(item.cls));
      assert.equal(radios.length >= 3, rail, `${name}: rail radios measured (precondition)`);
      const names = new Set(all.map(item => item.name));
      READOUT_BUTTONS.concat(extra).forEach(label =>
        assert.ok(names.has(label), `${name}: ${label} measured (precondition)`));
      for (const item of all) {
        assert.ok(item.width >= 44 - 0.01 && item.height >= 44 - 0.01,
          `${name}, ${item.step}: ${item.cls || 'button'} ${JSON.stringify(item.name)} is ` +
          `${item.width.toFixed(2)} x ${item.height.toFixed(2)}`);
      }
    }
  }, { engines: ['chromium', 'webkit'] });
