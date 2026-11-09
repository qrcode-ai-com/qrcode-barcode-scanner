package com.qrcodeai.consumer.jitpack

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.nio.ByteBuffer
import org.json.JSONObject

/**
 * The shared truth case `qr-and-code128` (fixtures/consumer-truth.json): one image that holds a
 * QR code and a Code 128. Every profile must return both contents, with a final report.
 */
object MixedScan {
    const val FIXTURE = "mixed-code128-qr.png"

    val expected = setOf(
        "qr_code" to "https://qrc-ai.com/76xMa",
        "code128" to "STOCK-4827",
    )

    /** Scans the image with one profile and returns its contents. */
    fun contents(image: ByteArray, profile: String): Set<Pair<String, String>> {
        val json = if (profile == "frame") frame(image) else ScanBridge.scanImage(image, profile)
        val report = JSONObject(json)
        check(!report.getJSONObject("trace").optBoolean("budget_exhausted", false)) {
            "$profile: the report is not final"
        }
        val detections = report.getJSONArray("detections")
        return (0 until detections.length()).map { index ->
            val detection = detections.getJSONObject(index)
            detection.getString("symbology") to detection.getJSONObject("content").getString("text")
        }.toSet()
    }

    /** Returns one line per profile whose contents differ from the truth. */
    fun failures(image: ByteArray): List<String> =
        listOf("fast", "full", "frame").mapNotNull { profile ->
            val found = contents(image, profile)
            if (found == expected) null else "failed: $profile returned $found"
        }

    private fun frame(image: ByteArray): String {
        val options = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 }
        val bitmap = BitmapFactory.decodeByteArray(image, 0, image.size, options)
        // ARGB_8888 stores each pixel as R, G, B, A bytes, which is the frame layout.
        val rgba = ByteBuffer.allocate(bitmap.byteCount)
        bitmap.copyPixelsToBuffer(rgba)
        return ScanBridge.scanRgba(rgba.array(), bitmap.width, bitmap.height)
    }
}
