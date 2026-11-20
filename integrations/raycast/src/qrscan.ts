// SPDX-License-Identifier: MIT
// qrscan, the QR Code & Barcode Scanner command line, run as a separate program: the extension
// passes it one image path and reads its JSON report. No shell is involved, and the extension
// carries no engine code of its own.
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Profile = "full" | "fast" | "frame";
export const PROFILES: Profile[] = ["full", "fast", "frame"];

/** The image files qrscan reads. */
export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

/** Where Homebrew (Apple silicon, then Intel) and Cargo install qrscan. */
export function defaultLocations(home = homedir()): string[] {
  return ["/opt/homebrew/bin/qrscan", "/usr/local/bin/qrscan", join(home, ".cargo/bin/qrscan")];
}

export const INSTALL_COMMAND = "brew install qrcode-ai-com/tap/qrscan";
export const INSTALL_GUIDE = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust#command-line";

/** qrscan is not at the path of the preferences, nor in the usual places. */
export class QrscanMissingError extends Error {
  constructor(readonly looked: string[]) {
    super(`qrscan was not found in ${looked.join(", ")}`);
    this.name = "QrscanMissingError";
  }
}

/** qrscan could not read the file as an image (its exit status 2). */
export class UnreadableImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnreadableImageError";
  }
}

/** qrscan stopped in a way that gives no report: a crash, a timeout, output that is not a report. */
export class ScanFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanFailedError";
  }
}

export interface Code {
  /** The wire name of the format, such as `qr_code`. */
  symbology: string;
  /** A readable name for the format. */
  label: string;
  /** The decoded text. */
  text: string;
  /** False when some bytes could not be read as text (charset `unknown`). */
  complete: boolean;
}

export interface ScanResult {
  file: string;
  codes: Code[];
  /** True when the profile's time budget stopped the scan: an empty list is then not final. */
  budgetExhausted: boolean;
  profile: Profile;
  /** The scanner version in the report (`versions.scanner`). */
  engine: string;
}

const LABELS: Record<string, string> = {
  qr_code: "QR Code",
  micro_qr_code: "Micro QR Code",
  rectangular_micro_qr_code: "rMQR Code",
  data_matrix: "Data Matrix",
  aztec: "Aztec",
  pdf417: "PDF417",
  maxi_code: "MaxiCode",
  ean13: "EAN-13",
  ean8: "EAN-8",
  upc_a: "UPC-A",
  upc_e: "UPC-E",
  code128: "Code 128",
  code39: "Code 39",
  code93: "Code 93",
  codabar: "Codabar",
  itf: "ITF",
  data_bar: "GS1 DataBar",
  data_bar_expanded: "GS1 DataBar Expanded",
  telepen: "Telepen",
};

/** A readable name for a format, or its wire name when this extension does not know it yet. */
export function formatLabel(symbology: string): string {
  return LABELS[symbology] ?? symbology;
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.includes(extname(path).toLowerCase());
}

/** A path from the clipboard or Finder: a `file:` URL or an absolute path, else null. */
export function localPath(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("file://")) {
    try {
      return fileURLToPath(trimmed);
    } catch {
      return null;
    }
  }
  return isAbsolute(trimmed) ? trimmed : null;
}

async function executable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** The qrscan to run: the path of the preferences when set, else the first usual place that has it. */
export async function findQrscan(
  preferred?: string,
  locations = defaultLocations(),
  isExecutable = executable,
): Promise<string> {
  const chosen = preferred?.trim();
  const looked = chosen ? [chosen.startsWith("~/") ? join(homedir(), chosen.slice(2)) : chosen] : locations;
  for (const path of looked) if (await isExecutable(path)) return path;
  throw new QrscanMissingError(looked);
}

export type Run = (
  file: string,
  args: string[],
  options: { timeout: number; maxBuffer: number; windowsHide: boolean },
  callback: (
    error: (Error & { code?: number | string; killed?: boolean; signal?: string | null }) | null,
    stdout: string,
    stderr: string,
  ) => void,
) => void;

const defaultRun: Run = (file, args, options, callback) => {
  execFile(file, args, { ...options, encoding: "utf8" }, (error, stdout, stderr) =>
    callback(error, String(stdout), String(stderr)),
  );
};

