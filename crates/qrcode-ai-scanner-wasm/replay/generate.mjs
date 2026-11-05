// Seeded synthetic replay scenes R1-R16 as JSONL v1 lines. Development tool; never shipped.
// Usage: node replay/generate.mjs [--scene R6] [--seed 58] [--noise 0.5] [--rows centre]
//   [--out dir]

import { pathToFileURL } from 'node:url';

export const WIDTH = 1280;
export const HEIGHT = 720;
export const FRAME_MS = 100;
export const SIDE = 120;
export const NOISE = 0.5;
export const LATENCY = 40;
export const DEFAULT_SEED = 58;
export const SCENES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12',
  'R13', 'R14', 'R15', 'R16'];
export const COMPLETE = Object.freeze({ reads: false, detections: false, occurrences: false });
export const QR_FAMILY = ['qr_code', 'micro_qr_code', 'rectangular_micro_qr_code'];
const TALL_BARS = ['ean13', 'ean8', 'upc_a', 'upc_e'];

// ------------------------------------------------------------------------ random

/** mulberry32 uniforms and Box-Muller normals: one seed, one sequence. */
export function createRandom(seed) {
  let state = seed >>> 0, spare = null;
  const next = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    let u = 0;
    while (u === 0) u = next();
    const v = next(), r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  return {
    next,
    gauss,
    uniform: (a, b) => a + (b - a) * next(),
    int: n => Math.floor(next() * n),
    shuffle(list) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    },
  };
}

// ---------------------------------------------------------------------- geometry

const rotate = (dx, dy, angle) => ({ x: dx * Math.cos(angle) - dy * Math.sin(angle),
  y: dx * Math.sin(angle) + dy * Math.cos(angle) });
const around = (cx, cy, offsets, angle) => offsets.map(([dx, dy]) => {
  const r = rotate(dx, dy, angle);
  return { x: cx + r.x, y: cy + r.y };
});

/** Clockwise square in y-down pixels; points[0] is the QR origin (top-left when upright). */
export function square(cx, cy, side = SIDE, angle = 0) {
  const h = side / 2;
  return around(cx, cy, [[-h, -h], [h, -h], [h, h], [-h, h]], angle);
}

/** A square tilted about its vertical axis, seen by a pinhole camera `distance` sizes away. */
export function keystone(cx, cy, side, tilt, distance = 4) {
  return [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([X, Y]) => {
    const depth = 1 + (X * Math.sin(tilt)) / distance;
    return { x: cx + (side * X * Math.cos(tilt)) / depth, y: cy + (side * Y) / depth };
  });
}

// Engine order of a segment: x first, then y.
const engineOrder = (a, b) => (a.x < b.x || (a.x === b.x && a.y <= b.y) ? [a, b] : [b, a]);

/** Centre line of a linear symbol, in engine order. */
export function segment(cx, cy, length, angle = 0) {
  const r = rotate(length / 2, 0, angle);
  return engineOrder({ x: cx - r.x, y: cy - r.y }, { x: cx + r.x, y: cy + r.y });
}

/** Finder-pattern centres of a 25-module QR: top-left, top-right, bottom-left. */
export function finderCentres(cx, cy, side = SIDE, angle = 0) {
  const m = side / 25;
  return around(cx, cy, [[-9 * m, -9 * m], [9 * m, -9 * m], [-9 * m, 9 * m]], angle);
}

/** Points on one image row at the given offsets from x0. */
export const rowPoints = (x0, y, offsets) => offsets.map(dx => ({ x: x0 + dx, y }));

