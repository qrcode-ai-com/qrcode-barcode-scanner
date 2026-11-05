// camera-overlay.unit.test.mjs: U1-U14, the pure helpers and the import contract of
// camera-overlay.js. Node only, never shipped. QRSCAN_CAMERA_PACKAGE selects the package
// directory (default: the directory of this file). Expected values are written out by hand in
// the tables below, never computed by the implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DIRECTORY = process.env.QRSCAN_CAMERA_PACKAGE
  ? pathToFileURL(process.env.QRSCAN_CAMERA_PACKAGE + '/') : new URL('./', import.meta.url);
const OVERLAY_URL = new URL('camera-overlay.js', DIRECTORY);
const CAMERA_URL = new URL('camera.js', DIRECTORY);
const DESTINATION_URL = new URL('destination.js', DIRECTORY);

// An import failure fails every test that needs the module, with its cause.
async function load(url) {
  try {
    return { url, module: await import(url.href), error: null };
  } catch (error) {
    return { url, module: null, error };
  }
}
const LOADED = {
  overlay: await load(OVERLAY_URL),
  camera: await load(CAMERA_URL),
  destination: await load(DESTINATION_URL),
};

function exportOf(which, name) {
  const loaded = LOADED[which];
  if (loaded.error !== null) throw loaded.error;
  const value = loaded.module[name];
  assert.notEqual(value, undefined, `${loaded.url.pathname.split('/').pop()} exports ${name}`);
  return value;
}
function api(name) {
  return exportOf('overlay', name);
}

// ------------------------------------------------------------------------------ helpers

