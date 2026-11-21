// The Safari app for macOS: an Xcode project generated from build/safari, and the app built from
// it, unsigned. Needs macOS with Xcode 26 or later.
//
//   node scripts/safari.mjs [--extension build/safari] [--out build/safari-xcode]
//                           [--bundle-identifier com.qrcode-ai.qrcode-barcode-scanner]
//
// 1. Apple's packager (`xcrun safari-web-extension-packager`, `safari-web-extension-converter`
//    in older Xcode) writes a macOS-only project under OUT/project, with --copy-resources: the
//    project holds its own copy of the extension. Its deployment target is raised to macOS 14,
//    the first macOS with Safari 26.
// 2. xcodebuild builds the Release configuration with CODE_SIGNING_ALLOWED=NO.
// 3. The built app and its extension (.appex) are opened: the Info.plist names Safari's web
//    extension point, the bundle identifiers and macOS 14.0, and the extension's resources are
//    the files of build/safari, byte for byte, with the pinned WebAssembly module.
// Writes OUT/safari-run.json and OUT/<app>-macos-unsigned.zip. Nothing is signed, notarized or
// uploaded: signing needs the owner's Apple Developer Program membership (listing/safari.md).
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAME } from './manifest.mjs';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const own = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'));
const option = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at > 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
};
const extensionDir = resolve(option('--extension', join(HERE, 'build', 'safari')));
const out = resolve(option('--out', join(HERE, 'build', 'safari-xcode')));
// Proposed: the reverse of qrcode-ai.com. The owner confirms it before the first upload; an App
// Store bundle identifier cannot change after that.
const bundleId = option('--bundle-identifier', 'com.qrcode-ai.qrcode-barcode-scanner');
// Safari 26.0 is the first to read 'wasm-unsafe-eval' in an extension policy; it runs on macOS 14
// Sonoma and later.
const MINIMUM_MACOS = '14.0';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

