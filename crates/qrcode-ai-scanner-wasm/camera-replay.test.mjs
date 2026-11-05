// Replay cases T66-T70: the instrument's self-tests, association against a brute-force
// reference, determinism, identity under smoothing and the default gates. Scenes are generated
// in memory; the module under test comes from QRSCAN_CAMERA_MODULE when set (the installed
// package), else ./camera.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BIG, LEAVE_LOST, LEAVE_SEEN, MARGIN, NOMINAL, SCENES, START, createBuilder,
  createRandom, describeGeometry, generateScene, makeCode, parseJsonl, referenceCost,
  shuffleWireOrder, square, toJsonl } from './replay/generate.mjs';
import * as metrics from './replay/metrics.mjs';
import { adoption, canonical, fixedCandidate, identityOf, postFilter, publishedDifference,
  replay } from './replay/run.mjs';
import * as oneEuro from './replay/candidates/one-euro.mjs';

const loaded = import(process.env.QRSCAN_CAMERA_MODULE ?? './camera.js');
const near = (actual, expected, tolerance, label = '') => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `${label} ${actual} is not within ${tolerance} of ${expected}`);
const run = (camera, lines, trackerOptions = {}) =>
  replay(lines, { createDetectionTracker: camera.createDetectionTracker, trackerOptions });
const unsmoothed = { smoothing: { kind: 'none' } };

// A single QR on a 1280 x 720 frame at 10 Hz without noise, its centre x given per frame.
function panScene(xs, { y = 360, offsets = () => 0 } = {}) {
  const b = createBuilder({ scene: 'self-test', seed: 1, noise: 0 });
  const code = makeCode('qr_code', 'SELF-TEST');
  xs.forEach((x, k) => {
    const truth = square(x, y), measured = truth.map(p => ({ x: p.x + offsets(k), y: p.y }));
    const line = b.frame({ at: k * 100,
      copies: [{ copy: 'A', code, kind: 'quad', points: truth }] });
    line.report.detections[0].occurrences[0].geometry.points = measured;
  });
  return b.lines;
}
const lagOf = (trace, k) => trace.steps[k].snapshot.tracks[0].geometry.lag;

