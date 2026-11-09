package com.qrcodeai.consumer.jitpack

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

/** Scans the shared mixed fixture through the app's own code, one test per profile. */
@RunWith(AndroidJUnit4::class)
class MixedScanTest {
    private fun fixture(): ByteArray =
        InstrumentationRegistry.getInstrumentation().targetContext.assets
            .open(MixedScan.FIXTURE).use { it.readBytes() }

    @Test
    fun fastProfileReturnsBothContents() {
        assertEquals(MixedScan.expected, MixedScan.contents(fixture(), "fast"))
    }

    @Test
    fun fullProfileReturnsBothContents() {
        assertEquals(MixedScan.expected, MixedScan.contents(fixture(), "full"))
    }

    @Test
    fun frameProfileReturnsBothContents() {
        assertEquals(MixedScan.expected, MixedScan.contents(fixture(), "frame"))
    }
}
