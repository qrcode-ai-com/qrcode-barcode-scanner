// SPDX-License-Identifier: MIT
// The built node (dist/) driven through the IExecuteFunctions surface n8n gives a programmatic node:
// the acceptance fixture in the three profiles, both output modes, empty and corrupt images,
// continue-on-fail, and the workflow template's use of the node's parameters.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';

const require = createRequire(import.meta.url);
const { NodeOperationError, executeFilter } = require('n8n-workflow');
const { QrcodeBarcodeScanner } = require('../dist/nodes/QrcodeBarcodeScanner/QrcodeBarcodeScanner.node.js');
const scanCore = require('../dist/nodes/QrcodeBarcodeScanner/scanCore.js');
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const fixture = readFileSync(new URL('../../../fixtures/symbology/mixed-code128-qr.png', import.meta.url));
const white = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PMQ0AMAzAsPInvYLYYVWKESTzjhsd8KsBrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BbQHKU9LC7/CP1AAAAABJRU5ErkJggg==', 'base64');
const EXPECTED = ['https://qrc-ai.com/76xMa', 'STOCK-4827'];

after(() => scanCore.stopScanner());

const binary = (bytes, fileName = 'label.png') => ({ data: { data: bytes.toString('base64'), mimeType: 'image/png', fileName } });

/** The subset of IExecuteFunctions the node calls, with n8n's own error for a missing binary field. */
function context(items, parameters, { continueOnFail = false } = {}) {
	const node = { id: 'scan', name: 'QR Code & Barcode Scanner', type: `${manifest.name}.qrcodeBarcodeScanner`, typeVersion: 1, position: [0, 0], parameters };
	const defaults = { binaryPropertyName: 'data', profile: 'frame', output: 'image', options: {} };
	return {
		getInputData: () => items,
		getNode: () => node,
		continueOnFail: () => continueOnFail,
		getNodeParameter: (name, index, fallback) => {
			assert.ok(Number.isInteger(index) && index >= 0 && index < items.length, `parameter ${name} read for item ${index}`);
			const value = typeof parameters === 'function' ? parameters(index)[name] : parameters[name];
			return value ?? defaults[name] ?? fallback;
		},
		helpers: {
			assertBinaryData: (index, field) => {
				const data = items[index].binary?.[field];
				if (!data) throw new NodeOperationError(node, `This operation expects the node's input data to contain a binary file '${field}', but none was found [item ${index}]`);
				return data;
			},
			// Default binary mode keeps base64 in the item; the filesystem mode keeps an id. The node only uses this helper.
			getBinaryDataBuffer: async (index, field) => Buffer.from(items[index].binary[field].data, 'base64'),
		},
	};
}

const run = (items, parameters, options) => new QrcodeBarcodeScanner().execute.call(context(items, parameters, options));

test('the package is a loadable community node', () => {
	assert.match(manifest.name, /^@qrcode-ai-com\/n8n-nodes-/);
	assert.ok(manifest.keywords.includes('n8n-community-node-package'));
	assert.deepEqual(manifest.n8n.credentials, []);
	assert.deepEqual(manifest.n8n.nodes, ['dist/nodes/QrcodeBarcodeScanner/QrcodeBarcodeScanner.node.js']);
	assert.equal(manifest.dependencies['@qrcode-ai-com/qrcode-barcode-scanner-wasm'], scanCore.ENGINE_VERSION);
	const codex = JSON.parse(readFileSync(new URL('../dist/nodes/QrcodeBarcodeScanner/QrcodeBarcodeScanner.node.json', import.meta.url), 'utf8'));
	const { description } = new QrcodeBarcodeScanner();
	assert.equal(codex.node, `${manifest.name}.${description.name}`);
	for (const icon of Object.values(description.icon)) {
		assert.ok(readFileSync(new URL(`../dist/nodes/QrcodeBarcodeScanner/${icon.slice(5)}`, import.meta.url), 'utf8').startsWith('<svg'));
	}
});

for (const profile of ['fast', 'frame', 'full']) {
	test(`one item per image returns both codes in ${profile}`, async () => {
		const items = [{ json: { order: 7 }, binary: binary(fixture) }];
		// Unbounded, so a loaded machine cannot cut the score: the engine's own test rule.
		const [output] = await run(items, { profile, options: { budgetMs: 0 } });
		assert.equal(output.length, 1);
		const [item] = output;
		assert.deepEqual(item.json.texts, EXPECTED);
		assert.deepEqual(item.json.codes.map((code) => code.symbology), ['qr_code', 'code128']);
		assert.equal(item.json.count, 2);
		assert.equal(item.json.profile, profile);
		assert.equal(item.json.engine, '0.11.0');
		assert.deepEqual(item.json.image, { fileName: 'label.png', mimeType: 'image/png', field: 'data' });
		assert.equal(item.json.report.versions.scanner, '0.11.0');
		assert.equal(item.json.report.trace.budget_exhausted, false);
		assert.equal(item.json.report.score === null, profile === 'frame');
		assert.equal(item.binary, items[0].binary, 'the image stays on the item');
		assert.deepEqual(item.pairedItem, { item: 0 });
	});
}

