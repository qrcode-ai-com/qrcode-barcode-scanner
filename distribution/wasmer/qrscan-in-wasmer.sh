#!/bin/sh
# Destination acceptance, Wasmer: run the qrscan command of the Wasmer package named by
# QRSCAN_WASMER_PACKAGE as if it were an installed command, the way its README runs it.
#
#   QRSCAN_WASMER_PACKAGE=<package folder or name@version> qrscan-in-wasmer.sh IMAGE [qrscan options]
#
# The first argument is the image file to scan. The guest sees only the image's directory, at
# /data, and no network; --offline resolves the package from local sources, never the registry,
# unless QRSCAN_WASMER_ONLINE=1 names a published package. Wasmer is looked up on PATH.
set -eu
: "${QRSCAN_WASMER_PACKAGE:?set QRSCAN_WASMER_PACKAGE to the package folder or name@version}"
directory=$(cd "$(dirname "$1")" && pwd)
name=$(basename "$1")
shift
if [ "${QRSCAN_WASMER_ONLINE:-0}" = 1 ]; then
  exec wasmer run --quiet --volume "$directory:/data" "$QRSCAN_WASMER_PACKAGE" -- "/data/$name" "$@"
fi
exec wasmer run --quiet --offline --volume "$directory:/data" "$QRSCAN_WASMER_PACKAGE" -- "/data/$name" "$@"
