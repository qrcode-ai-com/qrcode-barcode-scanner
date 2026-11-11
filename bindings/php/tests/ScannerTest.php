<?php

// SPDX-License-Identifier: AGPL-3.0-or-later

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use QrcodeAi\BarcodeScanner\Exception\BinaryNotFound;
use QrcodeAi\BarcodeScanner\Exception\ScanFailed;
use QrcodeAi\BarcodeScanner\Exception\ScanTimedOut;
use QrcodeAi\BarcodeScanner\Exception\UnsupportedVersion;
use QrcodeAi\BarcodeScanner\Profile;
use QrcodeAi\BarcodeScanner\Scanner;

/**
 * Runs against a real installed qrscan: QRSCAN_BINARY names it and QRSCAN_FIXTURES is the
 * `fixtures` directory of the engine repository. Nothing here is simulated except the two
 * stand-in commands of the version and timeout cases.
 */
final class ScannerTest extends TestCase
{
    private const QR = 'https://qrc-ai.com/76xMa';
    private const CODE128 = 'STOCK-4827';

    private static string $binary;
    private static string $mixed;
    private static string $clean;
    private static string $work;

    public static function setUpBeforeClass(): void
    {
        $binary = getenv('QRSCAN_BINARY');
        $fixtures = getenv('QRSCAN_FIXTURES');
        self::assertNotFalse($binary, 'Set QRSCAN_BINARY to the installed qrscan.');
        self::assertNotFalse($fixtures, 'Set QRSCAN_FIXTURES to the fixtures directory of the engine repository.');
        self::$binary = $binary;
        self::$mixed = $fixtures . '/symbology/mixed-code128-qr.png';
        self::$clean = $fixtures . '/clean/gen_v5_q.png';
        self::assertFileExists(self::$mixed);
        self::assertFileExists(self::$clean);
        self::$work = sys_get_temp_dir() . '/qrscan-php-' . bin2hex(random_bytes(6));
        mkdir(self::$work);
    }

    public static function tearDownAfterClass(): void
    {
        foreach (scandir(self::$work) ?: [] as $name) {
            if (is_file(self::$work . '/' . $name)) {
                unlink(self::$work . '/' . $name);
            }
        }
        rmdir(self::$work);
    }

    /** @return array<string, array{Profile}> */
    public static function profiles(): array
    {
        return ['fast' => [Profile::Fast], 'frame' => [Profile::Frame], 'full' => [Profile::Full]];
    }

    #[DataProvider('profiles')]
    public function testMixedImageReturnsBothCodesExactly(Profile $profile): void
    {
        $report = (new Scanner(self::$binary))->scan(self::$mixed, $profile, 0);

        self::assertSame(0, $report->exitCode);
        self::assertTrue($report->found());
        self::assertTrue($report->isComplete());
        self::assertSame('0.11.0', $report->engineVersion());
        $bySymbology = [];
        foreach ($report->detections() as $index => $row) {
            $bySymbology[$row['symbology']] = [$report->texts()[$index], $report->rawPayloads()[$index]];
        }
        ksort($bySymbology);
        self::assertSame(
            ['code128' => [self::CODE128, self::CODE128], 'qr_code' => [self::QR, self::QR]],
            $bySymbology,
            'each code once, with its exact text and its exact bytes, and nothing else',
        );
        if ($profile === Profile::Frame) {
            self::assertNull($report->score(), 'the frame profile never judges');
        }
        if ($profile === Profile::Full) {
            self::assertIsArray($report->score());
            self::assertIsInt($report->score()['value']);
        }
    }

    public function testFullProfileJudgesACleanCode(): void
    {
        $report = (new Scanner(self::$binary))->scan(self::$clean, Profile::Full, 0);

        self::assertSame(['https://qrcode-ai.com/c/v5q'], $report->texts());
        self::assertSame(100, $report->score()['value']);
        self::assertSame(['scanner' => '0.11.0', 'pipeline' => 5, 'score_contract' => 5], $report->data['versions']);
    }

