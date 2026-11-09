# Test APK only. The test libraries name compile-time annotations that are not on the device.
-dontwarn com.google.errorprone.annotations.**
# Keep the instrumented tests themselves when the test APK is minified with the app.
-keep class com.qrcodeai.consumer.jitpack.MixedScanTest { *; }
