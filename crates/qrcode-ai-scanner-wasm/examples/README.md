# Examples

These pages run from the installed package folder itself: no bundler, framework or download.
The browser loads the package's own files by relative path (`../auto.js`), so a static server
rooted at the package folder runs them, provided it sends `.js` files with a JavaScript type
(see [Serve the package folder](#serve-the-package-folder)).

## Scan an image: `headless.html`

Choose an image with the file picker, or drop it on the page, and a profile (`full`, `fast` or
`frame`). The page decodes the image in a module worker, on your device: the image is never
uploaded. For each code it lists, it shows:

- the exact symbology (`qr_code`, `code128`, ...) and the payload kind (`url`, `text`, ...);
- how many copies of the code the scan located, and the charset of its text. A scan publishes
  at most 16 copies of one code. A count is exact only when the report says that the scan ran
  to its end, reconciled every read and left no copy out. Otherwise every count reads "at least
  N (incomplete)" when the report says some copy counts are incomplete (copies left out, or two
  kept as one, in a code it does not name), or "at least N (not proven complete)";
- the full decoded text, exactly as returned, as plain text. A decoded link is never opened and
  never made clickable. Characters that do not show are listed by code point under the text:
  controls, format characters, separators other than the ordinary space, default-ignorable
  characters (variation selectors, Hangul fillers, tag characters) and the blank Braille
  pattern.

It also names what it runs: the package name and version from `package.json`, the SHA-256 of
the WASM module from `build-info.json`, and the version the loaded module reports.

Each scan runs without a time budget, and the page reads from each report what it proves
(`trace.budget_exhausted` and `trace.saturation`; a flag the report leaves out counts as
unknown, never as false). The outcomes it tells apart:

| Outcome | Meaning |
| --- | --- |
| Codes found | The scan finished and lists every code it read. |
| Codes found, more may be present | The scan reached a capacity, such as more than 16 codes in one image or more reads than it reconciles, or its report does not say: what it left out is unknown, not absent. |
| No code found | The scan finished and found no code this profile can read. A valid result, not an error. |
| No code listed | The list is empty, but the scan reached a capacity, or its report does not say: this does not prove that the image holds no code. |
| Input error | The scanner refused the file: bytes it cannot decode as an image (`QRS-001`), or an image past the default size limits (`QRS-002`, `QRS-003`). |
| Configuration error | The request is wrong, not the image: a malformed request, an option outside its domain (`QRS-006`) or an unknown profile. |
| Loading error | The scanner did not load, so nothing was scanned. The loader's error code and HTTP status are shown; **Load the scanner again** retries in a new worker. |
| Scanner fault | Any other error during a scan, such as a WebAssembly runtime error, a stack overflow or a report the binding could not hand over. Its name and message are shown; reload the page before scanning again. |

Changing the profile scans the chosen image again. The controls are labelled and work with the
keyboard, the result summary is a live region (the list of codes is not announced as a whole),
and the colours follow the system's light or dark setting.

## Serve the package folder

Module scripts and module workers do not run from a `file://` page. Serve the package folder
(the one that holds `package.json`, not `examples/`) with a static server on localhost, and
open `examples/headless.html` under it. For example, from a project that installed the package:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory node_modules/@supernovae-st/qrcode-ai-scanner-wasm
```

then open <http://127.0.0.1:8000/examples/headless.html>.

The server must send `.js` files with a JavaScript type such as `text/javascript`: the browser
runs no module script sent as `text/plain`, and the page then stays on its starting message.
The type of the `.wasm` file does not matter: the loader compiles the bytes it fetches.

The page requests only files of the package folder: `examples/headless.html`,
`examples/headless.js`, `examples/scanner.worker.js`, `auto.js`, `qrcode-ai-scanner.js`,
`qrcode-ai-scanner_bg.wasm`, `package.json` and `build-info.json`. It carries this
Content-Security-Policy:

```text
default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'self'; img-src 'self' blob: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'
```

Scripts, workers and requests come from the page's own origin only; images also from `blob:`
(the preview) and `data:` (the empty icon); styles are inline. The policy governs the page, not
the module worker: a dedicated worker takes its policy from the headers of its own script
response, which a plain static server does not send.

## Reuse the worker: `scanner.worker.js`

The worker owns one scanner and knows nothing about the page that starts it, so another page
(one that scans camera frames, for example) can share it:

```js
const worker = new Worker(new URL('./scanner.worker.js', import.meta.url), { type: 'module' });
```

Every request carries an `id`, and gets exactly one reply with the same `id`:

| Request | Reply when it succeeds |
| --- | --- |
| `{ id, type: 'load' }` | `{ id, type, ok: true, version, variant, runtime, capabilities }` |
| `{ id, type: 'scan_image', bytes, profile, budgetMs }` | `{ id, type, ok: true, report, ms }` |
| `{ id, type: 'scan_frame', rgba, width, height, profile, budgetMs }` | `{ id, type, ok: true, report, ms }` |

In the load reply, `version` is the loaded module's version and `variant` the module the loader
chose (`'portable'`). `runtime` is what this browser supports, `{ wasm, simd, baseline }`, as
`scannerCapabilities()` from `../auto.js` returns it. `capabilities` lists the readers compiled
into the loaded module, `{ versions, engines, symbologies }`, as its `capabilities()` returns it.

`bytes` is an encoded image and `rgba` holds `width * height * 4` bytes, row by row; either can
be an `ArrayBuffer` or a typed array. `profile` is a profile name and `budgetMs` a number of
milliseconds; either can be left out, and a `budgetMs` of `0` runs the scan to its end.
Transfer a large buffer rather than copying it: `worker.postMessage(request, [bytes])` for an
`ArrayBuffer`, `[bytes.buffer]` for a typed array (a typed array is not transferable itself).
The transfer detaches the whole buffer, with every view on it.

A request that fails gets `{ id, type, ok: false, phase, error }`. `phase` is `'load'` when the
scanner could not load (`error.code` names the loader's reason, and `error.status` the HTTP
status when there is one), `'scan'` when the engine refused the call or its input, or stopped
(`error.qrs` holds the `QRS-xxx` code its message carries, or `null`; `error.name` and
`error.message` are the error's own), and `'request'` when the message itself is malformed: an
unknown `type`, missing bytes, or a `profile` or `budgetMs` of the wrong type.

Requests run one at a time, in the order they arrive. A worker loads the scanner once and
shares that attempt with every request, a failed one included: to retry, terminate the worker
and start a new one.
