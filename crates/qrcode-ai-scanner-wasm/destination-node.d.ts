// destination-node.d.ts · @supernovae-st/qrcode-ai-scanner-wasm/destination-node (0.11.0)
// Node-only. Runtime imports: node:http, node:https, node:dns and ./destination.js.
// Importing creates no socket, lookup, resolver, agent, server or timer.
import type { DestinationTimers, DestinationTransport } from './destination.js';

/** dns.lookup-compatible; always called with { all: true, family: 0, hints: 0 }. */
export type DestinationLookup = (
  hostname: string,
  options: { readonly all: true; readonly family: 0; readonly hints: 0 },
  callback: (
    error: (Error & { readonly code?: string }) | null,
    addresses: ReadonlyArray<{ readonly address: string; readonly family: number }>,
  ) => void,
) => void;

/** The single local address a fixture-mode transport may contact. */
export interface NodeTransportFixture {
  readonly address: '127.0.0.1' | '::1';
  readonly port: number;
}

export interface NodeTransportOptions {
  /** Default 'Server resolver (Node)', or 'Local fixture (Node resolver)' in fixture mode. */
  readonly label?: string;
  /** Cap on the request budget. Default 10000, 1..30000. */
  readonly timeoutMs?: number;
  /** Cap on followed redirects. Default 10, 0..20. */
  readonly maxHops?: number;
  /** Network mode only. Default [80, 443]. Fetch bad ports are always refused. */
  readonly allowedPorts?: readonly number[];
  /** Concurrent resolutions of this transport. Default 2, 1..16; 1..3 when lookup is dns.lookup. */
  readonly maxConcurrent?: number;
  /** Default 'qrcode-ai-scanner-destination-bot/1'; printable ASCII, 1..256 characters. */
  readonly userAgent?: string;
  /** Replaces the default cancelable resolver. In fixture mode names resolve only through it. */
  readonly lookup?: DestinationLookup;
  /** Network mode only: servers for the default resolver, 'a.b.c.d[:port]' or '[v6][:port]'. */
  readonly dnsServers?: readonly string[];
  /** NAT64 prefixes, '<prefix>/<32|40|48|56|64|96>'. Operators behind NAT64 set their NSP. */
  readonly translationPrefixes?: readonly string[];
  /** CIDRs refused besides the built-in tables (own public addresses, partner allowlists). */
  readonly deniedRanges?: readonly string[];
  /** Closed-world mode: exactly one loopback address and port. */
  readonly fixture?: NodeTransportFixture;
  /** Fixture mode only: PEM CA certificates for an HTTPS fixture. */
  readonly ca?: string | readonly string[];
  readonly timers?: DestinationTimers;
}

/**
 * kind 'node'; provenance 'network', or 'fixture' in fixture mode. resolve() answers
 * unavailable/transport_unsupported unless it runs on Node (not Bun, not Deno).
 */
export declare function createNodeTransport(options?: NodeTransportOptions): DestinationTransport;

/** Structural subset of http.IncomingMessage. */
export interface DestinationHttpRequest extends AsyncIterable<Uint8Array | string> {
  readonly method?: string;
  readonly headers: { readonly [name: string]: string | readonly string[] | undefined };
  /** True when another middleware already consumed the body. */
  readonly readableEnded?: boolean;
  /** Set by body-parsing middleware; its presence means the body was consumed. */
  readonly body?: unknown;
}

/** Structural subset of http.ServerResponse. */
export interface DestinationHttpResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
  on(event: 'close', listener: () => void): unknown;
}

export interface DestinationEndpointOptions {
  /** Kind 'fetch' or 'endpoint' is a TypeError: an endpoint must police every hop itself. */
  readonly transport: DestinationTransport;
  /** Required, non-empty array: accepted Host values such as '127.0.0.1:5273'. */
  readonly allowedHosts: readonly string[];
  /** Scheme browsers use to reach this endpoint; expected Origin is publicScheme://Host. */
  readonly publicScheme?: 'https' | 'http';
  /** Further exact serialized origins, for reverse proxies that rewrite Host. */
  readonly allowedOrigins?: readonly string[];
  /** Request body cap. Default 65536, 256..1048576. */
  readonly maxBodyBytes?: number;
  /** Deadline for receiving the whole body. Default 5000, 100..60000. */
  readonly bodyTimeoutMs?: number;
  /**
   * Accept requests with neither Sec-Fetch-Site nor Origin (non-browser clients). Default false.
   */
  readonly allowMissingFetchMetadata?: boolean;
  /** Keep dns_error and lookup-derived blocked_address distinct on the wire. Default false. */
  readonly revealNameErrors?: boolean;
  readonly timers?: DestinationTimers;
  /** Receives transport errors. Default: none; nothing is logged. */
  readonly reportError?: (error: unknown) => void;
}

/** Connect-style and http.createServer-compatible; never throws, never rejects. */
export type DestinationEndpointHandler = (
  req: DestinationHttpRequest,
  res: DestinationHttpResponse,
) => void;

/** Mount before any body parser, on a path of the page's own origin. */
export declare function createDestinationEndpoint(
  options: DestinationEndpointOptions,
): DestinationEndpointHandler;
