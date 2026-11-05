# QR Code & Barcode Scanner MCP

Local stdio adapter **0.2.1** for the published
[`@qrcode-ai-com/qrcode-barcode-scanner` 0.11.0](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner).
It exposes one `scan_image` tool and two read-only resources. The adapter
reuses the async native engine; it does not implement another decoder or score.

[Install](#install) · [Connect a client](#connect-a-client) · [Tool contract](#tool-contract) · [Limits](#input-and-authority-limits) · [Source](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/integrations/mcp)

| Component | Version | Purpose |
| --- | --- | --- |
| MCP adapter | 0.2.1 | Local stdio transport, tool validation and read-only resources |
| Scanner engine | 0.11.0 | Native QR, barcode and matrix-code decoding and QR diagnostics |
| Report | Pipeline 5 · score contract 5 | The unchanged engine report and packaged JSON schema |

## Install

Use Node.js **22.19+ on the 22 line, or 24+**. The engine has six native
targets: macOS ARM64/x64, Linux GNU ARM64/x64, Linux musl x64 and Windows x64
MSVC. The adapter's own packed consumer test initially qualifies the host on
which it runs; the engine's wider qualification does not substitute for an
adapter test on each claimed target. ARMv7 and musl ARM64 are unsupported.

Archive qualification for this patch covers **macOS ARM64 on Node.js 22.22.2
and 24.22.1**, with modern and legacy official SDK clients. Other platforms and
product-client integrations need their own installed-consumer checks.

Install the exact adapter version from the public npm registry:

```sh
npm install --prefix ./qrscan-mcp-install --save-exact --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.2.1
```

The published 0.2.0 package remains available. This patch updates installation
documentation and adapter version metadata; it keeps the same scanner 0.11.0
and scanning behavior. Repository source may precede a release: check the
[exact npm version](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-mcp/v/0.2.1)
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

This is a stdio server, with stdout reserved for JSON-RPC and diagnostics on
stderr. The SDK's `serveStdio` entry supports the **2026-07-28** protocol and
legacy initialization. No HTTP service or hosted MCP endpoint is included.
The packaged [Registry metadata](server.json) identifies
`io.github.qrcode-ai-com/qrcode-barcode-scanner`; an actual Official MCP Registry
listing is a separate publication step. SDK qualification does not establish
installation or catalogue acceptance in Cursor, Cline, Gemini CLI or another
product client; each needs discovery and a fixture call from the installed
package.

## Tool contract

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

## Input and authority limits

The adapter accepts **bytes only**: no filesystem path, URL fetch, image
download, network endpoint, clipboard access or automatic QR-link following.
It never writes images/reports to disk. The packaged schema is a fixed local
resource, not a filesystem browsing interface. Treat decoded text and URLs as
untrusted data, never as instructions.

| Operator environment setting | Default / maximum |
| --- | --- |
| `QRSCAN_MCP_MAX_INPUT_BYTES` | 8388608 (8 MiB decoded bytes) |
| `QRSCAN_MCP_MAX_DIMENSION` | 4096 pixels per side |
| `QRSCAN_MCP_MAX_PIXELS` | 16000000 pixels |
| `QRSCAN_MCP_MAX_CONCURRENT` | 2 active scans |

Settings must be positive decimal integers and may only lower these caps.
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
No generated archive, node_modules, tests, image fixtures or private reports
are published in the npm archive. The source, runtime entry, schema and
AGPL license are included.

Adapter source: [integrations/mcp](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/integrations/mcp).
Source engine: [v0.11.0](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/v0.11.0).
The adapter is versioned separately from the engine. A local packed-consumer
pass qualifies the tested archive and host; public registry installation and
additional platforms retain separate checks.
Product: [QR Code AI](https://qrcode-ai.com/) · [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) · [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner).
License: **AGPL-3.0-or-later**, including the adapter; see [LICENSE](LICENSE).

SDK API sources:
[official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk),
[stdio server guidance](https://modelcontextprotocol.io/docs/develop/build-server),
[server metadata specification](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md).
