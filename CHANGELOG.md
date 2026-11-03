# Changelog

All notable changes to this workspace. Every surface versions together — the Rust
crate + CLI, the npm node + wasm packages, the Python wheel, and the
Kotlin/Android · Swift/iOS · Flutter bindings.

## 0.11.0 — 2026-10-31

### Package names

- From 0.11.0 the packages carry the QR Code & Barcode Scanner family names,
  one per registry. Each new name is versioned from its first release under
  that name, 0.11.0:
  - Rust library: `qrcode-ai-scanner` becomes `qrcode-barcode-scanner` on
    crates.io, imported as `qrcode_barcode_scanner`.
  - Command line: `qrcode-ai-scanner-cli` becomes `qrcode-barcode-scanner-cli`
    on crates.io. Both crates install the `qrscan` command, so uninstall the
    former one first.
  - Node: `@supernovae-st/qrcode-ai-scanner` and its six platform packages
    become `@qrcode-ai-com/qrcode-barcode-scanner` and
    `@qrcode-ai-com/qrcode-barcode-scanner-<suffix>` on npm, with the same six
    suffixes. The addon file is `qrcode-barcode-scanner.<suffix>.node`.
  - Browser: `@supernovae-st/qrcode-ai-scanner-wasm` becomes
    `@qrcode-ai-com/qrcode-barcode-scanner-wasm` on npm. Its module files are
    `qrcode-barcode-scanner.js`, `qrcode-barcode-scanner.d.ts` and
    `qrcode-barcode-scanner_bg.wasm`, and the `compatible/` paths are gone
    (browser upgrade note, under Changed).
  - Python: `qrcode-ai-scanner`, last released as 0.9.0, becomes
    `qrcode-barcode-scanner` on PyPI, imported as `qrcode_barcode_scanner`.
  - The `qrscan` archives, new on the GitHub release, are named
    `qrcode-barcode-scanner-cli-0.11.0-*` (under Added).
- Nothing from 0.11.0 on is published under a former name, and there are no
  alias or wrapper packages. Releases up to 0.10.x stay installable under
  their former names and are not modified.
- The rename itself changes no wire value: the JSON report and its
  `versions`, the schema `$id`, the `[QRS-xxx]` codes, the exit codes, the
  `qrscan` flags, the option names and values and the binding function names
  stay as they were.
- The Kotlin binding's Maven coordinate follows the repository: group
  `com.github.qrcode-ai-com`, artifact `qrcode-barcode-scanner`. The UniFFI,
  Kotlin, Swift and Android module names, the repository directories and the
  never-published Cargo packages keep their earlier spelling. The Flutter
  package's pub.dev name and first release are recorded in
  `bindings/flutter/CHANGELOG.md` when it is published there.
- The MCP adapter, the agent skill and the container images keep their
  published names and versions; their next releases take names from the new
  family. No 0.11 image goes to Docker Hub.
- The first version under each new npm name is uploaded by the repository
  owner from the tag run's inspected tarballs, as RELEASING.md describes, so
  npm 0.11.0 carries no npm provenance; later versions are published by CI
  with provenance.
- The migration guide maps each former name to its new one and gives the steps
  for each runtime:
  <https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/guides/migrate-to-qrcode-barcode-scanner.mdx>

### Fixed

- The native Node addon for Windows (`win32-x64-msvc`) links the C runtime
  statically, as `node.exe` does, so it imports no Visual C++ runtime DLL.
  0.10.0's addon imported `VCRUNTIME140.dll`, which a Windows install without
  the Visual C++ Redistributable lacks; GitHub's Windows runners carry it, so
  the consumer jobs could not see the difference.
  `scripts/native-floor.py` reads each release addon's bytes (ELF needed
  libraries and symbol versions, Mach-O load commands and minimum OS, PE
  imports and delay imports). It refuses an addon that needs more than Node
  18 needs on its platform: glibc 2.28, macOS 10.15 on x64 and 11 on arm64,
  no Visual C++ runtime DLL, and no library outside the operating system,
  including one a Mach-O addon loads lazily, weakly, upward or as a
  re-export. `npm-publish` runs it on the packed release set and again on
  the tarballs about to be uploaded. On every pull request CI runs its
  self-test: planted binaries, then the command line on npm tarballs (a
  release set, the same set with a win32 addon importing `VCRUNTIME140.dll`,
  five of six targets, a target twice, no addon).
- A QR code found in the downscaled pyramid no longer suppresses a readable
  neighboring barcode or small matrix code. One budgeted non-QR read at input resolution
  completes QR pyramid results before the early return.
  Regression coverage retains `STOCK-4827` beside a QR in fast, frame and full
  profiles, including the existing browser WASM checks, and adds native exact
  QR/Data Matrix coverage in both placements. Detection identity and QR quality
  scoring remain unchanged. This completion is pipeline 4's change; the release
  publishes pipeline 5 with occurrences (below).
- Equal printed copies of one linear content are no longer collapsed into one
  read. The scanner's copy of rxing 0.9.3's multiple-barcode reader
  (`src/engine/multi_reader.rs`, Apache-2.0 notices kept, `THIRD-PARTY.md`)
  decides duplicates by kind of symbol and by the image's pixels instead of
  point count, normalizes every read's points into the image's frame, reads a
  node again past a read without points, uses one fixed reader order and a
  fresh reader state for each read. All three rxing entry points use it: the
  unrestricted, family and single-format passes; the local DataBar Expanded
  reader; and the rMQR-only pass of score cells and envelope probes.
- The S5 rescue keeps identically damaged twins at different places as
  separate candidates and rescues each place, instead of stopping at the
  first recovered stream.
- An unparsed QR Code read that stands, by its other places or on a parse
  made elsewhere, publishes no copy where a refusal of its content was
  placed: a copy proved malformed is never an occurrence.
- The DataBar Expanded reader clears the rows of its upright pass before the
  rotated pass, so it never assembles a symbol from rows of two frames.
- Preserved the console candidate's Code 93 checksum rejection, small DataBar
  decoding and guarded DataBar Expanded recovery. The consolidated rxing 0.9.3
  adapter retains the local Expanded reader with its Apache-2.0 notices, valid
  positive fixtures and illegal finder-sequence negative vector.
- The complementary non-QR pass masks only measured regions of already admitted
  QR symbols on its cloned plane. This avoids the false Code 39 `J` read from an
  artistic QR's module texture while retaining genuine Code 39 symbols,
  including a one-character `J` alone and beside a QR. Ordinary Code 39 admission
  and scoring on the original image remain unchanged.
- Node and WASM read `budget_ms`, `max_dimension` and `max_pixels` the same
  way (`spec/02-profiles.md` § Option domains). Reproduced on the installed
  0.10.1 packages: Node's integer conversions wrapped `budgetMs: 4294967297`
  to a 1 ms budget, ran `budgetMs: 0.5` unbounded, turned `maxDimension: -1`
  into no size cap and refused every image on `maxPixels: NaN` or `Infinity`;
  WASM ran `budget_ms: 1e300` without a practical bound, also lifted the size
  cap on `max_dimension: -1`, and replaced `max_pixels: 0` or `NaN` by the
  default cap and `Infinity` by none. Both now take doubles through one
  mapping. One table of cases (`scripts/option-domains.mjs`: unset, zero,
  negative, fractional, non-finite, cap-boundary and out-of-range values,
  every refused value also beside an unreadable input) runs on both
  workspace builds and, in the packed Node consumers, on every scan path of
  both installed packages; its self-test refuses those 0.10.1 conversions
  and ten neighbouring defects.
- Node `scan`: a signal aborted while the scan is queued rejects with an
  `AbortError` DOMException, the class a signal already aborted at the call
  gets; the addon's rejection was a plain `Error` named `AbortError`. One
  `AbortSignal` may serve several scans: napi stopped an abort at the
  signal's first task that had completed, so a signal reused after a
  completed scan did not cancel the scans queued behind it. Each scan now
  hands the addon a signal of its own; one listener links them to the
  caller's signal and is removed once the last scan sharing it settles, and
  the caller's `signal.onabort` is no longer replaced. A running scan is
  still not interrupted and settles as if not aborted: its report, or its
  own `[QRS-xxx]` fault. A `signal` that is not an `AbortSignal` rejects
  with `TypeError: options.signal must be an AbortSignal` instead of being
  ignored; `null` still means no signal.
- The core crate's README and rustdoc, the `alpha_palette` field doc and the
  UniFFI `ScanFailed` and `scan` docs name `QRS-006`, an option outside its
  domain. `spec/02-profiles.md` § Option domains gives Rust
  `ScanConfig.budget_ms` its own row: `None` is unbounded and `Some(0)` a
  zero-millisecond budget, while the CLI and the bindings keep `0` =
  unbounded.
- A zero `max_dimension` or `max_pixels` is an option error (`QRS-006`) on
  every surface, no longer a `QRS-002`/`QRS-003` that blamed every image.
- Python `__all__` names each public name once: 0.10 listed `scan` and
  `scan_frame` twice, since PyO3 already appends every added function.

### Added

- `QRS-006` InvalidOption: an option outside its domain, refused before the
  input is read, so it is reported beside unreadable bytes too.
  `ScanConfig::MAX_BUDGET_MS`, `ScanConfig::validate`, `Limits::validate` and
  the `options` module (the JavaScript number mapping both JS packages use)
  are public. The scan deadline uses checked arithmetic: an unrepresentable
  deadline would be `QRS-006`, never a panic or an unbounded scan. The
  suspected native overflow did not reproduce: `Instant + u64::MAX ms` is
  representable on the native clocks, and a test keeps that observation.
