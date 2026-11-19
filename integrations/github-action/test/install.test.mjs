// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ArchiveError, readTarGz, readZip } from '../src/archive.mjs';
import { assetNames, install, InstallError, parseSums, sha256, targetFor, trustFor } from '../src/install.mjs';
import { DEFAULT_VERSION, RELEASES } from '../src/releases.mjs';
import { fakeFetch, tarGz, zip } from './helpers.mjs';

const TOP = 'qrcode-barcode-scanner-cli-9.9.9-x86_64-unknown-linux-gnu';

test('each runner maps to the archive published for it, and the others are refused by name', () => {
  assert.equal(targetFor('linux', 'x64', '2.39'), 'x86_64-unknown-linux-gnu');
  assert.equal(targetFor('linux', 'arm64', '2.28'), 'aarch64-unknown-linux-gnu');
  assert.equal(targetFor('darwin', 'arm64'), 'aarch64-apple-darwin');
  assert.equal(targetFor('darwin', 'x64'), 'x86_64-apple-darwin');
  assert.equal(targetFor('win32', 'x64'), 'x86_64-pc-windows-msvc');
  // null, not undefined: undefined would read this host's own glibc.
  assert.throws(() => targetFor('linux', 'x64', null), /musl/);
  assert.throws(() => targetFor('linux', 'x64', '2.27'), /glibc 2\.28 or later; this runner has 2\.27/);
  assert.throws(() => targetFor('win32', 'arm64'), /no qrscan archive is published for win32 arm64/);
  assert.throws(() => targetFor('freebsd', 'x64'), InstallError);
});

test('the pinned table names every published target of the default version', () => {
  const pinned = RELEASES[DEFAULT_VERSION];
  assert.equal(pinned.tag, `v${DEFAULT_VERSION}`);
  assert.deepEqual(Object.keys(pinned.archives).sort(), ['aarch64-apple-darwin', 'aarch64-unknown-linux-gnu',
    'x86_64-apple-darwin', 'x86_64-pc-windows-msvc', 'x86_64-unknown-linux-gnu']);
  for (const value of [pinned.sums, ...Object.values(pinned.archives).flatMap((a) => [a.sha256, a.executable])]) {
    assert.match(value, /^[0-9a-f]{64}$/);
  }
  assert.equal(assetNames(DEFAULT_VERSION, 'x86_64-pc-windows-msvc').archive, `qrcode-barcode-scanner-cli-${DEFAULT_VERSION}-x86_64-pc-windows-msvc.zip`);
});

test('a version is trusted only through the pinned table or a given SHA256SUMS hash', () => {
  assert.equal(trustFor(DEFAULT_VERSION, '').sums, RELEASES[DEFAULT_VERSION].sums);
  assert.throws(() => trustFor(DEFAULT_VERSION, 'a'.repeat(64)), /differs from the value pinned/);
  assert.throws(() => trustFor('9.9.9', ''), /is not pinned in this action/);
  assert.throws(() => trustFor('9.9.9', 'xyz'), /64 lowercase hexadecimal/);
  assert.throws(() => trustFor('latest', ''), /must look like/);
  assert.equal(trustFor('9.9.9', 'b'.repeat(64)).tag, 'v9.9.9');
});

test('SHA256SUMS is read exactly', () => {
  const good = `${'a'.repeat(64)}  one.tar.gz\n${'b'.repeat(64)}  two.zip\n`;
  assert.deepEqual([...parseSums(good)], [['one.tar.gz', 'a'.repeat(64)], ['two.zip', 'b'.repeat(64)]]);
  assert.throws(() => parseSums(good.replace(/\n/g, '\r\n')), /LF-terminated/);
  assert.throws(() => parseSums(good.trimEnd()), /LF-terminated/);
  assert.throws(() => parseSums(`${'a'.repeat(63)}  one\n`), /holds the line/);
  assert.throws(() => parseSums(`${'a'.repeat(64)}  one\n${'b'.repeat(64)}  one\n`), /twice/);
});

