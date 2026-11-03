import assert from 'node:assert/strict';
const { createDetectionTracker, createCameraScanner, CameraScannerError, projectVideoPoint,
  projectVideoGeometry, contentKey } =
  await import(process.env.QRSCAN_CAMERA_MODULE ?? './camera.js');

// Tracker fixtures: 1000 x 1000 frames, epoch 1 and complete traces unless noted.
const COMPLETE = { budget_exhausted: false,
  saturation: { reads: false, detections: false, occurrences: false } };
const report = (...detections) => ({ detections, trace: COMPLETE });
const sq = (x, y, s = 100) => [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
const quad = points => ({ geometry: { kind: 'quad', points, reader: 'rxing' } });
const segment = (p0, p1) => ({ geometry: { kind: 'segment', points: [p0, p1], reader: 'rxing' } });
const code = (raw, occurrences, { symbology = 'qr_code', eci } = {}) => ({ symbology,
  content: eci === undefined ? { raw, text: raw, charset: 'utf8' }
    : { raw, text: raw, charset: 'utf8', eci },
  occurrences });
const frameAt = (observedAt, width = 1000, height = 1000) =>
  ({ width, height, observedAt, epoch: 1 });
// Processing time equals evidence time unless a case says otherwise.
const feed = (tracker, input, frame, options) =>
  tracker.update(input, frame, { now: frame.observedAt, ...options });
const ids = list => list.map(item => item.id);
const near = (actual, expected, tolerance = 5e-7) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
const entered = (trackId, at, cause = 'new') => ({ type: 'entered', trackId, at, cause });
const ambiguous = (trackId, at, successors) =>
  ({ type: 'expired', trackId, at, reason: 'ambiguous', successors });
// A pipeline-4 detection: content and corners only (corners is never read as a position).
const make = (x, y, size = 10) => ({ symbology: 'qr_code',
  content: { raw: 'U0FNRQ==', text: 'SAME' },
  corners: [{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }] });

// T27 (tracker rows; the controller row follows them)
assert.throws(() => createDetectionTracker({ holdMs: 700 }), error => error instanceof TypeError &&
  /staleMs/.test(error.message) && /reacquireMs/.test(error.message));
{
  const tracker = createDetectionTracker();
  assert.throws(() => tracker.update([], { width: 100, height: 100, timestamp: 0 }),
    error => error instanceof TypeError && /observedAt/.test(error.message));
  assert.throws(() => tracker.update(report(), frameAt(0), 5),
    error => error instanceof TypeError && /\{ now \}/.test(error.message));
  assert.throws(() => feed(tracker, [], { ...frameAt(0), width: 0 }), RangeError);
}
for (const options of [{ smoothing: NaN }, { smoothing: { kind: 'fixed', alpha: 0 } },
  { reacquireMs: 1000 }, { maxResults: 8 }]) {
  assert.throws(() => createDetectionTracker(options), RangeError);
}
// T27, controller row: neither onResult nor tracker (the argument checks run before the video
// is touched; the controller section below covers the other rows).
assert.throws(() => createCameraScanner({ video: { ownerDocument: null }, scanFrame() {} }),
  error => error instanceof TypeError && /onResult or tracker/.test(error.message));

// T1
{
  const tracker = createDetectionTracker();
  const first = tracker.update([make(10, 10), make(60, 10)],
    { width: 100, height: 100, observedAt: 0 }, { now: 0 });
  assert.deepEqual(first.tracks.map(t => [t.id, t.basis, t.slot, t.geometry]),
    [['track-1', 'content', 0, null], ['track-2', 'content', 1, null]]);
  assert.deepEqual(first.results.map(r => [r.id, r.trackIds]),
    [['result-1', ['track-1', 'track-2']]]);
  assert.deepEqual(first.events, [entered('track-1', 0), entered('track-2', 0)]);
  assert.equal(first.nextDeadline, 1200);
  const again = tracker.update([make(10, 10), make(60, 10)],
    { width: 100, height: 100, observedAt: 100 }, { now: 100 });
  assert.deepEqual(again.events, []);
  assert.deepEqual(again.tracks.map(t => [t.id, t.state, t.lastSeenAt, t.misses]),
    [['track-1', 'tracked', 100, 0], ['track-2', 'tracked', 100, 0]]);
  assert.deepEqual(again.unassigned, []);
}

// T2
{
  const tracker = createDetectionTracker();
  const legacy = make(110, 110);
  let reads = 0;
  Object.defineProperty(legacy, 'corners', { enumerable: true,
    get() { reads++; throw new Error('corners must never be read'); } });
  const snap = feed(tracker, [legacy], { width: 100, height: 100, observedAt: 0 });
  assert.deepEqual(snap.tracks.map(t => [t.id, t.basis, t.geometry]),
    [['track-1', 'content', null]]);
  assert.equal(snap.tracks[0].detection, legacy);
  assert.equal(reads, 0);
}

// T3
{
  const tracker = createDetectionTracker();
  const snap = feed(tracker, report(code('U0FNRQ==', [quad(sq(10, 10, 10)), quad(sq(60, 10, 10))])),
    { width: 100, height: 100, observedAt: 0, epoch: 1 });
  const [left, right] = snap.tracks;
  assert.deepEqual([left.id, left.slot, left.basis, right.id, right.slot, right.basis],
    ['track-1', 0, 'spatial', 'track-2', 1, 'spatial']);
  const points = [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.1, y: 0.2 }];
  assert.deepEqual(left.geometry, { kind: 'quad', points, measured: points, observedAt: 0, age: 0,
    lag: 0, reader: 'rxing', downgrade: null, smoothed: false, restart: 'new', precise: true });
  assert.deepEqual(right.geometry.points[0], { x: 0.6, y: 0.1 });
  assert.deepEqual(snap.results.map(r => [r.id, r.trackIds]),
    [['result-1', ['track-1', 'track-2']]]);
}

// T3a
{
  const tracker = createDetectionTracker();
  const qr = points => code('U0FNRQ==', [quad(points)]);
  const bars = (x0, x1) => code('U0FNRQ==', [segment({ x: x0, y: 450 }, { x: x1, y: 450 })],
    { symbology: 'code128' });
  const qrKey = JSON.stringify(['qr_code', 'U0FNRQ==', null, false]);
  const barsKey = JSON.stringify(['code128', 'U0FNRQ==', null, false]);
  const first = feed(tracker, report(qr(sq(100, 400)), bars(600, 700)), frameAt(0));
  assert.deepEqual(first.tracks.map(t => [t.id, t.key, t.resultId]),
    [['track-1', qrKey, 'result-1'], ['track-2', barsKey, 'result-2']]);
  assert.deepEqual(first.results.map(r => [r.id, r.key, r.trackIds]),
    [['result-1', qrKey, ['track-1']], ['result-2', barsKey, ['track-2']]]);
  // Each content now sits exactly where the other one was: only the content gate refuses the match.
  const swapped = feed(tracker, report(qr(sq(600, 400)), bars(100, 200)), frameAt(100));
  assert.deepEqual(swapped.events, [entered('track-3', 100), entered('track-4', 100),
    { type: 'held', trackId: 'track-1', at: 100, reason: 'missed' },
    { type: 'held', trackId: 'track-2', at: 100, reason: 'missed' }]);
  assert.deepEqual(swapped.tracks.map(t => [t.id, t.key]),
    [['track-1', qrKey], ['track-2', barsKey], ['track-3', barsKey], ['track-4', qrKey]]);
  assert.deepEqual(swapped.results.map(r => r.trackIds),
    [['track-1', 'track-4'], ['track-2', 'track-3']]);
}

// T4
{
  const tracker = createDetectionTracker();
  const snap = feed(tracker, report(code('U0FNRQ==', [quad(sq(110, 110, 10))])),
    { width: 100, height: 100, observedAt: 0, epoch: 1 });
  assert.deepEqual(snap.dropped, [{ detectionIndex: 0, occurrenceIndex: 0, reason: 'outside' }]);
  assert.deepEqual(snap.tracks.map(t => [t.id, t.basis, t.geometry, t.observation]),
    [['track-1', 'content', null, { sequence: null, detectionIndex: 0, occurrenceIndex: 0 }]]);
}
// T3b (occurrences copied from spec/examples; frame sizes are the fixtures' from spec/README)
for (const [golden, width, height, detection, kind, first, precise] of [
  ['datamatrix.json', 240, 240, code('aHR0cHM6Ly9xcmNvZGUtYWkuY29tL2Rt', [quad([
    { x: 59.853554, y: 59.853554 }, { x: 180.28787, y: 59.71213 }, { x: 180.14645, y: 180.14645 },
    { x: 59.853554, y: 180.14645 }])], { symbology: 'data_matrix' }),
  'quad', [0.249390, 0.249390], true],
  ['ean13-retail-gtin.json', 320, 140, code('OTUwNjAwMDEzNDM1Mg==',
    [segment({ x: 21.5, y: 70.5 }, { x: 297.5, y: 70.5 })], { symbology: 'ean13' }),
  'segment', [0.0671875, 70.5 / 140], false],
  ['micro-qr.json', 210, 210, code('SEVMTE80Mg==', [quad(sq(30, 30, 150))],
    { symbology: 'micro_qr_code' }), 'quad', [0.142857, 0.142857], undefined],
  ['clean-url.json', 1024, 1024, code('aHR0cHM6Ly9xcmMtYWkuY29tLzc2eE1h', [quad([
    { x: 69.7292, y: 69.72679 }, { x: 945.9432, y: 69.26891 }, { x: 944.33417, y: 944.309 },
    { x: 69.804924, y: 945.65155 }])]), 'quad', [0.068095, 0.068093], undefined],
]) {
  const tracker = createDetectionTracker();
  const snap = feed(tracker, report(detection), frameAt(0, width, height));
  assert.deepEqual(snap.tracks.map(t => [t.id, t.basis, t.geometry.kind]),
    [['track-1', 'spatial', kind]], golden);
  const { geometry } = snap.tracks[0];
  near(geometry.measured[0].x, first[0]);
  near(geometry.measured[0].y, first[1]);
  assert.deepEqual(geometry.points, geometry.measured, golden);
  if (kind === 'segment') assert.deepEqual(geometry.measured[1], { x: 0.9296875, y: 70.5 / 140 });
  if (precise !== undefined) assert.equal(geometry.precise, precise, golden);
  assert.deepEqual(feed(tracker, report(), frameAt(100, width, height)).events,
    [{ type: 'held', trackId: 'track-1', at: 100, reason: 'missed' }], golden);
}

// T5
{
  const a = code('QQ==', [quad(sq(100, 400)), quad(sq(600, 400))]);
  const reversed = { ...a, occurrences: [...a.occurrences].reverse() };
  const b = code('Qg==', [quad(sq(350, 100))]);
  // Detections become their content key and ECI list; wire addresses are removed.
  const canonical = snapshot => JSON.parse(JSON.stringify(snapshot, (key, value) =>
    key === 'detection' ? [contentKey(value), value.content.eci ?? null]
      : ['observation', 'detectionIndex', 'occurrenceIndex'].includes(key) ? undefined : value));
  const one = createDetectionTracker(), two = createDetectionTracker();
  const inputs = [[[a, b], [reversed, b]], [[a, b], [b, a]], [[a, b], [reversed, b]]];
  inputs.forEach(([wire, other], k) => {
    const left = feed(one, report(...wire), frameAt(100 * k));
    const right = feed(two, report(...other), frameAt(100 * k));
    assert.deepEqual(canonical(right), canonical(left));
    assert.deepEqual(left.tracks.map(t => [t.id, t.slot, t.key, t.geometry.points[0]]), [
      ['track-1', 0, contentKey(b), { x: 0.35, y: 0.1 }],
      ['track-2', 1, contentKey(a), { x: 0.1, y: 0.4 }],
      ['track-3', 2, contentKey(a), { x: 0.6, y: 0.4 }]]);
  });
}

// T6
{
  const tracker = createDetectionTracker();
  const scene = [[100, 400], [150, 350], [200, 300], [250], [300, 200], [350, 150]];
  const snaps = scene.map((xs, k) =>
    feed(tracker, report(code('Q1JPU1M=', xs.map(x => quad(sq(x, 400))))), frameAt(100 * k)));
  assert.deepEqual(snaps[0].events, [entered('track-1', 0), entered('track-2', 0)]);
  assert.deepEqual(snaps[0].tracks.map(t => [t.id, t.slot]), [['track-1', 0], ['track-2', 1]]);
  assert.deepEqual([snaps[1].events, snaps[2].events], [[], []]);
  assert.deepEqual(ids(snaps[2].tracks), ['track-1', 'track-2']);
  assert.deepEqual(snaps[3].events, [ambiguous('track-1', 300, ['track-3']),
    ambiguous('track-2', 300, ['track-3']), entered('track-3', 300, 'split')]);
  assert.deepEqual(snaps[3].tracks.map(t => [t.id, t.slot]), [['track-3', 2]]);
  assert.deepEqual(snaps[4].events, [ambiguous('track-3', 400, ['track-4', 'track-5']),
    entered('track-4', 400, 'split'), entered('track-5', 400, 'split')]);
  assert.deepEqual(snaps[4].tracks.map(t => [t.id, t.slot, t.geometry.points[0].x]),
    [['track-4', 3, 0.2], ['track-5', 4, 0.3]]);
  assert.deepEqual(snaps[5].events, []);
  assert.deepEqual(ids(snaps[5].tracks), ['track-4', 'track-5']);
}

// T6a: across-axis cost 32g² (2.88, 8, 15.68, 32); moving 0.1 length per frame costs 0.96.
for (const g of [0.3, 0.5, 0.7, 1.0]) {
  const labels = (dx, dy, hidden = false) => report(code('U1RBQ0s=', [
    segment({ x: 100 + dx, y: 100 + dy }, { x: 500 + dx, y: 100 + dy }),
    ...(hidden ? [] : [segment({ x: 100 + dx, y: 100 + dy + 400 * g },
      { x: 500 + dx, y: 100 + dy + 400 * g })])], { symbology: 'code128' }));
  const frame = k => frameAt(100 * k, 1280, 720);
  const pair = [['track-1', 0], ['track-2', 1]];
  const quiet = (snap, label) =>
    assert.deepEqual([snap.events, snap.tracks.map(t => [t.id, t.slot])], [[], pair], label);
  let tracker = createDetectionTracker();
  assert.deepEqual(feed(tracker, labels(0, 0), frame(0)).tracks.map(t => [t.id, t.slot]), pair);
  for (let k = 1; k < 50; k++) quiet(feed(tracker, labels(0, 0), frame(k)), `g ${g} F${k}`);
  tracker = createDetectionTracker();
  feed(tracker, labels(0, 0), frame(0));
  for (let k = 1; k <= 5; k++) {
    quiet(feed(tracker, labels(40 * k, 40 * k), frame(k)), `g ${g} moving F${k}`);
  }
  tracker = createDetectionTracker();
  for (let k = 0; k < 10; k++) feed(tracker, labels(0, 0), frame(k));
  const hidden = feed(tracker, labels(0, 0, true), frame(10));
  if (g === 0.3) {
    assert.deepEqual(hidden.events, [ambiguous('track-1', 1000, ['track-3']),
      ambiguous('track-2', 1000, ['track-3']), entered('track-3', 1000, 'split')]);
  } else {
    assert.deepEqual(hidden.events,
      [{ type: 'held', trackId: 'track-2', at: 1000, reason: 'missed' }]);
  }
  const visible = g === 0.3 ? ['track-3', 2] : ['track-1', 0];
  for (let k = 11; k < 50; k++) {
    const snap = feed(tracker, labels(0, 0, true), frame(k));
    // No identity change after the hide. For g >= 0.5 the hidden label (seen last at 900) is
    // lost at its second complete miss and expires by frame at E = 900 + 2000 (lastSeenAt +
    // reacquireMs).
    const lost = { type: 'lost', trackId: 'track-2', at: 1100, reason: 'missed' };
    const hiddenLabel = k === 11 ? [lost]
      : k === 29 ? [{ type: 'expired', trackId: 'track-2', at: 2900, reason: 'timeout' }] : [];
    assert.deepEqual(snap.events, g === 0.3 ? [] : hiddenLabel, `g ${g} F${k}`);
    assert.deepEqual([snap.tracks[0].id, snap.tracks[0].slot], visible, `g ${g} F${k}`);
  }
}
const E26 = [{ designator: 26, start: 0 }], E3 = [{ designator: 3, start: 0 }];
const copy = (eci, x = 100, y = 400) => code('RUNJ', [quad(sq(x, y))], { eci });

// T17
{
  const tracker = createDetectionTracker();
  const links = snap => snap.tracks.map(t => [t.id, t.resultId]);
  const cards = snap => snap.results.map(r => [r.id, r.detection.content.eci, r.trackIds]);
  const f0 = feed(tracker, report(copy([])), frameAt(0));
  assert.deepEqual([links(f0), cards(f0)],
    [[['track-1', 'result-1']], [['result-1', [], ['track-1']]]]);
  const f100 = feed(tracker, report(copy(E26)), frameAt(100));
  assert.deepEqual([links(f100), cards(f100), f100.tracks[0].detection.content.eci],
    [[['track-1', 'result-1']], [['result-1', E26, ['track-1']]], E26]);
  const f200 = feed(tracker, report(copy([])), frameAt(200));
  assert.deepEqual([links(f200), cards(f200)],
    [[['track-1', 'result-1']], [['result-1', E26, ['track-1']]]]);
  const f300 = feed(tracker, report(copy(E26), copy(E3, 600)), frameAt(300));
  assert.deepEqual([links(f300), cards(f300)], [[['track-1', 'result-1'], ['track-2', 'result-2']],
    [['result-1', E26, ['track-1']], ['result-2', E3, ['track-2']]]]);
  const f400 = feed(tracker, report(copy([]), copy(E3, 600)), frameAt(400));
  assert.deepEqual([links(f400), cards(f400), f400.events],
    [[['track-1', 'result-1'], ['track-2', 'result-2']],
      [['result-1', E26, ['track-1']], ['result-2', E3, ['track-2']]], []]);
}

// T17a
{
  const tracker = createDetectionTracker();
  feed(tracker, report(copy([])), frameAt(0));
  // B lies above A, so it comes first in C; a single pass would hand result-1 to B's E3.
  const snap = feed(tracker, report(copy(E26), copy(E3, 100, 100)), frameAt(100));
  assert.deepEqual(snap.tracks.map(t => [t.id, t.resultId, t.geometry.points[0]]),
    [['track-1', 'result-1', { x: 0.1, y: 0.4 }], ['track-2', 'result-2', { x: 0.1, y: 0.1 }]]);
  assert.deepEqual(snap.results.map(r => [r.id, r.detection.content.eci, r.trackIds]),
    [['result-1', E26, ['track-1']], ['result-2', E3, ['track-2']]]);
}

// T12
{
  const tracker = createDetectionTracker();
  const first = feed(tracker, report(make(300, 300)), frameAt(0));
  assert.deepEqual(first.tracks.map(t => [t.id, t.slot, t.basis, t.resultId]),
    [['track-1', 0, 'content', 'result-1']]);
  const snap = feed(tracker, report(code('U0FNRQ==', [quad(sq(300, 300))])), frameAt(100));
  assert.deepEqual(snap.events, [{ type: 'localized', trackId: 'track-1', at: 100 }]);
  assert.deepEqual(snap.tracks.map(t => [t.id, t.slot, t.basis, t.state, t.resultId]),
    [['track-1', 0, 'spatial', 'tracked', 'result-1']]);
  const { geometry } = snap.tracks[0];
  assert.deepEqual([geometry.points[0], geometry.measured[0], geometry.restart],
    [{ x: 0.3, y: 0.3 }, { x: 0.3, y: 0.3 }, 'new']);
  assert.deepEqual(snap.results.map(r => [r.id, r.trackIds]), [['result-1', ['track-1']]]);
}

// T13
{
  const tracker = createDetectionTracker();
  feed(tracker, report(make(300, 300)), frameAt(0));
  const snap = feed(tracker, report(code('U0FNRQ==', [quad(sq(100, 400)), quad(sq(600, 400))])),
    frameAt(100));
  assert.deepEqual(snap.events, [{ type: 'expired', trackId: 'track-1', at: 100,
    reason: 'superseded', successors: ['track-2', 'track-3'] }, entered('track-2', 100),
  entered('track-3', 100)]);
  assert.deepEqual(snap.tracks.map(t => [t.id, t.slot, t.basis]),
    [['track-2', 1, 'spatial'], ['track-3', 2, 'spatial']]);
  // One copy compatible with two content tracks supersedes both; localized comes after
  // expirations and before entered.
  const superseded = (trackId, at, successors) =>
    ({ type: 'expired', trackId, at, reason: 'superseded', successors });
  const shared = createDetectionTracker();
  feed(shared, report(make(100, 100), make(600, 100)), frameAt(0));
  const one = feed(shared, report(code('U0FNRQ==', [quad(sq(300, 300))])), frameAt(100));
  assert.deepEqual(one.events, [superseded('track-1', 100, ['track-3']),
    superseded('track-2', 100, ['track-3']), entered('track-3', 100)]);
  assert.deepEqual(one.tracks.map(t => [t.id, t.slot]), [['track-3', 2]]);
  // Y (raw T1RIRVI=) sorts before X (U0FNRQ==) in C, so track-1 is Y and track-2 is X.
  const mixed = createDetectionTracker();
  feed(mixed, report(make(100, 100), code('T1RIRVI=')), frameAt(0));
  const both = feed(mixed, report(code('U0FNRQ==', [quad(sq(300, 300))]),
    code('T1RIRVI=', [quad(sq(100, 700)), quad(sq(600, 700))])), frameAt(100));
  assert.deepEqual(both.events, [superseded('track-1', 100, ['track-3', 'track-4']),
    { type: 'localized', trackId: 'track-2', at: 100 }, entered('track-3', 100),
    entered('track-4', 100)]);
  assert.deepEqual(both.tracks.map(t => [t.id, t.slot, t.basis]),
    [['track-2', 1, 'spatial'], ['track-3', 2, 'spatial'], ['track-4', 3, 'spatial']]);
}

// Two copies of one content on the row y = 400 (side 100); no x gives a complete empty report.
const twins = (...xs) => report(...(xs.length ? [code('VFdJTg==', xs.map(x => quad(sq(x, 400))))]
  : []));
const change = (type, trackId, at, reason) => ({ type, trackId, at, reason });
const timeout = (trackId, at) => change('expired', trackId, at, 'timeout');
// Runs frames every `every` ms from 0 to `end`; returns the events of each frame by its time.
const run = (tracker, end, inputAt, { every = 100, ...options } = {}) => {
  const events = new Map();
  for (let at = 0; at <= end; at += every) {
    const snap = feed(tracker, inputAt(at), frameAt(at), options.delay === undefined ? {}
      : { now: at + options.delay });
    events.set(at, snap.events);
    if (options.check) options.check(snap, at);
  }
  return events;
};
// Every frame has no event except the ones listed by time.
const onlyAt = (events, expected) => {
  for (const [at, list] of events) assert.deepEqual(list, expected[at] || [], `F${at}`);
};
const firstStays = (snap, at) => assert.deepEqual(
  [snap.tracks[0].id, snap.tracks[0].slot, snap.tracks[0].state], ['track-1', 0, 'tracked'],
  `F${at}`);

// T7: both at level 7; swap z² 1.44 / 0.95² per track gives the margin 3.1911 (closed form).
{
  near(2 * 1.44 / (0.95 * 0.95), 3.1911, 5e-5);
  const tracker = createDetectionTracker();
  const events = run(tracker, 900, at => (at <= 100 || at === 900 ? twins(100, 220) : twins()));
  onlyAt(events, {
    0: [entered('track-1', 0), entered('track-2', 0)],
    200: [change('held', 'track-1', 200, 'missed'), change('held', 'track-2', 200, 'missed')],
    300: [change('lost', 'track-1', 300, 'missed'), change('lost', 'track-2', 300, 'missed')],
    900: [ambiguous('track-1', 900, ['track-3', 'track-4']),
      ambiguous('track-2', 900, ['track-3', 'track-4']),
      entered('track-3', 900, 'split'), entered('track-4', 900, 'split')],
  });
  assert.deepEqual(tracker.snapshot(900).tracks.map(t => [t.id, t.slot]),
    [['track-3', 2], ['track-4', 3]]);
  // Control: after one empty frame the swap costs 1.44 / 0.35² = 11.755 > 9, not gated.
  const control = createDetectionTracker();
  const resumed = run(control, 300, at => (at === 200 ? twins() : twins(100, 220)));
  assert.deepEqual(resumed.get(300), [{ type: 'resumed', trackId: 'track-1', at: 300 },
    { type: 'resumed', trackId: 'track-2', at: 300 }]);
}

