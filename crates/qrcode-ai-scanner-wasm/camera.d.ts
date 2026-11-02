import type { Detection, Point, ScanReport } from './report-types';

// ------------------------------------------------------------------------- limits

/** Fixed bounds of one update; every assignment problem is at most 16 x 16. */
export const TRACKER_LIMITS: Readonly<{
  /** Detections read per report, in wire order. */
  detections: 16;
  /** Occurrences read per detection, in wire order. */
  occurrences: 16;
  /** Observations of one content key entering association per frame. */
  observationsPerKey: 16;
  /** Live tracks per content key. */
  tracksPerKey: 16;
  /** Live tracks in total. */
  tracks: 64;
  /** Retired slots held back from reuse; the oldest is released first. */
  quarantine: 64;
}>;

// --------------------------------------------------------------------- identities

/**
 * spec/01 dedupe key: JSON of [symbology, content.raw, content.fnc1 ?? null,
 * content.eci !== undefined]. Two located ECI lists can share one key; use sameContent.
 */
export type ContentKey = string;
/** One track. Serials only grow, including across clear(). */
export type TrackId = `track-${number}`;
/** One retained decoded content (a card). Serials only grow. */
export type ResultId = `result-${number}`;

export function contentKey(detection: Detection): ContentKey;
/**
 * Equal keys and compatible ECI lists: both absent, either [] (signalled, not located),
 * or both located and equal entry by entry. Not transitive.
 */
export function sameContent(a: Detection, b: Detection): boolean;

/** Wire position of one observation in one accepted frame; never compared across frames. */
export interface ObservationAddress {
  readonly sequence: number | null;
  readonly detectionIndex: number;
  /** null for a detection without occurrences (pipeline 4 and older). */
  readonly occurrenceIndex: number | null;
}

// --------------------------------------------------------------------------- time

/**
 * Injectable time source. Every time in this module is in milliseconds on this clock.
 * Default: performance.now() and the global timers.
 */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface TrackerFrame {
  /** Pixel size of the RGBA frame that was scanned. */
  width: number;
  height: number;
  /**
   * When these pixels were current, in ms on the tracker's clock. Required. A value more
   * than 1000 ms after now, or more than 60000 ms before it, throws a RangeError: it comes
   * from another clock (Date.now(), or mediaTime in seconds).
   */
  observedAt: number;
  /** Capture session: larger expires every track, smaller is rejected. Omitted: unchanged. */
  epoch?: number;
  /**
   * Strictly increasing within one epoch, with observedAt never decreasing. Without it,
   * observedAt itself must strictly increase.
   */
  sequence?: number;
}

/** The last accepted frame as the tracker stored it. */
export interface AcceptedFrame {
  readonly width: number;
  readonly height: number;
  readonly observedAt: number;
  readonly epoch: number;
  readonly sequence: number | null;
}

export interface TrackerUpdateOptions {
  /** Processing time. Default clock.now(); raised to observedAt and to the previous now. */
  now?: number;
  /**
   * true: the caller asserts that a bare array is the complete result (for a ScanReport the
   * trace still decides). false: treat any input as incomplete. Default: a bare array is
   * incomplete and proves no absence.
   */
  complete?: boolean;
}

// ------------------------------------------------------------------------ tracker

export type Smoothing =
  /** Fixed blend factor in (0, 1]; the default is 0.35. */
  | number
  | { kind: 'fixed'; alpha: number }
  | { kind: 'none' }
  /**
   * Experimental. Becomes a default only through the replay adoption rule (section 10)
   * and is removed from this module before the 0.11 freeze if it does not qualify.
   */
  | { kind: 'one-euro'; minCutoffHz: number; beta: number; derivativeCutoffHz?: number };

