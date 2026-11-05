# QR Code & Barcode Scanner · OpenClaw bundle 0.2.0

A portable plugin bundle for local QR and barcode scanning. It contains
one scanner skill and one stdio MCP configuration. The MCP adapter 0.2.0 uses
the published `@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` engine. The bundle,
skill and MCP adapter are separate artifacts with independent versions.

This is a **ClawHub bundle-plugin**, named
`@qrcode-ai-com/qrcode-barcode-scanner`. The same name on npm belongs to the
native scanner engine; this bundle is not published on npm. It has one
`.codex-plugin/plugin.json` marker, without native OpenClaw code entrypoints.

## Install and prepare the runtime

Use Node.js 22.19+ on the 22 line, or 24+, on a supported native platform.
OpenClaw itself may require a newer Node version. Install the inspected bundle
archive with OpenClaw, then inspect its installed directory:

```sh
openclaw plugins install ./qrcode-ai-com-qrcode-barcode-scanner-0.2.0.tgz --no-enable
# For a reviewed local archive, OpenClaw may request --force to confirm its source.
openclaw plugins inspect qrcode-barcode-scanner
```

Before enabling or using its MCP tools, run the setup in that **installed**
directory. It explicitly installs the exact npm MCP version with lifecycle
scripts disabled, checks the engine version and reuses that one runtime:

```sh
cd /absolute/path/to/installed/qrcode-barcode-scanner
node scripts/setup.mjs
openclaw plugins enable qrcode-barcode-scanner
```

The setup requires the separately published npm adapter 0.2.0. Until it is
available, a release rehearsal may pass `--mcp-archive /absolute/inspected.tgz`.
An installed local archive is preparation, not evidence of npm or ClawHub
publication. OpenClaw does not repair these dependencies at startup. No runtime
download or package installation occurs when a scan tool starts.

The MCP configuration launches the prepared adapter relative to the installed plugin root.
For the portable skill helper, use that same directory as `--engine-root`:

```sh
node skills/qrcode-barcode-scanner/scripts/scan.mjs --engine-root ./runtime --profile frame --budget-ms 0 -- /absolute/image.png
```

It retains exact payload bytes, content-grouped detections, measured occurrences
and the original score. A null score is unmeasured. An exhausted budget is an
incomplete report. Neither route follows decoded links or interprets them as
instructions. The skill accepts local files; MCP accepts supplied bytes only.

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

[QR Code AI](https://qrcode-ai.com/) · [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) · [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner)

[OpenClaw bundles](https://docs.openclaw.ai/plugins/bundles) · [ClawHub publishing](https://docs.openclaw.ai/clawhub/publishing)
