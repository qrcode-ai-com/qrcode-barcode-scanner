/** Browser helpers: no DOM access or camera permission request at import time. */
export const TRACKER_LIMITS = Object.freeze({
  detections: 16, occurrences: 16, observationsPerKey: 16, tracksPerKey: 16, tracks: 64,
  quarantine: 64,
});
const LEAVE_SEEN = 9.5, LEAVE_LOST = 6.5, START = 6.5, MARGIN = 4, BIG = 1e6;
const COST_GATE = 9, COS2_20 = 0.8830222215594891, SIZE_FLOOR = 0.0004;
const TALL_BARS = ['ean13', 'ean8', 'upc_a', 'upc_e'];

// ------------------------------------------------------------------------ identities

/** spec/01 dedupe key; two located ECI lists can share it (use sameContent). */
export function contentKey({ symbology, content }) {
  return JSON.stringify([symbology, content.raw, content.fnc1 ?? null, content.eci !== undefined]);
}

const eciOf = detection => (Array.isArray(detection.content.eci)
  ? detection.content.eci : undefined);
const isLocated = eci => eci !== undefined && eci.length > 0;
const eciEqual = (a, b) => a.length === b.length &&
  a.every((entry, i) => entry.designator === b[i].designator && entry.start === b[i].start);
// Both absent, either [] (signalled, not located), or both located and equal. Not transitive.
function eciCompatible(a, b) {
  if (a === undefined || b === undefined) return a === b;
  return a.length === 0 || b.length === 0 || eciEqual(a, b);
}
// A located list replaces [], never the reverse.
const moreSpecific = (held, seen) => (held !== undefined && held.length === 0 && isLocated(seen)
  ? seen : held);

export function sameContent(a, b) {
  return contentKey(a) === contentKey(b) && eciCompatible(eciOf(a), eciOf(b));
}

// ------------------------------------------------------------------------ validation

const finitePoint = p => p !== null && typeof p === 'object' &&
  Number.isFinite(p.x) && Number.isFinite(p.y);
const doubleArea = p => p.reduce((sum, a, i) => {
  const b = p[(i + 1) % p.length];
  return sum + a.x * b.y - b.x * a.y;
}, 0);
const turn = (a, b, c) => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);

// Finite, in-tolerance points, deduplicated bit-exactly, first 8 kept; empty means dropped.
function partialOf(points, downgrade, emptyReason) {
  const kept = [];
  for (const p of points) {
    const seen = kept.some(q => Object.is(q.x, p.x) && Object.is(q.y, p.y));
    if (kept.length < 8 && !seen) kept.push(p);
  }
  return kept.length ? { kind: 'partial', points: kept, downgrade } : { reason: emptyReason };
}

/** Engine-equivalent validation in source pixels: { kind, points, downgrade } or { reason }. */
function validateGeometry(geometry, width, height) {
  if (geometry === null || typeof geometry !== 'object') return { reason: 'malformed' };
  const { kind } = geometry;
  if (kind === 'unavailable') return { reason: 'unavailable' };
  if (!['quad', 'segment', 'partial'].includes(kind)) return { reason: 'unknown-kind' };
  if (!Array.isArray(geometry.points)) return { reason: 'malformed' };
  const tolerance = Math.max(2, 0.02 * Math.max(width, height));
  const points = geometry.points;
  const kept = points.filter(p => finitePoint(p) && p.x >= -tolerance && p.x <= width + tolerance &&
    p.y >= -tolerance && p.y <= height + tolerance).map(p => ({ x: p.x, y: p.y }));
  if (kind === 'partial') {
    return partialOf(kept, null,
      points.length === 0 ? 'count' : points.some(finitePoint) ? 'outside' : 'not-finite');
  }
  const failed = points.length !== (kind === 'quad' ? 4 : 2) ? 'count'
    : !points.every(finitePoint) ? 'not-finite' : kept.length < points.length ? 'outside' : null;
  if (failed) return partialOf(kept, failed, failed);
  if (kind === 'segment') {
    const dx = kept[1].x - kept[0].x, dy = kept[1].y - kept[0].y;
    return dx * dx + dy * dy >= 1 ? { kind, points: kept, downgrade: null }
      : partialOf([kept[0]], 'length', 'length');
  }
  // As in the engine's clockwise_quad: the area check comes before the orientation check.
  if (Math.abs(doubleArea(kept)) / 2 < 4) return partialOf(kept, 'area', 'area');
  const turns = kept.map((p, i) => turn(p, kept[(i + 1) % 4], kept[(i + 2) % 4]));
  if (!turns.every(t => t > 0) && !turns.every(t => t < 0)) {
    return partialOf(kept, 'not-convex', 'not-convex');
  }
  // Never reordered: reversing a counter-clockwise quad would guess its origin.
  if (turns[0] < 0) return partialOf(kept, 'counter-clockwise', 'counter-clockwise');
  return { kind, points: kept, downgrade: null };
}

// --------------------------------------------------------- correspondence and smoothing

const QR_FAMILY = ['qr_code', 'micro_qr_code', 'rectangular_micro_qr_code'];
const shifted = (points, k) => points.map((_, i) => points[(i + k) % points.length]);
function squaredDistances(a, b) {
  let sum = 0;
  a.forEach((p, i) => {
    const dx = p.x - b[i].x, dy = p.y - b[i].y;
    sum += dx * dx + dy * dy;
  });
  return sum;
}

/** The measurement in the track's vertex order, and whether that order is in doubt. */
function correspond(points, previous, kind, symbology) {
  if (kind === 'segment') {
    // Segments have no origin: a swap is not a restart.
    const swapped = [points[1], points[0]];
    const swap = squaredDistances(swapped, previous) < squaredDistances(points, previous);
    return { points: swap ? swapped : points, reoriented: false };
  }
  const costs = [0, 1, 2, 3].map(k => squaredDistances(shifted(points, k), previous));
  // points[0] is the QR family's symbol origin: identity order only, never reversed.
  if (QR_FAMILY.includes(symbology)) {
    return { points, reoriented: costs.some(cost => cost < costs[0]) };
  }
  let best = 0;
  costs.forEach((cost, k) => {
    if (cost < costs[best]) best = k;
  });
  const second = Math.min(...costs.filter((_, k) => k !== best));
  return { points: shifted(points, best), reoriented: second <= 1.5 * costs[best] };
}

// Squared size: the area of a quad, the squared length of a segment.
function size2(kind, p) {
  if (kind === 'quad') return Math.abs(doubleArea(p)) / 2;
  const dx = p[1].x - p[0].x, dy = p[1].y - p[0].y;
  return dx * dx + dy * dy;
}

// A jump, tested on squares: RMS vertex displacement above half the previous size, or a
// squared-size ratio outside [0.5, 2].
function jumped(kind, points, previous) {
  const before = size2(kind, previous), after = size2(kind, points);
  return squaredDistances(points, previous) / points.length > 0.25 * before ||
    after < 0.5 * before || after > 2 * before;
}

const blend = (estimate, points, alpha) => estimate.map((e, i) => ({
  x: e.x + alpha * (points[i].x - e.x), y: e.y + alpha * (points[i].y - e.y) }));

// ----------------------------------------------------------- descriptors, order and cost

/** Descriptor in isotropic units u = px / max(width, height). */
function describe(kind, points, scale, symbology) {
  const p = points.map(q => ({ x: q.x / scale, y: q.y / scale }));
  let cx = 0, cy = 0;
  for (const q of p) { cx += q.x; cy += q.y; }
  const d = { kind, p, cx: cx / p.length, cy: cy / p.length, s2: 0, ax: 0, ay: 0, l2: 0, kappa: 0 };
  if (kind === 'quad') d.s2 = Math.abs(doubleArea(p)) / 2;
  else if (kind === 'segment') {
    d.ax = p[1].x - p[0].x;
    d.ay = p[1].y - p[0].y;
    d.l2 = d.ax * d.ax + d.ay * d.ay;
    // kappa is an assumed bar height over scan length: a prior for association only.
    d.kappa = TALL_BARS.includes(symbology) ? 0.7 : 0.25;
    d.s2 = d.kappa * d.l2;
  } else {
    const xs = p.map(q => q.x), ys = p.map(q => q.y);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    d.s2 = (w * w + h * h) / 2;
  }
  d.s2 = Math.max(d.s2, SIZE_FLOOR);
  return d;
}

const KIND_RANK = { quad: 0, segment: 1, partial: 2 };
const readerRank = reader => (reader === 'rqrr' ? 1 : reader === 'rxing' ? 2 : 0);
const compareValues = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Canonical order C: exact comparisons; the wire address only orders bit-identical reads. */
function compareObservations(a, b) {
  if (a.located !== b.located) return a.located ? -1 : 1;
  if (a.located) {
    const order = compareValues(a.desc.cy, b.desc.cy) || compareValues(a.desc.cx, b.desc.cx) ||
      KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (order) return order;
  }
  const content = compareValues(a.key, b.key) || compareValues(a.eciJson, b.eciJson);
  if (content) return content;
  if (a.located) {
    for (let i = 0; i < Math.min(a.points.length, b.points.length); i++) {
      const order = compareValues(a.points[i].x, b.points[i].x) ||
        compareValues(a.points[i].y, b.points[i].y);
      if (order) return order;
    }
    const order = a.points.length - b.points.length || readerRank(a.reader) - readerRank(b.reader);
    if (order) return order;
  }
  return a.detectionIndex - b.detectionIndex ||
    (a.occurrenceIndex === null ? -1 : a.occurrenceIndex) -
    (b.occurrenceIndex === null ? -1 : b.occurrenceIndex);
}

