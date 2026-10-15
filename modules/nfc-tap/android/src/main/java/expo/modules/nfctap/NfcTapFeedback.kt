package expo.modules.nfctap

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.widget.Toast
import java.util.Locale

/** Toast survives finish(). A notification is only for a lock that could not start. */
object NfcTapFeedback {
  private const val CHANNEL_ID = "apartag_nfc_tap"
  private const val NOTICE_ID = 9107
  private const val BUZZ_MS = 80L

  fun show(context: Context, outcome: NfcTapController.Outcome) {
    val text = message(outcome) ?: return
    buzz(context)
    Toast.makeText(context.applicationContext, text, Toast.LENGTH_SHORT).show()
    when (outcome) {
      NfcTapController.Outcome.PERMISSIONS,
      NfcTapController.Outcome.NO_APPS,
      NfcTapController.Outcome.FAILED,
      -> notify(context, text)
      NfcTapController.Outcome.LOCKED,
      NfcTapController.Outcome.UNLOCKED,
      -> cancel(context)
      else -> Unit
    }
  }

  private fun message(outcome: NfcTapController.Outcome): String? {
    val es = !Locale.getDefault().language.startsWith("en")
    return when (outcome) {
      NfcTapController.Outcome.IGNORED -> null
      NfcTapController.Outcome.LOCKED -> if (es) "Bloqueado." else "Locked."
      NfcTapController.Outcome.UNLOCKED -> if (es) "Desbloqueado." else "Unlocked."
      NfcTapController.Outcome.WRONG -> if (es) "Este no es uno de tus tags." else "This isn’t one of your tags."
      NfcTapController.Outcome.UNSTABLE ->
        if (es) "Esta tarjeta cambia de identificador." else "This card changes its identifier."
      NfcTapController.Outcome.MISSING ->
        if (es) "No se leyó un identificador." else "No identifier was read."
      NfcTapController.Outcome.NOT_READY ->
        if (es) "Termina de preparar Apartag antes de usar el tag." else "Finish setting up Apartag before using the tag."
      NfcTapController.Outcome.NO_PAIRED ->
        if (es) "No hay un tag emparejado." else "No tag is paired."
      NfcTapController.Outcome.PERMISSIONS ->
        if (es) "Faltan permisos para bloquear. No se ha cambiado nada."
        else "Permissions are missing, so nothing was locked."
      NfcTapController.Outcome.NO_APPS ->
        if (es) "No hay apps elegidas. No se ha bloqueado nada."
        else "No apps are selected, so nothing was locked."
      NfcTapController.Outcome.FAILED ->
        if (es) "No se pudo cambiar el bloqueo."
        else "The lock could not be changed."
    }
  }

  private fun buzz(context: Context) {
    val vibrator = vibrator(context) ?: return
    if (!vibrator.hasVibrator()) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createOneShot(BUZZ_MS, VibrationEffect.DEFAULT_AMPLITUDE))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(BUZZ_MS)
    }
  }

  private fun vibrator(context: Context): Vibrator? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val manager = context.getSystemService(VibratorManager::class.java) ?: return null
      manager.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
  }

  private fun notify(context: Context, text: String) {
    if (Build.VERSION.SDK_INT >= 33 &&
      context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Apartag", NotificationManager.IMPORTANCE_DEFAULT),
      )
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val pending = if (launch == null) {
      null
    } else {
      PendingIntent.getActivity(
        context,
        0,
        launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
    val icon = context.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.stat_notify_more
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
    }
    builder
      .setSmallIcon(icon)
      .setContentTitle("Apartag")
      .setContentText(text)
      .setAutoCancel(true)
    if (pending != null) builder.setContentIntent(pending)
    manager.notify(NOTICE_ID, builder.build())
  }

  private fun cancel(context: Context) {
    context.getSystemService(NotificationManager::class.java)?.cancel(NOTICE_ID)
  }
}
