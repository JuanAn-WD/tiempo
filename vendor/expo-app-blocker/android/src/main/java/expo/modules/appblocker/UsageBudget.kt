package expo.modules.appblocker

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.Process
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale

/**
 * Daily foreground budget for the apps Apartag is blocking.
 *
 * Mirrors `src/lib/usage-budget.ts`: strict or 0 minutes blocks immediately,
 * otherwise the app stays open until today's usage is spent. Usage is the
 * higher of the persisted tick counter and UsageStatsManager since local
 * midnight, so a restart does not hand the time back. A later local day
 * clears the counter. A clock set backwards does not.
 *
 * The service and the JS bridge both touch these prefs. Mutations of the
 * used-time map are serialized.
 */
object UsageBudget {
  const val MAX_MINUTES = 240
  const val DEFAULT_MINUTES = 15
  const val MAX_TICK_DELTA_MS = 60_000L

  private const val KEY_STRICT = "usage_budget_strict"
  private const val KEY_DEFAULT = "usage_budget_default_minutes"
  private const val KEY_OVERRIDES = "usage_budget_overrides"
  private const val KEY_DAY = "usage_budget_day"
  private const val KEY_USED = "usage_budget_used_ms"

  private val gate = Any()

  data class Config(
    val strict: Boolean,
    val defaultMinutes: Int,
    val overrides: Map<String, Int>,
  )

  fun clampMinutes(value: Int): Int = value.coerceIn(0, MAX_MINUTES)

  /** Strict, or a non-positive allowance, is the current immediate block. */
  fun allowanceMinutes(config: Config, packageName: String): Int {
    if (config.strict) return 0
    val minutes = config.overrides[packageName] ?: config.defaultMinutes
    return clampMinutes(minutes)
  }

  fun shouldBlock(allowanceMinutes: Int, usedMs: Long): Boolean {
    if (allowanceMinutes <= 0) return true
    return usedMs.coerceAtLeast(0L) >= allowanceMinutes * 60_000L
  }

  fun mergeUsed(persistedMs: Long, statsMs: Long): Long =
    maxOf(persistedMs.coerceAtLeast(0L), statsMs.coerceAtLeast(0L))

  fun tickDelta(now: Long, previous: Long): Long {
    if (previous <= 0L) return 0L
    val delta = now - previous
    if (delta <= 0L) return 0L
    return delta.coerceAtMost(MAX_TICK_DELTA_MS)
  }

  fun localDayKey(now: Long): String {
    val calendar = Calendar.getInstance()
    calendar.timeInMillis = now
    return String.format(
      Locale.US,
      "%04d-%02d-%02d",
      calendar.get(Calendar.YEAR),
      calendar.get(Calendar.MONTH) + 1,
      calendar.get(Calendar.DAY_OF_MONTH),
    )
  }

  fun readConfig(context: Context): Config {
    val prefs = AppBlockerPrefs.get(context)
    val strict = prefs.getBoolean(KEY_STRICT, true)
    val defaultMinutes = clampMinutes(prefs.getInt(KEY_DEFAULT, DEFAULT_MINUTES))
    return Config(strict, defaultMinutes, readOverrides(prefs.getString(KEY_OVERRIDES, null)))
  }

  fun writeConfig(context: Context, strict: Boolean, defaultMinutes: Int, overrides: Map<String, Int>) {
    val clean = JSONObject()
    for ((key, value) in overrides) {
      if (!key.contains('.')) continue
      clean.put(key, clampMinutes(value))
    }
    AppBlockerPrefs.get(context).edit()
      .putBoolean(KEY_STRICT, strict)
      .putInt(KEY_DEFAULT, clampMinutes(defaultMinutes))
      .putString(KEY_OVERRIDES, clean.toString())
      .commit()
  }

  /**
   * Drop yesterday's counter once the local day moves forward.
   * If [stored] is later than [today], the clock went backwards: keep it.
   */
  fun rollDay(context: Context, now: Long) {
    synchronized(gate) {
      val prefs = AppBlockerPrefs.get(context)
      val today = localDayKey(now)
      val stored = prefs.getString(KEY_DAY, null)
      if (stored == null || stored == today) {
        if (stored == null) prefs.edit().putString(KEY_DAY, today).commit()
        return
      }
      if (stored < today) {
        prefs.edit()
          .putString(KEY_DAY, today)
          .putString(KEY_USED, "{}")
          .commit()
      }
    }
  }

  fun persistedMs(context: Context, packageName: String): Long {
    synchronized(gate) {
      return readUsedLocked(context).optLong(packageName, 0L).coerceAtLeast(0L)
    }
  }

  fun setPersistedMs(context: Context, packageName: String, usedMs: Long) {
    synchronized(gate) {
      val used = readUsedLocked(context)
      used.put(packageName, usedMs.coerceAtLeast(0L))
      AppBlockerPrefs.get(context).edit()
        .putString(KEY_DAY, AppBlockerPrefs.get(context).getString(KEY_DAY, null) ?: localDayKey(System.currentTimeMillis()))
        .putString(KEY_USED, used.toString())
        .commit()
    }
  }

  /**
   * Foreground time for [packageName] since local midnight, from
   * UsageStatsManager. 0 when usage access is missing or the query fails.
   * `totalTimeVisible` covers multi-window on API 29+; some devices only
   * fill `totalTimeInForeground`, so the larger one wins.
   */
  fun statsMs(context: Context, packageName: String, now: Long): Long {
    if (!hasUsageAccess(context)) return 0L
    return try {
      val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val stats = manager.queryAndAggregateUsageStats(startOfLocalDay(now), now) ?: return 0L
      val stat = stats[packageName] ?: return 0L
      val visible = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) stat.totalTimeVisible else 0L
      maxOf(visible, stat.totalTimeInForeground).coerceAtLeast(0L)
    } catch (_: SecurityException) {
      0L
    } catch (_: RuntimeException) {
      0L
    }
  }

  /** Higher of the persisted counter and UsageStats, and the counter catches up. */
  fun mergedUsed(context: Context, packageName: String, now: Long): Long {
    rollDay(context, now)
    val persisted = persistedMs(context, packageName)
    val stats = statsMs(context, packageName, now)
    val used = mergeUsed(persisted, stats)
    if (used > persisted) setPersistedMs(context, packageName, used)
    return used
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

  private fun readUsedLocked(context: Context): JSONObject {
    return try {
      JSONObject(AppBlockerPrefs.get(context).getString(KEY_USED, null) ?: "{}")
    } catch (_: Exception) {
      JSONObject()
    }
  }

  private fun readOverrides(raw: String?): Map<String, Int> {
    if (raw.isNullOrBlank()) return emptyMap()
    return try {
      val json = JSONObject(raw)
      val out = HashMap<String, Int>()
      val keys = json.keys()
      while (keys.hasNext()) {
        val key = keys.next()
        if (!key.contains('.')) continue
        out[key] = clampMinutes(json.optInt(key, 0))
      }
      out
    } catch (_: Exception) {
      emptyMap()
    }
  }

  private fun startOfLocalDay(now: Long): Long {
    val calendar = Calendar.getInstance()
    calendar.timeInMillis = now
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
  }
}
