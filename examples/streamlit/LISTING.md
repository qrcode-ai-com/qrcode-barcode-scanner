# Streamlit Community Cloud · listing kit (map-41)

What the owner needs to put the Streamlit app of this folder online on Streamlit Community Cloud,
and to check it afterwards. Nothing here is deployed: creating the account, accepting the terms,
connecting GitHub and clicking **Deploy** are the owner's steps.

The app is the one engine, the open-source QR Code & Barcode Scanner, running from the published
Python package `qrcode-barcode-scanner` 0.11.0. It is the same code that the workflow
`integration-python-hosts` tests on every change.

## Decisions to settle first

1. **Deploy source.** The recommended route of the 10 November plan was a small public demo
   repository under a GitHub account other than `qrcode-ai-com`, filled from an engine tag. This
   folder is ready for the other route: deploying from `qrcode-ai-com/qrcode-barcode-scanner-rust`
   as it is, branch `main`. That route needs the Streamlit OAuth app granted on the `qrcode-ai-com`
   organization by its owner, and admin rights on the repository for the deploying account.
   Streamlit's status page says it needs access to the source and the ability to manage the public
   keys of the repositories. On `qrcode-ai-com`, the account that grants it is also the bypass
   actor of the release tag rulesets. Read the scopes on GitHub's consent screen before you
   click; a scope that can write to public repositories or manage repository keys or hooks is a
   reason to choose the demo repository route instead. Never grant private repository access.
