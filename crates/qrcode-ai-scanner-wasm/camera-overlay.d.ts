// camera-overlay.d.ts · @qrcode-ai-com/qrcode-barcode-scanner-wasm/camera-overlay (0.11.0)
import type { Detection, Fnc1Position, Payload, Point, Symbology } from './report-types';
import type {
  Clock, ResultId, Track, TrackGeometry, TrackGeometryKind, TrackId, TrackedResult,
  TrackerFrame, TrackerSnapshot,
} from './camera';
import type {
  DestinationCancelReason, DestinationCandidate, DestinationFailureReason,
  DestinationIneligibleReason, DestinationUnavailableReason, DestinationVerifier,
} from './destination';

// ----------------------------------------------------------------------- projection
export type OverlayFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
/** One axis of object-position: origin = fraction * (view - media) + offset (CSS px). */
export interface ObjectPositionAxis { readonly fraction: number; readonly offset: number }
export interface ObjectPosition { readonly x: ObjectPositionAxis; readonly y: ObjectPositionAxis }
/**
 * Computed-style <position> forms: one or two keyword, % or px values; the four-value
 * edge-offset form; the three-value form that pairs an edge and its offset with center
 * ('right 10px center', 'center top 10px'); calc(<percentage> +/- <px>) in either order.
 * Other three-value forms, other units, nested calc() and var() return null.
 */
export function parseObjectPosition(value: string): ObjectPosition | null;

export interface OverlayView {
  /** Intrinsic media size, CSS px (videoWidth, videoHeight). */
  mediaWidth: number;
  mediaHeight: number;
  /** The video content box, CSS px: the overlay's coordinate space. */
  viewWidth: number;
  viewHeight: number;
  /** Default 'contain'. */
  fit?: OverlayFit;
  /** Default 50% 50%. */
  position?: ObjectPosition;
  /** Horizontal mirror of the displayed video. */
  mirror?: boolean;
}
/** The media's drawn box inside the view before mirroring, CSS px. */
export interface MediaRect {
  readonly x: number; readonly y: number; readonly width: number; readonly height: number;
}
export function overlayMediaRect(view: OverlayView): MediaRect;
/** Normalized point (x / frame width, y / frame height) to view CSS px. */
export function projectOverlayPoint(point: Point, view: OverlayView): Point;

export interface OverlayGeometry {
  readonly kind: TrackGeometryKind;
  /** View CSS px, vertex order kept. */
  readonly points: readonly Point[];
  /** projectVideoGeometry validity; minArea in CSS px squared. */
  readonly valid: boolean;
  /** Every point within [-1, W + 1] x [-1, H + 1]. */
  readonly inView: boolean;
  /** Share inside [0, W] x [0, H]: area (valid quad), length (valid segment), else points. */
  readonly visibleFraction: number;
  /** geometry.precise && valid && inView. */
  readonly precise: boolean;
}
export function projectOverlayGeometry(
  geometry: Pick<TrackGeometry, 'kind' | 'points' | 'precise'>,
  view: OverlayView,
  /** minArea default 16. */
  options?: { minArea?: number },
): OverlayGeometry;

// ------------------------------------------------------------------------- outlines
export interface OutlineOptions {
  /** CSS px from each measured edge, 0-16. Default 5.5. */
  offset?: number;
  /** Fraction of the offset edge, (0, 0.45]. Default 0.27. */
  arm?: number;
  /** 0-24. Default 6. */
  minArm?: number;
  /** Default max(23, minArm); an explicit value must lie in [minArm, 64], otherwise
   *  RangeError. */
  maxArm?: number;
  /** Corner radius cap, 0-16, never above 0.27 x the shorter arm. Default 4.2. */
  radius?: number;
  /** An offset corner moves at most miterLimit x offset, 1-10. Default 4. */
  miterLimit?: number;
}
export interface QuadOutline {
  /** Offset corners in input order, unrounded. */
  readonly corners: readonly Point[];
  /** Four rounded corner subpaths in input order, numbers rounded to 0.1. Reversed input
   *  reverses the subpath order and the direction of each subpath. */
  readonly bracket: string;
}
/** Strictly convex quad in either winding; RangeError otherwise. */
export function quadOutline(points: readonly Point[], options?: OutlineOptions): QuadOutline;
/**
 * Closed rounded region `margin` px outside the quad: the sharp cutout. Defaults 9, 6, 4.
 * Corner radii are bounded so every measured vertex stays inside; margin 0 is the quad.
 */
