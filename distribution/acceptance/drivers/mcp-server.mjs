// Destination acceptance, MCP server: start a server with the command a client would run, scan
// one image with the three profiles through its tool and write one JSON report per profile, for
// `scripts/destination-acceptance.py reports --kind server` to judge.
//
//   node mcp-server.mjs IMAGE OUT_DIR [--tool scan_image|scan_file] [--wait SECONDS] -- COMMAND [ARG ...]
//
// It speaks the stdio transport itself, one JSON message per line, and needs no package: what
// answers is the server the command started and nothing else. `scan_image` sends the image as
// base64; `scan_file` sends its path, which the server's operator must have allowed. The program
// also writes `server.json`: the command, what the server says it is and the tools it lists.
// It judges nothing.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const split = argv.indexOf('--');
const own = split === -1 ? argv : argv.slice(0, split);
const command = split === -1 ? [] : argv.slice(split + 1);
const options = { tool: 'scan_image', wait: '300' };
const positional = [];
for (let index = 0; index < own.length; index += 1) {
  if (own[index] === '--tool' || own[index] === '--wait') options[own[index].slice(2)] = own[index += 1];
  else positional.push(own[index]);
}
const [image, out] = positional;
const wait = Number(options.wait) * 1000;
if (!image || !out || positional.length !== 2 || command.length === 0 || !['scan_image', 'scan_file'].includes(options.tool) || !(wait > 0)) {
  console.error('usage: node mcp-server.mjs IMAGE OUT_DIR [--tool scan_image|scan_file] [--wait SECONDS] -- COMMAND [ARG ...]');
  process.exit(2);
}

const bytes = await readFile(image);
await mkdir(out, { recursive: true });
const child = spawn(command[0], command.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
const exited = new Promise((done) => {
  child.once('error', (error) => done({ error: error.message }));
  child.once('exit', (code, signal) => done({ code, signal }));
});

// One JSON message per line on stdout. Anything else there breaks the transport: say so.
const pending = new Map();
let buffered = '';
let broken = null;
child.stdout.on('data', (chunk) => {
  buffered += chunk;
  for (let end = buffered.indexOf('\n'); end !== -1; end = buffered.indexOf('\n')) {
    const line = buffered.slice(0, end).replace(/\r$/, '');
    buffered = buffered.slice(end + 1);
    if (line === '') continue;
    let message;
    try { message = JSON.parse(line); } catch { broken ??= `the server wrote a line that is not JSON on stdout: ${line.slice(0, 120)}`; continue; }
    const waiter = pending.get(message.id);
    if (waiter) { pending.delete(message.id); waiter(message); }
  }
});

let next = 0;
function request(method, params) {
  const id = next += 1;
  const answer = new Promise((done, fail) => {
    const timer = setTimeout(() => { pending.delete(id); fail(new Error(`no answer to ${method} within ${options.wait} s`)); }, wait);
    pending.set(id, (message) => { clearTimeout(timer); done(message); });
    exited.then((state) => { clearTimeout(timer); fail(new Error(`the server ended before answering ${method}: ${JSON.stringify(state)}`)); });
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })}\n`);
  return answer;
}
const result = (message, what) => {
  if (message.error) throw new Error(`${what}: ${JSON.stringify(message.error).slice(0, 300)}`);
  return message.result;
};

let status = 0;
try {
  const hello = result(await request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'qrscan-destination-acceptance', version: '1' } }), 'initialize');
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  const tools = result(await request('tools/list'), 'tools/list').tools.map(({ name }) => name);
  if (!tools.includes(options.tool)) throw new Error(`the server does not list ${options.tool}: ${tools.join(', ')}`);
  const input = options.tool === 'scan_file' ? { path: resolve(image) } : { imageBase64: bytes.toString('base64') };
  for (const profile of ['fast', 'frame', 'full']) {
    const answer = result(await request('tools/call', { name: options.tool, arguments: { ...input, profile, budgetMs: 0 } }), `tools/call ${profile}`);
    if (answer.isError || !answer.structuredContent) throw new Error(`${options.tool} ${profile} returned an error: ${JSON.stringify(answer.content).slice(0, 300)}`);
    const report = answer.structuredContent;
    await writeFile(join(out, `${profile}.json`), JSON.stringify(report));
    console.log(profile, report.detections.map((row) => `${row.symbology}:${row.content.text}`).join(' '));
  }
  if (broken) throw new Error(broken);
  // A stdio server ends when its client closes the pipe.
  child.stdin.end();
  const state = await Promise.race([exited, new Promise((done) => setTimeout(() => done({ stillRunning: true }), 15000))]);
  await writeFile(join(out, 'server.json'), `${JSON.stringify({ command, tool: options.tool, protocolVersion: hello.protocolVersion, serverInfo: hello.serverInfo, tools, afterStdinClosed: state }, null, 2)}\n`);
  if (state.stillRunning || state.code !== 0) throw new Error(`the server did not end cleanly after its input closed: ${JSON.stringify(state)}`);
} catch (error) {
  console.error(`mcp-server: ${error.message}`);
  if (stderr) console.error(`server stderr, last lines:\n${stderr}`);
  status = 1;
} finally {
  child.kill();
}
process.exit(status);
