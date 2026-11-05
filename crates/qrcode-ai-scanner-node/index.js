const native = require("./native.js");

// napi keeps one task list per signal object, and an abort stops at the
// first of its tasks that already completed: a signal shared by several
// scans would not cancel those queued after a completed one. Each scan hands
// napi a signal of its own. One listener per caller signal aborts them all
// (one per scan trips Node's 10-listener warning in a batch), and it is
// removed once the last scan sharing the signal settles.
const linked = new WeakMap();

function link(signal) {
  let entry = linked.get(signal);
  if (entry === undefined) {
    const controllers = new Set();
    const forward = () => {
      for (const controller of controllers) controller.abort();
    };
    signal.addEventListener("abort", forward);
    entry = { controllers, forward };
    linked.set(signal, entry);
  }
  const controller = new AbortController();
  entry.controllers.add(controller);
  return controller;
}

function unlink(signal, controller) {
  const entry = linked.get(signal);
  entry.controllers.delete(controller);
  if (entry.controllers.size === 0) {
    signal.removeEventListener("abort", entry.forward);
    linked.delete(signal);
  }
}

/** Parse the native JSON-string boundary into the ScanReport object. */
async function scan(image, options = {}) {
  const { signal } = options;
  // null and undefined mean no signal; anything else must be one (Node's own
  // check reads `aborted`, and the wrapper listens for the abort event)
  if (signal != null && (typeof signal !== "object" || !("aborted" in signal) ||
      typeof signal.addEventListener !== "function")) {
    throw new TypeError("options.signal must be an AbortSignal");
  }
  // napi only observes the abort EVENT — a pre-aborted signal would hang
  // the contract silently. Standard early check.
  if (signal?.aborted) {
    throw new DOMException("scan aborted before start", "AbortError");
  }
  const inner = signal == null ? undefined : link(signal);
  try {
    const json = await native.scanJson(
      image,
      options.profile,
      inner?.signal,
      options.maxDimension,
      options.maxPixels,
      options.budgetMs,
      options.scoreSkipAxes,
      options.scoreSkipChecks,
      options.alphaBackground,
      options.alphaPalette,
      options.scorePreset,
    );
    return JSON.parse(json);
  } catch (error) {
    // napi rejects a task cancelled while queued with a plain Error named
    // AbortError: rethrow the DOMException a pre-aborted signal gets.
    if (inner && error?.name === "AbortError") {
      throw new DOMException("scan aborted while queued", "AbortError");
    }
    throw error;
  } finally {
    if (inner) unlink(signal, inner);
  }
}

function scanSync(image, options = {}) {
  return JSON.parse(
    native.scanSyncJson(
      image,
      options.profile,
      options.maxDimension,
      options.maxPixels,
      options.budgetMs,
      options.scoreSkipAxes,
      options.scoreSkipChecks,
      options.alphaBackground,
      options.alphaPalette,
      options.scorePreset,
    ),
  );
}

/** The readers compiled into the loaded addon (spec/01-report.md § Capabilities). */
function capabilities() {
  return JSON.parse(native.capabilitiesJson());
}

// Node's ESM named-import detection (cjs-module-lexer) stops at the first
// non-identifier value: `version: native.version` stays last.
module.exports = { scan, scanSync, capabilities, version: native.version };
