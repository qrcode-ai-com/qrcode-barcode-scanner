// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertRuntimeLicense } from "../scripts/runtime-license.mjs";

const mit = readFileSync(new URL("../../../LICENSE", import.meta.url), "utf8");
const agpl = readFileSync(new URL("../../../distribution/releases/historical-agpl-3.0.txt", import.meta.url), "utf8");
const metadata = (license) => ({ name: "@qrcode-ai-com/qrcode-barcode-scanner", version: "0.11.0", license });
assert.doesNotThrow(() => assertRuntimeLicense(metadata("AGPL-3.0-or-later"), agpl, agpl));
assert.doesNotThrow(() => assertRuntimeLicense(metadata("MIT"), mit, mit));
assert.throws(() => assertRuntimeLicense(metadata("MIT"), mit, agpl), /bundled engine notice/);
assert.throws(() => assertRuntimeLicense(metadata("AGPL-3.0-or-later"), mit, agpl), /installed engine license/);
assert.throws(() => assertRuntimeLicense(metadata("Apache-2.0"), mit, mit), /Unsupported engine license/);
assert.throws(() => assertRuntimeLicense({ ...metadata("MIT"), name: "unrelated" }, mit, mit), /Unexpected engine package/);
assert.throws(() => assertRuntimeLicense(metadata("MIT"), "MIT License", mit), /installed engine license/);
assert.throws(() => assertRuntimeLicense(metadata("MIT"), mit, mit + agpl), /bundled engine notice/);
console.log("PASS 8 engine license checks: installed package, declaration and bundled notice agree");
