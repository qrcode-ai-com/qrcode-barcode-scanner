// destination.d.ts · @qrcode-ai-com/qrcode-barcode-scanner-wasm/destination (0.11.0)
// Optional URL destination checks. No runtime imports; no network, DOM or timer work at
// import. Nothing is requested until resolve() runs with a transport the application supplied.
// Every URL a result reports is observation text: render it as text, never as a link,
// a navigation target or an open action.
import type { Detection, Payload } from './report-types.js';

// ---- Policy ---------------------------------------------------------------------------------

export interface DestinationDetailSentence {
  readonly text: string;
  /** True when the sentence may end with ' (CODE)', CODE matching ^[A-Z][A-Z0-9_]{1,63}$. */
  readonly code: boolean;
}

export declare const DESTINATION_POLICY: {
  /** Date the address, name, port and baseline tables were last checked against their sources. */
  readonly snapshot: '2026-11-02';
  /** Longest encodedUrl or requestUrl accepted, in UTF-16 code units. */
  readonly maxUrlLength: 16384;
  readonly maxHopsLimit: 20;
  readonly maxTimeoutMs: 60000;
  readonly defaultMaxHops: 10;
  readonly defaultTimeoutMs: 10000;
  readonly redirectStatuses: readonly [301, 302, 303, 307, 308];
  /** WHATWG Fetch "bad port" list at the snapshot date (83 ports). */
  readonly badPorts: readonly number[];
  /** RFC 6052 §2.2 prefix lengths accepted in translationPrefixes. */
  readonly translationPrefixLengths: readonly [32, 40, 48, 56, 64, 96];
  /** Public-looking platform endpoints refused by default (range 'platform'). */
  readonly platformRanges: readonly ['168.63.129.16/32'];
  /** The only detail texts an endpoint response may carry; both ends turn any other into null. */
  readonly detailSentences: readonly DestinationDetailSentence[];
};

// ---- Platform shapes (structural: no DOM types or @types/node needed) ------------------------

