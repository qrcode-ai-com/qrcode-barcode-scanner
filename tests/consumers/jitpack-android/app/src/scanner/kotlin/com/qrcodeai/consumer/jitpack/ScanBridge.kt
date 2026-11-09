package com.qrcodeai.consumer.jitpack

import uniffi.qrcode_ai_scanner_uniffi.scan
import uniffi.qrcode_ai_scanner_uniffi.scanFrame

/** The app code that calls the binding, so R8 judges a real call path. */
object ScanBridge {
    /** Scans encoded image bytes and returns the report as JSON. */
    fun scanImage(image: ByteArray, profile: String): String = scan(image, profile)

    /** Scans a raw RGBA frame with the frame profile and returns the report as JSON. */
    fun scanRgba(rgba: ByteArray, width: Int, height: Int): String =
        scanFrame(rgba, width.toUInt(), height.toUInt())
}