export function centroidOf(points) {
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** Assumed bar height over scan length; a prior for association only. */
export const kappaOf = symbology => (TALL_BARS.includes(symbology) ? 0.7 : 0.25);

/**
 * One reader measurement of a true geometry. Quads and partials: Gaussian noise on each point.
 * Segments: a scan row drawn uniformly across the assumed bar height (rows 'centre' keeps the
 * centre row), and endpoint noise along the row. noise 0 returns the truth exactly.
 */
export function measure(kind, truth, symbology, rnd, noise, rows = 'uniform') {
  if (kind === 'unavailable') return [];
  if (kind === 'segment') {
    const [a, b] = truth, dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    const ux = dx / length, uy = dy / length;
    const row = noise > 0 && rows === 'uniform'
      ? (rnd.next() - 0.5) * kappaOf(symbology) * length : 0;
    const ends = [a, b].map(q => {
      const along = noise > 0 ? noise * rnd.gauss() : 0;
      return { x: q.x - uy * row + ux * along, y: q.y + ux * row + uy * along };
    });
    return engineOrder(ends[0], ends[1]);
  }
  if (noise === 0) return truth.map(q => ({ x: q.x, y: q.y }));
  return truth.map(q => ({ x: q.x + noise * rnd.gauss(), y: q.y + noise * rnd.gauss() }));
}

// ----------------------------------------------------------------------- reports

/** A decoded content; raw is the base64 of an ASCII label. */
export const makeCode = (symbology, label, extra = {}) =>
  ({ symbology, label, raw: btoa(label), ...extra });
const codeId = code => JSON.stringify([code.symbology, code.raw, code.fnc1 ?? null,
  code.eci === undefined ? null : code.eci]);

/** A report detection; occurrences undefined gives a pipeline-4 (legacy) detection. */
export function makeDetection(code, occurrences, corners = null) {
  const content = { text: code.label, raw: code.raw, charset: 'utf8' };
  if (code.eci !== undefined) content.eci = code.eci.map(entry => ({ ...entry }));
  if (code.fnc1 !== undefined) content.fnc1 = code.fnc1;
  const detection = { symbology: code.symbology, content, payload: { kind: 'text' }, corners,
    meta: { version: null, ec_level: null, mask: null, modules: null, inverted: null },
    engines: ['rxing'] };
  if (occurrences !== undefined) detection.occurrences = occurrences;
  return detection;
}

export const makeOccurrence = (kind, points, reader = 'rxing') =>
  ({ geometry: { kind, points, reader: kind === 'unavailable' ? null : reader } });

/** The ScanReport shape the tracker consumes; legacy reports carry neither flag (pipeline 4). */
export function makeReport(detections, { budgetExhausted = false, saturation = COMPLETE,
  legacy = false } = {}) {
  const trace = { stages: [{ stage: 'direct', transforms_tried: 1, ms: 0,
    detections_found: detections.length }], engine_panics: 0, total_ms: 0 };
  if (!legacy) {
    trace.budget_exhausted = budgetExhausted;
    trace.saturation = { ...saturation };
  }
  return { detections, score: null, hints: [], trace, versions: legacy
    ? { scanner: '0.10.0', pipeline: 4, score_contract: 4 }
    : { scanner: '0.11.0', pipeline: 5, score_contract: 5 } };
}

// ------------------------------------------------------------------- scene builder

/**
 * Collects the lines of one scene. frame() takes the true copies of one capture; each copy is
 * { copy, code, kind, points (true, source px), visible?, reported?, reader? }. A copy is
 * reported when visible unless reported is false; truth links it to its wire address.
 */
export function createBuilder({ scene, seed, noise = NOISE, rows = 'uniform', width = WIDTH,
  height = HEIGHT }) {
  const rnd = createRandom(seed);
  const header = { v: 1, kind: 'header', scene, source: 'synthetic', width, height, seed,
    generator: { name: 'replay/generate.mjs', version: 1, noise, rows, frameMs: FRAME_MS,
      side: SIDE } };
  const lines = [header];
  let sequence = 0;
  function frame({ at, copies, latency = LATENCY, now, epoch = 1, budgetExhausted = false,
    saturation = COMPLETE, legacy = false, options }) {
    const groups = new Map(), truth = [];
    for (const c of copies) {
      const visible = c.visible !== false, reported = visible && c.reported !== false;
      truth.push({ copy: c.copy, raw: c.code.raw, kind: c.kind,
        points: c.points.map(p => ({ x: p.x, y: p.y })),
        origin: QR_FAMILY.includes(c.code.symbology) && c.kind === 'quad'
          ? { x: c.points[0].x, y: c.points[0].y } : null,
        visible, reported: null });
      if (!reported) continue;
      const id = codeId(c.code);
      if (!groups.has(id)) groups.set(id, { code: c.code, members: [] });
      groups.get(id).members.push({ c, index: truth.length - 1 });
    }
    const detections = [...groups.values()].map(({ code, members }, d) => {
      const measured = members.map(({ c }) => measure(c.kind, c.points, code.symbology, rnd,
        noise, rows));
      members.forEach(({ index }, j) => { truth[index].reported = [d, legacy ? null : j]; });
      if (legacy) {
        return makeDetection(code, undefined, measured[0].length === 4 ? measured[0] : null);
      }
      return makeDetection(code, members.map(({ c }, j) =>
        makeOccurrence(c.kind, measured[j], c.reader)));
    });
    const line = { kind: 'frame', epoch, sequence: ++sequence, observedAt: at,
      now: now ?? at + latency, width, height,
      report: makeReport(detections, { budgetExhausted, saturation, legacy }), truth };
    if (options !== undefined) line.options = options;
    lines.push(line);
    return line;
  }
  return {
    rnd, header, lines, frame,
    time: (now, op = 'advance') => lines.push({ kind: 'time', now, op }),
    /** Re-delivers an earlier frame line with a later processing time. */
    redeliver(line, now) {
      lines.push({ ...line, now });
    },
  };
}

// ----------------------------------------------------- reference cost model

export const LEAVE_SEEN = 9.5, LEAVE_LOST = 6.5, START = 6.5, MARGIN = 4, BIG = 1e6;
const SIZE_FLOOR = 0.02 * 0.02, COS2_20 = 0.8830222215594891, COST_GATE = 9;

export function shoelace(points) {
  let sum = 0;
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  });
  return sum / 2;
}

