# QR Code & Barcode Scanner · container image

This image runs `qrscan` 0.11.0, an offline QR code and barcode scanner. It reads every code in
an image file and prints a JSON report. It has no HTTP service and makes no network call: mount
the image folder read-only and run it with `--network none`.

The image is the unchanged public Linux CLI of release v0.11.0, for Linux AMD64 and ARM64. Pull
it by digest so you always get the same bytes.

```sh
image=ghcr.io/qrcode-ai-com/qrcode-barcode-scanner@sha256:fd0433f29b0dabd469ce6a8fdcfc7bf6554960301b5bc57b5fca97928fd7cb96
docker pull "$image"
docker run --rm --network none --read-only --cap-drop ALL \
  --mount type=bind,src="$PWD",dst=/input,readonly "$image" /input/label.png
```

The tag `0.11.0-r1` that this page lists holds the same two platform images as the tag `0.11.0`:
amd64 `sha256:4dfcdfb66730e191176be72df398e0dadec15ed6dab25227149375fb3931f42c` and arm64
`sha256:8720bf185c698747893fbd67d33bda9f42ffa99ef86af094fbaa7e4a9298a359`. Only its index is new,
to carry the listing details. Nothing was rebuilt.

The report lists each code with its format, its text, its raw bytes and its position. A QR code
also gets a scannability score. The exit status is 0 when a code is found, 1 when none is found
and 2 on an error. It reads QR Code, Micro QR, rMQR, Data Matrix, Aztec, PDF417, MaxiCode, EAN-13,
EAN-8, UPC-A, UPC-E, Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar and Telepen.

You can try the same engine in a browser on the [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner)
and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) pages. The
[QR code Docker guide](https://qrcode-ai.com/en-US/qr-code-scanner/docker) and the
[barcode Docker guide](https://qrcode-ai.com/en-US/barcode-scanner/docker) explain the container
step by step. To make a code to test with, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator)
or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator).

The 0.11.0 program in this image is licensed AGPL-3.0-or-later. Its license texts, third-party
notices and source reference ship inside the image. The recipe and the build record are in
[the engine repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/distribution/docker/v0.11).

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of
**SuperNovae Studio**.