- **Occurrences** (`versions.pipeline` 4 → 5). Every detection carries
  `occurrences`: where each physical copy of its content was measured, 1 to
  16, earliest observed first. Two printed copies of one content are one
  detection with two occurrences, never two detections. Each geometry is what a
  reader measured, never completed: `quad` (validated outer corners, clockwise;
  for the QR family the first is the symbol's origin corner in every rotation,
  mirrored or not), `segment` (a linear reader's scan-line points), `partial`
  or `unavailable`, with the `reader` that measured it. rqrr's quads are
  corrected for its pixel-anchor bias, exact at the quarter turns; `corners`,
  `meta` and the score keep their meaning. Copies are grouped by geometry and,
  for linear symbols, by the pixels between scan lines; a pair that cannot be
  decided is never split into an invented copy and is flagged. Rules:
  `spec/01-report.md` § Occurrences.
- `trace.saturation` reports the capacities a scan reached, whatever the budget:
  reads past a walk's capacity or refusal records that failed closed,
  contents past the 16 published detections, incomplete occurrences. A set flag
  means what was left out is unknown, not absent. Both new keys are absent from
  older reports; the JSON Schema, TypeScript, Dart and type-parity gate cover
  them.
- **Camera capture and tracking** (`/camera`, browser package).
  `createDetectionTracker()` follows each measured copy of a code from frame to
  frame: a spatial track per occurrence, with content, occurrence and track
  identities kept apart, and a content track for a read without a position,
  which claims none. Association is deterministic and one-to-one, and
  ambiguity is explicit: a contested track expires with reason `ambiguous` and
  names its successors, and a read without a position that could belong to
  several tracks of one content is reported as `unresolved`, naming them,
  instead of being given to one. Geometry is withheld after `staleMs` and
  identities expire after `reacquireMs`, by time, through one deadline timer. A
  `ScanReport` proves a code absent only through its trace (no budget cut, no
  read or detection saturation, and for one copy of a code still read, no
  occurrence saturation); a bare array of detections never does unless the
  caller passes `{ complete: true }`. Decoded results are kept apart from
  tracks. `update()`, `snapshot()`, `advance()`, `reset()` and `clear()` each
  return a new `TrackerSnapshot` object, whose detections are the engine's
  objects, by reference; a successful `forget(id)` returns `true` and sends its
  snapshot to `onChange`.
  `projectVideoGeometry()` maps a track's geometry into a centered `contain`,
  `cover` or `fill` view and reports `inView`. `createCameraScanner()` captures
  through `requestVideoFrameCallback` where it exists, with its timestamps,
  keeps one decode in flight across sessions, reports its states and a
  `stalled` flag, fails with a `CameraScannerError` code that keeps the native
  cause, aborts a decode after `decodeTimeoutMs` and replaces a hung decoder
  through the optional `recover`, switches devices with `setConstraints()`,
  and, given `tracker`, updates it before `onResult` and resets it whenever a
  session ends. `stop()`, a hidden page and `pagehide` release the camera and
  discard late permission answers and results; importing the module requests
  no camera.
  Since earlier 0.11 development builds: `holdMs` is removed (passing it throws
  a TypeError naming `staleMs` and `reacquireMs`), a frame's `timestamp` is now
  `observedAt`, `update()` returns a snapshot and takes `{ now, complete }`, and
  a bare array no longer proves absence.
- WASM `scan_frame` takes `scan_image`'s other options after `budget_ms`
  (positional #6 to #12): `max_dimension`, `max_pixels`, `score_skip_axes`,
  `score_skip_checks`, `alpha_background`, `alpha_palette` and `score_preset`,
  with the same domains and errors. Calls with five arguments are unchanged;
  a transparent frame flattens over `alpha_background` before luma.
- **Capabilities**: the readers compiled into a build — its report
  `versions`, the decode `engines` (`rxing`; `rqrr` and `rescue`) and the
  `symbologies` they can return, all of them with rxing and `qr_code` alone in
  an rqrr-only build. Rust `Capabilities::current()`, WASM, Node and Python
  `capabilities()` (typed `Capabilities` in TypeScript and the stub), UniFFI
  `capabilities()` as a JSON string, and `qrscan --capabilities`. It says
  which readers are included, not that an image decodes; never part of a
  report. Flutter does not expose it in this release. Rules:
  `spec/01-report.md` § Capabilities. CI also builds the core with one
  engine (rqrr only, rxing only), as a dependency without default features
  gets it, lints each build and runs its capabilities tests.
- **Camera overlay and readout** (`/camera-overlay`, browser package, no
  framework). `createCameraOverlay()` draws from tracker snapshots: one rounded
  four-corner outline per valid measured quad, a line for a scan line and
  points for partial evidence, never an invented rectangle. Dimming and blur
  of the rest of the view keep sharp cutouts over precise quads; they switch
  on after `dwellMs` of steady eligibility and stay off for at least
  `cooldownMs` after switching off, and `focus: 'off'` disables them. It
  follows the video's `object-fit` (`contain`, `cover`, `fill`, `none`,
  `scale-down`), `object-position` and mirroring, with explicit alignment
  states that hide the markers rather than misplace them. It adds stable
  per-track colors and numbers, an accessible rail (one radio group, keyboard
  and digit shortcuts, a status announcer that leaves decoded content out by
  default) and an exact readout: 19 symbology labels, the family, the payload
  kind, the complete content with invisible characters shown by name, ECI,
  FNC1 and the exact bytes, GS1 fields, and the encoded URL with an Open
  button and a destination slot that starts unchecked and checks only through
  a `/destination` verifier the application passes, from a user action.
  Labels (`DEFAULT_LABELS`), colors (`--qr-scanner-*` properties) and the
  stylesheet (`styleNonce`, or `styles: 'none'` with `CAMERA_OVERLAY_CSS`) are
  replaceable. Optional thumbnails crop the scanned frame, and the page copies
  a frame only when `wantsFrameImage()` asks. Pure helpers are exported:
  `describeDetection`, `segmentText`, `symbologyFamily`, `parseObjectPosition`,
  `overlayMediaRect`, `projectOverlayPoint`, `projectOverlayGeometry`,
  `quadOutline` and `quadRegion`. Since earlier 0.11 development builds:
  `update(snapshot)` takes one tracker snapshot instead of tracks and a frame,
  ignores one older than the last applied and does nothing after `destroy()`;
  default names are `Code N` for every symbology; the readout replaces the
  pill, and Open is a button; `select()` returns a boolean; and
  `--qr-scanner-highlight` colors only `colors: 'mono'`, each track otherwise
  taking its own color.
- **URL destination checks** (optional, JavaScript only). The browser
  package's `/destination` entry (no imports; browsers, module workers, Node
  and SSR) decides with `destinationCandidate()` whether the `url` of a `url`,
  `gs1_digital_link` or `me_card` payload, or a given string, is a checkable
  http(s) URL: `http://` or `https://` at its first character, a WHATWG URL
  without credentials, at most 16384 UTF-16 code units, and no control,
  separator (space included), format, default-ignorable or lone surrogate code
  point. Nothing is trimmed or repaired; an ineligible value names its
  `reason` and is never requested, and an eligible one keeps the exact
  `encodedUrl` apart from its canonical `requestUrl`. Importing, scanning and
  creating a verifier or a transport send nothing. A request leaves only from
  `verifier.resolve()`, `resolveDestination()` or a transport's `resolve()`,
  through a transport the application supplies: browser `fetch` in an explicit
  `network` or `fixture` `scope` (no credentials, referrer or cache;
  `transport_unsupported` on server runtimes), an application endpoint (same
  origin by default), prepared `simulated` results, or a custom transport
  whose every observation is validated. `createDestinationVerifier()` keeps
  one frozen 18-key snapshot per encoded URL (state and reason, transport
  label and provenance, `requestSent`, final URL, status, observed redirect
  steps, times), joins repeated checks and bounds its attempts, queue and
  entries; `createDestinationSelection()` never shows a late result under
  another code. `/destination-node` (Node only, tested on Node 22 and 24; its
  export has a `node` condition alone) adds `createNodeTransport()`, which
  follows redirects itself and checks every hop: http(s) only, WHATWG Fetch
  bad ports refused and only ports 80 and 443 by default, special-use names
  refused, every DNS answer vetted through a cancelable per-attempt resolver,
  public addresses only with configurable NAT64 prefixes and denied ranges, a
  post-connect address check, proxy settings ignored, certificate checks
  always on, bodies never read. Its `createDestinationEndpoint()` serves the
  endpoint transport from the application's own origin and merges name
  failures into `name_unusable` by default. `/camera-overlay` reads
  eligibility through `destinationCandidate()` and checks a destination only
  through a verifier the application passes it, from a user action. A result
  is an observation of one request chain, never a safety verdict: it names its
  transport and provenance and reports every URL as text. `destination.js`,
  `destination-node.js` and their declarations ship in the package, whose npm
  description names the optional checks. Decoding, the Rust core and the WASM
  module make no network calls. Usage and operator duties: `docs/api/wasm.mdx`
  and `docs/concepts/security.mdx`.
- **Examples in the browser package** (`examples/`, with their README). They
  run from the installed package folder, with no bundler or download: the
  pages through a static server on localhost, `ssr.mjs` with Node.
  `headless.html` and `headless.js` scan an image the user chooses or drops in
  a module worker on the device, show every decoded value as text and never
  open a link, name the package version, the WASM module's SHA-256 and the
  loaded module's version, and tell a complete result, a list cut by a
  capacity, a valid empty result, and input, configuration and loading errors
  apart. `camera.html` and `camera.js` wire the camera controller, the tracker
  and the overlay as an application would: the camera opens only when the user
  asks, a frame is copied only when the overlay wants a thumbnail, a hung frame
  replaces the worker, Open is off, and destination checks stay off until the
  user turns them on. `ssr.mjs` imports the camera, overlay and destination
  modules in Node, with each DOM, camera and network global it lists replaced
  by a trap. `scanner.worker.js`, which each page starts as its own module
  worker, owns one scanner and answers `load`, `scan_image` and `scan_frame`
  requests by `id`, so one page can serve image scanning and camera frames
  from one WASM module and one initialization. The packed browser job checks that sharing on its own test
  page: an image scan and camera frames make one `.wasm` request and one
  instantiation, and only a `recover` instantiates again. It also runs both
  example pages from the installed archive in Playwright's Chromium and
  Firefox, and in CI in a Chromium with WebAssembly SIMD disabled too; finds,
  from a broader policy, the Content-Security-Policy that `examples/README.md`
  documents and runs both pages under it; runs `ssr.mjs`; and builds that
  README's bundler forms with Vite.
- **Installed-package truth set**: `fixtures/consumer-truth.json`, 35 inputs
  with their exact contents as a multiset, primary, occurrence geometry and
  score/null association under the full profile with no budget: every
  symbology, two identical QRs beside a Code 128, an ECI 4/ECI 26 equal-text
  witness, QR with a small Data Matrix, Hanzi, GS1, EXIF orientation, a
  partial artistic read, the rescue path, refusals, a valid empty image and a
  malformed input. Twin Python and JavaScript judges
  (`scripts/consumer_truth.py`, `scripts/consumer-truth.mjs`) also require a
  final, unsaturated trace and refuse each departure in their self-tests.
  The packed Rust (library on the packaged and the latest-compatible graph,
  installed CLI), native Node, WASM and Python
  consumers run every input through the installed package and record one
  identity digest; for every pull request CI runs the Rust consumer, the
  native Node one (linux-x64-gnu) on Node 18, 20, 22 and 24 and the WASM one
  on Node 22 and 24.
  New fixtures: `symbology/upce.png`, `symbology/qr-twins-code128.png`,
  `symbology/qr-small-datamatrix.png` and `eci/eci4-eci26-equal-text.png`.
