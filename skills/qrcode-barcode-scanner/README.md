# QR Code & Barcode Scanner skill · 0.2.0

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20skill%20%C2%B7%200.2.0%20%28skills%2Fqrcode-barcode-scanner%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20portable%20Agent%20Skill%20for%20local%20QR%2Fbarcode%20decoding%20and%20the%20original%20scanner%20judgment.%20The%20source%20in%20this%20directory%20is%20newly%20authored%20skill%20text%20and%20Node%20helpers%20under%20MIT-0%3B%20it%20includes%20no%20engine%20binary%2C%20dependency%20or%20fixture.%20The%20separately%20installed%20scanner%20engine%20%40qrcode-ai-com%2Fqrcode-barcode-scanner%400.11.0%20retains%20AGPL-3.0-or-later.%20Installing%20this%20wrapper%20does%20not%20relicense%20that%20engine%20or%20exempt%20a%20consumer%20from%20its%20terms.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fskills%2Fqrcode-barcode-scanner%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fskills%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fskills%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20skill%20%C2%B7%200.2.0%20%28skills%2Fqrcode-barcode-scanner%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20portable%20Agent%20Skill%20for%20local%20QR%2Fbarcode%20decoding%20and%20the%20original%20scanner%20judgment.%20The%20source%20in%20this%20directory%20is%20newly%20authored%20skill%20text%20and%20Node%20helpers%20under%20MIT-0%3B%20it%20includes%20no%20engine%20binary%2C%20dependency%20or%20fixture.%20The%20separately%20installed%20scanner%20engine%20%40qrcode-ai-com%2Fqrcode-barcode-scanner%400.11.0%20retains%20AGPL-3.0-or-later.%20Installing%20this%20wrapper%20does%20not%20relicense%20that%20engine%20or%20exempt%20a%20consumer%20from%20its%20terms.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fskills%2Fqrcode-barcode-scanner%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fskills%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fskills%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20skill%20%C2%B7%200.2.0%20%28skills%2Fqrcode-barcode-scanner%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20portable%20Agent%20Skill%20for%20local%20QR%2Fbarcode%20decoding%20and%20the%20original%20scanner%20judgment.%20The%20source%20in%20this%20directory%20is%20newly%20authored%20skill%20text%20and%20Node%20helpers%20under%20MIT-0%3B%20it%20includes%20no%20engine%20binary%2C%20dependency%20or%20fixture.%20The%20separately%20installed%20scanner%20engine%20%40qrcode-ai-com%2Fqrcode-barcode-scanner%400.11.0%20retains%20AGPL-3.0-or-later.%20Installing%20this%20wrapper%20does%20not%20relicense%20that%20engine%20or%20exempt%20a%20consumer%20from%20its%20terms.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fskills%2Fqrcode-barcode-scanner%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fskills%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fskills%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20skill%20%C2%B7%200.2.0%20%28skills%2Fqrcode-barcode-scanner%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20portable%20Agent%20Skill%20for%20local%20QR%2Fbarcode%20decoding%20and%20the%20original%20scanner%20judgment.%20The%20source%20in%20this%20directory%20is%20newly%20authored%20skill%20text%20and%20Node%20helpers%20under%20MIT-0%3B%20it%20includes%20no%20engine%20binary%2C%20dependency%20or%20fixture.%20The%20separately%20installed%20scanner%20engine%20%40qrcode-ai-com%2Fqrcode-barcode-scanner%400.11.0%20retains%20AGPL-3.0-or-later.%20Installing%20this%20wrapper%20does%20not%20relicense%20that%20engine%20or%20exempt%20a%20consumer%20from%20its%20terms.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fskills%2Fqrcode-barcode-scanner%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fskills%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fskills%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v1.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v1.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v1.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v1.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner skill · 0.2.0 (skills/qrcode-barcode-scanner/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A portable Agent Skill for local QR/barcode decoding and the original scanner judgment. The source in this directory is newly authored skill text and Node helpers under MIT-0; it includes no engine binary, dependency or fixture. The separately installed scanner engine @qrcode-ai-com/qrcode-barcode-scanner@0.11.0 retains AGPL-3.0-or-later. Installing this wrapper does not relicense that engine or exempt a consumer from its terms. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/skills/qrcode-barcode-scanner/README.md https://qrcode-ai.com/en-US/qr-code-scanner/skills https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/barcode-scanner/skills https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A portable Agent Skill for local QR/barcode decoding and the original scanner
judgment. The source in this directory is newly authored skill text and Node
helpers under **MIT-0**; it includes no engine binary, dependency or fixture.
The separately installed scanner engine
`@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` retains **AGPL-3.0-or-later**. Installing
this wrapper does not relicense that engine or exempt a consumer from its terms.

The local helper uses the engine developed for QR verification at [QR Code AI](https://qrcode-ai.com/en-US/qr-code-scanner/skills).

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **Agent skills guide** | [QR code scanner agent skill](https://qrcode-ai.com/en-US/qr-code-scanner/skills) | [Barcode scanner agent skill](https://qrcode-ai.com/en-US/barcode-scanner/skills) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

Install the [published skill](https://clawhub.ai/qrcode-ai-com/skills/qrcode-barcode-scanner)
with `clawhub install qrcode-barcode-scanner --version 0.2.0`. For a manual
installation, copy the entire directory with the scripts and license. In OpenClaw,
a project installation is
`<workspace>/skills/qrcode-barcode-scanner`; in Hermes it is
`<HERMES_HOME>/skills/qrcode-barcode-scanner`. Refer to the host documentation for
remote Git/registry installation. The runtime is installed separately as described
in [SKILL.md](SKILL.md); do not put `node_modules` in the skill bundle.

The helper requires Node.js 22+ and a native target shipped by engine 0.11.0:
macOS ARM64/Intel, Linux ARM64 GNU/x64 GNU/x64 musl, or Windows x64 MSVC.
Host versions may require a newer Node version. Other engine targets are refused
by their loader rather than implicitly built. No Python/PyPI dependency, account
or model call is required by the helper.

To verify the helper against a separately licensed, external engine fixture:

```sh
node scripts/test.mjs --engine-root ".qrcode-barcode-scanner-runtime" --fixture "/path/to/engine/fixtures/clean/gen_v5_q.png" --mixed-fixture "/path/to/engine/fixtures/symbology/mixed-code128-qr.png"
```

The test requires the engine fixture whose payload is
`https://qrcode-ai.com/c/v5q`. The engine repository supplies it at
`fixtures/clean/gen_v5_q.png`; it is **not included in this MIT-0 bundle**.
The test creates its own white PNG and invalid data in a temporary directory.
It checks exact text/raw bytes, report markers, Full/Frame, valid no-detection,
invalid input, stale/missing dependency, size limits, special filenames, ancestor
fallbacks and symlink escapes. Boundary tests require permission to create
filesystem symlinks in the temporary directory.
Host discovery and helper execution are distinct from an autonomous agent/LLM
journey; neither ClawHub publication nor discovery on skills.sh is implied by
copying this directory.

[Agent Skills format](https://agentskills.io/specification)
· [Hermes skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
· [OpenClaw skills](https://docs.openclaw.ai/tools/skills)
