package expo.modules.ibadahlock

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.provider.Settings
import org.json.JSONArray
import java.util.Calendar

/**
 * Recurring Ibadah Lock windows ("every Mon–Fri, 5:00 am for 45 min"), persisted so the
 * AccessibilityService enforces them while Ibtida is closed. During a window every app is locked
 * except Ibtida, the essentials in [Exempt], the home screen, the keyboard and the clock.
 */
data class LockWindow(
  val id: String,
  /** Minutes after local midnight when the window opens. */
  val start: Int,
  /** Length in minutes. */
  val duration: Int,
  /** Monday = bit 0 … Sunday = bit 6, for the day the window opens. */
  val days: Int,
  val enabled: Boolean
)

object LockSchedule {
  const val DEFAULT_RETURN_URL = "ibtida://lock-scheduled"
  private const val PREFS = "ibadah_lock_schedule"
  private const val K_WINDOWS = "windows"
  private const val K_SKIP_UNTIL = "skipUntil"
  private const val K_RETURN_URL = "returnUrl"
  private const val K_BLOCKED = "blocked"
  private const val K_BLOCKED_FOR = "blockedFor"
  private const val MAX_DURATION = 12 * 60

  /** Never locked during a scheduled window, in addition to [Exempt]. */
  private val SCHEDULE_ALLOWED = setOf(
    "com.google.android.deskclock", "com.android.deskclock", "com.sec.android.app.clockpackage",
    "com.google.android.permissioncontroller", "com.android.permissioncontroller",
    "com.google.android.packageinstaller", "com.android.packageinstaller",
    "com.android.launcher3", "com.google.android.apps.nexuslauncher", "com.sec.android.app.launcher"
  )

  private fun prefs(ctx: Context): SharedPreferences =
    ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun save(ctx: Context, json: String, returnUrl: String?) {
    val windows = parse(json)
    prefs(ctx).edit()
      .putString(K_WINDOWS, serialize(windows))
      .putString(K_RETURN_URL, returnUrl ?: DEFAULT_RETURN_URL)
      .commit()
  }

  fun windows(ctx: Context): List<LockWindow> = parse(prefs(ctx).getString(K_WINDOWS, "[]") ?: "[]")

  fun hasEnabled(ctx: Context) = windows(ctx).any { it.enabled && it.days != 0 && it.duration > 0 }

  fun returnUrl(ctx: Context): String = prefs(ctx).getString(K_RETURN_URL, null) ?: DEFAULT_RETURN_URL

  /** The window running at [now] (not skipped), as (id, startMs, endMs); null when none is. */
  fun active(ctx: Context, now: Long): Triple<String, Long, Long>? {
    val skipUntil = prefs(ctx).getLong(K_SKIP_UNTIL, 0L)
    var best: Triple<String, Long, Long>? = null
    for (w in windows(ctx)) {
      if (!w.enabled || w.duration <= 0) continue
      // A window may have opened yesterday and run past midnight.
      for (back in 0..1) {
        val cal = Calendar.getInstance().apply {
          timeInMillis = now
          add(Calendar.DAY_OF_YEAR, -back)
          set(Calendar.HOUR_OF_DAY, w.start / 60)
          set(Calendar.MINUTE, w.start % 60)
          set(Calendar.SECOND, 0)
          set(Calendar.MILLISECOND, 0)
        }
        val dow = (cal.get(Calendar.DAY_OF_WEEK) + 5) % 7 // Monday = 0
        if (w.days and (1 shl dow) == 0) continue
        val startMs = cal.timeInMillis
        val endMs = startMs + w.duration * 60_000L
        if (now in startMs until endMs && endMs > skipUntil) {
          if (best == null || endMs > best.third) best = Triple(w.id, startMs, endMs)
        }
      }
    }
    return best
  }

  /** Lets apps through until [until] (an emergency unlock of the current window). */
  fun skipUntil(ctx: Context, until: Long) {
    prefs(ctx).edit().putLong(K_SKIP_UNTIL, until).commit()
  }

  /** Blocked launches in the window that started at [windowStart] (resets for each new window). */
  @Synchronized
  fun incrementBlocked(ctx: Context, windowStart: Long): Int {
    val p = prefs(ctx)
    val n = if (p.getLong(K_BLOCKED_FOR, 0L) == windowStart) p.getInt(K_BLOCKED, 0) + 1 else 1
    p.edit().putInt(K_BLOCKED, n).putLong(K_BLOCKED_FOR, windowStart).apply()
    return n
  }

  fun blocked(ctx: Context, windowStart: Long): Int {
    val p = prefs(ctx)
    return if (p.getLong(K_BLOCKED_FOR, 0L) == windowStart) p.getInt(K_BLOCKED, 0) else 0
  }

  /** Whether [pkg] stays usable during a scheduled window. */
  fun isAllowed(ctx: Context, pkg: String): Boolean =
    Exempt.isExempt(ctx, pkg) || pkg in SCHEDULE_ALLOWED || pkg == homePackage(ctx) || pkg == keyboardPackage(ctx)

  private fun homePackage(ctx: Context): String? = try {
    val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    ctx.packageManager.resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName
  } catch (e: Exception) {
    null
  }

  private fun keyboardPackage(ctx: Context): String? = try {
    Settings.Secure.getString(ctx.contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)?.substringBefore('/')
  } catch (e: Exception) {
    null
  }

  private fun parse(json: String): List<LockWindow> = try {
    val arr = JSONArray(json)
    (0 until arr.length()).mapNotNull { i ->
      val o = arr.optJSONObject(i) ?: return@mapNotNull null
      LockWindow(
        id = o.optString("id", i.toString()),
        start = o.optInt("start", 0).coerceIn(0, 24 * 60 - 1),
        duration = o.optInt("duration", 0).coerceIn(0, MAX_DURATION),
        days = o.optInt("days", 0) and 0x7F,
        enabled = o.optBoolean("enabled", true)
      )
    }
  } catch (e: Exception) {
    emptyList()
  }

  private fun serialize(ws: List<LockWindow>): String {
    val arr = JSONArray()
    ws.forEach { w ->
      arr.put(org.json.JSONObject().apply {
        put("id", w.id); put("start", w.start); put("duration", w.duration); put("days", w.days); put("enabled", w.enabled)
      })
    }
    return arr.toString()
  }
}
