// SPDX-License-Identifier: MIT
// The plugin's icons, drawn from code: three QR finder patterns and four barcode bars on a 17 x 17
// module grid. The panel icons (23 x 23 and 46 x 46, one set per Photoshop theme) are drawn in one
// colour on a transparent ground, as Photoshop shows them in its toolbar; the listing icons are in
// the brand colours on an opaque ground.
import { encodePng } from './png.mjs';

export const BRAND = { background: [0x07, 0x0A, 0x16], finder: [0xA9, 0x8B, 0xFF], bars: [0x43, 0xDF, 0xD2] };
// The panel icons: light art for Photoshop's dark themes, dark art for its light themes.
export const PANEL = {
  dark: { finder: [0xE8, 0xE8, 0xE8], bars: [0xE8, 0xE8, 0xE8] },
  light: { finder: [0x4B, 0x4B, 0x4B], bars: [0x4B, 0x4B, 0x4B] },
};

function artAt(mx, my) {
  const finder = (ox, oy) => {
    const x = mx - ox;
    const y = my - oy;
    if (x < 0 || y < 0 || x >= 7 || y >= 7) return false;
    return x < 1 || y < 1 || x >= 6 || y >= 6 || (x >= 2 && y >= 2 && x < 5 && y < 5);
  };
  if (finder(0, 0) || finder(10, 0) || finder(0, 10)) return 'finder';
  if (my >= 10 && my < 17) {
    for (const [from, to] of [[10, 11], [12, 14], [15, 15.8], [16.4, 17]]) {
      if (mx >= from && mx < to) return 'bars';
    }
  }
  return null;
}

/**
 * The icon as PNG bytes, `size` pixels square. `colours` gives finder and bars, and background
 * for an opaque icon; without one the ground is transparent and the edges are alpha.
 */
export function drawIcon(size, colours = BRAND, pad = 0.2) {
  const samples = 8;
  const module = (1 - 2 * pad) / 17;
  const rgba = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const sum = [0, 0, 0];
      let covered = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          const part = artAt((x - pad) / module, (y - pad) / module);
          const colour = part ? colours[part] : colours.background;
          if (!colour) continue;
          covered += 1;
          for (let c = 0; c < 3; c += 1) sum[c] += colour[c];
        }
      }
      const at = (py * size + px) * 4;
      if (covered === 0) continue;
      for (let c = 0; c < 3; c += 1) rgba[at + c] = Math.round(sum[c] / covered);
      rgba[at + 3] = Math.round((255 * covered) / (samples * samples));
    }
  }
  return encodePng(size, size, rgba);
}

/** The panel and plugin icons of the manifest: icons/<theme>.png and icons/<theme>@2x.png. */
export function panelIcons() {
  const files = new Map();
  for (const [theme, colours] of Object.entries(PANEL)) {
    files.set(`icons/${theme}.png`, drawIcon(23, colours, 0.08));
    files.set(`icons/${theme}@2x.png`, drawIcon(46, colours, 0.08));
  }
  return files;
}
