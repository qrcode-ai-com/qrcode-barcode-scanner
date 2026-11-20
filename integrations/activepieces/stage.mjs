// SPDX-License-Identifier: MIT
// Copy this piece into an Activepieces checkout as a custom piece, where the monorepo's own
// commands build it:
//   node integrations/activepieces/stage.mjs <activepieces-checkout>
//   cd <activepieces-checkout> && bun install && npm run build-piece qrcode-barcode-scanner
// Only the piece's own files are copied; nothing in the checkout is deleted.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PIECE_FOLDER = 'packages/pieces/custom/qrcode-barcode-scanner';
export const PIECE_FILES = ['package.json', 'tsconfig.json', 'tsconfig.lib.json', '.eslintrc.json', 'README.md', 'LICENSE', 'src'];
// The Activepieces revision whose piece tooling this folder was checked against.
export const ACTIVEPIECES_REVISION = 'ca93da9cd7a3b93250a8c9858b74d0d96832d90f';

const here = dirname(fileURLToPath(import.meta.url));

/** Copy the piece into `<checkout>/packages/pieces/custom/qrcode-barcode-scanner` and return that path. */
export function stagePiece(checkout) {
  const root = resolve(checkout);
  if (!existsSync(join(root, 'packages', 'pieces', 'framework', 'package.json'))) {
    throw new Error(`${root} is not an Activepieces checkout: packages/pieces/framework is missing`);
  }
  const target = join(root, PIECE_FOLDER);
  mkdirSync(target, { recursive: true });
  for (const entry of PIECE_FILES) cpSync(join(here, entry), join(target, entry), { recursive: true });
  return target;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const checkout = process.argv[2];
  if (!checkout) {
    console.error('Usage: node integrations/activepieces/stage.mjs <activepieces-checkout>');
    process.exit(2);
  }
  const target = stagePiece(checkout);
  console.log(`Staged ${target}. Build it there with: npm run build-piece qrcode-barcode-scanner`);
}
