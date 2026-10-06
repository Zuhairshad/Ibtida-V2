package expo.modules.ibadahlock

import android.accessibilityservice.AccessibilityService
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import java.lang.ref.WeakReference

/**
 * Enforces an Ibadah Lock session. It only looks at which package a new window belongs to
 * (TYPE_WINDOW_STATE_CHANGED → event.packageName); it never reads window content.
 *
 * Outside a session the service listens to Ibtida's own package only, so it receives nothing from
 * other apps. During a session it listens to exactly the session's packages and, when one of them
 * comes to the foreground, sends the user straight back to Ibtida's lock screen.
 */
class IbadahLockAccessibilityService : AccessibilityService() {
  private var lastCountedPkg: String? = null
  private var lastCountedAt = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = WeakReference(this)
    applySession(LockSession.read(this))
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == packageName) return
    val now = System.currentTimeMillis()

    // 1. A session started from the app: locks the chosen apps.
    val session = LockSession.read(this)
    if (session.active && session.isExpired(now)) {
      LockSession.clear(this)
      applySession(LockSession.read(this))
    } else if (session.active && pkg in session.packages && !Exempt.isExempt(this, pkg)) {
      returnToIbtida(session.returnUrl)
      if (countOnce(pkg, now)) IbadahLockModule.notifyBlocked(pkg, LockSession.incrementBlocked(this), now)
      return
    }

    // 2. A scheduled window: locks every app except the essentials.
    val window = LockSchedule.active(this, now) ?: return
    if (LockSchedule.isAllowed(this, pkg)) return
    returnToIbtida(LockSchedule.returnUrl(this))
    if (countOnce(pkg, now)) IbadahLockModule.notifyBlocked(pkg, LockSchedule.incrementBlocked(this, window.second), now)
  }

  /** One app launch fires several window events; count it as one attempt. */
  private fun countOnce(pkg: String, now: Long): Boolean {
    if (pkg == lastCountedPkg && now - lastCountedAt <= COUNT_DEBOUNCE_MS) return false
    lastCountedPkg = pkg
    lastCountedAt = now
    return true
  }

  override fun onInterrupt() = Unit

  override fun onDestroy() {
    if (instance?.get() === this) instance = null
    super.onDestroy()
  }

  private fun returnToIbtida(url: String) {
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    if (launch?.component == null) {
      performGlobalAction(GLOBAL_ACTION_HOME)
      return
    }
    // MainActivity is singleTask: an existing task is brought to the front and the deep link is
    // delivered through onNewIntent, so expo-router lands on (or stays on) the lock screen.
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      component = launch.component
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    try {
      // Allowed from the background: apps with a bound AccessibilityService are exempt from
      // Android's background-activity-start restrictions.
      startActivity(intent)
    } catch (e: ActivityNotFoundException) {
      Log.w(TAG, "Could not reopen Ibtida, going home instead", e)
      performGlobalAction(GLOBAL_ACTION_HOME)
    } catch (e: SecurityException) {
      Log.w(TAG, "Could not reopen Ibtida, going home instead", e)
      performGlobalAction(GLOBAL_ACTION_HOME)
    }
  }

  /** Narrows the events the system delivers to what the current session needs. */
  private fun applySession(session: LockSession) {
    val info = serviceInfo ?: return
    info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    info.packageNames = when {
      // Scheduled windows lock every app, so the service has to hear about every app opening
      // (still only the package name — window content is never retrieved).
      LockSchedule.hasEnabled(this) -> null
      session.active && session.packages.isNotEmpty() -> session.packages.toTypedArray()
      else -> arrayOf(packageName)
    }
    serviceInfo = info
  }

  companion object {
    private const val TAG = "IbadahLock"
    private const val COUNT_DEBOUNCE_MS = 1500L

    @Volatile
    private var instance: WeakReference<IbadahLockAccessibilityService>? = null

    /** Called after JS starts or stops a session or changes the schedule, if the service is running. */
    fun refresh() {
      val service = instance?.get() ?: return
      // Accessibility callbacks run on the main thread; keep serviceInfo updates there too.
      Handler(Looper.getMainLooper()).post { service.applySession(LockSession.read(service)) }
    }
  }
}
