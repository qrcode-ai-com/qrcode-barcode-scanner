// SPDX-License-Identifier: MIT
// Scan Image: download the image Zapier hands over (a file from an earlier step arrives as a URL),
// then read every QR code and barcode in it with the engine, inside this step.
'use strict';
const { ENGINE_VERSION, LIMITS, PROFILES, ScanError, scanImage, summarize } = require('../lib/scan-core');

// Zapier stops an action after about 30 seconds: the download and the scan share that time.
const DOWNLOAD_TIMEOUT_MS = 15_000;
const MAX_BUDGET_MS = 25_000;

const PROFILE_CHOICES = [
  { value: 'frame', label: 'Frame: decode without scoring', sample: 'frame' },
  { value: 'fast', label: 'Fast: decode and score with a short budget', sample: 'fast' },
  { value: 'full', label: 'Full: decode and score QR scannability', sample: 'full' },
];

/** One line of text, without control characters, short enough for the Zap history. */
const clean = (text) => String(text).replace(/\p{Cc}/gu, ' ').slice(0, 300);

/** The http(s) URL of the image, or a refusal the user can act on. */
function imageUrl(z, value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text === '') {
    throw new z.errors.Error('Choose an image file from an earlier step, or enter the URL of an image.', 'ImageMissing', 400);
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new z.errors.Error('The image must be a file from an earlier step or an http or https URL.', 'ImageUrl', 400);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new z.errors.Error('The image must be a file from an earlier step or an http or https URL.', 'ImageUrl', 400);
  }
  return url.href;
}

const tooLarge = (z) => new z.errors.Error(`The image is larger than ${LIMITS.inputBytes} bytes (8 MiB).`, 'ImageTooLarge', 413);

/** The body, read until it ends or passes the input limit, whichever comes first. */
async function readCapped(z, body) {
  const chunks = [];
  let total = 0;
  for await (const chunk of body) {
    total += chunk.length;
    if (total > LIMITS.inputBytes) {
      body.destroy();
      throw tooLarge(z);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}

/** The image bytes behind the URL, never more than the input limit. */
async function download(z, url) {
  let response;
  try {
    response = await z.request({
      url,
      method: 'GET',
      raw: true,
      skipThrowForStatus: true,
      timeout: DOWNLOAD_TIMEOUT_MS,
      headers: { accept: 'image/png, image/jpeg, image/webp, image/gif, */*;q=0.5' },
    });
  } catch (error) {
    throw new z.errors.Error(`The image could not be downloaded: ${clean(error.message)}`, 'ImageDownload', 400);
  }
  if (response.status < 200 || response.status > 299) {
    throw new z.errors.Error(`The image URL answered HTTP ${response.status}.`, 'ImageDownload', response.status);
  }
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > LIMITS.inputBytes) throw tooLarge(z);
  try {
    return await readCapped(z, response.body);
  } catch (error) {
    if (error instanceof z.errors.Error) throw error;
    throw new z.errors.Error(`The image could not be downloaded: ${clean(error.message)}`, 'ImageDownload', 400);
  }
}

/** The budget field: empty keeps the profile's own budget. */
function budget(z, value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > MAX_BUDGET_MS) {
    throw new z.errors.Error(`The budget must be a whole number of milliseconds from 0 to ${MAX_BUDGET_MS}.`, 'InvalidBudget', 400);
  }
  return number;
}

/** A refused image or a failed scan, as an error Zapier shows in the Zap history. */
function scanFailure(z, error) {
  if (!(error instanceof ScanError)) throw error;
  const message = clean(error.message.includes(`[${error.code}]`) ? error.message : `${error.message} [${error.code}]`);
  if (error.code === 'QRSCAN_INPUT_LIMIT') throw new z.errors.Error(message, 'ImageTooLarge', 413);
  if (error.code === 'QRSCAN_INPUT') throw new z.errors.Error(message, 'InvalidImage', 400);
  if (error.code === 'QRSCAN_PROFILE' || error.code === 'QRSCAN_BUDGET') throw new z.errors.Error(message, 'InvalidOption', 400);
  // QRS-xxx: the engine refused the image (not an image, an unsupported format, too many pixels).
  if (error.code.startsWith('QRS-')) throw new z.errors.Error(message, error.code, 422);
  throw new Error(message);
}

