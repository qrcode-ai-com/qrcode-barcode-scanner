// The Android library module → packages an AAR containing:
//   - the generated UniFFI Kotlin (src/main/kotlin/, from uniffi-bindgen §3.1)
//   - the per-ABI native libs (src/main/jniLibs/<abi>/*.so, from cargo-ndk §4.1)
//   - the JNA @aar runtime dep (the bridge UniFFI Kotlin uses to call the .so)
//
// Build: `./gradlew :qrcodeaiscanner:assembleRelease`
//   → qrcodeaiscanner/build/outputs/aar/qrcodeaiscanner-release.aar
//
// SPDX-License-Identifier: MIT

plugins {
    id("com.android.library")
    kotlin("android")
    `maven-publish`
}

// The workspace version SSOT is root Cargo.toml [workspace.package].version.
// This field is the drift point the architecture plan §3 closes with
// `xtask sync-version` (regex/line edit of `version = "..."` below).
version = "0.11.0"
// The group of the publication: JitPack serves it as `com.github.qrcode-ai-com`, the default;
// the Maven Central bundle is written as `io.github.qrcode-ai-com`, with
// `-PscannerGroup=io.github.qrcode-ai-com` (.github/workflows/maven-central.yml).
val publicationGroup = providers.gradleProperty("scannerGroup").orElse("com.github.qrcode-ai-com").get()
group = publicationGroup

android {
    namespace = "studio.supernovae.qrcodeaiscanner"
    compileSdk = 34

    defaultConfig {
        minSdk = 21 // JNA @aar supports API 21+
        consumerProguardFiles("consumer-rules.pro")
    }

    // jniLibs are picked up automatically from src/main/jniLibs/<abi>/*.so
    // (cargo-ndk lays out the ABI subdirs there in CI).

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        jvmToolchain(17)
    }

    // 16 KB page size (Android 15+): the NDK r26+ in CI links .so's
    // 16 KB-aligned by default (uniffi plan §7 gotcha #8). No extra flag needed
    // here; this comment documents the requirement on the CI NDK pin (r27).

    // The sources jar Maven Central requires, with the generated Kotlin in it. Its javadoc jar
    // is written by scripts/maven-central-bundle.py.
    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }
}

dependencies {
    // JNA is the runtime bridge UniFFI Kotlin uses to call into the .so.
    // The `@aar` classifier is NON-NEGOTIABLE: it pulls JNA's own native
    // libjnidispatch.so per ABI. A plain `jna` jar compiles but crashes
    // at runtime with UnsatisfiedLinkError on device (uniffi plan §4.2 / §7 #1).
    // 5.17.0 is the first version whose x86_64 library is aligned for 16 KB pages.
    // The published POM carries this as `<type>aar</type>`. Gradle module metadata cannot:
    // see the publication block below.
    implementation("net.java.dev.jna:jna:5.17.0@aar") // >=5.12.0 required by UniFFI 0.31
}

// JitPack builds + serves this module from a GitHub tag (see repo-root
// jitpack.yml). `maven-publish` lets JitPack publish the AAR + POM.
// Consumer (per uniffi plan §4.3):
//   repositories { maven { url = uri("https://jitpack.io") } }
//   JitPack coordinate, not yet qualified: com.github.qrcode-ai-com:qrcode-barcode-scanner:vX.Y.Z
// Gradle module metadata is not published. It has no field for the `@aar` of the JNA
// dependency, and a Gradle consumer reads it in preference to the POM: with 0.11.0 the
// one-line dependency resolved the plain JNA jar and the first scan failed with an
// UnsatisfiedLinkError. Without that file a consumer reads the POM, which names the AAR.
// .github/workflows/kotlin-publication.yml proves it on an emulator.
tasks.withType<GenerateModuleMetadata>().configureEach { enabled = false }

// Every copy of the AAR carries its license files at its root: the MIT license of the binding
// and the notices of the native library inside it (bindings/kotlin/LICENSE-NOTES.md).
// scripts/maven-central-bundle.py refuses an AAR without them.
tasks.withType<Zip>().matching { it.name == "bundleReleaseAar" }.configureEach {
    from(
        rootDir.resolve("LICENSE"),
        rootDir.resolve("LICENSE-NOTES.md"),
        rootDir.resolve("../../crates/qrcode-ai-scanner/LICENSE-APACHE-2.0"),
        rootDir.resolve("../../crates/qrcode-ai-scanner/THIRD-PARTY.md"),
    )
}

publishing {
    publications {
        register<MavenPublication>("release") {
            groupId = publicationGroup
            artifactId = "qrcode-barcode-scanner"
            version = project.version.toString()

            afterEvaluate {
                from(components["release"])
            }

            pom {
                name.set("QR Code & Barcode Scanner for Android")
                description.set(
                    "Read QR codes and barcodes from an image in Kotlin on Android, in process, with the " +
                        "open-source engine's native library inside the AAR."
                )
                url.set("https://qrcode-ai.com/en-US/qr-code-scanner/sdk/android")
                licenses {
                    // Project-authored source is MIT; dependencies retain their own notices.
                    license {
                        name.set("MIT")
                        url.set("https://github.com/qrcode-ai-com/qrcode-barcode-scanner/blob/main/LICENSE")
                    }
                }
                developers {
                    developer {
                        id.set("qrcode-ai-com")
                        name.set("QR Code AI")
                        url.set("https://github.com/qrcode-ai-com/qrcode-barcode-scanner")
                    }
                }
                scm {
                    url.set("https://github.com/qrcode-ai-com/qrcode-barcode-scanner")
                    connection.set("scm:git:https://github.com/qrcode-ai-com/qrcode-barcode-scanner.git")
                    developerConnection.set("scm:git:ssh://git@github.com/qrcode-ai-com/qrcode-barcode-scanner.git")
                }
                issueManagement {
                    system.set("GitHub")
                    url.set("https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues")
                }
            }
        }
    }
}
