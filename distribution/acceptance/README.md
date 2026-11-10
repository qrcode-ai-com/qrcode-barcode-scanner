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

The workflow [`destination-acceptance.yml`](../../.github/workflows/destination-acceptance.yml)
runs the driver's self-test and one real consumer: it downloads the public 0.11.0 archive
anonymously, checks it against the release's checksum list, unpacks it and judges the unpacked
`qrscan`.

## What is covered today

This first version covers one kind of surface: an installed `qrscan` command. Language packages,
browser pages, host integrations and agent clients keep their own consumers, listed in
[`RELEASING.md`](../../RELEASING.md), until a driver of this contract exists for each.