// Squared distance from a point to a clockwise convex quad; 0 inside.
function quadDistance2(x, y, quad) {
  let inside = true, best = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = quad[i], b = quad[(i + 1) % 4], ex = b.x - a.x, ey = b.y - a.y;
    const px = x - a.x, py = y - a.y;
    if (ex * py - ey * px < 0) inside = false;
    const t = Math.min(Math.max((px * ex + py * ey) / (ex * ex + ey * ey), 0), 1);
    const dx = px - t * ex, dy = py - t * ey;
    best = Math.min(best, dx * dx + dy * dy);
  }
  return inside ? 0 : best;
}

/**
 * The cost z² of a reference t against an observation o, dt seconds apart, or Infinity when
 * a gate fails: a size ratio above 2 between quads or between segments, segment axes more
 * than 20 degrees apart, a centre distance above 1.5 sizes, or z² above 9. Only + - * / and
 * comparisons decide.
 */
function pairCost(t, o, dt) {
  const segments = t.kind === 'segment' && o.kind === 'segment';
  if ((segments || (t.kind === 'quad' && o.kind === 'quad')) &&
      Math.max(t.s2, o.s2) > 4 * Math.min(t.s2, o.s2)) return Infinity;
  if (segments) {
    const dot = t.ax * o.ax + t.ay * o.ay;
    if (dot * dot < COS2_20 * t.l2 * o.l2) return Infinity;
  }
  const dx = o.cx - t.cx, dy = o.cy - t.cy, dc2 = dx * dx + dy * dy;
  const s2 = Math.max(t.s2, o.s2);
  if (dc2 > 2.25 * (segments ? Math.max(t.l2, o.l2) : s2)) return Infinity;
  const sigma = 0.15 + Math.min(Math.max(dt, 0), 1), sigma2 = sigma * sigma;
  let z2;
  if (segments) {
    // Along and across t's axis; the across allowance adds (h/2)², h = kappa * length.
    const along = dx * t.ax + dy * t.ay, along2 = along * along / t.l2;
    const across2 = Math.max(dc2 - along2, 0), h2 = t.kappa * t.kappa * Math.max(t.l2, o.l2);
    z2 = along2 / (s2 * sigma2) + across2 / (s2 * sigma2 + h2 / 4);
  } else if (t.kind === 'quad' && o.kind === 'partial') {
    z2 = quadDistance2(o.cx, o.cy, t.p) / (t.s2 * sigma2);
  } else if (t.kind === 'partial' && o.kind === 'quad') {
    z2 = quadDistance2(t.cx, t.cy, o.p) / (s2 * sigma2);
  } else z2 = dc2 / (s2 * sigma2);
  return z2 <= COST_GATE ? z2 : Infinity;
}

// -------------------------------------------------------------------------------- solver

/** Kuhn-Munkres with potentials, O(n³). Strict comparisons: the lowest index wins ties. */
function assign(a) {
  const n = a.length, u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const rowCol = new Array(n), colRow = new Array(n);
  for (let j = 1; j <= n; j++) { rowCol[p[j] - 1] = j - 1; colRow[j - 1] = p[j] - 1; }
  return { rowCol, colRow, u: u.slice(1), v: v.slice(1) };
}

/**
 * Avoidance: the cheapest increase of an assignment without cell (r, c), by Dijkstra on reduced
 * costs (all >= 0 at the optimum), with the rows and columns of its alternating cycle.
 */
function avoid(a, solution, r, c, forbidden) {
  const n = a.length, { colRow, u, v } = solution;
  const reduced = (i, j) => Math.max(a[i][j] - u[i] - v[j], 0);
  const dist = new Array(n).fill(Infinity), from = new Array(n).fill(-1);
  const done = new Array(n).fill(false);
  for (let j = 0; j < n; j++) if (j !== c && !forbidden(r, j)) dist[j] = reduced(r, j);
  for (;;) {
    let j = -1;
    for (let k = 0; k < n; k++) if (!done[k] && (j < 0 || dist[k] < dist[j])) j = k;
    if (j < 0 || dist[j] === Infinity) return { extra: Infinity, rows: [], cols: [] };
    if (j === c) break;
    done[j] = true;
    const i = colRow[j];
    for (let k = 0; k < n; k++) {
      if (done[k] || forbidden(i, k)) continue;
      const d = dist[j] + reduced(i, k);
      if (d < dist[k]) { dist[k] = d; from[k] = j; }
    }
  }
  const rows = [r], cols = [];
  for (let k = c; k >= 0; k = from[k]) {
    cols.push(k);
    if (from[k] >= 0) rows.push(colRow[from[k]]);
  }
  return { extra: dist[c], rows, cols };
}

/** Union-find components of gated pairs, in ascending order of their smallest track. */
function components(z) {
  const tracks = z.length, observations = tracks ? z[0].length : 0, parent = [];
  for (let k = 0; k < tracks + observations; k++) parent.push(k);
  const find = k => { while (parent[k] !== k) k = parent[k] = parent[parent[k]]; return k; };
  for (let i = 0; i < tracks; i++) {
    for (let j = 0; j < observations; j++) {
      if (z[i][j] === Infinity) continue;
      const a = find(i), b = find(tracks + j);
      if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
    }
  }
  const byRoot = new Map();
  for (let k = 0; k < tracks + observations; k++) {
    const root = find(k);
    if (!byRoot.has(root)) byRoot.set(root, { rows: [], cols: [] });
    if (k < tracks) byRoot.get(root).rows.push(k); else byRoot.get(root).cols.push(k - tracks);
  }
  return [...byRoot.values()].filter(group => group.rows.length && group.cols.length)
    .sort((x, y) => x.rows[0] - y.rows[0]);
}

/**
 * Solves one component: z holds gated costs (Infinity otherwise), leave the leave cost of each
 * track row. Returns the uncontested pairs and the contested rows and columns: contested
 * tracks retire as ambiguous, and their observations start new tracks (a split).
 */
function solveComponent(z, leave, stageZero) {
  const T = z.length, O = z[0].length, n = T + O, a = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(BIG);
    if (i < T) {
      for (let j = 0; j < O; j++) if (z[i][j] !== Infinity) row[j] = z[i][j];
      row[O + i] = leave[i];
    } else {
      row[i - T] = START;
      row.fill(0, O);
    }
    a.push(row);
  }
  const solution = assign(a), contestedRows = new Set(), contestedCols = new Set(), pairs = [];
  for (let r = 0; r < T; r++) {
    const c = solution.rowCol[r];
    if (c >= O) continue;
    pairs.push([r, c]);
    // Co-observed copies: no exchange with another stage-0 match that costs more than keeping.
    const banned = new Set();
    for (let t = 0; stageZero && t < T; t++) {
      const c2 = solution.rowCol[t];
      if (t !== r && c2 < O && a[r][c] + a[t][c2] < a[r][c2] + a[t][c]) banned.add(t * n + c);
    }
    const { extra, rows, cols } = avoid(a, solution, r, c, (i, j) => banned.has(i * n + j));
    if (extra >= MARGIN) continue;
    // A start row passed only between leave columns keeps its observation's outcome.
    for (const i of rows) if (i < T) contestedRows.add(i);
    for (const j of cols) if (j < O) contestedCols.add(j);
  }
  return { pairs: pairs.filter(([r]) => !contestedRows.has(r)), contestedRows, contestedCols };
}

// ----------------------------------------------------------------- options and arguments

// The default clock of the tracker and the controller reads the globals at call time, never
// at import.
const systemClock = {
  now: () => globalThis.performance.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: handle => globalThis.clearTimeout(handle),
};

const isUnit = x => typeof x === 'number' && x > 0 && x <= 1;
const isPositive = x => Number.isFinite(x) && x > 0;

function checkSmoothing(s) {
  const valid = typeof s === 'number' ? isUnit(s) : s !== null && typeof s === 'object' &&
    (s.kind === 'fixed' ? isUnit(s.alpha) : s.kind === 'none');
  if (!valid) {
    throw new RangeError('smoothing must be a number in (0, 1], { kind: \'fixed\', alpha } ' +
      'or { kind: \'none\' }.');
  }
}

function readOptions(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('Tracker options must be an object.');
  }
  if (Object.prototype.hasOwnProperty.call(options, 'holdMs')) {
    throw new TypeError('holdMs was removed in 0.11: use staleMs (how long geometry is shown, ' +
      'default 1200) and reacquireMs (how long an identity survives, default 2000).');
  }
  const { smoothing = 0.35, staleMs = 1200, reacquireMs = 2000, maxMisses = 1,
    retainMs = Infinity, maxResults = 32, onChange, onError } = options;
  const clock = options.clock === undefined ? systemClock : options.clock;
  checkSmoothing(smoothing);
  if (!isPositive(staleMs)) throw new RangeError('staleMs must be finite and positive.');
  if (!(Number.isFinite(reacquireMs) && reacquireMs >= staleMs)) {
    throw new RangeError('reacquireMs must be finite and at least staleMs.');
  }
  if (!(Number.isInteger(maxMisses) && maxMisses >= 0)) {
    throw new RangeError('maxMisses must be an integer of at least 0.');
  }
  if (!(typeof retainMs === 'number' && retainMs >= reacquireMs)) {
    throw new RangeError('retainMs must be at least reacquireMs (Infinity keeps results).');
  }
  if (!(Number.isInteger(maxResults) && maxResults >= 16)) {
    throw new RangeError('maxResults must be an integer of at least 16.');
  }
  if (clock === null || typeof clock !== 'object' || typeof clock.now !== 'function' ||
      typeof clock.setTimeout !== 'function' || typeof clock.clearTimeout !== 'function') {
    throw new TypeError('clock must provide now(), setTimeout() and clearTimeout().');
  }
  for (const [name, callback] of [['onChange', onChange], ['onError', onError]]) {
    if (callback !== undefined && typeof callback !== 'function') {
      throw new TypeError(`${name} must be a function.`);
    }
  }
  return { smoothing, staleMs, reacquireMs, maxMisses, retainMs, maxResults, clock, onChange,
    onError };
}

