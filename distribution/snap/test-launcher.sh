#!/bin/sh
# Tests the snap launcher without a snap: a stand-in qrscan answers with a chosen exit status,
# and the launcher must keep that status and that output, and add its hint only when qrscan
# exits 2 on an image that cannot be read.
#
#   sh distribution/snap/test-launcher.sh
set -eu
here=$(cd "$(dirname "$0")" && pwd)
launcher=$here/launcher/qrscan-launcher
box=$(mktemp -d)
trap 'rm -rf "$box"' EXIT
mkdir -p "$box/snap/bin"
cat >"$box/snap/bin/qrscan" <<'STUB'
#!/bin/sh
echo "stub stdout $*"
exit "${STUB_STATUS:-0}"
STUB
chmod +x "$box/snap/bin/qrscan"
: >"$box/readable.png"
failures=0

check() {
  name=$1 want_status=$2 want_hint=$3
  shift 3
  set +e
  SNAP="$box/snap" sh "$launcher" "$@" >"$box/out" 2>"$box/err"
  got=$?
  set -e
  hint=no
  grep -q 'cannot be read from inside the snap' "$box/err" && hint=yes
  if [ "$got" != "$want_status" ] || [ "$hint" != "$want_hint" ] ||
    ! grep -qx "stub stdout $*" "$box/out"; then
    echo "FAIL $name: status $got (want $want_status), hint $hint (want $want_hint)" >&2
    failures=$((failures + 1))
  else
    echo "ok   $name"
  fi
}

STUB_STATUS=0 check "a detection keeps status 0 and no hint" 0 no "$box/readable.png"
STUB_STATUS=1 check "an empty scan keeps status 1 and no hint" 1 no "$box/readable.png"
STUB_STATUS=2 check "an unreadable image gets the hint" 2 yes /tmp/elsewhere/label.png
STUB_STATUS=2 check "a readable image that fails gets no hint" 2 no "$box/readable.png"
STUB_STATUS=2 check "an option value is not taken for the image" 2 yes --profile fast /nope.png
STUB_STATUS=2 check "a usage error without an image gets no hint" 2 no --budget-ms
STUB_STATUS=0 check "capabilities pass through" 0 no --capabilities

[ "$failures" -eq 0 ] || exit 1
echo "launcher: 7 cases passed"
