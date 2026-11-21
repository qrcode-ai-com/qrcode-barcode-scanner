// SPDX-License-Identifier: MIT
// The MCP launch each client configuration of a staged plugin tree carries, read in that client's
// own shape: JSON server maps, the goose YAML entry, the OpenCode 1 and 2 hooks, the Pi extension,
// and the install links and the Amp, Continue and Zed entries of the README. Shared by
// check-manifests.mjs and check-launch.mjs.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SERVER = 'qrscan';

const json = async (stage, path) => JSON.parse(await readFile(join(stage, path), 'utf8'));

// One server named qrscan, and nothing else, in a JSON map of servers.
function only(map, where) {
  const names = Object.keys(map ?? {});
  if (names.length !== 1 || names[0] !== SERVER) throw new Error(`${where} declares ${JSON.stringify(names)}, not only ${SERVER}`);
  return map[SERVER];
}

function argv(entry, where, keys) {
  const extra = Object.keys(entry).filter((key) => !keys.includes(key));
  if (extra.length) throw new Error(`${where} carries ${extra.join(', ')} beside the launch`);
  if (typeof entry.command !== 'string' || !Array.isArray(entry.args)) throw new Error(`${where} has no command and args`);
  return [entry.command, ...entry.args];
}

// The goose entry is a fixed, small shape: read it line by line rather than with a YAML library.
export function gooseEntry(text) {
  const lines = text.split('\n').filter((line) => line.trim() && !line.trimStart().startsWith('#'));
  if (lines[0] !== 'extensions:' || lines[1] !== `  ${SERVER}:`) throw new Error('goose: the file is not one extensions.qrscan entry');
  const entry = {};
  for (const line of lines.slice(2)) {
    const match = /^ {4}([a-z_]+): (.+)$/.exec(line);
    if (!match) throw new Error(`goose: unexpected line ${JSON.stringify(line)}`);
    // A bare word is a plain scalar; numbers, booleans and flow collections are valid JSON here.
    const bare = /^[a-z][a-z0-9_]*$/.test(match[2]) && !['true', 'false', 'null'].includes(match[2]);
    entry[match[1]] = bare ? match[2] : JSON.parse(match[2]);
  }
  return entry;
}

// A scalar of the Continue entry: a quoted string, a whole number or a plain word.
const scalar = (text) => (text.startsWith('"') ? JSON.parse(text) : /^\d+$/.test(text) ? Number(text) : text);

// The Continue block is a fixed, small YAML shape too: one stdio server under mcpServers.
export function continueEntry(text) {
  const lines = text.split('\n').filter((line) => line.trim() && !line.trimStart().startsWith('#'));
  if (!/^name: \S/.test(lines[0]) || !/^version: \d+\.\d+\.\d+$/.test(lines[1]) || lines[2] !== 'schema: v1'
    || lines[3] !== 'mcpServers:' || lines[4] !== `  - name: ${SERVER}`) {
    throw new Error('Continue: the block is not one mcpServers item named qrscan with name, version and schema v1');
  }
  const entry = { name: SERVER };
  let list;
  for (const line of lines.slice(5)) {
    const item = /^ {6}- (.+)$/.exec(line);
    if (item && list) { list.push(scalar(item[1])); continue; }
    const match = /^ {4}([A-Za-z]+):(?: (.+))?$/.exec(line);
    if (!match || match[1] in entry) throw new Error(`Continue: unexpected line ${JSON.stringify(line)}`);
    list = match[2] === undefined ? [] : undefined;
    entry[match[1]] = list ?? scalar(match[2]);
  }
  return entry;
}

