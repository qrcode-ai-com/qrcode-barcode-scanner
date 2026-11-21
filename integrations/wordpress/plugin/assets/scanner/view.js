// The scanner on the page: every block and shortcode of the page, one engine for all of them.
// The engine runs in a module worker so that a long scan never freezes the page, and on the
// page itself when the site serves the plugin from a place a worker cannot start from.
//
// Each scanner follows the page contract of the engine's distribution/acceptance/README.md,
// with data-qrbs roles in place of element ids so that a page can hold several scanners:
// "file" (the image input), "profile" (fast, frame or full), "result" (data-state and
// data-scan) and "report" (the last report as JSON, with its data-scan and data-profile).
// data-state is idle, loading, scanning, then result, empty, inconclusive or error.
import {
  describeDetections, finalState, format, sniffType, SUPPORTED_TYPES,
} from './results.js';

// ------------------------------------------------------------------ the engine

let client = null;

function workerClient(worker) {
  let nextId = 0;
  const replies = new Map();
  worker.onmessage = (event) => {
    const resolve = replies.get(event.data && event.data.id);
    if (resolve) {
      replies.delete(event.data.id);
      resolve(event.data);
    }
  };
  // A worker whose script cannot load answers nothing: every pending request fails.
  worker.onerror = (event) => {
    event.preventDefault();
    for (const [id, resolve] of replies) {
      replies.delete(id);
      resolve({ id, ok: false, phase: 'worker', error: { message: event.message || 'worker error' } });
    }
  };
  const ask = (request, transfer = []) => new Promise((resolve) => {
    nextId += 1;
    replies.set(nextId, resolve);
    worker.postMessage({ ...request, id: nextId }, transfer);
  });
  return {
    load: () => ask({ type: 'load' }),
    scan: (bytes, profile) => {
      const buffer = bytes.slice().buffer;
      return ask({ type: 'scan', bytes: buffer, profile }, [buffer]);
    },
  };
}

async function pageClient() {
  const engine = await import('./engine.js');
  const run = async (phase, work) => {
    try {
      return { ok: true, ...(await work()) };
    } catch (error) {
      return { ok: false, phase, error: engine.describe(error) };
    }
  };
  return {
    load: () => run('load', () => engine.load()),
    scan: (bytes, profile) => run('scan', () => engine.scan(bytes, profile)),
  };
}

/** The engine client, started once per page: { client, loaded } where loaded is the reply. */
function engine() {
  client ??= (async () => {
    let worker = null;
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    } catch {
      worker = null; // A worker from another origin than the page is refused: use the page.
    }
    if (worker) {
      const remote = workerClient(worker);
      const loaded = await remote.load();
      // The worker started: its answer stands, success or a failure of the engine itself.
      if (loaded.ok || loaded.phase !== 'worker') return { client: remote, loaded };
      worker.terminate();
    }
    const local = await pageClient();
    return { client: local, loaded: await local.load() };
  })();
  return client;
}

// ------------------------------------------------------------------ one scanner

