# n8n template library · submission kit

What the owner submits to the [n8n template library](https://n8n.io/workflows/), and the steps up to
the submit button. Nothing here has been submitted. The rules are n8n's
[template submission guidelines](https://docs.n8n.io/contribute/create-templates/submission-guidelines),
[sticky note guidelines](https://docs.n8n.io/contribute/create-templates/sticky-note-guidelines) and
[submission steps](https://docs.n8n.io/contribute/create-templates#submit-a-template), read on
21 November 2026.

## The files

| File | What it is | sha256 |
|---|---|---|
| [qr-barcode-label-check.json](qr-barcode-label-check.json) | The workflow to submit, exactly as committed | `62b07e5c046347b5039883ff4b63dc6653025fb35129f7f25920bdc7a516b579` |
| `n8n-canvas.png` in the CI artifact | The image of the workflow, 1878 × 978 pixels, from the n8n 2.48.7 editor | `2247cc66252a9a250f286745cf5d836d852af376d6cca971456a21e34b511f07` |

The workflow's name is `Check QR codes and barcodes in label images against an expected value`.
The Creator portal writes the library title and description itself, so no other text is needed.
The yellow overview note holds `How it works`, `Setup` and `Customization` (207 words), and three
white section notes label the steps, as the sticky note guidelines ask.

The [n8n template job](../../../.github/workflows/integration-n8n-template.yml) imports this exact
file into n8n 2.48.7 and runs it, as the guidelines ask before submitting (see
[How it was checked](README.md#how-it-was-checked)). Each run uploads the artifact
`n8n-template-in-n8n-2.48.7`: the canvas screenshot `n8n-canvas.png`, the executions, the acceptance
receipt and a `SHA256SUMS` file covering them. Two runs of the job on this workflow file wrote the
same screenshot, byte for byte, with the sha256 above.

## What the template depends on

- The community node `@qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner` 0.1.0, published on npm.
  It is not published yet. The overview note names the package and its version, links n8n's
  [community node installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management)
  page, and says the template was tested on n8n 2.48.7.
- Self-hosted n8n. The node is not verified by n8n, and the guidelines say that unverified
  community nodes require self-hosting; the overview note says n8n Cloud cannot install it.
- No credential, no webhook, no pinned data and no account of the owner. The only values to set
  are `expectedText` and `imageFiles` in the **Settings** node.

## Owner steps

1. Publish the node 0.1.0 on npm from `main` at or after the commit that adds this file. A tarball
   packed before that commit lacks the fix that sends a corrupt image to the error output, so pack
   it again.
2. In a clean self-hosted n8n 2.48.7, open **Settings**, **Community nodes**, select **Install**,
   enter `@qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner`, accept the risk notice and install.
3. Open **Workflows**, choose **Import from File** and select `qr-barcode-label-check.json`. Put the
   mixed fixture (`fixtures/symbology/mixed-code128-qr.png`), an image without a code and a file
   that is not an image in `~/.n8n-files/labels`, set `imageFiles` to
   `/home/node/.n8n-files/labels/*.png` and `expectedText` to `STOCK-4827`, then select
   **Execute workflow**. The mixed image must reach **Expected value found**, the blank image
   **No code found** and the corrupt file **Unreadable image**. This repeats the CI run with the
   package from npm, which CI cannot install before it is published.
4. Download the artifact `n8n-template-in-n8n-2.48.7` of the latest green run of the n8n template
   job on `main`, and check `n8n-canvas.png` against its `SHA256SUMS` and the sha256 above. That
   is the image of the workflow n8n asks for when a template uses a community node.
5. Create a creator account at [creators.n8n.io/register](https://creators.n8n.io/register).
6. Sign in to the [Creator portal](https://creators.n8n.io/login) and submit
   `qr-barcode-label-check.json`. Where the portal accepts an image, add `n8n-canvas.png`.
7. Wait for n8n's email. A new creator can have one template in review at a time.

## Notes for the review

The workflow, its notes and these steps were written with AI assistance. The n8n guidelines accept
AI-assisted work that the submitter has reviewed and tested; the submitter is responsible for the
result, so read the workflow and its notes before submitting. If the portal asks for a note to the
reviewer, this text states the dependency:

```text
The scan step is the community node @qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner 0.1.0 (unverified, self-hosted n8n only). It decodes QR codes and barcodes on the n8n instance with an open-source engine; no image is uploaded and no credential is needed. Tested on self-hosted n8n 2.48.7 with an image holding a QR code and a Code 128, an image without a code and a corrupt file.
```
