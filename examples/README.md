# Examples

Small projects you can run as they are. Each one installs a published package of the QR Code &
Barcode Scanner, at an exact version, and scans a sample image.

| Example | What it shows | Run it online |
| --- | --- | --- |
| [`web-vite`](web-vite/) | Scan images in the browser: a Vite page that runs the WebAssembly package in a worker. | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/fork/github/qrcode-ai-com/qrcode-barcode-scanner/tree/demos-v0.11.0/examples/web-vite) |
| [`notebooks`](notebooks/) | Scan images in Python: a Jupyter notebook that installs the PyPI package and checks each result. | [![Launch on Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/qrcode-ai-com/qrcode-barcode-scanner/demos-v0.11.0?urlpath=lab/tree/examples/notebooks/scan-images.ipynb) |

The online links open the tag `demos-v0.11.0`, so they keep running the same files while `main`
changes. You need no account on either host.

Other examples live with the package they belong to:

- [Browser pages without a bundler](../crates/qrcode-ai-scanner-wasm/examples/README.md): scan an
  image or the camera from the installed package folder.
- [Command line](../README.md#command-line): scan a file with `qrscan`.

QR Code AI web links · [QR Code AI](https://qrcode-ai.com/) ·
[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) ·
[Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner).

## Update the examples for a release

1. Change the pinned version in each example, with its lockfile or hashes. Each example's README
   lists the places.
2. Merge, then cut the tag `demos-vX.Y.Z` on that commit.
3. Open each online link once before publishing it. The first time StackBlitz opens a revision
   it clones this whole repository, which took more than four minutes on 10 November 2026; later
   visits started in about half a minute. Binder builds one image per revision on each of its
   hosts, so the first visitor on a host waits for that build.
4. Judge both from the tag with the
   [destination acceptance contract](../distribution/acceptance/README.md): the web page program
   for StackBlitz, the notebook session program for Binder.
5. Point the buttons of this file, of each example's README and of the main README at the new
   tag.
