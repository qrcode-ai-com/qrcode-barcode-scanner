# Codex and ChatGPT · OpenAI plugin directory (agent-codex)

Prepared on 2026-11-21 for the owner. Nothing has been submitted, and the route needs decisions
before a package can be prepared.

## Live route

| Read (UTC) | URL | HTTP | Finding |
| --- | --- | --- | --- |
| 2026-11-21 07:21:43 | https://developers.openai.com/plugins/deploy/submission.md | 200 | Upload a plugin ZIP in the portal under a verified developer identity, pass the automated checks, submit for review |
| 2026-11-21 07:21:48 | https://platform.openai.com/plugins | 200 | The submission portal, behind sign-in |
| 2026-11-21 07:29 | https://developers.openai.com/plugins/deploy/desktop-only.md | 200 | "Local MCP submissions are limited to approved partners." |

Mechanism: a ZIP uploaded in the OpenAI Platform portal. Requirements stated there:

- individual or business identity verification in the organization settings;
- for a local (stdio) MCP server, the organization is allowlisted by an OpenAI representative
  first, and the ZIP includes the server and its dependencies;
- a skills-only plugin that runs locally sets `requires_local_executor: true` under
  `extensions.com.openai` in the root `plugin.json`;
- the review details include privacy and terms URLs and policy attestations.

## What exists

- The root `plugin.json` of the plugin repository carries `extensions.com.openai.interface`
  (display name, short and long descriptions, developer name QR Code AI, category, website
  https://qrcode-ai.com/, default prompt, logo). The engine CI checks it.
- `mcp.json` starts the MCP server with `npx … @qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1`.
  The server is downloaded at first start, so it is not inside the plugin.

## What blocks a ready submission

1. Identity verification of the OpenAI organization, by the owner.
2. For the plugin as it is (local MCP server): the allowlist, which only an OpenAI representative
   grants, and a package that bundles the server rather than downloading it with `npx`.
3. For a skills-only plugin without the MCP server: the owner chooses that route; then the Codex
   manifest drops `mcpServers` and sets `requires_local_executor: true`. OpenAI states that an MCP
   server cannot be added later to a skills-only plugin.
4. A privacy policy URL and a terms URL. None exists among the plugin's links; the owner supplies
   them.

## The owner's next action

Decide between the local MCP route (ask an OpenAI representative to allowlist the organization ID
from https://platform.openai.com/settings/organization/general) and the skills-only route. Then
complete identity verification and provide the privacy and terms URLs. The ZIP and manifest change
can be prepared in the engine after that decision.
