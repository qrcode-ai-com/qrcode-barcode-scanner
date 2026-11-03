// Server rendering: import the camera, overlay and destination modules on a server, as a page
// rendered there would, and call the helpers that work without a browser. The DOM, camera and
// network globals listed in TRAPPED are replaced first by traps that record each read, so the
// run shows that none of them is reached; other globals stay as Node defines them, and the
// last line printed covers the trapped ones only. Run it with Node from the package folder
// (node examples/ssr.mjs) or copy it into a project that installed the package: it imports the
// package by name.
const TRAPPED = [
  // The DOM and rendering.
  'window', 'self', 'document', 'location', 'customElements', 'Node', 'Element', 'HTMLElement',
  'HTMLVideoElement', 'HTMLCanvasElement', 'CSSStyleSheet', 'getComputedStyle', 'matchMedia',
  'requestAnimationFrame', 'ResizeObserver', 'MutationObserver', 'IntersectionObserver', 'Image',
  'ImageData', 'OffscreenCanvas', 'createImageBitmap', 'localStorage', 'sessionStorage',
  // The camera.
  'navigator', 'MediaStream', 'MediaStreamTrack', 'ImageCapture',
  // The network, and workers that could reach it.
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'RTCPeerConnection', 'Worker',
  'SharedWorker',
];
const reads = [];
for (const name of TRAPPED) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      reads.push(name);
      return undefined;
    },
  });
}

const camera = await import('@supernovae-st/qrcode-ai-scanner-wasm/camera');
const overlay = await import('@supernovae-st/qrcode-ai-scanner-wasm/camera-overlay');
const destination = await import('@supernovae-st/qrcode-ai-scanner-wasm/destination');
const lines = ['Imported ./camera, ./camera-overlay and ./destination.'];

// Eligibility, as a server would decide whether to render a Check destination control. A check
// requests the URL without its fragment; plain text is never a link.
const link = destination.destinationCandidate('https://example.com/menu#top');
lines.push(`destinationCandidate('https://example.com/menu#top'): eligible ${link.eligible}, ` +
  `request URL ${link.requestUrl}`);
const text = destination.destinationCandidate('call me');
lines.push(`destinationCandidate('call me'): eligible ${text.eligible}, reason ${text.reason}`);
// A verifier without a transport offers no check, and resolve() sends nothing.
const verifier = destination.createDestinationVerifier({ transport: null });
const settled = await verifier.resolve('https://example.com/');
lines.push(`Verifier without a transport: canResolve ${verifier.canResolve}, resolve() ` +
  `${settled.state} (${settled.reason})`);
verifier.destroy();
// Labels and the symbology family are plain data, for markup rendered on the server.
lines.push(`Default destination label: ${overlay.DEFAULT_LABELS.destination.unverified}`);
lines.push(`symbologyFamily('qr_code'): ${overlay.symbologyFamily('qr_code')}`);
// A tracker created without onChange arms no timer; its snapshot is a pure read.
const tracker = camera.createDetectionTracker();
const snapshot = tracker.snapshot();
lines.push(`Detection tracker: ${snapshot.tracks.length} tracks, status ${snapshot.status}`);
tracker.destroy();

const unique = reads.filter((name, index) => reads.indexOf(name) === index);
lines.push(`Trapped globals read: ${unique.length === 0 ? 'none' : unique.join(', ')}`);
console.log(lines.join('\n'));