export function quadRegion(
  points: readonly Point[],
  options?: { margin?: number; radius?: number; miterLimit?: number },
): string;

// -------------------------------------------------------------------------- readout
/** Derived presentation, never a detected value. */
export type SymbologyFamily = 'matrix' | 'stacked' | 'linear';
/** null for data_bar and data_bar_expanded (one wire value each for linear and stacked
 *  prints) and for a symbology this version does not know. */
export function symbologyFamily(symbology: string): SymbologyFamily | null;
export type TextSegment =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'break'; readonly text: '\n' | '\r\n' | '\r' }
  | { readonly type: 'escape'; readonly text: string; readonly codePoint: number;
      readonly name: string };
/** Lossless: the segments' text joined equals the input. */
export function segmentText(text: string): readonly TextSegment[];
export interface EncodedUrl {
  /** payload.url exactly as decoded. */
  readonly encoded: string;
  /** WHATWG serialization, used only by the Open button. */
  readonly href: string;
  /** ASCII host from the URL parser (IDNA: a homograph shows as xn--). */
  readonly host: string;
}
export interface ReadoutField {
  /** Payload field name, or 'gs1:' + AI. */
  readonly key: string;
  readonly label: string;
  /** Exact text; numbers are parsed values via String(); booleans as the yes/no labels. */
  readonly value: string;
}
export interface ReadoutEci { readonly designator: number; readonly start: number }
export interface DetectionReadout {
  readonly symbology: string;
  /** Exact label, or the wire value when unknown. */
  readonly symbologyLabel: string;
  readonly family: SymbologyFamily | null;
  readonly familyLabel: string | null;
  /** Wire value; an unknown kind is labeled as text. */
  readonly kind: string;
  readonly kindLabel: string;
  /** content.text unchanged. */
  readonly text: string;
  readonly segments: readonly TextSegment[];
  /** false exactly when content.charset === 'unknown'. */
  readonly complete: boolean;
  readonly charset: string;
  /** content.eci: null when absent; [] when an ECI was declared but not located. */
  readonly eci: readonly ReadoutEci[] | null;
  /** content.fnc1, or null when absent. */
  readonly fnc1: Fnc1Position | null;
  /** content.raw decoded from base64: uppercase hex pairs joined by single spaces. */
  readonly bytes: string;
  /** Only for url and gs1_digital_link payloads whose URL parses as http: or https:. */
  readonly url: EncodedUrl | null;
  /** destinationCandidate(detection) from ./destination, unchanged; covers url,
   *  gs1_digital_link, me_card.url. */
  readonly candidate: DestinationCandidate;
  /** payload.gtin when present; never a product identity. */
  readonly gtin: string | null;
  readonly fields: readonly ReadoutField[];
  /** GS1 issues verbatim, in engine order. */
  readonly issues: readonly string[];
}
export function describeDetection(
  detection: Detection, labels?: OverlayLabelOverrides,
): DetectionReadout;

// ---------------------------------------------------------------------- destination
/**
 * The part of the ./destination DestinationVerifier the overlay calls; a
 * createDestinationVerifier() result fits. The overlay reads snapshots by candidate, renders
 * every URL as text, calls resolve() or cancel() only from a user action, passes no signal
 * (attempts are shared), and never fetches or navigates by itself.
 */
export type OverlayDestinations =
  Pick<DestinationVerifier, 'canResolve' | 'get' | 'resolve' | 'cancel' | 'subscribe'>;
export type OverlayDestinationReason =
  | DestinationFailureReason | DestinationUnavailableReason
  | Exclude<DestinationCancelReason, 'cleared'>;

