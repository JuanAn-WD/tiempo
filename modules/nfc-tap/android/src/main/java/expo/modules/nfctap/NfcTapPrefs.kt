package expo.modules.nfctap

import android.content.Context
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build

/**
 * Native copy of the NFC credential and the block list.
 *
 * The paired tag UID is the only NFC key. The phone-key HMAC is a separate
 * credential and is never stored here. The NDEF URI apartag://tag is not a
 * credential: this file never reads the intent data as a key.
 *
 * A pending event is what JS applies on resume. While pendingId is ahead of
 * ackedId, a JS sync must not overwrite locked: the tap is newer than the
 * JS snapshot that is about to be written.
 */
object NfcTapPrefs {
  const val PREFS_NAME = "apartag_nfc_tap"
  const val ACTION_CHANGED = "app.apartag.nfctap.CHANGED"

  private const val KEY_ONBOARDED = "onboarded"
  private const val KEY_TAG = "tag_id"
  private const val KEY_SPARE = "spare_tag_id"
  private const val KEY_PACKAGES = "packages"
  private const val KEY_OWN = "own_ids"
  private const val KEY_LOCKED = "locked"
  private const val KEY_LOCKED_AT = "locked_at"
  private const val KEY_PENDING_ID = "pending_id"
  private const val KEY_PENDING_ACTION = "pending_action"
  private const val KEY_PENDING_AT = "pending_at"
  private const val KEY_ACKED_ID = "acked_id"

  fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun sync(
    context: Context,
    onboarded: Boolean,
    tagId: String,
    spareTagId: String,
    packages: Collection<String>,
    ownIds: Collection<String>,
    locked: Boolean,
    lockedAt: Long,
  ) {
    val current = prefs(context)
    val pending = current.getLong(KEY_PENDING_ID, 0L)
    val acked = current.getLong(KEY_ACKED_ID, 0L)
    val editor = current.edit()
      .putBoolean(KEY_ONBOARDED, onboarded)
      .putString(KEY_TAG, normalizeStored(tagId))
      .putString(KEY_SPARE, normalizeStored(spareTagId))
      .putStringSet(KEY_PACKAGES, HashSet(packages))
      .putStringSet(KEY_OWN, HashSet(ownIds))
    if (pending <= acked) {
      editor.putBoolean(KEY_LOCKED, locked).putLong(KEY_LOCKED_AT, lockedAt)
    }
    editor.commit()
  }

  fun acknowledge(context: Context, id: Long) {
    if (id <= 0L) return
    val current = prefs(context)
    val pending = current.getLong(KEY_PENDING_ID, 0L)
    val acked = current.getLong(KEY_ACKED_ID, 0L)
    if (id <= acked || id > pending) return
    current.edit().putLong(KEY_ACKED_ID, id).commit()
  }

  fun recordToggle(context: Context, locked: Boolean, at: Long) {
    val current = prefs(context)
    val prev = current.getLong(KEY_PENDING_ID, 0L)
    val id = if (at > prev) at else prev + 1L
    current.edit()
      .putBoolean(KEY_LOCKED, locked)
      .putLong(KEY_LOCKED_AT, if (locked) at else 0L)
      .putLong(KEY_PENDING_ID, id)
      .putString(KEY_PENDING_ACTION, if (locked) "lock" else "unlock")
      .putLong(KEY_PENDING_AT, at)
      .commit()
  }

  fun snapshot(context: Context): Map<String, Any> {
    val current = prefs(context)
    return mapOf(
      "onboarded" to current.getBoolean(KEY_ONBOARDED, false),
      "tagId" to (current.getString(KEY_TAG, "") ?: ""),
      "spareTagId" to (current.getString(KEY_SPARE, "") ?: ""),
      "locked" to current.getBoolean(KEY_LOCKED, false),
      "lockedAt" to current.getLong(KEY_LOCKED_AT, 0L).toDouble(),
      "pendingId" to current.getLong(KEY_PENDING_ID, 0L).toDouble(),
      "pendingAction" to (current.getString(KEY_PENDING_ACTION, "") ?: ""),
      "pendingAt" to current.getLong(KEY_PENDING_AT, 0L).toDouble(),
      "ackedId" to current.getLong(KEY_ACKED_ID, 0L).toDouble(),
    )
  }

  fun isOnboarded(context: Context) = prefs(context).getBoolean(KEY_ONBOARDED, false)

  fun isLocked(context: Context) = prefs(context).getBoolean(KEY_LOCKED, false)

  fun pairedIds(context: Context): List<String> {
    val current = prefs(context)
    return listOf(current.getString(KEY_TAG, ""), current.getString(KEY_SPARE, ""))
      .mapNotNull { normalizeTagId(it) }
  }

  fun packages(context: Context): Set<String> = copySet(context, KEY_PACKAGES)

  fun ownIds(context: Context): Set<String> = copySet(context, KEY_OWN)

  fun emitChanged(context: Context) {
    context.sendBroadcast(
      Intent(ACTION_CHANGED).setPackage(context.packageName),
    )
  }

  /**
   * UID from EXTRA_ID. EXTRA_TAG is only a fallback when the extra is absent.
   * The URI in the intent is ignored.
   */
  fun tagIdFromIntent(intent: Intent): String? {
    val fromExtra = normalizeTagId(intent.getByteArrayExtra(NfcAdapter.EXTRA_ID))
    if (fromExtra != null) return fromExtra
    val tag = if (Build.VERSION.SDK_INT >= 33) {
      intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
    }
    return normalizeTagId(tag?.id)
  }

  fun normalizeTagId(raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    var text = raw.trim()
    if (text.startsWith("0x", ignoreCase = true)) text = text.substring(2)
    val hex = text.filter { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' }.uppercase()
    if (hex.length < 8 || hex.length % 2 != 0) return null
    return hex
  }

  fun normalizeTagId(bytes: ByteArray?): String? {
    if (bytes == null || bytes.isEmpty()) return null
    val hex = bytes.joinToString("") { "%02X".format(it) }
    if (hex.length < 8 || hex.length % 2 != 0) return null
    return hex
  }

  /** 4-byte UID starting with 08 is a Random ID and cannot be a key. */
  fun isUnstable(hex: String): Boolean {
    if (hex.all { it == '0' } || hex.all { it == 'F' }) return true
    if (hex.length == 8 && hex.startsWith("08")) return true
    return false
  }

  private fun normalizeStored(raw: String): String = normalizeTagId(raw) ?: ""

  private fun copySet(context: Context, key: String): Set<String> {
    val stored = prefs(context).getStringSet(key, emptySet()) ?: emptySet()
    return HashSet(stored)
  }
}
