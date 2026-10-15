package expo.modules.nfctap

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings

/**
 * Starts or stops AppBlockerService without a Gradle dependency on that
 * module. Both live in the same app process; the class name and the prefs
 * file are the contract expo-app-blocker already uses.
 */
object NfcTapController {
  const val SERVICE_CLASS = "expo.modules.appblocker.AppBlockerService"
  const val BLOCKER_PREFS = "expo_app_blocker_prefs"
  const val KEY_BLOCKED_PACKAGES = "blocked_packages"
  const val KEY_BLOCKED_PACKAGES_APARTAG = "apartag.blocked_packages"

  private val PACKAGE_ID = Regex("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$")

  enum class Outcome {
    IGNORED,
    LOCKED,
    UNLOCKED,
    WRONG,
    UNSTABLE,
    MISSING,
    NOT_READY,
    NO_PAIRED,
    PERMISSIONS,
    NO_APPS,
    FAILED,
  }

  fun perform(context: Context, presentedId: String?): Outcome {
    if (!NfcTapPrefs.isOnboarded(context)) return Outcome.NOT_READY
    val paired = NfcTapPrefs.pairedIds(context)
    if (paired.isEmpty()) return Outcome.NO_PAIRED
    if (presentedId == null) return Outcome.MISSING
    if (NfcTapPrefs.isUnstable(presentedId)) return Outcome.UNSTABLE
    if (paired.none { it == presentedId }) return Outcome.WRONG

    val at = System.currentTimeMillis()
    if (NfcTapPrefs.isLocked(context)) {
      return try {
        stop(context)
        NfcTapPrefs.recordToggle(context, locked = false, at = at)
        Outcome.UNLOCKED
      } catch (_: Exception) {
        Outcome.FAILED
      }
    }

    if (!hasUsageAccess(context) || !hasOverlay(context)) return Outcome.PERMISSIONS
    val packages = packagesToBlock(NfcTapPrefs.packages(context), NfcTapPrefs.ownIds(context))
    if (packages.isEmpty()) return Outcome.NO_APPS

    return try {
      start(context, packages)
      NfcTapPrefs.recordToggle(context, locked = true, at = at)
      Outcome.LOCKED
    } catch (_: Exception) {
      Outcome.FAILED
    }
  }

  /**
   * Same rule as android-lock.ts: drop slugs and this app, then refuse an
   * empty list. A prefix match would block nothing while looking locked.
   */
  fun packagesToBlock(packages: Collection<String>, ownIds: Collection<String>): List<String> {
    val own = ownIds.map { it.trim().lowercase() }.filter { PACKAGE_ID.matches(it) }.toSet()
    val out = ArrayList<String>()
    for (raw in packages) {
      val id = raw.trim().lowercase()
      if (!PACKAGE_ID.matches(id)) continue
      if (own.contains(id)) continue
      if (!out.contains(id)) out.add(id)
    }
    return out
  }

  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  fun hasOverlay(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    return Settings.canDrawOverlays(context)
  }

  private fun start(context: Context, packages: Collection<String>) {
    writeBlocked(context, packages)
    val intent = serviceIntent(context)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent)
    } else {
      context.startService(intent)
    }
  }

  private fun stop(context: Context) {
    writeBlocked(context, emptyList())
    context.stopService(serviceIntent(context))
  }

  private fun writeBlocked(context: Context, packages: Collection<String>) {
    val primary = HashSet(packages)
    val mirror = HashSet(packages)
    context.getSharedPreferences(BLOCKER_PREFS, Context.MODE_PRIVATE).edit()
      .putStringSet(KEY_BLOCKED_PACKAGES, primary)
      .putStringSet(KEY_BLOCKED_PACKAGES_APARTAG, mirror)
      .commit()
  }

  private fun serviceIntent(context: Context): Intent =
    Intent().setClassName(context, SERVICE_CLASS)
}
