// SPDX-License-Identifier: MIT
// Build the Activepieces piece into build/package/ and pack it into build/ with `npm pack`.
//
//   node build.mjs
//     Without the Activepieces monorepo: the monorepo's bundle settings, gate and published
//     manifest (packages/cli/src/lib/utils/bundle-piece-utils.ts and prepare-piece-utils.ts at
//     ACTIVEPIECES_REVISION) reproduced here, with the framework from npm.
//   node build.mjs --activepieces <checkout>
//     With Activepieces' own bundlePiece and framework source from a checkout at
//     ACTIVEPIECES_REVISION. A sparse checkout is enough (packages/cli, packages/pieces/framework,
//     packages/core/utils, packages/core/piece-types); when it has no node_modules, this harness's
//     node_modules are linked in its place. The piece is staged under packages/pieces/custom/.
//
// Both modes first type check the piece with its monorepo compiler settings (tsconfig.json here).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { ACTIVEPIECES_REVISION, stagePiece } from '../stage.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const piece = dirname(here);
const build = join(here, 'build');
const out = join(build, 'package');
const manifest = JSON.parse(readFileSync(join(piece, 'package.json'), 'utf8'));
const ENGINE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';

const BUNDLE_FILENAME = 'src/index.js';
const FAIL_BYTES = 5 * 1024 * 1024;
const NODE_BUILTINS = new Set(builtinModules);
const HAZARD_WARNING_IDS = new Set([
  'indirect-require',
  'unsupported-require-call',
  'unsupported-dynamic-import',
  'require-resolve-not-external',
  'import-is-undefined',
  'call-import-namespace',
  'commonjs-variable-in-esm',
]);

const topLevelPkg = (id) => (id.startsWith('@') ? id.split('/').slice(0, 2).join('/') : id.split('/')[0]);

/** The monorepo bundle, reproduced: readInlineConfig, runEsbuild and gateBundle. */
async function bundleLikeActivepieces() {
  // Absent or true inlines every package, false none, a list only those.
  const inlineAll = manifest.bundleDeps === undefined || manifest.bundleDeps === true;
  const inlineList = new Set(Array.isArray(manifest.bundleDeps) ? manifest.bundleDeps : []);
  const externalized = new Set();
  const inlined = new Set();
  const result = await esbuild.build({
    entryPoints: [join(piece, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: join(out, BUNDLE_FILENAME),
    minify: true,
    keepNames: true,
    treeShaking: true,
    metafile: true,
    logLevel: 'silent',
    // Outside the monorepo: the harness's node_modules stand in for the workspace, and its
    // tsconfig.json for the monorepo's tsconfig.base.json.
    nodePaths: [join(here, 'node_modules')],
    tsconfig: join(here, 'tsconfig.json'),
    plugins: [{
      name: 'externalize-third-party',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          if (args.kind === 'entry-point' || args.path.startsWith('.') || isAbsolute(args.path)) return null;
          if (args.path.startsWith('@activepieces/')) return null;
          if (args.path.startsWith('node:') || NODE_BUILTINS.has(args.path)) return { path: args.path, external: true };
          const top = topLevelPkg(args.path);
          if (inlineAll || inlineList.has(top)) {
            inlined.add(top);
            return null;
          }
          externalized.add(top);
          return { path: args.path, external: true };
        });
      },
    }],
    loader: { '.node': 'file' },
  });
  const issues = [];
  for (const warning of result.warnings) {
    if (HAZARD_WARNING_IDS.has(warning.id)) issues.push(`${warning.text} (${warning.location?.file})`);
    else console.warn(`non-fatal warning: ${warning.text}`);
  }
  for (const input of Object.keys(result.metafile.inputs)) {
    if (input.endsWith('.node')) issues.push(`native addon inlined: ${input}`);
    const absolute = resolve(process.cwd(), input);
    if (absolute.startsWith(resolve(piece, 'src') + sep) && /\b__dirname\b/.test(readFileSync(absolute, 'utf8'))) {
      issues.push(`${input} uses __dirname, which the monorepo bundler refuses without bundleForkedEntries`);
    }
  }
  const bundleBytes = statSync(join(out, BUNDLE_FILENAME)).size;
  if (bundleBytes > FAIL_BYTES) issues.push(`bundle is ${bundleBytes} bytes, over the 5 MB cap`);
  if (issues.length > 0) throw new Error(`The piece failed the bundle gate:\n  - ${issues.join('\n  - ')}`);
  // Each inlined package's own folder, nested copies included, for its license notice.
  const dirs = new Map();
  for (const input of Object.keys(result.metafile.inputs)) {
    const match = /^(.*node_modules\/((?:@[^/]+\/)?[^/]+))\//.exec(input);
    if (match && inlined.has(match[2]) && !dirs.has(match[2])) dirs.set(match[2], resolve(process.cwd(), match[1]));
  }
  return { bundleBytes, inlined: [...inlined], dirs, external: [...externalized].filter((dep) => dep !== 'tslib') };
}