test('the tar reader returns regular files under the top folder and refuses anything else', () => {
  const files = readTarGz(tarGz([{ name: `${TOP}/`, type: '5' }, { name: `${TOP}/qrscan`, data: 'binary', mode: 0o755 },
    { name: `${TOP}/LICENSE`, data: 'text' }]), TOP);
  assert.deepEqual([...files.keys()], ['qrscan', 'LICENSE']);
  assert.equal(files.get('qrscan').data.toString(), 'binary');
  assert.equal(files.get('qrscan').mode, 0o755);
  assert.throws(() => readTarGz(tarGz([{ name: `${TOP}/../evil`, data: 'x' }]), TOP), /climbs out/);
  assert.throws(() => readTarGz(tarGz([{ name: '/etc/evil', data: 'x' }]), TOP), /absolute/);
  assert.throws(() => readTarGz(tarGz([{ name: 'other/qrscan', data: 'x' }]), TOP), /outside the folder/);
  assert.throws(() => readTarGz(tarGz([{ name: `${TOP}/qrscan`, type: '2' }]), TOP), /not a regular file/);
  assert.throws(() => readTarGz(Buffer.from('not gzip'), TOP), ArchiveError);
});

test('the zip reader checks sizes and CRC-32 and refuses a climbing name', () => {
  const files = readZip(zip([{ name: `${TOP}/qrscan.exe`, data: 'windows binary' }]), TOP);
  assert.equal(files.get('qrscan.exe').data.toString(), 'windows binary');
  assert.throws(() => readZip(zip([{ name: `${TOP}/qrscan.exe`, data: 'x', corruptCrc: true }]), TOP), /CRC-32/);
  assert.throws(() => readZip(zip([{ name: `${TOP}\\..\\evil`, data: 'x' }]), TOP), /climbs out/);
  assert.throws(() => readZip(Buffer.from('PK nothing'), TOP), /not a zip/);
});

function release(executable = 'fake qrscan') {
  const archive = tarGz([{ name: `${TOP}/qrscan`, data: executable, mode: 0o755 }, { name: `${TOP}/LICENSE`, data: 'license' }]);
  const sums = Buffer.from(`${sha256(archive)}  ${TOP}.tar.gz\n`);
  return { archive, sums, files: { [`${TOP}.tar.gz`]: archive, 'qrcode-barcode-scanner-cli-9.9.9-SHA256SUMS': sums } };
}

test('install checks SHA256SUMS, then the archive, then unpacks into its own folder', async () => {
  const root = mkdtempSync(join(tmpdir(), 'qrscan-action-'));
  const { sums, files } = release();
  const fetchImpl = fakeFetch(files);
  const installed = await install({ version: '9.9.9', sumsSha256: sha256(sums), target: 'x86_64-unknown-linux-gnu', root, fetchImpl });
  assert.equal(installed.path, join(root, TOP, 'qrscan'));
  assert.equal(readFileSync(installed.path, 'utf8'), 'fake qrscan');
  assert.deepEqual(readdirSync(join(root, TOP)).sort(), ['LICENSE', 'qrscan']);
  if (process.platform !== 'win32') assert.equal(statSync(installed.path).mode & 0o777, 0o755);
  assert.deepEqual(fetchImpl.calls, [
    'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v9.9.9/qrcode-barcode-scanner-cli-9.9.9-SHA256SUMS',
    `https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v9.9.9/${TOP}.tar.gz`]);
  assert.deepEqual(readdirSync(root), [TOP], 'no partial folder is left behind');
});

test('install refuses a wrong SHA256SUMS, a wrong archive, a missing line and a foreign host', async () => {
  const root = mkdtempSync(join(tmpdir(), 'qrscan-action-'));
  const { sums, files } = release();
  const options = { version: '9.9.9', target: 'x86_64-unknown-linux-gnu', root };
  await assert.rejects(install({ ...options, sumsSha256: 'c'.repeat(64), fetchImpl: fakeFetch(files) }), /SHA256SUMS: sha256 .* is not the expected/);
  const tampered = { ...files, [`${TOP}.tar.gz`]: tarGz([{ name: `${TOP}/qrscan`, data: 'evil' }]) };
  await assert.rejects(install({ ...options, sumsSha256: sha256(sums), fetchImpl: fakeFetch(tampered) }), /is not its SHA256SUMS line/);
  await assert.rejects(install({ ...options, target: 'aarch64-apple-darwin', sumsSha256: sha256(sums), fetchImpl: fakeFetch(files) }), /is not listed in/);
  await assert.rejects(install({ ...options, sumsSha256: sha256(sums), fetchImpl: fakeFetch(files, { host: 'https://example.com/' }) }), /not GitHub/);
  await assert.rejects(install({ ...options, sumsSha256: sha256(sums), fetchImpl: fakeFetch({}) }), /HTTP 404 \(no such release asset\)/);
  assert.equal(existsSync(join(root, TOP)), false, 'nothing is installed after a refusal');
});

