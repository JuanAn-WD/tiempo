package expo.modules.usagestats

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.Process
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

/**
 * Today's foreground time from UsageStatsManager.
 * PACKAGE_USAGE_STATS is already requested for the blocker; this module only reads it.
 * iOS has no equivalent the app can query, so there is no Apple module.
 */
class UsageStatsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UsageStats")

    AsyncFunction("readToday") {
      readTodayResult()
    }
  }

  private fun readTodayResult(): Map<String, Any> {
    val context = appContext.reactContext ?: return denied()
    return try {
      if (!hasUsageAccess(context)) denied() else mapOf("granted" to true, "totalMs" to foregroundToday(context))
    } catch (_: SecurityException) {
      denied()
    }
  }

  private fun denied(): Map<String, Any> = mapOf("granted" to false, "totalMs" to 0.0)

  private fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /**
   * Sum of per-app foreground time since local midnight.
   * On API 29+, totalTimeVisible covers multi-window; some devices still only
   * fill totalTimeInForeground, so the larger of the two is used.
   */
  private fun foregroundToday(context: Context): Double {
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val stats = manager.queryAndAggregateUsageStats(startOfToday(), System.currentTimeMillis())
    var total = 0.0
    for (stat in stats.values) {
      val visible = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) stat.totalTimeVisible else 0L
      val ms = maxOf(visible, stat.totalTimeInForeground)
      if (ms > 0L) total += ms.toDouble()
    }
    return total
  }

  private fun startOfToday(): Long {
    val calendar = Calendar.getInstance()
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
  }
}
