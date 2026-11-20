# Privacy

The QR Code & Barcode Scanner plugin reads the image file you give it and returns what its QR codes
and barcodes encode.

- The scan runs inside your Dify plugin runtime, with the open-source engine installed from PyPI.
  The plugin sends the image and its results to no other service.
- The plugin keeps nothing. The image and the report exist only for the call that asked for them.
  Dify itself stores files, workflow runs and logs as your Dify installation is configured.
- The plugin collects no personal data, no usage data and no analytics, and needs no account or key.
- Decoded codes can hold personal data, such as a contact card, a ticket or a payment code. They
  go back to your workflow only; treat them as you treat the image.

Questions: open an issue at https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues.
