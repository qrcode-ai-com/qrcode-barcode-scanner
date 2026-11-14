<?php

// SPDX-License-Identifier: MIT

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Exception;

/** The installed qrscan is not a version this package was checked against. */
final class UnsupportedVersion extends ScannerException
{
}
