// SPDX-License-Identifier: MIT
// Write the shared scan core into each automation host, or check that every copy is current.
//   node sync.mjs          write the four copies
//   node sync.mjs --check  fail when a copy differs from src/scan-core.ts
//   node sync.mjs --dist   also write dist/scan-core.cjs, the build this folder's tests load
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const integrations = dirname(here);
const sourcePath = join(here, 'src/scan-core.ts');
const source = readFileSync(sourcePath, 'utf8');
const origin = relative(integrations, sourcePath);
const notice = (path) => `// Generated from integrations/${origin} by integrations/automation-js-core/sync.mjs.\n`
	+ `// Do not edit integrations/${path}: change the source, then run the sync.\n`;

/** The TypeScript source with the notice under its SPDX line. */
function stamped(path, text) {
	const [first, ...rest] = text.split('\n');
	return [first, notice(path) + rest.join('\n')].join('\n');
}

/** CommonJS JavaScript for hosts that load plain .js files. */
function transpiled(path) {
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, removeComments: false },
		fileName: 'scan-core.ts',
	});
	return stamped(path, outputText.replace(/^"use strict";\n/, '// SPDX-License-Identifier: MIT\n\'use strict\';\n')
		.replace(/\n\/\/ SPDX-License-Identifier: MIT\n/, '\n'));
}

const copies = {
	'n8n/nodes/QrcodeBarcodeScanner/scanCore.ts': (path) => stamped(path, source),
	'activepieces/src/lib/scan-core.ts': (path) => stamped(path, source),
	'node-red/nodes/scan-core.js': transpiled,
	'zapier/lib/scan-core.js': transpiled,
};

const args = new Set(process.argv.slice(2));
const stale = [];
for (const [path, render] of Object.entries(copies)) {
	const target = join(integrations, path);
	const expected = render(path);
	let current = null;
	try { current = readFileSync(target, 'utf8'); } catch { current = null; }
	if (current === expected) continue;
	stale.push(path);
	if (!args.has('--check')) {
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, expected);
	}
}
if (args.has('--dist')) {
	mkdirSync(join(here, 'dist'), { recursive: true });
	writeFileSync(join(here, 'dist/scan-core.cjs'), transpiled('dist/scan-core.cjs'));
}
if (args.has('--check') && stale.length > 0) {
	console.error(`Stale scan core copies: ${stale.join(', ')}. Run node integrations/automation-js-core/sync.mjs`);
	process.exit(1);
}
console.log(`scan core: ${Object.keys(copies).length} copies ${args.has('--check') ? 'current' : 'written'}`);
