// SPDX-License-Identifier: MIT
// The engine: the published browser WASM module, bundled into main.js and started on the first
// scan. It runs on the device; it makes no network request.
import init, { scan_image, version } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
import type { ScanReport } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
import wasm from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm';
import type { Code } from './format';

export type Profile = 'fast' | 'frame' | 'full';
export const PROFILES: Profile[] = ['fast', 'frame', 'full'];

/** The engine could not start in this app. */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

/** The bytes are not an image the engine reads (PNG, JPEG, WebP or GIF). */
export class UnreadableImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnreadableImageError';
  }
}

export interface ScanResult {
  codes: Code[];
  /** True when the profile's time budget stopped the scan: an empty list is then not final. */
  budgetExhausted: boolean;
  profile: Profile;
  engine: string;
}

let starting: Promise<void> | null = null;

/** Starts the engine once; a failed start can be tried again. */
export async function startEngine(): Promise<void> {
  starting ??= init({ module_or_path: wasm }).then(() => undefined);
  try {
    await starting;
  } catch (error) {
    starting = null;
    throw new EngineError(error instanceof Error ? error.message : String(error));
  }
}

function message(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'the engine refused the image';
}

/** The codes of one report, in the engine's order. */
export function codesOf(report: ScanReport): Code[] {
  return (report.detections ?? []).map((detection) => ({
    symbology: String(detection.symbology),
    text: typeof detection.content?.text === 'string' ? detection.content.text : '',
    complete: detection.content?.charset !== 'unknown',
  }));
}

/** Scans encoded image bytes. BUDGET_MS null keeps the profile's own time budget; 0 removes it. */
export async function scanBytes(bytes: ArrayBuffer | Uint8Array, profile: Profile, budgetMs: number | null = null): Promise<ScanResult> {
  await startEngine();
  let report: ScanReport;
  try {
    report = scan_image(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), profile, null, null, budgetMs);
  } catch (error) {
    throw new UnreadableImageError(message(error));
  }
  return { codes: codesOf(report), budgetExhausted: report.trace?.budget_exhausted === true, profile, engine: version() };
}
