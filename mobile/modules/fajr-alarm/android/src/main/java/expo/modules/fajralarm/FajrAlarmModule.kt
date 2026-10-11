package expo.modules.fajralarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class FajrAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var preview: MediaPlayer? = null
  private val main = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("FajrAlarm")

    Function("isSupported") { true }

    /** Everything the setup screen needs to show whether the alarm will really ring. */
    Function("getStatus") {
      val ctx = context
      val nm = ctx.getSystemService(NotificationManager::class.java)
      val audio = ctx.getSystemService(AudioManager::class.java)
      val power = ctx.getSystemService(PowerManager::class.java)
      val next = AlarmStore.alarms(ctx).filter { it.at > System.currentTimeMillis() }.minByOrNull { it.at }
      mapOf(
        "notifications" to (nm?.areNotificationsEnabled() == true),
        "exactAlarms" to AlarmStore.canExact(ctx),
        "fullScreen" to (if (Build.VERSION.SDK_INT >= 34) nm?.canUseFullScreenIntent() == true else true),
        "batteryUnrestricted" to (power?.isIgnoringBatteryOptimizations(ctx.packageName) == true),
        "alarmVolume" to (audio?.let { it.getStreamVolume(AudioManager.STREAM_ALARM).toDouble() / it.getStreamMaxVolume(AudioManager.STREAM_ALARM).coerceAtLeast(1) } ?: 0.0),
        "nextAt" to next?.at?.toDouble(),
        "scheduled" to AlarmStore.alarms(ctx).count { it.at > System.currentTimeMillis() }
      )
    }

    /** Opens the system screen for one requirement: exactAlarm, fullScreen, battery, notifications or app. */
    AsyncFunction("openSettings") { kind: String ->
      val ctx = context
      val pkg = Uri.parse("package:${ctx.packageName}")
      val intent = when (kind) {
        "exactAlarm" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg) else null
        "fullScreen" -> if (Build.VERSION.SDK_INT >= 34) Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg) else null
        "battery" -> Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg)
        "notifications" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
        } else null
        else -> null
      } ?: Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        ctx.startActivity(intent)
      } catch (e: Exception) {
        ctx.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }

    /** Replaces all scheduled alarms (JSON array of { id, at, title, body, verify, sound, url }). Returns how many were armed. */
    AsyncFunction("schedule") { json: String ->
      val ctx = context
      AlarmService.ensureChannels(ctx)
      val arr = JSONArray(json)
      val list = (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(Alarm::fromJson) }
      AlarmStore.replace(ctx, list)
    }

    Function("getScheduled") {
      AlarmStore.alarms(context).filter { it.at > System.currentTimeMillis() }.map { it.toMap() }
    }

    /** The alarm ringing now (or paused between the two scans), or null. */
    Function("getRinging") {
      val r = AlarmStore.ringing(context)
      val result: Map<String, Any?>? = r?.let {
        mapOf("alarm" to it.alarm.toMap(), "since" to it.since.toDouble(), "silencedUntil" to it.silencedUntil.toDouble())
      }
      result
    }

    /** Wudu scanned: pause the sound until [until], ringing again then unless stop() comes first. */
    AsyncFunction("silence") { until: Double ->
      val ctx = context
      if (AlarmStore.ringing(ctx) == null) return@AsyncFunction false
      ctx.startService(Intent(ctx, AlarmService::class.java).setAction(AlarmService.ACTION_SILENCE).putExtra(AlarmService.EXTRA_UNTIL, until.toLong()))
      true
    }

    /** The scanner is on screen: keep ringing, without the pop-up banner over it. */
    AsyncFunction("inApp") {
      val ctx = context
      val r = AlarmStore.ringing(ctx) ?: return@AsyncFunction false
      if (r.silencedUntil > System.currentTimeMillis()) return@AsyncFunction false
      ctx.startService(Intent(ctx, AlarmService::class.java).setAction(AlarmService.ACTION_IN_APP))
      true
    }

    /** The wake is verified: stop the alarm for good. */
    AsyncFunction("stop") {
      val ctx = context
      if (AlarmStore.ringing(ctx) == null) return@AsyncFunction false
      ctx.startService(Intent(ctx, AlarmService::class.java).setAction(AlarmService.ACTION_STOP))
      true
    }

    /** Which bundled sounds exist (adhan recordings are only present when added to the app). */
    Function("availableSounds") { names: List<String> ->
      val ctx = context
      names.filter { it == AlarmService.SOUND_SYSTEM || it == AlarmService.SOUND_SILENT || AlarmService.hasRaw(ctx, it) }
    }

    /** Plays a few seconds of a sound on the alarm stream, so the user hears it at their alarm volume. */
    AsyncFunction("preview") { sound: String, seconds: Int ->
      val ctx = context
      stopPreview()
      val uri = AlarmService.soundUri(ctx, sound) ?: return@AsyncFunction false
      preview = MediaPlayer().apply {
        setAudioAttributes(AlarmService.ALARM_AUDIO)
        setDataSource(ctx, uri)
        prepare()
        start()
      }
      main.postDelayed({ stopPreview() }, seconds.coerceIn(1, 15) * 1000L)
      true
    }

    AsyncFunction("stopPreview") { stopPreview() }

    OnDestroy { stopPreview() }
  }

  private fun stopPreview() {
    main.removeCallbacksAndMessages(null)
    try { preview?.stop() } catch (e: Exception) { }
    preview?.release()
    preview = null
  }
}