// --------------------------------------------------------------------------- labels
export interface OverlayAnnouncement {
  /** null: the selection ended. */
  readonly target: string | null;
  readonly symbology: string | null;
  readonly kind: string | null;
  /** The visible state text; never a held state. */
  readonly state: string | null;
  /** First 48 code points, chips by name; null unless announceContent is 'preview'. */
  readonly preview: string | null;
}
export interface OverlayDestinationLabels {
  heading: string;
  sources: { me_card: string; gs1_digital_link: string };
  requestUrl: string;
  ineligible: Record<Exclude<DestinationIneligibleReason, 'no_url'>, string>;
  unverified: string; queued: string; resolving: string;
  observed: string; example: string; failed: string; canceled: string; unavailable: string;
  providerError: string;
  reasons: Record<OverlayDestinationReason, string>;
  httpStatus(status: number): string;
  redirects: string;
  hops(followed: number, oneNotFollowed: boolean): string;
  hopsUnknown(atLeastOne: boolean): string;
  refusedScheme(scheme: string): string;
  invalidLocation: string;
  detail: string;
  /** time: Intl-formatted wall time of settledAt in the overlay's lang. */
  observedAt(time: string, durationMs: number): string;
  exampleAt(time: string, durationMs: number): string;
  endedAt(time: string): string;
  provenance: { fixture: string; simulated: string };
  request: { none: string; maybe: string; response: string; sent: string };
  check: string; checkAgain: string; cancel: string;
}
export interface OverlayLabels {
  targets: string;
  choose: string;
  target(track: Track, slot: number): string;
  earlier: string;
  readout: string;
  none: string;
  position(name: string, index: number, count: number): string;
  previous: string; next: string; more: string; less: string;
  states: { inView: string; readNow: string; lost: string; notRecent: string };
  stillReadAs(targets: readonly string[]): string;
  sameContentAs(targets: readonly string[]): string;
  geometry: { segment: string; partial: string; none: string; offscreen: string };
  symbologies: Record<Symbology, string>;
  families: Record<SymbologyFamily, string>;
  kinds: Record<Payload['kind'], string>;
  fields: Record<string, string>;
  parsedFields: string;
  yes: string; no: string; unknown: string;
  incomplete: string; incompleteEci: string;
  charset: string; bytes: string; eci: string; eciUnlocated: string;
  eciAt(designator: number, start: number): string;
  fnc1: string; fnc1Positions: Record<Fnc1Position, string>;
  character(name: string, codePoint: number): string;
  copy: string; copyBytes: string; copied: string; copyFailed: string;
  details: string; open: string; encodedUrl: string; host: string;
  conformant: string; issues: string;
  saturated: string; saturatedOccurrences: string;
  count(live: number): string;
  announce(entry: OverlayAnnouncement): string;
  destination: OverlayDestinationLabels;
}
/** Records merge key by key at every depth; strings and functions replace. */
export type LabelOverrides<T> = {
  readonly [K in keyof T]?: T[K] extends (...args: never[]) => unknown ? T[K]
    : T[K] extends string ? string : LabelOverrides<T[K]>;
};
export type OverlayLabelOverrides = LabelOverrides<OverlayLabels>;
/** Deeply frozen English defaults. */
export const DEFAULT_LABELS: Readonly<OverlayLabels>;

// -------------------------------------------------------------------------- overlay
/** Track palette; a track's color index is slot % 8. */
export const TRACK_COLORS:
  readonly [string, string, string, string, string, string, string, string];
/** The injected stylesheet, for styles: 'none' under a strict style-src. */
export const CAMERA_OVERLAY_CSS: string;
export type OverlayFocus = 'auto' | 'all' | 'selected' | 'off';
export type OverlayRail = 'auto' | 'multiple' | 'always' | 'never';
/** The failure states are listed in precedence order (the first that applies wins);
 *  anything but 'aligned' hides markers and effects, never the rail. */
export type OverlayAlignment =
  | 'aligned' | 'no-frame' | 'no-size' | 'unsupported-transform' | 'object-view-box'
  | 'unsupported-fit' | 'unsupported-position' | 'no-media' | 'frame-mismatch';
