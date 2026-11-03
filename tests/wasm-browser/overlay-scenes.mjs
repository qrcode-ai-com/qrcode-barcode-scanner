// The overlay witnesses' scenes and judgments, on the Node side of the packed-package runner.
// Every expected value comes from fixtures/consumer-truth.json, the fixture records it cites and
// the composition layout of each scene, never from a scan. The runner passes the truth helpers
// in; this module reads only the fixture record file it is given.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const PROFILES = ['fast', 'frame', 'full'];
// The video's CSS box in every scene: object-fit contain, no padding, no transform.
export const BOX = { width: 640, height: 480 };
const DEG = Math.PI / 180;

const contain = ({ width, height }) => {
  const s = Math.min(BOX.width / width, BOX.height / height);
  return { s, x: (BOX.width - width * s) / 2, y: (BOX.height - height * s) / 2 };
};
const toView = (fit, [x, y]) => ({ x: fit.x + x * fit.s, y: fit.y + y * fit.s });
const placed = (near, { x = 0, y = 0, scale = 1 }) => near.map(([px, py]) => [px * scale + x, py * scale + y]);
const affine = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const centre = points => points.reduce((sum, p) => ({ x: sum.x + p.x / points.length, y: sum.y + p.y / points.length }),
  { x: 0, y: 0 });

export function assertNear(points, expected, tolerance, label) {
  assert.equal(points?.length, expected.length, `${label}: vertex count`);
  points.forEach((point, index) => assert.ok(Math.hypot(point.x - expected[index].x, point.y - expected[index].y) <= tolerance,
    `${label}: vertex ${index} at ${JSON.stringify(point)}, expected ${JSON.stringify(expected[index])} within ${tolerance} px`));
}

function assertInside(points, [x, y, w, h], tolerance, label) {
  assert.ok(points && points.length > 0, `${label}: no points`);
  points.forEach((p, index) => assert.ok(p.x >= x - tolerance && p.x <= x + w + tolerance && p.y >= y - tolerance &&
    p.y <= y + h + tolerance, `${label}: point ${index} ${JSON.stringify(p)} outside [${x}, ${y}, ${w}, ${h}] ` +
    `by more than ${tolerance} px`));
}

// The judge's view of one profile: the frame profile publishes no score; full keeps the truth's
// score and first detection; fast keeps neither, which the truth states for full only.
function profileCase(testCase, profile, { primary = testCase.primary } = {}) {
  return { ...testCase, primary: profile === 'full' ? primary : null,
    score: profile === 'frame' ? null : profile === 'full' ? testCase.score : undefined };
}

// The fixture record of the standalone Code 128 row the mixed image was composed from.
function standaloneRow(recordsFile, file) {
  const row = readFileSync(recordsFile, 'utf8').split(/\r?\n/).find(line => line.startsWith(`| \`${file}\` |`));
  assert.ok(row, `${file} is recorded in the fixture records`);
  const cells = row.split('|').map(cell => cell.trim());
  const size = /\((\d+) × (\d+)\)/.exec(row);
  return { text: cells[3].replaceAll('`', ''), sha256: cells[5].replaceAll('`', ''),
    size: [Number(size[1]), Number(size[2])] };
}

// Exact symbol sets: the standalone STOCK-4827 row, the QR + Code 128 composite and
// the QR + small Data Matrix composite in both placements: as recorded, and with the two codes'
// sides swapped as the engine's own mixed-symbol test does (the QR's 444 px region moved to
// (1100, 40), the Data Matrix's 60 px region to (200, 240), on the same white 1600 x 600).
export function exactSetCases({ truth, bytesOf, recordsFile, fixtureBytes }) {
  const byId = id => truth.cases.find(testCase => testCase.id === id) ?? assert.fail(`no truth case ${id}`);
  const mixed = byId('qr-and-code128'), small = byId('qr-and-small-data-matrix');
  const code128 = mixed.contents.find(content => content.symbology === 'code128');
  const row = standaloneRow(recordsFile, 'code128-stock-4827.png');
  assert.equal(row.text, code128.text, 'the standalone row encodes the composite\'s Code 128 content');
  const standalone = { id: 'code128-stock-4827', file: 'symbology/code128-stock-4827.png', sha256: row.sha256,
    size: row.size, tolerance_px: mixed.tolerance_px, primary: 0, score: 'present',
    contents: [{ ...code128, occurrences: [{ kind: 'segment', within: [0, 0, ...row.size] }] }] };
  // A region is its code plus the quiet zone around it: origin from the record, code from truth.
  const region = (content, [ox, oy]) => {
    const [[x0, y0], , [x1, y1]] = content.occurrences[0].near;
    return [ox, oy, x1 - x0 + 2 * (x0 - ox), y1 - y0 + 2 * (y0 - oy)];
  };
  const [qr, matrix] = small.contents;
  const qrRegion = region(qr, [40, 40]), matrixRegion = region(matrix, [1300, 240]);
  const moved = (content, from, to) => ({ ...content, occurrences: content.occurrences.map(occurrence => ({
    ...occurrence, near: placed(occurrence.near, { x: to[0] - from[0], y: to[1] - from[1] }) })) });
  const swapped = { ...small, id: `${small.id} (sides swapped)`, primary: null,
    contents: [moved(qr, qrRegion, [1100, 40]), moved(matrix, matrixRegion, [200, 240])] };
  const smallBytes = bytesOf(small);
  return [
    { label: 'STOCK-4827 alone', testCase: standalone, bytes: fixtureBytes(standalone) },
    { label: 'QR and Code 128', testCase: mixed, bytes: bytesOf(mixed) },
    { label: 'QR and small Data Matrix as recorded', testCase: small, bytes: smallBytes },
    { label: 'QR and small Data Matrix with sides swapped', testCase: swapped,
      compose: { width: small.size[0], height: small.size[1], images: { source: smallBytes }, layers: [
        { image: 'source', crop: qrRegion, x: 1100, y: 40 },
        { image: 'source', crop: matrixRegion, x: 200, y: 240 }] } },
  ];
}

