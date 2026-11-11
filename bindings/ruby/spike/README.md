# Ruby through UniFFI · a spike

> **Not a gem.** Nothing here is published and nothing here is an API to depend on. It is the
> spike the owner asked for before a Ruby binding is written (decision of 11 November 2026:
> UniFFI for Ruby, confirmed by a spike first).

The question: do the Ruby bindings that UniFFI itself generates load the engine's existing
UniFFI library, the one the Kotlin and Swift bindings already use, and scan in process?

The workflow [`Ruby UniFFI spike`](../../../.github/workflows/ruby-uniffi-spike.yml) answers on
Linux x64, macOS arm64 and Windows x64, from one commit each time:

1. it builds `crates/qrcode-ai-scanner-uniffi` with its locked UniFFI;
2. it generates the Ruby from that very library, with the `uniffi-bindgen` binary of the same
   crate, so the generator and the library cannot differ;
3. it runs [`scan.rb`](scan.rb), which scans the mixed fixture with the three profiles through
   the `ffi` gem and writes each report unchanged;
4. the destination acceptance driver judges the three reports.

The generated Ruby and the native library are never checked in.

`facts.json`, uploaded with the receipt, holds what the spike measured: the time of each scan,
the exception a file that is not an image raises, and the host.
