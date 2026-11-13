# Scanner downloads and package registries

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Scanner%20downloads%20and%20package%20registries%20%28distribution%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Choose%20between%20an%20in-process%20language%20package%2C%20a%20browser%20module%2C%20the%20standalone%20qrscan%20command%20and%20an%20agent%20integration%20according%20to%20where%20the%20image%20is%20handled.%20A%20registry%20upload%2C%20a%20catalogue%20listing%20and%20a%20clean%20installation%20are%20separate%20facts%3B%20the%20route%20descriptions%20below%20retain%20those%20distinctions.%20Native%20optional%20npm%20dependencies%20are%20selected%20by%20their%20parent%20package%20rather%20than%20installed%20as%20independent%20SDKs.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20Scanner%20downloads%20and%20package%20registries%20%28distribution%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Choose%20between%20an%20in-process%20language%20package%2C%20a%20browser%20module%2C%20the%20standalone%20qrscan%20command%20and%20an%20agent%20integration%20according%20to%20where%20the%20image%20is%20handled.%20A%20registry%20upload%2C%20a%20catalogue%20listing%20and%20a%20clean%20installation%20are%20separate%20facts%3B%20the%20route%20descriptions%20below%20retain%20those%20distinctions.%20Native%20optional%20npm%20dependencies%20are%20selected%20by%20their%20parent%20package%20rather%20than%20installed%20as%20independent%20SDKs.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20Scanner%20downloads%20and%20package%20registries%20%28distribution%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Choose%20between%20an%20in-process%20language%20package%2C%20a%20browser%20module%2C%20the%20standalone%20qrscan%20command%20and%20an%20agent%20integration%20according%20to%20where%20the%20image%20is%20handled.%20A%20registry%20upload%2C%20a%20catalogue%20listing%20and%20a%20clean%20installation%20are%20separate%20facts%3B%20the%20route%20descriptions%20below%20retain%20those%20distinctions.%20Native%20optional%20npm%20dependencies%20are%20selected%20by%20their%20parent%20package%20rather%20than%20installed%20as%20independent%20SDKs.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Scanner%20downloads%20and%20package%20registries%20%28distribution%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Choose%20between%20an%20in-process%20language%20package%2C%20a%20browser%20module%2C%20the%20standalone%20qrscan%20command%20and%20an%20agent%20integration%20according%20to%20where%20the%20image%20is%20handled.%20A%20registry%20upload%2C%20a%20catalogue%20listing%20and%20a%20clean%20installation%20are%20separate%20facts%3B%20the%20route%20descriptions%20below%20retain%20those%20distinctions.%20Native%20optional%20npm%20dependencies%20are%20selected%20by%20their%20parent%20package%20rather%20than%20installed%20as%20independent%20SDKs.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/copilot-v1.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/deepseek-v1.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/meta-ai-v1.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/qwen-v1.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand Scanner downloads and package registries (distribution/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Choose between an in-process language package, a browser module, the standalone qrscan command and an agent integration according to where the image is handled. A registry upload, a catalogue listing and a clean installation are separate facts; the route descriptions below retain those distinctions. Native optional npm dependencies are selected by their parent package rather than installed as independent SDKs. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/distribution/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk https://qrcode-ai.com/en-US/barcode-scanner/sdk https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

Choose between an in-process language package, a browser module, the standalone qrscan command and an agent integration according to where the image is handled. A registry upload, a catalogue listing and a clean installation are separate facts; the route descriptions below retain those distinctions. Native optional npm dependencies are selected by their parent package rather than installed as independent SDKs.

The [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) are QR Code AI’s browser scanning entry points. For the corresponding development route, the [QR code scanner SDK guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk) and [barcode scanner SDK guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk) connect this documentation to the two product journeys. If a product page is unavailable, the instructions and references in this README remain the starting point for this source directory.

To prepare a known image to validate the installation route you chose, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator). Keep the original payload with the exported image so that you can compare the scan result with the value you intended to encode.