- **Load and initialization phases** of the installed packages
  (`scripts/loader-phases.mjs`), run by every packed Node consumer, each case
  in a fresh process. Native: the main package installed without its
  platform package throws `Cannot find native binding` at `require`, its
  cause naming that package, with no WASI binding standing in; on one pool
  thread, an aborted queued scan rejects with an `AbortError` DOMException,
  also through a signal reused after a completed scan, while the decodable
  fixture aborted as it runs still resolves with its report. WASM: through
  the installed `./auto`
  loader, each `ScannerInitError` code a Node realm can reach
  (`invalid_options`, `asset_network_failed`, `asset_http_failed` with its
  status, `asset_read_failed`, `binary_invalid`, `wasm_validation_failed`,
  `wasm_instantiate_failed`, `wasm_unavailable`, `wasm_features_unsupported`)
  in one attempt whose promise a second call shares, beside one load of the
  installed bytes that scans. `loader_import_failed` and `wasm_compile_failed`
  need a browser and are not claimed there. The Node API page states the
  package's scope: encoded images through `scan`/`scanSync`, no raw-frame or
  camera interface, a load failure distinct from `[QRS-xxx]` rejections.
- **Prebuilt `qrscan` archives** on the GitHub release:
  `qrcode-barcode-scanner-cli-0.11.0-<target>.tar.gz` for
  `x86_64-unknown-linux-gnu` and `aarch64-unknown-linux-gnu` (glibc 2.28 or
  later), `x86_64-apple-darwin` (macOS 10.15 or later) and
  `aarch64-apple-darwin` (macOS 11.0 or later), and
  `qrcode-barcode-scanner-cli-0.11.0-x86_64-pc-windows-msvc.zip` (C runtime
  linked statically), beside `qrcode-barcode-scanner-cli-0.11.0-source.tar.gz`,
  their corresponding source as a `git archive` of the tagged commit, and
  `qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS`. Each archive holds `qrscan`,
  `LICENSE`, `LICENSING.md`, the third-party notices and license texts,
  `SOURCE.md`, `build-info.json` and a README (`distribution/cli/README.md`).
  The binaries are not code-signed or notarized: there is no Apple Developer
  ID signature, no notarization and no Authenticode signature, so macOS
  refuses a copy a browser downloaded until its quarantine attribute is
  removed, and Windows can warn of an unknown publisher; the README gives the
  steps. SHA256SUMS is an asset of the same release: it detects a damaged
  download, not a substituted release, and no GPG or minisign signature or
  build provenance attestation covers the archives. No musl, Windows on Arm
  or universal macOS archive is built.
- `.github/workflows/cli-archives.yml` builds the five archives on every pull
  request that touches their inputs and on every push to main, inspects them
  (`scripts/package-inspect.py archive`, `scripts/cli-release.py licenses`,
  `scripts/native-floor.py --policy cli`) and runs each one from its archive
  as a user would (`scripts/packed-cli-consumer.py`): on its own platform,
  and the Linux archives also in AlmaLinux 8.10 (glibc 2.28) and Debian 12
  containers, with the installed-package truth set and no engine panic
  allowed. On a `v*` tag it uploads the qualified set into the draft release
  the owner created before the tag; after publication, a `public-download`
  dispatch downloads every asset anonymously and runs the same checks.
  `scripts/check-publish-guards.py` refuses, in every publishing job, a
  release created, edited, published or deleted and an asset replaced
  (RELEASING.md § 5 to § 7, § CLI archives).

### Changed

- Pin rqrr 0.11.0 for corrected mixed-size Reed-Solomon block deinterleaving
  and truncated character-count rejection. Independently encoded regressions
  preserve exact scanner content and verify restored rqrr consensus; the
  scanner's existing strict parser continues to reject malformed prefixes.
- Build and CI compiler pins use Rust 1.99.1. The minimum supported Rust
  version remains 1.88; typed slice chunks and C buffer declarations match
  the compiler checks without suppressing warnings.
- The temporary Rust consumer names its compiler: the caller's
  `RUSTUP_TOOLCHAIN`, else `RUST_TOOLCHAIN`, else the one CI pin, exported to
  every Cargo call and checked against `rustc -vV`. Its receipt records
  `rustc -vV` and `cargo -V`, so a local rustup default no longer selects it.
- The packed Rust and Python consumers read every process output and file as
  UTF-8, not in the locale's encoding: on Windows (cp1252) the Rust consumer
  turned `中文`, `Ą` and `日本` into mojibake before judging them.
- Package metadata names the transferred source repository,
  `qrcode-ai-com/qrcode-barcode-scanner` (the `supernovae-st` addresses
  redirect): Cargo `repository`, npm `repository.url` (npm provenance requires
  it to match the building repository), Python project URLs, the pubspec,
  podspec and POM. The packages themselves take new names and the JitPack
  coordinate follows the repository (Package names, above). RELEASING.md
  records that each new name gets a trusted publisher of its own once its
  first version exists, and that the publishers of the former names are never
  re-bound to this repository.
- The native Node package's advertised floor (`engines.node >= 18`) is
  executed: its packed consumers run on Node 18, 20, 22 and 24 for every
  release target, musl included, and for linux-x64-gnu on every pull request.
  The floor itself is unchanged.
- The packed Python consumer can run on interpreters back to the advertised
  floor (`requires-python >= 3.8`, abi3-py38): its probe no longer needs
  3.9's `Path.is_relative_to`, and its venv links the interpreter like
  `python -m venv`, since a copied standalone 3.8–3.10 interpreter cannot
  find its `libpython`. CPython 3.8, 3.9 and 3.10 were run locally; the
  Python workflow's consumer rows remain 3.11 and 3.14. Its pytest suite
  keeps its 3.11 floor.
- Consolidated the automatic loader (`/auto`) and exact historical registry
  probes from the 0.10.1 branch. The historical probes remain separately named;
  they do not qualify 0.11.0 registry publication.
- The browser package ships one portable WASM module, compiled without SIMD
  for every supported engine, instead of a SIMD and a compatible module. Its
  `build-info.json` records the module's SHA-256, the features its code uses
  (bulk memory, sign extension and nontrapping float-to-int), a digest of the
  compiled sources and locks, the recipe and the tool versions. The release
  inspection refuses a second module, and bytes, inputs or features that
  disagree with that record. Measured locally on twelve 1280×720 frames
  (Node 22, V8, darwin-arm64), the portable build took 1.09× the SIMD build's
  time in `frame` and 1.03× in `fast`, with identical reports, and is about
  2 % smaller. CI runs the record's own self-test
  (`scripts/wasm_provenance.py --self-test`) on every pull request.
