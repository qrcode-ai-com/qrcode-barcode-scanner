# Kaggle listing kit · QR Code & Barcode Scanner demo

The values and steps to publish `qrcode-barcode-scanner-demo.ipynb` as a public Kaggle notebook
(destination `round2-15`). Nothing here has been pushed to Kaggle: the account, the terms, the
phone check, the API token and the push are the owner's. The engine repository's workflow
`demos.yml` runs the same notebook from top to bottom on every change, with the same package and
the same sample, and judges its three reports.

## Decisions for the owner

1. **Terms fit.** Kaggle's terms limit the services to "your own internal, personal,
   non-commercial use, and not on behalf of or for the benefit of any third party", and allow one
   account per person, with no shared account. Options:
   - **(a) Recommended.** Publish from the owner's one personal account as an open-source
     tutorial. The notebook links only the source repository and the PyPI page, as committed; the
     QR Code AI product links stay in this repository's README.
   - (b) Add the QR Code AI product links to the notebook and accept the terms risk. The checker
     (`scripts/check-demo-notebook.py kaggle`) refuses a product link today, so this needs a
     change to the checker first.
   - (c) Skip Kaggle. The only option with no terms risk.
2. **Licence notice.** Kaggle shows a public notebook as released under Apache 2.0. The notebook's
   own cells are project-authored MIT source in this repository; the engine 0.11.0 it installs
   from PyPI keeps AGPL-3.0-or-later, and no engine source is pasted in a cell. Publishing means
   accepting that Kaggle shows the cells under Apache 2.0 as well.
3. **Kaggle username.** The notebook's address is `https://www.kaggle.com/code/<username>/qr-code-barcode-scanner-demo`.
   The slug follows the title (Kaggle lowercases it and turns every other character into a
   dash), so the title below gives that slug.

## Field values

| Field | Value |
| --- | --- |
| Title | `QR Code & Barcode Scanner demo` |
| Slug | `qr-code-barcode-scanner-demo` |
| Notebook file | `qrcode-barcode-scanner-demo.ipynb` |
| Language | Python |
| Type | Notebook |
| Visibility | Public (`is_private: false`) |
| Accelerator | None (`enable_gpu: false`) |
| Internet | On (`enable_internet: true`): the first cell installs the package from PyPI and the third downloads the sample |
| Environment | Pin to original environment (`docker_image_pinning_type: original`), so a later Kaggle image does not change the recorded run |
| Data sources | None: the sample comes from the release tag by URL and its SHA-256 is checked |
| Tags | `computer vision`, `image`, `python`, `beginner` (`keywords` in `kernel-metadata.json`; check them on the Settings pane after the first push and keep the ones Kaggle offers) |

Subtitle, for the notebook's header if Kaggle asks for one:

```text
Read a QR code and a Code 128 barcode with the open-source qrcode-barcode-scanner package from PyPI.
```

Short description, for a profile post or a discussion:

```text
An executed notebook that installs the open-source Python package qrcode-barcode-scanner 0.11.0 from PyPI, checks that the installed native module is the published wheel, and reads a QR code and a Code 128 barcode from one sample image with the fast, frame and full profiles. Each scan runs without a time budget, the reports are saved as JSON outputs, and the last cell uninstalls the package and proves it is gone. The engine runs in the Kaggle session.
```

### Privacy answers

The notebook sends no image anywhere: it downloads the package from PyPI and the sample image
from the scanner's GitHub release tag, and decodes the sample inside the Kaggle session. It reads
no Kaggle dataset, no secret and no file of the reader. A reader who forks it and adds an image
runs the scan in their own Kaggle session.

Pages a form may ask for, planned on the organization's site and live after the owner's review:

- Privacy: `https://qrcode-ai-com.github.io/privacy/`
- Terms: `https://qrcode-ai-com.github.io/terms/`
- Support: `https://qrcode-ai-com.github.io/support/`

Source and issues: `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust` and
`https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues`.

## Publish it

1. Sign in to the owner's one personal Kaggle account at `https://www.kaggle.com/`, or create it,
   and accept the terms.
2. In **Settings**, verify the phone number. A Kaggle forum thread says a notebook's Internet
   switch appears only after that; the documentation does not say so, and comments mention an
   identity check too. If Kaggle asks for one, it is the owner's.