    public function testTheReportIsTheEnginesOwnJson(): void
    {
        $report = (new Scanner(self::$binary))->scan(self::$mixed, Profile::Frame, 0);
        $direct = self::runDirectly(['--profile', 'frame', '--budget-ms', '0', '--', self::$mixed]);

        $untimed = static function (array $data): array {
            $data['trace']['total_ms'] = 0;
            foreach ($data['trace']['stages'] as &$stage) {
                $stage['ms'] = 0;
            }
            return $data;
        };
        self::assertSame($untimed($direct), $untimed($report->data), 'nothing is renamed, dropped or recalculated');
        self::assertSame($report->data, json_decode($report->json, true, 512, \JSON_THROW_ON_ERROR), 'the text is the report that was decoded');
        self::assertStringStartsWith('{', $report->json);
    }

    public function testAnImageWithNoCodeIsAResultNotAnError(): void
    {
        $white = self::$work . '/white.png';
        // A 64 by 64 white PNG.
        $image = "\x89PNG\r\n\x1a\n" . self::chunk('IHDR', pack('NNCCCCC', 64, 64, 8, 0, 0, 0, 0))
            . self::chunk('IDAT', gzcompress(str_repeat("\x00" . str_repeat("\xFF", 64), 64)))
            . self::chunk('IEND', '');
        file_put_contents($white, $image);

        $report = (new Scanner(self::$binary))->scan($white, Profile::Full, 0);

        self::assertSame(1, $report->exitCode);
        self::assertFalse($report->found());
        self::assertSame([], $report->detections());
        self::assertNull($report->score());
        self::assertTrue($report->isComplete());
    }

    /** @return array<string, array{string}> */
    public static function awkwardNames(): array
    {
        return [
            'spaces' => ['label with spaces.png'],
            'quotes' => ['it\'s "quoted".png'],
            'leading dash' => ['-profile.png'],
            'double dash' => ['--budget-ms.png'],
            'shell characters' => ['$(touch pwned);`id`&|.png'],
            'accents' => ['étiquette-café.png'],
        ];
    }

    #[DataProvider('awkwardNames')]
    public function testAFileNameIsNeverInterpreted(string $name): void
    {
        if (\PHP_OS_FAMILY === 'Windows' && preg_match('/["|]/', $name) === 1) {
            self::markTestSkipped('Windows file names cannot hold these characters.');
        }
        $path = self::$work . '/' . $name;
        copy(self::$mixed, $path);

        $report = (new Scanner(self::$binary))->scan($path, Profile::Frame, 0);

        $texts = $report->texts();
        sort($texts);
        self::assertSame([self::CODE128, self::QR], $texts);
        self::assertFileDoesNotExist(self::$work . '/pwned');
        self::assertFileDoesNotExist('pwned');
    }

    /** @return array<string, array{string}> */
    public static function namesThatLookLikeOptions(): array
    {
        return ['one dash' => ['-profile.png'], 'two dashes' => ['--capabilities'], 'an option and its value' => ['--budget-ms=1.png']];
    }

    #[DataProvider('namesThatLookLikeOptions')]
    public function testARelativeNameThatLooksLikeAnOptionIsStillAFile(string $name): void
    {
        copy(self::$mixed, self::$work . '/' . $name);
        $before = getcwd();
        chdir(self::$work);
        try {
            // A relative name reaches the command as written: only the separator keeps it a file.
            $report = (new Scanner(self::$binary))->scan($name, Profile::Frame, 0);
        } finally {
            chdir($before);
        }

        $texts = $report->texts();
        sort($texts);
        self::assertSame([self::CODE128, self::QR], $texts);
    }

    public function testAFileThatIsNotAnImageFailsWithTheEnginesCode(): void
    {
        $path = self::$work . '/notes.png';
        file_put_contents($path, 'not an image');

        try {
            (new Scanner(self::$binary))->scan($path);
            self::fail('a file that is not an image must be refused');
        } catch (ScanFailed $failure) {
            self::assertSame(2, $failure->exitCode);
            self::assertSame('QRS-001', $failure->engineCode);
            self::assertStringNotContainsString("\n", $failure->getMessage());
        }
    }