/** Activepieces' own bundlePiece, from a checkout at the pinned revision. */
async function bundleWithActivepieces(checkout) {
  const root = resolve(checkout);
  const revision = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (revision !== ACTIVEPIECES_REVISION) {
    throw new Error(`${root} is at ${revision}; this piece was checked against Activepieces ${ACTIVEPIECES_REVISION}`);
  }
  const compiled = join(build, 'activepieces-bundle-piece-utils.cjs');
  await esbuild.build({
    entryPoints: [join(root, 'packages/cli/src/lib/utils/bundle-piece-utils.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['esbuild'],
    outfile: compiled,
    logLevel: 'silent',
  });
  const { bundlePieceUtils } = createRequire(import.meta.url)(compiled);
  // The framework source the bundler inlines imports zod and a few small packages.
  if (!existsSync(join(root, 'node_modules'))) symlinkSync(join(here, 'node_modules'), join(root, 'node_modules'), 'dir');
  const piecePath = stagePiece(root);
  const distPath = join(piecePath, 'dist');
  rmSync(distPath, { recursive: true, force: true });
  mkdirSync(join(distPath, 'src'), { recursive: true });
  const result = await bundlePieceUtils.bundlePiece({ piecePath, distPath, repoRoot: root });
  copyFileSync(join(distPath, BUNDLE_FILENAME), join(out, BUNDLE_FILENAME));
  return {
    bundleBytes: result.bundleBytes,
    inlined: result.inlined,
    external: result.external,
    activepiecesLicense: readFileSync(join(root, 'LICENSE'), 'utf8'),
  };
}

// The license of the Activepieces source outside packages/ee, which holds the framework. The npm
// framework package ships no license file; a checkout's own LICENSE is used when there is one.
const ACTIVEPIECES_MIT = `Copyright (c) 2020-2024 Activepieces Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

/** The notices of the third-party code inlined in the bundle, with each package's own license file. */
function thirdPartyNotices(inlined, dirs, activepiecesLicense) {
  const sections = [`@activepieces/pieces-framework and the Activepieces libraries it inlines (MIT Expat)\n\n${activepiecesLicense.trim()}`];
  for (const name of [...inlined].sort()) {
    const dir = dirs?.get(name) ?? join(here, 'node_modules', name);
    const info = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const file = readdirSync(dir).find((entry) => /^(licen[cs]e|copying)(\.|$)/i.test(entry));
    if (!file) throw new Error(`${name} ships no license file to reproduce`);
    sections.push(`${name} ${info.version} (${info.license})\n\n${readFileSync(join(dir, file), 'utf8').trim()}`);
  }
  return 'Third-party code inlined in src/index.js. The scanner engine is not inlined: it is the separate\n'
    + 'npm dependency @qrcode-ai-com/qrcode-barcode-scanner-wasm, under its own license.\n\n'
    + sections.map((section) => `----\n\n${section}\n`).join('\n');
}

const flag = process.argv.indexOf('--activepieces');
const checkout = flag === -1 ? null : process.argv[flag + 1];
if (flag !== -1 && !checkout) throw new Error('--activepieces needs the path of an Activepieces checkout');
if (Array.isArray(manifest.bundleDeps) ? manifest.bundleDeps.includes(ENGINE) : manifest.bundleDeps !== false) {
  throw new Error(`${ENGINE} must stay external: it reads its own .wasm file and is found with require.resolve`);
}

execFileSync(join(here, 'node_modules', '.bin', 'tsc'), ['-p', join(here, 'tsconfig.json')], { stdio: 'inherit' });
rmSync(build, { recursive: true, force: true });
mkdirSync(join(out, 'src'), { recursive: true });
const bundled = checkout ? await bundleWithActivepieces(checkout) : await bundleLikeActivepieces();

// The published manifest, as rewriteManifestForBundle writes it.
const published = { ...manifest };
published.main = `./${BUNDLE_FILENAME}`;
published.dependencies = Object.fromEntries(bundled.external.map((dep) => {
  const version = manifest.dependencies?.[dep];
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`External dependency ${dep} needs an exact version in package.json`);
  return [dep, version];
}));
for (const key of ['devDependencies', 'peerDependencies', 'scripts', 'types', 'bundleDeps', 'bundleForkedEntries']) delete published[key];
published.files = [BUNDLE_FILENAME, 'package.json', 'src/i18n', 'THIRD-PARTY-NOTICES.txt'];
writeFileSync(join(out, 'package.json'), `${JSON.stringify(published, null, 2)}\n`);
// npm always ships the README and the LICENSE found at a package root.
copyFileSync(join(piece, 'README.md'), join(out, 'README.md'));
copyFileSync(join(piece, 'LICENSE'), join(out, 'LICENSE'));
writeFileSync(join(out, 'THIRD-PARTY-NOTICES.txt'), thirdPartyNotices(bundled.inlined, bundled.dirs, bundled.activepiecesLicense ?? ACTIVEPIECES_MIT));

const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', build], { cwd: out, encoding: 'utf8' }));
console.log(`${checkout ? `Activepieces ${ACTIVEPIECES_REVISION.slice(0, 7)} bundler` : 'reproduced bundler'}: `
  + `${bundled.bundleBytes} bytes, inlined ${[...bundled.inlined].sort().join(' ')}`);
console.log(`external ${JSON.stringify(published.dependencies)}, packed build/${packed[0].filename}`);