- Cleared open dependency advisories outside the scanner's own graph: the
  Flutter Rust lock moves tokio 1.34.0 to 1.38.2 (GHSA-rr8g-9fpq-6wmg), the
  packed Python consumer suite pins Pillow 13.0.0 with every wheel hashed
  (it needs Python 3.11, the consumer matrix's floor), and the browser test
  host and playground resolve vite 6.4.4, postcss 8.5.31 and source-map-js 1.2.2.
  The MCP adapter's test graph moves fast-uri to 3.1.9, qs to 6.16.1 and
  body-parser to 2.4.0 (GHSA-27r3-jxmh-p828); its production tree is unchanged.
- The MCP adapter's packed gate compares the schema it ships with the schema
  of the engine release it pins (still 0.10), recorded by hash, instead of
  this checkout's specification, which now describes 0.11 reports.
- The weekly mutation suite runs in 128 shards instead of 85: on the 0.11
  candidate (4421 mutants) two shards reached the 85-minute limit. The
  measured per-mutant costs, replayed over 128 shards, put the slowest at
  58 minutes; the limit itself is unchanged.
- **Upgrade note.** A `budget_ms` above 4 294 967 295 ms (about 49.7 days) is
  refused with `QRS-006` in Rust, Python and Kotlin/Swift, which accepted any
  `u64` before: this is the range the CLI and Node already carried. Unbounded
  stays `0` in the bindings and `None` in Rust. In Node and WASM a fractional
  `max_dimension`/`max_pixels` is refused instead of truncated, and a
  negative one instead of becoming no cap or the default.
- **Upgrade note (Rust).** `Scanner::scan` runs `ScanConfig::validate` and
  `Limits::validate` before it reads the input, so a `ScanConfig` that 0.10
  scanned can now return `QRS-006`: more than 32 `alpha_palette` colors
  (`ScanConfig::MAX_ALPHA_PALETTE`; 0.10 applied no cap in the core) or a
  `pyramid_side` or `max_engine_side` of 0 (0.10 downscaled to 1 px: the S1
  pyramid image, or every engine input).
  Only direct Rust embedders are affected: the bindings and the CLI already
  refused a longer palette with their own argument error, and none of them
  exposes the two sides.
- **Upgrade note (browser).** `scanner.variant` is `"portable"`.
  `{variant: "compatible"}` loads that same module; `{variant: "simd"}` rejects
  with `invalid_options`, and `simd_unavailable` is no longer a code. The
  `compatible/*` export paths of 0.10.x (`compatible/qrcode-ai-scanner.js` and
  `compatible/qrcode-ai-scanner_bg.wasm`) were removed, together with the
  `compatible/` directory: import the package root, which loads the portable
  module, and `{variant: "compatible"}` still selects it.
- `mobile › ios-release` no longer creates the GitHub release: it uploads the
  xcframework zip and `checksum.txt` only into the owner's draft, the one
  release that carries the tag and targets the tagged commit, and
  `bindings/swift/release.sh` prints the draft-first steps instead of
  `gh release create`. The owner creates that draft before pushing the tag
  and publishes it once (RELEASING.md § 5 to § 7).

### Known limitations

- An Aztec code is read only when it lies over the center of the image the
  engine scans. Drawn alone on a white 1280×720 frame, the 138 px symbol of
  `fixtures/symbology/aztec.png` is read centered, or with the frame's center
  8 px inside one of its edges, and missed, in every profile and with no
  budget cut, with that center 16 px beyond one of its corners along each axis
  or 32 px past one of its edges, or with the code in a corner of the frame;
  `scan_image` and `scan_frame` agree. The published 0.9.0 browser package
  misses the same placements: this is not new, but a camera frame that holds
  several codes rarely centers one, so ask users to center an Aztec code.

## 0.10.1 — 2026-10-20

### Fixed

- The browser package includes a non-SIMD variant alongside the accelerated
  build. The additive `/auto` entry detects capabilities in its caller's realm,
  including workers, before selecting and downloading one binary. Initialization
  diagnostics remain separate from scan execution errors and valid empty reports.
  Existing root imports remain available; consumers opt in to automatic loading.
  Decoding, report and score contracts are unchanged.

## 0.10.0 — 2026-10-13

### Fixed

- Python source distributions carry the exact type stub and `py.typed` beside
  the relocated `pyproject.toml`, so wheels built from the sdist retain typing.
  Archive inspection rejects missing or changed project-root typing files.
- Swift xcframework archives carry `LICENSE` and `LICENSING.md` inside the
  bundle. The release helper refuses version drift; Swift and JitPack Cargo
  builds use the committed binding lockfile.
- The CLI's own packaged manifest retains rxing overflow checks for standalone
  `cargo install` builds; archive inspection rejects a missing or false guard.

### Changed

- **Exact QR content** (`versions.pipeline` 2 → 3) — a QR-family
  `content.raw` is now the original payload on every decode path: where
  the scanner can error-correct the grid a decoder read, its own parse
  decides the bytes. Declared ECIs decide `content.text`; unmarked Kanji
  and Hanzi segments read Shift_JIS or GB 18030 when that set also reads
  the surrounding bytes, UTF-8 when the whole payload is UTF-8, and
  `unknown` otherwise; Micro QR and rMQR Kanji read Shift_JIS when the
  decoder's own reading is exactly that decoding. Detections are the
  distinct contents the scanner can tell apart: every read is reconciled
  at the end of the walk by its bytes, FNC1 position, ECI declarations
  and where it lies — never by `text`. The ladder keeps going while every
  QR code found only signals an ECI it could not locate (also beside a
  retail barcode).
- **`versions.score_contract` 4 → 5** (one bump, with the margin cap
  below) — the UEC cap is measured even when `uec` is skipped, and on the
  orientation the decoder read (a clean mirrored code scores like an
  upright one), never from a stream that does not error-correct;
  `score_skip_checks` never moves `score.value` or the ISO overall. A
  judgment the wall-clock budget interrupted is absent (`score: null`,
  with `trace.budget_exhausted: true`) where 0.9 published a partial
  composite. Stress cells and alpha probes match content identity, so ECI
  and non-UTF-8 symbols score their cells. The alpha placement envelope's
  calibration honours the scan deadline: an envelope the budget cut is
  absent with `trace.budget_exhausted: true`, no longer conflated with a
  design no background decodes (0.9 ran that calibration unbounded).
- **CLI** — `--score-only` exits 3 with empty stdout when the budget
  interrupted the judgment of a decoded QR (0.9 printed a deflated value,
  exit 0); every-axis-skipped and internal-fault cases name their cause
  (exit 2). `--pretty` says why a score is missing and when the budget
  cut the scan (`budget … exhausted — not final` where no score line
  says it: the frame profile, or every stress axis skipped), prints
  `charset` and `fnc1` lines (a content with no verified text ends its
  charset line with `(raw: in the JSON report, run without --pretty)`),
  and shows controls and spoofing characters as `\u{…}`, a backslash as
  `\\` and a U+FFFD that is part of the text as `\u{fffd}`.
- **`trace.stages[].detections_found` still counts raw decoder hits** —
  hits the scanner later refuses or holds for confirmation included; a
  decode refused inside the decoder step is not a hit — an rqrr decode
  whose own grid parses malformed, an rxing read a read check refuses (a
  DataBar text that is not fourteen digits, a `]Q1` read whose bytes are
  not its text) or whose original bytes cannot be established. The reads
  of a confirmation decode are not counted either.
- **QR content without ECI** — unmarked 0x80–0x9F and binary payloads
  become one windows-1252 detection; reads only rxing made publish their
  original bytes (Micro QR `[e9]`: `[c3 a9]` utf8 → `[e9]` `é` latin1;
  Micro QR and rMQR 山田: `[e5 b1 b1 e7 94 b0]` utf8 → `[8e 52 93 63]`
  `山田` shift_jis); no byte-order-mark sniffing; Kanji with ASCII trail
  bytes (山田, テスト) read shift_jis, Hanzi gb18030, UTF-8 runs beside
  such segments `unknown`; the Kanji values 5949–5951 keep `9f fd`–`9f
  ff`, read `unknown`, one detection. FNC1, Hanzi and structured-append
  symbols one decoder cannot read gain geometry and score sections
  (`engines: ["rxing"]`); FNC1 symbols gain `content.fnc1` (GS1 Data
  Matrix including `]d5`, GS1-128); Data Matrix `]d3` / `]d6` and Code 128
  `]C2` data is AIM application data; same-text symbols with different
  bytes, declarations or FNC1 stay separate; a QR read whose declarations
  could not be observed (rare) shows non-ASCII bytes as U+FFFD
  (`unknown`). Short unmarked Latin-1 payloads (for example `© 2026`,
  `¡Hola!`), read as two detections in 0.9 through rxing's charset guess,
  are now one detection.
- **Other symbologies carry the bytes of their decoding engine's
  reading** — Data Matrix, PDF417 and Aztec `content.raw` is that
  reading's ISO/IEC 8859-1 encoding when every character fits, else its
  UTF-8: UTF-8 text such as `Café crème brûlée` or
  `https://…/日本語テスト` reads correctly and whole, mixed encodations
  keep all their data, and distinct Data Matrix symbols no longer merge.
- **ECI symbols** — one detection with the declared reading; unsupported,
  binary or undecodable declarations and unlocatable ECIs (`eci: []`)
  read `unknown`; mirrored and damaged-but-correctable symbols are
  located.
- **A melting RS margin now caps the composite** (part of
  `score_contract` 4 → 5) — a growing center logo used up the correction
  budget while every stress axis kept passing, so the score stayed flat
  until decoding failed without warning: at EC level H the
  `raise_error_correction` hint can never fire, and
  `low_correction_margin` only speaks at margin zero. The measured UEC
  margin now caps the value on a continuous slope below the healthy
  half-budget: 0.5 → 100 (no cap) · 0.25 (ISO D) → 70 · 0.0 (ISO F) → 40,
  the finder-damage floor, so a decode at the RS limit scores at most 40
  where the symbol reserves no misdecode-protection codewords. On
  version 1, v2-L and v3-L, which reserve them, the margin does not
  subtract them: an errors-only decode at the acceptance limit reads above
  0 and caps at 47 to 91 (spec/04 § Synthetic UEC). The cap applies only
  where UEC measures (decodes that carry the raw stream, the rqrr path);
  rxing-path artistic decodes report `uec: null` and keep their prior
  scores — read a null margin as unmeasured, never as healthy.
- **Releases publish from a version tag only, through trusted publishing,
  and upload exactly what they inspected** — crates.io and npm now
  publish through GitHub OIDC trusted publishing (no workflow reads a
  long-lived registry token; npm packages carry provenance attestations,
  as the PyPI wheels already did); every publishing job runs only for a
  `v*` tag, in its own GitHub environment, after checking that the tag
  names the version and that this changelog dates it. Each job reads
  back, in the job itself, the archives it uploads: the npm tarballs go
  up as packed, with no lifecycle script run; PyPI receives exactly one
  wheel per platform and the sdist; each crate upload is compared with
  its inspected archive byte for byte. Publishing jobs run only actions
  pinned by commit. A run from any other ref builds and inspects every
  archive and stops, and the npm main package goes up only once every
  platform package it pins is live. A live version on crates.io or npm,
  and every file PyPI already serves at the version, must match the
  inspected archive (PyPI may serve no other file there), every npm
  upload first checks that its operand is the very tarball inspected in
  the job, a tarball npm would read differently fails, and manifests and
  Python sources are bound to the checkout.
- **Source builds of the Python package need maturin 1.9.3 or newer** —
  the build requirement is now `maturin>=1.9.3,<2.0`, the first maturin
  that puts PEP 639 license files into source distributions.

### Added

- `content.charset` values `gb18030`, `eci` and `unknown` (`unknown` is
  the only lossy value, now and later); the optional `content.eci`
  (`[{designator, start}]`: located designators, `[]` when signalled but
  not located) and `content.fnc1` (`"first"` | `"second"`); Rust
  `EciSegment`, `Fnc1Position`, `Charset::is_lossy`, reader-only
  `Unrecognized` variants and `ScanConfig::computes_score`; Dart
  `Charset.gb18030` / `eci` / `unrecognized`, `isLossy`, `EciSegment`,
  `Fnc1Position`; `trace.budget_exhausted` (`false`: the report is final;
  absent on older reports: unknown).

### Fixed

- **Inputs larger than the engine cap keep their rescue decodes** — the
  S5 erasure rescue kept its candidate geometry in original input
  coordinates but sampled module confidence on the engine-capped plane,
  so for any input whose longest side exceeds `max_engine_side` (2048 px
  in every built-in profile) it read the wrong pixels, and a symbol only
  the rescue can recover was lost. Candidate geometry is now mapped into
  the capped sampling plane before sampling, and the reported `corners`
  stay in original input space. Transparent inputs under automatic
  background selection now follow the documented stage order: a
  successful rescue over the automatically chosen background settles the
  scan, where the opposite-background retry used to run instead (and
  report `fallback_used: true` when an engine read the other placement).
- **The Node loader enforces its own version, and loads without its
  manifest** — with `NAPI_RS_ENFORCE_VERSION_CHECK` set (and not `0`),
  the 0.9.0 loader compared every installed platform package against
  `0.8.1`, a literal napi-rs wrote when the loader was generated, and
  refused its own 0.9.0 binaries. The loader now compares against the
  package's own `package.json`, read only once the check is on: an
  installed platform package must carry this package's version, and a
  loader vendored or bundled without its `package.json` still loads
  with the check off (the default).
- **Every distributed archive carries the AGPL text** — none of the
  0.9.0 archives held a LICENSE. Both crates, the npm main, platform and
  wasm packages, the wheels and the sdist now carry the root text byte
  for byte (Python through PEP 639 `license-files`, with a
  `License-File` entry), and CI reads every archive back before
  anything publishes. The iOS xcframework carries license materials inside
  its bundle; the JitPack AAR remains a named exception.
- **rxing overflow-checks in the Python, Kotlin/Swift and Flutter
  builds** — cargo reads `[profile]` from the build root only, so the
  wheels and sdist builds, the UniFFI library and the Flutter crate
  compiled rxing without the workspace's `overflow-checks`, the guard
  that turns the crafted-image arithmetic underflow documented in 0.6.0
  into a caught panic counted in `trace.engine_panics` instead of a
  runaway allocation. Each of those build roots now restates it.
  The packaged CLI now restates it for `cargo install` as well.
- **Malformed streams are refused, whichever decoder reads them** —
  designators above 999999 or written `111xxxxx` (mirrored symbols
  included), FNC1 in both positions, out-of-range numeric or
  alphanumeric groups; a tolerant reading of the same symbol is withheld.
  The rescue reads FNC1 `%%` as `%`; the FNC1-second indicator is kept
  and never read as GS1; no more split ECI or 0x80–0x9F detections; no
  guessed charset for an unsupported ECI. The Python stub types `score`
  as `dict | None` (`NotRequired` from `typing_extensions`), and the docs
  say that reproducible scans need `budget_ms=0` / `--budget-ms 0`.
- **A plain port read whose bytes are not its text is refused** — rxing's
  zxing-cpp port reader could report a QR Code read under identifier
  `]Q1` with ASCII text whose raw bytes were another reader's shape
  (codewords, not the text). Such a read is now refused unless its bytes
  are its text, or decode to it behind a byte-order mark the way rxing
  decodes them. An empty text claims nothing of the bytes (it is how
  rxing renders a segment its decoder rejects, such as a Kanji pair
  5949–5951) and keeps the read.
- **A DataBar text is exactly fourteen digits** — a DataBar (RSS-14) read
  whose text is anything else is refused.
- **The misdecode-protection reserve of v2-L is two codewords** —
  ISO/IEC 18004:2015 Table 9 reserves two on version 2 at level L; the
  scanner reserved one.
- **The S5 rescue keeps two parity codewords unspent in every block it
  erases** — with f erasures a block keeps only npar − f checks, and a
  correction that spent them all could land on another valid codeword: a
  constructed v2-M symbol was rescued onto a different payload. A block
  corrected with erasures must now keep two parity codewords beyond the
  reserve (a wrong correction passes about once in 65 536), and the
  rescue marks at most npar − p − 2 erasures per block. Trade-off:
  rescues that spent the last parity codewords are refused too (the
  rescue-stress sweep loses 4 correct reads of 2304 in each of its
  uncapped and capped passes, 13 in its dual pass).
- **A QR Code content whose every measured correction went past the
  Annex B reserve is not published** — the scanner now measures a read's
  correction margin on its own received word wherever it error-corrects
  that word itself (the worst block's ⌊(npar − p − f)/2⌋ − e). A content
  whose every measured margin is negative is refused, with its reads of
  unknown margin: both engines sample the same damaged modules, so two
  engines agreeing on such a word are no independent evidence. A margin
  is negative in two cases: errors alone took the word past the reserve,
  which only happens on versions 1 and 2 at low EC levels, or rqrr
  decoded a grid that neither orientation error-corrects for the
  scanner's bounded decoder, which counts as negative at any version and
  EC level. One read keeping a margin of zero or more confirms the
  content. Port reads at EC level L or M are re-read on versions 1 and 2
  to measure their margin. Reads with no measured margin — every Micro
  QR and rMQR read, and any other QR Code read no parse measured — are
  published as before, and a margin of zero or more does not prove a
  correction right. Trade-off: a v1/v2 symbol so damaged
  that every read of it corrects past the reserve now reads as no
  detection (it was published, with a misdecode risk the standard's
  reserve exists to bound), and so, at any version, does a symbol whose
  only known margin is that of an rqrr decode of a grid that does not
  verify. On the ZXing blackbox QR sets this
  costs one exact read of 179: `qrcode-4/41.png`, a v2-L symbol rxing
  read with five corrections (margin −1); its `corpus-external.tsv`
  expectation moves from `match` to `blind`.
- **A content measured only on a re-derived grid meets the same margin
  rule** — a QR content whose only measured correction margin came from
  re-deriving a grid rqrr detects but cannot decode (FNC1 in either
  position, Hanzi, structured append) is now refused when that margin is
  negative, as the acceptance rules require: such an FNC1 symbol
  corrected one error past the ISO/IEC 18004 Annex B reserve (v1-M with
  five errors, v1-L with three) was published, possibly as another valid
  GTIN. A port read the re-derived grid carries is still re-read at its
  own corners for its margin (versions 1 and 2, EC level L or M), and
  one read with a margin of zero or more admits the content.
- **Barcodes the readers invent from noise need a second, independent
  read** — UPC-E, DataBar, DataBar Expanded and PDF417 at EC level 0, 1
  or none are published only once a read of the same symbology and bytes
  comes from a plane whose longest side differs by a factor of 1.25 or
  more. Right after the attempt that first reads one, the scanner
  decodes that symbology alone on the attempt's plane at three quarters
  of its size (at most one decode per content and four per scan walk).
  While the core crate admits rxing below 0.9.3, whose RSS-14 reader can
  underflow, no DataBar decode of that kind runs: a DataBar is confirmed
  only by a read the walk makes anyway. EAN-13, EAN-8, UPC-A, Code 128,
  Code 39, Code 93, Codabar, ITF and Telepen keep settling on their first
  read. In the rescue-stress sweep the 46 UPC-E and DataBar outputs rxing
  read out of QR modules are gone (wrong outputs 0 in every pass).
  Trade-off: a DataBar the walk reads at one size only is no longer
  published. Only the first three stages read symbologies outside the QR
  family, at the 512 px pyramid and at full size, so in every profile a
  DataBar in an image whose longest side is under 640 px is refused,
  until the core crate requires rxing 0.9.3 or later and its
  confirmation decode can run.
- **rMQR symbols are scored by probes that read rMQR** — the score cells
  and placement-envelope probes of a Rectangular Micro QR (rMQR) symbol
  decode in a pass restricted to rMQR, and that pass ran no reader
  (rxing 0.9.1's multi-use dispatcher has no rMQR arm), so from 0.9.0 on
  a clean rMQR scored 0 on every axis. The pass now runs the zxing-cpp
  port reader for rMQR alone.
- **Decoder panics caught inside score stress cells and
  placement-envelope probes are counted** in `trace.engine_panics`; how
  a cell is judged does not change.
- **After a contained internal fault of the score computation, the
  placement envelope is not computed** — it is reported absent, like any
  envelope that was not computed, so the fault does not read as a budget
  cut: `qrscan --score-only` exits 2 for it, not 3, unless the budget had
  already cut part of that judgment.
- **The Python and WASM bindings publish every `f32` report field as the
  decimal the JSON report prints** (`alpha.coverage` 0.612, not
  0.6119999885559082) — the core serializes those fields as the `f64`
  nearest to their shortest decimal. The JSON text keeps its digits; a
  value between 1e-6 and 1e-5, or from 1e13, is now spelled in exponent
  form (the same number).

### Upgrade notes

- TypeScript: exhaustive `Charset` switches gain three values. Dart: the
  new values shift `Charset.index` (`unknown` 3 → 5), and implementers
  need the new getters; the Flutter `scan` / `scanFrame` facade still
  runs at the profile's default budget in 0.10.0, so read
  `trace.budget_exhausted` there. Python: test `charset == 'unknown'`.
  Rust 0.9.x cannot read reports that carry the new values. Validate a
  report with the schema of the release tag its `versions.scanner`
  names. Pin `qrcode-ai-scanner~=0.10.0` and `cargo install
  qrcode-ai-scanner-cli --locked --version 0.10.0`. That `--locked`
  install builds rxing 0.9.1, the version the lockfile pins, with the
  `overflow-checks` guard declared in the packaged CLI root (see Fixed).
  Projects that gate on the score should re-measure their
  thresholds before upgrading.

### CI

- **Flutter builds consume one portable candidate** — the staging tool packs
  the current core once, validates its normalized manifest and sources, and
  vendors it inside the pub package. Host, Android, iOS and publishing jobs
  consume the same hashed archive outside the repository. The committed
  binding lockfile is preserved, and a core-content digest invalidates
  cargokit's cache when only the bundled core changes.
- **Warp boundary tests kill eight recorded mutation debts** — exact pixels
  cover the half-pixel edges and outside fill without changing production
  code. A focused before/after run establishes the eight kills from its raw
  artifacts; its failed collector was repaired separately. This focused
  evidence does not replace the complete deep gate.
- **The release tooling pins its napi CLI exactly** — the v0.9.0 npm
  publishing jobs failed partway because the unpinned napi CLI range
  (`^3.7.1`) resolved to 3.7.3, which rejects `--use-napi-cross` on macOS
  and Windows hosts and on musl targets. The flag is now set per build
  target (Linux gnu only), musl targets build through Zig and
  cargo-zigbuild (`-x`, the napi-rs template's recipe), and
  `@napi-rs/cli` is pinned at `3.7.3`.
- **npm publishing hands `npm publish` absolute tarball paths** — npm
  reads a relative `dir/file.tgz` as a GitHub repository (the wasm
  operand `npm-wasm/<file>.tgz` names `github.com/npm-wasm/…`), so both
  publishing jobs spell every operand as an absolute path, the same in
  the in-job record. An `operand-proof` job, which both need, parses
  every operand with the publishers' npm before any token exists, and
  after each upload the registry's integrity must match the inspected
  tarball.
- **No build cache is restored on a tag in the jobs whose archives are
  published** — the musl build installs Zig 0.14.1 from ziglang.org
  against its published sha256, with an empty global cache, rather than
  through `mlugg/setup-zig`, which restores the compiler from the
  Actions cache on a tag too, where a cache hit skips its signature
  check. `check-publish-guards.py` refuses a cache-capable step on tag
  runs in every job whose artifacts a publishing job downloads.
- **RELEASING.md names what older tags can still publish** — the tags
  v0.5.0 to v0.9.0 can still publish to PyPI through OIDC on a dispatch
  (the owner's option: required reviewers on the `release` environment),
  and three wheel build images are pulled by a mutable tag (an accepted
  residual; maturin-action takes a digest through its `container`
  input).
- **New: `xtask oracle`, a correctness oracle that judges contents, not
  texts** (its report says `qrscan-oracle/v2`) — a `corpus.toml` entry
  may carry its bytes and declarations (`raw_hex`, `eci`, `fnc1`; 31
  entries do, each checked against an independent reader). Such a truth
  is met by content identity: equal text over other bytes is another
  content, and a detection whose charset is `unknown`, or whose ECI was
  signalled but not located, meets it as `unread` — a rate of its own,
  never exact and never blocking. Units meet detections through a best
  matching, and the report states the rule of each truth kind. The tree
  state it records leaves out the files the run writes, and a corpus root
  it cannot walk is named as such, not by its absolute path.
- **New: `xtask bench`, a benchmark harness** (`bench/README.md`; its
  report says `qrscan-bench/v5`) — it compares the published 0.9.0 with
  this tree on latency, memory, allocations, throughput and WASM cost.
  Work is each side's share of its own reference walk, and an erroring
  reference walk counts as an error; a gated pair whose sides are not the
  declared base and candidate is refused; stopping or suspending the
  harness stops its workers, and a call that spans a stop is repeated,
  never counted; the host gate fails closed on its probes, its lock and
  its run directory. Its records name every run-time input it read
  (driver scripts, the priming fixture, every vendored image), alpha
  images, the budget flag and pairs cut at the same point, and a dry run
  pre-screens the share of A/B disagreements. The library worker records
  the candidate's `trace.budget_exhausted`; the driver scripts and the
  fixture run from copies under the run's `artifacts/`, and every image
  is hashed again after each segment, a change failing the run; a build
  stamp refuses a build outside its `--source`, and a run refuses a Node
  or WASM base whose stamp lacks that record; a cut knee bisection is a
  stated known limit; the report names its method by that label alone.
- **`corpus-report --external` and `scripts/zxing-blackbox.py` print
  ZXing's own 0° thresholds as their reference** — 157, where two
  outdated values gave 153. No verdict changes.
- **Two 0.9.x gates no longer hide failures** — the cargo-deny scan of
  the binding trees the workspace excludes (Python, UniFFI, Flutter)
  turned every failure into a warning, and under cargo-deny 0.20 even the
  usage error of its retired `check --config` form, so those dependency
  graphs went unchecked while the step stayed green. It now runs the
  pinned cargo-deny 0.20.2 in its current form, and a tool or usage error
  fails the step; findings stay report-only, per tree, in the job
  summary. The weekly mutation shards ran under `continue-on-error`,
  which read shards exiting with missed or timed-out mutants as a green
  run; each shard now records cargo-mutants' exit code, and the verdict
  job of the next entry judges them.
- **The weekly mutation suite runs in 85 shards, judged against a
  committed dispositions file** — 16 shards no longer finished within the
  job's time limit; the shard count comes from measured per-mutant costs.
  The shards are dealt round-robin: slice shards put survivor-dense code
  on a few shards (the slowest of 85 took 79.2 min of an 85-min limit,
  and the last one received no mutant). The weekly verdict fails on a
  baseline failure, an unfinished shard, or a missed or timed-out mutant
  that `.cargo/mutants-dispositions.toml` does not list as equivalent, as
  a structural timeout or as test debt. It accepts a shard cargo-mutants
  gave no mutant, and lists an equivalent that `.cargo/mutants.toml` also
  excludes as excluded and documented instead of stale. The fuzzing
  bridge's operator mutants are excluded like its replaced functions
  (nine of them had reached the verdict), no mutant is generated in the
  rqrr-only stub of `Binarized::black`, which an all-features build never
  compiles, and the two wall-clock exclusions follow their conversions to
  their current lines.
- **Twenty mutation-debt entries are killed and one bench test no longer
  races its shell** — unit tests pin the score-check names, the input
  limits at their exact values, the widest bit read, the GS1
  element-string truncation and Digital Link qualifiers, the
  stream-length check and when raw RGBA flattens; two GS1 separator
  survivors are argued equivalent, while two allocation mutants remain
  resource-behavior test debt
  (`.cargo/mutants-dispositions.toml`: 33 equivalent · 9
  timeout-structural · 21 debt); and the orphaned-worker test releases
  its shell only once the worker has taken its parent.

## 0.9.0 — 2026-07-20

### Changed

- **Transparent inputs flatten before decode** (`pipeline` 1→2,
  `score_contract` 3→4) — the engine used to read the RGB *stored under*
  the transparency (alpha was dropped at the input seam), which made the
  verdict exporter-dependent: the same visual design scored 100
  (white-under-alpha exports), 74 (canvas-style black-under-alpha) or
  "no detection" (dark modules over canvas transparency) depending on
  which tool wrote the PNG. Since this release the input composites over
  a DECLARED background before luma conversion and RGB extraction —
  every stage (ladder · score · UEC · ISO) sees the flattened image, and
  the stored under-alpha RGB can never influence the report
  (exporter-invariance is pinned by test). `auto` (the default) measures
  the design on its intended placement: dark content over white, light
  content over black, with an opposite-background retry on a
  zero-detection scan (`alpha.fallback_used`) so a mis-called mean can
  never produce a false "no detection". Opaque inputs are untouched —
  their reports stay byte-identical (the `alpha` key is omitted
  entirely, not `null`). Spec: 01-report § Alpha · 07-pipeline.

### Added

- `ScanConfig.alpha_background` on every surface, per the
  `score_skip_axes` precedent — core (`AlphaBackground` +
  `from_name`), wasm (`scan_image(..., alpha_background)`), Node
  (`alphaBackground` option, typed
  `"auto" | "white" | "black" | "none" |` hex), CLI
  (`--alpha-background`), Python (`alpha_background=` kwarg, stub
  updated), UniFFI/Kotlin/Swift (`alpha_background` arg with a typed
  `UnknownAlphaBackground` error). `#rrggbb` forces the host's real
  placement surface — the truest verdict when the embedder knows where
  the code will sit; `none` restores the drop-the-channel behavior as
  an escape hatch. Unknown values fail loud on every surface. (The
  Flutter facade parses the new block; its option arg lands with the
  facade's next options pass — it exposes neither budget nor skips
  today.)
- **The placement envelope** (`alpha.envelope`, Full profile) — the
  transparent-design question is not "does it scan" but "over which
  backgrounds does it keep scanning": five fixed neutral rungs
  (luma 0 · 64 · 128 · 192 · 255) plus one bisection probe per verdict
  boundary, each a quick decode in the primary symbol's own decode
  class. The report carries the probes (every endpoint a TESTED
  background, never interpolation), the contiguous `safe_luma` bands,
  and a `placement` verdict (`any` · `light_only` · `dark_only` ·
  `mixed` · `none`). Informational by contract: it never moves
  `score.value`. Skippable through the standard seam
  (`score_skip_checks: ["alpha_envelope"]` — `ScoreCheck` gains the
  variant on every surface).
- `Hint::AlphaBackgroundDependent { placement }` — fires when the
  envelope is narrower than `any`: pin a background layer in the
  artwork, or constrain placement to the safe bands. The generator/UI
  loop's alpha feedback.
- `report.alpha` block: `coverage` · `content_luma` · `mode` ·
  `background` (`"white"` / `"black"` / `"#rrggbb"`) · `fallback_used`
  · `envelope`. Schema, TS types, Dart mirror and the type-parity gate
  updated in lockstep; `qrscan --pretty` renders the flatten verdict
  and the envelope strip.
- `alpha_palette` on every option surface (`alphaPalette` /
  `--alpha-palette`) — the host's theme/brand colors probed by the
  envelope inside the SAME scan: per-color verdicts land in
  `alpha.envelope.palette` (request order, each at its BT.601 luma),
  instead of one full scan per candidate background. Palette colors
  never distort the neutral probes/bands/placement. Unknown colors fail
  loud (`white` · `black` · `#rrggbb` only — the flatten keywords are
  modes, not colors).
- `Hint::AddBackgroundPlate { color }` — the canonical REMEDY riding
  with the `alpha_background_dependent` diagnosis: add an opaque plate
  (rounded rectangle + quiet-zone margin) behind the symbol; `color`
  (`white` for dark content, `black` for light) maximizes contrast.
  Maps 1:1 to an editor's one-click fix.

- `score.weights_run` — the honesty integer: Σ contract weights of the
  axes that ran (100 = the full six-axis contract). A partial score now
  SAYS how much contract stands behind it; pre-0.9 reports parse
  leniently (default 0). `qrscan --pretty` renders "· 70% of contract"
  when partial.
- `score_preset` on every option surface (`scorePreset` /
  `--score-preset`): the two canonical postures by NAME — `design`
  (generated previews: skips perspective+rotation, keeps lighting) ·
  `capture` (all six). Sugar over `score_skip_axes`, mutually exclusive
  with an explicit list (rejects loudly on every surface) — N host
  integrations can no longer drift apart on hand-built lists.
- `axes[].refined_failed_at` — the knee, bisected once at Full depth:
  the tightest TESTED failing intensity ("blur 2.25", "435px", "63%").
  One extra probe per kneed ramp; the composite never reads it; absent
  when no refinement ran. The generate→scan→regenerate loop sees
  sub-cell progress instead of 2-4 point cliffs.

## 0.8.1 — 2026-07-10

### Fixed

- **The npm native package ships its loader** — `native.js`/`native.d.ts`
  are napi-generated and were gitignored; the publish job checks out fresh
  and never regenerates them, and npm silently drops missing `files`
  entries, so every fresh `npm i @supernovae-st/qrcode-ai-scanner` since
  0.5.0 failed at require time (`Cannot find module './native.js'`) — the
  per-platform binaries were fine, the 300-byte loader was the hole. Caught
  by the first true fresh-consumer smoke. The generated pair is now
  committed (stable: it derives from binaryName+targets, not code) and
  `npm pack` proves the tarball. The wasm package was never affected.

## 0.8.0 — 2026-07-10

### Changed

- **A perfect render now reaches 100** — the glare stress cell moves onto
  the DATA region (symbol centre). Its old placement (0.3w, 0.3h) saturated
  the top-left finder: a structural kill no design survives, silently
  capping every pristine render at 4/5 lighting (the universal 95/97
  ceiling — the axis measured the instrument, not the symbol; same class as
  the 0.6.0 rotation-cropping fix). Centred, the error-correction budget
  decides: absorbable on healthy symbols, lethal where a finder sits or the
  margin is thin. Pinned by real product fixtures: the builder's default
  render scores exactly 100; a pale styled template keeps real, explained
  losses.

### Added

- `AxisScore.failed_at` (wire, all surfaces) — the label of the first
  failed stress cell ("blur 2.5", "glare", "128px"…), `null` when every
  cell passed. A lost point always names its cell; panels render the
  reason, not just the count. Schema + TS + Dart types updated in lockstep
  (type-parity gate green). `AxisScore` loses `Copy` in the Rust API
  (String field) — the 0.x-breaking bump, per the 0.7.0 `ScanConfig`
  precedent.

## 0.7.2 — 2026-07-10

### Added

- `ScanConfig.score_skip_checks` on every surface — the section-level
  sibling of `score_skip_axes`, same seam, same posture: Node
  (`scoreSkipChecks` option, typed `ScoreCheck = "uec" | "iso15415"`),
  wasm (`score_skip_checks` positional arg on `scan_image`), CLI
  (`--score-skip-checks uec,iso15415`), Python (`score_skip_checks=`
  kwarg on `scan`/`scan_frame`, stub updated), UniFFI/Kotlin/Swift
  (`score_skip_checks` arg with a typed `UnknownScoreCheck` error). A
  skipped section is never computed (no UEC bitstream replay · no ISO
  parameter sweep), the wire carries `null`, and the UEC-driven hints
  (`low_correction_margin`, the thin-margin priority of
  `raise_error_correction`) structurally cannot fire. The composite
  `score.value` is axis-based and does not move — surface truth, never
  score surgery (spec/04 § skipping checks). Canonical host: the builder
  panel displays neither the margin nor the ISO parameters — it skips
  both and the report stops carrying what the product never shows.
  Unknown names fail loud on every surface. Parity pinned per surface:
  core unit (sections null · hints silent · value byte-identical ·
  UEC-skip nulls the ISO `unused_error_correction` parameter), uniffi
  unit, CLI e2e, node test.mjs, pytest.

## 0.7.1 — 2026-07-08

### Added

- `score_skip_axes` reaches every binding surface — same name, same
  semantics, per the `budget_ms` precedent: Node (`scoreSkipAxes` option
  on `scan`/`scanSync`, typed), CLI (`--score-skip-axes
  perspective,rotation`), Python (`score_skip_axes=` kwarg on
  `scan`/`scan_frame`, stub updated), UniFFI/Kotlin/Swift
  (`score_skip_axes` arg with a typed `UnknownStressAxis` error). v0.7.0
  had shipped it core + wasm only. Everywhere: unknown axis names fail
  loud (CLI exit 2, ValueError, typed FFI error) — a typo silently
  scoring all six axes would be the worst kind of drift. Parity pinned
  per surface: uniffi unit tests, CLI e2e, node test.mjs, pytest.

## 0.7.0 — 2026-07-08

### Added

- `ScanConfig.score_skip_axes` (+ wasm `scan_image(...,
  score_skip_axes)`) — integration config excluding stress axes from
  scoring. Skipped axes never run (their cells are never built — the
  builder's verify loop drops the 10 perspective/rotation cells), the
  composite renormalizes over the weights of the axes that ran, the report
  self-describes (`score.axes` carries only what ran), and axis-derived
  hints from skipped axes structurally cannot fire. Skipping all six yields
  no score at all (an axis-less value would be fiction). The canonical
  case: a generated preview has no capture geometry — builders skip
  `perspective` + `rotation`; photo-input surfaces keep the full six.
  `StressAxis::from_name` joins the string-config seam. Rust API note:
  `ScanConfig`/`ScanProfile` are `Clone`, no longer `Copy` (the skip list
  is a collection); both were already `#[non_exhaustive]`.

## 0.6.0 — 2026-07-08

### Added

- CLI `--budget-ms` — override the profile's wall-clock budget (0 =
  unbounded), same semantics as every other binding surface. The CLI was the
  last surface without the knob.
- QD-2 settled by measurement: `cargo xtask rescue-stress` (2304
  deterministic occlusion scans, no RNG, byte-identical reruns) shows the S5
  erasure rescue is refusal-safe — 82/82 rescue decodes correct, 77% refusal
  rate, zero miscorrections. The harness runs weekly in deep-checks with a
  hard zero-rescue-wrong gate. (`QRS_RESCUE_CELL=<substring>` filters the
  grid to a single cell — the repro tool that pinned the rxing OOM wrap.)
  Separately measured: the base rxing engine
  wrong-decodes ~1% at format-info-adjacent occlusion and carries no
  bitstream, so `low_correction_margin` structurally cannot flag that class
  (tracked as its own decision).

### Fixed

- **The rotation stress axis measured frame cropping, not rotation
  tolerance**: `warp::rotate` spun the image within its own canvas, so a
  full-frame symbol's corners — finder patterns included — left the frame
  from the very first 10° ramp step (a v10's corner radius is ≈0.62·w
  against the 0.5·w half-frame). A flawless symbol read `rotation 1/5`
  and its score carried a phantom −8 penalty for a rotation any phone
  handles; engines are rotation-invariant on clean symbols, so every one
  of those deaths was a probe artifact. The canvas now grows to the
  rotated bounding box (pixel-centre exact; f64 trig with a snap-epsilon
  so cardinal angles stay pure shape swaps), and out-of-source lookups
  paint true white background instead of clamp-streaking the source
  edges — the same fix makes the perspective cells' out-of-trapezoid
  corners honest. Pinned by a red→green test: a clean v10 must survive
  the full rotation ramp 5/5. Score VALUES rise for full-frame symbols
  (the old readings under-reported margin); the contract is unchanged —
  same axes, weights, ramps, caps, bands (`score_contract` stays 3, the
  UPC-E wire-value-bugfix precedent).
- **A crafted image can no longer OOM the host through rxing**: rxing 0.9.1's
  RSS-14 (1D) reader underflows a subtraction on a real occlusion cell, and
  the release-mode wrap drove a Vec that doubled itself toward a 14 GiB
  request — the root cause of the silent weekly-CI runner deaths, and an
  adversarial-image DoS candidate on the multi-format path. A
  `[profile.release.package.rxing]` `overflow-checks = true` override turns
  the wrap into the caught-and-counted panic the engine wrapper already
  records (`report.trace.engine_panics`). Proof: the pathological cell
  completes with zero ≥1 GiB allocations and the 2304-cell QD-2 grid stays
  byte-identical (rescue 82/82, wrong 0).
- `cargo add qrcode-ai-scanner` no longer serves a stale crate: crates.io was
  the forgotten fifth registry — nothing ever published to it and nothing
  gated the drift, so the README's first install surface silently served
  0.3.0 through two releases. Both 0.5.0 crates are live, and
  `crates-publish.yml` owns every future tag (existence-probe gated: re-runs
  resume instead of failing on the already-published half).
- JitPack (Kotlin/Android) v0.5.0 build died exit-127: `/opt` is not writable
  on the JitPack image and the quiet `unzip` swallowed the gradle-provisioning
  failure. Gradle now unpacks into `$HOME` with loud failure at every step,
  provisions its own Android cmdline-tools (the image ships none), and a
  native-count gate fails any AAR built without its native libraries instead
  of shipping a lying artifact. First working JitPack build lands with the
  next tag.

### Testing / CI

- cargo-deny findings in the flutter binding tree cleared: stale-lock updates
  (backtrace → 0.3.76 drops `adler` entirely, futures → 0.3.32 un-yanks) and a
  `[[licenses.clarify]]` pinning allo-isolate's real Apache-2.0 (repo LICENSE;
  metadata fix merged upstream, unreleased).
- Shard-0 harvest closed: builder limits-threading pinned (a builder that
  discards its config now fails QRS-002/003 assertions), engine panic tally
  consolidated into one `run_engine()` helper and pinned deterministically.
  cargo-mutants now runs under nextest (`test_tool` policy) so the wall-clock
  test group serialization applies to mutants baselines too.
- The full-crate mutation campaign closed: all 127 weekly-run survivors are
  now killed or individually proven equivalent — the decode ladder
  (merge/absorb identity, rescue candidate collection, stage gating), the
  warp stress synthesizers (tilt/rotate/shadow/glare geometry, hand-computed
  pixel pins), the rescue bitstream parser + the ISO Annex B protection
  table (pinned against an independent enumeration, never the code's own
  formula), and a nine-file sweep (charset, engine adapters, GF(256) log
  table, sampler, payload gates, report predicates, ISO parameters, axis
  folds, Berlekamp-Massey fold bounds — the last settled by a
  125,536-syndrome differential census). 20 exclusions are pinned in
  `.cargo/mutants.toml`, each with its argument inline — 18 argued
  equivalent, plus the wall-clock-shrink pair argued untestable (a
  machine-speed lower bound is the assertion the determinism doctrine
  forbids). The weekly deep-checks missed count is a true zero baseline,
  enforced across 16 step-timed shards.
- pub.dev publish exchanges OIDC before the Flutter toolchain lands
  (dart-lang/setup-dart pinned first — the v0.5.0 job hung 2 h on
  interactive auth) and is capped at 15 min. The FIRST publish stays a
  manual operator act by pub.dev design: automated publishing arms on an
  existing package.
- The weekly mutants runner deaths are closed as a class: disk exhaustion
  refuted by its own telemetry, the rxing 14 GiB wrap pinned (see Fixed),
  and the residual hole — two parallel test processes, each under the old
  12 GB per-process virtual cap, can together write past a 16 GB box —
  closed by bounding the aggregate instead: 6 GB ulimit ×
  `NEXTEST_TEST_THREADS=2` across 16 step-timed shards (run 28879086942 is
  the evidence trail).
- RUSTSEC-2026-0204 (crossbeam-epoch 0.9.18: invalid pointer dereference in
  the `fmt::Pointer` impl, reached here via rayon/criterion) cleared across
  all five lockfiles — workspace, fuzz, py, uniffi, flutter/rust — by
  updating to 0.9.20 the day the advisory published.
- `cargo xtask rotation-sweep` — decode-under-rotation truth on the zxing
  blackbox corpus, two tables: cardinal 0°/90°/180°/270° via exact
  index-permutation rotations (lossless by construction: a rotated column
  sitting below its 0° sibling is an engine orientation gap, never image
  damage), and arbitrary 15°/30°/45° via bilinear rotation into the grown
  canvas (interpolated — a trend line, never a gate). The external gate,
  the manifest pins and the README headline all measure at 0° only; this
  closes that blind spot as a non-gating dashboard. First cardinal table:
  170/171/170/171 of 179 — flat; the engines have no cardinal orientation
  gap on real photos.
- CLI end-to-end wire-contract tests: the shipped binary's real JSON output
  now validates against `spec/scan-report.schema.json` (jsonschema dev-dep)
  across eight decode branches — direct, upscale, EXIF-rotated, boost-rung
  artistic, morph-rung webp, retail GTIN, FNC1 element string, micro-QR —
  plus the NOT-FOUND report (empty detections is a wire shape too, exactly
  where absent-vs-null serde drift hides). The type-parity gate holds the
  TYPE surfaces identical; this is the first gate on a real binary's real
  OUTPUT, the layer where serde attributes live and where the Dart
  int/double truncation class actually bit. Cross-process determinism is
  pinned the same way: two binary runs must agree byte-for-byte modulo the
  documented wall-clock fields.
- The three stock-budget artistic integration tests now reserve every
  nextest scheduler slot (`threads-required = "num-cpus"`): the wall-clock
  group only serialized them against each other while the other ~300 tests
  starved their 4 s budget from the sibling cores — two different victims
  across three same-day runs, ~4.2–5.2 s under load vs ~1.3 s solo. Proven
  by three consecutive full-suite green runs.

## 0.5.0 — 2026-07-05

Correctness + release-trust hardening (night sweep 2026-07-05). Wire schema
unchanged (score contract v3); two wire VALUES corrected as bugfixes. First
mobile release: pub.dev + SwiftPM xcframework + JitPack all fire on this tag.

### Added

- DoS-hardening + latency knobs across the mobile/server bindings: UniFFI
  (Kotlin/Swift) `scan` / `scan_frame` gain `max_dimension` / `max_pixels`
  input caps and a `budget_ms` wall-clock override; Python gains `budget_ms`
  (its input caps landed earlier this cycle). Same names, same semantics as
  Node/WASM (`0` = unbounded — spec/02). All arguments default, so existing
  call-sites are untouched.

### Fixed

- **UPC-E `gtin`/`conformant` were wrong**: the check digit was computed over
  the compressed 8-digit form and the GTIN-14 padded from it. Now expands
  UPC-E → UPC-A first (GS1 rule), then check-digits and pads from the
  expansion.
- GS1 evidence sniffing no longer counts the *stripped leading* GS of a
  transmission artifact as element-string evidence.
- Flutter mirror: `UecReport.margin` and `StructuralReport.finderIntegrity`
  are `double` now — the previous `int` truncation read every real margin
  (0.85, 0.62…) as 0. Lands before the first pub.dev publish.

### Testing / CI

- Rescue path fuzzed at last: `fuzz_scan_full` (reaches S4 deep + S5 rescue)
  and `fuzz_rescue_bitstream` (adversarial bitstream → errors-and-erasures
  correction via a `cfg(fuzzing)` bridge). Weekly fuzz job repaired (missing
  gitignored corpus dir) and now runs all four targets.
- Corpus gains `expect = "fail"` frontier entries: 6 vendored blind-spot
  fixtures (multi-symbol collages · extreme 3D perspective · busy scenes);
  an expected-fail that starts passing fails the run loudly — capability
  gains are detected, never silent.
- Golden-value pins for `otsu_threshold` / morphology / `downscale_to`
  (the surviving-mutant cluster) + direct rqrr/rxing adapter tests + the
  UEC 0.25/0.24 grade edge.
- Mutant-harvest sweep to zero on the hot math: Berlekamp-Massey locator
  degree pinned exact on injected errors (0–3 plus a 90-pattern sweep across
  `npar` 4..=20), `windowed_extremum` clamp/identity edges, Otsu's
  negative-variance init and argmax weighting, `has_color` source-kind flag,
  and `finder_score`'s region-mean threshold. Second pass killed the
  quiet-zone / strided-window / zigzag-bounds survivors; the 13 remaining
  are individually proven equivalent and pinned in `.cargo/mutants.toml` —
  the weekly missed count is a zero-baseline signal now.
- Internal: the symbology substrate (GF(256) tables, version DB, zigzag
  walk, block deinterleave, grid sampler) moved out of `score::` into a
  dedicated `matrix/` module — the rescue path no longer imports scoring
  code. No API or behavior change (same test count green, wire identical).
- Threaded determinism pinned: one shared `Scanner` scanned from 4 OS
  threads under contention produces byte-identical reports vs a sequential
  baseline (wall-clock trace fields zeroed — the one documented
  nondeterminism). The three stock-budget artistic integration tests now run
  in a serialized nextest group, so a loaded machine no longer flakes them.
- External corpora pinned without vendoring: `corpus-external.tsv` commits
  sha256 + measured decode status for all 522 files (zxing blackbox 170/179
  @ 0°, gallery 17/27); `corpus-report --external` re-hashes + re-scans
  budget-free and exits red on regression AND capability gained. CI gains
  `pipefail` — a red exit piped through `tee` used to be swallowed.
- Type-parity gate v2: 8 enums · 15 contract structs · payload kinds ·
  hint tags, held identical across Rust ↔ TypeScript ↔ JSON-Schema ↔ Dart
  (the Dart mirror was previously ungated).
- Release trust: the version gate now covers the node package.json + flutter
  pubspec + tag==workspace (a forgotten bump used to become a silent
  non-release); the published wasm crate is now cargo-checked on every PR;
  cargo-deny enforces bans+sources on the workspace and scans the three
  excluded binding lockfiles (report-only).
- New MSRV CI job — whose first run proved the declared 1.87 floor had
  never compiled (let-chains stabilized in 1.88). **MSRV is now honestly
  1.88** across all manifests + the JitPack pin. Cargo.lock is committed
  (the workspace ships binaries and claims determinism; a floating dep
  graph contradicted both) and the workspace uses resolver 3, so re-locks
  are MSRV-aware by construction.

### Docs

- Prose truth-sync with the implementation: the erasure-rescue re-check
  rejects *inconsistent* corrections (a codeword-valued miscorrection is
  the UEC margin-0 class, flagged downstream); stress-cell probe set
  documented as direct + otsu + the baseline's deep rung (`CellProbe`);
  quiet-zone probe documented as the 2-module ring it is; the lighting
  set's no-knee-exit semantics clarified everywhere.

## 0.4.0

New binding surfaces + cross-binding consistency. The core decoding/scoring
contract is unchanged from 0.3.0 (same `ScanReport`, score contract v3).

### Bindings

- **Kotlin/Android + Swift/iOS** (UniFFI → JitPack / SwiftPM) — the same
  `ScanReport` as a JSON string. Mobile CI builds the AAR + xcframework.
- **Flutter/Dart** (flutter_rust_bridge → pub.dev) — typed `ScanReport` facade
  (sealed `Payload`/`Hint`, ISO 15415 / UEC cards), tolerant of unknown values.
- **Consistency:** every binding (py · node · wasm · uniffi · flutter) now
  surfaces the `[QRS-xxx]` wire code in errors (py + uniffi previously dropped it).
- Python: optional `max_dimension` / `max_pixels` caps on `scan` / `scan_frame`.

### Core

- UEC worst-block now tracks the lowest-margin block (not the most-errors block);
  all-clean symbols report a real capacity. Morph filter rewritten to an
  output-identical monotonic-deque pass.
- Dual-licensed: AGPL-3.0-or-later OR commercial (see `LICENSING.md`).

## 0.3.0 — 2026-06-12

Full rebuild ("Diamond-grade"): deterministic architecture, scoring contract
v3, GS1 awareness, ISO-informed grading, hardened bindings. Supersedes the
0.2.x exploration line.

### Decoding

- Deterministic decode ladder (S1 pyramid → S2 direct → S3 enhance → S4 deep
  → S5 rescue) replaces the v0.2 RNG brute force — same input, same result,
  always.
- **Every mainstream symbology** (19): the QR family (QR · Micro QR · rMQR)
  plus Data Matrix, Aztec, PDF417, MaxiCode, EAN-13/8, UPC-A/E,
  Code 128/39/93, Codabar, ITF, GS1 DataBar (+Expanded), Telepen. Every
  detection carries a required `symbology`; merge identity is
  (symbology, text); only the QR family carries geometry/UEC/ISO/rescue.
- **S5 erasure rescue** (Forney 1965 errors-and-erasures RS): grids the
  engines read but could not decode are re-decoded with low-confidence
  codewords marked as half-price erasures (`e + 2t ≤ d − p`). Measured:
  center-logo occlusion tolerance 20% → 30% radius on v5-H.
- Dual engines: rxing (ZXing lineage, robustness) + rqrr (quirc lineage —
  geometry, format metadata, raw bitstream). Cross-engine merge keyed by
  resolved text (kanji-safe), bitstream + format metadata adopted as a unit.
- 15 deep rungs: 12 empirical contrast boosts + 3 morphological closes — the
  blob/dot pixel template class no threshold/contrast transform recovers.
- Charset resolution: UTF-8 → isolated-byte Latin-1 short-circuit →
  Shift-JIS → windows-1252 (fixes "Québec" → "Qu饕ec" garbling; kanji runs
  keep the SJIS reading).
- Photometric polarity threaded end-to-end: light-on-dark symbols carry
  `meta.inverted` (measured) and their structural/ISO checks sample the
  correct polarity.
- Anti-DoS: dimension/pixel/engine-side caps, whole-scan wall-clock budget,
  decompression-bomb guard, 16-detection cap, engine panic isolation.

### Scoring (contract v3)

- Six survival-ramp stress axes (resolution · blur · contrast · perspective ·
  rotation · lighting) with structural caps (finder integrity, quiet zone).
- Synthetic UEC: ISO 15415 Unused Error Correction from the engine's own
  sampled bitstream via RS syndromes + Berlekamp-Massey — exact corrected-
  error counts, ISO grade bands. Flags real Reed-Solomon miscorrections
  (`low_correction_margin` hint at margin 0).
- ISO/IEC 15415-informed grade card (`score.iso15415`): Symbol Contrast,
  Modulation, Axial Nonuniformity, Fixed Pattern Damage, UEC — each
  `{value, grade}`, overall = lowest (the ISO rule). Parameters needing
  verifier hardware are reported absent, never faked.
- Machine-actionable hints: `raise_error_correction` · `increase_contrast` ·
  `enlarge_modules` · `fix_finder_pattern` · `restore_quiet_zone` ·
  `reduce_art_texture` · `low_correction_margin`.

### Payloads

- Typed classification: url · wifi · email · sms · tel · geo · me_card ·
  crypto (BIP-21/ERC-681) · v_card · v_event · text.
- GS1: FNC1-first symbols (`]Q3`/`]Q4`) parse as `gs1` element strings
  (GenSpecs subset: predefined lengths, check digits, CSET 82, dates) and
  GS1 Digital Link URIs (Syntax 1.6, Sunrise-2027 retail form) as
  `gs1_digital_link` — both with a `conformant` verdict and per-criterion
  `issues`. GS1 syntax in a plain QR (missing FNC1) is sniffed and flagged.

### Bindings & tooling

- Node (`@supernovae-st/qrcode-ai-scanner`): napi 3 AsyncTask on the libuv
  pool, AbortSignal, `maxDimension`/`maxPixels`/`budgetMs` options, full
  TypeScript types.
- Browser (`@supernovae-st/qrcode-ai-scanner-wasm`): `scan_image` +
  `scan_frame`, SIMD128, ~797 KB gz (all symbologies), typed `ScanReport` return, `budget_ms`
  override for UI-thread bounds.
- One canonical TS contract (`report-types.d.ts`) shared by both packages.
- CLI `qrscan`: JSON by default, `--pretty` (terminal-injection-sanitized),
  `--score-only`, exit codes 0/1/2.

### Spec & docs

- `spec/`: the normative contract (report wire format, profiles, QRS error
  catalog, score v3, payloads, hints, pipeline) + a JSON Schema and golden
  examples produced by the real binary — all CI-validated against the serde
  types (`tests/spec_golden.rs`) and cross-surface type parity
  (`scripts/check-type-parity.py`).
- `docs/`: Mintlify documentation site (quickstart, concepts, per-surface
  API reference, integration guides for the qrcode-ai.com editor and for
  agents).

### Measured accuracy (reproduce: `scripts/zxing-blackbox.py` · `scripts/batch-scan.py`)

- zxing blackbox qrcode-1…6: 170/179 exact-text match @ 0°.
- qrcode-ai.com production templates: 15/15 decoded.

## 0.2.2 — 2026-06-10

Last release of the exploration line (sync napi binding, RNG-based retry
scanner). Superseded by 0.3.0.
