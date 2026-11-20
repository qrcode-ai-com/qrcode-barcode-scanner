'use strict';
// The background of the extension: the "Scan this image" menu item and the hand-off of the
// clicked image to the scanner page. It decodes nothing and loads no WebAssembly; the page does.
// Chrome and Edge run this file as a service worker, Firefox as an event page: it is a classic
// script with no imports, so both can load it, and the tests can call its functions by name.

const api = globalThis.browser ?? globalThis.chrome;

const MENU_ID = 'scan-image';
// Larger files are refused before they are copied to the page. The engine has its own pixel
// limits; this one bounds the copy itself.
const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
// A request the page has not taken by then is dropped, with its bytes.
const REQUEST_LIFETIME_MS = 5 * 60 * 1000;

// Each pending request: a Promise of what readImage found. Kept in memory only, and removed as
// soon as the page takes it.
const requests = new Map();
let counter = 0;

function createMenu() {
  // An event page or a restarted worker runs this again: remove first, so the item exists once.
  api.contextMenus.removeAll(() => {
    void api.runtime.lastError;
    api.contextMenus.create(
      { id: MENU_ID, title: 'Scan this image', contexts: ['image'] },
      () => void api.runtime.lastError,
    );
  });
}

/** Where an image address can be read from: inline data, the web, or nowhere. */
function sourceOf(srcUrl) {
  let parsed;
  try { parsed = new URL(srcUrl); } catch { return { kind: 'unsupported', scheme: '' }; }
  if (parsed.protocol === 'data:') return { kind: 'data', scheme: 'data' };
  if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
    return {
      kind: 'web',
      scheme: parsed.protocol.slice(0, -1),
      origin: parsed.origin,
      host: parsed.hostname,
      // Match patterns carry no port: this one covers the site on every port.
      pattern: `${parsed.protocol}//${parsed.hostname}/*`,
    };
  }
  return { kind: 'unsupported', scheme: parsed.protocol.slice(0, -1) };
}

async function fetchOnce(srcUrl, credentials) {
  const response = await fetch(srcUrl, { credentials, cache: 'force-cache' });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, type: response.headers.get('content-type') || '' };
}

/**
 * Read the image again from where the page got it, the browser cache first. The page itself
 * sent the same request to the same server; nothing goes anywhere else. Without cookies first:
 * a site that lets every site read its images (CORS `*`) refuses a request that carries them.
 * With the user's cookies only when that fails, as for an image behind a sign-in.
 */
async function fetchImage(srcUrl) {
  try {
    return await fetchOnce(srcUrl, 'omit');
  } catch (error) {
    if (error.status !== undefined && error.status !== 401 && error.status !== 403) throw error;
    return fetchOnce(srcUrl, 'include');
  }
}

function toBase64(bytes) {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

const pause = (ms) => new Promise((done) => { setTimeout(done, ms); });

/** What the page will receive for one clicked image: its bytes, or why they could not be read. */
async function readImage(srcUrl, pageUrl) {
  const source = sourceOf(srcUrl);
  const base = { srcUrl, host: source.host ?? '', scheme: source.scheme };
  if (source.kind === 'unsupported') return { ...base, ok: false, reason: 'unsupported' };
  let image;
  try {
    image = await fetchImage(srcUrl);
  } catch (first) {
    if (first.status !== undefined) {
      return { ...base, ok: false, reason: 'http', status: first.status };
    }
    // activeTab lets the extension read the page's own site after the click. The browser may
    // apply that grant a moment after the click event: one retry covers it.
    let samePage = false;
    try {
      samePage = source.kind === 'web' && new URL(pageUrl).origin === source.origin;
    } catch {
      samePage = false;
    }
    if (samePage) {
      try { await pause(300); image = await fetchImage(srcUrl); } catch { image = undefined; }
    }
    if (image === undefined) {
      if (source.kind !== 'web') return { ...base, ok: false, reason: 'unreadable' };
      const granted = await api.permissions.contains({ origins: [source.pattern] });
      const reason = granted ? 'unreadable' : 'permission';
      return { ...base, ok: false, reason, pattern: source.pattern };
    }
  }
  if (image.bytes.length > MAX_IMAGE_BYTES) {
    return { ...base, ok: false, reason: 'too-large', bytes: image.bytes.length };
  }
  return { ...base, ok: true, type: image.type, base64: toBase64(image.bytes) };
}

/** The menu item: start reading the image, and open the scanner page that will show it. */
async function onMenuClicked(info, tab) {
  if (info.menuItemId !== MENU_ID || typeof info.srcUrl !== 'string') return null;
  counter += 1;
  const id = `${Date.now().toString(36)}-${counter}`;
  requests.set(id, readImage(info.srcUrl, info.pageUrl ?? tab?.url ?? ''));
  setTimeout(() => { requests.delete(id); }, REQUEST_LIFETIME_MS);
  const properties = { url: api.runtime.getURL(`scanner.html?request=${encodeURIComponent(id)}`) };
  if (tab && Number.isInteger(tab.index)) properties.index = tab.index + 1;
  if (tab && Number.isInteger(tab.id) && tab.id >= 0) properties.openerTabId = tab.id;
  await api.tabs.create(properties);
  return id;
}

/**
 * Messages from the extension's own pages only. `qrscan:take-request`: the page asks once for
 * its request, and the bytes leave this memory with the answer. `qrscan:read-again`: after the
 * user allowed a site on the page, read that image again.
 */
function onMessage(message, sender, sendResponse) {
  if (!message || sender.id !== api.runtime.id
    || !String(sender.url).startsWith(api.runtime.getURL(''))) {
    return false;
  }
  let pending;
  if (message.type === 'qrscan:take-request') {
    pending = requests.get(message.id);
    requests.delete(message.id);
    if (pending === undefined) {
      sendResponse({ ok: false, reason: 'expired' });
      return false;
    }
  } else if (message.type === 'qrscan:read-again' && typeof message.srcUrl === 'string') {
    pending = readImage(message.srcUrl, '');
  } else {
    return false;
  }
  pending.then(sendResponse, (error) => {
    sendResponse({ ok: false, reason: 'unreadable', message: String(error && error.message) });
  });
  return true;
}

api.runtime.onInstalled.addListener(createMenu);
api.runtime.onStartup.addListener(createMenu);
api.contextMenus.onClicked.addListener((info, tab) => { void onMenuClicked(info, tab); });
api.runtime.onMessage.addListener(onMessage);
