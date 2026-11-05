import type { ScanReport } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
import { loadScanner, createScannerLoader, ScannerInitError, type ScannerVariant } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/auto';
import {
  CameraScannerError, TRACKER_LIMITS, contentKey, createCameraScanner, createDetectionTracker, projectVideoGeometry,
  projectVideoPoint, sameContent, type CameraFrame, type CameraScanner, type CameraScannerErrorCode,
  type CameraStateChange, type ScanFrameContext, type Track, type TrackerFrame, type TrackerSnapshot,
} from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/camera';
// Every name camera-overlay.d.ts exports, in its order: the runner compares this list with the
// installed declarations and checks that the code below uses each one.
import {
  type OverlayFit, type ObjectPositionAxis, type ObjectPosition, parseObjectPosition, type OverlayView,
  type MediaRect, overlayMediaRect, projectOverlayPoint, type OverlayGeometry, projectOverlayGeometry,
  type OutlineOptions, type QuadOutline, quadOutline, quadRegion, type SymbologyFamily, symbologyFamily,
  type TextSegment, segmentText, type EncodedUrl, type ReadoutField, type ReadoutEci,
  type DetectionReadout, describeDetection, type OverlayDestinations, type OverlayDestinationReason,
  type OverlayAnnouncement, type OverlayDestinationLabels, type OverlayLabels, type LabelOverrides,
  type OverlayLabelOverrides, DEFAULT_LABELS, TRACK_COLORS, CAMERA_OVERLAY_CSS, type OverlayFocus,
  type OverlayRail, type OverlayAlignment, type OverlayEffects, type OverlayMarkers,
  type OverlayThumbnails, type OverlayActions, type OverlayAction, type FrameImage,
  type FrameImageFrame, type CameraOverlaySettings, type CameraOverlayOptions,
  type OverlayTargetInspection, type OverlayInspection, type CameraOverlay, createCameraOverlay,
} from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/camera-overlay';
// Every name destination.d.ts exports, in its order: the runner compares this list with the
// installed declarations, so each one compiles here through the package's exports map.
import {
  type DestinationDetailSentence, DESTINATION_POLICY, type DestinationSignal,
  type DestinationTimers, type DestinationFetchInit, type DestinationBodyReader,
  type DestinationResponseBody, type DestinationFetchResponse, type DestinationFetch,
  type DestinationSource, type DestinationIneligibleReason, type EligibleDestinationCandidate,
  type IneligibleDestinationCandidate, type DestinationCandidate, destinationCandidate,
  type DestinationAddressRange, type DestinationAddressInfo, type DestinationAddressOptions,
  classifyAddress, type DestinationSpecialUseName, type DestinationHostInfo, classifyHost,
  type DestinationState, type DestinationProvenance, type DestinationTransportKind,
  type DestinationFailureReason, type DestinationTransportUnavailableReason,
  type DestinationGuardUnavailableReason, type DestinationVerifierUnavailableReason,
  type DestinationUnavailableReason, type DestinationCancelReason, type DestinationReason,
  type DestinationRedirectStep, type DestinationTransportInfo, type DestinationSnapshotBase,
  type DestinationUnverifiedSnapshot, type DestinationResolvingSnapshot,
  type DestinationResolvedSnapshot, type DestinationFailedSnapshot,
  type DestinationCanceledSnapshot, type DestinationUnavailableSnapshot,
  type DestinationSnapshot, type DestinationRequest, type DestinationObservation,
  type DestinationTransport, type DestinationResolveRequest, type ResolveDestinationOptions,
  type DestinationResolutionBase, type DestinationResolvedResolution,
  type DestinationFailedResolution, type DestinationUnavailableResolution,
  type DestinationCanceledResolution, type DestinationResolution, resolveDestination,
  type DestinationTarget, type DestinationVerifierOptions, type DestinationResolveOptions,
  type DestinationChangeCause, type DestinationChange, type DestinationVerifier,
  createDestinationVerifier, type DestinationSelectionView, type DestinationSelectionOptions,
  type DestinationSelection, createDestinationSelection, type FetchTransportBaseOptions,
  type NetworkFetchTransportOptions, type FixtureFetchTransportOptions,
  type FetchTransportOptions, createFetchTransport, type EndpointTransportOptions,
  createEndpointTransport, type PreparedDestinationResult, type PreparedDestinationEntry,
  type PreparedTransportOptions, createPreparedTransport, type DestinationWireRequest,
  type DestinationWireResponse, type DestinationWireError,
} from '@qrcode-ai-com/qrcode-barcode-scanner-wasm/destination';
const scanner = await loadScanner();
const variant: ScannerVariant = scanner.variant;
const report: ScanReport = scanner.scan_image(new Uint8Array(), 'full');
const compatible = createScannerLoader({ variant: 'compatible', wasmUrl: new URL('/scanner.wasm', 'https://example.invalid') });
const error = new ScannerInitError('asset_http_failed', variant, undefined, 404);
void [report, compatible, error.code, error.status];

