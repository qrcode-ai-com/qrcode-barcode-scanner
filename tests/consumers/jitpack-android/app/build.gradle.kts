plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// -PscannerVersion=<version>   the exact JitPack version string under test
// -PwithScanner=false          the removal check: the app must still build without the binding
val scannerVersion = providers.gradleProperty("scannerVersion").orElse("0.11.0")
val withScanner = providers.gradleProperty("withScanner").map { it.toBoolean() }.orElse(true)
// -PjnaAar=<version>           add JNA's Android AAR explicitly and drop the transitive JNA jar
val jnaAar = providers.gradleProperty("jnaAar").orNull

android {
    namespace = "com.qrcodeai.consumer.jitpack"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.qrcodeai.consumer.jitpack"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            // R8 runs with the consumer rules shipped inside the AAR.
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets {
        // The only code that names the binding lives here, so removing the dependency is one flag.
        if (withScanner.get()) getByName("main").kotlin.srcDir("src/scanner/kotlin")
    }
}

dependencies {
    if (withScanner.get()) {
        implementation("com.github.qrcode-ai-com:qrcode-barcode-scanner:${scannerVersion.get()}") {
            // The published module metadata of 0.11.0 names JNA without its AAR, so Gradle
            // resolves the plain jar, which carries no Android native dispatcher.
            if (jnaAar != null) exclude(group = "net.java.dev.jna", module = "jna")
        }
        if (jnaAar != null) implementation("net.java.dev.jna:jna:$jnaAar@aar")
    }
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
