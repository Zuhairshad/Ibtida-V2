# Ibtida — mobile app (v7 design)

Expo SDK 57 / React Native 0.86 implementation of `project/Ibtida v7.dc.html`
(Moonly-style, dark + pure-white light mode, 36 screens and 5 sheets).

## Run

```bash
cd mobile
npm install            # .npmrc sets legacy-peer-deps
npx expo start         # scan with a development build / Expo Go
npm run typecheck
```

## Get an APK

```bash
npm i -g eas-cli && eas login
eas build -p android --profile preview   # produces an installable .apk
```

## Structure

| Path | What |
| --- | --- |
| `src/theme/tokens.ts` | All colours/gradients — 1:1 with `THEME_D` / `THEME_L` in v7 |
| `src/components/ui.tsx` | Shared kit: `Txt`, `Tap`, `Cta`, `Seg`, `Chips`, `Option`, `Switch`, `Ring`, `Wheel`, `Sheet`, `ToastHost`… |
| `src/components/motion.tsx` | ibIn / ibBreathe / ibTwinkle / ibPulse / ibOrbit equivalents, Reduce-Motion aware |
| `src/state/store.ts` | Single persisted store (AsyncStorage) — offline-first |
| `src/lib/prayer.ts` | Real prayer times (adhan), Qibla, Hijri date |
| `src/app/` | expo-router routes. `(tabs)/*` show the floating tab bar; everything else is full-screen |
| `modules/ibadah-lock/` | Local Expo module: Ibadah Lock app shielding (Android AccessibilityService, iOS stub) and its config plugin. See its README |

Counting, reading and lock screens (`session`, `tasbeeh`, `goal-done`, `focus-active`,
`wake-scan`, `reader`, `splash`, `loading`) always render dark, as in the design.

## Real vs. simulated

Real: prayer-time calculation for the chosen city/method/madhab, GPS city detection, live
Qibla compass (device heading), prayer/goal/tasbeeh logging with persistence, haptics,
scannable QR wake tags, clipboard/share, light/dark/auto theming.

**Wake scan** (`src/app/wake-scan.tsx`) uses `expo-camera`: a live QR scanner with the real
torch. Stage 1 accepts only `ibtida://wake/<token>-W` (wudu station), stage 2 only
`…-M` (prayer mat) within 10 minutes, with a live countdown; expiry resets to stage 1.
Old/foreign tags get a toast and an error haptic, debounced per tag. Each success is
saved to `wakeLog` and shown on Prayer → Wake alarm. The route opens cold from
`ibtida://wake-scan` (closing goes to `/home`). "Simulate scan" exists only in `__DEV__`.
The camera is a native module, so it needs a development build (not Expo Go).

Local notifications (`src/lib/notifications.ts`, `expo-notifications`): adhan at each prayer
with its bell on, the wake alarm for prayers with wake verification on (max-importance
channel, opens `/wake-scan`), morning/evening adhkar after Fajr/Asr, goal reminders at
each goal's saved time and weekdays (opens that goal's tasbeeh), and a Quran nudge 20 min
after Fajr. All are one-shot date triggers for the next 7 days, recomputed when settings
change and on every app foreground, capped at the 60 soonest (iOS allows 64 pending).
Permission is asked when entering the app after onboarding and when a reminder is
switched on. Test on a development build, since the config plugin and permissions only apply there.
Adhan sounds play the system default until audio files are added — see `ADHAN_AUDIO`.
On Android 12+ times are exact only if the user allows "Alarms & reminders"
(`SCHEDULE_EXACT_ALARM`); otherwise Android may deliver them a few minutes late.

**Ibadah Lock app shielding: real on Android, not on iOS.**
- Android (development or EAS build, not Expo Go): after the user turns on the *Ibtida Ibadah Lock*
  Accessibility service (the setup screen walks them through it), opening a locked app during a
  session sends them straight back to the lock screen. Each attempt is counted and shown, and the
  count is saved with any emergency unlock. The session survives the app being killed. Dialer,
  emergency and SMS apps are never blocked.
- iOS: needs Apple's FamilyControls entitlement, which Apple must approve. The native side is a
  stub, and the lock runs inside Ibtida only. `modules/ibadah-lock/README.md` lists the exact steps.

Not wired yet (UI is complete, needs native work or a backend):
- **Ibadah Lock on iOS** — waiting on the FamilyControls entitlement (see above).
- **Wake alarm ringing until stage 2** — the alarm notification opens the scan, but it
  does not keep ringing; a persistent alarm needs a native full-screen-intent module.
- **Adhan audio** — no recordings bundled yet; notifications use the default sound.
- **Focus / Community notifications** — toggles persist; Ibadah Lock start/end and circle
  milestones need backend push (TODOs in `notifications.ts`).
- **Accounts, community totals, feed, circles sync** — local sample data until Supabase is connected.
- **Quran text** — reader shows a licensed-source placeholder; scripture is never generated.
- Urdu translations were authored in the design phase and need scholarly review.
