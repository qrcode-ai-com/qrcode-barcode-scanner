# Dify Marketplace template · submission kit

What the owner submits to the Dify Template Marketplace, and the steps up to the submit button.
Nothing here has been submitted. The rules are Dify's
[Publish Apps to Marketplace](https://docs.dify.ai/en/cloud/use-dify/publish/publish-to-marketplace)
page, read on 21 November 2026.

## Before anything: the plugin must be on the Marketplace

Dify requires every plugin a template uses to be **installed directly from Marketplace**. The
plugin `qrcode-ai-com/qrcode-barcode-scanner` 0.1.0 waits in
[pull request 3862](https://github.com/langgenius/dify-plugins/pull/3862) of
`langgenius/dify-plugins`, which is open. Do not submit the template before that pull request is
merged and the plugin can be installed from the Marketplace.

## The files

| File | What it is | sha256 |
|---|---|---|
| [qr-and-barcode-reader.yml](qr-and-barcode-reader.yml) | The workflow to import, exactly as committed | `f8f3c5ff610c60739a428244957b3d53dbf60faaccd14471b8598a6844314b2a` |

The Creator Center takes an `.ifpkg` app package of at most 10 MB, exported from Dify. The
[Dify template job](../../../.github/workflows/integration-dify-template.yml) imports this file
into Dify 1.20.0, runs it and exports it (see [How it was checked](TEMPLATE.md#how-it-was-checked)).
Its package is about 2 KB. Its dependency names the plugin package built in CI, not the
Marketplace plugin, so export the app again from a workspace where the plugin came from the
Marketplace (step 5).

## Listing fields

All in English, the language selected for the template.

- **Name:** `Uploaded Image QR and Barcode Reader`
- **Icon:** the app's 🔎 emoji on `#E0EAFF`, set in the workflow file.
- **Language:** English
- **Categories:** one to three from the Creator Center's list. The list shows only after signing
  in, so it is not copied here. Pick the ones closest to productivity tools and utilities, not
  every category.
- **Overview** (3 sentences):

  ```text
  Upload a photo or a screenshot and get back every QR code and barcode it holds, each with its format and decoded text. It helps support, operations and logistics teams read the codes in images people send them, and gives builders a decoding step to reuse in larger workflows. The open-source QR Code & Barcode Scanner plugin decodes the image inside your Dify plugin runtime, so no model key is needed.
  ```

- **Setup steps** (6):

  ```text
  1. In Dify, open Plugins, search the Marketplace for "QR Code & Barcode Scanner" and install it.
  2. Open this template and create the app in your workspace.
  3. Open the app and click Run.
  4. Upload an image that holds a QR code or a barcode as Image, then start the run.
  5. Read texts for the decoded values, or report for the engine's full report. An image without a code ends in No code found, and a file that is not an image ends in File not readable.
  6. Optional: open the Scan QR codes and barcodes node and set Profile to full to also score how well each QR code scans.
  ```

## Owner steps

1. Wait until pull request 3862 is merged and **QR Code & Barcode Scanner** appears in the Dify
   Marketplace.
2. Sign in to Dify with the account that will publish. In **Plugins**, install the plugin from the
   Marketplace.
3. In **Studio**, choose **Import DSL file** and select `qr-and-barcode-reader.yml`. Dify warns
   that the file's DSL version (0.3.1) is older than its own; confirm the import.
4. Run the app once with the mixed fixture (`fixtures/symbology/mixed-code128-qr.png`): the run
   must end in **Codes** with `https://qrc-ai.com/76xMa` and `STOCK-4827`. Dify asks for one run
   before submitting.
5. Either click **Publish**, **Publish Update**, then **Publish to Marketplace**, which opens the
   Creator Center with the app uploaded. Or export the app with **Export secret values** off and
   upload the `.ifpkg` in the [Creator Center](https://creators.dify.ai/).
6. In the Creator Center, choose the personal account or an organization (an organization lets
   the team see usage and feedback), fill in the fields above and submit for review.
7. The template stays **Pending** during review and can be withdrawn to **Draft** to edit it.

The workflow, its texts and these steps were written with AI assistance. Read them before
submitting; the submitter answers for the template.
