# @supernovae-st/qrcode-ai-scanner-wasm

One portable browser WASM build of the
[qrcode-ai-scanner](https://crates.io/crates/qrcode-ai-scanner) engine —
QR decoding + scannability scoring for artistic / AI-generated QR codes,
fully client-side, no server roundtrip.

## Automatic loading, including module workers

```js
import { loadScanner } from "@supernovae-st/qrcode-ai-scanner-wasm/auto";

const scanner = await loadScanner();
const report = scanner.scan_image(pngBytes, "full");
const loadedVariant = scanner.variant; // "portable"
const scannerVersion = scanner.version();
```

Run this same code inside a module Worker for UI responsiveness. Capability
detection runs in that worker's realm before the scanner is compiled. It uses
small real WASM validation probes, never user-agent, browser-version or CPU
guesses. The package holds one module and it uses no SIMD, so an engine without
SIMD loads the same bytes as every other supported engine.
`scannerCapabilities().simd` remains a diagnostic only.

Vite resolves the one literal asset URL at build time; nothing is fetched before
the loader is called. No remote service is involved. Importing `/auto` is safe
during SSR; calling it requires browser/worker WebAssembly and fetch support.
The root import below loads the same module through wasm-pack's default
initialization and `initSync`; `/auto` adds the feature checks and typed
errors. Use `/auto` in both the worker and any main-thread fallback.

Concurrent or repeated `loadScanner()` calls share one promise and instance.
An initialization rejection also stays cached. There are no automatic retries,
reloads, or blind fallbacks after a network/compiler error. For an explicit
user-initiated retry, create one fresh loader:

```js
import { createScannerLoader } from "@supernovae-st/qrcode-ai-scanner-wasm/auto";
const retry = createScannerLoader();
const scanner = await retry();
```

The factory also accepts an optional `wasmUrl` for an asset pipeline that
cannot process package URLs. Keep that override on the same exact package
version. Standard Vite/module-worker use needs no URL override. `variant`
accepts `"auto"`, `"portable"` and `"compatible"`, the 0.10 name of this same
no-SIMD feature set; any other value, `"simd"` included, rejects with
`invalid_options`. The 0.10 export paths `compatible/qrcode-ai-scanner.js` and
`compatible/qrcode-ai-scanner_bg.wasm` resolve to the same portable files.

`ScannerInitError` carries a stable `code`, selected `variant`, optional HTTP
`status`, and original `cause`. Codes distinguish `wasm_unavailable`,
`wasm_features_unsupported`, `loader_import_failed`, `asset_network_failed`,
`asset_http_failed`, `asset_read_failed`, `binary_invalid`,
`wasm_validation_failed`, `wasm_compile_failed`, `wasm_instantiate_failed` and
`invalid_options`. Preserve the native cause for diagnosis; do not label every
compile failure as a browser or CPU incompatibility. These are JS loading
diagnostics, separate from the unchanged Rust/report/QRS error contract.
Serialize stable fields explicitly when crossing a worker boundary.
`binary_invalid` means the bytes lack a valid WASM magic/version header.
`wasm_validation_failed` retains ambiguity between malformed code and unexpected
requirements in a wrong/stale asset. Inspect its native cause and the actual
failing bytes rather than guessing a feature or CPU incompatibility.

The portable build is **not an MVP-only WASM binary**. Automatic loading uses
a conservative supported baseline: mutable globals, bulk memory, sign extension,
nontrapping float-to-int, multivalue and reference types. The probe tests these
together; it is not a measurement of the optimized binary's minimum requirements:

```wat
(module
  (memory 1) (table 1 funcref)
  (global (export "g") (mut i32) (i32.const 0))
  (func (result i32 i32)
    i32.const 0 i32.extend8_s drop
    f64.const 0 i32.trunc_sat_f64_s drop
    i32.const 0 i32.const 0 i32.const 0 memory.copy
    ref.null func drop
    i32.const 0 i32.const 0))
```

The owning build script compiles this crate and every dependency with SIMD
disabled, restricts optimization to that feature profile, then validates the
optimized module with SIMD forbidden. The package's `build-info.json` records
the module's SHA-256, the features its code actually uses (read instruction by
instruction), a digest of the compiled sources and locks, the build recipe and
the tool versions; the release inspection refuses a package whose bytes, inputs
or features disagree with it. Inspect each actual artifact before attributing a
failure to a feature: the 0.11.0 module's code uses bulk memory, sign extension
and nontrapping float-to-int, and Binaryen validation fails without each of
them. Mutable globals, multivalue and reference types complete the declared
loader baseline, a support policy rather than evidence that an unknown failing
asset uses all six features. Compatibility claims require actual browser
evidence; this path alone does not qualify historical browser floors, real
Safari, mobile devices, arbitrary CSP rules, or a consumer's deployed binary.

## Direct entry

```js
import init, { capabilities, scan_image, scan_frame } from "@supernovae-st/qrcode-ai-scanner-wasm";

await init(); // loads the wasm module once

// canvas/upload verification (the generator quality-gate path)
const report = scan_image(pngBytes, "fast");
const ok = report.detections.length > 0;
// null = no judgment, never a zero: with trace.budget_exhausted the budget
// cut it (argument #5, budget_ms: 0 = unbounded, scans without a cut; the
// clock starts once the image is decoded). Out-of-domain numbers throw
// [QRS-006]: a cap that is not a whole number from 1, a budget above
// 4294967295 ms (spec/02-profiles.md § Option domains)
const score = report.score?.value ?? null;
const judged = report.score !== null || !report.trace.budget_exhausted;

// live camera (ImageData — no PNG roundtrip)
const frame = ctx.getImageData(0, 0, w, h);
const live = scan_frame(new Uint8Array(frame.data.buffer), w, h);
// after profile and budget_ms, scan_frame takes scan_image's other options:
// max_dimension, max_pixels, score_skip_axes, score_skip_checks,
// alpha_background, alpha_palette, score_preset (same domains and errors)

// the readers compiled into the module: versions, engines, symbologies
// (which readers are included, not that an image decodes)
const { engines, symbologies } = capabilities();
```

Same versioned `ScanReport` contract as the native package — detections,
0-100 score with per-axis survival, synthetic UEC margin, actionable hints.

## Camera and visual selection (0.11.0)

`/camera` exports `createCameraScanner`, `createDetectionTracker` and
`projectVideoPoint`. `/camera-overlay` exports `createCameraOverlay`: measured
corner brackets, stable keyboard selection and an explicit HTTP(S) payload
action, without a UI framework dependency. No permission prompt or network
request occurs on helper import.

```ts
import { createDetectionTracker, createCameraScanner }
  from '@supernovae-st/qrcode-ai-scanner-wasm/camera';
import { createCameraOverlay }
  from '@supernovae-st/qrcode-ai-scanner-wasm/camera-overlay';

const tracker = createDetectionTracker();
// container contains video and has position:relative; object-position:center.
const overlay = createCameraOverlay({ video, container });
const camera = createCameraScanner({ video, scanFrame: scanFrameInWorker,
  onResult(report, frame) {
    overlay.update(tracker.update(report.detections, frame), frame);
  }, onError: showCameraError });
await camera.start(); // call from the camera button
// Component teardown: camera.stop(); tracker.clear(); overlay.destroy();
```

Provide a worker adapter returning a `ScanReport` promise. It calls `scan_frame`
with the transferred RGBA buffer, dimensions and frame budget. Give it a timeout
for hung requests. The capture helper serializes requests across restarts,
invalidates late permission/results, releases tracks on stop/hide/departure and
reports ended streams. The default capture limit is 1280 pixels on the long
edge; increase it for narrow barcodes when device performance permits.

Feed empty results as well as detections into the tracker to expire holds.
Missing or degenerate geometry stays absent. The overlay supports centered
contain/cover/fill, explicit mirroring, reduced motion and localized `labels`.
Theme it through `--qr-scanner-highlight`, `--qr-scanner-surface` and
`--qr-scanner-text`. The [browser API guide](https://github.com/supernovae-st/qrcode-barcode-scanner/blob/main/docs/api/wasm.mdx)
describes lifecycle and integration; synthetic browser checks do not qualify a
physical camera or every mobile browser.

License: AGPL-3.0-or-later · © SuperNovae Studio · part of
[qrcode-ai.com](https://qrcode-ai.com).
