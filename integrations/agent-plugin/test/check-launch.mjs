// SPDX-License-Identifier: MIT
// Start what a staged plugin tree tells each client to start, and scan the mixed test image.
//
//   node check-launch.mjs STAGE OUT [--version 0.11.0]
//
// For every client configuration (launches.mjs) it starts the server with that exact command,
// through distribution/acceptance/drivers/mcp-server.mjs, and lets the destination-acceptance
// contract judge the three profiles. The pinned server also runs once with an allowed directory,
// through `scan_file`. The skill's helper runs from both of its copies against the engine installed
// the way SKILL.md says. Last, the npx copy and the engine runtime are removed and every receipt
// must close as PASS. HOME is a new, empty folder under OUT, so the first start downloads from npm
// as a user's first start does. Receipts land in OUT/receipts. Exit 0 when all pass, 1 otherwise.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launches } from './launches.mjs';

const ENGINE = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DRIVER = join(ENGINE, 'distribution/acceptance/drivers/mcp-server.mjs');
const ACCEPTANCE = join(ENGINE, 'scripts/destination-acceptance.py');
const NAME = 'qrcode-barcode-scanner';

const args = process.argv.slice(2);
const at = args.indexOf('--version');
const version = at === -1 ? '0.11.0' : args.splice(at, 2)[1];
if (args.length !== 2) {
  console.error('usage: node check-launch.mjs STAGE OUT [--version X.Y.Z]');
  process.exit(2);
}
const stage = resolve(args[0]);
const out = resolve(args[1]);
if (existsSync(out)) {
  console.error(`check-launch: ${out} exists; give a new folder`);
  process.exit(2);
}
const home = join(out, 'home');
const work = join(out, 'work');
const receipts = join(out, 'receipts');
for (const folder of [home, work, receipts]) await mkdir(folder, { recursive: true });
const env = { ...process.env, HOME: home, npm_config_cache: join(home, '.npm') };
delete env.QRSCAN_MCP_ALLOWED_DIRECTORIES;

function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, { cwd: work, env, encoding: 'utf8', maxBuffer: 64 << 20, ...options });
  if (result.error) throw result.error;
  return result;
}
const slug = (text) => text.replace(/^\./, 'dot-').replace(/[^A-Za-z0-9.]+/g, '-').replace(/^-|-$/g, '');
const shell = (argv) => argv.map((part) => (/^[\w@%+=:,./-]+$/.test(part) ? part : `'${part.replaceAll("'", "'\\''")}'`)).join(' ');

const image = run('python3', [ACCEPTANCE, 'stage', join(out, 'input')]).stdout.trim();
if (!existsSync(image)) throw new Error(`the fixture was not staged: ${image}`);
const adapter = JSON.parse(await readFile(join(ENGINE, 'integrations/mcp/package.json'), 'utf8'));
const pinned = `${adapter.name}@${adapter.version}`;
const results = [];

async function judge(id, kind, producedBy, reports, extra) {
  const receipt = join(receipts, `${slug(id)}.json`);
  const judged = run('python3', [ACCEPTANCE, 'reports', '--kind', kind, '--produced-by', producedBy,
    '--fast', join(reports, 'fast.json'), '--frame', join(reports, 'frame.json'), '--full', join(reports, 'full.json'),
    '--destination', `Agent plugin · ${id}`, '--version', version, ...extra, '--receipt', receipt]);
  results.push({ id, receipt, judged: judged.status === 0, note: judged.stderr.trim() || judged.stdout.trim() });
}

// 1. Every client configuration, with the command it holds, through scan_image.
const found = await launches(stage);
const names = [...Object.keys(found), 'scan-file', 'skill helper', 'skill helper · Junie copy'].map(slug);
if (new Set(names).size !== names.length) throw new Error(`two routes would share a receipt name: ${names.join(', ')}`);
for (const [id, argv] of Object.entries(found)) {
  const reports = join(out, 'reports', slug(id));
  const started = run('node', [DRIVER, image, reports, '--', ...argv]);
  process.stdout.write(`${id}\n${started.stdout}`);
  if (started.status !== 0) {
    results.push({ id, judged: false, note: started.stderr.trim().split('\n').slice(0, 6).join(' | ') });
    continue;
  }
  const server = JSON.parse(await readFile(join(reports, 'server.json'), 'utf8'));
  if (server.serverInfo?.version !== adapter.version || !server.tools.includes('scan_image') || server.tools.includes('scan_file')) {
    results.push({ id, judged: false, note: `server ${JSON.stringify(server.serverInfo)} listed ${server.tools.join(', ')}` });
    continue;
  }
  await writeFile(join(receipts, `server-${slug(id)}.json`), JSON.stringify(server, null, 2));
  await judge(id, 'server', `node mcp-server.mjs -- ${shell(argv)}`, reports,
    ['--identifier', pinned, '--url', `https://www.npmjs.com/package/${adapter.name}/v/${adapter.version}`, '--install', shell(argv)]);
}