function P(x, y) {
  return { x, y };
}
function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key]);
  }
  return value;
}
function assertNumber(actual, expected, tolerance, label) {
  assert.equal(typeof actual, 'number', `${label}: ${String(actual)} is a number`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} is within ${tolerance} of ${expected}`);
}
// 'x,y x,y ...' as written in the tables below.
function parsePoints(text) {
  return text.split(' ').map(pair => {
    const [x, y] = pair.split(',').map(Number);
    return P(x, y);
  });
}
function assertPoints(actual, expected, label, tolerance = 1e-9) {
  const want = typeof expected === 'string' ? parsePoints(expected) : expected;
  assert.ok(Array.isArray(actual), `${label}: points is an array`);
  assert.equal(actual.length, want.length, `${label}: point count`);
  want.forEach((point, index) => {
    assertNumber(actual[index].x, point.x, tolerance, `${label}: point ${index} x`);
    assertNumber(actual[index].y, point.y, tolerance, `${label}: point ${index} y`);
  });
}
// Fractions are compared at the 4 decimals of data-visible-fraction.
function assertFraction(actual, expected, label) {
  assert.equal(typeof actual, 'number', `${label}: visibleFraction is a number`);
  assert.equal(actual.toFixed(4), expected.toFixed(4), `${label}: visibleFraction to 4 decimals`);
}
function assertAxis(axis, fraction, offset, label) {
  assert.ok(axis !== null && typeof axis === 'object', `${label}: axis is an object`);
  assertNumber(axis.fraction, fraction, 1e-12, `${label}.fraction`);
  assertNumber(axis.offset, offset, 1e-12, `${label}.offset`);
}

// ----------------------------------------------------------------------------- fixtures

// Reference view 400 x 300, frame 1600 x 800.
const W = 400;
const H = 300;
function axis(fraction, offset) {
  return { fraction, offset };
}
function position(xFraction, xOffset, yFraction, yOffset) {
  return deepFreeze({ x: axis(xFraction, xOffset), y: axis(yFraction, yOffset) });
}
const CENTER = position(0.5, 0, 0.5, 0);
function view(fit, objectPosition, mirror, media = [1600, 800]) {
  const result = { mediaWidth: media[0], mediaHeight: media[1], viewWidth: W, viewHeight: H, fit };
  if (objectPosition !== undefined) result.position = objectPosition;
  if (mirror !== undefined) result.mirror = mirror;
  return deepFreeze(result);
}
// Every point within [-1, W + 1] x [-1, H + 1] (2, OverlayGeometry.inView).
function inViewOf(points) {
  return points.every(p => p.x >= -1 && p.x <= W + 1 && p.y >= -1 && p.y <= H + 1);
}

// Normalized fixtures.
const ONE = deepFreeze([P(0.1, 0.1), P(0.4, 0.1), P(0.4, 0.4), P(0.1, 0.4)]);
const TWO = deepFreeze([P(0.6, 0.5), P(0.9, 0.5), P(0.9, 0.8), P(0.6, 0.8)]);
const STOCK = deepFreeze([P(0.125, 0.875), P(0.375, 0.875)]);
const EDGE = deepFreeze([P(0, 0.1), P(0.15, 0.1), P(0.15, 0.4), P(0, 0.4)]);
const PERSPECTIVE = deepFreeze([P(0.125, 0.125), P(0.375, 0.15), P(0.3625, 0.625),
  P(0.1125, 0.6)]);

// Reference table for quad one, both mirrored 20% 80% rows included.
const FILL_POLYGON = '40,30 160,30 160,120 40,120';
const TABLE_48 = [
  { fit: 'contain', css: '50% 50%', position: CENTER, mirror: false,
    polygon: '40,70 160,70 160,130 40,130', fraction: 1 },
  { fit: 'contain', css: '50% 0%', position: position(0.5, 0, 0, 0), mirror: false,
    polygon: '40,20 160,20 160,80 40,80', fraction: 1 },
  { fit: 'contain', css: '50% 100%', position: position(0.5, 0, 1, 0), mirror: false,
    polygon: '40,120 160,120 160,180 40,180', fraction: 1 },
  { fit: 'contain', css: 'left 0px bottom 10px', position: position(0, 0, 1, -10), mirror: false,
    polygon: '40,110 160,110 160,170 40,170', fraction: 1 },
  { fit: 'contain', css: '50% calc(100% - 30px)', position: position(0.5, 0, 1, -30),
    mirror: false, polygon: '40,90 160,90 160,150 40,150', fraction: 1 },
  { fit: 'contain', css: '20% 80%', position: position(0.2, 0, 0.8, 0), mirror: true,
    polygon: '360,100 240,100 240,160 360,160', fraction: 1 },
  { fit: 'cover', css: '50% 50%', position: CENTER, mirror: false,
    polygon: '-40,30 140,30 140,120 -40,120', fraction: 0.7778 },
  { fit: 'cover', css: '50% 50%', position: CENTER, mirror: true,
    polygon: '440,30 260,30 260,120 440,120', fraction: 0.7778 },
  { fit: 'cover', css: '0% 50%', position: position(0, 0, 0.5, 0), mirror: false,
    polygon: '60,30 240,30 240,120 60,120', fraction: 1 },
  { fit: 'cover', css: '0% 50%', position: position(0, 0, 0.5, 0), mirror: true,
    polygon: '340,30 160,30 160,120 340,120', fraction: 1 },
  { fit: 'cover', css: '20% 80%', position: position(0.2, 0, 0.8, 0), mirror: true,
    polygon: '380,30 200,30 200,120 380,120', fraction: 1 },
  { fit: 'cover', css: '100% 50%', position: position(1, 0, 0.5, 0), mirror: false,
    polygon: '-140,30 40,30 40,120 -140,120', fraction: 0.2222 },
  { fit: 'cover', css: 'right 10px center', position: position(1, -10, 0.5, 0), mirror: false,
    polygon: '-150,30 30,30 30,120 -150,120', fraction: 0.1667 },
  { fit: 'cover', css: '25% 50%', position: position(0.25, 0, 0.5, 0), mirror: false,
    polygon: '10,30 190,30 190,120 10,120', fraction: 1 },
  // fill ignores object-position percentages, but a length offset still shifts it.
  { fit: 'fill', css: 'default', position: undefined, mirror: false,
    polygon: FILL_POLYGON, fraction: 1 },
  { fit: 'fill', css: '20% 80%', position: position(0.2, 0, 0.8, 0), mirror: false,
    polygon: FILL_POLYGON, fraction: 1 },
  { fit: 'fill', css: '100% 0%', position: position(1, 0, 0, 0), mirror: false,
    polygon: FILL_POLYGON, fraction: 1 },
  { fit: 'none', css: '50% 50%', position: CENTER, mirror: false, media: [320, 160],
    polygon: '72,86 168,86 168,134 72,134', fraction: 1 },
  { fit: 'scale-down', css: '50% 50%', position: CENTER, mirror: false, media: [320, 160],
    polygon: '72,86 168,86 168,134 72,134', fraction: 1 },
  { fit: 'scale-down', css: '50% 50%', position: CENTER, mirror: false,
    polygon: '40,70 160,70 160,130 40,130', fraction: 1 },
  { fit: 'none', css: '50% 50%', position: CENTER, mirror: false,
    polygon: '-440,-170 40,-170 40,70 -440,70', fraction: 0.0243 },
];

// Reference table for the perspective quad.
const PERSPECTIVE_48 = [
  { setting: 'contain', fit: 'contain', position: CENTER, mirror: false,
    polygon: '50,75 150,80 145,175 45,170', fraction: 1 },
  { setting: 'cover', fit: 'cover', position: CENTER, mirror: false,
    polygon: '-25,37.5 125,45 117.5,187.5 -32.5,180', fraction: 0.8083 },
  { setting: 'cover mirrored', fit: 'cover', position: CENTER, mirror: true,
    polygon: '425,37.5 275,45 282.5,187.5 432.5,180', fraction: 0.8083 },
  { setting: 'cover 0% 0%', fit: 'cover', position: position(0, 0, 0, 0), mirror: false,
    polygon: '75,37.5 225,45 217.5,187.5 67.5,180', fraction: 1 },
  { setting: 'contain 25% 75%', fit: 'contain', position: position(0.25, 0, 0.75, 0),
    mirror: false, polygon: '50,100 150,105 145,200 45,195', fraction: 1 },
  { setting: 'fill', fit: 'fill', position: CENTER, mirror: false,
    polygon: '50,37.5 150,45 145,187.5 45,180', fraction: 1 },
];

// Projected view-px quads: A = one contain, B = one cover mirrored, C = perspective
// contain, D = two contain, tiny = 4 px at (100, 100), S1 and S2 = a neighbouring pair.
const QUAD_A = deepFreeze(parsePoints('40,70 160,70 160,130 40,130'));
const QUAD_B = deepFreeze(parsePoints('440,30 260,30 260,120 440,120'));
const QUAD_C = deepFreeze(parsePoints('50,75 150,80 145,175 45,170'));
const QUAD_D = deepFreeze(parsePoints('240,150 360,150 360,210 240,210'));
const QUAD_TINY = deepFreeze(parsePoints('100,100 104,100 104,104 100,104'));
const QUAD_S1 = deepFreeze(parsePoints('100,100 160,100 160,160 100,160'));
const QUAD_S2 = deepFreeze(parsePoints('165,100 225,100 225,160 165,160'));
const REFERENCE_53 = [
  { name: 'A', points: QUAD_A,
    bracket: 'M34.5 83.7L34.5 68.7Q34.5 64.5 38.7 64.5L57.5 64.5M142.5 64.5L161.3 64.5Q165.5 ' +
      '64.5 165.5 68.7L165.5 83.7M165.5 116.3L165.5 131.3Q165.5 135.5 161.3 135.5L142.5 135.5' +
      'M57.5 135.5L38.7 135.5Q34.5 135.5 34.5 131.3L34.5 116.3',
    region: 'M37 61L163 61Q169 61 169 67L169 133Q169 139 163 139L37 139Q31 139 31 133L31 67Q31 ' +
      '61 37 61Z' },
  { name: 'B', points: QUAD_B,
    bracket: 'M445.5 47.5L445.5 28.7Q445.5 24.5 441.3 24.5L422.5 24.5M277.5 24.5L258.7 24.5Q254.5' +
      ' 24.5 254.5 28.7L254.5 47.5M254.5 102.5L254.5 121.3Q254.5 125.5 258.7 125.5L277.5 125.5' +
      'M422.5 125.5L441.3 125.5Q445.5 125.5 445.5 121.3L445.5 102.5',
    region: 'M443 21L257 21Q251 21 251 27L251 123Q251 129 257 129L443 129Q449 129 449 123L449 ' +
      '27Q449 21 443 21Z' },
  { name: 'C', points: QUAD_C,
    bracket: 'M43.6 92.2L44.6 73.4Q44.8 69.2 49 69.4L67.8 70.4M132.8 73.6L151.6 74.6Q155.8 74.8 ' +
      '155.6 79L154.6 97.8M151.4 157.8L150.4 176.6Q150.2 180.8 146 180.6L127.2 179.6M62.2 176.4' +
      'L43.4 175.4Q39.2 175.2 39.4 171L40.4 152.2',
    region: 'M47.5 65.9L153.5 71.2Q159.5 71.5 159.1 77.5L153.8 178.4Q153.5 184.4 147.5 184.1L41.5' +
      ' 178.8Q35.5 178.5 35.9 172.5L41.2 71.6Q41.5 65.6 47.5 65.9Z' },
  { name: 'D', points: QUAD_D,
    bracket: 'M234.5 163.7L234.5 148.7Q234.5 144.5 238.7 144.5L257.5 144.5M342.5 144.5L361.3 ' +
      '144.5Q365.5 144.5 365.5 148.7L365.5 163.7M365.5 196.3L365.5 211.3Q365.5 215.5 361.3 215.5' +
      'L342.5 215.5M257.5 215.5L238.7 215.5Q234.5 215.5 234.5 211.3L234.5 196.3',
    region: 'M237 141L363 141Q369 141 369 147L369 213Q369 219 363 219L237 219Q231 219 231 213L231' +
      ' 147Q231 141 237 141Z' },
  { name: 'tiny', points: QUAD_TINY,
    bracket: 'M94.5 100.5L94.5 96.1Q94.5 94.5 96.1 94.5L100.5 94.5M103.5 94.5L107.9 94.5Q109.5 ' +
      '94.5 109.5 96.1L109.5 100.5M109.5 103.5L109.5 107.9Q109.5 109.5 107.9 109.5L103.5 109.5' +
      'M100.5 109.5L96.1 109.5Q94.5 109.5 94.5 107.9L94.5 103.5',
    region: 'M97 91L107 91Q113 91 113 97L113 107Q113 113 107 113L97 113Q91 113 91 107L91 97Q91 ' +
      '91 97 91Z' },
];
const REGION_S1 = 'M103.2 98L156.8 98Q162 98 162 103.2L162 156.8Q162 162 156.8 162L103.2 162Q98 ' +
  '162 98 156.8L98 103.2Q98 98 103.2 98Z';
const REGION_S2 = 'M168.2 98L221.8 98Q227 98 227 103.2L227 156.8Q227 162 221.8 162L168.2 162Q163' +
  ' 162 163 156.8L163 103.2Q163 98 168.2 98Z';

// Wire id, exact label, family.
const SYMBOLOGIES = [
  ['qr_code', 'QR Code', 'matrix'], ['micro_qr_code', 'Micro QR Code', 'matrix'],
  ['rectangular_micro_qr_code', 'rMQR', 'matrix'], ['data_matrix', 'Data Matrix', 'matrix'],
  ['aztec', 'Aztec', 'matrix'], ['maxi_code', 'MaxiCode', 'matrix'],
  ['pdf417', 'PDF417', 'stacked'], ['ean13', 'EAN-13', 'linear'], ['ean8', 'EAN-8', 'linear'],
  ['upc_a', 'UPC-A', 'linear'], ['upc_e', 'UPC-E', 'linear'], ['code128', 'Code 128', 'linear'],
  ['code39', 'Code 39', 'linear'], ['code93', 'Code 93', 'linear'],
  ['codabar', 'Codabar', 'linear'], ['itf', 'ITF', 'linear'],
  ['data_bar', 'GS1 DataBar', null], ['data_bar_expanded', 'GS1 DataBar Expanded', null],
  ['telepen', 'Telepen', 'linear'],
];
const FAMILY_LABELS = {
  matrix: '2D matrix code', stacked: '2D stacked code', linear: '1D barcode',
};

// ---------------------------------------------------------------------- U1-U3 projection

function assertPosition(parsed, expected, value) {
  assert.ok(parsed !== null && typeof parsed === 'object', `${value} parses`);
  const [xFraction, xOffset, yFraction, yOffset] = expected;
  assertAxis(parsed.x, xFraction, xOffset, `${value} x`);
  assertAxis(parsed.y, yFraction, yOffset, `${value} y`);
}

test('U1 parseObjectPosition reads the U1 computed-style forms', () => {
  const parse = api('parseObjectPosition');
  // Three-value forms give null, except an edge with an offset beside center (`right 10px center`).
  const cases = [
    ['50% 50%', [0.5, 0, 0.5, 0]],
    ['left 0px bottom 10px', [0, 0, 1, -10]],
    ['right 10px center', [1, -10, 0.5, 0]],
    ['50% calc(100% - 30px)', [0.5, 0, 1, -30]],
    ['calc(10px + 25%) 0px', [0.25, 10, 0, 0]],
    ['10px', [0, 10, 0.5, 0]],
    ['top', [0.5, 0, 0, 0]],
  ];
  for (const [value, expected] of cases) assertPosition(parse(value), expected, value);
});

test('U1 parseObjectPosition rejects other units, three edge values, var(), nested calc()', () => {
  const parse = api('parseObjectPosition');
  const rejected = ['1em 0', 'left 10px top', 'var(--x)', '50% calc(100% - calc(10px + 20px))'];
  for (const value of rejected) assert.equal(parse(value), null, value);
});

test('U1 parseObjectPosition reads the other forms 2 lists', () => {
  const parse = api('parseObjectPosition');
  const cases = [
    ['center', [0.5, 0, 0.5, 0]], ['left', [0, 0, 0.5, 0]], ['bottom', [0.5, 0, 1, 0]],
    ['right bottom', [1, 0, 1, 0]], ['center top', [0.5, 0, 0, 0]],
    ['0% 0%', [0, 0, 0, 0]], ['100% 100%', [1, 0, 1, 0]], ['0px 0px', [0, 0, 0, 0]],
    ['-10px 25%', [0, -10, 0.25, 0]], ['12.5px 33.25%', [0, 12.5, 0.3325, 0]],
    ['right 10px bottom 20px', [1, -10, 1, -20]],
    ['calc(100% - 30px) 50%', [1, -30, 0.5, 0]], ['calc(25% + 10px) 0px', [0.25, 10, 0, 0]],
  ];
  for (const [value, expected] of cases) assertPosition(parse(value), expected, value);
  for (const value of ['', '10px 20px 30px', '50% 50% 50%', '1vw 0px', '1rem 1rem']) {
    assert.equal(parse(value), null, JSON.stringify(value));
  }
});

function assertRect(actual, expected, label) {
  assert.ok(actual !== null && typeof actual === 'object', `${label}: rect is an object`);
  for (const key of ['x', 'y', 'width', 'height']) {
    assertNumber(actual[key], expected[key], 1e-9, `${label}.${key}`);
  }
}

test('U2 overlayMediaRect places 1600 x 800 media in a 400 x 300 view for each fit', () => {
  const rect = api('overlayMediaRect');
  const cases = [
    ['contain', [1600, 800], { x: 0, y: 50, width: 400, height: 200 }],
    ['cover', [1600, 800], { x: -100, y: 0, width: 600, height: 300 }],
    ['fill', [1600, 800], { x: 0, y: 0, width: 400, height: 300 }],
    ['none', [320, 160], { x: 40, y: 70, width: 320, height: 160 }],
    ['scale-down', [1600, 800], { x: 0, y: 50, width: 400, height: 200 }],
    // the last reference rows: scale-down never enlarges, none keeps 1600 x 800.
    ['scale-down', [320, 160], { x: 40, y: 70, width: 320, height: 160 }],
    ['none', [1600, 800], { x: -600, y: -250, width: 1600, height: 800 }],
  ];
  for (const [fit, media, expected] of cases) {
    const label = `${fit} ${media.join('x')}`;
    assertRect(rect(view(fit, undefined, undefined, media)), expected, label);
    assertRect(rect(view(fit, CENTER, false, media)), expected, `${label} 50% 50%`);
  }
});

test('U2 overlayMediaRect defaults to contain, applies offsets and ignores the mirror', () => {
  const rect = api('overlayMediaRect');
  const contain = { x: 0, y: 50, width: 400, height: 200 };
  assertRect(rect(deepFreeze({ mediaWidth: 1600, mediaHeight: 800, viewWidth: W, viewHeight: H })),
    contain, 'default fit');
  // The rect is the drawn box before mirroring (2, MediaRect).
  assertRect(rect(view('contain', CENTER, true)), contain, 'contain mirrored');
  assertRect(rect(view('cover', CENTER, true)), { x: -100, y: 0, width: 600, height: 300 },
    'cover mirrored');
  assertRect(rect(view('contain', position(0, 0, 1, -10))),
    { x: 0, y: 90, width: 400, height: 200 }, 'contain left 0px bottom 10px');
  assertRect(rect(view('cover', position(1, -10, 0.5, 0))),
    { x: -210, y: 0, width: 600, height: 300 }, 'cover right 10px center');
});

test('U3 projectOverlayPoint maps (0.1, 0.1) to (40, 70) contain, (440, 30) cover mirrored', () => {
  const project = api('projectOverlayPoint');
  const point = deepFreeze(P(0.1, 0.1));
  assertPoints([project(point, view('contain'))], [P(40, 70)], 'contain');
  assertPoints([project(point, view('cover', undefined, true))], [P(440, 30)], 'cover mirrored');
  assertPoints([project(point, view('cover', CENTER, true))], [P(440, 30)],
    'cover 50% 50% mirrored');
  // The mirror flips the whole box, position offset included (the contain 20% 80% row).
  assertPoints([project(point, view('contain', position(0.2, 0, 0.8, 0), true))], [P(360, 100)],
    'contain 20% 80% mirrored');
});

// ------------------------------------------------------------------------- U4-U6 geometry

function rowLabel(row) {
  const media = (row.media || [1600, 800]).join('x');
  return `${row.fit} ${row.css || row.setting}${row.mirror ? ' mirrored' : ''} ${media}`;
}
function rowView(row) {
  return view(row.fit, row.position, row.mirror, row.media);
}
// A valid geometry: points within 1e-9, inView and precise per 2, fraction to 4 decimals.
function assertProjected(projected, kind, polygon, fraction, label, inputPrecise = true) {
  const expected = parsePoints(polygon);
  assert.ok(projected !== null && typeof projected === 'object', `${label}: geometry object`);
  assert.equal(projected.kind, kind, `${label}: kind`);
  assertPoints(projected.points, expected, label);
  assert.equal(projected.valid, true, `${label}: valid`);
  const inView = inViewOf(expected);
  assert.equal(projected.inView, inView, `${label}: inView`);
  assert.equal(projected.precise, inputPrecise && inView, `${label}: precise`);
  assertFraction(projected.visibleFraction, fraction, label);
}

test('U4 projectOverlayGeometry reproduces the reference table for quad one', () => {
  const project = api('projectOverlayGeometry');
  for (const row of TABLE_48) {
    const geometry = deepFreeze({ kind: 'quad', points: ONE, precise: true });
    assertProjected(project(geometry, rowView(row)), 'quad', row.polygon, row.fraction,
      rowLabel(row));
  }
});

test('U4 cover quad one is neither inView nor precise; fill keeps the input precise', () => {
  const project = api('projectOverlayGeometry');
  const cover = project(deepFreeze({ kind: 'quad', points: ONE, precise: true }),
    view('cover', CENTER, false));
  assert.equal(cover.valid, true, 'cover: valid');
  assert.equal(cover.inView, false, 'cover: inView');
  assert.equal(cover.precise, false, 'cover: precise');
  for (const precise of [true, false]) {
    const fill = project(deepFreeze({ kind: 'quad', points: ONE, precise }), view('fill'));
    assert.equal(fill.inView, true, `fill precise ${precise}: inView`);
    assert.equal(fill.precise, precise, `fill: precise = input precise (${precise})`);
  }
});

test('U4 projectOverlayGeometry reproduces the perspective reference table', () => {
  const project = api('projectOverlayGeometry');
  for (const row of PERSPECTIVE_48) {
    const geometry = deepFreeze({ kind: 'quad', points: PERSPECTIVE, precise: true });
    assertProjected(project(geometry, rowView(row)), 'quad', row.polygon, row.fraction,
      `perspective ${row.setting}`);
  }
});

test('U4 projectOverlayGeometry reproduces the other reference cases', () => {
  const project = api('projectOverlayGeometry');
  const quad = (points, precise = true) => deepFreeze({ kind: 'quad', points, precise });
  assertProjected(project(quad(TWO), view('contain', CENTER, false)), 'quad',
    '240,150 360,150 360,210 240,210', 1, 'quad two contain');
  const stock = deepFreeze({ kind: 'segment', points: STOCK, precise: false });
  assertProjected(project(stock, view('contain', CENTER, false)), 'segment', '50,225 150,225', 1,
    'segment stock contain', false);
  assertProjected(project(stock, view('cover', CENTER, false)), 'segment',
    '-25,262.5 125,262.5', 0.8333, 'segment stock cover', false);
  assertProjected(project(quad(EDGE), view('cover', CENTER, false)), 'quad',
    '-100,30 -10,30 -10,120 -100,120', 0, 'edge quad cover');
  // A rotated 800 x 1600 frame shown contain in 400 x 300.
  assertProjected(project(quad(ONE), view('contain', CENTER, false, [800, 1600])), 'quad',
    '140,30 185,30 185,120 140,120', 1, 'rotated frame contain');
});

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Centered contain, cover or fill views with quads (convex, bow-tie, concave, reversed),
// segments and partial points, some off view, tiny or non-finite.
function randomCase(random) {
  const between = (low, high) => low + (high - low) * random();
  const pick = list => list[Math.floor(random() * list.length)];
  const size = () => (random() < 0.5 ? Math.round(between(40, 1920)) : between(40, 1920));
  const videoView = {
    mediaWidth: Math.round(between(16, 3840)), mediaHeight: Math.round(between(16, 2160)),
    viewWidth: size(), viewHeight: size(), fit: pick(['contain', 'cover', 'fill']),
  };
  const mirror = pick([false, true, undefined]);
  if (random() < 0.5) videoView.position = CENTER;
  const kind = pick(['quad', 'quad', 'quad', 'segment', 'partial']);
  const cx = between(-0.3, 1.3);
  const cy = between(-0.3, 1.3);
  const half = random() < 0.3 ? between(0.001, 0.01) : between(0.01, 0.4);
  const jitter = () => between(-0.15, 0.15) * half;
  let points;
  if (kind === 'quad') {
    const corner = (dx, dy) => P(cx + dx * half + jitter(), cy + dy * half + jitter());
    points = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    const shape = pick(['convex', 'convex', 'convex', 'bow-tie', 'concave', 'reversed']);
    if (shape === 'bow-tie') points = [points[0], points[2], points[1], points[3]];
    if (shape === 'concave') points[2] = corner(between(-0.6, -0.3), between(-0.6, -0.3));
    if (shape === 'reversed') points.reverse();
  } else if (kind === 'segment') {
    points = [P(cx, cy), P(cx + between(-1, 1) * half, cy + between(-1, 1) * half)];
  } else {
    points = Array.from({ length: 1 + Math.floor(random() * 8) },
      () => P(between(-0.3, 1.3), between(-0.3, 1.3)));
  }
  if (random() < 0.03) {
    const index = Math.floor(random() * points.length);
    points[index] = P(pick([NaN, Infinity, -Infinity]), points[index].y);
  }
  const options = pick([undefined, undefined, { minArea: 0 }, { minArea: 16 }, { minArea: 400 }]);
  return {
    view: videoView, mirror, options,
    geometry: deepFreeze({ kind, points, precise: random() < 0.6 }),
  };
}

// A fixed seed first, then three more; 1000 cases each, none skipped.
const U5_SEEDS = [0x0059C0DE, 1, 2, 3];

test('U5 projectOverlayGeometry equals projectVideoGeometry exactly, 1000 centered views per seed',
  () => {
    const projectOverlay = api('projectOverlayGeometry');
    const projectVideo = exportOf('camera', 'projectVideoGeometry');
    const failures = [];
    let failed = 0;
    for (const seed of U5_SEEDS) {
      const random = mulberry32(seed);
      for (let n = 1; n <= 1000; n += 1) {
        const { view: overlayView, mirror, options, geometry } = randomCase(random);
        const videoView = { sourceWidth: overlayView.mediaWidth,
          sourceHeight: overlayView.mediaHeight, viewWidth: overlayView.viewWidth,
          viewHeight: overlayView.viewHeight, fit: overlayView.fit };
        if (mirror !== undefined) {
          overlayView.mirror = mirror;
          videoView.mirror = mirror;
        }
        const reference = projectVideo(geometry, videoView, options);
        const actual = projectOverlay(geometry, deepFreeze(overlayView), options);
        const problems = [];
        if (actual.kind !== reference.kind) {
          problems.push(`kind ${actual.kind} vs ${reference.kind}`);
        }
        if (!Array.isArray(actual.points) || actual.points.length !== reference.points.length) {
          problems.push('point count');
        } else {
          // Object.is: bit-exact, NaN equals NaN.
          reference.points.forEach((p, i) => {
            const q = actual.points[i] || {};
            if (!Object.is(q.x, p.x) || !Object.is(q.y, p.y)) {
              problems.push(`point ${i} (${q.x}, ${q.y}) vs (${p.x}, ${p.y})`);
            }
          });
        }
        for (const key of ['valid', 'inView', 'precise']) {
          if (actual[key] !== reference[key]) {
            problems.push(`${key} ${actual[key]} vs ${reference[key]}`);
          }
        }
        if (!(actual.visibleFraction >= 0 && actual.visibleFraction <= 1)) {
          problems.push(`visibleFraction ${actual.visibleFraction} outside [0, 1]`);
        }
        if (problems.length > 0) failed += 1;
        if (problems.length > 0 && failures.length < 8) {
          failures.push(`seed ${seed} case ${n}: ${problems.join('; ')} for ` +
            JSON.stringify({ view: overlayView, geometry, options }));
        }
      }
    }
    assert.deepEqual(failures, [], 'projectOverlayGeometry differs from projectVideoGeometry ' +
      `in ${failed} of ${1000 * U5_SEEDS.length} cases`);
  });

test('U6 visibleFraction of quads follows the reference tables', () => {
  const project = api('projectOverlayGeometry');
  for (const row of TABLE_48) {
    const projected = project(deepFreeze({ kind: 'quad', points: ONE, precise: true }),
      rowView(row));
    assertFraction(projected.visibleFraction, row.fraction, rowLabel(row));
  }
  for (const row of PERSPECTIVE_48) {
    const projected = project(deepFreeze({ kind: 'quad', points: PERSPECTIVE, precise: true }),
      rowView(row));
    assertFraction(projected.visibleFraction, row.fraction, `perspective ${row.setting}`);
  }
  const edge = project(deepFreeze({ kind: 'quad', points: EDGE, precise: true }),
    view('cover', CENTER, false));
  assertFraction(edge.visibleFraction, 0, 'edge quad cover');
  // Clipped on two edges: a 100 x 150 px rectangle centered on the view's top-left corner.
  const corner = project(deepFreeze({ kind: 'quad', precise: true,
    points: [P(-0.125, -0.25), P(0.125, -0.25), P(0.125, 0.25), P(-0.125, 0.25)] }),
  view('fill', undefined, false, [400, 300]));
  assert.equal(corner.valid, true, 'corner rectangle: valid');
  assertFraction(corner.visibleFraction, 0.25, 'corner rectangle (one quarter visible)');
});

test('U6 visibleFraction of a valid segment is its clipped length (Liang-Barsky)', () => {
  const project = api('projectOverlayGeometry');
  const segment = points => deepFreeze({ kind: 'segment', points, precise: false });
  const stockCover = project(segment(STOCK), view('cover', CENTER, false));
  assert.equal(stockCover.valid, true, 'stock cover: valid');
  assertFraction(stockCover.visibleFraction, 0.8333, 'segment stock cover');
  assertFraction(project(segment(STOCK), view('contain', CENTER, false)).visibleFraction, 1,
    'segment stock contain');
  // (-100, 150)-(500, 150) in a 400 px wide fill view: 400 of 600 px visible.
  const across = project(segment([P(-0.25, 0.5), P(1.25, 0.5)]),
    view('fill', undefined, false, [400, 300]));
  assertFraction(across.visibleFraction, 0.6667, 'segment across the view');
});

test('U6 visibleFraction counts points for partial points and invalid geometry', () => {
  const project = api('projectOverlayGeometry');
  const fill = view('fill', undefined, false, [400, 300]);
  // Three partial points, one outside the view.
  const partial = project(deepFreeze({ kind: 'partial', precise: false,
    points: [P(0.5, 0.5), P(0.2, 0.3), P(0.5, -0.5)] }), view('contain', CENTER, false));
  assertFraction(partial.visibleFraction, 0.6667, 'three partial points, one outside');
  // An area-15 quad is invalid at minArea 16: 2 of 4 points inside (its area share is 0.6).
  const small = project(deepFreeze({ kind: 'quad', precise: true,
    points: [P(-0.005, 0.5), P(0.0075, 0.5), P(0.0075, 0.51), P(-0.005, 0.51)] }), fill);
  assert.equal(small.valid, false, 'area-15 quad: invalid');
  assertPoints(small.points, '-2,150 3,150 3,153 -2,153', 'area-15 quad', 1e-9);
  assertFraction(small.visibleFraction, 0.5, 'area-15 quad counts its points');
  // A 0.5 px segment is invalid: 1 of 2 points inside (its length share is 0.6).
  const short = project(deepFreeze({ kind: 'segment', precise: false,
    points: [P(-0.0005, 0.5), P(0.00075, 0.5)] }), fill);
  assert.equal(short.valid, false, '0.5 px segment: invalid');
  assertFraction(short.visibleFraction, 0.5, '0.5 px segment counts its points');
});

// ------------------------------------------------------------------------ U7-U9 outlines

// Paths print numbers rounded to 0.1, which moves a point by up to this much.
const ROUNDING = 0.05 * Math.SQRT2;

function parsePath(d) {
  assert.equal(typeof d, 'string', 'path is a string');
  assert.match(d, /^[MLQZ0-9 .-]+$/, `path alphabet: ${d}`);
  const tokens = d.match(/[MLQZ]|-?\d+(?:\.\d+)?/g) || [];
  const arity = { M: 2, L: 2, Q: 4, Z: 0 };
  const commands = [];
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i];
    assert.ok(Object.prototype.hasOwnProperty.call(arity, command), `command at ${i} in ${d}`);
    const args = tokens.slice(i + 1, i + 1 + arity[command]).map(Number);
    assert.ok(args.length === arity[command] && args.every(Number.isFinite), `${command} in ${d}`);
    commands.push({ command, args });
    i += 1 + arity[command];
  }
  return commands;
}
// Straight pieces and quadratic corners of one closed region path.
function regionShape(d) {
  const lines = [];
  const curves = [];
  let current = null;
  let start = null;
  for (const { command, args } of parsePath(d)) {
    if (command === 'M') {
      current = start = P(args[0], args[1]);
    } else if (command === 'L') {
      lines.push([current, P(args[0], args[1])]);
      current = P(args[0], args[1]);
    } else if (command === 'Q') {
      curves.push([current, P(args[0], args[1]), P(args[2], args[3])]);
      current = P(args[2], args[3]);
    } else {
      if (current.x !== start.x || current.y !== start.y) lines.push([current, start]);
      current = start;
    }
  }
  return { lines, curves };
}
function boundarySegments(d) {
  const { lines, curves } = regionShape(d);
  const segments = lines.slice();
  for (const [a, control, b] of curves) {
    let previous = a;
    for (let step = 1; step <= 64; step += 1) {
      const t = step / 64, u = 1 - t;
      const point = P(u * u * a.x + 2 * u * t * control.x + t * t * b.x,
        u * u * a.y + 2 * u * t * control.y + t * t * b.y);
      segments.push([previous, point]);
      previous = point;
    }
  }
  return segments;
}
function distanceToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0
    : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
function boundaryDistance(p, d) {
  return Math.min(...boundarySegments(d).map(([a, b]) => distanceToSegment(p, a, b)));
}
function contains(d, p) {
  let inside = false;
  for (const [a, b] of boundarySegments(d)) {
    if ((a.y > p.y) !== (b.y > p.y) && a.x + (p.y - a.y) * (b.x - a.x) / (b.y - a.y) > p.x) {
      inside = !inside;
    }
  }
  return inside;
}
// Distance from each corner's apex B(0.5) to the measured vertex nearest its control point:
// along the bisector, since both tangent lengths of a corner are equal.
function apexClearances(d, points) {
  return regionShape(d).curves.map(([a, control, b]) => {
    const apex = P(0.25 * a.x + 0.5 * control.x + 0.25 * b.x,
      0.25 * a.y + 0.5 * control.y + 0.25 * b.y);
    let vertex = points[0];
    for (const p of points) {
      if (Math.hypot(p.x - control.x, p.y - control.y) <
        Math.hypot(vertex.x - control.x, vertex.y - control.y)) vertex = p;
    }
    return Math.hypot(apex.x - vertex.x, apex.y - vertex.y);
  });
}
function xRange(d) {
  const xs = boundarySegments(d).flatMap(([a, b]) => [a.x, b.x]);
  return [Math.min(...xs), Math.max(...xs)];
}

test('U7 quadOutline gives the reference brackets exactly', () => {
  const quadOutline = api('quadOutline');
  for (const { name, points, bracket } of REFERENCE_53) {
    assert.equal(quadOutline(points).bracket, bracket, `bracket ${name}`);
  }
  const defaults = deepFreeze({ offset: 5.5, arm: 0.27, minArm: 6, maxArm: 23, radius: 4.2,
    miterLimit: 4 });
  assert.equal(quadOutline(QUAD_A, defaults).bracket, REFERENCE_53[0].bracket,
    'bracket A with the defaults passed explicitly');
});

test('U7 quadOutline gives the unrounded offset corners of A in input order', () => {
  const outline = api('quadOutline')(QUAD_A);
  assertPoints(outline.corners, '34.5,64.5 165.5,64.5 165.5,135.5 34.5,135.5', 'corners A');
});

test('U8 quadRegion gives the reference regions exactly', () => {
  const quadRegion = api('quadRegion');
  for (const { name, points, region } of REFERENCE_53) {
    assert.equal(quadRegion(points), region, `region ${name} (default margin 9)`);
    assert.equal(quadRegion(points, deepFreeze({ margin: 9, radius: 6, miterLimit: 4 })), region,
      `region ${name} with the defaults passed explicitly`);
  }
  assert.equal(quadRegion(QUAD_S1, deepFreeze({ margin: 2 })), REGION_S1, 'region S1 at margin 2');
  assert.equal(quadRegion(QUAD_S2, deepFreeze({ margin: 2 })), REGION_S2, 'region S2 at margin 2');
});

// The 9.00 px and 1.00 px insets hold before rounding to 0.1 px (C: 8.96, S1: 0.99).
test('U8 every measured vertex stays inside its region, 1 px or more inside its curve', () => {
  const quadRegion = api('quadRegion');
  for (const { name, points } of REFERENCE_53) {
    const region = quadRegion(points);
    points.forEach((vertex, index) => {
      assert.ok(contains(region, vertex), `${name} vertex ${index} inside at margin 9`);
      const distance = boundaryDistance(vertex, region);
      assert.ok(Math.abs(distance - 9) <= ROUNDING,
        `${name} vertex ${index}: ${distance.toFixed(4)} px from the edges, 9.00 expected`);
    });
    const clearances = apexClearances(region, points);
    assert.equal(clearances.length, 4, `${name}: four rounded corners at margin 9`);
    clearances.forEach((clearance, index) => assert.ok(clearance >= 1 - ROUNDING,
      `${name} corner ${index}: vertex ${clearance.toFixed(4)} px inside its curve`));
  }
  for (const [name, points] of [['S1', QUAD_S1], ['S2', QUAD_S2]]) {
    const region = quadRegion(points, { margin: 2 });
    points.forEach((vertex, index) => {
      assert.ok(contains(region, vertex), `${name} vertex ${index} inside at margin 2`);
    });
    const clearances = apexClearances(region, points);
    assert.equal(clearances.length, 4, `${name}: four rounded corners at margin 2`);
    clearances.forEach((clearance, index) => assert.ok(Math.abs(clearance - 1) <= ROUNDING,
      `${name} corner ${index}: vertex ${clearance.toFixed(4)} px inside its curve, 1.00 wanted`));
  }
  const gap = xRange(quadRegion(QUAD_S2, { margin: 2 }))[0] -
    xRange(quadRegion(QUAD_S1, { margin: 2 }))[1];
  assert.ok(Math.abs(gap - 1) <= 0.1, `the S1 and S2 holes are ${gap} px apart, 1 expected`);
});

test('U8 quadRegion at margin 0 is the quad itself, with no Q', () => {
  const quadRegion = api('quadRegion');
  for (const { name, points } of REFERENCE_53) {
    const region = quadRegion(points, { margin: 0 });
    assert.ok(!region.includes('Q'), `${name}: no Q at margin 0 in ${region}`);
    const commands = parsePath(region);
    assert.equal(commands[0].command, 'M', `${name}: starts with M`);
    assert.equal(commands[commands.length - 1].command, 'Z', `${name}: ends with Z`);
    const visited = commands.slice(0, -1).map(({ command, args }) => {
      assert.ok(command === 'M' || command === 'L', `${name}: only M and L before Z`);
      return P(args[0], args[1]);
    });
    if (visited.length === 5) {
      assertPoints([visited[4]], [visited[0]], `${name}: an explicit closing point is the start`);
      visited.pop();
    }
    assertPoints(visited, points, `${name} at margin 0`);
    points.forEach((vertex, index) => assert.ok(boundaryDistance(vertex, region) <= ROUNDING,
      `${name} vertex ${index} lies on the margin-0 boundary`));
  }
});

const BAD_QUADS = {
  'three points': [P(0, 0), P(10, 0), P(10, 10)],
  'five points': [P(0, 0), P(10, 0), P(10, 10), P(0, 10), P(-5, 5)],
  'no points': [],
  NaN: [P(NaN, 0), P(10, 0), P(10, 10), P(0, 10)],
  Infinity: [P(0, 0), P(Infinity, 0), P(10, 10), P(0, 10)],
  concave: [P(0, 0), P(10, 0), P(3, 3), P(0, 10)],
  'bow-tie': [P(0, 0), P(10, 10), P(10, 0), P(0, 10)],
  // Not strictly convex (2): a straight angle, then a zero-length edge.
  collinear: [P(0, 0), P(5, 0), P(10, 0), P(5, 10)],
  'repeated point': [P(0, 0), P(0, 0), P(10, 10), P(0, 10)],
};

test('U9 quadOutline and quadRegion throw a RangeError for malformed quads', () => {
  const quadOutline = api('quadOutline');
  const quadRegion = api('quadRegion');
  for (const [name, points] of Object.entries(BAD_QUADS)) {
    const frozen = deepFreeze(points.map(p => ({ ...p })));
    assert.throws(() => quadOutline(frozen), RangeError, `quadOutline: ${name}`);
    assert.throws(() => quadRegion(frozen), RangeError, `quadRegion: ${name}`);
  }
});

const NUMBER = '(-?\\d+(?:\\.\\d+)?)';
const SUBPATH = new RegExp(`^M${NUMBER} ${NUMBER}L${NUMBER} ${NUMBER}Q${NUMBER} ${NUMBER} ` +
  `${NUMBER} ${NUMBER}L${NUMBER} ${NUMBER}$`);
// M a L b Q k c L e drawn backwards: M e L c Q k b L a.
function reverseSubpath(subpath) {
  const match = SUBPATH.exec(subpath);
  assert.ok(match, `corner subpath M L Q L: ${subpath}`);
  const [, ax, ay, bx, by, kx, ky, cx, cy, ex, ey] = match;
  return `M${ex} ${ey}L${cx} ${cy}Q${kx} ${ky} ${bx} ${by}L${ax} ${ay}`;
}
const subpathsOf = bracket => bracket.split(/(?=M)/);

test('U9 reversed input reverses the subpath order and the direction of each subpath', () => {
  const quadOutline = api('quadOutline');
  const forward = subpathsOf(quadOutline(QUAD_A).bracket);
  const reversedOutline = quadOutline(deepFreeze([QUAD_A[3], QUAD_A[2], QUAD_A[1], QUAD_A[0]]));
  const reversed = subpathsOf(reversedOutline.bracket);
  assert.equal(reversed.length, 4, 'four corner subpaths');
  assert.equal(reversed[0], 'M34.5 116.3L34.5 131.3Q34.5 135.5 38.7 135.5L57.5 135.5',
    'first subpath (5.3)');
  assert.equal(reversed[3], 'M57.5 64.5L38.7 64.5Q34.5 64.5 34.5 68.7L34.5 83.7',
    'last subpath (5.3)');
  for (let index = 0; index < 4; index += 1) {
    assert.equal(reversed[index], reverseSubpath(forward[3 - index]),
      `subpath ${index} is forward subpath ${3 - index} reversed (corner P${3 - index})`);
  }
  assertPoints(reversedOutline.corners, '34.5,135.5 165.5,135.5 165.5,64.5 34.5,64.5',
    'corners follow the reversed input order');
});

test('U9 quadRegion follows the winding: reversed input bounds the same region', () => {
  const quadRegion = api('quadRegion');
  const pairs = d => new Set(parsePath(d).flatMap(({ args }) => args.reduce(
    (list, value, i) => (i % 2 === 0 ? list.concat(`${value} ${args[i + 1]}`) : list), [])));
  const forward = quadRegion(QUAD_A);
  const reversed = quadRegion(deepFreeze([QUAD_A[3], QUAD_A[2], QUAD_A[1], QUAD_A[0]]));
  assert.deepEqual([...pairs(reversed)].sort(), [...pairs(forward)].sort(), 'same rounded points');
  for (const { name, points } of REFERENCE_53) {
    const backwards = points.slice().reverse();
    const region = quadRegion(backwards);
    backwards.forEach((vertex, index) => {
      assert.ok(contains(region, vertex), `${name} reversed: vertex ${index} inside`);
      assert.ok(Math.abs(boundaryDistance(vertex, region) - 9) <= ROUNDING,
        `${name} reversed: vertex ${index} 9 px from the edges`);
    });
  }
});

// ------------------------------------------------------------------- U10-U11 text helpers

test('U10 symbologyFamily follows the family table', () => {
  const symbologyFamily = api('symbologyFamily');
  assert.equal(SYMBOLOGIES.length, 19, 'the 19 wire ids');
  for (const [id, , family] of SYMBOLOGIES) assert.equal(symbologyFamily(id), family, id);
  for (const id of ['data_bar', 'data_bar_expanded', 'future_code']) {
    assert.equal(symbologyFamily(id), null, id);
  }
});

test('U10 symbologyFamily gives null for any id this version does not know', () => {
  const symbologyFamily = api('symbologyFamily');
  for (const id of ['QR_CODE', 'qr', '', 'toString', 'constructor', '__proto__', 'valueOf']) {
    assert.equal(symbologyFamily(id), null, JSON.stringify(id));
  }
});

function segmentsOf(input) {
  const segments = api('segmentText')(input);
  assert.ok(Array.isArray(segments), `segments of ${JSON.stringify(input)} are an array`);
  return segments.map(segment => (segment.type === 'escape'
    ? { type: segment.type, text: segment.text, codePoint: segment.codePoint, name: segment.name }
    : { type: segment.type, text: segment.text }));
}
function textSegment(text) {
  return { type: 'text', text };
}
function breakSegment(text) {
  return { type: 'break', text };
}
function chip(text, name) {
  return { type: 'escape', text, codePoint: text.codePointAt(0), name };
}
const ENGLAND = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
const TECHNOLOGIST = '\u{1F469}‍\u{1F4BB}';

test('U11 segmentText is lossless: the joined segment text equals the input', () => {
  const corpus = ['', 'a', 'a\tb', 'a\r\nb', 'a\rb', 'a\nb', '\r\r\n\n\r', 'a​b',
    TECHNOLOGIST, 'a‍b', '‮', 'x‮y', 'ㅤ', ENGLAND, '\u{E0041}',
    '\u0000\u001F\u007F\u0085\u009F', '\uD800', 'a\uDC00b', '\u{1F3F4}\u{E0067}\u{E0062}',
    'é   ❤️ \u{1F1EB}\u{1F1F7}', '<img src=x onerror=alert(1)>',
    'https://example.test/one', 'x'.repeat(7000) + '​\r\n'];
  for (const input of corpus) {
    const segments = api('segmentText')(input);
    assert.equal(segments.map(segment => segment.text).join(''), input, JSON.stringify(input));
  }
});

test('U11 segmentText splits the U11 corpus into text, breaks and named chips', () => {
  const cases = [
    ['a\tb', [textSegment('a'), chip('\t', 'TAB'), textSegment('b')]],
    ['a\r\nb', [textSegment('a'), breakSegment('\r\n'), textSegment('b')]],
    ['a\rb', [textSegment('a'), breakSegment('\r'), textSegment('b')]],
    ['a​b', [textSegment('a'), chip('​', 'ZWSP'), textSegment('b')]],
    [TECHNOLOGIST, [textSegment(TECHNOLOGIST)]],
    ['a‍b', [textSegment('a'), chip('‍', 'ZWJ'), textSegment('b')]],
    ['‮', [chip('‮', 'RLO')]],
    ['x‮y', [textSegment('x'), chip('‮', 'RLO'), textSegment('y')]],
    ['ㅤ', [chip('ㅤ', 'U+3164')]],
    [ENGLAND, [textSegment(ENGLAND)]],
    ['\u{E0041}', [chip('\u{E0041}', 'U+E0041')]],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(segmentsOf(input), expected, JSON.stringify(input));
  }
});

test('U11 segmentText applies the other escape and keep rules', () => {
  const cases = [
    ['a\nb', [textSegment('a'), breakSegment('\n'), textSegment('b')]],
    ['\r\r\n\n\r', [breakSegment('\r'), breakSegment('\r\n'), breakSegment('\n'),
      breakSegment('\r')]],
    // ZWNJ between two non-ASCII characters stays text; next to ASCII it is a chip.
    ['می‌خ', [textSegment('می‌خ')]],
    ['é‍a', [textSegment('é'), chip('‍', 'ZWJ'), textSegment('a')]],
    ['\u{1F469}‍', [textSegment('\u{1F469}'), chip('‍', 'ZWJ')]],
    // A tag run is text only when closed by U+E007F directly after U+1F3F4.
    ['\u{1F3F4}\u{E0067}\u{E0062}', [textSegment('\u{1F3F4}'), chip('\u{E0067}', 'U+E0067'),
      chip('\u{E0062}', 'U+E0062')]],
    ['a\u{E0067}\u{E007F}', [textSegment('a'), chip('\u{E0067}', 'U+E0067'),
      chip('\u{E007F}', 'U+E007F')]],
    ['\uD800', [chip('\uD800', 'U+D800')]],
    ['a\uDC00b', [textSegment('a'), chip('\uDC00', 'U+DC00'), textSegment('b')]],
    ['ᅟᅠﾠ⠀', [chip('ᅟ', 'U+115F'), chip('ᅠ', 'U+1160'),
      chip('ﾠ', 'U+FFA0'), chip('⠀', 'U+2800')]],
    ['é   ❤️ \u{1F1EB}\u{1F1F7}',
      [textSegment('é   ❤️ \u{1F1EB}\u{1F1F7}')]],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(segmentsOf(input), expected, JSON.stringify(input));
  }
});

// Unicode abbreviations; LF and CR are breaks, never chips.
const C0_NAMES = ['NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'TAB', null,
  'VT', 'FF', null, 'SO', 'SI', 'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN',
  'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US'];
const C1_NAMES = ['PAD', 'HOP', 'BPH', 'NBH', 'IND', 'NEL', 'SSA', 'ESA', 'HTS', 'HTJ', 'VTS',
  'PLD', 'PLU', 'RI', 'SS2', 'SS3', 'DCS', 'PU1', 'PU2', 'STS', 'CCH', 'MW', 'SPA', 'EPA', 'SOS',
  'SGC', 'SCI', 'CSI', 'ST', 'OSC', 'PM', 'APC'];
const FORMAT_NAMES = [[0x7F, 'DEL'], [0xAD, 'SHY'], [0x61C, 'ALM'], [0x200B, 'ZWSP'],
  [0x200C, 'ZWNJ'], [0x200D, 'ZWJ'], [0x200E, 'LRM'], [0x200F, 'RLM'], [0x2028, 'LS'],
  [0x2029, 'PS'], [0x202A, 'LRE'], [0x202B, 'RLE'], [0x202C, 'PDF'], [0x202D, 'LRO'],
  [0x202E, 'RLO'], [0x2060, 'WJ'], [0x2066, 'LRI'], [0x2067, 'RLI'], [0x2068, 'FSI'],
  [0x2069, 'PDI'], [0xFEFF, 'ZWNBSP']];

test('U11 segmentText names chips with their Unicode abbreviations', () => {
  const named = C0_NAMES.map((name, codePoint) => [codePoint, name])
    .concat(C1_NAMES.map((name, index) => [0x80 + index, name]), FORMAT_NAMES)
    .filter(([, name]) => name !== null);
  for (const [codePoint, name] of named) {
    const character = String.fromCodePoint(codePoint);
    const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
    assert.deepEqual(segmentsOf(`a${character}b`),
      [textSegment('a'), chip(character, name), textSegment('b')], `U+${hex} is ${name}`);
  }
});

// ---------------------------------------------------------------------------- U12 readout

const NO_META = { version: null, ec_level: null, mask: null, modules: null, inverted: null };
function hexBytes(bytes) {
  return Array.from(bytes, byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}
// A frozen engine detection: describeDetection must never write it (2).
function makeDetection(symbology, text, payload, content = {}) {
  return deepFreeze({
    symbology,
    content: { text, raw: Buffer.from(text, 'utf8').toString('base64'), charset: 'utf8',
      ...content },
    payload, corners: null, meta: { ...NO_META }, engines: ['rxing'],
  });
}
const GTIN = '09506000134352';
const DL_URL = `https://id.gs1.org/01/${GTIN}/10/ABC123`;
const GS1_ISSUE = 'AI 01: check digit invalid for \'09506000134353\' (GenSpecs 7.2.7)';
const CONFORMANT = 'Meets the checked GS1 rules';
const WIFI = makeDetection('qr_code', 'WIFI:T:WPA;S:Home Net;P:s3cret;H:true;;',
  { kind: 'wifi', ssid: 'Home Net', security: 'WPA', password: 's3cret', hidden: true });
const ME_CARD = makeDetection('qr_code',
  'MECARD:N:Doe,Jane;TEL:+33123456789;URL:https://example.test/jane;;',
  { kind: 'me_card', name: 'Doe,Jane', tel: '+33123456789', email: null,
    url: 'https://example.test/jane' });

// The readout lists "conformant (yes/no)" among the fields; its label is read from
// labels.conformant, since labels.fields has no conformant key.
const KIND_CASES = [
  { kindLabel: 'URL', fields: [],
    detection: makeDetection('qr_code', 'https://EXAMPLE.test/a b',
      { kind: 'url', url: 'https://EXAMPLE.test/a b' }),
    url: { encoded: 'https://EXAMPLE.test/a b', href: 'https://example.test/a%20b',
      host: 'example.test' } },
  { kindLabel: 'Wi-Fi', detection: WIFI,
    fields: [['ssid', 'Network name', 'Home Net'], ['security', 'Security', 'WPA'],
      ['password', 'Password', 's3cret'], ['hidden', 'Hidden network', 'Yes']] },
  { kindLabel: 'Email',
    detection: makeDetection('qr_code', 'mailto:ops@example.test?subject=Hi',
      { kind: 'email', to: 'ops@example.test', subject: 'Hi', body: null }),
    fields: [['to', 'To', 'ops@example.test'], ['subject', 'Subject', 'Hi']] },
  { kindLabel: 'SMS',
    detection: makeDetection('qr_code', 'SMSTO:+33123456789:Bonjour',
      { kind: 'sms', number: '+33123456789', body: 'Bonjour' }),
    fields: [['number', 'Number', '+33123456789'], ['body', 'Message', 'Bonjour']] },
  { kindLabel: 'Phone number',
    detection: makeDetection('qr_code', 'tel:+33123456789',
      { kind: 'tel', number: '+33123456789' }),
    fields: [['number', 'Number', '+33123456789']] },
  { kindLabel: 'Location',
    detection: makeDetection('qr_code', 'geo:48.85660,2.35220',
      { kind: 'geo', lat: 48.8566, lon: 2.3522 }),
    fields: [['lat', 'Latitude', '48.8566'], ['lon', 'Longitude', '2.3522']] },
  { kindLabel: 'GS1 element string', gtin: '09506000134353', issues: [GS1_ISSUE],
    detection: makeDetection('data_matrix', '010950600013435310ABC123',
      { kind: 'gs1',
        elements: [{ ai: '01', value: '09506000134353' }, { ai: '10', value: 'ABC123' }],
        gtin: '09506000134353', conformant: false, issues: [GS1_ISSUE] }, { fnc1: 'first' }),
    fields: [['gs1:01', '(01)', '09506000134353'], ['gs1:10', '(10)', 'ABC123'],
      ['gtin', 'GTIN', '09506000134353'], ['conformant', CONFORMANT, 'No']] },
  { kindLabel: 'GS1 Digital Link', gtin: GTIN, url: { encoded: DL_URL, href: DL_URL,
    host: 'id.gs1.org' },
    detection: makeDetection('qr_code', DL_URL,
      { kind: 'gs1_digital_link', url: DL_URL,
        elements: [{ ai: '01', value: GTIN }, { ai: '10', value: 'ABC123' }],
        gtin: GTIN, conformant: true, issues: [] }),
    fields: [['gs1:01', '(01)', GTIN], ['gs1:10', '(10)', 'ABC123'], ['gtin', 'GTIN', GTIN],
      ['conformant', CONFORMANT, 'Yes']] },
  { kindLabel: 'Contact (MeCard)', detection: ME_CARD,
    fields: [['name', 'Name', 'Doe,Jane'], ['tel', 'Phone', '+33123456789'],
      ['url', 'URL', 'https://example.test/jane']] },
  { kindLabel: 'Crypto payment',
    detection: makeDetection('qr_code', 'bitcoin:bc1qexample?amount=0.5',
      { kind: 'crypto', scheme: 'bitcoin', address: 'bc1qexample', amount: '0.5' }),
    fields: [['scheme', 'Scheme', 'bitcoin'], ['address', 'Address', 'bc1qexample'],
      ['amount', 'Amount', '0.5']] },
  { kindLabel: 'Contact (vCard)', fields: [],
    detection: makeDetection('qr_code', 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Jane Doe\r\nEND:VCARD',
      { kind: 'v_card', raw: 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Jane Doe\r\nEND:VCARD' }) },
  { kindLabel: 'Calendar event (vEvent)', fields: [],
    detection: makeDetection('qr_code', 'BEGIN:VEVENT\r\nSUMMARY:Launch\r\nEND:VEVENT',
      { kind: 'v_event', raw: 'BEGIN:VEVENT\r\nSUMMARY:Launch\r\nEND:VEVENT' }) },
  { kindLabel: 'Text', fields: [],
    detection: makeDetection('code128', 'STOCK-4827', { kind: 'text' }) },
];

function plainSegments(segments) {
  assert.ok(Array.isArray(segments), 'segments is an array');
  return segments.map(segment => (segment.type === 'escape'
    ? { type: segment.type, text: segment.text, codePoint: segment.codePoint, name: segment.name }
    : { type: segment.type, text: segment.text }));
}
function urlOf(url) {
  return url === null ? null : { encoded: url.encoded, href: url.href, host: url.host };
}
function fieldsOf(readout) {
  assert.ok(Array.isArray(readout.fields), 'fields is an array');
  return readout.fields.map(({ key, label, value }) => [key, label, value]);
}
function assertReadout(readout, detection, expected, label) {
  const [, symbologyLabel, family] = SYMBOLOGIES.find(([id]) => id === detection.symbology);
  const content = detection.content;
  assert.equal(readout.symbology, detection.symbology, `${label}: symbology`);
  assert.equal(readout.symbologyLabel, symbologyLabel, `${label}: symbologyLabel`);
  assert.equal(readout.family, family, `${label}: family`);
  assert.equal(readout.familyLabel, family === null ? null : FAMILY_LABELS[family],
    `${label}: familyLabel`);
  assert.equal(readout.kind, detection.payload.kind, `${label}: kind`);
  assert.equal(readout.kindLabel, expected.kindLabel, `${label}: kindLabel`);
  assert.equal(readout.text, content.text, `${label}: text`);
  assert.deepEqual(plainSegments(readout.segments), segmentsOf(content.text), `${label}: segments`);
  assert.equal(readout.complete, content.charset !== 'unknown', `${label}: complete`);
  assert.equal(readout.charset, content.charset, `${label}: charset`);
  assert.deepEqual(readout.eci, content.eci === undefined ? null : content.eci, `${label}: eci`);
  assert.equal(readout.fnc1, content.fnc1 === undefined ? null : content.fnc1, `${label}: fnc1`);
  assert.equal(readout.bytes, hexBytes(Buffer.from(content.raw, 'base64')), `${label}: bytes`);
  assert.deepEqual(urlOf(readout.url), expected.url === undefined ? null : expected.url,
    `${label}: url`);
  assert.deepEqual(readout.candidate, exportOf('destination', 'destinationCandidate')(detection),
    `${label}: candidate`);
  assert.equal(readout.gtin, expected.gtin === undefined ? null : expected.gtin, `${label}: gtin`);
  assert.deepEqual(fieldsOf(readout), expected.fields, `${label}: fields`);
  assert.deepEqual(readout.issues, expected.issues || [], `${label}: issues`);
}

test('U12 describeDetection labels and fields all 13 payload kinds', () => {
  const describe = api('describeDetection');
  assert.equal(KIND_CASES.length, 13, 'the 13 payload kinds');
  for (const expected of KIND_CASES) {
    const { detection } = expected;
    assertReadout(describe(detection), detection, expected, detection.payload.kind);
  }
});

test('U12 describeDetection keeps the encoded URL exact, with WHATWG href and ASCII host', () => {
  const describe = api('describeDetection');
  const urlDetection = url => makeDetection('qr_code', url, { kind: 'url', url });
  const cases = [
    ['https://EXAMPLE.test/a b', 'https://example.test/a%20b', 'example.test'],
    ['https://bücher.example/', 'https://xn--bcher-kva.example/', 'xn--bcher-kva.example'],
    ['HTTP://Example.test', 'http://example.test/', 'example.test'],
    // The host is URL(payload.url).hostname, so no port.
    ['https://example.test:8443/x', 'https://example.test:8443/x', 'example.test'],
  ];
  for (const [encoded, href, host] of cases) {
    assert.deepEqual(urlOf(describe(urlDetection(encoded)).url), { encoded, href, host }, encoded);
  }
  for (const encoded of ['javascript:alert(1)', 'data:text/html,hi', 'intent://scan/#Intent;end',
    'ftp://example.test/', 'https://exa mple.test/']) {
    const readout = describe(urlDetection(encoded));
    assert.equal(readout.url, null, `${encoded}: no encoded URL`);
    assert.equal(readout.text, encoded, `${encoded}: the content stays exact`);
  }
});

test('U12 candidate equals destinationCandidate; me_card.url is eligible, source me_card', () => {
  const describe = api('describeDetection');
  const destinationCandidate = exportOf('destination', 'destinationCandidate');
  const readout = describe(ME_CARD);
  assert.equal(readout.url, null, 'me_card has no encoded URL row');
  assert.deepEqual(readout.candidate, destinationCandidate(ME_CARD), 'candidate');
  assert.equal(readout.candidate.eligible, true, 'eligible');
  assert.equal(readout.candidate.source, 'me_card', 'source');
  assert.equal(readout.candidate.encodedUrl, 'https://example.test/jane', 'encodedUrl');
  const dl = describe(KIND_CASES[7].detection).candidate;
  assert.equal(dl.eligible, true, 'GS1 Digital Link: eligible');
  assert.equal(dl.source, 'gs1_digital_link', 'GS1 Digital Link: source');
  for (const detection of [KIND_CASES[12].detection, makeDetection('qr_code', 'javascript:x',
    { kind: 'url', url: 'javascript:x' })]) {
    assert.deepEqual(describe(detection).candidate, destinationCandidate(detection),
      `candidate of ${detection.content.text}`);
  }
});

test('U12 describeDetection decodes raw to hex bytes and reports an unknown charset', () => {
  const describe = api('describeDetection');
  const hi = makeDetection('qr_code', 'hi', { kind: 'text' }, { raw: 'aGk=' });
  assert.equal(describe(hi).bytes, '68 69', 'raw aGk=');
  assert.equal(describe(hi).complete, true, 'utf8 is complete');
  const raw = Buffer.from([0x61, 0x62, 0xFF]).toString('base64');
  const lossy = makeDetection('qr_code', 'ab�', { kind: 'text' }, { raw, charset: 'unknown' });
  const readout = describe(lossy);
  assert.equal(readout.complete, false, 'unknown charset: complete false');
  assert.equal(readout.charset, 'unknown', 'charset passed through');
  assert.equal(readout.bytes, '61 62 FF', 'uppercase hex pairs');
  assert.equal(readout.text, 'ab�', 'text unchanged');
  assert.deepEqual(readout.candidate, exportOf('destination', 'destinationCandidate')(lossy),
    'lossy candidate');
  assert.equal(describe(makeDetection('qr_code', '', { kind: 'text' })).bytes, '', 'no bytes');
  for (const charset of ['shift_jis', 'latin1', 'gb18030', 'eci', 'future_charset']) {
    const other = makeDetection('qr_code', 'x', { kind: 'text' }, { charset });
    assert.equal(describe(other).complete, true, `${charset} is complete`);
  }
});

test('U12 describeDetection passes eci and fnc1 through', () => {
  const describe = api('describeDetection');
  const withContent = content => makeDetection('qr_code', 'x', { kind: 'text' }, content);
  assert.equal(describe(withContent({})).eci, null, 'no eci key: null');
  assert.deepEqual(describe(withContent({ eci: [] })).eci, [], 'eci [] stays []');
  const located = [{ designator: 26, start: 0 }, { designator: 3, start: 5 }];
  assert.deepEqual(describe(withContent({ eci: located })).eci, located, 'located designators');
  assert.equal(describe(withContent({})).fnc1, null, 'no fnc1 key: null');
  assert.equal(describe(withContent({ fnc1: 'first' })).fnc1, 'first', 'fnc1 first');
  assert.equal(describe(withContent({ fnc1: 'second' })).fnc1, 'second', 'fnc1 second');
});

test('U12 an unknown kind reads Text; an unknown symbology reads its wire id', () => {
  const describe = api('describeDetection');
  const future = describe(makeDetection('qr_code', 'opaque', { kind: 'future_kind', extra: 1 }));
  assert.equal(future.kind, 'future_kind', 'wire kind kept');
  assert.equal(future.kindLabel, 'Text', 'unknown kind labeled Text');
  for (const [id, label, family] of SYMBOLOGIES.concat([['future_code', 'future_code', null],
    ['constructor', 'constructor', null]])) {
    const readout = describe(makeDetection(id, 'X', { kind: 'text' }));
    assert.equal(readout.symbologyLabel, label, `${id}: label`);
    assert.equal(readout.family, family, `${id}: family`);
    assert.equal(readout.familyLabel, family === null ? null : FAMILY_LABELS[family],
      `${id}: familyLabel`);
  }
});

// ----------------------------------------------------------------------------- U13 labels

// String leaves; records listed here must have exactly these keys.
const ENGLISH = {
  targets: 'Detected codes', choose: 'Choose a detected code', earlier: 'Earlier',
  readout: 'Decoded content', none: 'No code selected', previous: 'Previous code',
  next: 'Next code', more: 'More', less: 'Less',
  states: { inView: 'In view', readNow: 'Read now', lost: 'Lost', notRecent: 'Not read recently' },
  geometry: { segment: 'Scan line only', partial: 'Partial position',
    none: 'Position not measured', offscreen: 'Outside the visible area' },
  symbologies: Object.fromEntries(SYMBOLOGIES.map(([id, label]) => [id, label])),
  families: FAMILY_LABELS,
  kinds: { url: 'URL', wifi: 'Wi-Fi', email: 'Email', sms: 'SMS', tel: 'Phone number',
    v_card: 'Contact (vCard)', text: 'Text', geo: 'Location', gs1: 'GS1 element string',
    gs1_digital_link: 'GS1 Digital Link', me_card: 'Contact (MeCard)', crypto: 'Crypto payment',
    v_event: 'Calendar event (vEvent)' },
  parsedFields: 'Parsed fields', yes: 'Yes', no: 'No', unknown: 'Unknown',
  incomplete: 'No verified text reading. The exact bytes are in Details.',
  incompleteEci: 'No verified text reading: an ECI was declared but not located. The exact ' +
    'bytes are in Details.',
  charset: 'Character set', bytes: 'Bytes', eci: 'ECI', eciUnlocated: 'Declared, not located',
  fnc1: 'FNC1', fnc1Positions: { first: 'First position', second: 'Second position' },
  copy: 'Copy', copyBytes: 'Copy bytes', copied: 'Copied', copyFailed: 'Copy failed',
  details: 'Details', open: 'Open link', encodedUrl: 'Encoded URL', host: 'Host',
  conformant: 'Meets the checked GS1 rules', issues: 'GS1 issues',
  saturated: 'More codes in view than can be tracked',
  saturatedOccurrences: 'Some copies of the same content may be merged or missing',
};
// labels.fields is an open record: only these keys are checked.
const ENGLISH_FIELDS = { url: 'URL', ssid: 'Network name', security: 'Security',
  password: 'Password', hidden: 'Hidden network', to: 'To', subject: 'Subject', body: 'Message',
  number: 'Number', lat: 'Latitude', lon: 'Longitude', name: 'Name', tel: 'Phone',
  email: 'Email', scheme: 'Scheme', address: 'Address', amount: 'Amount', gtin: 'GTIN' };
const ENGLISH_DESTINATION = {
  heading: 'Destination', requestUrl: 'Requested URL',
  sources: { me_card: 'Contact website', gs1_digital_link: 'GS1 Digital Link' },
  ineligible: { lossy_text: 'The URL is not an exact reading',
    not_http: 'Not an HTTP or HTTPS address',
    control_or_space: 'Contains spaces or control characters',
    invalid_url: 'Not a valid URL', credentials: 'Contains a user name or password',
    too_long: 'Too long to check' },
  unverified: 'Destination not checked', queued: 'Waiting (no request sent)',
  resolving: 'Checking…', observed: 'Destination observed',
  example: 'Example result (simulated)', failed: 'Check failed', canceled: 'Check canceled',
  unavailable: 'Check unavailable', providerError: 'Destination checks unavailable',
  reasons: {
    timeout: 'Timed out', too_many_redirects: 'Too many redirects', redirect_loop: 'Redirect loop',
    invalid_location: 'Invalid redirect location', blocked_scheme: 'Redirect to a refused scheme',
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
  redirects: 'Redirects', invalidLocation: 'Invalid or hidden Location', detail: 'Detail',
  provenance: { fixture: 'Local fixture', simulated: 'Simulated' },
  request: { none: 'No request sent', maybe: 'A request may have been sent',
    response: 'The browser received a response', sent: 'A request was sent' },
  check: 'Check destination', checkAgain: 'Check again', cancel: 'Cancel check',
};

function assertLeaves(actual, expected, path) {
  assert.ok(actual !== null && typeof actual === 'object', `${path} is a record`);
  for (const [key, value] of Object.entries(expected)) {
    if (value !== null && typeof value === 'object') {
      assert.ok(actual[key] !== null && typeof actual[key] === 'object',
        `${path}.${key} is a record`);
      assert.deepEqual(Object.keys(actual[key]).sort(), Object.keys(value).sort(),
        `${path}.${key} keys`);
      assertLeaves(actual[key], value, `${path}.${key}`);
    } else {
      assert.equal(actual[key], value, `${path}.${key}`);
    }
  }
}

test('U13 DEFAULT_LABELS is deeply frozen', () => {
  const labels = api('DEFAULT_LABELS');
  const unfrozen = [];
  (function walk(value, path) {
    if (value === null || typeof value !== 'object') return;
    if (!Object.isFrozen(value)) unfrozen.push(path);
    for (const key of Reflect.ownKeys(value)) walk(value[key], `${path}.${String(key)}`);
  })(labels, 'DEFAULT_LABELS');
  assert.deepEqual(unfrozen, [], 'every nested record is frozen');
  assert.throws(() => { labels.targets = 'x'; }, TypeError, 'depth 1');
  assert.throws(() => { labels.states.lost = 'x'; }, TypeError, 'depth 2');
  assert.throws(() => { labels.destination.reasons.timeout = 'x'; }, TypeError, 'depth 3');
  assert.throws(() => { labels.destination.sources.extra = 'x'; }, TypeError, 'no new key');
  assert.equal(labels.destination.reasons.timeout, 'Timed out', 'value unchanged');
});

test('U13 DEFAULT_LABELS carries the English strings', () => {
  const labels = api('DEFAULT_LABELS');
  assertLeaves(labels, ENGLISH, 'DEFAULT_LABELS');
  assert.ok(labels.fields !== null && typeof labels.fields === 'object', 'fields is a record');
  for (const [key, value] of Object.entries(ENGLISH_FIELDS)) {
    assert.equal(labels.fields[key], value, `DEFAULT_LABELS.fields.${key}`);
  }
  assertLeaves(labels.destination, ENGLISH_DESTINATION, 'DEFAULT_LABELS.destination');
});

test('U13 DEFAULT_LABELS functions give the English text', () => {
  const labels = api('DEFAULT_LABELS');
  const track = deepFreeze({ id: 'track-1', slot: 0 });
  const empty = { target: null, symbology: null, kind: null, state: null, preview: null };
  const checks = [
    [labels.target(track, 0), 'Code 1'], [labels.target(track, 15), 'Code 16'],
    [labels.position('Code 2', 2, 3), 'Code 2 · 2 of 3'],
    [labels.stillReadAs(['Code 1', 'Code 3']), 'Still read as Code 1, Code 3'],
    [labels.sameContentAs(['Code 2']), 'Same content as Code 2'],
    [labels.eciAt(26, 0), 'ECI 26 at byte 0'],
    [labels.character('TAB', 9), 'TAB (U+0009)'],
    [labels.character('U+E0041', 0xE0041), 'U+E0041 (U+E0041)'],
    [labels.count(0), 'No codes detected'], [labels.count(1), '1 code detected'],
    [labels.count(3), '3 codes detected'],
    [labels.announce(empty), 'No code selected'],
    [labels.announce({ ...empty, target: 'Code 1', symbology: 'QR Code', kind: 'URL',
      state: 'In view' }), 'Code 1, QR Code, URL, In view'],
    [labels.announce({ ...empty, target: 'Code 2', symbology: 'Code 128', kind: 'Text',
      preview: 'STOCK-4827' }), 'Code 2, Code 128, Text, STOCK-4827'],
    [labels.destination.httpStatus(301), 'HTTP 301'],
    [labels.destination.hops(2, false), '2 followed'],
    [labels.destination.hops(2, true), '2 followed, 1 not followed'],
    [labels.destination.hopsUnknown(true), 'unknown (at least one)'],
    [labels.destination.hopsUnknown(false), 'unknown'],
    [labels.destination.refusedScheme('javascript'), 'scheme javascript refused'],
    [labels.destination.observedAt('10:42:07', 35), 'Observed at 10:42:07 · 35 ms'],
    [labels.destination.exampleAt('10:42:07', 35),
      'Example prepared at 10:42:07 · simulated latency 35 ms'],
    [labels.destination.endedAt('10:42:07'), 'Finished at 10:42:07'],
  ];
  checks.forEach(([actual, expected], index) => assert.equal(actual, expected, `check ${index}`));
});

test('U13 destination labels claim no safety and a simulated result no observation', () => {
  const destination = api('DEFAULT_LABELS').destination;
  const texts = [];
  (function collect(value) {
    if (typeof value === 'string') texts.push(value);
    else if (value !== null && typeof value === 'object') Object.values(value).forEach(collect);
  })(destination);
  texts.push(destination.hops(1, true), destination.hopsUnknown(true),
    destination.refusedScheme('ftp'), destination.observedAt('t', 1),
    destination.endedAt('t'), destination.httpStatus(200));
  for (const text of texts) {
    assert.doesNotMatch(text, /\b(safe|secure|trusted|verified)\b/i, text);
  }
  for (const text of [destination.example, destination.exampleAt('t', 1),
    destination.provenance.simulated]) {
    assert.doesNotMatch(text, /observed|checked|resolved/i, text);
  }
});

test('U13 overrides merge key by key at depths 1 and 2', () => {
  const describe = api('describeDetection');
  const yes = describe(WIFI, deepFreeze({ yes: 'Oui' }));
  assert.deepEqual(fieldsOf(yes), [['ssid', 'Network name', 'Home Net'],
    ['security', 'Security', 'WPA'], ['password', 'Password', 's3cret'],
    ['hidden', 'Hidden network', 'Oui']], 'a string override replaces one label');
  const ssid = describe(WIFI, deepFreeze({ fields: { ssid: 'SSID' } }));
  assert.deepEqual(fieldsOf(ssid).map(([, label]) => label),
    ['SSID', 'Security', 'Password', 'Hidden network'], 'fields merge key by key');
  const qr = makeDetection('qr_code', 'X', { kind: 'text' });
  const ean = makeDetection('ean13', '4006381333931', { kind: 'text' });
  const symbologies = deepFreeze({ symbologies: { qr_code: 'QR' } });
  assert.equal(describe(qr, symbologies).symbologyLabel, 'QR', 'overridden symbology');
  assert.equal(describe(ean, symbologies).symbologyLabel, 'EAN-13', 'other symbologies kept');
  const kinds = deepFreeze({ kinds: { text: 'Plain text' } });
  assert.equal(describe(qr, kinds).kindLabel, 'Plain text', 'overridden kind');
  assert.equal(describe(WIFI, kinds).kindLabel, 'Wi-Fi', 'other kinds kept');
  assert.equal(api('DEFAULT_LABELS').kinds.text, 'Text', 'DEFAULT_LABELS untouched');
});

// The rendered destination slot shows these overrides (U40); here they only merge.
test('U13 a depth-3 override alone and function overrides leave DEFAULT_LABELS unchanged', () => {
  const describe = api('describeDetection');
  const timeoutOnly = deepFreeze({ destination: { reasons: { timeout: 'Délai dépassé' } } });
  const functions = deepFreeze({
    target: (_track, slot) => `Cible ${slot + 1}`,
    character: (name, codePoint) => `${name} ${codePoint}`,
    eciAt: (designator, start) => `ECI ${designator} à l’octet ${start}`,
    destination: { hops: followed => `${followed} suivie(s)` },
  });
  for (const { detection } of KIND_CASES) {
    for (const [name, overrides] of [['depth 3', timeoutOnly], ['functions', functions]]) {
      assert.doesNotThrow(() => describe(detection, overrides),
        `${detection.payload.kind}: frozen ${name} overrides merge`);
    }
  }
  const labels = api('DEFAULT_LABELS');
  assert.equal(labels.destination.reasons.timeout, 'Timed out', 'default reason untouched');
  assert.equal(labels.destination.reasons.dns_error, 'Name not found', 'sibling reason kept');
  assert.equal(labels.destination.hops(2, false), '2 followed', 'default hops untouched');
  assert.equal(labels.target(deepFreeze({ id: 'track-1', slot: 0 }), 0), 'Code 1',
    'default function untouched');
});

// A French label table, without its destination subtree (owned by destination.js).
const LABELS_FR = deepFreeze({
  targets: 'Codes détectés', choose: 'Choisir un code détecté',
  target: (_track, slot) => `Code ${slot + 1}`, earlier: 'Précédents',
  readout: 'Contenu décodé', none: 'Aucun code sélectionné',
  position: (name, i, n) => `${name} · ${i} sur ${n}`,
  previous: 'Code précédent', next: 'Code suivant', more: 'Plus', less: 'Moins',
  states: { inView: 'Dans le champ', readNow: 'Lu maintenant', lost: 'Perdu',
    notRecent: 'Pas lu récemment' },
  stillReadAs: t => `Toujours lu comme ${t.join(', ')}`,
  sameContentAs: t => `Même contenu que ${t.join(', ')}`,
  geometry: { segment: 'Ligne de lecture seulement', partial: 'Position partielle',
    none: 'Position non mesurée', offscreen: 'Hors de la zone visible' },
  families: { matrix: 'Code matriciel 2D', stacked: 'Code empilé 2D',
    linear: 'Code-barres 1D' },
  kinds: { url: 'URL', wifi: 'Wi-Fi', email: 'E-mail', sms: 'SMS',
    tel: 'Numéro de téléphone', v_card: 'Contact (vCard)', text: 'Texte',
    geo: 'Position', gs1: 'Chaîne d’éléments GS1',
    gs1_digital_link: 'GS1 Digital Link', me_card: 'Contact (MeCard)',
    crypto: 'Paiement crypto', v_event: 'Événement (vEvent)' },
  fields: { url: 'URL', ssid: 'Nom du réseau', security: 'Sécurité',
    password: 'Mot de passe', hidden: 'Réseau masqué', to: 'Destinataire',
    subject: 'Objet', body: 'Message', number: 'Numéro', lat: 'Latitude',
    lon: 'Longitude', name: 'Nom', tel: 'Téléphone', email: 'E-mail',
    scheme: 'Schéma', address: 'Adresse', amount: 'Montant', gtin: 'GTIN' },
  parsedFields: 'Champs analysés', yes: 'Oui', no: 'Non', unknown: 'Inconnu',
  incomplete: 'Aucune lecture textuelle vérifiée. Les octets exacts sont dans ' +
    'Détails.',
  incompleteEci: 'Aucune lecture textuelle vérifiée : un ECI est déclaré ' +
    'mais non localisé. Les octets exacts sont dans Détails.',
  charset: 'Jeu de caractères', bytes: 'Octets', eci: 'ECI',
  eciUnlocated: 'Déclaré, non localisé',
  eciAt: (d, s) => `ECI ${d} à l’octet ${s}`,
  fnc1: 'FNC1', fnc1Positions: { first: 'Première position', second: 'Deuxième position' },
  character: (name, cp) => `${name} (U+${cp.toString(16).toUpperCase().padStart(4, '0')})`,
  copy: 'Copier', copyBytes: 'Copier les octets', copied: 'Copié',
  copyFailed: 'Échec de la copie', details: 'Détails', open: 'Ouvrir le lien',
  encodedUrl: 'URL encodée', host: 'Hôte',
  conformant: 'Conforme aux règles GS1 vérifiées', issues: 'Problèmes GS1',
  saturated: 'Plus de codes visibles que le suivi n’en accepte',
  saturatedOccurrences: 'Des copies du même contenu peuvent être fusionnées ou ' +
    'manquantes',
  count: n => (n === 0 ? 'Aucun code détecté'
    : n === 1 ? '1 code détecté' : `${n} codes détectés`),
  announce: e => (e.target === null ? 'Aucun code sélectionné'
    : [e.target, e.symbology, e.kind, e.state, e.preview].filter(Boolean).join(', ')),
});

test('U13 the French families example changes familyLabel', () => {
  const describe = api('describeDetection');
  const families = deepFreeze({ families: LABELS_FR.families });
  const cases = [['qr_code', 'Code matriciel 2D'], ['aztec', 'Code matriciel 2D'],
    ['pdf417', 'Code empilé 2D'], ['code128', 'Code-barres 1D'], ['ean13', 'Code-barres 1D'],
    ['data_bar', null], ['data_bar_expanded', null], ['future_code', null]];
  for (const [id, familyLabel] of cases) {
    const readout = describe(makeDetection(id, 'X', { kind: 'text' }), families);
    assert.equal(readout.familyLabel, familyLabel, `${id} familyLabel`);
    assert.equal(readout.symbologyLabel, id === 'future_code' ? 'future_code'
      : SYMBOLOGIES.find(([known]) => known === id)[1], `${id} symbologyLabel unchanged`);
  }
});

test('U13 a French label table relabels kinds, fields and yes/no, not symbologies', () => {
  const describe = api('describeDetection');
  const wifi = describe(WIFI, LABELS_FR);
  assert.equal(wifi.symbologyLabel, 'QR Code', 'symbology labels stay identical');
  assert.equal(wifi.familyLabel, 'Code matriciel 2D', 'family');
  assert.equal(wifi.kindLabel, 'Wi-Fi', 'kind');
  assert.deepEqual(fieldsOf(wifi), [['ssid', 'Nom du réseau', 'Home Net'],
    ['security', 'Sécurité', 'WPA'], ['password', 'Mot de passe', 's3cret'],
    ['hidden', 'Réseau masqué', 'Oui']], 'fields');
  assert.equal(describe(KIND_CASES[12].detection, LABELS_FR).kindLabel, 'Texte', 'text kind');
  assert.equal(describe(KIND_CASES[12].detection, LABELS_FR).familyLabel, 'Code-barres 1D',
    'Code 128 family');
  const me = describe(ME_CARD, LABELS_FR);
  assert.equal(me.kindLabel, 'Contact (MeCard)', 'me_card kind');
  assert.deepEqual(fieldsOf(me).map(([, label]) => label), ['Nom', 'Téléphone', 'URL'],
    'me_card fields');
  const future = makeDetection('qr_code', 'x', { kind: 'future_kind' });
  assert.equal(describe(future, LABELS_FR).kindLabel, 'Texte',
    'an unknown kind reads the French text label');
});

// ------------------------------------------------------------------------- U14 import

// Source without comments, plus coarse tokens; strings, templates and regexes stay verbatim.
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete',
  'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
function lexSource(source) {
  const tokens = [];
  const substitutions = [];
  let code = '';
  let depth = 0;
  let i = 0;
  const regexAllowed = () => {
    const last = tokens[tokens.length - 1];
    if (last === undefined) return true;
    if (last.type === 'word') return REGEX_AFTER_WORD.has(last.value);
    if (last.type === 'punct') return last.value !== ')' && last.value !== ']';
    return last.type === 'template' && last.value.endsWith('${');
  };
  const emit = (type, end) => {
    tokens.push({ type, value: source.slice(i, end) });
    code += source.slice(i, end);
    i = end;
  };
  // From a backtick or a substitution's closing brace to the next backtick or '${'.
  const templatePart = () => {
    let j = i + 1;
    const ends = k => source[k] === '`' || (source[k] === '$' && source[k + 1] === '{');
    while (j < source.length && !ends(j)) j += source[j] === '\\' ? 2 : 1;
    assert.ok(j < source.length, 'lexer: unterminated template literal');
    const open = source[j] === '$';
    emit('template', j + (open ? 2 : 1));
    if (open) {
      substitutions.push(depth);
      depth += 1;
    }
  };
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      i = end < 0 ? source.length : end;
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      assert.ok(end >= 0, 'lexer: unterminated comment');
      code += ' ';
      i = end + 2;
    } else if (ch === '\'' || ch === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) j += source[j] === '\\' ? 2 : 1;
      tokens.push({ type: 'string', value: source.slice(i + 1, j) });
      code += source.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '`') {
      templatePart();
    } else if (ch === '}' && substitutions.length > 0 &&
      substitutions[substitutions.length - 1] === depth - 1) {
      substitutions.pop();
      depth -= 1;
      templatePart();
    } else if (ch === '/' && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== '\n' && (inClass || source[j] !== '/')) {
        if (source[j] === '\\') j += 1;
        else if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        j += 1;
      }
      if (source[j] === '/') {
        j += 1;
        while (/[a-z]/.test(source[j] || '')) j += 1;
        emit('regex', j);
      } else {
        emit('punct', i + 1);
      }
    } else if (/[A-Za-z_$]/.test(ch)) {
      emit('word', i + /^[\w$]+/.exec(source.slice(i, i + 256))[0].length);
    } else if (/\d/.test(ch) || (ch === '.' && /\d/.test(next || ''))) {
      emit('number', i + /^(?:0[xXbBoO][\da-fA-F_]+|[\d._]+(?:[eE][+-]?\d+)?)n?/
        .exec(source.slice(i, i + 256))[0].length);
    } else if (/\s/.test(ch)) {
      code += ch;
      i += 1;
    } else {
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      emit('punct', i + 1);
    }
  }
  assert.equal(substitutions.length, 0, 'lexer: unterminated template substitution');
  return { code, tokens };
}

// Static imports and re-exports with their imported names; dynamic imports and require().
function importsOf(tokens) {
  const statements = [];
  const dynamic = [];
  const at = index => tokens[index] || { type: 'end', value: '' };
  const is = (index, type, value) => at(index).type === type && at(index).value === value;
  tokens.forEach((token, index) => {
    if (token.type !== 'word' || is(index - 1, 'punct', '.')) return;
    if (token.value === 'require' && is(index + 1, 'punct', '(')) dynamic.push('require()');
    if (token.value === 'import' && is(index + 1, 'punct', '(')) dynamic.push('import()');
    if (token.value !== 'import' && token.value !== 'export') return;
    if (token.value === 'import' && at(index + 1).type === 'string') {
      statements.push({ specifier: at(index + 1).value, names: [] });
      return;
    }
    // An import clause starts with a binding, '*' or '{'; a re-export with '*' or '{'.
    const clause = is(index + 1, 'punct', '{') || is(index + 1, 'punct', '*') ||
      (token.value === 'import' && at(index + 1).type === 'word');
    if (!clause) return;
    const names = [];
    let j = index + 1;
    if (token.value === 'import' && at(j).type === 'word' && at(j).value !== 'from') {
      names.push('default');
      j += is(j + 1, 'punct', ',') ? 2 : 1;
    }
    if (is(j, 'punct', '*')) {
      names.push('*');
      j += is(j + 1, 'word', 'as') ? 3 : 1;
    } else if (is(j, 'punct', '{')) {
      j += 1;
      while (j < tokens.length && !is(j, 'punct', '}')) {
        if (at(j).type === 'word' || at(j).type === 'string') names.push(at(j).value);
        j += is(j + 1, 'word', 'as') ? 3 : 1;
        if (is(j, 'punct', ',')) j += 1;
      }
      j += 1;
    }
    if (is(j, 'word', 'from') && at(j + 1).type === 'string') {
      statements.push({ specifier: at(j + 1).value, names });
    } else if (token.value === 'import') {
      statements.push({ specifier: null, names, unread: tokens.slice(index, j + 2) });
    }
  });
  return { statements, dynamic };
}

// Runs in a child Node process, which has no DOM globals. No template substitution inside.
const IMPORT_PROBE = `
const builtins = { Object, Array, String, Number, Boolean, Function, RegExp, Promise, Map, Set,
  WeakMap, Symbol, Error, Date, Math, JSON, Reflect, Intl };
const keysOf = value => Reflect.ownKeys(value).map(String).sort().join(',');
const shape = () => Object.entries(builtins).map(([name, value]) => name + ':' + keysOf(value) +
  '|' + (typeof value === 'function' && value.prototype ? keysOf(value.prototype) : ''));
const globals = () => Reflect.ownKeys(globalThis).map(String);
const dom = ['window', 'document', 'HTMLElement', 'requestAnimationFrame', 'ResizeObserver',
  'MutationObserver', 'getComputedStyle', 'CSS'].filter(name => globalThis[name] !== undefined);
// Stdio streams open lazily (a warning opens stderr): open both before the first sample.
void [process.stdout.fd, process.stderr.fd];
const before ={ globals: globals(), shape: shape(), resources: process.getActiveResourcesInfo() };
let error = null;
let exported = [];
try {
  const namespace = await import(process.env.QRSCAN_IMPORT_PROBE);
  exported = Object.keys(namespace).sort().map(name => [name, typeof namespace[name]]);
} catch (caught) {
  error = String((caught && caught.stack) || caught);
}
const after = { globals: globals(), shape: shape(), resources: process.getActiveResourcesInfo() };
const result = { dom, error, exported,
  added: after.globals.filter(name => !before.globals.includes(name)),
  removed: before.globals.filter(name => !after.globals.includes(name)),
  changed: after.shape.filter((entry, index) => entry !== before.shape[index]),
  resourcesBefore: before.resources, resourcesAfter: after.resources };
process.stdout.write(JSON.stringify(result) + '\\n', () => process.exit(0));
`;
let probeResult = null;
function probeImport() {
  if (probeResult === null) {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', IMPORT_PROBE], {
      env: { ...process.env, QRSCAN_IMPORT_PROBE: OVERLAY_URL.href },
      encoding: 'utf8', timeout: 60000,
    });
    const line = (child.stdout || '').trim().split('\n').pop();
    assert.ok(line, `the import probe reported (status ${child.status}): ${child.stderr}`);
    probeResult = JSON.parse(line);
  }
  return probeResult;
}

