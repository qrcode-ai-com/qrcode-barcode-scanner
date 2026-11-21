# JupyterLab Extension Manager listing: jupyterlab-qrcode-barcode-scanner

What JupyterLab's Extension Manager will show for this extension, where each value comes from, and
the owner's steps to publish it. The extension is ready for PyPI. It is not on PyPI yet, so the
Extension Manager does not list it. The project name `jupyterlab-qrcode-barcode-scanner` is
proposed: it was free on PyPI on 21 November 2026, and nothing reserves it.

Since JupyterLab 4, the Extension Manager reads its catalogue from PyPI and installs with pip. It
lists every PyPI project with the classifier
`Framework :: Jupyter :: JupyterLab :: Extensions :: Prebuilt`, and the `install.json` of the
installed extension tells it which Python package to update or uninstall. There is no submission
form and no review: the listing follows the PyPI release.

## Why a prebuilt extension

The Extension Manager installs Python packages that carry a built frontend. A kernel-side widget
would be a library to import in a notebook, not something the manager lists. The extension is
therefore a prebuilt labextension: one `py3-none-any` wheel whose frontend bundles the published
browser engine `@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0`. It needs no rebuild of
JupyterLab, no Node.js on the user's machine, no server extension and no kernel. The scan runs in
the browser tab.

## The package

| Field | Value |
|---|---|
| PyPI project | `jupyterlab-qrcode-barcode-scanner` |
| Version | 0.1.0, tag `jupyterlab-v0.1.0` |
| Labextension | `@qrcode-ai-com/jupyterlab-qrcode-barcode-scanner`, installed to `share/jupyter/labextensions/` by the wheel; not published to npm |
| Engine | `@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0`, bundled; module SHA-256 `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68` |
| Licence | `MIT AND AGPL-3.0-or-later`: the extension's code is MIT, the bundled engine AGPL-3.0-or-later ([LICENSE-NOTES.md](LICENSE-NOTES.md)) |
| Wheel | `jupyterlab_qrcode_barcode_scanner-0.1.0-py3-none-any.whl`, about 1 MB |
| sdist | `jupyterlab_qrcode_barcode_scanner-0.1.0.tar.gz`, with the built labextension |

The workflow `integration-jupyterlab` built commit `COMMIT` on CI (run RUN_URL), checked both
files with `twine check --strict` and printed:

```text
WHEEL_SHA256  jupyterlab_qrcode_barcode_scanner-0.1.0-py3-none-any.whl
SDIST_SHA256  jupyterlab_qrcode_barcode_scanner-0.1.0.tar.gz
```

These are the digests of that commit's build. The wheel takes the dates of its entries from its
commit, so the tag's run builds other bytes; the run prints the digests it uploads, and those are
the ones PyPI must serve.

## What the listing reads

| Extension Manager or PyPI field | Value | Source |
|---|---|---|
| Name | `jupyterlab-qrcode-barcode-scanner` | `pyproject.toml` `name` |
| Summary | Read QR codes and barcodes in JupyterLab: a panel that scans an image in the browser with the open-source QR Code & Barcode Scanner engine. | `package.json` `description` |
| Description (PyPI) | this folder's README, with every image and link by absolute URL | `pyproject.toml` `readme` |
| Version | 0.1.0 | `package.json` `version` |
| Authors | Thibaut Mélen, Nicolas Cella | `pyproject.toml` `authors` |
| Licence | MIT AND AGPL-3.0-or-later | `pyproject.toml` `license` |
| Classifiers | Framework :: Jupyter :: JupyterLab :: 4, Extensions :: Prebuilt and their parents | `pyproject.toml` `classifiers` |
| Python | >= 3.9; no Python dependency, JupyterLab 4 is the user's | `pyproject.toml` |
| Homepage | <https://qrcode-ai.com/en-US/qr-code-scanner/integrations/jupyterlab> | `[project.urls]` |
| Source | <https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/jupyterlab> | `[project.urls]` |
| Bug Tracker | <https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues> | `[project.urls]` |
| Package to manage | `jupyterlab-qrcode-barcode-scanner`, with pip | `install.json` |

