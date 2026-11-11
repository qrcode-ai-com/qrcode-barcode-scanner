<?php

// SPDX-License-Identifier: AGPL-3.0-or-later

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner;

use QrcodeAi\BarcodeScanner\Exception\BinaryNotFound;
use QrcodeAi\BarcodeScanner\Exception\ProcessUnavailable;
use QrcodeAi\BarcodeScanner\Exception\ScanFailed;
use QrcodeAi\BarcodeScanner\Exception\ScannerException;
use QrcodeAi\BarcodeScanner\Exception\ScanTimedOut;
use QrcodeAi\BarcodeScanner\Exception\UnsupportedVersion;

/**
 * Reads QR codes and barcodes from an image file through the installed `qrscan` command.
 *
 * This package holds no decoder. It starts the command of the QR Code & Barcode Scanner engine,
 * which you install separately, and returns its JSON report unchanged. One scan is one process.
 * The command is started without a shell, from a list of arguments: a file name is never
 * interpreted, whatever characters it holds.
 */
final class Scanner
{
    /** The engine line this package was checked against: every 0.11.x. */
    public const SUPPORTED_ENGINE = '0.11';

    /** @var array<string, mixed>|null what `qrscan --capabilities` answered, read once */
    private ?array $capabilities = null;

    /**
     * @param string $binary the command to start: a name looked up on PATH, or a path
     * @param float $timeoutSeconds how long one start of the command may last before it is stopped
     */
    public function __construct(
        private readonly string $binary = 'qrscan',
        private readonly float $timeoutSeconds = 60.0,
    ) {
        if ($binary === '' || str_contains($binary, "\0")) {
            throw new \InvalidArgumentException('The qrscan command must be a name or a path.');
        }
        if (!($timeoutSeconds > 0)) {
            throw new \InvalidArgumentException('The timeout must be a positive number of seconds.');
        }
    }

    /**
     * Scan one image file.
     *
     * @param string $imagePath a PNG, JPEG, WebP or GIF file
     * @param Profile $profile frame decodes only, fast decodes first, full also judges a QR code
     * @param int|null $budgetMs the engine's time budget in milliseconds; 0 is unbounded and
     *                           reproducible; null keeps the profile's own budget
     *
     * @throws ScanFailed when the engine refuses the file or the options
     * @throws ScannerException for every other failure of this package
     */
    public function scan(string $imagePath, Profile $profile = Profile::Full, ?int $budgetMs = null): Report
    {
        if ($imagePath === '' || str_contains($imagePath, "\0")) {
            throw new \InvalidArgumentException('The image path must be a file path.');
        }
        if ($budgetMs !== null && $budgetMs < 0) {
            throw new \InvalidArgumentException('The budget must be zero or a positive number of milliseconds.');
        }
        $this->requireSupportedEngine();
        $arguments = ['--profile', $profile->value];
        if ($budgetMs !== null) {
            array_push($arguments, '--budget-ms', (string) $budgetMs);
        }
        // After `--` the command reads a file name, even one that starts with a dash.
        array_push($arguments, '--', $imagePath);
        [$exit, $stdout, $stderr] = $this->run($arguments);
        if ($exit !== 0 && $exit !== 1) {
            throw self::failure($exit, $stderr);
        }
        return new Report(self::decode($stdout, $exit), $exit, $stdout);
    }

    /**
     * What the installed command can read: its versions, decode engines and symbologies.
     *
     * @return array<string, mixed>
     */
    public function capabilities(): array
    {
        if ($this->capabilities === null) {
            [$exit, $stdout, $stderr] = $this->run(['--capabilities']);
            if ($exit !== 0) {
                throw new UnsupportedVersion(
                    'The installed qrscan does not answer --capabilities. Version ' . self::SUPPORTED_ENGINE
                    . '.x is required. ' . self::firstLine($stderr),
                );
            }
            $this->capabilities = self::decode($stdout, $exit);
        }
        return $this->capabilities;
    }

    /** The version of the installed engine, such as `0.11.0`. */
    public function engineVersion(): string
    {
        return (string) ($this->capabilities()['versions']['scanner'] ?? '');
    }

