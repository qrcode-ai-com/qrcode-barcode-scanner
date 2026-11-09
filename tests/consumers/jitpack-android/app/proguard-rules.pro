# The app's own entry point for the instrumented test. Everything the binding needs must come
# from the consumer rules inside the AAR: no rule for it belongs here.
-keep class com.qrcodeai.consumer.jitpack.ScanBridge { *; }

# Needed with 0.11.0: JNA names desktop AWT classes that Android does not have, and the rules
# inside that AAR do not silence the warning. Later versions ship this rule themselves.
-dontwarn java.awt.*
