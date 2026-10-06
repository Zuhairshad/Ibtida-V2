/**
 * Static content. Religious text is limited to short, well-sourced dhikr and hadith; the full
 * adhkar collection lives in `src/data/adhkar.ts`. Quran verse text is never
 * written here — it is loaded from AlQuran Cloud (Tanzil) by `src/lib/quran.ts`, and the
 * surah index lives in `src/data/surahs.ts` (content governance §35).
 */
import type { IconName } from '../components/Icon';

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
export const PH: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export const PRAYER_META: Record<PrayerName | 'Sunrise', { ic: IconName; rak?: string[] }> = {
  Fajr: { ic: 'sunrise', rak: ['2 Sunnah', '2 Fard'] },
  Sunrise: { ic: 'sun' },
  Dhuhr: { ic: 'sun', rak: ['4 Sunnah', '4 Fard', '2 Sunnah', '2 Nafl'] },
  Asr: { ic: 'dusk', rak: ['4 Sunnah', '4 Fard'] },
  Maghrib: { ic: 'sunset', rak: ['3 Fard', '2 Sunnah', '2 Nafl'] },
  Isha: { ic: 'moon', rak: ['4 Sunnah', '4 Fard', '2 Sunnah', '2 Nafl', '3 Witr'] },
};

/** A place prayer times are calculated for. `cc` is the ISO country code (used to suggest a method). */
export type City = { name: string; lat: number; lng: number; cc?: string };
export const CITIES: City[] = [
  { name: 'Lahore, Pakistan', lat: 31.5204, lng: 74.3587, cc: 'PK' },
  { name: 'Lagos, Nigeria', lat: 6.5244, lng: 3.3792, cc: 'NG' },
  { name: 'Leicester, UK', lat: 52.6369, lng: -1.1398, cc: 'GB' },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278, cc: 'GB' },
  { name: 'Los Angeles, USA', lat: 34.0522, lng: -118.2437, cc: 'US' },
  { name: 'Karachi, Pakistan', lat: 24.8607, lng: 67.0011, cc: 'PK' },
  { name: 'Kuala Lumpur, Malaysia', lat: 3.139, lng: 101.6869, cc: 'MY' },
  { name: 'Istanbul, Türkiye', lat: 41.0082, lng: 28.9784, cc: 'TR' },
  { name: 'Jakarta, Indonesia', lat: -6.2088, lng: 106.8456, cc: 'ID' },
  { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357, cc: 'EG' },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708, cc: 'AE' },
  { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832, cc: 'CA' },
  { name: 'Manchester, UK', lat: 53.4808, lng: -2.2426, cc: 'GB' },
  { name: 'Chicago, USA', lat: 41.8781, lng: -87.6298, cc: 'US' },
];

export const METHODS = [
  { k: 'Karachi', name: 'University of Islamic Sciences, Karachi', sub: 'Pakistan, India, Bangladesh' },
  { k: 'MWL', name: 'Muslim World League', sub: 'Europe, Far East' },
  { k: 'ISNA', name: 'ISNA', sub: 'North America' },
  { k: 'Umm Al-Qura', name: 'Umm Al-Qura, Makkah', sub: 'Arabian Peninsula' },
  { k: 'Egypt', name: 'Egyptian General Authority', sub: 'Africa, Syria, Lebanon' },
] as const;