test('T66 instrument self-tests', async t => {
  const camera = await loaded;

  await t.test('1. truth replay: zero noise and no smoothing give no error and no jitter', () => {
    for (const scene of SCENES) {
      const trace = run(camera, generateScene(scene, { noise: 0 }),
        { smoothing: { kind: 'none' } });
      const corners = metrics.cornerErrors(trace), { jitterPx } = metrics.jitter(trace);
      assert.ok(corners.samples > 0, `${scene}: no publication was compared with its truth`);
      assert.equal(corners.cornerRmsPx, 0, `${scene} corner_rms`);
      assert.ok(jitterPx === null || jitterPx === 0, `${scene} jitter ${jitterPx}`);
      assert.equal(metrics.violations(trace).total, 0, `${scene} violations`);
    }
  });

  await t.test('2. fixed-alpha closed forms: amplitude, steady lag, decay after a stop', () => {
    const alpha = 0.35;
    // Static jitter: an input alternating +-0.5 px settles at +-alpha A / (2 - alpha).
    const still = run(camera, panScene(Array(60).fill(640), {
      offsets: k => (k % 2 === 0 ? 0.5 : -0.5) }));
    const amplitude = (alpha * 0.5) / (2 - alpha);
    near(amplitude, 0.106061, 5e-7, 'closed form');
    for (let k = 40; k < 60; k++) {
      const x = still.steps[k].snapshot.tracks[0].geometry.points[0].x * 1280;
      near(x - 580, k % 2 === 0 ? amplitude : -amplitude, 1e-6, `frame ${k}`);
    }
    // The span-based jitter of the same publications: every vertex moves 2 x amplitude.
    const spans = { ...still, steps: still.steps.map((step, k) => ({ snapshot: step.snapshot,
      line: { ...step.line, truth: undefined, span: k >= 40 ? 'static' : 'motion' } })) };
    near(metrics.jitter(spans).jitterPx, 2 * amplitude, 1e-6, 'jitter_px');
    // Pan at 300 px/s from rest: lag_n = v dt (1 - alpha) / alpha (1 - (1 - alpha)^n).
    const xs = [...Array(5).fill(100), ...Array.from({ length: 30 }, (_, n) => 130 + 30 * n),
      ...Array(15).fill(1000)];
    const pan = run(camera, panScene(xs)), steady = (30 * (1 - alpha)) / alpha;
    near(steady, 55.714, 5e-4, 'steady lag');
    const lagN = n => steady * (1 - (1 - alpha) ** n);
    [19.5, 32.175, 40.41].forEach((value, n) => near(lagOf(pan, 5 + n), value, 5e-3, `pan ${n}`));
    for (let n = 1; n <= 30; n++) near(lagOf(pan, 4 + n), lagN(n), 1e-9, `lag ${n}`);
    const series = metrics.lag(pan).series.filter(s => s.sequence <= 35);
    assert.equal(series.length, 29, 'constant-velocity frames: the 2nd to the 30th moving frame');
    series.forEach((s, i) => near(s.lag, lagN(i + 2), 1e-9, `lag_px sample ${i}`));
    near(series[series.length - 1].lag, 55.714, 1e-3, 'lag after 30 frames');
    // After the stop the lag decays by (1 - alpha) per frame; precise returns on the 6th frame.
    const decay = [36.21, 23.54, 15.30, 9.95, 6.46, 4.20];
    decay.forEach((value, j) => {
      near(lagOf(pan, 35 + j), value, 0.005, `stop ${j}`);
      assert.equal(pan.steps[35 + j].snapshot.tracks[0].geometry.precise, j === 5, `precise ${j}`);
    });
    const stop = metrics.settle(pan).events.find(e => e.kind === 'stop');
    assert.equal(stop.sequence, 36);
    assert.equal(stop.frames, 9, 'settle_frames: 55.71 x 0.65^10 < 1 px');
  });

  // One-euro is a replay candidate only: camera.js refuses it as a smoothing option.
  await t.test('3. one-euro candidate: closed forms, and its steps through the post-filter', () => {
    // alpha(f) = 1 / (1 + 1 / (2 pi f Te)) at Te = 0.1 s.
    const alpha = f => oneEuro.alphaFor(f, 0.1), alphaD = alpha(1);
    near(alpha(0.7), 0.305470, 5e-7, 'alpha(0.7 Hz)');
    near(alpha(2.8), 0.637588, 5e-7, 'alpha(2.8 Hz)');
    near(alphaD, 0.385870, 5e-7, 'alpha_d(1 Hz)');
    // A 10 px step from rest: speed 100 px/s filters to 38.587, cutoff 1.385870 Hz.
    const params = { minCutoffHz: 1, beta: 0.01 }, candidate = oneEuro.createCandidate(params);
    const estimate = square(640, 360), aligned = estimate.map(p => ({ x: p.x + 10, y: p.y }));
    const next = candidate.blend({ estimate, aligned, dt: 100, state: candidate.reset() });
    near(next.state.speed, 38.587, 5e-4, 'filtered speed');
    near(next.alpha, 0.465460, 5e-7, 'alpha after the step');
    next.points.forEach((p, i) => near(p.x - estimate[i].x, 4.6546, 5e-5, `vertex ${i}`));
    // Over a smoothing 'none' replay: no move at rest, the 10 px step, then a step that follows
    // the filtered speed. An 80 px jump restarts at the measurement with speed 0, so the next
    // 10 px step moves 4.6546 px again.
    const xs = [...Array(10).fill(640), 650, 660, 740, 750];
    const pan = postFilter(run(camera, panScene(xs), unsmoothed), candidate);
    const at = k => pan.steps[k].snapshot.tracks[0].geometry;
    const offset = k => at(k).points[0].x * 1280 - 580;
    const v1 = alphaD * 100, m1 = 10 * alpha(1 + 0.01 * v1);
    const v2 = v1 + alphaD * ((20 - m1) / 0.1 - v1);
    assert.deepEqual([9, 10, 11, 12, 13].map(k => [at(k).restart, at(k).smoothed]),
      [[null, true], [null, true], [null, true], ['jump', false], [null, true]]);
    near(offset(9), 0, 1e-9, 'at rest');
    near(offset(10), 4.6546, 5e-5, 'first step');
    near(offset(10), m1, 1e-9, 'first step, closed form');
    near(offset(11), m1 + alpha(1 + 0.01 * v2) * (20 - m1), 1e-9, 'second step');
    near(offset(12), 100, 1e-9, 'jump');
    near(offset(13) - 100, 4.6546, 5e-5, 'step after the jump');
    // A same-aspect halving of the resolution: the estimate and the filtered speed are rescaled
    // with the frame before the blend (12.8 px steps, square side 120, then 60 at 640 x 360).
    const b = createBuilder({ scene: 'self-test', seed: 1, noise: 0 });
    const code = makeCode('qr_code', 'SELF-TEST');
    [640, 652.8, 665.6].forEach((x, k) => b.frame({ at: k * 100,
      copies: [{ copy: 'A', code, kind: 'quad', points: square(x, 360) }] }));
    Object.assign(b.lines[3], { width: 640, height: 360 });
    b.lines[3].report.detections[0].occurrences[0].geometry.points = square(332.8, 180, 60);
    const halved = postFilter(run(camera, b.lines, unsmoothed), candidate).steps[2]
      .snapshot.tracks[0].geometry;
    const u1 = alphaD * 128, e1 = 640 + alpha(1 + 0.01 * u1) * 12.8;
    const u2 = u1 / 2 + alphaD * ((332.8 - e1 / 2) / 0.1 - u1 / 2);
    const e2 = e1 / 2 + alpha(1 + 0.01 * u2) * (332.8 - e1 / 2);
    assert.deepEqual([halved.restart, halved.smoothed], [null, true]);
    near(halved.points[0].x, (e2 - 30) / 640, 1e-12, 'halved frame');
  });

  await t.test('4. injected faults count exactly once', () => {
    const r1 = run(camera, generateScene('R1'));
    assert.equal(metrics.identityErrors(r1).idSwitches, 0, 'R1 baseline switches');
    assert.equal(metrics.violations(r1).total, 0, 'R1 baseline violations');
    // One id swap: from frame 50 on, the copy is followed by an id that never entered.
    const id = r1.steps[0].snapshot.tracks[0].id;
    const relabel = s => ({ ...s, snapshot: { ...s.snapshot, tracks: s.snapshot.tracks
      .map(t => (t.id === id ? { ...t, id: 'track-injected' } : t)) } });
    const swapped = metrics.identityErrors({ ...r1,
      steps: r1.steps.map((s, i) => (i < 50 ? s : relabel(s))) });
    assert.equal(swapped.idSwitches, 1, 'id_switches');
    assert.equal(swapped.falseContinuity, 0, 'false_continuity');
    // One split into a fresh id: track-injected enters at frame 50 while the old track lives on
    // (held, its last measurement at frame 49). Without the old id's expiry it is a switch.
    const old = r1.steps[49].snapshot.tracks[0], at = r1.steps[50].line.observedAt;
    const entered = { type: 'entered', trackId: 'track-injected', at, cause: 'new' };
    const split = (expires, s, i) => {
      if (i < 50) return s;
      const tracks = relabel(s).snapshot.tracks, added = [entered];
      if (expires) added.unshift({ type: 'expired', trackId: id, at, reason: 'timeout' });
      return { ...s, snapshot: { ...s.snapshot,
        events: i === 50 ? [...added, ...s.snapshot.events] : s.snapshot.events,
        tracks: expires ? tracks : [...tracks, { ...old, state: 'held' }] } };
    };
    const injected = expires => metrics.identityErrors({ ...r1,
      steps: r1.steps.map((s, i) => split(expires, s, i)) });
    const lived = injected(false), paired = injected(true);
    assert.equal(lived.idSwitches, 1, 'id_switches: entered while the old id lives on');
    assert.deepEqual([lived.switches[0].entered, lived.switches[0].expired], [true, false]);
    assert.equal(paired.idSwitches, 0, 'id_switches: an expired-entered pair is no switch');
    // One counter-clockwise publication: [p0, p3, p2, p1] keeps the origin at index 0.
    const reverse = s => ({ ...s, snapshot: { ...s.snapshot, tracks: s.snapshot.tracks
      .map(t => ({ ...t, geometry: { ...t.geometry,
        points: [0, 3, 2, 1].map(k => t.geometry.points[k]) } })) } });
    const found = metrics.violations({ ...r1,
      steps: r1.steps.map((s, i) => (i === 50 ? reverse(s) : s)) });
    assert.deepEqual([found.total, found.counterClockwise, found.origin], [1, 1, 0], 'violations');
    // One split between co-observed copies: R6 is static, both twins reported, until frame 10.
    // A whole split: both twins' tracks expire with one successor, which enters as a split.
    const r6 = run(camera, generateScene('R6')), baseline = metrics.splits(r6);
    assert.equal(baseline.unexplained, 0, 'R6 baseline unexplained splits');
    const k = 5, twins = r6.steps[k - 1].snapshot.tracks.map(t => t.id);
    const when = r6.steps[k].line.observedAt;
    assert.equal(twins.length, 2, 'R6: two twin tracks before the injected split');
    const expiry = trackId => ({ type: 'expired', trackId, at: when, reason: 'ambiguous',
      successors: ['track-injected'] });
    const events = [...twins.map(expiry),
      { type: 'entered', trackId: 'track-injected', at: when, cause: 'split' }];
    const contested = metrics.splits({ ...r6, steps: r6.steps.map((s, i) => (i !== k ? s
      : { ...s, snapshot: { ...s.snapshot, events: [...events, ...s.snapshot.events] } })) });
    assert.equal(contested.unexplained, 1, 'unexplained_splits: one per split, not per expiry');
    assert.equal(contested.limit + contested.explained, baseline.limit + baseline.explained);
  });

  await t.test('5. post-filter parity: fixed 0.35 reproduces the published points exactly', st => {
    let publications = 0;
    for (const scene of SCENES) {
      const lines = generateScene(scene);
      const base = run(camera, lines), raw = run(camera, lines, { smoothing: { kind: 'none' } });
      const diff = publishedDifference(base, postFilter(raw, fixedCandidate(0.35)));
      assert.equal(diff.max, 0, `${scene}: largest deviation ${diff.max}`);
      publications += diff.publications;
    }
    assert.ok(publications > 3000, `${publications} publications compared`);
    st.diagnostic(`${publications} publications compared`);
  });

  await t.test('6. brute-force reference on a hand-solved twin exchange (T67 instrument)', () => {
    // Two twins, each 1 from its own copy and 2 from the other's: swapping costs 2 more.
    const z = [[1, 2], [2, 1]], leave = [LEAVE_SEEN, LEAVE_SEEN];
    const free = bruteForce(z, leave, false), ruled = bruteForce(z, leave, true);
    assert.equal(free.total, 2);
    assert.deepEqual([[...free.rows], [...free.cols], free.pairs], [[0, 1], [0, 1], []]);
    assert.deepEqual([[...ruled.rows], ruled.pairs], [[], [[0, 0], [1, 1]]]);
    // With the rule, twin 0 may only leave: z11 + leave + start - (z00 + z11).
    assert.equal(ruled.gaps[0], LEAVE_SEEN + START - 1, 'twin 0 gap');
    assert.equal(bruteForce([[1, 1], [1, 1]], leave, false), null, 'a tie is not decided');
  });

  await t.test('7. recorder: salted digests only, and its JSONL replays a session', async () => {
    const { createRecorder, sha256Hex, projectInput } = await import('./replay/recorder.js');
    const texts = ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'b'.repeat(64),
      'é漢🙂'.repeat(5)];
    for (const text of texts) {
      assert.equal(sha256Hex(text), createHash('sha256').update(text, 'utf8').digest('hex'));
    }
    for (const scene of ['R7', 'R8', 'R12']) {
      const lines = generateScene(scene);
      const recorder = createRecorder({ scene, salt: 'replay-test', device: 'node' });
      const live = replay(lines, { createDetectionTracker: options =>
        recorder.track(camera.createDetectionTracker, options) });
      const text = recorder.toJsonl(), recorded = parseJsonl(text);
      for (const field of ['"truth"', '"payload"', '"corners"', '"meta"', '"engines"']) {
        assert.ok(!text.includes(field), `${scene}: ${field} recorded`);
      }
      for (const line of lines.filter(l => l.kind === 'frame')) {
        for (const d of line.report.detections) {
          assert.ok(!text.includes(d.content.raw) && !text.includes(`"${d.content.text}"`),
            `${scene}: ${d.content.text} in clear`);
        }
      }
      assert.equal(recorded[0].source, 'capture');
      const replayed = run(camera, recorded);
      assert.equal(replayed.steps.length, live.steps.length, `${scene}: one line per call`);
      if (scene === 'R7') {
        // Located copies only: the canonical order is positional, so ids and events match.
        const withoutKeys = s => ({ ...identityOf(s), events: s.events.map(({ key, ...e }) => e) });
        assert.deepEqual(replayed.steps.map(s => withoutKeys(s.snapshot)),
          live.steps.map(s => withoutKeys(s.snapshot)), `${scene}: identity after the round trip`);
        assert.equal(publishedDifference(live, replayed).max, 0, `${scene}: published points`);
      }
      // Digests reorder distinct contents among position-less reads, which are sorted by
      // content key, so ids may be relabelled: per step, the multisets of tracks and events
      // are the same.
      const label = s => ({ status: s.status, tracks: s.tracks.map(t => JSON.stringify([t.state,
        t.basis, t.misses, t.firstSeenAt, t.lastSeenAt, t.geometry && t.geometry.points])).sort(),
      events: s.events.map(({ type, at, reason, cause }) => JSON.stringify([type, at, reason,
        cause])).sort() });
      const i = firstDifference(live.steps.map(s => label(s.snapshot)),
        replayed.steps.map(s => label(s.snapshot)));
      if (i >= 0) {
        assert.deepEqual(label(replayed.steps[i].snapshot), label(live.steps[i].snapshot),
          `${scene}: step ${i} after the round trip`);
      }
      // Contents stay comparable: one digest per raw content, and the reverse.
      const pairs = new Set(), frames = recorded.filter(l => l.kind === 'frame');
      lines.filter(l => l.kind === 'frame').forEach((line, k) => line.report.detections
        .forEach((d, j) => pairs.add(JSON.stringify([d.content.raw,
          frames[k].report.detections[j].content.raw]))));
      const raws = [...pairs].map(p => JSON.parse(p));
      assert.equal(new Set(raws.map(r => r[0])).size, raws.length, `${scene}: digest per raw`);
      assert.equal(new Set(raws.map(r => r[1])).size, raws.length, `${scene}: raw per digest`);
    }
    const recorder = createRecorder({ salt: 'replay-test' }), frame = { width: 640, height: 480,
      observedAt: 10 };
    recorder.mark('motion');
    assert.equal(recorder.recordFrame({ detections: [] }, frame, { now: 20 }).span, 'motion');
    recorder.mark(null);
    assert.equal('span' in recorder.recordFrame({ detections: [] }, frame, { now: 30 }), false);
    assert.throws(() => recorder.mark('moving'), RangeError);
    // An array input with { complete } keeps its proof of absence in the recorded trace.
    assert.equal(projectInput([], { complete: true }, x => x).trace.budget_exhausted, false);
    assert.equal(projectInput([], undefined, x => x).trace.budget_exhausted, true);
  });

  await t.test('8. adoption rule: a missing measurement counts as worse', () => {
    const scene = (jitter, lag, settle, norm = 0.01) => ({ corner_err_norm: norm, violations: 0,
      unexplained_splits: 0, jitter_px: jitter, lag_px: lag, settle_frames: settle });
    const settled = { mean: 9, max: 9, events: 1, unsettled: 0 };
    const baseline = { R1: scene(1, null, null), R2: scene(1, 10, null),
      R9: scene(1, 10, settled) };
    const verdict = (r1, r2, settle) => adoption(baseline, { R1: r1, R2: r2,
      R9: scene(1, 10, settle) }, true);
    const calm = scene(0.5, null, null);
    assert.equal(verdict(calm, baseline.R2, settled).synthetic, true, 'R1 jitter halved');
    assert.equal(verdict(calm, baseline.R2, settled).tradeoff, 'jitter');
    assert.equal(verdict(calm, baseline.R2, { ...settled, mean: null, max: null, unsettled: 1 })
      .synthetic, false, 'R9 never settles');
    assert.equal(verdict(calm, baseline.R2, { ...settled, mean: 5, events: 2, unsettled: 1 })
      .synthetic, false, 'R9 leaves one more stop unsettled');
    assert.equal(verdict(scene(null, null, null), baseline.R2, settled).synthetic, false,
      'R1 jitter not measured');
    assert.equal(verdict(calm, scene(1, null, null), settled).synthetic, false,
      'R2 lag not measured');
    assert.deepEqual(verdict(calm, scene(1, 10, null, null), settled).cornerWorse, ['R2'],
      'corner_err_norm not measured');
  });
});

