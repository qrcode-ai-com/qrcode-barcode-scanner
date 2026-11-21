# Cursor · official plugin marketplace (round2-3)

Prepared on 2026-11-21 for the owner to review and send. Nothing has been submitted.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:21:04 | https://cursor.com/marketplace | 200 | Official plugins only; the scanner is not listed |
| 2026-11-21 08:19:36 | https://cursor.com/marketplace/publish | 200 | "Sign in to apply. You need to be signed in to submit a plugin publisher application." |
| 2026-11-21 08:20:07 | https://cursor.com/docs/plugins.md | 200 | "Plugins are distributed as Git repositories and submitted through the Cursor team. Every plugin is manually reviewed before it's listed." |

Mechanism: a plugin publisher application, filled in after signing in to cursor.com. The form
itself is behind the sign-in, so its fields could not be read here. Cursor loads the Agent Plugins
format and its own `.cursor-plugin/plugin.json`; it does not expand `${PLUGIN_ROOT}` in `mcp.json`.

## What exists

- The plugin repository `qrcode-ai-com/qrcode-barcode-scanner-plugin` (public, MIT) has
  `.cursor-plugin/plugin.json`, `mcp.json`, `rules/qrcode-barcode-scanner.mdc`, the skill and
  `assets/logo.svg`, at tag `v0.3.0` (`dbfb75f0c7c45b2018edd613afcf24c629ac0a69`) and on `main`
  (`f37ab720795a7a15f27d5a00c302afdb321b9b3d`).
- The MCP server entry uses no `${PLUGIN_ROOT}` variable, so the Cursor limitation above does not
  apply.
- The engine CI checks the manifests against their schemas and starts the MCP server from each
  client configuration on every change.

## Submission

Values to reuse in the application, all taken from the manifests:

| Field | Value |
| --- | --- |
| Publisher | QR Code AI |
| Publisher website | https://qrcode-ai.com/ |
| Plugin name | `qrcode-barcode-scanner` |
| Display name | QR Code & Barcode Scanner |
| Repository | https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin |
| Description | Read QR codes and barcodes in local images with the QR Code & Barcode Scanner skill and its pinned local MCP server. |
| License | MIT (plugin source); the MCP server 0.3.1 it starts is AGPL-3.0-or-later |
| Support | https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues |

Fields that ask for a contact person or address are the owner's to fill in.

## The owner's next action

Sign in at https://cursor.com/marketplace/publish with the account that should own the listing,
fill in the publisher application with the values above, and submit it. Cursor's team reviews it
manually.
