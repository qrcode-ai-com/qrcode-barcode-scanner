Name:           qrcode-barcode-scanner
Version:        0.11.0
Release:        1%{?dist}
Summary:        Offline QR code and barcode scanner
# Both release archives retain the complete upstream license expressions.
# Apache-2.0 and MIT satisfy the dual-licensed alternatives in the payload.
License:        AGPL-3.0-or-later AND Apache-2.0 AND BSD-3-Clause AND ISC AND MIT AND Zlib
URL:            https://qrcode-ai.com/
ExclusiveArch:  x86_64 aarch64

%global upstream https://github.com/qrcode-ai-com/qrcode-barcode-scanner
%global archive qrcode-barcode-scanner-cli-%{version}
Source0:        %{upstream}/releases/download/v%{version}/%{archive}-x86_64-unknown-linux-gnu.tar.gz
Source1:        %{upstream}/releases/download/v%{version}/%{archive}-aarch64-unknown-linux-gnu.tar.gz
Source2:        %{upstream}/releases/download/v%{version}/%{archive}-source.tar.gz
BuildRequires:  coreutils
BuildRequires:  gzip
BuildRequires:  tar
Requires:       glibc >= 2.28

# The prebuilt executable must remain byte-identical to the published CLI.
%global debug_package %{nil}
%global __os_install_post %{nil}
%global _build_id_links none
%global source_date_epoch_from_changelog 1
%global use_source_date_epoch_as_buildtime 1
%global build_mtime_policy clamp_to_source_date_epoch

%description
qrscan decodes QR codes and barcodes from images and returns JSON.
It also provides scannability diagnostics for QR codes.

Web tools: https://qrcode-ai.com/en-US/qr-code-scanner and
https://qrcode-ai.com/en-US/barcode-scanner

%prep
printf '%s  %s\n' \
  b7c6669e332c7cc688228077b70d87f52154052e345992bd358aad6d6c7d3298 '%{SOURCE0}' \
  d5b5eff8ed336ef82a76865fd16e9a087afd5b1574b537747aea6d105ae7c5aa '%{SOURCE1}' \
  8e5e09f0ec8d93ae49ca35615c05bb1d326448b6de9757cef86ef48d7bf3a96d '%{SOURCE2}' \
  | sha256sum --strict --check

%ifarch x86_64
%global cli_input %{SOURCE0}
%global executable_sha256 77965589784699138d2b512f94067528eba552536160560daed191de824ea01c
%endif
%ifarch aarch64
%global cli_input %{SOURCE1}
%global executable_sha256 d010a03064011f8775fc6f0add357cbbc634366d4b96dc0b892ab2c6047b271a
%endif
%global cli_archive %{archive}-%{_arch}-unknown-linux-gnu

mkdir '%{cli_archive}'
for name in qrscan LICENSE LICENSE-APACHE-2.0 LICENSING.md THIRD-PARTY.md \
  THIRD-PARTY-LICENSES.txt COPYRIGHT-rust-std.html SOURCE.md README.md build-info.json; do
  tar -xOzf '%{cli_input}' "%{cli_archive}/$name" >"%{cli_archive}/$name"
done

%install
cd '%{cli_archive}'
printf '%s  qrscan\n' '%{executable_sha256}' | sha256sum --strict --check
install -Dm0755 qrscan '%{buildroot}%{_bindir}/qrscan'
install -d '%{buildroot}%{_licensedir}/%{name}' '%{buildroot}%{_docdir}/%{name}'
install -m0644 LICENSE LICENSE-APACHE-2.0 LICENSING.md THIRD-PARTY.md \
  THIRD-PARTY-LICENSES.txt COPYRIGHT-rust-std.html SOURCE.md \
  '%{buildroot}%{_licensedir}/%{name}/'
install -m0644 README.md build-info.json '%{buildroot}%{_docdir}/%{name}/'

%files
%{_bindir}/qrscan
%license %{_licensedir}/%{name}
%doc %{_docdir}/%{name}

%changelog
* Mon Nov 09 2026 QR Code AI <contact@qrcode-ai.com> - 0.11.0-1
- Package the published 0.11.0 CLI for Fedora.
