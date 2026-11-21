// The manifest of each store package, from one description. Chrome and Edge run the background
// as a service worker; Firefox runs the same file as an event page and needs its add-on ID and
// its data-collection declaration.

export const TARGETS = ['chrome', 'edge', 'firefox'];

export const NAME = 'QR Code & Barcode Scanner';
export const DESCRIPTION = 'Read QR codes and barcodes from images on web pages or on your '
  + 'computer. Decoding runs in your browser and no image is uploaded.';
export const HOMEPAGE =
  'https://qrcode-ai.com/en-US/qr-code-scanner/integrations/browser-extension';
export const GECKO_ID = 'qrcode-barcode-scanner@qrcode-ai.com';

// Compiling WebAssembly needs 'wasm-unsafe-eval'. Scripts come from the package only ('self').
export const CSP = "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'";

// contextMenus: the "Scan this image" item. activeTab: after that click, the extension may read
// the image again from the site of the page it was clicked on. Images from other sites need
// that site's permission, asked for on a click in the scanner page only: an optional
// permission, never granted at install.
export const PERMISSIONS = ['contextMenus', 'activeTab'];
export const OPTIONAL_HOST_PERMISSIONS = ['https://*/*', 'http://*/*'];

function icons(sizes) {
  return Object.fromEntries(sizes.map((size) => [String(size), `icons/icon-${size}.png`]));
}

export function manifestFor(target, version) {
  if (!TARGETS.includes(target)) throw new Error(`unknown target ${target}`);
  const manifest = {
    manifest_version: 3,
    name: NAME,
    version,
    description: DESCRIPTION,
    homepage_url: HOMEPAGE,
    icons: icons([16, 32, 48, 128]),
    action: {
      default_title: 'Scan a QR code or barcode image',
      default_popup: 'scanner.html?view=popup',
      default_icon: icons([16, 32]),
    },
    permissions: PERMISSIONS,
    optional_host_permissions: OPTIONAL_HOST_PERMISSIONS,
    content_security_policy: { extension_pages: CSP },
  };
  if (target === 'firefox') {
    manifest.icons = icons([48, 96, 128]);
    manifest.background = { scripts: ['background.js'] };
    manifest.browser_specific_settings = {
      gecko: {
        id: GECKO_ID,
        // Desktop Firefox reads data_collection_permissions from 140 and Firefox for Android
        // from 142. 142 keeps `web-ext lint` free of warnings; the supported releases (160, and
        // ESR 153) are above both. Without a gecko_android key the add-on is offered on desktop
        // only.
        strict_min_version: '142.0',
        data_collection_permissions: { required: ['none'] },
      },
    };
  } else {
    manifest.background = { service_worker: 'background.js' };
    // 'wasm-unsafe-eval' in a Manifest V3 extension policy needs Chrome 103.
    manifest.minimum_chrome_version = '103';
  }
  return manifest;
}
