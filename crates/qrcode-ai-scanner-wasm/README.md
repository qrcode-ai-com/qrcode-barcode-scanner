# @qrcode-ai-com/qrcode-barcode-scanner-wasm

One portable browser WASM build of the
[qrcode-barcode-scanner](https://crates.io/crates/qrcode-barcode-scanner) engine —
QR decoding + scannability scoring for artistic / AI-generated QR codes.
Decoding is fully client-side; optional destination checks use only the transport you supply.

## Automatic loading, including module workers

```js
import { loadScanner } from "@qrcode-ai-com/qrcode-barcode-scanner-wasm/auto";

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
import { createScannerLoader } from "@qrcode-ai-com/qrcode-barcode-scanner-wasm/auto";
const retry = createScannerLoader();
const scanner = await retry();
```

The factory also accepts an optional `wasmUrl` for an asset pipeline that
cannot process package URLs. Keep that override on the same exact package
version. Standard Vite/module-worker use needs no URL override. `variant`
accepts `"auto"`, `"portable"` and `"compatible"`, the 0.10 name of this same
no-SIMD feature set; any other value, `"simd"` included, rejects with
`invalid_options`. The 0.10 `compatible/` export paths were removed: import the
package root instead, and `variant: "compatible"` still selects this module.

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
import init, { capabilities, scan_image, scan_frame } from "@qrcode-ai-com/qrcode-barcode-scanner-wasm";

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

`/camera` captures camera frames and follows the codes found in them:
`createCameraScanner`, `createDetectionTracker`, `projectVideoGeometry`,
`projectVideoPoint`, `contentKey`, `sameContent`, `TRACKER_LIMITS` and
`CameraScannerError`. `/camera-overlay` draws the tracked codes over the video
and shows the selected one exactly: `createCameraOverlay`, its pure helpers,
`DEFAULT_LABELS`, `TRACK_COLORS` and `CAMERA_OVERLAY_CSS`. Neither needs a UI
framework. Importing either requests no camera, touches no DOM and starts no
timer, so both import safely during server rendering. Decoding stays in your
module worker: the controller hands it the RGBA pixels of each frame and never
creates a decoder of its own.

```ts
import { createCameraScanner, createDetectionTracker }
  from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/camera';
import { createCameraOverlay }
  from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/camera-overlay';

// The container holds the video and is positioned (position: relative, for example).
const overlay = createCameraOverlay({
  video,
  container,
  mount: { rail: railSlot, readout: readoutSlot }, // recommended: below the video
});
const tracker = createDetectionTracker({
  onChange: (snapshot) => overlay.update(snapshot), // every snapshot, in order
  onError: reportUiError,
});
let worker = await startWorker(); // loads /auto once; each request calls scan_frame
const camera = createCameraScanner({
  video,
  tracker, // updated before onResult, reset whenever a capture session ends
  scanFrame: (rgba, width, height, { signal, frame }) => {
    // Copy pixels only when a thumbnail is due, before the buffer is transferred.
    if (overlay.wantsFrameImage()) {
      overlay.setFrameImage(new ImageData(new Uint8ClampedArray(rgba), width, height), frame);
    }
    return worker.scan(rgba, width, height, { signal });
  },
  recover: async (_cause, { signal }) => {
    worker.terminate();
    worker = await startWorker({ signal });
  },
  onState: (change) => showCameraState(change),
  onError: (error) => showCameraError(error.code),
});

// From the camera button: the camera needs a secure context (HTTPS or localhost).
await camera.start();

// On unmount, in any order:
camera.stop();
tracker.destroy();
overlay.destroy();
```

`startWorker()` and `worker.scan()` are yours. The worker loads `/auto` once and
answers each request with `scan_frame(rgba, width, height)`, which uses the
`frame` profile; `worker.scan()` returns a promise of that `ScanReport`.
Transfer `rgba.buffer` to the worker rather than copying it. The package's
`examples/scanner.worker.js` is such a worker, and `examples/camera.js` wires
these parts in a page (see Examples below). Keep one loaded scanner for every
frame and every image you scan: image scanning and the camera then share one
WASM module and one initialization.

**Aztec codes.** The engine reads an Aztec code only when the code lies over
the center of the image it scans, in every profile, so an Aztec code off to
one side of a camera frame goes unread: ask users to center it.

**Capture.** `start()` opens the camera. `state` is `idle`, `starting`,
`running`, `recovering`, `stopped` or `failed`, and `onState` receives every
transition with its `reason` and every change of `muted` or `stalled`. Frames
follow `requestVideoFrameCallback` where the browser has it, otherwise a timer
that skips a capture whose sampled pixels have not changed. The scanned frame's
long edge is capped at `maxDimension` (1280 by default; a smaller cap is faster
but can lose narrow barcodes), the next frame is requested `intervalMs` (100)
after each result, and one decode is in flight at a time, across stops and
restarts. A decode slower than `decodeTimeoutMs` (5000) aborts
`context.signal`, the only abort the controller makes: your adapter must then
terminate its worker before it rejects, and never settle while the decoder
still works. With `recover`, the state becomes `recovering` until your
replacement decoder is ready, at most `maxRecoveries` (2) times per session,
each within `recoverTimeoutMs` (20000); without it, a timeout fails the
session. `stop()`, a hidden page, `pagehide` and an ended track release the
camera and discard late permission answers and results; call `start()` again
once the page is visible. `setConstraints()` switches cameras; the default
constraints are `{ facingMode: { ideal: 'environment' } }`.

A failed session sends one `CameraScannerError` to `onError`, and a `start()`
still pending rejects with that same error. Its `cause` keeps the native error,
and its `code` is `unsupported` (no `getUserMedia`, outside a secure context for
example), `permission_denied`, `device_not_found`, `device_busy`,
`constraints_unsatisfied`, `start_failed`, `play_failed`, `canvas_unavailable`,
`stream_ended`, `decode_failed`, `decode_timeout`, `recover_failed` or
`callback_failed` (a throw from `onResult` or `tracker.update` fails the
session; one from `onState` or the tracker's reset is only reported).

**Tracking.** `createDetectionTracker()` follows each measured copy of a code
from frame to frame: two printed copies of one content are two spatial tracks,
and a read without a measured position becomes a content track, which claims no
position. A track keeps its `id` and its display `slot` for life, and decoded
results (`snapshot.results`, one per content) are kept apart from the tracks. A
`ScanReport` proves a code gone only when its trace shows no budget cut and no
read or detection saturation, and one copy of a code still read gone only when
its occurrences are not saturated either; a bare array of detections proves
nothing unless you pass `{ complete: true }`. To filter a report, pass
`{ ...report, detections: kept }` and choose `kept` by content, never by
position. Outlines and identities expire by time, not by counting reports.
`update()`, `snapshot()`, `advance()`, `reset()` and `clear()` each return a new
`TrackerSnapshot` object, whose `detection` fields are the engine's objects, by
reference; a successful `forget(id)` returns `true` and sends its snapshot to
`onChange`.

| Option | Default | Meaning |
| --- | --- | --- |
| `smoothing` | `0.35` | weight of each new measurement; `{ kind: 'none' }` turns smoothing off |
| `staleMs` | `1200` | geometry older than this is withheld, and tracked or held tracks become lost |
| `reacquireMs` | `2000` | how long an identity survives without new evidence; at least `staleMs` |
| `maxMisses` | `1` | consecutive complete misses shown as held before a track is lost |
| `retainMs` | `Infinity` | how long a result without a live track is kept; at least `reacquireMs` |
| `maxResults` | `32` | results kept; at least 16 |

`holdMs`, which earlier 0.11 development builds accepted, now throws a TypeError
that names `staleMs` and `reacquireMs`.

**Slow devices.** A frame keeps its geometry only when its result arrives less
than `staleMs` after the frame's `observedAt`. A later result still updates the
decoded results, but it moves no outline: the spatial tracks of that code age,
turn lost and lose their outlines until faster frames return. If capture,
transfer and decoding can take that long where your page runs, raise `staleMs`,
and `reacquireMs` with it, since it must stay at least `staleMs`. The cost: when
the evidence stops (a stalled camera, a hung decoder, reports cut by their
budget), an outline stays at its last measured position for up to `staleMs`.

**Overlay.** `createCameraOverlay({ video, container })` draws from tracker
snapshots: one rounded four-corner outline for each valid measured quad, a line
for a scan line and dots for partial points. It never invents a rectangle, and
draws nothing for a content track, a lost track or geometry the tracker
withheld. Each track keeps a number (`slot + 1`) and a color
(`TRACK_COLORS[slot % 8]`) for life, and a code measured entirely outside the
visible area gets a numbered badge at the edge of the view. Deliver every
`onChange` snapshot, in order: an older snapshot is ignored, an array throws a
TypeError, and after `destroy()` an update does nothing. The scene, the rail
and the readout share one selected code, chosen automatically until the user
picks one or you call `select(id)`; `select(null)` returns to automatic choice,
and `select()` returns `false` for an unknown id. Dimming and blur, and a color
wash that is off by default (`effects`), leave sharp cutouts only around quads
that were precise in two consecutive frames, and never dim or blur a marked code
that the focus mode covers. They switch on after `dwellMs` of steady
eligibility, and `focus: 'off'` disables them. They never touch the video or the
capture canvas, so the decoder reads the same pixels. The readout shows the
exact symbology label, its family, the payload kind and the complete decoded
text, with invisible characters shown as named chips; the ECI, FNC1 and the
exact bytes in Details; GS1 fields and issues verbatim; and, for an `http:` or
`https:` URL, the encoded URL exactly as decoded with an Open link button.

**Layout.** The overlay covers the video's content box inside `container`,
which must contain the video and be positioned. It follows the video's computed
`object-fit` (`contain`, `cover`, `fill`, `none` or `scale-down`),
`object-position` and a horizontal mirror such as `transform: scaleX(-1)`; the
`fit`, `position` and `mirror` options override what it reads.
`overlay.alignment`, also `data-alignment` on the overlay root, is `aligned` or
the first problem found: `no-frame`, `no-size`, `unsupported-transform`,
`object-view-box`, `unsupported-fit`, `unsupported-position`, `no-media` or
`frame-mismatch`. Anything but `aligned` hides the markers and effects rather
than drawing them in the wrong place; the rail and the readout stay. The
container and its ancestors may carry a positive uniform scale and a
translation, and between the container and the video only a translation or a
horizontal mirror is allowed. Call `layout()` after a stylesheet-only change
elsewhere, and keep `opacity`, `filter`, `mask`, `clip-path` and
`mix-blend-mode` off the overlay root (`[data-qr-camera-overlay]`). The rail
and the readout render inside the video in a `regular`, `compact` or `minimal`
arrangement, or wherever you `mount` them; mounting both below the video keeps
every code visible and tappable. `rail` is `'auto'`, `'multiple'`, `'always'`
or `'never'`; with `rail: 'never'` and `readout: false`, provide your own
control that calls `select()`.

**Theming.** The overlay reads these custom properties and never declares them:
`--qr-scanner-color-0` to `--qr-scanner-color-7` (the track colors, by
`slot % 8`), `--qr-scanner-color-0-text` to `--qr-scanner-color-7-text` and
`--qr-scanner-action-text` (the numbers drawn on them; keep a contrast of at
least 4.5:1), `--qr-scanner-highlight` (every track with `colors: 'mono'`),
`--qr-scanner-casing`, `--qr-scanner-surface` and `--qr-scanner-text` (the rail
and the readout; override both together) and `--qr-scanner-focus`. `scheme`
(`'dark'` by default) sets the overlay's `color-scheme`. The overlay injects one
`<style>` element per document or shadow root; under a strict `style-src`, pass
the policy's nonce as `styleNonce`, or pass `styles: 'none'` and serve
`CAMERA_OVERLAY_CSS` in your own stylesheet. Per-element values go through the
CSSOM, never a `style` attribute.

**Accessibility.** The rail is a toolbar holding one radio group: Tab reaches it
once, the arrow keys, Home and End move the focus, Enter or Space selects, and a
digit selects codes 1 to 9 while the focus is in the rail or the readout. Escape
closes the full readout card. A visually hidden status region announces the
selection, the loss and return of the selected code and the outcome of each
action, never decoded content unless you set `announceContent: 'preview'`.
Reduced motion removes the animations, and forced colors remove the dimming,
wash, blur and glow. Buttons and rail entries measure at least 44 by 44 CSS
pixels, and the selected entry carries a check mark: color is never the only
cue.

**Labels.** `labels` overrides `DEFAULT_LABELS`, the frozen English defaults,
key by key at every depth; a key you leave out keeps its default. Set `lang` to
the language of your labels. The browser API guide gives a French set of every
label except the symbology names, which stay as they are.

**Destinations.** The readout shows a destination slot for the URL of a `url`,
`gs1_digital_link` or `me_card` payload. Without `destinations` it reads
"Destination not checked" and offers no check. To let users check one, pass a
verifier from `/destination` (next section) as `destinations`: a check starts
only when the user presses Check destination, and nothing is checked on scan or
opened. A result is an observation of one request chain, never a safety
verdict, and every URL in it renders as text. `destroy()` unsubscribes from the
verifier but cancels no attempt. To render your own destination row instead,
pass `destinationSlot: false` and, in `onSelect`, call
`selection.select(overlay.detection)` on a `createDestinationSelection(verifier)`
binder.

**Copy and Open.** Copy writes the exact decoded text with
`navigator.clipboard.writeText()`, and Details also offers Copy bytes, the exact
bytes as uppercase hexadecimal, for platforms that cut a text clipboard at
U+0000 or rewrite line endings. Open appears only for an `http:` or `https:`
URL, and a click calls `window.open(href, '_blank', 'noopener,noreferrer')`;
nothing opens by itself. `onAction(action)` runs before each open, copy, check
and cancel, and `action.preventDefault()` skips the overlay's own call.

**Thumbnails.** With `thumbnails: true`, rail entries show a crop of each code
from the frame the decoder read. The overlay never reads the video for them: in
`scanFrame`, ask `overlay.wantsFrameImage()`, and only when it returns `true`
pass a copy to `overlay.setFrameImage(image, frame)`, as the wiring above does.
Pass an `ImageData` or an `ImageBitmap`, never a canvas.

The [browser API guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/wasm.mdx)
covers each part in full. Checks in automated browsers do not qualify a
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
  from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/destination';

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
  `qrcode-barcode-scanner-destination-bot/1` (its `userAgent` option), and some
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
  from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/destination-node';

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
[security guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/concepts/security.mdx)
lists the policy and the operator's duties. The package is AGPL-3.0-or-later:
running a modified version of it, this resolver included, as a service that
users reach over a network brings the AGPL's source obligations (section 13).
[LICENSING.md](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSING.md)
describes the licensing options. This is a licensing note, not legal advice.

## Examples

The package ships runnable examples in `examples/`. The pages load the
package's own files by relative path (`../auto.js`), with no bundler, framework
or download.

- `examples/headless.html`, with `headless.js`, scans an image you choose or
  drop. The image is decoded in a module worker on your device and never
  uploaded, and decoded links are shown as text, never opened. The page names
  the package version, the SHA-256 of its WASM module and the version the
  loaded module reports.
- `examples/camera.html`, with `camera.js`, wires `createCameraScanner`,
  `createDetectionTracker` and `createCameraOverlay` as an application would.
  The camera opens only when you press its button, every tracker snapshot
  reaches `overlay.update(snapshot)`, a frame is copied only when
  `overlay.wantsFrameImage()` asks, and a hung frame replaces the worker
  through `recover`. Open is turned off, and destination checks stay off until
  you turn them on.
- `examples/scanner.worker.js` is the module worker both pages use: it owns one
  scanner and answers `load`, `scan_image` and `scan_frame` requests by `id`.
- `examples/ssr.mjs` imports `/camera`, `/camera-overlay` and `/destination` in
  Node, with each DOM, camera and network global it lists replaced by a trap,
  and prints what a server can compute with them.

Module scripts and module workers do not run from a `file://` page. Serve the
package folder, the one that holds `package.json`, with a static server on
localhost that sends `.js` files with a JavaScript type, for example from a
project that installed the package:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory node_modules/@qrcode-ai-com/qrcode-barcode-scanner-wasm
```

Then open `http://127.0.0.1:8000/examples/headless.html` or
`http://127.0.0.1:8000/examples/camera.html`. The camera page needs a secure
context: `localhost` and `127.0.0.1` count as one on the machine that runs the
browser; from another device, such as a phone, serve the folder over `https`.
Run the server-rendering example with
`node node_modules/@qrcode-ai-com/qrcode-barcode-scanner-wasm/examples/ssr.mjs`.
[examples/README.md](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/crates/qrcode-ai-scanner-wasm/examples/README.md),
also in the installed package, describes each example and the worker's
messages.

### Content Security Policy

Both example pages scan with no violation reported when a server sends
`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; img-src blob: data:`,
plus a `style-src` hash of the image page's one inline `<style>` element, as a
`Content-Security-Policy` header with every file of the package folder.
[examples/README.md](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/crates/qrcode-ai-scanner-wasm/examples/README.md#content-security-policy)
gives that exact policy, why each source is needed, and how the package's
browser job found it in Playwright's Chromium and Firefox. For a policy of your
own:

- Compiling the WebAssembly module needs `'wasm-unsafe-eval'` in `script-src`
  in the policy of the context that compiles it; otherwise the browser refuses
  to compile it. A module worker loaded from its own URL takes its policy from
  the headers of that script's response: a page's `meta` policy, such as the
  one each example page carries, does not reach it.
- `/auto` imports the package's own module and fetches only its `.wasm` file,
  next to it unless you pass `wasmUrl`, so `connect-src`, or `default-src`
  when `connect-src` is absent, must allow that origin.
- The overlay injects one `<style>` element, which needs `styleNonce` or
  `styles: 'none'` with `CAMERA_OVERLAY_CSS` in your own stylesheet, and sets
  every other value through the CSSOM.
- A destination check requests only what its transport targets. Through
  `createFetchTransport()`, the page's `connect-src` must allow the link's
  origin, for example `connect-src 'self' https:`; otherwise the browser
  blocks the check before sending it, and the readout shows it as unavailable.

### SIMD, bundlers and server rendering

- **SIMD.** The package ships one module, which uses no SIMD, so a browser with
  WebAssembly SIMD disabled loads the same bytes; `scannerCapabilities().simd`
  is a diagnostic only. The package's browser job runs both example pages from
  the installed package in Playwright's Chromium and Firefox, and in CI also
  in a Chromium started with WebAssembly SIMD disabled. Those runs say nothing
  about Safari, iOS or Android.
- **Bundlers.** The examples need no bundler. In a bundled application, import
  the entries by name (`/auto`, `/camera`, `/camera-overlay`, `/destination`):
  the loader finds its `.wasm` through `import.meta.url`, and the package's CI
  builds a fresh Vite application with a module worker from the installed
  package. The browser API guide lists the bundler settings, and
  [Use a bundler](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/crates/qrcode-ai-scanner-wasm/examples/README.md#use-a-bundler)
  shows the example pages' imports by package name.
- **Server rendering.** Importing `/auto`, `/camera`, `/camera-overlay` and
  `/destination` during server rendering compiles no WebAssembly, fetches
  nothing and touches no DOM; the package's CI imports them in Node with
  `WebAssembly` undefined and checks that `fetch` is never called, and
  `examples/ssr.mjs` shows the camera, overlay and destination helpers a server
  can call. Load the scanner in the browser or a worker, and start the camera
  in the browser: where WebAssembly is missing, `loadScanner()` rejects with
  `wasm_unavailable`.

Releases up to 0.10.1 were published as `@supernovae-st/qrcode-ai-scanner-wasm`.

Part of [QR Code AI](https://qrcode-ai.com/). Scan online with the
[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) or the
[barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner).

License: AGPL-3.0-or-later · © SuperNovae Studio.
