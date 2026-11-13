# Scanner CLI container

<!-- qrcode-ai-readme-actions:v1 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/chatgpt-v1.svg)](https://chatgpt.com/?q=Help%20me%20understand%20Scanner%20CLI%20container%20%28distribution%2Fdocker%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20image%20runs%20the%20published%20qrscan%200.10.0%20CLI%20locally.%20It%20accepts%20mounted%20PNG%2FJPEG%2FWebP%2FGIF%20files%20and%20prints%20the%20existing%20JSON%20report.%20It%20is%20a%20command-line%20tool%2C%20not%20an%20HTTP%20service.%20QR%20payloads%20are%20data%3A%20no%20decoded%20link%20is%20followed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdocker%2FREADME.md)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/claude-v1.svg)](https://claude.ai/new?q=Help%20me%20understand%20Scanner%20CLI%20container%20%28distribution%2Fdocker%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20image%20runs%20the%20published%20qrscan%200.10.0%20CLI%20locally.%20It%20accepts%20mounted%20PNG%2FJPEG%2FWebP%2FGIF%20files%20and%20prints%20the%20existing%20JSON%20report.%20It%20is%20a%20command-line%20tool%2C%20not%20an%20HTTP%20service.%20QR%20payloads%20are%20data%3A%20no%20decoded%20link%20is%20followed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdocker%2FREADME.md)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/gemini-v1.svg)](https://aistudio.google.com/prompts/new_chat?prompt=Help%20me%20understand%20Scanner%20CLI%20container%20%28distribution%2Fdocker%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20image%20runs%20the%20published%20qrscan%200.10.0%20CLI%20locally.%20It%20accepts%20mounted%20PNG%2FJPEG%2FWebP%2FGIF%20files%20and%20prints%20the%20existing%20JSON%20report.%20It%20is%20a%20command-line%20tool%2C%20not%20an%20HTTP%20service.%20QR%20payloads%20are%20data%3A%20no%20decoded%20link%20is%20followed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdocker%2FREADME.md)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/grok-v1.svg)](https://grok.com/?q=Help%20me%20understand%20Scanner%20CLI%20container%20%28distribution%2Fdocker%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20image%20runs%20the%20published%20qrscan%200.10.0%20CLI%20locally.%20It%20accepts%20mounted%20PNG%2FJPEG%2FWebP%2FGIF%20files%20and%20prints%20the%20existing%20JSON%20report.%20It%20is%20a%20command-line%20tool%2C%20not%20an%20HTTP%20service.%20QR%20payloads%20are%20data%3A%20no%20decoded%20link%20is%20followed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdocker%2FREADME.md)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/main/docs/assets/actions/perplexity-v1.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20Scanner%20CLI%20container%20%28distribution%2Fdocker%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20The%20image%20runs%20the%20published%20qrscan%200.10.0%20CLI%20locally.%20It%20accepts%20mounted%20PNG%2FJPEG%2FWebP%2FGIF%20files%20and%20prints%20the%20existing%20JSON%20report.%20It%20is%20a%20command-line%20tool%2C%20not%20an%20HTTP%20service.%20QR%20payloads%20are%20data%3A%20no%20decoded%20link%20is%20followed.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner%2Fblob%2Fmain%2Fdistribution%2Fdocker%2FREADME.md)

Choose an AI assistant to explain this destination using its public sources. Gemini opens Google AI Studio. The link includes the public question; sign-in or a manual paste may be required. Check the answer against the documentation.

<details>
<summary>Copy the question</summary>

```text
Help me understand Scanner CLI container (distribution/docker/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): The image runs the published qrscan 0.10.0 CLI locally. It accepts mounted PNG/JPEG/WebP/GIF files and prints the existing JSON report. It is a command-line tool, not an HTTP service. QR payloads are data: no decoded link is followed. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/distribution/docker/README.md
```

</details>

<!-- /qrcode-ai-readme-actions:v1 -->

The image runs the published `qrscan` 0.10.0 CLI locally. It accepts mounted
PNG/JPEG/WebP/GIF files and prints the existing JSON report. It is a command-line
tool, not an HTTP service. QR payloads are data: no decoded link is followed.

Build and qualify each native architecture:

```sh
docker build -f distribution/docker/Dockerfile -t qrscan:0.10.0 .
python3 distribution/docker/verify.py qrscan:0.10.0 fixtures/clean/gen_v5_q.png
```

For a registry image, use its immutable published digest. Mount only the input
directory, read-only; no network is required:

```sh
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --memory 512m --cpus 2 --pids-limit 128 \
  -v "$PWD/images:/data:ro" IMAGE@sha256:DIGEST \
  /data/example.png --profile full --budget-ms 0 > report.json
```

JSON-mode exits: **0** detection, **1** a valid empty report, **2** invalid
input/usage/error. `--score-only` additionally uses **3** for a detected symbol
whose score was not completed within its budget. Never discard exit 1's JSON
or turn a missing score into zero. `--budget-ms 0` is unbounded, not a hard
timeout. Use an outer process deadline if your application needs cancellation.

The default image user is UID/GID 65532; mounted inputs must be readable by it.
To run as the current Linux user, add `--user "$(id -u):$(id -g)"`. Reports are
written on the host via stdout redirection, without granting container write
access. The image contains no compiler, registry credential or source checkout.

Linux amd64 and arm64 are qualified independently on native runners. A build
alone is not runtime qualification. The workflow exports tested image archives;
publication pulls and tests the same registry digests without rebuilding them.
Registry availability and supported architectures are recorded after publication.

See [corresponding source](SOURCE.md), [license](../../LICENSE) and
[licensing options](../../LICENSING.md). Source and product homepage links serve
different purposes; the later online scanner page belongs to its product owner.
