# DigitalOcean · owner kit

Two DigitalOcean routes run the scanner HTTP service. Both need a DigitalOcean account, which is the
owner's. Pages read on 21 November 2026.

- **App Platform**, with a Deploy to DigitalOcean button: App Platform reads
  `.do/deploy.template.yaml` at the root of the public repository
  `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http` and builds its `Dockerfile`. There
  is no store; the button is the publication
  ([button page](https://docs.digitalocean.com/products/app-platform/how-to/add-deploy-do-button/)).
- **Marketplace 1-Click Droplet** (destination `round2-10`): a vendor program with a review. The
  owner applies as a vendor, builds the image with Packer from `droplet/`, and submits it in the
  Vendor Portal ([vendors](https://marketplace.digitalocean.com/vendors),
  [marketplace-partners](https://github.com/digitalocean/marketplace-partners)).

## What is ready

| Item | Value |
| --- | --- |
| App spec | `distribution/http/.do/deploy.template.yaml`, staged at the root of the service's repository: app `qrcode-barcode-scanner`, one service `qrcode-barcode-scanner-http` from `git` `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http.git` branch `main`, `dockerfile_path: Dockerfile`, `http_port: 8080`, `instance_size_slug: apps-s-1vcpu-0.5gb`, one instance, health check `/healthz`, `QRSCAN_HTTP_MAX_CONCURRENT=1` and `QRSCAN_HTTP_BUDGET_SCALE=2` at run time |
| App spec checks | `http-service.yml`, job `hosts`, entry `digitalocean`: `doctl apps spec validate --schema-only` (doctl 2.7.0, pinned by sha256) and `scripts/check-http-hosts.py`, then the judged image run on port 8080 with the file's variable, 1 vCPU and 512 MB, judged by `test/consumer.mjs` |
| Droplet image recipe | `distribution/digitalocean/droplet/`: `template.pkr.hcl` (Packer 1.16.2, plugin `github.com/digitalocean/digitalocean` 1.4.2, base `ubuntu-24-04-x64`, build size `s-1vcpu-1gb`), `install.sh`, the systemd unit `qrscan-http.service`, the login message `99-qrcode-barcode-scanner` |
| What the Droplet holds | Node.js 22.22.2 from nodejs.org (sha256 checked) in `/opt/qrscan-http/node`; the service and the engine 0.11.0 from the lockfile's sha512 in `/opt/qrscan-http/app`; the unit `qrscan-http` on port 80 as a dynamic unprivileged user on a read-only system; ufw active with 22/tcp and 80/tcp only; settings in `/etc/qrscan-http.env` |
| Droplet checks | `http-service.yml`, job `droplet`: `packer init`, `packer fmt -check` and `packer validate`; then `install.sh` on a fresh GitHub Ubuntu 24.04 runner, the firewall rules, a non-root service user, the login message, the consumer against port 80 (mixed QR code and Code 128 in fast, frame and full, exact payloads, every refusal), then removal and a check that nothing answers. Packer's cleanup and DigitalOcean's `99-img-check.sh` run only on a real build Droplet, at step B3 |
| DigitalOcean scripts | `90-cleanup.sh` and `99-img-check.sh` from `digitalocean/marketplace-partners` at commit `fb9f872e7ade13b530da5ef2b7a3e7938c0f3774`, checked against their sha256 in the template |
| License | engine 0.11.0 AGPL-3.0-or-later, so the image or app as a whole is AGPL-3.0-or-later; Node.js MIT; the service's files MIT. Every answer names its source in `X-Source-Code` |

## Cost, read on digitalocean.com on 21 November 2026

- **App Platform**: `apps-s-1vcpu-0.5gb`, 1 shared vCPU and 512 MiB with 50 GiB of transfer, is
  5 USD a month; the next size, `apps-s-1vcpu-1gb-fixed`, is 10 USD. The free tier covers static
  sites only, so a user's deployment of this service costs at least 5 USD a month
  ([pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/)).
- **Droplet build**: the build Droplet `s-1vcpu-1gb` is 6 USD a month, billed for the minutes the
  build runs. Snapshots are 0.06 USD per GB-month ([Droplet pricing](https://www.digitalocean.com/pricing/droplets),
  [snapshot pricing](https://docs.digitalocean.com/products/snapshots/details/pricing/)). DigitalOcean
  advises a 6 USD build Droplet so that every Droplet size can use the image; the 4 USD size has a
  10 GiB disk, smaller than the image's.
- **Vendor program**: no fee is stated for a Droplet 1-Click App. The revenue share stated on the
  vendor pages is for SaaS add-ons. Users pay DigitalOcean for their own Droplets.

## App Platform: owner steps

1. Sign in to DigitalOcean; the account, its billing and DigitalOcean's terms are the owner's.
2. Open `https://cloud.digitalocean.com/apps/new?repo=https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http/tree/main`.
   App Platform reads the app spec: one service, size `apps-s-1vcpu-0.5gb`, variables
   `QRSCAN_HTTP_MAX_CONCURRENT=1` and `QRSCAN_HTTP_BUDGET_SCALE=2`. Keep the values and press **Deploy**.
3. When the app is live, run the consumer from a clone of the repository with Node.js 22:
   `node test/consumer.mjs https://<app>.ondigitalocean.app test/fixtures/mixed-code128-qr.png --revision <commit>`,
   where `<commit>` is `engine.revision` in `SOURCE.json`. It must end with
   `consumer: all 16 checks passed`. Keep the output.
4. Destroy the app (**Settings**, **Destroy**) and check that the address no longer answers.
5. Add the button to the README of `distribution/http` in the engine repository, or ask an agent to,
   and record the date and the consumer's output. A `&refcode=` suffix is optional and personal:

   ```markdown
   [![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http/tree/main)
   ```

## Marketplace 1-Click Droplet: owner steps

B1. **Apply.** At [marketplace.digitalocean.com/vendors](https://marketplace.digitalocean.com/vendors),
    **Become a Vendor**: describe the 1-Click App and the company. The form's fields were not
    readable signed out. After approval DigitalOcean opens the Vendor Portal.

B2. **Decide the upkeep.** The vendor rebuilds and resubmits the image for every service release
    and for base-system security updates, and keeps the listing accurate; DigitalOcean's
    marketplace terms ask for notice of a security breach within eight hours. The research note of
    10 November 2026 recommended not to become a vendor before the service has users.

B3. **Build the image.** From the root of a clone of the engine repository, with Python 3 and
    Packer 1.16.2, and the owner's DigitalOcean API token in the environment only:

    ```sh
    python3 scripts/stage-http-satellite.py stage --out build/http
    packer init distribution/digitalocean/droplet/template.pkr.hcl
    DIGITALOCEAN_API_TOKEN=<token> packer build distribution/digitalocean/droplet/template.pkr.hcl
    ```

    Packer starts a build Droplet, installs the service, runs DigitalOcean's cleanup and
    `99-img-check.sh`, saves the snapshot `qrcode-barcode-scanner-0.1.0-<timestamp>` and destroys
    the Droplet. The image check must end without a critical failure.

B4. **Boot test.** Create a Droplet from the snapshot, then from your computer:
    `node test/consumer.mjs http://<droplet address> test/fixtures/mixed-code128-qr.png --revision <commit>`.
    Check that only ports 22 and 80 answer, read the login message over SSH, then destroy the Droplet.

B5. **Submit** in the Vendor Portal with the values below, and answer the review.

B6. After acceptance, create a Droplet from the public listing, repeat B4, destroy it, and record
    the listing address, the snapshot name, Ubuntu 24.04, the service and engine versions and the
    costs.

### Listing values

| Field | Value |
| --- | --- |
| App name | `QR Code & Barcode Scanner` |
| Version | `0.1.0` (service), engine `0.11.0` |
| Operating system | Ubuntu 24.04 LTS |
| Software included | QR Code & Barcode Scanner engine 0.11.0 (AGPL-3.0-or-later), its HTTP service 0.1.0 (MIT source), Node.js 22.22.2 (MIT) |
| License link | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/distribution/http/LICENSE-NOTES.md` |
| Project and documentation | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/distribution/http` |
| Homepage | `https://qrcode-ai.com/` |
| Support | `https://qrcode-ai-com.github.io/support/` (live after the owner's review) and `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues` |
| Privacy, terms | `https://qrcode-ai-com.github.io/privacy/`, `https://qrcode-ai-com.github.io/terms/` (live after the owner's review) |
| Recommended size | 1 GB of memory or more (`s-1vcpu-1gb`) |

**Summary.** A self-hosted HTTP service that reads QR codes and barcodes in images, built on the
open-source QR Code & Barcode Scanner engine.

**Description.** QR Code & Barcode Scanner reads every QR code and barcode in an image: QR Code,
Micro QR, Data Matrix, Aztec, PDF417, EAN, UPC, Code 128, Code 39 and more. This Droplet runs it as a
small HTTP service on port 80. Send an image to `POST /scan` and get back a JSON report with each
code's format, exact text and position. Images are read in memory and never stored, and the
service makes no outbound request. The service runs as an unprivileged user on a read-only system,
and the firewall allows SSH and port 80 only. It has no account or key of its own: put TLS and
your own access control in front of it before you expose it.

**Getting started.**

```text
curl http://<droplet address>/healthz
curl --data-binary @label.png -H 'content-type: image/png' 'http://<droplet address>/scan?mode=fast'
```

`mode` is `fast`, `frame` (the default) or `full`. Settings that lower the limits (input size,
image size, scans at once) go in `/etc/qrscan-http.env`, then `systemctl restart qrscan-http`.
`journalctl -u qrscan-http` shows one line per request, without the image or the decoded text.

## Upkeep

App Platform: a change to `distribution/http` reaches the repository when an agent stages it again
and pushes it; users redeploy when they choose. Droplet: every service release and every
base-system security update needs a new snapshot (step B3) and a resubmission (step B5).
