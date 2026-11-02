#!/usr/bin/env bash
# Authoritative iOS / SwiftPM release helper. Run on a mac (needs Xcode + Swift).
#
# SwiftPM binary targets resolve a remote consumer via .binaryTarget(url:checksum:)
# — the committed dev `path:` form is git-ignored and does NOT resolve in a fresh
# clone (see mobile.yml's Guard A). The checksum must match the EXACT asset that
# the release serves. This script is the single place that produces a matching
# pair: it builds the xcframework, computes its checksum, and rewrites
# Package.swift to url+checksum for the given version — from ONE local build.
#
# It mutates only the working tree (Package.swift + build/). It does NOT push,
# tag, create a release or publish — it prints the exact draft-first commands
# for you to run (one draft per tag, published once by its owner), so the
# network steps stay in your hands.
#
# Usage:  bindings/swift/release.sh v0.4.0      (from anywhere in the repo)
set -euo pipefail

REPO_SLUG="qrcode-ai-com/qrcode-barcode-scanner"
LIB="libqrcode_ai_scanner_uniffi"
MP="crates/qrcode-ai-scanner-uniffi/Cargo.toml"
T="crates/qrcode-ai-scanner-uniffi/target"

die() {
  echo "error: $*" >&2
  exit 1
}

[ $# -eq 1 ] || die "usage: $0 vX.Y.Z"
# Normalize to a leading-v tag (mobile.yml triggers on tags: ['v*']).
VER="${1#v}"
TAG="v${VER}"
case "$VER" in
  [0-9]*.[0-9]*.[0-9]*) : ;;
  *) die "version must be X.Y.Z (got '$1')" ;;
esac

command -v xcodebuild >/dev/null || die "xcodebuild not found — run this on a mac with Xcode"
command -v swift >/dev/null || die "swift not found"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# Keep the tag honest: it should match the workspace version SSOT.
WS_VER="$(grep -m1 -E '^version' Cargo.toml | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
[ "$VER" = "$WS_VER" ] || die "tag $TAG != workspace version $WS_VER (bump Cargo.toml + the bindings first)"

echo "==> building the iOS xcframework for $TAG (device + simulator)"
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios >/dev/null
cargo build --release --locked --manifest-path "$MP" --target aarch64-apple-ios
cargo build --release --locked --manifest-path "$MP" --target aarch64-apple-ios-sim
cargo build --release --locked --manifest-path "$MP" --target x86_64-apple-ios

rm -rf bindings/swift/Sources/QrcodeAiScanner build/swift build/sim build/QrcodeAiScannerFFI.xcframework
mkdir -p bindings/swift/Sources/QrcodeAiScanner build/swift/Modules build/sim

echo "==> generating Swift sources + headers + modulemap"
cargo run --locked --manifest-path "$MP" --bin uniffi-bindgen-swift -- \
  "$T/aarch64-apple-ios/release/$LIB.a" \
  bindings/swift/Sources/QrcodeAiScanner --swift-sources
cargo run --locked --manifest-path "$MP" --bin uniffi-bindgen-swift -- \
  "$T/aarch64-apple-ios/release/$LIB.a" \
  build/swift/Modules --headers --xcframework --modulemap --modulemap-filename module.modulemap

echo "==> lipo simulator slice + assembling the xcframework"
lipo -create \
  "$T/aarch64-apple-ios-sim/release/$LIB.a" \
  "$T/x86_64-apple-ios/release/$LIB.a" \
  -output "build/sim/$LIB.a"
xcodebuild -create-xcframework \
  -library "$T/aarch64-apple-ios/release/$LIB.a" -headers build/swift/Modules \
  -library "build/sim/$LIB.a" -headers build/swift/Modules \
  -output build/QrcodeAiScannerFFI.xcframework

