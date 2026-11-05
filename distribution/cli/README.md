# Prebuilt qrscan

`qrscan` is the command-line program of the QR Code & Barcode Scanner engine.
It reads a local PNG, JPEG, WebP or GIF image, decodes the QR codes, barcodes
and other 2D codes in it, and prints a JSON scan report that includes a
scannability score. A release that carries prebuilt archives offers one archive
per platform below, a source archive of the same commit and a checksum file.
Each archive includes the version of this guide from its source tag.

## Archives

| Platform | Target | Format |
|---|---|---|
| Linux x86_64 with glibc 2.28 or later | `x86_64-unknown-linux-gnu` | `.tar.gz` |
| Linux arm64 with glibc 2.28 or later | `aarch64-unknown-linux-gnu` | `.tar.gz` |
| macOS 10.15 or later on Intel | `x86_64-apple-darwin` | `.tar.gz` |
| macOS 11.0 or later on Apple silicon | `aarch64-apple-darwin` | `.tar.gz` |
| Windows 10 or Windows Server 2016 or later, x86_64 | `x86_64-pc-windows-msvc` | `.zip` |

For version `X.Y.Z`, seven assets of the release tagged `vX.Y.Z` belong to
`qrscan`:

- `qrcode-barcode-scanner-cli-X.Y.Z-<target>.tar.gz`, or `.zip` for Windows: the
  program with its license and build records, one archive per target;
- `qrcode-barcode-scanner-cli-X.Y.Z-source.tar.gz`: the corresponding source;
- `qrcode-barcode-scanner-cli-X.Y.Z-SHA256SUMS`: one line for each of the six files
  above, made of its SHA-256 in lowercase hexadecimal, two spaces and its name.

The Windows program contains its C runtime, so it needs no Visual C++
Redistributable. No archive is provided for musl-based Linux such as Alpine,
for Windows on Arm or as a universal macOS binary.

Before a release receives these archives, its workflow runs each one on its
platform: the Linux archives on Ubuntu 24.04 and in AlmaLinux 8 and Debian 12
containers, the macOS archives on macOS 15 and the Windows archive on Windows
Server 2025. Older systems within the minimums above are judged from the
binaries themselves (glibc symbol versions, macOS deployment target, Windows
imports), not run.

## Download and verify

