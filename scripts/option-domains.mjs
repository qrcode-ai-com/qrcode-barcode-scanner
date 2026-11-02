// Option domains of the JavaScript surfaces (spec/02-profiles.md § Option
// domains). Node and WASM read every option as a double and map it once, in
// the core (options.rs): 0.10.1 wrapped budgetMs 4294967297 to a 1 ms budget,
// ran 0.5 unbounded, disabled the size cap on maxDimension -1 and refused
// every image on maxPixels NaN. One table, run by both workspace smokes and,
// on the INSTALLED packages, by packed-node-consumer.mjs: a pass on the
// source tree does not stand for the packed loader or glue.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const MAX_BUDGET_MS = 4294967295;
const MAX_DIMENSION = 4294967295;
const MAX_PIXELS = Number.MAX_SAFE_INTEGER;

export const DOMAINS = Object.freeze({
  budgetMs: {
    // unset: the profile default, enough or not (the report says which)
    unset: [undefined, null],
    // not above 0, NaN and the infinities are unbounded; the 49.7-day
    // maximum and a fraction above it are ample (no machine load reaches them)
    unbounded: [0, -0, -1, -MAX_BUDGET_MS - 1, NaN, Infinity, -Infinity, MAX_BUDGET_MS, MAX_BUDGET_MS + 0.5],
    // a positive value below 1 floors to a zero-ms budget: a cut, never unbounded.
    // A zero-ms deadline has always passed, so these cases read no clock.
    zero: [Number.MIN_VALUE, 0.5, 0.999],
    refused: [MAX_BUDGET_MS + 1, MAX_BUDGET_MS + 1.5, MAX_BUDGET_MS + 2, 1e300, Number.MAX_VALUE],
  },
  maxDimension: {
    unset: [undefined, null],
    refused: [0, -0, -1, 0.5, 4096.7, NaN, Infinity, -Infinity, MAX_DIMENSION + 1],
    ceiling: MAX_DIMENSION,
    cap: "QRS-002",
  },
  maxPixels: {
    unset: [undefined, null],
    refused: [0, -0, -1, 0.5, 1.5, NaN, Infinity, -Infinity, MAX_PIXELS + 1],
    ceiling: MAX_PIXELS,
    cap: "QRS-003",
  },
});

const WIRE = { budgetMs: "budget_ms", maxDimension: "max_dimension", maxPixels: "max_pixels" };

/** The QRS-006 message of one option, by its JavaScript or wire name. */
export const refusedOption = (option) =>
  new RegExp(`invalid option \`${WIRE[option] ?? option}\`: .* \\[QRS-006\\]$`);

/** [width, height] from a PNG's IHDR chunk. */
export function pngSize(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(0), 0x89504e47, "a PNG signature");
  assert.equal(view.getUint32(12), 0x49484452, "IHDR first");
  return [view.getUint32(16), view.getUint32(20)];
}

const show = (options) => Object.entries(options)
  .map(([key, value]) => `${key}=${Object.is(value, -0) ? "-0" : String(value)}`).join(" ");

/**
 * Runs the whole table through one scan path and resolves to the number of
 * cases it ran. `path.call(options, input)` scans with the "fast" profile
 * and returns a report or a promise of one; options are camelCase and
 * null/undefined leave one unset. `path.input` is a clean symbol (or a
 * blank frame) whose final report decodes exactly `path.texts`, and
 * `path.size` its [width, height]. `path.unreadable` is an input the scanner
 * refuses with `path.unreadableCode` once its options are valid: an invalid
 * option beside it must still be QRS-006, reported before the input is read.
 */
