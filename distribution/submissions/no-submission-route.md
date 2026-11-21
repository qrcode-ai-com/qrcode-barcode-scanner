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
