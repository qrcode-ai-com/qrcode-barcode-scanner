# Scanner downloads and package registries

Choose an installation route for scanner engine 0.11.0. These packages run the
same local engine that [QR Code AI](https://qrcode-ai.com/) uses to verify QR designs.
QR Code AI web links · [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner)
· [Barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner).
To try the engine locally in a browser, use the [WASM image example](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/v0.11.0/crates/qrcode-ai-scanner-wasm/examples/README.md#scan-an-image-headlesshtml).

[Runtime packages](#published-runtime-packages) · [CLI and containers](#cli-and-containers)
· [Browser CDNs and indexes](#browser-cdns-and-package-indexes) · [Agent integrations](#published-agent-integrations)

## Published runtime packages

| Runtime | Package | Version |
| --- | --- | --- |
| Rust | [`qrcode-barcode-scanner`](https://crates.io/crates/qrcode-barcode-scanner/0.11.0) | 0.11.0 |
| CLI | [`qrcode-barcode-scanner-cli`](https://crates.io/crates/qrcode-barcode-scanner-cli/0.11.0) | 0.11.0 |
| Node.js | [`@qrcode-ai-com/qrcode-barcode-scanner`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner/v/0.11.0) | 0.11.0 |
| Browser WASM | [`@qrcode-ai-com/qrcode-barcode-scanner-wasm`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-wasm/v/0.11.0) | 0.11.0 |
| Python | [`qrcode-barcode-scanner`](https://pypi.org/project/qrcode-barcode-scanner/0.11.0/) | 0.11.0 |

See the [runtime quick starts](../README.md#get-started) for install commands
and examples. The Node.js package selects the matching native dependency
automatically from these six packages, all at **0.11.0**.

- macOS · [`darwin-arm64`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-darwin-arm64/v/0.11.0) · [`darwin-x64`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-darwin-x64/v/0.11.0)
- Linux · [`linux-arm64-gnu`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-linux-arm64-gnu/v/0.11.0) · [`linux-x64-gnu`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-linux-x64-gnu/v/0.11.0) · [`linux-x64-musl`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-linux-x64-musl/v/0.11.0)
- Windows · [`win32-x64-msvc`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-win32-x64-msvc/v/0.11.0)

## Browser CDNs and package indexes

- Browser WASM **0.11.0** from npm · [jsDelivr](https://cdn.jsdelivr.net/npm/@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0/auto.js) · [UNPKG](https://unpkg.com/@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0/auto.js) · [esm.sh](https://esm.sh/@qrcode-ai-com/qrcode-barcode-scanner-wasm@0.11.0/auto).
- API documentation and package metadata for **0.11.0** · [docs.rs](https://docs.rs/qrcode-barcode-scanner/0.11.0/qrcode_barcode_scanner/) · [deps.dev](https://deps.dev/npm/%40qrcode-ai-com%2Fqrcode-barcode-scanner/0.11.0) · [Libraries.io](https://libraries.io/npm/@qrcode-ai-com%2Fqrcode-barcode-scanner) · [Lib.rs](https://lib.rs/crates/qrcode-barcode-scanner).

The CDNs serve the npm browser package. The indexes describe the packages
published to npm or crates.io.

## Published agent integrations

These independently versioned integrations reuse the published
`@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` native engine. Choose the
interface your application or agent already supports:

| Integration | Public package | Install |
| --- | --- | --- |
| MCP stdio adapter | [`@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.2.1`](https://www.npmjs.com/package/@qrcode-ai-com/qrcode-barcode-scanner-mcp/v/0.2.1) | `npm install --save-exact --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.2.1` |
| Portable skill | [`qrcode-barcode-scanner@0.2.0`](https://clawhub.ai/qrcode-ai-com/skills/qrcode-barcode-scanner) | `clawhub install qrcode-barcode-scanner --version 0.2.0` |
| OpenClaw plugin bundle | [`@qrcode-ai-com/qrcode-barcode-scanner@0.2.0`](https://clawhub.ai/qrcode-ai-com/plugins/qrcode-barcode-scanner) | `openclaw plugins install clawhub:@qrcode-ai-com/qrcode-barcode-scanner@0.2.0` |

The MCP adapter passed fresh registry installations on **Linux x64 and
macOS ARM64 with Node.js 22 and 24**. Its
[0.2.1 release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/agents-v0.2.1)
was published through GitHub Trusted Publishing with verified npm provenance.
The skill and bundle passed registry installation and real
**OpenClaw 2026.11.1** runtime calls on macOS ARM64. Other clients and native
engine targets need their own installed-consumer checks.

Read the [MCP installation and stdio configuration](../integrations/mcp/),
[portable skill instructions](../skills/qrcode-barcode-scanner/) or
[bundle setup](../integrations/openclaw/) before activation. The bundle installs
its exact adapter dependency (MCP 0.2.0) through explicit setup. The adapter, skill and
bundle are versioned separately from the engine; adapter patch releases need
not change the other integration versions.

The [Official MCP Registry lists adapter 0.2.1](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.qrcode-ai-com%2Fqrcode-barcode-scanner/versions/0.2.1)
under `io.github.qrcode-ai-com/qrcode-barcode-scanner`. Its entry points to the
npm package above. Each additional client or catalogue has its own acceptance
checks.

### Connect the published MCP adapter to OpenCode

From your working directory, install the pinned adapter and register it as a
[local OpenCode MCP server](https://opencode.ai/docs/mcp-servers/#local). Keep
the install directory in place because OpenCode stores its absolute path.

```sh
npm install --prefix ./.qrscan-mcp --save-exact --ignore-scripts \
  @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.2.1
opencode mcp add qrscan -- "$(command -v node)" \
  "$PWD/.qrscan-mcp/node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp/src/cli.mjs"
opencode mcp list
```

On OpenCode 1.18.15 with Node.js 22.22.2 on macOS ARM64, `qrscan` reported
`connected` and the client discovered `scan_image`. A separate direct MCP
call on the same adapter version returned the QR payload and Code 128
`STOCK-4827` in `fast`, `frame`, and `full` with engine 0.11.0. To remove
the connection, delete `qrscan` from your OpenCode configuration.

### Install the portable skill from Git in a Codex project

From the project directory, install all five files of the 0.2.0 skill from
the pinned GitHub tree:

```sh
DISABLE_TELEMETRY=1 npx --yes skills@1.7.6 add \
  https://github.com/qrcode-ai-com/qrcode-barcode-scanner/tree/610879c31302337a2b409b21bd18324e2fece178/skills/qrcode-barcode-scanner \
  --skill qrcode-barcode-scanner --agent codex --copy --yes
```

The [pinned skill README](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/610879c31302337a2b409b21bd18324e2fece178/skills/qrcode-barcode-scanner/README.md)
shows how to install the native engine and run the helper. On macOS ARM64 with
Node.js 22.22.2, this install matched all five source files. Its helper used
engine 0.11.0 and returned the QR payload and Code 128 `STOCK-4827` together
in `fast`, `frame`, and `full`. This route installs directly from GitHub.

### Install the portable skill in Hermes

Hermes Agent installs the skill from its GitHub path. No account is needed:

```sh
hermes skills install qrcode-ai-com/qrcode-barcode-scanner/skills/qrcode-barcode-scanner
```

Hermes follows the default branch: this form has no way to pin a commit. It
copies `SKILL.md`, `README.md`, `LICENSE`, `scripts/scan.mjs` and
`scripts/test.mjs` into `<HERMES_HOME>/skills/qrcode-barcode-scanner`. The
skill does not install the engine: follow its `SKILL.md` to install
`@qrcode-ai-com/qrcode-barcode-scanner@0.11.0` into a project-local runtime
directory.

With Hermes 0.18.2 in a new, empty `HERMES_HOME` on macOS ARM64 and Node.js
22.22.2, the install passed Hermes' security scan without `--force`, the five
files matched this repository at `a91ad8f`, and the installed helper returned
the QR payload and Code 128 `STOCK-4827` together in `fast`, `frame`, and
`full`. `hermes skills uninstall qrcode-barcode-scanner` removed the
directory. `hermes skills search qrcode-barcode-scanner` also finds the
ClawHub listing of the same skill.

## CLI and containers

| Destination | Version | Platforms |
| --- | --- | --- |
| [GitHub Releases](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/v0.11.0) | 0.11.0 | macOS ARM64/x64, GNU/Linux ARM64/x64, [Windows x64](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-x86_64-pc-windows-msvc.zip), and source |
| [Homebrew tap](https://github.com/qrcode-ai-com/homebrew-tap) | 0.11.0 | macOS and GNU/Linux on ARM64/x64 |
| [Scoop bucket](https://github.com/qrcode-ai-com/scoop-bucket) | 0.11.0 | Windows x64 |
| [GitHub Debian packages](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/linux-packages-v0.11.0) | 0.11.0-1 | Debian 12 and Ubuntu 24.04, amd64 and arm64 |
| [AUR · qrcode-barcode-scanner-bin](https://aur.archlinux.org/packages/qrcode-barcode-scanner-bin) | 0.11.0-1 | Arch Linux x86_64 |
| [GitHub Fedora RPMs](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/rpm-packages-v0.11.0) | 0.11.0-1.fc44 | Fedora 44, x86_64 and aarch64 |
| [GitHub Container Registry](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/pkgs/container/qrcode-barcode-scanner) | 0.11.0 | Linux AMD64 and ARM64 |

Install `qrscan` through Homebrew.

```sh
brew install qrcode-ai-com/tap/qrscan
```

On Windows, install through Scoop.

```powershell
scoop bucket add qrcode-ai https://github.com/qrcode-ai-com/scoop-bucket
scoop install qrcode-ai/qrcode-barcode-scanner
```

The [Scoop Windows run](https://github.com/qrcode-ai-com/scoop-bucket/actions/runs/42226107417)
installed the public package, read the QR and Code 128 `STOCK-4827` together
in `fast`, `frame` and `full`, and uninstalled the CLI.
For direct downloads, follow the [CLI archive and checksum guide](cli/README.md#download-and-verify).

For Debian or Ubuntu, download the `.deb` for your architecture from the
[Linux package release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/linux-packages-v0.11.0).
Check the accompanying SHA-256, then run
`sudo apt install ./qrcode-barcode-scanner_0.11.0-1_amd64.deb` or substitute
the arm64 file. The [Debian package recipe](debian/README.md) documents the
build and removal. Fresh installs from the public assets passed the mixed
scan and removal on Debian 12 and Ubuntu 24.04 for both architectures.

On Arch Linux x86_64, clone the
[`qrcode-barcode-scanner-bin` AUR recipe](https://aur.archlinux.org/packages/qrcode-barcode-scanner-bin)
and run `makepkg -si`. The [Arch install guide](aur/README.md) covers the
existing `qrscan` command conflict. A clean Arch x86_64 container built from
the public recipe, installed the scanner, read both codes in all three profiles,
and removed the package. The container ran under x86-64 emulation.

On Fedora 44, download the [RPM release](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/tag/rpm-packages-v0.11.0),
verify its SHA-256, then run
`sudo dnf install ./qrcode-barcode-scanner-0.11.0-1.fc44.x86_64.rpm` or use the
aarch64 file. The [Fedora recipe](rpm/README.md) documents how to rebuild it.
Fresh Fedora 44 installs from the public downloads passed the mixed scan and
removal on both architectures. COPR follows its own publication process.

For containers, use the [public GHCR image 0.11.0](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/pkgs/container/qrcode-barcode-scanner)
on Linux AMD64 or ARM64. The [container guide](docker/v0.11/README.md#run-the-public-image)
shows how to scan an image locally using the verified index digest. Both
[native public consumers](https://github.com/qrcode-ai-com/qrcode-barcode-scanner/actions/runs/42208687356)
pulled anonymously and ran the exact-content regression checks. The public
0.10 GHCR and Docker Hub images and 0.1 agent archives remain available below.

<details>
<summary>Historical installations: agent 0.1.0 and engine 0.10.0</summary>

## Historical 0.1.0 agent artifacts

> The source repository is now `qrcode-ai-com/qrcode-barcode-scanner`, transferred
> from `supernovae-st/qrcode-barcode-scanner`; the release links below were
> published at the earlier address, which redirects.
> Installation names, release assets, versions and hashes below remain unchanged.
> This rename does not publish a new scanner, container, MCP adapter or skill.
> See the [source and package contract](../SOURCE-AND-EXTRACTION.md).

The scanner engine is **0.10.0**. The local MCP adapter and portable
`qr-image-scanner` skill are **0.1.0**, distributed in the
[agents-v0.1.0 release](https://github.com/supernovae-st/qrcode-barcode-scanner/releases/tag/agents-v0.1.0).
Choose the interface your application or agent already supports.

**Shipping:** the GHCR and Docker Hub CLI images, GitHub MCP/skill release assets
and the ClawHub skill.
**Pending:** the MCP adapter's npm publication and MCP Registry/Glama/Smithery
admission. Discovery on skills.sh
is unverified. The native scanner engine itself is already published on npm
at 0.10.0; install the adapter using its GitHub archive URL below.

| Download | SHA256 |
| --- | --- |
| [MCP adapter archive](https://github.com/supernovae-st/qrcode-barcode-scanner/releases/download/agents-v0.1.0/supernovae-st-qrcode-ai-scanner-mcp-0.1.0.tgz) | `c97cc6565d3b5248552c0895cde31d4b204b313fcd9d89c3464fe0fd745556e1` |
| [Complete skill ZIP](https://github.com/supernovae-st/qrcode-barcode-scanner/releases/download/agents-v0.1.0/qr-image-scanner-0.1.0.zip) | `07740a0c553eef509074f04911daef2dd203e95067600936da05214c03a50942` |

The release also supplies [SHA256SUMS](https://github.com/supernovae-st/qrcode-barcode-scanner/releases/download/agents-v0.1.0/SHA256SUMS).
These exact files are publicly downloadable without an account.

## MCP: install the public archive

Use **Node.js 22.19+ on the 22 line, or 24+** and npm. Install the published
GitHub archive directly into a new project directory:

```sh
npm install --prefix ./qrscan-mcp-install --ignore-scripts --save-exact --no-audit --no-fund \
  https://github.com/supernovae-st/qrcode-barcode-scanner/releases/download/agents-v0.1.0/supernovae-st-qrcode-ai-scanner-mcp-0.1.0.tgz
```

The adapter installs the exact native engine 0.10.0 dependency. Generate a
stdio client configuration using the current Node executable and the absolute
installed entry path:

```sh
node -p 'JSON.stringify({mcpServers:{qrscan:{command:process.execPath,args:[require("node:path").resolve("qrscan-mcp-install/node_modules/@supernovae-st/qrcode-ai-scanner-mcp/src/cli.mjs")]}}},null,2)'
```

Apply that configuration in your MCP client's supported settings. The server
uses **stdio**, with stdout reserved for JSON-RPC. It exposes `scan_image`:

- `imageBase64`: canonical base64 image bytes, without a data-URL prefix.
- `profile`: `frame` by default, or `fast` / `full`.
- `budgetMs`: optional; **0 is unbounded**, rather than a hard deadline.

The tool accepts bytes, scans locally and returns the unchanged engine report
in `structuredContent` and JSON text. `qrscan://scan-report-schema` exposes the
report schema; `qrscan://limits` exposes the active limits. The default image
limits are 8 MiB decoded bytes, 4096 pixels per side and 16 million pixels,
with at most two active scans. Tool errors carry `isError: true`; a valid empty
detection is a successful report. The package includes its AGPL license and
[adapter documentation](https://github.com/supernovae-st/qrcode-barcode-scanner/blob/agents-v0.1.0/integrations/mcp/README.md).

## Skills: install from ClawHub or use the complete directory

[ClawHub publishes `@thibautmelen/qr-image-scanner` 0.1.0](https://clawhub.ai/thibautmelen/skills/qr-image-scanner). Its anonymous cold installation preserves all five original files and has been executed in a fresh OpenClaw profile.

```sh
openclaw skills install @thibautmelen/qr-image-scanner
```

Check the installed version against 0.1.0. The engine runtime is installed separately below.


Download and inspect `qr-image-scanner-0.1.0.zip`. Keep **all five files**:
`SKILL.md`, `README.md`, `LICENSE`, `scripts/scan.mjs` and `scripts/test.mjs`.
Copy its complete `qr-image-scanner` directory into the host's skill directory:

- Hermes: the active profile's `skills/qr-image-scanner` directory.
- OpenClaw: the agent workspace's `skills/qr-image-scanner` directory; its
  supported local installer is `openclaw skills install ./qr-image-scanner`.

Hermes' direct Markdown URL installer downloads only `SKILL.md`; use the
complete directory for this skill. The helper requires Node.js 22+ and a native
engine target. OpenClaw's own Node requirements may be higher.

Install the engine separately into a project-local runtime, outside the skill:

```sh
npm install --prefix .qr-image-scanner-runtime --ignore-scripts --no-audit --no-fund --save-exact \
  @supernovae-st/qrcode-ai-scanner@0.10.0
node ./qr-image-scanner/scripts/scan.mjs --engine-root .qr-image-scanner-runtime \
  --profile full --budget-ms 2000 -- ./images/example.png
```

Use the actual installed skill directory when invoking the helper. Pass filenames
as process arguments or quote them safely. The helper validates the explicit
runtime and refuses stale dependencies, ancestor fallbacks, native overrides
and dependency symlink escapes. It accepts regular local images up to 10 MiB,
4096 pixels per side and 16 million pixels. It prints the original report and
uses exits **0** for detections, **1** for a valid report without detections,
and **2** for an error. Read the installed `SKILL.md` for the complete contract.

The skill's original text and helpers are **MIT-0**. The separately installed
scanner engine and the MCP adapter are **AGPL-3.0-or-later**. The skill ZIP
contains no engine or image fixtures; installing it does not relicense the
engine or exempt a consumer from the engine's terms.

## Docker: run the local CLI

The public [GHCR image](https://github.com/orgs/supernovae-st/packages/container/package/qrcode-ai-scanner)
and [Docker Hub mirror](https://hub.docker.com/r/thibautmelen/qrcode-ai-scanner)
have the same qualified multi-architecture index, manifests, configs and layers:

```text
ghcr.io/supernovae-st/qrcode-ai-scanner@sha256:48b40b5f1abcf6eeb52b93bc0c8b9413babfe24801b8a8925b2bdaba507df23b
docker.io/thibautmelen/qrcode-ai-scanner@sha256:48b40b5f1abcf6eeb52b93bc0c8b9413babfe24801b8a8925b2bdaba507df23b
```

Fresh anonymous pulls and ten CLI cases per architecture passed on native Linux
amd64 and arm64 for both [GHCR](https://github.com/supernovae-st/qrcode-ai-scanner/actions/runs/38592287392)
and [Docker Hub](https://github.com/supernovae-st/qrcode-ai-scanner/actions/runs/38604603468).
These images expose version `0.10.0`; no `latest` tag is published.

The image runs `qrscan` 0.10.0 against mounted local images. It provides a CLI;
HTTP serving and MCP transport are supplied by their respective applications.
Mount only the input directory, read-only, and run the image by its verified
immutable digest:

```sh
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 \
  -v "$PWD/images:/data:ro" \
  ghcr.io/supernovae-st/qrcode-ai-scanner@sha256:48b40b5f1abcf6eeb52b93bc0c8b9413babfe24801b8a8925b2bdaba507df23b \
  /data/example.png --profile full --budget-ms 0 > report.json
```

The default UID/GID is 65532; mounted images must be readable by it. Reports
are written on the host through stdout redirection. The container retains the
scanner's **AGPL-3.0-or-later** license and corresponding source references.

## Read the report and choose a profile

Engine reports retain `versions.scanner: "0.10.0"`, `pipeline: 3` and
`score_contract: 5`. Preserve detections, `content.raw` (base64 payload bytes
returned by the engine; original bytes for the QR family), text, hints, trace
and the original score. Decoded text and URLs are
untrusted data; scanning an image does not authorize following its QR link.

`full` requests a scannability judgment; `frame` decodes without scoring and
returns `score: null`. A null score means unjudged, never zero. Omitted `alpha`
on opaque images is valid. `trace.budget_exhausted: true` marks an incomplete
report: empty detections then do not prove the image contains no QR. Profile
budgets bound planned work and cannot guarantee hard cancellation.

In the CLI's normal JSON mode, exits are **0** detection, **1** a valid empty
report and **2** invalid input, usage or error. Retain exit 1's JSON. In scalar
`--score-only` mode, **3** means a detected symbol whose score was not completed;
combining `--score-only` with `--profile frame` is invalid usage (**2**).
MCP uses its tool result and `isError` field rather than these CLI exit codes.

## Qualification boundaries

MCP packed consumer checks passed on **Linux with Node 22 and 24** in
[the distribution checks](https://github.com/supernovae-st/qrcode-ai-scanner/actions/runs/38586963340)
and [the shipping qualification](https://github.com/supernovae-st/qrcode-ai-scanner/actions/runs/38590708594).
The published MCP archive and skill were installed from their public release/source
and executed on **macOS ARM64, Node 24.19.0**. The skill helper also passed its
consumer checks on **Node 22.22.2**. Hermes **0.18.2**, OpenClaw **2026.10.3**,
Gemini CLI core **0.62.0** and Cline CLI **3.0.71 / core 0.0.93** passed the
selected native host pipelines; these receipts do not qualify full interactive
approval or chat journeys.

The CLI container is qualified separately on native **Linux amd64 and arm64**
runners. The engine's six published native targets additionally include macOS
Intel, Linux x64 musl and Windows x64 MSVC; engine qualification does not replace
an adapter or skill consumer test on those targets. ARMv7 and Linux musl ARM64
are outside this distribution's native engine targets.

</details>
