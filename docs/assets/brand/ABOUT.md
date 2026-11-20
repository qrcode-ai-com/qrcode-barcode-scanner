# Brand illustrations

Images for the README files of this repository, drawn in the style of the [QR Code AI](https://qrcode-ai.com/) website.

Two kinds of image live here, and they do not say the same thing:

- **Editorial illustrations** (the hero, the runtimes, the destinations, the formats). They illustrate the scanner; none of them is scan output or evidence of a result.
- **Pictures of real scans** (`examples-*`). Each one shows fixtures of this repository and what their recorded reports say: the format returned, the measured outline, the decoded fields. The reports, the fixture hashes and their provenance are in [`../readme/`](../readme/README.md); a picture is rendered only when each fixture matches its recorded SHA-256. The selection, the colours and the read marks are presentation, not a scanner capability. A picture shows no address a fixture encodes.

| File | Shown in |
| --- | --- |
| `scanner-hero-light.webp`, `scanner-hero-dark.webp` | The root README: the animated hero, with the runtimes under their logos. |
| `scanner-hero-light.gif`, `scanner-hero-dark.gif` | The same hero, for a renderer that does not take WebP. |
| `runtimes-light.png`, `runtimes-dark.png` | "Get started", and the Go and PHP READMEs: one engine in each runtime. |
| `destinations-light.png`, `destinations-dark.png` | "Get started", and the distribution guide: where the scanner is published and the directories that list it. |
| `formats-light.gif`, `formats-dark.gif` | "Supported formats", and the Go and PHP READMEs: the four families of codes. |
| `examples-replay-light.gif`, `examples-replay-dark.gif` | "Examples": two copies of one QR code and a Code 128, each occurrence selected where it was measured. |
| `examples-gallery-light.gif`, `examples-gallery-dark.gif` | "Examples": twelve fixtures, each read as the format it is labelled with. |
| `examples-mixed-light.png`, `examples-mixed-dark.png` | "Examples": a QR code and a Code 128 read in one scan. |
| `examples-payloads-light.png`, `examples-payloads-dark.png` | "Examples": Wi-Fi, contact, SMS and GS1 Digital Link payloads with the fields returned. |
| `mark-*-light.png`, `mark-*-dark.png` | The small logos that open a table row: a language, the command line, an install channel or a directory that lists the scanner. |

The banners that open the package READMEs (Rust, Node.js, the browser, Python, the command line, Go, PHP) and the two "how it works" animations are kept in the organization's [`.github`](https://github.com/qrcode-ai-com/.github/tree/main/profile/assets) repository, so they do not weigh on a clone of the engine. A banner quotes the first lines of its README's quick start: render it again when that code changes.

The images were rendered between 18 and 20 November 2026 from the design sources of the QR Code AI website, which are kept outside this repository. Only rendered pixels are stored here: no font file, no website source and no logo file.

Language and platform names and logos belong to their owners; here they identify a runtime, a destination or a host and imply no endorsement. The Go gopher was designed by Renée French and is licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The PHP logo was designed by Colin Viebrock and is licensed under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Rust and the Rust logo are trademarks of the Rust Foundation, Node.js is a trademark of the OpenJS Foundation, and the Python logo is a trademark of the Python Software Foundation. GitHub and its mark are trademarks of GitHub, Inc., and the names and logos of Obsidian, ComfyUI and Glama are trademarks of their owners.

A README addresses an image by its raw URL with a `?v=` value: the first twelve characters of the file's SHA-256. Replace an image and its `?v=` value together.
