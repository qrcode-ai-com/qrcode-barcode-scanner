# napari hub listing: napari-qrcode-barcode-scanner

What the napari hub and napari's plugin manager will show for this plugin, where each value comes
from, and the owner's steps to publish it. The plugin is ready for PyPI. It is not on PyPI yet, so
neither lists it.

The napari hub lists a plugin that has a release on PyPI with the `Framework :: napari` classifier,
a valid npe2 manifest declared by the `napari.manifest` entry point and `visibility: public`. It
reads them from npe2api (`api.napari.org`), which rebuilds its index daily, and refreshes up to
every 4 hours. There is no submission form.

## The package

| Field | Value |
|---|---|
| PyPI project | `napari-qrcode-barcode-scanner` |
| Version | 0.1.0, tag `napari-v0.1.0` |
| Engine | `qrcode-barcode-scanner==0.11.0`, installed from PyPI as a dependency; the plugin does not bundle it |
| Licence | MIT (`License-Expression: MIT`, `LICENSE`); the engine wheel keeps its own licence |
| Wheel | `napari_qrcode_barcode_scanner-0.1.0-py3-none-any.whl` |
| sdist | `napari_qrcode_barcode_scanner-0.1.0.tar.gz` |

The job `napari` of `integration-python-hosts` built commit `3612ef3` of pull request #137 on CI
(run [44886529397](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44886529397), 21 November 2026), checked both files with
`twine check --strict` and printed:

```text
e0074a12390d19b195bd29a583a5875658f9007fcbf810ed9783e473fdbe96e3  napari_qrcode_barcode_scanner-0.1.0-py3-none-any.whl
06523bc8963baa0a152b368887aa7a9baa73dab366d3afd0fa934336805a3acc  napari_qrcode_barcode_scanner-0.1.0.tar.gz
```

These are the digests of that commit's build. Each build of a commit puts the same entries, with
the same dates, in its wheel: a rebuild of `3612ef3` on macOS gave the same entries and other
compressed bytes, as its zlib differs. The sdist's archive dates change with each build. So the
tag's run builds other bytes, prints the two digests it uploads and uploads those very files: they
are the ones PyPI must serve.

## What the listing reads

