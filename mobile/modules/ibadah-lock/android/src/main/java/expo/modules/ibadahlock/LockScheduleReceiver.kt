package expo.modules.ibadahlock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * A scheduled window has just opened: lock the app that is already on screen (the service otherwise
 * only reacts when an app is opened). Also re-arms the next window start after a reboot, an app
 * update, a clock or time-zone change, or a change to the exact-alarm permission.
 */
class LockScheduleReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action == ACTION_WINDOW_START) IbadahLockAccessibilityService.enforceNow()
    LockSchedule.armNext(ctx)
  }

  companion object {
    const val ACTION_WINDOW_START = "app.ibtida.lock.WINDOW_START"
  }
}
