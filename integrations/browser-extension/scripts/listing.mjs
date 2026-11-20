// The store texts, read from store/LISTING.md, and the Firefox Add-ons metadata built from them.
//
// LISTING.md is the one copy of every store text: each field is the first ```text block after
// its ### heading. build.mjs writes build/amo-metadata.json from it for `web-ext sign
// --amo-metadata`, so the Firefox listing cannot drift from the text the other stores get.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const LIMITS = { name: 45, short: 132, summary: 250, longMin: 250, longMax: 10000 };
export const SIX_LINKS = [
  'https://qrcode-ai.com/en-US/qr-code-scanner',
  'https://qrcode-ai.com/en-US/barcode-scanner',
  'https://qrcode-ai.com/en-US/qr-code-scanner/integrations/browser-extension',
  'https://qrcode-ai.com/en-US/barcode-scanner/integrations/browser-extension',
  'https://qrcode-ai.com/en-US/qr-code-generator',
  'https://qrcode-ai.com/en-US/barcode-generator',
];
const FIELDS = {
  name: 'Name',
  short: 'Short description',
  summary: 'Summary for Firefox Add-ons',
  long: 'Long description',
  singlePurpose: 'Single purpose',
  reviewerNotes: 'Notes for reviewers',
};

/** The first ```text block after the heading `### title` (or `## title`). */
function field(markdown, title) {
  const heading = markdown.split('\n').findIndex((line) => /^#{2,3} /.test(line)
    && line.replace(/^#+ /, '') === title);
  if (heading < 0) throw new Error(`LISTING.md has no heading "${title}"`);
  const after = markdown.split('\n').slice(heading + 1).join('\n');
  const block = /^```text\n([\s\S]*?)\n```$/m.exec(after);
  if (!block) throw new Error(`LISTING.md has no text block under "${title}"`);
  return block[1];
}

export function listingTexts(root = HERE) {
  const markdown = readFileSync(join(root, 'store', 'LISTING.md'), 'utf8');
  return Object.fromEntries(Object.entries(FIELDS)
    .map(([key, title]) => [key, field(markdown, title)]));
}

/**
 * The add-on create body of the Firefox Add-ons API v5, without the upload, as `web-ext sign
 * --amo-metadata` takes it. The license is custom: Firefox Add-ons lists AGPL-3.0-only but not
 * AGPL-3.0-or-later, the license of the bundled engine, and neither preset fits the package.
 */
export function amoMetadata(texts, { license, scanner, homepage }) {
  const text = `This add-on has two parts under two licenses.

The extension's own files (manifest.json, background.js, scanner.html, scanner.css, scanner.js, \
scanner-worker.js, results.js and icons/) are under the MIT License below.

The files in vendor/qrcode-barcode-scanner-wasm/ are copied unchanged from the npm package \
${scanner.name} ${scanner.version}. They are licensed under the GNU Affero General Public \
License, version 3 or (at your option) any later version (AGPL-3.0-or-later), with Apache-2.0 \
notices for the parts derived from rxing. Their license texts are \
vendor/qrcode-barcode-scanner-wasm/LICENSE, LICENSE-APACHE-2.0 and THIRD-PARTY.md in the add-on, \
and https://www.gnu.org/licenses/agpl-3.0.html. The corresponding source is \
https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust at tag v${scanner.version} \
(revision ${scanner.source_revision}).

${license.trimEnd()}
`;
  return {
    categories: { firefox: ['photos-music-videos'] },
    summary: { 'en-US': texts.summary },
    description: { 'en-US': texts.long },
    homepage: { 'en-US': homepage },
    support_url: { 'en-US': 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues' },
    requires_payment: false,
    is_experimental: false,
    version: {
      approval_notes: texts.reviewerNotes,
      custom_license: {
        name: { 'en-US': 'MIT (extension) and AGPL-3.0-or-later (bundled scanner engine)' },
        text: { 'en-US': text },
      },
    },
  };
}