test('a pinned version refuses an archive or an executable that is not the pinned one', async () => {
  const { archive, sums, files } = release();
  const target = 'x86_64-unknown-linux-gnu';
  const table = (archiveSha, executableSha) => ({ '9.9.9': { tag: 'v9.9.9', sums: sha256(sums), archives: { [target]: { sha256: archiveSha, executable: executableSha } } } });
  const root = mkdtempSync(join(tmpdir(), 'qrscan-action-'));
  await assert.rejects(install({ version: '9.9.9', target, root, fetchImpl: fakeFetch(files), releases: table('d'.repeat(64), 'e'.repeat(64)) }), /the action pins d{64}/);
  await assert.rejects(install({ version: '9.9.9', target, root, fetchImpl: fakeFetch(files), releases: table(sha256(archive), 'e'.repeat(64)) }), /is not the pinned executable/);
  const pinned = table(sha256(archive), sha256(Buffer.from('fake qrscan')));
  const first = await install({ version: '9.9.9', target, root, fetchImpl: fakeFetch(files), releases: pinned });
  assert.equal(first.reused, false);
  const again = fakeFetch(files);
  const second = await install({ version: '9.9.9', target, root, fetchImpl: again, releases: pinned });
  assert.equal(second.reused, true);
  assert.deepEqual(again.calls, [], 'a checked install is used again without a download');
  await assert.rejects(install({ version: DEFAULT_VERSION, target, root, fetchImpl: fakeFetch({ [`qrcode-barcode-scanner-cli-${DEFAULT_VERSION}-SHA256SUMS`]: sums }) }), /is not the expected/);
});

test('a transient server error is retried, a refusal is not', async () => {
  const { sums, files } = release();
  let failures = 1;
  const flaky = fakeFetch(files);
  const impl = async (url) => (failures-- > 0 ? { ok: false, status: 503, url, arrayBuffer: async () => Buffer.alloc(0) } : flaky(url));
  const root = mkdtempSync(join(tmpdir(), 'qrscan-action-'));
  const installed = await install({ version: '9.9.9', sumsSha256: sha256(sums), target: 'x86_64-unknown-linux-gnu', root, fetchImpl: impl });
  assert.equal(installed.reused, false);
});

// The published archives, when a folder of them is given (QRSCAN_ARCHIVES): the reader finds the
// pinned executable in each, byte for byte.
test('the published archives hold the pinned executables', { skip: !process.env.QRSCAN_ARCHIVES && 'set QRSCAN_ARCHIVES to a folder of release archives' }, () => {
  const pinned = RELEASES[DEFAULT_VERSION];
  let checked = 0;
  for (const [target, values] of Object.entries(pinned.archives)) {
    const names = assetNames(DEFAULT_VERSION, target);
    const path = join(process.env.QRSCAN_ARCHIVES, names.archive);
    if (!existsSync(path)) continue;
    const data = readFileSync(path);
    assert.equal(sha256(data), values.sha256, names.archive);
    const members = names.archive.endsWith('.zip') ? readZip(data, names.folder) : readTarGz(data, names.folder);
    const executable = members.get(target.endsWith('msvc') ? 'qrscan.exe' : 'qrscan');
    assert.equal(sha256(executable.data), values.executable, `${names.archive} executable`);
    assert.ok(members.has('LICENSE'));
    checked += 1;
  }
  assert.ok(checked > 0, 'no published archive was found in QRSCAN_ARCHIVES');
});
