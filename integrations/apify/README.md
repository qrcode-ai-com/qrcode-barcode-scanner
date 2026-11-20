<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-python-dark.gif?v=05df706be1b2">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-python-light.gif?v=c050b0a71771" alt="QR Code &amp; Barcode Scanner for Python: the Python logo, the quick start in Python, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner for Apify

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Apify%20%28integrations%2Fapify%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20An%20Apify%20Actor%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20a%20batch%20of%20images.%20Give%20it%20image%20URLs%20or%20upload%20the%20files%2C%20and%20each%20image%20becomes%20one%20dataset%20item%20with%20its%20decoded%20texts%2C%20or%20with%20the%20reason%20it%20could%20not%20be%20read.%20The%20open-source%20engine%20runs%20inside%20the%20Actor%27s%20container%3A%20the%20images%20go%20to%20no%20other%20service.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fapify%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fapify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fapify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Apify%20%28integrations%2Fapify%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20An%20Apify%20Actor%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20a%20batch%20of%20images.%20Give%20it%20image%20URLs%20or%20upload%20the%20files%2C%20and%20each%20image%20becomes%20one%20dataset%20item%20with%20its%20decoded%20texts%2C%20or%20with%20the%20reason%20it%20could%20not%20be%20read.%20The%20open-source%20engine%20runs%20inside%20the%20Actor%27s%20container%3A%20the%20images%20go%20to%20no%20other%20service.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fapify%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fapify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fapify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Apify%20%28integrations%2Fapify%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20An%20Apify%20Actor%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20a%20batch%20of%20images.%20Give%20it%20image%20URLs%20or%20upload%20the%20files%2C%20and%20each%20image%20becomes%20one%20dataset%20item%20with%20its%20decoded%20texts%2C%20or%20with%20the%20reason%20it%20could%20not%20be%20read.%20The%20open-source%20engine%20runs%20inside%20the%20Actor%27s%20container%3A%20the%20images%20go%20to%20no%20other%20service.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fapify%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fapify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fapify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20for%20Apify%20%28integrations%2Fapify%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20An%20Apify%20Actor%20that%20reads%20every%20QR%20code%20and%20barcode%20in%20a%20batch%20of%20images.%20Give%20it%20image%20URLs%20or%20upload%20the%20files%2C%20and%20each%20image%20becomes%20one%20dataset%20item%20with%20its%20decoded%20texts%2C%20or%20with%20the%20reason%20it%20could%20not%20be%20read.%20The%20open-source%20engine%20runs%20inside%20the%20Actor%27s%20container%3A%20the%20images%20go%20to%20no%20other%20service.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fapify%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fapify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fapify%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner for Apify (integrations/apify/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): An Apify Actor that reads every QR code and barcode in a batch of images. Give it image URLs or upload the files, and each image becomes one dataset item with its decoded texts, or with the reason it could not be read. The open-source engine runs inside the Actor's container: the images go to no other service. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/apify/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/apify https://qrcode-ai.com/en-US/barcode-scanner/integrations/apify https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

An Apify Actor that reads every QR code and barcode in a batch of images. Give it image URLs or upload the files, and each image becomes one dataset item with its decoded texts, or with the reason it could not be read. The open-source engine runs inside the Actor's container: the images go to no other service.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI's scanning pages in the browser. This Actor follows the same route as the [QR code scanner Apify guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/apify) and the [barcode scanner Apify guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/apify). If a page is not online yet, this README is the reference.

To make test images with known values, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep each encoded text beside its image, then compare it with the `texts` of the matching dataset item.

## Status

The Actor is built and tested in the engine repository. It is not on the Apify Store yet, and its
image has not been built: Apify builds it from the [`Dockerfile`](Dockerfile) when the Actor is
pushed.

## Run it

Once the Actor is published, open it in Apify Console, fill in the input and start it. Its input
is a JSON object:

