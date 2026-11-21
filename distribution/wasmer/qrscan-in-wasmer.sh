#!/bin/sh
# Run the Wasmer package of qrscan like an installed qrscan:
#
#   QRSCAN_WASMER_PACKAGE=<package folder or name@version> qrscan-in-wasmer.sh IMAGE [qrscan options]
#
# The module sees only the directories Wasmer maps into it, so the directory of IMAGE is mapped
# at /data and the module reads /data/<file name>. The other arguments go to qrscan unchanged.
# A local folder runs with --offline; set QRSCAN_WASMER_ONLINE=1 to run a name@version from the
# registry.
#
# Wasmer presents the standard streams to the module as a terminal, so qrscan would colour its
# messages even into a pipe or a file. The colour is decided here as qrscan decides it on the
# host: NO_COLOR, then CLICOLOR_FORCE, then colour only when stdout and stderr are terminals.
set -eu
: "${QRSCAN_WASMER_PACKAGE:?set QRSCAN_WASMER_PACKAGE to the package folder or name@version}"
directory=$(cd "$(dirname "$1")" && pwd)
name=$(basename "$1")
shift
if [ -n "${NO_COLOR+set}" ]; then
  colour=NO_COLOR=1
elif [ -n "${CLICOLOR_FORCE+set}" ]; then
  colour=CLICOLOR_FORCE=1
elif [ -t 1 ] && [ -t 2 ]; then
  colour=CLICOLOR_FORCE=1
else
  colour=NO_COLOR=1
fi
offline=--offline
if [ "${QRSCAN_WASMER_ONLINE:-0}" = 1 ]; then
  offline=
fi
# $offline is empty or one word: unquoted on purpose.
# shellcheck disable=SC2086
exec wasmer run --quiet $offline --env "$colour" --volume "$directory:/data" \
  "$QRSCAN_WASMER_PACKAGE" -- "/data/$name" "$@"