Choose an installation route for scanner engine 0.11.0. These packages scan QR
codes and barcodes locally and return the engine's report.

To try the engine locally in a browser, use the [WASM image example](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/crates/qrcode-ai-scanner-wasm/examples/README.md#scan-an-image-headlesshtml).

[Runtime packages](#published-runtime-packages) · [Packages that drive the CLI](#packages-that-drive-the-installed-cli)
· [CLI and containers](#cli-and-containers)
· [Browser CDNs and indexes](#browser-cdns-and-package-indexes) · [Agent integrations](#published-agent-integrations)

## Published runtime packages

| Runtime | Package | Version |
| --- | --- | --- |
| Rust | [`qrcode-barcode-scanner`](https://crates.io/crates/qrcode-barcode-scanner/0.11.0) | 0.11.0 |
| CLI | [`qrcode-barcode-scanner-cli`](https://crates.io/crates/qrcode-barcode-scanner-cli/0.11.0) | 0.11.0 |
| Node.js | [`@qrcode-ai-com/qrcode-barcode-scanner`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner/v/0.11.0) | 0.11.0 |
| Browser WASM | [`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm/v/0.11.0) | 0.11.0 |
| Python | [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/) | 0.11.0 |

See the [runtime quick starts](../README.md#get-started) for install commands
and examples. The Node.js package selects the matching native dependency
automatically from these six packages, all at **0.11.0**.

- macOS · [`darwin-arm64`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-darwin-arm64/v/0.11.0) · [`darwin-x64`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-darwin-x64/v/0.11.0)
- Linux · [`linux-arm64-gnu`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-linux-arm64-gnu/v/0.11.0) · [`linux-x64-gnu`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-linux-x64-gnu/v/0.11.0) · [`linux-x64-musl`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-linux-x64-musl/v/0.11.0)
- Windows · [`win32-x64-msvc`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-win32-x64-msvc/v/0.11.0)

## Packages that drive the installed CLI

These packages hold no decoder. Each one starts the `qrscan` command you installed
([CLI and containers](#cli-and-containers)) and returns its JSON report unchanged. One scan is
one process.

| Language | Package | Version | Works with |
| --- | --- | --- | --- |
| Go | [`github.com/qrcode-ai-com/qrcode-barcode-scanner-go`](https://pkg.go.dev/github.com/qrcode-ai-com/qrcode-barcode-scanner-go@v0.11.0) | 0.11.0 | `qrscan` 0.11.x |

```sh
go get github.com/qrcode-ai-com/qrcode-barcode-scanner-go@v0.11.0
```

The Go package needs Go 1.24 or later, uses the standard library only and has no C code. Its
guide is [`bindings/go`](../bindings/go/README.md). It is served from its own repository,
[`qrcode-ai-com/qrcode-barcode-scanner-go`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-go),
which is generated from this one and never edited by hand. Version 0.11.0 was installed through
the public Go proxy in an empty module, on Linux, macOS and Windows, and read the mixed fixture
in the three profiles.

## Browser CDNs and package indexes

- Browser WASM **0.11.0** from npm · [jsDelivr](https://cdn.jsdelivr.net/npm/@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0/auto.js) · [UNPKG](https://unpkg.com/@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0/auto.js) · [esm.sh](https://esm.sh/@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0/auto).
- API documentation and package metadata for **0.11.0** · [docs.rs](https://docs.rs/qrcode-barcode-scanner/0.11.0/qrcode_barcode_scanner/) · [deps.dev](https://deps.dev/npm/%40qrcode-ai-com%2Fqrcode-barcode-scanner/0.11.0) · [Libraries.io](https://libraries.io/npm/@qrcode-ai-com%2Fqrcode-barcode-scanner) · [Lib.rs](https://lib.rs/crates/qrcode-barcode-scanner).

The CDNs serve the npm browser package. The indexes describe the packages
published to npm or crates.io.

## Published agent integrations

These independently versioned integrations reuse the published
`@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` native engine. Choose the
interface your application or agent already supports:

| Integration | Public package | Install |
| --- | --- | --- |
| MCP stdio adapter | [`@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-mcp/v/0.3.1) | `npm install --save-exact --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1` |
| Portable skill | [`qrcode-barcode-scanner@0.2.0`](https://clawhub.ai/qrcode-ai-com/skills/qrcode-barcode-scanner) | `clawhub install qrcode-barcode-scanner --version 0.2.0` |
| OpenClaw plugin bundle | [`@qrcode-ai-com/qrcode-barcode-scanner@0.2.0`](https://clawhub.ai/qrcode-ai-com/plugins/qrcode-barcode-scanner) | `openclaw plugins install clawhub:@qrcode-ai-com/qrcode-barcode-scanner@0.2.0` |

MCP adapter 0.3.1 passed fresh public npm installations on **Linux x64 with
Node.js 22 and 24**. Its
[release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/agents-v0.3.1)
was published through GitHub Trusted Publishing; the public bytes match the
qualified archive, and npm serves provenance metadata. The npx acceptance
workflow also checks Linux and macOS from an empty home.
The skill and bundle passed registry installation and real
**OpenClaw 2026.11.1** runtime calls on macOS ARM64. Other clients and native
engine targets need their own installed-consumer checks.

Read the [MCP installation and stdio configuration](../integrations/mcp/),
[portable skill instructions](../skills/qrcode-barcode-scanner/) or
[bundle setup](../integrations/openclaw/) before activation. The bundle installs
its exact adapter dependency (MCP 0.2.0) through explicit setup. The adapter, skill and
bundle are versioned separately from the engine; adapter patch releases need
not change the other integration versions.

The [Official MCP Registry lists adapter 0.3.1](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.qrcode-ai-com%2Fqrcode-barcode-scanner/versions/0.3.1)
under `io.github.qrcode-ai-com/qrcode-barcode-scanner`. Its entry points to the
npm package at 0.3.1. Its separate publication completed in
[run 43267825878](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/43267825878).
Each additional client or catalogue has its own acceptance checks.

### Connect the published MCP adapter to OpenCode

From your working directory, install the pinned adapter and register it as a
[local OpenCode MCP server](https://opencode.ai/docs/mcp-servers/#local). Keep
the install directory in place because OpenCode stores its absolute path.

```sh
npm install --prefix ./.qrscan-mcp --save-exact --ignore-scripts \
  @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1
opencode mcp add qrscan -- "$(command -v node)" \
  "$PWD/.qrscan-mcp/node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp/src/cli.mjs"
opencode mcp list
```

The earlier 0.2.1 adapter on OpenCode 1.18.15 with Node.js 22.22.2 on macOS ARM64 reported
`connected` and the client discovered `scan_image`. A separate direct MCP
call on the same adapter version returned the QR payload and Code 128
`STOCK-4827` in `fast`, `frame`, and `full` with engine 0.11.0. To remove
the connection, delete `qrscan` from your OpenCode configuration.

### Install the portable skill from Git in a Codex project

From the project directory, install all five files of the 0.2.0 skill from
the pinned GitHub tree:

```sh
DISABLE_TELEMETRY=1 npx --yes skills@1.7.6 add \
  https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/610879c31302337a2b409b21bd18324e2fece178/skills/qrcode-barcode-scanner \
  --skill qrcode-barcode-scanner --agent codex --copy --yes
```

The [pinned skill README](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/610879c31302337a2b409b21bd18324e2fece178/skills/qrcode-barcode-scanner/README.md)
shows how to install the native engine and run the helper. On macOS ARM64 with
Node.js 22.22.2, this install matched all five source files. Its helper used
engine 0.11.0 and returned the QR payload and Code 128 `STOCK-4827` together
in `fast`, `frame`, and `full`. This route installs directly from GitHub.

To remove the skill from the project:

```sh
DISABLE_TELEMETRY=1 npx --yes skills@1.7.6 remove qrcode-barcode-scanner --agent codex --yes
```

On 11 November 2026 the same install put the five files in
`.agents/skills/qrcode-barcode-scanner`, and this command deleted that folder.
It leaves `skills-lock.json` in the project, with no skill listed.

### Install the portable skill in Hermes

Hermes Agent installs the skill from its GitHub path. No account is needed:

```sh
hermes skills install qrcode-ai-com/qrcode-barcode-scanner/skills/qrcode-barcode-scanner
```

Hermes follows the default branch: this form has no way to pin a commit. It
copies `SKILL.md`, `README.md`, `LICENSE`, `scripts/scan.mjs` and
`scripts/test.mjs` into `<HERMES_HOME>/skills/qrcode-barcode-scanner`. The
skill does not install the engine: follow its `SKILL.md` to install
`@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` into a project-local runtime
directory.

With Hermes 0.18.2 in a new, empty `HERMES_HOME` on macOS ARM64 and Node.js
22.22.2, the install passed Hermes' security scan without `--force`, the five
files matched this repository at `a91ad8f`, and the installed helper returned
the QR payload and Code 128 `STOCK-4827` together in `fast`, `frame`, and
`full`. `hermes skills uninstall qrcode-barcode-scanner` removed the
directory. `hermes skills search qrcode-barcode-scanner` also finds the
ClawHub listing of the same skill.

### Install the adapter or the skill from the release files

The [agents-v0.3.1 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/agents-v0.3.1)
carries the current MCP adapter archive. The skill archives retain their own
0.2.0 version on the [agents-v0.2.1 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/agents-v0.2.1).
These files are copies for installation from a release page instead of a registry:

| File | What it is | SHA-256 |
| --- | --- | --- |
| [`qrcode-ai-com-qrcode-barcode-scanner-mcp-0.3.1.tgz`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/agents-v0.3.1/qrcode-ai-com-qrcode-barcode-scanner-mcp-0.3.1.tgz) | The npm archive of adapter 0.3.1, byte for byte | `705b3223f6049024fd74ce2a41377b2586774304a9dab13b6619d19b1059308e` |
| [`qrcode-barcode-scanner-skill-0.2.0.zip`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/agents-v0.2.1/qrcode-barcode-scanner-skill-0.2.0.zip) | The five files of the skill at `610879c`, the commit of the tag | `ef84d7a2e4d1c949371fc2d1aa242e101c0e79e85de88027f6a9f9656fe2884c` |
| [`qrcode-barcode-scanner-skill-0.2.0.tar.gz`](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/agents-v0.2.1/qrcode-barcode-scanner-skill-0.2.0.tar.gz) | The same five files | `e73e7b5fe8c6da40ce5c1971e35d1f27d923aa8bf574eeb5c70b55e7a18899a8` |

Each release lists its own checksums. They share that release's trust and detect
damaged downloads; they do not independently authenticate a release. The 0.3.1
release also carries its producer and npm publication receipts.

Install the adapter from its file:

```sh
npm install --prefix ./.qrscan-mcp --save-exact --ignore-scripts \
  https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/agents-v0.3.1/qrcode-ai-com-qrcode-barcode-scanner-mcp-0.3.1.tgz
```

The file holds the adapter only. npm still fetches its dependencies from the
npm registry, among them engine 0.11.0. The integrity npm writes in your lock
file is the one the registry publishes for 0.3.1.

The skill archives have no top-level folder. Extract one into a folder named
`qrcode-barcode-scanner` inside the skill directory of your host:

```sh
curl -fsSLO https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/agents-v0.2.1/qrcode-barcode-scanner-skill-0.2.0.tar.gz
mkdir -p skills/qrcode-barcode-scanner
tar -xzf qrcode-barcode-scanner-skill-0.2.0.tar.gz -C skills/qrcode-barcode-scanner
```

The skill does not install the engine: follow its `SKILL.md`. To remove
either install, delete its folder: `./.qrscan-mcp` for the adapter,
`skills/qrcode-barcode-scanner` for the skill.

On macOS ARM64, the three files were fetched signed out and used as written
here. The adapter installed from its file in empty projects with Node.js
22.22.2 and 24.22.1 and answered modern and legacy MCP clients. Each skill
archive matched the five source files at `610879c` and passed its 26 checks
with Node.js 22.22.2 against a fresh engine 0.11.0. Every run returned the QR
payload and Code 128 `STOCK-4827` together in `fast`, `frame`, and `full`.

## CLI and containers

| Destination | Version | Platforms |
| --- | --- | --- |
| [GitHub Releases](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0) | 0.11.0 | macOS ARM64/x64, GNU/Linux ARM64/x64, [Windows x64](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-x86_64-pc-windows-msvc.zip), and source |
| [Homebrew tap](https://github.com/qrcode-ai-com/homebrew-tap) | 0.11.0 | macOS and GNU/Linux on ARM64/x64 |
| [Scoop bucket](https://github.com/qrcode-ai-com/scoop-bucket) | 0.11.0 | Windows x64 |
| [GitHub Debian packages](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/linux-packages-v0.11.0) | 0.11.0-1 | Debian 12 and Ubuntu 24.04, amd64 and arm64 |
| [AUR · qrcode-barcode-scanner-bin](https://aur.archlinux.org/packages/qrcode-barcode-scanner-bin) | 0.11.0-1 | Arch Linux x86_64 |
| [GitHub Fedora RPMs](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/rpm-packages-v0.11.0) | 0.11.0-1.fc44 | Fedora 44, x86_64 and aarch64 |
| [GitHub AppImage](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/appimage-v0.11.0) | 0.11.0 | GNU/Linux x86_64 and aarch64, C library 2.28 or later |
| [GitHub Container Registry](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/pkgs/container/qrcode-barcode-scanner) | 0.11.0 | Linux AMD64 and ARM64 |

Install `qrscan` through Homebrew.

```sh
brew install qrcode-ai-com/tap/qrscan
```

On Windows, install through Scoop.

```powershell
scoop bucket add qrcode-ai https://github.com/qrcode-ai-com/scoop-bucket
scoop install qrcode-ai/qrcode-barcode-scanner
```

The [Scoop Windows run](https://github.com/qrcode-ai-com/scoop-bucket/actions/runs/42226107417)
installed the public package, read the QR and Code 128 `STOCK-4827` together
in `fast`, `frame` and `full`, and uninstalled the CLI.
For direct downloads, follow the [CLI archive and checksum guide](cli/README.md#download-and-verify).

For Debian or Ubuntu, download the `.deb` for your architecture from the
[Linux package release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/linux-packages-v0.11.0).
Check the accompanying SHA-256, then run
`sudo apt install ./qrcode-barcode-scanner_0.11.0-1_amd64.deb` or substitute
the arm64 file. The [Debian package recipe](debian/README.md) documents the
build and removal. Fresh installs from the public assets passed the mixed
scan and removal on Debian 12 and Ubuntu 24.04 for both architectures.

On Arch Linux x86_64, clone the
[`qrcode-barcode-scanner-bin` AUR recipe](https://aur.archlinux.org/packages/qrcode-barcode-scanner-bin)
and run `makepkg -si`. The [Arch install guide](aur/README.md) covers the
existing `qrscan` command conflict. A clean Arch x86_64 container built from
the public recipe, installed the scanner, read both codes in all three profiles,
and removed the package. The container ran under x86-64 emulation.

On Fedora 44, download the [RPM release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/rpm-packages-v0.11.0),
verify its SHA-256, then run
`sudo dnf install ./qrcode-barcode-scanner-0.11.0-1.fc44.x86_64.rpm` or use the
aarch64 file. The [Fedora recipe](rpm/README.md) documents how to rebuild it.
Fresh Fedora 44 installs from the public downloads passed the mixed scan and
removal on both architectures. COPR follows its own publication process.

On any other GNU/Linux system, download the AppImage for your architecture from the
[AppImage release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/appimage-v0.11.0):
one file that runs `qrscan` with nothing to install. Check it against the accompanying SHA-256
list, make it executable and run it. The [AppImage recipe](appimage/README.md) documents the
build and the route for hosts without FUSE. The [public files](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/42953422833),
downloaded signed out, passed the mixed scan on an Ubuntu 22.04 runner and, with no network, on
AlmaLinux 8, Ubuntu 22.04 and Fedora containers, for both architectures. The AppImage catalogue
does not list it yet.

For containers, use the [public GHCR image 0.11.0](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/pkgs/container/qrcode-barcode-scanner)
on Linux AMD64 or ARM64. The [container guide](docker/v0.11/README.md#run-the-public-image)
shows how to scan an image locally using the verified index digest. Both
[native public consumers](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/42208687356)
pulled anonymously and ran the exact-content regression checks. The public
0.10 GHCR and Docker Hub images and 0.1 agent archives remain available below.

<details>
<summary>Historical installations: agent 0.1.0 and engine 0.10.0</summary>

## Historical 0.1.0 agent artifacts

> The source repository is now `qrcode-ai-com/qrcode-barcode-scanner`, transferred
> from `supernovae-st/qrcode-barcode-scanner`; the release links below were
> published at the earlier address, which redirects.
> Installation names, release assets, versions and hashes below remain unchanged.
> This rename does not publish a new scanner, container, MCP adapter or skill.
> See the [source and package contract](../SOURCE-AND-EXTRACTION.md).

The scanner engine is **0.10.0**. The local MCP adapter and portable
`qr-image-scanner` skill are **0.1.0**, distributed in the
[agents-v0.1.0 release](https://github.com/supernovae-st/qrcode-barcode-scanner/releases/tag/agents-v0.1.0).
Choose the interface your application or agent already supports.

**Shipping:** the GHCR and Docker Hub CLI images, GitHub MCP/skill release assets
and the ClawHub skill.
**Pending:** the MCP adapter's npm publication and MCP Registry/Glama/Smithery
admission. Discovery on skills.sh
is unverified. The native scanner engine itself is already published on npm
at 0.10.0; install the adapter using its GitHub archive URL below.

| Download | SHA256 |
| --- | --- |
| [MCP adapter archive](https://github.com/supernovae-st/qrcode-barcode-scanner/releases/download/agents-v0.1.0/supernovae-st-qrcode-ai-scanner-mcp-0.1.0.tgz) | `c97cc6565d3b5248552c0895cde31d4b204b313fcd9d89c3464fe0fd745556e1` |
| [Complete skill ZIP](https://github.com/supernovae-st/qrcode-barcode-scanner/releases/download/agents-v0.1.0/qr-image-scanner-0.1.0.zip) | `07740a0c553eef509074f04911daef2dd203e95067600936da05214c03a50942` |

The release also supplies [SHA256SUMS](https://github.com/supernovae-st/qrcode-barcode-scanner/releases/download/agents-v0.1.0/SHA256SUMS).
These exact files are publicly downloadable without an account.

## MCP: install the public archive

Use **Node.js 22.19+ on the 22 line, or 24+** and npm. Install the published
GitHub archive directly into a new project directory:

```sh
npm install --prefix ./qrscan-mcp-install --ignore-scripts --save-exact --no-audit --no-fund \
  https://github.com/supernovae-st/qrcode-barcode-scanner/releases/download/agents-v0.1.0/supernovae-st-qrcode-ai-scanner-mcp-0.1.0.tgz
```

The adapter installs the exact native engine 0.10.0 dependency. Generate a
stdio client configuration using the current Node executable and the absolute
installed entry path:

```sh
node -p 'JSON.stringify({mcpServers:{qrscan:{command:process.execPath,args:[require("node:path").resolve("qrscan-mcp-install/node_modules/@supernovae-st/qrcode-ai-scanner-mcp/src/cli.mjs")]}}},null,2)'
```

Apply that configuration in your MCP client's supported settings. The server
uses **stdio**, with stdout reserved for JSON-RPC. It exposes `scan_image`:

- `imageBase64`: canonical base64 image bytes, without a data-URL prefix.
- `profile`: `frame` by default, or `fast` / `full`.
- `budgetMs`: optional; **0 is unbounded**, rather than a hard deadline.

The tool accepts bytes, scans locally and returns the unchanged engine report
in `structuredContent` and JSON text. `qrscan://scan-report-schema` exposes the
report schema; `qrscan://limits` exposes the active limits. The default image
limits are 8 MiB decoded bytes, 4096 pixels per side and 16 million pixels,
with at most two active scans. Tool errors carry `isError: true`; a valid empty
detection is a successful report. The package includes its AGPL license and
[adapter documentation](https://github.com/supernovae-st/qrcode-barcode-scanner/blob/agents-v0.1.0/integrations/mcp/README.md).

## Skills: install from ClawHub or use the complete directory

[ClawHub publishes `@thibautmelen/qr-image-scanner` 0.1.0](https://clawhub.ai/thibautmelen/skills/qr-image-scanner). Its anonymous cold installation preserves all five original files and has been executed in a fresh OpenClaw profile.

```sh
openclaw skills install @thibautmelen/qr-image-scanner
```

Check the installed version against 0.1.0. The engine runtime is installed separately below.


Download and inspect `qr-image-scanner-0.1.0.zip`. Keep **all five files**:
`SKILL.md`, `README.md`, `LICENSE`, `scripts/scan.mjs` and `scripts/test.mjs`.
Copy its complete `qr-image-scanner` directory into the host's skill directory:

- Hermes: the active profile's `skills/qr-image-scanner` directory.
- OpenClaw: the agent workspace's `skills/qr-image-scanner` directory; its
  supported local installer is `openclaw skills install ./qr-image-scanner`.

Hermes' direct Markdown URL installer downloads only `SKILL.md`; use the
complete directory for this skill. The helper requires Node.js 22+ and a native
engine target. OpenClaw's own Node requirements may be higher.

Install the engine separately into a project-local runtime, outside the skill:

```sh
npm install --prefix .qr-image-scanner-runtime --ignore-scripts --no-audit --no-fund --save-exact \
  @supernovae-st/qrcode-ai-scanner@0.10.0
node ./qr-image-scanner/scripts/scan.mjs --engine-root .qr-image-scanner-runtime \
  --profile full --budget-ms 2000 -- ./images/example.png
```

Use the actual installed skill directory when invoking the helper. Pass filenames
as process arguments or quote them safely. The helper validates the explicit
runtime and refuses stale dependencies, ancestor fallbacks, native overrides
and dependency symlink escapes. It accepts regular local images up to 10 MiB,
4096 pixels per side and 16 million pixels. It prints the original report and
uses exits **0** for detections, **1** for a valid report without detections,
and **2** for an error. Read the installed `SKILL.md` for the complete contract.

The skill's original text and helpers are **MIT-0**. The separately installed
scanner engine and the MCP adapter are **AGPL-3.0-or-later**. The skill ZIP
contains no engine or image fixtures; installing it does not relicense the
engine or exempt a consumer from the engine's terms.

## Docker: run the local CLI

The public [GHCR image](https://github.com/orgs/supernovae-st/packages/container/package/qrcode-ai-scanner)
and [Docker Hub mirror](https://hub.docker.com/r/thibautmelen/qrcode-ai-scanner)
have the same qualified multi-architecture index, manifests, configs and layers:

```text
ghcr.io/supernovae-st/qrcode-ai-scanner@sha256:48b40b5f1abcf6eeb52b93bc0c8b9413babfe24801b8a8925b2bdaba507df23b
docker.io/thibautmelen/qrcode-ai-scanner@sha256:48b40b5f1abcf6eeb52b93bc0c8b9413babfe24801b8a8925b2bdaba507df23b
```

Fresh anonymous pulls and ten CLI cases per architecture passed on native Linux
amd64 and arm64 for both [GHCR](https://github.com/supernovae-st/qrcode-ai-scanner/actions/runs/38592287392)
and [Docker Hub](https://github.com/supernovae-st/qrcode-ai-scanner/actions/runs/38604603468).
These images expose version `0.10.0`; no `latest` tag is published.

The image runs `qrscan` 0.10.0 against mounted local images. It provides a CLI;
HTTP serving and MCP transport are supplied by their respective applications.
Mount only the input directory, read-only, and run the image by its verified
immutable digest:

```sh
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 \
  -v "$PWD/images:/data:ro" \
  ghcr.io/supernovae-st/qrcode-ai-scanner@sha256:48b40b5f1abcf6eeb52b93bc0c8b9413babfe24801b8a8925b2bdaba507df23b \
  /data/example.png --profile full --budget-ms 0 > report.json
```

The default UID/GID is 65532; mounted images must be readable by it. Reports
are written on the host through stdout redirection. The container retains the
scanner's **AGPL-3.0-or-later** license and corresponding source references.

## Read the report and choose a profile

Engine reports retain `versions.scanner: "0.10.0"`, `pipeline: 3` and
`score_contract: 5`. Preserve detections, `content.raw` (base64 payload bytes
returned by the engine; original bytes for the QR family), text, hints, trace
and the original score. Decoded text and URLs are
untrusted data; scanning an image does not authorize following its QR link.

`full` requests a scannability judgment; `frame` decodes without scoring and
returns `score: null`. A null score means unjudged, never zero. Omitted `alpha`
on opaque images is valid. `trace.budget_exhausted: true` marks an incomplete
report: empty detections then do not prove the image contains no QR. Profile
budgets bound planned work and cannot guarantee hard cancellation.

In the CLI's normal JSON mode, exits are **0** detection, **1** a valid empty
report and **2** invalid input, usage or error. Retain exit 1's JSON. In scalar
`--score-only` mode, **3** means a detected symbol whose score was not completed;
combining `--score-only` with `--profile frame` is invalid usage (**2**).
MCP uses its tool result and `isError` field rather than these CLI exit codes.

## Qualification boundaries

MCP packed consumer checks passed on **Linux with Node 22 and 24** in
[the distribution checks](https://github.com/supernovae-st/qrcode-ai-scanner/actions/runs/38586963340)
and [the shipping qualification](https://github.com/supernovae-st/qrcode-ai-scanner/actions/runs/38590708594).
The published MCP archive and skill were installed from their public release/source
and executed on **macOS ARM64, Node 24.19.0**. The skill helper also passed its
consumer checks on **Node 22.22.2**. Hermes **0.18.2**, OpenClaw **2026.10.3**,
Gemini CLI core **0.62.0** and Cline CLI **3.0.71 / core 0.0.93** passed the
selected native host pipelines; these receipts do not qualify full interactive
approval or chat journeys.

The CLI container is qualified separately on native **Linux amd64 and arm64**
runners. The engine's six published native targets additionally include macOS
Intel, Linux x64 musl and Windows x64 MSVC; engine qualification does not replace
an adapter or skill consumer test on those targets. ARMv7 and Linux musl ARM64
are outside this distribution's native engine targets.

</details>

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**. The license of each component is stated in its own license files.
