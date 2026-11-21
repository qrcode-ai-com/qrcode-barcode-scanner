# Publishing the Ruby gem on rubygems.org

`qrcode-barcode-scanner` is not published yet. Five inspected platform gems and an implemented
publisher are preparation, not a rubygems.org release. Each step below that signs in, accepts
terms, configures trust or approves a deployment is the owner's; no workflow performs it.

## What a release pushes

One version of the gem `qrcode-barcode-scanner`, as five platform gems built by
`.github/workflows/ruby.yml` from the engine tag's commit. The gem's version is the engine's.

| Field | Value |
| --- | --- |
| Gem name | `qrcode-barcode-scanner` (free on rubygems.org on 21 November 2026) |
| Platforms | `x86_64-linux-gnu`, `aarch64-linux-gnu`, `x86_64-darwin`, `arm64-darwin`, `x64-mingw-ucrt` |
| Summary | Read QR codes and barcodes from an image in Ruby, in process. |
| Authors | QR Code AI |
| License | MIT (the gem also ships `LICENSE-NOTES.md`, `LICENSE-APACHE-2.0` and `THIRD-PARTY.md`) |
| Homepage | `https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ruby` |
| Source code | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner` |
| Bug tracker | `https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues` |
| Ruby | `>= 3.3`, RubyGems `>= 3.3.22` |
| Dependency | `ffi ~> 1.17` |
| MFA | `rubygems_mfa_required: true` |

There is no generic (`ruby` platform) gem: without its native library a gem could not scan, and
building the engine at install time would need its whole Rust source and toolchain. A Ruby on
another system, Alpine and other musl Linux included, gets no gem from `gem install`.

## Where the built gems are

Every run of the workflow `Ruby gem` uploads the artifact **`ruby-gems`**: `feed/` holds the five
`.gem` files and `gems.json` is the receipt of their inspection, with the sha256 of each gem, of
its one native library and of every file inside it, and the source commit. The gem's dates are
the commit's, so a gem's sha256 belongs to one commit: read it from the receipt of the run on the
tag, not from an earlier branch run. The artifacts `ruby-gem-consumer-*` hold the six clean-Ruby
receipts (`acceptance-ruby-gem-<platform>-ruby<line>.json`) and the `facts-*.json` of each scan.

## Account and trust setup, by the owner

1. Sign in to [rubygems.org](https://rubygems.org/sign_in) with the account that will own the
   gem, and [enable multi-factor authentication](https://guides.rubygems.org/setting-up-multifactor-authentication)
   for the UI and the API. The gem requires MFA for every owner action.
2. Open the [pending trusted publishers](https://rubygems.org/profile/oidc/pending_trusted_publishers)
   page and click **Create**. Enter exactly:

   | Field | Value |
   | --- | --- |
   | Gem name | `qrcode-barcode-scanner` |
   | Repository owner | `qrcode-ai-com` |
   | Repository name | `qrcode-barcode-scanner-rust` |
   | Workflow filename | `ruby.yml` |
   | Environment | `rubygems` |
   | Workflow repository owner and name | leave empty |

   Click **Create Pending trusted publisher**. The repository name is the current one: the old
   name `qrcode-barcode-scanner` only redirects, and GitHub signs its tokens with the new one.
   After the first push the pending publisher becomes the gem's trusted publisher and the owner
   becomes the gem's owner.
3. In the engine repository on GitHub, **Settings → Environments → New environment**, name it
   **`rubygems`**. Under **Required reviewers** add `ThibautMelen` alone. Under **Deployment
   branches and tags** choose **Selected branches and tags** and add one rule: type **Tag**,
   pattern **`v*`**. Add no branch rule and no secret or variable.

The job `preflight` reads that environment (one reviewer, `ThibautMelen`; one tag rule, `v*`)
and the canonical repository name and immutable ID **before** the publishing job can be
scheduled. A missing or different environment fails the run; nothing creates it.

## The tag and the owner's approval

The gem follows the engine's own release train: the publishing job runs on the engine tag
`vX.Y.Z` whose version is the workspace's, after the same binding tests, five native floors,
gem inspection and six clean-Ruby consumers pass on that tag. Open the run, choose **Review
deployments**, select **rubygems**, then **Approve and deploy**. This click is the owner's.
A manual run, a branch or another tag family only inspects.

Before the token is requested, and again just before the push, the job checks the receipt's
digest, each gem file by file, the five native libraries against their floors, the tag, the
protected environment and what rubygems.org already holds. It then pushes, with
`gem push --host https://rubygems.org`, only the gems of the receipt that rubygems.org does not
hold. A gem it already holds must be the very same file; another file under the same version
stops the job. A push that stopped after some platforms can therefore be run again and pushes
only the rest. A version is never replaced, and none is yanked by automation.

## After the first push

On a clean Ruby 3.3 or later of each of the five systems, `gem install qrcode-barcode-scanner`
must fetch that system's gem and `ruby bindings/ruby/acceptance/scan.rb IMAGE OUT` must read both
codes of `fixtures/symbology/mixed-code128-qr.png` in the three profiles. Then replace the
"Not published yet" note of the README with the install command, in the same change that records
the published version.

Sources: [trusted publishing](https://guides.rubygems.org/trusted-publishing/),
[MFA](https://guides.rubygems.org/setting-up-multifactor-authentication),
[platforms](https://guides.rubygems.org/platforms),
[GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
