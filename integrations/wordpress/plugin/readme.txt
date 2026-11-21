=== QR Code & Barcode Scanner ===
Tags: qr code, barcode, scanner, qr code reader, barcode reader
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: AGPL-3.0-or-later
License URI: https://www.gnu.org/licenses/agpl-3.0.html

Read QR codes and barcodes from an image or a photo, in the visitor's browser. The image is never uploaded. Open source.

== Description ==

QR Code & Barcode Scanner adds a block and a shortcode that read the QR codes and barcodes in an image. A visitor chooses an image or takes a photo with the phone's camera, and each code it holds is listed with its format and its exact text, with a button to copy it.

The image never leaves the visitor's device. The scanner engine is a WebAssembly module packaged inside this plugin, served by your own site and run in the visitor's browser. The plugin makes no request to any other server, sets no cookie, stores nothing in your database and collects no data.

It reads QR Code, Micro QR Code, rMQR Code, Data Matrix, Aztec, PDF417, MaxiCode, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded and Telepen. Several codes in one image are read together.

= Use it =

* In the block editor, add the **QR Code & Barcode Scanner** block. Its settings choose the first profile, show the full JSON report and show an optional credit line.
* Anywhere a shortcode works, write `[qrcode_barcode_scanner]`. It takes `profile="full"`, `profile="fast"` or `profile="frame"`, `report="yes"` and `credit="yes"`.

Three profiles trade speed for thoroughness: full reads the hardest images, fast suits clear images and frame is the quickest. Visitors can change the profile and read the same image again.

A decoded link is shown as text with an explicit button, and is never opened by itself. Invisible and direction-changing characters in decoded text are shown by their code point.

= Open source =

The plugin and its scanner engine are open source. The source of this plugin, with the script that builds this zip, is at [github.com/qrcode-ai-com/qrcode-barcode-scanner-rust](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/wordpress). The editor script in `build/` is compiled from `src/` with @wordpress/scripts; both are in the plugin.

The WebAssembly module `assets/vendor/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm` is compiled from the engine's Rust source, at tag [v0.11.0](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0), by the script [scripts/build-wasm.sh](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/scripts/build-wasm.sh). The file is copied unchanged from the npm package `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0. Its `build-info.json` records the compiler, the settings and the SHA-256 of the module.

= Server-side scanning =

This plugin reads images in the browser, so it works on any host. To read images on the server instead, in your own PHP code, the engine also has a PHP package on Packagist, `qrcode-ai-com/qrcode-barcode-scanner`. It runs the separately installed `qrscan` command, which most shared hosts do not allow; this plugin does not use it.

= Privacy =

The plugin collects no personal data and sends nothing anywhere. The chosen image is read in the visitor's browser by code served from your site, and is discarded when the page is closed. No cookie, no local storage, no analytics and no request to a third party.

= Licenses =

The plugin as a whole is distributed under the GNU Affero General Public License, version 3 or later (AGPL-3.0-or-later), because it includes the scanner engine 0.11.0, which is published under that license. The plugin's own files are also available under the MIT License (`LICENSE-MIT`). Two parts of the engine derive from rxing and keep their Apache-2.0 notices (`assets/vendor/qrcode-barcode-scanner-wasm/THIRD-PARTY.md`). `LICENSE-NOTES.txt` lists each part.

== Frequently Asked Questions ==

= Which images can it read? =

PNG, JPEG, WebP and GIF. Another file type, such as AVIF, BMP or HEIC, is refused with a message that names the supported types. A photo taken with the camera button of a phone is a JPEG.

= Is the image uploaded to my site or to anyone else? =

No. The browser reads the file and gives its bytes to the scanner on the page. Nothing is sent to your server or to any other server.

= Does it work with a Content Security Policy? =

Yes, if the policy allows WebAssembly: add the `'wasm-unsafe-eval'` source to `script-src`. Without it, the scanner shows a message that WebAssembly is not allowed on this site. WordPress itself sets no such policy.

= Does it slow down my pages? =

The block adds a small script and stylesheet. The scanner engine, about 2 MB, is downloaded only when a visitor reaches for the scanner, once per visit, and runs in a background worker so that a long scan never freezes the page.

= What does it leave behind when I delete it? =

Nothing. It creates no option, no table and no file, so deleting the plugin removes everything it added.

== Screenshots ==

1. The scanner block on a page, after reading an image with a QR code and a Code 128 barcode.
2. The block in the editor, with its three settings.

== Changelog ==

= 0.1.0 =
* First release: the scanner block and the `[qrcode_barcode_scanner]` shortcode, with the scanner engine 0.11.0.

== Upgrade Notice ==

= 0.1.0 =
First release.