// Camera: a tracker frame carries observedAt, in ms on the tracker's clock (performance.now()
// by default); epoch and sequence are optional.
const tracker = createDetectionTracker({ smoothing: { kind: 'fixed', alpha: 0.35 }, staleMs: 1200, reacquireMs: 2000 });
const frame: TrackerFrame = { width: 640, height: 480, observedAt: performance.now() };
// @ts-expect-error observedAt is required
const untimed: TrackerFrame = { width: 640, height: 480 };
// @ts-expect-error timestamp was renamed to observedAt: the old field is refused even beside it
const renamed: TrackerFrame = { width: 640, height: 480, observedAt: 0, timestamp: 0 };
// @ts-expect-error holdMs was removed in favour of staleMs and reacquireMs
createDetectionTracker({ holdMs: 500 });
const snapshot: TrackerSnapshot = tracker.update(report, { ...frame, epoch: 1, sequence: 1 }, { complete: true });
const track: Track | undefined = snapshot.tracks[0];
const kind: 'quad' | 'segment' | 'partial' | undefined = track?.geometry?.kind;
const detection = report.detections[0];
void [untimed, renamed, kind, contentKey(detection), sameContent(detection, detection), TRACKER_LIMITS.tracks,
  projectVideoPoint({ x: 0.5, y: 0.5 }, { sourceWidth: 640, sourceHeight: 480, viewWidth: 320, viewHeight: 240 }),
  track?.geometry && projectVideoGeometry(track.geometry, { sourceWidth: 640, sourceHeight: 480, viewWidth: 320, viewHeight: 240, fit: 'cover' })];

// Overlay call sites, adjusted only as far as the shipped declarations require: update takes
// the snapshot alone.
const video = document.createElement('video');
const overlay = createCameraOverlay({ video, container: document.createElement('div') });
overlay.update(tracker.update(report.detections, frame));
const session = createCameraScanner({ video, scanFrame: (rgba, width, height) => scanner.scan_frame(new Uint8Array(rgba.buffer), width, height),
  onResult: (result, captured) => overlay.update(tracker.update(result.detections, captured)) });
void [session, projectVideoPoint];

