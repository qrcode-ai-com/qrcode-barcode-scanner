# AGENTS.md — QR Code & Barcode Scanner

Instructions for AI coding agents (Codex · Cursor · opencode · any
harness) working in this repo. Humans: start at [README.md](README.md);
releases follow [RELEASING.md](RELEASING.md) to the letter. Cursor also
loads `.cursor/rules/scanner.mdc` (condensed always-on laws).

## Scanner identity and ownership

Read [SOURCE-AND-EXTRACTION.md](SOURCE-AND-EXTRACTION.md). Maintain one multiformat
scanner engine and one package family: **QR Code & Barcode Scanner**.
QR/barcode modes and SEO pages do not authorize
separate scanner engines, product extractions or alias/wrapper packages.

The source repository is `qrcode-ai-com/qrcode-barcode-scanner`. Its repository
identity, history and tags are retained from its previous names. The 0.11.0
release is public: `qrcode-barcode-scanner` and `qrcode-barcode-scanner-cli`
on crates.io (`qrscan` remains the command), `@qrcode-ai-com/qrcode-barcode-scanner`
with six automatic native platform dependencies and
`@qrcode-ai-com/qrcode-barcode-scanner-wasm` on npm, and
`qrcode-barcode-scanner` on PyPI (import `qrcode_barcode_scanner`). Use these
published coordinates in current installation instructions. The six native npm
packages are optional dependencies selected by the Node parent, not separate SDKs.
The browser package contains one portable WASM module.

Releases through 0.10.x retain the old Rust and `@supernovae-st` npm names;
PyPI's old `qrcode-ai-scanner` project stops at 0.9.0. Keep their versions,
coordinates and bytes historical; do not rename or republish them. The
[migration guide](docs/guides/migrate-to-qrcode-barcode-scanner.mdx) separates
current installs from those old packages. Source/tag, registry installation and
browser/device qualification keep distinct evidence. PyPI's exercised OIDC
publication does not establish npm provenance; the initial npm uploads were
manual. A repository rename or documentation edit does not publish a future version.

Public Flutter package `qr_barcode_scanner` 0.11.0 is on pub.dev under verified
publisher `qrcode-ai.com`. It builds its bundled Rust core at app-build time.
Its Android emulator consumer passes with native development optimization; the
iOS simulator consumer still fails its fast-profile budget. Follow the dated
[Flutter installation and consumer evidence](docs/api/flutter.mdx), not a claim
of general device qualification. Kotlin/JitPack remains unqualified and Swift
uses a local source build. JSR, agent adapters and containers retain their own publication
and qualification gates. QR Code AI's SaaS and creation engine have separate
sources and release qualification. A mobile scanner binding is not a consumer
app. Component licenses do not determine the SaaS's license.

These spellings are retained in 0.11 and are not install names: the repository
directories (`crates/qrcode-ai-scanner*`, `bindings/kotlin/qrcodeaiscanner`,
`bindings/swift/Sources/QrcodeAiScanner`); the never-published Cargo packages
`qrcode-ai-scanner-node` and `qrcode-ai-scanner-wasm` (root workspace members,
which `-p` still selects by these names) and `qrcode-ai-scanner-uniffi` and
`qrcode-ai-scanner-fuzz` (outside the root workspace, addressed with
`--manifest-path`); the UniFFI library `qrcode_ai_scanner_uniffi`, the Kotlin
package `uniffi.qrcode_ai_scanner_uniffi`, the Gradle module `:qrcodeaiscanner`,
the Kotlin build's root project name `qrcode-ai-scanner-kotlin`, the Swift
`QrcodeAiScanner` package with its `QrcodeAiScannerFFI` binary target, and the
Android namespaces of the Kotlin and Flutter bindings; and the platform
identifiers of the Flutter example app. Do not rename them as a side effect of
other work.

Preserve historical package names, tags, schema IDs, licenses and wire contracts.
Newly named packages need real builds and consumer qualification. A repository
rename or a documentation change does not publish or retire any artifact.

## Source license amendment · 14 November 2026

The owner chose MIT for current project-authored scanner source and future
qualified artifacts. Read [LICENSING.md](LICENSING.md). Preserve upstream
Apache/MIT/MPL notices and published archive terms: engine 0.11.0 and MCP
0.3.1 remain AGPL in their retained archives; skill/bundle 0.2.0 retain MIT-0.
Recipes wrapping those binaries must not relabel them as MIT. Tags, package
publication and catalogue admission still require their own gates. All maintained
README files carry the source/archive boundary through
`scripts/build-readme-licensing.py`; CI checks their generated section.

## Current implementation

A Rust workspace with five published runtime entry points and separate mobile
bindings off one core —
QR/barcode decoding + scannability scoring, specialty: artistic/
AI-generated codes. The Rust core and WASM run **locally** with no network
calls; the optional `./destination` module sends requests only through a
transport the caller supplies.