2. **App scope.** The plan note recommended a sample-only app, with no upload. Streamlit's
   [terms of use](https://streamlit.io/terms-of-use) (last updated November 2025) allow an app
   that processes personal data only for personal and non-commercial purposes, never in
   connection with a business, and forbid financial, health, biometric and other sensitive
   personal information in any Community Cloud app. QR codes and barcodes often carry such data:
   contact cards, tickets, boarding passes, payment and health codes. This app keeps its upload,
   as built: decide whether to keep it, or ask for a sample-only variant before the deploy.
3. **Subdomain.** `qrcode-barcode-scanner` if it is free on the day, otherwise the address
   Community Cloud generates from the repository.
4. **Disclosures.** The page says, under its introduction, that on Community Cloud the scan runs
   on a Streamlit server in the United States and that Streamlit records usage statistics
   (Community Cloud forces `browser.gatherUsageStats = true`). Accept that wording or change it.

## Field values

| Field | Value |
| --- | --- |
| Repository | `qrcode-ai-com/qrcode-barcode-scanner-rust` |
| Branch | `main` |
| Main file path | `examples/streamlit/streamlit_app.py` |
| App URL | `qrcode-barcode-scanner` (planned, availability not checked) |
| Python version (Advanced settings) | `3.12` |
| Secrets | none |
| Sharing | public, as the repository is public |

Community Cloud installs [`requirements.txt`](requirements.txt), which sits beside the main file:
`streamlit==1.67.0`, `pillow==13.0.0` and `qrcode-barcode-scanner==0.11.0`. It reads the
configuration in [`.streamlit/config.toml`](.streamlit/config.toml) beside the main file. It
reads no Python version file: the version is the one chosen in the form, and it cannot change
later without deleting the app.

### Title

```text
QR Code & Barcode Scanner
```

### Description

For the app's description in the workspace, or a post that shares it.

```text
Read every QR code and barcode in an image with the open-source QR Code & Barcode Scanner engine. Take the sample or upload a PNG, JPEG, WebP or GIF: each code is listed with its format and exact text, outlined where the engine measured it, and the full JSON report can be downloaded. On Streamlit Community Cloud the scan runs on a Streamlit server in the United States; run the app on your own machine to keep your images there.
```

### Links

The page carries the three QR Code AI links under its introduction, and links the engine
repository in it:

- Product homepage: `https://qrcode-ai.com/`
- QR scanner usage page: `https://qrcode-ai.com/en-US/qr-code-scanner`
- Barcode scanner usage page: `https://qrcode-ai.com/en-US/barcode-scanner`

Where a form or a post has room for more:

- Source: `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/examples/streamlit`
- Support: `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues`

The organization pages `https://qrcode-ai-com.github.io/privacy/`,
`https://qrcode-ai-com.github.io/terms/` and `https://qrcode-ai-com.github.io/support/` are
planned; they are live after the owner's review, not before.

### Privacy answers

- What the app receives: the image a visitor uploads, or nothing when the sample is used.
- Where it is processed: in the app's Python process, on a Streamlit server in the United States.
- What the app stores: nothing. The image is read in memory for the session and never written to
  disk; the served smoke test checks that a scan leaves no file in the repository.
- What the app sends elsewhere: nothing. Decoded links are shown as text and never opened.
- What the host records: Streamlit's own logs and usage statistics, under Streamlit's terms and
  privacy notice.

### Media

- Screenshot: [`media/app-sample-scan.png`](media/app-sample-scan.png), 800 × 1420, the app served
  locally from this folder after it scanned its sample image.

## Click by click

1. Go to <https://share.streamlit.io/>, click **Continue to sign-in** and sign in with an emailed
   code, Google or GitHub. Fill in the account form and click **Continue**. The account accepts
   Streamlit's terms of use and, for an app's content, their Community Cloud Content Addendum;
   Snowflake is the counterparty and users must be 18 or older. Read them first.
2. Click **Workspaces**, then **Connect GitHub account**. On GitHub's screen, read the scopes and
   the "Organization access" section, then click **Authorize streamlit**. Click **Grant** for
   `qrcode-ai-com` only if decision 1 chose this repository.
3. Click **Create app**; to "Do you already have an app?", answer **Yup, I have an app**. Fill
   in the repository, the branch, the main file path and the App URL from the table above.
4. Click **Advanced settings**, select Python 3.12, leave **Secrets** empty, click **Save**, then
   **Deploy**.
5. Wait until the app is on screen.

## Read back after the deploy

In a browser that is signed out of Streamlit:

1. Open the app's address. If it shows "This app has gone to sleep due to inactivity", click
   **Yes, get this app back up!** and wait.
2. The page shows version 0.11.0 in its introduction and the Community Cloud note under it.
3. With the sample image, choose each profile, `fast`, `frame` and `full`, with a budget of `0`:
   the table shows `qr_code` `https://qrc-ai.com/76xMa` and `code128` `STOCK-4827` each time, and
   no warning says the result is not final.
4. Check the four links of the introduction, with their `href`, `target` and `rel`:
   `QR Code & Barcode Scanner` to `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust`,
   `QR Code AI` to `https://qrcode-ai.com/`, `QR code scanner` to
   `https://qrcode-ai.com/en-US/qr-code-scanner` and `barcode scanner` to
   `https://qrcode-ai.com/en-US/barcode-scanner`. Served locally, Streamlit 1.67 renders each with
   `target="_blank"` and `rel="noopener noreferrer"`.
5. Record the app address, the repository, branch and commit it runs, the engine version and
   the Python version.

Then add the badge of the README under its title, with the real address. When the app is no
longer wanted, delete it from <https://share.streamlit.io/>: the overflow menu (**⋮**) beside the
app, **Delete**, the confirmation text, **Delete**. Then revoke the Streamlit OAuth app on GitHub
if no other app needs it.

## Upkeep per release

Raise the pin in `requirements.txt` with the next engine release; Community Cloud updates the app
when `main` changes. An app with no traffic for 12 hours goes to sleep until a visitor wakes it.
Community Cloud supports only the Python versions that still receive security updates: move the
app to a newer one before 3.12 reaches its end of life, by deleting it and deploying it again.

## Sources

Read on 21 November 2026:

- <https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy>
- <https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/file-organization>
- <https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/app-dependencies>
- <https://docs.streamlit.io/deploy/streamlit-community-cloud/status>
- <https://docs.streamlit.io/deploy/streamlit-community-cloud/get-started/create-your-account>
- <https://docs.streamlit.io/deploy/streamlit-community-cloud/get-started/connect-your-github-account>
- <https://docs.streamlit.io/deploy/streamlit-community-cloud/share-your-app>
- <https://docs.streamlit.io/deploy/streamlit-community-cloud/manage-your-app>
- <https://docs.streamlit.io/deploy/streamlit-community-cloud/manage-your-app/delete-your-app>
- <https://streamlit.io/terms-of-use>
- <https://docs.streamlit.io/develop/concepts/configuration/options>
