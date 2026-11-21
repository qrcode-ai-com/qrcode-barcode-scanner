// The extension icon, drawn from code: three QR finder patterns and four barcode bars on a dark
// rounded square, in the colours of the scanner README pictures. Drawing it here keeps the source
// package free of binary art and gives the same PNG bytes on every machine.
import { encodePng } from './bytes.mjs';

const BACKGROUND = [0x07, 0x0A, 0x16];
const FINDER = [0xA9, 0x8B, 0xFF];
const BARS = [0x43, 0xDF, 0xD2];

export const ICON_SIZES = [16, 32, 48, 96, 128];

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

/**
 * The icon at `size` pixels as PNG bytes, antialiased by 8 x 8 supersampling. With `margin`, the
 * art fills the square of `size - 2 * margin` pixels in the middle and the margin stays
 * transparent: the Chrome Web Store asks for a 128 px store icon with 96 px of art.
 */
export function drawIcon(size, margin = 0) {
  const samples = 8;
  const pad = 0.17;
  const module = (1 - 2 * pad) / 17;
  const art = size - 2 * margin;
  const rgba = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let covered = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px - margin + (sx + 0.5) / samples) / art;
          const y = (py - margin + (sy + 0.5) / samples) / art;
          if (x < 0 || y < 0 || x > 1 || y > 1 || !insideRoundedSquare(x, y, 0.22)) continue;
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
