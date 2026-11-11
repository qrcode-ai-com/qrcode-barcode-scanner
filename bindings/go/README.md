# Go route · spike

A spike for the Go route of the scanner: the engine compiled to WebAssembly (WASI) and run from
Go by [wazero](https://github.com/tetratelabs/wazero), with no cgo and no C toolchain.

> **This is an experiment, not a package.** Nothing here is published, the module path is not
> final and the WebAssembly module is built by a workflow, not committed. The spike exists to
> measure the route before it is chosen for good.

| Part | What it is |
| --- | --- |
| [`wasi/`](wasi/) | A small Rust crate that compiles the same engine to `wasm32-wasip1` and exports four plain functions: `qrs_alloc`, `qrs_free`, `qrs_scan` and `qrs_capabilities`. It is its own workspace with its own lock file, at the versions the engine's lock file holds. |
| [`scanner.go`](scanner.go) | The Go side: it loads the module with wazero, copies the image into the module's memory, calls the scan and returns the engine's JSON report unchanged. A cancelled context stops a scan. |
| [`scanner_test.go`](scanner_test.go) | The tests and the measurements. |

The workflow `Go WASI spike` builds the module, then on Linux x64, Linux arm64 and macOS arm64:

- reads the QR code and the Code 128 of the mixed fixture in `fast`, `frame` and `full`, in
  wazero's compiler and in its interpreter;
- compares each report, times aside, with the report of the released native `qrscan` 0.11.0;
- checks an image with no code, bytes that are not an image, the capabilities and a cancelled
  scan followed by a good one;
- records the size of the module, its load time and each profile's time against the native
  command.

What the spike shows is written in the pull request that carries it.