export async function assertOptionDomains(path) {
  const { name, call, input, texts, size, unreadable, unreadableCode } = path;
  let cases = 0;
  const run = async (options, bytes = input) => {
    cases += 1;
    return call(options, bytes);
  };
  // an admitted case that throws fails under its own label
  const scanned = async (options, label) => {
    try {
      return await run(options);
    } catch (error) {
      return assert.fail(`${label}: ${error.message}`);
    }
  };
  const outcome = (report) => [report.detections.map((d) => d.content.text), report.trace.budget_exhausted];
  const final = async (options) => {
    const label = `${name} ${show(options)}: final`;
    assert.deepEqual(outcome(await scanned(options, label)), [texts, false], label);
  };
  const refused = async (options, code, bytes = input) => {
    // a synchronous throw and a rejected promise are both refusals
    await assert.rejects(async () => run(options, bytes), code, `${name} ${show(options)}`);
  };
  const { budgetMs, maxDimension, maxPixels } = DOMAINS;
  for (const value of budgetMs.unset) {
    const label = `${name} ${show({ budgetMs: value })}: the profile default`;
    const report = await scanned({ budgetMs: value }, label);
    assert.equal(typeof report.trace.budget_exhausted, "boolean", label);
    if (!report.trace.budget_exhausted) assert.deepEqual(outcome(report)[0], texts, `${label}, final`);
  }
  for (const value of budgetMs.unbounded) await final({ budgetMs: value });
  for (const value of budgetMs.zero) {
    const label = `${name} ${show({ budgetMs: value })}: floors to a zero-ms budget`;
    assert.deepEqual(outcome(await scanned({ budgetMs: value }, label)), [[], true], label);
  }
  for (const value of budgetMs.refused) await refused({ budgetMs: value }, refusedOption("budgetMs"));
  const [width, height] = size;
  const limits = [
    ["maxDimension", maxDimension, Math.max(width, height)],
    ["maxPixels", maxPixels, width * height],
  ];
  for (const [option, domain, exact] of limits) {
    for (const value of domain.unset) await final({ budgetMs: 0, [option]: value });
    for (const value of domain.refused) await refused({ budgetMs: 0, [option]: value }, refusedOption(option));
    // the domain's extremes are caps, not option errors: 1 and one below
    // the input's own size refuse it under the cap's code, its exact size
    // and the ceiling admit it
    const cap = new RegExp(`\\[${domain.cap}\\]$`);
    for (const value of new Set([1, exact - 1])) {
      if (value >= 1) await refused({ budgetMs: 0, [option]: value }, cap);
    }
    await final({ budgetMs: 0, [option]: exact });
    await final({ budgetMs: 0, [option]: domain.ceiling });
  }
  await final({ budgetMs: 0, maxDimension: null, maxPixels: null });
  // the option is reported before the input is read
  await assert.rejects(async () => run({ budgetMs: 0 }, unreadable), new RegExp(`\\[${unreadableCode}\\]`),
    `${name} the unreadable control`);
  for (const options of [{ maxDimension: 0 }, { maxPixels: NaN }, { budgetMs: MAX_BUDGET_MS + 2 }]) {
    const [option] = Object.keys(options);
    await refused(options, refusedOption(option), unreadable);
  }
  return cases;
}

const fault = (code, message) => new Error(`${message} [${code}]`);
const optionFault = (wire, message) => fault("QRS-006", `invalid option \`${wire}\`: ${message}`);

// The contract's model (options.rs): a budget in whole ms (Infinity =
// unbounded; the profile default is ample here, there is no clock) and a
// limit from 1 to its ceiling.
const modelBudget = (ms) => {
  if (ms === undefined || ms === null || Number.isNaN(ms) || ms <= 0 || ms === Infinity) return Infinity;
  const whole = Math.floor(ms);
  if (whole > MAX_BUDGET_MS) throw optionFault("budget_ms", `${ms} ms is above the maximum ${MAX_BUDGET_MS} ms`);
  return whole;
};
const modelLimit = (wire, value, max, unset) => {
  if (value === undefined || value === null) return unset;
  if (!(Number.isFinite(value) && Math.trunc(value) === value && value >= 1 && value <= max)) {
    throw optionFault(wire, `${value} is not a whole number from 1 to ${max}`);
  }
  return value;
};

/** A scan path over the model (then input.rs's caps), with at most one
 * planted defect: a replaced budget or limit mapping, cap comparison, or
 * the input read before the options. */
