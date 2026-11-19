<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-php-dark.gif?v=7e4f537dc2bc">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-php-light.gif?v=6a86ec5cd714" alt="QR Code &amp; Barcode Scanner for PHP: the PHP logo, the quick start in PHP, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner for PHP

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20PHP%20%28bindings%2Fphp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20command%20adapter%20when%20a%20PHP%20application%20can%20invoke%20a%20separately%20installed%20qrscan%20executable.%20It%20keeps%20the%20scanner%20out%20of%20the%20PHP%20process%20and%20returns%20the%20original%20report%2C%20leaving%20storage%20and%20business%20decisions%20to%20your%20application.%20The%20public%20source%20and%20tag%20do%20not%20by%20themselves%20establish%20Packagist%20availability%3B%20verify%20the%20registry%20before%20relying%20on%20the%20Composer%20command%20below.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fphp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fphp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fphp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20PHP%20%28bindings%2Fphp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20command%20adapter%20when%20a%20PHP%20application%20can%20invoke%20a%20separately%20installed%20qrscan%20executable.%20It%20keeps%20the%20scanner%20out%20of%20the%20PHP%20process%20and%20returns%20the%20original%20report%2C%20leaving%20storage%20and%20business%20decisions%20to%20your%20application.%20The%20public%20source%20and%20tag%20do%20not%20by%20themselves%20establish%20Packagist%20availability%3B%20verify%20the%20registry%20before%20relying%20on%20the%20Composer%20command%20below.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fphp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fphp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fphp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20PHP%20%28bindings%2Fphp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20command%20adapter%20when%20a%20PHP%20application%20can%20invoke%20a%20separately%20installed%20qrscan%20executable.%20It%20keeps%20the%20scanner%20out%20of%20the%20PHP%20process%20and%20returns%20the%20original%20report%2C%20leaving%20storage%20and%20business%20decisions%20to%20your%20application.%20The%20public%20source%20and%20tag%20do%20not%20by%20themselves%20establish%20Packagist%20availability%3B%20verify%20the%20registry%20before%20relying%20on%20the%20Composer%20command%20below.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fphp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fphp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fphp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20PHP%20%28bindings%2Fphp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20command%20adapter%20when%20a%20PHP%20application%20can%20invoke%20a%20separately%20installed%20qrscan%20executable.%20It%20keeps%20the%20scanner%20out%20of%20the%20PHP%20process%20and%20returns%20the%20original%20report%2C%20leaving%20storage%20and%20business%20decisions%20to%20your%20application.%20The%20public%20source%20and%20tag%20do%20not%20by%20themselves%20establish%20Packagist%20availability%3B%20verify%20the%20registry%20before%20relying%20on%20the%20Composer%20command%20below.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fbindings%2Fphp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fphp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fphp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for PHP (bindings/php/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use this command adapter when a PHP application can invoke a separately installed qrscan executable. It keeps the scanner out of the PHP process and returns the original report, leaving storage and business decisions to your application. The public source and tag do not by themselves establish Packagist availability; verify the registry before relying on the Composer command below. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/bindings/php/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/php https://qrcode-ai.com/en-US/barcode-scanner/sdk/php https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use this command adapter when a PHP application can invoke a separately installed qrscan executable. It keeps the scanner out of the PHP process and returns the original report, leaving storage and business decisions to your application. The public source and tag do not by themselves establish Packagist availability; verify the registry before relying on the Composer command below.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner PHP guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/php) and [barcode scanner PHP guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/php) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a label for a PHP upload or batch workflow, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

Read QR codes and barcodes from an image file in PHP. This package drives the installed
`qrscan` command of the
[QR Code & Barcode Scanner engine](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust)
and returns its JSON report unchanged. It holds no decoder of its own.

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-php-dark.gif?v=234fd1597b44">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-php-light.gif?v=0d3bfe6c2af0" alt="How the PHP package works, in three steps: your code passes an image file, the installed qrscan command reads its codes, and your code reads the report" width="100%">
    </picture>
  </a>
</p>

## Install

```sh
composer require qrcode-ai-com/qrcode-barcode-scanner:^0.11
```

The package follows the engine it drives: version 0.11.x of the package works with `qrscan`
0.11.x. The first version is 0.11.0.

## What you need

- PHP 8.2 or later, with `proc_open` enabled. Some shared hosts disable it: the package then
  throws `ProcessUnavailable`.
- The `qrscan` command, version 0.11.x, installed separately. The
  [distribution guide](../../distribution/README.md) lists the routes: Homebrew, Scoop, the
  Debian and RPM packages, the AUR, `cargo install`, the release archives and the container
  image. This package never downloads it.

Install `qrscan` from the channel your system already uses:

| Channel | Install | Systems |
|---|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-homebrew-dark.png?v=d408ba800294"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-homebrew-light.png?v=bf1ed0794d75" alt="" width="24" height="24" align="absmiddle"></picture> [Homebrew](https://github.com/qrcode-ai-com/homebrew-tap) | `brew install qrcode-ai-com/tap/qrscan` | macOS and GNU/Linux |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-scoop-dark.png?v=acab24ad6857"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-scoop-light.png?v=53f0fc5cfb45" alt="" width="24" height="24" align="absmiddle"></picture> [Scoop](https://github.com/qrcode-ai-com/scoop-bucket) | `scoop bucket add qrcode-ai https://github.com/qrcode-ai-com/scoop-bucket`<br>`scoop install qrcode-ai/qrcode-barcode-scanner` | Windows x64 |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-dark.png?v=31b5deebc32e"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-light.png?v=c5207721973f" alt="" width="24" height="24" align="absmiddle"></picture> [Cargo](https://crates.io/crates/qrcode-barcode-scanner-cli) | `cargo install qrcode-barcode-scanner-cli --locked` | Any Rust toolchain |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-github-dark.png?v=1beef6411e01"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-github-light.png?v=84629428944a" alt="" width="24" height="24" align="absmiddle"></picture> [Releases](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases) | [Download and verify an archive](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/cli/README.md#download-and-verify) | macOS, GNU/Linux, Windows |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-debian-dark.png?v=fe0bc2eb1292"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-debian-light.png?v=b0dbf95cf37d" alt="" width="24" height="24" align="absmiddle"></picture> Debian | [Install the `.deb` package](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/README.md#cli-and-containers) | Debian 12, Ubuntu 24.04 |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-archlinux-dark.png?v=a5c779b6e553"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-archlinux-light.png?v=321428bf3921" alt="" width="24" height="24" align="absmiddle"></picture> [AUR](https://aur.archlinux.org/packages/qrcode-barcode-scanner-bin) | [Arch install guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/aur/README.md) | Arch Linux x86_64 |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-fedora-dark.png?v=cf9efdf2c0c6"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-fedora-light.png?v=6376f4214086" alt="" width="24" height="24" align="absmiddle"></picture> Fedora | [Install the RPM package](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/README.md#cli-and-containers) | Fedora 44 |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-appimage-dark.png?v=b2fb5a4f1434"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-appimage-light.png?v=f8bcfd877cc8" alt="" width="24" height="24" align="absmiddle"></picture> AppImage | [Run the AppImage](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/README.md#cli-and-containers), one file with nothing to install | GNU/Linux |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-docker-dark.png?v=111f4320e3a8"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-docker-light.png?v=0e33dac05ba7" alt="" width="24" height="24" align="absmiddle"></picture> Container image | [`ghcr.io/qrcode-ai-com/qrcode-barcode-scanner`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/pkgs/container/qrcode-barcode-scanner), run as the [container guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/README.md#cli-and-containers) shows | Linux AMD64 and ARM64 |

## Scan an image

```php
use QrcodeAi\BarcodeScanner\Profile;
use QrcodeAi\BarcodeScanner\Scanner;

$scanner = new Scanner();                    // `qrscan` on PATH; or new Scanner('/path/to/qrscan')
$report = $scanner->scan('label.png', Profile::Fast);

foreach ($report->detections() as $detection) {
    echo $detection['symbology'], ': ', $detection['content']['text'], "\n";
}
```

`scan()` takes the file, a profile and an optional time budget in milliseconds:

| Profile | What the engine does |
| --- | --- |
| `Profile::Frame` | Decodes only. The report carries no score. |
| `Profile::Fast` | Decodes first, with a reduced judgment. |
| `Profile::Full` | Decodes and judges how well a QR code scans. The default. |

A budget of `0` is unbounded: the result then does not depend on how busy the machine is.
Without a budget the profile's own applies, and a busy machine can cut the scan short.

## Read the report

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both come
back in the same report, each with its format and the place where the engine measured it.

`$report->data` is the engine's report as a PHP array, and `$report->json` is the exact text the
engine printed. Nothing is renamed, rounded or recalculated. Keep `json` when you store the
report: a PHP array cannot tell an empty object from an empty list.

| Method | Meaning |
| --- | --- |
| `found()` | At least one code was decoded. |
| `detections()` | One entry per distinct content, with `symbology`, `content`, `payload` and its measured places. |
| `texts()` | The decoded text of each detection. |
| `rawPayloads()` | The exact bytes of each detection, for content that is not text. |
| `score()` | The scannability judgment, or `null`. |
| `isComplete()` | `false` when the time budget cut the scan. |
| `engineVersion()` | The engine that wrote the report, such as `0.11.0`. |

Three things are easy to get wrong:

- **No code is a result, not an error.** `found()` is `false` and no exception is thrown.
- **A missing score is not zero.** `score()` is `null` with `Profile::Frame`, or when the
  budget ran out before the judgment.
- **An incomplete scan proves nothing.** When `isComplete()` is `false`, an empty report does
  not mean the image holds no code. Scan again with a larger budget or with `0`.

Decoded text is untrusted data: a QR code can hold any text. Do not follow its links or run it.

## What it reads

The package returns the report of the `qrscan` command you installed, so it reads what that engine reads.
Codes of different formats in the same image come back in one report.

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>

| Family | Formats |
|---|---|
| QR | QR Code, Micro QR, rectangular Micro QR (rMQR) |
| Matrix and stacked | Data Matrix, Aztec, PDF417, MaxiCode |
| Retail | EAN-13, EAN-8, UPC-A, UPC-E |
| Other linear | Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen |

The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## When something fails

Every failure is a `QrcodeAi\BarcodeScanner\Exception\ScannerException`:

| Exception | When |
| --- | --- |
| `BinaryNotFound` | `qrscan` could not be started: not installed, not on `PATH`, not executable. |
| `UnsupportedVersion` | The installed `qrscan` is not 0.11.x. The check runs before the first scan. |
| `ScanFailed` | The engine refused the file or the options. `engineCode` holds its code when it gives one, such as `QRS-001` for a file that is not an image. |
| `ScanTimedOut` | `qrscan` did not end within the timeout, 60 seconds by default, and was stopped. |
| `ProcessUnavailable` | This PHP cannot start a process. |

## What it does and does not do

- One scan starts one process. That suits a request or a job. It is the wrong tool for
  thousands of images in a tight loop.
- It reads image files: PNG, JPEG, WebP and GIF. To scan bytes you hold in memory, write them
  to a temporary file first.
- The command is started from a list of arguments, with no shell. A file name is never
  interpreted, whatever it holds: spaces, quotes, a leading dash or shell characters.
- It writes nothing, fetches nothing and never opens what a code points to.

## Develop

The tests run against a real `qrscan`, not a stand-in:

```sh
composer install
QRSCAN_BINARY=/path/to/qrscan QRSCAN_FIXTURES=/path/to/engine/fixtures vendor/bin/phpunit
```

They cover the three profiles on an image that holds a QR code and a Code 128, an image with no
code, files that are not images, awkward file names, a missing command, an engine of another
version and a command that hangs. The workflow `PHP adapter` of the engine repository runs them
on Linux, macOS and Windows against the released command.

## The same engine in other runtimes

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>

| Runtime | Package | How it scans |
|---|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-dark.png?v=31b5deebc32e"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-light.png?v=c5207721973f" alt="" width="24" height="24" align="absmiddle"></picture> Rust | [`qrcode-barcode-scanner`](https://crates.io/crates/qrcode-barcode-scanner) on crates.io | In process |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-nodejs-dark.png?v=cf2159524fc6"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-nodejs-light.png?v=6dd098480218" alt="" width="24" height="24" align="absmiddle"></picture> Node.js | [`@qrcode-ai-com/qrcode-barcode-scanner`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner) on npm | In process, native |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-browser-dark.png?v=bbe2f3560a6d"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-browser-light.png?v=591e304cf9e9" alt="" width="24" height="24" align="absmiddle"></picture> Browser | [`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm) on npm | In the page, WebAssembly |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-python-dark.png?v=7469c3e0b4fb"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-python-light.png?v=308121255ab7" alt="" width="24" height="24" align="absmiddle"></picture> Python | [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/) on PyPI | In process |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-go-dark.png?v=b6dbac901176"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-go-light.png?v=1983a9eb7344" alt="" width="24" height="24" align="absmiddle"></picture> Go | [`qrcode-barcode-scanner-go`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-go) | Through the installed `qrscan` |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-php-dark.png?v=3800932934c8"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-php-light.png?v=7bdd6884b3a4" alt="" width="24" height="24" align="absmiddle"></picture> PHP | [`qrcode-barcode-scanner-php`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-php) | Through the installed `qrscan` |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-terminal-dark.png?v=1e987f0ab278"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-terminal-light.png?v=2262d66bee6b" alt="" width="24" height="24" align="absmiddle"></picture> Command line | [`qrscan`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line) | One command, one JSON report |

The Rust, Node.js, browser and Python packages hold the engine. The Go and PHP packages hold no decoder:
each one starts `qrscan` and hands you its report.

<sub>Language and platform names and logos belong to their owners. They identify a runtime or a destination and imply no endorsement.</sub>

## Its own repository

Packagist reads `composer.json` at the root of a repository, and Composer downloads that whole
repository. The package is therefore served from a small repository of its own,
`qrcode-ai-com/qrcode-barcode-scanner-php`. Nothing there is edited by hand:
[`scripts/stage-php-package.py`](../../scripts/stage-php-package.py) writes its whole tree from
one commit of the engine repository, with the workflow of [`mirror/`](mirror/), the two test
images, the licence and a `SOURCE.json` that names the commit and the sha256 of every file. The
same program checks that a tree is exactly that. Change the package here, then stage it again.

## Licence

Project-authored adapter source is MIT; see [LICENSE](../../LICENSE). The separately
installed engine retains the license of its exact installed version.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
