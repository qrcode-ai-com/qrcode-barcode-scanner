// Unit tests in Node, no browser: the result helpers, the manifests, the byte writers, the
// background's menu handler with a fake browser API, and the files of each store package.
//
//   node --test test/unit.test.mjs
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { inflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { crc32, encodePng, readZip, writeZip } from '../scripts/bytes.mjs';
import {
  packageFiles, pinsText, readPins, scannerPackage, sourceFiles,
} from '../scripts/build.mjs';
import { ICON_SIZES, drawIcon } from '../scripts/icons.mjs';
import { EXPECTED_FILES, inspectStore } from '../scripts/inspect.mjs';
import { LIMITS, SIX_LINKS, amoMetadata, listingTexts } from '../scripts/listing.mjs';
import {
  CSP, DESCRIPTION, GECKO_ID, HOMEPAGE, NAME, OPTIONAL_HOST_PERMISSIONS, PERMISSIONS, TARGETS,
  manifestFor,
} from '../scripts/manifest.mjs';
import {
  chooseProfile, describeDetections, finalState, fromBase64, openableUrl, payloadName, summary,
  symbologyName, toBase64, visibleText,
} from '../src/results.js';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));

const detection = (symbology, text, payload, extra = {}) => ({
  symbology, content: { text, raw: Buffer.from(text).toString('base64'), charset: 'utf8' },
  payload, corners: null, meta: {}, engines: ['rxing'], occurrences: [{}], ...extra,
});
const mixed = {
  detections: [
    detection('qr_code', 'https://qrc-ai.com/76xMa',
      { kind: 'url', url: 'https://qrc-ai.com/76xMa' }),
    detection('code128', 'STOCK-4827', { kind: 'text' }),
  ],
  trace: { budget_exhausted: false, engine_panics: 0 },
};

// ------------------------------------------------------------------ results.js

test('symbologies and payloads have human names, and newer wire values pass through', () => {
  assert.equal(symbologyName('qr_code'), 'QR Code');
  assert.equal(symbologyName('code128'), 'Code 128');
  assert.equal(symbologyName('future_code'), 'future_code');
  assert.equal(symbologyName('toString'), 'toString');
  assert.equal(payloadName({ kind: 'url' }), 'Link');
  assert.equal(payloadName({ kind: 'wifi' }), 'Wi-Fi network');
  assert.equal(payloadName(undefined), 'Text');
  assert.equal(payloadName({ kind: 'later' }), 'later');
});

test('only an http or https link can be opened, never a scheme that runs or reads', () => {
  const link = (url) => openableUrl({ payload: { kind: 'url', url } });
  assert.equal(link('https://qrc-ai.com/76xMa'), 'https://qrc-ai.com/76xMa');
  assert.equal(link('http://example.com/a b'), 'http://example.com/a%20b');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd',
    'chrome://settings', 'not a url', '']) {
    assert.equal(link(bad), null, bad);
  }
  assert.equal(openableUrl({ payload: { kind: 'text' } }), null);
  const gs1 = 'https://id.gs1.org/01/09506000134352';
  assert.equal(openableUrl({ payload: { kind: 'gs1_digital_link', url: gs1 } }), gs1);
});

test('hidden and direction-changing characters are shown as marks, and counted', () => {
  assert.deepEqual(visibleText('plain\ttext\n'), { shown: 'plain\ttext\n', hidden: 0 });
  const spoof = `https://example.com/${String.fromCodePoint(0x202E)}gpj.exe`;
  const { shown, hidden } = visibleText(spoof);
  assert.equal(hidden, 1);
  assert.equal(shown, 'https://example.com/⟨U+202E⟩gpj.exe');
  const zero = visibleText(`a${String.fromCodePoint(0x200B)}b${String.fromCodePoint(0x7)}c`);
  assert.deepEqual(zero, { shown: 'a⟨U+200B⟩b⟨U+0007⟩c', hidden: 2 });
});

