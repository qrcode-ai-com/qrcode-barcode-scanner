# Apify Store listing · QR Code & Barcode Scanner

The values of the Store listing and the steps left to the owner. Nothing here is pushed or
published: the Apify account, its terms, the Actor's creation and its publication are the
owner's. The rules below were read in Apify's documentation on 21 November 2026 (publishing,
monetization, Actor README, automated testing, `actor.json`).

## What is ready

- The Actor's definition in `.actor/`: `actor.json`, the input, dataset and output schemas.
  `actor.json` names [STORE.md](STORE.md) as the README the Store shows and
  [CHANGELOG.md](CHANGELOG.md) as its changelog.
- [STORE.md](STORE.md) follows Apify's README guidance: H2 and H3 headings only (the Store uses
  the title as H1), more than 300 words, and the sections it lists: what the Actor does, how to use
  it, its cost, input and output examples, and a FAQ. Its only links are the scanner repository,
  QR Code AI and the online demo; its example addresses use example.com.
- [LICENSE-NOTES.md](LICENSE-NOTES.md): the Actor's files are MIT; the image runs the engine
  0.11.0 under AGPL-3.0-or-later, so the image as a whole is AGPL-3.0-or-later, and it carries the
  engine's third-party notices. The `Dockerfile` labels the image with that license.

The workflow `integration-apify.yml` proves it on every pull request that touches the Actor:

- `apify validate-schema` from Apify's CLI 1.13.0, and a validation of the four definition files
  against the schemas Apify publishes at `https://apify.com/schemas/v1/`.
- `docker build` of the `Dockerfile` on `apify/actor-python:3.12`, as Apify builds it, then three
  runs of the image as the platform starts an Actor: the mixed QR and Code 128 sample in the fast,
  frame and full profiles, each with the exact texts `https://qrc-ai.com/76xMa` and `STOCK-4827`,
  plus a missing image that becomes an item with its error. The destination acceptance driver
  judges the three reports, the image is removed and the receipt closed.
- A run with the input schema's prefill, fetched from its public address, as the Store's daily
  test runs a public Actor: it must succeed with a non-empty dataset in under five minutes.

The artifact `apify-image-acceptance` keeps the receipt and the run logs.

## Listing values

- Actor name (URL): `qrcode-barcode-scanner`
- Title: `QR Code & Barcode Scanner`
- Description (in `actor.json`, 168 characters):

  ```text
  Read every QR code and barcode in images given by URL or uploaded to a key-value store. One dataset item per image, with the decoded texts and the engine's full report.
  ```

- SEO title (Console, 40 to 50 characters):

  ```text
  QR Code & Barcode Scanner for Image Batches
  ```

- SEO description (Console, 145 to 155 characters):

  ```text
  Read QR codes and barcodes in 19 formats, such as Data Matrix, PDF417, EAN, UPC and Code 128, in batches of images, with one dataset item per image.
  ```

- Categories: choose them in Console's list; an image utility for developers and automation fits.
- Logo: the QR Code AI logo, `integrations/raycast/assets/icon.png` (512 × 512 PNG).
- Pricing: **Pay per usage**, the model Apify describes as "Users can run the Actor without any
  additional charges beyond the platform usage costs". No event is charged.
- Memory: 512 MB by default, from 256 MB to 4,096 MB (in `actor.json`).

## The owner's steps

1. **Account.** Sign in to Apify Console with the account that will publish, and set its public
   username: the Store page is `apify.com/<username>/qrcode-barcode-scanner`.
2. **Terms.** Accept the Store Publishing Terms and Conditions in Console. Apify asks for an
   identity verification only for full permissions or more than 10 Actors.
3. **Create the Actor from the Git source.** In Console, Development, My Actors, create an Actor
   from a Git repository with this source URL (a public repository, so its source can be shown):

   ```text
   https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#main:integrations/apify
   ```

   `#main` follows the branch: every build takes the latest `main`. To pin a version, use a tag or
   a branch made for the Store in place of `main`. The other route is `apify login`, then
   `apify push` from `integrations/apify` of a checkout of the chosen commit.
4. **Build and run once.** Build the Actor, then start it with the default input. The dataset
   must hold one item whose `texts` are `https://qrc-ai.com/76xMa` and `STOCK-4827`. Run it once
   more with an uploaded file under **Image files** and check that it is read.
5. **Publishing tab.** Fill **Display information** (title, description, logo, SEO title, SEO
   description, categories) with the values above, choose **Pay per usage** under
   **Monetization**, and complete **Sample output**, **Output schema** and
   **Actor permissions**. Then select **Publish on Store**.
6. **Check as a user.** From another Apify account, open the Store page, run the Actor with its
   default input, and compare the dataset with step 4. From then on, Apify runs the daily test with
   that input; more than half of its runs failing over three days marks the Actor "Under
   maintenance".

## Open points

- **Actor permissions.** The Actor reads an uploaded file from the key-value store the input form
  wrote, with the run's own access. Whether Limited permissions let it open that store was not
  tried: run step 4's upload under the level chosen in step 5. When the store cannot be opened, the
  Actor fetches the record's address over HTTP instead, which works only for a public record.
- **A run on the platform** has not been tried: the image was built and run with Docker only.
- **The base image tag.** `apify/actor-python:3.12` is resolved when Apify builds; the workflow
  prints the digest it used.
