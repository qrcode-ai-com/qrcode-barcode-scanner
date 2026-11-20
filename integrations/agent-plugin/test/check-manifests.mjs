// SPDX-License-Identifier: MIT
// Check a staged plugin tree without starting anything: each manifest against its published JSON
// schema where one exists, one name, version and repository across every client file, the same
// reviewed MCP launch in every client configuration and install link, the paths the manifests
// name, the skill copies, and the OpenCode and Pi entry points run against stand-in hosts.
//
//   node check-manifests.mjs STAGE --tools DIR [--schemas DIR]
//
// STAGE is the output of `scripts/stage-agent-plugin-satellite.py stage`. DIR under --tools holds
// node_modules with ajv and ajv-formats (development dependencies only). Schemas are fetched from
// their published URLs; --schemas keeps a copy there and reads it back on the next run. Exit 0
// when every check passes, 1 when one fails, 2 for usage.
import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launches, SERVER } from './launches.mjs';

const ENGINE = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const NAME = 'qrcode-barcode-scanner';
const MARKETPLACE = 'qrcode-ai-com';
const SATELLITE = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin';
const HOMEPAGE = 'https://qrcode-ai.com/';
const SCHEMAS = {
  'plugin.json': 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  'mcp.json': 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
  '.claude-plugin/plugin.json': 'https://json.schemastore.org/claude-code-plugin-manifest.json',
  '.claude-plugin/marketplace.json': 'https://json.schemastore.org/claude-code-marketplace.json',
  '.antigravity-plugin/plugin.json': 'https://antigravity.google/schemas/v1/plugin.json',
};
const OPENCODE_SCHEMA = 'https://opencode.ai/config.json';

const args = process.argv.slice(2);
const option = (flag) => { const at = args.indexOf(flag); return at === -1 ? undefined : args.splice(at, 2)[1]; };
const tools = option('--tools');
const cache = option('--schemas');
const [stage] = args;
if (!stage || !tools || args.length !== 1) {
  console.error('usage: node check-manifests.mjs STAGE --tools DIR [--schemas DIR]');
  process.exit(2);
}
const require = createRequire(join(resolve(tools), 'noop.js'));
const Ajv7 = require('ajv').default;
const Ajv2020 = require('ajv/dist/2020').default;
const formats = require('ajv-formats').default;

