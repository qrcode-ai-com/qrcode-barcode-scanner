# QR Code & Barcode Scanner for PHP

Read QR codes and barcodes from an image file in PHP. This package drives the installed
`qrscan` command of the
[QR Code & Barcode Scanner engine](https://github.com/qrcode-ai-com/qrcode-barcode-scanner)
and returns its JSON report unchanged. It holds no decoder of its own.

> **Not published yet.** This is the first version of the PHP route, checked in the engine
> repository against the released `qrscan` 0.11.0. It is not on Packagist: `composer require`
> does not find it today.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **PHP guide** | [QR code scanner for PHP](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/php) | [Barcode scanner for PHP](https://qrcode-ai.com/en-US/barcode-scanner/sdk/php) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

## What you need

- PHP 8.2 or later, with `proc_open` enabled. Some shared hosts disable it: the package then
  throws `ProcessUnavailable`.
- The `qrscan` command, version 0.11.x, installed separately. The
  [distribution guide](../../distribution/README.md) lists the routes: Homebrew, Scoop, the
  Debian and RPM packages, the AUR, `cargo install`, the release archives and the container
  image. This package never downloads it.

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

## Licence

AGPL-3.0-or-later, like the engine it drives. See [LICENSE](../../LICENSE).
