// SPDX-License-Identifier: MIT
// The README packed in the VSIX: the Ask AI badges become text links, every other line stays,
// and a Windows checkout with CRLF lines packs the same text.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { marketplaceReadme } from '../scripts/marketplace-readme.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(here, 'README.md'), 'utf8').replace(/\r\n/g, '\n');

test('the Ask AI badges become one line of text links, and nothing else changes', () => {
  const packed = marketplaceReadme(readme);
  const badges = readme.split('\n').filter((line) => /^\[!\[[^\]]+\]\(https:\/\/\S+\.svg\)\]\(https:\/\/\S+\)$/.test(line));
  assert.equal(badges.length, 9);
  const row = packed.split('\n').find((line) => line.startsWith('[Ask ChatGPT]('));
  assert.equal(row.split(' · ').length, 9);
  assert.deepEqual(row.split(' · ').map((link) => /^\[Ask ([^\]]+)\]/.exec(link)[1]), ['ChatGPT', 'Claude', 'Gemini', 'Grok', 'Perplexity', 'Copilot', 'DeepSeek', 'Meta AI', 'Qwen']);
  assert.deepEqual(packed.split('\n').filter((line) => line !== row), readme.split('\n').filter((line) => !badges.includes(line)));
  assert.ok(!/\.svg\)/.test(packed));
});

test('a CRLF checkout packs the same README', () => {
  assert.equal(marketplaceReadme(readme.replace(/\n/g, '\r\n')), marketplaceReadme(readme));
});

test('an SVG image left anywhere else stops the build', () => {
  assert.throws(() => marketplaceReadme('Text.\n\n![logo](https://example.com/logo.svg)\n'), /still shows an SVG image/);
  assert.throws(() => marketplaceReadme('<img src="https://example.com/logo.svg" alt="">\n'), /still shows an SVG image/);
  assert.equal(marketplaceReadme('[a link to an SVG file](https://example.com/logo.svg)\n'), '[a link to an SVG file](https://example.com/logo.svg)\n');
});
