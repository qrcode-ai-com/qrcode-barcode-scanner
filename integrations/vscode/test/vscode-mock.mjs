// SPDX-License-Identifier: MIT
// The part of the `vscode` module this extension calls, recording every call. It is a test double:
// it proves the extension's own logic and its packaged files, not the behaviour of an editor.
import { readFile, stat } from 'node:fs/promises';
import { Module } from 'node:module';
import { posix } from 'node:path';

class Uri {
  constructor(scheme, path) {
    this.scheme = scheme;
    this.authority = '';
    this.path = path;
    this.query = '';
    this.fragment = '';
  }

  static file(fsPath) {
    const path = fsPath.replace(/\\/g, '/');
    return new Uri('file', path.startsWith('/') ? path : `/${path}`);
  }

  static joinPath(base, ...segments) {
    return new Uri(base.scheme, posix.join(base.path, ...segments));
  }

  get fsPath() {
    return process.platform === 'win32' && /^\/[A-Za-z]:/.test(this.path) ? this.path.slice(1).replace(/\//g, '\\') : this.path;
  }

  toString() {
    return `${this.scheme}://${this.path}`;
  }
}

export function createVscode({ workspaceRoot }) {
  const state = {
    commands: new Map(),
    channels: [],
    messages: [],
    dialogs: [],
    picks: [],
    progress: [],
    clipboard: null,
    config: {},
    openDialogResult: undefined,
    choose: () => undefined,
    onProgress: () => {},
    onRead: () => {},
    sizes: new Map(),
    reads: [],
  };
  const message = (level) => async (text, ...items) => {
    state.messages.push({ level, text, items });
    return undefined;
  };
  const vscode = {
    Uri,
    ProgressLocation: { SourceControl: 1, Window: 10, Notification: 15 },
    QuickPickItemKind: { Separator: -1, Default: 0 },
    commands: {
      registerCommand(id, handler) {
        if (state.commands.has(id)) throw new Error(`command ${id} already registered`);
        state.commands.set(id, handler);
        return { dispose: () => state.commands.delete(id) };
      },
      executeCommand(id, ...args) {
        const handler = state.commands.get(id);
        if (!handler) throw new Error(`command '${id}' not found`);
        return Promise.resolve(handler(...args));
      },
    },
    window: {
      createOutputChannel(name) {
        const channel = { name, lines: [], shown: [], disposed: false };
        channel.appendLine = (line) => {
          if (typeof line !== 'string') throw new TypeError('appendLine takes a string');
          channel.lines.push(line);
        };
        channel.show = (preserveFocus) => channel.shown.push(preserveFocus);
        channel.dispose = () => {
          channel.disposed = true;
        };
        state.channels.push(channel);
        return channel;
      },
      showInformationMessage: message('info'),
      showWarningMessage: message('warning'),
      showErrorMessage: message('error'),
      async showOpenDialog(options) {
        state.dialogs.push(options);
        return state.openDialogResult;
      },
      async showQuickPick(items, options) {
        const list = await items;
        state.picks.push({ items: list, options });
        return state.choose(list);
      },
      async withProgress(options, task) {
        const listeners = [];
        const token = {
          isCancellationRequested: false,
          onCancellationRequested(listener) {
            listeners.push(listener);
            return { dispose: () => listeners.splice(listeners.indexOf(listener), 1) };
          },
        };
        const cancel = () => {
          if (token.isCancellationRequested) return;
          token.isCancellationRequested = true;
          for (const listener of [...listeners]) listener();
        };
        const run = { options, reports: [], cancel };
        state.progress.push(run);
        return task({ report: (value) => { run.reports.push(value); state.onProgress(value, cancel); } }, token);
      },
    },
    workspace: {
      workspaceFolders: [{ uri: Uri.file(workspaceRoot), name: 'workspace', index: 0 }],
      getConfiguration(section) {
        return { get: (key) => state.config[`${section}.${key}`] };
      },
      asRelativePath(uri) {
        const root = Uri.file(workspaceRoot).path;
        return uri.path.startsWith(`${root}/`) ? uri.path.slice(root.length + 1) : uri.fsPath;
      },
      fs: {
        async readFile(uri) {
          state.reads.push(uri.path);
          const buffer = await readFile(uri.fsPath);
          // Node's own file reads can sit in a shared buffer; the extension must not detach it.
          const pooled = new Uint8Array(buffer.length + 16);
          pooled.set(buffer, 8);
          // A slow disk or remote file system: a test may hold the read with a promise.
          await state.onRead(uri);
          return pooled.subarray(8, 8 + buffer.length);
        },
        async stat(uri) {
          const info = await stat(uri.fsPath);
          return { type: info.isDirectory() ? 2 : 1, ctime: info.ctimeMs, mtime: info.mtimeMs, size: state.sizes.get(uri.path) ?? info.size };
        },
      },
    },
    env: {
      clipboard: {
        async writeText(text) {
          state.clipboard = text;
        },
        async readText() {
          return state.clipboard ?? '';
        },
      },
    },
  };
  return { vscode, state };
}

/** Load the bundled extension with `require('vscode')` answered by MOCK. */
export function loadExtension(entry, mock) {
  const original = Module._load;
  Module._load = function load(request, ...rest) {
    return request === 'vscode' ? mock : original.call(this, request, ...rest);
  };
  try {
    return Module.createRequire(entry)(entry);
  } finally {
    Module._load = original;
  }
}