// The controller as camera.d.ts defines it: a tracker it updates before onResult, the frame
// context of scanFrame, delivered camera frames, states, errors and recovery.
const controller: CameraScanner = createCameraScanner({
  video, tracker, maxDimension: 640, intervalMs: 100, decodeTimeoutMs: 5000, recoverTimeoutMs: 20000, maxRecoveries: 1,
  stallMs: 2000, constraints: { facingMode: { ideal: 'environment' } },
  scanFrame: (rgba: Uint8ClampedArray, width: number, height: number, context: ScanFrameContext) => {
    const pending: [number, number, number, number] = [context.frame.observedAt, context.frame.decodeStartedAt,
      context.frame.decoderGeneration, context.frame.sequence];
    void [pending, context.signal.aborted];
    return scanner.scan_frame(new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength), width, height, 'frame');
  },
  onResult: (result: ScanReport, captured: CameraFrame, latest: TrackerSnapshot | null) => {
    const timing: [number, number, number | null, number | null] = [captured.observedAt, captured.completedAt,
      captured.captureTime, captured.mediaTime];
    const size: [number, number, number, number] = [captured.width, captured.height, captured.videoWidth, captured.videoHeight];
    const source: 'video-frame-callback' | 'timer' = captured.source;
    void [result.detections.length, timing, size, source, captured.epoch, captured.presentedFrames, latest?.status];
  },
  onError: (failure: CameraScannerError) => { const code: CameraScannerErrorCode = failure.code; void [code, failure.cause]; },
  onState: (change: CameraStateChange) => { void [change.state, change.previous, change.reason, change.error, change.decoderGeneration]; },
  recover: async (cause, { signal, decoderGeneration }) => { void [cause.code, signal.aborted, decoderGeneration]; },
});
// A bare read: only a missing property satisfies the directive, so an optional or nullable
// completedAt fails here as well as a present one.
// @ts-expect-error completedAt is not known while scanFrame runs
void ({} as ScanFrameContext).frame.completedAt;
// @ts-expect-error recover must return a Promise
createCameraScanner({ video, tracker, scanFrame: () => report, recover: () => undefined });
void [controller.state, controller.epoch, controller.decoderGeneration, controller.source, controller.stalled,
  controller.start(), controller.setConstraints({ facingMode: 'user' }), controller.stop(),
  new CameraScannerError('decode_timeout', undefined, { cause: new Error('hung') })];