export function judgeExactSet({ testCase }, report, profile, { judge, versions, label }) {
  assert.deepEqual(judge(profileCase(testCase, profile), report, versions), [], label);
  return report.detections.map(detection => [detection.symbology, detection.content.text]).sort();
}

// ------------------------------------------------------------------- what a record shows

const targetsOf = record => record.overlay.inspection.targets;
const trackOf = (record, id) => record.snapshot.tracks.find(track => track.id === id);
const tracksWith = (record, text) => record.snapshot.tracks.filter(track => track.text === text);
const domTarget = (record, id) => record.dom.targets.find(target => target.id === id) ?? null;
const holes = clip => (clip === null ? 0 : (clip.match(/M/g) ?? []).length - 1);

// A quad drawn as an outline: its bracket is quadOutline of its points, the document draws that
// bracket and nothing else as the outline, its points are the projection of the track's
// published geometry, and they lie within tolerance of the projected truth.
function assertOutline(record, id, truthView, tolerance, label) {
  const target = targetsOf(record).find(t => t.id === id);
  assert.ok(target, `${label}: a target for ${id}`);
  assert.deepEqual([target.kind, target.drawn], ['quad', 'outline'], `${label}: drawn as an outline`);
  const expected = record.overlay.expected.find(e => e.id === id);
  assert.equal(target.bracket, expected.bracket, `${label}: the bracket is quadOutline of the target's points`);
  const dom = domTarget(record, id);
  assert.deepEqual({ drawn: dom.drawn, outline: dom.outline, color: dom.color },
    { drawn: 'outline', outline: [expected.bracket], color: String(target.color) }, `${label}: the drawn outline`);
  assertNear(target.points, expected.projected.points, 1e-6, `${label}: points are the projected track geometry`);
  assertNear(target.points, truthView, tolerance, `${label}: corners`);
  return target;
}

// The points the frame's report gives the content's first occurrence, in frame px.
function reportedPoints(record, content) {
  const detection = record.report.detections.find(item => item.symbology === content.symbology &&
    item.content.text === content.text);
  assert.ok(detection, `${content.symbology} ${content.text}: reported`);
  return detection.occurrences[0].geometry.points;
}

// A line or points mark is drawn at the report's points: the target's points are the reported
// points through this module's own contain projection (fit), not the overlay's.
function assertDrawnAtReport(record, target, content, fit, label) {
  assertNear(target.points, reportedPoints(record, content).map(point => toView(fit, [point.x, point.y])), 0.01,
    `${label}: drawn at the reported points`);
}

// A segment drawn as a line, never as an outline, a polygon or a rectangle: at the reported
// segment's ends, which the document's line joins, inside BOX (frame px) within tolerance.
function assertLine(record, id, content, fit, box, tolerance, label) {
  const target = targetsOf(record).find(t => t.id === id);
  assert.ok(target, `${label}: a target for ${id}`);
  assert.deepEqual([target.kind, target.drawn, target.bracket], ['segment', 'line', null], `${label}: drawn as a line`);
  const dom = domTarget(record, id);
  assert.deepEqual({ drawn: dom.drawn, outline: dom.outline.length, paths: dom.paths, polygons: dom.polygons,
    rects: dom.rects, lines: dom.lines.length > 0 }, { drawn: 'line', outline: 0, paths: 0, polygons: 0, rects: 0,
    lines: true }, `${label}: a line with no outline, polygon or rectangle`);
  assertDrawnAtReport(record, target, content, fit, label);
  const [x1, y1, x2, y2] = dom.lines.find(line => line.role === 'qr-camera-outline')?.points ?? [];
  assertNear([{ x: x1, y: y1 }, { x: x2, y: y2 }], target.points, 0.01, `${label}: the drawn line's ends`);
  assertInside(target.points, boxIn(fit, box), tolerance * fit.s, `${label}: end points`);
}