export interface DetectionTrackerOptions {
  /** Default 0.35. */
  smoothing?: Smoothing;
  /** Geometry older than this is withheld; tracked/held become lost. Default 1200 (> 0). */
  staleMs?: number;
  /**
   * Identity lifetime after the last evidence. A track expires at lastSeenAt + reacquireMs
   * once a frame observed at or after that time arrives, and by time staleMs later.
   * Default 2000 (>= staleMs).
   */
  reacquireMs?: number;
  /** Consecutive complete misses shown as held. Default 1 (integer >= 0). */
  maxMisses?: number;
  /** Results without a live track are dropped after this. Default Infinity (>= reacquireMs). */
  retainMs?: number;
  /** Retained results; exceeded only while more contents have live tracks. Default 32 (>= 16). */
  maxResults?: number;
  clock?: Clock;
  /**
   * Receives the snapshot of every update(), reset(), clear() and successful forget(), and
   * of every advance() or deadline wake that applied a transition. The deadline timer is
   * armed only when onChange is given. Never called by snapshot() or after destroy().
   */
  onChange?(snapshot: TrackerSnapshot): void;
  /**
   * Receives an exception thrown by onChange. It never propagates into the method that
   * produced the snapshot. Default: rethrown from a microtask.
   */
  onError?(error: unknown): void;
  /** Removed in 0.11; passing it throws a TypeError naming staleMs and reacquireMs. */
  holdMs?: never;
}

export type TrackState = 'tracked' | 'held' | 'lost';
/**
 * spatial: follows one measured physical copy. content: a decoded content whose position
 * was not measured; it claims no physical copy and emits no continuity events.
 */
export type TrackBasis = 'spatial' | 'content';
/** Published kinds; the wire kind 'unavailable' never becomes a track geometry. */
export type TrackGeometryKind = 'quad' | 'segment' | 'partial';
export type GeometryDowngrade =
  | 'count' | 'not-finite' | 'outside' | 'area' | 'not-convex' | 'counter-clockwise' | 'length';
export type SmoothingRestart =
  | 'new' | 'kind' | 'reacquired' | 'gap' | 'reoriented' | 'jump' | 'invalid-blend';

export interface TrackGeometry {
  readonly kind: TrackGeometryKind;
  /**
   * Published estimate, normalized to the frame (x / width, y / height), never clamped.
   * quad: 4 points clockwise in y-down source pixels, points[0] = the engine's origin for
   * the QR family. segment: 2 endpoints. partial: 1 to 8 measured points.
   */
  readonly points: readonly Point[];
  /** Latest validated measurement, same normalization and vertex order. */
  readonly measured: readonly Point[];
  /** Evidence time of measured (ms, tracker clock). */
  readonly observedAt: number;
  /** Display age: snapshot.now - observedAt (ms). */
  readonly age: number;
  /** Largest distance between a published point and its measured vertex, in source px. */
  readonly lag: number;
  readonly reader: 'rxing' | 'rqrr' | null;
  /** Why a reported quad or segment was kept only as partial points. */
  readonly downgrade: GeometryDowngrade | null;
  /** points blend this measurement with the previous estimate. */
  readonly smoothed: boolean;
  /** Why smoothing restarted (then points equal measured). */
  readonly restart: SmoothingRestart | null;
  /**
   * points may drive a sharp mask: tracked, quad, measured by the latest match, every
   * measured and published point within 1 source px of the frame, and lag at most
   * max(2 px, 5% of the measured size). Brackets may use any published quad.
   */
  readonly precise: boolean;
}

export interface Track {
  readonly id: TrackId;
  /** Lowest free display slot at creation, kept for life. */
  readonly slot: number;
  readonly state: TrackState;
  readonly basis: TrackBasis;
  readonly key: ContentKey;
  /** null after forget() until the next match or read. */
  readonly resultId: ResultId | null;
  /** Engine object of the latest matched observation (spatial) or read (content), by reference. */
  readonly detection: Detection;
  /** Address of that observation. */
  readonly observation: ObservationAddress;
  readonly firstSeenAt: number;
  /** Evidence time of the latest measurement (spatial) or read (content). */
  readonly lastSeenAt: number;
  /** Consecutive complete-frame misses. */
  readonly misses: number;
  /** Always null for content tracks; null while lost, or once age >= staleMs. */
  readonly geometry: TrackGeometry | null;
}

export interface TrackedResult {
  readonly id: ResultId;
  readonly key: ContentKey;
  /** Latest engine detection of this content; a located ECI list is never replaced by []. */
  readonly detection: Detection;
  readonly firstObservedAt: number;
  readonly lastObservedAt: number;
  /** now < lastObservedAt + staleMs: decoded recently, which says nothing about position. */
  readonly present: boolean;
  /** Live tracks of this content, in slot order. */
  readonly trackIds: readonly TrackId[];
}