| Hub field | Value | Source |
|---|---|---|
| Name | `napari-qrcode-barcode-scanner` | `pyproject.toml` `name` |
| Display name | QR Code & Barcode Scanner | `napari.yaml` `display_name` |
| Summary | Read the QR codes and barcodes of a napari image layer with the QR Code & Barcode Scanner engine. | `pyproject.toml` `description` |
| Description | this folder's README, with every image and link by absolute URL | `pyproject.toml` `readme` |
| Visibility | public | `napari.yaml` `visibility` |
| Categories | Measurement, Utilities | `napari.yaml` `categories` |
| Contributions | the widget "Scan QR codes and barcodes" and its command | `napari.yaml` `contributions` |
| Authors | Thibaut Mélen, Nicolas Cella | `pyproject.toml` `authors` |
| Licence | MIT | `pyproject.toml` `license` |
| Python | >= 3.10 | `pyproject.toml` `requires-python` |
| Operating systems | macOS, Windows, Linux | classifiers |
| Requirements | numpy >= 1.24, magicgui >= 0.8, qrcode-barcode-scanner == 0.11.0; napari and Qt are the user's | `pyproject.toml` `dependencies` |
| Homepage | <https://qrcode-ai.com/en-US/qr-code-scanner/integrations/napari> | `[project.urls]` |
| Documentation | <https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/napari> | `[project.urls]` |
| Source Code (the hub's GitHub link) | <https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust> | `[project.urls]` |
| Bug Tracker | <https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues> | `[project.urls]` |

The privacy, terms and support pages are live after the owner's review:
<https://qrcode-ai-com.github.io/privacy/>, <https://qrcode-ai-com.github.io/terms/> and
<https://qrcode-ai-com.github.io/support/>. The package metadata does not name them: the metadata
of a PyPI release cannot change after its upload.

## Screenshot

![A napari window: the sample image with its QR code and its Code 128 barcode outlined and labelled in a new shapes layer, the layer list, and the plugin's form](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/napari/media/napari-window.png)

`media/napari-window.png` is the window of a real napari 0.10.0, with PyQt6 6.12.1 on a virtual
display (xvfb, 1600 by 1000). The job `napari-window` of `integration-python-hosts` installed the
plugin's built wheel in a new environment, added its widget as the Plugins menu does, ran a `full`
scan of the mixed sample and checked that both codes were outlined before saving the window
(`tests/capture_window.py`). It comes from the same run, [44886529397](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/actions/runs/44886529397): 1440 by 900
pixels, sha256 `a047712e60529ebded32f47d336c8836b960952ae3e2970f258848628b146f9f`.

## The owner's steps

Nothing here has been done: no environment, rule, tag or PyPI project exists for this plugin yet.

### Once

1. **The PyPI pending publisher.** Sign in to <https://pypi.org> as the account that will own the
   project, open **Your account**, then **Publishing**. Under **Add a new pending publisher**,
   choose **GitHub** and enter:

   | Field | Value |
   |---|---|
   | PyPI Project Name | `napari-qrcode-barcode-scanner` |
   | Owner | `qrcode-ai-com` |
   | Repository name | `qrcode-barcode-scanner-rust` |
   | Workflow name | `python-plugins-publish.yml` |
   | Environment name | `pypi-napari` |

   Press **Add**. The first upload from that workflow and environment creates the project.

2. **The environment.** In the repository, open **Settings**, **Environments**, **New
   environment**, and name it `pypi-napari`. Under **Deployment protection rules**, tick
   **Required reviewers**, add the owner, and leave **Allow administrators to bypass** unticked.
   Under **Deployment branches and tags**, choose **Selected branches and tags**, then **Add
   deployment branch or tag rule**, ref type **Tag**, pattern `napari-v*`. Add no secret and no
   variable. Press **Save protection rules**.

3. **The tag rule.** Open **Settings**, **Rules**, **Rulesets**, then the ruleset of distribution
   tags. Under **Target tags**, **Add target**, **Include by pattern**, enter `napari-v*` and save.

### Each release

4. **The release commit.** Before the tag, merge a change to `main` that turns the README's
   **Status** into the published wording and adds to **Install** the two ways a published plugin
   installs: pip with the project name, and napari's **Plugins**, **Install/Uninstall Plugins**.
   The README is the PyPI description of the version: it cannot change once uploaded. Check that the Homepage page answers: it answered 404 on 21 November 2026. Wait for
   `integration-python-hosts` to pass on that pull request.

5. **The tag.** Tag the merged commit and push the tag:
   `git tag -a napari-v0.1.0 <commit> -m 'napari plugin 0.1.0'`, then
   `git push origin napari-v0.1.0`.

6. **The run.** Open **Actions**, **Publish · Python plugins**, the run of that tag. When
   `napari-build` has passed, it prints the two digests. `napari-publish` waits: press **Review
   deployments**, tick `pypi-napari` and **Approve and deploy**. It checks the tag, re-inspects the
   two files, compares them with what PyPI serves and uploads them through OIDC.

7. **Read back PyPI.** Open <https://pypi.org/project/napari-qrcode-barcode-scanner/0.1.0/>.
   **Download files** lists the wheel and the sdist with the digests the run printed, and each
   file's **Provenance** names the workflow `python-plugins-publish.yml`. Installing version 0.1.0
   from PyPI in a new environment must install the engine wheel 0.11.0 with it.

8. **Read back the napari hub.** After npe2api's next daily build and up to 4 hours more, the
   plugin's page appears at <https://napari-hub.org/plugins/napari-qrcode-barcode-scanner>, with
   the display name, the summary, the README and the GitHub link of the table above.

9. **Read back napari's plugin manager.** In napari 0.10.0, open **Plugins**, **Install/Uninstall
   Plugins**, search for `qrcode`, install **QR Code & Barcode Scanner** and restart napari. Open
   the sample image, then **Plugins**, **Scan QR codes and barcodes (QR Code & Barcode
   Scanner)**, and press **Run**: both codes are outlined.

A file on PyPI is immutable. A mistake is a new plugin version and a new tag.