// The client entries the README gives as text: the Amp command and settings, the Continue block
// and the Zed settings. Each one must appear exactly once.
export function readmeEntries(readme) {
  const fences = [...readme.matchAll(/^```(\w*)\n([\s\S]*?)^```$/gm)].map((match) => ({ lang: match[1], body: match[2] }));
  const one = (where, pick) => {
    const blocks = fences.filter(pick);
    if (blocks.length !== 1) throw new Error(`README.md holds ${blocks.length} ${where} blocks, expected one`);
    return blocks[0].body;
  };
  const amp = [...readme.matchAll(/^amp mcp add (\S+) -- (.+)$/gm)];
  if (amp.length !== 1 || amp[0][1] !== SERVER) throw new Error(`README.md holds ${amp.length} amp mcp add lines (${amp.map((line) => line[1]).join(', ')}), expected one for ${SERVER}`);
  return {
    ampCommand: amp[0][2].split(' '),
    ampSettings: JSON.parse(one('Amp settings', (block) => block.lang === 'json' && block.body.includes('"amp.mcpServers"'))),
    continueEntry: continueEntry(one('Continue', (block) => block.lang === 'yaml' && block.body.includes('mcpServers:'))),
    zedSettings: JSON.parse(one('Zed settings', (block) => block.lang === 'json' && block.body.includes('"context_servers"'))),
  };
}

function fromLink(url, where) {
  const parsed = new URL(url);
  const name = parsed.searchParams.get('name');
  if (name !== SERVER) throw new Error(`${where}: the link names ${name}, not ${SERVER}`);
  const config = JSON.parse(Buffer.from(parsed.searchParams.get('config'), 'base64').toString('utf8'));
  return argv(config, where, ['command', 'args']);
}