The privacy, terms and support pages are live after the owner's review:
<https://qrcode-ai-com.github.io/privacy/>, <https://qrcode-ai-com.github.io/terms/> and
<https://qrcode-ai-com.github.io/support/>. The package metadata does not name them: the metadata
of a PyPI release cannot change after its upload.

## Screenshot

![The QR Code & Barcode Scanner panel in JupyterLab beside the file browser: the sample image scanned with the full profile lists a QR code with https://qrc-ai.com/76xMa and a Code 128 barcode with STOCK-4827](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/jupyterlab/media/scanner-panel.png)

`media/scanner-panel.png` is a real JupyterLab 4.6.6 in Chrome 158, 1360 by 860 at device scale 2,
with this extension's wheel installed in a new environment. `tests/file-browser.mjs` right-clicked
the sample in the file browser, chose **Scan for QR codes and barcodes**, switched the profile to
`full`, checked that both codes were listed and saved the page.

## The owner's steps

Nothing here has been done: no environment, rule, tag or PyPI project exists for this extension
yet.

### Once

1. **The PyPI pending publisher.** Sign in to <https://pypi.org> as the account that will own the
   project, open **Your account**, then **Publishing**. Under **Add a new pending publisher**,
   choose **GitHub** and enter:

   | Field | Value |
   |---|---|
   | PyPI Project Name | `jupyterlab-qrcode-barcode-scanner` |
   | Owner | `qrcode-ai-com` |
   | Repository name | `qrcode-barcode-scanner-rust` |
   | Workflow name | `python-plugins-publish.yml` |
   | Environment name | `pypi-jupyterlab` |

   Press **Add**. The first upload from that workflow and environment creates the project.

2. **The environment.** In the repository, open **Settings**, **Environments**, **New
   environment**, and name it `pypi-jupyterlab`. Under **Deployment protection rules**, tick
   **Required reviewers**, add the owner, and leave **Allow administrators to bypass** unticked.
   Under **Deployment branches and tags**, choose **Selected branches and tags**, then **Add
   deployment branch or tag rule**, ref type **Tag**, pattern `jupyterlab-v*`. Add no secret and no
   variable. Press **Save protection rules**.

3. **The tag rule.** Open **Settings**, **Rules**, **Rulesets**, then the ruleset of distribution
   tags. Under **Target tags**, **Add target**, **Include by pattern**, enter `jupyterlab-v*` and
   save.

### Each release

4. **The release commit.** Before the tag, merge a change to `main` that turns the README's
   **Status** into the published wording and adds to **Install** the two ways a published
   extension installs: pip with the project name, and JupyterLab's Extension Manager. The README is
   the PyPI description of the version: it cannot change once uploaded. Check that the Homepage
   page answers: it answered 404 on 21 November 2026. Wait for `integration-jupyterlab` to pass on
   that pull request.

5. **The tag.** Tag the merged commit and push the tag:
   `git tag -a jupyterlab-v0.1.0 <commit> -m 'JupyterLab extension 0.1.0'`, then
   `git push origin jupyterlab-v0.1.0`.

6. **The run.** Open **Actions**, **Publish · Python plugins**, the run of that tag. When
   `jupyterlab-build` has passed, it prints the two digests. `jupyterlab-publish` waits: press
   **Review deployments**, tick `pypi-jupyterlab` and **Approve and deploy**. It checks the tag,
   re-inspects the two files, compares them with what PyPI serves and uploads them through OIDC.

7. **Read back PyPI.** Open <https://pypi.org/project/jupyterlab-qrcode-barcode-scanner/0.1.0/>.
   **Download files** lists the wheel and the sdist with the digests the run printed, and each
   file's **Provenance** names the workflow `python-plugins-publish.yml`.

8. **Read back the Extension Manager.** In a new environment with JupyterLab 4, open JupyterLab,
   then the **Extension Manager** in the left sidebar, and enable it if asked. Search for
   `qrcode`: **jupyterlab-qrcode-barcode-scanner** appears, since the manager reads PyPI (its list
   is cached for up to five minutes). Install it, reload the page, open the **QR Code & Barcode
   Scanner** card of the launcher and scan the sample: both codes are listed.

A file on PyPI is immutable. A mistake is a new extension version and a new tag.