Choose a version and name it in your scripts: no asset name is free of a
version (see [Updates](#updates)). On Linux or macOS:

```sh
V=X.Y.Z                       # the version to install
T=x86_64-unknown-linux-gnu    # your target, from the table above
A="qrcode-barcode-scanner-cli-$V-$T.tar.gz"
S="qrcode-barcode-scanner-cli-$V-SHA256SUMS"
U="https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v$V"
curl -fLO "$U/$A"
curl -fLO "$U/$S"
grep -F "  $A" "$S" | sha256sum -c -        # Linux
grep -F "  $A" "$S" | shasum -a 256 -c -    # macOS
```

Continue only when the check prints
`qrcode-barcode-scanner-cli-X.Y.Z-<target>.tar.gz: OK`. On macOS, use `shasum`: the
`sha256sum` that recent macOS versions include succeeds silently when it
receives no line, for example after a mistyped target.

On Windows, in PowerShell:

```powershell
$V = 'X.Y.Z'
$A = "qrcode-barcode-scanner-cli-$V-x86_64-pc-windows-msvc.zip"
$S = "qrcode-barcode-scanner-cli-$V-SHA256SUMS"
$U = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v$V"
curl.exe -fLO "$U/$A"
curl.exe -fLO "$U/$S"
$Line = Get-Content -LiteralPath $S | Where-Object { $_.EndsWith("  $A") }
$Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $A).Hash.ToLowerInvariant()
if ($Line -ne "$Hash  $A") { throw "$A does not match its line in $S" } else { "$A OK" }
```

Files saved from the release page with a browser are checked the same way:
skip the two download lines and run the others in the folder that holds the
files. The same check applies to the source archive.

### What the checksum proves

The checksum file is an asset of the same release as the archives. A matching
line proves that your copy is complete and undamaged. It does not prove who
published it: whoever could replace an archive could replace the checksum file
too. No signature covers the archives: there is no GPG or minisign signature,
no build provenance attestation and, as the next section says, no code signing.

When the release page marks the release as immutable, GitHub attested its
assets when it was published, and the GitHub CLI checks a downloaded file
against that attestation:

```sh
gh release verify-asset vX.Y.Z qrcode-barcode-scanner-cli-X.Y.Z-<target>.tar.gz \
  --repo qrcode-ai-com/qrcode-barcode-scanner
```

Otherwise there is no signature or attestation to check.

## The binaries are not code-signed or notarized

The macOS binaries carry no Apple Developer ID signature and are not notarized
by Apple. The Windows binary carries no Authenticode signature. Verify the
checksum first, then follow the step for your system.

- **macOS.** A web browser marks what it downloads with the
  `com.apple.quarantine` attribute, and macOS refuses to run a quarantined
  `qrscan` because Apple cannot check its developer. Remove the attribute from
  the extracted program:

  ```sh
  xattr -d com.apple.quarantine qrscan
  ```

  `curl` sets no such attribute, and `xattr` then reports that there is none to
  remove. The Apple silicon binary carries only the ad-hoc signature that the
  linker adds, which arm64 code needs in order to run and which names no
  developer.

- **Windows.** A web browser marks what it downloads as coming from the
  internet, and Windows can then warn that the publisher of `qrscan.exe` is
  unknown. Remove the mark from the verified zip before extracting it, as in
  [Extract](#extract), or from the extracted program:

  ```powershell
  Unblock-File -LiteralPath .\qrscan.exe
  ```

  `curl.exe` sets no such mark. A policy that admits only signed programs,
  such as Smart App Control, can still block `qrscan.exe`.

## Extract

Each archive holds one top directory, named like the archive without its
extension, that contains `qrscan` (`qrscan.exe` on Windows) and the files
listed under [License and corresponding source](#license-and-corresponding-source).
On Linux or macOS, after the check above:

```sh
tar -xzf "$A"
cd "qrcode-barcode-scanner-cli-$V-$T"
```

On Windows, in PowerShell, after the check above:

```powershell
Unblock-File -LiteralPath $A
Expand-Archive -LiteralPath $A -DestinationPath .
Set-Location "qrcode-barcode-scanner-cli-$V-x86_64-pc-windows-msvc"
```

## Run

Use `qrscan` to inspect a QR design from [QR Code AI](https://qrcode-ai.com/) before printing or to read a
barcode label from a saved photo. The planned [QR code image scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode image scanner](https://qrcode-ai.com/en-US/barcode-scanner) will cover these
one-off browser workflows.

```sh
./qrscan --version                # qrscan X.Y.Z
./qrscan image.png                # the JSON scan report on stdout
./qrscan image.png --pretty       # a summary for people
./qrscan image.png --score-only   # only the score, from 0 to 100
./qrscan --capabilities           # the readers compiled into this program, as JSON
./qrscan --help                   # every option and its default
```

On Windows, run `.\qrscan.exe` the same way. To run it by name, copy `qrscan`
or `qrscan.exe` into a directory on your `PATH`, such as `/usr/local/bin` or
`~/.local/bin`; to remove it, delete that file. `qrscan` opens the image you
name and writes to stdout and stderr. It needs no network access and keeps no
configuration, cache or state.

- `--profile full`, the default, decodes and scores. `fast` uses a reduced
  search and score. `frame` only decodes, so its reports have `score: null`.
  A null score means not judged, never zero.
- Each profile has a wall-clock budget, listed by `--help`. `--budget-ms N`
  sets it and `--budget-ms 0` removes it. Under a budget, where the scan stops
  depends on the machine, and a report it cut says so with
  `trace.budget_exhausted: true`: an empty result is then not final.
- Decoded text is data from the image: `qrscan` never opens or follows it. The
  JSON report carries it as a JSON string, with control characters escaped;
  `--pretty` also escapes invisible and direction-changing characters.
- `--pretty` and error messages are coloured on a terminal. `NO_COLOR` turns
  colour off, `CLICOLOR_FORCE` turns it on elsewhere, and `NO_COLOR` wins. The
  JSON report and the `--score-only` value never contain colour codes.
- Windows PowerShell 5.1 re-encodes a program's output when `>` redirects it,
  which can alter non-ASCII text. To save a report unchanged, redirect through
  cmd.exe: `cmd /c ".\qrscan.exe image.png > report.json"`.
- The source archive holds the report's JSON Schema,
  `spec/scan-report.schema.json`, and the error codes, `spec/03-errors.md`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | At least one symbol was decoded. With `--score-only`, its score is the only output. `--capabilities`, `--version` and `--help` also exit 0. |
| `1` | No symbol was decoded, in every output mode. In JSON and `--pretty` modes the report is still printed and is a valid result; it is final only when `trace.budget_exhausted` is `false`. With `--score-only`, stdout is empty and a notice goes to stderr. |
| `2` | Invalid usage, unreadable input or a fault, listed below. Stdout is empty and the reason is on stderr. |
| `3` | Only with `--score-only`: a symbol was decoded, but the budget ran out before its score was complete. Stdout is empty. Retry with a larger `--budget-ms`; with `--budget-ms 0` this code never occurs. |
| `101` | `qrscan` panicked, for example because its output could not be written. The panic message is on stderr. |

Exit 2 covers:

- a usage error from the argument parser, reported on lines starting with
  `error:`: an unknown option, an invalid option value such as an unknown
  `--profile`, a missing image, conflicting options, or `--capabilities` with
  anything else;
- an unknown name given to `--score-preset`, `--score-skip-axes`,
  `--score-skip-checks`, `--alpha-background` or `--alpha-palette`, or more
  palette colours than allowed;
- an image file that cannot be read, such as a missing file or a directory;
- a scan error, whose message ends with its code in brackets, for example
  `[QRS-001]` when the bytes are not a decodable image;
- with `--score-only`, a configuration that computes no score
  (`--profile frame`, or every stress axis skipped), or a contained internal
  fault that left the score absent.

Scripts should branch on the exit code and, for a scan error, on its `QRS-`
code: the wording of messages may change.

## License and corresponding source

`qrscan` and the scanner engine are licensed under AGPL-3.0-or-later.
`LICENSING.md` explains the alternative commercial license. Next to the
program, each archive holds:

| File | Content |
|---|---|
| `LICENSE` | the GNU Affero General Public License, version 3 |
| `LICENSING.md` | the dual-licensing terms: AGPL-3.0-or-later or a commercial license |
| `THIRD-PARTY.md`, `LICENSE-APACHE-2.0` | the notices of the engine code derived from rxing, under Apache-2.0 |
| `THIRD-PARTY-LICENSES.txt` | each third-party Rust crate linked into `qrscan`, with its version, license, crates.io source and checksum, then each license text once |
| `COPYRIGHT-rust-std.html` | the copyright notices of the Rust standard library linked into `qrscan` |
| `SOURCE.md` | the repository, tag and commit of the build, the build recipe and where its corresponding source is |
| `build-info.json` | the build record: commit, Rust toolchain, linker, flags, builder image, the crates with their `Cargo.lock` checksums, and the SHA-256 and size of `qrscan` |
| `README.md` | this file |

The corresponding source of the binaries is the release asset
`qrcode-barcode-scanner-cli-X.Y.Z-source.tar.gz`, whose SHA-256 is a line of the
checksum file. It is a `git archive` of the whole tree of the commit the
binaries were built from, including the workflow and script that build and
package them (`.github/workflows/cli-archives.yml`, `scripts/cli-release.py`).
With git installed, this prints that commit, which `SOURCE.md` and
`build-info.json` also name:

```sh
gzip -dc qrcode-barcode-scanner-cli-X.Y.Z-source.tar.gz | git get-tar-commit-id
```

The same tree is at
`https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/<commit>`.
Third-party crates are not bundled: `SOURCE.md` gives the crates.io download
address of each crate listed in `build-info.json`, whose checksum there and in
`Cargo.lock` identifies it.

If you pass these binaries on, keep these files with them. The AGPL's
conditions for conveying object code, in section 6 of `LICENSE`, include
providing the corresponding source.

## Updates

- A fix ships as a new version with new asset names. A published asset is
  never replaced or deleted and a tag never moves, so the files of a version,
  its checksum file included, stay as they were published.
- When a release proves defective, its release notes point to the version
  that replaces it.
- No asset name is free of a version. The repository also publishes releases
  of other components, so `releases/latest` may lead to a release without
  these archives: name the version you install.
- Only the newest version's archives receive fixes.
- `qrscan` does not update itself. To update, download and verify the newer
  version's archive as above, then replace the program.

Releases and their notes are listed at
<https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases>, and the
changes of each version in `CHANGELOG.md` of the source.
