// Development-only capture recorder: records each tracker input as a JSONL v1 frame
// line before the tracker sees it. raw and text become SHA-256 digests salted once per session;
// no pixels, payloads or ground truth are stored. Nothing runs at import. Never shipped.

export const RECORDER_VERSION = 1;

// ------------------------------------------------------------------- SHA-256 (sync)

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const ror = (x, n) => (x >>> n) | (x << (32 - n));

/**
 * Hex SHA-256 of the UTF-8 bytes of text, synchronous so that a frame is recorded before the
 * tracker returns (crypto.subtle is asynchronous).
 */
export function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text), length = bytes.length;
  const size = ((length + 9 + 63) >> 6) << 4, words = new Uint32Array(size);
  for (let i = 0; i < length; i++) words[i >> 2] |= bytes[i] << (24 - (i & 3) * 8);
  words[length >> 2] |= 0x80 << (24 - (length & 3) * 8);
  words[size - 2] = Math.floor(length / 0x20000000);
  words[size - 1] = (length * 8) >>> 0;
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f,
    0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let block = 0; block < size; block += 16) {
    for (let t = 0; t < 16; t++) w[t] = words[block + t];
    for (let t = 16; t < 64; t++) {
      const x = w[t - 15], y = w[t - 2];
      w[t] = w[t - 16] + (ror(x, 7) ^ ror(x, 18) ^ (x >>> 3)) + w[t - 7] +
        (ror(y, 17) ^ ror(y, 19) ^ (y >>> 10));
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
    for (let t = 0; t < 64; t++) {
      const t1 = (k + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[t] +
        w[t]) >>> 0;
      const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      k = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += k;
  }
  return Array.from(h, x => x.toString(16).padStart(8, '0')).join('');
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------- projection

const COMPLETE = { reads: false, detections: false, occurrences: false };
const pointOf = p => (p !== null && typeof p === 'object' ? { x: p.x, y: p.y } : p);

// The geometry the tracker validates; an occurrence that is not an object stays as it is.
function occurrenceOf(occurrence) {
  if (occurrence === null || typeof occurrence !== 'object') return occurrence;
  const g = occurrence.geometry;
  if (g === null || typeof g !== 'object') return { geometry: g };
  return { geometry: { kind: g.kind, reader: g.reader === undefined ? null : g.reader,
    points: Array.isArray(g.points) ? g.points.map(pointOf) : g.points } };
}

/**
 * What the tracker reads of a detection: symbology, the content identity (raw and text salted,
 * charset, ECI designators and offsets, FNC1) and occurrence geometry. payload, corners, meta,
 * engines, score and hints are dropped.
 */
export function projectDetection(detection, hash) {
  const c = detection.content, content = {
    raw: typeof c.raw === 'string' ? hash(c.raw) : null,
    text: typeof c.text === 'string' ? hash(c.text) : null,
    charset: c.charset === undefined ? null : c.charset,
  };
  if (Array.isArray(c.eci)) {
    content.eci = c.eci.map(entry => ({ designator: entry.designator, start: entry.start }));
  }
  if (c.fnc1 !== undefined) content.fnc1 = JSON.parse(JSON.stringify(c.fnc1));
  const out = { symbology: detection.symbology, content };
  if (Array.isArray(detection.occurrences)) {
    out.occurrences = detection.occurrences.map(occurrenceOf);
  }
  return out;
}

/**
 * The report part of a frame line. An array input with { complete } becomes a report whose
 * trace proves (or does not prove) absence the same way.
 */
export function projectInput(input, options, hash) {
  const detections = (Array.isArray(input) ? input : input.detections)
    .map(d => projectDetection(d, hash));
  if (Array.isArray(input)) {
    const complete = options !== undefined && options !== null && options.complete === true;
    return { detections, trace: { budget_exhausted: !complete, saturation: { ...COMPLETE } } };
  }
  const trace = input.trace !== null && typeof input.trace === 'object' ? {
    budget_exhausted: input.trace.budget_exhausted,
    saturation: input.trace.saturation === undefined ? undefined
      : JSON.parse(JSON.stringify(input.trace.saturation)),
  } : null;
  return { detections, trace };
}

// ------------------------------------------------------------------------ recorder

const SPANS = ['static', 'motion'];

/**
 * One capture session. track() creates a tracker whose update, advance and snapshot calls are
 * recorded; timer-driven 'time' snapshots (onChange) become advance lines. mark() sets the
 * operator span ('static', 'motion' or null) carried by the following frame lines.
 */
export function createRecorder({ scene = 'capture', device = null, salt = randomSalt(),
  clock = () => globalThis.performance.now() } = {}) {
  const hash = value => sha256Hex(`${salt}:${value}`), lines = [];
  const unrecorded = { reset: 0, clear: 0, forget: 0 };
  let span = null, first = null;

  function recordFrame(input, frame, options) {
    const line = { kind: 'frame', epoch: frame.epoch === undefined ? null : frame.epoch,
      sequence: frame.sequence === undefined ? null : frame.sequence,
      observedAt: frame.observedAt,
      now: options && options.now !== undefined ? options.now : clock(),
      width: frame.width, height: frame.height, report: projectInput(input, options, hash) };
    if (!Array.isArray(input) && options && typeof options.complete === 'boolean') {
      line.options = { complete: options.complete };
    }
    if (span !== null) line.span = span;
    if (first === null) first = { width: frame.width, height: frame.height };
    lines.push(line);
    return line;
  }

  function recordTime(now, op) {
    lines.push({ kind: 'time', now, op });
  }

  function track(createDetectionTracker, options = {}) {
    let calling = false;
    const onChange = options.onChange;
    // The tracker arms its own timer only with onChange; its 'time' snapshots are advance lines
    // (advance() calls through this wrapper are recorded below).
    const tracker = createDetectionTracker(onChange === undefined ? options
      : { ...options, onChange(snapshot) {
        if (!calling && snapshot.status === 'time') recordTime(snapshot.now, 'advance');
        onChange(snapshot);
      } });
    const call = (fn, record) => {
      calling = true;
      try {
        const snapshot = fn();
        record(snapshot);
        return snapshot;
      } finally {
        calling = false;
      }
    };
    return {
      update(input, frame, updateOptions) {
        recordFrame(input, frame, updateOptions);
        return call(() => tracker.update(input, frame, updateOptions), () => {});
      },
      advance: now => call(() => tracker.advance(now), s => recordTime(s.now, 'advance')),
      snapshot: now => call(() => tracker.snapshot(now), s => recordTime(s.now, 'peek')),
      nextDeadline: () => tracker.nextDeadline(),
      reset(resetOptions) {
        unrecorded.reset++;
        return tracker.reset(resetOptions);
      },
      clear() {
        unrecorded.clear++;
        return tracker.clear();
      },
      forget(id) {
        unrecorded.forget++;
        return tracker.forget(id);
      },
      destroy: () => tracker.destroy(),
    };
  }

  function header() {
    return { v: 1, kind: 'header', scene, source: 'capture',
      width: first ? first.width : null, height: first ? first.height : null, device,
      recorder: { version: RECORDER_VERSION, salted: 'sha256', unrecorded: { ...unrecorded } } };
  }
  const toJsonl = () => `${[header(), ...lines].map(line => JSON.stringify(line)).join('\n')}\n`;

  return {
    hash,
    track,
    recordFrame,
    recordTime,
    get span() {
      return span;
    },
    mark(next) {
      if (next !== null && !SPANS.includes(next)) {
        throw new RangeError('A span is \'static\', \'motion\' or null.');
      }
      span = next;
    },
    lines: () => [header(), ...lines],
    toJsonl,
    /** Browser only: saves the session as a .jsonl file. */
    download(filename = `${scene}.jsonl`) {
      if (typeof document === 'undefined') throw new TypeError('download() needs a document.');
      const url = URL.createObjectURL(new Blob([toJsonl()], { type: 'application/x-ndjson' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  };
}
