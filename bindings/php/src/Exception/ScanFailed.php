<?php

// SPDX-License-Identifier: AGPL-3.0-or-later

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Exception;

/**
 * qrscan refused the input or the options, or its output could not be read.
 * `engineCode` is the engine's own code, such as `QRS-001` for a file that is not an image,
 * when the message carries one.
 */
final class ScanFailed extends ScannerException
{
    public function __construct(
        string $message,
        public readonly int $exitCode,
        public readonly ?string $engineCode = null,
    ) {
        parent::__construct($message);
    }
}
