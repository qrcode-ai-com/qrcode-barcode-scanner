# Publishing the .NET package

`QRCodeAI.QRCodeBarcodeScanner` is not published yet. An inspected archive and an implemented
publisher are preparation, not a nuget.org release. The package keeps `net8.0` and five native
platforms; the CLI's musl targets do not add Alpine support to this package.

## Account and trust setup, by the owner

1. Sign in to [nuget.org](https://www.nuget.org/users/account/LogOn) with a Microsoft account.
   Create an individual administrator profile, then an organization to own the package. The
   organization name must be available. Keep recovery and multifactor authentication under
   the owner's control; automation creates no account and accepts no terms on the owner's behalf.
2. Set repository variable `NUGET_USER` to the **actual individual NuGet username**. This is not
   an email address, a GitHub username inferred by automation, or the organization name.
3. In nuget.org, add a trusted publishing policy scoped to this exact package and its selected
   owner. Repository owner: `qrcode-ai-com`; repository: `qrcode-barcode-scanner`; workflow:
   **`dotnet.yml`** (file name only); GitHub environment: **`nuget`**.
4. Create GitHub environment `nuget`, with `ThibautMelen` as the sole required reviewer and one
   custom deployment policy: tags `v*`. Permit no branch policy. Do not add a permanent NuGet
   API key: the reviewed `NuGet/login` action exchanges GitHub OIDC for a short-lived key.

The preflight checks the canonical repository name and immutable ID, the exact workspace tag,
that username variable and the existing protection rules **before** the publishing job can be
scheduled. A missing environment fails; the workflow cannot silently create an unprotected one.
Ordinary pull requests and manual branch rehearsals inspect only and need no NuGet account.

Sources: [individual accounts](https://learn.microsoft.com/en-us/nuget/nuget-org/individual-accounts),
[organizations](https://learn.microsoft.com/en-us/nuget/nuget-org/organizations-on-nuget-org),
[trusted publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing).

## Before the first tag

Run `.github/workflows/dotnet.yml` on the exact proposed source commit. Require the binding
checks (.NET 8 and 10), all five native-library floors, archive inspection and all five clean
folder-feed consumers to pass. Review the archive's `package.json`, version, source commit,
SHA-256 and native hashes. Check the package README's six links and the nuspec's public text.
A green branch rehearsal proves these steps; it does not exercise an OIDC upload or a public
NuGet installation. The maintainer must separately authorize every tag and publication.

## The tag and the owner's approval

After authorization, the engine's `vX.Y.Z` tag runs the same build, archive and consumer checks.
The package version is the engine's version; the nuspec records that tag's source commit.
The protected job needs every check to succeed. Open its Actions run, choose **Review
deployments**, select **nuget**, then **Approve and deploy**. This click is the owner's.
Manual dispatch is inspection only; rerunning an engine tag still requires all tag gates.

Immediately before OIDC and again before upload, the job rechecks the producer receipt's digest,
archive contents, five native files and platform floors, tag identity, protected environment,
and version absence. It pushes only that archive. A pre-existing version stops the job; there
is no replacement, `--skip-duplicate`, automatic tag movement or fallback static credential.
An upload failure is investigated before another action. Never delete and republish a version.

## Public receipt

After an upload, five fresh projects on Linux x64/arm64, macOS Intel/Apple silicon and Windows
x64 install the exact version from nuget.org with a new package cache, scan the three profiles,
then remove the package. Each receipt records its platform and source commit.

nuget.org adds a repository signature, so the public ZIP hash is normally different from the
unsigned producer archive. Each consumer runs `dotnet nuget verify --all`, requires the signature,
and compares **every other archive member byte for byte** with the qualified producer. Its
fresh NuGet cache must hold that same public archive. Missing, extra or modified content fails.
Both archive hashes are kept in `publication.json`; crypto verification and scan acceptance
must pass before this destination is counted as published and qualified.

[NuGet signed packages](https://learn.microsoft.com/en-us/nuget/reference/signed-packages-reference)
describes the repository signature. The first actual OIDC upload and public installation remain
unexercised until the owner completes account setup and approves a release.
