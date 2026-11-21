# VoltAgent awesome-agent-skills and officialskills.sh (expansion-8)

Prepared on 2026-11-21 for the owner, and held: the list does not accept new skills yet.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:23:06 | https://officialskills.sh/ | 200 | The site presents the VoltAgent list |
| 2026-11-21 07:51 | https://github.com/VoltAgent/awesome-agent-skills/blob/main/CONTRIBUTING.md | 200 | One line per skill, PR title `Add skill: author/skill-name` |
| 2026-11-21 08:20:41 | https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md | 200 | Community Skills subcategories; no QR or barcode entry |

Mechanism: a pull request to `VoltAgent/awesome-agent-skills` adding one line to `README.md`. The
contributing guide states: "Skill must have real community usage. … Brand new skills that were just
created are not accepted. Give your skill time to mature and gain users before submitting." The
description must be 10 words or fewer.

## What exists

- The skill, public, in the plugin repository `qrcode-ai-com/qrcode-barcode-scanner-plugin`
  (published 2026-11-20) and in the engine repository.
- No usage evidence yet. Sending the PR now would likely be declined under the rule quoted above.

## Submission, for when the skill has users

`README.md`, Community Skills, at the end of the "Specialized Domains" subcategory:

```markdown
- **[qrcode-ai-com/qrcode-barcode-scanner](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin)** - Read QR codes and barcodes in local images
```

PR title: `Add skill: qrcode-ai-com/qrcode-barcode-scanner`

PR body:

```markdown
Adds the QR Code & Barcode Scanner skill: it reads QR codes and barcodes in local images and
returns the decoded payloads. MIT, with the skill in skills/qrcode-barcode-scanner/ of the linked
repository.
```

## The owner's next action

Wait until the skill has real users (installs, stars or issues from people outside the project).
Then fork the list, add the line, and open the PR with the title above.
