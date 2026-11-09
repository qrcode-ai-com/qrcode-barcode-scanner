# Everything the binding needs must come from the consumer rules inside the AAR.
#
# Needed with 0.11.0 only: JNA names desktop AWT classes that Android does not have, and the
# rules inside that AAR do not silence the warning. Later versions ship this rule themselves.
-dontwarn java.awt.*
