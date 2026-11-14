# Scanner benchmark harness

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Scanner%20benchmark%20harness%20%28bench%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20harness%20is%20for%20maintainers%20comparing%20a%20pinned%20baseline%20with%20a%20candidate%2C%20rather%20than%20an%20installation%20route%20for%20end%20users.%20Keep%20the%20exact%20host%2C%20artifact%20versions%2C%20correctness%20results%20and%20timing%20method%20with%20every%20measurement%3B%20a%20different%20machine%20or%20a%20dry%20run%20cannot%20substantiate%20a%20speed%20comparison.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbench%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20Scanner%20benchmark%20harness%20%28bench%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20harness%20is%20for%20maintainers%20comparing%20a%20pinned%20baseline%20with%20a%20candidate%2C%20rather%20than%20an%20installation%20route%20for%20end%20users.%20Keep%20the%20exact%20host%2C%20artifact%20versions%2C%20correctness%20results%20and%20timing%20method%20with%20every%20measurement%3B%20a%20different%20machine%20or%20a%20dry%20run%20cannot%20substantiate%20a%20speed%20comparison.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbench%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20Scanner%20benchmark%20harness%20%28bench%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20harness%20is%20for%20maintainers%20comparing%20a%20pinned%20baseline%20with%20a%20candidate%2C%20rather%20than%20an%20installation%20route%20for%20end%20users.%20Keep%20the%20exact%20host%2C%20artifact%20versions%2C%20correctness%20results%20and%20timing%20method%20with%20every%20measurement%3B%20a%20different%20machine%20or%20a%20dry%20run%20cannot%20substantiate%20a%20speed%20comparison.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbench%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Scanner%20benchmark%20harness%20%28bench%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20harness%20is%20for%20maintainers%20comparing%20a%20pinned%20baseline%20with%20a%20candidate%2C%20rather%20than%20an%20installation%20route%20for%20end%20users.%20Keep%20the%20exact%20host%2C%20artifact%20versions%2C%20correctness%20results%20and%20timing%20method%20with%20every%20measurement%3B%20a%20different%20machine%20or%20a%20dry%20run%20cannot%20substantiate%20a%20speed%20comparison.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbench%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand Scanner benchmark harness (bench/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This harness is for maintainers comparing a pinned baseline with a candidate, rather than an installation route for end users. Keep the exact host, artifact versions, correctness results and timing method with every measurement; a different machine or a dry run cannot substantiate a speed comparison. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bench/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk https://qrcode-ai.com/en-US/barcode-scanner/sdk https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This harness is for maintainers comparing a pinned baseline with a candidate, rather than an installation route for end users. Keep the exact host, artifact versions, correctness results and timing method with every measurement; a different machine or a dry run cannot substantiate a speed comparison.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner SDK guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) and [barcode scanner SDK guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a reproducible input whose expected payload you record, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

`xtask bench …` measures what the correctness oracle does not: outer-call
latency, memory, allocations, throughput and WASM cost of the scanner,
**base** (the published 0.10.1) versus **candidate** (this tree), by the
method this file states — `qrscan-bench/v5`, which every run's JSON output
names under `bench`. Correctness stays with `xtask oracle`; the bench only
records whether outputs agree.

Everything here is deterministic — no RNG, no resampling. Timing depends on
the host, which is why a timing run is gated on a calm host (below) and a
dry run never yields a verdict.

## Runtimes and modes

| runtime | what runs | base | candidate |
|---|---|---|---|
| `lib` | `Scanner::scan` in-process, in a generated worker | worker built against `qrcode-ai-scanner = "=0.10.1"` | worker built against this tree by path |
| `cli` | one `qrscan` process per scan | the published 0.10.1 CLI crate, built `--locked` | this tree's CLI |
| `node` | the napi package's public `scan()` in Node | the v0.10.1 package files with the addon rebuilt from the v0.10.1 source | this tree's package + addon |
| `wasm` | the wasm package's `scan_image()` in Node | the v0.10.1 portable module (`pkg/compatible`) rebuilt from its source by the release recipe | a package built by `scripts/build-wasm.sh` |

Modes: `full` (preset budget), `full-unbounded` (`budget_ms: None` — what
every binding maps a budget of 0 to), `fast`, `frame`.

The frozen scope is what a complete run measures: the oracle's three sets
(zxing, gallery, vendored), every image, in all four runtimes and all four
modes with both variants — sixteen segments — plus the `lib` throughput
pass in `full` at 1, 4 and all logical cores, and the WASM cost (sizes and
cold starts) of both packages. A run that measures less is `partial`.

## Build parity

Every pair — library workers, CLIs, Node addons, WASM packages — is built
by the same toolchain with the same profile and recipe; a gated run refuses
(exit 2) a pair whose compilers, effective profiles, observed builds,
requested features, worker sources or binaryen recipes differ, whose base
and candidate are the same file, or whose Node or WASM driver did not load
— by its path in the package — the file the receipt hashes.

The base is the base: a gated run also refuses (exit 2) a swapped,
mislabelled or dirty side. Every base artifact must come from the v0.10.1
release — the library worker and the CLI link `qrcode-ai-scanner` 0.10.1
from crates.io (the unit cargo reported, with its package source), the
CLI is the published crate (its sha256 pinned to the checksum crates.io
lists), the Node addon and the WASM package are built from the `git
archive` of the release commit (a local `v0.10.1` tag, when the clone has
one, must name that commit). That archive is extracted outside any git
tree, so a stamp ties a build to its `--source` instead: it refuses an
artifact whose package manifest, as cargo reports it for the unit that
produced the artifact, or a WASM package directory, lies outside that
source, and a gated run refuses a Node or WASM base whose manifest does
not record a build inside its source. Every candidate artifact must come from
the measured tree at the commit the run records, with a clean source — a
library worker from its generated crate and a scanner unit built from that
tree. Every source must be unchanged since the harness wrote or extracted
it, and every worker's `hello` must name its side: the base's scanner
version 0.10.1 or the tree's, and for a library worker the crate `bench
prepare` generated for that side.

- **Library workers.** `bench prepare` writes two crates **outside the
  workspace**, each its own `[workspace]` root, with a lockfile seeded from
  the workspace `Cargo.lock` and the workspace release profile mirrored
  (`bench/worker/*.in`; a test keeps the copy equal to the workspace
  manifest). Neither the workspace manifests nor its lockfile change. Both
  include `xtask/src/bench/worker.rs` by path and report its sha256 at
  `hello`: a run refuses workers compiled from another `worker.rs` than its
  own, so both sides always come from one `prepare` of the same tree.
- **CLIs.** The published crate carries its own `Cargo.lock` and one
  profile table, `[profile.release.package.rxing] overflow-checks = true`,
  so `cargo build --release --locked` of the extracted crate gives the
  base: cargo's default release profile with rxing's overflow checks. The
  candidate gets the same profile through `--config` overrides of the
  workspace profile — `profile.release.lto=false`,
  `profile.release.codegen-units=16` and
  `profile.release.strip="debuginfo"` — and keeps the workspace's rxing
  overflow checks: turning them off too is a refused profile.
- **Node addons.** The base addon is rebuilt from the v0.10.1 source — the
  `git archive` of the release commit, extracted outside the workspace by
  `bench prepare-base`, built with its own `Cargo.lock` (`--locked`) and
  release profile on the candidate's toolchain. The published npm addon
  stays a correctness reference.
- **WASM packages.** The base package is rebuilt from the same v0.10.1
  source by its own `scripts/build-wasm.sh` — the release recipe:
  `wasm-pack` with the wasm-bindgen of its lock, then `wasm-opt` of
  binaryen `version_130` — on the candidate's toolchain. That script
  builds two modules: a SIMD one in `pkg` (`RUSTFLAGS="-C
  target-feature=+simd128,-relaxed-simd"`, `wasm-opt … --enable-simd`) and
  a portable one in `pkg/compatible` (`RUSTFLAGS="-C
  target-feature=-simd128,-relaxed-simd"`, `wasm-opt -O3 --mvp-features`
  plus the floor's features and `--disable-simd`). From 0.11 the release
  recipe builds that portable module alone, in `pkg`, with the same
  RUSTFLAGS and wasm-opt flags, so the base is `pkg/compatible` — the
  `--package` of its stamp — and the pair compares one recipe. A pair
  whose embedded compiler, wasm-opt version or flags, RUSTFLAGS, module
  recipe (producers, wasm-bindgen, SIMD) or build environment differ is
  refused: the v0.10.1 SIMD `pkg` against a 0.11 candidate is a refused
  pair, never a speed comparison (a dry run records it, unfit). The
  published npm package stays a correctness reference.
- **Build manifests come from the build.** `bench stamp` runs the build
  itself and writes, next to the artifact, `<file>.build.json` (a package
  directory: `build.json`): `rustc -vV`, the compiler commits embedded in
  the binary, the effective release profile with the `--config` overrides
  the command passed, the features it asked for, the lockfile, the source
  with its dirty flag, and what cargo's JSON messages report — how the
  artifact's unit, the scanner and rxing were compiled (opt-level,
  debuginfo, debug assertions, overflow checks, features) — with the
  codegen-affecting environment (`*RUSTFLAGS*`, `CARGO_PROFILE_*`, `RUSTC`
  and its wrappers, as hashes). A WASM stamp records `wasm-opt --version`,
  the script's hash and the RUSTFLAGS and wasm-opt flags of the module it
  stamps: those of the script's `wasm-pack build` whose `--out-dir`
  (default `pkg`) and of its `wasm-opt` whose input lie in the `--package`
  directory, else the script's first of each. Paths
  in the recorded command are cut to their last component. `bench
  prepare` and `bench prepare-base` carry manifests into the package
  directories they assemble; `bench inspect <path>` prints what a run
  records.
- **Inputs.** The harness pins the frozen inputs: the sha256 of the
  external corpus manifest (`corpus-external.tsv`) and of the vendored
  manifest (`corpus.toml`), and each set's image count (zxing 179, gallery
  161, vendored 41). A gated run refuses (exit 2) inputs off those pins —
  either manifest's sha256, a set's listed count, or a set measured whole
  whose selection is not the frozen set; a dry run records them, and a run
  off its pins never ends `completed`. What a run reads while it measures
  is what it hashed: it runs copies of the Node and WASM driver scripts
  (side by side, as the WASM driver imports the Node one) and primes with
  a copy of the fixture, both made under `artifacts/` and held to the
  hashes of its selection; and every image is hashed again when a segment
  ends — one that changed or went missing fails that segment and stops the
  run.

## Method

- Per image: one warm-up call per variant, then five timed calls each in
  `A B B A` blocks — A first on even-indexed images, B first on odd ones,
  so a drift along the slots cancels within a class; every sample records
  its slot. Before its first image (and after every respawn) each worker
  scans `fixtures/clean/gen_v2_m.png` once, uncounted.
- **Reference walks.** In a budgeted mode (`full`, `fast`, `frame`) every
  image and variant first gets one uncounted call of the same profile
  without a budget, under the unbounded caps. A timed call is **truncated**
  when its walk — stages, Σ `transforms_tried`, detections — or its
  judgment — the score's composite, contract weights, and per axis the
  cells passed of those planned, a failing cell named — differs from that
  reference. A call that completes the reference walk is complete whatever
  its time: the ladder reaching the budget is an overrun, information only.
  An image's status is its median call's (the middle two for an even
  count).
- Per class — the oracle's groups (zxing suites, gallery subdirectories,
  vendored categories) and its three sets: p50 / p95 / max of the per-image
  medians by nearest rank over the valid pairs (`all_complete` keeps every
  image a variant completed); `trace.total_ms` as a secondary column only.
- Valid pairs only: an image enters a paired test only when both variants
  completed every call — reference walk, warm-up and timed calls — without
  error, with one output over every call, the two variants agreeing. A
  reference walk that errors is an error exclusion, never a walk every
  timed call would read as truncated against.
  Excluded pairs are counted by reason (resource failure, error,
  incomplete, no reference, unstable, disagreement) in every class row and
  the status line.
- **Latency** is judged on the valid pairs whose median calls are complete
  on both sides: per-image log-ratios ln(B/A); the Hodges-Lehmann estimate
  with the exact Wilcoxon signed-rank 95 % interval. A regression is
  declared only when the interval's **lower bound** exceeds ln(1 + δ). The
  p95 verdict uses the same test on the tail — the k = ⌊n/10⌋ pairs with
  the largest per-image geometric mean of A and B, a choice that favours
  neither side; k ≥ 6 is required, so p95 is testable from 60 pairs. Fewer
  than six pairs give no interval: *not testable*, never a pass.
- **Budget.** `budget_bound` labels the valid pairs whose median call is
  truncated on a side — it never suppresses the latency verdict of the
  complete ones. Per class (six valid pairs at least), an exact one-sided
  McNemar test over the valid pairs compares truncation status, candidate
  only against base only: p < 0.05 (decided in exact integers) is a
  **truncation regression**; the same test on lost judgments is a
  **lost-judgment regression**. **Work** is judged on the pairs where a
  side was truncated only: each side's work is the share of its own
  reference walk's Σ `transforms_tried` that its median call completed,
  and the Hodges-Lehmann interval of ln(B share / A share) is a regression
  when its upper bound is below −5 %. Raw counts of two different walks
  are never compared, so a faster candidate with a smaller walk is no
  work regression.
- δ: p50 5 %, p95 10 %, peak memory 10 % (median shift and tail), WASM gzip
  / brotli size 2 %, WASM cold start p50 10 %, work 5 %.
- **Memory** is judged in `full-unbounded` only, where both sides walk the
  same deterministic path; in budgeted modes it is information. `lib`
  counts the heap of the warm-up call through a counting global allocator
  (net peak, allocation calls, bytes still allocated once the report is
  dropped); `cli` reports each process's peak RSS (`wait4`). Any call above
  512 MiB is flagged `over_envelope`. Node and WASM per-image memory is
  *not testable*; their worker peak RSS — never counting an incarnation a
  cap ended — and the WASM linear-memory high-water mark are reported per
  segment, A versus B.
- Overruns are counted per image (its median slower than the preset
  budget, Wilson 95 % over images); call-level counts carry no interval.
- Throughput (`lib`): every selected image once through a queue of image
  indices (bound 2 × threads — the images are preloaded, so in-flight scans
  and memory scale with the thread count, not the queue) on 1, 4 and all
  logical cores, `A B B A` passes, fresh workers per thread count. Images
  per second count completed scans only, over the pass's whole time (failed
  jobs' time included); the B/A ratio of the two medians is unpaired — the
  variants may complete different jobs — and no δ is declared for it.
- WASM: raw, gzip-9 and brotli-11 size of the packed `.wasm` (Node zlib);
  the cold start — compile, instantiate and the first scan of the fixture
  in a fresh Node process (V8 compiles lazily, so the first scan pays the
  code generation) — one warm-up then 12 `A B B A`-paired processes per
  variant. Compile and instantiate alone are information.

Known limits of what a report shows — reported, never judged:

- in `full` mode a deadline that cuts the alpha placement envelope leaves
  the walk and the judgment as they were, so the truncation test cannot
  see it: every image whose scan flattened transparency is flagged
  (`alpha`, per image and as `alpha_images` per class), each call's alpha
  state is recorded, and the timed calls whose state differs from their
  reference walk's are counted;
- each side's own `trace.budget_exhausted`, when its build reports one
  (0.10.1 and this tree both do), is recorded per call and counted per
  side;
- pairs that both variants cut at the same point — the same share of
  their own reference walks — carry no speed verdict (latency
  budget-bound, a work ratio of 1, a concordant `McNemar` pair); their
  count per class is `budget_bound.same_cut`;
- a decode the budget costs one side only becomes an A/B-disagreement
  exclusion, outside the `McNemar` tests; the status line names it, and a
  dry run's pre-screen reports its share per set;
- an engine retry that re-flattens an alpha image between two walks
  spends time `total_ms` does not cover (the walk comparison still sees a
  truncated retry);
- a budget that cuts a knee bisection leaves the score complete and drops
  only that axis's `refined_failed_at`, which the judgment signature does
  not carry — the composite, the contract weights and each axis's cells
  passed of planned stay as the reference's — so the truncation test
  cannot see it; each side's `trace.budget_exhausted` reports the cut
  (counted per side). Seeing it would take a per-axis refined marker
  (present or absent) in the three signature builders — the library
  worker, the CLI report parser and the Node and WASM drivers — and a
  worker protocol bump.

## Resource caps

Every scanned process and worker runs under caps the harness enforces, dry
runs included: a watchdog samples its memory — and the kernel's high-water
mark, so a spike between two samples is still seen — and its wall time
every 100 ms, and kills its process group past **1024 MiB**
(`--rss-cap-mib`, never higher) or past **max(10 × the preset budget,
60 s)** per call (60 s unbounded and for reference walks; a throughput pass
gets the per-image cap × ⌈images / threads⌉, and its worker a memory cap
of a quarter of the per-call cap per thread, at most three per-call caps —
256 MiB per thread, at most 3072 MiB, at the default). A call that returns
with a kernel peak above the cap, or after its wall cap, is a failure all
the same; so is a worker a cap or a signal ends at `quit`. The child is
reaped with `wait4`, keeping its peak RSS. A failed call is a
`resource_failure` (rss, wall, signal, exit, unsampled — with its peak and
wall time), never a timing, memory, overrun or decode sample; the worker
is respawned and the run continues; the class and the run are `failed`
(exit 1).

`bench run` starts only where the caps hold — 64-bit macOS or Linux, with
process memory readable — and refuses to start anywhere else (exit 2).

The caps outlive the harness:

- every child runs in its own process group; the harness kills groups,
  never a pid alone;
- `bench run` handles SIGTERM, SIGHUP, SIGINT and SIGQUIT by killing every
  live child's group before it exits (128 + the signal), and SIGTSTP,
  SIGTTIN and SIGTTOU by stopping every live child's group, then itself;
  SIGCONT continues them all;
- a child is registered with these handlers before any signal can act: a
  signal that lands while a child is being started is held until the
  child is in the table, then acted on with it;
- a stop is no time of the child's: the watchdog restarts the wall cap of
  a call a stop fell into, and a call whose wall interval contains a stop
  is discarded and repeated — never kept as a sample, never a failure —
  as is a throughput pass or a cold start; the own-load allowance of the
  gate restarts too;
- workers — the generated library workers and both Node drivers — exit
  within about 50 ms once their parent changes, even mid-scan;
- one-shot children (CLI scans, WASM tools) carry a kernel CPU-time limit
  at their wall cap and write no core file;
- a measured child whose first memory sample fails is killed at once and
  never used (the gate's system probes still run, under their wall cap:
  macOS `ps` is setuid and hides its memory), and only Mach-O or ELF
  executables run as measured children;
  `--node-bin` is resolved once to node's own path (`node -p
  process.execPath`).

Stop a run with SIGTERM, SIGHUP, SIGINT or SIGQUIT (`kill <pid>`, Ctrl-C,
Ctrl-\\): the handler kills every child's group first. Ctrl-Z pauses the
run and its children together; `fg` or `bg` continues them. SIGKILL and
SIGSTOP of the harness itself cannot be handled, and remain residuals:
after a SIGKILL the workers leave on their own (their parent is gone) and
a CLI scan already running ends by itself or once it has used its
CPU-time limit; during a SIGSTOP every child runs on unwatched until the
harness continues — a CLI scan still within its CPU-time limit, a worker
until the scan it is on ends — and a call that spans it is discarded
and repeated. Children never inherit `RUST_BACKTRACE`,
`RUST_LIB_BACKTRACE`, `NAPI_RS_NATIVE_LIBRARY_PATH` or `NODE_OPTIONS`;
their stderr is drained on its own thread and reduced to counts, `QRS-`
codes and `file.rs:line:column` panic locations.

## Host gate

A timing segment starts only when the one-minute load average is at most
0.5 per logical core (for example 6 on a 12-core host), no other build
runs (a cargo / rustc process in any worktree of this repository, or
carrying the `qrscan` / `qrcode-ai-scanner` / `qrcode-barcode-scanner` markers — arguments are read
to classify, never
printed), the host is on AC power outside Low Power Mode, swap use is at
most 8 GB (8 × 10⁹ bytes), and the run holds the host-wide bench lock
(`/var/tmp/qrscan-bench.lock`, outside the cleaned `/tmp`). A run takes the
lock before anything else — before node, the images, the environment
probes and the hellos — and holds it to the end; the lock file is opened
without following a symbolic link and only as a regular file (never
truncated through anything else), and its inode is re-checked at every
reading. A reading opens only while this run holds the lock. Readings
fail closed: an unreadable load, process table, swap or power state, a
probe for other builds that fails or passes its cap — the worktree list,
read at every reading, or the working directory of a build process still
running — any other probe past its cap, or a replaced lock file closes
the gate. The gate is read before every segment, every
reference-pass image, every image, the WASM sizes, every cold start, every
10 s of a throughput pass, and after each; a pass's own load counts against
it only as much as it can have built, T·(1 − e^(−t/60)) for T busy threads
after t seconds. A segment that crosses the gate is discarded whole and
retried (three attempts in all), never adjusted.

A dry run enforces only the host floor: it refuses to start, and stops,
while load1 > 30, swap use > 8 GB or another bench run holds the lock; once
stopped it starts no new phase.

A dry run also pre-screens instability, before any gated run: per
budgeted mode and set, the share of images whose A/B outputs disagree —
between the variants, or across one variant's repetitions — with the sets
above 10 % flagged, since there the exclusion rule would make every gated
run `partial` (`prescreen` in `receipt.json`, a table in `receipt.md`).
It is information for re-scoping such a mode first, never a gated
decision.

```sh
xtask bench gate                # exit 0 open, 3 closed
xtask bench gate --wait 3600    # poll until open or the deadline; holds the host lock while it waits
```

Start a gated run only when nothing else builds this repository and
whoever else uses the host knows a measurement is running. Build the
harness once, with the development profile, as a step of its own while
nothing else builds, then run the binary directly: `cargo run` would
compile at the start of the run instead.

## Commands

```sh
# 0. the harness, once (dev profile; <target> is the cargo target directory)
cargo build -p xtask --locked
X=<target>/debug/xtask

# 1. the candidate Node addon, built and stamped by one step
$X bench stamp --source . --artifact <target>/release/libqrcode_ai_scanner_node.dylib \
  -- cargo build -p qrcode-ai-scanner-node --release --locked

# 2. worker crates (+ the candidate Node package), each worker built and stamped
$X bench prepare --work <dir outside the workspace> \
  --node-addon <target>/release/libqrcode_ai_scanner_node.dylib
$X bench stamp --source <dir>/worker-base --artifact <target>/release/qrscan-bench-worker-base \
  -- cargo build --release --manifest-path <dir>/worker-base/Cargo.toml
$X bench stamp --source <dir>/worker-candidate --artifact <target>/release/qrscan-bench-worker-candidate \
  -- cargo build --release --manifest-path <dir>/worker-candidate/Cargo.toml

# 3. base sources: the v0.10.1 git archive (and the published CLI crate);
#    prepare-base prints the build and stamp of each base artifact — the
#    base WASM package is the portable module, <src>/crates/qrcode-ai-scanner-wasm/pkg/compatible
$X bench prepare-base --work <dir> [--cli-crate qrcode-ai-scanner-cli-0.10.1.crate]

# 3b. the candidate CLI on the published crate's profile (Build parity, CLIs)
$X bench stamp --source . --artifact <target>/candidate-cli/release/qrscan \
  -- cargo build -p qrcode-barcode-scanner-cli --release --locked --target-dir <target>/candidate-cli \
  --config profile.release.lto=false --config profile.release.codegen-units=16 \
  --config 'profile.release.strip="debuginfo"'

# 4. a dry run: gate recorded, not enforced; caps and host floor enforced; exit 3
$X bench run --dry-run --per-group 1 --reps 2 --out <fresh dir> \
  --lib-base … --lib-candidate … --cli-base … --cli-candidate … \
  --node-base … --node-candidate … --wasm-base … --wasm-candidate …

# 5. the gated measurement, while nothing else builds: waits for the lock and the gate up to the deadline
$X bench run --wait-gate 14400 --out <fresh dir> …
```

Run every build on its own, one cargo process at a time.

Exit codes: 0 completed — every segment, thread count and WASM cost of the
declared frozen scope measured with both variants, nothing regressed, no
set row caught by the exclusion rule · 1 a regression (latency,
truncation, lost judgments, work, memory, size, cold start), or a failure
(resource or protocol, or an image changed during the run) · 2 usage,
configuration, an unfit pair, inputs off
their pins, a worker of another protocol, or an `--out` that already
holds something · 3 refused by the host lock, the gate or the host floor,
`partial`, or an exploratory dry run (never a pass). A run is `partial`
when it is a subset of the frozen scope (per-group sampling, fewer sets,
modes or runtimes, a runtime without both variants, no throughput in
`full`), when anything of the declared scope was not measured, or when a
set row has fewer than six valid pairs or more than 10 % of its images
excluded; the excluded counts and any A/B disagreement in a budgeted mode
appear in its status line.

## Receipts

A run directory — always a fresh one; an existing non-empty `--out` is
refused, and a run claims its `--out` (creating `artifacts/` itself)
before it waits for the host lock, so a second run given the same `--out`
is refused at once and two runs never share one; a run refused before it
measures removes what it created — holds `receipt.json` (method, caps, environment with the
harness binary's sha256, inputs with their pin check and the sha256 of
every run-time input the run read — the Node and WASM driver scripts, the
priming fixture, each vendored image file — artifact hashes with
their build manifests, parity, gate log, per-class summaries, resource
failures, verdicts — a `not_testable` row, with why, for every metric of
the frozen scope the run did not measure — and the status detail),
`receipt.md` (the short tables), `samples.jsonl` (every completed call —
reference walks, warm-ups, timed calls — with its slot, walk and
truncation facts) and `images.jsonl` (per-image summaries and pair status),
plus `artifacts/` — the copies the run executed, hashed in the receipt.
Its `drivers/` and `fixture/` hold the driver scripts and the fixture the
run ran and primed with, each the file whose sha256 its inputs record.
Every receipt file is created new and its sha256 printed.

Decoded text never leaves memory: workers send it as hex over their pipe
and the harness hashes it on arrival. Receipts carry (symbology, text
sha256, length) and corpus-relative paths only, and failure notes carry
error codes, never messages. A short payload can be guessed back from its
hash, and the executed binaries under `artifacts/` embed build paths, so a
run directory stays local — `bench/out/` and `bench/work/` are ignored; the
throughput image list lives in the system temporary directory and is
deleted after the passes.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.
