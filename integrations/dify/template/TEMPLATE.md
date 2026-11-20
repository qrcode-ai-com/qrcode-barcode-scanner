# Dify Marketplace template: Uploaded Image QR and Barcode Reader

Destination `expansion-26`. This folder prepares the template. Nothing here is published, and the
draft workflow has not been imported into a Dify instance yet.

The Marketplace accepts a template only when every plugin it uses is installed from the
Marketplace. So the template waits for the plugin of this folder's parent to be listed there
(destination `expansion-25`).

## What the draft holds

[`qr-and-barcode-reader.yml`](qr-and-barcode-reader.yml) is a workflow app with five nodes and no
model, so it runs without a model key:

1. **Start** takes one required image file, from an upload or a URL.
2. **Scan QR codes and barcodes** is this plugin's tool, profile `fast`, no time budget. Its
   error strategy is the fail branch, so a file the engine refuses takes its own path.
3. **Codes found?** checks that `count` is above 0.
4. **Codes** returns `texts`, `count`, the one-line `summary` and the engine's `report`.
5. **No code found** returns the summary and `complete`. **File not readable** returns the
   engine's error message, which carries its `QRS-` code.

## Steps that remain, all in a signed-in Dify session

1. Install the plugin from the Marketplace in a clean workspace.
2. Studio, Import DSL file, choose `qr-and-barcode-reader.yml`. Open the tool node and check that
   it shows the installed plugin. Rebuild the node from the tool list if Dify asks for it.
3. Run the app with the mixed sample (`fixtures/symbology/mixed-code128-qr.png`) in the three
   profiles in turn. Expect `https://qrc-ai.com/76xMa` and `STOCK-4827`. Run it once with an image
   that holds no code, and once with a file that is not an image.
4. Publish, Publish to Marketplace, or export the app with secret values off and upload it in
   Creator Center. Fill the listing with the fields below.

## Listing

- **Name:** Uploaded Image QR and Barcode Reader
- **Categories:** Productivity, Utilities
- **Overview:** Upload a photo or a screenshot and get back every QR code and barcode it holds,
  with each format and decoded text. The open-source QR Code & Barcode Scanner engine runs inside
  your Dify plugin runtime, so the image goes to no other service. Separate branches tell found
  codes, an image with no code and an unreadable file apart. No model key is needed.
- **Setup:**
  1. Install the QR Code & Barcode Scanner plugin from the Marketplace.
  2. Use this template to create the app.
  3. Run it and upload an image of a QR code or a barcode.
  4. Read `texts` for the decoded values, or `report` for the engine's full report.
  5. To judge how well a QR code scans, set the tool's profile to `full`.