test('a report becomes rows with the exact text kept for copying', () => {
  const rows = describeDetections(mixed);
  assert.deepEqual(rows.map((row) => [row.format, row.kind, row.text, row.url]), [
    ['QR Code', 'Link', 'https://qrc-ai.com/76xMa', 'https://qrc-ai.com/76xMa'],
    ['Code 128', 'Text', 'STOCK-4827', null],
  ]);
  const lossy = describeDetections({ detections: [detection('qr_code', 'a�', { kind: 'text' },
    { content: { text: 'a�', raw: 'YYA=', charset: 'unknown' }, occurrences: [{}, {}] })] });
  assert.equal(lossy[0].lossy, true);
  assert.equal(lossy[0].raw, 'YYA=');
  assert.equal(lossy[0].occurrences, 2);
  assert.deepEqual(describeDetections({}), []);
});

test('the final state and summary follow the page contract', () => {
  assert.equal(finalState(mixed), 'result');
  assert.equal(finalState({ detections: [], trace: { budget_exhausted: false } }), 'empty');
  assert.equal(finalState({ detections: [], trace: { budget_exhausted: true } }), 'inconclusive');
  assert.equal(summary(mixed, { name: 'x.png', profile: 'fast', ms: 12.4 }),
    'Found 2 codes in x.png (fast profile, 12 ms).');
  assert.equal(summary({ detections: [], trace: {} }, { profile: 'full' }),
    'No QR code or barcode found (full profile).');
  assert.equal(chooseProfile('frame'), 'frame');
  assert.equal(chooseProfile('slow'), 'full');
  assert.equal(chooseProfile(null), 'full');
});

test('base64 round-trips bytes larger than one chunk', () => {
  const bytes = new Uint8Array(0x8000 * 3 + 17).map((_, index) => (index * 31) & 0xFF);
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
  assert.equal(toBase64(new Uint8Array([0, 255, 1])), 'AP8B');
});

// ------------------------------------------------------------------ manifests

test('every manifest asks for the same two permissions and no site at install', () => {
  for (const target of TARGETS) {
    const manifest = manifestFor(target, own.version);
    assert.equal(manifest.manifest_version, 3);
    assert.deepEqual(manifest.permissions, ['contextMenus', 'activeTab']);
    assert.deepEqual(manifest.permissions, PERMISSIONS);
    assert.equal(manifest.host_permissions, undefined);
    assert.deepEqual(manifest.optional_host_permissions, OPTIONAL_HOST_PERMISSIONS);
    assert.equal(manifest.content_security_policy.extension_pages, CSP);
    assert.equal(manifest.update_url, undefined);
    assert.equal(manifest.name, NAME);
    assert.equal(manifest.version, own.version);
    assert.doesNotMatch(`${manifest.name} ${manifest.description}`, /chrome|edge|firefox/i);
  }
  // 'wasm-unsafe-eval' lets the module compile; nothing else may run but the package's files.
  assert.equal(CSP, "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'");
  // The Chrome Web Store and Edge show the manifest description, 132 characters at most.
  assert.ok(DESCRIPTION.length <= 132, `${DESCRIPTION.length} characters`);
  assert.ok(NAME.length <= 45);
});

test('Chrome and Edge run a service worker; Firefox an event page with its ID', () => {
  for (const target of ['chrome', 'edge']) {
    const manifest = manifestFor(target, own.version);
    assert.deepEqual(manifest.background, { service_worker: 'background.js' });
    assert.equal(manifest.browser_specific_settings, undefined);
  }
  const firefox = manifestFor('firefox', own.version);
  assert.deepEqual(firefox.background, { scripts: ['background.js'] });
  assert.deepEqual(firefox.browser_specific_settings, { gecko: {
    id: GECKO_ID, strict_min_version: '142.0', data_collection_permissions: { required: ['none'] },
  } });
  assert.throws(() => manifestFor('safari', own.version), /unknown target/);
});

// ------------------------------------------------------------------ bytes