function checkFrame(frame) {
  if (frame === null || typeof frame !== 'object') {
    throw new TypeError('update() needs a frame { width, height, observedAt }.');
  }
  if (frame.observedAt === undefined) {
    throw new TypeError('A frame needs observedAt: timestamp was renamed to observedAt, the time ' +
      'its pixels were current on the tracker clock.');
  }
  if (![frame.width, frame.height].every(isPositive) || !Number.isFinite(frame.observedAt) ||
      (frame.epoch !== undefined && !Number.isFinite(frame.epoch)) ||
      (frame.sequence !== undefined && !Number.isFinite(frame.sequence))) {
    throw new RangeError('A frame needs a finite positive width and height, a finite ' +
      'observedAt, and a finite epoch and sequence when given.');
  }
}

const noSaturation = () => ({ detections: false, occurrences: false, observations: false,
  tracks: false });

// ------------------------------------------------------------------------- tracker

/** Follows measured copies (occurrences) and decoded contents between reports. */
export function createDetectionTracker(options = {}) {
  const settings = readOptions(options);
  const { staleMs, reacquireMs, maxMisses, clock } = settings;
  // Read once at creation; a number is a fixed alpha.
  const s = settings.smoothing;
  const smoothing = typeof s === 'number' ? { kind: 'fixed', alpha: s } :
    { kind: s.kind, alpha: s.alpha };
  const limits = TRACKER_LIMITS;
  let trackSerial = 0, resultSerial = 0, tracks = [], results = [], quarantine = [];
  let epoch = 0, accepted = null, lastSequence = null, lastNow = -Infinity, resetNow = -Infinity;
  let spatialFrames = 0, lastAt = -Infinity;
  let last = { complete: null, unassigned: [], dropped: [], saturated: noSaturation() };

  const expiry = (t, at, reason) => ({ type: 'expired', trackId: t.id, at, reason });
  // Removes a live track. Contested and superseded slots wait until the old identity would expire.
  function retire(t, reason, at) {
    const index = tracks.indexOf(t);
    if (index >= 0) tracks.splice(index, 1);
    if (reason === 'ambiguous' || reason === 'superseded') {
      quarantine.push({ slot: t.slot, until: t.lastSeenAt + reacquireMs });
      if (quarantine.length > limits.quarantine) {
        let first = 0;
        quarantine.forEach((q, i) => {
          const f = quarantine[first];
          if (q.until < f.until || (q.until === f.until && q.slot < f.slot)) first = i;
        });
        quarantine.splice(first, 1);
      }
    }
    return expiry(t, at, reason);
  }
  function freeSlot(observedAt) {
    for (let slot = 0; ; slot++) {
      if (!tracks.some(t => t.slot === slot) &&
          !quarantine.some(q => q.slot === slot && q.until > observedAt)) return slot;
    }
  }
  // Every at is raised so that it never decreases across this tracker's events.
  function finish(events) {
    for (const event of events) {
      if (event.at < lastAt) event.at = lastAt;
      lastAt = event.at;
    }
    return events;
  }
  const unassignedOf = (o, reason) => ({ ...o.address, key: o.key, reason });

  // The observations of one accepted frame in canonical order, capped per content key.
  function extract(detections, frame, contentOnly) {
    const saturated = noSaturation(), dropped = [], unassigned = [], all = [];
    const keys = { present: new Set(), legacy: new Set(), truncated: new Set() };
    const scale = Math.max(frame.width, frame.height), sequence = accepted.sequence;
    if (detections.length > limits.detections) saturated.detections = true;
    detections.slice(0, limits.detections).forEach((detection, i) => {
      const key = contentKey(detection), eci = eciOf(detection);
      const read = j => ({ detection, key, eci,
        eciJson: JSON.stringify(eci === undefined ? null : eci),
        address: { sequence, detectionIndex: i, occurrenceIndex: j }, detectionIndex: i,
        occurrenceIndex: j, located: false, track: null, adopted: false, result: null,
        contest: null });
      keys.present.add(key);
      const occurrences = detection.occurrences;
      // Pipeline 4 and older: content only. corners is rqrr's grid frame and is never read.
      if (!Array.isArray(occurrences) || occurrences.length === 0) {
        keys.legacy.add(key);
        all.push(read(null));
        return;
      }
      if (occurrences.length > limits.occurrences) {
        saturated.occurrences = true;
        keys.truncated.add(key);
      }
      occurrences.slice(0, limits.occurrences).forEach((occurrence, j) => {
        const observation = read(j);
        all.push(observation);
        if (contentOnly) return;
        const geometry = occurrence !== null && typeof occurrence === 'object'
          ? occurrence.geometry : undefined;
        const valid = validateGeometry(geometry, frame.width, frame.height);
        // A copy read without a measured position stays a position-less observation.
        if (valid.reason) {
          dropped.push({ key, eciJson: observation.eciJson, reason: valid.reason,
            detectionIndex: i, occurrenceIndex: j });
          return;
        }
        Object.assign(observation, { located: true, kind: valid.kind, points: valid.points,
          downgrade: valid.downgrade, reader: geometry.reader,
          desc: describe(valid.kind, valid.points, scale, detection.symbology) });
      });
    });
    all.sort(compareObservations);
    // dropped ignores wire order too: the address only orders entries that are otherwise equal.
    dropped.sort((a, b) => compareValues(a.key, b.key) || compareValues(a.eciJson, b.eciJson) ||
      compareValues(a.reason, b.reason) || a.detectionIndex - b.detectionIndex ||
      a.occurrenceIndex - b.occurrenceIndex);
    const perKey = new Map(), entering = [];
    for (const o of all) {
      const count = (perKey.get(o.key) || 0) + 1;
      perKey.set(o.key, count);
      if (count <= limits.observationsPerKey) {
        entering.push(o);
        continue;
      }
      saturated.observations = true;
      keys.truncated.add(o.key);
      unassigned.push(unassignedOf(o, 'capacity'));
    }
    return { all, entering, unassigned, saturated, keys,
      dropped: dropped.map(({ detectionIndex, occurrenceIndex, reason }) =>
        ({ detectionIndex, occurrenceIndex, reason })) };
  }

  // Whether the frame proves absence at all.
  function completeness(input, detections, complete) {
    if (complete === false || detections.length > limits.detections) return false;
    if (Array.isArray(input)) return complete === true;
    const trace = input.trace;
    if (trace === null || typeof trace !== 'object' || trace.budget_exhausted !== false) {
      return false;
    }
    const saturation = trace.saturation;
    return saturation !== null && typeof saturation === 'object' && saturation.reads === false &&
      saturation.detections === false;
  }

  // Before the solve, in serial order, a content track adopts the only located observation of
  // its content, or is superseded by the tracks that take its content's observations. It
  // adopts only an observation that no spatial track could own, as placeReads() asks of a
  // read: a [] copy that a spatial track could also own goes to the solve, where a measured
  // track has the first claim.
  function adopt(located) {
    const content = tracks.filter(t => t.basis === 'content'), supersessions = [];
    const spatial = tracks.filter(t => t.basis === 'spatial');
    const fits = (t, o) => t.key === o.key && eciCompatible(t.eci, o.eci);
    for (const t of content) {
      const mine = located.filter(o => fits(t, o)), o = mine[0];
      if (!o) continue;
      if (mine.length === 1 && content.every(u => u === t || !fits(u, o)) &&
          !spatial.some(s => fits(s, o))) {
        Object.assign(o, { track: t, adopted: true });
        Object.assign(t, { basis: 'spatial', touched: true, eci: moreSpecific(t.eci, o.eci) });
        continue;
      }
      t.retiring = true;
      supersessions.push({ track: t, observations: mine, event: null });
    }
    return supersessions;
  }

  // The matching cascade. A track measured in the previous frame is matched first.
  function associate(located, observedAt, frameIndex) {
    const contests = [], levelOf = t => frameIndex - t.seenFrame - 1;
    const spatial = tracks.filter(t => t.basis === 'spatial' && !t.touched);
    const levels = [...new Set(spatial.map(levelOf))].sort((a, b) => a - b);
    const match = (t, o) => {
      o.track = t;
      t.touched = true;
      t.eci = moreSpecific(t.eci, o.eci);
    };
    let free = located;
    for (const level of levels) {
      const stage = spatial.filter(t => levelOf(t) === level);
      const z = stage.map(t => free.map(o => (t.key === o.key && eciCompatible(t.eci, o.eci)
        ? pairCost(t.ref, o.desc, (observedAt - t.lastSeenAt) / 1000) : Infinity)));
      for (const { rows, cols } of components(z)) {
        const ts = rows.map(i => stage[i]), os = cols.map(j => free[j]);
        if (ts.length === 1 && os.length === 1) {
          match(ts[0], os[0]);
          continue;
        }
        const solved = solveComponent(rows.map(i => cols.map(j => z[i][j])),
          ts.map(t => (t.state === 'lost' ? LEAVE_LOST : LEAVE_SEEN)), level === 0);
        for (const [r, c] of solved.pairs) match(ts[r], os[c]);
        if (!solved.contestedRows.size) continue;
        const contest = { tracks: [...solved.contestedRows].sort((a, b) => a - b).map(i => ts[i]),
          observations: [...solved.contestedCols].map(j => os[j]), successors: [], events: [] };
        contest.tracks.forEach(t => { t.retiring = true; });
        contest.observations.forEach(o => { o.contest = contest; });
        contests.push(contest);
      }
      free = free.filter(o => !o.track && !o.contest);
    }
    return contests;
  }

  // A read without a position never refreshes a spatial track. Returns the reads that
  // create content tracks.
  function placeReads(entering, observedAt, contentOnly, out) {
    const reads = entering.filter(o => !o.located), claimed = new Set(), creations = [];
    const live = tracks.filter(t => !t.retiring);
    for (let start = 0; start < reads.length;) {
      let end = start + 1;
      while (end < reads.length && reads[end].key === reads[start].key &&
        reads[end].eciJson === reads[start].eciJson) end++;
      const group = reads.slice(start, end), { key, eci } = group[0];
      start = end;
      const fits = t => t.key === key && eciCompatible(t.eci, eci);
      const unresolved = (named, read) => {
        named.forEach(t => { claimed.add(t); t.unobserved = true; });
        if (named.length) out.unresolved.push({ type: 'unresolved', key, at: observedAt,
          trackIds: named.map(t => t.id) });
        if (read) group.forEach(o => out.unassigned.push(unassignedOf(o, 'unresolved')));
      };
      // Absorbed: a spatial track of this content exists or is created in this frame.
      if (live.some(t => t.basis === 'spatial' && fits(t)) ||
          entering.some(o => o.located && o.key === key && eciCompatible(o.eci, eci))) {
        if (!contentOnly) {
          unresolved(live.filter(t => t.basis === 'spatial' && fits(t) && !t.touched &&
            !claimed.has(t)), true);
          // The read may be a compatible content track's copy, so it proves no absence;
          // left unclaimed, such a track can still be refreshed by a later exact group.
          live.forEach(t => { if (t.basis === 'content' && fits(t)) t.unobserved = true; });
        }
        continue;
      }
      const candidates = live.filter(t => t.basis === 'content' && fits(t) && !claimed.has(t));
      if (group.length < candidates.length) {
        unresolved(candidates, true);
        continue;
      }
      candidates.forEach((t, i) => {
        claimed.add(t);
        group[i].track = t;
        t.touched = true;
        t.eci = moreSpecific(t.eci, group[i].eci);
      });
      creations.push(...group.slice(candidates.length));
    }
    return creations;
  }

  function record(result, o, observedAt) {
    result.lastObservedAt = observedAt;
    // A located ECI list is never replaced by [].
    if (!(isLocated(eciOf(result.detection)) && o.eci !== undefined && o.eci.length === 0)) {
      result.detection = o.detection;
    }
    o.result = result;
    if (o.track) o.track.resultId = result.id;
  }

  // Phase 1 resolves matched reads through their track, phase 2 every other read.
  function resolveResults(all, observedAt) {
    const later = [];
    for (const o of all) {
      const t = o.track;
      const result = t && t.resultId !== null ? results.find(r => r.id === t.resultId) : undefined;
      if (!result || !eciCompatible(result.eci, t.eci)) {
        later.push(o);
        continue;
      }
      // The same track measured both reads, so its located list upgrades a [] result.
      if (result.eci !== undefined && result.eci.length === 0 && isLocated(t.eci)) {
        result.eci = t.eci;
      }
      record(result, o, observedAt);
    }
    const lists = new Map();
    for (const { key, eci } of [...results, ...all]) {
      if (!isLocated(eci)) continue;
      if (!lists.has(key)) lists.set(key, []);
      if (!lists.get(key).some(l => eciEqual(l, eci))) lists.get(key).push(eci);
    }
    for (const o of later) {
      const ofKey = results.filter(r => r.key === o.key), n = (lists.get(o.key) || []).length;
      let result;
      if (o.eci === undefined) result = ofKey[0];
      else if (isLocated(o.eci)) {
        result = ofKey.find(r => isLocated(r.eci) && eciEqual(r.eci, o.eci));
        const signalled = ofKey.filter(r => r.eci.length === 0);
        if (!result && n === 1 && signalled.length === 1) {
          result = signalled[0];
          result.eci = o.eci;
        }
      } else {
        result = ofKey.find(r => r.eci.length === 0) ||
          (n === 1 ? ofKey.find(r => isLocated(r.eci)) : undefined);
      }
      if (!result) {
        result = { id: `result-${++resultSerial}`, key: o.key, eci: o.eci, detection: o.detection,
          firstObservedAt: observedAt, lastObservedAt: observedAt };
        results.push(result);
      }
      record(result, o, observedAt);
    }
  }

  // A measurement as published geometry; points equal measured on a restart.
  const measurement = (o, frame, observedAt, restart) => ({ kind: o.kind, measured: o.points,
    points: o.points, observedAt,
    reader: o.reader === 'rxing' || o.reader === 'rqrr' ? o.reader : null,
    downgrade: o.downgrade, smoothed: false, restart: o.kind === 'partial' ? null : restart,
    width: frame.width, height: frame.height });

  /**
   * The geometry of a matched located observation: vertex order, restart tests, then the
   * blend. Points are kept in source pixels of their frame, u x max(width, height); a
   * resolution change at the same aspect ratio rescales the history first, so every
   * decision is the one made in isotropic units u.
   */
  function smooth(t, o, frame, wasLost) {
    const g = t.geometry, next = measurement(o, frame, frame.observedAt, null);
    // Partial geometry is never smoothed and never restarts.
    if (o.kind === 'partial') return next;
    const restart = reason => Object.assign(next, { restart: reason });
    // A content track that adopts a position has no geometry either.
    if (g === null) return restart('new');
    if (g.kind !== o.kind) return restart('kind');
    const f = Math.max(frame.width, frame.height) / Math.max(g.width, g.height);
    const scaled = p => (f === 1 ? p : p.map(q => ({ x: q.x * f, y: q.y * f })));
    const previous = scaled(g.measured), estimate = scaled(g.points);
    const aligned = correspond(o.points, previous, o.kind, o.detection.symbology);
    next.measured = next.points = aligned.points;
    const dt = frame.observedAt - g.observedAt;
    if (wasLost) return restart('reacquired');
    if (dt <= 0 || dt >= staleMs) return restart('gap');
    if (aligned.reoriented) return restart('reoriented');
    if (jumped(o.kind, aligned.points, previous)) return restart('jump');
    if (smoothing.kind === 'none') return next;
    const points = blend(estimate, aligned.points, smoothing.alpha);
    // The blend is validated again in source pixels.
    const check = validateGeometry({ kind: o.kind, points }, frame.width, frame.height);
    if (check.kind !== o.kind || check.downgrade !== null) return restart('invalid-blend');
    return Object.assign(next, { points, smoothed: true });
  }

  // Matched and refreshed tracks. Content tracks never emit resumed or reappeared.
  function applyMatches(entering, frame, frameIndex, contentOnly, out) {
    const { observedAt } = frame;
    for (const o of entering) {
      const t = o.track;
      if (!t) continue;
      // An adopted position is new evidence, not the continuation of a measured copy.
      if (o.adopted) out.localized.push({ type: 'localized', trackId: t.id, at: observedAt });
      else if (t.basis === 'spatial' && t.state === 'held') {
        out.continued.push({ type: 'resumed', trackId: t.id, at: observedAt });
      } else if (t.basis === 'spatial' && t.state === 'lost') {
        out.continued.push({ type: 'reappeared', trackId: t.id, at: observedAt,
          gap: observedAt - t.lastSeenAt });
      }
      if (t.basis === 'spatial') {
        t.ref = o.desc;
        t.seenFrame = frameIndex;
        // t.state is still the state before this match ('reacquired' needs it).
        t.geometry = smooth(t, o, frame, t.state === 'lost');
      }
      // A read that is already staleMs old leaves a content track lost.
      t.state = contentOnly ? 'lost' : 'tracked';
      t.misses = 0;
      t.lastSeenAt = observedAt;
      t.detection = o.detection;
      t.observation = o.address;
    }
  }

  // A track that was not matched counts a miss only when the frame proves its absence.
  function countMisses(complete, occurrencesProven, keys, at, out) {
    for (const t of tracks) {
      if (t.touched) continue;
      const proven = complete && (!keys.present.has(t.key) || (occurrencesProven &&
        !keys.legacy.has(t.key) && !keys.truncated.has(t.key) && !t.unobserved));
      if (!proven) {
        if (t.state === 'tracked') {
          t.state = 'held';
          out.loss.push({ type: 'held', trackId: t.id, at, reason: 'unobserved' });
        }
        continue;
      }
      t.misses++;
      if (t.misses > maxMisses && t.state !== 'lost') {
        t.state = 'lost';
        out.loss.push({ type: 'lost', trackId: t.id, at, reason: 'missed' });
      } else if (t.misses <= maxMisses && t.state === 'tracked') {
        t.state = 'held';
        out.loss.push({ type: 'held', trackId: t.id, at, reason: 'missed' });
      }
    }
  }

  const STATE_RANK = { lost: 0, held: 1, tracked: 2 };
  // Creation in C order, after eviction when a cap is reached; the lowest free slot.
  function createTracks(creations, frame, frameIndex, contentOnly, out) {
    const { observedAt } = frame;
    for (const o of creations) {
      const ofKey = tracks.filter(t => t.key === o.key);
      if (ofKey.length >= limits.tracksPerKey || tracks.length >= limits.tracks) {
        const pool = (ofKey.length >= limits.tracksPerKey ? ofKey : tracks).filter(t => !t.touched);
        pool.sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] ||
          a.lastSeenAt - b.lastSeenAt || a.serial - b.serial);
        if (!pool.length) {
          out.saturated.tracks = true;
          out.unassigned.push(unassignedOf(o, 'capacity'));
          continue;
        }
        const evicted = pool[0].id;
        out.expired.push(retire(pool[0], 'capacity', observedAt));
        // No later event of the frame names it: its miss and its place among the candidates
        // of an unresolved read go, and an event left with none is dropped.
        out.loss = out.loss.filter(event => event.trackId !== evicted);
        out.unresolved = out.unresolved.map(event => ({ ...event,
          trackIds: event.trackIds.filter(id => id !== evicted) }))
          .filter(event => event.trackIds.length > 0);
      }
      const serial = ++trackSerial, t = { serial, id: `track-${serial}`, slot: freeSlot(observedAt),
        state: contentOnly ? 'lost' : 'tracked', basis: o.located ? 'spatial' : 'content',
        key: o.key, eci: o.eci, resultId: o.result ? o.result.id : null, detection: o.detection,
        observation: o.address, firstSeenAt: observedAt, lastSeenAt: observedAt, misses: 0,
        ref: o.located ? o.desc : null, seenFrame: frameIndex,
        geometry: o.located ? measurement(o, frame, observedAt, 'new') : null,
        touched: true, retiring: false, unobserved: false };
      tracks.push(t);
      o.track = t;
      out.entered.push({ type: 'entered', trackId: t.id, at: observedAt,
        cause: o.contest ? 'split' : 'new' });
      if (o.contest) o.contest.successors.push(t.id);
    }
  }

  // One accepted frame, content_only included. Its events go out as expired, localized,
  // entered, continued, unresolved, then loss.
  function processFrame(input, detections, frame, completeOption, contentOnly) {
    const { observedAt } = frame;
    for (const t of tracks) {
      Object.assign(t, { touched: false, retiring: false, unobserved: false });
    }
    const frameIndex = contentOnly ? spatialFrames : ++spatialFrames;
    const extracted = extract(detections, frame, contentOnly);
    const complete = completeness(input, detections, completeOption);
    const out = { expired: [], localized: [], entered: [], continued: [], unresolved: [],
      loss: [], unassigned: extracted.unassigned, saturated: extracted.saturated };
    const located = extracted.entering.filter(o => o.located);
    const supersessions = contentOnly ? [] : adopt(located);
    const contests = contentOnly ? []
      : associate(located.filter(o => !o.track), observedAt, frameIndex);
    const reads = placeReads(extracted.entering, observedAt, contentOnly, out);
    resolveResults(extracted.all, observedAt);
    applyMatches(extracted.entering, frame, frameIndex, contentOnly, out);
    for (const contest of contests) {
      contest.events = contest.tracks.map(t => retire(t, 'ambiguous', observedAt));
      out.expired.push(...contest.events);
    }
    for (const s of supersessions) {
      s.event = retire(s.track, 'superseded', observedAt);
      out.expired.push(s.event);
    }
    if (!contentOnly) {
      const occurrencesProven = complete &&
        (Array.isArray(input) || input.trace.saturation.occurrences === false);
      countMisses(complete, occurrencesProven, extracted.keys, observedAt, out);
    }
    createTracks([...located.filter(o => !o.track), ...reads], frame, frameIndex, contentOnly, out);
    for (const contest of contests) {
      for (const event of contest.events) event.successors = contest.successors.slice();
    }
    for (const s of supersessions) {
      s.event.successors = s.observations.map(o => o.track).filter(t => t !== null)
        .sort((a, b) => a.serial - b.serial).map(t => t.id);
    }
    last = { complete, unassigned: out.unassigned, dropped: extracted.dropped,
      saturated: out.saturated };
    const bySerial = (a, b) => Number(a.trackId.slice(6)) - Number(b.trackId.slice(6));
    return [...out.expired.sort(bySerial), ...out.localized.sort(bySerial), ...out.entered,
      ...out.continued.sort(bySerial), ...out.unresolved, ...out.loss];
  }

  // Staleness at lastSeenAt + staleMs; identity expiry at E = lastSeenAt + reacquireMs,
  // applied by a frame observed at or after E (before that frame is processed), otherwise
  // by time from E + staleMs.
  // Result presence is derived from now; retention and the maxResults bound remove results.
  function advanceTo(until, byFrame = false) {
    const due = [];
    for (const t of tracks) {
      const stale = t.lastSeenAt + staleMs, end = t.lastSeenAt + reacquireMs;
      if (t.state !== 'lost' && stale <= until) due.push({ at: stale, t, lost: true });
      if ((byFrame ? end : end + staleMs) <= until) due.push({ at: end, t, lost: false });
    }
    due.sort((a, b) => a.at - b.at || a.t.serial - b.t.serial || b.lost - a.lost);
    const events = due.map(({ at, t, lost }) => {
      if (!lost) return retire(t, 'timeout', at);
      t.state = 'lost';
      return { type: 'lost', trackId: t.id, at, reason: 'stale' };
    });
    // Before a frame, retention only: the bound waits until the frame's own reads are resolved.
    pruneResults(until, !byFrame);
    return events;
  }

  // A result without a live track goes once retainMs old, then oldest first (lowest
  // serial on ties) while results exceed maxResults. results is kept in serial order.
  function pruneResults(until, bound = true) {
    const orphan = r => !tracks.some(t => t.resultId === r.id);
    results = results.filter(r => !(orphan(r) && r.lastObservedAt + settings.retainMs <= until));
    while (bound && results.length > settings.maxResults) {
      let victim = null;
      for (const r of results) {
        if (orphan(r) && (victim === null || r.lastObservedAt < victim.lastObservedAt)) victim = r;
      }
      if (victim === null) break;
      results.splice(results.indexOf(victim), 1);
    }
  }

  const isObject = value => value !== null && typeof value === 'object';
  const readable = d => isObject(d) && isObject(d.content) &&
    (!Array.isArray(d.content.eci) || d.content.eci.every(isObject));
  const aspectChanged = (a, b) =>
    Math.abs(b.width * a.height - a.width * b.height) > 0.01 * a.width * b.height;

  function update(input, frame, updateOptions) {
    const detections = Array.isArray(input) ? input : input !== null && typeof input === 'object' &&
      Array.isArray(input.detections) ? input.detections : null;
    if (!detections) {
      throw new TypeError('update() takes a ScanReport, { ...report, detections } or an array.');
    }
    // Checked before anything changes: extraction must not throw halfway through a frame.
    if (!detections.slice(0, limits.detections).every(readable)) {
      throw new TypeError('Each detection needs a content object, and ECI entries objects.');
    }
    if (typeof updateOptions === 'number') {
      throw new TypeError('The third argument of update() is an options object: pass { now }.');
    }
    if (updateOptions !== undefined &&
        (updateOptions === null || typeof updateOptions !== 'object')) {
      throw new TypeError('update() options must be an object such as { now, complete }.');
    }
    const { now: nowOption, complete } = updateOptions || {};
    if (complete !== undefined && typeof complete !== 'boolean') {
      throw new TypeError('complete must be a boolean.');
    }
    checkFrame(frame);
    const { observedAt } = frame;
    const clockNow = nowOption === undefined ? clock.now() : nowOption;
    if (!Number.isFinite(clockNow)) throw new RangeError('now must be a finite time.');
    if (observedAt > clockNow + 1000 || observedAt < clockNow - 60000) {
      throw new RangeError(`observedAt ${observedAt} is not on the tracker clock ` +
        `(now ${clockNow}): use performance.now() times, or pass the clock observedAt comes from.`);
    }
    const now = Math.max(clockNow, observedAt, lastNow);
    const frameEpoch = frame.epoch === undefined ? epoch : frame.epoch;
    const sequence = frame.sequence === undefined ? null : frame.sequence;
    const staleSequence = frameEpoch === epoch && sequence !== null && lastSequence !== null &&
      sequence <= lastSequence;
    // Without a sequence, observedAt itself must strictly increase.
    const staleTime = observedAt <= resetNow || (accepted !== null && (observedAt <
      accepted.observedAt || (observedAt === accepted.observedAt && sequence === null)));
    const rejection = frameEpoch < epoch ? 'stale_epoch' : staleSequence ? 'stale_sequence'
      : staleTime ? 'stale_time' : null;
    if (rejection) {
      const events = advanceTo(now);
      lastNow = now;
      return view('rejected', rejection, now, finish(events));
    }
    const events = advanceTo(observedAt, true);
    const sessionEnded = frameEpoch > epoch;
    if (sessionEnded || (accepted !== null && aspectChanged(accepted, frame))) {
      const reason = sessionEnded ? 'epoch' : 'frame_changed';
      for (const t of tracks.slice()) events.push(retire(t, reason, observedAt));
    }
    if (sessionEnded) lastSequence = null;
    epoch = frameEpoch;
    if (sequence !== null) lastSequence = sequence;
    accepted = { width: frame.width, height: frame.height, observedAt, epoch, sequence };
    quarantine = quarantine.filter(q => q.until > observedAt);
    // Every time test uses the sum its deadline uses: fractional times then agree exactly.
    const contentOnly = observedAt + staleMs <= now;
    events.push(...processFrame(input, detections, accepted, complete, contentOnly));
    events.push(...advanceTo(now));
    lastNow = now;
    return view(contentOnly ? 'content_only' : 'updated', null, now, finish(events));
  }

  // Geometry is published for spatial tracks only, while not lost and younger than staleMs.
  const publishes = (t, now) => t.basis === 'spatial' && t.state !== 'lost' &&
    t.geometry !== null && now < t.geometry.observedAt + staleMs;

  function geometryView(t, now) {
    if (!publishes(t, now)) return null;
    const g = t.geometry, normalized = p => ({ x: p.x / g.width, y: p.y / g.height });
    const inFrame = p => p.x >= -1 && p.x <= g.width + 1 && p.y >= -1 && p.y <= g.height + 1;
    let lag2 = 0;
    g.points.forEach((p, i) => {
      const dx = p.x - g.measured[i].x, dy = p.y - g.measured[i].y;
      lag2 = Math.max(lag2, dx * dx + dy * dy);
    });
    // Compared squared, so that no square root decides.
    const precise = t.state === 'tracked' && g.kind === 'quad' && g.observedAt === t.lastSeenAt &&
      g.points.every(inFrame) && g.measured.every(inFrame) &&
      lag2 <= Math.max(4, 0.0025 * Math.abs(doubleArea(g.measured)) / 2);
    return { kind: g.kind, points: g.points.map(normalized), measured: g.measured.map(normalized),
      observedAt: g.observedAt, age: now - g.observedAt, lag: Math.sqrt(lag2), reader: g.reader,
      downgrade: g.downgrade, smoothed: g.smoothed, restart: g.restart, precise };
  }

  // The earliest finite deadline, or null.
  function deadline(now) {
    let next = Infinity;
    for (const t of tracks) {
      if (t.state !== 'lost') next = Math.min(next, t.lastSeenAt + staleMs);
      if (publishes(t, now)) next = Math.min(next, t.geometry.observedAt + staleMs);
      next = Math.min(next, t.lastSeenAt + reacquireMs + staleMs);
    }
    for (const r of results) {
      if (now < r.lastObservedAt + staleMs) next = Math.min(next, r.lastObservedAt + staleMs);
      if (!tracks.some(t => t.resultId === r.id)) {
        next = Math.min(next, r.lastObservedAt + settings.retainMs);
      }
    }
    return next === Infinity ? null : next;
  }

  // Every snapshot is a new object; detections are the engine's objects, by reference.
  function view(status, rejection, now, events) {
    const live = tracks.slice().sort((a, b) => a.slot - b.slot);
    return {
      status, rejection, now, epoch,
      frame: accepted && { ...accepted },
      frameAge: accepted ? now - accepted.observedAt : null,
      complete: last.complete,
      tracks: live.map(t => ({ id: t.id, slot: t.slot, state: t.state, basis: t.basis, key: t.key,
        resultId: t.resultId, detection: t.detection, observation: { ...t.observation },
        firstSeenAt: t.firstSeenAt, lastSeenAt: t.lastSeenAt, misses: t.misses,
        geometry: geometryView(t, now) })),
      results: results.map(r => ({ id: r.id, key: r.key, detection: r.detection,
        firstObservedAt: r.firstObservedAt, lastObservedAt: r.lastObservedAt,
        present: now < r.lastObservedAt + staleMs,
        trackIds: live.filter(t => t.resultId === r.id).map(t => t.id) })),
      unassigned: last.unassigned.map(u => ({ ...u })),
      dropped: last.dropped.map(d => ({ ...d })),
      saturated: { ...last.saturated },
      events,
      nextDeadline: deadline(now),
    };
  }

  // ------------------------------------------------------------- deadlines and teardown
  const MAX_DELAY = 2147483647;
  let destroyed = false, timer = null, { onChange, onError } = settings;
  const destroyedView = () => ({ ...view('destroyed', null, lastNow, []), nextDeadline: null });
  function timeOf(now) {
    const at = now === undefined ? clock.now() : now;
    if (!Number.isFinite(at)) throw new RangeError('now must be a finite time.');
    return Math.max(at, lastNow);
  }

  // Runs read on copies of the mutable state and restores it, so that nothing is stored.
  function project(read) {
    const saved = [tracks, results, quarantine];
    tracks = tracks.map(t => ({ ...t }));
    results = results.map(r => ({ ...r }));
    quarantine = quarantine.slice();
    try {
      return read();
    } finally {
      [tracks, results, quarantine] = saved;
    }
  }

  // The single timer: armed only with onChange, for the next finite deadline, capped.
  function arm() {
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
    const next = onChange === undefined ? null : deadline(lastNow);
    if (next !== null) {
      timer = clock.setTimeout(wake, Math.max(0, Math.min(next - clock.now(), MAX_DELAY)));
    }
  }
  function wake() {
    timer = null;
    const next = destroyed ? null : deadline(lastNow);
    if (next === null) return;
    const at = clock.now();
    if (at < next) arm();
    else advance(at);
  }
  // An onChange failure never reaches the caller: the state is already committed.
  function notify(snap) {
    if (onChange === undefined) return;
    try {
      onChange(snap);
    } catch (error) {
      const report = onError;
      try {
        if (report === undefined) throw error;
        report(error);
      } catch (failure) {
        queueMicrotask(() => { throw failure; });
      }
    }
  }
  function publish(snap, changed) {
    arm();
    if (changed) notify(snap);
    return snap;
  }

  // Each deadline passed is a visible transition: lost, withdrawn, expired, absent or removed.
  function advance(now) {
    if (destroyed) return destroyedView();
    const at = timeOf(now), due = deadline(lastNow), events = finish(advanceTo(at));
    lastNow = at;
    return publish(view('time', null, at, events), due !== null && due <= at);
  }

  // Expires every track at now; a larger epoch becomes current. Results are kept.
  function expireAll(options) {
    if (options !== undefined && (options === null || typeof options !== 'object')) {
      throw new TypeError('reset() takes { epoch }.');
    }
    const next = options === undefined || options.epoch === undefined ? epoch : options.epoch;
    if (!Number.isFinite(next) || next < epoch) {
      throw new RangeError(`reset() needs a finite epoch of at least the current one (${epoch}).`);
    }
    const at = timeOf(undefined), reason = next > epoch ? 'epoch' : 'reset';
    const events = tracks.slice().map(t => retire(t, reason, at));
    // Every result has lost its tracks: the bound applies now, as no deadline would apply it.
    pruneResults(at);
    if (next > epoch) lastSequence = null;
    epoch = next;
    resetNow = lastNow = at;
    return finish(events);
  }

  return {
    update: (input, frame, updateOptions) => (destroyed ? destroyedView()
      : publish(update(input, frame, updateOptions), true)),
    /** Pure read of the state projected at now: status 'peek', no events, nothing stored. */
    snapshot(now) {
      if (destroyed) return destroyedView();
      const at = timeOf(now);
      return project(() => {
        advanceTo(at);
        return view('peek', null, at, []);
      });
    },
    advance,
    nextDeadline: () => (destroyed ? null : deadline(lastNow)),
    reset(options) {
      if (destroyed) return destroyedView();
      const events = expireAll(options);
      return publish(view('reset', null, lastNow, events), true);
    },
    forget(id) {
      const index = destroyed ? -1 : results.findIndex(r => r.id === id);
      if (index < 0) return false;
      results.splice(index, 1);
      for (const t of tracks) if (t.resultId === id) t.resultId = null;
      publish(view('forget', null, lastNow, []), true);
      return true;
    },
    clear() {
      if (destroyed) return destroyedView();
      const events = expireAll(undefined);
      results = [];
      return publish(view('reset', null, lastNow, events), true);
    },
    destroy() {
      if (timer !== null) clock.clearTimeout(timer);
      destroyed = true;
      timer = null;
      onChange = onError = undefined;
    },
  };
}

