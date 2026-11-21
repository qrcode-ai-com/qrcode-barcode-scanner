# Google Antigravity · plugin marketplace (agent-antigravity)

Prepared on 2026-11-21 for the owner to review and send. Nothing has been submitted.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:21:56 | https://antigravity.google/docs/marketplace | 200 | Curated plugins; "Get your plugin in the marketplace: fill out this interest form" |
| 2026-11-21 07:34 | https://forms.gle/2EX5RFYPoJe1UgxR9 (Google Form "Antigravity Plugin Interest Form") | 200 | Fields listed below |

Mechanism: a Google Form. Google reviews the plugin and follows up. The docs ask for a plugin
validated with `agy plugin validate`.

## What exists

- The plugin repository has `.antigravity-plugin/plugin.json` and `mcp_config.json`, at tag
  `v0.3.0` and on `main` (`f37ab720795a7a15f27d5a00c302afdb321b9b3d`). The engine CI checks that
  manifest against `https://antigravity.google/schemas/v1/plugin.json`.
- Not done here: `agy plugin validate`, which needs the Antigravity CLI.

## Submission: the form, field by field

| Field | Value |
| --- | --- |
| Email | the owner's address |
| Company Name | the owner's company |
| Company Primary Website (Domain) | the owner's choice; the manifests use https://qrcode-ai.com/ |
| Primary Contact Name | the owner |
| Primary Contact Email | the owner's address |
| Public-facing support email or helpdesk URL | https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues |
| Plugin Description | Read QR codes and barcodes in local images. The plugin adds the QR Code & Barcode Scanner skill and a local MCP server pinned to version 0.3.1. Both return the engine's JSON report: the exact payload, the format of each code and, for QR codes, a scannability judgment. Scanning runs on the user's computer. Source: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin |
| Documentation URL | https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin |

## The owner's next action

1. Optionally run `agy plugin validate` on a clone of the plugin repository.
2. Open https://forms.gle/2EX5RFYPoJe1UgxR9, fill in the company and contact fields (Google uses
   them to verify the organization), paste the plugin values above, and submit.
