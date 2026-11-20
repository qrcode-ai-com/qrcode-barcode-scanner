// SPDX-License-Identifier: MIT
// Pi extension: registers the scanner's MCP server, started with npx at a pinned version, for the
// session. Pi keeps no registration between loads, so this runs on every load; a server named
// `qrscan` in the user's mcp.json takes precedence. The skill comes from this package's `skills/`
// directory, declared in package.json. Nothing here starts a process.
const LAUNCH = ["npx", "--yes", "--ignore-scripts", "@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1"];

export default function (pi) {
  pi.registerMcpServer("qrscan", {
    command: LAUNCH[0],
    args: LAUNCH.slice(1),
    description: "QR Code & Barcode Scanner: read QR codes and barcodes in images, locally",
  });
}