// Centered object-fit only; the overlay module handles object-position, none and scale-down.
function viewMapping({ sourceWidth, sourceHeight, viewWidth, viewHeight, fit = 'contain',
  mirror = false }) {
  if (![sourceWidth, sourceHeight, viewWidth, viewHeight].every(n => Number.isFinite(n) && n > 0) ||
      !['contain', 'cover', 'fill'].includes(fit)) throw new RangeError('Invalid video geometry.');
  if (fit === 'fill') {
    return point => ({ x: (mirror ? 1 - point.x : point.x) * viewWidth, y: point.y * viewHeight });
  }
  const scale = Math[fit === 'cover' ? 'max' : 'min'](viewWidth / sourceWidth,
    viewHeight / sourceHeight);
  return point => ({
    x: (viewWidth - sourceWidth * scale) / 2 +
      (mirror ? 1 - point.x : point.x) * sourceWidth * scale,
    y: (viewHeight - sourceHeight * scale) / 2 + point.y * sourceHeight * scale,
  });
}

/** Map a normalized engine point to a video element's CSS pixel rectangle. */
export function projectVideoPoint(point, view) {
  const map = viewMapping(view);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError('Invalid video geometry.');
  }
  return map(point);
}

/** Projects every point; valid is judged after projection, and inView means nothing is cropped. */
export function projectVideoGeometry(geometry, view, { minArea = 16 } = {}) {
  const map = viewMapping(view);
  if (!(typeof minArea === 'number' && minArea >= 0)) {
    throw new RangeError('minArea must be a number of at least 0 (CSS px squared).');
  }
  if (geometry === null || typeof geometry !== 'object' || !Array.isArray(geometry.points)) {
    throw new TypeError('projectVideoGeometry() needs a geometry { kind, points, precise }.');
  }
  const { kind } = geometry, nowhere = { x: NaN, y: NaN };
  const points = geometry.points.map(p => map(p !== null && typeof p === 'object' ? p : nowhere));
  const finite = points.length > 0 && points.every(finitePoint);
  let valid = finite && kind === 'partial';
  if (finite && kind === 'quad' && points.length === 4) {
    // A mirrored view flips the winding: one shared sign is enough.
    const turns = points.map((p, i) => turn(p, points[(i + 1) % 4], points[(i + 2) % 4]));
    valid = (turns.every(t => t > 0) || turns.every(t => t < 0)) &&
      Math.abs(doubleArea(points)) / 2 >= minArea;
  } else if (finite && kind === 'segment' && points.length === 2) {
    const dx = points[1].x - points[0].x, dy = points[1].y - points[0].y;
    valid = dx * dx + dy * dy >= 1;
  }
  const inView = points.every(p => p.x >= -1 && p.x <= view.viewWidth + 1 && p.y >= -1 &&
    p.y <= view.viewHeight + 1);
  return { kind, points, valid, inView, precise: geometry.precise === true && valid && inView };
}