let failures = 0;
function check(ok, text, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`);
  if (!ok) {
    failures += 1;
    if (detail !== undefined) console.log(`     ${JSON.stringify(detail).slice(0, 400)}`);
  }
}

function walk(directory, base = directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...walk(path, base));
    else found.push(relative(base, path));
  }
  return found.sort();
}

function run(command, args, log) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (log) writeFileSync(log, text);
  if (result.status !== 0) {
    console.error(text.slice(-6000));
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
  return text;
}

const plist = (path) => JSON.parse(execFileSync('plutil',
  ['-convert', 'json', '-o', '-', path], { encoding: 'utf8' }));

// ------------------------------------------------------------------ project

mkdirSync(out, { recursive: true });
const xcode = run('xcodebuild', ['-version']).trim().split('\n').join(' ');
console.log(xcode);
const tool = ['safari-web-extension-packager', 'safari-web-extension-converter']
  .find((name) => spawnSync('xcrun', ['--find', name]).status === 0);
if (!tool) throw new Error('neither safari-web-extension-packager nor -converter is installed');
const projectRoot = join(out, 'project');
run('xcrun', [tool, extensionDir, '--project-location', projectRoot, '--app-name', NAME,
  '--bundle-identifier', bundleId, '--swift', '--copy-resources', '--macos-only', '--no-open',
  '--no-prompt', '--force'], join(out, 'packager.log'));
const project = join(projectRoot, NAME, `${NAME}.xcodeproj`);
check(statSync(project, { throwIfNoEntry: false })?.isDirectory() === true,
  `${tool} writes the Xcode project`, project);

// The packager's template targets older systems (macOS 10.14 with Xcode 26.3, 12.0 with Xcode
// 27.2), where Safari is older than 26.0 and the scanner cannot start. Xcode 26 writes the
// project as project.pbxproj (`KEY = 10.14;`), Xcode 27 as JSON project.xcproj (`"KEY": "12.0"`).
const projectFile = ['project.pbxproj', 'project.xcproj'].map((name) => join(project, name))
  .find((path) => statSync(path, { throwIfNoEntry: false })?.isFile());
let projectText = projectFile ? readFileSync(projectFile, 'utf8') : '';
let raised = 0;
projectText = projectText.replace(/(MACOSX_DEPLOYMENT_TARGET"?\s*[=:]\s*"?)\d+(?:\.\d+)*/g,
  (_, lead) => { raised += 1; return `${lead}${MINIMUM_MACOS}`; });
check(raised > 0, `the project targets macOS ${MINIMUM_MACOS} or later (${raised} setting(s))`);
// With --macos-only, Xcode 27.2's packager names the app from the app name
// (com.qrcode-ai.QR-Code---Barcode-Scanner) and only the extension from --bundle-identifier, and
// xcodebuild then refuses an extension whose identifier does not start with the app's.
const ids = { app: 0, extension: 0 };
projectText = projectText.replace(/(PRODUCT_BUNDLE_IDENTIFIER"?\s*[=:]\s*"?)([A-Za-z0-9.-]+)/g,
  (_, lead, id) => {
    const kind = id.endsWith('.Extension') ? 'extension' : 'app';
    ids[kind] += 1;
    return `${lead}${kind === 'extension' ? `${bundleId}.Extension` : bundleId}`;
  });
check(ids.app > 0 && ids.extension > 0,
  `the project names the app ${bundleId} and the extension ${bundleId}.Extension`, ids);
if (projectFile) writeFileSync(projectFile, projectText);
const listing = run('xcodebuild', ['-list', '-project', project]);
check(listing.includes(`Schemes:\n        ${NAME}\n`) && !/iOS/.test(listing),
  'the project has the macOS app scheme, and no iOS target');

// ------------------------------------------------------------------ build

const expected = walk(extensionDir);
const derived = join(out, 'derived');
run('xcodebuild', ['-project', project, '-scheme', NAME, '-configuration', 'Release',
  '-destination', 'generic/platform=macOS', '-derivedDataPath', derived,
  'CODE_SIGNING_ALLOWED=NO', 'build'], join(out, 'xcodebuild-macos.log'));
const app = join(derived, 'Build', 'Products', 'Release', `${NAME}.app`);
const appex = join(app, 'Contents', 'PlugIns', `${NAME} Extension.appex`);
const resources = join(appex, 'Contents', 'Resources');
check(statSync(appex, { throwIfNoEntry: false })?.isDirectory() === true,
  'xcodebuild builds the app with its extension, unsigned', appex);

const appInfo = plist(join(app, 'Contents', 'Info.plist'));
const extInfo = plist(join(appex, 'Contents', 'Info.plist'));
check(appInfo.CFBundleIdentifier === bundleId, `the app is ${bundleId}`,
  appInfo.CFBundleIdentifier);
check(extInfo.CFBundleIdentifier === `${bundleId}.Extension`
  && extInfo.NSExtension?.NSExtensionPointIdentifier === 'com.apple.Safari.web-extension',
`the extension is ${bundleId}.Extension, at Safari's web extension point`,
{ id: extInfo.CFBundleIdentifier, point: extInfo.NSExtension?.NSExtensionPointIdentifier });
check(appInfo.LSMinimumSystemVersion === MINIMUM_MACOS
  && extInfo.LSMinimumSystemVersion === MINIMUM_MACOS,
`the app and its extension need macOS ${MINIMUM_MACOS} or later, the first with Safari 26`,
{ app: appInfo.LSMinimumSystemVersion, extension: extInfo.LSMinimumSystemVersion });

const present = walk(resources);
const missing = expected.filter((file) => !present.includes(file));
const extra = present.filter((file) => !expected.includes(file));
const differ = expected.filter((file) => present.includes(file)
  && !readFileSync(join(resources, file)).equals(readFileSync(join(extensionDir, file))));
check(missing.length === 0 && extra.length === 0 && differ.length === 0,
  `the extension's resources are the ${expected.length} files of build/safari, byte for byte`,
  { missing, extra, differ });
const wasm = readFileSync(join(resources, 'vendor', 'qrcode-barcode-scanner-wasm',
  'qrcode-barcode-scanner_bg.wasm'));
check(sha256(wasm) === own.config.wasmSha256, 'the WebAssembly module is the pinned one');
const manifest = JSON.parse(readFileSync(join(resources, 'manifest.json'), 'utf8'));
check(manifest.browser_specific_settings?.safari?.strict_min_version === '26.0',
  'the manifest asks for Safari 26.0 or later', manifest.browser_specific_settings);

const zip = join(out, 'qrcode-barcode-scanner-safari-macos-unsigned.zip');
run('ditto', ['-c', '-k', '--keepParent', app, zip]);
const receipt = {
  xcode, tool, bundle_identifier: bundleId, extension: extensionDir,
  // Xcode 26 writes project.pbxproj, Xcode 27 the JSON project.xcproj.
  project_files: readdirSync(project).sort(),
  app: relative(out, app), extension_id: extInfo.CFBundleIdentifier,
  minimum_macos: appInfo.LSMinimumSystemVersion ?? null, files: expected.length,
  macos_unsigned_zip: { path: relative(out, zip), sha256: sha256(readFileSync(zip)) },
};
writeFileSync(join(out, 'safari-run.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(failures === 0 ? 'safari: every check passed' : `safari: ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