function assertNoOutline(record, label) {
  assert.deepEqual(targetsOf(record).filter(t => t.drawn === 'outline').map(t => t.id), [], `${label}: no outline`);
  assert.deepEqual(record.dom.targets.flatMap(t => t.outline), [], `${label}: no outline path`);
}

function assertNothingDrawn(record, label) {
  assert.deepEqual(record.dom.targets.filter(t => t.drawn !== 'none' || t.paths + t.polygons + t.rects + t.lines.length
    + t.dots > 0).map(t => t.id), [], `${label}: no marker`);
  assert.equal(record.overlay.inspection.clip, null, `${label}: no hole`);
}

const states = record => record.snapshot.tracks.map(track => [track.id, track.state]);
const boxIn = (fit, [x, y, w, h]) => [fit.x + x * fit.s, fit.y + y * fit.s, w * fit.s, h * fit.s];

// The view the overlay resolved: the frame contained in BOX, centred, not mirrored.
function assertView(record, frame, label) {
  const fit = contain(frame), view = record.overlay.inspection.view;
  assert.equal(record.overlay.inspection.alignment, 'aligned', `${label}: aligned`);
  assert.deepEqual({ media: [view.mediaWidth, view.mediaHeight], view: [view.viewWidth, view.viewHeight], fit: view.fit,
    mirror: view.mirror }, { media: [frame.width, frame.height], view: [BOX.width, BOX.height], fit: 'contain',
    mirror: false }, `${label}: view`);
  assertNear([{ x: view.rect.x, y: view.rect.y }, { x: view.rect.width, y: view.rect.height }],
    [{ x: fit.x, y: fit.y }, { x: frame.width * fit.s, y: frame.height * fit.s }], 0.01, `${label}: media rect`);
  return fit;
}

// ------------------------------------------------------------------------------- scenes

