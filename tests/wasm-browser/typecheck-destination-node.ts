// Both destination subpaths by package name under Node's own resolution, with the ES2022
// library alone: no DOM types and no @types/node (tsconfig.destination-node.json). A server
// typechecks its resolver and endpoint against the shipped declarations without either. The
// import from ./destination-node names every export of destination-node.d.ts: the runner compares
// the list with the installed declarations.
import {
  resolveDestination, type DestinationResolution, type DestinationTimers, type DestinationTransport,
} from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/destination';
import {
  type DestinationLookup, type NodeTransportFixture, type NodeTransportOptions,
  createNodeTransport, type DestinationHttpRequest, type DestinationHttpResponse,
  type DestinationEndpointOptions, type DestinationEndpointHandler, createDestinationEndpoint,
} from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/destination-node';
// @ts-expect-error the resolver's file path is not exported: only the ./destination-node subpath
import type * as ResolverFile from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/destination-node.js';

// Timers and a lookup written with ES2022 alone; a fixture names a loopback literal.
const timers: DestinationTimers = {
  now: () => Date.now(), monotonic: () => Date.now(),
  setTimeout: (callback, ms) => ({ callback, ms }), clearTimeout: () => undefined,
};
const lookup: DestinationLookup = (hostname, options, callback) =>
  callback(null, [{ address: '127.0.0.1', family: options.family === 0 ? 4 : 6 }]);
const fixture: NodeTransportFixture = { address: '127.0.0.1', port: 5279 };
// @ts-expect-error a fixture address is 127.0.0.1 or ::1, never a name
const named: NodeTransportFixture = { address: 'localhost', port: 5279 };

const fixtureOptions: NodeTransportOptions = { fixture, lookup, timers, timeoutMs: 5000,
  maxHops: 3, maxConcurrent: 1, ca: [] };
const networkOptions: NodeTransportOptions = { label: 'Server resolver (Node)',
  allowedPorts: [80, 443], dnsServers: ['127.0.0.1:53'], translationPrefixes: ['64:ff9b::/96'],
  deniedRanges: ['203.0.113.0/24'], userAgent: 'qrcode-barcode-scanner-destination-bot/1' };
const transport: DestinationTransport = createNodeTransport(fixtureOptions);
const resolution: DestinationResolution = await resolveDestination(transport,
  { url: 'http://127.0.0.1:5279/ok' }, { timers });
const finalUrl: string | null = resolution.outcome === 'resolved' ? resolution.finalUrl : null;

// The endpoint handler over structural requests and responses.
const endpointOptions: DestinationEndpointOptions = {
  transport: createNodeTransport(networkOptions), allowedHosts: ['127.0.0.1:5273'],
  publicScheme: 'http', allowedOrigins: ['http://localhost:5273'], maxBodyBytes: 65536,
  bodyTimeoutMs: 5000, allowMissingFetchMetadata: false, revealNameErrors: false, timers,
  reportError: error => void error,
};
const handler: DestinationEndpointHandler = createDestinationEndpoint(endpointOptions);
const request: DestinationHttpRequest = {
  method: 'POST', headers: { host: '127.0.0.1:5273', 'content-type': 'application/json' },
  async *[Symbol.asyncIterator]() { yield '{"version":1}'; },
};
const response: DestinationHttpResponse = {
  statusCode: 200, setHeader: () => undefined, end: () => undefined, on: () => undefined,
};
handler(request, response);
// @ts-expect-error browsers reach an endpoint over http or https only
createDestinationEndpoint({ ...endpointOptions, publicScheme: 'ftp' });

void [named, finalUrl];
