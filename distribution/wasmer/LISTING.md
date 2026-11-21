# Wasmer registry · the owner's publication kit

Status when this file was written (21 November 2026): **not published**. The registry knew no
namespace `qrcode-ai-com` and no package `qrcode-ai-com/qrcode-barcode-scanner` (its GraphQL API
answered `null` for both). No workflow publishes: Wasmer has no publication from CI without a
stored token, and this repository stores none. The owner publishes from their own machine, from
the package folder a workflow run built and tested.

## What gets published

| Field | Value |
| --- | --- |
| Package | `qrcode-ai-com/qrcode-barcode-scanner` |
| Version | `0.11.0` |
| Description | Open-source QR code and barcode scanner: the qrscan command as a WASI module. It reads an image file and prints the JSON report, locally. |
| License | `AGPL-3.0-or-later`, file `LICENSE` (the text of the 0.11.0 source) |
| Readme | `README.md` (the README of this folder) |
| Homepage | `https://qrcode-ai.com/` |
| Repository | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust` |
| Module | `qrscan.wasm`, ABI `wasi`, built from tag v0.11.0, commit `176ac96ef16ee330dbfc6ada10327d0b4e23a8b2` |
| Command | `qrscan`, runner `wasi`, also the package entrypoint |
| Mapped directory | `notices/` at `/notices`: the license notes, Apache-2.0 notices, third-party licenses, Rust standard library notice and `SOURCE.json` |

Every value comes from `wasmer.toml`; `package.py verify` refuses a folder whose manifest says
otherwise. The page of the package will be `https://wasmer.io/qrcode-ai-com/qrcode-barcode-scanner`.

The module is a new build of the immutable tag v0.11.0 for the `wasm32-wasip1` target. It
republishes none of the 0.11.0 release files, whose bytes stay as they are; the published
package names the tag as its corresponding source.

## The artifact to publish

- Workflow: **Wasmer · WASI module** (`.github/workflows/wasmer.yml`).
- Artifact: `qrscan-wasmer-package`, a folder with `wasmer.toml`, `README.md`, `LICENSE`,
  `qrscan.wasm`, `notices/` and `SHA256SUMS`.
- `qrscan.wasm` sha256: `65c4436f2ac461bd94696c9daaf7fce40bf5a6c26203f1a7115a8d9201c45460`. Both
  builds of run [44883180229](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44883180229),
  in two directories, gave it; every later run of the same source and toolchain must give it too.
- Run that verified it under Wasmer: [44885967740](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44885967740).
  The truth set, the native comparison, the acceptance, the notices check and the removal
  receipt passed there; its last assertion, on the Wasmer home after the removal probe, was
  reordered in the next commit.

Take the artifact of the latest green run on `main` for the merged commit: its
`notices/SOURCE.json` names that commit as the packaging revision. A run on a pull request
records a temporary merge commit instead. The module sha256 is the same in both, since the
module depends only on the 0.11.0 source and the toolchain.

## Cost

Read live on <https://wasmer.io/pricing> on 21 November 2026. **Hobby** is free ("Free hosting
for personal, noncommercial projects", one member seat, 1 GB of package storage). **Pro** is $10
a month, or $5 a month for the first 12 months with the offer that ends on 30 November 2026,
with team seats. The page's FAQ entry "Can I run ads or use the Hobby plan commercially?" holds
the rule for a company namespace; its answer did not load when this was read, so the owner reads
it before choosing the plan. `notices/SOURCE.json` gives the size of the module.

## Steps

The owner does each step; none of them runs in CI.

1. Install Wasmer 7.5.0 from its release archive and check it. On macOS arm64:

   ```sh
   mkdir -p ~/.local/wasmer-7.5.0 && cd ~/.local/wasmer-7.5.0
   curl -fsSLO https://github.com/wasmerio/wasmer/releases/download/v7.5.0/wasmer-darwin-arm64.tar.gz
   echo "fd6526fdce3f8c68a8c3139e9b0e438991d04bafda3d0f091bf98c1600ea0401  wasmer-darwin-arm64.tar.gz" | shasum -a 256 -c -
   tar -xzf wasmer-darwin-arm64.tar.gz && export PATH="$PWD/bin:$PATH" && wasmer --version
   ```

   On Linux x64 the archive is `wasmer-linux-amd64.tar.gz`, sha256
   `23f99818deaad93859f8bb8292af81f0c39f25aea19eaccfb72fc7c9e8a3fae9`.
2. Create the account at <https://wasmer.io/signup> and accept Wasmer's terms there.
3. Sign in from the terminal: `wasmer login`. It opens the browser; if it cannot, create a token
   at <https://wasmer.io/settings/access-tokens> and paste it when `wasmer login` asks. The
   token stays in the Wasmer home on this machine; it is never stored in the repository.
4. Create the namespace: `wasmer namespace create qrcode-ai-com --display-name "QR Code AI"`.
   `wasmer namespace list` then shows it.
5. Download the artifact `qrscan-wasmer-package` of the run named above, from the run's page on
   GitHub (section **Artifacts**), and unzip it into an empty folder, for example
   `~/Downloads/qrscan-wasmer-package`.
6. Check it from a checkout of this repository at the same commit:

   ```sh
   cd ~/Downloads/qrscan-wasmer-package && shasum -a 256 -c SHA256SUMS && cd -
   python3 distribution/wasmer/package.py verify ~/Downloads/qrscan-wasmer-package --module-sha256 <qrscan.wasm sha256 above>
   ```

   Both must pass. Do not edit any file of the folder: `verify` refuses a changed file.
7. Look at what will be sent, still without publishing:
   `wasmer publish --dry-run ~/Downloads/qrscan-wasmer-package`. It needs the login of step 3.
8. Publish: `wasmer publish ~/Downloads/qrscan-wasmer-package`. A version is immutable once
   published: a fix becomes a new version.
9. Read the page back at <https://wasmer.io/qrcode-ai-com/qrcode-barcode-scanner>: version
   0.11.0, the license, the README, the `qrscan` command.
10. Run it from the registry on a fresh Wasmer home, as a user would:

    ```sh
    export WASMER_DIR="$(mktemp -d)"
    mkdir -p /tmp/images && cp fixtures/symbology/mixed-code128-qr.png /tmp/images/label.png
    wasmer run --volume /tmp/images:/data qrcode-ai-com/qrcode-barcode-scanner@0.11.0 -- /data/label.png
    ```

    The report must hold `https://qrc-ai.com/76xMa` and `STOCK-4827`. For the full truth set,
    run `QRSCAN_WASMER_ONLINE=1 QRSCAN_WASMER_PACKAGE=qrcode-ai-com/qrcode-barcode-scanner@0.11.0
    python3 distribution/wasmer/consume.py --qrscan "$PWD/distribution/wasmer/qrscan-in-wasmer.sh"
    --version 0.11.0 --receipt /tmp/wasmer-registry-truth.json`.

After publication, the README of this folder and `distribution/README.md` get the registry route
and its first verified run in a follow-up change; until then they give no install command for it.
