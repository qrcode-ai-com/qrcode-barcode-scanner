// What the panel says about one report. No DOM and no import: the unit tests run this file as is.

export type ResultState = 'result' | 'empty' | 'inconclusive';

export interface Detection {
  symbology?: unknown;
  content?: { text?: unknown } | null;
  payload?: { kind?: unknown } | null;
  occurrences?: unknown[] | null;
}

export interface Report {
  detections?: Detection[] | null;
  score?: { value?: unknown; grade?: unknown } | null;
  trace?: {
    budget_exhausted?: unknown;
    saturation?: { reads?: unknown; detections?: unknown; occurrences?: unknown } | null;
  } | null;
}

export interface Summary {
  state: ResultState;
  text: string;
  score: string | null;
  rows: { symbology: string; text: string; kind: string }[];
}

/** The list is complete when nothing cut the scan: an absent flag is unknown, never false. */
export function isComplete(report: Report): boolean {
  const trace = report.trace ?? {};
  const saturation = trace.saturation ?? {};
  return trace.budget_exhausted === false && saturation.reads === false
    && saturation.detections === false;
}

/** The state, the sentence, the score line and one row per code, for the image NAME. */
export function summarize(report: Report, name: string, profile: string): Summary {
  const detections = Array.isArray(report.detections) ? report.detections : [];
  const complete = isComplete(report);
  const rows = detections.map((row) => ({
    symbology: String(row.symbology ?? 'unknown'),
    text: String(row.content?.text ?? ''),
    kind: row.payload ? String(row.payload.kind ?? 'text') : 'text',
  }));
  if (rows.length === 0) {
    return complete
      ? { state: 'empty', score: null, rows, text: `No code found in ${name} with the ${profile} `
        + 'profile. The scan finished: an image without a readable code is a valid result.' }
      : { state: 'inconclusive', score: null, rows, text: `No code listed for ${name} with the `
        + `${profile} profile, and that does not prove the image holds none: the scan reached a `
        + 'limit.' };
  }
  const count = rows.length === 1 ? '1 code' : `${rows.length} codes`;
  const more = complete ? '' : ' More codes may be present than listed.';
  // The score judges the first code, and the frame profile computes none. null is not zero.
  const score = report.score
    ? `Scannability of the first code: ${String(report.score.value)} out of 100 (${String(report.score.grade)}).`
    : null;
  return { state: 'result', score, rows, text: `${count} found in ${name} with the ${profile} profile.${more}` };
}

/** The QRS code at the end of an engine error message, or null. */
export function qrsCode(message: string): string | null {
  const found = /\[(QRS-\d{3})\]/.exec(message);
  return found ? found[1] : null;
}

/** Base64 text (the Jupyter contents API's format for a binary file) as bytes. */
export function base64Bytes(text: string): Uint8Array {
  const binary = atob(text.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** Whether a file name has an image extension the engine reads. */
export function isImageName(name: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(name);
}
