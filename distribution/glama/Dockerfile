# The MCP server @qrcode-ai-com/qrcode-barcode-scanner-mcp 0.3.1, as Glama builds and runs it.
# It installs the published npm package from package-lock.json, compiles nothing and speaks MCP
# over stdio. The native scanner 0.11.0 comes from its pinned linux-x64-gnu or linux-arm64-gnu
# npm package, so the base is glibc (Debian), not musl. Scans need no network access.
FROM node:22.22.2-bookworm-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

WORKDIR /opt/qrscan-mcp
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force \
    && test "$(node -p 'require("@qrcode-ai-com/qrcode-barcode-scanner-mcp/package.json").version')" = 0.3.1

USER node
ENTRYPOINT ["node", "/opt/qrscan-mcp/node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp/src/cli.mjs"]
