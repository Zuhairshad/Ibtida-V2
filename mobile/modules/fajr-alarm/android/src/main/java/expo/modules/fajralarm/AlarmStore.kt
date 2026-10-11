package expo.modules.fajralarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/** One scheduled alarm. Times are absolute epoch ms computed in JS from the prayer times. */
data class Alarm(
  val id: String,
  val at: Long,
  val title: String,
  val body: String,
  /** When true the alarm only stops after the in-app wake verification. */
  val verify: Boolean,
  /** "alarm" (system alarm tone), "chime", or the name of a bundled raw sound. */
  val sound: String,
  /** Deep link opened from the alarm screen, e.g. ibtida://wake-scan?alarm=1. */
  val url: String
) {
  fun toJson(): JSONObject = JSONObject().apply {
    put("id", id); put("at", at); put("title", title); put("body", body)
    put("verify", verify); put("sound", sound); put("url", url)
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "id" to id, "at" to at.toDouble(), "title" to title, "body" to body, "verify" to verify, "sound" to sound, "url" to url
  )

  companion object {
    fun fromJson(o: JSONObject): Alarm? {
      val id = o.optString("id", "")
      val at = o.optLong("at", 0L)
      if (id.isEmpty() || at <= 0L) return null
      return Alarm(
        id = id,
        at = at,
        title = o.optString("title", "Wake for Fajr"),
        body = o.optString("body", ""),
        verify = o.optBoolean("verify", true),
        sound = o.optString("sound", "alarm"),
        url = o.optString("url", AlarmStore.DEFAULT_URL)
      )
    }
  }
}

/** The alarm that is ringing (or silenced between the two verification scans). */
data class Ringing(
  val alarm: Alarm,
  val since: Long,
  /** While > now the sound is paused (wudu scanned, waiting for the prayer mat). */
  val silencedUntil: Long
)

/**
 * Persists alarms in device-protected storage, so they can be rescheduled and ring after a reboot
 * even before the phone is first unlocked, and arms them with AlarmManager.setAlarmClock (exact,
 * allowed in Doze, shown as the system's next alarm).
 */
object AlarmStore {
  const val DEFAULT_URL = "ibtida://wake-scan?alarm=1"
  const val ACTION_FIRE = "app.ibtida.alarm.FIRE"
  const val ACTION_RESUME = "app.ibtida.alarm.RESUME"
  const val EXTRA_ID = "id"
  /** A ringing alarm gives up after this long, so a phone left alone doesn't ring until the battery dies. */
  const val MAX_RING_MS = 30L * 60 * 1000
  /** Alarms are armed this far ahead at most; JS re-sends the plan every time the app opens. */
  private const val MAX_ARMED = 16
  private const val TAG = "FajrAlarm"
  private const val PREFS = "fajr_alarm"
  private const val K_ALARMS = "alarms"
  private const val K_RINGING = "ringing"
  private const val K_ARMED = "armed"
  private const val RESUME_CODE = 0x5A1A

  private fun prefs(ctx: Context): SharedPreferences =
    ctx.createDeviceProtectedStorageContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun alarms(ctx: Context): List<Alarm> = try {
    val arr = JSONArray(prefs(ctx).getString(K_ALARMS, "[]"))
    (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(Alarm::fromJson) }
  } catch (e: Exception) {
    emptyList()
  }

  fun find(ctx: Context, id: String): Alarm? = alarms(ctx).firstOrNull { it.id == id }

  /** Replaces every scheduled alarm with [list] and re-arms AlarmManager. Returns how many are armed. */
  @Synchronized
  fun replace(ctx: Context, list: List<Alarm>): Int {
    val arr = JSONArray()
    list.distinctBy { it.id }.sortedBy { it.at }.forEach { arr.put(it.toJson()) }
    prefs(ctx).edit().putString(K_ALARMS, arr.toString()).commit()
    return arm(ctx)
  }

  /** Cancels what is armed and arms the next upcoming alarms. Safe to call any time (boot, permission change). */
  @Synchronized
  fun arm(ctx: Context, now: Long = System.currentTimeMillis()): Int {
    val am = ctx.getSystemService(AlarmManager::class.java) ?: return 0
    prefs(ctx).getStringSet(K_ARMED, emptySet())?.forEach { id -> am.cancel(firePending(ctx, id)) }
    val next = alarms(ctx).filter { it.at > now }.sortedBy { it.at }.take(MAX_ARMED)
    val armed = HashSet<String>()
    for (a in next) {
      if (setExact(ctx, am, a.at, firePending(ctx, a.id))) armed.add(a.id)
    }
    prefs(ctx).edit().putStringSet(K_ARMED, armed).commit()
    return armed.size
  }

  /** Whether exact alarms are allowed (always before Android 12; USE_EXACT_ALARM grants it on 13+). */
  fun canExact(ctx: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    return ctx.getSystemService(AlarmManager::class.java)?.canScheduleExactAlarms() == true
  }

  private fun setExact(ctx: Context, am: AlarmManager, at: Long, op: PendingIntent): Boolean = try {
    if (canExact(ctx)) {
      // setAlarmClock: exact, fires in Doze, and shows in the status bar like any alarm clock.
      am.setAlarmClock(AlarmManager.AlarmClockInfo(at, showPending(ctx)), op)
    } else {
      // No exact-alarm permission: the closest Android allows. The setup screen says so.
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, op)
    }
    true
  } catch (e: SecurityException) {
    Log.w(TAG, "Could not arm alarm", e)
    false
  }

  private fun firePending(ctx: Context, id: String): PendingIntent {
    val i = Intent(ctx, AlarmReceiver::class.java).setAction(ACTION_FIRE).putExtra(EXTRA_ID, id)
    return PendingIntent.getBroadcast(ctx, id.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** Tapping the alarm icon in the status bar opens the alarm screen. */
  private fun showPending(ctx: Context): PendingIntent {
    val i = Intent(ctx, AlarmActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(ctx, 0x5A1B, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /* -------------------------------------------------------------- Ringing state */

  fun ringing(ctx: Context): Ringing? {
    val raw = prefs(ctx).getString(K_RINGING, null) ?: return null
    return try {
      val o = JSONObject(raw)
      val alarm = Alarm.fromJson(o.getJSONObject("alarm")) ?: return null
      Ringing(alarm, o.optLong("since", 0L), o.optLong("silencedUntil", 0L))
    } catch (e: Exception) {
      null
    }
  }

  fun setRinging(ctx: Context, r: Ringing?) {
    val e = prefs(ctx).edit()
    if (r == null) e.remove(K_RINGING)
    else e.putString(K_RINGING, JSONObject().apply {
      put("alarm", r.alarm.toJson()); put("since", r.since); put("silencedUntil", r.silencedUntil)
    }.toString())
    e.commit()
  }

  /** Re-rings at [at] unless the wake is verified first (the prayer-mat window ran out). */
  fun armResume(ctx: Context, at: Long) {
    val am = ctx.getSystemService(AlarmManager::class.java) ?: return
    setExact(ctx, am, at, resumePending(ctx))
  }

  fun cancelResume(ctx: Context) {
    ctx.getSystemService(AlarmManager::class.java)?.cancel(resumePending(ctx))
  }

  private fun resumePending(ctx: Context): PendingIntent {
    val i = Intent(ctx, AlarmReceiver::class.java).setAction(ACTION_RESUME)
    return PendingIntent.getBroadcast(ctx, RESUME_CODE, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
}
