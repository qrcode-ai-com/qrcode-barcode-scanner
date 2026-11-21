// The images of the package's listing in the Joomla Extensions Directory.
//
//   node scripts/listing-assets.mjs [--screenshots DIR] [--check]
//
// Writes listing-assets/icon-256x256.png, drawn from code: three QR finder patterns and four
// barcode bars on a dark rounded square, the icon of the browser extension, so the same PNG bytes
// come out on every machine. --screenshots copies module-visitor.png and module-settings.png from
// DIR, the folder `node test/joomla.mjs --screenshots DIR` writes on a real site. --check writes
// nothing and fails when the committed icon is not the drawn one.
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from './bytes.mjs';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ASSETS = join(HERE, 'listing-assets');
export const ICON_SIZES = [256];
export const SCREENSHOTS = ['module-visitor.png', 'module-settings.png'];

const BACKGROUND = [0x07, 0x0A, 0x16];
const FINDER = [0xA9, 0x8B, 0xFF];
const BARS = [0x43, 0xDF, 0xD2];

// The art in module units on a 17 x 17 grid: finders of 7 modules, a gap of 3.
function colourAt(mx, my) {
  const finder = (ox, oy) => {
    const x = mx - ox;
    const y = my - oy;
    if (x < 0 || y < 0 || x >= 7 || y >= 7) return false;
    const ring = x < 1 || y < 1 || x >= 6 || y >= 6;
    const eye = x >= 2 && y >= 2 && x < 5 && y < 5;
    return ring || eye;
  };
  if (finder(0, 0) || finder(10, 0) || finder(0, 10)) return FINDER;
  if (my >= 10 && my < 17) {
    for (const [from, to] of [[10, 11], [12, 14], [15, 15.8], [16.4, 17]]) {
      if (mx >= from && mx < to) return BARS;
    }
  }
  return null;
}

function insideRoundedSquare(x, y, radius) {
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

/** The icon at `size` pixels as PNG bytes, antialiased by 8 x 8 supersampling. */
export function drawIcon(size) {
  const samples = 8;
  const pad = 0.17;
  const module = (1 - 2 * pad) / 17;
  const rgba = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let covered = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          if (!insideRoundedSquare(x, y, 0.22)) continue;
          const colour = colourAt((x - pad) / module, (y - pad) / module) ?? BACKGROUND;
          r += colour[0];
          g += colour[1];
          b += colour[2];
          covered += 1;
        }
      }
      const at = (py * size + px) * 4;
      if (covered > 0) {
        rgba[at] = Math.round(r / covered);
        rgba[at + 1] = Math.round(g / covered);
        rgba[at + 2] = Math.round(b / covered);
      }
      rgba[at + 3] = Math.round((covered / (samples * samples)) * 255);
    }
  }
  return encodePng(size, size, rgba);
}

/** The icon files of the listing, by name. */
export function icons() {
  return new Map(ICON_SIZES.map((size) => [`icon-${size}x${size}.png`, drawIcon(size)]));
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const differ = [];
  if (!check) mkdirSync(ASSETS, { recursive: true });
  for (const [name, bytes] of icons()) {
    const path = join(ASSETS, name);
    if (check) {
      if (!existsSync(path) || !readFileSync(path).equals(bytes)) differ.push(name);
    } else {
      writeFileSync(path, bytes);
    }
  }
  const shots = argument('--screenshots');
  if (shots && !check) {
    for (const name of SCREENSHOTS) copyFileSync(join(resolve(shots), name), join(ASSETS, name));
  }
  if (differ.length > 0) {
    console.error(`listing-assets: not the drawn icon: ${differ.join(', ')}; run node scripts/listing-assets.mjs`);
    process.exit(1);
  }
  console.log(check ? 'listing-assets: the committed icons are the drawn ones'
    : `listing-assets: wrote ${[...icons().keys(), ...(shots ? SCREENSHOTS : [])].join(', ')}`);
}