/** Descriptor of a validated geometry in isotropic units u = px / max(width, height). */
export function describeGeometry(kind, points, scale, symbology) {
  const p = points.map(q => ({ x: q.x / scale, y: q.y / scale })), c = centroidOf(p);
  const d = { kind, p, cx: c.x, cy: c.y, s2: 0, ax: 0, ay: 0, l2: 0, kappa: 0 };
  if (kind === 'quad') d.s2 = Math.abs(shoelace(p));
  else if (kind === 'segment') {
    d.ax = p[1].x - p[0].x;
    d.ay = p[1].y - p[0].y;
    d.l2 = d.ax * d.ax + d.ay * d.ay;
    d.kappa = kappaOf(symbology);
    d.s2 = d.kappa * d.l2;
  } else {
    const xs = p.map(q => q.x), ys = p.map(q => q.y);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    d.s2 = (w * w + h * h) / 2;
  }
  d.s2 = Math.max(d.s2, SIZE_FLOOR);
  return d;
}

// Squared distance from a point to a clockwise convex quad; 0 inside.
function quadDistance2(x, y, quad) {
  let inside = true, best = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = quad[i], b = quad[(i + 1) % 4], ex = b.x - a.x, ey = b.y - a.y;
    const px = x - a.x, py = y - a.y;
    if (ex * py - ey * px < 0) inside = false;
    const t = Math.min(Math.max((px * ex + py * ey) / (ex * ex + ey * ey), 0), 1);
    best = Math.min(best, (px - t * ex) ** 2 + (py - t * ey) ** 2);
  }
  return inside ? 0 : best;
}

/**
 * z² of reference t against observation o, dt seconds apart, or Infinity when a gate fails:
 * a size ratio above 2 between quads or between segments, segment axes more than 20 degrees
 * apart, a centre distance above 1.5 sizes, or z² above 9.
 */