    private function requireSupportedEngine(): void
    {
        $version = $this->engineVersion();
        if (!str_starts_with($version, self::SUPPORTED_ENGINE . '.')) {
            throw new UnsupportedVersion(sprintf(
                'The installed qrscan is version %s. This package supports %s.x.',
                $version === '' ? 'unknown' : $version,
                self::SUPPORTED_ENGINE,
            ));
        }
    }

    /**
     * Start the command with these arguments and wait for it.
     *
     * @param list<string> $arguments
     *
     * @return array{int, string, string} exit code, standard output, standard error
     */
    private function run(array $arguments): array
    {
        if (!\function_exists('proc_open')) {
            throw new ProcessUnavailable('This PHP cannot start a process: proc_open is disabled.');
        }
        $pipes = [];
        // A list, not a string: PHP starts the program directly, with no shell in between.
        $process = @proc_open(
            [$this->binary, ...$arguments],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            null,
            null,
            ['bypass_shell' => true],
        );
        if (!\is_resource($process)) {
            throw new BinaryNotFound(sprintf('The command %s could not be started. Install qrscan or pass its path.', $this->binary));
        }
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $output = [1 => '', 2 => ''];
        $open = [1 => $pipes[1], 2 => $pipes[2]];
        $deadline = microtime(true) + $this->timeoutSeconds;
        try {
            while ($open !== []) {
                $remaining = $deadline - microtime(true);
                if ($remaining <= 0) {
                    throw new ScanTimedOut(sprintf('qrscan did not end within %s seconds and was stopped.', $this->timeoutSeconds));
                }
                $read = array_values($open);
                $write = $except = null;
                $wait = min($remaining, 0.2);
                $ready = @stream_select($read, $write, $except, (int) $wait, (int) (($wait - (int) $wait) * 1_000_000));
                if ($ready === false) {
                    // Pipes of a process cannot be selected on some hosts: poll them.
                    usleep(10_000);
                    $read = array_values($open);
                }
                foreach ($read as $stream) {
                    $index = array_search($stream, $open, true);
                    $chunk = fread($stream, 65536);
                    if ($chunk !== false && $chunk !== '') {
                        $output[$index] .= $chunk;
                    }
                    if (feof($stream)) {
                        fclose($stream);
                        unset($open[$index]);
                    }
                }
            }
            do {
                $status = proc_get_status($process);
                if ($status['running'] && microtime(true) > $deadline) {
                    throw new ScanTimedOut(sprintf('qrscan did not end within %s seconds and was stopped.', $this->timeoutSeconds));
                }
                if ($status['running']) {
                    usleep(2_000);
                }
            } while ($status['running']);
        } catch (ScanTimedOut $timeout) {
            foreach ($open as $stream) {
                fclose($stream);
            }
            proc_terminate($process, 9);
            proc_close($process);
            throw $timeout;
        }
        $exit = $status['exitcode'];
        proc_close($process);
        // A program the system could not run ends with 127 from the launcher on some hosts.
        if ($exit === 127 && $output[1] === '') {
            throw new BinaryNotFound(sprintf('The command %s could not be started. Install qrscan or pass its path.', $this->binary));
        }
        return [$exit, $output[1], $output[2]];
    }

    /**
     * @return array<string, mixed>
     */
    private static function decode(string $stdout, int $exit): array
    {
        try {
            $data = json_decode($stdout, true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException $error) {
            throw new ScanFailed('qrscan did not print a JSON report: ' . $error->getMessage(), $exit);
        }
        if (!\is_array($data) || array_is_list($data)) {
            throw new ScanFailed('qrscan did not print a JSON report.', $exit);
        }
        return $data;
    }

    private static function failure(int $exit, string $stderr): ScanFailed
    {
        $engineCode = preg_match('/\[(QRS-\d{3})\]/', $stderr, $match) === 1 ? $match[1] : null;
        return new ScanFailed('qrscan refused the scan: ' . self::firstLine($stderr), $exit, $engineCode);
    }

    /** One printable line of the command's message, without its marker. */
    private static function firstLine(string $text): string
    {
        $line = trim(strtok(trim($text), "\n") ?: '');
        $line = preg_replace(['/[\x00-\x1F\x7F]/', '/^✖\s*/u'], [' ', ''], $line) ?? '';
        return substr($line, 0, 300);
    }
}
