package expo.modules.ibadahlock

import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.provider.Settings
import android.provider.Telephony
import android.telecom.TelecomManager

/**
 * The lock session, persisted in SharedPreferences so the AccessibilityService keeps enforcing it
 * after the app process (and the JS runtime) has been killed.
 */
data class LockSession(
  val active: Boolean,
  val packages: Set<String>,
  /** Epoch ms when the lock ends on its own, or null for "until goal completed". */
  val endsAt: Long?,
  val startedAt: Long,
  val blocked: Int,
  val returnUrl: String
) {
  /**
   * A session also expires after [MAX_SESSION_MS] even without an end time, so a lock whose JS
   * side never called stop() (crash, force-stop, uninstall of a build) can't block apps forever.
   */
  fun isExpired(now: Long): Boolean =
    (endsAt != null && now >= endsAt) || now - startedAt >= MAX_SESSION_MS

  fun toMap(): Map<String, Any?> = mapOf(
    "packages" to packages.toList(),
    "endsAt" to endsAt?.toDouble(),
    "startedAt" to startedAt.toDouble(),
    "blocked" to blocked
  )

  companion object {
    const val DEFAULT_RETURN_URL = "ibtida://focus-active"
    const val MAX_SESSION_MS = 6L * 60 * 60 * 1000

    private const val PREFS = "ibadah_lock_session"
    private const val K_ACTIVE = "active"
    private const val K_PACKAGES = "packages"
    private const val K_ENDS_AT = "endsAt"
    private const val K_STARTED_AT = "startedAt"
    private const val K_BLOCKED = "blocked"
    private const val K_RETURN_URL = "returnUrl"

    private fun prefs(ctx: Context): SharedPreferences =
      ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun read(ctx: Context): LockSession {
      val p = prefs(ctx)
      val endsAt = p.getLong(K_ENDS_AT, -1L)
      return LockSession(
        active = p.getBoolean(K_ACTIVE, false),
        // Copy: the set returned by getStringSet must not be modified or retained.
        packages = HashSet(p.getStringSet(K_PACKAGES, emptySet()) ?: emptySet()),
        endsAt = if (endsAt > 0) endsAt else null,
        startedAt = p.getLong(K_STARTED_AT, 0L),
        blocked = p.getInt(K_BLOCKED, 0),
        returnUrl = p.getString(K_RETURN_URL, null) ?: DEFAULT_RETURN_URL
      )
    }

    fun start(ctx: Context, packages: Set<String>, endsAt: Long?, returnUrl: String?, now: Long) {
      // commit() rather than apply(): the service may read this from another thread right away,
      // and the session has to be on disk before the process can be killed.
      prefs(ctx).edit()
        .putBoolean(K_ACTIVE, true)
        .putStringSet(K_PACKAGES, HashSet(packages))
        .putLong(K_ENDS_AT, endsAt ?: -1L)
        .putLong(K_STARTED_AT, now)
        .putInt(K_BLOCKED, 0)
        .putString(K_RETURN_URL, returnUrl ?: DEFAULT_RETURN_URL)
        .commit()
    }

    fun clear(ctx: Context) {
      prefs(ctx).edit().clear().commit()
    }

    @Synchronized
    fun incrementBlocked(ctx: Context): Int {
      val p = prefs(ctx)
      val n = p.getInt(K_BLOCKED, 0) + 1
      p.edit().putInt(K_BLOCKED, n).apply()
      return n
    }
  }
}

/** Apps that are never blocked, whatever JS asks for. */
object Exempt {
  private val ALWAYS = setOf(
    "android",
    "com.android.systemui",
    "com.android.settings",
    // Phone / in-call UI
    "com.android.phone",
    "com.android.server.telecom",
    "com.android.dialer",
    "com.android.incallui",
    "com.google.android.dialer",
    "com.samsung.android.dialer",
    "com.samsung.android.incallui",
    // Emergency information, SOS and alerts
    "com.android.emergency",
    "com.google.android.apps.safetyhub",
    "com.sec.android.app.safetyassurance",
    "com.android.cellbroadcastreceiver",
    "com.google.android.cellbroadcastreceiver",
    // SMS / messaging
    "com.android.mms",
    "com.android.messaging",
    "com.google.android.apps.messaging",
    "com.samsung.android.messaging"
  )

  fun isExempt(ctx: Context, pkg: String): Boolean =
    pkg == ctx.packageName || pkg in ALWAYS || pkg == defaultDialer(ctx) || pkg == defaultSms(ctx)

  private fun defaultDialer(ctx: Context): String? = try {
    (ctx.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager)?.defaultDialerPackage
  } catch (e: Exception) {
    null
  }

  private fun defaultSms(ctx: Context): String? = try {
    Telephony.Sms.getDefaultSmsPackage(ctx)
  } catch (e: Exception) {
    null
  }
}

/** Whether the user has switched on Ibtida's AccessibilityService in system settings. */
fun isLockServiceEnabled(ctx: Context): Boolean {
  val expected = ComponentName(ctx, IbadahLockAccessibilityService::class.java)
  val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
    ?: return false
  return enabled.split(':').any { ComponentName.unflattenFromString(it) == expected }
}
