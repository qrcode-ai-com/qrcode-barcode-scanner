<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-mcp-dark.gif?v=b585c4a58dad">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/banner-mcp-light.gif?v=6bc9fb70ba28" alt="QR Code &amp; Barcode Scanner MCP: the MCP mark, the client configuration that starts the server, and a QR code and a barcode being read" width="100%">
    </picture>
  </a>
</p>

# QR Code & Barcode Scanner MCP Bundle

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20Bundle%20%28distribution%2Fmcpb%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20builds%20the%20MCP%20Bundle%20of%20the%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%2C%20version%200.3.1%3A%20one%20.mcpb%20file%20that%20Claude%20for%20macOS%20and%20Windows%2C%20and%20other%20MCPB%20hosts%2C%20install%20in%20one%20step.%20The%20bundle%20holds%20the%20published%20npm%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%2C%20the%20scanner%20engine%200.11.0%20and%20its%20six%20native%20packages%2C%20so%20the%20server%20starts%20and%20scans%20with%20no%20network%20and%20no%20install%20command.%20Nothing%20is%20compiled%3A%20scripts%2Fbuild-mcpb-bundle.py%20takes%20each%20package%20from%20its%20npm%20registry%20arch%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fmcpb%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20Bundle%20%28distribution%2Fmcpb%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20builds%20the%20MCP%20Bundle%20of%20the%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%2C%20version%200.3.1%3A%20one%20.mcpb%20file%20that%20Claude%20for%20macOS%20and%20Windows%2C%20and%20other%20MCPB%20hosts%2C%20install%20in%20one%20step.%20The%20bundle%20holds%20the%20published%20npm%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%2C%20the%20scanner%20engine%200.11.0%20and%20its%20six%20native%20packages%2C%20so%20the%20server%20starts%20and%20scans%20with%20no%20network%20and%20no%20install%20command.%20Nothing%20is%20compiled%3A%20scripts%2Fbuild-mcpb-bundle.py%20takes%20each%20package%20from%20its%20npm%20registry%20arch%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fmcpb%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20Bundle%20%28distribution%2Fmcpb%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20builds%20the%20MCP%20Bundle%20of%20the%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%2C%20version%200.3.1%3A%20one%20.mcpb%20file%20that%20Claude%20for%20macOS%20and%20Windows%2C%20and%20other%20MCPB%20hosts%2C%20install%20in%20one%20step.%20The%20bundle%20holds%20the%20published%20npm%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%2C%20the%20scanner%20engine%200.11.0%20and%20its%20six%20native%20packages%2C%20so%20the%20server%20starts%20and%20scans%20with%20no%20network%20and%20no%20install%20command.%20Nothing%20is%20compiled%3A%20scripts%2Fbuild-mcpb-bundle.py%20takes%20each%20package%20from%20its%20npm%20registry%20arch%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fmcpb%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20Bundle%20%28distribution%2Fmcpb%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20This%20folder%20builds%20the%20MCP%20Bundle%20of%20the%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20server%2C%20version%200.3.1%3A%20one%20.mcpb%20file%20that%20Claude%20for%20macOS%20and%20Windows%2C%20and%20other%20MCPB%20hosts%2C%20install%20in%20one%20step.%20The%20bundle%20holds%20the%20published%20npm%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-mcp%400.3.1%2C%20the%20scanner%20engine%200.11.0%20and%20its%20six%20native%20packages%2C%20so%20the%20server%20starts%20and%20scans%20with%20no%20network%20and%20no%20install%20command.%20Nothing%20is%20compiled%3A%20scripts%2Fbuild-mcpb-bundle.py%20takes%20each%20package%20from%20its%20npm%20registry%20arch%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fdistribution%2Fmcpb%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner MCP Bundle (distribution/mcpb/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): This folder builds the MCP Bundle of the QR Code & Barcode Scanner MCP server, version 0.3.1: one .mcpb file that Claude for macOS and Windows, and other MCPB hosts, install in one step. The bundle holds the published npm package @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1, the scanner engine 0.11.0 and its six native packages, so the server starts and scans with no network and no install command. Nothing is compiled: scripts/build-mcpb-bundle.py takes each package from its npm registry arch Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/mcpb/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/mcp https://qrcode-ai.com/en-US/barcode-scanner/mcp https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

This folder builds the MCP Bundle of the QR Code & Barcode Scanner MCP server, version 0.3.1: one `.mcpb` file that Claude for macOS and Windows, and other MCPB hosts, install in one step. The bundle holds the published npm package `@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1`, the scanner engine 0.11.0 and its six native packages, so the server starts and scans with no network and no install command. Nothing is compiled: `scripts/build-mcpb-bundle.py` takes each package from its npm registry archive, which the lockfile pins by integrity. No release holds the bundle yet, and Smithery does not list it yet.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) let you try the engine in a browser first. To connect the server to a client, read the [QR code scanner MCP guide](https://qrcode-ai.com/en-US/qr-code-scanner/mcp) and the [barcode scanner MCP guide](https://qrcode-ai.com/en-US/barcode-scanner/mcp).

To make a test image with a known payload, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), and keep the payload you encoded to compare it with the scan.