// ------------------------------------------------- T67: the solver against brute force

// Ties and thresholds closer than this are skipped: float order, not the rule, would decide.
const EPS = 1e-6;
const byJson = (a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);

// Every matching of rows to columns over finite cells, as [row, column] pairs by row.
function matchings(z) {
  const T = z.length, O = z[0].length, out = [];
  const walk = (r, used, pairs) => {
    if (r === T) {
      out.push(pairs.slice());
      return;
    }
    walk(r + 1, used, pairs);
    for (let c = 0; c < O; c++) {
      if ((used & (1 << c)) !== 0 || z[r][c] === Infinity) continue;
      pairs.push([r, c]);
      walk(r + 1, used | (1 << c), pairs);
      pairs.pop();
    }
  };
  walk(0, 0, []);
  return out;
}

// Total of the augmented assignment: matched costs, leave costs of unmatched rows and the
// start cost of unmatched columns (the remaining dummy cells cost 0).
function totalOf(z, leave, pairs) {
  let total = START * (z[0].length - pairs.length);
  leave.forEach((cost, r) => {
    if (!pairs.some(p => p[0] === r)) total += cost;
  });
  for (const [r, c] of pairs) total += z[r][c];
  return total;
}

const columnOf = (pairs, r) => (pairs.find(p => p[0] === r) || [r, -1])[1];
const rowOf = (pairs, c) => (pairs.find(p => p[1] === c) || [-1, c])[0];

