#!/usr/bin/env bash
# Build the browser wasm package: wasm-pack (no bundled wasm-opt — its cached
# binaryen is too old for Rust ≥1.87 wasm features) + manual wasm-opt + size
# report. Run from the repo root. Requires: wasm-pack, binaryen (wasm-opt),
# python3 (build-info), Node >= 22.21 or >= 24.5 (destination-node.test.mjs
# starts a child with --use-env-proxy), and openssl for the TLS cases of
# destination-node.test.mjs (skipped without it, except under CI=true).
set -euo pipefail

if ! command -v wasm-opt >/dev/null; then
  echo "error: wasm-opt not on PATH — install binaryen (brew install binaryen)" >&2
  echo "hint: a local extract works too: PATH=/private/tmp/binaryen-version_130/bin:\$PATH" >&2
  exit 1
fi
# The version gates, not just the presence: a binaryen older than 130 cannot
# read the wasm features Rust >= 1.87 emits by default.
opt_version=$(wasm-opt --version | sed -nE 's/.*version ([0-9]+).*/\1/p')
if [ -z "$opt_version" ] || [ "$opt_version" -lt 130 ]; then
  echo "error: wasm-opt ${opt_version:-of unknown version} is too old — binaryen >= 130 required" >&2
  exit 1
fi
# The package tests below need a Node that accepts --use-env-proxy (22.21 and
# 24.5 added it): refuse a missing or older one now, not after the build.
if ! command -v node >/dev/null; then
  echo "error: node not on PATH — Node >= 22.21 or >= 24.5 required" >&2
  exit 1
fi
if ! node --use-env-proxy -e 0 >/dev/null 2>&1; then
  echo "error: node $(node --version) lacks --use-env-proxy — Node >= 22.21 or >= 24.5 required" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/crates/qrcode-ai-scanner-wasm"
echo "toolchain: $(rustc --version) · $(wasm-pack --version) · wasm-opt version ${opt_version}"

# ONE portable module. The supported browser floor includes engines without
# SIMD, and no JavaScript branch can make a SIMD instruction validate in such
# an engine: SIMD stays off for this crate and every dependency, whatever an
# ambient RUSTFLAGS or an optimizer's all-features setting would add.
# wasm-pack skips its old bundled optimizer; validation happens after Binaryen.
# The literal RUSTFLAGS and wasm-opt lines below are the recipe: the bench
# (xtask/src/bench/manifest.rs `script_recipe`) reads them from this text, and
# build-info.json records the same strings (keep the `write` call identical).
started=$(date +%s)
inputs=$(python3 "$root/scripts/wasm_provenance.py" digest)
rm -rf pkg
RUSTFLAGS="-C target-feature=-simd128,-relaxed-simd" wasm-pack build \
  --target web --release --out-name qrcode-ai-scanner -- --locked
wasm-opt pkg/qrcode-ai-scanner_bg.wasm \
  -O3 --mvp-features --enable-mutable-globals --enable-nontrapping-float-to-int \
  --enable-bulk-memory --enable-sign-ext --enable-reference-types --enable-multivalue --disable-simd \
  -o pkg/qrcode-ai-scanner_bg.wasm.opt
mv pkg/qrcode-ai-scanner_bg.wasm.opt pkg/qrcode-ai-scanner_bg.wasm
# This validation rejects any instruction or type outside the floor (SIMD
# included), even if a dependency or the optimizer emitted one. build-info then
# reads the module's own code for the features it actually needs, and the
# browser acceptance disables SIMD in the real runtime rather than mocking it.
wasm-opt pkg/qrcode-ai-scanner_bg.wasm \
  --mvp-features --enable-mutable-globals --enable-nontrapping-float-to-int \
  --enable-bulk-memory --enable-sign-ext --enable-reference-types --enable-multivalue --disable-simd \
  -o /dev/null

node "$root/scripts/patch-wasm-pkg.mjs"
(cd "$root" && node scripts/sync-report-types.mjs)
# Written once, from these freshly built and validated bytes, and only if the
# compiled inputs did not change while they were being built.
python3 "$root/scripts/wasm_provenance.py" write pkg \
  --rustflags "-C target-feature=-simd128,-relaxed-simd" \
  --wasm-opt-flags "-O3 --mvp-features --enable-mutable-globals --enable-nontrapping-float-to-int --enable-bulk-memory --enable-sign-ext --enable-reference-types --enable-multivalue --disable-simd" \
  --inputs "$inputs" --built-after "$started"

node test.mjs
node camera.test.mjs
node camera-replay.test.mjs
# The overlay's pure helpers and import contract (no browser needed).
node camera-overlay.unit.test.mjs
# The destination suites use fake transports and loopback fixtures only: no
# request leaves this machine.
node destination.test.mjs
node destination-node.test.mjs
# camera-overlay.test.mjs (the rendered overlay) and destination.browser.test.mjs
# need a real browser: scripts/packed-wasm-browser.mjs runs both against the
# packed archive (the wasm-browser CI job).

raw=$(wc -c <pkg/qrcode-ai-scanner_bg.wasm)
gz=$(gzip -9 -c pkg/qrcode-ai-scanner_bg.wasm | wc -c)
echo "wasm size: raw ${raw} bytes · gzip ${gz} bytes"
