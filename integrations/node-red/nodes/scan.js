// SPDX-License-Identifier: MIT
'use strict';
const { open } = require('node:fs/promises');
const { isAbsolute, resolve } = require('node:path');
const core = require('./scan-core.js');

/**
 * Read an image file named by a message, with the same size boundary as image bytes.
 * Relative paths start from the Node-RED working directory, like the core file nodes.
 */
async function readImageFile(path, workingDirectory) {
  if (path.length === 0 || path.length > 4096 || path.includes('\0')) {
    throw new core.ScanError('QRSCAN_PATH', 'The image path must be a nonempty file path of at most 4096 characters');
  }
  const absolute = isAbsolute(path) ? path : resolve(workingDirectory, path);
  let handle;
  try {
    handle = await open(absolute, 'r');
  } catch {
    throw new core.ScanError('QRSCAN_FILE', `No readable image file at ${absolute}`);
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) throw new core.ScanError('QRSCAN_FILE', `${absolute} is not a regular file`);
    if (stats.size > core.LIMITS.inputBytes) {
      throw new core.ScanError('QRSCAN_INPUT_LIMIT', `The image exceeds ${core.LIMITS.inputBytes} bytes`);
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

module.exports = function register(RED) {
  function QrcodeBarcodeScannerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const property = config.property || 'payload';
    const profile = config.profile || 'frame';
    const budgetMs = config.budgetMs === undefined || config.budgetMs === '' ? undefined : Number(config.budgetMs);
    const workingDirectory = (RED.settings && RED.settings.fileWorkingDirectory) || process.cwd();

    node.on('input', async (msg, send, done) => {
      try {
        const input = RED.util.getMessageProperty(msg, property);
        let bytes;
        if (typeof input === 'string') bytes = await readImageFile(input, workingDirectory);
        else if (input instanceof Uint8Array) bytes = input;
        else {
          throw new core.ScanError('QRSCAN_INPUT', `msg.${property} must be a Buffer of image bytes or the path of an image file`);
        }
        node.status({ fill: 'blue', shape: 'dot', text: 'scanning' });
        const report = await core.scanImage(bytes, {
          profile: msg.profile === undefined ? profile : msg.profile,
          budgetMs: msg.budgetMs === undefined ? budgetMs : msg.budgetMs,
        });
        const summary = core.summarize(report);
        msg.payload = report;
        msg.texts = summary.texts;
        msg.codes = summary.codes;
        node.status({
          fill: 'green',
          shape: 'dot',
          text: summary.count === 0 ? 'no code' : `${summary.count} code${summary.count === 1 ? '' : 's'}`,
        });
        send(msg);
        done();
      } catch (error) {
        node.status({ fill: 'red', shape: 'ring', text: error.code || 'error' });
        done(error);
      }
    });

    node.on('close', (removed, done) => {
      node.status({});
      done();
    });
  }

  RED.nodes.registerType('qrcode-barcode-scanner', QrcodeBarcodeScannerNode);
};
