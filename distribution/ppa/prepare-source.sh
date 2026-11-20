#!/bin/sh
# Prepares the Launchpad source upload of qrscan 0.11.0 for one Ubuntu series, on an Ubuntu host
# with network access, cargo and devscripts. It downloads the release source archive, checks its
# SHA-256, vendors the crates of its Cargo.lock into the orig-vendor component, writes the
# changelog entry of the series and builds an unsigned source package. Nothing is uploaded and
# nothing is signed: the owner runs debsign and dput (README.md).
#
#   sh distribution/ppa/prepare-source.sh noble|resolute OUT_DIR
set -eu
series=${1:-}
out=${2:-}
case "$series" in
  noble) release=24.04 ;;
  resolute) release=26.04 ;;
  *)
    echo "usage: prepare-source.sh noble|resolute OUT_DIR" >&2
    exit 2
    ;;
esac
[ -n "$out" ] || {
  echo "usage: prepare-source.sh noble|resolute OUT_DIR" >&2
  exit 2
}

here=$(cd "$(dirname "$0")" && pwd)
version=0.11.0
revision="1~ppa1~ubuntu$release.1"
archive="qrcode-barcode-scanner-cli-$version-source"
url="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v$version/$archive.tar.gz"
sha256=8e5e09f0ec8d93ae49ca35615c05bb1d326448b6de9757cef86ef48d7bf3a96d

mkdir -p "$out"
cd "$out"
if [ -e "qrcode-barcode-scanner-$version" ]; then
  echo "prepare-source: $out/qrcode-barcode-scanner-$version already exists" >&2
  exit 1
fi
[ -f "$archive.tar.gz" ] || curl --fail --silent --show-error --location --proto '=https' \
  --output "$archive.tar.gz" "$url"
echo "$sha256  $archive.tar.gz" | sha256sum --check --strict -
cp "$archive.tar.gz" "qrcode-barcode-scanner_$version.orig.tar.gz"

tar -xzf "$archive.tar.gz"
mv "$archive" "qrcode-barcode-scanner-$version"
cd "qrcode-barcode-scanner-$version"
# The crates of the tagged Cargo.lock, unchanged; the build runs with --frozen --offline.
cargo vendor --locked --versioned-dirs vendor >/dev/null
tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=@1793815385 \
  -cJf "../qrcode-barcode-scanner_$version.orig-vendor.tar.xz" vendor
cp -R "$here/debian" debian
if [ "$series" != noble ]; then
  sed -i "1s/.*/qrcode-barcode-scanner ($version-$revision) $series; urgency=medium/" debian/changelog
fi
dpkg-parsechangelog --show-field Version
debuild -S -sa -us -uc -d
echo "prepared: $out/qrcode-barcode-scanner_${version}-${revision}_source.changes"
