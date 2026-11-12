# QR Code & Barcode Scanner for .NET

Read QR codes and barcodes from an image in C# and .NET, in process. This package holds the
[QR Code & Barcode Scanner engine](https://github.com/qrcode-ai-com/qrcode-barcode-scanner)
itself, as a native library, and returns its JSON report unchanged. There is no command to
install and no network call.

> **Not published yet.** The package id is `QRCodeAI.QRCodeBarcodeScanner`. No version is on
> nuget.org. The archive is built, inspected and installed by clean projects on each change;
> its first publication comes with a later engine release. Maintainers: see the
> [publication setup and release checks](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/dotnet/PUBLISHING.md).

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **.NET guide** | [QR code scanner for .NET](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/dotnet) | [Barcode scanner for .NET](https://qrcode-ai.com/en-US/barcode-scanner/sdk/dotnet) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

## What you need

- .NET 8 or later. The package targets .NET 8, and its tests run on .NET 8 and on .NET 10.
  Microsoft ended its support of .NET 8 on 10 November 2026: .NET 10 is the long-term release
  it supports.
- One of five systems, whose native library the package carries: Linux x64 or arm64 with
  glibc 2.28 or later, macOS 10.15 or later on Intel and 11 or later on Apple silicon, or
  Windows x64. Alpine and other musl systems are not covered.

## Scan an image

```csharp
using QRCodeAI.QRCodeBarcodeScanner;

var report = Scanner.Scan(File.ReadAllBytes("label.png"));
foreach (var detection in report.Detections)
{
    Console.WriteLine($"{detection.Symbology} {detection.Text}");
}
```

`Scanner.Scan` takes the bytes of a PNG, JPEG, WebP or GIF file. `Scanner.ScanFrame` takes raw
pixels, four bytes per pixel in red, green, blue, alpha order, with the width and the height.
Both run on the calling thread and return when the scan is done, and both are safe to call from
several threads.

Options are one record. Every value left out keeps the engine's own default:

```csharp
var report = Scanner.Scan(image, new ScanOptions { Profile = ScanProfile.Fast, BudgetMs = 0 });
```

| Profile | What the engine does |
| --- | --- |
| `ScanProfile.Frame` | Decodes only. The report carries no score. The default of `ScanFrame`. |
| `ScanProfile.Fast` | Decodes first, with a reduced judgment. |
| `ScanProfile.Full` | Decodes and judges how well a QR code scans. The default of `Scan`. |

| Option | Meaning |
| --- | --- |
| `BudgetMs` | The time budget in milliseconds. Left out, the profile keeps its own budget and a busy machine can cut the scan short. `0` sets none: the result then does not depend on how busy the machine is. |
| `MaxDimension`, `MaxPixels` | The largest image accepted. A larger one is refused before it is decoded. |
| `ScoreSkipAxes`, `ScoreSkipChecks`, `ScorePreset` | Which parts of the score are left out. A preset and skipped axes cannot be given together. |
| `AlphaBackground`, `AlphaPalette` | What a transparent image is laid over, and the backgrounds a transparent code must scan over. |

The values each option takes are those of the engine: see the
[option domains](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/spec/02-profiles.md).

## Read the report

`report.Json` is the exact text the engine returned. Nothing is renamed, rounded or
recalculated, so decode it yourself for the payload, the measured places and the trace. It
follows the engine's [report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/spec/01-report.md). The other members read the
most used parts:

| Member | Meaning |
| --- | --- |
| `Found` | At least one code was decoded. |
| `Detections` | One entry per distinct content: `Symbology`, `Text` and `Raw`, the exact bytes. |
| `Score` | The scannability judgment from 0 to 100, or `null`. |
| `Complete` | `false` when the time budget cut the scan. |
| `EngineVersion` | The engine that wrote the report. |

Three things are easy to get wrong:

- **No code is a result, not an error.** `Found` is `false` and nothing is thrown.
- **A missing score is not zero.** `Score` is `null` with `ScanProfile.Frame`, or when the
  budget ran out before the judgment.
- **An incomplete scan proves nothing.** When `Complete` is `false`, an empty report does not
  mean the image holds no code. Scan again with a larger budget or with `BudgetMs = 0`.

Decoded text is untrusted data: a QR code can hold any text. Do not follow its links or run it.

## When something fails

Every refusal is one exception type, `ScanException`. Its message is the engine's own sentence.

| `Case` | When | `Code` |
| --- | --- | --- |
| `ScanFailed` | The engine refused the image or a limit: bytes that are not an image, an image above a limit, a frame whose size does not match its pixels, a limit of zero. | The engine's code, such as `QRS-001` for bytes that are not an image. |
| `UnknownAlphaBackground`, `UnknownPaletteColor`, `UnknownScorePreset`, `UnknownStressAxis`, `UnknownScoreCheck`, `PaletteTooLarge`, `ScorePresetConflict` | An option holds a value the engine does not know, or two options that cannot go together. | `null` |
| `EngineFault` | A fault inside the engine itself, not a refusal of your input. | `null` |

The codes are listed in the engine's [error catalog](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/errors.mdx).

## How it is built

The package is a thin layer over the engine's UniFFI library, the same one the Kotlin and
Swift bindings use. Two inputs are produced by the workflow from one commit and are never
checked in:

- the native library, built from `crates/qrcode-ai-scanner-uniffi` with its locked UniFFI;
- the C# that [uniffi-bindgen-cs](https://github.com/NordSecurity/uniffi-bindgen-cs) generates
  from that very library, at the release of the same UniFFI line. It stays internal: the public
  API is the six types of this folder.

Generating both from one commit is what keeps their contract checksums equal. The workflow
`.NET binding` of the engine repository (`.github/workflows/dotnet.yml`) does it on each change:

- on three systems it runs the tests of this folder on .NET 8 and on .NET 10;
- it builds the native library for the five systems at the floors above, and a program reads
  each file to check what it needs from the system that loads it;
- it packs the archive, inspects it file by file, then on the five systems a clean project
  installs it from a folder, scans the engine's mixed fixture with the three profiles and
  removes it. The engine's acceptance driver judges those scans.

## License

AGPL-3.0-or-later, like the engine it contains: see [LICENSE](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSE) and the
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSING.md). A closed-source application needs the commercial
license described there.