export function referenceCost(t, o, dt) {
  const segments = t.kind === 'segment' && o.kind === 'segment';
  if ((segments || (t.kind === 'quad' && o.kind === 'quad')) &&
      Math.max(t.s2, o.s2) > 4 * Math.min(t.s2, o.s2)) return Infinity;
  if (segments) {
    const dot = t.ax * o.ax + t.ay * o.ay;
    if (dot * dot < COS2_20 * t.l2 * o.l2) return Infinity;
  }
  const dx = o.cx - t.cx, dy = o.cy - t.cy, dc2 = dx * dx + dy * dy, s2 = Math.max(t.s2, o.s2);
  if (dc2 > 2.25 * (segments ? Math.max(t.l2, o.l2) : s2)) return Infinity;
  const sigma = 0.15 + Math.min(Math.max(dt, 0), 1), sigma2 = sigma * sigma;
  let z2;
  if (segments) {
    const m2 = t.kappa * Math.max(t.l2, o.l2), h2 = t.kappa * t.kappa * Math.max(t.l2, o.l2);
    const along2 = (dx * t.ax + dy * t.ay) ** 2 / t.l2, across2 = Math.max(dc2 - along2, 0);
    z2 = along2 / (m2 * sigma2) + across2 / (m2 * sigma2 + h2 / 4);
  } else if (t.kind === 'quad' && o.kind === 'partial') {
    z2 = quadDistance2(o.cx, o.cy, t.p) / (t.s2 * sigma2);
  } else if (t.kind === 'partial' && o.kind === 'quad') {
    z2 = quadDistance2(t.cx, t.cy, o.p) / (s2 * sigma2);
  } else z2 = dc2 / (s2 * sigma2);
  return z2 <= COST_GATE ? z2 : Infinity;
}

// The located measurement a frame line reports for one true copy, or null.
function locatedOf(line, copy) {
  const truth = line.truth && line.truth.find(t => t.copy === copy);
  if (!truth || !truth.reported || truth.reported[1] === null) return null;
  const detection = line.report.detections[truth.reported[0]];
  const geometry = detection.occurrences[truth.reported[1]].geometry;
  if (!['quad', 'segment', 'partial'].includes(geometry.kind)) return null;
  return { kind: geometry.kind, points: geometry.points, symbology: detection.symbology };
}

/**
 * The twin limit at the generated geometry: every twin's first absent frame (one copy measured in
 * the previous frame and not in this one, beside one copy measured in both) with its predicted
 * extra = z²(hidden, o) - z²(visible, o). A split is predicted when extra < MARGIN.
 */
export function predictLimitSplits(lines) {
  const { width, height } = lines[0], scale = Math.max(width, height), found = [];
  let previous = null;
  for (const line of lines) {
    if (line.kind !== 'frame' || !line.truth) continue;
    if (previous !== null && line.sequence <= previous.sequence) continue;
    if (previous !== null) {
      const dt = (line.observedAt - previous.observedAt) / 1000;
      for (const raw of new Set(line.truth.map(t => t.raw))) {
        const copies = line.truth.filter(t => t.raw === raw).map(t => t.copy);
        const before = copies.filter(c => locatedOf(previous, c));
        const seen = copies.filter(c => locatedOf(line, c));
        const hidden = before.filter(c => !seen.includes(c));
        if (hidden.length !== 1 || seen.length !== 1 || !before.includes(seen[0])) continue;
        const desc = m => describeGeometry(m.kind, m.points, scale, m.symbology);
        const o = desc(locatedOf(line, seen[0]));
        const zHidden = referenceCost(desc(locatedOf(previous, hidden[0])), o, dt);
        const zSeen = referenceCost(desc(locatedOf(previous, seen[0])), o, dt);
        const extra = zHidden === Infinity || zSeen === Infinity ? Infinity
          : Math.min(Math.abs(zHidden - zSeen), LEAVE_SEEN + START - Math.min(zHidden, zSeen));
        found.push({ sequence: line.sequence, raw, copy: seen[0], hidden: hidden[0], extra,
          split: extra < MARGIN });
      }
    }
    previous = line;
  }
  return found;
}