## Files

- `manifest.json`: the MCPB manifest, version 0.3. It names the server, its two tools, its one optional setting, the three platforms and the Node.js range of the server.
- `server/launch.mjs`: the entry point. It turns the folders the host passes into the server's `QRSCAN_MCP_ALLOWED_DIRECTORIES`, then starts the published server unchanged.
- `package.json` and `package-lock.json`: the one dependency, the MCP server 0.3.1, and the eleven packages it installs, each with its registry address and sha512.
- `check/`: the consumer that installs a bundle as a host does and drives its server over MCP stdio, with the lockfile of the official MCPB tool 2.1.2 that it uses.

The builder adds the icon (`integrations/vscode/images/icon.png`), `LICENSE.md`, `SOURCE.md`, the engine's third-party notices and the MIT license of the files above.

| Platform | Native package in the bundle |
| --- | --- |
| macOS arm64 and x64 | `darwin-arm64`, `darwin-x64` |
| Linux x64 and arm64, glibc | `linux-x64-gnu`, `linux-arm64-gnu` |
| Linux x64, musl | `linux-x64-musl` |
| Windows x64 | `win32-x64-msvc` |

## Install it

No release holds the bundle yet: build it as below. Then open `qrcode-barcode-scanner-0.3.1.mcpb` with your MCPB host. Claude for macOS and Windows shows an installation dialog with the extension's setting, and Node.js ships with it. Another host needs Node.js 22.19 or later on line 22, or 24 or later: the range the server declares, which the manifest repeats in `compatibility.runtimes.node`.

## Allowed folders

With no setting, the server offers one tool, `scan_image`: it reads the codes in image bytes that the client sends as base64. The setting **Folders the scanner may read** adds `scan_file`, which reads an image file by its path, inside the chosen folders only. A path outside them is refused. A path is also much shorter for a client to pass than the base64 text of an image.

The host passes the chosen folders to `server/launch.mjs` as arguments. The launcher requires each one to be an absolute path, refuses a folder whose path holds the path list separator (`:` on macOS and Linux, `;` on Windows), and hands the folders to the server in `QRSCAN_MCP_ALLOWED_DIRECTORIES`, separated like `PATH`. The server allows at most 16 folders; a folder that does not exist, or a filesystem root, stops it at start with a message. Allow a folder made for images, not your home folder. A `QRSCAN_MCP_ALLOWED_DIRECTORIES` inherited from the host's environment is not used: the setting is the only grant. The bundle sets no other `QRSCAN_MCP_*` variable; the [MCP server](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/mcp/README.md) documents each limit and its default.

## Privacy

The bundle needs no network: its tests run it in containers that have none. At runtime the server makes no network call and sends no telemetry, and it never opens a link it decodes. The scanner runs in the native package of your platform, in the server's own process. Your host may send tool results to its model provider under its own settings; the bundle does not control that. Decoded text is untrusted data: a QR code can hold any text, including instructions aimed at an agent, and the server returns it in its report as data.

## Build and check it

From the root of the engine repository, with Python 3 and Node.js 22 or 24:

```sh
python3 scripts/build-mcpb-bundle.py --self-test
python3 scripts/build-mcpb-bundle.py build --out /tmp/qrscan-mcpb
python3 scripts/build-mcpb-bundle.py verify /tmp/qrscan-mcpb/qrcode-barcode-scanner-0.3.1.mcpb
(cd distribution/mcpb/check && npm ci --ignore-scripts)
node distribution/mcpb/check/consumer.mjs /tmp/qrscan-mcpb/qrcode-barcode-scanner-0.3.1.mcpb \
  fixtures/symbology/mixed-code128-qr.png
```

`build` reads the files of this folder at a commit (`HEAD` by default, another with `--revision`), not from the working tree. It downloads the eleven archives, or reads them from `--cache`, and checks each sha512, each license file and each native addon. Then it writes the bundle, its `SHA256SUMS` file and `build-receipt.json`, which records the Python and zlib versions. The entries are sorted, carry fixed modes and the date of the commit in UTC (or `SOURCE_DATE_EPOCH`), so one commit gives the same bytes on any machine and in any time zone. `verify` builds again and compares. The builder uses only the Python standard library. The bundle is about 14 MB and holds about 1,000 files.

When this folder was written, builds on macOS arm64 (Python 3.14.5, zlib 1.2.12) and on Ubuntu 24.04 (Python 3.12.3, zlib 1.3) gave the same bytes.

## How it is tested

The workflow `.github/workflows/mcpb.yml` of the [engine repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust) builds the bundle twice, the second time in another time zone and without the download cache, and requires the same file. It then runs the consumer on Linux x64 and arm64, macOS arm64 and x64 and Windows x64 runners, with Node.js 22 and, on three of them, 24. It runs it again with no network, in a glibc and in a musl container. The consumer:

- unpacks the bundle with the official MCPB tool and checks its manifest with `mcpb validate`;
- starts the server from the manifest's `mcp_config`, as a host does, for eight settings: none, empty, one folder, two folders, a folder inherited from the environment, a folder holding the separator, a relative folder and a missing folder;
- speaks MCP over stdio: `initialize`, then `tools/list`, which offers `scan_file` only when folders are set;
- calls `scan_image` on the [mixed QR and Code 128 sample](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/v0.11.0/fixtures/symbology/mixed-code128-qr.png) with the fast, frame and full profiles, and requires both payloads exactly;
- calls `scan_file` on the sample inside an allowed folder, with the same result, and requires a path outside the folders to be refused.

When this folder was written, the consumer passed on macOS arm64 with Node.js 22.22.2, and with no network in glibc containers on arm64 and x64 and in a musl container on x64. Windows, macOS x64 and Node.js 24 are checked by the workflow only.

## Release it

[RELEASING.md](../../RELEASING.md#mcp-bundle) has the steps. On a tag `mcpb-v0.3.1`, the workflow builds and tests the bundle, then its job `attest`, in the protected environment `mcpb`, builds the tagged commit again, requires the same bytes and records their build provenance in GitHub's attestations. No workflow creates the release: the owner creates `mcpb-v0.3.1` and attaches the attested file and its `SHA256SUMS`. Anyone can then check a downloaded file:

```sh
gh attestation verify qrcode-barcode-scanner-0.3.1.mcpb --repo qrcode-ai-com/qrcode-barcode-scanner-rust
```

## Smithery

Smithery does not list this bundle and takes no new server. It shut down its accounts, API and CLI on 31 October 2026 and stays a public directory of servers it verifies itself ([smithery.ai/future](https://www.smithery.ai/future)). Install the bundle from its release file instead.

## How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-agents-dark.gif?v=40259e2ce31c">
    <img src="https://raw.githubusercontent.com/qrcode-ai-com/.github/main/profile/assets/journey-agents-light.gif?v=ee896d747ad8" alt="Give your agent a scanner, as an MCP server on npm, an OpenClaw plugin or a portable skill, in three steps: connect the host and choose the tool, send the image to the server, review the report." width="100%">
  </picture>
</p>

The picture shows the three steps of the agent route: connect the client and choose the tool, send the image to the server, and review the report.

## What it returns

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#examples">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-dark.png?v=385593c1c18d">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png?v=7f958679adcc" alt="A QR code and Code 128 decoded from the same image, each outlined where the engine measured it" width="100%">
    </picture>
  </a>
</p>

The picture is a recorded scan of one image that holds a QR code and a Code 128 barcode. Both come back in the same report, each with its format, its exact text and the place where the engine measured it.

## What it reads

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-dark.gif?v=92fa0e8084df">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/formats-light.gif?v=bdfe5fc5f9b3" alt="The code families the engine reads: QR codes, matrix and stacked codes such as Data Matrix, retail barcodes such as EAN-13, and other linear barcodes such as Code 128" width="100%">
    </picture>
  </a>
</p>

The same engine reads every destination’s images, so codes of different formats in one image come back in one report.

- QR: QR Code, Micro QR, rectangular Micro QR (rMQR)
- Matrix and stacked: Data Matrix, Aztec, PDF417, MaxiCode
- Retail: EAN-13, EAN-8, UPC-A, UPC-E
- Other linear: Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar, GS1 DataBar Expanded, Telepen

The engine’s [supported formats](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#supported-formats) section states the known limits.

## The same engine in other runtimes

<p align="center">
  <a href="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#get-started">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-dark.png?v=57c63428574b">
      <img src="https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/runtimes-light.png?v=6dbd5a8cf5ba" alt="One engine in the language you write: Rust on crates.io, Node.js and the browser on npm, Python on PyPI, Go, PHP, and the qrscan command line" width="100%">
    </picture>
  </a>
</p>

The Rust, Node.js, browser and Python packages hold the engine. The Go and PHP packages hold no decoder: each one starts `qrscan` and hands you its report. Every route is listed in the [scanner repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust).

## License

The bundle holds the MCP server 0.3.1, the scanner engine 0.11.0 and its six native packages, licensed AGPL-3.0-or-later in these published versions, the MCP SDK 2.3.1, licensed Apache-2.0, and zod 4.6.7, licensed MIT. Each package keeps its own license file, and the bundle adds the engine's third-party notices, so the manifest declares `AGPL-3.0-or-later AND Apache-2.0 AND MIT`. `LICENSE.md` in the bundle lists every part and its license text, and `SOURCE.md` names the corresponding source. The files of this folder are project source, available under the MIT License described below. They do not change the license of the packages the bundle holds. The icon is the QR Code AI logo; no license of the bundle grants a trademark right.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
