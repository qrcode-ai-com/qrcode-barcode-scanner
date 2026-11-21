# GitHub Copilot · awesome-copilot marketplace (agent-copilot)

Prepared on 2026-11-21 for the owner to review and send. Nothing has been submitted.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:21:52 | https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md | 200 | External plugins go through an issue form; a PR that edits `plugins/external.json` is refused |
| 2026-11-21 07:30 | `.github/ISSUE_TEMPLATE` form "External plugin submission" in github/awesome-copilot | 200 | Fields listed below; labels `external-plugin`, `awaiting-review` |

Mechanism: one issue opened with the form. Automation then runs `vally lint` on the plugin at the
submitted SHA, an install smoke test through Copilot CLI and a version check against the source
manifest. When both a ref and a SHA are given, they must point to the same commit. A maintainer
approves with `/approve` and automation opens the PR. Requirements: a public GitHub repository and an
immutable ref or SHA.

## What exists

- Plugin repository `qrcode-ai-com/qrcode-barcode-scanner-plugin`, public, root `plugin.json`
  version 0.3.0, MIT.
- `main` is at `f37ab720795a7a15f27d5a00c302afdb321b9b3d`. The tag `v0.3.0` points to
  `dbfb75f0c7c45b2018edd613afcf24c629ac0a69`, the commit before the two README commits. The
  manifests are identical at both commits.
- vally 0.20.0 passes on the staged tree. The engine workflow `integration-agent-plugin.yml` runs it
  on every change (PR #129).

## Submission: the issue form, field by field

Submit the SHA only. The tag `v0.3.0` names another commit, so giving both would fail the
consistency check.

| Field | Value |
| --- | --- |
| Plugin name | `qrcode-barcode-scanner` |
| Short description | Read QR codes and barcodes in local images with the QR Code & Barcode Scanner skill and its pinned local MCP server. |
| GitHub repository | `qrcode-ai-com/qrcode-barcode-scanner-plugin` |
| Plugin path inside the repository | leave empty (root) |
| Ref to review | leave empty |
| Commit SHA to review | `f37ab720795a7a15f27d5a00c302afdb321b9b3d` |
| Version | `0.3.0` |
| License identifier | `MIT` |
| Author name | `QR Code AI` |
| Author URL | `https://qrcode-ai.com/` |
| Homepage URL | `https://qrcode-ai.com/` |
| Keywords | `qr-code`, `barcode`, `qr-scanner`, `barcode-scanner`, `mcp`, `agent-skill` (one per line) |
| Additional notes for reviewers | Scanning runs on the user's computer. The MCP server is started with `npx --yes --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1`, pinned to an exact version. The plugin source is MIT; the published engine 0.11.0 and MCP 0.3.1 packages are AGPL-3.0-or-later. |

The keywords are lowercase and hyphenated because the form asks for lowercase tags. The manifest
keeps its own spaced keywords.

## The owner's next action

1. Open https://github.com/github/awesome-copilot/issues/new/choose and pick "External plugin
   submission".
2. Fill in the fields above, tick the four checkboxes only if they hold (public repository,
   immutable SHA, the repository's contribution, security and responsible AI policies, not already
   listed), and submit.
3. Follow the intake bot's comments on the issue. A later plugin release needs an update PR, which
   the same automation checks.
