# QR Code & Barcode Scanner for Ruby

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Ruby%20%28bindings%2Fruby%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20gem%20when%20a%20Ruby%20application%2C%20a%20Rails%20job%20or%20a%20script%20already%20holds%20image%20bytes%20and%20needs%20the%20scanner%20report%20without%20starting%20a%20subprocess.%20Each%20platform%20gem%20carries%20the%20engine%27s%20native%20library%20for%20its%20system%20and%20loads%20it%20through%20the%20ffi%20gem.%20Its%20Ruby%20versions%2C%20native%20runtime%20floors%20and%20unpublished%20RubyGems%20status%20below%20are%20part%20of%20the%20installation%20contract.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fruby%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fruby%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fruby%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Ruby%20%28bindings%2Fruby%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20gem%20when%20a%20Ruby%20application%2C%20a%20Rails%20job%20or%20a%20script%20already%20holds%20image%20bytes%20and%20needs%20the%20scanner%20report%20without%20starting%20a%20subprocess.%20Each%20platform%20gem%20carries%20the%20engine%27s%20native%20library%20for%20its%20system%20and%20loads%20it%20through%20the%20ffi%20gem.%20Its%20Ruby%20versions%2C%20native%20runtime%20floors%20and%20unpublished%20RubyGems%20status%20below%20are%20part%20of%20the%20installation%20contract.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fruby%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fruby%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fruby%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Ruby%20%28bindings%2Fruby%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20gem%20when%20a%20Ruby%20application%2C%20a%20Rails%20job%20or%20a%20script%20already%20holds%20image%20bytes%20and%20needs%20the%20scanner%20report%20without%20starting%20a%20subprocess.%20Each%20platform%20gem%20carries%20the%20engine%27s%20native%20library%20for%20its%20system%20and%20loads%20it%20through%20the%20ffi%20gem.%20Its%20Ruby%20versions%2C%20native%20runtime%20floors%20and%20unpublished%20RubyGems%20status%20below%20are%20part%20of%20the%20installation%20contract.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fruby%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fruby%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fruby%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Ruby%20%28bindings%2Fruby%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20gem%20when%20a%20Ruby%20application%2C%20a%20Rails%20job%20or%20a%20script%20already%20holds%20image%20bytes%20and%20needs%20the%20scanner%20report%20without%20starting%20a%20subprocess.%20Each%20platform%20gem%20carries%20the%20engine%27s%20native%20library%20for%20its%20system%20and%20loads%20it%20through%20the%20ffi%20gem.%20Its%20Ruby%20versions%2C%20native%20runtime%20floors%20and%20unpublished%20RubyGems%20status%20below%20are%20part%20of%20the%20installation%20contract.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fbindings%2Fruby%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fruby%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fruby%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for Ruby (bindings/ruby/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use this gem when a Ruby application, a Rails job or a script already holds image bytes and needs the scanner report without starting a subprocess. Each platform gem carries the engine's native library for its system and loads it through the ffi gem. Its Ruby versions, native runtime floors and unpublished RubyGems status below are part of the installation contract. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/bindings/ruby/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ruby https://qrcode-ai.com/en-US/barcode-scanner/sdk/ruby https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use this gem when a Ruby application, a Rails job or a script already holds image bytes and needs the scanner report without starting a subprocess. Each platform gem carries the engine's native library for its system and loads it through the ffi gem. Its Ruby versions, native runtime floors and unpublished RubyGems status below are part of the installation contract.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner Ruby guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ruby) and [barcode scanner Ruby guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/ruby) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a sample image for a Ruby import workflow, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

Read QR codes and barcodes from an image in Ruby, in process. This gem holds the
[QR Code & Barcode Scanner engine](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust)
itself, as a native library, and returns its JSON report unchanged. There is no command to
install, no compiler to run and no network call.

> **Not published yet.** The gem name is `qrcode-barcode-scanner`. No version is on
> rubygems.org. The five platform gems are built, inspected and installed into a clean Ruby on
> each change; the first publication comes with a later engine release. Maintainers: see the
> [publication setup](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/bindings/ruby/LISTING.md).