echo "==> zipping + computing the SwiftPM checksum"
cp LICENSE LICENSING.md build/QrcodeAiScannerFFI.xcframework/
(cd build && rm -f QrcodeAiScannerFFI.xcframework.zip \
  && zip -qry QrcodeAiScannerFFI.xcframework.zip QrcodeAiScannerFFI.xcframework)
CHECKSUM="$(swift package compute-checksum build/QrcodeAiScannerFFI.xcframework.zip)"
echo "$CHECKSUM" >build/checksum.txt
URL="https://github.com/${REPO_SLUG}/releases/download/${TAG}/QrcodeAiScannerFFI.xcframework.zip"

echo "==> pinning Package.swift to url+checksum"
PKG="bindings/swift/Package.swift"
if grep -q 'path: "build/QrcodeAiScannerFFI.xcframework"' "$PKG"; then
  # First release (or restored dev mode): convert the path line → url + checksum.
  perl -0pi -e "s{ {12}path: \"build/QrcodeAiScannerFFI\\.xcframework\"\n}{            url: \"$URL\",\n            checksum: \"$CHECKSUM\"\n}" "$PKG"
else
  # Already url-mode (subsequent release): refresh the active url + checksum.
  perl -0pi -e "s{(\n {12})url: \"https://github\\.com/[^\"]*\",}{\${1}url: \"$URL\",}" "$PKG"
  perl -0pi -e "s{(\n {12})checksum: \"[a-f0-9]{64}\"}{\${1}checksum: \"$CHECKSUM\"}" "$PKG"
fi
grep -q "$CHECKSUM" "$PKG" || die "failed to write the checksum into $PKG — inspect it by hand"
grep -q 'path: "build/' "$PKG" && die "$PKG still has a path: target — inspect it by hand"

cat <<EOF

✅ built + pinned. xcframework checksum: $CHECKSUM

Review the diff, then run these network steps yourself, in order. None of them
publishes a release: the owner creates one draft per tag, every asset is
uploaded into that draft, and the owner publishes it once (RELEASING.md §5-§7).

  # 1. Commit and push the pin. The tag will name this commit.
  git add $PKG
  git commit -m "release(swift): $TAG"
  git push origin HEAD
  SHA="\$(git rev-parse 'HEAD^{commit}')"

  # 2. The draft. When the tag and the release are both absent (the two
  #    checks print nothing), write the release notes (Python >= 3.11) and
  #    create the draft with them: this version's dated CHANGELOG section,
  #    then the statement on the prebuilt qrscan archives. Otherwise the
  #    view must print a draft (true) targeting \$SHA.
  git ls-remote --tags origin 'refs/tags/$TAG*'
  gh release list --limit 1000 --json tagName,isDraft --jq '.[] | select(.tagName == "$TAG")'
  python3 scripts/cli-release.py notes --version $VER > notes.md &&
    gh release create $TAG --draft --target "\$SHA" --title $TAG --notes-file notes.md
  gh release view $TAG --json isDraft,targetCommitish

  # 3. Attach this build to the draft, then read it back (sha256 $CHECKSUM).
  gh release upload $TAG build/QrcodeAiScannerFFI.xcframework.zip build/checksum.txt
  gh release download $TAG -p QrcodeAiScannerFFI.xcframework.zip -O - | shasum -a 256

  # 4. Tag \$SHA (annotated, RELEASING.md §5), push the tag, and check that
  #    the tag names \$SHA.
  git tag -a $TAG "\$SHA"
  git push origin $TAG
  git ls-remote origin 'refs/tags/$TAG' 'refs/tags/$TAG^{}'

  # 5. Publish once, when every upload into the draft has been read back and
  #    no run of \$SHA is in progress (RELEASING.md §7).
  gh run list --commit "\$SHA" --json name,status,conclusion
  gh release edit $TAG --draft=false --verify-tag

When mobile.yml runs on the tag, ios-release finds this zip attached, leaves it
untouched and checks it against the pin; it never creates or publishes a release.
After publication, consumers use:

  .package(url: "https://github.com/${REPO_SLUG}.git", from: "${VER}")
EOF