/**
 * One component decided by enumeration: the optimum and, per matched pair, the cheapest
 * alternative without it (at stage 0, also without the exchanges the co-observed rule bans).
 * The rows and columns that alternative changes are contested when it costs < MARGIN more.
 * null when a tie or a threshold is within EPS.
 */
function bruteForce(z, leave, stageZero) {
  const T = z.length, O = z[0].length, all = matchings(z);
  const costs = all.map(m => totalOf(z, leave, m));
  const order = all.map((_, i) => i).sort((x, y) => costs[x] - costs[y]);
  if (order.length > 1 && costs[order[1]] - costs[order[0]] < EPS) return null;
  const best = all[order[0]], total = costs[order[0]];
  const a = (r, c) => (z[r][c] === Infinity ? BIG : z[r][c]);
  const rows = new Set(), cols = new Set(), gaps = [];
  for (const [r, c] of best) {
    const banned = new Set();
    for (const [t, c2] of best) {
      if (!stageZero || t === r) continue;
      const keep = a(r, c) + a(t, c2), swap = a(r, c2) + a(t, c);
      if (Math.abs(keep - swap) < EPS) return null;
      if (keep < swap) banned.add(t);
    }
    const admitted = order.filter(i => !all[i].some(([x, y]) => y === c &&
      (x === r || banned.has(x))));
    const gap = costs[admitted[0]] - total;
    gaps.push(gap);
    if (Math.abs(gap - MARGIN) < EPS) return null;
    if (gap >= MARGIN) continue;
    if (admitted.length > 1 && costs[admitted[1]] - costs[admitted[0]] < EPS) return null;
    const other = all[admitted[0]];
    for (let i = 0; i < T; i++) if (columnOf(best, i) !== columnOf(other, i)) rows.add(i);
    for (let j = 0; j < O; j++) if (rowOf(best, j) !== rowOf(other, j)) cols.add(j);
  }
  return { total, best, gaps, rows, cols, pairs: best.filter(([r]) => !rows.has(r)) };
}

