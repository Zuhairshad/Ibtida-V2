/**
 * English / Urdu text for the greeting and the main screens (Home, Prayer, Masjid & timings).
 * Screens not listed here stay in English. The user's name is shown exactly as saved in both.
 */
import type { PrayerName } from '../data/content';
import { PRAYER_UR } from '../data/reminders';
import { useApp, type Lang } from '../state/store';

const STR = {
  greet: { en: 'Salam,', ur: 'السلام علیکم،' },
  friend: { en: 'friend', ur: 'دوست' },
  basedOnLocation: { en: 'BASED ON YOUR LOCATION', ur: 'آپ کے مقام کے مطابق' },
  timeline: { en: 'Prayer timeline', ur: 'نماز کا شیڈول' },
  nextPrayer: { en: 'NEXT PRAYER', ur: 'اگلی نماز' },
  beginsIn: { en: '{p} begins in', ur: '{p} شروع ہونے میں' },
  prayerTimes: { en: 'Prayer times', ur: 'نماز کے اوقات' },
  titleA: { en: 'Prayer', ur: 'نماز کے' },
  titleB: { en: 'Times', ur: 'اوقات' },
  untilAdhan: { en: 'until adhan', ur: 'اذان تک' },
  begins: { en: 'Begins', ur: 'وقت شروع' },
  jamaat: { en: 'Jamaat', ur: 'جماعت' },
  jumuah: { en: 'Jumu‘ah', ur: 'جمعہ' },
  notSet: { en: 'Not set', ur: 'مقرر نہیں' },
  sunrise: { en: 'Sunrise', ur: 'طلوعِ آفتاب' },
  notPrayer: { en: 'Not a prayer time', ur: 'نماز کا وقت نہیں' },
  prayed: { en: 'Prayed · logged', ur: 'ادا ہو گئی' },
  missed: { en: 'Missed · tap to make up', ur: 'قضا · ادا کرنے کے لیے ٹیپ کریں' },
  missedShort: { en: 'Missed · make up', ur: 'قضا' },
  next: { en: 'Next', ur: 'اگلی' },
  adhanOn: { en: 'Adhan on', ur: 'اذان آن' },
  adhanOff: { en: 'Adhan off', ur: 'اذان بند' },
  masjidTimes: { en: 'Masjid & jamaat times', ur: 'مسجد اور جماعت کے اوقات' },
  addMasjid: { en: 'Add your masjid’s jamaat times', ur: 'اپنی مسجد کی جماعت کے اوقات شامل کریں' },
} satisfies Record<string, Record<Lang, string>>;

export type StrKey = keyof typeof STR;

/** Unicode first-strong isolate: keeps a name in its own direction inside either language's line. */
export const iso = (s: string) => `⁨${s}⁩`;

export function tr(lang: Lang, k: StrKey, vars: Record<string, string> = {}) {
  return STR[k][lang].replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? '');
}

/** Prayer name in the app language ("Asr" / "عصر"). */
export const prayerName = (lang: Lang, p: PrayerName | 'Sunrise') => (lang === 'ur' ? PRAYER_UR[p] : p);

/** Current app language and a translator bound to it; re-renders when the language changes. */
export function useLang() {
  const lang = useApp(s => s.lang) ?? 'en';
  return { lang, ur: lang === 'ur', t: (k: StrKey, vars?: Record<string, string>) => tr(lang, k, vars) };
}

/** The user's first name from their profile, live (updates after sign-in pulls the profile). */
export function useFirstName() {
  const name = useApp(s => s.name);
  const lang = useApp(s => s.lang) ?? 'en';
  return name.trim().split(/\s+/)[0] || tr(lang, 'friend');
}
