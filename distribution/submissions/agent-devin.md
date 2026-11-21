# Devin · CognitionAI/devin-marketplace (agent-devin)

Prepared on 2026-11-21 for the owner to review and send. Nothing has been submitted.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:22:12 | https://docs.devin.ai/cli/extensibility/plugins/overview | 200 | Plugins use `.devin-plugin/plugin.json`; Devin falls back to `.claude-plugin/plugin.json` |
| 2026-11-21 07:46 | https://github.com/CognitionAI/devin-marketplace (README, `.agents/skills/adding-a-plugin/SKILL.md`, PR template) | 200 | A third-party plugin is one pinned object in `optionalPlugins` of `.devin-plugin/plugin.json` |

Mechanism: a pull request to `CognitionAI/devin-marketplace`. Requirements stated there:

- the entry is pinned to a full 40-hex commit SHA, never a branch or a tag;
- no display metadata goes in the entry; the plugin's own manifest at that SHA supplies it;
- `python3 scripts/validate.py --fix` then `--fetch` must pass;
- before opening the PR, the plugin is installed with `devin plugins install --local` and a
  session calls one of its tools or skills;
- opening the PR means agreeing to the Cognition App Developer Terms
  (https://cognition.com/legal/app-terms), which the PR template asks to tick.

## What exists

- The plugin repository has `.claude-plugin/plugin.json` and `.mcp.json` at
  `f37ab720795a7a15f27d5a00c302afdb321b9b3d` (`main`), which Devin reads through its fallback.
- Dry run on a local clone of `devin-marketplace` at `43cc7751d16ae0aec855d3ef671e94f21f6239ee`:
  `validate.py --fix` printed `ok: 239 entries (230 authored, 9 upstream)` and `validate.py --fetch`
  exited 0 with the entry below.
- Not done here: `devin plugins install --local` and a session that calls a tool. Both need a
  signed-in Devin CLI.

## Submission

Branch from `main` of the owner's fork. The diff, after `validate.py --fix` sorted it:

```diff
--- a/.devin-plugin/plugin.json
+++ b/.devin-plugin/plugin.json
@@ -279,6 +279,11 @@
       "source": "url",
       "url": "https://github.com/mobbin/skills.git",
       "sha": "cac338357d596415773874f06a6c16e862c195e4"
+    },
+    {
+      "source": "url",
+      "url": "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin.git",
+      "sha": "f37ab720795a7a15f27d5a00c302afdb321b9b3d"
     }
   ]
 }
```

If `main` has moved, rerun `python3 scripts/validate.py --fix`; it places the entry.

PR title: `Add qrcode-barcode-scanner plugin`

PR body (their template):

```markdown
## Summary

Adds QR Code & Barcode Scanner as an optional third-party plugin, pinned to commit
f37ab720795a7a15f27d5a00c302afdb321b9b3d of qrcode-ai-com/qrcode-barcode-scanner-plugin. It reads
QR codes and barcodes in local images through a skill and a local MCP server pinned to
@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1. Scanning runs on the user's computer and needs no
credential.

`python3 scripts/validate.py --fix` and `python3 scripts/validate.py --fetch` pass. Installed with
`devin plugins install --local` and checked with a session that scanned an image.

## Checklist

- [x] I have read and agree to the [Cognition App Developer Terms](https://cognition.com/legal/app-terms).
```

## The owner's next action

1. Read and decide on the Cognition App Developer Terms.
2. Install the Devin CLI, sign in, install the plugin with `devin plugins install --local` from a
   clone of the plugin repository at `f37ab72`, and have a session scan an image. Remove the
   sentence "Installed with … scanned an image" from the body if that test is not done.
3. Fork `CognitionAI/devin-marketplace`, apply the diff, run both `validate.py` commands, open the
   PR with the title and body above.
