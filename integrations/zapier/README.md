<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-zapier-dark.gif?v=4bef86e80d62">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-zapier-light.gif?v=1fa10d7840bd" alt="QR Code &amp; Barcode Scanner for Zapier: the Zapier logo, the Scan Image action in a Zap step with its output fields, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner · Zapier integration 0.1.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Zapier%20integration%200.1.0%20%28integrations%2Fzapier%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Zapier%20integration%20adds%20one%20action%20to%20your%20Zaps%2C%20Scan%20Image%2C%20under%20the%20QR%20Code%20AI%20name.%20It%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20file%20and%20returns%20the%20decoded%20text%20for%20the%20next%20step%3A%20a%20spreadsheet%20row%2C%20a%20message%2C%20a%20database%20record.%20The%20open-source%20scanner%20engine%20reads%20the%20image%20inside%20the%20Zap%20step%2C%20compiled%20to%20WebAssembly%2C%20so%20the%20action%20calls%20no%20scanning%20service%20and%20needs%20no%20account%20or%20API%20key.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20in%20Zapier%27s%20app%20directory%20yet%2C%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fzapier%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fzapier%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fzapier%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Zapier%20integration%200.1.0%20%28integrations%2Fzapier%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Zapier%20integration%20adds%20one%20action%20to%20your%20Zaps%2C%20Scan%20Image%2C%20under%20the%20QR%20Code%20AI%20name.%20It%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20file%20and%20returns%20the%20decoded%20text%20for%20the%20next%20step%3A%20a%20spreadsheet%20row%2C%20a%20message%2C%20a%20database%20record.%20The%20open-source%20scanner%20engine%20reads%20the%20image%20inside%20the%20Zap%20step%2C%20compiled%20to%20WebAssembly%2C%20so%20the%20action%20calls%20no%20scanning%20service%20and%20needs%20no%20account%20or%20API%20key.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20in%20Zapier%27s%20app%20directory%20yet%2C%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fzapier%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fzapier%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fzapier%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Zapier%20integration%200.1.0%20%28integrations%2Fzapier%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Zapier%20integration%20adds%20one%20action%20to%20your%20Zaps%2C%20Scan%20Image%2C%20under%20the%20QR%20Code%20AI%20name.%20It%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20file%20and%20returns%20the%20decoded%20text%20for%20the%20next%20step%3A%20a%20spreadsheet%20row%2C%20a%20message%2C%20a%20database%20record.%20The%20open-source%20scanner%20engine%20reads%20the%20image%20inside%20the%20Zap%20step%2C%20compiled%20to%20WebAssembly%2C%20so%20the%20action%20calls%20no%20scanning%20service%20and%20needs%20no%20account%20or%20API%20key.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20in%20Zapier%27s%20app%20directory%20yet%2C%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fzapier%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fzapier%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fzapier%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20Zapier%20integration%200.1.0%20%28integrations%2Fzapier%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20Zapier%20integration%20adds%20one%20action%20to%20your%20Zaps%2C%20Scan%20Image%2C%20under%20the%20QR%20Code%20AI%20name.%20It%20reads%20every%20QR%20code%20and%20barcode%20in%20an%20image%20file%20and%20returns%20the%20decoded%20text%20for%20the%20next%20step%3A%20a%20spreadsheet%20row%2C%20a%20message%2C%20a%20database%20record.%20The%20open-source%20scanner%20engine%20reads%20the%20image%20inside%20the%20Zap%20step%2C%20compiled%20to%20WebAssembly%2C%20so%20the%20action%20calls%20no%20scanning%20service%20and%20needs%20no%20account%20or%20API%20key.%20Version%200.1.0%20is%20built%20and%20tested%20from%20this%20folder.%20It%20is%20not%20in%20Zapier%27s%20app%20directory%20yet%2C%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fzapier%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fzapier%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fzapier%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · Zapier integration 0.1.0 (integrations/zapier/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This Zapier integration adds one action to your Zaps, Scan Image, under the QR Code AI name. It reads every QR code and barcode in an image file and returns the decoded text for the next step: a spreadsheet row, a message, a database record. The open-source scanner engine reads the image inside the Zap step, compiled to WebAssembly, so the action calls no scanning service and needs no account or API key. Version 0.1.0 is built and tested from this folder. It is not in Zapier's app directory yet, Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/zapier/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations/zapier https://qrcode-ai.com/en-US/barcode-scanner/integrations/zapier https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This Zapier integration adds one action to your Zaps, Scan Image, under the QR Code AI name. It reads every QR code and barcode in an image file and returns the decoded text for the next step: a spreadsheet row, a message, a database record. The open-source scanner engine reads the image inside the Zap step, compiled to WebAssembly, so the action calls no scanning service and needs no account or API key. Version 0.1.0 is built and tested from this folder. It is not in Zapier's app directory yet, and a Zap can use it only once its owner has pushed it to Zapier.

