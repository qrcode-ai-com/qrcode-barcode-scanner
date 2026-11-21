# OpenCode · ecosystem page (round2-6)

Prepared on 2026-11-21 for the owner to review and send. Nothing has been submitted.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:21:40 | https://opencode.ai/docs/ecosystem/ (redirects to https://opencode.ai/v1/docs/ecosystem/) | 200 | "Want to add your OpenCode related project to this list? Submit a PR." |
| 2026-11-21 07:28 | https://github.com/anomalyco/opencode/blob/dev/CONTRIBUTING.md | 200 | PRs are based on `dev`, use the PR template and a conventional title; documentation PRs need no linked issue |
| 2026-11-21 08:17:32 | https://raw.githubusercontent.com/anomalyco/opencode/dev/.github/pull_request_template.md | 200 | Template below; a PR that does not follow it is rejected automatically |

Mechanism: a pull request to `anomalyco/opencode`, base `dev`, adding one row to the Plugins table
of `services/site/src/docs/v1/content/ecosystem.mdx`. The contributing guide says long
AI-generated descriptions may be ignored and asks for a short explanation in the contributor's own
words.

## What exists

- The plugin repository ships `opencode/plugin.mjs` and a `package.json` that names it, at tag
  `v0.3.0` and on `main`. The engine CI packs the staged tree with `npm pack --dry-run` and checks
  that `opencode/plugin.mjs` and the skill are in it.
- An install from GitHub: `opencode plugin add github:qrcode-ai-com/qrcode-barcode-scanner-plugin#v0.3.0`.
- Not done: a real OpenCode session that loads the plugin and scans an image. No receipt of one
  exists yet.

## Submission

File `services/site/src/docs/v1/content/ecosystem.mdx`, Plugins table, after the last row
(`opencode-supabase` when read):

```markdown
| [qrcode-barcode-scanner](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin) | Read QR codes and barcodes in local images with a skill and a pinned local MCP server |
```

The table pads its columns with spaces. Pad the new row to the same widths, or run the site's
formatter if one is configured.

PR title: `docs(ecosystem): add qrcode-barcode-scanner plugin`

PR body (their template). The owner writes "What does this PR do?" in their own words; the line
below is only a starting point.

```markdown
### Issue for this PR

Closes #

### Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / code improvement
- [x] Documentation

### What does this PR do?

Adds the QR Code & Barcode Scanner plugin to the Plugins table of the ecosystem page. It reads QR
codes and barcodes in local images; scanning runs on the user's computer.

### How did you verify your code works?

Installed it with `opencode plugin add github:qrcode-ai-com/qrcode-barcode-scanner-plugin#v0.3.0`
and scanned an image in a session. Checked that the table renders.

### Screenshots / recordings

_If this is a UI change, please include a screenshot or recording._

### Checklist

- [x] I have tested my changes locally
- [x] I have not included unrelated changes in this PR
```

Leave "Closes #" empty: a documentation PR needs no linked issue.

## The owner's next action

1. Install the plugin in OpenCode with the command above and scan an image. Without that test,
   do not tick "I have tested my changes locally" and remove the install sentence.
2. Fork `anomalyco/opencode`, branch from `dev`, add the row, and open the PR against `dev` with
   the title above and a body in the owner's own words.