// ------------------------------------------------------------------------ scenes

const qr = (copy, code, cx, cy, extra = {}) =>
  ({ copy, code, kind: 'quad', points: square(cx, cy), ...extra });
const tick = k => k * FRAME_MS;

const SCENE_BUILDERS = {
  // Static QR (jitter).
  R1(b) {
    const A = makeCode('qr_code', 'R1-STATIC');
    for (let k = 0; k < 100; k++) b.frame({ at: tick(k), copies: [qr('A', A, 640, 360)] });
  },
  // 0.5 s at rest, then a 3 s pan at 300 px/s (lag).
  R2(b) {
    const A = makeCode('qr_code', 'R2-PAN');
    for (let k = 0; k < 35; k++) {
      b.frame({ at: tick(k), copies: [qr('A', A, 190 + 30 * Math.max(0, k - 4), 360)] });
    }
  },
  // A 0.3-size step every 2 s (settling; below the 0.5-size jump restart).
  R3(b) {
    const A = makeCode('qr_code', 'R3-STEP');
    const steps = [[20, 36, 0], [40, 0, 36], [60, -36, 0], [80, 0, -36]];
    for (let k = 0; k < 100; k++) {
      let x = 640, y = 360;
      for (const [from, dx, dy] of steps) {
        if (k >= from) {
          x += dx;
          y += dy;
        }
      }
      b.frame({ at: tick(k), copies: [qr('A', A, x, y)] });
    }
  },
  // In-plane rotation at 90 degrees/s: the origin stays at index 0, no reoriented restart.
  R4(b) {
    const A = makeCode('qr_code', 'R4-ROTATE');
    for (let k = 0; k < 80; k++) {
      b.frame({ at: tick(k), copies: [{ copy: 'A', code: A, kind: 'quad',
        points: square(640, 360, SIDE, (Math.PI / 2) * (k / 10)) }] });
    }
  },
  // Keystone tilt of +-30 degrees at 0.5 Hz (shape, convexity).
  R5(b) {
    const A = makeCode('qr_code', 'R5-KEYSTONE');
    for (let k = 0; k < 60; k++) {
      const tilt = (Math.PI / 6) * Math.sin(Math.PI * (k / 10));
      b.frame({ at: tick(k), copies: [{ copy: 'A', code: A, kind: 'quad',
        points: keystone(640, 360, SIDE, tilt) }] });
    }
  },
  // Two equal copies 1.2 sizes apart. B crosses behind A (both moving at 0.6 sizes/s), rests,
  // then passes behind the static A at 0.4 sizes/s; it is hidden while A covers a fifth of it.
  R6(b) {
    const C = makeCode('qr_code', 'R6-TWIN');
    for (let k = 0; k < 110; k++) {
      let a = 500, x = 644;
      if (k >= 10 && k < 30) {
        a = 500 + (72 * (k - 9)) / 10;
        x = 644 - (72 * (k - 9)) / 10;
      } else if (k >= 30) {
        a = 644;
        x = k < 40 ? 500 : 500 + (48 * Math.min(k - 39, 60)) / 10;
      }
      b.frame({ at: tick(k), copies: [qr('A', C, a, 360),
        qr('B', C, x, 360, { visible: Math.abs(x - a) >= 0.8 * SIDE })] });
    }
  },
  // Intervals of 30-400 ms, latency of 50-900 ms, a few content_only decodes, re-delivered old
  // sequences and timer lines.
  R7(b) {
    const drift = makeCode('qr_code', 'R7-DRIFT'), fixed = makeCode('qr_code', 'R7-STATIC');
    const { rnd } = b, sent = [];
    let t = 0, clock = 0;
    while (t < 15000) {
      const latency = rnd.next() < 0.05 ? rnd.uniform(1250, 1500) : rnd.uniform(50, 900);
      clock = Math.max(clock, t + latency);
      sent.push(b.frame({ at: t, now: clock,
        copies: [qr('A', drift, 300 + (36 * t) / 1000, 250), qr('B', fixed, 900, 480)] }));
      if (sent.length > 3 && rnd.next() < 0.05) {
        clock += 1;
        b.redeliver(sent[sent.length - 2 - rnd.int(2)], clock);
      }
      const interval = rnd.uniform(30, 400);
      if (interval > 250) {
        clock += interval / 2;
        b.time(clock, rnd.next() < 0.3 ? 'peek' : 'advance');
      }
      t += interval;
    }
  },
  // 20% of occurrences missing, 10% budget-exhausted, 5% saturated, every sixth frame legacy.
  R8(b) {
    const A = makeCode('qr_code', 'R8-A'), B = makeCode('qr_code', 'R8-B');
    const T = makeCode('qr_code', 'R8-TWIN'), { rnd } = b;
    for (let k = 0; k < 200; k++) {
      const legacy = k % 6 === 5;
      const copies = [qr('A', A, 300 + (18 * k) / 10, 200), qr('B', B, 1000, 200),
        qr('T1', T, 400, 500), qr('T2', T, 580, 500)];
      for (const c of copies) if (!legacy && rnd.next() < 0.2) c.reported = false;
      const budgetExhausted = !legacy && rnd.next() < 0.1;
      let saturation = COMPLETE;
      if (!legacy && rnd.next() < 0.05) {
        saturation = { ...COMPLETE, [['reads', 'detections', 'occurrences'][rnd.int(3)]]: true };
      }
      b.frame({ at: tick(k), copies, legacy, budgetExhausted, saturation });
    }
  },
  // A 2 s pan at 300 px/s, an abrupt stop, then 2 s static (settling after a stop).
  R9(b) {
    const A = makeCode('qr_code', 'R9-STOP');
    for (let k = 0; k < 45; k++) {
      b.frame({ at: tick(k), copies: [qr('A', A, 190 + 30 * Math.min(Math.max(0, k - 4), 20),
        360)] });
    }
  },
  // A QR and a Code 128 moving together: distinct contents, segment geometry.
  R10(b) {
    const Q = makeCode('qr_code', 'R10-QR'), S = makeCode('code128', 'STOCK-4827');
    for (let k = 0; k < 120; k++) {
      const s = k / 10, dx = 200 * Math.sin((2 * Math.PI * s) / 6);
      const dy = 80 * Math.sin((2 * Math.PI * s) / 4);
      b.frame({ at: tick(k), copies: [qr('Q', Q, 640 + dx, 250 + dy),
        { copy: 'S', code: S, kind: 'segment', points: segment(640 + dx, 470 + dy, 300) }] });
    }
  },
  // EAN-13 with a five-digit add-on and GS1 DataBar, both partial, both moving.
  R11(b) {
    const E = makeCode('ean13', '9506000134352'), D = makeCode('data_bar', '0109506000134352');
    for (let k = 0; k < 80; k++) {
      const s = k / 10;
      b.frame({ at: tick(k), copies: [
        { copy: 'E', code: E, kind: 'partial',
          points: rowPoints(200 + 60 * s, 220, [0, 230, 252.5, 370]) },
        { copy: 'D', code: D, kind: 'partial', points: rowPoints(860 - 50 * s,
          480 + 40 * Math.sin((2 * Math.PI * s) / 4), [42.5, 80, 160, 197.5]) }] });
    }
  },
  // Codabar and MaxiCode (unavailable geometry) beside a located QR; the Codabar is not read
  // for 0.5 s.
  R12(b) {
    const Q = makeCode('qr_code', 'R12-QR'), C = makeCode('codabar', 'A40156B');
    const M = makeCode('maxi_code', 'R12-MAXI');
    for (let k = 0; k < 60; k++) {
      b.frame({ at: tick(k), copies: [qr('Q', Q, 400, 360),
        { copy: 'C', code: C, kind: 'unavailable', points: [], reported: k < 20 || k >= 25 },
        { copy: 'M', code: M, kind: 'unavailable', points: [] }] });
    }
  },
  // Four distinct QR codes moving independently, in a shuffled wire order.
  R13(b) {
    const codes = ['A', 'B', 'C', 'D'].map(n => makeCode('qr_code', `R13-${n}`));
    const w = 2 * Math.PI;
    for (let k = 0; k < 100; k++) {
      const s = k / 10;
      b.frame({ at: tick(k), copies: b.rnd.shuffle([
        qr('A', codes[0], 300 + 60 * Math.cos((w * s) / 6), 200 + 60 * Math.sin((w * s) / 6)),
        qr('B', codes[1], 980, 200),
        qr('C', codes[2], 300 + 100 * Math.sin((w * s) / 8), 520),
        qr('D', codes[3], 980 + 150 * Math.sin((w * s) / 3), 520 + 80 * Math.sin((w * s) / 3)),
      ]) });
    }
  },
  // One QR alternating between an rqrr quad and rxing finder centres (partial).
  R14(b) {
    const Q = makeCode('qr_code', 'R14-QR');
    let quad = false, left = 0;
    for (let k = 0; k < 80; k++) {
      if (left === 0) {
        quad = !quad;
        left = 1 + b.rnd.int(3);
      }
      left--;
      const cx = 400 + (36 * k) / 10;
      b.frame({ at: tick(k), copies: [quad
        ? { copy: 'Q', code: Q, kind: 'quad', points: square(cx, 360), reader: 'rqrr' }
        : { copy: 'Q', code: Q, kind: 'partial', points: finderCentres(cx, 360),
          reader: 'rxing' }] });
    }
  },
  // Two equal 400 px Code 128 labels stacked g lengths apart (one content per g): 2 s static,
  // 2 s moving in parallel by 20 px along and across per frame, then the lower one hidden.
  R15(b) {
    const length = 400, swing = [1, 2, 3, 4, 5, 4, 3, 2, 1, 0];
    let k0 = 0;
    for (const g of [0.3, 0.5, 0.7, 1.0]) {
      const tag = `G${Math.round(g * 100)}`, gap = g * length;
      const C = makeCode('code128', `R15-${tag}`);
      for (let k = 0; k < 60; k++) {
        const d = k >= 20 && k < 40 ? 20 * swing[(k - 20) % 10] : 0;
        b.frame({ at: tick(k0 + k), copies: [
          { copy: `A-${tag}`, code: C, kind: 'segment',
            points: segment(640 + d, 360 - gap / 2 + d, length) },
          { copy: `B-${tag}`, code: C, kind: 'segment',
            points: segment(640 + d, 360 + gap / 2 + d, length), visible: k < 40 }] });
      }
      k0 += 60;
    }
  },
  // Twin QR copies 1.2 sizes apart. Frames 516 ms apart (decode 400 ms): B hides beside a
  // static A, A drifts away at 0.5, 1 or 2 sizes/s, B returns, A drifts back. Then 10 Hz with
  // 30% budget-exhausted reports: A drifts toward its hidden twin and back.
  R16(b) {
    const slow = makeCode('qr_code', 'R16-SLOW'), fast = makeCode('qr_code', 'R16-FAST');
    const twin = (code, a, hidden) => [qr(`A-${code.label}`, code, a, 360),
      qr(`B-${code.label}`, code, 644, 360, { visible: !hidden })];
    let t = 0;
    for (const speed of [0.5, 1, 2]) {
      const step = speed * 0.516 * SIDE, n = speed === 0.5 ? 3 : speed === 1 ? 2 : 1;
      const path = [[500, false], [500, false], [500, false], [500, true]];
      for (let i = 1; i <= n; i++) path.push([500 - step * i, true]);
      path.push([500 - step * n, false], [500 - step * n, false]);
      for (let i = n - 1; i >= 0; i--) path.push([500 - step * i, false]);
      for (const [a, hidden] of path) {
        b.frame({ at: t, latency: 400, copies: twin(slow, a, hidden) });
        t += 516;
      }
    }
    t += 3000;
    for (const speed of [0.5, 1, 2, null]) {
      const step = (speed ?? 0) * 0.1 * SIDE, path = [];
      for (let i = 0; i < 10; i++) path.push([500, false]);
      for (let i = 1; speed !== null && i <= 15; i++) {
        path.push([500 + step * (Math.min(i, 3) - Math.max(0, Math.min(i - 3, 3))), true]);
      }
      for (const [a, hidden] of path) {
        b.frame({ at: t, copies: twin(fast, a, hidden), budgetExhausted: b.rnd.next() < 0.3 });
        t += FRAME_MS;
      }
    }
  },
};

