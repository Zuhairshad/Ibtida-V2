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
- **Wake-scan camera** — needs `expo-camera`; the scan step is simulated.
- **Adhan / reminder notifications** — toggles persist; scheduling needs `expo-notifications`.
- **Accounts, community totals, feed, circles sync** — local sample data until Supabase is connected.
- **Quran text** — reader shows a licensed-source placeholder; scripture is never generated.
- Urdu translations were authored in the design phase and need scholarly review.
