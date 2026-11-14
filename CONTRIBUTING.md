# Contributing

Thanks for considering a contribution! `qrcode-barcode-scanner` is one Rust core
(`crates/qrcode-ai-scanner`) with thin façades on top (CLI, Node/napi, browser/WASM,
Python/PyO3, and Kotlin+Swift via UniFFI). Most changes land in the core; the façades
stay thin.

By contributing project-authored code or documentation, you license it under the
[MIT License](LICENSE), matching this source tree. Keep third-party copyright and
license notices intact; see [LICENSING.md](LICENSING.md) for the source and archive boundary.

## Build & test

Read [Local development checks](RELEASING.md#local-development-checks) for the
exact compiler, locked workspace gates and excluded binding roots. The compiler
pin comes from `RUST_TOOLCHAIN` in `.github/workflows/ci.yml`; the manifest's
`rust-version` is the separately tested minimum. No repository toolchain file
overrides a contributor's default, so use the explicit compiler selector.

A first core check with the current pin is:

```bash
cargo +1.99.1 test -p qrcode-barcode-scanner --all-targets --locked
cargo +1.99.1 fmt --all --check
```

This core check does not execute all bindings, doctests or installed consumers.
Before a PR, run the applicable workspace, type, MSRV, Wasm and package gates
from the linked runbook. Source/build/packed-consumer checks have different
scope; CI exercises the selected gates on Linux / macOS / Windows. Apply
formatting to owned files when editing, then verify it with the check above.

## Code standards

- **No `.unwrap()` / `.expect()` in `src/`** — the workspace lints deny them;
  return a typed error instead.
- Keep `clippy` (with `pedantic`) warning-free, and document public items.
- **Deterministic by contract**: same bytes + same config ⇒ the same result.
  Don't introduce hidden RNG or wall-clock-dependent output.

## The wire contract lives in `spec/`

`spec/` is the **normative** `ScanReport` contract (wire format + JSON Schema +
golden examples), validated in CI against the real types and against a fresh
scan of each golden's fixture. If your change alters a report (its shape or any
value), update `spec/` and regenerate the affected golden examples in the same
PR, with the command lines in `spec/README.md` § Examples — CI will fail
otherwise.

## Pull requests

1. Fork, then branch from `main`.
2. Use [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat:`, `fix:`, `docs:`, …).
3. Add or adjust tests, and update `CHANGELOG.md` under the unreleased section.
4. Open the PR, fill in the template, and make sure CI is green.

Larger ideas? Open a feature-request issue first so we can align on the design.
