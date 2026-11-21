// SPDX-License-Identifier: MIT
// Reading the pixels of the active document through Photoshop's Imaging API: the composite image
// (every visible layer, as Photoshop draws it) of the whole canvas or of the selection's bounding
// rectangle, as 8-bit sRGB with transparency matted on white. The engine takes RGBA, so RGB rows
// gain an opaque alpha. A document larger than MAX_PIXELS is asked for at a smaller size, which
// Photoshop scales, so the plugin never holds more than about 64 MB of pixels.

// 4096 x 4096 pixels.
export const MAX_PIXELS = 16_777_216;
export const SRGB = 'sRGB IEC61966-2.1';
export const COMMAND_NAME = 'Read QR codes and barcodes';

export class ReadError extends Error {
  constructor(kind, detail = '') {
    super(detail ? `${kind}: ${detail}` : kind);
    this.name = 'ReadError';
    this.kind = kind;
    this.detail = detail;
  }
}

/** The size to ask Photoshop for, or null when the area fits in MAX_PIXELS as it is. */
export function targetSize(width, height, maxPixels = MAX_PIXELS) {
  if (width * height <= maxPixels) return null;
  const scale = Math.sqrt(maxPixels / (width * height));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

/** RGBA pixels from chunky 8-bit data of 1 (grey), 3 (RGB) or 4 (RGBA) components. */
export function toRgba(data, width, height, components) {
  const count = width * height;
  if (data.length !== count * components) {
    throw new ReadError('pixels', `${data.length} bytes for ${width} x ${height} x ${components}`);
  }
  if (components === 4) return data;
  if (components !== 3 && components !== 1) throw new ReadError('pixels', `${components} components per pixel`);
  const rgba = new Uint8Array(count * 4);
  for (let index = 0, from = 0, to = 0; index < count; index += 1, from += components, to += 4) {
    rgba[to] = data[from];
    rgba[to + 1] = data[components === 3 ? from + 1 : from];
    rgba[to + 2] = data[components === 3 ? from + 2 : from];
    rgba[to + 3] = 255;
  }
  return rgba;
}

/** The selection's bounding rectangle inside the canvas, or null when nothing is selected. */
export function selectionBounds(document) {
  const bounds = document.selection?.bounds;
  if (!bounds) return null;
  const left = Math.max(0, Math.floor(bounds.left));
  const top = Math.max(0, Math.floor(bounds.top));
  const right = Math.min(document.width, Math.ceil(bounds.right));
  const bottom = Math.min(document.height, Math.ceil(bounds.bottom));
  return right > left && bottom > top ? { left, top, right, bottom } : null;
}

/**
 * The pixels of the active document, `area` 'document' or 'selection'. Photoshop's API is passed
 * in (`require('photoshop')` in the plugin, a stand-in in the tests).
 */
export async function readPixels(photoshop, area) {
  const { app, core, imaging } = photoshop;
  const document = app.activeDocument;
  if (!document) throw new ReadError('no-document');
  let bounds = { left: 0, top: 0, right: document.width, bottom: document.height };
  if (area === 'selection') {
    bounds = selectionBounds(document);
    if (!bounds) throw new ReadError('no-selection');
  }
  const size = targetSize(bounds.right - bounds.left, bounds.bottom - bounds.top);
  let pixels = null;
  await core.executeAsModal(async () => {
    const options = { documentID: document.id, sourceBounds: bounds, colorSpace: 'RGB', colorProfile: SRGB,
      componentSize: 8, applyAlpha: true };
    if (size) options.targetSize = size;
    const { imageData } = await imaging.getPixels(options);
    try {
      const data = await imageData.getData({ chunky: true });
      pixels = { width: imageData.width, height: imageData.height,
        rgba: toRgba(data, imageData.width, imageData.height, imageData.components) };
    } finally {
      imageData.dispose();
    }
  }, { commandName: COMMAND_NAME });
  return { ...pixels, area, bounds, scaled: size !== null, title: document.title };
}
