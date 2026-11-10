// Destination acceptance, Binder: launch a session of a public repository on a BinderHub, run
// commands in it and read files back, so that a notebook host can be judged without a browser.
//
//   node binder-session.mjs launch HUB SPEC SESSION [--wait SECONDS] [--log FILE]
//   node binder-session.mjs run SESSION [--wait SECONDS] -- COMMAND [ARGUMENT...]
//   node binder-session.mjs fetch SESSION REMOTE_PATH LOCAL_PATH
//
// `launch` asks HUB (https://mybinder.org) to build and start SPEC
// (gh/OWNER/REPOSITORY/REF) through the hub's public build address, follows the build log and
// writes SESSION: the session's address and its access token, the hub that served it and the
// image it built. SESSION holds a token: keep it out of any repository. `run` executes one
// command in the session, in the repository's folder, prints what it printed and exits with its
// exit code. `fetch` copies one file of the session to this machine.
//
// Needs Node.js 22 or later and nothing else. It judges nothing: the reports it brings back go to
// scripts/destination-acceptance.py. mybinder.org limits launches from most cloud providers, so
// run it from an ordinary machine. A session ends by itself after about ten minutes of inactivity.
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

function usage() {
  console.error('usage: node binder-session.mjs launch HUB SPEC SESSION [--wait SECONDS] [--log FILE]\n'
    + '       node binder-session.mjs run SESSION [--wait SECONDS] -- COMMAND [ARGUMENT...]\n'
    + '       node binder-session.mjs fetch SESSION REMOTE_PATH LOCAL_PATH');
  process.exit(2);
}

// Options before `--`; what follows `--` is the command, untouched.
const raw = process.argv.slice(2);
const split = raw.indexOf('--');
const head = split === -1 ? raw : raw.slice(0, split);
const command = split === -1 ? [] : raw.slice(split + 1);
const options = { wait: null, log: null };
const positional = [];
for (let index = 0; index < head.length; index += 1) {
  if (head[index] === '--wait') options.wait = Number(head[index += 1]);
  else if (head[index] === '--log') options.log = head[index += 1];
  else positional.push(head[index]);
}
const [action, ...rest] = positional;

async function session(file) {
  const { url, token } = JSON.parse(await readFile(file, 'utf8'));
  return { url, headers: { Authorization: `token ${token}` }, token };
}

async function launch(hub, spec, file) {
  const wait = (options.wait ?? 1800) * 1000;
  const response = await fetch(`${hub.replace(/\/$/, '')}/build/${spec}`, {
    headers: { Accept: 'text/event-stream' }, signal: AbortSignal.timeout(wait) });
  if (!response.ok) throw new Error(`the hub answered HTTP ${response.status}`);
  const log = [];
  const seen = { phases: [], image: null };
  let buffer = '';
  for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue; // a heartbeat or a comment
        const event = JSON.parse(line.slice(5));
        if (event.phase && seen.phases.at(-1) !== event.phase) seen.phases.push(event.phase);
        if (event.imageName) seen.image = event.imageName;
        const message = String(event.message ?? '').trimEnd();
        if (message) {
          log.push(`[${event.phase}] ${message}`);
          if (event.phase !== 'building' && event.phase !== 'pushing') console.error(`[${event.phase}] ${message}`);
        }
        if (event.phase === 'failed') throw new Error(`the launch failed: ${message}`);
        if (event.phase === 'ready') {
          if (options.log) await writeFile(options.log, `${log.join('\n')}\n`);
          await mkdir(dirname(file), { recursive: true });
          await writeFile(file, `${JSON.stringify({ url: event.url, token: event.token, hub,
            served_by: new URL(response.url).origin, spec, image: seen.image, phases: seen.phases,
            ready_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }, null, 2)}\n`);
          await chmod(file, 0o600);
          console.log(`ready: ${new URL(event.url).origin} (served by ${new URL(response.url).origin})`);
          return 0;
        }
      }
    }
  }
  if (options.log) await writeFile(options.log, `${log.join('\n')}\n`);
  throw new Error('the hub closed the build log before the session was ready');
}

// One command, through a Python kernel of the session: the kernel runs it and reports its exit code.
async function run(file, argv) {
  const { url, headers, token } = await session(file);
  const wait = (options.wait ?? 600) * 1000;
  const started = await fetch(`${url}api/kernels`, { method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'python3' }) });
  if (!started.ok) throw new Error(`the session refused a kernel: HTTP ${started.status}`);
  const kernel = await started.json();
  const code = 'import subprocess, sys\n'
    + `_done = subprocess.run(${JSON.stringify(argv)}, capture_output=True, text=True)\n`
    + 'sys.stdout.write(_done.stdout)\nsys.stderr.write(_done.stderr)\n'
    + 'print("\\n__exit__", _done.returncode)\n';
  const id = randomUUID();
  const socket = new WebSocket(`${url.replace(/^http/, 'ws')}api/kernels/${kernel.id}/channels?token=${token}`);
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no answer from the session in ${wait / 1000} s`)), wait);
      let out = '';
      const finish = (value) => { clearTimeout(timer); resolve(value); };
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('the kernel connection failed')); });
      socket.addEventListener('open', () => socket.send(JSON.stringify({
        header: { msg_id: id, msg_type: 'execute_request', session: randomUUID(), username: 'acceptance', version: '5.3' },
        parent_header: {}, metadata: {}, channel: 'shell',
        content: { code, silent: false, store_history: false, user_expressions: {}, allow_stdin: false, stop_on_error: true },
      })));
      socket.addEventListener('message', ({ data }) => {
        const message = JSON.parse(data);
        if (message.parent_header?.msg_id !== id) return;
        const { msg_type: type, content } = message;
        if (type === 'stream' && content.name === 'stderr') process.stderr.write(content.text);
        else if (type === 'stream') out += content.text;
        else if (type === 'error') process.stderr.write(`${content.ename}: ${content.evalue}\n`);
        else if (type === 'execute_reply') {
          const mark = out.lastIndexOf('\n__exit__ ');
          process.stdout.write(mark === -1 ? out : out.slice(0, mark));
          finish(content.status === 'ok' && mark !== -1 ? Number(out.slice(mark + 10)) : 1);
        }
      });
    });
  } finally {
    socket.close();
    await fetch(`${url}api/kernels/${kernel.id}`, { method: 'DELETE', headers }).catch(() => {});
  }
}

async function fetchFile(file, remote, local) {
  const { url, headers } = await session(file);
  const path = remote.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${url}api/contents/${path}?content=1`, { headers });
  if (!response.ok) throw new Error(`the session has no ${remote}: HTTP ${response.status}`);
  const model = await response.json();
  const bytes = model.format === 'base64' ? Buffer.from(model.content, 'base64')
    : Buffer.from(model.format === 'json' ? `${JSON.stringify(model.content, null, 1)}\n` : model.content);
  await mkdir(dirname(local), { recursive: true });
  await writeFile(local, bytes);
  console.log(`${remote}: ${bytes.length} bytes`);
  return 0;
}

try {
  if (action === 'launch' && rest.length === 3) process.exitCode = await launch(...rest);
  else if (action === 'run' && rest.length === 1 && command.length > 0) process.exitCode = await run(rest[0], command);
  else if (action === 'fetch' && rest.length === 3) process.exitCode = await fetchFile(...rest);
  else usage();
} catch (error) {
  console.error(`binder-session: ${error.message}`);
  process.exitCode = 1;
}
