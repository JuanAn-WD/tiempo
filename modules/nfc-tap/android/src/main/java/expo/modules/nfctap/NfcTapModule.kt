package expo.modules.nfctap

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NfcTapModule : Module() {
  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("NfcTap")
    Events("onTap")

    OnStartObserving("onTap") {
      listen()
    }

    OnStopObserving("onTap") {
      stopListening()
    }

    OnDestroy {
      stopListening()
    }

    Function("sync") {
        onboarded: Boolean,
        tagId: String,
        spareTagId: String,
        packages: List<String>,
        ownIds: List<String>,
        locked: Boolean,
        lockedAt: Double,
      ->
      val context = appContext.reactContext ?: return@Function null
      NfcTapPrefs.sync(
        context,
        onboarded,
        tagId,
        spareTagId,
        packages,
        ownIds,
        locked,
        lockedAt.toLong(),
      )
      null
    }

    Function("read") {
      val context = appContext.reactContext ?: return@Function emptyMap<String, Any>()
      NfcTapPrefs.snapshot(context)
    }

    Function("acknowledge") { pendingId: Double ->
      val context = appContext.reactContext ?: return@Function null
      NfcTapPrefs.acknowledge(context, pendingId.toLong())
      null
    }
  }

  private fun listen() {
    if (receiver != null) return
    val context = appContext.reactContext ?: return
    val next = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context?, intent: Intent?) {
        sendEvent("onTap", mapOf("at" to System.currentTimeMillis().toDouble()))
      }
    }
    val filter = IntentFilter(NfcTapPrefs.ACTION_CHANGED)
    if (Build.VERSION.SDK_INT >= 33) {
      context.registerReceiver(next, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      context.registerReceiver(next, filter)
    }
    receiver = next
  }

  private fun stopListening() {
    val current = receiver ?: return
    receiver = null
    val context = appContext.reactContext ?: return
    try {
      context.unregisterReceiver(current)
    } catch (_: IllegalArgumentException) {
      /* already unregistered */
    }
  }
}
