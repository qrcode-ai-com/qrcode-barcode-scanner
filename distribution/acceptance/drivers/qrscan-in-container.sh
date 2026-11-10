#!/bin/sh
# Destination acceptance, container image: run qrscan inside the image named by QRSCAN_IMAGE as
# if it were an installed command, with the options the image's own page gives.
#
#   QRSCAN_IMAGE=registry/name@sha256:... qrscan-in-container.sh IMAGE [qrscan options]
#
# The first argument is the image file to scan. Its directory is mounted read-only at the same
# path, so the path the caller wrote stays valid inside the container.
set -eu
: "${QRSCAN_IMAGE:?set QRSCAN_IMAGE to the image reference, by digest}"
directory=$(cd "$(dirname "$1")" && pwd)
exec docker run --rm --network none --read-only --cap-drop ALL \
  --mount "type=bind,src=$directory,dst=$directory,readonly" \
  "$QRSCAN_IMAGE" "$@"
