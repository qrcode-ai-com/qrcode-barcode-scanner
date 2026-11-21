#!/bin/bash
# Install the QR Code & Barcode Scanner HTTP service on Ubuntu 24.04, as the 1-Click Droplet image
# holds it. Packer runs it on the build Droplet (template.pkr.hcl); the engine's workflow runs it
# on a fresh Ubuntu 24.04 runner and judges the result.
#
#   install.sh SERVICE_DIR
#
# SERVICE_DIR is the tree scripts/stage-http-satellite.py writes (server.mjs, package.json,
# package-lock.json, SOURCE.json, the notices). The script installs:
#   - Node.js 22.22.2 from nodejs.org, checked against its sha256, in /opt/qrscan-http/node;
#   - the service in /opt/qrscan-http/app with `npm ci --omit=dev --ignore-scripts`: the engine
#     0.11.0 and its native package, each checked against the lockfile's sha512;
#   - the systemd unit qrscan-http (a dynamic unprivileged user that may bind port 80 only, on a
#     read-only system), started and enabled;
#   - ufw allowing SSH and port 80 only, and the login message 99-qrcode-barcode-scanner.
# It ends once GET /healthz answers on port 80.
set -euo pipefail

NODE_VERSION=22.22.2
NODE_SHA256=88fd1ce767091fd8d4a99fdb2356e98c819f93f3b1f8663853a2dee9b438068a
ENGINE=0.11.0
PREFIX=/opt/qrscan-http
HERE=$(cd "$(dirname "$0")" && pwd)

fail() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }

[ "$#" -eq 1 ] || fail "usage: install.sh SERVICE_DIR"
SOURCE=$(cd "$1" && pwd)
[ "$(id -u)" -eq 0 ] || fail "run it as root"
# shellcheck source=/dev/null
. /etc/os-release
[ "${ID:-}" = ubuntu ] && [ "${VERSION_ID:-}" = 24.04 ] || fail "this image is built on Ubuntu 24.04, not ${PRETTY_NAME:-unknown}"
[ "$(uname -m)" = x86_64 ] || fail "Droplets are x86_64; this is $(uname -m)"
for file in server.mjs package.json package-lock.json SOURCE.json LICENSE LICENSE-NOTES.md; do
  [ -f "$SOURCE/$file" ] || fail "$SOURCE has no $file: stage it with scripts/stage-http-satellite.py"
done
[ ! -e "$PREFIX" ] || fail "$PREFIX exists already"

export DEBIAN_FRONTEND=noninteractive
apt-get -qq update
apt-get -qq install -y --no-install-recommends ca-certificates curl ufw xz-utils >/dev/null

scratch=$(mktemp -d)
trap 'rm -r -- "$scratch"' EXIT
tarball="node-v$NODE_VERSION-linux-x64.tar.xz"
curl --fail --silent --show-error --location --proto '=https' --retry 3 \
  --output "$scratch/$tarball" "https://nodejs.org/dist/v$NODE_VERSION/$tarball"
echo "$NODE_SHA256  $scratch/$tarball" | sha256sum --check --strict --quiet -

install -d -m 755 "$PREFIX" "$PREFIX/node" "$PREFIX/app"
tar -xJf "$scratch/$tarball" -C "$PREFIX/node" --strip-components 1 --no-same-owner
cp -R "$SOURCE/server.mjs" "$SOURCE/package.json" "$SOURCE/package-lock.json" "$SOURCE/SOURCE.json" \
  "$SOURCE/LICENSE" "$SOURCE/LICENSE-NOTES.md" "$PREFIX/app/"
if [ -d "$SOURCE/licenses" ]; then cp -R "$SOURCE/licenses" "$PREFIX/app/"; fi
(
  cd "$PREFIX/app"
  HOME="$scratch" PATH="$PREFIX/node/bin:$PATH" npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    --cache "$scratch/npm-cache" >/dev/null
  version=$("$PREFIX/node/bin/node" -p 'require("@qrcode-ai-com/qrcode-barcode-scanner/package.json").version')
  [ "$version" = "$ENGINE" ] || fail "npm installed engine $version, want $ENGINE"
)
chown -R root:root "$PREFIX"
chmod -R go-w "$PREFIX"

install -m 644 "$HERE/qrscan-http.service" /etc/systemd/system/qrscan-http.service
install -m 755 "$HERE/99-qrcode-barcode-scanner" /etc/update-motd.d/99-qrcode-barcode-scanner
systemctl daemon-reload
systemctl enable --now qrscan-http.service

ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw --force enable >/dev/null

for _ in $(seq 60); do
  if curl --fail --silent --max-time 2 http://127.0.0.1/healthz >/dev/null; then
    printf 'install.sh: qrscan-http answers on port 80 (engine %s, Node.js %s)\n' "$ENGINE" "$NODE_VERSION"
    exit 0
  fi
  sleep 1
done
journalctl -u qrscan-http --no-pager | tail -n 40 >&2
fail "qrscan-http did not answer /healthz within 60 seconds"
