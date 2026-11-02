# @qrcode-ai-com/qrcode-barcode-scanner

Async native QR decoding + scannability scoring for **artistic / AI-generated
QR codes** — Rust under the hood, libuv pool execution (the event loop never
blocks, even on a 4s artistic scan).

```js
import { scan } from "@qrcode-ai-com/qrcode-barcode-scanner";

const report = await scan(imageBuffer); // profile: full (quality gate)
if (report.detections.length) {
  console.log(report.detections[0].content.text);
  if (report.score) {
    console.log(report.score.value, report.score.grade); // 0-100 + band
    console.log(report.score.uec); // real error-correction margin (ISO 15415)
  } else if (report.trace.budget_exhausted) {
    // not judged within the budget — never a zero: scan again with budgetMs: 0
  }
  console.log(report.hints); // machine-actionable: raise_error_correction…
}
```

- `scan(image, { profile, signal, budgetMs })` — async, `full | fast | frame`.
  An AbortSignal aborted before the call or while the scan is queued rejects
  it with an `AbortError` DOMException; a running scan settles as if not
  aborted (its report, or its own `[QRS-xxx]` fault), and one signal may
  serve several scans. `budgetMs` unset keeps the profile default
  (full 4000 · fast 800 · frame 80 ms); `0` is unbounded, the reproducible mode.
  The clock starts once the image is decoded (`maxDimension` / `maxPixels`
  bound the decode). A report the budget cut says so:
  `trace.budget_exhausted === true`.
- `scanSync(image, { profile })` — blocking, scripts only.
- `capabilities()` — the readers compiled into the addon: `versions`, decode
  `engines` and the `symbologies` they can return (not that an image decodes).
- "No QR found" **resolves** with empty `detections`; rejections other than
  an abort carry `[QRS-xxx]` codes (invalid input only).
- Encoded images (PNG/JPEG/WebP/GIF) only: raw camera frames and the
  camera/overlay modules belong to the wasm package below.
- Each platform's addon is an optional dependency. When the host's addon is
  absent (`--omit=optional`, or a platform without a prebuilt addon),
  `require` throws `Cannot find native binding`, its `cause` naming the
  package it looked for or the unsupported platform: a load failure, with
  no WASI fallback, distinct from `[QRS-xxx]` rejections.
- Full TypeScript contract in `index.d.ts` — the same versioned shape as the
  [core crate](https://crates.io/crates/qrcode-barcode-scanner), CLI, and wasm package.

Browser? Use
[`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm).

Releases up to 0.10.1 were published as `@supernovae-st/qrcode-ai-scanner`.

License: AGPL-3.0-or-later · © SuperNovae Studio · part of
[qrcode-ai.com](https://qrcode-ai.com).
