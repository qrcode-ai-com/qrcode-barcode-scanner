# skills.sh · skills leaderboard (expansion-1)

Prepared on 2026-11-21 for the owner. Nothing has been installed or reported.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:22:53 | https://www.skills.sh/docs/faq | 200 | "Skills appear on the leaderboard automatically through anonymous telemetry when users run npx skills add <owner/repo>." |
| 2026-11-21 08:26:07 | npm registry, README of `skills` 1.9.0 (`vercel-labs/skills`) | 200 | `npx skills add <owner/repo> --skill <name> -a <agent>`; telemetry is on unless `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` |

Mechanism: no submission. The leaderboard counts installs reported by the `skills` CLI's
telemetry. A skill appears once someone installs it with telemetry on.

## What exists

- The engine repository holds one skill, `skills/qrcode-barcode-scanner/SKILL.md`. The plugin
  repository holds the same skill twice (`skills/` and the Junie copy), so the engine repository is
  the cleaner source for this CLI.
- The skill is in no install count yet.

## What a listing needs

At least one install with telemetry on. Making that install on purpose sends a telemetry event to
Vercel, which is the owner's decision. This preparation installs nothing.

If the owner decides to do it, from an empty scratch folder (the CLI installs into the current
project unless `-g` is given):

```bash
npx skills add qrcode-ai-com/qrcode-barcode-scanner-rust --skill qrcode-barcode-scanner -a claude-code
```

Real users' installs then keep the count up.

## The owner's next action

Decide whether to make one deliberate install with telemetry on. Otherwise the skill appears only
when users install it.
