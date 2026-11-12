# QR Code & Barcode Scanner MCP

Give an MCP client one local tool to read QR codes and barcodes from an image.
`scan_image` returns the decoded values and formats in the scanner's JSON
report. A second tool, [`scan_file`](#scan-a-file-by-path-scan_file), reads an
image by path once the operator allows a directory. It uses the same
[`@qrcode-ai-com/qrcode-barcode-scanner` 0.11.0 engine](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner)
that [QR Code AI](https://qrcode-ai.com/en-US/qr-code-scanner/mcp) uses for QR verification.

[Install](#install) · [Connect a client](#connect-a-client) · [Tool contract](#tool-contract) · [Limits](#input-and-authority-limits) · [Source](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/main/integrations/mcp)

| Component | Version | Purpose |
| --- | --- | --- |
| MCP adapter | 0.3.0 | Local stdio transport, tool validation and read-only resources |
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
See the [0.3.0 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/agents-v0.3.0)
for provenance and verification. Product-client integrations have separate
installed-consumer checks.

Install the exact adapter version from the public npm registry:

```sh
npm install --prefix ./qrscan-mcp-install --save-exact --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.0
```

The published 0.2.1 package remains available. Version 0.3.0 adds the
[`scan_file`](#scan-a-file-by-path-scan_file) tool, which stays off unless the
operator names the directories it may read. `scan_image`, the scanner 0.11.0
and the report are unchanged. Repository source may precede a release: check the
[exact npm version](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-mcp/v/0.3.0)
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

Bundles and install links start the adapter the same way in every client:
`npx`, an exact version, no install script.

```json
{
  "mcpServers": {
    "qrscan": {
      "command": "npx",
      "args": ["--yes", "--ignore-scripts", "@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.2.1"]
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

The repository's `Destination acceptance` workflow starts the published 0.2.1
with exactly this entry in an empty home, on Linux with Node.js 22 and 24 and
on macOS with Node.js 24, then reads the QR code and the Code 128 through
`scan_image` in the three profiles. Windows is not checked: a client there
may need to start `npx` through `cmd`.

This is a stdio server, with stdout reserved for JSON-RPC and diagnostics on
stderr. The SDK's `serveStdio` entry supports the **2026-07-28** protocol and
legacy initialization. No HTTP service or hosted MCP endpoint is included.
Find version 0.2.1 in the
[Official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.qrcode-ai-com%2Fqrcode-barcode-scanner/versions/0.2.1)
under `io.github.qrcode-ai-com/qrcode-barcode-scanner`. The entry points to the
same npm package and stdio transport described here. For a specific product
client, verify tool discovery and a fixture call after installation.

## Tool contract

Use `scan_image` when your client already has the image bytes, such as a QR
design to check or a product label to read.

| | QR codes | Barcodes |
| --- | --- | --- |
| **Try the scanner live** | [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) | [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) |
| **MCP server guide** | [QR code scanner MCP server](https://qrcode-ai.com/en-US/qr-code-scanner/mcp) | [Barcode scanner MCP server](https://qrcode-ai.com/en-US/barcode-scanner/mcp) |
| **Create a code** | [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) | [Barcode generator](https://qrcode-ai.com/en-US/barcode-generator) |

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
It ships since **adapter 0.3.0**; the 0.2.1 package has `scan_image` only.

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
