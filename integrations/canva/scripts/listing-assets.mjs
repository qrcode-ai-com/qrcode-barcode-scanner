// SPDX-License-Identifier: MIT
// The images the Canva listing form asks for, written to build/listing/:
//   icon-512.png      the app icon: 512 x 512, full bleed, opaque, no rounded corners, no text,
//                     drawn from code (three QR finder patterns and four barcode bars)
//   featured-1.png    2400 x 1800 (4:3): the mixed fixture as a design, beside the panel's light
//   featured-2.png    screenshot, then its dark one
//
//   node scripts/listing-assets.mjs [--shots build/screenshots] [--out build/listing]
//
// The featured images use the screenshots that test/canva-csp.mjs takes of the built app, so run
// that test first. Canva's rules for these images:
// https://www.canva.dev/docs/apps/app-listing-guidelines/app-icon/ and
// https://www.canva.dev/docs/apps/app-listing-guidelines/featured-image/ (read 21 November 2026).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { encodePng } from './png.mjs';

const HERE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(HERE, '..', '..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const shots = resolve(option('--shots', join(HERE, 'build', 'screenshots')));
const out = resolve(option('--out', join(HERE, 'build', 'listing')));

const BACKGROUND = [0x07, 0x0A, 0x16];
const FINDER = [0xA9, 0x8B, 0xFF];
const BARS = [0x43, 0xDF, 0xD2];

// The art in module units on a 17 x 17 grid: finders of 7 modules, a gap of 3, and four bars.
function colourAt(mx, my) {
  const finder = (ox, oy) => {
    const x = mx - ox;
    const y = my - oy;
    if (x < 0 || y < 0 || x >= 7 || y >= 7) return false;
    return x < 1 || y < 1 || x >= 6 || y >= 6 || (x >= 2 && y >= 2 && x < 5 && y < 5);
  };
  if (finder(0, 0) || finder(10, 0) || finder(0, 10)) return FINDER;
  if (my >= 10 && my < 17) {
    for (const [from, to] of [[10, 11], [12, 14], [15, 15.8], [16.4, 17]]) {
      if (mx >= from && mx < to) return BARS;
    }
  }
  return null;
}

/** The icon as PNG bytes: the art inside Canva's keyline area, on an opaque full square. */
export function drawIcon(size = 512) {
  const samples = 8;
  const pad = 0.22;
  const module = (1 - 2 * pad) / 17;
  const rgba = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          const colour = colourAt((x - pad) / module, (y - pad) / module) ?? BACKGROUND;
          for (let c = 0; c < 3; c += 1) sum[c] += colour[c];
        }
      }
      const at = (py * size + px) * 4;
      for (let c = 0; c < 3; c += 1) rgba[at + c] = Math.round(sum[c] / (samples * samples));
      rgba[at + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

const dataUrl = (bytes) => `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;

function featuredHtml({ fixture, panel, dark }) {
  const page = dark ? '#16171d' : '#f4f5f8';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 900px; overflow: hidden; }
  body { background: rgb(${BACKGROUND.join(',')}); font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    display: grid; grid-template-columns: 1fr 380px; gap: 48px; padding: 64px; box-sizing: border-box; }
  .design { background: ${page}; border-radius: 20px; display: grid; place-items: center; padding: 40px; }
  .design img { max-width: 100%; max-height: 100%; background: #fff; box-shadow: 0 0 0 4px rgb(${FINDER.join(',')}); }
  .panel { border-radius: 20px; overflow: hidden; background: ${dark ? '#121212' : '#fff'}; }
  .panel img { width: 100%; display: block; margin-top: -260px; } /* from the profile to the codes found */
  </style></head><body>
  <div class="design"><img src="${dataUrl(fixture)}" alt=""></div>
  <div class="panel"><img src="${dataUrl(panel)}" alt=""></div>
  </body></html>`;
}

async function main() {
  mkdirSync(out, { recursive: true });
  const stage = mkdtempSync(join(tmpdir(), 'qrscan-canva-listing-'));
  const fixturePath = execFileSync('python3', [join(ROOT, 'scripts', 'destination-acceptance.py'),
    'stage', stage], { encoding: 'utf8' }).trim();
  const fixture = readFileSync(fixturePath);
  const files = { 'icon-512.png': drawIcon(512) };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  for (const [name, dark] of [['featured-1.png', false], ['featured-2.png', true]]) {
    const panel = readFileSync(join(shots, dark ? 'panel-dark.png' : 'panel-light.png'));
    await page.setContent(featuredHtml({ fixture, panel, dark }), { waitUntil: 'load' });
    files[name] = await page.screenshot({ type: 'png' });
  }
  await browser.close();
  const receipt = {};
  for (const [name, bytes] of Object.entries(files)) {
    writeFileSync(join(out, name), bytes);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    receipt[name] = { width, height, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex') };
    console.log(`${name}  ${width} x ${height}  ${bytes.length} bytes`);
  }
  if (receipt['icon-512.png'].width !== 512 || receipt['featured-1.png'].width !== 2400
    || receipt['featured-1.png'].height !== 1800) {
    throw new Error('an image does not have the size Canva asks for');
  }
  writeFileSync(join(out, 'listing-assets.json'), `${JSON.stringify(receipt, null, 2)}\n`);
}

await main();