// T8
{
  const tracker = createDetectionTracker();
  let reacquired;
  const events = run(tracker, 2700, at => (at === 0 || at === 600 ? twins(100, 220) : twins(100)),
    { check: (snap, at) => {
      firstStays(snap, at);
      if (at === 600) reacquired = snap.tracks[1].geometry;
    } });
  onlyAt(events, {
    0: [entered('track-1', 0), entered('track-2', 0)],
    100: [change('held', 'track-2', 100, 'missed')],
    200: [change('lost', 'track-2', 200, 'missed')],
    600: [{ type: 'reappeared', trackId: 'track-2', at: 600, gap: 600 }],
    700: [change('held', 'track-2', 700, 'missed')],
    800: [change('lost', 'track-2', 800, 'missed')],
    2600: [timeout('track-2', 2600)],
  });
  // The 'reacquired' restart publishes the measurement.
  assert.deepEqual([reacquired.restart, reacquired.smoothed], ['reacquired', false]);
  assert.deepEqual(reacquired.points, reacquired.measured);
  near(reacquired.points[0].x, 0.22, 0);
}

// T8a: at F100, B's reference is 1 size from A's observation even at 2 sizes/s: z² = 1 / 0.25².
near(1 / (0.25 * 0.25), 16, 0);
for (const speed of [0.5, 1, 2]) {
  const tracker = createDetectionTracker();
  const a = at => 100 + speed * at / 10;
  const events = run(tracker, 2700, at => (at === 0 ? twins(a(0), 220) : twins(a(at))),
    { check: firstStays });
  onlyAt(events, {
    0: [entered('track-1', 0), entered('track-2', 0)],
    100: [change('held', 'track-2', 100, 'missed')],
    200: [change('lost', 'track-2', 200, 'missed')],
    2000: [timeout('track-2', 2000)],
  });
}

// T8b: frames 516 ms apart; σ = 0.666, so B's z² to A's observation is D² / σ² (closed form).
near(1.44 / (0.666 * 0.666), 3.2465, 5e-5);
near(2.25 / (0.666 * 0.666), 5.0726, 5e-5);
for (const [bx, split] of [[220, true], [250, false]]) {
  const tracker = createDetectionTracker();
  const events = run(tracker, 516 * 6, at => (at === 0 ? twins(100, bx) : twins(100)),
    { every: 516, delay: 400 });
  onlyAt(events, {
    0: [entered('track-1', 0), entered('track-2', 0)],
    516: split ? [ambiguous('track-1', 516, ['track-3']), ambiguous('track-2', 516, ['track-3']),
      entered('track-3', 516, 'split')] : [change('held', 'track-2', 516, 'missed')],
    ...(split ? {} : { 1032: [change('lost', 'track-2', 1032, 'missed')],
      2064: [timeout('track-2', 2000)] }),
  });
  if (split) {
    assert.deepEqual(tracker.snapshot(516 * 6).tracks.map(t => [t.id, t.slot]), [['track-3', 2]]);
  }
}

// Stacked equal labels (closed forms without a T id). Code 128 at 516 ms: one label hidden
// costs 7.904g² (0.711, 1.976, 3.873, 7.904), and with both visible only the co-observed rule
// stops the exchange at g <= 0.5. EAN-13 at 10 Hz: 6.015g² (2.947 at 0.7, 6.015 at 1.0).
near(0.49 / (0.25 * 0.666 * 0.666 + 0.25 * 0.25 / 4), 3.8731, 5e-5);
near(0.49 / (0.7 * 0.25 * 0.25 + 0.7 * 0.7 / 4), 2.9474, 5e-5);
for (const [symbology, every, g, split] of [['code128', 516, 0.3, true],
  ['code128', 516, 0.5, true], ['code128', 516, 0.7, true], ['code128', 516, 1.0, false],
  ['ean13', 100, 0.7, true], ['ean13', 100, 1.0, false]]) {
  const labels = hidden => report(code('U1RBQ0s=', [
    segment({ x: 100, y: 100 }, { x: 500, y: 100 }),
    ...(hidden ? [] : [segment({ x: 100, y: 100 + 400 * g }, { x: 500, y: 100 + 400 * g })])],
  { symbology }));
  const tracker = createDetectionTracker(), label = `${symbology} ${every} ms g ${g}`;
  for (let k = 0; k < 10; k++) {
    assert.deepEqual(feed(tracker, labels(false), frameAt(every * k, 1280, 720)).events,
      k ? [] : [entered('track-1', 0), entered('track-2', 0)], `${label} F${k}`);
  }
  const at = every * 10, hidden = feed(tracker, labels(true), frameAt(at, 1280, 720));
  assert.deepEqual(hidden.events, split ? [ambiguous('track-1', at, ['track-3']),
    ambiguous('track-2', at, ['track-3']), entered('track-3', at, 'split')]
    : [change('held', 'track-2', at, 'missed')], label);
}

// T8c
{
  const exhausted = { ...COMPLETE, budget_exhausted: true };
  const tracker = createDetectionTracker();
  const events = run(tracker, 2100,
    at => (at === 0 ? twins(100, 220) : { ...twins(100), trace: exhausted }),
    { check: firstStays });
  onlyAt(events, {
    0: [entered('track-1', 0), entered('track-2', 0)],
    100: [change('held', 'track-2', 100, 'unobserved')],
    1200: [change('lost', 'track-2', 1200, 'stale')],
    2000: [timeout('track-2', 2000)],
  });
}

// T9
{
  const tracker = createDetectionTracker();
  const events = run(tracker, 1000,
    at => (at === 0 ? twins(100, 200) : at === 700 ? twins() : twins(100)),
    { check: (snap, at) => assert.deepEqual([snap.tracks[0].id, snap.tracks[0].slot],
      ['track-1', 0], `F${at}`) });
  onlyAt(events, {
    0: [entered('track-1', 0), entered('track-2', 0)],
    100: [change('held', 'track-2', 100, 'missed')],
    200: [change('lost', 'track-2', 200, 'missed')],
    700: [change('held', 'track-1', 700, 'missed')],
    800: [{ type: 'resumed', trackId: 'track-1', at: 800 }],
  });
}

const UNAVAILABLE = { geometry: { kind: 'unavailable', points: [], reader: null } };
const unresolved = (key, at, trackIds) => ({ type: 'unresolved', key, at, trackIds });

// T10
{
  const tracker = createDetectionTracker();
  const legacy = make(300, 300);
  let reads = 0;
  Object.defineProperty(legacy, 'corners', { enumerable: true,
    get() { reads++; throw new Error('corners must never be read'); } });
  const first = feed(tracker, report(legacy), frameAt(0));
  assert.deepEqual([first.events, first.tracks.map(t => [t.id, t.basis, t.state, t.geometry])],
    [[entered('track-1', 0)], [['track-1', 'content', 'tracked', null]]]);
  const again = feed(tracker, report(legacy), frameAt(100));
  assert.deepEqual([again.events, again.tracks.map(t => [t.id, t.state, t.lastSeenAt, t.geometry]),
    again.nextDeadline], [[], [['track-1', 'tracked', 100, null]], 1300]);
  assert.equal(reads, 0);
}

// T10a
{
  const tracker = createDetectionTracker();
  const located = code('UkVBRA==', [quad(sq(100, 400))]), read = code('UkVBRA==', [UNAVAILABLE]);
  const key = contentKey(located);
  feed(tracker, report(located), frameAt(0));
  const f100 = feed(tracker, report(read), frameAt(100));
  assert.deepEqual(f100.events,
    [unresolved(key, 100, ['track-1']), change('held', 'track-1', 100, 'unobserved')]);
  const [kept] = f100.tracks;
  assert.deepEqual([kept.state, kept.lastSeenAt, kept.misses, kept.geometry.observedAt,
    kept.geometry.age, kept.geometry.precise], ['held', 0, 0, 0, 100, false]);
  assert.deepEqual(feed(tracker, report(), frameAt(200)).events, []);
  assert.deepEqual(feed(tracker, report(), frameAt(300)).events,
    [change('lost', 'track-1', 300, 'missed')]);
  const f400 = feed(tracker, report(read), frameAt(400));
  assert.deepEqual(f400.events, [unresolved(key, 400, ['track-1'])]);
  assert.deepEqual(f400.tracks.map(t => [t.id, t.state, t.lastSeenAt, t.geometry]),
    [['track-1', 'lost', 0, null]]);
}

// T10b
{
  const tracker = createDetectionTracker();
  const copies = (...occurrences) => report(code('RFJPUA==', occurrences));
  feed(tracker, copies(quad(sq(100, 400)), quad(sq(600, 400))), frameAt(0));
  const hexagon = { geometry: { kind: 'hexagon', points: sq(600, 400), reader: 'rxing' } };
  const snap = feed(tracker, copies(quad(sq(100, 400)), hexagon), frameAt(100));
  assert.deepEqual(snap.dropped,
    [{ detectionIndex: 0, occurrenceIndex: 1, reason: 'unknown-kind' }]);
  const key = contentKey(code('RFJPUA==', []));
  assert.deepEqual(snap.events,
    [unresolved(key, 100, ['track-2']), change('held', 'track-2', 100, 'unobserved')]);
  assert.deepEqual(snap.tracks.map(t => [t.id, t.state, t.lastSeenAt, t.misses]),
    [['track-1', 'tracked', 100, 0], ['track-2', 'held', 0, 0]]);
}

// T10b, dropped order (compared as in T5): dropped is sorted by key, ECI list, reason and
// then address, so two wire orders of the same occurrences give the same canonical snapshot.
{
  const outside = quad(sq(5000, 5000));
  const blob = { geometry: { kind: 'blob', points: [], reader: null } };
  const canonical = snapshot => JSON.parse(JSON.stringify(snapshot, (key, value) =>
    key === 'detection' ? [contentKey(value), value.content.eci ?? null]
      : ['observation', 'detectionIndex', 'occurrenceIndex'].includes(key) ? undefined : value));
  const both = code('QQ==', [outside, blob]), swapped = { ...both, occurrences: [blob, outside] };
  const b = code('Qg==', [UNAVAILABLE]), w = code('Qw==', [outside]);
  const drop = (detectionIndex, occurrenceIndex, reason) =>
    ({ detectionIndex, occurrenceIndex, reason });
  const scenes = [
    [[both], [swapped], [drop(0, 0, 'outside'), drop(0, 1, 'unknown-kind')],
      [drop(0, 1, 'outside'), drop(0, 0, 'unknown-kind')]],
    [[b, w], [w, b], [drop(0, 0, 'unavailable'), drop(1, 0, 'outside')],
      [drop(1, 0, 'unavailable'), drop(0, 0, 'outside')]]];
  for (const [wire, other, leftDropped, rightDropped] of scenes) {
    const left = feed(createDetectionTracker(), report(...wire), frameAt(0));
    const right = feed(createDetectionTracker(), report(...other), frameAt(0));
    assert.deepEqual([left.dropped, right.dropped], [leftDropped, rightDropped]);
    assert.deepEqual(canonical(right), canonical(left));
  }
}

// T10c
{
  const tracker = createDetectionTracker();
  const codabar = code('QTEyMzRC', [UNAVAILABLE], { symbology: 'codabar' });
  const first = feed(tracker, report(codabar), frameAt(0));
  assert.deepEqual([first.events, first.tracks.map(t => [t.id, t.basis, t.geometry])],
    [[entered('track-1', 0)], [['track-1', 'content', null]]]);
  const again = feed(tracker, report(codabar), frameAt(100));
  assert.deepEqual([again.events, again.tracks.map(t => [t.id, t.state, t.lastSeenAt])],
    [[], [['track-1', 'tracked', 100]]]);
  assert.deepEqual(feed(tracker, report(), frameAt(200)).events,
    [change('held', 'track-1', 200, 'missed')]);
  assert.deepEqual(feed(tracker, report(), frameAt(300)).events,
    [change('lost', 'track-1', 300, 'missed')]);
}

// T11
{
  const tracker = createDetectionTracker();
  const located = code('U0FNRQ==', [quad(sq(100, 400)), quad(sq(600, 400))]);
  const key = contentKey(located);
  feed(tracker, report(located), frameAt(0));
  const snap = feed(tracker, report(make(300, 300)), frameAt(100));
  assert.deepEqual(snap.events, [unresolved(key, 100, ['track-1', 'track-2']),
    change('held', 'track-1', 100, 'unobserved'), change('held', 'track-2', 100, 'unobserved')]);
  assert.deepEqual(snap.tracks.map(t => [t.id, t.state, t.geometry.points[0], t.geometry.age]),
    [['track-1', 'held', { x: 0.1, y: 0.4 }, 100], ['track-2', 'held', { x: 0.6, y: 0.4 }, 100]]);
  assert.deepEqual(snap.unassigned,
    [{ sequence: null, detectionIndex: 0, occurrenceIndex: null, key, reason: 'unresolved' }]);
  // A legacy detection of the key, here with an incompatible ECI list, proves no absence
  // even though nothing absorbs it.
  const other = createDetectionTracker();
  feed(other, report(copy(E26)), frameAt(0));
  const legacy = feed(other, report(code('RUNJ', undefined, { eci: E3 })), frameAt(100));
  assert.deepEqual(legacy.events,
    [entered('track-2', 100), change('held', 'track-1', 100, 'unobserved')]);
  assert.deepEqual(legacy.tracks.map(t => [t.id, t.basis, t.misses]),
    [['track-1', 'spatial', 0], ['track-2', 'content', 0]]);
}

// T17b
{
  const tracker = createDetectionTracker();
  const frame = () => report(code('RUNJ', [UNAVAILABLE], { eci: E3 }),
    code('RUNJ', [UNAVAILABLE], { eci: E26 }));
  const first = feed(tracker, frame(), frameAt(0));
  assert.deepEqual(first.tracks.map(t => [t.id, t.basis, t.detection.content.eci]),
    [['track-1', 'content', E26], ['track-2', 'content', E3]]);
  const again = feed(tracker, frame(), frameAt(100));
  assert.deepEqual([again.events, again.unassigned], [[], []]);
  assert.deepEqual(again.tracks.map(t => [t.id, t.state, t.lastSeenAt, t.detection.content.eci,
    t.observation.detectionIndex]), [['track-1', 'tracked', 100, E26, 1],
    ['track-2', 'tracked', 100, E3, 0]]);
}

// T17b, absorbed [] read and a content track: a [] read is compatible with the E3 content
// track too, so while a spatial E26 track absorbs it, the content track is unobserved, not
// missed.
{
  const signalled = () => code('RUNJ', [UNAVAILABLE], { eci: [] });
  const key = contentKey(copy(E26));
  const scene = () => {
    const tracker = createDetectionTracker();
    const first = feed(tracker, report(copy(E26), code('RUNJ', [UNAVAILABLE], { eci: E3 })),
      frameAt(0));
    assert.deepEqual(first.tracks.map(t => [t.id, t.basis, t.detection.content.eci]),
      [['track-1', 'spatial', E26], ['track-2', 'content', E3]]);
    return tracker;
  };
  const absorbed = scene();
  const f100 = feed(absorbed, report(signalled()), frameAt(100));
  assert.deepEqual(f100.events, [unresolved(key, 100, ['track-1']),
    change('held', 'track-1', 100, 'unobserved'), change('held', 'track-2', 100, 'unobserved')]);
  assert.deepEqual(f100.tracks.map(t => [t.id, t.state, t.misses]),
    [['track-1', 'held', 0], ['track-2', 'held', 0]]);
  const f200 = feed(absorbed, report(signalled()), frameAt(200));
  assert.deepEqual([f200.events, f200.tracks.map(t => [t.id, t.state, t.misses])],
    [[unresolved(key, 200, ['track-1'])], [['track-1', 'held', 0], ['track-2', 'held', 0]]]);
  // The spatial track matched in the same frame: no unresolved event, the same proof rule.
  const matched = feed(scene(), report(copy(E26), signalled()), frameAt(100));
  assert.deepEqual([matched.events, matched.tracks.map(t => [t.id, t.state, t.misses])],
    [[change('held', 'track-2', 100, 'unobserved')],
      [['track-1', 'tracked', 0], ['track-2', 'held', 0]]]);
}

// T12, adoption beside a spatial track: a [] copy is compatible with both the E26 spatial
// track and the E3 content track, so the content track cannot adopt it; it is superseded,
// and the solve gives the copy to whichever spatial track gates it, or a new one.
{
  const superseded = (trackId, at, successors) =>
    ({ type: 'expired', trackId, at, reason: 'superseded', successors });
  const scene = () => {
    const tracker = createDetectionTracker();
    feed(tracker, report(copy(E26), code('RUNJ', [UNAVAILABLE], { eci: E3 })), frameAt(0));
    return tracker;
  };
  const near = scene(), f100 = feed(near, report(copy([])), frameAt(100));
  assert.deepEqual(f100.events, [superseded('track-2', 100, ['track-1'])]);
  assert.deepEqual([f100.tracks.map(t => [t.id, t.basis, t.state, t.lastSeenAt, t.misses]),
    f100.results.map(r => [r.id, r.lastObservedAt, r.trackIds])],
  [[['track-1', 'spatial', 'tracked', 100, 0]],
    [['result-1', 100, ['track-1']], ['result-2', 0, []]]]);
  const f200 = feed(near, report(copy(E26)), frameAt(200));
  assert.deepEqual([f200.events, f200.tracks.map(t => [t.id, t.state])],
    [[], [['track-1', 'tracked']]]);
  // Far from the E26 track (6 sizes, not gated): a new [] spatial track takes the copy.
  const far = feed(scene(), report(copy([], 700)), frameAt(100));
  assert.deepEqual(far.events, [superseded('track-2', 100, ['track-3']), entered('track-3', 100),
    change('held', 'track-1', 100, 'missed')]);
  assert.deepEqual(far.tracks.map(t => [t.id, t.slot, t.basis, t.detection.content.eci]),
    [['track-1', 0, 'spatial', E26], ['track-3', 2, 'spatial', []]]);
}

// T14
{
  const tracker = createDetectionTracker();
  const one = (raw, x, y) => code(raw, [quad(sq(x, y))]);
  const events = run(tracker, 2000, at => report(one('QQ==', 100, 100),
    ...(at === 0 ? [one('Qg==', 400, 100)] : []), one('Qw==', 700, 100),
    ...(at === 2000 ? [one('RA==', 400, 600)] : [])), { check: (snap, at) => {
    if (at === 0) {
      assert.deepEqual(snap.tracks.map(t => [t.id, t.slot]),
        [['track-1', 0], ['track-2', 1], ['track-3', 2]]);
    }
    if (at === 2000) {
      assert.deepEqual(snap.tracks.map(t => [t.id, t.slot]),
        [['track-1', 0], ['track-4', 1], ['track-3', 2]]);
    }
  } });
  onlyAt(events, {
    0: [entered('track-1', 0), entered('track-2', 0), entered('track-3', 0)],
    100: [change('held', 'track-2', 100, 'missed')],
    200: [change('lost', 'track-2', 200, 'missed')],
    2000: [timeout('track-2', 2000), entered('track-4', 2000)],
  });
}

// T15: 7 contents x 10 copies; the last 6 copies in C order find no track.
{
  const tracker = createDetectionTracker();
  const rows = Array.from({ length: 7 }, (_, j) => code(`Uk9X${j}`,
    Array.from({ length: 10 }, (_, i) => quad(sq(20 + 95 * i, 20 + 130 * j, 60)))));
  const snap = feed(tracker, report(...rows), frameAt(0));
  assert.deepEqual(snap.tracks.map(t => t.slot), Array.from({ length: 64 }, (_, k) => k));
  assert.deepEqual(snap.tracks.map(t => t.id),
    Array.from({ length: 64 }, (_, k) => `track-${k + 1}`));
  assert.deepEqual(snap.unassigned.map(u => [u.detectionIndex, u.occurrenceIndex, u.reason]),
    [4, 5, 6, 7, 8, 9].map(i => [6, i, 'capacity']));
  assert.deepEqual(snap.saturated,
    { detections: false, occurrences: false, observations: false, tracks: true });
  assert.equal(snap.events.length, 64);
  // track-1 and track-12 miss (both held, last seen at 0) and one extra copy remains, so
  // the lower serial is evicted and its slot reused at once; no later event names the
  // evicted track.
  const without = (row, drop) => ({ ...row, occurrences: row.occurrences.filter((_, i) =>
    !drop.includes(i)) });
  const next = feed(tracker, report(without(rows[0], [0]), without(rows[1], [1]),
    ...rows.slice(2, 6), without(rows[6], [5, 6, 7, 8, 9])), frameAt(100));
  assert.deepEqual(next.events, [change('expired', 'track-1', 100, 'capacity'),
    entered('track-65', 100), change('held', 'track-12', 100, 'missed')]);
  assert.deepEqual([next.tracks.length, next.tracks[0].id, next.tracks[0].slot, next.unassigned],
    [64, 'track-65', 0, []]);
}

// T15, eviction after an unresolved read: a capacity eviction is a retirement of the
// frame, so no unresolved event names the evicted track; an event left with no track is
// dropped, and the read stays unassigned as 'unresolved'.
{
  // One key at its cap of 16: 14 copies seen, one new far copy and one unavailable read.
  const tracker = createDetectionTracker();
  const grid = Array.from({ length: 16 }, (_, k) => quad(sq(20 + 200 * (k % 4),
    20 + 200 * Math.floor(k / 4), 60)));
  const key = contentKey(code('S0VZ', []));
  feed(tracker, report(code('S0VZ', grid)), frameAt(0));
  const next = feed(tracker, report(code('S0VZ', [...grid.slice(0, 14), quad(sq(850, 850, 60)),
    UNAVAILABLE])), frameAt(100));
  assert.deepEqual(next.events, [change('expired', 'track-15', 100, 'capacity'),
    entered('track-17', 100), unresolved(key, 100, ['track-16']),
    change('held', 'track-16', 100, 'unobserved')]);
  assert.deepEqual([ids(next.tracks).includes('track-15'), next.unassigned], [false,
    [{ sequence: null, detectionIndex: 0, occurrenceIndex: 15, key, reason: 'unresolved' }]]);
  // The tracker cap: the only named track is evicted, so the event disappears.
  const full = createDetectionTracker();
  const rows = k => Array.from({ length: 16 }, (_, i) => quad(sq(20 + 120 * (i % 8),
    20 + 120 * (2 * k + Math.floor(i / 8)), 30)));
  const keys = ['QUFB', 'QkJC', 'Q0ND', 'RERE'];
  feed(full, report(...keys.map((raw, k) => code(raw, rows(k)))), frameAt(0));
  const fresh = code('RUVF', [quad(sq(950, 950, 30))]);
  const capped = feed(full, report(code('QUFB', [...rows(0).slice(0, 15), UNAVAILABLE]),
    ...keys.slice(1).map((raw, k) => code(raw, rows(k + 1))), fresh), frameAt(100));
  assert.deepEqual(capped.events, [change('expired', 'track-16', 100, 'capacity'),
    entered('track-65', 100)]);
  assert.deepEqual([capped.tracks.length, capped.unassigned], [64, [{ sequence: null,
    detectionIndex: 0, occurrenceIndex: 15, key: contentKey(code('QUFB', [])),
    reason: 'unresolved' }]]);
}

// T16: 17 contents x 16 copies of side 30, 60 px apart.
{
  const tracker = createDetectionTracker();
  const grid = n => Array.from({ length: n }, (_, j) => code(`R1JJRA${j}`,
    Array.from({ length: 16 }, (_, i) => quad(sq(20 + 60 * i, 20 + 60 * j, 30)))));
  const first = feed(tracker, report(...grid(17)), frameAt(0));
  assert.deepEqual([first.saturated.detections, first.complete, first.tracks.length,
    first.unassigned.length], [true, false, 64, 192]);
  assert.deepEqual(first.unassigned.filter(u => u.reason === 'capacity').length, 192);
  const next = feed(tracker, report(...grid(16)), frameAt(100));
  assert.deepEqual([next.complete, next.events, next.saturated.detections], [true, [], false]);
  assert.deepEqual(next.tracks.map(t => [t.id, t.state, t.lastSeenAt, t.misses]),
    first.tracks.map(t => [t.id, 'tracked', 100, 0]));
}

