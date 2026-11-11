<?php

// SPDX-License-Identifier: AGPL-3.0-or-later

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Exception;

/** This PHP cannot start a process: proc_open is missing or disabled by the host. */
final class ProcessUnavailable extends ScannerException
{
}