test('U14 importing camera-overlay.js without DOM globals throws nothing and defines no global',
  () => {
    const result = probeImport();
    assert.deepEqual(result.dom, [], 'the child process has no DOM globals');
    assert.equal(result.error, null, 'the import throws nothing');
    assert.deepEqual(result.added, [], 'no global defined');
    assert.deepEqual(result.removed, [], 'no global removed');
    assert.deepEqual(result.changed, [], 'no built-in or prototype changed');
    assert.deepEqual(result.resourcesAfter, result.resourcesBefore,
      'no timer or handle started at import');
  });

test('U14 the import exposes exactly the declared exports', () => {
  const result = probeImport();
  assert.equal(result.error, null, 'the import throws nothing');
  const functions = ['createCameraOverlay', 'describeDetection', 'overlayMediaRect',
    'parseObjectPosition', 'projectOverlayGeometry', 'projectOverlayPoint', 'quadOutline',
    'quadRegion', 'segmentText', 'symbologyFamily'].map(name => [name, 'function']);
  const expected = functions.concat([['CAMERA_OVERLAY_CSS', 'string'],
    ['DEFAULT_LABELS', 'object'], ['TRACK_COLORS', 'object']])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(result.exported, expected);
});

test('U14 the source imports only ./camera.js and ./destination.js at runtime', async () => {
  const { tokens } = lexSource(await readFile(OVERLAY_URL, 'utf8'));
  const { statements, dynamic } = importsOf(tokens);
  const unread = statements.filter(statement => statement.specifier === null)
    .map(statement => statement.unread.map(token => token.value).join(' '));
  assert.deepEqual(unread, [], 'every import statement is readable');
  const specifiers = [...new Set(statements.map(statement => statement.specifier))].sort();
  const extra = specifiers.filter(specifier => specifier !== './camera.js' &&
    specifier !== './destination.js');
  assert.deepEqual(extra, [], `only ./camera.js and ./destination.js (found ${specifiers})`);
  assert.deepEqual(dynamic, [], 'no dynamic import() or require()');
});

