// SPDX-License-Identifier: MIT
// Installs a built .mcpb the way an MCPB host does and drives its server over MCP stdio.
//
//   node distribution/mcpb/check/consumer.mjs BUNDLE.mcpb MIXED-FIXTURE.png [--receipt FILE]
//
// The pinned official MCPB library (@anthropic-ai/mcpb, from this folder's lockfile) unpacks the
// bundle, validates its manifest and resolves its launch command for eight folder settings: unset,
// empty, one folder, two folders, a value inherited from the environment, and three folders the
// server must refuse. Each server is started from that command alone, with no QRSCAN_* or
// NAPI_RS_* variable of this process, and answers JSON-RPC lines on stdin and stdout.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join, sep } from "node:path";
import { getMcpConfigForManifest, unpackExtension } from "@anthropic-ai/mcpb";

const [bundlePath, fixturePath, ...rest] = process.argv.slice(2);
const receiptPath = rest[0] === "--receipt" ? rest[1] : undefined;
if (!bundlePath || !fixturePath || (rest.length && !receiptPath) || rest.length > 2) {
  process.stderr.write("usage: consumer.mjs BUNDLE.mcpb MIXED-FIXTURE.png [--receipt FILE]\n");
  process.exit(2);
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const FIXTURE_SHA256 = "c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8";
const SERVER = { name: "io.github.qrcode-ai-com/qrcode-barcode-scanner", version: "0.3.1" };
const VERSIONS = { scanner: "0.11.0", pipeline: 5, score_contract: 5 };
const MIXED = [
  { symbology: "code128", text: "STOCK-4827", raw: Buffer.from("STOCK-4827").toString("base64") },
  { symbology: "qr_code", text: "https://qrc-ai.com/76xMa", raw: Buffer.from("https://qrc-ai.com/76xMa").toString("base64") },
];
const PROTOCOL = "2025-06-18";
const TIMEOUT_MS = 120_000;

const bundle = readFileSync(bundlePath);
const fixture = readFileSync(fixturePath);
assert.equal(sha256(fixture), FIXTURE_SHA256, "the mixed QR and Code 128 fixture of tag v0.11.0");
for (const key of Object.keys(process.env)) {
  assert.ok(!/^(QRSCAN_|NAPI_RS_)/.test(key), `${key} would reach the server`);
}

// The official tool's own validator, run as its command line.
const require = createRequire(import.meta.url);
// The package exports no package.json: its root is the parent of its main module's folder.
const toolRoot = dirname(dirname(require.resolve("@anthropic-ai/mcpb")));
const tool = join(toolRoot, "dist/cli/cli.js");
const toolVersion = JSON.parse(readFileSync(join(toolRoot, "package.json"), "utf8")).version;
assert.equal(toolVersion, "2.1.2", "the pinned MCPB tool");

const root = realpathSync.native(mkdtempSync(join(tmpdir(), "qrscan-mcpb-")));
const unpacked = join(root, "installed");
assert.equal(await unpackExtension({ mcpbPath: bundlePath, outputDir: unpacked, silent: true }), true, "the bundle unpacks");
const manifestPath = join(unpacked, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const validated = spawnSync(process.execPath, [tool, "validate", manifestPath], { encoding: "utf8" });
assert.equal(validated.status, 0, validated.stdout + validated.stderr);
assert.match(validated.stdout, /Manifest schema validation passes!/);
assert.doesNotMatch(validated.stdout + validated.stderr, /ERROR/);
// The same validator refuses a tool declared with an input schema: the manifest lists names only.
const schemaCopy = join(root, "with-input-schema");
mkdirSync(schemaCopy);
copyFileSync(join(unpacked, "icon.png"), join(schemaCopy, "icon.png"));
writeFileSync(join(schemaCopy, "manifest.json"), JSON.stringify({ ...manifest, tools: manifest.tools.map((entry) => ({ ...entry, inputSchema: { type: "object" } })) }));
const refusedSchema = spawnSync(process.execPath, [tool, "validate", join(schemaCopy, "manifest.json")], { encoding: "utf8" });
assert.equal(refusedSchema.status, 1, "mcpb validate refuses inputSchema in tools");
assert.match(refusedSchema.stdout + refusedSchema.stderr, /inputSchema/);

assert.equal(manifest.name, "qrcode-barcode-scanner");
assert.equal(manifest.version, "0.3.1");
assert.equal(manifest.server.entry_point, "server/launch.mjs");
assert.deepEqual(manifest.tools.map(({ name }) => name), ["scan_image", "scan_file"]);
assert.deepEqual(manifest.compatibility.platforms, ["darwin", "win32", "linux"]);
const adapterRoot = join(unpacked, "node_modules/@qrcode-ai-com/qrcode-barcode-scanner-mcp");
assert.equal(JSON.parse(readFileSync(join(adapterRoot, "package.json"), "utf8")).engines.node, manifest.compatibility.runtimes.node);
if (process.platform !== "win32") assert.equal(statSync(join(adapterRoot, "src/cli.mjs")).mode & 0o777, 0o755, "modes survive the unpack");

// Folders for scan_file: two the user allows, one beside them, and names the launcher refuses.
const folders = { first: join(root, "allowed-one"), second: join(root, "allowed-two"), outside: join(root, "outside") };
for (const folder of Object.values(folders)) mkdirSync(folder);
for (const folder of Object.values(folders)) writeFileSync(join(folder, "mixed.png"), fixture);
const withDelimiter = join(root, `left${delimiter}right`);
mkdirSync(withDelimiter);

const systemDirs = { HOME: homedir(), DESKTOP: join(homedir(), "Desktop"), DOCUMENTS: join(homedir(), "Documents"), DOWNLOADS: join(homedir(), "Downloads") };
async function launchCommand(userConfig) {
  const config = await getMcpConfigForManifest({ manifest, extensionPath: unpacked, systemDirs, userConfig, pathSeparator: sep });
  assert.ok(config, "the host resolves a launch command");
  assert.equal(config.command, "node");
  return config;
}

// Why the folders travel as arguments: the host does not expand them in an env value, set or not.
{
  const viaEnv = { ...manifest, server: { ...manifest.server, mcp_config: { command: "node", args: [`\${__dirname}/server/launch.mjs`], env: { QRSCAN_MCP_ALLOWED_DIRECTORIES: "${user_config.allowed_directories}" } } } };
  const warn = console.warn;
  console.warn = () => {};
  try {
    for (const userConfig of [{}, { allowed_directories: [folders.first, folders.second] }]) {
      const config = await getMcpConfigForManifest({ manifest: viaEnv, extensionPath: unpacked, systemDirs, userConfig, pathSeparator: sep });
      assert.equal(config.env.QRSCAN_MCP_ALLOWED_DIRECTORIES, "${user_config.allowed_directories}", "an env value keeps the placeholder");
    }
  } finally { console.warn = warn; }
}

// What a host passes besides the manifest's command: a minimal system environment. Keys come from
// the real list, since Windows reads process.env without regard to letter case.
const KEPT = new Set(["PATH", "SYSTEMROOT", "TEMP", "TMP", "HOME", "USERPROFILE", "LANG"]);
function hostEnvironment(extra = {}) {
  const env = {};
  for (const key of Object.keys(process.env)) if (KEPT.has(key.toUpperCase())) env[key] = process.env[key];
  return { ...env, ...extra };
}

/** One server process, started from the resolved command, spoken to in JSON-RPC lines. */
function start(config, extraEnv = {}) {
  const child = spawn(process.execPath, config.args, { cwd: root, env: hostEnvironment({ ...(config.env ?? {}), ...extraEnv }), stdio: ["pipe", "pipe", "pipe"] });
  const pending = new Map();
  let buffer = "";
  let stderr = "";
  let next = 1;
  const exited = new Promise((resolve) => child.on("exit", (code, signal) => resolve({ code, signal })));
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    for (let end = buffer.indexOf("\n"); end !== -1; end = buffer.indexOf("\n")) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      if (message.id !== undefined && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    }
  });
  return {
    get stderr() { return stderr; },
    exited,
    async request(method, params) {
      const message = await this.exchange(method, params);
      assert.equal(message.error, undefined, `${method}: ${JSON.stringify(message.error)}`);
      return message.result;
    },
    async exchange(method, params) {
      const id = next++;
      const answer = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${method}: no answer in ${TIMEOUT_MS} ms; stderr: ${stderr}`)), TIMEOUT_MS);
        pending.set(id, (message) => { clearTimeout(timer); resolve(message); });
        exited.then(({ code }) => reject(new Error(`${method}: the server exited (${code}) before answering; stderr: ${stderr}`)));
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      return answer;
    },
    notify(method, params) { child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, ...(params ? { params } : {}) }) + "\n"); },
    async close() { child.stdin.end(); return exited; },
  };
}

async function session(config, extraEnv) {
  const server = start(config, extraEnv);
  const initialized = await server.request("initialize", { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: "qrscan-mcpb-consumer", version: "1.0.0" } });
  assert.equal(initialized.protocolVersion, PROTOCOL);
  assert.equal(initialized.serverInfo.name, SERVER.name);
  assert.equal(initialized.serverInfo.version, SERVER.version);
  server.notify("notifications/initialized");
  return server;
}

function reportOf(result) {
  assert.equal(result.isError, false, JSON.stringify(result).slice(0, 600));
  assert.deepEqual(JSON.parse(result.content.find(({ type }) => type === "text").text), result.structuredContent);
  const report = result.structuredContent;
  assert.deepEqual(report.versions, VERSIONS);
  assert.equal(report.trace.budget_exhausted, false);
  return report;
}

function identities(report) {
  return report.detections.map(({ symbology, content }) => ({ symbology, text: content.text, raw: content.raw }))
    .sort((a, b) => a.symbology.localeCompare(b.symbology));
}

function refusalOf(result) {
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent, undefined);
  return JSON.parse(result.content.find(({ type }) => type === "text").text).error.code;
}

const cases = [];
async function toolNames(server) {
  return (await server.request("tools/list", {})).tools.map(({ name }) => name).sort();
}
async function limits(server) {
  return JSON.parse((await server.request("resources/read", { uri: "qrscan://limits" })).contents[0].text);
}
async function finish(server, label, { stderr = "" } = {}) {
  const { code } = await server.close();
  assert.equal(code, 0, `${label}: exit ${code}; stderr: ${server.stderr}`);
  assert.equal(server.stderr, stderr, `${label}: stderr`);
}

// 1 · Folder setting unset: the host leaves the placeholder; bytes only, no file access.
{
  const config = await launchCommand({});
  // The placeholder stays as written: the host has no value to put in its place.
  assert.deepEqual(config.args, [`${unpacked}/server/launch.mjs`, "${user_config.allowed_directories}"]);
  const server = await session(config);
  assert.deepEqual(await toolNames(server), ["scan_image"]);
  const active = await limits(server);
  assert.deepEqual(active.allowedDirectories, []);
  assert.equal(active.fileAccess, "no client paths");
  for (const profile of ["fast", "frame", "full"]) {
    const report = reportOf(await server.request("tools/call", { name: "scan_image", arguments: { imageBase64: fixture.toString("base64"), profile, budgetMs: 0 } }));
    assert.deepEqual(identities(report), MIXED, `scan_image ${profile}: both exact payloads`);
    if (profile === "frame") assert.equal(report.score, null);
  }
  assert.equal(refusalOf(await server.request("tools/call", { name: "scan_image", arguments: { imageBase64: "data:image/png;base64,AAAA" } })), "QRSMCP_BASE64");
  // Without a folder the tool does not exist: a JSON-RPC error or an error result, never a report.
  const absent = await server.exchange("tools/call", { name: "scan_file", arguments: { path: join(folders.first, "mixed.png") } });
  assert.ok(absent.error !== undefined || (absent.result.isError === true && absent.result.structuredContent === undefined), JSON.stringify(absent));
  await finish(server, "unset");
  cases.push({ setting: "unset", placeholderKept: true, tools: ["scan_image"], scanImageProfiles: ["fast", "frame", "full"], exactPayloads: MIXED.map(({ text }) => text) });
}

// 2 · An empty selection expands to no argument: the same bytes-only server.
{
  const config = await launchCommand({ allowed_directories: [] });
  assert.equal(config.args.length, 1);
  const server = await session(config);
  assert.deepEqual(await toolNames(server), ["scan_image"]);
  await finish(server, "empty");
  cases.push({ setting: "empty", args: 0, tools: ["scan_image"] });
}

// 3 · One folder, then two: scan_file reads inside them only.
for (const chosen of [[folders.first], [folders.first, folders.second]]) {
  const config = await launchCommand({ allowed_directories: chosen });
  assert.deepEqual(config.args.slice(1), chosen, "the host expands the folders as separate arguments");
  const server = await session(config);
  assert.deepEqual(await toolNames(server), ["scan_file", "scan_image"]);
  assert.deepEqual((await limits(server)).allowedDirectories, chosen.map((folder) => realpathSync.native(folder)));
  for (const folder of chosen) {
    const report = reportOf(await server.request("tools/call", { name: "scan_file", arguments: { path: join(folder, "mixed.png"), profile: "frame", budgetMs: 0 } }));
    assert.deepEqual(identities(report), MIXED, `scan_file in ${folder}: both exact payloads`);
  }
  assert.equal(refusalOf(await server.request("tools/call", { name: "scan_file", arguments: { path: join(folders.outside, "mixed.png") } })), "QRSMCP_PATH_DENIED");
  assert.equal(refusalOf(await server.request("tools/call", { name: "scan_file", arguments: { path: "mixed.png" } })), "QRSMCP_PATH");
  if (chosen.length === 1) {
    assert.equal(refusalOf(await server.request("tools/call", { name: "scan_file", arguments: { path: join(folders.second, "mixed.png") } })), "QRSMCP_PATH_DENIED");
  }
  await finish(server, `${chosen.length} folder(s)`);
  cases.push({ setting: `${chosen.length} folder(s)`, args: chosen.length, tools: ["scan_file", "scan_image"], scanFileExactPayloads: MIXED.map(({ text }) => text), outsideRefused: "QRSMCP_PATH_DENIED" });
}

// 4 · A value inherited from the host's environment grants nothing.
{
  const config = await launchCommand({});
  const server = await session(config, { QRSCAN_MCP_ALLOWED_DIRECTORIES: folders.outside });
  assert.deepEqual(await toolNames(server), ["scan_image"]);
  await finish(server, "inherited", { stderr: "qrscan-mcpb: QRSCAN_MCP_ALLOWED_DIRECTORIES from the environment is not used; allow folders in the extension settings\n" });
  cases.push({ setting: "inherited environment only", tools: ["scan_image"] });
}

// 5 · Folders the server must not start with: each stops it with one line on stderr.
for (const [label, chosen, message] of [
  ["a folder holding the delimiter", [withDelimiter], `qrscan-mcpb: folder 1 contains "${delimiter}", which separates folders; choose another folder\n`],
  ["a relative folder", ["relative-folder"], "qrscan-mcpb: folder 1 is not an absolute path\n"],
  ["a missing folder", [join(root, "missing")], "qrscan-mcp: QRSCAN_MCP_ALLOWED_DIRECTORIES entry 1 must be an existing directory\n"],
]) {
  const server = start(await launchCommand({ allowed_directories: chosen }));
  const { code } = await server.exited;
  assert.equal(code, 1, `${label}: exit ${code}`);
  assert.equal(server.stderr, message, label);
  cases.push({ setting: label, exit: 1, stderr: message.trim() });
}

const loaded = ["darwin-arm64", "darwin-x64", "linux-arm64-gnu", "linux-x64-gnu", "linux-x64-musl", "win32-x64-msvc"]
  .map((target) => join(unpacked, `node_modules/@qrcode-ai-com/qrcode-barcode-scanner-${target}/qrcode-barcode-scanner.${target}.node`));
for (const file of loaded) assert.ok(statSync(file).size > 1_000_000, `${file} is in the bundle`);
const receipt = {
  verdict: "PASS",
  bundle: { file: bundlePath.split(/[\\/]/).pop(), size: bundle.length, sha256: sha256(bundle) },
  host: { os: process.platform, arch: process.arch, node: process.version, separator: sep, delimiter },
  tool: { name: "@anthropic-ai/mcpb", version: toolVersion, validate: "pass", inputSchemaRefused: true },
  protocol: PROTOCOL,
  fixtureSha256: FIXTURE_SHA256,
  cases,
};
if (receiptPath) writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(`PASS ${receipt.bundle.file} sha256 ${receipt.bundle.sha256} on ${process.platform}-${process.arch} Node ${process.version}: ${cases.length} settings\n`);