// T16a: eight pairs of one content (side 50, rows 2.4 sizes apart) cross every 500 ms with
// separations 2, 1, 0, 1, 2 sizes, each pair one frame later than the one above. A model of the
// creation rule (cap 64; a 65th entry releases the entry that ends first, then the lowest slot)
// predicts the slot of every new track.
{
  const tracker = createDetectionTracker();
  const SEPARATION = [2, 1, 0, 1, 2];
  const scene = at => report(code('UEFJUlM=', Array.from({ length: 8 }, (_, k) => {
    const d = SEPARATION[(at / 100 + k) % 5], y = 40 + 120 * k;
    return d === 0 ? [quad(sq(475, y, 50))]
      : [quad(sq(475 - 25 * d, y, 50)), quad(sq(475 + 25 * d, y, 50))];
  }).flat()));
  let live = new Map(), quarantine = [], overflows = 0, maxSlot = 0, maxEntries = 0;
  const released = new Map(); // slot -> the until it would have kept without the cap
  let freedByCap = 0;
  for (let at = 0; at <= 30000; at += 100) {
    const snap = feed(tracker, scene(at), frameAt(at));
    quarantine = quarantine.filter(q => q.until > at);
    const after = new Map(live);
    for (const e of snap.events.filter(event => event.type === 'expired')) {
      assert.equal(e.reason, 'ambiguous', `${e.trackId} at ${at}`);
      quarantine.push({ slot: after.get(e.trackId).slot,
        until: after.get(e.trackId).lastSeenAt + 2000 });
      after.delete(e.trackId);
      if (quarantine.length > 64) {
        overflows++;
        const first = quarantine.reduce((f, q) => (q.until < f.until ||
          (q.until === f.until && q.slot < f.slot) ? q : f));
        quarantine.splice(quarantine.indexOf(first), 1);
        released.set(first.slot, first.until);
      }
      maxEntries = Math.max(maxEntries, quarantine.length);
    }
    for (const e of snap.events.filter(event => event.type === 'entered')) {
      const used = new Set([...after.values()].map(t => t.slot));
      let slot = 0;
      while (used.has(slot) || quarantine.some(q => q.slot === slot)) slot++;
      assert.equal(snap.tracks.find(t => t.id === e.trackId).slot, slot, `${e.trackId} at ${at}`);
      if (released.has(slot) && released.get(slot) > at) freedByCap++;
      released.delete(slot);
      after.set(e.trackId, { slot, lastSeenAt: at });
      maxSlot = Math.max(maxSlot, slot);
    }
    live = new Map(snap.tracks.map(t => [t.id, { slot: t.slot, lastSeenAt: t.lastSeenAt }]));
    assert.deepEqual([...after.keys()].sort(), [...live.keys()].sort(), `F${at}`);
  }
  // The scene reaches the cap, and the cap's releases decide some slots.
  assert.equal(maxEntries, 64);
  assert.ok(overflows > 0 && freedByCap > 0, `${overflows} overflows, ${freedByCap} reuses`);
  assert.ok(maxSlot < 128, `slot ${maxSlot}`);
}

// Timing
const EXHAUSTED = { ...COMPLETE, budget_exhausted: true };
const bars = () => code('QkFSUw==', [segment({ x: 100, y: 500 }, { x: 400, y: 500 })],
  { symbology: 'code128' });
// T19's inputs: the segment from 0 to 300, then budget-exhausted empty reports up to 1400.
const stall = tracker => run(tracker, 1400,
  at => (at <= 300 ? report(bars()) : { detections: [], trace: EXHAUSTED }),
  { check: (snap, at) => at >= 300 && assert.equal(snap.nextDeadline, 1500, `F${at}`) });
const state = ({ status, events, ...rest }) => rest;

// T19
{
  const tracker = createDetectionTracker();
  onlyAt(stall(tracker), { 0: [entered('track-1', 0)],
    400: [change('held', 'track-1', 400, 'unobserved')] });
  assert.equal(tracker.nextDeadline(), 1500);
  const peek = tracker.snapshot(1500);
  assert.deepEqual([peek.status, peek.events], ['peek', []]);
  assert.deepEqual(peek.tracks.map(t => [t.id, t.state, t.geometry]), [['track-1', 'lost', null]]);
  // Nothing was stored: the held track and its deadline are still there.
  assert.equal(tracker.nextDeadline(), 1500);
  assert.equal(tracker.snapshot(1400).tracks[0].state, 'held');
  const applied = tracker.advance(1500);
  assert.equal(applied.status, 'time');
  assert.deepEqual(applied.events, [change('lost', 'track-1', 1500, 'stale')]);
  assert.deepEqual(tracker.advance(1500).events, []);
  const later = tracker.snapshot(2300);
  assert.deepEqual(later.tracks.map(t => [t.id, t.state]), [['track-1', 'lost']]);
  assert.equal(later.nextDeadline, 3500);
  const end = tracker.advance(3500);
  assert.deepEqual(end.events, [timeout('track-1', 2300)]);
  assert.deepEqual(end.results.map(r => [r.id, r.present, r.trackIds]), [['result-1', false, []]]);
}

// T25
{
  const tracker = createDetectionTracker(), control = createDetectionTracker();
  stall(tracker);
  stall(control);
  for (const t of [1499, 1500, 3499, 3500]) {
    const peek = tracker.snapshot(t);
    assert.deepEqual(tracker.snapshot(t), peek, `repeated snapshot(${t})`);
    const applied = tracker.advance(t);
    assert.deepEqual(state(peek), state(applied), `t ${t}`);
    assert.deepEqual([peek.status, peek.events], ['peek', []]);
    // The snapshots changed nothing: a tracker never read the same way applies the same.
    assert.deepEqual(applied, control.advance(t), `control ${t}`);
    assert.equal(tracker.nextDeadline(), applied.nextDeadline);
    assert.equal(tracker.nextDeadline(), tracker.snapshot(t).nextDeadline);
  }
}

// A fake clock: run(until) fires the due timers in time order; delays records each armed delay.
const fakeClock = (time = 0) => {
  const clock = { time, timers: [], delays: [], handles: 0,
    now: () => clock.time,
    setTimeout(callback, ms) {
      clock.delays.push(ms);
      clock.timers.push({ handle: ++clock.handles, due: clock.time + ms, callback });
      return clock.handles;
    },
    clearTimeout(handle) { clock.timers = clock.timers.filter(t => t.handle !== handle); },
    run(until) {
      for (let fired = 0; ; fired++) {
        const next = clock.timers.filter(t => t.due <= until)
          .sort((a, b) => a.due - b.due || a.handle - b.handle)[0];
        if (!next) break;
        assert.ok(fired < 1000, `busy timer loop at ${clock.time}`);
        clock.timers = clock.timers.filter(t => t !== next);
        clock.time = Math.max(clock.time, next.due);
        next.callback();
      }
      clock.time = Math.max(clock.time, until);
    } };
  return clock;
};
const qr = () => report(code('VDIw', [quad(sq(100, 100))]));
// Delivers each frame when the clock reaches deliverAt, with the clock's now (no now option).
const deliver = (tracker, clock, input, frame, deliverAt = frame.observedAt) => {
  clock.run(deliverAt);
  return tracker.update(input, frame);
};

// T20
{
  const clock = fakeClock(), changes = [];
  const tracker = createDetectionTracker({ clock, onChange: snap => changes.push(snap) });
  for (let at = 0; at <= 300; at += 100) deliver(tracker, clock, qr(), frameAt(at));
  clock.run(1499);
  assert.equal(changes.length, 4);
  clock.run(1500);
  const stale = changes[4];
  assert.deepEqual([changes.length, stale.status, stale.now, stale.events],
    [5, 'time', 1500, [change('lost', 'track-1', 1500, 'stale')]]);
  assert.deepEqual(stale.tracks.map(t => [t.state, t.geometry]), [['lost', null]]);
  assert.deepEqual(stale.results.map(r => [r.id, r.present, r.trackIds]),
    [['result-1', false, ['track-1']]]);
  clock.run(3500);
  const end = changes[5];
  assert.deepEqual([changes.length, end.now, end.events, end.nextDeadline],
    [6, 3500, [timeout('track-1', 2300)], null]);
  assert.deepEqual(end.results.map(r => [r.id, r.present, r.trackIds]), [['result-1', false, []]]);
  assert.deepEqual([clock.delays, clock.timers], [[1200, 1200, 1200, 1200, 2000], []]);
  // An advance() that applies no transition calls no onChange, and every update() does,
  // a rejected one included.
  tracker.advance(3600);
  assert.equal(changes.length, 6);
  tracker.update(qr(), frameAt(300));
  assert.deepEqual([changes.length, changes[6].status, changes[6].rejection],
    [7, 'rejected', 'stale_time']);
  // Without onChange, no timer is ever armed, so the deadline at 1500 waits for a call.
  const quiet = fakeClock(), plain = createDetectionTracker({ clock: quiet });
  for (let at = 0; at <= 300; at += 100) deliver(plain, quiet, qr(), frameAt(at));
  quiet.run(5000);
  assert.deepEqual([quiet.delays, plain.nextDeadline()], [[], 1500]);
}

// T20a
{
  const clock = fakeClock(), changes = [];
  const tracker = createDetectionTracker({ clock, onChange: snap => changes.push(snap) });
  deliver(tracker, clock, qr(), frameAt(300));
  assert.deepEqual(clock.timers.map(t => t.due), [1500]);
  clock.run(1000);
  tracker.destroy();
  assert.deepEqual(clock.timers, []);
  clock.run(5000);
  assert.equal(changes.length, 1);
  const frozen = tracker.snapshot();
  assert.deepEqual([frozen.status, frozen.now, frozen.events, frozen.nextDeadline],
    ['destroyed', 300, [], null]);
  assert.deepEqual(frozen.tracks.map(t => [t.id, t.state]), [['track-1', 'tracked']]);
  assert.deepEqual(tracker.update(report(), frameAt(5000)), frozen);
  assert.deepEqual(tracker.advance(6000), frozen);
  assert.deepEqual(tracker.reset({ epoch: 9 }), frozen);
  assert.deepEqual(tracker.clear(), frozen);
  assert.deepEqual([tracker.forget('result-1'), tracker.nextDeadline()], [false, null]);
  tracker.destroy();
  assert.deepEqual([clock.timers, clock.delays.length, changes.length], [[], 1, 1]);
  assert.deepEqual(tracker.snapshot(), frozen);
}

// T20b
{
  const failure = new Error('overlay failed'), errors = [], seen = [];
  const clock = fakeClock();
  const onChange = snap => {
    seen.push(snap);
    if (seen.length === 2) throw failure;
  };
  const tracker = createDetectionTracker({ clock, onChange, onError: error => errors.push(error) });
  deliver(tracker, clock, qr(), frameAt(0));
  const second = deliver(tracker, clock, qr(), frameAt(100));
  assert.deepEqual([seen.length, errors.length, second.status], [2, 1, 'updated']);
  assert.equal(errors[0], failure);
  assert.equal(seen[1], second);
  assert.deepEqual(clock.timers.map(t => t.due), [1300]);
  tracker.destroy();
  // Without onError the error is rethrown from a microtask; update() still returns.
  const caught = [], hook = error => caught.push(error), late = new Error('late overlay');
  const bare = createDetectionTracker({ clock, onChange: () => { throw late; } });
  process.on('uncaughtException', hook);
  const returned = deliver(bare, clock, qr(), frameAt(200));
  assert.deepEqual([returned.status, caught], ['updated', []]);
  await new Promise(resolve => setTimeout(resolve, 0));
  process.off('uncaughtException', hook);
  assert.deepEqual(caught, [late]);
  bare.destroy();
}

// T20c
{
  const clock = fakeClock(), changes = [], retainMs = 2592000000, cap = 2147483647;
  const tracker = createDetectionTracker({ clock, retainMs, onChange: snap => changes.push(snap) });
  deliver(tracker, clock, qr(), frameAt(0));
  clock.run(3199);
  const armed = clock.delays.length;
  // From 3200 on, the result's retention at 30 days is the only deadline: one capped delay,
  // and no busy loop over 10 s of fake time.
  clock.run(13200);
  assert.deepEqual(changes.map(c => c.events), [[entered('track-1', 0)],
    [change('lost', 'track-1', 1200, 'stale')], [timeout('track-1', 2000)]]);
  assert.deepEqual([clock.delays.length - armed, clock.delays[armed]], [1, cap]);
  assert.deepEqual(clock.timers.map(t => t.due), [3200 + cap]);
  clock.run(3200 + cap);
  assert.deepEqual([changes.length, clock.delays.slice(armed + 1)], [3, [retainMs - 3200 - cap]]);
  clock.run(retainMs);
  assert.deepEqual([changes.length, changes[3].events, changes[3].results, changes[3].nextDeadline],
    [4, [], [], null]);
  assert.deepEqual(clock.timers, []);
  tracker.destroy();
  // Clock domains: Date.now() on the default clock, and evidence older than 60 s.
  assert.throws(() => createDetectionTracker().update([],
    { width: 100, height: 100, observedAt: Date.now() }), RangeError);
  const late = createDetectionTracker({ clock: fakeClock(100000) });
  assert.throws(() => late.update([], { width: 100, height: 100, observedAt: 39000 }), RangeError);
  // observedAt may be up to 1 s ahead of now and 60 s behind: both limits themselves are
  // accepted, and evidence 60 s old is content_only.
  assert.equal(late.update([], { width: 100, height: 100, observedAt: 40000 }).status,
    'content_only');
  assert.equal(late.update([], { width: 100, height: 100, observedAt: 101000 }).status, 'updated');
  assert.throws(() => late.update([], { width: 100, height: 100, observedAt: 101001 }), RangeError);
}

// T20c, fractional times: each deadline is tested in the same sum that defines it. With
// observedAt 999.99, (999.99 + 1200) - 999.99 < 1200, so a subtraction test would keep the
// result present at its own deadline and re-arm the timer at 0 ms forever on a clock that
// does not move.
{
  const a = 999.99, clock = fakeClock(a), changes = [];
  const tracker = createDetectionTracker({ clock, onChange: snap => changes.push(snap) });
  deliver(tracker, clock, qr(), frameAt(a));
  clock.run(a + 1200);
  assert.deepEqual(changes.map(c => [c.status, c.now, c.events]), [
    ['updated', a, [entered('track-1', a)]],
    ['time', a + 1200, [change('lost', 'track-1', a + 1200, 'stale')]]]);
  assert.deepEqual([changes[1].results.map(r => r.present), changes[1].nextDeadline,
    clock.timers.map(t => t.due)], [[false], a + 2000 + 1200, [a + 2000 + 1200]]);
  // Retention at a fractional time: removed once, by one wake.
  const b = 3192.05, rclock = fakeClock(b), removals = [];
  const kept = createDetectionTracker({ clock: rclock, retainMs: 5000,
    onChange: snap => removals.push(snap) });
  deliver(kept, rclock, qr(), frameAt(b));
  rclock.run(b + 5000);
  assert.deepEqual(removals.map(c => [c.now, c.events, c.results.length, c.nextDeadline]), [
    [b, [entered('track-1', b)], 1, b + 1200],
    [b + 1200, [change('lost', 'track-1', b + 1200, 'stale')], 1, b + 2000 + 1200],
    [b + 2000 + 1200, [timeout('track-1', b + 2000)], 1, b + 5000],
    [b + 5000, [], 0, null]]);
  // Without onChange: advance(nextDeadline()) applies that deadline, so it moves on.
  const plain = createDetectionTracker({ clock: fakeClock(a) });
  feed(plain, qr(), frameAt(a));
  const first = plain.advance(plain.nextDeadline());
  assert.deepEqual([first.now, first.events, first.results[0].present, plain.nextDeadline()],
    [a + 1200, [change('lost', 'track-1', a + 1200, 'stale')], false, a + 2000 + 1200]);
  // A frame delivered exactly at observedAt + staleMs is content_only.
  const late = createDetectionTracker({ clock: fakeClock(a) });
  const boundary = feed(late, qr(), frameAt(a), { now: a + 1200 });
  assert.deepEqual([boundary.status, boundary.events, boundary.tracks.map(t => [t.basis, t.state]),
    boundary.results.map(r => r.present), boundary.nextDeadline],
  ['content_only', [entered('track-1', a)], [['content', 'lost']], [false], a + 2000 + 1200]);
}

const reappeared = (trackId, at, gap) => ({ type: 'reappeared', trackId, at, gap });

// T21
{
  const tracker = createDetectionTracker();
  tracker.update(qr(), frameAt(0), { now: 50 });
  const f1000 = tracker.update(qr(), frameAt(1000), { now: 1900 });
  assert.deepEqual([f1000.status, f1000.events, f1000.frameAge, f1000.nextDeadline],
    ['updated', [], 900, 2200]);
  const { observedAt, age } = f1000.tracks[0].geometry;
  assert.deepEqual([observedAt, age], [1000, 900]);
  const f1100 = tracker.update(qr(), frameAt(1100), { now: 2400 });
  assert.deepEqual([f1100.status, f1100.events],
    ['content_only', [change('lost', 'track-1', 2200, 'stale')]]);
  assert.deepEqual(f1100.tracks.map(t => [t.id, t.state, t.lastSeenAt, t.geometry]),
    [['track-1', 'lost', 1000, null]]);
  assert.deepEqual(f1100.results.map(r => [r.id, r.lastObservedAt, r.present, r.trackIds]),
    [['result-1', 1100, false, ['track-1']]]);
}

// T21a
{
  // (a) Observed every 750 ms, delivered 650 ms later; absent in the frame observed at 750.
  const clock = fakeClock(), changes = [];
  const tracker = createDetectionTracker({ clock, onChange: snap => changes.push(snap) });
  deliver(tracker, clock, qr(), frameAt(0), 650);
  deliver(tracker, clock, report(), frameAt(750), 1400);
  clock.run(2149);
  assert.deepEqual(changes.map(c => [c.status, c.now, c.events]), [
    ['updated', 650, [entered('track-1', 0)]],
    ['time', 1200, [change('lost', 'track-1', 1200, 'stale')]],
    ['updated', 1400, []]]);
  // Nothing at the nominal expiry 2000: expiry by time waits until 3200.
  assert.deepEqual(clock.timers.map(t => t.due), [3200]);
  const back = deliver(tracker, clock, qr(), frameAt(1500), 2150);
  assert.deepEqual(back.events, [reappeared('track-1', 1500, 1500)]);
  assert.deepEqual(back.tracks.map(t => [t.id, t.slot, t.state]), [['track-1', 0, 'tracked']]);
  tracker.destroy();
  // (b) T21's inputs with onChange: at is raised to stay monotonic.
  const clockB = fakeClock(), seen = [];
  const late = createDetectionTracker({ clock: clockB, onChange: snap => seen.push(snap) });
  deliver(late, clockB, qr(), frameAt(0), 50);
  const f1000 = deliver(late, clockB, qr(), frameAt(1000), 1900);
  assert.deepEqual(seen.map(c => c.events), [[entered('track-1', 0)],
    [change('lost', 'track-1', 1200, 'stale')], [reappeared('track-1', 1200, 1000)]]);
  assert.equal(seen[2], f1000);
  late.destroy();
}

// T21b
{
  const tracker = createDetectionTracker();
  const first = tracker.update(qr(), frameAt(0), { now: 1300 });
  assert.deepEqual([first.status, first.events], ['content_only', [entered('track-1', 0)]]);
  assert.deepEqual(first.tracks.map(t => [t.id, t.basis, t.state, t.geometry]),
    [['track-1', 'content', 'lost', null]]);
  assert.deepEqual(first.results.map(r => [r.id, r.present, r.trackIds]),
    [['result-1', false, ['track-1']]]);
  for (const [at, now] of [[500, 1800], [1000, 2300]]) {
    const snap = tracker.update(qr(), frameAt(at), { now });
    assert.deepEqual([snap.status, snap.events], ['content_only', []], `F${at}`);
    assert.deepEqual(snap.tracks.map(t => [t.id, t.basis, t.state, t.lastSeenAt]),
      [['track-1', 'content', 'lost', at]]);
  }
}

const frameWith = (observedAt, more) => ({ ...frameAt(observedAt), ...more });

// T22
{
  const tracker = createDetectionTracker(), control = createDetectionTracker();
  feed(tracker, qr(), frameWith(1000, { sequence: 5 }));
  feed(control, qr(), frameWith(1000, { sequence: 5 }));
  for (const [frame, rejection, now] of [[frameWith(900, { sequence: 6 }), 'stale_time', 1000],
    [frameWith(1100, { sequence: 5 }), 'stale_sequence', 1100],
    [frameWith(1200, { epoch: 0 }), 'stale_epoch', 1200]]) {
    const snap = feed(tracker, qr(), frame);
    assert.deepEqual([snap.status, snap.rejection, snap.now, snap.events],
      ['rejected', rejection, now, []]);
    // Tracks, results and watermarks are those of a tracker that never saw the frame.
    assert.deepEqual({ ...state(snap), rejection: null }, state(control.advance(now)), rejection);
  }
  const next = feed(tracker, qr(), frameWith(1300, { epoch: 2, sequence: 1 }));
  assert.deepEqual(next.events,
    [change('expired', 'track-1', 1300, 'epoch'), entered('track-2', 1300)]);
  assert.deepEqual([next.epoch, next.tracks.map(t => [t.id, t.slot])], [2, [['track-2', 0]]]);
}

// T22, malformed detections: a detection that the tracker reads must be an object with a
// content object; anything else throws a TypeError before any state change, so the expiry
// still reaches a snapshot.
{
  const tracker = createDetectionTracker(), control = createDetectionTracker();
  for (const t of [tracker, control]) feed(t, qr(), frameAt(0));
  const bad = [[null], { detections: [{ symbology: 'qr_code' }], trace: COMPLETE },
    report(code('QQ==', [quad(sq(100, 100))]), { symbology: 'qr_code', content: null }),
    report(code('QQ==', [quad(sq(100, 100))], { eci: [null] }))];
  for (const input of bad) {
    for (const frame of [frameAt(2500), frameWith(2500, { epoch: 2 })]) {
      assert.throws(() => feed(tracker, input, frame), TypeError);
      assert.deepEqual(state(tracker.snapshot(0)), state(control.snapshot(0)));
    }
  }
  const retry = feed(tracker, report(), frameAt(2500));
  assert.deepEqual([retry.status, retry.events],
    ['updated', [change('lost', 'track-1', 1200, 'stale'), timeout('track-1', 2000)]]);
}

// T22a
{
  // Without a sequence, the same frame twice: the second counts no second miss.
  const tracker = createDetectionTracker();
  feed(tracker, qr(), frameAt(900));
  assert.deepEqual(feed(tracker, report(), frameAt(1000)).events,
    [change('held', 'track-1', 1000, 'missed')]);
  const again = feed(tracker, report(), frameAt(1000));
  assert.deepEqual([again.status, again.rejection, again.events], ['rejected', 'stale_time', []]);
  assert.deepEqual(again.tracks.map(t => [t.state, t.misses]), [['held', 1]]);
  // reset() at now 1500 rejects evidence observed at or before 1500; results are kept.
  const clock = fakeClock(), watched = createDetectionTracker({ clock });
  deliver(watched, clock, qr(), frameAt(1000));
  clock.run(1500);
  const cut = watched.reset();
  assert.deepEqual([cut.status, cut.now, cut.events, cut.tracks],
    ['reset', 1500, [change('expired', 'track-1', 1500, 'reset')], []]);
  assert.deepEqual(cut.results.map(r => [r.id, r.present, r.trackIds]), [['result-1', true, []]]);
  const old = deliver(watched, clock, qr(), frameAt(1400), 1700);
  assert.deepEqual([old.status, old.rejection], ['rejected', 'stale_time']);
  const fresh = deliver(watched, clock, qr(), frameAt(1600), 1700);
  assert.deepEqual([fresh.status, fresh.events], ['updated', [entered('track-2', 1600)]]);
  assert.throws(() => watched.reset({ epoch: 0 }), RangeError);
  // reset({ epoch }) starts a session whose sequences start again, so a later
  // controller's frames are accepted.
  deliver(watched, clock, qr(), frameWith(1800, { sequence: 40 }));
  clock.run(1900);
  assert.deepEqual(watched.reset({ epoch: 3 }).events,
    [change('expired', 'track-2', 1900, 'epoch')]);
  const next = deliver(watched, clock, qr(), frameWith(2000, { epoch: 3, sequence: 1 }));
  assert.deepEqual([next.status, next.epoch, next.events],
    ['updated', 3, [entered('track-3', 2000)]]);
}

const rows = snap => snap.tracks.map(t => [t.id, t.state, t.misses]);

// T23
{
  const tracker = createDetectionTracker();
  feed(tracker, qr(), frameAt(0));
  const steps = [
    [{ detections: [], trace: EXHAUSTED }, undefined, ['held', 'unobserved'], 0, false],
    [{ detections: [], trace: { budget_exhausted: false } }, undefined, null, 0, false],
    [[], undefined, null, 0, false],
    [[], { complete: true }, null, 1, true],
    [[], { complete: true }, ['lost', 'missed'], 2, true]];
  steps.forEach(([input, options, event, misses, complete], i) => {
    const at = 100 * (i + 1), snap = feed(tracker, input, frameAt(at), options);
    const events = event ? [change(event[0], 'track-1', at, event[1])] : [];
    assert.deepEqual([snap.events, snap.tracks[0].misses, snap.complete],
      [events, misses, complete], `F${at}`);
  });
  for (const [occurrences, reason, misses] of [[true, 'unobserved', 0], [false, 'missed', 1]]) {
    const pair = createDetectionTracker();
    feed(pair, twins(100, 220), frameAt(0));
    const trace = { ...COMPLETE, saturation: { ...COMPLETE.saturation, occurrences } };
    const snap = feed(pair, { ...twins(100), trace }, frameAt(100));
    assert.deepEqual(snap.events, [change('held', 'track-2', 100, reason)], `${occurrences}`);
    assert.deepEqual(rows(snap), [['track-1', 'tracked', 0], ['track-2', 'held', misses]]);
  }
}

