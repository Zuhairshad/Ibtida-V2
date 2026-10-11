package expo.modules.fajralarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Alarms don't survive a reboot, an app update, a clock or time-zone change, or the exact-alarm
 * permission being toggled. Re-arms them, and carries on an alarm that was ringing at the time.
 */
class AlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_LOCKED_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED,
      "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" -> rearm(ctx)
    }
  }

  companion object {
    fun rearm(ctx: Context) {
      AlarmStore.arm(ctx)
      val r = AlarmStore.ringing(ctx) ?: return
      val now = System.currentTimeMillis()
      when {
        now - r.since > AlarmStore.MAX_RING_MS -> AlarmStore.setRinging(ctx, null)
        r.silencedUntil > now -> AlarmStore.armResume(ctx, r.silencedUntil)
        // Android 15 doesn't let a boot broadcast start a media foreground service, but an exact
        // alarm may: re-ring through one a moment from now.
        else -> AlarmStore.armResume(ctx, now + 2000)
      }
    }
  }
}
