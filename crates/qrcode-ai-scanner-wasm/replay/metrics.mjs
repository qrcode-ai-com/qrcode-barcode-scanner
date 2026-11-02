// Pure replay metrics. A trace is { header, steps: [{ line, snapshot }] }: line is
// a JSONL frame or time line, snapshot the tracker's answer (or a post-filtered copy of it).
// Published and truth points are compared in normalized units, then scaled to source px.

export const QR_FAMILY = ['qr_code', 'micro_qr_code', 'rectangular_micro_qr_code'];
// True centroids closer than this (px, or px/s) are unmoved: rotation leaves float noise.
const STILL_PX = 1e-6;

// ---------------------------------------------------------------------- geometry

export function shoelace(points) {
  let sum = 0;
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  });
  return sum / 2;
}
const turn = (a, b, c) => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
const finite = p => Number.isFinite(p.x) && Number.isFinite(p.y);

/** null for a valid clockwise quad in y-down px, else 'invalid' or 'counter-clockwise'. */
export function quadProblem(points) {
  if (points.length !== 4 || !points.every(finite) || Math.abs(shoelace(points)) < 4) {
    return 'invalid';
  }
  const turns = points.map((p, i) => turn(p, points[(i + 1) % 4], points[(i + 2) % 4]));
  if (turns.every(t => t > 0)) return null;
  return turns.every(t => t < 0) ? 'counter-clockwise' : 'invalid';
}

/**
 * The blend is validated again, as camera.js does: finite points within the
 * frame tolerance max(2, 2% of the long side); a quad keeps area >= 4 px² and positive turns, a
 * segment a squared length >= 1 px².
 */
export function validBlend(kind, points, width, height) {
  const tolerance = Math.max(2, 0.02 * Math.max(width, height));
  const inside = p => finite(p) && p.x >= -tolerance && p.x <= width + tolerance &&
    p.y >= -tolerance && p.y <= height + tolerance;
  if (!points.every(inside)) return false;
  if (kind === 'quad') return quadProblem(points) === null;
  if (kind === 'segment') {
    const dx = points[1].x - points[0].x, dy = points[1].y - points[0].y;
    return dx * dx + dy * dy >= 1;
  }
  return true;
}

export function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** True size: sqrt(area) of a quad, length of a segment, sqrt((w² + h²) / 2) of a partial. */
export function trueSize(kind, points) {
  if (kind === 'quad') return Math.sqrt(Math.abs(shoelace(points)));
  if (kind === 'segment') return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) /
    Math.SQRT2;
}

const symbologyOf = key => JSON.parse(key)[0];
const rawOf = key => JSON.parse(key)[1];

/**
 * Per-vertex errors in px between published (normalized) and true (px) points, in the order
 * that matches: identity for the QR family, the best cyclic shift for other quads, identity or
 * swapped for segments, identity for partials of equal length. null when not comparable.
 */
export function vertexErrors(kind, published, truth, width, height, symbology) {
  if (published.length !== truth.length) return null;
  const errors = order => order.map((k, i) => ({ dx: (published[i].x - truth[k].x / width) * width,
    dy: (published[i].y - truth[k].y / height) * height }));
  const sse = list => list.reduce((sum, e) => sum + e.dx * e.dx + e.dy * e.dy, 0);
  const identity = truth.map((_, i) => i);
  let candidates = [identity];
  if (kind === 'segment') candidates = [identity, [1, 0]];
  else if (kind === 'quad' && !QR_FAMILY.includes(symbology)) {
    candidates = [0, 1, 2, 3].map(k => identity.map(i => (i + k) % 4));
  }
  let best = null;
  for (const order of candidates) {
    const list = errors(order);
    if (best === null || sse(list) < sse(best)) best = list;
  }
  return best;
}

// ------------------------------------------------------------------ associations

