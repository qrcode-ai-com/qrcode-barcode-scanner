// Replay runner (10.4): feeds JSONL v1 lines to createDetectionTracker of the module under
// test, runs smoothing candidates as post-filters and writes a metrics report.
// Usage: node replay/run.mjs --module <camera.js> [--input <file.jsonl>]... [--candidate <json>]...
//   [--out <report.json>]. Without --input, the synthetic scenes R1-R16 are generated in memory.

import { pathToFileURL } from 'node:url';
import { validBlend, sceneMetrics } from './metrics.mjs';

/** Feeds every frame and time line to one tracker: { header, steps: [{ line, snapshot }] }. */
export function replay(lines, { createDetectionTracker, trackerOptions = {} }) {
  const tracker = createDetectionTracker(trackerOptions);
  const header = lines.length && lines[0].kind === 'header' ? lines[0] : null, steps = [];
  try {
    for (const line of lines) {
      if (line.kind === 'frame') {
        const frame = { width: line.width, height: line.height, observedAt: line.observedAt };
        if (line.epoch !== undefined && line.epoch !== null) frame.epoch = line.epoch;
        if (line.sequence !== undefined && line.sequence !== null) frame.sequence = line.sequence;
        steps.push({ line, snapshot: tracker.update(line.report, frame,
          { now: line.now, ...(line.options || {}) }) });
      } else if (line.kind === 'time') {
        steps.push({ line, snapshot: line.op === 'peek' ? tracker.snapshot(line.now)
          : tracker.advance(line.now) });
      }
    }
  } finally {
    tracker.destroy();
  }
  return { header, steps };
}

/** The baseline smoother of camera.js (fixed alpha, 6.5) as a post-filter candidate. */
export function fixedCandidate(alpha = 0.35) {
  return {
    name: `fixed-${alpha}`,
    params: { kind: 'fixed', alpha },
    reset: () => ({}),
    blend: ({ estimate, aligned }) => ({ state: {}, alpha, points: estimate.map((e, i) =>
      ({ x: e.x + alpha * (aligned[i].x - e.x), y: e.y + alpha * (aligned[i].y - e.y) })) }),
  };
}

// The reported source-px points of a fresh measurement, in the track's vertex order (the order
// of geometry.measured). null when the published measurement cannot be found in the report.
function measuredPx(track, line) {
  const o = track.observation, detection = line.report.detections[o.detectionIndex];
  const raw = detection && detection.occurrences && detection.occurrences[o.occurrenceIndex];
  if (!raw) return null;
  const points = raw.geometry.points, g = track.geometry;
  const ordered = g.measured.map(m => points.find(p => p.x / line.width === m.x &&
    p.y / line.height === m.y));
  return ordered.every(p => p !== undefined) ? ordered.map(p => ({ x: p.x, y: p.y })) : null;
}

/**
 * Runs a candidate over each track's measured sequence of a smoothing 'none' replay. Restarts
 * come from the replay; a blend that fails the 6.7 check restarts as 'invalid-blend'. Returns a
 * copy of the trace whose published points are the candidate's.
 */
export function postFilter(trace, candidate) {
  const states = new Map();
  const steps = trace.steps.map(step => {
    const tracks = step.snapshot.tracks.map(t => {
      if (t.geometry === null || t.basis !== 'spatial') return t;
      const freshHere = step.line.kind === 'frame' && t.observation.sequence ===
        step.line.sequence && t.geometry.observedAt === step.line.observedAt;
      let s = states.get(t.id);
      if (freshHere) s = measure(t, step.line, s, candidate);
      if (!s) return t;
      states.set(t.id, s);
      return { ...t, geometry: { ...t.geometry, smoothed: s.smoothed, restart: s.restart,
        points: s.published.map(p => ({ x: p.x, y: p.y })) } };
    });
    return { line: step.line, snapshot: { ...step.snapshot, tracks } };
  });
  return { header: trace.header, steps };
}

// Published points are normalized exactly as camera.js does: source px / frame size.
const normalized = (points, width, height) =>
  points.map(p => ({ x: p.x / width, y: p.y / height }));

function measure(t, line, previous, candidate) {
  const g = t.geometry, at = line.observedAt, { width, height } = line;
  // Partial geometry is never smoothed: it publishes the measurement as it is.
  if (g.kind === 'partial') {
    return { width, height, kind: 'partial', estimate: null, published: g.measured, at,
      extra: null, smoothed: false, restart: null };
  }
  const aligned = measuredPx(t, line);
  if (aligned === null) throw new Error(`${t.id}: measured points are not in the report`);
  const restart = reason => ({ width, height, kind: g.kind, estimate: aligned,
    published: normalized(aligned, width, height), at, extra: candidate.reset(), smoothed: false,
    restart: reason });
  if (g.restart !== null || !previous || previous.kind !== g.kind) return restart(g.restart);
  // A same-aspect resolution change rescales the history first, as camera.js does.
  const scale = Math.max(width, height) / Math.max(previous.width, previous.height);
  const estimate = scale === 1 ? previous.estimate
    : previous.estimate.map(p => ({ x: p.x * scale, y: p.y * scale }));
  const next = candidate.blend({ estimate, aligned, dt: at - previous.at, state: previous.extra,
    scale });
  if (!validBlend(g.kind, next.points, width, height)) return restart('invalid-blend');
  return { width, height, kind: g.kind, estimate: next.points,
    published: normalized(next.points, width, height), at, extra: next.state, smoothed: true,
    restart: null };
}

