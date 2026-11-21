// SPDX-License-Identifier: MIT
// The shared core on the published engine: the acceptance fixture in the three profiles, the
// refusals, the worker that keeps the event loop free, and a process that still exits when idle.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';

const require = createRequire(import.meta.url);
const corePath = new URL('../dist/scan-core.cjs', import.meta.url).pathname;
const core = require(corePath);
const fixture = readFileSync(new URL('../../../fixtures/symbology/mixed-code128-qr.png', import.meta.url));
const white = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PMQ0AMAzAsPInvYLYYVWKESTzjhsd8KsBrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BbQHKU9LC7/CP1AAAAABJRU5ErkJggg==', 'base64');
const EXPECTED = [['qr_code', 'https://qrc-ai.com/76xMa'], ['code128', 'STOCK-4827']];

after(() => core.stopScanner());

for (const profile of ['fast', 'frame', 'full']) {
	test(`the mixed fixture returns both codes in ${profile}`, async () => {
		const report = await core.scanImage(fixture, { profile, budgetMs: 0 });
		assert.deepEqual(report.versions, { scanner: '0.11.0', pipeline: 5, score_contract: 5 });
		assert.deepEqual(report.detections.map((d) => [d.symbology, d.content.text]), EXPECTED);
		assert.equal(report.trace.budget_exhausted, false);
		const summary = core.summarize(report);
		assert.deepEqual(summary.texts, EXPECTED.map(([, text]) => text));
		assert.equal(summary.count, 2);
		assert.equal(Buffer.from(summary.codes[1].raw, 'base64').toString('utf8'), 'STOCK-4827');
		if (profile === 'frame') assert.equal(report.score, null);
		else assert.equal(typeof report.score.value, 'number');
	});
}

test('the default profile is frame', async () => {
	const report = await core.scanImage(fixture);
	assert.equal(report.score, null);
	assert.deepEqual(core.summarize(report).texts, EXPECTED.map(([, text]) => text));
});

test('an image without a code is an empty report, not an error', async () => {
	const report = await core.scanImage(white, { profile: 'full' });
	assert.deepEqual(report.detections, []);
	assert.deepEqual(core.summarize(report), { texts: [], codes: [], count: 0 });
});

test('a corrupt image is refused with the engine code', async () => {
	await assert.rejects(core.scanImage(Buffer.from('garbage')), (error) => {
		assert.equal(error.name, 'ScanError');
		assert.equal(error.code, 'QRS-001');
		assert.match(error.message, /\[QRS-001\]/);
		return true;
	});
});

test('inputs outside the boundary never reach the engine', async () => {
	const refused = async (bytes, options, code) => {
		await assert.rejects(core.scanImage(bytes, options), (error) => error.code === code);
		assert.throws(() => core.checkInput(bytes, options), (error) => error.code === code);
	};
	await refused('image.png', {}, 'QRSCAN_INPUT');
	await refused(Buffer.alloc(0), {}, 'QRSCAN_INPUT');
	await refused(Buffer.alloc(core.LIMITS.inputBytes + 1), {}, 'QRSCAN_INPUT_LIMIT');
	await refused(fixture, { profile: 'slow' }, 'QRSCAN_PROFILE');
	for (const budgetMs of [-1, 1.5, 60_001, Number.NaN]) await refused(fixture, { budgetMs }, 'QRSCAN_BUDGET');
	assert.deepEqual(core.checkInput(fixture, { budgetMs: null }), { profile: 'frame', budgetMs: undefined });
});

test('a scan runs off the event loop and leaves the caller buffer intact', async () => {
	const before = Buffer.from(fixture);
	let ticks = 0;
	const timer = setInterval(() => { ticks += 1; }, 5);
	const reports = await Promise.all(['full', 'frame', 'fast'].map((profile) => core.scanImage(fixture, { profile })));
	clearInterval(timer);
	assert.ok(ticks >= 10, `the event loop ran ${ticks} times during three scans`);
	for (const report of reports) assert.deepEqual(core.summarize(report).texts, EXPECTED.map(([, text]) => text));
	assert.deepEqual(fixture, before);
});

test('a stopped worker is replaced by the next scan', async () => {
	await core.stopScanner();
	const report = await core.scanImage(fixture, { profile: 'fast' });
	assert.equal(report.detections.length, 2);
});

test('an idle worker does not keep the process alive', () => {
	// The exit is what is judged: no budget, so a cold, slow runner still finds both codes.
	const script = `const core = require(${JSON.stringify(corePath)});
		core.scanImage(require('node:fs').readFileSync(process.argv[1]), { budgetMs: 0 }).then((r) => console.log(r.detections.length));`;
	const fixturePath = new URL('../../../fixtures/symbology/mixed-code128-qr.png', import.meta.url).pathname;
	const output = execFileSync(process.execPath, ['-e', script, fixturePath], { encoding: 'utf8', timeout: 30_000 });
	assert.equal(output.trim(), '2');
});

test('the engine is pinned in one place and resolved by literal names', () => {
	const source = readFileSync(new URL('../src/scan-core.ts', import.meta.url), 'utf8');
	const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	assert.equal(manifest.devDependencies[core.ENGINE_PACKAGE], core.ENGINE_VERSION);
	for (const host of ['n8n', 'node-red', 'activepieces', 'zapier']) {
		const hostManifest = JSON.parse(readFileSync(new URL(`../../${host}/package.json`, import.meta.url), 'utf8'));
		assert.equal(hostManifest.dependencies[core.ENGINE_PACKAGE], core.ENGINE_VERSION, `${host} pins the engine`);
	}
	// A bundler only keeps a dependency it can see: both names are string literals.
	const resolved = [...source.matchAll(/require\.resolve\('([^']+)'\)/g)].map((match) => match[1]);
	assert.deepEqual(resolved, [core.ENGINE_PACKAGE, `${core.ENGINE_PACKAGE}/qrcode-barcode-scanner_bg.wasm`]);
});
