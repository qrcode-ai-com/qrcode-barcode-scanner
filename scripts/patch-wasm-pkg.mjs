// wasm-pack's generated package.json needs the publishable name + metadata.
// Run from crates/qrcode-ai-scanner-wasm (CI + local publish path).
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

const path = "pkg/package.json";
const pkg = JSON.parse(readFileSync(path, "utf8"));

pkg.name = "@supernovae-st/qrcode-ai-scanner-wasm";
pkg.description =
  "QR and barcode decoding + scannability scoring — one portable browser WASM with camera, tracking and overlay modules";
pkg.license = "AGPL-3.0-or-later";
pkg.repository = {
  type: "git",
  url: "https://github.com/supernovae-st/qrcode-barcode-scanner",
};
pkg.keywords = ["qrcode", "qr", "scanner", "wasm", "browser", "artistic-qr", "ai-qr"];
// wasm-pack regenerates package.json each build — re-add the shared types
// file to the publish allowlist or the tarball ships broken TS types
// One physical WASM: build-info.json links its bytes to the compiled inputs,
// recipe and tools (scripts/wasm_provenance.py writes it after this patch).
pkg.files = ["qrcode-ai-scanner.js", "qrcode-ai-scanner.d.ts", "qrcode-ai-scanner_bg.wasm", "build-info.json",
  "auto.js", "auto.d.ts", "camera.js", "camera.d.ts",
  "camera-overlay.js", "camera-overlay.d.ts", "report-types.d.ts", "LICENSE", "LICENSE-APACHE-2.0", "THIRD-PARTY.md"];
pkg.exports = {
  ".": { types: "./qrcode-ai-scanner.d.ts", import: "./qrcode-ai-scanner.js", default: "./qrcode-ai-scanner.js" },
  "./auto": { types: "./auto.d.ts", import: "./auto.js", default: "./auto.js" },
  "./camera": { types: "./camera.d.ts", import: "./camera.js", default: "./camera.js" },
  "./camera-overlay": { types: "./camera-overlay.d.ts", import: "./camera-overlay.js", default: "./camera-overlay.js" },
  "./report-types": { types: "./report-types.d.ts" },
  "./qrcode-ai-scanner_bg.wasm": "./qrcode-ai-scanner_bg.wasm",
  // 0.10.x published its no-SIMD module under compatible/. That feature set is
  // now the only module, so both legacy paths name the same physical files.
  "./compatible/qrcode-ai-scanner.js": "./qrcode-ai-scanner.js",
  "./compatible/qrcode-ai-scanner_bg.wasm": "./qrcode-ai-scanner_bg.wasm",
  "./build-info.json": "./build-info.json",
  "./package.json": "./package.json",
  "./*": "./*",
};
for (const file of ["auto.js", "auto.d.ts", "camera.js", "camera.d.ts", "camera-overlay.js", "camera-overlay.d.ts"]) copyFileSync(file, `pkg/${file}`);
// The AGPL text ships in the tarball (0.9.0 shipped none). wasm-pack copies
// LICENSE* from the crate dir when Cargo.toml sets `license`, but it rebuilds
// pkg/ from scratch every time, so the crate's copy is pinned in here.
copyFileSync("LICENSE", "pkg/LICENSE");
for (const file of ["LICENSE-APACHE-2.0", "THIRD-PARTY.md"]) copyFileSync(`../qrcode-ai-scanner/${file}`, `pkg/${file}`);

writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`patched ${path} → ${pkg.name}@${pkg.version}`);
