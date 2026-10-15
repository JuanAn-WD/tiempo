package expo.modules.nfctap

import android.app.Activity
import android.content.Intent
import android.nfc.NfcAdapter
import android.os.Bundle

/**
 * Handles one NFC tap and finishes before the first frame.
 * It never starts the React Native activity.
 */
class NfcTapActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    overridePendingTransition(0, 0)
    try {
      handle(intent)
    } finally {
      finish()
      overridePendingTransition(0, 0)
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    try {
      handle(intent)
    } finally {
      finish()
      overridePendingTransition(0, 0)
    }
  }

  override fun onResume() {
    super.onResume()
    if (!isFinishing) finish()
  }

  private fun handle(intent: Intent?) {
    if (intent == null) return
    val action = intent.action
    if (action != NfcAdapter.ACTION_NDEF_DISCOVERED && action != NfcAdapter.ACTION_TAG_DISCOVERED) {
      return
    }
    val id = NfcTapPrefs.tagIdFromIntent(intent)
    val outcome = NfcTapController.perform(this, id)
    NfcTapFeedback.show(this, outcome)
    if (outcome == NfcTapController.Outcome.LOCKED || outcome == NfcTapController.Outcome.UNLOCKED) {
      NfcTapPrefs.emitChanged(this)
    }
  }
}
