#
# spec file for package qrcode-barcode-scanner
#
# Copyright (c) 2026 QR Code AI / SuperNovae Studio
#
# All modifications and additions to the file contributed by third parties
# remain the property of their copyright owners, unless otherwise agreed
# upon. The license for this file, and modifications and additions to the
# file, is the same license as for the pristine package itself (unless the
# license for the pristine package is not an Open Source License, in which
# case the license is the MIT License). An "Open Source License" is a
# license that conforms to the Open Source Definition (Version 1.9)
# published by the Open Source Initiative.
#
# Please submit bugfixes or comments via https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues
#

Name:           qrcode-barcode-scanner
Version:        0.11.0
%global archive qrcode-barcode-scanner-cli-%{version}-source
Release:        0
Summary:        Offline QR code and barcode scanner for the command line
# The program and the crates it links, as in the Fedora package of the same release.
License:        AGPL-3.0-or-later AND Apache-2.0 AND BSD-3-Clause AND ISC AND MIT AND Zlib
Group:          Productivity/Graphics/Other
URL:            https://qrcode-ai.com/en-US/qr-code-scanner/cli
Source0:        https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v%{version}/%{archive}.tar.gz
Source1:        vendor.tar.zst
BuildRequires:  cargo-packaging
ExclusiveArch:  x86_64 aarch64

%description
qrscan reads every QR code and barcode in an image file and prints a JSON
report. It works offline: no account, no upload and no network access.

It reads QR Code, Micro QR, rMQR, Data Matrix, Aztec, PDF417, MaxiCode and
the common linear barcodes. The report keeps the payload bytes and the
position of each code, and gives each QR code a scannability score.

%prep
echo '8e5e09f0ec8d93ae49ca35615c05bb1d326448b6de9757cef86ef48d7bf3a96d  %{SOURCE0}' | sha256sum --strict --check
%autosetup -n %{archive} -p1 -a1

# The archive holds the whole workspace and its Cargo.lock; only the qrscan crate is built. The
# workspace release profile stays as it is: it checks integer overflow in the rxing reader, and
# the engine catches reader panics, so panic=abort must never be added.
%build
%{cargo_build} -p qrcode-barcode-scanner-cli

%install
install -D -m 0755 target/release/qrscan %{buildroot}%{_bindir}/qrscan

%check
%{cargo_test} -p qrcode-barcode-scanner-cli
# The mixed fixture holds a QR code and a Code 128: every profile must read both.
for profile in fast frame full; do
  %{buildroot}%{_bindir}/qrscan --profile "$profile" --budget-ms 0 \
    fixtures/symbology/mixed-code128-qr.png > "scan-$profile.json"
  grep -qF '"text": "https://qrc-ai.com/76xMa"' "scan-$profile.json"
  grep -qF '"text": "STOCK-4827"' "scan-$profile.json"
done

%files
%license LICENSE LICENSING.md crates/qrcode-ai-scanner/LICENSE-APACHE-2.0 crates/qrcode-ai-scanner/THIRD-PARTY.md
%{_bindir}/qrscan

%changelog
