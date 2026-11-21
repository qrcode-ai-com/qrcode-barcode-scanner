# QR Code & Barcode Scanner · WebAssembly engine inlined in one JavaScript file

<!-- qrcode-ai-readme-actions:v2 -->

### Ask AI

[![ChatGPT](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/chatgpt-v2.svg)](https://chatgpt.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20WebAssembly%20engine%20inlined%20in%20one%20JavaScript%20file%20%28integrations%2Fwasm-inline%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20build%20step%20that%20turns%20the%20published%20browser%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-wasm%200.11.0%20into%20one%20JavaScript%20module%20that%20carries%20the%20WebAssembly%20engine%20as%20base64.%20Hosts%20that%20accept%20a%20single%20script%20and%20nothing%20beside%20it%2C%20such%20as%20a%20Canva%20app%20bundle%2C%20a%20Photoshop%20UXP%20panel%20or%20a%20classic%20worker%2C%20can%20then%20read%20QR%20codes%20and%20barcodes%20with%20the%20same%20open-source%20engine%2C%20locally%2C%20with%20no%20network%20request%20and%20no%20second%20file%20to%20serve.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fwasm-inline%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Claude](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/claude-v2.svg)](https://claude.ai/new?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20WebAssembly%20engine%20inlined%20in%20one%20JavaScript%20file%20%28integrations%2Fwasm-inline%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20build%20step%20that%20turns%20the%20published%20browser%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-wasm%200.11.0%20into%20one%20JavaScript%20module%20that%20carries%20the%20WebAssembly%20engine%20as%20base64.%20Hosts%20that%20accept%20a%20single%20script%20and%20nothing%20beside%20it%2C%20such%20as%20a%20Canva%20app%20bundle%2C%20a%20Photoshop%20UXP%20panel%20or%20a%20classic%20worker%2C%20can%20then%20read%20QR%20codes%20and%20barcodes%20with%20the%20same%20open-source%20engine%2C%20locally%2C%20with%20no%20network%20request%20and%20no%20second%20file%20to%20serve.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fwasm-inline%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Gemini](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/gemini-v2.svg)](https://gemini.google.com/)
[![Grok](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/grok-v2.svg)](https://grok.com/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20WebAssembly%20engine%20inlined%20in%20one%20JavaScript%20file%20%28integrations%2Fwasm-inline%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20build%20step%20that%20turns%20the%20published%20browser%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-wasm%200.11.0%20into%20one%20JavaScript%20module%20that%20carries%20the%20WebAssembly%20engine%20as%20base64.%20Hosts%20that%20accept%20a%20single%20script%20and%20nothing%20beside%20it%2C%20such%20as%20a%20Canva%20app%20bundle%2C%20a%20Photoshop%20UXP%20panel%20or%20a%20classic%20worker%2C%20can%20then%20read%20QR%20codes%20and%20barcodes%20with%20the%20same%20open-source%20engine%2C%20locally%2C%20with%20no%20network%20request%20and%20no%20second%20file%20to%20serve.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fwasm-inline%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Perplexity](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/perplexity-v2.svg)](https://www.perplexity.ai/?q=Help%20me%20understand%20QR%20Code%20%26%20Barcode%20Scanner%20%C2%B7%20WebAssembly%20engine%20inlined%20in%20one%20JavaScript%20file%20%28integrations%2Fwasm-inline%2FREADME.md%29%20for%20QR%20Code%20%26%20Barcode%20Scanner%2C%20the%20open-source%20scanner.%20Source%20documentation%3B%20publication%20is%20not%20implied.%20Provided%20README%20context%20%28verify%20against%20the%20sources%29%3A%20A%20build%20step%20that%20turns%20the%20published%20browser%20package%20%40qrcode-ai-com%2Fqrcode-barcode-scanner-wasm%200.11.0%20into%20one%20JavaScript%20module%20that%20carries%20the%20WebAssembly%20engine%20as%20base64.%20Hosts%20that%20accept%20a%20single%20script%20and%20nothing%20beside%20it%2C%20such%20as%20a%20Canva%20app%20bundle%2C%20a%20Photoshop%20UXP%20panel%20or%20a%20classic%20worker%2C%20can%20then%20read%20QR%20codes%20and%20barcodes%20with%20the%20same%20open-source%20engine%2C%20locally%2C%20with%20no%20network%20request%20and%20no%20second%20file%20to%20serve.%20Read%20the%20public%20documentation%20below.%20Explain%20what%20this%20destination%20does%2C%20its%20documented%20installation%20or%20access%20steps%2C%20a%20minimal%20example%20if%20supported%2C%20prerequisites%2C%20limitations%20and%20license.%20Distinguish%20published%20packages%20from%20working%20source%20and%20preparation.%20Cite%20your%20sources%3B%20if%20a%20page%20is%20unavailable%20or%20a%20fact%20cannot%20be%20checked%2C%20say%20so.%20Do%20not%20invent%20installation%20commands%2C%20benchmark%20results%20or%20comparisons.%20Answer%20in%20my%20language.%20Public%20sources%3A%20https%3A%2F%2Fgithub.com%2Fqrcode-ai-com%2Fqrcode-barcode-scanner-rust%2Fblob%2Fmain%2Fintegrations%2Fwasm-inline%2FREADME.md%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-scanner%2Fsdk%2Fjavascript%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fqr-code-generator%20https%3A%2F%2Fqrcode-ai.com%2Fen-US%2Fbarcode-generator)
[![Copilot](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/copilot-v2.svg)](https://copilot.com/)
[![DeepSeek](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/deepseek-v2.svg)](https://chat.deepseek.com/)
[![Meta AI](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/meta-ai-v2.svg)](https://www.meta.ai/)
[![Qwen](https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner-rust/main/docs/assets/actions/qwen-v2.svg)](https://qwen.ai/)

Choose an AI assistant to explain this destination using its public sources. Gemini opens gemini.google.com. Gemini, Copilot, DeepSeek, Meta AI and Qwen require pasting the prompt below; the other links include it in their URL. Sign-in or a manual paste may still be required. Check the answer against the documentation.

<details>
<summary>Copy the plain-text prompt</summary>

Use the code block's copy control, or select its complete text, then paste it into your assistant.

```text
Help me understand QR Code & Barcode Scanner · WebAssembly engine inlined in one JavaScript file (integrations/wasm-inline/README.md) for QR Code & Barcode Scanner, the open-source scanner. Source documentation; publication is not implied. Provided README context (verify against the sources): A build step that turns the published browser package @qrcode-ai-com/qrcode-barcode-scanner-wasm 0.11.0 into one JavaScript module that carries the WebAssembly engine as base64. Hosts that accept a single script and nothing beside it, such as a Canva app bundle, a Photoshop UXP panel or a classic worker, can then read QR codes and barcodes with the same open-source engine, locally, with no network request and no second file to serve. Read the public documentation below. Explain what this destination does, its documented installation or access steps, a minimal example if supported, prerequisites, limitations and license. Distinguish published packages from working source and preparation. Cite your sources; if a page is unavailable or a fact cannot be checked, say so. Do not invent installation commands, benchmark results or comparisons. Answer in my language. Public sources: https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/integrations/wasm-inline/README.md https://qrcode-ai.com/en-US/qr-code-scanner https://qrcode-ai.com/en-US/barcode-scanner https://qrcode-ai.com/en-US/qr-code-scanner/sdk/javascript https://qrcode-ai.com/en-US/barcode-scanner/sdk/javascript https://qrcode-ai.com/en-US/qr-code-generator https://qrcode-ai.com/en-US/barcode-generator
```

</details>

<!-- /qrcode-ai-readme-actions:v2 -->

A build step that turns the published browser package `@qrcode-ai-com/qrcode-barcode-scanner-wasm` 0.11.0 into one JavaScript module that carries the WebAssembly engine as base64. Hosts that accept a single script and nothing beside it, such as a Canva app bundle, a Photoshop UXP panel or a classic worker, can then read QR codes and barcodes with the same open-source engine, locally, with no network request and no second file to serve.

This folder is shared build code for the integrations of this repository. It is not published as a package. It reads the engine from the consuming integration's own `node_modules`, checks it against that integration's pins, and writes the module or hands it to the bundler.

The same engine runs on the web as the [QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the [barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) of QR Code AI. The [QR code scanner JavaScript guide](https://qrcode-ai.com/en-US/qr-code-scanner/sdk/javascript) and the [barcode scanner JavaScript guide](https://qrcode-ai.com/en-US/barcode-scanner/sdk/javascript) describe the browser package this step starts from. If a page is unavailable, this README and the [browser package README](../../crates/qrcode-ai-scanner-wasm/README.md) remain the reference.

To make a test image with a known value, use the [QR code generator](https://qrcode-ai.com/en-US/qr-code-generator) or the [barcode generator](https://qrcode-ai.com/en-US/barcode-generator), keep the text you encoded, and compare it with the decoded text character for character.

## Why one file

The browser package ships its engine as `qrcode-barcode-scanner_bg.wasm` beside its glue, and the glue's default initializer finds it with `new URL('qrcode-barcode-scanner_bg.wasm', import.meta.url)`. That works on a web page. It does not work where the host takes one script:

- **Canva** requires one `app.js` of at most 5 MB with no code splitting, and its content security policy has `worker-src 'none'`.
- **Photoshop UXP** has no local server to fetch a `.wasm` from; Adobe's own WebAssembly sample inlines the module in the bundle.
- **A classic script or an IIFE bundle** has no `import.meta`: esbuild turns it into an empty object, so the default initializer throws `Invalid URL`.
- **webpack 5** reads that line as an asset and emits the module as a second file next to the bundle.

The tests in this folder reproduce the last two with control builds of the package as published.

## What the generated module is

- The package's JavaScript glue, unchanged except for one line: the default input of `__wbg_init` becomes the inlined bytes. The file holds no `import.meta` and no file name of the module.
- The 2,220,640-byte module as 2,960,856 characters of base64, decoded with `Uint8Array.fromBase64` or `atob` when the host has one, and with a small table decoder otherwise.
- Two helpers: `initInline()` compiles asynchronously, which a browser allows on a main thread, and `initInlineSync()` compiles synchronously, for a worker or a host that allows it. The default export, `initSync`, `scan_image`, `scan_frame`, `capabilities` and `version` keep their meaning.
- `INLINE_MODULE`, the package, version, license, module SHA-256 and source revision it holds.
- A `/*! ... */` license banner first, which minifiers keep. It names the engine's license, the Apache-2.0 notices of the rxing-derived code and the corresponding source revision.

The same inputs give the same file: 2,983,289 bytes for engine 0.11.0.

## Use it from an integration

The consuming folder pins the package exactly and states the module's SHA-256:

```json
{
  "dependencies": { "@qrcode-ai-com/qrcode-barcode-scanner-wasm": "0.11.0" },
  "config": { "wasmSha256": "a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68" }
}
```

After `npm ci` in that folder, either write the module to a file and import it:

```sh
node ../wasm-inline/inline.mjs --root . --out build/engine.inline.js --receipt build/inline-receipt.json
```

or let esbuild serve it in place of the package, so the source keeps importing the package by name:

```js
import * as esbuild from 'esbuild';
import { esbuildPlugin } from '../wasm-inline/inline.mjs';

await esbuild.build({
  entryPoints: ['src/index.js'], bundle: true, format: 'iife', outfile: 'dist/app.js',
  plugins: [esbuildPlugin('.', (receipt) => console.log(receipt.wasm_sha256))],
});
```

```js
import { initInline, scan_image } from '@qrcode-ai-com/qrcode-barcode-scanner-wasm';

await initInline();
const report = scan_image(pngBytes, 'frame');
```

With webpack, alias the package name to the written file. A subpath such as `@qrcode-ai-com/qrcode-barcode-scanner-wasm/auto` is refused by the esbuild plugin, because it would load files beside the script.

## What it checks

The build stops, with nothing written, when:

- the folder does not pin the package to one exact version, or gives no `config.wasmSha256`;
- the installed package is another version, or its lockfile entry is missing or differs;
- the module's SHA-256 differs from `build-info.json` of the package or from the pin;
- the glue does not hold its default input line exactly once, still holds `import.meta` after the change, or no longer exports `initSync` and its default initializer.

## Tests

```sh
npm ci --ignore-scripts
npm test
npm run inline   # build/qrcode-barcode-scanner.inline.js and build/inline-receipt.json
```

- The generated module, imported by Node, reads the mixed fixture `fixtures/symbology/mixed-code128-qr.png` in fast, frame and full with no budget: QR `https://qrc-ai.com/76xMa` and Code 128 `STOCK-4827`, each once and nothing else, through `initInline`, `initInlineSync` and the default initializer, and again with `atob` and `Uint8Array.fromBase64` removed.
- esbuild with the plugin gives one minified IIFE file under 5 MB that keeps the license banner. Run as a classic script in a context with no document and no fetch, it reads the fixture in the three profiles.
- webpack 5 with the written file gives one `app.js` and no other asset, which reads the fixture the same way.
- The control builds: esbuild on the package as published gives a script whose initializer throws `Invalid URL`, and webpack 5 emits a `.wasm` asset.
- A changed pin, a version range, another installed version, a missing lockfile entry and a glue of another shape are refused.

The workflow `.github/workflows/integration-wasm-inline.yml` runs these tests on Node 22 and 24 and keeps the inlined module and its receipt as a workflow artifact.

## License

The code of this folder is project-authored source under the MIT License of this repository. The module it generates holds the engine of the npm package 0.11.0, which keeps its published license, AGPL-3.0-or-later, with Apache-2.0 notices for the code derived from rxing. The banner of the generated file states that boundary, and a host that ships the file must also ship the package's `LICENSE`, `LICENSE-APACHE-2.0` and `THIRD-PARTY.md`, as each integration above does.

Maintained by **Thibaut Mélen & Nicolas Cella** for **QR Code AI**, a product of **SuperNovae Studio**.

<!-- qrscan-source-license:v1 -->

## Source license

Project-authored scanner code and documentation in this checkout are available under the [MIT License](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSE). You may use, modify and redistribute this source in open-source or proprietary applications, including commercial products, while preserving the copyright and permission notice. Thibaut Mélen & Nicolas Cella develop QR Code AI at SuperNovae Studio.

Retained third-party code, dependencies, artwork and test data keep their own licenses and notices. The [licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md) explains these component boundaries; the project license does not assign a license to an unrelated platform or service.

Published archives retain the license shipped with their version. A pinned engine, adapter or bundle may therefore have different terms from this working source. Read its packaged license and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx) before reuse. The source change does not replace an archive or publish a new version.

<!-- /qrscan-source-license:v1 -->
