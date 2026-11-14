// SPDX-License-Identifier: MIT
// Copied outside the checkout with the installed package and public fixtures.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Run the documented quick start from the installed archive.
const consumer = process.cwd();
const installed = join(consumer, "node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp");
const installedReadme = readFileSync(join(installed, "README.md"), "utf8");
const readmeExample = installedReadme.match(/<!-- executable-example:scan\.mjs -->\s*```js\n([\s\S]*?)\n```/);
assert.ok(readmeExample, "the packaged README must contain its executable scan.mjs quick start");
writeFileSync(join(consumer, "scan.mjs"), readmeExample[1] + "\n");
const exampleRun = (image) => spawnSync(process.execPath, ["scan.mjs", image], { cwd: consumer, env: { PATH: process.env.PATH }, encoding: "utf8", timeout: 30_000 });
const exampleMixed = exampleRun("mixed.png");
assert.equal(exampleMixed.status, 0, exampleMixed.stderr);
assert.equal(exampleMixed.stderr, "");
const exampleReport = JSON.parse(exampleMixed.stdout);
assert.deepEqual(exampleReport.versions, { scanner: "0.11.0", pipeline: 5, score_contract: 5 });
assert.equal(exampleReport.score, null);
assert.equal(exampleReport.trace.budget_exhausted, false);
assert.deepEqual(exampleReport.detections.map(({ symbology, content }) => ({ symbology, text: content.text, raw: content.raw })).sort((a, b) => a.symbology.localeCompare(b.symbology)), [
  { symbology: "code128", text: "STOCK-4827", raw: Buffer.from("STOCK-4827").toString("base64") },
  { symbology: "qr_code", text: "https://qrc-ai.com/76xMa", raw: Buffer.from("https://qrc-ai.com/76xMa").toString("base64") },
]);
const exampleEmpty = exampleRun("white.png");
assert.equal(exampleEmpty.status, 0, exampleEmpty.stderr);
assert.equal(exampleEmpty.stderr, "");
assert.deepEqual(JSON.parse(exampleEmpty.stdout).detections, []);
assert.equal(JSON.parse(exampleEmpty.stdout).score, null);
writeFileSync(join(consumer, "invalid-image.png"), "not an image");
const exampleInvalid = exampleRun("invalid-image.png");
assert.equal(exampleInvalid.status, 1);
assert.equal(exampleInvalid.stdout, "");
assert.match(exampleInvalid.stderr, /QRS-001/);
writeFileSync(join(consumer, "readme-example-receipt.json"), JSON.stringify({ verdict: "PASS", source: "installed README.md", exampleSha256: createHash("sha256").update(readmeExample[1] + "\n").digest("hex"), mixedExactPayloads: ["STOCK-4827", "https://qrc-ai.com/76xMa"], frameScore: null, emptySuccess: true, invalidImageCode: "QRS-001", node: process.version, platform: process.platform, arch: process.arch }, null, 2));
console.log(readFileSync(join(consumer, "readme-example-receipt.json"), "utf8"));
