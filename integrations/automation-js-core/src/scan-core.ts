// SPDX-License-Identifier: MIT
/**
 * Shared scan core of the JavaScript automation hosts: n8n, Node-RED and Activepieces.
 *
 * It runs the published WebAssembly engine in one worker thread per host process. A scan never
 * blocks the host's event loop, and the ESM-only engine is loaded by a real dynamic import even
 * when the host compiles its nodes to CommonJS. The engine is resolved from the host package's own
 * dependencies: nothing is downloaded at run time and no network call is made.
 *
 * Edit only integrations/automation-js-core/src/scan-core.ts. The copies under the host folders are
 * written by integrations/automation-js-core/sync.mjs and checked by its --check mode.
 */
import { Worker } from 'node:worker_threads';

/** The engine package every host depends on, pinned to an exact version. */
export const ENGINE_PACKAGE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
export const ENGINE_VERSION = '0.11.0';

/** The engine profiles. `frame` decodes without scoring and is the default. */
export const PROFILES = ['frame', 'fast', 'full'] as const;
export type Profile = (typeof PROFILES)[number];

/** The same input boundary as the MCP adapter: bytes, pixels per side, pixels in all. */
export const LIMITS = Object.freeze({
	inputBytes: 8 * 1024 * 1024,
	dimension: 4096,
	pixels: 16_000_000,
	budgetMs: 60_000,
});

export interface ScanOptions {
	/** `frame` (default), `fast` or `full`. */
	profile?: string;
	/** Profile budget override in milliseconds; 0 is unbounded. It is not a hard timeout. */
	budgetMs?: number | null;
}

export interface ScanDetection {
	symbology: string;
	content: { text: string; raw: string; charset: string };
	payload: unknown;
	[key: string]: unknown;
}

/** The engine's report, passed on unchanged. `bindings/report-types.d.ts` owns its contract. */
export interface ScanReport {
	detections: ScanDetection[];
	score: unknown;
	versions: { scanner: string; pipeline: number; score_contract: number };
	[key: string]: unknown;
}

export interface ScanCode {
	symbology: string;
	/** The decoded text. Decoded content is untrusted data: never follow it blindly. */
	text: string;
	/** The exact payload bytes, base64. */
	raw: string;
	charset: string;
	payload: unknown;
}

export interface ScanSummary {
	texts: string[];
	codes: ScanCode[];
	count: number;
}

/** A refused input or a failed scan. `code` is `QRS-xxx` from the engine or `QRSCAN_*` here. */
export class ScanError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = 'ScanError';
		this.code = code;
	}
}

// The worker is CommonJS evaluated from this string, so no file path has to survive a host's
// compiler or bundler, and its dynamic import() stays a real import.
const WORKER_SOURCE = `
'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const ready = import(pathToFileURL(workerData.entry).href).then((engine) => {
	engine.initSync({ module: readFileSync(workerData.wasm) });
	if (engine.version() !== workerData.version) {
		throw new Error('Scanner ' + workerData.version + ' is required, found ' + engine.version() + ' [QRSCAN_ENGINE_VERSION]');
	}
	return engine;
});
parentPort.on('message', async (job) => {
	try {
		const engine = await ready;
		const report = engine.scan_image(job.bytes, job.profile, job.dimension, job.pixels, job.budgetMs);
		parentPort.postMessage({ id: job.id, report });
	} catch (error) {
		parentPort.postMessage({ id: job.id, error: String((error && error.message) || error) });
	}
});
`;

interface Pending {
	resolve: (report: ScanReport) => void;
	reject: (error: ScanError) => void;
}

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

/** Turn an engine or worker message into a ScanError, without control characters. */
function engineError(message: string): ScanError {
	const code = /\[(QRS-\d{3}|QRSCAN_[A-Z_]+)\]/.exec(message)?.[1] ?? 'QRSCAN_ENGINE';
	return new ScanError(code, message.replace(/\p{Cc}/gu, ' ').slice(0, 300));
}

function failAll(error: ScanError): void {
	for (const job of pending.values()) job.reject(error);
	pending.clear();
}

