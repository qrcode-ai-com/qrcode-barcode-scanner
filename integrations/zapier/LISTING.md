# Zapier listing

State on 21 November 2026: built and tested from this folder, **not pushed to Zapier**. No Zapier
account, integration or version exists for it yet. Every step below is the owner's: an account,
a sign-in, a push to Zapier and a form sent to Zapier are not done by automation.

## Verdict

- **Private, invite-only integration: possible now.** Zapier lets anyone who accepts its terms
  push a private integration and invite users to it. Nothing in this folder blocks that.
- **Public listing in the app directory: an owner decision, blocked as the integration stands.**
  The review rules below were read on 21 November 2026 from
  <https://docs.zapier.com/integrations/publish/integration-publishing-requirements>. A code-only
  action with no authentication and no API of its own meets most of them, but not 7.1, and it
  takes the QR Code AI brand's one directory slot (2.1, 2.2).

| Rule | What it asks | This integration |
| --- | --- | --- |
| 2.1, 2.2 | One public integration per app brand; no separate integrations that share an API. | Publishing it as **QR Code AI** takes the brand's slot. A later QR Code AI SaaS integration (account, generator, links) would have to be a new version of this same integration. An integration's authentication applies to all its steps, so Scan Image would then ask for a QR Code AI connection too. **Owner decision.** |
| 3.1 | You own or may use every API the integration calls. | It calls no API: it downloads the image the user maps, then scans it inside the step. Met. |
| 3.2 | You own or may use every mark. | QR Code AI is the owner's brand. No Zapier mark in the name. Met. |
| 4.2 | HTTPS for every endpoint. | No endpoint of its own. An image URL the user maps may be `http`; the action accepts it, as a file field does. Met, to confirm with the reviewer. |
| 5.1 | The app is publicly launched, not beta. | qrcode-ai.com is live. The scanner pages it would link to (`/en-US/qr-code-scanner/integrations/zapier` and the barcode one) answered 404 on 21 November 2026. **Wait for those pages.** |
| 5.2 | The app's API is documented, with links in the submission. | No API. The documentation is this folder's README and the engine repository. Reviewer's call. |
| 5.3 | Every action tested in a Zap that is on, with a successful run kept in the history. | The owner's test Zaps, below. |
| 5.7, 5.8 | English, platform naming conventions. | Action **Scan Image**, noun Image, description in the present tense. `zapier-platform validate --fail-for-publishing` reports 28 checks passed, no publishing task and no warning. Met. |
| 6.1 | Name exactly as the brand; no "app" or "integration". | **QR Code AI**. No app answered at `zapier.com/apps/qr-code-ai` on 21 November 2026 (HTTP 404). Met. |
| 6.2 | Description starts "QR Code AI is a…", no link, no mention of Zapier. | Value below. Met. |
| 6.3 | Homepage is the marketing site. | `https://qrcode-ai.com/`. Met. |
| 7.1 | A non-expiring test account **in the app** for integration-testing@zapier.com. | The integration has no sign-in, so there is no account of it to give. A QR Code AI account could be created for that address, but the integration never uses it. **Blocked unless the reviewer accepts it.** |
| 7.2 | An admin team member with an email at the app's domain. | The owner, with a `@qrcode-ai.com` address. |

## Field values