export interface OverlayEffects {
  /** 0-0.85. Default 0.42. */
  dim?: number;
  /** CSS px, 0-24. Default 8. */
  blur?: number;
  /** 0-0.25. Default 0. */
  wash?: number;
  /** 0-1. Default 0.7. */
  glow?: number;
  /** Continuous eligibility before effects switch on, 300-5000 ms. Default 500. */
  dwellMs?: number;
  /** Minimum off time after a switch-off, 400-5000 ms; doubled under reduced motion.
   *  Default 1000. */
  cooldownMs?: number;
}
export interface OverlayMarkers extends OutlineOptions {
  /** 0-24. Default 9 (offset 5.5 + selected casing 2.5 + 1). */
  cutoutMargin?: number;
  /** 0-16. Default 6. */
  cutoutRadius?: number;
  /** 0-24. Default 12. */
  hitSlop?: number;
  /** Default 'line'. */
  segment?: 'line' | 'none';
  /** Default 'points'. */
  partial?: 'points' | 'none';
  /** Badge on the view edge for a measured code entirely outside the view. Default true. */
  edgeHints?: boolean;
}
export interface OverlayThumbnails {
  /** Longest CSS side, 24-96. Default 48. */
  size?: number;
  /** Crop refresh and frame-request pacing, 250-60000 ms. Default 1000. */
  refreshMs?: number;
}
/** Each defaults to true; check shows only with a provider that can resolve. */
export interface OverlayActions { open?: boolean; copy?: boolean; check?: boolean }
export interface OverlayAction {
  readonly type: 'open' | 'copy' | 'copy-bytes' | 'resolve' | 'cancel';
  readonly track: Track | null;
  readonly result: TrackedResult | null;
  /** Exact content text (copy), the hex bytes (copy-bytes), or the exact encoded URL. */
  readonly value: string;
  readonly defaultPrevented: boolean;
  /** Skips the overlay's own window.open, clipboard write, resolve or cancel call. */
  preventDefault(): void;
}
export type FrameImage = ImageData | ImageBitmap;
export type FrameImageFrame =
  Pick<TrackerFrame, 'width' | 'height' | 'observedAt' | 'epoch' | 'sequence'>;
