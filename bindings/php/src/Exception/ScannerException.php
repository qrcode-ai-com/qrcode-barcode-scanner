<?php

// SPDX-License-Identifier: MIT

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Exception;

/** Every failure of this package. A scan that finds no code is not a failure. */
class ScannerException extends \RuntimeException
{
}
