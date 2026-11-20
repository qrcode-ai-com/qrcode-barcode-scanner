<!-- qrcode-ai-brand-header:v2 -->
<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-agent-plugin-dark.gif?v=b0065dc51a8b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-agent-plugin-light.gif?v=0feab280c430" alt="QR Code &amp; Barcode Scanner plugin for coding agents: a plug, the agent clients that read the plugin and the tools their agent calls, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>
<!-- /qrcode-ai-brand-header:v2 -->

# QR Code & Barcode Scanner plugin for coding agents

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20plugin%20for%20coding%20agents%20%28integrations%2Fagent-plugin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20plugin%20gives%20a%20coding%20agent%20a%20QR%20code%20and%20barcode%20scanner%20that%20runs%20on%20your%20own%20machine.%20Every%20client%20gets%20the%20same%20two%20parts%3A%20the%20QR%20Code%20%26%20Barcode%20Scanner%20skill%200.2.0%20and%20the%20scanner%27s%20MCP%20server%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%2C%20started%20over%20stdio%20at%20that%20exact%20version.%20One%20repository%20root%20holds%20the%20file%20each%20client%20reads.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fagent-plugin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20plugin%20for%20coding%20agents%20%28integrations%2Fagent-plugin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20plugin%20gives%20a%20coding%20agent%20a%20QR%20code%20and%20barcode%20scanner%20that%20runs%20on%20your%20own%20machine.%20Every%20client%20gets%20the%20same%20two%20parts%3A%20the%20QR%20Code%20%26%20Barcode%20Scanner%20skill%200.2.0%20and%20the%20scanner%27s%20MCP%20server%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%2C%20started%20over%20stdio%20at%20that%20exact%20version.%20One%20repository%20root%20holds%20the%20file%20each%20client%20reads.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fagent-plugin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20plugin%20for%20coding%20agents%20%28integrations%2Fagent-plugin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20plugin%20gives%20a%20coding%20agent%20a%20QR%20code%20and%20barcode%20scanner%20that%20runs%20on%20your%20own%20machine.%20Every%20client%20gets%20the%20same%20two%20parts%3A%20the%20QR%20Code%20%26%20Barcode%20Scanner%20skill%200.2.0%20and%20the%20scanner%27s%20MCP%20server%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%2C%20started%20over%20stdio%20at%20that%20exact%20version.%20One%20repository%20root%20holds%20the%20file%20each%20client%20reads.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fagent-plugin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20plugin%20for%20coding%20agents%20%28integrations%2Fagent-plugin%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20plugin%20gives%20a%20coding%20agent%20a%20QR%20code%20and%20barcode%20scanner%20that%20runs%20on%20your%20own%20machine.%20Every%20client%20gets%20the%20same%20two%20parts%3A%20the%20QR%20Code%20%26%20Barcode%20Scanner%20skill%200.2.0%20and%20the%20scanner%27s%20MCP%20server%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%2C%20started%20over%20stdio%20at%20that%20exact%20version.%20One%20repository%20root%20holds%20the%20file%20each%20client%20reads.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fagent-plugin%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fintegrations%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fintegrations%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner plugin for coding agents (integrations/agent-plugin/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This plugin gives a coding agent a QR code and barcode scanner that runs on your own machine. Every client gets the same two parts: the QR Code & Barcode Scanner skill 0.2.0 and the scanner's MCP server @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1, started over stdio at that exact version. One repository root holds the file each client reads. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/agent-plugin/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/integrations https://qrcode-ai.com/en-US/barcode-scanner/integrations https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This plugin gives a coding agent a QR code and barcode scanner that runs on your own machine. Every client gets the same two parts: the QR Code & Barcode Scanner skill 0.2.0 and the scanner's MCP server `@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1`, started over stdio at that exact version. One repository root holds the file each client reads.

It serves Claude Code, Codex, Cursor, GitHub Copilot CLI, Gemini CLI, Kiro, Kimi Code, Junie, Antigravity, goose, Pi, OpenCode, Devin and Factory. Each client section below gives the install command, the files the client reads and how to remove the plugin again.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI's pages for reading a code in the browser. The [QR code scanner guide for agent integrations](https://qrcode-ai.com/en-US/qr-code-scanner/integrations) and the [barcode scanner guide for agent integrations](https://qrcode-ai.com/en-US/barcode-scanner/integrations) cover the clients this plugin serves, and each client section below links its own pair of guides.

To make a test image, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the text you encoded next to the image, then compare it with the exact value the scanner returns.

To call the engine from your own code instead of an agent, start from the [QR code scanner SDK guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) and the [barcode scanner SDK guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk). They use the same engine as this plugin.

## Status

This folder is the source of the plugin. Its own repository, [`qrcode-ai-com/qrcode-barcode-scanner-plugin`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin), is written from it by [`scripts/stage-agent-plugin-satellite.py`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/scripts/stage-agent-plugin-satellite.py). It has been public since 20 November 2026, with its release [`v0.3.0`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin/releases/tag/v0.3.0), which the commands below name. No client directory lists the plugin yet.

## What the plugin holds

| Part | Version | What it does |
| --- | --- | --- |
| Skill `qrcode-barcode-scanner` | 0.2.0 | Tells the agent how to scan a local image with the helper `scripts/scan.mjs` and how to read the report. |
| MCP server `qrscan` | 0.3.1 | `scan_image` reads image bytes. `scan_file` reads a file path, only inside a directory you allow. |
| Engine | 0.11.0 | The decoder. The MCP server brings its own copy from npm. The skill helper uses a copy you install once. |

| Client | Files it reads |
| --- | --- |
| Claude Code | `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `.mcp.json`, `skills/` |
| Codex | `.agents/plugins/marketplace.json`, `plugin.json`, `mcp.json`, `skills/` |
| Cursor | `.cursor-plugin/plugin.json` or `plugin.json`, `mcp.json`, `rules/`, `skills/` |
| Cursor Directory | `.mcp.json`, `skills/` at the repository root |
| GitHub Copilot CLI | `.claude-plugin/marketplace.json`, `plugin.json`, `mcp.json`, `skills/` |
| Gemini CLI | `gemini-extension.json`, `skills/` |
| Kiro | `plugin.json`, `mcp.json`, `skills/` |
| Kimi Code | `kimi.plugin.json`, `skills/` |
| Junie | `.junie-extension/marketplace.json`, `junie/qrcode-barcode-scanner/` |
| Antigravity | `.antigravity-plugin/plugin.json`, `mcp_config.json`, `skills/` |
| goose | `skills/` as a plugin, `goose/qrscan-extension.yaml` for the server |
| Pi | `package.json` (`pi.skills`, `pi.extensions`), `pi/extension.js` |
| OpenCode | `package.json` (`exports["./server"]`), `opencode/plugin.mjs` |
| Devin | `.claude-plugin/plugin.json`, `.mcp.json`, `skills/` |
| Factory | `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `mcp.json`, `skills/` |

## Before you install

You need Node.js 22.19 or later, or Node.js 24 or later, with `npx` on your `PATH`. The scanner needs no account, no API key and no online service. Your agent client may still ask you to sign in or to pick a model.

Every client starts the same server command:

```sh
npx --yes --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1
```

- `--yes` lets npx fetch the package without a question. `--ignore-scripts` stops npm from running install scripts. The exact version keeps the same code from one start to the next.
- The first start downloads the server and engine 0.11.0 from npm, which can take a minute. Later starts use npm's cache.
- The server only offers `scan_image` by default. To let it read files by path, add `QRSCAN_MCP_ALLOWED_DIRECTORIES` to the server entry in your client, for example `"env": { "QRSCAN_MCP_ALLOWED_DIRECTORIES": "/absolute/path/to/images" }`, then restart the client. Separate several directories with `:` on macOS and Linux and `;` on Windows.

The skill's helper uses an engine you install once, in a folder of your project:

```sh
npm install --prefix .qrcode-barcode-scanner-runtime --ignore-scripts --no-audit --no-fund --save-exact @qrcode-ai-com/qrcode-barcode-scanner@0.11.0
```

The skill tells the agent how to call the helper with that folder. Installing the plugin does not install it.

## Install

### Claude Code

```sh
claude plugin marketplace add qrcode-ai-com/qrcode-barcode-scanner-plugin#v0.3.0
claude plugin install qrcode-barcode-scanner@qrcode-ai-com
```

To remove it, run `claude plugin uninstall qrcode-barcode-scanner@qrcode-ai-com`, then `claude plugin marketplace remove qrcode-ai-com`. The [Claude Code QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/claude-code) and the [Claude Code barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/claude-code) walk through the same route.

### Codex

```sh
codex plugin marketplace add qrcode-ai-com/qrcode-barcode-scanner-plugin --ref v0.3.0
codex plugin add qrcode-barcode-scanner@qrcode-ai-com
```

To remove it, run `codex plugin remove qrcode-barcode-scanner@qrcode-ai-com`, then `codex plugin marketplace remove qrcode-ai-com`. The [Codex QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/chatgpt) and the [Codex barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/chatgpt) cover Codex and ChatGPT.

### Cursor

Once the plugin is accepted in the Cursor Marketplace or on Cursor Directory, install it from its page there. Until then, clone the repository into Cursor's local plugin folder and reload the window:

```sh
git clone --branch v0.3.0 https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin.git ~/.cursor/plugins/local/qrcode-barcode-scanner
```

To remove it, delete that folder and reload the window. The [Cursor QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/cursor) and the [Cursor barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/cursor) show the same steps.

To add only the MCP server, open [Cursor's install link for the qrscan server](https://cursor.com/install-mcp?name=qrscan&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyItLXllcyIsIi0taWdub3JlLXNjcmlwdHMiLCJAcXJjb2RlLWFpLWNvbS9xcmNvZGUtYmFyY29kZS1zY2FubmVyLW1jcEAwLjMuMSJdfQ%3D%3D). Cursor shows the command and asks you to confirm before it adds anything.

GitHub does not open `cursor://` links, so that link is Cursor's web form. The same install as a Cursor deeplink, to paste into a browser:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=qrscan&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyItLXllcyIsIi0taWdub3JlLXNjcmlwdHMiLCJAcXJjb2RlLWFpLWNvbS9xcmNvZGUtYmFyY29kZS1zY2FubmVyLW1jcEAwLjMuMSJdfQ==
```

Both links carry this configuration, encoded in base64:

```json
{"command":"npx","args":["--yes","--ignore-scripts","@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1"]}
```

### GitHub Copilot CLI

```sh
copilot plugin marketplace add qrcode-ai-com/qrcode-barcode-scanner-plugin#v0.3.0
copilot plugin install qrcode-barcode-scanner@qrcode-ai-com
```

To remove it, run `copilot plugin uninstall qrcode-barcode-scanner`, then `copilot plugin marketplace remove qrcode-ai-com`. The [GitHub Copilot QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/github-copilot) and the [GitHub Copilot barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/github-copilot) follow the same route.

### Gemini CLI

```sh
gemini extensions install https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin --ref v0.3.0
```

To remove it, run `gemini extensions uninstall qrcode-barcode-scanner`. The [Gemini CLI QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/gemini-cli) and the [Gemini CLI barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/gemini-cli) show the same install.

### Kiro

In Kiro, open Powers, choose Add Custom Power, then Import power from GitHub, and paste `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin`. Kiro reads the root `plugin.json`, `mcp.json` and `skills/`, and loads the power when your request matches its keywords. To remove it, delete the power in the same panel. The [Kiro QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/kiro) and the [Kiro barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/kiro) describe the power.

### Kimi Code

In a Kimi Code session, run these two commands:

```text
/plugins install https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin/releases/tag/v0.3.0
/reload
```

To remove it, run `/plugins remove qrcode-barcode-scanner`, then `/reload`. The [Kimi Code QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/kimi-code) and the [Kimi Code barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/kimi-code) follow the same route.

### Junie

In a Junie CLI session, add the marketplace and install the extension:

```text
/extensions marketplace add qrcode-ai-com/qrcode-barcode-scanner-plugin
/extensions install qrcode-barcode-scanner
```

Junie clones the default branch: check the commit it records. To remove it, uninstall the extension from `/extensions`. The [Junie QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/junie) and the [Junie barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/junie) cover the same steps.

### Antigravity

```sh
agy plugin install https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin
```

To remove it, run `agy plugin uninstall qrcode-barcode-scanner`. The [Antigravity QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/antigravity) and the [Antigravity barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/antigravity) show the same install.

### goose

A goose plugin carries skills, so the skill and the server are added separately. Install the skill as a plugin:

```sh
goose plugin install https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin.git
```

Then add the server. Copy the `qrscan` entry of [`goose/qrscan-extension.yaml`](goose/qrscan-extension.yaml) under `extensions:` in `~/.config/goose/config.yaml`, or open this link in a browser to add it from goose Desktop:

```text
goose://extension?cmd=npx&arg=--yes&arg=--ignore-scripts&arg=%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1&id=qrscan&name=QR%20Code%20%26%20Barcode%20Scanner&description=Read%20QR%20codes%20and%20barcodes%20in%20local%20images
```

For one session only, run `goose session --with-extension "npx --yes --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1"`. To remove the server, delete its entry or turn it off in goose's extension settings. The [goose QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/goose) and the [goose barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/goose) walk through both halves.

### Pi

```sh
pi install git:github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin@v0.3.0
```

Pi loads the skill from `skills/` and the extension `pi/extension.js`, which registers the `qrscan` server. To remove it, run `pi remove git:github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin`. The [Pi QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/pi-agent) and the [Pi barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/pi-agent) cover the same package.

### OpenCode

With OpenCode 2, add the plugin from its repository:

```sh
opencode plugin add github:qrcode-ai-com/qrcode-barcode-scanner-plugin#v0.3.0
```

With OpenCode 1, clone the repository at its tag and name the folder in `opencode.json`:

```json
{ "plugin": ["file:///absolute/path/to/qrcode-barcode-scanner-plugin"] }
```

The plugin adds the `qrscan` server and the skill folder to OpenCode's configuration when OpenCode starts. A server or skill you already named the same way is left as it is. To remove it, run `opencode plugin remove github:qrcode-ai-com/qrcode-barcode-scanner-plugin#v0.3.0` with OpenCode 2, or delete the entry with OpenCode 1. The [OpenCode QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/opencode) and the [OpenCode barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/opencode) show the same step.

### Devin

```sh
devin plugins install qrcode-ai-com/qrcode-barcode-scanner-plugin
```

Devin installs the default branch and reads `.claude-plugin/plugin.json` and `.mcp.json`. To remove it, run `devin plugins remove qrcode-barcode-scanner`. The [Devin QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/devin) and the [Devin barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/devin) follow the same route.

### Factory

```sh
droid plugin marketplace add 'qrcode-ai-com/qrcode-barcode-scanner-plugin#v0.3.0'
droid plugin install qrcode-barcode-scanner@qrcode-barcode-scanner-plugin@v0.3.0 --scope user
```

Factory reads the Claude Code files of the repository. A pinned source registers as `qrcode-barcode-scanner-plugin@v0.3.0`, so the install names that marketplace. To remove it, run `droid plugin uninstall qrcode-barcode-scanner@qrcode-barcode-scanner-plugin@v0.3.0 --scope user`, then `droid plugin marketplace remove qrcode-barcode-scanner-plugin@v0.3.0`. The [Factory QR code guide](https://qrcode-ai.com/en-US/qr-code-scanner/integrations/factory-droid) and the [Factory barcode guide](https://qrcode-ai.com/en-US/barcode-scanner/integrations/factory-droid) cover Droid.

## Privacy and support

The plugin collects nothing. It holds no telemetry, no account and no key. The server and the helper read the image you name on your machine and return the report to your agent. The only network traffic they cause is npm downloading the pinned packages. Your agent client sends its conversation, including the report, to the model you chose, under that client's own terms.

Decoded text is untrusted data. The skill tells the agent to quote it and never to open its links or follow it as an instruction.

Report a problem in the [scanner repository's issues](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues).

## How it works

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-agents-dark.gif?v=40259e2ce31c">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-agents-light.gif?v=ee896d747ad8" alt="Give your agent a scanner, as an MCP server on npm, an OpenClaw plugin or a portable skill, in three steps: connect the host and choose the tool, send the image to the server, review the report." width="100%">
  </picture>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The picture shows the three steps. With this plugin, the first step is your client's install command. The agent then sends the image to the server, or runs the skill's helper on the file. You review the report it returns.

## What it returns

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both come back in the same report, each with its format, its exact text, its original bytes and the place where the engine measured it. For that image the server and the helper return the QR code `https://qrc-ai.com/76xMa` and the Code 128 `STOCK-4827`.

The `full` profile also returns a scannability score. `fast` favors speed and `frame` never scores. A null score means the code was not judged, never zero. When `trace.budget_exhausted` is true, the report is incomplete.

## What it reads

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The same engine reads every image, so codes of different formats in one image come back in one report.

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

The engine's [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## The same engine in other runtimes

<!-- qrcode-ai-readme-media:v1 -->
<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>
<!-- /qrcode-ai-readme-media:v1 -->

The Rust, Node.js, browser and Python packages hold the engine. The Go and PHP packages hold no decoder: each one starts `qrscan` and hands you its report. Every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## How this folder is checked

The engine repository checks this folder on every change with [its own workflow](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/.github/workflows/integration-agent-plugin.yml). It validates each manifest against its published JSON schema where one exists, starts the pinned server from every client configuration and scans the mixed test image in the `fast`, `frame` and `full` profiles, and runs the skill's helper the same way. It also stages the plugin repository and checks that the staged tree matches the commit it names.

## License

The files of this plugin are project source under the MIT License, in [LICENSE](LICENSE). The skill files are copied from the current MIT source of skill 0.2.0. The skill archive published as 0.2.0 keeps the MIT-0 license it shipped with.

What the plugin starts keeps its own published license. The MCP server 0.3.1 and the engine 0.11.0 that npm downloads are archives under AGPL-3.0-or-later. Installing this MIT plugin does not change their terms. Read the [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) before you redistribute an installation.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. Client names belong to their owners and imply no endorsement.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