// T23a
{
  const tracker = createDetectionTracker();
  feed(tracker, qr(), frameAt(0));
  const scanned = { detections: [...qr().detections, code('T1RIRVI=', [quad(sq(600, 600))])],
    trace: EXHAUSTED };
  const kept = scanned.detections.filter(d => d.content.raw !== 'VDIw');
  const filtered = feed(tracker, { ...scanned, detections: kept }, frameAt(100));
  assert.deepEqual(filtered.events,
    [entered('track-2', 100), change('held', 'track-1', 100, 'unobserved')]);
  assert.deepEqual(rows(filtered), [['track-1', 'held', 0], ['track-2', 'tracked', 0]]);
  const bare = feed(tracker, kept, frameAt(200));
  assert.deepEqual([bare.events, bare.complete, rows(bare)],
    [[], false, [['track-1', 'held', 0], ['track-2', 'tracked', 0]]]);
  const strict = createDetectionTracker();
  feed(strict, qr(), frameAt(0));
  const asserted = feed(strict, report(), frameAt(100), { complete: false });
  assert.deepEqual([asserted.events, asserted.complete, rows(asserted)],
    [[change('held', 'track-1', 100, 'unobserved')], false, [['track-1', 'held', 0]]]);
}

// T24
{
  const at = (w, h, side) => report(code('VDI0', [quad(sq(0.2 * w, 0.4 * h, side))]));
  const tracker = createDetectionTracker();
  feed(tracker, report(code('VDI0', [quad(sq(100, 300))])), frameAt(0));
  const narrow = feed(tracker, report(code('VDI0', [quad(sq(100, 300))])),
    frameAt(100, 1000, 560));
  assert.deepEqual(narrow.events,
    [change('expired', 'track-1', 100, 'frame_changed'), entered('track-2', 100)]);
  const [moved] = narrow.tracks[0].geometry.points;
  near(moved.x, 0.1);
  near(moved.y, 0.535714);
  const wide = createDetectionTracker();
  feed(wide, at(1280, 720, 128), frameAt(0, 1280, 720));
  const half = feed(wide, at(640, 360, 64), frameAt(100, 640, 360));
  assert.deepEqual([half.events, rows(half)], [[], [['track-1', 'tracked', 0]]]);
  const [kept] = half.tracks[0].geometry.points;
  near(kept.x, 0.2);
  near(kept.y, 0.4);
}

// T28
{
  const tracker = createDetectionTracker({ maxMisses: 0 });
  feed(tracker, qr(), frameAt(0));
  const snap = feed(tracker, report(), frameAt(100));
  assert.deepEqual(snap.events, [change('lost', 'track-1', 100, 'missed')]);
  assert.deepEqual(snap.tracks.map(t => [t.state, t.misses, t.geometry]), [['lost', 1, null]]);
}

// T26
{
  const clock = fakeClock(), tracker = createDetectionTracker({ clock, maxResults: 16 });
  const content = k => report(code(`K${k}`, [quad(sq(100, 100))]));
  for (let k = 0; k <= 16; k++) deliver(tracker, clock, content(k), frameAt(100 * k));
  const all = Array.from({ length: 17 }, (_, k) => [`result-${k + 1}`, [`track-${k + 1}`]]);
  assert.deepEqual(tracker.snapshot(1600).results.map(r => [r.id, r.trackIds]), all);
  clock.run(3200);
  const pruned = tracker.advance();
  // track-16 and track-17 also go stale: seen at 1500 and 1600.
  assert.deepEqual(pruned.events, [timeout('track-1', 2000),
    change('lost', 'track-16', 2700, 'stale'), change('lost', 'track-17', 2800, 'stale')]);
  assert.deepEqual(ids(pruned.results), all.slice(1).map(([id]) => id));
  assert.deepEqual([tracker.forget('result-2'), tracker.forget('result-2')], [true, false]);
  assert.equal(tracker.snapshot().tracks.find(t => t.id === 'track-2').resultId, null);
  const cleared = tracker.clear();
  assert.deepEqual(cleared.events, Array.from({ length: 16 },
    (_, k) => change('expired', `track-${k + 2}`, 3200, 'reset')));
  assert.deepEqual([cleared.status, cleared.tracks, cleared.results], ['reset', [], []]);
  const next = deliver(tracker, clock, content(17), frameAt(3300));
  assert.deepEqual([next.events, ids(next.tracks), ids(next.results)],
    [[entered('track-18', 3300)], ['track-18'], ['result-18']]);
}
// Of the results without a live track, the oldest goes first, and the lowest serial on ties.
for (const first of [1, 2]) {
  const tracker = createDetectionTracker({ maxResults: 16 });
  const at = (k, x = 100) => code(`K${k}`, [quad(sq(x, 100))]);
  // first 1: one content per frame, so result-2 is newer; first 2: two contents at 0, a tie.
  feed(tracker, report(...(first === 2 ? [at(0), at(1, 400)] : [at(0)])), frameAt(0));
  for (let k = first; k <= 16; k++) feed(tracker, report(at(k)), frameAt(100 * (k - first + 1)));
  const end = first === 2 ? 3200 : 3300;
  const pruned = tracker.advance(end);
  assert.deepEqual(pruned.events.filter(e => e.type === 'expired'),
    [timeout('track-1', 2000), timeout('track-2', first === 2 ? 2000 : 2100)]);
  // result-1 is removed in both scenes; result-2 stays without a live track.
  assert.deepEqual([ids(pruned.results), pruned.results[0].trackIds],
    [Array.from({ length: 16 }, (_, k) => `result-${k + 2}`), []], `first ${first}`);
}
// The default maxResults is 32.
{
  const tracker = createDetectionTracker();
  for (let k = 0; k <= 32; k++) feed(tracker, report(code(`K${k}`, [quad(sq(100, 100))])),
    frameAt(100 * k));
  const pruned = tracker.advance(6400);
  assert.deepEqual([pruned.tracks, ids(pruned.results)],
    [[], Array.from({ length: 32 }, (_, k) => `result-${k + 2}`)]);
}
// forget() reaches onChange with status 'forget', and the next match of a forgotten
// result's track opens a new result.
{
  const clock = fakeClock(), changes = [];
  const tracker = createDetectionTracker({ clock, onChange: snap => changes.push(snap) });
  deliver(tracker, clock, qr(), frameAt(0));
  assert.equal(tracker.forget('result-1'), true);
  assert.deepEqual([changes.length, changes[1].status, changes[1].events, changes[1].results],
    [2, 'forget', [], []]);
  assert.deepEqual(changes[1].tracks.map(t => [t.id, t.resultId]), [['track-1', null]]);
  assert.equal(tracker.forget('result-1'), false);
  const again = deliver(tracker, clock, qr(), frameAt(100));
  assert.deepEqual([changes.length, again.events, again.tracks.map(t => [t.id, t.resultId])],
    [3, [], [['track-1', 'result-2']]]);
  assert.deepEqual(again.results.map(r => [r.id, r.trackIds]), [['result-2', ['track-1']]]);
  tracker.destroy();
}
// retainMs removes a result without a live track once that old, through advance() and
// never through snapshot().
{
  const tracker = createDetectionTracker({ retainMs: 5000 });
  feed(tracker, qr(), frameAt(0));
  assert.deepEqual(tracker.advance(3200).events, [change('lost', 'track-1', 1200, 'stale'),
    timeout('track-1', 2000)]);
  assert.equal(tracker.nextDeadline(), 5000);
  assert.deepEqual([ids(tracker.snapshot(4999).results), ids(tracker.snapshot(5000).results)],
    [['result-1'], []]);
  assert.deepEqual(ids(tracker.snapshot(4000).results), ['result-1']);
  const removed = tracker.advance(5000);
  assert.deepEqual([removed.events, removed.results, removed.nextDeadline], [[], [], null]);
}
// T26, reset() above the bound: reset() leaves every result without a live track, so it
// applies maxResults itself, and an advance() at the same time has nothing left to apply
// and calls no onChange.
{
  const clock = fakeClock(), changes = [];
  const tracker = createDetectionTracker({ clock, maxResults: 16,
    onChange: snap => changes.push(snap) });
  const content = k => report(code(`K${k}`, [quad(sq(100, 100))]));
  for (let k = 0; k <= 16; k++) deliver(tracker, clock, content(k), frameAt(100 * k));
  clock.run(1700);
  const reset = tracker.reset();
  assert.deepEqual(reset.events, Array.from({ length: 17 },
    (_, k) => change('expired', `track-${k + 1}`, 1700, 'reset')));
  assert.deepEqual([reset.tracks, ids(reset.results), reset.nextDeadline],
    [[], Array.from({ length: 16 }, (_, k) => `result-${k + 2}`), 1800]);
  const seen = changes.length, same = tracker.advance(1700);
  assert.deepEqual([same.events, ids(same.results), changes.length],
    [[], ids(reset.results), seen]);
  tracker.destroy();
}
// T26, a frame that reads the oldest content again: the expiry pass before the frame
// applies retention only, and the maxResults bound waits until the frame's reads are
// resolved, so the frame's own read keeps result-1 instead of reopening its card.
{
  const content = k => report(code(`K${k}`, [quad(sq(100, 100))]));
  const scene = () => {
    const tracker = createDetectionTracker({ maxResults: 16 });
    for (let k = 0; k <= 16; k++) feed(tracker, content(k), frameAt(100 * k));
    return tracker;
  };
  const lifecycle = snap => snap.events.filter(e => e.type === 'expired' || e.type === 'entered');
  const again = feed(scene(), content(0), frameAt(2000));
  assert.deepEqual(lifecycle(again), [timeout('track-1', 2000), entered('track-18', 2000)]);
  assert.deepEqual(again.results.map(r => [r.id, r.firstObservedAt, r.trackIds]).slice(0, 2),
    [['result-1', 0, ['track-18']], ['result-2', 100, ['track-2']]]);
  assert.equal(again.results.length, 17);
  // Control: a frame that reads another content still evicts result-1, once its reads are resolved.
  const other = feed(scene(), content(5), frameAt(2000));
  assert.deepEqual([lifecycle(other), ids(other.results)], [[timeout('track-1', 2000)],
    Array.from({ length: 16 }, (_, k) => `result-${k + 2}`)]);
}

// T25a (tracker rows; the overlay's path removal belongs to the overlay rewrite)
{
  const clock = fakeClock(), changes = [];
  const tracker = createDetectionTracker({ clock, onChange: snap => changes.push(snap) });
  for (let at = 0; at <= 300; at += 100) deliver(tracker, clock, qr(), frameAt(at));
  clock.time = 1505;
  const peek = tracker.snapshot();
  assert.deepEqual([peek.status, peek.now, peek.events], ['peek', 1505, []]);
  assert.deepEqual(peek.tracks.map(t => [t.id, t.state, t.geometry]), [['track-1', 'lost', null]]);
  // The read neither ran nor moved the timer due at 1500.
  assert.deepEqual([changes.length, clock.timers.map(t => t.due)], [4, [1500]]);
  clock.time = 1510;
  clock.run(1510);
  const woke = changes[4];
  assert.deepEqual([changes.length, woke.status, woke.now, woke.events],
    [5, 'time', 1510, [change('lost', 'track-1', 1500, 'stale')]]);
  assert.deepEqual(woke.tracks.map(t => [t.id, t.state, t.geometry]), [['track-1', 'lost', null]]);
  tracker.destroy();
}

// T18: sigma = 0.15 + dt (s), so a 0.6-size move costs (0.6 / sigma)² (closed form).
// Restarts, and the smoothed x 0.1 + 0.35 x 0.008 = 0.1028 and 0.18 + 0.35 x 0.006 = 0.1821.
{
  const at = (x, observedAt, more) => [report(code('VDE4', [quad(sq(x, 100))])),
    frameWith(observedAt, more)];
  const x0 = snap => snap.tracks.map(t => [t.id, t.geometry.measured[0].x]);
  const restarts = snap => snap.tracks.map(t => t.geometry.restart);
  near((0.6 / 0.18) ** 2, 11.1, 0.05);
  near((0.6 / 0.55) ** 2, 1.19, 0.005);
  // (a) 30 ms: gated.
  const fast = createDetectionTracker();
  feed(fast, ...at(100, 0));
  const jumped = feed(fast, ...at(160, 30));
  assert.deepEqual(jumped.events,
    [entered('track-2', 30), change('held', 'track-1', 30, 'missed')]);
  // (b) 400 ms: matched.
  const slow = createDetectionTracker();
  feed(slow, ...at(100, 0));
  const moved = feed(slow, ...at(160, 400));
  assert.deepEqual([moved.events, x0(moved), restarts(moved)], [[], [['track-1', 0.16]], ['jump']]);
  // (c) The same observedAt with sequence 1 then 2: matched.
  const same = createDetectionTracker();
  feed(same, ...at(100, 0, { sequence: 1 }));
  const repeated = feed(same, ...at(100, 0, { sequence: 2 }));
  assert.deepEqual([repeated.status, repeated.events, rows(repeated), restarts(repeated)],
    ['updated', [], [['track-1', 'tracked', 0]], ['gap']]);
  // (d) 1300 after 0: staleness applies before the match; expiry at 2000 is not due.
  const gap = createDetectionTracker();
  feed(gap, ...at(100, 0));
  const back = feed(gap, ...at(100, 1300));
  assert.deepEqual(back.events,
    [change('lost', 'track-1', 1200, 'stale'), reappeared('track-1', 1300, 1300)]);
  assert.deepEqual([rows(back), restarts(back)], [[['track-1', 'tracked', 0]], ['reacquired']]);
  // (e) 200 px/s: one track throughout. At 400 and 1100 a 'jump' restart publishes measured.
  const steady = createDetectionTracker();
  const expected = { 0: ['new', 0.1], 40: [null, 0.1028], 400: ['jump', 0.18],
    430: [null, 0.1821], 1100: ['jump', 0.32] };
  for (const t of [0, 40, 400, 430, 1100]) {
    const snap = feed(steady, ...at(100 + 0.2 * t, t));
    assert.deepEqual([snap.events, ids(snap.tracks), restarts(snap)],
      [t ? [] : [entered('track-1', 0)], ['track-1'], [expected[t][0]]], `F${t}`);
    near(snap.tracks[0].geometry.points[0].x, expected[t][1]);
  }
}

// Geometry: one copy per frame, 100 ms apart from 0, 1000 x 1000.
const quadOf = points => ({ kind: 'quad', points, reader: 'rxing' });
const segmentOf = (p0, p1) => ({ kind: 'segment', points: [p0, p1], reader: 'rxing' });
const follow = (shapes, { symbology = 'qr_code', width = 1000, height = width,
  ...options } = {}) => {
  const tracker = createDetectionTracker(options);
  return shapes.map((geometry, k) => feed(tracker,
    report(code('R0VP', [{ geometry }], { symbology })), frameAt(100 * k, width, height)));
};
const geometryOf = snap => snap.tracks[0].geometry;
const norm = (points, width = 1000, height = width) =>
  points.map(p => ({ x: p.x / width, y: p.y / height }));

// T29: one case per validation rule (tolerance max(2, 0.02 x 1000) = 20 px).
{
  const first = (geometry, symbology) => follow([geometry], { symbology })[0];
  const partial = (snap, points, downgrade) => {
    const g = geometryOf(snap);
    assert.deepEqual([snap.dropped, g.kind, g.points, g.measured, g.downgrade, g.smoothed,
      g.restart, g.precise], [[], 'partial', norm(points), norm(points), downgrade, false, null,
      false]);
  };
  const [a, b, c, d] = sq(100, 100);
  partial(first(quadOf([a, b, c])), [a, b, c], 'count');
  partial(first(quadOf([a, b, { x: 200, y: NaN }, d])), [a, b, d], 'not-finite');
  partial(first(quadOf(sq(-25, 100))), sq(-25, 100).slice(1, 3), 'outside');
  const thin = [{ x: 100, y: 100 }, { x: 103.5, y: 100 }, { x: 103.5, y: 101 }, { x: 100, y: 101 }];
  partial(first(quadOf(thin)), thin, 'area');
  // |area| 2500 passes the area row; the turns are 10000, -20000, -15000 and 15000.
  const bow = [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 100, y: 200 }, { x: 250, y: 250 }];
  partial(first(quadOf(bow)), bow, 'not-convex');
  const ccw = [a, d, c, b];
  partial(first(quadOf(ccw)), ccw, 'counter-clockwise');
  // A segment too: one endpoint at x 1100 > 1020 gives 'outside'.
  const long = [{ x: 100, y: 500 }, { x: 1100, y: 500 }];
  partial(first(segmentOf(...long), 'code128'), [long[0]], 'outside');
  const short = [{ x: 100, y: 500 }, { x: 100.5, y: 500 }];
  partial(first(segmentOf(...short), 'code128'), [short[0]], 'length');
  const dropped = (geometry, reason) => {
    const snap = first(geometry);
    assert.deepEqual([snap.dropped, snap.tracks.map(t => [t.basis, t.geometry])],
      [[{ detectionIndex: 0, occurrenceIndex: 0, reason }], [['content', null]]]);
  };
  dropped({ kind: 'unavailable', points: [], reader: null }, 'unavailable');
  dropped({ kind: 'hexagon', points: sq(100, 100), reader: 'rxing' }, 'unknown-kind');
  // A partial with nothing left is dropped (its reason as for T4's quad).
  dropped({ kind: 'partial', points: sq(1100, 100), reader: 'rxing' }, 'outside');
  // The fourth point repeats the second one bit for bit.
  const row = dxs => dxs.map(dx => ({ x: 100 + dx, y: 100 }));
  const ten = first({ kind: 'partial', points: row([0, 10, 20, 10, 30, 40, 50, 60, 70, 80]),
    reader: 'rxing' });
  assert.deepEqual([geometryOf(ten).points, geometryOf(ten).downgrade],
    [norm(row([0, 10, 20, 30, 40, 50, 60, 70])), null]);
}

// T30: the tolerance is inclusive; precise needs every point within 1 source px of the frame.
{
  const [edge] = follow([quadOf(sq(-20, 100))]);
  assert.deepEqual([edge.dropped, geometryOf(edge).kind, geometryOf(edge).downgrade,
    geometryOf(edge).points, geometryOf(edge).precise], [[], 'quad', null, norm(sq(-20, 100)),
    false]);
  const [inside] = follow([quadOf(sq(100, 100))]);
  assert.deepEqual([geometryOf(inside).lag, geometryOf(inside).precise], [0, true]);
}

// T31: the QR family keeps the engine's order; a strictly better shift restarts 'reoriented'.
{
  const engine = sq(100, 400), turned = [...engine.slice(1), engine[0]];
  const [, snap] = follow([quadOf(engine), quadOf(turned)]);
  const g = geometryOf(snap);
  assert.deepEqual([snap.events, g.restart, g.smoothed, g.points, g.measured],
    [[], 'reoriented', false, norm(turned), norm(turned)]);
  assert.deepEqual([g.points[0], g.measured[0]], [{ x: 0.2, y: 0.4 }, { x: 0.2, y: 0.4 }]);
}

// T32: other quads take the best cyclic shift; 100 + 0.35 x 1 px gives x 0.10035 (closed form).
{
  const moved = sq(101, 100);
  const [, snap] = follow([quadOf(sq(100, 100)), quadOf([...moved.slice(1), moved[0]])],
    { symbology: 'data_matrix' });
  const g = geometryOf(snap);
  assert.deepEqual([snap.events, g.restart, g.smoothed, g.measured], [[], null, true, norm(moved)]);
  near(g.points[0].x, 0.10035);
  near(g.points[0].y, 0.1);
  // A square turned by theta costs sin²(theta / 2) against sin²(45° - theta / 2) for the
  // next shift. At 41° the ratio 1.402 <= 1.5 restarts 'reoriented' (RMS 49.5 px, no jump);
  // at 40° it is 1.527. The QR family keeps identity.
  near(Math.sin(24.5 * Math.PI / 180) ** 2 / Math.sin(20.5 * Math.PI / 180) ** 2, 1.402, 5e-4);
  near(Math.sin(25 * Math.PI / 180) ** 2 / Math.sin(20 * Math.PI / 180) ** 2, 1.527, 5e-4);
  const turnedBy = degrees => sq(100, 100).map(({ x, y }) => {
    const r = degrees * Math.PI / 180, dx = x - 150, dy = y - 150;
    return { x: 150 + dx * Math.cos(r) - dy * Math.sin(r), y: 150 + dx * Math.sin(r) +
      dy * Math.cos(r) };
  });
  const restartOf = (degrees, symbology) => geometryOf(follow([quadOf(sq(100, 100)),
    quadOf(turnedBy(degrees))], { symbology })[1]).restart;
  assert.deepEqual([restartOf(41, 'data_matrix'), restartOf(40, 'data_matrix'),
    restartOf(41, 'qr_code')], ['reoriented', null, null]);
  // An exact tie keeps the smallest shift. Each corner of the square is 2900 px² from two
  // diamond vertices, so shifts 0 and 3 both cost 11600.
  const diamond = [{ x: 150, y: 80 }, { x: 220, y: 150 }, { x: 150, y: 220 }, { x: 80, y: 150 }];
  const [, tie] = follow([quadOf(sq(100, 100)), quadOf(diamond)], { symbology: 'data_matrix' });
  assert.deepEqual([geometryOf(tie).restart, geometryOf(tie).measured],
    ['reoriented', norm(diamond)]);
}

// T33: a gated 0.6-size move in 100 ms (z² 5.76) jumps: RMS 60 px > 0.5 x 100 px.
{
  const [, snap] = follow([quadOf(sq(100, 100)), quadOf(sq(160, 100))]);
  const g = geometryOf(snap);
  assert.deepEqual([snap.events, g.restart, g.smoothed, g.points], [[], 'jump', false, g.measured]);
  near(g.points[0].x, 0.16);
  // The jump test's size ratios alone. Side 145 has an area ratio 2.1025 with RMS 45 px;
  // side 140 (1.96, RMS 40 px) blends. A segment of length 300 cut to 200 has a
  // squared-length ratio 0.444 with RMS 50 px < 150 px.
  const grown = side => geometryOf(follow([quadOf(sq(100, 100)), quadOf(sq(100, 100, side))])[1]);
  assert.deepEqual([grown(145).restart, grown(140).restart, grown(140).smoothed],
    ['jump', null, true]);
  const [, cut] = follow([segmentOf({ x: 100, y: 500 }, { x: 400, y: 500 }),
    segmentOf({ x: 150, y: 500 }, { x: 350, y: 500 })], { symbology: 'code128' });
  assert.deepEqual([cut.events, geometryOf(cut).restart], [[], 'jump']);
}

// T33a: 1280 x 720, a 120 px QR at 300 px/s (30 px a frame) for 2 s, then static for 1 s.
// Lag (L + 30) x 0.65 while moving, x 0.65 after the stop; precise needs lag <= 6 px.
{
  near(30 * 0.65 / 0.35, 55.71, 0.005);
  const xs = Array.from({ length: 31 }, (_, k) => 100 + 30 * Math.min(k, 20));
  const geometries = follow(xs.map(x => quadOf(sq(x, 300, 120))), { width: 1280, height: 720 })
    .map(geometryOf);
  assert.deepEqual(geometries.map(g => [g.kind, g.restart]),
    [['quad', 'new'], ...Array(30).fill(['quad', null])]);
  // The exact closed form of this input: 20 moving frames leave L20 = 55.714 (1 - 0.65^20).
  const lags = [0];
  for (let k = 1; k <= 30; k++) lags.push((lags[k - 1] + (k <= 20 ? 30 : 0)) * 0.65);
  geometries.forEach((g, k) => near(g.lag, lags[k], 1e-9));
  [19.5, 32.18, 40.41].forEach((lag, i) => near(lags[1 + i], lag, 0.005));
  near(lags[20], 55.71, 0.01);
  // Rounded values after the stop, decayed from the steady state 55.714. This input stops
  // at L20 = 55.704, so its fourth value is 9.9435 rather than 9.9453.
  [36.21, 23.54, 15.30, 9.95, 6.46, 4.20].forEach((lag, i) =>
    near(30 * 0.65 / 0.35 * 0.65 ** (i + 1), lag, 0.005));
  [36.21, 23.54, 15.30, 9.94, 6.46, 4.20].forEach((lag, i) => near(lags[21 + i], lag, 0.005));
  assert.deepEqual(geometries.map(g => g.precise),
    [true, ...Array(25).fill(false), ...Array(5).fill(true)]);
  // Closed form: precise holds below 6 / (0.1 x 0.65 / 0.35) = 32.3 px/s;
  // at 33 px/s the lag 6.129 (1 - 0.65^k) first exceeds 6 px at k = 9.
  near(6 / (0.1 * 0.65 / 0.35), 32.3, 0.01);
  const steady = speed => follow(Array.from({ length: 40 }, (_, k) =>
    quadOf(sq(100 + speed * k / 10, 300, 120))), { width: 1280, height: 720 })
    .map(snap => geometryOf(snap).precise);
  assert.deepEqual([steady(32), steady(33)],
    [Array(40).fill(true), [...Array(9).fill(true), ...Array(31).fill(false)]]);
}

