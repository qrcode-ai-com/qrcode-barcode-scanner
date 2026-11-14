<?php

// SPDX-License-Identifier: MIT

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner;

/** How much work one scan does. The values are the ones `qrscan --profile` takes. */
enum Profile: string
{
    /** Decode and judge the scannability of a QR code. The slowest and the default of the engine. */
    case Full = 'full';
    /** Decode first, with a reduced judgment. */
    case Fast = 'fast';
    /** Decode only: the report carries no score. */
    case Frame = 'frame';
}