test('one item per code, with its exact bytes', async () => {
	const [output] = await run([{ json: {}, binary: binary(fixture) }], { output: 'code', profile: 'full' });
	assert.deepEqual(output.map((item) => [item.json.index, item.json.symbology, item.json.text]), [[0, 'qr_code', EXPECTED[0]], [1, 'code128', EXPECTED[1]]]);
	assert.equal(Buffer.from(output[1].json.raw, 'base64').toString('utf8'), 'STOCK-4827');
	assert.deepEqual(output.map((item) => item.pairedItem), [{ item: 0 }, { item: 0 }]);
});

test('an image without a code is a normal result', async () => {
	const [perImage] = await run([{ json: {}, binary: binary(white) }], {});
	assert.deepEqual([perImage[0].json.texts, perImage[0].json.count], [[], 0]);
	const [perCode] = await run([{ json: {}, binary: binary(white) }], { output: 'code' });
	assert.deepEqual(perCode, []);
});

test('several items keep their pairing, a custom field and a budget', async () => {
	const items = [fixture, white, fixture].map((bytes, index) => ({ json: { index }, binary: { photo: binary(bytes, `${index}.png`).data } }));
	const [output] = await run(items, { binaryPropertyName: 'photo', options: { budgetMs: 0, includeReport: false } });
	assert.deepEqual(output.map((item) => [item.pairedItem.item, item.json.count, 'report' in item.json]), [[0, 2, false], [1, 0, false], [2, 2, false]]);
});

test('a corrupt image stops the node with the engine code, or becomes an error item', async () => {
	const items = [{ json: {}, binary: binary(Buffer.from('not an image')) }];
	await assert.rejects(run(items, {}), (error) => {
		assert.ok(error instanceof NodeOperationError);
		assert.match(error.message, /\[QRS-001\]/);
		assert.equal(error.description, 'Scanner error QRS-001');
		return true;
	});
	const [output] = await run([...items, { json: {}, binary: binary(fixture) }], {}, { continueOnFail: true });
	assert.equal(output[0].json.code, 'QRS-001');
	assert.match(output[0].json.error, /\[QRS-001\]/);
	assert.deepEqual(output[1].json.texts, EXPECTED);
});

test('a missing binary field and a refused profile are node errors', async () => {
	await assert.rejects(run([{ json: {} }], {}), (error) => error instanceof NodeOperationError && /binary file 'data'/.test(error.message));
	await assert.rejects(run([{ json: {}, binary: binary(fixture) }], { profile: 'slow' }), /profile must be one of/);
});

test('the workflow template uses only real node parameters', () => {
	const template = JSON.parse(readFileSync(new URL('../template/qr-barcode-label-check.json', import.meta.url), 'utf8'));
	const { description } = new QrcodeBarcodeScanner();
	const known = new Set(description.properties.map((property) => property.name));
	const scanners = template.nodes.filter((node) => node.type === `${manifest.name}.${description.name}`);
	assert.equal(scanners.length, 1);
	for (const name of Object.keys(scanners[0].parameters)) assert.ok(known.has(name), `template parameter ${name}`);
	assert.ok(description.version.includes(scanners[0].typeVersion));
	const names = new Set(template.nodes.map((node) => node.name));
	assert.equal(names.size, template.nodes.length, 'node names are unique');
	for (const [from, outputs] of Object.entries(template.connections)) {
		assert.ok(names.has(from), `connection from ${from}`);
		for (const link of outputs.main.flat()) assert.ok(names.has(link.node), `connection to ${link.node}`);
	}
	const text = JSON.stringify(template);
	assert.doesNotMatch(text, /"credentials"|"pinData"|"webhookId"|\/Users\//, 'no credential, pinned data, webhook id or local path');
});

test('the template routes a scan to the branch its result calls for', () => {
	const template = JSON.parse(readFileSync(new URL('../template/qr-barcode-label-check.json', import.meta.url), 'utf8'));
	const router = template.nodes.find((node) => node.type === 'n8n-nodes-base.switch');
	const [noCode, expected] = router.parameters.rules.values.map((rule) => rule.conditions);
	// The expressions resolved as n8n would, then judged by n8n's own filter.
	const judge = (conditions, left, right) => executeFilter({ ...conditions,
		conditions: conditions.conditions.map((condition) => ({ ...condition, leftValue: left, rightValue: right })) }, { itemIndex: 0 });
	assert.equal(judge(noCode, 0, 0), true);
	assert.equal(judge(noCode, 2, 0), false);
	assert.equal(judge(expected, EXPECTED, 'STOCK-4827'), true);
	assert.equal(judge(expected, ['STOCK-0001'], 'STOCK-4827'), false);
	assert.equal(router.parameters.options.fallbackOutput, 'extra');
	assert.equal(template.connections[router.name].main.length, 3, 'no code, expected value, wrong value');
	const scanner = template.nodes.find((node) => node.type.endsWith('.qrcodeBarcodeScanner'));
	assert.equal(scanner.onError, 'continueErrorOutput');
	assert.equal(template.connections[scanner.name].main.length, 2, 'results and the error output');
});