// Union-find components of finite cells that hold both rows and columns.
function componentsOf(z) {
  const T = z.length, O = T ? z[0].length : 0, parent = [...Array(T + O).keys()];
  const find = k => (parent[k] === k ? k : (parent[k] = find(parent[k])));
  z.forEach((row, i) => row.forEach((cost, j) => {
    if (cost !== Infinity) parent[find(i)] = find(T + j);
  }));
  const groups = new Map();
  for (let k = 0; k < T + O; k++) {
    const root = find(k);
    if (!groups.has(root)) groups.set(root, { rows: [], cols: [] });
    if (k < T) groups.get(root).rows.push(k);
    else groups.get(root).cols.push(k - T);
  }
  return [...groups.values()].filter(g => g.rows.length > 0 && g.cols.length > 0);
}

// Quad-to-quad cost, flagged when a gate is within float reach of its threshold.
function quadCost(t, o, dt) {
  const dx = o.cx - t.cx, dy = o.cy - t.cy, dc2 = dx * dx + dy * dy, s2 = Math.max(t.s2, o.s2);
  const sigma = 0.15 + Math.min(Math.max(dt, 0), 1), z2 = dc2 / (s2 * sigma * sigma);
  const near = Math.abs(dc2 - 2.25 * s2) < 1e-9 * s2 || Math.abs(z2 - 9) < EPS ||
    Math.abs(s2 - 4 * Math.min(t.s2, o.s2)) < 1e-9 * s2;
  return { z: referenceCost(t, o, dt), near };
}