// -------------------------------------------------------------------- capture controller

// One counter issues the epochs of every controller in this module instance, so a tracker
// reused with a new controller never sees an epoch decrease.
let lastEpoch = 0;

const ERROR_MESSAGES = {
  unsupported: 'Camera capture requires a secure context and mediaDevices.getUserMedia.',
  permission_denied: 'Camera permission was denied.',
  device_not_found: 'No camera matches the request.',
  device_busy: 'The camera is in use or could not be opened.',
  constraints_unsatisfied: 'No camera satisfies the requested constraints.',
  start_failed: 'The camera could not be started.',
  play_failed: 'The camera video could not play.',
  canvas_unavailable: 'Camera capture needs a 2D canvas.',
  stream_ended: 'Camera stream ended.',
  decode_failed: 'Decoding a camera frame failed.',
  decode_timeout: 'Decoding a camera frame timed out.',
  recover_failed: 'The decoder could not be recovered.',
  callback_failed: 'A camera result callback threw.',
};

export class CameraScannerError extends Error {
  constructor(code, message, options) {
    if (!Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, code))
      throw new TypeError(`Unknown CameraScannerError code: ${String(code)}.`);
    super(message === undefined ? ERROR_MESSAGES[code] : message);
    this.code = code;
    // Defined by hand: the Error cause option is newer than the ES2020 floor.
    Object.defineProperty(this, 'cause', { value: options == null ? undefined : options.cause,
      writable: true, configurable: true });
  }
}
Object.defineProperty(CameraScannerError.prototype, 'name',
  { value: 'CameraScannerError', writable: true, configurable: true });