```json
{
  "imageUrls": ["https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/v0.11.0/fixtures/symbology/mixed-code128-qr.png"],
  "profile": "fast",
  "budgetMs": 0
}
```

- `imageUrls`: public http or https addresses of PNG, JPEG, WebP or GIF images.
- `imageFiles`: images you upload in the input form. Console keeps each one in a key-value store
  of your account and passes its address. The Actor reads such a record with the run's own
  access, so a private store works too.
- `profile`: `fast` (the default) suits uploads and gives a reduced quality score. `frame` gives
  no score. `full` searches deepest and gives the full score; artistic QR codes from a generator
  need it.
- `budgetMs`: a time limit per image, from 0 to 60,000 milliseconds. `0`, the default, means no
  limit.

The run fails only when its input cannot be used, for instance with no image at all. An image
that cannot be fetched or read becomes an item with `ok: false` and its error, and the run goes
on. The run's status message counts the images, the codes found and the images not read.

To run it on your machine, you need Python 3.12:

```sh
cd integrations/apify
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
mkdir -p storage/key_value_stores/default
echo '{"imageUrls": ["https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/v0.11.0/fixtures/symbology/mixed-code128-qr.png"]}' > storage/key_value_stores/default/INPUT.json
.venv/bin/python -m qrscan_actor
```

The items land in `storage/datasets/default/`. With the Apify command line installed, `apify run`
does the same and `apify push` builds the Actor on the platform.

## Limits

- Up to 8 MiB per image, refused before the whole file is downloaded. A download has 30 seconds
  and follows at most five redirects. Only http and https addresses are fetched.
- Up to 4,096 pixels per side and 16 million pixels per image. A larger image becomes an item with
  the engine's `QRS-` code.
- Images are read one after the other. The Actor asks for 512 MB of memory by default.
- It stores the images nowhere: only the dataset items are kept, under your account's storage
  retention. It never opens what a code points to.

## Develop

The tests run the Actor as its image does, `python -m qrscan_actor`, against a fresh local storage
and a local web server. One test calls `main()` in the test process:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt -r tests/requirements.txt
.venv/bin/python -m pytest
```

They scan the sample by URL and from an uploaded file in the three profiles. One batch mixes a
good image, a missing one, a file that is not an image, a refused address, two oversized files, an
oversized image, a blank image and a second code: each gets its own item, in order. They also
check that unusable input fails the run and that the input and dataset schemas match the code.
The workflow `integration-python-hosts` of the engine repository runs them. The Docker image and
a run on the Apify platform have not been tried.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-python-dark.gif?v=60b4945fed7e">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/how-python-light.gif?v=bb48f1698ce2" alt="How the Python package works, in three steps: install the package, pass an image or a camera frame to the engine inside your process, and read the report" width="100%">
  </picture>
</p>

The Actor fetches each image, from its URL or from the key-value store that holds the upload, and passes its bytes to the engine inside the Actor's Python process. Each image gives one report and one dataset item.

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

Each dataset item holds `source`, `input` (the field it came from), `ok`, `count`, `texts`, `codes` (each code's format and text), `complete`, `error` and `report`, the engine's full report. `complete` is false when the time budget cut the scan or the image was not read. The dataset's overview table shows the image, the texts and the error.

The report itself is described field by field in the
[report reference](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/docs/api/report.mdx).
An empty list of detections means the image holds no code the engine could read. A refused file
is an error with a `QRS-` code instead, listed in the
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

The Actor reads what the engine reads, from PNG, JPEG, WebP and GIF files. Codes of different formats in one image come back in one report. The engine's
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

Project-authored Actor source is MIT; see [LICENSE](LICENSE). The Actor's image installs the engine wheel `qrcode-barcode-scanner` 0.11.0 from PyPI. The published engine 0.11.0 keeps the license it shipped with, AGPL-3.0-or-later; read the license packaged with the version you install and the [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md).

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
