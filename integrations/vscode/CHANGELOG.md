# Changelog

## 0.1.0

- First version of the extension. The command **Scan QR codes and barcodes** reads PNG, JPEG,
  WebP, GIF and uncompressed BMP files from the Explorer, the editor title or the Command
  Palette, writes each result and the engine report to an output channel, and offers each
  decoded text to copy.
- Settings `qrcodeBarcodeScanner.profile` (`full`, `fast` or `frame`) and
  `qrcodeBarcodeScanner.budgetMs`.
- Bundles the published `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0 module. Scans run
  locally in a worker thread, without network access.
