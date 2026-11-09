// Clean consumer of the Kotlin binding as JitPack serves it. Nothing here builds the engine:
// the AAR comes from jitpack.io, as it does for an outside Android project.

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://jitpack.io")
            // Only this group may resolve from JitPack, so a typo cannot start another build.
            content { includeGroup("com.github.qrcode-ai-com") }
        }
    }
}

rootProject.name = "jitpack-android-consumer"

include(":app")
