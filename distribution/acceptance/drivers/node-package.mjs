// Destination acceptance, Node.js package: scan one image with the three profiles through the
// installed package and write one JSON report per profile, for
// `scripts/destination-acceptance.py reports` to judge.
//
//   node node-package.mjs IMAGE OUT_DIR [PACKAGE]
//
// Run it from the project that installed the package: the package is resolved from the current
// directory, not from this file's.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const [image, out, name = '@qrcode-ai-com/qrcode-barcode-scanner'] = process.argv.slice(2);
if (!image || !out) {
  console.error('usage: node node-package.mjs IMAGE OUT_DIR [PACKAGE]');
  process.exit(2);
}
const { scan } = createRequire(join(process.cwd(), 'package.json'))(name);
const bytes = await readFile(image);
await mkdir(out, { recursive: true });
for (const profile of ['fast', 'frame', 'full']) {
  const report = await scan(bytes, { profile, budgetMs: 0 });
  await writeFile(join(out, `${profile}.json`), JSON.stringify(report));
  console.log(profile, report.detections.map((row) => `${row.symbology}:${row.content.text}`).join(' '));
}
