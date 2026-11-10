#!/usr/bin/env bash
# Wrap the verified 0.11.0 CLI in an AppImage: one file that runs on a GNU/Linux desktop or
# server with no installation. The executable inside stays byte-identical to the published
# qrscan; nothing is compiled here.
#
#   build.sh x86_64|aarch64 INPUT_DIRECTORY OUTPUT_DIRECTORY
#
# INPUT_DIRECTORY holds four files, each checked against a SHA-256 pinned below:
#   qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS         from the engine release v0.11.0
#   qrcode-barcode-scanner-cli-0.11.0-<target>.tar.gz    from the same release
#   appimagetool-<machine>.AppImage                      appimagetool 1.9.1, for this machine
#   runtime-<architecture>                               type2-runtime 20251108, for the AppImage
#
# It writes OUTPUT_DIRECTORY/qrcode-barcode-scanner-0.11.0-<architecture>.AppImage.
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 x86_64|aarch64 INPUT_DIRECTORY OUTPUT_DIRECTORY" >&2
  exit 2
fi

architecture=$1
case "$architecture" in
  x86_64)
    target=x86_64-unknown-linux-gnu
    binary_sha256=77965589784699138d2b512f94067528eba552536160560daed191de824ea01c
    runtime_sha256=2fca8b443c92510f1483a883f60061ad09b46b978b2631c807cd873a47ec260d
    ;;
  aarch64)
    target=aarch64-unknown-linux-gnu
    binary_sha256=d010a03064011f8775fc6f0add357cbbc634366d4b96dc0b892ab2c6047b271a
    runtime_sha256=00cbdfcf917cc6c0ff6d3347d59e0ca1f7f45a6df1a428a0d6d8a78664d87444
    ;;
  *)
    echo "Unsupported AppImage architecture: $architecture" >&2
    exit 2
    ;;
esac

# appimagetool runs on the machine that builds, whatever architecture it packs.
machine=$(uname -m)
case "$machine" in
  x86_64) tool_sha256=ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0 ;;
  aarch64) tool_sha256=f0837e7448a0c1e4e650a93bb3e85802546e60654ef287576f46c71c126a9158 ;;
  *)
    echo "No pinned appimagetool for this machine: $machine" >&2
    exit 2
    ;;
esac

package=qrcode-barcode-scanner
version=0.11.0
# The commit time of the tag v0.11.0, as build-info.json of the archives records it.
source_date_epoch=1793815385
archive_stem="$package-cli-$version-$target"
checksums="$package-cli-$version-SHA256SUMS"
checksums_sha256=1b3263cf6c29af99fbcf9cc3f82e32febc7e598638292685fcd57c0656cc911e
recipe_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
input_dir=$(cd -- "$2" && pwd)
output_dir=$(cd -- "$3" && pwd)
tool="appimagetool-$machine.AppImage"
runtime="runtime-$architecture"
filename="$package-$version-$architecture.AppImage"

(
  cd -- "$input_dir"
  printf '%s  %s\n' "$checksums_sha256" "$checksums" | sha256sum --strict --check
  awk -v file="$archive_stem.tar.gz" '$2 == file { print }' "$checksums" | sha256sum --strict --check
  printf '%s  %s\n' "$tool_sha256" "$tool" | sha256sum --strict --check
  printf '%s  %s\n' "$runtime_sha256" "$runtime" | sha256sum --strict --check
)

stage=$(mktemp -d "$output_dir/.appimage-stage.XXXXXX")
trap 'find "$stage" -depth -delete' EXIT
appdir="$stage/AppDir"
docdir="$appdir/usr/share/doc/$package"
install -d "$appdir/usr/bin" "$docdir" "$appdir/usr/share/applications" \
  "$appdir/usr/share/metainfo" "$appdir/usr/share/icons/hicolor/256x256/apps"

archive="$input_dir/$archive_stem.tar.gz"
tar -xOzf "$archive" "$archive_stem/qrscan" >"$appdir/usr/bin/qrscan"
chmod 0755 "$appdir/usr/bin/qrscan"
printf '%s  %s\n' "$binary_sha256" "$appdir/usr/bin/qrscan" | sha256sum --strict --check

# The licences, the notices and the pointer to the corresponding source travel with the
# executable, as in the archive it comes from.
for file in COPYRIGHT-rust-std.html LICENSE LICENSE-APACHE-2.0 LICENSING.md README.md SOURCE.md THIRD-PARTY-LICENSES.txt THIRD-PARTY.md build-info.json; do
  tar -xOzf "$archive" "$archive_stem/$file" >"$docdir/$file"
  chmod 0644 "$docdir/$file"
done

install -m 0644 "$recipe_dir/$package.desktop" "$appdir/$package.desktop"
install -m 0644 "$recipe_dir/$package.desktop" "$appdir/usr/share/applications/$package.desktop"
install -m 0644 "$recipe_dir/$package.appdata.xml" "$appdir/usr/share/metainfo/$package.appdata.xml"
install -m 0644 "$recipe_dir/$package.png" "$appdir/$package.png"
install -m 0644 "$recipe_dir/$package.png" "$appdir/usr/share/icons/hicolor/256x256/apps/$package.png"
ln -s "$package.png" "$appdir/.DirIcon"
# The runtime starts AppRun: it is the scanner itself, so the file behaves like qrscan.
ln -s usr/bin/qrscan "$appdir/AppRun"

# One fixed time on every entry, so the same inputs give the same file tree.
find "$appdir" -depth -exec touch --no-dereference --date="@$source_date_epoch" {} +

chmod 0755 "$input_dir/$tool"
# appimagetool is an AppImage itself: unpack and run it, so the build needs no FUSE.
ARCH=$architecture SOURCE_DATE_EPOCH=$source_date_epoch APPIMAGE_EXTRACT_AND_RUN=1 \
  "$input_dir/$tool" --no-appstream --runtime-file "$input_dir/$runtime" \
  "$appdir" "$stage/$filename"
chmod 0755 "$stage/$filename"
mv -f "$stage/$filename" "$output_dir/$filename"
(cd -- "$output_dir" && sha256sum "$filename")
