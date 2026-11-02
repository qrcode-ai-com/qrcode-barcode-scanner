# qrcode-barcode-scanner-cli

`qrscan` — scan and validate QR codes from the command line (artistic /
AI-generated specialty). JSON `ScanReport` by default, `--pretty` for humans,
`-s` for the score alone. Exit codes: `0` found · `1` none · `2` invalid
input, usage or fault, and with `-s` a configuration that computes no score
· `3` (`-s` only) decoded, not judged within the budget.

```bash
qrscan image.png --pretty
qrscan --capabilities   # the compiled readers: versions, engines, symbologies
```

Releases up to 0.10.1 were published as `qrcode-ai-scanner-cli`; both install `qrscan`.

Powered by [qrcode-barcode-scanner](https://crates.io/crates/qrcode-barcode-scanner).
License: AGPL-3.0-or-later · © SuperNovae Studio.