test('U14 the runtime imports are projectVideoGeometry and destinationCandidate', async () => {
  const { tokens } = lexSource(await readFile(OVERLAY_URL, 'utf8'));
  const { statements } = importsOf(tokens);
  const namesFrom = specifier => statements.filter(statement => statement.specifier === specifier)
    .flatMap(statement => statement.names).sort();
  assert.deepEqual(namesFrom('./camera.js'), ['projectVideoGeometry'], './camera.js');
  assert.deepEqual(namesFrom('./destination.js'), ['destinationCandidate'], './destination.js');
});

const FORBIDDEN_SYNTAX = ['??=', '||=', '&&=', '.at(', 'replaceAll', 'Object.hasOwn',
  'structuredClone', 'findLast', '(?<'];

test('U14 the source has none of the forbidden post-ES2020 forms', async () => {
  const { code } = lexSource(await readFile(OVERLAY_URL, 'utf8'));
  const found = FORBIDDEN_SYNTAX.filter(form => code.includes(form));
  assert.deepEqual(found, [], 'forbidden forms outside comments');
});

test('U14 CAMERA_OVERLAY_CSS has no @import, url( or @layer', () => {
  const css = api('CAMERA_OVERLAY_CSS');
  assert.equal(typeof css, 'string', 'the stylesheet is a string');
  assert.ok(css.includes(':where([data-qr-camera-overlay])'), 'the S selector is expanded (3.4)');
  for (const pattern of [/@import/i, /url\(/i, /@layer/i]) {
    assert.doesNotMatch(css, pattern, `no ${pattern.source.replace('\\', '')}`);
  }
});

// Color, relative luminance, contrast with black.
const PALETTE_71 = [['#4DA3FF', '0.350', '8.00'], ['#FF6A1A', '0.316', '7.33'],
  ['#FFD43B', '0.687', '14.73'], ['#22E5F0', '0.627', '13.53'], ['#FF8FA3', '0.435', '9.71'],
  ['#C77DBF', '0.306', '7.11'], ['#A8EB8E', '0.697', '14.94'], ['#C1BE37', '0.484', '10.69']];
function relativeLuminance(hex) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  assert.ok(match, `${hex} is #RRGGBB`);
  const [r, g, b] = match.slice(1).map(part => {
    const channel = parseInt(part, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('U14 TRACK_COLORS is the track palette and each color reaches 7:1 against black', () => {
  const colors = api('TRACK_COLORS');
  assert.ok(Array.isArray(colors), 'TRACK_COLORS is an array');
  assert.equal(colors.length, 8, 'eight colors');
  colors.forEach((color, index) => {
    const [hex, luminance, contrast] = PALETTE_71[index];
    assert.equal(String(color).toUpperCase(), hex, `color ${index}`);
    const value = relativeLuminance(String(color));
    const ratio = (value + 0.05) / 0.05;
    assert.ok(ratio >= 7, `color ${index} ${color}: ${ratio.toFixed(2)}:1 against black`);
    assert.equal(value.toFixed(3), luminance, `color ${index} luminance (7.1)`);
    assert.equal(ratio.toFixed(2), contrast, `color ${index} contrast (7.1)`);
  });
});
