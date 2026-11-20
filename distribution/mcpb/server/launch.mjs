#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Starts the published MCP server of this bundle, unchanged, with the folders the host passes.
//
// An MCPB host expands a multiple-folder setting into separate arguments, and only in `args`: in
// an `env` value it leaves an array unexpanded. It leaves `${user_config.allowed_directories}` as
// written when the setting is unset. The server takes no argument and reads its folders from
// QRSCAN_MCP_ALLOWED_DIRECTORIES, separated like PATH. This file joins the arguments that way.
import { delimiter, isAbsolute } from "node:path";

const VARIABLE = "QRSCAN_MCP_ALLOWED_DIRECTORIES";
const UNSET = "${user_config.allowed_directories}";
const SERVER = "../node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp/src/cli.mjs";

try {
  // An unset setting arrives as its placeholder, or as an empty argument: neither names a folder.
  const folders = process.argv.slice(2).filter((value) => value !== UNSET && value !== "");
  folders.forEach((folder, index) => {
    if (!isAbsolute(folder)) throw new Error(`folder ${index + 1} is not an absolute path`);
    // The server splits on the delimiter: a folder holding one would turn into other folders.
    if (folder.includes(delimiter)) throw new Error(`folder ${index + 1} contains "${delimiter}", which separates folders; choose another folder`);
  });
  // The extension settings are the only grant: a value inherited from the host is not used.
  if (process.env[VARIABLE] !== undefined) process.stderr.write(`qrscan-mcpb: ${VARIABLE} from the environment is not used; allow folders in the extension settings\n`);
  if (folders.length === 0) delete process.env[VARIABLE];
  else process.env[VARIABLE] = folders.join(delimiter);
  // The server refuses any command-line argument.
  process.argv.length = 2;
  await import(new URL(SERVER, import.meta.url).href);
} catch (error) {
  process.stderr.write(`qrscan-mcpb: ${error.message}\n`);
  process.exitCode = 1;
}