| Field | Value |
| --- | --- |
| Name (title) | `QR Code AI` |
| Description (140 characters at most) | `QR Code AI is a QR code and barcode platform: create codes, and read the QR codes and barcodes in your image files.` |
| Homepage URL | `https://qrcode-ai.com/` |
| Logo | The QR Code AI logo, 256 × 256 PNG, from the owner's brand files. |
| Category | `images` |
| Audience | `private` first; `global` only after the decision above |
| Role | `employee` (the integration's owner works for QR Code AI) |
| Action | Scan Image (`scan_image`), noun Image |
| Privacy policy | `https://qrcode-ai-com.github.io/privacy/` (live after the owner's review) |
| Terms of service | `https://qrcode-ai-com.github.io/terms/` (live after the owner's review) |
| Support | `https://qrcode-ai-com.github.io/support/` (live after the owner's review) |
| Documentation | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/zapier` |

The three `qrcode-ai-com.github.io` addresses answered 404 on 21 November 2026. Give them only
where a form asks for them, and only once they are live.

## Owner's steps

### 1. Developer account

1. Open <https://developer.zapier.com/> and sign in, or sign up, with your `@qrcode-ai.com` email
   address. Rule 7.2 needs that domain, and Zapier matches the owner to the app by it.
2. Accept the Zapier Platform Agreement when the site asks.

### 2. Register and push

From a checkout of this repository, with Node.js 22 or later:

```sh
cd integrations/zapier
npm ci
export DISABLE_ZAPIER_ANALYTICS=1
npx zapier-platform login
npx zapier-platform register "QR Code AI" \
  --desc "QR Code AI is a QR code and barcode platform: create codes, and read the QR codes and barcodes in your image files." \
  --url https://qrcode-ai.com/ --audience private --role employee --category images --no-subscribe
npx zapier-platform push
```

- `login` asks for your Zapier email and password, or a deploy key, and writes `~/.zapierrc`. That
  file is a credential: never commit or share it.
- `register` writes the integration's `id` and `key` next to `includeInBuild` in `.zapierapprc`.
  They are not secret; commit that change in a pull request so the next push targets the same
  integration.
- `push` builds `build/build.zip` as CI does, runs Zapier's checks, and uploads version 0.1.0.

Then, in the developer site, open the integration, **Settings**: upload the logo and check the
name, description, homepage and category against the table above.

### 3. Test Zaps

1. In <https://zapier.com/> with the same account, select **Create**, then **Zaps**.
2. Trigger: any step that outputs an image file, for instance a new email attachment or a new file
   in a cloud storage folder. Test it with an image that holds a QR code and a barcode, such as
   `fixtures/symbology/mixed-code128-qr.png` of this repository.
3. Action: search **QR Code AI**, choose **Scan Image**, map **Image** to the trigger's file, leave
   **Profile** on **Frame**, and select **Test step**. Expect **Number of codes** 2 and the texts
   `https://qrc-ai.com/76xMa` and `STOCK-4827`.
4. Publish the Zap (turn it on) and let one real run succeed. Keep the Zap and its run: rule 5.3,
   and the reviewer may ask for them.
5. Optional: a second Zap with **Profile** on **Full**, and a run on an image without a code, which
   must succeed with **Number of codes** 0.

### 4. Share it privately

From the terminal, `npx zapier-platform users:add <email> 0.1.0` invites one person by email to
version 0.1.0, and `npx zapier-platform users:links` prints the links that invite anyone who opens
them. The integration's sharing page in the developer site does the same.

### 5. Integration-testing account (public listing only)

Rule 7.1 asks for a non-expiring account in the app for `integration-testing@zapier.com`, with a
password Zapier can change. This integration has no sign-in. If you go public, write in the
submission that the action needs no account, and offer a free QR Code AI account at that address
if the reviewer still wants one.

### 6. Publishing form (public listing only)

Only after the decision on rules 2.1, 2.2 and 7.1, and once the scanner pages of qrcode-ai.com and
the three `qrcode-ai-com.github.io` pages are live:

1. `npx zapier-platform promote 0.1.0`, which makes 0.1.0 the version new Zaps use.
2. In the developer site, open the integration's publishing page and start the request.
3. Fill the form with the field values above, the test Zap links from step 3, the documentation
   link, and the note on the test account from step 5.
4. Answer the reviewer from the same account. Zapier reviews the request; it can keep the
   integration private, as its rules allow.

## What CI proves and what it does not

`.github/workflows/integration-zapier.yml` validates the definition offline and with Zapier's
integration checks, runs the app tester suite, builds `build/build.zip`, and runs that bundle
outside the checkout in Node.js 22 and in the AWS Lambda Node.js 22 image (256 MB, read-only,
non-root). The destination acceptance driver judges its reports of the mixed fixture in the fast,
frame and full profiles. It does not prove a run on Zapier's own Lambda functions, Zapier's file
hydration of a real trigger's file, or the editor's rendering of the fields: the owner's test Zaps
are that proof.
