// SPDX-License-Identifier: MIT
import { createPiece, PieceAuth } from '@activepieces/pieces-framework';
import { scanImageAction } from './lib/actions/scan-image';

export const qrcodeBarcodeScanner = createPiece({
  displayName: 'QR Code & Barcode Scanner',
  description: 'Read QR codes and barcodes in images with the open-source QR Code AI engine, on your own worker.',
  auth: PieceAuth.None(),
  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/integrations/activepieces/logo.svg',
  authors: ['qrcode-ai-com'],
  actions: [scanImageAction],
  triggers: [],
});