3. In **Settings › API**, create a token. Keep it in the owner's own shell (`~/.kaggle/` or the
   environment the Kaggle CLI reads); it is never written to this repository or a workflow.
4. In a clean checkout of the engine repository at the commit to publish, install the Kaggle CLI
   in a new environment and push the folder. Replace `KAGGLE_USERNAME` in the copy's
   `kernel-metadata.json` with the account's username; do not commit that edit.

   ```sh
   python3 -m venv /tmp/kaggle-cli
   /tmp/kaggle-cli/bin/python -m pip install kaggle==2.2.5
   cp -R examples/kaggle /tmp/kaggle-push
   # edit /tmp/kaggle-push/kernel-metadata.json: "id": "<username>/qr-code-barcode-scanner-demo"
   /tmp/kaggle-cli/bin/kaggle kernels push -p /tmp/kaggle-push
   ```

   The first push creates the notebook and runs it from a clean state on Kaggle's CPU machine.
   Kaggle uploads only the notebook named by `code_file` and the metadata; the README and this
   file stay here.
5. Poll the run until it reads `complete`, then fetch what it wrote:

   ```sh
   /tmp/kaggle-cli/bin/kaggle kernels status <username>/qr-code-barcode-scanner-demo
   /tmp/kaggle-cli/bin/kaggle kernels output <username>/qr-code-barcode-scanner-demo -p /tmp/kaggle-output
   ```

   `/tmp/kaggle-output` then holds the log and `scan-reports/fast.json`, `frame.json` and
   `full.json`. Judge them with the engine's driver from the same checkout:

   ```sh
   python3 scripts/destination-acceptance.py reports --kind package \
     --produced-by "kaggle kernels push, the notebook's own cells" \
     --fast /tmp/kaggle-output/scan-reports/fast.json \
     --frame /tmp/kaggle-output/scan-reports/frame.json \
     --full /tmp/kaggle-output/scan-reports/full.json \
     --destination "Kaggle Notebooks" --identifier qrcode-barcode-scanner --version 0.11.0 \
     --url https://www.kaggle.com/code/<username>/qr-code-barcode-scanner-demo \
     --install "%pip install qrcode-barcode-scanner==0.11.0, in the notebook" \
     --receipt /tmp/kaggle-receipt.json
   python3 scripts/destination-acceptance.py removed --not-applicable --receipt /tmp/kaggle-receipt.json
   ```

   The removal happens in the Kaggle session, in the notebook's last cell; its output is the
   proof, so the receipt records it as not applicable on this machine.
6. Sign out, or open a private window, and read the public page back: the version number, the
   rendered outputs of every cell (the wheel name and SHA-256, the three profiles with
   `budget_exhausted: False`, the empty result, the `QRS-001` error, the removal lines), the
   links of the first cell with their `href`, the Apache 2.0 notice, and the environment image
   under **Logs**.
7. Keep the receipt with the notebook URL, the version number, the Kaggle image, the engine
   commit, the wheel identity and the link decision in the scanner workspace, outside this
   repository.

## Upkeep per release

Bump the pin in the install cell, `VERSION`, the module table and the sample's tag, as for
`examples/notebooks/` (the checker holds the pin to `binder/requirements.txt`). Then push again
from the owner's shell. A workflow of this repository cannot push: it would need the token in
the secrets context, which `scripts/check-publish-guards.py` forbids. Kaggle refreshes its image
about every two weeks; the pinned original environment keeps the recorded run, and a monthly run
of the latest environment shows a break early.

## Sources

Read on 21 November 2026.

- Kaggle CLI 2.2.5, `kernels push` and `kernels status`: https://github.com/Kaggle/kaggle-cli/blob/main/docs/kernels.md
- Kernel metadata fields: https://github.com/Kaggle/kaggle-cli/blob/main/docs/kernels_metadata.md
  (the push code warns when the title does not give the id's slug, and accepts
  `docker_image_pinning_type` `original` or `latest`)
- Notebooks documentation (Internet setting, `/kaggle/working`, image updates and pinning): https://www.kaggle.com/docs/notebooks
- The Python image, Python 3.13 on a Colab base: https://github.com/Kaggle/docker-python/blob/main/Dockerfile.tmpl
- Terms: https://www.kaggle.com/terms
- Phone verification and the Internet switch, a forum thread: https://www.kaggle.com/discussions/product-feedback/255038
