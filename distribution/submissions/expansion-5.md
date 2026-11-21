# Tessl · skills registry (expansion-5)

Prepared on 2026-11-21 for the owner. Nothing has been published.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:22:56 | https://tessl.io/registry | 200 | Public registry of skills and plugins; the scanner is not listed |
| 2026-11-21 07:23:01 | https://docs.tessl.io/creating-skills-and-plugins/publish-and-update.md | 200 | `tessl skill publish` publishes to a workspace, private by default; `--public` publishes a skill publicly; public is irreversible |

Mechanism: the publisher runs the `tessl` CLI. Requirements stated there:

- a Tessl account signed in to the CLI, and a workspace (`tessl workspace list`);
- public visibility is requested first in the registry (Actions, then Make Public) and approved by
  Tessl;
- Tessl lints and reviews every published version automatically. Quality reviews cost 10 platform
  credits each on Free plans; security reviews are free.
- A public plugin cannot be made private again. Once a public plugin has 500 or more downloads, only
  versions from the last 48 hours can be unpublished.

## What exists

- The skill `skills/qrcode-barcode-scanner/` (SKILL.md, README, LICENSE, `scripts/scan.mjs`,
  `scripts/test.mjs`), in the engine repository and in the plugin repository.
- vally 0.20.0 lints it clean in the engine CI. Tessl's own lint and review were not run here,
  because they need an account.

## What a listing needs

The owner's account, workspace and acceptance of Tessl's terms, then an irreversible public
publication. If the owner decides to publish, from a clean clone of the engine repository at the
commit to publish:

```bash
tessl workspace list
tessl skill publish ./skills/qrcode-barcode-scanner --workspace <workspace>
```

`<workspace>` is the owner's workspace name. This first version is private, so its review score can
be read before anything becomes public. To go public, request Make Public on the skill's registry
page; once Tessl approves, publish the next version with `--public` added.

## The owner's next action

Decide whether to create a Tessl account and workspace and accept the terms. Then publish
privately, read the review, and only then request public visibility.
