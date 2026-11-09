// The Android library module → packages an AAR containing:
//   - the generated UniFFI Kotlin (src/main/kotlin/, from uniffi-bindgen §3.1)
//   - the per-ABI native libs (src/main/jniLibs/<abi>/*.so, from cargo-ndk §4.1)
//   - the JNA @aar runtime dep (the bridge UniFFI Kotlin uses to call the .so)
//
// Build: `./gradlew :qrcodeaiscanner:assembleRelease`
//   → qrcodeaiscanner/build/outputs/aar/qrcodeaiscanner-release.aar
//
// SPDX-License-Identifier: AGPL-3.0-or-later  (dual-licensed — see LICENSING.md)

plugins {
    id("com.android.library")
    kotlin("android")
    `maven-publish`
}

// The workspace version SSOT is root Cargo.toml [workspace.package].version.
// This field is the drift point the architecture plan §3 closes with
// `xtask sync-version` (regex/line edit of `version = "..."` below).
version = "0.11.0"
group = "com.github.qrcode-ai-com"

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
}

dependencies {
    // JNA is the runtime bridge UniFFI Kotlin uses to call into the .so.
    // The `@aar` classifier is NON-NEGOTIABLE: it pulls JNA's own native
    // libjnidispatch.so per ABI. A plain `jna` jar compiles but crashes
    // at runtime with UnsatisfiedLinkError on device (uniffi plan §4.2 / §7 #1).
    // 5.17.0 is the first version whose x86_64 library is aligned for 16 KB pages.
    // Known gap, measured by tests/consumers/jitpack-android on 0.11.0: the published
    // Gradle module metadata drops this `@aar`, so a consumer still has to add the JNA
    // AAR itself. Fix the publication and prove it with that consumer before the next tag.
    implementation("net.java.dev.jna:jna:5.17.0@aar") // >=5.12.0 required by UniFFI 0.31
}

// JitPack builds + serves this module from a GitHub tag (see repo-root
// jitpack.yml). `maven-publish` lets JitPack publish the AAR + POM.
// Consumer (per uniffi plan §4.3):
//   repositories { maven { url = uri("https://jitpack.io") } }
//   JitPack coordinate, not yet qualified: com.github.qrcode-ai-com:qrcode-barcode-scanner:vX.Y.Z
publishing {
    publications {
        register<MavenPublication>("release") {
            groupId = "com.github.qrcode-ai-com"
            artifactId = "qrcode-barcode-scanner"
            version = project.version.toString()

            afterEvaluate {
                from(components["release"])
            }

            pom {
                name.set("qrcode-barcode-scanner (Kotlin/Android)")
                description.set("Kotlin/Android bindings for qrcode-barcode-scanner via UniFFI.")
                url.set("https://github.com/qrcode-ai-com/qrcode-barcode-scanner")
                licenses {
                    // Dual-licensed: AGPL-3.0-or-later OR commercial (LICENSING.md).
                    // The manifest SPDX stays AGPL-3.0-or-later per operator decision.
                    license {
                        name.set("AGPL-3.0-or-later")
                        url.set("https://www.gnu.org/licenses/agpl-3.0.txt")
                    }
                }
            }
        }
    }
}
