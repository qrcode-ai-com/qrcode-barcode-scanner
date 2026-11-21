// SPDX-License-Identifier: MIT
// The three web APIs the engine's JavaScript glue uses and Photoshop's UXP does not document:
// TextDecoder and TextEncoder (UTF-8 only, the one encoding the glue asks for) and
// performance.now(). Each one is installed on the global object only when the host lacks it, so
// a host that has them keeps its own. Adobe's WebAssembly sample for UXP supplies the first two
// the same way, from the text-encoding package.
//
// This module must be imported before the engine: the glue creates its decoder when it loads.

const REPLACEMENT = 0xFFFD;

function bytesOf(input) {
  if (input === undefined) return new Uint8Array(0);
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError('TextDecoder.decode takes an ArrayBuffer or a view of one');
}

/** A UTF-8 TextDecoder, with the `fatal` and `ignoreBOM` options of the standard one. */
export class Utf8Decoder {
  constructor(label = 'utf-8', options = {}) {
    const name = String(label).trim().toLowerCase();
    if (!['utf-8', 'utf8', 'unicode-1-1-utf-8'].includes(name)) {
      throw new RangeError(`this TextDecoder reads UTF-8 only, not ${label}`);
    }
    this.encoding = 'utf-8';
    this.fatal = Boolean(options.fatal);
    this.ignoreBOM = Boolean(options.ignoreBOM);
  }

  decode(input, options = {}) {
    if (options.stream) throw new TypeError('this TextDecoder does not stream');
    const bytes = bytesOf(input);
    const units = [];
    let text = '';
    let at = 0;
    if (!this.ignoreBOM && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) at = 3;
    const bad = () => {
      if (this.fatal) throw new TypeError('The encoded data was not valid UTF-8');
      units.push(REPLACEMENT);
    };
    while (at < bytes.length) {
      const first = bytes[at];
      let point = -1;
      let length = 1;
      if (first < 0x80) {
        point = first;
      } else if (first >= 0xC2 && first <= 0xF4) {
        length = first < 0xE0 ? 2 : first < 0xF0 ? 3 : 4;
        // The allowed range of the second byte excludes overlong forms, surrogates and points
        // above U+10FFFF (WHATWG Encoding, UTF-8 decoder).
        const low = first === 0xE0 ? 0xA0 : first === 0xF0 ? 0x90 : 0x80;
        const high = first === 0xED ? 0x9F : first === 0xF4 ? 0x8F : 0xBF;
        point = first & (length === 2 ? 0x1F : length === 3 ? 0x0F : 0x07);
        for (let index = 1; index < length; index += 1) {
          const next = bytes[at + index];
          const [min, max] = index === 1 ? [low, high] : [0x80, 0xBF];
          if (next === undefined || next < min || next > max) {
            point = -1;
            length = index;
            break;
          }
          point = (point << 6) | (next & 0x3F);
        }
      }
      at += length;
      if (point < 0) bad();
      else if (point > 0xFFFF) units.push(0xD800 + ((point - 0x10000) >> 10), 0xDC00 + ((point - 0x10000) & 0x3FF));
      else units.push(point);
      if (units.length >= 8192) {
        text += String.fromCharCode(...units);
        units.length = 0;
      }
    }
    return text + String.fromCharCode(...units);
  }
}

function utf8Points(text) {
  const points = [];
  const value = String(text);
  for (let index = 0; index < value.length; index += 1) {
    let point = value.charCodeAt(index);
    if (point >= 0xD800 && point <= 0xDBFF && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xDC00 && next <= 0xDFFF) {
        point = 0x10000 + ((point - 0xD800) << 10) + (next - 0xDC00);
        index += 1;
      }
    }
    if (point >= 0xD800 && point <= 0xDFFF) point = REPLACEMENT;
    points.push([point, point > 0xFFFF ? 2 : 1]);
  }
  return points;
}

function encodePoint(point, out, at) {
  if (point < 0x80) {
    out[at] = point;
    return 1;
  }
  if (point < 0x800) {
    out[at] = 0xC0 | (point >> 6);
    out[at + 1] = 0x80 | (point & 0x3F);
    return 2;
  }
  if (point < 0x10000) {
    out[at] = 0xE0 | (point >> 12);
    out[at + 1] = 0x80 | ((point >> 6) & 0x3F);
    out[at + 2] = 0x80 | (point & 0x3F);
    return 3;
  }
  out[at] = 0xF0 | (point >> 18);
  out[at + 1] = 0x80 | ((point >> 12) & 0x3F);
  out[at + 2] = 0x80 | ((point >> 6) & 0x3F);
  out[at + 3] = 0x80 | (point & 0x3F);
  return 4;
}

const encodedLength = (point) => (point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4);

/** A UTF-8 TextEncoder with `encode` and `encodeInto`; a lone surrogate becomes U+FFFD. */
export class Utf8Encoder {
  get encoding() {
    return 'utf-8';
  }

  encode(text = '') {
    const points = utf8Points(text);
    const out = new Uint8Array(points.reduce((sum, [point]) => sum + encodedLength(point), 0));
    let at = 0;
    for (const [point] of points) at += encodePoint(point, out, at);
    return out;
  }

  encodeInto(text, view) {
    let read = 0;
    let written = 0;
    for (const [point, units] of utf8Points(text)) {
      if (written + encodedLength(point) > view.length) break;
      written += encodePoint(point, view, written);
      read += units;
    }
    return { read, written };
  }
}

// What the engine's glue does with them when it loads: a decoder with both options, decoding
// nothing, and an encoder. A host whose own class cannot do that is treated as lacking it.
function decoderWorks(Decoder) {
  try {
    const decoder = new Decoder('utf-8', { ignoreBOM: true, fatal: true });
    return decoder.decode(new Uint8Array([0x6f, 0x6b])) === 'ok';
  } catch {
    return false;
  }
}

function encoderWorks(Encoder) {
  try {
    const bytes = new Encoder().encode('ok');
    return bytes.length === 2 && bytes[0] === 0x6f;
  } catch {
    return false;
  }
}

function define(scope, name, value) {
  try {
    scope[name] = value;
  } catch {
    // An accessor without a setter: replace the property itself.
  }
  if (scope[name] !== value) Object.defineProperty(scope, name, { value, configurable: true, writable: true });
}

/** Install what the host lacks or cannot do; returns the names installed. */
export function installPolyfills(scope = globalThis) {
  const installed = [];
  if (typeof scope.TextDecoder !== 'function' || !decoderWorks(scope.TextDecoder)) {
    define(scope, 'TextDecoder', Utf8Decoder);
    installed.push('TextDecoder');
  }
  if (typeof scope.TextEncoder !== 'function' || !encoderWorks(scope.TextEncoder)) {
    define(scope, 'TextEncoder', Utf8Encoder);
    installed.push('TextEncoder');
  }
  if (typeof scope.performance?.now !== 'function') {
    const origin = Date.now();
    define(scope, 'performance', { timeOrigin: origin, now: () => Date.now() - origin });
    installed.push('performance');
  }
  return installed;
}

export const INSTALLED = installPolyfills();