function modelPath(defect = {}) {
  const budget = defect.budget ?? modelBudget;
  const limit = defect.limit ?? modelLimit;
  const over = defect.over ?? ((side, cap) => side > cap);
  const input = { size: [264, 264], texts: ["qrc.ai/v2l"] };
  const unreadable = { unreadable: true };
  const call = (options, image) => {
    if (defect.inputFirst && image.unreadable) throw fault("QRS-001", "the input cannot be read");
    const ms = budget(options.budgetMs);
    const maxDimension = limit("max_dimension", options.maxDimension, MAX_DIMENSION, 10_000);
    const maxPixels = limit("max_pixels", options.maxPixels, MAX_PIXELS, 64_000_000);
    if (image.unreadable) throw fault("QRS-001", "the input cannot be read");
    const [width, height] = image.size;
    if (over(width, maxDimension) || over(height, maxDimension)) throw fault("QRS-002", "dimensions exceed the limit");
    if (over(width * height, maxPixels)) throw fault("QRS-003", "pixels exceed the limit");
    const cut = ms === 0;
    return { detections: cut ? [] : image.texts.map((text) => ({ content: { text } })),
      trace: { budget_exhausted: cut } };
  };
  return { name: "model", call, input, texts: input.texts, size: input.size, unreadable, unreadableCode: "QRS-001" };
}

/** The table accepts the contract's model and names each planted defect:
 * the four 0.10.1 conversions first, then neighbours of every boundary.
 * Resolves to the number of defects refused. */
export async function selfTest() {
  const cases = await assertOptionDomains(modelPath());
  const defects = {
    // 0.10.1 Node: Node-API's u32 conversion (0.5 → 0 = unbounded, 4294967297 → 1 ms)
    "the budget through ToUint32": [{ budget: (ms) => (ms == null || ms >>> 0 === 0 ? Infinity : ms >>> 0) },
      "budgetMs=5e-324: floors to a zero-ms budget"],
    // 0.10.1 WASM: 1e300 ran unbounded
    "a huge budget unbounded": [{ budget: (ms) => (ms > Number.MAX_SAFE_INTEGER ? Infinity : modelBudget(ms)) },
      "budgetMs=1e+300"],
    // 0.10.1 WASM: max_dimension -1 through ToUint32, the cap disabled
    "a limit through ToUint32": [{ limit: (wire, value, max, unset) => (value == null ? unset : value >>> 0) },
      "budgetMs=0 maxDimension=0"],
    // 0.10.1: max_pixels NaN dropped for the default cap
    "NaN pixels as the default cap": [{ limit: (wire, value, max, unset) =>
      (wire === "max_pixels" && Number.isNaN(value) ? unset : modelLimit(wire, value, max, unset)) }, "maxPixels=NaN"],
    "an overflowing budget wrapped": [{ budget: (ms) => (Math.floor(ms) > MAX_BUDGET_MS ? Math.floor(ms) % 2 ** 32
      : modelBudget(ms)) }, "budgetMs=4294967296"],
    "the maximum budget refused": [{ budget: (ms) => {
      if (Math.floor(ms) === MAX_BUDGET_MS) throw optionFault("budget_ms", "at the maximum");
      return modelBudget(ms);
    } }, "budgetMs=4294967295: final"],
    "a negative budget refused": [{ budget: (ms) => {
      if (ms < 0) throw optionFault("budget_ms", "negative");
      return modelBudget(ms);
    } }, "budgetMs=-1: final"],
    "a disabled cap on a negative": [{ limit: (wire, value, max, unset) =>
      (value < 0 ? max : modelLimit(wire, value, max, unset)) }, "maxDimension=-1"],
    "2^53 pixels admitted": [{ limit: (wire, value, max, unset) =>
      modelLimit(wire, value, wire === "max_pixels" ? 2 ** 53 : max, unset) }, "maxPixels=9007199254740992"],
    "null refused": [{ limit: (wire, value, max, unset) => modelLimit(wire, value === null ? NaN : value, max, unset) },
      "maxDimension=null: final"],
    "a cap refusing its exact value": [{ over: (side, cap) => side >= cap }, "maxDimension=264: final"],
    "the input read before the options": [{ inputFirst: true }, "model maxDimension=0"],
  };
  for (const [defect, [planted, expected]] of Object.entries(defects)) {
    await assert.rejects(() => assertOptionDomains(modelPath(planted)), (error) => {
      assert.ok(error.message.includes(expected), `${defect}: refused as ${JSON.stringify(error.message)}`);
      return true;
    }, defect);
  }
  return { cases, refusals: Object.keys(defects).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).join(" ") !== "--self-test") throw new Error("usage: option-domains.mjs --self-test");
  console.log(JSON.stringify({ self_test: "PASS", ...await selfTest() }));
}
