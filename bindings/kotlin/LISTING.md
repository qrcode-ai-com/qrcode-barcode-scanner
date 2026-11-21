# Publishing the Android binding on Maven Central

`io.github.qrcode-ai-com:qrcode-barcode-scanner` is not on Maven Central yet. An inspected,
unsigned bundle and a clean consumer that installs it are preparation, not a release. Maven
Central has no trusted publishing, so every step below that signs in, verifies the namespace,
creates or holds a key, accepts terms or uploads is the owner's; no workflow performs it.

## What an upload publishes

One version of one component, in the bundle `.github/workflows/maven-central.yml` builds from an
engine tag's commit. Its version is the engine's.

| Field | Value |
| --- | --- |
| Namespace (groupId) | `io.github.qrcode-ai-com` |
| Artifact | `qrcode-barcode-scanner`, packaging `aar` |
| Name | QR Code & Barcode Scanner for Android |
| Description | Read QR codes and barcodes from an image in Kotlin on Android, in process, with the open-source engine's native library inside the AAR. |
| URL | `https://qrcode-ai.com/en-US/qr-code-scanner/sdk/android` |
| License | MIT, `https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSE` (the AAR also carries `LICENSE-NOTES.md`, `LICENSE-APACHE-2.0` and `THIRD-PARTY.md`) |
| Developer | `qrcode-ai-com`, QR Code AI |
| SCM | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner` |
| Issues | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues` |
| Dependency | `net.java.dev.jna:jna:5.17.0`, type `aar`, runtime |
| Native library | `arm64-v8a`, `armeabi-v7a`, `x86_64`, `x86`; minimum SDK 21 |
| Files | the AAR, the POM, `-sources.jar` (the generated Kotlin), `-javadoc.jar` (a README that points to the binding's documentation, which Central accepts for generated code), each with its `.md5`, `.sha1`, `.sha256` and `.sha512` |

The same Gradle module still publishes `com.github.qrcode-ai-com` on JitPack; only the group
differs (`-PscannerGroup`).

### Why `io.github.qrcode-ai-com`

The group names the GitHub organization that publishes the source, and Central verifies it with
a temporary public repository in that organization, which the owner already controls. The other
route, `com.qrcode-ai`, would need a DNS TXT record on the qrcode-ai.com domain, which serves the
product's website. A group is permanent on Central, so it is chosen once.

## Where the bundle is

Every run of the workflow `Maven Central bundle` uploads the artifact
**`maven-central-bundle`**:

- `qrcode-barcode-scanner-X.Y.Z-bundle.zip`: the unsigned bundle in the Maven repository layout
  (`io/github/qrcode-ai-com/qrcode-barcode-scanner/X.Y.Z/`).
- `bundle.json`: its inspection receipt, with the zip's sha256, the sha256 of the AAR, the POM
  and the two jars, of the native library of each ABI, and the source commit.
- `alignment.json`: the 16 KB page alignment of the 64-bit libraries.

The artifact **`maven-central-consumer`** holds the receipt of the clean Android project that
installed the AAR from that bundle alone and read both codes of
`fixtures/symbology/mixed-code128-qr.png` in the fast, full and frame profiles, debug and
minified, on Android 15 with 16 KB pages.

Upload only the bundle of the run on an engine tag `vX.Y.Z`. A branch or manual run is a
rehearsal: its version is the workspace's, which may still be the last release's, and its
dates are its own commit's. The engine tags made before this workflow have no bundle, and the
library of the last of them shipped under other license terms, so the first version on Central
is the next engine tag.

## Account and namespace, by the owner

1. Sign in to [central.sonatype.com](https://central.sonatype.com) with the account that will
   own the namespace.
2. Read the [Publisher Tiers and Commercial Use](https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/)
   note and the [Central Publisher Terms](https://central.sonatype.org/publish/producer-terms/).
   Since 1 October 2026 Central requires Maven Central Publisher Pro for an artifact of
   "commercial nature", one that supports the adoption, integration or operation of an
   organization's commercial product or service. Deciding whether this component is one, or
   requesting Central's review as a community artifact, is the owner's decision; this kit
   makes no judgment.
3. Open the account menu, **View Namespaces**, then **Add Namespace**. Enter
   `io.github.qrcode-ai-com` and click **Submit**. Central does not register an organization's
   `io.github` namespace on its own.
4. Copy the namespace's **Verification Key**. In the `qrcode-ai-com` organization on GitHub,
   create an empty **public** repository whose name is exactly that key.
5. Back on the namespace, click **Verify Namespace**, then **Confirm**. When it reads
   **Verified**, the temporary repository is no longer needed; removing or archiving it is the
   owner's choice.

## Signing key, by the owner

Central refuses a file without an ASCII-armored detached signature (`.asc`) made by a key whose
public half it can fetch from a keyserver.

1. Create or choose an OpenPGP key reserved for releases, on the owner's own machine. It never
   goes into this repository or a workflow.
2. Publish its public key, for example
   `gpg --keyserver keyserver.ubuntu.com --send-keys KEYID`, and wait until
   `gpg --keyserver keyserver.ubuntu.com --recv-keys KEYID` finds it.

## Sign and check the upload zip

From a checkout of the engine at the tag, with the tag run's `maven-central-bundle` artifact
unpacked in `bundle/` (replace `X.Y.Z`, `KEYID` and `SHA`, the tag's full commit):

```bash
mkdir upload && cd upload
unzip -q ../bundle/qrcode-barcode-scanner-X.Y.Z-bundle.zip
dir=io/github/qrcode-ai-com/qrcode-barcode-scanner/X.Y.Z
for file in "$dir"/*.aar "$dir"/*.pom "$dir"/*.jar; do
  gpg --local-user KEYID --armor --detach-sign "$file"
done
TZ=UTC zip -q -X -D -r ../qrcode-barcode-scanner-X.Y.Z-upload.zip io
cd ..
python3 scripts/maven-central-bundle.py inspect qrcode-barcode-scanner-X.Y.Z-upload.zip \
  --version X.Y.Z --commit SHA --signed --expect bundle/bundle.json --out upload.json
```

The inspection refuses an upload zip that lacks a signature, holds a malformed one, or whose
four files or native libraries differ from the ones the tag run inspected and installed. It
reads the form of each signature; the Central Portal checks them against the published key.

## Upload, by the owner

**Option 1, the portal (no stored secret).** On [central.sonatype.com](https://central.sonatype.com),
**Publish** (or **Publish Component** on the namespace), enter the deployment name
`io.github.qrcode-ai-com:qrcode-barcode-scanner:X.Y.Z`, **Upload File** with
`qrcode-barcode-scanner-X.Y.Z-upload.zip`, then **Publish Component**. Wait until the deployment
reads **Validated**, review its files, then click **Publish**. Central keeps a published version
forever: it can be neither replaced nor removed.

**Option 2, a protected job (not implemented).** A later job on the engine tag could sign and
upload the same bundle with the [Portal API](https://central.sonatype.org/publish/publish-portal-api/)
(`POST https://central.sonatype.com/api/v1/publisher/upload?publishingType=USER_MANAGED`, so
the final **Publish** click stays the owner's). It would need, in a GitHub environment named
`maven-central` with the required reviewer `ThibautMelen` and the single tag rule `v*`, three
secrets: the release key, its passphrase and a Central Portal user token. Storing them is the
owner's decision, and this repository holds none of them today.

## After the first upload

When `https://repo1.maven.org/maven2/io/github/qrcode-ai-com/qrcode-barcode-scanner/X.Y.Z/`
lists the files, run the clean project against Central itself on an emulator:

```bash
gradle -p tests/consumers/jitpack-android :app:connectedDebugAndroidTest \
  -PscannerGroup=io.github.qrcode-ai-com -PscannerVersion=X.Y.Z \
  -PscannerRepo=https://repo1.maven.org/maven2
```

Then replace the "Not published yet" sentence of the [README](README.md#maven-central) with
the dependency line, in the same change that records the published version.

Sources: [namespaces](https://central.sonatype.org/register/namespace/),
[requirements](https://central.sonatype.org/publish/requirements/),
[signing](https://central.sonatype.org/publish/requirements/gpg/),
[bundle upload](https://central.sonatype.org/publish/publish-portal-upload/),
[Portal API](https://central.sonatype.org/publish/publish-portal-api/).
