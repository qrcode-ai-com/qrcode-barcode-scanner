// Remove what a build writes, so that a production build starts from nothing.
import { rmSync } from 'node:fs';

for (const path of ['lib', 'tsconfig.tsbuildinfo', 'jupyterlab_qrcode_barcode_scanner/labextension',
  'jupyterlab_qrcode_barcode_scanner/_version.py', 'licenses']) {
  rmSync(new URL(`../${path}`, import.meta.url), { recursive: true, force: true });
}