let failed = 0;
async function check(name, run) {
  try {
    const note = await run();
    console.log(`ok    ${name}${note ? ` · ${note}` : ''}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${name} · ${error.message}`);
  }
}
const expect = (condition, message) => { if (!condition) throw new Error(message); };
const read = (path) => readFile(join(stage, path), 'utf8');
const json = async (path) => JSON.parse(await read(path));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A published schema, fetched once per run (three tries: a schema host can be slow to answer).
const fetched = new Map();
async function schema(url) {
  const file = cache && join(cache, url.replace(/^https:\/\//, '').replaceAll('/', '_'));
  let text = fetched.get(url);
  if (text === undefined && file && existsSync(file)) text = await readFile(file, 'utf8');
  for (let attempt = 1; text === undefined; attempt += 1) {
    try {
      const answer = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
      expect(answer.ok, `${url} answered ${answer.status}`);
      text = await answer.text();
    } catch (error) {
      if (attempt === 3) throw new Error(`${url}: ${error.cause?.code ?? error.message}`);
      await new Promise((done) => setTimeout(done, 2000 * attempt));
    }
  }
  fetched.set(url, text);
  if (file && !existsSync(file)) { await mkdir(cache, { recursive: true }); await writeFile(file, text); }
  return { body: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex').slice(0, 12) };
}
// A validator for BODY, with the other published schemas it references loaded too.
async function validator(body) {
  const Ajv = String(body.$schema).includes('2020-12') ? Ajv2020 : Ajv7;
  const ajv = new Ajv({ strict: false, allErrors: true });
  formats(ajv);
  ajv.addSchema(body, 'root');
  const loaded = new Set([body.$id]);
  const pending = [body];
  while (pending.length) {
    const refs = JSON.stringify(pending.pop()).matchAll(/"\$ref":"(https:\/\/[^"#]+)/g);
    for (const [, url] of refs) {
      if (loaded.has(url)) continue;
      loaded.add(url);
      const other = (await schema(url)).body;
      ajv.addSchema(other, url);
      pending.push(other);
    }
  }
  return (pointer = '') => ajv.compile({ $ref: `root#${pointer}` });
}
const errors = (validate) => (validate.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ');

// Every manifest that has a published schema, against the schema it names.
for (const [path, url] of Object.entries(SCHEMAS)) {
  await check(`${path} matches ${url}`, async () => {
    const manifest = await json(path);
    expect(manifest.$schema === url, `$schema is ${manifest.$schema}`);
    const { body, sha256 } = await schema(url);
    const validate = (await validator(body))();
    expect(validate(manifest), errors(validate));
    return `schema sha256 ${sha256}`;
  });
}

// Every JSON file of the stage parses, and none is empty.
await check('every JSON file parses', async () => {
  const files = [];
  const walk = async (folder) => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.json')) files.push(path);
    }
  };
  await walk(stage);
  for (const file of files) JSON.parse(await readFile(file, 'utf8'));
  return `${files.length} files`;
});

// One identity: name, version, repository, homepage and license agree in every client file.
await check('one name, version and repository in every manifest', async () => {
  const pkg = await json('package.json');
  const version = pkg.version;
  expect(/^\d+\.\d+\.\d+$/.test(version), `package.json version ${version} is not X.Y.Z`);
  const named = {
    'plugin.json': await json('plugin.json'),
    '.claude-plugin/plugin.json': await json('.claude-plugin/plugin.json'),
    '.antigravity-plugin/plugin.json': await json('.antigravity-plugin/plugin.json'),
    '.cursor-plugin/plugin.json': await json('.cursor-plugin/plugin.json'),
    'gemini-extension.json': await json('gemini-extension.json'),
    'kimi.plugin.json': await json('kimi.plugin.json'),
  };
  for (const [path, manifest] of Object.entries(named)) {
    expect(manifest.name === NAME, `${path} is named ${manifest.name}`);
    expect(manifest.version === version, `${path} has version ${manifest.version}, package.json ${version}`);
    if ('repository' in manifest) expect(manifest.repository === SATELLITE, `${path} names repository ${manifest.repository}`);
    if ('homepage' in manifest) expect(manifest.homepage === HOMEPAGE, `${path} names homepage ${manifest.homepage}`);
    if ('license' in manifest) expect(manifest.license === 'MIT', `${path} states license ${manifest.license}`);
  }
  const claude = await json('.claude-plugin/marketplace.json');
  expect(claude.name === MARKETPLACE && claude.plugins.length === 1, 'the Claude marketplace is not one qrcode-ai-com entry');
  expect(claude.plugins[0].name === NAME && claude.plugins[0].version === version && claude.plugins[0].source === './',
    'the Claude marketplace entry is not this plugin at the root');
  const codex = await json('.agents/plugins/marketplace.json');
  expect(codex.name === MARKETPLACE && codex.plugins.length === 1 && codex.plugins[0].name === NAME, 'the Codex marketplace is not one qrcode-ai-com entry');
  expect(same(codex.plugins[0].source, { source: 'local', path: './' }), 'the Codex entry does not point at the root');
  expect(codex.plugins[0].policy.installation === 'AVAILABLE', 'the Codex entry is not installable');
  const junie = await json('.junie-extension/marketplace.json');
  expect(junie.name === MARKETPLACE && junie.extensions.length === 1, 'the Junie marketplace is not one qrcode-ai-com entry');
  expect(junie.extensions[0].name === NAME && junie.extensions[0].version === version, 'the Junie entry is not this extension');
  expect((await json(`${junie.extensions[0].source}/extension.json`)).name === NAME, 'the Junie extension folder names another extension');
  expect(pkg.name === '@qrcode-ai-com/qrcode-barcode-scanner-plugin' && pkg.license === 'MIT', 'package.json is not the scoped MIT package');
  expect(pkg.repository?.url === `git+${SATELLITE}.git`, `package.json names repository ${pkg.repository?.url}`);
  return `${NAME} ${version}`;
});

// The paths the manifests name exist in the stage.
await check('the paths the manifests name exist', async () => {
  const plugin = await json('plugin.json');
  const openai = plugin.extensions['com.openai'].interface;
  const paths = [openai.composerIcon, openai.logo, (await json('.antigravity-plugin/plugin.json')).logo,
    (await json('.cursor-plugin/plugin.json')).logo, `${(await json('kimi.plugin.json')).skills}${NAME}/SKILL.md`];
  const pkg = await json('package.json');
  paths.push(pkg.exports['./server'], ...pkg.pi.extensions, ...pkg.pi.skills.map((folder) => `${folder}/${NAME}/SKILL.md`));
  for (const path of paths) expect(existsSync(join(stage, path)), `${path} is missing`);
  return `${paths.length} paths`;
});

// The skill: the copy every client reads and the Junie copy are the same skill 0.2.0.
await check('the skill copies are skill 0.2.0 and equal', async () => {
  const root = await read(`skills/${NAME}/SKILL.md`);
  const front = /^---\n([\s\S]*?)\n---\n/.exec(root)?.[1] ?? '';
  expect(/^name: qrcode-barcode-scanner$/m.test(front), 'SKILL.md is not named qrcode-barcode-scanner');
  expect(/^ {2}version: "0\.2\.0"$/m.test(front), 'SKILL.md is not version 0.2.0');
  expect(/^ {2}engine: "@qrcode-ai-com\/qrcode-barcode-scanner@0\.11\.0"$/m.test(front), 'SKILL.md does not pin engine 0.11.0');
  const list = async (folder) => (await readdir(folder, { recursive: true }))
    .filter((file) => statSync(join(folder, file)).isFile()).sort();
  const files = await list(join(stage, 'skills', NAME));
  const junie = join('junie', NAME, 'skills', NAME);
  expect(same(files, await list(join(stage, junie))), `${junie} holds other files`);
  for (const file of files) {
    expect((await readFile(join(stage, 'skills', NAME, file))).equals(await readFile(join(stage, junie, file))), `${junie}/${file} differs`);
  }
  return `${files.length} files, twice`;
});

// Every client configuration and install link starts the reviewed launch and nothing else.
await check('every launch is the reviewed pinned launch', async () => {
  const reviewed = JSON.parse(await readFile(join(ENGINE, 'distribution/readme-actions.json'), 'utf8')).mcpLaunch;
  const adapter = JSON.parse(await readFile(join(ENGINE, 'integrations/mcp/package.json'), 'utf8'));
  const want = [reviewed.command, ...reviewed.args];
  expect(want.at(-1) === `${adapter.name}@${adapter.version}`, `the reviewed launch pins ${want.at(-1)}, the adapter is ${adapter.version}`);
  const found = await launches(stage);
  for (const [where, got] of Object.entries(found)) expect(same(got, want), `${where} starts ${JSON.stringify(got)}`);
  return `${Object.keys(found).length} configurations start ${want.join(' ')}`;
});

// No text file of the plugin itself names the adapter without its exact version.
await check('no unpinned adapter reference', async () => {
  const own = ['README.md', 'plugin.json', 'mcp.json', '.mcp.json', 'mcp_config.json', 'gemini-extension.json', 'kimi.plugin.json',
    `junie/${NAME}/mcp/.mcp.json`, 'goose/qrscan-extension.yaml', 'opencode/plugin.mjs', 'pi/extension.js', 'package.json'];
  for (const path of own) {
    for (const match of (await read(path)).matchAll(/@qrcode-ai-com\/qrcode-barcode-scanner-mcp(@\d+\.\d+\.\d+(?:-[\w.]+)?|@[A-Za-z][\w.-]*)?/g)) {
      expect(match[1] === '@0.3.1', `${path} names ${match[0]}`);
    }
    expect(!(await read(path)).includes('@latest'), `${path} names @latest`);
  }
  return `${own.length} files`;
});

// The Cursor rule is a valid, opt-in rule with a description.
await check('the Cursor rule has its frontmatter', async () => {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(await read(`rules/${NAME}.mdc`))?.[1] ?? '';
  expect(/^description: \S.+$/m.test(front) && /^alwaysApply: false$/m.test(front), 'description or alwaysApply: false is missing');
});

// package.json: Pi runs npm install on it, so it carries no dependency and no script.
await check('package.json installs nothing and runs nothing', async () => {
  const pkg = await json('package.json');
  for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies', 'scripts', 'bin']) expect(!(key in pkg), `package.json declares ${key}`);
  expect(pkg.type === 'module' && pkg.keywords.includes('pi-package'), 'package.json is not an ES module tagged pi-package');
  const adapter = JSON.parse(await readFile(join(ENGINE, 'integrations/mcp/package.json'), 'utf8'));
  expect(pkg.engines?.node === adapter.engines.node, `engines.node ${pkg.engines?.node} differs from the adapter's ${adapter.engines.node}`);
});

// OpenCode 1: the config hook adds the server and the skills folder, keeps the user's own entries,
// and its result is a valid OpenCode configuration.
await check('OpenCode 1 config hook', async () => {
  const plugin = (await import(pathToFileURL(join(stage, 'opencode/plugin.mjs')).href)).default;
  const hooks = await plugin.server();
  const config = { $schema: OPENCODE_SCHEMA };
  await hooks.config(config);
  await hooks.config(config);
  const skills = resolve(stage, 'skills');
  expect(same(config.mcp, { [SERVER]: { type: 'local', command: config.mcp[SERVER].command, enabled: true } }), 'mcp is not one enabled local qrscan server');
  expect(same(config.skills, { paths: [skills] }), `skills is ${JSON.stringify(config.skills)}`);
  const own = { mcp: { [SERVER]: { type: 'local', command: ['my-qrscan'] } }, skills: ['/my/skills'] };
  await hooks.config(own);
  expect(same(own.mcp[SERVER].command, ['my-qrscan']), 'a server the user named qrscan was replaced');
  expect(same(own.skills, ['/my/skills', skills]), `a list of skill folders became ${JSON.stringify(own.skills)}`);
  const { body, sha256 } = await schema(OPENCODE_SCHEMA);
  const validate = (await validator(body))();
  expect(validate(config), errors(validate));
  return `valid against ${OPENCODE_SCHEMA} (sha256 ${sha256})`;
});

// OpenCode 2: setup changes servers and skills only through their transforms.
await check('OpenCode 2 setup', async () => {
  const plugin = (await import(pathToFileURL(join(stage, 'opencode/plugin.mjs')).href)).default;
  expect(plugin.id === NAME, `the plugin id is ${plugin.id}`);
  const servers = new Map([['other', { type: 'remote', url: 'https://example.test' }]]);
  const skills = new Map();
  const editor = (map, write) => ({ get: (key) => map.get(key), list: () => [...map.values()], [write]: (...value) => (value.length === 2 ? map.set(...value) : map.set(value[0].id, value[0])) });
  const ctx = { mcp: { transform: async (edit) => edit(editor(servers, 'set')) }, skill: { transform: async (edit) => edit(editor(skills, 'add')) } };
  await plugin.setup(ctx);
  await plugin.setup(ctx);
  expect(servers.size === 2 && servers.get('other').url === 'https://example.test', 'another server changed');
  const { body } = await schema(OPENCODE_SCHEMA);
  const validate = (await validator(body))('/$defs/Mcp.LocalConfigEncoded');
  expect(validate(servers.get(SERVER)), errors(validate));
  const text = await read(`skills/${NAME}/SKILL.md`);
  const skill = skills.get(NAME);
  expect(skill && skill.name === NAME && resolve(skill.path) === resolve(stage, 'skills', NAME, 'SKILL.md'), 'the skill is not added from the shipped SKILL.md');
  expect(text.endsWith(skill.content) && text.includes(`description: ${skill.description}\n`), 'the skill body or description differs from SKILL.md');
  servers.set(SERVER, { type: 'local', command: ['my-qrscan'] });
  await plugin.setup(ctx);
  expect(same(servers.get(SERVER).command, ['my-qrscan']), 'a server the user named qrscan was replaced');
  return 'server valid against Mcp.LocalConfigEncoded';
});

// Pi: the extension registers one stdio server with documented keys only.
await check('Pi extension', async () => {
  const extension = (await import(pathToFileURL(join(stage, 'pi/extension.js')).href)).default;
  const calls = [];
  extension({ registerMcpServer: (name, config) => calls.push([name, config]) });
  const documented = ['command', 'args', 'env', 'cwd', 'url', 'headers', 'oauth', 'exposure', 'toolExposure', 'description', 'enabled', 'timeout'];
  expect(calls.length === 1 && calls[0][0] === SERVER, 'not exactly one qrscan registration');
  const extra = Object.keys(calls[0][1]).filter((key) => !documented.includes(key));
  expect(extra.length === 0, `undocumented keys ${extra.join(', ')}`);
});

// The README: every link stays inside the stage or is absolute.
await check('README links work in the plugin repository', async () => {
  const readme = await read('README.md');
  const relative = [...readme.matchAll(/\]\((?!https:\/\/|#)([^)]+)\)/g)].map((match) => match[1]);
  for (const path of relative) expect(existsSync(join(stage, path)), `${path} is not in the stage`);
  return `${relative.length} relative links`;
});

console.log(failed ? `${failed} check(s) failed in ${relative(process.cwd(), stage) || stage}` : 'all checks passed');
process.exit(failed ? 1 : 0);
