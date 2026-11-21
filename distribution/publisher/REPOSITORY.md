# qrcode-ai-com.github.io

The publisher site of the open-source QR Code & Barcode Scanner by QR Code AI, served by GitHub
Pages at <https://qrcode-ai-com.github.io/>:

| Path | What it is |
| --- | --- |
| `/` | The integrations of the scanner, where each is published and where its source lives |
| `/privacy/` | What the scanner and each integration read, store and send |
| `/terms/` | The licences of the source and of each published release |
| `/support/` | Where to ask a question or report a problem or a vulnerability |
| `/.well-known/agent-skills/index.json` | The scanner's agent skill, in the Agent Skills discovery index 0.2.0 |
| `/.well-known/skills/index.json` | The same skill in the older index layout, file by file |

The site has no scripts, no cookies, no analytics and no external fonts.

## Nothing here is edited by hand

Every file is generated from the folder `distribution/publisher` of the engine repository,
<https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust>, by its program
`scripts/stage-publisher-site.py`. That folder is the only source edited by hand. The skill
archive is the published file of the engine's `agents-v0.2.1` release, byte for byte; the
program checks its SHA-256 and that its files equal the skill's source at the release commit.

`SOURCE.json` names the engine commit and the SHA-256 of every file. The `Check` workflow fetches
that commit, stages it again and compares: same files, same bytes, nothing else.

To change the site, change `distribution/publisher` in the engine repository and merge it there.
Then, from an engine checkout at that commit, download the skill archive the folder names and
stage the tree:

```sh
python3 scripts/stage-publisher-site.py stage --revision <commit> --archive <skill archive> --out <empty folder>
python3 scripts/stage-publisher-site.py verify <empty folder>
```

Open a pull request here with the staged tree in place of the current files.

## Publishing

GitHub Pages serves the `main` branch from the root of this repository. The file `.nojekyll`
makes it serve the files as they are, `.well-known` included.

## Licence

The [LICENSE](LICENSE) file is the engine's MIT License.