// 2. The same server with one allowed directory, through scan_file.
{
  const id = 'mcp.json · scan_file in an allowed directory';
  const reports = join(out, 'reports', 'scan-file');
  const started = run('node', [DRIVER, image, reports, '--tool', 'scan_file', '--', ...found['mcp.json']],
    { env: { ...env, QRSCAN_MCP_ALLOWED_DIRECTORIES: dirname(image) } });
  process.stdout.write(`${id}\n${started.stdout}`);
  if (started.status === 0) {
    await judge(id, 'server', `QRSCAN_MCP_ALLOWED_DIRECTORIES=${dirname(image)} node mcp-server.mjs --tool scan_file -- ${shell(found['mcp.json'])}`,
      reports, ['--identifier', pinned, '--url', `https://www.npmjs.com/package/${adapter.name}/v/${adapter.version}`, '--install', shell(found['mcp.json'])]);
  } else {
    results.push({ id, judged: false, note: started.stderr.trim().split('\n').slice(0, 6).join(' | ') });
  }
}

// 3. The skill's helper, from both copies, with the engine installed as SKILL.md says.
const runtime = join(work, '.qrcode-barcode-scanner-runtime');
const engine = `@qrcode-ai-com/qrcode-barcode-scanner@${version}`;
const install = ['install', '--prefix', runtime, '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', engine];
const installed = run('npm', install);
if (installed.status !== 0) throw new Error(`npm ${install.join(' ')} failed: ${installed.stderr.slice(-800)}`);
const helpers = { 'skill helper': join(stage, 'skills', NAME), 'skill helper · Junie copy': join(stage, 'junie', NAME, 'skills', NAME) };
for (const [id, folder] of Object.entries(helpers)) {
  const reports = join(out, 'reports', slug(id));
  await mkdir(reports, { recursive: true });
  let ok = true;
  for (const profile of ['fast', 'frame', 'full']) {
    const scanned = run('node', [join(folder, 'scripts/scan.mjs'), '--engine-root', runtime, '--profile', profile, '--budget-ms', '0', '--', image]);
    await writeFile(join(reports, `${profile}.json`), scanned.stdout);
    if (scanned.status !== 0) { ok = false; results.push({ id, judged: false, note: `${profile}: exit ${scanned.status} ${scanned.stderr.slice(0, 300)}` }); break; }
  }
  if (ok) {
    await judge(id, 'package', `node scan.mjs --engine-root .qrcode-barcode-scanner-runtime --profile PROFILE --budget-ms 0 -- IMAGE`, reports,
      ['--identifier', `${NAME} skill 0.2.0`, '--url', 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin', '--install', `npm ${install.join(' ')}`]);
  }
}

// 4. Removal: the copy npx kept, then the engine runtime. Each receipt records its own route's end.
await rm(join(home, '.npm', '_npx'), { recursive: true, force: true });
await rm(runtime, { recursive: true, force: true });
for (const result of results.filter((row) => row.judged)) {
  const helper = result.id.startsWith('skill helper');
  const gone = helper
    ? `node ${join(helpers[result.id], 'scripts/scan.mjs')} --engine-root ${runtime} --profile fast -- ${image}`
    : `sh -c 'npx --no ${pinned} < /dev/null'`;
  const removed = run('python3', [ACCEPTANCE, 'removed', '--gone', gone, '--uninstall', helper ? 'rm -r .qrcode-barcode-scanner-runtime' : 'rm -r ~/.npm/_npx',
    '--receipt', result.receipt]);
  const checked = run('python3', [ACCEPTANCE, 'check', result.receipt]);
  result.pass = removed.status === 0 && checked.status === 0;
  result.note = (removed.stderr + checked.stderr + checked.stdout).trim().split('\n').slice(-1)[0];
}

let failures = 0;
for (const result of results) {
  const pass = result.judged && result.pass;
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${result.id}${result.note ? ` · ${result.note}` : ''}`);
}
console.log(`${results.length - failures}/${results.length} routes pass; receipts in ${receipts}`);
process.exit(failures ? 1 : 0);
