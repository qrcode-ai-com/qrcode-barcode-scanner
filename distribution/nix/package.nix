# Nixpkgs derivation for qrscan 0.11.0, for pkgs/by-name/qr/qrcode-barcode-scanner/package.nix.
# It builds the CLI crate from the release source archive of tag v0.11.0. cargoHash is the hash
# of the vendored crates of its Cargo.lock, as fetchCargoVendor computed it (README.md).
{
  lib,
  rustPlatform,
  fetchurl,
}:

rustPlatform.buildRustPackage (finalAttrs: {
  pname = "qrcode-barcode-scanner";
  version = "0.11.0";

  src = fetchurl {
    url = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v${finalAttrs.version}/qrcode-barcode-scanner-cli-${finalAttrs.version}-source.tar.gz";
    hash = "sha256-jl4J8OyNk65JyjVhXAW7HTJkSLbel1fO+G70jXvzqW0=";
  };

  cargoHash = "sha256-S2QS0odAxMEtgWdh8j79kRajXJ0r85rIrF+0bU5FLTI=";

  # The archive holds the whole workspace; only the qrscan crate is built and tested. The
  # workspace release profile stays as it is (overflow checks in the rxing reader, no panic=abort).
  cargoBuildFlags = [
    "--package"
    "qrcode-barcode-scanner-cli"
  ];
  cargoTestFlags = [
    "--package"
    "qrcode-barcode-scanner-cli"
  ];

  # The mixed fixture holds a QR code and a Code 128: every profile must read both.
  doInstallCheck = true;
  installCheckPhase = ''
    runHook preInstallCheck
    for profile in fast frame full; do
      $out/bin/qrscan --profile "$profile" --budget-ms 0 \
        fixtures/symbology/mixed-code128-qr.png > "scan-$profile.json"
      grep -qF '"text": "https://qrc-ai.com/76xMa"' "scan-$profile.json"
      grep -qF '"text": "STOCK-4827"' "scan-$profile.json"
    done
    runHook postInstallCheck
  '';

  meta = {
    description = "Offline QR code and barcode scanner for the command line";
    homepage = "https://qrcode-ai.com/en-US/qr-code-scanner/cli";
    changelog = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/tag/v${finalAttrs.version}";
    license = lib.licenses.agpl3Plus;
    mainProgram = "qrscan";
    # The owner adds his entry to maintainers/maintainer-list.nix and names it here.
    maintainers = [ ];
    platforms = lib.platforms.linux ++ lib.platforms.darwin;
  };
})
