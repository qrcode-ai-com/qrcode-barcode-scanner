// SPDX-License-Identifier: MIT
// The Zapier integration: one action, Scan Image, and no authentication. The image is read inside
// the Zap step by the open-source engine; nothing is sent to a scanning service.
'use strict';
const { version } = require('./package.json');
const { version: platformVersion } = require('zapier-platform-core');
const scanImage = require('./creates/scan-image');

module.exports = {
  version,
  platformVersion,
  creates: {
    [scanImage.key]: scanImage,
  },
};
