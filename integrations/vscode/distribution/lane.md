# VS Code extension publish lane

This folder and `.github/workflows/vscode-publish.yml` are staged from
[qrcode-ai-com/qrcode-barcode-scanner-rust](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust)
by `integrations/vscode/scripts/stage-distribution.mjs`. Do not edit them by hand: change the
engine repository, then stage again.

`SOURCE.json` names one engine revision and the SHA-256 of the VSIX built from it. A tag
`vscode-v<version>` runs the workflow. It checks out that revision, runs the extension tests,
rebuilds the VSIX and refuses it unless its SHA-256 is the staged one. It then publishes that same
file twice, to the Visual Studio Marketplace and to Open VSX. Both jobs use Trusted Publishing:
each registry trades the job's GitHub OIDC ID token for a short-lived token, so the repository
stores no publishing token.

## Set up once

1. Visual Studio Marketplace: sign in at https://marketplace.visualstudio.com/manage with the
   studio Microsoft account and create the publisher `qrcode-ai-com` (display name QR Code AI).
   Its ID cannot change later.
2. On that publisher, add a Trusted Publishing policy: repository owner `qrcode-ai-com`,
   repository `qrcode-barcode-scanner-distribution`, workflow file `vscode-publish.yml`,
   environment `visual-studio-marketplace`.
3. Open VSX: create an eclipse.org account with the GitHub username filled in, log in at
   https://open-vsx.org with that GitHub account, sign the Publisher Agreement and create the
   namespace `qrcode-ai-com`. Claim its ownership with an issue at
   https://github.com/EclipseFdn/open-vsx.org/issues (template "Claim namespace ownership").
4. Once you own the namespace, register a trusted publisher at
   https://open-vsx.org/user-settings/trusted-publishers: namespace `qrcode-ai-com`, repository
   `qrcode-ai-com/qrcode-barcode-scanner-distribution`, workflow file `vscode-publish.yml`,
   environment `open-vsx`.
5. In this repository, create the environments `visual-studio-marketplace` and `open-vsx`, both
   limited to tags `vscode-v*` and to a required reviewer. Neither holds a secret.

## Publish a version

```sh
# in a clean engine checkout, at the commit to publish
node integrations/vscode/scripts/stage-distribution.mjs stage --out /tmp/vscode-lane
# copy /tmp/vscode-lane over a clean checkout of this repository, review, commit, then
git tag vscode-v0.1.0 && git push origin vscode-v0.1.0
```

`node integrations/vscode/scripts/stage-distribution.mjs verify <checkout of this repository>`
stages the recorded revision again and compares every staged file. After the workflow, read back
https://marketplace.visualstudio.com/items?itemName=qrcode-ai-com.qrcode-barcode-scanner and
https://open-vsx.org/extension/qrcode-ai-com/qrcode-barcode-scanner, then install the
extension in a clean editor profile and scan `fixtures/symbology/mixed-code128-qr.png` in the
three profiles.