/**
 * Limit splits of the closed forms, which assume centre scan rows: one per hide
 * at g = 0.3 in R15, one per twin disappearance at 516 ms in R16.
 */
export const NOMINAL = Object.freeze({ R15: { limitSplits: 1 }, R16: { limitSplits: 3 } });

/** The lines of one scene: header, then frame and time lines. */
export function generateScene(scene,
  { seed = DEFAULT_SEED, noise = NOISE, rows = 'uniform' } = {}) {
  const index = SCENES.indexOf(scene);
  if (index < 0) throw new RangeError(`Unknown scene ${scene}; expected one of R1-R16.`);
  const b = createBuilder({ scene, seed: (Math.imul(seed, 7919) + index + 1) >>> 0, noise,
    rows });
  SCENE_BUILDERS[scene](b);
  b.header.generator.predicted = {
    limitSplits: predictLimitSplits(b.lines).filter(p => p.split) };
  b.header.generator.nominal = NOMINAL[scene] ?? { limitSplits: 0 };
  return b.lines;
}

export function generateAll(options = {}) {
  return new Map(SCENES.map(scene => [scene, generateScene(scene, options)]));
}

/** The same lines with detections and occurrences in a seeded wire order; truth follows them. */
export function shuffleWireOrder(lines, seed) {
  const rnd = createRandom(seed);
  return lines.map(line => {
    if (line.kind !== 'frame') return line;
    const order = rnd.shuffle(line.report.detections.map((_, i) => i)), moved = new Map();
    const detections = order.map((i, position) => {
      const detection = line.report.detections[i];
      if (!Array.isArray(detection.occurrences)) {
        moved.set(i, { position, occurrences: null });
        return detection;
      }
      const occurrences = rnd.shuffle(detection.occurrences.map((_, j) => j));
      moved.set(i, { position, occurrences });
      return { ...detection, occurrences: occurrences.map(j => detection.occurrences[j]) };
    });
    const truth = line.truth && line.truth.map(t => {
      if (!t.reported) return t;
      const [i, j] = t.reported, m = moved.get(i);
      return { ...t, reported: [m.position, j === null ? null : m.occurrences.indexOf(j)] };
    });
    return { ...line, report: { ...line.report, detections }, truth };
  });
}

export const toJsonl = lines => `${lines.map(line => JSON.stringify(line)).join('\n')}\n`;
export const parseJsonl = text => text.split('\n').filter(line => line.trim() !== '')
  .map(line => JSON.parse(line));

async function main(argv) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const flag = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const seed = flag('--seed') === undefined ? DEFAULT_SEED : Number(flag('--seed'));
  const noise = flag('--noise') === undefined ? NOISE : Number(flag('--noise'));
  const rows = flag('--rows') ?? 'uniform';
  const scenes = flag('--scene') === undefined ? SCENES : [flag('--scene')];
  const out = flag('--out');
  if (out === undefined && scenes.length !== 1) {
    throw new TypeError('Pass --scene for stdout, or --out <dir> for every scene.');
  }
  for (const scene of scenes) {
    const text = toJsonl(generateScene(scene, { seed, noise, rows }));
    if (out === undefined) process.stdout.write(text);
    else {
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, `${scene}.jsonl`), text);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    process.exitCode = 1;
    console.error(error);
  });
}
