// SPDX-License-Identifier: MIT
// The images the Creative Cloud Marketplace listing asks for, written to build/listing/:
//   icon-48.png, icon-96.png, icon-192.png
//                     the plugin icon at the three sizes of the listing form: opaque, no text, drawn
//                     from code by scripts/icons.mjs (three QR finder patterns and four bars)
//   screenshot-1.png  1360 x 800: a document with a QR code and a barcode beside the panel's light
//   screenshot-2.png  screenshot, then its dark one
//
//   node scripts/listing-assets.mjs [--shots build/screenshots] [--out build/listing]
//
// The screenshots use the ones test/uxp-panel.mjs takes of the built plugin, so run that test
// first. Adobe's sizes for these images:
// https://developer.adobe.com/uxp/guides/how-to/distribution/listing/ (read 21 November 2026).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { BRAND, drawIcon } from './icons.mjs';

const HERE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(HERE, '..', '..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const shots = resolve(option('--shots', join(HERE, 'build', 'screenshots')));
const out = resolve(option('--out', join(HERE, 'build', 'listing')));

export const ICON_SIZES = [48, 96, 192];
const SCREENSHOT = { width: 1360, height: 800 };

const dataUrl = (bytes) => `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;

function featuredHtml({ fixture, panel, dark }) {
  const workspace = dark ? '#202020' : '#bdbdbd';
  const chrome = dark ? '#323232' : '#f0f0f0';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${SCREENSHOT.width}px; height: ${SCREENSHOT.height}px; overflow: hidden; }
  body { background: rgb(${BRAND.background.join(',')}); display: grid; grid-template-columns: 1fr 360px;
    gap: 40px; padding: 48px; box-sizing: border-box; }
  .document { background: ${workspace}; border-radius: 16px; display: grid; place-items: center; padding: 40px; }
  .document img { max-width: 100%; max-height: 100%; background: #fff;
    box-shadow: 0 0 0 4px rgb(${BRAND.finder.join(',')}); }
  .panel { border-radius: 16px; overflow: hidden; background: ${chrome}; }
  .panel img { width: 100%; display: block; margin-top: -100px; } /* from the profile to the codes found */
  </style></head><body>
  <div class="document"><img src="${dataUrl(fixture)}" alt=""></div>
  <div class="panel"><img src="${dataUrl(panel)}" alt=""></div>
  </body></html>`;
}

async function main() {
  mkdirSync(out, { recursive: true });
  const stage = mkdtempSync(join(tmpdir(), 'qrscan-photoshop-listing-'));
  const fixturePath = execFileSync('python3', [join(ROOT, 'scripts', 'destination-acceptance.py'),
    'stage', stage], { encoding: 'utf8' }).trim();
  const fixture = readFileSync(fixturePath);
  const files = {};
  for (const size of ICON_SIZES) files[`icon-${size}.png`] = drawIcon(size);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: SCREENSHOT, deviceScaleFactor: 1 });
  for (const [name, dark] of [['screenshot-1.png', false], ['screenshot-2.png', true]]) {
    const panel = readFileSync(join(shots, dark ? 'panel-dark.png' : 'panel-light.png'));
    await page.setContent(featuredHtml({ fixture, panel, dark }), { waitUntil: 'load' });
    files[name] = await page.screenshot({ type: 'png' });
  }
  await browser.close();
  rmSync(stage, { recursive: true, force: true });
  const receipt = {};
  for (const [name, bytes] of Object.entries(files)) {
    writeFileSync(join(out, name), bytes);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    receipt[name] = { width, height, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex') };
    console.log(`${name}  ${width} x ${height}  ${bytes.length} bytes`);
  }
  for (const size of ICON_SIZES) {
    const icon = receipt[`icon-${size}.png`];
    if (icon.width !== size || icon.height !== size) throw new Error(`icon-${size}.png is ${icon.width} x ${icon.height}`);
  }
  for (const name of ['screenshot-1.png', 'screenshot-2.png']) {
    if (receipt[name].width !== SCREENSHOT.width || receipt[name].height !== SCREENSHOT.height) {
      throw new Error(`${name} does not have the size Adobe asks for`);
    }
  }
  writeFileSync(join(out, 'listing-assets.json'), `${JSON.stringify(receipt, null, 2)}\n`);
}

await main();
