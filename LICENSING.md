# Licensing

The QR Code & Barcode Scanner engine (`qrcode-barcode-scanner` packages from 0.11.0,
`qrcode-ai-scanner` packages through 0.10.x) is **dual-licensed**. You may use it under
**either** license below.

## ① AGPL-3.0-or-later — free & open source (the default)

Free for open-source projects, research, and personal use — for anyone willing to comply
with the [AGPL-3.0-or-later](LICENSE). The AGPL is strong copyleft: if you **distribute** a
work that includes this library, or run a modified version that users interact with **over a
network**, you must make your **complete corresponding source** available under the AGPL.

## ② Commercial license — for proprietary / closed-source use

To embed the QR Code & Barcode Scanner engine in a **closed-source or proprietary**
product — a native mobile app (iOS / Android), a SaaS you won't open-source, or any
commercial software — **without** the AGPL's source-disclosure obligations, a commercial
license is available.

**→ For commercial licensing, contact `studio.supernovae@gmail.com`.**

## Which license do I need?

| Your use | License |
|---|---|
| Open-source project (AGPL-compatible), research, personal | **AGPL** — free ✅ |
| Internal tool you don't distribute or expose over a network | **AGPL** — free ✅ |
| Closed-source app / proprietary product / SaaS (no source disclosure) | **Commercial** |
| Native mobile app shipped on the App Store / Play Store | **Commercial** (these are almost always closed-source) |

Unsure? The AGPL is always the safe free option — reach out if you need the commercial terms.

## Portable consumer skill

The original instructions and helpers under [`skills/qrcode-barcode-scanner/`](skills/qrcode-barcode-scanner/)
are separately licensed **MIT-0**, as declared in that directory's LICENSE.
They do not bundle or relicense the engine. Installing the scanner as a separate
dependency retains its AGPL-3.0-or-later or agreed commercial terms. The MCP
adapter and CLI container retain the engine's AGPL source/license materials.
The portable bundle metadata and setup helpers under `integrations/openclaw/`
are also MIT-0. Their separately installed MCP adapter and engine retain AGPL.

## Prebuilt `qrscan` archives

The `qrcode-barcode-scanner-cli-X.Y.Z-<target>` archives attached to a release hold `LICENSE`,
`LICENSING.md` and the third-party notices and license texts beside the program. Their
corresponding source is the same release's `qrcode-barcode-scanner-cli-X.Y.Z-source.tar.gz`, a
`git archive` of the commit they were built from, whose SHA-256 is a line of
`qrcode-barcode-scanner-cli-X.Y.Z-SHA256SUMS`. The third-party Rust crates linked into `qrscan`
are not bundled: each archive's `build-info.json` lists them with their `Cargo.lock`
checksums, and its `SOURCE.md` gives their crates.io download address.

## Contributions

By submitting a contribution (e.g. a pull request) you agree that it is licensed under
**both** the AGPL-3.0-or-later **and** SuperNovae Studio's commercial license — i.e. you
grant SuperNovae Studio the right to distribute your contribution under both, so the
dual-license model stays intact (inbound = outbound, dual). This keeps the project freely
available to the community **and** sustainable.

---

Developed by **Thibaut Mélen** for **QR Code AI**, a product of **SuperNovae Studio**.
SuperNovae Studio administers the dual-license model and handles commercial licensing.

© SuperNovae Studio. Already-published `0.x` releases remain available under the AGPL.
