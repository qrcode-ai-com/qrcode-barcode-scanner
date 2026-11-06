# QR Code & Barcode Scanner · OCI 0.11

The 0.11 recipe packages the **unchanged public Linux CLI** from `v0.11.0`.
It runs locally and supports QR codes, linear barcodes and matrix codes. It
includes the mixed QR + Code 128 regression, physical-occurrence geometry and
pipeline 5 reports. There is no scanner HTTP service and no runtime download.

## Run the public image

The [GHCR image 0.11.0](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/pkgs/container/qrcode-barcode-scanner)
supports Linux AMD64 and ARM64. The digest below names the verified multi-platform
index. Put an input image named `label.png` in the current directory before
running the command.

```sh
image=ghcr.io/qrcode-ai-com/qrcode-barcode-scanner@sha256:fd0433f29b0dabd469ce6a8fdcfc7bf6554960301b5bc57b5fca97928fd7cb96
docker pull "$image"
docker run --rm --network none --read-only --cap-drop ALL \
  --mount type=bind,src="$PWD",dst=/input,readonly "$image" /input/label.png --pretty
```

[Anonymous public pulls](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/42208687356)
and exact scans passed on both native architectures.

## Build and verify

Run input preparation without a GitHub token. `inputs.json` pins the published
SHA256SUMS, both Linux archives, all corresponding-source archives and the
Debian base index. Every source and binary hash is checked before packaging.
Only this generated context enters Docker; no source checkout or host secrets
are copied. The binary's original Rust 1.99.1 build metadata and licenses ship
with the image. No Cargo build or installer is needed.

```bash
env -u GH_TOKEN -u GITHUB_TOKEN python3 distribution/docker/v0.11/prepare.py \
  --assets /tmp/qrscan-assets --out /tmp/qrscan-context \
  --receipt /tmp/qrscan-preparation.json
```

On a **native Linux** AMD64 or ARM64 producer, set `ARCHITECTURE` accordingly
and `PACKAGING_REVISION` to the reviewed packaging commit (separate from the
engine commit). For example, the owning `distribution-checks` workflow runs:

```bash
docker build --no-cache --network none \
  -f distribution/docker/v0.11/Dockerfile \
  --platform "linux/$ARCHITECTURE" --build-arg "PACKAGING_REVISION=$PACKAGING_REVISION" \
  -t qrscan:qualified /tmp/qrscan-context
python3 distribution/docker/v0.11/verify.py qrscan:qualified fixtures/clean/gen_v5_q.png \
  --expected-platform "linux/$ARCHITECTURE" --packaging-revision "$PACKAGING_REVISION" \
  --native --receipt /tmp/qrscan-consumer.json
python3 distribution/docker/v0.11/record.py qrscan:qualified \
  --consumer /tmp/qrscan-consumer.json --out /tmp/qrscan-export
```

The verifier executes the shared exact-content truth set, mixed Code 128 + QR
cases in fast/frame/full, versions, scores, empty/error exits and mounted paths.
Every scan uses a read-only filesystem and input mount, non-root user 65532,
no capabilities and `--network none`. The native guard refuses emulation as
native producer evidence. Local emulated runs remain useful diagnostic evidence.
The export records the tested image's config, raw layers, binary and source
hashes without rebuilding it.

## Release boundary

Run the native two-architecture producer first, record official artifact IDs and
ZIP digests, then freeze those exact exports into a reviewed 0.11 release BOM.
The old 0.10 publisher refuses this new family and must not be retargeted with
invented producer IDs or replaced hashes. The independent `oci-v0.11.0` tag,
GHCR aliases and package visibility follow the reviewed container environment.
No `latest` tag or Docker Hub upload is part of this delivery. Publication is
complete only after anonymous pulls by immutable index digest pass on both
native architectures. Do not alter `v0.11.0` or its public CLI assets.

[QR Code AI](https://qrcode-ai.com/) ·
[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) ·
[Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) ·
[Source and release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0)
