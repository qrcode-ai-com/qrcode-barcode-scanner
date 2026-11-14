# Scan in the browser with Vite

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Scan%20in%20the%20browser%20with%20Vite%20%28examples%2Fweb-vite%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20example%20as%20a%20starting%20point%20for%20an%20image-import%20screen%20backed%20by%20a%20browser%20worker.%20It%20consumes%20the%20published%20WebAssembly%20package%2C%20so%20its%20installed-package%20behavior%20can%20be%20evaluated%20independently%20of%20a%20source%20build.%20The%20page%20displays%20scanner%20output%20while%20the%20application%20decides%20what%20to%20do%20with%20decoded%20data%3B%20it%20does%20not%20automatically%20open%20a%20decoded%20address.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fexamples%2Fweb-vite%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20Scan%20in%20the%20browser%20with%20Vite%20%28examples%2Fweb-vite%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20example%20as%20a%20starting%20point%20for%20an%20image-import%20screen%20backed%20by%20a%20browser%20worker.%20It%20consumes%20the%20published%20WebAssembly%20package%2C%20so%20its%20installed-package%20behavior%20can%20be%20evaluated%20independently%20of%20a%20source%20build.%20The%20page%20displays%20scanner%20output%20while%20the%20application%20decides%20what%20to%20do%20with%20decoded%20data%3B%20it%20does%20not%20automatically%20open%20a%20decoded%20address.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fexamples%2Fweb-vite%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20Scan%20in%20the%20browser%20with%20Vite%20%28examples%2Fweb-vite%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20example%20as%20a%20starting%20point%20for%20an%20image-import%20screen%20backed%20by%20a%20browser%20worker.%20It%20consumes%20the%20published%20WebAssembly%20package%2C%20so%20its%20installed-package%20behavior%20can%20be%20evaluated%20independently%20of%20a%20source%20build.%20The%20page%20displays%20scanner%20output%20while%20the%20application%20decides%20what%20to%20do%20with%20decoded%20data%3B%20it%20does%20not%20automatically%20open%20a%20decoded%20address.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fexamples%2Fweb-vite%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Scan%20in%20the%20browser%20with%20Vite%20%28examples%2Fweb-vite%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20example%20as%20a%20starting%20point%20for%20an%20image-import%20screen%20backed%20by%20a%20browser%20worker.%20It%20consumes%20the%20published%20WebAssembly%20package%2C%20so%20its%20installed-package%20behavior%20can%20be%20evaluated%20independently%20of%20a%20source%20build.%20The%20page%20displays%20scanner%20output%20while%20the%20application%20decides%20what%20to%20do%20with%20decoded%20data%3B%20it%20does%20not%20automatically%20open%20a%20decoded%20address.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fexamples%2Fweb-vite%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand Scan in the browser with Vite (examples/web-vite/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use this example as a starting point for an image-import screen backed by a browser worker. It consumes the published WebAssembly package, so its installed-package behavior can be evaluated independently of a source build. The page displays scanner output while the application decides what to do with decoded data; it does not automatically open a decoded address. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/examples/web-vite/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/javascript https://qrcode-ai.com/en-US/barcode-scanner/sdk/javascript https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use this example as a starting point for an image-import screen backed by a browser worker. It consumes the published WebAssembly package, so its installed-package behavior can be evaluated independently of a source build. The page displays scanner output while the application decides what to do with decoded data; it does not automatically open a decoded address.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner JavaScript guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/javascript) and [barcode scanner JavaScript guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/javascript) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a saved label to select in the Vite page, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

A small web page that scans QR codes and barcodes from an image, in the browser. It installs the
published WebAssembly package
[`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm/v/0.11.0)
0.11.0 from npm and runs it in a worker. The image stays on your device.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/fork/github/qrcode-ai-com/qrcode-barcode-scanner/tree/demos-v0.11.0-r2/examples/web-vite)

The button opens this folder in StackBlitz, which installs it and runs it in your browser. You
need no account. The folder stands alone: it depends on nothing else in this repository.

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

Under its introduction the page shows the six QR Code AI links above, one line per pair.

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

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.
