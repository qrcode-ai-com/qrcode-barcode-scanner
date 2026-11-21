# Claude Code · Anthropic's plugin directory (agent-claude-code)

Prepared on 2026-11-21 for the owner to review and send. Nothing has been submitted.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:21:42 | https://claude.com/docs/plugins/submit | 200 | Submit from a GitHub repository through the developer portal at claude.ai/directory/manage, as a "Plugin bundle" |
| 2026-11-21 07:21:42 | https://claude.ai/directory | 403 | The portal refuses an unauthenticated reader |
| 2026-11-21 07:55 | https://claude.com/docs/plugins/pre-submission-checklist | 200 | The directory's validation rules |

Mechanism: the developer portal, steps Source, Listing details, Data handling, Compliance, Review
and submit. Requirements stated there:

- a plan and role that can submit;
- the owner's GitHub account connected on claude.ai, with push access to the repository;
- the Anthropic Software Directory Terms and Policy, plus four acknowledgements on the Compliance
  step.

## What exists

- Plugin repository `qrcode-ai-com/qrcode-barcode-scanner-plugin`, public, with
  `.claude-plugin/plugin.json` (name `qrcode-barcode-scanner`, version 0.3.0, MIT), `.mcp.json`,
  the skill, `LICENSE` and a README of more than 40 words.
- `claude plugin validate` (Claude Code 2.1.328) passes on the staged tree. It suggests declaring
  `network.hosts`.
- Two checklist rules are expected to hold the submission for a reviewer rather than block it:
  - "Runs a pinned npx or uvx package": `.mcp.json` starts
    `npx --yes --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1`, an exact pin.
  - the name `qrcode-barcode-scanner` describes a function rather than a brand, so it may be held
    as generic or close to an existing listing.

## Submission: portal values

| Step | Field | Value |
| --- | --- | --- |
| Source | Repository | `qrcode-ai-com/qrcode-barcode-scanner-plugin` |
| Source | Plugin path | leave empty (root) |
| Source | Branch or tag | `main`, or the tag `v0.3.0`; a tag stays on its commit until it is moved |
| Listing details | read from `plugin.json` and the README | display name, description and author come from the manifest |
| Data handling | personal data | The plugin reads only the image files the user names and keeps nothing. |
| Data handling | data sent elsewhere | Nothing is sent during a scan. On first start, `npx` downloads `@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1` from the npm registry. |
| Data handling | retention | None; npm keeps its package cache on the user's computer. |
| Data handling | intended for people under 18 | the owner decides |
| Compliance | contact email | the owner's address |

## The owner's next action

1. Confirm that the Claude organization's plan and role can submit, and connect the GitHub account
   that can push to the plugin repository.
2. Open https://claude.ai/directory/manage, select Submit new, then Plugin bundle, enter the
   values above, select Validate, and read the findings.
3. Read the Software Directory Terms and Policy, select the four acknowledgements if they hold,
   and submit for review.
