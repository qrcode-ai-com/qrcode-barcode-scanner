#!/usr/bin/env bash
# Wrap the verified 0.11.0 CLI in a Debian binary package.
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 amd64|arm64 INPUT_DIRECTORY OUTPUT_DIRECTORY" >&2
  exit 2
fi

architecture=$1
case "$architecture" in
  amd64)
    target=x86_64-unknown-linux-gnu
    binary_sha256=77965589784699138d2b512f94067528eba552536160560daed191de824ea01c
    ;;
  arm64)
    target=aarch64-unknown-linux-gnu
    binary_sha256=d010a03064011f8775fc6f0add357cbbc634366d4b96dc0b892ab2c6047b271a
    ;;
  *)
    echo "Unsupported Debian architecture: $architecture" >&2
    exit 2
    ;;
esac

package=qrcode-barcode-scanner
version=0.11.0
archive_stem="$package-cli-$version-$target"
source_archive="$package-cli-$version-source.tar.gz"
checksums="$package-cli-$version-SHA256SUMS"
checksums_sha256=1b3263cf6c29af99fbcf9cc3f82e32febc7e598638292685fcd57c0656cc911e
input_dir=$(cd -- "$2" && pwd)
output_dir=$(cd -- "$3" && pwd)
filename="${package}_${version}-1_${architecture}.deb"

(
  cd -- "$input_dir"
  printf '%s  %s\n' "$checksums_sha256" "$checksums" | sha256sum --strict --check
  for name in "$archive_stem.tar.gz" "$source_archive"; do
    awk -v file="$name" '$2 == file { print }' "$checksums" | sha256sum --strict --check
  done
)

stage=$(mktemp -d "$output_dir/.deb-stage.XXXXXX")
trap 'find "$stage" -depth -delete' EXIT
root="$stage/package"
docdir="$root/usr/share/doc/$package"
install -d "$root/DEBIAN" "$root/usr/bin" "$docdir"
archive="$input_dir/$archive_stem.tar.gz"
tar -xOzf "$archive" "$archive_stem/qrscan" >"$root/usr/bin/qrscan"
chmod 0755 "$root/usr/bin/qrscan"
printf '%s  %s\n' "$binary_sha256" "$root/usr/bin/qrscan" | sha256sum --strict --check

for file in COPYRIGHT-rust-std.html LICENSE LICENSE-APACHE-2.0 LICENSING.md README.md SOURCE.md THIRD-PARTY-LICENSES.txt THIRD-PARTY.md build-info.json; do
  tar -xOzf "$archive" "$archive_stem/$file" >"$docdir/$file"
done

cat >"$docdir/copyright" <<'COPYRIGHT'
QR Code & Barcode Scanner is distributed under AGPL-3.0-or-later, with
alternative commercial licensing. See LICENSE and LICENSING.md in this
directory for the license text and details.

THIRD-PARTY.md, THIRD-PARTY-LICENSES.txt, LICENSE-APACHE-2.0 and
COPYRIGHT-rust-std.html retain upstream third-party notices and licenses.

Corresponding source for the executable and its build inputs is identified
in SOURCE.md and build-info.json. The release source archive is available at:
https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-source.tar.gz
COPYRIGHT

gzip -n -9 >"$docdir/changelog.Debian.gz" <<'CHANGELOG'
qrcode-barcode-scanner (0.11.0-1) stable; urgency=medium

  * Package the official QR Code & Barcode Scanner 0.11.0 Linux CLI.

 -- QR Code AI <contact@qrcode-ai.com>  Mon, 09 Nov 2026 12:03:21 +0000
CHANGELOG

installed_size=$(find "$root/usr" -type f -printf '%s\n' \
  | awk '{ size += int(($1 + 1023) / 1024) } END { print size }')
cat >"$root/DEBIAN/control" <<CONTROL
Package: $package
Version: $version-1
Section: utils
Priority: optional
Architecture: $architecture
Maintainer: QR Code AI <contact@qrcode-ai.com>
Depends: libc6 (>= 2.28)
Installed-Size: $installed_size
Homepage: https://qrcode-ai.com/
Description: offline QR code and barcode scanner
 qrscan decodes QR codes and barcodes from images and reports results as JSON.
 It also provides scannability diagnostics for QR codes.
 .
 Web tools: https://qrcode-ai.com/en-US/qr-code-scanner
 and https://qrcode-ai.com/en-US/barcode-scanner
CONTROL

# Use the packaging changelog timestamp and retain root-owned payload files.
export SOURCE_DATE_EPOCH=1794225801
export TZ=UTC LC_ALL=C
find "$root" -type d -exec chmod 0755 {} +
find "$root" -type f ! -path "$root/usr/bin/qrscan" -exec chmod 0644 {} +
find "$root" -exec touch -d "@$SOURCE_DATE_EPOCH" {} +
dpkg-deb --root-owner-group -Zxz -z9 --build "$root" "$stage/$filename"
ln -T -- "$stage/$filename" "$output_dir/$filename"