const MEDIA_ERROR_CODES = new Map([
  ['NotAllowedError', 'permission_denied'], ['SecurityError', 'permission_denied'],
  ['NotFoundError', 'device_not_found'],
  ['NotReadableError', 'device_busy'], ['AbortError', 'device_busy'],
  ['OverconstrainedError', 'constraints_unsatisfied'], ['TypeError', 'constraints_unsatisfied'],
]);
const mediaError = error => new CameraScannerError(
  MEDIA_ERROR_CODES.get(error == null ? undefined : error.name) || 'start_failed', undefined,
  { cause: error });

const finiteOrNull = value => (Number.isFinite(value) ? value : null);

// 32-bit FNV-1a over the 4 bytes of 1,024 pixels: the centres of a fixed 32 x 32 grid.
function progressHash(data, width, height) {
  let hash = 0x811c9dc5;
  for (let row = 0; row < 32; row++) {
    const y = Math.floor((2 * row + 1) * height / 64);
    for (let column = 0; column < 32; column++) {
      const offset = (y * width + Math.floor((2 * column + 1) * width / 64)) * 4;
      for (let k = 0; k < 4; k++) hash = Math.imul(hash ^ data[offset + k], 0x01000193) >>> 0;
    }
  }
  return hash;
}

/**
 * Permission-aware capture loop. At most one scanFrame call is outstanding, across sessions;
 * context.signal is aborted only by the decode timeout, and recover replaces a hung or
 * failed decoder. No URLs open automatically.
 */
