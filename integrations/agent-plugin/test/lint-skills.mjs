// SPDX-License-Identifier: MIT
// Lint the skills of a staged plugin tree with vally, the Agent Skills check that the
// github/awesome-copilot marketplace runs on every external plugin it reviews. The marketplace
// lints the skill folders that the root plugin.json names, or the whole plugin root when it names
// none; this does the same, then requires that every folder under skills/ was linted and passed.
//
//   node lint-skills.mjs STAGE --tools DIR
//
// STAGE is the output of `scripts/stage-agent-plugin-satellite.py stage`. DIR under --tools holds
// node_modules with @microsoft/vally (a development dependency only). Exit 0 when every skill
// passes, 1 when one fails or is missed, 2 for usage.
import { existsSync, statSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const option = (flag) => { const at = args.indexOf(flag); return at === -1 ? undefined : args.splice(at, 2)[1]; };
const tools = option('--tools');
const [stage] = args;
if (!stage || !tools || args.length !== 1) {
  console.error('usage: node lint-skills.mjs STAGE --tools DIR');
  process.exit(2);
}
const root = resolve(stage);
const require = createRequire(join(resolve(tools), 'noop.js'));
const { runLint, LintConsoleReporter } = await import(pathToFileURL(require.resolve('@microsoft/vally')).href);
// The package exports no package.json, so its version is read from the installed folder.
const { version } = JSON.parse(await readFile(join(resolve(tools), 'node_modules/@microsoft/vally/package.json'), 'utf8'));

// The folders the marketplace lints: the skills the root plugin.json names, else the root.
const manifest = JSON.parse(await readFile(join(root, 'plugin.json'), 'utf8'));
const named = [].concat(manifest.skills ?? []).map((path) => resolve(root, path))
  .filter((path) => existsSync(path) && statSync(path).isDirectory());
const targets = named.length ? named : [root];

// Every skill the tree ships: a folder under skills/ that holds a SKILL.md.
const expected = (await readdir(join(root, 'skills'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && existsSync(join(root, 'skills', entry.name, 'SKILL.md')))
  .map((entry) => entry.name).sort();

let failed = 0;
const linted = [];
for (const target of targets) {
  const chunks = [];
  const stream = new Writable({ write(chunk, _encoding, done) { chunks.push(chunk.toString()); done(); } });
  const result = await runLint({ rootPath: target });
  await new LintConsoleReporter({ verbose: true, stream }).report(result);
  process.stdout.write(chunks.join(''));
  if (!result.passed) failed += 1;
  if (result.discoveryErrors?.length) {
    failed += 1;
    console.log(`FAIL  discovery errors under ${target}: ${JSON.stringify(result.discoveryErrors)}`);
  }
  for (const row of result.skillResults ?? []) linted.push(basename(dirname(row.skill.path)));
}

const seen = [...new Set(linted)].sort();
if (JSON.stringify(seen) !== JSON.stringify(expected)) {
  failed += 1;
  console.log(`FAIL  vally linted ${JSON.stringify(seen)}, the tree ships ${JSON.stringify(expected)}`);
}
console.log(`${failed ? 'FAIL' : 'ok  '}  vally ${version}: ${seen.length} skill(s) linted (${seen.join(', ') || 'none'})`);
process.exit(failed ? 1 : 0);
