# Dify Marketplace template: Uploaded Image QR and Barcode Reader

Destination `expansion-26`. This folder prepares the template. Nothing here is published.

The Marketplace accepts a template only when every plugin it uses is installed from the
Marketplace. So the template waits for the plugin of this folder's parent to be listed there
(destination `expansion-25`, [pull request 3862](https://github.com/langgenius/dify-plugins/pull/3862)
of `langgenius/dify-plugins`, open). [LISTING.md](LISTING.md) holds the listing fields and the
owner's steps.

## What the workflow holds

[`qr-and-barcode-reader.yml`](qr-and-barcode-reader.yml) is a workflow app with five nodes and no
model, so it runs without a model key:

1. **Start** takes one required image file, from an upload or a URL.
2. **Scan QR codes and barcodes** is this plugin's tool, profile `fast`, no time budget. Its
   error strategy is the fail branch, so a file the engine refuses takes its own path.
3. **Codes found?** checks that `count` is above 0.
4. **Codes** returns `texts`, `count`, the one-line `summary` and the engine's `report`.
5. **No code found** returns the summary and `complete`. **File not readable** returns the
   engine's error message, which carries its `QRS-` code.

## How it was checked

The plugin's tests (`pytest` in [integrations/dify](../README.md#develop)) check the file against
the tool it uses. The [Dify template job](../../../.github/workflows/integration-dify-template.yml)
then runs it in Dify itself, with [template_in_dify.py](../tests/template_in_dify.py):

1. It starts the `docker/` folder of the Dify 1.20.0 release (tag commit
   `7bef4e1b2dc21b2c694d3243425dd3fa6288f916`) with Docker Compose, as that folder's README says,
   with `FORCE_VERIFYING_SIGNATURE=false` so the plugin daemon accepts a package the Marketplace
   has not signed.
2. It packages this plugin with the `dify-plugin` command line 0.6.15, pinned by sha256, and
   installs the package as **Plugins**, **Install plugin**, **Local package file** does.
3. It imports this file unchanged through the console API. Dify 1.20.0 writes DSL 0.7.0 and
   imports this file's 0.3.1 with a version warning (`completed-with-warnings`), with no missing
   dependency. Two copies set the scan profile to `frame` and `full`.
4. It runs the draft workflow on the mixed fixture with each profile: the run ends in **Codes**
   with `texts` equal to `https://qrc-ai.com/76xMa` and `STOCK-4827`, `count` 2 and the engine's
   0.11.0 report. A blank image ends in **No code found** with `complete` true. A file that is not
   an image ends in **File not readable** with the engine's `[QRS-001]` message, and Dify reports
   that run as `partial-succeeded`.
5. It exports the app as YAML and as an `.ifpkg` app package, deletes the apps, uninstalls the
   plugin, and judges the three reports with the
   [acceptance contract](../../../distribution/acceptance/README.md).

The job's artifact `dify-template-in-dify-1.20.0` keeps the plugin package, both exports, the
receipt and a `SHA256SUMS` file. The exports name the local package as their dependency, so they
show what Dify writes and are not the file to submit.

## When the plugin is on the Marketplace

Once pull request 3862 is merged and the plugin is listed, the job can install it the way a
Marketplace user does instead of building it:

1. Replace the packaging step and the local install with
   `POST /console/api/workspaces/current/plugin/install/marketplace`, whose body
   `{"plugin_unique_identifiers": [...]}` names the identifier the Marketplace lists for 0.1.0.
2. Remove `FORCE_VERIFYING_SIGNATURE=false`: a Marketplace package is signed.
3. Expect the export's dependency to read `type: marketplace`, which is what the Creator Center
   needs.

The template file itself does not change.
