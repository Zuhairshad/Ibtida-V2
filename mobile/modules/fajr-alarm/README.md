# fajr-alarm (local Expo module, Android)

A real alarm clock for the Fajr wake alarm. Autolinked from `mobile/modules/`; needs a development
or EAS build (in Expo Go and on iOS/web `isSupported()` is false and the app falls back to a
time-sensitive notification — never both, so the wake never sounds twice).

| Piece | What it does |
| --- | --- |
| `AlarmStore` | Alarms in device-protected storage (survive reboot, readable before first unlock). Armed with `AlarmManager.setAlarmClock` (exact, fires in Doze, shown as the system's next alarm); without the exact-alarm permission it falls back to `setAndAllowWhileIdle` and the setup screen says so. |
| `AlarmReceiver` (not exported) | Fires an alarm (ignored if removed meanwhile or > 30 min late) and re-rings after the prayer-mat window. |
| `AlarmBootReceiver` | Re-arms after boot / locked boot / app update / time or zone change / exact-alarm permission change; an alarm that was ringing resumes through an exact alarm (Android 15 forbids media FGS from boot). |
| `AlarmService` | Foreground service (`mediaPlayback`) looping the sound on the **alarm stream** (`USAGE_ALARM`: follows alarm volume, sounds through DND like any alarm clock), rising 30 % → 100 %, vibrating, with a full-screen-intent notification. Gives up after 30 min and posts "stopped unverified". |
| `AlarmActivity` | Lock-screen alarm (`showWhenLocked`, `turnScreenOn`). With verification on there is no stop, snooze or back: "Scan wudu station" unlocks and opens `ibtida://wake-scan?alarm=1`. |

JS (`index.ts`): `schedule(alarms)`, `getStatus()` (notifications, exact alarms, full-screen intent,
battery optimisation, alarm volume, next alarm), `openSettings(kind)`, `getRinging()`,
`silence(until)` (wudu scanned → quiet until the mat deadline, then rings again), `stop()` (verified),
`preview(sound)`, `availableSounds(names)`.

Sounds: `alarm` (system alarm tone), `silent` (vibrate), or any bundled raw sound — files in
`assets/sounds` are bundled by `app.config.js` (e.g. `ibtida_chime`, and adhan recordings once added).

Permissions (merged from this module's manifest): `USE_EXACT_ALARM` (13+), `SCHEDULE_EXACT_ALARM`
(≤ 12), `USE_FULL_SCREEN_INTENT`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `FOREGROUND_SERVICE(_MEDIA_PLAYBACK)`,
`POST_NOTIFICATIONS`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`. For Google Play, `USE_EXACT_ALARM` and
`USE_FULL_SCREEN_INTENT` are allowed for apps whose core function includes an alarm clock; declare
it in the Play Console.

Known limits: some OEM battery managers (Xiaomi, Oppo, Vivo, Huawei, some Samsung) can still kill
apps; the setup screen asks for battery "Unrestricted" and explains Autostart. Force-stopping the
app cancels its alarms until it is opened again (Android rule).