const isFrame = step => step.line.kind === 'frame';
const updated = step => isFrame(step) && step.snapshot.status === 'updated';
const addressKey = (d, j) => `${d}:${j}`;

/**
 * Per step: truth copy -> the spatial track that took its located occurrence in that frame, and
 * track -> the copies of that occurrence (more than one only when copies were merged).
 */
export function associations(trace) {
  return trace.steps.map(step => {
    const byCopy = new Map(), byTrack = new Map();
    if (!updated(step) || !step.line.truth) return { byCopy, byTrack };
    const copiesAt = new Map();
    for (const t of step.line.truth) {
      if (!t.reported || t.reported[1] === null || t.kind === 'unavailable') continue;
      const key = addressKey(...t.reported);
      copiesAt.set(key, [...(copiesAt.get(key) || []), t.copy]);
    }
    for (const track of step.snapshot.tracks) {
      const o = track.observation;
      if (track.basis !== 'spatial' || o.sequence !== step.line.sequence) continue;
      const copies = copiesAt.get(addressKey(o.detectionIndex, o.occurrenceIndex));
      if (!copies) continue;
      for (const copy of copies) byCopy.set(copy, track.id);
      byTrack.set(track.id, copies);
    }
    return { byCopy, byTrack };
  });
}

/**
 * id_switches: a copy whose track changes without an expired-entered pair since the copy's
 * previous association: the new id entered (or localized) and the old id expired (or is no
 * longer live). false_continuity: copies beyond the first followed by one id.
 */
export function identityErrors(trace, assoc = associations(trace)) {
  const started = new Map(), ended = new Map();
  trace.steps.forEach((step, i) => {
    for (const e of step.snapshot.events) {
      if (e.type === 'entered' || e.type === 'localized') started.set(e.trackId, i);
      else if (e.type === 'expired') ended.set(e.trackId, i);
    }
  });
  const within = (map, id, from, to) => map.has(id) && map.get(id) > from && map.get(id) <= to;
  const last = new Map(), copiesOf = new Map(), switches = [];
  assoc.forEach(({ byCopy, byTrack }, i) => {
    const live = new Set(trace.steps[i].snapshot.tracks.map(t => t.id));
    for (const [copy, id] of byCopy) {
      const before = last.get(copy);
      if (before && before.id !== id) {
        const entered = within(started, id, before.step, i);
        const expired = within(ended, before.id, before.step, i) || !live.has(before.id);
        if (!entered || !expired) {
          switches.push({ step: i, sequence: trace.steps[i].line.sequence, copy, from: before.id,
            to: id, entered, expired });
        }
      }
      last.set(copy, { id, step: i });
      if (byTrack.get(id).length > 1) continue;
      if (!copiesOf.has(id)) copiesOf.set(id, new Set());
      copiesOf.get(id).add(copy);
    }
  });
  const continuity = [...copiesOf].filter(([, copies]) => copies.size > 1)
    .map(([id, copies]) => ({ id, copies: [...copies] }));
  return { idSwitches: switches.length, switches,
    falseContinuity: continuity.reduce((sum, c) => sum + c.copies.length - 1, 0), continuity };
}