// ------------------------------------------------------------ comparisons (4.11, T69)

const byJson = (a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);

/**
 * A snapshot with each detection replaced by [contentKey, ECI list] and wire addresses removed
 * (4.11). Unassigned and dropped entries lose their addresses, so they compare as sorted
 * multisets.
 */
export function canonical(snapshot, contentKey) {
  const content = d => [contentKey(d), d.content.eci === undefined ? null : d.content.eci];
  const strip = ({ sequence, detectionIndex, occurrenceIndex, ...rest }) => rest;
  return { ...snapshot,
    tracks: snapshot.tracks.map(({ observation, detection, ...t }) =>
      ({ ...t, detection: content(detection) })),
    results: snapshot.results.map(r => ({ ...r, detection: content(r.detection) })),
    unassigned: snapshot.unassigned.map(strip).sort(byJson),
    dropped: snapshot.dropped.map(strip).sort(byJson) };
}

/** What smoothing must never change (T69): ids, slots, bases, states, results and events. */
export const identityOf = snapshot => ({ status: snapshot.status, events: snapshot.events,
  tracks: snapshot.tracks.map(t => [t.id, t.slot, t.basis, t.state, t.resultId, t.misses,
    t.lastSeenAt]),
  results: snapshot.results.map(r => [r.id, r.trackIds]) });

/** Largest difference between the published points of two traces of the same lines. */
export function publishedDifference(a, b) {
  let max = 0, publications = 0;
  a.steps.forEach((step, i) => {
    step.snapshot.tracks.forEach((t, j) => {
      const u = b.steps[i].snapshot.tracks[j];
      if (t.id !== u.id || (t.geometry === null) !== (u.geometry === null)) max = Infinity;
      if (t.geometry === null || u.geometry === null) return;
      publications++;
      t.geometry.points.forEach((p, k) => {
        const q = u.geometry.points[k];
        max = Math.max(max, q ? Math.abs(p.x - q.x) + Math.abs(p.y - q.y) : Infinity);
      });
    });
  });
  return { max, publications };
}

// --------------------------------------------------------------------------- report

// A missing measurement (null: nothing measured, or never settled) counts as +Infinity.
const orInfinity = v => (typeof v === 'number' && !Number.isNaN(v) ? v : Infinity);

/**
 * Adoption rule 10.7, synthetic part: safety, no scene's corner_err_norm more than 5% worse,
 * and R1 jitter <= 0.7 x baseline with R2 lag and R9 settle no worse, or R2 lag <= 0.7 x
 * baseline with R1 jitter and R9 settle no worse. Captures (condition 3) are not evaluated.
 * A missing candidate value counts as worse than any measured baseline.
 */
export function adoption(baseline, candidate, identityEqual) {
  const scenes = Object.keys(baseline);
  const m = (s, key) => candidate[s]?.[key] ?? null;
  const b = (s, key) => baseline[s]?.[key] ?? null;
  const worse = scenes.filter(s => b(s, 'corner_err_norm') !== null &&
    !(orInfinity(m(s, 'corner_err_norm')) <= 1.05 * b(s, 'corner_err_norm')));
  const safety = identityEqual && scenes.every(s => m(s, 'violations') === 0 &&
    m(s, 'unexplained_splits') === 0);
  const noWorse = (s, key) => orInfinity(m(s, key)) <= orInfinity(b(s, key));
  const better = (s, key) => Number.isFinite(orInfinity(b(s, key))) &&
    orInfinity(m(s, key)) <= 0.7 * b(s, key);
  // R9: no slower mean over the settled stops, and no more stops left unsettled.
  const cs = m('R9', 'settle_frames'), bs = b('R9', 'settle_frames');
  const settleOk = cs !== null && bs !== null && orInfinity(cs.mean) <= orInfinity(bs.mean) &&
    cs.unsettled <= bs.unsettled;
  const jitterFirst = better('R1', 'jitter_px') && noWorse('R2', 'lag_px') && settleOk;
  const lagFirst = better('R2', 'lag_px') && noWorse('R1', 'jitter_px') && settleOk;
  return { safety, cornerWorse: worse, tradeoff: jitterFirst ? 'jitter' : lagFirst ? 'lag' : null,
    synthetic: safety && worse.length === 0 && (jitterFirst || lagFirst),
    captures: 'not evaluated: needs at least 3 sessions from 2 devices, one a phone' };
}

