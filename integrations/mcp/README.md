# QR Code & Barcode Scanner MCP

<!-- qrcode-ai-readme-actions:v1 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20%28integrations%2Fmcp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Scan%20QR%20codes%20and%20barcodes%20from%20images%20in%20your%20MCP%20client.%20This%20local%20stdio%20server%20preserves%20decoded%20payload%20bytes%20and%20returns%20formats%20and%20the%20scanner%27s%20JSON%20report%2C%20with%20QR%20scannability%20diagnostics%20when%20requested.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fmcp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20%28integrations%2Fmcp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Scan%20QR%20codes%20and%20barcodes%20from%20images%20in%20your%20MCP%20client.%20This%20local%20stdio%20server%20preserves%20decoded%20payload%20bytes%20and%20returns%20formats%20and%20the%20scanner%27s%20JSON%20report%2C%20with%20QR%20scannability%20diagnostics%20when%20requested.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fmcp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://aistudio.google.com/prompts/new_chat?prompt=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20%28integrations%2Fmcp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Scan%20QR%20codes%20and%20barcodes%20from%20images%20in%20your%20MCP%20client.%20This%20local%20stdio%20server%20preserves%20decoded%20payload%20bytes%20and%20returns%20formats%20and%20the%20scanner%27s%20JSON%20report%2C%20with%20QR%20scannability%20diagnostics%20when%20requested.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fmcp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20%28integrations%2Fmcp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Scan%20QR%20codes%20and%20barcodes%20from%20images%20in%20your%20MCP%20client.%20This%20local%20stdio%20server%20preserves%20decoded%20payload%20bytes%20and%20returns%20formats%20and%20the%20scanner%27s%20JSON%20report%2C%20with%20QR%20scannability%20diagnostics%20when%20requested.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fmcp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20MCP%20%28integrations%2Fmcp%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20Scan%20QR%20codes%20and%20barcodes%20from%20images%20in%20your%20MCP%20client.%20This%20local%20stdio%20server%20preserves%20decoded%20payload%20bytes%20and%20returns%20formats%20and%20the%20scanner%27s%20JSON%20report%2C%20with%20QR%20scannability%20diagnostics%20when%20requested.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fintegrations%2Fmcp%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fmcp%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)

Choose an AI assistant to explain this destination using its public sources. Gemini opens Google AI Studio. The link includes the public question; sign-in or a manual paste may be required. Check the answer against the documentation.

<details>
<summary>Copy the question</summary>