async function perform(z, bundle) {
  // cleanInputData is off, so an untouched optional field can arrive as an empty string.
  const { image, budget_ms: budgetField } = bundle.inputData;
  const profile = bundle.inputData.profile || 'frame';
  if (!PROFILES.includes(profile)) {
    throw new z.errors.Error(`The profile must be one of ${PROFILES.join(', ')}.`, 'InvalidOption', 400);
  }
  const budgetMs = budget(z, budgetField);
  const bytes = await download(z, imageUrl(z, image));
  let report;
  try {
    report = await scanImage(bytes, { profile, budgetMs });
  } catch (error) {
    scanFailure(z, error);
  }
  const { texts, codes, count } = summarize(report);
  return {
    count,
    text: texts[0] ?? '',
    texts,
    codes,
    budget_exhausted: report.trace?.budget_exhausted === true,
    profile,
    scanner_version: report.versions?.scanner ?? ENGINE_VERSION,
    report_json: JSON.stringify(report),
  };
}

module.exports = {
  key: 'scan_image',
  noun: 'Image',
  display: {
    label: 'Scan Image',
    description: 'Reads every QR code and barcode in an image file and returns the decoded text, inside the Zap step.',
  },
  operation: {
    cleanInputData: false,
    inputFields: [
      {
        key: 'image',
        label: 'Image',
        type: 'file',
        required: true,
        helpText: 'A PNG, JPEG, WebP or GIF file from an earlier step, or the URL of one. At most 8 MiB and 4096 pixels per side.',
      },
      {
        key: 'profile',
        label: 'Profile',
        type: 'string',
        required: false,
        default: 'frame',
        choices: PROFILE_CHOICES,
        helpText: 'Frame decodes without scoring. Fast and Full also score how well a QR code scans.',
      },
      {
        key: 'budget_ms',
        label: 'Budget (ms)',
        type: 'integer',
        required: false,
        helpText: `Overrides the profile's time budget, from 0 to ${MAX_BUDGET_MS}. 0 removes the budget. Zapier stops a step after about 30 seconds.`,
      },
    ],
    perform,
    sample: {
      count: 2,
      text: 'https://example.com/',
      texts: ['https://example.com/', 'STOCK-0001'],
      codes: [
        { symbology: 'qr_code', text: 'https://example.com/', raw: 'aHR0cHM6Ly9leGFtcGxlLmNvbS8=', charset: 'utf8', payload: { kind: 'url', url: 'https://example.com/' } },
        { symbology: 'code128', text: 'STOCK-0001', raw: 'U1RPQ0stMDAwMQ==', charset: 'utf8', payload: { kind: 'text' } },
      ],
      budget_exhausted: false,
      profile: 'frame',
      scanner_version: ENGINE_VERSION,
      report_json: '{"detections":[],"score":null,"hints":[],"trace":{},"versions":{}}',
    },
    outputFields: [
      { key: 'count', label: 'Number of codes', type: 'integer' },
      { key: 'text', label: 'First decoded text', type: 'string' },
      { key: 'texts[]', label: 'Decoded texts', type: 'string' },
      { key: 'codes[]symbology', label: 'Code symbology', type: 'string' },
      { key: 'codes[]text', label: 'Code text', type: 'string' },
      { key: 'codes[]raw', label: 'Code bytes (base64)', type: 'string' },
      { key: 'codes[]charset', label: 'Code charset', type: 'string' },
      { key: 'codes[]payload__kind', label: 'Code payload kind', type: 'string' },
      { key: 'budget_exhausted', label: 'Budget exhausted', type: 'boolean' },
      { key: 'profile', label: 'Profile', type: 'string' },
      { key: 'scanner_version', label: 'Scanner version', type: 'string' },
      { key: 'report_json', label: 'Engine report (JSON)', type: 'string' },
    ],
  },
};
