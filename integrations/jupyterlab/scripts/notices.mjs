// After a production build: prove that the bundled WebAssembly module is the published one, and
// write the engine's license files beside the extension's own, for the wheel and the sdist.
//
// The labextension's static folder must hold exactly one .wasm file, whose SHA-256 is the one the
// npm package @qrcode-ai-com/qrcode-barcode-scanner-wasm records in build-info.json. licenses/
// then receives that package's LICENSE (AGPL-3.0-or-later), LICENSE-APACHE-2.0 and THIRD-PARTY.md,
// unchanged, under names that say whose they are, and ENGINE.json, the record of the bundled
// module. pyproject.toml lists them as license files of the wheel. The labextension folder, which
// JupyterLab serves from share/jupyter/labextensions, gets the same files and the extension's own
// LICENSE and LICENSE-NOTES.md in its licenses/ folder.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const engineDir = dirname(require.resolve('@qrcode-ai-com/qrcode-barcode-scanner-wasm/package.json'));
const engine = JSON.parse(readFileSync(join(engineDir, 'package.json'), 'utf8'));
const buildInfo = JSON.parse(readFileSync(join(engineDir, 'build-info.json'), 'utf8'));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

const fail = (message) => { console.error(`notices: ${message}`); process.exit(1); };
if (sha256(join(engineDir, buildInfo.wasm.path)) !== buildInfo.wasm.sha256) {
  fail('the installed engine package does not hold the module its build-info.json names');
}
const staticDir = join(root, 'jupyterlab_qrcode_barcode_scanner', 'labextension', 'static');
const modules = readdirSync(staticDir).filter((name) => name.endsWith('.wasm'));
if (modules.length !== 1) fail(`the labextension holds ${modules.length} .wasm files, expected 1: ${modules}`);
const bundled = sha256(join(staticDir, modules[0]));
if (bundled !== buildInfo.wasm.sha256) {
  fail(`static/${modules[0]} has SHA-256 ${bundled}, the published module ${buildInfo.wasm.sha256}`);
}

const out = join(root, 'licenses');
mkdirSync(out, { recursive: true });
const version = engine.version;
for (const [from, to] of [['LICENSE', `ENGINE-${version}-LICENSE`],
  ['LICENSE-APACHE-2.0', `ENGINE-${version}-LICENSE-APACHE-2.0`],
  ['THIRD-PARTY.md', `ENGINE-${version}-THIRD-PARTY.md`]]) {
  copyFileSync(join(engineDir, from), join(out, to));
}
writeFileSync(join(out, 'ENGINE.json'), `${JSON.stringify({
  package: engine.name, version, license: engine.license, source_revision: buildInfo.source_revision,
  wasm: { file: `static/${modules[0]}`, bytes: buildInfo.wasm.bytes, sha256: bundled },
}, null, 2)}\n`);
const served = join(root, 'jupyterlab_qrcode_barcode_scanner', 'labextension', 'licenses');
mkdirSync(served, { recursive: true });
for (const name of readdirSync(out)) copyFileSync(join(out, name), join(served, name));
for (const name of ['LICENSE', 'LICENSE-NOTES.md']) copyFileSync(join(root, name), join(served, name));
console.log(`notices: static/${modules[0]} is ${engine.name}@${version} (${bundled})`);
