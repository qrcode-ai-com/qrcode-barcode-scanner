// Destination acceptance, JSR package: in Deno, import the package, scan one image with the
// three profiles and no budget, and write one JSON report per profile, for
// `scripts/destination-acceptance.py reports --kind package` to judge.
//
//   deno run --allow-read --allow-net=jsr.io scan-with-deno.mjs IMAGE OUT_DIR [MODULE]
//
// MODULE is the package as a user names it, jsr:@qrcode-ai-com/qrcode-barcode-scanner@0.11.0 by
// default. Before publication it can be the staged folder's qrcode-barcode-scanner.js as a file:
// URL. The module loads its own WebAssembly file next to itself. It judges nothing.
const [image, out, module = 'jsr:@qrcode-ai-com/qrcode-barcode-scanner@0.11.0'] = Deno.args;
if (!image || !out) {
  console.error('usage: deno run --allow-read --allow-net=jsr.io scan-with-deno.mjs IMAGE OUT_DIR [MODULE]');
  Deno.exit(2);
}
const scanner = await import(module);
await scanner.default();
const bytes = await Deno.readFile(image);
await Deno.mkdir(out, { recursive: true });
for (const profile of ['fast', 'frame', 'full']) {
  const report = scanner.scan_image(bytes, profile, null, null, 0);
  await Deno.writeTextFile(`${out}/${profile}.json`, JSON.stringify(report));
  console.log(profile, report.detections.map((row) => `${row.symbology}:${row.content.text}`).join(' '));
}
