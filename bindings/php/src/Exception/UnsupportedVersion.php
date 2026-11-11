<?php

// SPDX-License-Identifier: AGPL-3.0-or-later

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Exception;

/** The installed qrscan is not a version this package was checked against. */
final class UnsupportedVersion extends ScannerException
{
}
