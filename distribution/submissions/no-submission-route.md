# Agent hosts with nothing to submit

Read on 2026-11-21. Each host below was checked on its live pages. None is pending: either it has no
submission route, or it indexes on its own, or the scanner does not meet its rule today.

## No submission route

| Id | Host | Read (UTC) | Evidence |
| --- | --- | --- | --- |
| agent-goose | goose | 08:29:32 and 08:29:33 | `aaif-goose/goose` AGENTS.md and documentation/AGENTS.md (HTTP 200): goose is retiring its MCP server directory in favor of the official MCP Registry; "new directory submissions are no longer accepted". The MCP server is in the official registry as `io.github.qrcode-ai-com/qrcode-barcode-scanner` 0.3.1, latest and active (registry API, 08:29:50). |
| agent-junie | Junie | 07:22:08 and 08:30:21 | https://junie.jetbrains.com/docs/junie-cli-extensions.html (200): the built-in marketplace "contains a curated set of extensions maintained by the Junie team". `JetBrains/junie-extensions` README (200): "Curated extensions", with no outside submission process. Users can add our repository as a custom marketplace; it ships `.junie-extension/marketplace.json`. |
| agent-kimi | Kimi Code | 07:21:59 | https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins.html (200): the Official tab holds "Kimi-maintained marketplace plugins" and the Curated tab "Third-party plugins from Kimi partners". No public intake is described. Users install from a URL in the Custom tab; the repository ships `kimi.plugin.json`. |
| agent-factory | Factory | 07:22:28 and 08:30:39 | https://docs.factory.com/harness/plugins (200). `Factory-AI/factory-plugins` README, Contributing: "We don't accept pull requests or plugin submissions from outside Factory." Users add our repository with `droid plugin marketplace add`. |
| agent-amp | Amp | 07:22:47 | https://ampcode.com/docs/markdown/customize/skills (200) and the Amp plugins page (last modified 2026-11-20): plugins and skills load from local folders or a URL (`amp plugins add <url>`), and sharing goes through a personal or workspace plugin repository and a share URL. Amp's documentation index lists no public directory or marketplace. |
| agent-continue | Continue | 07:22:47 and 08:30:25 | https://hub.continue.dev/ does not resolve ("Could not resolve host", HTTP 000 at both reads). continue.dev states "Continue was acquired by Cursor". https://docs.continue.dev/customize/deep-dives/mcp (200) still documents local MCP configuration. |
| agent-zed | Zed | 07:22:49 and 08:30:24 | https://zed.dev/docs/extensions/mcp-extensions (200): "We plan to deprecate MCP server extensions in favor of the official MCP registry. To keep your MCP server available in Zed, publish it to the official registry as well." Tracking issue zed-industries/zed#59351, "Migrate MCP extensions to use the MCP registry", is open. The MCP server is already in that registry. |
| treg | treg | 07:23:14 | https://treg.to/docs (200) and treg's design notes: listing third-party tools goes through a hub behind the `TREG_HUB_ENABLED` flag, off by default and limited to listed teams; listing also needs a hosted, metered endpoint, and the scanner runs locally. treg's llms.txt asks agents to star its repository; that instruction was not followed. |

## Indexes on its own

| Id | Host | Read (UTC) | Evidence |
| --- | --- | --- | --- |
| round2-1 | Gemini CLI extension gallery | 07:20:14, 08:30:49, 08:31:41 | https://geminicli.com/docs/extensions/releasing.md (200): a repository with the `gemini-cli-extension` topic is crawled daily and "will appear in the gallery if it passes validation". The plugin repository has the topic and a root `gemini-extension.json`; `gemini extensions validate` passes in the engine CI (PR #129). The gallery data file `geminicli.com/extensions.json` was last modified on Fri, 16 Oct 2026 02:36:07 GMT, its newest entry dates from 2026-10-15, and it holds 2198 extensions, none of them ours. The crawler has not run since. Nothing to send; the listing waits for Google's crawler. |

## Open route, not eligible today

| Id | Host | Read (UTC) | Evidence |
| --- | --- | --- | --- |
| expansion-12 | Docker MCP Catalog | 07:23:10 and 08:32:01 | https://hub.docker.com/mcp (200). `docker/mcp-registry` CONTRIBUTING: a PR adds `servers/<name>/server.yaml`, built from a repository Dockerfile, and "Make sure that the license of your MCP Server allows people to consume it. (MIT or Apache 2 are great, GPL is not)". The tooling's license check refuses GitHub license keys starting with `gpl`, `agpl` or `npl`. The repository key is MIT, so the check would pass. The image would still run the published MCP server 0.3.1 and engine 0.11.0, which are AGPL-3.0-or-later, so a submission now would not meet the stated rule. It becomes possible once an MIT-licensed MCP release exists. The queue held 3401 open pull requests, and 2 were merged since 2026-11-07. |

