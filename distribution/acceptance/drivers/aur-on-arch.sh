#!/bin/sh
# Destination acceptance, Arch User Repository: inside a new Arch Linux container, take the
# public AUR recipe as a user of the AUR does, build and install the package, judge the installed
# qrscan with the acceptance contract, then uninstall it.
#
#   mkdir receipt
#   docker run --rm \
#     --mount "type=bind,src=$PWD,dst=/engine,readonly" \
#     --mount "type=bind,src=$PWD/receipt,dst=/receipt" \
#     archlinux:latest sh /engine/distribution/acceptance/drivers/aur-on-arch.sh /receipt [RUN_URL]
#
# It runs as root in the container. makepkg refuses to run as root, so the package is built by
# an ordinary user and installed with pacman -U: the two halves of `makepkg -si`. The recipe is
# cloned signed out, and must equal the copy this repository records in distribution/aur/.
set -eu
out=$1
run_url=${2:-}
package=qrcode-barcode-scanner-bin
version=0.11.0
engine=/engine
home=/home/builder

pacman -Syu --noconfirm --needed base-devel git python >/dev/null
useradd --create-home builder
# The checkout belongs to another user: let git read its commit for the receipt.
git config --global --add safe.directory "$engine"

attempt=1
until su builder -c "git clone --quiet https://aur.archlinux.org/$package.git $home/$package"; do
  [ "$attempt" -lt 3 ] || { echo "aur-on-arch: the AUR did not answer" >&2; exit 1; }
  attempt=$((attempt + 1))
  sleep 15
done
recipe=$(su builder -c "git -C $home/$package rev-parse HEAD")
cmp "$home/$package/PKGBUILD" "$engine/distribution/aur/PKGBUILD"
cmp "$home/$package/.SRCINFO" "$engine/distribution/aur/.SRCINFO"

su builder -c "cd $home/$package && makepkg --noconfirm"
pacman -U --noconfirm "$home/$package/$package-$version-1-x86_64.pkg.tar.zst"
pacman -Q "$package" | tee "$out/aur-package.txt"
printf '%s\n' "$recipe" | tee "$out/aur-recipe-commit.txt"

set -- cli --qrscan qrscan --destination "Arch User Repository" --identifier "$package" \
  --version "$version" --url "https://aur.archlinux.org/packages/$package" \
  --install "git clone https://aur.archlinux.org/$package.git at $recipe, makepkg, pacman -U" \
  --receipt "$out/acceptance-aur.json"
[ -z "$run_url" ] || set -- "$@" --run-url "$run_url"
python -B "$engine/scripts/destination-acceptance.py" "$@"

pacman -R --noconfirm "$package"
python -B "$engine/scripts/destination-acceptance.py" removed --qrscan qrscan \
  --uninstall "pacman -R $package" --receipt "$out/acceptance-aur.json"
python -B "$engine/scripts/destination-acceptance.py" check "$out/acceptance-aur.json"
