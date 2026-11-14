<?php

// SPDX-License-Identifier: MIT

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Exception;

/** qrscan did not end within the time this package allows; the process was stopped. */
final class ScanTimedOut extends ScannerException
{
}