export type ExpiryReason =
  | 'timeout' | 'ambiguous' | 'superseded' | 'capacity' | 'reset' | 'epoch' | 'frame_changed';

/**
 * at is evidence time: the frame's observedAt or the deadline that passed, raised when
 * needed so that at never decreases across one tracker's events.
 */
export type TrackerEvent =
  | { readonly type: 'entered'; readonly trackId: TrackId; readonly at: number;
      readonly cause: 'new' | 'split' }
  /** A content track took a measured position; no claim that the copy read before is this one. */
  | { readonly type: 'localized'; readonly trackId: TrackId; readonly at: number }
  | { readonly type: 'held'; readonly trackId: TrackId; readonly at: number;
      readonly reason: 'missed' | 'unobserved' }
  /** Spatial tracks only. */
  | { readonly type: 'resumed'; readonly trackId: TrackId; readonly at: number }
  | { readonly type: 'lost'; readonly trackId: TrackId; readonly at: number;
      readonly reason: 'missed' | 'stale' }
  /** Spatial tracks only; gap = observedAt - previous lastSeenAt. */
  | { readonly type: 'reappeared'; readonly trackId: TrackId; readonly at: number;
      readonly gap: number }
  | { readonly type: 'expired'; readonly trackId: TrackId; readonly at: number;
      readonly reason: ExpiryReason;
      /** ambiguous and superseded: the tracks that took the contested observations. */
      readonly successors?: readonly TrackId[] }
  | { readonly type: 'unresolved'; readonly key: ContentKey; readonly at: number;
      readonly trackIds: readonly TrackId[] };

export interface UnassignedObservation extends ObservationAddress {
  readonly key: ContentKey;
  readonly reason: 'unresolved' | 'capacity';
}

export interface DroppedGeometry {
  readonly detectionIndex: number;
  readonly occurrenceIndex: number;
  readonly reason: GeometryDowngrade | 'unavailable' | 'unknown-kind' | 'malformed';
}

export interface TrackerSaturation {
  readonly detections: boolean;
  readonly occurrences: boolean;
  readonly observations: boolean;
  readonly tracks: boolean;
}

export type TrackerStatus =
  | 'updated' | 'content_only' | 'rejected' | 'time' | 'reset' | 'forget' | 'peek' | 'destroyed';
export type FrameRejection = 'stale_epoch' | 'stale_sequence' | 'stale_time';

export interface TrackerSnapshot {
  readonly status: TrackerStatus;
  readonly rejection: FrameRejection | null;
  readonly now: number;
  readonly epoch: number;
  readonly frame: AcceptedFrame | null;
  /** now - frame.observedAt; null before the first accepted frame. */
  readonly frameAge: number | null;
  /** Whether the last accepted frame proves absence; null before the first frame. */
  readonly complete: boolean | null;
  /** Slot order. */
  readonly tracks: readonly Track[];
  /** firstObservedAt order, then canonical observation order. */
  readonly results: readonly TrackedResult[];
  /** From the last accepted frame. */
  readonly unassigned: readonly UnassignedObservation[];
  /**
   * From the last accepted frame (empty for content_only), ordered by content key, ECI list,
   * reason and then address, so that the order does not depend on wire order.
   */
  readonly dropped: readonly DroppedGeometry[];
  readonly saturated: TrackerSaturation;
  /** Events applied by the call that produced this snapshot; empty for peek and destroyed. */
  readonly events: readonly TrackerEvent[];
  readonly nextDeadline: number | null;
}