| Path | Artifact | Registry |
|---|---|---|
| `crates/qrcode-ai-scanner` | `qrcode-barcode-scanner`, the core library, 0.11.0 published | crates.io |
| `crates/qrcode-ai-scanner-cli` | `qrcode-barcode-scanner-cli`, the `qrscan` binary, 0.11.0 published | crates.io |
| `crates/qrcode-ai-scanner-node` | `@qrcode-ai-com/qrcode-barcode-scanner` (napi) and six automatic platform dependencies, 0.11.0 published | npm |
| `crates/qrcode-ai-scanner-wasm` | `@qrcode-ai-com/qrcode-barcode-scanner-wasm`, 0.11.0 published | npm |
| `crates/qrcode-ai-scanner-py` | `qrcode-barcode-scanner` (PyO3, workspace-excluded), 0.11.0 published | PyPI |
| `bindings/flutter` | `qr_barcode_scanner`, Flutter plugin (FRB + cargokit), 0.11.0 public; separate native qualification limits | pub.dev |
| `bindings/kotlin` | com.github.qrcode-ai-com:qrcode-barcode-scanner, not yet qualified | JitPack |
| `bindings/swift` | `QrcodeAiScanner` (xcframework), built from source: SwiftPM cannot add it by repository URL | SwiftPM (local package) |

**Downstream, this crate is "the judge"**: the generator's e2e floors,
the qrt templates layer and the 306-template factory all score through
the published version (pinned as `doctor::JUDGE_VERSION` in
qrcode-ai-templates). A release here makes those repos re-measure —
score honesty is a cross-repo contract.

## Ground truth, in priority order

1. **`spec/`** — the NORMATIVE contract (wire format, errors, score,
   payloads, hints, pipeline). If code and spec disagree, one has a bug.
2. `spec/scan-report.schema.json` + `spec/examples/*.json` — machine
   ground truth, produced by the real binary, validated in CI.
3. `docs/` — the Mintlify site (human-friendly; `docs/guides/agents.mdx`
   is written for you).
4. `bindings/report-types.d.ts` — the ONE TypeScript contract (both npm
   packages ship copies synced by `scripts/sync-report-types.mjs`).

## Commands