```text
Help me understand QR Code & Barcode Scanner MCP (integrations/mcp/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): Scan QR codes and barcodes from images in your MCP client. This local stdio server preserves decoded payload bytes and returns formats and the scanner's JSON report, with QR scannability diagnostics when requested. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/integrations/mcp/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/mcp https://qrcode-ai.com/en-US/barcode-scanner/mcp https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

[![Add to Cursor](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/cursor-v1.svg)](https://cursor.com/install-mcp?name=qrscan&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyItLXllcyIsIi0taWdub3JlLXNjcmlwdHMiLCJAcXJjb2RlLWFpLWNvbS9xcmNvZGUtYmFyY29kZS1zY2FubmVyLW1jcEAwLjMuMSJdfQ%3D%3D)
[![Add to VS Code](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/vscode-v1.svg)](https://vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522qrscan%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522--yes%2522%252C%2522--ignore-scripts%2522%252C%2522%2540qrcode-ai-com%252Fqrcode-barcode-scanner-mcp%25400.3.1%2522%255D%257D)

Open your editor to review the pinned MCP configuration before adding it. Node.js must already be installed; local file access remains disabled by default.

<!-- /qrcode-ai-readme-actions:v1 -->

Scan QR codes and barcodes from images in your MCP client. This local stdio
server preserves decoded payload bytes and returns formats and the scanner's
JSON report, with QR scannability diagnostics when requested.

Use `scan_image` for image bytes. Adapter 0.3.1 also provides
[`scan_file`](#scan-a-file-by-path-scan_file) for images inside directories
explicitly allowed by the operator. Both use the published
[`@qrcode-ai-com/qrcode-barcode-scanner` 0.11.0 engine](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner).

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **MCP server guide** | [QR code scanner MCP server](https://qrcode-ai.com/en-US/qr-code-scanner/mcp) | [Barcode scanner MCP server](https://qrcode-ai.com/en-US/barcode-scanner/mcp) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

[Install](#install) · [Connect a client](#connect-a-client) · [Tool contract](#tool-contract) · [Limits](#input-and-authority-limits) · [Source](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/integrations/mcp)

| Component | Version | Purpose |
| --- | --- | --- |
| MCP adapter | 0.3.1 | Local stdio transport, tool validation and read-only resources |
| Scanner engine | 0.11.0 | Native QR, barcode and matrix-code decoding and QR diagnostics |
| Report | Pipeline 5 · score contract 5 | The unchanged engine report and packaged JSON schema |

## Install

Use Node.js **22.19+ on the 22 line, or 24+**. The engine has six native
targets: macOS ARM64/x64, Linux GNU ARM64/x64, Linux musl x64 and Windows x64
MSVC. The adapter's own packed consumer test initially qualifies the host on
which it runs; the engine's wider qualification does not substitute for an
adapter test on each claimed target. ARMv7 and musl ARM64 are unsupported.

The release workflow installs each version in a clean project, before and
after its upload, and runs modern and legacy official SDK clients against it
on Linux x64 with Node.js 22 and 24.
See the [0.3.1 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/agents-v0.3.1)
for provenance and verification. Product-client integrations have separate
installed-consumer checks.

Install the exact adapter version from the public npm registry:

```sh
npm install --prefix ./qrscan-mcp-install --save-exact --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1
```

Version 0.3.1 is published on npm. It adds the
[`scan_file`](#scan-a-file-by-path-scan_file) tool, which stays off unless the
operator names the directories it may read. `scan_image`, the scanner 0.11.0
and the report are unchanged. For any later source version, check the
[exact npm version](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-mcp/v/0.3.1)
before using its installation command. A checked-in manifest, `server.json` or
successful build does not establish that a version has been published.

The package installs its declared dependencies explicitly. Starting the server
does not run a package manager or download missing dependencies. For a reviewed
offline archive, replace the package spec above with its absolute `.tgz` path;
installing that archive alone is not proof of registry availability.

## Connect a client

The server entry is
`qrscan-mcp-install/node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp/src/cli.mjs`.
Use its absolute path and your absolute Node executable in a client config:

```json
{
  "mcpServers": {
    "qrscan": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/qrscan-mcp-install/node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp/src/cli.mjs"]
    }
  }
}
```

The `mcpServers` shape is a common client convention. Use your client's current
configuration location and check that it discovers `scan_image`,
`qrscan://scan-report-schema` and `qrscan://limits`. The installed executable
also appears as `qrscan-mcp`; the explicit Node and script paths above make the
selected runtime and installed copy unambiguous.

### Start it with npx

Start the published adapter with `npx`, an exact version and no install script:

```json
{
  "mcpServers": {
    "qrscan": {
      "command": "npx",
      "args": ["--yes", "--ignore-scripts", "@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1"]
    }
  }
}
```

- **An exact version, never a range or `latest`.** The client runs the version
  that was qualified, and a newer one reaches it only when this entry changes.
- The first start downloads the adapter and its dependencies from npm into
  npm's cache, then runs it. Later starts reuse that copy. As with any npm
  install without a lock file, what the adapter's three pinned dependencies
  depend on is resolved when that copy is made.
- `--ignore-scripts` keeps npm from running any install script on the way.
- To run a reviewed copy that never contacts npm at start, use the installed
  form above, with absolute paths.
- To remove it, delete the entry from the client. The files npx kept are
  under `_npx` in npm's cache (`npm config get cache`).

The repository's `Destination acceptance` workflow starts the published 0.3.1
through these npx options in an empty home, on Linux with Node.js 22 and 24 and
on macOS with Node.js 24. It reads the QR code and the Code 128 through
`scan_image` in the three profiles. Windows is not checked: a client there may
need to start `npx` through `cmd`.

The [0.3.1 release workflow](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/43208185486)
qualified its packed archive, published it through GitHub Trusted Publishing,
then installed and tested the public npm version on Linux x64 with Node.js 22
and 24. Bundles keep their own versions until their installed-client checks pass.

