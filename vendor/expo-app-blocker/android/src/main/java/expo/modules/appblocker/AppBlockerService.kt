package expo.modules.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

class AppBlockerService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var lastForegroundPackage: String? = null
  // Last *known* foreground app. UsageStats only reports recent transitions, so a
  // poll can momentarily read null while the user sits in one app — we retain the
  // last non-null reading so earned-time consumption and re-blocking stay reliable.
  private var currentForeground: String? = null
  private lateinit var overlayManager: OverlayManager
  private val unlockController by lazy { TemporaryUnlockController(this) }
  // Timestamp of the last tick spent consuming earned time; 0 when not consuming.
  private var consumingSinceMs = 0L
  // Whether a block is currently being enforced (overlay shown / app redirected).
  private var blocking = false

  private val pollRunnable = object : Runnable {
    override fun run() {
      tick()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  private fun tick() {
    getCurrentForegroundPackage()?.let { currentForeground = it }
    val foreground = currentForeground

    if (foreground == null || !isBlocked(foreground)) {
      // Outside any blocked app: pause consumption and drop any active block.
      consumingSinceMs = 0L
      clearBlock()
      lastForegroundPackage = foreground
      return
    }

    if (unlockController.hasTimeLeft) {
      // Inside a blocked app with earned time — spend it and keep the app usable.
      val now = System.currentTimeMillis()
      if (consumingSinceMs > 0L) unlockController.consume(now - consumingSinceMs)
      consumingSinceMs = now
      if (unlockController.hasTimeLeft) {
        clearBlock()
      } else {
        // Earned time ran out while still inside the app.
        Log.d(TAG, "Earned time exhausted in foreground app: $foreground")
        enforceBlock(foreground, BlockReason.EXPIRED)
      }
    } else {
      // Inside a blocked app with no earned time — block on entry.
      consumingSinceMs = 0L
      if (!blocking || foreground != lastForegroundPackage) {
        Log.d(TAG, "Blocked app in foreground: $foreground")
        enforceBlock(foreground, BlockReason.OPENED)
      }
    }
    lastForegroundPackage = foreground
  }

  private fun clearBlock() {
    if (blocking) {
      overlayManager.hide()
      blocking = false
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    Log.d(TAG, "AppBlockerService onCreate")
    overlayManager = OverlayManager(this)
    createChannelsIfNeeded()
    try {
      enterForeground()
      running = true
    } catch (e: Exception) {
      // Android 14+ throws if startForeground() has no type, or if specialUse
      // is missing its subtype property / the matching permissions. A dead
      // service leaves the JS session looking locked while apps open normally.
      Log.e(TAG, "startForeground failed; blocking will not run", e)
      running = false
      stopSelf()
      return
    }
    handler.post(pollRunnable)
  }

  private fun enterForeground() {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val type = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE or
        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
      startForeground(NOTIFICATION_ID, notification, type)
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun isBlocked(packageName: String): Boolean =
    packageName in AppBlockerPrefs.getBlockedPackages(this)

  private fun enforceBlock(packageName: String, reason: BlockReason) {
    overlayManager.show(packageName, reason)
    showBlockedNotification(packageName, reason)
    recordIntercept(packageName)
    blocking = true
    consumingSinceMs = 0L
  }

  /** Queue this block event for the app to drain (debounced in prefs). */
  private fun recordIntercept(packageName: String) {
    val appName = try {
      val pm = this.packageManager
      pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
    } catch (e: Exception) {
      packageName
    }
    AppBlockerPrefs.appendIntercept(this, appName, System.currentTimeMillis())
  }

  private fun showBlockedNotification(packageName: String, reason: BlockReason) {
    val appName = try {
      val pm = this.packageManager
      val appInfo = pm.getApplicationInfo(packageName, 0)
      pm.getApplicationLabel(appInfo).toString()
    } catch (e: Exception) {
      packageName
    }

    val title = AppBlockerPrefs.getNotificationTitle(this).replace("{appName}", appName)
    val text = AppBlockerPrefs.getNotificationText(this).replace("{appName}", appName)

    val scheme = getAppScheme()
    val deepLinkIntent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse(
        "${scheme}://blocked?app=${Uri.encode(appName)}" +
          "&package=${Uri.encode(packageName)}&reason=${reason.slug}"
      )
    ).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    val launchIntent = packageManager.getLaunchIntentForPackage(this.packageName)
      ?.apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP) }

    val resolvedIntent = try {
      deepLinkIntent.resolveActivity(packageManager)?.let { deepLinkIntent } ?: launchIntent
    } catch (e: Exception) {
      launchIntent
    } ?: deepLinkIntent

    val pendingIntent = PendingIntent.getActivity(
      this, packageName.hashCode(), resolvedIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(this, BLOCKED_CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(applicationInfo.icon)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(pendingIntent)
      .build()

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(BLOCKED_NOTIFICATION_ID, notification)
  }

  private fun getAppScheme(): String {
    val resId = resources.getIdentifier("expo_app_blocker_scheme", "string", packageName)
    if (resId != 0) return getString(resId)
    return try {
      packageManager.getLaunchIntentForPackage(packageName)?.data?.scheme
        ?: packageName.replace(".", "-")
    } catch (e: Exception) {
      packageName.replace(".", "-")
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_TEMPORARY_UNLOCK -> {
        val minutes = intent.getIntExtra(EXTRA_DURATION_MINUTES, 0)
        Log.d(TAG, "Granting $minutes minutes of earned time")
        unlockController.grant(minutes)
        consumingSinceMs = 0L
        clearBlock()
      }
      ACTION_RELOCK -> {
        Log.d(TAG, "Relock: dropping earned time")
        unlockController.clear()
        consumingSinceMs = 0L
        // Forget the last-seen app so a blocked app already in the foreground is
        // re-blocked on the next poll. Clearing currentForeground too avoids a
        // stale reading wrongly blocking a non-blocked app if the next poll reads null.
        lastForegroundPackage = null
        currentForeground = null
        clearBlock()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    Log.d(TAG, "AppBlockerService onDestroy")
    running = false
    handler.removeCallbacks(pollRunnable)
    overlayManager.hide()
    super.onDestroy()
  }

  /**
   * Latest resumed activity in a wide window.
   *
   * MOVE_TO_FOREGROUND is deprecated on Android 10 (API 29). AOSP aliases it to
   * ACTIVITY_RESUMED, but several OEM builds (Xiaomi, Samsung) only deliver
   * ACTIVITY_RESUMED and can delay the event well past a 10s lookback. A short
   * window then returns nothing, the service keeps the previous app (often
   * Apartag itself), and the blocked app stays usable.
   */
  private fun getCurrentForegroundPackage(): String? {
    val usageStatsManager =
      getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val endTime = System.currentTimeMillis()
    val beginTime = endTime - LOOKBACK_WINDOW_MS
    val fromEvents = latestResumedPackage(usageStatsManager, beginTime, endTime)
    if (fromEvents != null) return fromEvents
    return latestUsageStatsPackage(usageStatsManager, endTime)
  }

  private fun latestResumedPackage(
    usageStatsManager: UsageStatsManager,
    beginTime: Long,
    endTime: Long,
  ): String? {
    val events = usageStatsManager.queryEvents(beginTime, endTime) ?: return null
    val event = UsageEvents.Event()
    var latestForeground: String? = null
    var latestTimestamp = Long.MIN_VALUE
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (!isResumeEvent(event.eventType)) continue
      val packageName = event.packageName ?: continue
      if (packageName.isEmpty() || isIgnorablePackage(packageName)) continue
      if (event.timeStamp >= latestTimestamp) {
        latestTimestamp = event.timeStamp
        latestForeground = packageName
      }
    }
    return latestForeground
  }

  private fun isResumeEvent(type: Int): Boolean {
    if (type == UsageEvents.Event.MOVE_TO_FOREGROUND) return true
    // ACTIVITY_RESUMED exists from API 29. The compiler inlines the constant.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
      type == UsageEvents.Event.ACTIVITY_RESUMED
    ) {
      return true
    }
    return false
  }

  private fun latestUsageStatsPackage(usageStatsManager: UsageStatsManager, now: Long): String? {
    val stats = usageStatsManager.queryUsageStats(
      UsageStatsManager.INTERVAL_BEST,
      now - LOOKBACK_WINDOW_MS,
      now,
    ) ?: return null
    var best: UsageStats? = null
    for (stat in stats) {
      val name = stat.packageName ?: continue
      if (isIgnorablePackage(name)) continue
      if (best == null || stat.lastTimeUsed > best.lastTimeUsed) best = stat
    }
    if (best == null) return null
    if (now - best.lastTimeUsed > STATS_FRESH_MS) return null
    return best.packageName
  }

  private fun isIgnorablePackage(packageName: String): Boolean {
    if (packageName == this.packageName) return true
    return packageName == "android" ||
      packageName == "com.android.systemui" ||
      packageName.startsWith("com.android.permissioncontroller")
  }

  private fun createChannelsIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

      val serviceChannel = NotificationChannel(
        CHANNEL_ID, "App Blocker", NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Keeps the app blocker running"
        setShowBadge(false)
      }
      manager.createNotificationChannel(serviceChannel)

      val blockedChannel = NotificationChannel(
        BLOCKED_CHANNEL_ID, "Blocked App Alerts", NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Notifications when a blocked app is detected"
      }
      manager.createNotificationChannel(blockedChannel)
    }
  }

  private fun buildNotification(): Notification =
    NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("App Blocker")
      .setContentText("Monitoring blocked apps")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()

  companion object {
    private const val TAG = "ExpoAppBlocker"
    private const val CHANNEL_ID = "expo_app_blocker_channel"
    private const val BLOCKED_CHANNEL_ID = "expo_app_blocker_blocked"
    private const val NOTIFICATION_ID = 9001
    private const val BLOCKED_NOTIFICATION_ID = 9002
    // 1s keeps up with an app switch without a 500ms busy loop that OEM
    // battery savers freeze. The lookback is much wider than the poll so a
    // delayed UsageEvents batch is still visible on the next ticks.
    private const val POLL_INTERVAL_MS = 1_000L
    private const val LOOKBACK_WINDOW_MS = 120_000L
    private const val STATS_FRESH_MS = 20_000L

    @Volatile
    private var running = false

    fun isRunning(): Boolean = running
    private const val ACTION_TEMPORARY_UNLOCK = "expo.modules.appblocker.TEMPORARY_UNLOCK"
    private const val ACTION_RELOCK = "expo.modules.appblocker.RELOCK"
    private const val EXTRA_DURATION_MINUTES = "duration_minutes"

    fun start(context: Context) {
      startCommand(context, Intent(context, AppBlockerService::class.java))
    }

    fun stop(context: Context) {
      val intent = Intent(context, AppBlockerService::class.java)
      context.stopService(intent)
    }

    fun temporaryUnlock(context: Context, durationMinutes: Int) {
      val intent = Intent(context, AppBlockerService::class.java).apply {
        action = ACTION_TEMPORARY_UNLOCK
        putExtra(EXTRA_DURATION_MINUTES, durationMinutes)
      }
      startCommand(context, intent)
    }

    fun relock(context: Context) {
      val intent = Intent(context, AppBlockerService::class.java).apply {
        action = ACTION_RELOCK
      }
      startCommand(context, intent)
    }

    private fun startCommand(context: Context, intent: Intent) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }
  }
}