// Every launch, keyed by where it is read. Values are argv arrays: [command, ...args].
export async function launches(stage) {
  const found = {};
  const mcp = await json(stage, 'mcp.json');
  const typed = only(mcp.mcpServers, 'mcp.json');
  if (typed.type !== 'stdio') throw new Error('mcp.json: the Agent Plugins server must say type stdio');
  found['mcp.json'] = argv(typed, 'mcp.json', ['type', 'command', 'args']);
  found['.mcp.json'] = argv(only((await json(stage, '.mcp.json')).mcpServers, '.mcp.json'), '.mcp.json', ['command', 'args']);
  found['mcp_config.json'] = argv(only((await json(stage, 'mcp_config.json')).mcpServers, 'mcp_config.json'), 'mcp_config.json', ['command', 'args']);
  found['gemini-extension.json'] = argv(only((await json(stage, 'gemini-extension.json')).mcpServers, 'gemini-extension.json'), 'gemini-extension.json', ['command', 'args']);
  found['kimi.plugin.json'] = argv(only((await json(stage, 'kimi.plugin.json')).mcpServers, 'kimi.plugin.json'), 'kimi.plugin.json', ['command', 'args']);
  const junie = 'junie/qrcode-barcode-scanner/mcp/.mcp.json';
  const junieEntry = only((await json(stage, junie)).mcpServers, junie);
  if (!Number.isInteger(junieEntry.timeout) || junieEntry.timeout < 60000) throw new Error(`${junie}: the first npx start needs a timeout of at least a minute`);
  found[junie] = argv(junieEntry, junie, ['command', 'args', 'timeout']);
  const goose = gooseEntry(await readFile(join(stage, 'goose/qrscan-extension.yaml'), 'utf8'));
  if (goose.type !== 'stdio' || goose.name !== SERVER || goose.enabled !== true) throw new Error('goose: the entry is not an enabled stdio extension named qrscan');
  found['goose/qrscan-extension.yaml'] = [goose.cmd, ...goose.args];

  const plugin = (await import(pathToFileURL(join(stage, 'opencode/plugin.mjs')).href)).default;
  const config = {};
  await (await plugin.server()).config(config);
  found['opencode/plugin.mjs (OpenCode 1)'] = config.mcp[SERVER].command;
  let set;
  await plugin.setup({
    mcp: { transform: async (edit) => edit({ get: () => undefined, set: (name, value) => { set = { name, value }; } }) },
    skill: { transform: async (edit) => edit({ get: () => undefined, add: () => {} }) },
  });
  if (set?.name !== SERVER) throw new Error('opencode/plugin.mjs: OpenCode 2 setup sets no qrscan server');
  found['opencode/plugin.mjs (OpenCode 2)'] = set.value.command;

  const extension = (await import(pathToFileURL(join(stage, 'pi/extension.js')).href)).default;
  const registered = [];
  extension({ registerMcpServer: (name, value) => registered.push({ name, value }) });
  if (registered.length !== 1 || registered[0].name !== SERVER) throw new Error('pi/extension.js does not register exactly the qrscan server');
  found['pi/extension.js'] = argv(registered[0].value, 'pi/extension.js', ['command', 'args', 'description']);

  const readme = await readFile(join(stage, 'README.md'), 'utf8');
  const web = readme.match(/\]\((https:\/\/cursor\.com\/install-mcp\?[^)\s]+)\)/g) ?? [];
  if (web.length !== 1) throw new Error(`README.md holds ${web.length} Cursor web install links, expected one`);
  found['README.md · Cursor web link'] = fromLink(web[0].slice(2, -1), 'README.md · Cursor web link');
  const deep = readme.match(/cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?\S+/g) ?? [];
  if (deep.length !== 1) throw new Error(`README.md holds ${deep.length} cursor:// links, expected one`);
  found['README.md · cursor://'] = fromLink(deep[0].replace(/^cursor:\/\/anysphere\.cursor-deeplink/, 'https://cursor.invalid'), 'README.md · cursor://');
  const decoded = readme.match(/^\{"command":.+\}$/m);
  if (!decoded) throw new Error('README.md does not show the decoded Cursor configuration');
  found['README.md · decoded configuration'] = argv(JSON.parse(decoded[0]), 'README.md · decoded configuration', ['command', 'args']);
  const gooseLinks = readme.match(/goose:\/\/extension\?\S+/g) ?? [];
  if (gooseLinks.length !== 1) throw new Error(`README.md holds ${gooseLinks.length} goose links, expected one`);
  const link = new URL(gooseLinks[0].replace(/^goose:/, 'https:'));
  if (link.searchParams.get('id') !== SERVER) throw new Error('README.md · goose link: the id is not qrscan');
  found['README.md · goose://'] = [link.searchParams.get('cmd'), ...link.searchParams.getAll('arg')];
  const lines = [...readme.matchAll(/^npx (.+)$/gm)].map((match) => ['npx', ...match[1].split(' ')]);
  if (lines.length !== 1) throw new Error(`README.md holds ${lines.length} npx command lines, expected one`);
  found['README.md · server command'] = lines[0];
  const flag = readme.match(/--with-extension "([^"]+)"/);
  if (!flag) throw new Error('README.md has no goose --with-extension command');
  found['README.md · goose --with-extension'] = flag[1].split(' ');

  const entries = readmeEntries(readme);
  found['README.md · amp mcp add'] = entries.ampCommand;
  const ampKeys = Object.keys(entries.ampSettings);
  if (ampKeys.length !== 1 || ampKeys[0] !== 'amp.mcpServers') throw new Error(`README.md · Amp settings set ${ampKeys.join(', ')}`);
  found['README.md · Amp settings'] = argv(only(entries.ampSettings['amp.mcpServers'], 'README.md · Amp settings'), 'README.md · Amp settings', ['command', 'args']);
  const { name, type, connectionTimeout, ...launch } = entries.continueEntry;
  if (type !== 'stdio') throw new Error(`README.md · Continue: the server type is ${type}, not stdio`);
  if (!Number.isInteger(connectionTimeout) || connectionTimeout < 60000) throw new Error('README.md · Continue: the first npx start needs a connectionTimeout of at least a minute');
  found['README.md · Continue'] = argv(launch, 'README.md · Continue', ['command', 'args']);
  const zedKeys = Object.keys(entries.zedSettings);
  if (zedKeys.length !== 1 || zedKeys[0] !== 'context_servers') throw new Error(`README.md · Zed settings set ${zedKeys.join(', ')}`);
  found['README.md · Zed settings'] = argv(only(entries.zedSettings.context_servers, 'README.md · Zed settings'), 'README.md · Zed settings', ['command', 'args']);
  return found;
}