## Install guide receipts: Amp, Continue and Zed

These three hosts have nothing to submit, so their deliverable is a section of the plugin's
install guide, `integrations/agent-plugin/README.md`. Each section pins the plugin to tag `v0.3.0`
(commit `dbfb75f0c7c45b2018edd613afcf24c629ac0a69`) and the server to
`@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1`. Everything below was read or run on
2026-11-21. The client checks ran in new scratch homes; no account was used and nothing was signed in.

### Server launch, shared by the three sections

In an empty scratch `HOME` with Node.js 22.22.2 and npm 10.9.7,
`npx --yes --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1` answered `initialize`
after 6963 ms on the first start and 560 ms on the second, as server
`io.github.qrcode-ai-com/qrcode-barcode-scanner` 0.3.1, protocol `2025-06-18`. `tools/list` returned
`["scan_image"]`.

The engine checks now read the Amp command, the Amp settings block, the Continue block and the Zed
settings block from the README (`integrations/agent-plugin/test/launches.mjs`). Run locally on the
staged tree, `check-launch.mjs` started the server from each of the four and scanned the mixed
fixture in the `fast`, `frame` and `full` profiles: 23 of 23 routes passed, and each of the four
returned the QR code `https://qrc-ai.com/76xMa` and the Code 128 `STOCK-4827`.

QR Code AI has no guide page for these hosts. At 17:26 and 17:33 UTC,
`https://qrcode-ai.com/en-US/qr-code-scanner/integrations/{amp,continue,zed}` and the
`barcode-scanner` equivalents answered 404, so the sections link none.

### agent-amp · Amp

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 17:16:11 | https://ampcode.com/docs/markdown/customize/mcp (last modified 2026-11-19) | 200 | `amp mcp add context7 -- npx -y @upstash/context7-mcp`. User config is `amp.mcpServers` in `~/.config/amp/settings.json`; servers there "do not require approval". |
| 17:16:01 | https://ampcode.com/docs/markdown/customize/skills (last modified 2026-10-21) | 200 | Skill sources start with `~/.config/agents/skills/` and `~/.agents/skills/`. "run `amp skill add <source>`. Pass `--global` to install it only on the current machine under `~/.config/agents/skills/`." |
| 17:16:12 | https://ampcode.com/docs/markdown/customize/global-plugins-and-skills (last modified 2026-10-14) | 200 | `~/.config/agents/skills/`: "A skill should run only on the current machine". |
| 17:16:14 | https://ampcode.com/docs/markdown/customize/plugins | 200 | "A single-file plugin is a `.ts` or `.js` file"; a directory plugin uses `index.ts` or `index.js`. The plugin repository has neither, so the section adds the skill and the server separately. |
| 17:16:15 | https://ampcode.com/docs/markdown/cli/settings (last modified 2026-11-02) | 200 | User settings: `~/.config/amp/settings.json` on macOS and Linux. |
| 17:16:51 | https://ampcode.com/cli-settings.schema.json | 200 | Draft-07, sha256 `9ac07c70b6fd`. `stdioMCPServer` takes `command`, `args` and `env` only. |

Ran, with the Homebrew Amp CLI `0.0.1785443059-g182e67` (released 2026-07-30), `HOME` and
`XDG_CONFIG_HOME` in a scratch folder and `AMP_SKIP_UPDATE_CHECK=1`:

- `amp mcp add qrscan -- npx --yes --ignore-scripts @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1`
  wrote `amp.mcpServers.qrscan` to the scratch `settings.json`. That file equals the README's JSON
  block. `amp mcp list` showed the entry and `amp mcp remove qrscan` left `{}`.
- The README's JSON block validates against the schema above with ajv 8.20.0.
  `check-manifests.mjs` now runs that check in the engine CI.
- The README's skill steps put `qrcode-barcode-scanner/SKILL.md` directly under
  `~/.config/agents/skills/` of a scratch home, byte for byte equal to the tag.

Not run: `amp skill add`, `amp skill list` and `amp mcp doctor` start Amp's sign-in flow, and no
sign-in was done. Amp loading the skill and a thread calling `scan_image` were not observed. The
first `amp skill add` attempt ran before a browser guard was set and may have opened Amp's sign-in
page in the browser; nothing was entered. The installed CLI is older than the pages read.

