# License notes for the qrcode-barcode-scanner AAR

The Android library `qrcode-barcode-scanner` (the AAR built from this folder, on JitPack as
`com.github.qrcode-ai-com` and in the Maven Central bundle as `io.github.qrcode-ai-com`) holds
three kinds of content. Each keeps its own license.

| Content | Files in the AAR | License |
| --- | --- | --- |
| The Gradle module of this folder: its manifest and consumer ProGuard rules | `AndroidManifest.xml`, `proguard.txt` | MIT, see `LICENSE` |
| The Kotlin that UniFFI generates from the native library, compiled | `classes.jar` (its sources are in the `-sources.jar`) | Generated from MIT source by UniFFI's Kotlin generator; UniFFI itself is MPL-2.0 |
| The engine's native library, compiled from `crates/qrcode-ai-scanner-uniffi` and its locked Rust dependencies, for four Android ABIs | `jni/<abi>/libqrcode_ai_scanner_uniffi.so` | The engine is MIT. Two parts of its reader derive from rxing, a Rust port of ZXing, and keep their Apache-2.0 notices: see `LICENSE-APACHE-2.0` and `THIRD-PARTY.md`. UniFFI's runtime includes MPL-2.0 components; the other Rust dependencies keep their declared licenses. |

The AAR depends on [JNA](https://github.com/java-native-access/jna) (`net.java.dev.jna:jna`, as
its Android AAR), which Gradle resolves separately. JNA is offered under the Apache-2.0 license
or the LGPL-2.1-or-later, at the user's choice.

The POM names MIT, the license of the project-authored source. The MIT grant does not relicense
the third-party parts above. The AAR carries `LICENSE`, `LICENSE-NOTES.md`,
`LICENSE-APACHE-2.0` and `THIRD-PARTY.md` at its root; keep them with any copy of the AAR or of
its native libraries.

A published version keeps the license it shipped with. The
[licensing guide](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/LICENSING.md)
and the [license history](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/docs/guides/license-history.mdx)
explain the engine's grants and their dates.
