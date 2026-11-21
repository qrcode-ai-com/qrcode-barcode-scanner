# Make listing

State on 21 November 2026: source and tests in this folder, **not deployed to Make**. No Make
account, app or origin exists for it yet, and `makecomapp.json` holds no origin. **Blocked on a
hosted endpoint, owner decision 11**: the app calls a scan service, the HTTP service of this
repository is not released yet, and no scan service is hosted for Make users. Nothing here hosts
one. Every step below is the owner's: an account, an API key, a deployment to Make, a publication
and a review request are not done by automation.

## Verdict

- **Private app in the owner's own organization: possible once a scan service runs.** Make lets
  any account create a custom app and use it in its own scenarios. The owner deploys this folder,
  creates a connection with the base URL of a scan service they run, and the module works. No
  review and no publication are needed for that.
- **Shared by invite link: an owner decision, irreversible.** Make's **Publish** button gives an
  invite link that any Make user can install from. Make's documentation says a published app
  cannot be made private again, deleted, or have a module or connection removed.
- **Public in Make's app directory: blocked on a hosted endpoint, owner decision 11.** The review
  rules below were read on 21 November 2026 from
  <https://developers.make.com/custom-apps-documentation/app-review/prerequisites> and
  <https://developers.make.com/custom-apps-documentation/app-review/request-app-review>. A public
  app must call one web service API with its own domain. This app calls whatever base URL the
  user enters, so it has no such API until the owner decides to host a scan service.

| Rule | What it asks | This app |
| --- | --- | --- |
| Functionality | The app uses a web service that Make does not integrate yet. | Make has no QR Code AI app. Met. |
| Functionality | The app and its modules connect to a web service API, and do not repeat Make's own tools. | Scan an Image calls `POST /scan` of the scan service. Met once a service is hosted. |
| Functionality | No API without its own domain, or on a platform domain such as Heroku or AWS. | The base URL is the user's own. **Blocked until the owner hosts the service under a QR Code AI domain (decision 11).** |
| Functionality | Only the credentials the service needs. | The service has no authentication, so the connection asks only for the base URL. A hosted service open to every Make user would need its own authentication first; the connection would then ask for that key and sanitize it. **Owner decision with 11.** |
| Code | Sanitization of sensitive data in the base and the connection. | Both remove `request.headers.authorization` from the logs. Met, to extend with the key above. |
| Code | Error handling in the base and the connection. | The base turns each service refusal into `[status] code: message`, a data error for 400, 413, 415 and 422 and a connection error for 503. The connection fails with its own message when `GET /healthz` does not answer. Met. |
| Code | The base and the connection use an endpoint of the app's API; wrong credentials give an error. | The connection calls `GET /healthz`. Met. |
| Code | Module labels and descriptions follow Make's conventions. | **Scan an Image**, "Reads every QR code and barcode in an image file."; **Make an API call**, "Performs an arbitrary authorized API call.". Met. |
| Code | A universal module. | **Make an API call**. Met. |
| Code | The interface matches the module's output. | The tests check that the interface and the samples name the same keys as the service's report. Met. |
| Code | Dates parsed; `limit` and pagination for searches, triggers and RPCs. | No dates, no search, trigger or RPC. Not applicable. |
| Testing | Each module in a test scenario that runs without error, and a separate scenario that ends in an error, run just before the request, without personal data. | The owner's test scenarios, below. |
| Review form | Relationship with the API vendor, support contact, categories, logo, service URL, trademark and terms confirmations. | QR Code AI is the owner's brand and service. Values below. |

## Field values

