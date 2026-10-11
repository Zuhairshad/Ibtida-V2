package expo.modules.fajralarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Fires a scheduled alarm, re-rings after the prayer-mat window runs out, and re-arms every alarm
 * after a reboot, an app update, a clock/time-zone change or a change to the exact-alarm permission.
 */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    when (intent.action) {
      AlarmStore.ACTION_FIRE -> {
        val id = intent.getStringExtra(AlarmStore.EXTRA_ID) ?: return
        // An alarm removed in the app after it was armed is simply ignored.
        val alarm = AlarmStore.find(ctx, id) ?: return
        // Delivered far too late (inexact fallback, or the phone was off): don't ring hours after Fajr.
        if (System.currentTimeMillis() - alarm.at > AlarmStore.MAX_RING_MS) { AlarmStore.arm(ctx); return }
        AlarmStore.setRinging(ctx, Ringing(alarm, System.currentTimeMillis(), 0L))
        startRing(ctx)
        AlarmStore.arm(ctx)
      }
      AlarmStore.ACTION_RESUME -> {
        val r = AlarmStore.ringing(ctx) ?: return
        AlarmStore.setRinging(ctx, r.copy(silencedUntil = 0L))
        startRing(ctx)
      }
      else -> AlarmBootReceiver.rearm(ctx)
    }
  }

  private fun startRing(ctx: Context) {
    // Allowed from the background: an exact alarm (or boot) broadcast may start a foreground service.
    val i = Intent(ctx, AlarmService::class.java).setAction(AlarmService.ACTION_RING)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i) else ctx.startService(i)
  }
}
