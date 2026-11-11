# Releasing

## Source identity and existing releases

The source repository is `qrcode-ai-com/qrcode-barcode-scanner`, transferred
from `supernovae-st/qrcode-barcode-scanner` (earlier `supernovae-st/qrcode-ai-scanner`)
on 1 November 2026; the old addresses redirect. Release one
multiformat engine and its runtime bindings; no QR/barcode extraction is required.
Published versions keep their package names, tags, registry artifacts and OCI
image metadata; from 0.11.0 the packages are published under the
`qrcode-barcode-scanner` family names, never under a former name. See
[SOURCE-AND-EXTRACTION.md](SOURCE-AND-EXTRACTION.md).

The repository rename does not publish packages or change publisher grants.
Before a future release, verify trusted-publisher/OIDC settings and source links
against the actual repository identity. Follow the artifact-specific gates below.
The transfer changed the GitHub OIDC identity every trusted publisher matches
on: tokens now name owner `qrcode-ai-com` and repository
`qrcode-barcode-scanner`. Package metadata already names that repository (npm
provenance requires `repository.url` to match the building repository).

From 0.11.0 the packages carry new names, and each new name needs a trusted
publisher of its own: crates.io and npm can bind one only after the package's
first version exists, while PyPI accepts a pending publisher before it. The
owner uploads each first version from the tag run's inspected artifacts (see
[First publication of a new name](#first-publication-of-a-new-name)), then
configures that name's publisher: owner `qrcode-ai-com`, repository
`qrcode-barcode-scanner`, the existing workflow file and environment. The
publishers on crates.io, npm and PyPI recorded below as of 0.10.1 belong to the
former names and name the pre-transfer `supernovae-st/qrcode-ai-scanner`; they
are never re-bound to this repository, because a re-bound publisher would open
a CI path that uploads under a former name. Each new publisher is recorded in
three states: configured (read back in the registry's settings), exchanged (an
OIDC token exchange succeeded) and exercised (an upload through it succeeded).
Only an exercised publisher proves the binding. Until a name's publisher is
configured, a publishing job that would upload under it stops at
authentication with nothing uploaded; pub.dev follows owner step 6.

### Website address in package metadata

Since 10 November 2026 the `homepage` field of each package manifest is that package's guide on
the QR Code AI site, on the QR journey: `https://qrcode-ai.com/en-US/qr-code-scanner/<guide>`.

| Package | Guide | Where it is set |
| --- | --- | --- |
| Rust core crate | `sdk/rust` | `crates/qrcode-ai-scanner/Cargo.toml` |
| `qrscan` crate | `cli` | `crates/qrcode-ai-scanner-cli/Cargo.toml` |
| Node package and its platform packages | `sdk/nodejs` | `crates/qrcode-ai-scanner-node/package.json` |
| Python package | `sdk/python` | `crates/qrcode-ai-scanner-py/pyproject.toml` |
| Browser package | `sdk/javascript` | `scripts/patch-wasm-pkg.mjs` |
| Flutter package | `sdk/flutter` | `bindings/flutter/pubspec.yaml` |
| MCP adapter, with its `websiteUrl` | `mcp` | `integrations/mcp/`, pinned by `scripts/mcp-release.py` |
| OpenClaw bundle | `integrations/openclaw` | `integrations/openclaw/` |

The workspace default in `Cargo.toml` is the SDK hub, `sdk`. The packaging recipes of a published
version keep their text. Before a release, open each address: a registry shows it as the
package's website, so a page that does not answer is what its visitors get.

The proven runbook — three releases shipped with it on 2026-07-08 alone
(0.6.0 · 0.7.0 · 0.7.1). Every step exists because skipping it bit us once;
the dates in parentheses point at the incident.

## 0 · Pick the version

- **Patch (0.x.Y)** — additive-only: new options, new tests, docs.
- **Minor (0.X.0)** — anything 0.x-breaking: a public type loses a trait
  (`Copy` on `ScanConfig`, 0.7.0), a signature changes, wire semantics move.
- The wire report itself is additive-only forever; semantic score changes
  bump `score_contract` inside the report, not just the crate version.

## 1 · Bump — one command, one commit

Bump the workspace `Cargo.toml` version, then:

```bash
cargo run -p xtask -- sync-version    # mirrors every publish surface + doc pins
```

It rewrites the hand-spelled version surfaces (`bindings/flutter/rust/Cargo.toml`
· py · uniffi · the cli core pin · `pubspec.yaml` · `build.gradle.kts` ·
`package.json`), the Flutter example lockfile's entry for the plugin, **and**
the version-pinned doc coordinate (the JitPack coordinate line in
`bindings/kotlin/README.md`), then prints the five-lockfile regeneration loop
(workspace, py, uniffi, flutter/rust, fuzz). `--check` verifies without
writing (exit 1 on drift) — the local twin of the mobile.yml version gate,
which stays the CI enforcement. A required surface whose file spells no line
to sync fails both modes, and nothing is written.

**Version-pinned docs ride the same commit**: the JitPack coordinate line in
`bindings/kotlin/README.md` is the one left. Such a coordinate once lagged
(left at v0.6.0 through two releases, 2026-07-08 — greppable:
`grep -rn "qrcode-ai-scanner:v0" README.md bindings/`).
The coordinate now spells the new artifact name, so the live check covers both
spellings and must print only that line, at the new version:
`grep -rnE 'qrcode-ai-scanner:v0|qrcode-barcode-scanner:v0' README.md bindings/`.

**So do the goldens.** `spec_golden` pins every `spec/examples/*.json` to
the build's `versions` (the crate version included): rebuild the CLI after
the bump and regenerate the whole set from its committed fixtures, one
command per row of `spec/README.md` § Examples (`qrscan <fixture>
--profile full --budget-ms 0`), then review the diff — it must be the
version line and timings only, unless the release changes behavior.

## 2 · Cut the changelog

When local compilation is unavailable, dispatch `toolchain-probe.yml` with
`probe=release-prepare` and `version=X.Y.Z` on the clean release branch. Its
unprivileged job runs `scripts/prepare-release.py`: the actual `sync-version`
binary, Cargo regeneration of all five locks without dependency drift, a rebuilt
CLI producing every golden, and the dated changelog. It uploads a patch and a
receipt pinning the input source, tools and generated hashes. Inspect the official
artifact, review/apply its patch to the same source, commit it and qualify that
new revision normally. Preparation itself does not commit, tag or publish.

`## Unreleased` → `## X.Y.Z — YYYY-MM-DD`. The tag-time gates REQUIRE a
dated section matching the workspace version: mobile.yml's version gate
(shipped after 0.5.0 stale-notes) and, since crates, npm and PyPI used to
publish in parallel regardless of it, every publishing job itself —
`scripts/package-inspect.py versions --tag` checks the tag against every
publish surface and the CHANGELOG before the job touches a registry. A tag
without the section publishes nowhere.

## 3 · Pre-tag gates, locally first

Browser-loading changes also require the packed Vite/module-worker consumer:
`scripts/packed-wasm-browser.mjs ARCHIVE.tgz RECEIPT.json`. It installs the actual
tarball outside the source tree, checks SSR imports and declarations, builds its
worker/assets, and compares every non-timing report field between the automatic
loader and its `compatible` alias, which must load the same module. It requires
exactly one installed WASM whose bytes match `build-info.json`.
Supply `QRSCAN_NO_SIMD_BROWSER` for a verified runtime retaining V8's real disable
switch; the test asserts that SIMD is actually unavailable. `QRSCAN_TEST_FIREFOX=1`
adds Firefox coverage. `QRSCAN_INSTALL_BROWSERS=1` installs the lock-pinned test
browsers. The reusable `wasm-browser.yml` runs these checks on Windows and Linux
and is required before WASM publication. This is distinct from the reported
browser/OS metadata of any customer incident and from physical-device acceptance.

The build compiles one portable module with SIMD disabled and validates it with
SIMD forbidden after optimization, then writes `build-info.json` from those
bytes. `scripts/package-inspect.py wasm` refuses a second module, bytes or
compiled inputs that differ from that record, and code features outside the
loader baseline. Retain the module's byte hash, sizes, tool versions, feature
requirements and representative measured timings.
Do not replace a published archive at an existing version. Loader-only corrections
follow the same patch-version, lockfile, golden and publication policy above.

### Local development checks

Read `RUST_TOOLCHAIN` in `.github/workflows/ci.yml` and the manifest's
`rust-version` before selecting tools. The exact development/CI compiler and
the MSRV floor are separate checks. Inspect installed checker versions too:
the workflow's cargo-deny version and syntax are authoritative for CI parity.
An installed older checker result must retain that difference in its receipt.

The commands below select the current pin explicitly and keep lockfiles fixed.
They apply to the recorded source input; identify owned local changes as well
as HEAD when the candidate is not committed yet.

```bash
cargo +1.99.1 fmt --all --check
RUSTFLAGS="-D warnings" cargo +1.99.1 clippy --workspace --all-targets --all-features --locked
cargo +1.99.1 nextest run --workspace --locked && cargo +1.99.1 test --doc --workspace --locked
# the core with one engine, as a dependency without default features builds it
RUSTFLAGS="-D warnings" cargo +1.99.1 clippy -p qrcode-barcode-scanner --locked --no-default-features \
  --features engine-rqrr,serde --lib
RUSTFLAGS="-D warnings" cargo +1.99.1 clippy -p qrcode-barcode-scanner --locked --no-default-features \
  --features engine-rxing,serde --lib
cargo +1.99.1 nextest run -p qrcode-barcode-scanner --locked --no-default-features \
  --features engine-rqrr,serde --lib --test capabilities \
  -E 'binary(capabilities) | test(/^capabilities::/)'
cargo +1.99.1 nextest run -p qrcode-barcode-scanner --locked --no-default-features \
  --features engine-rxing,serde --test capabilities
python3 scripts/check-type-parity.py
cargo +1.88 check -p qrcode-barcode-scanner --all-features --locked   # MSRV
python3 scripts/check-publish-guards.py --self-test   # both workflow policies' own scenarios
python3 scripts/check-publish-guards.py               # the publishing-job policy (§ Publishing)
python3 scripts/check-publish-guards.py --toolchains  # one Rust toolchain (§ Toolchain)
python3 scripts/package-inspect.py selftest           # the archive inspector's own scenarios
python3 scripts/native-floor.py --self-test           # the native platform floor's own scenarios
python3 scripts/cli-release.py --self-test            # the CLI release commands' own scenarios
python3 scripts/packed-cli-consumer.py --self-test    # the CLI archive consumer's own scenarios
python3 scripts/wasm_provenance.py --self-test        # the WASM build record's own scenarios
```

Core/dependency changes can invalidate four graphs outside the workspace, even
when wrapper code is unchanged. Check every affected locked root before its
selected native/platform tests:

```bash
for manifest in \
  crates/qrcode-ai-scanner-py/Cargo.toml \
  crates/qrcode-ai-scanner-uniffi/Cargo.toml \
  bindings/flutter/rust/Cargo.toml \
  fuzz/Cargo.toml; do
  cargo +1.99.1 metadata --locked --format-version 1 --manifest-path "$manifest" || exit "$?"
done

cargo +1.99.1 test --locked --manifest-path crates/qrcode-ai-scanner-py/Cargo.toml
cargo +1.99.1 test --locked --manifest-path crates/qrcode-ai-scanner-uniffi/Cargo.toml
```

Use one manifest path per Cargo invocation. Locked metadata checks dependency
closure; it does not build or test a binding. Flutter needs its portable staged
package/FRB/platform gates. Fuzzing uses the separately pinned nightly and its
own bounded workflow. Missing relocated fixtures or skipped selected tests do
not establish binding acceptance.

For consumers created outside the checkout, pass the exact compiler through
`RUSTUP_TOOLCHAIN` (or wrap the complete consumer in `rustup run`). A checkout-local
override does not apply after the consumer changes into a temporary project.
Read each script's temporary-target behavior, reserve disk and retain logs/receipts;
the lane's `CARGO_TARGET_DIR` need not control the consumer's separate build.

## 4 · Push, then gate CI **per-workflow-latest** before tagging

Push the release commit and wait for CI. **Judge each workflow by its most
recent run on the commit, never by grepping the full run list**: pushes can
spawn duplicate runs, and an infra-flake first attempt reads as red beside
its green retry (the sccache flake nearly blocked — and then mis-gated —
0.7.0, 2026-07-08):

```bash
for wf in ci python flutter mobile; do
  gh run list --commit "$(git rev-parse HEAD)" --workflow=$wf --limit 1 \
    --json conclusion --jq '.[0].conclusion'
done   # four lines of "success", or no tag
```

The two publishing workflows, `crates-publish.yml` and `npm-publish.yml`,
run on no branch push and no pull request, so the loop above never sees
them: their own jobs — crates-publish's packaging, each `.crate` built from
its archive and read back; npm-publish's platform builds, tarball
inspections, the platform floor of every packed addon and `operand-proof`
(npm must read every `npm publish` operand as a file; both in § Publishing) —
first run on the tag, unless the owner dispatches them on the release
branch. A dispatch from a branch builds and inspects every archive, then
stops before the registry: it publishes nothing. Recommended, as the
owner's step before the tag (not part of the gate above): one successful
dispatch of each on the release branch.

```bash
gh workflow run crates-publish.yml --ref "$(git branch --show-current)"
gh workflow run npm-publish.yml --ref "$(git branch --show-current)"
```

`cli-archives.yml` (§ CLI archives) runs on pull requests that touch its
inputs and on every push to main, never on a push to a release branch. On the
tag it attaches only what a run of that tag built and qualified, and a tag
never moves: a defect of the tagged commit that first shows on the tag keeps
the CLI archives off this version (§ 6). So, for the CLI, the owner's step
before the tag is two green runs on the exact commit to be tagged. Mode
`build`, which a push to main also runs, is every job but attach: the five
builds, the set assembled and inspected, run from its archives on the five
native hosts and in the four glibc containers, then qualified. Mode
`fetch-rehearsal`, a dispatch only, takes the anonymous download path of the
public check (§ 7) on the five hosts, against an asset this repository
already publishes.

```bash
gh workflow run cli-archives.yml --ref "$(git branch --show-current)" -f mode=build
gh workflow run cli-archives.yml --ref "$(git branch --show-current)" -f mode=fetch-rehearsal
gh run list --commit "$(git rev-parse HEAD)" --workflow=cli-archives \
  --json databaseId,event,status,conclusion   # build and rehearsal: completed, success
```

## 5 · Create the draft release, then tag + push the tag

The owner creates the version's one GitHub release, as an empty draft that
targets the full commit the tag will name, before pushing the tag. No
workflow creates, edits, publishes or deletes a release:
`scripts/check-publish-guards.py` refuses that in every publishing job
(§ Publishing). On the tag, `cli-archives › attach` and `mobile › ios-release`
only upload their own assets into this draft. Each refuses, uploading
nothing, when no release carries the tag, when more than one does, when the
release targets another commit, or when a published release lacks its assets
(§ 6). A draft does not create its tag: the tag push below starts the tag
runs, and the owner publishes once, at the end (§ 7).

```bash
SHA="$(git rev-parse 'HEAD^{commit}')"     # the full commit the tag will name
git ls-remote --tags origin 'refs/tags/vX.Y.Z*'                 # prints nothing
gh release list --limit 1000 --json tagName,isDraft \
  --jq '.[] | select(.tagName == "vX.Y.Z")'                     # prints nothing
python3 scripts/cli-release.py notes --version X.Y.Z > notes.md &&
  gh release create vX.Y.Z --draft --target "$SHA" --title vX.Y.Z --notes-file notes.md
gh release view vX.Y.Z --json isDraft,targetCommitish           # true, and $SHA
git tag -a vX.Y.Z "$SHA"          # annotated: headline + expected-red note
git push origin vX.Y.Z
git ls-remote origin 'refs/tags/vX.Y.Z' 'refs/tags/vX.Y.Z^{}'   # the ^{} line is $SHA
```

`--target "$SHA"` is required: without it GitHub records the default branch as
the release's target, and both lanes refuse a release that does not target the
tagged commit. `cli-release.py notes` prints the version's dated CHANGELOG
section (§ 2), then the statement on the prebuilt archives: their targets, what
SHA256SUMS proves, and that the binaries are not code-signed or notarized. When
the iOS lane ships on this version, `bindings/swift/release.sh` (run as
§ Toolchain says) prints these same steps, with its own uploads into the draft
before the tag push. Its pin commit is the commit the tag names, so it comes
before the gates of § 4.

The CLI assets carry the corresponding source,
`qrcode-barcode-scanner-cli-X.Y.Z-source.tar.gz`, a `git archive` of the tagged
commit (`SOURCE_ASSET` in `scripts/cli-release.py`). A published release takes
no later asset, so that choice, and the `LICENSING.md` wording that describes
it, are settled before the tag, never after.

## 6 · What fires, and what to expect (state: 2026-11-02)

Every publish leg is **idempotent** (skips versions already on the
registry) and **tag-only** (§ Publishing): a run on anything but a
`refs/tags/v*` ref builds and inspects, never publishes. If a leg dies on a
transient failure, re-run its failed jobs (`gh run rerun <run-id> --failed`)
or dispatch the workflow ON THE TAG (`gh workflow run <name> --ref vX.Y.Z`):
the tag's own commit and workflow file run again, nothing double-publishes,
and a publishing job waits for one of the same workflow and tag still
running (one concurrency group per workflow and tag). pub.dev is the
exception: it accepts only a pushed tag, so flutter › publish re-runs as
failed jobs only. npm-publish › publish-native uploads each platform package
missing at this version and the main package only once every one it pins
resolves on the registry: a re-run uploads exactly what is still missing,
and a version npm calls "previously published" (a probe that still answered
404 after an earlier upload) counts as live. crates-publish compares each
upload with the archive it inspected; a difference stops the job before the
next crate, with that crate live (yank it if it must not stay). python ›
release stops before uploading anything when a file PyPI already serves
differs from the inspected one, so a partial PyPI upload is completed by
re-running the failed jobs, which reuse the inspected wheels; a dispatch
rebuilds them, and completes it only if every rebuilt file is byte-identical.
A defect in the workflow itself can no longer be fixed on main and
re-dispatched from main (that is how 0.9.0's Node packages came to be built
from post-tag commit 9f8bbcf, 2026-07-20): fix it on main and cut the next
patch tag. And the release tooling itself is **pinned exact** (§ Toolchain):
the v0.9.0 train lost its first two npm-publish runs to an unpinned caret
resolving a new CLI whose host validation rejected `--use-napi-cross`
outside Linux-gnu (2026-07-20) — a toolchain must never move under a tag.

The two GitHub release lanes upload into the owner's draft (§ 5), each only
its own assets, and never replace one: `cli-archives › attach` the CLI assets
still missing from the draft (the archives, then the source archive, then
SHA256SUMS), read back afterwards; `mobile › ios-release` the xcframework zip
and `checksum.txt`. A re-run of the failed jobs reuses the run's artifacts, so
it completes a draft that holds part of that run's own CLI assets. GitHub
re-runs a run only within 30 days of its start; the artifacts are kept 90
days, or less under a lower repository retention limit. A refusal uploads
nothing and names the state; the owner's step depends on it:

- **No release carries the tag** (the draft was not created first): create it
  as § 5 says, `--target "$SHA"` included, then re-run the failed jobs.
- **More than one release carries it:** delete the extra drafts until one
  release remains, then re-run. A published release is never deleted (last
  case below).
- **The draft targets another commit:** set its target to the commit the tag
  names (`gh release edit vX.Y.Z --target "$SHA"`, or delete the draft and
  create it again as § 5 says), then re-run.
- **The draft holds CLI assets that are not this run's set** (a half-done
  upload, other bytes from another run, an unexpected
  `qrcode-barcode-scanner-cli-*` name, or SHA256SUMS ahead of a missing asset):
  delete the draft's `qrcode-barcode-scanner-cli-*` assets (`gh release
  delete-asset vX.Y.Z <name>`: a draft stays modifiable, and no workflow
  deletes), then dispatch mode `build` on the tag (`gh workflow run
  cli-archives.yml --ref vX.Y.Z -f mode=build`). That run builds, judges and
  attaches a new set. After the 30 days, this is also the way to complete a
  draft.
- **The iOS draft states** that ios-release names (`checksum.txt` without the
  zip, a zip that is not the archive `Package.swift` pins): correct the draft
  as its message says, then re-run.
- **A published release without its full set:** a published release is never
  completed in place. Ship the next patch version, whose draft takes its
  assets before its publication; the defective release's notes point to it.

| Leg | Expectation |
|---|---|
| crates-publish · npm-publish · python | green; registries live in ~10-15 min — once the one-time setup is done (§ Publishing). Before it, crates-publish and npm-publish stop at authentication; with only some npm trusted publishers configured, the configured platform packages go up and the main package does not, until a re-run after the rest are configured. On the first version under a new name (0.11.0), crates-publish and npm-publish upload nothing: the owner uploads that run's inspected artifacts (§ Publishing, First publication of a new name), and the jobs, approved or re-run, compare the live versions; python publishes through the pending publisher of owner step 5 |
| cli-archives › build to qualified | green, judging the tag's own bytes (§ CLI archives) |
| cli-archives › attach | green once the owner's draft exists: the missing CLI assets uploaded, SHA256SUMS last, then read back; its summary gives the SHA256SUMS sha256 and this run's id, the `qualified_run` of the public check (§ 7). Red, with nothing uploaded, in the states above |
| mobile › test + android | green (JitPack chain proven since v0.6.0) |
| mobile › ios | **expected red** at the dev-mode guard until the one-time Xcode leg (`bindings/swift/release.sh`) runs; `ios-release` is then skipped. After that leg, `ios-release` finds the zip release.sh uploaded to the owner's draft, leaves it and checks it against the `Package.swift` pin; it never creates or publishes a release |
| flutter › publish to pub.dev | **expected red** until the one-time manual first publish and owner step 6; the staged package must first pass real pub validation and native Android/iOS consumer builds |
| JitPack | builds on demand — trigger with a GET on the artifact URL |

## 7 · The steps no pipeline does

- **Publish the draft of § 5, once**, when attach's readback is green, the
  iOS lane's check too if it ships on this version, and no run of the tagged
  commit is queued or in progress:

  ```bash
  gh run list --commit "$SHA" --limit 100 --json name,status,conclusion   # $SHA of § 5: all completed
  gh release edit vX.Y.Z --draft=false --verify-tag
  ```

  `--verify-tag` stops when the remote tag is missing, so publication never
  creates a tag. A published release takes no further asset (§ 6): what is
  not on the draft by then stays off this version.
- **Then the public check of the CLI archives**, with the run id and the
  SHA256SUMS sha256 that attach's summary gives, while that run's artifacts
  are kept (§ 6):

  ```bash
  gh workflow run cli-archives.yml --ref main -f mode=public-download \
    -f tag=vX.Y.Z -f qualified_run=<attach run id> -f sums_sha256=<SHA256SUMS sha256>
  ```

  It anchors on that run's `cli-qualification` artifact, read by run id
  (release notes stay editable and are never an input; `sums_sha256` is an
  optional cross-check), downloads every CLI asset anonymously and runs the
  consumer again on the five hosts and in the four containers. It builds and
  uploads nothing, so it can run from main (`--ref vX.Y.Z` works too), which
  is the way around a defect in the tag's own download code. Claim the
  archives publicly available only once it passes: attach's authenticated
  readback and this anonymous check are separate receipts, as for OCI
  (§ Docker publishing). Record both run ids, the tag, the commit, the
  SHA256SUMS sha256 and the asset URLs in the owner's publication checklist;
  `README.md` and `distribution/README.md` list the archives only after that
  record.
- **Immutable releases stay off** (owner step 8): run the public check
  without `expect_immutable`, and claim no release attestation.
- Verify registries: `npm view @qrcode-ai-com/qrcode-barcode-scanner-wasm
  version` from 0.11.0 on (`npm view @supernovae-st/qrcode-ai-scanner-wasm
  version` for 0.10.x; this is the builder's bump signal) + crates.io
  (`qrcode-barcode-scanner`) + PyPI (`qrcode-barcode-scanner`).
- Downstream: the landing/app pins a caret 0.x range — **the caret freezes
  the minor** (`^0.7.0` never takes 0.8.0); minor bumps need a manual edit
  in the consumer. A consumer of a former name never reaches 0.11.0 through
  any range: it switches to the new package name by hand.

## Publishing — tag-only, trusted, one environment per registry

Engine and language packages publish only from a `refs/tags/v*` ref. Every other run — a `workflow_dispatch`
from a branch included — stops before the registry: crates-publish,
npm-publish and python build their artifacts and read them back
(`scripts/package-inspect.py`), mobile and flutter build theirs, and
cli-archives builds, inspects, runs and qualifies its archives
(§ CLI archives). The engine's GitHub release has two upload lanes,
cli-archives › attach and mobile › ios-release: each uploads with the
workflow's own token into the draft the owner created (§ 5), and no job
creates, edits, publishes or deletes a release. Each
publishing job is its own job, guarded by `if: startsWith(github.ref,
'refs/tags/v')`, needing the job that inspects what it uploads, holding the
only write-capable permission in its workflow, naming a GitHub environment
and running the versions gate first.

`scripts/check-publish-guards.py` (ci › lint) holds the workflows to these
rules, and to the ones below. It is a static lint over the files in
.github/workflows of the revision under test: it reads their YAML and
matches the commands of every `run:` script, so it fails a change that drops
a rule in a form it can read. It does not see what a script or a tool a step
calls goes on to do, the workflows of another branch or tag, or a repository
setting. The environments' deployment rules and the tag ruleset (owner
steps 0 and 1) backstop what it misses.

**What that guarantees, and what it does not.** The `if:` guards prevent
accidental publishing by this revision of the workflows; they are not the
security boundary. A workflow file is code on a ref: `workflow_dispatch` runs
the file of the ref it is given, and anyone who can push a branch can push a
copy without the guard. The crates.io, npm and PyPI trusted publishers match
the repository, the workflow file name and the environment, not the ref
(pub.dev alone also checks the pushed tag). The security boundary is the
environments' deployment policy (`v*` tags only) together with the tag
ruleset (who may create a `v*` tag): owner steps 0 and 1 below. And "no
branch dispatch can publish" holds only for revisions that contain this
change: every branch and tag cut before it (v0.1.0 to v0.9.0 included) still
carries the old jobs, which publish on any dispatch with the long-lived
repository tokens — hence step 0, at merge.

| Workflow › job | Environment | Credential | What it uploads |
|---|---|---|---|
| crates-publish › publish | `crates-io` | crates.io trusted publishing: `rust-lang/crates-io-auth-action` trades the OIDC token for a 30-minute crates.io token | both crates, packed (`cargo package --locked --no-verify`) and inspected in the job before the token is minted; each upload compared with its inspected archive, byte for byte |
| npm-publish › publish-native · publish-wasm | `npm` | npm trusted publishing (npm CLI ≥ 11.5.1 on Node 24), provenance attested automatically; a version the owner uploads by hand (the first under a new name) carries no npm provenance | the very tarballs pack-native and build-wasm packed and inspected, read back again in the job and uploaded unchanged with `npm publish <tarball> --ignore-scripts`; each `npm publish` first checks that its operand is an absolute path to a regular `.tgz` file whose path and sha256 the in-job re-inspection recorded, and stops the job otherwise; after every upload, and for a version already live, the registry's `dist.integrity` must be that tarball's sha512 |
| python › release | `release` | PyPI trusted publishing: a pending publisher on the new project `qrcode-barcode-scanner` (owner step 5); the 0.9.0 files of the former project `qrcode-ai-scanner` carry PEP 740 attestations | `dist/`, read back in the job: exactly one wheel per row of the wheels matrix and the sdist; before the upload, every file PyPI already serves at the version must be the one read back (sha256), and PyPI may serve no other file there, so `skip-existing` (which goes by file name) skips only proven copies |
| flutter › publish | `pub` | pub.dev automated publishing; a pushed tag only (pub.dev accepts no other trigger) | the portable archive created once by the unprivileged stage job and consumed by host/native checks; extracted outside the checkout, re-inspected with `package-inspect.py flutter --package-root … --strict --release-set --record …`, with file hashes checked immediately before publishing (dormant pending owner step 6) |
| mobile › ios-release | `release` | the workflow's own `GITHUB_TOKEN`, `contents: write` | the CI-built xcframework zip and its `checksum.txt`, only into the owner's draft (the one release of the tag, targeting the tagged commit), only where no zip is, and only when its sha256 is the one Package.swift pins, compared before any upload; an attached zip is verified against that pin, never replaced; it never creates, edits or publishes a release |
| cli-archives › attach | `release` | the workflow's own `GITHUB_TOKEN`, `contents: write`, held by four fixed `gh` steps only | the CLI assets assemble wrote once (`cli-release-set`), re-inspected in the job against the SHA256SUMS sha256 every consumer judged, only into the owner's draft targeting the tagged commit: the missing ones, archives, then source, then SHA256SUMS, each file found in the re-inspection record before its upload, then read back; a draft holding other CLI bytes, or a published release lacking any, is refused with nothing uploaded |

No registry token is read by any workflow. A token (or a person) is still
required only where a registry has no OIDC path: the first version of a NEW
crate on crates.io, the first version of a NEW npm package (a new napi
target, say — or `npm stage publish`), and pub.dev's first upload, which
must be a user's. 0.11.0 is the first version under every package's new
name: [First publication of a new name](#first-publication-of-a-new-name),
after the owner steps, says how those first versions go up.

**Lanes that need a stored token do not live here.** The owner decided on
11 November 2026 where they run. A destination that can only be updated with a
long-lived token, such as an image mirror or a store with no OIDC path, gets
its publishing job in the satellite repository
`qrcode-ai-com/qrcode-barcode-scanner-distribution`, never in this one. That
repository is created with its first lane. Each registry gets its own
protected environment there, holding only that registry's token, and its
deployment rule and tag rule are set before the token is added. A lane whose
registry supports OIDC stays in this repository, under the rules above. The
first version under a new name remains the owner's upload.

**Packaging releases.** Extras that repack a published version without
changing its source are attached to releases of their own:
`linux-packages-vX.Y.Z` (Debian packages), `rpm-packages-vX.Y.Z` (Fedora
RPMs) and `appimage-vX.Y.Z` (the AppImage). The `vX.Y.Z` release, its tag and
its files stay as published. No workflow creates these releases: the owner
creates each one, or gives an explicit go for it, from files a workflow built
and judged, and it is never marked as the latest release. These tag patterns
are not covered by a tag ruleset today, unlike `v*`, `oci-v*` and
`agents-v*`.

**What npm reads as the operand.** npm reads a relative path with one slash
(`npm-wasm/<file>.tgz`) as the GitHub repository of that name, not as a
file: npm-package-arg looks for a hosted-git shorthand before a file. So the
npm jobs spell every tarball path from `"$PWD"`, the same way in the
re-inspection record and in the operand, and `npm-publish › operand-proof`,
which both publishing jobs need, lays the files out as they do, expands every
operand exactly as they spell it and parses each with the npm-package-arg of
the npm they publish with (the same setup-node pin, Node 24): each must be a
file. It only parses (no registry call, no token, no cache). npm-publish.yml
runs on no pull request, so the proof runs on every branch dispatch and on
the tag, where its failure stops the run before a publishing job can ask for
an OIDC token; a dispatch of npm-publish.yml on the release branch before
tagging builds, inspects and parses everything without publishing, and is the
owner's call. On a pull request, ci › lint holds the spellings themselves
(absolute and identical in the operand, the record and the proof).

**What a native addon may need.** The main package admits Node 18
(`engines.node >= 18`), so no addon may need more from the system than Node
18 does on its platform (nodejs/node v18.x BUILDING.md): glibc 2.28 on
linux-x64-gnu and linux-arm64-gnu, musl on linux-x64-musl, macOS 10.15 on
x64 and 11 on arm64, and on Windows no Visual C++ runtime DLL, which node.exe
does not import (the addon links the C runtime statically:
`crates/qrcode-ai-scanner-node/.cargo/config.toml`). Every library it loads
must belong to the operating system.
`scripts/native-floor.py --policy node --complete` reads each packed addon's
own bytes (ELF needed libraries and symbol versions, Mach-O load commands
and minimum OS, PE imports and delay imports) and requires each of the six
release targets exactly once: pack-native runs it on every run, a branch
dispatch included, and publish-native again before its first upload. A
refusal names the addon and what it needs. The consumer jobs cannot stand in
for it: GitHub's Windows runners carry the Visual C++ Redistributable.
ci › packaging runs its self-test on every pull request.

**What a publishing job may run.** A job holding `id-token: write` exposes
the OIDC token request to every one of its steps, and ios-release and
cli-archives › attach hold `contents: write`. In these privileged jobs (the policy
check reads each point):
- every action by commit SHA, first-party actions included, and no local
  action; container and service images by digest; the checkout keeps no
  credential (`persist-credentials: false`); scripts run in bash and
  interpolate no `${{ }}` expression;
- Rust through rustup at `RUST_TOOLCHAIN`, an exact x.y.z resolved step >
  job > workflow and never set in a script; pnpm, Flutter, Dart and every
  other setup action or installer tool at an exact version;
- nothing installed or fetched on demand: no npm/pnpm/yarn install, exec or
  dlx, no pip, uv tool, cargo install or binstall, pub global or dart run;
  the crates go up with `cargo publish --locked --no-verify` (no build
  script runs), and the npm packages with `npm publish <absolute tarball
  path> --ignore-scripts` (no lifecycle script runs, nothing is repacked);
- `actions/setup-node` and `actions/setup-python` are the one relaxation:
  pinned by SHA, on a release line (Node 24) or an exact version, never
  `lts/*`, `latest`, `current` or a range. Security point releases of the line
  arrive without a repository change, and the action and its version manifest
  are first-party; a step after the setup prints the resolved versions before
  anything is uploaded, and for npm asserts npm ≥ 11.5.1;
- no secret: no workflow references the `secrets` context at all;
- one publish per workflow and tag at a time (the concurrency group
  `publish-<workflow>-<ref>`, never cancelling);
- no release created, edited, published or deleted, and no asset replaced:
  no `gh release create`, `edit`, `delete` or `delete-asset`, no `gh release
  upload --clobber`, no `gh api` call naming a release, nothing naming the
  GitHub API, no release action. The owner creates the one draft before the
  tag and publishes it once (§ 5, § 7);
- no exception. flutter › publish names exact Flutter and Dart SDKs and
  resolves only the tracked lockfiles of the staged candidate (`flutter pub
  get --enforce-lockfile`): `bindings/flutter/pubspec.lock` and the example
  app's, which the same command resolves. pub does not publish the package's
  lockfile, and the inspection fails if it is rewritten or listed. To move
  to another Flutter SDK, change it in every job of flutter.yml and in
  flutter-qualification.yml, set the publish job's Dart SDK to the one it
  bundles, then run `flutter pub get` in `bindings/flutter` with that SDK
  and commit both reviewed lockfiles.

The jobs whose outputs the publishing jobs upload (build-native,
pack-native, build-wasm, wheels, sdist, ios, and cli-archives' build and
assemble) pin their third-party actions by commit and restore no cache on a
tag: rust-cache and sccache run on other refs only, setup-node caches nothing
(`package-manager-cache: false`), and build-native's musl row and the CLI's
two GNU builds install Zig 0.14.1 from ziglang.org in a run step,
checked against the sha256 its download index publishes, with an empty global
cache under `RUNNER_TEMP` (mlugg/setup-zig restored its Zig tarball from the
Actions cache under a fixed key on every ref, a hit skipping the signature
check). `scripts/check-publish-guards.py` holds every job whose artifacts a
publishing job downloads, then theirs, to this. They are not privileged. The
inspections read file sets, texts and what the compiled binaries require:
each native addon's and each `qrscan` executable's libraries, symbol versions
and minimum OS (`scripts/native-floor.py`, above; `--policy cli` for the
executables) and the WASM module's code features
(`scripts/wasm_provenance.py`). None of them can tell a tampered binary from
a sound one (accepted residuals, below).

The iOS xcframework zip carries the root `LICENSE` and `LICENSING.md` inside
`QrcodeAiScannerFFI.xcframework/`, preserving the single binary artifact at
the archive root. Inspect both files in the actual archive before distribution;
this packaging step does not establish remote SwiftPM consumer readiness.

**Named exception** to "only a tag publishes":
- JitPack builds the Android AAR from any ref on demand, a branch snapshot
  included, outside Actions (jitpack.yml: Rust 1.88.0, locked Cargo builds): neither
  the tag guard nor the inspection applies to it.

**Accepted residuals**, each with its reason:
- `pypa/gh-action-pypi-publish` is pinned by commit, but at run time it pulls
  its container image `ghcr.io/pypa/gh-action-pypi-publish:<ref>` by tag, not
  by digest (create-docker-action.py at the pinned commit), inside the job
  holding the OIDC token. pypa controls both the commit and the image; the
  alternative, a hash-locked twine after an explicit OIDC exchange, would
  replace the action PyPI documents.
- The Node build (build-native, pack-native, ci › node-smoke) runs `pnpm
  install` without a lockfile: `@napi-rs/cli` is pinned exact, its own
  dependencies float. Committing a pnpm lockfile needs an install to
  generate it; it is the next step for the package's owner, after which
  these installs take `--frozen-lockfile`.
- The packed binaries (.node, .so, .pyd, .a, .wasm and the `qrscan`
  executables) are built by those non-privileged jobs from the tag's
  checkout; no inspection can tell a tampered binary from a sound one, so
  their pinned actions and tools (Zig and binaryen by sha256) and the absence
  of caches on a tag are what holds there.
- Three of the six wheels build in containers that PyO3/maturin-action, at
  its pinned commit, pulls by a mutable tag at run time (its default image
  for the row): x86_64 manylinux `quay.io/pypa/manylinux2014_x86_64:latest`,
  aarch64 manylinux `ghcr.io/rust-cross/manylinux2014-cross:aarch64` and
  x86_64 musllinux `ghcr.io/rust-cross/rust-musl-cross:x86_64-musl`, the last
  two from the rust-cross organization, a third party. Their toolchains and
  libc go into the shipped `.so`, which no inspection can judge. The action
  supports a digest: its `container` input takes a full image reference and
  hands it unchanged to `docker pull` and `docker run`, so each row can name
  `image@sha256:…`. That is a python.yml change, with digests to resolve and
  to refresh, left to its owner; until then these jobs, which hold no token,
  build on whatever the tags point to.
- The CLI build jobs run on the fixed runner labels `ubuntu-24.04`,
  `macos-15` and `windows-2025` (npm's build-native takes the floating
  `macos-latest` and `windows-latest`). GitHub updates these images weekly,
  so the image, Xcode, SDK and MSVC versions are recorded in each archive's
  `build-info.json`, not pinned.
- The `qrscan` binaries are not code-signed or notarized: there is no Apple
  Developer ID or Windows code-signing certificate to sign with. The macOS
  arm64 binary carries only the linker's ad-hoc signature, which names no
  developer. SHA256SUMS is an asset of the same release, so it detects a
  damaged download, not a substituted release. No workflow attestation is
  produced, since a `gh release` job holds `contents: write` alone, never
  `attestations: write` or `id-token: write`; nor is a GPG or minisign
  signature (no signing key is held for it) or an SBOM. The release notes and
  each archive's README say what applies to the user.
- The release lanes upload with the job token, which no trusted publisher
  binds to an environment: a repository writer can author a workflow, on any
  branch, that holds `contents: write` and writes releases. The `release`
  environment and the tag ruleset bind this revision's jobs; repository write
  access stays part of the release boundary, as for GHCR (§ Docker publishing).

**Owner steps, in this order** (repository and registry settings; no workflow
performs them):

0. **At merge, at once, all of it.**
   - Revoke `CARGO_REGISTRY_TOKEN` at crates.io (Account Settings › API
     Tokens) and `NPM_TOKEN` at npmjs.com (Access Tokens), then delete both
     repository secrets (Settings › Secrets and variables › Actions): nothing
     at this revision reads them, while every older ref's crates and npm jobs
     publish with them on any dispatch.
   - Look for the same two names at the organization that owns the
     repository and in every environment (`gh secret list --org qrcode-ai-com`,
     `gh secret list --env <name>` for each environment): once the repository
     secret is gone, an older workflow's `secrets.NPM_TOKEN` resolves to an
     organization or environment secret of that name. Revoke and delete any
     found. Since the transfer, no `supernovae-st` organization secret
     reaches this repository; revoke any copy of the two tokens kept there
     all the same.
   - Add the tag rule `v*` to the existing `release` environment (Settings ›
     Environments › release › Deployment branches and tags › Selected
     branches and tags): it also gates the pre-change python.yml, which
     publishes to PyPI on any dispatch from an older ref.
   - **Tag ruleset.** Settings › Rules › Rulesets › New tag ruleset: target
     `refs/tags/v*`, restrict creations, updates and deletions, with the
     release maintainers alone on the bypass list. Until it exists, anyone
     with write access can create a `v*` tag on any commit, a modified
     python.yml included, and the `release` environment admits it.
   - Retire the stale remote branches: every branch cut before this change
     carries the old publishing jobs (python › release on any dispatch, the
     crates and npm jobs reading the tokens, mobile › ios with `contents:
     write` on any dispatch). List them (`git ls-remote --heads origin`, then
     `git show origin/<branch>:.github/workflows/npm-publish.yml`) and delete
     or archive each one not needed. The tags v0.1.0 to v0.9.0 stay: their
     versions are live. Once the tokens are gone, their crates and npm jobs
     fail at authentication, but two of their jobs need no token: python ›
     release (v0.5.0 to v0.9.0) publishes to PyPI through OIDC in the
     `release` environment on any dispatch of the tag, and the `v*` rule
     admits those tags (PyPI matches the workflow file and the environment,
     not the ref); mobile › ios (v0.5.0 to v0.9.0) creates the tag's GitHub
     release with the workflow's own token when it is missing, and attaches
     its zip when no asset is there. For PyPI the owner's option is step 4:
     required reviewers on `release`, so that every run on it, an old tag's
     included, waits for an approval.
1. **Environments, before steps 2 and 3.** `crates-io`, `npm`, `release` and
   `pub`, each limited to the tag rule `v*` (`release` has it since step 0;
   create the other three). Mandatory before any trusted publisher is
   registered: a referenced environment that does not exist is created on
   first use WITHOUT protection rules, and a publisher bound to an
   unprotected environment accepts a run from any branch. The old `pub.dev`
   environment is no longer referenced and has no protection: it is not to be
   used, so delete it.
2. crates.io, for the new crates `qrcode-barcode-scanner` and
   `qrcode-barcode-scanner-cli`, each once its first version is uploaded
   ([First publication of a new name](#first-publication-of-a-new-name)):
   Settings › Trusted Publishing › add GitHub: owner `qrcode-ai-com`,
   repository `qrcode-barcode-scanner`, workflow `crates-publish.yml`,
   environment `crates-io`; then restrict the crate to trusted publishing,
   revoke the API token that made the first upload, and read all three back
   in the crate's settings. The 0.10.x crates `qrcode-ai-scanner` and
   `qrcode-ai-scanner-cli` keep the binding recorded for them (`supernovae-st`
   / `qrcode-ai-scanner`) and are never re-bound.
3. npmjs.com, for each of the eight new packages —
   `@qrcode-ai-com/qrcode-barcode-scanner`, `-darwin-arm64`, `-darwin-x64`,
   `-linux-x64-gnu`, `-linux-arm64-gnu`, `-linux-x64-musl`,
   `-win32-x64-msvc` and `-wasm` — once its first version exists
   ([First publication of a new name](#first-publication-of-a-new-name)):
   Settings › Publishing access › *Require two-factor authentication and
   disallow tokens* (it does not block trusted publishing); then Settings ›
   Trusted Publisher › GitHub Actions: organization or user `qrcode-ai-com`,
   repository `qrcode-barcode-scanner`, workflow `npm-publish.yml`,
   environment `npm`, with `npm publish` allowed and not only staged
   publishing. Create each publisher at most two days before the tag run that
   first publishes through it: npm drops a new configuration that has not
   completed a publish within two days. The packages released up to 0.10.1
   under `@supernovae-st` keep the binding recorded for them (0.10.x:
   `supernovae-st` / `qrcode-ai-scanner`) and are never re-bound.
4. **Recommended: required reviewers** on `crates-io`, `npm` and `release`
   (Settings › Environments › each one › Required reviewers: up to six people
   or teams, one approval lets the job run; with *Prevent self-review* where
   staffing allows), so every publish waits for a second person. On `release`
   it also holds the pre-change python.yml of the tags v0.5.0 to v0.9.0,
   which no token revocation stops (step 0), and the two release lanes
   (mobile › ios-release, cli-archives › attach), whose uploads into the draft
   then wait for that approval too.
5. PyPI: add a pending trusted publisher for the new project
   `qrcode-barcode-scanner` in the account's Publishing settings: owner
   `qrcode-ai-com`, repository `qrcode-barcode-scanner`, workflow
   `python.yml`, environment `release`. The project is created by the first
   upload through it, and a pending publisher reserves nothing: check that the
   name is still free just before the tag. The publisher of the former
   project `qrcode-ai-scanner` (0.9.0: owner `supernovae-st`, repository
   `qrcode-ai-scanner`) stays as recorded and is never re-bound.
6. pub.dev, only if the Flutter package ships in the release, under the name
   `qr_barcode_scanner`. Its first upload is a user's, made only from the
   `flutter-stage` artifact of an owner-authorized `flutter.yml` run on the
   tag whose `test`, `build-android` and `build-ios` jobs passed,
   re-inspected first with `scripts/package-inspect.py flutter --package-root …
   --strict --release-set`. The package then moves to the verified publisher
   `qrcode-ai.com`; that transfer cannot be undone. The publish job is ready
   for its trusted publisher: its Flutter and Dart SDKs are exact versions,
   its `flutter pub get` enforces the tracked pubspec.lock, and
   scripts/check-publish-guards.py excepts no job. Then Admin › Automated
   publishing › enable GitHub Actions: repository
   `qrcode-ai-com/qrcode-barcode-scanner`, tag pattern `v{{version}}`,
   require environment `pub`.
   The `flutter-stage` artifact is the archive `scripts/stage-flutter-package.py`
   builds from the tagged commit; never publish `bindings/flutter` directly.
   The stage vendors that candidate's normalized Cargo archive, verifies its
   source/version/LICENSE identity, preserves the binding lockfile, and adds
   the bundled-core digest to the staged manifest to invalidate cargokit's
   cache on core-only edits. Its receipt records source, content and archive
   hashes. Inspect that same root and run the native example builds before
   claiming readiness; source-only checks are insufficient. See
   `bindings/flutter/README.md` for the staging and inspection commands.

   One recorded exception, decided by the owner on 10 November 2026: the
   first upload of `qr_barcode_scanner` 0.11.0 may use the `flutter-stage`
   artifact of the `Flutter candidate qualification` workflow,
   [run 42717410740](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/42717410740),
   on revision `1fa0813c1465f7b180ca883cb266bbc45e1fe1c6`. Its four jobs
   passed: stage, Dart host and pub.dev dry run, Android APK build, unsigned
   iOS build. The archive SHA-256 is
   `0649680ff62cf27c1a072a61b11a8fcf726a6e097a15391e5ee8a70d82ab5eba`. Check
   that hash and re-inspect the extracted root as above before the upload.
   The exception covers that one archive. Every later version follows the
   rule of this step.

   This replaces the stage of revision `1695072` named here first. A device
   check of those sources
   ([run 42715677751](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/42715677751))
   passed the example's integration test on an Android emulator with NDK 28.2
   and found both 64-bit libraries aligned for 16 KB memory pages, but
   aligned to 4 KB when built with NDK 27.0. The package README of `1695072`
   stated r27 as its floor. Revision `1fa0813` changes that statement to r28
   and nothing else in the package.
7. Branch protection: the matrix check `ci / test (ubuntu-latest)` is now
   `test (ubuntu-24.04)`; if it is a required check, update the rule (and
   add `node-smoke`, `wasm-smoke` and `packaging` if they should be).
8. **Immutable releases stay off for now.** The repository's release
   immutability setting locks each release's assets and tag at publication
   and has GitHub attest them; drafts stay modifiable. It applies to every
   later release of the repository, `agents-v*` included. Enable it only after
   the draft-first procedure (§ 5 to § 7) has been qualified for both release
   lanes, and after checking that every other release of the repository gets
   its assets before publication. Until then the public check (§ 7) runs
   without `expect_immutable` and no release attestation is claimed. Once it
   is on, the public check takes `-f expect_immutable=true`, which runs `gh
   release verify` and `gh release verify-asset` on every CLI asset, and
   `gh release view vX.Y.Z --json isImmutable` reports the state.

### First publication of a new name

0.11.0 is the first version under every package's new name, and crates.io and
npm bind a trusted publisher only to a package that exists. The first version
under a new crates.io or npm name is therefore uploaded by the owner, from the
bytes the tag run built and inspected, never from a new build:

- **Which run.** Only the artifacts of the `vX.Y.Z` tag run in which every job
  the publishing job needs passed. For npm, publish-native needs pack-native,
  operand-proof, consume-native and consume-native-musl, and publish-wasm needs
  build-wasm, operand-proof, consume-wasm and consume-wasm-browser: a tarball
  from a run with a red or skipped consumer job is never uploaded. The upload
  happens within 30 days of that run and before its artifacts expire;
  otherwise a new tag run is made.
- **Order.** crates.io: the core crate, then the CLI, whose packaged lockfile
  pins the core by checksum. npm: the six platform packages, then the main
  package, then the `-wasm` package. PyPI needs no manual upload: python ›
  release publishes through the pending publisher of owner step 5. pub.dev
  only if the Flutter package ships (owner step 6).
- **crates.io.** Download the run's `rust-packed-consumer-<os>` artifacts:
  each holds the two `.crate` files the consumers judged. In a clean clone of
  the tag, with the CI compiler and an isolated `CARGO_HOME` and
  `CARGO_TARGET_DIR`, package both crates again:

  ```bash
  cargo package --locked -p qrcode-barcode-scanner -p qrcode-barcode-scanner-cli --no-verify
  ```

  Each sha256 must equal the artifacts' own. Only then publish the core from
  that clone with `cargo publish -p qrcode-barcode-scanner --locked --no-verify`
  and an API token scoped to publishing new crates, set in that command's
  environment only, and read the version's index entry back: its `cksum` must
  be that sha256. Then do the same for the CLI.
- **npm.** Download the run's `npm-native-tarballs` and `npm-wasm-tarball`
  artifacts, check them against the artifact digests the run lists and record
  each tarball's sha256. From a clean clone of the tag, re-inspect them with
  the publishing jobs' own commands: `scripts/package-inspect.py archive`
  with `--release-set --strict` and `scripts/native-floor.py --policy node
  --complete` on the native set, `scripts/package-inspect.py archive` with
  `--strict` on the Wasm tarball. Upload each file unchanged, with the owner's
  two-factor code:

  ```bash
  npm publish <absolute path>.tgz --access public --ignore-scripts
  ```

  Then read `npm view <name>@X.Y.Z dist.integrity` back: it must be the
  tarball's sha512. A version uploaded this way carries no npm provenance.
- **Then the publishers.** Owner step 2 configures each new crate's publisher
  and hardens the crate; owner step 3 hardens each new npm package and
  configures its publisher within the two days before the tag run that first
  publishes through it. With required reviewers on the environment (owner
  step 4), the tag run's publishing jobs wait for the approval; without them
  they stopped at authentication with nothing uploaded, and their failed jobs
  are re-run. Either way they find each version live and compare it with the
  archive they inspected: crates-publish after an OIDC token exchange, which
  shows the crate's publisher configured and exchanged, npm-publish by
  `dist.integrity` alone, with no token exchange. A publisher is exercised,
  and its binding proven, only by a later version uploaded through it.

Record, for each artifact, its name, version, sha256, source run and artifact
digest, the comparison result, the upload time, the read-back and the
publisher's state.

## CLI archives — prebuilt qrscan in the owner's draft release

`.github/workflows/cli-archives.yml` attaches prebuilt `qrscan` archives to
the engine's `vX.Y.Z` GitHub release. For version X.Y.Z it makes seven
assets, all named `qrcode-barcode-scanner-cli-X.Y.Z-…`:

- one archive per target: `x86_64-unknown-linux-gnu` and
  `aarch64-unknown-linux-gnu` (glibc 2.28 or later), `x86_64-apple-darwin`
  (macOS 10.15 or later) and `aarch64-apple-darwin` (11.0 or later) as
  `.tar.gz`, and `x86_64-pc-windows-msvc` as `.zip`. Each holds one top
  directory named like the archive, with `qrscan` (`qrscan.exe`), its license
  material, `SOURCE.md` and `build-info.json`;
- `…-source.tar.gz`, the corresponding source: a `git archive` of the tagged
  commit, which holds the workflow and the script that build the archives;
- `…-SHA256SUMS`, one line for each of the six other assets.

No musl, Windows arm64 or universal macOS archive is built.
`distribution/cli/README.md`, identical in every archive, is the user's page:
download and verify, what the checksum proves, the unsigned binaries,
extraction, exit codes, license and updates.

**Every run** (pull requests that touch its inputs, pushes to main,
dispatches and the tag) judges the set from its bytes before any upload:

- build, on each target's runner (`scripts/cli-release.py build`): the GNU
  rows through cargo-zigbuild against glibc 2.28, with Zig's libunwind, macOS
  at its deployment target, the Windows C runtime linked statically. It
  refuses an inherited compiler setting or a Cargo config before cargo
  starts, and a binary holding a build-host path after;
- assemble, on one host: the five builds must agree with each other and with
  the checkout; every linked crate's license text is collected (a license
  that `deny.toml` does not allow, or a crate without a text and without a
  reviewed override under `distribution/cli/license-texts/`, stops it); each
  archive is written twice and compared; then the source archive and
  SHA256SUMS. Its `cli-release-set` artifact, uploaded once, is what every
  later job judges and what attach uploads;
- inspect: names, members, modes and license copies, `build-info.json`
  against the checkout and Cargo.lock, the source archive against the
  commit's tree, SHA256SUMS, the license material re-read
  (`package-inspect.py archive`, `cli-release.py licenses`), and each
  executable against its platform floor (`native-floor.py --policy cli`);
- consume, from the archive as a user would (`scripts/packed-cli-consumer.py`):
  on the five native hosts, and in AlmaLinux 8.10 (glibc 2.28) and Debian 12
  containers pinned by digest on both Linux architectures, with no network, a
  read-only root and every capability dropped. SHA256SUMS is checked by two
  hash implementations, the OS tool extracts, every case runs in a scrubbed
  environment, every report of the shared truth set must carry
  `trace.engine_panics` 0, and a panic must unwind (exit 101, never an abort);
- qualified (`cli-release.py qualify`): the nine receipts agree on one set and
  one identities digest, and the job exports the SHA256SUMS sha256 every
  consumer judged.

**On a `v*` tag**, attach runs once all of these passed, in the `release`
environment with `contents: write`:

- it re-inspects `cli-release-set` against the qualified SHA256SUMS sha256,
  before any release call;
- four fixed `gh` steps alone hold the token: list the releases, view the
  tag's release (downloading any CLI asset already on it), upload, read back.
  The plan and the readback verdict (`cli-release.py attach-plan` and
  `readback`) read the files those steps wrote, without the token;
- into the owner's draft, when it targets the tagged commit, the plan
  uploads only the CLI assets the draft lacks: the archives, then the source
  archive, then SHA256SUMS, each one found in the re-inspection record first.
  Another lane's assets are left alone. A published release passes only when
  it already holds the whole set, identical, and then takes nothing. Every
  other state is refused with nothing uploaded (§ 6 gives the owner's step
  for each);
- the readback requires exactly the seven assets, each one the inspected
  bytes. Its summary gives the SHA256SUMS sha256 and the run id.

`scripts/check-publish-guards.py` holds attach to this: no action but
checkout and download-artifact, one download of `cli-release-set` with
`digest-mismatch: error`, the re-inspection against the output that
qualified exports, the four token steps verbatim, one upload of
`cli-release-set` in the workflow (assemble's), and no release created,
edited, published or deleted (§ Publishing).

**After publication** (§ 7), the public-download dispatch is the anonymous
check. It takes the tag and the attach run's id. public-anchor reads that
run's `cli-qualification` artifact by run id, and the run itself through
`gh run view`: cli-archives, completed with success, on the tag, at the
recorded commit. Each target's archive and SHA256SUMS are then downloaded
without a token, over HTTPS from github.com and a `*.githubusercontent.com`
host (a draft answers 404, so a download also proves publication), checked
against the anchor and run on the five hosts and in the four containers, the
consumer from the dispatch ref and its contract data from the anchor commit.
public-verify downloads every CLI asset, the source archive included, and
public-qualified requires every receipt to agree with the anchor. Before the
tag, mode `fetch-rehearsal` (§ 4) runs that download path on the five hosts
against an asset of the `agents-v0.1.0` release, which the repository
already publishes.

**Updates.** A fix ships as a new version with new asset names. A published
asset is never replaced or deleted and a tag never moves; a defective
release's notes point to its successor. No asset name is free of a version:
`releases/latest` may lead to another component's release (`agents-v*`).

**Not provided** (accepted residuals, § Publishing): code signing, that is no
Apple Developer ID signature, notarization or Authenticode signature, as the
release notes and README say; GPG or minisign signatures and workflow
attestations, as README says; an SBOM, `build-info.json` listing the linked
crates instead; and a release attestation, until owner step 8. Nor is binary
reproducibility claimed: assemble's double write proves its writer
deterministic for one set of inputs and one Python and zlib, which its
receipt records, while archives from two runs differ, since `build-info.json`
carries the run and the runner image. Systems older than the runners are
judged from the binaries, not run: macOS 10.15 to 14, Windows 10, 11 and
Server 2016 to 2022, and older Linux kernels (glibc 2.28 itself runs, in the
AlmaLinux 8 containers). Every consumer receipt lists the cases it leaves
out, among them exit 3, which depends on the budget and the machine, and a
panic inside the engine, which no fixture triggers deterministically.

## Independent MCP npm releases

The MCP adapter has its own SemVer in `integrations/mcp/package.json`, its lock
and `server.json`. It uses the published scanner `0.11.0`; publishing an adapter
version does not rebuild or republish the Rust, Node, Python or WASM engine.
Published versions and tags are immutable.

`npm-mcp-publish.yml` runs on a pull request affecting its inputs, a manual
dispatch, or an `agents-v*` tag. Pull requests and the default manual `inspect`
mode pack and consume only: no environment, OIDC permission or upload. Rehearse
the reviewed branch before integrating it:

```bash
python3 scripts/test-mcp-release.py
python3 scripts/check-publish-guards.py --self-test
actionlint .github/workflows/npm-mcp-publish.yml
gh workflow run npm-mcp-publish.yml --ref <reviewed-branch> -f mode=inspect
```

A new workflow must first reach the default branch for manual dispatch. Its
pull-request jobs provide the pre-merge rehearsal. Neither rehearsal establishes
an npm trusted-publisher configuration or an exercised upload.

Before the first automated upload, an owner must create and verify the protected
GitHub environment **`npm-agents`**. Require `ThibautMelen` as the sole release
reviewer and allow exactly the custom **tag** pattern `agents-v*`, with no branch
pattern. This is separate from the engine's existing `npm` environment. The
workflow checks this real configuration through GitHub's public metadata API
before scheduling the privileged job, then checks it again as that job's first
gate. Both gates and the upload condition require the canonical repository name
and immutable repository ID `1126991539`, so a copied workflow in a fork cannot
use the canonical repository's environment as proof of its own protection.
A missing, unprotected or differently scoped environment fails closed;
declaring `environment: npm-agents` in YAML alone is insufficient because GitHub
can create an unknown environment without protection.

For the already-existing npm package, the owner registers this exact trusted
publisher:

| Field | Required value |
| --- | --- |
| Package | `@qrcode-ai-com/qrcode-barcode-scanner-mcp` |
| GitHub organization | `qrcode-ai-com` |
| Repository | `qrcode-barcode-scanner` |
| Workflow | `npm-mcp-publish.yml` |
| Environment | `npm-agents` |
| Allowed operation | `npm publish` |

New npm names still need the owner's initial archive upload before a trust
relationship can be configured. Configure new trust near an actual qualified
release: npm expires a configuration that has not published successfully within
two days. Do not mint a meaningless version or alter a public archive to validate
authentication. Keep the account passkey for administration; routine releases
use OIDC rather than a permanent publishing token. See
[npm's trusted-publisher documentation](https://docs.npmjs.com/trusted-publishers/).

On the reviewed independent tag `agents-v<adapter-version>`, the workflow:

1. Checks package, lock and Registry metadata identities, the exact engine pin
   and its schema; rejects an engine tag or a mismatched adapter tag.
2. Packs once without lifecycle scripts, checks the seven allowed files and
   their modes against source, and records the tarball and producer receipt
   digests. No scanner compilation or second decoder is involved.
3. Installs that artifact outside the checkout with an empty npm cache and no
   inherited npm configuration. Actual modern and legacy MCP clients run on
   Node22 and24. A separate check proves npm interprets the upload operand as a
   file, with the same exact Node/npm as the publisher.
4. Waits on the protected environment, rechecks its protection, downloads the
   same artifact with digest mismatches refused, then rechecks all source bytes
   and the producer receipt before uploading. The OIDC job installs nothing,
   reads no persistent registry credential and runs no package lifecycle script.
5. Compares both registry integrity and public tarball bytes. An existing equal
   version records **`EXISTING_MATCH_NO_UPLOAD`**; different bytes or a failed
   registry probe stop the job. After npm accepts an upload, only an HTTP 404
   on that version's manifest triggers another read. The job polls for up to
   seven minutes without sending another upload. If the deadline expires,
   verify the public version and its archive before rerunning the immutable
   tag. A new successful upload requires provenance metadata and records
   **`PUBLISHED_OIDC_AND_PUBLIC_BYTES`**. The receipt checks that npm serves
   the provenance metadata. Cryptographic attestation verification is separate.
6. Installs the public npm spec in fresh Node22/24 consumers and compares the
   installed adapter bytes with the qualified artifact before exercising the
   MCP protocols. A green skip-only job does not establish an OIDC exchange.

This workflow publishes only the npm MCP adapter. ClawHub skills/plugins,
Official MCP Registry admission and product-client acceptance retain their own
publication and qualification steps.

### Official MCP Registry listing

`mcp-registry-publish.yml` lists the already published npm adapter 0.2.1 as
`io.github.qrcode-ai-com/qrcode-barcode-scanner`. It runs only by manual
dispatch from canonical `main`. It checks the exact npm archive and the
`server.json` from `agents-v0.2.1`, whose commit and digests are pinned in the
helper. A matching active version is a successful read-only result. A
conflicting or inactive version stops the workflow for review.

Before dispatch, confirm that the reviewed `mcp-registry` environment admits
only the `main` branch, requires `ThibautMelen` as its sole reviewer and
disables administrator bypass. The verifier proves those settings before
the protected job can start. That job rechecks the inputs, listing and
environment, verifies the pinned upstream publisher archive, uses GitHub
OIDC, clears the short-lived publisher token file, then reads back the
public Registry record.

```bash
gh workflow run mcp-registry-publish.yml --ref main --repo qrcode-ai-com/qrcode-barcode-scanner
```

Review the protected deployment and verify the active public record in the
run summary. Future adapter versions need their own reviewed pins.

## OCI 0.11 preparation — unchanged public CLI inputs

The separate [0.11 recipe](distribution/docker/v0.11/README.md) repackages the
public `v0.11.0` Linux CLI archives without recompilation. Its input manifest pins
both binaries, the public SHA256SUMS, corresponding source and official Debian
runtime index. The unprivileged `distribution-checks` native AMD64/ARM64 matrix
prepares a minimal context, executes the exact shared truth and mixed QR/Code 128
profiles, then exports the tested image once as `qrscan-oci011-<architecture>`.
A local emulated run is recorded as such and cannot qualify the native matrix.

The image target is `ghcr.io/qrcode-ai-com/qrcode-barcode-scanner`; no Docker Hub
upload is selected. A candidate export is not a frozen publication BOM. Record
the successful native producer run, official artifact IDs and digests first;
review a new 0.11 frozen BOM and publisher contract before creating its independent
OCI tag. The engine `v0.11.0` tag and release assets remain immutable. The 0.10
recipe/BOM/publisher and historical Docker Hub consumer below stay unchanged.

The frozen [0.11 BOM](distribution/docker/v0.11/release-0.11.0.json) names native
producer run `42063666939`, checked-out packaging revision
`1c015523547226f14cc7abc1931bb074786c32dc`, official AMD64 artifact `13432955505`
and ARM64 artifact `13430944709`, their verified ZIP digests, config IDs, raw
layers and binary hashes. Its two native consumers execute 35 truth inputs,
39 profile runs and 49 CLI commands each, including the mixed regressions in
fast/frame/full. Engine source remains `176ac96ef16ee330dbfc6ada10327d0b4e23a8b2`.

The active `oci-publish.yml` now consumes that exact 0.11 BOM through
`distribution/docker/v0.11/publish.py`. Its default branch dispatch **inspect**
runs only read-only native inspectors. The publisher is still gated by the
independent exact `oci-v0.11.0` tag, `container` environment and a fresh in-job
reinspection before ephemeral `github.token` authentication. It never rebuilds
or installs the scanner and needs no permanent registry secret or new OIDC grant.
The registry index and architecture aliases must be absent or match the frozen
config and raw layers; a mismatch refuses all known writes. The publisher does
not update `latest`, Docker Hub, engine tags or CLI release assets. After actual
upload, make this named GHCR package public and dispatch **public-pull** on the
same OCI tag; both native anonymous consumers must succeed before public delivery
is claimed. Retain those receipts separately from producer and inspector results.
Producer artifacts have 14-day retention: complete this activation while those
exact artifacts are available; expiry is not authority to substitute a rebuild.

## Docker publishing — historical 0.10 distribution

The historical 0.10 publisher (`distribution/docker/publish.py`, retained for
its frozen release and Docker Hub consumer) publishes the already-tested 0.10.0 CLI images to
`ghcr.io/supernovae-st/qrcode-ai-scanner` without rebuilding them. Its separate
`oci-v0.10.0` tag does not trigger the engine's `v*` publishers or move the
immutable engine tag. The public frozen BOM in
`distribution/docker/release-0.10.0.json` records producer run `38583785567`,
head `f6b61605c8c204a0f8005fc05181683546cd0479`, actual checked-out PR merge
`3c8c7b1d796c729b597a02de75b2fc93101c355a`, official artifact IDs/digests,
archive and sidecar hashes, config IDs and all raw layers. The image contains
and labels the exact crates.io 0.10.0 source from engine revision
`2d3b577582979f0dc603b5cb0d96d1be02b459f5`. Producer and engine identities
remain distinct.

Before enabling publication, the repository owner configures the **container**
environment for **custom tag deployment rules `oci-v*` only** (no branch rule)
and a tag ruleset limiting creation/update of `oci-v*` to the same authorized
maintainers as the engine release tags. The existing `crates-io`, `npm`,
`release` and `pub` policies remain unchanged. This is a separate channel
contract; widening the old registry environments or reusing an engine tag is
not the recovery path.

The unprivileged inspector downloads the two frozen artifacts by ID and runs
on native Linux AMD64 and ARM64. It verifies archive/config/raw-layer bytes,
reloads the exact images and executes `verify.py`'s mounted input, Full/Frame,
score, empty/error exits, non-root and read-only/no-network assertions. The
publisher needs both native rows, gates the exact OCI tag/workspace/BOM,
re-inspects both downloaded archives before authentication and grants only
`contents: read`, `actions: read`, `packages: write` to its ephemeral
`github.token`. No OIDC, permanent token, rebuild, package installation or
cache enters this publisher.

GHCR accepts the job token rather than an external trusted-publisher match to
the environment. These environment/tag policies constrain the reviewed
workflow; repository writers who can author another workflow with
`packages: write` retain package authority. Treat repository/workflow write
access as part of the GHCR publication boundary.

Each architecture tag (`0.10.0-amd64`, `0.10.0-arm64`) is uploaded only if
absent. A live tag must have the qualified config and all six raw layers,
verified by downloading and hashing its compressed and decompressed blobs;
any mismatch stops the run rather than overwriting it. The `0.10.0` OCI
index has both immutable child manifest digests plus source, license and
description annotations. An existing different index also stops the run.
The publisher preflights both architecture aliases before its first upload.
An already-qualified version index is terminal success and performs no tag
writes, even when architecture aliases are absent. The publisher saves all
immutable digests in its `qrscan-oci-published` artifact; on failure the same
artifact records attempted and verified uploads separately. Uploads already
accepted by GHCR remain there. Outside writers can race registry reads and
writes, so publication is not claimed to be atomic or rollback-capable.
It does not update `latest` or Docker Hub.

A branch dispatch in the default **inspect** mode is read-only and qualifies
this publisher's consumers. The owner then creates `oci-v0.10.0` on the
reviewed publisher revision; a pushed OCI tag publishes, or a dispatch on
that exact tag with `mode=publish` retries the frozen bytes. Failed jobs can
be re-run without changing image sources or version tags.

GHCR initially creates a private package. Once the owner makes this named
package public, dispatch the same OCI tag with **mode=public-pull**. This
separate read-only native matrix uses an empty Docker credential directory,
checks the anonymous registry index/config/raw layers, pulls by immutable
index digest and repeats the owning CLI assertions on AMD64 and ARM64.
Authenticated publisher success and anonymous consumer success are separate
receipts; claim public distribution only after both pass. A public-pull
failure does not republish images. Docker Hub needs its own qualified mirror
and account/namespace access, and is not implied by GHCR success.

References: [GitHub Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
(`GITHUB_TOKEN`, initial private visibility and multi-platform annotations),
[OCI image index](https://github.com/opencontainers/image-spec/blob/main/image-index.md).

## Toolchain — one compiler, pinned

Every leg that builds, tests or publishes runs **Rust 1.99.1**:
`RUST_TOOLCHAIN` at the top of each workflow (ci · deep-checks ·
debt-mutations · crates-publish · npm-publish · python · mobile · flutter ·
cli-archives · registry-consumers-0101 · toolchain-probe).
`scripts/cli-release.py build` reads that pin from cli-archives.yml, refuses a
`RUSTUP_TOOLCHAIN` or a rustc release other than it, and assigns neither
variable.
`ci › lint` runs `scripts/check-publish-guards.py --toolchains`, which reads
the parsed YAML of every *.yml and *.yaml workflow and fails when a
RUST_TOOLCHAIN assignment, at any level (workflow, job or step env), holds
another value or anything but an exact x.y.z; when a script assigns a
toolchain (`RUST_TOOLCHAIN=…`, a `$GITHUB_ENV` write, RUSTUP_TOOLCHAIN); when
FUZZ_TOOLCHAIN is not a dated nightly-YYYY-MM-DD; when a leg names its
toolchain other than through those variables (an action's toolchain or
rust-toolchain input, flow mappings included, a rustup, `cargo +` or
--toolchain argument, a moving channel); or when a rust-toolchain(.toml)
file exists anywhere in the tree, where it would outrank `rustup default`.
The one literal is the MSRV leg, at the `rust-version` the root manifest
declares (pinned by SHA, it says so in its toolchain input).

Why 1.99.1: the deliberate 1 November 2026 update selects the stable point
release that fixes x86_64 FFI `bool` return-value miscompilation and macOS
`rust-lld` loading, among other fixes ([official release notes](https://blog.rust-lang.org/2026/10/15/Rust-1.99.1/)).
All workflow pins, the registry Rust consumer and these commands move together;
the declared MSRV remains 1.88. The earlier 1.97.0 receipts do not qualify this
compiler. Local checks and fresh three-OS CI/packed-consumer results are separate
evidence. Run the local checks before integrating the compiler update; the pin
change alone does not qualify a release.

Every compiler bump reruns the applicable gates, rescue-stress included (f32
warp sampling may move in the last ulp across compilers, and its gate is
same-machine determinism). Keep the exact compiler in the resulting receipts.

Named exceptions, each documented where it lives:
- **MSRV** — `ci › msrv` checks the 1.88 floor that every `rust-version`
  declares; jitpack.yml builds the JitPack AAR with 1.88.0, outside Actions.
- **Fuzzing** — one dated nightly (`FUZZ_TOOLCHAIN` in deep-checks.yml):
  cargo-fuzz needs nightly sanitizers.
- **cargokit** — Flutter device builds (and every consuming app's build) can
  only name the stable / beta / nightly channels; pub.dev ships sources.
- **bindings/swift/release.sh** — builds with the caller's toolchain: run it
  as `RUSTUP_TOOLCHAIN=1.99.1 bindings/swift/release.sh vX.Y.Z`.

`--locked` wherever a lockfile exists: every cargo build, test, run and
publish in the workflows, `napi build -- --locked`, `wasm-pack build --
--locked` (scripts/build-wasm.sh), `maturin build --locked`, the wheel python
› inspect builds from the sdist (`MATURIN_PEP517_ARGS=--locked`, against the
Cargo.lock the sdist ships), and cargo-mutants `--cargo-arg=--locked`. A
stale lockfile fails the leg instead of being silently re-resolved. Not
covered: cargo-fuzz (no such flag; it reads the committed fuzz/Cargo.lock),
the cargokit builds, and the Node package's pnpm install in the build and
pack jobs (no pnpm lockfile is committed, so `@napi-rs/cli` is pinned exact
and its own dependencies float: § Publishing, residuals); no publishing job
installs anything.

Pinned build tools: maturin v1.15.0 (`MATURIN_VERSION`, python.yml), also
for the wheel built from the sdist, through a build constraint
(`maturin==1.15.0` in PIP_BUILD_CONSTRAINT and, for pip older than 25.3,
PIP_CONSTRAINT; the wheel's `Generator:` line must name it). The sdist's own
build requirement is `maturin>=1.9.3,<2.0` (the first maturin that puts PEP
639 license files into source distributions); that floor itself is not
exercised in CI. wasm-pack 0.13.1 and cargo-zigbuild 0.23.4
(taiki-e/install-action, SHA-verified); binaryen version_130, checked against
the sha256 binaryen publishes with the release (and scripts/build-wasm.sh
refuses a wasm-opt older than 130); Zig 0.14.1 for the musl build and the
CLI's GNU builds (cli-archives.yml, with cargo-zigbuild), downloaded
from ziglang.org in a run step and checked against the sha256 its download
index publishes, with ZIG_GLOBAL_CACHE_DIR a fresh directory under
RUNNER_TEMP (no setup action: § Publishing); pnpm 10.34.6 through
pnpm/action-setup pinned by commit (v6.0.10); `@napi-rs/cli` 3.7.3
(package.json). The jobs whose outputs are published take every third-party
action by commit (dtolnay/rust-toolchain, Swatinem/rust-cache,
taiki-e/install-action, PyO3/maturin-action), with the release tag (for
dtolnay/rust-toolchain, the branch and the date) in a comment.