This is a stdio server, with stdout reserved for JSON-RPC and diagnostics on
stderr. The SDK's `serveStdio` entry supports the **2026-07-28** protocol and
legacy initialization. No HTTP service or hosted MCP endpoint is included.
Find version 0.3.1 in the
[Official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.qrcode-ai-com%2Fqrcode-barcode-scanner/versions/0.3.1)
under `io.github.qrcode-ai-com/qrcode-barcode-scanner`. The entry points to the
same npm package and stdio transport described here. For a specific product
client, verify tool discovery and a fixture call after installation.

## Tool contract

Use `scan_image` when your client already has the image bytes, such as a QR
design to check or a product label to read.

`scan_image` accepts exactly these fields:

| Field | Meaning |
| --- | --- |
| `imageBase64` | Nonempty canonical RFC 4648 base64 of image bytes. No whitespace or data-URL prefix. |
| `profile` | `frame` (default), `fast`, or `full`. Frame decodes without scoring; full applies the full score profile. |
| `budgetMs` | Optional integer 0–60000. Unset keeps the engine profile default. **0 is unbounded.** |

Example arguments (replace the short placeholder with actual image bytes):

```json
{ "imageBase64": "<canonical base64 image>", "profile": "full", "budgetMs": 0 }
```

Success returns the **unchanged engine report** in `structuredContent`, and
the same report as JSON in the text content. Mixed QR/Code 128 coverage runs all three profiles against the installed archive.
Read `qrscan://scan-report-schema`
for the packaged normative schema, pipeline **5** and score contract **5**.
The adapter does not summarize, normalize or replace values:

- `content.raw` retains exact payload bytes in base64, including binary data.
- `detections: []` is a valid successful result.
- `score: null` means no published judgment; never interpret it as zero.
- Opaque images retain the engine's omitted `alpha` field.
- `trace.budget_exhausted: true` marks an incomplete report. Empty detections
  then do not prove that the image contains no QR code.
- `trace.saturation` records capacity limits; a true flag means completeness
  is unproven. Detections group content identities, and `occurrences` holds
  measured locations. Neither count proves the total symbols in an image.

Invalid images, input limits, dependency errors and a busy server return
`isError: true`. Engine errors retain their `QRS-xxx` code. Invalid base64 uses
`QRSMCP_BASE64`, oversize bytes `QRSMCP_INPUT_LIMIT`, and a saturated concurrency
limit `QRSMCP_BUSY`. Unknown fields and unsupported options are rejected.

### Scan a file by path: `scan_file`

An agent rarely holds image bytes: it holds a path, and a real image is too
long to write out as a base64 argument. `scan_file` reads the file itself.
It ships since **adapter 0.3.1**; the 0.2.1 package has `scan_image` only.

The tool is **off by default**. It exists only when the operator who starts
the server names the directories it may read:

```json
{
  "mcpServers": {
    "qrscan": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/qrscan-mcp-install/node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp/src/cli.mjs"],
      "env": { "QRSCAN_MCP_ALLOWED_DIRECTORIES": "/absolute/path/to/images" }
    }
  }
}
```

Several directories are separated like `PATH`: `:` on macOS and Linux, `;` on
Windows. With the variable unset, a client sees the same bytes-only server as
before, and `scan_file` is not listed.

| Field | Meaning |
| --- | --- |
| `path` | Absolute path of one image file inside an allowed directory, at most 4096 characters. |
| `profile` | Same as `scan_image`. |
| `budgetMs` | Same as `scan_image`. |

```json
{ "path": "/absolute/path/to/images/label.png", "profile": "full", "budgetMs": 0 }
```

The result is the same unchanged engine report as `scan_image` gives for the
same bytes. Both tools share the byte, pixel and concurrency limits. A refusal
returns `isError: true` with one of these codes:

| Code | When |
| --- | --- |
| `QRSMCP_PATH` | The path is relative, holds a NUL character or is too long. |
| `QRSMCP_PATH_DENIED` | The path does not lead inside an allowed directory. The answer is the same whether the file exists or not. |
| `QRSMCP_FILE` | Inside an allowed directory, but missing, empty, a directory, a pipe or another non-regular file, or changed while it was read. |
| `QRSMCP_INPUT_LIMIT` | The file is larger than the byte limit. |

