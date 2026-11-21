// SPDX-License-Identifier: MIT
// The engine as the panel bundles it, without the panel: test/unit.test.mjs bundles this file and
// runs it in a context shaped like UXP.
import { scanFile, scanPixels, startEngine } from '../src/engine.js';

globalThis.engine = { scanFile, scanPixels, startEngine };
