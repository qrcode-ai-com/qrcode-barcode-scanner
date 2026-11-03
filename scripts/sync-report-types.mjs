// Copy the canonical report-types contract into both npm packages and retype
// the wasm scan functions from `any` to `ScanReport`. All paths resolve from
// the repo root (this file lives in scripts/), so it runs correctly from ANY
// cwd — including npm's prepack hook, which runs from the package directory.
//
// --require-wasm (scripts/build-wasm.sh passes it): the wasm package's
// declarations must exist, so a pkg/ without them fails before anything is
// written instead of shipping untyped scan functions. Without the flag (the
// node package's prepack, which never has a wasm build) they are skipped.
import { copyFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const unknown = args.filter((arg) => arg !== "--require-wasm");
if (unknown.length > 0) {
  console.error(`usage: sync-report-types.mjs [--require-wasm]; unknown: ${unknown.join(" ")}`);
  process.exit(2);
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CANON = join(ROOT, "bindings/report-types.d.ts");
const wasmDts = join(ROOT, "crates/qrcode-ai-scanner-wasm/pkg/qrcode-barcode-scanner.d.ts");
if (args.includes("--require-wasm") && !existsSync(wasmDts)) {
  console.error(`error: --require-wasm: ${wasmDts} is missing (run scripts/build-wasm.sh)`);
  process.exit(1);
}

// node package: plain copy next to index.d.ts (which re-exports it)
copyFileSync(CANON, join(ROOT, "crates/qrcode-ai-scanner-node/report-types.d.ts"));
console.log("synced → crates/qrcode-ai-scanner-node/report-types.d.ts");

// wasm package (one module): copy into pkg/ + retype the two scan functions
if (existsSync(wasmDts)) {
  copyFileSync(CANON, join(ROOT, "crates/qrcode-ai-scanner-wasm/pkg/report-types.d.ts"));
  let dts = readFileSync(wasmDts, "utf8");
  if (!dts.includes("./report-types")) {
    dts = dts.replace(
      "/* eslint-disable */",
      '/* eslint-disable */\nexport * from "./report-types";\nimport type { ScanReport } from "./report-types";'
    );
  }
  dts = dts
    .replace(
      'import type { ScanReport } from "./report-types";',
      'import type { Capabilities, ScanReport } from "./report-types";'
    )
    .replace(
      /export function capabilities\(\): any;/,
      "export function capabilities(): Capabilities;"
    )
    .replace(
      /export function scan_frame\(([^)]*)\): any;/,
      "export function scan_frame($1): ScanReport;"
    )
    .replace(
      /export function scan_image\(([^)]*)\): any;/,
      "export function scan_image($1): ScanReport;"
    );
  writeFileSync(wasmDts, dts);
  console.log(`synced + retyped → ${wasmDts}`);
}