function setup(root) {
  const part = (name) => root.querySelector(`[data-qrbs="${name}"]`);
  const texts = JSON.parse(root.dataset.qrbsTexts || '{}');
  const text = (key, ...values) => format(texts[key] ?? key, ...values);
  const fileInput = part('file');
  const cameraInput = part('camera');
  const profileSelect = part('profile');
  const result = part('result');
  const summaryText = part('summary');
  const list = part('detections');
  const report = part('report');
  const drop = part('drop');

  let current = null; // { bytes: Uint8Array, name: string }
  let scans = 0;

  const setState = (state, message) => {
    result.dataset.state = state;
    summaryText.textContent = message;
  };

  const loadFailure = (reply) => {
    const error = reply.error || {};
    const detail = `${error.message || ''} ${error.cause || ''}`;
    if (/wasm-unsafe-eval|content security policy|\bCSP\b/i.test(detail)) return text('csp');
    return text('loadFailed', error.code || error.message || 'unknown');
  };

  const scanFailure = (reply) => {
    const error = reply.error || {};
    if (error.qrs === 'QRS-001' || error.qrs === 'QRS-002') return text('unreadable');
    return text('scanFailed', error.message || 'unknown');
  };

  function copyButton(value) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'qrbs__copy';
    button.textContent = text('copy');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = text('copied');
      } catch {
        button.textContent = text('copyFailed');
      }
      setTimeout(() => { button.textContent = text('copy'); }, 1600);
    });
    return button;
  }

  function note(message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'qrbs__note';
    paragraph.textContent = message;
    return paragraph;
  }

  function render(scanReport) {
    list.replaceChildren();
    for (const row of describeDetections(scanReport, texts.kinds || {})) {
      const item = document.createElement('li');
      item.className = 'qrbs__detection';
      item.dataset.symbology = row.symbology;
      const meta = document.createElement('p');
      meta.className = 'qrbs__meta';
      meta.textContent = `${row.format} · ${row.kind}`;
      // Decoded text is shown as text only: textContent, never markup.
      const output = document.createElement('output');
      output.className = 'qrbs__text';
      output.textContent = row.shown;
      item.append(meta, output);
      if (row.hidden > 0) item.append(note(text('hidden', row.hidden)));
      if (row.lossy) item.append(note(text('lossy')));
      if (row.url) item.append(note(text('linkNote')));
      const actions = document.createElement('p');
      actions.className = 'qrbs__item-actions';
      actions.append(copyButton(row.text));
      if (row.url) {
        const open = document.createElement('a');
        open.className = 'qrbs__open';
        open.href = row.url;
        open.target = '_blank';
        open.rel = 'noopener noreferrer nofollow';
        open.textContent = text('openLink');
        actions.append(open);
      }
      item.append(actions);
      list.append(item);
    }
  }

  // A finished scan: its number and profile on the report, then the state.
  function finish(scan, profile, state, message, json = '') {
    report.dataset.scan = String(scan);
    report.dataset.profile = profile;
    report.textContent = json;
    setState(state, message);
  }

  async function scanCurrent() {
    if (!current) return;
    const profile = profileSelect.value;
    scans += 1;
    const scan = scans;
    result.dataset.scan = String(scan);
    // The previous result goes first: a failed or empty scan never leaves an older code shown.
    list.replaceChildren();
    if (!current.bytes) {
      finish(scan, profile, 'error', text(current.problem));
      return;
    }
    setState('loading', text('loading'));
    const { client: scanner, loaded } = await engine();
    if (scan !== scans) return;
    if (!loaded.ok) {
      finish(scan, profile, 'error', loadFailure(loaded));
      return;
    }
    root.dataset.qrbsEngineVersion = loaded.version;
    setState('scanning', text('scanning', current.name, profile));
    const reply = await scanner.scan(current.bytes, profile);
    if (scan !== scans) return;
    if (!reply.ok) {
      finish(scan, profile, 'error', scanFailure(reply));
      return;
    }
    render(reply.report);
    const state = finalState(reply.report);
    const message = state === 'result' ? text('found', reply.report.detections.length) : text(state);
    finish(scan, profile, state, message, JSON.stringify(reply.report, null, 2));
  }

  async function useFile(file) {
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const name = file.name ? `“${file.name}”` : 'image';
    if (sniffType(bytes)) {
      current = { bytes, name };
    } else {
      // An image type the engine does not read is refused before any engine work.
      const image = typeof file.type === 'string' && file.type.startsWith('image/')
        && !SUPPORTED_TYPES.includes(file.type);
      current = { bytes: null, name, problem: image ? 'unsupported' : 'unreadable' };
    }
    await scanCurrent();
  }

  for (const input of [fileInput, cameraInput]) {
    input?.addEventListener('change', () => {
      void useFile(input.files && input.files[0]);
      // The same file chosen twice is read twice.
      input.value = '';
    });
  }
  profileSelect.addEventListener('change', () => { void scanCurrent(); });
  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('qrbs__drop--over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('qrbs__drop--over'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('qrbs__drop--over');
    void useFile(event.dataTransfer && event.dataTransfer.files[0]);
  });
  // The engine (about 2 MB) is fetched once a visitor reaches for the scanner, not with the page.
  const warm = () => { void engine(); };
  root.addEventListener('pointerenter', warm, { once: true });
  root.addEventListener('focusin', warm, { once: true });
  root.dataset.qrbsReady = 'true';
}

for (const root of document.querySelectorAll('[data-qrbs-root]')) setup(root);
