<?php

// SPDX-License-Identifier: AGPL-3.0-or-later

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Exception;

/** The qrscan command could not be started: it is not installed, not on PATH or not executable. */
final class BinaryNotFound extends ScannerException
{
}
