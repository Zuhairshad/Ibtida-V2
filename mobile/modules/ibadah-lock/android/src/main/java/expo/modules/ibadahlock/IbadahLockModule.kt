package expo.modules.ibadahlock

import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

class IbadahLockModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("IbadahLock")

    Events(BLOCKED_EVENT)

    OnCreate {
      current = WeakReference(this@IbadahLockModule)
    }

    OnDestroy {
      if (current?.get() === this@IbadahLockModule) current = null
    }

    Function("isSupported") { true }

    Function("isPermissionGranted") { isLockServiceEnabled(context) }

    AsyncFunction("openPermissionSettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /** The persisted session, or null when no lock is running (or it has expired). */
    Function("getSession") {
      val ctx = context
      val session = LockSession.read(ctx)
      val result: Map<String, Any?>? = when {
        !session.active -> null
        session.isExpired(System.currentTimeMillis()) -> {
          LockSession.clear(ctx)
          IbadahLockAccessibilityService.refresh()
          null
        }
        else -> session.toMap()
      }
      result
    }

    AsyncFunction("start") { packages: List<String>, endsAt: Double?, returnUrl: String? ->
      val ctx = context
      val allowed = packages
        .map { it.trim() }
        .filter { it.isNotEmpty() && !Exempt.isExempt(ctx, it) }
        .toSet()
      LockSession.start(ctx, allowed, endsAt?.toLong(), returnUrl, System.currentTimeMillis())
      IbadahLockAccessibilityService.refresh()
      mapOf(
        "packages" to allowed.toList(),
        "shielding" to (allowed.isNotEmpty() && isLockServiceEnabled(ctx))
      )
    }

    AsyncFunction("stop") {
      val ctx = context
      LockSession.clear(ctx)
      IbadahLockAccessibilityService.refresh()
    }
  }

  companion object {
    private const val BLOCKED_EVENT = "onBlockedAttempt"

    @Volatile
    private var current: WeakReference<IbadahLockModule>? = null

    /** Forwards a blocked attempt to JS when the React runtime is alive; otherwise it's only counted. */
    fun notifyBlocked(packageName: String, count: Int, at: Long) {
      val module = current?.get() ?: return
      try {
        module.sendEvent(
          BLOCKED_EVENT,
          mapOf("packageName" to packageName, "count" to count, "at" to at.toDouble())
        )
      } catch (e: Exception) {
        // The runtime is being torn down; the attempt is still counted in SharedPreferences.
      }
    }
  }
}
