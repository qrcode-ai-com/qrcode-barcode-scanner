<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-replicate-dark.gif?v=d380ca0db156">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-replicate-light.gif?v=2c3e01b9d6b0" alt="QR Code &amp; Barcode Scanner on Replicate: the Replicate logo, Cog commands and the report fields, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner on Replicate

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20on%20Replicate%20%28integrations%2Freplicate%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Replicate%20model%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20and%20returns%20the%20open-source%20engine%27s%20complete%20JSON%20report%3A%20each%20code%27s%20format%2C%20decoded%20text%2C%20raw%20bytes%20and%20measured%20position.%20It%20is%20a%20Cog%20folder%20around%20the%20published%20Python%20package%2C%20so%20the%20same%20engine%20can%20run%20in%20a%20container%20on%20Replicate%27s%20CPU%20hardware.%20The%20scanner%20is%20local-first%2C%20but%20this%20route%20is%20not%3A%20each%20image%20is%20uploaded%20to%20Replicate%20and%20scanned%20on%20Replicate%27s%20servers.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Freplicate%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20on%20Replicate%20%28integrations%2Freplicate%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Replicate%20model%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20and%20returns%20the%20open-source%20engine%27s%20complete%20JSON%20report%3A%20each%20code%27s%20format%2C%20decoded%20text%2C%20raw%20bytes%20and%20measured%20position.%20It%20is%20a%20Cog%20folder%20around%20the%20published%20Python%20package%2C%20so%20the%20same%20engine%20can%20run%20in%20a%20container%20on%20Replicate%27s%20CPU%20hardware.%20The%20scanner%20is%20local-first%2C%20but%20this%20route%20is%20not%3A%20each%20image%20is%20uploaded%20to%20Replicate%20and%20scanned%20on%20Replicate%27s%20servers.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Freplicate%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20on%20Replicate%20%28integrations%2Freplicate%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Replicate%20model%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20and%20returns%20the%20open-source%20engine%27s%20complete%20JSON%20report%3A%20each%20code%27s%20format%2C%20decoded%20text%2C%20raw%20bytes%20and%20measured%20position.%20It%20is%20a%20Cog%20folder%20around%20the%20published%20Python%20package%2C%20so%20the%20same%20engine%20can%20run%20in%20a%20container%20on%20Replicate%27s%20CPU%20hardware.%20The%20scanner%20is%20local-first%2C%20but%20this%20route%20is%20not%3A%20each%20image%20is%20uploaded%20to%20Replicate%20and%20scanned%20on%20Replicate%27s%20servers.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Freplicate%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20on%20Replicate%20%28integrations%2Freplicate%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20Replicate%20model%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20and%20returns%20the%20open-source%20engine%27s%20complete%20JSON%20report%3A%20each%20code%27s%20format%2C%20decoded%20text%2C%20raw%20bytes%20and%20measured%20position.%20It%20is%20a%20Cog%20folder%20around%20the%20published%20Python%20package%2C%20so%20the%20same%20engine%20can%20run%20in%20a%20container%20on%20Replicate%27s%20CPU%20hardware.%20The%20scanner%20is%20local-first%2C%20but%20this%20route%20is%20not%3A%20each%20image%20is%20uploaded%20to%20Replicate%20and%20scanned%20on%20Replicate%27s%20servers.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Freplicate%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fpython%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner on Replicate (integrations/replicate/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A Replicate model that reads every QR code and barcode in an image and returns the open-source engine's complete JSON report: each code's format, decoded text, raw bytes and measured position. It is a Cog folder around the published Python package, so the same engine can run in a container on Replicate's CPU hardware. The scanner is local-first, but this route is not: each image is uploaded to Replicate and scanned on Replicate's servers. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/replicate/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/python https://qrcode-ai.com/en-US/barcode-scanner/sdk/python https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A Replicate model that reads every QR code and barcode in an image and returns the open-source engine's complete JSON report: each code's format, decoded text, raw bytes and measured position. It is a Cog folder around the published Python package, so the same engine can run in a container on Replicate's CPU hardware. The scanner is local-first, but this route is not: each image is uploaded to Replicate and scanned on Replicate's servers.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI's scanning pages in the browser. The model uses the Python package, which has the [QR code scanner Python guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/python) and the [barcode scanner Python guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/python). If a page is not online yet, this README is the reference.

To make a test image with a known value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Send the exported image to the model and compare each detection's `content.text` in the report with the value you encoded, leading zeroes included.

[`run.py`](run.py) is the model: one `Runner` whose `run` takes an image and returns the report.
[`cog.yaml`](cog.yaml) tells Cog to build it on Python 3.13 without a GPU, with the published
package [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/) 0.11.0
pinned in [`requirements.txt`](requirements.txt). Nothing is compiled from the engine's Rust
source.

## Status

**The model is not published yet.** The page `qrcode-ai-com/qrcode-barcode-scanner` does not
exist on Replicate, and no version has been pushed. This folder is built and tested in the engine
repository: the workflow `integration-replicate` builds the image with `cog build`, runs three
predictions with `cog run` and removes the image, and it never pushes anything.

Creating the model and pushing it is the owner's step, from the owner's own shell, with the
owner's Replicate token: [LISTING.md](LISTING.md) lists the page's fields and each step. The
engine repository holds no Replicate token. A workflow that pushes a version when a tag is made
would need that token, so it would belong to the scanner's distribution repository, not to this
one.

## Your images go to Replicate

The scanner is built to read codes where the image already is: in your process, in your browser
or on your own server. This model is the exception. When you run it on Replicate, each image is
uploaded to Replicate and scanned on Replicate's machines, and Replicate stores the prediction:
by its [data retention page](https://replicate.com/docs/topics/predictions/data-retention), the
inputs, outputs and logs of a prediction made through the API are removed after an hour, and those
of a prediction made on the website are kept until you delete them.

Send only images you may share with Replicate. To keep an image on your machine, use the
[Python package](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/), the
[command line](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line) or the
same Cog folder on your own computer, as shown below. The model never opens what a code points to.

## Inputs

| Input | Type | Default | Meaning |
|---|---|---|---|
| `image` | file | required | PNG, JPEG, WebP or GIF, at most 8 MiB and 4,096 pixels per side |
| `profile` | `fast`, `frame` or `full` | `fast` | `fast` suits uploads and gives a reduced quality score. `frame` only decodes, as for camera frames, and gives no score. `full` searches deepest and gives the full score; artistic QR codes from a generator need it. |
| `budget_ms` | integer, 0 to 60,000 | empty | A time limit in milliseconds. Empty keeps the profile's own budget (fast 800, frame 80, full 4,000). `0` removes it. |

Once the model is published, a prediction's input is a JSON object like this one:

```json
{
  "image": "https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/v0.11.0/fixtures/symbology/mixed-code128-qr.png",
  "profile": "full",
  "budget_ms": 0
}
```

The output is the report, unchanged. An image without a code gives a report whose `detections`
list is empty. A file the engine cannot read fails the prediction with the engine's `QRS-` error,
for instance `[QRS-001]` for a file that is not an image.

## Run it with Cog on your machine

With Docker and [Cog](https://github.com/replicate/cog) 0.23.1 installed, the same folder runs
locally, and the image stays on your computer:

```sh
cd integrations/replicate
cog run -i image=@label.png -i profile=full
```

`cog run` builds the image the first time, starts it, sends `label.png` and prints the report.
`cog build -t qrcode-barcode-scanner-cog` only builds it.

## Limits

- Up to 8 MiB per file, refused before the whole file is read.
- Up to 4,096 pixels per side and 16 million pixels per image. A larger image fails with the
  engine's `QRS-` code.
- One image per prediction. These are the limits of the scanner's MCP server.
- When a time budget cuts a scan, `trace.budget_exhausted` is true and the report may miss codes.

## Develop

The tests call `Runner.run` the way Cog's server does, without Docker:

```sh
cd integrations/replicate
python3.13 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt -r tests/requirements.txt
.venv/bin/python -m pytest tests
```

They read the sample image in the three profiles and compare each report with a direct call to
the engine. They check the empty report of a blank image, the failure of a file that is not an
image, of an empty file, of an oversized file and of an oversized image, the refused options, and
the inputs Cog publishes. The workflow `integration-replicate` of the engine repository runs them
in a new environment through the scanner's Python host kit. Its second job builds the image,
checks that the engine inside it is the published 0.11.0 wheel, runs the three predictions with
`cog run`, checks that a text file fails its prediction, and removes the image.

## A recorded CI run

This is an excerpt of the log of the image job, from
[run 44888060012](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44888060012)
on 21 November 2026. The commands are the ones the workflow ran, with the runner's folders cut
from the paths, and the lines that start with `#` and a number are Docker's build output. The
image was built on the CI machine, scanned the sample image and was then removed. It was never
pushed.

```text
$ cog --version
cog version 0.23.1 (built 2026-10-20T14:50:45Z)
$ cog build --progress plain -t qrcode-barcode-scanner-cog
#14 1.317 Downloading qrcode_barcode_scanner-0.11.0-cp38-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (2.1 MB)
#14 1.383 Successfully installed qrcode-barcode-scanner-0.11.0
#15 0.119 Using Python 3.13.5 environment at: /usr/local
#15 0.237  + cog==0.23.1
#15 0.237  + coglet==0.23.1
#8 writing image sha256:f3f3e5a29640abd2670787ca4ef30cfccbc91e6eaa2d753e4d0a767b4b4e72ec done
Image built as qrcode-barcode-scanner-cog
$ # the workflow's checks of the image label and of the engine inside the image
Schema: inputs image, profile (fast, frame, full) and budget_ms (0 to 60000); output ['object']
Python 3.13.5, qrcode-barcode-scanner 0.11.0, native module SHA-256 de30ac77aee57c90ec4552af10e075fbd83aa1f775b53031cf5acf84fc117e34
$ cog run qrcode-barcode-scanner-cog -i image=@mixed-code128-qr.png -i profile=full -i budget_ms=0 -o full.json
Starting Docker image and running setup()...
Running prediction...
Written output to: full.json
$ cog run qrcode-barcode-scanner-cog -i image=@notes.png -o invalid.json
Prediction failed with status "failed": Prediction failed: Prediction failed: ValueError: unsupported or corrupt image: The image format could not be determined [QRS-001]
$ python3 scripts/destination-acceptance.py check receipt/acceptance-replicate-image.json
ok    Replicate model image, built by cog build (not pushed) · 0.11.0 · PASS
```

The native module's SHA-256 is the one of the manylinux x86_64 wheel published on PyPI. In the
three reports, the two detections are the same:

```json
[
  {"symbology": "qr_code", "content": {"text": "https://qrc-ai.com/76xMa"}},
  {"symbology": "code128", "content": {"text": "STOCK-4827"}}
]
```

The JSON keeps only these two fields of each detection; the full reports also hold the raw bytes,
the payload, the corners and the score.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-python-dark.gif?v=60b4945fed7e">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-python-light.gif?v=bb48f1698ce2" alt="How the Python package works, in three steps: install the package, pass an image or a camera frame to the engine inside your process, and read the report" width="100%">
  </picture>
</p>

Cog builds a container that holds Python 3.13, the engine wheel and `run.py`. For each
prediction, Cog's server hands the uploaded file to `Runner.run`, which reads at most 8 MiB of it
and passes the bytes to the engine inside the same Python process. The report goes back as the
prediction's output.

## What it returns

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of the sample image, which holds a QR code and a Code 128 barcode.
Both come back in one report, each with its format, its exact text and the place where the engine
measured it: `https://qrc-ai.com/76xMa` and `STOCK-4827`.

The report is described field by field in the
[report reference](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/docs/api/report.mdx),
and its errors in the
[error codes](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/docs/api/errors.mdx).

## What it reads

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>

| Family | Formats |
|---|---|
| QR | QR Code, Micro QR, rectangular Micro QR (rMQR) |
| Matrix and stacked | Data Matrix, Aztec, PDF417, MaxiCode |
| Retail | EAN-13, EAN-8, UPC-A, UPC-E |
| Other linear | Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen |

The model reads what the engine reads, from PNG, JPEG, WebP and GIF files. Codes of different formats in one image come back in one report. The engine's
[supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats)
section states the known limits.

## The same engine in other runtimes

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>

| Runtime | Package | How it scans |
|---|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-dark.png?v=31b5deebc32e"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-rust-light.png?v=c5207721973f" alt="" width="24" height="24" align="absmiddle"></picture> Rust | [`qrcode-barcode-scanner`](https://crates.io/crates/qrcode-barcode-scanner) on crates.io | In process |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-nodejs-dark.png?v=cf2159524fc6"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-nodejs-light.png?v=6dd098480218" alt="" width="24" height="24" align="absmiddle"></picture> Node.js | [`@qrcode-ai-com/qrcode-barcode-scanner`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner) on npm | In process, native |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-browser-dark.png?v=bbe2f3560a6d"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-browser-light.png?v=591e304cf9e9" alt="" width="24" height="24" align="absmiddle"></picture> Browser | [`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm) on npm | In the page, WebAssembly |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-python-dark.png?v=7469c3e0b4fb"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-python-light.png?v=308121255ab7" alt="" width="24" height="24" align="absmiddle"></picture> Python | [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/) on PyPI | In process |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-go-dark.png?v=b6dbac901176"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-go-light.png?v=1983a9eb7344" alt="" width="24" height="24" align="absmiddle"></picture> Go | [`qrcode-barcode-scanner-go`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-go) | Through the installed `qrscan` |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-php-dark.png?v=3800932934c8"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-lang-php-light.png?v=7bdd6884b3a4" alt="" width="24" height="24" align="absmiddle"></picture> PHP | [`qrcode-barcode-scanner-php`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-php) | Through the installed `qrscan` |
| <picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-terminal-dark.png?v=1e987f0ab278"><img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/mark-terminal-light.png?v=2262d66bee6b" alt="" width="24" height="24" align="absmiddle"></picture> Command line | [`qrscan`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line) | One command, one JSON report |

The Rust, Node.js, browser and Python packages hold the engine. The Go and PHP packages hold no decoder:
each one starts `qrscan` and hands you its report.

<sub>Language and platform names and logos belong to their owners. They identify a runtime or a destination and imply no endorsement.</sub>

## Licence

Project-authored model source in this folder is MIT; see [LICENSE](LICENSE). The image that `cog build` makes installs the engine wheel `qrcode-barcode-scanner` 0.11.0 from PyPI. The published engine 0.11.0 keeps the license it shipped with, AGPL-3.0-or-later, so the built image, and the model on Replicate once it is pushed, are distributed under AGPL-3.0-or-later. Because people use the hosted model over a network, its page offers them the corresponding source: the [engine at v0.11.0](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0) and this folder at the commit each version was pushed from. [LICENSE-NOTES.md](LICENSE-NOTES.md) gives the details, and the [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains the boundaries.

Replicate and Cog are names of Replicate, Inc. They identify the destination and imply no endorsement.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
