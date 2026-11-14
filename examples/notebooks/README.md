# Scan in a notebook

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Scan%20in%20a%20notebook%20%28examples%2Fnotebooks%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20notebook%20to%20inspect%20scanner%20output%20in%20Python%20without%20building%20the%20engine%20from%20source.%20The%20package%20is%20installed%20into%20the%20session%20that%20executes%20the%20cells%2C%20so%20a%20hosted%20session%20processes%20images%20on%20that%20host%20rather%20than%20on%20your%20laptop.%20Keep%20the%20installed%20version%20and%20exact%20expected%20payloads%20visible%20when%20sharing%20results%3B%20Binder%20and%20Colab%20access%20are%20separate%20host-specific%20routes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fexamples%2Fnotebooks%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20Scan%20in%20a%20notebook%20%28examples%2Fnotebooks%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20notebook%20to%20inspect%20scanner%20output%20in%20Python%20without%20building%20the%20engine%20from%20source.%20The%20package%20is%20installed%20into%20the%20session%20that%20executes%20the%20cells%2C%20so%20a%20hosted%20session%20processes%20images%20on%20that%20host%20rather%20than%20on%20your%20laptop.%20Keep%20the%20installed%20version%20and%20exact%20expected%20payloads%20visible%20when%20sharing%20results%3B%20Binder%20and%20Colab%20access%20are%20separate%20host-specific%20routes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fexamples%2Fnotebooks%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20Scan%20in%20a%20notebook%20%28examples%2Fnotebooks%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20notebook%20to%20inspect%20scanner%20output%20in%20Python%20without%20building%20the%20engine%20from%20source.%20The%20package%20is%20installed%20into%20the%20session%20that%20executes%20the%20cells%2C%20so%20a%20hosted%20session%20processes%20images%20on%20that%20host%20rather%20than%20on%20your%20laptop.%20Keep%20the%20installed%20version%20and%20exact%20expected%20payloads%20visible%20when%20sharing%20results%3B%20Binder%20and%20Colab%20access%20are%20separate%20host-specific%20routes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fexamples%2Fnotebooks%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Scan%20in%20a%20notebook%20%28examples%2Fnotebooks%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Use%20this%20notebook%20to%20inspect%20scanner%20output%20in%20Python%20without%20building%20the%20engine%20from%20source.%20The%20package%20is%20installed%20into%20the%20session%20that%20executes%20the%20cells%2C%20so%20a%20hosted%20session%20processes%20images%20on%20that%20host%20rather%20than%20on%20your%20laptop.%20Keep%20the%20installed%20version%20and%20exact%20expected%20payloads%20visible%20when%20sharing%20results%3B%20Binder%20and%20Colab%20access%20are%20separate%20host-specific%20routes.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fexamples%2Fnotebooks%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand Scan in a notebook (examples/notebooks/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Use this notebook to inspect scanner output in Python without building the engine from source. The package is installed into the session that executes the cells, so a hosted session processes images on that host rather than on your laptop. Keep the installed version and exact expected payloads visible when sharing results; Binder and Colab access are separate host-specific routes. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/examples/notebooks/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/python https://qrcode-ai.com/en-US/barcode-scanner/sdk/python https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Use this notebook to inspect scanner output in Python without building the engine from source. The package is installed into the session that executes the cells, so a hosted session processes images on that host rather than on your laptop. Keep the installed version and exact expected payloads visible when sharing results; Binder and Colab access are separate host-specific routes.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner Python guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/python) and [barcode scanner Python guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/python) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a notebook input with an expected text value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

[`scan-images.ipynb`](scan-images.ipynb) is a Jupyter notebook that installs the published Python
package [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/) 0.11.0
and scans a sample image with it. The scanner is a local Rust engine: every image is decoded in
the session that runs the notebook.

[![Launch on Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/qrcode-ai-com/qrcode-barcode-scanner/demos-v0.11.0-r2?urlpath=lab/tree/examples/notebooks/scan-images.ipynb)

The badge opens the notebook on [mybinder.org](https://mybinder.org/), a free public service
with no account. It prepares a session with the package already installed, which can take a few
minutes, and the session ends after about ten minutes of inactivity.

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
has no stored output, carries the six QR Code AI links and pins the same version as
`binder/requirements.txt`. It then installs that file in a new environment, runs the notebook
from top to bottom and checks that every cell ran without an error.

## License

AGPL-3.0-or-later, or a separate commercial license, as the rest of this repository. See
[Licensing](../../LICENSING.md).

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.
