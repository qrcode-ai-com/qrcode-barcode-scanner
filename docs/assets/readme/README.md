# README media

These illustrations use versioned scanner fixtures and actual local scans from
the 0.11 development artifact. The animation is a **post-decode visualization
of a static report**, not a physical-camera recording or a capture of the camera
example's interface. It illustrates selecting occurrences from an existing
report. It does not measure real-time tracking, frame rate or scan latency.

| Asset | Content |
| --- | --- |
| [gallery.png](gallery.png) | Twelve fixture examples: clean/artistic QR, Micro QR, rMQR, Data Matrix, GS1 Data Matrix, centered Aztec, PDF417, Code 128, EAN-13, Code 39 and UPC-A. Each source fixture decoded as its labelled format. |
| [payloads.png](payloads.png) | Public QR fixtures carrying Wi-Fi, MECARD, SMS and GS1 Digital Link content. Showing a decoded payload does not execute it. |
| [mixed-codes.png](mixed-codes.png) | Actual full-profile results for QR `https://qrc-ai.com/76xMa` beside Code 128 `STOCK-4827`. |
| [scan-replay.gif](scan-replay.gif) | Six-second selection visualization: two physical copies of one QR payload and one Code 128. |
| [scan-replay.mp4](scan-replay.mp4) | The same six-second visualization, H.264 / yuv420p, no audio. |
| [scan-replay-poster.png](scan-replay-poster.png) | Still frame selecting the Code 128. |
| [scan-results.json](scan-results.json) | Exact reports, source fixture hashes and development-artifact provenance for all eighteen fixtures. |
| [qr-website.png](qr-website.png) | QR link encoding `https://qrcode-ai.com/`. |
| [qr-scanner.png](qr-scanner.png) | QR link encoding `https://qrcode-ai.com/en-US/qr-code-scanner`. |
| [barcode-scanner.png](barcode-scanner.png) | QR link encoding `https://qrcode-ai.com/en-US/barcode-scanner`; this link code is a QR, not a linear barcode. |

The QR outlines use the engine's measured quadrilaterals. The Code 128 is drawn
as the measured **segment**, with its two endpoints; it is not expanded into an
invented rectangular extent. The two identical QR copies remain two
occurrences of one decoded content. Colors and selection controls are
illustrative presentation, not object recognition or a new scanner capability.

## Provenance

- Source revision: `5767d3d262421037a1ae2c75824cac59c078a102`.
- Engine version: `0.11.0`, development build, not a tagged/public package release.
- Producer: [npm rehearsal 41695982902](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/41695982902), artifact `npm-wasm-tarball` / `13263444117`.
- Tarball SHA-256: `02b5ef3e31274f2032ff88701553334bfda8b8fd4136198f4e2a757b6b95737c`.
- WASM SHA-256: `a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68`.
- Every scan uses profile `full`, `budget_ms: 0`; recorded budget/saturation flags are false.
- The three generated link codes are decoded and recorded separately under `generated_qr_links`; their content matches the three exact canonical URLs. Page reachability is separate from QR decoding.
- Original fixture provenance at the recorded revision: [symbology fixtures](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/5767d3d262421037a1ae2c75824cac59c078a102/fixtures/symbology/CONTENT-FIXTURES.md), [consumer truth](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/5767d3d262421037a1ae2c75824cac59c078a102/fixtures/consumer-truth.json) and [corpus](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/5767d3d262421037a1ae2c75824cac59c078a102/corpus.toml).

The recorded reports remain available in this repository when the CI artifact
expires. They establish these fixture observations, not universal recall or
physical-device qualification. In particular, the centered Aztec example does
not remove the documented off-center Aztec limitation.

## Rebuild

Use Python with Pillow, Node and ffmpeg. Fresh link-code generation also uses
Python's `qrcode` package; recorded replay does not. No Rust compilation, registry install
or network request is performed by the generator. Pass a checkout containing
the 0.11 fixtures explicitly when rebuilding from another branch:

```sh
python3 scripts/readme-media.py \
  --source /path/to/scanner-0.11-checkout \
  --recorded
```

The recorded mode checks every fixture hash before rendering. To collect new
reports instead, supply an already extracted, inspected WASM package and its
producer information:

```sh
python3 scripts/readme-media.py \
  --source /path/to/scanner-0.11-checkout \
  --package /path/to/extracted/package \
  --artifact-url https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/RUN_ID \
  --tarball-sha256 TARBALL_SHA256
```

The generator verifies the WASM hash against the package's `build-info.json`,
checks the expected formats, requires both mixed-scene contents and the three
physical occurrences, and preserves the actual report geometry. Public output
contains no local filesystem paths. Fonts fall back to system Arial/DejaVu;
pixel-identical rendering across operating systems is not promised.