export function createCameraScanner({ video, scanFrame, tracker, onResult, onError, onState,
  recover, maxDimension = 1280, intervalMs = 100, decodeTimeoutMs = 5000,
  recoverTimeoutMs = 20000, maxRecoveries = 2, stallMs = 2000,
  constraints = { facingMode: { ideal: 'environment' } }, clock = systemClock,
  mediaDevices = globalThis.navigator?.mediaDevices } = {}) {
  if (!video || typeof scanFrame !== 'function' || (typeof onResult !== 'function' && !tracker))
    throw new TypeError('createCameraScanner needs a video, scanFrame, and onResult or tracker.');
  if ((tracker && (typeof tracker.update !== 'function' || typeof tracker.reset !== 'function')) ||
      [onResult, onError, onState, recover].some(f => f !== undefined && typeof f !== 'function') ||
      !clock || ['now', 'setTimeout', 'clearTimeout'].some(key => typeof clock[key] !== 'function'))
    throw new TypeError('tracker, callbacks and clock must provide the declared functions.');
  const atLeast = (value, min) => Number.isFinite(value) && value >= min;
  if (!atLeast(maxDimension, 1) || !atLeast(intervalMs, 0) || !Number.isInteger(maxRecoveries) ||
      maxRecoveries < 0 ||
      ![decodeTimeoutMs, recoverTimeoutMs, stallMs].every(ms => Number.isFinite(ms) && ms > 0))
    throw new RangeError('Camera capture limits are out of range.');
  const document = video.ownerDocument;
  const canRecover = typeof recover === 'function' && maxRecoveries > 0;
  let state = 'idle', epoch = ++lastEpoch, generation = 0, source = null, muted = false;
  let stalled = false, pending = null, stream = null, canvas = null, context = null;
  let sequence = 0, recoveries = 0, recovery = null, slot = null, hung = null, failure = null;
  let intervalTimer = null, stallTimer = null, frameRequest = null;
  let lastPresented = null, lastMediaTime = null, lastHash = null;

  // Reports a throw from onState or from the tracker's reset, which no step of the controller
  // waits for. Without onError, or when onError throws too, it is rethrown from a microtask.
  // It runs inside the change, so onError can stop or restart the session there as onState
  // can: a step that would capture, recover or open a camera after announcing a change first
  // checks that its session survived it.
  const report = error => {
    try {
      if (!onError) throw error;
      onError(error);
    } catch (failure) {
      queueMicrotask(() => { throw failure; });
    }
  };
  // onState observes a transition already made: a throw from it changes no step.
  const emit = (previous, reason, error = null) => {
    if (!onState) return;
    try {
      onState({ state, previous, reason, error, epoch, decoderGeneration: generation, muted,
        stalled, source });
    } catch (cause) {
      report(new CameraScannerError('callback_failed',
        'The onState callback threw on a camera state change.', { cause }));
    }
  };
  const setState = (next, reason, error) => {
    const previous = state;
    state = next;
    emit(previous, reason, error);
  };
  const active = () => state === 'running' && !muted;
  const ready = () => video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
  const clearWait = () => {
    if (intervalTimer !== null) clock.clearTimeout(intervalTimer);
    if (stallTimer !== null) clock.clearTimeout(stallTimer);
    if (frameRequest !== null && typeof video.cancelVideoFrameCallback === 'function')
      video.cancelVideoFrameCallback(frameRequest.handle);
    intervalTimer = stallTimer = frameRequest = null;
  };
  // The stall timer runs from a frame request until a new frame: repeats do not reset it.
  // False when a callback of the 'frames-resumed' change (onState, or onError receiving its
  // throw) stopped, switched or paused the session: the new frame is then not captured.
  const progressed = () => {
    if (stallTimer !== null) clock.clearTimeout(stallTimer);
    stallTimer = null;
    if (!stalled) return true;
    const token = epoch;
    stalled = false;
    emit(state, 'frames-resumed');
    return epoch === token && active();
  };
  const onStall = () => {
    stallTimer = null;
    if (!active() || stalled) return;
    stalled = true;
    emit(state, 'stalled');
  };
  const busy = () => new CameraScannerError('decode_timeout',
    'The decoder still holds a timed-out frame.', { cause: slot.error });
  const schedule = () => {
    if (!active() || intervalTimer !== null || frameRequest !== null) return;
    if (hung) { decodeFailed(hung); return; }
    if (slot) { if (slot.abandoned && !canRecover) fail(busy()); return; }
    intervalTimer = clock.setTimeout(() => {
      intervalTimer = null;
      requestFrame();
    }, intervalMs);
  };
  const requestFrame = () => {
    if (!active()) return;
    if (stallTimer === null && !stalled) stallTimer = clock.setTimeout(onStall, stallMs);
    if (source === 'timer') {
      if (ready()) capture(null, { captureTime: null, mediaTime: null, presentedFrames: null });
      else schedule();
      return;
    }
    const request = {};
    frameRequest = request;
    request.handle = video.requestVideoFrameCallback((now, metadata) =>
      onFrame(request, now, metadata));
  };
  const onFrame = (request, now, metadata) => {
    if (frameRequest !== request) return;
    frameRequest = null;
    const presentedFrames = finiteOrNull(metadata?.presentedFrames);
    const mediaTime = finiteOrNull(metadata?.mediaTime);
    const repeated = presentedFrames !== null
      ? lastPresented !== null && presentedFrames <= lastPresented
      : mediaTime !== null && mediaTime === lastMediaTime;
    if (!ready() || repeated) { requestFrame(); return; }
    lastPresented = presentedFrames;
    lastMediaTime = mediaTime;
    const captured = finiteOrNull(metadata?.captureTime);
    if (!progressed()) return;
    capture(now, { captureTime: captured !== null && captured <= now ? captured : null,
      mediaTime, presentedFrames });
  };
  // observedAt is null on the timer path: clock.now() is then read just before drawImage.
  const capture = (observedAt, timing) => {
    let at, image;
    try {
      const ratio = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
      canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
      at = observedAt === null ? clock.now() : observedAt;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      image = context.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      fail(new CameraScannerError('canvas_unavailable', 'Reading camera pixels failed.',
        { cause: error }));
      return;
    }
    if (observedAt === null) {
      const hash = progressHash(image.data, image.width, image.height);
      if (hash === lastHash) { schedule(); return; }
      lastHash = hash;
      if (!progressed()) return;
    }
    sequence += 1;
    const request = { epoch, generation, sequence, abandoned: false, error: null, timer: null,
      controller: new AbortController() };
    const frame = { width: image.width, height: image.height, observedAt: at, epoch, sequence,
      source, captureTime: timing.captureTime, mediaTime: timing.mediaTime,
      presentedFrames: timing.presentedFrames, videoWidth: video.videoWidth,
      videoHeight: video.videoHeight, decodeStartedAt: clock.now(), decoderGeneration: generation };
    slot = request;
    request.timer = clock.setTimeout(() => timedOut(request), decodeTimeoutMs);
    new Promise(resolve => resolve(scanFrame(image.data, image.width, image.height,
      { signal: request.controller.signal, frame })))
      .then(value => settled(request, frame, true, value),
        error => settled(request, frame, false, error));
  };

  const settled = (request, frame, ok, value) => {
    clock.clearTimeout(request.timer);
    if (slot === request) slot = null;
    if (!request.abandoned && request.epoch === epoch && request.generation === generation &&
        state === 'running') {
      if (!ok) {
        decodeFailed(new CameraScannerError('decode_failed', undefined, { cause: value }));
        return;
      }
      const delivered = { ...frame, completedAt: clock.now() };
      const token = epoch;
      try {
        const snapshot = tracker
          ? tracker.update(value, delivered, { now: delivered.completedAt }) : null;
        if (onResult) onResult(value, delivered, snapshot);
      } catch (error) {
        if (epoch === token) {
          fail(new CameraScannerError('callback_failed', undefined, { cause: error }));
        }
        return;
      }
    }
    schedule();
  };
  const timedOut = request => {
    request.abandoned = true;
    request.error = new CameraScannerError('decode_timeout');
    request.controller.abort(request.error);
    if (canRecover) hung = request.error;
    if (state === 'running') decodeFailed(request.error);
  };
  const decodeFailed = error => {
    if (canRecover && recoveries < maxRecoveries) recoverDecoder(error);
    else fail(error);
  };
  const recoverDecoder = cause => {
    recoveries += 1;
    clearWait();
    const attempt = { controller: new AbortController(), timer: null };
    recovery = attempt;
    setState('recovering', 'recover', cause);
    // A stop or a switch from a callback of that change has already aborted this attempt.
    if (recovery !== attempt) return;
    const failed = (message, reason) => {
      if (recovery !== attempt) return;
      recovery = null;
      clock.clearTimeout(attempt.timer);
      const error = new CameraScannerError('recover_failed', message, { cause: reason });
      attempt.controller.abort(error);
      fail(error);
    };
    attempt.timer = clock.setTimeout(() => failed('Decoder recovery timed out.', undefined),
      recoverTimeoutMs);
    new Promise(resolve => resolve(recover(cause,
      { signal: attempt.controller.signal, decoderGeneration: generation })))
      .then(() => {
        if (recovery !== attempt) return;
        recovery = null;
        clock.clearTimeout(attempt.timer);
        generation += 1;
        hung = null;
        if (slot && slot.abandoned) slot = null;
        setState('running', 'recovered');
        schedule();
      }, error => failed(undefined, error));
  };

  const live = () => state === 'starting' || state === 'running' || state === 'recovering';
  // Never frees the decode slot and never aborts a decode signal.
  const release = () => {
    clearWait();
    if (recovery) {
      clock.clearTimeout(recovery.timer);
      recovery.controller.abort();
      recovery = null;
    }
    if (document) {
      document.removeEventListener('visibilitychange', onVisibility);
      document.defaultView?.removeEventListener('pagehide', onPageHide);
    }
    if (!stream) return;
    const owned = stream;
    stream = null;
    owned.getTracks().forEach(track => {
      track.removeEventListener?.('ended', onEnded);
      track.removeEventListener?.('mute', onMute);
      track.removeEventListener?.('unmute', onUnmute);
      track.stop();
    });
    if (video.srcObject === owned) { video.pause(); video.srcObject = null; }
  };
  // Ends the epoch; keep is the start that a switch begins. A callback of the reset (the
  // tracker's onChange) may end this epoch itself, and its transition is then the last one. A
  // throw from the reset stops no step of the end: it is reported as callback_failed.
  const end = (next, reason, error = null, keep = null) => {
    const token = epoch = ++lastEpoch;
    sequence = 0;
    pending = keep;
    let broken = null;
    if (tracker) {
      try {
        tracker.reset({ epoch: token });
      } catch (cause) {
        broken = new CameraScannerError('callback_failed',
          'Resetting the tracker at the end of a camera session failed.', { cause });
      }
    }
    if (epoch === token) {
      release();
      stalled = muted = false;
      setState(next, reason, error);
    }
    if (broken !== null) report(broken);
    return token;
  };
  const fail = error => {
    if (live()) {
      failure = { epoch, error };
      end('failed', 'error', error);
    } else if (state !== 'failed') setState('failed', 'error', error);
    if (onError) onError(error);
    return error;
  };
  function onEnded() { if (stream) fail(new CameraScannerError('stream_ended')); }
  function onMute() {
    if (!stream || muted) return;
    // stalled reports unexplained silence; a mute explains it and pauses detection.
    muted = true;
    stalled = false;
    clearWait();
    emit(state, 'muted');
  }
  function onUnmute() {
    if (!stream || !muted) return;
    muted = false;
    emit(state, 'unmuted');
    schedule();
  }
  function onVisibility() { if (document.hidden && live()) end('stopped', 'hidden'); }
  function onPageHide() { if (live()) end('stopped', 'pagehide'); }

  const open = (requested, reason, token) => {
    const promise = (async () => {
      if (typeof mediaDevices?.getUserMedia !== 'function')
        throw new CameraScannerError('unsupported');
      // Installed before the permission prompt: leaving during it invalidates the answer.
      if (document) {
        document.addEventListener('visibilitychange', onVisibility);
        document.defaultView?.addEventListener('pagehide', onPageHide);
      }
      let acquired;
      try {
        acquired = await mediaDevices.getUserMedia({ audio: false, video: requested });
      } catch (error) {
        throw mediaError(error);
      }
      if (token === epoch && document?.hidden) end('stopped', 'hidden');
      if (token !== epoch) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      acquired.getTracks().forEach(track => {
        track.addEventListener?.('ended', onEnded);
        track.addEventListener?.('mute', onMute);
        track.addEventListener?.('unmute', onUnmute);
      });
      if (acquired.getTracks().some(track => track.muted === true)) onMute();
      // A callback of that 'muted' change may have ended this session, releasing these tracks.
      if (token !== epoch) return;
      video.srcObject = acquired;
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
      } catch (error) {
        if (token === epoch) {
          throw new CameraScannerError('play_failed', undefined, { cause: error });
        }
      }
      if (token !== epoch) return;
      canvas = document?.createElement('canvas') ?? null;
      context = canvas?.getContext('2d', { willReadFrequently: true }) ?? null;
      if (!context) throw new CameraScannerError('canvas_unavailable');
      lastPresented = lastMediaTime = lastHash = null;
      setState('running', reason);
      schedule();
    })().catch(error => {
      if (token === epoch) fail(error instanceof CameraScannerError ? error
        : new CameraScannerError('start_failed', undefined, { cause: error }));
    }).then(() => {
      // Whatever failed this session before its start settled is that start's rejection.
      if (failure !== null && failure.epoch === token) throw failure.error;
    });
    return promise;
  };
  // A start or a switch. Its promise is pending before any callback runs, so a start() from
  // onState or onChange shares it. If a callback stops or restarts the session meanwhile, this
  // one requests no camera and settles as the session that replaced it does.
  const begin = (requested, reason, enter) => {
    let settle, token;
    const promise = new Promise(resolve => { settle = resolve; });
    pending = promise;
    const done = () => { if (pending === promise) pending = null; };
    try {
      token = enter(promise);
    } catch (error) {
      done();
      settle();
      throw error;
    }
    if (token === epoch && pending === promise && state === 'starting') {
      settle(open(requested, reason, token));
    } else settle(pending !== promise && pending !== null ? pending : undefined);
    promise.then(done, done);
    return promise;
  };

  return {
    get state() { return state; },
    get epoch() { return epoch; },
    get decoderGeneration() { return generation; },
    get source() { return source; },
    get stalled() { return stalled; },
    start() {
      if (pending) return pending;
      if (state === 'running' || state === 'recovering' || document?.hidden) {
        return Promise.resolve();
      }
      // Without a way to replace it, a hung decoder blocks the next session up front.
      if (slot && slot.abandoned && !canRecover) return Promise.reject(fail(busy()));
      recoveries = 0;
      // Another controller took an epoch since this one's: a shared tracker has seen it.
      if (epoch < lastEpoch) epoch = ++lastEpoch;
      source = typeof video.requestVideoFrameCallback === 'function'
        ? 'video-frame-callback' : 'timer';
      return begin(constraints, 'start', () => {
        const token = epoch;
        setState('starting', 'start');
        return token;
      });
    },
    stop() { if (live()) end('stopped', 'stop'); },
    setConstraints(next) {
      constraints = next;
      if (!live()) return Promise.resolve();
      // maxRecoveries counts per session, and the switch opens a new one.
      recoveries = 0;
      return begin(next, 'constraints', promise => end('starting', 'constraints', null, promise));
    },
  };
}