/**
 * The decisions expected from one frame (matching cascade by level, then splits): tracks
 * { id, ref, lastSeenAt, level, lost } by level, observations { index, desc } at `at` ms.
 */
function expectedFrame(tracks, observations, at) {
  const levels = [...new Set(tracks.map(t => t.level))].sort((x, y) => x - y);
  const matches = new Map(), contests = [], components = [];
  let free = observations;
  for (const level of levels) {
    const stage = tracks.filter(t => t.level === level);
    let near = false;
    const z = stage.map(t => free.map(o => {
      const cost = quadCost(t.ref, o.desc, (at - t.lastSeenAt) / 1000);
      near = near || cost.near;
      return cost.z;
    }));
    if (near) return null;
    const taken = new Set();
    for (const { rows, cols } of componentsOf(z)) {
      const ts = rows.map(i => stage[i]), os = cols.map(j => free[j]);
      if (ts.length === 1 && os.length === 1) {
        matches.set(ts[0].id, os[0].index);
        taken.add(os[0].index);
        continue;
      }
      const sub = rows.map(i => cols.map(j => z[i][j]));
      const leave = ts.map(t => (t.lost ? LEAVE_LOST : LEAVE_SEEN));
      const solved = bruteForce(sub, leave, level === 0);
      if (solved === null) return null;
      components.push({ ids: ts.map(t => t.id), indices: os.map(o => o.index), z: sub, leave,
        solved, stageZero: level === 0,
        unruled: level === 0 ? bruteForce(sub, leave, false) : solved });
      for (const [r, c] of solved.pairs) {
        matches.set(ts[r].id, os[c].index);
        taken.add(os[c].index);
      }
      if (solved.rows.size === 0) continue;
      contests.push({ tracks: [...solved.rows].map(r => ts[r].id),
        observations: [...solved.cols].map(c => os[c].index) });
      for (const c of solved.cols) taken.add(os[c].index);
    }
    free = free.filter(o => !taken.has(o.index));
  }
  return { matches, contests, components };
}

// One random instance: setup frames leave live tracks of one content at the mode's level, then
// a test frame brings O observations; sides 80-140 px, most observations near a setup copy.
function instance(rnd, mode) {
  const T = mode === 'mixed' ? 2 + rnd.int(5) : 1 + rnd.int(6), O = 1 + rnd.int(7 - T);
  const code = makeCode('qr_code', 'T67-COPY');
  const place = () => ({ cx: 640 + rnd.uniform(-150, 150), cy: 360 + rnd.uniform(-150, 150),
    side: rnd.uniform(80, 140), angle: rnd.uniform(0, 2 * Math.PI) });
  const close = s => ({ cx: s.cx + rnd.uniform(-0.9, 0.9) * s.side,
    cy: s.cy + rnd.uniform(-0.9, 0.9) * s.side,
    side: Math.min(140, Math.max(80, s.side * rnd.uniform(0.85, 1.15))),
    angle: s.angle + rnd.uniform(-0.3, 0.3) });
  const setup = Array.from({ length: T }, place);
  const test = Array.from({ length: O }, () => (rnd.next() < 0.75 ? close(setup[rnd.int(T)])
    : place()));
  const copies = (list, name) => list.map((q, i) => ({ copy: `${name}${i}`, code, kind: 'quad',
    points: square(q.cx, q.cy, q.side, q.angle) }));
  // The test frame comes 100-700 ms after the setup copies were measured, so that sigma and the
  // costs span their range at every level (lost tracks stay below reacquireMs).
  const steps = { stage0: 1, level1: 2, lost: 3, mixed: 2 }[mode];
  const interval = () => rnd.uniform(100, 700) / steps;
  const b = createBuilder({ scene: `T67-${mode}`, seed: 1, noise: 0 });
  let at = 0;
  b.frame({ at, copies: copies(setup, 's') });
  if (mode === 'level1') b.frame({ at: at += interval(), copies: [], budgetExhausted: true });
  if (mode === 'lost') {
    b.frame({ at: at += interval(), copies: [] });
    b.frame({ at: at += interval(), copies: [] });
  }
  if (mode === 'mixed') {
    b.frame({ at: at += interval(), copies: copies(setup.slice(0, 1 + rnd.int(T - 1)), 's') });
  }
  b.frame({ at: at += interval(), copies: copies(test, 'o') });
  return b.lines;
}