// T34: a 2.08 px square at (50, 50) turned by atan(3/4) in a 100 x 100 frame. RMS 0.930 < 1.04
// and an area ratio 1 pass the gates; the blend area 4.3264 x 0.909 = 3.9327 < 4 (closed form).
{
  const before = sq(48.96, 48.96, 2.08);
  const after = [{ x: 49.792, y: 48.544 }, { x: 51.456, y: 49.792 }, { x: 50.208, y: 51.456 },
    { x: 48.544, y: 50.208 }];
  const d2 = after.map((p, i) => (p.x - before[i].x) ** 2 + (p.y - before[i].y) ** 2);
  near(Math.sqrt(d2.reduce((sum, x) => sum + x) / 4), 0.930, 5e-4);
  near(4.3264 * ((0.65 + 0.35 * 0.8) ** 2 + (0.35 * 0.6) ** 2), 3.9327, 5e-5);
  const [, snap] = follow([quadOf(before), quadOf(after)], { width: 100 });
  const g = geometryOf(snap);
  assert.deepEqual([snap.events, g.kind, g.restart, g.smoothed, g.points, g.measured],
    [[], 'quad', 'invalid-blend', false, norm(after, 100), norm(after, 100)]);
}

// T35: reversed endpoints moved 0.5 px are swapped back and blended, without a restart.
{
  const [, snap] = follow([segmentOf({ x: 100, y: 500 }, { x: 400, y: 500 }),
    segmentOf({ x: 400.5, y: 500 }, { x: 100.5, y: 500 })], { symbology: 'code128' });
  const g = geometryOf(snap);
  assert.deepEqual([snap.events, g.restart, g.smoothed, g.measured],
    [[], null, true, [{ x: 0.1005, y: 0.5 }, { x: 0.4005, y: 0.5 }]]);
  near(g.points[0].x, 0.100175);
  near(g.points[0].y, 0.5);
  near(g.points[1].x, 0.400175);
  near(g.points[1].y, 0.5);
}

// T36: partial geometry is never smoothed, and a quad after a partial restarts as 'kind'.
{
  const part = dx => ({ kind: 'partial', points: sq(100 + dx, 100).slice(0, 3), reader: 'rxing' });
  const snaps = follow([part(0), part(1), part(2), quadOf(sq(103, 100)), part(4)]);
  assert.deepEqual(snaps.map(snap => [snap.events.length, geometryOf(snap).kind,
    geometryOf(snap).smoothed, geometryOf(snap).restart]), [[1, 'partial', false, null],
    [0, 'partial', false, null], [0, 'partial', false, null], [0, 'quad', false, 'kind'],
    [0, 'partial', false, null]]);
  for (const snap of snaps) assert.deepEqual(geometryOf(snap).points, geometryOf(snap).measured);
  assert.deepEqual(geometryOf(snaps[2]).points, norm(sq(102, 100).slice(0, 3)));
}

// T37: 40 frames alternating +-0.5 px settle at -0.35 x 0.5 / 1.65 = -0.106061 px (closed form).
{
  near(0.35 * 0.5 / 1.65, 0.106061);
  const snaps = follow(Array.from({ length: 40 }, (_, k) => quadOf(sq(k % 2 ? 99.5 : 100.5, 100))));
  assert.deepEqual(snaps.slice(1).map(snap => [geometryOf(snap).restart,
    geometryOf(snap).smoothed]), Array(39).fill([null, true]));
  near(geometryOf(snaps[39]).points[0].x, 0.099894);
  near(geometryOf(snaps[39]).points[0].x * 1000 - 100, -0.106, 5e-4);
}

// { kind: 'fixed', alpha } equals the number form; { kind: 'none' } publishes every
// measurement unsmoothed and still names restarts.
{
  const xs = (smoothing, ...steps) => follow(steps.map(x => quadOf(sq(x, 100))), { smoothing })
    .map(snap => [geometryOf(snap).points[0].x, geometryOf(snap).smoothed,
      geometryOf(snap).restart]);
  assert.deepEqual(xs({ kind: 'fixed', alpha: 0.5 }, 100, 102), [[0.1, false, 'new'],
    [0.101, true, null]]);
  assert.deepEqual(xs(0.5, 100, 102), xs({ kind: 'fixed', alpha: 0.5 }, 100, 102));
  assert.deepEqual(xs({ kind: 'none' }, 100, 102, 162), [[0.1, false, 'new'],
    [0.102, false, null], [0.162, false, 'jump']]);
}

// Halving the resolution at the same aspect ratio leaves every decision and the fixed-alpha
// estimate unchanged: positions and history are compared in isotropic units u = px / long side.
{
  const pan = halve => {
    const tracker = createDetectionTracker({ smoothing: 0.35 });
    return [256, 268.8, 281.6].map((x, k) => {
      const f = halve && k === 2 ? 0.5 : 1;
      return feed(tracker, report(code('SVNP', [quad(sq(x * f, 288 * f, 128 * f))])),
        frameAt(100 * k, 1280 * f, 720 * f));
    });
  };
  const [full, half] = [pan(false), pan(true)].map(snaps => snaps.map(snap =>
    [snap.events, geometryOf(snap).restart, geometryOf(snap).smoothed, geometryOf(snap).points]));
  assert.deepEqual(half.map(row => row.slice(0, 3)), full.map(row => row.slice(0, 3)));
  assert.deepEqual(half[2].slice(1, 3), [null, true]);
  half[2][3].forEach((p, i) => {
    near(p.x, full[2][3][i].x, 1e-12);
    near(p.y, full[2][3][i].y, 1e-12);
  });
}

// T38: one-euro is not a smoothing option of this module (it runs only as the replay candidate
// replay/candidates/one-euro.mjs), so { kind: 'one-euro' } is refused like any unknown kind.
{
  const refusal = smoothing => {
    try {
      createDetectionTracker({ smoothing }).destroy();
    } catch (error) {
      return [error.constructor, error.message];
    }
    return null;
  };
  const refused = [RangeError,
    'smoothing must be a number in (0, 1], { kind: \'fixed\', alpha } or { kind: \'none\' }.'];
  assert.deepEqual([{ kind: 'one-euro', minCutoffHz: 1, beta: 0.01 },
    { kind: 'one-euro', minCutoffHz: 1, beta: 0.01, derivativeCutoffHz: 1 }, { kind: 'one-euro' },
    { kind: 'kalman', alpha: 0.35 }, {}].map(refusal), Array(5).fill(refused));
  assert.deepEqual([0.35, { kind: 'fixed', alpha: 1 }, { kind: 'none' }].map(refusal),
    [null, null, null]);
}

// T39: contain and cover keep their results; fill maps u x viewWidth and v x viewHeight.
{
  const view = { sourceWidth: 200, sourceHeight: 100, viewWidth: 100, viewHeight: 100 };
  assert.deepEqual(projectVideoPoint({ x: 0, y: 0 }, view), { x: 0, y: 25 });
  assert.deepEqual(projectVideoPoint({ x: 0, y: 0 }, { ...view, fit: 'cover', mirror: true }),
    { x: 150, y: 0 });
  assert.deepEqual(projectVideoPoint({ x: 0.25, y: 0.5 }, { ...view, fit: 'fill' }),
    { x: 25, y: 50 });
  assert.deepEqual(projectVideoPoint({ x: 0.25, y: 0.5 }, { ...view, fit: 'fill', mirror: true }),
    { x: 75, y: 50 });
  assert.throws(() => projectVideoPoint({ x: 0, y: 0 }, { ...view, fit: 'none' }), RangeError);
  assert.throws(() => projectVideoPoint({ x: NaN, y: 0 }, view), RangeError);
}

// T40: projectVideoGeometry. A 128 x 128 fill view maps 1/128 to exactly 1 CSS px.
{
  const fill = { sourceWidth: 128, sourceHeight: 128, viewWidth: 128, viewHeight: 128,
    fit: 'fill' };
  const shape = (points, precise = true) => ({ kind: 'quad', points, precise });
  const four = sq(64, 64, 4);
  assert.deepEqual(projectVideoGeometry(shape(norm(four, 128)), fill),
    { kind: 'quad', points: four, valid: true, inView: true, precise: true });
  const three = projectVideoGeometry(shape(norm(sq(64, 64, 3), 128)), fill);
  assert.deepEqual([three.valid, three.inView, three.precise], [false, true, false]);
  assert.equal(projectVideoGeometry(shape(norm(sq(64, 64, 3), 128)), fill, { minArea: 9 }).valid,
    true);
  // Mirroring flips the screen winding; one shared sign is accepted.
  const mirrored = projectVideoGeometry(shape(norm(four, 128)), { ...fill, mirror: true });
  assert.deepEqual(mirrored, { kind: 'quad', points: four.map(p => ({ x: 128 - p.x, y: p.y })),
    valid: true, inView: true, precise: true });
  const broken = projectVideoGeometry(shape([...norm(four, 128).slice(0, 3), { x: NaN, y: 0.5 }]),
    fill);
  assert.deepEqual([broken.valid, broken.precise], [false, false]);
  assert.equal(projectVideoGeometry(shape(norm(four, 128), false), fill).precise, false);
  // A partial is valid when finite, a segment when finite and at least 1 CSS px long.
  const loose = (kind, points) =>
    projectVideoGeometry({ kind, points, precise: false }, fill).valid;
  assert.deepEqual([loose('partial', norm(four, 128)),
    loose('partial', [...norm(four, 128).slice(0, 3), { x: NaN, y: 0.5 }])], [true, false]);
  const run = length => norm([{ x: 10, y: 10 }, { x: 10 + length, y: 10 }], 128);
  assert.deepEqual([loose('segment', run(1)), loose('segment', run(0.5))], [true, false]);
  // Cover: 1600 x 800 into 400 x 300 has scale 0.375 and x offset -100 (closed form).
  const cover = { sourceWidth: 1600, sourceHeight: 800, viewWidth: 400, viewHeight: 300,
    fit: 'cover' };
  near(Math.max(400 / 1600, 300 / 800), 0.375, 0);
  near((400 - 1600 * 0.375) / 2, -100, 0);
  const span = (x0, x1, y0 = 100, y1 = 700) => shape(norm([{ x: x0, y: y0 }, { x: x1, y: y0 },
    { x: x1, y: y1 }, { x: x0, y: y1 }], 1600, 800));
  const xsOf = projected => projected.points.map(p => p.x);
  const cropped = projectVideoGeometry(span(200, 400), cover);
  assert.deepEqual([xsOf(cropped), cropped.valid, cropped.inView, cropped.precise],
    [[-25, 50, 50, -25], true, false, false]);
  const hidden = projectVideoGeometry(span(0, 200), cover);
  assert.deepEqual([xsOf(hidden), hidden.inView, hidden.precise], [[-100, -25, -25, -100], false,
    false]);
  for (const x0 of [0, 200]) {
    const flipped = projectVideoGeometry(span(x0, x0 + 200), { ...cover, mirror: true });
    assert.deepEqual([flipped.valid, flipped.inView, flipped.precise], [true, false, false]);
  }
  const shown = projectVideoGeometry(span(600, 1000), cover);
  assert.deepEqual([shown.points, shown.valid, shown.inView, shown.precise],
    [[{ x: 125, y: 37.5 }, { x: 275, y: 37.5 }, { x: 275, y: 262.5 }, { x: 125, y: 262.5 }], true,
      true, true]);
}

