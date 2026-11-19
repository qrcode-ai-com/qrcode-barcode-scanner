// SPDX-License-Identifier: MIT
// Installs one published qrscan for the runner: the release's SHA256SUMS is downloaded and held to
// its pinned sha256, the runner's archive is held to its SHA256SUMS line (and to the pinned value
// when the version is pinned), and the executable is held to its pinned sha256 after extraction.
// Nothing is built and nothing outside the install folder is written.
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readTarGz, readZip } from './archive.mjs';
import { DEFAULT_VERSION, RELEASES, REPOSITORY } from './releases.mjs';

export class InstallError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InstallError';
  }
}

const VERSION = /^\d+\.\d+\.\d+$/;
const HEX64 = /^[0-9a-f]{64}$/;
const MAX_DOWNLOAD = 64 * 1024 * 1024;
const ASSET_HOSTS = ['github.com', '.githubusercontent.com'];

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** The release target of this runner, or an InstallError naming what is not published. */
export function targetFor(platform = process.platform, arch = process.arch, glibc = glibcVersion()) {
  if (platform === 'darwin' && arch === 'arm64') return 'aarch64-apple-darwin';
  if (platform === 'darwin' && arch === 'x64') return 'x86_64-apple-darwin';
  if (platform === 'win32' && arch === 'x64') return 'x86_64-pc-windows-msvc';
  if (platform === 'linux' && (arch === 'x64' || arch === 'arm64')) {
    if (!glibc) throw new InstallError('qrscan is published for glibc Linux only: this runner has no glibc (an Alpine or other musl container)');
    const [major, minor] = glibc.split('.').map(Number);
    if (major < 2 || (major === 2 && minor < 28)) throw new InstallError(`qrscan needs glibc 2.28 or later; this runner has ${glibc}`);
    return arch === 'x64' ? 'x86_64-unknown-linux-gnu' : 'aarch64-unknown-linux-gnu';
  }
  throw new InstallError(`no qrscan archive is published for ${platform} ${arch}`);
}

function glibcVersion() {
  if (process.platform !== 'linux') return undefined;
  try {
    return process.report.getReport().header.glibcVersionRuntime;
  } catch {
    return undefined;
  }
}

export function assetNames(version, target) {
  const base = `qrcode-barcode-scanner-cli-${version}`;
  const extension = target.endsWith('windows-msvc') ? 'zip' : 'tar.gz';
  return { sums: `${base}-SHA256SUMS`, archive: `${base}-${target}.${extension}`, folder: `${base}-${target}` };
}

/** `<sha256>  <name>` lines of a SHA256SUMS file, as Map(name → sha256). */
export function parseSums(text) {
  if (text.includes('\r') || !text.endsWith('\n')) throw new InstallError('SHA256SUMS is not LF-terminated text');
  const lines = new Map();
  for (const line of text.slice(0, -1).split('\n')) {
    const match = /^([0-9a-f]{64}) {2}([A-Za-z0-9._-]+)$/.exec(line);
    if (!match) throw new InstallError(`SHA256SUMS holds the line ${JSON.stringify(line)}`);
    if (lines.has(match[2])) throw new InstallError(`SHA256SUMS lists ${match[2]} twice`);
    lines.set(match[2], match[1]);
  }
  return lines;
}

function allowedHost(url) {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' && ASSET_HOSTS.some((host) => (host.startsWith('.') ? hostname.endsWith(host) : hostname === host));
}

/** One anonymous HTTPS download from a GitHub release, retried on a network error or a 5xx. */
export async function download(url, { fetchImpl = fetch, attempts = 3, pause = (ms) => new Promise((done) => setTimeout(done, ms)) } = {}) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, { redirect: 'follow', headers: { 'User-Agent': 'qrcode-barcode-scanner-action', Accept: 'application/octet-stream' } });
    } catch (error) {
      last = new InstallError(`${url}: ${error.message}`);
      if (attempt < attempts) { await pause(2000 * attempt); continue; }
      throw last;
    }
    if (response.status >= 500 && attempt < attempts) { await pause(2000 * attempt); continue; }
    if (!response.ok) throw new InstallError(`${url}: HTTP ${response.status}${response.status === 404 ? ' (no such release asset)' : ''}`);
    if (!allowedHost(response.url || url)) throw new InstallError(`${url}: the bytes came from ${response.url}, not GitHub`);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > MAX_DOWNLOAD) throw new InstallError(`${url}: more than ${MAX_DOWNLOAD} bytes`);
    return data;
  }
  throw last;
}

