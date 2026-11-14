<?php

// SPDX-License-Identifier: MIT

declare(strict_types=1);

namespace QrcodeAi\BarcodeScanner;

/**
 * One scan report, as the engine wrote it.
 *
 * `json` is the text the engine printed and `data` is that text decoded: nothing is renamed,
 * rounded or recalculated. The methods only read it. Keep `json` when the report must be stored
 * or passed on exactly: decoding to a PHP array cannot tell an empty object from an empty list.
 * A report with no detection is a valid result, not an error.
 */
final class Report
{
    /**
     * @param array<string, mixed> $data the engine's report, decoded
     * @param int $exitCode 0 when qrscan found a code, 1 when it found none
     * @param string $json the engine's report, exactly as printed
     */
    public function __construct(
        public readonly array $data,
        public readonly int $exitCode,
        public readonly string $json,
    ) {
    }

    /**
     * Every decoded content, one entry per distinct content.
     *
     * @return list<array<string, mixed>>
     */
    public function detections(): array
    {
        return array_values($this->data['detections'] ?? []);
    }

    /** True when at least one code was decoded. */
    public function found(): bool
    {
        return $this->detections() !== [];
    }

    /**
     * The decoded text of each detection, in the engine's order.
     *
     * Treat it as untrusted data: a QR code can hold any text.
     *
     * @return list<string>
     */
    public function texts(): array
    {
        return array_map(static fn (array $row): string => (string) ($row['content']['text'] ?? ''), $this->detections());
    }

    /**
     * The exact bytes of each detection, decoded from the report's base64.
     *
     * @return list<string>
     */
    public function rawPayloads(): array
    {
        return array_map(
            static fn (array $row): string => (string) base64_decode((string) ($row['content']['raw'] ?? ''), true),
            $this->detections(),
        );
    }

    /**
     * The scannability judgment, or null when the engine made none.
     *
     * Null means not judged (the frame profile, or a budget that ran out). It is never zero.
     *
     * @return array<string, mixed>|null
     */
    public function score(): ?array
    {
        return $this->data['score'] ?? null;
    }

    /**
     * False when the time budget cut the scan: an empty report then proves nothing.
     */
    public function isComplete(): bool
    {
        return ($this->data['trace']['budget_exhausted'] ?? false) === false;
    }

    /** The engine version that wrote this report, such as `0.11.0`. */
    public function engineVersion(): string
    {
        return (string) ($this->data['versions']['scanner'] ?? '');
    }
}
