# Pi · package gallery (agent-pi)

Prepared on 2026-11-21 for the owner. Nothing has been published.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:22:11 | https://pi.dev/packages | 200 | The gallery lists npm packages; the scanner is not listed |
| 2026-11-21 07:42 | https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/packages.md | 200 | "The `pi-package` keyword makes an npm package eligible for discovery in the Pi package gallery." |

Mechanism: no form and no pull request. The gallery indexes npm packages that carry the
`pi-package` keyword. A git source also installs, but only an npm package is discovered.

## What exists

- The plugin repository's `package.json`: name `@qrcode-ai-com/qrcode-barcode-scanner-plugin`,
  version 0.3.0, MIT, keywords including `pi-package`, a `pi` field naming `pi/extension.js` and
  the skill. The engine CI packs the staged tree with `npm pack --dry-run` and checks the entry
  points and the skill are in it.
- `npm view @qrcode-ai-com/qrcode-barcode-scanner-plugin` returned 404 at 08:24:35 UTC: the
  package has never been published, so the gallery cannot find it.
- Installable without npm through a git source: `pi install git:github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin@v0.3.0`
  (the git source form of Pi's packages documentation; not run here).

## What the listing needs

A first npm publication of `@qrcode-ai-com/qrcode-barcode-scanner-plugin` 0.3.0 by the owner.
Publishing is outside what this preparation may do, and the scope's npm account needs the owner's
OTP. No publish workflow exists for this package in either repository.

If the owner decides to publish:

1. From a clean clone of `qrcode-ai-com/qrcode-barcode-scanner-plugin` at tag `v0.3.0`, check the
   file list with `npm pack --dry-run`.
2. Run `npm publish --access public` and enter the OTP.
3. Optionally, on npmjs.com, add a trusted publisher for a future release workflow so that later
   versions need no token.

The gallery picks the package up from the npm index; there is nothing to submit to pi.dev.

## The owner's next action

Decide whether to publish the plugin package on npm. Until then, Pi users install it from git and
the gallery does not list it.
