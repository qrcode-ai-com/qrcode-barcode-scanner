// SPDX-License-Identifier: MIT
// Make's own JSON schemas for app files, from integromat/vscode-apps-sdk (the Make Apps Editor) at
// one commit, each checked against its SHA-256. They are downloaded into test/.schemas, never
// committed: that repository's LICENSE.md (MIT, Celonis, Inc.) covers them.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const COMMIT = '6ff5f3dd9960ccbeb24de3beb1cca935de89eaa0';
const RAW = `https://raw.githubusercontent.com/integromat/vscode-apps-sdk/${COMMIT}/`;
const IML = 'syntaxes/imljson/schemas/';
export const SCHEMAS = {
  'api.json': [IML, 'a78235dd1acff1514b7e187c222913114e0300b52261db7ebc9abb2e5126a2db'],
  'base.json': [IML, '25853b2999cfcfe59417471335f54993dae2f006b3ec387b2309cd49d7b0e472'],
  'common.json': [IML, '7e8b0d0b94f488d76918706192f8c65bac26a87cc5972c7ac1f29e42ee9bb1fb'],
  'enums.json': [IML, 'eb163a4f13a46cc425110883dfb9d567f3758aabf40489ee4727557e08ea8ee5'],
  'groups.json': [IML, '05fe4269b1c3c3446f923ec1fa36ca065095429dbf5e4bafdc4cf5e9af03eff6'],
  'parameters.json': [IML, '9f629c361ad20b13fc7f6eb270e70a3c36f4e2e1fcf66ae701bfbbb7bde1f99e'],
  'response.json': [IML, 'c56b8d57558bc70a10619c3d724b2df570fe4b844ff187459740d36bfed06db0'],
  'samples.json': [IML, '7e8b0d0b94f488d76918706192f8c65bac26a87cc5972c7ac1f29e42ee9bb1fb'],
  'scope.json': [IML, '29d9fb719525f8e30896a0363ceae74b0009e748fc88d9beaf07e77912eb71e5'],
  'sources.json': [IML, '7bc585e32ce0e640bfd79d6da2c80ea78c1e8fd118a874d8228d39e5c1303b18'],
  'makecomapp.schema.json': ['syntaxes/local-development/schemas/', '88f560a30f22fc97262dd0fdea46974fdf19deb0cbe938d09074611cf836a53e'],
};

const cache = join(dirname(fileURLToPath(import.meta.url)), '.schemas', COMMIT);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Every schema, parsed, by file name: from the cache when its bytes match, else downloaded. */
export async function loadSchemas() {
  mkdirSync(cache, { recursive: true });
  const schemas = {};
  for (const [name, [folder, expected]] of Object.entries(SCHEMAS)) {
    const path = join(cache, name);
    let bytes = null;
    try { bytes = readFileSync(path); } catch { bytes = null; }
    if (bytes === null || sha256(bytes) !== expected) {
      const response = await fetch(RAW + folder + name);
      if (!response.ok) throw new Error(`${name}: HTTP ${response.status} from the Make Apps Editor repository`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (sha256(bytes) !== expected) throw new Error(`${name}: SHA-256 ${sha256(bytes)} is not the pinned ${expected}`);
      writeFileSync(path, bytes);
    }
    schemas[name] = JSON.parse(bytes.toString('utf8'));
  }
  return schemas;
}
