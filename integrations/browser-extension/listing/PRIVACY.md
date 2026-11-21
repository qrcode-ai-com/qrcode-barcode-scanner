# Privacy · QR Code & Barcode Scanner browser extension

QR Code & Barcode Scanner reads QR codes and barcodes inside your browser. It does not collect,
store remotely, sell or share any data. It has no account, no analytics, no advertising and no
server of its own.

## What the extension reads

- **An image you drop, paste or choose.** The extension reads it in the browser and keeps it in
  the page's memory until you close the page. The image is not saved and not sent anywhere.
- **An image you right-click and scan.** The extension fetches that one image again from the
  address the page already loaded it from, so that it can read its bytes. This is the only
  network request it makes. It goes to the image's own site, never to QR Code AI or anyone
  else. It is sent first without cookies; if the site refuses, it is sent again with the site's
  own cookies, as the page itself sent them when it showed the image.
- **The decoded text.** It is shown on the scanner page and copied to the clipboard only when
  you click a copy button. A decoded link is never opened for you.

## What the extension stores

Only the scanner profile you last chose (fast, frame or full), in the extension's local storage.
Removing the extension removes it.

## Permissions

- `contextMenus` adds "Scan this image" to the right-click menu of images.
- `activeTab` lets the extension fetch the image you clicked from the page's site, for that tab
  and at that moment only.
- Access to another site is never granted at install. When an image comes from a site that does
  not let other sites read it, the scanner page shows an "Allow" button for that one site. The
  browser then asks you to confirm. You can remove that access at any time in the browser's
  extension settings.

## Code

The scanner engine is a WebAssembly module packaged inside the extension. The extension loads
no code from the network. Its source is public:
<https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/tree/main/integrations/browser-extension>.

## Contact

QR Code AI, a product of SuperNovae Studio: <https://qrcode-ai.com/>. Questions and reports:
<https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/issues>.

Effective 20 November 2026, for version 0.1.0.
