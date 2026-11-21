// Clean consumer of the Kotlin binding as JitPack serves it. Nothing here builds the engine:
// the AAR comes from jitpack.io, as it does for an outside Android project.

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

// -PscannerRepo=<directory>   resolve the binding from a local Maven directory instead, to
//                             judge a publication before its tag. JitPack is then not used.
// Declared here because pluginManagement must stay the first block of a settings script.
val scannerRepo = providers.gradleProperty("scannerRepo").orNull
// -PscannerGroup=<group>      the group of that publication: io.github.qrcode-ai-com for the
//                             Maven Central bundle. JitPack's com.github.qrcode-ai-com otherwise.
val scannerGroup = providers.gradleProperty("scannerGroup").orElse("com.github.qrcode-ai-com").get()

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        // The binding's group resolves from this one repository and from no other: neither
        // Maven Central nor Google is asked for it, and nothing else is asked of JitPack, so a
        // typo cannot start another build there.
        exclusiveContent {
            forRepository { maven { url = uri(scannerRepo ?: "https://jitpack.io") } }
            filter { includeGroup(scannerGroup) }
        }
    }
}

rootProject.name = "jitpack-android-consumer"

include(":app")