export interface DestinationSignal {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(type: 'abort', listener: () => void, options?: { readonly once?: boolean }): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

/**
 * Each member is called unbound (this === undefined). A member that throws cannot strand a call
 * or an attempt. Before the transport is called (now, monotonic or setTimeout at the start), the
 * call ends unavailable/transport_error with detail 'Timers threw', requestSent false and the
 * error as cause. An end raised inside that member before it throws (a caller's abort, or the
 * verifier's cancel, forget, clear or destroy) stands instead: the verifier reports the error
 * once, and resolveDestination() keeps its canceled/aborted result. Any other failing read is
 * reported by the verifier, which falls back to Date.now() for settledAt and to 0 for durationMs;
 * resolveDestination() falls back to durationMs 0. When clearTimeout throws, that backstop stays
 * in your timers and does nothing when it fires.
 */
export interface DestinationTimers {
  /** Wall clock, epoch milliseconds. */
  now(): number;
  /** Monotonic milliseconds. */
  monotonic(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface DestinationFetchInit {
  readonly method: 'GET' | 'POST';
  readonly mode?: 'cors';
  readonly credentials: 'omit' | 'same-origin' | 'include';
  readonly cache: 'no-store';
  readonly redirect: 'follow' | 'error';
  readonly referrer?: '';
  readonly referrerPolicy?: 'no-referrer';
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  /** An AbortSignal. Typed any so DOM and Node fetch both assign to DestinationFetch. */
  readonly signal: any;
}

export interface DestinationBodyReader {
  read(): Promise<{ readonly done: boolean; readonly value?: Uint8Array }>;
  cancel(reason?: unknown): Promise<void>;
  releaseLock(): void;
}

export interface DestinationResponseBody {
  cancel(reason?: unknown): Promise<void>;
  getReader(): DestinationBodyReader;
}

export interface DestinationFetchResponse {
  readonly type: string;
  readonly status: number;
  readonly url: string;
  readonly redirected: boolean;
  readonly headers: { get(name: string): string | null };
  readonly body: DestinationResponseBody | null;
}

/** Called unbound. Defaults to globalThis.fetch, read at each call. */
export type DestinationFetch = (
  input: string,
  init: DestinationFetchInit,
) => Promise<DestinationFetchResponse>;

// ---- Eligibility ----------------------------------------------------------------------------

export type DestinationSource = 'url' | 'gs1_digital_link' | 'me_card';

export type DestinationIneligibleReason =
  | 'no_url'
  | 'lossy_text'
  | 'not_http'
  | 'control_or_space'
  | 'invalid_url'
  | 'credentials'
  | 'too_long';

export interface EligibleDestinationCandidate {
  readonly eligible: true;
  /** Payload field the URL came from; null for a raw string. */
  readonly source: DestinationSource | null;
  /** The exact decoded string: never trimmed, normalized or completed. */
  readonly encodedUrl: string;
  /** WHATWG serialization of encodedUrl without its fragment: what a check requests. */
  readonly requestUrl: string;
  readonly reason: null;
}

export interface IneligibleDestinationCandidate {
  readonly eligible: false;
  readonly source: DestinationSource | null;
  /** The exact string when a URL field or raw string existed; null for no_url and lossy_text. */
  readonly encodedUrl: string | null;
  readonly requestUrl: null;
  readonly reason: DestinationIneligibleReason;
}

export type DestinationCandidate = EligibleDestinationCandidate | IneligibleDestinationCandidate;

/** Throws TypeError for anything that is not a Detection, a Payload or a string. */
export declare function destinationCandidate(input: Detection | Payload | string): DestinationCandidate;

// ---- Address and host policy ------------------------------------------------------------------

export type DestinationAddressRange =
  | 'public'
  | 'unspecified'
  | 'loopback'
  | 'private'
  | 'shared'
  | 'link_local'
  | 'unique_local'
  | 'site_local'
  | 'multicast'
  | 'broadcast'
  | 'documentation'
  | 'benchmarking'
  | 'ipv4_mapped'
  | 'ipv4_compatible'
  | 'translation'
  | 'tunnel'
  | 'discard'
  | 'reserved'
  | 'platform'
  | 'denied';

export interface DestinationAddressInfo {
  /** Dotted IPv4, or lowercase compressed IPv6 (RFC 5952) without brackets. */
  readonly address: string;
  readonly family: 4 | 6;
  readonly range: DestinationAddressRange;
  /** IPv4 carried by a mapped, compatible, translation or 6to4 address; null when malformed. */
  readonly embedded: DestinationAddressInfo | null;
  /** True only for 'public', or for 'translation' whose embedded IPv4 is allowed. */
  readonly allowed: boolean;
}

export interface DestinationAddressOptions {
  /** NAT64 prefixes, '<prefix>/<32|40|48|56|64|96>' (RFC 6052 §2.2), checked before the tables. */
  readonly translationPrefixes?: readonly string[];
  /** CIDRs refused before any allow decision, for the address and for its embedded IPv4. */
  readonly deniedRanges?: readonly string[];
}

/** null when the text is not canonical dotted IPv4 or a valid IPv6 literal (zones invalid). */
export declare function classifyAddress(
  address: string,
  options?: DestinationAddressOptions,
): DestinationAddressInfo | null;

export type DestinationSpecialUseName =
  | 'localhost'
  | 'local'
  | 'home.arpa'
  | 'internal'
  | 'invalid'
  | 'onion'
  | 'alt'
  | 'single_label';

export type DestinationHostInfo =
  | {
      readonly kind: 'address';
      /** Host without brackets or trailing dots. */
      readonly host: string;
      readonly address: DestinationAddressInfo;
      readonly specialUse: null;
      readonly allowed: boolean;
    }
  | {
      readonly kind: 'name';
      readonly host: string;
      readonly address: null;
      readonly specialUse: DestinationSpecialUseName | null;
      readonly allowed: boolean;
    };

/**
 * Classifies a serialized URL host (URL.hostname) after removing every trailing dot.
 * null for an empty label, an invalid literal or a non-host; callers treat null as refused.
 * Never resolves names.
 */
export declare function classifyHost(
  hostname: string,
  options?: DestinationAddressOptions,
): DestinationHostInfo | null;

// ---- Results ----------------------------------------------------------------------------------

export type DestinationState =
  | 'unverified'
  | 'resolving'
  | 'resolved'
  | 'failed'
  | 'canceled'
  | 'unavailable';

export type DestinationProvenance = 'network' | 'fixture' | 'simulated';

export type DestinationTransportKind = 'fetch' | 'endpoint' | 'node' | 'prepared' | 'custom';

export type DestinationFailureReason =
  | 'timeout'
  | 'too_many_redirects'
  | 'redirect_loop'
  | 'invalid_location'
  | 'blocked_scheme'
  | 'blocked_credentials'
  | 'blocked_address'
  | 'blocked_port'
  | 'left_fixture'
  | 'name_unusable'
  | 'dns_error'
  | 'connection_error'
  | 'tls_error'
  | 'invalid_response';

/** Unavailable reasons a transport may return. */
export type DestinationTransportUnavailableReason =
  | 'transport_unsupported'
  | 'out_of_scope'
  | 'opaque_network_error'
  | 'opaque_response'
  | 'mixed_content'
  | 'endpoint_unreachable'
  | 'endpoint_http_error'
  | 'endpoint_invalid_response'
  | 'endpoint_timeout'
  | 'resolver_busy';

/** Produced by the shared guard in resolveDestination(), never by a transport. */
export type DestinationGuardUnavailableReason =
  | 'transport_error'
  | 'invalid_observation'
  | 'transport_unresponsive';

/** Produced by the verifier store only. */
export type DestinationVerifierUnavailableReason = 'no_transport' | 'queue_full';

export type DestinationUnavailableReason =
  | DestinationTransportUnavailableReason
  | DestinationGuardUnavailableReason
  | DestinationVerifierUnavailableReason;

/** 'cleared' appears only in the promise of an attempt removed by forget/clear/destroy. */
export type DestinationCancelReason = 'canceled' | 'aborted' | 'cleared';

export type DestinationReason =
  | DestinationFailureReason
  | DestinationUnavailableReason
  | DestinationCancelReason;

export interface DestinationRedirectStep {
  /** URL requested at this hop: canonical http(s), no fragment. Observation text. */
  readonly url: string;
  readonly status: 301 | 302 | 303 | 307 | 308;
  /** Absolute http(s) Location, fragment removed; null if invalid, credentialed or not http(s). */
  readonly location: string | null;
  /** Protocol of a refused non-HTTP(S) Location, such as 'ftp:'; last step of blocked_scheme only. */
  readonly refusedScheme: string | null;
}

export interface DestinationTransportInfo {
  readonly kind: DestinationTransportKind;
  /** Shown verbatim next to every result. */
  readonly label: string;
}

export interface DestinationSnapshotBase {
  /** The exact string the code carries. */
  readonly encodedUrl: string;
  /** What a check requests (WHATWG href without fragment). */
  readonly requestUrl: string;
}

export interface DestinationUnverifiedSnapshot extends DestinationSnapshotBase {
  readonly state: 'unverified';
  readonly reason: null;
  readonly attemptId: null;
  readonly transport: null;
  readonly provenance: null;
  readonly requestSent: null;
  readonly finalUrl: null;
  readonly status: null;
  readonly redirected: null;
  readonly changed: null;
  readonly redirects: null;
  readonly hopCount: null;
  readonly startedAt: null;
  readonly settledAt: null;
  readonly durationMs: null;
  readonly detail: null;
}

export interface DestinationResolvingSnapshot extends DestinationSnapshotBase {
  readonly state: 'resolving';
  readonly reason: null;
  readonly attemptId: number;
  readonly transport: DestinationTransportInfo;
  readonly provenance: DestinationProvenance;
  readonly requestSent: null;
  readonly finalUrl: null;
  readonly status: null;
  readonly redirected: null;
  readonly changed: null;
  readonly redirects: null;
  readonly hopCount: null;
  /** null while the attempt waits in the queue (nothing sent yet). */
  readonly startedAt: number | null;
  readonly settledAt: null;
  readonly durationMs: null;
  readonly detail: null;
}

export interface DestinationResolvedSnapshot extends DestinationSnapshotBase {
  readonly state: 'resolved';
  readonly reason: null;
  readonly attemptId: number;
  readonly transport: DestinationTransportInfo;
  /** 'simulated' is prepared data: never present it as an observation. */
  readonly provenance: DestinationProvenance;
  /** false exactly with provenance 'simulated'. */
  readonly requestSent: boolean;
  /** Observation text: never a link or an open action. */
  readonly finalUrl: string;
  readonly status: number;
  readonly redirected: boolean | null;
  readonly changed: boolean;
  readonly redirects: readonly DestinationRedirectStep[] | null;
  /** Redirects followed: redirects.length, or null when the chain is unknown. */
  readonly hopCount: number | null;
  readonly startedAt: number;
  readonly settledAt: number;
  readonly durationMs: number;
  readonly detail: string | null;
}

export interface DestinationFailedSnapshot extends DestinationSnapshotBase {
  readonly state: 'failed';
  readonly reason: DestinationFailureReason;
  readonly attemptId: number;
  readonly transport: DestinationTransportInfo;
  readonly provenance: DestinationProvenance;
  readonly requestSent: boolean | null;
  readonly finalUrl: null;
  readonly status: null;
  readonly redirected: boolean | null;
  readonly changed: null;
  readonly redirects: readonly DestinationRedirectStep[] | null;
  /**
   * Redirects followed; null when the chain is unknown. redirects.length when the failure came
   * while fetching the last location (timeout, dns_error, connection_error, tls_error,
   * invalid_response); otherwise one less, at least 0, as the last step was not followed.
   */
  readonly hopCount: number | null;
  readonly startedAt: number;
  readonly settledAt: number;
  readonly durationMs: number;
  readonly detail: string | null;
}

export interface DestinationCanceledSnapshot extends DestinationSnapshotBase {
  readonly state: 'canceled';
  readonly reason: DestinationCancelReason;
  readonly attemptId: number;
  readonly transport: DestinationTransportInfo;
  readonly provenance: DestinationProvenance;
  readonly requestSent: false | null;
  readonly finalUrl: null;
  readonly status: null;
  readonly redirected: null;
  readonly changed: null;
  readonly redirects: null;
  readonly hopCount: null;
  readonly startedAt: number | null;
  readonly settledAt: number;
  readonly durationMs: number | null;
  readonly detail: null;
}

export interface DestinationUnavailableSnapshot extends DestinationSnapshotBase {
  readonly state: 'unavailable';
  readonly reason: DestinationUnavailableReason;
  readonly attemptId: number;
  /** null only for no_transport. */
  readonly transport: DestinationTransportInfo | null;
  readonly provenance: DestinationProvenance | null;
  readonly requestSent: boolean | null;
  readonly finalUrl: null;
  readonly status: null;
  readonly redirected: null;
  readonly changed: null;
  readonly redirects: null;
  readonly hopCount: null;
  readonly startedAt: number | null;
  readonly settledAt: number;
  readonly durationMs: number | null;
  readonly detail: string | null;
}

/** Frozen; every variant has the same 18 keys at runtime. */
export type DestinationSnapshot =
  | DestinationUnverifiedSnapshot
  | DestinationResolvingSnapshot
  | DestinationResolvedSnapshot
  | DestinationFailedSnapshot
  | DestinationCanceledSnapshot
  | DestinationUnavailableSnapshot;

// ---- Transport contract -----------------------------------------------------------------------

export interface DestinationRequest {
  /** Canonical request URL (an eligible candidate's requestUrl). */
  readonly url: string;
  /** Redirects the transport may follow, integer 0..20. */
  readonly maxHops: number;
  /** The transport settles within this budget, integer 1..60000 ms. */
  readonly timeoutMs: number;
  /** Aborted on cancel, caller abort or backstop; any later result is ignored. */
  readonly signal: DestinationSignal;
}

export type DestinationObservation =
  | {
      readonly outcome: 'resolved';
      readonly finalUrl: string;
      readonly status: number;
      readonly redirects: readonly DestinationRedirectStep[] | null;
      readonly redirected: boolean | null;
      readonly requestSent: boolean;
      readonly provenance?: DestinationProvenance;
      readonly detail?: string | null;
    }
  | {
      readonly outcome: 'failed';
      readonly reason: DestinationFailureReason;
      readonly redirects: readonly DestinationRedirectStep[] | null;
      readonly redirected?: boolean | null;
      readonly requestSent: boolean | null;
      readonly provenance?: DestinationProvenance;
      readonly detail?: string | null;
    }
  | {
      readonly outcome: 'unavailable';
      readonly reason: DestinationTransportUnavailableReason;
      readonly requestSent: boolean | null;
      readonly provenance?: DestinationProvenance;
      readonly detail?: string | null;
    };

export interface DestinationTransport {
  /** Informational; UIs must not infer trust from it. */
  readonly kind: DestinationTransportKind;
  /** 1..80 code points; shown with every result. */
  readonly label: string;
  /** Ceiling: a higher observed provenance is rejected (invalid_observation); a lower one is kept. */
  readonly provenance: DestinationProvenance;
  /** Must settle within request.timeoutMs and honor request.signal. Called as a method. */
  resolve(request: DestinationRequest): Promise<DestinationObservation>;
}

// ---- One-shot, validated, backstopped call ----------------------------------------------------

export interface DestinationResolveRequest {
  readonly url: string;
  /** Default 10, 0..20. */
  readonly maxHops?: number;
  /** Default 10000, 1..60000. The backstop fires at timeoutMs + 1000 (transport_unresponsive). */
  readonly timeoutMs?: number;
  readonly signal?: DestinationSignal;
}

export interface ResolveDestinationOptions {
  readonly timers?: DestinationTimers;
}

export interface DestinationResolutionBase {
  readonly url: string;
  readonly transport: DestinationTransportInfo;
  readonly provenance: DestinationProvenance;
  /** Monotonic duration of the call, integer milliseconds. */
  readonly durationMs: number;
}

export interface DestinationResolvedResolution extends DestinationResolutionBase {
  readonly outcome: 'resolved';
  readonly reason: null;
  readonly requestSent: boolean;
  readonly finalUrl: string;
  readonly status: number;
  readonly redirected: boolean | null;
  readonly changed: boolean;
  readonly redirects: readonly DestinationRedirectStep[] | null;
  readonly hopCount: number | null;
  readonly detail: string | null;
}

export interface DestinationFailedResolution extends DestinationResolutionBase {
  readonly outcome: 'failed';
  readonly reason: DestinationFailureReason;
  readonly requestSent: boolean | null;
  readonly finalUrl: null;
  readonly status: null;
  readonly redirected: boolean | null;
  readonly changed: null;
  readonly redirects: readonly DestinationRedirectStep[] | null;
  readonly hopCount: number | null;
  readonly detail: string | null;
}

export interface DestinationUnavailableResolution extends DestinationResolutionBase {
  readonly outcome: 'unavailable';
  readonly reason: DestinationTransportUnavailableReason | DestinationGuardUnavailableReason;
  readonly requestSent: boolean | null;
  readonly finalUrl: null;
  readonly status: null;
  readonly redirected: null;
  readonly changed: null;
  readonly redirects: null;
  readonly hopCount: null;
  readonly detail: string | null;
  /**
   * transport_error only, never serialized: what the transport threw or rejected with (detail
   * 'Transport threw'), or what the timers threw before it was called (detail 'Timers threw').
   */
  readonly cause?: unknown;
}

export interface DestinationCanceledResolution extends DestinationResolutionBase {
  readonly outcome: 'canceled';
  readonly reason: 'aborted';
  readonly requestSent: false | null;
  readonly finalUrl: null;
  readonly status: null;
  readonly redirected: null;
  readonly changed: null;
  readonly redirects: null;
  readonly hopCount: null;
  readonly detail: null;
}

export type DestinationResolution =
  | DestinationResolvedResolution
  | DestinationFailedResolution
  | DestinationUnavailableResolution
  | DestinationCanceledResolution;

/**
 * Never rejects. Throws TypeError or RangeError for invalid arguments, before anything starts.
 * A request.signal that is not an AbortSignal, or that throws when it is read or given the
 * abort listener, is refused with TypeError (its cause is what the signal threw). The listener is
 * in place before any injected code runs, so an abort raised inside timers or transport.resolve()
 * settles the call canceled/aborted at once; no listener stays on the signal after the call.
 */
export declare function resolveDestination(
  transport: DestinationTransport,
  request: DestinationResolveRequest,
  options?: ResolveDestinationOptions,
): Promise<DestinationResolution>;

// ---- Verifier store ---------------------------------------------------------------------------

export type DestinationTarget = string | DestinationCandidate;

export interface DestinationVerifierOptions {
  /** Required key. null means no transport: resolve() settles unavailable/no_transport. */
  readonly transport: DestinationTransport | null;
  /** Budget handed to the transport per attempt. Default 10000, 1..60000. */
  readonly timeoutMs?: number;
  /** Default 10, 0..20. */
  readonly maxHops?: number;
  /** Attempts running at once. Default 2, 1..8. */
  readonly maxConcurrent?: number;
  /**
   * Attempts waiting for a slot. Default 16, 0..256. Queued attempts start oldest first, and a
   * new attempt queues behind them even when a slot is free. resolve() settles
   * unavailable/queue_full once running and queued attempts reach maxConcurrent + maxQueued.
   */
  readonly maxQueued?: number;
  /** Stored entries. Default 64; greater than maxConcurrent + maxQueued, at most 1024. */
  readonly maxEntries?: number;
  readonly timers?: DestinationTimers;
  /**
   * Listener exceptions, transport errors and timers errors. Default globalThis.reportError,
   * else console.error, else nothing. Never rethrown.
   */
  readonly reportError?: (error: unknown) => void;
}

export interface DestinationResolveOptions {
  /** Aborting it cancels the shared attempt with reason 'aborted'. */
  readonly signal?: DestinationSignal;
}

export type DestinationChangeCause =
  | 'attempt'
  | 'start'
  | 'settle'
  | 'cancel'
  | 'forget'
  | 'clear'
  | 'evict';

export interface DestinationChange {
  readonly encodedUrl: string;
  readonly snapshot: DestinationSnapshot;
  readonly previous: DestinationSnapshot;
  readonly cause: DestinationChangeCause;
}

export interface DestinationVerifier {
  readonly transport:
    | (DestinationTransportInfo & { readonly provenance: DestinationProvenance })
    | null;
  /** True when a transport is configured and the verifier is not destroyed. */
  readonly canResolve: boolean;
  /** Stable identity until the entry changes; null for an ineligible target. */
  get(target: DestinationTarget): DestinationSnapshot | null;
  /**
   * Starts or joins the attempt, as one change: an evict event it causes is delivered once the
   * new entry is in place. Never rejects. Throws TypeError for an ineligible target, from the
   * start of destroy() on, and for an options.signal that is not an AbortSignal or that throws
   * when it is read or given the abort listener (its cause is what the signal threw); nothing
   * changes then. The promise gets the attempt's own snapshot, which is stored unless a later
   * change to the entry superseded it (see subscribe()).
   */
  resolve(target: DestinationTarget, options?: DestinationResolveOptions): Promise<DestinationSnapshot>;
  /** Cancels a queued or running attempt; false when nothing was resolving. */
  cancel(target: DestinationTarget): boolean;
  /** Back to unverified; an in-flight promise resolves canceled/cleared. */
  forget(target: DestinationTarget): void;
  /**
   * forget() for every entry, as one change: every clear event is delivered before any change
   * that listeners or injected code cause meanwhile. The verifier stays usable.
   */
  clear(): void;
  /**
   * Synchronous, ordered; returns an idempotent unsubscribe. Timers, signals, the transport and
   * reportError may call back into the verifier while it writes. A change they cause before a
   * write is stored supersedes that write: its snapshot is then neither stored nor delivered (its
   * promise still gets it). Once delivery ends, get() agrees with the last change delivered for
   * its URL.
   */
  subscribe(listener: (change: DestinationChange) => void): () => void;
  /** clear(), then drop listeners; afterwards every method except destroy() throws TypeError. */
  destroy(): void;
}

export declare function createDestinationVerifier(
  options: DestinationVerifierOptions,
): DestinationVerifier;

// ---- Selection binder -------------------------------------------------------------------------

export interface DestinationSelectionView {
  readonly candidate: DestinationCandidate;
  /** null exactly when candidate.eligible is false. */
  readonly snapshot: DestinationSnapshot | null;
}

export interface DestinationSelectionOptions {
  /** Called after the view changes: a new selection or a change of the selected entry. */
  readonly onChange?: (view: DestinationSelectionView | null) => void;
  /** Cancel the previous entry's attempt when the selection moves. Default false. */
  readonly cancelOnDeselect?: boolean;
}

/** Binds one verifier for its whole life; to change verifier, destroy it and create another. */
export interface DestinationSelection {
  readonly view: DestinationSelectionView | null;
  /** The new view is built first: when verifier.get() throws, nothing changes and it rethrows. */
  select(input: Detection | Payload | string | null): DestinationSelectionView | null;
  destroy(): void;
}

export declare function createDestinationSelection(
  verifier: DestinationVerifier,
  options?: DestinationSelectionOptions,
): DestinationSelection;

// ---- Built-in transports ----------------------------------------------------------------------

export interface FetchTransportBaseOptions {
  /** Default 'This browser', or 'Local fixture (this browser)' in fixture scope. */
  readonly label?: string;
  /** Called unbound instead of globalThis.fetch. Never changes where the transport may run. */
  readonly fetch?: DestinationFetch;
  readonly timers?: DestinationTimers;
}

export interface NetworkFetchTransportOptions extends FetchTransportBaseOptions {
  /**
   * Real requests to whatever the URL names. Only hop 0 (the URL given) is checked before
   * sending, by port and by classifyHost(); later redirect hops are left to the browser.
   */
  readonly scope: 'network';
}

export interface FixtureFetchTransportOptions extends FetchTransportBaseOptions {
  readonly scope: 'fixture';
  /**
   * Origin whose host is the literal 127.0.0.1 or [::1]. Results outside it are refused, but
   * the browser may already have contacted them; intermediate hops are not observed.
   */
  readonly fixtureOrigin: string;
}

export type FetchTransportOptions = NetworkFetchTransportOptions | FixtureFetchTransportOptions;

/** Browsers and module workers only: unavailable/transport_unsupported on server runtimes. */
export declare function createFetchTransport(options: FetchTransportOptions): DestinationTransport;

export interface EndpointTransportOptions {
  /** '/path' on the page origin, or an absolute http(s) URL, of a createDestinationEndpoint(). */
  readonly endpoint: string;
  /** Required: names the resolver for users. */
  readonly label: string;
  /** Credentials for the endpoint request only. Default 'same-origin'. */
  readonly credentials?: 'omit' | 'same-origin' | 'include';
  /** Extra endpoint headers (for example CSRF); content-type and accept are fixed. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Provenance ceiling. Default 'network'. */
  readonly provenance?: DestinationProvenance;
  /** Allow an absolute endpoint on another origin from a page or worker. Default false. */
  readonly crossOrigin?: boolean;
  readonly fetch?: DestinationFetch;
  readonly timers?: DestinationTimers;
}

export declare function createEndpointTransport(
  options: EndpointTransportOptions,
): DestinationTransport;

export type PreparedDestinationResult =
  | {
      readonly outcome: 'resolved';
      readonly finalUrl: string;
      readonly status: number;
      readonly redirects: readonly DestinationRedirectStep[] | null;
      readonly redirected?: boolean | null;
      readonly detail?: string | null;
    }
  | {
      readonly outcome: 'failed';
      readonly reason: DestinationFailureReason;
      readonly redirects?: readonly DestinationRedirectStep[] | null;
      readonly detail?: string | null;
    }
  | {
      readonly outcome: 'unavailable';
      readonly reason: DestinationTransportUnavailableReason;
      readonly detail?: string | null;
    };

export interface PreparedDestinationEntry {
  /** Canonical request URL the entry answers. */
  readonly url: string;
  /** 'pending' never settles by itself: canceled, or failed/timeout at the request budget. */
  readonly result: PreparedDestinationResult | 'pending';
}

export interface PreparedTransportOptions {
  /** Default 'Prepared example'. */
  readonly label?: string;
  /** Simulated latency, 0..60000 ms. Default 0. */
  readonly delayMs?: number;
  readonly timers?: DestinationTimers;
}

/** kind 'prepared', provenance 'simulated', requestSent always false. */
export declare function createPreparedTransport(
  entries: Iterable<PreparedDestinationEntry>,
  options?: PreparedTransportOptions,
): DestinationTransport;

// ---- Endpoint wire v1 (types only) ------------------------------------------------------------

export interface DestinationWireRequest {
  readonly version: 1;
  readonly url: string;
  readonly maxHops: number;
  readonly timeoutMs: number;
}

export interface DestinationWireResponse {
  readonly version: 1;
  readonly url: string;
  readonly outcome: 'resolved' | 'failed' | 'unavailable';
  readonly reason: DestinationFailureReason | 'out_of_scope' | 'resolver_busy' | null;
  readonly finalUrl: string | null;
  readonly status: number | null;
  readonly redirected: boolean | null;
  readonly redirects: readonly DestinationRedirectStep[] | null;
  readonly requestSent: boolean | null;
  readonly provenance: DestinationProvenance;
  /** One of DESTINATION_POLICY.detailSentences (with ' (CODE)' where allowed), or null. */
  readonly detail: string | null;
}

export interface DestinationWireError {
  readonly error:
    | 'method_not_allowed'
    | 'forbidden'
    | 'unsupported_media_type'
    | 'payload_too_large'
    | 'request_timeout'
    | 'bad_request'
    | 'body_already_read'
    | 'resolver_failed';
}
