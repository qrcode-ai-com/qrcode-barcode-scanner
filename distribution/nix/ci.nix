# Evaluates package.nix against a pinned nixpkgs revision, the way the packaging lint workflow
# does. It is not part of the Nixpkgs submission: only package.nix goes to pkgs/by-name.
#
#   nix-instantiate --eval --strict --json distribution/nix/ci.nix -A meta.license.spdxId
#   nix-build --no-out-link distribution/nix/ci.nix -A cargoDeps
{
  nixpkgs ? builtins.fetchTarball "https://github.com/NixOS/nixpkgs/archive/04906337b6d53e8bb0eaf0470ae9f070a4d4eb55.tar.gz",
}:
let
  pkgs = import nixpkgs { };
in
pkgs.callPackage ./package.nix { }
