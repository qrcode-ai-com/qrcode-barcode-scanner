# Licence notes · Replicate model

This folder holds two kinds of material with different terms.

## The source in this folder: MIT

`run.py`, `cog.yaml`, `requirements.txt`, `.dockerignore`, the tests and the texts of this folder
are project-authored source under the [MIT License](LICENSE).

## The built image: AGPL-3.0-or-later

`cog build` and `cog push` make a container image that installs the published engine wheel
`qrcode-barcode-scanner` 0.11.0 from PyPI. That wheel was published under
**AGPL-3.0-or-later** and keeps that licence. Its licence text ships inside the wheel, at
`qrcode_barcode_scanner-0.11.0.dist-info/licenses/LICENSE` in the image's Python
`site-packages`. The image as a whole is therefore distributed under AGPL-3.0-or-later, the
licence of the engine it embeds. This is working default decision 12 of the scanner's
distribution plan, which the owner has not yet confirmed.

The image also holds Cog's own runtime (`cog` and `coglet` 0.23.1 from PyPI, Apache-2.0), the
Python 3.13 interpreter and the system packages of Cog's base image, each under its own licence.

## The source offer for the hosted model

On Replicate the model is a network service: people send it images and get reports back without
receiving a copy of the program. AGPL-3.0-or-later section 13 asks that those users be offered the
Corresponding Source. The model page must therefore carry this offer, in its README and in its
GitHub link:

- the source of the engine 0.11.0: the tag
  [v0.11.0 of the engine repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0)
  and the source distribution on
  [PyPI](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/);
- the source of the model: this folder, at the commit the version was pushed from,
  `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/<commit>/integrations/replicate`.

[LISTING.md](LISTING.md) gives the exact text for the model page. When a new version is pushed,
its commit replaces `<commit>` in that text.

## More

The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md)
explains the boundaries between the MIT source, the published archives and third-party
components, and the
[licence history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx)
records earlier grants.
