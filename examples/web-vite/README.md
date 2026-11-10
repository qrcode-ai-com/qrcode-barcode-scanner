# Scan in the browser with Vite

A small web page that scans QR codes and barcodes from an image, in the browser. It installs the
published WebAssembly package
[`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm/v/0.11.0)
0.11.0 from npm and runs it in a worker. The image stays on your device.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/fork/github/qrcode-ai-com/qrcode-barcode-scanner/tree/demos-v0.11.0/examples/web-vite)

The button opens this folder in StackBlitz, which installs it and runs it in your browser. You
need no account. Each visit makes a copy of the project on StackBlitz.

QR Code AI web links · [QR Code AI](https://qrcode-ai.com/) ·
[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) ·
[Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner).

## Run it on your machine

You need Node.js 20.19 or later, or 22.12 or later.

```sh
git clone https://github.com/qrcode-ai-com/qrcode-barcode-scanner.git
cd qrcode-barcode-scanner/examples/web-vite
npm ci
npm run dev
```

Open the address Vite prints. `npm run build` writes the static page to `dist/`, and
`npm run preview` serves that folder.

## What the page shows

Three sample inputs, each with a different outcome, and your own images:

| Input | Outcome |
| --- | --- |
| QR code and Code 128 sample | Two codes: the QR code `https://qrc-ai.com/76xMa` and the Code 128 `STOCK-4827`. |
| Image without a code | No code found. A valid result, not an error. |
| A file that is not an image | An input error, `QRS-001`: the scanner refuses bytes it cannot decode as an image. |

For each code the page lists its symbology, the kind of payload and the decoded text. A decoded
link is shown as text and never opened. The `full` profile also scores how well the first code
scans. **Full report (JSON)** shows the complete report the scanner returned.

Every scan runs to its end, without a time budget (`budget_ms` 0). The page reads from the report
whether the list is complete: only a scan that finished and reached no capacity proves that an
image holds no code.

## How it works

| File | Role |
| --- | --- |
| `src/scanner.worker.js` | A module worker. It loads the scanner once with `createScannerLoader()` from the package's `/auto` entry and calls `scan_image`. |
| `src/main.js` | The page script. It sends the bytes of the chosen image to the worker and writes the reply as text. |
| `vite.config.js` | Two settings the package needs under Vite, explained below. |
| `public/samples/mixed-code128-qr.png` | The sample image. It is a copy of `fixtures/symbology/mixed-code128-qr.png`. |

The two Vite settings:

- `optimizeDeps.exclude` names the package. Its modules find the `.wasm` file next to themselves,
  through `import.meta.url`. The dev server would otherwise pre-bundle a copy that is not next to
  that file.
- `worker.format: 'es'` builds the worker as a module, which the `/auto` loader needs.

The package and Vite are pinned to exact versions, and `package-lock.json` is committed, so every
install gets the same files.

## Checked on every change

The workflow [`demos.yml`](../../.github/workflows/demos.yml) installs this folder from its
lockfile, builds it, serves it and scans the sample through the page with the `fast`, `frame` and
`full` profiles. The [destination acceptance contract](../../distribution/acceptance/README.md)
judges the three reports.

## License

AGPL-3.0-or-later, or a separate commercial license, as the rest of this repository. See
[Licensing](../../LICENSING.md).
