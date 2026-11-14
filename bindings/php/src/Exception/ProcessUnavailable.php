<?php

// SPDX-License-Identifier: MIT

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Exception;

/** This PHP cannot start a process: proc_open is missing or disabled by the host. */
final class ProcessUnavailable extends ScannerException
{
}
