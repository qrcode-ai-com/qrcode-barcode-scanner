# CodePen listing · QR Code & Barcode Scanner demo (map-40)

The values and steps to create the public Pen of this folder. Nothing here has been sent to
CodePen: the Pen needs the owner's CodePen account, and the owner presses the button. The CodePen
pages below were read on 21 November 2026; read them again before relying on a price or a limit.

## Account, cost and terms

- **Account.** A CodePen account, created at <https://codepen.io/accounts/signup/user/free> with
  an email address the owner controls. A username such as `qrcode-ai-com` keeps the Pen's address
  close to the GitHub organisation; whether it is free is not checked.
- **Cost.** The Free plan, $0 per month. It allows unlimited public Pens, three files per Pen and
  1 MB per text file, which this Pen fits: `index.html`, `style.css` and `script.js`, about 31 KB
  together. Nothing is uploaded to CodePen's asset hosting. A private Pen would need a paid plan
  (<https://codepen.io/pro>, from $8 per month for Starter); this Pen is public, so none is needed.
- **Terms.** The owner accepts CodePen's terms when signing up. Under CodePen's
  [licensing page](https://blog.codepen.io/documentation/licensing/), the code of a public Pen is
  MIT-licensed, which matches this folder's license. The engine the Pen loads is not in the Pen:
  the published package 0.11.0 is loaded from jsDelivr and keeps its own license,
  AGPL-3.0-or-later, which the Pen's footer and description state with a link to its source.

## The values the form fills

[`prefill.html`](prefill.html) holds them; [`build-prefill.py`](build-prefill.py)
writes it from the three files, and the workflow fails when it differs from them.

| Field | Value |
| --- | --- |
| Title | `QR Code & Barcode Scanner: browser image demo` |
| Description | The text below. |
| Visibility | public (`private` false) |
| HTML | `index.html`, byte for byte |
| CSS | `style.css`, byte for byte |
| JS | `script.js`, byte for byte |

```text
Scan QR codes and barcodes in your browser with the open-source QR Code & Barcode Scanner. This Pen loads the published WebAssembly package @qrcode-ai-com/qrcode-barcode-scanner-wasm 0.11.0 from jsDelivr at that exact version, checks the module's SHA-256, then scans a sample image that holds a QR code and a Code 128 barcode in the fast, frame and full profiles. Drop your own image to scan it: it is decoded on your device and never uploaded.

Source of this Pen: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/examples/codepen
The engine 0.11.0 is licensed AGPL-3.0-or-later. Its source: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0
QR Code AI: https://qrcode-ai.com/
```

The prefill API no longer takes tags. If the editor offers tags when saving, add these by hand:

```text
qr-code, barcode, scanner, webassembly, wasm
```

## Create the Pen

1. Sign in to CodePen in the browser.
2. Open `examples/codepen/prefill.html` from a clone of this repository at the merged commit
   (open the file itself, or serve the folder with `python3 -m http.server`).
3. Press **Create the Pen on CodePen**. A new tab opens CodePen's editor with the three files.
   The second button uses the address CodePen documents for the time when its 2.0 editor is the
   only one; use it only if the first one stops working.
4. Check the preview before saving:
   - the table of the sample fills its three rows, `fast`, `frame` and `full`, each with
     `Code 128: STOCK-4827` and `QR Code: https://qrc-ai.com/76xMa`, and **Complete** reads yes;
   - **Package version** and **Engine version** read `0.11.0`, and **WASM SHA-256** reads
     `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68`;
   - **Runs in** reads `a module worker`. If it reads `the page (no worker)`, the scanner still
     works, on the page; note it for the record.
   - choosing a photo of a QR code shows its content under **Result**.
5. Save the Pen as public. Add the tags if the editor offers them.
6. Record the Pen's address, such as `https://codepen.io/<username>/pen/<id>`, for the
   distribution record and for the check below.

## Check the public Pen

Run the destination acceptance contract against the public address, from a clone of this
repository, after `npm ci` in `tests/wasm-browser`. The driver finds the page in the Pen's
preview frame; `--in-frame` asks the judge to require it.

```sh
image=$(python3 scripts/destination-acceptance.py stage /tmp/codepen-input)
cd tests/wasm-browser
node ../../distribution/acceptance/drivers/web-page.mjs "https://codepen.io/<username>/pen/<id>" \
  "$image" /tmp/codepen-reports --wait 300 --channel chrome
cd ../..
python3 scripts/check-demo-page.py /tmp/codepen-reports/page.json --version 0.11.0 \
  --wasm-sha256 a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68 \
  --page-key sdk/javascript --in-frame
```

Then record the three reports with `python3 scripts/destination-acceptance.py reports --kind page`
and the Pen's address, as the workflow does for the served folder, and
`destination-acceptance.py removed --not-applicable`: a Pen installs nothing.

## After the Pen exists

- Add its address to the CodePen row of [`examples/README.md`](../README.md) and to this folder's
  README.
- The Pen does not follow this folder. When the demo moves to another version, paste the new
  three files into the Pen's panels, or create a new Pen from the new `prefill.html`, and run the
  check again.