/**
 * Replays one instance and compares the public decisions of its last frame with the brute-force
 * expectation. The state before that frame is read from the tracker's own snapshot: each live
 * track's last measurement (its observation address), lastSeenAt, level and lost state.
 * Decisions only: the solver's totals and avoidance extras are internal to the module, so an
 * extra is checked by the side of MARGIN it falls on, never by its value.
 */
function checkInstance(camera, lines) {
  const trace = run(camera, lines), n = trace.steps.length;
  const before = trace.steps[n - 2].snapshot, { line, snapshot: after } = trace.steps[n - 1];
  const bySequence = new Map(lines.filter(l => l.kind === 'frame').map(l => [l.sequence, l]));
  const describe = points => describeGeometry('quad', points, 1280, 'qr_code');
  const pointsAt = o => bySequence.get(o.sequence).report.detections[o.detectionIndex]
    .occurrences[o.occurrenceIndex].geometry.points;
  const live = before.tracks.map(t => ({ id: t.id, ref: describe(pointsAt(t.observation)),
    lastSeenAt: t.lastSeenAt, level: line.sequence - t.observation.sequence - 1,
    lost: t.state === 'lost' }));
  const occurrences = line.report.detections[0].occurrences;
  if (live.length + occurrences.length > 7) return null;
  const observations = occurrences.map((o, index) =>
    ({ index, desc: describe(o.geometry.points) }));
  const expected = expectedFrame(live, observations, line.observedAt);
  if (expected === null) return null;
  const ids = new Set(live.map(t => t.id));
  const matched = new Map(after.tracks.filter(t => ids.has(t.id) &&
    t.observation.sequence === line.sequence).map(t => [t.id, t.observation.occurrenceIndex]));
  const expired = after.events.filter(e => e.type === 'expired');
  const causes = new Map(after.events.filter(e => e.type === 'entered')
    .map(e => [e.trackId, e.cause]));
  const created = after.tracks.filter(t => causes.has(t.id));
  const idAt = new Map(created.map(t => [t.observation.occurrenceIndex, t.id]));
  const split = new Set(expected.contests.flatMap(c => c.observations));
  const taken = new Set(expected.matches.values());
  const observed = { matches: [...matched].sort(byJson),
    expired: expired.map(e => [e.trackId, e.reason, [...(e.successors || [])].sort()]).sort(byJson),
    entered: created.map(t => [t.observation.occurrenceIndex, causes.get(t.id)]).sort(byJson) };
  const want = { matches: [...expected.matches].sort(byJson),
    expired: expected.contests.flatMap(c => c.tracks.map(id => [id, 'ambiguous',
      c.observations.map(j => idAt.get(j) || `none@${j}`).sort()])).sort(byJson),
    entered: observations.filter(o => !taken.has(o.index))
      .map(o => [o.index, split.has(o.index) ? 'split' : 'new']).sort(byJson) };
  const ruleChanged = expected.components.filter(c => c.stageZero && c.unruled !== null &&
    JSON.stringify([[...c.unruled.rows], c.unruled.pairs]) !==
    JSON.stringify([[...c.solved.rows], c.solved.pairs])).length;
  return { observed, want, same: JSON.stringify(observed) === JSON.stringify(want),
    components: expected.components, contests: expected.contests.length, ruleChanged,
    size: live.length + occurrences.length };
}

