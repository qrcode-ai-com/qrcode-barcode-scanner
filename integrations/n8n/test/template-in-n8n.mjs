// SPDX-License-Identifier: MIT
// The workflow template run in the real, open-source n8n server, the way a self-hosted user runs it:
// the community node installed from its packed tarball with the steps n8n's own installer takes
// (Settings, Community nodes, Install), the template imported with `n8n import:workflow`, executed
// with `n8n execute`, then deleted, and the node uninstalled the way n8n removes it. Every n8n step
// runs in the official n8n image given by --image (pin it by digest).
//
//   node integrations/n8n/test/template-in-n8n.mjs --image IMAGE --tarball NODE.tgz --work DIR
//     [--mixed PNG] [--reports DIR] [--screenshot PNG] [--receipt-gone FILE]
//
// The label folder holds the mixed fixture (a QR code and a Code 128), a blank image and a file that
// is not an image. The template file itself is imported unchanged and must send each to its own
// branch. Three copies set the scan profile to fast, frame and full in turn (with the full report
// kept and no time budget, so --reports can write the three acceptance reports), and one copy
// expects a value the labels do not carry. Each branch's items are compared with exact values.
// --screenshot starts the editor, signs in a throwaway owner and saves the canvas of the template.
// The workflows are deleted through n8n's REST API and must be gone; the node is uninstalled and
// must be gone too. Needs Docker and, for --screenshot, the playwright package in the current folder.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
	options: {
		image: { type: 'string' },
		tarball: { type: 'string' },
		work: { type: 'string' },
		mixed: { type: 'string' },
		reports: { type: 'string' },
		screenshot: { type: 'string' },
	},
});
for (const name of ['image', 'tarball', 'work']) if (!args[name]) throw new Error(`--${name} is required`);

const here = new URL('.', import.meta.url);
const TEMPLATE = new URL('../template/qr-barcode-label-check.json', here);
const MIXED = args.mixed ?? new URL('../../../fixtures/symbology/mixed-code128-qr.png', here);
const PACKAGE = '@qrcode-ai-com/n8n-nodes-qrcode-barcode-scanner';
const ENGINE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
const EXPECTED = ['https://qrc-ai.com/76xMa', 'STOCK-4827'];
const SCAN = 'Scan QR codes and barcodes';
const BRANCHES = ['Expected value found', 'Wrong value', 'No code found', 'Unreadable image'];
// The same 64 x 64 white PNG as the node's own tests: an image with no code.
const BLANK = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PMQ0AMAzAsPInvYLYYVWKESTzjhsd8KsBrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BbQHKU9LC7/CP1AAAAABJRU5ErkJggg==', 'base64');

const work = resolve(args.work);
const dirs = { home: join(work, 'n8n-home'), labels: join(work, 'labels'), stage: join(work, 'stage'), out: join(work, 'out') };
for (const dir of Object.values(dirs)) mkdirSync(dir, { recursive: true });
mkdirSync(join(dirs.stage, 'workflows'), { recursive: true });
copyFileSync(MIXED, join(dirs.labels, 'mixed.png'));
writeFileSync(join(dirs.labels, 'blank.png'), BLANK);
writeFileSync(join(dirs.labels, 'corrupt.png'), 'not an image');
copyFileSync(args.tarball, join(dirs.stage, 'node.tgz'));

// The image runs as the user node (uid 1000); the runner's user is another one.
function openUp(dir) {
	chmodSync(dir, 0o777);
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) openUp(path);
		else chmodSync(path, 0o666);
	}
}
for (const dir of Object.values(dirs)) openUp(dir);

const mounts = [
	'-v', `${dirs.home}:/home/node/.n8n`,
	'-v', `${dirs.labels}:/home/node/.n8n-files/labels:ro`,
	'-v', `${dirs.stage}:/stage:ro`,
	'-v', `${dirs.out}:/out`,
];
const quiet = ['-e', 'N8N_DIAGNOSTICS_ENABLED=false', '-e', 'N8N_VERSION_NOTIFICATIONS_ENABLED=false',
	'-e', 'N8N_PERSONALIZATION_ENABLED=false'];