    public function testAMissingFileFails(): void
    {
        try {
            (new Scanner(self::$binary))->scan(self::$work . '/nothing-here.png');
            self::fail('a missing file must be refused');
        } catch (ScanFailed $failure) {
            self::assertSame(2, $failure->exitCode);
            self::assertNull($failure->engineCode);
        }
    }

    public function testAMissingCommandIsReported(): void
    {
        $this->expectException(BinaryNotFound::class);
        (new Scanner(self::$work . '/no-such-qrscan'))->scan(self::$mixed);
    }

    public function testCapabilitiesNameTheInstalledEngine(): void
    {
        $scanner = new Scanner(self::$binary);

        self::assertSame('0.11.0', $scanner->engineVersion());
        self::assertContains('qr_code', $scanner->capabilities()['symbologies']);
        self::assertContains('code128', $scanner->capabilities()['symbologies']);
    }

    public function testAnotherEngineLineIsRefusedBeforeAnyScan(): void
    {
        $old = self::standIn('old-qrscan', 'printf \'{"versions":{"scanner":"0.9.0","pipeline":4,"score_contract":4},"engines":[],"symbologies":[]}\'');

        try {
            (new Scanner($old))->scan(self::$mixed);
            self::fail('an engine outside the supported line must be refused');
        } catch (UnsupportedVersion $refusal) {
            self::assertStringContainsString('0.9.0', $refusal->getMessage());
            self::assertStringContainsString(Scanner::SUPPORTED_ENGINE, $refusal->getMessage());
        }
    }

    public function testACommandWithoutCapabilitiesIsRefused(): void
    {
        $this->expectException(UnsupportedVersion::class);
        (new Scanner(self::standIn('ancient-qrscan', 'echo "error: unexpected argument" >&2; exit 2')))->scan(self::$mixed);
    }

    public function testACommandThatHangsIsStopped(): void
    {
        $slow = self::standIn('slow-qrscan', 'sleep 30');
        $started = microtime(true);

        try {
            (new Scanner($slow, 0.5))->capabilities();
            self::fail('a command that does not end must be stopped');
        } catch (ScanTimedOut) {
            self::assertLessThan(5.0, microtime(true) - $started, 'the wait ends near the timeout, not after the command');
        }
    }

    public function testArgumentsAreChecked(): void
    {
        foreach ([
            static fn () => new Scanner(''),
            static fn () => new Scanner(self::$binary, 0.0),
            static fn () => (new Scanner(self::$binary))->scan(''),
            static fn () => (new Scanner(self::$binary))->scan(self::$mixed, Profile::Fast, -1),
        ] as $call) {
            try {
                $call();
                self::fail('an invalid argument must be refused');
            } catch (\InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    /** A stand-in command for the cases a real qrscan cannot produce. POSIX shells only. */
    private static function standIn(string $name, string $body): string
    {
        if (\PHP_OS_FAMILY === 'Windows') {
            self::markTestSkipped('The stand-in command is a shell script.');
        }
        $path = self::$work . '/' . $name;
        file_put_contents($path, "#!/bin/sh\n" . $body . "\n");
        chmod($path, 0o755);
        return $path;
    }

    /**
     * @param list<string> $arguments
     *
     * @return array<string, mixed>
     */
    private static function runDirectly(array $arguments): array
    {
        $process = proc_open([self::$binary, ...$arguments], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        $stdout = stream_get_contents($pipes[1]);
        proc_close($process);
        return json_decode((string) $stdout, true, 512, \JSON_THROW_ON_ERROR);
    }

    private static function chunk(string $type, string $data): string
    {
        return pack('N', \strlen($data)) . $type . $data . pack('N', crc32($type . $data));
    }
}
