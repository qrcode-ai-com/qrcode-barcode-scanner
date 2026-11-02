// The installed-package truth set, fixtures/consumer-truth.json — the twin of
// consumer_truth.py: the same JSON, the same rules. Stage the inputs outside
// the checkout, then judge each report an installed artifact returns: exact
// contents as a multiset (order ignored), the primary detection, every
// occurrence's geometry, the score/null association and the unbudgeted,
// unsaturated trace. Node built-ins only.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TRUTH = join(ROOT, "fixtures/consumer-truth.json");
export const FIXTURES = join(ROOT, "fixtures");
const SCHEMA = "qrscan-consumer-truth/1";
const QR_FAMILY = new Set(["qr_code", "micro_qr_code", "rectangular_micro_qr_code"]);
// points per geometry kind (spec/01-report.md § Occurrences)
const POINTS = { quad: [4, 4], segment: [2, 2], partial: [1, 8], unavailable: [0, 0] };

export function load(path = TRUTH) {
  const truth = JSON.parse(readFileSync(path, "utf8"));
  if (truth.schema !== SCHEMA) throw new Error(`truth schema ${truth.schema}`);
  const ids = truth.cases.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate case id");
  return truth;
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** An all-white 8-bit greyscale PNG: a valid image with no symbol. */
export function whitePng(width, height) {
  const chunk = (kind, data) => {
    const body = Buffer.concat([Buffer.from(kind, "latin1"), data]);
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc32(body));
    return Buffer.concat([head, body, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 0, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width, 0xff)]);
  const rows = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** The input bytes of a case: its fixture (hash checked) or its synthetic image. */
export function caseBytes(testCase, fixtures = FIXTURES) {
  if (testCase.file) {
    const data = readFileSync(join(fixtures, testCase.file));
    const digest = sha256(data);
    if (digest !== testCase.sha256) throw new Error(`${testCase.id}: ${testCase.file} is ${digest}, truth says ${testCase.sha256}`);
    return data;
  }
  const { kind, width, height, utf8 } = testCase.synthetic;
  if (kind === "white_png") return whitePng(width, height);
  if (kind === "bytes") return Buffer.from(utf8, "utf8");
  throw new Error(`${testCase.id}: unknown synthetic input ${kind}`);
}

/** Write every case's input under DEST (outside the checkout): [{ testCase, path }]. */
export function stage(truth, dest, fixtures = FIXTURES) {
  return truth.cases.map((testCase) => {
    const path = join(dest, testCase.file ?? `synthetic/${testCase.id}.bin`);
    mkdirSync(dirname(path), { recursive: true });
    if (testCase.file) {
      copyFileSync(join(fixtures, testCase.file), path);
      caseBytes(testCase, dest);
    } else {
      writeFileSync(path, caseBytes(testCase, fixtures));
    }
    return { testCase, path };
  });
}

/** An expected content in the report's wire shape (spec/01 § Content). */
export function wireContent(expected) {
  const content = { text: expected.text, raw: Buffer.from(expected.raw_hex, "hex").toString("base64"),
    charset: expected.charset };
  for (const key of ["eci", "fnc1"]) if (key in expected) content[key] = expected[key];
  return content;
}

/** Key-order-free JSON: equal objects, equal strings. */
const canon = (value) => JSON.stringify(value, (_, v) => (v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));

const near = (points, want, tolerance) => points.length === want.length
  && points.every((p, i) => Math.hypot(p.x - want[i][0], p.y - want[i][1]) <= tolerance);
const within = (points, [x, y, w, h], tolerance) => points.every((p) => x - tolerance <= p.x && p.x <= x + w + tolerance
  && y - tolerance <= p.y && p.y <= y + h + tolerance);
const fits = ({ geometry }, want, tolerance) => geometry.kind === want.kind
  && (!want.near || near(geometry.points, want.near, tolerance))
  && (!want.within || within(geometry.points, want.within, tolerance));

/** A one-to-one assignment of occurrences to expectations exists (occurrence
 * order is the scanner's earliest read, not a contract). */
function matchOccurrences(occurrences, wanted, tolerance) {
  if (occurrences.length !== wanted.length) return false;
  const assign = (index, free) => index === occurrences.length
    || [...free].some((j) => fits(occurrences[index], wanted[j], tolerance)
      && assign(index + 1, new Set([...free].filter((k) => k !== j))));
  return assign(0, new Set(wanted.keys()));
}

/** Structural rules every occurrence obeys, whatever the reader. */
function geometryProblems(testCase, detection, [width, height]) {
  const problems = [];
  (detection.occurrences ?? []).forEach(({ geometry }, index) => {
    const { kind, points, reader = null } = geometry;
    const where = `${testCase.id}: ${detection.symbology} occurrence ${index}`;
    if (!(kind in POINTS)) {
      problems.push(`${where}: unknown kind ${kind}`);
      return;
    }
    const [low, high] = POINTS[kind];
    if (points.length < low || points.length > high) problems.push(`${where}: ${kind} with ${points.length} points`);
    if ((reader === null) !== (kind === "unavailable")) problems.push(`${where}: reader ${reader} for ${kind}`);
    if (!points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) problems.push(`${where}: non-finite point`);
    else if (!within(points, [0, 0, width, height], 2)) problems.push(`${where}: a point outside the ${width}x${height} image`);
  });
  return problems;
}

/** Every way REPORT departs from CASE's truth (empty: it conforms). */
export function judge(testCase, report, versions) {
  const problems = [];
  const name = testCase.id;
  if (canon(report.versions) !== canon(versions)) problems.push(`${name}: versions ${canon(report.versions)} != ${canon(versions)}`);
  if (report.trace.budget_exhausted !== false) problems.push(`${name}: the unbudgeted scan was cut`);
  if (report.saturation && Object.values(report.saturation).some(Boolean)) problems.push(`${name}: saturated ${canon(report.saturation)}`);
  const { detections } = report;
  const expected = testCase.contents;
  const tolerance = testCase.tolerance_px ?? 2;
  const found = expected.map((want) => {
    const matches = detections.flatMap((d, i) => (d.symbology === want.symbology && ("raw_hex" in want
      ? canon(d.content) === canon(wireContent(want))
      // a text truth: no reader independent of the scanner states the bytes
      : d.content.text === want.text) ? [i] : []));
    if (matches.length !== 1) {
      problems.push(`${name}: ${want.symbology} ${JSON.stringify(want.text)} found ${matches.length} times`);
      return null;
    }
    const occurrences = detections[matches[0]].occurrences ?? [];
    if (!matchOccurrences(occurrences, want.occurrences, tolerance)) {
      const seen = occurrences.map(({ geometry }) => [geometry.kind, geometry.points.map((p) => [p.x, p.y])]);
      problems.push(`${name}: ${want.symbology} occurrences ${JSON.stringify(seen)} != ${JSON.stringify(want.occurrences)}`);
    }
    return matches[0];
  });
  const matched = new Set(found.filter((i) => i !== null));
  if (detections.length !== matched.size) {
    const extra = detections.filter((_, i) => !matched.has(i)).map((d) => [d.symbology, d.content.text]);
    problems.push(`${name}: ${detections.length - matched.size} unexpected detection(s) ${JSON.stringify(extra)}`);
  }
  const { primary } = testCase;
  if (detections.length && primary === "qr_family" && !QR_FAMILY.has(detections[0].symbology)) {
    problems.push(`${name}: primary ${detections[0].symbology} is not QR family`);
  } else if (Number.isInteger(primary) && found[primary] !== 0) {
    problems.push(`${name}: detections[0] is not ${expected[primary].symbology} ${JSON.stringify(expected[primary].text)}`);
  }
  const value = report.score === null ? null : report.score.value;
  if (testCase.score === null && report.score !== null) problems.push(`${name}: score ${value}, truth says null`);
  else if (testCase.score === "present" && report.score === null) problems.push(`${name}: score null, truth says present`);
  else if (Number.isInteger(testCase.score) && value !== testCase.score) problems.push(`${name}: score ${value} != ${testCase.score}`);
  for (const detection of detections) problems.push(...geometryProblems(testCase, detection, testCase.size ?? [Infinity, Infinity]));
  return problems;
}

/** The order-free identity summary a receipt keeps: (symbology, content, occurrence kinds). */
export const identity = (report) => report.detections.map((d) => canon([d.symbology, d.content,
  (d.occurrences ?? []).map(({ geometry }) => geometry.kind).sort()])).sort();

/** One digest of {case id: identity} that every runtime's consumer computes alike. */
export const identitiesDigest = (identities) => sha256(Buffer.from(canon(identities), "utf8"));

/** A report built from CASE's truth alone: what a conforming scan returns. */
export function conformingReport(testCase, versions) {
  const points = (want) => want.near ? want.near.map(([x, y]) => ({ x, y }))
    : Array.from({ length: POINTS[want.kind][0] }, (_, i) => ({ x: (want.within ?? [0, 0])[0] + i,
      y: (want.within ?? [0, 0])[1] + 1 }));
  const detections = testCase.contents.map((want) => ({ symbology: want.symbology,
    content: "raw_hex" in want ? wireContent(want)
      : { text: want.text, raw: Buffer.from(want.text).toString("base64"), charset: want.charset },
    occurrences: want.occurrences.map((o) => ({ geometry: { kind: o.kind, points: points(o),
      reader: o.kind === "unavailable" ? null : "rxing" } })) }));
  if (Number.isInteger(testCase.primary)) detections.unshift(...detections.splice(testCase.primary, 1));
  const score = testCase.score === null ? null : { value: Number.isInteger(testCase.score) ? testCase.score : 50 };
  return { versions, detections, score, trace: { budget_exhausted: false } };
}

/** The judge accepts every conforming report and names each departure
 * (the same refusals as consumer_truth.py's self-test). */
export function selfTest(truth) {
  const versions = { scanner: "0.0.0", pipeline: 5, score_contract: 5 };
  const cases = Object.fromEntries(truth.cases.map((c) => [c.id, c]));
  for (const testCase of truth.cases) {
    if (testCase.error) continue;
    const problems = judge(testCase, conformingReport(testCase, versions), versions);
    if (problems.length) throw new Error(`${testCase.id}: ${problems}`);
  }
  const point = (r, d, o, dx) => { r.detections[d].occurrences[o].geometry.points[0].x += dx; };
  const refusals = {
    "a content lost": ["qr-twins-and-code128", (r) => r.detections.pop(), "found 0 times"],
    "an extra content": ["valid-empty", (r) => r.detections.push(conformingReport(cases.code128, versions).detections[0]),
      "unexpected detection"],
    "a content twice": ["code128", (r) => r.detections.push(structuredClone(r.detections[0])), "found 2 times"],
    "other bytes, same text": ["eci4-eci26-equal-text", (r) => { r.detections[0].content.raw = "og=="; }, "found 0 times"],
    "a declaration dropped": ["eci4-eci26-equal-text", (r) => { delete r.detections[1].content.eci; }, "found 0 times"],
    "FNC1 dropped": ["qr-gs1-fnc1", (r) => { delete r.detections[0].content.fnc1; }, "found 0 times"],
    "another symbology": ["ean13", (r) => { r.detections[0].symbology = "upc_a"; }, "found 0 times"],
    "the barcode leads": ["qr-and-code128", (r) => r.detections.reverse(), "detections[0] is not"],
    "two copies merged": ["qr-twins-and-code128", (r) => r.detections[0].occurrences.pop(), "occurrences"],
    "a corner 5 px off": ["eci4-eci26-equal-text", (r) => point(r, 0, 0, 5), "occurrences"],
    "a segment off its bars": ["qr-twins-and-code128", (r) => point(r, 1, 0, -100), "occurrences"],
    "a measured kind as unavailable": ["ean13", (r) => {
      r.detections[0].occurrences[0].geometry = { kind: "unavailable", points: [], reader: null }; }, "occurrences"],
    "a quad of three points": ["aztec", (r) => r.detections[0].occurrences[0].geometry.points.pop(), "quad with 3 points"],
    "a reader without points": ["telepen", (r) => { r.detections[0].occurrences[0].geometry.reader = "rxing"; },
      "reader rxing for unavailable"],
    "a point off the image": ["qr-v5q-control", (r) => point(r, 0, 0, -400), "outside"],
    "a null score": ["micro-qr", (r) => { r.score = null; }, "score null"],
    "a score on nothing": ["valid-empty", (r) => { r.score = { value: 0 }; }, "truth says null"],
    "another value": ["qr-v5q-control", (r) => { r.score = { value: 99 }; }, "score 99 != 100"],
    "a cut scan": ["aztec", (r) => { r.trace.budget_exhausted = true; }, "was cut"],
    "a saturated scan": ["aztec", (r) => { r.saturation = { reads: false, detections: false, occurrences: true }; },
      "saturated"],
    "other versions": ["aztec", (r) => { r.versions = { ...versions, pipeline: 4 }; }, "versions"],
  };
  for (const [refusal, [id, change, expected]] of Object.entries(refusals)) {
    const report = structuredClone(conformingReport(cases[id], versions));
    change(report);
    const problems = judge(cases[id], report, versions);
    if (!problems.some((p) => p.includes(expected))) throw new Error(`${refusal}: ${problems}`);
  }
  const family = { ...cases["qr-and-code128"], primary: "qr_family" };
  const report = conformingReport(cases["qr-and-code128"], versions);
  report.detections.reverse();
  if (!judge(family, report, versions).some((p) => p.includes("is not QR family"))) {
    throw new Error("a barcode as the QR-family primary");
  }
  return Object.keys(refusals).length + 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).join(" ") !== "--self-test") throw new Error("usage: consumer-truth.mjs --self-test");
  const truth = load();
  console.log(JSON.stringify({ self_test: "PASS", cases: truth.cases.length, refusals: selfTest(truth) }));
}