You can try the same engine in a browser first. The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) reads a QR code image, and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) reads a barcode label. The [QR code scanner guide for Zapier](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/zapier) and the [barcode scanner guide for Zapier](https://qrcode-ai.com/en-US/barcode-scanner/integrations/zapier) explain this action for each kind of code.

To make test images, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) for a QR code and the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator) for a barcode. Keep the text you encoded next to the image, then compare it with the action's **Decoded texts**, leading zeroes included.

## What you can build with it

Scan Image fits after any step that gives a Zap an image file:

- read the QR code on a scanned invoice or delivery note that arrives as an email attachment, and file the decoded text in a spreadsheet;
- read the barcode on a product photo uploaded through a form, and look the code up in your inventory;
- read the QR codes of the images that land in a cloud storage folder, and post each decoded link to a chat channel for review.

The action reads QR codes and barcodes alike: an image can hold several codes of different kinds, and each one comes back once.

## Use

In a Zap, add an action step, choose the **QR Code AI** app, then the **Scan Image** event. The action has three fields:

| Field | Required | What it takes |
| --- | --- | --- |
| **Image** | yes | A file from an earlier step, or the URL of one. PNG, JPEG, WebP or GIF, at most 8 MiB and 4096 pixels per side. |
| **Profile** | no | **Frame**, the default, decodes every code without scoring. **Fast** and **Full** also score how well a QR code scans. |
| **Budget (ms)** | no | Replaces the profile's time budget, from 0 to 25000. Leave it empty for the profile default. 0 removes the budget. It is not a hard timeout. |

A file field in Zapier accepts the file of an earlier step, such as an email attachment or a form upload, or a public `http` or `https` URL. The action downloads the image, scans it, and keeps nothing.

## What it returns

| Output field | Key | What it holds |
| --- | --- | --- |
| Number of codes | `count` | How many codes the image holds, 0 when it holds none. |
| First decoded text | `text` | The text of the first code in report order, empty when there is none. |
| Decoded texts | `texts` | One text per code, in report order. For the image in the picture below: `https://qrc-ai.com/76xMa` and `STOCK-4827`. |
| Codes | `codes` | One item per code: `symbology` (such as `qr_code` or `code128`), `text`, the exact bytes in base64 as `raw`, `charset` and the parsed `payload`. |
| Budget exhausted | `budget_exhausted` | `true` when the profile's time budget cut the scan short, so a code may be missing. |
| Profile | `profile` | The profile that ran. |
| Scanner version | `scanner_version` | The engine version, `0.11.0`. |
| Engine report (JSON) | `report_json` | The complete scanner report as JSON text: positions, scores, hints, trace and versions. |

An image without a code is a normal result: the count is 0 and the texts are empty, so a Filter step can stop the Zap there. The **Frame** profile leaves the score of each code null, because it does not score.

## Errors

A failed step shows one of these codes in the Zap history:

| Code | Status | When |
| --- | --- | --- |
| `ImageMissing` | 400 | The Image field is empty. |
| `ImageUrl` | 400 | The Image field holds neither a file nor an `http` or `https` URL. |
| `ImageDownload` | 400, or the HTTP status of the image URL | The image could not be downloaded. |
| `ImageTooLarge` | 413 | The image is larger than 8 MiB. |
| `InvalidImage` | 400 | The downloaded file is empty. |
| `QRS-001` and other `QRS-` codes | 422 | The engine refused the file: not an image, an unknown format, or more pixels than the limits. |
| `InvalidOption`, `InvalidBudget` | 400 | The profile or the budget is out of range. |

## Limits

Each image can have at most 8 MiB, 4096 pixels per side and 16 million pixels in all. Zapier stops an action step after about 30 seconds, and the download and the scan share that time; the **Frame** profile and the default budgets fit well inside it. The action never opens a decoded link: treat every decoded text as untrusted data before a later step acts on it.

## How it works

Zapier runs an integration's code on AWS Lambda, in Node.js 22 for `zapier-platform-core` 19. The action downloads the image with Zapier's request client, then hands the bytes to the engine package `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, which runs in one worker thread of the step's process. The worker stays loaded between the steps that the same Lambda instance runs, so only the first scan pays for loading the engine.

The test suite runs the built bundle in the AWS Lambda Node.js 22 base image, at 256 MB, read-only and as a non-root user, the way Zapier invokes it: the worker thread and the WebAssembly engine load and scan there in the three profiles.

## Availability

The integration is not in Zapier's app directory, and no public Zap can find it yet. Its owner can push it to a Zapier developer account and share it by invitation; listing it publicly is a separate review by Zapier. [LISTING.md](LISTING.md) holds the field values, the steps and the review questions.

## Build and test from source

The action is [creates/scan-image.js](creates/scan-image.js), registered by [index.js](index.js). Its scan core, `lib/scan-core.js`, is generated from [the shared core](../automation-js-core/src/scan-core.ts) of the JavaScript automation hosts; edit the source there and run `node integrations/automation-js-core/sync.mjs`.

```sh
cd integrations/zapier
npm ci
npm test
DISABLE_ZAPIER_ANALYTICS=1 npx zapier-platform validate
DISABLE_ZAPIER_ANALYTICS=1 TZ=UTC npx zapier-platform build
node test/packed-consumer.mjs build/build.zip
```

`npm test` runs the action through Zapier's app tester. It scans the mixed fixture over HTTP in the three profiles, an image without a code, an empty download, a corrupt file, images over 8 MiB with and without a declared length, bad URLs and out-of-range options. `zapier-platform validate` checks the definition against Zapier's schema, then runs Zapier's integration checks, which call Zapier's public check endpoint without an account; `--without-style` stays offline. `zapier-platform build` writes `build/build.zip`, the bundle Zapier runs. `test/packed-consumer.mjs` unpacks it outside the checkout, checks its files and the license of every package in it, and calls its handler the way Zapier does. Add `--lambda public.ecr.aws/lambda/nodejs:22` to run it in the AWS Lambda image too; Docker is then required.

The [integration workflow](../../.github/workflows/integration-zapier.yml) runs all of this on each change, then has the destination acceptance driver judge the bundle's three reports.

## The codes in one report

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both codes come back in the same step, each with its format, its exact text and the place where the engine measured it.

## What it reads

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## The same engine in other runtimes

The same engine also runs as an [n8n community node](../n8n/README.md), a [Node-RED node](../node-red/README.md) and an [Activepieces piece](../activepieces/README.md), which share this action's scan core. The Rust, Node.js, browser and Python packages hold the engine, and every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## Licensing

The integration's own source is MIT, in [LICENSE](LICENSE). The bundle Zapier runs is not only this source: it holds the published engine, `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0, under its AGPL-3.0-or-later license, and Zapier's own `zapier-platform-core`, under the Zapier Platform Agreement. [LICENSE-NOTES.md](LICENSE-NOTES.md) lists every part of the bundle with its license and names the engine's corresponding source.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