// ------------------------------------------------------------------------ capture controller
// The legacy L42-87 assertions live on as T44, T46, T54, T55 and T57. The block keeps these
// fakes apart from the tracker cases' report, change and fakeClock.
{
  // Fakes only: clock, video with hand-fired rVFC, canvas, getUserMedia, tracks, decoder.
  const flush = async () => {
    for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve));
  };
  function fakeClock(start) {
    let t = start, serial = 0;
    const timers = new Map();
    const clock = {
      cleared: [],
      now: () => t,
      setTimeout(callback, ms) {
        const id = ++serial;
        timers.set(id, { id, at: t + Math.max(0, ms), callback });
        return id;
      },
      clearTimeout(id) { clock.cleared.push(id); timers.delete(id); },
      has: id => timers.has(id),
      pending: () => [...timers.values()].map(timer => timer.at),
      // Time that passes inside a synchronous call; no timer can fire meanwhile.
      tick(ms) { t += ms; },
      async advance(ms) {
        const end = t + ms;
        for (;;) {
          await flush();
          let next = null;
          for (const timer of timers.values()) {
            if (timer.at <= end && (!next || timer.at < next.at)) next = timer;
          }
          if (!next) break;
          timers.delete(next.id);
          t = Math.max(t, next.at);
          next.callback();
        }
        t = Math.max(t, end);
        await flush();
      },
    };
    return clock;
  }
  const counterPixels = () => {
    let n = 0;
    return (width, height) => new Uint8ClampedArray(width * height * 4).fill(++n % 251);
  };
  function rig({ rvfc = true, clockStart = 0, drawCost = 0 } = {}) {
    const clock = fakeClock(clockStart);
    const log = [];
    const document = new EventTarget();
    document.hidden = false;
    document.defaultView = new EventTarget();
    const video = {
      ownerDocument: document, readyState: 2, videoWidth: 64, videoHeight: 48, srcObject: null,
      muted: false, playsInline: false, inCallback: false, requests: 0, cancels: [], pending: null,
      play: async () => {}, pause() {},
    };
    if (rvfc) {
      video.requestVideoFrameCallback = callback => {
        video.pending = { handle: ++video.requests, callback };
        return video.requests;
      };
      video.cancelVideoFrameCallback = handle => {
        video.cancels.push(handle);
        if (video.pending && video.pending.handle === handle) video.pending = null;
      };
      // rVFC is one-shot: firing consumes the armed request.
      video.fire = (now, metadata = {}) => {
        const request = video.pending;
        if (!request) throw new Error('no frame request is armed');
        video.pending = null;
        video.inCallback = true;
        try { request.callback(now, metadata); } finally { video.inCallback = false; }
      };
    }
    const env = { clock, log, document, video, draws: [], pixels: counterPixels(),
      contextOptions: [] };
    const context = {
      drawImage(source, x, y, width, height) {
        env.draws.push({ at: clock.now(), inCallback: video.inCallback, width, height });
        clock.tick(drawCost);
      },
      getImageData: (x, y, width, height) => ({ data: env.pixels(width, height), width, height }),
    };
    env.canvas = { width: 0, height: 0, getContext(type, options) {
      env.contextOptions.push([type, options]);
      return env.context;
    } };
    env.context = context;
    document.createElement = tag => { log.push('createElement:' + tag); return env.canvas; };
    const track = new EventTarget();
    track.stops = 0;
    track.muted = false;
    track.stop = () => { track.stops++; log.push('track.stop'); };
    env.track = track;
    env.stream = { getTracks: () => [track] };
    env.gum = { calls: [], next: null };
    env.mediaDevices = { getUserMedia(constraints) {
      env.gum.calls.push(constraints);
      log.push('getUserMedia');
      return env.gum.next ? env.gum.next(constraints) : Promise.resolve(env.stream);
    } };
    return env;
  }
  // A decoder whose requests the test settles by hand; it counts outstanding requests.
  function decoder() {
    const dec = { calls: [], outstanding: 0, maxOutstanding: 0 };
    dec.scanFrame = (rgba, width, height, context) => new Promise((resolve, reject) => {
      const call = { rgba, width, height, context, settled: false };
      const settle = fn => value => {
        if (call.settled) return;
        call.settled = true;
        dec.outstanding--;
        fn(value);
      };
      call.resolve = settle(resolve);
      call.reject = settle(reject);
      dec.outstanding++;
      dec.maxOutstanding = Math.max(dec.maxOutstanding, dec.outstanding);
      dec.calls.push(call);
    });
    return dec;
  }
  function fakeTracker(log) {
    const tracker = { calls: [] };
    tracker.update = (report, frame, options) => {
      log.push('tracker.update');
      const snapshot = { status: 'updated', serial: tracker.calls.length };
      tracker.calls.push({ method: 'update', report, frame, options, snapshot });
      return snapshot;
    };
    tracker.reset = options => {
      log.push('tracker.reset');
      tracker.calls.push({ method: 'reset', options });
      return { status: 'reset' };
    };
    return tracker;
  }
  const report = (label = 'r') => ({ label, detections: [] });
  // Counts a target's listeners, so a test can see that teardown removed what a session added.
  function listenerCounts(target) {
    let added = 0, live = 0;
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, listener) => { added++; live++; add(type, listener); };
    target.removeEventListener = (type, listener) => { live--; remove(type, listener); };
    return { added: () => added, live: () => live };
  }
  function camera(env, options = {}) {
    const states = [], results = [], errors = [];
    const scanner = createCameraScanner({
      video: env.video, mediaDevices: env.mediaDevices, clock: env.clock, intervalMs: 100,
      onResult: (rep, frame, snapshot) => results.push({ report: rep, frame, snapshot }),
      onError: error => errors.push(error),
      onState: change => states.push(change),
      ...options,
    });
    return { scanner, states, results, errors, reasons: () => states.map(s => s.reason) };
  }

  // T41
  for (const [captureTime, expected] of [[1200, 1200], [1300, null], [undefined, null]]) {
    const env = rig({ clockStart: 1000 });
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    assert.equal(c.scanner.source, null);
    await c.scanner.start();
    assert.equal(c.scanner.state, 'running');
    assert.equal(c.scanner.source, 'video-frame-callback');
    await env.clock.advance(100);
    assert.equal(env.video.requests, 1);
    await env.clock.advance(134.5);
    env.video.fire(1234.5, { captureTime, mediaTime: 3.2, presentedFrames: 77 });
    assert.equal(dec.calls.length, 1);
    const call = dec.calls[0];
    assert.deepEqual([call.width, call.height, call.rgba.length], [64, 48, 64 * 48 * 4]);
    assert.deepEqual(call.context.frame, {
      width: 64, height: 48, observedAt: 1234.5, epoch: c.scanner.epoch, sequence: 1,
      source: 'video-frame-callback', captureTime: expected, mediaTime: 3.2, presentedFrames: 77,
      videoWidth: 64, videoHeight: 48, decodeStartedAt: 1234.5, decoderGeneration: 0,
    });
    assert.equal(call.context.signal.aborted, false);
    assert.deepEqual(env.draws, [{ at: 1234.5, inCallback: true, width: 64, height: 48 }]);
    assert.deepEqual(env.contextOptions, [['2d', { willReadFrequently: true }]]);
    call.resolve(report('a'));
    await flush();
    assert.equal(c.results.length, 1);
    assert.deepEqual(c.results[0].frame, { ...call.context.frame, completedAt: 1234.5 });
    assert.equal(c.results[0].snapshot, null);
    c.scanner.stop();
  }

  // T42
  {
    const env = rig({ rvfc: false, clockStart: 900, drawCost: 7 });
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    assert.equal(c.scanner.source, 'timer');
    await env.clock.advance(100);
    assert.equal(dec.calls.length, 1);
    assert.deepEqual(dec.calls[0].context.frame, {
      width: 64, height: 48, observedAt: 1000, epoch: c.scanner.epoch, sequence: 1,
      source: 'timer', captureTime: null, mediaTime: null, presentedFrames: null,
      videoWidth: 64, videoHeight: 48, decodeStartedAt: 1007, decoderGeneration: 0,
    });
    assert.deepEqual(env.draws, [{ at: 1000, inCallback: false, width: 64, height: 48 }]);
    // One scanFrame outstanding on this path: no capture while it is pending.
    await env.clock.advance(1000);
    assert.deepEqual([dec.calls.length, env.draws.length, dec.maxOutstanding], [1, 1, 1]);
    dec.calls[0].resolve(report());
    await flush();
    assert.deepEqual(c.results.map(r => r.frame.completedAt), [2007]);
    await env.clock.advance(99);
    assert.equal(env.draws.length, 1);
    await env.clock.advance(1);
    assert.deepEqual([dec.calls.length, env.draws.length, dec.maxOutstanding], [2, 2, 1]);
    const second = dec.calls[1].context.frame;
    assert.deepEqual([second.observedAt, second.decodeStartedAt, second.sequence], [2107, 2114, 2]);
    dec.calls[1].resolve(report());
    await flush();
    c.scanner.stop();
    await env.clock.advance(1000);
    assert.deepEqual([dec.calls.length, env.draws.length, c.results.length], [2, 2, 2]);
    assert.deepEqual(env.clock.pending(), []);
    assert.equal(c.scanner.state, 'stopped');
  }

  const lastState = c => c.states[c.states.length - 1];
  const change = (c, fields) => ({ state: 'running', previous: 'running', error: null,
    epoch: c.scanner.epoch, decoderGeneration: 0, muted: false, stalled: false,
    source: 'video-frame-callback', ...fields });

  // T43 (the stall timer runs from the frame request at 100)
  {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    assert.equal(env.video.requests, 1);
    await env.clock.advance(1999);
    assert.equal(c.scanner.stalled, false);
    await env.clock.advance(1);
    assert.equal(c.scanner.stalled, true);
    assert.deepEqual(lastState(c), change(c, { reason: 'stalled', stalled: true }));
    await env.clock.advance(5000);
    assert.deepEqual([env.video.requests, env.video.cancels.length, env.draws.length,
      dec.calls.length, c.states.length], [1, 0, 0, 0, 3]);
    env.video.fire(7100, { presentedFrames: 1 });
    assert.equal(c.scanner.stalled, false);
    assert.deepEqual(lastState(c), change(c, { reason: 'frames-resumed' }));
    assert.deepEqual([env.draws.length, dec.calls.length], [1, 1]);
    assert.equal(dec.calls[0].context.frame.observedAt, 7100);
    assert.deepEqual(c.reasons(), ['start', 'start', 'stalled', 'frames-resumed']);
    c.scanner.stop();
  }

  // T43a (controller half: repeated presentedFrames, or mediaTime without it, then silence)
  for (const meta of [{ presentedFrames: 5, mediaTime: 1 }, { mediaTime: 1 }]) {
    const env = rig();
    const dec = decoder();
    const tracker = fakeTracker(env.log);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, meta);
    dec.calls[0].resolve(report('qr'));
    await flush();
    const updates = () => tracker.calls.filter(call => call.method === 'update');
    assert.deepEqual(updates().map(call => [call.frame.observedAt, call.frame.presentedFrames]),
      [[100, meta.presentedFrames ?? null]]);
    await env.clock.advance(100);
    assert.equal(env.video.requests, 2);
    for (let i = 0; i < 3; i++) {
      await env.clock.advance(500);
      env.video.fire(env.clock.now(), meta);
    }
    // Each repeat requests again at once and captures nothing.
    assert.deepEqual([env.video.requests, dec.calls.length, env.draws.length, updates().length],
      [5, 1, 1, 1]);
    // Repeats are not new frames: the stall timer armed by the request at 200 keeps running.
    await env.clock.advance(499);
    assert.equal(c.scanner.stalled, false);
    await env.clock.advance(1);
    assert.equal(c.scanner.stalled, true);
    assert.deepEqual([dec.calls.length, updates().length, env.video.cancels.length], [1, 1, 0]);
    c.scanner.stop();
  }

  // T43b (controller half: identical pixels on the timer path)
  {
    const env = rig({ rvfc: false });
    const frozen = new Uint8ClampedArray(64 * 48 * 4).fill(7);
    env.pixels = () => frozen.slice();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    assert.equal(dec.calls.length, 1);
    dec.calls[0].resolve(report());
    await flush();
    await env.clock.advance(100);
    assert.deepEqual([env.draws.length, dec.calls.length], [2, 1]);
    // Identical hashes from the request at 200 for stallMs set stalled at 2200.
    await env.clock.advance(1999);
    assert.deepEqual([c.scanner.stalled, env.draws.length, dec.calls.length], [false, 21, 1]);
    await env.clock.advance(1);
    assert.deepEqual([c.scanner.stalled, dec.calls.length], [true, 1]);
    assert.deepEqual(lastState(c),
      change(c, { reason: 'stalled', stalled: true, source: 'timer' }));
    // First grid sample: column centre floor(64 / 64) = 1, row centre floor(48 / 64) = 0.
    const changed = frozen.slice();
    changed[(0 * 64 + 1) * 4] = 8;
    env.pixels = () => changed.slice();
    await env.clock.advance(100);
    assert.deepEqual([c.scanner.stalled, dec.calls.length], [false, 2]);
    assert.deepEqual(lastState(c), change(c, { reason: 'frames-resumed', source: 'timer' }));
    assert.equal(dec.calls[1].context.frame.sequence, 2);
    c.scanner.stop();
  }

  // T44 (with the legacy L55-65 assertions: stopping discards the pending result)
  {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    const callback = env.video.pending.callback;
    env.video.fire(100, { presentedFrames: 1 });
    for (let i = 2; i < 5; i++) callback(100 + i, { presentedFrames: i });
    await env.clock.advance(3000);
    assert.deepEqual([dec.calls.length, env.video.requests, env.draws.length], [1, 1, 1]);
    dec.calls[0].resolve(report());
    await flush();
    await env.clock.advance(99);
    assert.equal(env.video.requests, 1);
    await env.clock.advance(1);
    assert.equal(env.video.requests, 2);
    env.video.fire(3200, { presentedFrames: 9 });
    assert.deepEqual([dec.calls.length, dec.maxOutstanding], [2, 1]);
    c.scanner.stop();
    dec.calls[1].resolve(report());
    await flush();
    assert.deepEqual([c.results.length, env.track.stops, env.video.pending, env.video.srcObject],
      [1, 1, null, null]);
    assert.equal(dec.calls[1].context.signal.aborted, false);
  }

  // T44a
  {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    dec.calls[0].resolve(report());
    await flush();
    assert.deepEqual(env.clock.pending(), [200]);
    await env.clock.advance(50);
    c.scanner.stop();
    assert.deepEqual(env.clock.pending(), []);
    await env.clock.advance(1000);
    assert.deepEqual([env.video.requests, env.draws.length, dec.calls.length, env.video.cancels],
      [1, 1, 1, []]);
  }

  // T45 (controller half: completedAt, the tracker call and its order; statuses need the tracker)
  for (const decodeMs of [900, 1300]) {
    const env = rig({ clockStart: 900 });
    const dec = decoder();
    const tracker = fakeTracker(env.log);
    const delivered = [];
    const c = camera(env, { scanFrame: dec.scanFrame, tracker, onResult(rep, frame, snapshot) {
      env.log.push('onResult');
      delivered.push({ rep, frame, snapshot });
    } });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(1000, { presentedFrames: 1 });
    await env.clock.advance(decodeMs);
    const decoded = report('qr');
    dec.calls[0].resolve(decoded);
    await flush();
    const [update] = tracker.calls;
    assert.equal(update.method, 'update');
    const { observedAt, decodeStartedAt, completedAt } = update.frame;
    assert.deepEqual([observedAt, decodeStartedAt, completedAt], [1000, 1000, 1000 + decodeMs]);
    assert.deepEqual(update.options, { now: 1000 + decodeMs });
    assert.equal(update.report, decoded);
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].rep, decoded);
    assert.equal(delivered[0].frame, update.frame);
    assert.equal(delivered[0].snapshot, update.snapshot);
    assert.deepEqual(env.log,
      ['getUserMedia', 'createElement:canvas', 'tracker.update', 'onResult']);
    c.scanner.stop();
  }

  // T46 (legacy L66-78: a restart waits for the old request and discards its result)
  {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame, intervalMs: 0 });
    await c.scanner.start();
    await env.clock.advance(0);
    env.video.fire(1, { presentedFrames: 1 });
    const firstEpoch = c.scanner.epoch;
    c.scanner.stop();
    await c.scanner.start();
    assert.equal(c.scanner.epoch, firstEpoch + 1);
    await env.clock.advance(1000);
    assert.deepEqual([dec.calls.length, env.video.requests], [1, 1],
      'restart waits for old in-flight worker request');
    dec.calls[0].resolve(report('old'));
    await env.clock.advance(0);
    assert.equal(env.video.requests, 2);
    env.video.fire(1100, { presentedFrames: 2 });
    assert.deepEqual([dec.calls.length, c.results.length], [2, 0]);
    const frame = dec.calls[1].context.frame;
    assert.deepEqual([frame.epoch, frame.sequence], [firstEpoch + 1, 1]);
    c.scanner.stop();
    dec.calls[1].resolve(report('late'));
    await flush();
    assert.equal(c.results.length, 0);
    assert.deepEqual(dec.calls.map(call => call.context.signal.aborted), [false, false]);
  }

  // An adapter that honours abort: it terminates its fake worker, then rejects.
  function abortingWorker() {
    const worker = { calls: [], outstanding: 0, maxOutstanding: 0, terminated: 0 };
    worker.scanFrame = (rgba, width, height, { signal, frame }) =>
      new Promise((resolve, reject) => {
        const call = { frame, signal, settled: false };
        const settle = () => { call.settled = true; worker.outstanding--; };
        call.resolve = value => { if (!call.settled) { settle(); resolve(value); } };
        signal.addEventListener('abort', () => {
          if (call.settled) return;
          worker.terminated++;
          settle();
          reject(signal.reason);
        });
        worker.outstanding++;
        worker.maxOutstanding = Math.max(worker.maxOutstanding, worker.outstanding);
        worker.calls.push(call);
      });
    return worker;
  }
  const recorder = (settle = 'manual') => {
    const recovers = [];
    recovers.recover = (cause, context) => new Promise((resolve, reject) => {
      recovers.push({ cause, context, resolve, reject });
      if (settle === 'resolve') resolve();
    });
    return recovers;
  };

  // T46a
  {
    const env = rig();
    const worker = abortingWorker();
    const recovers = recorder();
    const c = camera(env, { scanFrame: worker.scanFrame, recover: recovers.recover });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    const { signal } = worker.calls[0];
    c.scanner.stop();
    const started = c.scanner.start();
    await env.clock.advance(10);
    assert.equal(signal.aborted, false);
    const switched = c.scanner.setConstraints({ deviceId: { exact: 'b' } });
    assert.equal(signal.aborted, false);
    await env.clock.advance(10);
    c.scanner.stop();
    const restarted = c.scanner.start();
    await Promise.all([started, switched, restarted]);
    // Each advance(10) lets the fake getUserMedia settle, so every step reaches running.
    assert.deepEqual(c.states.map(s => s.state), ['starting', 'running', 'stopped', 'starting',
      'running', 'starting', 'running', 'stopped', 'starting', 'running']);
    assert.deepEqual(c.reasons(), ['start', 'start', 'stop', 'start', 'start', 'constraints',
      'constraints', 'stop', 'start', 'start']);
    assert.deepEqual(env.gum.calls[2], { audio: false, video: { deviceId: { exact: 'b' } } });
    assert.deepEqual(env.gum.calls[3], { audio: false, video: { deviceId: { exact: 'b' } } });
    assert.deepEqual([env.gum.calls.length, env.track.stops], [4, 3]);
    // The running session's first scanFrame waits for the slot.
    await env.clock.advance(4979);
    assert.deepEqual([signal.aborted, worker.calls.length, env.video.requests], [false, 1, 1]);
    await env.clock.advance(1);
    assert.deepEqual([signal.aborted, worker.terminated, worker.outstanding], [true, 1, 0]);
    assert.equal(c.scanner.state, 'recovering');
    assert.deepEqual(recovers.map(r => [r.cause.code, r.context.decoderGeneration]),
      [['decode_timeout', 0]]);
    await env.clock.advance(1000);
    assert.deepEqual([worker.calls.length, env.video.requests], [1, 1]);
    recovers[0].resolve();
    await env.clock.advance(100);
    env.video.fire(6200, { presentedFrames: 1 });
    assert.equal(worker.calls.length, 2);
    assert.deepEqual([worker.calls[1].frame.decoderGeneration, worker.calls[1].frame.sequence,
      worker.calls[1].frame.epoch], [1, 1, c.scanner.epoch]);
    assert.deepEqual([worker.maxOutstanding, c.results.length, c.errors.length], [1, 0, 0]);
    c.scanner.stop();
  }

  // T49
  {
    const env = rig();
    const dec = decoder();
    const tracker = fakeTracker(env.log);
    const recovers = recorder();
    const c = camera(env, { scanFrame: dec.scanFrame, tracker, recover: recovers.recover });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    const hung = dec.calls[0].context.signal;
    await env.clock.advance(4999);
    assert.deepEqual([hung.aborted, recovers.length], [false, 0]);
    await env.clock.advance(1);
    assert.deepEqual([hung.aborted, c.scanner.state, recovers.length], [true, 'recovering', 1]);
    const { cause, context } = recovers[0];
    assert.equal(cause instanceof CameraScannerError, true);
    assert.deepEqual([cause.name, cause.code, context.decoderGeneration, context.signal.aborted],
      ['CameraScannerError', 'decode_timeout', 0, false]);
    assert.equal(hung.reason, cause);
    assert.deepEqual(lastState(c),
      change(c, { state: 'recovering', reason: 'recover', error: cause }));
    await env.clock.advance(1000);
    assert.equal(dec.calls.length, 1);
    recovers[0].resolve();
    await flush();
    assert.deepEqual([c.scanner.decoderGeneration, c.scanner.state], [1, 'running']);
    assert.deepEqual(lastState(c),
      change(c, { previous: 'recovering', reason: 'recovered', decoderGeneration: 1 }));
    await env.clock.advance(99);
    assert.equal(env.video.requests, 1);
    await env.clock.advance(1);
    assert.equal(env.video.requests, 2);
    env.video.fire(6200, { presentedFrames: 2 });
    assert.equal(dec.calls[1].context.frame.decoderGeneration, 1);
    dec.calls[1].resolve(report('after'));
    await flush();
    dec.calls[0].resolve(report('hung'));
    await flush();
    const updates = tracker.calls.filter(call => call.method === 'update');
    assert.deepEqual(updates.map(u => [u.report.label, u.frame.decoderGeneration]), [['after', 1]]);
    assert.deepEqual(c.results.map(r => [r.report.label, r.frame.decoderGeneration, r.snapshot]),
      [['after', 1, updates[0].snapshot]]);
    assert.deepEqual(c.errors, []);
    c.scanner.stop();
  }

  const rejection = async promise => {
    try { await promise; } catch (error) { return error; }
    throw new Error('expected a rejection');
  };

  // T50
  {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    await env.clock.advance(5000);
    assert.equal(c.scanner.state, 'failed');
    assert.deepEqual(c.errors.map(e => e.code), ['decode_timeout']);
    assert.equal(lastState(c).error, c.errors[0]);
    assert.deepEqual([env.track.stops, env.video.srcObject, dec.calls[0].context.signal.aborted],
      [1, null, true]);
    const states = c.states.length;
    const refused = await rejection(c.scanner.start());
    assert.deepEqual([refused.code, refused === c.errors[1], refused.cause === c.errors[0]],
      ['decode_timeout', true, true]);
    assert.deepEqual([env.gum.calls.length, c.errors.length, c.states.length, c.scanner.state],
      [1, 2, states, 'failed']);
    dec.calls[0].resolve(report('hung'));
    await flush();
    await c.scanner.start();
    assert.deepEqual([c.scanner.state, env.gum.calls.length, c.results.length], ['running', 2, 0]);
    c.scanner.stop();
  }
  // T50, timeout while the next session starts (no recover, or maxRecoveries 0): it fails once
  // running, because nothing can replace the decoder that holds the slot.
  for (const extra of [{}, { recover: async () => {}, maxRecoveries: 0 }]) {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame, ...extra });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    c.scanner.stop();
    let grant;
    env.gum.next = () => new Promise(resolve => { grant = resolve; });
    const starting = c.scanner.start();
    await env.clock.advance(5000);
    assert.deepEqual([c.scanner.state, dec.calls[0].context.signal.aborted, c.errors.length],
      ['starting', true, 0]);
    grant(env.stream);
    // The start rejects with the object that onError received, once.
    assert.equal(await rejection(starting), c.errors[0]);
    assert.equal(c.scanner.state, 'failed');
    assert.deepEqual(c.errors.map(e => [e.code, e.cause.code]),
      [['decode_timeout', 'decode_timeout']]);
    assert.deepEqual([env.video.requests, dec.calls.length, env.video.srcObject], [1, 1, null]);
  }
  // A throw from onError while the session fails is rethrown from a microtask, like every other
  // report: start() still returns its promise, which rejects with the error onError received,
  // whether the hung decoder refuses the start up front or fails it once the camera opened.
  for (const abandonedBeforeStart of [true, false]) {
    const env = rig();
    const dec = decoder();
    const received = [], caught = [], late = new Error('onError failed');
    const hook = error => caught.push(error);
    const c = camera(env, { scanFrame: dec.scanFrame, onError: error => {
      received.push(error);
      throw late;
    } });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    c.scanner.stop();
    process.on('uncaughtException', hook);
    let starting = null, threw = null;
    try {
      if (abandonedBeforeStart) {
        await env.clock.advance(5000);
        starting = c.scanner.start();
      } else {
        let grant;
        env.gum.next = () => new Promise(resolve => { grant = resolve; });
        starting = c.scanner.start();
        await env.clock.advance(5000);
        grant(env.stream);
      }
    } catch (error) {
      threw = error;
    }
    const error = starting ? await rejection(starting) : null;
    await new Promise(resolve => setTimeout(resolve, 0));
    process.off('uncaughtException', hook);
    assert.deepEqual([threw, error instanceof CameraScannerError, error === received[0],
      received.length, error?.code, c.scanner.state, caught],
    [null, true, true, 1, 'decode_timeout', 'failed', [late]]);
  }

  // T51
  {
    const env = rig();
    const dec = decoder();
    const recovers = recorder('resolve');
    const c = camera(env, { scanFrame: dec.scanFrame, recover: recovers.recover });
    await c.scanner.start();
    for (let hang = 1; hang <= 3; hang++) {
      await env.clock.advance(100);
      env.video.fire(env.clock.now(), { presentedFrames: hang });
      await env.clock.advance(5000);
    }
    assert.deepEqual(recovers.map(r => r.context.decoderGeneration), [0, 1]);
    assert.deepEqual([c.scanner.state, c.scanner.decoderGeneration], ['failed', 2]);
    assert.deepEqual(c.errors.map(e => e.code), ['decode_timeout']);
    // A new start() resets the count; the hung decoder is recovered before the first capture.
    await c.scanner.start();
    await flush();
    assert.deepEqual(recovers.map(r => r.context.decoderGeneration), [0, 1, 2]);
    assert.deepEqual([c.scanner.state, c.scanner.decoderGeneration], ['running', 3]);
    await env.clock.advance(100);
    env.video.fire(env.clock.now(), { presentedFrames: 1 });
    assert.deepEqual([dec.calls.length, dec.calls[3].context.frame.decoderGeneration], [4, 3]);
    c.scanner.stop();
  }

  // T52
  {
    const env = rig();
    const dec = decoder();
    const recovers = recorder();
    const c = camera(env, { scanFrame: dec.scanFrame, recover: recovers.recover });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    await env.clock.advance(5000);
    assert.equal(c.scanner.state, 'recovering');
    const { signal } = recovers[0].context;
    await env.clock.advance(19999);
    assert.deepEqual([c.scanner.state, signal.aborted], ['recovering', false]);
    await env.clock.advance(1);
    assert.deepEqual([c.scanner.state, signal.aborted], ['failed', true]);
    assert.deepEqual(c.errors.map(e => [e.code, e.cause]), [['recover_failed', undefined]]);
    assert.equal(signal.reason, c.errors[0]);
    assert.deepEqual(lastState(c), change(c,
      { state: 'failed', previous: 'recovering', reason: 'error', error: c.errors[0] }));
    assert.deepEqual([env.track.stops, env.video.srcObject], [1, null]);
  }

  // T53
  {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    dec.calls[0].reject(new Error('boom'));
    await flush();
    assert.equal(c.scanner.state, 'failed');
    assert.deepEqual(c.errors.map(e => [e.code, e.cause.message]), [['decode_failed', 'boom']]);
    assert.deepEqual([env.track.stops, env.video.srcObject], [1, null]);
  }
  {
    const env = rig();
    const dec = decoder();
    const recovers = recorder('resolve');
    const c = camera(env, { scanFrame: dec.scanFrame, recover: recovers.recover });
    await c.scanner.start();
    const failOnce = async (presentedFrames, settle) => {
      await env.clock.advance(100);
      env.video.fire(env.clock.now(), { presentedFrames });
      settle(dec.calls[dec.calls.length - 1]);
      await flush();
    };
    await failOnce(1, call => call.reject(new Error('boom')));
    assert.deepEqual([c.scanner.state, c.scanner.decoderGeneration], ['running', 1]);
    assert.deepEqual(recovers.map(r => [r.cause.code, r.cause.cause.message]),
      [['decode_failed', 'boom']]);
    await failOnce(2, call => call.resolve(report('resumed')));
    assert.deepEqual(c.results.map(r => [r.report.label, r.frame.decoderGeneration]),
      [['resumed', 1]]);
    await failOnce(3, call => call.reject(new Error('boom')));
    await failOnce(4, call => call.reject(new Error('boom')));
    assert.equal(recovers.length, 2);
    assert.deepEqual([c.scanner.state, c.errors.map(e => e.code)], ['failed', ['decode_failed']]);
  }

  // T57 (legacy L42-54 x 3: a late permission answer cannot activate capture)
  for (const departure of ['stop', 'hidden', 'pagehide']) {
    const env = rig();
    let grant;
    env.gum.next = () => new Promise(resolve => { grant = resolve; });
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    const starting = c.scanner.start();
    assert.equal(c.scanner.start(), starting, 'concurrent starts share permission request');
    if (departure === 'stop') c.scanner.stop();
    if (departure === 'pagehide') env.document.defaultView.dispatchEvent(new Event('pagehide'));
    if (departure === 'hidden') {
      env.document.hidden = true;
      env.document.dispatchEvent(new Event('visibilitychange'));
      env.document.hidden = false;
    }
    grant(env.stream);
    await starting;
    assert.deepEqual([env.gum.calls.length, env.track.stops, env.video.srcObject], [1, 1, null]);
    assert.deepEqual([c.scanner.state, lastState(c).reason], ['stopped', departure]);
    await env.clock.advance(1000);
    assert.deepEqual([env.video.requests, dec.calls.length, c.errors.length], [0, 0, 0]);
  }

  // T57 (with the tracker option: one reset at the departure, nothing after the late answer)
  for (const departure of ['stop', 'hidden', 'pagehide']) {
    const env = rig();
    let grant;
    env.gum.next = () => new Promise(resolve => { grant = resolve; });
    const tracker = fakeTracker(env.log);
    const c = camera(env, { scanFrame: decoder().scanFrame, tracker });
    const before = c.scanner.epoch;
    const starting = c.scanner.start();
    if (departure === 'stop') c.scanner.stop();
    if (departure === 'pagehide') env.document.defaultView.dispatchEvent(new Event('pagehide'));
    if (departure === 'hidden') {
      env.document.hidden = true;
      env.document.dispatchEvent(new Event('visibilitychange'));
      env.document.hidden = false;
    }
    assert.deepEqual(tracker.calls.map(call => [call.method, call.options]),
      [['reset', { epoch: before + 1 }]]);
    grant(env.stream);
    await starting;
    await env.clock.advance(1000);
    assert.deepEqual([tracker.calls.length, c.scanner.epoch, c.states.map(s => s.reason)],
      [1, before + 1, ['start', departure]]);
  }

  // T55 (legacy L80-84: browser revocation ends capture and surfaces the failure)
  {
    const env = rig();
    const c = camera(env, { scanFrame: decoder().scanFrame });
    await c.scanner.start();
    const before = c.scanner.epoch;
    env.track.dispatchEvent(new Event('ended'));
    assert.deepEqual(c.errors.map(e => [e.code, e.message]),
      [['stream_ended', 'Camera stream ended.']]);
    assert.deepEqual([c.scanner.state, env.video.srcObject, env.track.stops], ['failed', null, 1]);
    assert.deepEqual([lastState(c).previous, lastState(c).reason, lastState(c).error,
      c.scanner.epoch], ['running', 'error', c.errors[0], before + 1]);
    env.track.dispatchEvent(new Event('ended'));
    assert.equal(c.errors.length, 1);
    // T54, play() row (legacy L85-87): a play failure releases the tracks.
    env.video.play = async () => { throw new Error('play denied'); };
    const failure = await rejection(c.scanner.start());
    assert.deepEqual([failure.code, failure.cause.message, failure === c.errors[1]],
      ['play_failed', 'play denied', true]);
    assert.deepEqual([c.scanner.state, env.video.srcObject, env.track.stops], ['failed', null, 2]);
  }

  // T55 (the stream ends while play() is pending: start() rejects with onError's object)
  {
    const env = rig();
    let playing;
    env.video.play = () => new Promise(resolve => { playing = resolve; });
    const c = camera(env, { scanFrame: decoder().scanFrame });
    const starting = c.scanner.start();
    await flush();
    assert.deepEqual([c.scanner.state, env.video.srcObject], ['starting', env.stream]);
    env.track.dispatchEvent(new Event('ended'));
    playing();
    const failure = await rejection(starting);
    assert.deepEqual([failure.code, c.errors, c.scanner.state, env.video.srcObject, env.track.stops,
      env.log.includes('createElement:canvas')], ['stream_ended', [failure], 'failed', null, 1,
      false]);
  }

  // T54, getUserMedia and getContext rows (typed codes keep the native cause)
  for (const [name, code] of [['NotAllowedError', 'permission_denied'],
    ['SecurityError', 'permission_denied'], ['NotFoundError', 'device_not_found'],
    ['NotReadableError', 'device_busy'], ['AbortError', 'device_busy'],
    ['OverconstrainedError', 'constraints_unsatisfied'], ['TypeError', 'constraints_unsatisfied'],
    ['UnknownError', 'start_failed'], ['toString', 'start_failed']]) {
    const env = rig();
    const native = Object.assign(new Error(name), { name });
    env.gum.next = () => Promise.reject(native);
    const page = listenerCounts(env.document), view = listenerCounts(env.document.defaultView);
    const c = camera(env, { scanFrame: decoder().scanFrame });
    const failure = await rejection(c.scanner.start());
    assert.deepEqual([failure.code, failure.cause, c.errors, c.scanner.state],
      [code, native, [failure], 'failed']);
    assert.deepEqual([failure instanceof CameraScannerError, lastState(c).previous,
      lastState(c).reason, lastState(c).error, env.video.srcObject, env.track.stops],
    [true, 'starting', 'error', failure, null, 0]);
    // The departure listeners, installed before the prompt, went with the session.
    assert.deepEqual([page.added(), view.added(), page.live(), view.live()], [1, 1, 0, 0]);
  }
  // T54, unsupported and getContext rows
  {
    const env = rig();
    const c = camera(env, { scanFrame: decoder().scanFrame, mediaDevices: {} });
    const unsupported = await rejection(c.scanner.start());
    assert.deepEqual([unsupported.code, unsupported.cause, c.errors, c.scanner.state,
      lastState(c).error, env.gum.calls.length], ['unsupported', undefined, [unsupported], 'failed',
      unsupported, 0]);
    const blank = rig();
    blank.context = null;
    const d = camera(blank, { scanFrame: decoder().scanFrame });
    const canvasless = await rejection(d.scanner.start());
    assert.deepEqual([canvasless.code, d.errors, d.scanner.state, lastState(d).error,
      blank.contextOptions], ['canvas_unavailable', [canvasless], 'failed', canvasless,
      [['2d', { willReadFrequently: true }]]]);
    assert.deepEqual([blank.track.stops, blank.video.srcObject], [1, null]);
  }

  // CameraScannerError and argument checks
  {
    const cause = new Error('native');
    const error = new CameraScannerError('device_busy', undefined, { cause });
    assert.deepEqual([error instanceof Error, error.name, error.code, error.cause, error.message],
      [true, 'CameraScannerError', 'device_busy', cause,
        'The camera is in use or could not be opened.']);
    assert.deepEqual(Object.keys(error), ['code']);
    assert.equal(new CameraScannerError('stream_ended', 'custom').message, 'custom');
    assert.equal(new CameraScannerError('stream_ended').cause, undefined);
    assert.throws(() => new CameraScannerError('nope'), TypeError);
    const env = rig();
    const base = { video: env.video, scanFrame() {}, clock: env.clock };
    assert.throws(() => createCameraScanner({ video: env.video, scanFrame() {} }), TypeError);
    assert.equal(typeof createCameraScanner({ ...base, tracker: fakeTracker([]) }).start,
      'function');
    for (const bad of [{ intervalMs: -1 }, { maxDimension: 0 }, { decodeTimeoutMs: 0 },
      { recoverTimeoutMs: Infinity }, { stallMs: NaN }, { maxRecoveries: 1.5 }])
      assert.throws(() => createCameraScanner({ ...base, onResult() {}, ...bad }), RangeError);
  }
  // T47 (device switch with the tracker option; the overlay half needs the real tracker)
  {
    const env = rig();
    const dec = decoder();
    const tracker = fakeTracker(env.log);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    const before = c.scanner.epoch;
    const old = dec.calls[0];
    env.log.length = 0;
    c.states.length = 0;
    const switching = c.scanner.setConstraints({ deviceId: { exact: 'b' } });
    assert.deepEqual(env.log, ['tracker.reset', 'track.stop', 'getUserMedia']);
    assert.deepEqual(env.gum.calls, [
      { audio: false, video: { facingMode: { ideal: 'environment' } } },
      { audio: false, video: { deviceId: { exact: 'b' } } }]);
    assert.deepEqual(tracker.calls.map(call => [call.method, call.options]),
      [['reset', { epoch: before + 1 }]]);
    assert.deepEqual([c.scanner.state, c.scanner.epoch, env.video.srcObject],
      ['starting', before + 1, null]);
    await switching;
    assert.deepEqual(c.states.map(s => [s.state, s.previous, s.reason, s.epoch, s.error]),
      [['starting', 'running', 'constraints', before + 1, null],
        ['running', 'starting', 'constraints', before + 1, null]]);
    assert.deepEqual([env.video.srcObject, env.track.stops, env.video.requests],
      [env.stream, 1, 1]);
    // The old epoch's result is discarded and its request was never aborted.
    old.resolve(report('old'));
    await flush();
    assert.deepEqual([c.results.length, old.context.signal.aborted, tracker.calls.length],
      [0, false, 1]);
    // The new epoch's first capture comes intervalMs after the slot frees.
    await env.clock.advance(99);
    assert.equal(env.video.requests, 1);
    await env.clock.advance(1);
    env.video.fire(200, { presentedFrames: 1 });
    const first = dec.calls[1].context.frame;
    assert.deepEqual([first.epoch, first.sequence, first.observedAt, dec.maxOutstanding],
      [before + 1, 1, 200, 1]);
    dec.calls[1].resolve(report('new'));
    await flush();
    assert.deepEqual(tracker.calls.map(call => [call.method, call.frame && call.frame.epoch]),
      [['reset', undefined], ['update', before + 1]]);
    assert.deepEqual([c.results.length, c.results[0].report.label, c.results[0].snapshot],
      [1, 'new', tracker.calls[1].snapshot]);
  }

  // T48 (device switch failure: the old device is not reopened)
  {
    const env = rig();
    const c = camera(env, { scanFrame: decoder().scanFrame });
    await c.scanner.start();
    const native = Object.assign(new Error('busy'), { name: 'NotReadableError' });
    env.gum.next = () => Promise.reject(native);
    const failure = await rejection(c.scanner.setConstraints({ deviceId: { exact: 'b' } }));
    assert.deepEqual([failure instanceof CameraScannerError, failure.code, failure.cause],
      [true, 'device_busy', native]);
    assert.deepEqual([c.scanner.state, c.errors, env.gum.calls.length, env.video.srcObject],
      ['failed', [failure], 2, null]);
    assert.deepEqual([lastState(c).state, lastState(c).previous, lastState(c).reason,
      lastState(c).error], ['failed', 'starting', 'error', failure]);
    await env.clock.advance(5000);
    assert.deepEqual([env.gum.calls.length, env.track.stops, env.video.requests, c.errors.length],
      [2, 1, 0, 1]);
  }

  // Device switch (constraints given while not started are stored for the next start)
  {
    const env = rig();
    const c = camera(env, { scanFrame: decoder().scanFrame });
    await c.scanner.setConstraints({ deviceId: { exact: 'b' } });
    assert.deepEqual([env.gum.calls.length, c.scanner.state, c.states.length], [0, 'idle', 0]);
    await c.scanner.start();
    c.scanner.stop();
    await c.scanner.setConstraints({ deviceId: { exact: 'c' } });
    assert.deepEqual([env.gum.calls.length, c.scanner.state], [1, 'stopped']);
    await c.scanner.start();
    assert.deepEqual(env.gum.calls.map(call => call.video.deviceId.exact), ['b', 'c']);
  }

  const setMuted = (env, muted) => {
    env.track.muted = muted;
    env.track.dispatchEvent(new Event(muted ? 'mute' : 'unmute'));
  };
  const flags = changes => changes.map(s => [s.state, s.previous, s.reason, s.muted, s.stalled]);

  // T56 (rVFC path: no capture and no stall while muted; unmute requests again after intervalMs)
  {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    assert.deepEqual([env.video.requests, env.clock.pending()], [1, [2100]]);
    setMuted(env, true);
    setMuted(env, true);
    assert.deepEqual([env.video.cancels, env.video.pending, env.clock.pending()], [[1], null, []]);
    await env.clock.advance(3000);
    assert.deepEqual([env.video.requests, env.draws.length, dec.calls.length, c.scanner.stalled],
      [1, 0, 0, false]);
    setMuted(env, false);
    await env.clock.advance(99);
    assert.equal(env.video.requests, 1);
    await env.clock.advance(1);
    assert.equal(env.video.requests, 2);
    env.video.fire(3200, { presentedFrames: 1 });
    assert.deepEqual([env.draws, dec.calls[0].context.frame.observedAt],
      [[{ at: 3200, inCallback: true, width: 64, height: 48 }], 3200]);
    assert.deepEqual(flags(c.states.slice(2)), [['running', 'running', 'muted', true, false],
      ['running', 'running', 'unmuted', false, false]]);
  }

  // T56 (timer path: a mute during the interval wait cancels it; unmute captures after intervalMs)
  {
    const env = rig({ rvfc: false });
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    dec.calls[0].resolve(report());
    await env.clock.advance(50);
    assert.deepEqual(env.clock.pending(), [200]);
    setMuted(env, true);
    await env.clock.advance(3000);
    assert.deepEqual([env.draws.length, dec.calls.length, c.scanner.stalled, env.clock.pending()],
      [1, 1, false, []]);
    setMuted(env, false);
    await env.clock.advance(99);
    assert.equal(env.draws.length, 1);
    await env.clock.advance(1);
    assert.deepEqual([env.draws.map(draw => draw.at), dec.calls.length,
      dec.calls[1].context.frame.observedAt], [[100, 3250], 2, 3250]);
    assert.deepEqual(flags(c.states.slice(2)), [['running', 'running', 'muted', true, false],
      ['running', 'running', 'unmuted', false, false]]);
  }

  // T56 (a stall that predates the mute is cleared by it; detection restarts after unmute)
  {
    const env = rig();
    const c = camera(env, { scanFrame: decoder().scanFrame });
    await c.scanner.start();
    await env.clock.advance(2500);
    assert.equal(c.scanner.stalled, true);
    setMuted(env, true);
    assert.deepEqual([c.scanner.stalled, flags([lastState(c)])],
      [false, [['running', 'running', 'muted', true, false]]]);
    await env.clock.advance(3000);
    setMuted(env, false);
    await env.clock.advance(100 + 1999);
    assert.deepEqual([env.video.requests, c.scanner.stalled], [2, false]);
    await env.clock.advance(1);
    assert.deepEqual(flags(c.states.slice(2)), [['running', 'running', 'stalled', false, true],
      ['running', 'running', 'muted', true, false], ['running', 'running', 'unmuted', false, false],
      ['running', 'running', 'stalled', false, true]]);
  }

  // T58 (a throw from onResult, or a RangeError from tracker.update, fails with callback_failed)
  for (const thrower of ['onResult', 'tracker.update']) {
    const env = rig();
    const dec = decoder();
    const tracker = fakeTracker(env.log);
    const thrown = thrower === 'onResult' ? new Error('card render failed')
      : new RangeError('observedAt is on another clock.');
    const options = { scanFrame: dec.scanFrame, tracker };
    if (thrower === 'onResult') options.onResult = () => { throw thrown; };
    else tracker.update = () => { env.log.push('tracker.update'); throw thrown; };
    const c = camera(env, options);
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    const before = c.scanner.epoch;
    env.log.length = 0;
    dec.calls[0].resolve(report());
    await flush();
    const [error] = c.errors;
    assert.deepEqual([c.errors.length, error instanceof CameraScannerError, error.code,
      error.cause], [1, true, 'callback_failed', thrown]);
    assert.deepEqual([c.scanner.state, c.scanner.epoch, env.track.stops, env.video.srcObject],
      ['failed', before + 1, 1, null]);
    assert.deepEqual([lastState(c).previous, lastState(c).reason, lastState(c).error,
      lastState(c).epoch], ['running', 'error', error, before + 1]);
    assert.deepEqual(env.log, ['tracker.update', 'tracker.reset', 'track.stop']);
    assert.deepEqual(
      tracker.calls.filter(call => call.method === 'reset').map(call => call.options),
      [{ epoch: before + 1 }]);
    await env.clock.advance(1000);
    assert.deepEqual([env.video.requests, dec.calls.length, c.results.length, c.errors.length],
      [1, 1, 0, 1]);
  }

  // Device switch (during the permission prompt: the first answer is discarded and released)
  {
    const env = rig();
    const grants = [];
    env.gum.next = () => new Promise(resolve => grants.push(resolve));
    const tracker = fakeTracker(env.log);
    const c = camera(env, { scanFrame: decoder().scanFrame, tracker });
    const starting = c.scanner.start();
    const before = c.scanner.epoch;
    const switching = c.scanner.setConstraints({ deviceId: { exact: 'b' } });
    assert.equal(c.scanner.start(), switching, 'a start during the switch shares it');
    const early = new EventTarget();
    early.stops = 0;
    early.stop = () => { early.stops++; };
    grants[0]({ getTracks: () => [early] });
    await starting;
    assert.deepEqual([early.stops, env.video.srcObject, c.scanner.state], [1, null, 'starting']);
    grants[1](env.stream);
    await switching;
    assert.deepEqual(c.states.map(s => [s.state, s.previous, s.reason, s.epoch]),
      [['starting', 'idle', 'start', before], ['starting', 'starting', 'constraints', before + 1],
        ['running', 'starting', 'constraints', before + 1]]);
    assert.deepEqual([env.gum.calls[1].video, tracker.calls.map(call => call.options),
      env.video.srcObject, env.track.stops], [{ deviceId: { exact: 'b' } }, [{ epoch: before + 1 }],
      env.stream, 0]);
  }

  // Device switch (while recovering: it aborts the recovery; the new session recovers first)
  {
    const env = rig();
    const worker = abortingWorker();
    const recovers = recorder();
    const c = camera(env, { scanFrame: worker.scanFrame, recover: recovers.recover,
      maxRecoveries: 1 });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    await env.clock.advance(5000);
    assert.deepEqual([c.scanner.state, recovers.length, worker.terminated], ['recovering', 1, 1]);
    await c.scanner.setConstraints({ deviceId: { exact: 'b' } });
    assert.equal(recovers[0].context.signal.aborted, true);
    // A new session: its own recovery budget, and the hung decoder is replaced before a capture.
    assert.deepEqual([c.scanner.state, recovers.length, recovers[1].cause, c.errors.length,
      env.video.requests], ['recovering', 2, recovers[0].cause, 0, 1]);
    assert.deepEqual(recovers[1].context.decoderGeneration, 0);
    recovers[1].resolve();
    await flush();
    assert.deepEqual([c.scanner.state, lastState(c).reason, c.scanner.decoderGeneration],
      ['running', 'recovered', 1]);
    await env.clock.advance(100);
    env.video.fire(5200, { presentedFrames: 1 });
    worker.calls[1].resolve(report());
    await flush();
    assert.deepEqual([c.results.length, c.results[0].frame.decoderGeneration,
      c.results[0].frame.epoch], [1, 1, c.scanner.epoch]);
  }

  // Tracker wiring (with the tracker option, each epoch end resets it once, at the new epoch)
  {
    const env = rig();
    const tracker = fakeTracker(env.log);
    const c = camera(env, { scanFrame: decoder().scanFrame, tracker });
    const resets = () => tracker.calls.filter(call => call.method === 'reset')
      .map(call => call.options.epoch);
    const e0 = c.scanner.epoch;
    c.scanner.stop();
    assert.deepEqual([resets(), c.scanner.epoch, c.states.length], [[], e0, 0]);
    await c.scanner.start();
    c.scanner.stop();
    c.scanner.stop();
    await c.scanner.start();
    env.document.hidden = true;
    env.document.dispatchEvent(new Event('visibilitychange'));
    env.document.hidden = false;
    await c.scanner.start();
    env.document.defaultView.dispatchEvent(new Event('pagehide'));
    await c.scanner.start();
    await c.scanner.setConstraints({ deviceId: { exact: 'b' } });
    env.track.dispatchEvent(new Event('ended'));
    assert.deepEqual(resets(), [e0 + 1, e0 + 2, e0 + 3, e0 + 4, e0 + 5]);
    const ends = c.states.filter(s => s.reason !== 'start' && s.state !== 'running');
    assert.deepEqual(ends.map(s => [s.state, s.reason, s.epoch]), [['stopped', 'stop', e0 + 1],
      ['stopped', 'hidden', e0 + 2], ['stopped', 'pagehide', e0 + 3],
      ['starting', 'constraints', e0 + 4], ['failed', 'error', e0 + 5]]);
  }

  // Tracker wiring (epochs only grow across controllers that share one tracker)
  {
    const env = rig();
    const seen = [];
    const tracker = fakeTracker(env.log);
    const { update, reset } = tracker;
    tracker.update = (rep, frame, options) => {
      seen.push(frame.epoch);
      return update(rep, frame, options);
    };
    tracker.reset = options => { seen.push(options.epoch); return reset(options); };
    const dec = decoder();
    const deliver = async at => {
      await env.clock.advance(100);
      env.video.fire(at, { presentedFrames: at });
      dec.calls[dec.calls.length - 1].resolve(report());
      await flush();
    };
    // A mount, unmount and mount in the style of React StrictMode.
    const first = camera(env, { scanFrame: dec.scanFrame, tracker });
    const e1 = first.scanner.epoch;
    await first.scanner.start();
    await deliver(100);
    first.scanner.stop();
    const second = camera(env, { scanFrame: dec.scanFrame, tracker });
    await second.scanner.start();
    await deliver(300);
    // A controller created before the previous one ends renews its epoch when it starts.
    const third = camera(env, { scanFrame: dec.scanFrame, tracker });
    assert.equal(third.scanner.epoch, e1 + 3);
    second.scanner.stop();
    await third.scanner.start();
    await deliver(500);
    assert.deepEqual(seen, [e1, e1 + 1, e1 + 2, e1 + 4, e1 + 5]);
    assert.deepEqual([third.scanner.epoch, third.states[0].state, third.states[0].epoch,
      third.results.length], [e1 + 5, 'starting', e1 + 5, 1]);
  }

  // A fake of the tracker's destroy(): every later call is a no-op with status 'destroyed'.
  function destroyableTracker(log) {
    const tracker = fakeTracker(log);
    const { update, reset } = tracker;
    tracker.destroyed = false;
    tracker.update = (...args) => (tracker.destroyed ? { status: 'destroyed' } : update(...args));
    tracker.reset = options => (tracker.destroyed ? { status: 'destroyed' } : reset(options));
    tracker.destroy = () => { tracker.destroyed = true; };
    return tracker;
  }

  // Tracker teardown: camera.stop() and tracker.destroy() in either order, nothing left armed.
  for (const order of [['camera', 'tracker'], ['tracker', 'camera']]) {
    const env = rig();
    const dec = decoder();
    const tracker = destroyableTracker(env.log);
    const counts = [env.document, env.document.defaultView, env.track].map(listenerCounts);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    dec.calls[0].resolve(report());
    await flush();
    assert.deepEqual(env.clock.pending(), [200]);
    for (const part of order) {
      if (part === 'camera') c.scanner.stop();
      else tracker.destroy();
    }
    assert.deepEqual([c.scanner.state, env.clock.pending(), env.video.pending, env.video.srcObject,
      env.track.stops], ['stopped', [], null, null, 1]);
    assert.deepEqual(counts.map(count => [count.added(), count.live()]), [[1, 0], [1, 0], [3, 0]]);
    assert.deepEqual(tracker.calls.map(call => call.method),
      order[0] === 'camera' ? ['update', 'reset'] : ['update']);
    await env.clock.advance(5000);
    assert.deepEqual([dec.calls.length, c.results.length, c.errors.length, env.video.requests],
      [1, 1, 0, 1]);
  }

  // Tracker wiring: a destroyed tracker while the camera runs; results continue, nothing raises.
  {
    const env = rig();
    const dec = decoder();
    const tracker = destroyableTracker(env.log);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    tracker.destroy();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    dec.calls[0].resolve(report());
    await flush();
    assert.deepEqual([c.scanner.state, c.results.map(r => r.snapshot), c.errors.length],
      ['running', [{ status: 'destroyed' }], 0]);
    c.scanner.stop();
    assert.deepEqual([c.scanner.state, env.clock.pending(), c.errors.length], ['stopped', [], 0]);
  }

  // Tracker wiring (stop during a decode: only the decode timeout stays armed until it settles)
  {
    const env = rig();
    const dec = decoder();
    const c = camera(env, { scanFrame: dec.scanFrame });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    c.scanner.stop();
    assert.deepEqual(env.clock.pending(), [5100]);
    dec.calls[0].resolve(report());
    await flush();
    assert.deepEqual([env.clock.pending(), c.results.length, c.scanner.state], [[], 0, 'stopped']);
  }

  // Real-tracker halves (tracker wiring): a QR inside the rig's 64 x 48 frames, complete trace.
  const framedQr = () => ({ detections: [code('VDIw', [quad(sq(10, 10, 20))])], trace: COMPLETE });
  const lostStale = at => ({ type: 'lost', trackId: 'track-1', at, reason: 'stale' });
  const realTracker = (env, options) => {
    const changes = [];
    const tracker = createDetectionTracker({ clock: env.clock, onChange: s => changes.push(s),
      ...options });
    return { tracker, changes };
  };

  // T45 (tracker half): decoded 900 ms after observedAt 1000 is 'updated'; 1300 ms is
  // 'content_only' (T21, staleMs 1200).
  for (const [decodeMs, status] of [[900, 'updated'], [1300, 'content_only']]) {
    const env = rig({ clockStart: 900 });
    const dec = decoder();
    const { tracker } = realTracker(env);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(1000, { presentedFrames: 1 });
    await env.clock.advance(decodeMs);
    dec.calls[0].resolve(framedQr());
    await flush();
    const [{ frame, snapshot }] = c.results;
    assert.deepEqual([snapshot.status, snapshot.now, snapshot.epoch, frame.completedAt],
      [status, 1000 + decodeMs, c.scanner.epoch, 1000 + decodeMs]);
    assert.deepEqual(snapshot.events, [entered('track-1', 1000)]);
    const [track] = snapshot.tracks;
    assert.deepEqual([track.basis, track.state, track.geometry && track.geometry.observedAt,
      track.geometry && track.geometry.age], status === 'updated'
      ? ['spatial', 'tracked', 1000, 900] : ['content', 'lost', null, null]);
    c.scanner.stop();
  }

  // T43a (tracker half): repeated presentedFrames, a repeated mediaTime, or silence bring no
  // scanFrame and no new observedAt, so onChange gets lost{stale} at lastSeenAt + 1200 = 1300.
  for (const meta of [{ presentedFrames: 5, mediaTime: 1 }, { mediaTime: 1 }, null]) {
    const env = rig();
    const dec = decoder();
    const { tracker, changes } = realTracker(env);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, meta || { presentedFrames: 5 });
    dec.calls[0].resolve(framedQr());
    await flush();
    assert.deepEqual(changes.map(s => [s.status, s.now, s.events]),
      [['updated', 100, [entered('track-1', 100)]]]);
    assert.equal(changes[0].tracks[0].geometry.precise, true);
    for (const at of [600, 1100]) {
      await env.clock.advance(at - env.clock.now());
      if (meta) env.video.fire(at, meta);
    }
    await env.clock.advance(1299 - env.clock.now());
    assert.deepEqual([changes.length, dec.calls.length, env.draws.length], [1, 1, 1]);
    await env.clock.advance(1);
    assert.deepEqual(changes.slice(1).map(s => [s.status, s.now, s.events]),
      [['time', 1300, [lostStale(1300)]]]);
    assert.deepEqual(changes[1].tracks.map(t => [t.id, t.state, t.geometry, t.lastSeenAt]),
      [['track-1', 'lost', null, 100]]);
    assert.deepEqual(changes[1].results.map(r => [r.id, r.present]), [['result-1', false]]);
    c.scanner.stop();
  }

  // T43b (tracker half): identical pixels on the timer path; the geometry is lost at staleMs.
  {
    const env = rig({ rvfc: false });
    const frozen = new Uint8ClampedArray(64 * 48 * 4).fill(7);
    env.pixels = () => frozen.slice();
    const dec = decoder();
    const { tracker, changes } = realTracker(env);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    dec.calls[0].resolve(framedQr());
    await flush();
    assert.deepEqual(changes.map(s => [s.status, s.now, s.events]),
      [['updated', 100, [entered('track-1', 100)]]]);
    await env.clock.advance(1199);
    assert.deepEqual([changes.length, dec.calls.length, env.draws.length], [1, 1, 12]);
    await env.clock.advance(1);
    assert.deepEqual(changes.slice(1).map(s => [s.status, s.now, s.events]),
      [['time', 1300, [lostStale(1300)]]]);
    assert.deepEqual(changes[1].tracks.map(t => [t.state, t.geometry]), [['lost', null]]);
    c.scanner.stop();
  }

  // T47 (real-tracker half): the reset expires every track at once, so nothing can be drawn
  // until the new epoch's first frame; the card stays and the new track rejoins it.
  {
    const env = rig();
    const dec = decoder();
    const { tracker, changes } = realTracker(env);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    dec.calls[0].resolve(framedQr());
    await flush();
    const before = c.scanner.epoch;
    await env.clock.advance(50);
    const switching = c.scanner.setConstraints({ deviceId: { exact: 'b' } });
    const reset = changes[changes.length - 1];
    assert.deepEqual([changes.length, reset.status, reset.epoch, reset.now, reset.events,
      reset.tracks], [2, 'reset', before + 1, 150,
      [{ type: 'expired', trackId: 'track-1', at: 150, reason: 'epoch' }], []]);
    // present follows lastObservedAt, not tracks: 150 - 100 = 50 < staleMs.
    assert.deepEqual(reset.results.map(r => [r.id, r.present, r.lastObservedAt, r.trackIds]),
      [['result-1', true, 100, []]]);
    await switching;
    await env.clock.advance(100);
    env.video.fire(250, { presentedFrames: 1 });
    assert.deepEqual(tracker.snapshot().tracks, []);
    dec.calls[1].resolve(framedQr());
    await flush();
    const first = changes[changes.length - 1];
    assert.deepEqual([first.status, first.epoch, first.events],
      ['updated', before + 1, [entered('track-2', 250)]]);
    assert.deepEqual(first.results.map(r => [r.id, r.present, r.trackIds]),
      [['result-1', true, ['track-2']]]);
    c.scanner.stop();
  }

  // T56 (tracker half): a muted camera feeds no frames, so the deadline withdraws the bracket
  // at 1300 while the card stays; the timeout is not due before E + staleMs = 3300.
  {
    const env = rig();
    const dec = decoder();
    const { tracker, changes } = realTracker(env);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    dec.calls[0].resolve(framedQr());
    await flush();
    await env.clock.advance(50);
    setMuted(env, true);
    await env.clock.advance(3000);
    assert.deepEqual([dec.calls.length, changes.map(s => [s.status, s.now, s.events])],
      [1, [['updated', 100, [entered('track-1', 100)]], ['time', 1300, [lostStale(1300)]]]]);
    assert.deepEqual(changes[1].tracks.map(t => [t.id, t.state, t.geometry]),
      [['track-1', 'lost', null]]);
    assert.deepEqual([changes[1].results.map(r => [r.id, r.present]), tracker.nextDeadline()],
      [[['result-1', false]], 3300]);
    c.scanner.stop();
  }

  // T58 (real tracker): rVFC times on another clock than the controller's make the tracker
  // throw its RangeError (observedAt 100 < now 100100 - 60000); the controller fails with it.
  {
    const env = rig({ clockStart: 100000 });
    const dec = decoder();
    const { tracker, changes } = realTracker(env);
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    dec.calls[0].resolve(framedQr());
    await flush();
    const [error] = c.errors;
    assert.deepEqual([c.errors.length, error.code, error.cause instanceof RangeError,
      c.scanner.state, c.results.length], [1, 'callback_failed', true, 'failed', 0]);
    assert.match(error.cause.message, /^observedAt 100 is not on the tracker clock \(now 100100\)/);
    // The failure ends the epoch: the reset is the only snapshot onChange received.
    assert.deepEqual(changes.map(s => [s.status, s.epoch]), [['reset', c.scanner.epoch]]);
  }

  // T20b (controller row): onChange throws on its second call; the tracker hands the error to
  // its onError, so a controller using the tracker option stays running, with no
  // callback_failed.
  {
    const env = rig();
    const dec = decoder();
    const thrown = new Error('overlay failed'), caught = [];
    let calls = 0;
    const { tracker } = realTracker(env, {
      onChange: () => { if (++calls === 2) throw thrown; }, onError: e => caught.push(e) });
    const c = camera(env, { scanFrame: dec.scanFrame, tracker });
    await c.scanner.start();
    for (const at of [100, 200]) {
      await env.clock.advance(100);
      env.video.fire(at, { presentedFrames: at });
      dec.calls[dec.calls.length - 1].resolve(framedQr());
      await flush();
    }
    assert.deepEqual([calls, caught, c.errors, c.scanner.state], [2, [thrown], [], 'running']);
    assert.deepEqual(c.results.map(r => [r.snapshot.status, r.snapshot.now]),
      [['updated', 100], ['updated', 200]]);
    c.scanner.stop();
  }

  // T22a (two controllers row): controllers created in turn feed one real tracker. Each
  // session's epoch is larger, so no frame is rejected as stale_epoch, including that of a
  // controller created before the previous one ended (it renews its epoch at start()).
  {
    const env = rig();
    const dec = decoder();
    const { tracker } = realTracker(env);
    const deliver = async c => {
      await env.clock.advance(100);
      const at = env.clock.now();
      env.video.fire(at, { presentedFrames: at });
      dec.calls[dec.calls.length - 1].resolve(framedQr());
      await flush();
      return c.results[c.results.length - 1].snapshot;
    };
    const first = camera(env, { scanFrame: dec.scanFrame, tracker });
    const e1 = first.scanner.epoch;
    await first.scanner.start();
    const a = await deliver(first);
    first.scanner.stop();
    const second = camera(env, { scanFrame: dec.scanFrame, tracker });
    await second.scanner.start();
    const b = await deliver(second);
    const third = camera(env, { scanFrame: dec.scanFrame, tracker });
    second.scanner.stop();
    await third.scanner.start();
    const d = await deliver(third);
    assert.deepEqual([a, b, d].map(s => [s.status, s.epoch, s.events]),
      [['updated', e1, [entered('track-1', 100)]], ['updated', e1 + 2, [entered('track-2', 200)]],
        ['updated', e1 + 5, [entered('track-3', 300)]]]);
    third.scanner.stop();
  }

  // getUserMedia answers every call with a new track. The returned live() counts the tracks not
  // stopped, and env.track follows the newest one, so setMuted() and 'ended' reach it.
  const freshTracks = env => {
    const tracks = [];
    env.gum.next = () => {
      const track = new EventTarget();
      Object.assign(track, { muted: false, stops: 0, stop() { track.stops++; } });
      tracks.push(track);
      env.track = track;
      return Promise.resolve({ getTracks: () => [track] });
    };
    return () => tracks.filter(track => track.stops === 0).length;
  };

  // T57, lifecycle calls from callbacks: a stop() from onState, or from the tracker's onChange
  // during the reset, is final; a start() from such a callback shares the pending start; and a
  // switch or a restart requested on the 'starting' change replaces that start before its camera
  // request. No case opens more than one camera.
  {
    const transition = change => `${change.previous}->${change.state}(${change.reason})`;
    const scene = (react, options = {}) => {
      const env = rig(), dec = decoder(), seen = [], inner = [];
      const c = camera(env, { scanFrame: dec.scanFrame, ...options, onState: change => {
        seen.push(transition(change));
        react(change, c, inner);
      } });
      return { env, dec, seen, inner, c };
    };
    // stop() on the 'starting' change of start(): the camera is never requested.
    const s1 = scene((change, c) => { if (change.state === 'starting') c.scanner.stop(); });
    const outcome = await s1.c.scanner.start();
    await s1.env.clock.advance(200);
    assert.deepEqual([outcome, s1.env.gum.calls.length, s1.c.scanner.state, s1.env.video.srcObject,
      s1.env.video.pending, s1.dec.calls.length, s1.seen],
    [undefined, 0, 'stopped', null, null, 0, ['idle->starting(start)', 'starting->stopped(stop)']]);
    // stop() on the 'starting' change of setConstraints(): the new device is not requested.
    const s2 = scene((change, c) => {
      if (change.state === 'starting' && change.reason === 'constraints') c.scanner.stop();
    });
    await s2.c.scanner.start();
    const switched = await s2.c.scanner.setConstraints({ deviceId: 'b' });
    await s2.env.clock.advance(200);
    assert.deepEqual([switched, s2.env.gum.calls.length, s2.c.scanner.state, s2.env.track.stops,
      s2.env.video.srcObject, s2.env.video.pending, s2.seen.slice(2)],
    [undefined, 1, 'stopped', 1, null, null,
      ['running->starting(constraints)', 'starting->stopped(stop)']]);
    // stop() from the tracker's onChange, inside the reset of setConstraints(): that stop's
    // transition is the last one, and nothing is opened after it.
    const log = [], tracker = fakeTracker(log), resetOnce = tracker.reset;
    let hooked = null;
    tracker.reset = options => {
      const snap = resetOnce(options);
      if (hooked) { const c = hooked; hooked = null; c.scanner.stop(); }
      return snap;
    };
    const s3 = scene(() => {}, { tracker });
    await s3.c.scanner.start();
    const e0 = s3.c.scanner.epoch;
    hooked = s3.c;
    const moved = await s3.c.scanner.setConstraints({ deviceId: 'b' });
    await s3.env.clock.advance(200);
    assert.deepEqual([moved, s3.env.gum.calls.length, s3.c.scanner.state, s3.c.scanner.epoch,
      s3.env.track.stops, s3.env.video.pending, s3.seen],
    [undefined, 1, 'stopped', e0 + 2, 1, null,
      ['idle->starting(start)', 'starting->running(start)', 'running->stopped(stop)']]);
    assert.deepEqual(tracker.calls.map(call => call.options.epoch), [e0 + 1, e0 + 2]);
    // start() on every 'starting' change, unguarded: it returns the pending start.
    const s4 = scene((change, c, inner) => {
      if (change.state === 'starting') inner.push(c.scanner.start());
    });
    const outer = s4.c.scanner.start();
    await outer;
    assert.deepEqual([s4.inner.length, s4.inner[0] === outer, s4.env.gum.calls.length,
      s4.c.scanner.state, s4.seen], [1, true, 1, 'running',
      ['idle->starting(start)', 'starting->running(start)']]);
    const sw = s4.c.scanner.setConstraints({ deviceId: 'b' });
    await sw;
    assert.deepEqual([s4.inner.length, s4.inner[1] === sw, s4.env.gum.calls.length,
      s4.c.scanner.state, s4.env.track.stops], [2, true, 2, 'running', 1]);
    s4.c.scanner.stop();
    assert.deepEqual([s4.env.track.stops, s4.c.scanner.state], [2, 'stopped']);
    // start() from the real tracker's onChange (status 'reset') during setConstraints(): the
    // switch is already the pending start, so start() returns the switch's own promise.
    const env5 = rig(), dec5 = decoder(), seen5 = [], live5 = freshTracks(env5);
    let c5 = null, armed = false, inner5 = null;
    const { tracker: tracker5, changes: changes5 } = realTracker(env5, { onChange: snapshot => {
      changes5.push(snapshot.status);
      if (armed && snapshot.status === 'reset') {
        armed = false;
        inner5 = c5.scanner.start();
      }
    } });
    c5 = camera(env5, { scanFrame: dec5.scanFrame, tracker: tracker5,
      onState: change => seen5.push(transition(change)) });
    await c5.scanner.start();
    armed = true;
    const sw5 = c5.scanner.setConstraints({ deviceId: 'b' });
    assert.deepEqual([await sw5, inner5 === sw5, changes5, env5.gum.calls.length, live5(),
      c5.scanner.state, seen5], [undefined, true, ['reset'], 2, 1, 'running',
      ['idle->starting(start)', 'starting->running(start)', 'running->starting(constraints)',
        'starting->running(constraints)']]);
    c5.scanner.stop();
    tracker5.destroy();
    // setConstraints() on the 'starting' change of start(): the switch replaces that start before
    // its camera request, so one camera opens, with the new constraints, and both promises settle.
    const s6 = scene((change, c, inner) => {
      if (change.previous === 'idle') inner.push(c.scanner.setConstraints({ deviceId: 'b' }));
    });
    const live6 = freshTracks(s6.env), outer6 = s6.c.scanner.start();
    assert.deepEqual([await outer6, await s6.inner[0]], [undefined, undefined]);
    assert.deepEqual([s6.env.gum.calls.map(call => call.video), live6(), s6.c.scanner.state,
      s6.seen], [[{ deviceId: 'b' }], 1, 'running', ['idle->starting(start)',
      'starting->starting(constraints)', 'starting->running(constraints)']]);
    s6.c.scanner.stop();
    // stop() then start() on the 'starting' change of start(): the stop is final for the first
    // start, which settles with the restart; only the restart requests a camera.
    const s7 = scene((change, c, inner) => {
      if (change.previous !== 'idle') return;
      c.scanner.stop();
      inner.push(c.scanner.start());
    });
    const live7 = freshTracks(s7.env), outer7 = s7.c.scanner.start();
    assert.deepEqual([await outer7, await s7.inner[0]], [undefined, undefined]);
    assert.deepEqual([s7.env.gum.calls.length, live7(), s7.c.scanner.state, s7.seen],
      [1, 1, 'running', ['idle->starting(start)', 'starting->stopped(stop)',
        'stopped->starting(start)', 'starting->running(start)']]);
    s7.c.scanner.stop();
    assert.deepEqual([live7(), s7.c.scanner.state], [0, 'stopped']);
  }

  // T58, a throw from tracker.reset: the epoch end still releases the camera and applies its own
  // transition, and the throw reaches onError as callback_failed with a message naming the reset
  // and its native cause.
  {
    const thrown = new RangeError('reset needs a larger epoch');
    const failing = () => {
      const tracker = fakeTracker([]);
      tracker.reset = () => { throw thrown; };
      return tracker;
    };
    const resetFailed = [true, 'callback_failed',
      'Resetting the tracker at the end of a camera session failed.', thrown];
    const codes = c => c.errors.map(e => (e.code === 'callback_failed'
      ? [e instanceof CameraScannerError, e.code, e.message, e.cause] : e.code));
    const opened = async () => {
      const env = rig(), dec = decoder();
      const c = camera(env, { scanFrame: dec.scanFrame, tracker: failing() });
      await c.scanner.start();
      return { env, dec, c, e0: c.scanner.epoch };
    };
    const stopped = await opened();
    stopped.c.scanner.stop();
    assert.deepEqual([stopped.c.scanner.state, stopped.c.scanner.epoch, stopped.env.track.stops,
      stopped.env.video.srcObject, stopped.c.reasons(), codes(stopped.c)],
    ['stopped', stopped.e0 + 1, 1, null, ['start', 'start', 'stop'], [resetFailed]]);
    // The hidden page's listener does not throw either.
    const hidden = await opened();
    hidden.env.document.hidden = true;
    hidden.env.document.dispatchEvent(new Event('visibilitychange'));
    assert.deepEqual([hidden.c.scanner.state, hidden.env.track.stops, codes(hidden.c)],
      ['stopped', 1, [resetFailed]]);
    // A decode failure: the session fails with its own error, after the reset's report.
    const failed = await opened();
    await failed.env.clock.advance(100);
    failed.env.video.fire(100, { presentedFrames: 1 });
    failed.dec.calls[0].reject(new Error('worker crashed'));
    await flush();
    assert.deepEqual([failed.c.scanner.state, lastState(failed.c).error.code,
      failed.env.track.stops, failed.env.video.srcObject, codes(failed.c)],
    ['failed', 'decode_failed', 1, null, [resetFailed, 'decode_failed']]);
    // A device switch goes on: the reset failure is reported, the new device opens.
    const moved = await opened();
    await moved.c.scanner.setConstraints({ deviceId: 'b' });
    assert.deepEqual([moved.c.scanner.state, moved.env.gum.calls.length, moved.env.track.stops,
      codes(moved.c)], ['running', 2, 1, [resetFailed]]);
    moved.c.scanner.stop();
  }

  // T58, a throw from onState: transitions, camera requests and timers are those of an onState
  // that returned. start() and setConstraints() still return their promise, and each throw
  // reaches onError as callback_failed with the native error as cause.
  {
    const thrown = new TypeError('overlay failed');
    const stateFailed = [true, 'callback_failed',
      'The onState callback threw on a camera state change.', thrown];
    const codes = errors => errors.map(e => (e.code === 'callback_failed'
      ? [e instanceof CameraScannerError, e.code, e.message, e.cause] : e.code));
    const transition = change => `${change.previous}->${change.state}(${change.reason})`;
    const scene = (throwsOn, options = {}) => {
      const env = rig(), dec = decoder(), seen = [], live = freshTracks(env);
      const c = camera(env, { scanFrame: dec.scanFrame, ...options, onState: change => {
        seen.push(transition(change));
        if (throwsOn(change)) throw thrown;
      } });
      return { env, dec, seen, live, c };
    };
    // On the 'starting' change of start(): one camera opens and the session captures.
    const a = scene(change => change.state === 'starting' && change.reason === 'start');
    const started = a.c.scanner.start();
    assert.deepEqual([await started, a.seen, a.env.gum.calls.length, a.live(), a.c.scanner.state,
      codes(a.c.errors)], [undefined, ['idle->starting(start)', 'starting->running(start)'], 1, 1,
      'running', [stateFailed]]);
    await a.env.clock.advance(100);
    assert.deepEqual([a.env.video.requests, a.env.clock.pending()], [1, [2100]]);
    a.c.scanner.stop();
    // On the 'starting' change of setConstraints(): the device switch goes on.
    const b = scene(change => change.state === 'starting' && change.reason === 'constraints');
    await b.c.scanner.start();
    const switched = b.c.scanner.setConstraints({ deviceId: 'b' });
    assert.deepEqual([await switched, b.seen, b.env.gum.calls.map(call => call.video), b.live(),
      b.c.scanner.state, codes(b.c.errors)], [undefined, ['idle->starting(start)',
      'starting->running(start)', 'running->starting(constraints)',
      'starting->running(constraints)'], [{ facingMode: { ideal: 'environment' } },
      { deviceId: 'b' }], 1, 'running', [stateFailed]]);
    b.c.scanner.stop();
    // Without onError the report is rethrown from a microtask, and so is a throw from onError
    // while it receives a report (here of onState, then of a tracker reset). No call throws.
    const caught = [], hook = error => caught.push(error), late = new Error('onError failed');
    const resetThrows = fakeTracker([]);
    resetThrows.reset = () => { throw new RangeError('reset needs a larger epoch'); };
    process.on('uncaughtException', hook);
    const bare = scene(() => true, { onError: undefined });
    const bareStart = bare.c.scanner.start();
    assert.deepEqual(caught, []);
    await bareStart;
    const bareLive = bare.live();
    bare.c.scanner.stop();
    const loud = scene(change => change.state === 'starting',
      { onError: () => { throw late; }, tracker: resetThrows });
    await loud.c.scanner.start();
    loud.c.scanner.stop();
    await new Promise(resolve => setTimeout(resolve, 0));
    process.off('uncaughtException', hook);
    assert.deepEqual(caught.map(e => (e === late ? 'late' : codes([e])[0])),
      [stateFailed, stateFailed, stateFailed, 'late', 'late']);
    const stopped = ['idle->starting(start)', 'starting->running(start)', 'running->stopped(stop)'];
    assert.deepEqual([bareLive, bare.seen, bare.live(), loud.seen, loud.live(),
      loud.env.gum.calls.length], [1, stopped, 0, stopped, 0, 1]);
    // A whole session where every transition throws: stall and resume, a decode timeout and its
    // recovery, mute, a switch, a stream that ends, a restart and a stop. Each step matches the
    // calm run, and each throw is reported in order, before the error of the failing session.
    const journey = async throwing => {
      const recovers = recorder('resolve');
      const j = scene(() => throwing, { recover: recovers.recover });
      const { env, dec, c } = j, marks = [];
      const mark = () => marks.push([c.scanner.state, c.scanner.stalled, j.live(),
        env.gum.calls.length, env.video.requests, dec.calls.length, c.results.length,
        recovers.length, c.scanner.decoderGeneration, env.clock.pending()]);
      await c.scanner.start();
      await env.clock.advance(100);
      env.video.fire(100, { presentedFrames: 1 });
      dec.calls[0].resolve(report('a'));
      await env.clock.advance(2100);
      mark();
      await env.clock.advance(100);
      env.video.fire(2300, { presentedFrames: 2 });
      mark();
      await env.clock.advance(5000);
      mark();
      setMuted(env, true);
      setMuted(env, false);
      await env.clock.advance(100);
      mark();
      await c.scanner.setConstraints({ deviceId: 'b' });
      mark();
      env.track.dispatchEvent(new Event('ended'));
      mark();
      await c.scanner.start();
      c.scanner.stop();
      mark();
      return { seen: j.seen, marks, errors: codes(c.errors) };
    };
    const calm = await journey(false), noisy = await journey(true);
    assert.deepEqual(calm.seen, ['idle->starting(start)', 'starting->running(start)',
      'running->running(stalled)', 'running->running(frames-resumed)',
      'running->recovering(recover)', 'recovering->running(recovered)', 'running->running(muted)',
      'running->running(unmuted)', 'running->starting(constraints)',
      'starting->running(constraints)', 'running->failed(error)', 'failed->starting(start)',
      'starting->running(start)', 'running->stopped(stop)']);
    assert.deepEqual(calm.marks, [['running', true, 1, 1, 2, 1, 1, 0, 0, []],
      ['running', false, 1, 1, 2, 2, 1, 0, 0, [7300]],
      ['running', false, 1, 1, 2, 2, 1, 1, 1, [7400]],
      ['running', false, 1, 1, 3, 2, 1, 1, 1, [9400]],
      ['running', false, 1, 2, 3, 2, 1, 1, 1, [7500]],
      ['failed', false, 0, 2, 3, 2, 1, 1, 1, []],
      ['stopped', false, 0, 3, 3, 2, 1, 1, 1, []]]);
    assert.deepEqual([noisy.seen, noisy.marks], [calm.seen, calm.marks]);
    assert.deepEqual([calm.errors, noisy.errors], [['stream_ended'],
      [...Array(11).fill(stateFailed), 'stream_ended', ...Array(3).fill(stateFailed)]]);
  }

  // T57, a stop() from onError while it receives a throw from onState, or from onState itself.
  // The report runs inside the change, so the stop is final there: the step that announced the
  // change decodes, recovers and attaches nothing after it, no timer stays armed, and a restart
  // decodes only its own frames. A mute from the 'frames-resumed' change pauses instead.
  for (const via of ['onError', 'onState']) {
    const scene = (on, { act = c => c.scanner.stop(), rvfc = true, ...options } = {}) => {
      const env = rig({ rvfc }), dec = decoder(), seen = [], reports = [];
      const c = camera(env, { scanFrame: dec.scanFrame, ...options, onState: change => {
        seen.push(`${change.previous}->${change.state}(${change.reason})`);
        if (change.reason !== on) return;
        if (via === 'onState') act(c, env);
        else throw new Error(on);
      }, onError: error => {
        reports.push([error.code, error.cause.message]);
        act(c, env);
      } });
      return { env, dec, seen, reports, c };
    };
    const reported = on => (via === 'onError' ? [['callback_failed', on]] : []);
    const left = s => [s.c.scanner.state, s.env.track.stops, s.env.video.srcObject,
      s.env.video.pending, s.dec.calls.length, s.env.clock.pending()];
    const initial = ['idle->starting(start)', 'starting->running(start)'];
    const resumed = [...initial, 'running->running(stalled)', 'running->running(frames-resumed)'];
    // rVFC path: the frame that ends the stall is neither drawn nor decoded.
    const r = scene('frames-resumed');
    await r.c.scanner.start();
    await r.env.clock.advance(2100);
    r.env.video.fire(2100, { presentedFrames: 1 });
    assert.deepEqual([...left(r), r.env.draws.length, r.seen, r.reports],
      ['stopped', 1, null, null, 0, [], 0, [...resumed, 'running->stopped(stop)'],
        reported('frames-resumed')]);
    // The restart keeps that epoch, as no other controller took one: its first decode and its
    // first result are its own frame.
    const e1 = r.c.scanner.epoch;
    await r.c.scanner.start();
    await r.env.clock.advance(100);
    r.env.video.fire(2200, { presentedFrames: 1 });
    r.dec.calls[0].resolve(report('fresh'));
    await flush();
    const decodes = r.dec.calls.map(({ context: { frame } }) =>
      [frame.epoch, frame.sequence, frame.observedAt]);
    const results = r.c.results.map(({ report: rep, frame }) => [rep.label, frame.observedAt]);
    assert.deepEqual([r.c.scanner.epoch, decodes, results],
      [e1, [[e1, 1, 2200]], [['fresh', 2200]]]);
    r.c.scanner.stop();
    // Timer path: a video unready for stallMs stalls; its first readable frame is drawn, to be
    // hashed, and not decoded.
    const t = scene('frames-resumed', { rvfc: false });
    t.env.video.readyState = 1;
    await t.c.scanner.start();
    await t.env.clock.advance(2100);
    t.env.video.readyState = 2;
    await t.env.clock.advance(100);
    assert.deepEqual([...left(t), t.env.draws.map(draw => draw.at), t.seen, t.reports],
      ['stopped', 1, null, null, 0, [], [2200], [...resumed, 'running->stopped(stop)'],
        reported('frames-resumed')]);
    // A decode timeout: recover is never called, and its timeout is never armed.
    const recovers = recorder();
    const v = scene('recover', { recover: recovers.recover });
    await v.c.scanner.start();
    await v.env.clock.advance(100);
    v.env.video.fire(100, { presentedFrames: 1 });
    await v.env.clock.advance(5000);
    assert.deepEqual([...left(v), recovers.length, v.c.scanner.decoderGeneration, v.seen,
      v.reports], ['stopped', 1, null, null, 1, [], 0, 0, [...initial,
      'running->recovering(recover)', 'recovering->stopped(stop)'], reported('recover')]);
    // A track muted at open: its released stream never reaches the video, which never plays.
    const m = scene('muted');
    let plays = 0;
    m.env.video.play = async () => { plays++; };
    m.env.track.muted = true;
    const outcome = await m.c.scanner.start();
    assert.deepEqual([outcome, ...left(m), plays, m.seen, m.reports], [undefined, 'stopped', 1,
      null, null, 0, [], 0, ['idle->starting(start)', 'starting->starting(muted)',
        'starting->stopped(stop)'], reported('muted')]);
    // A mute from the 'frames-resumed' change: that frame is not captured, and the first frame
    // after the unmute is.
    const p = scene('frames-resumed', { act: (c, env) => setMuted(env, true) });
    await p.c.scanner.start();
    await p.env.clock.advance(2100);
    p.env.video.fire(2100, { presentedFrames: 1 });
    assert.deepEqual([...left(p), p.c.scanner.stalled, p.env.draws.length],
      ['running', 0, p.env.stream, null, 0, [], false, 0]);
    setMuted(p.env, false);
    await p.env.clock.advance(100);
    p.env.video.fire(2200, { presentedFrames: 2 });
    assert.deepEqual([p.dec.calls.map(call => call.context.frame.observedAt), p.seen, p.reports],
      [[2200], [...resumed, 'running->running(muted)', 'running->running(unmuted)'],
        reported('frames-resumed')]);
    p.c.scanner.stop();
  }

  // T49, stop() during recovering aborts the recovery: its signal aborts, and a recover
  // that resolves later changes neither the generation nor the state, and captures nothing.
  {
    const env = rig(), dec = decoder(), recovers = recorder();
    const c = camera(env, { scanFrame: dec.scanFrame, recover: recovers.recover });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    await env.clock.advance(5000);
    assert.deepEqual([c.scanner.state, recovers.length, recovers[0].cause.code],
      ['recovering', 1, 'decode_timeout']);
    c.scanner.stop();
    assert.deepEqual([c.scanner.state, recovers[0].context.signal.aborted], ['stopped', true]);
    recovers[0].resolve();
    await env.clock.advance(1000);
    assert.deepEqual([c.scanner.state, c.scanner.decoderGeneration, dec.calls.length,
      env.video.pending, c.reasons(), c.errors], ['stopped', 0, 1, null,
      ['start', 'start', 'recover', 'stop'], []]);
  }

  // T50, timeout after stop() with recover: a timeout that fires after stop() marks the
  // decoder as hung, and the next start() recovers it first.
  {
    const env = rig(), dec = decoder(), recovers = recorder('resolve');
    const c = camera(env, { scanFrame: dec.scanFrame, recover: recovers.recover });
    await c.scanner.start();
    await env.clock.advance(100);
    env.video.fire(100, { presentedFrames: 1 });
    c.scanner.stop();
    await env.clock.advance(5000);
    assert.deepEqual([c.scanner.state, dec.calls[0].context.signal.aborted, recovers.length,
      c.errors], ['stopped', true, 0, []]);
    await c.scanner.start();
    await flush();
    assert.deepEqual(c.states.slice(-4).map(s => [s.state, s.reason]), [['starting', 'start'],
      ['running', 'start'], ['recovering', 'recover'], ['running', 'recovered']]);
    assert.deepEqual([c.scanner.decoderGeneration, recovers.length, recovers[0].cause.code,
      recovers[0].context.decoderGeneration], [1, 1, 'decode_timeout', 0]);
    await env.clock.advance(100);
    env.video.fire(env.clock.now(), { presentedFrames: 2 });
    assert.deepEqual([dec.calls.length, dec.calls[1].context.frame.decoderGeneration], [2, 1]);
    c.scanner.stop();
  }
}

console.log('PASS camera: tracker identity, timing and geometry, projection, and the capture ' +
  'controller (loop, timestamps, one decode, recovery, switch, errors, mute, wiring, teardown)');
