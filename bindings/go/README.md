# QR Code & Barcode Scanner for Go

Read QR codes and barcodes from an image file in Go. This package drives the installed `qrscan`
command of the
[QR Code & Barcode Scanner engine](https://github.com/qrcode-ai-com/qrcode-barcode-scanner)
and returns its JSON report unchanged. It holds no decoder of its own, uses the standard library
only and needs no cgo.

> **Not published yet.** This package is checked in the engine repository against the released
> `qrscan` 0.11.0. It has no tagged version: `go get` does not find it today.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Go guide** | [QR code scanner for Go](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/go) | [Barcode scanner for Go](https://qrcode-ai.com/en-US/barcode-scanner/sdk/go) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

## What you need

- Go 1.24 or later. `CGO_ENABLED=0` works: there is no C code.
- The `qrscan` command, version 0.11.x, installed separately. The
  [distribution guide](../../distribution/README.md) lists the routes: Homebrew, Scoop, the
  Debian and RPM packages, the AUR, `cargo install`, the release archives and the container
  image. This package never downloads it.

## Scan an image

```go
scanner := qrscan.New("") // qrscan on PATH; or qrscan.New("/path/to/qrscan")
report, err := scanner.Scan(ctx, "label.png", qrscan.Fast, qrscan.ProfileBudget)
if err != nil {
	return err
}
for _, detection := range report.Detections {
	fmt.Println(detection.Symbology, detection.Text)
}
```

`Scan` takes a context, the file, a profile and a time budget in milliseconds:

| Profile | What the engine does |
| --- | --- |
| `qrscan.Frame` | Decodes only. The report carries no score. |
| `qrscan.Fast` | Decodes first, with a reduced judgment. |
| `qrscan.Full` | Decodes and judges how well a QR code scans. |

`qrscan.ProfileBudget` keeps the profile's own budget, and a busy machine can then cut the scan
short. `qrscan.Unbounded` sets none: the result then does not depend on how busy the machine is.
Cancelling the context stops the command.

## Read the report

`report.JSON` is the exact text the engine printed. Nothing is renamed, rounded or recalculated,
so decode it yourself for the payload, the measured places and the trace. The other fields read
the most used parts:

| Field | Meaning |
| --- | --- |
| `Found()` | At least one code was decoded. |
| `Detections` | One entry per distinct content: `Symbology`, `Text` and `Raw`, the exact bytes. |
| `Score` | The scannability judgment, or `nil`. |
| `Complete` | `false` when the time budget cut the scan. |
| `EngineVersion` | The engine that wrote the report, such as `0.11.0`. |

Three things are easy to get wrong:

- **No code is a result, not an error.** `Found()` is `false` and `err` is `nil`.
- **A missing score is not zero.** `Score` is `nil` with `qrscan.Frame`, or when the budget ran
  out before the judgment.
- **An incomplete scan proves nothing.** When `Complete` is `false`, an empty report does not
  mean the image holds no code. Scan again with a larger budget or with `qrscan.Unbounded`.

Decoded text is untrusted data: a QR code can hold any text. Do not follow its links or run it.

## When something fails

| Error | When |
| --- | --- |
| `qrscan.ErrBinaryNotFound` (with `errors.Is`) | `qrscan` could not be started: not installed, not on `PATH`, not executable. It is not remembered: install the command and the same `Scanner` works. |
| `*qrscan.UnsupportedVersionError` | The installed `qrscan` is not 0.11.x. The check runs before the first scan. |
| `*qrscan.ScanError` | The engine refused the file or the options. `EngineCode` holds its code when it gives one, such as `QRS-001` for a file that is not an image. |
| the context's error | The context was cancelled or its deadline passed; the command was stopped. |

## What it does and does not do

- One scan starts one process. That suits a request or a job. It is the wrong tool for
  thousands of images in a tight loop.
- It reads image files: PNG, JPEG, WebP and GIF. To scan bytes you hold in memory, write them
  to a temporary file first.
- The command is started from a list of arguments, with no shell. A file name is never
  interpreted, whatever it holds: spaces, quotes, a leading dash or shell characters.
- It writes nothing, fetches nothing and never opens what a code points to.

## Why not WebAssembly

A first experiment compiled the engine to WebAssembly and ran it inside the Go process with
wazero. Its reports were identical to the native command's, and one scan of a photo-sized image
took about twenty times longer. The owner chose this route on 11 November 2026.

## Develop

The tests run against a real `qrscan`, not a stand-in:

```sh
QRSCAN_BINARY=/path/to/qrscan QRSCAN_FIXTURES=/path/to/engine/fixtures go test ./...
```

They cover the three profiles on an image that holds a QR code and a Code 128, an image with no
code, files that are not images, awkward file names, a missing command, an engine of another
version and a cancelled context. The workflow `Go adapter` of the engine repository runs them
on Linux, macOS and Windows against the released command.

## Its own repository

A Go module is fetched from the root of a repository at a tag, so the package is served from a
small repository of its own, `qrcode-ai-com/qrcode-barcode-scanner-go`. Nothing there is edited
by hand: [`scripts/stage-go-package.py`](../../scripts/stage-go-package.py) writes its whole tree
from one commit of the engine repository, with the workflow of [`mirror/`](mirror/), the two test
images, the licence and a `SOURCE.json` that names the commit and the sha256 of every file. The
same program checks that a tree is exactly that. Change the package here, then stage it again.

## Licence

AGPL-3.0-or-later, like the engine it drives. See [LICENSE](../../LICENSE).
