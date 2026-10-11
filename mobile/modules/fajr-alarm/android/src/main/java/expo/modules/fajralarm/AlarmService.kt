package expo.modules.fajralarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

/**
 * Keeps the alarm sounding until the wake is verified (or its 30-minute cap). Runs as a foreground
 * service so the sound survives the app being swiped away and the screen being locked. The sound
 * plays on the alarm stream, so it follows the phone's alarm volume and sounds through Do Not
 * Disturb the way any alarm clock does.
 */
class AlarmService : Service() {
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wake: PowerManager.WakeLock? = null
  private val main = Handler(Looper.getMainLooper())
  private var volume = 0f

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_RING -> ring()
      ACTION_SILENCE -> silence(intent.getLongExtra(EXTRA_UNTIL, 0L))
      ACTION_STOP -> finish(missed = false)
      else -> {
        // Restarted by the system (START_STICKY) with no intent: resume if an alarm is still due.
        val r = AlarmStore.ringing(this)
        if (r != null && r.silencedUntil <= System.currentTimeMillis()) ring() else stopSelf()
      }
    }
    return START_STICKY
  }

  private fun ring() {
    val r = AlarmStore.ringing(this)
    if (r == null) { stopSelf(); return }
    val now = System.currentTimeMillis()
    if (now - r.since > AlarmStore.MAX_RING_MS) { finish(missed = true); return }
    goForeground(ringingNotification(r))
    acquireWake()
    startSound(r.alarm.sound)
    startVibration()
    AlarmStore.cancelResume(this)
    broadcastChanged()
    // Give up at the cap: a phone nobody picks up shouldn't ring until the battery dies.
    main.removeCallbacksAndMessages(TOKEN_CAP)
    main.postAtTime({ finish(missed = true) }, TOKEN_CAP, android.os.SystemClock.uptimeMillis() + (AlarmStore.MAX_RING_MS - (now - r.since)))
    // Bring the alarm screen up directly too when the phone is in use (full-screen intents only
    // take over a locked or sleeping screen).
    try {
      startActivity(Intent(this, AlarmActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (e: Exception) {
      // Background activity starts may be refused; the heads-up notification still shows.
    }
  }

  /** Wudu scanned: quiet until [until], then ring again unless the prayer mat is scanned first. */
  private fun silence(until: Long) {
    val r = AlarmStore.ringing(this) ?: run { stopSelf(); return }
    stopSound()
    main.removeCallbacksAndMessages(TOKEN_CAP)
    AlarmStore.setRinging(this, r.copy(silencedUntil = until))
    AlarmStore.armResume(this, until)
    goForeground(waitingNotification(r.alarm, until))
    broadcastChanged()
    stopForegroundCompat(detach = true)
    releaseWake()
    stopSelf()
  }

  /** Verified (or the cap ran out): stop everything and clear the ringing state. */
  private fun finish(missed: Boolean) {
    val r = AlarmStore.ringing(this)
    stopSound()
    main.removeCallbacksAndMessages(TOKEN_CAP)
    AlarmStore.cancelResume(this)
    AlarmStore.setRinging(this, null)
    nm().cancel(NOTIF_ID)
    if (missed && r != null) nm().notify(NOTIF_MISSED, missedNotification(r.alarm))
    broadcastChanged()
    stopForegroundCompat(detach = false)
    releaseWake()
    stopSelf()
  }

  override fun onDestroy() {
    stopSound()
    releaseWake()
    main.removeCallbacksAndMessages(null)
    super.onDestroy()
  }

  /* ---------------------------------------------------------------- Sound */

  private fun startSound(sound: String) {
    stopSound()
    val uri = soundUri(this, sound)
    if (uri == null) return // "silent": vibration only
    try {
      player = MediaPlayer().apply {
        setAudioAttributes(ALARM_AUDIO)
        setDataSource(this@AlarmService, uri)
        isLooping = true
        setWakeMode(this@AlarmService, PowerManager.PARTIAL_WAKE_LOCK)
        setVolume(0.3f, 0.3f)
        prepare()
        start()
      }
      // Rise gently from 30% to full alarm volume over ~20 s.
      volume = 0.3f
      rampVolume()
    } catch (e: Exception) {
      Log.w(TAG, "Alarm sound failed, falling back to the system alarm tone", e)
      if (sound != SOUND_SYSTEM) startSound(SOUND_SYSTEM)
    }
  }

  private fun rampVolume() {
    main.postDelayed({
      val p = player ?: return@postDelayed
      volume = (volume + 0.07f).coerceAtMost(1f)
      try { p.setVolume(volume, volume) } catch (e: Exception) { return@postDelayed }
      if (volume < 1f) rampVolume()
    }, 2000)
  }

  private fun stopSound() {
    try { player?.stop() } catch (e: Exception) { }
    player?.release()
    player = null
    vibrator?.cancel()
    vibrator = null
  }

  private fun startVibration() {
    val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
      @Suppress("DEPRECATION") getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    } ?: return
    if (!v.hasVibrator()) return
    vibrator = v
    val pattern = longArrayOf(0, 700, 500, 700, 1200)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        v.vibrate(VibrationEffect.createWaveform(pattern, 0), ALARM_AUDIO)
      } else {
        @Suppress("DEPRECATION") v.vibrate(VibrationEffect.createWaveform(pattern, 0), ALARM_AUDIO)
      }
    } else {
      @Suppress("DEPRECATION") v.vibrate(pattern, 0)
    }
  }

  private fun acquireWake() {
    if (wake?.isHeld == true) return
    wake = getSystemService(PowerManager::class.java)?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ibtida:fajr-alarm")?.apply {
      setReferenceCounted(false)
      acquire(AlarmStore.MAX_RING_MS + 60_000)
    }
  }

  private fun releaseWake() {
    try { if (wake?.isHeld == true) wake?.release() } catch (e: Exception) { }
    wake = null
  }

  /* -------------------------------------------------------- Notifications */

  private fun nm() = getSystemService(NotificationManager::class.java)!!

  private fun goForeground(n: Notification) {
    ensureChannels(this)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(NOTIF_ID, n)
    }
  }

  private fun stopForegroundCompat(detach: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(if (detach) STOP_FOREGROUND_DETACH else STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION") stopForeground(!detach)
    }
  }

  private fun alarmScreen(): PendingIntent = PendingIntent.getActivity(
    this, 1, Intent(this, AlarmActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )

  private fun openApp(url: String): PendingIntent {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
    val i = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      component = launch.component
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    return PendingIntent.getActivity(this, 2, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun builder(channel: String): Notification.Builder =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, channel)
    else @Suppress("DEPRECATION") Notification.Builder(this)

  private fun ringingNotification(r: Ringing): Notification = builder(CH_RINGING)
    .setSmallIcon(smallIcon())
    .setContentTitle(r.alarm.title)
    .setContentText(if (r.alarm.verify) "Scan your wudu station to stop the alarm" else r.alarm.body)
    .setStyle(Notification.BigTextStyle().bigText(r.alarm.body))
    .setCategory(Notification.CATEGORY_ALARM)
    .setPriority(@Suppress("DEPRECATION") Notification.PRIORITY_MAX)
    .setVisibility(Notification.VISIBILITY_PUBLIC)
    .setOngoing(true)
    .setAutoCancel(false)
    .setContentIntent(alarmScreen())
    .setFullScreenIntent(alarmScreen(), true)
    .build()
    .apply { flags = flags or Notification.FLAG_INSISTENT or Notification.FLAG_NO_CLEAR }

  private fun waitingNotification(a: Alarm, until: Long): Notification = builder(CH_WAITING)
    .setSmallIcon(smallIcon())
    .setContentTitle("Wudu verified · now your prayer mat")
    .setContentText("Scan your prayer mat by ${clock(until)} or the alarm rings again")
    .setCategory(Notification.CATEGORY_ALARM)
    .setOngoing(true)
    .setVisibility(Notification.VISIBILITY_PUBLIC)
    .setContentIntent(openApp(a.url))
    .build()

  private fun missedNotification(a: Alarm): Notification = builder(CH_WAITING)
    .setSmallIcon(smallIcon())
    .setContentTitle("Fajr wake alarm stopped")
    .setContentText("It rang for 30 minutes without being verified.")
    .setAutoCancel(true)
    .setContentIntent(openApp("ibtida://prayer"))
    .build()

  private fun clock(ms: Long): String =
    java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT).format(java.util.Date(ms))

  private fun smallIcon(): Int {
    // expo-notifications' generated small icon when present, otherwise the app icon.
    val id = resources.getIdentifier("notification_icon", "drawable", packageName)
    return if (id != 0) id else applicationInfo.icon
  }

  private fun broadcastChanged() {
    sendBroadcast(Intent(ACTION_CHANGED).setPackage(packageName))
  }

  companion object {
    const val ACTION_RING = "app.ibtida.alarm.RING"
    const val ACTION_SILENCE = "app.ibtida.alarm.SILENCE"
    const val ACTION_STOP = "app.ibtida.alarm.STOP"
    const val ACTION_CHANGED = "app.ibtida.alarm.CHANGED"
    const val EXTRA_UNTIL = "until"
    const val SOUND_SYSTEM = "alarm"
    const val SOUND_SILENT = "silent"
    private const val TAG = "FajrAlarm"
    private const val NOTIF_ID = 0x5A10
    private const val NOTIF_MISSED = 0x5A11
    private const val CH_RINGING = "fajr-alarm-v1"
    private const val CH_WAITING = "fajr-alarm-status-v1"
    private val TOKEN_CAP = Any()

    val ALARM_AUDIO: AudioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    /** The sound for a key: the system alarm tone, a bundled raw sound by name, or null for silent. */
    fun soundUri(ctx: Context, sound: String): Uri? {
      if (sound == SOUND_SILENT) return null
      if (sound != SOUND_SYSTEM) {
        val id = ctx.resources.getIdentifier(sound, "raw", ctx.packageName)
        if (id != 0) return Uri.parse("android.resource://${ctx.packageName}/$id")
      }
      return RingtoneManager.getActualDefaultRingtoneUri(ctx, RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
    }

    fun hasRaw(ctx: Context, name: String) = ctx.resources.getIdentifier(name, "raw", ctx.packageName) != 0

    fun ensureChannels(ctx: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
      nm.createNotificationChannel(NotificationChannel(CH_RINGING, "Fajr wake alarm", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "The Fajr alarm while it is ringing. Its sound plays separately on the alarm volume."
        setSound(null, null)
        enableVibration(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        setBypassDnd(true)
      })
      nm.createNotificationChannel(NotificationChannel(CH_WAITING, "Fajr wake status", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "Between the wudu and prayer-mat scans, and when an alarm stops unverified."
        setSound(null, null)
      })
    }
  }
}
