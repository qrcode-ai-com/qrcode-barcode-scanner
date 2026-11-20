// SPDX-License-Identifier: MIT
// Stage the VS Code publish lane of the proposed repository
// qrcode-ai-com/qrcode-barcode-scanner-distribution, which holds the publish lanes that need a
// stored token (the engine repository holds none).
//
//   node scripts/stage-distribution.mjs stage --out DIR [--revision REV]
//   node scripts/stage-distribution.mjs verify DIR
//
// `stage` reads integrations/vscode at REV (HEAD by default) from Git, never from the working
// tree. It builds the VSIX from that copy in a temporary folder, then writes into DIR, which must
// be empty or absent:
//   .github/workflows/vscode-publish.yml   from distribution/vscode-publish.yml
//   vscode/package.json, package-lock.json  the locked ovsx client
//   vscode/README.md                        from distribution/lane.md
//   vscode/SOURCE.json                      the revision, the VSIX name, size and SHA-256, the
//                                           Node.js line that built it, every staged file's SHA-256
// `verify` stages the revision that DIR's SOURCE.json names and compares those files byte for
// byte. Exit 0 when the step passes, 1 when it fails, 2 for usage. Nothing is pushed or published.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const REPOSITORY = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust';
const SCHEMA = 'qrscan-vscode-publish-stage/1';
const LANE = {
  '.github/workflows/vscode-publish.yml': 'integrations/vscode/distribution/vscode-publish.yml',
  'vscode/package.json': 'integrations/vscode/distribution/package.json',
  'vscode/package-lock.json': 'integrations/vscode/distribution/package-lock.json',
  'vscode/README.md': 'integrations/vscode/distribution/lane.md',
};

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { maxBuffer: 1 << 28 });

/** The staged files for REV, as a map from path to bytes, and the VSIX built from REV. */
function build(revision) {
  const commit = git('rev-parse', '--verify', `${revision}^{commit}`).toString().trim();
  const work = mkdtempSync(join(tmpdir(), 'qrscan-vscode-stage-'));
  try {
    execFileSync('tar', ['-x', '-C', work], { input: git('archive', '--format=tar', commit, 'integrations/vscode') });
    const folder = join(work, 'integrations', 'vscode');
    const quiet = { cwd: folder, stdio: ['ignore', 'ignore', 'inherit'] };
    execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { ...quiet, shell: process.platform === 'win32' });
    const { SOURCE_DATE_EPOCH: _ignored, ...env } = process.env;
    execFileSync(process.execPath, ['scripts/package.mjs'], { ...quiet, env });
    const receipt = JSON.parse(readFileSync(join(folder, 'out', 'package-receipt.json'), 'utf8'));
    const files = new Map(Object.entries(LANE).map(([path, source]) => [path, git('show', `${commit}:${source}`)]));
    const source = {
      schema: SCHEMA,
      repository: REPOSITORY,
      revision: commit,
      extension: receipt.extension.split('@')[0],
      version: receipt.extension.split('@')[1],
      vsix: receipt.vsix.split(/[\\/]/).pop(),
      bytes: receipt.bytes,
      sha256: receipt.sha256,
      node: process.versions.node.split('.')[0],
      files: Object.fromEntries([...files].map(([path, bytes]) => [path, sha256(bytes)])),
    };
    files.set('vscode/SOURCE.json', Buffer.from(`${JSON.stringify(source, null, 2)}\n`));
    return { files, source };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function stage(revision, out) {
  if (existsSync(out) && readdirSync(out).length > 0) throw new Error(`${out} is not empty`);
  const { files, source } = build(revision);
  for (const [path, bytes] of files) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), bytes);
  }
  return source;
}

function verify(dir) {
  const recorded = JSON.parse(readFileSync(join(dir, 'vscode', 'SOURCE.json'), 'utf8'));
  if (recorded.schema !== SCHEMA) throw new Error(`unknown schema ${recorded.schema}`);
  const { files } = build(recorded.revision);
  const problems = [];
  for (const [path, bytes] of files) {
    const target = join(dir, path);
    if (!existsSync(target)) problems.push(`${path}: missing`);
    else if (!readFileSync(target).equals(bytes)) problems.push(`${path}: differs from revision ${recorded.revision}`);
  }
  const extra = readdirSync(join(dir, 'vscode')).filter((name) => !files.has(`vscode/${name}`));
  for (const name of extra) problems.push(`vscode/${name}: not staged`);
  return { recorded, problems };
}

const [command, ...rest] = process.argv.slice(2);
const option = (name) => {
  const at = rest.indexOf(name);
  return at >= 0 ? rest[at + 1] : undefined;
};
try {
  if (command === 'stage' && option('--out')) {
    console.log(JSON.stringify(stage(option('--revision') ?? 'HEAD', resolve(option('--out'))), null, 2));
  } else if (command === 'verify' && rest[0]) {
    const { recorded, problems } = verify(resolve(rest[0]));
    for (const problem of problems) console.error(problem);
    console.log(problems.length === 0 ? `verified: ${recorded.vsix} ${recorded.sha256} from ${recorded.revision}` : `${problems.length} problem(s)`);
    process.exitCode = problems.length === 0 ? 0 : 1;
  } else {
    console.error('usage: stage-distribution.mjs stage --out DIR [--revision REV] | verify DIR');
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