export interface CameraOverlaySettings {
  /** Fires after the DOM is consistent whenever the selected track id, the readout's result
   *  id or the presence of a readout subject changes. */
  onSelect?(track: Track | null, result: TrackedResult | null): void;
  /** Fires before the overlay opens, copies, resolves or cancels. */
  onAction?(action: OverlayAction): void;
  /** Callback and provider exceptions; never called after destroy(). Default: rethrown from
   *  a microtask. */
  onError?(error: unknown): void;
  /** Default 'auto': computed object-fit. */
  fit?: OverlayFit | 'auto';
  /** Default 'auto': computed object-position; a string goes through parseObjectPosition. */
  position?: 'auto' | string | ObjectPosition;
  /** Default 'auto': mirror detected from transforms. */
  mirror?: boolean | 'auto';
  /** Markers, badges, effects and hit areas. Default true. */
  scene?: boolean;
  /** Default 'auto'. */
  focus?: OverlayFocus;
  effects?: OverlayEffects;
  markers?: OverlayMarkers;
  /** Default 'track'. */
  colors?: 'track' | 'mono';
  /** Default 'auto' (prefers-reduced-motion). */
  motion?: 'auto' | 'reduce';
  /** Default 'auto'. */
  rail?: OverlayRail;
  /** Rail entries for results without a live track. Default true. */
  retained?: boolean;
  /** Default true. */
  readout?: boolean;
  actions?: OverlayActions;
  /** Default false. */
  thumbnails?: boolean | OverlayThumbnails;
  /** A ./destination verifier. Default null: an eligible URL reads "Destination not
   *  checked", no Check. */
  destinations?: OverlayDestinations | null;
  /** Default true; false hides the slot for a host that renders its own destination row. */
  destinationSlot?: boolean;
  /** Default 'none': announcements never contain decoded content. */
  announceContent?: 'none' | 'preview';
  labels?: OverlayLabelOverrides;
  /** BCP 47 tag of the overlay's own text, set on the root and parts. Default 'en'. */
  lang?: string;
  /** color-scheme of the root and parts. Default 'dark'. */
  scheme?: 'dark' | 'light' | 'inherit';
}
export interface CameraOverlayOptions extends CameraOverlaySettings {
  video: HTMLVideoElement;
  /** Contains the video and establishes a positioned containing block. With its ancestors it
   *  may carry at most a positive uniform scale plus translation. */
  container: HTMLElement;
  /** Render the rail and/or readout into these elements (same document, outside container,
   *  any tree scope). Recommended: below the video. */
  mount?: { rail?: HTMLElement; readout?: HTMLElement };
  /** Default 'inject'. */
  styles?: 'inject' | 'none';
  styleNonce?: string;
  /** UI timers only: announcements, copy feedback, locks, frame-request pacing. */
  clock?: Clock;
}
export interface OverlayTargetInspection {
  readonly id: TrackId;
  readonly slot: number;
  /** String(slot + 1). */
  readonly number: string;
  readonly color: number | 'mono';
  readonly state: Track['state'];
  readonly basis: Track['basis'];
  readonly kind: TrackGeometryKind | null;
  readonly drawn: 'outline' | 'line' | 'points' | 'edge' | 'none';
  readonly selected: boolean;
  readonly related: boolean;
  readonly precise: boolean;
  readonly cutout: boolean;
  /** Applied cutout margin, null without a cutout. */
  readonly margin: number | null;
  readonly visibleFraction: number | null;
  /** The visible state text. */
  readonly stateText: string;
  readonly points: readonly Point[] | null;
  readonly bracket: string | null;
  readonly badge: Point | null;
}
export interface OverlayInspection {
  readonly alignment: OverlayAlignment;
  readonly view: (Required<OverlayView> & { readonly rect: MediaRect }) | null;
  /** In-video arrangement, or 'mounted' when both parts are mounted. */
  readonly arrangement: 'regular' | 'compact' | 'minimal' | 'mounted';
  /** CSS px of view height taken by in-video controls, measured from the bottom edge. */
  readonly controlsHeight: number;
  readonly focus: 'all' | 'selected' | 'off';
  readonly effects: {
    readonly active: boolean; readonly eligibleSince: number | null;
    readonly offSince: number | null; readonly activations: number;
  };
  readonly blur: 'on' | 'off' | 'unsupported';
  /** Even-odd region shared by the scrim, the wash and the blur clip. */
  readonly clip: string | null;
  readonly selectionMode: 'auto' | 'manual';
  readonly selected: TrackId | ResultId | null;
  readonly held: ResultId | null;
  readonly declined: readonly TrackId[];
  readonly locks: { readonly pointer: boolean; readonly focus: boolean };
  readonly ignored: {
    readonly count: number; readonly last: 'stale_epoch' | 'stale_time' | 'stale_frame' | null;
  };
  readonly destinations: 'none' | 'ready' | 'failed';
  readonly frameImage: { readonly pending: boolean; readonly crops: number };
  /** Rail order. */
  readonly entries: readonly (TrackId | ResultId)[];
  /** Slot order. */
  readonly targets: readonly OverlayTargetInspection[];
}
export interface CameraOverlay {
  /** The selected live track from the latest snapshot; null for none or a result selection. */
  readonly selected: Track | null;
  /** The readout's result: the selected track's, a selected result, or the held one. */
  readonly selectedResult: TrackedResult | null;
  /** The readout subject: selectedResult's detection, else the selected track's own
   *  detection. Feed a ./destination createDestinationSelection binder from it. */
  readonly detection: Detection | null;
  readonly selectionMode: 'auto' | 'manual';
  readonly alignment: OverlayAlignment;
  readonly destroyed: boolean;
  /** TypeError for an array or a non-snapshot. Ignores a snapshot older than the last applied
   *  one (a lower epoch, or the same epoch with an earlier now or an older frame); no-op
   *  after destroy(). Deliver every onChange snapshot, in order. */
  update(snapshot: TrackerSnapshot): void;
  /** Live TrackId or present ResultId: manual (a ResultId with live tracks selects its
   *  lowest-slot live track). null: automatic, declined set emptied. false: unknown id. */
  select(id: TrackId | ResultId | null): boolean;
  /** Empties selection, declined set, crops, the ordering record and the scene until the
   *  next update. */
  clear(): void;
  /** Re-reads object-fit, object-position, transforms and sizes, synchronously. */
  layout(): void;
  /** Validates everything first; a RangeError or TypeError changes nothing. */
  setOptions(settings: CameraOverlaySettings): void;
  /** true when a crop is due and the pacing allows a copy; copy a frame only then. */
  wantsFrameImage(): boolean;
  /** Pixels of the frame about to be scanned; replaces a pending image. The overlay closes
   *  every ImageBitmap it receives. */
  setFrameImage(image: FrameImage, frame: FrameImageFrame): void;
  /** New frozen diagnostic object on each call. */
  inspect(): OverlayInspection;
  /** Removes every node, listener, observer and timer and unsubscribes from destinations.
   *  Shared destination attempts are not canceled. Idempotent. */
  destroy(): void;
}
/** Framework-free spatial overlay and readout; repaint from
 *  createDetectionTracker({ onChange }). */
export function createCameraOverlay(options: CameraOverlayOptions): CameraOverlay;
