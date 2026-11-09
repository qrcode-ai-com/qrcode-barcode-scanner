# JitPack Android consumer

A small Android app that consumes the Kotlin binding the way an outside project does: from
`jitpack.io`, with no engine source and no local build of the library.

The workflow [`binding-consumers.yml`](../../../.github/workflows/binding-consumers.yml) runs it
on an emulator. Its instrumented test scans the shared mixed fixture
(`fixtures/symbology/mixed-code128-qr.png`, case `qr-and-code128` of
`fixtures/consumer-truth.json`) with the `fast`, `full` and `frame` profiles and expects both
contents each time: the QR code `https://qrc-ai.com/76xMa` and the Code 128 `STOCK-4827`.

| Flag | Effect |
| --- | --- |
| `-PscannerVersion=0.11.0` | The exact JitPack version string to consume. |
| `-PminifiedTest=true` | Run the test against the R8-minified build, with the rules shipped in the AAR. |
| `-PwithScanner=false` | The removal check: the app builds without the dependency. |
| `-PjnaOverride=5.17.0` | Replace the JNA version the binding's POM asks for. |

To run it by hand, copy the fixture into `app/src/androidTest/assets/`, start an emulator and
run `gradle :app:connectedDebugAndroidTest` with Gradle 8.9 and JDK 17. No Gradle wrapper is
committed.

Read the state of a JitPack build only through
`https://jitpack.io/api/builds/com.github.qrcode-ai-com/qrcode-barcode-scanner`. A request for an
artifact of a version that was never built starts a build.