/** What this action trusts for VERSION: the pinned table, or the caller's SHA256SUMS hash. */
export function trustFor(version, sumsSha256, releases = RELEASES) {
  if (!VERSION.test(version)) throw new InstallError(`version must look like 1.2.3, not ${JSON.stringify(version)}`);
  const pinned = Object.hasOwn(releases, version) ? releases[version] : undefined;
  const given = (sumsSha256 || '').trim().toLowerCase();
  if (given && !HEX64.test(given)) throw new InstallError('sums-sha256 must be 64 lowercase hexadecimal digits');
  if (pinned) {
    if (given && given !== pinned.sums) throw new InstallError(`sums-sha256 differs from the value pinned for ${version}`);
    return { tag: pinned.tag, sums: pinned.sums, archives: pinned.archives };
  }
  if (!given) throw new InstallError(`version ${version} is not pinned in this action: give its sums-sha256, the sha256 of its SHA256SUMS file`);
  return { tag: `v${version}`, sums: given, archives: {} };
}

/**
 * Download, check and unpack qrscan VERSION for TARGET into ROOT/<folder>. An install already
 * present is used again only when its executable still has the expected hash.
 * Returns { path, version, target, folder, archive }.
 */
export async function install({ version = DEFAULT_VERSION, sumsSha256 = '', target, root, repository = REPOSITORY, fetchImpl, releases = RELEASES } = {}) {
  if (!root) throw new InstallError('no install folder was given');
  const trust = trustFor(version, sumsSha256, releases);
  target ??= targetFor();
  const names = assetNames(version, target);
  const executableName = target.endsWith('windows-msvc') ? 'qrscan.exe' : 'qrscan';
  const folder = join(root, names.folder);
  const executable = join(folder, executableName);
  const pinned = trust.archives[target];
  if (pinned && existsSync(executable) && sha256(readFileSync(executable)) === pinned.executable) {
    return { path: executable, version, target, folder, archive: names.archive, reused: true };
  }
  const base = `https://github.com/${repository}/releases/download/${trust.tag}/`;
  const sums = await download(base + names.sums, { fetchImpl });
  if (sha256(sums) !== trust.sums) throw new InstallError(`${names.sums}: sha256 ${sha256(sums)} is not the expected ${trust.sums}`);
  const lines = parseSums(sums.toString('ascii'));
  const listed = lines.get(names.archive);
  if (!listed) throw new InstallError(`${names.archive} is not listed in ${names.sums}`);
  if (pinned && listed !== pinned.sha256) throw new InstallError(`${names.sums} lists ${listed} for ${names.archive}, the action pins ${pinned.sha256}`);
  const archive = await download(base + names.archive, { fetchImpl });
  if (sha256(archive) !== listed) throw new InstallError(`${names.archive}: sha256 ${sha256(archive)} is not its SHA256SUMS line ${listed}`);
  const members = names.archive.endsWith('.zip') ? readZip(archive, names.folder) : readTarGz(archive, names.folder);
  const binary = members.get(executableName);
  if (!binary) throw new InstallError(`${names.archive} holds no ${executableName}`);
  if (pinned && sha256(binary.data) !== pinned.executable) throw new InstallError(`${executableName} in ${names.archive} is not the pinned executable`);
  const staging = `${folder}.partial-${process.pid}`;
  rmSync(staging, { recursive: true, force: true });
  for (const [relative, { data, mode }] of members) {
    const target = join(staging, ...relative.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
    if (process.platform !== 'win32') chmodSync(target, relative === executableName ? 0o755 : mode & 0o644 || 0o644);
  }
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(dirname(folder), { recursive: true });
  renameSync(staging, folder);
  return { path: executable, version, target, folder, archive: names.archive, reused: false };
}
