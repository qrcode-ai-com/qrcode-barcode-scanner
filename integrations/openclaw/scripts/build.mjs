// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

assert.equal(process.argv.length, 3, "Supply an output directory outside the source checkout");
const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(here, "../..");
const output = resolve(process.argv[2]);
assert.ok(output !== source && !output.startsWith(`${source}/`), "Build outputs stay outside the source checkout");
mkdirSync(output, { recursive: true });
const stage = mkdtempSync(join(output, "bundle-stage-"));
mkdirSync(join(stage, ".codex-plugin"));
for (const file of [".codex-plugin/plugin.json", ".mcp.json", "package.json", "README.md", "LICENSE"]) copyFileSync(join(here, file), join(stage, file));
mkdirSync(join(stage, "scripts"));
for (const file of ["setup.mjs", "runtime-license.mjs"]) copyFileSync(join(here, "scripts", file), join(stage, "scripts", file));
// The bundle still pins the published AGPL engine; its authored source is MIT.
copyFileSync(join(source, "distribution/releases/historical-agpl-3.0.txt"), join(stage, "ENGINE-LICENSE"));
cpSync(join(source, "skills/qrcode-barcode-scanner"), join(stage, "skills/qrcode-barcode-scanner"), { recursive: true });
assert.ok(!existsSync(join(stage, "openclaw.plugin.json")), "Keep the portable bundle family");
const manifest = JSON.parse(readFileSync(join(stage, ".codex-plugin/plugin.json")));
assert.equal(manifest.name, "qrcode-barcode-scanner");
const nodeRoot = dirname(realpathSync(process.execPath));
const npmCli = [join(nodeRoot, "node_modules/npm/bin/npm-cli.js"), join(nodeRoot, "../lib/node_modules/npm/bin/npm-cli.js")].find(existsSync);
assert.ok(npmCli, "Use Node with its matching npm installation");
const packed = JSON.parse(execFileSync(process.execPath, [npmCli, "pack", "--json", "--pack-destination", output], { cwd: stage, encoding: "utf8" }))[0];
assert.ok(!packed.files.some(({ path }) => path.includes("node_modules") || path.startsWith("runtime/")), "No host-specific runtime in the portable bundle archive");
console.log(JSON.stringify({ stage, archive: join(output, packed.filename), files: packed.files.map(({ path }) => path), family: "bundle-plugin", format: "codex", version: manifest.version }));
