## What does QR Code & Barcode Scanner do?

QR Code & Barcode Scanner reads every QR code and barcode in a batch of images. Give it image URLs, upload image files, or both: each image becomes one dataset item with its decoded texts, each code's format, and the engine's full JSON report. An image that cannot be fetched or read becomes an item with its error, and the run goes on.

The scan runs inside the Actor's container with the open-source [QR Code & Barcode Scanner](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust) engine. The images are sent to no other service and are not stored: only the dataset items are kept.

## What can it read?

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

Several codes of different formats in one image come back together, from PNG, JPEG, WebP and GIF files.

## How to scan images

1. Open the Actor and add your images: paste addresses under **Image URLs**, or upload files under **Image files**.
2. Choose a **Scan profile**. Fast, the default, suits uploads and gives a reduced quality score. Frame suits camera frames and gives no score. Full searches deepest, which artistic QR codes need, and gives the full score.
3. Start the run. When it ends, open the dataset: the **Overview** table shows each image, its texts and its error, and the JSON export holds the full reports.

To try it with a code you know, make one on [QR Code AI](https://qrcode-ai.com/), save the picture, upload it and compare the decoded text with what you encoded.

## Input

```json
{
  "imageUrls": ["https://example.com/labels/shelf-12.png"],
  "profile": "fast",
  "budgetMs": 0
}
```

- `imageUrls`: public http or https addresses of images, up to 8 MiB each.
- `imageFiles`: files uploaded in the input form. Each one is kept in a key-value store of your account, which the Actor reads with the run's own access, so a private store works.
- `profile`: `fast`, `frame` or `full`.
- `budgetMs`: a time limit per image, from 0 to 60,000 milliseconds. 0, the default, means no limit.

## Output

One dataset item per image, in input order:

```json
{
  "source": "https://example.com/labels/shelf-12.png",
  "input": "imageUrls",
  "ok": true,
  "count": 2,
  "texts": ["https://example.com/p/4827", "STOCK-4827"],
  "codes": [
    {"symbology": "qr_code", "text": "https://example.com/p/4827"},
    {"symbology": "code128", "text": "STOCK-4827"}
  ],
  "complete": true,
  "error": null,
  "report": {"detections": ["..."], "score": {"value": 100, "grade": "excellent"}, "trace": {"budget_exhausted": false}}
}
```

`complete` is false when the time budget cut the scan or the image was not read. `report` is the engine's full report: each code's exact bytes, its position in the image, and for a QR code a quality score from 0 to 100 with its grade.

## How much does it cost?

The Actor itself is free: you pay only for the Apify platform usage of your runs. Images are read one after the other, with 512 MB of memory by default.

## Limits

- Up to 8 MiB per image, refused before the whole file is downloaded. A download has 30 seconds and follows at most five redirects.
- Up to 4,096 pixels per side and 16 million pixels per image. A larger image becomes an item with the engine's `QRS-` error code.
- The Actor never opens what a code points to.

## FAQ

### Is an empty `texts` list an error?

No. With `ok: true` and no code, the engine read the image and found no code it could decode. A file that is not an image gives `ok: false` with an error instead.

### Can it read codes in a PDF?

No. Convert each page to a PNG or JPEG image first.

### Where is the source?

The Actor and the engine are open source, in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust), where issues and questions are welcome. The Actor's own files are MIT. The image it runs holds the engine 0.11.0, under AGPL-3.0-or-later. You can also scan in a browser with the [online demo](https://qrcode-ai-com.github.io/qrcode-barcode-scanner-rust/).

Maintained for [QR Code AI](https://qrcode-ai.com/).
