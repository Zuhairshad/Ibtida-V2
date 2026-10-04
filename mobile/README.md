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

## Backend (Supabase)

The app talks to the Supabase project **Ibadat** (`qjpjlmeedrdfcrncqpeo`). `mobile/.env` holds
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (the *publishable* key; never put a
service_role key in the app). See `.env.example`. **With the variables empty the app runs fully
offline**: no accounts, local-only data, sample community content.

| File | What |
| --- | --- |
| `src/lib/supabase.ts` | Client (session in AsyncStorage, PKCE, auto-refresh only in foreground); `null` when env is missing |
| `src/lib/account.ts` | Email+password sign up / sign in, magic link, Google OAuth, `ibtida://auth-callback` handling, sign out |
| `src/lib/sync.ts` | Offline-first sync: store diff → durable outbox (AsyncStorage) → Supabase with backoff; pull + merge on sign-in |
| `src/lib/live.ts` | Live Ummah totals, community goals, feed with Ameen, circles (create / join by code / regenerate / leave / delete / shared goals / members) |
| `supabase/migrations/` | Full schema: `0001`–`0016` from the original app, `0017`–`0022` added for this app |
| `supabase/tests/rls_verify.sql` | RLS + RPC checks with throwaway users; runs in one rolled-back transaction |

**How sync works.** The local store stays the source of truth, so every tap is instant and works
offline. Changes to prayer logs, goals and their progress, the wake log, emergency unlocks and
settings/profile (name, method, madhab, city, privacy flags and the rest of the settings) become
small operations in an outbox that survives restarts, and they upload when signed in and reachable,
with exponential backoff. On sign-in the app pulls the account's rows and merges them by last write
wins: the client sends the time of each change as `updated_at`, and a server trigger (`lww_touch`)
refuses stale writes. Tasbeeh taps only bump a pending counter (no I/O per tap). They upload in
batches through `log_dhikr`, which adds to the anonymous Ummah total and to a joined community
goal. Switching off *Community participation* in Privacy keeps your counts out of the Ummah total.

**Community.** When signed in and online, the Community tab shows live data: the Ummah total and
"this hour", the three community goals (seeded from `COMMUNITY_GOALS`) with join and contribute,
your circles, and the feed. Totals only ever come back as aggregates from `SECURITY DEFINER` RPCs.
No other user's counts are readable, and there are no rankings. Circles use 8-character invite
codes (`join_circle_by_code`, `regenerate_circle_invite`), and only members can see a circle, its
goals and its feed items. A member's name is visible to their circle only when their *Profile
visibility* switch is on. Signed out or offline, the tab shows the bundled sample data.

**Dashboard setup (one-time, by the project owner):**
1. *Authentication → URL Configuration → Redirect URLs*: add `ibtida://auth-callback` (builds) and
   `exp://**` (Expo Go during development). Magic links, email confirmation and Google return here.
2. *Authentication → Providers → Google*: enable it with a Google Cloud OAuth client (Web
   client id + secret; authorised redirect URI `https://qjpjlmeedrdfcrncqpeo.supabase.co/auth/v1/callback`).
   Until then "Continue with Google" shows a calm toast and email sign-in works as normal.
3. *Authentication → Emails / SMTP*: the built-in mailer is rate-limited (a few emails per hour).
   Configure custom SMTP before launch. If "Confirm email" stays on, sign-up asks the user to
   confirm by email before entering.
4. Optional: enable *Leaked password protection* (security advisor warning).

Verify RLS any time by running `supabase/tests/rls_verify.sql` in the SQL editor. The "error" it
raises is the report (every line should read PASS), and the rollback leaves no test data behind.

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

Not wired yet (UI is complete, needs native work):
- **Ibadah Lock app shielding** — needs the FamilyControls (iOS) / Accessibility-service
  (Android) native module from the handover; the lock session itself works.
- **Wake alarm ringing until stage 2** — the alarm notification opens the scan, but it
  does not keep ringing; a persistent alarm needs a native full-screen-intent module.
- **Adhan audio** — no recordings bundled yet; notifications use the default sound.
- **Focus / Community notifications** — toggles persist; Ibadah Lock start/end and circle
  milestones need the lock module and backend push (TODOs in `notifications.ts`).
- **Quran text** — reader shows a licensed-source placeholder; scripture is never generated.
- Urdu translations were authored in the design phase and need scholarly review.
