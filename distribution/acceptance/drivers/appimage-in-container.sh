#!/bin/sh
# Destination acceptance, AppImage on a clean host: run the AppImage named by QRSCAN_APPIMAGE
# inside the image named by QRSCAN_HOST_IMAGE, as if a user had just downloaded the file there.
#
#   QRSCAN_APPIMAGE=/path/file.AppImage QRSCAN_HOST_IMAGE=ubuntu@sha256:... \
#     appimage-in-container.sh IMAGE [qrscan options]
#
# The first argument is the image file to scan. Its directory is mounted read-only at the same
# path, so the path the caller wrote stays valid inside the container. The container has no
# network, no capability and a read-only root. A container offers no FUSE device, so the AppImage
# unpacks itself into a temporary directory and runs from there (APPIMAGE_EXTRACT_AND_RUN): this
# is the route a user takes on a host without FUSE.
set -eu
: "${QRSCAN_APPIMAGE:?set QRSCAN_APPIMAGE to the path of the AppImage}"
: "${QRSCAN_HOST_IMAGE:?set QRSCAN_HOST_IMAGE to the image of the host, by digest}"
appimage=$(cd "$(dirname "$QRSCAN_APPIMAGE")" && pwd)/$(basename "$QRSCAN_APPIMAGE")
directory=$(cd "$(dirname "$1")" && pwd)
exec docker run --rm --network none --read-only --cap-drop ALL \
  --tmpfs /tmp:exec,mode=1777 \
  --env APPIMAGE_EXTRACT_AND_RUN=1 \
  --mount "type=bind,src=$appimage,dst=/opt/qrcode-barcode-scanner.AppImage,readonly" \
  --mount "type=bind,src=$directory,dst=$directory,readonly" \
  "$QRSCAN_HOST_IMAGE" /opt/qrcode-barcode-scanner.AppImage "$@"
