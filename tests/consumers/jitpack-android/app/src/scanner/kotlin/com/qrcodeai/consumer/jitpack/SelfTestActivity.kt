package com.qrcodeai.consumer.jitpack

import android.app.Activity
import android.os.Bundle
import android.util.Log

/**
 * Runs the three scans inside the app itself and logs one verdict line. An instrumented test
 * cannot judge an R8-minified app reliably, so the workflow starts this activity instead.
 */
class SelfTestActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Thread {
            val verdict = try {
                val image = assets.open(MixedScan.FIXTURE).use { it.readBytes() }
                MixedScan.failures(image).ifEmpty { listOf("ok") }.joinToString("; ")
            } catch (error: Throwable) {
                "failed: $error"
            }
            Log.i("SCANNER_SELFTEST", verdict)
        }.start()
    }
}