interface Report {
  versions?: { scanner?: string };
  detections?: { symbology?: unknown; content?: { text?: unknown; charset?: unknown } }[];
  trace?: { budget_exhausted?: unknown };
}

function parseReport(stdout: string): Report {
  try {
    const report = JSON.parse(stdout) as Report;
    if (!report || typeof report !== "object" || !Array.isArray(report.detections)) throw new Error("no detections");
    return report;
  } catch {
    throw new ScanFailedError("qrscan did not print a scan report");
  }
}

/** The first line qrscan wrote to stderr, without its mark. */
function reason(stderr: string): string {
  const line = stderr.split(/\r?\n/).find((entry) => entry.trim()) ?? "";
  return line.replace(/^\s*✖\s*/, "").trim() || "qrscan could not read this file";
}

/** Scans FILE with QRSCAN and the PROFILE's own time budget. */
export function scanFile(
  qrscan: string,
  file: string,
  profile: Profile,
  run: Run = defaultRun,
  timeoutMs = 30000,
): Promise<ScanResult> {
  if (!PROFILES.includes(profile)) return Promise.reject(new ScanFailedError(`unknown profile ${String(profile)}`));
  // The path is absolute, so qrscan never reads it as an option.
  const args = [file, "--profile", profile];
  return new Promise((resolve, reject) => {
    run(
      qrscan,
      args,
      { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        const status = error ? error.code : 0;
        if (error && (error.killed || error.signal)) {
          reject(new ScanFailedError(`qrscan stopped after ${Math.round(timeoutMs / 1000)} s without a report`));
          return;
        }
        if (status === "ENOENT" || status === "EACCES") {
          reject(new QrscanMissingError([qrscan]));
          return;
        }
        if (status === 2) {
          reject(new UnreadableImageError(reason(stderr)));
          return;
        }
        if (status !== 0 && status !== 1) {
          reject(new ScanFailedError(`qrscan ended with status ${String(status)}: ${reason(stderr)}`));
          return;
        }
        try {
          const report = parseReport(stdout);
          resolve({
            file,
            codes: (report.detections ?? []).map((detection) => ({
              symbology: String(detection.symbology),
              label: formatLabel(String(detection.symbology)),
              text: typeof detection.content?.text === "string" ? detection.content.text : "",
              complete: detection.content?.charset !== "unknown",
            })),
            budgetExhausted: report.trace?.budget_exhausted === true,
            profile,
            engine: typeof report.versions?.scanner === "string" ? report.versions.scanner : "",
          });
        } catch (failure) {
          reject(failure);
        }
      },
    );
  });
}

export interface ImageSources {
  /** The items selected in Finder; rejects when Finder is not the frontmost application. */
  finder: () => Promise<{ path: string }[]>;
  /** The clipboard: Raycast gives the path of a copied file. */
  clipboard: () => Promise<{ text?: string; file?: string }>;
}

export type Picked =
  { kind: "image"; path: string; name: string; origin: "finder" | "clipboard" } | { kind: "none"; reason: string };

/** The image to scan: the first image selected in Finder, else the image file on the clipboard. */
export async function pickImage(sources: ImageSources): Promise<Picked> {
  let selected: { path: string }[] = [];
  try {
    selected = await sources.finder();
  } catch {
    selected = [];
  }
  const fromFinder = selected
    .map((item) => localPath(item.path))
    .find((path): path is string => !!path && isImagePath(path));
  if (fromFinder) return { kind: "image", path: fromFinder, name: basename(fromFinder), origin: "finder" };
  if (selected.length > 0) {
    return { kind: "none", reason: "The Finder selection holds no PNG, JPEG, WebP or GIF image." };
  }
  let content: { text?: string; file?: string } = {};
  try {
    content = await sources.clipboard();
  } catch {
    content = {};
  }
  const fromClipboard = localPath(content.file);
  if (fromClipboard && isImagePath(fromClipboard)) {
    return { kind: "image", path: fromClipboard, name: basename(fromClipboard), origin: "clipboard" };
  }
  if (fromClipboard)
    return { kind: "none", reason: `${basename(fromClipboard)} is not a PNG, JPEG, WebP or GIF image.` };
  return { kind: "none", reason: "Select an image in Finder, or copy an image file, then run the command again." };
}

/** The decoded texts, one per line, for the "Copy All" action. */
export function allTexts(codes: Code[]): string {
  return codes.map((code) => code.text).join("\n");
}