test('CRC-32, zip and PNG writers give fixed bytes', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xCBF43926);
  const files = new Map([['b.txt', Buffer.from('second')], ['a/x.bin', Buffer.alloc(5000, 7)]]);
  const first = writeZip(files);
  assert.deepEqual(writeZip(new Map([...files].reverse())), first);
  const read = readZip(first);
  assert.deepEqual([...read.keys()], ['a/x.bin', 'b.txt']);
  assert.deepEqual(read.get('a/x.bin'), Buffer.alloc(5000, 7));
  for (const bad of ['../x', 'a/../../x', '/etc/x', 'a\\b', 'C:/x', './x']) {
    assert.throws(() => readZip(writeZip(new Map([[bad, Buffer.from('x')]]))), /unsafe entry/,
      bad);
  }
  const png = encodePng(2, 1, new Uint8Array([255, 0, 0, 255, 0, 0, 255, 128]));
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  assert.equal(png.readUInt32BE(16), 2);
  assert.equal(png.readUInt32BE(20), 1);
});

test('the icon is drawn the same way every time, at each size', () => {
  for (const size of ICON_SIZES) {
    const icon = drawIcon(size);
    assert.equal(icon.readUInt32BE(16), size);
    assert.deepEqual(drawIcon(size), icon);
  }
});

/** Alpha of each pixel of a PNG that encodePng wrote: one IDAT, filter 0 on every row. */
function ownPngAlpha(png) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const length = png.readUInt32BE(33);
  assert.equal(png.toString('latin1', 37, 41), 'IDAT');
  const rows = inflateSync(png.subarray(41, 41 + length));
  return { width, height, at: (x, y) => rows[y * (width * 4 + 1) + 1 + x * 4 + 3] };
}

test('the Chrome store icon is 128 px: 96 px of art inside 16 px of transparent margin', () => {
  const { width, height, at } = ownPngAlpha(drawIcon(128, 16));
  assert.equal(width, 128);
  assert.equal(height, 128);
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (at(x, y) === 0) continue;
      [left, top] = [Math.min(left, x), Math.min(top, y)];
      [right, bottom] = [Math.max(right, x), Math.max(bottom, y)];
    }
  }
  assert.deepEqual([left, top, right, bottom], [16, 16, 111, 111]);
  assert.equal(at(64, 64), 255);
});

test('the committed store images have the sizes the stores take', () => {
  const sizes = {
    'promo-marquee-1400x560.png': [1400, 560],
    'promo-small-440x280.png': [440, 280],
    'screenshot-1-scan-1280x800.png': [1280, 800],
    'screenshot-2-popup-1280x800.png': [1280, 800],
    'screenshot-3-menu-1280x800.png': [1280, 800],
    'screenshot-4-report-1280x800.png': [1280, 800],
  };
  const folder = join(HERE, 'listing', 'images');
  assert.deepEqual(readdirSync(folder).sort(), Object.keys(sizes));
  for (const [name, [width, height]] of Object.entries(sizes)) {
    const png = readFileSync(join(folder, name));
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      name);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [width, height], name);
  }
});

// ------------------------------------------------------------------ background.js

