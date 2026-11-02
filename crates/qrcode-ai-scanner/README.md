# qrcode-ai-scanner

QR decoding + scannability scoring for **artistic, AI-generated, and
photo-captured** QR codes. Deterministic multi-engine ladder (rxing + rqrr),
score contract v5 (six survival-ramp stress axes incl. perspective/rotation/
lighting, finder-integrity + quiet-zone caps), and the **synthetic UEC** —
the ISO 15415 unused-error-correction margin computed from the verified
stream the decoder read. Exact content: for the QR family `content.raw` is
the payload's original bytes (other symbologies: the decoding engine's
reading, ISO/IEC 8859-1 when every character fits, else UTF-8), `charset`
says how `text` reads them (`unknown`, the only lossy value, means use
`raw`), and detections are distinct contents, never keyed on text.
Machine-actionable hints close the generate → scan →
regenerate loop.

```rust
use qrcode_ai_scanner::{ImageInput, ScanProfile, Scanner};

let scanner = Scanner::builder().profile(ScanProfile::Full).build();
let report = scanner.scan(ImageInput::encoded(&bytes))?;
// report.detections · report.score (value/grade/axes/uec) · report.hints
```

"No QR found" is `Ok` with empty detections — `Err` is reserved for invalid
input (`QRS-001..004`), cancellation (`QRS-005`) and an option outside its
domain (`QRS-006`, refused before the input is read: a zero `Limits` cap or
`ScanConfig` side, a palette above `ScanConfig::MAX_ALPHA_PALETTE`, a
`budget_ms` above `ScanConfig::MAX_BUDGET_MS`); branch on `err.code()`.
A report is final when
`report.trace.budget_exhausted == Some(false)`; set `budget_ms: None` for the
unbounded, reproducible scan. Camera frames skip the PNG roundtrip
via `ImageInput::rgba8`. Full docs: the
[repository](https://github.com/qrcode-ai-com/qrcode-barcode-scanner) —
`docs/ARCHITECTURE.md` + `docs/SCORING.md`.

License: AGPL-3.0-or-later · © SuperNovae Studio.
