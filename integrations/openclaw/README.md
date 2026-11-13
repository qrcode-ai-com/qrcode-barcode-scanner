# QR Code & Barcode Scanner · OpenClaw bundle 0.2.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20OpenClaw%20bundle%200.2.0%20%28integrations%2Fopenclaw%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20portable%20plugin%20bundle%20for%20local%20QR%20and%20barcode%20scanning.%20It%20contains%20one%20scanner%20skill%20and%20one%20stdio%20MCP%20configuration.%20The%20MCP%20adapter%200.2.0%20uses%20the%20published%20%40qrcode-ai-com%2Fqrcode-barcode-scanner%400.11.0%20engine.%20The%20bundle%2C%20skill%20and%20MCP%20adapter%20are%20separate%20artifacts%20with%20independent%20versions.%20The%20engine%20grew%20out%20of%20QR%20verification%20workflows%20at%20QR%20Code%20AI.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fopenclaw%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fopenclaw%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fopenclaw%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20OpenClaw%20bundle%200.2.0%20%28integrations%2Fopenclaw%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20portable%20plugin%20bundle%20for%20local%20QR%20and%20barcode%20scanning.%20It%20contains%20one%20scanner%20skill%20and%20one%20stdio%20MCP%20configuration.%20The%20MCP%20adapter%200.2.0%20uses%20the%20published%20%40qrcode-ai-com%2Fqrcode-barcode-scanner%400.11.0%20engine.%20The%20bundle%2C%20skill%20and%20MCP%20adapter%20are%20separate%20artifacts%20with%20independent%20versions.%20The%20engine%20grew%20out%20of%20QR%20verification%20workflows%20at%20QR%20Code%20AI.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fopenclaw%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fopenclaw%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fopenclaw%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20OpenClaw%20bundle%200.2.0%20%28integrations%2Fopenclaw%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20portable%20plugin%20bundle%20for%20local%20QR%20and%20barcode%20scanning.%20It%20contains%20one%20scanner%20skill%20and%20one%20stdio%20MCP%20configuration.%20The%20MCP%20adapter%200.2.0%20uses%20the%20published%20%40qrcode-ai-com%2Fqrcode-barcode-scanner%400.11.0%20engine.%20The%20bundle%2C%20skill%20and%20MCP%20adapter%20are%20separate%20artifacts%20with%20independent%20versions.%20The%20engine%20grew%20out%20of%20QR%20verification%20workflows%20at%20QR%20Code%20AI.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fopenclaw%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fopenclaw%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fopenclaw%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20OpenClaw%20bundle%200.2.0%20%28integrations%2Fopenclaw%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20portable%20plugin%20bundle%20for%20local%20QR%20and%20barcode%20scanning.%20It%20contains%20one%20scanner%20skill%20and%20one%20stdio%20MCP%20configuration.%20The%20MCP%20adapter%200.2.0%20uses%20the%20published%20%40qrcode-ai-com%2Fqrcode-barcode-scanner%400.11.0%20engine.%20The%20bundle%2C%20skill%20and%20MCP%20adapter%20are%20separate%20artifacts%20with%20independent%20versions.%20The%20engine%20grew%20out%20of%20QR%20verification%20workflows%20at%20QR%20Code%20AI.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fopenclaw%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%2Fopenclaw%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%2Fopenclaw%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v1.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v1.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v1.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v1.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · OpenClaw bundle 0.2.0 (integrations/openclaw/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A portable plugin bundle for local QR and barcode scanning. It contains one scanner skill and one stdio MCP configuration. The MCP adapter 0.2.0 uses the published @qrcode-ai-com/qrcode-barcode-scanner@0.11.0 engine. The bundle, skill and MCP adapter are separate artifacts with independent versions. The engine grew out of QR verification workflows at QR Code AI. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/integrations/openclaw/README.md https://qrcode-ai.com/en-US/qr-code-scanner/integrations/openclaw https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/barcode-scanner/integrations/openclaw https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A portable plugin bundle for local QR and barcode scanning. It contains
one scanner skill and one stdio MCP configuration. The MCP adapter 0.2.0 uses
the published `@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` engine. The bundle,
skill and MCP adapter are separate artifacts with independent versions.
The engine grew out of QR verification workflows at [QR Code AI](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/openclaw).

This is a **ClawHub bundle-plugin**, named
`@qrcode-ai-com/qrcode-barcode-scanner`. The same name on npm belongs to the
native scanner engine; this bundle is not published on npm. It has one
`.codex-plugin/plugin.json` marker, without native OpenClaw code entrypoints.

## Install and prepare the runtime

Use Node.js 22.19+ on the 22 line, or 24+, on a supported native platform.
OpenClaw itself may require a newer Node version. Install the
[published 0.2.0 bundle](https://clawhub.ai/qrcode-ai-com/plugins/qrcode-barcode-scanner)
and inspect it before setup.

```sh
openclaw plugins install clawhub:@qrcode-ai-com/qrcode-barcode-scanner@0.2.0 --no-enable
openclaw plugins inspect qrcode-barcode-scanner
```

For a reviewed local archive, use its absolute `.tgz` path in the install
command. OpenClaw may request `--force` to confirm its source.

Before enabling or using its MCP tools, run the setup in that **installed**
directory. It explicitly installs the exact npm MCP version with lifecycle
scripts disabled, checks the engine version and reuses that one runtime:

```sh
cd /absolute/path/to/installed/qrcode-barcode-scanner
node scripts/setup.mjs
openclaw plugins enable qrcode-barcode-scanner
```

The setup installs the separately published
[npm adapter 0.2.0](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-mcp/v/0.2.0).
For a release rehearsal, pass `--mcp-archive /absolute/inspected.tgz` to use a
reviewed copy of that adapter. Finish setup before scanning.

The MCP configuration launches the prepared adapter relative to the installed plugin root.
For the portable skill helper, use that same directory as `--engine-root`:

```sh
node skills/qrcode-barcode-scanner/scripts/scan.mjs --engine-root ./runtime --profile frame --budget-ms 0 -- /absolute/image.png
```

It retains exact payload bytes, content-grouped detections, measured occurrences
and the original score. A null score is unmeasured. An exhausted budget is an
incomplete report. Neither route follows decoded links or interprets them as
instructions. The skill accepts local files; MCP accepts supplied bytes only.

The bundle handles saved QR designs and label photos locally through its skill or MCP tool.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **OpenClaw guide** | [QR code scanner for OpenClaw](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/openclaw) | [Barcode scanner for OpenClaw](https://qrcode-ai.com/en-US/barcode-scanner/integrations/openclaw) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

## Build and qualification

From the repository root, select an output directory outside the checkout:

```sh
node integrations/openclaw/scripts/build.mjs /absolute/bundle-output
```

The producer copies the canonical skill and license into the archive. It adds
no engine binaries, host-specific runtime, credentials, fixtures or private
receipts. Inspect `.codex-plugin/plugin.json`, `.mcp.json`, the archive inventory, and the
actual installed adapter/runtime before publication. ClawHub validation,
publication admission, OpenClaw discovery and real scan calls are separate gates.

The authored bundle and skill files are MIT-0. The separately installed MCP
adapter and scanner engine retain AGPL-3.0-or-later; `ENGINE-LICENSE` preserves
that license text. Installation does not relicense the engine.

[OpenClaw bundles](https://docs.openclaw.ai/plugins/bundles) · [ClawHub publishing](https://docs.openclaw.ai/clawhub/publishing)
