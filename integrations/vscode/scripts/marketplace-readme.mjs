// SPDX-License-Identifier: MIT
// `vsce package` refuses SVG images from hosts outside its badge list, and the Ask AI badges are
// SVG files of this repository. The README packed in the VSIX keeps every link and sentence of
// the repository README; only those badge images become text links.
const BADGE = /^\[!\[([^\]\n]+)\]\((https:\/\/[^)\s]+\.svg)\)\]\((https:\/\/[^)\s]+)\)$/;

export function marketplaceReadme(text) {
  const out = [];
  let row = [];
  const flush = () => {
    if (row.length > 0) out.push(row.join(' · '));
    row = [];
  };
  // A Windows checkout may hold CRLF lines; the packed README uses LF on every platform.
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const badge = BADGE.exec(line);
    if (badge) {
      row.push(`[Ask ${badge[1]}](${badge[3]})`);
    } else {
      flush();
      out.push(line);
    }
  }
  flush();
  const result = out.join('\n');
  const svg = /!\[[^\]]*\]\([^)]*\.svg[)?#]|<img[^>]+src="[^"]*\.svg["?#]/i.exec(result);
  if (svg) throw new Error(`The packed README still shows an SVG image: ${svg[0]}`);
  return result;
}
