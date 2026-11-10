# Scan in a notebook

[`scan-images.ipynb`](scan-images.ipynb) is a Jupyter notebook that installs the published Python
package [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/) 0.11.0
and scans a sample image with it. The scanner is a local Rust engine: every image is decoded in
the session that runs the notebook.

[![Launch on Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/qrcode-ai-com/qrcode-barcode-scanner/demos-v0.11.0?urlpath=lab/tree/examples/notebooks/scan-images.ipynb)

The badge opens the notebook on [mybinder.org](https://mybinder.org/), a free public service
with no account. It prepares a session with the package already installed, which can take a few
minutes, and the session ends after about ten minutes of inactivity.

QR Code AI web links · [QR Code AI](https://qrcode-ai.com/) ·
[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) ·
[Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner).

## Run it on your machine

You need Python 3 with its `venv` module.

```sh
git clone https://github.com/qrcode-ai-com/qrcode-barcode-scanner.git
cd qrcode-barcode-scanner
python3 -m venv .venv
.venv/bin/python -m pip install -r binder/requirements.txt
.venv/bin/python -m pip install jupyterlab
.venv/bin/jupyter lab examples/notebooks/scan-images.ipynb
```

The two installs stay separate: the first one checks hashes, and pip then wants a hash for every
package of that command. On Windows the commands are under `.venv\Scripts\`. Choose **Run All**
in the notebook.

## What the notebook does

| Step | Result |
| --- | --- |
| Install | `qrcode-barcode-scanner==0.11.0`. The package has no dependency. |
| Check what is installed | The Python version, the platform and the package version. The SHA-256 of the installed native module must be the one of a wheel published on PyPI. |
| Get the sample | One image with a QR code and a Code 128 barcode, downloaded from the release tag and checked against its SHA-256. |
| Scan | The `fast`, `frame` and `full` profiles each return the QR code `https://qrc-ai.com/76xMa` and the Code 128 `STOCK-4827`. |
| Read a report | The symbology, text, payload kind and measured position of each code. |
| Other outcomes | A white image gives an empty list. Bytes that are not an image raise `ValueError` with `QRS-001`. |
| Your own image | Set a path and run the cell. |

Each cell asserts its own result, so a cell that finishes without an error did what it says.
Every scan runs with `budget_ms=0`, which removes the time budget.

## The session's environment

A notebook host that prepares its session from this repository reads the folder
[`binder/`](../../binder/) at the repository root:

- `requirements.txt` pins the package at an exact version, with the SHA-256 of each wheel
  published on PyPI. pip then refuses any other file.
- `runtime.txt` pins the Python version of the session.

The notebook's install cell then finds the package already installed. On a host that opens the
notebook alone, the install cell installs it.

## Update it for a release

Three places hold the version: the notebook's install cell and its `VERSION`,
`binder/requirements.txt`, and the sample's address. The notebook also lists the SHA-256 of the
native module inside each published wheel: unpack each wheel of the new version and hash its
`.so` or `.pyd` file. `binder/requirements.txt` lists the SHA-256 of each wheel, as PyPI shows it.
Commit the notebook without outputs.

## Checked on every change

The workflow [`demos.yml`](../../.github/workflows/demos.yml) checks that the committed notebook
has no stored output, carries the three links and pins the same version as
`binder/requirements.txt`. It then installs that file in a new environment, runs the notebook
from top to bottom and checks that every cell ran without an error.

## License

AGPL-3.0-or-later, or a separate commercial license, as the rest of this repository. See
[Licensing](../../LICENSING.md).
