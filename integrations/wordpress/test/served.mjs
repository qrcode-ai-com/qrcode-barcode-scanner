// Exit 0 when URL is still served: it answers 200, without following a redirect, and its body
// has SHA256 when one is given. Exit 1 otherwise. The removal judge runs it after the uninstall:
// it must then fail.
//
//   node test/served.mjs URL [SHA256]
import { createHash } from 'node:crypto';

const [url, expected] = process.argv.slice(2);
if (!url) {
  console.error('usage: node test/served.mjs URL [SHA256]');
  process.exit(2);
}
try {
  const response = await fetch(url, { redirect: 'manual' });
  const body = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(body).digest('hex');
  const served = response.status === 200 && (!expected || digest === expected);
  console.log(`${response.status} ${body.length} bytes sha256 ${digest}: ${served ? 'served' : 'not served'}`);
  process.exit(served ? 0 : 1);
} catch (problem) {
  console.log(`no answer: ${problem.message}`);
  process.exit(1);
}
