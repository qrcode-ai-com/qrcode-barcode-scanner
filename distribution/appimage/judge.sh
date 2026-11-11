#!/usr/bin/env bash
# Judge one AppImage of the scanner as its users meet it: run on this machine as a file that was
# just downloaded, then on three clean hosts with no network. Every check writes a receipt of
# the destination acceptance contract.
#
#   judge.sh APPIMAGE VERSION DESTINATION URL RECEIPT_DIRECTORY [RUN_URL]
#
# APPIMAGE     the file to judge; it is not modified and not removed
# VERSION      the scanner version the file states, X.Y.Z
# DESTINATION  the name the receipts give to the destination
# URL          the public address the file came from, or the run that built it
#
# It needs Python 3 and Docker, and runs from any directory. The receipts are named after the
# host and the architecture of this machine. A note says whether this machine could mount the
# file through FUSE; that route is reported, not required.
set -euo pipefail

if [[ $# -lt 5 || $# -gt 6 ]]; then
  echo "Usage: $0 APPIMAGE VERSION DESTINATION URL RECEIPT_DIRECTORY [RUN_URL]" >&2
  exit 2
fi

appimage=$(cd -- "$(dirname -- "$1")" && pwd)/$(basename -- "$1")
version=$2
destination=$3
url=$4
mkdir -p "$5"
receipts=$(cd -- "$5" && pwd)
run_url=${6:-}
engine=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
driver="$engine/scripts/destination-acceptance.py"
architecture=$(uname -m)
name=$(basename -- "$appimage")
run_option=()
if [[ -n "$run_url" ]]; then
  run_option=(--run-url "$run_url")
fi

# As a user who just downloaded the file: a copy, made executable, in a new directory.
box=$(mktemp -d)
trap 'find "$box" -depth -delete' EXIT
downloaded="$box/$name"
cp -- "$appimage" "$downloaded"
chmod +x "$downloaded"

# Without FUSE the file unpacks itself and runs. This route works on every host.
test "$(APPIMAGE_EXTRACT_AND_RUN=1 "$downloaded" --version)" = "qrscan $version"
APPIMAGE_EXTRACT_AND_RUN=1 "$downloaded" --help >/dev/null

# With FUSE, when this machine offers it, the file mounts itself.
if mounted=$("$downloaded" --version 2>"$box/fuse.log") && test "$mounted" = "qrscan $version"; then
  echo "fuse=ran" | tee "$receipts/fuse-$architecture.txt"
else
  echo "fuse=not available on this machine" | tee "$receipts/fuse-$architecture.txt"
  head -n 5 "$box/fuse.log" || true
fi

APPIMAGE_EXTRACT_AND_RUN=1 python3 "$driver" cli --qrscan "$downloaded" \
  --destination "$destination" --identifier "$name" --version "$version" --url "$url" \
  ${run_option[@]+"${run_option[@]}"} --install "chmod +x $name" --receipt "$receipts/runner-$architecture.json"
rm -- "$downloaded"
python3 "$driver" removed --qrscan "$downloaded" --uninstall "rm $name" \
  --receipt "$receipts/runner-$architecture.json"
python3 "$driver" check "$receipts/runner-$architecture.json"

# The oldest C library the executable supports (2.28), a long-term desktop and a recent one.
export QRSCAN_APPIMAGE="$appimage"
for host in almalinux:8 ubuntu:22.04 fedora:latest; do
  docker pull --quiet "$host"
  QRSCAN_HOST_IMAGE=$(docker image inspect --format '{{index .RepoDigests 0}}' "$host")
  export QRSCAN_HOST_IMAGE
  label=$(printf '%s' "$host" | tr ':.' '--')
  echo "== $host as $QRSCAN_HOST_IMAGE"
  docker run --rm --network none "$QRSCAN_HOST_IMAGE" sh -c 'ldd --version | head -n 1'
  python3 "$driver" cli --qrscan "$engine/distribution/acceptance/drivers/appimage-in-container.sh" \
    --destination "$destination" --identifier "$name" --version "$version" --url "$url" \
    ${run_option[@]+"${run_option[@]}"} \
    --install "docker run --network none $QRSCAN_HOST_IMAGE, the file mounted read-only" \
    --receipt "$receipts/$label-$architecture.json"
  python3 "$driver" removed --not-applicable --receipt "$receipts/$label-$architecture.json"
  python3 "$driver" check "$receipts/$label-$architecture.json"
done
