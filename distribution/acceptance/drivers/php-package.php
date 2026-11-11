<?php

// Destination acceptance, PHP package: scan one image with the three profiles through the
// installed package and write one JSON report per profile, for
// `scripts/destination-acceptance.py reports` to judge.
//
//   php php-package.php IMAGE OUT_DIR [QRSCAN]
//
// Run it from the project that installed the package: the autoloader is read from the current
// directory, not from this file's. QRSCAN is the installed command, `qrscan` on PATH by default.
// Each file is the text the command printed, unchanged. This program judges nothing.

declare(strict_types=1);

[$image, $out, $binary] = array_slice($argv, 1) + [null, null, 'qrscan'];
if ($image === null || $out === null) {
    fwrite(STDERR, "usage: php php-package.php IMAGE OUT_DIR [QRSCAN]\n");
    exit(2);
}
require getcwd() . '/vendor/autoload.php';

use QrcodeAi\BarcodeScanner\Profile;
use QrcodeAi\BarcodeScanner\Scanner;

if (!is_dir($out) && !mkdir($out, 0o777, true)) {
    fwrite(STDERR, "cannot create $out\n");
    exit(1);
}
$scanner = new Scanner($binary);
foreach ([Profile::Fast, Profile::Frame, Profile::Full] as $profile) {
    $report = $scanner->scan($image, $profile, 0);
    file_put_contents($out . '/' . $profile->value . '.json', $report->json);
    echo $profile->value, ' ', implode(' ', array_map(
        static fn (array $row): string => $row['symbology'] . ':' . $row['content']['text'],
        $report->detections(),
    )), "\n";
}