// A copy counts as reported when its occurrence carries a located (measured) geometry.
const locatedIn = (line, copy) => {
  const t = line.truth && line.truth.find(entry => entry.copy === copy);
  return Boolean(t && t.visible && t.reported && t.reported[1] !== null &&
    t.kind !== 'unavailable');
};
const merged = (line, raw) => {
  const seen = new Set();
  for (const t of line.truth.filter(entry => entry.raw === raw && entry.reported)) {
    const key = addressKey(...t.reported);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
};

/**
 * Splits are ambiguous expiries, one per contest (shared successors). unexplained: every copy of
 * the content was reported in this frame and in the previous updated frame, none merged.
 * limit: a twin's first absent frame (predicted by generate.mjs). Any other split is explained.
 */
export function splits(trace) {
  const result = { unexplained: 0, limit: 0, explained: 0, list: [] };
  let previous = null;
  trace.steps.forEach((step, i) => {
    if (!updated(step)) return;
    const contests = new Map();
    for (const e of step.snapshot.events) {
      if (e.type !== 'expired' || e.reason !== 'ambiguous') continue;
      const id = JSON.stringify(e.successors || []);
      if (!contests.has(id)) contests.set(id, []);
      contests.get(id).push(e.trackId);
    }
    for (const [successors, expired] of contests) {
      const before = trace.steps[i - 1].snapshot.tracks.find(t => t.id === expired[0]);
      const raw = before ? rawOf(before.key) : null, line = step.line;
      let kind = 'explained';
      if (raw !== null && line.truth && previous && previous.line.truth) {
        const copies = line.truth.filter(t => t.raw === raw).map(t => t.copy);
        const earlier = previous.line.truth.filter(t => t.raw === raw).map(t => t.copy);
        const both = copies.every(c => locatedIn(line, c) && locatedIn(previous.line, c)) &&
          earlier.every(c => copies.includes(c));
        const now = copies.filter(c => locatedIn(line, c));
        const firstAbsent = earlier.some(c => locatedIn(previous.line, c) && !locatedIn(line, c)) &&
          now.length > 0 && now.every(c => locatedIn(previous.line, c));
        if (both && !merged(line, raw) && !merged(previous.line, raw)) kind = 'unexplained';
        else if (firstAbsent) kind = 'limit';
      }
      result[kind]++;
      result.list.push({ step: i, sequence: line.sequence, raw, kind, expired,
        successors: JSON.parse(successors) });
    }
    previous = step;
  });
  return result;
}

const pointsOf = t => t.kind !== 'unavailable' && t.points.length > 0;

/**
 * Share of frames in static and slow spans (truth speed <= 1 size/s, copy visible) in which the
 * track selected at the span's start is still live and still on that copy. Predicted limit
 * frames ({ sequence, raw }) end a span; the next selection is made at the limit frame.
 */
export function selectionSurvival(trace, { limitFrames = [] } = {}, assoc = associations(trace)) {
  const state = new Map(), failures = [];
  let count = 0, holds = 0;
  trace.steps.forEach((step, i) => {
    if (!updated(step) || !step.line.truth) return;
    const { byCopy, byTrack } = assoc[i], live = new Set(step.snapshot.tracks.map(t => t.id));
    for (const t of step.line.truth) {
      if (!pointsOf(t)) continue;
      const s = state.get(t.copy) || { span: null, at: null, c: null };
      const c = centroid(t.points), size = trueSize(t.kind, t.points);
      const speed = s.c === null || !t.visible ? 0
        : Math.hypot(c.x - s.c.x, c.y - s.c.y) / ((step.line.observedAt - s.at) / 1000) / size;
      const limit = limitFrames.some(f => f.sequence === step.line.sequence && f.raw === t.raw);
      if (!t.visible || speed > 1 + 1e-9 || limit) s.span = null;
      if (t.visible && speed <= 1 + 1e-9) {
        if (s.span === null) s.span = { selected: null };
        if (s.span.selected === null) s.span.selected = byCopy.get(t.copy) ?? null;
        else if (!limit) {
          const id = s.span.selected, own = byCopy.get(t.copy);
          const ok = live.has(id) && (own === undefined || own === id) &&
            (byTrack.get(id) || [t.copy]).every(copy => copy === t.copy);
          count++;
          if (ok) holds++;
          else failures.push({ sequence: step.line.sequence, copy: t.copy, selected: id, own });
        }
      }
      Object.assign(s, { at: step.line.observedAt, c: t.visible ? c : null });
      state.set(t.copy, s);
    }
  });
  return { survival: count === 0 ? 1 : holds / count, count, holds, failures };
}

/** Geometry withdrawn from a live track while its copy is visible and evidence is fresh. */
export function flicker(trace, { staleMs = 1200 } = {}, assoc = associations(trace)) {
  const copyOf = new Map(), events = [];
  let truth = null;
  trace.steps.forEach((step, i) => {
    for (const [id, copies] of assoc[i].byTrack) copyOf.set(id, copies[0]);
    if (isFrame(step) && step.line.truth) truth = step.line.truth;
    if (i === 0 || truth === null) return;
    const before = new Map(trace.steps[i - 1].snapshot.tracks.map(t => [t.id, t]));
    for (const t of step.snapshot.tracks) {
      const was = before.get(t.id), copy = copyOf.get(t.id);
      if (!was || was.geometry === null || t.geometry !== null || t.basis !== 'spatial') continue;
      const seen = truth.find(entry => entry.copy === copy);
      if (seen && seen.visible && step.snapshot.now - t.lastSeenAt < staleMs) {
        events.push({ step: i, trackId: t.id, copy });
      }
    }
  });
  return { flicker: events.length, events };
}

/** Restarts by reason over fresh measurements, and per 100 updates (frame lines). */
export function restarts(trace) {
  const counts = {}, updates = trace.steps.filter(isFrame).length;
  for (const step of trace.steps.filter(updated)) {
    for (const t of step.snapshot.tracks) {
      if (t.basis !== 'spatial' || t.geometry === null || t.geometry.restart === null ||
          t.observation.sequence !== step.line.sequence) continue;
      counts[t.geometry.restart] = (counts[t.geometry.restart] || 0) + 1;
    }
  }
  const per100 = Object.fromEntries(Object.entries(counts)
    .map(([reason, n]) => [reason, (100 * n) / Math.max(updates, 1)]));
  return { counts, per100, updates };
}

/**
 * Invalid and counter-clockwise published quads (each publication once: track id and evidence
 * time), and QR-family publications whose points[0] is not the true origin.
 */
export function violations(trace, assoc = associations(trace)) {
  const found = new Map();
  trace.steps.forEach((step, i) => {
    const frame = step.snapshot.frame;
    if (frame === null) return;
    for (const t of step.snapshot.tracks) {
      const g = t.geometry;
      if (g === null || g.kind !== 'quad') continue;
      const id = `${t.id}@${g.observedAt}`;
      const px = g.points.map(p => ({ x: p.x * frame.width, y: p.y * frame.height }));
      const problem = quadProblem(px);
      if (problem !== null) found.set(`${problem}:${id}`, { type: problem, id, step: i });
      const copy = [...assoc[i].byCopy].find(([, track]) => track === t.id);
      const truth = copy && step.line.truth.find(entry => entry.copy === copy[0]);
      if (!truth || truth.origin === null || !QR_FAMILY.includes(symbologyOf(t.key))) continue;
      // points[0] must be nearer the true origin (truth index 0) than any other true vertex.
      const d2 = truth.points.map(q => (q.x - px[0].x) ** 2 + (q.y - px[0].y) ** 2);
      if (d2.some((d, k) => k > 0 && d < d2[0])) {
        found.set(`origin:${id}`, { type: 'origin', id, step: i });
      }
    }
  });
  const list = [...found.values()], of = type => list.filter(v => v.type === type).length;
  return { total: list.length, invalid: of('invalid'), counterClockwise: of('counter-clockwise'),
    origin: of('origin'), list };
}

// Fresh publications with their truth: [{ step, copy, track, truth, errors, rms, size }].
function samples(trace, assoc) {
  const out = [];
  trace.steps.forEach((step, i) => {
    for (const [copy, id] of assoc[i].byCopy) {
      const track = step.snapshot.tracks.find(t => t.id === id);
      const truth = step.line.truth.find(entry => entry.copy === copy);
      if (!track.geometry || track.geometry.kind !== truth.kind || !pointsOf(truth)) continue;
      const errors = vertexErrors(truth.kind, track.geometry.points, truth.points,
        step.line.width, step.line.height, symbologyOf(track.key));
      if (errors === null) continue;
      const sq = errors.reduce((sum, e) => sum + e.dx * e.dx + e.dy * e.dy, 0) / errors.length;
      out.push({ step: i, copy, track, truth, errors, rms: Math.sqrt(sq),
        size: trueSize(truth.kind, truth.points) });
    }
  });
  return out;
}

/** corner_rms_px pooled over every vertex; corner_err_norm averaged per publication. */
export function cornerErrors(trace, assoc = associations(trace)) {
  const list = samples(trace, assoc);
  let sum = 0, n = 0;
  for (const s of list) {
    for (const e of s.errors) sum += e.dx * e.dx + e.dy * e.dy;
    n += s.errors.length;
  }
  return { cornerRmsPx: n === 0 ? null : Math.sqrt(sum / n),
    cornerErrNorm: list.length === 0 ? null
      : list.reduce((total, s) => total + s.rms / s.size, 0) / list.length,
    samples: list.length };
}

const scaled = (points, frame) =>
  points.map(p => ({ x: p.x * frame.width, y: p.y * frame.height }));

/**
 * RMS frame-to-frame displacement of published vertices of one track on one copy whose truth is
 * unchanged between consecutive updated frames; without truth, between frames of a 'static' span.
 */
export function jitter(trace, assoc = associations(trace)) {
  let sum = 0, n = 0, before = null;
  trace.steps.forEach((step, i) => {
    if (!updated(step)) return;
    if (before !== null) {
      const pairs = [];
      if (step.line.truth) {
        for (const [copy, id] of assoc[i].byCopy) {
          const a = before.line.truth && before.line.truth.find(t => t.copy === copy);
          const b = step.line.truth.find(t => t.copy === copy);
          if (assoc[before.index].byCopy.get(copy) === id && a && pointsOf(a) &&
              JSON.stringify(a.points) === JSON.stringify(b.points)) pairs.push(id);
        }
      } else if (step.line.span === 'static' && before.line.span === 'static') {
        for (const t of step.snapshot.tracks) {
          const was = before.snapshot.tracks.find(u => u.id === t.id);
          if (was && fresh(t, step) && fresh(was, before)) pairs.push(t.id);
        }
      }
      for (const id of pairs) {
        const p = scaled(step.snapshot.tracks.find(t => t.id === id).geometry.points, step.line);
        const q = scaled(before.snapshot.tracks.find(t => t.id === id).geometry.points,
          before.line);
        p.forEach((v, k) => {
          sum += (v.x - q[k].x) ** 2 + (v.y - q[k].y) ** 2;
          n++;
        });
      }
    }
    before = { ...step, index: i };
  });
  return { jitterPx: n === 0 ? null : Math.sqrt(sum / n), vertices: n };
}

const fresh = (t, step) => t.basis === 'spatial' && t.geometry !== null &&
  t.observation.sequence === step.line.sequence;

/**
 * lag_px: mean along-track distance between true and published centroids while the true
 * velocity is constant over the last two intervals. series lists every sample.
 */
export function lag(trace, assoc = associations(trace)) {
  const history = new Map(), series = [];
  trace.steps.forEach((step, i) => {
    if (!updated(step) || !step.line.truth) return;
    for (const t of step.line.truth) {
      if (!pointsOf(t)) continue;
      const c = centroid(t.points), h = history.get(t.copy) || [];
      h.push({ c, at: step.line.observedAt / 1000 });
      history.set(t.copy, h.slice(-3));
      const id = assoc[i].byCopy.get(t.copy);
      if (h.length < 3 || id === undefined) continue;
      const [p0, p1, p2] = h.slice(-3);
      const v0 = { x: (p1.c.x - p0.c.x) / (p1.at - p0.at), y: (p1.c.y - p0.c.y) / (p1.at - p0.at) };
      const v1 = { x: (p2.c.x - p1.c.x) / (p2.at - p1.at), y: (p2.c.y - p1.c.y) / (p2.at - p1.at) };
      const speed = Math.hypot(v1.x, v1.y);
      if (speed <= STILL_PX || Math.hypot(v1.x - v0.x, v1.y - v0.y) > 1e-6 * Math.max(speed, 1)) {
        continue;
      }
      const g = step.snapshot.tracks.find(track => track.id === id).geometry;
      const published = centroid(scaled(g.points, step.line));
      const along = ((c.x - published.x) * v1.x + (c.y - published.y) * v1.y) / speed;
      series.push({ step: i, sequence: step.line.sequence, copy: t.copy, lag: along });
    }
  });
  return { lagPx: series.length === 0 ? null
    : series.reduce((sum, s) => sum + s.lag, 0) / series.length, series };
}

/** Captures: RMS of points - measured of fresh publications during 'motion' spans. */
export function lagProxy(trace) {
  let sum = 0, n = 0;
  for (const step of trace.steps.filter(updated)) {
    if (step.line.span !== 'motion') continue;
    for (const t of step.snapshot.tracks) {
      if (!fresh(t, step)) continue;
      const p = scaled(t.geometry.points, step.line), m = scaled(t.geometry.measured, step.line);
      p.forEach((v, k) => {
        sum += (v.x - m[k].x) ** 2 + (v.y - m[k].y) ** 2;
        n++;
      });
    }
  }
  return { lagProxyPx: n === 0 ? null : Math.sqrt(sum / n), vertices: n };
}

/**
 * settle_frames: after a step (one isolated true move) or a stop (the first of two unmoved
 * frames after motion), the frames until the copy's corner RMS is below thresholdPx or a
 * restart publishes the measurement. null when neither happens before the next event or the end
 * (segments keep their scan-row spread against the centre-line truth, so they rarely settle).
 */
export function settle(trace, assoc = associations(trace), { thresholdPx = 1 } = {}) {
  const byCopy = new Map();
  for (const s of samples(trace, assoc)) {
    if (!byCopy.has(s.copy)) byCopy.set(s.copy, new Map());
    byCopy.get(s.copy).set(s.step, s);
  }
  const tracksOf = new Map();
  trace.steps.forEach((step, i) => {
    if (!updated(step) || !step.line.truth) return;
    for (const t of step.line.truth) {
      if (!pointsOf(t)) continue;
      if (!tracksOf.has(t.copy)) tracksOf.set(t.copy, []);
      tracksOf.get(t.copy).push({ step: i, c: centroid(t.points) });
    }
  });
  const events = [];
  for (const [copy, path] of tracksOf) {
    const moved = path.map((p, k) => k > 0 &&
      Math.hypot(p.c.x - path[k - 1].c.x, p.c.y - path[k - 1].c.y) > STILL_PX);
    const starts = [];
    // A stop stays still for two frames (a turnaround sampled across its peak does not); a step
    // is one move between still frames.
    moved.forEach((m, k) => {
      if (k < 2 || k + 1 >= moved.length) return;
      if (!m && !moved[k + 1] && moved[k - 1] && moved[k - 2]) starts.push({ k, kind: 'stop' });
      if (m && !moved[k - 1] && !moved[k + 1]) starts.push({ k, kind: 'step' });
    });
    starts.forEach(({ k, kind }, e) => {
      const end = e + 1 < starts.length ? starts[e + 1].k : path.length;
      let frames = null;
      for (let j = k; j < end && frames === null; j++) {
        const s = byCopy.get(copy) && byCopy.get(copy).get(path[j].step);
        if (s && (s.track.geometry.restart !== null || s.rms < thresholdPx)) frames = j - k;
      }
      events.push({ copy, kind, sequence: trace.steps[path[k].step].line.sequence, frames });
    });
  }
  const done = events.filter(e => e.frames !== null).map(e => e.frames);
  return { events, mean: done.length ? done.reduce((a, b) => a + b, 0) / done.length : null,
    max: done.length ? Math.max(...done) : null, unsettled: events.length - done.length };
}

/**
 * Per updated frame, the snapshot against its truth: a located occurrence is taken by exactly
 * one tracked spatial track of the reported kind; a position-less read is absorbed (unassigned,
 * unresolved) or refreshes one tracked content track without geometry; a spatial track that
 * took nothing in the frame is not tracked.
 */
export function frameChecks(trace) {
  const problems = [];
  trace.steps.forEach((step, i) => {
    if (!updated(step) || !step.line.truth) return;
    const { tracks, unassigned } = step.snapshot, sequence = step.line.sequence;
    const problem = (copy, text) => problems.push({ step: i, sequence, copy, problem: text });
    for (const truth of step.line.truth) {
      if (!truth.reported) continue;
      const [d, j] = truth.reported;
      const owners = tracks.filter(t => t.observation.sequence === sequence &&
        t.observation.detectionIndex === d && t.observation.occurrenceIndex === j);
      if (j !== null && truth.kind !== 'unavailable') {
        const t = owners[0];
        if (owners.length !== 1) problem(truth.copy, `${owners.length} tracks took the occurrence`);
        else if (t.basis !== 'spatial' || t.state !== 'tracked' || t.geometry === null ||
            t.geometry.kind !== truth.kind) {
          problem(truth.copy, `${t.id} is ${t.basis} ${t.state} with ` +
            `${t.geometry ? t.geometry.kind : 'no'} geometry, expected a tracked ${truth.kind}`);
        }
        continue;
      }
      const absorbed = unassigned.some(u => u.detectionIndex === d && u.occurrenceIndex === j &&
        u.reason === 'unresolved');
      const t = owners[0];
      if (absorbed ? owners.length !== 0 : owners.length !== 1 || t.basis !== 'content' ||
          t.state !== 'tracked' || t.geometry !== null) {
        problem(truth.copy, absorbed ? 'an absorbed read refreshed a track'
          : `the read is neither absorbed nor on one tracked content track (${owners.length})`);
      }
    }
    for (const t of tracks) {
      if (t.basis === 'spatial' && t.observation.sequence !== sequence && t.state === 'tracked') {
        problem(null, `${t.id} is tracked without a match in this frame`);
      }
    }
  });
  return problems;
}

/** Every metric of one replayed scene. */
export function sceneMetrics(trace, { staleMs = 1200 } = {}) {
  const assoc = associations(trace);
  const predicted = (trace.header && trace.header.generator && trace.header.generator.predicted &&
    trace.header.generator.predicted.limitSplits) || [];
  const identity = identityErrors(trace, assoc), split = splits(trace);
  const corners = cornerErrors(trace, assoc), settled = settle(trace, assoc);
  const selection = selectionSurvival(trace, { limitFrames: predicted }, assoc);
  return {
    updates: trace.steps.filter(isFrame).length,
    jitter_px: jitter(trace, assoc).jitterPx,
    lag_px: lag(trace, assoc).lagPx,
    lag_proxy_px: lagProxy(trace).lagProxyPx,
    corner_rms_px: corners.cornerRmsPx,
    corner_err_norm: corners.cornerErrNorm,
    settle_frames: { mean: settled.mean, max: settled.max, events: settled.events.length,
      unsettled: settled.unsettled },
    restarts: restarts(trace),
    violations: violations(trace, assoc).total,
    id_switches: identity.idSwitches,
    false_continuity: identity.falseContinuity,
    unexplained_splits: split.unexplained,
    limit_splits: split.limit,
    explained_splits: split.explained,
    predicted_limit_splits: predicted.length,
    selection_survival: selection.survival,
    flicker: flicker(trace, { staleMs }, assoc).flicker,
    frame_problems: frameChecks(trace).length,
  };
}
