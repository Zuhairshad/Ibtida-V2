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

Not wired yet (UI is complete, needs native work or a backend):
- **Ibadah Lock app shielding** — needs the FamilyControls (iOS) / Accessibility-service
  (Android) native module from the handover; the lock session itself works.
- **Wake alarm ringing** — the scan flow is real, but the alarm that opens it and keeps
  ringing until stage 2 needs `expo-notifications` (see below).
- **Adhan / reminder notifications** — toggles persist; scheduling needs `expo-notifications`.
- **Accounts, community totals, feed, circles sync** — local sample data until Supabase is connected.
- **Quran text** — reader shows a licensed-source placeholder; scripture is never generated.
- Urdu translations were authored in the design phase and need scholarly review.
