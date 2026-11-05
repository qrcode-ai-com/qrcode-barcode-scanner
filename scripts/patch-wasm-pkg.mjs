// wasm-pack's generated package.json needs the publishable name + metadata.
// Run from crates/qrcode-ai-scanner-wasm (CI + local publish path).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const path = join("pkg", "package.json");
const pkg = JSON.parse(readFileSync(path, "utf8"));

// The hand-written modules and their types, copied verbatim from the crate into pkg/ and listed
// in the publish allowlist (scripts/package-inspect.py holds the tarball to these exact bytes).
const COPIED_FILES = ["auto.js", "auto.d.ts", "camera.js", "camera.d.ts", "camera-overlay.js", "camera-overlay.d.ts",
  "destination.js", "destination.d.ts", "destination-node.js", "destination-node.d.ts"];
// The examples ship inside the package, so the installed folder runs them: the image and camera
// pages under any static server, their shared worker, and the server-rendering script under Node.
// Each file is listed one by one (never the folder), and copied verbatim like the modules.
const EXAMPLE_FILES = ["headless.html", "headless.js", "camera.html", "camera.js", "scanner.worker.js", "ssr.mjs",
  "README.md"].map((file) => `examples/${file}`);

pkg.name = "@qrcode-ai-com/qrcode-barcode-scanner-wasm";
pkg.description =
  "QR and barcode decoding + scannability scoring — one portable browser WASM with camera, tracking and overlay modules, plus optional URL destination checks";
pkg.license = "AGPL-3.0-or-later";
pkg.homepage = "https://qrcode-ai.com/";
pkg.repository = {
  type: "git",
  url: "https://github.com/qrcode-ai-com/qrcode-barcode-scanner",
};
pkg.keywords = ["qrcode", "qr", "scanner", "wasm", "browser", "artistic-qr", "ai-qr"];
// wasm-pack regenerates package.json each build — re-add the shared types
// file to the publish allowlist or the tarball ships broken TS types
// One physical WASM: build-info.json links its bytes to the compiled inputs,
// recipe and tools (scripts/wasm_provenance.py writes it after this patch).
pkg.files = ["qrcode-barcode-scanner.js", "qrcode-barcode-scanner.d.ts", "qrcode-barcode-scanner_bg.wasm", "build-info.json",
  ...COPIED_FILES, ...EXAMPLE_FILES, "report-types.d.ts", "LICENSE", "LICENSE-APACHE-2.0", "THIRD-PARTY.md"];
pkg.exports = {
  ".": { types: "./qrcode-barcode-scanner.d.ts", import: "./qrcode-barcode-scanner.js", default: "./qrcode-barcode-scanner.js" },
  "./auto": { types: "./auto.d.ts", import: "./auto.js", default: "./auto.js" },
  "./camera": { types: "./camera.d.ts", import: "./camera.js", default: "./camera.js" },
  "./camera-overlay": { types: "./camera-overlay.d.ts", import: "./camera-overlay.js", default: "./camera-overlay.js" },
  // The destination core imports nothing and runs in any runtime.
  "./destination": { types: "./destination.d.ts", import: "./destination.js", default: "./destination.js" },
  // The resolver imports node:http, node:https and node:dns. With only a `node` target, a browser
  // build fails at resolution, before it bundles any node: module; the module still checks its
  // runtime when called, since some non-Node runtimes match `node` too. The null key keeps "./*"
  // from serving the same file without these conditions: an exact key outranks a pattern.
  "./destination-node": { types: "./destination-node.d.ts", node: "./destination-node.js" },
  "./destination-node.js": null,
  "./report-types": { types: "./report-types.d.ts" },
  "./qrcode-barcode-scanner_bg.wasm": "./qrcode-barcode-scanner_bg.wasm",
  // The 0.10.x compatible/ export paths were removed: the no-SIMD module they named is now the one
  // root module, which the loader option variant: 'compatible' still selects.
  "./build-info.json": "./build-info.json",
  "./package.json": "./package.json",
  "./*": "./*",
};
for (const file of COPIED_FILES) copyFileSync(file, join("pkg", file));
mkdirSync(join("pkg", "examples"), { recursive: true });
for (const file of EXAMPLE_FILES) copyFileSync(join(...file.split("/")), join("pkg", ...file.split("/")));
// The AGPL text ships in the tarball (0.9.0 shipped none). wasm-pack copies
// LICENSE* from the crate dir when Cargo.toml sets `license`, but it rebuilds
// pkg/ from scratch every time, so the crate's copy is pinned in here.
copyFileSync("LICENSE", join("pkg", "LICENSE"));
for (const file of ["LICENSE-APACHE-2.0", "THIRD-PARTY.md"]) copyFileSync(join("..", "qrcode-ai-scanner", file), join("pkg", file));

writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`patched ${path} → ${pkg.name}@${pkg.version}`);
