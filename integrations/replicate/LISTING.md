# Replicate model · qrcode-ai-com/qrcode-barcode-scanner

The fields, texts and steps for the Replicate model page. This file is the one copy of them.
Nothing here has been done: the model does not exist yet. Creating it, billing, `cog login` and
`cog push` are the owner's steps, from the owner's own account and shell. No Replicate token is
stored in the engine repository or in any of its workflows.

## Model fields

| Field | Value |
|---|---|
| Owner | `qrcode-ai-com`, a Replicate organization |
| Name | `qrcode-barcode-scanner` |
| Model address | `r8.im/qrcode-ai-com/qrcode-barcode-scanner`, page `https://replicate.com/qrcode-ai-com/qrcode-barcode-scanner` once created |
| Visibility | Public |
| Hardware | CPU (SKU `cpu`) |
| Description | the text below |
| GitHub URL | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/replicate` |
| License URL | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/replicate/LICENSE-NOTES.md` |
| Paper URL | empty |
| Cover image | `https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/brand/examples-mixed-light.png` |

### Description

```text
Read every QR code and barcode in an image: format, text, raw bytes and position, from the open-source QR Code & Barcode Scanner engine.
```

### README of the model page

Paste this text where the model page lets the owner edit its README. Replace `<commit>` with the
commit the version was pushed from.

```markdown
# QR Code & Barcode Scanner

Read every QR code and barcode in an image. The model returns the complete JSON report of the
open-source QR Code & Barcode Scanner engine, version 0.11.0: each code's format, decoded text,
raw bytes and measured position, with a quality score for QR codes in the fast and full profiles.

It reads QR Code, Micro QR, rMQR, Data Matrix, Aztec, PDF417, MaxiCode, EAN-13, EAN-8, UPC-A,
UPC-E, Code 128, Code 39, Code 93, Codabar, ITF, GS1 DataBar and Telepen, from PNG, JPEG, WebP
and GIF files of at most 8 MiB and 4,096 pixels per side.

## Inputs

- `image`: the file to read.
- `profile`: `fast` (default) suits uploads and gives a reduced quality score; `frame` only
  decodes and gives no score; `full` searches deepest and gives the full score. Artistic QR codes
  need `full`.
- `budget_ms`: a time limit from 0 to 60,000 ms. Empty keeps the profile's budget; 0 removes it.

An image without a code gives an empty `detections` list. A file that cannot be read fails the
prediction with the engine's `QRS-` error code.

## Your images are uploaded to Replicate

The scanner's other routes read images where they are, on your own machine. This model does not:
each image you send is uploaded to Replicate and scanned on Replicate's servers, and Replicate
keeps the prediction under its data retention rules. Send only images you may share with
Replicate. To scan on your own machine, use the Python package `qrcode-barcode-scanner` from PyPI
or the `qrscan` command line. The model never opens what a code points to.

## Source code and licence

This model is open source. You may get its complete corresponding source, as
AGPL-3.0-or-later section 13 provides for users of a network service:

- the engine 0.11.0: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/v0.11.0
  and its source distribution on https://pypi.org/project/qrcode-barcode-scanner/0.11.0/
- this model version: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/<commit>/integrations/replicate

The model's own source is MIT. The image embeds the engine wheel 0.11.0, published under
AGPL-3.0-or-later, so the model as a whole is distributed under AGPL-3.0-or-later. Details:
https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/replicate/LICENSE-NOTES.md

Home page: https://qrcode-ai.com/ · Issues:
https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues

Maintained by Thibaut Mélen & Nicolas Cella for QR Code AI, a product of SuperNovae Studio.
```

## Example prediction

After the first push, run one prediction on the model page's form with these inputs, then make it
the model's example.

```json
{
  "image": "https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/v0.11.0/fixtures/symbology/mixed-code128-qr.png",
  "profile": "full",
  "budget_ms": 0
}
```

The report must hold two detections: `symbology` `qr_code` with `content.text`
`https://qrc-ai.com/76xMa`, and `symbology` `code128` with `content.text` `STOCK-4827`. Its
`versions.scanner` must be `0.11.0`.

A prediction made on the website is kept until it is deleted, so the example stays on the page.
The example image is the scanner's own test fixture, which holds no personal data.

## Billing

Read on Replicate's [billing](https://replicate.com/docs/topics/billing) and pricing pages on
21 November 2026; check them again before the push.

- The `cpu` hardware costs $0.000100 per second.
- For a public model, each caller pays for the time the model is active on that caller's own
  predictions. Setup and idle time are free on public models, and a failed run is not charged.
- The owner pays for the owner's own predictions, the example included. Runs made as the
  organization go to the organization's billing.
- At that price, a prediction that runs for 2 seconds costs $0.0002. This is arithmetic on the
  price, not a measured time.

## Owner steps, one by one