// Destination, as destination.d.ts declares it: the DOM's fetch, AbortSignal and Response fit
// its structural shapes; a resolution or snapshot is narrowed on its outcome or state before
// finalUrl reads as text; a transport always names itself and a fetch transport always states
// its scope.
{
  const destinationFetch: DestinationFetch = fetch;
  const timers: DestinationTimers = {
    now: () => Date.now(), monotonic: () => performance.now(),
    setTimeout: (callback, ms) => setTimeout(callback, ms),
    clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
  const signal: DestinationSignal = new AbortController().signal;
  const init: DestinationFetchInit = { method: 'GET', mode: 'cors', credentials: 'omit',
    cache: 'no-store', redirect: 'follow', referrer: '', referrerPolicy: 'no-referrer', signal };
  const response: DestinationFetchResponse = new Response('ok');
  const body: DestinationResponseBody | null = response.body;
  const reader: DestinationBodyReader | undefined = body?.getReader();
  const sentence: DestinationDetailSentence | undefined = DESTINATION_POLICY.detailSentences[0];
  const hopsLimit: 20 = DESTINATION_POLICY.maxHopsLimit;

  // Candidates from a detection, a payload or a string; eligibility narrows the shape.
  const candidate: DestinationCandidate = destinationCandidate(report.detections[0]);
  const fromPayload: DestinationCandidate = destinationCandidate(report.detections[0].payload);
  const fromText = destinationCandidate('https://example.com/a#frag');
  const requested: string | DestinationIneligibleReason = fromText.eligible
    ? (fromText satisfies EligibleDestinationCandidate).requestUrl
    : (fromText satisfies IneligibleDestinationCandidate).reason;
  const source: DestinationSource | null = candidate.source;
  const addressOptions: DestinationAddressOptions = { translationPrefixes: ['64:ff9b::/96'],
    deniedRanges: ['203.0.113.0/24'] };
  const address: DestinationAddressInfo | null = classifyAddress('10.0.0.1', addressOptions);
  const range: DestinationAddressRange | undefined = address?.range;
  const host: DestinationHostInfo | null = classifyHost('printer.local', addressOptions);
  const specialUse: DestinationSpecialUseName | null = host?.kind === 'name'
    ? host.specialUse : null;

  // The built-in transports and a custom one; each states its kind, label and provenance.
  const networkOptions: NetworkFetchTransportOptions = { scope: 'network', fetch: destinationFetch,
    timers };
  const network: DestinationTransport = createFetchTransport(networkOptions);
  const shared: FetchTransportBaseOptions = { label: 'Local fixture (this browser)', timers };
  const fixtureOptions: FixtureFetchTransportOptions = { ...shared, scope: 'fixture',
    fixtureOrigin: 'http://127.0.0.1:5279' };
  const fetchOptions: FetchTransportOptions[] = [networkOptions, fixtureOptions];
  const fixture = createFetchTransport(fixtureOptions);
  const endpointOptions: EndpointTransportOptions = { endpoint: '/api/destination',
    label: 'Server resolver', credentials: 'same-origin', headers: { 'x-csrf-token': 'token' },
    provenance: 'network', crossOrigin: false, fetch: destinationFetch, timers };
  const endpoint: DestinationTransport = createEndpointTransport(endpointOptions);
  const step: DestinationRedirectStep = { url: 'https://example.com/promo', status: 302,
    location: 'https://example.com/landing', refusedScheme: null };
  const preparedResult: PreparedDestinationResult = { outcome: 'resolved',
    finalUrl: 'https://example.com/landing', status: 200, redirects: [step] };
  const entries: PreparedDestinationEntry[] = [{ url: step.url, result: preparedResult },
    { url: 'https://example.com/slow', result: 'pending' }];
  const preparedOptions: PreparedTransportOptions = { label: 'Prepared example', delayMs: 120,
    timers };
  const prepared = createPreparedTransport(entries, preparedOptions);
  const custom: DestinationTransport = {
    kind: 'custom', label: 'Test transport', provenance: 'fixture',
    resolve: async (request: DestinationRequest): Promise<DestinationObservation> =>
      (request.signal.aborted ? { outcome: 'unavailable', reason: 'out_of_scope', requestSent: false }
        : { outcome: 'failed', reason: 'timeout', redirects: [], requestSent: true }),
  };
  const info: DestinationTransportInfo = { kind: custom.kind, label: custom.label };
  const kinds: DestinationTransportKind[] = [network.kind, fixture.kind, endpoint.kind,
    prepared.kind];
  const provenance: DestinationProvenance = prepared.provenance;

  // One call: the outcome narrows the resolution, and every outcome is handled.
  const request: DestinationResolveRequest = { url: 'https://example.com/', maxHops: 3,
    timeoutMs: 5000, signal };
  const callOptions: ResolveDestinationOptions = { timers };
  const resolution: DestinationResolution = await resolveDestination(network, request, callOptions);
  const base: DestinationResolutionBase = resolution;
  const resolutionText = (value: DestinationResolution): string => {
    switch (value.outcome) {
      case 'resolved': return (value satisfies DestinationResolvedResolution).finalUrl;
      case 'failed': return (value satisfies DestinationFailedResolution).reason;
      case 'unavailable': {
        const reason: DestinationTransportUnavailableReason | DestinationGuardUnavailableReason =
          (value satisfies DestinationUnavailableResolution).reason;
        return reason;
      }
      case 'canceled': return (value satisfies DestinationCanceledResolution).reason;
      default: return value satisfies never;
    }
  };

  // The verifier store: a snapshot narrows on its state, and every state is handled.
  const verifierOptions: DestinationVerifierOptions = { transport: network, timeoutMs: 5000,
    maxHops: 3, maxConcurrent: 2, maxQueued: 16, maxEntries: 64, timers,
    reportError: failure => console.error(failure) };
  const verifier: DestinationVerifier = createDestinationVerifier(verifierOptions);
  const target: DestinationTarget = candidate;
  const unsubscribe = verifier.subscribe((change: DestinationChange) => {
    const cause: DestinationChangeCause = change.cause;
    void [cause, change.encodedUrl, change.previous.state];
  });
  const resolveOptions: DestinationResolveOptions = { signal };
  const snapshot: DestinationSnapshot = await verifier.resolve(target, resolveOptions);
  const snapshotBase: DestinationSnapshotBase = snapshot;
  const snapshotText = (value: DestinationSnapshot): string => {
    const state: DestinationState = value.state;
    switch (value.state) {
      case 'unverified': return (value satisfies DestinationUnverifiedSnapshot).requestUrl;
      case 'resolving': return `${state} ${(value satisfies DestinationResolvingSnapshot).attemptId}`;
      case 'resolved': return (value satisfies DestinationResolvedSnapshot).finalUrl;
      case 'failed': {
        const reason: DestinationFailureReason = (value satisfies DestinationFailedSnapshot).reason;
        return reason;
      }
      case 'canceled': {
        const reason: DestinationCancelReason = (value satisfies DestinationCanceledSnapshot).reason;
        return reason;
      }
      case 'unavailable': {
        const reason: DestinationUnavailableReason =
          (value satisfies DestinationUnavailableSnapshot).reason;
        return reason;
      }
      default: return value satisfies never;
    }
  };
  // @ts-expect-error finalUrl is null in every state but resolved: narrow before reading it
  snapshot.finalUrl.length;
  const reasons: DestinationReason[] = ['queue_full' satisfies DestinationVerifierUnavailableReason,
    'transport_unresponsive' satisfies DestinationGuardUnavailableReason, 'aborted'];

  // The selection binder and the endpoint wire types.
  const selectionOptions: DestinationSelectionOptions = { cancelOnDeselect: true,
    onChange: (view: DestinationSelectionView | null) => void view?.snapshot?.state };
  const selection: DestinationSelection = createDestinationSelection(verifier, selectionOptions);
  const view: DestinationSelectionView | null = selection.select(report.detections[0]);
  const wireRequest: DestinationWireRequest = { version: 1, url: request.url, maxHops: 10,
    timeoutMs: 9000 };
  const wireResponse: DestinationWireResponse = { version: 1, url: request.url, outcome: 'failed',
    reason: 'blocked_address', finalUrl: null, status: null, redirected: false, redirects: [],
    requestSent: false, provenance: 'network', detail: 'Address not allowed' };
  const wireError: DestinationWireError = { error: 'forbidden' };
  selection.destroy();
  unsubscribe();
  verifier.destroy();

  // A transport always names itself, and a fetch transport always states its scope.
  const { label: unnamedLabel, ...unnamed } = custom;
  // @ts-expect-error label is required on every transport
  const unlabeled: DestinationTransport = unnamed;
  // @ts-expect-error createFetchTransport has no default scope
  createFetchTransport({});
  // @ts-expect-error fixtureOrigin belongs to the fixture scope only
  createFetchTransport({ scope: 'network', fixtureOrigin: 'x' });
  void [init, reader, sentence, hopsLimit, fromPayload, requested, source, range, specialUse,
    fetchOptions, info, kinds, provenance, base, resolutionText, snapshotBase, snapshotText, reasons,
    view, wireRequest, wireResponse, wireError, unnamedLabel, unlabeled];
}

// Overlay, as camera-overlay.d.ts declares it: its projection, outline and readout helpers, its
// labels and constants, and createCameraOverlay with everyOverlayOption, which names every option
// at every depth it spells as an object (the runner lists any option it leaves out).
{
  const axis: ObjectPositionAxis = { fraction: 1, offset: -10 };
  const position: ObjectPosition = parseObjectPosition('right 10px center')
    ?? { x: axis, y: { fraction: 0.5, offset: 0 } };
  const fit: OverlayFit = 'cover';
  const view: OverlayView = { mediaWidth: 1280, mediaHeight: 720, viewWidth: 640, viewHeight: 480, fit,
    position, mirror: true };
  const rect: MediaRect = overlayMediaRect(view);
  const centre = projectOverlayPoint({ x: 0.5, y: 0.5 }, view);
  const projected: OverlayGeometry | null = track?.geometry
    ? projectOverlayGeometry(track.geometry, view, { minArea: 16 }) : null;
  const corners = [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }];
  const outlineOptions: OutlineOptions = { offset: 5.5, arm: 0.27, minArm: 6, maxArm: 23, radius: 4.2,
    miterLimit: 4 };
  const outline: QuadOutline = quadOutline(corners, outlineOptions);
  const cutout: string = quadRegion(corners, { margin: 9, radius: 6, miterLimit: 4 });
  const family: SymbologyFamily | null = symbologyFamily(detection.symbology);
  const segments: readonly TextSegment[] = segmentText(detection.content.text);
  const overrides: OverlayLabelOverrides = { states: { readNow: 'Read just now' },
    count: live => `${live} codes`, destination: { reasons: { timeout: 'No answer in time' } } };
  const sameOverrides: LabelOverrides<OverlayLabels> = overrides;
  const readout: DetectionReadout = describeDetection(detection, sameOverrides);
  const encoded: EncodedUrl | null = readout.url;
  const field: ReadoutField | undefined = readout.fields[0];
  const eci: ReadoutEci | undefined = readout.eci?.[0];
  const labels: Readonly<OverlayLabels> = DEFAULT_LABELS;
  const destinationLabels: OverlayDestinationLabels = labels.destination;
  const announcement: OverlayAnnouncement = { target: null, symbology: null, kind: null, state: null,
    preview: null };
  const palette: readonly string[] = TRACK_COLORS;
  const css: string = CAMERA_OVERLAY_CSS;
  const verifier = createDestinationVerifier({ transport: createFetchTransport({ scope: 'network' }) });
  const destinations: OverlayDestinations = verifier;
  const reason: OverlayDestinationReason = 'timeout';
  const everyOverlayOption: CameraOverlayOptions = {
    video, container: document.createElement('div'),
    mount: { rail: document.createElement('div'), readout: document.createElement('div') },
    styles: 'none', styleNonce: 'overlay-style',
    clock: { now: () => performance.now(), setTimeout: (callback, ms) => setTimeout(callback, ms),
      clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) },
    onSelect: (selected, result) => void [selected?.id, result?.id],
    onAction: (action: OverlayAction) => { if (action.type === 'open') action.preventDefault(); },
    onError: failure => console.error(failure),
    fit: 'auto', position: 'right 10px center', mirror: 'auto', scene: true,
    focus: 'all' satisfies OverlayFocus,
    effects: { dim: 0.85, blur: 24, wash: 0.25, glow: 1, dwellMs: 300, cooldownMs: 400 } satisfies OverlayEffects,
    markers: { offset: 5.5, arm: 0.27, minArm: 6, maxArm: 23, radius: 4.2, miterLimit: 4, cutoutMargin: 9,
      cutoutRadius: 6, hitSlop: 12, segment: 'line', partial: 'points', edgeHints: true } satisfies OverlayMarkers,
    colors: 'track', motion: 'reduce', rail: 'always' satisfies OverlayRail, retained: true, readout: true,
    actions: { open: true, copy: true, check: true } satisfies OverlayActions,
    thumbnails: { size: 48, refreshMs: 1000 } satisfies OverlayThumbnails,
    destinations, destinationSlot: true, announceContent: 'preview', labels: overrides, lang: 'en',
    scheme: 'dark',
  };
  const settings: CameraOverlaySettings = { focus: 'selected', rail: 'never', thumbnails: false };
  const configured: CameraOverlay = createCameraOverlay(everyOverlayOption);
  configured.setOptions(settings);
  configured.update(tracker.update(report.detections, frame));
  // @ts-expect-error update takes the tracker's snapshot, never an array of detections
  configured.update([]);
  const imageFrame: FrameImageFrame = { width: 640, height: 480, observedAt: performance.now(), epoch: 1,
    sequence: 1 };
  const image: FrameImage = new ImageData(640, 480);
  if (configured.wantsFrameImage()) configured.setFrameImage(image, imageFrame);
  const inspection: OverlayInspection = configured.inspect();
  const inspected: OverlayTargetInspection | undefined = inspection.targets[0];
  const alignment: OverlayAlignment = configured.alignment;
  const chosen: [Track | null, boolean] = [configured.selected, configured.select(null)];
  configured.clear();
  configured.layout();
  void [rect, centre, projected, outline, cutout, family, segments, encoded, field, eci,
    destinationLabels, labels.announce(announcement), labels.count(2), palette, css, reason, inspected,
    alignment, chosen, configured.selectedResult, configured.detection, configured.selectionMode,
    configured.destroyed];
  configured.destroy();
  verifier.destroy();
}
