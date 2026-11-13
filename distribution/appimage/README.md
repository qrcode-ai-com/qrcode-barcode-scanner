# AppImage recipe

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20AppImage%20recipe%20%28distribution%2Fappimage%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20an%20AppImage%20when%20you%20want%20the%20Linux%20command%20in%20a%20downloadable%20file%20rather%20than%20a%20system%20package.%20The%20release%20files%20carry%20the%20existing%20CLI%20and%20its%20source%20and%20license%20records%3B%20they%20do%20not%20provide%20a%20graphical%20scanning%20interface.%20GitHub%20download%20availability%20and%20admission%20to%20the%20AppImage%20catalogue%20remain%20separate%2C%20as%20recorded%20below.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fappimage%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20AppImage%20recipe%20%28distribution%2Fappimage%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20an%20AppImage%20when%20you%20want%20the%20Linux%20command%20in%20a%20downloadable%20file%20rather%20than%20a%20system%20package.%20The%20release%20files%20carry%20the%20existing%20CLI%20and%20its%20source%20and%20license%20records%3B%20they%20do%20not%20provide%20a%20graphical%20scanning%20interface.%20GitHub%20download%20availability%20and%20admission%20to%20the%20AppImage%20catalogue%20remain%20separate%2C%20as%20recorded%20below.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fappimage%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20AppImage%20recipe%20%28distribution%2Fappimage%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20an%20AppImage%20when%20you%20want%20the%20Linux%20command%20in%20a%20downloadable%20file%20rather%20than%20a%20system%20package.%20The%20release%20files%20carry%20the%20existing%20CLI%20and%20its%20source%20and%20license%20records%3B%20they%20do%20not%20provide%20a%20graphical%20scanning%20interface.%20GitHub%20download%20availability%20and%20admission%20to%20the%20AppImage%20catalogue%20remain%20separate%2C%20as%20recorded%20below.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fappimage%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20AppImage%20recipe%20%28distribution%2Fappimage%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20an%20AppImage%20when%20you%20want%20the%20Linux%20command%20in%20a%20downloadable%20file%20rather%20than%20a%20system%20package.%20The%20release%20files%20carry%20the%20existing%20CLI%20and%20its%20source%20and%20license%20records%3B%20they%20do%20not%20provide%20a%20graphical%20scanning%20interface.%20GitHub%20download%20availability%20and%20admission%20to%20the%20AppImage%20catalogue%20remain%20separate%2C%20as%20recorded%20below.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fappimage%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fcli%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v1.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v1.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v1.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v1.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand AppImage recipe (distribution/appimage/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use an AppImage when you want the Linux command in a downloadable file rather than a system package. The release files carry the existing CLI and its source and license records; they do not provide a graphical scanning interface. GitHub download availability and admission to the AppImage catalogue remain separate, as recorded below. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/distribution/appimage/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/cli https://qrcode-ai.com/en-US/barcode-scanner/cli https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use an AppImage when you want the Linux command in a downloadable file rather than a system package. The release files carry the existing CLI and its source and license records; they do not provide a graphical scanning interface. GitHub download availability and admission to the AppImage catalogue remain separate, as recorded below.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner command line guide](https://qrcode-ai.com/en-US/qr-code-scanner/cli) and [barcode scanner command line guide](https://qrcode-ai.com/en-US/barcode-scanner/cli) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a local label to scan with the downloaded AppImage, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

This recipe wraps the official scanner 0.11.0 GNU/Linux CLI in an AppImage: one file that a user
downloads, marks executable and runs as `qrscan`, with nothing to install. The executable inside
stays byte-identical to the published `qrscan` on x86_64 and aarch64. The file also carries the
licences, the notices and the pointer to the corresponding source.

**Published on GitHub.** The two files and their SHA-256 list are attached to the release
[`appimage-v0.11.0`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/appimage-v0.11.0).
The engine release `v0.11.0` and its files did not change. The
[AppImage catalogue](https://appimage.github.io/) does not list the application yet.

## Build

Use a GNU/Linux machine of the architecture you build for, with `bash`, `coreutils`, `tar` and
`gzip`. Put four files in one directory:

| File | From |
| --- | --- |
| `qrcode-barcode-scanner-cli-0.11.0-SHA256SUMS` | the [engine release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0) |
| `qrcode-barcode-scanner-cli-0.11.0-<target>.tar.gz` | the same release, `x86_64-unknown-linux-gnu` or `aarch64-unknown-linux-gnu` |
| `appimagetool-<machine>.AppImage` | [appimagetool 1.9.1](https://github.com/AppImage/appimagetool/releases/tag/1.9.1) |
| `runtime-<architecture>` | [type2-runtime 20251108](https://github.com/AppImage/type2-runtime/releases/tag/20251108) |

```sh
mkdir -p out
bash distribution/appimage/build.sh x86_64 /path/to/inputs out
```

`build.sh` pins the SHA-256 of the four inputs and of the executable, and stops when one differs.
It compiles nothing. It writes `out/qrcode-barcode-scanner-0.11.0-x86_64.AppImage` and prints its
SHA-256. Every entry of the file tree gets the commit time of the tag `v0.11.0`, and the workflow
checks that a second build gives the same file.

## What the file holds

| Path | Content |
| --- | --- |
| `AppRun` | a link to `usr/bin/qrscan`: the file behaves like `qrscan` |
| `usr/bin/qrscan` | the executable of the public archive, unchanged |
| `qrcode-barcode-scanner.desktop` | the desktop entry, `Terminal=true`: this is a command-line tool |
| `qrcode-barcode-scanner.png`, `.DirIcon` | the icon, 256 px, drawn by [`icon.py`](icon.py) |
| `usr/share/metainfo/qrcode-barcode-scanner.appdata.xml` | the AppStream description |
| `usr/share/doc/qrcode-barcode-scanner/` | `LICENSE`, `LICENSING.md`, `SOURCE.md`, the third-party notices and `build-info.json` |

## Run and test

```sh
chmod +x qrcode-barcode-scanner-0.11.0-x86_64.AppImage
./qrcode-barcode-scanner-0.11.0-x86_64.AppImage --version
./qrcode-barcode-scanner-0.11.0-x86_64.AppImage label.png --profile full
```

The file mounts itself through FUSE. On a host without FUSE, such as most containers, it unpacks
itself into a temporary directory and runs from there:

```sh
APPIMAGE_EXTRACT_AND_RUN=1 ./qrcode-barcode-scanner-0.11.0-x86_64.AppImage --version
```

Download the [mixed fixture](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/v0.11.0/fixtures/symbology/mixed-code128-qr.png)
as `mixed-code128-qr.png`. The report of each profile contains the QR URL
`https://qrc-ai.com/76xMa` and the Code 128 value `STOCK-4827`. The scanner runs on this computer
and opens no link.

To remove it, delete the file. It writes nothing else on the machine.

## What the workflow checks

For x86_64 and aarch64, on Ubuntu 22.04 runners:

1. The build, twice, and that both files are equal.
2. The desktop entry with `desktop-file-validate` and the AppStream description with
   `appstreamcli validate`.
3. The file tree: one desktop entry, an executable `AppRun`, a PNG `.DirIcon`, the licence files,
   and an executable equal to the one of the public archive.
4. `--version` and `--help` as a user who just downloaded the file, without FUSE. It also tries
   the FUSE route and reports whether the runner offers it.
5. The [destination acceptance contract](../acceptance/README.md) on the runner: the mixed
   fixture in `fast`, `frame` and `full`, then the removal.
6. The same contract on three clean hosts with no network, through
   [`appimage-in-container.sh`](../acceptance/drivers/appimage-in-container.sh): AlmaLinux 8,
   whose C library 2.28 is the oldest the executable supports, Ubuntu 22.04 and the current
   Fedora.

Each check writes a receipt. The receipts and the two files are kept as workflow artifacts for
14 days. Steps 4 to 6 are one script, [`judge.sh`](judge.sh), which also runs on any machine with
Python 3 and Docker.

Started by hand with a release tag, a second job judges the files that release already
carries: it downloads the file signed out, checks it against the release's SHA-256 list and runs
`judge.sh` on it.

```sh
gh workflow run appimage.yml -f release_tag=appimage-v0.11.0
```

## Limits and choices to review

- Two architectures, x86_64 and aarch64, and the GNU C library 2.28 or later. No musl build.
- The clean hosts are containers, which have no FUSE: the acceptance there uses the unpack route.
  The FUSE route is only tried on the runner.
- The application name is `qrcode-barcode-scanner`, all lowercase, as a command-line tool.
- The icon is a neutral drawing, not the QR Code AI logo. Replace
  `qrcode-barcode-scanner.png` to use another one.
- The AppStream description is under CC0-1.0, the licence AppStream asks for metadata. The
  program stays under AGPL-3.0-or-later.
- The files are released under their own tag, `appimage-vX.Y.Z`, so that the engine release
  stays as it was published.
- The entry in the [AppImage catalogue](https://appimage.github.io/) is the owner's step: one
  file under `data/` of its repository, holding this repository's address. The catalogue takes
  the AppImage from the newest release of the repository, so a later release without an
  AppImage may make its test fail.

## Publish

1. Start the workflow on `main` and wait for both architectures to pass.
2. Download its two artifacts. Write the SHA-256 list of the two files as
   `qrcode-barcode-scanner-appimage-X.Y.Z-SHA256SUMS`.
3. Create the release `appimage-vX.Y.Z` on the commit that was built, with the three files, not
   marked as the latest release.
4. Start the workflow again with `release_tag=appimage-vX.Y.Z`: the second job judges the public
   files.

## Update for a new version

Change in `build.sh` the version, the commit time (`source.source_date_epoch` of
`build-info.json`), the SHA-256 of the checksum list and of the two executables. Change the
version in the desktop entry, add a `<release>` to the AppStream description, and the version in
the workflow. To move to a newer appimagetool or runtime, change the two addresses in the
workflow and the four SHA-256 in `build.sh` together.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.
