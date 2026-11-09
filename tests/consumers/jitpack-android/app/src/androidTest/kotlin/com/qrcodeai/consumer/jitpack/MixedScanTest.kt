package com.qrcodeai.consumer.jitpack

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.nio.ByteBuffer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The shared truth case `qr-and-code128` (fixtures/consumer-truth.json): one image that holds a
 * QR code and a Code 128. Every profile must return both contents, with a final report.
 */
@RunWith(AndroidJUnit4::class)
class MixedScanTest {
    private val expected = setOf(
        "qr_code" to "https://qrc-ai.com/76xMa",
        "code128" to "STOCK-4827",
    )

    private fun fixture(): ByteArray =
        InstrumentationRegistry.getInstrumentation().context.assets
            .open("mixed-code128-qr.png").use { it.readBytes() }

    private fun contents(json: String): Set<Pair<String, String>> {
        val report = JSONObject(json)
        assertFalse(
            "the report must be final",
            report.getJSONObject("trace").optBoolean("budget_exhausted", false),
        )
        val detections = report.getJSONArray("detections")
        return (0 until detections.length()).map { index ->
            val detection = detections.getJSONObject(index)
            detection.getString("symbology") to detection.getJSONObject("content").getString("text")
        }.toSet()
    }

    @Test
    fun fastProfileReturnsBothContents() {
        assertEquals(expected, contents(ScanBridge.scanImage(fixture(), "fast")))
    }

    @Test
    fun fullProfileReturnsBothContents() {
        assertEquals(expected, contents(ScanBridge.scanImage(fixture(), "full")))
    }

    @Test
    fun frameProfileReturnsBothContents() {
        val bytes = fixture()
        val options = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
        // ARGB_8888 stores each pixel as R, G, B, A bytes, which is the frame layout.
        val rgba = ByteBuffer.allocate(bitmap.byteCount)
        bitmap.copyPixelsToBuffer(rgba)
        assertEquals(
            expected,
            contents(ScanBridge.scanRgba(rgba.array(), bitmap.width, bitmap.height)),
        )
    }
}
