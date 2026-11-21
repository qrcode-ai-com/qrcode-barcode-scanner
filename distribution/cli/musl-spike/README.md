# qrscan for musl · a spike

> **Not a release.** Nothing here is published and no archive is added to a release. It is a
> measurement for the scope of the next engine version: the CLI release has no archive for
> Alpine and other musl systems.

The question: does `qrscan` build for musl from this source, run on Alpine with nothing else
installed, return the engine's reports, and how fast is it next to the glibc build of the same
commit?

The workflow [`musl CLI spike`](../../../.github/workflows/musl-cli-spike.yml) answers on x86_64
and on arm64, from one commit each time:

1. it builds `qrscan` for the musl target and for the glibc target of the host;
2. it records what kind of file the musl build is and what it links to;
3. the destination acceptance driver judges three scans on the build host, then inside an
   Alpine container where only Python was added, for the driver;
4. it checks that the glibc build does not start on Alpine, which is why a musl build is needed;
5. [`measure.py`](measure.py) times both builds on the same host.

The spike builds with plain `cargo build`. A release would go through `scripts/cli-release.py`,
with its checks of the binary, its notices and its archive: none of that is written.
