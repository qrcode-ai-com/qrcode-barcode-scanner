# Render Blueprint · owner kit

Render has no store or template submission for a Blueprint. The publication is the file
`render.yaml` at the root of a public repository, plus a Deploy to Render button in its README
([Render's button page](https://render.com/docs/deploy-to-render), read on 21 November 2026). This
kit holds what the owner needs to deploy it once for acceptance and then add the button.

## What is ready

| Item | Value |
| --- | --- |
| Repository | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http`, generated from `distribution/http` by `scripts/stage-http-satellite.py`; `SOURCE.json` names the engine commit |
| Blueprint | `render.yaml` at its root: one `web` service named `qrcode-barcode-scanner-http`, `runtime: docker`, `plan: 0.5c-512mb`, `healthCheckPath: /healthz`, `autoDeployTrigger: 'off'`, `QRSCAN_HTTP_MAX_CONCURRENT=1`, `QRSCAN_HTTP_BUDGET_SCALE=4` |
| Image | built by Render from the `Dockerfile` at the root: Node.js 22 on `node:22.22.2-bookworm-slim` pinned by digest, the engine `@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` from the lockfile's sha512, user `1000:1000` |
| Port | the service reads `PORT`, which Render sets to `10000` for every web service |
| Checked in the engine | `http-service.yml`, job `hosts`: `render.yaml` against `https://render.com/schema/render.yaml.json`, then the judged image run with `PORT=10000`, the file's variables, half a CPU and 512 MB, judged by `test/consumer.mjs` (mixed QR code and Code 128 in fast, frame and full, exact payloads, every refusal) |
| License | the image is AGPL-3.0-or-later (engine 0.11.0); every answer names its source in `X-Source-Code` |

## Cost, read on render.com on 21 November 2026

- The Blueprint selects `0.5c-512mb`, 0.5 CPU and 512 MB: 7 USD a month, billed prorated to the
  second, so a deployment deleted after an hour costs about one cent
  ([render.com/pricing](https://render.com/pricing), [blueprint spec](https://render.com/docs/blueprint-spec)).
  `1c-2g` is 25 USD a month.
- The smallest plan, **Free** (0 USD, 0.1 CPU and 512 MB, spun down after 15 minutes without
  traffic, [render.com/docs/free](https://render.com/docs/free)), is not the Blueprint's plan. In a
  container limited to 0.1 CPU and 512 MB, on 21 November 2026, a scan of the mixed sample took 12
  to 17 seconds, and with the engine's budgets every profile came back with
  `trace.budget_exhausted: true` (`frame` found only the QR code). The engine CI job `hosts`
  failed the same way on the free plan's profile (run 44892618394). In the same job on the
  `0.5c-512mb` profile, each scan took 0.9 to 1.3 seconds in the engine (run 44896488776), which
  is why the Blueprint sets four times the engine's budgets.
- The Hobby workspace is 0 USD a month plus compute. Outbound bandwidth beyond the workspace's
  included amount is 0.15 USD per GB. Check both pages again before choosing a plan.

## Owner steps

1. Sign in to Render with the account that should own the acceptance deployment. Creating an
   account and accepting Render's terms are the owner's.
2. Open `https://render.com/deploy?repo=https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http`.
   Render shows the Blueprint: one web service, `qrcode-barcode-scanner-http`, plan `0.5c-512mb`
   (7 USD a month, prorated to the second). Give the Blueprint a name, keep the region, add a
   payment method if Render asks for one, and approve it.
3. Wait for the deploy to end with the service live, then open `https://<service>.onrender.com/healthz`
   (Render shows the address). It answers `{"status":"ok","service":"0.1.0","engine":"0.11.0"}`.
4. From a clone of the repository, with Node.js 22, run the consumer against the deployed copy:
   `node test/consumer.mjs https://<service>.onrender.com test/fixtures/mixed-code128-qr.png --revision <commit>`,
   where `<commit>` is `engine.revision` in `SOURCE.json`. It must end with
   `consumer: all 16 checks passed`. Keep its output for the record.
5. Delete the web service (its **Settings**, **Delete Web Service**) and the Blueprint, then check
   that the address no longer answers.
6. Add the button to the README of `distribution/http` in the engine repository, or ask an agent to
   do it, and record the commit, the date and the consumer's output:

   ```markdown
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http)
   ```

Nothing in this kit has been run on Render. The button is not in any README yet, on purpose: it is
added once step 4 has passed on a real deployment.

## Upkeep

A change to `distribution/http` reaches the repository when an agent stages it again and pushes it.
`autoDeployTrigger: 'off'` keeps that push from redeploying anyone's copy: each user redeploys when
they choose.
