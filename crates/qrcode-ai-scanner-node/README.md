# QR Code & Barcode Scanner for Node.js

Decode **QR codes, linear barcodes and other 2D formats, including Data Matrix**,
from local images. Native Rust bindings return decoded content, measured symbol
geometry and QR scannability diagnostics in a structured report.

`scan()` runs the Rust scan on libuv workers. `scanSync()` runs it on the calling
thread. Node.js 18 or later is required.

[Node.js API](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/node.mdx) ·
[Report contract](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/spec/01-report.md) ·
[TypeScript declarations](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/crates/qrcode-ai-scanner-node/index.d.ts)

The scanner grew out of QR verification workflows at [QR Code AI](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/nodejs).
Use the Node package for images already in your server or worker.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Node.js guide** | [QR code scanner for Node.js](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/nodejs) | [Barcode scanner for Node.js](https://qrcode-ai.com/en-US/barcode-scanner/sdk/nodejs) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

## Scan an image

```js
import { readFile } from "node:fs/promises";
import { scan } from "@qrcode-ai-com/qrcode-barcode-scanner";

const report = await scan(await readFile("label.png"), { profile: "full" });

for (const detection of report.detections) {
  console.log(detection.symbology, detection.content.text);
  console.log("Physical occurrences:", detection.occurrences.length);
}

if (report.score !== null) {
  console.log(report.score.value, report.score.grade);
} else if (report.trace.budget_exhausted) {
  console.log("Quality assessment did not finish within the scan budget.");
}
```

Multiple physical copies of the same content share one detection with several
`occurrences`. Different contents stay separate. Use the measured geometry that
is present, including endpoints for linear barcodes. QR metadata and
correction-margin diagnostics belong to the QR family only.

A missing score is not zero. QR quality diagnostics are software measurements,
not hardware-verifier certification. The addon processes images locally;
decoding a URL does not visit its destination.

## API at a glance

| API | Behavior |
|---|---|
| `scan(image, options)` | Asynchronous Rust scan; accepts a `Buffer` or `Uint8Array`. |
| `scanSync(image, options)` | Synchronous scan on the calling thread. |
| `capabilities()` | Compiled reader versions, engines and symbologies; not proof that an image decodes. |

The addon accepts encoded PNG, JPEG, WebP and GIF images. Raw camera frames,
capture, tracking and overlays belong to the
[browser WASM package](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm).

When no code is detected, the promise resolves with an empty `detections` array.
Scan faults other than an abort carry `QRS-xxx` codes, including invalid input and invalid options.

<details>
<summary>Scan options, cancellation and exact payloads</summary>

- `profile`: `full`, `fast` or `frame`. The default is `full`.
- `budgetMs`: unset keeps the profile default, respectively 4000, 800 or 80 ms.
  `0` removes the scan budget. The clock starts once the image is decoded;
  a budget cut sets `trace.budget_exhausted === true`. An empty result after
  that cut is not a completed search, and a null score is not zero.
- `maxDimension` and `maxPixels`: cap input dimensions before decoding pixel
  work. Defaults are 10000 px per side and 64 million pixels. Lower these for
  untrusted uploads; invalid values reject with `[QRS-006]` before reading
  the image.
- `signal`: an `AbortSignal` already aborted at the call, or aborted while the
  task is queued, rejects with an `AbortError` DOMException. A running scan is
  not interrupted; it settles with its report or its own `[QRS-xxx]` fault.
  One signal can serve several scans. `scanSync()` takes the same scan options
  except `signal`.

The shipped TypeScript declarations describe the remaining scoring and
transparency options. Keep `content.raw` when exact payload bytes matter:
QR-family raw bytes are the original payload; other symbologies carry the
reader's reading. `content.charset === "unknown"` is the only lossy text
reading. Content identity uses symbology, raw bytes, FNC1 and compatible ECI
declarations, never display text alone.

</details>

<details>
<summary>Native addon loading</summary>

The main package selects one of six platform addons through optional
dependencies. With `--omit=optional`, a missing addon, or an unsupported
platform, `require` throws `Cannot find native binding`. Its `cause` names the
package it looked for or the unsupported platform. This load failure is
separate from a `[QRS-xxx]` scan fault. There is no WASI fallback.

</details>

## Documentation and licensing

[Scoring](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/SCORING.md) ·
[Error codes](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/docs/api/errors.mdx) ·
[Security](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/SECURITY.md) ·
[Source](https://github.com/qrcode-ai-com/qrcode-barcode-scanner) ·
[Report a bug](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues)

Releases up to 0.10.1 were published as `@supernovae-st/qrcode-ai-scanner`.

License: [AGPL-3.0-or-later](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSE).
Commercial licensing is described in the
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/LICENSING.md).
© SuperNovae Studio.
