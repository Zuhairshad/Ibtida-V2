# Ibtida — mobile app (v7 design)

Expo SDK 57 / React Native 0.86 implementation of `project/Ibtida v7.dc.html`
(Moonly-style, dark + pure-white light mode, 36 screens and 5 sheets).

## Run

```bash
cd mobile
npm install            # .npmrc sets legacy-peer-deps
npx expo start         # scan with a development build / Expo Go
npm run typecheck
npm test               # jest-expo unit tests (src/lib/__tests__)
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
| `src/lib/quran.ts` | Quran text from AlQuran Cloud — the only module that fetches scripture; validation, timeouts, AsyncStorage cache |
| `src/data/surahs.ts` | Static index of the 114 surahs and 30 juz starts (names, ayah counts, place — no verse text) |
| `src/app/` | expo-router routes. `(tabs)/*` show the floating tab bar; everything else is full-screen |

Counting, reading and lock screens (`session`, `tasbeeh`, `goal-done`, `focus-active`,
`wake-scan`, `reader`, `splash`, `loading`) always render dark, as in the design.

## Real vs. simulated

Real: prayer-time calculation for the chosen city/method/madhab, GPS city detection, live
Qibla compass (device heading), prayer/goal/tasbeeh logging with persistence, haptics,
scannable QR wake tags, clipboard/share, light/dark/auto theming, Quran text with English
and Urdu translations (cached per surah for offline reading), reading progress, history and
`surah:ayah` bookmarks.

Not wired yet (UI is complete, needs native work or a backend):
- **Ibadah Lock app shielding** — needs the FamilyControls (iOS) / Accessibility-service
  (Android) native module from the handover; the lock session itself works.
- **Wake-scan camera** — needs `expo-camera`; the scan step is simulated.
- **Adhan / reminder notifications** — toggles persist; scheduling needs `expo-notifications`.
- **Accounts, community totals, feed, circles sync** — local sample data until Supabase is connected.
- Urdu translations were authored in the design phase and need scholarly review.

## Quran text and attribution

The reader (`/reader?surah=N&ayah=M`) loads text from the free [AlQuran Cloud](https://alquran.cloud)
API (`https://api.alquran.cloud/v1`, no key), whose text comes from [Tanzil](https://tanzil.net):

| Edition | Identifier |
| --- | --- |
| Arabic — Tanzil Uthmani | `quran-uthmani` |
| English — Saheeh International | `en.sahih` |
| Urdu — Fateh Muhammad Jalandhry | `ur.jalandhry` |

The reader footer credits: *Arabic: Tanzil (Uthmani) · English: Saheeh International · Urdu: Jalandhry · via AlQuran Cloud*.
Tanzil's terms require the text to be shown verbatim and unaltered: the app never edits verse
text. The only processing is that the Bismillah Tanzil prefixes to ayah 1 (every surah except
1 and 9) is split off and shown, character for character, as a header above the first ayah.
No verse text or translation is bundled with the app or written by hand; it all comes from the
API. Each surah is cached in AsyncStorage after its first load, so surahs you have opened before
work offline.