// Scenes A-H. A frame step names the truth contents it shows with their geometry in frame px:
// `near` where the truth fixes the code's corners, else `within` the rectangle its image was
// drawn in. check() judges the records against the same layout.
export function overlayScenes({ truth, bytesOf }) {
  const byId = id => truth.cases.find(testCase => testCase.id === id) ?? assert.fail(`no truth case ${id}`);
  const tolerance = truth.tolerance_px;
  const control = byId('qr-v5q-control'), [controlContent] = control.contents;
  const controlNear = controlContent.occurrences[0].near;
  const images = ids => Object.fromEntries(ids.map(id => [id, bytesOf(byId(id))]));
  // A content placed at layer (a whole image or a crop of it, scaled): the truth corners moved
  // with it, or the rectangle the layer was drawn in.
  const shown = (id, layer, index = 0) => {
    const testCase = byId(id), content = testCase.contents[index];
    const scale = layer.scale ?? 1, [sx, sy, sw, sh] = layer.crop ?? [0, 0, ...testCase.size];
    return { ...content, occurrences: content.occurrences.map(occurrence => occurrence.near
      ? { kind: occurrence.kind, near: placed(occurrence.near, { x: layer.x - sx * scale, y: layer.y - sy * scale, scale }) }
      : occurrence.kind === 'unavailable' ? { kind: 'unavailable' }
        : { kind: occurrence.kind, within: [layer.x, layer.y, sw * scale, sh * scale] }) };
  };
  const frameCase = (name, frame, contents) => ({ id: name, size: [frame.width, frame.height], tolerance_px: tolerance,
    primary: null, score: contents.length ? 'present' : null, contents });
  const scenes = [];
  const scene = (name, frame, ids, steps, check, { overlay = { rail: 'always' }, ink = false } = {}) => scenes.push({
    name, frame, check,
    spec: { name, frame, box: BOX, overlay, ink, images: images(ids), steps: steps.map(({ contents, ...step }) => step) },
    frames: steps.map(step => (step.layers ? frameCase(`${name} at ${step.at} ms`, frame, step.contents) : null)) });
  const at = (layer, id = 'qr-v5q-control') => ({ image: id, ...layer });

  // A: the control, then empty frames until its identity expires: no marker or hole is left,
  // and its result stays as a retained card.
  {
    const frame = { width: 640, height: 480 }, layer = { x: 140, y: 60 };
    const code = { layers: [at(layer)], contents: [shown('qr-v5q-control', layer)] };
    const empty = { layers: [], contents: [] };
    scene('A', frame, ['qr-v5q-control'], [{ at: 0, ...code }, { at: 200, ...code }, { at: 400, ...empty },
      { at: 800, ...empty }, { at: 1400, ...empty }, { at: 2400, ...empty }], (records, label) => {
      const id = records[0].snapshot.tracks[0]?.id;
      assert.deepEqual(records.map(states), [[[id, 'tracked']], [[id, 'tracked']], [[id, 'held']], [[id, 'lost']],
        [[id, 'lost']], []], `${label}: tracked, held, lost, then expired`);
      const fit = assertView(records[1], frame, label);
      assertOutline(records[1], id, placed(controlNear, layer).map(point => toView(fit, point)), tolerance * fit.s,
        `${label}: while tracked`);
      assert.equal(holes(records[1].overlay.inspection.clip), 1, `${label}: one hole while tracked`);
      const last = records.at(-1), [result] = last.snapshot.results;
      assertNothingDrawn(last, `${label}: after expiry`);
      assert.deepEqual({ text: result.text, present: result.present, entries: last.dom.entries.map(entry =>
        ({ target: entry.target, result: entry.result, format: entry.format, caption: entry.caption })) },
      { text: controlContent.text, present: false, entries: [{ target: null, result: result.id, format: 'QR Code',
        caption: 'Not read recently' }] }, `${label}: the retained card`);
    });
  }
  // B: one QR: its bracket is quadOutline of the projected corners, and its content is exact.
  {
    const frame = { width: 640, height: 480 }, layer = { x: 140, y: 60 };
    const code = { layers: [at(layer)], contents: [shown('qr-v5q-control', layer)] };
    scene('B', frame, ['qr-v5q-control'], [{ at: 0, ...code }, { at: 200, ...code }], (records, label) => {
      const last = records.at(-1), [track] = last.snapshot.tracks;
      assert.deepEqual(states(last), [[track.id, 'tracked']], `${label}: one track`);
      const fit = assertView(last, frame, label);
      assertOutline(last, track.id, placed(controlNear, layer).map(point => toView(fit, point)), tolerance * fit.s, label);
      assert.deepEqual([last.dom.readout?.content, last.overlay.detection, last.dom.entries.map(e => e.target)],
        [controlContent.text, controlContent.text, [track.id]], `${label}: the exact content, read out`);
    });
  }
  // C: the control warped (rotated 12 degrees and skewed 8 degrees about the frame centre).
  {
    const frame = { width: 640, height: 480 }, [cx, cy] = [control.size[0] / 2, control.size[1] / 2];
    const [cos, sin, tan] = [Math.cos(12 * DEG), Math.sin(12 * DEG), Math.tan(8 * DEG)];
    const a = [cos, sin, cos * tan - sin, sin * tan + cos];
    const matrix = [...a, 320 - (a[0] * cx + a[2] * cy), 240 - (a[1] * cx + a[3] * cy)];
    const warped = controlNear.map(point => affine(matrix, point));
    const content = { ...controlContent, occurrences: [{ kind: 'quad', near: warped }] };
    const code = { layers: [{ image: 'qr-v5q-control', matrix }], contents: [content] };
    scene('C', frame, ['qr-v5q-control'], [{ at: 0, ...code }, { at: 200, ...code }], (records, label) => {
      const last = records.at(-1), [track] = last.snapshot.tracks;
      const fit = assertView(last, frame, label);
      assertOutline(last, track.id, warped.map(point => toView(fit, point)), tolerance * fit.s, label);
    });
  }
  // D: three matrix codes, one per 180 px lane of a 1280 x 720 frame (the control at half size in
  // lane 0, the Data Matrix cropped to 180 px around the code in lane 1, the Micro QR at 6/7 in
  // lane 3), cross until their left-to-right order is reversed, one frame a second. Every move is
  // more than half a code's size, so the tracker restarts its smoothing instead of lagging, and
  // less than one and a half sizes, so it keeps the identity: colors stay with their codes (0-2),
  // and a manual selection made before the motion survives it.
  // 'D with an unread off-center Aztec code' also draws the Aztec code, cropped like the Data
  // Matrix, in lane 2. It witnesses a known limit: the engine reads an Aztec code only where it
  // lies over the center of the image, or of a region cropped around a code already read, and
  // this one never does. Its frames must give exactly the other three contents and its tracker
  // the same three tracks, so the unread code changes nothing else. A frame that reads the Aztec
  // code fails as an unexpected detection: the limit was lifted, and the code belongs in scene D.
  const laneCodes = [['qr-v5q-control', { scale: 0.5 }], ['data-matrix', { crop: [30, 30, 180, 180] }],
    ['aztec', { crop: [30, 30, 180, 180] }], ['micro-qr', { scale: 6 / 7 }]];
  for (const [name, drawn] of [['D', [0, 1, 3]], ['D with an unread off-center Aztec code', [0, 1, 2, 3]]]) {
    const frame = { width: 1280, height: 720 }, rows = [0, 1, 3], chosen = 1;
    const startX = [40, 380, 720, 1060], endX = [1060, 720, 380, 40], moves = [7, 4, 4, 7];
    const xAt = (row, k) => Math.round(startX[row] + (endX[row] - startX[row]) * Math.min(k, moves[row]) / moves[row]);
    const lane = (row, k) => ({ image: laneCodes[row][0], x: xAt(row, k), y: 180 * row, ...laneCodes[row][1] });
    // The read lanes' layers, in lane order: every frame gives exactly their contents.
    const layout = k => rows.map(row => lane(row, k));
    const step = (atMs, k) => ({ at: atMs, layers: drawn.map(row => lane(row, k)),
      contents: layout(k).map(layer => shown(layer.image, layer)) });
    const lanes = rows.map(row => laneCodes[row]);
    const texts = lanes.map(([id]) => byId(id).contents[0].text);
    const motion = Array.from({ length: 7 }, (_, index) => step(2000 + 1000 * index, index + 1));
    const order = lanes.map((_, index) => index);
    scene(name, frame, drawn.map(row => laneCodes[row][0]), [step(0, 0), step(1000, 0),
      { select: { symbology: byId(lanes[chosen][0]).contents[0].symbology, text: texts[chosen] } }, ...motion,
      step(9000, 7), step(10000, 7)], (records, label) => {
      const frames = records.filter(record => record.kind === 'frame');
      const ids = texts.map(text => tracksWith(frames[0], text)[0]?.id ?? null);
      const select = records.find(record => record.kind === 'select');
      assert.deepEqual([select.target, select.selected, select.overlay.selectionMode], [ids[chosen], true, 'manual'],
        `${label}: ${lanes[chosen][0]} selected by hand`);
      frames.forEach((record, index) => {
        assert.deepEqual(record.snapshot.tracks.map(track => [track.id, track.slot, track.state]),
          ids.map((id, slot) => [id, slot, 'tracked']), `${label}: frame ${index}: the same tracks and slots`);
        assert.deepEqual([targetsOf(record).map(target => [target.id, target.color]), record.dom.targets.map(target =>
          [target.id, target.color])], [ids.map((id, slot) => [id, slot]), ids.map((id, slot) => [id, String(slot)])],
        `${label}: frame ${index}: colors 0-${ids.length - 1} stay with their codes`);
        if (index > 0) assert.deepEqual(record.snapshot.events.filter(event => event.type === 'entered'), [],
          `${label}: frame ${index}: no new track`);
      });
      const last = frames.at(-1), fit = assertView(last, frame, label);
      assert.deepEqual([last.overlay.selectionMode, last.overlay.inspection.selected], ['manual', ids[chosen]],
        `${label}: the manual selection survives the reversal`);
      const inFrame = points => points.map(point => ({ x: point.x * frame.width, y: point.y * frame.height }));
      const leftToRight = record => ids.map(id => centre(inFrame(trackOf(record, id).geometry.measured)).x)
        .map((x, index) => [x, index]).sort((p, q) => p[0] - q[0]).map(([, index]) => index);
      assert.deepEqual([leftToRight(frames[0]), leftToRight(last)], [order, order.slice().reverse()],
        `${label}: left-to-right order reversed`);
      layout(7).forEach((layer, index) => {
        const where = `${label}: ${lanes[index][0]} at its last place`;
        assertInside(inFrame(trackOf(last, ids[index]).geometry.measured), [layer.x, layer.y, 180, 180], tolerance, where);
        if (layer.image === control.id) {
          assertOutline(last, ids[index], placed(controlNear, layer).map(point => toView(fit, point)), tolerance * fit.s,
            where);
        } else {
          assertInside(assertOutlineOnly(last, ids[index], where).points, boxIn(fit, [layer.x, layer.y, 180, 180]),
            tolerance * fit.s, where);
        }
      });
    });
  }
  // E: the QR and Code 128 composite: both contents exact and selectable, the QR an outline, the
  // barcode a line and never a rectangle.
  {
    const testCase = byId('qr-and-code128'), frame = { width: testCase.size[0], height: testCase.size[1] };
    const [qr, bar] = testCase.contents;
    const code = { layers: [{ image: testCase.id, x: 0, y: 0 }], contents: testCase.contents };
    scene('E', frame, [testCase.id], [{ at: 0, ...code }, { at: 200, ...code },
      { select: { symbology: qr.symbology, text: qr.text } }, { select: { symbology: bar.symbology, text: bar.text } }],
    (records, label) => {
      const last = records[1], fit = assertView(last, frame, label);
      const [qrTrack, barTrack] = [tracksWith(last, qr.text), tracksWith(last, bar.text)].map(found => found[0]);
      assert.deepEqual(states(last).map(([id, state]) => [id === qrTrack?.id ? 'qr' : id === barTrack?.id ? 'bar' : id,
        state]).sort(), [['bar', 'tracked'], ['qr', 'tracked']], `${label}: two tracks`);
      assertInside(assertOutlineOnly(last, qrTrack.id, `${label}: QR`).points, boxIn(fit, qr.occurrences[0].within),
        tolerance * fit.s, `${label}: QR`);
      assertLine(last, barTrack.id, bar, fit, bar.occurrences[0].within, tolerance, `${label}: Code 128`);
      [[records[2], qrTrack, qr], [records[3], barTrack, bar]].forEach(([record, track, content]) => assert.deepEqual(
        [record.target, record.selected, record.overlay.detection, record.dom.readout?.content],
        [track.id, true, content.text, content.text], `${label}: ${content.symbology} selected and read out exactly`));
    });
  }
  // F: linear and partial geometry: an EAN-13 line, DataBar points, a Codabar read with no
  // position (a content track, "Read now"), and MaxiCode over Code 128. No outline anywhere. The
  // line and the points are drawn at the reported points, inside the rectangle the truth gives
  // or, where it gives none (the EAN-13 and DataBar rows), inside the frame's ink box: the
  // extent of the dark pixels the fixture drew at the origin, measured before the scan.
  for (const id of ['ean13', 'data-bar', 'codabar', 'maxicode-over-code128']) {
    const testCase = byId(id), frame = { width: testCase.size[0], height: testCase.size[1] };
    const code = { layers: [{ image: id, x: 0, y: 0 }], contents: testCase.contents };
    const unplaced = testCase.contents.find(content => content.occurrences[0].kind === 'unavailable');
    const steps = [{ at: 0, ...code }, { at: 200, ...code }];
    if (unplaced) steps.push({ select: { symbology: unplaced.symbology, text: unplaced.text } });
    scene(`F ${id}`, frame, [id], steps, (records, label) => {
      const last = records[1], fit = assertView(last, frame, label);
      assertNoOutline(last, label);
      assert.equal(last.snapshot.tracks.length, testCase.contents.length, `${label}: one track per content`);
      for (const content of testCase.contents) {
        const [track] = tracksWith(last, content.text), kind = content.occurrences[0].kind;
        const target = targetsOf(last).find(t => t.id === track?.id), dom = domTarget(last, track?.id);
        const where = `${label}: ${content.symbology}`;
        const box = content.occurrences[0].within ?? last.ink;
        if (kind !== 'unavailable') assert.ok(box, `${where}: a rectangle from the truth or the frame's ink`);
        if (kind === 'segment') assertLine(last, track.id, content, fit, box, tolerance, where);
        else if (kind === 'partial') {
          assert.deepEqual({ kind: target.kind, drawn: target.drawn, dots: dom.dots, others: dom.paths + dom.polygons +
            dom.rects + dom.lines.length }, { kind: 'partial', drawn: 'points', dots: target.points.length, others: 0 },
          `${where}: points only`);
          assertDrawnAtReport(last, target, content, fit, where);
          assertNear(dom.dotPoints, target.points, 0.01, `${where}: the drawn dots`);
          assertInside(target.points, boxIn(fit, box), tolerance * fit.s, where);
        } else {
          assert.deepEqual({ basis: track.basis, drawn: target.drawn, state: target.stateText, shapes: dom === null ? 0
            : dom.paths + dom.polygons + dom.rects + dom.lines.length + dom.dots },
          { basis: 'content', drawn: 'none', state: 'Read now', shapes: 0 }, `${where}: a content track, Read now`);
        }
      }
      if (unplaced) assert.deepEqual([records[2].selected, records[2].dom.readout?.content], [true, unplaced.text],
        `${label}: the ${unplaced.symbology} content track selected and read out exactly`);
    }, { ink: true });
  }
  // G: two identical QR copies beside a Code 128: two distinct outlines, and the first copy's
  // details name the second ("Same content as Code 2"; slots follow the frame's reading order).
  {
    const testCase = byId('qr-twins-and-code128'), frame = { width: testCase.size[0], height: testCase.size[1] };
    const [qr, bar] = testCase.contents;
    const code = { layers: [{ image: testCase.id, x: 0, y: 0 }], contents: testCase.contents };
    scene('G', frame, [testCase.id], [{ at: 0, ...code }, { at: 200, ...code },
      { select: { symbology: qr.symbology, text: qr.text, index: 0 } }, { details: true }], (records, label) => {
      const last = records[1], fit = assertView(last, frame, label);
      const copies = tracksWith(last, qr.text);
      assert.equal(copies.length, 2, `${label}: two tracks of one content`);
      const nearest = near => copies.map(track => [Math.hypot(...['x', 'y'].map(axis => centre(track.geometry.measured
        .map(point => ({ x: point.x * frame.width, y: point.y * frame.height })))[axis] - centre(near.map(([x, y]) =>
        ({ x, y })))[axis])), track]).sort((p, q) => p[0] - q[0])[0][1];
      const [left, right] = qr.occurrences.map(occurrence => nearest(occurrence.near));
      assert.deepEqual([left.slot, right.slot, left.id !== right.id], [0, 1, true], `${label}: the left copy is Code 1`);
      qr.occurrences.forEach((occurrence, index) => assertOutline(last, [left, right][index].id,
        occurrence.near.map(point => toView(fit, point)), tolerance * fit.s, `${label}: copy ${index + 1}`));
      assert.notEqual(domTarget(last, left.id).outline[0], domTarget(last, right.id).outline[0], `${label}: distinct outlines`);
      assertLine(last, tracksWith(last, bar.text)[0].id, bar, fit, bar.occurrences[0].within, tolerance,
        `${label}: Code 128`);
      const [select, details] = records.slice(2);
      const relation = `Same content as Code ${right.slot + 1}`;
      assert.deepEqual([select.target, select.selected, details.pressed, details.dom.readout?.detailsVisible,
        details.dom.readout?.details?.includes(relation)], [left.id, true, true, true, true],
      `${label}: the first copy's details show "${relation}" (${JSON.stringify(details.dom.readout?.details)})`);
    });
  }
  // H: the control (half size) held still, moved across the frame, held still, then removed:
  // held, lost, expired, and its hole goes with it. Then the tracker switches to epoch 2: a late
  // epoch-1 frame (another code) and a replayed epoch-1 snapshot change nothing on screen.
  {
    const frame = { width: 640, height: 480 }, xs = [20, 20, 20, 125, 230, 335, 440, 440, 440];
    const code = (atMs, x) => {
      const layer = { image: 'qr-v5q-control', x, y: 150, scale: 0.5 };
      return { at: atMs, layers: [layer], contents: [shown('qr-v5q-control', layer)] };
    };
    const empty = atMs => ({ at: atMs, layers: [], contents: [] });
    const late = { image: 'micro-qr', x: 200, y: 150 };
    const microText = byId('micro-qr').contents[0].text;
    scene('H', frame, ['qr-v5q-control', 'micro-qr'], [...xs.map((x, index) => code(200 * index, x)), empty(1800),
      empty(2000), empty(3800), { reset: 2 }, { at: 1700, epoch: 1, layers: [late], contents: [shown('micro-qr', late)] },
      { replay: 8 }], (records, label) => {
      const id = records[0].snapshot.tracks[0]?.id;
      assert.deepEqual(records.slice(0, 12).map(states), [...xs.map(() => [[id, 'tracked']]), [[id, 'held']],
        [[id, 'lost']], []], `${label}: one track through the motion, then held, lost and expired`);
      assert.deepEqual(records.slice(0, 12).map(record => holes(record.overlay.inspection.clip)).filter((_, index) =>
        [2, 8, 9, 10, 11].includes(index)), [1, 1, 0, 0, 0], `${label}: a hole while still, none from held on`);
      const fit = assertView(records[8], frame, label);
      assertOutline(records[8], id, placed(controlNear, { x: 440, y: 150, scale: 0.5 }).map(point => toView(fit, point)),
        tolerance * fit.s, `${label}: at its last place`);
      assertNothingDrawn(records[11], `${label}: expired`);
      const [reset, lateFrame, replay] = records.slice(12);
      const screen = record => ({ entries: record.dom.entries, readout: record.dom.readout });
      assert.deepEqual([reset.snapshot.status, reset.snapshot.epoch, reset.snapshot.tracks], ['reset', 2, []],
        `${label}: the epoch switch`);
      assert.deepEqual([lateFrame.snapshot.status, lateFrame.snapshot.rejection, lateFrame.snapshot.tracks,
        lateFrame.snapshot.results.some(result => result.text === microText)], ['rejected', 'stale_epoch', [], false],
      `${label}: the late epoch-1 frame is rejected`);
      assert.deepEqual(replay.overlay.inspection.ignored, { count: lateFrame.overlay.inspection.ignored.count + 1,
        last: 'stale_epoch' }, `${label}: the replayed epoch-1 snapshot is ignored`);
      for (const [record, what] of [[lateFrame, 'late frame'], [replay, 'replayed snapshot']]) {
        assertNothingDrawn(record, `${label}: after the ${what}`);
        assert.deepEqual(screen(record), screen(reset), `${label}: the ${what} changes no entry or readout`);
      }
    });
  }
  return scenes;
}