test('T67 association decisions against a brute-force reference', async t => {
  const camera = await loaded, rnd = createRandom(67);
  // Augmented matrices to solve with the co-observed rule (stage 0) and without (later levels).
  const want = { ruled: 1850, unruled: 1850 }, seen = { ruled: 0, unruled: 0 };
  const stats = { instances: 0, skipped: 0, contests: 0, ruleChanged: 0 };
  const failures = [], modes = ['stage0', 'level1', 'lost', 'mixed'];
  for (let k = 0; (seen.ruled < want.ruled || seen.unruled < want.unruled) && k < 60000; k++) {
    const lines = instance(rnd, modes[k % modes.length]), result = checkInstance(camera, lines);
    if (result === null) {
      stats.skipped++;
      continue;
    }
    stats.instances++;
    for (const c of result.components) seen[c.stageZero ? 'ruled' : 'unruled']++;
    stats.contests += result.contests;
    stats.ruleChanged += result.ruleChanged;
    if (!result.same) {
      failures.push({ mode: lines[0].scene, size: result.size, observed: result.observed,
        expected: result.want, lines: toJsonl(lines) });
    }
  }
  t.diagnostic(`matrices: ${JSON.stringify(seen)}; ${JSON.stringify(stats)}; decisions only, ` +
    'totals and extras are not exported by the module');
  if (failures.length) {
    const { lines, ...first } = failures[0];
    t.diagnostic(`first failure: ${JSON.stringify(first)}`);
    const digest = createHash('sha256').update(lines).digest('hex');
    t.diagnostic(`its lines (sha256 ${digest}):\n${lines}`);
  }
  assert.ok(seen.ruled >= want.ruled && seen.unruled >= want.unruled,
    `solved matrices ${JSON.stringify(seen)}`);
  assert.equal(failures.length, 0, `${failures.length} of ${stats.instances} instances differ`);
  assert.ok(stats.contests > 0 && stats.ruleChanged > 0, 'the sample holds contests, rule cases');
});

// --------------------------------------------------------------- T68-T70: the scenes

// The first step whose projections differ, or -1.
function firstDifference(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return i;
  return -1;
}

test('T68 determinism: shuffled wire order gives the same canonical snapshots',
  async () => {
    const camera = await loaded, canon = s => canonical(s.snapshot, camera.contentKey);
    for (const scene of SCENES) {
      const lines = generateScene(scene), reference = run(camera, lines).steps.map(canon);
      for (const seed of [1, 2]) {
        const shuffled = run(camera, shuffleWireOrder(lines, seed)).steps.map(canon);
        const i = firstDifference(reference, shuffled);
        assert.equal(shuffled.length, reference.length);
        if (i >= 0) assert.deepEqual(shuffled[i], reference[i], `${scene} seed ${seed} step ${i}`);
      }
    }
  });

test('T69 smoothing never changes identity: ids, slots, bases, states and events', async () => {
  const camera = await loaded;
  const options = [{ kind: 'none' }, { kind: 'fixed', alpha: 0.6 }, 1, 0.1];
  for (const scene of SCENES) {
    const lines = generateScene(scene);
    const reference = run(camera, lines).steps.map(s => identityOf(s.snapshot));
    for (const smoothing of options) {
      const other = run(camera, lines, { smoothing }).steps.map(s => identityOf(s.snapshot));
      const i = firstDifference(reference, other);
      if (i >= 0) {
        assert.deepEqual(other[i], reference[i], `${scene} ${JSON.stringify(smoothing)} step ${i}`);
      }
    }
  }
});

test('T70 default gates on R1-R16 with fixed 0.35', async t => {
  const camera = await loaded, survival = ['R1', 'R6', 'R13', 'R15', 'R16'];
  // The closed forms assume centre scan rows: R15 is also run that way.
  const runs = SCENES.map(scene => ({ name: scene, scene, lines: generateScene(scene) }));
  runs.push({ name: 'R15 centre rows', scene: 'R15',
    lines: generateScene('R15', { rows: 'centre' }) });
  const summary = {};
  for (const { name, scene, lines } of runs) {
    const trace = run(camera, lines), m = metrics.sceneMetrics(trace);
    const problems = metrics.frameChecks(trace);
    summary[name] = { limit: m.limit_splits, predicted: m.predicted_limit_splits,
      survival: m.selection_survival, flicker: m.flicker };
    assert.deepEqual(problems.slice(0, 3), [], `${name}: ${problems.length} frame checks fail`);
    assert.equal(m.violations, 0, `${name} violations`);
    assert.equal(m.false_continuity, 0, `${name} false continuity`);
    assert.equal(m.id_switches, 0, `${name} id switches`);
    assert.equal(m.unexplained_splits, 0, `${name} unexplained splits`);
    assert.equal(m.limit_splits, m.predicted_limit_splits, `${name} limit splits`);
    if (survival.includes(scene)) assert.equal(m.selection_survival, 1, `${name} survival`);
    // R4 turns 9 degrees per frame: the identity order wins by far, so nothing reorients.
    if (scene === 'R4') {
      assert.equal(m.restarts.counts.reoriented, undefined, `${name} reoriented restarts`);
    }
    if (lines[0].generator.rows === 'centre' || scene === 'R16') {
      assert.equal(m.predicted_limit_splits, NOMINAL[scene].limitSplits, `${name} nominal`);
    }
  }
  t.diagnostic(JSON.stringify(summary));
});
