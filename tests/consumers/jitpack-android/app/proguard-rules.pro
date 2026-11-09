# The app's own entry point for the instrumented test. Everything the binding needs must come
# from the consumer rules inside the AAR: no rule for it belongs here.
-keep class com.qrcodeai.consumer.jitpack.ScanBridge { *; }