// The outline checks of assertOutline without a truth for the corners.
function assertOutlineOnly(record, id, label) {
  const target = targetsOf(record).find(t => t.id === id);
  assert.ok(target, `${label}: a target for ${id}`);
  assertOutline(record, id, target.points, 0, label);
  return target;
}

// Every frame step's report against its truth contents (an exact multiset, geometry within
// tolerance, neither cut nor saturated), then the scene's own checks.
export function judgeScene(scene, run, profile, { judge, versions }) {
  const label = `scene ${scene.name}, ${profile}`;
  assert.deepEqual(run.errors, [], `${label}: no tracker or overlay error`);
  assert.equal(run.records.length, scene.spec.steps.length, `${label}: every step ran`);
  run.records.forEach((record, index) => {
    const testCase = scene.frames[index];
    if (testCase) assert.deepEqual(judge(profileCase(testCase, profile), record.report, versions), [], testCase.id);
  });
  scene.check(run.records, label);
  return { frames: run.records.filter(record => record.kind === 'frame').length,
    scanMs: Math.round(run.records.reduce((sum, record) => sum + (record.callMs ?? 0), 0)) };
}

// ---------------------------------------------------------------------- effects witness

// Two quads (the control and the Data Matrix) still on a 640 x 480 frame: both get a hole, so
// the effects can switch on. Six frames 150 ms apart; only the grey patch changes.
export function effectsScene({ truth, bytesOf }) {
  const byId = id => truth.cases.find(testCase => testCase.id === id) ?? assert.fail(`no truth case ${id}`);
  const control = byId('qr-v5q-control'), matrix = byId('data-matrix');
  const layers = [{ image: control.id, x: 40, y: 60 }, { image: matrix.id, x: 400, y: 120 }];
  const contents = [{ ...control.contents[0], occurrences: [{ kind: 'quad',
    near: placed(control.contents[0].occurrences[0].near, layers[0]) }] },
  { ...matrix.contents[0], occurrences: [{ kind: 'quad', within: [400, 120, ...matrix.size] }] }];
  const frame = { width: 640, height: 480 };
  return { spec: { frame, box: BOX, frames: 6, gapMs: 150, layers,
    images: { [control.id]: bytesOf(control), [matrix.id]: bytesOf(matrix) } },
  testCase: { id: 'effects frame', size: [frame.width, frame.height], tolerance_px: truth.tolerance_px, primary: null,
    score: 'present', contents } };
}