| Field | Value |
| --- | --- |
| App label | `QR Code AI` |
| App name (id) | `qrcode-ai`, if Make accepts it; Make sets the final id when the app is created. |
| Description | `Read the QR codes and barcodes in your image files with the open-source QR Code AI scanner engine.` |
| Theme colour | The QR Code AI brand colour, from the owner's brand files. |
| Icon | The QR Code AI logo, 512 × 512 PNG, from the owner's brand files. |
| Connection | `scanService`, label "QR Code AI scan service", one field: **Base URL**. |
| Modules | `scanImage` (Scan an Image, action), `makeApiCall` (Make an API call, universal). |
| Category | Productivity, or the category Make proposes for image tools in its review form. |
| Service URL | `https://qrcode-ai.com/` |
| API documentation link | The scan service's guide in this repository, once the service is released. |
| Support contact | The owner's support address at `qrcode-ai.com`. |
| Privacy policy | `https://qrcode-ai-com.github.io/privacy/`, live after the owner's review. |
| Terms | `https://qrcode-ai-com.github.io/terms/`, live after the owner's review. |
| Support page | `https://qrcode-ai-com.github.io/support/`, live after the owner's review. |

## Owner steps

### 1. A scan service

1. Run the scanner's HTTP service once it is released, on a server you control, behind HTTPS.
   It has no authentication of its own: keep it on a private network, or behind a gateway that
   only your Make organization can reach.
2. Check it answers: `curl https://scan.example.com/healthz` with your own address must return
   `{"status":"ok", ...}` with the engine version.

### 2. Deploy the app to your organization

1. Sign in to Make, open **Custom Apps**, and create an empty app with the label, name,
   description, colour and icon above. Make shows the app id it assigned.
2. In Make, open your profile, **API access**, and create an API key with the scopes the Apps
   Editor asks for. Save it in a file **outside** this repository checkout. Never commit it.
3. In Visual Studio Code, install Make's **Make Apps Editor** extension, and open this folder.
4. Right-click `makecomapp.json`, **Deploy to Make**, then **Deploy into another app**. Fill the
   new origin: label `Production`, the base URL of your Make zone (such as
   `https://eu1.make.com/api`), the app id from step 1, `appVersion` 1, and `apikeyFile` pointing
   at the key file from step 2.
5. Deploy again and choose **Deploy as new remote component, and apply for all unmapped**. The
   extension then writes an id mapping into the origin. The origin holds no secret; commit it only
   if you want the repository to name your Make app.

### 3. Try it in a scenario

1. In a scenario, add a module that gives a file, then **QR Code AI › Scan an Image**. Create the
   connection with your scan service's base URL. Make calls `GET /healthz` to check it.
2. Map **File name** and **Data**, keep **Profile** on `frame`, and run once with the repository's
   `fixtures/symbology/mixed-code128-qr.png`. The bundle must hold two codes, a QR code with
   `https://qrc-ai.com/76xMa` and a Code 128 with `STOCK-4827`.
3. Add **Make an API call** with URL `healthz` and method GET; it must return the service status.

The app now works for the scenarios of your organization. Stop here unless you want to share it.

### 4. Only if you decide to share it (irreversible)

1. Decide decision 11 first: a hosted scan service under a QR Code AI domain, with its own
   authentication, and the connection changed to ask for its key. Without that, a shared app asks
   every user to run a service of their own.
2. Remove any test module or connection: a published app cannot lose a component.
3. Click **Publish**. Make generates the invite link. The app can never be private again.
4. To be listed for all Make users: build one scenario that runs every module without error and
   a second one that ends in a refusal (an empty file gives `[400] QRSHTTP_NO_IMAGE: The image is
   empty`), run both just before the request, with no personal data. Then, in the **Review** tab,
   give the API documentation link and the scenario links, and click **Request review**. Answer
   Make's form and its reviewers' emails yourself.

## What CI proves

The [integration workflow](../../.github/workflows/integration-make.yml) validates
`makecomapp.json` and every file it names against Make's Apps Editor schemas, pinned by commit and
SHA-256. It checks the exact file set, the exact IML expressions and the addresses the app may
contain. It then evaluates the connection and both modules, sends their requests to a contract
stub of the scan service backed by the published WebAssembly engine 0.11.0, and checks the mixed
fixture's two codes in the fast, frame and full profiles, with the error messages Make would show.
Once `distribution/http` is on the revision under test, the same requests go to that service,
started in the job; until then the workflow says the live run is pending. It does not prove how
Make's own runtime evaluates the IML, which only a deployment shows.