function background({ fetchPlan = [], granted = false } = {}) {
  const listeners = {};
  const created = [];
  const fetched = [];
  const event = (name) => ({ addListener: (fn) => { listeners[name] = fn; } });
  const chrome = {
    runtime: {
      id: 'extension-id',
      lastError: undefined,
      getURL: (path) => `chrome-extension://extension-id/${path}`,
      onInstalled: event('installed'),
      onStartup: event('startup'),
      onMessage: event('message'),
    },
    contextMenus: {
      removeAll: (done) => { created.length = 0; done(); },
      create: (props, done) => { created.push(props); done(); },
      onClicked: event('clicked'),
    },
    tabs: { create: async (props) => { created.push({ tab: props }); return { id: 9 }; } },
    permissions: { contains: async () => granted },
  };
  const fetchStub = async (url, init) => {
    fetched.push([url, init.credentials]);
    const step = fetchPlan.shift() ?? { throws: true };
    if (step.throws) throw new TypeError('Failed to fetch');
    return { ok: step.status === 200, status: step.status, headers: { get: () => 'image/png' },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  };
  // The background waits 300 ms before trying the page's own site again; run short waits now.
  const setTimeoutNow = (fn, ms) => { if (ms < 1000) fn(); return 0; };
  const context = vm.createContext({ chrome, fetch: fetchStub, btoa, URL, setTimeout: setTimeoutNow,
    Promise, Map, Uint8Array, String, Date, Number, Error, TypeError });
  vm.runInContext(readFileSync(join(HERE, 'src', 'background.js'), 'utf8'), context);
  // Objects made inside the vm have another realm's prototypes; compare plain copies.
  const plain = (value) => JSON.parse(JSON.stringify(value));
  return { context, listeners, created, fetched, plain };
}

const own_ = { id: 'extension-id', url: 'chrome-extension://extension-id/scanner.html' };
const take = (listeners, message, sender = own_) => new Promise((resolve) => {
  const async = listeners.message(message, sender, resolve);
  if (!async) setTimeout(() => resolve('no answer'), 10);
});

test('the menu item is created once, for images only', () => {
  const { listeners, created, plain } = background();
  listeners.installed();
  listeners.startup();
  assert.deepEqual(plain(created),
    [{ id: 'scan-image', title: 'Scan this image', contexts: ['image'] }]);
});

test('a click opens the scanner next to the tab, and the page takes the bytes once', async () => {
  const { context, listeners, created, fetched, plain } = background({
    fetchPlan: [{ status: 200 }] });
  const id = await context.onMenuClicked({ menuItemId: 'scan-image',
    srcUrl: 'https://cdn.example/a.png', pageUrl: 'https://example.org/' }, { id: 4, index: 2 });
  const url = `chrome-extension://extension-id/scanner.html?request=${id}`;
  assert.deepEqual(plain(created.at(-1)), { tab: { url, index: 3, openerTabId: 4 } });
  const answer = plain(await take(listeners, { type: 'qrscan:take-request', id }));
  assert.equal(answer.ok, true);
  assert.equal(answer.base64, 'AQID');
  assert.equal(answer.host, 'cdn.example');
  assert.deepEqual(fetched, [['https://cdn.example/a.png', 'omit']]);
  assert.deepEqual(plain(await take(listeners, { type: 'qrscan:take-request', id })),
    { ok: false, reason: 'expired' });
  assert.equal(await context.onMenuClicked({ menuItemId: 'other', srcUrl: 'x' }, {}), null);
});

test('the background tells the page why an image could not be read', async () => {
  const reasons = async (srcUrl, plan, pageUrl = 'https://example.org/', granted = false) => {
    const { context } = background({ fetchPlan: plan, granted });
    return JSON.parse(JSON.stringify(await context.readImage(srcUrl, pageUrl)));
  };
  assert.equal((await reasons('blob:https://example.org/1', [])).reason, 'unsupported');
  assert.equal((await reasons('file:///tmp/a.png', [])).scheme, 'file');
  assert.deepEqual(await reasons('https://cdn.example/a.png', [{ status: 404 }]), {
    srcUrl: 'https://cdn.example/a.png', host: 'cdn.example', scheme: 'https', ok: false,
    reason: 'http', status: 404 });
  const closed = await reasons('https://cdn.example:8443/a.png',
    [{ throws: true }, { throws: true }]);
  assert.equal(closed.reason, 'permission');
  assert.equal(closed.pattern, 'https://cdn.example/*');
  assert.equal((await reasons('https://cdn.example/a.png', [{ throws: true }, { throws: true }],
    'https://example.org/', true)).reason, 'unreadable');
  // A sign-in image: refused without cookies, read with them.
  const signedIn = await reasons('https://cdn.example/a.png', [{ status: 403 }, { status: 200 }]);
  assert.equal(signedIn.ok, true);
});

test('an image of the page\'s own site is tried again once, for the activeTab grant', async () => {
  const { context, fetched } = background({ fetchPlan: [{ throws: true }, { throws: true },
    { status: 200 }] });
  const answer = await context.readImage('https://example.org/a.png', 'https://example.org/page');
  assert.equal(answer.ok, true);
  assert.equal(fetched.length, 3);
});

test('messages from anything but the extension\'s own pages are ignored', async () => {
  const { context, listeners } = background({ fetchPlan: [{ status: 200 }] });
  const id = await context.onMenuClicked(
    { menuItemId: 'scan-image', srcUrl: 'https://cdn.example/a.png' }, { id: 1, index: 0 });
  for (const sender of [{ id: 'other', url: 'chrome-extension://other/x' },
    { id: 'extension-id', url: 'https://example.org/' }]) {
    assert.equal(listeners.message({ type: 'qrscan:take-request', id }, sender, () => {}), false);
  }
  assert.equal((await take(listeners, { type: 'qrscan:take-request', id })).ok, true);
  assert.equal(listeners.message({ type: 'other' }, own_, () => {}), false);
});

// ------------------------------------------------------------------ store packages

test('each store package holds exactly the expected files, with the pinned module', () => {
  const scanner = scannerPackage();
  assert.equal(scanner.version, own.dependencies['@qrcode-ai-com/qrcode-barcode-scanner-wasm']);
  assert.equal(scanner.wasm_sha256, own.config.wasmSha256);
  assert.match(scanner.integrity, /^sha512-/);
  for (const target of TARGETS) {
    const files = packageFiles(target, scanner, own.version);
    assert.deepEqual([...files.keys()].sort(), EXPECTED_FILES);
    const { wasmSha256 } = inspectStore(target, readZip(writeZip(files)));
    assert.equal(wasmSha256, own.config.wasmSha256);
    const notice = files.get('NOTICE.md').toString();
    assert.match(notice, /AGPL-3\.0-or-later/);
    assert.match(notice, /MIT License/);
    assert.match(notice, new RegExp(scanner.source_revision));
  }
});

test('SHA256SUMS pins one hash per archive, in sha256sum form, sorted by name', () => {
  const pins = readPins(join(HERE, 'SHA256SUMS'));
  const names = [...TARGETS.map((target) => `qrcode-barcode-scanner-${target}-${own.version}.zip`),
    `qrcode-barcode-scanner-source-${own.version}.zip`].sort();
  assert.deepEqual([...pins.keys()], names);
  for (const hash of pins.values()) assert.match(hash, /^[0-9a-f]{64}$/);
  const archives = [...pins].map(([path, sha256]) => ({ path, sha256 })).reverse();
  assert.equal(pinsText(archives), readFileSync(join(HERE, 'SHA256SUMS'), 'utf8'));
  // An extracted source package has no pin: the build there only builds.
  assert.equal(readPins(join(mkdtempSync(join(tmpdir(), 'qrscan-pins-')), 'SHA256SUMS')), null);
});

test('the source package rebuilds the stores and quotes no archive hash', () => {
  const files = sourceFiles(own.version);
  const top = `qrcode-barcode-scanner-browser-extension-${own.version}/`;
  const inside = [...files.keys()].map((name) => name.slice(top.length));
  for (const need of ['SOURCE.md', 'package-lock.json', 'listing/texts.md', 'scripts/build.mjs']) {
    assert.ok(inside.includes(need), need);
  }
  assert.ok(!inside.includes('SHA256SUMS') && !inside.includes('README.md'));
  assert.deepEqual(inside.filter((name) => name.startsWith('listing/')).sort(),
    ['listing/PRIVACY.md', 'listing/texts.md']);
  const pins = [...readPins(join(HERE, 'SHA256SUMS')).values()];
  for (const [name, bytes] of files) {
    for (const hash of pins) assert.ok(!bytes.toString('latin1').includes(hash), name);
  }
});

test('every archive hash a store kit quotes is the pinned one', () => {
  const pins = readPins(join(HERE, 'SHA256SUMS'));
  const known = new Set([...pins.values(), own.config.wasmSha256]);
  for (const name of readdirSync(join(HERE, 'listing')).filter((file) => file.endsWith('.md'))) {
    const text = readFileSync(join(HERE, 'listing', name), 'utf8');
    for (const [hash] of text.matchAll(/\b[0-9a-f]{64}\b/g)) {
      assert.ok(known.has(hash), `${name} quotes ${hash}, which SHA256SUMS does not pin`);
    }
  }
});

// The workflow is in the repository, not in the source package: there the test is skipped.
const WORKFLOW = join(HERE, '..', '..', '.github', 'workflows', 'integration-browser-extension.yml');
test('the workflow rebuilds the pinned WebAssembly module from the recorded revision',
  { skip: !existsSync(WORKFLOW) && 'no workflow outside the repository' }, () => {
  const workflow = readFileSync(WORKFLOW, 'utf8');
  const job = workflow.slice(workflow.indexOf('\n  wasm-rebuild:'));
  assert.ok(job.includes(`echo "${own.config.wasmSha256}  $module"`));
  const info = JSON.parse(readFileSync(join(HERE, 'node_modules',
    '@qrcode-ai-com', 'qrcode-barcode-scanner-wasm', 'build-info.json'), 'utf8'));
  assert.ok(job.includes(`= ${info.source_revision}`));
  assert.ok(job.includes(`RUST_TOOLCHAIN: "${/release: (\S+)/.exec(info.toolchain.rustc)[1]}"`));
  assert.ok(job.includes(`tool: ${info.toolchain.wasm_pack.replace(' ', '@')}`));
});

// ------------------------------------------------------------------ store texts

test('the store texts fit their fields and carry the six links in sentences', () => {
  const texts = listingTexts();
  assert.equal(texts.name, NAME);
  assert.equal(texts.short, DESCRIPTION);
  assert.ok(texts.name.length <= LIMITS.name);
  assert.ok(texts.short.length <= LIMITS.short, `${texts.short.length} characters`);
  assert.ok(texts.summary.length <= LIMITS.summary, `${texts.summary.length} characters`);
  assert.ok(texts.long.length >= LIMITS.longMin && texts.long.length <= LIMITS.longMax);
  for (const link of SIX_LINKS) {
    const sentence = texts.long.split('\n').find((line) => line.includes(`${link} `)
      || line.includes(`${link}.`));
    assert.ok(sentence && sentence.split(' ').length > 12, `${link} is in a sentence`);
  }
  // Edge refuses a listing that names Chrome; no store text needs another browser's name.
  for (const [key, value] of Object.entries(texts)) {
    assert.doesNotMatch(value, /chrome|firefox|\bedge\b/i, key);
    assert.doesNotMatch(value, /[\u2014\u2013]/, `${key} has no dash`);
  }
});

test('the Firefox metadata repeats the listing and states both licenses', () => {
  const texts = listingTexts();
  const scanner = scannerPackage();
  const license = readFileSync(join(HERE, 'LICENSE'), 'utf8');
  const metadata = amoMetadata(texts, { license, scanner, homepage: HOMEPAGE });
  assert.deepEqual(metadata.categories, { firefox: ['photos-music-videos'] });
  assert.equal(metadata.summary['en-US'], texts.summary);
  assert.equal(metadata.description['en-US'], texts.long);
  assert.equal(metadata.version.approval_notes, texts.reviewerNotes);
  assert.equal(metadata.version.license, undefined);
  const terms = metadata.version.custom_license.text['en-US'];
  assert.ok(terms.includes(license.trimEnd()), 'the MIT text, verbatim');
  assert.match(terms, /AGPL-3\.0-or-later/);
  const tag = `tag v${scanner.version} (revision ${scanner.source_revision})`;
  assert.ok(terms.includes(tag), tag);
  assert.doesNotMatch(terms, /AGPL-3\.0-only/);
});
