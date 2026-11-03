<div align="center">

<img src="https://github.com/qrcode-ai-com.png?size=128" width="80" height="80" alt="QR Code AI">

# QR Code & Barcode Scanner

**QR codes, barcodes and other 2D codes, decoded locally.**

One Rust engine for images and camera frames, with browser camera components
and quality diagnostics for demanding QR designs.

[![CI](https://img.shields.io/github/actions/workflow/status/qrcode-ai-com/qrcode-barcode-scanner/ci.yml?branch=main&style=flat-square&label=main%20CI)](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/workflows/ci.yml)
[![0.11 development](https://img.shields.io/badge/0.11-development-f59e0b?style=flat-square)](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/pull/9)
[![Rust package](https://img.shields.io/crates/v/qrcode-ai-scanner?style=flat-square&logo=rust&label=published%20Rust)](https://crates.io/crates/qrcode-ai-scanner)
[![Node package](https://img.shields.io/npm/v/@supernovae-st/qrcode-ai-scanner?style=flat-square&logo=npm&label=published%20Node)](https://www.npmjs.com/package/@supernovae-st/qrcode-ai-scanner)
[![License](https://img.shields.io/badge/license-AGPL--3.0%20or%20Commercial-2563eb?style=flat-square)](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSING.md)

[**QR Code AI**](https://qrcode-ai.com/) · [**QR code scanner**](https://qrcode-ai.com/en-US/qr-code-scanner) · [**Barcode scanner**](https://qrcode-ai.com/en-US/barcode-scanner)

[Demo](#see-it-scan) · [Gallery](#example-gallery) · [Install](#install) · [Quick starts](#quick-starts) · [Camera](#camera-and-multiple-codes) · [Formats](#supported-formats) · [Docs](#documentation)

Published by [QR Code AI](https://github.com/qrcode-ai-com), built by [SuperNovae Studio](https://github.com/supernovae-st).

</div>

## See it scan

[![Animated replay of measured QR occurrences and a Code 128 scan segment](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/readme/scan-replay.gif)](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/assets/readme/scan-replay.mp4)

**[Watch the MP4 replay](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/assets/readme/scan-replay.mp4)** · [Still frame](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/readme/scan-replay-poster.png) · [Scan reports](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/assets/readme/scan-results.json) · [Reproduce the media](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/assets/readme/README.md)

Real reports from the **0.11 development build**, visualized as a synthetic
selection replay. QR quadrilaterals and the barcode reading segment come from
the reports. This is a report visualization, not a recording of the camera UI
or a physical-camera test.

> **Release status:** 0.11 is in development in [PR #9](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/pull/9).
> The renamed 0.11 packages are pending publication. Rust, CLI and npm currently
> serve **0.10.1 under their historical names**; Python's historical release is
> **0.9.0**. The examples below identify which version they use.

## Example gallery

![Real QR, artistic QR, Micro QR, rMQR, Data Matrix, PDF417, EAN-13 and Code 128 fixtures](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/readme/gallery.png)

Inputs from the repository, with [fixture sources and individual scan
reports](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/assets/readme/README.md). A successful read of one fixture does
not promise detection of every image of that format.

<table>
  <tr><th>Ordinary QR</th><th>Artwork</th><th>Retail barcode</th></tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/images/gallery-clean.png" alt="Conventional QR code fixture" width="190"></td>
    <td align="center"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/images/gallery-artistic.png" alt="QR code integrated into an illustration" width="190"></td>
    <td align="center"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/images/gallery-ean13.png" alt="EAN-13 barcode fixture" width="240"></td>
  </tr>
</table>

### More than a URL

![QR examples carrying Wi-Fi, contact, SMS and GS1 Digital Link payloads](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/readme/payloads.png)

Decoded payloads can contain Wi-Fi connection fields, contact data, a message
or a structured GS1 URL. The host application chooses the action; the scanner
returns the content and parsing details. See the [payload fixtures and their
reports](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/assets/readme/scan-results.json) and the [GS1 guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/concepts/gs1.mdx).

### Multiple formats in the same image

![A QR code beside a Code 128 barcode, with both decoded results shown separately](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/readme/mixed-codes.png)

This fixture contains **one QR code** and **one Code 128 barcode**:

| Read | Content | Physical occurrences |
|---|---|---|
| QR Code | `https://qrc-ai.com/76xMa` | 1 measured quadrilateral |
| Code 128 | `STOCK-4827` | 1 measured reading segment |

A detection identifies decoded content; its `occurrences` describe physical
copies the scanner measured. In the animated replay above, a second fixture
contains two QR copies of `https://qrc-ai.com/occurrences` and the same barcode:
**two decoded contents, three physical occurrences**, with separate selectable
targets. The original [QR + Code 128 fixture](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/fixtures/symbology/mixed-code128-qr.png)
and [0.11 examples](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/crates/qrcode-ai-scanner-wasm/examples/README.md)
cover mixed scanning. The media reports record the exact build used.

## What you can build

| Use case | What the scanner provides |
|---|---|
| **Images and batches** | Decode encoded images; return formats, exact content and structured payloads. |
| **Browser camera · 0.11 preview** | Shared image/frame WASM, camera lifecycle, tracking, perspective overlay, selection rail and decoded readout. |
| **Inventory and labels** | Read QR and linear barcodes in a mixed image, with format-specific measured locations. |
| **Artistic QR checks** | Assess blur, resizing, contrast, perspective, rotation, lighting and transparent-background placement. |
| **Developer and agent tooling** | Rust, `qrscan`, native Node, browser WASM and Python surfaces sharing one report contract. |
| **URL handling · optional 0.11 module** | Inspect a decoded URL and observed redirects through an explicit, caller-supplied transport. |

Decoding runs locally. Camera capture and rendering belong to the host
application. The optional destination module makes requests only when the
application invokes it with a transport. A decoded URL is data, not an
automatic navigation or a safety verdict. The scanner does not recognize
products, boxes or phone cases.

## Install

### Published packages you can use today

| Runtime | Published package | Current release |
|---|---|---|
| Rust library | [`qrcode-ai-scanner`](https://crates.io/crates/qrcode-ai-scanner) · [API](https://docs.rs/qrcode-ai-scanner) | 0.10.1 |
| CLI | [`qrcode-ai-scanner-cli`](https://crates.io/crates/qrcode-ai-scanner-cli) | 0.10.1 · command `qrscan` |
| Native Node.js | [`@supernovae-st/qrcode-ai-scanner`](https://www.npmjs.com/package/@supernovae-st/qrcode-ai-scanner) | 0.10.1 |
| Browser WASM | [`@supernovae-st/qrcode-ai-scanner-wasm`](https://www.npmjs.com/package/@supernovae-st/qrcode-ai-scanner-wasm) | 0.10.1 |
| Python · historical | [`qrcode-ai-scanner`](https://pypi.org/project/qrcode-ai-scanner/) | 0.9.0 · [source build guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/api/python.mdx) |

```sh
# Choose the runtime you need.
cargo add qrcode-ai-scanner@0.10.1
cargo install qrcode-ai-scanner-cli@0.10.1
npm install @supernovae-st/qrcode-ai-scanner@0.10.1
npm install @supernovae-st/qrcode-ai-scanner-wasm@0.10.1
```

### The 0.11 package family · pending publication

| Surface | Selected 0.11 name | Includes |
|---|---|---|
| Rust | `qrcode-barcode-scanner` | Shared engine and report types |
| CLI | `qrcode-barcode-scanner-cli` | The same `qrscan` command |
| Native Node.js | `@qrcode-ai-com/qrcode-barcode-scanner` | Main package and six native platform packages |
| Browser | `@qrcode-ai-com/qrcode-barcode-scanner-wasm` | **One portable WASM** and included camera, tracker, overlay and optional destination JS/TS |
| Python | `qrcode-barcode-scanner` | Python import `qrcode_barcode_scanner` |
| Container | `ghcr.io/qrcode-ai-com/qrcode-barcode-scanner` | Planned qualified CLI image |

The camera components are included in the browser package, with no second
scanner engine or separate mandatory camera SDK. Native Node and Python have
their own target-specific builds. Shared Rust source does not mean a single
binary for every runtime.

[Follow 0.11 development](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/codex/scanner-0.11) · [Name migration guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/docs/guides/migrate-to-qrcode-barcode-scanner.mdx) · [Releases](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases)

Historical packages retain their original names and versions. There are no
alias or wrapper packages. When the new CLI is published, uninstall the old
CLI crate before installing it: both own the `qrscan` command.

## Quick starts

### Command line · published 0.10.1

```sh
qrscan image.png                 # ScanReport JSON
qrscan image.png --pretty        # readable summary
qrscan image.png --profile fast  # shorter default work budget
qrscan image.png -s --budget-ms 0 # unbounded quality judgment
```

CLI outcomes: `0` found, `1` no code, `2` invalid input or usage, `3` an
unfinished score-only judgment. See the [CLI reference](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/api/cli.mdx).

### Rust · published 0.10.1

```rust
use qrcode_ai_scanner::{ImageInput, ScanProfile, Scanner};

let scanner = Scanner::builder().profile(ScanProfile::Full).build();
let report = scanner.scan(ImageInput::encoded(&image_bytes))?;

for detection in &report.detections {
    println!("{:?}: {}", detection.symbology, detection.content.text);
}
println!("quality: {:?}", report.score);
```

Use encoded bytes or raw `ImageInput::rgba8(&frame, width, height)`.
An empty `detections` list is a valid outcome. The
[Rust API](https://docs.rs/qrcode-ai-scanner) documents the installed release;
the [0.11 source](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/crates/qrcode-ai-scanner) uses the renamed Rust
import `qrcode_barcode_scanner`.

### Browser image · 0.11 source preview

This example targets a locally built or inspected **0.11 development package**.
The [packaged image example](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/crates/qrcode-ai-scanner-wasm/examples/headless.js)
adds a module worker and explicit load/scan error handling.

```js
import { loadScanner } from "@qrcode-ai-com/qrcode-barcode-scanner-wasm/auto";

const scanner = await loadScanner();
const bytes = new Uint8Array(await file.arrayBuffer());
const report = scanner.scan_image(bytes, "fast", undefined, undefined, 0);

for (const detection of report.detections) {
  console.log(detection.symbology, detection.content.text);
}
```

For a frame, use `scanner.scan_frame(rgba, width, height, "frame", 0)` on the
same instance. These calls perform synchronous decoding; the supplied
examples run them in a worker. A zero budget means unbounded work, not a
frame-rate promise. The controller provides lifecycle and timeout handling.

### Native Node and Python

[Node API](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/api/node.mdx) · [Python API and source build](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/api/python.mdx) · [Browser API](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/docs/api/wasm.mdx) · [Nuxt integration](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/guides/nuxt-verify.mdx)

Native Node scans encoded images with `scan()` / `scanSync()`. Browser camera
and overlay modules are browser integrations, not native Node camera APIs.
Python's historical registry version is 0.9.0; use the source-build guide
when testing the new implementation.

## Camera and multiple codes

The **0.11 browser preview** includes the browser-side workflow:

1. **Capture:** camera start/stop, constraints, device changes and recovery.
2. **Decode:** raw frames reach the shared WASM through a worker.
3. **Track:** occurrence identities remain distinct, including repeated payloads.
4. **Select:** scene targets, keyboard controls, selection rail and decoded
   readout share the selected occurrence.
5. **Render:** the overlay projects measured geometry over the video. Optional
   dimming, blur, halo and thumbnails affect presentation, not decoder pixels.
6. **Act:** the host chooses what to do with the exact decoded value. Optional
   URL checks require an explicit action and supplied transport.

| Included export | Purpose |
|---|---|
| `/auto` | Checked loading and one shared portable WASM instance |
| `/camera` | Controller, tracker, projections and camera errors |
| `/camera-overlay` | Overlay, selection rail, readout, styles and colors |
| `/destination` | Optional URL/redirect verification through a supplied transport |
| `/destination-node` | Optional Node transport adapter |

**[Complete camera example](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/crates/qrcode-ai-scanner-wasm/examples/camera.js)** · [Example setup](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/crates/qrcode-ai-scanner-wasm/examples/README.md) · [Browser package guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/crates/qrcode-ai-scanner-wasm/README.md)

Serve the built or installed package examples on localhost or HTTPS. Opening
source HTML from `file://` is not a complete installation. Camera access
requires the user's permission in the host application.

**Measured locations:** QR-family and suitable matrix-code reads can supply
perspective quadrilaterals. Code 128, EAN/UPC, Code 39/93 and ITF reads supply
reading segments; other readers can supply partial points or no position.
The overlay follows that evidence rather than inventing a barcode box.

The package examples show the current overlay implementation. Physical-camera
qualification and comparative performance measurement remain separate from
the synthetic replay shown here.

## Supported formats

| Family | Formats |
|---|---|
| QR | QR Code, Micro QR, rectangular Micro QR (rMQR) |
| Other 2D | Data Matrix, Aztec, PDF417, MaxiCode |
| Retail barcodes | EAN-13, EAN-8, UPC-A, UPC-E |
| Other linear barcodes | Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen |

GS1 element strings and Digital Link payloads include parsing and validation
details. Every detection names its `symbology`; QR-only measurements are not
fabricated for barcodes. See [GS1](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/concepts/gs1.mdx), the
[report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/spec/01-report.md) and [report types](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/report-types.d.ts).

Known limits include off-centre Aztec detection and some rotated Aztec/PDF417
scenes. Geometry availability varies by format and decoder. Consult the
[0.11 changelog](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/CHANGELOG.md) and the actual report for each input.

## QR quality and recovery

A successful decode answers whether this image was read in this scan.
Quality diagnostics examine how a QR design behaves under controlled changes.

| Diagnostic | What it contributes |
|---|---|
| Stress ramps | Resolution, blur, contrast, perspective, rotation and lighting |
| QR structure | Finder-pattern damage and quiet-zone checks |
| Correction margin | Measured Reed–Solomon/unused-error-correction data where available |
| Erasure recovery | Additional decoding attempts treating low-confidence modules as erasures |
| Transparent placement | Tested backgrounds and safe luma bands for alpha-bearing inputs |
| Actionable hints | `raise_error_correction`, `fix_finder_pattern`, `low_correction_margin` and other measured findings |

Use **Full** for quality work, **Fast** for a shorter decoding-oriented scan,
and **Frame** for repeated decoding without scoring. Budgets limit work;
they are not latency guarantees. `score: null` means no complete judgment,
not a score of zero. A cut never produces a partial score.

These are software diagnostics informed by ISO 15415, not certified hardware
verification or a guarantee that every camera will read a design. Parameters
requiring unmeasured hardware data remain absent.
[Scoring details](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/SCORING.md) · [Architecture](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/ARCHITECTURE.md) · [Specification](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/spec/)

## Results and reproducibility

The media includes fixture hashes, actual report values, producer revision
and WASM hash. It demonstrates those inputs with that build. It establishes
no comparative performance ranking.

<details>
<summary><strong>Historical corpus observations · 13 October 2026</strong></summary>

Regenerated by `cargo run -p xtask -- corpus-report --write` · never
hand-typed. Exact results use only entries with known truth; negative samples
and frontier observations have separate counts. A held frontier is an
unlabelled blind spot, not a correct decode.

Measured on 13 October 2026 with the verified native diagnostic from
`2da72aee98c4cdbee93d789d96196262c37b99c3` (release, no LTO, 8 codegen units,
1 build job; release package overflow checks retained). These corpus observations do
not qualify shipped-package performance; trace timings are exploratory.

<!-- corpus-report:begin -->
| category | images | exact / truth | negative held / negatives | unlabelled decoded / blind / total | frontier held / gained | scan errors | avg ms (ladder-only trace.total_ms, exploratory, not a gate) |
|---|---|---|---|---|---|---|---|
| artistic | 2 | 2 / 2 | 0 / 0 | 0 / 0 / 0 | 0 / 0 | 0 | 637 |
| clean | 13 | 13 / 13 | 0 / 0 | 0 / 0 / 0 | 0 / 0 | 0 | 4 |
| degraded | 7 | 7 / 7 | 0 / 0 | 0 / 0 / 0 | 0 / 0 | 0 | 24 |
| frontier | 7 | 0 / 0 | 0 / 0 | 0 / 7 / 7 | 7 / 0 | 0 | 921 |
| symbology | 12 | 12 / 12 | 0 / 0 | 0 / 0 / 0 | 0 / 0 | 0 | 1 |
<!-- corpus-report:end -->

### External corpus observations

[`corpus-external.tsv`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/corpus-external.tsv) pins file hashes and measured
decode states. A state pin is not content truth for an unlabelled image. The
corpora themselves are not vendored: they contain third-party test images and
private production exports. The 13 October diagnostic used the same original
pixels and retained qualified truth amendments; strict complete-output results
and exploratory any-text matches are separate measures.

| corpus | observed result | scope |
|---|---|---|
| ZXing blackbox qrcode-1…6 | **169/179 strict exact**, 9 missed, 1 ambiguous | The nested qrcode-2/16 scene has incomplete truth; it is not an exact success. No blocking wrong/extra output or scan error under the qualified truth/dispositions. |
| ZXing exploratory tripwire | **170/179 any-text matches** | Per-suite 20 · 35 · 42 · 39 · 19 · 15. Historical ZXing 0° pass thresholds total 157; these are context, not a contemporary comparator ranking. |
| Production templates (15 single-symbol styles) | **15/15 decoded observations** | No qualified content truth; part of the unlabelled gallery set. |
| Full artistic gallery | **56/161 decoded**, 105 blind | Detection observations, not exact-content successes. Six gallery images are also retained as vendored frontier fixtures. |

The complete strict run judged 381 images: 179 ZXing, 161 unlabelled gallery
and 41 vendored. All 522 external file hashes and 41 vendored inputs verified.
Vendored truth comprises 34 labelled images, 0 verified negatives and 7
unlabelled frontiers. One caught rqrr geometry panic on qrcode-6/7 is retained
in the report trace; it is not a scan error or hidden as a zero-cost sample.
Separate earlier center-logo experiments demonstrated errors-and-erasures rescue
through 30% radius on v5-H; that synthetic observation is not this corpus result
or a new comparative correctness/performance qualification.

One historical ZXing wrong label was a **truth conflict** on `qrcode-2/13.png`:
the upstream `.txt` reads "photograph", while independently executed external
ZXing-C++ and C quirc readers confirmed "photography" on original-derived
pixels. The [pinned text amendment](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/spec/corpus-truth-amendments.md#zxing-qrcode-2-13)
preserves the original image and truth hashes, uses the confirmed text in all
corpus instruments and records the historical `known_wrong` disposition as
`superseded` only when those exact inputs validate. Wrong and extra outputs
still block. This is text confirmation, not proof of ECI/FNC1 declarations or
native QR byte length; a zero correction margin alone proves neither text.

For suites 1 through 6, the historical ZXing 0° pass
thresholds 17 · 32 · 38 · 36 · 19 · 15 (`QRCodeBlackBox1…6TestCase`, 157 in all)
provide context for the observations above. Strict complete-output verdicts and
exploratory any-text matches remain separate measures.

#### Reproducing the headline numbers

Place the corpora at the repo root (layout below), then run the gate:

```
corpus-external/
├── zxing-blackbox/qrcode-{1..6}/   # zxing core/src/test/resources/blackbox · images + .txt ground truth
└── qrcode-ai/                      # qrcode-ai.com production gallery exports (private)
```

```sh
cargo run --release -p xtask -- corpus-report --external
```

A downloaded `xtask` can use `QRSCAN_REPO_ROOT=/absolute/source/checkout`
to read that checkout's manifests and vendored fixtures. The directory must
exist and both `corpus.toml` and `corpus-external.tsv` must be readable,
nonempty and valid; an invalid override exits 2. Without the variable, the
root embedded at build time remains the default. The strict oracle records
the selected checkout's Git SHA and tree state; the runner must separately
verify that the downloaded artifact belongs to that source revision.
`QRSCAN_EXTERNAL_CORPUS` (or `oracle --corpus-root`) independently selects
the external images. For example, after verifying the artifact:

```sh
QRSCAN_REPO_ROOT=/absolute/source/checkout /absolute/artifacts/xtask corpus-report
QRSCAN_REPO_ROOT=/absolute/source/checkout /absolute/artifacts/xtask oracle \
  --corpus-root /absolute/corpus-external --json /absolute/receipts/oracle.json
```

Verifies presence + sha256 of every manifested file, rescans every image
(budget-free full ladder, so no machine's speed decides a result · the
determinism contract holds per platform; scoring off), prints the
per-suite table, and exits non-zero on any divergence: a regression AND
a fresh decode of a pinned-blind image both fail, so pins are flipped
deliberately by regenerating —
`cargo run --release -p xtask -- gen-external-manifest` (~20 s) · and
committing the diff. When `corpus-external/` is absent (CI checkouts) the
gate skips gracefully but loudly, printing exactly how many pins went
unverified. `scripts/batch-scan.py` and `scripts/zxing-blackbox.py` stay
as exploratory reporters.

</details>

## Documentation

| Start here | Reference |
|---|---|
| Choose a runtime | [Runtime guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/guides/choosing-a-surface.mdx) |
| Browser image and camera · 0.11 | [Browser package](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/crates/qrcode-ai-scanner-wasm/README.md) · [Image/camera/SSR examples](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/codex/scanner-0.11/crates/qrcode-ai-scanner-wasm/examples/README.md) |
| Report contract | [TypeScript types](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/report-types.d.ts) · [JSON Schema](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/spec/scan-report.schema.json) · [Golden examples](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/spec/examples/) |
| Quality and recovery | [Gallery](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/concepts/gallery.mdx) · [Scoring](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/SCORING.md) |
| Native APIs | [Rust](https://docs.rs/qrcode-ai-scanner) · [Node](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/api/node.mdx) · [Python](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/api/python.mdx) · [CLI](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/api/cli.mdx) |
| Development | [Contributing](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/CONTRIBUTING.md) · [Agent instructions](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/AGENTS.md) · [Release runbook](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/RELEASING.md) |

### Containers, MCP and skills

- **ClawHub:** [QR Code & Barcode Scanner](https://clawhub.ai/qrcode-ai-com/skills/qrcode-barcode-scanner), under `qrcode-ai-com`. The documentation-only skill 0.1.1 still references engine 0.10.0; it does not ship the 0.11 runtime.
- **MCP and skill downloads:** [agents-v0.1.0 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/agents-v0.1.0) and [distribution guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/distribution/README.md).
- **Historical containers:** [GHCR](https://github.com/orgs/supernovae-st/packages/container/package/qrcode-ai-scanner) and [Docker Hub](https://hub.docker.com/r/thibautmelen/qrcode-ai-scanner), engine 0.10.0. The new 0.11 container target is GHCR only, pending publication.
- **Other bindings:** [Flutter](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/bindings/flutter/), [Kotlin](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/bindings/kotlin/) and [Swift](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/bindings/swift/) have their own source-build instructions and qualification limits. These bindings are not mobile applications; app-store publication is outside this engine release.

### QR Code AI

[QR Code AI](https://qrcode-ai.com/) · [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) · [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner)

<table>
  <tr><th>QR Code AI</th><th>QR code scanner</th><th>Barcode scanner</th></tr>
  <tr>
    <td align="center"><a href="https://qrcode-ai.com/"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/readme/qr-website.png" alt="QR code linking to the QR Code AI website" width="150"></a></td>
    <td align="center"><a href="https://qrcode-ai.com/en-US/qr-code-scanner"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/readme/qr-scanner.png" alt="QR code linking to the QR scanner page" width="150"></a></td>
    <td align="center"><a href="https://qrcode-ai.com/en-US/barcode-scanner"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/readme/barcode-scanner.png" alt="QR code linking to the barcode scanner page" width="150"></a></td>
  </tr>
</table>

## Contributing, security and license

Contributions are welcome through [this repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner).
Read [CONTRIBUTING.md](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/CONTRIBUTING.md) and the [Code of Conduct](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/CODE_OF_CONDUCT.md).
Report vulnerabilities privately using [SECURITY.md](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/SECURITY.md).

The scanner is dual-licensed under **AGPL-3.0-or-later** or a separate
**commercial license**. See [LICENSING.md](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSING.md) and [LICENSE](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSE).
Commercial enquiries: `studio.supernovae@gmail.com`.

© SuperNovae Studio. QR Code AI consumes this library; its application and
creation engine have separate source and release ownership.
