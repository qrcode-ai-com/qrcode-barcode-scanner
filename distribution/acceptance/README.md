# Destination acceptance

One contract for every place the scanner can be installed from: a package manager, a registry, a
store, an archive. It says what an installed scanner must return before that destination is
called delivered, and how the result is recorded.

Publishing a package and installing it are different facts. This contract judges the second one,
on a clean host, through the destination's own install route.

## The check

| Part | Requirement |
| --- | --- |
| Input | `fixtures/symbology/mixed-code128-qr.png`, SHA-256 `c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8`. It holds one QR code and one Code 128. It is case `qr-and-code128` of `fixtures/consumer-truth.json`. |
| Expected contents | The QR code `https://qrc-ai.com/76xMa` and the Code 128 `STOCK-4827`. Each exactly once, with its exact bytes, and no other detection. |
| Profiles | `fast`, `frame` and `full`, each with no budget (`--budget-ms 0`). |
| Each report | Exit 0, `trace.budget_exhausted` false, `trace.engine_panics` 0, and the same engine version in the three reports, equal to the version the artifact states. |
| The `full` report | It also meets the shared truth case: measured geometry inside the stated areas, the QR code as primary detection, a score present. `scripts/consumer_truth.py` judges it. |
| Removal | After the scans, the destination's own uninstall is run and the command is gone. A route with no uninstall, such as an unpacked archive, records "not applicable". |

The fixture is copied outside the checkout before it is scanned, as a user's own file would be.

## The receipt

Every check writes one JSON receipt, schema `qrscan-destination-acceptance/1`, described by
[`receipt.schema.json`](receipt.schema.json). It records:

- the destination name, the install command and the public URL the install came from;
- the artifact's identifier and version, and the engine versions the reports name;
- the commit of this repository that supplied the driver and the fixture, with both hashes;
- for each profile: the exit code, every detection as symbology and text, and each problem found;
- the removal step, and the hosted run when there is one;
- the verdict: `PASS`, `INCOMPLETE` while the removal step is not recorded, or `FAIL`.

A receipt states what one host saw on one day. It does not cover another version, another host
or another destination.

## Run it for an installed `qrscan`

The driver installs nothing and removes nothing. Install the scanner the way a user of the
destination would, then:

```sh
python3 scripts/destination-acceptance.py cli \
  --qrscan qrscan \
  --destination "Homebrew tap" \
  --identifier qrcode-ai-com/tap/qrscan \
  --version 0.11.0 \
  --url https://github.com/qrcode-ai-com/homebrew-tap \
  --install "brew install qrcode-ai-com/tap/qrscan" \
  --receipt receipt.json
```

Uninstall with the destination's own command, then close the receipt:

```sh
python3 scripts/destination-acceptance.py removed \
  --qrscan qrscan \
  --uninstall "brew uninstall qrscan" \
  --receipt receipt.json
```

`--qrscan` takes a name looked up on `PATH` or a path to the executable. Validate any receipt
with `python3 scripts/destination-acceptance.py check receipt.json`. The driver needs Python 3
and nothing else.

## Run it for a container image

An image is judged as a command, through a wrapper that runs `qrscan` inside it with the options
the image's own page gives. Pull the image by digest, then:

```sh
export QRSCAN_IMAGE=ghcr.io/qrcode-ai-com/qrcode-barcode-scanner@sha256:...
python3 scripts/destination-acceptance.py cli --kind container \
  --qrscan distribution/acceptance/drivers/qrscan-in-container.sh \
  --destination "GitHub Container Registry" --identifier "$QRSCAN_IMAGE" --version 0.11.0 \
  --url https://github.com/qrcode-ai-com/qrcode-barcode-scanner/pkgs/container/qrcode-barcode-scanner \
  --install "docker pull $QRSCAN_IMAGE" --receipt receipt.json

docker rmi "$QRSCAN_IMAGE"
python3 scripts/destination-acceptance.py removed \
  --gone "docker image inspect $QRSCAN_IMAGE" --uninstall "docker rmi $QRSCAN_IMAGE" \
  --receipt receipt.json
```

The wrapper mounts the fixture's directory read-only at the same path and runs without network.

## Run it for a language package

A package is not a command, so it scans through a small program of its own language. The driver
then judges the three reports that program wrote, by the same rules.

```sh
# 1. Install the package the way a user would, in a new project.
npm install --save-exact @qrcode-ai-com/qrcode-barcode-scanner@0.11.0

# 2. Copy the checked fixture outside the checkout. The command prints the copy's path.
image=$(python3 /path/to/scripts/destination-acceptance.py stage /tmp/acceptance-input)

# 3. Scan with the three profiles, from the project that installed the package.
node /path/to/distribution/acceptance/drivers/node-package.mjs "$image" /tmp/acceptance-reports

# 4. Judge the three reports and write the receipt.
python3 /path/to/scripts/destination-acceptance.py reports --kind package \
  --produced-by "node node-package.mjs" \
  --fast /tmp/acceptance-reports/fast.json \
  --frame /tmp/acceptance-reports/frame.json \
  --full /tmp/acceptance-reports/full.json \
  --destination npm --identifier @qrcode-ai-com/qrcode-barcode-scanner --version 0.11.0 \
  --url https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner/v/0.11.0 \
  --install "npm install --save-exact @qrcode-ai-com/qrcode-barcode-scanner@0.11.0" \
  --receipt receipt.json

# 5. Uninstall, then close the receipt with a command that must now fail.
npm uninstall @qrcode-ai-com/qrcode-barcode-scanner
python3 /path/to/scripts/destination-acceptance.py removed \
  --gone "node -e \"require.resolve('@qrcode-ai-com/qrcode-barcode-scanner')\"" \
  --uninstall "npm uninstall @qrcode-ai-com/qrcode-barcode-scanner" \
  --receipt receipt.json
```

The programs are in [`drivers/`](drivers/): `node-package.mjs` for the Node.js package and
`python-package.py` for the Python package. Each one only scans and writes
`fast.json`, `frame.json` and `full.json`; it judges nothing. A report read from a file has no
exit code, so the receipt records `null` for it.

The workflow [`destination-acceptance.yml`](../../.github/workflows/destination-acceptance.yml)
runs the driver's self-test and three real consumers of the public 0.11.0 artifacts:

- the CLI archive, on Linux x64, Linux arm64, macOS arm64 and Windows x64: downloaded
  anonymously, checked against the release's checksum list, unpacked and judged;
- the npm package, under Node.js 22 and 24, installed in a new project;
- the PyPI package, under Python 3.11 and 3.14, installed in a new environment;
- the container image, pulled by digest without a credential, on Linux amd64 and arm64.

## What is covered today

Three kinds of surface: an installed `qrscan` command, a container image, and a language package,
with programs for Node.js and Python. Other bindings, browser pages, host integrations and agent
clients keep their own consumers, listed in [`RELEASING.md`](../../RELEASING.md), until a program
of this contract exists for each.