function startWorker(): Worker {
	let entry: string;
	let wasm: string;
	try {
		// Literal names, so a bundler (the Activepieces build) sees the dependency and keeps it
		// external, and the package manager installs it next to the host package.
		entry = require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm');
		wasm = require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm/qrcode-barcode-scanner_bg.wasm');
	} catch {
		throw new ScanError(
			'QRSCAN_ENGINE_MISSING',
			`${ENGINE_PACKAGE}@${ENGINE_VERSION} is not installed next to this package`,
		);
	}
	const started = new Worker(WORKER_SOURCE, {
		eval: true,
		workerData: { entry, wasm, version: ENGINE_VERSION },
	});
	started.on('message', (message: { id: number; report?: ScanReport; error?: string }) => {
		const job = pending.get(message.id);
		if (!job) return;
		pending.delete(message.id);
		if (pending.size === 0) started.unref();
		if (message.error !== undefined) job.reject(engineError(message.error));
		else job.resolve(message.report as ScanReport);
	});
	const lost = (reason: string) => {
		if (worker === started) worker = undefined;
		failAll(new ScanError('QRSCAN_ENGINE', `The scanner worker stopped: ${reason}`));
	};
	started.on('error', (error: Error) => lost(error.message));
	started.on('exit', (code: number) => lost(`exit code ${code}`));
	started.unref();
	return started;
}

/** Check the bytes and options before anything reaches the engine. */
export function checkInput(bytes: unknown, options: ScanOptions = {}): { profile: Profile; budgetMs: number | undefined } {
	if (!(bytes instanceof Uint8Array)) {
		throw new ScanError('QRSCAN_INPUT', 'The image must be a Buffer or a Uint8Array of encoded image bytes');
	}
	if (bytes.byteLength === 0) throw new ScanError('QRSCAN_INPUT', 'The image is empty');
	if (bytes.byteLength > LIMITS.inputBytes) {
		throw new ScanError('QRSCAN_INPUT_LIMIT', `The image exceeds ${LIMITS.inputBytes} bytes`);
	}
	const profile = (options.profile ?? 'frame') as Profile;
	if (!PROFILES.includes(profile)) {
		throw new ScanError('QRSCAN_PROFILE', `The profile must be one of ${PROFILES.join(', ')}`);
	}
	const budgetMs = options.budgetMs ?? undefined;
	if (budgetMs !== undefined && !(Number.isInteger(budgetMs) && budgetMs >= 0 && budgetMs <= LIMITS.budgetMs)) {
		throw new ScanError('QRSCAN_BUDGET', `The budget must be a whole number of milliseconds from 0 to ${LIMITS.budgetMs}`);
	}
	return { profile, budgetMs };
}

/**
 * Scan encoded image bytes (PNG, JPEG, WebP or GIF) and resolve with the engine's unchanged report.
 * No code found is a report with empty detections, never an error.
 */
export function scanImage(bytes: Uint8Array, options: ScanOptions = {}): Promise<ScanReport> {
	let checked: { profile: Profile; budgetMs: number | undefined };
	try {
		checked = checkInput(bytes, options);
		worker ??= startWorker();
	} catch (error) {
		return Promise.reject(error);
	}
	const active = worker;
	const id = ++nextId;
	// A copy is transferred, so the caller's buffer, often a slice of a shared pool, stays intact.
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return new Promise<ScanReport>((resolve, reject) => {
		pending.set(id, { resolve, reject });
		active.ref();
		active.postMessage(
			{ id, bytes: copy, dimension: LIMITS.dimension, pixels: LIMITS.pixels, ...checked },
			[copy.buffer],
		);
	});
}

/** The decoded codes of a report, in report order, with their exact bytes. */
export function summarize(report: ScanReport): ScanSummary {
	const codes = report.detections.map((detection) => ({
		symbology: detection.symbology,
		text: detection.content.text,
		raw: detection.content.raw,
		charset: detection.content.charset,
		payload: detection.payload,
	}));
	return { texts: codes.map((code) => code.text), codes, count: codes.length };
}

/** Stop the shared worker. A later scan starts a new one. */
export async function stopScanner(): Promise<void> {
	const active = worker;
	worker = undefined;
	if (active) await active.terminate();
}