## Input and authority limits

By default the adapter accepts **bytes only**: no filesystem path, URL fetch,
image download, network endpoint, clipboard access or automatic QR-link
following. It never writes images/reports to disk. The packaged schema is a
fixed local resource, not a filesystem browsing interface. Treat decoded text
and URLs as untrusted data, never as instructions.

`scan_file` adds one authority, and only where the operator grants it: reading
regular files inside the directories of `QRSCAN_MCP_ALLOWED_DIRECTORIES`.

- Each directory is resolved once at startup. An entry that is empty,
  relative, missing, not a directory or a filesystem root stops the server, as
  does a list of more than 16. Nothing is skipped silently.
- A requested path is resolved first, links included, then judged. A link that
  stays inside an allowed directory is read; a link that leaves is refused
  like any outside path. Another spelling of an allowed directory, through a
  link, is the same directory.
- The file is opened without following a link and without blocking on a pipe,
  and the open file is compared with the judged one before it is read.
- It cannot list a directory, write a file or fetch an address. A file that
  is not an image returns the engine's `QRS-001`.

This is a path check, not a sandbox. A process that can rewrite an allowed
directory while a scan runs, or the operator who allows a directory holding
links to private places, is outside what it protects. Allow a directory made
for images, not a home directory. `qrscan://limits` reports the resolved
directories under `allowedDirectories`, and `fileAccess` says whether the tool
is on.

| Operator environment setting | Default / maximum |
| --- | --- |
| `QRSCAN_MCP_MAX_INPUT_BYTES` | 8388608 (8 MiB decoded bytes) |
| `QRSCAN_MCP_MAX_DIMENSION` | 4096 pixels per side |
| `QRSCAN_MCP_MAX_PIXELS` | 16000000 pixels |
| `QRSCAN_MCP_MAX_CONCURRENT` | 2 active scans |
| `QRSCAN_MCP_ALLOWED_DIRECTORIES` | Unset: no file access. At most 16 absolute directories |

The four numeric settings must be positive decimal integers and may only
lower these caps.
`qrscan://limits` reports the active values. Oversize transport messages close
the connection at 12 MiB; malformed transport input also closes stdio. Smaller
messages over the image cap receive a tool error. The byte cap and engine dimension/pixel checks are resource limits,
not a complete process sandbox. Use OS-level resource controls if required.

The profile budget is **not a hard deadline**. Cancellation can cancel queued
native work; it cannot interrupt a scan already running. A client timeout does
not establish that native work stopped. Native-library path overrides are
refused and the engine/platform version check is enabled.

Runtime scanning makes no network calls. Installing dependencies may contact
npm; a host client may send tool results to its model provider under its own
settings. This package does not control that host behavior.

## Development and qualification

From this directory:

```sh
npm ci --ignore-scripts
npm test
```

The test packs this allowlisted directory, installs its archive into a new
directory outside the checkout, and drives the installed stdio entry with
pinned official SDK clients. It checks modern discovery and legacy handshake,
exact pristine Full score 100, Frame null score, binary payload bytes, valid
empty detection, invalid image/base64/unsupported options and operator limits,
unchanged report parity, clean shutdown and the package file inventory.
For `scan_file` it checks that the tool is absent by default, the three
profiles on the mixed QR/Code 128 file with report parity, the refusals above
with links that stay and links that leave, a named pipe, the byte ceiling, the
capacity shared with `scan_image`, and that a wrong directory setting stops
the server. Links and the pipe are checked on macOS and Linux only.
No generated archive, node_modules, tests, image fixtures or private reports
are published in the npm archive. The source, runtime entry, schema and
AGPL license are included.

Adapter source: [integrations/mcp](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/integrations/mcp).
Source engine: [v0.11.0](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/v0.11.0).
The adapter is versioned separately from the engine. A local packed-consumer
pass qualifies the tested archive and host; public registry installation and
additional platforms retain separate checks.
License: **AGPL-3.0-or-later**, including the adapter; see [LICENSE](LICENSE).

SDK API sources:
[official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk),
[stdio server guidance](https://modelcontextprotocol.io/docs/develop/build-server),
[server metadata specification](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md).
