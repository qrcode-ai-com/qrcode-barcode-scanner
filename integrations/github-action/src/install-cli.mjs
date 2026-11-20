// SPDX-License-Identifier: MIT
// Installs the pinned qrscan into a folder and prints the executable's path, for a job that only
// needs the command (`node src/install-cli.mjs <folder> [version]`).
import { resolve } from 'node:path';
import { install } from './install.mjs';
import { DEFAULT_VERSION } from './releases.mjs';

const [folder, version = DEFAULT_VERSION] = process.argv.slice(2);
if (!folder) {
  console.error('usage: node install-cli.mjs <folder> [version]');
  process.exit(2);
}
try {
  const installed = await install({ version, root: resolve(folder) });
  console.log(installed.path);
} catch (error) {
  console.error(`install-cli: ${error.message}`);
  process.exit(1);
}