export const DHIKR = [
  { label: 'SubhanAllah', ar: 'سُبْحَانَ اللهِ', t: 33, note: 'After-salah tasbih, 33 times · Sahih Muslim 596' },
  { label: 'Alhamdulillah', ar: 'اَلْحَمْدُ لِلَّهِ', t: 33, note: 'After-salah tahmid, 33 times · Sahih Muslim 596' },
  { label: 'Allahu Akbar', ar: 'اَللهُ أَكْبَرُ', t: 34, note: 'After-salah takbir, 34 times · Sahih Muslim 596' },
  { label: 'Astaghfirullah', ar: 'أَسْتَغْفِرُ اللهَ', t: 100, note: 'Seeking forgiveness a hundred times a day · Sahih Muslim 2702' },
  { label: 'Durood', ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', t: 100, note: 'Whoever sends one blessing upon me, Allah sends ten upon him · Sahih Muslim 408' },
];

export const HADITH = [
  { ar: 'أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ', en: 'The most beloved deeds to Allah are those done consistently, even if small.', src: 'Sahih al-Bukhari 6464', ur: 'اللہ کو سب سے زیادہ محبوب وہ عمل ہے جو ہمیشہ کیا جائے، اگرچہ تھوڑا ہو۔' },
  { ar: 'مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ', en: 'Whoever guides someone to goodness will have a reward like the one who does it.', src: 'Sahih Muslim 1893', ur: 'جس نے کسی بھلائی کی طرف رہنمائی کی، اسے اس پر عمل کرنے والے جیسا اجر ملے گا۔' },
  { ar: 'كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ ثَقِيلَتَانِ فِي الْمِيزَانِ', en: 'Two words light on the tongue, heavy on the scale: SubhanAllahi wa bihamdihi, SubhanAllahil-Azim.', src: 'Sahih al-Bukhari 6406', ur: 'دو کلمے زبان پر ہلکے، میزان میں بھاری اور رحمٰن کو محبوب ہیں: سبحان اللہ وبحمدہ، سبحان اللہ العظیم۔' },
];

const AR_NUM = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export const arNum = (n: number) => String(n).split('').map(d => AR_NUM[+d]).join('');

export const APPS = ['Instagram', 'TikTok', 'YouTube', 'X', 'Snapchat', 'Facebook'];
/** Android package ids for `APPS`, index-aligned. Used by the Ibadah Lock Accessibility service. */
export const APP_PACKAGES = [
  'com.instagram.android',
  'com.zhiliaoapp.musically',
  'com.google.android.youtube',
  'com.twitter.android',
  'com.snapchat.android',
  'com.facebook.katana',
];

export const RESULTS = [
  { type: 'Quran', title: 'Surah Nuh · 71:10', sub: 'Open in the reader', tag: 'Quran', keys: 'istighfar forgiveness astaghfirullah استغفار' },
  { type: 'Quran', title: 'Ayat al-Kursi · 2:255', sub: 'Open in the reader', tag: 'Quran', keys: 'kursi protection throne كرسي' },
] as const;

export type FeedTint = 'amb' | 'mint' | 'blue' | 'lav';

/**
 * The global community goals, in the same order and with the same names and targets as the
 * Supabase seed (migration 0019). Progress, participants and end dates only ever come live
 * from the server — nothing here is shown as a count.
 */
export const COMMUNITY_GOALS = [
  { name: '1 Million Salawat', total: 1000000 },
  { name: 'Fajr together · 30 days', total: 300000 },
  { name: '10 Million Istighfar', total: 10000000 },
];

export const GOAL_PRESETS: [string, string][] = [
  ['Durood Sharif', 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ'],
  ['Istighfar', 'أَسْتَغْفِرُ اللهَ'],
  ['SubhanAllahi wa bihamdihi', 'سُبْحَانَ اللهِ وَبِحَمْدِهِ'],
  ['La ilaha illa Allah', 'لَا إِلٰهَ إِلَّا اللهُ'],
];

export const MILESTONES: [string, string, number][] = [
  ['3', '3-Day Spark', 3], ['7', '7-Day Warrior', 7], ['14', '2-Week Steadfast', 14],
  ['30', '30-Day Devoted', 30], ['60', '60-Day Khushoo', 60], ['100', 'Centennial Mujahid', 100],
];


/** Deterministic PRNG from the prototype — keeps stars / heatmaps stable between renders. */
export const rnd = (seed: number) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
export const STARS = (() => {
  const r = rnd(7);
  return Array.from({ length: 18 }, () => ({ x: Math.round(r() * 94 + 3), y: Math.round(r() * 55 + 3), s: r() > 0.7 ? 3 : 2, d: 2 + r() * 3, delay: r() * 3 }));
})();

export const fmt = (n: number) => n.toLocaleString('en-US');
export const mmss = (s: number) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
export const code8 = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 8; i++) c += A[Math.floor(Math.random() * A.length)];
  return c;
};

/** Copy for live counters: real numbers when there are some, a gentle invitation when there are none. */
export const joinedLabel = (n: number) => (n > 0 ? `${fmt(n)} joined` : 'Be the first');
export const participantsLabel = (n: number) => (n > 0 ? `${fmt(n)} participant${n === 1 ? '' : 's'}` : 'No participants yet');
