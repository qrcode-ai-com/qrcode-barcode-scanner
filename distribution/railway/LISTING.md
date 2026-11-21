# Railway template · owner kit

A Railway template deploys a preconfigured service into the user's own Railway project. Its
settings live in Railway's template composer, not in the repository: Railway's config as code
(`railway.json`, `railway.toml`) is deprecated, new services cannot opt into it, and Railway stops
reading those files on 1 December 2026 ([docs.railway.com/reference/config-as-code](https://docs.railway.com/reference/config-as-code),
read on 21 November 2026). Creating, publishing and maintaining the template need a signed-in
Railway workspace, so they are the owner's. This kit holds every value to type.

## What is ready

| Item | Value |
| --- | --- |
| Source repository | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http`, branch `main`, generated from `distribution/http` by `scripts/stage-http-satellite.py`; `SOURCE.json` names the engine commit |
| Build | the `Dockerfile` at the root ("Railway will always build with a Dockerfile if it finds one"): Node.js 22 on `node:22.22.2-bookworm-slim` pinned by digest, the engine `@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` from the lockfile's sha512, user `1000:1000` |
| Port | Railway injects `PORT`; the service listens on it, on every address |
| Health check | `GET /healthz`, `200 {"status":"ok","service":"0.1.0","engine":"0.11.0"}` |
| Checked in the engine | `http-service.yml`, job `hosts`, entry `railway`: the judged image run with a `PORT` that is not the default one, `QRSCAN_HTTP_MAX_CONCURRENT=1`, `QRSCAN_HTTP_BUDGET_SCALE=2`, 1 vCPU and 512 MB, judged by `test/consumer.mjs` (mixed QR code and Code 128 in fast, frame and full, exact payloads, every refusal); and no `railway.json` or `railway.toml` in the staged tree |
| Icon | `integrations/vscode/images/icon.png` in the engine repository: 512 by 512 pixels, transparent corners, sha256 `97469c90140c94dc621d3cbfc0df4d0841b35648b2fe77044fecd214a7465af1`. Railway asks for a 1:1 icon with a transparent background |
| License | the image is AGPL-3.0-or-later (engine 0.11.0); every answer names its source in `X-Source-Code` |

## Composer values

**Workspace settings, Templates, New Template**, then the service:

| Field | Value |
| --- | --- |
| Template name | `QR Code & Barcode Scanner` |
| Service name | `qrcode-barcode-scanner-http` |
| Source | GitHub repository `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http` |
| Root directory | `/` |
| Start command | empty: the image's own command runs `node server.mjs` |
| Networking | Enable Public Networking, HTTP |
| Healthcheck path | `/healthz` |
| Variable `QRSCAN_HTTP_MAX_CONCURRENT` | `1`, description: `Scans that run at once. 1 fits 0.5 GB of memory; the service never allows more than 2.` |
| Variable `QRSCAN_HTTP_BUDGET_SCALE` | `2`, description: `Multiplies each scan mode's time budget, from 1 to 20. 2 leaves headroom on a shared vCPU.` |
| Volume, database, secret | none |

The service reads three more variables that may only lower its limits: `QRSCAN_HTTP_MAX_INPUT_BYTES`
(8388608), `QRSCAN_HTTP_MAX_DIMENSION` (4096) and `QRSCAN_HTTP_MAX_PIXELS` (16000000). Leave them
out of the template: a value above the limit stops the service at start.

**Publish form.** Category: `Other`. Overview: the Markdown below, in the structure Railway's
[template best practices](https://docs.railway.com/templates/best-practices) ask for.

```markdown
# Deploy and Host QR Code & Barcode Scanner with Railway

QR Code & Barcode Scanner is an open-source engine that reads QR codes and barcodes in images. This
template runs it as a small HTTP service in your own Railway project: send an image to `POST /scan`
and get back a JSON report of every code it holds, with its format and exact text.

## About Hosting QR Code & Barcode Scanner

The service is one container built from the Dockerfile of its repository: Node.js 22 and the
published engine 0.11.0, with no database, no disk and no secret. Railway builds it, gives it a
public address and checks `GET /healthz` before it takes traffic. Images are read in memory and
never stored, and the service makes no outbound request. It has no account or key of its own:
anyone who has its address can use it, so keep the address private or put your own access control
in front of it. Every answer names the source code of the service, as its AGPL-3.0 license asks.

## Common Use Cases

- Read the QR code or barcode in an uploaded photo from your own backend or a no-code tool.
- Check that a printed label or a generated code decodes to the exact text you expect.
- Scan images in a batch job without sending them to a third-party service.

## Dependencies for QR Code & Barcode Scanner Hosting

- None besides this service: no database, no volume, no external API.

### Deployment Dependencies

- Source: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http
- Engine: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust
- Product: https://qrcode-ai.com/

### Implementation Details

`POST /scan` takes the image as the request body or as the field `image` of a multipart form.
`mode` chooses `fast`, `frame` (the default) or `full`. For example:
`curl --data-binary @label.png -H 'content-type: image/png' 'https://example.com/scan?mode=fast'`,
with your service's address in place of example.com. Images up to 8 MiB and 16 megapixels are
accepted. `QRSCAN_HTTP_MAX_CONCURRENT` sets how many scans run at once, and
`QRSCAN_HTTP_BUDGET_SCALE` multiplies each mode's time budget.

### Why Deploy QR Code & Barcode Scanner on Railway?

Railway builds the service from its repository, gives it an HTTPS address and runs its health
check, so a private scan endpoint takes one deployment and no server to manage.
```

## Cost, read on railway.com on 21 November 2026

- **Free**: 0 USD a month with 1 USD of usage credit; a service gets up to 1 vCPU and 0.5 GB. **Trial**:
  30 days with a one-time 5 USD credit and no card; an account that GitHub verification does not
  pass gets a limited trial with restricted outbound network access.
- **Hobby**: 5 USD a month, 5 USD of usage included. **Pro**: 20 USD a month, 20 USD included.
- Usage rates: 0.00000772 USD per vCPU-second (about 20 USD per vCPU-month), 0.00000386 USD per
  GB-second of memory (about 10 USD per GB-month), egress 0.05 USD per GB
  ([railway.com/pricing](https://railway.com/pricing), [plans](https://docs.railway.com/pricing/plans)).
- Railway bills the resources a service uses. Fully busy at 0.25 vCPU and 512 MB, one copy would
  cost about 10 USD a month (5 USD of CPU, 5 USD of memory) plus egress; an idle copy costs less.
  This is an estimate from the rates above, not a Railway quote.
- The template costs QR Code AI nothing: each user pays for their own deployment. A public Live Demo
  project would run on the owner's workspace and bill it.

## Owner steps

1. Sign in to Railway and create or choose the workspace. Railway asks to use a company name for a
   workspace only when you are authorized to represent that company. Accepting Railway's terms and
   choosing a plan are the owner's.
2. **Workspace settings, Templates, New Template**. Choose the GitHub repository source and type the
   composer values above. Save.
3. Deploy the template once from its URL into a new project. In the service's **Settings,
   Networking**, check that Railway generated a public domain, then wait for the deployment to be
   healthy.
4. From a clone of the repository, with Node.js 22, run the consumer against that domain:
   `node test/consumer.mjs https://<domain> test/fixtures/mixed-code128-qr.png --revision <commit>`,
   where `<commit>` is `engine.revision` in `SOURCE.json`. It must end with
   `consumer: all 16 checks passed`. Keep its output.
5. Paste the overview, upload the icon, choose the category and press **Publish**.
6. From a second, clean project, deploy the published template from its marketplace page, repeat
   step 4, then delete both projects and check that the domains no longer answer.
7. Record the template URL and code, the date and the consumer's output. Then add the button to the
   README of `distribution/http` in the engine repository, or ask an agent to, with the template code
   in place of `<code>`:

   ```markdown
   [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/<code>?utm_medium=integration&utm_source=button&utm_campaign=qrcode-barcode-scanner)
   ```

Railway's kickback program pays template authors a share of their users' spend. Enrolling changes
nothing technical; it is a separate decision.

## Upkeep

Railway sends a GitHub-sourced template's changes to deployers when they reach the root branch of
its repository. A change to `distribution/http` reaches that branch when an agent stages it again
and pushes it. A change of composer values needs the owner's workspace.