/** One n8n command line in a fresh container, as `docker exec` on a stopped instance would run it. */
function inN8n(script) {
	return execFileSync('docker', ['run', '--rm', ...mounts, ...quiet, '--entrypoint', 'sh', args.image, '-c', script],
		{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
}

const version = inN8n('n8n --version').trim();
console.log(`n8n ${version}, image ${args.image}`);

// 1. Install the node with the steps of n8n's installer (community-packages.service.js,
// downloadPackage): unpack the package into ~/.n8n/nodes/node_modules, drop its dev, peer and
// optional dependencies, install the rest with n8n's npm flags, record it in ~/.n8n/nodes/package.json.
// Only the download differs: n8n runs `npm pack NAME@VERSION` against registry.npmjs.org, and
// this run unpacks the tarball built from this tree. (A custom registry is a licensed n8n feature.)
const PACKAGE_DIR = `~/.n8n/nodes/node_modules/${PACKAGE}`;
const editJson = (file, change) => `node -e 'const fs = require("fs"); const file = process.argv[1];
const json = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { name: "installed-nodes", private: true, dependencies: {} };
${change}
fs.writeFileSync(file, JSON.stringify(json, null, 2));' ${file}`;
inN8n([
	'set -e',
	`mkdir -p ${PACKAGE_DIR}`,
	`tar -xzf /stage/node.tgz -C ${PACKAGE_DIR} --strip-components=1`,
	editJson(`${PACKAGE_DIR}/package.json`, 'delete json.devDependencies; delete json.peerDependencies; delete json.optionalDependencies;'),
	`cd ${PACKAGE_DIR}`,
	'npm install --audit=false --fund=false --bin-links=false --install-strategy=shallow --ignore-scripts=true --package-lock=false --registry=https://registry.npmjs.org --loglevel=error >/dev/null',
	editJson('~/.n8n/nodes/package.json', `json.dependencies["${PACKAGE}"] = require(process.env.HOME + "/.n8n/nodes/node_modules/${PACKAGE}/package.json").version;`),
].join('\n'));
const installed = JSON.parse(inN8n(`cat ${PACKAGE_DIR}/package.json`));
assert.equal(installed.version, '0.1.0');
assert.equal(installed.peerDependencies, undefined);
const engine = JSON.parse(inN8n(`cat ${PACKAGE_DIR}/node_modules/${ENGINE}/package.json`));
assert.equal(engine.version, '0.11.0');
assert.deepEqual(JSON.parse(inN8n('cat ~/.n8n/nodes/package.json')).dependencies, { [PACKAGE]: '0.1.0' });
// The file n8n loads, resolved from ~/.n8n/nodes: found now, and gone after step 6.
const NODE_FILE = `${PACKAGE}/dist/nodes/QrcodeBarcodeScanner/QrcodeBarcodeScanner.node.js`;
const resolveNode = `node -e "console.log(require.resolve('${NODE_FILE}', { paths: ['/home/node/.n8n/nodes'] }))"`;
assert.equal(inN8n(resolveNode).trim(), `/home/node/.n8n/nodes/node_modules/${NODE_FILE}`);
console.log(`installed ${PACKAGE} ${installed.version} with ${ENGINE} ${engine.version}`);

// 2. The workflows to import: the template file unchanged, and four copies.
const shipped = readFileSync(TEMPLATE, 'utf8');
writeFileSync(join(dirs.stage, 'workflows', 'template.json'), shipped);
const template = JSON.parse(shipped);
const variants = {};
function variant(key, change) {
	const copy = structuredClone(template);
	copy.name = `${template.name} [${key}]`;
	change(copy, (name) => copy.nodes.find((node) => node.name === name));
	writeFileSync(join(dirs.stage, 'workflows', `${key}.json`), JSON.stringify(copy));
	variants[key] = copy.name;
}
for (const profile of ['fast', 'frame', 'full']) {
	variant(profile, (_, node) => {
		node(SCAN).parameters.profile = profile;
		node(SCAN).parameters.options = { includeReport: true, budgetMs: 0 };
	});
}
variant('wrong', (_, node) => {
	node('Settings').parameters.assignments.assignments.find((row) => row.name === 'expectedText').value = 'STOCK-0001';
});
openUp(dirs.stage);

// 3. Import them all with the CLI, then read their ids.
console.log(inN8n('n8n import:workflow --separate --input=/stage/workflows/ 2>&1 | grep -v "^\\[license SDK\\]"'));
const listed = new Map(inN8n('n8n list:workflow 2>/dev/null').split('\n')
	.filter((line) => line.includes('|')).map((line) => [line.slice(line.indexOf('|') + 1), line.slice(0, line.indexOf('|'))]));
const ids = { shipped: listed.get(template.name) };
for (const [key, name] of Object.entries(variants)) ids[key] = listed.get(name);
for (const [key, id] of Object.entries(ids)) assert.ok(id, `workflow ${key} imported (listed: ${[...listed.keys()].join(', ')})`);

// 4. Execute each one with the CLI and keep its execution data.
const runs = {};
for (const [key, id] of Object.entries(ids)) {
	const raw = inN8n(`n8n execute --id=${id} --rawOutput`);
	// n8n prints its start-up lines before the JSON of the execution, and its task runner can
	// log a line such as `Registered runner "JS Task Runner"` after it. The JSON is indented,
	// so it is exactly the lines from the first `{` to the first `}` that stand alone.
	const lines = raw.split('\n');
	const start = lines.findIndex((line) => line === '{');
	const end = lines.findIndex((line, index) => index > start && line === '}');
	assert.ok(start >= 0 && end > start, `execution ${key} printed its data:\n${raw.slice(0, 2000)}`);
	const execution = JSON.parse(lines.slice(start, end + 1).join('\n'));
	writeFileSync(join(work, `execution-${key}.json`), JSON.stringify(execution, null, 2));
	assert.equal(execution.status, 'success', `${key}: execution status`);
	assert.equal(execution.data.resultData.error, undefined, `${key}: no workflow error`);
	runs[key] = execution.data.resultData.runData;
}

/** The json of every item a node wrote, output by output. */
function outputs(runData, node) {
	assert.equal(runData[node]?.length, 1, `${node} ran once`);
	assert.equal(runData[node][0].executionStatus, 'success', `${node} succeeded`);
	return runData[node][0].data.main.map((items) => (items ?? []).map((item) => item.json));
}
/** The items each result branch wrote; a branch that did not run has none. */
function branches(runData) {
	return Object.fromEntries(BRANCHES.map((name) => [name, runData[name] ? outputs(runData, name)[0] : []]));
}
const unreadable = (json) => {
	assert.equal(json.status, 'unreadable image');
	assert.equal(json.file, 'corrupt.png');
	assert.equal(json.code, 'QRS-001');
	assert.match(json.error, /\[QRS-001\]$/);
	return true;
};

// The template as shipped: one item per file, each in the branch its result calls for.
for (const key of ['shipped', 'fast', 'frame', 'full']) {
	const runData = runs[key];
	const read = outputs(runData, 'Read label images')[0].map((json) => json.fileName).sort();
	assert.deepEqual(read, ['blank.png', 'corrupt.png', 'mixed.png'], `${key}: files read`);
	const [scanned, failed] = outputs(runData, SCAN);
	assert.deepEqual(scanned.map((json) => [json.image.fileName, json.texts, json.count]).sort(),
		[['blank.png', [], 0], ['mixed.png', EXPECTED, 2]], `${key}: scan results`);
	// n8n keeps only the message on an error item; the engine code ends it.
	assert.equal(failed.length, 1, `${key}: one item on the error output`);
	assert.deepEqual(Object.keys(failed[0]), ['error'], `${key}: the error item`);
	assert.match(failed[0].error, /\[QRS-001\]$/);
	const profile = key === 'shipped' ? 'frame' : key;
	for (const json of scanned) {
		assert.equal(json.profile, profile);
		assert.equal(json.engine, '0.11.0');
		assert.equal('report' in json, key !== 'shipped', `${key}: report kept only in the copies`);
	}
	const got = branches(runData);
	assert.deepEqual(got['Expected value found'], [{ file: 'mixed.png', status: 'expected value found', found: EXPECTED }], `${key}: expected value`);
	assert.deepEqual(got['No code found'], [{ file: 'blank.png', status: 'no code' }], `${key}: no code`);
	assert.deepEqual(got['Wrong value'], [], `${key}: no wrong value`);
	assert.equal(got['Unreadable image'].length, 1, `${key}: one unreadable image`);
	assert.ok(unreadable(got['Unreadable image'][0]));
	if (key !== 'shipped' && args.reports) {
		mkdirSync(args.reports, { recursive: true });
		const mixed = scanned.find((json) => json.image.fileName === 'mixed.png');
		assert.equal(mixed.report.versions.scanner, '0.11.0');
		assert.equal(mixed.report.trace.budget_exhausted, false);
		writeFileSync(join(args.reports, `${key}.json`), JSON.stringify(mixed.report));
	}
	console.log(`${key}: mixed.png expected value found, blank.png no code, corrupt.png unreadable (QRS-001)`);
}
// A label that does not carry the expected value.
{
	const got = branches(runs.wrong);
	assert.deepEqual(got['Wrong value'], [{ file: 'mixed.png', status: 'wrong value', found: EXPECTED, expected: 'STOCK-0001' }]);
	assert.deepEqual(got['Expected value found'], []);
	assert.deepEqual(got['No code found'], [{ file: 'blank.png', status: 'no code' }]);
	assert.equal(got['Unreadable image'].length, 1);
	console.log('wrong: mixed.png wrong value (expected STOCK-0001)');
}

// 5. The server: a throwaway owner, the canvas screenshot, then the workflows deleted.
const container = `n8n-template-${randomBytes(4).toString('hex')}`;
execFileSync('docker', ['run', '-d', '--name', container, ...mounts, ...quiet, '-p', '127.0.0.1:5678:5678', args.image], { stdio: 'ignore' });
const base = 'http://127.0.0.1:5678';
const owner = { email: 'owner@example.com', firstName: 'Template', lastName: 'Check', password: `Check-${randomBytes(9).toString('base64url')}1` };
const browserId = randomBytes(16).toString('hex');
let cookie = '';
async function rest(method, path, body) {
	const response = await fetch(base + path, {
		method,
		headers: { 'content-type': 'application/json', 'browser-id': browserId, cookie },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const auth = response.headers.getSetCookie().find((value) => value.startsWith('n8n-auth='));
	if (auth) cookie = auth.split(';')[0];
	const text = await response.text();
	assert.ok(response.ok, `${method} ${path}: HTTP ${response.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : undefined;
}
try {
	for (let attempt = 0; ; attempt++) {
		try {
			if ((await fetch(base + '/healthz/readiness')).ok) break;
		} catch {}
		assert.ok(attempt < 120, 'n8n answered /healthz/readiness');
		await new Promise((done) => setTimeout(done, 1000));
	}
	await rest('POST', '/rest/owner/setup', owner);
	await rest('POST', '/rest/login', { emailOrLdapLoginId: owner.email, password: owner.password });

	if (args.screenshot) {
		const require = createRequire(join(process.cwd(), 'noop.js'));
		const { chromium } = require('playwright');
		const browser = await chromium.launch();
		try {
			const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
			await page.goto(base + '/signin');
			await page.evaluate((id) => localStorage.setItem('n8n-browserId', id), browserId);
			await page.context().addCookies([{ name: 'n8n-auth', value: cookie.slice('n8n-auth='.length), url: base }]);
			await page.goto(`${base}/workflow/${ids.shipped}`);
			const canvas = page.locator('[data-test-id="canvas"]');
			await canvas.waitFor({ state: 'visible', timeout: 60000 });
			await page.locator('[data-test-id="canvas-node"]').first().waitFor({ timeout: 60000 });
			await page.keyboard.press('Escape');
			const fit = page.locator('[data-test-id="zoom-to-fit"]');
			if (await fit.count()) await fit.click();
			await page.waitForTimeout(1500);
			await canvas.screenshot({ path: args.screenshot });
			const nodes = await page.locator('[data-test-id="canvas-node"]').count();
			assert.ok(nodes >= template.nodes.length - 4, `the canvas shows the nodes (${nodes})`);
			assert.equal(await page.getByText('Install this node to use it').count(), 0, 'the community node is installed');
		} finally {
			await browser.close();
		}
		const bytes = readFileSync(args.screenshot);
		console.log(`screenshot ${args.screenshot} sha256 ${createHash('sha256').update(bytes).digest('hex')}`);
	}

	for (const id of Object.values(ids)) {
		await rest('POST', `/rest/workflows/${id}/archive`);
		await rest('DELETE', `/rest/workflows/${id}`);
	}
	const left = (await rest('GET', '/rest/workflows?includeScopes=false')).data;
	assert.deepEqual(left, [], 'every imported workflow is deleted');
} finally {
	execFileSync('docker', ['logs', '--tail', '40', container], { stdio: 'inherit' });
	execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
}
assert.equal(inN8n('n8n list:workflow 2>/dev/null').split('\n').filter((line) => line.includes('|')).length, 0);
console.log('workflows deleted');

// 6. Uninstall the node the way n8n removes a package (removeNpmPackage): its folder and its entry in
// ~/.n8n/nodes/package.json. n8n then finds no such package.
inN8n([
	'set -e',
	`rm -r -f ${PACKAGE_DIR}`,
	editJson('~/.n8n/nodes/package.json', `delete json.dependencies["${PACKAGE}"];`),
].join('\n'));
assert.equal(inN8n(`test -e ${PACKAGE_DIR} && echo present || echo gone`).trim(), 'gone');
assert.equal(inN8n(`${resolveNode} 2>/dev/null || echo gone`).trim(), 'gone');
assert.deepEqual(JSON.parse(inN8n('cat ~/.n8n/nodes/package.json')).dependencies, {});
console.log(`n8n ${version}: template imported, run on the three profiles and the four branches, deleted; node uninstalled`);