export interface DetectionTracker {
  /**
   * A ScanReport proves absence through its trace; a bare array only with
   * { complete: true }. To filter, pass { ...report, detections: kept }, where kept is
   * chosen by content only, never by position.
   */
  update(input: ScanReport | readonly Detection[], frame: TrackerFrame,
    options?: TrackerUpdateOptions): TrackerSnapshot;
  /** Pure read: the state projected at now (default clock.now()), status 'peek', no events. */
  snapshot(now?: number): TrackerSnapshot;
  /** Applies the deadlines up to now (default clock.now()); status 'time'. */
  advance(now?: number): TrackerSnapshot;
  nextDeadline(): number | null;
  /**
   * Expires every track and keeps results, within retainMs and maxResults at once. Frames
   * observed at or before now are rejected afterwards. A larger epoch becomes current (reason
   * 'epoch'); a smaller one throws a RangeError; otherwise the reason is 'reset'.
   */
  reset(options?: { epoch?: number }): TrackerSnapshot;
  /** Removes one result; its live tracks continue and their next match opens a new one. */
  forget(id: ResultId): boolean;
  /** reset() plus removal of every result; serials continue. */
  clear(): TrackerSnapshot;
  /**
   * Cancels the timer and drops onChange and onError without emitting. Afterwards every
   * method does nothing: snapshots have status 'destroyed', forget() returns false and
   * nextDeadline() returns null. Idempotent.
   */
  destroy(): void;
}

export function createDetectionTracker(options?: DetectionTrackerOptions): DetectionTracker;

// --------------------------------------------------------------------- projection

export type VideoFit = 'contain' | 'cover' | 'fill';

/** Centered object-fit only; the overlay module handles object-position, none and scale-down. */
export interface VideoView {
  sourceWidth: number;
  sourceHeight: number;
  viewWidth: number;
  viewHeight: number;
  /** Default 'contain'. */
  fit?: VideoFit;
  /** The displayed video is mirrored. */
  mirror?: boolean;
}

export function projectVideoPoint(point: Point, view: VideoView): Point;

export interface ProjectedGeometry {
  readonly kind: TrackGeometryKind;
  /** CSS pixels in the view box. */
  readonly points: readonly Point[];
  /**
   * quad: finite, all turns non-zero with one sign, |area| >= minArea. segment: finite and
   * at least 1 px long. partial: finite.
   */
  readonly valid: boolean;
  /** Every point within [-1, viewWidth + 1] x [-1, viewHeight + 1]: nothing is cropped. */
  readonly inView: boolean;
  /** geometry.precise && valid && inView. */
  readonly precise: boolean;
}

export function projectVideoGeometry(
  geometry: Pick<TrackGeometry, 'kind' | 'points' | 'precise'>,
  view: VideoView,
  /** minArea in CSS px squared, default 16. */
  options?: { minArea?: number },
): ProjectedGeometry;

// ------------------------------------------------------------------------ capture

export type CameraFrameSource = 'video-frame-callback' | 'timer';

export interface CameraFrame extends TrackerFrame {
  epoch: number;
  sequence: number;
  readonly source: CameraFrameSource;
  /**
   * requestVideoFrameCallback metadata.captureTime (ms, same time origin as observedAt) when
   * finite and <= observedAt, else null. Absent on many devices and on the timer path.
   */
  readonly captureTime: number | null;
  /** metadata.mediaTime: seconds on the media timeline, not comparable with observedAt. */
  readonly mediaTime: number | null;
  readonly presentedFrames: number | null;
  /** Intrinsic video size before the maxDimension downscale. */
  readonly videoWidth: number;
  readonly videoHeight: number;
  /** clock.now() when scanFrame was called. */
  readonly decodeStartedAt: number;
  /** clock.now() when the report arrived. */
  readonly completedAt: number;
  readonly decoderGeneration: number;
}

export type CameraScannerState =
  | 'idle' | 'starting' | 'running' | 'recovering' | 'stopped' | 'failed';

export type CameraScannerErrorCode =
  | 'unsupported' | 'permission_denied' | 'device_not_found' | 'device_busy'
  | 'constraints_unsatisfied' | 'start_failed' | 'play_failed' | 'canvas_unavailable'
  | 'stream_ended' | 'decode_failed' | 'decode_timeout' | 'recover_failed' | 'callback_failed';

export class CameraScannerError extends Error {
  constructor(code: CameraScannerErrorCode, message?: string, options?: { cause?: unknown });
  readonly name: 'CameraScannerError';
  readonly code: CameraScannerErrorCode;
  /** The native error (DOMException, worker or callback error, timeout) when there is one. */
  readonly cause: unknown;
}

export type CameraStateReason =
  | 'start' | 'stop' | 'hidden' | 'pagehide' | 'constraints' | 'muted' | 'unmuted'
  | 'stalled' | 'frames-resumed' | 'recover' | 'recovered' | 'error';