// Per frame: the SHA-256 of the RGBA the worker received, and the report without its timing
// fields, in both runs. Measured only: nothing asserted.
export function compareEffects(bare, overlay, normalize) {
  return { frames: bare.frames.length, equalRgba: bare.frames.map((frame, k) => frame.sha256 === overlay.frames[k]?.sha256),
    equalReports: bare.frames.map((frame, k) => JSON.stringify(normalize(frame.report)) ===
      JSON.stringify(normalize(overlay.frames[k]?.report))),
    budgetExhausted: { bare: bare.frames.map(frame => frame.report.trace.budget_exhausted),
      overlay: overlay.frames.map(frame => frame.report.trace.budget_exhausted) },
    effectsActive: overlay.frames.map(frame => frame.effectsActive) };
}

// With budget 0: equal pixels and equal reports frame by frame, while the overlay had its
// strongest effects on (for at least the last two frames, with both holes cut) and cut
// thumbnails from frame copies; and the overlay wrote no attribute of the element read.
export function judgeEffects(effects, bare, overlay, profile, { judge, versions, normalize }) {
  const label = `effects, ${profile}`;
  for (const run of [bare, overlay]) {
    assert.deepEqual(run.errors, [], `${label}, ${run.mode}: no error`);
    assert.deepEqual(run.frames.map(frame => frame.sequence), Array.from({ length: effects.spec.frames },
      (_, k) => run.frames[0].sequence + k), `${label}, ${run.mode}: every frame read once, in order`);
    run.frames.forEach((frame, k) => assert.deepEqual(judge(profileCase(effects.testCase, profile), frame.report, versions),
      [], `${label}, ${run.mode}: frame ${k}`));
  }
  bare.frames.forEach((frame, k) => {
    assert.equal(overlay.frames[k].sha256, frame.sha256, `${label}: frame ${k} RGBA SHA-256`);
    assert.deepEqual(normalize(overlay.frames[k].report), normalize(frame.report), `${label}: frame ${k} report`);
  });
  const active = overlay.frames.map(frame => frame.effectsActive);
  const { effects: state, clip, scrim, frameImage } = overlay.overlay;
  assert.deepEqual({ lastTwo: active.slice(-2), active: state.active, activated: state.activations >= 1,
    holes: holes(clip), scrim: scrim && { visible: scrim.visible, holes: holes(scrim.d) },
    copied: overlay.frames.some(frame => frame.frameImage), crops: frameImage.crops >= 1, writes: overlay.writes },
  { lastTwo: [true, true], active: true, activated: true, holes: 2, scrim: { visible: true, holes: 2 }, copied: true,
    crops: true, writes: bare.writes }, `${label}: the overlay's effects and thumbnails were on (${JSON.stringify(active)})`);
  return compareEffects(bare, overlay, normalize);
}