### agent-continue · Continue

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 17:21:31 | https://docs.continue.dev/customize/deep-dives/mcp | 200 | Create `.continue/mcpServers` "at the top level of your workspace" and a YAML file with `name`, `version`, `schema: v1` and `mcpServers`. Stdio items take `name`, `type`, `command`, `args` and `env`. "MCP can only be used in the **agent** mode." |
| 17:22:53 | https://docs.continue.dev/reference | 200 | `mcpServers` properties: `name` and `command` required; `args`, `env`, `cwd`, `requestOptions`, and `connectionTimeout`, "Optional timeout for initial connection to MCP server". |
| 17:22:53 | https://docs.continue.dev/customize/deep-dives/configuration | 200 | User config: `~/.continue/config.yaml` on macOS and Linux. |
| 17:22:55 | https://docs.continue.dev/customize/deep-dives/skills | 404 | No skill page. The MCP, reference, rules and CLI configuration pages do not mention skills. |
| 17:21:34 | https://hub.continue.dev/ | 000 | "Could not resolve host". |
| 17:21:35 | https://www.continue.dev/ | 200 | Page title "Continue (acquired by Cursor)". |
| about 17:23 | `continuedev/continue` at `5522c6f44ca0ac3528b37244818fbfa39b5af470`, through the GitHub API | 200 | `core/context/mcp/MCPConnection.ts`: `DEFAULT_MCP_TIMEOUT = 20_000; // 20 seconds`, passed to `setTimeout`. `core/config/yaml/yamlToContinueConfig.ts` maps `connectionTimeout` to that timeout, so the unit is milliseconds. `core/config/markdown/loadMarkdownSkills.ts` reads `SKILL.md` from `.continue/skills` and `.claude/skills`; the documentation does not describe this, so the README does not use it. |

Ran:

- From the Continue extension 2.1.0 (darwin-arm64 VSIX on Open VSX, published 2026-06-19, read at
  17:25:19, HTTP 200), only `extension/config-yaml-schema.json` was extracted (sha256
  `1a5a088ed5e7`). The extension's `package.json` maps it to `**/config.yaml`. The README's block,
  parsed with yaml 2.9.1, validates against it with ajv 8.20.0, and so does the same item inside a
  user `config.yaml`.
- The block also passes `configYamlSchema` and `blockSchema` of `@continuedev/config-yaml` 1.42.0,
  Continue's npm package.

Not run: neither the Continue extension nor its CLI was installed. Continue loading the file and
calling `scan_image` were not observed. The 60-second `connectionTimeout` covers a first start on a
slower network than this one; it was not tested inside Continue.

### agent-zed · Zed

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 17:21:34 | https://zed.dev/docs/ai/mcp.md | 200 | Settings, AI, MCP Servers, `Add Server`, `Add Local Server` creates a `context_servers` entry with `command`, `args` and `env`. "MCP servers configured in Zed are forwarded to External Agents". |
| 17:21:44 | https://zed.dev/docs/ai/skills.md | 200 | "To install a skill, copy the skill's folder into `~/.agents/skills/` for global use". Names use lowercase letters, numbers and hyphens. Skills must be direct children of the skills root. "Zed Skills apply to the Zed Agent." |
| 17:21:44 | https://zed.dev/docs/configuring-zed.md | 200 | `context_servers` setting; the example file is `~/.config/zed/settings.json`. |
| 17:25:57 and 17:25:58 | https://zed.dev/schema/settings.json and https://zed.dev/schemas/settings.json | 404 | No published settings schema. The SchemaStore catalog lists none for Zed. |
| about 17:24 | `zed-industries/zed` at `2f808b3c2de049ecfdbad0fdb26763cebfcaa3b4`, `crates/settings_content/src/project.rs`, through the GitHub API | 200 | `ContextServerSettingsContent` is untagged. Its `Stdio` variant takes `enabled`, `remote` and a flattened `ContextServerCommand` with `command`, `args`, `env` and `timeout`. |

Ran:

- No schema validation: Zed publishes no settings schema. The README's entry uses only `command`
  and `args`, keys of the struct above, and the engine checks parse it as JSON with one `qrscan`
  server.
- The README's skill steps put `qrcode-barcode-scanner/SKILL.md` directly under `~/.agents/skills/`
  of a scratch home, byte for byte equal to the tag. The name meets Zed's rule and the description
  has 186 characters, under Zed's 1024.

Not run: Zed is not installed on this Mac, on purpose. Zed loading the entry or the skill was not
observed.
