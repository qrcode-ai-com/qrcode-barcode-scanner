// SPDX-License-Identifier: MIT
// Build the extension folder that the VSIX holds: two bundles, the published WASM module, its
// license material, the icon and a README the marketplaces accept. Usage: node scripts/build.mjs [out]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { marketplaceReadme } from './marketplace-readme.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stage = resolve(process.argv[2] ?? join(here, 'out', 'stage'));
// The stage folder is emptied first, so it may only be a build folder of this package or a
// folder under the system's temporary directory.
const inside = (folder) => stage.startsWith(`${resolve(folder)}${sep}`);
assert.ok(inside(join(here, 'out')) || inside(realpathSync(tmpdir())) || inside(tmpdir()),
  `Build into ${join(here, 'out')} or a temporary folder, not ${stage}`);

const manifest = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const engineName = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
const require = createRequire(join(here, 'package.json'));
const enginePackage = dirname(require.resolve(`${engineName}/package.json`));
const engine = JSON.parse(readFileSync(join(enginePackage, 'package.json'), 'utf8'));
// The pin is exact, and the installed package must be that version under its published license.
assert.equal(engine.version, manifest.devDependencies[engineName], 'The installed engine is not the pinned version');
assert.equal(engine.license, 'AGPL-3.0-or-later', 'Engine license changed: review the bundle notices before building');
const buildInfo = JSON.parse(readFileSync(join(enginePackage, 'build-info.json'), 'utf8'));
const wasm = readFileSync(join(enginePackage, buildInfo.wasm.path));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256(wasm), buildInfo.wasm.sha256, 'The WASM module does not match its build record');
const engineLicense = readFileSync(join(enginePackage, 'LICENSE'), 'utf8');
assert.match(engineLicense, /^\s*GNU AFFERO GENERAL PUBLIC LICENSE\s*\n\s*Version 3, 19 November 2007/, 'The engine package no longer ships the AGPL text');

rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'dist', 'engine'), { recursive: true });
mkdirSync(join(stage, 'images'), { recursive: true });

const common = {
  bundle: true,
  format: 'cjs',
  platform: 'node',
  // The oldest extension host this manifest accepts (VS Code 1.74) runs Node 16.
  target: 'node16',
  legalComments: 'eof',
  logLevel: 'warning',
  // The package's fetch loader reads import.meta.url; this bundle only calls initSync.
  define: { 'import.meta.url': 'undefined' },
};
await build({ ...common, entryPoints: [join(here, 'src', 'extension.mjs')], outfile: join(stage, 'dist', 'extension.js'), external: ['vscode'] });
await build({ ...common, entryPoints: [join(here, 'src', 'worker.mjs')], outfile: join(stage, 'dist', 'worker.js') });

writeFileSync(join(stage, 'dist', 'qrcode-barcode-scanner_bg.wasm'), wasm);
for (const file of ['build-info.json', 'LICENSE', 'LICENSE-APACHE-2.0', 'THIRD-PARTY.md']) {
  copyFileSync(join(enginePackage, file), join(stage, 'dist', 'engine', file));
}
// Text from the checkout gets LF lines: a Windows checkout may hold CRLF, and the VSIX must not
// depend on where it was built.
const text = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
writeFileSync(join(stage, 'package.json'), text(join(here, 'package.json')));
writeFileSync(join(stage, 'CHANGELOG.md'), text(join(here, 'CHANGELOG.md')));
copyFileSync(join(here, 'images', 'icon.png'), join(stage, 'images', 'icon.png'));
writeFileSync(join(stage, 'README.md'), marketplaceReadme(text(join(here, 'README.md'))));

const mit = text(join(here, 'LICENSE'));
writeFileSync(join(stage, 'LICENSE.md'), `# Licenses of this extension

This extension holds two kinds of code under two licenses.

## The extension's own code: MIT

The extension's own code, bundled in \`dist/extension.js\` and \`dist/worker.js\`, is available
under the MIT License:

\`\`\`text
${mit.trim()}
\`\`\`

## The bundled scanner engine: AGPL-3.0-or-later

\`dist/qrcode-barcode-scanner_bg.wasm\` and the JavaScript glue bundled in \`dist/worker.js\` are the
published npm package \`${engineName}@${engine.version}\`, distributed under
${engine.license}. Its corresponding source is revision \`${buildInfo.source_revision}\` of
https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust (tag \`v${engine.version}\`);
\`dist/engine/build-info.json\` records how the module was built and its SHA-256. The package's
license file is \`dist/engine/LICENSE\`, and the Apache-2.0 notices it retains are
\`dist/engine/LICENSE-APACHE-2.0\` and \`dist/engine/THIRD-PARTY.md\`. Its full license text follows.

\`\`\`text
${engineLicense.trim()}
\`\`\`
`);

// The VSIX keeps each file's mode: the same on every machine, whatever its umask.
const normalize = (folder) => {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      chmodSync(path, 0o755);
      normalize(path);
    } else {
      chmodSync(path, 0o644);
    }
  }
};
normalize(stage);

console.log(JSON.stringify({ stage, engine: `${engineName}@${engine.version}`, wasmSha256: buildInfo.wasm.sha256, sourceRevision: buildInfo.source_revision }));
