# QR Code & Barcode Scanner for Go

<!-- qrcode-ai-readme-actions:v1 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Go%20%28bindings%2Fgo%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fgo%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Go%20%28bindings%2Fgo%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fgo%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://aistudio.google.com/prompts/new_chat?prompt=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Go%20%28bindings%2Fgo%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fgo%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Go%20%28bindings%2Fgo%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fgo%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Go%20%28bindings%2Fgo%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fgo%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fgo%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)

Open an AI assistant with a question about this destination and its public sources. Gemini opens Google AI Studio. Sign-in or pasting the question may be needed; nothing is sent until you submit it. Check the answer against the documentation.

<details>
<summary>Copy the question</summary>

```text
Help me understand QR Code & Barcode Scanner for Go (bindings/go/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/go/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/go https://qrcode-ai.com/en-US/barcode-scanner/sdk/go https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v1 -->

Read QR codes and barcodes from an image file in Go. This package drives the installed `qrscan`
command of the
[QR Code & Barcode Scanner engine](https://github.com/qrcode-ai-com/qrcode-barcode-scanner)
and returns its JSON report unchanged. It holds no decoder of its own, uses the standard library
only and needs no cgo.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Go guide** | [QR code scanner for Go](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/go) | [Barcode scanner for Go](https://qrcode-ai.com/en-US/barcode-scanner/sdk/go) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

## Install

```sh
go get github.com/qrcode-ai-com/qrcode-barcode-scanner-go@v0.11.0
```

```go
import qrscan "github.com/qrcode-ai-com/qrcode-barcode-scanner-go"
```

The package follows the engine it drives: version 0.11.x of the package works with `qrscan`
0.11.x. The first version is 0.11.0.

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