Use the compiler pin and locked gates in
[Local development checks](RELEASING.md#local-development-checks). The workflow
pin and the MSRV are separate contracts; an ambient Cargo compiler is not proof
of CI parity. Inspect `RUST_TOOLCHAIN` in `.github/workflows/ci.yml` when the pin
changes, and update command examples and condensed agent contexts together.

```bash
cargo +1.99.1 nextest run --workspace --locked  # count = actual executed tests
cargo +1.99.1 test --doc --workspace --locked
RUSTFLAGS="-D warnings" cargo +1.99.1 clippy --workspace --all-targets --all-features --locked
cargo +1.99.1 fmt --all --check
cargo +1.88 check -p qrcode-barcode-scanner --all-features --locked  # MSRV floor
python3 scripts/check-type-parity.py # Rust ↔ TS ↔ JSON-Schema drift gate
cargo +1.99.1 run --locked -p xtask -- corpus-report
cargo +1.99.1 run --locked -p xtask -- sync-version --check
./scripts/build-wasm.sh              # wasm pkg (NEEDS binaryen ≥130 on PATH)
node crates/qrcode-ai-scanner-node/test.mjs   # node smoke (build first: npm run build)
node crates/qrcode-ai-scanner-wasm/test.mjs   # wasm smoke (build first)
```

Regeneration commands write files: `xtask gen-fixtures`, `xtask sync-version`
without `--check`, and `cargo fmt --all`. Use them for the intended owned change.
Dependency/core changes also require the runbook's four excluded lock-root
checks; a workspace pass does not cover Python, UniFFI, Flutter Rust or fuzz.

Deep checks (weekly `deep-checks.yml`): cargo-mutants in 128 shards, judged
by the `mutants-summary` job — red on a baseline failure or on any missed /
timed-out mutant absent from `.cargo/mutants-dispositions.toml` (after an
edit there: `python3 scripts/check-mutants-outcome.py --self-test`) · fuzz
×4 · rescue-stress (every emitted engine/rescue/extra QR and non-QR output is
judged against the single-symbol truth, exact output dispositions and pinned
recall/panic floors; rescue-path wrong output is forbidden in both the uncapped
and capped passes) · advisories. Judge-bump moments add the external
truth, `xtask corpus-report --external` (the `corpus-external.tsv` pins):
it runs locally with the corpus present — CI has no corpus, parses the
manifest only and reports the gate as NOT VERIFIED, never as a pass.

## Hard invariants (breaking these fails CI or review)

- **Zero `unwrap`/`expect`/`panic!` in `src/`** (tests are exempt). Clippy
  denies it.
- **No RNG anywhere** — the pipeline is deterministic by contract (known
  dependency exception: rxing's PDF417 decoder breaks confidence ties in
  randomized `HashMap` order — spec/04 § Determinism; the threaded
  determinism pin excludes the PDF417 fixtures).
- **A budget cut is flagged, never partial**: `trace.budget_exhausted` is
  `true` exactly when the deadline prevented a planned unit (spec/02 §
  Budget semantics); a judgment it interrupts is `score: null`. Bounded
  checks with no budget (grid re-derivations, the re-read, the end-of-walk
  pass, the confirmation decodes) never set it. A test that asserts a score
  runs unbounded, or asserts "absent with the flag set, or the unbounded
  value".
- **Exact content, keyed by identity**: a QR-family `content.raw` is the
  original payload (the scanner's own parse decides it wherever it can
  error-correct the grid); `unknown` is the only lossy `charset`, forever;
  reads become detections by content identity (symbology, `raw`, FNC1
  position, compatible `eci`), never by `text` (spec/01 § Content,
  07-pipeline property 6). `tests/exact_content.rs` pins the rows.
- **Refuse what the evidence contradicts**: a malformed stream is refused
  whichever decoder reads it; a QR Code content whose every measured
  correction margin is negative (past the Annex B reserve, or an rqrr
  decode of a grid the scanner cannot error-correct, at any version), and
  an invention-prone read no independent read confirmed, are not
  published (07-pipeline § Acceptance). The margin rule covers measured
  reads only: Micro QR, rMQR and other QR Code reads no parse measured are
  published as read, and a correction inside the reserve can still be
  wrong — never
  document the rule as infallible. Prefer absent to wrong; a recall
  trade-off is named in the CHANGELOG, not hidden.
- **Additive wire evolution only**: never rename/remove a JSON field or
  enum value. New variants are fine — consumers parse leniently.
- **Every contract change cascades** through ALL of: the Rust types →
  `bindings/report-types.d.ts` → `spec/scan-report.schema.json` → the
  relevant `spec/*.md` → `docs/`. The parity gate + `tests/spec_golden.rs`
  enforce most of it; the prose is on you.
- Wire names are **pinned by tests** (snapshot + unit). Changing serde
  casing is a breaking change.
- "No QR found" is `Ok` with empty detections — NEVER an error.
- Only the QR family carries `meta`/UEC/iso15415/rescue — other
  symbologies must never fabricate those fields.
- Decoded QR text is **attacker-controlled**: any new parser over it must
  be boundary-safe (see `gs1.rs` `split_head`) and fuzz-covered
  (`fuzz/fuzz_targets/fuzz_classify_text.rs`); any human-facing echo
  strips terminal controls (`sanitize_terminal` in the CLI).
- Colour only through `crates/qrcode-ai-scanner-cli/src/term.rs` (one
  seam per binary · `NO_COLOR > CLICOLOR_FORCE > TTY` · JSON and
  `--score-only` never carry an escape).

## Gotchas that have bitten before

- `crates/qrcode-ai-scanner-wasm/pkg/` is **generated** by wasm-pack —
  never hand-edit; `scripts/patch-wasm-pkg.mjs` owns package.json fields
  (incl. the `files` allowlist — wasm-pack wipes manual edits).
- wasm-pack's bundled wasm-opt is too old for Rust ≥1.87 output — use
  binaryen ≥130 (`brew install binaryen`; CI pins version_130).
- `corpus.toml` is TOML: control bytes (e.g. GS 0x1D) must be written
  as `\u001D` escapes, never as literal bytes.
- The score probes decode ONLY the scored symbology
  (`engine::FormatFilter::Only`) — calling `decode_all` in a stress cell
  reintroduces a ~5× cost regression AND false cross-symbology survivals.
- rqrr rejects FNC1 symbols (mode 0x5/0x9) — rxing is the GS1 engine; the
  scanner re-derives the grid rqrr detected to read its declarations.
- The goldens (`spec/examples/`) carry this build's `versions`, and
  `spec_golden` compares each with a fresh scan of its fixture: a behavior
  change regenerates the goldens it moves (`golden_equals_a_fresh_scan::<name>`
  names each one), and a marker or version bump regenerates the whole set,
  from the committed fixtures (`qrscan <fixture> --profile full
  --budget-ms 0`, the table in `spec/README.md` § Examples); review every
  diff.
- `cargo test --workspace --lib` style commands: prefer
  `cargo nextest run`; doc tests via `cargo test --doc`.

## Style

Edition 2024, MSRV 1.88. Comments explain WHY/constraints, not what the
next line does. Doc comments on every public item (`missing_docs` warns).
Conventional commits, lowercase descriptions.

## Consumers — don't break them

- qrcode-ai.com landing (Nuxt): verify flow + import flow consume the
  wasm package — integration pattern in `docs/guides/nuxt-verify.mdx`.
- Future: Nika vision workflows consume the core crate.

## QR Code AI

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **SDK guides** | [QR code scanner SDKs](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) | [Barcode scanner SDKs](https://qrcode-ai.com/en-US/barcode-scanner/sdk) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |
