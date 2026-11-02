# @supernovae-st/qrcode-ai-scanner-wasm

One portable browser WASM build of the
[qrcode-ai-scanner](https://crates.io/crates/qrcode-ai-scanner) engine —
QR decoding + scannability scoring for artistic / AI-generated QR codes.
Decoding is fully client-side; optional destination checks use only the transport you supply.

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
`--qr-scanner-text`. The [browser API guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/api/wasm.mdx)
describes lifecycle and integration; synthetic browser checks do not qualify a
physical camera or every mobile browser.

## URL destination checks (0.11.0, optional)

`/destination` reports where an encoded `http(s)` URL leads, only when your
application asks. It is plain JavaScript beside the WASM, with no imports, and
runs in browsers, module workers, Node and SSR. Importing it, scanning, and
creating a verifier or a transport send nothing: a request leaves only from
`verifier.resolve()`, `resolveDestination()` or a direct `transport.resolve()`
call, always through a transport your code passed in. `/camera-overlay`
imports `destinationCandidate` to read eligibility and checks a destination
only through a verifier you pass it, from a user action. A result describes
one check of a request chain; it is never a safety, reputation or phishing
verdict.

**Eligibility.** `destinationCandidate(input)` takes a `Detection`, a `Payload`
or a string. It reads the `url` field of a `url`, `gs1_digital_link` or
`me_card` payload. Other payload kinds, `text` included, give `no_url`; a
string is tested as it is, so plain text gives `not_http`. A detection whose
`content.charset` is `unknown` gives `lossy_text`. The value must start with
`http://` or `https://` at its first character (ASCII case ignored), parse as
a WHATWG URL without a user name or password, stay within 16384 UTF-16 code
units, and contain no control character, space or other separator, format
character, default-ignorable code point (a variation selector after an emoji
included) or lone surrogate. Nothing is trimmed, joined or
completed: the URL parser would delete tabs and line breaks, and IDNA would
delete invisible characters inside a host, so checking the parsed form would
request a URL the code does not contain. An ineligible candidate names its
`reason` (`no_url`, `lossy_text`, `not_http`, `control_or_space`,
`invalid_url`, `credentials` or `too_long`) and is never requested. An eligible
one keeps the exact `encodedUrl` apart from its `requestUrl`, the WHATWG
serialization without the fragment that a check requests; show both when they
differ.

**Explicit transports.** Each verifier uses the one transport you pass:

| Factory | Runs in | Behaviour |
| --- | --- | --- |
| `createFetchTransport({ scope: 'network' })` | browsers, module workers | One `GET` from the user's browser: no credentials, no referrer, no cache. |
| `createFetchTransport({ scope: 'fixture', fixtureOrigin })` | browsers, module workers | The same request for tests, refused outside one origin on `127.0.0.1` or `[::1]`. |
| `createEndpointTransport({ endpoint, label })` | browsers, module workers | One same-origin `POST` to your server's `createDestinationEndpoint()`. |
| `createPreparedTransport(entries)` | any runtime | Prepared results for demos and tests; nothing is requested. |
| `createNodeTransport()` from `/destination-node` | Node | A resolver that checks scheme, port and every resolved address on each hop. |

`scope` has no default: `createFetchTransport()` without `'network'` or
`'fixture'` throws a TypeError, so a forgotten option never sends a real
request. On a server runtime (Node, Bun, Deno, an Electron renderer with Node
integration) the fetch transport answers `unavailable` with
`transport_unsupported`, whatever `fetch` you inject; servers use
`createNodeTransport()`. A custom transport implements `DestinationTransport`,
and every observation it returns is validated before it is stored.

```js
import { createDestinationVerifier, createEndpointTransport, destinationCandidate }
  from '@supernovae-st/qrcode-ai-scanner-wasm/destination';

// In client code: a '/path' endpoint resolves against the page's location, so
// creating it on a server, during server rendering included, throws a TypeError.
const verifier = createDestinationVerifier({
  transport: createEndpointTransport({ endpoint: '/api/destination', label: 'App server' }),
});

// Only from an explicit user action, such as a "Check destination" button:
const candidate = destinationCandidate(detection);
if (candidate.eligible && verifier.canResolve) {
  const snapshot = await verifier.resolve(candidate);
  const observed = snapshot.state === 'resolved' && snapshot.provenance !== 'simulated';
  // Show snapshot.finalUrl as text beside snapshot.transport.label; never link it.
}
```

**Result model.** `verifier.get(target)`, the promise of `verifier.resolve()`
and each change sent to `verifier.subscribe()` listeners carry a frozen
snapshot with the same 18 keys in every state: `unverified`, `resolving`,
`resolved`, `failed`, `canceled` or `unavailable`, the last three with a
`reason` code. A resolved snapshot holds the observed `finalUrl` and `status`,
`redirected`, `changed` (whether `finalUrl` differs from `requestUrl`), and the
observed `redirects` steps with their `hopCount`, both `null` when the
transport cannot see the chain. An attempt made through a transport names it
(`transport.kind`, `transport.label`) and gives its `provenance` and
`requestSent` (`true`, `false`, or `null` when it cannot be known), with
`startedAt`, `settledAt` and `durationMs` from the verifier's own clocks.
`detail` is English text of at most 300 code points: fixed sentences from the
built-in transports, but a custom transport's or a prepared entry's own text,
with control and invisible formatting characters replaced. Only
`DESTINATION_POLICY.detailSentences` cross the endpoint wire. Translate the
`reason` codes for users. The store keeps one entry per exact `encodedUrl`,
joins a repeated `resolve()` to the attempt in flight, keeps a settled result
until the next `resolve()`, `forget()`, `clear()` or eviction, and bounds its
work (by default 2 attempts running, 16 queued, 64 entries).
`createDestinationSelection(verifier)` derives the view of the selected code
from the store, so a late result for one code never appears under another.

**Observed URLs are text.** `finalUrl`, each redirect step's `url` and
`location`, and `requestUrl` are observations. Render them as text, never as a
link, a navigation target or an open action. Each observed URL is a canonical
http(s) URL without credentials; a refused redirect reports only its
`refusedScheme`. The fetch, endpoint and Node transports put no socket address,
response body or header other than the redirect `Location` in a result; a
custom transport's or a prepared entry's `detail` is its own text.

**Simulated is not observed.** `createPreparedTransport()` results have
`provenance: 'simulated'` and `requestSent: false`; never present them as
observations. Before showing a destination as observed, test
`snapshot.state === 'resolved' && snapshot.provenance !== 'simulated'`, and
show `snapshot.transport.label` beside it. Each transport declares a provenance
ceiling (`network`, then `fixture`, then `simulated`): an observation that
claims more than its transport's ceiling is stored as `unavailable` with
`invalid_observation`, never upgraded.

**Limits.**

- A check is a real request. It can count a visit, use up a scan cap, consume
  a one-time link or trigger any other effect a server attaches to a `GET`.
  Nothing here checks on scan or navigates; start checks only from an explicit
  user action.
- Results depend on the observer: IP address, region, language, user agent and
  time can change a route. By default the Node resolver identifies itself as
  `qrcode-ai-scanner-destination-bot/1` (its `userAgent` option), and some
  services answer bots differently from browsers.
- The fetch transport can read a response only when the destination allows
  CORS, which most sites do not. The result is then `unavailable` with
  `opaque_network_error` and `requestSent: null`, because the request may
  still have reached the server. After a redirect the browser hides the chain
  (`redirects` and `hopCount` are `null`), and it follows up to 20 redirects
  whatever `maxHops` says. Before sending, the transport checks only the first
  URL (bad ports, non-public address literals, special-use names, mixed
  content); name resolution and every redirect, including one into a private
  network, are left to the browser. Every request carries the user's IP
  address and the page's `Origin`.
- Response bodies are never read: meta refresh, JavaScript redirects and page
  content stay invisible.
- The address, name and port tables are a dated snapshot
  (`DESTINATION_POLICY.snapshot`).
- No Safari/WebKit or physical-device behaviour is claimed.

**Server use.** `/destination-node` is for Node only, tested on Node 22 and 24.
Its package export has a
`node` condition alone, so a browser build fails to resolve it, and its
transport answers `transport_unsupported` under Bun or Deno.
`createNodeTransport()` follows redirects itself and applies its policy on
every hop: http(s) only, ports 80 and 443 by default, special-use names
refused, every DNS answer vetted, public addresses only, proxy settings
ignored, certificate checks always on. `createDestinationEndpoint()` serves
`createEndpointTransport()` from your own origin:

```js
import { createDestinationEndpoint, createNodeTransport }
  from '@supernovae-st/qrcode-ai-scanner-wasm/destination-node';

const handler = createDestinationEndpoint({
  transport: createNodeTransport(), // one per process
  allowedHosts: ['app.example.com'],
});
// Before any body parser, on the page's own origin, behind your session check:
// app.post('/api/destination', requireSession, rateLimit, handler);
```

The endpoint lets callers make your server send requests, even with that
policy. Authenticate callers, limit their rate, keep URLs out of logs, and add
your network's NAT64 prefix and denied ranges; the
[security guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/concepts/security.mdx)
lists the policy and the operator's duties. The package is AGPL-3.0-or-later:
running a modified version of it, this resolver included, as a service that
users reach over a network brings the AGPL's source obligations (section 13).
[LICENSING.md](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSING.md)
describes the licensing options. This is a licensing note, not legal advice.

License: AGPL-3.0-or-later · © SuperNovae Studio · part of
[qrcode-ai.com](https://qrcode-ai.com).