export interface CameraStateChange {
  readonly state: CameraScannerState;
  readonly previous: CameraScannerState;
  readonly reason: CameraStateReason;
  readonly error: CameraScannerError | null;
  readonly epoch: number;
  readonly decoderGeneration: number;
  readonly muted: boolean;
  readonly stalled: boolean;
  readonly source: CameraFrameSource | null;
}

export interface ScanFrameContext {
  /**
   * Aborted only when the decode timeout fires. The adapter never settles while its decoder
   * still works on this frame: on abort it terminates the decoder, then rejects.
   */
  readonly signal: AbortSignal;
  readonly frame: Omit<CameraFrame, 'completedAt'>;
}

export interface CameraScannerOptions {
  video: HTMLVideoElement;
  /**
   * Prefer a module worker to keep the main thread responsive. At most one call is
   * outstanding, across sessions. Reuse one loaded scanner (for example in one module
   * worker); never initialize an engine per call.
   */
  scanFrame(rgba: Uint8ClampedArray, width: number, height: number,
    context: ScanFrameContext): ScanReport | Promise<ScanReport>;
  /**
   * When given, the controller calls tracker.update(report, frame, { now: completedAt })
   * before onResult, and tracker.reset({ epoch }) whenever an epoch ends. A throw from that
   * reset stops no step of the end; it reaches onError as callback_failed (without onError,
   * it is rethrown from a microtask).
   */
  tracker?: DetectionTracker;
  /** Required unless tracker is given. snapshot is the tracker's, or null without one. */
  onResult?(report: ScanReport, frame: CameraFrame, snapshot: TrackerSnapshot | null): void;
  onError?(error: CameraScannerError): void;
  onState?(change: CameraStateChange): void;
  /**
   * Replaces a hung or failed decoder, for example by terminating and recreating the
   * worker. Without it a decode timeout fails the session. Runs at most maxRecoveries times
   * per session; with maxRecoveries 0 it is never called.
   */
  recover?(cause: CameraScannerError,
    context: { readonly signal: AbortSignal; readonly decoderGeneration: number }):
    Promise<void>;
  /** Long-edge cap of the scanned frame. Default 1280. */
  maxDimension?: number;
  /** Delay from a result to the next frame request. Default 100. */
  intervalMs?: number;
  /** Default 5000. */
  decodeTimeoutMs?: number;
  /** Default 20000. */
  recoverTimeoutMs?: number;
  /** Recoveries per session; start() and setConstraints() each begin one. Default 2. */
  maxRecoveries?: number;
  /**
   * No new frame for this long while running and unmuted sets stalled, measured from the
   * frame request; repeated frames do not restart it. Default 2000.
   */
  stallMs?: number;
  /** Default { facingMode: { ideal: 'environment' } }. */
  constraints?: MediaTrackConstraints;
  mediaDevices?: Pick<MediaDevices, 'getUserMedia'>;
  clock?: Clock;
}

export interface CameraScanner {
  readonly state: CameraScannerState;
  /**
   * Current capture session. Epochs come from one counter shared by every controller of
   * this module instance, so a tracker reused with a new controller never sees one decrease.
   * start() takes the next value when another controller has taken one since.
   */
  readonly epoch: number;
  readonly decoderGeneration: number;
  /** Frame source of the session; null before the first start(). */
  readonly source: CameraFrameSource | null;
  /** True while no new frame has arrived for stallMs (running, unmuted). A mute clears it. */
  readonly stalled: boolean;
  /**
   * Concurrent calls share one start, including a call from onState or from the tracker's
   * onChange during the start. Rejects with the CameraScannerError that onError receives when
   * the session fails before the start settles.
   */
  start(): Promise<void>;
  /**
   * Ends the epoch and releases the camera; late permission answers and results are discarded.
   * Final when called from a callback during a start or switch: that start opens nothing.
   */
  stop(): void;
  /**
   * Ends the epoch, releases the current device, then opens these constraints. When not
   * started, stores them for the next start(). Rejects like start().
   */
  setConstraints(constraints: MediaTrackConstraints): Promise<void>;
}

export function createCameraScanner(options: CameraScannerOptions): CameraScanner;
