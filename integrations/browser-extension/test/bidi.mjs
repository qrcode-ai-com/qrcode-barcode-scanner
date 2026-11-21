// A small WebDriver BiDi client for Firefox, and a page object with the few methods that
// test/page-contract.mjs calls (evaluate, waitForFunction, selectOption, inputValue,
// setInputFiles, url), so the same contract drives an installed add-on.
//
// Written here rather than taken from a package: Playwright cannot install a Firefox add-on, and
// Firefox's own WebDriver BiDi can (`webExtension.install`). The client needs Node.js 22's
// global WebSocket and nothing else.
import { spawn } from 'node:child_process';

/**
 * Start `binary` with a new profile and WebDriver BiDi on a free port. Resolves once Firefox
 * prints the address it listens on.
 */
export function launchFirefox(binary, { profile, headless }) {
  const args = ['--remote-debugging-port', '0', '--profile', profile, '--no-remote',
    '--new-instance'];
  if (headless) args.push('--headless');
  const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Firefox did not start WebDriver BiDi in 90 s:\n${log.slice(-3000)}`));
    }, 90000);
    const read = (chunk) => {
      log += chunk;
      const match = /WebDriver BiDi listening on (ws:\/\/\S+)/.exec(log);
      if (match) {
        clearTimeout(timer);
        resolve({ child, url: match[1] });
      }
    };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Firefox exited with ${code}:\n${log.slice(-3000)}`));
    });
  });
}

export class Bidi {
  static async connect(url) {
    const socket = new WebSocket(`${url}/session`);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', () => reject(new Error(`cannot connect to ${url}`)),
        { once: true });
    });
    return new Bidi(socket);
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'event') {
        for (const listener of this.listeners) listener(message);
        return;
      }
      const waiting = this.pending.get(message.id);
      if (!waiting) return;
      this.pending.delete(message.id);
      if (message.type === 'success') waiting.resolve(message.result);
      else waiting.reject(new Error(`${waiting.method}: ${message.error}: ${message.message}`));
    });
  }

  /** One command; resolves with its result, rejects with the BiDi error. */
  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const reply = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return reply;
  }

  onEvent(listener) {
    this.listeners.push(listener);
  }

  close() {
    this.socket.close();
  }
}

const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });

/** A top-level browsing context, with the page methods the page contract uses. */
export class BidiPage {
  constructor(bidi, context) {
    this.bidi = bidi;
    this.context = context;
    this.address = 'about:blank';
  }

  url() {
    return this.address;
  }

  async goto(url) {
    const result = await this.bidi.send('browsingContext.navigate',
      { context: this.context, url, wait: 'complete' });
    this.address = result.url ?? url;
    return result;
  }

  /**
   * Run `fn(arg)` in the page and return its value. The argument and the value cross as JSON,
   * which is all the page contract passes.
   */
  async evaluate(fn, arg) {
    const result = await this.bidi.send('script.callFunction', {
      functionDeclaration: `async (json) => JSON.stringify((await (${fn})(JSON.parse(json))) `
        + '?? null)',
      arguments: [{ type: 'string', value: JSON.stringify(arg === undefined ? null : arg) }],
      target: { context: this.context },
      awaitPromise: true,
      resultOwnership: 'none',
    });
    if (result.type === 'exception') {
      throw new Error(`in the page: ${result.exceptionDetails.text}`);
    }
    return JSON.parse(result.result.value);
  }

  /** Resolves once `fn(arg)` is truthy, polling every 100 ms, or rejects after `timeout` ms. */
  async waitForFunction(fn, arg, { timeout = 30000 } = {}) {
    const until = Date.now() + timeout;
    for (;;) {
      const value = await this.evaluate(fn, arg).catch(() => false);
      if (value) return value;
      if (Date.now() > until) throw new Error(`waitForFunction timed out after ${timeout} ms`);
      await sleep(100);
    }
  }

  inputValue(selector) {
    return this.evaluate((query) => document.querySelector(query).value, selector);
  }

  /** Select `value` and send the input and change events a user's choice sends. */
  selectOption(selector, value) {
    return this.evaluate(({ query, choice }) => {
      const element = document.querySelector(query);
      element.value = choice;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, { query: selector, choice: value });
  }

  /** Give a file input one file, through the protocol, as a user's file chooser would. */
  async setInputFiles(selector, path) {
    const found = await this.bidi.send('script.evaluate', {
      expression: `document.querySelector(${JSON.stringify(selector)})`,
      target: { context: this.context },
      awaitPromise: false,
      resultOwnership: 'root',
    });
    if (found.type !== 'success' || found.result.type !== 'node') {
      throw new Error(`no element ${selector}`);
    }
    await this.bidi.send('input.setFiles', {
      context: this.context,
      element: { sharedId: found.result.sharedId },
      files: [path],
    });
  }
}
