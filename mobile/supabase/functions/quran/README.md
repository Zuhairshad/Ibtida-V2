# `quran` — Quran Foundation content proxy

The Quran Foundation (Quran.com) API needs an OAuth client **secret**, which must never ship inside
the mobile app. This Supabase Edge Function holds it and returns one compact JSON per surah:
Uthmani Arabic + English + Urdu, the Bismillah (verbatim from verse 1:1), juz/page numbers.

- `core.ts` — all logic (token caching, pagination, validation, CORS). Runtime-agnostic and
  unit-tested in `src/lib/__tests__/quranProxy.test.ts`.
- `index.ts` — the Deno entry point Supabase deploys.

## Endpoints

`GET /functions/v1/quran?surah=112` → surah JSON (cached by clients/CDN for a day)
`GET /functions/v1/quran?health=1` → `{ ok, env, chapters }`
Errors: `404 not_found`, `400 bad_request`, `502 upstream`, `503 not_configured`.

## Secrets

| Name | Value |
| --- | --- |
| `QF_CLIENT_ID`, `QF_CLIENT_SECRET` | From the Quran Foundation developer portal |
| `QF_ENV` | `production` (default) or `prelive` (pre-production keys; only Al-Fatihah and Al-Baqarah) |
| `QF_TRANSLATION_EN` | Optional, default `20` (Saheeh International) |
| `QF_TRANSLATION_UR` | Optional, default `234` (Fateh Muhammad Jalandhry) |

## Deploy

```bash
cd mobile
npx supabase login
npx supabase link --project-ref <your project ref>
node supabase/functions/quran/set-secrets.mjs prelive      # or: production
npx supabase functions deploy quran
curl "https://<ref>.supabase.co/functions/v1/quran?health=1" -H "apikey: <publishable key>" -H "Authorization: Bearer <publishable key>"
```

Then turn the source on in the app with `EXPO_PUBLIC_QURAN_SOURCE=quran.foundation` in
`mobile/.env` and restart Expo. Any failure (including a surah missing from prelive) falls back
to AlQuran Cloud, and the reader's credit line always names the source actually used.