/** The comparison of section 10: baseline (in-module default) and post-filter candidates. */
export function compare({ createDetectionTracker, inputs, candidates = [], trackerOptions = {} }) {
  const baseline = {}, none = {}, results = candidates.map(c => ({ name: c.name, params: c.params,
    scenes: {}, identityEqual: true }));
  const parity = { max: 0, publications: 0 };
  for (const { name, lines } of inputs) {
    const base = replay(lines, { createDetectionTracker, trackerOptions });
    const raw = replay(lines, { createDetectionTracker,
      trackerOptions: { ...trackerOptions, smoothing: { kind: 'none' } } });
    baseline[name] = sceneMetrics(base);
    none[name] = sceneMetrics(raw);
    const same = JSON.stringify(base.steps.map(s => identityOf(s.snapshot))) ===
      JSON.stringify(raw.steps.map(s => identityOf(s.snapshot)));
    const s = trackerOptions.smoothing === undefined ? 0.35 : trackerOptions.smoothing;
    const alpha = typeof s === 'number' ? s : s.kind === 'fixed' ? s.alpha : null;
    if (alpha !== null) {
      const diff = publishedDifference(base, postFilter(raw, fixedCandidate(alpha)));
      parity.max = Math.max(parity.max, diff.max);
      parity.publications += diff.publications;
    }
    candidates.forEach((candidate, i) => {
      results[i].scenes[name] = sceneMetrics(postFilter(raw, candidate));
      results[i].identityEqual = results[i].identityEqual && same;
    });
  }
  for (const r of results) r.adoption = adoption(baseline, r.scenes, r.identityEqual);
  return { baseline, none, candidates: results, parity };
}

// ------------------------------------------------------------------------------ CLI

async function sha256(data) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(data).digest('hex');
}

/** --candidate JSON: { kind: 'fixed', alpha }, { kind: 'one-euro', ...params } or
 * { module, params }. */
export async function loadCandidate(spec) {
  const { kind, module, params, ...rest } = typeof spec === 'string' ? JSON.parse(spec) : spec;
  if (module !== undefined) {
    return (await import(new URL(module, import.meta.url).href)).createCandidate(params || {});
  }
  if (kind === 'fixed') return fixedCandidate(rest.alpha);
  if (kind === 'one-euro') return (await import('./candidates/one-euro.mjs')).createCandidate(rest);
  throw new TypeError('A candidate is { kind: "fixed" | "one-euro", ... } or { module, params }.');
}

export async function main(argv) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { basename, isAbsolute, relative, resolve, sep } = await import('node:path');
  // The report may be published: paths are repository-relative, or the file name outside it.
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const publicPath = path => {
    const inside = relative(root, resolve(path));
    return inside === '' || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)
      ? basename(path) : inside.split(sep).join('/');
  };
  const all = name => argv.flatMap((arg, i) => (arg === name ? [argv[i + 1]] : []));
  const given = all('--module')[0] ?? process.env.QRSCAN_CAMERA_MODULE ??
    new URL('../camera.js', import.meta.url).href;
  const moduleUrl = /^[a-z]+:/i.test(given) ? given : pathToFileURL(resolve(given)).href;
  const camera = await import(moduleUrl);
  const { parseJsonl, generateAll, toJsonl } = await import('./generate.mjs');
  const inputs = [];
  for (const path of all('--input')) {
    const text = readFileSync(path, 'utf8'), lines = parseJsonl(text);
    inputs.push({ name: lines[0] && lines[0].scene ? lines[0].scene : basename(path),
      path: publicPath(path), sha256: await sha256(text), lines });
  }
  if (inputs.length === 0) {
    for (const [scene, lines] of generateAll()) {
      inputs.push({ name: scene, path: null, sha256: await sha256(toJsonl(lines)), lines });
    }
  }
  const candidates = await Promise.all(all('--candidate').map(loadCandidate));
  const modulePath = fileURLToPath(moduleUrl);
  const report = {
    tool: 'replay/run.mjs', version: 1, node: process.version,
    module: { path: publicPath(modulePath), sha256: await sha256(readFileSync(modulePath)) },
    inputs: inputs.map(({ name, path, sha256: hash, lines }) => ({ name, path, sha256: hash,
      lines: lines.length, source: lines[0] ? lines[0].source : null,
      seed: lines[0] ? lines[0].seed ?? null : null })),
    parameters: { trackerOptions: {}, baseline: 'camera.js default smoothing (fixed 0.35)',
      candidates: candidates.map(c => ({ name: c.name, params: c.params })) },
    ...compare({ createDetectionTracker: camera.createDetectionTracker, inputs, candidates }),
  };
  const text = `${JSON.stringify(report, (key, value) =>
    (typeof value === 'number' && !Number.isFinite(value) ? String(value) : value), 2)}\n`;
  const out = all('--out')[0];
  if (out === undefined) process.stdout.write(text);
  else writeFileSync(out, text);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    process.exitCode = 1;
    console.error(error);
  });
}

