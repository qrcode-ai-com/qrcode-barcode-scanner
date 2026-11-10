# JitPack Android consumer

A small Android app that consumes the Kotlin binding the way an outside project does: from
`jitpack.io`, with no engine source and no local build of the library.

The workflow [`binding-consumers.yml`](../../../.github/workflows/binding-consumers.yml) runs it
on an emulator. It scans the shared mixed fixture (`fixtures/symbology/mixed-code128-qr.png`,
case `qr-and-code128` of `fixtures/consumer-truth.json`) with the `fast`, `full` and `frame`
profiles and expects both contents each time: the QR code `https://qrc-ai.com/76xMa` and the
Code 128 `STOCK-4827`.

The debug build is judged by an instrumented test. The R8-minified build is judged by the app
itself: the workflow installs the release APK, starts `SelfTestActivity` and reads its verdict
line from the device log, because an instrumented test cannot run reliably against a minified
app.

| Flag | Effect |
| --- | --- |
| `-PscannerVersion=0.11.0` | The exact JitPack version string to consume. |
| `-PwithScanner=false` | The removal check: the app builds without the dependency. |
| `-PjnaAar=5.13.0` | Add JNA's Android AAR explicitly and drop the transitive JNA jar. |

To run it by hand, copy the fixture into `app/src/main/assets/`, start an emulator and run
`gradle :app:connectedDebugAndroidTest -PjnaAar=5.17.0` with Gradle 8.9 and JDK 17. No Gradle
wrapper is committed.

Read the state of a JitPack build only through
`https://jitpack.io/api/builds/com.github.qrcode-ai-com/qrcode-barcode-scanner`. A request for an
artifact of a version that was never built starts a build.

## Judging a publication before its tag

[`kotlin-publication.yml`](../../../.github/workflows/kotlin-publication.yml) builds the binding
for the emulator ABI, publishes it to a Maven directory on the runner and runs this same app
against it with `-PscannerRepo=<directory>`, on Android 14 with 4 KB pages and on Android 15
with 16 KB pages. It uses the one-line dependency, without `-PjnaAar`, so it fails if the
publication stops naming JNA's Android AAR. It also checks that the library inside the AAR is
aligned for 16 KB pages.
