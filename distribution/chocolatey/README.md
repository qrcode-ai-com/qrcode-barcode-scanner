# Chocolatey package candidate

The `qrcode-barcode-scanner` package carries the released `qrscan` 0.11.0
executable for x64 Windows. Chocolatey creates the command shim and removes it
at uninstall. The build verifies the official ZIP and executable hashes, keeps
the original source and license records, and adds Chocolatey's verification
files. See the [original Windows release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0)
and the [CLI documentation](../cli/README.md).

On a disposable x64 Windows host with Chocolatey CLI 2.x and PowerShell 7,
run the consumer from an elevated shell. It creates the package in the given
directory, installs it from that local directory, verifies the shim, scans the
mixed QR and Code 128 fixture in all three profiles, and uninstalls it.

```powershell
./distribution/chocolatey/test.ps1 -WorkDirectory "$env:TEMP/qrscan-chocolatey-check"
```

The generated `receipt.json` records the exact package hash and scan results.
Community Repository admission requires a separate submission, moderation, and
a clean install from the public feed. This recipe and its local test do not
establish availability in that feed.