1. **Account.** Sign in at `https://replicate.com`.
2. **Organization.** In the account menu, create the organization `qrcode-ai-com`. The model
   address depends on this exact name.
3. **Billing.** Switch to the organization, open its account page
   (`https://replicate.com/account/billing`), choose **Manage billing** and set up a card or
   prepaid credit.
4. **Create the model.** Open `https://replicate.com/create`. Owner: `qrcode-ai-com`. Name:
   `qrcode-barcode-scanner`. Visibility: **Public**. Hardware: **CPU**. Create it.
5. **Install Cog 0.23.1** in the owner's own shell, with Docker running. On an Apple Silicon Mac:

   ```sh
   curl --fail --location --output cog https://github.com/replicate/cog/releases/download/v0.23.1/cog_Darwin_arm64
   echo "fb9ec95bbf7ac47960f9323ef2f5f6aa3f13f3dea4653093bec4f31103752d3f  cog" | shasum -a 256 --check
   chmod +x cog && sudo mv cog /usr/local/bin/cog
   ```

   On Linux x86_64 the file is `cog_Linux_x86_64`, SHA-256
   `c6bf4f89278609b4fcde28a59808bd2b51b559022a9178b08492c910d9dc115d`, the one the engine's
   workflow checks.
6. **Log in.** Run `cog login`. It opens `https://replicate.com/auth/token`; copy the token there
   and paste it into the prompt. The token stays in Docker's credential store on the owner's
   machine. Never write it into the checkout.
7. **Push.** From a clean checkout of the merged `main`:

   ```sh
   cd integrations/replicate
   git rev-parse HEAD
   cog push r8.im/qrcode-ai-com/qrcode-barcode-scanner --json > "$HOME/replicate-push.json"
   ```

   Keep the commit and the JSON result, outside the checkout. The push builds the image on the
   owner's machine for linux/amd64; the engine's workflow checks the same recipe, not these bytes.
8. **Fill the page.** In the model's settings, enter the description, the GitHub URL, the license
   URL and the cover image of the table above. Paste the README text with the commit of step 7.
9. **Example.** Run the example prediction above on the page's form and make it the example.
10. **Read back.** Check the version as below, then open the page signed out: it must be public,
    with the README, the example and the source offer.

## Read back by version id

With the owner's token in `REPLICATE_API_TOKEN` in the owner's shell:

```sh
model=https://api.replicate.com/v1/models/qrcode-ai-com/qrcode-barcode-scanner
curl --fail --silent -H "Authorization: Bearer $REPLICATE_API_TOKEN" "$model" > model.json
version=$(python3 -c 'import json; print(json.load(open("model.json"))["latest_version"]["id"])')
curl --fail --silent -H "Authorization: Bearer $REPLICATE_API_TOKEN" "$model/versions/$version" > version.json
python3 - <<'EOF'
import json
model, version = json.load(open("model.json")), json.load(open("version.json"))
assert model["visibility"] == "public", model["visibility"]
fields = version["openapi_schema"]["components"]["schemas"]["Input"]["properties"]
assert set(fields) == {"image", "profile", "budget_ms"}, sorted(fields)
print("version", version["id"], "cog", version["cog_version"], "created", version["created_at"])
EOF
```

The version id must be the one `cog push` printed in `replicate-push.json`, and `cog_version`
must be `0.23.1`. To record the live model in the engine's acceptance format, run the example
three times through the API with `"version": "<version id>"` and the profiles `fast`, `frame` and
`full`, save each prediction's `output` as `fast.json`, `frame.json` and `full.json`, then:

```sh
python3 scripts/destination-acceptance.py reports --kind server \
  --produced-by "Replicate prediction, version <version id>" \
  --fast fast.json --frame frame.json --full full.json \
  --destination "Replicate model qrcode-ai-com/qrcode-barcode-scanner" --version 0.11.0 \
  --url https://replicate.com/qrcode-ai-com/qrcode-barcode-scanner \
  --identifier "r8.im/qrcode-ai-com/qrcode-barcode-scanner:<version id>" \
  --receipt acceptance-replicate-live.json
python3 scripts/destination-acceptance.py removed --not-applicable --receipt acceptance-replicate-live.json
python3 scripts/destination-acceptance.py check acceptance-replicate-live.json
```

## Notes for the owner

- The data-handling paragraph of the README is required: elsewhere the scanner keeps images on
  the user's machine, and on Replicate it does not.
- The source offer must name the commit of each pushed version.
- The licence of the image follows working default decision 12 (the image embeds the AGPL
  0.11.0 wheel), which waits for the owner's confirmation.
- Privacy, terms and support pages are planned at `https://qrcode-ai-com.github.io/privacy/`,
  `https://qrcode-ai-com.github.io/terms/` and `https://qrcode-ai-com.github.io/support/`, live
  after the owner's review. Link them from the README of the model page once they are live.