## What you need

- Ruby 3.3 or later. The gems are tested on Ruby 3.3 and on Ruby 4.0. They depend on the
  [ffi](https://rubygems.org/gems/ffi) gem 1.17, whose own platform gems need no compiler.
- One of five systems, each with its own platform gem: Linux x64 or arm64 with glibc 2.28 or
  later (`x86_64-linux-gnu`, `aarch64-linux-gnu`), macOS 10.15 or later on Intel
  (`x86_64-darwin`) and 11 or later on Apple silicon (`arm64-darwin`), or Windows x64 with the
  UCRT Ruby of RubyInstaller (`x64-mingw-ucrt`). Alpine and other musl systems are not covered:
  RubyGems offers them no platform gem, and there is no gem that builds from source.

## Scan an image

```ruby
require 'qrcode_barcode_scanner'

report = QrcodeBarcodeScanner.scan(File.binread('label.png'))
report.detections.each do |detection|
  puts "#{detection['symbology']} #{detection.dig('content', 'text')}"
end
```

`QrcodeBarcodeScanner.scan` takes the bytes of a PNG, JPEG, WebP or GIF file, as a binary
String. `QrcodeBarcodeScanner.scan_frame` takes raw pixels, four bytes per pixel in red, green,
blue, alpha order, with the width and the height. Both run on the calling thread and return when
the scan is done, and both are safe to call from several threads.

Options are keyword arguments. Every value left out keeps the engine's own default:

```ruby
report = QrcodeBarcodeScanner.scan(image, profile: :fast, budget_ms: 0)
```

| Profile | What the engine does |
| --- | --- |
| `:frame` | Decodes only. The report carries no score. The default of `scan_frame`. |
| `:fast` | Decodes first, with a reduced judgment. |
| `:full` | Decodes and judges how well a QR code scans. The default of `scan`. |

| Option | Meaning |
| --- | --- |
| `budget_ms:` | The time budget in milliseconds. Left out, the profile keeps its own budget and a busy machine can cut the scan short. `0` sets none: the result then does not depend on how busy the machine is. |
| `max_dimension:`, `max_pixels:` | The largest image accepted. A larger one is refused before it is decoded. |
| `score_skip_axes:`, `score_skip_checks:`, `score_preset:` | Which parts of the score are left out. A preset and skipped axes cannot be given together. |
| `alpha_background:`, `alpha_palette:` | What a transparent image is laid over, and the backgrounds a transparent code must scan over. |

The values each option takes are those of the engine: see the
[option domains](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/spec/02-profiles.md).

## Read the report

[![A QR code and Code 128 decoded from the same image, each outlined where the engine measured it](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc)](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples)

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both come
back in the same report, each with its format and the place where the engine measured it.

`report.json` is the exact text the engine returned. Nothing is renamed, rounded or
recalculated. `report.to_h` is that text parsed into a Hash with string keys, for the payload,
the measured places and the trace. It follows the engine's
[report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/spec/01-report.md).
The other methods read the most used parts:

| Method | Meaning |
| --- | --- |
| `found?` | At least one code was decoded. |
| `detections` | One Hash per distinct content: `'symbology'`, and `'content'` with `'text'` and `'raw'`, the exact bytes in base64. |
| `score` | The scannability judgment from 0 to 100, or `nil`. |
| `complete?` | `false` when the time budget cut the scan. |
| `engine_version` | The engine that wrote the report. |

Three things are easy to get wrong:

- **No code is a result, not an error.** `found?` is `false` and nothing is raised.
- **A missing score is not zero.** `score` is `nil` with the `:frame` profile, or when the
  budget ran out before the judgment.
- **An incomplete scan proves nothing.** When `complete?` is `false`, an empty report does not
  mean the image holds no code. Scan again with a larger budget or with `budget_ms: 0`.

Decoded text is untrusted data: a QR code can hold any text. Do not follow its links or run it.

## When something fails

Every refusal of the engine is one exception class, `QrcodeBarcodeScanner::ScanError`. Its
message is the engine's own sentence.

| `kind` | When | `code` |
| --- | --- | --- |
| `'ScanFailed'` | The engine refused the image or a limit: bytes that are not an image, an image above a limit, a frame whose size does not match its pixels, a limit of zero. | The engine's code, such as `'QRS-001'` for bytes that are not an image. |
| `'UnknownProfile'`, `'UnknownAlphaBackground'`, `'UnknownPaletteColor'`, `'UnknownScorePreset'`, `'UnknownStressAxis'`, `'UnknownScoreCheck'`, `'PaletteTooLarge'`, `'ScorePresetConflict'` | An option holds a value the engine does not know, or two options that cannot go together. | `nil` |
| `'EngineFault'` | A fault inside the engine itself, not a refusal of your input. | `nil` |

```ruby
begin
  QrcodeBarcodeScanner.scan(File.binread('notes.txt'))
rescue QrcodeBarcodeScanner::ScanError => e
  warn "#{e.kind} #{e.code}: #{e.message}"
end
```

A profile that is not one of the three raises `ArgumentError`, and an image that is not a String
raises `TypeError`, before the engine is called. The codes are listed in the engine's
[error catalog](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/docs/api/errors.mdx).

## What it reads

The gem holds the engine, so it reads what the engine reads.
Codes of different formats in the same image come back in one report.

[![The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3)](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats)

| Family | Formats |
|---|---|
| QR | QR Code, Micro QR, rectangular Micro QR (rMQR) |
| Matrix and stacked | Data Matrix, Aztec, PDF417, MaxiCode |
| Retail | EAN-13, EAN-8, UPC-A, UPC-E |
| Other linear | Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen |

The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## The same engine in other runtimes

[![One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba)](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started)

| Runtime | Package | How it scans |
|---|---|---|
| Rust | [`qrcode-barcode-scanner`](https://crates.io/crates/qrcode-barcode-scanner) on crates.io | In process |
| Node.js | [`@qrcode-ai-com/qrcode-barcode-scanner`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner) on npm | In process, native |
| Browser | [`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm) on npm | In the page, WebAssembly |
| Python | [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/) on PyPI | In process |
| Go | [`qrcode-barcode-scanner-go`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-go) | Through the installed `qrscan` |
| PHP | [`qrcode-barcode-scanner-php`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-php) | Through the installed `qrscan` |
| Command line | [`qrscan`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line) | One command, one JSON report |

The Rust, Node.js, browser and Python packages hold the engine. The Go and PHP packages hold no decoder:
each one starts `qrscan` and hands you its report.

Language and platform names and logos belong to their owners. They identify a runtime or a destination
and imply no endorsement.

## How it is built

The gem is a thin layer over the engine's UniFFI library, the same one the Kotlin, Swift and
.NET bindings use. Two inputs are produced by the workflow from one commit and are never
checked in:

- the native library, built from `crates/qrcode-ai-scanner-uniffi` with its locked UniFFI;
- the Ruby that the crate's own `uniffi-bindgen` generates from that very library. It stays
  internal: the public API is the module, `Report` and `ScanError` of this folder.

Generating both from one commit is what keeps their contract checksums equal. The workflow
`Ruby gem` of the engine repository (`.github/workflows/ruby.yml`) does it on each change:

- on Linux it runs the tests of this folder against the engine's fixtures;
- it builds the native library for the five systems at the floors above, and a program reads
  each file to check what it needs from the system that loads it;
- it builds the five platform gems, inspects them file by file, then on the five systems a
  clean Ruby installs its gem from a file, scans the engine's mixed fixture with the three
  profiles and uninstalls it. The engine's acceptance driver judges those scans.

## License

MIT for project-authored source: see [LICENSE](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE) and the
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md).
Each gem ships `LICENSE`, `LICENSE-NOTES.md` and the engine core's Apache-2.0 notices.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
